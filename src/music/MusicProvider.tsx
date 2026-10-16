import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { uid } from "../lib/random";
import { usePersistentState } from "../lib/usePersistentState";
import type { Category, Folder, ScoreMode, Track } from "./types";
import { isScore } from "./types";
import { loadYouTubeApi, PLACEHOLDER_TITLE } from "./youtube";

export type DeckStatus = "loading" | "playing" | "paused" | "error";

export interface Deck {
  id: string;
  trackId: string;
  folderId: string;
  /** Snapshot used if the track is edited or removed while playing. */
  track: Track;
  status: DeckStatus;
  error?: string;
  /** Set while the deck fades out before being removed. */
  leaving?: boolean;
  /** Set while a fade-in or fade-out button fade is running. */
  fading?: "in" | "out";
}

interface MusicApi {
  folders: Folder[];
  setFolders: (update: (f: Folder[]) => Folder[]) => void;
  updateTrack: (folderId: string, trackId: string, patch: Partial<Track>) => void;
  decks: Deck[];
  master: number;
  setMaster: (v: number) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  scoreMode: ScoreMode;
  setScoreMode: (m: ScoreMode) => void;
  play: (track: Track, folderId: string) => void;
  stop: (deckId: string) => void;
  togglePause: (deckId: string) => void;
  /** Fades the track down, then pauses it. */
  fadeOut: (deckId: string) => void;
  /** Starts or resumes the track from silence and fades it up. */
  fadeIn: (track: Track, folderId: string) => void;
  progress: (deckId: string) => { current: number; duration: number };
  seek: (deckId: string, seconds: number) => void;
  skip: (deckId: string) => void;
  stopAll: () => void;
  deckFor: (trackId: string) => Deck | undefined;
  /** Starts the first (or a random) song of a category in a folder. */
  playCategory: (folderId: string, category: Category, shuffle: boolean) => void;
}

const MusicContext = createContext<MusicApi | null>(null);

export function useMusic(): MusicApi {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic outside MusicProvider");
  return ctx;
}

const FADE_IN_MS = 1200;
const CROSSFADE_MS = 1800;
const STOP_FADE_MS = 700;
const FADE_OUT_BUTTON_MS = 6000;
const FADE_IN_BUTTON_MS = 5000;

/**
 * Maps a 0–1 fade position to a volume multiplier. Loudness is perceived
 * logarithmically, so a straight line sounds like it barely moves and then
 * drops off a cliff at the end; a cubic curve sounds even all the way down.
 */
const fadeCurve = (g: number) => g * g * g;

const defaultFolders: Folder[] = [{ id: "general", name: "General", tracks: [] }];

/**
 * Owns the music library and every YouTube player. It sits above the tabs,
 * so audio keeps playing whichever tab is open.
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const [folders, setFoldersState] = usePersistentState<Folder[]>("rc.music.folders", defaultFolders);
  const [master, setMaster] = usePersistentState("rc.music.master", 70);
  const [muted, setMuted] = useState(false);
  const [scoreMode, setScoreMode] = usePersistentState<ScoreMode>("rc.music.scoreMode", "next");
  const [decks, setDecks] = useState<Deck[]>([]);

  const players = useRef(new Map<string, YT.Player>());
  /** Per-deck fade multiplier, 0–1. */
  const gains = useRef(new Map<string, number>());
  const fades = useRef(new Map<string, number>());

  // Refs so YouTube event callbacks always see current state.
  const decksRef = useRef(decks);
  decksRef.current = decks;
  const foldersRef = useRef(folders);
  foldersRef.current = folders;
  const modeRef = useRef(scoreMode);
  modeRef.current = scoreMode;
  const levelRef = useRef(muted ? 0 : master);
  levelRef.current = muted ? 0 : master;

  const findTrack = (deck: Deck): Track =>
    foldersRef.current.find((f) => f.id === deck.folderId)?.tracks.find((t) => t.id === deck.trackId) ?? deck.track;

  const applyVolume = useCallback((deckId: string) => {
    const p = players.current.get(deckId);
    const deck = decksRef.current.find((d) => d.id === deckId);
    if (!p || !deck || typeof p.setVolume !== "function") return;
    const gain = fadeCurve(gains.current.get(deckId) ?? 1);
    p.setVolume(Math.round((findTrack(deck).volume * levelRef.current * gain) / 100));
  }, []);

  // Re-apply volumes whenever the library, master or mute changes.
  useEffect(() => {
    for (const d of decks) applyVolume(d.id);
  }, [folders, master, muted, decks, applyVolume]);

  const fadeTo = useCallback(
    (deckId: string, target: number, ms: number, done?: () => void) => {
      window.clearInterval(fades.current.get(deckId));
      const from = gains.current.get(deckId) ?? 1;
      const start = performance.now();
      const id = window.setInterval(() => {
        const t = Math.min(1, (performance.now() - start) / ms);
        gains.current.set(deckId, from + (target - from) * t);
        applyVolume(deckId);
        if (t >= 1) {
          window.clearInterval(id);
          fades.current.delete(deckId);
          done?.();
        }
      }, 40);
      fades.current.set(deckId, id);
    },
    [applyVolume],
  );

  const removeDeck = useCallback((deckId: string) => {
    window.clearInterval(fades.current.get(deckId));
    fades.current.delete(deckId);
    gains.current.delete(deckId);
    setDecks((ds) => ds.filter((d) => d.id !== deckId));
  }, []);

  const stop = useCallback(
    (deckId: string, ms = STOP_FADE_MS) => {
      const deck = decksRef.current.find((d) => d.id === deckId);
      if (!deck || deck.leaving) return;
      setDecks((ds) => ds.map((d) => (d.id === deckId ? { ...d, leaving: true } : d)));
      if (deck.status === "playing") fadeTo(deckId, 0, ms, () => removeDeck(deckId));
      else removeDeck(deckId);
    },
    [fadeTo, removeDeck],
  );

  const play = useCallback(
    (track: Track, folderId: string) => {
      const existing = decksRef.current.find((d) => d.trackId === track.id && !d.leaving);
      if (existing) {
        if (existing.status === "paused") players.current.get(existing.id)?.playVideo();
        return;
      }
      if (isScore(track.category)) {
        for (const d of decksRef.current) if (isScore(d.track.category)) stop(d.id, CROSSFADE_MS);
      }
      const id = uid();
      // Effects hit at full volume; everything else fades in.
      gains.current.set(id, track.category === "effect" ? 1 : 0);
      setDecks((ds) => [...ds, { id, trackId: track.id, folderId, track, status: "loading" }]);
    },
    [stop],
  );

  const nextScore = useCallback(
    (deck: Deck, mode: ScoreMode) => {
      const folder = foldersRef.current.find((f) => f.id === deck.folderId);
      // Skip songs YouTube already told us are blocked outside YouTube.
      const pool =
        folder?.tracks.filter((t) => t.category === deck.track.category && (!t.blocked || t.id === deck.trackId)) ?? [];
      if (pool.length === 0) return stop(deck.id);
      let next: Track;
      if (mode === "shuffle" && pool.length > 1) {
        const others = pool.filter((t) => t.id !== deck.trackId);
        next = others[Math.floor(Math.random() * others.length)];
      } else {
        const i = pool.findIndex((t) => t.id === deck.trackId);
        next = pool[(i + 1) % pool.length];
      }
      if (next.id === deck.trackId) {
        const p = players.current.get(deck.id);
        p?.seekTo(0, true);
        p?.playVideo();
        return;
      }
      play(next, deck.folderId);
    },
    [play, stop],
  );

  const onEnded = useCallback(
    (deckId: string) => {
      const deck = decksRef.current.find((d) => d.id === deckId);
      if (!deck || deck.leaving) return;
      const track = findTrack(deck);
      const p = players.current.get(deckId);
      const repeat = isScore(track.category) ? modeRef.current === "repeat" : track.loop;
      if (repeat) {
        if (track.kind === "playlist") p?.playVideoAt(0);
        else {
          p?.seekTo(0, true);
          p?.playVideo();
        }
        return;
      }
      if (isScore(track.category)) nextScore(deck, modeRef.current);
      else stop(deckId, 0);
    },
    [nextScore, stop],
  );

  const setStatus = (deckId: string, status: DeckStatus, error?: string) =>
    setDecks((ds) => ds.map((d) => (d.id === deckId && (d.status !== status || error) ? { ...d, status, error } : d)));

  const updateTrack = useCallback(
    (folderId: string, trackId: string, patch: Partial<Track>) =>
      setFoldersState((fs) =>
        fs.map((f) =>
          f.id === folderId ? { ...f, tracks: f.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)) } : f,
        ),
      ),
    [setFoldersState],
  );

  /** Called by a DeckHost once its element is in the DOM. */
  const mountPlayer = useCallback(
    async (deck: Deck, el: HTMLElement, cancelled: () => boolean) => {
      let api: typeof YT;
      try {
        api = await loadYouTubeApi();
      } catch (e) {
        setStatus(deck.id, "error", (e as Error).message);
        return;
      }
      if (cancelled()) return;
      const t = deck.track;
      const player = new api.Player(el, {
        width: 200,
        height: 200,
        videoId: t.kind === "video" ? t.ytId : undefined,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          origin: window.location.origin,
          ...(t.kind === "playlist" ? { listType: "playlist", list: t.ytId } : {}),
        },
        events: {
          onReady: (e) => {
            applyVolume(deck.id);
            if (t.kind === "playlist" && (isScore(t.category) ? modeRef.current === "shuffle" : false)) {
              e.target.setShuffle(true);
            }
            e.target.playVideo();
          },
          onStateChange: (e) => {
            const S = api.PlayerState;
            if (e.data === S.PLAYING) {
              setStatus(deck.id, "playing");
              const live = decksRef.current.find((d) => d.id === deck.id);
              if (live && !live.leaving && (gains.current.get(deck.id) ?? 1) < 1 && !fades.current.has(deck.id)) {
                fadeTo(deck.id, 1, FADE_IN_MS);
              }
              if (findTrack(deck).blocked) updateTrack(deck.folderId, deck.trackId, { blocked: false });
              // Fill in a title we could not fetch when the track was added.
              const title = e.target.getVideoData?.().title;
              const current = findTrack(deck);
              if (title && current.kind === "video" && current.title === PLACEHOLDER_TITLE) {
                updateTrack(deck.folderId, deck.trackId, { title });
              }
            } else if (e.data === S.PAUSED) setStatus(deck.id, "paused");
            else if (e.data === S.ENDED) onEnded(deck.id);
          },
          onError: (e) => {
            const code = Number(e.data);
            const blocked = code === 101 || code === 150;
            const live = decksRef.current.find((d) => d.id === deck.id);
            // In a playlist, skip the blocked song and keep going.
            if (t.kind === "playlist" && blocked) {
              e.target.nextVideo();
              return;
            }
            if (blocked && t.kind === "video") updateTrack(deck.folderId, deck.trackId, { blocked: true });
            setStatus(deck.id, "error", errorMessage(code));
            window.setTimeout(() => {
              removeDeck(deck.id);
              // Keep the soundtrack going if the folder has other songs.
              if (live && isScore(t.category) && modeRef.current !== "repeat") nextScore(live, modeRef.current);
            }, 4000);
          },
        },
      });
      players.current.set(deck.id, player);
    },
    [applyVolume, fadeTo, onEnded, removeDeck, updateTrack, nextScore],
  );

  const unmountPlayer = useCallback((deckId: string) => {
    const p = players.current.get(deckId);
    players.current.delete(deckId);
    try {
      p?.destroy();
    } catch {
      // Player was never fully created.
    }
  }, []);

  const togglePause = useCallback((deckId: string) => {
    const deck = decksRef.current.find((d) => d.id === deckId);
    const p = players.current.get(deckId);
    if (!deck || !p) return;
    if (deck.status === "playing") p.pauseVideo();
    else p.playVideo();
  }, []);

  const setFading = (deckId: string, fading: Deck["fading"]) =>
    setDecks((ds) => ds.map((d) => (d.id === deckId ? { ...d, fading } : d)));

  const fadeOut = useCallback(
    (deckId: string) => {
      const deck = decksRef.current.find((d) => d.id === deckId);
      const p = players.current.get(deckId);
      if (!deck || !p || deck.status !== "playing") return;
      setFading(deckId, "out");
      fadeTo(deckId, 0, FADE_OUT_BUTTON_MS, () => {
        // Hold at silence briefly so the pause itself can't be heard.
        window.setTimeout(() => {
          if ((gains.current.get(deckId) ?? 1) === 0) p.pauseVideo();
          setFading(deckId, undefined);
        }, 300);
      });
    },
    [fadeTo],
  );

  const fadeIn = useCallback(
    (track: Track, folderId: string) => {
      const deck = decksRef.current.find((d) => d.trackId === track.id && !d.leaving);
      if (!deck) {
        play(track, folderId);
        return;
      }
      const p = players.current.get(deck.id);
      if (!p) return;
      setFading(deck.id, "in");
      const up = () => fadeTo(deck.id, 1, FADE_IN_BUTTON_MS, () => setFading(deck.id, undefined));
      if (deck.status === "playing") {
        up();
      } else {
        window.clearInterval(fades.current.get(deck.id));
        fades.current.delete(deck.id);
        gains.current.set(deck.id, 0);
        applyVolume(deck.id);
        // Start the fade before playback so the PLAYING handler sees it running.
        up();
        p.playVideo();
      }
    },
    [applyVolume, fadeTo, play],
  );

  const progress = useCallback((deckId: string) => {
    const p = players.current.get(deckId);
    if (!p || typeof p.getCurrentTime !== "function") return { current: 0, duration: 0 };
    return { current: p.getCurrentTime() || 0, duration: p.getDuration() || 0 };
  }, []);

  const seek = useCallback((deckId: string, seconds: number) => {
    players.current.get(deckId)?.seekTo(seconds, true);
  }, []);

  const skip = useCallback(
    (deckId: string) => {
      const deck = decksRef.current.find((d) => d.id === deckId);
      if (!deck) return;
      if (deck.track.kind === "playlist") players.current.get(deckId)?.nextVideo();
      else nextScore(deck, modeRef.current === "shuffle" ? "shuffle" : "next");
    },
    [nextScore],
  );

  const stopAll = useCallback(() => {
    for (const d of decksRef.current) stop(d.id);
  }, [stop]);

  const playCategory = useCallback(
    (folderId: string, category: Category, shuffle: boolean) => {
      const pool = foldersRef.current.find((f) => f.id === folderId)?.tracks.filter((t) => t.category === category);
      if (!pool?.length) return;
      if (isScore(category)) setScoreMode(shuffle ? "shuffle" : "next");
      play(shuffle ? pool[Math.floor(Math.random() * pool.length)] : pool[0], folderId);
    },
    [play, setScoreMode],
  );

  // Stop decks whose track was deleted.
  useEffect(() => {
    for (const d of decks) {
      const exists = folders.some((f) => f.id === d.folderId && f.tracks.some((t) => t.id === d.trackId));
      if (!exists && !d.leaving) stop(d.id);
    }
  }, [folders, decks, stop]);

  const api = useMemo<MusicApi>(
    () => ({
      folders,
      setFolders: setFoldersState,
      updateTrack,
      decks,
      master,
      setMaster,
      muted,
      setMuted,
      scoreMode,
      setScoreMode,
      play,
      stop,
      togglePause,
      fadeOut,
      fadeIn,
      progress,
      seek,
      skip,
      stopAll,
      deckFor: (trackId) => decks.find((d) => d.trackId === trackId && !d.leaving),
      playCategory,
    }),
    [folders, setFoldersState, updateTrack, decks, master, setMaster, muted, scoreMode, setScoreMode, play, stop, togglePause, fadeOut, fadeIn, progress, seek, skip, stopAll, playCategory],
  );

  return (
    <MusicContext.Provider value={api}>
      {children}
      <div className="yt-hosts" aria-hidden>
        {decks.map((d) => (
          <DeckHost key={d.id} deck={d} mount={mountPlayer} unmount={unmountPlayer} />
        ))}
      </div>
    </MusicContext.Provider>
  );
}

function DeckHost({
  deck,
  mount,
  unmount,
}: {
  deck: Deck;
  mount: (deck: Deck, el: HTMLElement, cancelled: () => boolean) => void;
  unmount: (deckId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // YouTube replaces the target element with its iframe, so give it a child to replace.
    const target = document.createElement("div");
    ref.current!.appendChild(target);
    let cancelled = false;
    mount(deck, target, () => cancelled);
    return () => {
      cancelled = true;
      unmount(deck.id);
      target.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);
  return <div ref={ref} className="yt-host" />;
}

function errorMessage(code: number): string {
  switch (code) {
    case 101:
    case 150:
      return `The video's owner blocks playback on other sites (YouTube error ${code})`;
    case 100:
      return "Video not found or private (YouTube error 100)";
    case 2:
      return "Invalid video link (YouTube error 2)";
    case 5:
      return "The browser could not play this video (YouTube error 5)";
    default:
      return `YouTube refused to play this (error ${code})`;
  }
}

import { useMusic } from "./MusicProvider";
import type { ScoreMode } from "./types";
import { isScore } from "./types";

const MODES: { id: ScoreMode; label: string; title: string }[] = [
  { id: "repeat", label: "⟳", title: "Repeat the current song" },
  { id: "next", label: "⇥", title: "Play the next song in the folder" },
  { id: "shuffle", label: "⤨", title: "Shuffle songs in the folder" },
];

/** Fixed bar shown on every tab while anything is playing. */
export default function NowPlaying({ onOpen }: { onOpen: () => void }) {
  const { decks, master, setMaster, muted, setMuted, scoreMode, setScoreMode, togglePause, stop, skip, stopAll, folders, updateTrack } =
    useMusic();
  const live = decks.filter((d) => !d.leaving);
  if (live.length === 0) return null;

  const volumeOf = (folderId: string, trackId: string, fallback: number) =>
    folders.find((f) => f.id === folderId)?.tracks.find((t) => t.id === trackId)?.volume ?? fallback;

  return (
    <div className="now-playing" role="region" aria-label="Now playing">
      <button className="np-title" onClick={onOpen} title="Open the music tab">
        <span className="eq">
          <i />
          <i />
          <i />
        </span>
        Now playing
      </button>
      <div className="np-decks">
        {live.map((d) => (
          <div key={d.id} className={`np-deck cat-${d.track.category} ${d.status}`}>
            <span className="np-dot" />
            <span className="np-name" title={d.error ?? d.track.title}>
              {d.error ? `⚠ ${d.error}` : d.track.title}
            </span>
            <input
              type="range"
              className="slider tiny"
              min={0}
              max={100}
              value={volumeOf(d.folderId, d.trackId, d.track.volume)}
              onChange={(e) => updateTrack(d.folderId, d.trackId, { volume: Number(e.target.value) })}
              aria-label={`${d.track.title} volume`}
            />
            <button className="icon-btn" onClick={() => togglePause(d.id)} title={d.status === "paused" ? "Resume" : "Pause"} disabled={d.status === "loading" || d.status === "error"}>
              {d.status === "paused" ? "▶" : "❚❚"}
            </button>
            {(isScore(d.track.category) || d.track.kind === "playlist") && (
              <button className="icon-btn" onClick={() => skip(d.id)} title="Next">
                ⏭
              </button>
            )}
            <button className="icon-btn danger" onClick={() => stop(d.id)} title="Stop">
              ■
            </button>
          </div>
        ))}
      </div>
      <div className="np-master">
        <div className="segmented mini" title="When a song ends">
          {MODES.map((m) => (
            <button key={m.id} className={scoreMode === m.id ? "on" : ""} onClick={() => setScoreMode(m.id)} title={m.title}>
              {m.label}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={() => setMuted(!muted)} title={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>
        <input
          type="range"
          className="slider"
          min={0}
          max={100}
          value={master}
          onChange={(e) => setMaster(Number(e.target.value))}
          aria-label="Master volume"
        />
        <button className="btn small ghost" onClick={stopAll}>
          Stop all
        </button>
      </div>
    </div>
  );
}

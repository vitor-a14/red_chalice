import { useEffect, useState } from "react";
import type { Deck } from "./MusicProvider";
import { useMusic } from "./MusicProvider";
import type { Category, Track } from "./types";
import { CATEGORIES, isScore, TRACK_MIME } from "./types";
import { thumbnailUrl, watchUrl } from "./youtube";

export default function TrackCard({ track, folderId }: { track: Track; folderId: string }) {
  const { play, stop, togglePause, fadeIn, fadeOut, deckFor, updateTrack, setFolders } = useMusic();
  const [editing, setEditing] = useState(false);
  // Only drag the card when the press starts on the artwork or title, not on sliders or buttons.
  const [dragArmed, setDragArmed] = useState(false);
  const deck = deckFor(track.id);
  const thumb = thumbnailUrl(track);
  const state = deck?.status;

  const remove = () => {
    if (confirm(`Remove "${track.title}"?`)) {
      setFolders((fs) =>
        fs.map((f) => (f.id === folderId ? { ...f, tracks: f.tracks.filter((t) => t.id !== track.id) } : f)),
      );
    }
  };

  return (
    <div
      className={`track ${deck ? "live" : ""} ${state ?? ""} ${track.blocked ? "blocked" : ""}`}
      draggable={dragArmed && !editing}
      onPointerDown={(e) =>
        setDragArmed(!(e.target as HTMLElement).closest("input, select, a, .track-controls, .track-progress, .track-fades, .edit-track"))
      }
      onDragEnd={() => setDragArmed(false)}
      onDragStart={(e) => {
        e.dataTransfer.setData(TRACK_MIME, JSON.stringify({ folderId, trackId: track.id }));
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        className="track-art"
        style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
        onClick={() => (deck ? (state === "paused" ? togglePause(deck.id) : stop(deck.id)) : play(track, folderId))}
        title={deck ? (state === "paused" ? "Resume" : "Stop") : "Play"}
      >
        {!thumb && <span className="playlist-art">☰</span>}
        <span className="art-overlay">
          {state === "loading" ? (
            <span className="spinner" />
          ) : deck && state !== "paused" ? (
            <span className="stop-glyph">■</span>
          ) : (
            <span className="play-glyph">▶</span>
          )}
        </span>
        {state === "playing" && (
          <span className="eq">
            <i />
            <i />
            <i />
          </span>
        )}
        {track.kind === "playlist" && <span className="badge">Playlist</span>}
      </button>

      <div className="track-body">
        {editing ? (
          <EditTrack
            track={track}
            onSave={(patch) => {
              updateTrack(folderId, track.id, patch);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="track-title" title={track.title}>
              {track.title}
            </div>
            {deck && !deck.error && <TrackProgress deck={deck} />}
            <div className="track-fades">
              <button
                className={`btn small fade-btn ${deck?.fading === "out" ? "busy" : ""}`}
                onClick={() => deck && fadeOut(deck.id)}
                disabled={!deck || state !== "playing" || deck.fading === "out"}
                title="Fade the volume down, then pause"
              >
                ◢ Fade out
              </button>
              <button
                className={`btn small fade-btn ${deck?.fading === "in" ? "busy" : ""}`}
                onClick={() => fadeIn(track, folderId)}
                disabled={(state === "playing" && !deck?.fading) || deck?.fading === "in" || state === "loading"}
                title="Play from silence and fade the volume up"
              >
                ◣ Fade in
              </button>
            </div>
            {deck?.error ? (
              <div className="track-error">{deck.error}</div>
            ) : (
              track.blocked && (
                <div className="track-error">
                  The owner only allows this on YouTube.{" "}
                  <button className="link-btn" onClick={() => openPopup(track)}>
                    Play in a small window
                  </button>{" "}
                  or swap in another upload.
                </div>
              )
            )}
            <div className="track-controls">
              <span className="vol-icon" aria-hidden>
                {track.volume === 0 ? "🔇" : "🔉"}
              </span>
              <input
                type="range"
                className="slider"
                min={0}
                max={100}
                value={track.volume}
                onChange={(e) => updateTrack(folderId, track.id, { volume: Number(e.target.value) })}
                aria-label="Volume"
              />
              {!isScore(track.category) && (
                <button
                  className={`icon-btn toggle ${track.loop ? "on" : ""}`}
                  onClick={() => updateTrack(folderId, track.id, { loop: !track.loop })}
                  title={track.loop ? "Looping" : "Plays once"}
                >
                  ⟳
                </button>
              )}
              <button className="icon-btn" onClick={() => setEditing(true)} title="Edit">
                ✎
              </button>
              <a className="icon-btn" href={watchUrl(track)} target="_blank" rel="noreferrer" title="Open on YouTube">
                ↗
              </a>
              <button className="icon-btn danger" onClick={remove} title="Remove">
                ✕
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditTrack({
  track,
  onSave,
  onCancel,
}: {
  track: Track;
  onSave: (patch: Partial<Track>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [category, setCategory] = useState<Category>(track.category);
  return (
    <form
      className="edit-track"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ title: title.trim() || track.title, category });
      }}
    >
      <input className="field" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="field" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="edit-actions">
        <button type="button" className="btn ghost small" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary small">Save</button>
      </div>
    </form>
  );
}

/** Opens the video in a small YouTube window, for videos that block embedding. */
function openPopup(track: Track) {
  window.open(watchUrl(track), "red-chalice-youtube", "popup,width=560,height=360");
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Seekable progress bar; polls the player while the track is loaded. */
function TrackProgress({ deck }: { deck: Deck }) {
  const { progress, seek } = useMusic();
  const [pos, setPos] = useState({ current: 0, duration: 0 });
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setPos(progress(deck.id));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [deck.id, progress]);

  const value = dragging ?? pos.current;
  const commit = () => {
    if (dragging === null) return;
    seek(deck.id, dragging);
    setPos((p) => ({ ...p, current: dragging }));
    setDragging(null);
  };

  return (
    <div className="track-progress">
      <span className="time">{fmtTime(value)}</span>
      <input
        type="range"
        className="slider seek"
        min={0}
        max={Math.max(1, Math.floor(pos.duration))}
        step={1}
        value={Math.min(value, pos.duration || 1)}
        disabled={!pos.duration}
        style={{ "--pct": `${pos.duration ? (value / pos.duration) * 100 : 0}%` } as React.CSSProperties}
        onChange={(e) => setDragging(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label="Position"
      />
      <span className="time">{pos.duration ? fmtTime(pos.duration) : "--:--"}</span>
    </div>
  );
}

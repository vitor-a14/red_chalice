import { useEffect, useState } from "react";
import { uid } from "../lib/random";
import { usePersistentState } from "../lib/usePersistentState";
import { useMusic } from "./MusicProvider";
import TrackCard from "./TrackCard";
import type { Category, Folder } from "./types";
import { CATEGORIES, isScore, TRACK_MIME } from "./types";
import { fetchTitle, parseYouTubeUrl, PLACEHOLDER_TITLE } from "./youtube";

export default function MusicTab() {
  const { folders, setFolders } = useMusic();
  const [selectedId, setSelectedId] = usePersistentState("rc.music.folder", folders[0]?.id ?? "");
  const selected = folders.find((f) => f.id === selectedId) ?? folders[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId, setSelectedId]);

  return (
    <div className="music-layout">
      <FolderList folders={folders} selectedId={selected?.id} onSelect={setSelectedId} setFolders={setFolders} />
      {selected ? (
        <FolderView folder={selected} />
      ) : (
        <section className="panel empty-panel">Create a session folder to start collecting sounds.</section>
      )}
    </div>
  );
}

function FolderList({
  folders,
  selectedId,
  onSelect,
  setFolders,
}: {
  folders: Folder[];
  selectedId?: string;
  onSelect: (id: string) => void;
  setFolders: (u: (f: Folder[]) => Folder[]) => void;
}) {
  const { decks } = useMusic();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const id = uid();
    setFolders((fs) => [...fs, { id, name: n, tracks: [] }]);
    onSelect(id);
    setName("");
  };

  const rename = (id: string, n: string) => {
    const trimmed = n.trim();
    if (trimmed) setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
    setRenaming(null);
  };

  const remove = (f: Folder) => {
    if (confirm(`Delete the folder "${f.name}" and its ${f.tracks.length} sounds?`)) {
      setFolders((fs) => fs.filter((x) => x.id !== f.id));
    }
  };

  const moveTrack = (data: string, toId: string) => {
    const { folderId, trackId } = JSON.parse(data) as { folderId: string; trackId: string };
    if (folderId === toId) return;
    setFolders((fs) => {
      const track = fs.find((f) => f.id === folderId)?.tracks.find((t) => t.id === trackId);
      if (!track) return fs;
      return fs.map((f) =>
        f.id === folderId
          ? { ...f, tracks: f.tracks.filter((t) => t.id !== trackId) }
          : f.id === toId
            ? { ...f, tracks: [...f.tracks, track] }
            : f,
      );
    });
  };

  return (
    <section className="panel folders">
      <h2 className="panel-title">Sessions</h2>
      <form className="folder-form" onSubmit={create}>
        <input className="field" placeholder="New folder…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary" disabled={!name.trim()}>
          Add
        </button>
      </form>
      <ul className="folder-list">
        {folders.map((f) => {
          const live = decks.some((d) => d.folderId === f.id && !d.leaving);
          return (
            <li
              key={f.id}
              className={`folder ${f.id === selectedId ? "on" : ""} ${dropTarget === f.id ? "drop" : ""}`}
              onClick={() => onSelect(f.id)}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(TRACK_MIME)) return;
                e.preventDefault();
                setDropTarget(f.id);
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => {
                setDropTarget(null);
                const data = e.dataTransfer.getData(TRACK_MIME);
                if (data) moveTrack(data, f.id);
              }}
            >
              <span className="folder-icon" aria-hidden>
                {f.id === selectedId ? "📖" : "📕"}
              </span>
              {renaming === f.id ? (
                <input
                  className="field folder-rename"
                  autoFocus
                  defaultValue={f.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => rename(f.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") rename(f.id, e.currentTarget.value);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
              ) : (
                <span className="folder-name" onDoubleClick={() => setRenaming(f.id)}>
                  {f.name}
                </span>
              )}
              {live && <span className="eq small" aria-label="Playing"><i /><i /><i /></span>}
              <span className="folder-count">{f.tracks.length}</span>
              <span className="folder-actions">
                <button
                  className="icon-btn"
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenaming(f.id);
                  }}
                >
                  ✎
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(f);
                  }}
                >
                  ✕
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="hint">Drag a sound onto a folder to move it.</p>
    </section>
  );
}

function FolderView({ folder }: { folder: Folder }) {
  const { setFolders, playCategory } = useMusic();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = usePersistentState<Category>("rc.music.lastCategory", "ambience");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = parseYouTubeUrl(url);
  const invalid = url.trim() !== "" && !ref;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref) return;
    setBusy(true);
    const name = title.trim() || (await fetchTitle(ref)) || (ref.kind === "playlist" ? "YouTube playlist" : PLACEHOLDER_TITLE);
    setBusy(false);
    setFolders((fs) =>
      fs.map((f) =>
        f.id === folder.id
          ? {
              ...f,
              tracks: [
                ...f.tracks,
                {
                  id: uid(),
                  title: name,
                  kind: ref.kind,
                  ytId: ref.ytId,
                  category,
                  volume: category === "ambience" ? 50 : 80,
                  loop: category === "ambience",
                },
              ],
            }
          : f,
      ),
    );
    setUrl("");
    setTitle("");
  };

  const q = filter.trim().toLowerCase();
  const tracks = folder.tracks.filter((t) => !q || t.title.toLowerCase().includes(q));

  return (
    <section className="panel folder-view">
      <div className="folder-head">
        <h2 className="panel-title">{folder.name}</h2>
        {folder.tracks.length > 6 && (
          <input
            className="field search"
            placeholder="Search sounds…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        )}
      </div>

      <form className="add-track" onSubmit={add}>
        <input
          className={`field url ${invalid ? "invalid" : ""}`}
          placeholder="Paste a YouTube link (video or playlist)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="field"
          placeholder="Name (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="cat-picker" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              role="radio"
              aria-checked={category === c.id}
              className={`cat-chip cat-${c.id} ${category === c.id ? "on" : ""}`}
              onClick={() => setCategory(c.id)}
              title={c.hint}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button className="btn primary" disabled={!ref || busy}>
          {busy ? "Adding…" : ref?.kind === "playlist" ? "Add playlist" : "Add sound"}
        </button>
      </form>
      {invalid && <p className="form-error">That doesn't look like a YouTube link.</p>}

      {folder.tracks.length === 0 && (
        <div className="music-empty">
          <span aria-hidden>🎻</span>
          No sounds in this folder yet. Paste a YouTube link above.
        </div>
      )}

      {CATEGORIES.map((c) => {
        const list = tracks.filter((t) => t.category === c.id);
        if (list.length === 0) return null;
        return (
          <div key={c.id} className={`cat-section cat-${c.id}`}>
            <div className="cat-head">
              <h3>{c.label}</h3>
              <span className="cat-hint">{c.hint}</span>
              {isScore(c.id) && list.length > 1 && (
                <span className="cat-actions">
                  <button className="pill" onClick={() => playCategory(folder.id, c.id, false)}>
                    ▶ Play all
                  </button>
                  <button className="pill" onClick={() => playCategory(folder.id, c.id, true)}>
                    ⤨ Shuffle
                  </button>
                </span>
              )}
            </div>
            <div className="track-grid">
              {list.map((t) => (
                <TrackCard key={t.id} track={t} folderId={folder.id} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

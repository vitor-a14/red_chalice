import { useState } from "react";
import { uid } from "../lib/random";
import { ACTOR_MIME } from "./dnd";
import type { Actor, ActorKind } from "./types";
import { KIND_LABEL } from "./types";

interface Props {
  actors: Actor[];
  onChange: (actors: Actor[]) => void;
  onAdd: (actor: Actor) => void;
}

const blank = { name: "", maxHp: "", initMod: "", kind: "enemy" as ActorKind };

export default function ActorLibrary({ actors, onChange, onAdd }: Props) {
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || !(Number(form.maxHp) > 0)) return;
    const data = {
      name,
      maxHp: Math.max(1, Number(form.maxHp) || 1),
      initMod: Number(form.initMod) || 0,
      kind: form.kind,
    };
    if (editing) {
      onChange(actors.map((a) => (a.id === editing ? { ...a, ...data } : a)));
    } else {
      onChange([...actors, { id: uid(), ...data }]);
    }
    setForm({ ...blank, kind: form.kind });
    setEditing(null);
  };

  const startEdit = (a: Actor) => {
    setEditing(a.id);
    setForm({ name: a.name, maxHp: String(a.maxHp), initMod: String(a.initMod), kind: a.kind });
  };

  const remove = (a: Actor) => {
    if (confirm(`Delete "${a.name}" from the actor list?`)) {
      onChange(actors.filter((x) => x.id !== a.id));
      if (editing === a.id) {
        setEditing(null);
        setForm(blank);
      }
    }
  };

  const shown = actors
    .filter((a) => a.name.toLowerCase().includes(filter.trim().toLowerCase()))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

  return (
    <section className="panel library">
      <h2 className="panel-title">Actors</h2>

      <form className="actor-form" onSubmit={submit}>
        <input
          className="field name"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <label className="mini-field">
          <span>HP</span>
          <input
            className="field"
            type="number"
            min={1}
            placeholder="20"
            value={form.maxHp}
            onChange={(e) => setForm({ ...form, maxHp: e.target.value })}
          />
        </label>
        <label className="mini-field">
          <span>Init</span>
          <input
            className="field"
            type="number"
            placeholder="+0"
            value={form.initMod}
            onChange={(e) => setForm({ ...form, initMod: e.target.value })}
          />
        </label>
        <div className="kind-picker" role="radiogroup" aria-label="Type">
          {(Object.keys(KIND_LABEL) as ActorKind[]).map((k) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={form.kind === k}
              className={`kind-chip kind-${k} ${form.kind === k ? "on" : ""}`}
              onClick={() => setForm({ ...form, kind: k })}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="form-actions">
          {editing && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
            >
              Cancel
            </button>
          )}
          <button className="btn primary" type="submit" disabled={!form.name.trim() || !(Number(form.maxHp) > 0)}>
            {editing ? "Save actor" : "Create actor"}
          </button>
        </div>
      </form>

      {actors.length > 4 && (
        <input
          className="field search"
          placeholder="Search actors…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      <ul className="actor-list">
        {shown.length === 0 && (
          <li className="empty">{actors.length ? "No match." : "Create an actor, then drag it into the combat order."}</li>
        )}
        {shown.map((a) => (
          <li
            key={a.id}
            className={`actor-card kind-${a.kind} ${editing === a.id ? "editing" : ""}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(ACTOR_MIME, a.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            title="Drag into the combat order"
          >
            <span className="grip" aria-hidden>
              ⋮⋮
            </span>
            <div className="actor-info">
              <span className="actor-name">{a.name}</span>
              <span className="actor-meta">
                {KIND_LABEL[a.kind]} · {a.maxHp} HP · Init {fmtMod(a.initMod)}
              </span>
            </div>
            <div className="actor-actions">
              <button className="icon-btn" onClick={() => startEdit(a)} title="Edit">
                ✎
              </button>
              <button className="icon-btn danger" onClick={() => remove(a)} title="Delete">
                ✕
              </button>
              <button className="icon-btn add" onClick={() => onAdd(a)} title="Add to combat">
                ➜
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function fmtMod(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

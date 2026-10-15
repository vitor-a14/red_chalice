import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Condition } from "./types";

export interface ConditionPreset {
  name: string;
  color: string;
}

interface Props {
  presets: ConditionPreset[];
  onAdd: (c: Omit<Condition, "id">) => void;
  onForgetPreset: (name: string) => void;
  onClose: () => void;
}

const SWATCHES = ["#e5484d", "#f76b15", "#ffc53d", "#46a758", "#12a594", "#3e63dd", "#8e4ec6", "#d6409f", "#8b8d98"];

export default function ConditionEditor({ presets, onAdd, onForgetPreset, onClose }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const add = (n: string, c: string) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    const v = Number(value);
    onAdd({ name: trimmed, color: c, value: value && v > 0 ? v : undefined });
    onClose();
  };

  return (
    <div className="condition-editor" ref={ref}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(name, color);
        }}
      >
        <div className="ce-row">
          <input
            autoFocus
            className="field"
            placeholder="Condition (e.g. Frightened)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="field ce-value"
            type="number"
            min={1}
            placeholder="Val"
            title="Optional value, like Frightened 2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="ce-row swatches">
          {SWATCHES.map((s) => (
            <button
              type="button"
              key={s}
              className={`swatch ${color === s ? "on" : ""}`}
              style={{ background: s }}
              onClick={() => setColor(s)}
              aria-label={`Color ${s}`}
            />
          ))}
          <label className="swatch custom" title="Custom color" style={{ background: color }}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        <button className="btn primary small" type="submit" disabled={!name.trim()}>
          Add condition
        </button>
      </form>
      {presets.length > 0 && (
        <div className="ce-presets">
          <span className="ce-label">Recent</span>
          <div className="chips">
            {presets.map((p) => (
              <span key={p.name} className="chip preset" style={{ "--chip": p.color } as CSSProperties}>
                <button type="button" className="chip-main" onClick={() => add(p.name, p.color)}>
                  {p.name}
                </button>
                <button
                  type="button"
                  className="chip-x"
                  onClick={() => onForgetPreset(p.name)}
                  aria-label={`Forget ${p.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

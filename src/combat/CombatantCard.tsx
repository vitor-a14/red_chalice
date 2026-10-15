import { type CSSProperties, type DragEvent, useState } from "react";
import { rollDie, uid } from "../lib/random";
import { fmtMod } from "./ActorLibrary";
import ConditionEditor, { type ConditionPreset } from "./ConditionEditor";
import { COMBATANT_MIME } from "./dnd";
import { isDead } from "./encounter";
import type { Combatant, Condition } from "./types";
import { KIND_LABEL, MAX_DYING } from "./types";

interface Props {
  c: Combatant;
  active: boolean;
  flash: boolean;
  presets: ConditionPreset[];
  onChange: (c: Combatant) => void;
  onRemove: () => void;
  onSavePreset: (p: ConditionPreset) => void;
  onForgetPreset: (name: string) => void;
  onDragOver: (e: DragEvent<HTMLLIElement>) => void;
}

export default function CombatantCard(props: Props) {
  const { c, active, flash, presets, onChange, onRemove, onSavePreset, onForgetPreset, onDragOver } = props;
  const [amount, setAmount] = useState("");
  const [editingConditions, setEditingConditions] = useState(false);
  // Only arm dragging when the press starts outside inputs, so text selection keeps working.
  const [dragArmed, setDragArmed] = useState(false);
  const dead = isDead(c);
  const hpPct = c.maxHp > 0 ? Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100)) : 0;

  const setHp = (hp: number) => onChange({ ...c, hp: Math.max(0, Math.min(c.maxHp, hp)) });

  const applyAmount = (sign: 1 | -1) => {
    const n = Math.abs(Number(amount));
    if (!n) return;
    setHp(c.hp + sign * n);
    setAmount("");
  };

  const setDying = (level: number) => onChange({ ...c, dying: c.dying === level ? level - 1 : level });

  const addCondition = (cond: Omit<Condition, "id">) => {
    onChange({ ...c, conditions: [...c.conditions, { id: uid(), ...cond }] });
    onSavePreset({ name: cond.name, color: cond.color });
  };

  const bumpCondition = (id: string, delta: number) =>
    onChange({
      ...c,
      conditions: c.conditions.flatMap((x) => {
        if (x.id !== id || x.value === undefined) return [x];
        const value = x.value + delta;
        return value <= 0 ? [] : [{ ...x, value }];
      }),
    });

  const hpState = hpPct > 50 ? "ok" : hpPct > 25 ? "hurt" : hpPct > 0 ? "bad" : "down";

  return (
    <li
      className={`combatant kind-${c.kind} ${active ? "active" : ""} ${dead ? "dead" : ""} ${flash ? "flash" : ""}`}
      draggable={dragArmed}
      onPointerDown={(e) => setDragArmed(!(e.target as HTMLElement).closest("input, button, .condition-editor"))}
      onDragEnd={() => setDragArmed(false)}
      onDragStart={(e) => {
        e.dataTransfer.setData(COMBATANT_MIME, c.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={onDragOver}
    >
      <div className="cb-init">
        <input
          className="init-input"
          type="number"
          value={c.initiative ?? ""}
          placeholder="–"
          aria-label="Initiative"
          onChange={(e) =>
            onChange({ ...c, initiative: e.target.value === "" ? null : Number(e.target.value), initRoll: undefined })
          }
        />
        <button
          className="init-roll"
          title={`Roll initiative (d20 ${fmtMod(c.initMod)})`}
          onClick={() => {
            const d = rollDie(20);
            onChange({ ...c, initRoll: d, initiative: d + c.initMod });
          }}
        >
          {c.initRoll !== undefined ? `d20: ${c.initRoll}` : `d20 ${fmtMod(c.initMod)}`}
        </button>
      </div>

      <div className="cb-main">
        <div className="cb-head">
          <span className="grip" aria-hidden>
            ⋮⋮
          </span>
          <input
            className="cb-name"
            value={c.name}
            aria-label="Name"
            onChange={(e) => onChange({ ...c, name: e.target.value })}
          />
          <span className={`kind-tag kind-${c.kind}`}>{KIND_LABEL[c.kind]}</span>
          {dead && <span className="dead-tag">☠ Dead</span>}
          <button className="icon-btn danger cb-remove" onClick={onRemove} title="Remove from combat">
            ✕
          </button>
        </div>

        <div className="cb-row">
          <div className="hp">
            <div className="hp-top">
              <button className="icon-btn" onClick={() => setHp(c.hp - 1)} title="-1 HP">
                −
              </button>
              <span className="hp-value">
                <strong>{c.hp}</strong>
                <span className="hp-max">/ {c.maxHp}</span>
              </span>
              <button className="icon-btn" onClick={() => setHp(c.hp + 1)} title="+1 HP">
                +
              </button>
              <input
                className="field hp-amount"
                type="number"
                min={0}
                placeholder="Amt"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyAmount(e.shiftKey ? 1 : -1);
                }}
                title="Enter applies damage, Shift+Enter heals"
              />
              <button className="btn small dmg" onClick={() => applyAmount(-1)} disabled={!amount}>
                Damage
              </button>
              <button className="btn small heal" onClick={() => applyAmount(1)} disabled={!amount}>
                Heal
              </button>
            </div>
            <div className={`hp-bar ${hpState}`}>
              <div className="hp-fill" style={{ width: `${hpPct}%` }} />
            </div>
          </div>

          <div className="dying" title="Dying condition: at 4 the creature dies">
            <span className="dying-label">Dying</span>
            <div className="dots">
              {Array.from({ length: MAX_DYING }, (_, i) => i + 1).map((level) => (
                <button
                  key={level}
                  className={`dot ${c.dying >= level ? "on" : ""} ${level === MAX_DYING ? "last" : ""}`}
                  onClick={() => setDying(level)}
                  aria-label={`Dying ${level}`}
                  aria-pressed={c.dying >= level}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="cb-conditions">
          {c.conditions.map((cond) => (
            <span key={cond.id} className="chip" style={{ "--chip": cond.color } as CSSProperties}>
              <span className="chip-main">
                {cond.name}
                {cond.value !== undefined && (
                  <span className="chip-value">
                    <button onClick={() => bumpCondition(cond.id, -1)} aria-label="Decrease">
                      ‹
                    </button>
                    {cond.value}
                    <button onClick={() => bumpCondition(cond.id, 1)} aria-label="Increase">
                      ›
                    </button>
                  </span>
                )}
              </span>
              <button
                className="chip-x"
                onClick={() => onChange({ ...c, conditions: c.conditions.filter((x) => x.id !== cond.id) })}
                aria-label={`Remove ${cond.name}`}
              >
                ×
              </button>
            </span>
          ))}
          <div className="ce-anchor">
            <button className="chip add-chip" onClick={() => setEditingConditions((v) => !v)}>
              + Condition
            </button>
            {editingConditions && (
              <ConditionEditor
                presets={presets}
                onAdd={addCondition}
                onForgetPreset={onForgetPreset}
                onClose={() => setEditingConditions(false)}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

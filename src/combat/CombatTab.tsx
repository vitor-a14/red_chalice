import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistentState } from "../lib/usePersistentState";
import ActorLibrary from "./ActorLibrary";
import CombatantCard from "./CombatantCard";
import type { ConditionPreset } from "./ConditionEditor";
import { ACTOR_MIME, COMBATANT_MIME, hasType } from "./dnd";
import {
  emptyEncounter,
  makeCombatant,
  nextTurn,
  placeCombatant,
  prevTurn,
  removeCombatant,
  rollInitiative,
  sortByInitiative,
  withSortedOrder,
} from "./encounter";
import type { Actor, Combatant, Encounter } from "./types";

export default function CombatTab() {
  const [actors, setActors] = usePersistentState<Actor[]>("rc.actors", []);
  const [encounter, setEncounter] = usePersistentState<Encounter>("rc.encounter", emptyEncounter);
  const [presets, setPresets] = usePersistentState<ConditionPreset[]>("rc.conditionPresets", []);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const flashTimer = useRef<number>(undefined);
  const listRef = useRef<HTMLOListElement>(null);

  const { combatants, turn, round } = encounter;

  const flash = (ids: string[]) => {
    setFlashIds(new Set(ids));
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashIds(new Set()), 900);
  };
  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const addActor = (actor: Actor, at = combatants.length) => {
    const c = makeCombatant(actor, combatants);
    setEncounter((e) => placeCombatant(e, c, at));
    flash([c.id]);
  };

  const updateCombatant = (c: Combatant) =>
    setEncounter((e) => ({ ...e, combatants: e.combatants.map((x) => (x.id === c.id ? c : x)) }));

  const rollAll = () => {
    setEncounter((e) => withSortedOrder(e, rollInitiative(e.combatants)));
    flash(combatants.map((c) => c.id));
  };

  const savePreset = useCallback(
    (p: ConditionPreset) =>
      setPresets((list) => [p, ...list.filter((x) => x.name.toLowerCase() !== p.name.toLowerCase())].slice(0, 16)),
    [setPresets],
  );

  // Work out where a dragged item would land from the pointer's position over a card.
  const overCard = (index: number) => (e: React.DragEvent<HTMLLIElement>) => {
    if (!hasType(e, ACTOR_MIME) && !hasType(e, COMBATANT_MIME)) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setDropIndex(index + (after ? 1 : 0));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const at = dropIndex ?? combatants.length;
    setDropIndex(null);
    const actorId = e.dataTransfer.getData(ACTOR_MIME);
    if (actorId) {
      const actor = actors.find((a) => a.id === actorId);
      if (actor) addActor(actor, at);
      return;
    }
    const cid = e.dataTransfer.getData(COMBATANT_MIME);
    const c = combatants.find((x) => x.id === cid);
    if (!c) return;
    const from = combatants.indexOf(c);
    // Index is measured with the item still in place; shift it once the item is removed.
    setEncounter((enc) => placeCombatant(enc, c, at > from ? at - 1 : at));
  };

  const unrolled = combatants.some((c) => c.initiative === null);

  return (
    <div className="combat-layout">
      <ActorLibrary actors={actors} onChange={setActors} onAdd={(a) => addActor(a)} />

      <section className="panel order">
        <div className="order-head">
          <h2 className="panel-title">Combat Order</h2>
          <div className="round-badge" data-on={turn >= 0}>
            {turn >= 0 ? `Round ${round}` : "Not started"}
          </div>
        </div>

        <div className="toolbar">
          <button className="btn primary glow" onClick={rollAll} disabled={combatants.length === 0}>
            🎲 Roll initiative
          </button>
          <button
            className="btn"
            onClick={() => setEncounter((e) => withSortedOrder(e, sortByInitiative(e.combatants)))}
            disabled={combatants.length < 2}
            title="Sort by initiative (after editing values by hand)"
          >
            ⇅ Sort
          </button>
          <span className="spacer" />
          <button className="btn" onClick={() => setEncounter(prevTurn)} disabled={turn < 0}>
            ◀ Prev
          </button>
          <button className="btn accent" onClick={() => setEncounter(nextTurn)} disabled={combatants.length === 0}>
            {turn < 0 ? "Start combat ▶" : "Next turn ▶"}
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              if (combatants.length === 0 || confirm("End combat and clear the order?")) setEncounter(emptyEncounter);
            }}
            disabled={combatants.length === 0}
          >
            End
          </button>
        </div>

        {unrolled && combatants.length > 0 && (
          <p className="hint">Some actors have no initiative yet. Roll for everyone or type values in.</p>
        )}

        <ol
          ref={listRef}
          className={`combat-list ${dropIndex !== null ? "dragging" : ""}`}
          onDragOver={(e) => {
            if (!hasType(e, ACTOR_MIME) && !hasType(e, COMBATANT_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = hasType(e, ACTOR_MIME) ? "copy" : "move";
            if (e.target === e.currentTarget) setDropIndex(combatants.length);
          }}
          onDragLeave={(e) => {
            if (!listRef.current?.contains(e.relatedTarget as Node)) setDropIndex(null);
          }}
          onDrop={onDrop}
        >
          {combatants.length === 0 && (
            <li className="drop-empty">
              <span className="drop-icon">⚔</span>
              Drag actors here to build the combat order
            </li>
          )}
          {combatants.map((c, i) => (
            <Slot key={c.id} showLine={dropIndex === i}>
              <CombatantCard
                c={c}
                active={i === turn}
                flash={flashIds.has(c.id)}
                presets={presets}
                onChange={updateCombatant}
                onRemove={() => setEncounter((e) => removeCombatant(e, c.id))}
                onSavePreset={savePreset}
                onForgetPreset={(name) => setPresets((list) => list.filter((p) => p.name !== name))}
                onDragOver={overCard(i)}
              />
            </Slot>
          ))}
          {dropIndex === combatants.length && combatants.length > 0 && <li className="drop-line" />}
        </ol>
      </section>
    </div>
  );
}

function Slot({ showLine, children }: { showLine: boolean; children: React.ReactNode }) {
  return (
    <>
      {showLine && <li className="drop-line" />}
      {children}
    </>
  );
}

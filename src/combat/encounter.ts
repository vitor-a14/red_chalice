import { rollDie, uid } from "../lib/random";
import type { Actor, Combatant, Encounter } from "./types";
import { MAX_DYING } from "./types";

export const emptyEncounter: Encounter = { combatants: [], turn: -1, round: 0 };

export function makeCombatant(actor: Actor, existing: Combatant[]): Combatant {
  // Number duplicates so three goblins read "Goblin", "Goblin 2", "Goblin 3".
  const copies = existing.filter((c) => c.actorId === actor.id).length;
  return {
    id: uid(),
    actorId: actor.id,
    name: copies === 0 ? actor.name : `${actor.name} ${copies + 1}`,
    kind: actor.kind,
    maxHp: actor.maxHp,
    hp: actor.maxHp,
    initMod: actor.initMod,
    initiative: null,
    dying: 0,
    conditions: [],
  };
}

/** PF2 tie-break: enemies act before players on a tied initiative. */
const KIND_ORDER = { enemy: 0, ally: 1, pc: 2 } as const;

export function sortByInitiative(list: Combatant[]): Combatant[] {
  return [...list].sort((a, b) => {
    const ai = a.initiative ?? -Infinity;
    const bi = b.initiative ?? -Infinity;
    if (bi !== ai) return bi - ai;
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return b.initMod - a.initMod;
  });
}

export function rollInitiative(list: Combatant[], roll: (sides: number) => number = rollDie): Combatant[] {
  return sortByInitiative(
    list.map((c) => {
      const d = roll(20);
      return { ...c, initRoll: d, initiative: d + c.initMod };
    }),
  );
}

export function isDead(c: Combatant): boolean {
  return c.dying >= MAX_DYING;
}

/** Advances to the next living combatant, bumping the round when the order wraps. */
export function nextTurn(e: Encounter): Encounter {
  const n = e.combatants.length;
  if (n === 0) return e;
  if (e.turn < 0) return { ...e, turn: firstAlive(e.combatants, 0), round: 1 };
  let turn = e.turn;
  let round = e.round;
  for (let step = 0; step < n; step++) {
    turn += 1;
    if (turn >= n) {
      turn = 0;
      round += 1;
    }
    if (!isDead(e.combatants[turn])) break;
  }
  return { ...e, turn, round };
}

export function prevTurn(e: Encounter): Encounter {
  const n = e.combatants.length;
  if (n === 0 || e.turn < 0) return e;
  let turn = e.turn;
  let round = e.round;
  for (let step = 0; step < n; step++) {
    turn -= 1;
    if (turn < 0) {
      if (round <= 1) return { ...e, turn: e.turn, round: e.round };
      turn = n - 1;
      round -= 1;
    }
    if (!isDead(e.combatants[turn])) break;
  }
  return { ...e, turn, round };
}

function firstAlive(list: Combatant[], from: number): number {
  for (let i = from; i < list.length; i++) if (!isDead(list[i])) return i;
  return from;
}

/**
 * Moves or inserts while keeping the turn marker on the same combatant.
 * `to` is the index in the list after the item has been removed.
 */
export function placeCombatant(e: Encounter, c: Combatant, to: number): Encounter {
  const current = e.turn >= 0 ? e.combatants[e.turn]?.id : undefined;
  const rest = e.combatants.filter((x) => x.id !== c.id);
  const idx = Math.max(0, Math.min(to, rest.length));
  const combatants = [...rest.slice(0, idx), c, ...rest.slice(idx)];
  return { ...e, combatants, turn: current ? combatants.findIndex((x) => x.id === current) : e.turn };
}

export function removeCombatant(e: Encounter, id: string): Encounter {
  const current = e.turn >= 0 ? e.combatants[e.turn]?.id : undefined;
  const removedIdx = e.combatants.findIndex((x) => x.id === id);
  const combatants = e.combatants.filter((x) => x.id !== id);
  let turn = e.turn;
  if (current === id) turn = combatants.length === 0 ? -1 : Math.min(removedIdx, combatants.length - 1);
  else if (current) turn = combatants.findIndex((x) => x.id === current);
  return { ...e, combatants, turn };
}

/** Re-sorts the order by initiative, keeping the turn marker on the same combatant. */
export function withSortedOrder(e: Encounter, combatants: Combatant[]): Encounter {
  const current = e.turn >= 0 ? e.combatants[e.turn]?.id : undefined;
  return { ...e, combatants, turn: current ? combatants.findIndex((x) => x.id === current) : e.turn };
}

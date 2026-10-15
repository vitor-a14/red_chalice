import { describe, expect, it } from "vitest";
import { makeCombatant, nextTurn, placeCombatant, removeCombatant, rollInitiative } from "./encounter";
import type { Actor, Encounter } from "./types";

const goblin: Actor = { id: "g", name: "Goblin", maxHp: 6, initMod: 2, kind: "enemy" };
const hero: Actor = { id: "h", name: "Valeros", maxHp: 20, initMod: 2, kind: "pc" };

describe("encounter", () => {
  it("numbers duplicate actors", () => {
    const a = makeCombatant(goblin, []);
    const b = makeCombatant(goblin, [a]);
    expect([a.name, b.name]).toEqual(["Goblin", "Goblin 2"]);
  });

  it("rolls initiative, sorts, and lets enemies win ties", () => {
    const list = [makeCombatant(hero, []), makeCombatant(goblin, [])];
    const rolled = rollInitiative(list, () => 10);
    expect(rolled.map((c) => c.name)).toEqual(["Goblin", "Valeros"]);
    expect(rolled[0].initiative).toBe(12);
  });

  it("skips dead combatants and wraps rounds", () => {
    const a = makeCombatant(hero, []);
    const b = { ...makeCombatant(goblin, []), dying: 4 };
    const c = makeCombatant(goblin, [b]);
    let e: Encounter = { combatants: [a, b, c], turn: -1, round: 0 };
    e = nextTurn(e);
    expect([e.turn, e.round]).toEqual([0, 1]);
    e = nextTurn(e);
    expect([e.turn, e.round]).toEqual([2, 1]);
    e = nextTurn(e);
    expect([e.turn, e.round]).toEqual([0, 2]);
  });

  it("keeps the turn marker when reordering and removing", () => {
    const a = makeCombatant(hero, []);
    const b = makeCombatant(goblin, []);
    const c = makeCombatant(goblin, [b]);
    let e: Encounter = { combatants: [a, b, c], turn: 1, round: 1 };
    e = placeCombatant(e, c, 0);
    expect(e.combatants[e.turn].id).toBe(b.id);
    e = removeCombatant(e, a.id);
    expect(e.combatants[e.turn].id).toBe(b.id);
  });
});

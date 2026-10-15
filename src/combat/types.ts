export type ActorKind = "pc" | "ally" | "enemy";

/** A saved actor template in the library. */
export interface Actor {
  id: string;
  name: string;
  maxHp: number;
  initMod: number;
  kind: ActorKind;
}

export interface Condition {
  id: string;
  name: string;
  color: string;
  value?: number;
}

/** One actor placed in the combat order. The same actor can appear several times. */
export interface Combatant {
  id: string;
  actorId: string;
  name: string;
  kind: ActorKind;
  maxHp: number;
  hp: number;
  initMod: number;
  initiative: number | null;
  /** Last natural d20 rolled for initiative, for display. */
  initRoll?: number;
  dying: number;
  conditions: Condition[];
}

export interface Encounter {
  combatants: Combatant[];
  /** Index of the combatant whose turn it is, or -1 before combat starts. */
  turn: number;
  round: number;
}

export const MAX_DYING = 4;

export const KIND_LABEL: Record<ActorKind, string> = {
  pc: "Player",
  ally: "Ally",
  enemy: "Enemy",
};

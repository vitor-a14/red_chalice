import type { DragEvent } from "react";

export const ACTOR_MIME = "application/x-rc-actor";
export const COMBATANT_MIME = "application/x-rc-combatant";

export function hasType(e: DragEvent, mime: string): boolean {
  return Array.from(e.dataTransfer.types).includes(mime);
}

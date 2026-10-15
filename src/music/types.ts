export type Category = "ambience" | "music" | "combat" | "effect";

export interface Track {
  id: string;
  title: string;
  kind: "video" | "playlist";
  /** YouTube video id, or playlist id when kind is "playlist". */
  ytId: string;
  category: Category;
  /** 0–100 */
  volume: number;
  loop: boolean;
  /** Set when YouTube reports the owner blocks embedding. */
  blocked?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  tracks: Track[];
}

export type ScoreMode = "repeat" | "next" | "shuffle";

export const CATEGORIES: { id: Category; label: string; hint: string }[] = [
  { id: "ambience", label: "Ambience", hint: "Layers on top of everything else" },
  { id: "music", label: "Music", hint: "One song at a time, crossfades with Combat" },
  { id: "combat", label: "Combat", hint: "One song at a time, crossfades with Music" },
  { id: "effect", label: "Effects", hint: "Plays once over everything else" },
];

/** Music and combat share one "score" slot: starting one fades out the other. */
export function isScore(c: Category): boolean {
  return c === "music" || c === "combat";
}

export const TRACK_MIME = "application/x-rc-track";

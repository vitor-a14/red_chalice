import { rollDie } from "../lib/random";

export const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}

export interface Formula {
  dice: DiceTerm[];
  modifier: number;
}

export type RollMode = "normal" | "fortune" | "misfortune";

export interface DieResult {
  sides: number;
  value: number;
  sign: 1 | -1;
  dropped?: boolean;
}

export interface RollResult {
  id: string;
  formula: string;
  mode: RollMode;
  dice: DieResult[];
  modifier: number;
  total: number;
  /** The kept d20 when the formula has exactly one d20, used for nat 1 / nat 20. */
  natural?: number;
  dc?: number;
  degree?: Degree;
  at: number;
}

export type Degree = "critical-success" | "success" | "failure" | "critical-failure";

const TERM_RE = /\s*([+-]?)\s*(\d*)\s*d\s*(\d+)|\s*([+-]?)\s*(\d+)/giy;

/** Parses formulas like "2d6+1d4-1", "d20 + 7" or "4". Returns null if invalid. */
export function parseFormula(text: string): Formula | null {
  const src = text.trim();
  if (!src) return null;
  const dice: DiceTerm[] = [];
  let modifier = 0;
  TERM_RE.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    TERM_RE.lastIndex = pos;
    const m = TERM_RE.exec(src);
    if (!m || m.index !== pos) return null;
    // Every term after the first needs an explicit sign.
    const signText = m[1] ?? m[4];
    if (pos > 0 && !signText) return null;
    const sign: 1 | -1 = signText === "-" ? -1 : 1;
    if (m[3] !== undefined) {
      const count = m[2] === "" ? 1 : Number(m[2]);
      const sides = Number(m[3]);
      if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
      dice.push({ count, sides, sign });
    } else {
      modifier += sign * Number(m[5]);
    }
    pos = TERM_RE.lastIndex;
  }
  return { dice: mergeTerms(dice), modifier };
}

function mergeTerms(terms: DiceTerm[]): DiceTerm[] {
  const out: DiceTerm[] = [];
  for (const t of terms) {
    const same = out.find((o) => o.sides === t.sides && o.sign === t.sign);
    if (same) same.count += t.count;
    else out.push({ ...t });
  }
  return out;
}

export function formatFormula(f: Formula): string {
  const parts: string[] = [];
  f.dice.forEach((t, i) => {
    const body = `${t.count}d${t.sides}`;
    parts.push(i === 0 ? (t.sign < 0 ? `-${body}` : body) : `${t.sign < 0 ? "-" : "+"} ${body}`);
  });
  if (f.modifier !== 0 || parts.length === 0) {
    const abs = Math.abs(f.modifier);
    if (parts.length === 0) parts.push(String(f.modifier));
    else parts.push(`${f.modifier < 0 ? "-" : "+"} ${abs}`);
  }
  return parts.join(" ");
}

export function isSingleD20(f: Formula): boolean {
  return f.dice.length > 0 && f.dice.filter((t) => t.sides === 20).reduce((n, t) => n + t.count, 0) === 1;
}

export function rollFormula(
  f: Formula,
  opts: { mode?: RollMode; dc?: number; roll?: (sides: number) => number } = {},
): RollResult {
  const roll = opts.roll ?? rollDie;
  const mode = isSingleD20(f) ? (opts.mode ?? "normal") : "normal";
  const dice: DieResult[] = [];
  let natural: number | undefined;

  for (const t of f.dice) {
    for (let i = 0; i < t.count; i++) {
      const value = roll(t.sides);
      if (t.sides === 20 && mode !== "normal") {
        const second = roll(20);
        const keepFirst = mode === "fortune" ? value >= second : value <= second;
        dice.push({ sides: 20, value, sign: t.sign, dropped: !keepFirst });
        dice.push({ sides: 20, value: second, sign: t.sign, dropped: keepFirst });
        natural = keepFirst ? value : second;
      } else {
        dice.push({ sides: t.sides, value, sign: t.sign });
        if (t.sides === 20) natural = value;
      }
    }
  }

  const total = dice.reduce((s, d) => s + (d.dropped ? 0 : d.sign * d.value), 0) + f.modifier;
  if (!isSingleD20(f)) natural = undefined;

  const result: RollResult = {
    id: crypto.randomUUID(),
    formula: formatFormula(f),
    mode,
    dice,
    modifier: f.modifier,
    total,
    natural,
    at: Date.now(),
  };
  if (opts.dc !== undefined && Number.isFinite(opts.dc)) {
    result.dc = opts.dc;
    result.degree = degreeOfSuccess(total, opts.dc, natural);
  }
  return result;
}

const DEGREES: Degree[] = ["critical-failure", "failure", "success", "critical-success"];

/** Pathfinder 2e degree of success, including the natural 20 / natural 1 step. */
export function degreeOfSuccess(total: number, dc: number, natural?: number): Degree {
  let i = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
  if (natural === 20) i = Math.min(3, i + 1);
  if (natural === 1) i = Math.max(0, i - 1);
  return DEGREES[i];
}

export const DEGREE_LABEL: Record<Degree, string> = {
  "critical-success": "Critical Success",
  success: "Success",
  failure: "Failure",
  "critical-failure": "Critical Failure",
};

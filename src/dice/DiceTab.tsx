import { useEffect, useRef, useState } from "react";
import { rollDie } from "../lib/random";
import { usePersistentState } from "../lib/usePersistentState";
import {
  DEGREE_LABEL,
  DIE_SIDES,
  type DieResult,
  type Formula,
  type RollMode,
  type RollResult,
  formatFormula,
  isSingleD20,
  parseFormula,
  rollFormula,
} from "./dice";

const EMPTY: Formula = { dice: [], modifier: 0 };
const ANIM_MS = 700;

export default function DiceTab() {
  const [text, setText] = useState("1d20");
  const [mode, setMode] = useState<RollMode>("normal");
  const [dc, setDc] = useState("");
  const [history, setHistory] = usePersistentState<RollResult[]>("rc.rollHistory", []);
  const [current, setCurrent] = useState<RollResult | null>(null);
  const [shown, setShown] = useState<DieResult[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<number>(undefined);

  const parsed = parseFormula(text);
  const f = parsed ?? EMPTY;
  const canMode = isSingleD20(f);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const edit = (next: Formula) => setText(formatFormula(next));

  const addDie = (sides: number, delta = 1) => {
    const dice = f.dice.map((t) => ({ ...t }));
    const t = dice.find((x) => x.sides === sides && x.sign === 1);
    if (t) t.count += delta;
    else if (delta > 0) dice.push({ count: delta, sides, sign: 1 });
    edit({ ...f, dice: dice.filter((x) => x.count > 0) });
  };

  const countOf = (sides: number) => f.dice.filter((t) => t.sides === sides).reduce((n, t) => n + t.count, 0);

  const roll = (formula: Formula | null = parsed) => {
    if (!formula || formula.dice.length + (formula.modifier ? 1 : 0) === 0) return;
    const dcNum = dc.trim() === "" ? undefined : Number(dc);
    const result = rollFormula(formula, { mode, dc: dcNum });
    setCurrent(result);
    setRolling(true);
    window.clearInterval(timer.current);
    const start = performance.now();
    const tumble = () => setShown(result.dice.map((d) => ({ ...d, value: rollDie(d.sides) })));
    tumble();
    // Tumble random faces, then land on the real result.
    timer.current = window.setInterval(() => {
      if (performance.now() - start >= ANIM_MS) {
        window.clearInterval(timer.current);
        setShown(result.dice);
        setRolling(false);
        setHistory((h) => [result, ...h].slice(0, 40));
        return;
      }
      tumble();
    }, 60);
  };

  const quick = (sides: number) => roll({ dice: [{ count: 1, sides, sign: 1 }], modifier: 0 });

  const liveTotal = shown
    ? shown.reduce((s, d) => s + (d.dropped ? 0 : d.sign * d.value), 0) + (current?.modifier ?? 0)
    : null;

  const stats = parsed ? rangeOf(parsed) : null;

  return (
    <div className="dice-layout">
      <section className="panel tray">
        <h2 className="panel-title">Dice Tray</h2>

        <div className="die-grid">
          {DIE_SIDES.map((s) => (
            <button
              key={s}
              className={`die-btn d${s}`}
              onClick={() => addDie(s)}
              onContextMenu={(e) => {
                e.preventDefault();
                addDie(s, -1);
              }}
              title={`Add a d${s} (right-click removes one)`}
            >
              <span className="die-shape" aria-hidden />
              <span className="die-label">d{s}</span>
              {countOf(s) > 0 && <span className="die-count">{countOf(s)}</span>}
            </button>
          ))}
        </div>

        <div className="formula-row">
          <div className="mod-stepper">
            <button className="icon-btn" onClick={() => edit({ ...f, modifier: f.modifier - 1 })}>
              −
            </button>
            <span className="mod-value">
              {f.modifier >= 0 ? "+" : ""}
              {f.modifier}
            </span>
            <button className="icon-btn" onClick={() => edit({ ...f, modifier: f.modifier + 1 })}>
              +
            </button>
          </div>
          <input
            className={`field formula ${parsed || !text.trim() ? "" : "invalid"}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && roll()}
            placeholder="e.g. 2d6+4"
            aria-label="Formula"
          />
          <button className="btn ghost" onClick={() => setText("")}>
            Clear
          </button>
        </div>
        {stats && (
          <p className="formula-stats">
            Range {stats.min}–{stats.max} · average {stats.avg}
          </p>
        )}

        <div className="options-row">
          <div className={`segmented ${canMode ? "" : "disabled"}`} title="Fortune and misfortune apply to a single d20">
            {(["misfortune", "normal", "fortune"] as RollMode[]).map((m) => (
              <button
                key={m}
                className={mode === m ? "on" : ""}
                onClick={() => setMode(m)}
                disabled={!canMode}
              >
                {m === "normal" ? "Normal" : m === "fortune" ? "Fortune ▲" : "Misfortune ▼"}
              </button>
            ))}
          </div>
          <label className="dc-field">
            <span>DC</span>
            <input
              className="field"
              type="number"
              value={dc}
              onChange={(e) => setDc(e.target.value)}
              placeholder="—"
            />
          </label>
        </div>

        <button className="btn roll-btn" onClick={() => roll()} disabled={!parsed || rolling}>
          Roll {parsed ? formatFormula(parsed) : ""}
        </button>

        <div className="quick-row">
          <span className="ce-label">Quick roll</span>
          {DIE_SIDES.map((s) => (
            <button key={s} className="pill" onClick={() => quick(s)} disabled={rolling}>
              d{s}
            </button>
          ))}
        </div>
      </section>

      <section className="panel result-panel">
        {!current ? (
          <div className="result-empty">
            <span className="big-d20" aria-hidden>
              ⬢
            </span>
            Build a roll and press Roll
          </div>
        ) : (
          <div className={`result ${rolling ? "rolling" : "landed"} ${natClass(current, rolling)}`}>
            <div className="result-formula">
              {current.formula}
              {current.mode !== "normal" && <span className="mode-tag">{current.mode}</span>}
            </div>
            <div className="result-total" key={rolling ? "r" : current.id}>
              {liveTotal}
            </div>
            {!rolling && current.degree && (
              <div className={`degree ${current.degree}`}>
                {DEGREE_LABEL[current.degree]} <span className="vs">vs DC {current.dc}</span>
              </div>
            )}
            {!rolling && current.natural === 20 && <div className="nat-tag">Natural 20</div>}
            {!rolling && current.natural === 1 && <div className="nat-tag">Natural 1</div>}
            <div className="faces">
              {(shown ?? []).map((d, i) => (
                <span
                  key={i}
                  className={`face d${d.sides} ${d.dropped ? "dropped" : ""} ${d.sign < 0 ? "neg" : ""} ${
                    !rolling && d.sides === 20 && !d.dropped && d.value === 20 ? "max" : ""
                  } ${!rolling && d.sides === 20 && !d.dropped && d.value === 1 ? "min" : ""}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <small>d{d.sides}</small>
                  {d.value}
                </span>
              ))}
              {current.modifier !== 0 && (
                <span className="face mod">
                  <small>mod</small>
                  {current.modifier > 0 ? "+" : ""}
                  {current.modifier}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="history">
          <div className="history-head">
            <h3>History</h3>
            {history.length > 0 && (
              <button className="btn ghost small" onClick={() => setHistory([])}>
                Clear
              </button>
            )}
          </div>
          <ul>
            {history.map((h) => (
              <li key={h.id} className={natClass(h, false)}>
                <button className="history-item" onClick={() => setText(h.formula)} title="Use this formula">
                  <span className="h-formula">{h.formula}</span>
                  <span className="h-dice">
                    {h.dice.map((d, i) => (
                      <span key={i} className={d.dropped ? "dropped" : ""}>
                        {d.value}
                      </span>
                    ))}
                  </span>
                  {h.degree && <span className={`h-degree ${h.degree}`}>{DEGREE_LABEL[h.degree]}</span>}
                  <span className="h-total">{h.total}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function natClass(r: RollResult, rolling: boolean) {
  if (rolling) return "";
  return r.natural === 20 ? "nat20" : r.natural === 1 ? "nat1" : "";
}

function rangeOf(f: Formula) {
  let min = f.modifier;
  let max = f.modifier;
  let avg = f.modifier;
  for (const t of f.dice) {
    const lo = t.count;
    const hi = t.count * t.sides;
    if (t.sign > 0) {
      min += lo;
      max += hi;
    } else {
      min -= hi;
      max -= lo;
    }
    avg += t.sign * t.count * ((t.sides + 1) / 2);
  }
  return { min, max, avg: Math.round(avg * 10) / 10 };
}

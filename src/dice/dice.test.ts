import { describe, expect, it } from "vitest";
import { degreeOfSuccess, formatFormula, parseFormula, rollFormula } from "./dice";

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++];
};

describe("parseFormula", () => {
  it("parses dice and modifiers", () => {
    expect(parseFormula("2d6 + 1d4 - 1")).toEqual({
      dice: [
        { count: 2, sides: 6, sign: 1 },
        { count: 1, sides: 4, sign: 1 },
      ],
      modifier: -1,
    });
    expect(parseFormula("d20+7")).toEqual({ dice: [{ count: 1, sides: 20, sign: 1 }], modifier: 7 });
    expect(parseFormula("1d8+1d8")?.dice).toEqual([{ count: 2, sides: 8, sign: 1 }]);
  });

  it("rejects junk", () => {
    expect(parseFormula("")).toBeNull();
    expect(parseFormula("2d")).toBeNull();
    expect(parseFormula("d20 7")).toBeNull();
    expect(parseFormula("hello")).toBeNull();
  });

  it("round-trips through formatFormula", () => {
    expect(formatFormula(parseFormula("2d6+1d4-3")!)).toBe("2d6 + 1d4 - 3");
    expect(formatFormula(parseFormula("5")!)).toBe("5");
  });
});

describe("rollFormula", () => {
  it("sums dice and modifier", () => {
    const r = rollFormula(parseFormula("2d6+3")!, { roll: seq(4, 5) });
    expect(r.total).toBe(12);
  });

  it("keeps the higher d20 on fortune and the lower on misfortune", () => {
    const f = parseFormula("d20+5")!;
    expect(rollFormula(f, { mode: "fortune", roll: seq(3, 17) }).total).toBe(22);
    expect(rollFormula(f, { mode: "misfortune", roll: seq(3, 17) }).total).toBe(8);
  });

  it("applies degree of success against a DC", () => {
    const r = rollFormula(parseFormula("d20+10")!, { dc: 20, roll: seq(20) });
    expect(r.degree).toBe("critical-success");
  });
});

describe("degreeOfSuccess", () => {
  it("follows the PF2 rules", () => {
    expect(degreeOfSuccess(30, 20)).toBe("critical-success");
    expect(degreeOfSuccess(20, 20)).toBe("success");
    expect(degreeOfSuccess(19, 20)).toBe("failure");
    expect(degreeOfSuccess(10, 20)).toBe("critical-failure");
    expect(degreeOfSuccess(19, 20, 20)).toBe("success");
    expect(degreeOfSuccess(20, 20, 1)).toBe("failure");
  });
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isValid, validateContribution, validateGoal, type GoalInput } from "../validate";

const NOW = new Date(2026, 8, 12, 12, 0, 0);

const validGoal = (over: Partial<GoalInput> = {}): GoalInput => ({
  name: "House Deposit",
  category: "house",
  target: "50000",
  opening: "1000",
  targetDate: "2028-08-01",
  contribution: "200",
  frequency: "monthly",
  priority: "high",
  ...over,
});

describe("goal validation", () => {
  test("a well-formed goal passes", () => {
    assert.ok(isValid(validateGoal(validGoal(), NOW)));
  });

  test("rejects an empty or whitespace name", () => {
    assert.ok(validateGoal(validGoal({ name: "" }), NOW).name);
    assert.ok(validateGoal(validGoal({ name: "   " }), NOW).name);
  });

  test("rejects negative and zero targets", () => {
    assert.ok(validateGoal(validGoal({ target: "-500" }), NOW).target);
    assert.ok(validateGoal(validGoal({ target: "0" }), NOW).target);
  });

  test("rejects a negative opening balance", () => {
    assert.ok(validateGoal(validGoal({ opening: "-1" }), NOW).opening);
  });

  test("allows a zero opening balance and zero contribution", () => {
    const e = validateGoal(validGoal({ opening: "0", contribution: "0" }), NOW);
    assert.equal(e.opening, undefined);
    assert.equal(e.contribution, undefined);
  });

  test("rejects malformed amounts", () => {
    assert.ok(validateGoal(validGoal({ target: "fifty thousand" }), NOW).target);
    assert.ok(validateGoal(validGoal({ contribution: "1.2.3" }), NOW).contribution);
  });

  test("rejects dates in the past", () => {
    assert.ok(validateGoal(validGoal({ targetDate: "2020-01-01" }), NOW).targetDate);
  });

  test("rejects dates that do not exist", () => {
    assert.ok(validateGoal(validGoal({ targetDate: "2027-02-31" }), NOW).targetDate);
    assert.ok(validateGoal(validGoal({ targetDate: "2027-13-01" }), NOW).targetDate);
  });

  test("rejects malformed date strings", () => {
    assert.ok(validateGoal(validGoal({ targetDate: "01/08/2028" }), NOW).targetDate);
    assert.ok(validateGoal(validGoal({ targetDate: "" }), NOW).targetDate);
  });

  test("today is an acceptable target date", () => {
    assert.equal(validateGoal(validGoal({ targetDate: "2026-09-12" }), NOW).targetDate, undefined);
  });

  test("custom category needs a name", () => {
    assert.ok(validateGoal(validGoal({ category: "custom" }), NOW).customCategory);
    assert.ok(isValid(validateGoal(validGoal({ category: "custom", customCategory: "Boat" }), NOW)));
  });

  test("rejects unknown category, frequency and priority", () => {
    assert.ok(validateGoal(validGoal({ category: "" }), NOW).category);
    assert.ok(validateGoal(validGoal({ frequency: "" }), NOW).frequency);
    assert.ok(validateGoal(validGoal({ priority: "" }), NOW).priority);
  });

  test("emoji field takes a single glyph", () => {
    assert.equal(validateGoal(validGoal({ emoji: "🏡" }), NOW).emoji, undefined);
    assert.ok(validateGoal(validGoal({ emoji: "🏡🚗" }), NOW).emoji);
  });

  test("reports every problem at once, not just the first", () => {
    const e = validateGoal(validGoal({ name: "", target: "-1", targetDate: "nope" }), NOW);
    assert.ok(e.name && e.target && e.targetDate);
  });
});

describe("contribution validation", () => {
  test("a well-formed contribution passes", () => {
    assert.ok(isValid(validateContribution({ amount: "50", date: "2026-09-01" }, NOW)));
  });

  test("rejects a zero amount", () => {
    assert.ok(validateContribution({ amount: "0", date: "2026-09-01" }, NOW).amount);
  });

  test("allows a negative amount, for withdrawals", () => {
    assert.equal(validateContribution({ amount: "-90", date: "2026-09-01" }, NOW).amount, undefined);
  });

  test("rejects malformed amounts", () => {
    assert.ok(validateContribution({ amount: "", date: "2026-09-01" }, NOW).amount);
    assert.ok(validateContribution({ amount: "ten dollars", date: "2026-09-01" }, NOW).amount);
  });

  test("rejects future dates", () => {
    assert.ok(validateContribution({ amount: "50", date: "2026-09-13" }, NOW).date);
  });

  test("today is acceptable", () => {
    assert.equal(validateContribution({ amount: "50", date: "2026-09-12" }, NOW).date, undefined);
  });

  test("rejects impossible dates", () => {
    assert.ok(validateContribution({ amount: "50", date: "2026-02-30" }, NOW).date);
  });
});

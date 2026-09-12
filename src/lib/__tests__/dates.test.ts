import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { addMonths, parseDate, toISODate } from "../dates";

describe("date handling", () => {
  test("date-only strings survive a round trip", () => {
    for (const iso of ["2026-01-01", "2026-09-12", "2026-12-31"]) {
      assert.equal(toISODate(parseDate(iso)), iso);
    }
  });

  test("parses at local noon, so no timezone shifts the day", () => {
    assert.equal(parseDate("2026-09-12").getHours(), 12);
    assert.equal(parseDate("2026-09-12").getDate(), 12);
  });

  test("adding months clamps to the end of a shorter month", () => {
    assert.equal(toISODate(addMonths(parseDate("2026-01-31"), 1)), "2026-02-28");
    assert.equal(toISODate(addMonths(parseDate("2028-01-31"), 1)), "2028-02-29");
  });

  test("adding months rolls the year over", () => {
    assert.equal(toISODate(addMonths(parseDate("2026-11-15"), 3)), "2027-02-15");
  });
});

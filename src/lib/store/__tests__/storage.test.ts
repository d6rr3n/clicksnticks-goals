import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearDataset,
  datasetKey,
  MODE_KEY,
  quarantineKey,
  readDataset,
  readMode,
  writeDataset,
  writeMode,
  type StorageLike,
} from "../storage";
import { emptyDataset, SCHEMA_VERSION, type Dataset } from "../../schema";

/** In-memory stand-in for localStorage, with optional failure injection. */
class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  failNextWrite: Error | null = null;

  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    if (this.failNextWrite) {
      const e = this.failNextWrite;
      this.failNextWrite = null;
      throw e;
    }
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

const sample = (): Dataset => ({
  schemaVersion: SCHEMA_VERSION,
  challenges: [],
  goals: [
    {
      id: "g1", name: "House", category: "house", targetCents: 100_00,
      openingBalanceCents: 10_00, targetDate: "2030-01-01", contributionCents: 50_00,
      frequency: "monthly", priority: "high", createdAt: "2026-01-01T00:00:00.000Z",
      archivedAt: null, completedAt: null,
    },
  ],
  contributions: [
    { id: "t1", goalId: "g1", amountCents: 25_00, date: "2026-05-01", createdAt: "2026-05-01T00:00:00.000Z" },
  ],
  celebrated: [],
});

let s: FakeStorage;
beforeEach(() => {
  s = new FakeStorage();
});

describe("dataset round trip", () => {
  test("what goes in comes back out", () => {
    const data = sample();
    assert.deepEqual(writeDataset(s, "real", data), { ok: true });
    assert.deepEqual(readDataset(s, "real").data, data);
  });

  test("survives a simulated reload — storage is the only state", () => {
    writeDataset(s, "real", sample());
    const reloaded = readDataset(s, "real").data;
    assert.equal(reloaded.goals[0].name, "House");
    assert.equal(reloaded.contributions.length, 1);
  });

  test("an unwritten slot reads as an empty dataset", () => {
    assert.deepEqual(readDataset(s, "real").data, emptyDataset());
  });

  test("schema version is stamped on write", () => {
    writeDataset(s, "real", { ...sample(), schemaVersion: 0 });
    const raw = JSON.parse(s.getItem(datasetKey("real"))!);
    assert.equal(raw.schemaVersion, SCHEMA_VERSION);
  });

  test("clearing removes only that slot", () => {
    writeDataset(s, "real", sample());
    writeDataset(s, "demo", sample());
    clearDataset(s, "demo");
    assert.equal(s.getItem(datasetKey("demo")), null);
    assert.ok(s.getItem(datasetKey("real")));
  });
});

describe("corruption and recovery", () => {
  test("unparseable data is quarantined, not destroyed", () => {
    s.map.set(datasetKey("real"), "{ this is not json");
    const result = readDataset(s, "real");
    assert.equal(result.recovered, "corrupt");
    assert.deepEqual(result.data, emptyDataset());
    assert.equal(s.getItem(quarantineKey("real")), "{ this is not json");
  });

  test("valid JSON of the wrong shape is also quarantined", () => {
    s.map.set(datasetKey("real"), JSON.stringify({ goals: "not an array" }));
    assert.equal(readDataset(s, "real").recovered, "corrupt");
    assert.ok(s.getItem(quarantineKey("real")));
  });

  test("a newer schema version is refused rather than guessed at", () => {
    s.map.set(datasetKey("real"), JSON.stringify({ ...sample(), schemaVersion: 99 }));
    const result = readDataset(s, "real");
    assert.equal(result.recovered, "future-version");
    assert.deepEqual(result.data, emptyDataset());
    assert.ok(s.getItem(datasetKey("real")));
  });

  test("missing celebrated array is tolerated", () => {
    const full = sample();
    const partial = { schemaVersion: full.schemaVersion, goals: full.goals, contributions: full.contributions };
    s.map.set(datasetKey("real"), JSON.stringify(partial));
    assert.deepEqual(readDataset(s, "real").data.celebrated, []);
  });
});

describe("write failures", () => {
  test("a quota error is reported rather than thrown", () => {
    const err = new Error("The quota has been exceeded.");
    err.name = "QuotaExceededError";
    s.failNextWrite = err;
    const result = writeDataset(s, "real", sample());
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.reason, "quota");
  });

  test("other write errors report as unavailable", () => {
    s.failNextWrite = new Error("denied");
    const result = writeDataset(s, "real", sample());
    assert.equal(result.ok === false && result.reason, "unavailable");
  });

  test("a null storage never throws", () => {
    assert.deepEqual(readDataset(null, "real").data, emptyDataset());
    assert.equal(writeDataset(null, "real", sample()).ok, false);
    assert.equal(readMode(null), "unset");
  });
});

describe("mode", () => {
  test("defaults to unset and round trips", () => {
    assert.equal(readMode(s), "unset");
    writeMode(s, "demo");
    assert.equal(readMode(s), "demo");
    writeMode(s, "real");
    assert.equal(readMode(s), "real");
  });

  test("unset clears the stored mode", () => {
    writeMode(s, "demo");
    writeMode(s, "unset");
    assert.equal(s.getItem(MODE_KEY), null);
  });

  test("a junk mode value falls back to unset", () => {
    s.map.set(MODE_KEY, "wat");
    assert.equal(readMode(s), "unset");
  });
});

describe("demo and real isolation", () => {
  test("they occupy different keys", () => {
    assert.notEqual(datasetKey("demo"), datasetKey("real"));
  });

  test("writing demo leaves real untouched", () => {
    const real = sample();
    writeDataset(s, "real", real);
    writeDataset(s, "demo", { ...sample(), goals: [] });
    assert.deepEqual(readDataset(s, "real").data, real);
    assert.equal(readDataset(s, "demo").data.goals.length, 0);
  });

  test("editing demo cannot alter real", () => {
    writeDataset(s, "real", sample());
    const demo = readDataset(s, "demo").data;
    demo.goals.push({ ...sample().goals[0], id: "demo-only" });
    writeDataset(s, "demo", demo);
    assert.deepEqual(readDataset(s, "real").data.goals.map((g) => g.id), ["g1"]);
  });

  test("clearing demo leaves real intact", () => {
    writeDataset(s, "real", sample());
    writeDataset(s, "demo", sample());
    clearDataset(s, "demo");
    assert.equal(readDataset(s, "real").data.goals.length, 1);
    assert.equal(readDataset(s, "demo").data.goals.length, 0);
  });
});

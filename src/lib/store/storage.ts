import { SCHEMA_VERSION, emptyDataset, type Dataset, type DatasetMode } from "../schema";

/**
 * Local-first persistence. The dataset is a single versioned envelope per mode,
 * written whole so a partial write can never leave goals and contributions out
 * of step. Storage is injectable so the behaviour is testable without a browser.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const MODE_KEY = "cnt.goals.mode";
export const datasetKey = (mode: "demo" | "real") => `cnt.goals.v${SCHEMA_VERSION}.${mode}`;
export const quarantineKey = (mode: "demo" | "real") => `${datasetKey(mode)}.corrupt`;

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable"; error: unknown };

/** The browser's localStorage, or null during SSR or when access is blocked. */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    // Safari in private mode throws only on write, so probe with one.
    const probe = "cnt.probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readMode(storage: StorageLike | null): DatasetMode {
  if (!storage) return "unset";
  const raw = storage.getItem(MODE_KEY);
  return raw === "demo" || raw === "real" ? raw : "unset";
}

export function writeMode(storage: StorageLike | null, mode: DatasetMode): void {
  if (!storage) return;
  try {
    if (mode === "unset") storage.removeItem(MODE_KEY);
    else storage.setItem(MODE_KEY, mode);
  } catch {
    // A failed mode write is recoverable — the user is asked again next visit.
  }
}

/** Shape check. Anything that isn't a usable dataset is treated as corrupt. */
function parseDataset(raw: string): Dataset | null {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed as Partial<Dataset>;
  if (!Array.isArray(d.goals) || !Array.isArray(d.contributions)) return null;
  return {
    schemaVersion: typeof d.schemaVersion === "number" ? d.schemaVersion : SCHEMA_VERSION,
    goals: d.goals,
    contributions: d.contributions,
    celebrated: Array.isArray(d.celebrated) ? d.celebrated : [],
  };
}

/** Future schema versions are upgraded here. v1 is the first, so it passes through. */
function migrate(data: Dataset): Dataset {
  if (data.schemaVersion === SCHEMA_VERSION) return data;
  // Unknown future version written by a newer build — do not guess at it.
  if (data.schemaVersion > SCHEMA_VERSION) return data;
  return { ...data, schemaVersion: SCHEMA_VERSION };
}

export interface ReadResult {
  data: Dataset;
  /** Set when the stored value could not be used and was quarantined. */
  recovered?: "corrupt" | "future-version";
}

/**
 * Reads a dataset. Unreadable data is moved aside rather than deleted, so a
 * user's records are never silently destroyed by a parse failure.
 */
export function readDataset(
  storage: StorageLike | null,
  mode: "demo" | "real",
): ReadResult {
  if (!storage) return { data: emptyDataset() };

  let raw: string | null = null;
  try {
    raw = storage.getItem(datasetKey(mode));
  } catch {
    return { data: emptyDataset() };
  }
  if (raw === null) return { data: emptyDataset() };

  let parsed: Dataset | null = null;
  try {
    parsed = parseDataset(raw);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    try {
      storage.setItem(quarantineKey(mode), raw);
      storage.removeItem(datasetKey(mode));
    } catch {
      // Quarantine is best effort; starting empty still beats crashing.
    }
    return { data: emptyDataset(), recovered: "corrupt" };
  }

  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return { data: emptyDataset(), recovered: "future-version" };
  }

  return { data: migrate(parsed) };
}

export function writeDataset(
  storage: StorageLike | null,
  mode: "demo" | "real",
  data: Dataset,
): WriteResult {
  if (!storage) return { ok: false, reason: "unavailable", error: null };
  try {
    storage.setItem(datasetKey(mode), JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }));
    return { ok: true };
  } catch (error) {
    const quota =
      error instanceof Error &&
      /quota|exceeded|storage is full/i.test(`${error.name} ${error.message}`);
    return { ok: false, reason: quota ? "quota" : "unavailable", error };
  }
}

export function clearDataset(storage: StorageLike | null, mode: "demo" | "real"): void {
  if (!storage) return;
  try {
    storage.removeItem(datasetKey(mode));
  } catch {
    // Nothing useful to do; the caller resets in-memory state regardless.
  }
}

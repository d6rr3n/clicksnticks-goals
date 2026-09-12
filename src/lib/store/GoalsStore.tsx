"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { buildDemoDataset } from "../demo";
import { deleteImage } from "./images";
import { emptyDataset, type Dataset, type DatasetMode, type Goal } from "../schema";
import type { ChallengeSpec } from "../challenges";
import * as m from "./mutations";
import * as ch from "./challenges";
import {
  browserStorage,
  clearDataset,
  datasetKey,
  MODE_KEY,
  readDataset,
  readMode,
  writeDataset,
  writeMode,
  type StorageLike,
} from "./storage";

/**
 * Single source of truth for goals and contributions.
 *
 * The mode ("demo" or "real") selects exactly one storage slot. Every read and
 * write goes through it and there is no code path that reads one slot and
 * writes the other, so demo data cannot reach a user's real records.
 */

interface StoreState {
  mode: DatasetMode;
  data: Dataset;
  /** False until the first read from storage has happened. */
  hydrated: boolean;
  /** Set when storage could not be written — surfaced to the user. */
  writeError: "quota" | "unavailable" | null;
  /** Set when stored data was unreadable and had to be set aside. */
  recovered: "corrupt" | "future-version" | null;
}

const SERVER_STATE: StoreState = {
  mode: "unset",
  data: emptyDataset(),
  hydrated: false,
  writeError: null,
  recovered: null,
};

let state: StoreState = SERVER_STATE;
let storage: StorageLike | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function setState(next: Partial<StoreState>) {
  state = { ...state, ...next };
  emit();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;
/** SSR and the first client render must agree, so both start un-hydrated. */
const getServerSnapshot = () => SERVER_STATE;

/** Reads storage once, on the client. */
function hydrate() {
  if (state.hydrated) return;
  storage = browserStorage();
  const mode = readMode(storage);

  if (mode === "unset") {
    setState({ mode, hydrated: true });
    return;
  }

  const { data, recovered } = readDataset(storage, mode);
  setState({ mode, data, hydrated: true, recovered: recovered ?? null });
}

function persist(data: Dataset, mode: DatasetMode) {
  if (mode === "unset") return;
  const result = writeDataset(storage, mode, data);
  setState({ writeError: result.ok ? null : result.reason });
}

/** Applies a pure mutation, then writes the result to the active slot. */
function commit(fn: (data: Dataset) => Dataset) {
  if (state.mode === "unset") return;
  const next = fn(state.data);
  if (next === state.data) return;
  setState({ data: next });
  persist(next, state.mode);
}

function chooseMode(mode: "demo" | "real") {
  storage ??= browserStorage();
  const data = mode === "demo" ? buildDemoDataset() : emptyDataset();
  // A fresh seed each time demo is entered; real always starts from storage.
  const existing = readDataset(storage, mode);
  const chosen = mode === "real" ? existing.data : data;
  setState({ mode, data: chosen, recovered: existing.recovered ?? null });
  writeMode(storage, mode);
  persist(chosen, mode);
}

function resetDemo() {
  if (state.mode !== "demo") return;
  const fresh = buildDemoDataset();
  setState({ data: fresh });
  persist(fresh, "demo");
}

/** Leaves demo for a real, empty dataset. Demo data is never carried across. */
function startFresh() {
  storage ??= browserStorage();
  const existing = readDataset(storage, "real");
  setState({ mode: "real", data: existing.data, recovered: existing.recovered ?? null });
  writeMode(storage, "real");
  if (existing.data.goals.length === 0) persist(existing.data, "real");
}

function discardDemo() {
  clearDataset(storage, "demo");
  if (state.mode === "demo") setState({ data: emptyDataset() });
}

const GoalsContext = createContext<ReturnType<typeof useGoalsInternal> | null>(null);

function useGoalsInternal() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrate();
  }, []);

  // Another tab changed the data — adopt it rather than overwrite it.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === MODE_KEY) {
        hydrate();
        return;
      }
      if (state.mode !== "unset" && event.key === datasetKey(state.mode)) {
        const { data } = readDataset(storage, state.mode);
        setState({ data });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const actions = useMemo(
    () => ({
      chooseMode,
      resetDemo,
      startFresh,
      discardDemo,
      addGoal: (goal: Goal) => commit((d) => m.addGoal(d, goal)),
      updateGoal: (id: string, patch: Partial<Goal>) =>
        commit((d) => m.updateGoal(d, id, patch)),
      archiveGoal: (id: string) => commit((d) => m.archiveGoal(d, id)),
      restoreGoal: (id: string) => commit((d) => m.restoreGoal(d, id)),
      deleteGoal: (id: string) => {
        // Drop the image too, so deleting a goal doesn't orphan a blob.
        const imageId = state.data.goals.find((g) => g.id === id)?.imageId;
        if (imageId) void deleteImage(imageId).catch(() => {});
        commit((d) => m.deleteGoal(d, id));
      },
      addContribution: (input: {
        goalId: string;
        amountCents: number;
        date: string;
        note?: string;
      }) => commit((d) => m.addContribution(d, input)),
      /**
       * All of them or none. The whole batch is one commit and one write, so a
       * plan can never be half-applied.
       */
      addContributions: (
        inputs: Array<{
          goalId: string;
          amountCents: number;
          date: string;
          note?: string;
        }>,
      ) => commit((d) => m.addContributions(d, inputs)),
      updateContribution: (
        id: string,
        patch: { amountCents?: number; date?: string; note?: string },
      ) => commit((d) => m.updateContribution(d, id, patch)),
      deleteContribution: (id: string) => commit((d) => m.deleteContribution(d, id)),
      markCelebrated: (goalId: string) => commit((d) => m.markCelebrated(d, goalId)),
      addChallenge: (input: ch.NewChallengeInput) =>
        commit((d) => ch.addChallenge(d, input)),
      updateChallenge: (
        id: string,
        patch: { name?: string; startDate?: string; spec?: ChallengeSpec },
      ) => commit((d) => ch.updateChallenge(d, id, patch)),
      archiveChallenge: (id: string) => commit((d) => ch.archiveChallenge(d, id)),
      restoreChallenge: (id: string) => commit((d) => ch.restoreChallenge(d, id)),
      /** Removes the challenge and the contributions it recorded. Confirmed first. */
      deleteChallenge: (id: string) => commit((d) => ch.deleteChallenge(d, id)),
      /**
       * Both step actions are safe to call repeatedly: the transitions return
       * the dataset untouched when there is nothing to do, and `commit` then
       * skips the write entirely.
       */
      completeStep: (challengeId: string, step: number) =>
        commit((d) => ch.completeStep(d, challengeId, step)),
      uncompleteStep: (challengeId: string, step: number) =>
        commit((d) => ch.uncompleteStep(d, challengeId, step)),
    }),
    [],
  );

  return { ...snapshot, ...actions };
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const value = useGoalsInternal();
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used inside GoalsProvider");
  return ctx;
}

/**
 * "Now" as a stable value. Rendered dates would otherwise differ between the
 * server and the client and trip hydration.
 */
export function useNow(): Date {
  const [now, setNow] = useState<Date | null>(null);
  const ref = useRef<Date | null>(null);
  useEffect(() => {
    ref.current ??= new Date();
    setNow(ref.current);
  }, []);
  return now ?? new Date(0);
}

export { pendingCelebrations } from "./mutations";

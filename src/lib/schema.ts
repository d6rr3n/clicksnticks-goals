/** Persisted shapes. Money is always integer cents — never floats. */

export const CATEGORIES = [
  "house",
  "travel",
  "car",
  "wedding",
  "baby",
  "emergency",
  "education",
  "business",
  "christmas",
  "custom",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  house: "House",
  travel: "Travel",
  car: "Car",
  wedding: "Wedding",
  baby: "Baby",
  emergency: "Emergency Fund",
  education: "Education",
  business: "Business",
  christmas: "Christmas",
  custom: "Custom",
};

export const FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

/** Payments per month. 52 and 26 per year, not 4 and 2 per month. */
export const PER_MONTH: Record<Frequency, number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
};

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const CHALLENGE_TYPES = [
  "52-week",
  "reverse-52",
  "custom-weekly",
  "goal-sprint",
] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const CHALLENGE_TYPE_LABEL: Record<ChallengeType, string> = {
  "52-week": "52 Week Challenge",
  "reverse-52": "Reverse 52 Week Challenge",
  "custom-weekly": "Custom Weekly Challenge",
  "goal-sprint": "Goal Sprint",
};

/** Steps land a week apart, or a day apart for a sprint. */
export type ChallengeCadence = "weekly" | "daily";

export type GoalStatus = "on-track" | "behind" | "complete";

export interface Goal {
  id: string;
  name: string;
  category: Category;
  /** Only meaningful when category is "custom". */
  customCategory?: string;
  targetCents: number;
  /** Already saved when tracking began. The ledger adds to this. */
  openingBalanceCents: number;
  /** YYYY-MM-DD */
  targetDate: string;
  contributionCents: number;
  frequency: Frequency;
  priority: Priority;
  emoji?: string;
  notes?: string;
  /** Key into the IndexedDB image store. */
  imageId?: string;
  /**
   * Legacy gradient from before goal artwork existed. Read by nothing —
   * artwork is derived from the category. Kept so older saved data still
   * parses rather than being rejected.
   */
  thumb?: string;
  /** ISO timestamp. */
  createdAt: string;
  archivedAt?: string | null;
  /** When the goal first reached 100%. Cleared if it drops back below. */
  completedAt?: string | null;
}

/**
 * A challenge is a PLAN, never a balance.
 *
 * `stepCents` is the schedule the customer signed up to, in the same sense as
 * a goal's target and contribution: it predicts, it never records. How much
 * has actually been saved, and which steps are ticked, are both derived from
 * the contribution ledger — so there is no second set of books to drift.
 */
export interface Challenge {
  id: string;
  /** The goal every step contributes to. */
  goalId: string;
  type: ChallengeType;
  name: string;
  /** The frozen schedule, integer cents. stepCents[0] is step 1. */
  stepCents: number[];
  cadence: ChallengeCadence;
  /** YYYY-MM-DD. Step n falls due startDate + n periods. */
  startDate: string;
  createdAt: string;
  archivedAt?: string | null;
}

/**
 * Links a contribution back to the challenge step that recorded it. This is
 * the only thing used to find, count or reverse a challenge contribution —
 * never the amount, date or note, which a customer may legitimately share
 * with an unrelated row.
 */
export interface ContributionSource {
  challengeId: string;
  /** 0-based index into the challenge's stepCents. */
  step: number;
}

export interface Contribution {
  /** Transaction ID. */
  id: string;
  goalId: string;
  /** Negative for a withdrawal. */
  amountCents: number;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  /** Set when a challenge step created this row. */
  source?: ContributionSource;
  createdAt: string;
}

export type DatasetMode = "unset" | "demo" | "real";

export const SCHEMA_VERSION = 1;

export interface Dataset {
  schemaVersion: number;
  goals: Goal[];
  contributions: Contribution[];
  challenges: Challenge[];
  /** Goals whose completion celebration has already been shown. */
  celebrated: string[];
}

export const emptyDataset = (): Dataset => ({
  schemaVersion: SCHEMA_VERSION,
  goals: [],
  contributions: [],
  challenges: [],
  celebrated: [],
});

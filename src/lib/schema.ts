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

export interface Contribution {
  /** Transaction ID. */
  id: string;
  goalId: string;
  /** Negative for a withdrawal. */
  amountCents: number;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  createdAt: string;
}

export type DatasetMode = "unset" | "demo" | "real";

export const SCHEMA_VERSION = 1;

export interface Dataset {
  schemaVersion: number;
  goals: Goal[];
  contributions: Contribution[];
  /** Goals whose completion celebration has already been shown. */
  celebrated: string[];
}

export const emptyDataset = (): Dataset => ({
  schemaVersion: SCHEMA_VERSION,
  goals: [],
  contributions: [],
  celebrated: [],
});

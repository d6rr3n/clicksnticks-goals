export type GoalStatus = "on-track" | "behind" | "complete";

export type GoalId = string;

/** A saving goal. `saved` and `target` are whole dollars. */
export interface Goal {
  id: GoalId;
  name: string;
  /** Why it matters — shown on the goal detail page. */
  blurb: string;
  saved: number;
  target: number;
  /** ISO date the goal was opened. Used to judge pace. */
  startDate: string;
  /** ISO date the goal is due. */
  targetDate: string;
  /** Tailwind classes for the card's image stand-in. */
  thumb: string;
}

export interface Contribution {
  id: string;
  goalId: GoalId | "general";
  /** Positive for a deposit, negative for a withdrawal. */
  amount: number;
  date: string;
}

export interface Challenge {
  id: string;
  name: string;
  tagline: string;
  week: number;
  totalWeeks: number;
  saved: number;
  target: number;
}

export interface ForecastPoint {
  year: number;
  value: number;
}

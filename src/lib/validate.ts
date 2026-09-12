import { CATEGORIES, FREQUENCIES, PRIORITIES, type Category, type Frequency, type Priority } from "./schema";
import { parseAmount } from "./money";
import { parseDate, toISODate } from "./dates";

/** Field name to message. Empty object means valid. */
export type Errors<T extends string> = Partial<Record<T, string>>;

export type GoalField =
  | "name"
  | "category"
  | "customCategory"
  | "target"
  | "opening"
  | "targetDate"
  | "contribution"
  | "frequency"
  | "priority"
  | "emoji"
  | "notes";

export interface GoalInput {
  name: string;
  category: Category | "";
  customCategory?: string;
  target: string;
  opening: string;
  targetDate: string;
  contribution: string;
  frequency: Frequency | "";
  priority: Priority | "";
  emoji?: string;
  notes?: string;
}

const MAX_MONEY_CENTS = 1_000_000_000_00; // $1bn — a typo guard, not a limit
const NAME_MAX = 60;
const NOTES_MAX = 500;

/** Emoji field holds one glyph, which may be several code points. */
const graphemeCount = (s: string): number => [...s].length;

export function validateGoal(input: GoalInput, now: Date = new Date()): Errors<GoalField> {
  const e: Errors<GoalField> = {};

  const name = input.name.trim();
  if (name === "") e.name = "Give your goal a name.";
  else if (name.length > NAME_MAX) e.name = `Keep the name under ${NAME_MAX} characters.`;

  if (!input.category) e.category = "Choose a category.";
  else if (!CATEGORIES.includes(input.category)) e.category = "Choose a category.";
  else if (input.category === "custom" && !(input.customCategory ?? "").trim())
    e.customCategory = "Name your custom category.";

  const target = parseAmount(input.target);
  if (target === null) e.target = "Enter a target amount.";
  else if (target <= 0) e.target = "Target must be more than $0.";
  else if (target > MAX_MONEY_CENTS) e.target = "That target looks like a typo.";

  const opening = parseAmount(input.opening === "" ? "0" : input.opening);
  if (opening === null) e.opening = "Enter an amount, or leave it at 0.";
  else if (opening < 0) e.opening = "Saved amount cannot be negative.";
  else if (opening > MAX_MONEY_CENTS) e.opening = "That amount looks like a typo.";

  if (!input.targetDate) {
    e.targetDate = "Choose a target date.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) {
    e.targetDate = "Enter the date as YYYY-MM-DD.";
  } else {
    const d = parseDate(input.targetDate);
    if (Number.isNaN(d.getTime())) {
      e.targetDate = "That date isn't valid.";
    } else if (toISODate(d) !== input.targetDate) {
      // Catches 2026-02-31 and similar, which Date silently rolls forward.
      e.targetDate = "That date doesn't exist.";
    } else if (d.getTime() < parseDate(toISODate(now)).getTime()) {
      e.targetDate = "Choose a date in the future.";
    } else if (d.getFullYear() > now.getFullYear() + 100) {
      e.targetDate = "That date is too far away.";
    }
  }

  const contribution = parseAmount(input.contribution === "" ? "0" : input.contribution);
  if (contribution === null) e.contribution = "Enter a contribution amount.";
  else if (contribution < 0) e.contribution = "Contribution cannot be negative.";
  else if (contribution > MAX_MONEY_CENTS) e.contribution = "That amount looks like a typo.";

  if (!input.frequency || !FREQUENCIES.includes(input.frequency))
    e.frequency = "Choose how often you'll contribute.";

  if (!input.priority || !PRIORITIES.includes(input.priority))
    e.priority = "Choose a priority.";

  if (input.emoji && graphemeCount(input.emoji) > 1)
    e.emoji = "Pick a single emoji.";

  if (input.notes && input.notes.length > NOTES_MAX)
    e.notes = `Keep notes under ${NOTES_MAX} characters.`;

  return e;
}

export type ContributionField = "amount" | "date";

export interface ContributionInput {
  amount: string;
  date: string;
}

export function validateContribution(
  input: ContributionInput,
  now: Date = new Date(),
): Errors<ContributionField> {
  const e: Errors<ContributionField> = {};

  const amount = parseAmount(input.amount);
  if (amount === null) e.amount = "Enter an amount.";
  else if (amount === 0) e.amount = "Enter an amount other than $0.";
  else if (Math.abs(amount) > MAX_MONEY_CENTS) e.amount = "That amount looks like a typo.";

  if (!input.date) {
    e.date = "Choose a date.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    e.date = "Enter the date as YYYY-MM-DD.";
  } else {
    const d = parseDate(input.date);
    if (Number.isNaN(d.getTime()) || toISODate(d) !== input.date) {
      e.date = "That date isn't valid.";
    } else if (d.getTime() > parseDate(toISODate(now)).getTime()) {
      e.date = "Contributions can't be dated in the future.";
    }
  }

  return e;
}

export const isValid = <T extends string>(errors: Errors<T>): boolean =>
  Object.keys(errors).length === 0;

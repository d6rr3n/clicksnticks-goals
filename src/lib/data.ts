import type { Challenge, Contribution, ForecastPoint, Goal } from "./types";

/**
 * Fixture data standing in for a real store. Shapes are the contract the UI
 * builds against, so swapping in a database later touches only this file.
 */

export const goals: Goal[] = [
  {
    id: "house-deposit",
    name: "House Deposit",
    blurb: "A place of our own, and a garden big enough for the good stuff.",
    saved: 31_450,
    target: 50_000,
    startDate: "2024-01-15",
    targetDate: "2028-08-01",
    thumb: "from-[#B9C4BB] via-[#7E8F82] to-[#4F6157]",
  },
  {
    id: "japan-trip",
    name: "Japan Trip",
    blurb: "Three weeks, cherry blossom season, no itinerary past the first day.",
    saved: 5_420,
    target: 7_000,
    startDate: "2025-04-01",
    targetDate: "2027-04-01",
    thumb: "from-[#CBD6CE] via-[#8FA69A] to-[#3F5A52]",
  },
  {
    id: "new-car",
    name: "New Car",
    blurb: "Something that starts every morning without being asked twice.",
    saved: 8_100,
    target: 25_000,
    startDate: "2025-09-01",
    targetDate: "2028-01-01",
    thumb: "from-[#E0C3A6] via-[#B58A62] to-[#7C5A3E]",
  },
  {
    id: "emergency-fund",
    name: "Emergency Fund",
    blurb: "Three months of breathing room. Done, and staying done.",
    saved: 10_000,
    target: 10_000,
    startDate: "2024-06-01",
    targetDate: "2026-06-01",
    thumb: "from-[#D9DCD2] via-[#A2AC9E] to-[#5E6B60]",
  },
];

export const getGoal = (id: string): Goal | undefined =>
  goals.find((g) => g.id === id);

const ledger: Contribution[] = [
  { id: "c1", goalId: "house-deposit", amount: 200, date: "2026-09-10" },
  { id: "c2", goalId: "japan-trip", amount: 50, date: "2026-09-08" },
  { id: "c3", goalId: "emergency-fund", amount: 150, date: "2026-09-05" },
  { id: "c4", goalId: "general", amount: -90, date: "2026-09-03" },
  { id: "c5", goalId: "house-deposit", amount: 200, date: "2026-08-27" },
  { id: "c6", goalId: "new-car", amount: 120, date: "2026-08-24" },
  { id: "c7", goalId: "japan-trip", amount: 50, date: "2026-08-18" },
  { id: "c8", goalId: "house-deposit", amount: 200, date: "2026-08-13" },
  { id: "c9", goalId: "new-car", amount: 120, date: "2026-07-24" },
  { id: "c10", goalId: "japan-trip", amount: 120, date: "2026-07-20" },
  { id: "c11", goalId: "emergency-fund", amount: 150, date: "2026-07-06" },
  { id: "c12", goalId: "house-deposit", amount: 450, date: "2026-07-02" },
  { id: "c13", goalId: "new-car", amount: -300, date: "2026-06-29" },
  { id: "c14", goalId: "japan-trip", amount: 50, date: "2026-06-18" },
  { id: "c15", goalId: "new-car", amount: 120, date: "2026-06-24" },
  { id: "c16", goalId: "house-deposit", amount: 200, date: "2026-06-11" },
  { id: "c17", goalId: "emergency-fund", amount: 300, date: "2026-06-01" },
  { id: "c18", goalId: "new-car", amount: 120, date: "2026-05-24" },
  { id: "c19", goalId: "japan-trip", amount: 200, date: "2026-05-15" },
  { id: "c20", goalId: "house-deposit", amount: 200, date: "2026-05-08" },
];

/** Newest first — every view reads the ledger in the same order. */
export const contributions: Contribution[] = [...ledger].sort(
  (a, b) => Date.parse(b.date) - Date.parse(a.date),
);

export const contributionsFor = (goalId: string): Contribution[] =>
  contributions.filter((c) => c.goalId === goalId);

export const challenge: Challenge = {
  id: "52-week",
  name: "52 Week Challenge",
  tagline: "Make saving fun.",
  week: 36,
  totalWeeks: 52,
  saved: 666,
  target: 1_378,
};

/** Starts at today's real total so the chart agrees with the summary tile. */
export const forecast: ForecastPoint[] = [
  { year: 2026, value: 54_970 },
  { year: 2027, value: 64_000 },
  { year: 2028, value: 73_000 },
  { year: 2029, value: 83_000 },
  { year: 2030, value: 93_000 },
];

export const savedThisMonth = 1_420;

export const motivation = {
  quote: "A year from now, you'll wish you started today.",
  attrib: "Same you. Bigger possibilities.",
};

export const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
export const projectedValue = forecast[forecast.length - 1].value;

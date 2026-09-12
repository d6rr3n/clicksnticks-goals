import { addMonths, toISODate } from "./dates";
import type { Contribution, Dataset, Goal } from "./schema";
import { SCHEMA_VERSION } from "./schema";

/**
 * The demo dataset behind "Explore demo". Seeded fresh on entry and written
 * only to the demo slot, so it can never reach a user's real records.
 *
 * Dates are generated relative to today so the demo stays plausible over time
 * rather than ageing into the past.
 */

const back = (now: Date, days: number): string =>
  toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 12));

const forward = (now: Date, months: number): string => toISODate(addMonths(now, months));

interface Seed {
  goal: Omit<Goal, "openingBalanceCents" | "createdAt"> & { balanceCents: number; openedMonthsAgo: number };
  ledger: Array<{ amountCents: number; daysAgo: number; note?: string }>;
}

function seeds(now: Date): Seed[] {
  return [
    {
      goal: {
        id: "demo-house-deposit",
        name: "House Deposit",
        category: "house",
        emoji: "🏡",
        notes: "A place of our own, and a garden big enough for the good stuff.",
        targetCents: 50_000_00,
        balanceCents: 31_450_00,
        targetDate: forward(now, 23),
        contributionCents: 200_00,
        frequency: "weekly",
        priority: "high",
        openedMonthsAgo: 32,
      },
      ledger: [
        { amountCents: 200_00, daysAgo: 2 },
        { amountCents: 200_00, daysAgo: 16 },
        { amountCents: 200_00, daysAgo: 30 },
        { amountCents: 450_00, daysAgo: 72, note: "Tax refund" },
        { amountCents: 200_00, daysAgo: 93 },
        { amountCents: 200_00, daysAgo: 127 },
      ],
    },
    {
      goal: {
        id: "demo-japan-trip",
        name: "Japan Trip",
        category: "travel",
        emoji: "🌸",
        notes: "Three weeks, cherry blossom season, no itinerary past the first day.",
        targetCents: 7_000_00,
        balanceCents: 5_420_00,
        targetDate: forward(now, 7),
        contributionCents: 60_00,
        frequency: "weekly",
        priority: "medium",
        openedMonthsAgo: 17,
      },
      ledger: [
        { amountCents: 50_00, daysAgo: 4 },
        { amountCents: 50_00, daysAgo: 25 },
        { amountCents: 120_00, daysAgo: 54 },
        { amountCents: 50_00, daysAgo: 86 },
        { amountCents: 200_00, daysAgo: 120, note: "Sold the old bike" },
      ],
    },
    {
      goal: {
        id: "demo-new-car",
        name: "New Car",
        category: "car",
        emoji: "🚙",
        notes: "Something that starts every morning without being asked twice.",
        targetCents: 25_000_00,
        balanceCents: 8_100_00,
        targetDate: forward(now, 16),
        contributionCents: 120_00,
        frequency: "monthly",
        priority: "low",
        openedMonthsAgo: 12,
      },
      ledger: [
        { amountCents: -90_00, daysAgo: 9, note: "Rego came early" },
        { amountCents: 120_00, daysAgo: 19 },
        { amountCents: 120_00, daysAgo: 50 },
        { amountCents: 120_00, daysAgo: 80 },
        { amountCents: 120_00, daysAgo: 111 },
      ],
    },
    {
      goal: {
        id: "demo-emergency-fund",
        name: "Emergency Fund",
        category: "emergency",
        emoji: "🌿",
        notes: "Three months of breathing room. Done, and staying done.",
        targetCents: 10_000_00,
        balanceCents: 10_000_00,
        targetDate: forward(now, 1),
        contributionCents: 150_00,
        frequency: "monthly",
        priority: "high",
        openedMonthsAgo: 27,
      },
      ledger: [
        { amountCents: 150_00, daysAgo: 7 },
        { amountCents: 150_00, daysAgo: 68 },
        { amountCents: 300_00, daysAgo: 103, note: "Bonus" },
      ],
    },
  ];
}

/** A fresh demo dataset. Never shared by reference with the caller. */
export function buildDemoDataset(now: Date = new Date()): Dataset {
  const goals: Goal[] = [];
  const contributions: Contribution[] = [];

  for (const { goal, ledger } of seeds(now)) {
    const { balanceCents, openedMonthsAgo, ...rest } = goal;
    const ledgerTotal = ledger.reduce((sum, l) => sum + l.amountCents, 0);

    goals.push({
      ...rest,
      // Chosen so the visible balance matches the approved dashboard exactly.
      openingBalanceCents: balanceCents - ledgerTotal,
      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - openedMonthsAgo,
        1,
        12,
      ).toISOString(),
      archivedAt: null,
      completedAt: balanceCents >= rest.targetCents ? new Date(now).toISOString() : null,
    });

    ledger.forEach((l, i) => {
      const date = back(now, l.daysAgo);
      contributions.push({
        id: `${goal.id}-txn-${i + 1}`,
        goalId: goal.id,
        amountCents: l.amountCents,
        date,
        note: l.note,
        createdAt: `${date}T12:00:00.000Z`,
      });
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    goals,
    contributions,
    challenges: [],
    // The demo's finished goal opens already celebrated, so the first view
    // matches the approved dashboard rather than a congratulations banner.
    celebrated: goals.filter((g) => g.completedAt).map((g) => g.id),
  };
}

export const DEMO_GOAL_IDS = [
  "demo-house-deposit",
  "demo-japan-trip",
  "demo-new-car",
  "demo-emergency-fund",
] as const;

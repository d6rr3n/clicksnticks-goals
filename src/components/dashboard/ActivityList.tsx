"use client";

import Link from "next/link";
import type { Contribution, Goal } from "@/lib/schema";
import { byDateDesc } from "@/lib/calc";
import { signedMoney } from "@/lib/money";
import { dayMonth } from "@/lib/dates";
import { MinusIcon, PlusIcon } from "../icons";

export function ActivityList({
  goals,
  contributions,
  limit = 4,
}: {
  goals: Goal[];
  contributions: Contribution[];
  limit?: number;
}) {
  // Archived goals are excluded from every total, so their ledger stays out of
  // the feed too — otherwise activity and totals tell different stories.
  const live = goals.filter((g) => !g.archivedAt);
  const names = new Map(live.map((g) => [g.id, g.name]));
  const rows = byDateDesc(contributions.filter((c) => names.has(c.goalId))).slice(0, limit);

  if (rows.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed text-muted">
        Nothing logged yet. Add a contribution and it will show up here.
      </p>
    );
  }

  return (
    <ul className="flex list-none flex-col p-0">
      {rows.map((c) => {
        const deposit = c.amountCents > 0;
        return (
          <li
            key={c.id}
            className="flex items-center gap-3 border-b border-border py-2.5 last:border-0 last:pb-0"
          >
            <span
              className={`grid h-[29px] w-[29px] shrink-0 place-items-center rounded-full ${
                deposit ? "bg-tint-soft" : "bg-warm"
              }`}
            >
              {deposit ? (
                <PlusIcon className="h-3.5 w-3.5 text-primary" />
              ) : (
                <MinusIcon className="h-3.5 w-3.5 text-warning" />
              )}
            </span>
            <span
              className={`tabular min-w-[52px] text-[13.5px] font-medium ${
                deposit ? "" : "text-warning"
              }`}
            >
              {signedMoney(c.amountCents)}
            </span>
            <Link
              href={`/goals/${c.goalId}`}
              className="inline-flex min-h-[24px] flex-1 items-center truncate text-[12.5px] text-muted no-underline hover:text-primary hover:underline"
            >
              {names.get(c.goalId) ?? "Removed goal"}
            </Link>
            <span className="tabular shrink-0 text-[11.5px] text-muted">{dayMonth(c.date)}</span>
          </li>
        );
      })}
    </ul>
  );
}

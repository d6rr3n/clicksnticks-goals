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
  const names = new Map(goals.map((g) => [g.id, g.name]));
  const rows = byDateDesc(contributions).slice(0, limit);

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
            className="flex items-center gap-3 border-b border-line py-2.5 last:border-0 last:pb-0"
          >
            <span
              className={`grid h-[29px] w-[29px] shrink-0 place-items-center rounded-full ${
                deposit ? "bg-sage-light" : "bg-blush"
              }`}
            >
              {deposit ? (
                <PlusIcon className="h-3.5 w-3.5 text-forest" />
              ) : (
                <MinusIcon className="h-3.5 w-3.5 text-terracotta-deep" />
              )}
            </span>
            <span
              className={`tabular min-w-[52px] text-[13.5px] font-medium ${
                deposit ? "" : "text-terracotta-deep"
              }`}
            >
              {signedMoney(c.amountCents)}
            </span>
            <Link
              href={`/goals/${c.goalId}`}
              className="flex-1 truncate text-[12.5px] text-muted no-underline hover:text-forest hover:underline"
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

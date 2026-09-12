"use client";

import Link from "next/link";
import type { Contribution, Goal } from "@/lib/schema";
import { isComplete, remainingCents, statusOf } from "@/lib/calc";
import { ArrowRightIcon, CoinsIcon } from "../icons";

/**
 * A quiet prompt on the dashboard, not a pitch. It only appears when there is
 * actually somewhere for spare money to go, and it says what Smart Allocation
 * would help with rather than asking for an amount here.
 */
export function SpareMoneyCard({
  goals,
  contributions,
  now,
}: {
  goals: Goal[];
  contributions: Contribution[];
  now: Date;
}) {
  const open = goals.filter(
    (g) => !g.archivedAt && !isComplete(g, contributions) && remainingCents(g, contributions) > 0,
  );
  if (open.length === 0) return null;

  const behind = open.filter((g) => statusOf(g, contributions, now) === "behind").length;

  return (
    <Link
      href="/allocate"
      className="flex flex-wrap items-center gap-3 rounded-card border border-secondary/30 bg-tint-soft/60 px-5 py-4 text-primary no-underline transition-colors hover:bg-tint-soft"
    >
      <CoinsIcon className="h-5 w-5 shrink-0 text-secondary" />
      <span className="font-display text-[17px] font-semibold">
        Got some spare money?
      </span>
      <span className="text-[12.5px] text-muted">
        {behind > 0
          ? behind === 1
            ? "We'll suggest a split that gives your behind-schedule goal a little more help."
            : `We'll suggest a split that gives your ${behind} behind-schedule goals a little more help.`
          : `We'll suggest a way to spread it across your ${open.length === 1 ? "goal" : `${open.length} goals`}.`}
      </span>
      <ArrowRightIcon aria-hidden className="ml-auto h-4 w-4 shrink-0 text-secondary" />
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { Contribution, Goal } from "@/lib/schema";
import { isComplete, remainingCents, statusOf } from "@/lib/calc";
import { projectionFor, simulateExtra } from "@/lib/forecast";
import { describeMonths } from "@/lib/explain";
import { money } from "@/lib/money";
import { monthYear } from "@/lib/dates";
import { ArrowRightIcon, SparkIcon } from "../icons";

/**
 * The dashboard's gateway into What If. One goal, one scenario, one answer —
 * the full simulator lives on its own page.
 *
 * It focuses on a single goal on purpose. Spreading an extra amount across
 * every goal at once produces a number that is technically correct and tells
 * the customer nothing they can act on.
 */

const MAX_WEEKLY = 100_00;
const STEP = 5_00;

/** The goal an extra contribution would most obviously help. */
function goalToNudge(
  goals: Goal[],
  contributions: Contribution[],
  now: Date,
): Goal | undefined {
  const open = goals.filter(
    (g) => !g.archivedAt && !isComplete(g, contributions) && remainingCents(g, contributions) > 0,
  );
  if (open.length === 0) return undefined;

  const behind = open.filter((g) => statusOf(g, contributions, now) === "behind");
  const pool = behind.length > 0 ? behind : open;

  // Among those, the one landing soonest — the most tangible win.
  return pool
    .map((g) => ({ g, p: projectionFor(g, contributions, now) }))
    .sort((a, b) => {
      const am = a.p.kind === "projected" ? a.p.months : Number.MAX_SAFE_INTEGER;
      const bm = b.p.kind === "projected" ? b.p.months : Number.MAX_SAFE_INTEGER;
      return am - bm;
    })[0]?.g;
}

export function WhatIf({
  goals,
  contributions,
  now,
}: {
  goals: Goal[];
  contributions: Contribution[];
  now: Date;
}) {
  const [extra, setExtra] = useState(50_00);
  const goal = goalToNudge(goals, contributions, now);

  const result = goal
    ? simulateExtra(goal, contributions, { amountCents: extra, frequency: "weekly" }, now)
    : null;

  const href = goal
    ? `/what-if?goal=${encodeURIComponent(goal.id)}&extra=${extra}&freq=weekly`
    : "/what-if";

  const answer = (() => {
    if (!goal || !result) return "Add a goal to try this";
    if (result.monthsSaved && result.monthsSaved > 0) {
      return `${describeMonths(result.monthsSaved)} earlier`;
    }
    if (result.scenario.kind === "projected") return monthYear(result.scenario.date);
    return "Set a contribution first";
  })();

  /**
   * A large saving can look implausible on its own, so the two dates are shown
   * underneath. The figure is never softened — it is explained.
   */
  const workings =
    result &&
    result.monthsSaved !== null &&
    result.monthsSaved > 0 &&
    result.baseline.kind === "projected" &&
    result.scenario.kind === "projected"
      ? `${monthYear(result.scenario.date)} instead of ${monthYear(result.baseline.date)}`
      : null;

  const pct = (extra / MAX_WEEKLY) * 100;

  return (
    <div className="on-dark relative flex flex-col gap-3.5 overflow-hidden rounded-panel bg-primary p-5 text-on-primary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[30%] -inset-y-[30%] top-auto h-[70%]"
        style={{
          background:
            "radial-gradient(52% 62% at 50% 100%, rgb(var(--edition-wash-b) / .26), transparent 70%)",
        }}
      />
      <h2 className="relative flex items-center gap-2 font-display text-[21px] font-semibold">
        <SparkIcon className="h-[17px] w-[17px] text-tint" />
        What If?
      </h2>
      <p className="relative text-[12.5px] leading-snug text-on-primary/75">
        {goal
          ? `A little more towards ${goal.name}.`
          : "See how small changes make a big difference."}
      </p>

      <div className="relative flex flex-col gap-3 rounded-card border border-tint/20 bg-on-primary/7 p-3.5">
        <div className="flex items-center justify-between text-[12.5px]">
          <label htmlFor="dash-extra">Add extra per week</label>
          <b className="tabular text-base font-medium text-tint-soft">{money(extra)}</b>
        </div>

        <input
          id="dash-extra"
          type="range"
          min={0}
          max={MAX_WEEKLY}
          step={STEP}
          value={extra}
          aria-valuetext={`${money(extra)} a week`}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="h-6 w-full cursor-pointer appearance-none bg-origin-content focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tint [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-secondary [&::-moz-range-thumb]:bg-on-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-secondary [&::-webkit-slider-thumb]:bg-on-primary"
          style={{
            background: `linear-gradient(90deg, var(--edition-tint) 0 ${pct}%, rgb(from var(--edition-on-primary) r g b / .20) ${pct}%)`,
            backgroundSize: "100% 4px",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            borderRadius: "999px",
          }}
        />

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11.5px] text-on-primary/70">
              {goal ? `${goal.name} lands` : "Reach your goals"}
            </p>
            <p className="mt-0.5 font-display text-[19px] leading-tight">{answer}</p>
            {workings && (
              <p className="tabular mt-1 text-[11px] text-on-primary/60">{workings}</p>
            )}
          </div>
          <Link
            href={href}
            aria-label="Open the full What If simulator"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary transition-colors hover:bg-tint"
          >
            <ArrowRightIcon className="h-[15px] w-[15px] text-on-primary" />
          </Link>
        </div>
      </div>

      <Link
        href={href}
        className="relative inline-flex min-h-[24px] items-center gap-1.5 text-[12px] text-tint-soft no-underline hover:underline"
      >
        Explore more scenarios →
      </Link>
    </div>
  );
}

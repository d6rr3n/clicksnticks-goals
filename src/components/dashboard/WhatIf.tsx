"use client";

import { useState } from "react";
import type { Contribution, Goal } from "@/lib/schema";
import { monthlyRateCents, monthsRemaining, remainingCents } from "@/lib/calc";
import { money } from "@/lib/money";
import { ArrowRightIcon, SparkIcon } from "../icons";

/**
 * How much sooner the unfinished goals land if every monthly rate rises by the
 * same amount. Computed from the real goals, not a rule of thumb.
 */
function monthsSaved(goals: Goal[], contributions: Contribution[], extraCents: number): number {
  const unfinished = goals.filter(
    (g) => !g.archivedAt && remainingCents(g, contributions) > 0,
  );
  if (unfinished.length === 0 || extraCents <= 0) return 0;

  const share = Math.floor(extraCents / unfinished.length);

  const longest = (bonus: number) =>
    Math.max(
      ...unfinished.map((g) => {
        const rate = monthlyRateCents(g) + bonus;
        if (rate <= 0) return Infinity;
        return Math.ceil(remainingCents(g, contributions) / rate);
      }),
    );

  const before = longest(0);
  const after = longest(share);
  if (!Number.isFinite(before)) return 0;
  return Math.max(0, before - after);
}

export function WhatIf({
  goals,
  contributions,
}: {
  goals: Goal[];
  contributions: Contribution[];
}) {
  const [extra, setExtra] = useState(100_00);
  const months = monthsSaved(goals, contributions, extra);
  const anyUnfinished = goals.some(
    (g) => !g.archivedAt && remainingCents(g, contributions) > 0,
  );
  const stalled = goals.some(
    (g) => !g.archivedAt && monthsRemaining(g, contributions) === null,
  );

  return (
    <div className="relative flex flex-col gap-3.5 overflow-hidden rounded-panel bg-forest p-5 text-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[30%] -inset-y-[30%] top-auto h-[70%]"
        style={{
          background:
            "radial-gradient(52% 62% at 50% 100%, rgba(164,181,175,.26), transparent 70%)",
        }}
      />
      <h2 className="relative flex items-center gap-2 font-display text-[21px] font-semibold">
        <SparkIcon className="h-[17px] w-[17px] text-sage" />
        What If?
      </h2>
      <p className="relative text-[12.5px] leading-snug text-cream/75">
        See how small changes make a big difference.
      </p>

      <div className="relative flex flex-col gap-3 rounded-card border border-sage-light/20 bg-cream/7 p-3.5">
        <div className="flex items-center justify-between text-[12.5px]">
          <label htmlFor="extra-per-month">Add extra per month</label>
          <b className="tabular text-base font-medium text-sage-light">{money(extra)}</b>
        </div>

        <input
          id="extra-per-month"
          type="range"
          min={0}
          max={160_00}
          step={10_00}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="h-1 w-full appearance-none rounded-full outline-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-sage-deep [&::-moz-range-thumb]:bg-cream [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-sage-deep [&::-webkit-slider-thumb]:bg-cream"
          style={{
            background: `linear-gradient(90deg, var(--color-sage) 0 ${(extra / 160_00) * 100}%, rgba(247,242,236,.20) ${(extra / 160_00) * 100}%)`,
          }}
        />

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11.5px] text-cream/70">
              {anyUnfinished ? "Reach your goals" : "Everything is funded"}
            </p>
            <p className="mt-0.5 font-display text-[19px]">
              {!anyUnfinished
                ? "nothing left to chase"
                : stalled && months === 0
                  ? "set a contribution to see this"
                  : months === 0
                    ? "on your current plan"
                    : `${months} month${months === 1 ? "" : "s"} earlier`}
            </p>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage-deep">
            <ArrowRightIcon className="h-[15px] w-[15px] text-cream" />
          </span>
        </div>
      </div>
    </div>
  );
}

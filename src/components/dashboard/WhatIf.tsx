"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { ArrowRightIcon, SparkIcon } from "../icons";

/** Rough rule of thumb: every $20/month extra pulls the finish line in a month. */
const monthsSaved = (extra: number) => Math.round(extra / 20);

export function WhatIf() {
  const [extra, setExtra] = useState(100);
  const months = monthsSaved(extra);

  return (
    <div className="relative flex flex-col gap-3.5 overflow-hidden rounded-panel bg-sidebar p-5 text-brand-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[30%] -inset-y-[30%] top-auto h-[70%]"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 100%, rgba(212,151,144,.28), transparent 70%)",
        }}
      />
      <h2 className="relative flex items-center gap-2 font-display text-[21px] font-semibold">
        <SparkIcon className="h-[17px] w-[17px] text-rose" />
        What If?
      </h2>
      <p className="relative text-[12.5px] leading-snug text-brand-cream/75">
        See how small changes make a big difference.
      </p>

      <div className="relative flex flex-col gap-3 rounded-card border border-rose-light/20 bg-brand-cream/7 p-3.5">
        <div className="flex items-center justify-between text-[12.5px]">
          <label htmlFor="extra-per-month">Add extra per month</label>
          <b className="tabular text-base font-medium text-rose-light">
            {money(extra)}
          </b>
        </div>

        <input
          id="extra-per-month"
          type="range"
          min={0}
          max={160}
          step={10}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="h-1 w-full appearance-none rounded-full outline-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-rose-deep [&::-moz-range-thumb]:bg-brand-cream [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-rose-deep [&::-webkit-slider-thumb]:bg-brand-cream"
          style={{
            background: `linear-gradient(90deg, var(--color-rose) 0 ${(extra / 160) * 100}%, rgba(250,245,239,.20) ${(extra / 160) * 100}%)`,
          }}
        />

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11.5px] text-brand-cream/72">Reach your goals</p>
            <p className="mt-0.5 font-display text-[19px]">
              {months === 0
                ? "on your current plan"
                : `${months} month${months === 1 ? "" : "s"} earlier`}
            </p>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-deep">
            <ArrowRightIcon className="h-[15px] w-[15px] text-[#FFF6F3]" />
          </span>
        </div>
      </div>
    </div>
  );
}

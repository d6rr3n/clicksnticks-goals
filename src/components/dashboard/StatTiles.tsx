"use client";

import type { DashboardTotals } from "@/lib/calc";
import { money } from "@/lib/money";
import { CalendarIcon, ChartIcon, PiggyIcon, TargetIcon } from "../icons";

function Tile({
  icon, label, value, foot, className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  foot: string;
  className: string;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-card p-4 ${className}`}>
      {icon}
      <p className="text-[9.5px] font-medium tracking-[0.16em] opacity-85">{label}</p>
      <p className="tabular font-display text-[28px] leading-none font-semibold">{value}</p>
      <p className="tabular text-[11.5px] opacity-80">{foot}</p>
    </div>
  );
}

export function StatTiles({ totals }: { totals: DashboardTotals }) {
  const {
    totalSavedCents, savedThisMonthCents, activeCount, completedCount,
    onTrackCount, onTrackFraction, projectedValueCents,
  } = totals;

  const monthLabel =
    savedThisMonthCents === 0
      ? "Nothing added yet this month"
      : `${savedThisMonthCents > 0 ? "↑ +" : "↓ −"}${money(Math.abs(savedThisMonthCents)).replace("$", "$")} this month`;

  return (
    <section aria-label="Summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        className="bg-sage-light text-forest"
        icon={<PiggyIcon className="h-5 w-5" />}
        label="TOTAL SAVED"
        value={money(totalSavedCents)}
        foot={monthLabel}
      />
      <Tile
        className="bg-blush text-[#6B4B3C]"
        icon={<TargetIcon className="h-5 w-5" />}
        label="ACTIVE GOALS"
        value={String(activeCount)}
        foot={completedCount === 1 ? "1 completed" : `${completedCount} completed`}
      />
      <Tile
        className="bg-sage text-forest"
        icon={<CalendarIcon className="h-5 w-5" />}
        label="ON TRACK"
        value={`${onTrackCount} / ${activeCount}`}
        foot={`${Math.round(onTrackFraction * 100)}%`}
      />
      <Tile
        className="bg-terracotta text-cream"
        icon={<ChartIcon className="h-5 w-5" />}
        label="PROJECTED VALUE"
        value={money(projectedValueCents)}
        foot={`by ${new Date().getFullYear() + 4}`}
      />
    </section>
  );
}

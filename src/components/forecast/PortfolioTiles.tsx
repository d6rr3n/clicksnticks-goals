import type { PortfolioSummary } from "@/lib/forecast";
import { money } from "@/lib/money";
import { monthYear } from "@/lib/dates";
import { CalendarIcon, ChartIcon, CoinsIcon, FlagIcon, PiggyIcon, TrendIcon } from "../icons";

/**
 * The portfolio at a glance. Same tile language as the dashboard, six figures
 * rather than four, every one of them derived.
 */
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
      <p className="tabular font-display text-[26px] leading-none font-semibold">{value}</p>
      <p className="tabular text-[11.5px] opacity-80">{foot}</p>
    </div>
  );
}

export function PortfolioTiles({ summary }: { summary: PortfolioSummary }) {
  const unfinished = summary.activeCount - summary.completedCount;

  return (
    <section
      aria-label="Portfolio summary"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <Tile
        className="bg-tint-soft text-primary"
        icon={<PiggyIcon className="h-5 w-5" />}
        label="TOTAL SAVED"
        value={money(summary.totalSavedCents)}
        foot={`across ${summary.activeCount} goal${summary.activeCount === 1 ? "" : "s"}`}
      />
      <Tile
        className="bg-warm text-primary"
        icon={<CoinsIcon className="h-5 w-5" />}
        label="STILL TO GO"
        value={money(summary.totalRemainingCents)}
        foot={
          unfinished === 0
            ? "everything is funded"
            : `over ${unfinished} unfinished goal${unfinished === 1 ? "" : "s"}`
        }
      />
      <Tile
        className="bg-tint text-primary"
        icon={<TrendIcon className="h-5 w-5" />}
        label="SAVING RATE"
        value={
          summary.rate.monthlyCents > 0 ? `${money(summary.rate.weeklyCents)}/wk` : "—"
        }
        foot={
          summary.rate.monthlyCents > 0
            ? `${money(summary.rate.monthlyCents)} a month`
            : "no regular saving set"
        }
      />
      <Tile
        className="bg-accent text-on-primary"
        icon={<ChartIcon className="h-5 w-5" />}
        label="PROJECTED VALUE"
        value={money(summary.projectedValueCents)}
        foot={`in ${Math.round(summary.horizonMonths / 12)} years`}
      />
      <Tile
        className="bg-surface-alt text-primary"
        icon={<FlagIcon className="h-5 w-5" />}
        label="NEXT TO LAND"
        value={summary.nextToComplete ? monthYear(summary.nextToComplete.date) : "—"}
        foot={summary.nextToComplete?.name ?? "nothing projected yet"}
      />
      <Tile
        className="bg-surface-alt text-primary"
        icon={<CalendarIcon className="h-5 w-5" />}
        label="ON TRACK"
        value={`${summary.onTrackCount} / ${summary.activeCount}`}
        foot={
          summary.unprojectableCount > 0
            ? `${summary.unprojectableCount} can't be projected yet`
            : summary.onTrackCount === summary.activeCount
              ? "every goal on schedule"
              : `${summary.activeCount - summary.onTrackCount} running late`
        }
      />
    </section>
  );
}

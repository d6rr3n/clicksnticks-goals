import { goals, projectedValue, savedThisMonth, totalSaved } from "@/lib/data";
import { statusOf } from "@/lib/goals";
import { money, percent } from "@/lib/format";
import { CalendarIcon, ChartIcon, PiggyIcon, TargetIcon } from "../icons";

function Tile({
  icon,
  label,
  value,
  foot,
  className,
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

export function StatTiles() {
  const completed = goals.filter((g) => statusOf(g) === "complete").length;
  const onTrack = goals.filter((g) => statusOf(g) !== "behind").length;

  return (
    <section aria-label="Summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Tile
        className="bg-sage-light text-forest"
        icon={<PiggyIcon className="h-5 w-5" />}
        label="TOTAL SAVED"
        value={money(totalSaved)}
        foot={`↑ ${money(savedThisMonth)} this month`}
      />
      <Tile
        className="bg-blush text-[#6B4B3C]"
        icon={<TargetIcon className="h-5 w-5" />}
        label="ACTIVE GOALS"
        value={String(goals.length)}
        foot={`${completed} completed`}
      />
      <Tile
        className="bg-sage text-forest"
        icon={<CalendarIcon className="h-5 w-5" />}
        label="ON TRACK"
        value={`${onTrack} / ${goals.length}`}
        foot={percent(onTrack / goals.length)}
      />
      <Tile
        className="bg-terracotta text-cream"
        icon={<ChartIcon className="h-5 w-5" />}
        label="PROJECTED VALUE"
        value={money(projectedValue)}
        foot="by 2030"
      />
    </section>
  );
}

import { GoalCard } from "@/components/GoalCard";
import { Greeting } from "@/components/Greeting";
import { Panel } from "@/components/ui/Panel";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { ChallengeCard } from "@/components/dashboard/ChallengeCard";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";
import { WhatIf } from "@/components/dashboard/WhatIf";
import { HeartIcon, TrophyIcon } from "@/components/icons";
import { goals, motivation } from "@/lib/data";
import { progressOf, statusOf } from "@/lib/goals";

/** Focus goal: the closest to the line that isn't already done. */
const focusGoal = goals
  .filter((g) => statusOf(g) !== "complete")
  .sort((a, b) => progressOf(b) - progressOf(a))[0];

export default function DashboardPage() {
  return (
    <>
      <Greeting />
      <StatTiles />

      <Panel title="Your Goals" action={{ href: "/goals", label: "View all" }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </Panel>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.32fr_1fr_0.94fr]">
        <Panel title="Savings Forecast">
          <ForecastChart />
        </Panel>
        <WhatIf />
        <TodaysFocus goal={focusGoal} />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_0.86fr]">
        <Panel
          title="Challenges"
          icon={<TrophyIcon className="h-4 w-4 text-rose-deep" />}
          subtitle="Make saving fun."
          action={{ href: "/challenges", label: "View all" }}
        >
          <ChallengeCard />
        </Panel>

        <Panel title="Recent Activity" action={{ href: "/goals", label: "View all" }}>
          <ActivityList />
        </Panel>

        <Panel title="Motivation" icon={<HeartIcon className="h-4 w-4 text-rose-deep" />}>
          <figure className="m-0 flex flex-col gap-3">
            <blockquote className="m-0 text-center font-display text-[19px] leading-snug italic text-rose-deeper">
              &ldquo;{motivation.quote}&rdquo;
            </blockquote>
            <span aria-hidden className="mx-auto h-[1.5px] w-11 bg-rose" />
            <figcaption className="text-center text-[11.5px] text-muted">
              {motivation.attrib}
            </figcaption>
          </figure>
        </Panel>
      </section>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-surface px-5 py-3 text-[11px] text-muted shadow-[0_1px_2px_rgba(36,28,27,.05),0_8px_24px_-12px_rgba(36,28,27,.18)]">
        <b className="text-[9.5px] font-medium tracking-[0.1em] text-sidebar">STATUS KEY</b>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-rose-deep align-[-1px]" />On track</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-clay align-[-1px]" />Behind — also marked with a warning icon</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-rose-deeper align-[-1px]" />Complete — also marked with a tick</span>
        <span className="ml-auto">Colour never carries status alone.</span>
      </p>
    </>
  );
}

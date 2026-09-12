"use client";

import { Celebration } from "@/components/Celebration";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { GoalCard } from "@/components/GoalCard";
import { Greeting } from "@/components/Greeting";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { QuickAdd } from "@/components/contributions/QuickAdd";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { ChallengeCard } from "@/components/dashboard/ChallengeCard";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { SpareMoneyCard } from "@/components/dashboard/SpareMoneyCard";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { TodaysFocus } from "@/components/dashboard/TodaysFocus";
import { WhatIf } from "@/components/dashboard/WhatIf";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { BotanicalSprig } from "@/components/Botanical";
import { HeartIcon, PlusIcon, TrophyIcon } from "@/components/icons";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import { dashboardTotals, forecastSeries, isComplete, percentComplete } from "@/lib/calc";

const MOTIVATION = {
  quote: "A year from now, you'll wish you started today.",
  attrib: "Same you. Bigger possibilities.",
};

export default function DashboardPage() {
  const { mode, hydrated, data } = useGoals();
  const now = useNow();

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

  const live = data.goals.filter((g) => !g.archivedAt);
  const totals = dashboardTotals(data.goals, data.contributions, now);
  const series = forecastSeries(data.goals, data.contributions, now);

  // The unfinished goal nearest the line — the one most worth a nudge today.
  const focus = live
    .filter((g) => !isComplete(g, data.contributions))
    .sort(
      (a, b) =>
        percentComplete(b, data.contributions) - percentComplete(a, data.contributions),
    )[0];

  return (
    <>
      <StoreNotices />
      <Greeting now={now} />
      <Celebration />

      {live.length === 0 ? (
        <Panel title="Your Goals">
          <div className="flex flex-col items-start gap-4 py-6">
            <BotanicalSprig className="h-20 w-auto text-secondary opacity-35" />
            <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-muted">
              Nothing here yet. Add your first goal — a house deposit, a trip, a
              rainy-day fund — and the dashboard fills in around it.
            </p>
            <ButtonLink href="/goals/new">
              <PlusIcon className="h-3.5 w-3.5" />
              Create your first goal
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <>
          <StatTiles totals={totals} horizonYear={series[series.length - 1].year} />

          <Panel title="Your Goals" action={{ href: "/goals", label: "View all" }}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {live.slice(0, 4).map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  contributions={data.contributions}
                  now={now}
                />
              ))}
            </div>
          </Panel>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.32fr_1fr_0.94fr]">
            <Panel title="Savings Forecast">
              <ForecastChart series={series} />
            </Panel>
            <WhatIf goals={data.goals} contributions={data.contributions} now={now} />
            {focus ? (
              <TodaysFocus goal={focus} contributions={data.contributions} now={now} />
            ) : (
              <Panel title="Today's Focus">
                <p className="text-[12.5px] leading-relaxed text-muted">
                  Every goal is fully funded. Time to set a new one.
                </p>
              </Panel>
            )}
          </section>

          <SpareMoneyCard
            goals={data.goals}
            contributions={data.contributions}
            now={now}
          />

          <Panel title="Quick Add" subtitle="Log a contribution without leaving the page.">
            <QuickAdd goals={live} />
          </Panel>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_0.86fr]">
            <Panel
              title="Challenges"
              icon={<TrophyIcon className="h-4 w-4 text-secondary" />}
              subtitle="Make saving fun."
              action={{ href: "/challenges", label: "View all" }}
            >
              <ChallengeCard />
            </Panel>

            <Panel title="Recent Activity" action={{ href: "/goals", label: "View all" }}>
              <ActivityList goals={data.goals} contributions={data.contributions} />
            </Panel>

            <Panel title="Motivation" icon={<HeartIcon className="h-4 w-4 text-secondary" />}>
              <figure className="relative m-0 flex flex-col gap-3">
                <BotanicalSprig className="pointer-events-none absolute -top-1 -right-2 h-16 w-auto text-secondary opacity-30" />
                <blockquote className="m-0 text-center font-display text-[19px] leading-snug italic text-primary">
                  &ldquo;{MOTIVATION.quote}&rdquo;
                </blockquote>
                <span aria-hidden className="mx-auto h-[1.5px] w-11 bg-tint" />
                <figcaption className="text-center text-[11.5px] text-muted">
                  {MOTIVATION.attrib}
                </figcaption>
              </figure>
            </Panel>
          </section>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-surface px-5 py-3 text-[11px] text-muted elevated">
            <b className="text-[9.5px] font-medium tracking-[0.1em] text-primary">STATUS KEY</b>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-success align-[-1px]" />On track</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-warning align-[-1px]" />Behind — also marked with a warning icon</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-primary align-[-1px]" />Complete — also marked with a tick</span>
            <span className="ml-auto">Colour never carries status alone.</span>
          </p>
        </>
      )}
    </>
  );
}

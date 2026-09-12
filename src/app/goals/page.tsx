"use client";

import { useState } from "react";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { GoalCard } from "@/components/GoalCard";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { BotanicalSprig } from "@/components/Botanical";
import { PlusIcon } from "@/components/icons";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import { dashboardTotals, statusOf } from "@/lib/calc";
import { money } from "@/lib/money";

export default function GoalsPage() {
  const { mode, hydrated, data, restoreGoal } = useGoals();
  const now = useNow();
  const [showArchived, setShowArchived] = useState(false);

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

  const live = data.goals.filter((g) => !g.archivedAt);
  const archived = data.goals.filter((g) => g.archivedAt);
  const totals = dashboardTotals(data.goals, data.contributions, now);
  const behind = live.filter((g) => statusOf(g, data.contributions, now) === "behind");

  return (
    <>
      <StoreNotices />

      <header className="rounded-panel bg-gradient-to-br from-[var(--edition-hero-from)] via-[var(--edition-hero-via)] to-[var(--edition-hero-to)] px-6 pt-6 pb-7">
        <p className="text-[10px] font-medium tracking-[0.2em] text-secondary">
          EVERY GOAL, ALL IN ONE PLACE
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-none font-semibold tracking-tight">
              My Goals
            </h1>
            <p className="tabular mt-2 text-[13px] text-muted">
              {live.length === 0 ? (
                "No goals yet."
              ) : (
                <>
                  {money(totals.totalSavedCents)} saved ·{" "}
                  {money(totals.totalRemainingCents)} still to go
                  {behind.length > 0 && (
                    <>
                      {" · "}
                      <span className="font-medium text-warning">
                        {behind.length} needing attention
                      </span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          <ButtonLink href="/goals/new">
            <PlusIcon className="h-3.5 w-3.5" />
            New goal
          </ButtonLink>
        </div>
      </header>

      <Panel>
        {live.length === 0 ? (
          <div className="flex flex-col items-start gap-4 py-6">
            <BotanicalSprig className="h-20 w-auto text-secondary opacity-35" />
            <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-muted">
              Nothing here yet. Your first goal is the one that makes the rest feel
              possible.
            </p>
            <ButtonLink href="/goals/new">
              <PlusIcon className="h-3.5 w-3.5" />
              Create a goal
            </ButtonLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {live.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                contributions={data.contributions}
                now={now}
              />
            ))}
          </div>
        )}
      </Panel>

      {archived.length > 0 && (
        <Panel
          title="Archived"
          subtitle={`${archived.length} goal${archived.length === 1 ? "" : "s"} set aside. Not counted in any total.`}
        >
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex min-h-[24px] items-center text-[12.5px] text-secondary hover:underline"
            aria-expanded={showArchived}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>

          {showArchived && (
            <ul className="mt-3 flex list-none flex-col p-0">
              {archived.map((goal) => (
                <li
                  key={goal.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-0"
                >
                  <span className="flex-1 text-[13.5px]">
                    {goal.emoji ? `${goal.emoji} ` : ""}
                    {goal.name}
                  </span>
                  <span className="tabular text-[12.5px] text-muted">
                    {money(goal.targetCents)} target
                  </span>
                  <button
                    type="button"
                    onClick={() => restoreGoal(goal.id)}
                    className="inline-flex min-h-[24px] items-center text-[12.5px] text-secondary hover:underline"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { BotanicalCorner, BotanicalSprig } from "@/components/Botanical";
import { ForecastTimeline } from "@/components/forecast/ForecastTimeline";
import { GoalForecastPanel } from "@/components/forecast/GoalForecastPanel";
import { PortfolioTiles } from "@/components/forecast/PortfolioTiles";
import { ButtonLink } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { PlusIcon } from "@/components/icons";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import { isComplete, portfolioForecast } from "@/lib/calc";
import { portfolioSummary } from "@/lib/forecast";
import { explainRate, portfolioNotes } from "@/lib/explain";

export default function ForecastPage() {
  const { mode, hydrated, data } = useGoals();
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [horizonYears, setHorizonYears] = useState<number | null>(null);

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

  const live = data.goals.filter((g) => !g.archivedAt);

  if (live.length === 0) {
    return (
      <>
        <StoreNotices />
        <Panel title="Savings Forecast">
          <div className="flex flex-col items-start gap-4 py-6">
            <BotanicalSprig className="h-20 w-auto text-secondary opacity-35" />
            <p className="max-w-[48ch] text-[13.5px] leading-relaxed text-muted">
              A forecast needs something to forecast. Add a goal with a regular
              contribution and this page will show you when it lands, what the
              whole plan is worth, and what would change if you saved a little
              more.
            </p>
            <ButtonLink href="/goals/new">
              <PlusIcon className="h-3.5 w-3.5" />
              Create a goal
            </ButtonLink>
          </div>
        </Panel>
      </>
    );
  }

  const summary = portfolioSummary(data.goals, data.contributions, now);
  const notes = portfolioNotes(summary);

  // Default to the shortest scale that still shows every goal landing, so a
  // single slow goal doesn't flatten the part the customer cares about.
  const needed = Math.ceil(summary.horizonMonths / 12);
  const scales = [3, 5, 10].filter((y) => y * 12 <= 120);
  const defaultScale = scales.find((y) => y >= needed) ?? scales[scales.length - 1];
  const scale = horizonYears ?? defaultScale;
  const forecast = portfolioForecast(data.goals, data.contributions, now, scale * 12);

  const unfinished = live.filter((g) => !isComplete(g, data.contributions));
  const selectable = unfinished.length > 0 ? unfinished : live;
  const selected =
    selectable.find((g) => g.id === selectedId) ??
    (summary.nextToComplete
      ? selectable.find((g) => g.id === summary.nextToComplete!.goalId)
      : undefined) ??
    selectable[0];

  return (
    <>
      <StoreNotices />

      <header className="relative overflow-hidden rounded-panel bg-gradient-to-br from-[var(--edition-hero-from)] via-[var(--edition-hero-via)] to-[var(--edition-hero-to)] px-6 pt-6 pb-7">
        <BotanicalCorner className="absolute -top-6 right-0 h-[150%] w-auto text-primary opacity-70" />
        <div className="relative">
          <p className="text-[10px] font-medium tracking-[0.2em] text-secondary">
            WHERE THIS IS ALL HEADING
          </p>
          <h1 className="my-2 font-display text-[clamp(28px,4vw,42px)] leading-none font-semibold tracking-tight text-balance">
            Savings Forecast
          </h1>
          <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
            {explainRate(summary)}
          </p>
        </div>
      </header>

      <PortfolioTiles summary={summary} />

      {notes.length > 0 && (
        <ul className="flex list-none flex-col gap-2 rounded-card bg-surface px-5 py-4 elevated">
          {notes.map((note) => (
            <li key={note} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
              <span
                aria-hidden
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
              />
              {note}
            </li>
          ))}
        </ul>
      )}

      <Panel title="Portfolio forecast">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span id="scale-label" className="text-[9.5px] font-medium tracking-[0.14em] text-muted">
            SHOW
          </span>
          <div role="group" aria-labelledby="scale-label" className="flex flex-wrap gap-1.5">
            {scales.map((years) => (
              <button
                key={years}
                type="button"
                aria-pressed={scale === years}
                onClick={() => setHorizonYears(years)}
                className={`inline-flex min-h-[32px] items-center rounded-full px-3.5 text-[12.5px] transition-colors ${
                  scale === years
                    ? "bg-primary text-on-primary"
                    : "border border-border bg-surface text-primary hover:bg-background"
                }`}
              >
                {years} years
              </button>
            ))}
          </div>
        </div>
        <ForecastTimeline forecast={forecast} />
      </Panel>

      <Panel title="Goal forecast">
        <div className="flex flex-col gap-4">
          <div className="max-w-sm">
            <Field label="Goal">
              {(p) => (
                <select
                  {...p}
                  className={inputClass()}
                  value={selected?.id ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {selectable.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji ? `${g.emoji} ` : ""}
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          {selected && (
            <GoalForecastPanel
              goal={selected}
              contributions={data.contributions}
              now={now}
            />
          )}
        </div>
      </Panel>

    </>
  );
}

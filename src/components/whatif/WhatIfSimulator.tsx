"use client";

import Link from "next/link";
import { useState } from "react";
import type { Contribution, Frequency, Goal } from "@/lib/schema";
import { FREQUENCIES, FREQUENCY_LABEL } from "@/lib/schema";
import { remainingCents } from "@/lib/calc";
import {
  perPeriodFromMonthly,
  projectionFor,
  requiredRate,
  simulateExtra,
  simulateLumpSum,
} from "@/lib/forecast";
import {
  explainExtra,
  explainLumpSum,
  explainRequired,
  describeMonths,
  LUMP_SUM_NOTE,
} from "@/lib/explain";
import { money } from "@/lib/money";
import { monthYear, toISODate } from "@/lib/dates";
import { useGoals } from "@/lib/store/GoalsStore";
import { Button } from "../ui/Button";
import { Field, dateInputClass, inputClass } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { AmountControl } from "./AmountControl";
import { ApplyScenarioDialog, type PendingChange } from "./ApplyScenarioDialog";
import { PlanComparison, sideFrom } from "./PlanComparison";

type Tab = "more" | "lump" | "by";

const TABS: Array<{ id: Tab; label: string; blurb: string }> = [
  { id: "more", label: "Save more", blurb: "What if I put a little more aside each time?" },
  { id: "lump", label: "Add a lump sum", blurb: "What if I dropped some money in today?" },
  { id: "by", label: "Reach it by…", blurb: "What would it take to finish by a date?" },
];

export function WhatIfSimulator({
  goals,
  contributions,
  now,
  initialGoalId,
  initialExtraCents,
  initialFrequency,
}: {
  goals: Goal[];
  contributions: Contribution[];
  now: Date;
  initialGoalId?: string;
  initialExtraCents?: number;
  initialFrequency?: Frequency;
}) {
  const [goalId, setGoalId] = useState(
    goals.find((g) => g.id === initialGoalId)?.id ?? goals[0]?.id ?? "",
  );
  const [tab, setTab] = useState<Tab>("more");
  const [extraCents, setExtraCents] = useState(initialExtraCents ?? 50_00);
  const [extraFrequency, setExtraFrequency] = useState<Frequency>(
    initialFrequency ?? "weekly",
  );
  const [lumpCents, setLumpCents] = useState(1000_00);
  const [byDate, setByDate] = useState("");
  const [byFrequency, setByFrequency] = useState<Frequency>("weekly");
  const [pending, setPending] = useState<{ changes: PendingChange[]; apply: () => void } | null>(null);

  const goal = goals.find((g) => g.id === goalId) ?? goals[0];
  if (!goal) return null;

  const baseline = projectionFor(goal, contributions, now);
  const outstanding = remainingCents(goal, contributions);
  const currentSide = sideFrom(
    baseline,
    goal.contributionCents > 0
      ? `${money(goal.contributionCents)} ${FREQUENCY_LABEL[goal.frequency].toLowerCase()}`
      : "None set",
    outstanding,
  );

  return (
    <>
      <Panel title="Choose a scenario" subtitle="Explore freely — nothing changes until you choose to apply it.">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Goal">
              {(p) => (
                <select
                  {...p}
                  className={inputClass()}
                  value={goal.id}
                  onChange={(e) => setGoalId(e.target.value)}
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji ? `${g.emoji} ` : ""}
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <div role="tablist" aria-label="Scenario" className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`inline-flex min-h-[38px] items-center rounded-full px-4 text-[13px] transition-colors ${
                  tab === t.id
                    ? "bg-primary text-on-primary"
                    : "border border-border bg-surface text-primary hover:bg-background"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <p className="-mt-2 text-[12.5px] text-muted">
            {TABS.find((t) => t.id === tab)?.blurb}
          </p>

          {tab === "more" && (
            <SaveMore
              goal={goal}
              contributions={contributions}
              now={now}
              extraCents={extraCents}
              setExtraCents={setExtraCents}
              frequency={extraFrequency}
              setFrequency={setExtraFrequency}
              currentSide={currentSide}
              onApply={setPending}
            />
          )}

          {tab === "lump" && (
            <LumpSum
              goal={goal}
              contributions={contributions}
              now={now}
              lumpCents={lumpCents}
              setLumpCents={setLumpCents}
              currentSide={currentSide}
            />
          )}

          {tab === "by" && (
            <ReachBy
              goal={goal}
              contributions={contributions}
              now={now}
              byDate={byDate}
              setByDate={setByDate}
              frequency={byFrequency}
              setFrequency={setByFrequency}
              currentSide={currentSide}
              onApply={setPending}
            />
          )}
        </div>
      </Panel>

      <ApplyScenarioDialog
        open={pending !== null}
        goalName={goal.name}
        changes={pending?.changes ?? []}
        onClose={() => setPending(null)}
        onConfirm={() => {
          pending?.apply();
          setPending(null);
        }}
      />
    </>
  );
}

/* ── Frequency picker, shared by two scenarios ───────────────────────────── */

function FrequencyChoice({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: Frequency;
  onChange: (f: Frequency) => void;
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 text-[11px] font-medium tracking-[0.12em] text-muted">
        {legend.toUpperCase()}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {FREQUENCIES.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={value === f}
            onClick={() => onChange(f)}
            className={`inline-flex min-h-[34px] items-center rounded-full px-3.5 text-[12.5px] transition-colors ${
              value === f
                ? "bg-secondary text-on-primary"
                : "border border-border bg-surface text-primary hover:bg-background"
            }`}
          >
            {FREQUENCY_LABEL[f]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/* ── A: save more regularly ──────────────────────────────────────────────── */

function SaveMore({
  goal, contributions, now, extraCents, setExtraCents, frequency, setFrequency,
  currentSide, onApply,
}: {
  goal: Goal;
  contributions: Contribution[];
  now: Date;
  extraCents: number;
  setExtraCents: (c: number) => void;
  frequency: Frequency;
  setFrequency: (f: Frequency) => void;
  currentSide: ReturnType<typeof sideFrom>;
  onApply: (p: { changes: PendingChange[]; apply: () => void }) => void;
}) {
  const { updateGoal } = useGoals();
  const result = simulateExtra(goal, contributions, { amountCents: extraCents, frequency }, now);
  const explanation = explainExtra(goal, { amountCents: extraCents, frequency }, result);

  const newPerPeriod = perPeriodFromMonthly(result.scenarioMonthlyCents, frequency);
  const scenarioSide = sideFrom(
    result.scenario,
    `${money(newPerPeriod)} ${FREQUENCY_LABEL[frequency].toLowerCase()}`,
    remainingCents(goal, contributions),
  );

  const headline =
    result.monthsSaved && result.monthsSaved > 0
      ? `${describeMonths(result.monthsSaved)} earlier`
      : result.scenario.kind === "projected"
        ? monthYear(result.scenario.date)
        : "No change";

  const canApply =
    extraCents > 0 && result.scenario.kind === "projected" && !goal.archivedAt;

  return (
    <div id="panel-more" role="tabpanel" aria-labelledby="tab-more" className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <AmountControl
          label="Extra per period"
          valueCents={extraCents}
          onChange={setExtraCents}
          maxCents={500_00}
          stepCents={5_00}
          hint="Drag for a feel, or type an exact amount."
        />
        <FrequencyChoice legend="How often" value={frequency} onChange={setFrequency} />
      </div>

      <PlanComparison
        headline={headline}
        subhead={explanation}
        current={currentSide}
        scenario={scenarioSide}
        changed={["contribution", "completion", "timeRemaining"]}
      />

      {canApply && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              onApply({
                changes: [
                  {
                    label: "Regular contribution",
                    from: `${money(goal.contributionCents)} ${FREQUENCY_LABEL[goal.frequency].toLowerCase()}`,
                    to: `${money(newPerPeriod)} ${FREQUENCY_LABEL[frequency].toLowerCase()}`,
                  },
                ],
                apply: () =>
                  updateGoal(goal.id, {
                    contributionCents: newPerPeriod,
                    frequency,
                  }),
              })
            }
          >
            Apply to goal
          </Button>
          <p className="text-[11.5px] text-muted">
            Updates your plan only. No money is moved.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── B: add money today ──────────────────────────────────────────────────── */

function LumpSum({
  goal, contributions, now, lumpCents, setLumpCents, currentSide,
}: {
  goal: Goal;
  contributions: Contribution[];
  now: Date;
  lumpCents: number;
  setLumpCents: (c: number) => void;
  currentSide: ReturnType<typeof sideFrom>;
}) {
  const result = simulateLumpSum(goal, contributions, lumpCents, now);
  const explanation = explainLumpSum(goal, lumpCents, result);

  const scenarioSide = sideFrom(
    result.scenario,
    currentSide.contribution,
    Math.max(goal.targetCents - result.newBalanceCents, 0),
  );

  const headline = result.completesGoal
    ? "Fully funded"
    : result.monthsSaved && result.monthsSaved > 0
      ? `${describeMonths(result.monthsSaved)} earlier`
      : `${Math.round(result.newPercentComplete * 100)}% complete`;

  const outstanding = remainingCents(goal, contributions);

  return (
    <div id="panel-lump" role="tabpanel" aria-labelledby="tab-lump" className="flex flex-col gap-5">
      <AmountControl
        label="One-off amount"
        valueCents={lumpCents}
        onChange={setLumpCents}
        maxCents={Math.max(outstanding, 1000_00)}
        stepCents={50_00}
        hint="Money you could put in today."
      />

      <PlanComparison
        headline={headline}
        subhead={explanation}
        current={currentSide}
        scenario={scenarioSide}
        changed={["completion", "timeRemaining", "amountRemaining"]}
      />

      <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-alt px-4 py-3.5">
        <p className="text-[12.5px] leading-relaxed text-muted">{LUMP_SUM_NOTE}</p>
        <Link
          href={`/goals/${goal.id}`}
          className="inline-flex min-h-[24px] items-center text-[12.5px] text-secondary no-underline hover:underline"
        >
          Open {goal.name} to record it →
        </Link>
      </div>
    </div>
  );
}

/* ── C: reach it by… ─────────────────────────────────────────────────────── */

function ReachBy({
  goal, contributions, now, byDate, setByDate, frequency, setFrequency,
  currentSide, onApply,
}: {
  goal: Goal;
  contributions: Contribution[];
  now: Date;
  byDate: string;
  setByDate: (d: string) => void;
  frequency: Frequency;
  setFrequency: (f: Frequency) => void;
  currentSide: ReturnType<typeof sideFrom>;
  onApply: (p: { changes: PendingChange[]; apply: () => void }) => void;
}) {
  const { updateGoal } = useGoals();
  const date = byDate || goal.targetDate;
  const result = requiredRate(goal, contributions, date, now);
  const explanation = explainRequired(goal, date, result, frequency);

  const required =
    result.kind === "required"
      ? frequency === "weekly"
        ? result.required.weeklyCents
        : frequency === "fortnightly"
          ? result.required.fortnightlyCents
          : result.required.monthlyCents
      : null;

  return (
    <div id="panel-by" role="tabpanel" aria-labelledby="tab-by" className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Finish by" hint="Pick any date and we'll work backwards.">
          {(p) => (
            <input
              {...p}
              type="date"
              min={toISODate(now)}
              className={dateInputClass()}
              value={date}
              onChange={(e) => setByDate(e.target.value)}
            />
          )}
        </Field>
        <FrequencyChoice legend="Show me per" value={frequency} onChange={setFrequency} />
      </div>

      {result.kind === "required" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                ["Weekly", result.required.weeklyCents, result.deltaWeeklyCents],
                ["Fortnightly", result.required.fortnightlyCents, result.deltaFortnightlyCents],
                ["Monthly", result.required.monthlyCents, result.deltaMonthlyCents],
              ] as const
            ).map(([label, amount, delta]) => (
              <div
                key={label}
                className={`flex flex-col gap-1.5 rounded-card p-4 ${
                  FREQUENCY_LABEL[frequency] === label
                    ? "border border-secondary/40 bg-tint-soft/60"
                    : "border border-border bg-surface-alt"
                }`}
              >
                <span className="text-[9.5px] font-medium tracking-[0.16em] text-muted">
                  {label.toUpperCase()}
                </span>
                <span className="tabular font-display text-[24px] leading-none font-semibold">
                  {money(amount)}
                </span>
                <span className="tabular text-[11.5px] text-muted">
                  {delta > 0
                    ? `${money(delta)} more than now`
                    : delta < 0
                      ? `${money(-delta)} less than now`
                      : "exactly what you save now"}
                </span>
              </div>
            ))}
          </div>

          <PlanComparison
            headline={
              result.alreadyEnough
                ? "You're already there"
                : `${money(required ?? 0)} a ${frequency === "weekly" ? "week" : frequency === "fortnightly" ? "fortnight" : "month"}`
            }
            subhead={explanation}
            current={currentSide}
            scenario={{
              contribution: `${money(required ?? 0)} ${FREQUENCY_LABEL[frequency].toLowerCase()}`,
              completion: monthYear(date),
              timeRemaining: describeMonths(result.months),
              amountRemaining: money(remainingCents(goal, contributions)),
            }}
            changed={["contribution", "completion", "timeRemaining"]}
          />

          {required !== null && !goal.archivedAt && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => {
                  const changes: PendingChange[] = [
                    {
                      label: "Regular contribution",
                      from: `${money(goal.contributionCents)} ${FREQUENCY_LABEL[goal.frequency].toLowerCase()}`,
                      to: `${money(required)} ${FREQUENCY_LABEL[frequency].toLowerCase()}`,
                    },
                  ];
                  if (date !== goal.targetDate) {
                    changes.push({
                      label: "Target date",
                      from: monthYear(goal.targetDate),
                      to: monthYear(date),
                    });
                  }
                  onApply({
                    changes,
                    apply: () =>
                      updateGoal(goal.id, {
                        contributionCents: required,
                        frequency,
                        targetDate: date,
                      }),
                  });
                }}
              >
                Apply to goal
              </Button>
              <p className="text-[11.5px] text-muted">
                Updates your plan only. No money is moved.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="rounded-card bg-warm-soft px-4 py-3.5 text-[13px] leading-relaxed text-warning">
          {explanation}
        </p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FirstRunChoice } from "@/components/FirstRunChoice";
import { Skeleton } from "@/components/Skeleton";
import { StoreNotices } from "@/components/StoreNotices";
import { BotanicalCorner, BotanicalSprig } from "@/components/Botanical";
import { AllocationRow } from "@/components/allocate/AllocationRow";
import { ApplyAllocationDialog } from "@/components/allocate/ApplyAllocationDialog";
import { BeforeAfter } from "@/components/allocate/BeforeAfter";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PlusIcon } from "@/components/icons";
import { useGoals, useNow } from "@/lib/store/GoalsStore";
import { ALLOCATION_NOTE, planFromAmounts, smartAllocate } from "@/lib/allocate";
import { explainPlan, explainUnallocated, ALLOCATION_NOTE_TEXT } from "@/lib/explain";
import { money, parseAmount } from "@/lib/money";
import { toISODate } from "@/lib/dates";
import { CheckIcon } from "@/components/icons";

export default function AllocatePage() {
  const { mode, hydrated, data, addContributions } = useGoals();
  const now = useNow();

  const [input, setInput] = useState("");
  const [available, setAvailable] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Null means "showing the recommendation". A map means it's been adjusted. */
  const [adjusted, setAdjusted] = useState<Record<string, number> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [applied, setApplied] = useState<{ total: number; goals: number } | null>(null);

  const recommended = useMemo(
    () =>
      available === null
        ? null
        : smartAllocate(data.goals, data.contributions, available, now),
    [available, data.goals, data.contributions, now],
  );

  const plan = useMemo(() => {
    if (available === null || recommended === null) return null;
    return adjusted === null
      ? recommended
      : planFromAmounts(data.goals, data.contributions, adjusted, available, now);
  }, [adjusted, available, recommended, data.goals, data.contributions, now]);

  if (!hydrated) return <Skeleton />;
  if (mode === "unset") return <FirstRunChoice />;

  const live = data.goals.filter((g) => !g.archivedAt);

  function showPlan(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(input);
    if (parsed === null) {
      setError("Enter an amount, like 1000.");
      return;
    }
    if (parsed <= 0) {
      setError("Enter an amount greater than $0.");
      return;
    }
    setError(null);
    setAvailable(parsed);
    setAdjusted(null);
    setApplied(null);
  }

  /**
   * The only write in this whole page, and it happens once, atomically: every
   * contribution lands or none does.
   */
  function applyPlan() {
    if (!plan) return;
    const lines = plan.allocations.filter((a) => a.amountCents > 0);
    addContributions(
      lines.map((a) => ({
        goalId: a.goalId,
        amountCents: a.amountCents,
        date: toISODate(now),
        note: ALLOCATION_NOTE,
      })),
    );
    setApplied({ total: plan.totalAllocatedCents, goals: lines.length });
    setConfirming(false);
    setAvailable(null);
    setAdjusted(null);
    setInput("");
  }

  /** Editing one row must never let the total exceed what's available. */
  function adjust(goalId: string, cents: number) {
    if (!plan || available === null) return;
    const current = Object.fromEntries(
      plan.allocations.filter((a) => a.eligible).map((a) => [a.goalId, a.amountCents]),
    );
    const others = Object.entries(current)
      .filter(([id]) => id !== goalId)
      .reduce((s, [, v]) => s + v, 0);
    current[goalId] = Math.max(Math.min(cents, available - others), 0);
    setAdjusted(current);
  }

  return (
    <>
      <StoreNotices />

      <header className="relative overflow-hidden rounded-panel bg-gradient-to-br from-[var(--edition-hero-from)] via-[var(--edition-hero-via)] to-[var(--edition-hero-to)] px-6 pt-6 pb-7">
        <BotanicalCorner className="absolute -top-6 right-0 h-[150%] w-auto text-primary opacity-70" />
        <div className="relative">
          <Link
            href="/forecast"
            className="inline-flex min-h-[28px] items-center text-[11px] tracking-[0.14em] text-secondary no-underline hover:underline"
          >
            ← FORECAST
          </Link>
          <h1 className="mt-2 mb-2 font-display text-[clamp(28px,4vw,42px)] leading-none font-semibold tracking-tight">
            Where should I put it?
          </h1>
          <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">
            Tell us what you have spare and we&apos;ll suggest a way to spread it
            across your goals. {ALLOCATION_NOTE_TEXT}
          </p>
        </div>
      </header>

      {live.length === 0 ? (
        <Panel title="Nothing to spread it across yet">
          <div className="flex flex-col items-start gap-4 py-6">
            <BotanicalSprig className="h-20 w-auto text-secondary opacity-35" />
            <p className="max-w-[48ch] text-[13.5px] leading-relaxed text-muted">
              Add a goal or two and we can suggest where spare money would do the
              most good.
            </p>
            <ButtonLink href="/goals/new">
              <PlusIcon className="h-3.5 w-3.5" />
              Create a goal
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <>
          {applied && (
            <p
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-card bg-tint-soft px-5 py-4 text-[13.5px] text-primary"
            >
              <CheckIcon className="h-5 w-5 shrink-0 text-success" />
              <span>
                <b className="font-semibold">{money(applied.total)}</b> added across{" "}
                {applied.goals} goal{applied.goals === 1 ? "" : "s"}. It&apos;s in
                your contribution history now.
              </span>
              <Link
                href="/goals"
                className="ml-auto inline-flex min-h-[24px] items-center text-[12.5px] text-secondary no-underline hover:underline"
              >
                See your goals →
              </Link>
            </p>
          )}

          <Panel>
            <form onSubmit={showPlan} noValidate className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="available"
                    className="text-[11px] font-medium tracking-[0.12em] text-muted"
                  >
                    AVAILABLE TO SAVE
                  </label>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="font-display text-[26px] text-muted">
                      $
                    </span>
                    <input
                      id="available"
                      inputMode="decimal"
                      autoComplete="off"
                      value={input}
                      placeholder="1,000"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "available-error" : undefined}
                      onChange={(e) => setInput(e.target.value)}
                      className="tabular w-44 rounded-[12px] border border-border bg-surface px-4 py-3 font-display text-[26px] font-semibold text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                    />
                  </div>
                </div>

                <Button type="submit" className="mb-1">
                  Show me a plan
                </Button>
              </div>

              {error && (
                <p id="available-error" role="alert" className="text-[12.5px] font-medium text-warning">
                  {error}
                </p>
              )}
            </form>
          </Panel>

          {plan && (
            <>
              <Panel
                title="Here's one way to spread it"
                subtitle={explainPlan(plan)}
              >
                <div className="flex flex-col gap-4">
                  <ul className="flex list-none flex-col p-0">
                    {plan.allocations.map((allocation) => (
                      <AllocationRow
                        key={allocation.goalId}
                        allocation={allocation}
                        plan={plan}
                        onChange={
                          allocation.eligible
                            ? (cents) => adjust(allocation.goalId, cents)
                            : undefined
                        }
                        maxCents={allocation.factors.remainingCents}
                      />
                    ))}
                  </ul>

                  <div
                    role="status"
                    aria-live="polite"
                    className="flex flex-wrap items-baseline justify-between gap-3 rounded-card bg-surface-alt px-4 py-3.5"
                  >
                    <span className="tabular text-[14px]">
                      <b className="font-semibold">{money(plan.totalAllocatedCents)}</b> of{" "}
                      {money(plan.availableCents)} allocated
                    </span>
                    {plan.unallocatedCents > 0 && (
                      <span className="tabular text-[12.5px] text-muted">
                        {explainUnallocated(plan)}
                      </span>
                    )}
                  </div>

                  {adjusted !== null && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="secondary" onClick={() => setAdjusted(null)}>
                        Reset recommendation
                      </Button>
                      <p className="text-[11.5px] text-muted">
                        You&apos;ve adjusted this plan. Resetting brings back our
                        suggestion.
                      </p>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel title="What this changes">
                <BeforeAfter plan={plan} />
              </Panel>

              <div className="flex flex-wrap items-center gap-3 rounded-card bg-surface px-5 py-4 elevated">
                <Button
                  onClick={() => setConfirming(true)}
                  disabled={plan.totalAllocatedCents <= 0}
                >
                  Apply allocation
                </Button>
                <p className="text-[12px] text-muted">
                  {plan.totalAllocatedCents > 0
                    ? "Records these as contributions dated today. Nothing moves between your accounts."
                    : "There's nothing to apply yet."}
                </p>
              </div>

              <ApplyAllocationDialog
                open={confirming}
                plan={plan}
                now={now}
                onClose={() => setConfirming(false)}
                onConfirm={applyPlan}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

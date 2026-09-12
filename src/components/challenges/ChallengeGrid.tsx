"use client";

import { CheckIcon } from "../icons";
import { money, moneyExact } from "@/lib/money";
import { fullDate } from "@/lib/dates";
import { stepDueDate, stepWord, type ChallengeProgress } from "@/lib/challenges";
import type { Challenge } from "@/lib/schema";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The whole challenge at a glance, one cell per step.
 *
 * Each cell is a real button: keyboard operable, with its state carried by
 * aria-pressed rather than by fill alone, and a check mark so the difference
 * between done and not done survives without colour. A cell whose amount was
 * corrected on the goal's history page shows what was actually saved, marked
 * with an asterisk — the grid reports the ledger, not the plan.
 *
 * Unticking stays available even when the challenge is paused, so a step added
 * by mistake can always be taken back.
 */
export function ChallengeGrid({
  challenge,
  progress,
  blocked,
  onToggle,
}: {
  challenge: Challenge;
  progress: ChallengeProgress;
  /** True when new steps cannot be ticked right now. */
  blocked: boolean;
  onToggle: (step: number, done: boolean) => void;
}) {
  const unit = stepWord(challenge.cadence);

  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1.5 p-0">
      {challenge.stepCents.map((plannedCents, step) => {
        const recorded = progress.byStep.get(step);
        const done = recorded !== undefined;
        const adjusted = done && recorded.amountCents !== plannedCents;
        const shownCents = recorded?.amountCents ?? plannedCents;
        const disabled = !done && blocked;

        const label = [
          `${capitalise(unit)} ${step + 1}`,
          adjusted
            ? `${moneyExact(shownCents)} recorded of a planned ${moneyExact(plannedCents)}`
            : moneyExact(plannedCents),
          `due ${fullDate(stepDueDate(challenge, step))}`,
        ].join(", ");

        return (
          <li key={step}>
            <button
              type="button"
              aria-pressed={done}
              aria-label={label}
              disabled={disabled}
              onClick={() => onToggle(step, done)}
              className={`flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-[10px] border px-1 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-45 ${
                done
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border bg-surface text-primary enabled:hover:border-secondary enabled:hover:bg-tint-soft/40"
              }`}
            >
              <span aria-hidden className="text-[8.5px] leading-none tracking-[0.08em] opacity-75">
                {step + 1}
              </span>
              <span aria-hidden className="tabular text-[11.5px] leading-none font-medium">
                {money(shownCents)}
                {adjusted && "*"}
              </span>
              {done ? (
                <CheckIcon className="h-3 w-3" />
              ) : (
                <span aria-hidden className="h-3 w-3" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

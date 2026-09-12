"use client";

import { Button } from "./ui/Button";
import { CheckIcon } from "./icons";
import { useGoals } from "@/lib/store/GoalsStore";
import { pendingCelebrations } from "@/lib/store/mutations";
import { money } from "@/lib/money";

/**
 * Shown once when a goal first reaches 100%. The goal itself is left exactly
 * where it is — completing a goal is not a reason to hide it.
 */
export function Celebration() {
  const { data, hydrated, markCelebrated } = useGoals();

  // Marking it celebrated removes it from this list, so the banner clears itself.
  const goal = hydrated ? pendingCelebrations(data)[0] : undefined;
  if (!goal) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-panel bg-forest px-6 py-6 text-cream"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 90% at 88% 10%, rgba(164,181,175,.34), transparent 68%), radial-gradient(34% 80% at 12% 96%, rgba(155,103,79,.30), transparent 70%)",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sage-light">
            <CheckIcon className="h-6 w-6 text-forest" />
          </span>
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-sage-light">
              GOAL ACHIEVED
            </p>
            <h2 className="mt-1 font-display text-[26px] leading-tight font-semibold">
              {goal.emoji ? `${goal.emoji} ` : ""}
              {goal.name} is fully funded.
            </h2>
            <p className="mt-1 text-[13px] text-cream/80">
              {money(goal.targetCents)} saved. It stays on your dashboard — history and all.
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={() => markCelebrated(goal.id)}>
          Lovely
        </Button>
      </div>
    </div>
  );
}

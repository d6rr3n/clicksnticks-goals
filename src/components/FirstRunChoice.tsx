"use client";

import { Button } from "./ui/Button";
import { ArrowRightIcon, TargetIcon } from "./icons";
import { useGoals } from "@/lib/store/GoalsStore";

/**
 * First visit. The demo and the user's own data live in separate storage slots,
 * so exploring the demo can never leave anything behind in a real dataset.
 */
export function FirstRunChoice() {
  const { chooseMode } = useGoals();

  return (
    <section className="rounded-panel bg-surface px-6 py-12 shadow-[0_1px_2px_rgba(36,28,27,.05),0_8px_24px_-12px_rgba(36,28,27,.18)]">
      <div className="mx-auto flex max-w-[46ch] flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-sage-light">
          <TargetIcon className="h-6 w-6 text-forest" />
        </span>

        <p className="mt-5 text-[10px] font-medium tracking-[0.2em] text-sage-deep">
          WELCOME TO GOALS
        </p>
        <h1 className="mt-2 font-display text-[clamp(28px,4vw,38px)] leading-tight font-semibold text-balance">
          Small steps. Big things.
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          Have a look around with some example goals, or start with a clean slate.
          Your own goals are kept separately — nothing from the demo will ever mix
          in with them.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={() => chooseMode("demo")}>
            Explore demo
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" onClick={() => chooseMode("real")}>
            Start fresh
          </Button>
        </div>

        <p className="mt-6 text-[11.5px] text-muted">
          Everything is stored on this device. No account, no cloud.
        </p>
      </div>
    </section>
  );
}

"use client";

import { Button } from "./ui/Button";
import { BotanicalCorner } from "./Botanical";
import { ArrowRightIcon, TargetIcon } from "./icons";
import { useGoals } from "@/lib/store/GoalsStore";

/**
 * First visit. The demo and the user's own data live in separate storage slots,
 * so exploring the demo can never leave anything behind in a real dataset.
 */
export function FirstRunChoice() {
  const { chooseMode } = useGoals();

  return (
    <section className="relative overflow-hidden rounded-panel bg-surface px-6 py-12 elevated">
      <BotanicalCorner className="absolute -top-4 -right-4 h-56 w-auto text-secondary opacity-45" />
      <BotanicalCorner flip className="absolute -bottom-6 -left-6 h-48 w-auto text-secondary opacity-30" />
      <div className="mx-auto flex max-w-[46ch] flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-tint-soft">
          <TargetIcon className="h-6 w-6 text-primary" />
        </span>

        <p className="mt-5 text-[10px] font-medium tracking-[0.2em] text-secondary">
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

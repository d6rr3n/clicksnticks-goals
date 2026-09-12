"use client";

import { longDate } from "@/lib/dates";
import { BotanicalCorner } from "./Botanical";
import { CalendarIcon } from "./icons";

/**
 * The approved dashboard greets by name. There is no account in a local-first
 * app, so the name is a constant until Settings can hold a profile.
 */
const OWNER = "DARREN";

const greetingFor = (hour: number): string =>
  hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";

export function Greeting({ now }: { now: Date }) {
  return (
    <header className="relative overflow-hidden rounded-panel bg-gradient-to-br from-[var(--edition-hero-from)] via-[var(--edition-hero-via)] to-[var(--edition-hero-to)] px-6 pt-6 pb-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(44% 88% at 92% 6%, rgb(var(--edition-wash-a) / .34), transparent 66%), radial-gradient(34% 74% at 70% 0%, rgb(var(--edition-wash-b) / .42), transparent 72%)",
        }}
      />
      <BotanicalCorner className="absolute -top-6 right-0 h-[150%] w-auto text-primary opacity-70" />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] text-secondary">
            {greetingFor(now.getHours())}, {OWNER}
          </p>
          <h1 className="my-2 font-display text-[clamp(30px,4.4vw,46px)] leading-none font-semibold tracking-tight text-balance">
            Small steps. Big things.
          </h1>
          <p className="flex items-center gap-3 text-[10px] tracking-[0.18em] text-muted">
            <span aria-hidden className="h-[1.5px] w-10 shrink-0 bg-secondary" />
            A BRIGHTER FUTURE IS A PLANNED ONE.
          </p>
        </div>

        <p className="tabular inline-flex items-center gap-2.5 rounded-full bg-surface px-4 py-2.5 text-[12.5px] elevated">
          <CalendarIcon className="h-[15px] w-[15px] text-secondary" />
          {longDate(now)}
        </p>
      </div>

      <p className="relative mt-4 inline-block -rotate-[1.4deg] rounded-[3px_12px_4px_14px] bg-surface/86 px-5 pt-2.5 pb-3 font-display text-[17px] italic text-primary">
        Progress over perfection ♡
      </p>
    </header>
  );
}

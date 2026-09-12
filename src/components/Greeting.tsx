import { longDate } from "@/lib/format";
import { TODAY } from "@/lib/goals";
import { CalendarIcon } from "./icons";

export function Greeting() {
  return (
    <header className="relative overflow-hidden rounded-panel bg-gradient-to-br from-[#FBF6F1] via-[#F6E7E1] to-[#EFD3CB] px-6 pt-6 pb-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 86% at 92% 8%, rgba(212,151,144,.44), transparent 66%), radial-gradient(30% 70% at 74% 0%, rgba(219,179,172,.40), transparent 70%)",
        }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-medium tracking-[0.2em] text-rose-deep">
            GOOD MORNING, DARREN
          </p>
          <h1 className="my-2 font-display text-[clamp(30px,4.4vw,46px)] leading-none font-semibold tracking-tight text-balance">
            Small steps. Big things.
          </h1>
          <p className="flex items-center gap-3 text-[10px] tracking-[0.18em] text-muted">
            <span aria-hidden className="h-[1.5px] w-10 shrink-0 bg-rose-deep" />
            A BRIGHTER FUTURE IS A PLANNED ONE.
          </p>
        </div>

        <p className="tabular inline-flex items-center gap-2.5 rounded-full bg-surface px-4 py-2.5 text-[12.5px] shadow-[0_1px_2px_rgba(36,28,27,.05),0_8px_24px_-12px_rgba(36,28,27,.18)]">
          <CalendarIcon className="h-[15px] w-[15px] text-rose-deep" />
          {longDate(TODAY)}
        </p>
      </div>

      <p className="relative mt-4 inline-block -rotate-[1.4deg] rounded-[3px_12px_4px_14px] bg-surface/86 px-5 pt-2.5 pb-3 font-display text-[17px] italic text-rose-deeper">
        Progress over perfection ♡
      </p>
    </header>
  );
}

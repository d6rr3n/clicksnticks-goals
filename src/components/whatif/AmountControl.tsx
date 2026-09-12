"use client";

import { useId } from "react";
import { money, parseAmount, toDollars } from "@/lib/money";

/**
 * A slider and a numeric field over the same value, so a customer can sweep
 * for a feel or type an exact figure. Both stay in sync; the field accepts
 * "$1,250" as readily as "1250".
 */
export function AmountControl({
  label,
  valueCents,
  onChange,
  maxCents,
  stepCents,
  hint,
}: {
  label: string;
  valueCents: number;
  onChange: (cents: number) => void;
  maxCents: number;
  stepCents: number;
  hint?: string;
}) {
  const id = useId();
  const sliderId = `${id}-slider`;
  const fieldId = `${id}-field`;
  const hintId = `${id}-hint`;
  const sliderMax = Math.max(maxCents, stepCents);
  const pct = Math.min(valueCents / sliderMax, 1) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label htmlFor={sliderId} className="text-[11px] font-medium tracking-[0.12em] text-muted">
          {label.toUpperCase()}
        </label>

        <div className="flex items-center gap-2">
          <label htmlFor={fieldId} className="sr-only">
            {label}, exact amount
          </label>
          <span aria-hidden className="text-[15px] text-muted">
            $
          </span>
          <input
            id={fieldId}
            inputMode="decimal"
            aria-describedby={hint ? hintId : undefined}
            value={valueCents === 0 ? "" : String(toDollars(valueCents))}
            placeholder="0"
            onChange={(e) => {
              const parsed = parseAmount(e.target.value === "" ? "0" : e.target.value);
              if (parsed !== null) onChange(Math.max(parsed, 0));
            }}
            className="tabular w-28 rounded-[10px] border border-border bg-surface px-3 py-2 text-right text-[15px] font-medium text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          />
        </div>
      </div>

      <input
        id={sliderId}
        type="range"
        min={0}
        max={sliderMax}
        step={stepCents}
        value={Math.min(valueCents, sliderMax)}
        aria-valuetext={money(valueCents)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer appearance-none bg-origin-content focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-secondary [&::-moz-range-thumb]:bg-surface [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-secondary [&::-webkit-slider-thumb]:bg-surface"
        style={{
          background: `linear-gradient(90deg, var(--edition-secondary) 0 ${pct}%, var(--edition-track) ${pct}%)`,
          backgroundSize: "100% 4px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: "999px",
        }}
      />

      {hint && (
        <p id={hintId} className="text-[11.5px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

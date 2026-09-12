"use client";

import { useId } from "react";

/**
 * Wraps a control with its label, optional hint and error. The error is tied to
 * the input with aria-describedby so screen readers announce it.
 */
export function Field({
  label,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline gap-2 text-[11px] font-medium tracking-[0.12em] text-muted">
        {label.toUpperCase()}
        {optional && <span className="font-normal tracking-normal lowercase opacity-70">optional</span>}
      </label>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-[11.5px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[11.5px] font-medium text-warning">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Shared control styling. Deliberately does NOT set outline-none: doing so
 * silently removed the global focus ring from every input, select and
 * textarea in the app.
 */
/**
 * Chromium focuses a date input's inner segments rather than the control, so
 * :focus-visible never matches the element itself. focus-within is scoped to
 * date fields only, so mouse users don't get a ring on every text field.
 */
export const dateInputClass = (invalid?: boolean) =>
  `${inputClass(invalid)} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-secondary`;

export const inputClass = (invalid?: boolean) =>
  `w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-[14px] text-primary transition-colors placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
    invalid ? "border-warning" : "border-border focus:border-secondary"
  }`;

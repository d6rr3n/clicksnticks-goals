"use client";

import { useEffect, useRef } from "react";

/**
 * Built on the native <dialog> element, which brings focus trapping, Escape to
 * close and inertness of the page behind it without any extra dependency.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  labelledBy = "dialog-title",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicking the backdrop, i.e. the dialog element itself, closes it.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,460px)] rounded-panel border border-border bg-surface p-0 text-primary backdrop:bg-primary/45"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 id={labelledBy} className="font-display text-[22px] font-semibold">
            {title}
          </h2>
          {description && (
            <p className="text-[13px] leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}

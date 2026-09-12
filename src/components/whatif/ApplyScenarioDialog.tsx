"use client";

import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

/**
 * Applying a scenario is deliberate and reversible-looking: every field that
 * would change is named, old value beside new, and nothing happens until the
 * customer confirms. Applying never moves money and never writes a
 * contribution — it only edits the goal's plan.
 */

export interface PendingChange {
  label: string;
  from: string;
  to: string;
}

export function ApplyScenarioDialog({
  open,
  goalName,
  changes,
  onClose,
  onConfirm,
}: {
  open: boolean;
  goalName: string;
  changes: PendingChange[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Update ${goalName}?`}
      description="This changes your saving plan for this goal. It doesn't move any money or add a contribution."
      labelledBy="apply-scenario-title"
    >
      <ul className="flex list-none flex-col gap-2.5 rounded-card bg-surface-alt p-4">
        {changes.map((c) => (
          <li key={c.label} className="flex flex-col gap-0.5">
            <span className="text-[9.5px] font-medium tracking-[0.14em] text-muted">
              {c.label.toUpperCase()}
            </span>
            <span className="tabular flex flex-wrap items-baseline gap-2 text-[14px]">
              <span className="text-muted line-through">{c.from}</span>
              <span aria-hidden className="text-secondary">
                →
              </span>
              <span className="font-semibold text-primary">{c.to}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onConfirm}>Apply to goal</Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

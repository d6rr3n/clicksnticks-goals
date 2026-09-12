"use client";

import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { explainChallengeDeletion } from "@/lib/explain";

/**
 * Deleting a challenge takes the money it recorded with it, so the amount is
 * named before anything happens and archiving is offered in the same breath.
 * Rewriting financial history is always a deliberate choice here, never a
 * side effect of tidying up.
 */
export function DeleteChallengeDialog({
  open,
  name,
  goalName,
  savedCents,
  onClose,
  onArchive,
  onConfirm,
}: {
  open: boolean;
  name: string;
  goalName: string;
  savedCents: number;
  onClose: () => void;
  onArchive: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="delete-challenge-title"
      title={`Delete ${name}?`}
      description={explainChallengeDeletion(savedCents, goalName)}
    >
      <div className="flex flex-wrap gap-2.5">
        <Button variant="danger" onClick={onConfirm}>
          Delete and remove the money
        </Button>
        {savedCents > 0 && (
          <Button variant="secondary" onClick={onArchive}>
            Archive instead
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

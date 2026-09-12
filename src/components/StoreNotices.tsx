"use client";

import { useState } from "react";
import Link from "next/link";
import { useGoals } from "@/lib/store/GoalsStore";

/**
 * Demo banner and storage warnings. Kept honest: local-only data really can be
 * lost, and saying so is better than implying a durability we can't provide.
 */
export function StoreNotices() {
  const { mode, hydrated, writeError, recovered, startFresh, resetDemo } = useGoals();
  const [confirmFresh, setConfirmFresh] = useState(false);

  if (!hydrated) return null;

  return (
    <>
      {mode === "demo" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-sage-deep/25 bg-sage-light/50 px-4 py-3 text-[12.5px] text-forest">
          <b className="text-[9.5px] font-medium tracking-[0.14em]">DEMO DATA</b>
          <span className="text-muted">
            Example goals, safe to change. Your own goals are kept separately.
          </span>
          <span className="ml-auto flex flex-wrap gap-3">
            <button type="button" onClick={resetDemo} className="text-sage-deep hover:underline">
              Reset demo
            </button>
            {confirmFresh ? (
              <span className="flex items-center gap-2">
                <span className="text-muted">Start empty? Demo data isn&apos;t carried over.</span>
                <button type="button" onClick={startFresh} className="font-medium text-sage-deep hover:underline">
                  Yes, start fresh
                </button>
                <button type="button" onClick={() => setConfirmFresh(false)} className="text-muted hover:underline">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmFresh(true)}
                className="font-medium text-sage-deep hover:underline"
              >
                Start fresh
              </button>
            )}
          </span>
        </div>
      )}

      {writeError && (
        <p role="alert" className="rounded-card border border-terracotta-deep/30 bg-blush px-4 py-3 text-[12.5px] text-terracotta-deep">
          {writeError === "quota"
            ? "This device is out of storage space, so recent changes haven't been saved. Removing a goal image usually frees enough."
            : "Changes can't be saved on this device — private browsing blocks local storage. They'll be lost when you close this tab."}
        </p>
      )}

      {recovered === "corrupt" && (
        <p role="alert" className="rounded-card border border-terracotta-deep/30 bg-blush px-4 py-3 text-[12.5px] text-terracotta-deep">
          Saved data couldn&apos;t be read and has been set aside rather than deleted.
          You&apos;re starting from an empty list.
        </p>
      )}

      {recovered === "future-version" && (
        <p role="alert" className="rounded-card border border-terracotta-deep/30 bg-blush px-4 py-3 text-[12.5px] text-terracotta-deep">
          Your saved data was written by a newer version of this app, so it hasn&apos;t
          been opened. Update to see it. <Link href="/" className="underline">Reload</Link>
        </p>
      )}
    </>
  );
}

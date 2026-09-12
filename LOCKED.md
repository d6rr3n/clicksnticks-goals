# Locked systems

These are approved and signed off. **Do not redesign or rewrite them.** The only
reason to change locked code is a genuine bug — and then the fix should be the
smallest one that works, with a regression test.

Checkpoints: `Forecast + What If approved` (tag `checkpoint/forecast-what-if`),
then `Smart Allocation approved`.

## Locked at this checkpoint

| System | Where it lives |
| --- | --- |
| Forecast calculation engine | `src/lib/calc.ts`, `src/lib/forecast.ts` |
| Forecast page structure | `src/app/forecast/`, `src/components/forecast/` |
| What If simulator structure | `src/components/whatif/WhatIfSimulator.tsx`, `src/app/what-if/` |
| What If scenario behaviour | `simulateExtra`, `simulateLumpSum`, `requiredRate` |
| Apply-to-goal confirmation flow | `src/components/whatif/ApplyScenarioDialog.tsx` |
| Sage Edition visual system | `src/app/globals.css`, `reference/README.md` |
| Navigation | `src/components/Sidebar.tsx` |
| Goal CRUD and persistence | `src/lib/store/`, `src/lib/schema.ts` |
| Date and currency architecture | `src/lib/dates.ts`, `src/lib/money.ts` |
| Smart Allocation engine | `src/lib/allocate.ts` |
| Smart Allocation page and apply flow | `src/app/allocate/`, `src/components/allocate/` |
| Atomic batch write | `addContributions` in `src/lib/store/mutations.ts` |

## Invariants these systems rely on

Breaking any of these is a regression, not a refactor.

1. **One forecast engine.** The portfolio is walked monthly in `calc.ts`; the
   dashboard's yearly series is a sample of that walk, pinned by a golden test.
   Do not add a second walker.
2. **One definition of duration.** Everything goes through `monthsToClear`, so a
   scenario cannot disagree with a projection.
3. **The ledger is the only record of money.** Balance is opening balance plus
   contributions. Nothing financial is stored twice.
4. **Money is integer cents.** Never floats.
5. **Dates are date-only strings parsed at local noon.** Never `toISOString()`
   for a displayed date — it reports the UTC day and is wrong east of UTC.
6. **Weekly and fortnightly convert at 52 and 26 payments a year**, not 4 and 2
   a month. The monthly-average model is the V1 approach; no competing
   discrete-payment engine.
7. **Required rates round up.** Rounding down leaves the target short.
8. **Scenarios never write.** Applying is separate, explicit and confirmed, and
   edits the goal's plan only — it never moves money or creates a contribution.
   Lump sums are not appliable at all.
9. **Colour never carries status alone.** Success and warning sit 1.31:1 apart
   in luminance; every status also carries a label and an icon.
10. **No component holds a colour.** Only semantic tokens.
11. **Real calculations take precedence** over the mockup's illustrative
    figures. A surprising result gets explained, never adjusted.

## Verification before any change to locked code

```bash
npm run build
npx eslint src scripts --max-warnings=0
TZ=UTC npm test
TZ=Australia/Sydney npm test
```

All four must pass. The Sydney run is not optional: two real bugs in this
codebase only appeared east of UTC.

## Not yet built

Challenges, Calendar, Insights, additional Editions, cloud accounts,
authentication, bank connections, notifications, AI features.

## The one tunable number

`CATCH_UP_SHARE` in `src/lib/allocate.ts` is **product policy, not a financial
rule**. No arithmetic makes 70% correct — it is a decision about how the plan
should feel, approved for V1 and meant to be tuned. Raising it sends more to
struggling goals; lowering it spreads the plan more evenly. Nothing else
depends on the value, so changing it alters emphasis, never correctness.

Everything else in this file is an invariant. This one is a dial.

## Smart Allocation invariants

12. **Target size is never an allocation factor.** Weight decides the share;
    need caps it.
13. **The catch-up pass takes at most 70%** of the money, so a plan always
    spreads.
14. **The weighting never reaches the customer.** Reasons state the fact, never
    a score. A test asserts no explanation contains a weight, score, factor or
    multiplier.
15. **Applying is atomic.** The whole batch lands in one commit, or none of it
    does.
16. **Smart Allocation never invents money.** Every dollar is either allocated
    or shown as unallocated.

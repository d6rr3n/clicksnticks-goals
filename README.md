# Clicks'n'Ticks GOALS

Savings goal tracker. Plan, save, achieve.

> **[LOCKED.md](LOCKED.md)** lists the systems that are approved and signed off,
> the invariants they rely on, and the checks to run before touching them.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · local-first, no backend.
No runtime dependencies beyond the framework.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm test        # node:test, native TypeScript, no test framework
npx eslint src  # lint
```

## Layout

```
src/
  app/           routes — dashboard, goals index/detail/new/edit, section stubs
  components/    shell, cards, forms, dialogs, dashboard widgets, icon set
  lib/
    schema.ts    persisted shapes; money is integer cents
    calc.ts      every derived figure
    validate.ts  field validation
    money.ts     parsing, cents/dollars, formatting
    dates.ts     date-only handling and month arithmetic
    demo.ts      the demo dataset seed
    store/       persistence, mutations, React binding, image store
scripts/         test resolver hook
reference/       approved design assets and the palette they define
```

## Editions

One engine, one component system, one calculation engine, one data model, with
interchangeable visual themes. Components reference **semantic tokens only** —
`primary`, `secondary`, `accent`, `surface`, `success`, `warning`, `border` and
so on. No component holds a colour.

Each edition is one block of custom properties in `src/app/globals.css`:

- **Sage Edition** — default, the shipping product
- **Blush Edition** — the rose treatment, preserved for a future release

Switch by changing `EDITION` in `src/app/layout.tsx`, which sets `data-edition`
on `<html>`. An edition changes no calculation, no stored data, no navigation
and no behaviour. Adding one means adding one selector block and nothing else.

`reference/README.md` holds the approved palette and its measured contrast.
Two rules the code enforces:

- **Decorative tints are never text and never progress fills.** Sage, Soft Peach
  and Warm Beige all fall under 3:1. Fills use `success`, `warning` or `primary`.
- **Colour never carries status alone.** Success and warning sit 1.31:1 apart in
  luminance, so every status also carries a label and an icon.

## Goal artwork

A goal renders, in order: the user's photograph (stored on-device in IndexedDB),
otherwise a category illustration drawn as inline SVG from edition tokens. The
illustration themes with the product, needs no network request, and cannot fail
to load, so a missing image never breaks the layout.

## Forecast and What If

**One forecast engine.** The portfolio is walked a month at a time in
`calc.ts`, recording a milestone where each goal lands. The dashboard's yearly
series is a *sample* of that walk, pinned by a golden test so it cannot drift.

**One definition of "how long".** Projections and every What If scenario go
through `monthsToClear`, so a scenario can never disagree with the projection
shown elsewhere.

**Weekly and fortnightly convert at 52 and 26 payments a year** (`PER_MONTH`),
not 4 and 2 a month. This monthly-average model is the V1 approach; there is
deliberately no competing discrete-payment engine.

A goal's state is a typed union — `complete`, `unable` (no contribution set) or
`projected` — so the UI never blurs "finished" with "cannot be projected".

### Scenarios (`forecast.ts`)

Nothing in that file writes. Scenarios are exploratory; applying one is a
separate, explicit action that edits the goal's plan and **never moves money or
writes a contribution**. Lump sums are therefore not appliable at all — they
point at Quick Add instead.

`requiredRate` solves backwards from a date, counting payments the same way the
forward projection counts them. **Every required figure rounds up**: rounding
down would leave the target short by cents.

### Explanations (`explain.ts`)

Plain sentences built deterministically from the numbers. Nothing is generated
or phrased by a model. Tests assert the sentences never leak internal
vocabulary, and that surprising results are explained rather than softened.

## How the data works

**The contribution ledger is the only record of money.** A goal stores an
opening balance; its current balance is that plus every contribution against it.
Nothing financial is stored twice, so editing or deleting a contribution cannot
leave a stale total anywhere.

**Money is integer cents.** A ledger that is summed, edited and re-summed would
otherwise drift on floats.

**Status is derived, never stored.** `statusOf` compares the planned
contribution rate against the target date. `completedAt` is the one cached value
and is reconciled after every mutation, so deleting a contribution or raising a
target correctly un-completes a goal.

## Persistence

Local-first. A single versioned envelope per dataset in `localStorage`, written
whole. Goal images go to IndexedDB, since a few photos would exhaust the
localStorage budget and take the goals with them.

Unreadable data is quarantined to a separate key rather than deleted. A dataset
written by a newer schema version is refused rather than guessed at. Quota and
permission failures are reported to the user, not thrown.

Demo and real data occupy separate keys. The mode selects one slot for every
read and write; no code path reads one and writes the other, and leaving the
demo never migrates its data.

There is no account, no cloud and no sync. Data survives refresh, browser
restart and PWA restart — but not clearing site data or private browsing, and
the UI says so rather than implying otherwise.

## Not built yet

Challenges, Calendar, Insights and Settings are stub routes. The dashboard's
challenge card is a static preview, deliberately not half-wired to the engine.

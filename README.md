# Clicks'n'Ticks GOALS

Savings goal tracker. Plan, save, achieve.

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

## Design

`reference/README.md` is the source of truth for colour — the Sage/Botanical
GOALS colourway. Two rules the code enforces:

- **Mid sage is never a progress fill.** At 2.25:1 against the track it does not
  read as a bar. Fills use `sage-deep`, `forest` or `terracotta-deep`.
- **Colour never carries status alone.** `sage-deep` and `terracotta-deep` sit
  1.11:1 apart in luminance, so every status also carries a label and an icon.

Palette lives in `src/app/globals.css` as Tailwind v4 `@theme` tokens.

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

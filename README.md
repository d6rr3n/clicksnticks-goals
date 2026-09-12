# Clicks'n'Ticks GOALS

Savings goal tracker. Plan, save, achieve.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · no runtime dependencies
beyond the framework.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npx eslint src  # lint
```

## Layout

```
src/
  app/           routes — dashboard (/), goals index and detail, section stubs
  components/    shell, cards, dashboard widgets, icon set
  lib/           types, fixtures, goal maths, formatters
reference/       approved design assets and the palette they define
```

## Design

`reference/README.md` is the source of truth for colour. Two rules the code
depends on:

- **Brand rose is never a progress fill.** At 1.78:1 against the track it does
  not read as a bar. Fills use `rose-deep`, `rose-deeper` or `clay`.
- **Colour never carries status alone.** `rose-deep` and `clay` sit 1.12:1 apart
  in luminance, so every status also carries a label and an icon.

Palette lives in `src/app/globals.css` as Tailwind v4 `@theme` tokens. No
hardcoded hex values in components.

## Data

`src/lib/data.ts` holds typed fixtures. Goal status is **derived** in
`src/lib/goals.ts` from progress against elapsed timeline, never stored — a goal
is "behind" when it trails its own pace by more than 10 percentage points.
Swapping fixtures for a real store should touch only `data.ts`.

## Not built yet

Challenges, Calendar, Insights and Settings are stub routes so the navigation
never dead-ends. Adding or editing goals is not wired up — the fixtures are
read-only.

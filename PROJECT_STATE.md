# GOALS project state

Last updated: 12 September 2026

## Status

**Challenges V1 implemented, first review round addressed. Waiting for
product review.**

The planning checkpoint for issue #1 was approved with three changes; review
round one requested three more. All six are implemented. The issue stays open
until Darren and ChatGPT have reviewed the result.

## Approved and locked

See `LOCKED.md` for the authoritative detail.

Current major approved systems include:

- core goal CRUD and local persistence;
- Sage Edition visual system;
- Forecast;
- What If;
- Smart Allocation;
- atomic Smart Allocation apply flow.

Smart Allocation approval commit: `723c85cf488eb448592f6f106dc7047fd12d94a4`.
The approved demo allocation remains $780 New Car / $120 House Deposit /
$100 Japan Trip. `CATCH_UP_SHARE` is documented as a tunable V1
product-policy dial, not a mathematical truth.

## Latest implementation — Challenges V1 (not yet reviewed)

Commits on `claude/sharp-goldberg-vd8esd`, oldest first:

| Commit | What it does |
| --- | --- |
| `c361ca7` | Challenge data model, persistence and store transitions |
| `f31279b` | Generation, explanations, validation and tests |
| `cc97ec4` | Challenges pages and the real dashboard card |
| `defd779` | Two copy fixes found by opening the pages |
| `18a75c9` | First `PROJECT_STATE.md` / `LOCKED.md` update |
| `e1ae4c2` | The three fixes from the first review round |

**Design.** A challenge stores a schedule, never a balance. Which steps are
ticked and how much has been saved are both derived from the contribution
ledger, so there is no second set of books. `Contribution.source`
(`{challengeId, step}`) is the only thing used to find, count or reverse a
challenge contribution — never the amount, date or note.

**The three approved changes, as implemented.**

1. A ticked step is dated today, not backdated to its scheduled due date. The
   due date stays derivable from the challenge and is shown separately.
2. A funded or archived goal pauses ticking and shows "Goal funded". Existing
   steps are untouched, unticking stays available, and ticking resumes if the
   goal drops back below its target.
3. The suggested sprint target is one month of the goal's own plan plus at
   most one further month of catch-up, never more than the goal still needs.
   A goal with no planned rate gets no suggestion; the customer names the
   amount.

**Schema.** Still version 1. Every addition is optional or defaulted, so
existing datasets load unchanged, and a bump would have sent them through the
future-version quarantine path in any older build.

**Locked files touched**, limited to the four additive changes approved at the
checkpoint: `schema.ts`, `storage.ts`, `GoalsStore.tsx`, `mutations.ts`.
Forecast, What If and Smart Allocation algorithms are unchanged.

### Review round one — three changes requested, all made in `e1ae4c2`

1. **Restore could break one-challenge-per-goal.** Archive a challenge, start
   a replacement, restore the first, and the goal had two running. Restore is
   now refused while another is running and says why. The replacement is never
   archived or deleted to make room.
2. **A step could overshoot a nearly funded goal.** `completeStep` checked only
   whether the goal was already complete, so a $10 step against a $5 shortfall
   recorded the full $10. It is now capped at what the goal needs: the goal
   lands exactly on target, the step keeps its own link so it reverses
   normally, and the grid marks it as differing from the plan.
3. **The approved edit lifecycle was not in the UI.** `/challenges/[id]/edit`
   now offers name and start date always, and the schedule only until a step
   has recorded money — after which the controls are gone and the page
   explains why.

The asterisk in the grid can now mean two things, so its footnote names both.

### Verification at `e1ae4c2`

- `npm run build` — clean, 17 routes.
- `npx eslint src scripts --max-warnings=0` — clean.
- `TZ=UTC npm test` — 410 tests, 410 pass.
- `TZ=Australia/Sydney npm test` — 410 tests, 410 pass.

130 of those tests are new (280 → 410) and cover the brief's list: $1,378 in both
directions, cent-perfect custom totals, deterministic generation, one
contribution per step, no duplication on repeat ticks or reload, reversal that
touches only its own linked row, ineligible goals refused, the funded and
archived edge cases, edit and delete integrity, forecast impact, and
persistence across a reload including data written before challenges existed.

The pages were also driven in a real browser at desktop and 390px: no console
or page errors, no horizontal overflow, and each of the three review fixes
confirmed end to end — a $1,500 step recorded as the $80 the goal actually
needed and landing it exactly on target, restore disabled with its
explanation while a replacement runs and re-enabled once that is archived,
and the edit form both locked and open.

## Not yet built

- Calendar
- Insights
- additional Editions
- cloud accounts/authentication
- licensing
- bank connections
- notifications
- AI features

## Current product decision

Do **not** jump to DEBT development and do **not** start licensing
implementation yet. GOALS should retain its clean build sequence.

Licensing/delivery will later be designed as a shared Clicks'n'Ticks platform
layer that can serve GOALS, DEBT and future products.

## Next action

**Product review of Challenges V1.** No further implementation phase is
authorised. Issue #1 remains open and carries the planning checkpoint and the
completion report.

## Handoff rule

Claude: read `AI_HANDOFF.md`, `LOCKED.md`, this file, and the newest open
`[CLAUDE TASK]` issue before starting approved work. Post planning
checkpoints, questions and completion reports on the relevant task issue, not
only in chat.

ChatGPT: inspect current commits/repository state directly rather than asking
Darren to paste Claude implementation reports when GitHub contains the
information.

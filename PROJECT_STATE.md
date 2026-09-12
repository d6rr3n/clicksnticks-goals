# GOALS project state

Last handoff setup: 12 September 2026

## Status

**Waiting for product review / next approved phase.**

Smart Allocation has been implemented, reviewed and approved for V1.

## Approved and locked

See `LOCKED.md` for the authoritative detail.

Current major approved systems include:

- core goal CRUD and local persistence;
- Sage Edition visual system;
- Forecast;
- What If;
- Smart Allocation;
- atomic Smart Allocation apply flow.

## Latest approved implementation

Smart Allocation approval commit:

`723c85cf488eb448592f6f106dc7047fd12d94a4`

The approved demo allocation remains $780 New Car / $120 House Deposit / $100 Japan Trip. `CATCH_UP_SHARE` is documented as a tunable V1 product-policy dial, not a mathematical truth.

Reported verification at that checkpoint:

- build clean;
- lint clean;
- 280 tests green under UTC;
- 280 tests green under Australia/Sydney.

## Not yet built

- Challenges
- Calendar
- Insights
- additional Editions
- cloud accounts/authentication
- licensing
- bank connections
- notifications
- AI features

## Current product decision

Do **not** jump to DEBT development and do **not** start licensing implementation yet. GOALS should retain its clean build sequence.

Licensing/delivery will later be designed as a shared Clicks'n'Ticks platform layer that can serve GOALS, DEBT and future products.

## Next action

No next implementation phase is authorised in this file yet.

Wait for Darren/ChatGPT product direction. A new approved implementation brief may arrive as an open GitHub issue titled `[CLAUDE TASK] ...`.

## Handoff rule

Claude: read `AI_HANDOFF.md`, `LOCKED.md`, this file, and the newest open `[CLAUDE TASK]` issue before starting approved work.

ChatGPT: inspect current commits/repository state directly rather than asking Darren to paste Claude implementation reports when GitHub contains the information.
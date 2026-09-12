# AI handoff workflow

This repository is shared by three roles:

- **Darren** — product owner. He makes final product decisions and approves major direction.
- **ChatGPT** — product/design/QA reviewer. It can read this GitHub repository, inspect commits and diffs, and create GitHub issues containing approved work instructions.
- **Claude Code** — implementation engineer. It builds, tests, commits and pushes approved work.

The goal of this workflow is to stop Darren having to copy implementation reports and screenshots between assistants.

## Session start

Before changing code, Claude must read:

1. `LOCKED.md`
2. `PROJECT_STATE.md`
3. the newest open GitHub issue whose title begins `[CLAUDE TASK]`, if one exists

`LOCKED.md` overrides any casual refactor impulse. Approved systems stay locked unless a genuine bug requires the smallest safe fix with a regression test.

## Task handoff

When Darren approves a new phase, ChatGPT may create a GitHub issue titled:

`[CLAUDE TASK] <short task name>`

That issue is the implementation brief and source of truth for the task.

Darren should normally only need to tell Claude:

> Check GitHub for your next task.

Claude should then:

1. find the newest open `[CLAUDE TASK]` issue;
2. read it fully;
3. inspect the current repository before coding;
4. obey any explicit planning/review checkpoint in the issue;
5. implement only the approved scope;
6. run the required verification;
7. commit and push;
8. update `PROJECT_STATE.md` with the result;
9. stop when the issue says to stop.

Do not begin the next product phase automatically.

## Review handoff

After Claude pushes work, Darren can tell ChatGPT something as short as:

> Claude is finished. Review it.

ChatGPT can inspect the commits and repository directly from GitHub. Darren should not need to paste Claude's implementation report unless there is something visible only in Claude's local preview.

For visual review, Claude should save useful screenshots into a repository-accessible review location when practical, or provide a preview/deployment URL. Screenshots should be treated as review artefacts, not product assets, unless explicitly approved.

## `PROJECT_STATE.md`

Claude owns the implementation-status updates in `PROJECT_STATE.md` after each approved task. Keep it concise and factual. It should contain:

- current phase/status;
- latest approved checkpoint;
- latest implementation commit(s);
- test/build status;
- unresolved product decisions;
- next action, if approved;
- explicit note when the project is waiting for Darren/ChatGPT review.

Do not turn it into a diary.

## GitHub issue lifecycle

A `[CLAUDE TASK]` issue remains open while implementation or review changes are outstanding.

Claude should not close a task merely because code was pushed if the brief requires product review first. After approval, the issue can be closed and the approved state recorded in `LOCKED.md` or `PROJECT_STATE.md` as appropriate.

## Safety rails

- Never rewrite locked systems just to make a new feature easier.
- Never silently change financial rules or product-policy constants.
- Never use illustrative mockup numbers in place of real calculations.
- Never start licensing/auth/cloud work unless separately approved.
- Never start another feature because the current one finished early.
- Prefer small, reviewable commits.
- Build, lint and test before declaring a phase complete.
- Preserve the established UTC and `Australia/Sydney` test discipline.

## Human remains in charge

GitHub is the shared handoff layer, not permission for autonomous product decisions. If a requirement materially changes user behaviour, financial logic, privacy, licensing, pricing, product scope or locked architecture, stop and request approval.
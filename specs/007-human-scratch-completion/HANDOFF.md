# HANDOFF — active dispatch routing

**This file is a router only.** `HANDOFF.md` is a single slot and root once ran two reviews at once,
overwriting one brief with another 17 minutes later. Every brief now lives at a stable path and this
table only points at it.

| package | agent | subject | dispatch |
| --- | --- | --- | --- |
| **P20B rev 08** (remediate F-A/F-B/F-C) | `p20b-implementer-08` | **ACTIVE — implementing** | `dispatches/P20B-rev08-fix.md` |
| ~~P20B rev 07 review~~ | ~~`p20b-reviewer-07`~~ | **FAIL** on F-A — `reviews/P20B-review-07.md`, persisted `0e08862` | closed |
| ~~P21 rev 07 implement~~ | ~~`p20b-implementer-07`~~ | handed back `c515173`; campaign closed 10/10, bar not met | `dispatches/P21-rev07-fix.md` |
| ~~P21 rev 06~~ | ~~collector + reviewer~~ | **FAILED** on the E2E stability clause — `reviews/P21-review-06.md` | closed |

## Active revision — literal values

- **Package / revision:** P20B, revision 08.
- **BASE for the fix:** re-derive with `git rev-parse HEAD`. **Review range for the successor:**
  original package BASE `c15be1289bad2c9743f8d7169e2048dc65f5c0ac` through the newest HEAD.
- **Authorized implementation paths:** `tests/e2e/people-settlement.spec.ts` (F-B),
  `.claude/skills/e2e/SKILL.md` (F-C). **No product code.**
- **Evidence file (write, do NOT commit — root persists it per `PROCESS.md:58`):**
  `evidence/P20B/implementation-09.md`. The filename runs one ahead of the revision number; this is
  the known P20B evidence-filename skew, not an error.
- **Exact future review path:** `reviews/P20B-review-08.md`.
- **Reviewer distinctness for the next dispatch:** must differ from `p20b-implementer-08` and from
  `p20b-reviewer-01`, `-02`, `-03`, `-06`, `-07`.

**Read the dispatch file, not this table.** It carries the finding detail, the out-of-scope
boundary and the instrument-hazard register.

## Standing, not assigned to this revision

- **The residual settlement failure class and F-2 are UNOWNED tracked risks** (`Q-P20B-26`). Rev 06
  routed the settlement class to P20B as a test-instrument defect; the rev 07 reviewer refuted that
  diagnosis structurally. **Root is measuring the mechanism before any ownership ruling** — the
  discriminating experiment is to read persisted IndexedDB state after a barrier-confirmed
  allocation write and a navigation: entry absent → lost write (P16A–E); entry present but unapplied
  → rehydration/derivation.
- **P21 remains the only package row not `passed`**, at revision 07. All 34 requirement rows are
  `passed`. `FINAL-AUDIT.md` is still `queued` with no verdict.

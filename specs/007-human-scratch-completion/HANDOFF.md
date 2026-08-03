# HANDOFF — active dispatch routing

**This file is a router only.** `HANDOFF.md` is a single slot and root once ran two reviews at once,
overwriting one brief with another 17 minutes later. Every brief now lives at a stable path and this
table only points at it.

| package                                                    | agent                     | subject                                                             | dispatch                          |
| ---------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------- | --------------------------------- |
| **P21 rev 07** (E2E stability fix, executed in P20B files) | `p20b-reviewer-07`        | **ACTIVE — independent review**                                     | `dispatches/P20B-rev07-review.md` |
| ~~P21 rev 07 implement~~                                   | ~~`p20b-implementer-07`~~ | handed back at `c515173`; campaign closed 10/10                     | `dispatches/P21-rev07-fix.md`     |
| ~~P21 rev 06~~                                             | ~~collector + reviewer~~  | **FAILED** on the E2E stability clause — `reviews/P21-review-06.md` | closed                            |

## Active review — literal values, re-derived by root at dispatch time

- **Package / revision:** P20B, revision 07. **Evidence file (already on disk, UNCOMMITTED by design
  per `PROCESS.md:58`):** `evidence/P20B/implementation-08.md` — the filename runs one ahead of the
  revision number; this is the known P20B evidence-filename skew, not an error.
- **Exact review output path (the ONLY file you may write):** `reviews/P20B-review-07.md`
- **BASE:** `c15be1289bad2c9743f8d7169e2048dc65f5c0ac`
- **Product/test HEAD (the reviewed subject):** `c5151734899af13cbc6f5a468bd7a3b2d2738911`
- **Newest HEAD including root control commits:** re-derive with `git rev-parse HEAD`.
- **Distinctness requirement:** `p20b-reviewer-07` must be distinct from `p20b-implementer-07` and
  from `p20b-reviewer-01`, `-02`, `-03`, `-06`.

**Read `dispatches/P20B-rev07-review.md`, not this table.** It carries the scope, the press-hardest
list, the expected-not-findings and the instrument-hazard register.

**Re-verify ancestry before reading a line of diff.** An ancestry check is valid only for the
instant it ran. Root has stated a wrong BASE twice in this goal, both times caught by the reviewer
it was handed to.

**Next after this verdict:** root persists the evidence and review in one exact-path
integration-control commit, then resolves the P20B/HS-021 status question recorded in PROGRESS, then
re-opens P21 rev 08 from a fresh BASE.

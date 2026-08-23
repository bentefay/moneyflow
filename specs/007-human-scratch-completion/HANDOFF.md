# HANDOFF — active dispatch routing

**This file is a router only.** `HANDOFF.md` is a single slot and root once ran two reviews at once,
overwriting one brief with another 17 minutes later. Every brief now lives at a stable path and this
table only points at it.

| package                  | agent                     | subject                                                                                                                                                                 | dispatch                      |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| ~~P20B rev 13 review~~   | ~~`p20b-reviewer-13`~~    | **PASS**, no findings — `reviews/P20B-review-13.md`, evidence `evidence/P20B/implementation-14.md`, integration-control `13bffbf`; D-025 Component 1 remediation closed | closed                        |
| ~~P20B rev 07 review~~   | ~~`p20b-reviewer-07`~~    | **FAIL** on F-A — `reviews/P20B-review-07.md`, persisted `0e08862`                                                                                                      | closed                        |
| ~~P21 rev 07 implement~~ | ~~`p20b-implementer-07`~~ | handed back `c515173`; campaign closed 10/10, bar not met                                                                                                               | `dispatches/P21-rev07-fix.md` |
| ~~P21 rev 06~~           | ~~collector + reviewer~~  | **FAILED** on the E2E stability clause — `reviews/P21-review-06.md`                                                                                                     | closed                        |

## No dispatch currently routed

- **Most recently closed:** P20B revision 13 — **PASS, no findings**. Review
  `reviews/P20B-review-13.md`; evidence `evidence/P20B/implementation-14.md`; integration-control
  commit `13bffbf`.
- **Current route:** none. No package/revision, BASE, authorized implementation paths, evidence
  path, review path or reviewer-distinctness set is currently assigned.
- **Next action:** re-open P21 from a fresh BASE with a fresh distinct collector and reviewer per
  `PROCESS.md` §P21. The literal BASE and artifact paths must be derived when root performs the next
  dispatch; they are intentionally not invented here.
- **Dispatch precondition:** before spawning either agent, root must rewrite this block with the
  literal fields required by `PROCESS.md:74-76`.

**When a route exists, read the dispatch file, not this table.** It carries the finding detail, the
out-of-scope boundary and the instrument-hazard register.

## Standing, not assigned to the next revision

- **The lost-write class is split and classified by D-025.** Component 1 — E2E harness
  navigation/durability fidelity — was in-goal to P20B and its revision 07→13 remediation chain is
  delivered and independently reviewed. Component 2 — durability-at-acknowledgement — remains an
  open, out-of-goal tracked risk as `R-LOSTWRITE-01`; its reproduction is preserved and no
  crash-safe durability claim is authorized.
- **P21 remains the only package row not `passed`**, at revision 07. All 34 requirement rows are
  `passed`. `FINAL-AUDIT.md` is still `queued` with no verdict.

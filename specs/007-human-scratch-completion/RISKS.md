# Risk Register

| ID    | Area        | Risk                                                                                                        | Mitigation / required evidence                                                               | Status |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| R-001 | Worktree    | User-owned scratch edits or unrelated dirty work are overwritten/staged                                     | Exact dirty inventory; apply_patch; exact-path staging; no broad resets/adds                 | open   |
| R-002 | Scope       | Scratch changes after freeze are silently missed or absorbed                                                | Verify checksum at P00 and package boundaries; semantic drift log                            | open   |
| R-003 | Security    | Service-role access or incorrect RLS gives false isolation confidence                                       | Threat model, malicious cross-vault integration tests, least privilege                       | open   |
| R-004 | Realtime    | Client subscribes to legacy table or unauthenticated channels                                               | Correct vault_ops source, short-lived auth, unauthorized subscription tests                  | open   |
| R-005 | Crypto      | Invite/passkey changes leak or replace the user's master identity                                           | Dedicated design, libsodium/WebAuthn primitives, zeroization, roundtrip tests                | open   |
| R-006 | CRDT        | Alias/GC/undo changes produce chains, lost references, or undo remote work                                  | Atomic actions, origins/grouping, property/convergence tests, multi-client review            | open   |
| R-007 | Migration   | Schema/dependency upgrades strand existing local or server data                                             | Fresh and upgrade-path migrations, rollback notes, fixture tests                             | open   |
| R-008 | Performance | Virtualized cells, alias lookup, GC, or automation cause jank/GC churn                                      | Bounded work, memoization, large-data profiling, manual responsiveness checks                | open   |
| R-009 | E2E         | Retry-masked tests or shared-state tests remain flaky                                                       | `--retries=0`, repeat changed journeys, independent sessions and cleanup                     | open   |
| R-010 | UX/a11y     | Feature technically works but keyboard/focus/responsive behavior feels poor                                 | Exhaustive Playwright charter, semantic audit, reduced motion/dark/mobile checks             | open   |
| R-011 | External    | TanStack PR or WebAuthn PRF automation support is unavailable                                               | Primary-source gate, capability fallback, dated rechecks; never fake delivery                | open   |
| R-012 | Context     | Long-running coordinator loses the exact current state                                                      | Durable PROGRESS/HANDOFF/reviews; BASE..HEAD; recovery protocol                              | open   |
| R-013 | Evidence    | Secrets, phrases, financial records, or browser state enter artifacts                                       | Sanitize text evidence; disposable sessions; no secret screenshots/logging                   | open   |
| R-014 | Source      | Canonical settlement authority is edited, partially selected or treated as lower priority                   | Immutable SHA/line/byte checks at every boundary; whole-file FS-001; equal requirement gates | open   |
| R-015 | Finance     | Floating point, negative-floor or unstable tie behavior loses minor units or makes results nondeterministic | Established decimal library; property/examples; signed conservation and stable-ID tests      | open   |
| R-016 | Settlement  | Competing totals, cross-currency netting or cached/plaintext results diverge from the canonical engine      | Sole engine audit; per-currency tests; derive-only output; traceable sources                 | open   |
| R-017 | Data truth  | Invalid legacy ownership/allocation data is silently changed or shown as settled                            | Preserve invalid maps; typed issues; exclude invalid transactions; honest incomplete UX      | open   |
| R-018 | CRDT paths  | Grid, add-row, automation, import, undo or hydration bypasses per-key/atomic complete-set validation        | Enumerate every current path; API boundary tests; convergence/history/preservation tests     | open   |
| R-019 | Grid UX     | Dynamic person columns break virtualization, historical data, presence, keyboard use or sub-100ms edits     | Actual-grid manual matrix; historical people; horizontal stress/perf profiling               | open   |
| R-020 | Scale       | Settlement becomes superlinear or misses the approximate 100k/200ms target                                  | Near-linear design, memoization, benchmark evidence or measured follow-up gate               | open   |

Update risk status only with evidence. A package PASS must link mitigation for every applicable
high-impact risk.

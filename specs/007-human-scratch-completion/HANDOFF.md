# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P11C / 03
- **Scope IDs:** HS-004 integrated-behavior/performance checkpoint only; P11A/04 and P11B/01 passed;
  P11C/03 passed after two immutable F-01 failures; HS-004 is `completion_pending` and unchecked
- **State:** passed; integration `78e2f978f8d258d8c4d379f53e75089a2ce975db`; revision-01 failure is immutable in
  `dd77d518fff81e4c5553ce9a559681ece8f30232`, revision-02 failure in
  `29d943757bae8147f3b66559d63c12afcd0e5362`
- **Task:** `tasks/HS-004-description-aliases.md`, complete frozen 72-line HS-004 block in SCOPE,
  P11C acceptance only
- **Dependencies:** P11B/01 PASS is immutable; P11C remains independent of blocked P05/P08/P10
- **Original package BASE:** `0426866fa66cc022efca6d74cd5088d586d3d11b`
- **Revision-03 pre-implementation HEAD:** `2540969134f002330ad505836bdd92d01eb56308`
- **Range meaning:** cumulative P11C remediation range; independent review must cover the original
  literal BASE through the new revision-03 committed HEAD and preserve all prior work/artifacts
- **Allowed implementation paths:** `src/lib/crdt/context.tsx` narrowly to eliminate the
  zero-consumer/render-to-subscribe missed-alias window and bind observer lifetime/teardown correctly
  to the provider/document; existing/new
  `tests/integration/description-alias-lookup-lifecycle.test.tsx` only for actual-context
  unmount/mutate/remount, setup-race, disposal/leak and retained counter evidence. No other product or
  test path is authorized without a concrete reproduction and prior root expansion. Do not modify
  alias interactions/virtualization/domain/schema/defaults/migration/mirror/sync/transport/server/
  database/auth/crypto/realtime, dependencies/config, global ledgers, prior evidence/reviews, scratch,
  FS-001, SCOPE, `.claude`, `.codex` or agent configuration.
- **Sole implementer artifact:** `evidence/P11C/implementation-03.md`
- **Future immutable review artifact:** `reviews/P11C-review-03.md`
- **Commit contract:** inspect first, change only the narrow authorized subset actually needed,
  stage exact paths only, commit product/test changes with a message containing no parentheses, and
  leave the evidence uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  frozen untracked `evidence/P11C/implementation-03.md`; no staged, product, executable, generated or
  other dirty path
- **Revision-03 F-01 correction:** eliminate every unobserved alias-event window. A provider/document-
  lifetime observer with explicit teardown only at provider/doc disposal is acceptable. Any other
  design must prove that the first remounted committed view cannot reuse stale aliases and that an
  alias event between render/getSnapshot and subscription setup cannot be lost. Never retain a cache
  past an interval in which its governing document events were not observed.
- **Actual-context gap proof:** mount the real `VaultProvider` and hooks over a large legal graph,
  cache collection/lookup/options, unmount every alias consumer while retaining the same provider/doc,
  apply both local and subscribed remote alias mutations during the gap, and remount. The first
  committed UI state must expose current aliases, lookup, options and counts with exactly one rebuild
  per alias-bearing event/revision. Reproduce the actual two-tab sidebar SPA sequence from review 02.
- **Setup/teardown proof:** deterministically inject or schedule an alias mutation at the
  render/getSnapshot-to-subscribe boundary and prove it is observed exactly once. Dispose/replace the
  provider/doc and prove every task-owned document observer is released—no subscription leak, late
  update, duplicate callback or cross-document cached value. Exercise StrictMode-style subscribe/
  unsubscribe churn where feasible.
- **Retained revision-02 wins:** while mounted and across zero-consumer gaps, repeated real local
  transaction actions and aligned remote/import-style non-alias notifications must preserve legal
  collection/lookup identity with exactly 0 conversion/0 build/0 options recomputation. Local/remote
  alias creation/rename, first empty-provider insertion, Undo and Redo must each publish exactly one
  current legal collection and 1/1/1 dependent rebuild. Do not revert to permanent rescans, polling,
  render-time conversion, post-rescan interning, raw public unions or an always-live observer that
  survives actual provider/doc disposal.
- **Retained cumulative gates:** preserve all P11A legal one-hop/reference/atomic/persistence/public-
  boundary behavior; all P11B caret/keyboard/modal/provenance/privacy behavior; and all P11C
  management/import/manual/exact/new/single/shared/change/remove refresh/history/peer/offline flows,
  active-cell-only suggestions, at-most-one focused virtual row and 10,000/2,000/500 scale bounds.
  Keep the blur-pin T014a regression removed.
- **Required automation:** add red actual-provider regressions for unmount/local+remote-mutate/remount,
  render-to-subscribe event injection and provider/doc disposal observer counts, then prove the fix
  while retaining the full revision-02 0/0/0 and 1/1/1 matrix. Repeat focused P11C tests three times;
  run full Vitest, typecheck, lint, build, scoped format and all repository checks. Repeat alias and
  large virtualization E2E at least three times with retries disabled and run full no-retry E2E,
  reporting every red exactly.
- **Validation/manual charter:** use repository-installed headless `playwright-cli` with two live
  authenticated tabs to reproduce review-02's exact SPA gap sequence before/after the fix. Retain
  large real alias/transaction surface, transaction-only DOM-identity zero-mutation versus alias
  exactly-one mutation, refresh/history/lazy/virtual/responsive/dark/reduced-motion/200%/privacy/
  console/network checks. Clean disposable UI data visibly, browser/session data, processes and
  generated files; restore `next-env.d.ts`.
- **Evidence contract:** record exact cumulative BASE/new HEAD, revision commits/paths/index, red gap
  and setup-race counterfactuals, architecture/observer lifetime, exact identities/counters/observer
  counts, retained acceptance, commands/results/repeats, sanitized manual evidence, inherited reds,
  cleanup, risks, frozen checks and complete Q proposals. Do not claim PASS.
- **Boundary checks:** scratch SHA
  `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, authorized checked set
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018 and all 21 normalized blocks; FS-001 SHA
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes; SCOPE
  SHA `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `0426866fa66cc022efca6d74cd5088d586d3d11b`
- **Literal reviewed HEAD:** `daab038ee741faa9f92a373b27efe0c8fe8940db`
- **Range type:** cumulative P11C range from original BASE through revision-03 HEAD
- **Implementation evidence:** `evidence/P11C/implementation-03.md`, SHA-256
  `264c6b104391998e05a7481468c823af857eed2446f8ea7d4eade630f4b59770`, 189 lines/14,523 bytes
- **Sole reviewer artifact:** `reviews/P11C-review-03.md`
- **Review SHA-256:** `c8cab25c854bdce25535fc0af5c3f2e0e491dd44e25f0c8c9b457a3bd04fcaaf`,
  175 lines/13,996 bytes
- **Verdict:** PASS — both immutable F-01 lifecycle failures are closed; no High/Medium finding
  remains in the cumulative P11C range; P11C may pass and HS-004 now qualifies for the root-only
  authorized marker procedure after artifact integration
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently review the cumulative range and reproduce exact two-tab
  zero-consumer SPA gap, actual-context local/remote gap, render-to-subscribe race and provider/doc
  disposal without leaks; retain non-alias 0/0/0 and alias exactly 1/1/1. Reject hidden permanent
  observers, stale remounts, polling/rescans, raw-boundary reopening, duplicate callbacks, missed first
  alias or helper-only proof. Revalidate every cumulative interaction/concurrency/privacy/scale gate,
  cleanup, 21 blocks and frozen sources.

## Next root action

Recover the durable HS-004 `completion_pending` event at pre-change scratch SHA
`c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, then execute and finalize
the root-only marker protocol. No package dispatch is legal until HS-004 is checked, its one-line
diff and normalized blocks verify, the rolling SHA advances, and the active event clears.

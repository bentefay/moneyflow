# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P11A / 02
- **Scope IDs:** HS-004 model/invariant checkpoint only; P11B/P11C remain required before HS-004
  completion or marker authority
- **State:** changes_requested; revision-01 evidence/review immutable in
  `571b1ed05ab540d5a2e9fe5ba142d304a32137fa`; revision-02 evidence/review are frozen and FAIL
- **Task:** `tasks/HS-004-description-aliases.md`, complete frozen 72-line HS-004 block in SCOPE,
  P11A acceptance only
- **Dependencies:** P09/HS-006 passed; P11A is independent of the blocked P05/P08/P10 branch
- **Original package BASE / pre-implementation HEAD:**
  `eb5ab2e215130c358130d5411a92b51951c3c53a`
- **Revision-02 pre-implementation HEAD:** `faeaebd358401b6639cce1c1b24eac577f69a624`
- **Range meaning:** cumulative remediation range; independent review must cover the original literal
  BASE through the new revision-02 committed HEAD, preserving revision-01 work and immutable artifacts
- **Allowed implementation paths:** `src/lib/crdt/schema.ts`; `src/lib/crdt/defaults.ts` only if
  required by the legal alias states; `src/lib/crdt/context.tsx`; `src/lib/crdt/mutations.ts`;
  `src/lib/crdt/queries.ts`; `src/lib/crdt/migration.ts`; `src/lib/crdt/mirror.ts` for the required
  alias root and system-origin repair; new focused alias modules under `src/lib/crdt/**`;
  `src/lib/domain/description-aliases.ts`; `src/components/providers/vault-provider.tsx` narrowly to
  run repair after hydration and before consumers; existing
  `src/components/features/description-aliases/DescriptionAliasesTable.tsx` narrowly to replace raw
  management writes with the named normalized/legal P11A actions; and
  `src/app/(app)/transactions/page.tsx` only if required to consume the enforced legal selector/type
  boundary. Existing or new focused tests under `tests/unit/domain/**`, `tests/unit/crdt/**`,
  `tests/unit/components/**`, `tests/integration/**`, and `tests/e2e/description-aliases.spec.ts` are
  allowed for the required P11A model/provider/management invariant journeys. Do not implement P11B
  autocomplete/modal/caret UX or P11C integrated performance scope. Do not edit unrelated product/
  tests, dependencies/config, server/database/auth/crypto/realtime, global ledgers, prior evidence/
  reviews, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent configuration.
- **Sole implementer artifact:** `evidence/P11A/implementation-02.md`
- **Future immutable review artifact:** `reviews/P11A-review-02.md`
- **Commit contract:** inspect first, change only the narrow authorized subset actually needed,
  stage exact paths only, commit product/test changes with a message containing no parentheses, and
  leave the evidence uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  frozen untracked `evidence/P11A/implementation-02.md`; no staged, executable or other dirty path
- **Model invariant:** represent real and symlink aliases as legal typed states, with no state that
  simultaneously behaves as both. Every active symlink targets one active final real alias in one
  hop; resolution is one direct map lookup and never follows a chain. Deleted/missing/invalid targets
  resolve honestly as empty. New assignments always store the final real ID.
- **Reference invariant:** exact `transactionIds` forward/backlink conservation must hold for every
  top-level transaction and applicable duplicate form. Exact `symlinkIds` backlinks must equal the
  active one-hop graph. Ignore mirror metadata keys without treating them as domain references.
  Soft deletion and transaction/import deletion must update bookkeeping atomically without mutating
  immutable raw imported descriptions.
- **Atomic mutation API:** define one typed, production-used mutation boundary for assign, create,
  exact-match attach, rename, change-one, change-all, remove-one, remove-all and transaction deletion.
  Each logical operation is one mirror action/UndoManager step, makes illegal source/target/cycle
  combinations unrepresentable or returns a typed error without partial writes, flattens former
  inbound symlinks during change-all, and preserves concurrent user data. Do not return replacement
  objects from mirror draft mutations.
- **Revision-02 production action correction:** close F-01 by ensuring every Immer/mirror recipe is
  genuinely void while typed Results are captured and returned outside the recipe. Public callers
  must receive the typed Result; every rejected operation, including a generic transaction update
  combining invalid alias and other fields, must preflight fully and leave no partial write. Prove
  the real production wrappers, not draft helpers alone, and restore the full no-retry E2E suite.
- **Migration:** design and implement a deterministic, idempotent, system-origin repair for existing
  partial data before consumers: missing maps, stale/missing backlinks, references to symlinks,
  chains, cycles, deleted/missing targets and transactions whose forward links disagree. Preserve
  raw descriptions and maximum recoverable references; never silently drop financial transactions.
  Prove repeated application, upgrade/rollback posture and multi-peer convergence. If frozen authority
  does not decide normalization/case or destructive-concurrency policy, apply PROCESS hierarchy,
  choose the smallest reversible data-preserving default, write a complete Q proposal and continue.
- **Revision-02 migration/deletion correction:** close F-02/F-03 by proving the actual hydrated
  `VaultProvider` runs idempotent system-origin repair before any consumer observes state and without
  user undo history. Remove-all must resolve either a real or symlink input to its final real group
  and tombstone/canonicalize every inbound edge so later repair, peer exchange and reopen cannot
  resurrect a visible alias. Preserve transactions, raw descriptions and exact backlinks.
- **Revision-02 legal boundary/management correction:** close F-04/F-05 by making illegal real/symlink
  combinations and symlink recovery names unavailable through public selector/action types. Add
  compile-time negative type coverage. The existing shipped management CRUD must use the named
  actions and Q-016 trim+NFC, case-sensitive exact matching, rejecting NFC-equivalent duplicates
  without a write. Q-017 destructive-concurrency default remains canonical; do not duplicate either
  accepted proposal.
- **Required automation:** table/property tests with fast-check for legal states, exact normalization/
  matching, one-hop resolution, no-chain transformations, backlink/reference conservation,
  deleted/missing handling, random full-operation sequences and concurrent plans. Revision 02 must
  directly cover rename and remove-all; create/rename/assign/change-one/change-all/remove-one/
  remove-all/delete/malformed-repair operation sequences with fixed replayable seeds; missing maps;
  the full deletion matrix; and large maps with bounded one-hop lookup. Integration must use the real
  production wrappers and Loro UndoManager to prove every required operation is one undo/redo step,
  provider hydration repair adds no user history, repair updates exchange across peers, and production
  reopen converges. Add meaningful current-surface management E2E normalization and invariant
  journeys; do not pre-claim P11B/P11C UX.
- **Validation/manual charter:** run focused checks plus all repository checks required by
  `.claude/CLAUDE.md`; repeat changed E2E with retries disabled and report inherited reds exactly.
  Use only repository-installed headless `playwright-cli` in disposable sessions to exercise current
  management/transaction/undo/refresh/duplicate-tab/offline boundaries relevant to P11A, inspect
  accessible role/name/state, responsive/dark/reduced-motion/200% reflow/contrast where changed,
  console/network and absence of raw-manual leakage where observable. Explicitly defer and do not
  certify P11B caret/autocomplete/modal or P11C performance flows. Clean all sessions/processes/
  generated files and restore `next-env.d.ts`.
- **Evidence contract:** record exact BASE/HEAD, commits/paths/index, invariant definitions, migration
  policy/counterfactuals, acceptance mapping, commands/results, property seeds/runs, sanitized manual
  evidence, deferrals, cleanup, risks, frozen-source checks and complete Q proposals. Do not claim PASS.
- **Boundary checks:** scratch SHA
  `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, authorized checked set
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018 and all 21 normalized blocks; FS-001 SHA
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes; SCOPE
  SHA `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `eb5ab2e215130c358130d5411a92b51951c3c53a`
- **Literal reviewed HEAD:** `d81c5039c41577f94791bedc4184b98940c631a6`
- **Range type:** cumulative non-empty P11A range from the original BASE through revision-02 HEAD
- **Implementation evidence:** `evidence/P11A/implementation-02.md`, SHA-256
  `b612081957b3c710dbb574ad78ce4b39765117b85a290e4d13a117fbb49b101f`, 236 lines/16,405 bytes
- **Sole reviewer artifact:** `reviews/P11A-review-02.md`
- **Review SHA-256:** `3cc9c32c6b9461ea5461231264b366c509483d5372dd981c543141e3f167c970`,
  278 lines/22,861 bytes
- **Verdict:** FAIL — F-01 and F-05 closed; F-02, F-03, F-04 and corresponding F-06 evidence gaps
  remain blocking
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently audit the full literal range, legal-state and
  reference invariants, every atomic operation/UndoManager step, migration preservation/idempotence/
  convergence, property and real-app evidence, explicit P11B/P11C deferrals, exact boundary/cleanup,
  Q proposals, scratch/21 blocks, FS-001 and SCOPE. Reproduce both Q defaults and reject hidden
  P11B/P11C claims, unsafe recovery-name exposure, non-constant resolution, partial writes,
  non-idempotent repair, false peer convergence or fragmented undo.

## Next root action

Persist immutable revision-02 evidence/review and the exact failure/risk transcription, then rewrite
HANDOFF for P11A revision 03. Cumulative re-review must retain the original BASE and use exact new
artifacts `evidence/P11A/implementation-03.md` and `reviews/P11A-review-03.md`.

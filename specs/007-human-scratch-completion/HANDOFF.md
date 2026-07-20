# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P11A / 03
- **Scope IDs:** HS-004 model/invariant checkpoint only; P11B/P11C remain required before HS-004
  completion or marker authority
- **State:** changes_requested; revision-01 evidence/review immutable in
  `571b1ed05ab540d5a2e9fe5ba142d304a32137fa`; revision-02 evidence/review immutable in
  `0183a70afed010d862f4eb960d5464b09a17ecd5`; revision-03 evidence/review immutable in
  `2bdca0e584aabe3f3a3ac2fe0c0d91637b9fe79a`
- **Task:** `tasks/HS-004-description-aliases.md`, complete frozen 72-line HS-004 block in SCOPE,
  P11A acceptance only
- **Dependencies:** P09/HS-006 passed; P11A is independent of the blocked P05/P08/P10 branch
- **Original package BASE / pre-implementation HEAD:**
  `eb5ab2e215130c358130d5411a92b51951c3c53a`
- **Revision-03 pre-implementation HEAD:** `fa994d649e2cc55e1c2991c3d9b732bd75393284`
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
  allowed for the required P11A model/provider/management invariant journeys. Revision 03 additionally
  authorizes `src/lib/sync/manager.ts` narrowly for an awaitable encrypted local-update persistence
  barrier and immediate remote alias repair lifecycle; `src/lib/crdt/index.ts` narrowly to remove raw
  generic/wire public exports; and focused existing/new tests under `tests/unit/sync/**` and
  `tests/integration/sync-*.test.ts` for real queue ordering, failure/retry and remote repair. Do not
  implement P11B
  autocomplete/modal/caret UX or P11C integrated performance scope. Do not edit unrelated product/
  tests, dependencies/config, server/database/auth/crypto/realtime, global ledgers, prior evidence/
  reviews, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent configuration.
- **Sole implementer artifact:** `evidence/P11A/implementation-03.md`
- **Future immutable review artifact:** `reviews/P11A-review-03.md`
- **Commit contract:** inspect first, change only the narrow authorized subset actually needed,
  stage exact paths only, commit product/test changes with a message containing no parentheses, and
  leave the evidence uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  frozen untracked `evidence/P11A/implementation-03.md`; no staged, executable or other dirty path
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
- **Retained closed gates:** do not regress revision-02 F-01/F-05 closure: every Immer/mirror recipe
  stays genuinely void with typed Result propagation and full mixed-update preflight; shipped
  management CRUD stays on Q-016-normalized named actions with no-write duplicate errors and full
  no-retry E2E coverage.
- **Migration:** design and implement a deterministic, idempotent, system-origin repair for existing
  partial data before consumers: missing maps, stale/missing backlinks, references to symlinks,
  chains, cycles, deleted/missing targets and transactions whose forward links disagree. Preserve
  raw descriptions and maximum recoverable references; never silently drop financial transactions.
  Prove repeated application, upgrade/rollback posture and multi-peer convergence. If frozen authority
  does not decide normalization/case or destructive-concurrency policy, apply PROCESS hierarchy,
  choose the smallest reversible data-preserving default, write a complete Q proposal and continue.
- **Revision-03 F-02 correction:** introduce an explicit awaitable barrier for the real
  `SyncManager.subscribeLocalUpdates` async work even though Loro's callback contract is void.
  Provider exposure must await repair encryption and durable IndexedDB-or-memory queue append before
  `forceSync`; initial push semantics and failures/retries must be explicit. Prove the real manager
  queue with controlled crypto/persistence/push dependencies, not a fake document export. Repair
  remains system-origin, idempotent and absent from user undo history.
- **Revision-03 F-03 correction:** remove-all with real or symlink input must atomically clear every
  applicable top-level/nested transaction `descriptionAliasId`, every affected alias reverse map and
  the complete group in the same production action/Undo step, with no explicit repair needed to make
  the immediate postcondition legal. The shipped remote-update lifecycle must immediately repair
  merged invalid/deleted edges, await/exchange its system repair and converge before consumer
  notification; Q-017 remains canonical.
- **Revision-03 F-04 correction:** keep wire alias state internal to CRDT serialization/maintenance.
  Generic application selectors/actions must exclude raw `descriptionAliases`; raw context/store and
  wire schema types must not be exported from the public CRDT surface. Named internal helpers may
  retain typed access. Compile-negative tests must import the same public modules ordinary application
  code uses and prove it cannot select recovery names or write illegal combinations.
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
- **Literal reviewed HEAD:** `722364b0417b4666de05df773933233d34e62033`
- **Range type:** cumulative non-empty P11A range from the original BASE through revision-02 HEAD
- **Implementation evidence:** `evidence/P11A/implementation-03.md`, SHA-256
  `9656cee30c9260f5c44244fd40c6cecf46edd59d81a1ced19d7e350af77fb3cb`, 235 lines/17,213 bytes
- **Sole reviewer artifact:** `reviews/P11A-review-03.md`
- **Review SHA-256:** `153b51685afff22fa01bf74cb0ca49a49fef7242a1ba272e159500f5320a0085`,
  243 lines/20,273 bytes
- **Verdict:** FAIL — F-01/F-04/F-05 and local remove-all F-03 closed; F-02 queue failure masking,
  live consumer-before-repair F-03 and their F-06 proof gaps remain blocking
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently audit the full literal range, legal-state and
  reference invariants, every atomic operation/UndoManager step, migration preservation/idempotence/
  convergence, property and real-app evidence, explicit P11B/P11C deferrals, exact boundary/cleanup,
  Q proposals, scratch/21 blocks, FS-001 and SCOPE. Reproduce both Q defaults and reject hidden
  P11B/P11C claims, unsafe recovery-name exposure, non-constant resolution, partial writes,
  non-idempotent repair, false peer convergence or fragmented undo.

## Next root action

Persist immutable revision-03 evidence/review and exact risk transcription, then rewrite HANDOFF for
P11A revision 04. Cumulative re-review retains the original BASE and uses new exact artifacts
`evidence/P11A/implementation-04.md` and `reviews/P11A-review-04.md`.

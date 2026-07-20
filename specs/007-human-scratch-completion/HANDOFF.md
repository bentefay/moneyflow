# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P11A / 01
- **Scope IDs:** HS-004 model/invariant checkpoint only; P11B/P11C remain required before HS-004
  completion or marker authority
- **State:** changes_requested; revision-01 evidence/review immutable after root integration
- **Task:** `tasks/HS-004-description-aliases.md`, complete frozen 72-line HS-004 block in SCOPE,
  P11A acceptance only
- **Dependencies:** P09/HS-006 passed; P11A is independent of the blocked P05/P08/P10 branch
- **Original package BASE / pre-implementation HEAD:**
  `eb5ab2e215130c358130d5411a92b51951c3c53a`
- **Range meaning:** first P11A implementation range; independent review must cover this literal BASE
  through the implementer's committed HEAD
- **Allowed implementation paths:** `src/lib/crdt/schema.ts`; `src/lib/crdt/defaults.ts` only if
  required by the legal alias states; `src/lib/crdt/context.tsx`; `src/lib/crdt/mutations.ts`;
  `src/lib/crdt/queries.ts`; `src/lib/crdt/migration.ts`; `src/lib/crdt/mirror.ts` only to add the
  required alias root to the existing test/bootstrap default and invoke the same system-origin
  migration used by production before consumers; new focused alias modules under
  `src/lib/crdt/**`; `src/lib/domain/description-aliases.ts`; existing or new focused tests under
  `tests/unit/domain/**`, `tests/unit/crdt/**`, `tests/integration/**`; and
  `tests/e2e/description-aliases.spec.ts` only for meaningful P11A model/invariant journeys. Do not
  edit components/pages or implement P11B/P11C interaction/performance scope. Do not edit unrelated
  product/tests, dependencies/config, server/database/auth/crypto/realtime, global ledgers, prior
  evidence/reviews, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent configuration.
- **Sole implementer artifact:** `evidence/P11A/implementation-01.md`
- **Future immutable review artifact:** `reviews/P11A-review-01.md`
- **Commit contract:** inspect first, change only the narrow authorized subset actually needed,
  stage exact paths only, commit product/test changes with a message containing no parentheses, and
  leave the evidence uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  frozen untracked `evidence/P11A/implementation-01.md`; no staged, executable or other dirty path
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
- **Migration:** design and implement a deterministic, idempotent, system-origin repair for existing
  partial data before consumers: missing maps, stale/missing backlinks, references to symlinks,
  chains, cycles, deleted/missing targets and transactions whose forward links disagree. Preserve
  raw descriptions and maximum recoverable references; never silently drop financial transactions.
  Prove repeated application, upgrade/rollback posture and multi-peer convergence. If frozen authority
  does not decide normalization/case or destructive-concurrency policy, apply PROCESS hierarchy,
  choose the smallest reversible data-preserving default, write a complete Q proposal and continue.
- **Required automation:** table/property tests with fast-check for legal states, exact normalization/
  matching, one-hop resolution, no-chain transformations, backlink/reference conservation,
  deleted/missing handling, random operation sequences and concurrent plans. Integration must use the
  real mirror/Loro UndoManager to prove atomic one-step undo/redo, transaction/import deletion,
  migration idempotence/convergence and large maps. Add a meaningful real-app E2E model journey only
  where current P11A-visible behavior can prove invariants; do not pre-claim P11B/P11C UX.
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
- **Literal reviewed HEAD:** `4920dcbcb3d30b113c0df2811cbca3e718e22b0f`
- **Range type:** non-empty first P11A implementation range containing exactly 12 authorized
  product/test paths
- **Implementation evidence:** `evidence/P11A/implementation-01.md`, SHA-256
  `657c055c01ccc3edf4d183a0c250a744112cf12fb90d2ec297a5071ae064f63d`, 204 lines/15,149 bytes
- **Sole reviewer artifact:** `reviews/P11A-review-01.md`
- **Review SHA-256:** `38a390dc182086b8257f16cec92cd9ca4a87166e0a4a3a58f6163ec19b0a106d`,
  283 lines/21,880 bytes
- **Verdict:** FAIL — six blocking findings F-01–F-06 covering production action wrappers,
  production migration, remove-all stability, public legal-state boundary, management normalization
  wiring and material evidence gaps
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently audit the full literal range, legal-state and
  reference invariants, every atomic operation/UndoManager step, migration preservation/idempotence/
  convergence, property and real-app evidence, explicit P11B/P11C deferrals, exact boundary/cleanup,
  Q proposals, scratch/21 blocks, FS-001 and SCOPE. Reproduce both Q defaults and reject hidden
  P11B/P11C claims, unsafe recovery-name exposure, non-constant resolution, partial writes,
  non-idempotent repair, false peer convergence or fragmented undo.

## Next root action

Persist immutable revision-01 evidence/review with Q-016/Q-017 and R-030/R-031 transcription, then
rewrite HANDOFF for P11A revision 02. Cumulative re-review must use new exact artifacts
`evidence/P11A/implementation-02.md` and `reviews/P11A-review-02.md`.

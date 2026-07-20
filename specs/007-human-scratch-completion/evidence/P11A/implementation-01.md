# P11A Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package/scope/revision: `P11A` / `HS-004` model-invariant checkpoint / `01`.
- Original BASE and clean pre-implementation HEAD: `eb5ab2e215130c358130d5411a92b51951c3c53a`.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P11A/implementation-01.md`, created before product or
  test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Only the narrow alias model/test path classes authorized in HANDOFF may change. P11B/P11C UI and
  performance scope, ledgers, configuration, prior artifacts, reviews, agents, scratch, FS-001 and
  `SCOPE.json` remain read-only.

## Plan

1. Inventory the current alias schema, resolver, mutations, import/transaction deletion paths,
   migration order, UndoManager boundary and current management E2E behavior.
2. Define legal typed real/symlink states, one-hop resolution, exact-match normalization and pure
   reference/backlink invariants with typed expected errors.
3. Implement one atomic draft-mutation boundary for every assigned operation and deterministic,
   idempotent system-origin repair for all listed partial/invalid states.
4. Prove invariants with table/property/random/concurrent-plan tests and real mirror/Loro
   UndoManager integration, adding only meaningful current-surface P11A E2E observations.
5. Run focused/full/repeated validation and the installed headless CLI charter, clean generated
   state, commit exact authorized product/test paths and finalize evidence/Q proposals.

## Implemented model and invariant boundary

- Added `kind: real | symlink` to the CRDT wire schema and a discriminated legal domain union.
  `toLegalDescriptionAlias` exposes `name` only for a real alias and `targetAliasId` only for a
  symlink, so consumers cannot treat hidden recovery metadata as a real alias name. The wire schema
  retains a symlink's former name solely to recover meaningful data after a concurrent cycle.
- Added one draft-style full-vault mutation module with typed `Result` failures. It preflights every
  expected error before writes and covers standalone creation, final-real assignment,
  create-and-assign, deterministic exact-name attachment, rename, change one, change all, remove
  one, remove all, top-level/nested transaction deletion and import deletion.
- New assignments resolve at most one symlink hop and always persist the final real ID. One-hop read
  resolution performs exactly two collection reads for a symlink and rejects a chain, deleted target
  or missing target.
- `change all` retains direct transaction pointers on the source alias, turns that source into a
  symlink, repoints its validated inbound symlinks, moves backlinks to the final real target and
  never scans or rewrites the transaction store. All forward/backlink writes occur in one Mirror
  draft and one `user:alias` action.
- Compare-and-set `expectedAliasId` inputs protect change-one/remove-one from stale destructive
  actions. Missing/deleted/non-real targets, ID conflicts, empty names, same-source targets and
  malformed backlink sets return typed errors without partial state.
- The production context now exposes each named atomic action. Generic transaction updates route
  alias-pointer changes through that boundary, while raw `description` and direct alias-pointer
  writes are filtered from the general updater. Existing page-level backlink-plan calls are ignored;
  their final change-all call is bridged to the complete atomic graph transform until P11B adopts
  the named action directly.
- Nested duplicates now carry alias provenance through nest, unnest and swap transformations.
  Transaction and import deletion wrappers unlink top-level and nested transaction IDs in the same
  draft as deletion. The generic updater cannot alter imported raw descriptions.

## Deterministic migration and convergence policy

- Both fresh and restored Mirrors invoke the migration under `system:migration` before consumers
  read state. Legacy epoch-zero tombstones are cleared before graph repair.
- Repair processes sorted alias IDs. It preserves valid one-hop pointers; flattens chains to the
  terminal active real alias; elects the lexicographically smallest active member of a cycle as
  real; converts self/missing/deleted-target nodes to real; and preserves their trimmed NFC legacy
  name with the alias ID as the final fallback.
- Deleted aliases remain deleted and are canonicalized as real tombstones. Missing/deleted
  transaction pointers are cleared. Valid direct transaction pointers—including nested
  duplicates—remain direct, then `transactionIds` and `symlinkIds` are rebuilt from their
  authoritative forward pointers. Stale and duplicate reverse references disappear.
- Repeating repair produces no new Loro version. Two peers performing opposing `A -> B` and `B -> A`
  change-all operations, exchanging their real Loro updates, and repairing independently converge on
  the same graph with `A` real, `B -> A`, and `Alpha` recovered rather than an ID-only name.

## Automated validation

- Focused command:
  `pnpm exec vitest run tests/unit/domain/description-aliases.test.ts tests/unit/crdt/description-alias-mutations.test.ts tests/integration/description-alias-crdt.test.ts tests/unit/crdt/transaction-mutations.test.ts`
  passed `4` files and `68/68` tests after final model changes.
- The focused set includes fast-check randomized mutation sequences (`40` runs, up to `80`
  operations each), forward/backlink conservation, exact normalization/case behavior, constant
  one-hop lookups, no-chain transformations, typed no-partial failures, top-level/nested/import
  deletion, immutable raw text, malformed/stale/deleted/missing repair and idempotency.
- The integration test exchanges actual concurrent Loro updates between two Mirrors and proves
  post-merge convergence. It also uses the real `VaultUndoCoordinator`/Loro `UndoManager` to prove a
  multi-entity change-all is exactly one undo step and `system:migration` creates no user history.
- `pnpm test`: `52` files and `1200/1200` tests passed.
- `pnpm typecheck`: passed before the full suite and again after the final compatibility bridge.
- `pnpm build`: passed, including production compilation, TypeScript and all 17 static/dynamic
  routes. Generated `next-env.d.ts` was restored afterward and has no diff.
- `pnpm lint`: exited zero with no errors and 12 inherited warnings in existing transaction,
  virtualizer, query and test surfaces. No new P11A file has a lint error.
- `git diff --check`: passed. Exact P11A product/test/evidence paths pass `oxfmt --check`.
  Repository-wide `pnpm format:check` remains inherited red only for coordinator-owned ledgers and
  frozen scratch: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`,
  `RISKS.md` and `specs/human-scratch.md`; none is writable by this worker.
- Current-surface E2E was deliberately limited to the existing P11A management journey rather than
  claiming future cell/modal scope:
  `pnpm exec playwright test tests/e2e/description-aliases.spec.ts --retries=0 --reporter=list`
  passed `2/2` twice independently (9.6s and 9.5s), with no retries.

## Installed Playwright CLI charter

- Used only the installed headless `pnpm exec playwright-cli`; no browser MCP, downloaded runner,
  headed/debug/UI mode, mocked application route or test helper was used.
- Created a real identity through the visible application, navigated to Tx Descriptions, created a
  Unicode alias through keyboard Enter, observed the alias count and enabled Undo, undid creation in
  one step, redid it in one step, and reloaded. The alias persisted while document history reset,
  matching Loro session-history semantics.
- After reload the online run had zero console errors/warnings. `vault.list`, `sync.getUpdates`,
  `sync.pushOps`, `realtime.authorize` and `realtime.revoke` requests returned 200.
- The first manual dev-server launch lacked the server-only Realtime secret and the new identity
  reached the explicit “Realtime authorization is unavailable” state with a 500. The server was
  restarted using the same local-stack secret derivation required by `playwright.config.ts`; the
  complete charter was then rerun successfully. This was environment configuration, not a product or
  alias failure.
- The first delete click correctly changed the action to `Confirm delete`; the attempted second
  click used the now-stale CLI ref and was rejected without action. The temporary local test vault
  is equivalent to ordinary E2E-created local data. Both CLI sessions were closed, the task-owned
  dev server stopped, all exact task-created CLI snapshots/logs removed, and `playwright-cli list`
  reports no browsers.

## Deferred P11B/P11C boundary

- No transaction page, alias-management component, cell, modal or virtualized-table file changed.
  P11B still owns direct adoption of the named context actions, autocomplete/caret/keyboard/focus
  behavior, manual-transaction no-raw-text storage, tooltip rendering and shared modal UX.
- P11C still owns full cell/modal/import/manual/refresh/duplicate-tab/offline journeys and
  virtualized large-data performance. Existing current-surface management CRUD remains covered, but
  this artifact makes no claim that P11B/P11C interaction acceptance is complete.

### Q-PROPOSAL-P11A-01-01 — Exact alias normalization and case

- **Raised by/package/revision:** `human_scratch_implementer` / `P11A` / `01`.
- **Context and evidence:** The frozen text says a typed value that “matches” an existing alias must
  attach it and acceptance asks for exact normalization/matching, but it does not define whitespace,
  Unicode canonical equivalence or case. The focused tests prove the selected behavior: surrounding
  whitespace is removed, Unicode is normalized to NFC, and case remains significant (`Café` matches
  `Cafe\u0301` while `CAFÉ` creates a distinct alias).
- **Why existing authority does not decide it:** “Matches exactly” settles partial versus
  full-string matching, but not whether visually equivalent Unicode or casing are part of exact
  identity.
- **Options considered:** A — trim + NFC with case-sensitive equality; B — trim + NFC with
  locale-independent case folding; C — literal UTF-16 code-unit equality with no normalization.
- **Reversible default selected to continue:** A. It avoids invisible duplicates from whitespace or
  canonically equivalent Unicode without silently merging intentionally case-distinct curated names.
- **Decision-hierarchy basis:** The frozen exact-match direction outranks convenience matching.
  Existing UI already trims committed names; Unicode NFC is the smallest deterministic extension,
  while preserving case is the least destructive unresolved choice.
- **Impact and risk:** A may retain aliases differing only by case. B risks merging user-intended
  names and has language-specific edge cases. C creates visually indistinguishable duplicates.
- **Reversal or migration path:** Centralize a replacement comparator in
  `normalizeDescriptionAliasName`, then run the same deterministic migration framework with an
  explicit collision policy. Existing raw descriptions remain untouched.
- **Human review still useful after completion:** Yes. Product language or locale research may
  justify B later; until then A is deterministic, reversible and data-preserving.

### Q-PROPOSAL-P11A-01-02 — Concurrent destructive alias operations

- **Raised by/package/revision:** `human_scratch_implementer` / `P11A` / `01`.
- **Context and evidence:** Change/remove one/all can race with reassignment, deletion or another
  change-all. Local stale expected-alias inputs reject destructive intent that no longer matches.
  Across peers, Loro merges field operations and deterministic system repair restores a legal graph;
  deleted targets do not resurrect, invalid pointers clear, and cycle repair preserves the smallest
  active ID plus hidden recovery names. Actual opposing-peer change-all tests converge.
- **Why existing authority does not decide it:** The frozen model defines final structural
  invariants but no user-intent precedence for simultaneous destructive actions.
- **Options considered:** A — reject stale local actions, let deletion be non-resurrecting, and
  deterministically repair merged graphs; B — last scalar writer may resurrect deleted aliases; C —
  attempt distributed locks/transactions before every destructive action.
- **Reversible default selected to continue:** A. It prevents silent local overwrite, preserves raw
  transaction text, converges offline, and does not add a coordination dependency.
- **Decision-hierarchy basis:** Frozen offline-first CRDT behavior and no-chain/reference invariants
  rank first. Non-resurrection and deterministic repair are the safest data-preserving defaults when
  user-intent precedence is unspecified.
- **Impact and risk:** Concurrent deletion can make a newly assigned pointer render empty and repair
  clears that pointer; the immutable raw description remains available. Deterministic cycle election
  may not match either peer's preferred display name, though recovery metadata minimizes loss.
- **Reversal or migration path:** Add explicit operation epochs/tombstone precedence or a conflict
  UI, then replay canonical repair under a new version. The current schema retains enough IDs, raw
  text and former names to migrate without fabricating financial data.
- **Human review still useful after completion:** Yes. Product may prefer conflict surfacing over
  automatic non-resurrection. Until specified, A is convergent and reversible.

## Cleanup and frozen-boundary audit

- Restored generated `next-env.d.ts`; it has no diff. No dependency, lockfile, configuration,
  generated type or P11B/P11C surface changed.
- Final frozen identities are exact: scratch
  `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae` (350 lines, 24,245 bytes),
  FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` (715 lines, 25,441
  bytes), and `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9` (450
  lines, 27,382 bytes). The scratch authorized checked set remains HS-002/HS-006/HS-010/
  HS-014/HS-017/HS-018 only.
- Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were not edited or staged by this worker. The
  final index is empty and this evidence artifact is the only untracked path.

## Commit and independent review range

- Original immutable review BASE: `eb5ab2e215130c358130d5411a92b51951c3c53a`.
- Implementation HEAD: `4920dcbcb3d30b113c0df2811cbca3e718e22b0f`
  (`Implement description alias invariants`). The commit contains exactly the 12 authorized
  product/test paths and no control/evidence path.
- Reviewer must inspect the exact immutable `BASE..HEAD` range plus this evidence artifact.
- Implementation is ready for independent review. This worker makes no PASS or completion claim.

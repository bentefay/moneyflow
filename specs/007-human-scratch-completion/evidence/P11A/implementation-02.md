# P11A Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package/scope/revision: `P11A` / `HS-004` model-invariant remediation / `02`.
- Original cumulative BASE: `eb5ab2e215130c358130d5411a92b51951c3c53a`.
- Clean revision-02 pre-implementation HEAD: `faeaebd358401b6639cce1c1b24eac577f69a624`.
- Committed revision-02 HEAD: `d81c5039c41577f94791bedc4184b98940c631a6`.
- Revision-02 commit: `d81c503 fix: harden description alias invariants`.
- Cumulative commits after the original BASE are `4920dcb`, `571b1ed`, `faeaebd`, and `d81c503`.
  Independent review must use the literal cumulative range
  `eb5ab2e215130c358130d5411a92b51951c3c53a..d81c5039c41577f94791bedc4184b98940c631a6`.
- This file was created before revision-02 product/test edits and is the sole implementer artifact.
  It remains uncommitted. The index is empty after the product/test commit.
- Initial git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the index
  and untracked set were empty. Those files remain root-owned and unstaged.
- Revision-01 evidence/review and all ledgers/configuration/frozen sources were not edited by this
  worker.

## Exact revision-02 committed paths

The revision-02 commit contains exactly these 16 authorized paths:

- `src/app/(app)/transactions/page.tsx`
- `src/components/features/description-aliases/DescriptionAliasesTable.tsx`
- `src/components/providers/vault-provider.tsx`
- `src/lib/crdt/context.tsx`
- `src/lib/crdt/description-aliases.ts`
- `src/lib/crdt/migration.ts`
- `src/lib/crdt/mirror.ts`
- `src/lib/crdt/queries.ts`
- `src/lib/crdt/schema.ts`
- `src/lib/domain/description-aliases.ts`
- `tests/e2e/description-aliases.spec.ts`
- `tests/integration/description-alias-actions.test.ts`
- `tests/integration/vault-provider-alias-repair.test.ts`
- `tests/unit/crdt/description-alias-mutations.test.ts`
- `tests/unit/domain/description-alias-types.test.ts`
- `tests/unit/domain/description-aliases.test.ts`

The cumulative BASE-to-HEAD range also contains the authorized revision-01 product/tests and the
immutable root-authored revision-01 ledger/evidence/review records. No dependency, configuration,
server, database, auth, crypto, realtime, P11B autocomplete/modal/caret, or P11C performance feature
was changed.

## Findings closed

### F-01 — production Result capture and atomic preflight

- `runVaultAction()` runs the updater inside a braced Mirror producer whose only statement records
  the Result. The producer is genuinely void; the captured typed Result is returned after
  `setState`. `useVaultAction()` now publicly returns that Result.
- Every named alias action and alias-aware transaction/import deletion uses this boundary. The
  shipped transaction updater calls `updateDescriptionAliasedTransaction()`, which validates the
  transaction and requested alias before applying ordinary fields. An invalid alias plus valid notes
  returns `alias-not-found`, writes neither field, and creates no undo entry.
- The real wrapper integration executes create, rename, assign, create-and-assign, exact attach,
  change-one, change-all, remove-one, remove-all, transaction delete, and import delete. Every
  success changes state, undoes completely in one step, has no second step after a cleared baseline,
  and redoes completely. This directly reproduces and closes the Immer replacement-value failure.

### F-02 — production hydration repair

- The sole `VaultProvider` initialization now calls `hydrateAndRepairVaultDocument()` after
  `SyncManager.initialize()` has loaded durable state and before creating `VaultUndoCoordinator` or
  exposing children.
- `repairHydratedVaultDocument()` creates a temporary schema Mirror, runs the existing migration and
  graph repair under `system:migration`, disposes the Mirror, and reports whether the document
  version changed. The provider awaits `forceSync()` when it did, so encrypted repair operations are
  durable before first exposure.
- Provider integration imports a malformed snapshot through the exact exported lifecycle, verifies
  initialize-before-force ordering, first-reader chain flattening and exact backlinks, empty user
  history, exchanged repair updates, and an idempotent production reopen that does not force again.
  A second case removes both nested reference maps at the Loro level and proves production repair
  recreates and durably flushes them.

### F-03 — non-resurrecting remove-all

- Remove-all resolves real or symlink input to the final real node, validates every declared inbound
  backlink before writing, and tombstones the target plus all inbound symlinks at one timestamp.
  Each tombstone is canonical real state with no target/backlinks.
- Repair propagates a target tombstone through any active path not represented in the local backlink
  map. This covers merged/concurrent inbound symlinks and prevents broken-link recovery from
  resurrecting a deleted visible group. Transaction pointers and reverse maps are then cleared from
  authoritative transaction traversal; transactions and immutable raw descriptions remain.
- Direct real-input and symlink-input tests cover direct target transactions, inbound-symlink
  transactions, immediate canonicalization, and repair stability. Provider peer exchange/reopen and
  randomized malformed repair cover durable non-resurrection.

### F-04 — legal application boundary

- The schema inference is explicitly named `DescriptionAliasWire` and confined to serialization/
  CRDT maintenance. Application selectors convert to the public discriminated union:
  `RealDescriptionAlias` has `name` and `symlinkIds`; `SymlinkDescriptionAlias` has only
  `targetAliasId` and never exposes its recovery name or real-node backlinks.
- Both `useDescriptionAliases()` and active/query selectors return legal states. Transaction and
  management consumers use those selectors and named actions rather than raw map mutations.
- Compile-negative `@ts-expect-error` cases prove real-with-target, symlink-with-name, and
  symlink-with-backlinks are rejected. Runtime conversion rejects incomplete/contradictory wire
  states. Resolution is one source lookup plus at most one target lookup.

### F-05 — shipped management CRUD

- `/tx-descriptions` create, rename, and delete now call the same named production actions. Create
  and rename apply Q-016 trim plus NFC, preserve case, reject NFC-equivalent active real names with
  `duplicate-name`, show a semantic alert, and make no duplicate write. Delete uses the reviewed
  remove-all group semantics.
- Updated E2E and installed-CLI journeys create decomposed input with surrounding whitespace,
  observe precomposed `Café`, attempt the equivalent precomposed duplicate, observe one row plus the
  typed error, and verify complete delete/undo/redo.

### F-06 — expanded evidence

- Fixed-seed full-operation property sequences cover create, rename, assign, change-one, change-all,
  remove-one, remove-all, delete, malformed graphs and repair. A separate conserved-reference
  property has its own frozen seed.
- Examples cover missing nested maps, normalization duplicates, failed mixed updates, real/symlink
  remove-all, hard parent deletion, soft parent deletion, nested duplicate deletion, and import
  deletion. Parent deletion now unlinks nested aliases even for a soft-deleted parent because those
  children cease to be applicable while nested under it.
- A 10,000-record proxy assertion proves successful symlink resolution performs exactly two
  collection reads. Provider, peer exchange/reopen, all-action wrapper undo/redo, compile-negative
  and management E2E tests exercise the boundaries absent from revision 01.

## Invariants and migration policy

- Legal active graph: each active node is exclusively real or symlink; each active symlink has one
  active real target in one hop; a missing, deleted, illegal, or chained target resolves empty.
- Assignment: all new transaction pointers store a final real ID. Change-all intentionally retains
  existing transaction provenance on the now-symlink source while flattening every inbound edge.
- Exact references: active real `symlinkIds` equal incoming one-hop edges. Alias `transactionIds`
  equal authoritative applicable top-level/nested transaction pointers. `$cid` is ignored as Mirror
  metadata, never counted as a domain reference.
- Deletion: remove-one clears both directions. Remove-all tombstones the complete resolved group and
  repair clears affected pointers/maps without deleting financial transactions or raw imported
  descriptions. Transaction/import deletion unlinks every removed or no-longer-applicable form in
  the same action.
- Deterministic repair: IDs are sorted; chains flatten; cycles choose the lexicographically smallest
  active member; broken targets recover as real aliases from retained wire recovery names; deleted
  targets propagate their tombstone rather than recover; reverse maps rebuild from authoritative
  pointers. A second application emits no version change.
- Compatibility/rollback posture: the wire schema retains existing fields and recovery names, so no
  destructive schema rewrite or dependency migration is required. Older clients can read the same
  records. Reopening on the new client reapplies an idempotent canonical repair. A rollback would
  lose new-client enforcement but not transaction/raw-description data.

Counterfactual checks addressed by the design:

- Returning helper Results from Mirror producers recreates the revision-01 Immer crash; captured
  Results avoid replacement recipes.
- Applying ordinary transaction fields after a rejected alias would be a partial write; full
  preflight returns before the generic updater.
- Tombstoning only a real target lets inbound symlinks recover as visible real aliases; group
  tombstones plus propagated deletion prevent resurrection.
- Repair only in test factories leaves production hydration malformed; the provider lifecycle is now
  the authoritative invocation.
- Raw management writes bypass normalization and duplicate policy; all shipped CRUD now crosses the
  named action boundary.

## Automated validation

| Command / check                                                                            | Result                                                                 |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `pnpm typecheck`                                                                           | PASS                                                                   |
| Focused P11A Vitest over six domain/CRDT/integration files                                 | PASS, 6 files / 53 tests                                               |
| `pnpm test`                                                                                | PASS, 55 files / 1,214 tests                                           |
| `pnpm lint`                                                                                | PASS, 0 errors / 11 inherited warnings in unrelated pre-existing paths |
| `pnpm build`                                                                               | PASS, 17 routes                                                        |
| `pnpm exec oxfmt --check` over all 16 revision-02 paths plus retained integration coverage | PASS                                                                   |
| `git diff --check` and staged diff check                                                   | PASS                                                                   |
| Focused management Playwright, retries disabled, one worker                                | PASS, 2/2                                                              |
| Full Playwright, retries disabled, four workers                                            | PASS, 84/84 in 1.6 minutes                                             |

The first focused browser run found only a test-locator ambiguity between the application alert and
Next's route announcer. The locator was narrowed to the visible duplicate message; the unchanged
product behavior then passed focused and full no-retry runs. The four revision-01 regressions all
pass: realtime encrypted inline edit, virtualized large-list edit, T012 Enter/Escape, and T013 Tab.

Property replay details:

- Reference conservation: seed `11042026`, `40` runs, 1–80 operations per case.
- Full-operation/malformed repair: seed `20260720`, `50` runs, 20–100 operations per case. A normal
  shrink while developing the assertion exposed that absent optional keys are not serialized as
  explicit `undefined`; the assertion was corrected without weakening graph semantics. Final replay
  passes at the frozen seed.

## Installed-CLI manual evidence

- Used only repository-installed headless `playwright-cli`, disposable session `p11a-r02`, the real
  local Next app and encrypted local sync. The recovery phrase was never revealed, extracted or
  printed. No route was mocked and no arbitrary wait was used.
- The initial standalone dev launch lacked the server-only Realtime JWT secret and honestly showed
  `Realtime authorization is unavailable`. It was stopped and relaunched with the same local
  container-derived secret mechanism used by `playwright.config.ts`; subsequent authorize/revoke and
  sync requests returned 200 and the current route showed `Saved`/online.
- On `/tx-descriptions`, entered whitespace plus decomposed `Cafe\u0301`; the UI displayed one NFC
  `Café`. A precomposed duplicate stayed at exactly one row and displayed
  `An alias named Café already exists`. Delete produced zero rows; Undo restored one; Redo returned
  to zero, proving one complete current-surface history step.
- At 320×720 ordinary zoom, `scrollWidth == viewport == 320`. The semantic snapshot retained named
  Add, Cancel, Edit, Delete, Undo, Redo and navigation controls. Dark preference and reduced-motion
  emulation completed before the stricter zoom probe; no warning-level console messages appeared.
  P11B caret/autocomplete/modal accessibility and P11C large-virtualized performance are explicitly
  not certified here.
- The observed successful `sync.pushOps` body contained vault/operation IDs, ciphertext and version
  vector only. It contained no alias plaintext.

## Cleanup, frozen boundaries and residual risks

- Deleted the manually created alias through the visible UI and left it redone as deleted. Closed
  the disposable browser, stopped both task-owned dev servers, and moved `.playwright-cli`,
  `test-results`, and `playwright-report` to desktop trash where present. `playwright-cli list`
  reports no browsers; no task-owned Next/CLI process remains.
- `next-env.d.ts` was regenerated by build/dev and restored byte-for-byte to HEAD after the final
  server stop. Final git dirt is only root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus this
  untracked evidence file. The index is empty.
- Scratch remains SHA-256 `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350
  lines / 24,245 bytes. The authorized checked set remains
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018; HS-004 remains unchecked pending all packages and
  independent review.
- FS-001 canonical source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Q-016 and Q-017 remain the accepted normalization and destructive-concurrency authority. This
  remediation implements them and raises no new Q proposal.
- Residual scope is deliberate: P11B must still deliver its full autocomplete/caret/modal/grid UX;
  P11C must still deliver its integrated import/manual/refresh/concurrent-tab/large-list journeys.
  This P11A revision claims only the model/provider/current-management invariant checkpoint.

## Implementer conclusion

Revision 02 closes F-01 through F-06 with production-used boundaries and passing assigned evidence.
This is an implementation claim only, not a PASS verdict; the exact cumulative range and this frozen
artifact require independent `human_scratch_reviewer` review.

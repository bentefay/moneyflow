# P11A Implementation Evidence — Revision 03

## Immutable dispatch boundary

- Package/scope/revision: `P11A` / `HS-004` model-invariant remediation / `03`.
- Original cumulative BASE: `eb5ab2e215130c358130d5411a92b51951c3c53a`.
- Clean revision-03 pre-implementation HEAD: `fa994d649e2cc55e1c2991c3d9b732bd75393284`.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P11A/implementation-03.md`, created before
  revision-03 product or test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Prior evidence/reviews, ledgers, configuration, scratch, frozen sources, SCOPE and agent
  configuration remain immutable.

## Remediation plan

1. Add a real awaitable SyncManager local-update persistence barrier and make provider repair await
   encrypted durable queue append before explicit initial push.
2. Repair remote imports immediately through the shipped manager lifecycle, await/exchange any
   system repair before consumer notification, and prove failure/retry ordering.
3. Make remove-all immediately conserve every affected top-level/nested transaction pointer and
   alias reverse map in the same production action and undo step.
4. Split internal raw CRDT access from the ordinary public application surface and add negative
   compile coverage through the actual public module.
5. Add aliased delete wrapper undo/redo, exchanged repair/reopen and fixed-seed concurrent-plan
   evidence, then run the full automated/manual/boundary charter.

## Status

Revision-03 implementation is complete at committed HEAD `722364b0417b4666de05df773933233d34e62033`.
This is an implementer completion claim, not a PASS verdict; the exact cumulative range and this
artifact require independent review.

## Exact commit and range

- Revision-03 commit: `722364b fix: complete alias sync boundaries`.
- The commit contains 12 authorized product/test paths, 809 insertions and 137 deletions.
- Cumulative commits after the original BASE are `4920dcb`, `571b1ed`, `faeaebd`, `d81c503`,
  `0183a70`, `fa994d6`, and `722364b`.
- Independent review must use the literal cumulative range
  `eb5ab2e215130c358130d5411a92b51951c3c53a..722364b0417b4666de05df773933233d34e62033`.
- The exact revision-03 committed paths are:
    - `src/components/providers/vault-provider.tsx`
    - `src/lib/crdt/context.tsx`
    - `src/lib/crdt/description-aliases.ts`
    - `src/lib/crdt/index.ts`
    - `src/lib/sync/manager.ts`
    - `tests/integration/description-alias-actions.test.ts`
    - `tests/integration/description-alias-crdt.test.ts`
    - `tests/integration/vault-provider-alias-repair.test.ts`
    - `tests/unit/crdt/description-alias-mutations.test.ts`
    - `tests/unit/crdt/undo.test.tsx`
    - `tests/unit/domain/description-alias-types.test.ts`
    - `tests/unit/sync/manager.test.ts`
- Exact-path staging was used. The index is empty after commit. Root-owned `HANDOFF.md` and
  `PROGRESS.md` remain unstaged; this evidence remains the sole untracked worker artifact.

## Findings closed

### F-02 — real awaitable persistence and repair exchange

- `SyncManager` now bridges the deliberately void `subscribeLocalUpdates` callback into a serialized
  `localPersistenceQueue`. Each observed update captures its version vector and operation ID, then
  awaits encryption and an IndexedDB append; when IndexedDB is unavailable, the encrypted operation
  is retained in the existing in-memory retry queue. Encryption/append errors reject the barrier and
  reach `onError`.
- `awaitLocalPersistence()` is an explicit barrier over all local updates observed before the call.
  `forceSync()` awaits it before pushing or catching up, and `disconnect()` waits for both local and
  remote queues. The throttled push remains a scheduling optimization, not the durability boundary.
- The local listener is installed before initial hydration, so a system repair emitted while remote
  initial state is imported cannot escape persistence. `VaultProvider` initializes, repairs, awaits
  the real persistence barrier, and explicitly forces sync before creating user history or exposing
  consumers.
- Real-manager tests use `fake-indexeddb`, production encryption, the actual operation store and
  controlled tRPC push behavior. Two immediate commits followed by `forceSync()` prove both
  encrypted operations are already in IndexedDB when push begins. A rejected first push leaves the
  actual operation queued; the browser `online` event retries and clears it without another
  mutation.
- Provider integration loads malformed encrypted data into a real `SyncManager`, proves the repair
  operation is durably queued before push, proves pushed data does not contain plaintext, decrypts
  and exchanges the operation to a peer, and proves production reopen emits neither another repair
  nor another push. Repair stays system-origin and absent from user undo history.

### F-03 — atomic remove-all and live merged repair

- Remove-all resolves real or symlink input to its final real group and validates declared backlinks
  before writing. It also scans active one-hop inbound symlinks so a concurrently missing backlink
  cannot leave a live group member behind.
- In the same production Mirror action and undo step, it traverses all account/year/month/day
  transaction trees, clears every affected top-level and nested duplicate `descriptionAliasId`,
  clears every affected reverse `transactionIds` and `symlinkIds` map, and canonicalizes the
  complete group to real tombstones at one timestamp. The immediate postcondition is legal without
  invoking repair; a subsequent repair emits no version change.
- The shipped remote-update lifecycle imports with auto-sync suppressed, reenables it, repairs the
  merged graph synchronously under the existing system origin, awaits persistence, attempts
  immediate encrypted exchange, then notifies consumers. Consumers therefore never receive the
  invalid merged alias graph. A failed server push remains retryable in the durable operation queue.
- Integration constructs a real concurrent case: one peer creates a late inbound symlink while a
  second peer deletes the target. A mocked realtime transport delivers the real encrypted Loro
  update through `SyncManager`; the consumer callback observes only tombstones and occurs after the
  repair push attempt. Exchanging the decrypted repair to another peer converges, and production
  reopen is idempotent with no resurrection or new push.

### F-04 — ordinary application boundary excludes raw alias state

- The underlying Mirror context, full-state hook, raw selector/action helpers and direct store
  access are private to `context.tsx`. Public generic selectors and actions receive
  `ApplicationVaultState`, which omits `descriptionAliases`; named alias selectors/actions retain
  the required internal typed access.
- The public `@/lib/crdt` barrel no longer exports `VaultContext`, `useVaultContext`,
  `useVaultState`, raw Mirror factories/store types, `VaultState`, `VaultInput`, `vaultSchema`, or
  wire alias types. It exports only the legal discriminated alias collection/types and named actions
  needed by ordinary application code.
- Compile-negative tests import the same public barrel as application consumers and prove that
  `VaultState`, `VaultInput`, `DescriptionAliasWire` and `useVaultContext` do not exist. They also
  prove generic selection cannot read raw alias recovery fields and generic actions cannot create an
  illegal raw combination. Existing legal-union negative cases remain.

### F-06 — assigned proof gaps

- `description-alias-actions.test.ts` now captures the actual production
  `useDescriptionAliasActions()` and `useTransactionActions()` hooks under `VaultProvider` plus the
  real Loro undo coordinator. Every required operation still proves exactly one complete undo/redo
  step. Aliased top-level transaction deletion, nested duplicate deletion and import deletion all
  cross the shipped wrappers. Remove-all proves both top-level and nested pointers are absent
  immediately, before undo/redo or repair.
- Exact forward/reverse transaction reference conservation is checked before repair for every legal
  randomized operation and after repair for malformed cases. Real/symlink remove-all examples assert
  immediate legal maps and pointers; explicit repair is version-stable.
- Fixed-seed two-peer concurrent plans combine create, rename, change-all and remove-all, exchange
  both user update streams and both repair streams, then compare legal converged production reopen
  snapshots.
- Retained F-01 remains covered: Mirror recipes are void, typed Results are captured outside
  recipes, and mixed invalid alias/ordinary transaction updates preflight without a partial write.
  Retained F-05 remains covered by unchanged named normalized management actions and the full
  browser suite.

## Invariants, lifecycle and counterfactuals

- Legal graph: an active alias is exclusively real or symlink. Each active symlink points directly
  to one active final real alias. Resolution performs one source lookup and at most one target
  lookup; deleted, missing, chained or illegal targets resolve honestly as empty.
- Exact references: active real `symlinkIds` equal active incoming one-hop edges. Alias
  `transactionIds` equal authoritative applicable top-level and nested transaction pointers. Mirror
  metadata keys are ignored as metadata, never treated as domain references.
- Assignment and deletion: new assignments store a final real ID. Remove-one clears both directions.
  Remove-all clears the complete group, both reference directions and all affected pointers in one
  action without deleting financial transactions or immutable raw imported descriptions.
- Repair remains deterministic, idempotent and system-origin. It preserves maximum recoverable user
  data, flattens chains, resolves cycles by the existing deterministic policy, propagates target
  deletion, and rebuilds backlinks from authoritative edges. No wire-schema migration or dependency
  change was introduced, so rollback retains transaction and raw-description data; a new-client
  reopen reasserts the canonical graph.

Counterfactual checks:

- A detached async document callback permits `forceSync()` to run before encryption/queue append;
  the explicit serialized barrier makes that ordering observable and awaitable.
- A fake exported document snapshot can prove encryption but not real queue durability; the tests
  inspect the actual IndexedDB operations present at the push call.
- Clearing only alias reverse maps during remove-all leaves live transaction pointers until later
  repair; authoritative transaction traversal now closes both directions in the user action.
- Repairing only provider hydration lets an invalid realtime merge reach consumers and other peers;
  the remote manager lifecycle repairs, persists and attempts exchange before notification.
- Hiding only `DescriptionAliasWire` still leaks the raw map through full store types and generic
  hooks; the public barrel and generic application state now remove all such paths.

## Automated validation

| Command / check                                                                                                           | Result                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Focused revision-03 Vitest over seven sync/CRDT/domain/integration files                                                  | PASS, 7 files / 39 tests                                           |
| `pnpm test` after the final public-boundary correction                                                                    | PASS, 55 files / 1,218 tests                                       |
| `pnpm typecheck`                                                                                                          | PASS                                                               |
| `pnpm lint`                                                                                                               | PASS, 0 errors / the same 11 inherited warnings in unrelated paths |
| `pnpm build`                                                                                                              | PASS, 17 routes                                                    |
| `pnpm exec oxfmt --check` over all 12 revision-03 committed paths                                                         | PASS                                                               |
| `git diff --check` and staged diff check                                                                                  | PASS                                                               |
| `pnpm exec playwright test tests/e2e/description-aliases.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line` | PASS, 6/6                                                          |
| `pnpm exec playwright test --retries=0 --workers=4 --reporter=line` on exact committed HEAD                               | PASS, 84/84 in 1.6 minutes                                         |

The global `pnpm format:check` remains red only on inherited scratch/ledger formatting outside this
worker's authority; the evidence draft was initially an additional listed file and was formatted
before freeze. Every revision-03 committed path passes the focused formatter check.

Property replay details:

- Exact reference conservation: seed `11042026`, `40` runs.
- Full legal/malformed operation sequences: seed `20260720`, `50` runs.
- Two-peer concurrent plans: seed `17032026`, `30` runs.

## Installed-CLI manual evidence

- Used only repository-installed headless `playwright-cli` in disposable session `p11a-r03`, the
  real local Next application, local Supabase services and the container-derived server-only
  realtime secret. The recovery phrase was never extracted, logged or printed. No route was mocked.
- On `/tx-descriptions`, whitespace plus decomposed `Cafe\u0301` rendered as one NFC `Café` row. A
  precomposed duplicate produced the duplicate alert and kept one row. A temporary alias survived
  the first delete-confirmation click, disappeared on the second, returned on Undo, disappeared on
  Redo, and remained deleted after refresh.
- Created an alias while the browser context was offline; it was immediately visible, then persisted
  after reconnect and refresh. Bounded waits covered the existing sync throttle/reconnect window.
- Captured three real `sync.pushOps` request bodies during the journey. They contained encrypted
  data fields and none of the known alias plaintext. The task listener observed zero console errors.
- Separate reflow probes showed `clientWidth == scrollWidth == 320` at 320×720 ordinary zoom. At a
  1280px viewport with 200% zoom, the document remained within the viewport and the heading/Add
  controls remained visible. Dark color scheme and reduced-motion emulation retained the current
  management surface. Accessible role/name actions were used throughout.
- Full no-retry E2E separately covers the current duplicate-tab, transactions, undo/redo, offline
  retry and refresh journeys. P11B caret/autocomplete/modal/grid UX and P11C integrated performance
  flows are explicitly deferred and not certified by this revision.

## Cleanup, boundaries, questions and residual scope

- Removed both remaining manual aliases through the visible management UI, waited for sync, and
  closed the disposable browser. `playwright-cli list` reports no browser sessions. Stopped the
  task-owned dev server; no task-owned Next, Playwright CLI or Playwright test process remains.
- Moved `.playwright-cli`, `test-results` and `playwright-report` to desktop trash where present.
  Restored generated `next-env.d.ts` byte-for-byte after build/dev. Final git dirt is exactly
  root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus this untracked evidence; the index is empty.
- Scratch remains SHA-256 `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350
  lines / 24,245 bytes. The authorized checked set remains
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018; HS-004 remains unchecked pending P11B/P11C and
  independent review.
- FS-001 canonical source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Q-016 and Q-017 remain canonical normalization and destructive-concurrency authority. Revision 03
  applies them and raises no new Q proposal.
- Residual scope is deliberate: P11B must deliver autocomplete/caret/modal/grid UX and P11C must
  deliver integrated performance journeys. This implementation claims only P11A's
  model/provider/current-management invariant checkpoint.

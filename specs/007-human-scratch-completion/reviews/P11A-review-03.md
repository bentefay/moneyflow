# P11A Independent Review — Revision 03

## Review identity and verdict

- Package / requirement / revision: `P11A` / `HS-004` model checkpoint / `03`.
- Literal cumulative reviewed range:
  `eb5ab2e215130c358130d5411a92b51951c3c53a..722364b0417b4666de05df773933233d34e62033`.
- Frozen revision-03 implementation evidence: `evidence/P11A/implementation-03.md`, SHA-256
  `9656cee30c9260f5c44244fd40c6cecf46edd59d81a1ced19d7e350af77fb3cb`, 235 lines / 17,213 bytes.
- Immutable revision-01/revision-02 evidence and reviews were re-read, and every prior F-01 through
  F-06 was independently re-adjudicated against the cumulative range.
- Revision 03 contains exactly the 12 authorized product/test paths stated in HANDOFF. The index was
  empty and product/test HEAD exact throughout review.
- **Verdict: FAIL.** Revision 03 closes immediate remove-all conservation, the public application
  type escape, success-path provider persistence ordering and the requested concurrent-plan
  evidence. It does not keep a prior encryption failure visible at the local-persistence barrier,
  and the live remote path still notifies the actual Mirror/application store of the invalid
  imported state before repair. The new tests do not exercise either surviving production boundary.

## Findings

### F-01 — CLOSED: void recipes, typed Results and atomic mixed updates remain correct

The revision preserves the revision-02 fix: the internal Mirror producer has a braced `void` body,
captures the helper Result externally, and returns that typed Result through the named production
hooks (`src/lib/crdt/context.tsx:48-94`). Alias-aware transaction updates preflight alias intent
before ordinary fields, so a failed alias write cannot leave notes or another partial mutation.

The production-wrapper integration now renders the actual `VaultProvider` and `VaultUndoProvider`,
invokes the real exported alias actions, and covers every alias operation plus aliased nested
delete, aliased top-level delete and aliased import delete. Exact before/after snapshots establish
one complete undo step and redo for each success. The focused suite passed 39/39 three independent
times, the full Vitest suite passed 1,218/1,218, and the no-retry E2E rerun passed 84/84. F-01
remains closed.

### F-02 — BLOCKING: a later queue item can erase an earlier encryption failure from the barrier

The ordinary success path is materially fixed. `SyncManager` subscribes before initial hydration,
serializes local encryption and append work, exposes `awaitLocalPersistence()`, and `forceSync()`
awaits that barrier. The provider awaits initialize, synchronous repair, local persistence and
initial force-sync before constructing the undo coordinator or exposing children
(`src/components/providers/vault-provider.tsx:207-221,353-362`). The real-manager integration proves
one repair update is encrypted and present at push time, peer-exchanged and clean on reopen. This
closes the revision-02 detached-success race and first-exposure concern.

The failure semantics are not safe for multiple observed updates. Every new item is chained from
`this.localPersistenceQueue.catch(() => undefined)` before its own encryption
(`src/lib/sync/manager.ts:250-286`). If update A's encryption rejects while update B is already
queued, B starts after swallowing A's rejection. When B succeeds, `localPersistenceQueue` points to
B's resolved promise, so `awaitLocalPersistence()` and `forceSync()` resolve even though A was never
encrypted, stored in IndexedDB/memory or made retryable. The public comment that the barrier covers
“every local update observed so far” (`manager.ts:290-293`) is therefore false. A later successful
edit can mask and lose the earlier commit at the server boundary.

The new unit coverage controls the real queue and proves two successful encrypted appends are
visible to the push (`tests/unit/sync/manager.test.ts:64-95`). Its retry case injects a **push**
rejection only after durable append (`manager.test.ts:97-133`). No controlled crypto rejection
followed by another queued update proves that the barrier remains rejected or that the failed update
becomes durable and retryable. This is explicitly part of HANDOFF's controlled
crypto/persistence/push failure boundary, not a hypothetical UI enhancement.

Required remediation is a queue design that may continue serial execution without converting an
unrecovered earlier persistence failure into overall success. Preserve an accumulated failure or put
the failed update into a durable/retryable fallback before allowing the public barrier to resolve.
Add a deterministic real-manager test where A encryption fails, B is queued and succeeds, and the
barrier cannot report complete while A is absent.

### F-03 — BLOCKING: local remove-all is complete, but live consumers see remote invalid state first

The local destructive operation is substantively repaired. It resolves real or symlink input,
validates declared backlinks, discovers undeclared direct inbound symlinks, traverses every
top-level transaction and nested suspected duplicate, clears affected forward pointers, clears all
reverse maps, and tombstones the complete group in the same mutation
(`src/lib/crdt/description-aliases.ts:380-452`). Direct real/symlink examples assert exact reference
conservation before repair, repair stability, and the production-wrapper tests prove one-step
undo/redo. The revision-02 local remove-all blocker is closed.

The shipped realtime lifecycle still violates the assigned “repair before consumer notification”
boundary. `applyRemoteUpdate()` imports the decrypted user update directly into the live document at
`src/lib/sync/manager.ts:600-601`, then invokes repair at lines 606-613. `autoSyncEnabled` only
gates the manager's local-persistence subscription; it does not gate Mirror/application subscribers.
Installed `loro-mirror` subscribes directly to the document
(`node_modules/loro-mirror/src/core/mirror.ts:467-472`), and its event handler immediately applies
the event and calls `notifySubscribers()` (`mirror.ts:757-774`). Thus a concurrent remote delete
that temporarily leaves a late inbound symlink active is published to the real application store
before the subsequent repair publishes the legal state.

The revision-03 live test proves only an optional manager callback. It passes `onRemoteUpdate`,
checks that callback after repair/push, and asserts `events === ["push", "notify"]`
(`tests/integration/vault-provider-alias-repair.test.ts:173-205`). The shipped `VaultProvider`
supplies `onSyncStateChange` and `onError`, but no `onRemoteUpdate`
(`src/components/providers/vault-provider.tsx:180-201`). The actual consumer is the
BaseVaultProvider and Mirror store created at `vault-provider.tsx:353-362`; the test never
subscribes to it or records the intermediate state. Exchange and clean reopen after repair are
valid, but they do not erase the earlier invalid consumer notification.

Required remediation is an actual atomic consumer boundary: for example, merge and deterministically
repair in a detached document and import one canonical legal update into the live document, or use a
real notification-suppression/transaction mechanism that covers Mirror subscribers. The integration
must subscribe to the actual live Mirror/application store before remote delivery and prove every
observed state is legal, followed by repair exchange and a repair-free reopen.

### F-04 — CLOSED: the ordinary application surface cannot select or write raw alias wire state

The public CRDT barrel no longer exports `VaultState`, `VaultInput`, `DescriptionAliasWire`, raw
Mirror factories/store types or the raw context hook. Generic selector/action/edit APIs receive
`ApplicationVaultState = Omit<VaultState, "descriptionAliases">`; their raw-state adapters are
private (`src/lib/crdt/context.tsx:28-45,69-110`). Alias callers instead receive the legal
real/symlink domain union and named actions from the barrel (`src/lib/crdt/index.ts:7-42`).

The compile-negative application-import test imports `@/lib/crdt`, rejects the raw state/input/wire
and context names, rejects generic selection and mutation of `descriptionAliases`, and retains the
illegal real/symlink union cases (`tests/unit/domain/description-alias-types.test.ts:1-64`).
Typecheck passes with every `@ts-expect-error` consumed. Low-level serialization modules remain
available to CRDT internals, but the established ordinary application barrel no longer exposes the
illegal combinations. F-04 is closed.

### F-05 — CLOSED: shipped management CRUD remains normalized, named and one-step undoable

The management route continues to use the legal selector and named create/rename/remove-all actions.
Independent real-browser checks entered whitespace plus decomposed `Cafe\u0301` and observed one NFC
`Café` row. A precomposed duplicate displayed the typed duplicate error and retained one row. The
first delete click preserved the row, the confirmation removed it, Undo restored it, Redo removed
it, and refresh retained the deletion. Offline create was immediately visible, survived reconnect
and refresh, then was removed through the visible two-click action. F-05 remains closed under Q-016.

### F-06 — BLOCKING: broad evidence passes, but it asserts proxy callbacks and omits crypto failure

Revision 03 adds substantial assigned evidence:

- immediate exact real/symlink remove-all conservation for top-level and nested references, repair
  stability and complete production-wrapper undo/redo;
- fixed-seed `17032026`, 30-run two-peer plans of 1–20 create/rename/change-all/remove-all
  operations, exchanged deterministic repair streams and convergent reopen;
- full legal/malformed property reference conservation, seeds `11042026` (40 runs) and `20260720`
  (50 runs), plus retained scale and resolution checks;
- actual provider composition with no initial undo entry, a real encrypted local queue and peer
  reopen, aliased delete/import wrappers, and a public-barrel compile-negative boundary;
- live encrypted remote repair, exchange and repair-free reopen through a real `SyncManager`.

Two required proofs remain absent and production behavior contradicts them:

- The real queue tests never reject controlled encryption for A while B is already queued, so they
  cannot detect F-02's swallowed failure and false-resolving barrier.
- The live remote test observes the test-only `onRemoteUpdate` callback, not the Mirror/application
  subscriber that production actually notifies synchronously on `doc.import()`. It therefore cannot
  detect F-03's illegal intermediate consumer state.

The requested examples, properties, concurrent plans, first-exposure success ordering, public type
boundary and local reference conservation otherwise pass. F-06 remains blocking only for the two
surviving F-02/F-03 boundaries.

## Independent automated validation

| Check                                                                                                                     | Independent result                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused P11A Vitest command over seven assigned files, three independent processes                                        | PASS each run, 7 files / 39 tests. React emitted existing `act(...)` warnings in the action integration; no failure.                                                                       |
| `pnpm test`                                                                                                               | PASS, 55 files / 1,218 tests.                                                                                                                                                              |
| `pnpm typecheck`                                                                                                          | PASS. It does not model the runtime queue failure aggregation or Mirror notification order.                                                                                                |
| `pnpm lint`                                                                                                               | PASS with 0 errors / 11 inherited warnings.                                                                                                                                                |
| `pnpm build`                                                                                                              | PASS, 17 routes.                                                                                                                                                                           |
| `pnpm exec oxfmt --check` over all 12 revision-03 product/test paths                                                      | PASS.                                                                                                                                                                                      |
| `git diff --check eb5ab2e215130c358130d5411a92b51951c3c53a..722364b0417b4666de05df773933233d34e62033`                     | PASS.                                                                                                                                                                                      |
| `pnpm format:check`                                                                                                       | Inherited FAIL only on `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md` and frozen `specs/human-scratch.md`; all 12 revision-03 paths are clean. |
| `pnpm exec playwright test tests/e2e/description-aliases.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line` | PASS, 6/6.                                                                                                                                                                                 |
| First full `pnpm exec playwright test --retries=0 --workers=4 --reporter=line`                                            | 83/84; one unrelated transaction shift-click selection miss.                                                                                                                               |
| Isolated failed transaction case with `--repeat-each=3 --workers=1`                                                       | PASS, 3/3, classifying the prior miss as non-P11A load flake.                                                                                                                              |
| Second full no-retry E2E run                                                                                              | PASS, 84/84 in 1.6 minutes.                                                                                                                                                                |

No retry flag, quarantine or product modification was used. The successful full run included the
duplicate-tab, realtime-security, persistence, transactions, remote-history and offline-undo suites.

## Independent installed-CLI UX, accessibility, sync and privacy evidence

- Used only the repository-installed headless `playwright-cli` in disposable session
  `p11ar03review`, the real local Next application and local encrypted sync service. No route was
  mocked. The generated recovery phrase and container-derived server-only secret were never printed.
- Independently verified the normalization, duplicate, confirmation, undo/redo, refresh and offline
  journey described under F-05. Final cleanup removed every manually created alias through the
  visible management UI.
- Captured two real `sync.pushOps` request bodies across reconnect/delete. Neither contained the
  known alias plaintext; both crossed the normal encrypted sync path. Bounded waits covered the
  configured reconnect/throttle window.
- At 320×720, `clientWidth == scrollWidth == 320`; the heading and Add Alias control remained
  present. Dark color-scheme and reduced-motion preferences were both active. The semantic surface
  exposed named navigation, Add, Delete, Confirm delete, Undo and Redo controls. The CLI reported
  zero console errors.
- P11B caret/autocomplete/modal/grid UX and P11C integrated performance/import/large-virtualized
  journeys remain explicitly deferred and are not certified by this review.

This browser evidence validates the shipped management surface and encrypted offline persistence. A
normal UI journey cannot inject an encryption-function rejection or observe an internal illegal CRDT
state before React renders; those blockers are established at the real production and test
boundaries above.

## P11B/P11C deferral boundary

This review does not require P11A to implement P11B's full autocomplete, caret placement, keyboard
grid handoff, shared-alias modal, tooltip or focus behavior, nor P11C's complete
import/manual/refresh, concurrent-tab or large-virtualized transaction journeys. Durable
local-update failure semantics and repair-before-live-consumer-notification are explicit P11A
HANDOFF requirements. F-02, F-03 and their F-06 evidence are not deferred UI or performance work.

## Q proposal adjudication

Q-016 remains the accepted trim-plus-NFC, case-sensitive exact-name authority. Production helpers,
the named management route, compile/runtime tests and independent browser counterexamples conform.

Q-017 remains the accepted provisional destructive-concurrency authority: reject stale local intent,
do not resurrect deletions, and deterministically repair merged graphs. Immediate remove-all now
conforms locally and exchanged repairs converge/reopen cleanly. The live imported graph is still
published to actual consumers before repair, so F-03 remains contrary to the accepted lifecycle.

No new ambiguity requires a Q proposal. Both remaining findings follow directly from frozen
persistence-failure and consumer-notification requirements.

## Boundary, frozen-source and cleanup verification

- Final reviewed product/test HEAD is exactly `722364b0417b4666de05df773933233d34e62033`; the index
  is empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P11A/implementation-03.md`. I made no product, test,
  ledger, configuration, marker or frozen-evidence edit.
- Scratch SHA-256 is `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines /
  24,245 bytes. All 21 ordered normalized HS blocks byte-match `SCOPE.json`; the checked set remains
  exactly HS-002/HS-006/HS-010/HS-014/HS-017/HS-018. HS-004 remains unchecked.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382 bytes, with
  22 declared/actual/unique requirements: 21 HS and immutable whole-file FS-001.
- Closed and deleted the disposable browser data; `playwright-cli list` reports no sessions. Stopped
  the task-owned dev server and moved the exact generated `.playwright-cli` and `test-results`
  directories to desktop trash, where they are recoverable. No task-owned Next, Playwright test or
  CLI process remains.
- Build/dev regenerated `next-env.d.ts`; it was restored byte-for-byte to reviewed HEAD with no
  final diff. The final review artifact is the sole reviewer-authored path and is intentionally
  uncommitted.

## Single final verdict

**FAIL.** P11A revision 03 is not suitable for integration. A new immutable remediation revision
must close F-02's accumulated local-persistence failure semantics, F-03's actual live-consumer
notification ordering and the corresponding F-06 tests, then receive independent review over the
cumulative literal range.

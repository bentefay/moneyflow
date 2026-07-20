# P11A Implementation Evidence — Revision 04

## Immutable dispatch boundary

- Package/scope/revision: `P11A` / `HS-004` model-invariant remediation / `04`.
- Original cumulative BASE: `eb5ab2e215130c358130d5411a92b51951c3c53a`.
- Clean revision-04 pre-implementation HEAD: `b19f9a24733edabb405402e684baefef23d63b30`.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P11A/implementation-04.md`, created before
  revision-04 product or test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Prior evidence/reviews, ledgers, configuration, scratch, frozen sources, SCOPE and agent
  configuration remain immutable.

## Remediation plan

1. Preserve failed raw local updates as explicit pending work so later queue successes cannot mask
   an earlier encryption/persistence failure.
2. Define acknowledgement/retry semantics across the durability barrier, force sync and online
   recovery, with durable encrypted no-duplicate append evidence.
3. Stage remote updates and deterministic repair in an isolated document, then import one canonical
   legal delta into the live subscribed document.
4. Prove the actual Mirror subscriber receives exactly one legal notification, including durable
   exchange, failed-push retry, peer convergence and idempotent reopen.
5. Re-run the full automated/manual/boundary charter while preserving every previously closed gate.

## Status

Revision-04 implementation is complete at committed HEAD `fb72abdaf531dff40c59f6b3525fb1b9ce50f805`.
This is an implementer completion claim, not a PASS verdict; the exact cumulative range and this
artifact require independent review.

## Exact commit and range

- Revision-04 commit: `fb72abd fix: preserve sync failure and remote legality`.
- The commit contains exactly three authorized product/test paths, 348 insertions and 72 deletions:
    - `src/lib/sync/manager.ts`
    - `tests/integration/vault-provider-alias-repair.test.ts`
    - `tests/unit/sync/manager.test.ts`
- Independent review must use the literal cumulative range
  `eb5ab2e215130c358130d5411a92b51951c3c53a..fb72abdaf531dff40c59f6b3525fb1b9ce50f805`.
- The cumulative commits after the original BASE are `4920dcb`, `571b1ed`, `faeaebd`, `d81c503`,
  `0183a70`, `fa994d6`, `722364b`, `2bdca0e`, `b19f9a2`, and `fb72abd`.
- Exact-path staging was used. The index is empty after commit. Root-owned `HANDOFF.md` and
  `PROGRESS.md` remain unstaged; this evidence is the sole untracked worker artifact.

## Findings closed

### F-02 — sticky raw-update failure and explicit acknowledgement

- Every observed local update is copied immediately into an explicit pending record containing its
  stable operation ID and captured version vector before asynchronous encryption begins. The
  always-progressing work queue serializes attempts, but a rejected attempt remains in the pending
  map with its original raw bytes, ID and failure.
- A later update can encrypt and append successfully without acknowledging or masking an earlier
  failure. While any pending record remains, state stays `error`, the normal throttled push is not
  scheduled, and repeated `awaitLocalPersistence()` calls continue to reject with the earliest
  stored failure. `forceSync()` and the public push boundary inherit that barrier.
- Browser online recovery retries each pending raw update with the same stable ID, then requires the
  barrier to acknowledge every update before pushing. IndexedDB append remains the durable
  acknowledgement when available; the existing encrypted memory queue remains the fallback only
  after an IndexedDB failure disables local persistence. Pending raw work also participates in
  unsaved-change and before-unload detection.
- The deterministic real-manager test rejects encryption for update A, allows B to succeed, proves A
  stays observable through two barrier calls and prevents a premature push, then dispatches the real
  browser online event. The retry encrypts A once under its original ID; the actual IndexedDB store
  contains exactly two unique encrypted operations, the server receives those same two IDs in one
  batch, and decrypt/import into a fresh `LoroDoc` recovers both A and B.

### F-03 — isolated remote repair and one legal live notification

- Decrypted remote bytes are imported only into a detached persistent staging document. Alias-wire
  state plus the transaction fields relevant to alias references are projected to decide whether
  invariant repair is necessary; ordinary remote edits avoid the repair traversal. The staging
  document is incrementally caught up from the live oplog and is reset on snapshot, disconnect or
  remote-application error, avoiding a full-document fork for every operation.
- When the remote merge affects the alias invariant, deterministic production repair runs on the
  staging document. The manager exports one combined canonical delta relative to the live version
  and imports that delta once with local echo disabled. An actual `Mirror` subscriber therefore
  receives exactly one state in which the deleted real target and late inbound alias are already
  legal; it never receives the illegal intermediate state.
- The repair-only staging delta is encrypted and appended through the same durability boundary. Its
  exact stable operation ID is retained in the remote-completion set. A failed first server push
  leaves the real IndexedDB operation unpushed and emits no lifecycle completion. Online retry sends
  the same ID, and completion is emitted only when a successful pushed-ID set contains that exact
  repair operation, so an unrelated in-flight push cannot acknowledge it early.
- Integration coverage imports the original local stream, real remote deletion and decrypted durable
  repair into an independent peer. The peer and live Mirror converge exactly. A production reopen
  emits no further repair or push, and the remote repair does not enter `VaultUndoCoordinator` user
  history.

### F-06 — controlled failure, retry and no-duplicate proof

- The local persistence test uses production encryption, `fake-indexeddb`, the actual operation
  store, real barrier calls and the browser online event. It proves failure observability before
  retry, exact stable IDs, ciphertext-only storage, two-operation recovery and no duplicate append.
- The remote merge test uses the actual Mirror subscription instead of a proxy callback, controls a
  rejected then successful push, inspects the actual unpushed/all-operation stores, proves the same
  repair ID on both attempts, and verifies completion ordering, peer convergence and idempotent
  reopen.
- F-01, F-04 and F-05 remain retained by the unchanged cumulative implementation and the focused,
  full unit/integration and full no-retry browser suites. No wire schema, dependency, migration,
  public raw-write surface or management action contract changed in revision 04.

## Invariants, lifecycle and counterfactuals

- A durability acknowledgement means that the captured local update has been encrypted and is
  present either in the vault's IndexedDB operation log or, only after an IndexedDB availability
  failure, in the encrypted in-memory retry queue. Merely finishing later work does not acknowledge
  an earlier pending update.
- A remote repaired lifecycle completes only after the exact repair operation has been durably
  queued and included in a successful server push response. Failed transport retains the durable
  operation and stable ID for retry; no new user mutation is needed.
- The live alias graph remains legal at every externally subscribed notification: each active alias
  is exclusively real or symlink, every active symlink targets one active final real alias, and
  reverse/reference maps are canonical. Staging repair remains deterministic, idempotent and
  system-origin.
- Capturing only a rejection on a chained promise permits B's later success to replace A's rejected
  barrier state; the explicit pending raw-update map prevents that masking.
- Regenerating an operation ID during retry can duplicate the same CRDT update across local/server
  stores; retrying the existing pending record preserves identity.
- Importing the remote bytes into the subscribed live document and repairing afterward necessarily
  exposes an illegal intermediate Mirror state; isolated staging plus one combined live import
  removes that observability window.
- Calling the completion callback immediately after durable append, or after an unrelated push,
  misrepresents failed exchange; exact pushed-ID acknowledgement closes that race.
- Forking the complete live document for every incoming operation made long catch-up streams
  effectively quadratic. Reusing an incrementally synchronized staging document preserves the
  legal-notification boundary without that scaling regression.

## Automated validation

| Command / check                                                                                                           | Result                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Focused revision-04 Vitest over seven sync/CRDT/domain/integration files                                                  | PASS, 7 files / 40 tests                                           |
| Focused final changed-boundary Vitest                                                                                     | PASS, 2 files / 8 tests                                            |
| `pnpm test`                                                                                                               | PASS, 55 files / 1,219 tests                                       |
| `pnpm typecheck`                                                                                                          | PASS                                                               |
| `pnpm lint`                                                                                                               | PASS, 0 errors / the same 11 inherited warnings in unrelated paths |
| `pnpm build`                                                                                                              | PASS, 17 routes                                                    |
| `pnpm exec oxfmt --check` over all three revision-04 committed paths                                                      | PASS                                                               |
| `git diff --check` and staged diff check                                                                                  | PASS                                                               |
| `pnpm exec playwright test tests/e2e/description-aliases.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line` | PASS, 6/6                                                          |
| `pnpm exec playwright test --retries=0 --workers=4 --reporter=line`                                                       | PASS, 84/84 in 1.5 minutes                                         |

The first full no-retry browser run after the initial isolated-staging implementation failed 3 of 84
sync-sensitive cases: realtime inline edit and two undo/refresh convergence journeys. Focused
reproduction showed repeated full-document forks caused catch-up delay and partial peer prefixes.
The staging document was changed to persist and catch up incrementally. The previously failing undo
spec then passed 3/3 without retry, followed by the final full 84/84 no-retry run. The only product
edit after that full run was the non-semantic lint correction from `let` to `const`; the affected
Vitest set, lint, typecheck and production build all passed afterward.

The global `pnpm format:check` remains red only on the seven inherited scratch/ledger paths outside
this worker's authority after this evidence is formatted. Every revision-04 committed path passes
the focused formatter check.

Retained deterministic property replays pass through the focused/full suites:

- Exact reference conservation: seed `11042026`, `40` runs.
- Full legal/malformed operation sequences: seed `20260720`, `50` runs.
- Two-peer concurrent plans: seed `17032026`, `30` runs.

## Installed-CLI manual evidence

- Used only repository-installed headless `playwright-cli` in disposable session `p11a-r04`, the
  real local Next application, local Supabase services and the container-derived server-only
  realtime secret. The recovery phrase was never revealed, extracted, logged or printed, and no
  route was mocked.
- On `/tx-descriptions`, whitespace plus decomposed `Cafe\u0301` rendered as exactly one NFC `Café`
  row. Entering the equivalent precomposed name produced the visible duplicate message and retained
  one row. The first delete click preserved the alias, the second removed it, Undo restored it, Redo
  removed it, and refresh retained the legal state.
- A deterministic reconnect retry created `Revision Four Offline Retry` while the browser context
  was offline. It was immediately visible; after reconnect the journey observed an actual successful
  `sync.pushOps` response and `Saved`, then refresh and an existing second tab both displayed the
  alias. A separate captured successful push body contained encrypted/data fields and none of the
  known plaintext.
- The initial manual duplicate check encountered Next's route-announcer and application-alert
  locator ambiguity; the behavior-specific visible message was used afterward. One initial offline
  attempt was interrupted by before-unload during popup cleanup; the deterministic retry above
  completed the entire offline/reconnect/peer path.
- The task listener reported five messages with zero errors and zero warnings. At 320×720,
  `clientWidth == scrollWidth == 320`. At a 1280px viewport with 200% zoom, client/scroll width
  remained 1280 while the CSS body width was 640; the heading, named Add Alias action and Saved
  status remained accessible. Dark color scheme and reduced-motion emulation retained the surface.
- Dark-mode Add Alias colors converted through the browser canvas from computed Lab to sRGB
  `[2, 6, 24]` foreground and `[255, 255, 255]` background, a WCAG contrast ratio of `20.16:1`,
  above 4.5:1.
- P11B autocomplete/caret/modal/grid UX and P11C integrated performance journeys remain explicitly
  deferred and are not certified by revision 04.

## Cleanup, boundaries, questions and residual scope

- Removed all three manual aliases through the visible two-confirmation management UI, observed a
  real successful push and `Saved`, closed the duplicate tab and disposable browser, and stopped the
  task-owned dev server. `playwright-cli list` reports no browser sessions; the repository
  delete-data command reports no remaining user data.
- Moved exact generated `.playwright-cli` and `test-results` directories to desktop trash;
  `playwright-report` was absent. Restored generated `next-env.d.ts` byte-for-byte. No task-owned
  Next, Playwright CLI or Playwright test process remains.
- Scratch remains SHA-256 `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350
  lines / 24,245 bytes. The authorized checked set remains
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018; HS-004 remains unchecked pending P11B/P11C and
  independent review.
- FS-001 canonical source `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Revision 04 applies the existing decision hierarchy and raises no new Q proposal. Residual scope
  remains deliberately assigned to P11B/P11C; this artifact claims only P11A model/provider/current-
  management invariant completion and does not claim independent review PASS.

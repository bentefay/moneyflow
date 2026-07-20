# P11A Independent Review — Revision 04

## Review identity and verdict

- Package / requirement / revision: `P11A` / `HS-004` model checkpoint / `04`.
- Literal cumulative reviewed range:
  `eb5ab2e215130c358130d5411a92b51951c3c53a..fb72abdaf531dff40c59f6b3525fb1b9ce50f805`.
- Frozen revision-04 implementation evidence: `evidence/P11A/implementation-04.md`, SHA-256
  `c77582e4d6ae19e291e0499bfb0357fac5d944a77c99447086b7ca4e9f09bf87`, 214 lines / 16,195 bytes.
- Immutable revision-01 through revision-03 evidence/reviews were retained, and every F-01 through
  F-06 was independently re-adjudicated against the complete cumulative product/test range.
- Revision 04 contains exactly the three authorized product/test paths stated in HANDOFF. The index
  was empty and product/test HEAD remained exact throughout review.
- **Verdict: PASS.** Revision 04 closes the remaining encrypted-persistence failure masking, live
  consumer-before-repair and corresponding evidence gaps without reopening any previously closed
  invariant, type, mutation, undo, management or migration gate. P11A is suitable for root
  integration. HS-004 remains incomplete and unchecked until P11B and P11C independently pass.

## Findings

### F-01 — CLOSED: void production recipes, typed Results and atomic mixed updates remain intact

The cumulative implementation retains the real production-wrapper boundary: Mirror recipes mutate
drafts without returning replacement values, typed mutation Results cross the named hooks, and
alias-aware ordinary transaction updates preflight all requested fields before any write. The
provider/actions integration continues to execute create, rename, assign, exact attach,
create-and-assign, change-one, change-all, remove-one, remove-all, aliased top-level/nested delete
and aliased import delete through the actual context and UndoManager composition.

For every successful logical operation, exact before/after snapshots establish one complete undo
step, no second fragmented step, and one redo. Invalid alias plus ordinary-field input leaves both
state and history unchanged. Revision 04 does not modify these paths. Three independent focused runs
passed 40/40, the full Vitest suite passed 1,219/1,219, and the full no-retry E2E suite passed
84/84. F-01 remains closed.

### F-02 — CLOSED: failed update A remains sticky through B and retries under one stable ID

`enqueueLocalUpdatePersistence()` now copies each observed binary update immediately into a pending
record with a stable operation ID and captured version vector before asynchronous encryption starts
(`src/lib/sync/manager.ts:300-310`). The serial work queue is allowed to continue after an attempt
rejects, but the failed pending record and its Error remain present. A later successful update is
removed independently and cannot acknowledge or overwrite the earlier failure
(`manager.ts:312-363`).

`awaitLocalPersistence()` waits for all scheduled work, then rejects with the earliest stored
failure or with an explicit unacknowledged-work error while any pending record remains
(`manager.ts:365-375`). Normal throttled push first crosses this barrier. Browser-online recovery
reschedules every pending record using its original ID, waits until all are acknowledged by
encrypted IndexedDB or encrypted memory fallback, cancels the throttle and pushes
(`manager.ts:377-403,421-428`). Pending raw work also participates in before-unload and
unsaved-state checks. Consequently a failed raw update is recoverable/retryable in memory, visible
to the caller, and cannot be silently skipped by force-sync.

The real-manager test controls production encryption so update A rejects once while queued B
succeeds. It proves two consecutive barrier rejections, error state, one durable encrypted B, no
premature server call, then dispatches the actual browser `online` event. Recovery performs exactly
one additional encryption attempt, leaves two unique durable IDs, pushes the same two-ID set once,
and decrypt/import into a fresh `LoroDoc` recovers both A and B
(`tests/unit/sync/manager.test.ts:103-172`). The retained push-failure case separately proves an
already-durable batch remains unpushed and retries without a new mutation. F-02 is closed.

### F-03 — CLOSED: remote repair is isolated, published once legally and completed after exchange

Remote operations are no longer imported into the subscribed document before repair. The manager
keeps one detached staging document, forks only on first use, and incrementally catches it up from
the live oplog for subsequent operations (`src/lib/sync/manager.ts:698-711`). It imports decrypted
remote bytes there, detects alias/reference-impacting changes, runs deterministic system repair
there when necessary, then exports one combined canonical delta relative to the live version. The
live `LoroDoc` receives that delta in exactly one import with automatic echo persistence disabled
(`manager.ts:716-749`). This removes the illegal intermediate Mirror notification identified in
revision 03 while avoiding a complete document fork for every catch-up operation.

When repair produces local operations, the exact repair-only delta is enqueued through the same
encrypted persistence barrier and its stable ID enters `pendingRemoteCompletionIds`. A failed push
keeps that IndexedDB operation unpushed and emits no repair completion. A later successful push
completes only pending IDs actually included in that attempted durable batch (`manager.ts:807-898`).
This is consistent with the server's atomic, idempotent `append_vault_ops`: on successful return
every attempted ID is either newly inserted or already exists byte-identically; identity conflicts
throw. An unrelated in-flight batch therefore cannot complete a repair ID it did not contain, while
the queued follow-up push handles it.

The integration subscribes to the actual `VaultMirror`, not the optional lifecycle hook. A remote
delete racing with a late inbound symlink produces exactly one observed application state in which
both target and inbound alias are already legally tombstoned. The first controlled push rejects;
online retry uses the identical single repair ID, clears the real unpushed store and only then emits
the lifecycle callback. The repair is absent from user undo history. Decrypting the durable remote
and repair streams into an independent peer converges exactly with the live Mirror, and production
reopen is repair-free, push-free and version-stable
(`tests/integration/vault-provider-alias-repair.test.ts:148-273`). F-03 is closed.

The staging comparison projects alias wire state and transaction fields relevant to alias
references; ordinary field-only edits avoid the deterministic repair traversal. The staging document
is reset after snapshots, errors and disconnect, so it neither accumulates across an invalid
boundary nor leaks. The initial development implementation's repeated full forks caused three
sync-sensitive E2E failures; the final persistent/incremental form is the exact reviewed HEAD and
independently passes the complete suite. P11C still owns integrated large-virtualized performance
journeys; P11A does not claim them.

### F-04 — CLOSED: ordinary application imports cannot select or mutate raw alias wire states

The public CRDT barrel still excludes `VaultState`, `VaultInput`, `DescriptionAliasWire`, raw Mirror
factories/store types and the raw context hook. Generic selector/action/edit hooks receive
`ApplicationVaultState`, which omits raw `descriptionAliases`; internal adapters remain private.
Alias consumers receive the legal discriminated real/symlink union and named actions.

The compile-negative test continues to import the ordinary `@/lib/crdt` application surface and
proves the raw types/context are absent, generic raw selection/writes fail, real aliases cannot have
targets, and symlinks cannot expose recovery names/backlink-only fields. Typecheck passes with every
negative expectation consumed. Revision 04 changes no public/type path. F-04 remains closed.

### F-05 — CLOSED: normalized named management CRUD and complete history remain shipped

The management route remains on the named Q-016 normalization/mutation boundary. Independent
real-browser use entered whitespace plus decomposed `Cafe\u0301` and observed the canonical NFC row;
the equivalent precomposed create displayed the duplicate error and retained one alias. The first
delete click preserved the row, confirmation removed it, Undo restored it, Redo removed it, and the
accepted before-unload/reload retained the deletion with history reset.

An offline alias was visible immediately, reached a successful encrypted push after reconnect,
survived refresh and appeared in an authenticated second tab. Its two-click deletion converged to
both tabs and the final management state contained no manual alias. F-05 remains closed under Q-016.

### F-06 — CLOSED: assigned failure, notification, concurrency and conservation proofs are complete

The cumulative evidence now covers every P11A model/provider boundary:

- controlled update-A encryption failure plus queued-B success, repeated barrier rejection,
  original-ID online retry, encrypted durable append, unique operation set, exact recovered state
  and no premature/duplicate push;
- real persistent staging and incremental catch-up, a real Mirror subscriber with exactly one legal
  remote notification, controlled failed repair push, stable repair ID retry, lifecycle completion
  only after exchange, no user undo, independent peer convergence and repair-free reopen;
- immediate real/symlink remove-all conservation across top-level and nested duplicate forms before
  repair, repair stability and complete production-wrapper undo/redo;
- all named production alias operations and aliased transaction/import deletion with typed errors,
  atomic ordinary-field preflight and one UndoManager step;
- legal public application imports, deterministic/idempotent migration, deleted/missing target
  behavior and retained one-hop bounded resolution/large-map evidence;
- fixed-seed exact-reference property `11042026` / 40 runs, full legal/malformed operation property
  `20260720` / 50 runs, and exchanged two-peer concurrent plans `17032026` / 30 runs.

All focused/full checks independently pass at exact HEAD. The new tests exercise production
encryption, fake IndexedDB, real operation stores, actual browser-online recovery, actual Mirror and
production hydration/reopen helpers rather than the test-only proxy boundaries rejected in earlier
reviews. F-06 is closed.

## Independent automated validation

| Check                                                                                                                     | Independent result                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused P11A Vitest over seven sync/CRDT/domain/integration files, three independent processes                            | PASS each run, 7 files / 40 tests. Existing React `act(...)` warnings remained non-failing in the action integration.                                                                   |
| `pnpm test`                                                                                                               | PASS, 55 files / 1,219 tests.                                                                                                                                                           |
| `pnpm typecheck`                                                                                                          | PASS.                                                                                                                                                                                   |
| `pnpm lint`                                                                                                               | PASS with 0 errors / 11 inherited warnings.                                                                                                                                             |
| `pnpm build`                                                                                                              | PASS, 17 routes.                                                                                                                                                                        |
| `pnpm exec oxfmt --check` over all three revision-04 product/test paths                                                   | PASS.                                                                                                                                                                                   |
| `git diff --check eb5ab2e215130c358130d5411a92b51951c3c53a..fb72abdaf531dff40c59f6b3525fb1b9ce50f805`                     | PASS.                                                                                                                                                                                   |
| `pnpm format:check`                                                                                                       | Inherited FAIL only on `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md` and frozen `specs/human-scratch.md`; all revision-04 paths are clean. |
| `pnpm exec playwright test tests/e2e/description-aliases.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line` | PASS, 6/6.                                                                                                                                                                              |
| `pnpm exec playwright test --retries=0 --workers=4 --reporter=line` at exact reviewed HEAD                                | PASS, 84/84 in 1.6 minutes.                                                                                                                                                             |

No retry flag, quarantine, GUI mode or product modification was used. The full exact-HEAD run
includes duplicate-tab, realtime-security, persistence, transactions, remote-history, failed
offline-undo retry and refresh journeys.

The implementation evidence transparently records an earlier **development** run at 81/84 after the
first isolated-staging design: repeated whole-document forks delayed catch-up and exposed partial
peer prefixes in one realtime edit and two undo/refresh cases. The implementer replaced it with the
reviewed persistent incremental staging document, reproduced the affected undo spec 3/3, then
obtained 84/84. Independent review reproduced the final exact-HEAD 84/84. The disclosed red was
therefore diagnosed and corrected, not waived or hidden.

## Independent installed-CLI UX, accessibility, sync and privacy evidence

- Used only repository-installed headless `playwright-cli` in disposable session `p11ar04review`,
  the real local Next application and local Supabase services. No route was mocked. The generated
  recovery phrase and container-derived server-only secret were never printed.
- Verified the normalization, duplicate, delete-confirmation, Undo/Redo, refresh and offline journey
  described under F-05. An initial direct `newPage()` correctly lacked tab-scoped authentication and
  redirected to unlock; the authenticated same-tab-origin `window.open()` path then established two
  live vault tabs. Both converged and final snapshots showed zero aliases and two online presence
  entries before the second tab was closed.
- Captured successful create/delete `sync.pushOps` responses with status 200. Request bodies
  contained no known alias plaintext, and all manual aliases were removed through the visible
  management UI.
- The page retained named heading/Add/history/navigation/status controls. At 320×720,
  `clientWidth == scrollWidth == 320`. At 1280×720 with 200% document zoom there was no horizontal
  overflow and heading/Add remained present. Dark color-scheme and reduced-motion preferences were
  active. The CLI reported five console messages, zero errors and zero warnings.
- One early reload intentionally met the real unsaved-change `beforeunload` guard; accepting it
  preserved the completed deletion. Later persistence checks awaited successful push responses
  rather than treating that guard as a failure or using retry-dependent automation.
- P11B caret/autocomplete/modal/grid interaction and P11C integrated import/manual/large-virtualized
  performance journeys remain explicitly deferred and are not certified here.

## P11B/P11C deferral boundary

P11A now passes only the model/invariant/provider/current-management checkpoint. This review does
not approve P11B's full autocomplete, caret placement, keyboard grid handoff, shared-alias modal,
tooltip or focus behavior, nor P11C's complete import/manual/refresh/concurrent-tab and
large-virtualized journeys. Those packages remain mandatory before HS-004 completion and marker
authority. The persistent staging fix is accepted only as the required P11A remote-legality
boundary, not as a P11C performance certification.

## Q proposal adjudication

Q-016 remains the accepted trim-plus-NFC, case-sensitive exact-name authority. Named production
helpers, compile/runtime tests, E2E and independent decomposed/precomposed browser counterexamples
conform.

Q-017 remains the accepted preservation-first destructive-concurrency authority: stale local intent
is rejected, tombstones do not resurrect visible aliases, merged graphs repair deterministically,
local remove-all is immediately reference-complete, and remote merged repair is legal before live
notification and then exchanged.

No new ambiguity requires a Q proposal. Revision 04 implements explicit frozen failure/lifecycle
requirements and changes no unresolved product preference.

## Boundary, frozen-source and cleanup verification

- Final reviewed product/test HEAD is exactly `fb72abdaf531dff40c59f6b3525fb1b9ce50f805`; the index
  is empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P11A/implementation-04.md`. I made no product, test,
  ledger, configuration, marker or frozen-evidence edit.
- Scratch SHA-256 is `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines /
  24,245 bytes. All 21 ordered normalized HS blocks byte-match `SCOPE.json`; the checked set remains
  exactly HS-002/HS-006/HS-010/HS-014/HS-017/HS-018. HS-004 remains unchecked.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382 bytes, with
  22 declared/actual/unique requirements: 21 HS and immutable whole-file FS-001.
- Closed the second tab and disposable browser; `playwright-cli list` reports no sessions. Stopped
  the task-owned dev server and moved exact generated `.playwright-cli` and `test-results`
  directories to desktop trash, where they are recoverable. No task-owned Next, Playwright test or
  CLI process remains.
- Build/dev regenerated `next-env.d.ts`; it was restored byte-for-byte to reviewed HEAD with no
  final diff. The final review artifact is the sole reviewer-authored path and is intentionally
  uncommitted.

## Single final verdict

**PASS.** P11A revision 04 satisfies its model, invariant, migration, persistence, remote-legality,
atomic mutation, undo, public type, management and required evidence gates over the exact cumulative
range. Root may integrate the immutable evidence/review and mark **P11A only** passed. HS-004 must
remain unchecked until P11B and P11C independently pass and root completes their integration gates.

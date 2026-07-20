# P11A Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P11A` / `HS-004` model checkpoint / `02`.
- Literal cumulative reviewed range:
  `eb5ab2e215130c358130d5411a92b51951c3c53a..d81c5039c41577f94791bedc4184b98940c631a6`.
- Frozen revision-02 implementation evidence: `evidence/P11A/implementation-02.md`, SHA-256
  `b612081957b3c710dbb574ad78ce4b39765117b85a290e4d13a117fbb49b101f`, 236 lines / 16,405 bytes.
- Immutable revision-01 evidence/review were also re-read and every prior F-01 through F-06 was
  independently re-adjudicated against the cumulative range.
- Revision 02 contains exactly the 16 authorized product/test paths stated in HANDOFF. The index was
  empty and product/test HEAD exact throughout review.
- **Verdict: FAIL.** The revision fixes the production Immer result crash, typed-result propagation,
  management normalization and the original declared-backlink resurrection case. It does not provide
  the promised durable production hydration barrier, remove-all is still incomplete until a later
  repair that the live action never runs, and raw illegal alias states remain available through the
  exported generic selector/action boundary. Required provider/concurrent/property evidence misses
  those same boundaries.

## Findings

### F-01 — CLOSED: production recipes are void, Results propagate, and mixed updates preflight

`runVaultAction()` captures the helper Result in an external array while the Mirror producer uses a
braced body and returns nothing (`src/lib/crdt/context.tsx:46-64`). The public hook returns that
typed Result (`context.tsx:67-80`), and every named alias action crosses the same boundary
(`context.tsx:475-536`). This removes the revision-01 modified-draft-plus-replacement failure.

The alias-aware generic transaction update validates and applies the requested alias before invoking
the lower ordinary-field updater; an alias error returns before notes or other fields are written
(`src/lib/crdt/description-aliases.ts:416-442`). The production-wrapper test executes create,
rename, assign, create-and-assign, exact attach, change-one, change-all, remove-one, remove-all,
transaction delete and import delete. For every success it proves one undo restores the exact
pre-state, a second undo is unavailable, and redo restores the exact post-state
(`tests/integration/description-alias-actions.test.ts:56-140`). The invalid alias plus notes case
proves no write and no undo entry (`description-alias-actions.test.ts:142-164`).

Three independent focused runs, the complete Vitest suite and all 84 no-retry E2E tests pass. In
particular, all four revision-01 transaction/realtime regressions now pass. F-01 is substantively
closed.

### F-02 — BLOCKING: repair completion is not awaited into the real persistence/sync queue

The provider now invokes repair at the correct structural point: after `manager.initialize()` and
before construction of the user undo coordinator or exposure of children
(`src/components/providers/vault-provider.tsx:40-49,204-218`). That closes the old reachability
finding, and the repair itself is synchronously visible to the first reader.

It does **not** establish the claimed durable encrypted flush. The real manager installs an async
local-update handler (`src/lib/sync/manager.ts:216-278`). Loro's installed public contract accepts a
callback returning `void` (`node_modules/loro-crdt/bundler/loro_wasm.d.ts:149`), so the Promise from
that async handler is not a barrier. After repair commits, encryption and `appendOp()` therefore run
as detached async work (`manager.ts:242-266`). `hydrateAndRepairVaultDocument()` immediately awaits
`forceSync()` (`vault-provider.tsx:45-48`), but `forceSync()` only asks `pushToServer()` to read the
already-appended IndexedDB/memory operations (`manager.ts:648-684,804-808`). It can observe zero
operations and return before the repair handler has encrypted or appended its update. The provider
can then expose children at `vault-provider.tsx:214-218` while the repair is not yet locally durable
or server-pushed.

The new provider test substitutes a fake manager whose `forceSync()` directly exports the repair
bytes from the document (`tests/integration/vault-provider-alias-repair.test.ts:28-41`). It bypasses
the actual local-update listener, encryption, IndexedDB/memory queue and server push. The second
test only asserts that the fake `forceSync` was called
(`vault-provider-alias-repair.test.ts:72-96`). It cannot detect this race and does not prove
encrypted persistence or real provider/manager durability.

Required remediation is an explicit awaitable local-update persistence barrier in `SyncManager`, or
an equivalent direct repair-persistence API. Provider exposure must await the repair update being
encrypted and durably queued; any required initial push semantics must also be made explicit. The
integration must use the real queue with controlled persistence/push dependencies and prove
ordering, not replace the behavior under review with a document export.

### F-03 — BLOCKING: remove-all leaves transaction references until an uninvoked later repair

Revision 02 correctly resolves real or symlink input to the final real, preflights the target's
declared inbound backlinks, and tombstones/canonicalizes the target plus those inbound nodes
(`src/lib/crdt/description-aliases.ts:380-414`). Migration also propagates deletion through paths it
discovers, which prevents the specific revision-01 recovery-name resurrection after repair.

The live operation still does not remove the alias from transactions. It neither clears the target
and inbound aliases' `transactionIds` nor traverses authoritative top-level/nested transactions to
clear their `descriptionAliasId` pointers (`description-aliases.ts:406-413`). The direct test hides
this by calling `repairDescriptionAliases(state)` immediately after `removeAllDescriptionAliases()`
inside the same test-only Mirror recipe
(`tests/unit/crdt/description-alias-mutations.test.ts:272-305`). The production action invokes
remove-all alone (`src/lib/crdt/context.tsx:520-523`); production does not run hydration repair
after each user mutation. Consequently “Remove from all” can return success and one undoable step
while every affected transaction still stores a pointer to a deleted alias and the tombstones retain
reverse bookkeeping until a later reload/repair. The management E2E has no referencing transaction,
and the wrapper test checks snapshot reversibility rather than the required postcondition, so both
pass without seeing the defect.

There is a related live-merge gap. A concurrent inbound symlink absent from the target's local
`symlinkIds` is not part of the remove-all group. Migration would propagate the tombstone on reopen,
but no repair runs on realtime imports; until hydration/reopen, the active symlink points to a
deleted target, contrary to the active one-hop graph invariant. The opposing-peer test manually
repairs each peer after exchanging user changes
(`tests/integration/description-alias-crdt.test.ts:84-130`), so it does not prove that the shipped
live lifecycle maintains the invariant or exchanges the repair.

Remove-all must atomically clear every applicable transaction forward pointer and all reverse maps
in the same production action, for both real and symlink input, including top-level and nested
forms. The live remote-update lifecycle must also enforce or immediately repair Q-017's merged legal
state, then exchange that repair. Tests must assert the state immediately after the production
action, before any explicit repair, and through undo/redo, peer delivery and reopen.

### F-04 — BLOCKING: legal alias hooks exist, but raw public selectors/actions remain exported

The new `DescriptionAlias` domain union is sound: real nodes expose name/backlinks, symlinks expose
a target and no recovery name (`src/lib/domain/description-aliases.ts:14-33`). Conversion rejects
incomplete/contradictory records and drops the symlink recovery name
(`description-aliases.ts:46-85`). `useDescriptionAliases()`, the active hook and the query helper
now return that legal representation. The compile-negative tests correctly reject illegal values
when a caller has already chosen the domain union.

This does not make illegal combinations or recovery names unavailable through public selector/action
types as HANDOFF requires. The same application context still publicly exports `useVaultState`,
`useVaultSelector`, `useVaultContext` and generic `useVaultAction`
(`src/lib/crdt/context.tsx:39-43,46-80`). `VaultState` and `DescriptionAliasWire` remain exported
(`src/lib/crdt/schema.ts:367,382`). An application caller can therefore type-correctly select
`state.descriptionAliases`, read a symlink's wire `name`/`symlinkIds`, or mutate raw alias fields
with the generic action. The comment that the converted collection is “the only alias collection
exposed to application consumers” (`domain/description-aliases.ts:72`) is not true of the exported
API.

The type tests do not attempt the counterexample through the generic context exports, so their
negative cases do not prove the assigned boundary. The low-level wire representation can remain
inside CRDT implementation modules, but it needs a non-application/internal boundary, or the generic
public hooks must exclude alias wire state and raw alias writes. Compile coverage must prove that an
ordinary application import cannot obtain or construct the illegal alias combinations.

### F-05 — CLOSED: shipped management CRUD uses named normalized actions

The management route now consumes the legal selector and named action API. Create and rename use the
Q-016 trim-plus-NFC, case-sensitive policy and render typed duplicate errors; delete crosses the
named remove-all action. Independent real-browser checks entered whitespace plus decomposed
`Cafe\u0301` and observed one precomposed `Café`. A canonically equivalent create remained at one
row, displayed `An alias named Café already exists`, and added no history entry. A rename of a
second alias to the same decomposed name displayed the same error, preserved the underlying name
after cancel, and added no history entry. A valid decomposed rename displayed NFC `Résumé` and
undid/redid completely.

Create, valid rename and two-click delete each performed one complete visible undo/redo step.
Refresh preserved the resulting document and reset user history. The updated management E2E passed
three consecutive repetitions and the full E2E suite. F-05 is closed; F-03 remains a model defect
that the current no-transaction management journey cannot expose.

### F-06 — BLOCKING: expanded tests are useful but still miss assigned provider/concurrency/reference boundaries

Revision 02 materially improves evidence:

- fixed seed `11042026`, 40 runs, covers exact forward/reverse conservation for randomized
  assignment/removal;
- fixed seed `20260720`, 50 runs of 20–100 operations, covers create, rename, assign, change-one,
  change-all, remove-one, remove-all, delete and malformed repair while checking graph legality;
- the 10,000-unrelated-record proxy proves successful symlink resolution performs exactly two reads;
- named production-wrapper undo/redo, typed mixed-error, real/symlink remove-all, normalization,
  deletion examples and management E2E cover many old omissions.

The remaining gaps are exactly where F-02 through F-04 survive:

- The “full-operation” property asserts `expectLegalGraph()` only
  (`tests/unit/crdt/description-alias-mutations.test.ts:524-600`); it does not assert exact
  transaction reference conservation. Its remove-all branch is followed by repair on every step,
  masking the live operation's incomplete postcondition.
- No randomized concurrent plan exists. The sole opposing-peer example uses one fixed change-all
  pair, then calls local repair independently on each peer and compares state without exchanging
  repair updates or reopening through the real provider.
- The provider test uses a fake manager and directly exports update bytes. It provides no real
  encrypted queue/persistence/push ordering, no failure/retry barrier and no first-exposure
  assertion against the actual `SyncManager` behavior.
- The production-wrapper transaction-delete and import-delete entries seed transactions without any
  alias assignment (`tests/integration/description-alias-actions.test.ts:56-63,112-123`). They prove
  a generic delete can undo, not that alias unlink bookkeeping undoes/redoes atomically through the
  real wrapper.
- Compile-negative cases exercise the legal union directly, not the exported generic selector/action
  escape hatch in F-04.

The required fixed-seed, scale and broad example evidence passes, but the explicit concurrent-plan,
provider durability, immediate remove-all conservation and public-boundary requirements remain
unproved and contradicted by static production behavior. F-06 is therefore not closed.

## Independent automated validation

| Check                                                                                                                                        | Independent result                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused P11A Vitest command over six assigned domain/CRDT/integration files, three independent processes                                     | PASS each run, 6 files / 53 tests.                                                                                                                                                         |
| `pnpm test`                                                                                                                                  | PASS, 55 files / 1,214 tests.                                                                                                                                                              |
| `pnpm typecheck`                                                                                                                             | PASS. It does not detect the async-void callback ordering or generic raw API escape.                                                                                                       |
| `pnpm lint`                                                                                                                                  | PASS with 0 errors / 11 inherited warnings.                                                                                                                                                |
| `pnpm build`                                                                                                                                 | PASS, 17 routes.                                                                                                                                                                           |
| `pnpm exec oxfmt --check` over all 16 revision-02 product/test paths                                                                         | PASS.                                                                                                                                                                                      |
| `git diff --check eb5ab2e215130c358130d5411a92b51951c3c53a..d81c5039c41577f94791bedc4184b98940c631a6`                                        | PASS.                                                                                                                                                                                      |
| `pnpm format:check`                                                                                                                          | Inherited FAIL only on `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md` and frozen `specs/human-scratch.md`; all 16 revision-02 paths are clean. |
| `pnpm exec playwright test tests/e2e/description-aliases.spec.ts --project=chromium --retries=0 --repeat-each=3 --workers=1 --reporter=list` | PASS, 6/6.                                                                                                                                                                                 |
| `pnpm exec playwright test --project=chromium --retries=0 --workers=4 --reporter=list`                                                       | PASS, 84/84 in 1.5 minutes.                                                                                                                                                                |

No retry, quarantine or environment exception was used. The full run included the dedicated
duplicate tab, remote-history, offline undo retry, realtime security, persistence and transaction
suites.

## Independent installed-CLI UX, accessibility, sync and privacy evidence

- Used the repository-installed headless `playwright-cli` with disposable session `p11ar2`, the real
  Next application and local encrypted sync service. No route was mocked, no arbitrary sleep was
  used, and the generated recovery phrase and server-only secret were never printed.
- On the shipped `/tx-descriptions` page, independently verified the NFC create/duplicate/rename
  cases and exact history behavior described under F-05. Two-click delete removed the row; one Undo
  restored it; one Redo removed it. A final refresh retained state and reset both history controls.
- Created an alias while the browser was offline. It appeared locally with Undo enabled; the sole
  transition back online reached `Saved` with the alias intact. It was then removed through the
  visible two-click action and the final route showed zero aliases and `Saved`.
- At 320×720, `scrollWidth == viewport == 320`; the page had no horizontal overflow and remained
  visually coherent. The semantic tree retained named Add/Edit/Delete/Undo/Redo/navigation controls,
  and programmatic keyboard focus on Add Alias matched `:focus-visible`. Reduced-motion preference
  was active. Forced app dark-token mode rendered the error and card hierarchy correctly; the
  duplicate error's computed CIELAB colors convert to a 6.17:1 contrast ratio. A 200% reflow probe
  at 1280×720 retained the content with no horizontal overflow.
- A captured successful `sync.pushOps` request contained vault/operation identifiers, ciphertext and
  version vectors only. It contained neither `Café`, `Résumé` nor other alias plaintext. Before and
  after the intentional offline/reconnect journey the CLI reported zero console errors and warnings.
- P11B caret/autocomplete/modal/grid behavior and P11C integrated virtualized/import/manual journeys
  were not certified here. Dedicated full-suite duplicate-tab and two-client remote-history tests
  passed, but a fresh CLI `tab-new` is not falsely represented as Chromium's genuine Duplicate Tab.

This real-browser success confirms F-01/F-05 and the current surface quality. It cannot create a
malformed encrypted server snapshot before provider exposure or introspect detached local-update
Promises; F-02 is established by the real production ordering and the fake-test boundary above.

## P11B/P11C deferral boundary

This review does not require P11A to implement P11B's complete autocomplete, caret placement,
keyboard grid handoff, shared-alias modal, tooltip or focus behavior, nor P11C's complete
import/manual/refresh/concurrent-tab/large-virtualized transaction journeys. F-02's production
hydration durability, F-03's immediate remove-all/reference and live merged-graph invariants, F-04's
typed application boundary and F-06's assigned model evidence are explicitly P11A requirements in
HANDOFF. They are not deferred UI or performance requests.

## Q proposal adjudication

Q-016 remains the accepted trim-plus-NFC, case-sensitive exact-name authority. The named helpers and
shipped management route now implement it, and independent create/rename counterexamples pass.

Q-017 remains the accepted provisional destructive-concurrency authority: reject stale local intent,
do not resurrect deletions, and deterministically repair merged graphs. Tombstone propagation
improves non-resurrection after repair, but the live remove-all and remote-update lifecycle in F-03
do not yet maintain the complete state immediately or repair merged graphs before reopen.

No new ambiguity requires a Q proposal. The remaining findings follow directly from the frozen
atomicity, legal-boundary, provider-durability, reference and concurrent-evidence requirements.

## Boundary, frozen-source and cleanup verification

- Final reviewed product/test HEAD is exactly `d81c5039c41577f94791bedc4184b98940c631a6`; the index
  is empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P11A/implementation-02.md`. I made no product, test,
  ledger, configuration, marker or frozen-evidence edit.
- Scratch SHA-256 is `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines /
  24,245 bytes. All 21 ordered normalized HS blocks byte-match `SCOPE.json`; the checked set remains
  exactly HS-002/HS-006/HS-010/HS-014/HS-017/HS-018. HS-004 remains unchecked.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382 bytes, with
  22 unique requirements: 21 HS and immutable whole-file FS-001.
- Closed the disposable browser; `playwright-cli list` reports no sessions. Removed every manually
  seeded alias through the visible UI, stopped the task-owned dev server, and moved the exact
  generated `.playwright-cli` and `test-results` directories to desktop trash; they are recoverable
  and absent from the workspace. No task-owned Next, Playwright test or CLI process remains.
- Build/dev regenerated `next-env.d.ts`; it was restored byte-for-byte to reviewed HEAD with no
  final diff. The final review artifact is the sole reviewer-authored path and is intentionally
  uncommitted.

## Single final verdict

**FAIL.** P11A revision 02 is not suitable for integration. A new immutable remediation revision
must close F-02, F-03, F-04 and the corresponding F-06 evidence gaps, then receive independent
review over the cumulative literal range.

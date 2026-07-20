# P09 Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P09` / `HS-006` / `02`.
- Literal cumulative reviewed range:
  `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed..418234e28ac649e03ce8ad184d08a8a2f2416149`.
- Frozen implementation evidence: `evidence/P09/implementation-02.md`, SHA-256
  `ea8a779eedae9c4520edf37e01164db70c49ddd8d0b8ae8b6846c7d590b693cb`, 220 lines / 16,189 bytes.
- The cumulative range contains revision-01 product commit `af06fb2`, its immutable failure/control
  commits `74bbc71` and `54a9f28`, and revision-02 remediation commit `418234e`. The remediation
  commit contains exactly the seven authorized product/test paths stated in HANDOFF.
- **Verdict: PASS.** The cumulative implementation satisfies HS-006. Revision 02 closes both
  immutable revision-01 findings under their exact counterfactuals without regressing the already
  sound standard-Loro, origin filtering, action grouping, lifecycle, shortcut, UI, persistence or
  peer-sync behavior. I found no new material defect.

## Findings

No blocking or non-blocking implementation finding remains in the reviewed scope.

## Immutable finding closure

### F-01 closed — one controlled focus session is one document-history step

Revision 01 opened and microtask-closed one Loro group per hook invocation, so separate controlled
input events became separate document steps. Revision 02 replaces that accidental timing boundary
with an explicit typed edit session:

- `VaultUndoCoordinator.beginEditSession()` first closes any active action/edit, opens one standard
  Loro `groupStart()`, and binds update/commit/cancel capabilities to a unique ID
  (`src/lib/crdt/undo.tsx:118-134`). A stale, canceled, replaced or disposed handle cannot update a
  later group (`src/lib/crdt/undo.tsx:186-210`).
- Ordinary synchronous actions retain their microtask boundary, but an ordinary action closes an
  active edit first. The discriminated action/edit group and per-group ID prevent unrelated work
  from merging (`src/lib/crdt/undo.tsx:171-210`). There is no merge window or sleep.
- `useVaultEditAction()` owns the session for one mounted field, commits it on cleanup, and performs
  every `setState` immediately with `user:edit`; it buffers only the history boundary, not data
  (`src/lib/crdt/context.tsx:59-118`). Therefore each input event still produces its normal local
  CRDT update and encrypted IndexedDB append.
- Vault Name now begins on focus, updates each `onChange`, and closes on blur, Enter or Escape
  (`src/components/features/vault/VaultSettingsForm.tsx:57-74`). Escape intentionally isolates the
  already-immediate writes rather than silently rolling them back; global Undo remains the lossless
  reversal path.
- Undo, redo, clear and coordinator disposal close an active group before operating. Disposal then
  unsubscribes, clears, frees and invalidates the manager, preserving strict-remount and
  vault/document replacement safety (`src/lib/crdt/undo.tsx:136-169`).

Independent installed-CLI counterfactual on the real application:

1. Focus Vault Name, select `My Vault`, and type `Draft Native` using real character events.
2. Select the last character and type `X`; the controlled value is `Draft NativX`.
3. Press native Ctrl+Z while the input remains focused; the value is `Draft Native`, proving the
   document listener did not steal native input history.
4. Press Tab, then one visible global Undo; the complete edit restores `My Vault`, disables Undo and
   enables Redo.
5. One visible Redo restores the complete `Draft Native` edit and disables Redo. No character-level
   document step remains.

The focused unit test additionally drives five awaited input-event turns, observes five immediate
local Loro updates and proves exactly one undo/redo step. Separate tests cover unrelated-action
isolation, cancel/stale-handle rejection, hook unmount, disposal and document replacement. The real
E2E uses sequential typing plus a deterministic single-character native replacement/undo before
blur; it would fail under revision 01.

### F-02 closed — a genuinely failed push retries on online without another mutation

Revision 01 left durable `pushed:false` operations after a failed trailing throttle because no
pending invocation or browser-online owner remained. Revision 02 adds that missing lifecycle to the
existing sync owner:

- The browser `online` listener cancels a stale throttle and invokes the same `pushToServer()` that
  rereads durable IndexedDB and degraded-memory operations (`src/lib/sync/manager.ts:284-304`). It
  does not depend on component focus, visibility, reload, another mutation or a test hook.
- `pushToServer()` retains a single-flight gate. Signals arriving while it is active set one
  coalescing flag; the follow-up begins only from `finally`, after the current request has released
  the gate (`src/lib/sync/manager.ts:648-658,717-723`). This loses no local update while avoiding
  concurrent server mutations.
- A success marks every attempted operation ID pushed, including an idempotent duplicate response
  whose `insertedIds` is empty (`src/lib/sync/manager.ts:687-711`). A failure truthfully leaves the
  operation unpushed and state `error` for the next local or online signal
  (`src/lib/sync/manager.ts:712-723`). There is no runaway timer retry loop.
- Disconnect cancels the throttle, clears the coalesced request, removes the exact online listener
  and makes later signals inert (`src/lib/sync/manager.ts:829-865`). Sync state now retains the same
  value delivered to consumers (`src/lib/sync/manager.ts:867-873`).

Independent real-app causal sequence after an actual two-tab reload:

1. Set the browser context offline, type `Offline Review` character by character, blur and click
   global Undo. The local value immediately returns to `Draft Native`; Undo is disabled, Redo is
   enabled and accessible status is `Sync error`.
2. Requests 168 and 172 to `sync.pushOps` fail with `ERR_INTERNET_DISCONNECTED`. This proves the
   throttle fired and failed before reconnect.
3. Change only browser network state to online. There is no mutation, reload, focus, visibility
   substitute or force-sync call.
4. The duplicated peer's automatic request 60 returns 200 with 15 newly inserted operation IDs; the
   source manager's concurrent idempotent request 180 returns 200 with an empty insertion list. Both
   statuses become `Saved`. This is the intended shared-store race: one manager inserts the durable
   batch and the other safely recognizes the same attempted IDs as pushed.
5. Both clients retain final `Draft Native`; the receiver's Undo and Redo remain disabled. Thus the
   edit and undo operations reached the permanent server trail while remote history stayed excluded.

The checked-in no-retry E2E isolates the source and peer contexts, awaits `requestfailed` before it
sets the source online, then awaits a successful push and requires more than one newly inserted ID.
The manager unit test uses the real two-second throttle, fake IndexedDB, a first rejected server
call, an online-only second call and final pushed/idle state. Its burst test holds the retry open,
proves maximum server-call concurrency is one, proves signals coalesce, and verifies listener
cleanup after disconnect.

## Cumulative acceptance and architecture audit

- The cumulative implementation uses installed `loro-crdt` 1.13.7's standard `UndoManager`,
  `groupStart/groupEnd`, origin-prefix exclusion, `undo/redo`, `canUndo/canRedo`, `clear` and
  `free`. Installed `loro-mirror` 2.2.0 forwards the supplied origin to Loro commit. No private or
  invented API is used.
- Manager creation remains after SyncManager hydration. Remote peer updates and system hydration,
  migration, sync, GC and maintenance origins are excluded. Local undo/redo are ordinary Loro local
  changes and therefore use the existing encrypted persistence/sync path.
- Add, edit-on-commit, delete, shared-alias and multi-record import actions retain one logical step;
  new local edits clear redo. Online two-client automation proves remote updates do not enter local
  history and a local undo propagates while preserving independent remote state.
- One cleaned-up shell listener supports Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Meta+Z, Meta+Shift+Z and
  Meta+Y outside editables. Inputs, textareas, selects, contenteditable variants and ARIA textboxes
  retain native behavior. Default is prevented only after a document operation changes state.
- Undo and Redo remain semantic named icon buttons with truthful disabled state, disabled-wrapper
  tooltips and visible keyboard focus in expanded desktop, collapsed desktop and mobile shells.
- Refresh resets local history without reverting document state. Provider/coordinator replacement
  tests cover the active document lifecycle; the product still has no usable multi-vault switch UI,
  so static lifecycle review and direct replacement coverage are the available exact evidence.
- The cumulative product and tests contain no sleep, hidden retry, timer polling loop, test-only
  product hook, mocked E2E route, skipped/only test, new dependency, migration, server/auth/crypto
  change or configuration change.

## Independent automated validation

| Check                                                                                                                             | Independent result                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run tests/unit/crdt/undo.test.tsx tests/unit/components/undo-controls.test.tsx tests/unit/sync/manager.test.ts` | PASS, 3 files / 13 tests.                                                                                                                                                                    |
| `pnpm test`                                                                                                                       | PASS, 50 files / 1,185 tests.                                                                                                                                                                |
| `pnpm typecheck`                                                                                                                  | PASS.                                                                                                                                                                                        |
| `pnpm lint`                                                                                                                       | PASS with 0 errors / the same 13 inherited warnings; no P09 warning.                                                                                                                         |
| `pnpm exec oxfmt --check` on all 13 cumulative P09 product/test paths                                                             | PASS.                                                                                                                                                                                        |
| `pnpm format:check`                                                                                                               | Inherited FAIL only on `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md` and frozen `specs/human-scratch.md`; every P09 product/test path is clean. |
| `pnpm exec playwright test tests/e2e/undo-redo.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line`                   | PASS, 9/9 in 1.3 minutes with no retry or inconsistent repetition.                                                                                                                           |
| `pnpm exec playwright test --retries=0 --workers=4 --reporter=line`                                                               | PASS, full 84/84 in 1.5 minutes.                                                                                                                                                             |
| `git diff --check c9146fae2c5534313d21b4f34cb2b012eaeeb4ed..418234e28ac649e03ce8ad184d08a8a2f2416149`                             | PASS.                                                                                                                                                                                        |

The E2E assertions are causal and observable. The edit regression uses real input events and native
keyboard history. The offline regression awaits the actual failed request before reconnect, then
uses only the online transition and parses the successful server response. The suite uses the real
app, persistence and server routes with retries disabled; there is no route interception, arbitrary
wait or hidden product stimulus. Full E2E also revalidates duplicate-tab, offline persistence,
Realtime security and the surrounding application journeys.

## Independent installed-CLI UX, accessibility and sync evidence

- Used only repository-installed headless `pnpm exec playwright-cli` with unique disposable session
  `review-p09-r02`, the real Next app and local Supabase/Realtime service. No browser MCP, `npx`,
  temporary test/config, mocked route, GUI/headed/debug/UI/show mode, arbitrary wait or persisted
  credential was used. The local Realtime secret was passed to the task-owned dev process without
  printing it.
- Created an identity through the visible onboarding UI without printing its recovery phrase.
  Initial settings exposed `generic "History controls"`, disabled named Undo/Redo buttons, status
  `Saved`, and disabled Undo tooltip `Undo (Ctrl+Z)`.
- The F-01 and F-02 observations above independently close the exact prior failures. After reload,
  both tabs began with empty history and two online presence entries. The final receiver remained at
  `Draft Native` with Undo/Redo disabled after receiving the durable edit/undo batch.
- At 320x720 ordinary zoom, Redo was fully in bounds at x=180..212 with a 32x32 target and
  `scrollWidth == viewport == 320`. Dark color scheme and reduced motion both reported active. With
  the app's dark token class applied, enabled-control RGB `248,250,252` on header RGB `15,23,43`
  measured 17.04:1 contrast.
- Keyboard traversal focused the named Redo button and exposed its standard 3 px focus ring.
  Expanded and collapsed 1024x720 desktop both retained the named History controls and Undo/Redo
  buttons.
- At the separately required 200% zoom probe, the inherited shell expanded to `scrollWidth 556`
  against viewport 320; Redo occupied x=308..372 and remained represented/reachable by scrolling.
  This is the already disclosed P20B/P21 shell-reflow limitation, not a P09 regression.
- The source console contained 23 errors and zero warnings, all causally produced during the forced
  offline interval: failed push/authorization requests, SyncManager reports, Realtime sockets and
  development stack/font fetches. No new error appeared after the successful online push.

## Q-015 adjudication

The complete revision-01 proposal is already transcribed once as canonical `Q-015`. Its selected
Option A remains the safe, reversible default: retain conventional Meta+Shift+Z and the literal
Meta+Y counterpart to Ctrl+Y, with both excluded inside editables. Focused unit and E2E assertions
cover both. Revision 02 introduces no new ambiguity and needs no duplicate Q proposal.

## Boundary, frozen-source and cleanup verification

- Final reviewed product/test HEAD is exactly `418234e28ac649e03ce8ad184d08a8a2f2416149`; the index
  is empty. Before this review file, dirt was only root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md`, and frozen untracked `evidence/P09/implementation-02.md`. I made no product, test,
  ledger, configuration, marker or frozen-source edit.
- Scratch SHA-256 is `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines /
  24,244 bytes. Independent `jq`/`sed`/`diff` comparison proves all 21 ordered normalized HS blocks
  byte-match `SCOPE.json`; the five checked HS blocks remain exactly the authorized
  HS-002/HS-010/HS-014/HS-017/HS-018 set. HS-006 remains unchecked pending root integration.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382 bytes, with
  22 unique requirements: 21 HS and the whole-file FS-001 selector.
- Closed the CLI browser and both tabs, deleted its disposable data, stopped the task-owned dev
  server, and moved the exact generated `.playwright-cli` and `test-results` directories to desktop
  trash; they are recoverable and absent from the workspace. `playwright-cli list` reports no
  browsers. No task-owned Next, Playwright test or CLI process remains.
- Full-E2E and manual runs regenerated `next-env.d.ts`; it was restored byte-for-byte to reviewed
  HEAD and has no final diff.

## Single final verdict

**PASS.** P09 revision 02 closes F-01 and F-02 under exact independent counterfactuals, preserves
the complete cumulative HS-006 acceptance surface, and is suitable for root integration at exact
reviewed HEAD `418234e28ac649e03ce8ad184d08a8a2f2416149`.

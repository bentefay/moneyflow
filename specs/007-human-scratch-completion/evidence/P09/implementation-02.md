# P09 Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package/scope/revision: `P09` / `HS-006` / `02`.
- Original package BASE: `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`.
- Revision-01 product HEAD: `af06fb2ad32fe292aef15a011c2040cb54cf5dfa`.
- Clean pre-implementation HEAD: `54a9f28e1c272ada62bea52f46b587f206d3057f`.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P09/implementation-02.md`, created before revision-02
  product/test edits and intentionally left uncommitted.
- At dispatch, the index and untracked set were empty. Git-visible dirt was exactly root-owned
  unstaged `HANDOFF.md` and `PROGRESS.md`.
- Revision-01 evidence/review, ledgers, configuration, frozen sources, markers and every path not
  explicitly authorized by HANDOFF remained read-only.

## Revision plan

1. Reproduce and close F-01 with a typed focus-to-close edit session that preserves immediate
   CRDT/IndexedDB commits while grouping separate input-event turns into one document history step.
2. Reproduce and close F-02 in `SyncManager` with a cleaned-up browser-online lifecycle that safely
   retries durable `pushed:false` operations after a real failed push.
3. Add focused manager/CRDT and no-retry real-browser regressions for the exact reviewer
   counterfactuals while retaining revision-01 grouping, filtering, shortcut and peer coverage.
4. Run focused, full and repeated retries-disabled checks; complete the installed headless CLI
   charter for both findings and the original task matrix.
5. Restore generated state, commit exact authorized product/test paths only, and finalize this
   evidence for independent review without a PASS claim.

## Revision-01 counterfactuals reproduced

- **F-01 cause:** Revision 01 opened a Loro group for each `useVaultAction()` call and closed it at
  the next microtask. Several synchronous calls in one click correctly grouped, but controlled
  autosave input events occur in distinct tasks, so character-by-character Vault Name editing
  created one document undo step per input event.
- **F-01 observed counterfactual:** The immutable review typed `Draft Native`, performed native
  Ctrl+Z while focused, blurred, and needed multiple global Undo operations (`Draft Native`, then
  `Draft Nativ`) instead of one complete focus-to-blur edit reversal. Revision-01 automation used
  `fill()` or Enter-commit editing and did not exercise this path.
- **F-02 cause:** A local update was immediately appended to IndexedDB with `pushed:false`, then a
  trailing 2-second throttle called `pushToServer()`. Failure set `error` but did not leave a
  trailing invocation. Visibility `flush()` had nothing pending and there was no browser `online`
  listener, so reconnect alone could not retry durable operations.
- **F-02 observed counterfactual:** The immutable review saw offline `sync.pushOps` failures, then
  Realtime reauthorization but no subsequent push. The accessible status remained `Sync error` until
  another mutation/reload-style stimulus.

## F-01 remediation — typed cross-event edit lifecycle

- Added the typed `VaultEditSession` lifecycle to the active document's existing
  `VaultUndoCoordinator`. `beginEditSession()` closes any prior action/edit boundary and opens one
  explicit standard Loro group. Its `update`, `commit` and `cancel` capabilities are bound to a
  unique session ID, so stale handles cannot reopen or write into a later session.
- Replaced the previous boolean grouping flag with a discriminated `ActiveUndoGroup` (`action` or
  `edit`) carrying a unique ID. Synchronous bulk/import/alias calls still share one action group
  until its microtask. A new edit or unrelated ordinary action closes the active group first, so
  fields and commands never merge.
- Added `useVaultEditAction()`. Each `update` performs an ordinary loro-mirror `setState`
  immediately with `user:edit`; only the standard UndoManager group remains open. This retains one
  local Loro update per input event and therefore the existing immediate encrypted IndexedDB
  subscription, without buffering form state or using a time window.
- The hook closes the active session on explicit commit/cancel and React cleanup. Coordinator
  disposal also closes before clearing/freeing the manager, covering strict unmount and active
  vault/document replacement. `cancel` intentionally closes/isolate history rather than erasing
  already-persisted CRDT writes, consistent with the mandatory immediate-persistence model.
- Vault Name now begins on focus, updates on every controlled `onChange`, commits on blur/Enter,
  cancels the boundary on Escape, and blurs after Enter/Escape. Native editable shortcuts remain
  guarded by the unchanged global key listener.
- The direct regression drives five awaited input-event turns, including a native-undo-shaped final
  value. It observes five local update notifications, then exactly one global Undo restoring the
  pre-edit value, no second undo step, and one Redo restoring the complete final value.
- Additional regressions prove an unrelated action closes/separates an edit, cancel closes and
  rejects stale updates, disposal creates an inert old handle and a clean replacement coordinator,
  and the actual `useVaultEditAction` cleanup closes an edit when its field unmounts.

## F-02 remediation — durable reconnect retry

- Added one browser `online` handler to the actual `SyncManager` lifecycle. On reconnect it cancels
  any stale throttle timer and requests an immediate `pushToServer()` from the same persistence
  owner. The push rereads IndexedDB `pushed:false` operations and the in-memory degraded-mode map;
  it does not rely on component state, focus, reload, another mutation or a test hook.
- Preserved the existing `isSyncing` single-flight gate and added one coalescing boolean. A push
  request arriving during an in-flight push records exactly one follow-up request. The follow-up
  begins only after the current request's `finally`, so concurrent duplicate server writes cannot
  occur and bursts of online/visibility/local signals cannot be lost.
- There is deliberately no timer retry loop. A failed attempt remains truthful `error` with durable
  unpushed operations until a later local-change throttle or genuine browser-online lifecycle
  signal. If the online retry also fails, it does not recurse indefinitely.
- `disconnect()` cancels the throttle, clears the coalesced request flag, removes the exact online
  listener, then continues the existing local/visibility/beforeunload/Realtime cleanup. A
  disconnected manager ignores late pushes.
- `SyncManager.state` now retains the same state sent to `onSyncStateChange`, so direct consumers
  and tests truthfully observe `error`, reconnect `syncing`, and final `idle` rather than an
  unconditional idle value whenever no request is running.
- The focused manager regression uses the real 2-second lodash throttle and real fake-IndexedDB
  persistence: a Loro local commit is encrypted/appended, the first push rejects, the op remains
  unpushed and state is `error`, browser `online` triggers the second push, the op becomes pushed,
  and state ends `idle`.
- The idempotence regression holds the reconnect push unresolved, dispatches repeated online events,
  proves maximum request concurrency is one and the server mutation count remains two total, then
  verifies the exact online listener is removed and a post-disconnect event is inert.

## Automated validation

- Focused Vitest after final changes:
  `pnpm exec vitest run tests/unit/crdt/undo.test.tsx tests/unit/components/undo-controls.test.tsx tests/unit/sync/manager.test.ts`
  — `3` files and `13/13` tests passed.
- Full Vitest after final changes: `pnpm test` — `50` files and `1185/1185` tests passed.
- `pnpm typecheck` passed after final production/test changes.
- `pnpm lint` exited zero with no errors and the same 13 inherited warnings in transaction, TanStack
  Virtual, migration/query and older test files. No revision-02 path introduces a warning.
- First changed-E2E run diagnosed one test expectation rather than a product failure: Chromium
  coalesced plain sequential text into one native undo transaction and correctly restored the full
  original value. The regression was made deterministic by sequentially typing the complete value,
  selecting/replacing its final character, then native-undoing that replacement before blur. No
  product behavior was changed for that diagnosis.
- Final focused real-browser run:
  `pnpm exec playwright test tests/e2e/undo-redo.spec.ts --retries=0 --workers=1 --reporter=list` —
  `3/3` passed in 27.8 seconds.
- Repeated changed-E2E stability gate:
  `pnpm exec playwright test tests/e2e/undo-redo.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line`
  — `9/9` passed in 1.3 minutes.
- Full real-browser suite: `pnpm exec playwright test --retries=0 --workers=4 --reporter=line` —
  `84/84` passed in 1.5 minutes, including duplicate-tab, offline persistence, Realtime security and
  all original P09 journeys.
- Exact seven changed product/test paths pass `oxfmt --check`; `git diff --check` passes.
  Repository-wide `pnpm format:check` retains the exact inherited failure set outside this package's
  authority: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`,
  `RISKS.md` and frozen `specs/human-scratch.md`.

## Installed headless Playwright CLI charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `manual-p09-r02`, the real Next application and local Supabase/Realtime service. No browser MCP,
  `npx`, temporary test/config, route mock, GUI/headed/debug/UI/show mode or persisted credential
  was used. The Realtime secret was passed from the running local service to the task-owned dev
  process without printing it.
- Created an identity through the visible onboarding UI. Initial settings exposed accessible
  `generic "History controls"`, disabled `button "Undo"`, disabled `button "Redo"`, and
  `status "Saved"`.
- **F-01 real counterfactual:** Focused `textbox "Vault Name"`, selected `My Vault`, and used the
  CLI's real `keyboard.type` to emit character events for `Draft Native`. Selected its last
  character, typed `X`, and pressed native Ctrl+Z while still focused; the input and header returned
  from `Draft NativX` to `Draft Native`, proving the document shortcut did not steal native history.
  After Tab blur, one visible global Undo restored `My Vault`, disabled Undo and enabled Redo. One
  visible Redo restored the whole `Draft Native` edit and disabled Redo. No per-character global
  step remained.
- Reloaded after `Saved`, which retained the CRDT value and reset local history. Created a second
  tab and copied the already in-memory session only within the CLI browser context without printing
  it. Both tabs showed two online peers, `Draft Native`, `Saved`, and empty receiver history.
- **F-02 real causal sequence:** Set the source browser context offline, typed `Offline Manual`
  character by character, blurred, and clicked global Undo. The local value immediately returned to
  `Draft Native`, Undo was disabled, Redo enabled, and status became `Sync error`. Network request
  `149` (`sync.pushOps`) failed with `ERR_INTERNET_DISCONNECTED`; a later durable attempt `153` also
  failed. This establishes that the throttle had actually fired and failed before reconnect.
- Changed only browser network state to online—no mutation, reload, focus, visibility substitute or
  force-sync command. Request `156` (`sync.pushOps`) automatically returned `200`; the accessible
  source status changed to `Saved`. The peer remained at final `Draft Native` with Undo and Redo
  disabled, proving remote history exclusion while the server accepted the encrypted edit/undo
  operation batch. The checked-in E2E additionally parses the successful server response and
  requires more than one newly inserted durable operation ID.
- The source console contained 11 errors and zero warnings. Every error was causally expected from
  the forced offline window: two `sync.pushOps` failures and their SyncManager reports, two Realtime
  authorization failures, development stack-frame fetches and the development font fetch. No new
  error appeared after the successful online push.
- At 320×720 ordinary zoom, mobile history controls were named and in bounds; enabled Redo occupied
  x=180..212 with `scrollWidth == viewport == 320`. Dark color scheme and reduced motion media both
  reported active. With the app's dark token class applied for deterministic inspection, enabled
  control color was RGB `248,250,252` on RGB `15,23,43`, contrast `17.04:1`, exceeding the WCAG AA
  threshold.
- At the separately required 200% zoom probe, the inherited shell expanded to `scrollWidth 556`
  against viewport `320`; Redo occupied x=308..372 and remained represented/reachable by scrolling.
  This is the previously disclosed P20B/P21 shell-reflow limitation, not introduced by P09.
  Resetting zoom/media and resizing to 1024×720 showed named Undo/Redo controls in both expanded and
  collapsed desktop sidebars.

## Cleanup, risks and boundaries

- Closed the CLI browser and both tabs, deleted its disposable session data, stopped the task-owned
  dev server, and moved the exact generated `.playwright-cli` and `test-results` directories to the
  desktop trash; they are recoverable there and absent from the workspace. `playwright-cli list`
  reports no browsers. No task-owned Next, Playwright test or CLI process remains.
- Restored generated `next-env.d.ts` byte-for-byte to pre-implementation HEAD; it has no diff. No
  dependency, lockfile, application/test configuration, migration, server/auth/crypto or generated
  type changed.
- The explicit edit boundary is currently applied to the reviewer-proven autosaved Vault Name field.
  Future autosaved controlled CRDT fields should adopt `useVaultEditAction`; ordinary commit-based
  fields and synchronous actions correctly retain `useVaultAction`.
- A canceled edit boundary does not roll back its already-immediate writes. Escape closes and blurs,
  isolating the session as required; global Undo remains the lossless reversal mechanism.
- Final frozen identities are exact: scratch
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578` (350 lines, 24,244 bytes),
  FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` (715 lines, 25,441
  bytes), and `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9` (450
  lines, 27,382 bytes). The selected scratch region still has exactly the authorized checked set
  HS-002/HS-010/HS-014/HS-017/HS-018 and all 21 normalized blocks remain source-equal.
- Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were neither edited by this worker nor staged.
  The final index is empty; this revision-02 evidence is the sole untracked file.

## Commit and cumulative independent review range

- Revision-02 implementation commit: `418234e28ac649e03ce8ad184d08a8a2f2416149`
  (`Fix undo sessions and reconnect sync`). It contains exactly seven authorized product/test paths:
    - `src/components/features/vault/VaultSettingsForm.tsx`
    - `src/lib/crdt/context.tsx`
    - `src/lib/crdt/undo.tsx`
    - `src/lib/sync/manager.ts`
    - `tests/e2e/undo-redo.spec.ts`
    - `tests/unit/crdt/undo.test.tsx`
    - `tests/unit/sync/manager.test.ts`
- The cumulative immutable review range is original P09 BASE
  `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed` through new HEAD
  `418234e28ac649e03ce8ad184d08a8a2f2416149`. It contains revision-01 product commit `af06fb2`,
  immutable failure-artifact/control commits `74bbc71` and `54a9f28`, and this revision-02
  remediation commit.
- Reviewer must inspect that complete literal cumulative range plus this evidence artifact and
  independently reproduce both former findings.
- Questions/proposals: none. Canonical `Q-015` already decides Meta+Y parity and revision 02 does
  not revisit or duplicate it.
- Implementation is ready for independent review. This worker makes no PASS or completion claim.

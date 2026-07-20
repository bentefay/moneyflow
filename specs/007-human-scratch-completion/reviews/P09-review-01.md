# P09 Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P09` / `HS-006` / `01`.
- Literal reviewed range:
  `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed..af06fb2ad32fe292aef15a011c2040cb54cf5dfa`.
- Frozen implementation evidence: `evidence/P09/implementation-01.md`, SHA-256
  `6c6ece5aa7947243291f2d5202338a937c4b219b99a3bbfce7a00428170db20c`, 172 lines / 12,346 bytes.
- Range: one commit, `af06fb2 Add CRDT undo and redo history`, containing exactly the ten authorized
  product/test paths stated in HANDOFF.
- **Verdict: FAIL.** Two material acceptance failures remain. The first splits an ordinary
  controlled-input edit into character/input-event undo steps. The second leaves offline local edit
  and undo operations unpushed with a persistent `Sync error` after reconnection, contradicting the
  required offline/reconnect and resulting-local-change sync evidence.

## Findings

### F-01 — Blocking: an autosaved text edit is split into one document step per input event

The coordinator does not model the required logical edit boundary. `useVaultAction()` opens a group
for each hook invocation (`src/lib/crdt/context.tsx:38-55`), while `VaultUndoCoordinator` closes the
group at the next microtask and disables all time merging (`src/lib/crdt/undo.tsx:62-79,140-153`).
That is sufficient for several synchronous mutation calls in one click handler, but not for a
controlled field whose logical edit spans input events. The existing Vault Name field calls the
vault action on every `onChange`
(`src/components/features/vault/VaultSettingsForm.tsx:33-36,57-63`).

Independent installed-CLI reproduction in the real app:

1. Create a new identity through visible onboarding and open `/settings`.
2. Focus `textbox "Vault Name"`, select its content and type `Draft Native` sequentially.
3. `Ctrl+Z` while focused is correctly left to Chromium and changes the field to `Draf`; blur the
   input.
4. Click the visible global Undo once: the value changes to `Draft Native`, undoing only the native
   input event's CRDT write.
5. Click global Undo again: the value becomes `Draft Nativ`, proving the stack contains one step per
   character/input event rather than one logical field edit.

This directly contradicts the task's “one logical add/edit/delete/import/bulk/alias action is one
undo step” acceptance and creates surprising interaction between native input history and document
history. The checked-in tests do not cover this path: the account rename E2E uses one CRDT commit on
Enter (`tests/e2e/undo-redo.spec.ts:47-64`), the import uses one `setState`, and the unit grouping
harness invokes two mutations synchronously in one JavaScript turn. `fill()`-based manual evidence
also emits one input event and cannot establish typing-session grouping.

Required remediation: add an explicit, typed logical-edit boundary usable across focus/edit/commit
or otherwise define a repository-consistent complete edit session without merging unrelated user
events. Keep IndexedDB persistence immediate. Add focused unit/integration and real E2E coverage
that types several characters into an autosaved controlled CRDT field, exercises native undo while
focused, blurs, and proves one global undo restores the pre-edit CRDT value and one redo restores
the complete edited value. Also retain the existing synchronous bulk/import/alias grouping
assertions.

### F-02 — Blocking: offline undo operations do not retry after reconnect; evidence is inaccurate

The manual charter explicitly requires offline/reconnect, and P09 requires undo/redo to sync as a
resulting local CRDT change. Online behavior passes, but a long-enough offline interval for the
throttled request to fail leaves the edit and undo operations indefinitely unpushed after the
browser returns online.

Independent installed-CLI reproduction, after reloading a live two-tab session so the receiving
tab's history was empty:

1. Set the receiving tab offline, change Vault Name from `Remote Review` to `Offline Review`, blur,
   and click global Undo. The local value correctly returns to `Remote Review`; Undo becomes
   disabled and Redo enabled.
2. The scheduled `sync.pushOps` requests fail offline as requests 166 and 170 with
   `ERR_INTERNET_DISCONNECTED`, and the ordinary offline console contains only the corresponding
   fetch/stack/font errors.
3. Restore the context online and switch tabs to trigger visibility handling. Realtime authorization
   succeeds as requests 171 and 172, but there is no subsequent `sync.pushOps` request. Repeated
   snapshots keep the status at accessible `status "Sync error"`.

The surrounding implementation explains the result. Every local update is durably appended with
`pushed:false` and schedules the throttled function (`src/lib/sync/manager.ts:245-269`). On failure,
`pushToServer()` logs “let throttled sync retry” but never schedules another invocation
(`src/lib/sync/manager.ts:695-703`). There is no browser `online` handler; visibility only calls
`flush()` on a throttle that has no pending trailing invocation, or pulls remote state when visible
(`src/lib/sync/manager.ts:278-312`). Thus the operations are locally durable but neither reach the
permanent server audit trail nor the peer merely by reconnecting.

This contradicts the evidence claim that this offline edit/undo flow produced a successful
`sync.pushOps` after reconnection. The full E2E suite has no network-offline/reconnect test for
undo; the changed second-client test covers only online propagation. Route implementation to the
actual sync owner if P09's revision authority is too narrow, but P09 cannot pass until a no-retry
automated journey and installed-CLI reproduction prove a failed offline push is automatically
retried after reconnect and both the edit and undo operations are durably pushed without requiring
another user mutation, reload or test hook.

## Acceptance and architecture audit

The following portions are sound but do not waive the findings:

- Installed `loro-crdt` is 1.13.7. Its shipped typings confirm standard
  `new UndoManager(doc, config)`, `groupStart/groupEnd`, `undo/redo`, `canUndo/canRedo`, `clear`,
  `free`, `mergeInterval`, `maxUndoSteps`, and origin-prefix exclusion. Installed `loro-mirror`
  2.2.0 forwards `setState(..., { origin })` to `doc.commit({ origin })`.
- The manager is created only after `SyncManager.initialize()` completes, so snapshot/ops hydration
  precedes history ownership. Imported remote updates belong to another Loro peer and are not local
  undo steps. The sentinel migration is explicitly `system:migration`, and the configured system
  prefixes cover hydration, migration, remote, sync, GC and maintenance.
- `undo()` and `redo()` are standard local Loro operations. The independent unit subscription test
  and online two-client E2E/manual journey prove they emit local updates and propagate normally when
  online while preserving remote state.
- Vault-provider cleanup clears/frees the coordinator and unregisters its document subscription.
  Disposal is idempotent, stale commands become inert, refresh creates empty history, and the
  two-document provider test verifies a replacement context does not expose the first coordinator. A
  genuine UI vault switch remains unavailable because the existing Create-new-vault callback is
  logging-only; static lifecycle inspection and focused replacement coverage found no separate code
  defect.
- Reactive `canUndo/canRedo` uses `useSyncExternalStore`; a new online local edit clears redo in the
  focused unit test.
- The shell installs one cleaned-up `keydown` listener. Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Meta+Z,
  Meta+Shift+Z and Meta+Y work outside editables. Inputs, textareas, selects, contenteditable
  variants and ARIA textboxes are excluded, and default is prevented only after a document operation
  changes state.
- Undo and Redo are semantic icon buttons with accessible names, truthful disabled states,
  pointer-accessible disabled tooltips and keyboard focus treatment in expanded desktop, collapsed
  desktop and mobile shells. The changed code has no sleeps, hidden retries, test-only product hook,
  mocked route, skipped/only test or brittle timing loop.

## Independent automated validation

| Check                                                                                                           | Independent result                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec vitest run tests/unit/crdt/undo.test.tsx tests/unit/components/undo-controls.test.tsx`               | PASS, 2 files / 8 tests.                                                                                                                                                                                      |
| `pnpm test`                                                                                                     | PASS, 49 files / 1,180 tests.                                                                                                                                                                                 |
| `pnpm typecheck`                                                                                                | PASS.                                                                                                                                                                                                         |
| `pnpm lint`                                                                                                     | PASS with 0 errors / 13 inherited warnings. No new undo warning.                                                                                                                                              |
| `pnpm exec oxfmt --check` on all ten changed paths                                                              | PASS.                                                                                                                                                                                                         |
| `pnpm format:check`                                                                                             | Inherited FAIL only on `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, and frozen `specs/human-scratch.md`; none is in `BASE..HEAD`, and every P09 path is clean. |
| `pnpm exec playwright test tests/e2e/undo-redo.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line` | PASS, 6/6 in 55.1 seconds with no retry or inconsistent run.                                                                                                                                                  |
| `pnpm test:e2e -- --retries=0 --reporter=line`                                                                  | PASS, full 83/83 in 1.5 minutes; local config also fixes retries at zero.                                                                                                                                     |
| `git diff --check BASE..HEAD`                                                                                   | PASS.                                                                                                                                                                                                         |

The green tests establish add/edit-on-commit/delete/import/alias buttons and all declared shortcuts,
multi-record import grouping, online peer exclusion/propagation and refresh reset. They do not make
F-01 or F-02 green because neither controlled multi-event editing nor failed-push reconnect is
exercised.

## Independent installed-CLI UX, accessibility and sync evidence

- Used only repository-installed headless `pnpm exec playwright-cli` with unique disposable session
  `review-p09-r01`, the real Next app and local Realtime service. No MCP, `npx`, temporary test,
  mocked route, GUI/headed/debug/UI/show mode, arbitrary wait or secret output was used.
- Initial settings snapshot exposed `generic "History controls"`, disabled `button "Undo"` and
  disabled `button "Redo"`. Hovering the disabled wrapper exposed tooltip `Undo (Ctrl+Z)`. After a
  local edit the state changed truthfully; keyboard focus produced the standard 3 px ring, and
  collapsed desktop retained named Undo/Redo controls.
- At 320x720 and ordinary zoom, the mobile controls were fully in bounds (Redo rect x=196..228,
  32x32) with `scrollWidth == clientWidth == 320`. Reduced-motion emulation was active. Applying the
  app's `.dark` token state produced enabled-icon RGB `248,250,252` on header RGB `15,23,43`, WCAG
  contrast 17.04:1. At the separately required 200% zoom probe, the inherited shell reflowed to 524
  px and required horizontal scrolling; the history controls stayed represented and reachable but
  were partly outside the initial viewport. This disclosed inherited reflow limitation is not the
  cause of this P09 FAIL and remains appropriate for P20B/P21.
- A fresh reloaded peer kept Undo and Redo disabled after a remote Vault Name edit, then received
  the new value. The originating peer's local Undo propagated back and restored the prior value
  without enabling receiver history. This independently confirms online remote exclusion and local
  undo sync.
- Native Ctrl+Z was not stolen from the focused input. Its interaction with the per-input-event
  document stack is the F-01 failure, not a shortcut-guard failure.
- Offline console/network errors were expected while disconnected, but the accessible status stayed
  `Sync error` online and no retry request followed; that post-reconnect state is F-02.

## Q proposal adjudication

`Q-PROPOSAL-P09-01-01 — Meta+Y redo parity` is complete under the PROCESS schema. Option A is a
safe, reversible default: retain conventional Meta+Shift+Z and also the literal Meta+Y counterpart
to Ctrl+Y, with both excluded inside editables. It has no persisted-data or migration effect and the
focused tests prove the guard. I support root transcription of the proposal; neither finding changes
that adjudication.

No additional ambiguity needs a new Q proposal. F-01 and F-02 are observable acceptance defects, not
preference questions.

## Boundary, frozen-source and cleanup verification

- Final reviewed product/test HEAD remains exactly `af06fb2ad32fe292aef15a011c2040cb54cf5dfa`; index
  is empty. Before this review file, dirt was only root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md`, and the frozen untracked P09 evidence directory.
- Scratch SHA-256 is `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines /
  24,244 bytes. Independent `jq`/`sed`/`diff` comparison proves all 21 ordered normalized HS blocks
  byte-match `SCOPE.json`; the five checked blocks map to the authorized
  HS-002/HS-010/HS-014/HS-017/HS-018 set.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382 bytes, with
  22 unique requirements: 21 HS and the whole-file FS-001 selector.
- Closed the CLI browser, deleted its disposable data, trashed exact generated `.playwright-cli` and
  `test-results` directories, stopped the task-owned dev server, and verified `playwright-cli list`
  reports no browsers. Both manual and full-E2E regenerations of `next-env.d.ts` were restored to
  the exact reviewed-HEAD import; it has no final diff. No task-owned Next/Playwright/CLI process
  remains.

## Single final verdict

**FAIL — changes requested.** Preserve the otherwise valid UndoManager/origin/lifecycle/UI work, but
do not integrate HS-006 until a new immutable revision closes F-01's cross-event logical edit
boundary and F-02's failed-offline-push reconnect path with focused no-retry automation and an
independent real-app CLI recheck.

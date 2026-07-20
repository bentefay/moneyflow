# P09 Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package/scope/revision: `P09` / `HS-006` / `01`.
- Original package BASE and pre-implementation HEAD: `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`.
- Sole worker evidence artifact:
  `specs/007-human-scratch-completion/evidence/P09/implementation-01.md`, created before product
  edits and intentionally left uncommitted.
- At dispatch, the index and untracked set were empty. Git-visible dirt was exactly root-owned
  unstaged `HANDOFF.md` and `PROGRESS.md`.
- Product/test writes were restricted to the ten exact paths authorized by the revisioned task.
  Control ledgers, dependencies/configuration, earlier evidence/reviews, scratch, frozen sources,
  `SCOPE.json` and agent paths remained read-only.

## Validation plan

1. Trace the installed `loro-crdt` and `loro-mirror` APIs and the active document, mutation, sync,
   hydration and vault lifecycle before defining history boundaries.
2. Introduce typed user/system origins and explicit logical-action grouping around one standard Loro
   `UndoManager`; exclude all non-user state changes.
3. Expose reactive history state, accessible responsive controls and standard Ctrl/Meta shortcuts
   without intercepting native editing.
4. Verify grouping, filtering, redo clearing, lifecycle cleanup and sync validity in unit,
   integration and real-browser journeys.
5. Complete the installed headless Playwright CLI charter, restore generated state, commit exact
   product/test paths only and leave this evidence uncommitted for independent review.

## Installed API trace and action model

- The installed `loro-crdt` version is `1.13.7`; its standard manager is constructed as
  `new UndoManager(doc, options)` and exposes `groupStart()`, `groupEnd()`, `undo()`, `redo()`,
  `canUndo()`, `canRedo()`, `clear()` and `free()`. The implemented coordinator owns this manager
  directly; there is no parallel snapshot or application-history implementation.
- Installed `loro-mirror` `2.2.0` accepts `setState(updater, { origin })`. The existing vault action
  hook now assigns a typed origin to each local mutation through this installed path.
- User action kinds are `add`, `alias`, `bulk`, `delete`, `edit`, `import` and `mutation`,
  serialized as `user:<kind>`. Hydration, migration, remote/sync, garbage collection and maintenance
  are classified under `system:<kind>` and excluded with the manager's origin-prefix filter.
- Each first synchronous user mutation opens a Loro group and schedules its close at the microtask
  boundary. Consecutive vault writes made by one UI handler—including loop-based bulk/import and
  shared-alias mutations—therefore form one undo step, while separate event tasks never merge by
  elapsed wall-clock time. `mergeInterval: 0` prevents time-based coalescing.
- Hydration completes before the coordinator is created. Imported remote updates originate from the
  peer document and do not enter local user history. Migration is explicitly marked
  `system:migration`.
- Undo/redo uses ordinary local Loro operations. The existing local-update subscription therefore
  persists and broadcasts the resulting CRDT changes through the normal signed sync path.

## Implemented scope

- Added `VaultUndoCoordinator`, a provider and hooks for the active document's standard manager. It
  exposes `canUndo`/`canRedo` through `useSyncExternalStore`, mutation-origin helpers and guarded
  undo/redo commands.
- The vault provider creates one coordinator only after sync initialization, binds it to the exact
  active document/vault, and disposes/clears/frees it during effect cleanup, strict-mode remount and
  document replacement. History never transfers between vault documents.
- Classified transaction CRUD actions as add/edit/delete, aliases as alias, and template/batch
  imports as import. Existing generic mutation remains typed and undoable; all system origin kinds
  are non-user history.
- Added semantic Undo and Redo buttons to expanded desktop, collapsed desktop and mobile shell
  layouts. Buttons expose labels, shortcut descriptions, disabled state, focus styling and
  disabled-state tooltips through non-disabled wrappers.
- Added one shortcut listener for Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y and the corresponding Meta forms. The
  listener ignores input, textarea, select, `contenteditable` (including empty and `plaintext-only`)
  and ARIA textbox targets so browser/native field history remains available.
- Added focused unit coverage for manager filtering/grouping/redo/lifecycle and control state,
  keyboard parity, editable guards and listener cleanup. Added a real-browser journey covering
  representative add/edit/delete/import/alias actions plus local/remote two-client behavior.

## Automated validation

- `pnpm exec vitest run tests/unit/crdt/undo.test.tsx tests/unit/components/undo-controls.test.tsx`:
  `2` files, `8/8` tests passed. This was repeated after the final editable-target guard and
  typecheck.
- `pnpm test`: `49` files and `1180/1180` tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: exited zero with no errors and 13 inherited warnings. Warnings are in pre-existing
  transaction, inline-edit, TanStack Virtual, query, migration and test surfaces; none is a new
  undo/redo lint error.
- `pnpm test:e2e -- --retries=0`: the ordinary real-browser suite discovered and passed `83/83`
  tests in approximately 1.5 minutes, including existing duplicate-tab and offline-sync coverage.
- `pnpm exec playwright test tests/e2e/undo-redo.spec.ts --retries=0 --workers=1 --reporter=list`:
  repeated after final changes; `2/2` passed in 22.4 seconds. The first journey performs real
  add/edit/delete/import/alias changes with buttons and all Ctrl/Meta shortcut forms, verifies
  native-input behavior and tooltips, and checks refresh reset. The second uses an independent
  browser context to prove remote exclusion, local undo propagation and remote-state preservation.
- `git diff --check`: passed.
- `pnpm format:check` remains inherited red only for coordinator/frozen files outside this package's
  write authority: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`,
  `RISKS.md` and `specs/human-scratch.md`. The P09 evidence and all committed P09 product/test files
  pass `oxfmt`.

## Installed Playwright CLI charter

- Used only the installed headless `pnpm exec playwright-cli` with session `manual-p09-a` against
  the real local app and Realtime service. No browser MCP, downloaded runner, headed/debug/UI mode,
  mocked route or persisted credential was used.
- Created an identity through the visible application flow. The initial settings view showed Undo
  and Redo disabled. After changing the vault name, the Undo button restored the earlier name and
  Ctrl+Shift+Z redid it. While the name input had focus, Ctrl+Z invoked native input undo and did
  not consume the document history; the global Undo remained available afterward.
- Verified visible controls in expanded desktop, collapsed desktop and the 320×720 mobile banner. At
  mobile size with dark color scheme and reduced motion emulated, both controls remained
  discoverable with the expected disabled semantics. At 200% zoom, horizontal overflow existed in
  the inherited shell, but the history controls remained reachable and visible.
- Went offline, edited the vault name, and undid it immediately while disconnected. Reconnection
  produced a successful `sync.pushOps` response. The six console errors observed while offline were
  expected `ERR_INTERNET_DISCONNECTED` / `Failed to fetch` failures (including development font and
  stack requests); there were no warnings and no unexpected online console error.
- A normal reload retained the final CRDT state and reset both history controls to disabled, proving
  history is document-session state rather than persisted application history.
- Created a second CLI tab/context with the in-memory session, observed both peers online, and made
  a name edit in the second tab. The first tab received `Remote CLI Vault` while its Undo and Redo
  controls stayed disabled. The originating tab could undo its own change, confirming peer-local
  history and normal cross-client propagation.
- The visible `Create new vault` item still has the pre-existing logging-only callback, so the
  charter could not perform a genuine UI vault switch without expanding into another package.
  Coordinator replacement, disposal and history reset are instead covered by the focused
  active-document lifecycle test; the ordinary full E2E suite covers browser-tab duplication.

## Cleanup and handoff invariants

- Closed both CLI tabs and browser session, stopped the task-owned dev server, and removed exact
  generated `.playwright-cli` artifacts. `playwright-cli list` reports no browsers. No task-owned
  Next, Playwright test or CLI process remains.
- Restored generated `next-env.d.ts`; it has no diff. No package lock, dependency, application
  configuration or generated type changed.
- Final frozen identities are exact: scratch
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578` (350 lines, 24,244 bytes),
  FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` (715 lines, 25,441
  bytes), and `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9` (450
  lines, 27,382 bytes). The scratch checklist remains at the coordinator-authorized checked set
  only.
- Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were neither edited by this worker nor staged.
  The final index is empty; this sole evidence artifact is the only untracked path.

### Q-PROPOSAL-P09-01-01 — Meta+Y redo parity

- **Raised by/package/revision:** `human_scratch_implementer` / `P09` / `01`.
- **Context and evidence:** The frozen requirement explicitly names Ctrl+Shift+Z and Ctrl+Y.
  Acceptance also requires appropriate Meta equivalents. Meta+Shift+Z is the conventional macOS redo
  gesture; Meta+Y is less universal but is the literal key-for-key Meta equivalent of Ctrl+Y.
  Focused unit and real-browser tests confirm that both work outside editable targets while native
  input history remains available inside them.
- **Why existing authority does not decide it:** The frozen requirement does not name any Meta key,
  and acceptance says only “appropriate Meta equivalents.” Neither authority states whether literal
  Ctrl+Y parity or macOS convention should control when both can coexist.
- **Options considered:** A — support both Meta+Shift+Z and Meta+Y; B — support conventional
  Meta+Shift+Z only; C — provide no Meta redo binding beyond the frozen Ctrl forms.
- **Reversible default selected to continue:** A, because it maximizes parity with the frozen forms,
  preserves the conventional macOS gesture, and is guarded from native text editing.
- **Decision-hierarchy basis:** The explicit frozen Ctrl keys and acceptance's Meta-equivalent
  direction rank first. With the residual platform preference unresolved, established platform
  behavior supports Meta+Shift+Z and the smallest reversible extension supports Meta+Y alongside it.
- **Impact and risk:** A adds one non-editable-shell alias. B is more convention-pure but may fail
  literal parity expectations. C would not satisfy acceptance. The implemented editable-target guard
  limits the risk of either supported gesture stealing browser-native text history.
- **Reversal or migration path:** Remove the Meta+Y predicate and its focused unit/E2E assertions.
  There is no persisted data, CRDT schema or migration impact.
- **Human review still useful after completion:** Yes. A future project-wide platform-shortcut
  policy could select B for convention consistency; until then, retain A because changing it is
  isolated and lossless.

## Commit and independent review range

- Original immutable review BASE: `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`.
- Implementation HEAD: `af06fb2ad32fe292aef15a011c2040cb54cf5dfa`
  (`Add CRDT undo and redo history`). The commit contains exactly the ten authorized product/test
  paths and no control or evidence path.
- Reviewer must inspect the exact immutable `BASE..HEAD` range plus this evidence artifact.
- Implementation is ready for independent review. This worker makes no PASS or completion claim.

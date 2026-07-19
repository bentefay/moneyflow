# HS-006 — Loro Undo and Redo

- **Status:** queued
- **Source:** `specs/human-scratch.md:245-246`; exact frozen text is in `SCOPE.json#HS-006`
- **Package:** P09
- **Depends on:** P01 Loro dependency baseline

## Frozen requirement

> Add undo and redo buttons and standard Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y bindings using Loro's
> standard UndoManager.

## Current evidence to revalidate

- `VaultProvider` owns the active Loro document and supplies it to the mirror provider; no global
  UndoManager is currently exposed.
- Automation application records are domain history and are not document-wide user undo.
- Existing mutations often comprise several vault actions, so origin/grouping must be audited.

## Acceptance direction

- One manager follows the active vault/document lifecycle and exposes reactive canUndo/canRedo.
- Visible semantic buttons include disabled/tooltips/focus states; shortcuts support requested Ctrl
  forms and appropriate Meta equivalents without stealing native text-field editing.
- One logical action—including bulk/import/shared alias—is one undo step. Remote, hydration, sync,
  migration and GC commits are not user-undoable. New edits clear redo; vault switch resets history.
- Undo/redo preserves CRDT validity and syncs the resulting user change to other clients.

## Implementation and review checkpoints

- Define action boundaries/origins before wiring buttons. Clean up listeners/managers on vault
  change and strict-mode remount. Reviewer traces Loro APIs and tests local versus remote histories.

## Automated tests

- Unit/integration: manager lifecycle, grouping/origin filters, redo clearing, input shortcut guard,
  vault switch and remote update exclusion.
- E2E: add/edit/delete/import/alias action using buttons and every shortcut; concurrent second
  client; refresh behavior. Repeat with retries disabled.

## Manual Playwright CLI charter

- Exercise enabled/disabled buttons, tooltips, focus and requested keys after single and bulk
  changes. Type inside text inputs to confirm native edit undo remains sensible.
- Use two sessions to make remote edits, duplicate a tab, change vault, refresh, go
  offline/reconnect, inspect desktop/mobile/dark/reduced-motion UX, console and network. Clean
  sessions.

## UX, style, and E2E review

Apply component/CRDT/sync/E2E guidance. Controls must be discoverable, keyboard accessible and never
misrepresent history. Missing action grouping or remote-origin protection is a blocking finding.

## Risks and questions

- Risks: peer binding, listener leaks, remote undo, native-input conflict, invalid grouped state.
  Return platform shortcut ambiguity as a Q proposal and use conventional reversible behavior.

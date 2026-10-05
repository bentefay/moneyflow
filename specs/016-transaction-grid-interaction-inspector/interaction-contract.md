# Transaction Grid Interaction Contract

This proposed contract is normative only after the source gate in `goal.md` is approved and
committed. Until then every clause and identity below remains proposed. The implementation uses
stable IDs, pure reducers, immutable state, discriminated results, and isolated effect adapters.

## Acceptance-key schema

**TGI-KEY-001 — Keyed authority.** Every normative block is prefixed by an immutable acceptance key.
A section, list item, or command row without a key is explanatory rather than normative.

**TGI-KEY-002 — Range expansion.** A range such as `TGI-CMD-000..024` expands to every zero-padded
integer key in that inclusive range with no gaps.

**TGI-KEY-003 — Exact final set.** The final acceptance manifest must contain exactly one record for
every expanded key below, plus goal keys `TGI-001..012`, with no extras or duplicates.

```text
TGI-KEY-001..003
TGI-STATE-001..006
TGI-SEL-001..006
TGI-GEN-001..004
TGI-CUR-001..004
TGI-CELL-001..004
TGI-ROWSEL-001..002
TGI-ACT-001..003
TGI-COPY-001..005
TGI-CMD-000..024
TGI-TAB-001..002
TGI-CONT-001
TGI-IME-001..005
TGI-PICK-001
TGI-ACCOUNT-001..004
TGI-STATUS-001..003
TGI-TAGS-001..006
TGI-POP-001..007
TGI-FOCUS-001..005
TGI-RECON-001..005
TGI-INSP-001..009
TGI-INSPCMD-001..006
TGI-PREF-001..004
TGI-OWN-001..006
TGI-VIRT-001..004
TGI-VERIFY-001..004
```

## 1. Canonical state and ownership

### 1.1 Engagement state

**TGI-STATE-001 — Engagement union.** The controller state is one discriminated union:

- `idle` — before first grid focus or while the canonical matching set is empty;
- `parked` — canonical ranges and their active anchor are retained, but paint, `aria-selected`,
  copy, and range actions are suppressed;
- `navigating` — canonical ranges are visible and the active anchor owns gridcell focus;
- `editing` — the active anchor owns a typed draft with `entry: quick | full`, a composition phase,
  and optional continuous-edit intent;
- `inspecting` — focus is inside the stable inspector subtree, the originating/current active
  address remains representable in canonical selection, and selection visibility is muted;
- `interacting` — an owned popup, widget, calendar, or modal temporarily owns focus and records
  `owner: grid-editor | inspector`, its stable transaction owner, and a return state of `editing` or
  `inspecting`.

**TGI-STATE-002 — Representable active identity.** `parked`, `navigating`, `editing`, `inspecting`,
and `interacting` always have a valid latest canonical range anchor. Editing or interaction without
that anchor is an invalid state. There is no separate `focusedId` or second active-cell value.

**TGI-STATE-003 — Selection visibility by owner.** `parked` suppresses selection semantics,
`navigating` and `editing` expose normal visible selection, and `inspecting` plus inspector-owned
`interacting` expose muted selection. Grid-editor-owned `interacting` retains normal visible
selection. Open inspector state alone does not mute selection; focus ownership does.

**TGI-STATE-004 — Inspector transition.** Entering the inspector from navigation ends
continuous-edit intent. Entering from an editor first validates and commits once; invalid drafts
block the transition and retain editor focus. Grid-to-inspector focus stays inside the same
transaction owner, so it never triggers automation owner-exit auto-apply.

**TGI-STATE-005 — Popup return.** A grid-editor popup returns to the same editor and active anchor.
An inspector popup returns to the same inspector control only while its stable transaction owner and
field/action binding are unchanged; otherwise it uses the owner-change fallback in `TGI-FOCUS-005`.
Closing a popup never parks or moves cell selection by itself.

**TGI-STATE-006 — Presence by engagement.** `parked`, `navigating`, `inspecting`, and both
interaction owners publish stable row viewing. `editing` publishes stable field identity. No state
publishes financial values, quick-entry query text, range extent, or a pending destination.

### 1.2 Canonical selection atom

**TGI-SEL-001 — Single canonical atom.** Exactly one external TanStack `CellSelectionState` atom is
supplied as `atoms.cellSelection`. Table APIs and the controller write that atom. React state,
callbacks, DOM markers, or another store may derive views but may not own a mirrored selection
value.

**TGI-SEL-002 — Anchor and extent.** The latest range operation's start corner is its anchor and the
grid's active cell. Its end corner is its extent endpoint. The extent is selection geometry, not DOM
focus.

**TGI-SEL-003 — Plain movement.** A plain move replaces the latest operation with one inclusive
operation where `anchor = extent = target`.

**TGI-SEL-004 — Extension.** Shift movement and Shift-click change only the latest operation's
extent. A drag creates or extends the latest operation from its pointer-down anchor. The anchor
retains `tabIndex=0` and DOM focus during extension.

**TGI-SEL-005 — Disjoint operations.** Ctrl/Cmd pointer gestures append TanStack's ordered
include/exclude operation without rewriting earlier operations.

**TGI-SEL-006 — Editing the anchor.** Editing always targets the latest anchor. An extension command
from editing validates and commits or cancels according to the command table before it exposes
navigation and changes the extent.

### 1.3 Projection generation

**TGI-GEN-001 — Ownership.** `TransactionProjectionGeneration` is a branded monotonic token owned by
the workspace projection builder, not by TanStack Table, the virtualizer, a row component, or
`TransactionCursor`.

**TGI-GEN-002 — Structural increment.** A new generation is created before filter, sort, canonical
matching identity/order, transaction membership, or selectable/focusable column identity,
visibility, or order changes become interactive.

**TGI-GEN-003 — Stable generation.** Value-only transaction writes, ordinary 600-row held-window
movement, active/pending pin changes, selection, focus, editor drafts, inspector state, and display
preferences do not create a new generation.

**TGI-GEN-004 — Generation-checked work.** Every async reveal, row read, bounded range read, copy
materialisation, registration wait, and focus request carries the expected generation. Completion
against another generation is stale and follows `TGI-FOCUS-004` and `TGI-RECON-*`.

### 1.4 Cursor and row-window boundary

**TGI-CUR-001 — Existing lookup.** The production cursor's existing
`TransactionCursor.indexOf(transactionId)` remains the canonical ID-to-index primitive; do not
duplicate or rename it merely to satisfy this contract.

**TGI-CUR-002 — Projection adapter.** Add a generation-checked adapter exposing typed operations
equivalent to `indexOf`, `idAt`, `readRowAt`, and bounded `rowsBetween`, each requiring an expected
generation and returning a typed stale result.

**TGI-CUR-003 — Sparse window is not order.** The current row-window module is
`src/components/features/transactions/row-window.ts`. Pins inserted into its sparse held list never
become logical neighbors; navigation and range geometry use cursor projection indexes only.

**TGI-CUR-004 — External atom investigation.** Current direct dependencies are
`@tanstack/react-table` and `@tanstack/table-core`, not `@tanstack/store`. Although the transitive
store exports `createAtom`, a transitive import is not admitted. Before implementation, prove a
supported constructor exported by a direct dependency or request a separately approved direct
dependency. Do not add one speculatively.

## 2. Selection visibility, actions, and copy

### 2.1 Selectable cells

**TGI-CELL-001 — Declarative capabilities.** Every visible transaction column declares immutable
focusable, selectable, copyable, edit-kind, activation-kind, popup-owner, and automation-field
capabilities.

**TGI-CELL-002 — Data cells.** Date, description, account, tags, status, allocations, and amount are
selectable and copyable.

**TGI-CELL-003 — Activation cells.** Checkbox and actions are selectable and non-copyable. The
actions column has a real stable `actions` cell identity while duplicate/delete descendants retain
their own control markers.

**TGI-CELL-004 — Notes and hidden columns.** Notes are not a grid column and have no cell-selection
identity. Hidden or removed columns are not selectable.

### 2.2 Row selection is independent

**TGI-ROWSEL-001 — Orthogonal mutation.** The visible checkbox glyph and header checkbox exclusively
mutate row selection. Cell selection, parking, Escape, structural reconciliation, copy, inspector
transitions, and action-cell activation never clear or rewrite its baseline or exceptions.

**TGI-ROWSEL-002 — Shift target.** Shift-click on the checkbox glyph applies spec 012 row-range
semantics. Shift-click on checkbox-cell background extends the cell rectangle. The actual event
target decides the domain.

### 2.3 Action activation

**TGI-ACT-001 — No activation by navigation.** Navigating onto checkbox or actions never activates a
control. Enter/Space on a checkbox cell activates its visible checkbox exactly once.

**TGI-ACT-002 — Safe action-cell primary.** Enter/Space on the actions cell opens and focuses the
inspector for the active transaction. Tab within the cell can reach duplicate and delete controls.
Delete remains an explicit two-click child control; Delete/Backspace on a gridcell never deletes a
transaction or range.

**TGI-ACT-003 — Printable shortcuts.** Document-level printable destructive/duplicate shortcuts are
removed or rescoped because printable input starts quick entry.

### 2.4 Copy

**TGI-COPY-001 — Eligibility.** Grid copy is handled only in `navigating` while a grid-owned cell
owns DOM focus and the latest operation's anchor/extent resolve in the current generation. Editors,
widgets, inspector controls, and parked selection retain native copy.

**TGI-COPY-002 — Active operation only.** Copy serializes only the latest inclusive rectangle.
Earlier disjoint operations remain selected. Checkbox/actions positions serialize as empty fields so
TSV shape remains rectangular.

**TGI-COPY-003 — Domain serialization.** Existing domain formatters provide deterministic,
locale-independent values. The browser adapter alone invokes `navigator.clipboard.writeText`.

**TGI-COPY-004 — Exclusion no-op.** A latest exclusion operation returns `copy-excluded-operation`,
writes nothing, and announces a concise polite status. It never chooses an earlier include
operation.

**TGI-COPY-005 — Limits and failure.** Materialisation is all-or-nothing and rejects before writing
above 10,000 rows, 100,000 cells including empty positions, or 5 MiB UTF-8 output. Typed stale,
load, limit, endpoint, and clipboard failures leave selection, focus, mode, viewport, and existing
clipboard unchanged. Paste, fill, formulas, and multi-cell writes remain out of scope.

## 3. Command table

**TGI-CMD-000 — Commit definition.** “Commit” means validate first, invoke at most one domain
mutation only for an actual value change, and preserve editor focus on failure. Movement publishes
selection/focus only after successful commit and focus transactions.

| Acceptance ID | Input                            | Idle                                         | Parked                                     | Navigating                                                          | Quick entry                                        | Full edit                                             | Grid-editor popup                                                  |
| ------------- | -------------------------------- | -------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| TGI-CMD-001   | Grid focus                       | Create valid one-cell operation and navigate | Expose retained selection and focus anchor | No-op                                                               | N/A                                                | N/A                                                   | N/A                                                                |
| TGI-CMD-002   | Click cell background            | Select clicked anchor                        | Select clicked anchor and expose           | Select clicked anchor                                               | Apply outside-pointer ordering; invalid blocks     | Apply outside-pointer ordering; invalid blocks        | Apply `TGI-POP-*`; invalid blocks                                  |
| TGI-CMD-003   | Double-click editable background | Select then full-edit                        | Select then full-edit                      | Full-edit clicked anchor                                            | Commit current, then full-edit target              | Commit current, then full-edit target                 | Close/commit per `TGI-POP-*`, then full-edit target                |
| TGI-CMD-004   | Shift-click background           | Create one-cell then extend                  | Expose then extend                         | Extend latest extent                                                | Commit, expose, extend; invalid blocks             | Commit, expose, extend; invalid blocks                | Return/commit first; invalid blocks                                |
| TGI-CMD-005   | Ctrl/Cmd-click or drag           | Create ordered operation                     | Same, then expose                          | Append/extend ordered operation                                     | Commit first; invalid blocks                       | Commit first; invalid blocks                          | Interactive descendants opt out; otherwise return first            |
| TGI-CMD-006   | Printable input                  | Establish cell then quick-enter              | Expose anchor then quick-enter             | Quick-enter and replace displayed value                             | Append according to adapter                        | Native text input                                     | Native widget/input                                                |
| TGI-CMD-007   | Enter                            | Establish/focus valid cell                   | Expose selection                           | Editable: full-edit; activation: activate once; otherwise move down | Validate, commit, move down, preserve quick intent | Validate, commit, move down, preserve full intent     | Widget confirmation/selection, then adapter return                 |
| TGI-CMD-008   | Space                            | Same as printable unless activation          | Same                                       | Activation cell: activate once; editable text: quick-enter space    | Native draft character                             | Native text character                                 | Widget default                                                     |
| TGI-CMD-009   | Escape                           | No-op                                        | No-op                                      | Park selection and move to safe grid-exit target                    | Cancel draft and navigate at anchor                | Cancel draft and navigate at anchor                   | Close top popup and return to editor; second Escape cancels edit   |
| TGI-CMD-010   | F2                               | No-op                                        | No-op                                      | No-op                                                               | No-op                                              | No-op                                                 | Grid never binds it; widget may consume documented native behavior |
| TGI-CMD-011   | Left/Right                       | Establish nearest valid cell                 | Expose then move                           | Move one selectable cell                                            | Validate, commit, move, preserve intent            | Native caret/selection                                | Widget default                                                     |
| TGI-CMD-012   | Up/Down                          | Establish nearest valid cell                 | Expose then move                           | Move one matching row                                               | Validate, commit, move, preserve intent            | Validate, commit, move, preserve intent               | Widget default                                                     |
| TGI-CMD-013   | Shift+Left/Right                 | Establish then extend                        | Expose then extend                         | Extend extent                                                       | Validate, commit, expose, extend                   | Native text selection                                 | Widget default                                                     |
| TGI-CMD-014   | Shift+Up/Down                    | Establish then extend                        | Expose then extend                         | Extend extent                                                       | Validate, commit, expose, extend                   | Validate, commit, expose, extend                      | Widget default                                                     |
| TGI-CMD-015   | Alt/Option+Arrow                 | Same as plain arrow                          | Same                                       | Move requested direction                                            | Validate, commit, move, preserve intent            | Validate, commit, move any direction, preserve intent | Widget default; no grid movement                                   |
| TGI-CMD-016   | Alt/Option+Shift+Arrow           | Same as Shift+Arrow                          | Same                                       | Extend requested direction                                          | Validate, commit, expose, extend                   | Validate, commit, expose, extend                      | Widget default                                                     |
| TGI-CMD-017   | Home/End                         | Establish row endpoint                       | Expose and move                            | First/last selectable cell in row                                   | Commit, move, preserve intent                      | Native text Home/End                                  | Widget default                                                     |
| TGI-CMD-018   | Ctrl/Cmd+Home/End                | Establish grid endpoint                      | Expose and move                            | First/last matching row and selectable column                       | Commit, move, preserve intent                      | Native editor shortcut                                | Widget default                                                     |
| TGI-CMD-019   | PageUp/PageDown                  | Establish target                             | Expose and move                            | Move viewport-sized row distance                                    | Commit, move, preserve intent                      | Commit, move, preserve intent                         | Widget default                                                     |
| TGI-CMD-020   | Shift+Home/End/Page              | Establish then extend                        | Expose then extend                         | Extend extent to target                                             | Commit, expose, extend                             | Shift+Home/End native; Shift+Page validates/extends   | Widget default                                                     |
| TGI-CMD-021   | Tab/Shift+Tab                    | Enter first/last cell                        | Expose and traverse                        | Traverse cell stops, then commit/move                               | Traverse stops, then commit/move                   | Traverse stops, then commit/move                      | Widget order, then return; boundary commits/moves                  |
| TGI-CMD-022   | Ctrl/Cmd+A                       | Native page behavior                         | No grid action                             | Select full selectable matching rectangle                           | Native editor select-all                           | Native editor select-all                              | Native widget select-all                                           |
| TGI-CMD-023   | Ctrl/Cmd+C                       | Native page behavior                         | No grid copy                               | Apply `TGI-COPY-*`                                                  | Native editor copy                                 | Native editor copy                                    | Native widget copy                                                 |
| TGI-CMD-024   | Composition lifecycle event      | Apply `TGI-IME-*`                            | Apply `TGI-IME-*`                          | Apply `TGI-IME-*`                                                   | Apply `TGI-IME-*`                                  | Remain native under `TGI-IME-*`                       | Widget native under `TGI-IME-*`                                    |

### 3.1 Tab and continuous edit

**TGI-TAB-001 — Grid boundaries.** Adapter-declared Tab stops are stable. Final forward/reverse
stops commit and move row-major right/left. At the final/first grid cell, Tab/Shift+Tab commits,
parks selection, ends continuous intent, and exits without wrapping.

**TGI-TAB-002 — Date sequence.** Forward Tab from full date text edit opens and focuses DayPicker.
DayPicker owns calendar keys; Shift+Tab returns to the text input. Day selection or final Tab
commits and exits. Escape closes the calendar before a later Escape cancels the draft.

**TGI-CONT-001 — Continuous intent.** Successful keyboard movement from quick/full edit carries the
same edit kind to the next editable cell. Checkbox/actions retain intent without activation and
resume it later. Pointer selection, inspector entry, Escape, grid-boundary Tab, or external grid
blur ends intent.

### 3.2 IME lifecycle

**TGI-IME-001 — Start from grid ownership.** `compositionstart` on a navigating/parked cell
establishes or exposes its one active anchor, enters quick edit with `composition: active`,
initializes an empty replacement draft buffer, and focuses the editor. From `idle` with a non-empty
matching set, it first establishes the event target or first valid cell; with no valid address it
ignores the composition. It does not insert text or write the domain.

**TGI-IME-002 — Composing input.** `beforeinput` with `isComposing` and `compositionupdate` update
only an ephemeral composition preview. All grid commands, validation, movement, copy, and commit are
ignored while `event.isComposing`, composition state is active, or the legacy key code is 229.

**TGI-IME-003 — Final insertion exactly once.** `compositionend` records final data but does not
blindly append it. The following authoritative non-composing `beforeinput`/`input` insertion applies
the completed grapheme once. If the browser emits none by the next microtask, the adapter applies
the recorded `compositionend.data` fallback once. A per-composition sequence token deduplicates both
paths.

**TGI-IME-004 — Resume boundary.** Composition changes to inactive only after the final insertion
has landed. The keydown/keyup that ended composition is never reinterpreted as a grid command. Grid
commands resume on the next distinct non-composing keyboard event.

**TGI-IME-005 — Cancellation.** Empty/cancelled composition restores navigation when no finalized
text exists; otherwise it leaves quick edit with the finalized draft. Escape consumed by the IME
does not trigger grid Escape, cancel, movement, or mutation.

## 4. Typed picker quick entry

**TGI-PICK-001 — Common picker boundary.** Printable input in account, status, or tags starts quick
entry with the completed grapheme as a search query and replaces displayed value with a draft
preview. Typing never mutates Loro. Result lists may be visible, but grid-oriented arrows remain
active until pointer selection or full edit transfers ownership. Matching is case-insensitive after
trim; IDs, not names, remain identity.

### 4.1 Account

**TGI-ACCOUNT-001 — Exact resolution.** Exactly one exact existing-name match resolves on commit.

**TGI-ACCOUNT-002 — Unresolved result.** Zero/multiple exact matches return `unresolved-account` or
`ambiguous-account`, retain draft/focus, and block movement.

**TGI-ACCOUNT-003 — Creation boundary.** Quick entry never creates an account. Creation requires the
full-edit popup and existing Create Account dialog.

**TGI-ACCOUNT-004 — Option selection.** Pointer option selection resolves the controller draft,
closes the list, and returns to the editor without a transaction write. The next explicit
commit/movement writes once.

### 4.2 Status

**TGI-STATUS-001 — Exact resolution.** Exactly one exact existing-name match resolves on commit.

**TGI-STATUS-002 — Unresolved result.** Zero/multiple matches return `unresolved-status` or
`ambiguous-status`, retain draft/focus, and block movement. There is no creation or implicit first
option.

**TGI-STATUS-003 — Option selection.** Pointer/full-edit option selection resolves the draft without
writing until the shared commit boundary.

### 4.3 Tags

**TGI-TAGS-001 — Quick replacement.** Quick entry replaces the displayed tag set; an exact unique
existing-name match resolves to a singleton set.

**TGI-TAGS-002 — Unresolved movement.** Zero exact matches return `unresolved-tag` for generic
movement, Tab, or outside-pointer commit and block that transition. Multiple matches return
`ambiguous-tag`. No implicit first option or background creation occurs.

**TGI-TAGS-003 — Atomic create-and-assign.** Explicit activation of the quick-entry “Create” choice
invokes one typed `createTagAndAssignQuickEntry` command. In one logical loro-mirror draft action it
validates no exact tag now exists, creates the tag, and replaces this transaction's tag IDs with the
new singleton. Success produces one undo item and one final tag-field transition for automation.

**TGI-TAGS-004 — Atomic failure.** Any validation, tag creation, transaction assignment, or
generation failure writes neither tag nor transaction nor proposal state, retains the original tags
and quick draft, and returns a typed error. Undo never observes a half-created tag and automation
never sees an intermediate empty/new-tag state.

**TGI-TAGS-005 — Full edit.** Full-edit popup interaction starts from the original complete tag set;
option toggles mutate only the controller draft. A successful shared commit writes the final set
once. Escape restores the original set and performs no hidden toggle write.

**TGI-TAGS-006 — Pointer selection.** Pointer selection in quick entry resolves to a singleton
without writing. Pointer selection in full edit toggles the draft only. Both follow `TGI-POP-*` for
leaving the popup.

## 5. Popup and outside-pointer ordering

**TGI-POP-001 — Capture transition intent.** While a grid editor/popup owns focus, outside
`pointerdown` first records a typed destination: another gridcell/control, inspector control, or
external target. No destination selection, activation, focus, or domain write occurs before current
draft validation.

**TGI-POP-002 — Invalid draft.** An invalid or unresolved draft prevents default and propagation,
keeps the popup/editor open, restores its registered focus target, writes nothing, and leaves the
destination inactive. A click into another gridcell therefore cannot bypass validation.

**TGI-POP-003 — Valid draft ordering.** For a valid resolved draft, the controller performs:
validate; commit changed value once; finalize changed-field proposal context without auto-applying
inside the same transaction owner; close popup; restore editor registration; then apply the recorded
destination intent. Only after that may active row/inspector identity change.

**TGI-POP-004 — Date.** Clicking a DayPicker day is an inside explicit selection: set the date
draft, validate, commit once, close calendar, and return according to the adapter. Clicking outside
the calendar but inside the date cell closes it and returns to text edit without committing.
Clicking another gridcell/inspector/external target follows `TGI-POP-001..003`; invalid date text
blocks it.

**TGI-POP-005 — Account and status.** Clicking an option is inside: resolve draft, close list,
return to editor, no write yet. Clicking within the owning cell closes the list and keeps the draft.
Clicking another gridcell, inspector, or external target commits only an already resolved valid
draft under `TGI-POP-001..003`; unresolved search blocks.

**TGI-POP-006 — Tags.** Option clicks alter only the draft. Clicking within the owning cell closes
the list and retains the draft. Leaving for another gridcell, inspector, or external target commits
the final resolved set once. An unmatched quick query blocks; tag creation occurs only through the
atomic explicit command in `TGI-TAGS-003`.

**TGI-POP-007 — Destination application.** After successful synchronous commit, a gridcell
destination becomes active and a directly targeted checkbox/button performs that exact action once;
an inspector destination enters `inspecting`; an external destination proceeds with its native
pointer action and parks selection. No synthetic click is replayed. A commit path requiring
unresolved async work is invalid for outside-pointer transition and must first be resolved
explicitly.

## 6. Focus and failure atomicity

### 6.1 Offscreen movement transaction

**TGI-FOCUS-001 — Snapshot.** Before offscreen work, snapshot generation, canonical selection,
engagement/editor state, active DOM element/address, scroll offsets, held window, pins, and
clipboard plan.

**TGI-FOCUS-002 — Ordered reveal.** Resolve target in expected generation; materialise without
publishing selection; stage held window/pending pin; scroll; await exact stable registration in that
generation; focus with `preventScroll` and verify `document.activeElement`; then publish selection
and mode and release pending pin.

**TGI-FOCUS-003 — Same-generation restoration.** A non-stale load/registration/focus failure
restores the snapshot only when the snapshot generation is still current. It restores scroll, held
window/pins, selection, mode, and prior focus where valid, writes no clipboard/domain state, and
returns a typed result.

**TGI-FOCUS-004 — Structural generation wins.** If generation advanced during failed work, never
restore generation-G selection, window, scroll, mode, focus, or pins over G+1. Discard G-only staged
resources, retain/remove a pin only if validated by G+1 reconciliation, and apply the atomic G+1
`TGI-RECON-*` result. Only addresses, rows, registrations, and scroll targets proven valid in G+1
may be focused or retained.

**TGI-FOCUS-005 — Safe fallback and retention predicate.** Inspector focus may remain on the stable
heading, or on a registered transaction-bound editable/actionable descendant only when the same
transaction owner survives reconciliation and that descendant's stable field/action binding is
unchanged. An owner change/disappearance invalidates every transaction-bound inspector descendant
even if the persistent DOM node survives or is rebound to the replacement transaction. For a
non-empty result, failed inspector retention focuses the registered stable inspector heading while
the panel remains open; if that heading is unavailable or the panel is closed, focus the registered
reconciled gridcell. Grid-owned focus goes directly to that gridcell. For an empty result, inspector
focus falls back to the stable heading while the panel is open, otherwise to the explicit control
after the grid. The grid root is permitted only during a pending valid reveal. Never use
`document.body`, a random mounted row, a stale prior anchor, the moving extent, or a
checkbox-selected row.

### 6.2 Structural reconciliation

**TGI-RECON-001 — Atomic result.** Structural reconciliation produces one immutable result before
the new generation becomes interactive. It never leaves an engagement state referring to cleared
ranges.

**TGI-RECON-002 — Non-empty canonical selection.** Discard every old rectangle/disjoint operation,
resolve one surviving/replacement address, and atomically replace selection with one inclusive
operation where anchor and extent both equal that address. If prior identity survives use it; row
removal chooses nearest row at prior absolute position; column removal chooses nearest surviving
selectable column in the resolved row.

**TGI-RECON-003 — Engagement and focus result.** If grid owned focus, result is `navigating` and
focus moves to the registered reconciled cell. If inspector owned focus, update the inspector to the
reconciled transaction and evaluate `TGI-FOCUS-005` before rebinding any descendant: retain
`inspecting` focus only on the stable heading or a control whose same transaction owner and stable
field/action binding survived unchanged. When the owner changed/disappeared or the binding changed,
never retain a transaction-bound editable/actionable descendant; if the panel remains open and its
heading is registered, enter `inspecting`, mute selection, and focus that heading, otherwise enter
`navigating` and focus the reconciled cell. If external UI owned focus, result is `parked` and
external focus remains.

**TGI-RECON-004 — Empty result.** If no matching row/selectable address remains, atomically set
empty selection and `idle`, clear active/pending pins, and show inspector empty state. Never retain
a transaction-bound inspector descendant. If inspector owned focus and the panel remains open, focus
the registered stable inspector heading; otherwise focus the explicit after-grid fallback only when
grid or inspector focus must be displaced.

**TGI-RECON-005 — Draft and row selection.** Cancel an edit whose row/column is invalidated without
committing invalid data. Value-only writes and held-window movement retain selection and engagement.
Row-checkbox selection reconciles only through its independent spec 012 rules.

## 7. Responsive inspector

### 7.1 DOM and accessibility

**TGI-INSP-001 — One subtree.** `TransactionInspector` renders exactly one persistent `<aside>` for
the workspace lifetime. CSS placement repositions that same node. No desktop/mobile copy, key
change, second root portal, `Sheet`, or dialog replacement is permitted.

**TGI-INSP-002 — Responsive presentation.** Wide layout is a nonmodal right column with
fixed/clamped width and no resizer. Narrow layout is a nonmodal stacked/bottom region in document
flow. Breakpoint-only changes preserve node identity, focused descendant, draft, selection,
inspector scroll, and controller registration because transaction owner and control binding do not
change; they never exempt an owner-changing reconciliation from `TGI-FOCUS-005`.

**TGI-INSP-003 — Landmark semantics.** The native complementary landmark has stable ID and
`aria-labelledby="transaction-inspector-title"`. Its visible heading has that ID and `tabIndex=-1`
as the safe programmatic target, without announcing financial values.

**TGI-INSP-004 — Toggle and close semantics.** The external toggle has `aria-controls` for the
stable aside and `aria-expanded`. The close control is named “Close transaction inspector”. The
aside never uses `role=dialog`, `aria-modal`, a focus trap, inert, or grid hiding.

**TGI-INSP-005 — No update focus theft.** Value/content updates for the same transaction owner and
unchanged control binding do not focus the panel or announce all content. Structural updates that
change/disappear the owner follow `TGI-RECON-003`, `TGI-RECON-004`, and `TGI-FOCUS-005`; moving
focus from an invalid rebound control to the stable heading or reconciled gridcell is required
safety, not focus theft. Before first grid focus, an open inspector shows neutral empty state.
Row-checkbox selection never chooses the inspected transaction.

**TGI-INSP-006 — Muted grid semantics.** While `inspecting` or inspector-owned `interacting`, the
canonical range stays `aria-selected=true` with muted paint. The inspector remains outside the grid
accessibility tree.

**TGI-INSP-007 — Origin and close return.** Opening records the canonical active address. User close
from inside returns through current-generation registration to the reconciled active anchor.
External toggle close leaves focus on the toggle. Remote close inside the panel uses the same safe
return but does not synthesize a user action.

**TGI-INSP-008 — Owner change or disappearance.** Structural reconciliation updates the canonical
one-cell address and inspector owner before focus resolution. If the same owner and focused
field/action binding both survive unchanged, retain that control. Otherwise prohibit focus retention
in every transaction-bound editable/actionable descendant: focus the stable inspector heading while
the panel remains open and registered, or the reconciled gridcell when it does not. An empty result
uses the heading-or-after-grid rule in `TGI-RECON-004`. Never restore the removed address, leave
focus on a node rebound from transaction A to B, or focus `document.body`.

**TGI-INSP-009 — Open persistence boundary.** Explicit user open/close changes preference.
Responsive relocation, active-row updates, error reconciliation, and temporary popup transitions do
not.

### 7.2 Inspector engagement transitions

| Acceptance ID   | Event                                        | Required result                                                                                                                                                              |
| --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TGI-INSPCMD-001 | Enter/Space on active actions cell           | End continuous intent, record origin, open panel if needed, enter `inspecting`, focus heading, mute selection                                                                |
| TGI-INSPCMD-002 | Pointer external toggle opens                | Open same aside and preference; focus stays on toggle until user enters; engagement remains grid/external owner until then                                                   |
| TGI-INSPCMD-003 | Tab/pointer enters inspector from navigation | Enter `inspecting`, retain canonical address, mute selection, publish row viewing; no auto-apply                                                                             |
| TGI-INSPCMD-004 | Enter inspector from editor                  | Validate/commit once, end continuous intent, then enter `inspecting`; invalid draft blocks and retains editor focus                                                          |
| TGI-INSPCMD-005 | Escape inside inspector                      | Close top inspector-owned popup first; with none open, close panel, persist closed, return to reconciled active cell as `navigating`                                         |
| TGI-INSPCMD-006 | Tab/pointer leaves inspector without closing | To grid anchor in the same transaction owner: `navigating`, no auto-apply. To external UI: finalize true-owner-exit auto-apply first, then `parked` and allow external focus |

## 8. Inspector preference merge semantics

**TGI-PREF-001 — Field and default.** Add optional `transactionInspectorOpen` to encrypted
user-scoped `userDisplayPreferenceSchema`, keyed by viewer `pubkeyHash`. Absence/invalid legacy
value reads open. No localStorage, device-global, vault-global, or row-local copy exists.

**TGI-PREF-002 — Field-level write.** Obtain/create the viewer record, preserve `pubkeyHash` and
every other present field including `dateFormat`, mutate only `transactionInspectorOpen` in the
loro-mirror draft, and never reconstruct the record from defaults.

**TGI-PREF-003 — Merge.** Concurrent same-viewer `dateFormat` and inspector writes merge as
different Loro map fields. Same-field inspector writes use normal LWW convergence. Different viewers
never affect one another.

**TGI-PREF-004 — Remote updates.** Remote open/close repositions/hides the same aside without
remount or focus theft. Remote close while inspector owns focus uses `TGI-INSP-007`; unknown values
are not rewritten until the viewer chooses.

## 9. Notes, automation, and presence ownership

**TGI-OWN-001 — Notes.** Notes are an inspector textarea with existing immediate draft-style CRDT
persistence and search. Its transaction-bound focus survives responsive relocation only while the
same transaction owner and notes binding remain unchanged; owner-changing reconciliation applies
`TGI-FOCUS-005` before the textarea can accept another action. No expanded second ARIA row,
`expandedIds`, notes column, or note-driven virtual measurement remains.

**TGI-OWN-002 — Mounted automation.** Automation controllers stay mounted while inspector is closed.
Pending manual state is keyed by stable transaction+field and survives virtualization and panel
closure.

**TGI-OWN-003 — Draft context.** Editor entry publishes field, original value, and typed draft
context immediately. Pending proposal creation/update occurs only after one successful changed
commit.

**TGI-OWN-004 — Movement sequence.** Before active-row movement: validate/commit field; finalize
proposal or true-owner-exit auto-apply; then change active row/inspector identity.

**TGI-OWN-005 — Owner predicate.** Focus in a row, inspector control, or portaled descendant remains
inside a transaction only while its stable row-owner marker and field/action binding equal the
controller registration for that same owner; persistent DOM identity alone is insufficient.
Changing/disappearing the owner is true owner exit and invalidates every transaction-bound inspector
descendant before its DOM binding updates. Leaving all same-owner row, inspector, and portal
surfaces is also true owner exit.

**TGI-OWN-006 — Presence.** Engagement follows `TGI-STATE-006`; portals and async transitions never
publish destination identity early or any financial/draft value.

## 10. Fixed virtualization

**TGI-VIRT-001 — Geometry.** Rendered transaction height is exactly 57px in resting, selected,
muted, editing, validation, presence, duplicate, and automation states. Selection paint is inset;
editors use the same box; help/validation use descriptions, overlays, or inspector and never grow
the row.

**TGI-VIRT-002 — Counts and window.** Keep full matching virtual/count semantics separate from the
sparse held Table model. Preserve the 600-row held window, stable keys, overscan, horizontal
allocation scrolling, snapshot/reveal behavior, and browser instrumentation.

**TGI-VIRT-003 — Pins.** Pin only the actual active/editor row and one pending-reveal row. Selection
endpoints may exist in sparse geometry but are not mounted merely because selected.

**TGI-VIRT-004 — Compiler boundary.** `useVirtualizer` remains isolated in its compiler-skipped
leaf. Preserve stable table options/columns, row-local subscriptions, and no `React.memo` around
rows that read TanStack getters.

## 11. Verification acceptance

**TGI-VERIFY-001 — Lowest practical layer.** Every acceptance key receives automated coverage at its
lowest practical layer and E2E coverage for user-visible flows. The final manifest contains exactly
the expanded key set from this document.

**TGI-VERIFY-002 — Focus and identity proof.** Tests compare anchor/extent explicitly, assert
`document.activeElement`, prove strict inspector node identity across breakpoint relocation, and
exercise atomic non-empty/empty reconciliation states.

**TGI-VERIFY-003 — Failure and mutation proof.** Force same-generation and advanced-generation
load/register/focus failures, outside-pointer invalid drafts, IME duplicate-final-input paths,
atomic tag creation failure, preference concurrency, range/action/copy guard inversions, and exact
rendered row height. Neutralize/invert production mechanisms rather than restating rules in tests.

**TGI-VERIFY-004 — Complete campaign.** Preserve financial and row-selection journeys, run static,
build, unit/integration/E2E gates, production headless manual checks, repeated retry-free full E2E,
Chrome presentation evidence, iOS Safari correctness evidence, tree attestations, and revisioned
independent review defined by `evidence/README.md`.

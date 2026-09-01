# Amendment 003: Unified Grid Navigation and Popup Escape

**Authorized:** 2026-09-01 by direct user instruction.

This amendment supersedes the keyboard portions of `TGI-STATE-005`, `TGI-CMD-009`, `TGI-CMD-015`,
`TGI-CMD-016`, `TGI-TAB-002`, `TGI-ACCOUNT-003`, `TGI-TAGS-005`, and `TGI-POP-*`. All unscoped
source-016 requirements remain unchanged, including composition ownership, inspector Escape
layering, row-selection independence, generation-safe focus, native text editing without Alt, and
pointer ordering.

## Canonical modified-arrow ownership

Alt/Option+Up/Down/Left/Right and Alt/Option+Shift+Up/Down/Left/Right are canonical grid commands
from every transaction-grid cell state: direct gridcell focus, activation descendants, quick/full
editors, and top-level grid-editor popups or modals and their owned portal descendants. Plain Alt
movement replaces selection at the resolved adjacent cell; Alt+Shift extends from the canonical
anchor. Activation descendants never activate while applying these commands. Ctrl/Cmd-modified
arrows remain native.

An active or consumed composition, `event.isComposing`, or key code 229 owns the event before this
rule. A nested Select opened inside Create Account remains widget-owned: its arrows and first Escape
navigate or close only that Select. Once no nested Select is open, the enclosing modal follows the
top-level rules below.

## Alt finalization

From quick/full edit or a top-level grid-editor popup, Alt movement first validates the owning
editor. A changed valid draft writes exactly once, then every top-level owned popup/editor closes
and the controller performs one generation-checked canonical move/extend/focus transaction while
preserving the current quick/full continuous-entry intent. An unchanged valid draft writes nothing.
Invalid or unresolved validation prevents default and propagation, writes nothing, retains the exact
popup/editor draft, canonical selection, and registered focus owner, and performs no movement.

Alt movement from Create Account never creates an account. It resets and closes the creation modal,
then validates the retained outer Account editor and applies the same exact-once movement rule.

## One-Escape top-level cancellation

One Escape delivered to a top-level grid-editor popup or modal cancels and resets the complete
owning editor draft, closes every top-level popup/editor owned by that address, writes nothing, ends
continuous edit, exposes the unchanged canonical one-cell selection, and focuses the owning gridcell
as `navigating`. It does not park, move, activate a destination, clear row selection, or reopen the
editor or popup. Late popup-close callbacks are stale no-ops.

Escape in Create Account resets its Name, Type, and Currency draft and closes both the modal and the
outer Account editor without creating an account or changing the transaction. Escape inside an open
nested modal Select remains widget-owned and closes only that Select; the next Escape at modal level
applies the preceding top-level cancellation.

Inspector-owned popup Escape remains layered under `TGI-INSPCMD-005`: close the inspector popup
first, then close the inspector on a later Escape. Non-Escape popup dismissal continues to return to
the same editor under `TGI-STATE-005` and `TGI-POP-*`.

## Single keyboard authority

The canonical key reducer/controller path is the sole arrow, extension, and Escape owner for
transaction cells and owned grid-editor portals. Retire the legacy table-level
`transactionCellKeyIntent` arrow/extend/clear path and its row-selection clearing. Retain only the
separately mode-gated browser clipboard effect. Canonical commands prevent default and propagation
exactly once; native and widget-owned commands do neither.

Required direct evidence includes the pure reducer; production-shaped Date, Description, Account,
Tags, Status, and Create Account DOM paths; activation descendants; all four Alt directions and
Shift variants; invalid Date, Description, and Tags commits; active and consumed IME; exact-once
changed and unchanged writes; no row-selection mutation; owning-cell focus after Escape; no
destination editor reopen; the nested Select exception; boundary and offscreen focus transactions;
and stale popup-close callbacks.

This direct-user behavioral decision does not add another executable amendment record. Final
acceptance accounting remains the unchanged 146 base records plus the one executable Amendment 001
record; Amendments 002 and 003 are separately identified direct-user decisions.

# Transaction Cell Hit Area

Frozen requirement source for a transaction-table interaction change reported by the human principal
on 2026-08-02, and admitted into goal `007-human-scratch-completion`'s committed scope at the
principal's explicit instruction.

This file is a frozen source. Once its SHA-256 is recorded in `SCOPE.json`, its text is immutable:
no edits, no checkbox markers. Completion is recorded only in the requirement/package ledgers after
implementation and independent review, exactly as `FS-001`.

## UR-012 — Each transaction cell's control fills its cell

Every editable control in the transaction table must occupy its whole grid cell, so that clicking
anywhere in the cell begins editing that field without the pointer having to find the control.

Today each cell pads its contents and the control sits inside that padding, so a click near a cell's
edge lands on the row rather than the control. The row itself carries no behaviour, so such a click
does nothing and the user must aim.

Required behaviour:

- Clicking anywhere within a cell activates that cell's control: the text fields begin editing with
  the caret placed, the selects and choosers open, and the checkbox toggles.
- The resting appearance is unchanged. Every control keeps its present size, position, alignment and
  typography, and a row at rest looks exactly as it did before.
- The checkbox keeps its current drawn size while its activation area covers its cell.
- The date field keeps its text and calendar icon in their present positions while its activation
  area covers its cell.
- The status select, the tag chooser, the amount field and the person percentage fields likewise
  keep their present appearance while their activation areas cover their cells.
- Hover and focus feedback follow the enlarged control, so the whole cell reflects the state rather
  than only the region the control previously occupied.
- Keyboard behaviour is unchanged: tab order, arrow-key grid navigation, and the focus ring remain
  as they are, and the focus ring stays clearly visible.
- Accessible roles, names and states are unchanged, and each cell still exposes exactly one control
  to assistive technology.
- Existing per-cell behaviour is retained, including the description cell's alias proposal controls,
  the row's presence indicator, and the add-transaction focus placement.

The requirement is about where a click is accepted, not about how the table looks at rest. A change
that alters resting appearance, position or spacing does not satisfy it.

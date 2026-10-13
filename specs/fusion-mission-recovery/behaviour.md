# Refine transaction editing and simplify automation rules — desired behaviour

This is a reconstruction of the behaviour the mission asked for, written for a reader of the product
rather than an implementer. It is assembled from the saved Fusion plan (`specification.md`), the
earlier automation requirement in `specs/human-scratch.md` lines 247–295, the matching audit and the
ownership contract. The original interview transcript is lost, so each section carries a provenance
mark:

- **[confirmed]** — your own words survive, in `specs/human-scratch.md`, or the mission statement
  states it directly.
- **[saved plan]** — in Fusion's saved feature descriptions and acceptance criteria. Almost
  certainly derived from the interview, but paraphrased by the agent.
- **[proposed]** — an agent's resolution of a question the plan left open. Not approved by you.

Where the saved plan changes something your scratch file said, the change is called out.

---

## 1. The problem being solved

**[confirmed]** Automation rules exist today as single-field rules: one rule renames a description,
another adds tags, a third sets the person allocation. Editing a transaction that matches several of
them is noisy, the inspector is cramped, and the creation and editing surfaces are different. The
mission is to:

1. Combine compatible outputs into one multi-field rule, so "rename to Coffee, tag it coffee, split
   it 50/50" is one rule rather than three.
2. Give creation and editing one shared, roomier editor, used both from a transaction and from the
   standalone automations page.
3. Keep the matching model exactly as it is: rules match by description text, optionally narrowed by
   account and amount, and no transaction ever stores a link to a rule.
4. Fix a set of table-editing annoyances: nullable numbers, keyboard consistency across cell types,
   spreadsheet-style range selection, and inspector scrolling.

**[confirmed]** Automation UI changes need interactive HTML mockups approved by you before
implementation. Table interaction changes do not need mockups.

---

## 2. How rules match — behaviour that must not change

The entities and the matching pipeline are drawn in [domain-model.html](domain-model.html).

This is the existing contract, which you wrote and the audit confirmed is what ships.

**[confirmed]** A rule is keyed by exact description text. It may additionally be restricted to one
account, one amount, or both. There can be only one rule per description text at each of those four
levels of restriction.

**[confirmed]** When several rules match a transaction, the most specific wins: text only, then text
plus amount, then text plus account, then text plus account plus amount. Precedence is evaluated per
field, so the description alias, the tags and the allocation of one transaction can each come from a
different rule.

**[confirmed]** Rules set fields on transactions. There is no stored link between a rule and a
transaction. Which rule applies is recomputed whenever it is needed.

**[confirmed]** Rules run against newly imported transactions. Description-alias rules do not apply
to manually created transactions, because those have no raw description text. Tag and allocation
rules do apply to manual transactions.

**[confirmed]** Tag rules have two modes: add tags to whatever is there, or set tags, replacing
whatever is there. An allocation rule covers the complete set of person percentages, not one
person's share.

**[confirmed]** Your last choices for the scope controls are remembered per user, in the vault, and
restored next time.

---

## 3. Scope and automatic application

**[confirmed]** When you change a field on a transaction, the app offers to turn that change into a
rule. The offer has two independent choices:

- **Scope.** Update all: every matching transaction, past and future. Update new: only matching
  transactions from this one onward, plus future imports.
- **Automatic or manual.** Either the rule is applied when you move away from the row, or it waits
  until you press the explicit apply button.

**[saved plan]** The four-option select is replaced by two Update all / Update new radios plus an
Apply on blur checkbox. The scope wording should explain the date cutoff inline, without a separate
explanation button.

**[saved plan — changed from your scratch file]** Update new includes transactions dated the same
day as the selected transaction, as well as later ones. Your scratch file said strictly later. The
saved plan is explicit that the cutoff is inclusive, which suggests you changed your mind in the
interview, but there is no record of the words.

**[confirmed]** When the editor is opened from the standalone automations page rather than from a
transaction, Update new means all future imports.

**[saved plan]** With Apply on blur unchecked, nothing is written until you press Apply. With it
checked, the write happens only when focus genuinely leaves the row. Moving between controls inside
the editor must never discard your edits or trigger a bulk change by accident.

**[confirmed]** Cancelling writes nothing: no rule, no application, no remembered preference.

---

## 4. Grouped rules and which rule an edit extends

**[saved plan]** One rule can hold up to three outputs: a description alias, a tag set with its
add/set mode, and a whole person allocation. Existing single-field rules keep working as they are
and are never merged automatically.

**[confirmed]** When you edit a field on a transaction and more than one rule already applies to it,
the description rule is the preferred one to extend. For example: constrain a description rule to
this account, then edit the tags, and the tags join that same rule rather than creating a second
one.

The plan left the harder cases open and asked for them to be settled before implementation. The
agents proposed answers; you have not approved any of them.

**[proposed]** Only rules whose match conditions are identical to what the edit would create are
candidates for extension. A rule that matches this transaction under a broader or narrower condition
is not, because folding into it would silently change which transactions the new output reaches.

**[proposed]** If the edited field already has an owner among the candidates, that owner is updated
in place by default. Moving the output to the description rule is offered as a labelled choice that
states what happens to the old rule, never done silently.

**[proposed]** If there are several candidates, none owns the edited field and none is a description
rule, the app presents them with their conditions and outputs and asks you to choose. It never picks
by recency or position.

**[proposed]** If the rule currently implies a value the transaction does not actually have, the
editor shows both before you confirm, since confirming rewrites the rule for every matching
transaction.

**[proposed]** When folding tags into a rule whose add/set mode differs from your remembered mode,
the editor asks which mode to keep rather than guessing.

**[proposed]** If a rule was changed or deleted by someone else while the editor was open, the
editor says so and re-presents it rather than overwriting or silently recreating it.

---

## 5. Splitting an output out of a rule

**[saved plan]** Each output badge on a rule has a Split control. Splitting moves exactly that one
output into a new rule with the same match conditions. The original keeps its remaining outputs.
Nothing else is copied: scope and Apply on blur are your own remembered choices, not properties of a
rule. Immediately after the split every transaction looks the same; subsequent edits to either rule
are independent.

**[saved plan]** The behaviour when the rule has only one output, or when the split would collide
with an existing rule at the same level of restriction, follows the approved contract.
**[proposed]** A collision is refused and the holding rule is named and offered as the target, never
merged into automatically.

---

## 6. The shared rule editor

**[saved plan]** Creation and editing use the same editor with the same structure, whether opened
from a transaction or from the automations page. It shows:

- the match conditions: description text, and the optional account and amount restrictions;
- one badge per output, each with its own Split control, and the add/set mode for tags;
- the Update all / Update new radios and the Apply on blur checkbox;
- Apply, and Delete where the rule already exists.

**[saved plan]** The legacy duplicate action buttons are removed. All controls have accessible names
and keyboard access.

**[confirmed]** From a transaction, a matching rule is shown with an indicator. If the transaction's
current values agree with what the rule implies, the indicator is neutral. If they differ, the
indicator turns orange, not red, and the editor offers an "apply to this transaction" action.
Applying to one transaction does not create a link to the rule.

**[saved plan]** The inspector is roomier than today and scrolls independently when its content is
long.

---

## 7. Table editing refinements

### Nullable numbers

**[saved plan]** Allocation and amount fields may be blank. Clearing either persists as blank and
survives reload. A blank allocation is shown as a dash and contributes zero to calculations. An
explicit zero is shown as 0%, not a dash, because it is an answered question.

**[saved plan]** You can type freely; the value is normalised when you leave the field. "a.1"
becomes 0.1, wholly non-numeric text becomes blank, negative allocations and allocations above 100%
stay as typed. Amounts keep valid negatives and respect the currency's precision. Invalid or
incomplete text never blocks moving to another cell.

**[saved plan]** Numeric cells use the same navigating / quick-edit / full-edit behaviour as the
description cell, including plain arrows and Alt+Arrow.

**[proposed]** Normalisation rules, implemented and tested in `src/lib/domain/numeric-text.ts`:

- Only digits, `.` and `-` matter. Letters, spaces, currency symbols, `%`, `+`, parentheses and `,`
  are ignored, so "a.1" is 0.1, "$1,234.50" is 1234.5 and "1,5" is 15. A comma is never a decimal
  separator.
- Text with no digit, such as "", "abc", "-" or ".", is blank.
- The value is negative when a `-` comes before the first digit: "--5" and "-.5" are negative, while
  "5-" and "1-2" ignore the later minus.
- The first `.` is the decimal point and later ones are ignored, so "1.2.3" is 1.23.
- Negative zero is 0. A number too large to store is blank.
- Amounts are then rounded to the currency's precision and stored as integer minor units; an
  allocation keeps its exact typed value.

**[proposed]** Decisions taken while implementing, recorded here so the automation work can follow:

- A blank amount is stored as an absent field. It is shown as a dash, contributes nothing to
  balances or settlement, sorts after every amount, is never a duplicate candidate on import, and
  never satisfies an amount-scoped rule. An "only if this amount" rule cannot be seeded from it.
- A blank allocation is an absent key; an explicit 0 is a stored 0. Both contribute 0% to
  calculations, so owner remainder and settlement treat them alike.
- A valid allocation is any finite number. The earlier ±100% limit (`specs/human-scratch.md`
  line 302) is superseded by the saved plan's "negative and above-100 allocations remain valid", and
  it no longer applies to rules either, so a rule can carry any value a cell can.
- Rules keep "blank counts as 0%": a rule's allocation set still omits zeros when it is applied, so
  applying a rule never distinguishes blank from an explicit 0. Only a direct cell edit stores an
  explicit 0.

### Action cells

**[saved plan]** Entering edit on the actions cell focuses the first button. Left and Right move
between buttons without wrapping, Enter or Space activates once, Escape returns to cell navigation,
and Alt+Arrow moves through the grid from inside the cell. Focus is always visible.

**[proposed]** The grid contract keeps Enter and Space on the actions cell for opening the inspector
(TGI-ACT-002, TGI-INSPCMD-001), so entering the cell is Tab, which the contract already uses to
reach its controls: Tab focuses the first button, Shift+Tab returns to the cell. Each action button,
the duplicate badge included, shows its own focus ring.

### Selection

**[saved plan]** Outside of editing, the grid behaves like a spreadsheet: clicking selects a cell,
Shift-click extends a rectangular range from the anchor, and dragging across cells selects a
rectangle. Browser text highlighting does not appear on non-edit cells. Inside an editor, native
cursor placement, text dragging and copying work as normal. Selection stays correct across
virtualised rows and when dragging to the edge scrolls the table.

**[confirmed]** Requested on 2026-10-13: moving between cells with the keyboard scrolls the table so
the selected cell stays fully in view, below the sticky header and horizontally.

**[proposed]** While dragging, holding the pointer within 32px of the table's edge scrolls the
table, faster the closer it is to the edge, and the selection keeps following the cell under the
pointer, including beneath floating chrome such as the bulk-edit toolbar. Shift-click and drag move
only the far corner of the rectangle; the cell the range started from keeps keyboard focus, so the
next arrow key moves from it.

### Date input

**[confirmed]** Requested on 2026-10-13: the date cell is fully usable from the keyboard. The rules
below are **[proposed]**, written before implementation, and stay inside the grid contract
(`specs/016-transaction-grid-interaction-inspector/interaction-contract.md`, TGI-CMD-009 and
TGI-TAB-002):

1. **Typing.** A printable key on the date cell starts quick entry with that key; Enter or
   double-click starts full edit, which selects the whole date text. The text is read in the
   viewer's date locale when leaving the input, as today, and text that names no date keeps the
   editor open and marked invalid.
2. **Arrow adjustment.** In the text input, Ctrl+Up or Cmd+Up moves the date one day later and
   Ctrl+Down or Cmd+Down one day earlier. The step starts from the date the text currently names, or
   from the stored date when the text names none, and rewrites the text; it is saved on leaving like
   typed text. Plain and Alt arrows keep their grid meaning.
3. **Opening the calendar.** Tab from full edit opens the calendar and puts focus on the selected
   day. Inside it the calendar owns its keys: arrows move by day and week, Page Up and Page Down by
   month, Enter or Space picks the focused day, which saves it, closes the calendar and returns to
   cell navigation on the date cell.
4. **Closing the calendar and Escape order.** Escape closes only the topmost layer: the first Escape
   closes the calendar and returns focus to the date text with the typed draft intact; the next
   Escape cancels the edit and returns to cell navigation with the stored date; the next parks the
   grid as usual. Alt+Arrow inside the calendar never moves through the grid.

### Viewport

**[saved plan]** Opening, expanding or scrolling a long inspector never creates a page-level
scrollbar. The table keeps scrolling on its own at every supported viewport size with the inspector
open or closed.

---

## 8. Decisions recorded on 2026-10-11

**[confirmed]** You reviewed the editor mockup scenarios for ownership conflicts, split, mismatch
and pending edits and agreed with them:

- After a split, editing the split-out field updates its own rule by default, and rejoining it to
  the description rule is an explicit choice offered only while the conditions are still identical.
- Divergence between a rule and a transaction must be obvious. The marker is orange, not red, since
  it is information rather than an error.
- Editing one row without changing its rule is done by cancelling or not applying the proposal. The
  row then shows as divergent. A deliberate exception is accepted as indistinguishable from drift
  for now.
- Cell edits are written to the transaction before the rule proposal appears; the proposal concerns
  only the rule.

## 9. What you still need to decide

1. Whether the Update new cutoff is inclusive of the same date, as the saved plan says, or strictly
   later, as your scratch file says.
2. Whether to approve the proposed ownership resolutions in section 4, or change them.
3. Whether to remember the Apply on blur preference separately for creating a rule and for changing
   an existing one, with the latter defaulting off, to avoid rewriting other rows on leaving a row.
4. Whether the remaining editor mockup scenarios at `mockups/rule-editor.html` are the design you
   want. Scenarios 4 to 7 are agreed; the rest are unapproved until you say otherwise.

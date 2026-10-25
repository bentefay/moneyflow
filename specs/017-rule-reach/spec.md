# Rule reach: every edit is a rule, and a rule knows where it applies

Status: draft for discussion. Builds on the grouped automation rules delivered in PR #67 and
supersedes two decisions recorded there: that scope is never a property of a rule, and that no rule
stores a transaction id. Both are reversed here for one reason, stated in section 1.

## 1. The problem this solves

Today a rule is conditions plus outputs. Where it has been applied is not recorded anywhere. That
produces four awkward behaviours in the shipped design:

1. Renaming one transaction is conceptually a rule, but it is not stored as one. The offer to make
   it a rule is transient grid state, lost on reload and replaced by the next edit.
2. A one-off edit cannot be a rule without becoming policy for every matching row and every future
   import, so one-off edits are not rules at all.
3. A row whose value differs from its rule looks the same whether the user chose that value or the
   rule simply never reached the row.
4. "Update new" is a one-time bulk write. A row imported later with an earlier date still receives
   the rule, which is not what "new" meant.

All four come from the same gap: a rule has no reach. This spec gives it one.

## 2. The model

A rule has three parts.

| Part       | Meaning                                                            | Unchanged from PR #67? |
| ---------- | ------------------------------------------------------------------ | ---------------------- |
| conditions | exact description text, optional account, optional amount          | yes                    |
| outputs    | description alias, tags with add or set mode, whole allocation set | yes                    |
| reach      | which of the matching transactions the rule governs                | new                    |

Reach is one of:

- **these transactions** — an explicit set of transaction ids. This is what a rule created from a
  single edit starts with: the one row that was edited.
- **from a date** — every matching transaction dated on or after the date, including future imports
  with such dates.
- **all** — every matching transaction, past and future.

A rule **governs** a transaction when its conditions match and the transaction is within its reach.
Matching stays a pure function of conditions; reach only narrows the result. Nothing about how a
rule matches changes.

### 2.1 Precedence gains one dimension

Today the most specific conditions win per field: text, then text plus amount, then text plus
account, then both. Reach is added as the most significant dimension above conditions:

1. A rule with an explicit transaction set beats any rule with a date or all reach, for the rows in
   its set.
2. Among rules with the same reach kind, conditions decide as today.
3. Ties remain broken by recency then id, and remain reachable only through concurrent creation.

So two one-off edits on the same description text with different values coexist: each governs its
own row. An "all" rule on that text governs every other row. Widening a one-off rule to "all" when
an "all" rule already exists in that slot is a collision, handled as a uniqueness refusal exactly as
today, naming the holder.

### 2.2 Uniqueness

Reach kinds form two groups: **explicit** (these transactions) and **wide** (from a date, all). At
most one wide rule may exist per output field per conditions slot, because two wide rules on one
slot would compete by recency on most rows. Any number of explicit-set rules may share the slot as
long as their id sets are disjoint, and an explicit-set rule coexists with the wide rule, outranking
it for its own rows. Widening an explicit-set rule into a slot whose wide rule already exists is not
a collision: it folds into that rule (section 3.2).

### 2.3 What the reach set is, and what it is not

The explicit set is a record of application, not a match condition. The rule still matches only by
conditions; a transaction id in the set whose transaction no longer matches the conditions (its
description was re-imported differently, say) is ignored and cleaned up on the next write to the
rule. The set is a Loro map of ids to `true`, so concurrent additions on two devices merge as a
union.

## 3. Behaviour

### 3.1 Editing a cell creates or updates a rule

When the user finishes editing a description alias, tags or allocation on a transaction, a one-row
rule is created at once: the row's conditions (description text only, unless the user chose a
restriction), the edited field as its only output, and reach **these transactions = { this row }**.
The row already holds the value, so nothing else is written. If the row already has a one-row rule
for that field, its output is updated in place instead. The row is therefore always truthful, and
nothing propagates until the row changes or the user asks.

The inspector card for that rule then shows what will happen next, pre-set from two remembered
preferences:

- **The default target, applied later, never on Enter.** If a wide rule with identical conditions
  governs the row, the default is to **update that rule** when the row changes or Apply is pressed:
  replace its output for the field, or add the field to it if it lacks one. Its reach is unchanged;
  the change applies across that reach where values differ. Otherwise the default is to **widen the
  new rule** to the remembered reach (this transaction only, from this transaction's date, or all
  matching). The card always offers "Only this transaction" as the alternative, which leaves the
  one-row rule as it is.
- **When it happens.** A remembered "Apply automatically when I leave the row" checkbox. Leaving the
  row means the active row changing; entering the inspector is not leaving the row, so the card can
  be adjusted first. When on, the default runs as the row changes; when off, the card keeps an Apply
  button and the one-row rule waits.

Whatever the trigger, the work is only done for rows whose values would actually change, which the
description-text index and the population count make a cheap test. If nothing would change, nothing
is written.

Changing the card's reach or the checkbox updates the remembered preference. The old four-mode
preference maps onto the two: "Updating all" is all plus automatic, "Updating new" is from-date plus
automatic, "Update all" and "Update new" are the same without automatic, so existing users' choices
carry over.

While the cell is still being edited, the inspector shows a live preview computed from the draft
value: "Creates a rule for this transaction, then applies it to all 3 matching when you leave the
row", "Updates the Tags rule for 3 transactions when you leave the row", or "Creates a rule for this
transaction only".

Clearing a value never creates a rule. If the row has a one-row rule for that field, clearing
deletes it. If a wide rule governs the row, clearing makes the row divergent.

### 3.2 Widening and narrowing

The inspector's rule card and the Automations page editor show the rule's reach as a control with
the three kinds. Changing it is editing the rule:

- Widening to **from a date** or **all** applies the outputs to every newly governed row where this
  rule wins the field, in one vault action, after showing the count.
- Narrowing back to **these transactions** keeps the currently governed rows as the explicit set and
  applies nothing. Rows keep their values; they are simply no longer governed.
- A row outside a rule's reach, when it matches the rule's conditions, shows an offer on its
  inspector card: "A rule for this text exists; extend it to this transaction?" Accepting adds the
  id to the set, or, if the rule is date-reached and the row is older, offers to widen to all.

**Replacing exceptions.** When a widening or an update would cover rows that one-row exceptions on
the same text and field currently govern, the card offers a per-apply option, off by default: "Also
replace N exceptions on these rows". With it on, those one-row rules are deleted in the same vault
action and the rows take this rule's value, so undo reverts everything together. Rules with narrower
conditions (an account or amount restriction) are deliberate and are never touched by this option;
the count line says "M more specific rules keep their rows" when they exist. The option is not
stored on the rule.

### 3.3 Automatic application

Automatic application is the remembered "Apply automatically when I leave the row" preference from
3.1. It runs the card's default target when the active row changes, and only for rows whose values
would change. It never runs on entering the inspector, and never runs for a cleared value. With it
off, the one-row rule stays until the user presses Apply on the card, which they can do at any later
time by returning to the row.

A user who wants a tag to apply to all future coffee rows leaves the remembered reach at "all
matching" with automatic apply on; thereafter every edit propagates as the row changes, and every
import within reach is governed on arrival.

### 3.4 Divergence

For each field, the rule that governs a row is the highest-ranked rule that reaches it and carries
that output: the winner. A row is divergent for a field when its value differs from the winner's
output. It is shown in orange with "Apply to this transaction", exactly as today. A rule that
reaches the row but is outranked for that field is not consulted, so a one-row exception never shows
the wider rule as divergent on its own row. A row no rule reaches is never orange. This is the
distinction between a deliberate exception and drift that PR #67 could not make.

The inspector shows one card per rule that wins at least one field on the row, one-row rules first.

### 3.5 Imports

On import, a row is governed by a rule only if the rule reaches it: "all" always; "from a date" if
the row's date qualifies; "these transactions" never, since the new row's id cannot be in the set.
Today every active rule applies to every matching import; that changes for date-reached rules, and
it is the intended fix for problem 4.

### 3.6 Deleting transactions, imports and rules

- Deleting a transaction removes its id from any explicit set. Deleting an import deletes its
  transactions, with the same effect. Merging duplicates moves the surviving id into any set the
  removed id was in.
- **Orphaned rules disappear.** An explicit-set rule whose set is empty can never reach anything,
  including future imports, so it is treated as not a rule: hidden from matching, from inspector
  cards and from the Automations page. This is derived on read rather than written as a delete, so a
  concurrent device that extended the rule to another row revives it on merge with nothing lost. The
  vault maintenance pass garbage-collects such records later. Wide rules are never treated as
  orphaned: a wide rule whose text currently matches nothing still governs future imports.
- **Redundant exceptions disappear the same way.** A one-row rule whose output equals the output of
  the wide rule that would otherwise govern its row changes nothing and is treated as not a rule.
- Deleting a rule leaves every row's values as they are, as today.

### 3.7 Split and move

Split copies the source rule's conditions **and reach** to the new rule; both rules then govern the
same rows. Moving an output into a host with different reach is refused in the same way a conditions
mismatch is refused today, with the reach difference named. Fold into an identical- conditions rule
requires identical reach as well.

## 4. The Automations page

The editor shows conditions, outputs and reach. Reach is a legitimate rule setting now, so showing
it inside the editor is correct. "Apply" and "Cancel" become "Save" and "Cancel": saving a rule with
a wider reach is what applies it, after a count is shown. There is no separate apply action.

The list groups rules by reach so one-off rules do not drown the deliberate ones: "Applied to
everything", "Applied from a date", "Applied to specific transactions", with the last collapsed by
default and showing its count.

## 5. Worked examples

Shared facts: three imported rows for `COFFEE SHOP 123` on 2 Jul (A), 25 Jul (B) and 3 Aug (C), and
one for `BOOKSTORE 99`. These are the steps of the interactive mockup `mockup.html`.

| #   | Action                                                                                                                  | Result                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1  | Tag B with `work`, remembered reach "this transaction", automatic off                                                   | Rule R1: text COFFEE SHOP 123, tags add work, reach {B}. Leaving the row changes nothing. A and C unchanged and not orange.                                                                                                                                        |
| E2  | Tag A with `home`                                                                                                       | Rule R2: same conditions, tags add home, reach {A}. R1 and R2 coexist; their sets are disjoint.                                                                                                                                                                    |
| E3  | On R1, widen reach to from 25 Jul                                                                                       | Governs B and C. C receives `work`. A stays with R2.                                                                                                                                                                                                               |
| E4  | Import a COFFEE SHOP 123 row dated 1 Jun                                                                                | Reached by neither rule. No tag.                                                                                                                                                                                                                                   |
| E5  | Import a COFFEE SHOP 123 row dated 10 Aug                                                                               | Reached by R1 on arrival; receives `work`.                                                                                                                                                                                                                         |
| E6  | On R1, widen reach to all                                                                                               | Allowed: an explicit-set rule and an all rule coexist. The 1 Jun row receives `work`. A keeps `home`, because R2 outranks R1 for A, and A is not orange.                                                                                                           |
| E7  | Remove `work` from C by hand                                                                                            | C is governed by R1 and differs: orange, with "Apply to this transaction".                                                                                                                                                                                         |
| E8  | Change A's tag from `home` to `food`                                                                                    | R2's output is updated in place. Still only A.                                                                                                                                                                                                                     |
| E9  | Clear A's tags entirely                                                                                                 | R2 is deleted. A one-row rule whose only row no longer carries the value has nothing left to govern. R1 now governs A, so A shows as divergent until reapplied or R1 is narrowed.                                                                                  |
| E10 | Tag the 1 Jun row with `food`, keep "Only this transaction", then delete that row                                       | Its one-row rule's set becomes empty, so the rule disappears: it is no longer listed anywhere and governs nothing.                                                                                                                                                 |
| E11 | Rename B to "Coffee", then open C                                                                                       | Rule R4: alias Coffee, reach {B}. C's inspector offers: "a rule renames this text; extend it to this transaction?"                                                                                                                                                 |
| E12 | Split tags out of a rule with reach from 25 Jul                                                                         | Both rules reach from 25 Jul. No row changes.                                                                                                                                                                                                                      |
| E13 | On the Automations page, create a rule by hand                                                                          | Default reach is all, as it is a deliberate rule. The count of rows that will change is shown before Save.                                                                                                                                                         |
| E14 | Set remembered reach to all and automatic on; tag the 1 Jun row with `food`, press Enter, then move to another row      | R5 is created for the 1 Jun row, and as the row changes it is widened to all: every COFFEE SHOP 123 row without `food` gains it in one write. Rows that already had it are untouched.                                                                              |
| E15 | With automatic on, change C's tag while R1 (all) governs C                                                              | A one-row exception is created; the card's default is "Update R1". As the row changes, R1's output is replaced and applied across its reach where values differ, and the exception is deleted. Choosing "Only this transaction" first keeps the exception instead. |
| E16 | With one-row exceptions on A and C, edit B's tags; the default is Update R1. Tick "Also replace 2 exceptions" and apply | R1 is updated across its reach, both exceptions are deleted in the same action and their rows take the new value. A rule restricted to one account keeps its rows and is named in the count line.                                                                  |

Two rules the examples rely on, stated once:

- **Clearing.** Clearing a value never creates a rule. If the row has a one-row rule for that field,
  clearing deletes it (E9). If a wider rule governs the row, clearing makes the row divergent (E7).
- **Offers.** A row shows "extend to this transaction" offers only for fields no rule governs on
  that row, grouped in one card, so one-row rules on a busy description text do not pile up.

## 6. What changes in the code, at a high level

- Schema: `reach` on the rule, as
  `{ kind: "all" } | { kind: "from"; date } | { kind: "transactions"; ids: map }`. Rules without a
  reach decode as `all`, so every existing rule keeps governing what it governs today.
- Domain: `ruleGoverns(rule, subject, transaction)` composed from the existing matcher and the reach
  test; precedence rank gains the reach dimension; uniqueness keys gain the reach kind and an
  explicit-set overlap check.
- Engine: import and bulk application consult reach. The description-text index is unchanged.
- Mutations: create from edit with a one-id reach; widen and narrow with the count shown first;
  id-set maintenance on transaction delete, import delete and duplicate merge; split and move carry
  reach.
- UI: the proposal flow becomes a live preview plus create-on-finish; the reach control replaces the
  scope radios and the blur checkbox; the Automations page groups by reach and renames Apply to
  Save.
- Removed: the four-mode remembered apply preference, the blur finalizer, the pending-proposal state
  in the grid controller.

## 7. Open questions

Resolved on 2026-10-25:

1. **One-row rules on the Automations page.** Listed, but in a collapsed group "Applied to specific
   transactions" with its count, so they are discoverable without drowning deliberate rules. Rules
   whose reach set has become empty appear in the same group marked "not applied anywhere".
2. **"Just this row" when a wider rule governs.** No new concept: every edit creates a one-row rule,
   which outranks the wider rule for that row. Folding into the wider rule is the explicit action,
   not the default. See 3.1.
3. **Date reach** is by calendar date, inclusive, matching PR #67.

Decisions this spec supersedes from PR #67 and the ownership contract: scope is now a stored
property of the rule, and a rule may store transaction ids as its reach set. Matching itself remains
a pure function of conditions. `specs/automation-rule-ownership.md` is hashed by a contract test and
is left as the historical record; this document is the current one.

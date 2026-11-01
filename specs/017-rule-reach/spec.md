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

Today the most specific conditions win per field. Reach is added as the most significant dimension
above conditions, and it behaves like a timeline:

1. A rule with an explicit transaction set beats every other rule, for the rows in its set.
2. A from-date rule beats an all rule on the rows it reaches, and among from-date rules the later
   date wins. Editing a rule "from this date" therefore creates a new version that takes over from
   that date onward while the earlier version keeps governing earlier rows.
3. Among rules of the same reach tier and date, conditions decide as today.
4. Ties remain broken by recency then id, and remain reachable only through concurrent creation.

### 2.2 Uniqueness

For each output field and conditions slot there may be: at most one all rule; at most one from-date
rule per date; and any number of explicit-set rules whose id sets are disjoint. Creating or widening
into an occupied position folds into the rule that holds it rather than colliding.

### 2.3 What the reach set is, and what it is not

The explicit set is a record of application, not a match condition. The rule still matches only by
conditions; a transaction id in the set whose transaction no longer matches the conditions (its
description was re-imported differently, say) is ignored and cleaned up on the next write to the
rule. The set is a Loro map of ids to `true`, so concurrent additions on two devices merge as a
union.

## 3. Behaviour

### 3.1 Editing a cell creates or updates a rule

When the user finishes editing a description alias, tags or allocation on a transaction, a one-row
rule is created at once with reach **these transactions = { this row }**, or the row's existing
one-row rule for that field is updated. The row already holds the value, so nothing else is written
on Enter.

**The new output is the edit applied to the rule that governed the row.** If a rule governed the
field on that row, the one-row rule is a copy of that rule's output for the edited field with the
edit applied: for tags, the tags the user removed are removed and the tags they added are added,
keeping the rule's add or set mode; for an alias or an allocation, the new value. Only the edited
field is copied, so later changes to the governing rule's other outputs still reach the row. If no
rule governed the field, the output is simply the row's new value. Clearing a value is an ordinary
edit: the result may be an exception that adds nothing or clears the alias.

**What happens next depends on the chosen reach**, pre-set from the remembered preference and
changeable on the card while still on the row:

| Choice                               | Result                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Only this transaction                | The one-row rule stays as it is. Nothing else changes.                                                                                                   |
| Matching transactions from this date | The one-row rule becomes a from-date rule at this transaction's date. It takes over from that date; the previously governing rule keeps earlier rows.    |
| All matching transactions            | If a rule governed the row, that rule itself is edited the same way and the one-row rule is folded away. Otherwise the one-row rule becomes an all rule. |

Applying a choice writes only rows whose values would change, and propagates the edit itself: rows
that gain the rule lose the tags the user removed and gain the ones they added.

**When it happens** is the remembered "Apply automatically when I leave the row" preference. Leaving
the row means the active row changing; entering the inspector is not leaving the row, so the card
can be adjusted first. With it off, the card keeps an Apply button and the one-row rule waits.

Changing the card's reach or the checkbox updates the remembered preference. The old four-mode
preference maps onto the two: "Updating all" is all plus automatic, "Updating new" is from-date plus
automatic, "Update all" and "Update new" are the same without automatic.

While the cell is still being edited, the inspector shows a live preview of what Enter and then
leaving the row will do.

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
one for `BOOKSTORE 99`. These are the steps of the interactive mockup `mockup.html`, which names the
rows in a mock-only Row column and ticks each step when the state shows it done.

| #   | Action                                                                                                               | Result                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Reach "this transaction only", automatic off. Tag B with `work`                                                      | Rule R1: tags add work, reach {B}. A and C unchanged and not orange.                                                                     |
| E2  | Tag A with `home`                                                                                                    | Rule R2: tags add home, reach {A}. R1 and R2 coexist.                                                                                    |
| E3  | On R1, change reach to from 25 Jul                                                                                   | Governs B and C. C receives `work`. A stays with R2.                                                                                     |
| E4  | Import a row dated 1 Jun                                                                                             | Reached by neither rule. No tag.                                                                                                         |
| E5  | Import a row dated 10 Aug                                                                                            | Reached by R1 on arrival; receives `work`.                                                                                               |
| E6  | On R1, change reach to all                                                                                           | The 1 Jun row receives `work`. A keeps `home`: R2 outranks R1 for A.                                                                     |
| E7  | Untick `work` on C                                                                                                   | A one-row rule for C: a copy of R1's tags without `work`. C is governed and agrees, so not orange. Nothing else changes.                 |
| E8  | Change A's tag from `home` to `food`                                                                                 | R2 is updated in place. Still only A.                                                                                                    |
| E9  | Untick everything on A                                                                                               | R2 becomes "add nothing". A stays empty and is not orange.                                                                               |
| E10 | Tag the 1 Jun row with `food`, keep "Only this transaction", then delete it                                          | Its one-row rule has no transaction left and is garbage collected.                                                                       |
| E11 | Rename B to "Coffee", then open C                                                                                    | C's inspector offers: "a rule renames this text; extend it to this transaction?"                                                         |
| E12 | On B, add the Coffee rule's alias to R1, then split it back out                                                      | Adding the alias renames every row R1 covers. Splitting it back out keeps both rules on the same reach and changes no row.               |
| E13 | On the Automations page, create a rule by hand                                                                       | Default reach is all. The count of rows that will change is shown before Save.                                                           |
| E14 | Reach "all matching", automatic on. Tag the 10 Aug row with `coffee`, leave the row                                  | R1 itself gains `coffee`; every row it governs gains it. A and C keep their own rules.                                                   |
| E15 | Reach "from this date", automatic on. Untick `work` on the 10 Aug row, leave the row, then import a row dated 20 Aug | A from-10-Aug version of R1 without `work` governs the 10 Aug row and later. The 20 Aug import gets `coffee` but not `work`. B keeps R1. |
| E16 | Reach "all matching", automatic off. Tag B with `home`, tick "Also replace 2 exceptions", Apply now                  | R1 gains `home` across its reach; the exceptions on A and C are deleted in the same action and their rows take R1's value.               |

Two rules the examples rely on, stated once:

- **Offers.** A row shows "extend to this transaction" offers only for fields no rule governs on
  that row, grouped in one card.
- **Garbage collection.** An explicit-set rule with no surviving transaction, or a one-row exception
  whose output equals the rule that would otherwise govern its row, has no possible effect and is
  deleted.

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

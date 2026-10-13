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

Today: at most one rule per output field per conditions slot. Now: at most one rule per output field
per conditions slot **per reach kind**, with an explicit-set rule additionally required not to share
any transaction id with another explicit-set rule for the same field and slot. Two rules may both be
"these transactions" on the same slot as long as their sets are disjoint.

### 2.3 What the reach set is, and what it is not

The explicit set is a record of application, not a match condition. The rule still matches only by
conditions; a transaction id in the set whose transaction no longer matches the conditions (its
description was re-imported differently, say) is ignored and cleaned up on the next write to the
rule. The set is a Loro map of ids to `true`, so concurrent additions on two devices merge as a
union.

## 3. Behaviour

### 3.1 Editing a cell creates or updates a rule

When the user finishes editing a description alias, tags or allocation on a transaction:

- If no rule governs that row for that field, a rule is created with the row's conditions
  (description text only, unless the user chose a restriction) and reach **these transactions = {
  this row }**. The row already holds the value, so nothing else is written.
- If a rule already governs the row for that field, that rule's output is updated, and the change is
  applied across its reach. The user is told how many rows will change before it happens, as today.

This replaces the proposal flow. There is no longer a pending offer: the rule exists as soon as the
edit is finished, with the narrowest possible reach. The remembered "apply automatically" preference
disappears with it; see 3.3.

Edits made while the row is still being edited show a live preview in the inspector of what will
happen: "Creates a rule for this transaction" or "Updates the Tags rule, 3 transactions change".

### 3.2 Widening and narrowing

The inspector's rule card and the Automations page editor show the rule's reach as a control with
the three kinds. Changing it is editing the rule:

- Widening to **from a date** or **all** applies the outputs to every newly governed row in one
  vault action, after showing the count.
- Narrowing back to **these transactions** keeps the currently governed rows as the explicit set and
  applies nothing. Rows keep their values; they are simply no longer governed.
- A row outside a rule's reach, when it matches the rule's conditions, shows an offer on its
  inspector card: "A rule for this text exists; extend it to this transaction?" Accepting adds the
  id to the set, or, if the rule is date-reached and the row is older, offers to widen to all.

### 3.3 Automatic application

With reach on the rule there is nothing to apply automatically on blur, Enter or cell exit.
Finishing an edit creates a one-row rule; widening is always an explicit choice on the rule. The
"apply on blur" checkbox and the four-mode remembered preference are removed. The remembered
preference keeps only the last restriction choices, for seeding conditions.

A user who wants a tag to apply to all future coffee rows widens the rule once; thereafter every
import within reach is governed on arrival, as today.

### 3.4 Divergence

A governed row whose value differs from the rule's output is divergent, shown in orange with "Apply
to this transaction", exactly as today. A row the rule does not reach is never orange. This is the
distinction between a deliberate exception and drift that PR #67 could not make.

### 3.5 Imports

On import, a row is governed by a rule only if the rule reaches it: "all" always; "from a date" if
the row's date qualifies; "these transactions" never, since the new row's id cannot be in the set.
Today every active rule applies to every matching import; that changes for date-reached rules, and
it is the intended fix for problem 4.

### 3.6 Deleting transactions, imports and rules

- Deleting a transaction removes its id from any explicit set. A rule whose set becomes empty is not
  deleted; it stays as a rule with an empty reach, listed on the Automations page as "not applied
  anywhere", and is a candidate for cleanup there.
- Deleting an import deletes its transactions, with the same effect.
- Merging duplicates moves the surviving id into any set the removed id was in.
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
one for `BOOKSTORE 99`.

| #   | Action                                                              | Result                                                                                                                     |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| E1  | Tag B with `work`                                                   | Rule R1: text COFFEE SHOP 123, tags add work, reach {B}. A and C unchanged and not orange.                                 |
| E2  | Tag A with `home`                                                   | Rule R2: same conditions, tags add home, reach {A}. R1 and R2 coexist; sets are disjoint.                                  |
| E3  | On R1's card, widen reach to all                                    | Refused: R2 holds the tags slot for A. The refusal names R2 and offers to open it.                                         |
| E4  | On R1's card, widen reach to from 25 Jul                            | Allowed: governs B and C. C receives `work`. A stays with R2.                                                              |
| E5  | Import a COFFEE SHOP 123 row dated 1 Jun                            | Not governed by R1 (before the date) nor R2 (explicit set). No tag.                                                        |
| E6  | Import a COFFEE SHOP 123 row dated 10 Aug                           | Governed by R1 on arrival; receives `work`.                                                                                |
| E7  | Remove `work` from C by hand                                        | C is governed by R1 and differs: orange, with "Apply to this transaction".                                                 |
| E8  | Remove `home` from A by hand                                        | Same for R2 on A. A was a one-row rule, so the orange marker says "You set this tag on 2 Jul; reapply or delete the rule?" |
| E9  | Delete transaction A                                                | R2's set becomes empty. R2 is listed as not applied anywhere.                                                              |
| E10 | Rename B to "Coffee"                                                | Rule R3: alias Coffee, reach {B}. Later, on C's inspector: "A rule renames this text; extend to this transaction?"         |
| E11 | Split tags out of a rule with reach from 25 Jul                     | Both rules reach from 25 Jul. No row changes.                                                                              |
| E12 | On the Automations page, create a rule by hand with no reach chosen | Default reach is all, as it is a deliberate rule. The count of rows that will change is shown before Save.                 |

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

1. Should a one-row rule created by an edit appear on the Automations page at all, or only once it
   has been widened? Section 4 proposes listing them collapsed; hiding them would make the page
   simpler but leaves orphan rules invisible.
2. When a user edits a row governed by a wide rule and the live preview says "3 transactions
   change", should there be a one-keystroke way to say "just this row" instead? That would mean
   narrowing the rule by excluding this id, which is a fourth reach shape, or creating a competing
   one-row rule, which 2.1 already allows. The latter needs no new concept.
3. Date reach is by calendar date, inclusive, matching the decision in PR #67. Confirm.

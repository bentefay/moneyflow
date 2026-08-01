# Automations Conformance Re-Verification

Frozen requirement source admitted on 2026-08-01 at the human principal's explicit instruction,
after the principal reported that adding a tag and changing the description on an imported
transaction surfaced no rule-creation controls.

`HS-007` and its packages `P17A`–`P17D` are already recorded `passed`. This source does not reopen
them. It adds an independent conformance re-verification of the automations behaviour against the
principal's own frozen wording in `specs/human-scratch.md:248-295`, and requires that any divergence
found is fixed.

This file is a frozen source. Once its SHA-256 is recorded in `SCOPE.json`, its text is immutable:
no edits, no checkbox markers. Completion is recorded only in the requirement/package ledgers after
implementation and independent review, exactly as `FS-001`.

## UR-009 — Automations match their frozen specification, re-verified end to end

The automations behaviour must be re-verified, clause by clause, against `specs/human-scratch.md`
lines 248 to 295, and every divergence must be fixed.

### The reported defect

Changing a field on a transaction that does not yet match any rule must offer to create one. The
principal added a tag and changed a description on an imported transaction and no controls appeared,
so no rule could be created or applied to the other transactions.

The rule-creation controls are distinct from the robot. The robot surfaces a rule that already
exists. The creation controls appear when a field is changed and no rule yet matches. Both surfaces
are required, for every rule field.

### Required behaviour

- Changing a field on a transaction that matches no existing rule surfaces the creation controls
  near the edited cell, without resizing the table and without occluding other content.
- The controls offer the four choices "updating all", "updating new", "update all" and "update new",
  a confirm button, an "only if $x" restriction and an "only this account" restriction, and explain
  in a tooltip that the "Updating" forms apply automatically when the row loses focus while the
  "Update" forms require the confirm button.
- The creation controls are offered for description aliases, for tags and for person percentage
  attribution alike.
- For tags, a further choice follows "only this account" offering "add tags" or "set tags", where
  "set tags" clears existing tags.
- For person percentage attribution the rule covers the whole set of percentage columns and its
  control spans those columns.
- The last used choices for the select and the restrictions are remembered in vault user
  preferences.
- Where a rule already matches, the robot appears, is red when the field has drifted from what the
  rule implies, opens the same editor the automations page uses, and offers "apply to this
  transaction" when drifted, plus "apply to all" and "apply to new imports".
- Changing a field that already has a matching rule offers the same choices but updates that rule
  rather than creating a second one.
- Rule precedence follows the frozen text: description text alone, superseded by description with
  amount, then description with account, then description with account and amount.
- Description alias rules do not apply to manually created transactions, which have no description
  text. Tag and person percentage rules do apply to them.

### Required evidence

The re-verification must state, for each clause of the frozen text, whether the shipped behaviour
conforms, and cite the code and the test that demonstrates it. A clause with no automated test
covering it is a gap to be closed, not a pass. Every fix carries a test that fails without it.

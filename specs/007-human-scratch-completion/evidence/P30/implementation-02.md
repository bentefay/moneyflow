# P30 / UR-009 — implementation evidence, revision 02

- **Package/revision:** P30 / 02
- **Requirement:** `UR-009` (frozen source `specs/011-automations-conformance/spec.md`, markerless)
- **Frozen contract audited:** `specs/human-scratch.md:248-295`
- **Implementer:** `p30-implementer-01`
- **Branch:** `main`
- **BASE:** `c8dc004` (revision 01's reviewed HEAD)
- **HEAD:** `1040bba`
- **Commits** (see the commit-boundary section below — `e97b3f7` is NOT P30-only):
    - `e97b3f7` — `fix: stop the rule proposal remounting the cell and auto-applying without a blur`
      — **also contains `p31-implementer-01`'s entire package**
    - `b94100b` — `test: assert the rule update writes, not just that it was decided`
    - `1040bba` — `fix: treat this row's portaled surfaces as still being in the row`
- **Range:** non-empty

Revision 01's clause-by-clause audit stands and is not repeated here; see `implementation-01.md`.
This file records only what changed in response to the review, and corrects the two evidence claims
the reviewer found false.

## Scratch integrity

`sha256sum specs/human-scratch.md` =
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`, unchanged. Never opened for
writing; no markers added.

## Findings addressed

### F-1 (BLOCKING) — the proposal remounted the cell it anchored to

**Accepted in full. The reviewer is right and my revision 01 fix was applied one level too low.**

`page.tsx` returned a bare `<div>` when a cell was not the pending edit and a
`<TransactionRuleProposal>` when it was. React reconciles by element type per position, so flipping
`pendingRuleEdit` unmounted and remounted the whole subtree including the edited cell. Because
`handleTransactionUpdate` sets the pending edit from inside the tag dropdown's own `onSave`, the
flip lands mid-edit and closed the picker — so a multi-select required reopening the dropdown for
every additional tag.

**Fix.** `renderRuleProposal` now mounts `TransactionRuleProposal` unconditionally and passes
`isPending` instead of branching, so exactly one element type occupies that position in every state.

**A second-order problem I introduced doing this, and how it is handled.** Mounting the component
for every rule-backed cell would have run five CRDT subscriptions per cell per row
(`useActiveFieldRules`, `useActiveAccounts`, `useActiveTags`, `useActivePeople`,
`useActiveDescriptionAliases`) — a real scale regression on a large table, and precisely the kind of
cost the existing robot wiring is careful to avoid by mounting only for matching rows. So the
component is split:

- `TransactionRuleProposal` — always mounted, renders only the stable anchor. No CRDT hooks.
- `PendingRuleProposal` — holds every hook and the popover content, and mounts only for the one cell
  with a pending edit. It is a **sibling** of the anchor, not an ancestor of the cell, so its own
  mount/unmount cannot touch the edited cell's DOM.

**Comments corrected.** `TransactionRuleProposal.tsx` and `TransactionRow.tsx` both asserted the
remount was already prevented. `TransactionRow.tsx`'s helper comment now states the narrower truth
that its own branch is fixed for a surface's lifetime and therefore cannot flip, and names the
renderer as the place the real property is discharged.

### F-2 (BLOCKING) — the "Updating…" modes fired without the row losing focus

**Accepted in full, and I agree with the reviewer's severity: this is the more serious of the two.**

The effect keyed on `isEditing` going false was correct in isolation; its input was not. A remounted
`InlineEditableTags` reports `isOpen === false` on first commit, so `isEditing` went `true → false`
with no blur at all — and under `updatingAll` the rule was created and `applyAll()` rewrote every
matching transaction before the user had seen the controls, chosen a scope, or had any chance to
dismiss. That is unauthorised mutation of data the user never touched.

**Fix.** Auto-apply now requires BOTH conditions, and the second is the frozen gesture itself: the
cell has finished editing AND focus has genuinely left the row.

**My first attempt at this was wrong, and I caught it by probing rather than reasoning.** I attached
a `focusout` listener to the enclosing `[data-testid="transaction-row"]` and tested containment with
`row.contains(relatedTarget)`. That is wrong in both directions, because **several of a row's own
controls are PORTALED to `document.body`** — the tag dropdown in `InlineEditableTags` and this very
popover both are. By DOM containment they sit outside the row, so focus moving into the tag picker
would have counted as the row losing focus and fired an "Updating…" apply **with the picker still
open** — the original defect wearing a different hat.

I found this by opening `InlineEditableTags` to check where its dropdown actually lives and whether
it takes focus, instead of assuming my containment test was sound. That is precisely the step I
skipped in revision 01, and it is the same root cause as both false comments.

The shipped version listens for `focusin` on the **document** and treats focus as still in the row
when the target is inside the row element OR inside any surface marked `data-owned-by-row`. Both
portaled surfaces now carry that marker, so the attribute describes something real rather than being
an assumption written into a comment.

Fixing F-1 also removes the spurious `isEditing` transition, so the two fixes are independent rather
than one masking the other.

**The description path is not regressed:** `InlineEditableDescriptionAlias` blurs on Enter, so its
sequence remains a genuine blur and it now additionally satisfies the row-focus condition.

### F-6 (non-blocking, closed) — journey 5 never executed the update write

Accepted. `data-kind="update"` proved the component _decided_ to update; nothing proved it _did_.
The update branch in `use-field-rule-proposal.ts` was executed by no test, so a duplicate-rule bug
would have passed — and clause `:287-289` is the one clause whose entire content is which write
happens.

Journey 5 now presses confirm and asserts the outcome: the other matching row gains "Dining", and
the automations page still lists exactly **one** rule. The rule-count assertion is the one that
would actually catch a duplicate; the robot count would not, since a second rule for the same
description text still yields one robot per row.

### F-3, F-4, F-5

- **F-3** — no change required; the reviewer accepted the structural argument and measured it
  anyway.
- **F-4** — the `role="presentation"` fix was confirmed correct and complete. I left the recorded
  caveat (`tabindex="-1"` on a presentational node) alone deliberately: it is not a defect, and
  changing it in a revision that already carries two real fixes would be unpinned churn.
- **F-5** — both evidence corrections are adopted above. Revision 01's defect #1 narrative and
  clause 8's "GAP → closed" were the two false claims; clause 8 is only now earned, by the tests
  below.

## Tests that fail without each fix

`tests/unit/components/rule-proposal-stability.test.tsx` — 8 cases, pinning both defects at the
level they actually broke.

F-1:

- the cell stays mounted (mount count 1) and is the **same DOM node** across the pending flip;
- in-progress input text **survives** the flip, which a remount would discard;
- **a control case reproducing the revision 01 two-element-type shape asserts it DOES remount**
  (count 2, different node). Without this control the passing assertions would be satisfied by any
  structure at all, including one that never re-renders — the control is what makes them
  discriminating.

F-2:

- no write when the cell merely stops editing (**exactly the revision 01 sequence**);
- no write when focus moves to a sibling cell **in the same row**;
- **no write when focus moves into a PORTALED surface the row owns** — the case a row-scoped
  containment check gets wrong;
- exactly one write once focus genuinely leaves the row;
- no auto-write under a manual `Update…` mode even on a real blur.

`tests/e2e/rule-creation-controls.spec.ts` — two new journeys plus the F-6 closure:

- the tag dropdown is **still open** after selecting a tag while the proposal appears, and a second
  tag can be selected without reopening it (fails without the F-1 fix);
- an `Updating all` journey asserting the other matching row is **untouched** while the proposal is
  open, then updated once focus leaves the row (fails without the F-2 fix, in the direction that
  matters — the pre-fix code writes early);
- journey 5 confirms the update and asserts one rule, not two.

## Why revision 01's blindness audit missed both

Recording this because the reviewer's generalisation is more useful than the fixes.

My audit asked _"would this assertion still pass if the creation surface were absent?"_ Both defects
survive that question, because **both are defects within a present creation surface**. Every journey
selected "Update all" — one of the two _manual_ modes — and the default `updateNew` is also manual,
so no test in the repository ever drove an automatic mode through the inline proposal.

The sharper statement: absence-of-surface is one axis. A suite can cover every surface and still
never exercise a **mode within** one. My fixtures varied over "does the feature exist" but not over
"which of the four modes is selected", and the two I never selected are exactly the two that write
without being asked.

There is a second lesson I want recorded against myself. Revision 01's evidence asserted "the wiring
is exercised by the E2E flows" for clause 8. That sentence was false, and I wrote it without
checking — the same failure as the comments in F-1. **Both of my false claims were about wiring I
had reasoned about rather than measured**, and in both cases the reasoning was locally correct and
globally wrong.

## Gate results

| Gate                | Result                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS, clean                                                                                                                                 |
| `pnpm lint`         | PASS, 0 errors. 1 warning, `react-hooks/incompatible-library` (`useVirtualizer`) — pre-existing at BASE in code this package does not touch |
| `pnpm format:check` | `oxfmt --check src tests` → all clean. The reported `specs/**` files are pre-existing root-owned markdown, outside my write scope           |
| `pnpm test`         | PASS — 126 files, 2441 passed, 2 skipped. **Not a clean signal for P30 alone** — see the shared-checkout note below                         |
| `pnpm test:e2e`     | Pending the port; campaign restarts from run 1 against the new tree per the review's requirement 4                                          |

## The commit boundary is not clean, and the gate counts are not P30-only

Recorded up front because it changes how this evidence should be read.

`e97b3f7` contains `p31-implementer-01`'s entire UR-010/UR-011 package as well as my rev 02 fixes —
14 files, +2120/-512, where my scope was three fixes in three files. Nothing was lost and the tree
is clean, but two packages are fused in one commit.

**Cause, stated plainly:** I ran `git add -A src tests && git commit -- src tests`. Both halves
stage by PATH, and two agents editing the same directories are not separated by path. The dispatch
instruction asked for an explicit `-- src tests` pathspec, which cannot isolate a package in a
shared checkout; but I read that instruction, and running `git add -A` on a tree I knew another
agent was working in was mine to avoid. The correct form is to list the exact files authored. My two
later commits (`b94100b`, `1040bba`) used the same command and came out clean only because P31
happened to have nothing uncommitted at those moments — luck, not method.

**Ownership, measured rather than assumed:**

- **Mine, entirely:** `TransactionRow.tsx`, `TransactionRuleProposal.tsx`, `InlineEditableTags.tsx`,
  `rule-creation-controls.spec.ts`, `rule-proposal-stability.test.tsx`.
- **P31's, entirely:** `table-selection.ts`, `useTableSelection.ts`,
  `select-all-beyond-page.test.tsx`, `selection-invariants.test.ts`, `selection.test.ts`,
  `TransactionTable.tsx`, `index.ts`, `add-transaction-focus.test.tsx`, and `transactions.spec.ts`
  (its `T021d`–`T021g` journeys — `grep -cE '^\+.*T021[d-g]'` returns 4).
- **Genuinely shared:** `page.tsx`, attributed by HUNK below rather than by keyword.

**How `page.tsx` splits, and why not by keyword.** My first attempt counted added lines matching
selection terms against rule terms. That method is unsound here: of 143 added lines, **107 match
neither list** — renamed callbacks, dependency-array entries, JSX props, blank lines, comment prose.
A ratio drawn from the matching quarter measures the word list, not the code, which is why two
independently chosen lists produced two different ratios. Same shape as grepping the old tree for a
symbol that had since been renamed and reading the absence as evidence.

Hunk-level attribution is unambiguous. 13 hunks; exactly two are P30's:

| Hunk                   | Added lines | Owner                                         |
| ---------------------- | ----------- | --------------------------------------------- |
| `@@ -613,6 +644,15 @@` | 9           | **P30** — the one-stable-element-type comment |
| `@@ -621,6 +661,11 @@` | 5           | **P30** — the `isPending` prop                |
| the other 11 hunks     | 129         | P31 — selection                               |

So P30's footprint in `page.tsx` is **14 added lines in two adjacent hunks, both inside
`renderRuleProposal`**. Verified by printing the hunk contents, not by pattern-matching. A reviewer
can scope to that range; a ratio would let them locate nothing.

**Consequence for the gates above:** `pnpm test` runs the whole suite in a shared checkout, so its
126 files / 2441 passed includes P31's selection suites. It is evidence that nothing is broken; it
is NOT a clean per-package count for P30. The same applies to any campaign digest taken over this
commit.

**A P30-scoped unit signal, for a reviewer who needs one that spans only this package.** Running
just the automation/rule suites — the rule-proposal stability regressions, the proposal state, both
editor model/data suites, both robot-state suites, and the whole `tests/unit/domain/automation`
directory:

```
Test Files  11 passed (11)
     Tests  181 passed (181)
```

None of those files is touched by P31, so 181 is a clean signal for P30 where 2441 is not.

## Secret-safety

No vault master key, invite-fragment secret, `crypto_box` material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` or vault plaintext appears in any code, test, fixture or this file. All E2E
fixtures remain synthetic inline CSV buffers. The principal's real financial data was never read or
referenced.

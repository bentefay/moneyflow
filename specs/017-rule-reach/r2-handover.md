# Rule reach R2: handover

You are implementing the user-facing half of rule reach in MoneyFlow. The domain groundwork (R1) and
everything before it are already on `main`. This document is your brief; it supersedes the R2
section of `plan.md` wherever they disagree.

## 1. Set up

1. Create a fresh branch from `origin/main`, for example `feat/rule-reach-r2`. Never work on
   `feat/transaction-editing-and-automation-rules`; it is merged.
2. Bring the latest spec, mockup and this handover onto your branch:
   `git cherry-pick origin/main..origin/feat/transaction-editing-and-automation-rules`. That range
   is exactly two docs commits. Both touch only `specs/017-rule-reach/`.
3. Fresh worktrees have no `node_modules` or `.env.local`. Run every command inside
   `nix develop --command sh -c '<cmd>'` (the plain `bun` on PATH is older and corrupts `bun.lock`),
   run `bun install --frozen-lockfile`, and copy `.env.local` from `/home/ben/Code/moneyflow`.
4. Tooling is the `run` CLI: `run tsc`, `run lint`, `run format`, `run format --check`,
   `run test unit`, `run test cli`, `run test e2e`, and `run check` for all of them. Use a private
   E2E port, `MONEYFLOW_E2E_PORT=3108`; port 3000 belongs to the user's dev server. Never pass
   `--headed`, `--ui` or `--debug`.
5. `next dev` rewrites `AGENTS.md` and `next-env.d.ts` during E2E. Before every commit run
   `run format` and `git checkout AGENTS.md next-env.d.ts`.
6. Other checkouts share this machine's CPU and Supabase stack. If `uptime` shows load above about
   8, wait instead of raising timeouts. Never stop the Supabase stack.
7. Read `.claude/CLAUDE.md` and `.claude/rules/*.md`. Key rules: no `as`, `any` or `!`; branded
   types; `assertNever` for exhaustiveness; Result types for expected failures; draft-style CRDT
   mutation; tests are not optional; no parentheses in commit messages; fix every failure you meet,
   including ones you did not cause.

## 2. What to read, in order

1. `specs/017-rule-reach/spec.md`: the behaviour. Sections 2.1, 2.2, 3.1 to 3.7 and the worked
   examples E1 to E16 are the contract.
2. `specs/017-rule-reach/mockup.html`: open it in a browser and walk E1 to E16; each step ticks
   itself. Its engine is the reference implementation of the semantics. When the spec is silent,
   copy the mockup. The functions that matter: `rank`, `governs`, `winner`, `collision`,
   `governingWide`, `transformOutput`, `planEdit`, `defaultActionFor`, `rowsChangedBy`, `applyEdit`,
   `runAction`, `leaveRow`, `gcRules`, `coveredExceptions`, `dropCoveredExceptions`.
3. `specs/017-rule-reach/plan.md`: background only. Its "Decisions taken" items 2 and 4 are out of
   date: the default target is decided by the chosen reach (table below), not by "update the
   governing rule", and uniqueness is per date, not per group.

## 3. The model in one table

On Enter, the row always gets a one-row rule (or its existing one-row rule is updated). Its output
is the rule that governed the field on that row with the edit applied: tags the user removed come
off, tags they added go on, add or set mode is kept; alias and allocation take the new value. With
no governing rule, the output is the row's new value. Only the edited field is copied. Clearing is
an ordinary edit, except that clearing a field no rule governs creates nothing.

What happens next is the chosen reach, pre-set from the remembered preference:

| Choice                | Result                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Only this transaction | The one-row rule stays. Nothing else changes.                                                                                                       |
| From this date        | The one-row rule becomes a from-date rule at the row's date; earlier rows keep the old rule. An existing from rule on that date absorbs it instead. |
| All matching          | The governing wide rule is edited the same way and the one-row rule is folded away; with none, the one-row rule becomes an all rule.                |

It runs when the active row changes if "Apply automatically when I leave the row" is on (entering
the inspector is not leaving), otherwise when the user presses Apply on the card. It writes only
rows whose values would change, and propagates the edit: rows that gain the rule also lose the
removed tags. Both the reach and the checkbox are remembered per user.

## 4. What exists on main, and what to build

Existing, reuse rather than rewrite:

| Need                         | Already on main                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reach on rules, wire, decode | `rules.ts`: `RuleReach`, `ruleReaches`, `ruleGoverns`, `ruleReachesEqual`; `schema.ts` reach columns                                                                   |
| Fast lookup                  | `rule-index.ts`: `buildRuleIndex`, `candidateRulesFor`; `useActiveFieldRuleIndex` in `context.tsx`                                                                     |
| Counting changed rows        | `population.ts`: `countRulePopulation` with a reach override; `use-rule-population-count.ts`                                                                           |
| Mutations                    | `field-rule-mutations.ts`: `createFieldRuleFromEdit`, `setFieldRuleReach`, `extendFieldRuleReachToTransaction`, `foldFieldRuleIntoHost`, split and move carrying reach |
| Deletion maintenance         | `field-rule-reach-maintenance.ts`: `removeTransactionsFromRuleReach`, called from `description-aliases.ts`                                                             |
| Leave-row trigger            | `useTransactionGridController.ts`: `registerAutomationFinalizer`, `finalizeAutomationOwnerExit`                                                                        |
| Remembered preferences       | `preferences.ts` and `apply-mode.ts`: `lastApplyMode`, `applyModeFrom`, `rememberedScope`, `rememberedApplyOnBlur`                                                     |
| Editor parts                 | `RuleEditor.tsx`: `pendingField`, `lockOtherOutputs`, `pendingStoredSummary`, `splitPreview`, divergence badges                                                        |
| Apply to one row             | `useApplyFieldRulesToTransaction` with a known location                                                                                                                |

### Phase R2a: domain and CRDT

1. **Precedence as a timeline.** `ruleReachRank` in `rules.ts` returns 1 for explicit sets and 0 for
   everything else. Make it: explicit set, then from-date with later dates higher, then all; then
   conditions; then the existing recency and id tie-break. Update `compareRulePrecedence` and
   everything that compares rules.
2. **Uniqueness by date.** Per field and conditions slot: one all rule, one from rule per date,
   explicit-set rules with disjoint sets. A create or widen into an occupied position folds into the
   holder.
3. **Narrowing captures only won rows.** Narrowing to an explicit set must capture only rows this
   rule wins, so sets never overlap another explicit rule's set. R1 captures every governed row and
   can refuse.
4. **Copy-with-edit.** A pure `transformRuleOutput(field, baseOutput, edit)` in the domain, with
   `edit = { value, added, removed }`. `createFieldRuleFromEdit` takes the governing rule's output
   and the edit, not a final value.
5. **Propagating removals.** Bulk application under a widened or edited rule takes the edit and
   removes the removed tags from rows that gain the rule. Rows are written only when their value
   would change. Extend `applyFieldRulesToTransaction` or add a sibling; keep one CRDT transaction
   per action.
6. **The "all" path.** A mutation that edits the governing wide rule with the transformed output,
   applies it across that rule's reach where it wins, and soft-deletes the one-row rule, all in one
   action. `foldFieldRuleIntoHost` is close; it currently copies the one-row rule's output.
7. **Exception replacement.** An optional `replaceExceptions` flag on the widen and edit mutations
   that soft-deletes one-row rules on the same text and field whose rows the result covers. Never
   touch rules with narrower conditions.
8. **Garbage collection.** `readActiveFieldRules` hides explicit-set rules with no surviving
   transaction and one-row rules whose output equals the rule that would otherwise govern every row
   in their set. Add physical removal to the vault maintenance pass. Wide rules are never collected.
9. **Remembered preferences.** Add `lastReach` and `applyOnLeaveRow` to the preference record,
   seeded once from `lastApplyMode`: updatingAll is all plus automatic, updatingNew is from plus
   automatic, updateAll is all, updateNew is from.
10. **Layering.** `rules.ts` imports the `TransactionId` brand from
    `src/components/features/transactions/table-model/ids`. Move the brand into the domain and
    re-export it from the old path.

Tests: table-driven unit tests and fast-check properties for rank, uniqueness, transform and garbage
collection; integration tests for every mutation change, each refusal leaving the document
unchanged; one integration test per worked example E1 to E16 that drives the mutations exactly as
the mockup walk does. Keep `tests/integration/rule-engine-performance.test.ts` passing and add a
ceiling for the leave-row apply.

### Phase R2b: UI

1. **Pending state per rule.** The grid controller holds one `automationProposalAtom`. Replace it
   with pending entries keyed by one-row rule id, each holding the row, the chosen reach and the
   edit. The leave-row finalizer runs the chosen action for the row being left. Delete the old
   proposal flow, `use-field-rule-proposal.ts` and the extension-ladder callers, once nothing uses
   them.
2. **Inspector card.** For a pending one-row rule, a panel with three radios: only this transaction,
   from this date with a count and "keeps earlier rows" when another rule governs, all matching with
   a count or "Edit R1" when a rule governs. Add the "Also replace N exceptions" checkbox when it
   applies, the remembered "Apply automatically when I leave the row" checkbox, and Apply now.
   Without a pending entry, the card shows the reach control with Save, Cancel and Delete rule.
3. **Live preview** while a cell is being edited: what Enter and then leaving the row will do.
4. **Automations page.** The editor shows the reach control in place of the scope radios, and Save
   applies after showing the count. The list is grouped by reach: everything, from a date, and
   specific transactions, the last one collapsed and counted. Default reach for a hand-made rule is
   all.
5. **Removals.** The "Apply on blur" checkbox and the scope radios go.
6. **Toolbar.** The orange divergence dot stays.

Tests: unit tests for the panel, the reach control and the grouped list; E2E journeys covering E1 to
E16 as `test.step`s on the existing specs `automations.spec.ts`, `rule-creation-controls.spec.ts`,
`transaction-rules.spec.ts` and `field-rule-parity.spec.ts`, rewritten for the new flow.

### Phase R3: docs

Update `specs/fusion-mission-recovery/behaviour.md` sections 3 to 6, `domain-model.html` (reach on
the rule entity and the timeline in the precedence figure) and `plan.md`'s status.

## 5. How to work

- Commit each phase when `run check` with the private E2E port is green. If you must stop early,
  commit a `wip:` with a factual body first.
- After each phase, have an independent reviewer check the diff against the spec and the mockup
  before starting the next. The R1 code was never reviewed; R2a's review covers it.
- Ask the user only for genuine product decisions the spec and mockup do not settle. Record each
  decision in the spec.
- Open one PR for the branch when R3 is done, describing the behaviour change in user terms, and
  report the gate results.

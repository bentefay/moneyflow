# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Review dispatch (P17C / 01 — description inline workflow: contextual popup + robot drift)

- **Package / revision:** P17C / 01 (HS-007 — description inline workflow) — **REVIEW**
- **Role:** human_scratch_reviewer, fresh instance `p17c-reviewer-01`, DISTINCT from the
  implementer. You are read-only on product code: you MUST NOT edit any product/test/spec/ledger
  file. You re-run gates, judge against frozen text, and return a verdict by SendMessage to `main`.
  You never commit, integrate, or advance any ledger.
- **CRITICAL — git discipline:** working tree is at the integrated HEAD on branch `main`. Do NOT
  `git checkout`/`switch`/`reset` or create/switch branches. Read with `git diff 0d3de91..ce82cb5`
  and `git show`; run gates in place.
- **Review range (product):** `0d3de91..ce82cb5` (single feat commit `ce82cb5`). Ignore docs-only
  control commits. Judge against the FROZEN TEXT and the actual diff, not the evidence's
  self-claims.
- **Scope ID:** HS-007 (P17C slice). Frozen text: `specs/human-scratch.md:248-295`, P17C behavior at
  ~`:279-295` (robot icon per transaction row; NORMAL vs RED drift; popup reuses the exact same UI
  as the automations page; popup has apply-to-all + apply-to-new-imports; in a transaction context
  apply-to-new-imports = newer than that transaction; changing a description alias on a transaction
  with a matching rule offers the same 4-mode select + checkboxes and UPDATES the rule, not
  creates). Task detail: `tasks/HS-007-automation-redesign.md` P17C section.
- **Implementer evidence (read, do not trust blindly):** `evidence/P17C/implementation-01.md`
  (Q-P17C-01..06).

## Verify each against the diff + frozen text

1. **Same shared `FieldRuleEditor` reused, not forked** — the popup mounts the P17B editor unchanged
   (`descriptionEditable=false`); `FieldRuleEditor.tsx` itself must be byte-empty in the diff.
   Confirm the `FieldRulesManager.tsx` refactor (extraction into `rule-editor-data.ts`) preserves
   behavior and did not fork the editor or weaken any P17B guarantee.
2. **Robot state** computed by REUSED P17A matchers (`selectWinningRule`/`ruleMatchesSubject`/
   `ruleScopeRank`/`isNewerTransactionDate`): NORMAL only when the current value matches the highest
   matching rule; RED when a matching rule's implied alias differs (drift); HIDDEN while the row is
   actively edited. Confirm the `RuleMatchSubject` projection is faithful (no reimplemented
   precedence).
3. **Popup behavior** — MUST NOT resize the table, occlude content, or steal editing focus; honors
   the remembered checkboxes/field-mode P17B persists; supports view/edit/delete/apply-to-this.
   Verify via the E2E specs and by reading the popover implementation.
4. **Inline alias-edit → UPDATE** the matching rule (P17B `useFieldRuleActions().update`), NOT
   create.
5. **Apply routing** — apply-all/apply-new via `useApplyFieldRules`; apply-to-new-imports in a
   transaction context scoped to THAT row's date; apply-to-this via the new
   `applyFieldRulesToSingleTransaction`, which must delegate wholesale to P17A
   `applyFieldRulesToTransaction` with allocations P16C-only and aliases P11-only — NO direct
   allocation/transaction/alias write, NO bespoke re-application.

## Hard boundaries — MUST be byte-EMPTY in the diff (breach = BLOCKING)

`src/lib/domain/settlement.ts`; `src/lib/crdt/mutations.ts` (P16C); P17A engine (`field-rules.ts`,
`import-commit.ts`, `domain/automation/{rules,apply,migration}.ts`); P17B `field-rule-mutations.ts`;
`src/lib/crdt/schema.ts` and `defaults.ts`; `FieldRuleEditor.tsx` (reused unchanged); both frozen
specs; realtime; `supabase/migrations/**`; all ledger/control files. Independently confirm the
frozen blobs are byte-identical to BASE: settlement `010f3c93582a2ce311594d4dde8464760ca49c43`; P16C
`mutations.ts` `118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`; P17A `field-rules.ts`
`4656c3c55515267d9050b718d0556a0fbfee7ed2`; P17B `field-rule-mutations.ts`
`1b63b3c996bb1b894eccde7a8858c198faf1785c`; `schema.ts` `cab73f73f4010d15392ae3ff18e4331b795a7c6d`.

## Type-safety / convention (any violation in P17C-authored code is BLOCKING)

- No `as`/`any`/non-null `!` in P17C-authored product code. Pre-existing casts elsewhere
  (`context.tsx:818`, `AutomationRow.tsx`) are legacy, out of scope — do not flag.
- ts-pattern is NOT a dependency (`switch` + `assertNever`). Money is integer minor units.
- **Apply-mode SELECT persistence is deliberately NOT delivered here** — it needs a `schema.ts`
  `applyMode` slot, tracked as Q-P17B-03, owned by P17D. P17C honoring only the persisted
  checkboxes/field-mode is CORRECT, not a gap; do not raise it as a P17C defect.

## Re-run EVERY gate yourself (report REAL counts)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Local Supabase
container required for integration/E2E; never Playwright `--headed/--ui/--debug/show`. Pre-existing
`specs/**` format:check failures and the 10 pre-existing lint warnings (incl.
`TransactionTable.tsx:360` useVirtualizer skip on a pre-existing line) are NOT P17C's fault; confirm
P17C introduced NO new lint warning (the stray `locationOf` must now be used by a real test). The
implementer flagged a timing-sensitive perf flake in `import/duplicates.test.ts` under full-suite
load that passes on a clean re-run — confirm it is pre-existing and unrelated to P17C, not a masked
P17C regression.

## Tests — judge honesty and coverage

Confirm new tests genuinely exercise: highest-matching-rule + normal/red/hidden robot over
overlapping rules and drift; single-transaction apply routing through P17A + P16C only (invalid
complete-set → zero mutation); inline alias-edit → UPDATE; apply-new scoped to the row date; and E2E
popup journeys (open from normal/red robot, view/edit/delete/apply-this/all/new, popup does not
resize/occlude/steal focus, remembered checkboxes honored, create-vs-update, keyboard/focus/a11y). A
test asserting nothing meaningful, or loosened to pass, is a finding.

## Secret-safety (blocking)

Scan the diff: no vault master key, invite-fragment bearer secret, `crypto_box` secret, seed phrase,
recovery material, `SUPABASE_JWT_SECRET`, or vault plaintext. Synthetic/public vectors only. Any
leak is BLOCKING — report to root immediately.

## Return

SendMessage to `main` with a single explicit **VERDICT: PASS** or **VERDICT: FAIL**, your real gate
counts, and — if FAIL — each blocking finding as `file:line` + why it violates frozen text or a hard
rule, ranked. If PASS, state boundaries byte-empty, frozen blobs intact, apply routes through P17A +
P16C-only, robot/drift faithful to the reused matchers, popup non-intrusive, create-vs-update
correct, no new `as`/`any`/`!`/lint-warnings, no secrets, tests honest. Root re-checks your verdict
against git before integrating.

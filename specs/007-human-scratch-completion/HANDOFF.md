# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implement dispatch (P17C / 01 — description inline workflow: contextual popup + robot drift)

- **Package / revision:** P17C / 01 (HS-007 — description inline workflow) — **IMPLEMENT**
- **Role:** human_scratch_implementer, fresh instance `p17c-implementer-01`. You write only
  authorized product/test code and your evidence file; you never commit the evidence, never edit any
  ledger/SCOPE/QUESTIONS/RISKS/HANDOFF/scratch/canonical source, and never dispatch anyone.
- **CRITICAL — git discipline:** the working tree is at the integrated HEAD on branch `main`. Do NOT
  `git checkout`, `git switch`, `git reset`, or create/switch branches. Commit directly on top of
  the CURRENT `HEAD` (`0d3de91`). Never check out any older commit.
- **Scope ID:** HS-007 (P17C slice). Frozen text: `specs/human-scratch.md:248-295` — read the WHOLE
  block; the P17C-specific behavior is at ~`:279-295` (robot icon on transaction rows; normal vs RED
  drift; popup reuses the exact same UI as the automations page; popup has apply-to-all and
  apply-to-new-imports; in a transaction context apply-to-new-imports means newer than that
  transaction; changing a description alias on a transaction with a matching rule offers the same
  4-mode select + checkboxes and UPDATES the rule rather than creating one). Task detail:
  `tasks/HS-007-automation-redesign.md` **P17C — Description inline workflow** section.
- **Your evidence file (write, do NOT commit):** `evidence/P17C/implementation-01.md`.

## What P17C must deliver

1. **Reuse the SAME shared `FieldRuleEditor`** (from P17B,
   `src/components/features/automations/FieldRuleEditor.tsx`) in a per-row CONTEXTUAL POPUP — do NOT
   fork or copy it. Mount it via its existing surface-agnostic seams (`descriptionEditable`,
   `onApply*`, `onSave`, `onDelete`, `idPrefix`). The popup shows the 4-mode selector, tick action,
   and account/amount constraints close to the user's mouse (unfocused popup, or hovering to the
   right/below). It MUST NOT resize the table, occlude content, or steal editing focus, and MUST
   honor the remembered last choices already persisted by P17B (`useUserAutomationChoice` —
   checkboxes + field/tag-mode). It supports view / edit / delete / **apply-to-this-transaction**
   with the correct boundary.
2. **Robot icon state on each transaction row** (in the description-alias cell /
   `TransactionRow.tsx` / `cells/InlineEditableDescriptionAlias.tsx`): compute the
   highest-precedence matching rule for the transaction by REUSING the P17A matcher primitives —
   `selectWinningRule` / `ruleMatchesSubject` / `ruleScopeRank` / `isNewerTransactionDate` /
   `RuleMatchSubject` from `src/lib/domain/automation/rules.ts` and `readActiveFieldRules` /
   `useActiveFieldRules`. Show a NORMAL robot only when the current value matches the highest
   matching rule; a RED robot when a rule matches but the transaction's alias differs from what the
   rule implies (drift). HIDE the robot while the row is actively being edited. Clicking the robot
   opens the popup (the RED case also offers "apply to this transaction").
3. **Inline alias-edit → UPDATE the rule:** when a description alias is changed on a transaction
   that has a matching rule, offer the same 4-mode select + checkboxes; if applied, call P17B's
   UPDATE mutation (`useFieldRuleActions().update`) to update the existing rule — NOT create a new
   one.
4. **Apply actions route ONLY through the P17A engine.** apply-to-all and apply-to-new-imports reuse
   P17B's `useApplyFieldRules` (`applyFieldRulesToAllTransactions` /
   `applyFieldRulesToNewerTransactions`); in a transaction context, apply-to-new-imports means newer
   than THAT transaction's date (pass the row's date as the reference). apply-to-this-transaction is
   a NEW thin additive vault action (a NEW file under `src/lib/crdt/**` + additive `context.tsx`
   hook + `index.ts` re-export) that applies the winning rule to the single transaction by REUSING
   P17A's `applyFieldRulesToTransaction` and, for any allocation write, the P16C
   `replaceTransactionAllocations` API ONLY — never a direct allocation-map/transaction/alias write,
   never a bespoke re-application.

## Allowed write paths (anything else → raise a Q-proposal; do NOT silently write)

- `src/components/features/transactions/**` (row, cells incl. `InlineEditableDescriptionAlias.tsx`,
  `TransactionRow.tsx`, `TransactionTable.tsx`, hooks — wire the robot + popup)
- `src/components/features/automations/**` (a NEW popup wrapper that mounts the existing
  `FieldRuleEditor`; do NOT rewrite the editor's internals — additive props only if genuinely
  needed)
- `src/app/(app)/transactions/page.tsx` (only if wiring genuinely requires it)
- `src/components/ui/**` ONLY if a shadcn primitive (e.g. popover) must be added — prefer reusing
  existing primitives; note any addition in evidence.
- `src/lib/crdt/**` — ADDITIVE only: a NEW file for the single-transaction-apply vault action, plus
  additive `context.tsx` hooks and `index.ts` re-exports. You MUST NOT modify `field-rules.ts`,
  `field-rule-mutations.ts`, `import-commit.ts`, `mutations.ts`, `schema.ts`, or `defaults.ts`.
- `src/hooks/**` (UI state only, if needed)
- `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`
- **Lint cleanup (required):** clear the tree's lint warnings per CLAUDE.md — in particular the
  stray unused `locationOf` helper at `tests/integration/field-rule-mutations.test.ts:24` (a P17B
  leftover). Prefer COMPLETING the intended apply-new date-boundary integration test it implies; if
  that is not cleanly feasible, remove the dead helper. Either way the tree must have no new lint
  warnings.
- `evidence/P17C/implementation-01.md` (write, never commit)

## Hard boundaries — MUST be byte-EMPTY in your diff (a breach is a self-finding to report)

- `src/lib/domain/settlement.ts` and all settlement/remainder logic; `src/lib/crdt/mutations.ts`
  P16C `replaceTransactionAllocations`; the P17A engine (`src/lib/crdt/field-rules.ts`,
  `import-commit.ts`, `src/lib/domain/automation/{rules,apply,migration}.ts`); P17B's
  `src/lib/crdt/field-rule-mutations.ts`; `src/lib/crdt/schema.ts` and `defaults.ts`. CALL these,
  never edit them.
- `specs/008-.../spec.md` and `specs/human-scratch.md` (never edit). The three realtime files,
  `supabase/migrations/**`, any `vault_ops`. Every ledger/control file.
- **Do NOT persist the apply-mode SELECT choice.** That requires an `applyMode` slot in the P17A
  `userAutomationPreferences` schema (`schema.ts`), which is a boundary here — it is tracked as
  **Q-P17B-03**, default-owned by **P17D**. P17C honors the ALREADY-persisted checkboxes/field-mode
  and defaults the apply-mode select per session. Do not touch `schema.ts` to add it.
- P17D's tag/allocation-parity + bulk/large-import polish is NOT this package.

## Rules / questions

- **Do NOT invent final wording or architecture** where the frozen text leaves it open (popup exact
  placement/anchoring, robot glyph, drift-explainer copy, apply-this confirmation). Pick the SAFEST
  REVERSIBLE default, implement it, and record a complete Q-proposal (with the default chosen) in
  your evidence file — do not pause.
- No `as`/`any`/`!`; ts-pattern is NOT a repo dependency — use `switch` + `assertNever`. Money is
  integer minor units. Favour pure functions + immutable data; loro-mirror draft-style mutations
  mutate in place. Match the conventions of the files you touch.

## Tests (TDD — RED honestly, GREEN in product only)

Cover P17C's slice: highest-matching-rule selection + normal/red/hidden robot state (table/property
tests over overlapping unscoped/amount/account/account+amount rules and drift); the
single-transaction apply routing through the P17A engine + P16C only (invalid complete-set rejected
→ zero mutation); inline alias-edit → UPDATE (not create) the matching rule; apply-to-new-imports
scoped to the row's date. E2E: open the popup from a normal and a red robot,
view/edit/delete/apply-this/all/new, verify the popup does NOT resize the table / occlude content /
steal focus, remembered checkboxes honored, create-vs-update path, keyboard/focus/accessibility.
Establish RED first; never weaken a test. Repeated no-retry runs for the popup/focus behavior.

## Gates (run ALL, report REAL counts)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Local Supabase
container required for integration/E2E; if genuinely unobtainable, say so precisely rather than
reporting unverified passes. Never use Playwright `--headed/--ui/--debug/show`. Pre-existing
`specs/**` `format:check` failures on untouched docs are not yours; your `lint` must add NO new
warnings.

## Secret-safety (blocking)

No vault master key, invite-fragment bearer secret, `crypto_box` secret, seed phrase, recovery
material, `SUPABASE_JWT_SECRET`, or vault plaintext in any code/test/fixture/log/URL/evidence.
Synthetic/public vectors only. Any real-material leak: stop and report it.

## When done

Commit only authorized product/test changes on top of the CURRENT HEAD (no branch/checkout games).
Write `evidence/P17C/implementation-01.md` (do NOT commit) covering: how the SAME `FieldRuleEditor`
is reused in the popup (no fork), the robot state computation via the reused P17A matchers, the
additive single-transaction-apply hook (which new file, reusing which P17A/P16C APIs), the
inline-edit→update path, the RED→GREEN story, every gate's real result (including the cleared lint
warning), exact paths touched, confirmation the hard boundaries are byte-empty, proof all apply
paths route through the P17A engine with allocations P16C-only, and any Q-proposals. Then
SendMessage to `main` with your literal final HEAD, the paths you changed, and your gate results.

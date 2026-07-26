# P17B — Implementation 01 (IMPLEMENT)

HS-007 automation redesign: one shared, accessible field-rule editor reused on the reworked
Automations page, plus thin additive field-rule CRUD + remembered-preference persistence. Apply-all
/ apply-new route only through the existing P17A engine; allocations stay P16C-only.

Raised by: `p17b-implementer-01` · package P17B · revision 01.

---

## 1. What was delivered

### 1.1 One shared, genuinely reused editor

`src/components/features/automations/FieldRuleEditor.tsx` is a single controlled, presentational
component — not two copies. It owns none of the CRDT wiring or draft state; the caller passes
`draft` + `onDraftChange` and the option lists. It covers every element the frozen scope requires:

- **Field selector** (`descriptionAlias` / `tags` / `allocation`) with a note that description-alias
  rules apply only to imports.
- **Optional amount and/or account constraints** — the two "Only if amount is" / "Only this account"
  checkboxes gating an amount input and an account select.
- **The four apply modes** (`updatingAll`, `updatingNew`, `updateAll`, `updateNew`) in a select,
  with an accessible tooltip ("Explain apply modes") and an always-visible impact line explaining
  what the selected mode targets.
- **Value editor(s)** per field: alias select, tag toggle group with add/set mode select, and the
  person-percentage grid (spanning people columns).
- **Inline validation** surfaced as `role="alert"` messages wired via `aria-describedby` /
  `aria-invalid`.
- **Delete** (when `onDelete` is supplied) and **apply-all / apply-new** actions.
- **Precedence + impact explanation** (`rule-precedence-note`): "account + amount beats account,
  which beats amount, which beats a rule with no constraints."

**Structured for P17C reuse.** The component assumes no page layout. The only surface-specific seams
are `descriptionEditable` (the inline popup will fix the description text) and the `onApply*` /
`onSave` / `onDelete` callbacks. `idPrefix` keeps control ids unique when multiple editors mount on
one page. P17C can therefore mount the SAME component inside a contextual popup verbatim, supplying
its own callbacks and a fixed description.

Accessibility preserved: `<form aria-label>`, `<fieldset><legend>` for constraints,
`<Label htmlFor>` on every control, `role="group"` for the tag set, `aria-pressed` on tag toggles,
`aria-invalid` + `role="alert"` for errors, responsive `flex-wrap` layout throughout.

### 1.2 Reworked Automations page onto the P17A field-rule model

`src/components/features/automations/FieldRulesManager.tsx` (new) is the page container. It reads
the active field rules with `useActiveFieldRules` (P17A `readActiveFieldRules`) and drives create /
edit / delete plus apply-all / apply-new. `src/app/(app)/automations/page.tsx` now mounts
`FieldRulesManager` and its header copy describes field rules. The pre-redesign generic-rule
components (`ActionEditor`, `ConditionEditor`, `AutomationRow`, `AutomationsTable`) and their barrel
exports are left intact because `src/lib/domain/automation.ts` and three existing test files still
import `ActionData` / `ConditionData`; removing them was out of scope and would have broken
unrelated code. The page-level UI, however, is fully swapped to the field-rule model.

`src/components/features/automations/rule-editor-model.ts` (new, pure) holds the apply-mode helpers
and `validateRuleDraft`, unit-tested in isolation.

### 1.3 Thin additive CRUD + preference persistence

`src/lib/crdt/field-rule-mutations.ts` (new) adds `createFieldRule`, `updateFieldRule`,
`deleteFieldRule`, `persistUserAutomationPreference`, `readUserAutomationChoice`. It **reuses**
P17A's `decodeFieldRule` / `encodeFieldRule` / `ruleUniquenessKey` and `nextUserPreference` /
`readRememberedChoice` — no re-implementation of validation, precedence, or the wire format. Key
uniqueness is enforced on create and update via `ruleUniquenessKey` (a more-specific scope is
allowed alongside a broader one; an exact-key collision is rejected with `duplicate-key` and the
existing rule id, mutating nothing). Invalid allocations / shapes are rejected with zero mutation.

`src/lib/crdt/context.tsx` gains additive hooks (`useActiveFieldRules`, `useFieldRuleActions`,
`useApplyFieldRules`, `useUserAutomationChoice`, `usePersistAutomationPreference`) modelled on the
existing `useCommitImportBatch`. They run on the full `VaultState` via `useInternalVaultAction` /
`useInternalVaultSelector` because the apply engine needs `descriptionAliases`, which
`ApplicationVaultState` omits. `src/lib/crdt/index.ts` re-exports them. All three edits are additive
(the only removed line in `context.tsx` was consolidating a pre-existing `BulkFieldRuleEntry`
type-import into the new combined import from the same module).

### 1.4 Apply-all / apply-new call the P17A engine only

`useApplyFieldRules` returns `{ applyAll, applyNewerThan }` bound directly to
`applyFieldRulesToAllTransactions` / `applyFieldRulesToNewerTransactions` from
`src/lib/crdt/field-rules.ts` (P17A). The manager's `handleApplyAll` / `handleApplyNew` call only
those; there is no bespoke re-application, no direct transaction / allocation / alias write anywhere
in the new component tree. Allocation writes therefore remain exclusively P16C's
`replaceTransactionAllocations` (reached inside the P17A engine), and alias application stays on the
P11 boundary. Impact is reported to the user by counting the engine's returned outcomes (`applied` /
`rejected`).

---

## 2. RED → GREEN

- `tests/unit/components/rule-editor-model.test.ts` (14 tests) — apply-mode helpers and
  `validateRuleDraft` (blank description, valid unscoped tags, account-required, amount → integer
  minor units, non-numeric amount, tag add requires ≥1 tag, set allows empty, alias required/built,
  allocation required/built). RED first (module absent), GREEN after implementing the pure model.
- `tests/integration/field-rule-mutations.test.ts` (15 tests) — create (tags rule, uniqueness
  rejection with `existingRuleId`, more-specific scope allowed, invalid allocation → zero mutation,
  empty alias rejected), update (preserves id/description/createdAt, collision rejection,
  not-found), delete (soft-delete frees the uniqueness slot, not-found), preference persist+read +
  defaults, and apply-all routing through the P17A engine. RED first (transform failure — module
  missing), GREEN after implementing `field-rule-mutations.ts`.
- `tests/e2e/automations.spec.ts` (3 tests) — CRUD journey (create tags rule, edit to add amount
  constraint, delete → empty state), apply-all / apply-new impact summaries with `role="status"`,
  and inline validation + keyboard/focus + accessible apply-mode explanation. RED first
  (`goToAutomations` / page manager absent), GREEN after the page rework.

No test was weakened to pass. Product code changes were confined to the allowed paths.

---

## 3. Gate results (real counts)

### 3.0 In-place fix (revision 01, pre-review) — `as` assertion removed

Root's verify-not-trust pass flagged one hard-rule breach: `FieldRuleEditor.tsx:135` used
`set({ field: value as RuleField })` to narrow the shadcn `Select`'s `string` payload. `as` is
forbidden repo-wide. Fixed with a type guard sourced from the existing `FIELD_OPTIONS` truth:

```ts
const RULE_FIELD_SET: ReadonlySet<string> = new Set(FIELD_OPTIONS);
function isRuleField(value: string): value is RuleField {
    return RULE_FIELD_SET.has(value);
}
// onValueChange={(value) => { if (isRuleField(value)) set({ field: value }); }}
```

No `as` / `any` / `!` remains in any P17B-authored file. The two `as unknown as` occurrences in
`AutomationRow.tsx` are in a legacy pre-redesign component this package did not create or modify,
and `context.tsx:818` (`duplicate as unknown as Transaction`) is pre-existing from 865a787 and left
byte-identical — both out of P17B scope. Full gate suite re-run below after the fix.

Command: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`

- **typecheck** — PASS. `tsc --noEmit` clean, no errors.
- **lint** — PASS (0 errors). 11 pre-existing warnings, all in untouched
  `tests/unit/crdt/transaction-*.test.ts` (unused-import warnings not introduced by this package).
- **format:check** — the only failures are pre-existing on untouched `specs/**` docs
  (DECISIONS/DEPENDENCIES/PROGRESS/QUESTIONS/RISKS/human-scratch and prior-package evidence). Every
  file this package touched is formatted; none appears in the failing list. These doc failures are
  not mine to fix under the byte-empty boundary.
- **test** (Vitest) — PASS. 92 files, **1836 passed, 2 skipped** (includes the 14 + 15 new tests).
- **test:e2e** (Playwright, chromium) — PASS. **145 passed** (includes the 3 new automations tests).
  Never run with `--headed/--ui/--debug/show`.

---

## 4. Byte-empty boundary confirmation

`git status` confirms none of the following were modified: `src/lib/domain/settlement.ts`;
`src/lib/crdt/mutations.ts` (P16C `replaceTransactionAllocations`); `src/lib/crdt/field-rules.ts`;
`src/lib/crdt/import-commit.ts`; `src/lib/domain/automation/{rules,apply,migration,preferences}.ts`
(P17A engine — called, never edited); `src/lib/crdt/{defaults,schema}.ts`; the spec / human-scratch
control docs; realtime files; `supabase/migrations/**`; every ledger/control file except this
`evidence/P17B/implementation-01.md`. The `src/lib/crdt` changes are additive only: a new file plus
additive `context.tsx` hooks and `index.ts` re-exports.

Two working-tree items are intentionally left unstaged and uncommitted: `next-env.d.ts` (a Next.js
auto-generated dev artifact, `.next/types` → `.next/dev/types`, "should not be edited") and an
untracked `specs/007-human-scratch-completion/evidence/P08/implementation-01.md` that this package
did not create.

---

## 5. Exact paths touched (authorized)

New product:

- `src/components/features/automations/FieldRuleEditor.tsx`
- `src/components/features/automations/FieldRulesManager.tsx`
- `src/components/features/automations/rule-editor-model.ts`
- `src/lib/crdt/field-rule-mutations.ts`

Modified product (additive):

- `src/app/(app)/automations/page.tsx`
- `src/components/features/automations/index.ts`
- `src/lib/crdt/context.tsx`
- `src/lib/crdt/index.ts`

Tests:

- `tests/unit/components/rule-editor-model.test.ts` (new)
- `tests/integration/field-rule-mutations.test.ts` (new)
- `tests/e2e/automations.spec.ts` (new)
- `tests/e2e/helpers/nav.ts` (additive `goToAutomations`)
- `tests/e2e/helpers/index.ts` (additive re-export)

Evidence (this file, not committed):

- `specs/007-human-scratch-completion/evidence/P17B/implementation-01.md`

---

## 6. Q-proposals

### Q-PROPOSAL-P17B-01 — Reference date for the page-level "Apply to new" button

- **Raised by / package / revision:** `p17b-implementer-01` / P17B / 01.
- **Context and evidence:** The frozen HS-007 scope (`specs/human-scratch.md:248-295`) distinguishes
  "updating/update new" (newer transactions only) from "all". The P17A engine exposes
  `applyFieldRulesToNewerTransactions(state, { referenceDate })`. On a per-transaction inline
  surface (P17C) the reference is naturally that row's date. On the standalone Automations page
  there is no anchor transaction.
- **Why existing authority does not decide it:** neither the spec nor P17A fixes what "new" means
  for a page-level button divorced from any transaction.
- **Options considered:** (a) reference date = today; (b) reference date = the rule's creation
  instant; (c) omit the page-level apply-new button and rely solely on automatic application at
  import commit.
- **Reversible default selected:** (a) — `applyNewerThan(Temporal.Now.plainDateISO())`. It routes
  through the same P17A engine with no bespoke rewrite, and "moving forward" is still handled
  automatically at import commit.
- **Decision-hierarchy basis:** safest reversible default; changing the reference date is a
  one-line, no-migration edit in `FieldRulesManager.handleApplyNew`.
- **Impact and risk:** low — the button is additive; automatic import-time application is
  unaffected.
- **Reversal / migration path:** change or remove the button; no data migration.
- **Human review still useful:** confirm whether the page-level apply-new should exist at all, or
  whether "new" should mean since-rule-creation.

### Q-PROPOSAL-P17B-02 — The four-mode apply select is not persisted by the P17A preference schema

- **Raised by / package / revision:** `p17b-implementer-01` / P17B / 01.
- **Context and evidence:** HS-007 says to remember the user's last choices for "the select and the
  checkboxes". P17A's `RememberedRuleChoice` / `userAutomationPreferenceSchema` persist field,
  tag-mode, and the two scope checkboxes — but **not** the four-mode apply select
  (`src/lib/domain/automation/preferences.ts`). Extending the schema would touch the byte-empty P17A
  boundary and the CRDT schema.
- **Why existing authority does not decide it:** the frozen preference type simply lacks an
  apply-mode field, and I may not modify it.
- **Options considered:** (a) persist only what P17A already models (field/tag-mode/scopes), keep
  the apply-mode ephemeral defaulting to a safe non-destructive `updateNew`; (b) modify the P17A
  preference schema to add the apply-mode (out of my write scope / boundary).
- **Reversible default selected:** (a). The remembered field/tag-mode/scopes ARE persisted via
  `persistUserAutomationPreference`; the apply-mode defaults to `updateNew` (least destructive) per
  session.
- **Decision-hierarchy basis:** respect the byte-empty P17A boundary; pick the safest reversible
  default rather than widen a frozen schema.
- **Impact and risk:** low — the user re-picks the apply mode per editing session; no data loss.
- **Reversal / migration path:** if persistence is desired, extend
  `userAutomationPreferenceSchema` + `RememberedRuleChoice` in a P17A-owning package and thread the
  new field through `persistUserAutomationPreference`; additive, no data migration.

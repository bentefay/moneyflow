# HS-007 — Automation Redesign

- **Status:** queued
- **Source:** `specs/human-scratch.md:248-295`; complete exact frozen text is in `SCOPE.json#HS-007`
- **Packages:** P17A engine/model; P17B shared editor; P17C inline alias UX; P17D
  tags/allocations/polish
- **Depends on:** P11 aliases, P14 imports, P16E completed FS-001 flow, P09 undo, P02 component
  decision. P17A may write allocations only through P16C's passed complete-set API.

## Frozen requirement

The source specifies exact-description automation; four automatic/manual and all/new modes; optional
amount/account constraints with deterministic precedence; remembered per-user vault choices;
import-time application; nearby non-occluding controls that never resize the table; shared
page/popup editor; normal/red robot rule state; apply this/all/new behavior; and analogous
tag/add-vs-set and whole-person-allocation rules. Description rules exclude manual transactions;
tag/allocation rules include them. Read SCOPE's full text before acting.

## Current evidence to revalidate

- `src/lib/crdt/schema.ts` models generic condition/action rules (`contains`/`regex`,
  tag/allocation/ status actions), not the requested field-specific exact matcher.
- `src/lib/domain/automation.ts` evaluates the current generic ordered rules and creates contains
  rules; current preference is a single broad creation setting.
- The automations page and `AutomationsTable.tsx` have management UI; `AutomationDropdown.tsx`
  exposes only an auto/manual preference. No shared contextual editor currently satisfies all
  surfaces.

## Acceptance direction

### P17A — Model and deterministic engine

- Define typed field-specific rule keys and uniqueness; exact immutable raw description plus
  optional account and/or amount; deterministic unscoped/amount/account/account+amount precedence as
  frozen.
- Define date/import boundary semantics for “new/newer” without locale/time ambiguity and migrate
  existing rules safely. Preferences are per user per vault, not shared financial state by accident.
- Apply the highest rule deterministically at import and explicit bulk operations. Description
  ignores manual rows; tag add/set and whole allocation honor manual rows and allocation bounds.
- Allocation rule values are complete **explicit** allocation sets, never effective allocations or
  owner-remainder outputs. P17A must call P16C's validated atomic complete-set replacement: validate
  every entry first, reject the whole invalid set without mutation, remove keys absent from a valid
  replacement and never clamp/normalize or bypass validation through import, apply-all/new,
  undo/restoration or migration. P17 does not duplicate settlement/remainder logic.
- Group each logical mutation for undo, make batch processing bounded, idempotent and convergent.

### P17B — Shared management editor

- One accessible rule editor powers the Automations page and contextual popup, including field,
  constraints, mode, values, validation, delete, apply-all and apply-new actions.
- Preserve established page behaviors, responsive layout, focus and explain precedence/impact
  clearly.

### P17C — Description inline workflow

- After alias editing, show the exact mode selector, tick action and account/amount constraints
  close to the user's mouse in an unfocused popup or hovering to the right/below. It must not resize
  the table, occlude content, or steal editing focus, and must honor remembered last choices.
- Show a normal robot only when current value matches the highest rule and red drift state
  otherwise; hide while actively editing. Popup supports view/edit/delete/apply-this with correct
  boundary.

### P17D — Tag/allocation parity and polish

- Reuse the same rule semantics for tags with add/set and person percentages as one spanning set,
  including manual rows. Allocation editor/proposals communicate that the set is explicit; derived
  effective values remain owned by FS-001 surfaces. Verify large imports/tables, bulk operations and
  every UX state without a direct allocation-map write.
- HS-007 remains unchecked until all four packages independently pass.

## Automated tests

- Property/table tests for key uniqueness, precedence, exact matching, boundary dates, tag set/add,
  allocations, manual/imported eligibility, idempotence and migration.
- Integration for import application, per-user preferences, atomic undo, delete/update and bulk/new,
  including invalid complete-set rejection, removal of absent keys and proof that no automation/
  import/undo path bypasses the P16C API.
- E2E journeys for every four-mode choice and constraint combination, normal/red robot,
  create/update/ delete/apply-this/all/new, shared page/popup, alias/tag/allocation and
  refresh/multi-user. Repeated no-retry performance/flakiness runs are mandatory.

## Exhaustive manual Playwright CLI charter

- Seed overlapping unscoped, amount, account and account+amount rules around date/import boundaries,
  plus manual and imported transactions. Verify deterministic winner and exact raw-text behavior.
- Exercise all modes by blur and tick, remembered checkboxes, create vs update, every robot state
  and popup action, tag add/set and spanning allocations using pointer/keyboard.
- Test focus, tooltips, cancel/error/empty/loading, desktop/mobile, dark/reduced motion, large
  import, undo/redo, refresh, duplicate tabs, two users, offline/reconnect. Inspect console and
  requests for duplicate application, plaintext or unbounded traffic. Clean all sessions.

## UX, style, and E2E review

Audit every applicable `.claude` guide. The shared editor must truly be shared; labels/tooltips must
make automatic-versus-manual and all-versus-new consequences obvious. Reject cramped spanning UI,
surprise blur application, inaccessible popup, unstable precedence, missing E2E or retry dependence.

## Risks and questions

- Risks: ambiguous duplicate numbered copy, destructive bulk scope, date boundary/timezone, rule
  migration, performance and undo size. Do not invent final wording/architecture: return complete Q
  proposals with evidence/reversible defaults for root transcription and continue.

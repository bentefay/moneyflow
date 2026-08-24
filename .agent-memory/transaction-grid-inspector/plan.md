# Transaction Grid Interaction and Inspector

## Status: in-progress

## Plan

Replace the transaction table's always-live controls and split focus state with one selection-first
interaction domain, canonical external TanStack cell-selection state, display-first grid cells, a
stable responsive inspector, and fixed-height virtualization. Preserve financial calculations, Loro
mutation semantics, row-checkbox selection, filters, sync, presence identity, and existing
automation business rules.

Implementation authority is active from source commit `67227d06de0545ea5f95e7ba827b670f8b0aa97a`
plus approved amendment commit `417e103def4e2a2b07caf7171a8e467de9e3bfab`. Independent post-commit
verification passed for both source identities; product slices must remain within that authority.

### Vertical slices

1. **Source freeze** — freeze the goal, interaction contract, source-disposition map, replacement
   coverage, evidence index, and source manifest. Record that
   `specs/014-transaction-grid-v9/goal.md` is absent from current HEAD; historical commit
   `2ac5a3f73e2bf576d548e036d2de4560261613f9` is context only. Resolve current-path drift and list
   investigations before product work.
2. **Controller and key state** — add the pure engagement union, key-intent reducer, navigation and
   reconciliation results, drag/autoscroll model, workspace boundary, and the sole effect
   coordinator. Derive active identity from the latest canonical range anchor and keep row selection
   orthogonal.
3. **Canonical external TanStack selection and projection** — own one external `CellSelectionState`
   atom, add a branded workspace-owned projection generation, extend cursor access without
   duplicating the existing `TransactionCursor.indexOf`, and make offscreen materialisation/focus
   transactional and generation checked. The atom-construction API remains an implementation
   investigation because `@tanstack/store` is transitive, not a direct dependency, and
   `@tanstack/table-core` does not re-export `createAtom`.
4. **Grid surface, gestures, copy, and accessibility** — add the shared roving-focus gridcell
   surface, display-first rendering, pointer and keyboard ranges, direct activation cells,
   all-or-nothing active-operation copy, non-layout-changing paint, live status, and complete grid
   semantics.
5. **Editor family migration** — migrate amount/allocation, date, account/status/tags,
   description/alias, then checkbox/actions to one typed draft lifecycle. Preserve existing domain
   commands and CRDT draft-style mutations; remove immediate writes from cancellable drafts.
6. **Inspector, preferences, notes, automation, and presence** — add one non-remounting responsive
   inspector subtree, encrypted per-user open state, notes, rule/proposal controls, stable owner
   metadata, and presence derived from the controller. Keep automation controllers mounted when the
   panel is closed.
7. **Fixed virtualization and performance** — make 57px the transaction-row geometry contract,
   remove note-driven measurement, retain the 600-row held window and two named pins, and re-run the
   admitted correctness/performance scenarios with fixed-row inspector replacements.
8. **Superseded-code deletion** — remove live-input navigation, row-local editing booleans, inline
   notes rows, dynamic-note measurement, and automation popover geometry only after replacement
   coverage is green.
9. **Verification campaign** — complete unit/property, DOM/accessibility, E2E, negative-mutation,
   production-build manual, repeated full-suite, Chrome presentation, and iOS Safari campaigns with
   tree-state attestations and independently reviewed evidence.

### Conventions

- Favor pure functions, immutable values, branded IDs, and discriminated unions/results.
- Unit tests are table-driven and property-based for pure logic; E2E tests assert user flows.
- Use established libraries rather than custom algorithms.
- Money remains integer minor units. Loro writes use loro-mirror draft-style mutation in place.
- Never edit frozen prior specs. Stage exact authored paths only; never stash, reset, or stage a
  shared directory broadly.
- Format authored paths only. Bare `pnpm format` can rewrite frozen specs and is forbidden for this
  epic.
- Do not add dependencies unless a later, separately approved investigation proves a direct package
  is required.
- Do not edit `.claude/CLAUDE.md`, `.claude/rules/`, skills, or commands in this implementation. Any
  durable rule change is a follow-up for the human owner.

### Verification criteria

Each product slice must add tests before retiring its mapped predecessor and pass targeted checks.
Final completion requires, serially and on unchanged committed bytes:

1. scoped oxfmt over authored files, then `pnpm format:check`;
2. `pnpm typecheck`;
3. `pnpm lint`;
4. `pnpm build`;
5. `pnpm test`;
6. `pnpm test:e2e`;
7. at least five complete four-worker retry-free E2E repetitions, or six when shared E2E sync
   helpers change;
8. production-build headless Chromium manual journeys;
9. revised Chrome presentation-trace and iOS Safari correctness campaigns.

The source-freeze slice changes Markdown only. Its gate is scoped oxfmt, source hash/count checks,
link/path checks, and narrow git-status inspection; product/build/test gates begin only after human
approval.

### Risks and assumptions

- TanStack's sparse current row model cannot be canonical geometry for offscreen ranges.
- A transitive `@tanstack/store` package is not a supported application import. The supported
  external atom construction path must be proven before controller implementation; no dependency is
  added in the source phase.
- Responsive rendering can accidentally remount the inspector and lose focus unless one DOM subtree
  is preserved.
- Cursor and row-window terminology has drifted: `row-window.ts` is currently
  `src/components/features/transactions/row-window.ts`, not under `table-model/`, and
  `TransactionCursor.indexOf` already exists.
- Selection's anchor is the active DOM cell; the range extent endpoint is geometry only. Confusing
  the endpoint with DOM focus would break editing and announcements.
- Fixed rows require all validation, presence, help, and automation surfaces to avoid changing row
  height.
- The numeric copy limits and typed quick-entry resolution rules in source 016 require explicit
  human approval before implementation.

## Tasks

### Source freeze

- [x] Task 1: Create the source 016 goal, contract, source-disposition map, replacement-coverage
      map, evidence index, and proposal freeze manifest.
- [x] Task 2: Record the absent current-HEAD spec 014 path and exact non-authoritative historical
      source commit/blob.
- [x] Task 3: Resolve `row-window.ts`, existing `TransactionCursor.indexOf`, projection-generation
      ownership, and external TanStack atom-construction drift.
- [x] Task 4: Freeze responsive inspector semantics, anchor/extent semantics, typed picker quick
      entry, selection/action/copy rules, stale/focus failures, and per-user preference merging.
- [x] Task 5: Run source-only formatting, path/hash checks, and narrow shared-tree inspection.
- [x] Task 5.1: Correct source-review cycle 1 state, generation, inspector, inventory, atomic tag,
      acceptance-key, popup, and IME findings; regenerate proposal identities and rerun source
      checks.
- [x] Task 5.2: Correct source-review cycle 2 owner-changing inspector focus and virtual/performance
      harness inventory findings; regenerate proposal identities and rerun source checks.
- [x] Task 6: Obtain human approval and commit the immutable source revision before product changes.
- [x] Task 6.1: Independently review, obtain human approval for, and commit `TGI-AMD-001` before any
      slice-2A product correction.
- [x] Task 6.2: Complete independent post-commit verification of `TGI-AMD-001` before resuming any
      slice-2A product correction.

### Controller and key state

- [x] Task 7: Add pure interaction, key-intent, navigation, and reconciliation modules with
      table-driven/property tests. Drag/autoscroll remains deferred because it is not a dependency
      of the pure slice.
- [ ] Task 8: Add `TransactionGridWorkspace` and `useTransactionGridController` as the sole effect
      coordinator while retaining one-shot added-row focus.

### Canonical external TanStack selection and projection

- [ ] Task 9: Prove a supported external TanStack atom constructor without importing a transitive
      package; request approval before any dependency change.
- [x] Task 10: Add the branded workspace-owned projection generation and generation-checked cursor
      adapter operations without duplicating `TransactionCursor.indexOf`.
- [ ] Task 11: Wire one canonical external selection atom, projection geometry, transactional
      materialisation/focus, and reconciliation with unit/property coverage.

### Grid surface, gestures, copy, and accessibility

- [ ] Task 12: Add `TransactionGridCell`, roving tabindex, display-first rows, selection paint, and
      concise status semantics.
- [ ] Task 13: Add click, double-click, modifier, drag/autoscroll, activation-cell, and range
      gesture coverage.
- [ ] Task 14: Add bounded all-or-nothing active-operation copy and native editor-copy precedence.

### Editor family migration

- [ ] Task 15: Migrate amount and allocation editors with typed validation and commit-once behavior.
- [ ] Task 16: Migrate date editing and calendar focus ownership.
- [ ] Task 17: Migrate account, status, and tags drafts and owned portals.
- [ ] Task 18: Migrate description/alias and modal precedence.
- [ ] Task 19: Migrate checkbox/actions activation and remove conflicting printable shortcuts.

### Inspector, preferences, notes, automation, and presence

- [ ] Task 20: Add one responsive non-remounting inspector and encrypted per-user open preference.
- [ ] Task 21: Move notes into the inspector without changing immediate CRDT persistence or search.
- [ ] Task 22: Move proposal/rule/drift UI into headless inspector controllers and preserve rule
      semantics.
- [ ] Task 23: Derive presence and ownership-exit behavior from controller state across row,
      inspector, and portals.

### Fixed virtualization and performance

- [ ] Task 24: Freeze 57px row geometry in code/tests and remove note-driven measurement.
- [ ] Task 25: Preserve held-window, stable-key, pin, reveal, scroll, and compiler boundaries.

### Superseded-code deletion

- [ ] Task 26: Delete old navigation/edit/notes/automation geometry only after mapped replacement
      coverage passes.
- [ ] Task 27: Record any desired agent-rule update as a human-owned follow-up; do not edit agent
      configuration.

### Verification campaign

- [ ] Task 28: Pass scoped format, typecheck, lint, build, unit, integration, and E2E gates.
- [ ] Task 29: Complete production manual accessibility and interaction journeys.
- [ ] Task 30: Complete repeated retry-free E2E, negative-mutation, Chrome performance, and iOS
      Safari evidence with independent review.

## Review Findings

### Source review cycle 1 — rejected, corrected proposal submitted for re-review

1. **High — unrepresentable structural reconciliation:** corrected by atomically replacing old
   operations with one canonical one-cell include at the surviving/replacement address, or empty
   selection plus `idle`; engagement and focus outcomes are explicit.
2. **High — stale restoration over a newer generation:** corrected with conditional same-generation
   rollback; a newer structural generation wins and only resources validated in it survive.
3. **High — inspector ownership absent from engagement:** added explicit `inspecting` state and
   inspector-owned interaction return, muted selection, transitions, Escape/close, focus return,
   presence, and continuous-intent semantics.
4. **Medium — replacement inventory incomplete:** swept production, unit/DOM/integration, E2E, and
   performance paths; added each named omission plus other current superseded hooks/components and
   an oracle/fault requirement.
5. **Medium — tag create/assign split:** specified one typed atomic loro-mirror create-and-singleton
   assignment action with one undo item and one final automation transition; all failures write
   nothing.
6. **Medium — evidence keys not executable:** added immutable acceptance keys, IDs on all command
   rows, deterministic inclusive range expansion, exact expected registry, record fields, and
   manifest-set validation.
7. **Medium — outside-pointer popup behavior unspecified:** froze capture, validation,
   commit/cancel, popup close, focus, destination activation, and write ordering for
   date/account/status/tags.
8. **Medium — IME lifecycle incomplete:** froze compositionstart/beforeinput/update/end,
   exactly-once final grapheme insertion, deduplication fallback, cancellation, and the
   command-resume boundary.

### Source review cycle 2 — rejected, corrected proposal submitted for final re-review

1. **High — owner-changing inspector focus could mutate the replacement transaction:** freeze a
   retention predicate requiring the same transaction owner and unchanged field/action binding.
   Owner change/disappearance invalidates every transaction-bound editable/actionable descendant;
   deterministic fallback is the stable inspector heading while open, otherwise the reconciled
   gridcell, with the empty result using heading or after-grid control.
2. **Medium — virtual/performance support inventory incomplete:** inventory
   `tests/unit/transactions/virtual-grid-harness.ts`, `tests/perf/baseline.measure.ts`, and their
   immediate support boundaries. Preserve real fixed-row virtualizer, campaign, provenance,
   classifier, and threshold behavior; retire variable measurement/ResizeObserver and expanded-note
   geometry; require new revisioned source 016 performance evidence rather than writes to spec 015.

### Source review cycle 3 — human approved, post-commit verification passed

The user selected “Approve and commit” through the source-gate prompt on 2026-08-24. Commit
`67227d06de0545ea5f95e7ba827b670f8b0aa97a` and tree `b91833201f005554622d3658cff1a58abf3de578`
freeze the approved source identities. Independent post-commit verification passed.

### Product slice 2A review cycle 1 — rejected; source amendment required

Review found a frozen-authority conflict: pre-focus `idle` neutrality under `TGI-STATE-001` and
`TGI-INSP-005` conflicts with an unconditional reading of `TGI-RECON-002` and `TGI-RECON-003` that
would synthesize a first cell during structural projection changes. Product-code correction is
paused. `TGI-AMD-001` must be independently reviewed, human-approved, and committed before code work
resumes. A consolidated list of slice-2A implementation corrections follows after that authority
gate; it is intentionally not recorded piecemeal here.

### Amendment review cycle 1 — deferred before semantic grading; canonical tree identity corrected

Review stopped before semantic grading because the recorded source-tree identity had one extra
trailing character. Plan, progress, and both manifest occurrences now use the canonical 40-character
tree `b91833201f005554622d3658cff1a58abf3de578`. Cycle 1 therefore records an accounting correction,
not acceptance or rejection of the amendment substance.

### Amendment review cycle 2 — rejected; three medium findings corrected

Review rejected the proposal on three separate Medium findings:

1. `idle` was incorrectly conditioned on no prior activation, so later idle reconciliation remained
   history-dependent;
2. pending explicit activation and Add/reveal had no exact `G+1` target re-resolution,
   bounded-materialization, abort, or reveal-pin lifecycle; and
3. amendment accounting listed coarse fields but did not define a closed executable schema or
   machine-checkable cross-record validation.

The cycle-3 proposal makes idle history-independent, separates ordinary idle reconciliation from the
pending-command rebase branch, forbids fallback-cell synthesis, and defines the exact
runtime-validated amendment record. Product correction remains paused pending independent amendment
review and human approval.

### Amendment correction cycle 4 — user-authorized focused revision

On 2026-08-24 the user authorized one focused fourth correction cycle without approving the
amendment. The revision must:

1. represent `pending-activation` as a state distinct from neutral idle and engaged interaction,
   with exact target, command, generation, phase, pin, and neutral or canonical engaged origin;
2. reconcile and return neutral-origin and engaged-origin pending transitions differently, including
   origin-scoped pin bounds and atomic fulfillment/cancellation clearing;
3. add named cases and mutations for fulfilled-record, fulfilled-pin, cancelled-record, and
   cancelled-pin clearing;
4. bind every negative proof to baseline HEAD/tree, applied patch and derived mutated tree, a named
   nonzero failure, exact restoration, and a zero-exit passing rerun; and
5. require a closed matching independent review attestation before amendment `PASS`.

This correction cycle did not itself grant approval. Product correction remained paused through
review.

### Amendment cycle 4 — reviewer approved, user approved, post-commit verification passed

Independent amendment review cycle 4 returned `APPROVE`. On 2026-08-24 the user selected “Approve
and commit” for exact amendment identity
`bfe997646884ae2b12dcce58af38cafa00e2db79770aa27872832e00a7ee68d0`, 416 lines, and 21,350 bytes.
Commit `417e103def4e2a2b07caf7171a8e467de9e3bfab`, tree `72f583fbcdcf6539fbeb438bdfebc287a4cd20bd`,
contains exactly the approved five paths, descends from the base source commit, and preserves all
four frozen base-source identities. Independent post-commit verification passed; source plus
amendment product authority is active.

### Product slice 2A corrected-core review — approved; slice complete

Bounded review rejected the corrected pure core on five verified findings:

1. **Live projection authority was optional in effect:** every interactive projection read now
   requires a live generation authority and validates caller-expected, snapshot, and current
   generations. Reconciliation uses a separate private historical-position seam for the prior
   projection, so `G -> G+N` can reconcile without authorizing stale interactive reads.
2. **Pending completion trusted stale objects:** fulfill, cancel, and abort now consume the current
   controller state plus exact expected command ID and generation and return typed `stale-operation`
   for late completion after command replacement.
3. **Continuous intent was not canonical:** navigating state now owns retained quick/full intent;
   movement across activation cells preserves it, editable movement exposes the resume entry, and
   only pointer selection, inspector entry, Escape, grid-boundary Tab, or external blur can clear
   it.
4. **Inspector survival was coupled to the active grid column:** inspector control and popup
   survival now require row-owner survival plus unchanged registered binding, independent of
   active-column survival. Grid-editor draft and popup validity remains row-and-column based.
5. **Editable activation contexts were representable:** key-cell context is now a mutually exclusive
   union with typed constructors. Printable and composition paths also defensively require
   `activation: "none"`.

The correction remains pure and unwired. No runtime page, cell, editor, inspector, automation, E2E,
performance, dependency, frozen source, or amendment change is admitted. The complete stable-tree
verification campaign passed, bounded re-review returned `APPROVE`, and slice 2A is complete. The
next pending slice is workspace/effect and external-selection integration.

## Notes

- Product slice 2A implements only the pure typed interaction/projection foundation. It deliberately
  leaves the external TanStack atom, workspace/effect coordinator, rendered table, cells, editors,
  inspector, automation, virtual-row DOM, copy materialisation, and drag/autoscroll unwired.
- The projection adapter wraps the production cursor's existing `indexOf` and bounded `slice`; it
  adds generation-checked `idAt`, `readRowAt`, and all-or-nothing bounded `rowsBetween` materialized
  as a readonly re-iterable array without making the sparse held Table model canonical.
- Current HEAD at source-freeze preparation: `3bc789cee63d85d966c7c395e73f1bcd0bad04be`.
- `specs/014-transaction-grid-v9/goal.md` is absent from current HEAD. Its historical content is
  read only from commit `2ac5a3f73e2bf576d548e036d2de4560261613f9`, blob
  `f04243b6e75e2ca5f865320ae621a545864277b5`; that commit is not an ancestor of current HEAD.
- Source 015 contains performance artifacts but no top-level goal in current HEAD. It remains
  immutable.
- Follow-up for the human owner after implementation: consider a transaction-grid rule and root
  rule-loading reference. This epic does not modify agent configuration.

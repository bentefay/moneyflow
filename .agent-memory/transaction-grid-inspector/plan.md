# Transaction Grid Interaction and Inspector

## Status: in-progress

## Plan

Replace the transaction table's always-live controls and split focus state with one selection-first
interaction domain, canonical external TanStack cell-selection state, display-first grid cells, a
stable responsive inspector, and fixed-height virtualization. Preserve financial calculations, Loro
mutation semantics, row-checkbox selection, filters, sync, presence identity, and existing
automation business rules.

Implementation authority is active from source commit `67227d06de0545ea5f95e7ba827b670f8b0aa97a`
plus approved amendment commit `417e103def4e2a2b07caf7171a8e467de9e3bfab` and direct-user Amendments
002 and 003. Independent post-commit verification passed for both immutable source identities;
product slices must remain within the combined authority.

### Task 108 correction authority

The prior green gates proved only the transitional implementation. Complete the mode correction in
this exact order:

1. **109 — Make editing mode authoritative:** production DOM/controller contracts for visible
   selection, parked/hidden selection, and editing across Date, Description/Alias, Account, Status,
   Tags, Amount, and Allocations; quick/full edit, commit/cancel/exit, real editor focus, no dropped
   initial text, checkbox/actions activation-only, and removal or containment of legacy bypasses.
2. **110 — Repair reconciliation focus:** terminal after-grid sidecar consumption; BODY and
   nonfocusable-external blur ordering; header and unrelated row-owned portal retirement; direct
   structural reveal before focus.
3. **111 — Correct presence:** navigation publishes row viewing, actual editing publishes the exact
   field, expanded Notes publishes and renders, and a real 89-character invitee allocation field
   round-trips.
4. **112 — Restore navigation:** arrows target canonical wrappers including Actions; Tab or explicit
   activation reaches descendants; invert the predecessor Expand-arrow test.
5. **113 — Geometry and evidence:** continuous Notes vertical borders in light/dark; full localized
   Date including four-digit year in display/edit; honest armed Delete exact width with
   geometry-only mutations.
6. **114 — Final verification:** update the ledger and mutation matrix; run focused and full gates,
   owned manual browser review, exact independent review, and final path/digest attestations.

Evidence must exercise production participants rather than inert stand-ins. Every regression must
fail on old behavior or an isolated neutralizing mutation. Geometry mutations must preserve copy and
text. Save artifacts under `/tmp/task108-*`, print actual computed state/geometry before asserting,
and repeat load-sensitive focused E2E without retries. Never use unsafe Playwright modes, reset the
shared database, delete history, alter frozen Task 88 behavior, commit, or push.

Baseline provenance is HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, 46 status paths, canonical
digest `7b5a632043e9528d3d85a5d2375d3551f8f713de896133c7c2486f627f11680c`, re-attested after
stopping writers and restoring only inspected `AGENTS.md`/`next-env.d.ts` drift. Campaigns and
mutations must report path count and the canonical path-NUL-bytes-NUL SHA-256 before and after, and
stop on unexpected path or byte drift.

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
- [x] Task 8: Add `TransactionGridWorkspace` and `useTransactionGridController` as the sole effect
      coordinator while retaining one-shot added-row focus.

### Canonical external TanStack selection and projection

- [x] Task 9: Prove a supported external TanStack atom constructor without importing a transitive
      package; request approval before any dependency change.
- [x] Task 10: Add the branded workspace-owned projection generation and generation-checked cursor
      adapter operations without duplicating `TransactionCursor.indexOf`.
- [x] Task 11: Wire one canonical external selection atom, projection geometry, transactional
      materialisation/focus, and reconciliation with unit/property coverage.

### Grid surface, gestures, copy, and accessibility

- [ ] Task 12: Add `TransactionGridCell`, roving tabindex, display-first rows, selection paint, and
      concise status semantics. The unreviewed slice 3A handback supplies the shared surface,
      controller command bridge, required visible-column metadata, and fixed-row DOM coverage;
      editor-family display replacement and concise status semantics remain pending.
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

### Product slice 2B review cycle 1 — rejected; focused correction under verification

The route retains one workspace controller and one writable cell-selection atom created once per
workspace mount with `useCreateAtom<CellSelectionState>([])` from the separately approved exact
direct dependency `@tanstack/react-store@0.11.1`. The rejected internal reactivity binding remains
absent, as do `state.cellSelection`, `onCellSelectionChange`, and any second React writable
selection mirror.

Bounded review rejected eight effect-boundary details. The focused correction now captures prior
interaction against prior columns, consumes generation-correlated gridcell/after-grid reconciliation
focus, preserves current legacy-control focus as a controller-owned non-selection pin, snapshots and
same-generation restores DOM focus/scroll/held-window resources with `preventScroll`, times out
reveal from command acceptance, lets explicit user focus/clear replace stale pending activation,
preserves quick/full entry through fulfillment, and makes the existing filter-scoped retained
historical-person cache the sole historical-membership input to the allocation-column model.

Controller, real TanStack Table/Virtual, pure allocation-cache, and full-page sliding-window tests
cover the new directions, including removed allocation-column fallback, after-grid focus,
same-generation resource restoration, acceptance-time reveal timeout, stale replacement/clear,
full-edit state, legacy checkbox/action retention, retained-column identity across window movement
and value-only membership stability, stable structural generation, and preserved selection. The
corrected slice is 25 paths, remains uncommitted, and is in the full verification campaign. Local
Supabase Auth and Realtime have been restored non-destructively, so the exact retry-free targeted
E2E must run without invoking plain `supabase start`.

### Product slice 2B review cycle 2 — shortcut target correction under verification

Review found that row shortcuts consulted only canonical `activeTransactionId`, while focused legacy
checkbox/action chrome is intentionally represented by a distinct focus-retention pin. The
controller snapshot now exposes that typed focus-retention transaction ID without promoting it to
canonical active-origin state. TransactionTable gives actual retained DOM focus precedence for row
shortcuts, then canonical active-cell authority, then the existing exactly-one-selected-row
fallback. A real DOM regression focuses an unselected row checkbox and proves `d` deletes that row.

### Product slice 3A — display-first gridcell surface handback pending review

The uncommitted handback adds one shared `TransactionGridCell` surface for all nine visible column
families, required immutable interaction metadata, stable checkbox/actions selection identities,
layout-neutral selection paint, roving gridcell focus, controller registration, background pointer
selection, double-click full-edit adaptation, and the pure key-intent/controller command bridge.
Gridcell and editor registrations are distinct so Add still focuses the Description input, while
legacy descendants and portaled popups opt out of the new surface until their editor-family slices.
Checkbox/actions remain selectable but non-copyable, row selection remains orthogonal, notes remain
outside column selection, and the fixed resting row remains exactly 57px.

This is a partial Task 12 surface slice only. It does not claim editor-family migration, inspector,
notes relocation, activation-cell migration, complete modifier/drag/autoscroll gestures, bounded
active-operation copy, concise status semantics, automation, presence ownership replacement, or
superseded-code deletion. The stable handback is awaiting independent bounded review and has not
been committed.

### Product slice 3A verification cycle 1 — rejected at gate; navigation race corrected

Independent verification rejected the handback before code review because one retry-free full E2E
run lost the duplicated page's execution context while `expect.poll` evaluated navigation timing.
The rejection artifact is preserved under
`.agent-memory/transaction-grid-inspector/evidence/task-3a-review-rejection-1/`.

Diagnosis found that `chrome.tabs.duplicate()` publishes the new target before session-history
restoration replaces its main-frame context. `waitForLoadState("load")` can therefore observe an
inherited completed state from the earlier context. The correction removes that insufficient load
barrier and uses Playwright's navigation-rerunnable `waitForFunction` to synchronize on the exact
`back_forward` / `cache` / zero-transfer navigation entry. The original exact cached-duplicate
assertion remains unchanged in strength. Task 3A product bytes remain frozen; only the E2E lifecycle
synchronization, evidence, and mutable ledgers changed. The corrected handback has passed focused
repetition, targeted Task 3A checks, and a full retry-free E2E run and now awaits independent
re-review without a commit.

### Product slice 3A verification cycle 2 — rejected findings corrected; handback pending review

Independent review rejected the corrected handback on three verified product findings: canonical
navigation to an unmounted target did not enter the bounded generation-correlated reveal/focus
transaction; a deeply scrolled untouched grid could expose no mounted roving tab stop; and
checkbox/actions double-click ignored immutable `editKind: "none"`. The correction routes virtual
navigation through the existing pending-operation transaction, assigns the idle entry stop to the
first actually mounted keyed row, and gates double-click adaptation on column capability metadata.

The same correction pass completes the assigned adjacent Task 3A gaps without claiming later slices:
clipboard TSV retains empty checkbox/actions coordinates, checkbox glyph and gridcell background
have separate row-selection/cell-selection geometry, native boundary Tab parks retained selection,
and the virtual grid publishes logical row/column counts plus absolute header, data, and retained
notes indexes. A retry-free full-suite run then exposed a stale ARIA projection after moving a cell
selection within an already engaged row. The external atom was correct, but a compiled render prop
re-read `cell.getIsSelected()` on stable cell identity. The row subscription now consumes its
projected key directly and derives immutable selected markers from that key before rendering.

The final correction passes transaction-focused unit coverage, targeted virtual-grid and cell-edge
browser coverage, every static/build gate, the full unit suite, and one full four-worker retry-free
202-test E2E run. Generated `AGENTS.md` and `next-env.d.ts` drift was inspected and precisely
restored. The uncommitted exact-path handback remains partial Task 12/13/14 groundwork and awaits
independent bounded review; editor families, inspector, notes relocation, automation, complete
gestures/copy, status semantics, and superseded-code deletion remain pending.

### Product slice 3A verification cycle 3 — closed correction scope complete

Semantic discovery closed with the exact correction set Tasks 47–49 and 54–63. The shared surface
now uses viewport-sized Page movement, preserves canonical Shift and primary-modifier background
ranges, and leaves the parked active anchor as the sole native re-entry stop. Modified arrows stay
native instead of leaking into legacy navigation, while semantic row navigation still includes
dynamic allocation gridcells and treats the actions surface as one stop with an explicit Expand
target.

Verified external blur now parks controller ownership without stealing focus, retains a surviving
canonical range through structural reconciliation, and excludes row-owned portals. Selected chrome
uses a valid OKLCH-compatible inset color mix. The actions surface covers the complete 57px row at
its top, center, and bottom without obscuring its buttons. Background focus clears stale
legacy-descendant state, and direct shared-gridcell destructive keys cannot reach legacy row
deletion.

Legacy tags full-edit adaptation explicitly activates the chooser and focuses Search tags for empty
or populated cells through Enter or background double-click. Pending activation keeps one absolute
registration deadline across structural rebases and remains atomic through focus, connectedness,
active-element, exact command, and generation verification. Redirected or unmounted targets abort
without target presence publication and restore origin focus, selection, scroll, pins, and the real
page-held row window.

The final stable campaign passes scoped and repository formatting, lint with only the existing
`useVirtualizer` React Compiler advisory, typecheck, the 17-route production build, 119 targeted
unit tests, 2 targeted browser tests, the full 3,020-pass/2-skip unit suite, and all 202 retry-free
E2E tests. The first full E2E attempt exposed and corrected omitted nested allocation stops; the
complete campaign was restarted from the corrected tree. Evidence is preserved under
`.agent-memory/transaction-grid-inspector/evidence/task-3a-review-rejection-4/`. Generated
`AGENTS.md` and `next-env.d.ts` drift was inspected and precisely restored, port 3000 was released,
and no commit or push was created. The handback remains the bounded partial Task 12 surface; the
closed scope does not admit editor-family migration, inspector, notes, automation, complete gestures
or copy, concise status semantics, or superseded-code deletion.

### Product slice 3A exceptional correction — user-authorized two-finding closure

After the closed-scope handback, exact-server manual review reproduced two final defects. The user
explicitly authorized one exceptional correction and review cycle limited to those findings. No late
review or adjacent semantic work was admitted.

When a row-B checkbox or actions descendant receives focus while a canonical range remains anchored
in row A, the controller now parks the range while retaining row B as explicit focus-retention and
shortcut authority. Its focus-retention pin coexists with the range's active-origin pin, so both
rows remain materialized through virtualization. Actual focus movement to a gridcell, another
activation surface, or outside the grid replaces or clears that authority through the existing
focus-exit paths. The complete checkbox/actions by `d`/Delete/Backspace matrix proves deletion
always targets focused row B and never retained-range row A.

When native reverse Tab returns from Expand to the parked actions wrapper, wrapper focus now clears
the legacy-descendant latch before exposing the retained range. The exact browser sequence actions
background, Shift+Home, Tab to Expand, then Shift+Tab back proves the wrapper remains `tabIndex=0`,
the grid has exactly one roving stop, and all nine cells remain selected without collapse.

The exceptional campaign passes 90 focused unit/DOM tests, the exact retry-free browser regression,
repository formatting, lint with only the existing `useVirtualizer` React Compiler advisory,
typecheck, the 17-route production build, the full 3,028-pass/2-skip unit suite, and all 202
four-worker retry-free E2E tests. Evidence is preserved under
`.agent-memory/transaction-grid-inspector/evidence/task-3a-review-exception-1/`. Generated
`AGENTS.md` and `next-env.d.ts` drift was inspected and precisely restored after browser/build work.
No dependency, import picker, editor-family, inspector, notes, automation, copy, status, frozen
spec, agent configuration, commit, or push change was admitted.

### Product slice 3A styling amendment — spreadsheet-cell handback

Direct user instruction on 2026-08-25 authorizes
`specs/016-transaction-grid-interaction-inspector/amendments/002-google-sheets-grid-treatment.md`,
replacing only the earlier resting-appearance preservation clause. The grid now uses contiguous
square header/body tracks, subtle single-width rules, outer-gridcell
hover/focus/selection/validation/presence paint, and one shared 57px main-row DOM and virtualizer
estimate. Inner staged controls retain their live editor behavior but no longer paint competing
resting borders, radii, fills, focus rings, or validation rings.

Tags clip to one line, allocation validation and field presence are layout neutral, and actions stay
inside the fixed main row. Browser coverage measures light/dark computed paint, exact track
alignment through horizontal scrolling, coordinate hit ownership, descendant activation counts,
accessible control uniqueness, exact row geometry across selection, popup, validation, long-tag,
presence, and expanded-notes states, and one roving gridcell stop. The bounded checkbox target is
the only retained negative hit area and remains inside its own row and track.

This handback remains a partial Task 12 presentation slice. Native-control-only display/editor
migration, inspector-owned notes, fixed virtualization without legacy expanded-row measurement,
automation migration, complete gesture/copy semantics, concise status semantics, and superseded-code
deletion remain deferred to their existing slices. The styling authorization opens no additional
human approval gate and creates no claim that every editor family is display-first.

### Spreadsheet-cell review cycle 1 — rejected; focused correction scope

Independent review rejected the first handback on exactly three Medium findings. The correction
scope is closed to Tasks 76–78:

1. move the direct-user styling decision to `amendments/002-google-sheets-grid-treatment.md`, give
   it its exact Amendment 002 title, update all mutable authority accounting, and prove Amendment
   001 and 002 remain distinct without changing the executable 146+1 registry;
2. suppress outer focus/focus-within paint while the retained range is parked, without changing its
   tab stop, hidden selection semantics, or exact wrapper re-entry restoration; and
3. remove the nested rounded fill and native focus outline from the existing-rule robot, replacing
   them with a layout-neutral affordance while preserving its domain color, semantics, activation,
   popup behavior, and 57px row geometry.

No other speculative descendant chrome, editor-family lifecycle, virtualization measurement, notes,
inspector, automation semantics, or frozen base source change is admitted by this cycle.

### Spreadsheet-cell verification gate — deterministic duplicate traversal oracle

The first cycle-one full-unit gate measured the wall-clock duplicate scaling ratio as
`3.0429263184511073` against `< 3`; an immediate quiet full-suite rerun passed. This is
scheduler-load sensitivity in the timing oracle, not evidence of a Task 70 or duplicate-algorithm
regression. The correction adds optional duplicate-detection traversal instrumentation and replaces
the timing ratio with existing-row visit counts for 100/200/400 rows at one row per day. It
preserves the independent three-second smoke test.

The deterministic oracle must keep exact match-count assertions, positive visit counts, and
successive visit ratios below three. A behavior-preserving all-pairs instrumentation mutation must
retain the matches while producing approximately 10k/40k/160k visits and failing near a ratio of
four. The restored implementation must pass 20 independent one-worker focused processes and 10
retry-free 32-worker shuffled full-unit runs with distinct seeds and unchanged tree identity before
the ordinary full verification gates.

The shuffled campaign must also own every asynchronous property-test promise. A test that starts
`fc.asyncProperty` without awaiting `fc.assert` can be reported complete while its iterations mutate
shared same-file fixtures during later tests. Any such discarded promise found by the required seed
campaign is a harness defect, must be corrected across all identical call sites, and restarts the
campaign on the corrected tree.

### Spreadsheet-cell verification cycle 2 — Add reveal reconciliation

The changed-set cycle-2 campaign failed 53/54 at the date-filter arm of “Add reveals an ordinary row
through every excluding filter class”. The preserved runner transcript records stable target
`886e4b4a-05e6-4cc8-964c-a7b3bc36706d` absent for the full 15-second latch ceiling while filters had
already settled to All time, the toolbar showed one transaction, and the pre-existing default row
held focus. The original Playwright error-context was removed before this correction and is not
available evidence.

The controller root cause is an intermediate structural projection after filter reset but before the
new CRDT row materializes. Reconciliation treated every absent pending target as disappearance,
completed the reveal command into idle or its reconciled origin, and therefore discarded the exact
Add target before the insertion projection arrived. The correction separates column validity from
row materialization: a removed target column and a focus-phase row disappearance still abort
immediately, but a reveal-phase missing row retains the same command, target, phase, pins, and
reconciled neutral or engaged origin on the new generation. Controller publication retains the
original `acceptedAt`, so repeated absent-target generations cannot extend the absolute
materialization deadline.

The Add harness accepts explicit known pre-existing transaction IDs and excludes their union with
currently mounted IDs. The excluding-filter matrix owns one cumulative Set, passes it before every
Add, rejects every returned duplicate before adding it, settles filter clear and the exact toolbar
count, then requires exactly one focused Description row carrying the fresh stable ID. The ordinary
unfiltered multi-Add path retains the opposite branch with the same freshness contract.

Negative evidence is stored outside the repository. Restoring the old reveal disappearance branch
fails all three new reveal-before-materialization unit directions; deferring insertion by one task
after filter reset passes the corrected browser journey and fails the old reconciliation at the date
arm; removing known-ID/freshness protection while forcing old origin restoration also fails that
arm. Every temporary product/helper mutation was restored to its exact pre-mutation SHA-256 bytes.

Final evidence must run only after this ledger text is frozen: focused controller/reconciliation/Add
coverage; 50 four-worker retry-free repetitions of the formerly failing focused browser test; 10
independent retry-free changed-set runs; three independent full four-worker E2E runs; the complete
Task 79 deterministic mutation, 20-process, and seeds 79001–79010 campaign; the Task 80 seed-79006,
positive/opposite storage, and store-bypass mutation checks; scoped formatting, typecheck, lint,
build, full unit, full E2E, and diff checks. Each run must attest the same canonical
path-NUL-bytes-NUL digest before and after; any tree drift restarts that campaign.

### Tasks 82–87 exceptional bounded correction

The orchestrator authorized one further correction cycle against the frozen Task 70 handback at HEAD
`9be122b1313f3770ab30deee81562a9a74a00d8f`, exactly 35 paths, canonical digest
`4e135a077261334ee27e4d61f02dac8b2a24ce7ede4ef1a433329863d0714b3f`. This exception is limited to six
verified findings: stale Amendment 001 accounting, rebased engaged-origin abort focus, reveal
deadline extension, nested account/status hover paint, invisible parked action-descendant focus, and
an undersized actions track. Duplicate instrumentation containment, old complexity commentary, the
frozen base sources, and the executable 146+1 registry remain outside this authority.

The correction design is:

- Task 82 records Amendment 001 commit `417e103def4e2a2b07caf7171a8e467de9e3bfab`, tree
  `72f583fbcdcf6539fbeb438bdfebc287a4cd20bd`, passed post-commit verification, and resumed product
  authority in both mutable accounting files. Amendment 002 stays distinct and non-executable;
  regression coverage rejects stale pending/paused wording and cross-amendment contamination.
- Task 83 carries a grid-owned engaged origin's current-generation canonical focus as abort-only
  fallback. The target retains exclusive focus authority while pending; same-generation abort keeps
  exact captured DOM/scroll/window restoration, newer-generation abort never restores stale raw
  coordinates, and neutral or parked/external origins cannot schedule grid focus. Timeout and
  post-materialization focus failure have separate directions.
- Task 84 captures `materializationDeadlineAt` once at command acceptance, preserves it over every
  rebase, schedules from that value, and makes `markRevealApplied` synchronously abort with
  `load-failed` at or after the deadline. Callback-first late failure and just-before success prove
  both sides.
- Task 85 places light/dark transparent hover utilities after primitive hover utilities so account
  and status controls remain transparent while the owning gridcell keeps its hover paint.
- Task 86 gives parked Expand and Delete descendants an explicit solid focus-visible outline while
  preserving the unpainted parked wrapper, one roving gridcell stop, native Tab boundaries, retained
  range restoration, activation, and pointer behavior.
- Task 87 makes both active template authorities use a 120px actions track. Browser geometry must
  mount duplicate, Expand, and Delete together, keep each control inside the track without overlap,
  retain exact 57px rows, align header/body before and after horizontal scroll, and activate each
  control.

Before the final campaign freeze, each new guard must be mutation-graded outside the repository:
restore stale Amendment 001 status; remove and prematurely apply abort fallback focus; remove the
synchronous deadline check; remove hover neutralizers; remove the parked descendant indicator;
restore parked outer paint; and restore the 88px actions track. Every mutation failure is preserved
outside the repository and every source restored to exact bytes. Final evidence then runs on one
unchanged canonical digest with before/after attestations: focused unit and browser targets, the
Task 81 50-repeat and ten changed-set campaigns, three full E2E runs, the complete Task 79 and Task
80 campaigns, scoped formatting, typecheck, lint, build, full unit, full E2E, and
diff/process/generated state checks. No repository edit, commit, push, or implementor-owned manual
smoke is permitted after that freeze.

### Task 88 bounded realtime fixture correction

The ordinary full-unit gate on the frozen 39-path Tasks 82–87 tree repeatedly failed at
`realtime-origin-controls.test.ts:152`. This is a separately authorized fixture/oracle correction,
not a semantic finding against Tasks 82–87. The third request was a real global PostgREST
`vault_ops?select=id,vault_id` enumeration. RLS evaluates `realtime_grant_allows` for every
candidate row, and the shared development database contained 298,217 leaked append-only operations.
Under full-suite load PostgREST twice returned HTTP 500 / SQLSTATE 57014 at the authenticated
eight-second statement timeout; isolated runs passed because they did not reach that load.

The leak and security-oracle defects are coupled. `cleanUpVaultFixtures` omitted `vault_ops`, then
ran multi-statement psql without fail-fast behavior. The append-only operation FK made the final
vault delete fail, but psql continued and exited successfully, leaving operations and vaults behind.
Meanwhile the foreign vault had no operation, so the foreign-denial assertion was vacuous.

The bounded correction is:

- retain both the own and foreign operation IDs seeded by the fixture and independently prove both
  rows exist through a fixture-scoped superuser query;
- replace the global enumeration with a URL-encoded PostgREST candidate set over exactly the own and
  foreign vault IDs, assert HTTP 200 before parsing, require an array, require the own operation,
  reject the foreign operation, and require every returned row to belong to the granted vault;
- clean fixture operations before grants, memberships, and vaults inside one `BEGIN`/`COMMIT` psql
  transaction with `ON_ERROR_STOP`; transactionally disable only the named append-only user trigger
  around the fixture-scoped operation delete so FK enforcement remains active for the remainder;
- add a cleanup regression that creates an isolated vault, operation, grant, and second membership,
  proves each exists, calls cleanup, requires fixture-scoped counts of all four tables to be zero,
  and proves the suite's unrelated own and foreign operations still exist.

Negative and bootstrap evidence must remain outside the repository. Removing the operation delete
must make the cleanup regression fail closed on the `vault_ops_vault_id_fkey` or nonzero counts. A
fresh throwaway database in the existing Postgres container must receive the complete Supabase
preamble, all migrations under `ON_ERROR_STOP=1`, and an inventory identical to live. A temporary
PostgREST instance against only that database must show the corrected candidate-set response, then a
throwaway-only SELECT-policy bypass must expose the seeded foreign operation and fail the security
oracle. Restore the policy, stop the temporary service, drop only the named throwaway database, and
prove the shared database identity, relevant policy digest, and exact table counts are unchanged.

Before final campaigns, update this ledger and progress, scope oxfmt to authored files, then freeze
the new path set and canonical path-NUL-bytes-NUL digest. Final evidence requires 20 independent
focused candidate-set runs against the polluted shared database; three ordinary full-unit runs;
shuffled seeds 79001–79010 at 32 workers; every Tasks 82–87 focused, mutation, and browser campaign;
Task 81's 50-repeat, ten literal changed-set, and three full E2E campaigns; Task 79 and Task 80
positive and mutation campaigns; typecheck, lint, format check, build, full unit, full retry-free
E2E, diff, process, generated-state, and duplicate final-digest checks. No repository edit, commit,
push, broad shared-data cleanup, or manual smoke is permitted after the freeze.

### Task 95 final review correction

The orchestrator authorized one bounded correction cycle for ten independently verified final-review
findings against the Task 88 handback. The correction preserves the existing interaction model while
closing focus ownership, explicit activation, field-attributed presence, descendant focus, action
track, nested date chrome, and expanded-notes geometry defects:

- F1–F3 and the delayed ownership race preserve reconciliation-owned failure/editing state through a
  real gridcell focus, retain an after-grid abort fallback across an empty reveal rebase, reveal a
  newer-generation offscreen origin before focusing it, and retire delayed fallback focus when a
  connected external control owns focus.
- F4 marks account, status, and allocation controls as explicit full-edit activators so gridcell
  Enter and true blank-background double-click open their full editor without widening generic
  legacy activation behavior.
- F5 projects collaborator identity by field through `editingByField` and selects each cell's
  outline color from the collaborator editing that exact field, while retaining row/avatar ordering.
- F6–F7 give checked and unchecked parked checkboxes and tag-remove controls inset focus-visible
  outlines that survive clipped gridcell geometry. F9 applies the complete neutral resting chrome to
  the nested date trigger in both themes.
- F8 keeps duplicate, Expand, and armed Delete controls inside the unchanged 120px actions track,
  preserves the 57px main row, and uses a contained 48px `Delete` action.
- F10 makes the expanded notes row use the same gapless, border-aligned grid tracks as the header
  and main row, with the intended 16px inset inside the spanning notes cell and no horizontal
  scroll-width growth on expansion.

Every correction has a direct negative grade under `/tmp/task95-*`: controller-owned focus
suppression, deferred after-grid fallback, reveal-before-focus, delayed external ownership, explicit
activation, field projection and per-field rendering, parked checkbox focus, tag-remove focus, armed
Delete, date-trigger chrome, and legacy expanded-notes gap/padding each make their named focused
regression fail. All mutations were restored before final verification. Final verification is
serial: targeted formatting, typecheck, lint, format check, build, full unit, full retry-free E2E,
diff check, generated-file normalization, process/file-descriptor inspection, and duplicate
canonical digest attestation. No commit or push is authorized in this cycle.

### Tasks 108–113 authoritative interaction-mode correction

The earlier green Task 3A, Task 70, Tasks 82–88, and Task 95 gates verified a transitional mixed
surface: canonical controller state and outer-gridcell paint coexisted with permanently mounted
legacy controls whose independent focus, draft, navigation, and presence behavior could still
contradict the controller. Those gates did not complete the three production interaction modes or
the editor-family migration, and must not be cited as evidence that visible selection, hidden
selection, and editing were authoritative across the real grid.

This correction begins from HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, exactly 46 changed
paths, and canonical path-NUL-bytes-NUL digest
`7b5a632043e9528d3d85a5d2375d3551f8f713de896133c7c2486f627f11680c`. Work is ordered and gated as
follows:

1. Task 109 makes controller editing authoritative for date, description/alias, account, status,
   tags, amount, and allocation, including quick-entry initial text and full commit/cancel/movement;
   checkbox and Actions remain activation cells.
2. Task 110 repairs terminal after-grid fallback consumption, external/BODY blur ordering,
   header/portal ownership scope, and reveal-before-focus for direct offscreen reconciliation.
3. Task 111 derives production presence from controller mode: navigation publishes row viewing, only
   actual editing publishes exact field editing, expanded Notes retains exact field attribution, and
   real 89-character allocation identifiers round-trip across peers.
4. Task 112 removes legacy nested arrow authority so every arrow target is the canonical outer
   gridcell, including Actions, while Tab and explicit activation retain child reachability.
5. Task 113 restores exact 48px armed-Delete evidence, full localized Date containment, and
   light/dark expanded-Notes vertical-rule continuity without changing the 120px Actions track or
   57px row.

Each task closes only after focused production-path tests pass with real participants. Every new
guard is graded against predecessor behavior or an isolated neutralizing mutation, with failures
preserved under `/tmp/task108-*` and exact byte restoration before the passing rerun. After all five
focused tasks, Task 114 owns targeted formatting, format check, lint, typecheck, build, full unit,
full E2E, diff check, manual light/dark keyboard review, independent review, generated-file
normalization, and duplicate final path/count/digest attestations. No commit, push, shared-Supabase
reset, historical-row deletion, Task 88 cleanup change, or unsafe Playwright mode is authorized.

Task 111 is closed by client-lifecycle correction rather than a weakened peer barrier. Raw frame,
connection-order, grant, token, and page-lifecycle controls proved peer envelopes reached the owner
until Supabase Realtime's five-client-Presence-calls-per-30-second limiter closed the channel.
Outbound publication must therefore remain latest-state coalesced and strictly separated by eight
seconds between actual sends, with no pre-subscribe send and no pending teardown publication. The
focused burst oracle must bound send count and preserve the final state; delay-removal and
trailing-drop mutations must fail. The unchanged two-identity-plus-duplicate-tab production journey
must pass retry-free with no `ClientPresenceRateLimitReached` log in its acceptance window. Task 114
remains separate and is not started by this closure.

### Task 118 Gate 9 full-E2E correction

Task 118 closes the 46-failure Task 114 Gate 9 result without broadening one timeout signature into
one cause. The independently verified split is 30 stale display-first test oracles and 16
product-backed resting-surface regressions. Affected journeys resolve stable transaction identities,
activate the canonical outer gridcell before locating an editor, and assert commit/cancel through
the resting display branch. Production preserves compact same-year dates, full-year editing and
other-year rest, imported-description and original-amount provenance, stable rule-proposal hosts,
invalid-editor focus, and alias-modal focus restoration.

Residual full-suite failures are corrected independently: filtered import drag uses a stable
transaction-id row after a disconnected virtual role locator was measured; rule-robot journeys use
outer-cell keyboard activation after the locator centre was measured on the nested robot button;
tags geometry addresses the display descendant through the stable proposal anchor; and description
edits select exactly one rule surface, using the existing robot when a matching rule exists and a
proposal only when unmatched. The dual-popover predecessor must fail because the proposal intercepts
the robot's apply control, then pass after exact restoration.

Closure requires retry-free focused coverage, four parallel repetitions of the four residual tests,
format, lint, typecheck, production build, full unit/integration, and one complete 203-test
retry-free four-worker E2E run. Preserve evidence under `/tmp/task118-*`; the independent six-repeat
acceptance campaign remains Task 114's responsibility. After exact writers stop, normalize only
inspected Next-generated `AGENTS.md` and `next-env.d.ts` drift, re-attest the frozen identity, and
hand back without commit or push.

### Task 119 Gate 9 filtered-row drag correction

Task 119 closes the fresh Task 114 Gate 9 import-overlay failure independently of Task 118's earlier
row-locator correction. The preserved failing UI contained the expected filtered transaction, but
that eventual snapshot did not establish the synthetic event's dispatch-time ancestry. Four-worker
diagnostics must report whether the row is connected, contained by the stable transaction drop
target, and canceled by the product handler before any production change is considered.

Measured failing dispatches were disconnected, outside the owner, and not default-prevented while
their `DataTransfer` still exposed `Files`; every passing dispatch was connected, contained, and
default-prevented. The correction is therefore test-only: resolve the current transaction row and
dispatch its drag event synchronously inside one evaluation of the stable outer owner, retrying only
while the current descendant is absent and requiring owner cancellation before asserting the
overlay. This preserves nested-row bubbling coverage without relying on a detachable leaf locator.

Closure requires predecessor failure under four-worker repetition, a diagnostic repetition proving
the disconnected-node mechanism, at least 32 corrected retry-free four-worker repetitions, scoped
and repository formatting/lint/typecheck/build gates, the complete unit/integration suite, and one
complete 203-test retry-free four-worker E2E run. Preserve evidence under `/tmp/task119-*`;
normalize only inspected generated files after exact writers stop, attest the post-ledger identity,
and hand back without commit or push. Task 114 retains authority for its independent acceptance
campaign.

### Task 125 final Task 114 blocker correction

Task 125 is a bounded correction chain, not a replacement acceptance campaign. Its completed units
must preserve the mode-complete interaction contract while closing the final reviewer blockers:

- atomic editor validation, commit, cancellation, and movement use one controller transition and do
  not duplicate a save through the following blur; continuous quick/full editing survives mounted,
  offscreen, Checkbox, and Actions destinations, and the pure reducer owns the complete composition
  start/update/end and finalized-grapheme lifecycle;
- popup Presence and focus restoration remain tied to the exact editing owner, and outbound Presence
  rate limiting is measured at the actual transport invocation boundary with reconnect and teardown
  unable to emit stale trailing state;
- programmatic Add carries one exact-address Description-only deferred-Presence gate from pending
  activation through fulfilled editing. Focus, timers, and `isTrusted` do not release it; only a
  captured pointer, key, or `beforeinput` gesture in that exact editor, or editor exit, can clear
  it;
- registration invalidation is narrow: unrelated and unregister cell/editor/row/after-grid churn
  does not bump the broad snapshot, while one exact pending or reconciliation authority wakes once.
  Row query fallback and after-grid-only reconciliation remain intact.

The source-authorized Task 115 mutation is part of the closure evidence. On the 85-path mutation
window at HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, replace only
`if (activationDescendant) onActivationDescendantFocus?.();` with
`if (activationDescendant) return;`. The exact focused Vitest case “already parked before native
forward Tab” must fail with `navigating` instead of `parked`, then pass after byte-for-byte
restoration. Immutable evidence is sealed read-only under
`/tmp/task125-task115-activation-descendant-mutation-20260827/`. The pre/post canonical
path-NUL-bytes-NUL SHA-256 is `b9c0d80365423dde25af3c4c2264b90c64ead80690058b5a6c7e2e7d809aa6a3`;
the exact restored `TransactionRow.tsx` SHA-256 is
`fd2d7aa89fc6adc2d015735cea86eadc5d9f44376a5f4776bbd1f85f31fb5108`. No commit, push, generated-file,
or database-state change is admitted by this mutation unit.

Task 125's final implementation matrix closes the remaining popup lifecycle defects without
weakening layered Escape. Portal/listbox/calendar ownership returns to the retained editor before
that editor finishes; account, status, tags, date, and allocation paths use controller-authoritative
ownership and focus restoration. Activating an already-selected status is an explicit successful
selection for pointer, Enter, and Space even though Radix does not emit `onValueChange` for an
unchanged value. Mutation-grade unit coverage proves popup-before-editor ordering and same-value
selection completion; the production canonical Example H browser journey passes with `For Review`
already selected.

The 88-path matrix at canonical digest
`45908eee4d490aeb27c9967e7f08a3ee309b90f459c1e45e4ebbee0a0aeffb37` passed scoped formatting,
repository format/typecheck/lint/build, all 3,114 passing unit/integration tests with 2 skipped, and
all 203 retry-free four-worker E2E tests. Fresh Task 114 acceptance then invalidated that evidence
by confirming an uncovered TGI-IME-005 defect: a grid-origin empty/cancelled composition crossed the
consumed late-key barrier but resumed `editing`, leaving an empty editor instead of restoring
canonical navigation. The earlier matrix remains historical diagnosis only and cannot close
Task 125.

The correction gives active and consumed composition states typed empty-completion authority. A
composition that starts from grid ownership carries `navigating`; one that starts inside an existing
editor carries `editing`. Empty `compositionend` preserves that authority through the consumed
barrier; the resume microtask exits through controller `finishEditing` only for `navigating`,
without calling editor commit/cancel or mutating domain state. Finalized authoritative or fallback
insertion always resumes editing. Production-shaped reactive DOM coverage must prove the grid-origin
editor unmounts and its gridcell regains focus, the composition-ending Enter remains consumed, and
the existing-editor opposite branch remains mounted. A controller-resume mutation must fail the new
DOM regression and exact restoration must pass.

After any additional confirmed Task 114 findings are incorporated, update the mutable ledgers,
freeze a new canonical path-NUL-bytes-NUL identity, and restart the complete Task 125 matrix from
Gate 1. No prior matrix gate is reusable. Exact writers must stop before generated-file inspection
or normalization; no commit, push, shared-database history change, unsafe Playwright mode, or
unrelated process termination is authorized.

### Task 125 Task 6 Phase 2 lifecycle correction

The Phase 1 correction at HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, 96-path canonical digest
`32a6440b79b08f201eb97bf1fb79ebcd5e14c26c963479d0c3f65d18df8c165b`, is rejected. Its original
volatile evidence path `/tmp/task125-task6-popup-phase1-correction-20260827/` is no longer present
after session/machine turnover; only the transcript-preserved post-seal attestation remains
historical context and no Phase 1 artifact may be reused or claimed revalidated. Independent review
confirmed two cell-exit defects that its final campaign did not contain:

1. A genuine click-only exit whose editor validation returns `retained` can still execute the
   destination Add, checkbox, or action click. The click lifecycle must consume both `retained` and
   `rejected`; only rejection should explicitly refocus the retained editor.
2. External invalid Amount, Date, and Allocation exits focus the destination first, run production
   blur validation, retain editor ownership, and then invoke explicit validation a second time. Blur
   validation ownership must be represented explicitly so the wrapper classifies the post-focus
   state without repeating the editor lifecycle call.

The bounded correction begins with `TransactionGridCell.tsx` and production-shaped tests. Extend
scope only when a failing regression proves that the cell-local lifecycle API is insufficient. Tests
must prove exact validation/commit/action counts, not only final focus or write state: invalid
Amount/Date/Allocation across genuine click-only and pointer exits; retained listbox-to-modal Add
and checkbox exits; valid accepted counterparts; internal-grid, portal, multi-pointer, lost-capture,
and mouse/touch/pen preservation. Extend the existing shared-alias E2E journey with a real
open-listbox to checkbox/modal handoff and retained editor restoration.

The implementation must grade each new oracle red on the rejected behavior and green after exact
restoration, then run the applicable preservation unit suites and repeated focused Chromium journey.
Phase 2 scope review rejected the first 14-path handback despite matching hashes and digest:
generated `AGENTS.md` drift remained; click-only invalid Amount and Allocation exact-count arms were
absent; accepted external blur-owned Amount, Date, and Allocation classification lacked complete
exact-count opposite paths; and the final unit log carried unresolved React `act(...)` warnings.
Those blockers must be corrected and mutation-graded before evidence authorization.

After exact writers stop, normalize only inspected generated `next-env.d.ts`/`AGENTS.md` drift,
freeze a new canonical path-NUL-bytes-NUL identity, and seal a distinct self-contained evidence
bundle. Because the earlier volatile bundle is absent, Phase 2 evidence must carry complete current
source snapshots, status membership, red-first output, pre/mutated/restored identities and hashes,
and final checks; the old attestation is historical context only. A fresh independent reviewer must
verify source hashes, evidence integrity, mutation causality, repeated checks, and final identity
before Task 6 is accepted. No full matrix, commit, push, shared database/service work, or Tasks
7/8/9/30/36 is authorized during this correction.

Independent acceptance rejected the first sealed Phase 2 bundle despite passing code, mutation,
unit, static, and UI-behaviour review. Its provenance note falsely claimed no database/service
action: the exact E2E journey necessarily registered a user, created a vault/membership/snapshot,
and attempted sync against the configured shared local Supabase. Independent scratch replays also
required a `turbopack.root` source adaptation and wrote to that shared stack, so they were neither
byte-equivalent nor database-isolated. No cleanup is authorized because exact inserted rows were not
retained and shared history must not be guessed or deleted.

Closure now requires a new self-contained evidence revision. Run the byte-identical frozen app from
a scratch-local dependency installation against a separately provisioned disposable Supabase CLI
project with a unique project ID, unique API/DB/Studio/Inbucket/analytics ports, isolated
credentials, and hard preflight aborts for every shared URL, port, container ID, and project ID.
Attest the actual Next process environment and isolated container identity; capture run-scoped
before/after database state and browser/server health; run the exact Chromium selector without
source/config adaptation; and stop/delete only the disposable project with no backup. The revised
provenance must explicitly declare isolated disposable database writes and supersede the false
no-database-action claim. A fresh reviewer must verify the revised evidence and unchanged product
source before Task 6 acceptance.

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

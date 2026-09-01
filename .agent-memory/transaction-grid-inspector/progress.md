# Progress Log

## Session 2026-08-23

- Started: Phase 1 source freeze for the transaction-grid interaction and inspector epic; no product
  behavior changes authorized.
- Completed: Inspected frozen specs 008, 009, 011, 012, 013 and spec 015 evidence conventions;
  inspected current grid ID, feature, row-window, cursor, display-preference, and picker boundaries;
  created the proposed source 016 package and persistent implementation ledger.
- Completed: Recorded exact path drift, the existing `TransactionCursor.indexOf`, workspace
  ownership of a new projection generation, and the unresolved supported external TanStack atom
  constructor.
- Completed: Froze proposed command, focus, responsive inspector, quick-entry, selection/copy,
  failure-atomicity, preference-merge, and replacement-coverage contracts for human review.
- Remaining: Human approval and source-only commit; all controller, projection, grid, editor,
  inspector, virtualization, deletion, and verification slices remain untouched.
- Blockers: Product work is intentionally blocked until the human approves source 016. Importing
  `createAtom` from transitive `@tanstack/store` is not approved; prove a supported direct-package
  route or request a dependency decision in the controller slice.

## Session 2026-08-23 — source review cycle 1

- Started: Addressed the independent source-review rejection without touching product, tests,
  dependencies, configuration, or prior frozen specs.
- Completed: Made structural reconciliation atomically representable with one canonical one-cell
  operation or empty `idle`; made rollback conditional on the snapshot generation and gave newer
  reconciliation authority over stale work.
- Completed: Added explicit inspector engagement/interaction ownership, muted selection,
  transitions, presence, Escape/close, focus return, and continuous-edit behavior.
- Completed: Swept production, unit/DOM/integration, E2E, and performance artifacts and expanded the
  replacement map with component/hook/test paths, replacement oracles, and required negative proofs.
- Completed: Specified atomic tag create-and-assign with one undo/automation transition; complete
  outside-pointer ordering for date/account/status/tags; and the IME lifecycle through exactly-once
  finalized grapheme insertion.
- Completed: Added immutable acceptance keys, command-row IDs, deterministic range expansion, the
  exact expected key registry, and required final-manifest fields/checks.
- Completed: Regenerated and bound the four corrected source identities; scoped formatting,
  registry, body-label, inventory, path, manifest, exact changed-file, and protected-path checks
  pass for all eight authorized files.
- Remaining: Source review cycle 2 and human approval/source-only commit remain pending. Product
  work has not started.
- Blockers: No correction blocker. Product work remains intentionally blocked on accepted source and
  human approval.

## Session 2026-08-23 — source review cycle 2

- Started: Addressed the final source-review rejection as a narrow source-only correction; no
  product, test, dependency, configuration, or prior frozen-spec change is authorized.
- Completed: Made inspector focus retention require the same transaction owner and unchanged stable
  field/action binding. Owner change/disappearance invalidates all transaction-bound editable or
  actionable descendants before DOM rebinding and deterministically falls back to the stable
  heading, reconciled gridcell, or empty-result after-grid control.
- Completed: Inventoried the real virtual-grid jsdom harness, standalone baseline campaign, their
  immediate support/import boundaries, fixed-row behaviors to preserve, variable measurement and
  expanded-note geometry to retire, and the required revisioned source 016 evidence destination.
- Completed: Regenerated and rebound all four source identities. Scoped formatting, acceptance
  registry/body labels, owner-fallback clauses, exact immediate imports/consumers, path existence,
  manifest, changed-file equality, and protected-path checks pass for all eight authorized files.
- Remaining: Submit final source review cycle 3. Human approval/source-only commit remains pending;
  product work has not started.
- Blockers: No correction blocker. Product work remains intentionally blocked on accepted source and
  human approval.

## Session 2026-08-24 — source approval and freeze commit

- Started: The user selected “Approve and commit” through the source-gate prompt in this session.
- Completed: Recorded factual human approval dated 2026-08-24 in the mutable manifest, evidence
  index, and implementation ledger without changing the four identity-bound source files.
- Completed: The containing dedicated source-only commit freezes the exact approved identities and
  eight authorized paths on `feat/transaction-grid-inspector`.
- Remaining: Post-commit reviewer verification. Product work has not started.
- Blockers: Product work remains intentionally blocked until the reviewer verifies the committed
  source gate.

## Session 2026-08-24 — product slice 2A pure interaction and projection foundation

- Started: Added the reducer test first and observed the expected missing-module failure before any
  production module existed: targeted Vitest failed to resolve `grid-key-intent` and ran zero tests.
- Completed: Added the representable
  `idle | parked | navigating | editing | inspecting | interacting` state domain with non-empty
  canonical selection in every active mode, latest-operation anchor semantics, typed
  drafts/composition/continuous intent, popup owner and return metadata, selection visibility,
  stable presence projection, and typed commands/results/errors.
- Completed: Added a pure mode-by-key reducer for Enter, Space, Escape, F2, arrows, Shift, primary
  and Alt/Option modifiers, Home/End/Page, Tab, printable quick entry, activation cells, native copy
  and select-all precedence, inspector/popup layers, date calendar Tab entry, and composition
  ownership. The full IME state reducer records preview/end data and deduplicates authoritative
  insertion versus fallback by branded sequence.
- Completed: Added workspace-branded monotonic projection generations and a generation-checked
  production-cursor adapter exposing existing `indexOf` plus `idAt`, `readRowAt`, and bounded lazy
  re-iterable `rowsBetween`. Canonical navigation uses cursor coordinates and stable column IDs for
  directional, endpoint, page, and row-major Tab targets; sparse held-row adjacency is never read.
- Completed: Added pure structural reconciliation that discards every old operation, retains a
  surviving stable address or chooses deterministic row/column replacements, returns one inclusive
  one-cell operation or empty `idle`, separates grid/inspector/external focus outcomes, invalidates
  owner-changing inspector controls, clears/retains pins deterministically, and gives G+1 precedence
  over restoration of G resources.
- Completed: Extended `TransactionColumnMeta` with the optional migration seam for immutable
  focus/select/copy/edit/activation/popup/automation capabilities while leaving all current columns
  and runtime behavior unchanged. No existing live key/navigation path was edited.
- Acceptance foundation covered at the pure layer: TGI-STATE-001..003, TGI-STATE-005..006,
  TGI-GEN-001..004, TGI-CUR-001..003, TGI-ACT-001..002, keyboard portions of TGI-CMD-006..024,
  TGI-TAB-001..002, TGI-CONT-001, TGI-IME-001..005, TGI-FOCUS-003..005, and TGI-RECON-001..005.
  Effectful commit/focus/materialisation, pointer, copy, editor, inspector, and rendered-DOM
  acceptance remains for later slices.
- Negative proof encoded: stale-generation expected/actual direction and G-versus-G+1 restoration
  branches have complementary tests; `idAt`/`readRowAt`/existing `indexOf` are checked as inverses
  against real Loro cursor fixtures; bounded ranges are differential against the array pipeline and
  repeated using the real duplicate-updater invocation count; reconciliation properties require
  exactly one equal-anchor/equal-extent operation and reject retained controls after owner change.
  Inverting generation comparison, substituting positional identity, returning old operations, or
  retaining an owner-rebound control makes these tests fail.
- Scope retained: no workspace/controller hook, selection atom, UI/page/editor/inspector/automation,
  virtual-row DOM, E2E/performance artifact, dependency/manifest, generated file, `.claude/**`,
  prior frozen spec, or approved source 016 file changed. Drag/autoscroll was not added because this
  pure slice does not depend on it.
- Checks: scoped oxfmt passed on all 15 authored files; `pnpm format:check` passed across 1,082
  files; `pnpm lint` passed with only the existing React Compiler advisory at
  `TransactionVirtualRows.tsx:99`; `pnpm typecheck` passed; targeted Vitest passed 109/109 tests in
  8 files; full `pnpm test` passed 2,880 tests with 2 skipped in 163 files. Build and E2E were
  deferred exactly as authorized because runtime wiring did not change.
- Remaining: Independent review of the uncommitted slice, then workspace/effect integration and all
  rendered vertical slices. Build and E2E remain deferred until runtime wiring as authorized for 2A.

## Session 2026-08-24 — slice 2A review rejection and idle-reconciliation amendment draft

- Review result: Product slice 2A review cycle 1 was rejected. Review found a conflict in frozen
  authority rather than a code-only correction: pre-focus `idle` neutrality in `TGI-STATE-001` and
  `TGI-INSP-005` conflicts with an unconditional one-cell/focus reading of `TGI-RECON-002` and
  `TGI-RECON-003`.
- Completed: Recorded that independent post-commit verification passed for source commit
  `67227d06de0545ea5f95e7ba827b670f8b0aa97a`, tree `b91833201f005554622d3658cff1a58abf3de578`, with
  all four approved source identities exact.
- Completed: Drafted source amendment `TGI-AMD-001` to preserve empty selection, no active address
  or pin, no transaction-bound inspector owner, and external focus for pre-focus `idle` across every
  structural projection transition. It scopes one-cell/focus reconciliation to already-engaged
  non-idle state and leaves first activation to explicit click/focus/keyboard/Add commands.
- Completed: Kept the approved 146-key base registry unchanged and specified one separate executable
  amendment record with direct initial-load, pre-focus filter/sort, first-activation, engaged
  reconciliation, and complementary negative-mutation evidence.
- Paused: No slice-2A product or test file was modified, reverted, staged, or formatted. A
  consolidated implementation-correction list will be recorded only after amendment review and human
  approval.
- Remaining: Independent amendment review, human approval, and a dedicated docs-only
  source-amendment commit. Product correction remains blocked until that gate passes.

## Session 2026-08-24 — amendment review cycle 1 tree-identity correction

- Review result: Cycle 1 stopped before semantic grading because the recorded source-tree identity
  had one extra trailing character; it did not accept or reject amendment substance.
- Corrected: Plan, progress, and both freeze-manifest occurrences now use canonical 40-character
  tree `b91833201f005554622d3658cff1a58abf3de578`.
- Preserved: The four frozen source identities, the unchanged 146-key base registry plus separate
  amendment key, and every slice-2A product/test byte and status.

## Session 2026-08-24 — amendment review cycle 2 corrections

- Review result: Rejected on three separate Medium findings.
- Medium 1: The proposal made neutral idle depend on never having been activated. Corrected by
  defining `idle` as no current engagement for every workspace history and every ordinary projection
  transition, including rows returning after `TGI-RECON-004`.
- Medium 2: Pending explicit activation and Add/reveal had no generation-safe branch. Corrected with
  exact stable-ID `G+1` re-resolution, bounded materialization, exactly-once fulfillment,
  target/load/register/focus abort to neutral idle, and atomic target-only reveal-pin replacement
  and clearing.
- Medium 3: Amendment evidence accounting was prose rather than executable. Corrected with a closed
  typed record, exact case and mutation ID sets, hash/path/count checks, command cross-references,
  and a required runtime parser.
- Remaining: Independent amendment review cycle 3 and human approval. Product correction remains
  paused; no product or test correction has resumed.

## Session 2026-08-24 — user-authorized amendment correction cycle 4

- Authorization: The user authorized one focused fourth correction cycle. This is correction
  authority only, not amendment approval and not authority to resume product work.
- State model: Added explicit `pending-activation`, distinct from ordinary idle and engaged states,
  with stable target, accepted command identity, generation, reveal/focus phase, exact pending pin,
  and neutral or canonical engaged origin.
- Origin transitions: Neutral-origin failure returns neutral idle. Engaged-origin generation changes
  first reconcile the origin under `TGI-RECON-002/003/004`; target failure returns that reconciled
  engaged or empty result. Pin bounds, fulfillment, and cancellation are origin-scoped and atomic.
- Clearing evidence: Added separate exact cases and mutations for fulfilled-record, fulfilled-pin,
  cancelled-record, and cancelled-pin clearing.
- Negative proof binding: Added baseline HEAD/tree, digest-bound patch, independently derived
  mutated tree, named nonzero failure artifact, exact restored tree, and zero-exit passing rerun
  requirements.
- Independent review: Added a closed reviewer identity/role, independence assertion, decision,
  amendment/evidence/implementation identities, and review artifact attestation. Amendment `PASS`
  requires a matching independent `APPROVE`.
- Remaining at cycle completion: Independent review and human approval. Product correction remained
  paused; no product or test file was changed.

## Session 2026-08-24 — amendment approved for commit

- Independent amendment review cycle 4: `APPROVE`.
- Human decision: The user selected “Approve and commit” on 2026-08-24.
- Approved identity: SHA-256 `bfe997646884ae2b12dcce58af38cafa00e2db79770aa27872832e00a7ee68d0`, 416
  lines, 21,350 bytes.
- Authorized scope: The amendment plus the four mutable accounting files only.
- Current gate: Dedicated amendment commit authorized; post-commit amendment verification pending.
- Product work: Remains paused until the committed amendment passes independent post-commit
  verification.

## Session 2026-08-24 — amendment verification and product slice 2A correction

- Source gate: Independently verified amendment commit `417e103def4e2a2b07caf7171a8e467de9e3bfab`,
  tree `72f583fbcdcf6539fbeb438bdfebc287a4cd20bd`, descends from base source commit `67227d06`,
  contains exactly the approved five paths, and carries the approved SHA-256, 416-line, 21,350-byte
  amendment. All four frozen base-source hashes remain exact. Post-commit amendment verification
  passed and product authority is active.
- State correction: Added history-independent neutral idle, explicit neutral/engaged-origin
  `pending-activation`, exact command/target/generation/phase identity, derived origin-scoped pins,
  atomic replacement, fulfillment, and cancellation, and no pre-fulfillment selection, owner,
  active-cell, inspector, or presence publication.
- Ownership correction: Every engaged state has a nonempty canonical selection; active owner and
  pins derive from that selection. Grid editors accept field-only bindings while inspector controls
  use a separate field/action binding. Continuous quick/full intent retains through activation cells
  and resumes on the next editable cell.
- Reconciliation correction: Rejects equal/older generations; admits a newer failure reconciliation
  only when it exactly equals current generation; preserves idle; rebases pending origin before
  exact target work; returns the reconciled engaged origin on target failure; reports missing prior
  active IDs; chooses removed-column fallback by prior canonical distance with a left tie; and
  retains inspector controls only for an open panel, unchanged owner, and unchanged registered
  binding.
- Draft correction: A surviving grid-editor popup remains active; invalidated row/column ownership
  cancels both popup and draft without exposing its value. Survivor reconciliation avoids a
  redundant row read while preserving typed source errors.
- Key/IME correction: Full-edit Home/End stays native for every modifier family; Alt owns arrows
  only; printable and composition starts do not edit activation/noneditable cells; authoritative
  insertion is sequence-bound; fallback and late paths deduplicate; and a consumed barrier prevents
  ending Enter/Escape from becoming grid commands before explicit resume.
- Projection correction: `rowsBetween` now bounded-materializes one readonly re-iterable array,
  checks generation through completion, and returns typed stale or short-read failure without
  partial success. The public barrel hides generic row-source construction and raw generation
  constructors while retaining the production cursor adapter and existing cursor `indexOf`/ordering
  behavior.
- Direct coverage: 129 targeted tests pass across six files, including all idle transitions,
  post-empty rows-return neutrality, pending neutral/engaged survival and abort, exact pin/record
  clearing, generation equal/older/skipped/reversed/same directions, dynamic allocation fallback
  ties, inspector panel/heading/binding directions, popup survivor/invalidation, IME
  overlap/late/fallback and Enter/Escape barriers, range capture-after-advance, mid-read stale, and
  short source.
- Negative directions encoded: reversing idle synthesis, target fallback, engaged-origin abort,
  generation equality/order, owner/binding retention, popup cancellation, sequence identity,
  fulfilled/cancelled record or pin clearing, and range completion makes a named direct test fail.
  Revisioned executable amendment mutation artifacts remain part of the later final evidence
  campaign.
- Checks: scoped oxfmt passed on 16 authorized paths; targeted Vitest passed 129/129;
  `pnpm typecheck` passed; `pnpm lint` passed with only the existing React Compiler advisory at
  `TransactionVirtualRows.tsx:99`; `pnpm format:check` passed across 1,083 files; full `pnpm test`
  passed 2,933 tests with 2 skipped in 163 files. Build and E2E remain deferred exactly as
  authorized because this correction does not wire runtime behavior.
- Scope: Only the authenticated 13 product/test paths plus mutable `plan.md`, `progress.md`, and
  `evidence/source-freeze/freeze-manifest.md` changed. No page, runtime cell, editor, inspector,
  automation, E2E, performance, dependency, generated, frozen source, or amendment byte changed.
- Remaining: Independent review of corrected uncommitted slice 2A, then workspace/effect integration
  and rendered migration slices. No commit was created in this correction pass.

## Session 2026-08-24 — corrected-core review rejection and focused fix

- Review result: Bounded corrected-core review rejected slice 2A on five verified findings: live
  projection generation authority, stale pending-command completion, noncanonical continuous edit
  intent, inspector survival coupled to active-column survival, and representable editable
  activation key contexts.
- Projection correction: Every live `indexOf`, `idAt`, `readRowAt`, and `rowsBetween` operation now
  checks caller expected generation against snapshot generation and snapshot generation against a
  required live authority before and after source reads. Reconciliation has a separate private
  historical prior-position lookup, validates the next snapshot before even idle publication, and
  supports `G -> G+N` without making old `G` reads live.
- Pending correction: Fulfill, cancel, and abort now validate current pending state, exact command
  ID, and exact generation. Late command-1 fulfillment or cancellation after command-2 replacement
  returns typed `stale-operation` with expected and actual identities.
- Continuous correction: Navigating state canonically stores quick/full continuation. Movement
  through checkbox/action cells retains it and later editable movement exposes the resume entry. The
  typed clearing API admits only pointer selection, inspector entry, Escape, grid-boundary Tab, and
  external blur.
- Ownership correction: Inspector field/action control and inspector-owned popup retention now
  depend on surviving row ownership plus stable registered binding, independently of active-column
  survival. Grid-editor popup and draft invalidation remains row-and-column based.
- Key-context correction: Editable cells and checkbox/inspector activation cells are mutually
  exclusive at the type level through a discriminated union and constructors. Printable and
  composition reducers defensively reject every activation cell; compile-time and runtime-direction
  tests cover both activation families.
- Checks: Scoped oxfmt passes on all 16 authorized paths; targeted Vitest passes 143/143 across six
  files; `pnpm typecheck` passes; `pnpm lint` passes with only the existing React Compiler advisory
  at `TransactionVirtualRows.tsx:99`; `pnpm format:check` passes across 1,083 files; and full
  `pnpm test` passes 2,947 tests with 2 skipped in 163 files. Build and E2E remain deferred exactly
  as authorized because runtime behavior remains unwired.
- Scope: Pure controller, projection, reconciliation, key-model, direct tests, and mutable
  accounting only. Runtime UI/page/cell/editor/inspector/automation, E2E/performance, dependency,
  frozen source, and approved amendment bytes remain untouched.
- Bounded re-review: `APPROVE`. Slice 2A is complete and authorized for its reviewed commit without
  further product changes.
- Remaining: Commit the exact reviewed 16-path slice, obtain post-commit reviewer verification, then
  begin the separately authorized workspace/effect and external-selection integration slice.

## Session 2026-08-24 — product slice 2B workspace and external selection integration

- Direct API gate: Follow-up API review found that `@tanstack/table-core` and
  `@tanstack/react-table` expose the external atom supply/type but no supported React atom
  constructor; the earlier use of the internal reactivity binding was rejected. Frozen `TGI-CUR-004`
  explicitly permits a separately approved direct dependency, and the team lead authorized exact
  `@tanstack/react-store@0.11.1`. Package and lock now record it directly; the workspace uses
  `useCreateAtom<CellSelectionState>([])` once per mount with no transitive import or React state
  mirror.
- Workspace ownership: Added one `TransactionGridWorkspace` controller holding the canonical
  external TanStack cell-selection atom, live structural generation, exact pending
  command/generation/phase, active-origin and pending-target pins, focus registration, typed
  operation failure, and narrow external-store snapshots.
- Runtime wiring: Wrapped the transactions route, configured the controller from the full Loro
  cursor and canonical column IDs, supplied the atom exactly once through `atoms.cellSelection`, and
  removed `TransactionTable`'s writable `focusedId`. Row-checkbox selection, filters, full count,
  cursor order, CRDT mutations, existing editors, aliases, and deep-link scroll remain independently
  owned.
- Add sequencing: Add accepts a full-edit Description activation before CRDT insertion. Structural
  publication rebases its exact target, the 600-row window atomically holds up to active and pending
  pins, the virtualizer scrolls the stable row position, Description registration wakes the focus
  coordinator, verified focus fulfills the same command, and stale/register/focus failures reconcile
  or restore the exact origin.
- Compatibility boundary: The Description editor keeps its draft, alias, popup, blur, Enter, and
  Escape behavior. Its old imperative focus prop/effect was replaced only by a stable input
  registration callback; programmatic Add focus remains suppressed from presence publication.
- Coverage: Real TanStack Table/Virtual fixtures cover the external atom write path, one stable
  `useCreateAtom` atom per workspace mount, structural versus value-only generations, active
  projection reconciliation, stale reveal, delayed registration, verified focus, focus-failure and
  timeout restoration, active-plus-pending pin order and 600+2 bound, exact full Description Add
  target, once-only focus, and row-selection orthogonality.
- Checks: scoped oxfmt and oxlint pass on the 19 product/test paths; targeted Vitest passes 58/58 in
  seven files; `pnpm typecheck` passes; full `pnpm lint` passes with only the existing React
  Compiler advisory at `TransactionVirtualRows.tsx:99`; `pnpm format:check` passes across 1,086
  files; full `pnpm test` passes 2,956 tests with 2 skipped in 164 files; and `pnpm build` completes
  all 17 routes.
- E2E blocker: Retry-free target `tests/e2e/transactions.spec.ts` case
  `Add focuses the new row's description and preserves a multi-row selection` was not run. Port 3000
  is free, but `pnpm exec supabase status` reports the local auth, inbucket, storage, imgproxy,
  edge-runtime, and pooler services stopped; the authenticated prerequisite is unavailable. No
  server was started or shared service state changed.
- Scope: The exact direct `@tanstack/react-store@0.11.1` dependency and corresponding
  `package.json`/`pnpm-lock.yaml` changes are the only admitted dependency changes, making 23 paths
  the expected slice scope. The earlier 21-path handback was stale and incomplete because it
  preceded the supported-constructor correction and omitted those two authorized dependency files.
  No editor-family key-contract migration, inspector, notes, automation, fixed-row DOM, E2E
  scenario, frozen source, amendment, or agent-configuration change. Generated `next-env.d.ts` build
  drift was inspected and restored. No commit has been created; slice 2B remains uncommitted pending
  bounded review.

## Session 2026-08-24 — slice 2B review rejection and focused correction

- Review result: Bounded review rejected slice 2B on eight effect-boundary findings: prior state was
  read against next columns; reconciliation focus intents were dropped; focus/scroll/window
  resources were not restored; legacy live-control focus lost its row pin; reveal could wait
  forever; stale Add could steal newer user focus; pending quick/full entry was discarded; and
  historical allocation columns could first appear only when their row entered the held window.
- Reconciliation correction: Capture previous cursor/projection/interaction before publishing next
  selectable columns, publish generation-correlated gridcell or after-grid focus, register row
  subtrees and the explicit after-grid fallback, and retry from the sole registration/effect
  coordinator using `focus({ preventScroll: true })`.
- Pending correction: Snapshot accepted generation, current DOM focus, scroll offsets, held-window
  start/restorer, and legacy focused transaction. Restore only when that generation remains current;
  begin reveal timeout at acceptance; retain exact command/generation identity; cancel pending work
  on explicit focus/clear; and fulfill into editing state with the accepted quick/full entry.
- Pin and column correction: Derive at most one controller-owned focus-retention pin for
  non-rangeable checkbox/action focus plus one pending target. Reuse the existing filter-scoped
  `nextRetainedHistoricalPeople.personIds` cache as the allocation-column model's sole historical
  membership input; neither the full cursor nor held rows are passed into the final model.
  Equivalent discoveries preserve the exact retained object, so ordinary window movement and nonzero
  value edits do not rebuild selectable columns.
- Coverage added: Removed active allocation-column reconciliation; replacement-row and after-grid
  DOM focus; full-entry fulfillment; once-only `preventScroll` focus; explicit pending
  replacement/clear; same-generation focus/scroll/window restoration; acceptance-time reveal
  timeout; legacy live-control virtual retention without cell selection; fresh selectable-array
  stability; retained-cache identity under equal membership; final column construction without held
  rows; and a real-page scroll that drops the historical source row while preserving the column,
  structural generation, and canonical selection.
- Course correction: The cursor-level allocation census and its direct tests were removed completely
  after review directed reuse of the existing retained cache. The prior 27-path digest and
  verification are superseded. The corrected scope is now 25 paths: the original 23 plus the pure
  historical-cache and full-page historical-window tests.
- Checks after course correction: Scoped oxfmt passes; full `pnpm format:check` passes across 1,086
  files; full `pnpm lint` passes with only the existing React Compiler advisory at
  `TransactionVirtualRows.tsx:99`; `pnpm typecheck` passes; targeted Vitest passes 77/77 across nine
  controller, TanStack/Virtual, retained-cache, and full-page integration files; full `pnpm test`
  passes 2,963 tests with 2 skipped in 164 files; and `pnpm build` completes all 17 routes.
  Generated `AGENTS.md` and `next-env.d.ts` dev/build churn was inspected and restored to tracked
  formatting and HEAD blob `c4b7818fbb2c2c34c24feb1b627ee824507c5600` respectively.
- E2E: Local Supabase Auth health returned 200 after its non-destructive restoration. The first
  invocation correctly refused the explicitly started app because Playwright requires ownership of
  port 3000 with `reuseExistingServer: false`; after releasing that server, the exact retry-free
  one-worker Add/selection and beyond-initial-window virtualization cases passed 2/2 in 13.6
  seconds. Plain `supabase start` was never invoked, and the manually restored Auth container
  remains running.
- Scope constraints: Exact `@tanstack/react-store@0.11.1` remains the only authorized dependency
  change. Production still has no `storeReactivityBindings`, `state.cellSelection`, or
  `onCellSelectionChange`; protected `.claude/**`, frozen specs, and source/amendment identities
  remain untouched. No commit has been created.

## Session 2026-08-24 — slice 2B shortcut-target review correction

- Review result: Rejected on one Medium regression. Row shortcuts read only canonical
  `activeTransactionId`, but focus on non-rangeable checkbox/action/row chrome deliberately clears
  canonical cell selection and survives only as a focus-retention pin. Consequently `d`, Delete,
  Backspace, or `k` could resolve no row or fall through to an unrelated selected row.
- Correction: Expose typed `focusRetentionTransactionId` in the controller snapshot, derived only
  from the distinct focus-retention pin and included in snapshot equality. TransactionTable now
  prefers that actual legacy-control focus for shortcuts, then canonical `activeTransactionId`, then
  the existing exactly-one-selected-row fallback. Canonical active-origin state remains unchanged.
- Coverage: The controller test proves canonical cell focus has no retention ID and legacy focus has
  no active ID but does expose its retained transaction. A real TransactionTable DOM test focuses an
  unselected row checkbox, confirms no row/cell selection, presses `d`, and proves deletion targets
  that exact row.
- Checks: Scoped oxfmt and `git diff --check` pass; targeted controller and DOM Vitest passes 28/28
  across two files; full `pnpm format:check` passes across 1,086 files; full `pnpm lint` passes with
  only the existing React Compiler advisory at `TransactionVirtualRows.tsx:99`; `pnpm typecheck`
  passes; full `pnpm test` passes 2,964 tests with 2 skipped in 164 files; and `pnpm build`
  completes all 17 routes. The exact retry-free one-worker Add/selection and beyond-initial-window
  virtualization E2E cases pass 2/2 in 13.3 seconds. E2E-generated `AGENTS.md` reflow and both
  E2E/build-generated `next-env.d.ts` imports were inspected and precisely restored to their HEAD
  blobs without altering product bytes.
- Scope: Four existing product/test paths plus plan/progress changed relative to the prior stable
  25-path handback; no dependency, cursor, generated, E2E source, frozen spec, or agent
  configuration file changed. No commit has been created.

## Session 2026-08-24 — product slice 3A shared gridcell surface

- Surface: Added one shared `TransactionGridCell` that owns gridcell semantics, stable branded
  address attributes, layout-neutral selection chrome, visible-selection ARIA, roving tabindex,
  generation-checked controller registration, background pointer selection, double-click full-edit
  adaptation, pure key-intent dispatch, and mutually exclusive display/editor branches.
- Column contract: Made immutable interaction metadata required on every visible column. Date,
  description, account, tags, status, allocations, and amount are selectable/copyable with typed
  edit kinds; checkbox and stable `actions` are selectable/non-copyable activation cells; notes
  retain no column-selection coordinate. Clipboard materialisation now excludes selectable
  activation cells by `interaction.copyable` rather than by selection eligibility.
- Controller bridge: Added parked runtime engagement, separate gridcell/editor registrations, typed
  command effects, cursor-projection movement and extension, Tab-boundary parking, and exact
  activation/edit effects while retaining one external TanStack atom and generation-checked focus.
  Add/full-edit focus prefers editor registration; reconciliation prefers gridcell registration.
- Staged compatibility: Wrapped every visible resting column without migrating editor families.
  Legacy controls stay mounted and usable, including native Tab/arrow behavior and portaled popups;
  a focused legacy descendant temporarily removes its wrapper from the tab order. Checkbox/action
  descendants preserve the slice-2B focus-retention pin, row selection remains orthogonal, notes and
  automation wrappers remain mounted, and import account-picker behavior is unchanged.
- DOM and coverage: Removed the row tab stop, preserved exactly 57px resting row height and eight
  direct gridcells without allocations, added stable actions identity, retained exactly one instance
  of each legacy control with no hidden duplicate inputs, and updated presence E2E to focus the new
  checkbox gridcell rather than the now-unfocusable row.
- Regression correction: The first full E2E run exposed seven failures. Two legacy popup/navigation
  failures were caused by React-portal and non-semantic legacy descendants reaching the new surface;
  all legacy descendants and out-of-DOM portal events now opt out. Three presence failures used the
  intentionally removed row focus target and now use the checkbox gridcell. The same corrections
  fixed both alias-option cases. The seven exact retry-free regressions then passed 7/7.
- Checks: Scoped oxfmt passes on all authored TypeScript/TSX and ledger files; `pnpm format:check`
  passes across 1,088 files after generated drift restoration; `pnpm lint` passes with only the
  existing React Compiler advisory at `TransactionVirtualRows.tsx:99`; `pnpm typecheck` passes;
  `pnpm build` completes all 17 routes; full `pnpm test` passes 2,978 tests with 2 skipped in 165
  files; targeted retry-free grid-structure E2E passes 2/2; targeted Add-focus E2E passes 2/2; the
  seven corrected retry-free cases pass 7/7; and final full `pnpm test:e2e` passes 202/202 in 3.9
  minutes.
- Scope: 21 product/test paths plus mutable `plan.md` and `progress.md`. No dependency, frozen spec,
  approved source/amendment, import picker, inspector, editor-family lifecycle, automation, agent
  configuration, or performance artifact changed. Generated `AGENTS.md` and `next-env.d.ts` churn
  was inspected and restored precisely. No commit was created; the handback awaits independent
  bounded review.

## Session 2026-08-24 — slice 3A verification rejection and duplicate-tab correction

- Rejection: Independent verification stopped before code review after one retry-free full E2E run
  failed at `tests/e2e/tab-duplication.spec.ts:72`. `expect.poll` called `page.evaluate` while the
  duplicated page replaced its execution context during navigation. The original volatile
  `error-context.md` was copied before any rerun and is preserved byte-for-byte as
  `evidence/task-3a-review-rejection-1/tab-duplication-error-context.txt`.
- Diagnosis: `chrome.tabs.duplicate()` emits the new page target before its session-history restore
  replaces the main-frame context. `waitForLoadState("load")` can return from the duplicated history
  document's inherited completed load state, so it did not establish that the authoritative
  navigation timing document existed. An exception thrown from the `expect.poll` callback terminated
  the assertion instead of reattaching to the replacement context.
- Correction: Removed the insufficient load-state barrier. `expectCachedDuplicate` now uses
  Playwright's navigation-rerunnable `waitForFunction` and resolves only when the current document
  reports the exact required `{ type: "back_forward", deliveryType: "cache", transferSize: 0 }`
  timing. The resolved value is still compared to that exact object, so the cached-duplicate oracle
  is not weakened and no arbitrary delay, runner retry, or timeout was added. Task 3A product
  implementation bytes were otherwise frozen.
- Focused evidence: The corrected scenario passed once retry-free in 13.6 seconds and then passed
  10/10 retry-free repetitions with one worker in 1.3 minutes. Logs are preserved as
  `evidence/task-3a-review-rejection-1/tab-duplication-focused-run.txt` and
  `evidence/task-3a-review-rejection-1/tab-duplication-repeat-10.txt`.
- Task 3A evidence: Eight targeted unit files pass 150/150 tests. The two grid-structure and two Add
  focus scenarios pass 4/4 retry-free. The final full retry-free `pnpm test:e2e` passes 202/202 in
  4.1 minutes; its complete log is preserved as `evidence/task-3a-review-rejection-1/full-e2e.txt`.
- Full checks: `pnpm format:check` passes across 1,088 files; `pnpm lint` passes with only the
  existing React Compiler advisory at `TransactionVirtualRows.tsx:99`; `pnpm typecheck` passes;
  `pnpm build` completes all 17 routes; and full `pnpm test` passes 2,978 tests with 2 skipped in
  165 files. Generated `AGENTS.md` and `next-env.d.ts` drift was inspected and restored precisely
  after the final dev/build runs.
- Scope: The prior 23-path Task 3A handback plus `tests/e2e/tab-duplication.spec.ts` and four
  preserved evidence files, for 28 paths total. No Task 3A product byte, dependency, frozen spec,
  approved source/amendment, agent configuration, or unrelated test changed. No commit or push was
  created; the correction handback awaits independent re-review.

## Session 2026-08-25 — slice 3A review rejection 2 corrections and stable verification

- Review result: Rejected on three verified findings. Canonical navigation returned an unregistered
  error for offscreen targets instead of using the generation-correlated activation transaction; a
  deep untouched virtual scroll could leave zero mounted gridcell tab stops; and checkbox/actions
  background double-click entered edit because immutable `editKind: "none"` was ignored.
- Virtual navigation: Unregistered canonical targets now enter the existing bounded pending reveal,
  held-window pin, virtual scroll, exact registration, verified `preventScroll` focus, and
  same-generation atomic restoration transaction. Selection publishes only after focus. Unit and
  browser coverage exercise Ctrl+Home, Ctrl+End, ArrowDown, and Tab across unmounted boundaries and
  both successful and failed restoration.
- Idle focus and activation: `TransactionVirtualRows` identifies the first actually mounted keyed
  row, which owns the sole idle checkbox entry stop even beyond the 600-row held-window bound.
  Double-click adaptation now requires an editable capability, so checkbox/actions retain selection
  without entering edit while Description still requests full edit.
- Assigned adjacent gaps: Clipboard rectangles retain non-copyable activation coordinates as empty
  TSV fields while excluding their IDs; the centered checkbox glyph toggles row selection while the
  56px layout-neutral gridcell surface selects the canonical checkbox cell; forward/reverse native
  boundary Tab parks muted retained selection; and the virtual grid publishes logical row/column
  counts, absolute dynamic column indexes, deep matching-order row indexes, and retained notes row
  index/colspan semantics.
- Full-suite correction: The first retry-free full E2E campaign reached 190 passing tests before the
  existing UR-012 edge case exposed stale `aria-selected` paint after a selection moved from Status
  to Checkbox in the same row. Direct probes established that the controller atom and TanStack table
  atom both contained Checkbox while compiled DOM still painted Status. The per-row Subscribe render
  prop had ignored its projected string and re-read opaque `cell.getIsSelected()` calls on stable
  cell identity. It now consumes the projected key, derives current-row selected markers through the
  pure `transactionSelectedCellMarkersFromRowKey`, and passes the selected boolean into each shared
  gridcell. The exact top/bottom checkbox-background edge scenario then passed retry-free.
- Checks: Scoped oxfmt passes on 31 owned TypeScript/TSX paths; transaction-focused Vitest passes
  474/474 in 37 files; targeted grid-structure E2E passes 2/2; targeted UR-012 cell-edge E2E passes
  1/1; `pnpm format:check` passes across 1,088 files; `pnpm lint` passes with only the existing
  React Compiler advisory at `TransactionVirtualRows.tsx:99`; `pnpm typecheck` passes; `pnpm build`
  completes all 17 routes; full `pnpm test` passes 2,990 tests with 2 skipped in 165 files; and
  final full four-worker retry-free E2E passes 202/202 in 3.9 minutes.
- Evidence: Complete logs are preserved under `evidence/task-3a-review-rejection-2/`, including
  `targeted-unit.txt`, `transaction-grid-structure.txt`, `ur-012-cell-edge.txt`, `full-unit.txt`,
  and `full-e2e.txt`. Generated `AGENTS.md` and `next-env.d.ts` drift was inspected and precisely
  restored after every dev/build campaign.
- Scope and status: No dependency, frozen spec, approved source/amendment, import account-picker,
  inspector, editor-family lifecycle, automation, agent configuration, secret, commit, or push was
  added. This remains an uncommitted partial Task 3A handback awaiting independent bounded review.

## Session 2026-08-25 — slice 3A closed-scope corrections and final verification

- Scope closure: Semantic discovery closed with exactly Tasks 47–49 and 54–63. No later editor,
  inspector, notes, automation, copy, activation-ordering, status, or superseded-code work was
  admitted.
- Navigation and selection: PageUp/PageDown use the visible viewport distance. Shift and Ctrl/Cmd
  background selection survives native wrapper focus, row-checkbox selection remains orthogonal, and
  the parked active anchor remains the sole re-entry stop. Ctrl/Cmd+Arrow remains unprevented and no
  longer leaks into legacy DOM navigation from wrappers or caret-boundary text inputs.
- Semantic stops: Actions has one gridcell navigation stop and an explicit Expand target, without
  nested action `data-cell` markers or DuplicateBadge capture. The initial direct-child correction
  omitted allocation subgrid cells; a full E2E failure exposed it, and the final semantic-gridcell
  enumeration preserves the complete dynamic allocation sequence while excluding descendants of
  another gridcell.
- Focus ownership: Verified external blur parks the controller, clears stale pending and
  reconciliation focus, preserves the canonical range when its endpoints survive filtering, leaves
  the external control focused, and excludes row-owned portals. Background pointer return clears the
  stale legacy-descendant latch. Direct shared-gridcell `d`, Delete, and Backspace events do not
  reach row deletion; legacy descendants retain their staged behavior.
- Rendering and activation: Selected-cell paint uses a valid `color-mix(in oklch, ...)` inset shadow
  in light and dark themes. The actions gridcell spans the full exact 57px row and owns top, center,
  and bottom hit tests while its buttons remain visible and reachable. Tags full edit uses an
  explicit legacy activation marker, opens the chooser, and focuses Search tags for empty or
  populated cells through Enter or background double-click rather than focusing Remove.
- Pending transaction integrity: Focus-phase registration timeout stores one absolute start and uses
  only the remaining duration after structural rebases. Pending focus survives the synchronous focus
  event, then verifies connectedness, exact active element, phase, command, and generation before
  fulfillment. Redirected or unmounted focus aborts, publishes no target presence, and restores
  origin selection, DOM focus, scroll, pins, and the page's real held-window start.
- Regression coverage: Added composed Row/GridCell/Table focus-failure coverage, real page-held
  window rollback over 1,600 rows, full dynamic allocation `aria-colindex` ordering, modifier
  background-selection propagation, light/dark computed selected shadow, and actions
  top/center/bottom browser geometry and hit testing.
- Verification: Scoped oxfmt passed on 13 implementation/test paths. Repository `format:check`
  passed all 1,088 files. Lint passed with only the existing React Compiler `useVirtualizer`
  advisory at `TransactionVirtualRows.tsx:107`; typecheck passed; the production build completed 17
  routes; targeted Vitest passed 119/119 in five files; targeted retry-free browser coverage passed
  2/2; full Vitest passed 3,020 with 2 skipped in 165 files; and the final four-worker retry-free
  E2E run passed 202/202 in 3.9 minutes. The failed pre-final E2E run was not counted: the
  allocation navigation defect was corrected and the complete campaign restarted.
- Evidence and hygiene: Complete final logs are preserved under
  `evidence/task-3a-review-rejection-4/`. Every generated `AGENTS.md` and `next-env.d.ts` change was
  inspected and precisely restored. Port 3000 is free and no MoneyFlow Next writer remains. No
  commit or push was created; the stable bounded handback is frozen for independent review.

## Session 2026-08-25 — user-authorized exceptional two-defect correction

- Authority: Exact-server manual review reproduced two final defects after the formally closed
  cycle. The user explicitly authorized one exceptional correction/review cycle limited to those
  findings; no late scout output or semantic expansion was admitted.
- Shortcut ownership: Focusing a row-B checkbox or actions descendant with a retained canonical
  range anchored in row A now parks the range and records row B as focus-retention and shortcut
  authority. The focus-retention pin coexists with row A's active-origin pin until actual focus
  exit. Checkbox/actions by `d`, Delete, and Backspace coverage proves all six combinations delete
  row B, never row A, while preserving the range; real virtualizer coverage proves both pinned rows
  remain mounted after a distant scroll.
- Reverse re-entry: Direct wrapper focus clears the legacy-descendant latch before parked selection
  exposure. The exact browser sequence actions background, Shift+Home, Tab to Expand, Shift+Tab to
  wrapper now leaves the actions wrapper focused at `tabIndex=0`, exactly one gridcell roving stop,
  and the retained nine-cell range fully exposed without collapse.
- Verification: Scoped oxfmt passed on the six implementation/test paths. Focused unit/DOM coverage
  passed 90/90 in three files, and the exact retry-free browser case passed 1/1. Repository
  `format:check` passed all 1,088 files; lint passed with only the existing React Compiler
  `useVirtualizer` advisory at `TransactionVirtualRows.tsx:107`; typecheck passed; the production
  build completed 17 routes; full Vitest passed 3,028 with 2 skipped in 165 files; and the final
  four-worker retry-free E2E run passed 202/202 in 4.0 minutes.
- Evidence and hygiene: Complete logs are preserved under `evidence/task-3a-review-exception-1/`.
  Build and browser runs changed only the known generated `AGENTS.md` and `next-env.d.ts` forms;
  both were inspected and restored exactly with no MoneyFlow Next writer or port-3000 listener
  remaining. No product outside the two fixes, dependency, frozen spec, import picker, editor
  family, inspector, notes, automation, copy, status, agent configuration, commit, or push change
  was admitted.

## Session 2026-08-25 — user-authorized spreadsheet-cell styling

- Authority: Direct user instruction authorized the bounded shared geometry/chrome override recorded
  in
  `specs/016-transaction-grid-interaction-inspector/amendments/002-google-sheets-grid-treatment.md`.
  It replaces the old resting-appearance preservation clause without reopening a human approval
  gate.
- Geometry and rules: Header and body now use gap-free square tracks with matching padding and
  subtle single-width neighboring rules. `TRANSACTION_MAIN_ROW_HEIGHT_PX` and its literal Tailwind
  class establish one 57px main-row DOM/virtualizer contract. Tags clip to one line, allocation
  validation is absolute, actions stay within the main row, and only the bounded checkbox target
  retains negative insets.
- Chrome ownership: `TransactionGridCell` owns hover, focus, selection, validation, and
  field-presence paint without changing layout. Staged inner inputs, selects, buttons, allocation
  controls, and tag controls retain their existing editor behavior while suppressing competing
  resting borders, radii, fills, focus rings, and validation rings.
- Browser coverage: Real Chromium assertions cover light/dark computed paint, square corners,
  contiguous borders, header/body alignment before and after horizontal scrolling, exact 57px rows
  across selected, popup, invalid, long-tag, presence, and expanded-notes states, coordinate
  `elementFromPoint` ownership, exactly-once descendant activation, accessible control uniqueness,
  and one roving gridcell stop. Targeted retry-free coverage passes 4/4 including the cross-context
  presence journey.
- Verification: Scoped oxfmt passes on the 18 product/test/amendment paths. Targeted Vitest passes
  66/66 in five files. Typecheck passes; lint reports only the existing React Compiler advisory at
  `TransactionVirtualRows.tsx:107`; repository format check passes all 1,090 files; the production
  build completes 17 routes; full Vitest passes 3,022 with 2 skipped in 165 files; and the full
  four-worker retry-free E2E suite passes 202/202 in 3.9 minutes.
- Scope and hygiene: Native-control-only display/editor migration remains deferred with the other
  editor-family slices; this work does not claim all editor families are display-first. Inspector,
  notes relocation, fixed virtualization without legacy expanded-row measurement, automation,
  complete gestures/copy, concise status semantics, and superseded-code deletion remain pending.
  Generated `AGENTS.md` and `next-env.d.ts` drift was inspected and restored exactly. No dependency,
  agent configuration, secret, commit, or push change was made.

## Session 2026-08-25 — spreadsheet-cell review cycle 1 corrections

- Verdict and scope: Independent cycle 1 review rejected the first Task 70 handback on exactly three
  Medium findings. The correction remained closed to Tasks 76–78; no speculative descendant,
  editor-family, notes, inspector, automation-semantic, virtualization-measurement, or frozen-base
  source change was admitted.
- Authority accounting: The direct-user decision now lives only at
  `specs/016-transaction-grid-interaction-inspector/amendments/002-google-sheets-grid-treatment.md`
  with the exact title “Amendment 002: Google Sheets Grid Treatment”. Plan, progress, evidence
  index, and freeze manifest point to that path, preserve the no-new-approval-gate decision, and
  state that the executable registry remains the unchanged 146 base records plus the one Amendment
  001 record. A focused unit regression proves the two amendment paths/titles are distinct and
  forbids an invented second executable acceptance ID.
- Parked paint: Whole-cell focus utilities are separate from base gridcell geometry and are omitted
  only in `parked`. Checkbox and actions descendant browser paths now prove both themes have no
  parked selection/focus paint or `aria-selected`, retain exactly one roving stop, and restore the
  exact retained range immediately on wrapper re-entry.
- Rule robot: The existing-rule button now uses square transparent chrome, shared inner-focus
  neutralization, and opacity-only hover/focus feedback while preserving its normal/drift domain
  color, button name/role, one popup activation per click or Enter, and exact 57px main-row
  geometry.
- Verification: Scoped oxfmt passes on the 13 cycle-owned paths. Amendment accounting and gridcell
  unit regressions pass 17/17 in three files; retry-free Chromium parked-range and existing-rule
  robot journeys pass 2/2. Typecheck passes; lint reports only the existing React Compiler advisory
  at `TransactionVirtualRows.tsx:107`; repository format check passes all 1,091 files; and the
  production build completes 17 routes. The first full-unit attempt recorded the known wall-clock
  duplicate-detection ratio at 3.0429 against its strict `< 3` ceiling; the complete quiet rerun
  passes 3,026 tests with 2 skipped in 166 files. Full four-worker retry-free E2E passes 202/202 in
  3.9 minutes. Generated `AGENTS.md` and `next-env.d.ts` drift was inspected and restored exactly.

## Session 2026-08-25 — deterministic duplicate traversal oracle

- Diagnosis: The cycle-one full-unit failure was `expected 3.0429263184511073 to be less than 3` at
  `tests/unit/import/duplicates.test.ts:783`, followed immediately by a complete 3,026-pass/2-skip
  quiet rerun. The implementation had not regressed; the five-sample minimum wall-clock ratio still
  admitted scheduler and worker-load noise.
- Correction: Added optional named `DuplicateDetectionInstrumentation`, called once for every
  existing-row inspection in both the window-start and candidate loops, including the row that ends
  either loop. The public import barrel re-exports the type. Ordinary calls remain output-identical
  because instrumentation is optional and observes traversal only.
- Deterministic oracle: Replaced `fastestElapsedMs` with visit counting at 100, 200, and 400 rows
  with one existing and one imported row per day. Every size must return exactly `size` matches,
  record a positive visit count, and keep both successive visit ratios below three. The separate
  generous three-second smoke remains unchanged.
- Negative proof: A temporary behavior-preserving all-pairs production mutation retained exact match
  counts but produced visit counts `10,398`, `40,798`, and `161,598`; the test failed at ratio
  `3.9236391613771877`. The production file was restored byte-for-byte to SHA-256
  `103ffa49f069f5640e6f35fce025552bbababb8ab65a31370bdb707f5ac2f25f`, and the focused target passed.
- Repetition: Twenty independent serial one-worker retry-free focused processes passed 20/20. Ten
  retry-free shuffled 32-worker full-unit runs with seeds `79001` through `79010` each passed
  166/166 files and 3,026 tests with 2 skipped. Every run began and ended on the same 29-path
  canonical digest `3681ea24f7fde087a3805c688df035205976557a5f6e3642baece9552027f547`; no campaign
  drift occurred.

## Session 2026-08-25 — shuffled identity-test ownership correction

- Campaign identity correction: The first 10-seed campaign preceded the Task 79 plan/progress
  accounting. Transcript-byte reconstruction proves the only delta from campaign digest
  `3681ea24f7fde087a3805c688df035205976557a5f6e3642baece9552027f547` to final digest
  `67e5bf680d3456aef4e854bdb7392ec1b9c965a8ad4d43520f254e27585b5096` was the 1,123-byte plan
  insertion and 1,896-byte progress insertion. Because those were real byte changes, the first
  campaign cannot license the later handback.
- Shuffled failure: The final-tree restart passed seeds `79001` through `79005`; seed `79006` then
  failed `unlockWithSeed > stores session on unlock` because the session map was unexpectedly empty.
  Later seeds are not acceptance evidence, and the campaign restarts from run one after correction.
- Root cause: The identity roundtrip property discarded the Promise returned by
  `fc.assert(fc.asyncProperty(...))`. Vitest advanced to later same-file tests while property
  iterations continued clearing `mockSessionStorage`, so the property could erase the session after
  unlock stored it. A repository sweep found the same discarded async-property Promise in two
  keypair tests.
- Correction: All three callbacks are now async and await `fc.assert`; no production or test-global
  configuration changed. Exact shuffled seed `79006` passes all 15 identity tests in the hazardous
  order, and the corrected identity/keypair pair passes 25/25.
- Negative proof: A temporary production mutation bypassed unlock session persistence and the
  existing storage oracle failed at `tests/unit/crypto/identity.test.ts:171`. Production
  `src/lib/crypto/identity.ts` was restored byte-for-byte to SHA-256
  `5851647a592d9ba7d5ccecb1f95a7f1cb735dd588d587231b5f4c265f5c241ea`; create-without-store, explicit
  store, and unlock store then passed 3/3.
- Restart gate: The complete 10-seed shuffled 32-worker campaign must restart on the corrected final
  digest with exact before/after attestations for every seed before mandatory final gates.

## Session 2026-08-25 — Add reveal reconciliation correction

- Cycle-2 failure: The focused changed E2E reached 53/54 before the date-filter Add arm timed out at
  `tests/e2e/helpers/settlement.ts:301`. The preserved transcript records target
  `886e4b4a-05e6-4cc8-964c-a7b3bc36706d` absent across 34 resolutions for 15 seconds after filters
  had settled to All time and the toolbar showed one transaction, while the pre-existing default row
  held focus. The original Playwright error-context had already been removed and is not cited as
  available.
- Root cause: Filter reset can publish an intermediate projection containing existing row A but not
  newly accepted Add target B. Reveal reconciliation treated B as permanently disappeared, returned
  neutral idle or the reconciled origin, cleared the pending command, and had no target left when
  the insert projection later published B. Task 70 presentation timing exposed the pre-existing
  controller atomicity defect but did not cause it.
- Product correction: Pending target-column survival and target-row materialization are separate.
  Removed columns and focus-phase row disappearance retain immediate typed abort semantics.
  Reveal-phase row absence instead rebases the exact command ID, target, phase, pins, and neutral or
  engaged origin onto each new generation; later materialization continues through existing
  reveal/scroll/register/focus/fulfill exactly once. Controller publication retains the original
  `acceptedAt`, and the new fake-timer direction proves repeated rebases still abort at the original
  absolute load deadline and restore the reconciled origin.
- Harness correction: `addEmptyTransaction` unions explicit known pre-existing IDs with mounted IDs,
  rejects a known returned ID, and keeps generic mounted-ID behavior for callers without explicit
  history. The excluding-filter matrix maintains one cumulative Set through all seven arms, proves
  every return fresh before adding it, settles filter removal and exact count, then requires exactly
  one focused Description row with that stable ID. The unfiltered three-Add path proves the opposite
  branch remains fresh.
- Focused evidence before ledger freeze: Reconciliation/controller/Add-focus Vitest passes 75/75;
  ordinary and excluding-filter Add E2E passes 2/2. A deferred-insert browser mutation passes the
  corrected controller and fails the old reconciliation specifically in the date arm. Restoring the
  old absent-target branch fails all three new reveal unit directions. Removing known-ID/freshness
  protection while forcing old origin restoration also fails the date arm. Mutation transcripts and
  preserved failure copies are under `/tmp/task81-*`; every mutated product/helper file restored to
  identical before/after SHA-256.
- Final campaign gate: No further plan/progress edit is permitted unless a separately authorized
  correction exception supersedes this gate. On one unchanged canonical tree, run focused Task 81
  checks, the exact 50-repeat formerly failing E2E, 10 independent changed-set runs, three
  independent full E2E runs, complete Task 79 and Task 80 reruns, then scoped formatting, typecheck,
  lint, build, full unit, full E2E, and diff checks. Every run requires matching canonical
  path-NUL-bytes-NUL digests before and after; any drift restarts that affected campaign.

## Session 2026-08-25 — Tasks 82–87 exceptional bounded correction

- Exception and scope: The orchestrator authorized one correction cycle around the frozen Task 70
  handback at HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, 35 paths, digest
  `4e135a077261334ee27e4d61f02dac8b2a24ce7ede4ef1a433329863d0714b3f`. Authority is closed to the six
  Tasks 82–87 findings. Frozen base sources, executable 146+1 accounting, duplicate instrumentation
  containment, old complexity comments, inspector work, and virtualization work remain untouched.
- Task 82: Mutable evidence now records Amendment 001 commit
  `417e103def4e2a2b07caf7171a8e467de9e3bfab`, tree `72f583fbcdcf6539fbeb438bdfebc287a4cd20bd`,
  passed post-commit verification, and active product authority. Amendment 002 remains a distinct
  non-executable direct-user decision. Accounting tests reject pending/paused language, Amendment
  001 contamination of Amendment 002, and any 146+1 registry change.
- Tasks 83–84: Pending requests now retain an abort-only current-generation canonical gridcell focus
  only for grid-owned engaged origins, while the target retains sole focus authority until abort.
  Same-generation abort still restores exact captured resources; newer-generation abort skips stale
  coordinates; neutral and parked/external origins cannot steal focus. An immutable
  `materializationDeadlineAt` is captured at acceptance, preserved through rebases, used by timer
  scheduling, and checked synchronously by `markRevealApplied`. Separate timeout, focus-failure,
  callback-first-late, and just-before-deadline directions are present.
- Tasks 85–86: Account/status primitive hover utilities merge away in both themes while outer-cell
  hover remains. Parked Expand/Delete descendants receive a solid token-based focus-visible outline;
  the wrapper stays unpainted and retains one roving stop. Browser coverage follows native Tab and
  Shift+Tab boundaries, restores the exact retained range, confirms notes auto-focus on activation,
  and exercises Delete confirmation without deleting the row.
- Task 87: Both the legacy template builder and TanStack column meta now use a shared effective
  120px actions track. The browser fixture imports the same transaction twice to produce a real
  duplicate badge, then proves duplicate, Expand, and Delete fit without clipping or overlap in a
  57px row, header/body tracks remain aligned before and after genuine horizontal scroll, and all
  actions activate.
- Focused pre-mutation evidence: Controller/accounting/style/allocation focused Vitest passed 50/50;
  the later sizing/style/table-model run passed 26/26. Account/status light/dark hover passed in the
  focused Task 70 browser journey. The corrected parked action journey passed, and the duplicate
  actions geometry journey passed after correcting both active sizing authorities and using an
  actually overflowing viewport. Browser failure contexts preceding those corrections are preserved
  under `/tmp/task82-87-*`; generated `AGENTS.md` and `next-env.d.ts` drift was inspected and
  restored after each run.
- Remaining pre-freeze evidence: Mutation-grade stale accounting, missing and premature abort
  fallback, missing synchronous deadline enforcement, missing hover neutralization, missing parked
  descendant focus, restored parked wrapper paint, and restored 88px sizing. Preserve each failure
  outside the repository and restore exact bytes. Then freeze the final path set and canonical
  digest; no further repository edit is allowed. Run focused checks, Task 81's 50-repeat and ten
  changed-set campaigns, three full E2E runs, complete Task 79 and Task 80 campaigns, scoped
  formatting, typecheck, lint, build, full unit, full E2E, and final diff/process/generated checks
  with identical before/after digest attestations. No commit, push, or implementor-owned manual
  smoke is authorized.

## Session 2026-08-25 — Task 88 realtime fixture and oracle correction

- Repeated failure: The first shuffled seed-79005 campaign and two ordinary `pnpm test` runs failed
  at `tests/integration/realtime-origin-controls.test.ts:152`. The third unfiltered PostgREST
  request returned a non-array HTTP 500 response while the same file passed 9/9 alone. All three
  failure logs remain under `/tmp/task82-87-*`; the 39-path digest stayed
  `ecf8513ed57ac2348c127414c85a4f588f344f69e0b564719ce9df902baecd11` before and after.
- Root cause: The request globally enumerated `vault_ops?select=id,vault_id`; live diagnostics
  proved SQLSTATE 57014 statement timeout under full-suite load. RLS calls `realtime_grant_allows`
  per candidate, while the shared database held 298,217 leaked operations. Filtered vault-ID
  requests complete in milliseconds. The fixture seeded no foreign operation, so foreign denial was
  vacuous. Cleanup omitted `vault_ops`; `ON DELETE RESTRICT` rejected the vault delete, but psql
  lacked `ON_ERROR_STOP` and returned success after continuing, leaking every fixture run.
- Product-test correction: The fixture now retains one own and one foreign operation ID and proves
  both exist independently. Its hostile request uses a URL-encoded candidate set over those exact
  two vault IDs, requires HTTP 200 before JSON parsing, requires the own operation, rejects the
  foreign operation, and requires every returned row to belong to the granted vault. The global
  enumeration is gone rather than tolerated or retried.
- Cleanup correction: `cleanUpVaultFixtures` now executes one fail-fast transaction, transactionally
  disables only `vault_ops_append_only` around the fixture-scoped operation delete, then deletes
  grants, memberships, and vaults with FK enforcement active. A regression creates an isolated
  vault/op/grant/second-membership fixture, proves all rows exist, requires every scoped count to be
  zero after cleanup, and confirms unrelated suite operations remain.
- Focused evidence: Corrected integration passes 10/10 in 6.9 seconds; typecheck passes. Removing
  the operation delete in an external copy against the throwaway database fails on
  `vault_ops_vault_id_fkey`, and both the test and afterAll fail closed. The cloned helper restored
  to SHA-256 `e4556b08aaef925dcd4fe832278d29d177c7d0f60b6d510de1bedf3053d70638`.
- Fresh-database evidence: A named throwaway database received schemas `extensions`, `realtime`,
  `auth`, `graphql`, `graphql_public`, and `vault`; `uuid-ossp` and `pgcrypto`; platform roles;
  `realtime.messages`, `realtime.topic`, replaceable baseline policies, and publication
  `supabase_realtime`. Migrations 005–010 replayed under `ON_ERROR_STOP=1`. Public table, RLS,
  policy, and publication inventories matched live exactly. A temporary PostgREST service returned
  only the seeded own operation for the encoded two-vault candidate set. Bypassing only the
  throwaway SELECT policy returned both seeded operations and failed the foreign-denial oracle; the
  policy was restored byte-equivalently. The temporary service stopped and only the named throwaway
  database was dropped.
- Shared-database proof: Before and after Task 88 throwaway work, the shared database remained
  database `postgres`, OID 5, with `vault_ops=298217`, `realtime_grants=239372`,
  `vault_memberships=61845`, `vaults=60612`, and relevant policy digest
  `94c0b518b300d09c079066863e3e79a1`. Three fixtures leaked by the initial append-only cleanup
  failure were identified solely as this run's post-snapshot IDs and removed exactly; counts then
  returned to the pre-Task-88 snapshot. No shared policy, broad row set, volume, or database was
  reset.
- Final campaign gate: After scoped formatting, freeze the expanded path set and canonical digest;
  make no further repository edits. Run 20 independent focused candidate-set processes against the
  existing polluted shared database, three ordinary full-unit runs, shuffled seeds 79001–79010, all
  Tasks 82–87 campaigns, Task 81 Add and E2E campaigns, Task 79/80 positive and external-clone
  mutation campaigns, then mandatory typecheck/lint/format/build/unit/E2E/diff/process/generated
  checks. Every accepted run records identical before/after digests. No commit, push, or manual
  smoke is authorized.

## Session 2026-08-25 — Task 95 final review correction

- Scope: One bounded correction cycle addressed F1–F10 without changing the 120px actions-track or
  57px main-row contracts, committing, pushing, broad-restoring, or touching shared database state.
- Focus authority: Real reconciliation-owned gridcell focus no longer dispatches an ordinary user
  focus transition, so typed failure and restored editing survive. Empty reveal rebases retain an
  abort-only after-grid intent. Newer-generation gridcell fallback scrolls into view before focus.
  Connected external focus retires delayed fallback instead of being stolen on late registration.
- Activation and presence: Account, status, and allocation carry explicit full-edit markers used by
  gridcell Enter and blank-background double-click. Transaction presence now preserves
  collaborator-to-field attribution and each rendered cell selects the first editor for that exact
  field rather than the row-global first editor.
- Chrome and geometry: Parked checked/unchecked checkboxes and tag-remove controls receive visible
  inset outlines. The nested calendar trigger is square and transparent at rest and hover in both
  themes. Armed Delete is a contained 48px control inside the unchanged 120px track. Expanded notes
  uses gapless, zero-padding outer tracks with a matching left border and moves the 16px inset
  inside the spanning notes cell, leaving scroll width unchanged.
- Focused positive evidence: The complete controller/reconciliation/real-gridcell unit set passed
  93/93 in three files and the 1,000-row offscreen fallback browser journey passed retry-free. The
  authorized chrome unit path passed 10/10 after component assertions were moved out of the
  temporary extra test path. Presence unit/integration and browser, full-edit browser, descendant
  chrome browser, armed-actions geometry, and expanded-notes geometry focused runs passed.
- Negative evidence: Named failures under `/tmp/task95-*` grade controller focus suppression,
  deferred after-grid fallback, reveal-before-focus, delayed external ownership, explicit
  activation, field projection, per-field rendering, parked checkbox focus, tag-remove focus, legacy
  armed Delete, date-trigger chrome, and legacy notes gap/padding. The legacy notes mutation
  measured a 31px column-2 displacement; all production mutations were restored before the final
  gate sequence.
- Remaining: Scope-format authored paths, then run typecheck, lint, format check, build, full unit,
  full retry-free E2E, and diff checks. After all writers stop, inspect and restore only generated
  `AGENTS.md` and `next-env.d.ts` drift, verify no repository test process/listener/writable file
  descriptor remains, and record duplicate canonical digest attestations. No commit or push is
  authorized.

## Session 2026-08-26 — Tasks 108–113 authoritative interaction modes

- Baseline: Re-attested HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, exactly 46 changed paths,
  and canonical path-NUL-bytes-NUL digest
  `7b5a632043e9528d3d85a5d2375d3551f8f713de896133c7c2486f627f11680c` before edits.
- Accounting correction: Prior green Task 3A, Task 70, Tasks 82–88, and Task 95 gates covered a
  transitional implementation. Canonical controller state and outer-cell presentation were real, but
  permanently mounted legacy controls still independently owned focus, drafts, arrow navigation, and
  focus-derived presence. Those passes did not prove completed visible-selection, hidden-selection,
  or editing modes across the production grid.
- Authorized correction: Task 109 migrates all editable families to controller-owned display/editor
  transitions; Task 110 closes terminal fallback, external-focus, owner-scoping, and direct
  offscreen reconciliation races; Task 111 publishes controller-derived viewing/editing presence
  including Notes and 89-character allocation fields; Task 112 restores canonical wrapper arrow
  navigation, including Actions; Task 113 closes armed-Delete, Date containment, and expanded-Notes
  border geometry.
- Evidence discipline: Tasks execute in order 109, 110, 111, 112, 113 and close only after focused
  production-path tests pass. Regressions must mount real participants and fail against predecessor
  behavior or an isolated neutralizing mutation. Preserve mutation failures under `/tmp/task108-*`,
  restore exact bytes before passing reruns, then run Task 114's full static/build/unit/E2E/manual
  and independent-review campaign on one frozen digest.
- Safety: No commit or push is authorized. Do not change Task 88 cleanup/security behavior, reset
  the shared Supabase database, delete historical rows, broad-restore the shared tree, or use
  Playwright debug/UI/headed/show modes. Inspect and restore only generated `AGENTS.md` and
  `next-env.d.ts` after their exact writers stop.
- Task 109 milestone: Completed authoritative display/editor branching, actual editor focus,
  retained printable quick-entry text, and focused commit/cancel/movement coverage for Date,
  Description/Alias, Account, Status, Tags, Amount, and Allocations. Checkbox and Actions remain
  activation-only. Focused production E2E passed for the migrated editor families; named mutations
  under `/tmp/task108-task109-*` kill dropped quick-entry and predecessor behavior.
- Task 110 milestone: Completed terminal after-grid sidecar consumption, BODY/external blur
  ordering, exact portal/header ownership retirement, and reveal-before-`preventScroll` structural
  focus. Focused unit and production portal E2E passed; named terminal, portal, reveal, and BODY
  mutations fail under `/tmp/task108-task110-*`.
- Task 111 milestone: Completed. Controller-derived navigation/viewing and
  actual-editing/exact-field publication, expanded-Notes publication/rendering, same-row
  Notes/Amount attribution, and bounded 89-character allocation fields remain covered. The former
  asymmetric-delivery diagnosis was narrowed at the raw boundary: the original owner received and
  decrypted peer envelopes until Supabase closed its Presence channel with
  `ClientPresenceRateLimitReached`; connection-order controls, distinct per-tab Presence keys,
  unrevoked sibling grants, token lifecycle, and page cleanup ruled out upstream isolation. Supabase
  Realtime v2.112.6 counts every client Presence message against five calls per fixed 30-second
  window before its unchanged-payload check. `EphemeralPresenceManager` now coalesces to the latest
  state with a strict 8-second gap between actual sends, leaves one event of window headroom,
  retains awaitable callers, suppresses pre-subscribe sends, and cancels pending trailing work on
  teardown. Focused transport/manager coverage passes 31/31; strict-delay removal and
  dropped-trailing mutations fail; typecheck, scoped lint/format, build, and diff-check pass. The
  retry-free production multi-peer journey passes 1/1 in 32.1 seconds, and Realtime logs contain no
  rate-limit closure for that acceptance window. The journey's Notes observer now follows its real
  programmatic focus to the shared row rather than asserting the obsolete row it left.
- Task 112 milestone: Removed the table-level legacy DOM arrow owner, made canonical wrapper arrows
  land on and return from Actions, let forward Tab enter Actions descendants while reverse Tab stays
  canonical, and made explicit Actions activation focus its first descendant. The focused production
  structure journey passed retry-free; 78 focused unit cases passed; typecheck, scoped formatting,
  and diff hygiene passed. Restoring legacy table navigation fails on an Expand-button ArrowLeft,
  reverting native Actions Tab fails the pure reducer regression, and removing the explicit
  activation fallback fails the real gridcell regression. Named evidence is preserved under
  `/tmp/task108-task112-*`, and each production mutation was restored byte-for-byte.
- Task 113 milestone: Expanded Notes now carries continuous 1px left, checkbox-track, and right
  rules aligned to the main grid in light and dark themes without changing scroll width. Production
  browser geometry prints and proves the localized `1/27/1988` Date is fully visible in display and
  edit modes, stays left of its 24px trigger, and preserves the 120px track and 57px row. Armed
  Delete prints and proves exact 48px by 32px geometry inside the unchanged 120px Actions track
  while title and `Delete` copy remain unchanged. The focused journey passed 3/3 retry-free
  repetitions; 31/31 focused units, typecheck, scoped formatting, and diff hygiene passed. Isolated
  80px Date-track, removed Notes-rule, and 40px armed-Delete mutations each fail their exact
  geometry oracle under `/tmp/task108-task113-*` and were restored byte-for-byte.
- Current task: Task 111 is complete. Task 114 remains pending and may begin only under its own
  final-verification authority.

## Session 2026-08-26 — Task 118 Gate 9 full-E2E correction

- Baseline and classification: Task 114 Gate 9 repetition 1 was 157/203 with 46 failures. Preserved
  screenshots and source-contract review established 30 stale display-first oracles and 16
  product-backed resting-surface regressions rather than one shared timeout cause.
- Corrections: A shared transaction-grid E2E helper resolves stable row ids, canonical gridcells,
  explicit editor activation, resting-display assertions, and allocation columns by logical header
  index. Affected date, alias, import, settlement, realtime, rule-control, parity, and duplicate-tab
  journeys now address the display/editor lifecycle directly. Production preserves compact same-year
  dates, provenance at rest, stable rule-proposal hosts, invalid-editor focus, and alias-modal
  fallback focus.
- Residual diagnosis: The first corrected full suite reached 199/203. The filtered import role
  locator was measured disconnected during virtual replacement and now stabilizes by transaction id.
  Description-rule `dblclick()` was measured to hit the nested robot button at the cell locator's
  centre and now activates the outer cell by focus plus Enter. Tags geometry now selects through the
  stable proposal anchor. Correct activation exposed two simultaneously open rule surfaces; existing
  matching rules now reuse the robot while unmatched edits alone open a proposal.
- Negative evidence: The predecessor import locator failed 2/4 under parallel load in
  `/tmp/task118-import-residual-repro.log`; the measured nested-button activation and direct-child
  geometry failures are in `/tmp/task118-residual-baseline.log` and
  `/tmp/task118-transaction-rule-hit-diagnostic.log`. Reintroducing both description rule surfaces
  fails because `transaction-rule-proposal-popover` intercepts the robot apply control in
  `/tmp/task118-mutation-rule-surface-collision-fail.log`; exact restoration passes in the paired
  green log. Earlier mounted-editor, invalid-editor, alias-focus, and resting-proposal mutations are
  preserved under `/tmp/task118-mutation-*`.
- Focused evidence: The eight originally affected suites passed 68/68 retry-free with four workers
  in `/tmp/task118-focused-e2e-run5.log`. The four residual tests passed 4/4 together, then 16/16 at
  four parallel repetitions in `/tmp/task118-residual-focused-repeat4.log`.
- Final matrix: format passed; lint passed with the accepted `TransactionVirtualRows` React Compiler
  warning; typecheck and production build passed; 166 unit/integration files passed with 3,076 tests
  passed and 2 skipped. The complete retry-free four-worker E2E suite passed 203/203 in 4.1 minutes;
  evidence is `/tmp/task118-final-full-e2e-run2.log`. No six-repeat acceptance campaign ran.
- Pre-ledger verified identity: After every exact writer/listener stopped, the parent inspected and
  normalized only Next-generated `AGENTS.md` and `next-env.d.ts` drift. Independent re-attestation
  was HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, HEAD tree
  `b555e5ac82fd92d81e86671c55e45686ad5b3df5`, 71 status paths, canonical digest
  `51a86147728cb001c4ce1600fd12ed2ace769a2105f61f7961a73aa6c00fd05f`, generated status empty, no
  repository test writer, and no port-3000 listener. The final handback attests the post-ledger
  digest because recording these durable entries necessarily changes their own bytes. Task 118 is
  complete without commit or push; Task 114 may resume independent acceptance.

## Session 2026-08-26 — Task 119 Gate 9 filtered-row drag correction

- Failure: Task 114's first post-Task-118 Gate 9 repetition passed 202/203 and failed only the
  filtered-row `dragenter` overlay assertion in `tests/e2e/import.spec.ts`. The preserved final UI
  contained exactly one visible `P15 transaction drop 0059` row, so the eventual screenshot did not
  prove the dispatch-time node was still connected to the drop owner.
- Classification: The unchanged predecessor failed 1/8 under four workers in
  `/tmp/task119-baseline-repeat8.log`. Instrumented 16-repeat evidence in
  `/tmp/task119-dispatch-diagnostic-repeat16.log` produced two failures with `connected:false`,
  `ownerContainsTarget:false`, and `defaultPrevented:false` despite `transferTypes:["Files"]`; all
  fourteen passing dispatches were connected, contained, and default-prevented. This is a
  load-dependent virtual-row locator race, not product drag behavior or invalid file data.
- Correction: `dispatchImportDrag` can now resolve a transaction ID within the stable outer drop
  owner and returns a typed receipt. The filtered-row journey polls only while the current
  descendant is absent, then atomically queries and dispatches in one owner evaluation and requires
  connected containment, `Files`, and `defaultPrevented:true` before asserting the overlay or
  navigation. No production file changed.
- Negative and focused evidence: The predecessor and diagnostic runs supply the required failing
  direction. After the final helper bytes were frozen, the corrected journey passed 32/32 with four
  workers and retries disabled in `/tmp/task119-final-focused-repeat32.log`; the authored 71-path
  digest remained `99ed00d1abdda1c3939b9e69f70b2e155d12b61d0edec276a68d647dcad03efa` before and
  after.
- Final matrix: Repository format passed across 1,092 files; lint passed with only the accepted
  `TransactionVirtualRows` React Compiler warning; typecheck passed; the production build completed
  all 17 routes; 166 unit/integration files passed with 3,076 tests passed and 2 skipped; and the
  complete retry-free four-worker E2E suite passed 203/203 in 4.1 minutes. Evidence is
  `/tmp/task119-final-{format-check,lint,typecheck,build,unit,full-e2e}.log`.
- Hygiene: Exact Next/Playwright writers were stopped before generated-file normalization requests.
  The final handback attests the post-ledger identity after generated files are clean. Task 119 is
  complete without commit or push; Task 114 retains independent acceptance authority.

## Session 2026-08-27 — Task 125 final Task 114 blocker corrections

- Atomic editor and IME unit: Controller-owned validation, commit, cancellation, and movement retain
  one save boundary without a duplicate blur write. Continuous quick/full editing survives mounted,
  offscreen, Checkbox, and Actions destinations, and the pure reducer carries the full composition
  start/update/end and finalized-grapheme lifecycle.
- Presence scheduler and popup unit: Popup Presence and focus restoration remain exact-owner scoped.
  Rate limiting is enforced at actual transport invocation rather than request time; coalesced
  latest state survives reconnect, while teardown cancels stale trailing publication.
- Add-silent Presence unit: Added one typed, Description-only exact-address deferred-Presence gate
  that survives pending activation and fulfilled programmatic focus. Focus, timers, unrelated editor
  gestures, and `isTrusted` do not release it; captured pointer/key/`beforeinput` in the exact
  editor or editor exit does. Four focused Vitest files passed 116/116, the strengthened
  positive-predecessor browser journey passed 1/1 retry-free in 34.6 seconds, and mutations removing
  pure projection suppression or pointer capture failed before exact restoration.
- Registration narrowing unit: Registration wake authority is the exact pending or reconciliation
  request object. Unrelated and unregister cell/editor/row/after-grid churn does not notify the
  broad snapshot; the exact target wakes once across child-first editor/cell/row registration, while
  row query fallback and after-grid-only focus remain operational. Focused controller coverage
  passed 62/62. Removing authority deduplication produced three notifications instead of one;
  removing exact editor-address filtering produced one notification instead of zero. Both mutations
  were restored.
- Task 115 source mutation: Froze `TransactionRow.tsx` at SHA-256
  `fd2d7aa89fc6adc2d015735cea86eadc5d9f44376a5f4776bbd1f85f31fb5108`, 52,488 bytes, on HEAD
  `9be122b1313f3770ab30deee81562a9a74a00d8f`, HEAD tree `b555e5ac82fd92d81e86671c55e45686ad5b3df5`,
  85 status paths, and canonical path-NUL-bytes-NUL digest
  `b9c0d80365423dde25af3c4c2264b90c64ead80690058b5a6c7e2e7d809aa6a3`. The only mutation changed
  `if (activationDescendant) onActivationDescendantFocus?.();` to
  `if (activationDescendant) return;`. Exact focused Vitest then failed 1/1 at
  `cell-selection-gestures.test.tsx:634`, receiving `navigating` where `parked` was required. After
  byte-for-byte restoration, the same focused test passed 1/1 and all pre/post HEAD, tree, path
  count, canonical digest, target hash, and target byte-count attestations matched;
  `git diff --check` passed.
- Immutable evidence: The complete mutation diff, source snapshot, failing and restored-green logs,
  pre/mutated/post identities, restoration attestation, and artifact checksums are sealed read-only
  at `/tmp/task125-task115-activation-descendant-mutation-20260827/`.
- Scope: This mutation unit touched no E2E source, generated file, database state, dependency,
  secret, commit, or push.
- Popup lifecycle diagnosis: The first full correction run failed 33 E2E tests because popup
  ownership was still `interacting` when editor completion ran. Returning popup ownership first
  reduced the next complete run to one failure: selecting the already-current `For Review` status
  closed Radix Select without `onValueChange`, leaving the editor mounted.
- Final correction: Popup/listbox/calendar Escape remains layered and returns focus to the retained
  editor. Successful account/status/date selection and account creation return popup ownership
  before finishing the editor; tag Escape retains the editor; allocation proposal visibility derives
  from controller state. Status item pointer-up, Enter, and Space now finish an already-selected
  value without writing it again. New component tests pass 3/3 and fail without that same-value
  activation path; canonical settlement Example H passes 1/1 retry-free through the production UI.
- Frozen implementation identity: HEAD `9be122b1313f3770ab30deee81562a9a74a00d8f`, 88 status paths,
  canonical path-NUL-bytes-NUL SHA-256
  `45908eee4d490aeb27c9967e7f08a3ee309b90f459c1e45e4ebbee0a0aeffb37`. The same identity matched
  before and after every accepted gate and after generated-file normalization.
- Final serial matrix: scoped oxfmt passed 88 paths; `pnpm format:check` passed 1,095 files;
  `pnpm typecheck` passed; `pnpm lint` passed with only the accepted
  `TransactionVirtualRows.tsx:107` React Compiler advisory; `pnpm build` completed all 17 routes;
  `pnpm test` passed 168 files with 3,114 passed and 2 skipped; and retry-free `pnpm test:e2e`
  passed 203/203 in 4.2 minutes using four workers with `CI` unset.
- Boundary and evidence: Exact repository Next/Playwright writers were absent and port 3000 was free
  after build and E2E. Inspected build drift affected only `next-env.d.ts`; inspected E2E drift
  affected only `AGENTS.md` and `next-env.d.ts`; each was normalized only after its writer stopped
  and the 88-path digest re-attested. Complete logs and identities are preserved under
  `/tmp/task125-full-matrix-20260827/` for read-only sealing.
- Superseded status: Fresh Task 114 acceptance found a later TGI-IME-005 defect, so the 88-path
  `45908eee4d490aeb27c9967e7f08a3ee309b90f459c1e45e4ebbee0a0aeffb37` matrix is historical evidence
  only and Task 125 is reopened. None of its gates can be reused after the correction.
- IME cancellation failure: Grid-origin `compositionstart` entered quick editing with an empty
  draft. Empty `compositionend` correctly entered the consumed barrier, and the immediate ending
  Enter stayed composition-owned, but the resume microtask wrote inactive composition back into
  `editing`. The production-shaped reactive DOM regression failed on current bytes with `editing`
  instead of `navigating`, leaving the empty editor mounted.
- Typed correction: Active composition now carries `emptyCompletion: editing | navigating`, and
  consumed composition carries the same typed `resume` authority. Grid-origin activation uses
  `navigating`; composition started inside an existing editor uses `editing`; finalized insertion
  always resumes editing. The controller calls `finishEditing` only when a consumed navigation-owned
  sequence resumes, preserving canonical selection/focus without invoking editor commit, cancel, or
  a domain mutation.
- Focused evidence: Pure state/key and production-shaped cell DOM coverage pass 114/114. The new DOM
  case proves the ending Enter remains consumed, then the editor unmounts, display returns,
  navigation is canonical, and the gridcell regains focus with zero commit/cancel calls. The
  opposite existing quick-editor case remains mounted with inactive composition. Typecheck and
  scoped lint/format pass.
- Negative grade: Changing only the controller resume comparison from `navigating` to `editing`
  makes the grid-origin DOM regression fail with the original retained-editor signature. Exact
  restoration returns the source to SHA-256
  `26a3ebec09cda1171bab1c73cff7d61e518846f8b54c4a5099c6ac351693a36d` and the focused case passes.
  Evidence is under `/tmp/task125-ime-cancellation-20260827/`.
- Remaining: Incorporate any additional confirmed Task 114 findings before sealing, freeze the final
  authored identity, and restart the entire Task 125 matrix from Gate 1. Do not commit, push, alter
  shared-database history, or normalize generated files while a writer is active.

## Session 2026-08-28 — Task 6 Phase 2 lifecycle correction

- Started: Rejected the Phase 1 Task 6 digest
  `32a6440b79b08f201eb97bf1fb79ebcd5e14c26c963479d0c3f65d18df8c165b` after independent review
  confirmed two uncovered `TransactionGridCell` exit defects. The original volatile Phase 1 `/tmp`
  bundle was later absent after session/machine turnover; its transcript-preserved post-seal
  attestation is historical context only and no artifact is reusable or currently revalidated.
- Completed: Read-only scouts traced click-only `retained` action leakage and duplicate external
  invalid validation; audited false-green lifecycle/page/table harnesses; identified
  production-shaped exact-call-count tests and opposite-path preservation arms; and confirmed the 96
  sealed path bytes remain unchanged.
- Completed: Inspected the only live baseline drift as Next-generated `next-env.d.ts`
  `root-params.d.ts` import. No MoneyFlow Next/Vitest/Playwright writer or port 3000 listener was
  active; the implementor must repeat those checks immediately before precise normalization.
- Completed: The first Phase 2 implementation handback changed 14 intended paths, matched its
  reported hashes/digest, graded three focused mutations, passed 166 focused unit tests and one
  exact Chromium journey, plus typecheck/lint/scoped format/diff checks. Scope authorization
  nevertheless failed: generated `AGENTS.md` reflow remained, exact click-only invalid
  Amount/Allocation counts and accepted external blur-owned Amount/Date/Allocation opposite paths
  were incomplete, and the final unit log contained unresolved React `act(...)` warnings.
- Completed: The corrected 14-path implementation then passed four fresh causal mutation grades, 168
  focused unit tests in three processes, the exact Chromium journey in three processes, and all
  bounded static checks. The self-contained bundle was sealed and its repository/artifact identity
  revalidated. Independent review repeated all mutations, units, and static checks and found no code
  or false-green defect.
- Failed acceptance: The sealed provenance claim of no database/service action is false. The exact
  journey necessarily registered a user and created vault/membership/snapshot state against the
  configured shared local Supabase. Independent scratch runs also produced successful authenticated
  sync batches on that shared stack and required a `turbopack.root` adaptation, so they are valid UI
  behaviour evidence but neither database-isolated nor byte-equivalent acceptance. No shared cleanup
  was attempted; exact inserted rows are not safely attributable from retained logs.
- Remaining: Provision a guarded disposable Supabase CLI project outside the repository with unique
  project identity/ports/credentials, a scratch-local dependency installation, attested process
  environment and database before/after state; rerun the exact Chromium selector without source or
  config adaptation; create a revised self-contained evidence bundle that explicitly declares
  isolated disposable writes; and obtain a fresh independent PASS while product source remains
  unchanged.
- Blockers: Downstream Tasks 7/8/9/30/36 and the full matrix remain held. No commit, push, shared
  database query/cleanup/history change, broad reset/stash, recreation of absent Phase 1 evidence,
  or unrelated work is authorized.

## Session 2026-08-31 — Task 10 inspector automation migration

- Status: In progress pending independent non-browser review and separately owned browser
  acceptance. Historical plan Task 22 remains unchecked. Automation proposal, existing-rule, and
  drift UI now map to the stable transaction inspector; controller state owns editor
  entry/cancellation/typed commit results, proposal draft/errors, exact transaction-plus-`RuleField`
  identity, and stale-finalizer retirement.
- Editor semantics: Description publishes the actual alias mutation result, including modal
  rejection until a confirmed mutation. Tags keep toggles and newly-created records local, suppress
  unchanged writes, and create-plus-assign through one final vault action. Allocation validates
  before mutation and suppresses unchanged writes. Direct lifecycle-provider tests cover typed
  changed, unchanged, and rejected results for Description/Alias, Tags, Allocation, Amount, and
  Date; Description and Allocation also assert their exact automation contexts.
- Persistence and ordering: Controller-persisted draft and error generations survive responsive
  relocation, panel close/reopen, and a true source-row virtual unmount/remount while semantic
  mismatches still retire before A → B → A can resurrect stale state. Same-event proposal
  publication flushes the subscribed inspector render and finalizers register at layout timing
  before destination publication. Runtime page regressions prove automatic cross-row success applies
  under the source owner, same-row movement does not finalize, and rejected rule creation retains
  the just-published proposal and its error. Dismissed, superseded, and unmounted finalizers remain
  unable to write.
- Replacement: Deleted the row proposal/robot components, page/table/row automation render
  callbacks, row-focus predicates, near-row popover geometry, and deferred zero-delay auto-apply
  path. Shared `FieldRuleProposal`, `TransactionRulePopup`, `FieldRuleEditor`, rule CRUD/application
  engines, and subscribed effective-currency resolution remain the single authorities.
- Review-blocker corrections: Structural projection reconciliation now consumes the source
  automation finalizer exactly once before publishing a replacement owner. The mounted inspector
  retires semantically empty Alias, Tags, and Allocation proposals before they can publish a closed
  toolbar badge. Tags and Allocation propagate rejected, unchanged, and changed results from their
  actual persistence boundaries instead of converting `void` callbacks into claimed mutations.
  Closed-inspector page regressions cover clearing the final Alias, Tag, and Allocation; direct and
  page-level regressions cover rejected and write-side unchanged Tags and Allocation outcomes.
- Current non-browser evidence: After the review-blocker corrections, focused unit/integration
  Vitest passed 346/346 tests in 22 files and the field-rule mutation integration suite passed 31/31
  in one additional file, for 377/377 current tests across 23 files. Typecheck passes. Lint passes
  with only the existing React Compiler advisory in `TransactionVirtualRows.tsx`. Scoped oxfmt and
  diff checks pass on the 15 correction product/test paths. Automation E2E sources remain migrated
  from retired robot/popover selectors to inspector-scoped proposal/rule/drift controls, exact
  active-row ownership, panel close/reopen, badge, and owner-exit behavior.
- Remaining acceptance: Review the final uncommitted Task 10 tree and execute the migrated browser
  journeys under the separately assigned browser owner, including existing-rule close/reopen,
  drift/apply-this, proposal persistence, multi-row field parity, automatic owner exit, amount
  restriction, and active-row switching at scale. No app, browser, or E2E process was run here. No
  commit or push was made.

## Session 2026-08-31 — Task 50 inspector automation corrections

- Review result: Task 50 rejected the prior 49-record freeze on six Medium findings. The correction
  remains non-browser and preserves accepted source-finalizer ordering, live-owner semantic-none
  retirement, typed Tags/Allocation persistence, proposal generation, and the migrated E2E source.
- Native blur: Description/Alias and Allocation now publish the exact changed, unchanged, or
  rejected result through one controller-owned native-blur path before editing can finish. Rejected
  blur keeps the editor, draft, controller ownership, and focus; direct programmatic focus-transfer
  regressions cover all three outcomes at exact Description and Allocation addresses.
- Mutation semantics: A malformed stored Allocation is no longer comparable to missing zero, so a
  zero draft reaches `setTransactionAllocation`, removes the malformed key, and reports changed.
  Tags now compare canonical unique sets, making identical or reordered duplicate arrays unchanged
  with no vault write or automation proposal.
- Owner retirement and accessibility: Structural deletion retires a proposal even when its finalizer
  already unmounted, while the live-owner exact-once path remains intact. A closed inspector exposes
  pending automation in the toggle name and emits one polite false-to-true status announcement while
  retaining the visual badge.
- Focus continuity: Every automation field has a stable, programmatically focusable heading inside
  its exact registered inspector control. User dismissal, successful proposal confirmation, drift
  apply, and existing-rule deletion move focus there before removing the focused subtree, preserving
  inspector ownership instead of falling back to `body`.
- Final non-browser evidence: The full focused Task 10 suite passes 363/363 tests across 23 files.
  Allocation mutation integration passes 36/36, and field-rule mutation integration passes 31/31,
  for 430/430 tests across 25 file invocations. Typecheck passes. Lint passes with only the existing
  React Compiler advisory in `TransactionVirtualRows.tsx`. Scoped oxfmt and scoped diff checks pass
  on the full corrected authored manifest.
- Remaining acceptance: One fresh independent non-browser review must verify the corrected freeze
  before browser acceptance can proceed. No app, browser, Playwright, E2E, build, commit, push,
  reset, or stash action was performed in this correction cycle.

## Session 2026-08-31 — Task 59 filtered-owner proposal correction

- Review result: Task 58 rejected the 53-record Task 57 freeze on one Medium finding. Absence from
  the filter-scoped transaction cursor was incorrectly used as proof that a pending proposal owner
  had been deleted, so ordinary filtering could irreversibly dismiss a live manual proposal.
- Canonical liveness: The transactions page now supplies a narrow exact-ID liveness callback backed
  by the complete `transactionIndex.canonicalById`. Projection reconciliation retires automation
  only when that authority explicitly reports the owner missing or soft-deleted; omitted evidence
  never infers deletion from cursor membership.
- Ordering and unchanged projections: Structural reconciliation still consumes the source finalizer
  exactly once before replacement-owner publication and then retires a genuinely deleted proposal.
  The same retirement check also runs when canonical liveness changes without changing the already
  filtered cursor order, covering deletion after the owner has left the visible projection.
- Paired regressions: Direct controller coverage gives filtered cursor and canonical liveness
  separate fixtures, proving a live excluded owner retains its manual proposal while a soft-deleted
  owner retires after finalizer unmount. The production page harness proves the closed-panel badge
  and proposal survive a real search-filter exclusion and return, while a retained soft-deleted
  canonical record removes the row, proposal, and badge.
- Final non-browser evidence: The complete focused Task 10 suite passes 365/365 tests across 23
  files. Allocation mutation integration passes 36/36, and field-rule mutation integration passes
  31/31, for 432/432 tests across 25 file invocations. Typecheck passes. Lint passes with only the
  existing React Compiler advisory in `TransactionVirtualRows.tsx`. Scoped oxfmt and scoped diff
  checks pass on the full corrected authored manifest.
- Remaining acceptance: One narrow fresh independent non-browser review must verify the corrected
  freeze before browser acceptance can proceed. No app, browser, Playwright, E2E, build, commit,
  push, reset, stash, or database-history action was performed in this correction cycle.

## Session 2026-08-31 — Task 61 filtered-owner causal coverage

- Review result: Task 60 required three causal directions before accepting the Task 59 freeze. This
  correction adds only regression coverage and ledger accounting; the accepted canonical-liveness
  product implementation remains unchanged.
- Unchanged projection: Direct controller and production-page regressions first filter a live owner
  from the cursor, capture the resulting projection generation, then soft-delete the canonical owner
  while the filtered cursor stays empty. Both require proposal retirement without a generation
  change, directly exercising the non-structural projection branch.
- Finalizer ordering: A genuine soft-deletion regression retains the registered source finalizer and
  proves its single invocation still observes the source transaction and proposal before dismissal
  and replacement-owner publication. Repeating the identical projection cannot invoke it again.
- Missing evidence: A complementary structural-filter regression omits canonical liveness evidence
  entirely and requires the live proposal to remain while reconciliation publishes the replacement
  active row. This prevents optional evidence from regressing into cursor-membership deletion.
- Mutation grading: An external current-byte scratch copy at
  `/tmp/task61-causal-mutations-20260831-2355` passed the 26-test baseline. Removing only the
  non-structural retirement block failed both unchanged-cursor regressions; moving dismissal before
  finalization skipped the registered finalizer and failed its exact-once test; treating omitted
  liveness as anything other than explicit live failed the absent-evidence retention test. Complete
  failure logs are under `task61-mutation-evidence/`. After every arm, the controller source
  restored to SHA-256 `fe6ec626a1b118cee1b2ae2df610b84d0f754ebbc81cb80a0a76edb099933869`; both test
  files matched repository SHA-256 values
  `bb4764a7974224fd93dbedd257483d81134b9d07186f726856c2caec069aaf91` and
  `8b72776440c095e8df18a899a026e0c41afd870021003acf3f767251158b6e86`, and the restored scratch pair
  passed 26/26.
- Final non-browser evidence: The narrow causal pair passes 26/26 tests across two files. The
  complete focused Task 10 suite passes 368/368 tests across 23 files. Allocation mutation
  integration passes 36/36, and field-rule mutation integration passes 31/31, for 435/435 tests
  across 25 file invocations. Final typecheck passes after correcting the new test observation to
  use the exported automation-owner domain type. Lint passes with only the existing React Compiler
  advisory in `TransactionVirtualRows.tsx`. Scoped oxfmt and scoped diff checks pass on the full
  authored manifest.
- Remaining acceptance: One narrow fresh independent non-browser re-review must verify the refrozen
  identity before browser acceptance can proceed. No app, browser, Playwright, E2E, build, commit,
  push, reset, stash, or database-history action was performed in this correction cycle.

## Session 2026-09-01 — Task 64 Description post-submit autocomplete re-entry

- Preserved browser evidence: The representative stable-ID failure was retained twice under
  `/tmp/task64-description-editor-repro/`, and the restarted corrected-tree campaign retained all
  five failures under `/tmp/task63-corrected-e2e-failures/`. The exact owners are
  `field-rule-parity.spec.ts:182` transaction `6ed38af3-6863-48d9-aa22-724270261e56`, `:248`
  transaction `a2e86ba4-3ce6-4f54-a937-170c335e68d0`, `rule-creation-controls.spec.ts:175`
  transaction `8fe028f4-e2cd-4e17-8ae4-8db77c9173b8`, `:266` transaction
  `211fd79c-9bc4-4639-a758-37488882be98`, and `:468` initial `.first()` transaction
  `a6807988-9b5d-4422-b663-bf7f1ad5ee04`. Each reached the shared `addTransaction` Description Enter
  boundary, committed the requested text, and then observed that same Description gridcell rendering
  `data-cell-content="editor"` for 15 seconds. All fail inside `expectTransactionCellDisplay` before
  later journey-specific `.nth(1)` logic, so locator retargeting does not fit the recorded failure.
- Retracted diagnosis: Publishing Description listbox ownership in a layout effect proves the
  narrower invariant that a mounted popup is controller-owned before it can receive input, but it
  did not contain this retention defect. The corrected-tree browser campaign still failed all five
  journeys, so the previous ownership-timing causal claim and its claimed browser correction are
  withdrawn. The layout-phase ownership coverage remains only as coverage of that independent
  popup-ownership ordering contract.
- Causal diagnosis: The real Description commit creates or selects the exact alias synchronously.
  `TransactionGridCell` then flushes automation publication before dispatching its already-reduced
  `commit-and-move` intent. That flush renders the new canonical alias collection into the still
  mounted, submitted editor. Because popup eligibility previously ignored submission state, the
  just-created alias matched the retained draft, reopened the autocomplete, and transferred the
  controller from `editing` to grid-editor `interacting`. `commit-and-move` accepts only `editing`,
  so its subsequent dispatch returned native without finishing or navigating and left the source
  editor projected.
- Causal regression and mutation grade: A real `TransactionGridCell` regression uses the real
  controller, a one-row clamped projection, controller-owned editor rendering, and a stateful commit
  callback that synchronously publishes the exact created alias. Before the product correction it
  reproduced the browser signature: the stable source cell stayed `editor`, the committed textbox
  stayed mounted, and the matching listbox opened. The corrected test requires the source display,
  no textbox or listbox, a null editor snapshot, and `navigating`. Removing only the submitted-popup
  gate reproduces that exact failure; restoring it passes.
- Correction: Render-visible `hasSubmitted` state now mirrors the existing exact-once submission
  ref. Commit, alias selection, cancellation, and Escape suppress autocomplete eligibility before
  any synchronous canonical rerender; a new edit or focus session clears the suppression. Typed
  commit outcomes, exact-once commit caching, controller intent dispatch, native blur ownership,
  focus restoration, and composition handling are unchanged.
- Verification repairs retained from the first pass: Description and allocation mocks return typed
  successful outcomes; the Add-focus page mock exposes the hooks consumed by the current page; the
  resting-chrome assertion matches the accepted no-selection-paint contract; and only the two
  measured load-sensitive whole-page cases carry local 15-second ceilings. No suite-wide timeout
  changed.
- Final non-browser evidence: `transaction-grid-cell.test.tsx` passes 66/66 and
  `description-alias-interactions.test.tsx` passes 13/13. The complete unit suite passes 3,381 tests
  with 2 skipped across 182 files. Typecheck passes. Lint passes with only the existing React
  Compiler advisory in `TransactionVirtualRows.tsx`. Scoped oxfmt passes. No failure artifact was
  deleted. No app, browser, Playwright, E2E, build, commit, push, reset, stash, or database-history
  action was performed by this task owner.

## Session 2026-09-01 — Task 66 Description proposal owner retention

- Preserved browser evidence: The two final Task 63 failures remain at
  `/tmp/task63-final-e2e-failures/rule-creation-description-create.md` and
  `/tmp/task63-final-e2e-failures/rule-creation-description-enter.md`. Both show the imported-row
  Description rename persisted and returned to resting display while continuous Enter movement
  selected the destination row, whose inspector therefore could not render the still-source-owned
  `description-rule-proposal`.
- Causal diagnosis: The synchronous Description commit already published a live, renderable source
  proposal and its mounted inspector had registered the exact finalizer. The failure happened after
  publication: `commit-and-move` finished the source editor and immediately published the
  destination transaction as active. A manual finalizer correctly retained its proposal, but the
  inspector follows the active transaction, so destination publication hid the source proposal
  before the journey could choose an apply mode.
- Correction: Editor commit-navigation now requires the current source owner's automation exit to be
  finalized before crossing transaction owners. A surviving manual proposal finishes the editor but
  holds navigation on the source row so the proposal remains visible. A successful automatic
  finalizer that dismisses the source proposal allows the same continuous movement to publish and
  focus the destination editor. Ordinary pointer/navigation paths retain their accepted behavior,
  and an unrelated hidden proposal cannot block a different row's commit navigation.
- Production-shaped coverage: The real transactions page, cursor, table, Description editor,
  controller, inspector workflow, and persisted exact-name alias mutation now prove both directions.
  The initial changed Enter commit returns the source cell to display, retains the source as active,
  and exposes a renderable Description proposal. After selecting `Updating all` and observing the
  replacement automatic finalizer registration, an unchanged recommit dismisses the proposal and
  continues into the destination Description editor. Direct controller coverage separately pins the
  unrelated-hidden-proposal case.
- Mutation grading: Disabling only the cross-owner finalization gate reproduced the browser
  mechanism: the controller proposal remained renderable under the source owner while
  `activeTransactionId` changed to the destination. Removing the current-source-owner scoping made
  an unrelated manual proposal suppress destination activation. Restoring each predicate made its
  causal regression pass.
- Final non-browser evidence: The four focused automation/grid suites pass 112/112. The complete
  unit suite passes 3,383 tests with 2 skipped across 182 files. Typecheck, production build, full
  lint, full format check, and `git diff --check` pass; lint reports only the existing React
  Compiler advisory in `TransactionVirtualRows.tsx`. Both required failure artifacts remain present.
  No app, browser, Playwright, E2E, commit, push, reset, stash, or database-history action was
  performed by this task owner.

## Session 2026-09-01 — Task 48 post-IME movement resume coverage

- Coverage gap: Existing reducer matrices proved composition-owned keys and ordinary movement in
  isolation, while the prior DOM composition regression stopped once the completed grapheme reached
  an inactive quick editor. None joined the consumed resume boundary to the next real cell movement,
  so TGI-IME-004 could regress while both halves stayed green independently.
- Production-shaped regression: One real `TransactionGridCell` source, lifecycle-registered input,
  controller projection, and mounted canonical actions destination now execute the complete
  boundary. The test starts and updates composition, lands one authoritative completed grapheme, and
  sends the non-composing Enter event that ended the IME sequence while controller composition is
  still `consumed`. That event performs no lifecycle commit and dispatches no grid intent. After the
  queued resume changes composition to `inactive`, one distinct ArrowRight commits exactly once,
  suppresses the source input's native blur callback, dispatches exactly one canonical command,
  focuses and selects the actions destination, leaves no pending request, and retains continuous
  quick-edit intent.
- Product result and mutation grade: Current production behavior already satisfies the joined
  contract, so no product correction was necessary. Narrowing the key-intent composition gate to
  block only `active` state let the ending Enter escape from `consumed`; the new DOM regression
  failed immediately because the lifecycle committed once before the distinct movement event.
  Restoring the full non-inactive gate made the regression and focused suites pass.
- Final non-browser evidence: The three focused IME interaction suites pass 153/153, including
  `transaction-grid-cell.test.tsx` at 67/67. The complete unit suite passes 3,384 tests with 2
  skipped across 182 files. Typecheck, production build, full lint, and full format check pass; lint
  reports only the existing React Compiler advisory in `TransactionVirtualRows.tsx`. No app,
  browser, Playwright, E2E, commit, push, reset, stash, or database-history action was performed by
  this task owner.

## Session 2026-09-01 — Task 68 final E2E failure reconciliation

- Evidence preservation: All 15 `test-results/**/error-context.md` files remain present and
  `test-results/.last-run.json` retains SHA-256
  `ce000ec7fd248e84727b3c71a9f3b83cf52da6d3099612ff59acb59684771479`. No failure artifact was
  deleted or rewritten.
- Persistent Notes migration: Every reachable positive assertion in the six failed journeys now uses
  a stable transaction row, canonical cell activation, exact `data-transaction-owner`, and the one
  persistent inspector `notes-editable`. Grid structure asserts Notes remains outside the grid,
  Actions Enter focuses the inspector heading, Actions Tab reaches the sole delete descendant, and
  `aria-rowcount` counts only the header plus data rows. Presence now follows TGI-STATE-006:
  inspector Notes publishes stable row viewing while a retained Amount editor publishes field
  editing; the observer proves both identities are present and the Amount outline belongs to the
  editing member without fabricating a retired Notes gridcell outline.
- E2E source corrections: Description blur targets the exact Description columnheader instead of the
  inspector's same-named heading. The changed post-autocomplete ArrowDown journey now proves Task 66
  source proposal retention, dismisses that manual proposal, then proves unchanged continuous
  movement resumes. Virtual import rows are revealed by their captured virtual index before their
  locator is resolved. Deferred Account option selection is committed by moving to Description
  before display is expected. Saved is scoped to the exact named status role. Checkbox edge geometry
  establishes `scrollTop = 0` and waits until the first data row is fully below the sticky header.
  Description display/editor alignment compares text insets inside the same gridcell coordinate
  space rather than viewport positions on opposite sides of horizontal scrolling.
- Product correction: Inline tag exact-name authority now combines committed selected tags,
  available tags, and locally staged created tags without duplicate IDs. One trim-plus-case-fold
  normalization governs filtering, Create visibility, Create handling, and Enter toggling, so a
  committed tag still suppresses duplicate creation when the global availability projection lags
  after remount.
- Production-shaped coverage and mutation grade: The real inline tag editor covers persisted
  available tags, case variation, surrounding whitespace, staged creation, normalized Enter, and a
  fresh remount whose committed selected tag is absent from `availableTags`. Removing committed tags
  from selectable authority makes the remount regression fail with a visible duplicate Create
  option. Removing trim normalization makes the whitespace regression fail the same way. Restoring
  each predicate passes all 10 focused cases.
- Frozen Task 68 changed-path manifest: `.agent-memory/transaction-grid-inspector/progress.md`,
  `src/components/features/transactions/cells/InlineEditableTags.tsx`,
  `tests/unit/transactions/inline-editable-tags.test.tsx`, `tests/e2e/description-aliases.spec.ts`,
  `tests/e2e/import.spec.ts`, `tests/e2e/presence.spec.ts`,
  `tests/e2e/transaction-grid-structure.spec.ts`, `tests/e2e/transactions.spec.ts`,
  `tests/e2e/helpers/settlement.ts`, and `tests/e2e/vault-settings.spec.ts`. The required production
  build separately rewrote generated `next-env.d.ts` from `.next/dev/types` to `.next/types`; it is
  not an authored Task 68 path and must remain excluded from campaign source-identity manifests.
- Final non-browser evidence: Focused inline-tag coverage passes 10/10. The complete unit suite
  passes 3,389 tests with 2 skipped across 182 files. Typecheck, production build, full lint, full
  format check, and scoped `git diff --check` pass; lint reports only the existing React Compiler
  advisory in `TransactionVirtualRows.tsx`. No app, browser, Playwright, E2E, commit, push, reset,
  stash, database-history, alternate-config, wrapper, or disposable-stack action was performed by
  this task owner.

## Session 2026-09-01 — Task 72 remaining transaction E2E defects

- Evidence preservation: `test-results/.last-run.json` retains SHA-256
  `45e0a36d9b7e6a8440fb8dfa3d082e8002d86d7f225380701b8e2efb95763eb6`.
  `/tmp/task67-remediation-failures/transactions-existing-tag-create.md` retains
  `a780fb627ec79837637e31cdebeb8147af5961d1e8f499d8cfdf2fc5fab8577b`, and
  `/tmp/task67-remediation-failures/transactions-checkbox-top-edge.md` retains
  `3529235d7bfb66d7714ccb63abbb2d2fe50a3c410a23a2ea77ca6eb192b7f951`. Earlier Description and
  duplicate-dialog remediation contexts also retain their recorded hashes.
- Exact-tag mechanism: The real transactions page/controller regression now dispatches the complete
  two-click pointer/mouse sequence that Playwright's `dblclick()` sends to an already-open Tags
  editor. The first pointerdown previously classified the interactive tag strip as gridcell
  background, retired the editor before commit, and discarded its locally-created tag. The second
  click then reopened from the unchanged vault projection, so the same exact query exposed Create.
  Marking the strip `data-gridcell-interactive` keeps both clicks inside the retained editor;
  staged, available, committed, case-folded, and whitespace-normalized exact authority remains
  intact.
- Tag mutation grade: Removing only `data-gridcell-interactive` from the production strip makes the
  page-level regression fail with visible `create-tag-button` for `NewInlineTag`, matching the
  preserved browser failure. Restoring the marker passes the browser-shaped sequence without a vault
  write before the eventual external commit boundary.
- Checkbox top-edge mechanism: A rendered `TransactionTable` regression contains the sticky `z-10`
  header, its checkbox wrapper, the real rowgroup and `translateY(0px)` virtual wrapper, the fixed
  57px transaction row, the bordered checkbox gridcell, and the row checkbox hit-area classes. The
  header checkbox cell's inherited `py-2` placed its `h-full` presentation wrapper below the
  declared 37px sticky-header box, so `elementFromPoint` at the first data cell's top edge resolved
  to that header DIV. Giving the header checkbox cell `p-0` keeps the full-cell target inside the
  sticky row and returns contiguous top-edge ownership to the data gridcell.
- Geometry mutation grade: Reverting only the header checkbox cell from `p-0` to `px-0` makes the
  rendered hit-test regression resolve the top-edge point to the select-all presentation wrapper
  instead of the transaction gridcell. Restoring `p-0` passes.
- Final Task 72 source manifest: `.agent-memory/transaction-grid-inspector/progress.md`,
  `src/components/features/transactions/TransactionTable.tsx`,
  `src/components/features/transactions/cells/InlineEditableTags.tsx`,
  `tests/unit/transactions/transaction-checkbox-hit-ownership.test.tsx`, and
  `tests/unit/transactions/transaction-tags-page.test.tsx`. The production build's generated
  `next-env.d.ts` rewrite remains outside the authored manifest.
- Final non-browser evidence: The four focused tag/geometry files pass 30/30. The first full unit
  run exhausted `/tmp` inodes before fourteen files could load; rerunning the unchanged tree with
  `TMPDIR=/home/ben-agents/.cache/moneyflow-vitest-task72` passes 3,391 tests with 2 skipped across
  183 files. Typecheck, production build, full lint, full format check, and scoped
  `git diff --check` pass; lint reports only the existing React Compiler advisory in
  `TransactionVirtualRows.tsx`. No app, browser, Playwright, E2E, commit, push, reset, stash,
  database-history, wrapper, alternate config, or disposable-stack action was performed by this task
  owner.

## Session 2026-09-01 — Task 71 unified Alt-arrow cell navigation

- Source authority: direct-user Amendment 003 was written before implementation. It assigns every
  Alt/Option arrow and Alt/Option+Shift arrow from transaction cells, editors, top-level editor
  popups, and activation descendants to the canonical reducer/controller path; one Escape from a
  controller-owned top-level editor popup cancels the popup and complete editor. Nested Create
  Account Type/Currency Selects retain their own arrows and first Escape. The amendment has no
  executable acceptance ID and leaves the 146 base records plus executable Amendment 001 unchanged.
- Shared runtime: `grid-key-intent.ts` now carries the returning quick/full entry for
  `interacting-grid-editor`, reduces popup Alt arrows to canonical commit-and-move/extend, and emits
  a distinct `cancel-popup-edit`. `TransactionGridCell` owns lifecycle validation, exact-once
  commit, duplicate-blur suppression, cancellation, activation-descendant Alt capture, and exact
  registered portal native capture. The controller finalizes navigation from either ordinary editing
  or grid-editor interaction, publishes navigating selection on top-level cancellation, and restores
  owning-cell focus. The obsolete table-level `cell-key-intent` reducer, its export, and its tests
  are deleted; `TransactionTable` retains clipboard ownership only.
- Editor behavior: Date, Description, Account, Tags, Status, Amount, allocations, checkbox/actions
  descendants, and Create Account now share canonical Alt movement and range extension. Rejected
  Description commits retain their exact draft across focus transfer without latching the failed
  submission, rejected Tags and allocation commits retain their popup/editor drafts, and Date cancel
  restores the full editing value while clearing validation and calendar state. Escape from
  Description listboxes and shared-alias modals, Account/Status/Tags popups, Date calendars, and the
  top-level Create Account modal cancels the complete editor; overlay and explicit modal-cancel
  actions that are not Escape preserve the existing Description source-editor return contract.
  Create Account cancellation resets Name/Type/Currency and never creates an account; nested Select
  arrows and first Escape remain widget-owned.
- Production-shaped coverage: pure reducer matrices cover all four popup Alt directions and Shift
  variants. Real DOM coverage covers open and closed popup movement, changed/unchanged exact-once
  writes, invalid Date/Description/Tags/allocation retention, active and consumed composition,
  duplicate-blur suppression, checkbox/actions descendants, one-Escape focus/selection restoration,
  no-reopen ordinary follow-up movement, Create Account nested portals, top-level modal Alt
  movement, stale popup callbacks, grid boundaries, and virtual reveal/focus through the existing
  controller suite. Superseded two-Escape Description and Create Account expectations are inverted.
- Mutation grade: inverting popup Alt ownership killed eight reducer/DOM cases; downgrading
  `cancel-popup-edit` killed six reducer/real-popup cases; inverting exact registered-portal
  ownership killed the Account and Status Escape cases; removing nested Create Account widget
  ownership killed its Select regression; inverting Description rejection retention killed the
  open-listbox case; inverting the controller grid-editor owner guard killed all three
  Account/Status/Tags cancellation cases; inverting the central rejected-commit movement guard
  killed the rejected Tags case; and removing rejected Description focus-return retention killed the
  shared-modal draft case. Every mutation was restored and its focused green rerun passed.
- Task 72 freeze: the Tags strip still carries `data-gridcell-interactive`, and the header checkbox
  cell still carries `p-0`.
- Task 71 authored manifest: `.agent-memory/transaction-grid-inspector/plan.md`,
  `.agent-memory/transaction-grid-inspector/progress.md`,
  `specs/016-transaction-grid-interaction-inspector/amendments/003-unified-grid-navigation-popup-escape.md`,
  `specs/016-transaction-grid-interaction-inspector/evidence/README.md`,
  `specs/016-transaction-grid-interaction-inspector/evidence/source-freeze/freeze-manifest.md`,
  `src/components/features/accounts/CreateAccountDialog.tsx`,
  `src/components/features/transactions/TransactionTable.tsx`,
  `src/components/features/transactions/cells/InlineEditableDate.tsx`,
  `src/components/features/transactions/cells/InlineEditableDescriptionAlias.tsx`,
  `src/components/features/transactions/cells/TransactionGridCell.tsx`,
  `src/components/features/transactions/hooks/useTransactionGridController.ts`, deleted
  `src/components/features/transactions/table-model/cell-key-intent.ts`,
  `src/components/features/transactions/table-model/grid-key-intent.ts`,
  `src/components/features/transactions/table-model/index.ts`,
  `tests/unit/transactions/amendment-accounting.test.ts`,
  `tests/unit/transactions/cell-selection-gestures.test.tsx`,
  `tests/unit/transactions/description-alias-modal-page-ownership.test.tsx`, deleted
  `tests/unit/transactions/table-model/cell-key-intent.test.ts`,
  `tests/unit/transactions/table-model/grid-key-intent.test.ts`,
  `tests/unit/transactions/transaction-grid-cell.test.tsx`, and
  `tests/unit/transactions/use-transaction-grid-controller.test.ts`.
- Measured verification: the focused nine-file navigation and lifecycle suite passes 373/373; the
  complete unit suite passes 3,399 tests with 2 skipped across 182 files; typecheck, production
  build, full format check, and `git diff --check` pass; full lint passes with only the existing
  React Compiler advisory in `TransactionVirtualRows.tsx`. No app, browser, Playwright, E2E, commit,
  push, reset, stash, database-history, wrapper, alternate config, or disposable-stack action was
  performed by this task owner.

## Session 2026-09-01 — Task 74 Account popup Escape focus restoration

- Preserved failure: `/tmp/task67-task71-manual-failure.md` measured the real page with two rows.
  The Account popup disappeared on Escape, but Radix returned focus to the still-mounted Account
  trigger; the controller remained on Account and the following plain ArrowRight stayed native
  instead of moving to Tags.
- Causal page regression: `transaction-account-popup-page.test.tsx` mounts the real transactions
  page, controller, `TransactionTable`, `TransactionRow`, `TransactionGridCell`, `AccountCombobox`,
  Radix Popover/Command portal, and two-row vault projection, then opens Account through the
  complete two-click pointer/mouse sequence. It does not mock Account or bypass portal ownership.
  The harness flushes each real document-capture listener's update before the next listener,
  reproducing the measured Chromium ordering in which Radix's earlier dismissal commits portal
  retirement before the gridcell's later listener can run. Printed preconditions prove the active
  search target has exact Account owner attributes, is registered, and has an `interacting`
  grid-editor owner. At Escape the registration predicate is never reached, distinguishing listener
  retirement from an absent/stale target or controller-guard rejection. Before the correction all
  four cases print `editing`, a mounted editor, active Account trigger, no portal-recognition call,
  and two trigger-focus calls.
- Shared correction: the editor lifecycle provider now exposes an address-checked popup-cancellation
  callback owned by `TransactionGridCell`. `AccountCombobox` invokes that callback from Radix's
  local `onEscapeKeyDown` before default dismissal can retire the portal, prevents Radix's competing
  default close when cancellation is accepted, and leaves standalone/non-controller popup behavior
  unchanged. The shared callback runs the existing lifecycle cancel, automation cancellation,
  canonical `cancel-popup-edit`, navigating selection publication, and owning-gridcell focus path;
  stale or foreign editor state is rejected before the lifecycle is touched.
- Production-shaped oracle: after one Account popup Escape the search portal and Account trigger are
  absent, the controller editor is null, interaction is `navigating`, canonical Account selection is
  visible, and the outer Account gridcell owns focus. The next plain ArrowLeft, ArrowRight, ArrowUp,
  and ArrowDown respectively reach Description, Tags, the previous row's Account, and the next row's
  Account without reopening an editor.
- Mutation grade: replacing the local shared-cancellation invocation with a null-only branch makes
  all four production-page directions fail on the two competing Account-trigger focus calls.
  Restoring the invocation passes all four cases. Removing a separate proposed close-autofocus
  suppression did not weaken the oracle, so that unnecessary state and handler were removed rather
  than shipped.
- Frozen mechanisms: Task 71 Alt navigation, rejected commits, exact-once writes, IME gates, nested
  Create Account Select ownership, stale close protection, and non-Escape popup return remain
  covered by the focused suite. Task 72's Tags `data-gridcell-interactive` marker and
  header-checkbox `p-0` remain unchanged.
- Task 74 authored manifest: `.agent-memory/transaction-grid-inspector/progress.md`,
  `src/components/features/accounts/AccountCombobox.tsx`,
  `src/components/features/transactions/cells/editor-lifecycle.tsx`,
  `src/components/features/transactions/cells/TransactionGridCell.tsx`, and
  `tests/unit/transactions/transaction-account-popup-page.test.tsx`.
- Measured verification: the focused eleven-file Account/Task 71 suite passes 382/382; the complete
  unit suite passes 3,403 tests with 2 skipped across 183 files; typecheck, production build, full
  format check, and `git diff --check` pass; full lint passes with only the existing React Compiler
  advisory in `TransactionVirtualRows.tsx`. No app, browser, Playwright, E2E, commit, push, reset,
  stash, database-history, wrapper, alternate config, or disposable-stack action was performed by
  this task owner.

## Session 2026-09-01 — Task 75 Task 74 transaction E2E reconciliation

- Evidence intake: all nine `error-context.md` files and `.last-run.json` under
  `/tmp/task67-task74-transactions-failures-20260901/` were read before editing. Their final hashes
  are recorded in the Task 75 handback; no preserved artifact was modified.
- Amendment 003 reconciliation: the virtual alias journey, Account Create modal journey, T013
  Account handoff, T014a Date calendar, Task 70 editor-hover loop, and UR-012 tag-removal journey
  all retained superseded popup-only/second-Escape expectations. They now assert the authorized
  one-Escape result: every top-level popup/editor closes, the unchanged owning gridcell is displayed
  and focused, and no stale editor locator is reused. Nested Create Account Type/Currency Select
  Escape still closes only the nested Select; overlay dismissal still returns to the retained
  Account editor. The later Task 70 account/status activation matrix was amended at the same stale
  contract before it could become the next failure in that test.
- Tags journey reconciliation: T017 selected `Groceries` only into the local Tags draft and then
  used Escape, which Amendment 003 correctly cancelled; T033 likewise staged `NewInlineTag`, later
  escaped, and reached the Tags page with zero committed tags. Both journeys now leave the Tags
  editor through a different gridcell to exercise the real atomic external commit boundary before
  asserting the resting transaction display or management-page projection. Exact-name Create
  suppression remains asserted before one-Escape cancellation of the unchanged reopened editor.
- Checkbox classification: the Task 70 checkbox context is byte-for-byte identical to the earlier
  Task 72 pre-fix artifact, including the same random transaction identities; both files retain
  SHA-256 `3529235d7bfb66d7714ccb63abbb2d2fe50a3c410a23a2ea77ca6eb192b7f951`. The current tree still
  contains the mutation-graded header `p-0` correction and its production-shaped rendered geometry
  regression, and the independent Task 74 manual campaign passed the real top edge. The strict
  `elementFromPoint` oracle is therefore unchanged; this preserved copy is historical evidence, not
  evidence of a current product candidate.
- Verification hardening: the first nominally focused command passed file arguments through the
  repository script's existing `--`, so Vitest ran all 183 files and one Account page arm exceeded
  the default 5-second per-test ceiling at 5.204 seconds under full-suite load. The existing
  four-arm real page test now carries a 15-second local ceiling. A truly focused direct Vitest run
  then passed 213/213, and two unchanged-tree full runs passed 3,403 tests with 2 skipped across 183
  files.
- Task 75 authored manifest: `.agent-memory/transaction-grid-inspector/progress.md`,
  `tests/e2e/transactions.spec.ts`, and
  `tests/unit/transactions/transaction-account-popup-page.test.tsx`. No product file changed.
- Final non-browser evidence: full format check, lint, typecheck, production build, and scoped
  `git diff --check` pass; lint reports only the existing React Compiler advisory in
  `TransactionVirtualRows.tsx`. No product mutation grade was required because all nine contexts
  classified as superseded journeys or historical evidence and no product correction was made. No
  app, browser, Playwright, E2E, commit, push, reset, stash, database-history, wrapper, custom
  runner, alternate config, or disposable-stack action was performed by this task owner.

## Session 2026-09-01 — Task 76 final Transactions E2E failures

- Evidence preservation: `.last-run.json` under
  `/tmp/task67-task75-transactions-rerun-failures-20260901/` retains SHA-256
  `41067e34838aaf702be570e09e596ab0b9b6e4043f9425a8081a3cfd3b028ceb`; the fresh checkbox and Status
  contexts respectively retain `1e5369a7dfeccd5f62dce63c942229766708cdd8d7e966dffe45e5808898f112`
  and `2f8ef9968c689d527315b6bf980807dc619224f4371d838a28efbcb7684cf205`.
- Status mechanism: the real page regression mounts the Status `startOpen` editor, Radix Select
  portal, transaction row/cell, and canonical controller under the same synchronous document-capture
  update ordering that reproduced Account. Radix's earlier Escape listener closed the Select and
  retired the later registered-portal listener before canonical cancellation ran, leaving the Status
  editor mounted. The pre-fix regression failed with two competing trigger-focus calls, matching the
  browser's retained editor.
- Status correction: `InlineEditableStatus` now consumes the existing address-checked
  `useTransactionGridEditorPopupCancellation` callback from its local Radix `onEscapeKeyDown`
  boundary and prevents Radix's default dismissal only when canonical cancellation is accepted. The
  unchanged Status value writes nothing, the editor retires, the owning cell remains selected and
  receives final focus, and the next plain ArrowLeft reaches Tags without reopening either editor.
  Standalone Status use remains popup-only because the shared callback is absent outside a grid
  lifecycle provider.
- Status mutation grade: replacing only the local shared-cancellation invocation with a null-only
  branch made the real-page regression fail again with two Status-trigger focus calls before the
  retained-editor assertions. Restoring the address-checked invocation passes the real page and
  standalone Status suites; one harmless FocusScope cleanup attempt still targets the unmounting
  trigger, but canonical owning-cell focus wins and the editor is absent.
- Checkbox mechanism: creating the E2E fixture double-clicks Amount, which horizontally reveals the
  far side of the 1,056px one-allocation grid inside an approximately 896px table pane. The test
  reset only `scrollTop`; the first checkbox cell's viewport-relative bounding box therefore
  remained left of the overflow clip. Its top-edge point was still inside the browser viewport but
  over an unrelated page `DIV`, exactly explaining `cell:null tagName:DIV` without weakening
  whole-cell ownership.
- Checkbox regression and correction: the extended rendered `TransactionTable` test now contains one
  real allocation column, sticky 37px header, first `translateY(0px)` virtual row, 57px bordered
  data row, 1,600x900 viewport, nonzero scroller origin, vertical clip, residual horizontal Amount
  scroll, browser-shaped bounding boxes, overflow clipping, and `elementFromPoint`. It reproduces
  the outside `DIV`, then proves that revealing the checkbox makes the unchanged `top + 2px` point
  resolve to the exact outer checkbox gridcell. The E2E helper now calls `scrollIntoViewIfNeeded()`
  before measuring every cell and separately rejects any point outside the transaction scroller; the
  strict exact-cell oracle and first-row top-edge arm remain unchanged. No product geometry changed.
- Task 76 authored manifest: `.agent-memory/transaction-grid-inspector/progress.md`,
  `src/components/features/transactions/cells/InlineEditableStatus.tsx`,
  `tests/e2e/transactions.spec.ts`,
  `tests/unit/transactions/transaction-account-popup-page.test.tsx`, and
  `tests/unit/transactions/transaction-checkbox-hit-ownership.test.tsx`. The build-generated
  `next-env.d.ts` rewrite remains outside authored scope.
- Final non-browser evidence: focused Status/geometry coverage passes 207/207; the complete unit
  suite passes 3,405 tests with 2 skipped across 183 files. Full format check, lint, typecheck,
  production build, and scoped tracked/untracked whitespace checks pass; lint reports only the
  existing React Compiler advisory in `TransactionVirtualRows.tsx`. No app, browser, Playwright,
  E2E, commit, push, reset, stash, database-history, wrapper, custom runner, alternate config, or
  disposable-stack action was performed by this task owner.

## Session 2026-09-01 — Task 77 checkbox centre-control visibility

- Evidence preservation: `.last-run.json` under
  `/tmp/task67-task76-transactions-rerun-failures-20260901/` retains SHA-256
  `83bfa3879b64f8fe625c216863f0e4dc88d1e0c95b958e96e0c0e4ad607e1860`; the sole Task 70
  centre-control context retains `44fa2eabbc5b540cd2110e2c92ede0237f66a2feda38e941e3483c4d9facc0df`.
- Re-derived mechanism: the edge campaign ends with a horizontally revealed right-side column. A
  subsequent Description double-click needs only to expose the Description cell, which can remain
  partially visible while the 32px checkbox track is still left of the transaction scroller's client
  clip. `boundingBox()` continues to return the checkbox control's viewport-relative layout
  rectangle, so its exact centre is inside the 1,600x900 page viewport but over unrelated page DOM;
  `elementFromPoint()` therefore reports `cell:null` even though the checkbox control and its
  enclosing gridcell ownership are unchanged.
- Production-shaped regression: the rendered `TransactionTable` geometry now includes the real
  centred 16px checkbox control as well as its 32px track, sticky 37px header, first
  `translateY(0px)` virtual row, 57px data row, one allocation column, 1,056px content width, 896px
  overflow clip, nonzero scroller origin, residual 160px horizontal scroll, 1,600x900 viewport,
  viewport-relative bounding boxes, and overflow-aware `elementFromPoint`. Before reveal, both the
  unchanged outer-cell `top + 2px` point and the exact control centre resolve to the unrelated outer
  `DIV`; after reveal, the first resolves to the outer checkbox gridcell and the second to the real
  checkbox button whose closest `data-cell` is exactly `checkbox`.
- E2E correction: `clickControlCenter` now reveals each exact control before measuring it, restores
  and asserts `scrollTop === 0`, reasserts first-row separation below the sticky header, and rejects
  the unchanged centre point unless it lies inside both the page viewport and the transaction
  scroller client rectangle. The strict control oracle is strengthened to require the checkbox
  target to equal `{ cell: "checkbox", tagName: "BUTTON" }`; no force click, shifted point, relaxed
  ownership, skipped arm, or product geometry change was introduced.
- Regression grade: mutating only the geometry reveal to retain the residual horizontal scroll makes
  the test fail at the visibility precondition (`136` expected to be at least scroller-left `280`),
  before either strict ownership assertion. Restoring the reveal passes both checkbox geometry arms.
- Task 77 authored manifest: `.agent-memory/transaction-grid-inspector/progress.md`,
  `tests/e2e/transactions.spec.ts`, and
  `tests/unit/transactions/transaction-checkbox-hit-ownership.test.tsx`. The build-generated
  `next-env.d.ts` rewrite remains outside authored scope.
- Final non-browser evidence: focused checkbox coverage passes 2/2; the complete unit suite passes
  3,405 tests with 2 skipped across 183 files. Full format check, lint, typecheck, production build,
  and scoped tracked/untracked whitespace checks pass; lint reports only the existing React Compiler
  advisory in `TransactionVirtualRows.tsx`. No app, browser, Playwright, E2E, commit, push, reset,
  stash, database-history, wrapper, custom runner, alternate config, or disposable-stack action was
  performed by this task owner.

## Session 2026-09-01 — Task 78 Description popup focus reconciliation

- Evidence preservation: `.last-run.json` under
  `/tmp/task67-task77-description-aliases-failures-20260901/` retains SHA-256
  `fa952254b64c27486e7199dd17ebcaa1fb029ec17217eb6741557148a0214a6c`; the sole continuous
  autocomplete/provenance context retains
  `11df83d571dd2825af1160e4e2f25acd7a96b16088e278420df9df207cedaade`.
- Contract classification: the failing action was Escape from an open top-level Description alias
  listbox. Amendment 003 requires that one Escape cancel and reset the complete owning editor, write
  nothing, unmount its exact input, expose the unchanged one-cell selection, and focus the owning
  gridcell as `navigating`; only a non-Escape popup dismissal returns to the same editor. The
  preserved `{ connected:false, focused:false, value:"C" }` handle and snapshot's selected
  `Cafe partial` display branch are therefore evidence of correct cancellation, not a product focus
  failure.
- Production-shaped regression: the real transactions-page/controller test now opens the real
  Description editor over imported provenance, opens the portaled alias listbox, and closes it first
  by changing to a zero-match draft. It proves the controller returns from
  `interacting/grid-editor/listbox` to `editing`, the exact input object remains connected and
  focused with its draft and `3..8` selection intact, the outer cell retains
  `Original imported description: Imported description 1`, and no alias write occurs. Reopening the
  listbox and pressing Escape proves the opposite authorized branch: `navigating`, display branch,
  old input disconnected, canonical cell focus and provenance restored, no write, and explicit
  reactivation creates a different input with canonical `Shared café`.
- E2E correction: the continuous autocomplete step now closes the listbox through the genuine
  non-Escape zero-match cause by changing `C` to `Cafe`. The pre-close pinned handle remains the
  identity oracle; after the close the same node must be connected and focused with value `Cafe` and
  selection `1..3`. ArrowDown then exercises the intended continuous commit/movement and proposal
  handoff using `Cafe`. The stale popup-only Escape expectation and use of its detached locator were
  removed; later explicit Escape assertions continue to cover whole-editor cancellation.
- No product source changed and no product mutation grade was applicable: the new page regression
  directly proves both sides of the authorized close-cause branch, while the preserved browser
  failure is the old assertion failing on the correct one-Escape branch.
- Task 78 authored manifest: `.agent-memory/transaction-grid-inspector/progress.md`,
  `tests/e2e/description-aliases.spec.ts`, and
  `tests/unit/transactions/description-alias-modal-page-ownership.test.tsx`. The build-generated
  `next-env.d.ts` rewrite remains outside authored scope.
- Final non-browser evidence: focused Description lifecycle coverage passes 109/109 across four
  files; the complete unit suite passes 3,405 tests with 2 skipped across 183 files. Full format
  check, lint, typecheck, production build, and scoped tracked/untracked whitespace checks pass;
  lint reports only the existing React Compiler advisory in `TransactionVirtualRows.tsx`. No app,
  browser, Playwright, E2E, commit, push, reset, stash, database-history, wrapper, custom runner,
  alternate config, or disposable-stack action was performed by this task owner.

## Session 2026-09-01 — Task 67 final browser and project verification

- Targeted retry-free one-worker journeys all passed: `transactions.spec.ts` 44/44,
  `description-aliases.spec.ts` 5/5, `transaction-grid-structure.spec.ts` 3/3, and
  `vault-settings.spec.ts` 9/9. The preserved pre-reconciliation failure bundles remain untouched.
- The required static/unit chain passed: `pnpm typecheck`; `pnpm lint` with only the existing React
  Compiler incompatible-library advisory at `TransactionVirtualRows.tsx:101:25`; `pnpm format:check`
  across 1,112 files; and `pnpm test` with 3,405 passed, 2 skipped tests across 183 files. An
  earlier format interruption caused solely by Next-generated `AGENTS.md` reflow is preserved at
  `/tmp/task67-final-chain-format-failure-20260901.md`.
- Final full E2E was run directly as
  `pnpm exec playwright test --workers=1 --retries=0 --reporter=list` and passed 188/188 in 13.4
  minutes. Its terminal output and passing `.last-run.json` are copied unchanged under
  `/tmp/task67-final-sequential-full-e2e-20260901/`. The monitoring shell reported exit 1 only after
  the passing Playwright command because zsh treats `status` as read-only; its captured stderr is
  `read-only variable: status`. This is an evidence harness exit, not a Playwright failure: the raw
  terminal log ends `188 passed (13.4m)` and `.last-run.json` records
  `{ "status": "passed", "failedTests": [] }`.
- The earlier four-worker full E2E was intentionally interrupted by the coordinator because it
  violated the sequential requirement; its absent final results are not product evidence. The
  subsequent three-test line-reporter run was intentionally stopped solely to change to the required
  list reporter; its immutable output is at
  `/tmp/task67-direct-line-reporter-stop-20260901/runner-output.log`.
- After final process/port inspection found no owned Next, Playwright, or Chromium process and no
  port-3000 listener, the stale `.next/dev/lock` was removed. Only Next-generated `AGENTS.md` and
  `next-env.d.ts` drift was normalized. No product/test change, commit, push, reset, stash, wrapper,
  alternate stack/configuration, or database-history action was performed by the browser owner.

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

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

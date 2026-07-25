# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16D / 01
- **Scope IDs:** FS-001 and HS-009. P16D can authorize HS-009 only after independent PASS; FS-001
  remains open and immutable through P16E.
- **State:** implementing; reviewer undispatched
- **Binding tasks:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16D and
  `tasks/HS-009-allocation-bounds.md` P16D
- **Canonical authority:** all 715 immutable lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`
- **Dependencies:** P16C/02 and P13/02 passed
- **Literal cumulative review BASE / clean pre-product HEAD:**
  `3a5081ac37e09817e0d02ae8799469d1bf09dad5`
- **Sole implementer artifact:** `evidence/P16D/implementation-01.md`
- **Future immutable review artifact:** `reviews/P16D-review-01.md`
- **Allowed product paths:** exactly
  `src/app/(app)/transactions/page.tsx`,
  `src/components/features/transactions/TransactionTable.tsx`,
  `src/components/features/transactions/TransactionRow.tsx`,
  `src/components/features/transactions/column-config.ts`,
  `src/components/features/transactions/allocation-columns.ts`,
  `src/components/features/transactions/cells/PersonAllocationCell.tsx`,
  `src/components/features/transactions/cells/index.ts` and
  `src/components/features/transactions/index.ts`.
- **Allowed test paths:** exactly
  `tests/unit/transactions/allocation-grid.test.tsx`,
  `tests/unit/transactions/virtualization.test.tsx`,
  `tests/unit/transactions/keyboard-navigation.test.ts` and
  `tests/e2e/transactions.spec.ts`.
  New enumerated paths may be created. Do not edit every authorized path by default. Report a
  reproducible blocker before root considers any other path.
- **Read-only owners:** P16A allocation/ownership domain; P16C CRDT allocation mutation/context
  APIs; P13 add-row implementation; P09 history; P10 presence transport; P14 import; schema,
  configuration and all other tests.
- **Forbidden writes:** every other product/test path; P16A–P16C product/tests/artifacts; P10
  presence transport; dependencies/configuration; tasks/specs; scratch; canonical FS-001; SCOPE;
  ledgers; `.claude`; `.codex`; agent configuration and future review.
- **Commit contract:** create the sole evidence before test/product edits. Check in exhaustive
  counterfactual real-grid tests against byte-identical production as one exact-path RED commit,
  then stage/commit only exact authorized product/test paths for GREEN with short no-parentheses
  messages. Leave `evidence/P16D/implementation-01.md` uncommitted. Never use `git add .` or
  `git add -A`.

## Required grid model and surfacing

- Compute one stable memoized column model/template from active People plus every nonzero stored
  allocation Person ID in the currently displayed transaction prefix. Active People come first in
  deterministic product order; deleted People use their retained name and a clear historical
  marker; missing records use an unambiguous stable unknown label containing enough Person identity
  to distinguish columns. Do not expose `$cid`, zero-only historical references or unstable
  index-based IDs.
- Header, every virtualized data row, expanded notes row and newly inserted manual row must consume
  the same computed template/model. Many People must produce one horizontally scrollable grid whose
  sticky header, cells, notes span, focus and vertical virtualization remain aligned. Do not add
  generic column reorder/resize, parallel non-grid controls or an orphan popover.
- `TransactionRowData` must carry the raw stored allocation map and account ownership input needed
  for exact P16A derivation without mutation or normalization. Invalid legacy entries must remain
  visible as an issue state and individually repairable; they must never be silently dropped,
  rounded, clamped or rewritten by render.
- Preserve all existing transaction columns, add/manual row ordering/reveal/focus, notes expansion,
  selection, filtering, duplicate handling and vertical virtualizer behavior. Dynamic allocation
  columns must be part of keyboard cell identity, not decorative content.

## Required allocation cell contract

- Replace/decompose/retire the orphan aggregate `PersonAllocationCell` into the actual one-Person
  grid cell. Display only the explicit stored value: muted dash for absent/zero, exact signed
  decimal text for nonzero and a clear invalid-legacy presentation for non-number/non-finite/
  out-of-range data. Never render owner remainder as user-entered allocation.
- Pointer and keyboard activation enter a local text draft. Accept inclusive finite `[-100, 100]`,
  including signed decimals; valid Enter or blur commits through P16C
  `setTransactionAllocation`, valid numeric zero removes the key, and Escape restores the original
  without a write. Reject empty-as-commit, `-101`, `101`, `NaN`, `Infinity`, exponent overflow,
  malformed/pasted text and negative zero without committing.
- Invalid typed text stays local and focused/repairable with role/name/state and an associated
  accessible error. Feedback must reserve space or otherwise avoid resizing/occluding the
  virtualized row. Blur with invalid text must not commit or strand inaccessible state.
- Tooltip and accessible description must distinguish this Person's explicit stored value,
  P16A-derived effective value and relevant owner remainder. When derivation is invalid, surface
  that issue honestly rather than manufacturing an effective share. Use exact P16A strings without
  surprise display rounding.
- Allocate presence identity as exact `allocation:<personId>` for callbacks/data semantics so
  different Person cells are distinguishable. P10's encrypted multi-user field-presence transport
  is not yet available: do not invent or weaken it, broadcast plaintext, or claim that P16D
  completes P10. Two-tab/user P16D evidence must prove real CRDT different-cell value convergence;
  record the current transport boundary honestly.
- The existing add button inserts a persisted blank transaction. Its resulting row must expose the
  identical Person columns immediately, persist `{}` when blank, commit allocation edits through
  the same central API, and retain them through refresh/undo/import coexistence.

## Tests, evidence and preservation

- RED must directly mount/use the real `TransactionTable`/`TransactionRow` and page route where
  appropriate. Cover active, deleted and missing Person columns; nonzero/zero discovery; stable
  ordering/labels; shared header/data/notes/add-row template; many-Person horizontal scroll;
  vertical virtualization and focused edited-row retention.
- Exhaustively cover pointer and keyboard entry, paste, signed decimals, `-101`, `101`, non-finite/
  malformed/negative-zero, Enter, blur and Escape; explicit versus effective/remainder text;
  invalid legacy display/repair; zero-key removal; accessible error geometry; Person-specific
  field identity; refresh and one-action undo. Include deterministic generated boundary/draft
  schedules with fixed seeds and independent exact oracles.
- Preserve P16C central validation, per-key merge/LWW, rollback, structural/history/persistence
  retention and public API routing. Add no direct allocation object mutation in the page or
  components. Preserve P13 add-row, P09 undo, P14 manual/import coexistence and current
  transaction/description-alias/drop-zone behavior.
- Run focused tests in three clean processes, relevant P16A/P16C/P13 owners, full deterministic
  Vitest, typecheck, lint, build, exact changed oxfmt/ESLint, cumulative diff and repository format
  baseline. Run affected and full read-only Chromium with one worker, retries zero and line
  reporter.
- Measure allocation interaction from activation/input through committed render in a realistic
  virtualized many-row/many-Person table, disclose environment/warmup/samples/p50/p95/max and
  compare the `<100ms` target. Do not substitute isolated domain mutation timings.
- Use installed headless `playwright-cli` only, unique session `p16d-impl-01` and a root-owned keyed
  server. Exercise real onboarding/People/Transactions, active/historical/missing columns,
  pointer/keyboard/paste/bounds, add/manual/import rows, refresh/undo, a second tab or disposable
  second user for real value convergence, narrow horizontal scroll, dark/reduced motion,
  role/name/state, reflow/200%-zoom, contrast, console/network and boolean-only privacy. Do not
  reveal/copy recovery material. Close/delete/list and request exact root cleanup.
- Evidence records literal BASE, RED, committed product/test HEAD, exact paths/index, model and
  interaction invariants, fixed seeds, automated/browser/manual/performance/cleanup results,
  invalid-legacy and P10 boundary honesty, risks and any complete `Q-PROPOSAL-P16D-01-*`. Format
  before freeze and never claim independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, coding/TypeScript rules and
  `.claude/skills/crdt/SKILL.md`, `.claude/skills/sync/SKILL.md`,
  `.claude/skills/e2e/SKILL.md`.
- **Decision rule:** record a material ambiguity as a complete evidence proposal and continue under
  PROCESS hierarchy; do not ask the human. No proposal may weaken real-grid ownership, explicit/
  effective distinction, strict P16C validation, invalid-legacy retention, accessibility,
  virtualization, encryption or preservation.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, all 21 normalized
  blocks exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, undispatched until the evidence freeze commit
- **Literal cumulative review BASE:** `3a5081ac37e09817e0d02ae8799469d1bf09dad5`
- **Literal HEAD:** pending
- **Implementation evidence:** `evidence/P16D/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P16D-review-01.md`
- **Reviewer writes:** only the review file; no other edit/commit
- **Required focus:** independently challenge actual dynamic grid ownership, shared alignment/
  virtualization, active/historical/missing discovery, exact explicit/effective/remainder display,
  complete draft state machine and central mutation routing, invalid-legacy repair, add-row,
  keyboard/accessibility/presence identity, two-peer value convergence, undo/refresh, real browser
  geometry/privacy and `<100ms` interaction.
- **Verdict:** one PASS/FAIL with exact findings, canonical mapping, independent generated
  mechanisms/oracles, automated/browser/manual/performance/cleanup and Q proposals. Any orphan-only
  implementation, direct allocation mutation, hidden legacy value, remainder-as-explicit display,
  invalid commit, unstable/misaligned column, virtualization/focus regression or false presence
  claim fails.

## Next root action

Wait for `human_scratch_implementer` to return the exact P16D/01 artifact and committed product/test
HEAD, then clean root-owned runtime artifacts and freeze evidence before reviewer dispatch.

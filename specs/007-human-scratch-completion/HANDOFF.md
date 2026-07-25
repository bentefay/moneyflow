# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16C / 01
- **Scope IDs:** FS-001 and HS-009; this package owns CRDT allocation mutation boundaries,
  concurrency, persistence, structural preservation and every current non-visual write/restore/
  hydration path. Neither requirement can complete from P16C alone.
- **State:** reviewing after the current root review-dispatch control commit
- **Binding tasks:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16C and
  `tasks/HS-009-allocation-bounds.md` P16C
- **Canonical authority:** read all 715 immutable lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`; its per-key merge, atomic
  complete-set, reject-only, legacy-retention and preservation rules are binding
- **Dependencies:** P16A/02, P16B/05, P09/02 and P14/04 passed
- **Literal original cumulative review BASE / clean pre-product HEAD:**
  `0a7c9a49722ddc4d955f910af6dbb19cfffbd600`
- **Sole implementer artifact:** `evidence/P16C/implementation-01.md`
- **Frozen implementer artifact:** `evidence/P16C/implementation-01.md`, SHA-256
  `0d08bb7884d37675d94735bdc65d6e5bfb7f5c488c4c64f8c10819bcc745a31b`, 230 lines /
  17,079 bytes
- **RED checkpoint:** `ff45176c5e30f66e8d10990daddb955d1c2277ad`
- **Product/test HEAD:** `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`, tree
  `3e6e80a030e81ae68a4ab3b499a544b1b9ceac26`
- **Evidence freeze commit:** `92ce0a75cc5ced114e8a81e8d452961f738e1a60`
- **Future immutable review artifact:** `reviews/P16C-review-01.md`
- **Implementation-start boundary:** clean HEAD/index/worktree; P16B/05 is fully integrated and its
  immutable evidence/review plus settlement owner are preservation authority
- **Allowed product paths:** exactly
  `src/lib/crdt/allocations.ts` (new dedicated owner if used),
  `src/lib/crdt/mutations.ts`,
  `src/lib/crdt/context.tsx`,
  `src/lib/crdt/index.ts`,
  `src/lib/crdt/mirror.ts`,
  `src/lib/crdt/migration.ts`,
  `src/lib/crdt/schema.ts`,
  `src/lib/crdt/description-aliases.ts`,
  `src/lib/domain/automation.ts`,
  `src/app/(app)/transactions/page.tsx` and
  `src/app/(app)/imports/new/page.tsx`.
- **Allowed test paths:** exactly
  `tests/integration/allocation-crdt.test.ts` (new canonical integration owner if used),
  `tests/unit/crdt/transaction-mutations.test.ts`,
  `tests/unit/crdt/hierarchical-schema.test.ts`,
  `tests/unit/crdt/sync.test.ts`,
  `tests/unit/crdt/undo.test.tsx`,
  `tests/unit/domain/automation.test.ts`,
  `tests/integration/transaction-operations.test.ts`,
  `tests/integration/automation.test.ts`,
  `tests/integration/import.test.ts` and
  `tests/integration/vault-provider-allocation-repair.test.ts` (new hydration owner if used).
  Existing E2E is read-only. Do not edit all authorized paths by default; use only proven owners.
  Report a reproducible owner blocker before root considers any expansion.
- **Forbidden writes:** every other product/test path, P16A/P16B product or artifact, settlement/
  ownership/allocation-domain owners, dependencies/configuration, tasks/specs, scratch, canonical
  FS-001, SCOPE, ledgers, `.claude`, `.codex`, agent configuration and future review. Report guide/
  risk/question transcription for root rather than editing it.
- **Commit contract:** create the sole evidence before test/product edits. Stage and commit only
  exact authorized test paths for the RED checkpoint, then only exact authorized product/test paths
  for GREEN with short messages containing no parentheses. Leave
  `evidence/P16C/implementation-01.md` uncommitted. Never use `git add .` or `git add -A`.

## Required implementation

- **Dedicated central boundary:** preserve `transaction.allocations` and nested-duplicate
  allocations as Loro maps keyed by exact Person ID. Provide typed set/remove-one and complete
  explicit-set replacement operations over a logical transaction location. One-person mutation
  touches only that Person key and never rewrites sibling keys. Zero removes that exact key;
  signed decimals and inclusive `-100..100` use the passed P16A validator without reimplementation.
- **Reject-only validation:** reject non-number, non-finite, negative zero, below `-100` and above
  `100` before mutation. Never clamp, coerce, normalize, derive or store an effective allocation.
  Return immutable typed success/error data suitable for grid, add row, automation, import,
  restoration, hydration repair and future bulk callers; expected invalid input is not an
  uncontrolled exception.
- **Atomic complete replacement:** materialize and validate every own enumerable Person entry before
  touching any key. Reject malformed containers/entries without partial state. On success, in one
  logical vault action, remove absent existing Person keys only after validation and set the exact
  supplied explicit nonzero values. Exact collection metadata is not a Person allocation. Do not
  accept inherited/accessor/proxy tricks as a path around validation or mutate caller input.
- **CRDT semantics:** different-Person concurrent edits from two peers merge; same-Person edits
  converge under established Loro LWW semantics. Operations must use draft-style loro-mirror
  mutation and Loro history only, never plain detached-object replacement or hidden parallel state.
  An allocation commit or complete replacement is one UndoManager action. Provide the stable
  presence field identity `allocation:<personId>` for P16D without implementing P16D UI.
- **All current write paths:** prevent generic transaction updates from assigning `allocations`
  around the central boundary. Route manual/add-row insertion with nonempty allocations, current
  automation `setAllocation` evaluation/application, automation application capture and undo/
  restoration, import-time insertion/application and any current bulk-complete-set route through
  the same validation contract. Invalid automation/import/restoration input must not mutate another
  field or allocation key under a supposedly atomic operation.
- **Structural preservation:** move across date/account, swap parent/duplicate, nest and unnest
  retain every valid explicit allocation exactly. Copy logic must neither drop legitimate Person
  IDs nor copy collection metadata as data, and must not normalize totals.
- **Persistence and encrypted convergence:** snapshot/export/import/reload, encrypted snapshot/
  update flows and two-peer collaboration retain allocations and converge. Prove this through the
  actual Loro/schema/snapshot owners rather than a plain-object surrogate.
- **Hydration/migration compatibility:** existing valid maps require no destructive migration.
  Existing invalid legacy values remain retained and observable for typed downstream surfacing;
  hydration must not silently delete, clamp or normalize them. Central individual repair can
  replace/remove one invalid Person value without rewriting valid siblings. Do not expand alias/
  sentinel repair merely to make invalid allocations disappear.
- **Preservation:** retain P16A validation/remainder/apportionment and P16B exact settlement,
  hierarchy/retained-validation, source, currency, netting, issue and immutability semantics.
  Preserve P09 undo grouping, P14 import lineage/original amount/delete-import behavior and P11
  description-alias bookkeeping. No P16D grid/person-column or P16E People-obligation UI work.
- **Decision rule:** a material ambiguity becomes a complete `Q-PROPOSAL-P16C-01-*` in evidence
  under the PROCESS hierarchy; continue without asking the human. No proposal may weaken per-key
  merge, atomic complete replacement, reject-only bounds, legacy retention, encrypted convergence,
  one-action history or preservation.

## Required evidence

- **RED before GREEN:** before product edits, check in focused tests that fail on the unchanged
  baseline for set/update/remove-one, sibling-key preservation, atomic complete replacement and
  rollback, invalid bounds/types/negative zero, generic-update bypass, automation/import/undo/
  hydration bypass and presence identity. Capture exact failures at a committed RED checkpoint.
- **Independent CRDT mechanisms:** use initialized Loro docs/mirrors and literal operation exchange
  to prove different-key merge and same-key convergence in both import orders. Add fixed-seed
  generated schedules over Person keys/values/peer order with an independently derived oracle;
  detached records or comparing a helper to itself are insufficient.
- **Complete-set mechanisms:** cover absent-key deletion only after full validation, empty-set
  clearing, totals below/at/above 100, signed decimals, exact boundaries, zero removal, caller
  descriptor/input purity, adversarial Person IDs including metadata-like names, deterministic
  errors and unchanged document version/history on failure.
- **Path matrix:** enumerate every production allocation source and prove its route or honest
  current absence. Cover grid/add-row contract insertion, automation application, automation undo,
  import-time automation/insertion, bulk replacement, migration/hydration and individual repair.
  A domain function that merely returns an unchecked record is not proof of safe CRDT application.
- **History/preservation:** prove one successful set/remove/replacement equals one logical undo
  action, failed operations create no history, undo/redo restores exact maps, and move/swap/nest/
  unnest plus description-alias and import-delete operations preserve or restore exact allocation
  values.
- **Persistence:** round-trip plain and encrypted snapshot/update flows, reload mirrors and
  collaboration peers. Include existing valid, empty, signed-decimal and invalid-legacy maps.
  Invalid legacy input must remain retained until an exact-key repair while valid siblings remain
  byte/value-equivalent.
- **Focused automation:** run the P16C unit/integration profile in at least three clean processes.
  Run broader CRDT, domain automation, transaction/import/history and sync profiles, then full
  Vitest. Report exact commands, files/tests/skips, fixed seeds, operation counts and elapsed times.
- **Regression gates:** run typecheck, lint, build, exact changed-path oxfmt/ESLint,
  `git diff --check`, repository `format:check` with inherited baseline disclosed, affected
  Accounts/Transactions/Imports/undo Chromium and full Chromium with one worker, retries zero and
  line reporter. Existing E2E remains read-only.
- **Installed-CLI charter:** use only installed headless `playwright-cli`, unique disposable session
  `p16c-impl-01` and a root-owned keyed server. P16D owns surfaced allocation cells, so do not fake
  allocation editing or claim UI acceptance. Preserve honest current onboarding, add/manual/import
  transaction, move/edit/delete/undo/reload, People settlement caller, responsive/200%-zoom,
  dark/reduced, accessibility, console/network and boolean-only privacy behavior. Close/delete/list
  the session and request exact root cleanup.
- **Performance evidence:** fixed-seed production operations over representative large maps and
  transaction sets, including one-key edit cost versus complete replacement, with warmup/samples/
  environment and actual result. Do not claim P16E's full 100,000-transaction UI target.
- **Evidence artifact:** record original BASE, control/pre-product HEAD, RED checkpoint, exact
  committed product/test HEAD, exact paths/index; API/result contract; all direct/generated CRDT
  mechanisms; path matrix; undo/persistence/legacy/structural preservation; gates/manual/benchmark;
  exclusions, cleanup, frozen hashes, risks and any complete Q proposal. Format before freeze and
  never claim independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, coding/TypeScript rules and
  `.claude/skills/crdt/SKILL.md`, `.claude/skills/sync/SKILL.md`,
  `.claude/skills/import/SKILL.md`, `.claude/skills/e2e/SKILL.md`.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, all 21 normalized
  blocks exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, dispatched after evidence freeze commit
  `92ce0a75cc5ced114e8a81e8d452961f738e1a60`
- **Literal cumulative review BASE:** `0a7c9a49722ddc4d955f910af6dbb19cfffbd600`
- **Literal revision-01 HEAD:** `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`
- **Implementation evidence:** `evidence/P16C/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P16C-review-01.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** independently prove central set/remove/complete-set APIs, exact
  validation and rollback, true Loro per-key concurrency/LWW, one-action history, every current
  automation/import/undo/hydration route, invalid-legacy retention and individual repair, encrypted
  persistence/convergence and move/swap/nest/unnest preservation. Look specifically for generic
  update casts, detached-map replacement, partial delete-before-validate, `$cid` confusion,
  proxy/accessor bypass, silent hydration repair, multi-action undo and tests that never exercise
  actual initialized mirrors.
- **Verdict contract:** review the literal range with explicit findings, canonical acceptance
  mapping, independent fixed-seed schedules/oracles, affected/full gates, installed-CLI evidence,
  cleanup/Q proposals and one PASS/FAIL. Any lost sibling edit, invalid stored value, partial
  replacement, destructive legacy migration, persistence loss, history split or current-path
  bypass fails.

## Next root action

Await the distinct reviewer's one PASS/FAIL artifact over the literal cumulative range. Root then
verifies the sole-write boundary, performs exact generated-artifact cleanup and integrates findings,
risks and any Q proposal. Keep HS-009 unchecked and FS-001 immutable/open.

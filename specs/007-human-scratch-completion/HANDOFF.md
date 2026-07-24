# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16A / 02
- **Scope IDs:** FS-001 and HS-009; this package owns allocation/ownership validation, owner
  remainder/effective allocation and exact signed-minor-unit apportionment only. Neither requirement
  can complete from P16A alone.
- **State:** passed; immutable review integrated in
  `41f5760f77c1a93ab650a93912bfaf3c0b627ab0`
- **Binding tasks:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16A and
  `tasks/HS-009-allocation-bounds.md` P16A
- **Canonical authority:** read all 715 lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`; its explicit-set,
  owner-remainder, exact-apportionment and reject-only rules override older code/tests
- **Dependency:** P01/02 passed; P16A is the next package on the allocation critical path
- **Literal original cumulative review BASE / clean pre-product HEAD:**
  `1b42d27e11494a167a4768e0c2c308010aa51651`
- **Revision-01 dispatch/control HEAD:** `d0b2324f997d5dffe8326c9f4777a94daaedf49e`
- **Revision-01 product/test/dependency HEAD:** `6671c09a5ca94ccb4ff47564c15d44935cc73479`
- **Frozen revision-01 implementer artifact:** `evidence/P16A/implementation-01.md`, SHA-256
  `4fb0fadd5fafdde02d3d20cc3349a47abc228092ad375a112360f3864548ba33`, 272 lines /
  16,695 bytes
- **Immutable revision-01 review artifact:** `reviews/P16A-review-01.md`, FAIL, SHA-256
  `5ad6685bf5d4ceba62bde80b4074e7998313197bb494ce85a7e23ded5645184f`, 260 lines /
  18,276 bytes
- **Revision-01 failure integration / revision-02 clean pre-implementation HEAD:**
  `ab5334d8d1311119f0e0240aea2e92ade239aa15`
- **Frozen revision-02 implementer artifact:** `evidence/P16A/implementation-02.md`, SHA-256
  `8262393794bafe48d428e21bdcb39f0a51bb64fe65d735f7bb21f5f45e923868`, 203 lines /
  13,291 bytes
- **Revision-02 product/test HEAD:** `f84f66758708529c44342313e8632ee8b7dcead3`
- **Immutable revision-02 review artifact:** `reviews/P16A-review-02.md`, PASS, SHA-256
  `2835a78fd15502d8bef54dd6d3f11b7d7a7875694270f953369a5cc4265c737b`, 237 lines /
  17,406 bytes
- **Implementation-start boundary:** clean HEAD/index/worktree; revision-01 evidence/review and
  F-01/R-033 transcription are committed and immutable
- **Allowed revision-02 product/test paths:** exactly
  `src/lib/domain/allocation.ts`,
  `src/lib/domain/ownership.ts`,
  `tests/unit/domain/allocation.test.ts`,
  `tests/unit/domain/ownership.test.ts`. No barrel, manifest/lock, settlement engine, CRDT/schema,
  component/page, E2E, import, automation, migration, configuration or other path is authorized
  unless a reproducible owner blocker is first reported and root explicitly expands the list.
- **Forbidden writes:** all ledgers, tasks/specs, P15 artifacts, scratch, canonical FS-001, SCOPE,
  `.claude`, `.codex`, agent configuration and future review. Report any needed guide/config
  transcription in evidence for root.
- **Commit contract:** inspect every owner and current caller before editing. Stage the exact
  authorized product/test paths only, commit with a short message containing no parentheses, and
  leave `evidence/P16A/implementation-02.md` uncommitted. Never use `git add .` or `git add -A`.

## Required revision-02 closure

- **F-01 full result-graph immutability:** freeze every public success/failure envelope, every
  returned error array, every individual typed error object and every nested success value/map for
  allocation-set validation, exact-weight validation, ownership-set validation, effective
  derivation and apportionment. A caller must not be able to change `ok`, error reason/count/context,
  returned values or share maps after return.
- **Branch-complete regression:** add direct runtime tests for every success and failure branch,
  including empty ownership, invalid total, invalid individual entries, invalid exact-weight total,
  invalid amount, allocation/ownership failure propagation, valid derivation and valid
  apportionment. Assert the complete exposed graph is frozen and mutation attempts cannot change
  discriminants, reasons/counts or values. Preserve discriminated unions and already-frozen maps.
- **Cumulative preservation:** do not alter the proven schemas, explicit-set copy/preservation,
  exact positive/zero/negative remainder/effective derivation, mathematical signed floors, largest
  fractional remainder/stable-ID tie ordering, safe-integer conservation, dependency choice,
  benchmark scope, ownership compatibility or P16A/P16B scope boundary.
- **Decision rule:** F-01 is explicit. If a new material ambiguity remains, record a complete
  `Q-PROPOSAL-P16A-02-*` in evidence, apply the PROCESS hierarchy and continue; do not ask the human
  or pause.

## Required implementation

- **Domain-specific validation:** introduce reusable allocation and ownership schemas/types/results
  instead of treating unrestricted generic `Percentage` as proof. Allocation accepts finite
  inclusive `-100..100` signed decimals and canonical zero, but rejects negative zero, NaN,
  infinities and either out-of-range boundary. Ownership is distinct: every value finite
  inclusive `0..100`, at least one owner, collective total 100 within the established tolerance.
  Expected invalid input returns typed data, not business-control-flow exceptions.
- **Explicit-set preservation:** validate every entry independently. Explicit totals below, equal to
  and above 100 are valid and remain byte/value-equivalent; never clamp, normalize, delete or
  redistribute the user's explicit map. A stored zero may be canonicalized only by later mutation
  owners; P16A pure derivation must not mutate its input.
- **Remainder/effective derivation:** derive exact `100 - sum(explicit)` over positive, zero and
  negative remainder. Distribute it proportionally through valid account ownership across the union
  of explicit and owner person IDs. Empty explicit maps yield ownership-only effective allocation.
  Multiple owners, negative/decimal explicit values, overlapping IDs and insertion-order changes
  must all produce deterministic weights totaling exactly 100 before monetary rounding.
- **Exact signed apportionment:** provide one production pure apportionment for a signed integer
  minor-unit amount and validated decimal weights totaling 100. Sort stable person IDs; use
  established exact decimal arithmetic; mathematically floor every exact share including negative
  shares; distribute remaining units by largest fractional remainder with ascending person-ID tie
  breaks; conserve the original amount exactly. Positive, negative, zero, one-cent and
  zero-decimal-currency amounts must work. Effective and ownership weights must each independently
  apportion to the source amount.
- **Reusable P16B/C/D boundary:** return immutable typed success/error data that later packages can
  consume without re-parsing with binary floating point or reimplementing formulas. Keep mutation,
  settlement eligibility/netting/issues and UI behavior out of P16A.
- **Current ownership compatibility:** harden the existing ownership validator against non-finite
  and negative-zero values without silently changing established valid account create/edit flows.
  Existing convenience mutation/normalization helpers are not evidence for allocation semantics and
  must not be repurposed to normalize explicit allocations.
- **Decision rule:** if a material ambiguity remains, record a complete
  `Q-PROPOSAL-P16A-02-*` in evidence, apply the PROCESS hierarchy and continue; do not ask the human
  or pause. No proposal may override the canonical reject-only or no-normalization clauses.

## Required evidence

- **Red before green:** before product edits, add checked-in tests that reproduce F-01's exact
  runtime mutations against unchanged revision-01 product: invalid `ok` false→true, changed error
  reason, appended ownership error, changed valid derivation/apportionment discriminants and every
  uncovered branch graph. Preserve exact red output; those same tests must turn green without
  deleting or weakening revision-01 arithmetic/property assertions.
- **Production property tests:** table-drive every exact boundary and use fixed-seed `fast-check`
  properties against production functions for explicit totals below/at/above 100, union/remainder/
  effective total, insertion-order independence, positive/negative/zero amounts, negative weights,
  stable ties and exact conservation. Tests may use an independent oracle but may not define the
  production algorithm inside the test or compare a function to itself.
- **Focused automation:** run the allocation/ownership unit profile in at least three clean
  processes. Run a broader domain owner profile including current settlement callers to prove P16A
  did not accidentally implement or break P16B. Report seeds/run counts, commands, files/tests and
  elapsed times.
- **Regression gates:** run full Vitest, typecheck, lint, build, exact changed-path format/ESLint and
  `git diff --check`. Run repository `format:check` and report its exact inherited baseline without
  rewriting frozen/historical files. Run affected Accounts and Transactions Chromium journeys and
  the full Chromium suite with one worker and retries zero; do not edit E2E merely to manufacture
  P16A coverage.
- **Performance evidence:** measure the production derivation/apportionment primitive over
  representative large person/iteration sets with deterministic inputs and disclose environment,
  warmup, samples and result. Do not claim the P16B 100,000-transaction settlement target from a
  P16A microbenchmark.
- **Installed-CLI charter:** use only installed headless `playwright-cli`, a unique disposable
  `p16a-impl-02` session and a root-owned keyed server. Because the real allocation grid belongs to
  P16D, do not fake surfaced P16A acceptance. Instead preserve the real current account flow:
  fresh masked-word identity, default Me ownership at 100, create/edit account ownership with valid
  totals, visible rejection of an invalid total, transaction/People navigation, reload, narrow/
  200%-zoom, dark/reduced-motion, deterministic role/name/state, console/network and plaintext
  storage/request absence. Exclude and report failed/hung exploratory harnesses.
- **Dependency audit:** record why existing `currency.js` is sufficient or why a newly direct exact
  decimal dependency is necessary. If dependency files change, report exact manifest/lock delta,
  license/size/security compatibility and no unrelated lock drift.
- **Evidence artifact:** record original BASE, revision-02 pre-product HEAD, cumulative committed
  HEAD, exact paths/index; mechanisms/API contract; red/green/property seeds and counts; all command
  results; sanitized benchmark/manual evidence; inherited failures; cleanup; frozen boundaries;
  risks and any complete Q proposal. Format the artifact before freeze and never claim independent
  PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, `.claude/rules/coding-style.md`,
  `.claude/rules/typescript-style.md` and `.claude/skills/e2e/SKILL.md`.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, all 21 normalized
  blocks exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, completed after frozen evidence commit
  `9f57538a07fd369093e5253eef0111d9d0218b63`
- **Literal cumulative review BASE:** `1b42d27e11494a167a4768e0c2c308010aa51651`
- **Literal revision-02 HEAD:** `f84f66758708529c44342313e8632ee8b7dcead3`
- **Implementation evidence:** `evidence/P16A/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P16A-review-02.md`
- **Reviewer writes:** the new review file only; no product/test/evidence/ledger/config/frozen edit
  or commit
- **Required review focus:** independently prove domain separation, every finite/boundary rule,
  no explicit-set normalization, exact positive/negative remainder/effective total, signed
  mathematical floor/largest remainder/stable tie/conservation, insertion-order independence,
  reusable typed purity, dependency choice and unchanged current ownership UX. Look specifically
  for binary-float leakage, `-0`, invalid ownership tolerance, input mutation, test-local oracles
  that reproduce the same bug, accidental P16B scope and unsupported performance claims.
- **Verdict contract:** review the literal cumulative range with explicit findings, canonical
  acceptance mapping, independent property seeds/counts and counterexamples, affected/full gates,
  installed-CLI evidence, cleanup/Q proposals and one PASS/FAIL. Any financial normalization,
  lost minor unit, unstable ordering, negative-floor error, validation hole or compatibility
  regression fails.

## Next root action

Rewrite this handoff for dependency-ready P16B revision 01 using the clean post-P16A-pass HEAD as
its original BASE. Keep HS-009 unchanged and FS-001 immutable/open.

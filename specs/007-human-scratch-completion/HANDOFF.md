# Current Package Handoff

Root rewrites this compact file for one package/revision. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16B / 03
- **Scope ID:** FS-001; this revision closes only P16B review-02 F-04/F-05 while preserving every
  independently proven settlement invariant. FS-001 remains incomplete.
- **State:** implementing after immutable revision-02 failure integration; reviewer is undispatched
- **Binding task:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16B
- **Canonical authority:** all 715 immutable lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`
- **Dependency:** P16A/02 passed
- **Literal original cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Revision-02 product/test HEAD:** `50b36beb0c7cf9a73d623ed964b6ba05919fffc6`
- **Frozen revision-02 evidence:** `evidence/P16B/implementation-02.md`, SHA-256
  `75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e`, 264 lines /
  18,293 bytes
- **Immutable revision-02 review:** `reviews/P16B-review-02.md`, FAIL, SHA-256
  `09814cd6a719189afd4951e6683b2f216d6eace729fe230d55add4a2c497054f`, 329 lines /
  19,155 bytes
- **Revision-02 failure integration / clean pre-revision HEAD:**
  `ef35b2753b2a12fa73f0f1ebdf9c1454de81b07a`
- **Sole revision-03 implementer artifact:** `evidence/P16B/implementation-03.md`
- **Future immutable revision-03 review artifact:** `reviews/P16B-review-03.md`
- **Allowed revision-03 product/test paths:** exactly
  `src/lib/domain/settlement.ts` and `tests/unit/domain/settlement.test.ts`.
- **Forbidden writes:** BalanceSummary and every other caller/component, balance/barrel/PeopleTable,
  every other product/test path, CRDT/schema/query/mutation owners, E2E, dependencies/configuration,
  tasks/specs, prior P16 artifacts, scratch, canonical FS-001, SCOPE, ledgers, `.claude`, `.codex`,
  agent configuration and future review. Report a reproducible blocker before root considers
  expansion.
- **Commit contract:** create the sole evidence before test/product edits; stage/commit only the
  exact two authorized product/test paths with a no-parentheses message; leave evidence uncommitted.
  Never use `git add .` or `git add -A`.

## Required F-04 closure — financial maps are actual records

- At allocation, ownership and every equivalent financial-map boundary, distinguish the
  contract-approved record envelope from arbitrary non-null objects. `Map`, `Set`, `Date`, RegExp,
  typed collections and custom/class instances must not become empty through `Object.entries`.
- Preserve `allocations === undefined` as canonical valid `{}`. Preserve valid ordinary and
  null-prototype records when the materialized contract permits them. Do not globally tighten a
  shared object predicate in a way that rejects valid TransactionStore materialization; use
  boundary-specific guards where runtime domains differ.
- Invalid object containers return stable contextual typed issues, exclude the affected transaction
  atomically and cannot contribute a plausible total. Missing/invalid ownership remains typed and
  safe. Never mutate or freeze caller inputs.
- Check in direct red tests against byte-identical revision-02 product for non-empty/empty `Map`,
  `Set`, `Date`, RegExp, null-prototype records and at least two custom/class instances across
  allocations, ownership and any other financial record guarded by the same predicate. Include the
  exact Bob 100% `Map` counterexample and prove it cannot become issue-free settled output.

## Required F-05 closure — malformed hierarchy is visible

- The settlement-owned `TransactionStore` projection must validate every retained required envelope:
  store root, account tree, years, year/month/day records, their child lists, transaction lists and
  mixed list elements. Missing/null/primitive/wrong-container/non-record descendants must not be
  silently skipped.
- Emit deterministic contextual topology/`invalid-transaction` issues for malformed retained
  subtrees, using stable non-sensitive context only. Preserve explicitly sanctioned CRDT metadata
  and `$cid` sentinels; do not classify valid materialized placeholders as corruption.
- A malformed subtree may not produce an issue-free settled claim or plausible total from discarded
  content. Valid sibling subtrees may remain calculable only while the issue makes the result
  incomplete. Issue/result graphs remain recursively frozen and input remains mutable/unaliased.
- Check in the exact `years: null` reproduction plus missing/null/primitive/object/array and
  mixed-invalid shapes at account-tree, years, months, days and transactions levels. Cover insertion
  permutations, multiple malformed siblings, stable complete issue order/context, valid-sibling
  preservation, no false qualifying count, input purity and output immutability.

## Preservation and evidence

- Preserve revision-02 closure of F-01/F-02/F-03: safe canonical missing allocations/duplicates,
  retired array API, retained hierarchical top-level ownership, active-before-canonicalization,
  nested exclusion, collision-free successful caches/aggregates and complete fresh failure context.
- Preserve sole engine/export/caller closure; named A–H; exact P16A signed positions; deterministic
  matching; currency isolation; reverse netting; signed source traceability; safe aggregate
  rejection; unknown/deleted People; full result freezing/input purity; issue privacy; no persisted
  cache; and current incomplete-state safety.
- Preserve reviewer seed `26072501`: 5,000 BigInt/rational cases, 1,000 reverse-source/
  multi-currency batches, adversarial IDs and safe aggregate limit. Add fixed revision-03 generated
  object-container/hierarchy properties with independent expected issue/context oracles.
- Red before green: add every F-04/F-05 regression while revision-02 product is byte-identical, run
  to exact failure, then implement without deleting or weakening prior expectations.
- Run focused settlement/balance/caller tests in three clean processes, broader domain/current
  caller, full Vitest, typecheck, lint, build, exact two-path oxfmt/ESLint and cumulative diff check.
  Report the inherited repository-format baseline without rewriting frozen files.
- Run affected Accounts/Transactions Chromium and full Chromium with one worker/retries zero; E2E
  files are read-only. Rerun deterministic 10k/50k/100k full-output benchmark after warmup and retain
  the honest P16E follow-up if all five 100k samples do not meet strict 200ms.
- Use installed headless `playwright-cli` only, unique session `p16b-impl-03` and root-owned keyed
  server. Exercise honest current onboarding/caller preservation, reload, responsive/zoom,
  dark/reduced, console/network and boolean-only privacy. Do not manufacture malformed retained
  state through UI or claim P16D/E behavior. Close/delete/list and request exact root cleanup.
- Evidence records original BASE, pre-product HEAD, red checkpoint, product HEAD, exact paths/index,
  mechanisms, direct/generated properties, seeds/oracles, all gates/benchmark/manual, exclusions,
  cleanup, frozen hashes, risks and any complete Q proposal. Format before freeze; never claim
  independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, coding/TypeScript rules, components and E2E skills.
- **Decision rule:** a material ambiguity becomes complete `Q-PROPOSAL-P16B-03-*` in evidence under
  PROCESS hierarchy; continue without asking the human. No proposal may weaken canonical legacy
  safety, typed exclusion, topology visibility, exact money, traceability or currency isolation.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, 21 normalized blocks
  exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, undispatched until revision-03 evidence freezes
- **Literal cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Literal revision-03 product/test HEAD:** pending exact committed HEAD
- **Implementation evidence:** `evidence/P16B/implementation-03.md`
- **Sole reviewer artifact:** `reviews/P16B-review-03.md`
- **Reviewer writes:** only that new review file; no other edit/commit
- **Required focus:** independently reproduce then close F-04/F-05 across non-plain financial-map
  objects and every malformed hierarchy level; re-prove F-01/F-02/F-03, exact arithmetic/netting/
  source/currency/issue/immutability core, named A–H, sole API/caller, full gates and honest scale.
- **Verdict:** one PASS/FAIL with exact findings, canonical mapping, independent seeds/oracles,
  browser/manual/cleanup and Q proposals. Any arbitrary object accepted as a financial map, silently
  discarded malformed topology, issue-free plausible invalid total or preservation regression fails.

## Next root action

Commit this revision-03 handoff/progress transition, then dispatch `human_scratch_implementer`
against the exact failure-integration HEAD and sole evidence path. Keep reviewer undispatched,
HS-009 unchanged and FS-001 immutable/open.

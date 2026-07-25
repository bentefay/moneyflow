# Current Package Handoff

Root rewrites this compact file for one package/revision. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16B / 02
- **Scope ID:** FS-001; this revision closes only P16B review-01 F-01/F-02/F-03 while preserving the
  independently proven settlement core. FS-001 remains incomplete.
- **State:** revision-02 implementation frozen; ready for independent review
- **Binding task:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16B
- **Canonical authority:** all 715 immutable lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`
- **Dependency:** P16A/02 passed
- **Literal original cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Revision-01 product/test HEAD:** `5242a2422cd86dd48eac07a4422491d5079ccd23`
- **Frozen revision-01 evidence:** `evidence/P16B/implementation-01.md`, SHA-256
  `48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`, 323 lines /
  21,736 bytes
- **Immutable revision-01 review:** `reviews/P16B-review-01.md`, FAIL, SHA-256
  `5dd6be1a1efbdbecb0a4a3e42e54ec7d0b55a05555deebd88c3009c97fd7df38`, 314 lines /
  18,758 bytes
- **Revision-01 failure integration / clean pre-revision HEAD:**
  `e33453f098f4bdea62d6ea358d2e86b5d0f9356b`
- **Frozen revision-02 implementer artifact:** `evidence/P16B/implementation-02.md`, SHA-256
  `75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e`, 264 lines /
  18,293 bytes
- **Revision-02 red-test checkpoint:** `6574405d1635c957299ef4650ccbc9bbfc7e0a00`
- **Revision-02 product/test HEAD:** `50b36beb0c7cf9a73d623ed964b6ba05919fffc6`
- **Future immutable revision-02 review artifact:** `reviews/P16B-review-02.md`
- **Allowed revision-02 product/test paths:** exactly
  `src/lib/domain/settlement.ts`,
  `src/components/features/people/BalanceSummary.tsx`,
  `tests/unit/domain/settlement.test.ts`,
  `tests/unit/components/balance-summary.test.tsx`.
- **Forbidden writes:** balance/barrel/PeopleTable, every other product/test path, CRDT/schema/query/
  mutation owners, E2E, dependencies/configuration, tasks/specs, P16A and P16B revision-01 artifacts,
  scratch, canonical FS-001, SCOPE, ledgers, `.claude`, `.codex`, agent configuration and future
  review. Report a reproducible blocker before root considers expansion.
- **Commit contract:** create the sole evidence before test/product edits; stage/commit only the exact
  four authorized product/test paths with a no-parentheses message; leave evidence uncommitted.
  Never use `git add .` or `git add -A`.

## Required F-01 closure — safe retained legacy boundaries

- Missing `transaction.allocations` is canonical valid legacy `{}` and must derive the 100% owner
  remainder without mutation, freezing caller input or throwing.
- Missing `suspectedDuplicates` must be safely treated as no nested children. Missing/null/non-record
  ownership, allocation or duplicate-list containers and non-string/invalid currency must never
  reach `Object.entries`, iteration or string methods unchecked. Valid missing allocation succeeds;
  invalid runtime envelopes return stable complete typed issues and contribute no plausible total.
- Validate/sanitize only at the settlement boundary. Never rewrite retained data or weaken P16A
  allocation/ownership rules. Result/input immutability and transaction-atomic exclusion remain.
- Add checked-in direct tests for every reviewer reproduction plus null, array, primitive and mixed
  invalid containers, invalid entry value types, missing fallback currency and immutable
  result/mutable-unaliased input behavior. No expected business input may throw.

## Required F-02 closure — unambiguous canonical topology

- Make the sole public `calculateSettlementBalances` boundary own canonical top-level extraction
  from the hierarchical `TransactionStore`. The current `readonly Transaction[]` API is retired; do
  not retain an overload/wrapper that permits callers to present a materialized nested transaction
  as top-level. `BalanceSummary` must pass retained store state directly.
- Traverse retained physical representations without mutating them. Filter active representations
  before same-ID canonicalization so a deleted copy cannot suppress a live copy. Select among active
  same-ID copies deterministically and independently of input/list/bucket order. Nested items remain
  excluded even when their parent is the only retained topology reference.
- Test active/deleted same-ID copies in both list orders and both `$cid` orders, exact active
  duplicates, duplicate buckets, parent/nested topology, deleted parent/nested combinations and
  deterministic equivalent stores. Preserve canonical qualifying counts, contributions and issues.
- Do not edit shared CRDT query/schema owners. The settlement owner may implement its own narrow
  read-only projection because topology eligibility is part of the canonical financial boundary.

## Required F-03 closure — collision-free semantic identity

- Replace delimiter-based record/composite fingerprints with a provably collision-free canonical
  encoding over complete runtime type, key and value identity, including adversarial person IDs,
  NUL/delimiter/unicode strings, negative zero, non-finite numbers and malformed legacy values.
  Alternatively avoid caching invalid/failure paths, but every remaining cache key must still be
  unambiguous.
- Prevent cached results from losing, inventing or cross-associating transaction/person/account issue
  context. Compare cached and uncached/reference behavior across success/failure separation,
  insertion permutations, ownership as well as allocation collisions and signed amount/currency
  components.
- Add the exact reviewer collision pair and adversarial generated properties. Every invalid entry
  must produce its own complete typed issue set; valid later transactions must never inherit a
  prior failure.

## Preservation and evidence

- Preserve the independently green sole-engine/export/caller closure; named A–H; exact P16A signed
  positions; deterministic matching; currency isolation; reverse netting; signed source
  traceability; safe aggregate rejection; unknown/deleted People; full result freezing/input purity;
  issue privacy; no persisted cache; and current incomplete-state safety.
- Preserve reviewer seed `26072501` results: 5,000 BigInt/rational cases, 1,000 reverse-source/
  multi-currency permutation batches and safe aggregate limit. Add fixed revision-02 seeds for every
  new legacy/topology/cache property.
- Red before green: add all F-01/F-02/F-03 regressions while revision-01 product owners are
  byte-identical, run them to exact failure, then implement without deleting/weakening any
  revision-01 expectation.
- Run focused settlement/caller tests in three clean processes, broader domain/current caller, full
  Vitest, typecheck, lint, build, exact four-path oxfmt/ESLint and cumulative diff check. Report the
  inherited repository format baseline without rewriting frozen files.
- Run affected People/Accounts/Transactions Chromium and full Chromium with one worker/retries zero;
  E2E files are read-only.
- Rerun deterministic 10k/50k/100k full-output benchmark after warmup. Report store projection cost,
  five 100k samples, 75k-class source/output counts and conservation. Do not claim strict 200ms if
  missed; retain/adjust the explicit P16E query/memoization follow-up without weakening correctness.
- Use installed headless `playwright-cli` only, unique session `p16b-impl-02` and root-owned keyed
  server. Exercise real current onboarding with masked/unread recovery words, People/Accounts/
  Transactions and honest no-explicit-allocation caller state, reload, 390px/200%-zoom, dark/
  reduced, console/network and boolean-only exact-marker storage/request privacy. Do not manufacture
  malformed legacy state or P16D/E UI claims. Close/delete/list clean, identify exact artifacts and
  ask root cleanup.
- Evidence records original BASE, pre-product HEAD, product HEAD, exact paths/index, red/green,
  mechanisms, direct/adversarial properties, seeds/oracles, all gates/benchmark/manual, exclusions,
  cleanup, frozen hashes, risks and any complete Q proposal. Format it before freeze; never claim
  independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, coding/TypeScript rules, components and E2E skills.
- **Decision rule:** a material ambiguity becomes complete `Q-PROPOSAL-P16B-02-*` in evidence under
  PROCESS hierarchy; continue without asking the human. No proposal may weaken canonical legacy
  safety, typed exclusion, topology ownership, exact money, traceability or currency isolation.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, 21 normalized blocks
  exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, undispatched until revision-02 evidence freezes
- **Literal cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Literal revision-02 product/test HEAD:** `50b36beb0c7cf9a73d623ed964b6ba05919fffc6`
- **Implementation evidence:** `evidence/P16B/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P16B-review-02.md`
- **Reviewer writes:** only that new review file; no other edit/commit
- **Required focus:** independently reproduce then close F-01/F-02/F-03 across runtime legacy shapes,
  hierarchical topology and adversarial cache identity; re-prove the exact arithmetic/netting/source/
  currency/issue/immutability core, named A–H, sole exports/caller, full gates and honest performance.
- **Verdict:** one PASS/FAIL with exact findings, canonical mapping, independent seeds/oracles,
  browser/manual/cleanup and Q proposals. Any throw, ambiguous nested admission, active-copy loss,
  cache collision/context loss, plausible invalid total or preservation regression fails.

## Next root action

Freeze the exact revision-02 evidence and ready-for-review transition, then dispatch the distinct
`human_scratch_reviewer` over the literal cumulative range and sole review output. Keep HS-009
unchanged and FS-001 immutable/open.

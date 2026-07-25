# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16C / 02
- **Scope IDs:** FS-001 and HS-009; this revision closes only P16C review-01 F-01 through F-03 while
  preserving every independently accepted revision-01 mechanism. Neither requirement can complete
  from P16C alone.
- **State:** revision-02 implementation frozen; ready for independent review
- **Binding tasks:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16C and
  `tasks/HS-009-allocation-bounds.md` P16C
- **Canonical authority:** all 715 immutable lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`
- **Dependencies:** P16A/02, P16B/05, P09/02 and P14/04 passed
- **Literal original cumulative review BASE:** `0a7c9a49722ddc4d955f910af6dbb19cfffbd600`
- **Revision-01 RED:** `ff45176c5e30f66e8d10990daddb955d1c2277ad`
- **Revision-01 product/test HEAD:** `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`
- **Frozen revision-01 implementer artifact:** `evidence/P16C/implementation-01.md`, SHA-256
  `0d08bb7884d37675d94735bdc65d6e5bfb7f5c488c4c64f8c10819bcc745a31b`, 230 lines /
  17,079 bytes
- **Immutable revision-01 review artifact:** `reviews/P16C-review-01.md`, FAIL, SHA-256
  `72487e97a3a8f4f3515b398fbc399062bc0f65f5d6b8e938e39f1a76335c5a46`, 252 lines /
  18,298 bytes
- **Revision-01 failure integration / clean pre-revision HEAD:**
  `d81a8283552cb6b3cb312e0f2d3e0adab97819d8`
- **Sole revision-02 implementer artifact:** `evidence/P16C/implementation-02.md`
- **Frozen revision-02 implementer artifact:** `evidence/P16C/implementation-02.md`, SHA-256
  `89876829842932aa7d32f66a5a4144eb21d0a14c60d952021329d4c0213813ec`, 220 lines /
  15,273 bytes
- **Revision-02 RED:** `2b5cee4f8a1d97d96f1bbfe77e77c0ad3104fa83`
- **Revision-02 product/test HEAD:** `207e8c5758a48e66980b95eaeff51c0e5a605f7e`, tree
  `4682fe5b883a6e4c212d8ef72d2656fb23bd6619`
- **Future immutable revision-02 review artifact:** `reviews/P16C-review-02.md`
- **Allowed product paths:** exactly
  `src/lib/crdt/allocations.ts`,
  `src/lib/crdt/mutations.ts`,
  `src/lib/crdt/maintenance.ts` and
  `src/lib/domain/automation.ts`.
- **Allowed test paths:** exactly
  `tests/integration/allocation-crdt.test.ts`,
  `tests/unit/domain/automation.test.ts`,
  `tests/unit/crdt/maintenance.test.ts` and
  `tests/integration/vault-maintenance.test.tsx`.
  Maintenance owner expansion is authorized only for the F-03 stored-data relocation proof. Do not
  edit every authorized path by default. Report a reproducible blocker before root considers any
  other path.
- **Forbidden writes:** every other product/test path; revision-01 evidence/review; P16A/P16B
  owners/artifacts; pages/components/E2E; dependencies/configuration; tasks/specs; scratch;
  canonical FS-001; SCOPE; ledgers; `.claude`; `.codex`; agent configuration and future review.
- **Commit contract:** create the sole evidence before test/product edits. Check in all F-01–F-03
  counterfactual tests against byte-identical revision-01 production as one exact-path RED commit,
  then stage/commit only exact authorized product/test paths for GREEN with short no-parentheses
  messages. Leave `evidence/P16C/implementation-02.md` uncommitted. Never use `git add .` or
  `git add -A`.

## Required F-01 closure — complete typed containment

- `prepareAllocationReplacement` and every delegated entry point must contain every potentially
  throwing container-recognition/materialization operation, including `Array.isArray`, within one
  exception-safe boundary. A genuinely revoked `Proxy.revocable` ordinary input returns the exact
  deeply frozen `invalid-allocation-container` result; it never throws.
- Prove direct preparation, complete replacement, public insertion, automation evaluation/
  application and restoration against actually revoked proxies. Each must assert no throw, exact
  typed/frozen error, unchanged Loro document version/map/history and unchanged caller graph.
- Preserve all existing plain/null-prototype acceptance, array/custom-prototype/symbol/accessor/
  trap rejection, exact `$cid` metadata handling and the rule that no draft lookup/mutation occurs
  before complete validation.

## Required F-02 closure — deterministic invalid results

- Canonicalize materialized own string Person keys with one explicit stable comparator before
  validation/result construction. Equivalent logical invalid maps must produce byte-equivalent,
  deeply frozen error graphs regardless of property construction order.
- Cover multiple simultaneous reasons, ordinary and null-prototype records, forward/reverse/all
  relevant permutations, integer-like keys, empty string, Unicode, emoji, NUL, `constructor`,
  `__proto__`, `$cid`-like names and exact `$cid` exclusion. Preserve caller descriptors and never
  invoke getters.
- Do not change P16A validation reasons/bounds or globally edit the allocation domain owner; F-02 is
  the P16C materialization/result-order contract.

## Required F-03 closure — retain every stored legacy sibling

- `copyAllocationData` and every already-stored structural/history copy must preserve every own
  enumerable string data entry except exact `$cid`, regardless of runtime value type. It must not
  invoke accessors, copy symbols/inherited keys or apply new-input validation. Public insertion,
  set-one and complete replacement remain strict; only private already-stored preservation paths
  may retain invalid legacy runtime values.
- Reproduce initialized-Loro loss before GREEN for both exact review cases:
  move `{ outOfRange:150, stringLegacy:"bad", valid:-12.5 }` and import-delete promotion of a nested
  row `{ stringLegacy:"bad", valid:25 }`. Then prove exact preservation of every key/value and
  exact-key repair without sibling loss.
- Extend real initialized-Loro mechanisms across date move, account+date move, nest, unnest, swap,
  import-delete promotion and maintenance relocation using string, boolean, null, out-of-range,
  non-finite and valid siblings. Assert exact `$cid` exclusion, no getter execution and no
  normalization/deletion.
- Automation history capture/restore must preserve the raw stored legacy map through one logical
  action or return a typed failure without losing it. Prove the selected contract directly; number
  filtering or silent omission is forbidden.

## Preservation and evidence

- Preserve revision-01 central set/remove/complete replacement, one-key sibling isolation, strict
  bounds, zero removal, generic/alias bypass prevention, insertion atomicity, automation
  application/restoration atomicity, presence identity, initialized-Loro per-key merge/same-key LWW,
  one-action undo, encrypted snapshot/update persistence and current honest path matrix.
- Preserve review seed `2607251201` (128 schedules / 2,033 operations / 124 same-key deletes) and
  seed `2607251202` (1,200 one-key + 600 replacement cases / 1,177 invalid rollbacks). Add distinct
  revision-02 fixed seeds for revoked-container mechanisms, error permutations and legacy structural
  values with independent exact oracles.
- Preserve P16A exact validation/remainder/apportionment, P16B settlement/retained-issue boundary,
  P09 history, P11 alias bookkeeping, P12 maintenance convergence and P14 import lineage/delete.
  No P16D grid/person-column or P16E People-obligation UI work.
- Run focused revision-02 allocation/automation/maintenance tests in three clean processes, the
  broader revision-01 owner matrix, full deterministic Vitest, typecheck, lint, build, exact changed
  oxfmt/ESLint, cumulative diff and repository format baseline. Run affected and full read-only
  Chromium with one worker, retries zero and line reporter.
- Re-run fixed-seed one-key/complete-replacement performance without claiming P16E's 100k UI target.
  Disclose environment/warmup/samples and any material regression from revision 01.
- Use installed headless `playwright-cli` only, unique session `p16c-impl-02` and a root-owned keyed
  server. Preserve honest current onboarding/manual/import/undo/reload/People caller, responsive/
  zoom/dark/reduced/accessibility, console/network and boolean-only privacy behavior. Do not fake
  absent P16D allocation UI. Close/delete/list and request exact root cleanup.
- Evidence records original BASE, failure integration/pre-product HEAD, new RED, committed GREEN
  HEAD, exact paths/index, direct/generated F-01–F-03 mechanisms, every revision-01 preservation
  seed/gate, manual/performance/cleanup, frozen hashes, risks and any complete
  `Q-PROPOSAL-P16C-02-*`. Format before freeze and never claim independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, coding/TypeScript rules and
  `.claude/skills/crdt/SKILL.md`, `.claude/skills/sync/SKILL.md`,
  `.claude/skills/import/SKILL.md`, `.claude/skills/e2e/SKILL.md`.
- **Decision rule:** record a material ambiguity as a complete evidence proposal and continue under
  PROCESS hierarchy; do not ask the human. No proposal may weaken exception containment,
  deterministic results, legacy retention, strict public validation, per-key convergence or
  preservation.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, all 21 normalized
  blocks exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, ready for dispatch after this revision-02
  evidence freeze
- **Literal cumulative review BASE:** `0a7c9a49722ddc4d955f910af6dbb19cfffbd600`
- **Literal revision-02 HEAD:** `207e8c5758a48e66980b95eaeff51c0e5a605f7e`
- **Implementation evidence:** `evidence/P16C/implementation-02.md`
- **Prior immutable review:** `reviews/P16C-review-01.md`
- **Sole new reviewer artifact:** `reviews/P16C-review-02.md`
- **Reviewer writes:** only the new review file; no other edit/commit
- **Required focus:** independently reproduce then close F-01 revoked-proxy containment, F-02
  canonical error ordering and F-03 raw legacy sibling preservation through every structural,
  maintenance and history path. Re-prove the accepted initialized-Loro concurrency/rollback/
  history/persistence/path/gate/manual core with new fixed seeds and adversarial runtime values.
- **Verdict:** one PASS/FAIL with exact findings, canonical mapping, independent generated
  mechanisms/oracles, automated/browser/manual/cleanup and Q proposals. Any exception escape,
  permutation-dependent typed result, lost legacy sibling, weakened public validation or
  revision-01 regression fails.

## Next root action

Freeze the exact revision-02 evidence and ready-for-review transition, then dispatch the distinct
`human_scratch_reviewer` over the literal cumulative range and sole new review output. Keep HS-009
unchecked and FS-001 immutable/open.

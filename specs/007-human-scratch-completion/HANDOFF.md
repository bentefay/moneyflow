# Current Package Handoff

Root rewrites this compact file for one package/revision. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16B / 04
- **Scope ID:** FS-001; this revision closes only residual P16B review-03 F-04/F-05 while preserving
  every independently proven settlement invariant. FS-001 remains incomplete.
- **State:** changes requested after immutable revision-04 FAIL; failure integration pending
- **Binding task:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16B
- **Canonical authority:** all 715 immutable lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`
- **Dependency:** P16A/02 passed
- **Literal original cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Revision-03 product/test HEAD:** `cd643afc8f168b3c8328eb54f1d5f280ca7ec717`
- **Frozen revision-03 evidence:** `evidence/P16B/implementation-03.md`, SHA-256
  `f3dc7f26695109ec941eb308846872474cba72008e824970a86d7189334ef649`, 298 lines /
  18,960 bytes
- **Immutable revision-03 review:** `reviews/P16B-review-03.md`, FAIL, SHA-256
  `5eac6d9a52f5cf96fe921df734a4f52367b898ce94a7af9130ee6af21883af8d`, 377 lines /
  21,986 bytes
- **Revision-03 failure integration / clean pre-revision HEAD:**
  `f343f496f8838ce237d3866124f7a3112b6a6938`
- **Frozen revision-04 implementer artifact:** `evidence/P16B/implementation-04.md`, SHA-256
  `a49c3f89693fae09e7b176612e11c57c416814ecb531313ac6ffa7c4882ab001`, 283 lines /
  19,250 bytes
- **Revision-04 red-test checkpoints:** `0d96c25c50f86590c5c7df3dccc8370ea247e9e3`
  (complete snapshot/identity/calendar) and `3d2a51e56060388c4d34f6181eb2d806d8259bb6`
  (real Loro-mirror metadata)
- **Revision-04 product/test HEAD:** `e09eb6bdbbfd796d970d85ef36c212795bcb4912`
- **Immutable revision-04 review artifact:** `reviews/P16B-review-04.md`, FAIL, SHA-256
  `8cc169c08f6c87fc16eec1fa3c6615b033abd291faaa0969619230558949b241`, 403 lines /
  24,640 bytes
- **Allowed revision-04 product/test paths:** exactly
  `src/lib/domain/settlement.ts` and `tests/unit/domain/settlement.test.ts`.
- **Forbidden writes:** every caller/component including BalanceSummary, balance/barrel/PeopleTable,
  every other product/test path, CRDT/schema/query/mutation owners, E2E, dependencies/configuration,
  tasks/specs, prior P16 artifacts, scratch, canonical FS-001, SCOPE, ledgers, `.claude`, `.codex`,
  agent configuration and future review. Report a reproducible blocker before root considers
  expansion.
- **Commit contract:** create the sole evidence before test/product edits; stage/commit only the
  exact two authorized product/test paths with a no-parentheses message; leave evidence uncommitted.
  Never use `git add .` or `git add -A`.

## Required residual F-04 closure — one exception-safe snapshot boundary

- Before any untrusted enumeration, property access, identity encoding or traversal, snapshot each
  materialized envelope through one reusable exception-safe boundary. Cover account/status
  collections, store root/account tree/year/month/day/transaction records, duplicate lists,
  hierarchy arrays, allocation/ownership maps and every cache/fingerprint input.
- Catch the complete inspection lifecycle: prototype, own-key, descriptor, data-property, length/
  index and iterator-related traps. Never invoke accessors while validating. A throwing
  `getPrototypeOf`, `ownKeys`, `getOwnPropertyDescriptor`, getter, length/index or iterator trap must
  become a stable contextual typed issue, never escape `calculateSettlementBalances`.
- Accept only coherent contract-approved ordinary/null-prototype data snapshots. Reject enumerable
  accessors, hidden/non-enumerable financial entries, unexpected symbols, inconsistent descriptors
  and observably spoofed record shapes. A transparent wrapper that is observationally identical to
  an approved data record must still be snapshotted into new safe data before downstream use; no
  later operation may touch the untrusted wrapper.
- Invalid branches contribute no plausible total; valid siblings remain calculable only with the
  complete issue set making the result incomplete. Result/input immutability, issue privacy and
  deterministic ordering remain.
- Check in direct red tests against byte-identical revision-03 product for every exact review
  reproduction: allocation/ownership ownKeys, descriptor and getter traps; hidden Bob entry;
  prototype-spoofed class; account/status/store ownKeys; tree years getter; years iterator and index
  traps. Add adjacent traps at transaction fields/duplicates and snapshot identity/cache inputs.
  Assert no throw, exact typed context, atomic exclusion, valid-sibling preservation, frozen output
  and unchanged/unfrozen input.

## Required residual F-05 closure — identity and calendar semantics

- Each account-tree `accountId` is required, must be a canonical string, must equal its retained map
  key and must agree with every participating transaction/account context. Missing, null, numeric or
  mismatched identity emits a stable hierarchy issue and excludes that branch.
- Year/month/day discriminators must be finite safe integers, reject negative zero/fractions/unsafe
  integers, and form a real supported calendar date. Reuse an established repository/library date
  authority rather than inventing calendar arithmetic. Validate the full supported date range,
  month 1–12 and actual day for year/month, including leap/non-leap February.
- Invalid identity/date branches cannot contribute to qualifying count or financial output. Preserve
  valid siblings with complete deterministic contextual issues, frozen outputs and caller purity.
- Check in direct and generated tests for missing/null/primitive/mismatched account IDs; transaction
  account mismatch; `NaN`, both infinities, negative zero, fractions, unsafe integers and supported
  year boundaries; invalid months; impossible dates and leap/non-leap February. Exercise insertion
  permutations, multiple simultaneous invalid branches, stable issue order/context and valid
  sibling preservation.

## Preservation and evidence

- Preserve revision-03 ordinary `Map`/`Set`/Date/RegExp/typed/class rejection, plain/null-prototype
  acceptance, complete malformed-container issues and all revision-01/02 F-01/F-02/F-03 closures.
- Preserve sole engine/export/caller boundary; named A–H; exact P16A signed positions; canonical
  topology/active-copy/nested exclusion; collision-free cache/aggregate identity; deterministic
  matching; currency isolation; reverse netting; signed source traceability; safe aggregate
  rejection; unknown/deleted People; full result freezing/input purity; issue privacy; no persisted
  cache; and current incomplete-state safety.
- Preserve reviewer arithmetic seeds/oracles and add fixed revision-04 trap/snapshot and
  identity/calendar properties with independent expected issue/context oracles. Properties must
  generate mechanisms, not merely repeat a finite direct-case factory list.
- Red before green: add every residual F-04/F-05 regression while revision-03 product is
  byte-identical, run to exact failure, then implement without deleting/weakening prior expectations.
- Run focused settlement/balance/caller tests in three clean processes, broader domain/current
  caller, full Vitest, typecheck, lint, build, exact two-path oxfmt/ESLint and cumulative diff check.
  Report inherited repository-format baseline without rewriting frozen files.
- Run affected Accounts/Transactions Chromium and full Chromium with one worker/retries zero; E2E
  files are read-only. Rerun deterministic 10k/50k/100k full-output benchmark after warmup and retain
  the honest P16E follow-up if all five 100k samples do not meet strict 200ms.
- Use installed headless `playwright-cli` only, unique session `p16b-impl-04` and root-owned keyed
  server. Exercise honest current onboarding/caller preservation, reload, responsive/zoom,
  dark/reduced, console/network and boolean-only privacy. Do not manufacture malformed retained
  state through UI or claim P16D/E behavior. Close/delete/list and request exact root cleanup.
- Evidence records original BASE, pre-product HEAD, red checkpoint, product HEAD, exact paths/index,
  snapshot/date mechanisms, direct/generated properties, seeds/oracles, all gates/benchmark/manual,
  exclusions, cleanup, frozen hashes, risks and any complete Q proposal. Format before freeze; never
  claim independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, coding/TypeScript rules, components and E2E skills.
- **Decision rule:** a material ambiguity becomes complete `Q-PROPOSAL-P16B-04-*` in evidence under
  PROCESS hierarchy; continue without asking the human. No proposal may weaken no-throw legacy
  safety, complete typed exclusion, topology identity/calendar validity, exact money, traceability
  or currency isolation.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, 21 normalized blocks
  exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, completed after revision-04 evidence freeze
  commit `86dd6fc63a8476bd9aaf3a6b56f1571240803f45`
- **Literal cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Literal revision-04 product/test HEAD:** `e09eb6bdbbfd796d970d85ef36c212795bcb4912`
- **Implementation evidence:** `evidence/P16B/implementation-04.md`
- **Sole reviewer artifact:** `reviews/P16B-review-04.md`
- **Reviewer writes:** only that new review file; no other edit/commit
- **Required focus:** independently reproduce then close all trap/snapshot/spoof/hidden-value and
  identity/calendar residuals; re-prove all prior closures, exact arithmetic/netting/source/currency/
  issue/immutability core, named A–H, sole API/caller, full gates and honest scale.
- **Verdict:** one PASS/FAIL with exact findings, canonical mapping, independent generated
  mechanisms/oracles, browser/manual/cleanup and Q proposals. Any trap escape, later access to an
  untrusted envelope, hidden plausible value loss, invalid identity/date contribution, issue-free
  plausible invalid total or preservation regression fails.
- **Actual verdict:** FAIL. F-06 proves `recordFromLoroMap` skips every string-valued account/status
  entry instead of only exact `$cid`, allowing missing contextual issues and issue-free plausible
  valid-sibling totals. Revision-03 F-04/F-05 and every preserved core/gate pass independently.

## Next root action

Persist the immutable revision-04 FAIL, transcribe F-06 to risks and package state, then prepare
P16B revision 05 over the same original cumulative BASE. Keep HS-009 unchanged and FS-001
immutable/open.

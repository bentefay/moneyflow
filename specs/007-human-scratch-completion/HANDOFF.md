# Current Package Handoff

Root rewrites this compact file for one package/revision. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P16B / 05
- **Scope ID:** FS-001; this revision closes only P16B review-04 F-06 while preserving every
  independently proven revision-04 settlement invariant. FS-001 remains incomplete.
- **State:** reviewing revision-05 frozen implementation
- **Binding task:** `tasks/FS-001-transaction-percentage-allocations-settlement.md` P16B
- **Canonical authority:** all 715 immutable lines of
  `specs/008-transaction-percentage-allocations-settlement/spec.md`
- **Dependency:** P16A/02 passed
- **Literal original cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Revision-04 product/test HEAD:** `e09eb6bdbbfd796d970d85ef36c212795bcb4912`
- **Frozen revision-04 implementer artifact:** `evidence/P16B/implementation-04.md`, SHA-256
  `a49c3f89693fae09e7b176612e11c57c416814ecb531313ac6ffa7c4882ab001`, 283 lines /
  19,250 bytes
- **Revision-04 red-test checkpoints:** `0d96c25c50f86590c5c7df3dccc8370ea247e9e3`
  (complete snapshot/identity/calendar) and `3d2a51e56060388c4d34f6181eb2d806d8259bb6`
  (real Loro-mirror metadata)
- **Immutable revision-04 review artifact:** `reviews/P16B-review-04.md`, FAIL, SHA-256
  `8cc169c08f6c87fc16eec1fa3c6615b033abd291faaa0969619230558949b241`, 403 lines /
  24,640 bytes
- **Revision-04 failure integration / clean pre-revision HEAD:**
  `618254f1f381cd1e4dfb68a9258cccb667a0c838`
- **Frozen revision-05 implementer artifact:** `evidence/P16B/implementation-05.md`, SHA-256
  `85bc279f87c02cbadedd5c2964cf72886fde2081903d8343a966cbf9c2b42e43`, 245 lines /
  15,982 bytes
- **Revision-05 red-test checkpoint:** `b3e0235a8e7a1a2d15f45fb3c92ef85831d92c7d`
- **Revision-05 product/test HEAD:** `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`
- **Future immutable revision-05 review artifact:** `reviews/P16B-review-05.md`
- **Allowed revision-05 product/test paths:** exactly
  `src/lib/domain/settlement.ts` and `tests/unit/domain/settlement.test.ts`.
- **Forbidden writes:** every caller/component including BalanceSummary, balance/barrel/PeopleTable,
  every other product/test path, CRDT/schema/query/mutation owners, E2E, dependencies/configuration,
  tasks/specs, prior P16 artifacts, scratch, canonical FS-001, SCOPE, ledgers, `.claude`, `.codex`,
  agent configuration and future review. Report a reproducible blocker before root considers
  expansion.
- **Commit contract:** create the sole evidence before test/product edits; stage/commit only the
  exact two authorized product/test paths with a no-parentheses message; leave evidence uncommitted.
  Never use `git add .` or `git add -A`.

## Required F-06 closure — only exact `$cid` is collection metadata

- In `recordFromLoroMap`, skip only the exact sanctioned `$cid` collection key. Every other account
  or status entry, including every primitive string, must enter the existing exception-safe
  entry-snapshot/validation path and emit the stable contextual `account` or `status` hierarchy
  issue when invalid.
- Preserve exact initialized-Loro mirror compatibility: the root non-enumerable string `$cid`
  remains accepted, never becomes a false hierarchy issue and is not generalized into a
  type-based metadata exemption.
- Check in direct red tests against byte-identical revision-04 production for all four exact review
  reproductions: referenced string account, referenced string status, unreferenced string account
  beside a valid branch and unreferenced string status beside a valid branch. Assert complete issue
  type/context, affected-transaction atomic exclusion, valid-sibling financial preservation only
  under an incomplete result, deterministic issue order, frozen output and unchanged/unfrozen
  caller input.
- Add a fixed-seed mechanism-generating property across account/status boundaries, referenced/
  unreferenced placement, primitive payloads and insertion permutations. It must independently
  derive the expected exact issue set and cannot merely select from the four direct factories.
- F-06 is narrow: no caller, schema, dependency, E2E, component or broader runtime-shape expansion
  is authorized. Any temptation to weaken complete typed exclusion or treat arbitrary strings as
  metadata is a blocker, not a compatibility decision.

## Preservation and evidence

- Preserve revision-04's independently accepted exception-safe record/array snapshots, exact
  sanctioned hidden string `$cid`, no post-snapshot wrapper reads, account identity/calendar
  semantics, ordinary/null-prototype acceptance, arbitrary-object rejection and all F-01–F-05
  closures.
- Preserve sole engine/export/caller boundary; named A–H; exact P16A signed positions; canonical
  topology/active-copy/nested exclusion; collision-free cache/aggregate identity; deterministic
  matching; currency isolation; reverse netting; signed source traceability; safe aggregate
  rejection; unknown/deleted People; full result freezing/input purity; issue privacy; no persisted
  cache; and current incomplete-state safety.
- Preserve reviewer seeds/oracles `2607250601` (2,000 snapshot mechanisms), `2607250701` (5,000
  dates), `26072501` (5,000 signed rational cases) and `16001611` (1,000 reverse/currency batches).
  Add the revision-05 primitive-entry generator with an independent exact issue/context oracle.
- Red before green: add every F-06 reproduction while revision-04 product is byte-identical, run to
  exact failure, then implement without deleting or weakening any prior expectation.
- Run focused settlement/balance/caller tests in three clean processes, broader domain/current
  caller, full Vitest, typecheck, lint, build, exact two-path oxfmt/ESLint and cumulative diff check.
  Report inherited repository-format baseline without rewriting frozen files.
- Run affected Accounts/Transactions Chromium and full Chromium with one worker/retries zero; E2E
  files are read-only. Rerun deterministic 10k/50k/100k full-output benchmark after warmup and retain
  the honest P16E follow-up if all five 100k samples do not meet strict 200ms.
- Use installed headless `playwright-cli` only, unique session `p16b-impl-05` and root-owned keyed
  server. Exercise honest current onboarding/caller preservation, reload, responsive/zoom,
  dark/reduced, console/network and boolean-only privacy. Do not manufacture malformed retained
  state through UI or claim P16D/E behavior. Close/delete/list and request exact root cleanup.
- Evidence records original BASE, pre-product HEAD, red checkpoint, product HEAD, exact paths/index,
  F-06 mechanism/direct/generated properties, preserved snapshot/calendar/arithmetic oracles, all
  gates/benchmark/manual, exclusions, cleanup, frozen hashes, risks and any complete Q proposal.
  Format before freeze; never claim independent PASS.
- **Applicable guides:** `.claude/CLAUDE.md`, coding/TypeScript rules, components and E2E skills.
- **Decision rule:** a material ambiguity becomes complete `Q-PROPOSAL-P16B-05-*` in evidence under
  PROCESS hierarchy; continue without asking the human. No proposal may weaken exact-key metadata,
  no-throw safety, complete typed exclusion, topology identity/calendar validity, exact money,
  traceability or currency isolation.
- **Frozen boundary:** scratch SHA
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, checked set
  HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018, 21 normalized blocks
  exact; immutable FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Independent review contract

- **Reviewer:** distinct `human_scratch_reviewer`, dispatched only after revision-05 evidence freeze
  commit `910cecbf0ea6c83ca12c41b7d98808d95158bf67`
- **Literal cumulative review BASE:** `4c102600240e2804b801c2a320e10164defb14ea`
- **Literal revision-05 product/test HEAD:** `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`
- **Implementation evidence:** `evidence/P16B/implementation-05.md`
- **Sole reviewer artifact:** `reviews/P16B-review-05.md`
- **Reviewer writes:** only that new review file; no other edit/commit
- **Required focus:** independently reproduce then close F-06 across referenced/unreferenced
  primitive account/status entries and insertion permutations; prove exact `$cid` compatibility;
  re-prove F-01–F-05, exact arithmetic/netting/source/currency/issue/immutability core, named A–H,
  sole API/caller, full gates and honest scale.
- **Verdict:** one PASS/FAIL with exact findings, canonical mapping, independent generated
  mechanisms/oracles, browser/manual/cleanup and Q proposals. Any arbitrary non-`$cid` primitive
  entry skipped without its contextual issue, false `$cid` rejection, issue-free plausible invalid
  total or preservation regression fails.

## Next root action

Await the distinct `human_scratch_reviewer` verdict over the literal cumulative range and sole
review output. Keep HS-009 unchanged and FS-001 immutable/open.

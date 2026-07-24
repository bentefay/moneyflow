# P16A Independent Review — Revision 01

## Review identity and verdict

- Package / requirements / revision: `P16A` / `FS-001`, `HS-009` / `01`.
- Literal cumulative reviewed product range:
  `1b42d27e11494a167a4768e0c2c308010aa51651..6671c09a5ca94ccb4ff47564c15d44935cc73479`.
- Exact revision-01 implementation range:
  `d0b2324f997d5dffe8326c9f4777a94daaedf49e..6671c09a5ca94ccb4ff47564c15d44935cc73479`.
- Frozen implementation evidence: `evidence/P16A/implementation-01.md`, SHA-256
  `4fb0fadd5fafdde02d3d20cc3349a47abc228092ad375a112360f3864548ba33`, 272 lines / 16,695 bytes.
- The cumulative range contains the seven authorized product/test/dependency paths plus root-owned
  `HANDOFF.md` and `PROGRESS.md`; its stat is 1,132 insertions / 609 deletions. The package range is
  exactly the seven authorized paths and 979 insertions / 475 deletions. `git diff --check` passes.
- Current repository HEAD is the later root-only review-state/evidence-freeze commit
  `5a7596d05024518a2b586626c22f7e65be5fc9c5`; the assigned product/test HEAD remains unchanged at
  `6671c09a5ca94ccb4ff47564c15d44935cc73479`.
- **Verdict: FAIL.** Allocation/ownership separation, rejection, explicit-map preservation,
  remainder/effective derivation, exact signed apportionment, dependency choice, performance and
  current-caller compatibility are otherwise sound. The public result contract is not runtime
  immutable: callers can change success/failure discriminants and typed errors, and some error
  arrays can be extended. This directly contradicts P16A's binding reusable immutable-results
  boundary and leaves P16B/C/D unable to rely on the promised result integrity.

## Finding

### F-01 — Medium / blocking API integrity: public result envelopes and errors are mutable

The types declare `readonly` fields, and successful returned value maps are frozen, but the runtime
objects do not consistently implement the binding immutable contract:

- `validateExactPercentageWeights` returns mutable success/failure envelopes and mutable errors
  (`src/lib/domain/allocation.ts:148-170`).
- `validateAllocationSet` freezes its value map or error array, but not its result envelope or the
  individual error objects (`src/lib/domain/allocation.ts:173-190`).
- `deriveEffectiveAllocations` freezes its successful value object and nested maps, but not the
  success/failure envelope or individual failure objects (`src/lib/domain/allocation.ts:229-290`).
- `apportionMinorUnits` freezes only the successful share map; every result envelope and error
  remains mutable (`src/lib/domain/allocation.ts:300-368`).
- `validateOwnershipSet` likewise leaves every envelope/error object mutable, and its empty-set and
  invalid-total error arrays are mutable too (`src/lib/domain/ownership.ts:84-127`).

This is observable runtime behavior, not only an absence of `Object.isFrozen` metadata. An
independent counterexample changed returned objects after validation:

```text
{
  "allocationWrapperOk": true,
  "allocationErrorReason": "not-number",
  "ownershipErrorCount": 2,
  "derivedWrapperOk": false,
  "apportionWrapperOk": false,
  "derivedValueFrozen": true,
  "apportionValueFrozen": true
}
```

The input allocation was invalid because it was `101`, yet assigning to the returned envelope
changed `ok` from false to true. Its error reason changed from `out-of-range` to `not-number`.
Pushing an invented second entry into the invalid-total ownership error array succeeded. Valid
derivation and apportionment envelopes could both be changed from `ok: true` to `ok: false`.

The current tests assert `Object.isFrozen` only for successful value maps
(`tests/unit/domain/allocation.test.ts:128-144`, `tests/unit/domain/ownership.test.ts:230-240`).
They do not cover envelopes, every error-array branch or individual error objects. TypeScript
`readonly` prevents ordinary typed assignment during compilation but does not protect shared runtime
objects.

Required closure: freeze every public success/failure envelope, every returned error array and every
individual error object for allocation, exact-weight, ownership, derivation and apportionment
results. Add tests for every success/failure branch that prove the complete exposed result graph is
immutable and that mutation attempts cannot change discriminants, error reasons/counts or values.
Preserve the existing typed discriminated unions and already-frozen value maps.

## Canonical P16A acceptance audit

- **Domain separation and rejection:** `AllocationPercentageSchema` accepts canonical zero, signed
  decimals and inclusive `-100..100`; it rejects `-0`, non-numbers, non-finite values and either
  overflow boundary. `OwnershipPercentageSchema` is separately `0..100`; `validateOwnershipSet`
  requires at least one owner and an exact-decimal total within the existing inclusive `0.001`
  tolerance. Typed error domains and reasons remain distinct.
- **Preservation and purity:** validation copies rather than mutates the explicit map. Below-, at-
  and above-100 totals remain unchanged, including explicit zero; no allocation code calls the
  legacy ownership clamp/normalization helpers. Inputs remained byte/value-equivalent through table
  and generated cases.
- **Remainder and union:** `deriveEffectiveAllocations` calculates exact `100 - sum(explicit)`,
  normalizes only valid ownership into derived weights, distributes positive, zero or negative
  remainder and builds the sorted union of explicit and owner IDs. Empty explicit, multiple owner,
  overlap and non-overlap cases close both ownership and effective weights at exact decimal 100.
- **Signed apportionment:** the production implementation validates a signed safe integer, sorts
  stable IDs, uses `decimal.js`, applies mathematical floor to negative and positive exact shares,
  ranks fractional remainders descending with ascending-ID ties and conserves the signed source
  amount. It rejects non-integer/unsafe amounts and invalid/non-100 weight sets with typed data.
- **Ordering and conservation:** two independent BigInt rational oracles covered 10,000 generated
  cases and found no mismatch. Positive, negative, zero and one-unit amounts; negative weights;
  multiple owners; insertion-order reversals; stable ties and individual-share safety all behaved
  correctly.
- **API reuse:** the domain barrel exports the branded schemas/types, exact string weights,
  validators, derivation and apportioner. The pure calculation boundary has no P16B settlement,
  eligibility, obligation, CRDT, schema, component or page implementation. F-01 is the sole gap in
  this boundary.
- **Caller compatibility:** existing `validateOwnerships` and `isValidOwnership` now reject
  non-finite and negative-zero inputs while retaining established valid flows and caller-facing
  messages. Existing domain, account, transaction, settlement and balance suites remained green.

## Independent counterexample and property evidence

Two reviewer-owned fixed-seed, in-memory oracles compared production output against independent
integer/rational calculations:

1. Seed `16001901`, 5,000 cases: generated one to six account owners partitioning exact hundredths
   of 100, zero to eight signed explicit entries, overlapping/non-overlapping IDs and signed/zero
   amounts. A BigInt rational oracle independently derived effective numerators, mathematical
   floors, fractional ranks and expected minor-unit shares. Production derivation/apportionment
   matched all 5,000; every effective and ownership-weight total was exactly `"100"`.
2. Seed `16001902`, 5,000 cases: generated one to eight signed six-decimal weights, including
   weights outside `0..100`, while forcing their exact rational total to 100. Input insertion order
   alternated. A separate BigInt floor/largest-remainder oracle matched every production
   apportionment.

Both commands used the repository-installed TypeScript runner without writing a test, script or
configuration file. A separate deterministic mutation counterexample produced F-01's exact output.
No arithmetic, normalization, tie, conservation, safe-integer or insertion-order counterexample was
found.

## Independent automation

| Gate                                                     | Independent result                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Allocation + ownership focus, clean process 1            | PASS; 2 files / 83 passed + 1 benchmark skipped in 1.59 s.             |
| Allocation + ownership focus, clean process 2            | PASS; 2 files / 83 passed + 1 benchmark skipped in 1.59 s.             |
| Allocation + ownership focus, clean process 3            | PASS; 2 files / 83 passed + 1 benchmark skipped in 1.61 s.             |
| Full domain profile                                      | PASS; 13 files / 429 passed + 1 skipped in 8.62 s.                     |
| `pnpm test`                                              | PASS; 62 files / 1,321 passed + 1 skipped in 6.44 s.                   |
| `pnpm typecheck`                                         | PASS.                                                                  |
| `pnpm lint`                                              | PASS exit 0; 0 errors / 10 inherited warnings.                         |
| `pnpm build`                                             | PASS; compiled in 6.5 s, TypeScript in 9.0 s, all 17 routes generated. |
| Exact P16A `oxfmt --check` / ESLint                      | PASS / PASS with no diagnostics.                                       |
| `git diff --check BASE..HEAD`                            | PASS.                                                                  |
| Accounts + Transactions Chromium, one worker / retries 0 | PASS; 46/46 in 3.0 minutes.                                            |
| Full Chromium, one worker / retries 0                    | PASS; 102/102 in 6.6 minutes.                                          |

Repository `pnpm format:check` exits 1 on exactly the inherited 14 Markdown paths: the six root
ledgers, P12 implementation revisions 03–06, P12 reviews 05–06, P14 implementation revision 01 and
`specs/human-scratch.md`. No P16A product/test/dependency path fails its exact format check.

The affected and full browser suites use the unchanged current Accounts/Transactions journeys. P16A
correctly did not edit E2E to pretend the P16D allocation grid exists. Expected deliberate
offline/authentication/presence diagnostics appeared only in tests that exercise those states; no
test failed or retried.

## Dependency, security and performance

- The package adds exact `decimal.js@10.6.0` as one direct exact-version production dependency.
  `pnpm why decimal.js` finds one installed version through MoneyFlow directly plus existing
  jsdom/vitest development paths.
- The manifest delta is one line and the lock delta is three importer lines; the already-transitive
  package node is unchanged. Installed metadata reports MIT, bundled `decimal.d.ts`, CJS/ESM entry
  points and a 300 KiB dereferenced directory.
- Existing `currency.js` fixed-precision integer backing is not sufficient for arbitrary exact
  percentage products over signed safe minor-unit amounts. The direct decimal dependency is
  justified and no competing financial dependency was introduced.
- `pnpm audit --prod` reports the current inherited 10 advisories (5 high / 5 moderate) through
  Next/sharp. None names or traverses `decimal.js`.
- The independent opt-in benchmark on Node `v22.21.1` used 200 people, 100 warmups and five samples
  of 250 combined derivation/apportionment calls. Samples were 453.63, 444.03, 444.43, 440.92 and
  446.08 ms per 250, approximately 1.76–1.81 ms per combined call. This establishes only the bounded
  P16A primitive result and does not claim P16B's future 100,000-transaction target.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli` with unique disposable session
  `p16a-review-01` against the root-owned keyed server. No Playwright MCP, `npx`, headed/debug/UI
  mode, temporary test/config or recovery-word access was used.
- Created a fresh identity with all twelve recovery words visibly masked. They were never revealed,
  read, copied or entered.
- The current real Accounts surface exposed the default account as `Me (100%)`. Creating
  `Bob P16A R01` and account `P16A Review Joint` produced Me/Bob `50/50`; editing Me to `80`
  immediately produced the valid `80/20` total.
- The required invalid-total state was reproduced honestly. Entering `101` into the current Me
  ownership spinbutton clamped to `100/0`. Entering `80` next retained `80/0`, displayed
  `Total: 80.00%`, the named `Normalize to 100%` action and exact error
  `Ownerships must sum to 100%, currently 80.00%`. After Saved and reload, the same invalid state
  and error remained. Editing Bob to `20` repaired the account; final Saved state was `80/20`.
- Transactions navigation reached the named `Transactions table file drop target` and empty state.
  People navigation returned the People heading and `Bob P16A R01`. No allocation grid was claimed
  or synthesized.
- At 390 × 844 with dark scheme and reduced motion, `innerWidth`, root client width and root scroll
  width were all 390; both media queries matched. The mobile header, named menu, history state,
  People/Add Person controls and marker remained accessible.
- At 1280 × 800 and PROCESS-authorized 200% document zoom, computed zoom was 2, root client/scroll
  widths remained 1280 and body client/scroll widths were 640. Add Person remained visible at
  `x=976.421875..1232`, `y=266..330`. There is no changed P16A UI control requiring a new contrast
  result.
- A boolean-only storage inspection found 1 local key, 4 session keys, 0 cookies, 1 IndexedDB
  database / 3 stores / 10 records and zero occurrences of either plaintext marker in keys, strings,
  binary views, array buffers or blobs.
- A captured `sync.pushOps` body contained `encryptedData` and `versionVector` and neither plaintext
  marker. The request listing contained 37 non-static local requests, all HTTP 200, plus 180 omitted
  static requests; no failed or non-local request was observed. Final console inspection reported 7
  messages, 0 errors and 0 warnings.
- Excluded exploratory harnesses:
    1. The first request sanitizer mutated Me to 75 and captured the request, then its result
       formatter failed because the CLI isolate did not expose global `URL`. It is not credited. The
       account was restored to 80 and a corrected complete encrypted-request probe passed.
    2. The first network inspection used unsupported command name `network`. The CLI printed help;
       the documented `requests` command was then used and passed.
- The CLI browser closed, `delete-data` reported no remaining user data and browser listing reported
  `(no browsers)`. Root stopped the keyed server, verified port 3000 clear, restored
  `next-env.d.ts`, and moved current `.next`, `test-results` and exactly 14 review CLI artifacts (13
  page YAML plus one console log) to recoverable trash while preserving 13 older page YAML and 9
  older console logs.

## Ownership-editor adjudication

The observed `101 -> 100/0 -> 80/0` sequence is a real current UX limitation, but it is not a P16A
allocation-domain finding:

- It is produced by the unchanged `OwnershipEditor` convenience mutation path, not by
  `validateAllocationSet`, `deriveEffectiveAllocations` or any explicit transaction-allocation API.
- P16A's binding handoff expressly keeps mutation/UI behavior out of this package and requires the
  established valid account create/edit flow to remain unchanged; components/pages were outside the
  authorized write set.
- The invalid total is not made plausible: the strengthened ownership validator rejects it, the
  current editor visibly identifies it, reload preserves rather than silently repairs it and the
  user can repair it.

This behavior does not satisfy or waive P16D's future reject-only allocation grid. P16B/P16E must
continue treating persisted invalid ownership as a typed settlement issue and must not show a
plausible settlement total. Any decision to change the separate account-ownership editor's legacy
auto-adjust/clamp behavior needs explicitly authorized component scope; P16A must not conflate it
with explicit allocation semantics.

## Boundary, frozen sources, risks and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes. Its
  21 ordered blocks normalize exactly to `SCOPE.json`; the checked set is
  HS-001/002/004/005/006/008/010/013/014/017/018. HS-009 remains unchecked.
- Canonical FS-001 source remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines
  / 27,382 bytes.
- Before this artifact, current HEAD was exactly `5a7596d05024518a2b586626c22f7e65be5fc9c5`, the
  index/worktree were empty, the server port was clear, generated review artifacts were absent and
  the assigned product HEAD remained unchanged. This review is the sole reviewer-created repository
  path. No product, test, dependency, evidence, source marker, ledger, task, configuration or
  prior-review file was edited.
- No `Q-PROPOSAL-P16A-01-*` is required. Runtime immutability is explicitly decided by the binding
  handoff, and the ownership-editor behavior is resolved by P16A's allocation/ownership and
  mutation/UI scope boundaries.

## Single final verdict

**FAIL.** P16A revision 01 establishes correct separate validation, explicit-set preservation, exact
owner-remainder/effective derivation and deterministic signed minor-unit apportionment, with
independent rational-oracle, regression, dependency, performance and real-app evidence. Root must
preserve this immutable review, keep FS-001 open and HS-009 unchecked, and route F-01 into P16A
revision 02 so every public result envelope, error array and error object is runtime immutable and
directly tested.

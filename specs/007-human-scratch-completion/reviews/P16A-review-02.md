# P16A Independent Review — Revision 02

## Review identity and verdict

- Package / requirements / revision: `P16A` / `FS-001`, `HS-009` / `02`.
- Literal cumulative reviewed product range:
  `1b42d27e11494a167a4768e0c2c308010aa51651..f84f66758708529c44342313e8632ee8b7dcead3`.
- Exact revision-02 implementation range:
  `84e924497d5ee9ba6b7511464d969b7a21bedd44..f84f66758708529c44342313e8632ee8b7dcead3`.
- Frozen revision-02 implementation evidence: `evidence/P16A/implementation-02.md`, SHA-256
  `8262393794bafe48d428e21bdcb39f0a51bb64fe65d735f7bb21f5f45e923868`, 203 lines / 13,291 bytes.
- Immutable revision-01 review: `reviews/P16A-review-01.md`, SHA-256
  `5ad6685bf5d4ceba62bde80b4074e7998313197bb494ce85a7e23ded5645184f`, 260 lines / 18,276 bytes.
- The cumulative range contains 12 paths and has 2,020 insertions / 596 deletions. The revision-02
  product/test delta contains exactly the four authorized allocation/ownership source and unit-test
  paths and has 311 insertions / 24 deletions. `git diff --check` passes.
- Current repository HEAD is the later root-only review dispatch commit
  `43f8e8963699159ab0d02f3f9e168bf03ca748b2`; the assigned product/test HEAD remains unchanged at
  `f84f66758708529c44342313e8632ee8b7dcead3`.
- **Verdict: PASS.** No blocking or non-blocking P16A finding remains. Revision 02 closes revision
  01's F-01 runtime-immutability failure across every public result branch while preserving the
  independently proven validation, exact remainder/effective-allocation and signed-apportionment
  contracts.

## Findings

None.

## Revision-01 F-01 closure

Revision 02 implements the required complete result-graph immutability:

- Both allocation and ownership modules use a private post-order `freezeResultGraph` helper over
  their newly constructed, known-acyclic result graphs. It freezes nested value maps, error arrays
  and individual errors before freezing the public envelope (`src/lib/domain/allocation.ts:117-124`,
  `src/lib/domain/ownership.ts:65-72`).
- Every return branch from exact-weight validation, allocation validation, combined derivation,
  signed apportionment and ownership validation now passes through that helper. This includes
  success, invalid entry, invalid total, empty ownership, combined allocation/ownership propagation,
  invalid amount and unsafe apportionment.
- The helper does not freeze or retain caller-owned inputs. Validators copy primitive entries into
  new maps, derivation consumes those copies and no output aliases the supplied maps.
- Checked-in tests recursively assert every exposed object is frozen and directly attempt to change
  discriminants, values, error reasons and error-array lengths
  (`tests/unit/domain/allocation.test.ts:106-252`, `tests/unit/domain/ownership.test.ts:271-342`).
  Fixed-seed mutation properties add 500 allocation cases at seed `16001604` and 500 ownership cases
  at seed `16001605`.

An independent in-memory probe exercised 20 distinct success/failure shapes, including every typed
exact-weight and ownership failure, allocation plus ownership propagation, valid derivation, valid
and all typed invalid apportionment results and the unsafe-share branch. Every reachable returned
object, nested map, array and error reported frozen; `Reflect.set` mutation attempts returned false
and serialized results remained unchanged. Separate allocation, exact-weight, ownership and
derivation inputs remained unfrozen, writable and unaliased from the frozen output. The revision-01
counterexample is therefore closed at runtime, not only at the TypeScript type level.

## Canonical P16A acceptance audit

- **Domain separation and rejection:** allocation remains signed inclusive `-100..100` and rejects
  negative zero, non-number, non-finite and out-of-range entries. Ownership remains separately
  inclusive `0..100`, non-empty and collectively 100 within the established `0.001` tolerance.
  Expected invalid inputs return typed domain data.
- **Explicit-set preservation:** below-, equal- and above-100 explicit totals remain valid and
  value-equivalent. Validation copies instead of normalizing, clamping, deleting or redistributing
  the explicit map. Pure validation and derivation do not mutate or freeze their inputs.
- **Remainder and effective allocation:** derivation still computes exact `100 - sum(explicit)`,
  supports positive, zero and negative remainder, normalizes only valid ownership into weights and
  produces the deterministic sorted union of explicit and owner IDs. Effective and ownership-weight
  totals close exactly at decimal 100.
- **Signed minor-unit apportionment:** signed safe integers use exact decimal multiplication,
  mathematical floor for positive and negative shares, descending fractional remainder and ascending
  person-ID ties. Positive, negative, zero and one-unit amounts conserve exactly. Invalid/unsafe
  amounts and invalid/non-100 weights return typed failures.
- **Ordering and arithmetic preservation:** 10,000 independent generated BigInt rational cases found
  no derivation, floor, tie, insertion-order or conservation mismatch after the freeze-only
  correction.
- **Reusable immutable API:** public signatures and discriminated unions are unchanged, and every
  exposed success/failure graph is now runtime immutable. The domain barrel remains the reusable
  P16B/C/D boundary.
- **Scope discipline and caller compatibility:** revision 02 changes no formula, schema, dependency,
  CRDT, settlement, balance, component, page or E2E path. Existing account ownership behavior and
  current domain/settlement/balance callers remain compatible. No P16B settlement or P16D allocation
  UI was manufactured.

## Independent counterexample and property evidence

Reviewer-owned commands used the repository-installed TypeScript runner entirely in memory and wrote
no script, test or configuration file:

1. Seed `16001901`, 5,000 cases: one to six owners partitioned exact hundredths of 100, zero to
   eight signed explicit entries used overlapping and non-overlapping IDs, and signed/zero/one-unit
   amounts were apportioned. A BigInt rational oracle independently calculated the exact
   owner-remainder/effective numerators, mathematical floors, fractional ranks and shares.
   Production matched all cases; effective and ownership-weight totals were exactly `"100"`.
2. Seed `16001902`, 5,000 cases: one to eight signed six-decimal weights, including negative and
   above-100 values, were forced to total exactly 100 and inserted in alternating order. A separate
   BigInt floor/largest-remainder oracle matched every production share and source-amount sum.
3. The deterministic 20-shape immutability probe described above independently covered success and
   failure graph depth, failed mutation attempts and mutable/unaliased caller inputs.

Three preliminary reviewer harness attempts are excluded. Two encoded inconsistent percentage-unit
denominators in the independent derivation expectation, and one corrected command accidentally used
unsupported top-level `await` in the runner's CJS eval mode. Each failed in the reviewer harness
before becoming evidence; the final corrected rational derivation and denominator were then run for
all 5,000 seed-`16001901` cases. None exposed or caused a production mismatch.

## Independent automation

| Gate                                                     | Independent result                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Allocation + ownership focus, clean process 1            | PASS; 2 files / 93 passed + 1 benchmark skipped in 1.16 s.             |
| Allocation + ownership focus, clean process 2            | PASS; 2 files / 93 passed + 1 benchmark skipped in 1.17 s.             |
| Allocation + ownership focus, clean process 3            | PASS; 2 files / 93 passed + 1 benchmark skipped in 1.16 s.             |
| Full domain profile                                      | PASS; 13 files / 439 passed + 1 skipped in 3.05 s.                     |
| `pnpm test`                                              | PASS; 62 files / 1,331 passed + 1 skipped in 8.17 s.                   |
| `pnpm typecheck`                                         | PASS.                                                                  |
| `pnpm lint`                                              | PASS exit 0; 0 errors / 10 inherited warnings.                         |
| `pnpm build`                                             | PASS; compiled in 5.8 s, TypeScript in 8.3 s, all 17 routes generated. |
| Exact revision-02 `oxfmt --check` / ESLint               | PASS / PASS with no diagnostics.                                       |
| `git diff --check BASE..HEAD`                            | PASS.                                                                  |
| Accounts + Transactions Chromium, one worker / retries 0 | PASS; 46/46 in 3.0 minutes.                                            |
| Full Chromium, one worker / retries 0                    | PASS; 102/102 in 6.7 minutes.                                          |

Repository `pnpm format:check` exits 1 on exactly the inherited 14 Markdown paths: the six current
root ledgers, P12 implementations 03–06, P12 reviews 05–06, P14 implementation 01 and
`specs/human-scratch.md`. No P16A product/test/dependency path fails its exact format check.

The unchanged affected and full browser suites produced only their established deliberate
offline/authentication/presence diagnostics in journeys that exercise those states. No test failed
or retried.

## Dependency, security and performance

- Revision 02 leaves `package.json` and `pnpm-lock.yaml` unchanged. The cumulative P16A package uses
  exactly one installed `decimal.js@10.6.0`, directly through MoneyFlow and through existing
  jsdom/vitest development paths. Installed metadata remains MIT with bundled types, CJS/ESM entry
  points and a 300 KiB dereferenced directory.
- Existing `currency.js` fixed-precision integer backing is insufficient for arbitrary exact
  percentage products over signed safe minor-unit amounts. The direct exact-decimal dependency
  remains justified; revision 02 adds no package or lock drift.
- `pnpm audit --prod` reports 10 inherited advisories, 5 high and 5 moderate, through current
  Next/sharp paths. None names or traverses `decimal.js`; revision 02 has no dependency delta.
- The independent opt-in benchmark on Node `v22.21.1` used 200 people, 100 warmups and five samples
  of 250 combined derivation/apportionment calls. Samples were 462.35, 453.56, 451.93, 456.46 and
  453.95 ms per 250, approximately 1.81–1.85 ms per combined call. This is only the bounded P16A
  primitive result and makes no P16B 100,000-transaction settlement claim.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli`, unique disposable session
  `p16a-review-02` and root-owned keyed `http://localhost:3000`. No MCP, `npx`, headed/debug/UI
  mode, temporary script/test/config or recovery-word access was used.
- A fresh identity was created while all twelve recovery words remained visibly masked. No word was
  revealed, read, copied, emitted or entered.
- The current Accounts surface showed the default account as `Me (100%)`. Creating
  `Bob P16A Review 02` and `P16A Review 02 Joint` produced `50/50`; changing Me to 80 produced valid
  `80/20`.
- The current ownership-editor invalid-total behavior remained honest and unchanged. Entering 101
  clamped the editor to `100/0`; lowering Me to 80 retained `80/0`, showed `Total: 80.00%`, the
  named `Normalize to 100%` action and exact error `Ownerships must sum to 100%, currently 80.00%`.
  Saved/reload preserved that state and warning. Setting Bob to 20 repaired the account; another
  reload retained final Saved `80/20`.
- Transactions navigation reached the named `Transactions table file drop target` and empty state.
  People navigation returned the heading and named person. No future allocation grid was claimed or
  synthesized.
- At 390 × 844 with dark scheme and reduced motion, inner/root/body client and scroll widths were
  all 390, both media queries matched and named Open menu/Add Person controls remained represented.
- At 1280 × 800 and PROCESS-authorized 200% document zoom, computed zoom was 2, root client/scroll
  widths remained 1280 and body client/scroll widths were 640. Add Person remained visible at
  `x=976.421875..1232`, `y=266..330`; dark/reduced remained active.
- Boolean-only storage inspection emitted no stored values and found 1 local key, 7 session keys, 0
  cookies and 1 IndexedDB database / 3 stores / 8 records. Neither deterministic plaintext marker
  occurred in storage keys, strings, binary views, array buffers or blobs.
- All seven recorded `sync.pushOps` bodies contained `encryptedData` and `versionVector` and neither
  plaintext marker. Full request history contained 356 local requests: 334 HTTP 200, 21 cache 304
  and one excluded setup-only 500 described below; there were zero non-local requests. Final console
  inspection reported 5 messages, 0 errors and 0 warnings.
- The initial root server omitted the local Supabase realtime JWT secret. Identity/vault/snapshot
  requests succeeded, but the first `realtime.authorize` returned 500 and the app honestly stopped
  at `Failed to load vault`. Root diagnosed this harness-only setup error, stopped that server and
  restarted with the already-running local container's secret injected without printing or
  persisting it. Reloading the retained disposable browser then initialized cleanly; every
  subsequent charter action passed. The failed initialization is excluded from product evidence and
  does not implicate the assigned range.
- The CLI browser closed, `delete-data` found no remaining user data and browser listing reported
  `(no browsers)`. Root stopped the corrected keyed server, verified port 3000 clear, restored
  `next-env.d.ts` and moved current `.next`, `test-results` and exactly 22 current CLI artifacts (21
  page YAMLs plus one console log) to recoverable trash while preserving 13 older page YAMLs and 9
  older console logs.

## Ownership-editor adjudication

The observed `101 -> 100/0 -> 80/0` sequence remains a real current UX limitation, but it is not a
P16A allocation-domain finding:

- It comes from the unchanged account `OwnershipEditor` convenience mutation path, not allocation
  validation, effective derivation or signed apportionment.
- P16A's binding scope keeps mutation/UI behavior out of this package and requires current valid
  account create/edit compatibility. Components and pages were outside revision 02's authorized
  write set.
- The invalid total is not converted into a plausible valid value: it is visibly identified,
  persists honestly and can be repaired. Later settlement work must surface it as typed invalid
  ownership rather than calculate a plausible settlement.

This behavior neither satisfies nor waives P16D's future reject-only allocation grid. Any separate
account-editor behavior change needs its authorized component/mutation package; P16A must not
conflate ownership convenience editing with explicit transaction-allocation semantics.

## Boundary, frozen sources, risks and questions

- Frozen human scratch remains SHA-256
  `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`, 350 lines / 24,250 bytes. Its
  21 ordered blocks normalize exactly to `SCOPE.json`; HS-009 remains unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines
  / 27,382 bytes. FS-001 remains immutable and open for P16B–E.
- Before this artifact, current HEAD was exactly `43f8e8963699159ab0d02f3f9e168bf03ca748b2`, the
  index/worktree were empty, port 3000 was clear, generated current artifacts were absent and the
  assigned product HEAD remained unchanged. This review is the sole reviewer-created repository
  path. No product, test, dependency, evidence, source marker, ledger, task, configuration or
  prior-review file was edited.
- Recursive freezing is intentionally private and limited to newly constructed acyclic result
  graphs. It is not a generic application deep-freeze and does not touch caller input. No material
  residual P16A risk remains.
- No `Q-PROPOSAL-P16A-02-*` is required. F-01 and the ownership-editor scope boundary are explicit.

## Single final verdict

**PASS.** P16A revision 02 closes the only revision-01 blocker by making every public result graph
runtime immutable, with direct branch tests and an independent mutation probe. The cumulative
package retains separate allocation/ownership validation, explicit-set preservation, exact
positive/zero/negative owner-remainder derivation and deterministic signed minor-unit apportionment,
supported by 10,000 independent BigInt cases, full regression/browser gates, dependency/performance
review and real-app preservation evidence. Root may integrate this immutable review and advance the
P16 allocation critical path, while keeping FS-001 open and HS-009 unchecked until their remaining
mapped packages independently pass.

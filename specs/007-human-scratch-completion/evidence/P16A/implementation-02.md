# P16A Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package / requirements / revision: `P16A` / `FS-001`, `HS-009` / `02`.
- Literal original cumulative review BASE: `1b42d27e11494a167a4768e0c2c308010aa51651`.
- Revision-01 product HEAD: `6671c09a5ca94ccb4ff47564c15d44935cc73479`.
- Revision-01 failure integration / clean pre-revision HEAD:
  `ab5334d8d1311119f0e0240aea2e92ade239aa15`.
- Root dispatch/control and clean pre-product HEAD: `84e924497d5ee9ba6b7511464d969b7a21bedd44`.
- This sole revision-02 worker artifact was created before any test or product edit. The index and
  worktree were empty at implementation start.
- The current handoff, immutable revision-01 review, canonical FS-001 source, both binding P16A task
  sections, applicable repository guides, all four authorized owners/tests and every current caller
  were read completely before editing.
- Frozen `implementation-01.md` and `P16A-review-01.md` were not edited. Future
  `reviews/P16A-review-02.md` did not exist and was not created.

## F-01 red and implementation

- Tests were added and formatted while both production owners remained byte-identical to
  revision 01. The unchanged-product red command was:

    ```text
    pnpm exec vitest run tests/unit/domain/allocation.test.ts \
      tests/unit/domain/ownership.test.ts --pool=forks --maxWorkers=1
    ```

    It failed both files exactly on F-01: 10 failed / 83 passed / 1 benchmark skipped (94 collected)
    in 1.64s.
    - Allocation had five failing groups: valid envelopes/nested values; allocation errors and
      combined derivation propagation; both exact-weight validation errors; all four apportionment
      error types; and its generated mutation property.
    - Ownership had five failing groups: success; empty failure; individual-entry failure;
      invalid-total failure; and its generated mutation property.
    - Every direct failure reached `Object.isFrozen(...) === false`. The allocation mutation
      property reported seed `16001604`, counterexample amount/explicit/ownership split `0/0/0`;
      ownership reported seed `16001605`, counterexample split `0`.
    - Mutation attempts cover success and failure `ok` changes, individual reason/type changes,
      appended array entries, derived-field changes, and changed validated/apportioned maps.

- Added one private, type-preserving `freezeResultGraph<T extends object>` boundary to each existing
  domain owner. It recursively visits the newly constructed result's object/array children and
  freezes post-order, then freezes and returns the same typed envelope.
- Every return branch of `validateAllocationSet`, `validateExactPercentageWeights`,
  `deriveEffectiveAllocations`, `apportionMinorUnits` and `validateOwnershipSet` now passes its
  complete result through that boundary. Therefore the graph is frozen from outer discriminant
  through:
    - success value objects and every nested returned map;
    - failure arrays and every individual error object; and
    - direct error objects with their person/total context.
- The results are finite, acyclic graphs constructed inside these owners from plain envelopes,
  arrays, maps, errors and primitive values. Validated input maps are copied before they enter a
  result, so freezing a result never freezes or mutates caller-owned input.
- Typed discriminated unions and all public signatures remain unchanged. No schema, boundary,
  decimal formula, explicit-set behavior, owner-remainder/effective calculation, apportionment
  ordering/floor/conservation, ownership compatibility or dependency code changed.
- Added direct branch-complete checks for valid/failure graphs, allocation plus ownership
  propagation, exact invalid value/total, ownership empty/entry/total and apportionment
  invalid-amount/invalid-weight/invalid-total/unsafe branches. The unsafe branch uses otherwise
  valid exact `200/-100` weights with `Number.MAX_SAFE_INTEGER`; defensive invalid-weight branches
  are invoked deliberately with compile-time expected errors.
- The first post-green typecheck found three test-only union-narrowing errors: runtime assertions
  proved `ok: false`, but TypeScript did not narrow loop variables before `.error` access. Explicit
  impossible-success guards were added. No product/math code changed; the rerun passed.

## Property, regression and browser automation

### Production unit and property coverage

- New fixed-seed result-mutation properties:
    - allocation seed `16001604`, 500 runs over signed amounts, explicit values and ownership
      splits; and
    - ownership seed `16001605`, 500 runs over exact two-owner splits. Both recursively prove
      complete graph freezing, failed mutation attempts, unchanged values and conserved apportioned
      amounts.
- Preserved revision-01 production properties remain:
    - derivation seed `16001601`, 1,000 runs;
    - effective and ownership apportionment seed `16001602`, 1,000 runs each; and
    - invalid ownership seed `16001603`, 250 runs.
- After final formatting and the test narrowing correction, the focused profile passed three clean
  processes: 2 files / 93 passed + 1 benchmark skip (94 collected) in 1.77, 1.76 and 1.77s.
- Final broader domain profile passed 13 files / 439 tests + 1 skip (440 collected) in 8.83s,
  including unchanged settlement/balance callers.
- Final `pnpm test` passed 62 files / 1,331 tests + 1 skip (1,332 collected) in 6.41s.
- `pnpm typecheck` passed after the disclosed test-only correction.
- `pnpm lint` exited 0 with 0 errors / 10 inherited warnings: one existing TanStack incompatible
  virtualizer warning plus nine unused type/import warnings in current CRDT query/test paths. No
  warning names a P16A path.
- `pnpm build` passed: compiled in 5.0s, TypeScript in 8.3s and all 17 routes generated.
- Exact four-path oxfmt, exact four-path ESLint and `git diff --check` passed.
- Before this evidence was formatted, repository `pnpm format:check` exited 1 on the exact inherited
  14 Markdown paths plus this draft artifact. Final formatting removes only this artifact from that
  output; the inherited paths are the six current ledgers, P12 implementation revisions 03–06, P12
  reviews 05–06, P14 implementation revision 01 and `specs/human-scratch.md`. No frozen/historical
  path was rewritten.

### Browser automation

- Affected real Accounts + Transactions Chromium journeys, one worker / retries zero, passed 46/46
  in 3.0m.
- Full Chromium, one worker / retries zero, passed 102/102 in 6.6m.
- Only the established deliberate offline/authentication/presence diagnostics appeared in the
  journeys that exercise those states. No test failed or retried.
- No E2E path changed and no P16D allocation UI was manufactured.

## Dependency and performance preservation

- `package.json` and `pnpm-lock.yaml` are byte-identical to revision-01 HEAD. `pnpm why decimal.js`
  still resolves exactly one `decimal.js@10.6.0` through MoneyFlow directly and existing
  jsdom/vitest development paths.
- Preserved installed metadata: MIT, bundled `decimal.d.ts`, CJS `decimal`, ESM `decimal.mjs` and
  300 KiB dereferenced installed size. `currency.js` remains insufficient for arbitrary exact
  percentage products over signed safe minor units; revision 02 introduces no alternative.
- `pnpm audit --prod` retained the existing 10 Next/sharp advisories, 5 high / 5 moderate. None
  names or traverses `decimal.js`; dependency files were not changed.
- The unchanged opt-in production benchmark on Node `v22.21.1` used 200 people, 100 warmups and five
  samples of 250 combined derivation/apportionment calls. Samples were 434.49, 433.15, 435.81,
  429.28 and 434.34ms per 250, approximately 1.72–1.74ms per combined call; Vitest completed in
  3.07s.
- This is only the bounded P16A primitive benchmark. It does not claim P16B's future
  100,000-transaction settlement target.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli`, unique disposable session
  `p16a-impl-02`, and root's keyed `http://localhost:3000` server. There were no failed or hung
  exploratory harnesses. No MCP, `npx`, temporary script/test/config, headed, dashboard, debug/UI
  mode or arbitrary sleep was used.
- A fresh identity was generated and confirmed while all recovery words remained masked. No word was
  revealed, read, copied, emitted or recorded.
- Current real caller preservation, not future P16D allocation UI:
    - default account displayed `Me (100%)`;
    - deterministic Person `Bob P16A R02` and account `P16A R02 Joint` were created;
    - the account started at `50/50`, and editing Me to 80 produced valid persisted `80/20`.
- The existing ownership-editor invalid-total path remained honest and visible. Entering 101 clamped
  the current control to `100/0`; lowering Me to 80 retained `80/0`, displayed exact
  `Ownerships must sum to 100%, currently 80.00%` plus named `Normalize to 100%`, and survived
  reload. Editing Bob to 20 removed the warning; another reload retained `80/20`.
- The clamp/invalid-total sequence is unchanged current account UX. It is not claimed as canonical
  P16A allocation rejection or P16D acceptance.
- Transactions navigation reached the named `Transactions table file drop target`; People navigation
  returned the heading and `Bob P16A R02`.
- At 390x844 with dark scheme and reduced motion, inner/root client/root scroll widths were all 390,
  both media queries matched and named Open menu/Add Person controls remained represented.
- At 1280x800 and PROCESS-authorized 200% CSS document zoom, computed zoom was 2, root client/scroll
  widths remained 1280 and body client/scroll widths were 640. Add Person remained visible at
  x=976.421875..1232 / y=266..330; dark/reduced remained active.
- Boolean-only storage inspection emitted no stored values and found 1 local key, 5 session keys, 0
  cookies, 1 IndexedDB / 3 stores / 8 records and zero occurrences of either deterministic plaintext
  marker.
- All four recorded `sync.pushOps` bodies contained `encryptedData` and `versionVector`, with zero
  marker leaks. Full request history contained 265 local entries: 238 status 200 and 27 cache status
  304, with zero non-local requests and zero failures. Final CLI console inspection reported 5
  messages, 0 errors and 0 warnings.
- The browser closed; `delete-data` reported no remaining user data and `playwright-cli list`
  returned `(no browsers)`.
- Root stopped the keyed server, confirmed port 3000 clear, restored `next-env.d.ts`, and moved the
  current `.next`, `test-results` and disposable-session artifacts to recoverable trash. The
  pre-existing 13 page YAML files and 9 console logs were preserved.

## Questions and risks

- No material ambiguity remains and no `Q-PROPOSAL-P16A-02-*` is required. F-01's closure was
  explicit.
- Recursive freezing is intentionally private and limited to newly constructed, known-acyclic result
  graphs. It does not attempt a generic application-wide deep-freeze or touch caller input.
- The current account editor's repairable invalid `80/0` state remains disclosed and outside this
  four-path immutability correction. P16C/D own persisted mutation boundaries and surfaced
  allocation-grid UX.

## Boundary and cleanup

- Product/test commit and proposed cumulative review HEAD:
  `f84f66758708529c44342313e8632ee8b7dcead3` (`fix: freeze allocation result graphs`).
- Exact revision-02 package delta:
  `84e924497d5ee9ba6b7511464d969b7a21bedd44..f84f66758708529c44342313e8632ee8b7dcead3`. It contains
  exactly the four authorized paths:
    - `src/lib/domain/allocation.ts`
    - `src/lib/domain/ownership.ts`
    - `tests/unit/domain/allocation.test.ts`
    - `tests/unit/domain/ownership.test.ts`
- Its exact stat is 311 insertions / 24 deletions. There is no barrel, dependency, settlement,
  CRDT/schema, UI, E2E, config, ledger, spec or prior-artifact delta.
- Literal cumulative review range:
  `1b42d27e11494a167a4768e0c2c308010aa51651..f84f66758708529c44342313e8632ee8b7dcead3`. It contains
  12 paths / 2,020 insertions / 596 deletions: the revision-01 seven package paths, root-owned
  `HANDOFF.md` / `PROGRESS.md` / `RISKS.md`, frozen `implementation-01.md` and immutable
  `P16A-review-01.md`, plus this revision-02 four-path correction where paths overlap. The worker
  edited only the exact revision-02 four-path delta.
- The product commit index is empty. The only worktree path is this sole untracked/uncommitted
  `implementation-02.md`. Future `P16A-review-02.md` remains absent.
- Final frozen-source verification:
    - `specs/human-scratch.md`: `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001: `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
      lines / 25,441 bytes; and
    - `SCOPE.json`: `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes.
- No scratch checkbox, canonical FS-001 byte, task, ledger, prior artifact or immutable review was
  changed by the worker.
- This is implementer evidence only. It does not claim independent review or PASS; FS-001 and HS-009
  remain open through their remaining mapped packages and lifecycle gates.

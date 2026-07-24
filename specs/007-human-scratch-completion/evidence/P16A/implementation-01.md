# P16A Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirements / revision: `P16A` / `FS-001`, `HS-009` / `01`.
- Literal original cumulative review BASE and clean pre-product HEAD:
  `1b42d27e11494a167a4768e0c2c308010aa51651`.
- Root dispatch/control HEAD: `d0b2324f997d5dffe8326c9f4777a94daaedf49e`.
- This sole worker artifact was created before any product or test edit. The index and worktree were
  empty at implementation start.
- The canonical FS-001 source, both binding P16A task sections, all applicable repository rules and
  current owners/callers were read completely before editing.
- The future `reviews/P16A-review-01.md` did not exist and was not created.

## Red-to-green and implementation

- The unchanged-product red command was:

    ```text
    pnpm exec vitest run tests/unit/domain/allocation.test.ts \
      tests/unit/domain/ownership.test.ts --pool=forks --maxWorkers=1
    ```

    It failed both files as required. `allocation.test.ts` collected zero tests because the
    production `@/lib/domain/allocation` module did not exist. The strengthened ownership suite ran
    47 tests: 37 passed and 10 failed against missing typed-set validation and the existing
    acceptance of non-finite / negative-zero inputs. Fast-check printed fixed seed `16001603`; total
    duration was 1.33s. No product file had changed at this boundary.

- One earlier dependency-discovery attempt imported `decimal.js` before it was direct and failed the
  strict dependency boundary. It is not credited as the clean red; the unchanged-product result
  above is.
- Added one production owner, `src/lib/domain/allocation.ts`, and exported its public contract from
  the domain barrel:
    - `AllocationPercentageSchema` / `validateAllocationSet` reject non-number, non-finite,
      negative-zero and values outside inclusive `-100..100`, returning immutable typed errors and
      branded values.
    - `deriveEffectiveAllocations` separately validates allocation and ownership sets, retains an
      immutable copy of the explicit map, calculates exact `100 - explicitTotal` remainder,
      normalizes validated ownership only into derived exact owner weights, and derives the
      effective union in stable person-ID order. The final sorted owner absorbs only the exact
      decimal residual so owner weights and effective values close at exactly 100 even for repeating
      proportions.
    - Explicit allocation values are never clamped, normalized or mutated. Totals below, equal to
      and above 100 are preserved; owner remainder may be positive, zero or negative.
    - `validateExactPercentageWeights` and `apportionMinorUnits` accept exact branded decimal
      weights totaling 100. The apportioner requires a signed safe integer, mathematically floors
      every exact share including negative values, ranks fractional remainders descending with
      ascending person ID as the tie-breaker, adds the remaining units, and returns a frozen map
      conserving the signed input.
- Hardened the separate ownership owner:
    - `OwnershipPercentageSchema` / `validateOwnershipSet` require at least one owner, reject
      non-number, non-finite, negative-zero and values outside inclusive `0..100`, and validate the
      exact total against the established `0.001` tolerance.
    - Existing `validateOwnerships` / `isValidOwnership` now delegate to the typed boundary while
      retaining their caller-facing messages. Existing ownership editing helpers remain available
      for the current account UX; they are not used for allocation validation or derivation.
- Results, errors and returned maps are immutable. The derivation has no input mutation. There was
  no schema, CRDT, settlement, balance, page, component, E2E, import, automation or configuration
  edit.
- On the first green attempt, one independent expected-value oracle for amount `-5` and weights
  `33.33/33.33/33.34` still encoded truncation-style `-2/-2/-1`. Mathematical floor plus largest
  remainders is `-1/-2/-2`; only that expected value changed. Production code did not change to fit
  the assertion.

## Property, regression and browser automation

### Production unit and property coverage

- `allocation.test.ts` no longer carries test-local implementations. It imports the production
  schemas, validation, derivation and apportionment functions.
- Deterministic property coverage:
    - seed `16001601`, 1,000 runs: valid explicit/ownership sets, preserved inputs and explicit
      values, stable union, insertion-order independence, exact owner weight/effective totals and
      positive/zero/negative remainder;
    - seed `16001602`, 1,000 runs each for effective and ownership exact weights: positive, negative
      and zero signed-minor-unit conservation, including one-cent and zero-decimal cases;
    - seed `16001603`, 250 runs: ownership invalid-value rejection.
- Tables additionally cover inclusive boundaries, negative zero, NaN/infinities, non-number input,
  empty and multiple owners, decimal ownerships, overlapping/non-overlapping People, explicit
  below/equal/above 100, purity, stable ties, negative weights, mathematical negative floors, unsafe
  amounts and invalid exact-weight totals.
- The final focused command above passed three consecutive times: 2 files, 83 passed and the opt-in
  benchmark skipped (84 collected) on every run; each completed in 1.61s.
- Broader current domain owners/callers:

    ```text
    pnpm exec vitest run tests/unit/domain --pool=forks --maxWorkers=1
    ```

    passed 13 files, 429 tests plus the skipped benchmark (430 collected) in 8.68s. This includes
    the unchanged current settlement and balance callers.

- `pnpm test` passed 62 files, 1,321 tests plus the skipped benchmark (1,322 collected) in 6.32s.
- `pnpm typecheck` passed.
- `pnpm lint` exited 0 with 0 errors and the exact inherited 10 warnings (one existing TanStack
  optimizer warning and nine existing P14 image warnings); no warning is in a P16A path.
- `pnpm build` passed: compilation 5.1s, TypeScript 8.3s and all 17 routes generated.
- Exact-path `oxfmt --check`, exact-path ESLint, staged `git diff --check` and the exact staged
  seven-path name audit all passed.
- Repository `pnpm format:check` retained its exact 14-path pre-existing baseline and did not name a
  P16A path:
    - current ledgers `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`,
      `QUESTIONS.md`, `RISKS.md`;
    - P12 implementation revisions 03–06 and reviews 05–06;
    - P14 implementation revision 01; and
    - `specs/human-scratch.md`. It exited 1 as expected; none of those frozen/historical files was
      rewritten.

### Browser automation

- Affected real journeys, Chromium / one worker / retries zero:

    ```text
    pnpm exec playwright test tests/e2e/accounts.spec.ts \
      tests/e2e/transactions.spec.ts --project=chromium --workers=1 \
      --retries=0 --reporter=list
    ```

    passed 46/46 in 3.0m.

- Full Chromium, one worker and retries zero:

    ```text
    pnpm exec playwright test --project=chromium --workers=1 \
      --retries=0 --reporter=list
    ```

    passed 102/102 in 6.6m. The only server output was the suite's expected deliberate offline,
    authentication and presence diagnostics.

- No E2E file was edited to manufacture P16A coverage.

## Dependency and performance evidence

- Existing `currency.js` is direct and suitable for formatted currency values, but its fixed
  precision integer backing cannot represent arbitrary exact percentage products over every safe
  signed minor-unit amount. P16A therefore added exact `decimal.js@10.6.0` as a direct,
  exact-version production dependency.
- The dependency delta is exactly one `package.json` line and three importer lines in
  `pnpm-lock.yaml`; the already-transitive `decimal.js@10.6.0` package node did not change and there
  is no unrelated lock/version drift. `pnpm why decimal.js` resolves one version through MoneyFlow
  directly and existing jsdom/vitest paths.
- Installed metadata reports MIT, bundled TypeScript declarations, CJS and ESM entry points, and a
  300 KiB installed directory.
- `pnpm audit --prod` exited 1 on the existing Next/sharp dependency tree: 10 advisories, 5 high and
  5 moderate. None names or traverses `decimal.js`; upgrading the unrelated baseline was outside
  this package.
- The opt-in benchmark command was:

    ```text
    P16A_BENCHMARK=1 pnpm exec vitest run \
      tests/unit/domain/allocation.test.ts \
      -t 'benchmarks production derivation and apportionment primitives' \
      --pool=forks --maxWorkers=1 --reporter=verbose
    ```

    It passed on Node `v22.21.1`. With 200 people, 100 warmups and five samples of 250 combined
    production derivation/apportionment calls, sample elapsed times were 440.52, 441.92, 436.24,
    437.47 and 435.02ms per 250, or approximately 1.74–1.77ms per combined call. Vitest completed in
    3.08s.

- This is a bounded P16A primitive microbenchmark. It does not claim P16B's future
  100,000-transaction settlement target.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli`, disposable session `p16a-impl-01`, and
  root's keyed `http://localhost:3000` server. No MCP, `npx`, temporary script/test/config, headed,
  dashboard, debug/UI mode or arbitrary sleep was used.
- A fresh identity was generated and confirmed with the phrase masked. No recovery word was
  revealed, read, copied, emitted or recorded.
- Current real account UX, not future P16D allocation UX:
    - the default account visibly showed `Me (100%)`;
    - deterministic Person `Bob P16A` was created;
    - deterministic account `P16A Joint` started at Me/Bob `50/50`;
    - changing Me to 80.00 recomputed Bob to 20.00 and retained exact visible total 100.00.
- The required invalid-total surface was exercised honestly through current `OwnershipEditor`
  behavior. Entering 101 first clamped the current ownership control to Me/Bob `100/0`; lowering Me
  to 80 with the other owner at zero then retained `80/0`. Reload preserved that invalid state and
  showed `Total: 80.00%`, `Normalize to 100%` and exact error
  `Ownerships must sum to 100%, currently 80.00%`. Editing Bob to 20 removed the warning; reload
  retained Me/Bob `80/20`.
- The 101 clamp and resulting invalid 80% state are observed pre-existing ownership-editor UX. They
  are not canonical P16A allocation rejection and are not claimed as P16D surfaced acceptance.
  P16A's production domain/property tests above own canonical rejection.
- Named Transactions navigation reached the `Transactions table file drop target` region; named
  People navigation returned the People heading and `Bob P16A`.
- At 390x844 with dark color scheme and reduced motion emulated, `innerWidth`, root `clientWidth`
  and root `scrollWidth` were all 390; both media queries matched. Named People/Add Person,
  responsive menu, online state and disabled Undo/Redo remained represented.
- In a separate 1280x800 case with PROCESS-authorized CSS document zoom at 200%, computed zoom was
  2, root client/scroll widths remained 1280 and body client/scroll widths were 640. Add Person was
  visible at x=976.421875..1232 / y=266..330; dark and reduced-motion preferences remained active.
- A browser-side marker-only sanitizer inspected all local/session values and keys, cookies, and
  string/binary/blob content across IndexedDB without emitting values. It found 1 local key, 5
  session keys, 0 cookies, 1 database / 3 stores / 8 records, and zero `Bob P16A` or `P16A Joint`
  plaintext leaks.
- All seven recorded `sync.pushOps` bodies contained `encryptedData` and `versionVector`; zero
  bodies contained either plaintext marker. The complete request history contained 278 local
  requests: 251 status 200 and 27 cache status 304, with zero non-local requests and zero failures.
  Final CLI console inspection reported 5 messages, 0 errors and 0 warnings.
- Excluded exploratory probes are recorded rather than credited:
    1. `agent-browser` was not installed; the required installed `playwright-cli` was then used.
    2. The first `run-code` body omitted the required function wrapper and failed with
       `SyntaxError: Unexpected identifier 'page'`; the corrected function did not expose words.
    3. Two center-position row clicks landed on stop-propagating row children and made no expansion;
       an ordinary positioned click at the row's leading edge expanded it.
    4. The first edited-value assertion expected literal `80` but the control correctly rendered
       `80.00`; the formatted assertion passed.
    5. The first reload assertion expected repaired `80/20`, but instead exposed the persisted
       invalid `80/0` path above. That failed assertion is not credited over the subsequent explicit
       warning and repair checks.
    6. A combined navigation probe waited 30s for a Transactions h1 that the route does not render.
       It timed out after reaching `/transactions`; the named table region and subsequent People
       navigation passed.
    7. An initial network sanitizer reported 27 non-2xx entries. Status grouping showed every one
       was a normal 304 cache response; the corrected failure predicate reports zero failures.
- Session close succeeded; `delete-data` reported no remaining user data and `playwright-cli list`
  returned `(no browsers)`. Root stopped the keyed server, confirmed port 3000 clear, restored
  `next-env.d.ts`, moved current `.next`, `test-results` and exactly 10 new CLI YAML artifacts to
  recoverable trash, and preserved exactly 13 older unrelated CLI YAML files.

## Questions and risks

- No material ambiguity remains and no `Q-PROPOSAL-P16A-01-*` is required.
- The current account editor's surfaced/repairable invalid `80/0` state is disclosed above. P16A did
  not change that component or claim its behavior as allocation validation; P16C/D own persisted
  mutation boundaries and actual allocation-grid UX.
- Existing ownership convenience functions intentionally retain their current normalization/clamp
  behavior for account UX. No P16A allocation API calls them, and production property coverage
  proves explicit allocation preservation.
- Safe-integer input is explicit in the apportionment API. Amounts outside JavaScript's safe integer
  range receive `invalid-amount` rather than silently losing minor-unit precision.

## Boundary and cleanup

- Product/test/dependency commit and proposed cumulative review HEAD:
  `6671c09a5ca94ccb4ff47564c15d44935cc73479` (`feat: add exact allocation primitives`).
- The package revision delta from dispatch/control HEAD is
  `d0b2324f997d5dffe8326c9f4777a94daaedf49e..6671c09a5ca94ccb4ff47564c15d44935cc73479` and contains
  exactly the seven authorized paths:
    - `src/lib/domain/allocation.ts`
    - `src/lib/domain/ownership.ts`
    - `src/lib/domain/index.ts`
    - `tests/unit/domain/allocation.test.ts`
    - `tests/unit/domain/ownership.test.ts`
    - `package.json`
    - `pnpm-lock.yaml`
- Its exact stat is 979 insertions / 475 deletions. The only new product path is
  `src/lib/domain/allocation.ts`; the test-local replacement accounts for the large balanced test
  diff.
- The literal cumulative review range is
  `1b42d27e11494a167a4768e0c2c308010aa51651..6671c09a5ca94ccb4ff47564c15d44935cc73479`. In addition
  to the seven package paths, it contains root's dispatch/control
  `specs/007-human-scratch-completion/HANDOFF.md` and `PROGRESS.md` transition committed before
  implementation. The worker did not edit or stage those ledgers.
- The product commit index is empty. The only worktree path after commit is this sole untracked,
  uncommitted implementation evidence artifact. The future independent `reviews/P16A-review-01.md`
  remains absent.
- Frozen scratch, FS-001, SCOPE, ledgers, task files, components/pages, CRDT/schema, settlement,
  balance, E2E, import/automation and config boundaries were not edited by the worker. No scratch
  checkbox or FS-001 source byte changed.
- Final frozen-source verification:
    - `specs/human-scratch.md`: `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001: `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
      lines / 25,441 bytes; and
    - `SCOPE.json`: `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes.
- This is implementer evidence only. It does not claim independent review or PASS; FS-001 and HS-009
  remain open through their remaining mapped packages and independent lifecycle gates.

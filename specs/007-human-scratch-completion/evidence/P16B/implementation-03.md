# P16B Implementation Evidence — Revision 03

## Immutable dispatch boundary

- Package / requirement / revision: `P16B` / `FS-001` / `03`.
- Literal original cumulative review BASE: `4c102600240e2804b801c2a320e10164defb14ea`.
- Revision-02 product/test HEAD: `50b36beb0c7cf9a73d623ed964b6ba05919fffc6`.
- Revision-02 failure integration / clean pre-revision HEAD:
  `ef35b2753b2a12fa73f0f1ebdf9c1454de81b07a`.
- Root dispatch/control and clean pre-product HEAD: `0fd7b884975c6c954d70b224aecf05dc28bd947c`.
- This sole revision-03 worker artifact was created before any test or product edit. The index and
  worktree were empty at implementation start.
- Immutable revision-01/revision-02 evidence and reviews matched their dispatched SHA/line/byte
  identities. Future `reviews/P16B-review-03.md` did not exist and was not created.

## F-04/F-05 red reproductions

- This evidence existed before any product/test edit. The exact checked-in red-tests commit is
  `a325454d7d859742db08d0ccf2517f8794aaddc0` (`test: capture P16B retained boundary regressions`).
  It changed only `tests/unit/domain/settlement.test.ts`; revision-02 production
  `src/lib/domain/settlement.ts` remained byte-identical at dispatched SHA-256
  `f82320017d5212d8160f41b56ad354070b1bf5e05154f35976a4ef73d991f44e`.
- The unchanged-product focused process was:

    ```text
    pnpm exec vitest run tests/unit/domain/settlement.test.ts \
      tests/unit/domain/balance.test.ts \
      tests/unit/components/balance-summary.test.tsx \
      --pool=forks --maxWorkers=1
    ```

    It exited 1 with one failed file / two passed files and 35 failed / 72 passed / one skipped
    tests in 3.98 seconds.

- Every new F-04 direct and generated case failed:
    - non-empty and empty `Map`, `Set`, `Date`, RegExp, `Uint8Array`, and two distinct class
      instances were accepted at allocations or ownership;
    - the reviewer's exact non-empty Bob 100% `Map` returned no issue instead of atomic exclusion;
      and
    - the fixed property failed immediately at seed `26072504`, counterexample `[0,false]`.
- Every new F-05 direct and generated case failed:
    - the exact `{ accountId: "account-a", years: null }` reproduction returned an issue-free empty
      result;
    - malformed store roots, account trees, year/month/day records, child lists and transaction
      lists were either silently skipped or returned non-contextual legacy issues;
    - mixed invalid siblings collapsed to one incomplete issue while other malformed levels
      disappeared; and
    - the hierarchy property failed immediately at seed `26072505`, minimized to `["account-tree"]`.
- All pre-revision expectations remained green during red, including revision-02 F-01/F-02/F-03,
  canonical A-H, arithmetic/netting/source/currency, caller, purity and freezing coverage. No
  product correction preceded or weakened the red checkpoint.

## Remediation mechanisms and preserved core

### Contract-approved financial records

- A settlement-local `isMaterializedRecord` guard now accepts only records whose prototype is
  `Object.prototype` or `null`. Prototype inspection is exception-safe. This guard is used only at
  runtime boundaries whose contract is a materialized record; the broad shared runtime object
  predicate was not globally tightened.
- Allocation and ownership containers use the record guard before `Object.entries`, validation or
  caching. `Map`, `Set`, `Date`, RegExp, typed collections and class instances now return the
  existing stable contextual `invalid-container` allocation/ownership issue and exclude the
  transaction atomically.
- `allocations === undefined` remains the canonical valid empty record. Ordinary and null-prototype
  allocation/ownership records remain valid and calculate the exact Bob-to-Alice obligation in the
  direct counterexample.
- Inputs remain caller-owned: invalid objects and valid null-prototype records are neither mutated
  nor frozen. No alternate financial-map materialization or persisted cache was introduced.

### Visible retained hierarchy

- The sole engine now validates the store root; each non-`$cid` account-tree value; the required
  `years`, `months`, `days` and `transactions` lists; each year/month/day record and numeric
  discriminator; and every transaction-list element before projection.
- Malformed hierarchy returns `invalid-transaction / invalid-hierarchy` with only:
    - stable `accountId`;
    - fixed `transactionId: "<transaction-store>"`;
    - one typed `hierarchyLevel`; and
    - one static, non-sensitive `hierarchyPath`.
- Valid root `$cid` metadata and `$cid` fields on valid retained records remain exempt. The store
  projection keeps its runtime-specific boundary rather than reusing the financial-map decision
  indiscriminately.
- Every malformed sibling creates an issue; hierarchy issues are not collapsed by the logical
  transaction-issue deduplication map. Final issue sorting remains deterministic and input-order
  independent. Transaction duplicate-list issues retain their revision-02 logical deduplication.
- A malformed subtree contributes no transaction. Valid siblings remain calculable, but the retained
  hierarchy issue prevents an issue-free settled claim. The exact mixed case calculates one valid
  paid Bob-to-Alice contribution while returning all ten malformed-sibling issues.
- The public result remains newly allocated and recursively frozen; store/accounts/status inputs
  remain mutable and byte-stable. Issue payloads contain no descriptions, notes, amounts, key
  material or malformed values.

### Preserved canonical engine

- `settlement.ts` remains the sole callable settlement implementation and the public boundary
  remains `TransactionStore`; no array overload, compatibility alias or caller-side flattening
  returned.
- Revision-02 active-before-same-ID selection, retained nested exclusion, collision-free successful
  derivation/calculation caches, fresh failure context, delimiter/NUL-safe nested aggregate maps and
  missing-allocation/duplicate behavior are unchanged.
- Named examples A-H, P16A exact signed apportionment, positive/zero/negative remainder,
  deterministic debtor-creditor matching, currency isolation, reverse netting, signed source
  traceability, safe aggregate rejection, deleted/unknown People IDs, transfer neutrality and
  incomplete-state caller safety all remain green.
- The components guide caused no component write: its current caller contract was preserved and
  verified through the focused component test and browser gates. The E2E guide required
  repository-installed headless CLI use and one-worker/zero-retry browser gates; no E2E file was
  edited.

## Fixed-seed and direct coverage

- Focused settlement coverage now collects 89 tests: 88 normal tests pass and the scale benchmark
  remains opt-in.
- F-04 direct coverage includes:
    - non-empty/empty `Map`;
    - `Set`, `Date`, RegExp and `Uint8Array`;
    - a property-bearing class and a distinct empty class at allocation;
    - equivalent ownership objects;
    - ordinary and null-prototype records; and
    - exact zero qualifying count, empty financial outputs, contextual issue, input mutability and
      the Bob 100% counterexample.
- F-05 direct coverage includes:
    - invalid `null`, primitive, string, array, `Map`, `Set` and `Date` store roots;
    - exact `years: null` and missing years;
    - malformed year/month/day records and each child-list container;
    - malformed transaction elements;
    - multiple invalid siblings across four nested levels;
    - reversed tree/list insertion;
    - valid-sibling calculation with complete issue order/context;
    - no false qualifying count;
    - result freezing; and
    - caller input snapshots and mutability.
- Revision-03 generated properties use independent expected issue/context oracles:
    - seed `26072504`, 200 runs: generated non-record object/container choice crossed with
      allocation versus ownership boundary, exact issue type/context and atomic zero output;
    - seed `26072505`, 300 runs: unique generated hierarchy-level subsets, independently constructed
      static level/path/account oracle, reversed store insertion, exact complete issue equality and
      zero qualifying output.
- Preserved independent properties remain:
    - seed `16001611`, 1,000 signed amount/percentage cases against a BigInt hundredths oracle;
    - reviewer seed `26072501`, 5,000 two-owner/two-explicit-Person cases against a
      denominator-10,000 BigInt rational oracle;
    - seed `26072501`, 1,000 eight-transaction USD/EUR batches with reverse-store equality,
      independent currency positions and signed source conservation;
    - seed `26072502`, 500 delimiter/NUL/Unicode identity permutations; and
    - seed `26072503`, 500 malformed-entry permutations with every distinct Person issue retained.

## Automation and benchmark

### Focused, broader, full and static gates

- Three clean focused processes each passed 3 files / 107 tests plus one skipped benchmark in 4.01,
  3.97 and 3.97 seconds.
- Broader domain/current-caller passed 14 files / 506 tests plus two skips in 11.39 seconds.
- The first full Vitest run passed 1,397 tests and skipped two, but one unrelated timing assertion
  in `tests/unit/import/duplicates.test.ts` measured ratio `4.00668293375911` against `<4`. Its
  isolated 43-test rerun passed in 1.64 seconds. A new full process then passed 63 files / 1,398
  tests plus two skips in 6.37 seconds. No product/test change followed the timing outlier.
- `pnpm typecheck` passed. Exact two-path ESLint and oxfmt checks passed without diagnostics;
  cumulative `git diff --check 4c102600240e2804b801c2a320e10164defb14ea..HEAD` passed.
- Repository `pnpm lint` passed with zero errors and the same ten inherited warnings: one TanStack
  virtualizer compiler warning, two unused query types, and seven unused existing CRDT-test
  types/imports. No warning names a P16B path.
- Production `pnpm build` passed: optimized compilation 5.1 seconds, TypeScript 8.4 seconds and all
  17 routes generated.
- Repository `pnpm format:check` reports only the inherited 14 Markdown paths: six current ledgers,
  P12 implementations 03-06, P12 reviews 05-06, P14 implementation 01 and `specs/human-scratch.md`.
  This formatted evidence is not in the failure set; no inherited file was rewritten.

### Browser gates

- Accounts/Transactions Chromium passed 46/46 in 3.0 minutes.
- Full Chromium passed 102/102 in 6.6 minutes.
- Both commands used one worker, Chromium, retries zero and read-only E2E files. Deliberate
  offline/authentication/presence diagnostics appeared only in journeys that exercise those states;
  no test failed or retried.

### Deterministic full-output scale

- Node `v22.21.1`; deterministic fixture construction excluded; retained hierarchy projection
  included; five 1,000-transaction warmups; full immutable output materialized.
- Command:
  `P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts -t 'production settlement scale' --pool=forks --maxWorkers=1 --disableConsoleIntercept --reporter=verbose`.
- Results: 10,000 `28.45`ms; 50,000 `138.59`ms; 100,000 samples `267.90`, `309.60`, `257.46`,
  `265.39`, `267.46`ms.
- Every 100k sample returned 100,000 qualifying transactions, 75,000 positive source contributions,
  two obligations and zero issues; per-currency position and signed-source conservation passed.
- This evidence does not claim the strict 200ms target. P16E retains the recorded follow-up: profile
  projection/sorting/output allocation in a production bundle; add query-boundary stable revision
  fingerprints and memoized sorted projection without persisting settlement; evaluate safe interned
  tuple/trace sharing; retain this full-output oracle and accept optimization only without reducing
  correctness, privacy or traceability.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli`, unique disposable session `p16b-impl-03`
  and root's in-memory-keyed `http://localhost:3000` server. No Playwright MCP, `npx`,
  headed/debug/UI/dashboard mode, temporary script/test or arbitrary sleep was used.
- Fresh onboarding generated exactly 12 masked word cells. The recovery phrase remained behind
  `Click to reveal`; it was never revealed, read, copied, emitted or recorded. The masked
  acknowledgment path created the identity.
- Real current flow:
    - created Person `P16B03Bob`;
    - verified Default/USD retained `Me (100%)`;
    - created Paid Default/USD expense `P16B03Groceries` `-100.00`;
    - created For Review Default/USD expense `P16B03Pending` `-20.00`;
    - observed
      `Settlement Summary / No outstanding balances between members / Everyone is settled up`; and
    - reloaded and verified Bob, both transaction descriptions/amounts/statuses and the settled
      state persisted with no incomplete warning.
- This is the honest current no-explicit-allocation result: the Paid transaction's effective
  allocation equals Default's 100% ownership and the For Review transaction is excluded. No
  malformed retained state, allocation editor or P16D/P16E-only behavior was manufactured.
- Responsive/preference evidence:
    - viewport 390x844, document zoom 2, dark preference true and reduced-motion preference true;
    - root client/scroll widths were 390/524 and body widths 195/262; horizontal x=0..134 was
      exercised and returned to zero;
    - after scroll into view, Settlement Summary occupied x=98..354 / y=176..288 and the settled
      line x=98..292 / y=472..552 inside the 390x844 viewport;
    - the mobile `Open menu` -> `People` path worked and its semantic snapshot retained both People
      and the complete summary; and
    - computed body background remained current light `lab(100 0 0)` despite dark preference. This
      is an observation only; P16E owns final theme acceptance.
- Boolean-only privacy evidence emitted no stored or request values:
    - renamed the non-paid row to `P16B03PendingPrivate` while awaiting a real `sync.pushOps`
      response; it returned POST 200 and exact-marker checks were false for both URL and body;
    - one localStorage entry, four sessionStorage entries and one IndexedDB / three stores / ten
      entries each had exact-marker false for Bob, Groceries and PendingPrivate;
    - final dynamic inventory listed 38 requests, all HTTP 200; 204 static requests were omitted by
      the CLI default view; and
    - console inspection reported five messages, zero errors and zero warnings.
- One excluded read-only CLI probe attempted unsupported `allInputValues()` after the second
  transaction was already saved. It caused no mutation failure; a supported `count`/`inputValue`
  loop immediately proved both persisted values. It contributes no acceptance claim.
- Session close succeeded, `delete-data` found no remaining user data and final CLI list returned
  `(no browsers)`. Root was asked to stop server session `66207`, verify port 3000 clear, restore
  generated `next-env.d.ts`, move current `.next`/`test-results`, and move exactly the three current
  CLI artifacts to recoverable trash while preserving all 22 older artifacts.

## Questions and risks

- No material ambiguity remains and no `Q-PROPOSAL-P16B-03-*` is required.
- The measured 100k retained projection/output path remains above a strict 200ms interpretation. It
  is reported honestly with the unchanged P16E follow-up above; correctness, issue completeness and
  source traceability were not weakened to chase it.
- Static hierarchy paths intentionally identify only schema levels, never malformed retained values.
  Repeated malformed siblings therefore produce repeated, count-preserving issues with deterministic
  order and stable account/level context, without leaking sensitive payloads.
- The record predicate is boundary-specific and accepts null-prototype records. It does not alter
  the broader store/query materialization predicate used outside the validated hierarchy and
  financial-map envelopes.

## Boundary and cleanup

- Red tests commit: `a325454d7d859742db08d0ccf2517f8794aaddc0`.
- Green product commit / proposed revision-03 review HEAD:
  `cd643afc8f168b3c8328eb54f1d5f280ca7ec717` (`fix: validate retained settlement envelopes`).
- Exact revision-03 package delta
  `0fd7b884975c6c954d70b224aecf05dc28bd947c..cd643afc8f168b3c8328eb54f1d5f280ca7ec717` contains
  exactly two authorized paths / 596 insertions / 22 deletions:
    - `src/lib/domain/settlement.ts`;
    - `tests/unit/domain/settlement.test.ts`.
- Literal cumulative review range
  `4c102600240e2804b801c2a320e10164defb14ea..cd643afc8f168b3c8328eb54f1d5f280ca7ec717` contains 15
  paths / 4,613 insertions / 916 deletions: the prior immutable artifacts/root transitions and
  revision-01 owners plus this revision's exact two paths.
- Product index/worktree are clean. The sole intended worktree path is this untracked/uncommitted
  evidence; future `reviews/P16B-review-03.md` remains absent.
- Final authorized-path identities:
    - `settlement.ts` `4c2ca9676d71a1c7041a93cddce5842f02a1e54f4b453577f4ff3f10bb48403b`, 1,041
      lines / 39,628 bytes;
    - `settlement.test.ts` `22474882cf2e14cdd37103af1951ec4d115f4eb4868427f710ac5b4fa61b3c87`, 1,992
      lines / 75,433 bytes.
- Final frozen-source verification:
    - `specs/human-scratch.md` `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines
      / 25,441 bytes;
    - `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes;
    - revision-01 evidence `48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`, 323
      lines / 21,736 bytes;
    - revision-01 review `5dd6be1a1efbdbecb0a4a3e42e54ec7d0b55a05555deebd88c3009c97fd7df38`, 314
      lines / 18,758 bytes;
    - revision-02 evidence `75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e`, 264
      lines / 18,293 bytes; and
    - revision-02 review `09814cd6a719189afd4951e6683b2f216d6eace729fe230d55add4a2c497054f`, 329
      lines / 19,155 bytes.
- Root cleanup is complete: server session `66207` stopped; port 3000 clear; generated
  `next-env.d.ts` restored; current `.next` moved to recoverable trash; `test-results` absent; the
  exact three revision-03 CLI artifacts moved to trash; zero current artifacts remain; all 22 older
  CLI artifacts and the older `playwright-report` are preserved.
- No scratch checkbox, canonical FS-001 byte, task, ledger, prior P16 artifact, BalanceSummary,
  shared CRDT/query/schema owner, E2E/configuration path or future review was changed by this
  worker.
- This is implementer evidence only. It does not claim independent review or PASS. FS-001 remains
  open through the remaining lifecycle gates.

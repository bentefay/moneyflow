# P16B Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package / requirement / revision: `P16B` / `FS-001` / `01`.
- Literal original review BASE: `4c102600240e2804b801c2a320e10164defb14ea`.
- Root dispatch/control and clean pre-product HEAD: `a584203aea4b1ac030d76c95289d784e8d0937b3`.
- This sole worker artifact was created before any test or product edit. The index and worktree were
  empty at implementation start.
- The governing repository instructions, both applicable skills, GOAL/PROCESS/current durable
  ledgers, binding P16B task, all 715 canonical FS-001 lines, frozen P16A revision-02 evidence and
  review, all authorized owners/tests, P16A primitive owners and every current settlement caller
  were read completely before editing.
- Future `reviews/P16B-review-01.md` did not exist and was not created.

## Red-to-green implementation

- Focused tests were added and formatted while all five production/caller owners remained identical
  to dispatch/control HEAD. The unchanged-product red command was:

    ```text
    pnpm exec vitest run tests/unit/domain/settlement.test.ts \
      tests/unit/domain/balance.test.ts \
      tests/unit/components/balance-summary.test.tsx \
      --pool=forks --maxWorkers=1
    ```

    It exited 1 with 2 failed files / 1 passed file and 27 failed / 18 passed tests in 2.31s (2.95s
    wall time).
    - Settlement failures independently reached examples A–H; deleted/nested/status/transfer
      eligibility; currency fallback/isolation; matching/netting/traceability; every issue type;
      fixed seeds `16001611` and `16001612`; runtime immutability; and sole-export closure.
    - The only settlement expectation that happened to pass was insertion-order equality over the
      old engine's empty result. It was not accepted alone: paired non-vacuous amount/source
      expectations were red, and the final property proves equality plus conservation and source
      sums.
    - Both caller-component expectations failed with `TypeError: balances is not iterable`, proving
      the old caller did not consume a structured result and could not render the required issue or
      currency states.
    - All 18 preserved running/account balance tests passed.

- `src/lib/domain/settlement.ts` is now the only callable production settlement authority.
  `balance.ts` retains only running/account balances, the barrel no longer exposes a compatibility
  alias, and the barrel's canonical export is the exact settlement function.
- The engine now:
    - sorts/deduplicates supplied top-level IDs, excludes deleted and nested suspected duplicates,
      and includes only retained statuses whose behavior is `treatAsPaid`; soft-deleted retained
      statuses still qualify and transfer tags do not alter settlement;
    - retains soft-deleted accounts, resolves account currency then vault default then USD,
      validates it, and never combines currency buckets;
    - validates safe integer minor units and P16A ownership/allocation results, then calls P16A's
      exact signed apportionment independently for effective and ownership weights;
    - computes each signed position as effective share minus ownership share, proves exact
      per-transaction zero sum, and deterministically matches sorted debtors to sorted creditors;
    - emits positive directed per-transaction contributions, aggregates by currency/directed pair,
      nets only the reverse pair in the same currency, removes zero obligations, and retains signed
      forward/reverse source detail on the surviving obligation;
    - rejects the complete invalid transaction with stable typed context rather than committing a
      partial or plausible total when validation, apportionment, position or aggregation is unsafe;
      and
    - sorts every public collection deterministically, recursively freezes the complete result
      graph, and leaves all caller input mutable and byte-equivalent.
- Per-call caches reuse identical allocation/ownership derivations and identical amount/derivation
  calculations. They are local to one invocation and are never persisted. Obligation pair traversal
  is contribution-derived, not every-Person-squared.
- `PeopleTable` now supplies retained accounts and vault default currency to `BalanceSummary`, and
  renders settlement even when no active Person row exists so calculation issues cannot be hidden.
  `BalanceSummary` consumes the structured result, groups obligations by currency with the matching
  formatter, retains stable unknown-Person labels and renders prominent `Settlement incomplete` with
  the distinct affected-transaction count. It never renders a settled claim while issues exist.
- Test-only corrections made during green:
    - the fallback-currency fixture was changed from an explicit USD to an empty account currency;
    - a deterministic matching expectation was corrected to the independently calculated
      `1250/1250/2500` split;
    - a Temporal-bearing input snapshot uses stable JSON rather than `structuredClone`;
    - isolated fixture casts were narrowed to the test boundary; and
    - the third rational-oracle property was added to cover multi-owner positive/zero/negative
      remainder rather than relying only on the first two properties. The first benchmark typecheck
      also found one incomplete synthetic fixture cast; only that test-only cast changed. No
      production correction followed a green gate.

## Canonical result and issue model

- `calculateSettlementBalances(transactions, accounts, statuses, vaultDefaultCurrency?)` returns
  `SettlementResult`:
    - `obligations`: positive integer minor units with currency, debtor, creditor and signed
      `sourceContributions`;
    - `positions`: sorted currency groups and sorted Person-ID signed net positions;
    - `contributions`: positive directed pre-net transaction contributions with stable transaction
      ID, currency and pair;
    - `issues`: typed exclusions; and
    - `qualifyingTransactionCount`: valid included Treat-as-Paid transactions.
- The issue union is:
    - `missing-account` with transaction/account;
    - `invalid-currency` with transaction/account/code;
    - `invalid-allocation` with transaction/account/person/reason;
    - `invalid-ownership` with transaction/account and person/total context when applicable;
    - `invalid-amount` with transaction/account and `not-safe-integer`; and
    - `unsafe-calculation` with transaction/account and `effective-apportionment`,
      `ownership-apportionment`, `position` or `aggregate` stage.
- Issue objects contain only stable identifiers, codes, reasons, totals and stages. No transaction
  description, notes, amount payload, key material or other sensitive data is logged.
- Deleted/unknown People are deliberately not input dependencies. Their retained stable IDs remain
  in positions, contributions and obligations, and the current caller renders
  `Unknown (<stable ID>)`.
- The result is a newly allocated, recursively frozen, finite acyclic graph. Mutation attempts cover
  the envelope, arrays, obligations, sources, contributions, positions and issues; source
  transactions/accounts/statuses remain unfrozen and unchanged.

## Named examples and properties

- Each canonical example has its own named production expectation:
    - A: no explicit allocation, one qualifying transaction, zero position and no obligation;
    - B: 50/50 `-$100` expense, Bob owes Alice `5000` USD minor units;
    - C: Bob explicit 30%, Bob owes Alice `3000`;
    - D: Alice/Bob ownership `60/40` and Charlie explicit 30%, Charlie owes Alice `1800` and Bob
      `1200`;
    - E: Bob explicit `-20%` on an expense, direction reverses and Alice owes Bob `2000`;
    - F: 50/50 `+$100` income, Alice owes Bob `5000`;
    - G: equal joint ownership with no explicit allocation, both positions zero and no obligation;
      and
    - H: non-paid status, zero qualifying transactions and no positions/obligations/contributions.
- Separate named expectations prove deleted/nested exclusion; retained deleted paid status;
  transfer-tag neutrality; account/default/USD currency fallback; cross-currency isolation; sorted
  matching; pair aggregation/reverse netting/signed traceability; unknown/deleted Person IDs;
  insertion independence; all six issue variants; and complete graph/input immutability.
- Fixed production properties use independent BigInt integer/rational oracles:
    - seed `16001611`, 1,000 runs: signed amount and Bob explicit percentage across `[-100,100]`,
      independent hundredths largest-remainder apportionment and exact Person/currency zero sum. The
      unchanged-product counterexample started at amount/percentage `[0,0]`.
    - seed `16001612`, 500 runs: arrays of 1–40 signed amounts split across USD/EUR, reversed input
      order equality, per-currency zero sum and each surviving obligation's signed sources summing
      exactly to its amount. The unchanged-product counterexample started at `[[0]]`.
    - seed `16001613`, 1,000 runs: signed amounts including `-1/0/1`, two owners and two signed
      explicit People, using an independent denominator-10,000 rational oracle across positive, zero
      and negative owner remainder.
- These properties compare concrete positions and sources to independent arithmetic. No property
  passes solely because two empty outputs compare equal.

## Automation and benchmark

### Focused, broader and regression gates

- Final focused command:

    ```text
    pnpm exec vitest run tests/unit/domain/settlement.test.ts \
      tests/unit/domain/balance.test.ts \
      tests/unit/components/balance-summary.test.tsx \
      --pool=forks --maxWorkers=1
    ```

    Three clean processes each passed 3 files / 46 tests + 1 opt-in benchmark skip (47 collected) in
    2.91s, 2.95s and 2.94s.

- Broader domain/current-caller command
  `pnpm exec vitest run tests/unit/domain tests/unit/components/balance-summary.test.tsx --pool=forks --maxWorkers=1`
  passed 14 files / 445 tests + 2 skips (447 collected) in 10.30s.
- Full `pnpm test -- --pool=forks --maxWorkers=1` passed 63 files / 1,337 tests + 2 skips (1,339
  collected) in 6.60s. Vitest accepted the forwarded command and reported the complete repository
  result.
- `pnpm typecheck` passed.
- Exact eight-path ESLint passed with zero warnings/errors; exact eight-path oxfmt check passed in
  215ms; `git diff --check` passed.
- Repository `pnpm lint` exited 0 with 0 errors / 10 inherited warnings: one existing TanStack
  virtualizer compiler warning; two unused query types; and seven unused imports/types in existing
  CRDT tests. No warning names a P16B path.
- `pnpm build` passed: optimized compilation 5.0s, TypeScript 8.5s and all 17 routes generated.
- Before this evidence was formatted, repository `pnpm format:check` exited 1 on the exact inherited
  14 Markdown paths plus this draft artifact. Final formatting removes only this artifact. The
  inherited set is six current ledgers, P12 implementation revisions 03–06, P12 reviews 05–06, P14
  implementation revision 01 and `specs/human-scratch.md`; no frozen/historical path was rewritten.
- Affected command
  `pnpm exec playwright test tests/e2e/accounts.spec.ts tests/e2e/transactions.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line`
  passed 46/46 in 3.0m. Full command
  `pnpm exec playwright test --project=chromium --workers=1 --retries=0 --reporter=line` passed
  102/102 in 6.7m. Existing offline/auth/presence journeys emitted their deliberate diagnostics; no
  test failed or retried. No E2E file changed.

### Independent scale evidence

- Environment: Node `v22.21.1`, AMD Ryzen 9 5950X (16 cores / 32 threads), Linux. The opt-in test
  imported the production engine after a successful production build, used five 1,000-transaction
  warmups, and excluded deterministic fixture construction from every timed interval.
- Benchmark command:
  `P16B_BENCHMARK=1 pnpm exec vitest run tests/unit/domain/settlement.test.ts --pool=forks --maxWorkers=1 --disableConsoleIntercept --reporter=verbose`.
- The 100,000-transaction fixture has two accounts/currencies and four repeated
  expense/income/negative/zero shapes. Every transaction remains a real production input and full
  positions/contributions/obligations/issues are materialized and frozen.
- Pre-optimization 100k samples were `305.14`, `293.15`, `295.05`, `296.43`, `294.57`ms. Caching
  canonical ownership fingerprints/derivations/calculations and replacing all-pair traversal with
  contribution-derived pairs produced:
    - 10,000: `28.31`ms;
    - 50,000: `117.10`ms; and
    - 100,000: `234.54`, `227.14`, `224.10`, `225.16`, `226.89`ms.
- Every 100k sample returned 100,000 qualifying transactions, 75,000 positive source contributions,
  2 obligations and 0 issues. Per-currency position conservation and signed source conservation were
  asserted true. The benchmark file passed 28/28 in 2.67s with 1.326s spent in the benchmark case.
- This evidence does **not** claim the approximate 200ms target passed: the optimized samples are
  about 12–17% above a strict 200ms boundary. More P16B-local optimization is not justified without
  risking required traceability/immutability or redesigning a forbidden query boundary.
- Complete follow-up for P16E/performance hardening:
    1. profile a production bundle with CPU and heap allocation sampling around ordering, canonical
       key creation and the 75,000 trace objects;
    2. add query-boundary stable revision/fingerprint and memoized sorted projections so unchanged
       vault state avoids per-call sort/key serialization, while never persisting settlement;
    3. evaluate interned pair keys and one immutable source object referenced by both global and
       obligation views, preserving public signed direction and complete transaction traceability;
       and
    4. retain this exact oracle/output-count fixture and accept the optimization only when all five
       100k post-warmup samples are at or below the agreed approximately-200ms envelope with the
       same 75,000 sources, 2 obligations, zero issues and exact conservation.

## Installed-CLI manual charter

- Used only repository-installed headless `playwright-cli`, disposable session `p16b-impl-01`, and
  root's keyed `http://localhost:3000` server. No Playwright MCP, `npx`, temporary script/test,
  headed/debug/UI/dashboard mode or arbitrary sleep was used.
- Fresh real onboarding completed while the generated recovery phrase remained masked. No word was
  revealed, read, copied, emitted or recorded.
- Current surfaced flow:
    - created Person `Bob`;
    - verified the default USD account retained `Me (100%)`;
    - created `Travel`, observed current `Me (50%), Bob (50%)`, and changed it through the custom
      currency picker to EUR;
    - created paid `Groceries` `-100.00` on Default/USD; and
    - created non-paid `PendingHotel` `-20.00` on Travel/EUR, later renamed `PendingHotelPrivate`
      through the grid solely for the encrypted-write probe.
- People displayed two members and
  `Settlement Summary / No outstanding balances between members / Everyone is settled up` before and
  after reload. This is the honest current no-explicit-allocation result: the paid transaction's
  effective allocation equals ownership and therefore contributes zero; the non-paid EUR transaction
  is excluded. P16D allocation-grid interaction and P16E obligation expansion/source
  navigation/neutral no-qualifying state are not surfaced or claimed.
- Reload preserved both People, both accounts/currencies, the paid USD row and the non-paid EUR row.
  Accounts and Transactions navigation used their named links; the mobile path used named
  `Open menu` then `People`.
- Responsive/preference evidence:
    - viewport 390x844, CSS document zoom 2, dark preference true and reduced-motion preference
      true;
    - root client/scroll widths were 390/524 and body client/scroll widths 195/262, so the existing
      horizontal range was exercised from x=0 to x=134 and returned to x=0;
    - at x=0, Settlement Summary occupied x=98..354 and settled state x=98..292 inside the 390px
      viewport; named mobile menu/People headings/summary remained represented; and
    - the app's current computed body colors remained its light theme despite the dark preference.
      Full theme acceptance belongs to P16E; no P16B dark-mode claim is made.
- Sanitized privacy evidence emitted no stored/request value:
    - one observed non-GET encrypted `sync.pushOps` write returned 200 and boolean probes for all
      deterministic entity names were false;
    - 1 localStorage entry and 1 IndexedDB / 13 entries had zero broad marker occurrences;
    - 4 sessionStorage entries initially produced one broad substring match for common marker `Bob`,
      located in the value (not key name) of sanitized Next dev-only
      `__next_debug_channel:a8v0z89qNs9s4ELtJp9aK`; the app-owned `moneyflow_session` was false;
    - corrected token-boundary checks for exact/lower/upper variants of each complete marker `Bob`,
      `Travel`, `Groceries` and `PendingHotelPrivate` were false in every session key name and
      value, proving the broad result was a random/common-substring false positive; and
    - final request inventory listed 64 dynamic local requests, all HTTP 200; 251 static requests
      were omitted by the CLI's default view. Final console inspection reported 5 messages, 0 errors
      and 0 warnings.
- Excluded tooling/setup attempts contributed no acceptance evidence:
    - native `select` was attempted against the custom currency combobox and rejected before
      mutation; the visible EUR button was then used;
    - one post-reload row-text probe raced hydration and timed out; the immediate snapshot and
      stable role/input queries proved both persisted rows;
    - `getByDisplayValue` is not implemented by this CLI Page wrapper and failed before listener or
      mutation setup; role plus `inputValue()` was used;
    - a desktop sidebar-link click at effective 195px content width timed out because the sidebar
      was intentionally replaced by the mobile menu; the named menu path then passed; and
    - the first exact-marker regex probe had shell/regex syntax error before page evaluation; the
      corrected token-boundary boolean probe above is the only result used.
- The browser closed, `delete-data` returned no user data, and final CLI list returned
  `(no browsers)`. Root stopped the keyed server, confirmed port 3000 clear, restored
  `next-env.d.ts`, moved only current `.next`, `test-results` and the exact 20 new CLI artifacts to
  recoverable trash, and preserved all 22 older artifacts (13 page YAML / 9 console logs).

## Questions and risks

- No material ambiguity remains and no `Q-PROPOSAL-P16B-01-*` is required.
- The strict 200ms interpretation remains the only open performance risk. It is reported as not
  passed with measured output-preserving optimization and the complete follow-up above; correctness
  or source traceability was not weakened to chase the number.
- The component deliberately stops at currency-grouped obligations and incomplete-state safety. P16E
  owns detailed source expansion/navigation, distinct neutral no-qualifying presentation and final
  integration/memoization/theme hardening. P16D owns real allocation editing. Neither future surface
  is manufactured here.
- Per-call derivation/calculation caching keys are derived from complete sorted ownership/allocation
  records and the signed amount, so they do not cross semantic inputs. No cache survives the call.
- Recursive freezing is restricted to the engine's newly constructed, known-acyclic output graph and
  does not freeze Loro/caller objects.

## Boundary and cleanup

- Product/test commit and proposed review HEAD: `5242a2422cd86dd48eac07a4422491d5079ccd23`
  (`feat: canonicalize settlement engine`).
- Exact package delta:
  `a584203aea4b1ac030d76c95289d784e8d0937b3..5242a2422cd86dd48eac07a4422491d5079ccd23`. It contains
  exactly eight authorized paths / 1,575 insertions / 771 deletions:
    - `src/lib/domain/settlement.ts`
    - `src/lib/domain/balance.ts`
    - `src/lib/domain/index.ts`
    - `src/components/features/people/BalanceSummary.tsx`
    - `src/components/features/people/PeopleTable.tsx`
    - `tests/unit/domain/settlement.test.ts`
    - `tests/unit/domain/balance.test.ts`
    - `tests/unit/components/balance-summary.test.tsx`
- Literal review range:
  `4c102600240e2804b801c2a320e10164defb14ea..5242a2422cd86dd48eac07a4422491d5079ccd23`. It contains
  10 paths / 1,744 insertions / 931 deletions: the eight package paths plus root-owned `HANDOFF.md`
  and `PROGRESS.md`. The worker edited only the exact eight-path package delta and this assigned
  evidence.
- The product commit index is empty. The only worktree path is this sole untracked/uncommitted
  `implementation-01.md`; future `reviews/P16B-review-01.md` remains absent.
- Final frozen-source verification:
    - `specs/human-scratch.md`: `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - immutable FS-001: `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
      lines / 25,441 bytes; and
    - `SCOPE.json`: `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes.
- No scratch checkbox, canonical FS-001 byte, task, ledger, P16A artifact/review or future review
  was changed by the worker.
- This is implementer evidence only. It does not claim independent review or PASS. FS-001 remains
  open through P16C/P16D/P16E and all lifecycle gates.

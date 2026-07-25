# P16C Implementation Evidence — Revision 02

## Immutable revision boundary

- Package / requirements / revision: `P16C` / `FS-001`, `HS-009` / `02`.
- Literal original cumulative review BASE: `0a7c9a49722ddc4d955f910af6dbb19cfffbd600`.
- Revision-01 failure integration / clean pre-revision HEAD:
  `d81a8283552cb6b3cb312e0f2d3e0adab97819d8`.
- Root dispatch/control HEAD: `bfb34d76928c11d49364c88c3f86ae3b94725f7c`.
- This sole revision-02 implementer artifact was created before any revision-02 test or product
  edit. The index and worktree were empty at dispatch. Future `reviews/P16C-review-02.md` did not
  exist and was not created.
- Revision-01 production at the four authorized product paths was byte-identical between
  `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59` and the pre-revision failure integration.
- Frozen source boundary matched:
    - `specs/human-scratch.md` `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
      350 lines / 24,250 bytes;
    - canonical FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines
      / 25,441 bytes; and
    - `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes.
- Frozen revision-01 implementation evidence matched
  `0d08bb7884d37675d94735bdc65d6e5bfb7f5c488c4c64f8c10819bcc745a31b`, 230 lines / 17,079 bytes.
  Immutable review-01 matched `72487e97a3a8f4f3515b398fbc399062bc0f65f5d6b8e938e39f1a76335c5a46`,
  252 lines / 18,298 bytes.

## Unchanged-product F-01–F-03 RED checkpoint

Before any revision-02 product edit, I added counterfactual tests only in
`tests/integration/allocation-crdt.test.ts` and `tests/unit/crdt/maintenance.test.ts`. The unchanged
revision-01 production command
`pnpm vitest run tests/integration/allocation-crdt.test.ts tests/unit/domain/automation.test.ts tests/unit/crdt/maintenance.test.ts tests/integration/vault-maintenance.test.tsx --reporter=verbose`
produced exactly 9 expected failures and 103 passes across 4 files:

- F-01 direct/CRDT and automation revoked-proxy tests both escaped with the review's exact `IsArray`
  `TypeError`;
- F-02 seed `2607252202` produced insertion-order-dependent serialized error graphs;
- direct raw-copy, initialized-Loro review move, import promotion, generated structural movement,
  automation history capture and maintenance relocation each lost string/boolean/null siblings while
  retaining numeric siblings.

The exact RED checkpoint is `2b5cee4f8a1d97d96f1bbfe77e77c0ad3104fa83`
(`test legacy allocation boundaries red`). It contains only those two authorized test paths.

## F-01–F-03 implementation and preservation mechanisms

The exact committed GREEN HEAD is `207e8c5758a48e66980b95eaeff51c0e5a605f7e`
(`fix legacy allocation boundaries`). The GREEN commit contains only:

- `src/lib/crdt/allocations.ts`;
- `src/lib/crdt/maintenance.ts`;
- `src/lib/domain/automation.ts`; and
- `tests/integration/allocation-crdt.test.ts`.

`src/lib/crdt/mutations.ts` was authorized but did not need a revision-02 edit. The existing
`copyAllocations` cast remains the narrow bridge from lossless stored data to the already-typed
transaction draft. `tests/unit/domain/automation.test.ts` and
`tests/integration/vault-maintenance.test.tsx` were authorized owners but did not need revision-02
edits. The RED commit already contains the new `tests/unit/crdt/maintenance.test.ts` proof.

### F-01 complete typed containment

- `inspectOwnDataEntries` now performs `Array.isArray`, prototype recognition, own-key reflection,
  descriptor reflection and materialization inside the same `try` boundary. Null and primitive
  rejection remains outside because those recognition operations cannot trap.
- A revoked Proxy now returns the exact deeply frozen
  `{ error: { reason: "uninspectable-record", type: "invalid-allocation-container" }, ok: false }`
  result. Seed `2607252201` drives independent caller-graph sentinels across direct preparation,
  complete replacement and public insertion. Every path asserts no throw, exact result, unchanged
  input identity, unchanged document version/map and no Undo history.
- Automation evaluation returns the same typed frozen allocation error instead of converting it to a
  string. Application and restoration delegate to the central allocation boundary before status or
  tag mutation. Their revoked-proxy cases prove unchanged Loro version/map/history and caller
  identity. `createAutomationFromTransaction` also validates before attempting `Object.keys`, so
  recognition stays delegated to the central exception-safe boundary.
- Existing ordinary/null-prototype acceptance and array/custom-prototype/symbol/accessor/trap
  rejection remain. Exact `$cid` exclusion and metadata-like Person IDs remain distinct.

### F-02 deterministic invalid graphs

- One explicit code-unit comparator (`left < right`, `left > right`) sorts materialized own string
  keys before validation and sorts emitted validation errors before result construction.
- Seed `2607252202` executes 128 shuffled schedules across ordinary and null-prototype inputs with
  multiple simultaneous reasons, integer-like keys, empty string, Unicode, emoji, NUL,
  `constructor`, `__proto__`, `$cid`-like names and exact `$cid`. Every schedule has the same exact
  serialized result and independent sorted oracle.
- The generated test re-checks caller descriptors after every schedule. Symbols and accessors retain
  central typed rejection, and no getter is invoked. P16A reasons and bounds were not changed.

### F-03 lossless stored-data preservation

- `storedAllocationDataEntries` is the shared private iterator for structural preservation. It
  yields every own enumerable string data descriptor except exact `$cid` without invoking accessors
  or reading inherited/symbol entries. `copyAllocationData` now preserves its `unknown` values
  rather than filtering to numbers.
- Maintenance relocation consumes the same iterator and carries `unknown` values through each
  bounded Loro shadow step. Automation application history privately stores
  `Record<string, unknown>`. Applying or restoring a raw invalid legacy map returns a typed failure
  without changing the current transaction or losing the captured history.
- The exact initialized-Loro review cases now preserve:
    - move `{ outOfRange: 150, stringLegacy: "bad", valid: -12.5 }`; and
    - import-delete promotion `{ stringLegacy: "bad", valid: 25 }`.
- Seed `2607252203` covers string, boolean, null, out-of-range, both infinities, NaN and valid
  siblings across date move, account+date move, nest, unnest, parent swap and maintenance
  relocation, including parent and nested rows. The tests also cover import-delete promotion, direct
  descriptor-safe copy and exact-key repair without sibling loss.
- Public insertion, set-one and complete replacement still call strict validation before draft
  lookup or mutation. Only already-stored structural/history preservation accepts legacy runtime
  values.

## Automated, generated, performance and installed-CLI evidence

### Final-code gates

- The revision-02 focused command
  `pnpm vitest run tests/integration/allocation-crdt.test.ts tests/unit/domain/automation.test.ts tests/unit/crdt/maintenance.test.ts tests/integration/vault-maintenance.test.tsx --reporter=dot`
  ran in three clean Vitest processes. Every run passed 4 files / 112 tests. Durations were 3.73s,
  3.70s and 3.43s.
- The revision-01 owner matrix command covering allocation, automation, generic transaction
  mutation, transaction operations, import, Undo, sync/offline and description-alias actions passed
  10 files / 217 tests in 1.72s. Its inherited React `act(...)` advisories remained non-failing.
- `pnpm test` passed 64 files, 1,492 tests and the same 2 inherited skips in 7.02s.
- `pnpm typecheck` passed. `pnpm lint` passed with 0 errors and the same 10 inherited warnings.
  `pnpm build` passed optimized compilation, TypeScript and all 17 routes.
- Exact changed-path oxfmt, ESLint and `git diff --check` passed before GREEN commit. The formatted
  final evidence is also included in the final exact-path oxfmt check.
- Repository `pnpm format:check` initially listed the pending implementation-02 evidence plus the
  same 14 inherited out-of-scope files recorded by revision 01. After formatting this evidence, the
  remaining baseline is only those 14 inherited files: the six root ledgers, P12 implementations
  03–06, P14 implementation-01, P12 reviews 05–06 and `specs/human-scratch.md`.
- Affected read-only Chromium with one worker, retries zero and line reporter passed 66/66 in 4.5m:
  `accounts.spec.ts`, `transactions.spec.ts`, `import.spec.ts` and `undo-redo.spec.ts`.
- Full read-only Chromium with the same settings passed 102/102 in 6.7m. Offline/realtime cases
  intentionally emitted connection/fetch diagnostics while interrupting connectivity; no case
  failed.

The frozen revision-01 independent seeds remain explicit preservation oracles:

- `2607251201`: 128 initialized-Loro two-peer schedules, 2,033 operations, 124 same-key deletes,
  final PRNG state `576627908`; and
- `2607251202`: 1,200 one-key plus 600 replacement cases, 1,177 invalid rollbacks, final PRNG state
  `2515823298`.

Revision-02 does not change LWW selection, one-key mutation or P16A validation semantics. Checked-in
different-key merge/same-key LWW, generated operation schedules, strict rejection/rollback,
insertion atomicity, one-action Undo, encrypted snapshot/update persistence, alias bypass, import
promotion and maintenance convergence all pass the focused, owner and full profiles.

### Performance

- Environment: Linux `7.0.0-15-generic` x86_64, AMD Ryzen 9 5950X (16 cores / 32 logical CPUs), Node
  `v22.21.1`, pnpm `11.13.1`, Vitest `4.1.10`.
- The production benchmark retains fixed seed `0x16c2026`, 1,000 transactions, 250 allocation keys,
  20 warmups and 100 measured samples per operation. Three dedicated one-file processes measured:
    - one-key mean `0.05818520ms`, p50 `0.055985ms`, p95 `0.063830ms`, max `0.195176ms`; replacement
      mean `0.36351141ms`, p50 `0.351550ms`, p95 `0.407867ms`, max `0.654229ms`;
    - one-key mean `0.06297701ms`, p50 `0.058320ms`, p95 `0.072035ms`, max `0.297779ms`; replacement
      mean `0.36485001ms`, p50 `0.356119ms`, p95 `0.413968ms`, max `0.485162ms`; and
    - one-key mean `0.06048003ms`, p50 `0.058640ms`, p95 `0.065574ms`, max `0.173146ms`; replacement
      mean `0.36315232ms`, p50 `0.352673ms`, p95 `0.406254ms`, max `0.604766ms`.
- The mean of means is about `0.06055ms` for one-key edits and `0.36384ms` for complete replacement.
  Against revision 01's three-process means, one-key is about 4.2% higher and replacement about 9.7%
  higher (about `0.032ms` absolute), consistent with the required stable 250-key sort. Both remain
  far below the existing 100ms edit target. This does not claim P16E's future 100,000-transaction UI
  target.

### Installed `playwright-cli`

- Root supplied the keyed server at `http://localhost:3000`; only installed headless session
  `p16c-impl-02` was used. The final clean acceptance pass kept the generated recovery phrase masked
  and did not copy or print it.
- A manual row was created and edited to date 7/24/2026, description `Manual boundary final`,
  account `Secondary final` and amount `-12.34`. Reload preserved all four exact values. Delete
  enabled one Undo action, and Undo restored the exact row.
- An in-memory one-row CSV reached an enabled `Import 1 Transactions` preview without creating a
  filesystem artifact. Import produced `Imported boundary final` (`-45.67`, 7/23/2026) alongside the
  manual row. The People caller showed one `Me` member and the settled-up state. P16D allocation
  cells are not surfaced, so no allocation-grid acceptance was claimed.
- Accessibility snapshots exposed semantic banners/navigation, headings, named history controls,
  transaction grid/cells and mobile `Open menu`. A 390×844 viewport had no horizontal overflow. At
  1280×720 with CSS 200% zoom, the heading remained visible with no horizontal document overflow.
  Dark color scheme and reduced-motion media queries were both active.
- Console inspection returned 0 errors. Observed vault/sync/realtime requests returned HTTP 200.
  Boolean-only scans returned `false` for manual/import/file-name plaintext in localStorage,
  sessionStorage and every IndexedDB object store; no raw store record was printed.
- `close`, `delete-data` and `list` left no browser or user data. Root stopped server session
  `33619`, cleared port 3000, restored generated source, preserved 22 older CLI files, moved the
  exact 25 new CLI files / 81,048 bytes and final 575,260,253-byte `.next` directory to recoverable
  trash, and confirmed `test-results`/report absent.

## Paths, cleanup, risks and independent-review request

- Literal cumulative
  `0a7c9a49722ddc4d955f910af6dbb19cfffbd600..207e8c5758a48e66980b95eaeff51c0e5a605f7e` contains 15
  paths, 2,843 insertions and 231 deletions: three root ledgers, frozen revision-01
  implementation/review, the revision-01 allocation/product owners and revision-01/revision-02
  tests. Revision-02 pre-product
  `d81a8283552cb6b3cb312e0f2d3e0adab97819d8..207e8c5758a48e66980b95eaeff51c0e5a605f7e` contains only
  root's `HANDOFF.md`/`PROGRESS.md`, three product owners and the two RED test owners.
- Product/test hashes at GREEN HEAD:
    - `allocations.ts` `f907582e2cc84830849dedd325c316aee8a26e6f91b67d520acc444f5d8a2d0f`;
    - `mutations.ts` `f19df83ced713ea15b93bc98c50d88b6b7a8546456098738c29f57fc7509cc9c`;
    - `maintenance.ts` `a5e62ec2c884634c6f8692a3593850b7b0e85bb0f52ab3eee2a6a5bd84476812`;
    - `automation.ts` `b2e9133afc612dbae3a5c9df0333f31d762e6cd021974d8d0490eca998e40d37`;
    - allocation integration `bfef4c67d961b67947679a1571032da9462fb47eb9fddeb61fe4e5388c544d8a`;
    - automation unit `653c35d62bbca445dc4827f41e1a91c6ae6dab8df364d018df8a1f5d9f02f820`;
    - maintenance unit `980ef4fcca3640570d7bfae1f97f2c10250fce60d9975cc80c5e6af64f7c4a00`; and
    - maintenance integration `5adaf080ec476597488c3d843a002a1c323038540762931c489117cb76bbec02`.
- Cleanup leaves the index empty and this sole implementation-02 evidence as the only worktree path.
  No product/test change remains uncommitted. Frozen scratch, canonical FS-001, SCOPE,
  implementation-01 and review-01 hashes/counts remain unchanged from the immutable boundary above.
- Honest residual: complete replacement includes the required stable sort and measured about 9.7%
  higher mean than revision 01, but only about `0.032ms` absolute at 250 keys. P16D allocation UI
  and P16E's 100k UI target remain deliberately out of scope. No other implementation risk or
  complete `Q-PROPOSAL-P16C-02-*` was found.
- This is implementer evidence only, not independent PASS. Review must use a distinct
  `human_scratch_reviewer`, literal `BASE=0a7c9a49722ddc4d955f910af6dbb19cfffbd600`,
  `HEAD=207e8c5758a48e66980b95eaeff51c0e5a605f7e`, exact immutable range `BASE..HEAD`, the frozen
  revision-01 review and this revision-02 evidence. The reviewer must independently reproduce
  F-01–F-03 and all assigned preservation/gate/manual evidence before deciding PASS or FAIL.

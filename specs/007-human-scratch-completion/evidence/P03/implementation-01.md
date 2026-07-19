# P03 Implementation Evidence — Revision 01

## Contract and result

- Package/scope: `P03` / `HS-018`, revision `01`.
- Frozen requirement: update TanStack Virtual once PR #1100 is released and enable `useFlushSync`.
- Literal original BASE and pre-implementation HEAD: `c60f605bd811d8920122a66f3d6743d8a3ac044d`.
- Implementation HEAD: `b8d4b448f52022970ca388654be14d24e347deb5`.
- Required independent review range:
  `c60f605bd811d8920122a66f3d6743d8a3ac044d..b8d4b448f52022970ca388654be14d24e347deb5`.
- Sole implementation commit: `b8d4b448f52022970ca388654be14d24e347deb5` —
  `fix: enable transaction flush sync`.
- Sole worker artifact: `specs/007-human-scratch-completion/evidence/P03/implementation-01.md`.
- Outcome: the external gate is open. PR #1100 has been in stable releases since
  `@tanstack/react-virtual@3.13.15`; the already-installed/current stable `3.14.6` contains the
  typed and executable API and is Safe Chain eligible. No dependency bump was necessary because P01
  had already installed the newest eligible stable. The one current product virtualizer now
  explicitly passes `useFlushSync: true`.

This implementer does not mark PASS. Independent review still owns the acceptance recommendation,
and root alone owns package/requirement state and the scratch marker.

## Exact authorized range and preserved boundary

Commit `b8d4b448f52022970ca388654be14d24e347deb5` and the complete `BASE..HEAD` contain exactly:

| Path                                                        | Purpose                                                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/components/features/transactions/TransactionTable.tsx` | Explicitly enable the released React adapter API on the sole current product virtualizer.                              |
| `tests/unit/transactions/virtualization.test.tsx`           | Prove the exact option, 10,000-row count, 44 px estimate, overscan 5, 440,000 px total size and 11-row rendered bound. |
| `tests/e2e/transactions.spec.ts`                            | Exercise a real 500-row import, bounded incremental virtualization, edge focus/edit, filter, navigation and reload.    |

The commit is 236 insertions and two deletions across those three paths. Exact-path staging named
only those paths; no blanket staging was used. `package.json` and `pnpm-lock.yaml` were authorized
conditionally but did not need to change. Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were
preserved. No task, review, ledger, scratch, frozen source, agent configuration, server, sync,
database or migration path was edited.

Final implementation hashes:

| File                      | SHA-256                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `TransactionTable.tsx`    | `d3ccf2800f87f6e604ab5f917483c399cea14dfa0d83fb49ff71c48b3cad399a` |
| `transactions.spec.ts`    | `241ee89ff9868adfec0fb72a4c117e4f97df3af9f6e9e80e71b25753c4ec3dd1` |
| `virtualization.test.tsx` | `4c78dd635ac2b7c7165ad3e95462ff6815f82fd70d482e45e834279688bceaf1` |

## Current primary-source release gate

### PR identity and exact merge

The GitHub API and PR page were checked at `2026-07-19T18:28:25Z` (`2026-07-20T04:28:25+10:00`):

- PR: [TanStack/virtual #1100](https://github.com/TanStack/virtual/pull/1100),
  `feat(react-virtual): add useFlushSync option`;
- state: closed and merged at `2026-01-02T16:03:01Z`;
- exact merge commit:
  [`1686256eacd3abc33bd20a9911fcccf9221aa0b5`](https://github.com/TanStack/virtual/commit/1686256eacd3abc33bd20a9911fcccf9221aa0b5);
- PR head: `0c8a49949d8d7481d2a38fefd955709fb927e7e0`;
- PR base: `de8c12fb615db794bfb143363f9ad3257506a37d`;
- PR commits: `be081a5441f187fcf39b08e3cbc8df112f2e40fe` (feature),
  `08c210e5b0d3a44277763ac39fe237140bf0ba26` (changeset), and PR head above;
- changed authority includes `packages/react-virtual/src/index.tsx`, its package manifest, React
  documentation, and `.changeset/angry-poets-visit.md`.

The pinned changeset declares a patch to `@tanstack/react-virtual`, describes the option as
controlling synchronous scroll-correction `flushSync`, states the default remains `true`, and says
disabling it trades possible extra fast-scroll whitespace for avoiding the React 19 render-time
warning.

### Exact merge-to-stable mapping

Git tag refs came directly from `git ls-remote --tags https://github.com/TanStack/virtual.git`. For
every peeled stable tag, the GitHub compare API used merge commit `1686256e…` as base. A tag is
classified as containing the PR only when its compare status is `ahead`, `behind_by=0`, and its
merge-base is exactly `1686256e…`; this does not infer inclusion from a version number.

`3.13.14` peeled to `a1d0043d434f6c5367e6cd4a1ddabef82e382bc1` and is `behind` the merge by one
commit. The first containing release is therefore `3.13.15`, not `3.13.14`.

| Stable package | Peeled tag commit                          | Commits ahead of PR merge | npm publication UTC        |
| -------------- | ------------------------------------------ | ------------------------: | -------------------------- |
| `3.13.15`      | `0bcf14de9e8c17942feb404cba3e2a038ebf365b` |                         3 | `2026-01-03T14:38:29.631Z` |
| `3.13.16`      | `7fd265465a24eafb6d4d602fb981a0c64f42c708` |                         5 | `2026-01-03T20:58:13.362Z` |
| `3.13.17`      | `c48b2ac9c4c47d4edebdd5f2058ba280022f6a8b` |                         7 | `2026-01-06T11:31:33.619Z` |
| `3.13.18`      | `5d6acc953f62e892ce9eefa2bcc5340614efab15` |                         9 | `2026-01-07T21:01:35.869Z` |
| `3.13.19`      | `e0e4dcde5c99906eab2ab5aefd75e568b2ece967` |                        11 | `2026-02-23T22:50:20.883Z` |
| `3.13.20`      | `d2a9995490c60cbe3e5e02a7857cdc1b91e1d71a` |                        13 | `2026-03-05T21:10:18.145Z` |
| `3.13.21`      | `c4da5cbb58784e9776f7c812545130e2c79bb119` |                        15 | `2026-03-06T06:39:58.911Z` |
| `3.13.22`      | `c2f1c3979a3170a5995a70eda465618f7339b7a5` |                        21 | `2026-03-12T20:29:25.776Z` |
| `3.13.23`      | `9394e13fdb4b9858057a972ef090e250f754edce` |                        24 | `2026-03-16T08:03:52.042Z` |
| `3.13.24`      | `c3d4cd4f63d9c314ac6ec0ee7885a93a14ae52f9` |                        27 | `2026-04-17T11:51:33.949Z` |
| `3.13.25`      | `949180be8adf66ea8428b326db72ebad42d5b4c3` |                        37 | `2026-05-20T20:14:23.050Z` |
| `3.13.26`      | `693d915e0670cbba5c3e42d0d2a46f085dd7d44e` |                        39 | `2026-05-25T17:01:19.667Z` |
| `3.14.0`       | `d789c6ea036963382eea3440783f84151ed6691d` |                        42 | `2026-06-01T17:38:20.496Z` |
| `3.14.1`       | `c33902ffb88d894d0fd6d800d0a39a1bbda09a5e` |                        44 | `2026-06-01T18:30:14.870Z` |
| `3.14.2`       | `b983b21a48dabdb87e7ca36f5f8587d2cc02f837` |                        49 | `2026-06-02T07:27:48.537Z` |
| `3.14.3`       | `75ae8964a695137ea3dea1ff592ea9502d3d67de` |                        53 | `2026-06-15T19:53:08.471Z` |
| `3.14.4`       | `d73a538a5b1eba7586f3557e2f34564ac3570910` |                        56 | `2026-06-26T10:47:27.886Z` |
| `3.14.5`       | `151e9f47abd4ef2d3b11936c04be8908e6bd0607` |                        61 | `2026-06-30T15:22:33.210Z` |
| `3.14.6`       | `e2cb096862f5b74aa586957eae207b39999cb654` |                        70 | `2026-07-12T20:18:49.037Z` |

The official
[`@tanstack/react-virtual@3.13.15` release](https://github.com/TanStack/virtual/releases/tag/%40tanstack%2Freact-virtual%403.13.15)
also explicitly names PR #1100 and describes the same option/default/tradeoff. The current
[`3.14.6` release](https://github.com/TanStack/virtual/releases/tag/%40tanstack%2Freact-virtual%403.14.6)
updates its core dependency to `3.17.4`; its tag remains a direct descendant of the PR merge.

### Current stable, compatibility and Safe Chain eligibility

Raw npm registry metadata and both wrapped/raw pnpm metadata agreed:

- registry `latest`: `@tanstack/react-virtual@3.14.6`;
- installed direct package: `3.14.6`;
- installed/current exact core dependency: `@tanstack/virtual-core@3.17.4`;
- React and React DOM peers: `^16.8 || ^17 || ^18 || ^19`, compatible with installed `19.2.7`;
- npm tarball integrity:
  `sha512-4+Uq8m0/gzO4kMCHUEpTtGX1RnONK0C+g88b2ltwPMWUBiaVarBuWKoPJaz7gj1cKCVRAdyu+U8GcKhwCc2beA==`.

The installed Safe Chain is `1.5.13`; `pnpm safe-chain-verify` returned `OK: Safe-chain works!`. No
`SAFE_CHAIN_*` environment override and no `/home/ben-agents/.safe-chain/config.json` exists, so
accepted D-007's 48-hour default governs. At the evidence cutoff, `3.14.6` was 166 hours, 9 minutes
and about 36 seconds old—well outside the window—and the wrapper itself returned `3.14.6` as
current. It is the newest stable, compatible and eligible release. No later suppressed release
existed.

`package.json` and `pnpm-lock.yaml` therefore correctly remain SHA-256
`45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` and
`c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`.

## Published and installed API proof

The exact `3.14.6` tarball was downloaded to a private `mktemp -d`, its SHA-512 base64 recomputed to
the registry integrity above, and the temporary directory removed. Published source, ESM/CJS
runtime, and ESM/CJS declarations were inspected rather than assuming ancestry alone:

- source imports `flushSync` from `react-dom`;
- `ReactVirtualizerOptions` exposes `useFlushSync?: boolean`;
- `useVirtualizerBase` destructures `useFlushSync = true`;
- its synchronous rerender branch executes `flushSync(rerender)` only when `useFlushSync && sync`,
  otherwise ordinary `rerender()`;
- both declaration formats publish the option.

Published and installed files matched byte-for-byte:

| Package file          | Published and installed SHA-256                                    |
| --------------------- | ------------------------------------------------------------------ |
| `src/index.tsx`       | `f2bec74a201298ead256dbca98a53306e9cb9a4d762de1c88f1c0ecb5bc6d582` |
| `dist/esm/index.d.ts` | `826b787ebe74dd7475fd837c31768e266ad2a6cbdf2c70262f40a306b40ae7f5` |
| `dist/esm/index.js`   | `be5dde28400b11c753cf6488d8c68106379482e8972971430e99dbb22b40da32` |

A source-wide search found one product `useVirtualizer` call, in `TransactionTable.tsx`; accounts,
people and import tables do not instantiate this API. The complete relevant set is therefore one,
and it now passes the released option explicitly:

```ts
const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    useFlushSync: true
});
```

This is an intentional explicit opt-in even though the installed adapter currently defaults true. It
prevents a future upstream default change from silently changing MoneyFlow's behavior and maps the
frozen requirement to checked-in source.

## Counterfactual and automated regression design

The unit regression was added before the source change and run against unchanged product code. It
failed exactly at:

```text
expected undefined to be true
tests/unit/transactions/virtualization.test.tsx:64
```

That counterfactual proves the new test detects reliance on an implicit package default. After the
one-line source change it passed. The test also supplies 10,000 immutable transaction rows to the
component, captures the adapter options, and proves:

- `count=10_000`;
- estimate size `44` and overscan `5`;
- explicit `useFlushSync=true`;
- scroll element wiring resolves to the rendered HTML element;
- total virtual height is `440000px`; and
- only 11 mocked virtual rows render, keeping DOM work bounded.

The new journey test uses the real app and an in-memory CSV—no test-only product hook. It:

1. creates an isolated identity and imports 500 transactions through column mapping and account
   selection;
2. repeatedly scrolls the real container to grow the app's 50-row pages until virtual index 499;
3. requires that expansion complete within 10 seconds and fewer than 40 rows exist in the DOM;
4. rapidly moves top/bottom and requires indices 0 and 499 to become visible;
5. pointer-focuses the edge description, resizes, proves focus survives, edits and commits it;
6. filters by the immutable original description and proves the edited alias row is the sole match;
7. clears the filter, performs full navigation and reload, and proves all 500 rows persist; and
8. opens an opener-created duplicate tab (which correctly copies session storage), proves the same
   500-row state, and closes it.

Both main and duplicate pages collect task-relevant console warnings/errors and all page errors. The
pattern includes `flushSync`, `ResizeObserver`, hydration, maximum-call-stack and local-update
persistence failures. The test contains no arbitrary timeout sleep, retry, temporary file/config,
test-only API or hidden product-state shortcut.

Before the explicit source line, the final corrected 500-row baseline passed in 10.1 seconds; the
library's current implicit default was already `true`. After the line, the same journey passed in
9.8 seconds and then 3/3 in 29.3 seconds with `--retries=0 --workers=1`. This is the direct
before/after evidence that explicit configuration introduced no scroll timing regression.

## Scale findings retained rather than concealed

### 1,000-row local persistence red — route P14 and P21

An earlier real 1,000-row form of the same journey successfully:

- imported and displayed 1,000 rows;
- incrementally virtualized through the list;
- bounded rendered DOM;
- focused/resized/edited the overscan-edge row; and
- filtered it to one result.

The first full navigation then loaded `0 transactions`. The development server's browser log
identified the exact cause:

```text
Failed to save local update: RangeError: Maximum call stack size exceeded
at SyncManager.encryptUpdate (src/lib/sync/manager.ts:315:28)
return btoa(String.fromCharCode(...encrypted));
```

The error is in large encrypted-update base64 serialization/local persistence, not the virtualizer.
The spread passes the full encrypted byte array as function arguments and crosses the engine's call
argument limit. No P03-authorized path can safely repair it, and P03 does not hide it behind the
green 500-row sample. The proposed owner/recheck route is:

- `P14`, because the triggering operation is one large import batch and P14 owns import
  persistence/sync behavior; the future remediation should replace unbounded spread conversion with
  a bounded encoding path and add the 1,000-row reload regression; and
- `P21`, which must repeat the large-import persistence boundary and reject any data-loss result.

This is a high-severity preservation risk: server push may sometimes rescue state, but the local
crash-safety guarantee is false for the reproduced update. It is not a human design question and
does not justify changing unrelated P03 scope.

### Existing continuous-scroll jank — route P16D and P21

Installed-CLI observation after all 500 rows were loaded measured 40 successive 600 px scroll
increments, one per animation frame:

- mean frame interval `84.5 ms`;
- p95 `154.8 ms`;
- maximum `190.7 ms`;
- 40/40 frames over 50 ms; and
- only 20 rendered rows at completion.

An intentionally harsher full top/bottom alternation measured 85.5 ms mean and 200.8 ms p95. DOM
bounding works, but the present cell-heavy grid visibly cannot sustain frame cadence under this
synthetic rapid-scroll load. The explicit `true` line is runtime-equivalent to the already-shipped
default and the automated before/after timing stayed stable, so this is not a P03 regression. The
proposed owner/recheck route is `P16D`, which owns the actual grid/virtualization performance work,
and `P21`. Future work should profile row/cell render cost and repeat the same measurement rather
than weaken it.

## Installed Playwright CLI charter

### Tool, isolation and privacy

- Repository-installed `@playwright/cli@0.1.17` via exact Corepack pnpm.
- Disposable session: `p03-local-20260720`.
- Identity generation and recovery-word extraction stayed inside one browser closure; only
  `wordCount: 12` was returned. No recovery material entered logs or this artifact.
- The 500-row CSV was an in-browser `File`; no host temporary input file was created.
- No Playwright MCP, `npx`, standalone script, temporary test/config, saved state, headed/debug/UI,
  trace, video, screenshot, PDF or HAR was used.

Two observer snippets initially used Node-closure globals (`performance` and `matchMedia`) and one
used an invalid unquoted numeric CSS attribute selector. They failed as CLI-script diagnostics; the
product action had not occurred in the first case, while subsequent exact observation repeated and
recorded the intended state. A first delete click correctly entered the product's two-click
confirmation state; the repeated normal interaction clicked twice and proved deletion. None was
counted as a product pass or hidden retry.

### Deterministic runtime and UX results

- Import click through first 500-row render: `683 ms`.
- Expansion from the initial page through index 499: `1,901 ms`, ten page increments.
- Final expansion state: index 499 visible; 17 rendered rows; later observations bounded at 11–20.
- A deterministic accessibility snapshot exposed `grid "Transactions"`, one `rowgroup`, toolbar text
  `500 transactions`, and rows 0000–0013 only (14 rows), with named checkboxes, date buttons,
  description textboxes, account comboboxes and delete controls.
- At the bottom, final scroll distance was exactly zero and edge index 499 remained visible after
  rapid top/bottom movement.
- The edge description retained keyboard focus across a 375-to-320 px resize when explicitly
  focused, then committed `CLI Virtualized Edge Edited`; the checked automated journey also proves
  real pointer focus across resize.
- At 320x720 under dark and reduced-motion media, index 499 remained visible and the edited value
  remained exact. Eleven rows rendered. The wide financial grid used its intended internal
  horizontal scroller (`270 px` client width, `1,056 px` scroll width) rather than dropping cells.
- At 200% CSS zoom on a 1280 px viewport, document scroll width remained exactly 1280 px, the grid
  right edge was 1230 px, the table retained internal horizontal scrolling, search focus worked, and
  the 500-row count remained visible.
- Exact filtering located the edited edge transaction. A normal add created row 501; the normal
  two-click delete confirmation removed it and restored 500. Offline local filtering found one row
  and restored all 500 before the context returned online.
- Navigation away/back and reload both restored 500. The edited edge alias persisted. A real
  opener-created duplicate tab restored the same 500 and was closed.
- Before deliberate offline emulation and again after returning online, CLI console inspection
  reported five informational messages, zero warnings and zero errors. Request inspection found no
  failed, 4xx or 5xx request.

The browser was closed; `delete-data` found no persistent profile; `playwright-cli list` returned
`(no browsers)`. Exact P03-generated files removed were:

- `.playwright-cli/console-2026-07-19T18-44-05-253Z.log`;
- `.playwright-cli/console-2026-07-19T18-47-59-568Z.log`;
- `.playwright-cli/page-2026-07-19T18-44-05-553Z.yml`; and
- `.playwright-cli/page-2026-07-19T18-47-28-243Z.yml`.

No file newer than the P03 session start remains in `.playwright-cli`. The explicit development
server was stopped.

## Automated validation ledger

The configured Playwright web server could not auto-start before the first large-list collection and
exited before tests ran. The exact declared `corepack pnpm dev` server then started explicitly in
245 ms. All reported E2E results ran against that healthy server with retries disabled.

| Gate                                             | Result                                                   |
| ------------------------------------------------ | -------------------------------------------------------- |
| unit counterfactual before source                | intended failure; `useFlushSync` received `undefined`    |
| corrected 500-row pre-source behavioral baseline | 1/1 in 10.1 s                                            |
| focused unit after source                        | 1/1                                                      |
| focused 500-row E2E after source                 | 1/1 in 9.8 s                                             |
| focused 500-row repeat                           | 3/3 in 29.3 s, `--repeat-each=3 --retries=0 --workers=1` |
| complete `transactions.spec.ts`                  | 35/35 in 1.7 min, `--retries=0 --workers=1`              |
| complete E2E                                     | 79/79 in 1.2 min, `--retries=0`                          |
| `corepack pnpm format:check`                     | exit 0; 481 files at product/test boundary               |
| `corepack pnpm lint`                             | exit 0; zero errors, same 13 baseline warnings           |
| `corepack pnpm typecheck`                        | exit 0                                                   |
| `corepack pnpm test`                             | exit 0; 42 files, 1,142 tests                            |
| `corepack pnpm build`                            | exit 0; compile 5.2 s, TypeScript 8.1 s, 17 routes       |
| `git diff --check`                               | exit 0                                                   |

The unchanged lint warnings include the existing React Compiler advisory that `useVirtualizer()`
returns functions that cannot be safely memoized. No new lint warning was added; the dedicated
React/CLI checks found no React `flushSync`, hydration or ResizeObserver warning.

## Questions, risks and final self-audit

No Q proposal is required. The frozen requirement, released API, established one-virtualizer
architecture and accepted Safe Chain policy fully decide the implementation. The two discovered reds
are technical risks with named owners and recheck triggers, not authority gaps for a human.

At final handoff:

- HEAD is `b8d4b448f52022970ca388654be14d24e347deb5`;
- `BASE..HEAD` is non-empty and contains exactly the three authorized paths;
- the worker commit contains exactly those three paths;
- no path is staged;
- root-owned `HANDOFF.md` and `PROGRESS.md` remain the only pre-existing dirty paths;
- this evidence is the sole worker-created uncommitted path;
- `next-env.d.ts` was restored byte-for-byte after build, SHA-256
  `7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651`;
- rolling `specs/human-scratch.md` remains SHA-256
  `5d283ab12623e950dd7bf76a1c502b020ecbc2604c97df2e62e40ebd53472efc`, 350 lines and 24,241 bytes;
- immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes;
- package and lock identities remain exact; and
- no P03 CLI browser, profile, input file or generated CLI artifact remains.

The exact range and this complete evidence are ready for independent review. This implementer does
not mark PASS.

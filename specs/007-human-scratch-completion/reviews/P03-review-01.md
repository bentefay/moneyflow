# P03 Independent Review — Revision 01

## Verdict

**PASS.** The upstream gate is open, the exact merge first reached a stable React adapter release in
`3.13.15`, and the installed/current stable `3.14.6` is compatible and Safe Chain eligible. Its
published tarball, installed source, ESM/CJS runtime and declarations all expose the released
`useFlushSync` behavior. MoneyFlow has exactly one current product virtualizer, and it now
explicitly passes `useFlushSync: true` as the frozen requirement directs.

The unit counterfactual is meaningful, the real 500-row journey is retries-disabled and bounded, and
independent automated/manual review found no flushSync, hydration or ResizeObserver warning, scroll
position regression, focus loss or resize loop caused by the option line.

Two material pre-existing reds remain visible and must be retained in canonical risks: a 1,000-row
import loses local persistence because encrypted-update base64 conversion overflows the JavaScript
call stack, and the current cell-heavy transaction grid visibly misses frame cadence under synthetic
continuous scrolling. I independently reproduced both. They do not contradict P03 acceptance because
explicit `true` is runtime-equivalent to the already-installed default and neither owning path
changed in P03. Their routes to P14/P21 and P16D/P21 respectively are accurate.

## Review contract and immutable boundary

- Package/revision: `P03/01`, `HS-018`.
- Literal reviewed range:
  `c60f605bd811d8920122a66f3d6743d8a3ac044d..b8d4b448f52022970ca388654be14d24e347deb5`.
- Frozen evidence: `evidence/P03/implementation-01.md`, independently verified SHA-256
  `66b75fa029316ded9a63a58d42dd9899bb71a5f72ff43670b92ef97f20872f4d`.
- The range contains the sole implementation commit `b8d4b448f52022970ca388654be14d24e347deb5`,
  `fix: enable transaction flush sync`, and exactly three authorized paths: `TransactionTable.tsx`,
  `transactions.spec.ts`, and the new `virtualization.test.tsx`.
- The implementation commit is 236 insertions / two deletions. Package and lockfile were
  conditionally authorized but correctly remained unchanged because P01 had already installed the
  newest eligible release.
- The three implementation file hashes match the frozen evidence:
  `d3ccf2800f87f6e604ab5f917483c399cea14dfa0d83fb49ff71c48b3cad399a`,
  `241ee89ff9868adfec0fb72a4c117e4f97df3af9f6e9e80e71b25753c4ec3dd1`, and
  `4c78dd635ac2b7c7165ad3e95462ff6815f82fd70d482e45e834279688bceaf1`.
- `git diff --check BASE..HEAD` passed. HEAD remained exact; no path was staged. Root-owned unstaged
  `HANDOFF.md`/`PROGRESS.md` and the frozen untracked evidence directory were preserved.
- I read the full task/evidence/HANDOFF/PROCESS contract, repository `.claude/CLAUDE.md`, coding and
  TypeScript rules, and the applicable component, E2E, import and sync guidance. This review edited
  only this assigned new file.

## Findings

No P03-blocking or P03-owned non-blocking finding remains.

The independently reproduced 1,000-row persistence failure and continuous-scroll jank are material
open risks with accurate downstream owners. They are documented below so this PASS cannot be read as
an all-green scale claim.

## Primary-source release and Safe Chain proof

I rebuilt the merge-to-release mapping from GitHub and npm primary sources rather than relying on a
version bump or changelog alone.

GitHub's PR and commit APIs establish:

- PR [TanStack/virtual #1100](https://github.com/TanStack/virtual/pull/1100) is merged, titled
  `feat(react-virtual): add useFlushSync option`, at `2026-01-02T16:03:01Z`;
- exact merge commit: `1686256eacd3abc33bd20a9911fcccf9221aa0b5`;
- head/base: `0c8a49949d8d7481d2a38fefd955709fb927e7e0` /
  `de8c12fb615db794bfb143363f9ad3257506a37d`;
- its three PR commits and four changed files match the evidence; and
- the merge commit's sole parent is `a1d0043d434f6c5367e6cd4a1ddabef82e382bc1`.

That parent is the peeled `@tanstack/react-virtual@3.13.14` tag. GitHub compare reports it one
commit behind the merge. The peeled `3.13.15` tag is `0bcf14de9e8c17942feb404cba3e2a038ebf365b`,
ahead by three, behind by zero, with the PR merge as its exact merge base. Therefore `3.13.15`,
published `2026-01-03T14:38:29.631Z`, is the first stable containing release. Its official GitHub
release explicitly names #1100 and the option/default tradeoff.

The current `3.14.6` peeled tag `e2cb096862f5b74aa586957eae207b39999cb654` is ahead by 70, behind by
zero, with the same exact merge base. The npm registry currently reports `latest=3.14.6`, published
`2026-07-12T20:18:49.037Z`; no later stable was hidden or suppressed at review. Its React/React DOM
peer range includes 19 and its exact core dependency is `3.17.4`, matching the installed graph.

The installed Safe Chain reports version `1.5.13`; `pnpm safe-chain-verify` returned
`OK: Safe-chain works!`. There is no `SAFE_CHAIN_*` override and no user config file, so the
accepted 48-hour policy governs. At review, `3.14.6` was approximately 167 hours old. It is
therefore the newest stable, mutually compatible, eligible release. Keeping the P01-installed exact
version rather than manufacturing another lockfile change is correct.

## Published/installed source, runtime and type proof

The registry's exact `3.14.6` tarball declares integrity:

```text
sha512-4+Uq8m0/gzO4kMCHUEpTtGX1RnONK0C+g88b2ltwPMWUBiaVarBuWKoPJaz7gj1cKCVRAdyu+U8GcKhwCc2beA==
```

I streamed the tarball independently and recomputed that exact SHA-512 base64 value without keeping
a package copy. Published hashes were:

| File                   | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `src/index.tsx`        | `f2bec74a201298ead256dbca98a53306e9cb9a4d762de1c88f1c0ecb5bc6d582` |
| `dist/esm/index.js`    | `be5dde28400b11c753cf6488d8c68106379482e8972971430e99dbb22b40da32` |
| `dist/esm/index.d.ts`  | `826b787ebe74dd7475fd837c31768e266ad2a6cbdf2c70262f40a306b40ae7f5` |
| `dist/cjs/index.cjs`   | `a0c81efbb76535b627cc40caec57752c11d480fd7c8d974918e795cd052986aa` |
| `dist/cjs/index.d.cts` | `826b787ebe74dd7475fd837c31768e266ad2a6cbdf2c70262f40a306b40ae7f5` |

Installed source and ESM files matched byte-for-byte. Direct inspection of both source and runtime
proved that the adapter imports React DOM `flushSync`, publishes `useFlushSync?: boolean`, defaults
it to `true`, and calls `flushSync(rerender)` only for synchronous changes when the option remains
true; otherwise it calls ordinary `rerender()`. ESM and CJS declarations both expose the option.

Thus this is released executable API, not a type-only declaration or inferred ancestry.

## Product inventory and implementation correctness

A source-wide product search found one `useVirtualizer`/`useWindowVirtualizer` call, at
`TransactionTable.tsx:322`. Accounts, People and import tables do not instantiate the TanStack
adapter, so the complete relevant current set is one.

The production diff adds only `useFlushSync: true` beside existing count, scroll element, 44 px
estimate and overscan 5 options. Explicit true is correct even though `3.14.6` currently defaults
true: it maps the frozen requirement into owned source and prevents a future default change from
silently disabling MoneyFlow's required behavior. It adds no render state, unsafe cast, hook order
change or test hook.

The existing React Compiler `incompatible-library` advisory for `useVirtualizer()` remains one of
the 13 baseline lint warnings. It says the compiler will skip unsafe memoization; it is not a new
flushSync runtime warning and this diff does not suppress it.

## Test design and counterfactual

The unit regression is meaningful for the requirement. At BASE, the production call has no
`useFlushSync` key, so its captured value is `undefined` and the exact
`expect(options.useFlushSync).toBe(true)` assertion fails. The frozen evidence records that intended
pre-source failure. At HEAD, the same test passes.

The test also supplies 10,000 immutable rows, captures real component adapter configuration, checks
count 10,000, row estimate 44, overscan 5, a resolved HTML scroll element and total virtual height
440,000 px. Its adapter mock returns 11 virtual items and the component renders exactly 11 rows. The
mock alone would not prove real runtime bounding, but the separate real 500-row journey does, so the
two layers complement rather than circularly substitute for each other.

The E2E is added to the existing Transactions journey. It imports an in-memory 500-row CSV through
the real column/account/import flow, incrementally reaches virtual index 499 within a 10-second
bound, requires fewer than 40 rows in the DOM, moves top/bottom, pointer-focuses and edits the edge
row across resize, filters through the preserved alias, then verifies navigation, reload and an
opener-created duplicate page. It uses retries zero, behavior-facing locators, no arbitrary sleep,
no temporary config/file and no product test hook. Runtime listeners cover task-relevant
flushSync/ResizeObserver/hydration/stack/persistence messages and page errors.

The captured IDs/indexes are behavioral virtualization boundaries; there is no brittle generated
component ID assertion. The 500-row value is intentionally below the separately disclosed 1,000-row
persistence defect so P03 can exercise the adapter without pretending the higher boundary is green.

## Independent automated verification

| Check                                                 | Independent result                                     |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `corepack pnpm format:check`                          | PASS; 482 current files                                |
| `corepack pnpm lint`                                  | PASS; zero errors, 13 baseline warnings                |
| `corepack pnpm typecheck`                             | PASS                                                   |
| focused virtualization unit                           | PASS; 1/1                                              |
| complete unit suite                                   | PASS; 42 files, 1,142 tests                            |
| focused 500-row E2E repeat, retries 0 / worker 1      | PASS; 3/3 in 31.4 s                                    |
| complete `transactions.spec.ts`, retries 0 / worker 1 | **34/35**; known T021c red                             |
| complete E2E, retries 0 / four workers                | PASS; 79/79 in 1.2 min                                 |
| first/final production builds                         | PASS; final compile 5.0 s, TypeScript 8.0 s, 17 routes |
| `git diff --check`                                    | PASS                                                   |

The transaction-file red was the already demonstrated T021c Shift-click flake: timeout waiting for
`3 selected`. It is outside the three-path P03 change except for line movement from the new earlier
test, and the immediately later full suite passed the same case. This is further evidence for the
existing R-009/P13/P21 route, not a reason to hide the 34/35 result or alter transaction-selection
logic in P03.

## Installed Playwright CLI large-list charter

I used installed `playwright-cli@0.1.17`, two isolated synthetic identities and in-browser CSV
Files. No seed phrase, host CSV, saved browser state, screenshot, trace, video or test-only route
was created.

For the 500-row identity, independent observation established:

- import displayed 500 transactions; expansion reached virtual index 499 in 1,817 ms over ten page
  increments and rendered 17 rows at that point;
- later top/bottom, mobile and stress observations stayed bounded at 11–21 rows;
- the accessibility snapshot exposed `grid "Transactions"`, a rowgroup and named row controls only
  for the current bounded virtual window;
- six rapid top/bottom alternations settled exactly at either top zero or bottom distance zero with
  stable 25,053 px height;
- the edge description kept DOM focus across `375x720` then `320x720`, committed the edited value,
  and was recoverable by its immutable original alias filter;
- at 320 px in dark/reduced-motion media, index 499 and the edit remained exact, 11 rows rendered,
  the document had no horizontal overflow, and the grid used its intentional `270/1056` px internal
  horizontal scroller;
- a normal add produced row 501; the exact two-stage `Delete transaction` then `Confirm?`
  interaction removed it and restored 500; offline filtering found the edge edit and returning
  online restored the unfiltered 500;
- navigation away/back, reload and a real opener-created duplicate page each restored 500, and the
  edited alias survived reload; and
- at 200% CSS zoom on a 1280 px viewport, document width remained `1280/1280`, the grid stayed
  within page bounds with internal horizontal scrolling, search retained focus, 500 count remained
  visible and 13 rows rendered.

The normal session finished with zero console warnings/errors; all listed application requests were
successful. Two initial delete diagnostics used the wrong expected post-click accessible name and
timed out without establishing a product result. The accessibility snapshot showed the actual
confirmation name `Confirm?`; the corrected ordinary two-click interaction above succeeded. This was
reviewer selector correction, not a test retry or concealed product failure.

No flushSync, React render, ResizeObserver or hydration warning appeared.

## Scale risk adjudication

### 1,000-row encrypted-update persistence failure — retain P14/P21

I independently imported 1,000 rows through a fresh real identity. The transaction page initially
displayed all 1,000, then logged exactly two errors:

```text
Failed to save local update: RangeError: Maximum call stack size exceeded
SyncManager error: RangeError: Maximum call stack size exceeded
at SyncManager.encryptUpdate (...)
```

After navigating to Accounts and back, the toolbar displayed `0 transactions`; the thousand rows
were not locally recoverable. Source inspection pins the failure to the pre-existing
`src/lib/sync/manager.ts:315`:

```ts
return btoa(String.fromCharCode(...encrypted));
```

That unbounded spread passes the entire encrypted update as function arguments and exceeds the
engine's argument/call-stack limit. `git blame` places it in old commit `57e2eee6`, well before
P03's BASE. Neither the virtualizer option nor either P03 test changes sync, crypto, import mutation
or persistence code.

This is high-severity data-preservation risk, but P14 is an accurate owner: its task explicitly
requires import deletion/action behavior to persist/sync, exercises large/huge import operations and
owns the real import journey where the oversized single update is created. P14 should replace the
unbounded encoding path with bounded conversion and add a 1,000-row navigation/reload regression.
P21 must repeat it and fail the final audit on any data-loss result. Root should add or update a
canonical risk during P03 integration; no human design choice is needed.

### Continuous-scroll jank — retain P16D/P21

With the 500-row list loaded and DOM work still bounded, independent one-frame 600 px scrolling
measured 39 intervals at 94.9 ms mean, 150 ms p95, 166.5 ms maximum, with 39/39 above 50 ms and 21
rows rendered. A harsher 20-frame top/bottom alternation measured 83.3 ms mean, 150 ms p95/max, with
19/19 above 50 ms and 14 rows rendered.

That independently reproduces the evidence's qualitative result: virtualization bounds DOM count,
but the present cell-heavy grid cannot sustain smooth cadence under this synthetic load. It is not a
P03 regression. Before and after explicit configuration, the installed adapter executes the same
default-true branch; the frozen behavioral baseline and current repeated E2E remain stable.

P16D is the accurate owner because it must modify and performance-test the actual virtualized grid,
memoized row/header template and many dynamic person cells, including a sub-100 ms interaction
target. It should profile row/cell work and retain this measurement rather than weaken it. P21 must
repeat the large-grid responsiveness boundary. Canonical R-008 should carry the result.

## Questions and risk routing

No Q proposal is required. The upstream release, Safe Chain policy, single current virtualizer and
explicit frozen requirement decide the P03 implementation. Both reds are technical defects with
named future owners and reversible fixes, not missing human authority.

Root should preserve all three independent routes on PASS integration:

- 1,000-row persistence/stack overflow: P14 and P21, with a high-severity preservation risk;
- continuous-scroll cadence: R-008, P16D and P21; and
- T021c intermittency: existing R-009, P13 and P21.

## Hygiene and final boundary

- Both installed-CLI browser sessions were closed; deletion found no persistent profiles;
  `playwright-cli list` returned no browsers.
- All five review-generated CLI YAML/log artifacts were removed by exact path; pre-existing CLI
  artifacts were preserved.
- The final production build restored `next-env.d.ts` to SHA-256
  `7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651`.
- Package/lock hashes remain `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` and
  `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`.
- Rolling `specs/human-scratch.md` remains
  `5d283ab12623e950dd7bf76a1c502b020ecbc2604c97df2e62e40ebd53472efc`, 350 lines / 24,241 bytes.
- Immutable FS-001 remains `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes.
- `SCOPE.json` remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`; the
  two-source scope remains intact.
- HEAD remains `b8d4b448f52022970ca388654be14d24e347deb5`; staged paths remain empty.

**Final recommendation: PASS P03 revision 01.** Root may persist the immutable implementation and
review artifacts, transcribe the P14/P21 and R-008/P16D/P21 risks while retaining R-009/P13/P21,
record the exact reviewed HEAD/integration commit, and complete HS-018 only after the normal root
acceptance and marker procedure succeeds.

# P12 Independent Review — Revision 07

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `07`.
- Literal cumulative reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..ebe2fb6caf70acbdb88245cf3121f8c6356b1162`.
- Frozen implementation evidence: `evidence/P12/implementation-07.md`, SHA-256
  `f2bb54706d9f1c69b31573d6c3f9be3175043e63cb7a810f00d5917dc64c7a22`, 196 lines / 13,005 bytes.
- Revision-07 product/test delta is
  `bebf4f546c8a7715934adbafd757dfdcd27dec91..ebe2fb6caf70acbdb88245cf3121f8c6356b1162`: one commit,
  exactly two authorized paths, 304 insertions and 8 deletions. The cumulative range contains 30
  paths, 8,489 insertions and 352 deletions.
- **Verdict: FAIL.** Revision 07 closes the literal generic-selector leak from review 06:
  `useVaultSelector` sanitizes the transaction store before the caller can inspect it, including
  whole-state, spread, descriptor and reserved-key shapes, and the three named production tables
  receive the clean store in the original notification before cleanup. The implementation does so by
  synchronously traversing every account, bucket, transaction and nested duplicate whenever a new
  transaction-store snapshot is first read, outside the scheduler's frame budgets. It also leaves
  the exported generic mutation callback on raw state. These violate the cumulative bounded-work and
  public mutation/read-boundary gates. HS-005 must remain unchecked.

## Findings

### F-08 — High / blocking: the selector projection adds an unbounded synchronous full-vault scan

`projectPublicTransactionStore()` enumerates every account (`src/lib/crdt/context.tsx:219-238`). For
each account, `projectPublicAccountTree()` maps every year, month and day, `flatMap`s every
transaction, and filters every nested duplicate (`context.tsx:182-216`). The projection is invoked
inside the `useVaultSelector` callback as soon as any caller reads `state.transactions`
(`context.tsx:243-270`). It is therefore synchronous work on Mirror's React notification/render
path, not work owned by `requestAnimationFrame`, `maxItems` or `maxMilliseconds`.

The two WeakMaps avoid repeating the projection for multiple selectors against the same immutable
Mirror snapshot. They do not bound the first projection, and any transaction-store update produces a
new snapshot that must be traversed again. Even an otherwise constant-time selector such as
`state.transactions[accountId]` or the reserved-key probe now scales with the complete vault. The
production People, Statuses and Tags tables all read `state.transactions`, so ordinary transaction
updates can perform this full scan before those consumers run their own transaction queries.

This is exactly the type of unbounded loop that the HS-005 task tells the reviewer to reject. It
also bypasses the package's large-data frame-work instrumentation: the current tests prove that
scheduled physical cleanup is bounded, but they neither meter nor limit this newly introduced
read-time traversal. Calling the scan “one finite graph projection” in the evidence does not make
its work bounded.

Required closure: preserve private-state invisibility without a full synchronous vault projection on
the notification/render path. Use a path-lazy or incrementally maintained/indexed public view, or
another design whose work unit is demonstrably bounded and whose correctness does not wait for GC.
Add instrumentation over a deliberately large multi-account/nested fixture proving that an
account-specific selector and reserved-key read do not visit unrelated trees, and that ordinary
transaction updates cannot move unbounded work outside the frame scheduler. Retain same-notification
sanitization and stable identities/subscriptions.

### F-09 — Medium / blocking: the exported generic action callback still receives private raw state

The public `useVaultAction()` comment says it creates an application mutation “without exposing raw
alias wire state,” and its callback type is `ApplicationVaultState`. Its implementation nevertheless
passes the raw internal `VaultState` directly to the caller (`src/lib/crdt/context.tsx:312-319`). It
does not use the new projection or any action-safe equivalent.

Consequently, while the physical revision-04 metadata account or a malformed private parent/nested
shadow exists before the next maintenance frame, an action callback can enumerate, retain or branch
on it:

```ts
useVaultAction((state) => state.transactions["__moneyflow_gc_metadata__"]);
```

This window is long-lived while the document is hidden, just as in review 06. Production currently
uses generic actions mainly for non-transaction maps, but the API exposes `transactions`, and the
import flow has generic action callbacks that read and mutate it. Type-only omission of
`descriptionAliases` is not a runtime privacy boundary.

Review 06 explicitly required the implementation to audit generic transaction “mutation/read
consumers under the same private-state rule.” Revision 07 closes the read-selector half but neither
changes nor tests the mutation half.

Required closure: ensure every exported application-state callback, including generic mutation and
edit callbacks, cannot observe the reserved account, private parents or private nested children
before cleanup. Preserve legitimate Immer/Mirror mutations by using an action-safe filtered view or
by removing/restricting generic transaction access in favor of specialized public mutation hooks.
Add real-provider pre-frame tests whose `useVaultAction` callback performs direct, enumeration and
nested reads while the physical private records remain present, and prove legitimate domain
mutations, Undo origin and one cleanup update remain correct.

## Revision-06 finding adjudication

| Prior finding                                             | Revision-07 adjudication                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-07 generic public selectors expose the reserved account | **Selector portion closed.** The application-state proxy sanitizes `transactions` in both property and descriptor reads before caller code runs. Direct store, whole state, spread, descriptor, reserved-key and `useTransactions()` observations are clean in the same import notification while raw Loro state still contains the marker. Real People, Statuses and Tags consumers receive the clean store; unrelated selector identities do not change or rerender. **Mutation-audit portion remains open as F-09**, and the chosen recursive projection introduces F-08. |

## Cumulative acceptance observations

- The recursive public projection correctly rejects the legacy reserved account, private shadow
  parents and private nested children. It shallowly rebuilds only affected branches and preserves
  public object identities within one raw snapshot.
- Late marker-only and marker-plus-domain imports still notify public consumers cleanly before the
  frame, then perform exactly one `system:gc` physical cleanup update. The ordinary domain edit is
  retained, and duplicate delivery does not resurrect the marker or emit a second cleanup update.
- Revision-06 scheduler-disposal authority remains revoked correctly. The direct root-tag,
  root-allocation, nested-tag and nested-allocation copied-value cases remain green.
- Review-04 F-01 through F-03 remain closed. Public direct/global queries reject private records;
  global canonicalization occurs after multi-account concatenation; exchanged unnest/swap operations
  converge at complete physical JSON state.
- Imported Loro spans remain incrementally classified before maintenance advances. Mixed,
  dependency-delayed and reverse delivery invalidate unsafe authority, while maintenance-only
  delivery avoids local echo.
- The physical maintenance worker retains item/time budgets, resumable cursors, fairness, hidden
  pause/visible resume, cancellation and idempotent rescanning. Alias reads remain independent of
  GC; direct-reference rewrite, backlink proof, narrow hard-delete authority, `system:gc` Undo
  exclusion and encrypted sync propagation remain intact.
- No plaintext payload, secret, auth bypass, transport discriminator, new schema/root field or
  test-only production hook was introduced. F-08 and F-09 are the material cumulative blockers.

## Independent automation

Read-only command verification was delegated to the independent reviewer-verification agent required
by `.claude/agents/reviewer.md`; the reviewer separately inspected the complete cumulative range,
ran the focused revision-07 counterexamples, and ran both browser matrices.

| Gate                                                                    | Independent result                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Revision-07 targeted selector cases                                     | PASS; 6/6: malformed private parent/nested child, marker-only, marker-plus-domain and real People/Statuses/Tags consumers.                                                                                                                                                                                                                                                                       |
| Focused P12 profile                                                     | PASS in three clean processes; 4 files / 105 tests each (3.24 s, 3.51 s, 3.59 s).                                                                                                                                                                                                                                                                                                                |
| `pnpm test`                                                             | PASS; 60 files / 1,278 tests in 5.99 s.                                                                                                                                                                                                                                                                                                                                                          |
| `pnpm typecheck`                                                        | PASS; no diagnostics.                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm lint`                                                             | PASS exit 0; 0 errors / 10 disclosed inherited warnings.                                                                                                                                                                                                                                                                                                                                         |
| `pnpm build`                                                            | PASS; Next 16.2.10 compiled, type generation passed and all 17 routes built.                                                                                                                                                                                                                                                                                                                     |
| Revision-07 changed-path `oxfmt --check`                                | PASS; both product/test paths.                                                                                                                                                                                                                                                                                                                                                                   |
| Repository `pnpm format:check`                                          | FAIL on exactly 13 disclosed control/frozen files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `implementation-03.md`, `implementation-04.md`, `implementation-05.md`, `implementation-06.md`, `P12-review-05.md`, `P12-review-06.md`, and `specs/human-scratch.md`. Neither revision-07 path nor uncommitted implementation-07 evidence failed. |
| Revision-only `git diff --check`                                        | PASS.                                                                                                                                                                                                                                                                                                                                                                                            |
| Cumulative `git diff --check BASE..HEAD`                                | FAIL solely at frozen `implementation-06.md:191` for its committed blank line at EOF. Revision 07 has no authority to alter that immutable evidence artifact.                                                                                                                                                                                                                                    |
| Affected no-retry E2E, five journeys with `--repeat-each=3 --workers=1` | PASS; 15/15 in 3.1 minutes.                                                                                                                                                                                                                                                                                                                                                                      |
| Full no-retry E2E, `--workers=1`                                        | PASS; 87/87 in 5.4 minutes.                                                                                                                                                                                                                                                                                                                                                                      |

The browser-test server again emitted local Realtime-authentication warnings because that runner did
not receive the root-only signing value, but both matrices passed. The correctly keyed manual server
showed 200 responses for vault, sync and Realtime operations. Green automation does not meter the
new projection or invoke a generic action callback against the pre-frame private fixture.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-review-07`. No MCP, `npx`, temporary browser test/config, headed/UI/debug/show/pause mode or
  arbitrary sleep was used.
- The first root-owned server URL used the `127.0.0.1` origin while Next advertised `localhost`.
  Next rejected the dev HMR socket as cross-origin and onboarding remained disabled. The server was
  stopped cleanly and restarted on `http://localhost:3000`; the disposable session was cleared and
  reopened, after which onboarding worked. This was an environment-origin mismatch, not a product
  finding.
- Created a fresh identity while all twelve recovery words remained masked. They were never
  revealed, copied, read, entered or printed. The authenticated application exposed accessible
  `My Vault`, owner, online presence and `Saved` status.
- Created `P12 selector charter` for `42.50` through the named controls with default `7/24`; reload
  preserved exactly one row. While offline, keyboard-edited the description to
  `P12 selector charter offline` and blurred it; status became `Saving...`. Reconnect reached
  `Saved`, and reload preserved the edit and amount.
- A directly created second tab reached the accessible `Welcome Back` / Unlock page because vault
  key material is tab-local. It was closed without revealing or entering recovery material.
- Navigated the actual People, Tags and Statuses routes. They exposed expected accessible headings,
  the current user, empty tags state and default statuses with no visible maintenance-only record.
- At 390 × 844 with dark and reduced-motion preferences, the row and transaction controls remained
  accessible; inner, client and scroll widths were all 390, and both media queries matched. The body
  background remained `lab(100 0 0)` under dark preference, the inherited P20A/P20B theme
  limitation.
- At 200% page scale on a 1,280 px viewport, `visualViewport.scale` was 2 and inner, client and
  scroll widths were all 1,280. The sidebar, history controls, filters, full row and named
  transaction controls remained represented in the accessibility snapshot.
- An exact direct-description search remained at `0 transactions (filtered)` for five seconds,
  although clearing it restored the row immediately. This is an inherited search observation;
  revision 07 changes no search code and the checked-in search journey passed in the final no-retry
  suite.
- Final console inspection returned zero error-level messages. Current navigation, vault, sync and
  Realtime requests were 200; earlier failed requests were the expected result of explicit offline
  emulation.
- Normal UI cannot install revision-04 metadata or malformed private transaction trees while pausing
  the maintenance frame. The decisive privacy cases therefore remain deterministic real-document
  integration tests; manual success cannot waive F-08 or F-09.

## Boundary, cleanup and questions

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246 bytes, with
  HS-005 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Frozen revision-06 evidence remains SHA-256
  `08ca7c17f64371f1f6c06ef1b8593cee035477f5b8a8dfb09431ec40b59a177c`, 191 lines / 12,326 bytes.
  Failed review-06 remains SHA-256
  `a6182d430b761fd57c0ebd5ce08045811e952979303ab59b74afa885d8a8693e`, 165 lines / 11,879 bytes.
- The CLI session was closed and `delete-data` found no residual user data. Root stopped the server,
  verified port 3000 closed, restored `next-env.d.ts`, and moved exact revision-07 browser/build
  output to recoverable trash. No reviewer browser, Next, Playwright or E2E process remains.
- Before this artifact, worktree entries were exactly root-owned modified `HANDOFF.md` and
  `PROGRESS.md` plus frozen untracked `implementation-07.md`; the index was empty. This review is
  the sole reviewer-created artifact. No product, test, marker, ledger, evidence, configuration or
  prior-review file was edited.
- No new `Q-*` proposal is needed. Bounded work and the public application-state boundary are
  explicitly settled by HS-005 and review 06.

## Single final verdict

**FAIL.** Revision 07 correctly sanitizes generic selectors before caller observation and preserves
same-notification cleanup semantics and stable identities. However, its recursive projection
introduces an unbounded synchronous full-vault scan outside the RAF budgets, and the exported
generic action hook still exposes raw private transaction state to its callback. Root must preserve
this immutable review, keep HS-005 unchecked and route F-08 and F-09 into P12 revision 08.

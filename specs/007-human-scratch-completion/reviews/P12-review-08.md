# P12 Independent Review — Revision 08

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `08`.
- Literal cumulative reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..a2a31839f6bb57855fa60b8cfcc06feed069cafa`.
- Frozen implementation evidence: `evidence/P12/implementation-08.md`, SHA-256
  `c3d0753c48884fea4d15a93b3570301ea3c69f071ab02d1a831daa9a4ce50900`, 202 lines / 13,758 bytes.
- Revision-08 product/test delta is
  `a5570e3d805cbb65af3f4cf5cead554fef279bce..a2a31839f6bb57855fa60b8cfcc06feed069cafa`: one commit,
  exactly two authorized paths, 580 insertions and 51 deletions. The cumulative range contains 32
  paths, 9,471 insertions and 354 deletions.
- **Verdict: PASS.** Revision 08 replaces the eager whole-vault projection with a cached path-lazy
  membrane and applies that same public boundary to every exported generic selector, action and edit
  callback. F-08 and F-09 are closed. The exact cumulative range satisfies HS-005, and the human
  scratch checkbox may be integrated by root.

## Findings

No material findings.

## Revision-07 finding adjudication

| Prior finding                                                           | Revision-08 adjudication                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F-08 eager projection performs an unbounded synchronous full-vault scan | **Closed.** Creating application-state, transaction-store and account-tree projections does not enumerate the store or descend into buckets. The proxy wraps only a property or numeric element the caller requests. A filtered parent or nested list builds and caches its public-index map only if that particular list is read, enumerated or mutated, then invalidates that list-local cache on writes. A 24-account real-provider fixture proves account-0 and reserved-key selectors cause zero parent and nested classifier calls both initially and after an ordinary transaction update, despite a real notification and rerender. Work explicitly requested by a consumer remains proportional to the traversed list; there is no hidden unrelated-vault walk, and the bounded RAF scheduler remains the sole owner of physical maintenance. |
| F-09 exported generic mutation callbacks receive private raw state      | **Closed.** `useVaultAction` and both active-session and standalone `useVaultEditAction.update` paths invoke callers with `projectApplicationVaultState(state)`, matching `useVaultSelector`. A paused-frame real-provider test imports a physical legacy marker, private parent and private nested child, then proves direct reads, enumeration, descriptors and nested graphs are clean inside the actual exported callbacks. Public note mutation, transaction insertion and preference edit write through; cleanup emits one `system:gc` origin, and Undo reverts the public user mutations without restoring the marker. Manual settings Undo/Redo exercised the active edit-session path.                                                                                                                                                        |

## Cumulative acceptance observations

- The public membrane caches projected application state, stores, account trees, bucket arrays and
  nodes, transaction lists and objects, and nested lists by raw identity. Store traps hide the
  reserved maintenance account from direct reads, descriptors, `in` and enumeration. Filtered list
  traps present coherent public indices, keys, descriptors and length while translating assignment,
  deletion, length changes, `push` and `splice` to the underlying Mirror draft.
- Parent classification continues to use canonical `isPublicTransaction`; nested classification uses
  the canonical maintenance-shadow identity helper. Privacy does not wait for a maintenance frame,
  while projection itself schedules no task and performs no physical cleanup.
- Same-notification selector privacy from F-07 remains intact. Whole-state, spread, descriptor,
  reserved-key and production People/Statuses/Tags observations are clean before cleanup; unrelated
  selector identities and subscriptions remain stable.
- Late marker-only and marker-plus-domain imports still notify public consumers cleanly, retain the
  ordinary domain edit and perform exactly one `system:gc` cleanup update. Duplicate delivery does
  not resurrect the marker or emit a second cleanup update.
- Scheduler-disposal authority remains revoked correctly. Direct root-tag, root-allocation,
  nested-tag and nested-allocation copied-value cases remain green.
- F-01 through F-03 remain closed. Public direct/global queries reject private records; global
  canonicalization follows multi-account concatenation; exchanged unnest/swap operations converge at
  complete physical JSON state.
- Imported Loro spans remain incrementally classified before maintenance advances. Mixed,
  dependency-delayed and reverse delivery invalidate unsafe authority, while maintenance-only
  delivery avoids local echo.
- The maintenance worker retains item/time budgets, resumable cursors, fairness, hidden pause and
  visible resume, cancellation and idempotent rescanning. Alias reads remain independent of GC;
  direct-reference rewrite, backlink proof, narrow hard-delete authority, `system:gc` Undo exclusion
  and encrypted sync propagation remain intact.
- No plaintext payload, secret, auth bypass, transport discriminator, new schema/root field or
  test-only production hook was introduced.

## Independent automation

Read-only command verification was delegated to the independent reviewer-verification agent required
by `.claude/agents/reviewer.md`. The reviewer separately inspected the complete cumulative range,
ran the focused F-08/F-09 counterexamples and ran both browser matrices.

| Gate                                                                    | Independent result                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Revision-08 targeted F-08/F-09 cases                                    | PASS; 2/2 targeted cases, with 21 unrelated tests skipped.                                                                                                                                                                                                                                                                                                                                       |
| Focused P12 profile                                                     | PASS in three clean processes; 4 files / 107 tests each (3.51 s, 3.68 s, 3.45 s).                                                                                                                                                                                                                                                                                                                |
| `pnpm test`                                                             | PASS; 60 files / 1,280 tests in 6.14 s.                                                                                                                                                                                                                                                                                                                                                          |
| `pnpm typecheck`                                                        | PASS; no diagnostics.                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm lint`                                                             | PASS exit 0; 0 errors / 10 disclosed inherited warnings.                                                                                                                                                                                                                                                                                                                                         |
| `pnpm build`                                                            | PASS; Next 16.2.10 compiled, type generation passed and all 17 routes built.                                                                                                                                                                                                                                                                                                                     |
| Revision-08 changed-path `oxfmt --check`                                | PASS; both product/test paths.                                                                                                                                                                                                                                                                                                                                                                   |
| Repository `pnpm format:check`                                          | FAIL on exactly 13 disclosed control/frozen files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `implementation-03.md`, `implementation-04.md`, `implementation-05.md`, `implementation-06.md`, `P12-review-05.md`, `P12-review-06.md`, and `specs/human-scratch.md`. Neither revision-08 path nor uncommitted implementation-08 evidence failed. |
| Revision-only `git diff --check`                                        | PASS.                                                                                                                                                                                                                                                                                                                                                                                            |
| Cumulative `git diff --check BASE..HEAD`                                | FAIL solely at frozen `implementation-06.md:191` for its committed blank line at EOF. Revision 08 has no authority to alter that immutable evidence artifact.                                                                                                                                                                                                                                    |
| Affected no-retry E2E, five journeys with `--repeat-each=3 --workers=1` | PASS; 15/15 in 3.0 minutes.                                                                                                                                                                                                                                                                                                                                                                      |
| Full no-retry E2E, `--workers=1`                                        | PASS; 87/87 in 5.4 minutes.                                                                                                                                                                                                                                                                                                                                                                      |

The browser-test server emitted the inherited local Realtime-authentication warnings because that
runner did not receive the root-only signing value; both no-retry matrices passed. The correctly
keyed manual server returned 200 for vault, sync and Realtime operations.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-review-08`. No MCP, `npx`, temporary browser test/config, headed/UI/debug/show/pause mode or
  arbitrary sleep was used.
- Created a fresh identity while all twelve recovery words remained masked. They were never
  revealed, copied, read, entered or printed. The authenticated application exposed accessible
  `My Vault`, owner, online presence and `Saved` status.
- Changed the real vault-settings name to `P12 Review Lazy Vault`, then used Undo and Redo. Undo
  restored `My Vault`, Redo restored the new name, and the active edit-session path returned to
  `Saved`.
- Created `P12 review lazy action` for `42.50` through the named controls with default `7/24`;
  reload preserved exactly one row. While offline, keyboard-edited the description to
  `P12 review offline replay` and blurred it; status became `Saving...`. Reconnect reached `Saved`,
  and reload preserved the edit and amount.
- Used the real generic application actions to create `Review Person`, `Review Tag` and
  `Review Status`. Each was visible through its accessible production route and the application
  returned to `Saved`.
- A user-opener cloned the authenticated tab-local session. Both visible tabs showed two online
  presence entries. Editing the first tab to `P12 review two tab` propagated live to the second tab,
  which exposed that exact input value before either tab was reloaded.
- At 390 × 844 with dark preference and reduced motion, the accessible mobile header/menu, history
  controls, filters and full transaction row remained available. Inner, client and scroll widths
  were all 390, both media queries matched, and the transaction and Add controls remained visible.
  The body background remained `lab(100 0 0)` under dark preference, the inherited P20A/P20B theme
  limitation.
- At 200% CSS page zoom on a 1,280 × 800 viewport, computed zoom was `2`; inner, client and scroll
  widths were all 1,280. The sidebar, history controls, filters, row and named transaction controls
  remained represented in the accessibility snapshot.
- An exact direct-description search did not return the row after five seconds, although clearing it
  restored the row immediately. This repeats the inherited revision-07 manual observation; revision
  08 changes no search code, and the checked-in search journey passed in the final no-retry suite.
- Final active-tab console inspection returned zero error-level messages. Current vault, sync and
  Realtime requests were 200. Earlier failed requests were the expected result of explicit offline
  emulation.
- Normal UI cannot install revision-04 metadata or malformed private transaction trees while pausing
  the maintenance frame. The decisive privacy cases therefore remain deterministic real-document
  integration tests; manual validation additionally proves the real active edit, offline replay and
  two-tab paths.

## Boundary, cleanup and questions

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246 bytes, with
  HS-005 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Frozen revision-07 evidence remains SHA-256
  `f2bb54706d9f1c69b31573d6c3f9be3175043e63cb7a810f00d5917dc64c7a22`, 196 lines / 13,005 bytes.
  Failed review-07 remains SHA-256
  `2efb05fe259074868b4e2852550f9fcd8caf8ec654f1d1eb926e038f11d14ad5`, 209 lines / 21,524 bytes.
- The CLI session was closed and `delete-data` found no residual user data. Root stopped the keyed
  server, verified port 3000 closed, restored `next-env.d.ts`, and moved generated `.next`,
  `test-results` and exact revision-08 reviewer CLI output to recoverable trash. Pre-existing CLI
  files were preserved. No reviewer browser, Next, Playwright or E2E process remains.
- Before this artifact, worktree entries were exactly root-owned modified `HANDOFF.md` and
  `PROGRESS.md` plus frozen untracked `implementation-08.md`; the index was empty. This review is
  the sole reviewer-created artifact. No product, test, marker, ledger, evidence, configuration or
  prior-review file was edited.
- No new `Q-*` proposal is needed. Bounded work and the public application-state boundary are
  explicitly settled by HS-005 and review 07.

## Single final verdict

**PASS.** Revision 08 removes the hidden whole-vault notification/render scan, preserves
same-notification privacy through a path-lazy public membrane, and closes every exported generic
action/edit boundary without compromising legitimate mutations, Undo or physical cleanup. Root may
integrate this exact reviewed range and check the HS-005 human-scratch item.

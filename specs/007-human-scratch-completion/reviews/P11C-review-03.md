# P11C Independent Review — Revision 03

## Review identity and verdict

- Package / requirement / revision: `P11C` / `HS-004` integrated completion checkpoint / `03`.
- Literal cumulative reviewed range:
  `0426866fa66cc022efca6d74cd5088d586d3d11b..daab038ee741faa9f92a373b27efe0c8fe8940db`.
- Frozen implementation evidence: `evidence/P11C/implementation-03.md`, SHA-256
  `264c6b104391998e05a7481468c823af857eed2446f8ea7d4eade630f4b59770`, 189 lines / 14,523 bytes.
- Revision 03 changes exactly the two authorized product/test paths in HANDOFF: 398 insertions and
  14 deletions. The cumulative range contains 24 paths, 2,749 insertions and 188 deletions.
  `git diff --check BASE..HEAD` passes.
- **Verdict: PASS.** Revision 03 closes the two immutable F-01 failures. The production alias
  collection and lookup stay stable across unrelated local/remote notifications, and the semantic
  alias observer now spans the provider/document lifetime so no alias event is missed while every
  alias consumer is absent or between render and subscription setup. Document replacement and final
  provider disposal release exactly the task observer with no late callback or cross-document cache.
  No blocking finding remains in the cumulative P11C range. HS-004 stays unchecked until root
  completes integration and the authorized marker gate.

## Findings

No High or Medium finding was found.

## F-01 closure and lifecycle audit

### Provider-lifetime observation and frontier reconciliation

- Store creation records the document frontier and one legal collection per semantic alias revision
  (`src/lib/crdt/context.tsx:72-95`). Consumer subscription now changes only the listener set
  (`context.tsx:119-124`); it cannot tear down document observation during a zero-consumer route.
- `VaultProvider` creates one store per document and starts it from a layout effect
  (`context.tsx:128-138`). `start()` installs the observer before comparing the last observed
  frontier with the current one (`context.tsx:98-111`). Normal events advance the recorded frontier
  and notify only when an event path begins with `descriptionAliases`.
- The setup reconciliation uses Loro's operation diff and resolves every affected container to its
  top-level path (`context.tsx:62-70`). I independently probed a first-ever alias insertion from an
  empty `LoroDoc`: its one diff container resolved to `['descriptionAliases']`. This covers the
  empty-first edge as well as the checked sibling-layout-effect rename.
- The observer installation, frontier read and diff execute synchronously without an application
  callback between them. An event already committed before start is found by the frontier diff; an
  event after subscription is handled by the normal observer. The production setup-race test
  deterministically commits an alias rename in an earlier sibling layout effect and publishes the
  current exact alias once after reconciliation
  (`tests/integration/description-alias-lookup-lifecycle.test.tsx:362-434`).
- Store replacement follows `props.doc` identity. The layout-effect disposer is bound to the exact
  returned subscription and stops it on document replacement or provider unmount
  (`context.tsx:113-117, 130-134`). Consumer churn cannot create duplicates.

### Actual-provider counter and teardown proof

- The real-provider zero-consumer test uses 500 real aliases and 500 legal one-hop symlinks. Three
  local transaction edits and one aligned remote transaction import while all alias consumers are
  absent perform 0 conversions / 0 lookup builds / 0 options builds; remount reuses the exact legal
  collection. The newly mounted lookup/options naturally construct once. A local rename and a remote
  alias insertion in separate absent-consumer intervals each do no eager work and remount with the
  current exact result at exactly 1 conversion / 1 lookup / 1 options build
  (`description-alias-lookup-lifecycle.test.tsx:201-360`).
- The retained continuously mounted matrix performs 0/0/0 work for repeated local transaction edits,
  transaction insertion and a remote/import-style transaction update. Local rename, Undo, Redo and
  remote alias insertion each perform exactly 1/1/1 work and preserve correct IDs, names, options,
  backlinks and group counts (`description-alias-lookup-lifecycle.test.tsx:549-770`).
- The empty provider publishes its first alias with one conversion and one lookup build
  (`description-alias-lookup-lifecycle.test.tsx:148-199`). The legal collection changes exactly when
  required.
- Observer accounting starts with the inherited Mirror observer plus one task observer. Four
  consumer unmount/remount cycles leave subscription/release counts unchanged; document replacement
  releases exactly the old task observer and starts one on the new document; final unmount releases
  the new task observer. A late remote alias import after disposal invokes that callback zero times
  and causes 0/0/0 lifecycle work (`description-alias-lookup-lifecycle.test.tsx:436-547`).
- The public boundary remains legal: `ApplicationVaultState` omits raw aliases, generic selectors
  cannot expose the wire union, and `useDescriptionAliases()` returns only the cached
  `DescriptionAliasCollection` through `useSyncExternalStore` (`context.tsx:142, 287-299`). There is
  no polling, permanent rescan, post-rescan interning or test-only production hook.

## Cumulative behavior, interaction and scale audit

- P11A's legal real/symlink union, one-hop O(1) resolution, exact normalization, deterministic
  duplicate-name behavior, backlink conservation, named atomic actions, single Undo grouping,
  convergence repair and raw-wire isolation remain intact.
- P11B's one-click native input, caret placement, lazy active-cell-only autocomplete, no initial
  option selection, arrow/Enter/Escape behavior, exact/new creation, shared-change/remove modal,
  focus restoration, imported tooltip and manual alias-only storage remain green.
- Management CRUD, import/manual, exact/new/single/shared change/remove, refresh, Undo/Redo,
  duplicate-tab, offline/reconnect and independent-peer conflict journeys passed with retries
  disabled. Remote management work survives local Undo and stale Redo follows Q-017.
- The shared lookup remains one linear construction with O(1) row resolution. The virtualizer keeps
  its normal bounded range plus at most one focused row; the repeated 500-row browser journey
  retained focus/caret, lazy suggestion mounting, filtering/navigation and bounded DOM. The
  10,000-alias pure lookup and 2,000-row/500-row cumulative scale gates remain green.
- No cumulative privacy or security regression was found. Imported raw descriptions remain
  immutable, manually added transactions retain no raw description, and the server/transport/auth/
  crypto boundary is untouched by revision 03.

## Independent automated validation

| Check                                                            | Independent result                                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Focused P11C set, three separate processes                       | PASS each run, 6 files / 25 tests; existing non-failing React `act(...)` warnings were emitted by production-action integration tests. |
| `pnpm test`                                                      | PASS, 58 files / 1,237 tests.                                                                                                          |
| `pnpm lint`                                                      | Exit 0, 0 errors / 10 disclosed warnings, including TanStack Virtual's compiler warning.                                               |
| `pnpm typecheck`                                                 | PASS.                                                                                                                                  |
| `pnpm build`                                                     | PASS, production build / 17 routes.                                                                                                    |
| Scoped `oxfmt --check` over both revision-03 paths               | PASS.                                                                                                                                  |
| `git diff --check BASE..HEAD`                                    | PASS.                                                                                                                                  |
| Description-alias E2E, `--workers=1 --retries=0 --repeat-each=3` | PASS, 15/15 in 2.1 minutes.                                                                                                            |
| Large transaction E2E, `--workers=1 --retries=0 --repeat-each=3` | PASS, 3/3 in 1.4 minutes.                                                                                                              |
| Full E2E, `--workers=1 --retries=0`                              | PASS, 87/87 in 5.4 minutes.                                                                                                            |

The full E2E emitted only existing intentional auth/offline/realtime diagnostics and no test failed;
no retry masked a result. Repository-wide `pnpm format:check` remains inherited red only on the
seven disclosed ledger/scratch files (`DECISIONS`, `DEPENDENCIES`, `HANDOFF`, `PROGRESS`,
`QUESTIONS`, `RISKS` and `human-scratch`); both revision-03 paths pass the scoped formatting gate.

## Independent installed-CLI manual evidence

- Used only repository-installed `pnpm browser` against the real Next application and local
  Supabase/realtime stack. A second tab opened through the rendered browser inherited the same
  authenticated origin/session. The server secret remained in-process and no recovery phrase or
  secret was printed or revealed.
- Exact review-02 reproduction now passes: Tab A rendered and cached `After Gap`, then used the
  rendered sidebar link to navigate to **Accounts**, leaving no alias consumer while retaining the
  provider/document. Tab B renamed the alias to `During Gap`; both tabs were online and **Saved**. A
  `MutationObserver` installed on Tab A before its rendered sidebar return recorded the complete
  first-commit alias sequence as exactly `[During Gap]`. The final page had current count 1 and
  stale count 0 without a reload.
- A subsequent reload retained `During Gap` and alias count 1. The deterministic accessibility
  snapshot exposed the **Tx Descriptions** level-one heading, **Description Aliases** level-two
  heading, **Add Alias**, **Edit** and **Delete** buttons, both online peers and **Saved** status.
- At 390×844 in dark/reduced-motion mode and at 1,440×900 with 200% document zoom, the heading and
  Add Alias control remained visible and document width equalled viewport width. Console inspection
  returned zero errors and zero warnings. All inspected current product requests completed with
  HTTP 200.
- Deleted the sole disposable alias through rendered **Delete** then **Confirm delete**. The final
  UI showed alias count 0 and **Saved**; no transaction was created. Closed/deleted the CLI session
  and verified `pnpm browser list` reports no browsers.

## Questions and risk adjudication

No new policy ambiguity requires a Q proposal. Q-016 trim-plus-NFC, case-sensitive matching and
Q-017 stale-intent non-resurrection remain consistently implemented.

- R-006/R-028/R-030/R-031: legal graph, atomic action, history, raw privacy and two-peer convergence
  passed independently.
- R-008: closed for P11C. Unrelated notifications do not rebuild the alias semantic layer, and the
  provider-lifetime observer plus frontier reconciliation closes zero-consumer and setup windows
  without surviving provider/document disposal.
- R-009: full E2E passed 87/87 independently; existing cross-package risk ownership is unchanged.

## Boundary, frozen-source and cleanup verification

- Final product/test HEAD remained exactly `daab038ee741faa9f92a373b27efe0c8fe8940db`; the index
  remained empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P11C/implementation-03.md`.
- Scratch remains SHA-256 `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350
  lines / 24,245 bytes. All 21 ordered blocks normalize byte-for-byte to SCOPE; the checked set is
  exactly HS-002/HS-006/HS-010/HS-014/HS-017/HS-018. HS-004 remains unchecked.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes with 22 requirements.
- The coordinator stopped the task-owned dev server; port 3000 is closed and no task-owned Next,
  Playwright-test or CLI browser process remains. Removed exact generated `.playwright-cli`,
  `test-results`, `playwright-report` and `.next` directories and restored generated `next-env.d.ts`
  byte-for-byte.
- This review artifact is the sole reviewer-authored path and is intentionally uncommitted. I made
  no product, test, evidence, ledger, source, marker, configuration or prior-review edit.

## Single final verdict

**PASS.** P11C revision 03 satisfies the integrated behavior, stable lookup, zero-consumer,
render-to-subscribe, disposal, interaction, concurrency, privacy and scale acceptance required for
HS-004. Root may persist this exact review/evidence and complete the normal P11C integration gate.
HS-004 must remain unchecked until P11A, P11B and this P11C PASS are integrated and root performs
the authorized marker-only completion procedure.

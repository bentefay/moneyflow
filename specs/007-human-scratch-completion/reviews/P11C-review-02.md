# P11C Independent Review — Revision 02

## Review identity and verdict

- Package / requirement / revision: `P11C` / `HS-004` integrated completion checkpoint / `02`.
- Literal cumulative reviewed range:
  `0426866fa66cc022efca6d74cd5088d586d3d11b..258f22af06c8a00b00d09f30c33f85f82377bc13`.
- Frozen implementation evidence: `evidence/P11C/implementation-02.md`, SHA-256
  `b1327d9cf6cc5b04ecc887fc5b8a545cbe4b5fa8834da709f52111c7c5be8e94`, 172 lines / 13,015 bytes.
- Revision 02 changes exactly the two authorized product/test paths in HANDOFF: 504 insertions and 9
  deletions. The cumulative range contains 22 paths, 1,973 insertions and 185 deletions.
  `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** Revision 02 fixes the prior full alias conversion/index rebuild on unrelated
  notifications while an alias consumer is mounted. Its subscription teardown, however, creates a
  missed-event window: an alias mutation while no alias hook is mounted leaves the retained legal
  collection and lookup stale when a consumer remounts. The real two-tab application reproduced the
  stale UI after successful remote sync. HS-004 must remain unchecked. Root must request revision 03
  and preserve this failed review as immutable.

## Findings

### F-01 — BLOCKING: alias events are missed while the last consumer is unmounted

The new provider-scoped revision store correctly filters document events to `descriptionAliases`,
caches one legal alias collection per revision, and avoids alias conversion and dependent
lookup/options construction for transaction-only notifications. Its zero-listener teardown makes
that cache incorrect:

1. The store retains both `revision` and `cached` for the lifetime of the `VaultProvider`
   (`src/lib/crdt/context.tsx:53-70`).
2. The document observer is installed only when the first hook consumer subscribes
   (`src/lib/crdt/context.tsx:74-82`).
3. Cleanup for the last consumer removes that observer but neither invalidates the cache nor records
   document changes during the unobserved interval (`src/lib/crdt/context.tsx:83-88`).
4. A later consumer therefore reads the unchanged revision and `getAliases()` returns the retained
   collection at line 68 even if `descriptionAliases` changed while the observer was absent.

This is a correctness failure, not merely a transient synchronization delay. I reproduced it through
the rendered real application using repository-installed browser CLI, two authenticated tabs and
sidebar client navigation:

1. Tab A rendered and cached alias `After Gap` on **Tx Descriptions**.
2. Tab A navigated with the rendered sidebar link to **Accounts**, unmounting all alias consumers
   while retaining the same provider/document.
3. Tab B renamed the alias to `During Gap`; the UI reached **Saved** and Tab A remained online and
   saved.
4. Tab A navigated back with the rendered sidebar link. It incorrectly rendered stale `After Gap`.
5. A hard reload of Tab A immediately rendered durable `During Gap`, proving persistence and remote
   synchronization had succeeded and isolating the defect to the retained semantic cache.

The revision test covers empty-first insertion, local and remote transaction-only events, local
rename, Undo/Redo and a remote alias insertion with the hook continuously mounted
(`tests/integration/description-alias-lookup-lifecycle.test.tsx:147-423`). It unmounts only during
final cleanup at lines 419-422. It never caches aliases, unmounts every alias consumer, applies an
alias event, and remounts. Thus all conversion/build counters can remain green while the production
UI returns a stale legal collection.

This violates HANDOFF's explicit setup/teardown and “no missed alias-bearing event” acceptance gate.
It can affect local, remote, imported, Undo or Redo alias changes whenever route/layout composition
temporarily has no alias consumer.

#### Required revision-03 remediation and acceptance

- Eliminate the unobserved alias-event window. A provider/document-lifetime observer with explicit
  teardown on provider/doc disposal is acceptable. Another design is acceptable only if remount
  cannot reuse stale aliases and cannot miss an event between render and subscription setup.
- Preserve the revision-02 wins: non-alias local and remote notifications must perform zero legal
  conversions, lookup builds and dependent option builds; every alias-bearing local, remote, Undo
  and Redo event must publish exactly one current legal collection and rebuild each dependent once.
- Add an actual-context regression that mounts the real `VaultProvider` and hooks, populates and
  caches a large legal graph, unmounts all alias consumers without replacing the provider/doc,
  mutates aliases locally and remotely during that interval, then remounts. The first committed UI
  state must contain the current aliases/lookup/options with exactly one rebuild, and subsequent
  non-alias activity must remain at zero.
- Exercise the render-to-subscribe boundary or otherwise prove an alias event in that setup window
  cannot be lost. Verify cleanup does not leak a document subscription after provider/doc disposal.
- Retain empty-first insertion, post-rescan caching, raw-wire isolation, legal-graph behavior,
  one-action/operation/Undo semantics and the complete revision gate matrix.

No other blocking product finding was found in the cumulative range.

## Integrated behavior and invariant audit

- While at least one alias consumer remains subscribed, the revision store observes actual document
  events, filters semantically by top-level `descriptionAliases`, converts the raw record only after
  an alias revision and reuses the same legal collection otherwise. The large actual-context test
  independently passed zero-work local and remote transaction notifications and exact-one local
  rename, Undo, Redo and remote alias insertion.
- The raw wire union remains private. `ApplicationVaultState` omits `descriptionAliases`, public
  selectors cannot expose the raw record, and alias consumers receive only
  `DescriptionAliasCollection`.
- Empty-provider first insertion is covered through the production provider/hooks and passed. The
  legal lookup still provides deterministic exact-name/ID resolution, legal backlink traversal and
  precomputed group counts without per-row whole-map scans.
- P11B interaction, native input, lazy autocomplete, plan/commit, focus restoration and alias-only
  manual storage gates remain green. The virtualizer retains a bounded normal range plus at most one
  focused index.
- The real-Mirror conflict/history matrices and changed two-tab browser cases remain green: remote
  management work survives local Undo, stale Redo is invalidated under Q-017, imported raw
  descriptions remain immutable, and repaired replicas converge legally.
- F-01 is specifically a provider/hook setup-teardown correctness defect. The green continuously
  mounted behavior and performance evidence do not waive it.

## Independent automated validation

| Check                                                            | Independent result                                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Focused P11C set, three separate processes                       | PASS each run, 6 files / 22 tests; existing non-failing React `act(...)` warnings were emitted by production-action integration tests. |
| `pnpm test`                                                      | PASS, 58 files / 1,234 tests.                                                                                                          |
| `pnpm lint`                                                      | Exit 0, 0 errors / 10 disclosed warnings, including TanStack Virtual's compiler warning.                                               |
| `pnpm typecheck`                                                 | PASS.                                                                                                                                  |
| `pnpm build`                                                     | PASS, production build / 17 routes.                                                                                                    |
| Scoped `oxfmt --check` over both revision-02 paths               | PASS.                                                                                                                                  |
| `git diff --check BASE..HEAD`                                    | PASS.                                                                                                                                  |
| Description-alias E2E, `--workers=1 --retries=0 --repeat-each=3` | PASS, 15/15 in 2.0 minutes.                                                                                                            |
| Large transaction E2E, `--workers=1 --retries=0 --repeat-each=3` | PASS, 3/3 in 1.3 minutes.                                                                                                              |
| Full E2E, `--workers=1 --retries=0`                              | PASS, 87/87 in 5.4 minutes.                                                                                                            |

The full E2E emitted expected intentional offline/auth/realtime diagnostics from existing journeys,
including failed-fetch and unauthenticated-request logs, but no test failed. No retry masked any
result. Repository-wide `pnpm format:check` remains inherited red only on the seven disclosed ledger
and scratch files (`DECISIONS`, `DEPENDENCIES`, `HANDOFF`, `PROGRESS`, `QUESTIONS`, `RISKS` and
`human-scratch`); both revision-02 product/test paths pass the scoped formatting gate.

## Independent installed-CLI manual evidence

- Used only repository-installed `pnpm browser` against the real Next application and local
  Supabase/realtime stack. The second tab was opened from the first with rendered-browser JavaScript
  and inherited the authenticated origin/session. The local server secret remained in-process; no
  secret or recovery phrase was printed or revealed.
- The two-tab sidebar-navigation sequence above reproduced F-01 with both tabs online and saved. The
  immediate hard-refresh correction distinguishes stale provider cache from server persistence,
  delayed sync or a failed remote operation.
- The disposable alias was deleted through its rendered **Delete** and **Confirm** controls. The
  final management view showed zero active aliases and no disposable transaction was seeded.
- Stopped the task-owned dev server, closed the CLI session and verified `pnpm browser list` reports
  no browsers.

## Questions and risk adjudication

Q-016 trim-plus-NFC, case-sensitive matching remains consistent. Q-017 stale-intent non-resurrection
behavior remains green. No new product-policy ambiguity needs a Q proposal: F-01 is a direct
lifecycle violation of explicit HANDOFF acceptance criteria.

- R-006/R-028/R-030/R-031: legal graph, atomic action, history, raw privacy and two-peer behavior
  remain green independently.
- R-008: the prior unrelated-notification rebuild is remediated while observed, but setup/teardown
  can now return a stale alias index after a missed event; the risk therefore remains blocking.
- R-009: full E2E passed 87/87 independently; existing cross-package risk ownership is unchanged.

## Boundary, frozen-source and cleanup verification

- Final product/test HEAD remained exactly `258f22af06c8a00b00d09f30c33f85f82377bc13`; the index
  remained empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P11C/implementation-02.md`.
- Scratch remains SHA-256 `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350
  lines / 24,245 bytes. HS-004 remains unchecked; the passed marker set remains
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes with 22 requirements.
- Stopped the task-owned dev server. No task-owned Next, Playwright-test or CLI browser process
  remains. Removed the exact generated `.playwright-cli`, `test-results`, `playwright-report` and
  `.next` directories and restored generated `next-env.d.ts` byte-for-byte.
- This review artifact is the sole reviewer-authored path and is intentionally uncommitted. I made
  no product, test, evidence, ledger, source, marker, configuration or prior-review edit.

## Single final verdict

**FAIL.** P11C revision 02 does not satisfy the no-missed-alias-event setup/teardown lifecycle
required for HS-004. Root must preserve this failed review, leave HS-004 unchecked and dispatch
revision 03 for F-01 remediation and exact-range re-review. All continuously mounted behavior,
performance, concurrency, privacy, virtualization and automated gates listed above are green but
cannot waive stale aliases after a zero-consumer interval.

# P12 Implementation Evidence — Revision 06

## Immutable dispatch boundary

- Package / requirement / revision: `P12` / `HS-005` / `06`.
- Literal cumulative BASE: `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
- Clean revision-06 pre-implementation HEAD:
  `a98b3b00a6858b40398531204633832790d59c5f`.
- Final revision-06 product/test HEAD:
  `9939d68cb6752f174c2fc60e4e815c7af52dd0d7`.
- Revision-06 range:
  `a98b3b00a6858b40398531204633832790d59c5f..9939d68cb6752f174c2fc60e4e815c7af52dd0d7`.
- Cumulative P12 review range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..9939d68cb6752f174c2fc60e4e815c7af52dd0d7`.
- Revision-06 contains two commits:
  - `8c83dd7c5d0294674a04d7837b64c1e39f816d64` —
    `Revoke stale maintenance authority`.
  - `9939d68cb6752f174c2fc60e4e815c7af52dd0d7` —
    `Tighten nested allocation counterexample`.
- The revision changes exactly three authorized paths, 288 insertions and 6 deletions:
  `src/lib/crdt/context.tsx`, `src/lib/crdt/maintenance.ts`, and
  `tests/integration/vault-maintenance.test.tsx`.
- This file was created before product/test edits, is the sole worker artifact and remains
  uncommitted for independent review. The index is empty. Root-owned unstaged `HANDOFF.md` and
  `PROGRESS.md` were present initially and remain preserved.
- This artifact records implementation and evidence only. It makes no PASS claim.

## Review-05 counterexamples

### Same-document scheduler replacement

- A real conflict fixture now gives every relocation source three root tags, two root allocations,
  one nested duplicate with two tags and two allocations, and runs the scheduler with
  `maxItems: 1`.
- Four parameterized cases stop only after the old shadow has consumed the exact value under test:
  root tag, root allocation, nested tag and nested allocation. The allocation cases wait until the
  iterator has left the copied entries, so iterator restart cannot accidentally repair the stale
  value.
- Each case disposes the scheduler, performs a direct Loro edit on the exact source CID without
  changing collection cardinality, commits with `user:edit`, remounts a scheduler on the same
  document and drains it.
- With the disposal revocation line deliberately absent, the final exact counterexample command was
  red in all four cases:
  - root tag: expected `changed-root`, received `one`;
  - root allocation: expected `26`, received `25`;
  - nested tag: expected `changed-nested`, received `nested-one`;
  - nested allocation: expected `41`, received `40`.
- Restoring disposal revocation made the same four-case command green. Every final assertion also
  proves that the old epoch is gone, no private shadow remains, and the edited public transaction
  contains the replacement value.

### Late revision-04 metadata delivery

- A real live `VaultProvider`/Loro document receives a revision-04-shaped
  `transactions.__moneyflow_gc_metadata__` account after initial construction. The fixture covers a
  marker-only update and a marker-plus-ordinary-transaction edit.
- Before remediation, the raw `useTransactions()` observer recorded the reserved account before a
  frame ran. The initial focused development run was red on both the immediate hook boundary and
  stale root/nested tag cases.
- The final fixture proves that the physical marker exists immediately after import, while every
  public hook observation excludes it. One scheduled frame then removes it with exactly one local
  repair update. The ordinary notes edit converges unchanged.
- Reimporting the same peer delta neither resurrects the marker nor emits a second cleanup update.

## Implementation architecture

### Revoked shadow/import authority

- Scheduler disposal now calls the existing document-scoped invalidator before clearing relocation
  allocation iterators.
- That invalidator removes the document from `acceptImportedTransactionShadows` and clears every
  trusted attached-shadow CID in `trustedTransactionShadows`. The disposed callback is already
  guarded and cancelled, so no callback from the prior scheduler generation can restore trust.
- A replacement owner therefore plans the persisted private shadow as untrusted, deletes it in one
  bounded list operation and rebuilds from the exact live source. Already-copied equal-cardinality
  tag/allocation values are never accepted merely because counts still match.
- Different-document reload behavior is retained: it already has no process-local trust. Imported
  maintenance-only shadow classification is retained for the lifetime of the active receiving
  scheduler and is now also revoked on its disposal.

### Bounded live legacy cleanup

- The scheduler initializes a private boolean from the physical reserved account and checks for the
  same account on every document event before maintenance-domain and alias predicates.
- Detection therefore schedules cleanup for marker-only imports independently of alias projection
  changes. The next visible frame performs at most one fixed root-map deletion and one
  `system:gc`/`__moneyflow_gc_commit_v1__` commit, then yields and reschedules existing imported
  classification/planning work.
- The cleanup commit is a normal local Loro update, so existing persistence/encrypted sync observes
  it. Once the key is absent, its own event cannot schedule another cleanup and duplicate delivery
  cannot echo-loop or resurrect it.
- `useTransactions()` memoizes a shallow omission only while the legacy key is present. Ordinary
  transaction-store identity is preserved when there is no marker, and the reserved account never
  crosses that raw public hook during the bounded frame window.
- No new CRDT root, schema field, metadata account, transport discriminator or unbounded scan was
  introduced. All cumulative private-shadow, query, mutation and alias-proof behavior is retained.

## Automated validation

- Final focused P12 profile passed in three separate clean Vitest processes:
  `maintenance.test.ts`, `transaction-mutations.test.ts`, `transaction-queries.test.ts`, and
  `vault-maintenance.test.tsx`; 4 files / 102 tests in each process.
- Final `pnpm test`: 60 files / 1,275 tests passed.
- Final `pnpm typecheck`: clean.
- Final `pnpm lint`: exit 0 with the inherited 10 warnings and no errors.
- `pnpm build`: Next 16.2.10 compiled, type generation passed, static generation passed and all 17
  routes built.
- Changed-path `oxfmt --check` passed for all three revision-06 paths. `git diff --check` passed.
- Repository `pnpm format:check`: **FAIL** only on twelve control/frozen/evidence files:
  `DECISIONS.md`, `DEPENDENCIES.md`, root-owned `HANDOFF.md` and `PROGRESS.md`, `QUESTIONS.md`,
  `RISKS.md`, frozen `implementation-03.md`, `implementation-04.md`, `implementation-05.md`,
  this uncommitted `implementation-06.md`, frozen `P12-review-05.md`, and
  `specs/human-scratch.md`. No revision-06 product/test path failed formatting.
- Affected no-retry browser matrix used the exact four retained journeys at
  `description-aliases.spec.ts:305`, `description-aliases.spec.ts:403`,
  `transactions.spec.ts:139`, and `tab-duplication.spec.ts:49`, with
  `--repeat-each=3 --workers=1 --retries=0 --reporter=dot`: 12/12 passed in 2.9 minutes.
- Full no-retry browser suite with `--workers=1 --retries=0 --reporter=dot`: 87/87 passed in 5.4
  minutes. Browser automation ran at product commit `8c83dd7`; the final commit changes only the
  integration counterexample's nested-phase predicate. The final focused x3, full Vitest and
  typecheck were repeated after that test-only commit.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-impl-06`. No MCP, `npx`, temporary test/config, headed/UI/debug/show/pause mode or arbitrary
  sleep was used.
- The first dev-server launch omitted the server-only local Realtime JWT and produced two
  `realtime.authorize` 500 responses. This setup red is reported exactly. The server was restarted
  with the secret derived in-memory from the running local Realtime container without printing or
  persisting it; all subsequent authorize/revoke requests were 200.
- Created a fresh identity while all twelve recovery words remained masked. They were never
  revealed, copied, read, entered or printed. The authenticated vault exposed accessible
  `My Vault`, owner, online presence and `Saved` status.
- Created `P12 Manual` for `12.34` through named transaction controls. Reload preserved one row,
  its `7/24` date and amount. While offline, keyboard-edited the amount to `14.56`; the accessible
  status became `Saving...`. Reconnect reached `Saved`, the failed offline push retried with 200,
  and reload preserved `14.56`.
- A second visible tab navigated to the accessible `Welcome Back` / Unlock page because the vault
  key is tab-local. It was closed without revealing or entering recovery material.
- The Imports route exposed the named `Import new file` chooser. A checked-in non-financial
  `package.json` was selected only to close the chooser; no import or financial test fixture was
  created.
- At 390 × 844 with dark and reduced-motion preferences, the named menu/history/filter controls,
  transaction row and amount remained represented; `innerWidth`, client width and scroll width
  were all 390, and reduced-motion matched. The body background remained `lab(100 0 0)` under dark
  preference, the inherited theme limitation already routed to P20A/P20B.
- At 200% page scale on a 1,280 px viewport, inner/client/scroll widths were all 1,280 and the row
  remained in the accessibility snapshot. The small clear-search target was intercepted by the
  input/container at that scale. This inherited zoom observation is disclosed and was not expanded
  into revision-06 UI scope.
- A manual debounced search observation showed `0 transactions (filtered)` for the exact visible
  description. This observation is disclosed rather than hidden; checked-in T040 explicitly tests
  description and notes search and passed in the final full no-retry suite. Revision-06 does not
  change search/query UI behavior.
- Final CLI console inspection returned zero error-level messages. Request history retained only
  the disclosed initial JWT setup 500s and expected `ERR_INTERNET_DISCONNECTED` requests from
  explicit offline emulation; subsequent sync, Realtime and navigation requests were 200.
- Normal UI cannot manufacture duplicate physical buckets, pause a shadow at an exact item
  boundary or inject revision-04 metadata. Those decisive conditions are covered by real-Loro
  deterministic integration tests.

## Boundary, cleanup and frozen checks

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246
  bytes, with HS-005 unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441
  bytes.
- `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382
  bytes.
- Frozen revision-05 evidence remains SHA-256
  `146a1cc4df55e5aa1bbfab922861ed069e7c5a7f55585f4a8f852d7cb6794ba5`, 171 lines / 11,731
  bytes. Failed review-05 remains SHA-256
  `a54ea0b726d157fabab1b3d59a3f2ca84391cfc9ff0560b48a20e08296e8326a`, 196 lines / 14,376
  bytes.
- Frozen revision-04 evidence remains SHA-256
  `8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`; failed review-04 remains
  SHA-256 `0a97f910124dfbde35243a1d736337dc14179709108f2cb4c5df3d89cefcce49`.
- CLI session `p12-impl-06` was closed and `delete-data` reported no residual user data. Only this
  run's timestamped `.playwright-cli` files were moved to desktop trash; pre-existing files were
  preserved. Generated `test-results/` was moved to desktop trash. These items are recoverable.
- Generated `next-env.d.ts` drift was restored. Port 3000 is closed and no worker-owned
  Playwright, CLI browser or dev-server process remains.
- Final worktree entries are exactly root-owned modified `HANDOFF.md` and `PROGRESS.md` plus this
  untracked evidence artifact. The index is empty.
- No new `Q-*` proposal is needed. Review-05's cancellation/restart and live legacy cleanup
  rejection conditions are explicit and required no new product decision.


# P12 Implementation Evidence — Revision 07

## Immutable dispatch boundary

- Package / requirement / revision: `P12` / `HS-005` / `07`.
- Literal cumulative BASE: `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
- Clean revision-07 pre-implementation HEAD: `bebf4f546c8a7715934adbafd757dfdcd27dec91`.
- Final revision-07 product/test HEAD: `ebe2fb6caf70acbdb88245cf3121f8c6356b1162`.
- Revision-07 range:
  `bebf4f546c8a7715934adbafd757dfdcd27dec91..ebe2fb6caf70acbdb88245cf3121f8c6356b1162`.
- Cumulative P12 review range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..ebe2fb6caf70acbdb88245cf3121f8c6356b1162`.
- Revision-07 has one commit: `ebe2fb6caf70acbdb88245cf3121f8c6356b1162` —
  `Sanitize generic vault transaction selectors`.
- The revision changes exactly two authorized paths, 304 insertions and 8 deletions:
  `src/lib/crdt/context.tsx` and `tests/integration/vault-maintenance.test.tsx`.
- This artifact was created before product/test edits, is the sole worker artifact and remains
  uncommitted for independent review. The index is empty. Root-owned unstaged `HANDOFF.md` and
  `PROGRESS.md` were present initially and remain preserved.
- This artifact records implementation and evidence only. It makes no PASS claim.

## Review-06 F-07 counterexamples

### Generic selector boundary

- The existing malformed-private-parent fixture now also places a private nested child under a
  public parent and observes the complete generic transaction store with
  `useVaultSelector((state) => state.transactions)`.
- Before the generic projection, the focused run was red: expected public parent IDs
  `["source-parent"]`, but the observation also contained
  `__moneyflow_gc_shadow__:legacy...private-parent`. The new nested assertion likewise established
  the required boundary: only `source-parent-nested` and `nested-public` may be visible.
- The existing late legacy-marker fixture now records state at the caller-selector boundary and
  through direct transaction selection, whole-state selection, object spread,
  `Reflect.getOwnPropertyDescriptor`, direct reserved-key selection and `useTransactions()`.
- The initial development run had three failures: the malformed generic parent leak above and both
  late-marker cases blocked by the test fixture's missing `VaultUndoProvider`. The real consumer
  fixture was corrected to include the production Undo provider. The marker remains physically in
  the Loro root before a frame, while every caller-visible shape is asserted clean in that same
  notification.

### Named production consumers

- Parameterized actual-context tests mount the real `PeopleTable`, `StatusesTable` and `TagsTable`
  beneath `VaultProvider` and `VaultUndoProvider`.
- People and tags are seeded through the real mirror so all three components execute their
  `getAllTransactions` transaction-dependent path.
- Each live provider imports a revision-04 legacy marker. The test proves the marker is still a
  physical `LoroMap` before scheduled cleanup, the consumer is notified, and every transaction store
  reaching the real query helper excludes the reserved account.

## Implementation architecture

### Sanitized application-state projection

- `useVaultSelector` now invokes every caller selector with a cached application-state `Proxy`
  instead of the raw mirror state.
- The proxy sanitizes `transactions` in its `get` trap and descriptor-based reads in its
  `getOwnPropertyDescriptor` trap. This covers direct access, whole-state return, object spread,
  descriptor lookup and reserved-key lookup before caller code can inspect raw transaction state.
- Non-transaction properties are returned directly from the raw state. Selectors for accounts,
  people, statuses and tags therefore retain the exact object identity and do not scan the
  transaction graph.
- The projected state proxy is cached per raw `VaultState`, and the public transaction store is
  cached per raw transaction-store snapshot. Multiple hooks/selectors in one notification reuse the
  same identities and projection.

### Recursive private-data boundary

- Projection removes the revision-04 reserved metadata account before exposing the store.
- Every account tree is traversed to remove private maintenance-shadow parents and private nested
  children. Classification reuses the schema's canonical maintenance-shadow identity helper and
  existing `isPublicTransaction` rule.
- Unchanged parents, day/month/year nodes, account trees and the complete transaction store retain
  their identities. Only paths containing private data are shallowly rebuilt.
- `useTransactions()` remains the revision-06 defensive boundary and receives the same cached
  projected store, preserving its prior API and identity behavior. `useTransaction` and every other
  specialized hook continue to compose through the generic boundary and retain their cumulative
  recursive filtering.

### Work unit and lifecycle

- Projection is lazy: an unrelated selector does no transaction traversal. The first transaction
  read for a raw store performs one finite graph projection; all later reads of that snapshot use
  the `WeakMap` result.
- This read projection does not mutate the CRDT, add a root/schema field, schedule work or change
  Undo/sync semantics. The revision-06 scheduler still owns physical deletion on its next bounded
  frame and emits the same single `system:gc` cleanup update.
- The caller receives the sanitized projection in the original document notification, before that
  frame. Duplicate delivery still cannot resurrect the marker, and an ordinary domain edit in the
  same peer update remains unchanged after cleanup.

## Acceptance and retained-behavior mapping

- F-07 caller-before-selector invariant: generic selector input-side effects plus direct, whole,
  spread, descriptor and reserved-key shapes in `vault-maintenance.test.tsx`.
- Named consumers: actual `PeopleTable`, `StatusesTable` and `TagsTable` mounts, with real
  transaction-query invocation after live marker import.
- Reserved/private account, parent and nested-child invisibility: late-marker and malformed-tree
  integration cases inspect both public projection and raw physical Loro state.
- Same notification before cleanup: raw Loro marker presence is asserted before the frame host
  drains, after all public observations have been recorded clean.
- Identity/subscription stability: named/generic stores are identical; unrelated state references
  are identical and the unrelated selector component does not rerender for marker-only import.
- Retained lifecycle: the expanded marker-plus-domain test still requires exactly one cleanup
  update, preserves the ordinary notes edit and proves duplicate import does not resurrect or emit
  another cleanup update.

## Automated validation

- Final focused P12 profile passed in three separate Vitest processes: `maintenance.test.ts`,
  `transaction-mutations.test.ts`, `transaction-queries.test.ts`, and `vault-maintenance.test.tsx`;
  4 files / 105 tests in every process.
- Final `pnpm test`: 60 files / 1,278 tests passed.
- Final `pnpm typecheck`: clean.
- Final `pnpm lint`: exit 0 with the inherited 10 warnings and no errors.
- `pnpm build`: Next 16.2.10 compiled, type generation and static generation completed, and all 17
  routes built.
- Changed-path `oxfmt --check` passed for both revision-07 paths.
- Revision-only
  `git diff --check bebf4f546c8a7715934adbafd757dfdcd27dec91..ebe2fb6caf70acbdb88245cf3121f8c6356b1162`
  passed. Cumulative `git diff --check` reports only the frozen revision-06 evidence's line 191
  blank-at-EOF finding; revision-07 has no authority to edit that committed artifact.
- Repository `pnpm format:check`: **FAIL** only on thirteen control/frozen files: `DECISIONS.md`,
  `DEPENDENCIES.md`, root-owned `HANDOFF.md` and `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, frozen
  `implementation-03.md`, `implementation-04.md`, `implementation-05.md`, `implementation-06.md`,
  frozen `P12-review-05.md`, frozen `P12-review-06.md`, and `specs/human-scratch.md`. Neither
  revision-07 product/test path nor this evidence artifact failed formatting.
- Affected no-retry browser matrix covered the retained journeys at
  `description-aliases.spec.ts:305`, `description-aliases.spec.ts:403`, `transactions.spec.ts:139`,
  `tab-duplication.spec.ts:49`, and `tags.spec.ts:117`, with
  `--repeat-each=3 --workers=1 --retries=0 --reporter=dot`: 15/15 passed in 3.1 minutes.
- Full no-retry browser suite with `--workers=1 --retries=0 --reporter=dot`: 87/87 passed in 5.4
  minutes.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-impl-07`. No MCP, `npx`, temporary test/config, headed/UI/debug/show/pause mode or arbitrary
  sleep was used.
- The local Realtime JWT was derived in-memory from the running local container and supplied only to
  the dev-server process. It was neither printed nor persisted.
- Created a fresh identity while all twelve recovery words remained masked. They were never
  revealed, copied, read, entered or printed. The authenticated vault exposed accessible `My Vault`,
  owner, online presence and `Saved` state.
- Created `P12 selector charter` for `42.50` with the named transaction controls and default `7/24`
  date. Reload preserved one accessible transaction row, date, description and amount.
- With the browser context offline, keyboard-edited the description to
  `P12 selector charter offline` and blurred the field. Reconnect plus reload preserved the edit,
  showed online presence and returned to `Saved`.
- Navigated the actual People, Tags and Statuses routes. Their snapshots exposed the expected
  accessible level-one headings, People count `(1)`, Tags empty state `(0)`, and default
  `For Review`/`Paid` statuses without any maintenance-only row or account.
- An initial multi-page command timed out waiting for the transaction row because a directly created
  second page reached the Unlock route: key material is tab-local. No recovery material was revealed
  or entered. A user-opener duplicated authenticated tab then loaded the transaction row; an edit in
  the first tab to `P12 two-tab update` appeared in the second tab through live synchronization
  before it was closed.
- At 390 × 844, dark preference, reduced motion and 200% page zoom, the responsive header,
  `Open menu`, history controls, transaction filters and complete row remained represented by
  accessible role/name. A document-level horizontal overflow was also observed at that combined
  viewport/zoom. This inherited non-UI reflow limitation is disclosed for P20A/P20B and was not
  expanded into the narrow generic-selector remediation.
- The first immediate exact-description search snapshot showed `0 transactions (filtered)` before
  the debounced result settled. This inherited observation is disclosed; the checked-in search
  journey passed in the final no-retry suite, and revision-07 changes no search behavior.
- Final CLI console inspection returned zero error-level messages. Navigation, vault, sync and
  Realtime requests were 200. Two `sync.pushOps` requests had no terminal status because explicit
  offline emulation interrupted them; later push/authorize requests completed with 200.
- Normal UI cannot inject the physical revision-04 reserved account or malformed private parent/
  nested tree while pausing the cleanup frame. Those decisive conditions use real Loro documents in
  the deterministic actual-context integration tests.

## Boundary, cleanup and frozen checks

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines / 24,246 bytes, with
  HS-005 unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes.
- Frozen revision-06 evidence remains SHA-256
  `08ca7c17f64371f1f6c06ef1b8593cee035477f5b8a8dfb09431ec40b59a177c`, 191 lines / 12,326 bytes.
  Failed review-06 remains SHA-256
  `a6182d430b761fd57c0ebd5ce08045811e952979303ab59b74afa885d8a8693e`, 165 lines / 11,879 bytes.
- CLI session `p12-impl-07` was closed and `delete-data` reported no residual user data. Only this
  run's timestamped `.playwright-cli` files were moved to desktop trash; the pre-existing revision-
  06 files were preserved. Generated `test-results/` was moved to desktop trash. These items are
  recoverable.
- Generated `next-env.d.ts` drift was restored. Port 3000 is closed and no worker-owned Playwright,
  CLI browser or dev-server process remains.
- Final worktree entries are exactly root-owned modified `HANDOFF.md` and `PROGRESS.md` plus this
  untracked evidence artifact. The index is empty.
- No new `Q-*` proposal is needed. F-07's exported generic boundary is explicit and required no new
  product decision.

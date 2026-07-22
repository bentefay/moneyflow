# P12 Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package/scope/revision: `P12` / `HS-005` bounded background GC worker / `01`.
- Original cumulative BASE and clean pre-implementation HEAD:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
- Sole writable worker artifact:
  `specs/007-human-scratch-completion/evidence/P12/implementation-01.md`, created before product or
  test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Root ledgers, prior artifacts/reviews, frozen sources, SCOPE, configuration and unrelated
  product/tests remain immutable.

## Implementation plan

1. Add red deterministic planner/scheduler regressions for bounded frames, cancellation/resume,
   bucket conflicts, alias reference rewrites, hard-delete races, origins and convergence.
2. Implement pure resumable discovery plus narrow apply-time-revalidated CRDT mutations.
3. Own one provider/document requestAnimationFrame scheduler with visibility and lifecycle control.
4. Run focused repeats, full automation/E2E, installed-CLI manual charter and exact cleanup.
5. Commit only authorized product/test paths and complete this uncommitted evidence without a PASS
   claim.

## Status

Implementation and validation are complete at worker commit
`f9edda60afc946ddda927616a16435a075167d7c`. This worker makes no PASS claim; the immutable range and
evidence remain for independent review.

## Counterfactual reds

- Before any product/test implementation, the exact focused command
  `pnpm exec vitest run tests/unit/crdt/maintenance.test.ts --reporter=verbose` failed at module
  resolution because `@/lib/crdt/maintenance` did not exist. This establishes the scheduler/planner
  counterfactual rather than retrofitting assertions to existing behavior.
- The first concurrent-bucket implementation exposed a real representation red: year/month/day
  `$cid` values are absent from Mirror output, so plans using those values relocated only one child.
  Numeric bucket positions plus transaction identity and full apply-time revalidation fixed that red
  without pretending bucket IDs exist.
- The first two-peer property run minimized a product convergence red to examples including
  `[[0],[31,32]]`, `[[0],[31,32,45]]` and `[[0],[32,31,33]]`. A single commit that removed an
  attached transaction from one conflict list and inserted it into another could also produce a Loro
  index-bound failure. The final algorithm copies one serializable child in one commit, proves an
  identical earlier copy, and removes the now-redundant adjacent container in a later commit.
  Concurrent identical copies are deterministically deduplicated. The conservation/convergence
  property was not weakened.
- The first full browser run was 85/87 and exposed two genuine lifecycle reds: immediate collection
  of a symlink created in the mounted session invalidated atomic undo, and raced a remote tombstone
  in duplicate tabs. A provider-session safety barrier now defers alias rewrite/delete for aliases
  changed locally or remotely during that mount; a remount performs the fresh proof. Both exact
  browser regressions then passed 2/2 and the final full run passed 87/87.

## Architecture, budgets and lifecycle

- `src/lib/crdt/maintenance.ts` separates immutable, pure one-item discovery from narrow mutation.
  The cursor explicitly records phase, frozen account/alias key sets, and every nested position;
  interrupted frames resume without a hidden iterator or wall-clock sleep.
- The default frame budget is exactly 32 discovery items and 4 measured milliseconds. Each
  structural mutation yields immediately and restarts discovery against fresh Mirror state. The
  large deterministic fixture contains 256 conflict transactions, completes over multiple frames,
  and records `maxProcessed <= 32`.
- The phase order is transactions, duplicate days, duplicate months, duplicate years, aliases, done.
  Only adjacent equal bucket containers are removed. Work restarts for relevant local/remote
  transaction or alias changes and ignores its own `system:gc` document events.
- `VaultProvider` owns exactly one scheduler under the inner Loro provider. Replacement/unmount
  cancels the exact pending frame and releases document/visibility subscriptions. Hidden documents
  cancel rather than spin; visibility restoration schedules exactly one continuation.
- Alias IDs changed during the current provider lifetime are excluded from alias rewrite/delete
  maintenance until remount. This is the conservative history/remote-conflict barrier discovered by
  browser testing; pre-existing garbage and all bucket work remain eligible immediately.

## Bucket, alias and concurrency invariants

- Duplicate bucket reads remain correct before physical cleanup through the existing union query
  boundary. The worker copies transactions using their complete serializable value, preserves
  creation/import ordering, then removes a duplicate day/month/year only after every child has an
  identical earlier copy. There is no delete-before-copy interval.
- Plans retain stable transaction CID/id when available and exact indexed ancestry, then revalidate
  current adjacency, date path, source content and canonical copies inside the applied draft. A
  planned child deleted or changed before apply becomes a no-op.
- Property coverage creates genuine concurrent year/month/day artifacts on separate peers, runs
  maintenance independently, exchanges both maintenance updates, runs again, and asserts exact
  identity/order conservation plus equal raw CRDT transaction JSON across 25 randomized cases.
- Direct parent and nested duplicate symlink references are processed one hop only. Each rewrite
  atomically removes the source reverse-map entry, writes the target reverse-map entry and changes
  the transaction pointer. Existing read-time alias resolution remains unchanged and correct before
  GC.
- Hard deletion is restricted to an active direct symlink whose active target is real. Apply-time
  proof scans every parent/nested transaction, source transaction/backlink maps, every alias
  backlink/target pointer, and the expected target backlink. Real aliases, tombstones, broken links,
  chains, live references and races are retained.

## Origin, history, persistence and sync

- Every applied maintenance mutation uses `origin: "system:gc"`. `VaultUndoCoordinator` already
  excludes this system origin. Integration coverage proves GC alone creates no undo step, then a
  subsequent `user:edit` is undoable while collected state remains collected.
- A real `SyncManager` integration initializes IndexedDB persistence, observes GC local updates,
  awaits durable encryption, forces push, verifies no plaintext alias name in the operation, and
  confirms the unpushed queue is empty.
- A peer imports the malformed base plus decrypted GC operations. Import produces no local-update
  echo; starting its scheduler reaches a clean state without another update. The peer observes the
  rewritten target and hard-deleted source.
- Session-changed aliases are deferred across immediate user undo/redo and concurrent remote
  tombstones, then reconsidered from a new provider/document lifetime. Exact E2E coverage confirms
  atomic undo and duplicate-tab convergence.

## Deterministic automation and profiles

- Tool profile: Node `v22.21.1`, pnpm `11.13.1`, Playwright `1.61.1`, Chromium project from the
  repository configuration.
- Focused maintenance suite: 7/7, including item/time bounds, exact bucket order, 256-transaction
  large fixture, stale plans, parent+nested alias rewrite, hard-delete race and two-peer property.
- Focused integration: 3/3 for fake-frame hidden/resume/disposal/remount barrier, provider document
  replacement/unmount, and real undo/encrypted persistence/sync/no-echo.
- Relevant regression profile:
  `pnpm exec vitest run tests/unit/crdt/maintenance.test.ts tests/integration/vault-maintenance.test.tsx tests/unit/crdt/undo.test.tsx tests/integration/description-alias-actions.test.ts tests/integration/description-alias-lookup-lifecycle.test.tsx --reporter=dot`
  observed 5 files and 25 tests before the final large-fixture addition; all passed. The final full
  profile subsumes it.
- Final repository gates:
    - `pnpm lint`: zero errors; ten pre-existing warnings in unrelated transaction/query tests and
      the existing TanStack Virtual compiler warning.
    - `pnpm typecheck`: clean.
    - `pnpm test`: 60 files, 1,247/1,247 tests.
    - The earlier package-script browser run, `pnpm test:e2e`, was 87/87 Chromium tests in 1.8
      minutes. Because that command did not state retries on its command line, it is retained as
      supporting evidence only.
    - The final explicit browser command,
      `pnpm exec playwright test --workers=4 --retries=0 --reporter=list`, was 87/87 in 1.7 minutes
      with no retries available.
    - The affected repeat matrix,
      `pnpm exec playwright test tests/e2e/description-aliases.spec.ts:305 tests/e2e/description-aliases.spec.ts:403 tests/e2e/transactions.spec.ts:139 tests/e2e/tab-duplication.spec.ts:49 --workers=1 --retries=0 --repeat-each=3 --reporter=list`,
      was 12/12 in 3.0 minutes. This is three clean executions each of the two scenarios that first
      exposed the session-GC lifecycle reds, the 500-transaction/100-alias virtualized journey, and
      browser-duplicated onboarding/authentication.
    - Targeted `oxfmt --check` on all seven committed paths: clean.
    - Repository-wide `pnpm format:check` remains red only on seven pre-existing/root-owned or
      frozen markdown files (`DECISIONS`, `DEPENDENCIES`, `HANDOFF`, `PROGRESS`, `QUESTIONS`,
      `RISKS`, and `specs/human-scratch.md`); none was formatted or staged by this worker.

## Installed-headless Playwright CLI manual charter

- This section is manual installed-CLI evidence only. The automated counts above come from
  `@playwright/test`; they are not described as `playwright-cli` runs. No MCP, `npx`, temporary test
  or config, headed browser, debug/UI mode, dashboard `show`, or timing sleep was used.
- The first disposable session, `p12-manual-r01-20260722`, reached onboarding and kept every
  recovery word masked, but account initialization then rendered `Failed to load vault` because the
  manually started server lacked its server-only Realtime signing secret. Console/request inspection
  identified the 500 `realtime.authorize` response. That setup-only session was closed and deleted;
  it is not counted as feature evidence.
- The usable session was `p12-manual-r02-20260722`. Sanitized setup was
  `SUPABASE_JWT_SECRET=<local-stack secret, extracted without printing> pnpm dev`, followed by
  `pnpm exec playwright-cli -s=p12-manual-r02-20260722 open http://localhost:3000`. All subsequent
  `click`, `fill`, `press`, `mousewheel`, `tab-*`, `reload`, `resize`, `network-state-set`,
  `snapshot`, `console`, `requests`, and observation/interaction-only `run-code` commands used that
  exact session. The landing snapshot exposed Global navigation and named `Get Started`/`Unlock`
  links; onboarding again kept the recovery phrase masked. The authenticated role/name/state
  snapshot exposed `M My Vault owner`, navigation landmarks, history controls, an online client and
  `status "Saved"`.
- Operator-only CLI corrections are retained rather than treated as product results: a ref-targeted
  `press` form was rejected by CLI syntax and rerun as active-element `press Enter`; the
  same-session `window.open` action succeeded although its first return expression referenced
  `document` outside `page.evaluate`; a mobile status lookup timed out because responsive layout
  moved Saved into the menu, which the following named-menu snapshot exposed; and the guessed
  `network-requests` command was rejected before the documented `requests` command succeeded.
- The transaction page first exposed the named empty state (`0 transactions`,
  `No transactions yet`). Normal Add-transaction controls then created 15 accessible rows; the
  durable post-reload baseline was 14 rows because the first exploratory Enter-first partial row did
  not persist. The desktop transaction scroller measured 513px client height / 892px scroll height
  and real pointer wheel input moved it from scrollTop 0 to 379.
- Five durable `Shared Merchant` rows plus one existing `Target Merchant` exercised editing and
  topology-facing UX. Typing/selecting `Target Merchant` opened one named `Change Description`
  dialog with focus on `Change just this one`; `Shift+Tab`/`Tab` exercised the focus loop and a
  pointer click chose `Change all`. The visible table became 6 target / 0 shared. One visible Undo
  restored 1 target / 5 shared; Redo restored 6 / 0. Navigating normally to `Tx Descriptions`
  exposed 10 alias cards and `Target Merchant — 1 transaction`; navigation back plus a hard reload
  retained 14 rows and 6 target / 0 shared, with `Transit` first and `Target Merchant` last.
- That management/card view and the six resolved transaction values are observable normal UI, but
  the underlying symlink IDs, reverse maps, rewrite proof and deletion topology are not rendered.
  Manual hidden-topology inspection is therefore genuinely **unavailable**, not reported as a visual
  success. The deterministic planner/integration suites are the evidence for those internals.
- A direct CLI `tab-new http://localhost:3000/transactions` truthfully redirected the fresh tab to
  `/unlock` because it did not inherit authenticated session storage. The authenticated tab then
  opened a visible same-session duplicate through ordinary browser `window.open`; `tab-list` showed
  the original, fresh locked tab and authenticated duplicate. The duplicate initially exposed the
  same 14 rows / 6 target values. Renaming `Transit` to `Duplicate Tab Rename` in the duplicate was
  `Saved`; the original had zero renamed rows until a normal reload, then exposed exactly one as its
  first row. All three headless pages reported `document.visibilityState === "visible"`, so a real
  hidden-tab lifecycle could not be truthfully produced in this CLI topology and no visibility state
  was forced. Fake-frame automated coverage remains the hide/cancel/show proof.
- With the original tab offline, a normal cell edit to `Hardware Offline` remained visible with
  `navigator.onLine === false` and `status "Saving..."`. Reconnection produced
  `navigator.onLine === true`, one retained offline value and `status "Saved"`. Request inspection
  showed the expected failed offline `sync.pushOps` plus two Next development stack-frame requests,
  followed by a 200 `sync.pushOps` and 200 Realtime authorizations. The five console errors were
  exactly those expected offline fetch/push diagnostics; warnings were zero. No separate GC-origin,
  local-update-echo or maintenance-loop request appeared.
- At 320×720, the responsive snapshot switched the desktop sidebar to a named `Open menu` control,
  retained the transaction controls/rows, and measured document/body widths 320/320 with no
  page-level horizontal overflow. Media emulation reported both dark preference and reduced motion
  as active. The application body nevertheless remained the light `lab(100 0 0)` surface and no
  normal-UI theme switch was exposed, so a rendered dark theme is recorded as unavailable rather
  than inferred from the media query. Reduced motion did not remove or rename controls.
- At 200% CSS zoom on the same mobile viewport, role/name/state remained present, but reflow was not
  clean: document client/scroll width was 320/556, body effective client/scroll width was 160/278,
  and the transaction grid's own horizontal scroller was 110/1040. This is recorded as an observed
  zoom/reflow concern without a PASS claim. Canvas-normalized computed colors for the visible
  light-surface `Add transaction` control were foreground `[98,116,142]`, background
  `[251,252,253]`, contrast 4.64:1.
- The installed CLI closed both disposable sessions, deleted their session data, and
  `playwright-cli list` returned `(no browsers)`. The app server was then stopped before automated
  browser runs.

## Cleanup and frozen boundaries

- Product/test commit: `f9edda60afc946ddda927616a16435a075167d7c` with message
  `Implement bounded vault background maintenance`.
- Exact committed paths are: `src/lib/crdt/{maintenance.ts,context.tsx,description-aliases.ts}`,
  `tests/unit/crdt/maintenance.test.ts`, `tests/integration/vault-maintenance.test.tsx`, and the two
  narrow existing alias integration isolation edits. No mutation primitive or public index export
  was needed.
- The two existing suites mock only `startVaultMaintenanceScheduler`: their scope is action/history
  or alias observer identity, and their intentionally collectable symlink fixtures otherwise add
  unrelated asynchronous GC. The new integration suite exercises the real provider scheduler and all
  affected boundaries.
- `next-env.d.ts`, generated by Next/Playwright, was restored to its original tracked content before
  commit and after the corrected manual/matrix/full runs; it is tracked-clean. A root-requested
  pre-review audit first found and trashed ignored task-generated `.next/` and `test-results/`
  directories. The corrected charter and reruns generated a new 748MB `.next/`, 8KB `test-results/`,
  and 168KB `.playwright-cli/`; those exact task-owned paths were again moved to the desktop trash.
  `.next/`, `test-results/`, `.playwright-cli/` and `playwright-report/` are now all absent.
- No task-owned Next server, Playwright test runner, CLI browser, Chromium headless process or
  MoneyFlow browser process remains. The environment-wide Playwright MCP service predates this task
  by 37 days and was not treated as task-owned. The final index is empty. Expected remaining dirt is
  only root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this sole uncommitted evidence
  directory.
- Frozen boundaries after all automation are unchanged:
    - scratch SHA `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines /
      24,246 bytes;
    - FS-001 SHA `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines /
      25,441 bytes;
    - SCOPE SHA `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
      27,382 bytes.

## Questions, risks and reviewer focus

- No authority-expanding question is required. The 32-item/4ms default is explicit, deterministic
  and covered; callers may inject a smaller budget for tests or future profiling.
- Reviewer focus should include the session-changed alias barrier, exact phase transitions,
  copy-before-container-removal proof, same-day concurrent-copy deduplication, and complete nested
  reference scan before the hard-delete exception.
- Residual risks are bounded to future schema additions that introduce a new alias-reference
  location or new bucket child type; those must extend the full proof scanners before collection.
  Current schema parent/nested references and all alias backlink forms are covered.

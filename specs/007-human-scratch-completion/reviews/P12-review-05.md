# P12 Independent Review — Revision 05

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `05`.
- Literal cumulative reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..865a78774cee84a3ed4c2686422579af94d368b5`.
- Frozen implementation evidence: `evidence/P12/implementation-05.md`, SHA-256
  `146a1cc4df55e5aa1bbfab922861ed069e7c5a7f55585f4a8f852d7cb6794ba5`, 171 lines /
  11,731 bytes.
- Revision-05 product/test delta is
  `19589ee99e249b8371ee6255528cc36ebcade84d..865a78774cee84a3ed4c2686422579af94d368b5`:
  two commits, exactly seven authorized paths, 630 insertions and 255 deletions. The cumulative
  range contains 26 paths, 7,098 insertions and 349 deletions. `git diff --check BASE..HEAD`
  passes.
- **Verdict: FAIL.** Revision 05 closes the direct nested-read leak, mixed imported-change
  classification, actual operation-exchange proof and new-format public metadata defect from
  review 04. However, process-local shadow authority survives scheduler disposal. A same-document
  remount can therefore finish an old shadow after a same-cardinality tag/allocation edit occurred
  while no owner was subscribed, reveal the stale copied collection and delete the edited source.
  In addition, the legacy metadata cleanup runs before initial Mirror construction but not on a
  live metadata-only update from a revision-04 peer, so the old reserved account can re-enter
  `useTransactions()` until reload. HS-005 must remain unchecked.

## Findings

### F-05 — High / blocking: disposed scheduler authority can reveal a stale collection

The new crash model correctly loses authority when a snapshot is loaded into a new `LoroDoc`, but
provider replacement and scheduler remount can reuse the same document. Shadow authority is kept in
module-level `WeakMap` / `WeakSet` state keyed by that document
(`src/lib/crdt/maintenance.ts:1434-1457`). The scheduler disposer cancels the frame, unsubscribes and
clears only allocation iterators; it does not clear `trustedTransactionShadows` or
`acceptImportedTransactionShadows` (`maintenance.ts:2207-2216`).

The concrete loss path is:

1. use the accepted one-item frame budget to create a relocation shadow and copy its first tag;
2. dispose the scheduler while retaining the same `doc` and Mirror;
3. edit the source's already-copied tag from `one` to `changed`, preserving the array length;
4. start a new scheduler for that same document; and
5. let it settle.

No subscriber exists in step 3 to call `invalidateActiveTransactionShadow()`. On remount, the
discard pass accepts the old container because its ID remains in the process-local trust set and
`attachedTransactionShadowScalarsMatchSource()` checks only scalar fields, not tags, allocations or
nested collections (`maintenance.ts:1502-1509,1799-1826`). The resumed copy validates only that the
copied tag count is not greater than the current source count, then appends from the current count;
it never verifies the already-copied prefix (`maintenance.ts:1663-1695`). The same defect exists for
nested tags (`maintenance.ts:1725-1736`) and allocation keys already consumed before disposal.
Finally the worker changes the shadow ID to public and deletes the source
(`maintenance.ts:1892-1925`), so the edited tag/allocation can be lost.

This is inside the explicit cancellation/interrupted-restart acceptance boundary. The lifecycle
test remounts the same document only after alias work has completed, while the relocation test
either edits with the original subscriber still active or reloads into a different document
(`tests/integration/vault-maintenance.test.tsx:441-495,535-623`). Neither covers a partial shadow,
same-document disposal, intervening collection edit and remount.

Required closure: disposal must revoke all process-local shadow/import authority for that document,
so a replacement owner discards and rebuilds any partial shadow. Add one-item-frame tests that pause
after each root and nested tag/allocation copy, dispose, mutate an already-copied value without
changing collection size, remount the same document and prove the edit survives. Also retain the
different-document reload and maintenance-only import behavior.

### F-06 — Medium / blocking: a live legacy metadata update bypasses cleanup

Revision 05 removes the new-format metadata and deletes the revision-04 account-shaped marker before
initial Mirror construction and hydrated repair (`src/lib/crdt/mirror.ts:19-29,93-110,132-170`).
That closes normal construction, snapshot load and startup catch-up.

It does not cover a still-connected revision-04 peer sending a later marker update after the
revision-05 Mirror is live. Remote updates are imported into a staging document, but
`repairHydratedVaultDocument(staged)` is called only when `hasAliasInvariantChange()` detects a
description-alias or projected transaction-alias-reference change
(`src/lib/sync/manager.ts:64-73,716-739`). The schema-valid
`transactions.__moneyflow_gc_metadata__` account has no transaction alias reference. A
metadata-only update therefore makes the condition false; the canonical update is imported
unchanged into the subscribed live document. The exported `useTransactions()` hook returns that raw
store (`src/lib/crdt/context.tsx:335-340`), recreating review-04 F-04's public marker leak until the
next full reload.

This is not malformed input: revision 04 deliberately committed that account on maintenance
progress, and revision 05 explicitly identifies it as legacy data to clean. Current tests exercise
new revision-05 maintenance imports, whose commits contain no account marker; they do not import a
revision-04 marker into an already constructed live Mirror.

Required closure: detect and remove the legacy key on every staged remote update before exporting
the canonical live delta, independent of the alias-invariant predicate, and persist/sync that repair
without an echo loop. Add a subscribed SyncManager/Mirror test for a late legacy marker-only update
and a marker-plus-domain update, proving the reserved account is never observable through public
state and ordinary payload still converges.

## Revision-04 finding adjudication

| Prior finding | Revision-05 adjudication |
| --- | --- |
| F-01 incomplete nested shadows cross public reads | **Closed.** Both direct query exports and `useTransaction()` reject private parents before top-level or nested lookup. Generated nested children retain reserved IDs until their tags and allocations are complete. The malformed/legacy provider test and oversized phase observation cover the raw-hook and generated cases. |
| F-02 mixed imported batches bypass invalidation | **Closed.** Imported ID spans are classified incrementally by individual Loro change messages before maintenance can advance. Any non-maintenance change clears trust and restarts proof. Real maintenance-before-edit, edit-before-maintenance and dependency-delayed tests preserve the edit without local echo. F-05 is a distinct no-subscriber disposal boundary. |
| F-03 unnest/swap operations are never exchanged | **Closed.** One operation peer now exports the actual unnest/swap update, a separate peer exports an unrelated concurrent update, two subscribed receivers import both orders, maintenance settles, and complete physical `transactions` JSON is equal with aliases and unrelated data conserved. |
| F-04 maintenance metadata is a permanent public entry | **Closed for revision-05 generation and startup, still open for live legacy delivery.** New maintenance writes no metadata root and startup/snapshot cleanup removes the old key. F-06 identifies the remaining legal late-update path. |

## Other acceptance and safety observations

- Root and nested shadow attachment remains bounded: empty containers cross the attachment
  boundary, dynamic tag/allocation/nested work is one item per apply, and reveal/pruning is fixed
  depth. Frame item/time limits, hidden-document pause, callback cancellation and idempotent
  planning remain present.
- Public global and account-scoped queries canonicalize duplicate physical copies. Raw direct
  location/ID lookup and the React single-transaction hook now exclude private parents recursively.
  The new query regressions select the complete source against a lower-CID incomplete private
  duplicate.
- Maintenance commits retain `system:gc` origin and the private Loro change message, remain excluded
  from Undo, and propagate through encrypted persistence. No plaintext financial payload, auth
  bypass, test-only production hook or secret was introduced.
- Alias proof/apply retains state/CID revalidation and the narrow proven hard-delete exception.
  Normal alias reads remain correct before GC. No regression was found in adjacent bucket cleanup,
  public ordering, undo or encrypted-sync origin behavior.

## Independent automation

Read-only command verification was delegated to the already independent reviewer-verification
agent required by `.claude/agents/reviewer.md`; the reviewer independently inspected the cumulative
diff and surrounding runtime paths.

| Gate | Independent result |
| --- | --- |
| Focused profile: maintenance, transaction mutations, transaction queries and vault-maintenance integration | PASS in three clean processes; 4 files / 96 tests each (3.33 s, 3.41 s, 3.38 s). |
| `pnpm test` | PASS; 60 files / 1,269 tests in 6.07 s. |
| `pnpm typecheck` | PASS; no diagnostics. |
| `pnpm lint` | PASS exit 0; 0 errors / 10 disclosed warnings. |
| `pnpm build` | PASS; Next 16.2.10 compiled, type generation passed and all 17 routes built. |
| Changed-path `oxfmt --check` | PASS; all seven revision-05 paths. |
| Repository `pnpm format:check` | FAIL on exactly ten disclosed control/frozen/evidence files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `implementation-03.md`, `implementation-04.md`, uncommitted `implementation-05.md`, and `specs/human-scratch.md`. No revision-05 product/test path failed. |
| `git diff --check BASE..HEAD` | PASS. |
| Affected no-retry E2E, four journeys with `--repeat-each=3 --workers=1` | Implementation evidence: PASS; 12/12 in 2.9 minutes. |
| Full no-retry E2E, `--workers=1` | Final implementation evidence: PASS; 87/87 in 5.4 minutes. The disclosed interim T021c red was followed by three isolated passes and the final full pass. |

The green automation is reported exactly but does not exercise the deterministic disposal/remount
or late-legacy-update paths in F-05 and F-06.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-review-05` against the root-owned authenticated local server. No MCP, `npx`, temporary
  browser test/config, headed/UI/debug/pause mode or arbitrary sleep was used.
- Created a fresh identity while all twelve recovery words remained masked. The phrase was never
  revealed, copied, read, entered or printed. Settings exposed `My Vault`, owner, online presence
  and accessible status `Saved`.
- Through named controls, created `Review Visible` for `12.34`; reload preserved exactly one row.
  Keyboard-edited it to `13.45` and tabbed away; `Saving...` became `Saved` and reload preserved the
  value. While the loaded app was offline, edited it to `14.56`; reconnect reached `Saved`, the
  failed request retried with 200, and reload preserved `14.56`.
- A second tab navigated to the accessible `Welcome Back` / Unlock page because the vault key is
  tab-local. It was closed without exposing or entering recovery material.
- At 390 × 844 with dark and reduced-motion preferences, the named menu/history/filter controls,
  transaction count and complete row remained represented. At 200% zoom on a 1,280 px viewport,
  `innerWidth`, document client width and scroll width were all 1,280 px; the transaction row and
  controls remained in the accessibility snapshot. The body background computed to
  `lab(100 0 0)` under dark preference, the inherited theme limitation previously routed outside
  P12. P12 changes no UI color/control, so no new contrast target applies.
- Expected `ERR_INTERNET_DISCONNECTED` console/request entries occurred only during explicit offline
  emulation. After reconnect and reload, console inspection returned zero errors; sync and realtime
  requests were 200. Normal UI cannot manufacture physical duplicate buckets, pause a shadow at an
  exact item boundary or inject revision-04 metadata, so those decisive paths remain
  static/automated review gates.

## Boundary, cleanup and questions

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines /
  24,246 bytes, with HS-005 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines /
  25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
  27,382 bytes.
- Frozen revision-04 evidence remains SHA-256
  `8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`; failed review-04
  remains SHA-256 `0a97f910124dfbde35243a1d736337dc14179709108f2cb4c5df3d89cefcce49`.
- The CLI session was closed and `delete-data` found no residual browser data. Root stopped the
  server and restored its `next-env.d.ts` drift; port 3000 is closed and no reviewer browser/dev
  process remains.
- Before this artifact, worktree entries were exactly root-owned modified `HANDOFF.md` and
  `PROGRESS.md` plus frozen untracked `implementation-05.md`; the index was empty. This review is
  the sole reviewer-created artifact. No product, test, marker, ledger, evidence, configuration or
  prior-review file was edited.
- No new `Q-*` proposal is needed. Cancellation/restart safety and the private public-state boundary
  are explicit acceptance/review gates, so F-05 and F-06 do not require a product decision.

## Single final verdict

**FAIL.** Revision 05 closes review-04 F-01 through F-03 and stops new metadata generation, but
same-document disposal retains enough authority to reveal a stale collection and delete its edited
source, while live revision-04 metadata delivery can still recreate the public reserved account.
Root must preserve this immutable review, keep HS-005 unchecked and route F-05 and F-06 into P12
revision 06.

# P12 Independent Review — Revision 06

## Review identity and verdict

- Package / requirement / revision: `P12` / `HS-005` / `06`.
- Literal cumulative reviewed range:
  `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..9939d68cb6752f174c2fc60e4e815c7af52dd0d7`.
- Frozen implementation evidence: `evidence/P12/implementation-06.md`, SHA-256
  `08ca7c17f64371f1f6c06ef1b8593cee035477f5b8a8dfb09431ec40b59a177c`, 191 lines /
  12,326 bytes.
- Revision-06 product/test delta is
  `a98b3b00a6858b40398531204633832790d59c5f..9939d68cb6752f174c2fc60e4e815c7af52dd0d7`:
  two commits, exactly three authorized paths, 288 insertions and 6 deletions. The cumulative range
  contains 28 paths, 7,795 insertions and 350 deletions. Both revision and cumulative
  `git diff --check` pass.
- **Verdict: FAIL.** Revision 06 closes stale-shadow authority after scheduler disposal and adds
  bounded, idempotent cleanup of late legacy metadata. It hides the reserved account from the named
  `useTransactions()` hook, but not from the exported generic `useVaultSelector()` boundary that
  directly returns raw `state.transactions` and is used that way by three production tables. The
  marker is therefore still publicly observable between import and the next visible animation
  frame, contrary to the explicit “every raw hook” revision-06 gate. HS-005 must remain unchecked.

## Finding

### F-07 — Medium / blocking: generic public selectors still expose the reserved account

`useVaultSelector()` is the exported generic application-state read boundary. Its own comment says
raw wire state is absent, but its implementation passes the unprojected Mirror state directly to
the caller (`src/lib/crdt/context.tsx:170-176`). Revision 06 sanitizes only the named
`useTransactions()` result with a shallow omission (`context.tsx:336-346`).

The late-marker test proves that the physical reserved account exists after import and before the
scheduled frame (`tests/integration/vault-maintenance.test.tsx:830-849`). Its capture component
calls only `useTransactions()` (`vault-maintenance.test.tsx:799-807`), so it cannot detect the
remaining public path:

```ts
useVaultSelector((state) => state.transactions)
```

That exact selector is not hypothetical. `PeopleTable`, `StatusesTable` and `TagsTable` use it in
production (`src/components/features/people/PeopleTable.tsx:57-60`,
`src/components/features/statuses/StatusesTable.tsx:37-40`,
`src/components/features/tags/TagsTable.tsx:96-99`). While their current downstream canonical
queries harmlessly ignore the empty metadata account, each component still receives the private
record. Any other public generic consumer can enumerate or retain it. The window is unbounded while
the document is hidden because the scheduler correctly pauses its cleanup frame, making this a real
public-state boundary rather than an instantaneous implementation detail.

Required closure: remove the legacy key at the generic application-state projection boundary (or
before any live Mirror notification), preserving stable selector identities when no marker exists.
Extend both late-import cases with a component using
`useVaultSelector((state) => state.transactions)` and assert that neither it nor
`useTransactions()` observes the key while physical pre-frame presence, one bounded cleanup update,
domain-edit conservation and duplicate-import no-resurrection all remain proven. Audit generic
transaction mutation/read consumers under the same private-state rule.

## Revision-05 finding adjudication

| Prior finding | Revision-06 adjudication |
| --- | --- |
| F-05 disposed scheduler authority can reveal a stale collection | **Closed.** Disposal now clears both imported-shadow acceptance and every trusted shadow CID for the document before clearing allocation iterators. Direct one-item-frame tests pause after already consuming root tag, root allocation, nested tag and nested allocation values; they dispose, edit the exact source CID without changing cardinality, remount the same document and preserve all four replacements after the old epoch is discarded. The reviewer ran these four cases directly. |
| F-06 live legacy metadata bypasses cleanup | **Physical cleanup and named-hook portion closed; generic-hook portion remains open as F-07.** Detection precedes maintenance-domain/alias predicates, cleanup performs one root-map delete and maintenance commit in one frame, marker-plus-domain preserves the edit, and duplicate import neither resurrects the marker nor emits another update. The current `useTransactions()` projection stays clean, but the generic public selector does not. |

## Cumulative acceptance observations

- Attached relocation remains bounded: empty containers cross the Loro attachment boundary,
  tags/allocations/nested records advance one item at a time, invalid shadow deletion is one list
  operation, and reveal plus bucket pruning is fixed depth. Frame item/time limits, hidden pause,
  visible resume, callback cancellation and idempotent rescanning remain intact.
- Review-04 F-01 through F-03 remain closed. Direct location/ID queries and `useTransaction()`
  reject private parents and incomplete nested children; global queries canonicalize after
  multi-account concatenation; actual unnest/swap updates are exchanged against a concurrent update
  in both orders and the complete physical transaction JSON converges.
- Imported Loro change spans remain incrementally classified before maintenance can advance.
  Maintenance-only imports avoid local echo; any ordinary change in mixed, reverse or
  dependency-delayed delivery clears authority and conserves the user edit.
- Alias read correctness, direct-reference rewrite, apply-time backlink proof and narrow hard-delete
  exception remain present. Maintenance origin is `system:gc`, excluded from Undo and emitted as a
  normal local update for immediate encrypted persistence and throttled server sync.
- New revision-06 code introduces no recursive attach, unbounded scan, plaintext payload, secret,
  auth bypass, transport discriminator, schema field or test-only production hook. F-07 is the sole
  material cumulative finding.

## Independent automation

Read-only command verification was delegated to the independent reviewer-verification agent
required by `.claude/agents/reviewer.md`; the reviewer separately inspected the complete cumulative
range, ran the focused revision-06 counterexamples, and ran both browser matrices.

| Gate | Independent result |
| --- | --- |
| Revision-06 targeted integration cases | PASS; 6/6: four same-document copied-value cases plus marker-only and marker-plus-domain cleanup. |
| Focused P12 profile | PASS in three clean processes; 4 files / 102 tests each (3.42 s, 3.37 s, 3.34 s). |
| `pnpm test` | PASS; 60 files / 1,275 tests in 5.94 s. |
| `pnpm typecheck` | PASS; no diagnostics. |
| `pnpm lint` | PASS exit 0; 0 errors / 10 disclosed warnings. |
| `pnpm build` | PASS; Next 16.2.10 compiled, type generation passed and all 17 routes built. |
| Changed-path `oxfmt --check` | PASS; all three revision-06 paths. |
| Repository `pnpm format:check` | FAIL on exactly 12 disclosed control/frozen/evidence files: `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `implementation-03.md`, `implementation-04.md`, `implementation-05.md`, uncommitted `implementation-06.md`, frozen `P12-review-05.md`, and `specs/human-scratch.md`. No revision-06 product/test path failed. |
| Cumulative `git diff --check BASE..HEAD` | PASS. |
| Affected no-retry E2E, four journeys with `--repeat-each=3 --workers=1` | PASS; 12/12 in 2.9 minutes. |
| Full no-retry E2E, `--workers=1` | PASS; 87/87 in 5.4 minutes. |

The independent E2E server emitted local Realtime-authentication warnings because that runner did
not receive the root-only local signing value, but both commands passed. The implementation's
correctly keyed runs and the reviewer's correctly keyed manual server showed successful
authorize/revoke requests. Green automation does not exercise the exported generic selector in
F-07.

## Installed-CLI manual charter

- Used only repository-installed headless `pnpm exec playwright-cli` with disposable session
  `p12-review-06` against the root-owned correctly keyed local server. No MCP, `npx`, temporary
  browser test/config, headed/UI/debug/show/pause mode or arbitrary sleep was used.
- Created a fresh identity while all twelve recovery words remained masked. They were never
  revealed, copied, read, entered or printed. The authenticated vault exposed accessible
  `My Vault`, owner, online presence and `Saved` status.
- Created `Review Six` for `12.34` through named transaction controls; reload preserved exactly one
  row. While offline, keyboard-edited the amount to `14.56`; status became `Saving...`. Reconnect
  reached `Saved`, the failed push retried with 200, and reload preserved `14.56`.
- A second tab reached the accessible `Welcome Back` / Unlock page because the vault key is
  tab-local. It was closed without revealing or entering recovery material.
- At 390 × 844 with dark and reduced-motion preferences, named menu/history/filter controls and the
  complete row remained represented; inner, client and scroll widths were all 390 and the
  reduced-motion query matched. The body background remained `lab(100 0 0)` under dark preference,
  the inherited P20A/P20B theme limitation.
- At 200% page scale on a 1,280 px viewport, inner/client/scroll widths were all 1,280 and all core
  controls plus the row remained in the accessibility snapshot. Revision 06 changes no visual
  control, color or focus treatment, so no new contrast target applies.
- Final console inspection returned zero errors. All online sync, Realtime and navigation requests
  were 200; request history retained only expected `ERR_INTERNET_DISCONNECTED` entries from explicit
  offline emulation. Normal UI cannot inject a revision-04 CRDT marker, so manual success does not
  waive F-07.

## Boundary, cleanup and questions

- Frozen human scratch remains SHA-256
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines /
  24,246 bytes, with HS-005 unchecked. Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines /
  25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines /
  27,382 bytes.
- Frozen revision-05 evidence remains SHA-256
  `146a1cc4df55e5aa1bbfab922861ed069e7c5a7f55585f4a8f852d7cb6794ba5`; failed
  review-05 remains SHA-256
  `a54ea0b726d157fabab1b3d59a3f2ca84391cfc9ff0560b48a20e08296e8326a`.
- The CLI session was closed and `delete-data` found no residual user data. Root stopped the server,
  restored `next-env.d.ts`, moved timestamped CLI output to recoverable trash and confirmed port
  3000 closed. E2E `test-results/` is absent; no reviewer browser/dev process remains.
- Before this artifact, worktree entries were exactly root-owned modified `HANDOFF.md` and
  `PROGRESS.md` plus frozen untracked `implementation-06.md`; the index was empty. This review is
  the sole reviewer-created artifact. No product, test, marker, ledger, evidence, configuration or
  prior-review file was edited.
- No new `Q-*` proposal is needed. The generic public-state privacy boundary is explicitly settled
  by the revision-06 dispatch and existing application-state convention.

## Single final verdict

**FAIL.** Scheduler disposal now revokes stale authority, and late legacy data is physically removed
once with no resurrection or domain loss. However, the marker remains observable through the
exported generic application selector and three production consumers before that bounded cleanup
frame. Root must preserve this immutable review, keep HS-005 unchecked and route F-07 into P12
revision 07.

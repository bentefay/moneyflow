# P11C Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package/scope/revision: `P11C` / `HS-004` integrated behavior and performance checkpoint / `01`.
- Literal BASE and clean pre-implementation HEAD: `0426866fa66cc022efca6d74cd5088d586d3d11b`.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P11C/implementation-01.md`, created after instruction
  and product inspection but before product or test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Prior P11A/P11B artifacts and product behavior, root ledgers, frozen sources, SCOPE, configuration
  and unrelated product/tests remain immutable.

## Implementation plan

1. Build one stable, memoizable alias lookup per CRDT alias collection and reuse it for active real
   options, exact normalized matching, final-real resolution and complete group counts.
2. Preserve the complete P11B interaction state machine while proving bounded rendered rows and lazy
   suggestion surfaces through the real virtualized table at large scale.
3. Exercise management/import/manual/exact/new/single/shared/change/remove integration across
   persistence, refresh, undo/redo, duplicate tabs and causal peer work using existing named
   actions.
4. Run the required automated and repository CLI manual/performance/concurrency charter, clean every
   task artifact/process, commit exact product/test paths and finish this immutable evidence.

## Status

Implementation, automation, manual validation, cleanup and product/test commit are complete. This
worker makes no PASS claim; the exact immutable range is ready for independent review.

## Immutable review range

- BASE: `0426866fa66cc022efca6d74cd5088d586d3d11b`.
- HEAD: `dd0727f3562d4a9e40669d6d64109174690286a1` (`Complete description alias integration`).
- Exact review range:
  `0426866fa66cc022efca6d74cd5088d586d3d11b..dd0727f3562d4a9e40669d6d64109174690286a1`.
- The range contains exactly the 15 authorized product/test paths listed below, with 849 insertions
  and 73 deletions. The post-commit index is empty.
- Final Git-visible worktree state outside the committed range is only the coordinator-owned
  unstaged `HANDOFF.md` and `PROGRESS.md`, plus this untracked revisioned evidence directory.

```text
src/app/(app)/transactions/page.tsx
src/components/features/description-aliases/DescriptionAliasesTable.tsx
src/components/features/description-aliases/descriptionAliasInteraction.ts
src/components/features/description-aliases/useDescriptionAliasLookup.ts
src/components/features/transactions/TransactionTable.tsx
src/components/features/transactions/cells/InlineEditableDescriptionAlias.tsx
src/lib/crdt/description-aliases.ts
src/lib/domain/description-aliases.ts
tests/e2e/description-aliases.spec.ts
tests/e2e/transactions.spec.ts
tests/integration/description-alias-actions.test.ts
tests/integration/description-alias-crdt.test.ts
tests/unit/components/description-alias-interactions.test.tsx
tests/unit/domain/description-alias-lookup.test.ts
tests/unit/transactions/virtualization.test.tsx
```

## Product implementation

### Stable alias read index

- Moved Q-016 trim + Unicode NFC, case-sensitive normalization into the pure domain module and
  re-exported it from the mutation module so read and write paths share one definition.
- Added `createDescriptionAliasLookup`, which converts legal active aliases once, records active
  real aliases, indexes normalized exact names deterministically by lexical ID, resolves real and
  declared symlink IDs in constant time, and precomputes complete transaction-group counts from
  declared backlinks. Its statistics expose source, active, real and backlink work for bounded-work
  tests.
- Added `useDescriptionAliasLookup`, memoized by the CRDT alias collection identity. Transactions,
  management display, commit planning, modal source resolution and per-row display now share that
  lookup instead of rebuilding equivalent maps or scanning the whole collection per row.
- Existing public legal-state helpers remain for compatibility. Deleted, contradictory, dangling or
  undeclared records are not admitted into lookup results.

### Rendered performance and interaction preservation

- Inactive virtual rows now return before autocomplete filtering. Focus alone remains lazy; only an
  edited, non-dismissed cell filters and mounts its listbox portal.
- The TanStack range extractor preserves at most one last-focused transaction row outside the
  ordinary virtual range, retaining the live input and caret while its surrounding rows recycle. The
  ordinary range is otherwise unchanged and sorted.
- A proposed blur-time pin release was deliberately removed after its counterfactual caused the
  unrelated date calendar to remain open. The retained range behavior is bounded to one extra row
  and preserves the existing date/dropdown portal interaction.
- All P11B pointer, keyboard, closed-grid arrow, exact/new/single/shared modal, focus restoration,
  tooltip and no-manual-raw behavior remains routed through the same components and named actions.

## Integrated state and action matrix

| Path                            | Evidence and resulting invariant                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Management create/rename/delete | Real UI CRUD and normalized duplicate rejection; rename refreshes associated cell display and delete uses existing two-click conservation.                                  |
| Imported exact                  | Exact typed selection uses Q-016; later management rename changes display while immutable imported raw remains tooltip provenance; reload retained both.                    |
| Imported partial                | Partial text did not exact-match automatically; keyboard selection associated it and reload retained the alias while raw stayed provenance.                                 |
| Imported duplicate              | Two identical raw descriptions remained two transactions throughout mapping, concurrency and destructive repair.                                                            |
| Manual alias-only               | Manual transaction has empty raw/import provenance, no provenance tooltip, survives rename/Undo/Redo, and its outbound encrypted operations contain no manual plaintext.    |
| Novel / single use              | Planner and real cell paths commit seamlessly without a modal; the named atomic action remains one Undo step and one local CRDT update.                                     |
| Shared exact / novel            | Shared edits retain the modal copy/default/focus choices; Change just this one and Change all use the existing named atomic actions.                                        |
| Shared remove one / all         | P11B browser regression journey covers cancel, one and all choices, Undo/Redo, raw restoration and refresh.                                                                 |
| Persistence                     | Every isolated named action exports/reopens to the exact post-action state; integrated peers reopen legally; E2E/manual hard refresh retains visible/raw state.             |
| Operation count                 | The full actual-hook action matrix emitted exactly one local update per logical action; two-peer management and cell choices each emitted one local update before exchange. |

### Peer and history matrix

- Integration creates two independent Loro peers from one snapshot for four causal matrices with 250
  unrelated live aliases plus imported one/two/single and manual rows:
    1. management rename against exact change-one;
    2. management rename against novel change-one;
    3. management delete against remove-one;
    4. management delete against shared change-all.
- Each peer performs one named local action before exchanging updates. Deterministic repair and
  re-exchange converge identical legal alias graphs without changing imported descriptions or
  inventing manual raw/import provenance. Export/reopen remains legal.
- Undo on the cell peer retains the remote management rename/deletion. Redo is available for
  surviving cell actions. For delete against stale shared change-all, Q-017 repair invalidates the
  stale redo instead of resurrecting the tombstoned group.
- The final two-tab E2E and manual journey both prove remote rename plus local change-one produces
  target/shared state, local Undo restores only the local row, and Redo reapplies only that row.
- Concurrent management delete versus shared Change all converges after refresh to both immutable
  raw descriptions and no live source alias. A later offline novel edit reconnects to the other tab;
  local Undo/Redo changes only that edit and never resurrects the remote deletion.

## Performance datasets and counterfactuals

- Pure domain dataset: 10,000 legal records (5,000 real + 5,000 symlink). Statistics were exactly
  10,000 source, 10,000 active, 5,000 real and 5,000 backlink visits. Repeated exact, resolution and
  group-count reads use the built maps; deleted/illegal records and deterministic concurrent exact
  duplicates have explicit assertions.
- Component dataset: 2,000 alias options rendered into 20 mounted cells behind a Proxy. Inactive
  cells and focus-only performed zero `filter` calls; one edited cell performed exactly one filter
  and mounted exactly one listbox/option.
- Virtualizer unit dataset: 10,000 transactions; the ordinary mocked range mounts 11 rows. A distant
  counterfactual excludes row 0; focusing it adds exactly that one sorted index.
- Browser dataset: 100 aliases created through real management UI and 500 CSV transactions imported
  through the real import flow. At rest/focus-only no listbox or option exists; one unique edit
  mounts one unselected option. The final retry-free browser run completed in about 30 seconds per
  journey, well inside the unchanged explicit 120-second large-workload budget.
- The first browser attempt used 200 sequential UI aliases and exposed a test-order mistake: the new
  focus step scrolled back to the top immediately before an inherited step required row 499. The
  corrected journey leaves row 0 pinned while the viewport stays at row 499. E2E uses 100 real-UI
  aliases, while 2,000/10,000 option maps remain covered at component/domain level; no timeout was
  inflated.
- A later blur-release optimization made T014a date-calendar dismissal fail deterministically 3/3.
  Removing only that optimization made T014a pass 3/3 immediately and it passed in the corrected
  full-suite run. This counterfactual is why no blur handler remains in the committed range.

## Automation

| Command / gate                                                    | Result                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused P11C Vitest set                                           | PASS: 5 files / 20 tests.                                                                                                                                                                                                                                            |
| Strengthened virtual/two-peer subset after counterfactual changes | PASS: 2 files / 7 tests.                                                                                                                                                                                                                                             |
| `pnpm typecheck` final                                            | PASS.                                                                                                                                                                                                                                                                |
| `pnpm test` final                                                 | PASS: 57 files / 1,232 tests.                                                                                                                                                                                                                                        |
| `pnpm lint` final                                                 | Exit 0; 0 errors and the same 10 inherited warnings: TanStack incompatible-library warning at `TransactionTable`, two unused query types and seven unused test imports/types.                                                                                        |
| `pnpm build` final                                                | PASS: compiled/typechecked and generated all 17 app routes.                                                                                                                                                                                                          |
| `pnpm format:check`                                               | Expected inherited repository red only after formatting this artifact: seven root ledger/scratch files; no product/test/evidence formatting red.                                                                                                                     |
| Alias E2E, retries disabled                                       | PASS: all 5 cases repeated 3 times, 15/15 in 1.9 minutes, one worker.                                                                                                                                                                                                |
| Final virtual E2E, retries disabled                               | PASS: changed journey repeated 3 times, 3/3 in 1.4 minutes, one worker, final corrected diff.                                                                                                                                                                        |
| Isolated two-tab P11C journey                                     | PASS: 1/1 in 21.1 seconds, retries disabled.                                                                                                                                                                                                                         |
| Corrected full E2E                                                | Honest inherited red: 86/87 in 5.6 minutes, retries disabled/one worker. Sole failure T021c shift-click range selection did not render `3 selected`; the exact test passed 3/3 isolated in 14.2 seconds. Both changed P11C journeys and T014a passed in suite order. |

### E2E diagnosis history

- Initial two-tab red was test orchestration: after a diagnostic Redo only one source reference
  remained, so P11B correctly used the seamless single path rather than a shared modal. Restoring
  the shared group before the destructive race fixed the setup.
- A following destructive assertion observed the local target before synchronization. Waiting for
  both Saved states and reloading produced Q-017 exactly: both raw descriptions and absent alias.
- The test then tried Undo after reload; reload correctly clears local history. That invalid
  assertion was removed because pre-reload rename and later offline actions cover remote-history
  isolation.
- The first full suite on the temporary blur handler was 86/87 at T014a. Its isolated 3/3 red and
  post-removal 3/3 green prove it was caught, not misreported as inherited.
- The corrected full suite's only red is the previously documented T021c suite-order dependency; its
  current isolated 3/3 green was reproduced after the final product diff.

## Repository CLI manual charter

- Used only repository-installed `pnpm browser` in disposable session `p11c`. Started a task-owned
  dev server with the already-running local realtime container secret passed only as an in-process
  environment value. No secret value or recovery phrase was printed, revealed or copied.
- Created a new identity without revealing the phrase. Seeded 106 aliases through actual management
  controls in 9,156 ms, including decomposed `Cafe\u0301`, which displayed as one NFC `Café`; an
  NFC-equivalent duplicate returned `An alias named Café already exists`. Cancel and two-click
  delete behavior were also exercised.
- Imported 500 deterministic transactions through file selection, Columns auto-detect and Account
  selection in 2,389 ms. The dataset included exact, partial and duplicate raw descriptions.
- Sanitized rendered measurements:
    - top viewport: 14 mounted transaction rows and 14 description inputs;
    - rest and focus-only: 0 listboxes, 0 options;
    - edited unique query: 1 listbox, 1 unselected option in 6 ms;
    - repeated real scroll/load to index 499: 1,775 ms;
    - bottom: 18 mounted rows, row 0 and row 499 both present, original input focused, caret
      exactly 4.
- Renamed the exact alias through management. Searching by immutable raw returned displayed
  `Renamed Exact`, one raw tooltip `Manual Exact`, and the same state after reload. Partial keyboard
  selection reloaded as `Manual Partial`; duplicate raw query returned two `Manual Duplicate` rows.
- A manual row exposed no raw tooltip. Its rename/Undo/Redo sequence was final → prior → final. Four
  corresponding completed `sync.pushOps` bodies (sanitized request IDs 716/719/722/725) were
  inspected without printing payloads; neither manual plaintext value occurred.
- Live duplicate tab results:
    - rename plus local change-one: `[Target Manual, Shared Concurrent]`;
    - Undo: both `Shared Concurrent`; Redo: target/shared; second Undo: both shared;
    - delete versus Change all after refresh: two `Manual Duplicate` raw values, deleted alias count
      0;
    - offline local: `Offline manual final`; duplicate tab converged; Undo raw; Redo offline value.
- Accessibility/responsive inspection:
    - desktop 1,440×900 body client/scroll 1,440/1,440;
    - mobile 390×844 body client/scroll 390/390;
    - named Transactions grid, Transaction description textboxes and named history controls remained
      exposed; main content stayed visible;
    - dark and reduced-motion media queries both applied;
    - 200% at 1,280×800 reflowed body 640/640 without page overflow; the data table intentionally
      contained its own horizontal scroll at 334/1,040;
    - browser console: 0 errors and 0 warnings. Two statusless push requests were the intentional
      offline attempts and were followed by successful 200 reconnect pushes.

## Cleanup and frozen boundaries

- Through the visible UI, loaded and selected all 502 disposable transactions, used Delete then
  Confirm Delete, and observed `0 transactions`. No live alias row remained afterward.
- Deleted the CLI session data; no browser remained in `pnpm browser list`. Stopped the task-owned
  dev server. No task-owned Next dev or Playwright CLI process remained.
- Moved task-generated `.playwright-cli` and `test-results` directories to trash. Restored generated
  `next-env.d.ts` with `apply_patch`; no generated path is staged.
- Final frozen source checks:
    - `specs/human-scratch.md` SHA-256
      `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines / 24,245 bytes;
      the authorized normalized checked set remains HS-002/HS-006/HS-010/HS-014/HS-017/HS-018 and
      all 21 normalized HS blocks remain in SCOPE;
    - immutable FS-001 canonical source SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes;
    - `SCOPE.json` SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines / 27,382 bytes.
- A literal BASE comparison reports no source/SCOPE diff. Root-owned `HANDOFF.md` and `PROGRESS.md`
  remain unstaged and uncommitted by this worker. No prior artifact/review, marker, configuration or
  unrelated user path is staged.

## Questions, risks and reviewer focus

- Q-016 is applied exactly as already recorded: trim + Unicode NFC, case-sensitive.
- Q-017 is applied exactly as already recorded: reject/repair stale destructive work,
  non-resurrecting tombstone, preserve immutable raw/manual provenance and transactions, converge.
  The integration and two live-tab destructive matrices produce that outcome; no new Q proposal is
  required.
- Honest inherited red: full E2E remains 86/87 only because T021c fails in full suite order and
  passes isolated 3/3. It is outside this package and unchanged by the range.
- Reviewer should independently inspect that memoization is collection-identity scoped, backlink
  traversal admits only legal declared one-hop symlinks, and the focused-row range adds no more than
  one index. The retained last-focused pin may remain until a different row receives focus, but it
  is always bounded and avoids the proven calendar-portal regression from blur-time clearing.
- No PASS claim is made.

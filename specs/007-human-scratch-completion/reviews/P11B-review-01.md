# P11B Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P11B` / `HS-004` interaction checkpoint / `01`.
- Literal reviewed range:
  `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f..e35109dfe7b02bdb4058445f44d03a6dd678457b`.
- Frozen implementation evidence: `evidence/P11B/implementation-01.md`, SHA-256
  `f70f39969e1d4dcdf961c0ae2174b63fb36b03c5bb1a618c5727a45d9ebf9eb2`, 239 lines / 18,293 bytes.
- The range contains exactly the 11 authorized product/test paths in HANDOFF: 1,243 insertions and
  301 deletions. The narrow manual-transaction action refinement was authorized prospectively in the
  root ledger before the two P11A-owned files were edited.
- **Verdict: PASS.** The exact range satisfies P11B's cell, autocomplete, planner, modal,
  provenance, manual-storage, atomic-action, accessibility and required real-browser interaction
  gates without bypassing the passed P11A boundary. Root may integrate P11B only. HS-004 remains
  incomplete and unchecked until P11C independently passes.

## Findings

### F-01 — CLOSED: native one-click editing and lazy no-default autocomplete

`InlineEditableDescriptionAlias` is always a native input rather than a display control that must be
activated before editing. A fresh installed-CLI journey clicked two CSS pixels inside the input,
focused it on that click and observed `selectionStart === 0`. The changed no-retry E2E independently
reproduced the same native-caret result three times.

The listbox is absent at rest and on focus alone. It mounts only for the focused, edited cell when
the substring filter has results. `activeOptionIndex` begins as `null`; the real accessibility
snapshot exposed the target option without selected state, Arrow Down selected it, and Escape
unmounted the listbox. Component coverage also proves Arrow Up starts at the last result, arrows
wrap, Enter accepts only an explicitly active option, and only one listbox mounts. Closed arrows
bubble to `useGridCellNavigation`; the changed E2E proves the next description input receives focus.

Pointer-down prevents the option's intermediate input blur, while `submittedRef` gives pointer,
Enter and blur one submission boundary. Independent component runs reproduced exactly one select and
no stale blur commit for both pointer and keyboard selection. No helper-only state machine is being
certified: the production row/table/page callbacks use this component and the changed E2E exercises
the rendered transaction grid.

### F-02 — CLOSED: exact/new/first/single/shared and symlink-aware planning

`planDescriptionAliasCommit` applies canonical Q-016 normalization, finds only active real aliases
with deterministic ID tie-breaking, resolves the current alias in one hop, and counts the complete
real group including symlink transactions. Its explicit intent matrix correctly covers no-alias
blank/no-write, exact attach, novel create-and-attach, unchanged/no-write, single-use novel rename,
single-use exact change-one, blank remove-one, shared confirm-change and shared confirm-remove.

The production page exhaustively switches that union and invokes only named P11A actions. Novel
targets are materialized once at the action edge; shared novel/existing `Change all` routes through
the symlink-producing atomic action rather than silently renaming the source. Remove-all accepts a
direct or symlink ID and resolves the final real group. There is no raw Mirror mutation, generic
application-state escape hatch, or public raw wire import in this range.

Fresh manual rows exact-attached twice to one `Shared` alias. Selecting existing `Target` from one
row opened one shared dialog; `Change all` changed both shared rows, yielding three Target rows, and
one Undo restored exactly two Shared plus one Target. This corroborates the planner/action tests and
retains P11A's no-chain, reverse-reference and one-step history guarantees without claiming P11C's
future concurrent/refresh/scale matrix.

### F-03 — CLOSED: modal choices, trap, cancellation and focus/caret restoration

Change choices are exactly `Change just this one`, `Change all`, `Cancel`; remove choices are
exactly `Remove from just this one`, `Remove from all`, `Cancel`. Radix supplies the dialog focus
scope, outside/Escape lifecycle and keyboard activation. The implementation explicitly focuses the
first choice, suppresses default close autofocus, and uses a run-once guard around every choice.

Independent browser use observed the first choice focused, Shift+Tab wrapping to Cancel, and Escape
closing with no write. It restored the originating description input, its prior `Shared` value and
caret position 3. Changed E2E additionally proves change-one, change-all, remove Cancel, remove-one
and remove-all, including one complete Undo for every accepted action. The origin stores both the
input and stable cell container, so successful provenance-wrapper replacement can locate the new
input before restoring selection.

The input submission guard prevents Enter followed by blur and option pointer followed by blur from
opening duplicate dialogs or issuing duplicate operations. Missing/stale transaction guards close
the modal rather than falling through to an unscoped write.

### F-04 — CLOSED: imported/manual provenance and atomic manual insertion

Imported provenance is exposed only when a transaction has an alias, the original raw description is
nonblank, and raw differs from the displayed alias. The controlled repository tooltip closes on
blur/pointer leave and remains available by hover/focus. Equal alias/raw values have no tooltip
trigger state. Manual transactions render from their alias with `originalDescription` absent, so
they expose no raw/manual tooltip.

The root-authorized `insertManualDescriptionAliasedTransaction` validates normalized nonblank name,
new-alias collision and transaction collision before writing. It then forces `description: ""`,
`importId: undefined`, inserts the transaction, and exact-selects or creates the real alias within
one `useInternalVaultAction("add")`. Typed failures make no local update or history entry. The
focused real-Mirror integration observed one local update, exact reverse reference, raw absence,
exact reuse and one Undo/Redo step.

The fresh installed-CLI manual add produced exactly one successful `sync.pushOps` request. Its body
did not contain the known `Shared` plaintext, the row was visible under the alias, and no matching
tooltip existed. This independently closes the preliminary two-operation defect that caused the
prospective authority refinement; the page no longer calls insert and alias attachment separately.

### N-001 — non-blocking for P11B: T021c is confirmed flaky and remains R-009/P13/P21 work

The frozen evidence honestly reports two complete no-retry runs at 85/86 and a subsequent isolated
T021c 3/3. Independent review reproduced the exact aggregate at **85/86 in 5.0 minutes**: all four
P11B journeys passed and the sole failure was unchanged `transactions.spec.ts:1379` T021c waiting
five seconds for `3 selected` after Shift-click.

The immediately following isolated diagnostic was **2/3**, with the third repetition failing at the
identical assertion. Therefore the implementation's 3/3 was a truthful observation but did not
establish stability. This is the same counterexample already preserved by P02 review 01.

The literal P11B diff changes no selection hook, selection state, Shift-click callback, checkbox
handler or T021c test. Its `TransactionTable` delta only adds the description edit-origin argument
and forwards it through description callbacks. It cannot causally explain the old selection miss.
Existing R-009 and P13 own the defect; P21 must reject it if still present. Both red and green runs
remain visible, and no retry converted a failure into a pass. This note is not a green full-suite
claim and does not weaken P11B's independently green interaction gates.

## Independent automated validation

| Check                                                                    | Independent result                                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Focused component + production-action integration, three separate runs   | PASS each run, 2 files / 9 tests; existing non-failing React `act(...)` warnings were emitted by the integration test. |
| `pnpm test`                                                              | PASS, 56 files / 1,226 tests.                                                                                          |
| `pnpm lint`                                                              | PASS, 0 errors / 10 inherited warnings.                                                                                |
| `pnpm typecheck`                                                         | PASS.                                                                                                                  |
| `pnpm build`                                                             | PASS, production build / 17 routes.                                                                                    |
| Scoped `oxfmt --check` over all 11 range paths                           | PASS.                                                                                                                  |
| `git diff --check BASE..HEAD`                                            | PASS.                                                                                                                  |
| Changed description-alias E2E, `--workers=1 --retries=0 --repeat-each=3` | PASS, 12/12 in 1.0 minute.                                                                                             |
| Full E2E, `--workers=1 --retries=0`                                      | 85/86 in 5.0 minutes; only unchanged T021c failed; every P11B journey passed.                                          |
| Exact T021c, `--workers=1 --retries=0 --repeat-each=3`                   | 2/3; same known Shift-click timeout.                                                                                   |

The full run also emitted existing session/auth teardown and intentional offline-test server logs in
unrelated import/onboarding/transaction/undo journeys. The fresh P11B manual session had only 200
API/realtime responses and zero console errors, so those aggregate logs are not evidence of a P11B
plaintext leak or failed alias operation.

## Independent installed-CLI accessibility, responsive and privacy evidence

- Used only the repository-installed headless `playwright-cli` with disposable session
  `p11b-review-r01`, the real Next application and local Supabase. No route was mocked. The
  generated recovery phrase and derived server-only local secret were never read, printed or
  returned.
- Created aliases through Tx Descriptions and manual transactions through the rendered add row. Real
  pointer/caret, listbox selection state, keyboard close, modal copy/default/trap/Escape,
  focus/caret restoration, shared existing-target change-all and one-step Undo behaved as described
  in F-01 through F-04.
- At 390x844, Add Transaction and the transaction grid remained visible and the page root had no
  horizontal overflow. Reduced-motion media emulation was active. Named textbox, listbox, option,
  dialog and button roles/states were present in deterministic accessibility snapshots.
- A supplemental CSS `html.style.zoom=2` probe put the fixed autocomplete portal outside the
  viewport because element rectangles and the portal were both CSS-scaled. That technique is not
  equivalent to browser 200% zoom and is not treated as a product result. The stricter 390 px real
  layout and frozen modal zoom evidence remain valid; P21 should use actual browser zoom tooling if
  available rather than infer from CSS double-scaling.
- The CLI reported four console messages, zero errors and zero warnings. All listed API, sync and
  realtime requests were 200. The observed manual push contained no known plaintext.

## P11C deferral boundary

This PASS covers P11B's interaction checkpoint only. It does not certify P11C's large virtualized
alias-map performance, complete import provenance after refresh, duplicate-tab/concurrent edits,
offline/reconnect matrix, cross-session convergence or exhaustive integrated management/import/
manual flows. P11C remains mandatory before HS-004 or its scratch marker can pass.

## Questions and risk adjudication

Q-016 remains the canonical trim-plus-NFC, case-sensitive matching decision and is used by every
planner/action path reviewed here. Q-017 remains the canonical stale-intent/non-resurrection repair
decision; P11B routes through those named actions and does not reopen raw repair state. No new
ambiguity requires a Q proposal.

- R-006/R-030/R-031: P11B retains the P11A legal one-hop graph, public wire isolation, named atomic
  action and typed-failure boundaries; P11C must retain them under integrated concurrency/refresh.
- R-010: native caret, visible focus, combobox roles/states, keyboard transitions, exact modal trap
  and restoration, narrow layout and reduced-motion behavior passed independently.
- R-028: manual insertion and every shared scope choice remain one complete named action and one
  Undo unit.
- R-008: only the intended interactive cell mounts a listbox, but large-map/continuous performance
  remains owned by P11C/P16D/P21.
- R-009: T021c remains open and explicitly routed to P13/P21 under N-001.

## Boundary, frozen-source and cleanup verification

- Final product/test HEAD remained exactly `e35109dfe7b02bdb4058445f44d03a6dd678457b` and the index
  remained empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P11B/implementation-01.md`.
- Scratch remains SHA-256 `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350
  lines / 24,245 bytes. HS-004 remains unchecked; the authorized marker set is unchanged and all 21
  normalized blocks remain represented by SCOPE.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes with 22 requirements.
- Removed all three disposable manual rows through visible two-click controls; Tx Descriptions then
  had zero active alias rows. Closed the browser, invoked session data deletion, and verified
  `playwright-cli list` reports no browsers.
- Stopped the task-owned dev server. No task-owned Next, Playwright test or CLI process remains.
  Exact generated `.playwright-cli` and `test-results` directories were moved to trash;
  `playwright-report` was absent. Generated `next-env.d.ts` was restored byte-for-byte.
- This review artifact is the sole reviewer-authored path and is intentionally uncommitted. I made
  no product, test, evidence, ledger, source, marker, configuration or prior-review edit.

## Single final verdict

**PASS.** P11B revision 01 satisfies the exact interaction checkpoint over the literal immutable
range. Root may integrate this evidence/review and mark P11B only passed. The T021c red remains an
honest open R-009/P13/P21 diagnostic, and HS-004 must remain unchecked until P11C independently
passes and root completes its integration gate.

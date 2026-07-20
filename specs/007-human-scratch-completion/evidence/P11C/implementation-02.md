# P11C Implementation Evidence — Revision 02

## Immutable dispatch boundary

- Package/scope/revision: `P11C` / `HS-004` integrated behavior and performance checkpoint / `02`.
- Original cumulative BASE: `0426866fa66cc022efca6d74cd5088d586d3d11b`.
- Clean revision-02 pre-implementation HEAD: `8856951cf4d4428b4c15cda814b74a3da81bcbba`.
- Revision-02 implementation commit: `258f22af06c8a00b00d09f30c33f85f82377bc13`
  (`Preserve description alias lookup lifecycle`).
- Immutable review range for revision 02:
  `0426866fa66cc022efca6d74cd5088d586d3d11b..258f22af06c8a00b00d09f30c33f85f82377bc13`.
- Immutable failed review: `reviews/P11C-review-01.md`; revision 02 closes only F-01.
- Sole writable evidence artifact:
  `specs/007-human-scratch-completion/evidence/P11C/implementation-02.md`, created before product or
  test edits and intentionally left uncommitted.
- Initial index and untracked set were empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.
- Prior implementation/evidence/review artifacts, root ledgers, frozen sources, SCOPE, configuration
  and unrelated product/tests remained immutable.

## Status

Revision-02 implementation and worker validation are complete and ready for independent review. This
worker makes no PASS claim.

## F-01 counterexamples and diagnosis

- The first actual-provider regression mounted the production `VaultProvider`,
  `useDescriptionAliases()` and `useDescriptionAliasLookup()`. Before the fix, a selector-produced
  fresh legal collection caused a render/effect loop; two bounded test commands were explicitly
  interrupted after reproducing the hang.
- Caching by the raw Mirror alias-root identity stopped repeated local transaction conversions, but
  a transaction-only imported update still caused one conversion/build because Mirror reconstructs
  the root object on remote import. Raw object identity was therefore not the semantic boundary.
- A hook-local revision cache passed Vitest, but the compiled browser exposed a stronger
  counterexample: creating the first alias from an empty provider left the management UI stale. The
  isolated first-create browser case failed before the final fix.
- The final implementation moves the revision and legal-collection cache to provider scope. The
  empty-provider regression, focused lifecycle regression and the formerly failing compiled-browser
  first-create case all pass with that architecture.

## Product implementation

- `VaultProvider` now creates one provider-scoped `DescriptionAliasRevisionStore` per Loro document
  and supplies it through a private React context. Raw alias wire state remains private.
- The store subscribes directly to document events only while it has React subscribers. It advances
  its revision only when at least one event path begins with `descriptionAliases`; transaction,
  import and other vault paths do not invalidate alias work.
- The store owns a legal `DescriptionAliasCollection` cache keyed by that semantic revision.
  `toDescriptionAliasCollection(...)` therefore runs once on an alias revision and is skipped
  completely for unrelated Mirror notifications, including imported ones that reconstruct ordinary
  Mirror state.
- `useDescriptionAliases()` uses `useSyncExternalStore` for the revision signal, reads the current
  Mirror state and asks the provider store for the collection at that exact revision. A revision
  mismatch is rejected instead of publishing an internally inconsistent snapshot.
- Existing P11A legality, one-hop symlink, canonicalization, backlink and raw-wire-isolation logic
  is unchanged. Existing P11B/P11C interaction, virtualization and the T014a removal of the blur
  optimization are unchanged.

## Actual-context lifecycle measurements

The new regression uses the actual production provider and hooks rather than an inline selector
facsimile. It partially wraps the real domain conversion and lookup factory only to count calls.

- Empty provider: inserting the first alias publishes the alias and exact lookup with exactly one
  conversion and one lookup build; both collection and lookup identities change.
- Large legal graph: 1,000 active aliases (500 real plus 500 declared one-hop symlinks), including a
  decomposed/space-padded `Café`, two real transaction references and a backlink total of two.
- Three repeated local transaction-note edits plus a later transaction insertion: zero conversions,
  zero lookup builds and zero dependent-option builds; collection and lookup references remain
  identical.
- A separate peer exports an import-style transaction-only update. Captured document event paths are
  non-empty and all begin with `transactions`; importing it causes zero conversions, zero lookup
  builds and zero dependent-option builds, with identical collection/lookup references.
- Local alias rename: exactly one conversion, one lookup build and one dependent-option build.
  Canonical exact lookup, symlink resolution and backlink count remain correct.
- Undo and Redo: exactly one conversion, lookup build and dependent-option build each, with the
  correct old/new canonical exact result.
- Remote alias creation: exactly one conversion, lookup build and dependent-option build; the new
  option and exact lookup publish correctly.
- Subscriptions, peer Mirrors, React view and undo coordinator are explicitly cleaned up.

## Retained acceptance and browser gates

- Final compiled-browser isolated management first-create case: 1/1 in 11.2 seconds.
- Description-alias E2E with `--workers=1 --retries=0 --repeat-each=3`: 15/15 in 2.1 minutes.
- Large virtualized transaction E2E with `--workers=1 --retries=0 --repeat-each=3`: 3/3 in 1.4
  minutes.
- Full E2E with `--workers=1 --retries=0`: 87/87 in 5.4 minutes, including T014a and T021c.
- An earlier repeat attempt under the hook-local cache stopped after three real compiled-browser
  failures (first management create, cell option and shared modal). Those failures were retained as
  the browser counterexample; no retry or timeout was increased. The provider-scoped fix produced
  the green final runs above.

## Automation

| Command / gate                                                     | Result                                                                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final focused P11C set, three separate processes                   | 6 files / 22 tests passed in every process.                                                                                                                |
| `pnpm typecheck`                                                   | Passed.                                                                                                                                                    |
| `pnpm test`                                                        | 58 files / 1,234 tests passed.                                                                                                                             |
| `pnpm lint`                                                        | Exit 0, zero errors and the same 10 inherited warnings: TanStack incompatible-library warning, two unused query types and seven unused test imports/types. |
| `pnpm build`                                                       | Compiled, typechecked and generated all 17 routes.                                                                                                         |
| Scoped `oxfmt --check` over the two revision-02 product/test paths | Passed.                                                                                                                                                    |
| `git diff --check` over the two revision-02 product/test paths     | Passed.                                                                                                                                                    |
| Full `pnpm format:check` after evidence formatting                 | Expected inherited red only in seven root ledger/scratch files; product, test and this evidence are clean.                                                 |

## Repository CLI manual charter

- Used only the repository-installed `pnpm browser` with disposable session `p11c-r02`, the real
  Next application and local Supabase/realtime stack. The local realtime secret stayed in the server
  environment; no secret or recovery phrase was printed, revealed or copied.
- Created 106 aliases through the actual management controls in 9,456 ms. A composed `Café`
  duplicate of the existing decomposed/space-padded name was rejected with the rendered canonical
  duplicate message and no count increase.
- Imported 500 deterministic CSV transactions through the real upload, Columns auto-detection,
  Account/Default selection and Import controls in 1,453 ms.
- At rest, the 500-row transaction surface mounted 14 rows and 14 description inputs, with zero
  listboxes and zero options. A unique alias query mounted one listbox/option.
- While that exact suggestion remained focused, a second tab inherited the unlocked session and
  imported one transaction through the real import flow. The main tab advanced from 500 to 501
  transactions, retained the exact same option DOM node and active query, and the attached
  `MutationObserver` recorded zero option-tree mutations.
- A second-tab alias rename then updated the active option to the correct revised name with exactly
  one observed text mutation while retaining the same node, focus and query. This manual signal
  corroborates the exact conversion/build counters in the actual-context regression.
- Repeated lazy bottom expansion reached data index 500 in 1,644 ms with 18 mounted rows. The first
  edited row stayed pinned and focused with caret index 4.
- A management rename, Undo, Redo and hard reload produced the correct durable final alias and
  count.
- Desktop 1,440×900, mobile 390×844, dark/reduced-motion and 200% zoom checks retained the heading
  and management control; desktop, mobile main/document and 200% document widths had no horizontal
  viewport overflow.
- A plaintext sentinel rename produced eight inspected HTTP bodies and 25 inspected WebSocket
  frames; no inspected body/frame contained the sentinel. Only booleans/counts were returned.
- Final repository-CLI console inspection reported zero warnings and zero errors. Current product
  requests completed successfully.

## Cleanup and frozen boundaries

- Deleted all 501 transactions through repeated rendered select-all/bulk Delete/Confirm operations,
  then deleted all 106 aliases through each rendered Delete/Confirm control. The UI showed no live
  transactions and no live aliases and reached `Saved` before shutdown.
- Closed and deleted the disposable browser session; `pnpm browser list` reported no browsers.
  Stopped the task-owned dev server. Trashed `.playwright-cli`, `playwright-report`, `test-results`
  and `.next`; restored generated `next-env.d.ts` to its tracked content.
- Final frozen-boundary values are unchanged:
    - `specs/human-scratch.md`: SHA-256
      `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines, 24,245 bytes.
    - FS-001 canonical spec: SHA-256
      `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes.
    - `SCOPE.json`: SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines, 27,382 bytes.
- `git diff --name-only BASE..HEAD` for those three frozen paths is empty. No checkbox or frozen
  source was edited.
- Revision-02 commit contains exactly two authorized paths: `src/lib/crdt/context.tsx` and
  `tests/integration/description-alias-lookup-lifecycle.test.tsx`; 504 insertions and 9 deletions.
- Cumulative immutable review range contains 22 paths with 1,973 insertions and 185 deletions.
- Final index is empty. Expected worktree dirt is root-owned `HANDOFF.md`, `PROGRESS.md` and this
  sole uncommitted evidence artifact.

## Questions, risks and reviewer focus

- No new question proposal is required.
- Independent review should verify the exact cumulative BASE..HEAD range and specifically challenge
  subscription setup/teardown, first insertion into an empty provider, transaction-only imported
  events, alias-event filtering, Undo/Redo and remote alias publication.
- The revision deliberately uses semantic document event paths instead of Mirror object identity. If
  a future schema moves aliases below another root, the filter must move with that schema change.
- The full repository formatter remains red only for the seven inherited root ledger/scratch files;
  they are outside this worker's authority.
- This worker makes no PASS claim.

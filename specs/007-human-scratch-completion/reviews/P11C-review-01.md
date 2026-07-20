# P11C Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P11C` / `HS-004` integrated completion checkpoint / `01`.
- Literal reviewed range:
  `0426866fa66cc022efca6d74cd5088d586d3d11b..dd0727f3562d4a9e40669d6d64109174690286a1`.
- Frozen implementation evidence: `evidence/P11C/implementation-01.md`, SHA-256
  `b3f65574606ca0584c03dab3ecba840528fd139b6b521070394d29f56bf1f7c7`, 256 lines / 21,694 bytes.
- The range contains exactly the 15 authorized product/test paths in HANDOFF: 849 insertions and 73
  deletions. `git diff --check BASE..HEAD` passes.
- **Verdict: FAIL.** The integrated behavior, concurrency, privacy, history, virtualization and
  browser matrices are green, but the production alias-selector lifecycle defeats the package's core
  stable-index performance contract: every unrelated vault notification allocates a new legal alias
  collection and therefore rebuilds the complete alias lookup and its dependent page data. HS-004
  must remain unchecked. Root must request a revision-02 implementation and independent review; this
  failed review is immutable.

## Findings

### F-01 — BLOCKING: unrelated vault updates rebuild the complete alias index and dependent row data

The new index is efficient only after it has been built. `createDescriptionAliasLookup()` performs
one whole collection pass and one declared-backlink pass
(`src/lib/domain/description-aliases.ts: 139-174`), and `useDescriptionAliasLookup()` memoizes that
work against the legal collection object identity
(`src/components/features/description-aliases/useDescriptionAliasLookup.ts:11-15`). The production
identity supplied to that hook is not stable:

1. `useDescriptionAliases()` selects by calling `toDescriptionAliasCollection()`
   (`src/lib/crdt/context.tsx:187-191`).
2. That conversion always loops the complete raw alias record and returns a newly allocated
   `Object.fromEntries(...)` object (`src/lib/domain/description-aliases.ts:94-106`).
3. The installed `loro-mirror-react` selector subscribes to the whole Mirror store and executes the
   selector for every store notification, then calls `setValue(newValue)` without equality or
   structural-sharing suppression (`node_modules/loro-mirror-react/src/hooks.tsx:184-200`).
4. The fresh legal collection invalidates `[aliases]`, rebuilding the full lookup. The fresh lookup
   then invalidates `availableAliasOptions` (`transactions/page.tsx:113-121`) and `tableData`, which
   remaps all displayed transactions (`transactions/page.tsx:191-234`).

The counterexample is deterministic and uses the actual production callback chain: one unrelated
transaction mutation emits one Mirror notification; the selector performs one full legal-collection
conversion; the lookup performs one full alias-index rebuild; the transaction page performs one
options rebuild and one displayed-row remap. Repeating `N` transaction-only actions yields `N`
equivalent alias conversions/index rebuilds despite zero alias changes. With the package's 10,000
alias scale, routine amount, status, note, tag, transaction-add/delete, import and remote-update
notifications all pay the whole alias-map cost.

The added identity test does not cover this lifecycle. It renders `useDescriptionAliasLookup()` with
a plain collection prop, rerenders the identical object, then a spread object
(`tests/unit/components/description-alias-interactions.test.tsx:100-113`). It never mounts the real
`VaultProvider`/`useDescriptionAliases()` path and never emits an unrelated Mirror mutation. It can
therefore remain green while production rebuilds on every notification. The pure 10,000-alias test
proves bounded construction, not stable reuse.

This directly violates P11C's mandatory “stable reused/memoized lookup” and “do not rebuild
equivalent maps” gates and the HANDOFF rejection rule for helper-only performance evidence. The
successful browser timing does not waive the structural defect: its 100-alias UI dataset is too
small to prove that a 10,000-alias index remains untouched during unrelated live updates.

#### Required revision-02 remediation and acceptance

- Preserve one legal alias-collection identity and one `DescriptionAliasLookup` identity while the
  underlying alias collection has not changed. Do not merely intern the final lookup after first
  rescanning/reconverting the complete aliases on every vault emission.
- Keep the legal public boundary from P11A: raw wire alias states must not be re-exposed to
  application consumers. A selector/cache keyed by a genuinely stable raw-alias revision or identity
  is acceptable; changing the public hook back to the raw union is not.
- Add an actual-context regression using the real `VaultProvider`, `useDescriptionAliases()` and
  `useDescriptionAliasLookup()`. Seed a large legal alias graph, capture collection/lookup identity
  and conversion/build counts, perform unrelated transaction operations through production actions,
  and prove zero alias reconversions/rebuilds and stable lookup identity. Then mutate an alias and
  prove exactly one rebuild with correct resolution/options/counts.
- Include repeated local transaction edits and a remote/import-style update so the test covers both
  local and subscribed Mirror notifications. Preserve one action/operation/Undo semantics and all
  P11A/P11B privacy and legal-graph boundaries.
- Re-run the focused tests three times, the changed alias and large virtualization browser cases
  three times with retries disabled, the full unit/E2E gates, and a real installed-CLI scale probe.
  The scale evidence must measure the production selector/index lifecycle, not only a pure helper.

No other blocking product finding was found in the exact range.

## Integrated behavior and invariant audit

- The built lookup uses O(1) exact-name and ID resolution after construction, resolves only legal
  active records, deterministically breaks duplicate exact names by ID, follows only declared legal
  real-alias backlinks, and precomputes total group counts. It does not scan the full alias map per
  rendered row.
- The transaction and management pages consistently use the shared lookup for autocomplete, planner,
  modal, displayed-alias resolution and group counts. Inactive and focus-only cells do not filter
  the options; only the focused edited cell mounts the suggestion surface.
- The virtualizer retains its normal bounded range and adds at most one stable focused index. The
  independent 500-row real-browser repetitions retained focus/caret while scrolling and kept the
  mounted set bounded.
- The four real-Mirror conflict matrices use two independent documents, one local action per peer,
  exchanged updates, deterministic repair/re-exchange, legal reopening and local-history checks.
  Imported raw descriptions remain immutable, manual transactions retain empty raw/import
  provenance, remote management work survives local Undo, and stale Redo invalidation follows the
  accepted Q-017 policy.
- The changed two-tab E2E exercises simultaneous rename/change-one, delete/change-all,
  offline/reconnect and local Undo/Redo. The alias suite also covers hard refresh, imported/manual
  provenance, shared remove-all and history. These passed independently without retries.
- P11A's legal one-hop graph, raw-wire isolation and named atomic actions, and P11B's native input,
  lazy autocomplete, exact/new/single/shared planning, focus restoration and manual alias-only
  storage remain intact. F-01 is a performance/lifecycle failure, not a claim that those behavior
  paths are incorrect.

## Independent automated validation

| Check                                                            | Independent result                                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Focused P11C set, three separate processes                       | PASS each run, 5 files / 20 tests; existing non-failing React `act(...)` warnings were emitted by production-action integration tests. |
| `pnpm test`                                                      | PASS, 57 files / 1,232 tests.                                                                                                          |
| `pnpm lint`                                                      | Exit 0, 0 errors / 10 disclosed warnings, including TanStack Virtual's compiler warning.                                               |
| `pnpm typecheck`                                                 | PASS.                                                                                                                                  |
| `pnpm build`                                                     | PASS, production build / 17 routes.                                                                                                    |
| Scoped `oxfmt --check` over all 15 range paths                   | PASS.                                                                                                                                  |
| `git diff --check BASE..HEAD`                                    | PASS.                                                                                                                                  |
| Description-alias E2E, `--workers=1 --retries=0 --repeat-each=3` | PASS, 15/15 in 2.0 minutes.                                                                                                            |
| Large transaction E2E, `--workers=1 --retries=0 --repeat-each=3` | PASS, 3/3 in 1.4 minutes.                                                                                                              |
| Full E2E, `--workers=1 --retries=0`                              | PASS, 87/87 in 5.4 minutes.                                                                                                            |

The full E2E emitted expected intentional offline/auth/realtime diagnostic logs from existing
journeys but no test failed. Unlike the frozen implementation run, independent review obtained a
completely green T021c in suite order; this does not close R-009 globally, but it introduces no P11C
failure or retry masking.

## Independent installed-CLI manual evidence

- Used only repository-installed `pnpm browser` with a disposable `p11c-review` session, the real
  Next application and local Supabase/realtime stack. The local realtime secret remained an
  in-process environment value; no secret or recovery phrase was printed or revealed.
- Created three aliases through the rendered management controls. Rename, one-step Undo, one-step
  Redo and hard reload produced the expected final alias and count.
- Created a real manual transaction by typing a partial alias query and selecting the sole rendered
  suggestion. At rest the rendered transaction had zero listboxes, zero options and no `title` raw
  provenance attribute. The visible alias and transaction count were correct, and the corrected live
  session reported zero console errors and zero warnings.
- A CLI-created second tab did not clone session authentication and correctly redirected to
  `/unlock`; it was not used as concurrency evidence. The exact live duplicate-tab matrix is instead
  independently covered by the changed no-retry E2E above.
- Deleted the disposable transaction through its visible two-click control and deleted all three
  aliases through management; the final active alias count was zero. Closed the CLI session and
  verified `pnpm browser list` reports no browsers.

## Questions and risk adjudication

Q-016 trim-plus-NFC, case-sensitive matching is applied consistently. Q-017 stale-intent
non-resurrection behavior is retained in the two-peer repair/history matrices. No new product-policy
ambiguity requires a Q proposal: F-01 is a direct failure of the already explicit performance
contract.

- R-006/R-028/R-030/R-031: legal graph, atomic action, history, raw privacy and two-peer behavior
  passed independently.
- R-010: the repeated real-browser cell/listbox and focused virtualization paths passed.
- R-008: remains blocking for P11C because production selector churn reconstructs the supposedly
  stable index on unrelated updates.
- R-009: full E2E happened to pass 87/87 independently; existing cross-package risk ownership is
  unchanged.

## Boundary, frozen-source and cleanup verification

- Final product/test HEAD remained exactly `dd0727f3562d4a9e40669d6d64109174690286a1`; the index
  remained empty. Before this review file, dirt was exactly root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md` and frozen untracked `evidence/P11C/implementation-01.md`.
- Scratch remains SHA-256 `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350
  lines / 24,245 bytes. HS-004 remains unchecked; the passed marker set remains
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines / 25,441 bytes.
  `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines / 27,382 bytes with 22 requirements.
- Stopped the task-owned dev server. No task-owned Next, Playwright-test or CLI browser process
  remains. Removed the exact generated `.playwright-cli` and `test-results` directories and restored
  generated `next-env.d.ts` byte-for-byte; `playwright-report` was absent.
- This review artifact is the sole reviewer-authored path and is intentionally uncommitted. I made
  no product, test, evidence, ledger, source, marker, configuration or prior-review edit.

## Single final verdict

**FAIL.** P11C revision 01 does not satisfy the stable production lookup/index lifecycle required
for HS-004. Root must preserve this failed review, leave HS-004 unchecked and dispatch revision 02
for F-01 remediation and exact-range re-review. All behavior, concurrency, privacy, virtualization
and automated gates listed above are green but cannot waive the blocking performance contract.

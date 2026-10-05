# Fusion mission recovery

This branch recovers the surviving work for **Refine transaction editing and simplify automation
rules**, mission `M-MTPN1LI4-0001-JANZ`, onto the grid/inspector implementation merged in PR #63
(`5bff352`). It is a recovery of partial work, not completion or approval of the mission.

## Specification and outstanding implementation

[The recovered specification](specification.md) contains all three saved milestones, seven slices,
and 21 original feature descriptions and acceptance criteria. It was exported read-only from the
project-scoped Fusion database. The original interview transcript was not available; the saved plan
is not presented as the human's verbatim words.

The ownership prototype is reviewable at
`specs/016-automation-interaction-contract/ownership-approval.html`. Its semantic revision remains
`OWN-2026-09-07-r2`; the contract/HTML digest and empty approval record are preserved. Opening or
testing the prototype, recovering this branch, and merging this PR do not constitute approval of its
proposed decisions.

Grouped-rule storage, the common editor, split-output behavior, inclusive Update new dates, nullable
numeric editing and the remaining table refinements are still outstanding against the recovered
specification. Existing grid features from PR #63 are the integration baseline, not Fusion-delivered
implementations of those requirements. The prototype demonstrates ownership decisions; it is not the
complete requested automation editor mockup.

## Recovered work and provenance

| Task   | Original commits                                                 | Disposition                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MF-001 | `29a61b5`                                                        | Matching audit and domain/CRDT characterization tests recovered.                                                                                                                            |
| MF-002 | `1075230`                                                        | Ownership contract and tests recovered through the more complete MF-007 revision.                                                                                                           |
| MF-003 | `2e64ee9`, `dc3f083`                                             | Scope/deletion/import/preference integration tests recovered. Its promised scope-and-automatic-application document was not delivered. Old component tests retained as historical evidence. |
| MF-004 | `af82265`                                                        | Indexable Realtime read policy, cleanup/error handling, environment diagnostics, and security regressions recovered.                                                                        |
| MF-005 | `23381dd`                                                        | Both matching audits, executable contract checks, and mobile automatic-application journey recovered.                                                                                       |
| MF-006 | Source-free local operation                                      | Guarded runner, selector, and 23 isolated-database tests recovered under `scripts/maintenance/fusion-fixtures/`. No old manifest or database dump is published.                             |
| MF-007 | `c3e4b97`, `270b3a7`, `d6581c9`, `b03af29`, `2bec6da`, `0b3a7b0` | Latest ownership contract, interactive prototype, revision/approval manifest, and unit/browser checks recovered. Approval remains absent.                                                   |
| MF-008 | `26a40f2`                                                        | Future snapshot-fixture provenance convention and regression guard recovered.                                                                                                               |

The dependency-content imports `52baa3e` and `6cb5861` duplicated MF-004's tree content; they are
not package upgrades and are not applied a second time. No package manifest or lockfile is changed.

## Integration with the newer grid

Fusion branched from `3bc789c`, before the grid/inspector changes. Recovery preserves the newer grid
rather than restoring its retired proposal and robot components.

- `historical/TransactionRuleProposal.tsx.txt` and `historical/TransactionRuleRobot.tsx.txt` are
  verbatim source snapshots from `3bc789c`. The matching audit now points to these snapshots for its
  historical component observations. All other observations retain their original audited revision;
  source-line bounds alone do not prove a current behavior remains unchanged.
- `historical/mf-001-mf-005-auto-apply.test.tsx.txt` is the complete test file at `23381dd`;
  `historical/mf-003-auto-apply.test.tsx.txt` is the complete test file at `dc3f083`. These preserve
  both independent sets of component characterizations, including their old timer/unmount
  observations. They are historical evidence, not active tests or claims about today's controller.
- Current `tests/unit/components/rule-proposal-auto-apply.test.tsx` is preserved from PR #63. It
  tests controller-owned finalization, rejected commits, owner exit, deletion and focus/reveal
  handling. Current inspector/page tests continue covering DOM ownership and focus. The old
  queued-write-after-unmount hazard is not reinstated as a requirement.
- The mobile automatic-application journey now opens the real inspector, scopes its controls, and
  asserts display cells rather than the removed always-mounted tags editor.
- The existing import-lineage journey now uses keyboard entry for its focus-tooltip assertion.
  Double-clicking already focused the editor and suppressed the Radix focus tooltip, so the old
  redundant `focus()` call could not establish the required keyboard focus event.
- Realtime security coverage retains PR #63's bounded foreign-vault probe and fixture-isolation
  tests, plus Fusion's unfiltered enumeration under concurrent owner churn. Cleanup uses
  transaction-local trigger bypass and explicit child-first deletion, retaining both error detection
  and complete cleanup.
- E2E uses one configurable local origin for its managed server, extra contexts and browser init
  scripts, including the localhost match pattern of the tab-duplication test extension.
  `MONEYFLOW_E2E_PORT=3107 pnpm test:e2e --workers=1 --retries=0` runs the actual suite against this
  checkout while the developer's port-3000 server remains untouched.

## Operational result, not a new purge

MF-006's retained report records deletion of 917 vaults, 1,783 operations, 146 grants and 36
memberships. A read-only check on 2026-10-05 found zero of its 917 manifest vault IDs still present.
The report says 67,629 snapshot-bearing vaults were deliberately left unclassified. Neither the new
provenance convention nor this recovery authorizes treating those historical rows as fixtures.

The original dump, manifest, confirmation and payload-bearing evidence stay in the original
checkout's private task attachments. This PR includes reusable code and aggregate results only. The
original runner hash was `429eca7d` (prefix); formatting the recovered scripts changes their hash.
Old confirmation records must never be reused with the recovered runner. Its manifest/runner binding
checks remain intact. Recovery runs only the isolated-database tests, not the shared-data purge or
vacuum commands.

## Dependency-upgrade task search

On 2026-10-05 the project-scoped live and archive stores contained MF-001 through MF-018, with no
dependency-upgrade task. The saved mission contains no dependency-upgrade feature. The available
planning/interview session stores have no original interview transcript to recover. Separate
Dependabot PRs #62 (Next.js), #59 (Python idna), and #64 (Python anyio) exist, but they are not
Fusion tasks and are not included in this mission recovery. This establishes what is recoverable
here, not that a request was never made elsewhere.

## Verification

Verified on the recovery tree on 2026-10-05:

| Check                                                                     | Result                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm typecheck`                                                          | Pass                                                                       |
| `pnpm lint`                                                               | Pass; one existing React Compiler advisory in `TransactionVirtualRows.tsx` |
| `pnpm format:check`                                                       | Pass                                                                       |
| `pnpm test`                                                               | 190 files passed; 3,541 tests passed, two existing skips                   |
| `MONEYFLOW_E2E_PORT=3107 pnpm test:e2e --workers=4 --retries=0`           | 228 passed, no retries, 4.2 minutes                                        |
| `node --test scripts/maintenance/fusion-fixtures/purge-fixtures.test.mjs` | 23 passed; isolated test-owned databases only                              |

The recovered approval artifacts and four historical snapshots were compared byte-for-byte to source
commits. Every original feature description and acceptance criterion was checked against the
recovered specification and PR description.

An initial browser run exposed the old import-lineage focus-tooltip setup; its correction passed
three consecutive targeted runs. A subsequent full run exposed the tab-duplication extension's old
port-3000 match. After that fixture correction, its targeted check and the final full 228-test suite
passed. Interrupted and failed exploratory runs are not counted as passing suites.

Historical gate results in the recovered audit/ownership documents retain their original revision
and do not substitute for the recovery checks above. These results do not approve the proposed
ownership semantics or claim completion of the original mission.

# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P12 / 01
- **Scope IDs:** HS-005 only; bounded requestAnimationFrame maintenance for duplicate transaction
  buckets and description-alias symlinks; HS-005 remains incomplete and unchecked
- **State:** changes_requested; revision-01 implementation and failed review are immutable; HS-005
  remains incomplete and unchecked
- **Task:** `tasks/HS-005-background-gc.md`; exact 6-line HS-005 block in SCOPE
- **Dependencies:** P09/02 and P11A–C are passed; P12 is independent of blocked P05/P08/P10
- **Literal original BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Literal committed product/test HEAD:** `f9edda60afc946ddda927616a16435a075167d7c`
- **Committed range:** seven authorized paths, 1,798 insertions/3 deletions; product commit
  `Implement bounded vault background maintenance`
- **Frozen implementation evidence:** `evidence/P12/implementation-01.md`, SHA-256
  `f67fec9718efadcd1bf7d3f8036b29afab68d5a618985f899ec328511ea2d452`, 256 lines/19,209 bytes
- **Implementation summary:** one pure/resumable transaction→bucket→alias cursor; 32-item/4ms
  default frame budget; provider/document lifetime owner; `system:gc` origin; copy-before-remove
  conflict-bucket consolidation; same-ID concurrent-copy deduplication; direct parent/nested one-hop
  alias rewrites; apply-time full proof before hard deletion; provider-session changed-alias barrier;
  fake-frame/property/real persistence/sync/Undo/no-echo coverage.
- **Worker validation:** final full Vitest 1,247/1,247; typecheck; lint zero errors/10 known warnings;
  scoped format; affected four-journey no-retry matrix 12/12 at three repeats; full explicit no-retry
  E2E 87/87. A corrected real installed-CLI charter records role/name/state, scroll/edit/history,
  navigation/reload, visible duplicate tab, offline/reconnect, mobile/media/zoom, console/network and
  cleanup. Worker makes no PASS claim.
- **Frozen boundary:** scratch SHA
  `2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, checked set
  HS-002/HS-004/HS-006/HS-010/HS-014/HS-017/HS-018, all 21 normalized blocks exact; FS-001
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes;
  SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`
- **Literal reviewed HEAD:** `f9edda60afc946ddda927616a16435a075167d7c`
- **Range type:** first complete P12 implementation range
- **Implementation evidence:** `evidence/P12/implementation-01.md`, SHA-256
  `f67fec9718efadcd1bf7d3f8036b29afab68d5a618985f899ec328511ea2d452`, 256 lines/19,209 bytes
- **Sole reviewer artifact:** `reviews/P12-review-01.md`
- **Review SHA-256:** `15ea3267d1fa9c425bacf3cbb95ce4f371bd48114e10fdda8c9e02859175fb77`,
  259 lines/19,663 bytes
- **Verdict:** FAIL — four blocking findings require revision 02
- **F-01 High:** copy and later removal are separate observable `system:gc` commits while production
  reads union conflict buckets without ID deduplication. Edit, delete or move in that interval can
  retain divergent copies, resurrect deleted data or leave one ID at two dates. Final-drain-only tests
  do not prove correct subscribed state at every commit.
- **F-02 High:** `sessionChangedAliasIds` is append-only for the provider lifetime, so ordinary
  current-session change-all sources never collect until remount. Replace it with Q-018's finite
  Undo-history reachability barrier and same-provider requeue.
- **F-03 High:** the 32-item/4ms loop checks time only before discovery; planning, recursive copy,
  mutation and whole-vault proof scans are unbounded, and every relevant edit restarts the first phase
  so later phases can starve. Revision 02 must bound real units and prove fair completion under edits.
- **F-04 Medium:** the new 256-conflict test assumes local concatenation order for CRDT peer ties and
  reproduced FAIL/PASS/FAIL in both focused and isolated three-process runs. Define a total order or
  assert the real documented invariant, then pass three clean processes.
- **Independent successes retained:** full Vitest happened green at 1,247/1,247; lint, typecheck,
  build, scoped format, targeted no-retry E2E 12/12 and full no-retry E2E 87/87 passed. Real installed-
  CLI lifecycle/history/sync/privacy work passed; dark preference and 200% zoom issues are inherited
  and remain routed to P20A/P20B, not waived or charged to P12.
- **Question routing:** review proposal `Q-PROPOSAL-P12-01-01` is transcribed as Q-018 with Option A,
  a finite per-alias live Undo/Redo history-reachability barrier, selected by the PROCESS hierarchy.

## Next root action

Persist the immutable revision-01 evidence/review, Q-018, risk updates and this failure state in one
exact-path control commit. Link that commit in a second root-only ledger commit, then dispatch P12/02
with one exact evidence path and cumulative review authority from the original BASE.

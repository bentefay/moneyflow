# Goal: Complete the Frozen Human Scratch Requirements

Implement, independently review, integrate and verify all 22 equally first-class requirements in
[SCOPE.json](SCOPE.json) according to [PROCESS.md](PROCESS.md), without pausing for human questions,
until all packages and the final audit are complete.

## Goal identity

- **Goal pointer:** `specs/007-human-scratch-completion/GOAL.md`
- **Frozen human-scratch source:** `specs/human-scratch.md`, ancestry commit
  `6c3456ce701228a15b193f11cf3c0c270aa8a56f`, working-copy SHA-256
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`, 21 selected blocks
- **Frozen allocation/settlement source:** entire
  `specs/008-transaction-percentage-allocations-settlement/spec.md`, lines 1–715, 25,441 bytes,
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`
- **First-class requirements:** 22; `HS-001`–`HS-021` and `FS-001`

ID prefixes record source provenance only. Every requirement has equal package state, evidence,
independent review, integration and definition-of-done gates. The 21 HS requirements additionally
use approved marker completion and a rolling checksum. FS-001 uses no checkbox/source mutation: its
entire canonical file remains byte-identical and root records completion only after P16A–E pass.
PROCESS verifies both sources at P00, every package boundary/recovery and P21.

## Non-negotiable operating rules

1. Root is coordinator and the sole writer/transcriber for global ledgers, configuration,
   FINAL-AUDIT, BASELINE, QUESTIONS and approved scratch markers. Root never implements product
   code.
2. Run one package/revision at a time using `human_scratch_implementer`, then an independent
   `human_scratch_reviewer`. Each dispatch names one exact revisioned writable artifact path.
3. P00 and P21 use [tasks/P00-baseline.md](tasks/P00-baseline.md) and
   [tasks/P21-final-audit.md](tasks/P21-final-audit.md). Their implementer is an evidence collector,
   may not edit product or ledgers, and normally hands off `BASE == HEAD` plus assigned evidence.
4. Every review receives literal immutable BASE and HEAD SHAs, the implementation evidence path and
   a new exact `reviews/<package>-review-<NN>.md` output path. An empty range is reviewable; changed
   product/test HEAD invalidates approval.
5. A failed review is persisted and never overwritten. Root routes product findings back to the same
   package/revision loop. A P21 failure first persists one complete rollback batch, moves impacted
   HS requirements through `rollback_pending` while their checked markers are removed, and only then
   leaves them `changes_requested`; affected packages and FS-001 are downgraded without an FS source
   edit. No remediation dispatch precedes batch completion. After full fix/re-review and requirement
   re-pass, root starts a new P21 revision. Never waive a material finding.
6. The reviewer must manually test the real app using the repository-installed headless
   `playwright-cli`, inspect browser console and network traffic, judge UX quality, audit applicable
   `.claude` guides, require meaningful E2E tests, repeat tests with retries disabled, and record
   deterministic accessibility evidence. Scoped CLI run-code/eval is allowed only as PROCESS states.
7. Do not ask the human questions or pause for ordinary ambiguity. Workers place complete `Q-*`
   proposals in their assigned artifact and continue with the safest reversible choice; root alone
   appends [QUESTIONS.md](QUESTIONS.md).
8. `passed` is assigned only by root after independent PASS, unchanged reviewed product/test HEAD,
   persisted revision artifacts, root ledger/question transcription and integration recording.
9. Preserve all unrelated/user-owned work and secrets. Never stage broad paths.
10. Check a scratch item only after every mapped package is passed. Root verifies the rolling
    checksum, changes only its leading `- []` marker to `- [x]`, byte-compares before/after, and
    records both checksums. Alias and automation remain unchecked until every subpackage passes.
11. Never edit the FS-001 canonical source for completion. P16A–E must all pass and its immutable
    hash must verify before root records its requirement-level PASS.

## Definition of done

The goal is complete only when:

- Every package in [PROGRESS.md](PROGRESS.md), including `P00` and `P21`, is `passed`.
- All 22 requirement-ledger rows are passed. Every HS item has independently approved evidence and
  an authorized checkbox without text changes; FS-001 has P16A–E evidence and a verified immutable
  canonical hash with no source edit.
- Focused and full validation required by the package tasks has passed.
- All changed E2E journeys pass repeated, retries-disabled flake checks.
- The complete E2E suite passes under the final audit and has no accepted unexplained flake.
- Final manual Playwright testing covers the complete high-level product journey, multi-tab and
  multi-user behavior, responsive/dark/reduced-motion UX, deterministic role/name/state snapshots,
  zoom/reflow and applicable contrast evidence, console, and network.
- Security, data migration, accessibility, performance, and UX risks are either resolved or have an
  explicit evidence-backed `blocked_external` disposition that does not falsely claim delivery.
- Scratch normalized blocks equal all 21 frozen `sourceTextLines`, its actual SHA equals PROGRESS's
  rolling checksum, and the whole FS-001 source matches its frozen SHA/line/byte metadata; every
  requirement completion, P21 invalidation, marker forward/rollback event and question transcription
  is recorded. No package/requirement or rollback event remains `changes_requested`/pending.
- [FINAL-AUDIT.md](FINAL-AUDIT.md) contains reproducible commands, results, SHAs, and a final
  verdict.

Do not mark the Goal complete merely because time or context is low. Recover from the durable files
and continue from `PROGRESS.md`'s next action.

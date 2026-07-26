# Sequential Implementation and Independent Review Process

## Owners and writable paths

The root coordinator is the sole writer of global control state: `AGENTS.md`, `.codex/agents/`,
`GOAL.md`, `PROCESS.md`, `PROGRESS.md`, `BASELINE.md`, `DEPENDENCIES.md`, `DECISIONS.md`,
`QUESTIONS.md`, `RISKS.md`, `HANDOFF.md`, `FINAL-AUDIT.md`, and authorized markers in
`specs/human-scratch.md`. During Goal execution root may inspect/run checks, persist worker
artifacts, and integrate reviewed commits, but it must not edit product code, migrations or tests.

Each implementer dispatch grants only:

- implementation paths explicitly listed in HANDOFF for a normal package; and
- one exact evidence file, `evidence/<PACKAGE>/implementation-<NN>.md`.

P00 and P21 grant no implementation path: their implementer is a read-only evidence collector that
may write only its assigned evidence file. Implementers never edit task contracts, review files,
global ledgers, agent configuration, QUESTIONS, FINAL-AUDIT, BASELINE or the scratch file.

Each reviewer dispatch grants exactly one new file, `reviews/<PACKAGE>-review-<NN>.md`. The reviewer
writes all sanitized evidence and proposed questions inside it and may edit nothing else. Failed and
passed review files are immutable after handoff.

## State machine and pass meaning

```text
queued -> implementing -> ready_for_review -> reviewing
                ^                                |
                |                                +-> FAIL -> changes_requested
                |                                                   |
                +---------------- revision NN+1 --------------------+

reviewing -> independent PASS -> root integration checks/transcription -> passed

passed package -- P21 finding invalidates acceptance --> changes_requested
passed requirement -- mapped package invalidated --> changes_requested
```

Operational states are `queued`, `implementing`, `ready_for_review`, `reviewing`,
`changes_requested`, `passed`, and `blocked_external`. Only root changes state.

`passed` means all of the following, not merely that an agent wrote PASS:

1. An independent reviewer wrote PASS in the assigned revisioned review file.
2. The literal reviewed product/test HEAD is unchanged; or, after review, only root-owned control
   files/artifacts and an authorized marker changed.
3. The implementation evidence and review are persisted; all findings are resolved.
4. Root transcribed required evidence, risks, decisions and proposed questions into global ledgers.
5. Root recorded the reviewed range and integration-control commit in PROGRESS.

## Revisioned artifact and commit contract

- Revision numbers are two digits starting at `01` per package. Evidence and review use the same
  revision: `implementation-01.md` and `P11B-review-01.md`.
- Root captures `BASE` before the first implementation attempt and a literal `HEAD` after the
  implementer's product/test commits. Re-review after fixes covers the original package BASE through
  the newest HEAD, including any intervening root control-artifact commits.
- Implementation evidence and review output remain uncommitted while being independently reviewed.
  Root persists them in an exact-path control/integration commit after FAIL or PASS.
- `BASE == HEAD` is an explicit valid no-diff range. The reviewer runs
  `git diff --exit-code BASE HEAD` to establish that fact, then reviews acceptance, environment and
  assigned evidence. Empty diff is neither automatic PASS nor a reason to skip the reviewer.
- The reviewer never commits. Root verifies `git rev-parse HEAD` still equals assigned HEAD before
  accepting the verdict. Any product/migration/test change requires a new HEAD and review revision.
- Root-only artifact/ledger/authorized-marker commits after PASS do not invalidate the product
  review; their exact paths and commit are recorded separately as the integration-control commit.

## Root coordinator loop for normal packages

1. Read GOAL, SCOPE, PROGRESS, HANDOFF, QUESTIONS, RISKS and the package task.
2. Run both frozen-source integrity checks below. Do not dispatch while unclassified drift exists.
3. Confirm dependencies are `passed`, choose the next revision and set exactly one package to
   `implementing`.
4. Capture original package BASE with `git rev-parse HEAD` and inventory all dirty/untracked paths.
5. Rewrite HANDOFF with literal BASE, allowed paths, exact evidence path and exact future review
   path. Do not spawn an agent while any required HANDOFF field says `pending`.
6. Dispatch `human_scratch_implementer`. It commits only authorized implementation changes and
   writes its assigned evidence file; it does not commit that evidence.
7. Verify its report and paths. Capture literal HEAD, dirty inventory and whether BASE equals HEAD.
   Set `ready_for_review` and freeze the evidence path.
8. Set `reviewing` and dispatch a distinct `human_scratch_reviewer` with package/revision, literal
   BASE/HEAD, task, evidence file and exact new review output path.
9. Verify HEAD and write boundaries when the reviewer returns.
10. On FAIL, persist the failed review/evidence without overwriting them, transcribe proposed
    questions, set `changes_requested`, and dispatch revision NN+1 to the same package. Re-review
    the original BASE through the new HEAD in a new review file.
11. On PASS, independently check the evidence, verdict and unchanged product/test HEAD. Persist
    artifacts, transcribe proposals, update ledgers, record the integration-control commit and set
    `passed` only when the pass definition is complete.
12. If every package mapped to one requirement is passed, complete its requirement-ledger row. For
    an `HS-*` item, perform the authorized marker procedure below and set the requirement `passed`
    only when its marker event finalizes. For `FS-001`, verify the canonical source remains
    byte-identical and record completion without editing it.
13. Rewrite HANDOFF for the next package and continue without waiting for human acknowledgement.

## P00 baseline lifecycle

P00 is governed by [tasks/P00-baseline.md](tasks/P00-baseline.md).

1. Root assigns revision 01, literal BASE, no product paths, `evidence/P00/implementation-01.md`,
   and `reviews/P00-review-01.md`.
2. The implementer acts only as baseline collector: it runs checks and writes evidence. HEAD
   normally equals BASE; it does not edit BASELINE or any product/test file.
3. The reviewer independently samples/repeats the checks and reviews the evidence with the same
   no-diff range. A truthful red baseline may PASS P00 when failures are fully reproduced,
   classified and routed; incomplete, inaccurate or non-reproducible evidence fails.
4. On PASS, root transcribes verified facts into BASELINE/PROGRESS/RISKS/DECISIONS/QUESTIONS,
   persists artifacts in an integration-control commit and sets P00 passed. P00 has no scratch
   marker.
5. On FAIL, root persists revision 01 and repeats P00 at revision 02. Environment/product defects
   are recorded and routed to P01 or the earliest owning package; the collector never fixes them in
   P00.

## P21 final-audit lifecycle and failure routing

P21 is governed by [tasks/P21-final-audit.md](tasks/P21-final-audit.md).

1. P21 starts only after every preceding package and all 22 requirements are passed, all authorized
   markers reconcile, and both frozen sources pass integrity checks. Root assigns literal BASE, no
   product paths, revisioned evidence and review files.
2. The implementer acts only as final-audit collector and writes proposed FINAL-AUDIT results to its
   evidence file. HEAD normally equals BASE; it does not edit FINAL-AUDIT or product/tests.
3. The reviewer independently reruns/samples the complete audit and writes PASS or FAIL.
4. Any failed check or material finding is FAIL. Root persists the immutable failed review and moves
   P21 `reviewing -> changes_requested`. Before another dispatch, root writes an impact record that
   names the finding, every actual owning package whose acceptance is contradicted or whose reviewed
   behavior remediation will change, every affected downstream package, and every impacted
   requirement. Allocation/settlement ownership routes to P16A–E, or P17A–D when the automation path
   owns the defect; cross-cutting style ownership routes to P20B. Never route to an unrelated
   default package merely to avoid invalidating a prior PASS.
5. Before downgrading any passed package, root durably persists the exact P21 rollback batch defined
   below: failed P21 review/revision, every actual owning/affected package, every impacted
   requirement, the complete ordered set of impacted checked HS IDs, and starting rolling scratch
   SHA. Only after that record exists does root move impacted packages
   `passed -> changes_requested`, put every batched HS requirement into explicit `rollback_pending`,
   and move impacted FS-001 `passed -> changes_requested` without a source edit.
6. Root sequentially completes every batched `[x] -> []` before normal fix dispatch. Each completed
   marker moves only its requirement `rollback_pending -> changes_requested`. No dispatch is allowed
   until the complete pending set is empty, its contiguous hash chain verifies, and the active batch
   is cleared. Requirements with other still-passed packages remain downgraded until all mapped
   packages pass again.
7. Fix and independently re-review every invalidated package through the normal revision loop, in
   dependency order and across the full original package BASE through newest HEAD. Re-pass an
   impacted requirement only after all mapped packages pass; an HS requirement then receives a new
   authorized `[] -> [x]` event, while FS-001 is re-passed only in the ledger with an unchanged
   source.
8. After all invalidated packages and requirements pass again, start P21 revision NN+1 from a new
   current BASE with new evidence/review paths. P21 remains `changes_requested` until that dispatch;
   no failed P21 artifact is overwritten or amended.
9. Only after P21 PASS does root transcribe verified results to FINAL-AUDIT and global ledgers,
   record the integration-control commit and set P21 passed. P21 has no scratch marker.

## Implementer checkpoint

The implementer must inspect existing behavior, follow applicable `.claude` guidance, implement real
production behavior, add appropriate unit/property/integration and meaningful journey E2E tests, and
run focused checks plus retries-disabled repeats. Its evidence records package/revision, BASE, HEAD,
empty/non-empty range, exact changed/dirty paths, commits, acceptance mapping, commands/results,
risks, and complete proposed questions. It never marks PASS or edits global state.

## Independent reviewer checkpoint

The reviewer must:

- inspect the entire literal BASE..HEAD and surrounding execution paths;
- map every acceptance criterion to code, automated tests and/or manual evidence;
- audit applicable `.claude` rules and reject weak/missing E2E, brittle selectors, sleeps, hidden
  retries, test-only hooks, inaccessible UI, security/data risks and flakiness;
- run focused checks and repeat changed E2E with `--retries=0` and appropriate `--repeat-each`;
- manually test the real app with repository-installed headless `pnpm exec playwright-cli` in a
  unique disposable session, inspecting console errors and suspicious/failed requests;
- cover task-relevant pointer/keyboard, focus, refresh/persistence, duplicate/multiple tabs,
  responsive sizes, dark/reduced-motion, empty/loading/error/offline and isolated users;
- record deterministic CLI snapshot evidence for accessible role, name and state of changed
  controls; test zoom/reflow and record computed contrast evidence for changed
  focus/error/status/text controls where applicable; and
- write explicit findings, reproduction, UX verdict and PASS/FAIL only to the assigned review file,
  then close/delete the CLI session and sensitive/generated state.

Manual testing must not use Playwright MCP, `npx`, standalone/ad-hoc Node scripts, temporary tests
or configs, headed mode, `--debug`, `--ui`, or `show`. The repository CLI's own `run-code` and
`eval` commands are narrowly allowed for browser observation/inspection, media emulation,
deterministic accessibility/contrast evidence and task-relevant interaction. They must not access
host secrets, write product state except through normal task interactions, or replace checked-in
automated tests.

Executable media/accessibility routes include:

```bash
pnpm exec playwright-cli -s=<session> run-code 'async (page) => { await page.emulateMedia({ reducedMotion: "reduce" }); }'
pnpm exec playwright-cli -s=<session> run-code 'async (page) => { await page.emulateMedia({ colorScheme: "dark" }); }'
pnpm exec playwright-cli -s=<session> resize 320 720
pnpm exec playwright-cli -s=<session> run-code 'async (page) => { await page.evaluate(() => { document.documentElement.style.zoom = "200%"; }); }'
pnpm exec playwright-cli -s=<session> snapshot
pnpm exec playwright-cli -s=<session> eval '(element) => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor })' e12
```

Replace `e12` with the exact element reference from that session's snapshot. Reset emulation/zoom or
use a fresh disposable session before the next matrix case. Snapshot evidence must state expected
and observed accessible role/name/state; contrast evidence records colors, ratio and threshold, not
merely “looks fine.”

## Questions without pauses

Workers never edit QUESTIONS.md. Any task instruction saying “route/log/record in QUESTIONS” means:
put a proposal in the worker's one assigned artifact for root transcription. Each proposal uses:

```markdown
### Q-PROPOSAL-<PACKAGE>-<REVISION>-<LOCAL-NUMBER> — Title

- Raised by/package/revision:
- Context and evidence:
- Why existing authority does not decide it:
- Options considered:
- Reversible default selected to continue:
- Decision-hierarchy basis:
- Impact and risk:
- Reversal or migration path:
- Human review still useful after completion:
```

Root alone assigns the next canonical `Q-XXX`, appends the complete record to QUESTIONS, includes a
source artifact link, and records the transcription in PROGRESS. If it duplicates an existing
question, root links that canonical entry instead of silently dropping or duplicating it.

The default hierarchy is:

1. Explicit frozen requirement or authoritative existing spec.
2. Established product behavior and repository convention.
3. Security, privacy, accessibility and preservation of user data.
4. Smallest reversible implementation with the narrowest future migration.

A preference gap is not a blocker. Stop only if continuing needs new authority, exposes secrets,
destroys data without a safe path, or fakes an externally unavailable API.

## Frozen-source integrity, semantic drift and marker procedure

PROGRESS records both immutable frozen-source identities, the scratch rolling working-copy SHA,
authorized checked HS IDs and drift state. At P00, before and after every package boundary, after
recovery/compaction, and at P21, root performs all of these checks:

1. **Scratch whole-file check:** actual `sha256sum specs/human-scratch.md` must equal PROGRESS's
   rolling SHA. A mismatch without an in-progress root marker event is real unclassified drift.
2. **Scratch normalized-block check:** locate the unique HS-001 first line, parse exactly 21 ordered
   top-level blocks beginning with `- [] ` or `- [x] ` through EOF, remove only the single
   structural blank line between blocks, and map them in SCOPE array order. Accept `[x]` only for a
   requirement whose ledger state is `passed`, or an ID in the exact pending set of the one active,
   durably logged P21 rollback batch whose state is `rollback_pending`. Accept `[]` for every other
   non-passed state. There is no other normal integrity exception. Normalize either accepted prefix
   to `- [] ` and require every line to byte-equal that item's `sourceTextLines`. A batch may
   contain several still-checked pending IDs; boundary checks validate all of them against that set
   while prohibiting dispatch. Any other count, order, text, whitespace, marker/state pairing or
   unlogged transition is real drift.
3. **Canonical feature-spec check:** actual SHA-256 of
   `specs/008-transaction-percentage-allocations-settlement/spec.md` must equal
   `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, and its exact metadata must
   remain 715 lines and 25,441 bytes. `SCOPE.json` must still select the complete lines 1–715 as
   `FS-001`. Any content or metadata difference is unclassified drift: stop dispatch, preserve
   evidence, and recover the canonical source without silently accepting or rewriting it.

An authorized forward marker update is executable only by root:

1. Confirm all mapped packages are passed, normalized blocks match, and actual SHA equals rolling
   SHA.
2. Append a root-owned `completion_pending` event containing the HS ID, exact pre-change SHA, mapped
   package reviews and intended `[] -> [x]`; while pending, no package dispatch is allowed. Copy the
   scratch file to a private `mktemp` path for comparison.
3. Use apply_patch to change exactly the item's first-line `- [] ` to `- [x] `.
4. Diff the temporary copy against the result. It must contain exactly that one marker-line change;
   then delete the temporary copy. Re-run normalized blocks and SHA.
5. Finalize the PROGRESS event with HS ID, `[] -> [x]`, before SHA, after SHA, package reviews and
   integration commit; set the requirement passed; update rolling SHA and authorized-ID metadata in
   the same root control commit.

### P21 invalidation and marker rollback

Root executes rollback immediately after a failed P21 impact analysis and before dispatching fixes:

1. Verify actual scratch SHA equals rolling SHA, all normalized blocks byte-match SCOPE, every
   impacted HS ID is checked and authorized, and FS-001 is unchanged. Before any downgrade, persist
   `rollback_batch_prepared` with a unique batch ID, failed P21 review/revision, every actual
   owning/affected package, every impacted requirement, all impacted checked HS IDs in SCOPE order,
   an empty completed list, and identical starting/current rolling SHA. No dispatch is allowed.
2. Activate the durable batch: put every listed HS requirement into `rollback_pending`, move every
   impacted package to `changes_requested`, and move FS-001 to `changes_requested` when impacted.
   FS-001 is never in the marker batch and receives no source or scratch edit. Integrity now permits
   all and only the still-pending batched HS IDs to remain checked while non-passed.
3. Process the first ordered pending ID. Require `[x]`, `rollback_pending`, authorized-ID
   membership, and actual SHA equal batch current rolling SHA. Copy scratch to `mktemp`; apply_patch
   exactly that marker to `[]`; require a one-line marker-only diff; delete the copy; normalize and
   byte-compare every block to SCOPE.
4. Calculate after SHA. Atomically append that ID's completed record—order, requirement,
   `[x] -> []`, exact before/after SHAs and P21 review—update batch/global rolling SHA, remove it
   from pending and authorized checked IDs, and set its requirement `changes_requested`. Remaining
   pending IDs stay `rollback_pending`/`[x]` and pass boundary integrity. Repeat; every before SHA
   must equal the prior after SHA, forming one contiguous chain from starting to current SHA.
5. When pending is empty, verify all batched IDs are `[]`, unauthorized and `changes_requested`; all
   normalized text matches; all package/FS downgrades are recorded; and the hash chain ends at
   actual rolling SHA. Append the immutable completed-batch event and clear the active batch to
   `none`. Fix dispatch remains forbidden until this completes.
6. Concrete P08 behavior: prepare one batch containing both HS-011 and HS-012 while both are
   passed/checked; activate both as `rollback_pending`; roll back HS-011 while HS-012 remains
   validly pending/checked; roll back HS-012; verify the two-link SHA chain; clear the batch; only
   then dispatch P08 remediation.
7. After every invalidated package has a full independent PASS and all packages mapped to the
   requirement are passed, use the normal forward procedure to record a new `[] -> [x]` event and
   re-add the HS ID. Re-pass FS-001 in the ledger only after P16A–E all pass and the canonical
   source identity verifies.

Recovery reads the durable batch before general integrity. A prepared batch resumes activation only
if actual SHA equals starting/current SHA and every listed ID remains passed/checked. For an active
or partial batch, require a contiguous completed hash chain, actual SHA equal recorded current SHA,
completed IDs `[]`/`changes_requested`, and exactly the remaining set `[x]`/`rollback_pending`;
resume the first pending ID. If a crash occurred after that ID's marker patch but before its ledger
update, only that first pending ID may already be `[]`; normalize/byte-check, calculate after SHA,
finalize its record, and continue. If pending is empty, finish step 5. Any other state/set/hash is
unclassified drift. Recover a forward `completion_pending` separately before normal integrity. No
dispatch occurs until every batch/pending event is finalized and cleared.

An unlogged marker change—even on a passed item—is unclassified drift until root reconciles and logs
it. `FS-001` never receives a source marker or any other source edit. SCOPE and both frozen source
identities/selectors never change during Goal execution.

## External gates, verification and recovery

`blocked_external` requires dated primary-source evidence, exact unavailable condition, safe work
and next recheck trigger. Continue independent packages and revisit before milestones/P21; never
fake an unreleased dependency.

Before recording or halting on any `blocked_external` gate, root first runs a stall diagnosis and
proves the blocking work traces to the mapped requirement's frozen `sourceTextLines` in SCOPE, not
merely to an accumulated decision, risk, review tangent or inferred sub-goal. A block that does not
trace to the frozen text is an over-scope, not an external gate: re-derive scope from the frozen
source, record a `Q-*` proposal, and continue on the safest reversible path rather than halting.
Because such a rescope reduces committed scope or supersedes a prior accepted decision, it is
surfaced loudly -- logged as a proposal and named in the status report -- and is never a silent
downgrade. Genuine halt-and-report is reserved for a block that both traces to frozen text and needs
a capability root cannot obtain, with no independent work left. When a single external gate stalls
the whole remaining graph, re-run this diagnosis on that gate before halting; a transitive freeze is
the signal to re-derive, not to stop.

Every package runs affected tests and relevant no-retry E2E/manual charter. High-risk milestones and
P21 run build, full unit/integration/E2E, migration/security checks. Diagnose every inconsistent
run; no arbitrary waits or accepted retry-dependent result.

After compaction/restart, recover from GOAL, PROGRESS, HANDOFF, current task/evidence/review,
DECISIONS, QUESTIONS and RISKS—not chat. Verify HEAD, dirty paths, artifact revision, rolling
scratch SHA, all 21 normalized scratch blocks, canonical FS SHA/line/byte identity, all 22
requirement-ledger rows, current package state, the exact prepared/active P21 rollback batch and any
`completion_pending` event before continuing. Deterministically finish and clear all pending marker
work using the recovery rule above before dispatch.

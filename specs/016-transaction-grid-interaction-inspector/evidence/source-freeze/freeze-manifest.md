# Transaction Grid Interaction and Inspector Proposal Freeze Manifest

## Status

- Source status: `APPROVED; IMMUTABLE IN THE CONTAINING SOURCE-ONLY COMMIT`
- Source review cycle 1: `REJECTED; CORRECTIONS APPLIED`
- Source review cycle 2: `REJECTED; CORRECTIONS APPLIED`
- Source review cycle 3: `HUMAN APPROVED; POST-COMMIT VERIFICATION PASSED`
- Human approval: `APPROVED 2026-08-24`
- Source-only commit: `67227d06de0545ea5f95e7ba827b670f8b0aa97a`
- Source amendment 001: `APPROVED; DEDICATED COMMIT COMPLETE; POST-COMMIT VERIFICATION PASSED`
- Source amendment 002: `DIRECT USER DECISION; BOUNDED RESTING VISUAL TREATMENT`
- Source amendment 003: `DIRECT USER DECISION; UNIFIED ALT NAVIGATION AND POPUP ESCAPE`
- Product implementation authority:
  `ACTIVE FROM BASE SOURCE PLUS TGI-AMD-001 AND DIRECT-USER AMENDMENTS 002 AND 003`

No product, test, package-manifest, dependency, configuration, prior frozen-spec, or agent-rule
change is admitted by this proposal manifest.

## Source-freeze base

- Current-HEAD preparation commit: `3bc789cee63d85d966c7c395e73f1bcd0bad04be`
- `specs/014-transaction-grid-v9/goal.md`: absent from that current HEAD.
- Historical spec 014 context commit: `2ac5a3f73e2bf576d548e036d2de4560261613f9`
- Historical spec 014 goal blob: `f04243b6e75e2ca5f865320ae621a545864277b5`
- Historical commit ancestry of current HEAD: `NOT AN ANCESTOR`
- Historical authority: `NONE`; context only.

## Proposed immutable source identities

These identities bind the source-review-cycle-2 corrected proposal. Approval must record these exact
bytes or reject the proposal. After approval and a source-only commit, each listed source artifact
is immutable; a change requires a new source revision and manifest.

| Source artifact           | SHA-256                                                            | Lines |  Bytes |
| ------------------------- | ------------------------------------------------------------------ | ----: | -----: |
| `goal.md`                 | `fd538fa6690b6d481dbe0c6add6e72c8a3e607cb2f2c479d8d9763d45f2268a8` |   182 | 10,586 |
| `interaction-contract.md` | `5fc553be334d562916c9c4fe798dcee4168b8164c531562447f09f321f60a041` |   600 | 44,953 |
| `source-disposition.md`   | `fc95ae0d558bf141d45758acf0a6f1109cd676521d6fc01299fcd88c41e3e7d5` |    60 | 13,538 |
| `replacement-coverage.md` | `81d99e6b74943221e04dab7b26df5c2b89665bc8c1774bb2bc687f94610c3212` |   158 | 37,857 |

Paths are relative to `specs/016-transaction-grid-interaction-inspector/`.

## Source amendment 001

Product slice 2A review found that the frozen source permits conflicting outcomes whenever there is
no current engagement: neutrality under `TGI-STATE-001` and `TGI-INSP-005`, or synthesized one-cell
engagement under an unconditional reading of `TGI-RECON-002` and `TGI-RECON-003`. The original
source is not rewritten.

| Amendment artifact                      | Acceptance ID | SHA-256                                                            | Lines |  Bytes | Status                                    |
| --------------------------------------- | ------------- | ------------------------------------------------------------------ | ----: | -----: | ----------------------------------------- |
| `amendments/001-idle-reconciliation.md` | `TGI-AMD-001` | `bfe997646884ae2b12dcce58af38cafa00e2db79770aa27872832e00a7ee68d0` |   416 | 21,350 | APPROVED; post-commit verification passed |

Independent amendment review cycle 4 returned `APPROVE`, and the user approved this exact identity
on 2026-08-24 through the source-gate prompt. Dedicated commit
`417e103def4e2a2b07caf7171a8e467de9e3bfab`, tree `72f583fbcdcf6539fbeb438bdfebc287a4cd20bd`,
contains the approved amendment identity and exactly the five authorized amendment/accounting paths.
Independent post-commit verification passed, so product authority is active. The amendment
acceptance record remains separate from the unchanged 146-key base registry.

## Source amendment 002

Direct user instruction on 2026-08-25 authorized `amendments/002-google-sheets-grid-treatment.md`,
titled “Amendment 002: Google Sheets Grid Treatment”. It overrides only the prior resting visual
treatment for the bounded shared geometry/chrome slice and creates no new approval gate. It has no
executable acceptance ID, does not change the 146 base records or the one executable Amendment 001
record, and does not modify the four frozen base source files.

## Source amendment 003

Direct user instruction on 2026-09-01 authorized
`amendments/003-unified-grid-navigation-popup-escape.md`, titled “Amendment 003: Unified Grid
Navigation and Popup Escape”. It supersedes only the scoped keyboard and top-level grid-editor popup
Escape clauses: Alt/Option arrows use the canonical reducer/controller path from every cell/editor
owner, Alt/Option+Shift extends the canonical range, and one Escape cancels the complete top-level
popup/editor while nested Create Account Selects retain their own arrows and first Escape. It has no
executable acceptance ID, creates no approval gate, leaves the 146 base records plus the one
executable Amendment 001 record unchanged, and does not modify the four frozen base source files.

## Mutable accounting files

These files are part of the source-only change but are not immutable requirement source. They may be
updated to record review, approval, implementation, and verification without silently changing the
four source identities above.

- `.agent-memory/transaction-grid-inspector/plan.md`
- `.agent-memory/transaction-grid-inspector/progress.md`
- `specs/016-transaction-grid-interaction-inspector/evidence/README.md`
- `specs/016-transaction-grid-interaction-inspector/evidence/source-freeze/freeze-manifest.md`

## Source review cycle 1 corrections

The corrected proposal resolves all eight rejected findings:

1. structural reconciliation atomically replaces old operations with one canonical one-cell
   inclusive operation, or empty selection plus `idle`;
2. a newer projection generation defeats restoration of generation-stale selection, window, scroll,
   mode, focus, and pins;
3. inspector focus has explicit engagement and popup ownership, focus-return, presence, close,
   Escape, and continuous-edit semantics;
4. replacement coverage inventories production components/hooks, unit/DOM/integration/E2E tests, and
   performance paths with a replacement oracle and negative proof for every row;
5. tag create-and-singleton-assignment is one failure-atomic Loro mutation, undo item, and
   automation transition;
6. normative clauses and every command row have immutable executable acceptance IDs and an exact
   expanded registry;
7. outside-pointer behavior defines capture, validation, commit/cancel, popup closure, focus, direct
   activation, and write ordering for every popup editor family; and
8. IME behavior covers composition start/update/end, composing and finalized input, exactly-once
   grapheme insertion, fallback deduplication, cancellation, and command resumption.

## Source review cycle 2 corrections

The narrow final correction resolves both rejected findings:

1. inspector focus retention now requires the same transaction owner and unchanged stable
   field/action binding. Owner change/disappearance invalidates every transaction-bound editable or
   actionable descendant before persistent DOM rebinding; fallback deterministically targets the
   stable heading while the inspector remains open, otherwise the reconciled gridcell, with empty
   results using the stable heading or after-grid control; and
2. replacement coverage inventories `virtual-grid-harness.ts`, `baseline.measure.ts`, and their
   complete immediate support boundaries. It separates fixed-row real-virtualizer/campaign behavior
   to preserve from variable measurement, `ResizeObserver`, and expanded-note geometry to retire,
   and requires revisioned source 016 performance evidence instead of writing to historical
   spec 015.

## Corrected-proposal verification

The source-review-cycle-2 corrected proposal was checked with:

- scoped `oxfmt --check` over all eight authored files;
- deterministic SHA-256, line, and byte verification for all four proposed immutable source files;
- exact acceptance-registry range expansion and equality between contract and evidence index;
- body-label presence for every contract acceptance key;
- owner-change focus-clause consistency and explicit heading/gridcell/empty-result fallback checks;
- explicit required-path and immediate-support coverage for the production/hook/test/performance
  replacement inventory;
- narrow changed-file equality against the eight authorized paths; and
- protected-path checks proving no `src/`, `tests/`, package/dependency/configuration, prior frozen
  spec, or agent-configuration tracked path changed.

The user approved these exact identities on 2026-08-24 through the source-gate prompt. Commit
`67227d06de0545ea5f95e7ba827b670f8b0aa97a` freezes them.

## Post-commit verification and amendment block

Independent post-commit verification passed for source commit `67227d06` and tree
`b91833201f005554622d3658cff1a58abf3de578`. The four SHA-256 identities above remain exact and the
commit contains the approved eight source/accounting paths.

Product slice 2A review cycle 1 was then rejected. It found an authority conflict, not merely an
implementation defect: neutral `idle` under `TGI-STATE-001` and `TGI-INSP-005` conflicts with an
unconditional reading of the one-cell/focus rules in `TGI-RECON-002` and `TGI-RECON-003`. Code
correction was paused until `TGI-AMD-001` was independently reviewed, human-approved, committed as
source-only amendment `417e103def4e2a2b07caf7171a8e467de9e3bfab`, and post-commit verified. Those
gates passed, so product authority is active.

Amendment review cycle 1 stopped before semantic grading because the recorded source-tree identity
had one extra trailing character. The accounting now uses canonical tree
`b91833201f005554622d3658cff1a58abf3de578`; cycle 1 did not accept or reject amendment substance.

Amendment review cycle 2 rejected three separate Medium findings: history-dependent idle semantics,
no generation-safe pending explicit-activation/Add reveal branch, and no closed executable amendment
evidence schema. The cycle-3 proposal makes idle history-independent, re-resolves only the explicit
stable-ID target across `G+1` with bounded materialization and neutral abort, bounds and atomically
clears or replaces its reveal pin, forbids fallback-cell synthesis, and requires runtime validation
of exact case, mutation, command, path, digest, and count records.

On 2026-08-24 the user authorized one focused amendment correction cycle 4 without approving the
amendment at that stage. The revised proposal adds an explicit `pending-activation` workspace state
with neutral or canonical engaged origin, origin-scoped `G+1` reconciliation and failure return,
exact pin bounds, and atomic fulfillment and cancellation. It adds separate clearing cases and
mutations, binds every negative proof to baseline, applied patch, derived mutated tree, named
failure, restoration, and passing rerun, and requires a matching independent `APPROVE` attestation
before amendment `PASS`. Independent review cycle 4 later returned `APPROVE`, the user approved the
exact amendment identity, and the dedicated commit completed. Independent post-commit verification
passed for the committed amendment identity and containing path set; product authority is active.

## Amendment review and human approval record

- Amendment acceptance ID: `TGI-AMD-001`
- Independent amendment review cycle 4: `APPROVE`
- Approver: `User`
- Approval decision: `APPROVED — selected “Approve and commit” in the source-gate prompt`
- Approval date: `2026-08-24`
- Approval provenance: `This Claude Code session's source-gate prompt`
- Approved amendment SHA-256: `bfe997646884ae2b12dcce58af38cafa00e2db79770aa27872832e00a7ee68d0`
- Approved amendment lines: `416`
- Approved amendment bytes: `21,350`
- Dedicated amendment commit: `417e103def4e2a2b07caf7171a8e467de9e3bfab`
- Approved amendment tree: `72f583fbcdcf6539fbeb438bdfebc287a4cd20bd`
- Post-commit amendment verification: `PASSED`

Approval and verification are recorded only in mutable accounting and do not change the approved
amendment bytes. Product correction is authorized within the combined source and amendment scope.

## Product slice 2A corrected-core review record

Bounded corrected-core review initially rejected the uncommitted pure implementation on five
verified findings. The focused correction:

1. requires a live current-generation callback for every projection snapshot and live read, checks
   caller, snapshot, and current generations, and reserves a separate private historical-position
   seam for reconciliation;
2. validates fulfill, cancel, and abort against current pending state plus exact command and
   generation identity, returning typed `stale-operation` for late work;
3. stores continuous quick/full intent canonically in navigating state and limits clearing to the
   five contract-approved stopping transitions;
4. makes inspector control and inspector-popup survival depend on row owner plus stable binding
   while preserving row-and-column validity for grid-editor draft and popup ownership; and
5. makes editable and activation key contexts mutually exclusive, with defensive printable and IME
   guards.

This correction does not change any approved source or amendment identity. It remains limited to the
unwired pure product/test slice and these mutable accounting records. Complete stable-tree
verification passed and bounded re-review returned `APPROVE`. Slice 2A is complete and authorized
for its exact reviewed commit.

## Base source human approval record

- Approver: `User`
- Approval decision: `APPROVED — selected “Approve and commit” in the source-gate prompt`
- Approval date: `2026-08-24`
- Approval provenance: `This Claude Code session's source-gate prompt`
- Approved source-only commit: `67227d06de0545ea5f95e7ba827b670f8b0aa97a`
- Approved source tree: `b91833201f005554622d3658cff1a58abf3de578`
- Independent source review: `POST-COMMIT VERIFICATION PASSED`
- Limitations or amendments: `TGI-AMD-001 approved; post-commit amendment verification passed`

Base-source human approval and post-commit verification remain recorded without changing any
identity-bound source artifact.

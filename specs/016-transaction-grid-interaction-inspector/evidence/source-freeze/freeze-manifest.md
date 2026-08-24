# Transaction Grid Interaction and Inspector Proposal Freeze Manifest

## Status

- Source status: `APPROVED; IMMUTABLE IN THE CONTAINING SOURCE-ONLY COMMIT`
- Source review cycle 1: `REJECTED; CORRECTIONS APPLIED`
- Source review cycle 2: `REJECTED; CORRECTIONS APPLIED`
- Source review cycle 3: `HUMAN APPROVED; POST-COMMIT VERIFICATION PENDING`
- Human approval: `APPROVED 2026-08-24`
- Source-only commit: `THE COMMIT CONTAINING THIS MANIFEST`
- Product implementation authority: `BLOCKED UNTIL POST-COMMIT REVIEWER VERIFICATION`

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

The user approved these exact identities on 2026-08-24 through the source-gate prompt in this
session. The containing source-only commit freezes them; product work remains blocked until
post-commit reviewer verification.

## Human approval record

- Approver: `User`
- Approval decision: `APPROVED — selected “Approve and commit” in the source-gate prompt`
- Approval date: `2026-08-24`
- Approval provenance: `This Claude Code session's source-gate prompt`
- Approved source-only commit: `The commit containing this manifest and the exact identities above`
- Approved commit/tree hashes:
  `Reported from Git after creation; not embedded because a commit cannot contain its own hash`
- Independent source review: `POST-COMMIT REVIEWER VERIFICATION PENDING`
- Limitations or amendments: `No product work before post-commit reviewer verification`

Human approval is recorded without changing any identity-bound source artifact. The containing
source-only commit must include exactly the approved source identities and eight authorized paths.

# Scaffold Review 03

- **Verdict:** FAIL
- **Scope:** expedited re-review of review-02 I-001 and I-002 only, plus frozen/review hashes and
  formatting
- **Repository HEAD:** `6c3456ce701228a15b193f11cf3c0c270aa8a56f` on `main`
- **Review date:** 2026-07-19
- **Manual app testing:** not applicable to this focused control-plane re-review

## Critical findings

None.

## Important findings

### I-001 — Multi-requirement P21 rollback still deadlocks after the first-class states are downgraded

The new P21 path is executable for one affected HS requirement: it identifies actual owners and
downstream impact, downgrades packages/requirements, rolls the marker back with hashes, re-reviews
packages in dependency order, re-passes only after all mapped packages pass, re-checks the marker,
and starts P21 revision NN+1 from a new BASE. FS-001 is correctly downgraded/re-passed without a
source edit. A multi-package requirement such as HS-009 also correctly remains downgraded until all
of P16A, P16C and P16D are passed again.

The procedure is still inconsistent when one P21 finding impacts two or more HS requirements:

- `PROCESS.md` P21 step 5 downgrades **every** impacted requirement from `passed` to
  `changes_requested` in one transition.
- The frozen-source check then requires `[]` for every non-passed requirement, while its transition
  exception permits only “the one named ID” to remain in its recorded before or after marker state.
- The rollback procedure changes affected HS markers sequentially, one event and rolling-hash pair
  at a time, and revalidates all blocks after each change.

A concrete deterministic case is P08, which maps both HS-011 and HS-012. A P21 regression that
invalidates P08 downgrades both requirements while both source markers are still `[x]`. A
`rollback_pending` event can authorize HS-011's checked before-state, but HS-012 is already
non-passed, still checked, and is not the one named transition. The mandatory all-block validation
therefore classifies HS-012 as state/marker drift before HS-011 can finalize or HS-012 can begin.
The same problem occurs with any downstream impact set containing multiple HS IDs.

Make invalidation batch-aware and recoverable. Before changing requirement states, root should
create one durable P21 rollback-batch record listing every impacted HS ID, their checked starting
state, exact order, failed P21 artifact and initial rolling SHA. During that no-dispatch batch only,
the integrity check should accept each listed ID as either still checked/pending or already
unchecked/finalized, with a contiguous per-ID hash chain. Finalize the batch only when all impacted
HS markers are unchecked, all affected IDs have been removed from authorized checked IDs, and all
package/requirement downgrades are recorded. An equivalent atomic per-requirement state/marker
protocol is acceptable if it preserves the package/requirement invariant and crash recovery.

## Review-02 fix disposition

### I-001 P21 rollback and recovery

**Partially resolved.** Single-HS, FS-001, multi-package-requirement, re-pass/re-check and new-P21-
revision semantics are now explicit and non-deadlocking. The multi-HS impact batch above remains
blocking.

### I-002 canonical examples A–H

**Resolved.** The FS task now gives every example A, B, C, D, E, F, G and H its own named production
unit/property expectation in P16B and its own named E2E expectation against the production path in
P16E. It expressly forbids substitution by a general journey, combined case or manual observation.
The section-7 matrix and evidence-ownership section repeat the complete eight-plus-eight gate.
`tasks/P21-final-audit.md` and `FINAL-AUDIT.md` independently require all sixteen named gates. No
“representative” narrowing remains.

## Hash and formatting checks

| Check                            | Result                                                                     |
| -------------------------------- | -------------------------------------------------------------------------- |
| Frozen scratch                   | `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b` — exact |
| Frozen canonical allocation spec | `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` — exact |
| Immutable review 01              | `7af84476e3790c3608d8d2065bae8115f2007b61bc5b5acd3cda99736906e617`         |
| Immutable review 02              | `f4787274788bd19c5cffadf5a20b9d2d468e2239e1558a2e3a6fb965d7d6fb84`         |
| `pnpm format:check`              | exit 0; all 466 files formatted                                            |

No other review-02 finding or previously passed scaffold area was reopened in this expedited review.
The remaining Important finding must be corrected and independently re-reviewed in
`SCAFFOLD-review-04.md` before Goal activation.

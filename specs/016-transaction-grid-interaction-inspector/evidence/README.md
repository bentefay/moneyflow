# Transaction Grid Interaction and Inspector Evidence Index

This index is mutable accounting around source files approved on 2026-08-24 and frozen by the
containing source-only commit. Evidence is added in revisioned files; failed or superseded evidence
is retained rather than overwritten.

## Source gate

| Artifact                                                    | Purpose                                                                             | Status                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `../goal.md`                                                | Authoritative outcomes and approval decisions                                       | Approved 2026-08-24; frozen by containing commit                            |
| `../interaction-contract.md`                                | Acceptance-keyed state, command, focus, inspector, failure, and preference contract | Approved 2026-08-24; frozen by containing commit                            |
| `../source-disposition.md`                                  | Preserve/Replace/Not-applicable reconciliation                                      | Approved 2026-08-24; frozen by containing commit                            |
| `../replacement-coverage.md`                                | Exhaustive current-path/test/perf replacement and negative-proof map                | Approved 2026-08-24; frozen by containing commit                            |
| `../amendments/001-idle-reconciliation.md`                  | Idle and pending-activation reconciliation precedence                               | Approved 2026-08-24; dedicated commit and post-commit verification complete |
| `../amendments/002-google-sheets-grid-treatment.md`         | Direct-user decision for the bounded resting visual treatment                       | Authorized 2026-08-25; no new approval gate                                 |
| `../amendments/003-unified-grid-navigation-popup-escape.md` | Direct-user decision for unified Alt navigation and one-Escape cancellation         | Authorized 2026-09-01; no new approval gate                                 |
| `source-freeze/freeze-manifest.md`                          | Source identities, current-HEAD disclosures, and approval record                    | Base and Amendment 001 commits independently verified                       |

The user approved the four exact base source identities through the source-gate prompt. Independent
post-commit verification of `67227d06de0545ea5f95e7ba827b670f8b0aa97a` passed without changing those
bytes. Product slice 2A review then found an authority conflict. Independent amendment review cycle
4 returned `APPROVE`, and the user selected “Approve and commit” for exact amendment SHA-256
`bfe997646884ae2b12dcce58af38cafa00e2db79770aa27872832e00a7ee68d0` on 2026-08-24. Dedicated commit
`417e103def4e2a2b07caf7171a8e467de9e3bfab`, tree `72f583fbcdcf6539fbeb438bdfebc287a4cd20bd`,
contains exactly the five authorized amendment/accounting paths. Independent post-commit
verification passed, and product correction resumed within combined base-source and Amendment 001
authority.

On 2026-08-25, direct user instruction authorized
`../amendments/002-google-sheets-grid-treatment.md`, titled “Amendment 002: Google Sheets Grid
Treatment”, for the bounded shared resting visual treatment. This decision has no executable
acceptance ID, adds no approval gate, and does not alter the 146 base records or the one executable
Amendment 001 record.

On 2026-09-01, direct user instruction authorized
`../amendments/003-unified-grid-navigation-popup-escape.md`, titled “Amendment 003: Unified Grid
Navigation and Popup Escape”. It supersedes the scoped keyboard and top-level grid-editor popup
Escape clauses with canonical Alt/Option-arrow movement, Alt/Option+Shift range extension, and
one-Escape popup/editor cancellation while preserving nested Create Account Select ownership. This
decision has no executable acceptance ID, adds no approval gate, and leaves the 146 base records
plus the one executable Amendment 001 record unchanged.

## Executable acceptance-key registry

The final acceptance manifest must expand each inclusive range below into every zero-padded key with
no gaps and contain exactly this set plus goal outcomes `TGI-001` through `TGI-012`. Extra, missing,
duplicate, or differently padded keys fail the manifest before verdicts are read.

```text
TGI-001..012
TGI-KEY-001..003
TGI-STATE-001..006
TGI-SEL-001..006
TGI-GEN-001..004
TGI-CUR-001..004
TGI-CELL-001..004
TGI-ROWSEL-001..002
TGI-ACT-001..003
TGI-COPY-001..005
TGI-CMD-000..024
TGI-TAB-001..002
TGI-CONT-001
TGI-IME-001..005
TGI-PICK-001
TGI-ACCOUNT-001..004
TGI-STATUS-001..003
TGI-TAGS-001..006
TGI-POP-001..007
TGI-FOCUS-001..005
TGI-RECON-001..005
TGI-INSP-001..009
TGI-INSPCMD-001..006
TGI-PREF-001..004
TGI-OWN-001..006
TGI-VIRT-001..004
TGI-VERIFY-001..004
```

This block expands to exactly 146 base records and remains unchanged. `TGI-AMD-001` is executable
amendment evidence, not a 147th base-registry key. The final package has the closed top-level shape
`{ baseRecords: AcceptanceRecord[]; amendmentRecords: [TgiAmendment001Record] }`. The exact
schema-version-2 amendment record, command, case, mutation execution, independent review,
literal-ID, digest, path, count, and cross-record validation schema is normative in
`amendments/001-idle-reconciliation.md`. A runtime parser must reject unapplied or unrelated
mutations, unrelated command failures, restoration without a passing rerun, non-matching review
attestations, and any unknown or missing field. Mixing an amendment key into the base set, omitting
or duplicating the separate record, or relying on TypeScript types without runtime validation fails
the package before verdicts are read.

The manifest generator must implement range expansion as a pure function and test:

- first/last inclusive expansion;
- zero padding;
- no duplicates;
- exact equality between expanded expected keys and manifest record keys;
- rejection of unknown, missing, duplicate, or malformed keys.

Each base manifest record has these required fields:

```text
acceptanceId
verdict: PASS | FAIL
sourcePath
sourceSha256
baseCommit
headCommit
headTree
implementationEvidencePath
implementationEvidenceSha256
reviewPath
reviewSha256
commands: [{ command, exitCode, artifactPath?, artifactSha256? }]
negativeProof: { mutation, failingCommand, restoredTree }
limitations
```

A `PASS` requires at least one command and one negative proof unless the source key is explicitly a
source/history disclosure with no executable mechanism; those keys instead require a hash/path
verification command.

## Required implementation evidence

Future implementation artifacts use two-digit immutable revisions.

| Stage          | Required path                          | Minimum content                                                                          |
| -------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| amendment      | `implementation/amendment-001-01.md`   | idle-neutrality and engaged-reconciliation tests, mutations, commands, acceptance record |
| controller     | `implementation/controller-01.md`      | state/reducer/projection APIs, acceptance keys, tests, negative mutations, commands      |
| grid surface   | `implementation/grid-surface-01.md`    | gestures, roving focus, paint, copy, ARIA, browser checks                                |
| editors        | `implementation/editors-01.md`         | each lifecycle, IME, outside-pointer ordering, validation, portals, replacement mapping  |
| inspector      | `implementation/inspector-01.md`       | engagement, DOM identity, preferences, notes, automation, presence, responsive focus     |
| virtualization | `implementation/virtualization-01.md`  | 57px geometry, held window, pins, mounted bounds, compiler boundaries                    |
| deletion       | `implementation/superseded-code-01.md` | every deleted path plus green replacement oracle and negative proof                      |
| final          | `final/acceptance-manifest-01.json`    | exact registry record set with hashes, commands, reviews, and verdicts                   |

## Required reviews

- `reviews/source-review-01.md` — approved base source plus post-commit verification.
- `reviews/amendment-001-review-01.md` — conflict, precedence, accounting, and human approval.
- `reviews/controller-review-01.md`
- `reviews/grid-surface-review-01.md`
- `reviews/editors-review-01.md`
- `reviews/inspector-review-01.md`
- `reviews/virtualization-review-01.md`
- `reviews/final-review-01.md`

Each review binds BASE, HEAD, `HEAD^{tree}`, source/evidence hashes, commands/exits, and every
applicable acceptance key.

## Required verification classes

1. Table-driven and property tests for pure state, key, navigation, range, generation,
   reconciliation, preference merge, copy, IME, popup ordering, and acceptance-range expansion.
2. DOM integration tests with real TanStack/Radix/Virtual behavior where those participants are
   under test.
3. Chromium ARIA/focus evidence for grid, editors, owned portals, explicit inspector engagement, and
   one inspector subtree.
4. E2E journeys for selection, copy, editor families, IME, outside-pointer invalid drafts, notes,
   automation, row deletion, filtering, virtual reveal, persistence, sync, presence, and
   row-selection independence.
5. Negative mutations proving identity, generation, same-generation rollback versus G+1
   reconciliation, copy, focus, atomic tag creation, popup order, inspector ownership, fixed height,
   and validation oracles fail when production mechanisms are neutralized or inverted.
6. Production-build manual headless Chromium verification at wide/narrow widths and both themes.
7. At least five complete four-worker retry-free E2E repetitions on unchanged bytes, or six if a
   shared synchronization helper changes.
8. Revised Chrome presentation traces and the required iOS Safari correctness campaign.

## Evidence discipline

- Record `HEAD^{tree}` before and after every quoted campaign; restart at run 1 after drift.
- Preserve raw errors and `error-context.md` before reruns.
- Report per-run results and distinct failing tests, not only final color.
- Do not infer browser behavior from jsdom or Node ICU.
- No captured metric can weaken a proposed/frozen threshold.
- Dynamic-note-row evidence under spec 015 remains historical; its replacement arm is fixed 57px
  rows plus inspector interaction.
- Source files were human-approved on 2026-08-24 and are immutable in the containing source-only
  commit; post-commit verification may validate but never rewrite those bytes.

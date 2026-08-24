# Transaction Grid Interaction and Inspector Evidence Index

This index is mutable accounting around source files approved on 2026-08-24 and frozen by the
containing source-only commit. Evidence is added in revisioned files; failed or superseded evidence
is retained rather than overwritten.

## Source gate

| Artifact                           | Purpose                                                                             | Status                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| `../goal.md`                       | Authoritative outcomes and approval decisions                                       | Approved 2026-08-24; frozen by containing commit    |
| `../interaction-contract.md`       | Acceptance-keyed state, command, focus, inspector, failure, and preference contract | Approved 2026-08-24; frozen by containing commit    |
| `../source-disposition.md`         | Preserve/Replace/Not-applicable reconciliation                                      | Approved 2026-08-24; frozen by containing commit    |
| `../replacement-coverage.md`       | Exhaustive current-path/test/perf replacement and negative-proof map                | Approved 2026-08-24; frozen by containing commit    |
| `source-freeze/freeze-manifest.md` | Source identities, current-HEAD disclosures, and approval record                    | Approval recorded; post-commit verification pending |

The user approved the exact manifest identities through the source-gate prompt in this session.
Product work and implementation evidence remain blocked until post-commit reviewer verification.

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

The manifest generator must implement range expansion as a pure function and test:

- first/last inclusive expansion;
- zero padding;
- no duplicates;
- exact equality between expanded expected keys and manifest record keys;
- rejection of unknown, missing, duplicate, or malformed keys.

Each manifest record has these required fields:

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

| Stage          | Required path                          | Minimum content                                                                         |
| -------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| controller     | `implementation/controller-01.md`      | state/reducer/projection APIs, acceptance keys, tests, negative mutations, commands     |
| grid surface   | `implementation/grid-surface-01.md`    | gestures, roving focus, paint, copy, ARIA, browser checks                               |
| editors        | `implementation/editors-01.md`         | each lifecycle, IME, outside-pointer ordering, validation, portals, replacement mapping |
| inspector      | `implementation/inspector-01.md`       | engagement, DOM identity, preferences, notes, automation, presence, responsive focus    |
| virtualization | `implementation/virtualization-01.md`  | 57px geometry, held window, pins, mounted bounds, compiler boundaries                   |
| deletion       | `implementation/superseded-code-01.md` | every deleted path plus green replacement oracle and negative proof                     |
| final          | `final/acceptance-manifest-01.json`    | exact registry record set with hashes, commands, reviews, and verdicts                  |

## Required reviews

- `reviews/source-review-01.md` — human approval plus independent consistency review.
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

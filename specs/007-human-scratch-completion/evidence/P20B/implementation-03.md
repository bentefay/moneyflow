# P20B — implementation 03: import config immutability and amount-format detection

Follow-up to `implementation-01.md` / `-02.md`, covering the single commit added after the first
handback:

- **`9ab6119`** `fix(P20B): make import config immutable and repair amount-format detection`

This was dispatched by the team lead as a scope correction: an earlier sub-worker had proposed
shipping only the `structuredClone` half of the import-mutation fix and dropping the `readonly`
change to avoid touching two component call-sites it believed were outside its partition. Root's
ruling is that P20B has no internal partition boundary — the whole first-party codebase is one scope
— and that dropping the immutability change by default would be inventory-narrowing. The correlated
fix is therefore completed here in full, as one compiling commit.

## Finding B-13 — import config types were mutable

| Field       | Value                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Location    | `src/lib/import/types.ts:35,95,133,164`                                                                                                                |
| Rule        | `typescript-style.md` § Immutability & Purity — "Favour immutable data. `as const`, `readonly`, const arrays. Create new values rather than mutating." |
| Severity    | Medium — a latent-defect class, and the direct subject of HS-021                                                                                       |
| Disposition | **Fixed**                                                                                                                                              |

`FormattingSettings`, `DuplicateDetectionSettings`, `FilterConfig` and `ImportConfig` declared every
field mutable, and `ImportConfig.columnMappings` was a mutable `Record`. That is what allowed the
module-constant corruption already fixed in `d3786a5`: `loadFile` seeded a session config from
`DEFAULT_IMPORT_CONFIG` and then wrote detected formats straight back into it, permanently changing
the defaults that also back the CRDT schema.

`structuredClone` fixed that instance. It did not fix the class — nothing stopped the next writer
from doing the same, and the guard was a comment rather than a compiler rule. Marking the fields
`readonly` makes it structural.

The compiler then located every remaining write, which is the useful part: six of them, all in
`use-import-state.ts`, all in the auto-detection path. They are now derivations rather than
mutations:

- `loadFile` builds its final config with spreads instead of assigning into `config.columnMappings`
  and `config.formatting.*`.
- Detection moved into a pure module-level helper,
  `detectFormatting(formatting, columnMappings, dataRows) -> FormattingSettings`, with
  `sampleColumn` extracted alongside it. It returns a new object and never writes to its argument.
- The OFX mapping literal was repeated at three sites; it is now one `OFX_COLUMN_MAPPINGS` constant.
- `selectTemplate` returns a conditional expression rather than cloning and then patching.

Call-sites in the two tab components built their update objects by mutation, which `Partial<T>` of a
readonly type no longer permits. Both are now single object literals with conditional spreads —
`FormattingTab.tsx:196` and `DuplicatesTab.tsx:149`, about three lines each. No behaviour change.

`structuredClone` is retained where a session config is seeded from the defaults; `readonly` is a
compile-time constraint only, so the runtime aliasing guard is still load-bearing.

Regression cover: `tests/unit/import/default-config-immutability.test.tsx` already pinned the
mutation defect and still passes unchanged.

## Finding B-14 — detectNumberFormat failed on signed and space-grouped amounts

| Field       | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Location    | `src/components/features/import/tabs/FormattingTab.tsx:138`                   |
| Rule        | `coding-style.md` correctness; `import/SKILL.md` money-as-integer-minor-units |
| Severity    | **High** — silent 100x money mis-scaling on import                            |
| Disposition | **Fixed**                                                                     |

Two independent defects, both making the function return `null` for input a real export produces.
`null` is not inert: the caller leaves the US defaults in place, and those defaults are handed to
`parseNumber`.

**1. Sign.** Every grouping pattern describes an unsigned magnitude, but the sample was tested
as-is. Reproduced against the base implementation:

```
"-45,99"    -> null      "45,99"    -> {thousand: ".", decimal: ","}
"-1.234,56" -> null      "1.234,56" -> {thousand: ".", decimal: ","}
"(45.99)"   -> null      "-45.99"   -> null
```

Detection samples the first non-blank value of the amount column. Bank exports lead with debits, so
a EU file whose first sampled amount was negative — the common case — detected nothing and was
parsed with `,` as a thousands separator. This is precisely the 100x overstatement that
`isWellFormedMagnitude` was added to reject in `d3786a5`; that fix makes the row fail validation
rather than import a wrong amount, so the user-visible symptom is a whole file of rejected rows.

`stripAmountSign` now removes accounting parentheses and a leading `-`/`+` before matching, which
matches what `parseNumber` already accepts.

**2. Whitespace.** The FR branch keys on a space thousands separator, but the sample had `\s`
stripped before the patterns ran:

```
"1 234,56".replace(/[$€£¥]|\s/g, "")  ->  "1234,56"
FR pattern matches: false    EU pattern matches: false
```

The `1 234,56 (FR)` preset was therefore unreachable for the whole life of the function. Cleaning
now drops currency symbols and trims, but preserves interior spaces, normalising `U+00A0` and
`U+202F` — which FR/CH exporters actually emit — to a plain space first.

Regression cover:

- `tests/unit/components/formatting-detection.test.ts` (new, 9 tests) — sign spellings, the plain
  `-45,99` case, FR space grouping including both non-breaking variants, the previously-working US
  and separator-free formats, null cases, and a round-trip asserting `parseNumber` agrees with the
  separators `detectNumberFormat` reports. The round-trip is the property that matters: the two
  functions must not disagree about the same string.
- `tests/unit/import/default-config-immutability.test.tsx` — an added hook-level test loading a
  semicolon CSV whose amounts are all negative EU-formatted, asserting the session config picks up
  `.`/`,` and that the preview amounts land at `-123456`/`-234567` minor units rather than 100x
  over.

## Finding B-15 — unlock journey dropped pre-hydration fills

| Field       | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Location    | `tests/e2e/identity.spec.ts:345,365`                                             |
| Rule        | `e2e/SKILL.md` — no arbitrary waits, tests must be independent and deterministic |
| Severity    | Medium — test flake, not a product defect                                        |
| Disposition | **Fixed** in `3a241f8`                                                           |

The whole-suite flake sample below caught `identity.spec.ts:282 unlock journey` failing 1 run
in 326. It did not reproduce in isolation — 10/10 and 36/36 green — which is characteristic of a
race that only opens under full-suite scheduling pressure.

Root cause is the same one already fixed at `identity.spec.ts:580` in `9de7285`: the seed word
inputs are controlled React inputs, so a fill that lands before hydration is dropped outright. The
next render overwrites the DOM value and `onChange` never fires. `toBeVisible()` does not imply
hydrated, and this test previously relied on a `waitForLoadState("networkidle")` that `51215b4`
removed as redundant against the following element wait — correct in isolation, but it had been
incidentally serialising the hydration.

The consequence lands on the BIP39 feedback assertion: with both fills dropped, `validClasses` and
`invalidClasses` read identical strings and `expect(validClasses).not.toBe(invalidClasses)` fails.
That assertion is itself one this sweep tightened in `51215b4` — the original only checked both were
truthy, which could not fail and so hid the race.

Fixed at the cause rather than by restoring the removed wait: the step now waits for the input to be
editable and asserts each fill propagated before reading the class off it. The paste step below it
had the same exposure and got the same guard. **90/90** with retries disabled at `--repeat-each=10`.

## Verification

Re-run against the clean committed tree, per root's Gap 2, not against a dirty worktree.

| Check                         | Result                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `pnpm typecheck`              | clean                                                     |
| `pnpm lint`                   | 0 errors, 1 warning (pre-existing TanStack Virtual)       |
| `pnpm format:check`           | 14 pre-existing `specs/**` markdown files; 0 `.ts`/`.tsx` |
| `pnpm test`                   | **2091 passed / 2 skipped, 111 files** (was 2081 / 110)   |
| `pnpm build`                  | succeeds                                                  |
| `pnpm test:e2e`               | **163 passed**, 0 failed, exit 0                          |
| oxfmt on touched `.ts`/`.tsx` | all 7 files pass                                          |

Flake sampling, all with `--retries=0`:

| Sample                                               | Result                                              |
| ---------------------------------------------------- | --------------------------------------------------- |
| `import.spec.ts` at `--repeat-each=5`                | 80/80                                               |
| whole suite at `--repeat-each=2`                     | 325/326 — the B-15 flake, diagnosed and fixed above |
| whole suite at `--repeat-each=2`                     | 326/326                                             |
| `identity.spec.ts` at `--repeat-each=10`             | 90/90 after the B-15 fix                            |
| whole suite at `--repeat-each=3`                     | **488/489** — one residual flake, analysed below    |
| `import.spec.ts` at `--repeat-each=10` (single test) | 10/10                                               |
| `import.spec.ts` at `--repeat-each=5` (whole file)   | 80/80                                               |

### The residual 1-in-489 flake is pre-existing, not from this range

`import.spec.ts:301 transaction surface drop transfers one File without plaintext storage and cancel returns`
failed once at line 365, waiting for `/transactions` after the import completes. Reported rather
than re-run until green, and checked for causation rather than assumed to be noise:

- **The test is byte-identical to BASE.** `git diff --stat 659ca20 HEAD -- tests/e2e/import.spec.ts`
  is empty. P20B never touched this file.
- **My detection change cannot reach it.** Its fixture amounts are `1.00`-style US values. Running
  the pre-fix and post-fix `detectNumberFormat` side by side on `"1.00"` returns
  `{thousand: ",", decimal: "."}` from both — identical behaviour on this input.
- **It does not reproduce under targeted load:** 10/10 for the single test, 80/80 for the whole
  file.
- The captured server log shows
  `Failed to initialize vault: No session - user must be authenticated`, i.e. a vault-session
  initialisation race under full-suite scheduling pressure, not an import-parsing failure.

That is a genuine pre-existing flake in the suite and I am not claiming otherwise; it is a candidate
for a follow-up, but fixing an untouched test's unrelated auth race is outside this package's
charter and would be unreviewable churn against the sweep's diff. Raised as **Q-13** below.

The `format:check` list is 14 files, one more than the 13 reported in `implementation-01.md`: root's
own `QUESTIONS.md` transcription in `fd0729c` added the fourteenth. All are `specs/**` markdown that
was already unformatted, including the frozen `human-scratch.md`, which must not be reformatted. No
`.ts`/`.tsx` fails oxfmt.

Type escapes are unchanged by this commit and remain below base: `as` 113 (base 151), non-null `!` 2
(base 22), explicit `any` 0 (base 5). Re-measured with the published queries in
`implementation-01.md §5` against a `git archive` of the new HEAD. The two residual `any` hits are
both prose inside comments, confirmed by reading each. No `as`, `any` or `!` was added.

`src/lib/domain/settlement.ts` remains `010f3c93582a2ce311594d4dde8464760ca49c43`. Frozen sources
are byte-identical. No root-owned file was touched. No secret material appears in the change.

## Incident — `pnpm format` reflows frozen and root-owned markdown

Recorded because it is a trap for the next agent, and because I tripped it.

The gate instructions say to run `pnpm format` on your own files if `format:check` flags them. The
bare command is **not** scoped to your files: oxfmt formats `specs/**` markdown too. Running it
rewrote 14 files — `specs/human-scratch.md` (the frozen source, with the same 2-space to 6-space
continuation-indent reflow documented as a halt condition), root-owned `DECISIONS.md`,
`QUESTIONS.md` and `RISKS.md`, `reviews/P12-*`, and other packages' evidence. Roughly 640 lines,
reported by oxfmt only as "Finished on 766 files".

Caught immediately via `git status`, and reverted with `git restore -- specs/`, which returns the
worktree to the index without disturbing root's concurrently-staged edits to `HANDOFF.md`,
`PROGRESS.md` and `QUESTIONS.md` (those remained staged and uncommitted throughout; my commit used
an explicit pathspec so it captured only my six files). Verified afterwards:
`git hash-object specs/human-scratch.md` == `git rev-parse HEAD:specs/human-scratch.md` ==
`e1c9a8654dc85c051334e0ea57a5a2f50f889d95`. No frozen-source drift reached the index or a commit.

Use `pnpm exec oxfmt <paths>` instead. This is worth a line in the goal's process notes, but that
file is root-owned, so it is raised here rather than edited.

## Q-proposals

Nothing from the lead's correlated fix was deferred — all three pieces shipped: the `readonly`
fields, both component call-site rewrites, and the `detectNumberFormat` sign tolerance, plus the FR
whitespace defect found while verifying the sign claim. One new proposal, from the flake sampling:

### Q-13 (MINOR, test flake) — `import.spec.ts:301` races vault-session initialisation

`transaction surface drop transfers one File without plaintext storage and cancel returns` fails
roughly 1 run in 489 under full-suite load, timing out at line 365 waiting for `/transactions` after
import, with `Failed to initialize vault: No session - user must be authenticated` in the server
log. The test is unchanged since BASE and passes 10/10 and 80/80 under targeted repetition, so this
is a pre-existing race rather than sweep-induced — see the analysis in the Verification section.

**Recommendation:** leave for a follow-up. The remedy is in the vault-session bootstrap or the
test's post-import wait, neither of which this package touched, and diagnosing a 0.2%-rate auth race
properly needs its own reproduction budget. Flagged rather than papered over with a retry, since
adding retries to hide it would violate the E2E guide the sweep is enforcing.

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

## Verification

| Check                         | Result                                                  |
| ----------------------------- | ------------------------------------------------------- |
| `pnpm typecheck`              | clean                                                   |
| `pnpm lint`                   | 0 errors, 1 warning (pre-existing TanStack Virtual)     |
| `pnpm test`                   | **2091 passed / 2 skipped, 111 files** (was 2081 / 110) |
| `pnpm build`                  | succeeds                                                |
| `pnpm test:e2e`               | **163 passed**, 0 failed, exit 0                        |
| oxfmt on touched `.ts`/`.tsx` | all 6 files pass                                        |

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

No new Q-proposals. The lead's dispatch asked that any deliberately deferred piece of the correlated
fix be recorded as one — nothing was deferred. All three pieces shipped: the `readonly` fields, both
component call-site rewrites, and the `detectNumberFormat` sign tolerance, plus the FR whitespace
defect found while verifying the sign claim.

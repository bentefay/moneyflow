# Task B — deterministic 10,000-transaction fixture

**SUPERSEDED IN PART. The authoritative record of the frozen fixture is
`../freeze/fixture-composition.md`.** This file is the Task B artifact, written when the generator
existed but had never been seeded into a running vault. The digests and two of the claims below were
correct then and are not now; each is marked. Nothing here should be quoted without checking the
composition document.

Generator: `tests/perf/fixture/transaction-fixture.ts` Tests:
`tests/perf/fixture/transaction-fixture.test.ts` (23 assertions, passing)

## Digests

Both produced by executing the generator, not by inspection.

**SUPERSEDED.** Both digests below are pre-revision-2 and no longer describe the fixture: the
account index is now drawn from its own hash rather than `rowIndex % 4`, because the old form was
perfectly correlated with the year. The current digests are in `../freeze/fixture-composition.md`.

| artefact (PRE-REVISION-2)                | SHA-256                                                            |
| ---------------------------------------- | ------------------------------------------------------------------ |
| fixture definition                       | `c689afbd6d017383e960b1b5f56e5bea8f958abdc955cd039f612a586602add7` |
| import CSV bytes (4 files, concatenated) | `eb9ae04124d02eb3621ae40ec8fb85ebf52c19cf982a9f11139e7f66481ae7e0` |

Per-account CSV sizes, in bytes: `120385`, `122426`, `121778`, `114174`.

The definition digest is pinned in the test suite, so any change to the generator fails a test
rather than silently producing different data.

## Determinism

No clock, no `Math.random`, no `Intl`, no locale-dependent formatting. Each row is derived from
`sha256("moneyflow/015-transaction-grid-tanstack/fixture-v1#<rowIndex>")` in counter mode, so row
_n_ does not depend on how many rows were drawn before it — verified by a test that compares
`fixtureTransaction(9999)` against the same row taken from the full 10,000-row generation.

## Measured variety

Asserted by the test suite against the generated data:

- exactly 10,000 transactions across 4 accounts (**revision 2: approximately, not exactly, 2,500
  each — 2,464 / 2,476 / 2,527 / 2,533**, because the account is now drawn from a hash to
  decorrelate it from the date)
- 3 currencies (USD, EUR, JPY — JPY exercises the zero-minor-unit path)
- 8 distinct years, all 12 months, ≤19 transactions in any one account/day bucket, so the CRDT
  `account → year → month → day` tree is deep rather than wide
- description lengths from under 6 to over 200 characters, including non-ASCII (`Café 東京`,
  `健康保険料`, `Płatność kartą`) and embedded commas/quotes
- at least 8 descriptions repeated more than 100 times, giving the description-alias feature real
  mass to group
- both signs, amounts spanning to over 1,000,000 minor units

## What was NOT done at the time of writing — ALL OF IT IS NOW DONE

Every gap in this section has since been closed; see `../freeze/fixture-composition.md` for the
measured outcome. Kept for the record of what was and was not established at Task B.

**The fixture had not been seeded into a running vault.** The generator and its CSV serialisation
were complete and hashed; loading them through the product was not validated. Specifics as they
stood:

- The bulk path is the product's CSV import, which terminates in `commitImportBatch`
  (`src/lib/crdt/import-commit.ts`). This is the only mechanism that inserts many transactions in
  one vault action, and it is a genuine product path, not a test-only seam.
- **Import cannot produce notes.** `commitImportBatch` writes `notes: ""`, `tagIds: []` and
  `allocations: {}` for every row. Tags, allocations and description aliases can still be applied in
  bulk, because the import automatically runs `applyFieldRulesToImport`, so defining field rules
  before the import enriches all 10,000 rows through a real product path. Notes have no such path —
  the ~500 variable-height rows in `enrichmentPlan()` would have to be typed one at a time. This is
  unresolved.
- Import duration for 2,500 rows per file was **unmeasured**. Now measured: 1.6-2.2s to commit each
  file, four files per session.
- No SHA-256 of the _resulting seeded data_ exists, because the seeded vault is encrypted
  per-session and its ciphertext is not reproducible. What is hashed is the fixture definition, the
  CSV bytes and the enrichment definition; what is verified about the seeded vault is verified on
  the DOM.

A 10,000-row CSV from the previous campaign exists at `/tmp/moneyflow-tg9-manual-10000.csv` with
header `Date,Description,Amount`, which is where this generator's CSV format comes from.

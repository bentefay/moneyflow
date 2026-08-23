# Fixture composition — FROZEN

**Status: FROZEN.** All arms use this fixture unchanged. Any change to it invalidates captured
measurements and requires a re-capture, not an amendment.

Generator: `tests/perf/fixture/transaction-fixture.ts`. Applied by
`tests/perf/fixture/vault-setup.ts` + `applyNotesAndExpand` in `tests/perf/measure-grid.ts`.

## Digests

| artefact                         | SHA-256                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| transaction definition           | `55ad36c8a81fd67c72887642dfcb11803c93cfb1f18f4e9cd8467e6c0543af90` |
| import CSV bytes (4 files)       | `519f43abb52b24cc9181639654b91b24fa135368e998732b6c9bdd1100ad259c` |
| enrichment (people, tags, rules) | `9e32ed1e477553bbe447974f7d490cdf332d1ef4b9f697191f6e0d7ee0df4422` |

All three are pinned in `tests/perf/fixture/transaction-fixture.test.ts`, so a silent change to any
of them is a failing test rather than a quietly different measurement.

The enrichment digest is **separate on purpose**: adding people, tags or field rules does not change
a single transaction, so the transaction digest alone cannot distinguish a vault that renders
allocation columns from one that does not.

## What is in the seeded vault

Every participant is created through the product's own UI — the accounts screen, the people screen,
the tags screen, the Automations rule editor, four runs of the import flow, and the grid's own notes
editor. Nothing is written into the CRDT behind the app's back.

| participant                       | state                 | how                                         |
| --------------------------------- | --------------------- | ------------------------------------------- |
| 10,000 transactions               | applied               | four CSV imports, ~1.6-2.2s commit each     |
| 4 accounts, one currency each     | applied, DOM-verified | accounts screen; currency set before import |
| 8-year date spread, small buckets | applied               | generator                                   |
| description variety, non-ASCII    | applied               | generator                                   |
| 3 people → 3 allocation columns   | applied, DOM-verified | people screen (+ the vault's own "Me")      |
| tags on ~2,512 rows               | applied, DOM-verified | 3 pre-import tag field rules                |
| allocations on ~1,776 rows        | applied, DOM-verified | 2 pre-import allocation field rules         |
| notes on 480 rows, expanded       | applied, DOM-verified | the grid's real notes editor, in-session    |

### Accounts

| #   | vault account       | currency | rows  |
| --- | ------------------- | -------- | ----- |
| 0   | `Default`           | USD      | 2,464 |
| 1   | Travel Rewards Card | USD      | 2,476 |
| 2   | Berlin Savings      | EUR      | 2,527 |
| 3   | Tokyo Cash          | JPY      | 2,533 |

**Stated deviation:** fixture account 0 is named "Everyday Checking" in the generator but is mapped
onto the account a new vault ships with, `Default`. The currency (USD) matches; only the displayed
name differs, in one column of a fixed-width grid. The alternative was to drive the account-rename
flow during seeding for a cosmetic gain.

Four imports rather than one is not only realism: the import flow binds one file to one account, and
this is the **only** thing that exercises the transaction cursor's k-way merge across accounts.

#### The correlation defect this fixture used to have

The generator previously assigned `accountIndex = rowIndex % 4` while the year came from
`rowIndex % 8`. Those are perfectly correlated: **every 2026 row was Tokyo Cash, every 2025 row was
Berlin Savings**, and each account held only 2 of the 8 years. The grid orders rows by date, so the
seeded vault presented 1,250 consecutive rows of one account, then 1,250 of the next. This was
**DOM-verified, not deduced**: the fixture check swept the top of the grid and found rows from
exactly one account (`Tokyo Cash`), which is what exposed it.

A cursor merging four accounts in date order would then have had to merge at 7 year boundaries in a
10,000-row list — the code path most likely to be wrong in the port would have been almost untested.

The account is now drawn from its own hash (`accountIndexFor`), independent of year, month and day.
**Measured consequence:** 74.4% of adjacent pairs in date order (7,441 of 9,999) now come from
different accounts, every year contains all four accounts, and the per-account counts are
approximately rather than exactly 2,500 (above). Real accounts do not hold identical row counts
either.

### People and allocation columns

`Alex Rivera`, `Priya Raman`, plus the vault's own `Me`. Three active people → **three allocation
columns**, DOM-verified from the grid's own column headers: `Alex Rivera %`, `Me %`,
`Priya Raman %`.

Correction to an earlier note in this file: allocation columns are materialised from
**`activePeople`** (`buildAllocationColumnModel`), not from people who hold allocations. Creating
the people is what renders the columns; the allocations are a separate per-row cost.

### Tags, allocations and the field rules that apply them

`commitImportBatch` calls `applyFieldRulesToImport`, so rules defined **before** an import enrich
every matching row on the product's real write path at no per-row driving cost. All five rules key
on an exact description the fixture repeats often.

| rule field | exact description        | value                      | rows it matches |
| ---------- | ------------------------ | -------------------------- | --------------- |
| tags       | `SAFEWAY #1234`          | Groceries                  | 833             |
| tags       | `TFL TRAVEL CHARGE`      | Transport, Subscriptions   | 821             |
| tags       | `Netflix.com`            | Subscriptions              | 858             |
| allocation | `AMZN Mktp US*2Z4KL`     | Alex Rivera 40%, Priya 25% | 876             |
| allocation | `SQ *BLUE BOTTLE COFFEE` | Priya Raman 50%            | 900             |

Totals: **2,512 tagged rows (25.1%)**, **1,776 allocated rows (17.8%)**. These are computed from the
fixture's own descriptions (`fixtureEnrichmentCounts()`), not estimated.

**Verified on the DOM, both directions.** A sweep of the whole scroll range measured 227 of 913
sampled rows tagged (24.9%) and 159 allocated (17.4%), against the 25.1% / 17.8% the rules imply,
and the allocation percentages found were the ones the rules set.

The check that produced those numbers replaced one that could not fail: counting any text in the
tags cell and any digit in an allocation cell reported **915 of 915 rows tagged and allocated**,
because the empty tags cell renders the placeholder `Add tags...` and an unallocated cell carries an
sr-only description reading `Explicit: not stored. Effective: 0%. Owner remainder: 100%.` The rate
check now fails on 100% as loudly as on 0%.

### Notes and variable-height rows

480 grid positions carry a note and are left **expanded**. Measured row heights on the production
build (arm A, react-virtual 3.14.6):

| state                | height | ARIA rows |
| -------------------- | ------ | --------- |
| collapsed            | 57px   | 1         |
| expanded, short note | 103px  | 2         |
| expanded, long note  | 123px  | 2         |

`rowIndex` in the notes plan is a **grid position** (`data-index`), not a fixture row index: the
grid orders by date across all four accounts, so the two numberings differ. Applying the plan by
position is what keeps the expanded rows spread 1-in-20 across the whole scroll range.

Expansion cannot be pre-seeded and does not survive a reload — `expandedIds` is local `useState` in
`TransactionTable` and nothing auto-expands a row because it has notes. The notes themselves
persist; the expansion is re-applied in every session, after the prefix preload, on every arm. This
is why repeats live inside a session.

## Representativeness rationale — this is a judgement, labelled as one

**480 of 10,000 rows (4.8%) simultaneously expanded.**

The argument for a non-zero fraction is not a judgement, it is measured: a fixture with zero
expanded rows cannot produce a measurement-driven blank frame at all. The same commit and the same
10,000 rows scored `fast-reversal` at 59.703 FPS / 0 blank with no expanded rows, and 31.164 FPS /
23 blank with 480. Variable-height rows are the entire reason `measureElement` is load-bearing, so
some non-zero fraction is mandatory for the instrument to be able to fail.

Why ~5% rather than more or less **is** a judgement: it is plausible for someone working through
annotated transactions to have a few dozen notes open in the region they are reading, and 1-in-20
spread across the range keeps expanded rows present throughout a scroll rather than clustered in one
band. It is **not** derived from telemetry or from any observed user session — there is none.

The same applies to the enrichment rates: a quarter of rows tagged and a sixth carrying a household
split is plausible for a shared vault, not measured from a real one.

**The constraint that matters more than any number:** this fixture is representative of the product,
not maximally hostile. It was **not** tuned upward to make the baseline look worse, and it must
**not** be tuned downward if an arm struggles against it. If arm C cannot meet the thresholds on a
representative fixture, that is a result to report, not a fixture to renegotiate.

## What the seeded vault is checked for, and what fails the run

| check                                           | why it exists                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| 4 accounts appear in the grid                   | a single-account fixture would let a cross-account merge bug through |
| allocation column count == active people        | fewer columns means a materially narrower grid than the product's    |
| tagged / allocated row RATES, both directions   | catches rules that did not fire AND a check matching the wrong thing |
| an allocation percentage a fixture rule sets    | proves the allocations came from the rules, not from something else  |
| grid row count == rows imported (±0.5%)         | seeding lost rows                                                    |
| preload reaches the grid's own last row         | otherwise the measurement describes the pagination loader            |
| expanded row taller than collapsed, 2 ARIA rows | variable height is actually being exercised                          |
| note read back from the DOM                     | the notes write reached the CRDT                                     |

### OPEN: the top-level row count is not yet proven deterministic

**Observed: 10,000 top-level rows in one session and 9,999 in another, on the identical fixture, the
identical build and the identical seeding sequence.** "Deterministic 10,000-transaction fixture" is
a goal requirement, so this is recorded as an open question rather than smoothed over. The fixture
DEFINITION is deterministic — byte-identical CSVs, pinned digests — and every import parsed exactly
its file's row count in both sessions. The variation is in how many rows end up as top-level list
entries.

What has been ruled out, by computation rather than by argument:

| candidate cause                                         | status                                                                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| two fixture rows with identical date+description+amount | **ruled out** — zero collisions, within an account or across accounts                                                                                                                                         |
| the product's own duplicate matcher firing              | **predicted zero.** Simulating it over the four sequential imports — date exact, `\|amount diff\| <= 1` minor unit, description lower-cased and equal, cross-currency minor units included — flags **0** rows |
| a row failing validation and being dropped              | **ruled out** — the import button's count is `validCount + duplicateCount` and matched each file's row count exactly, all eight imports                                                                       |

So the leading remaining hypotheses are (a) duplicate detection running against an incompletely
propagated `existingTransactions` set, since the next file is parsed soon after the previous commit,
which would make detection timing-dependent, or (b) a lost write. **Neither is confirmed.**

Three instruments were added so the next capture answers this instead of raising it again, and all
three land in the artifact:

1. the preview's own **"Duplicates (will be marked)"** count, per import;
2. the **Imports page's per-import transaction counts** and their sum — the discriminator: if they
   sum to 10,000 while the grid shows 9,999, the row is in the vault but not in the list; if they
   sum to 9,999, a write was lost, which is a durability finding and a far more serious one;
3. a wait, after each import, until the grid's own count reaches the cumulative expected total
   before the next file is parsed — which removes hypothesis (a) if it is the cause.

Until that capture exists, treat the seeded top-level row count as **10,000 or 9,999** and read any
figure derived from it accordingly. The preload assertion already targets the grid's own count, so a
capture is valid either way.

### Duplicate nesting: why the preload target is measured, not assumed

The preload used to assert it reached index 9,999. With four imports of similar data the product
detected one cross-file duplicate and nested it under its original, where `getCanonicalTransactions`
keeps only public transactions: **10,000 rows imported, 9,999 top-level rows**, and the assertion
failed on a correctly seeded vault. The target is now the grid's **own** row count, read from the
toolbar the user reads, and imported-vs-shown is reported separately with a 0.5% ceiling.

### Durability during seeding, on a production build

`tests/e2e/helpers/persistence.ts` cannot be used here. `installLocalPersistenceSeam` is compiled
out when `NODE_ENV === "production"`, so `window.__moneyflowLocalPersistence` is absent — measured
on `/settings` of the arm A build, where the helper failed loudly rather than degrading to a no-op,
exactly as its own comment promises.

Since a `page.goto` inside the encryption window discards the queued update entirely (195 runs, 50
losses, `specs/007-human-scratch-completion/evidence/P21/`), the barrier is taken one layer lower:
the `ops` row count in IndexedDB must grow past its pre-write value and then hold still before any
navigation. Read-only, and it never creates the database — a versionless `indexedDB.open` would
create an empty version-1 database, after which the app's own `openDB(name, 1)` would skip its
upgrade and find no object stores at all.

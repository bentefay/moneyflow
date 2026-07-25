# P16D Independent Review — Revision 01

Reviewer: distinct `human_scratch_reviewer`. I did not implement this work. Every claim in
`evidence/P16D/implementation-01.md` was treated as unverified and independently reproduced or
challenged.

## 1. Range reviewed

- **Literal cumulative review BASE:** `3a5081ac37e09817e0d02ae8799469d1bf09dad5`
- **Literal product/test HEAD reviewed:** `b5ebc2a8edbf5e1fc522873fb5ee7455266a3bcc`
- **Repository tip during review:** `6b8ec5da0ae91a4e5eb9557945d0949153c50f26`

`git show --stat 6b8ec5d` confirmed: it touches exactly two root-owned control documents —
`specs/007-human-scratch-completion/HANDOFF.md` (+19) and
`specs/007-human-scratch-completion/PROGRESS.md` (+42). No product or test path appears in it.

`git diff --stat 3a5081ac37e09817e0d02ae8799469d1bf09dad5 b5ebc2a8edbf5e1fc522873fb5ee7455266a3bcc`
returns 14 paths: the 2 root control docs (`HANDOFF.md`, `PROGRESS.md`, changed by the intervening
root dispatch commit `fd8d23b`) plus exactly the 8 authorized product paths and 4 authorized test
paths. **No path outside the authorized set was changed.**

Commit split verified:

- `b5d5252` `test(P16D): define allocation grid behavior` — 4 test paths only (RED).
- `b5ebc2a` `feat(P16D): add allocation grid columns` — 8 product paths + 2 test paths (GREEN; the
  test deltas are `transactions.spec.ts` keyboard-order updates and an 8-line
  `allocation-grid.test.tsx` adjustment).

### File stability during review

I recorded MD5 checksums of all 12 product/test paths at review start and again at review end. All
12 were byte-identical. `git rev-parse HEAD` still resolves `6b8ec5d`, and `b5ebc2a` remains the
product/test HEAD.

## 2. RED counterfactual — independently reasoned

The RED commit `b5d5252` is genuinely counterfactual against byte-identical pre-P16D production, and
is not tautological or mock-only:

- `allocation-grid.test.tsx` imports `@/components/features/transactions/allocation-columns`.
  `git show 3a5081a:src/components/features/transactions/allocation-columns.ts` returns
  `fatal: path ... exists on disk, but not in '3a5081a'` — the module did not exist, so the file
  could not even resolve at BASE.
- It mounts the **real** `TransactionRow` (only `@/components/features/accounts` is stubbed, an
  unrelated combobox) and the real `PersonAllocationCell`, asserting on the row's actual computed
  `gridTemplateColumns` and the actual rendered cells.
- `git show 3a5081a:.../TransactionRow.tsx | grep -c allocationColumns` → `0`; same for
  `TransactionTable.tsx`. The props the tests drive did not exist.
- `virtualization.test.tsx` renders the real `TransactionTable` (only `TransactionRow` is stubbed to
  observe the props it receives) and asserts every virtual row receives the shared model — at BASE
  the table passed no such props, so `data-allocation-count` would be `0`, not `1`.
- `keyboard-navigation.test.ts` uses the real `useKeyboardNavigation` hook with a
  `ColumnId = "allocation:person-a"` literal; at BASE `ColumnId` was a closed union without the
  template-literal member, so this is a compile-time gate (the implementer disclosed this honestly:
  it passes at runtime, fails typecheck at BASE).

## 3. Per-acceptance-criterion mapping

Criterion → code → automated test → manual evidence. Independent reasoning, not a restatement.

### 3.1 Grid model and column discovery

| Criterion                                                                                                   | Code                                                                                                                                                                                                | Automated                                                                                                | Manual                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One stable memoized column model from active People + nonzero stored allocation IDs in the displayed prefix | `allocation-columns.ts:77-117` `buildAllocationColumnModel`; memoized at `page.tsx:289-309` via `useMemo([allPeople, displayedTransactions, people])`                                               | `allocation-grid.test.tsx:40`; my oracle 3                                                               | 14 Person columns rendered from 14 People; header list matches People page exactly                                                                                                                                                                                                                                         |
| Active People first, deterministic product order                                                            | `allocation-columns.ts:82-84` sorts by `localeCompare(name)` then `compareText(id)` — matches `PeopleTable.tsx:96` (`a.name.localeCompare(b.name)`), with stable ID tie-break added                 | oracle 3 proves order-independence: reversing input arrays produces an identical column array            | Observed order `Me, Rev Person 00…11` matching the People screen                                                                                                                                                                                                                                                           |
| Deleted People show retained name + clear historical marker                                                 | `allocation-columns.ts:108` `` `${person.name} (deleted)` ``                                                                                                                                        | `allocation-grid.test.tsx:50-56`; my oracle 4                                                            | **Reproduced end-to-end**: allocated `61.25%` to _Rev Person 09_, deleted the transaction, deleted the person, then undid the transaction deletion. Header became `Rev Person 09 (deleted) %`, positioned last after all active columns, cell retained `61.25%`, accessible name `Edit Rev Person 09 (deleted) allocation` |
| Missing records use a stable unambiguous label with enough identity                                         | `allocation-columns.ts:108` `` `Unknown person ${personId}` `` — full ID, not truncated                                                                                                             | `allocation-grid.test.tsx:54-55`; my oracle 4 asserts the label _contains_ the raw id                    | Not reachable via product UI — see §8 limitations                                                                                                                                                                                                                                                                          |
| `$cid`, zero-only history and unstable index IDs are NOT exposed                                            | `materializeAllocationRecord` (`:45-55`) skips `$cid` and non-data descriptors; `hasHistoricalAllocation` (`:57-59`) drops only `Object.is(value, 0)`; columns are keyed by `personId`, never index | oracle 3 asserts `$cid` and a zero-only key are absent while `-0` and `NaN` legacy keys are **retained** | Header list contained no `$cid`/index artefacts                                                                                                                                                                                                                                                                            |
| Header, every virtualized row, notes row and add row share one template                                     | `TransactionTable.tsx:118` (header), `TransactionRow.tsx:243` (row), `:461` (notes), all fed the same `gridTemplateColumns` prop from `page.tsx:926`                                                | `virtualization.test.tsx:137-179`; `allocation-grid.test.tsx:174-199`                                    | Measured computed styles: header ≡ row ≡ notes row. Column left offsets identical across all 22 columns (`[297,345,481,…,3025]`)                                                                                                                                                                                           |
| Many People → horizontal scroll without breaking alignment                                                  | Fixed `minmax(112px,128px)` per column; `min-w-fit` on header/grid                                                                                                                                  | —                                                                                                        | scrollWidth 2848 vs clientWidth 974. After `scrollLeft=1400`, header and row column 6 both at `x=-295`; notes span right edge `1713` ≡ last header column right edge `1713`                                                                                                                                                |
| Vertical virtualization and focus retention preserved                                                       | `extractVirtualRange` (`TransactionTable.tsx:221-229`) unchanged; still pins at most the focused index                                                                                              | `virtualization.test.tsx` (4/4, incl. the pre-existing focused-row range test)                           | 30 transactions → 19 rendered rows (later 14); scrolling and editing kept the edited row mounted                                                                                                                                                                                                                           |
| Notes row spans dynamically                                                                                 | `TransactionRow.tsx:466` changed from static `col-span-7` to `gridColumn: "2 / -1"` — correct, since the column count is now variable                                                               | `allocation-grid.test.tsx:195`                                                                           | Notes cell right edge matched the grid's last column right edge exactly                                                                                                                                                                                                                                                    |
| Allocation columns are keyboard cell identity, not decoration                                               | `TransactionRow.tsx:345` `data-cell={column.field}`; `column-config.ts:7,19` widens `ColumnId` with `AllocationColumnId`; `useGridCellNavigation.getCellsInRow` picks up `[data-cell]` in DOM order | `keyboard-navigation.test.ts:52-67`; `transactions.spec.ts` arrow-right/left assertions                  | Focus reached the cell and `Enter` opened the editor                                                                                                                                                                                                                                                                       |

### 3.2 Allocation cell contract

| Criterion                                                                                                                                          | Code                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Automated                                                                                                                                                                                      | Manual                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orphan aggregate cell retired/decomposed into a real one-Person grid cell                                                                          | `PersonAllocationCell.tsx` fully rewritten (394-line diff). At BASE it took `allocations: AllocationData[]` + `availablePeople` and normalized positive totals; at HEAD it takes a single `personId`/`personLabel` and is mounted inside the real grid at `TransactionRow.tsx:346`. `cells/index.ts` no longer exports `AllocationData`/`PersonData`                                                                                                                                       | `allocation-grid.test.tsx:132-172`                                                                                                                                                             | Every grid cell is one Person with its own accessible name                                                                                                                                                    |
| Displays ONLY the explicit stored value                                                                                                            | `allocationPresentation` (`:45-72`): `display` is `—` unless `explicitStored && explicitValue !== 0`                                                                                                                                                                                                                                                                                                                                                                                       | oracle 6                                                                                                                                                                                       | `—` for unstored, `-35.125%`/`12.5%`/`44.5%` for stored                                                                                                                                                       |
| Muted dash for absent/zero                                                                                                                         | `:64` returns `"—"`; `text-muted-foreground` at `:189`                                                                                                                                                                                                                                                                                                                                                                                                                                     | `allocation-grid.test.tsx:112`                                                                                                                                                                 | Verified                                                                                                                                                                                                      |
| Exact signed decimal for nonzero, no surprise rounding                                                                                             | `displayPercentage` (`:28-32`) uses `String(value)` — no `toFixed`, no `Intl`                                                                                                                                                                                                                                                                                                                                                                                                              | my oracle 7 checks `12.3456789`, `-0.000001`, `99.9999999`, `-35.125` render exactly                                                                                                           | `-35.125%`, `12.5%`, `8.125%`, `-14.5%`, `61.25%` all exact                                                                                                                                                   |
| Clear invalid-legacy presentation for non-number/non-finite/out-of-range                                                                           | `describeDerivationFailure` (`:34-43`) → `display: "Invalid"`, `invalid: true`, `text-destructive font-medium`                                                                                                                                                                                                                                                                                                                                                                             | `allocation-grid.test.tsx:117-129`; **my oracle 5** independently asserts that none of `999, -250, NaN, ±Infinity, "abc", true, null, {}, -0` renders as `—`                                   | Not reachable via UI — §8                                                                                                                                                                                     |
| Owner remainder NEVER rendered as a user-entered allocation                                                                                        | `:64` gates `display` on `explicitStored`; remainder appears only inside the description string                                                                                                                                                                                                                                                                                                                                                                                            | **my oracle 6** renders a Person with no explicit key but 100% ownership: visible text is exactly `—`, and the description reads `Explicit: not stored. Effective: 70%. Owner remainder: 70%.` | Cell showed `—` with description `Explicit: not stored. Effective: 68.75%. Owner remainder: 68.75%.`                                                                                                          |
| Pointer AND keyboard activation open a local text draft                                                                                            | `:181-194` a real `<button>` with `onClick={beginEditing}`; native button semantics give Enter/Space                                                                                                                                                                                                                                                                                                                                                                                       | `allocation-grid.test.tsx:144-150`                                                                                                                                                             | Pointer click and `focus()`+`Enter` both opened the editor; editor auto-focused and selected                                                                                                                  |
| Commit path is EXCLUSIVELY P16C `setTransactionAllocation`                                                                                         | `PersonAllocationCell` calls only `onCommit` → `TransactionRow.onAllocationUpdate` → `TransactionTable.onTransactionAllocationUpdate` → `page.tsx:804-820` `handleTransactionAllocationUpdate` → `setTransactionAllocation`. **`grep -rn "allocations\[" src/components src/app` returns only reads** (`TransactionRow.tsx:343`, `PeopleTable.tsx:103`). No `replaceTransactionAllocations` or raw map write exists outside `src/lib/crdt` and `src/lib/domain/automation.ts` (P16C-owned) | preservation suites (343 tests)                                                                                                                                                                | All commits produced exactly one `sync.pushOps` request                                                                                                                                                       |
| Accept inclusive finite `[-100,100]` incl. signed decimals                                                                                         | `parseAllocationDraft` (`:119-136`) regex-gates the literal, then delegates to P16A `AllocationPercentageSchema` — the schema, not HTML min/max, is the boundary                                                                                                                                                                                                                                                                                                                           | `allocation-grid.test.tsx:67-86`; **my oracle 2** accepts 16 spellings incl. `+50`, `.5`, `-.5`, `1e2`, `1E-2`, `100.`, `-1e-9` with exact values                                              | `-35.125`, `12.5`, `40`, `8.125`, `-14.5`, `-18.75`, `61.25`, `27.5`, `44.5` all committed                                                                                                                    |
| Valid Enter/blur commits                                                                                                                           | `:148` `onBlur={commit}`, `:150-152` Enter                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `allocation-grid.test.tsx:150,164`                                                                                                                                                             | Enter commit and blur commit (`40%`) both verified                                                                                                                                                            |
| Numeric zero removes only that key                                                                                                                 | `commit` passes `0` through; P16C `allocations.ts:295-299` deletes the key on `value === 0`                                                                                                                                                                                                                                                                                                                                                                                                | `allocation-grid.test.tsx:163-165`                                                                                                                                                             | Set `40` then `0` → cell became `—`, description `Explicit: not stored.`, and the other two stored keys (`-35.125%`, `12.5%`) were untouched                                                                  |
| Escape restores without a write                                                                                                                    | `cancelEditing` (`:115-119`) — never calls `onCommit`                                                                                                                                                                                                                                                                                                                                                                                                                                      | `allocation-grid.test.tsx:167-171` asserts the call count does not increase                                                                                                                    | After typing `101` then Escape, cell returned to `—`; no request issued                                                                                                                                       |
| Reject empty-as-commit, `-101`, `101`, `NaN`, `Infinity`, exponent overflow, malformed/pasted text, negative zero — locally, no commit, repairable | regex rejects malformed/hex/spaced text and empty; `Number("1e999")=Infinity` → schema `.refine(Number.isFinite)`; `Object.is(value,-0)` → explicit negative-zero message                                                                                                                                                                                                                                                                                                                  | `allocation-grid.test.tsx:72-85`; **my oracle 1 rejects 33 spellings** incl. `-100.0000001`, `100.0000001`, `0b11`, `1_0`, `--5`, `1,5`, `1.2.3`, `½`, `50%`, `-0e0`                           | All of `101`, `-101`, `-0`, `NaN`, `1e999`, `12 apples`, `""` produced `aria-invalid="true"`, kept the editor mounted, and did not commit. Invalid Enter **retained focus**                                   |
| Invalid text keeps `aria-invalid` + associated accessible error, reserved geometry, no resize/occlusion                                            | `:159-160` `aria-invalid` + `aria-describedby={errorId}`; `:163-172` `role="alert"` with a `shrink-0` glyph and `sr-only` full message inside a fixed `h-8` flex row                                                                                                                                                                                                                                                                                                                       | `allocation-grid.test.tsx:159`                                                                                                                                                                 | **Measured**: row bounding box `57×974` identical during invalid state and after Escape; the following row's `top` stayed at `276` in both states. No shift, no occlusion                                     |
| Blur with invalid text must not commit or strand inaccessible state                                                                                | `commit()` returns early on parse failure, leaving `editing` true                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                              | I reproduced an invalid blur: the editor stayed mounted with `aria-invalid="true"` and a live `role="alert"`, and I repaired it in place by typing `12.5` + Enter → committed. Not stranded, not inaccessible |
| Tooltip/description distinguishes explicit vs P16A-derived effective vs owner remainder, exact P16A strings                                        | `:65-71` composes `Explicit: … Effective: {derivation.value.effectiveAllocations[personId]}%. Owner remainder: {derivation.value.ownerRemainder}%.` — both are P16A `ExactDecimalString`s emitted verbatim, never reformatted                                                                                                                                                                                                                                                              | `allocation-grid.test.tsx:100-115`                                                                                                                                                             | `Explicit: -35.125%. Effective: 100%. Owner remainder: 135.125%.` — remainder above 100 preserved, not normalized                                                                                             |
| Invalid derivation surfaced honestly, not faked                                                                                                    | `:60-61` — if `deriveEffectiveAllocations` fails, `describeDerivationFailure` reports _"Effective allocation unavailable because stored allocation or ownership data is invalid."_ and never emits an `Effective: N%` number                                                                                                                                                                                                                                                               | **my oracle 8**: with ownership summing to 60 (invalid), the cell keeps showing the explicit `50%` but the description contains no `Effective: <digit>` at all                                 | —                                                                                                                                                                                                             |
| Field identity is exact `allocation:<personId>` and part of cell identity                                                                          | `allocationField` (`:61-63`); `data-presence-field` at `:137,193`; `data-cell={column.field}` at `TransactionRow.tsx:345`. Matches P16C `allocationPresenceField` (`allocations.ts:215-217`) byte-for-byte                                                                                                                                                                                                                                                                                 | `allocation-grid.test.tsx:145`; `keyboard-navigation.test.ts:52`                                                                                                                               | `data-presence-field="allocation:person-default-me"` observed                                                                                                                                                 |
| Derivation memoized per row, shared across Person cells                                                                                            | `TransactionRow.tsx:162-175` — one `useMemo` per row passed to every cell as `effectiveDerivation`; the cell falls back to computing it only when the prop is absent (`:60`)                                                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                              | Corroborated by the latency numbers in §7                                                                                                                                                                     |

### 3.3 Add row

`page.tsx:332-379` `handleAddTransaction` was **not** changed by P16D beyond inheriting the shared
model; it already inserts a persisted transaction with `allocations: {}` (`:360`) through
`insertTransaction`, which routes through P16C `prepareInsertedAllocations`.

Manual: clicking Add produced a persisted row exposing **12 Person cells** matching the **12**
header columns, all rendering `—`, with `gridTemplateColumns` identical to the header. I committed
`-14.5` into that new row's second Person cell through the same central API, reloaded the page, and
the row and its `-14.5%` both survived. Automated: `virtualization.test.tsx:160-179` proves a newly
inserted row receives the identical allocation model.

### 3.4 Preservation

- **P16C** (`allocations.ts` central validation, per-key merge/LWW, rollback, history, persistence,
  public API routing) — untouched by this range; `tests/integration/allocation-crdt.test.ts` passes.
- **P16A** domain — untouched; `allocation.test.ts`, `ownership.test.ts`, `settlement.test.ts` pass.
- **P13 add-row / P09 undo / P14 import** — `transaction-operations.test.ts`, `undo.test.tsx`,
  `import.test.ts`, `automation.test.ts` pass (8 files, 343 tests, 2 pre-existing skips).
- **Description-alias, drop-zone, selection, filtering, duplicate handling, vertical virtualizer** —
  covered by the full 103-test E2E suite passing with retries disabled.

## 4. Independently generated mechanisms and oracles

I wrote 8 oracles of my own (outside the repository, run against production modules through the
repo's real vitest/jsdom stack, then deleted). They are deliberately _stricter_ than the shipped
tests:

1. **Exhaustive rejection** — 33 spellings including near-boundary `-100.0000001`/`100.0000001`,
   alternate radixes `0x10`/`0b11`, numeric separators `1_0`, three negative-zero spellings (`-0`,
   `-0.0`, `-0e0`), `½`, `50%`, `1/2`, `1 2`, `--5`, `1,5`, `1.2.3`. **All rejected.**
2. **Exhaustive acceptance** — 16 spellings with exact value equality (`+50`→50, `.5`→0.5,
   `1E-2`→0.01, `100.`→100, `-1e-9`→-1e-9). **All accepted with exact values.**
3. **Model determinism** — reversing both input arrays yields a byte-identical column array; `$cid`
   excluded; numeric-zero-only key excluded; `-0` and `NaN` legacy keys **retained**; every
   `field === \`allocation:${personId}\``; template segment count `= 8 +
   columns.length`; model and columns array both `Object.isFrozen`. **Passed.**
4. **Label honesty** — deleted → `Gone (deleted)`; missing → `Unknown person no-record-42` and the
   label _contains_ the raw stable ID. **Passed.**
5. **No hidden legacy value** — 10 invalid stored values, none renders as the absent `—`.
   **Passed.** This is the strongest guard against the "silent drop" failure mode.
6. **No remainder-as-explicit** — a Person with ownership but no explicit key renders visible text
   exactly `—` while the accessible description carries the effective/remainder values. **Passed.**
7. **No display rounding** — 4 high-precision decimals render byte-exact. **Passed.**
8. **Honest invalid derivation** — with ownership totalling 60, the description contains
   `Effective allocation unavailable` and **no** `Effective: <digit>` substring. **Passed.**

Result: `Test Files 1 passed (1) / Tests 8 passed (8)`. One oracle initially failed because _my_
expectation was wrong — I had assumed `-0` history should be dropped. Reading FS-001 ("Never clamp,
normalize, delete or rewrite invalid values") and HANDOFF ("Invalid legacy entries must remain
visible as an issue state and individually repairable"), retaining `-0` is the **correct**
behaviour, and `hasHistoricalAllocation` drops only `Object.is(value, 0)`. I corrected my oracle,
not the product. This is worth recording because it is a place where a sloppier reviewer could have
raised a false finding.

## 5. Automated command results (all run by me, retries disabled)

| Command                                                                                                                                   | Result                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest run tests/unit/transactions/allocation-grid.test.tsx` (clean process)                                                             | **5 passed**                                                                                                                                                                              |
| `vitest run tests/unit/transactions/virtualization.test.tsx` (clean process)                                                              | **4 passed**                                                                                                                                                                              |
| `vitest run tests/unit/transactions/keyboard-navigation.test.ts` (clean process)                                                          | **32 passed**                                                                                                                                                                             |
| allocation-grid repeated in a second clean process (determinism)                                                                          | **5 passed**, identical                                                                                                                                                                   |
| Preservation: `allocation` + `ownership` + `settlement` + `allocation-crdt` + `transaction-operations` + `undo` + `import` + `automation` | **8 files / 343 passed, 2 skipped**                                                                                                                                                       |
| `pnpm test` (full)                                                                                                                        | **65 files / 1499 passed, 2 skipped** — matches the implementer's count; no flake in my run                                                                                               |
| `pnpm typecheck`                                                                                                                          | **exit 0**                                                                                                                                                                                |
| `pnpm lint`                                                                                                                               | **exit 0** — 0 errors, 10 warnings, all `no-unused-vars` in pre-existing crdt/import test files untouched by P16D                                                                         |
| `pnpm build`                                                                                                                              | **exit 0**, all routes built                                                                                                                                                              |
| `pnpm format:check` (repository)                                                                                                          | exit 1 on **15 inherited** doc paths (root ledgers, `human-scratch.md`, P12/P14 evidence, and the uncommitted `evidence/P16D/implementation-01.md`). **Zero** are P16D product/test paths |
| `oxfmt --check` on exactly the 12 changed paths                                                                                           | **"All matched files use the correct format."**                                                                                                                                           |
| `git diff --check 3a5081a b5ebc2a`                                                                                                        | **clean** (exit 0)                                                                                                                                                                        |
| `playwright test tests/e2e/transactions.spec.ts --workers=1 --retries=0 --repeat-each=3 --reporter=line`                                  | **120 passed (7.8m)** — 40 tests × 3 repeats, zero flakes                                                                                                                                 |
| `playwright test --workers=1 --retries=0 --reporter=line` (full suite)                                                                    | **103 passed (6.7m)**                                                                                                                                                                     |

No arbitrary waits, no retry-dependent green, no inconsistent run needing diagnosis. The E2E
selectors are role/accessible-name based; the two text-based assertions target header content that
_is_ the acceptance criterion. I found no sleeps, hidden retries, or test-only production hooks
(`data-presence-field` is a required data-semantic per HANDOFF, not a test hook).

One weak assertion worth noting (not blocking): `transactions.spec.ts` asserts
`Date.now() - startedAt < 2_000` around the edit round-trip. That is a smoke bound, not a `<100ms`
proof; the real target is evidenced separately in §7.

## 6. Manual browser charter — headless `playwright-cli -s=p16d-rev-01`

Real onboarding → People → Transactions journey against a dev server I started myself. Onboarding
was completed **without activating the reveal control**; no recovery phrase, seed, or key was read,
copied, or recorded.

**Scale:** 14 People created through the ordinary UI (`Me` + 12 named + 1 extra), 30 persisted blank
transactions added through the ordinary Add button. Grid rendered 14 Person columns and 19 of 30
rows (vertical virtualization live), with real horizontal overflow.

### Alignment and geometry

- Header ≡ data row ≡ notes row computed `gridTemplateColumns` (all three compared equal).
- All 22 column left offsets identical between header and row:
  `297, 345, 481, 647, 823, 979, 1105, 1233, 1361, 1489, 1617, 1745, 1873, 2001, 2129, 2257, 2385, 2513, 2641, 2769, 2897, 3025`.
- Overflow real: scrollWidth **2848** vs clientWidth **974**.
- After `scrollLeft = 1400`: header and row column 6 both at `x = -295`; notes-cell right edge
  `1713` ≡ last header column right edge `1713`.

### Column states

- **Active**: all 12 named People + `Me`, ordered exactly as the People screen.
- **Historical (deleted)**: reproduced end-to-end (see §3.1). `Rev Person 09 (deleted) %` appeared
  **after** every active column, retained `61.25%`, accessible name
  `Edit Rev Person 09 (deleted) allocation`.
- Column correctly **disappears** when no displayed transaction references the deleted Person —
  confirming discovery is driven by the displayed prefix, not by stale state.

### Deterministic accessibility snapshot (allocation cell)

| State        | Expected                                                                                                                                 | Observed                                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default      | role `button`, name `Edit Me allocation`, value `—`, `aria-invalid` unset, description explicit/effective/remainder, tabIndex 0, enabled | role `button`, name `Edit Me allocation`, value `—`, `aria-invalid` null, description `Explicit: not stored. Effective: 68.75%. Owner remainder: 68.75%.`, tabIndex 0, enabled ✅ |
| Editing      | role `textbox`, name `Me allocation percentage`, description = the same explicit/effective/remainder text                                | role `textbox`, name `Me allocation percentage`, value ``, description `Explicit: not stored. Effective: 68.75%. Owner remainder: 68.75%.` ✅                                     |
| Invalid      | role `textbox`, `aria-invalid="true"`, description = associated error, live `role="alert"`                                               | `aria-invalid="true"`, description `!Enter a finite number from -100 to 100.`, alert present with the same text ✅                                                                |
| After Escape | back to default button, original value restored, no write                                                                                | role `button`, name `Edit Me allocation`, value `—`, description restored ✅                                                                                                      |

### Input matrix (all in the real grid)

Rejected without commit, editor mounted, `aria-invalid="true"`: `101`, `-101`, `-0`, `NaN`, `1e999`,
`12 apples`, `""` (empty-as-commit). Invalid **Enter retained focus**. Invalid **blur** left the
editor mounted with a live alert and was **repaired in place** (typed `12.5` + Enter → committed).

Accepted and committed via the central API: `-35.125` (pasted via clipboard), `12.5`, `40`, `8.125`,
`-14.5`, `-18.75`, `61.25`, `27.5`, `44.5`, `5.5`, `-7.25`, `33.75`. Zero (`0`) removed only that
key — the cell returned to `—` with `Explicit: not stored.` while the other two stored keys were
unchanged. Escape restored without a write.

### Geometry under invalid state

Row bounding box `57×974` **identical** during the invalid state and after Escape; the next row's
`top` stayed at `276` in both. No resize, no shift, no occlusion of the virtualized row.

### Refresh, undo/redo

Reload persisted `-35.125%` and `12.5%`. One-action Undo on a fresh in-session commit (`-7.25%`)
returned the cell to `—`; one Redo restored `-7.25%`. (Undo history is session-scoped and resets
across reload — pre-existing P09 behaviour, not a P16D regression.)

### Two-peer convergence and P10 boundary

A second authenticated tab was opened via a browser-initiated `window.open` (inheriting
sessionStorage). Tab 1 held `44.5%` on _Rev Person 00_. Tab 2 loaded and **saw that 44.5%**, then
wrote `-18.75%` to a **different** Person cell (_Rev Person 04_). Returning to tab 1, **both**
values were present: `44.5%` and `-18.75%`.

This proves **real CRDT different-cell value convergence only**. It does **not** demonstrate
encrypted field presence. I independently verified the code does **not** broadcast presence:
`page.tsx:159-162` still passes a permanently empty
`presenceByTransactionId = useMemo(() => ({}), [])` with the pre-existing comment "we don't have
transaction-level presence tracking". The cell emits `data-presence-field` as a **local DOM data
attribute only** — no transport, no subscription, no broadcast. The evidence's convergence claim is
honest and does **not** overstate P10; the evidence explicitly records "This proves value
convergence only. P10 encrypted field-presence transport remains absent and is not claimed." **I
confirm that statement is accurate.**

### Privacy sentinel

Boolean-only check over request post-bodies during an allocation commit: **1** request
(`/api/trpc/sync.pushOps`), and the regex `/Rev Person|Rev Doomed|allocation:/` matched **false**.
No plaintext Person name or field identity left the client. The payload itself was never logged or
recorded.

### Console and network

Console: **6 messages, 0 errors, 0 warnings** (React DevTools notice, HMR connected, 4 SyncManager
info logs). Network: **0** failed requests and **0** responses ≥400 across a monitored commit cycle.

### Reflow, zoom, dark, reduced motion

| Condition | Header≡Row template | Horizontal scroll | Cell box | Document overflow |
| --------- | ------------------- | ----------------- | -------- | ----------------- |
| 1280×720  | ✅                  | ✅                | 112×32   | none              |
| 640×480   | ✅                  | ✅                | 112×32   | none              |
| 320×720   | ✅                  | ✅                | 112×32   | none              |
| 200% zoom | ✅                  | ✅                | 224×64   | none              |

The allocation cell stayed visible and reachable at 200% zoom. Dark scheme (real `.dark` class, the
project's actual mechanism — it is class-based, not `prefers-color-scheme`) and
`reducedMotion: reduce` were both applied; layout and alignment held.

### Contrast (measured, with lab()/oklab() → sRGB conversion and alpha compositing)

The project emits CSS `lab()`/`oklab()` colors, which naive parsers mis-read. I implemented proper
CIELAB and Oklab → linear-sRGB conversion plus background alpha compositing up the ancestor chain.

| Target                                                  | Foreground         | Background         | Ratio     | Threshold                 | Verdict                                                      |
| ------------------------------------------------------- | ------------------ | ------------------ | --------- | ------------------------- | ------------------------------------------------------------ |
| Cell text, light                                        | `rgb(108,115,123)` | `rgb(248,249,235)` | **4.50**  | 4.5 (AA normal, 14px/400) | meets AA exactly                                             |
| Cell text, dark                                         | `rgb(157,159,161)` | `rgb(16,23,40)`    | **6.75**  | 4.5                       | passes                                                       |
| Focus ring, light (`0 0 0 2px`)                         | `rgb(18,23,36)`    | `rgb(248,249,235)` | **16.79** | 3.0 (non-text)            | passes                                                       |
| Invalid/error glyph+text, light (12px/700 = large-bold) | `rgb(237,0,0)`     | `rgb(248,249,235)` | **4.26**  | 3.0 (AA large ≥14px bold) | passes at large-bold; **below 4.5** if judged as normal text |
| Editing input text, light                               | `rgb(3,6,19)`      | `rgb(248,249,235)` | **18.94** | 4.5                       | passes                                                       |

The error indicator's 4.26 is a borderline case: at 12px/700 it does not meet the ≥14px-bold
threshold for the AA "large text" exemption, so strictly it is short of 4.5. **However** the visible
glyph is a decorative `!` whose full message is carried in an `sr-only` span inside a `role="alert"`
and is programmatically associated via `aria-describedby` — the information is not
contrast-dependent. Both the muted body color and the destructive token are **pre-existing design
system tokens** (`text-muted-foreground`, `text-destructive`) used unchanged across the app, not
introduced or altered by P16D. I record this honestly as a **non-blocking observation**, not a P16D
defect.

## 7. Performance vs `<100ms`

Measured in the real UI: activation click → `fill` → `Enter` → central mutation → **committed
rendered button text**, polled to the rendered value (not an isolated domain-mutation timing).

- Environment: headless Chromium via repository `playwright-cli`, Next.js **dev** server (not a
  production build), local Supabase stack, 14 rendered virtualized rows, **13 Person columns**.
- 5 warmup iterations discarded; **40 measured samples**.

| Metric  | Value        |
| ------- | ------------ |
| min     | 47.2 ms      |
| **p50** | **62.2 ms**  |
| **p95** | **99.5 ms**  |
| **max** | **158.1 ms** |

**Honest assessment:** p50 and p95 meet the `<100ms` target, but p95 clears it by only 0.5 ms and
**max exceeds it by 58 ms**. My figures are in the same regime as the implementer's claim (p50 62,
p95 93, max 108) but with a worse tail. Two caveats in the product's favour: this is a **dev** build
with HMR and unminified React, and the harness overhead of `click`/`fill`/`press` plus a polling
`waitForFunction` is included in every sample. I report the miss explicitly rather than paper over
it; I do not treat a tail excursion in a dev build as a blocking failure of a target that the task
states as an interaction target and that p95 satisfies.

## 8. Honesty checks and environmental limitations

**Invalid-legacy display.** The `Invalid` presentation and the `Unknown person <id>` label are
**correct in code and proven by automated tests plus my own independent oracles**, but they are
**not reachable through the product UI** and I state that plainly rather than implying I saw them in
a browser:

- People are only ever **soft-deleted** (`PeopleTable.handleDelete` → `{type:"delete"}` sets
  `deletedAt`); no product path purges a Person record, so `Unknown person <id>` requires legacy or
  externally-authored data.
- The grid itself now rejects every invalid value at the boundary, so a user cannot create an
  `Invalid` cell through the UI. Reaching it requires pre-existing malformed CRDT data.

This is an honest environmental limitation of the manual charter, not an unmet criterion. The
behaviour is verified at the unit level from three independent directions (the implementer's tests,
and my oracles 4 and 5).

**Deleted-person delete guard.** `PeopleTable` sets `canDelete={!personHasTransactions(person.id)}`,
so a Person holding any allocation cannot be deleted directly. I worked within that pre-existing
guard (delete the transaction → delete the Person → undo the transaction deletion) rather than
around it, and still reproduced the historical column. This is pre-existing P-package behaviour,
outside P16D's scope.

**P10 boundary.** Verified honest — see §6. No presence transport was invented, weakened, or
claimed.

**Working-tree note (disclosure, not a finding).** `next-env.d.ts` shows as modified in my working
tree. This is a Next.js build artefact regenerated by the `pnpm build` **I** ran during verification
(`./.next/types/` → `./.next/dev/types/`); it is not part of `b5ebc2a` and is not attributable to
P16D. Per my constraints I did not run `git restore`/`git checkout` to revert it. Root may safely
restore it. No other tracked file was modified; `git rev-parse HEAD` is unchanged at `6b8ec5d`.

## 9. Findings

**Blocking findings: none.** I specifically hunted for each automatic-FAIL condition and found none:

- Orphan-only/aggregate cell left in place — **no**, fully decomposed and mounted in the real grid.
- Direct allocation object mutation bypassing P16C — **no**, grep-verified; only reads in
  page/components.
- Hidden/lost legacy value or silent drop/clamp/round/rewrite by render — **no**, oracle 5 and
  oracle 7 disprove it.
- Remainder rendered as explicit allocation — **no**, oracle 6 disproves it.
- Any invalid input committing — **no**, 33 rejected spellings plus 7 in-browser rejections.
- Unstable or misaligned columns — **no**, order-independence proven and pixel offsets identical.
- Virtualization or focus regression — **no**, range extractor untouched, suites pass.
- False or overstated presence/P10 claim — **no**, the evidence's boundary statement is accurate.
- Missing/weak/brittle E2E — **no**, 120 passing repeats with retries disabled.
- Inaccessible edit/error state — **no**, full role/name/state snapshot verified.
- Real console error or unexplained failed request — **no**, zero of each.
- Materially unmet acceptance criterion — **none found**.
- Changed path outside the authorized set — **none**.

**Non-blocking observations (3, informational):**

1. **Low** — Error-indicator contrast 4.26:1 at 12px/700 sits below AA normal-text 4.5 (§6). Uses
   pre-existing design tokens; the message is fully conveyed via `role="alert"` + `sr-only` +
   `aria-describedby`, so no information is contrast-dependent. Not introduced by P16D.
2. **Low** — Interaction `max` of 158.1 ms exceeds `<100ms` in a dev build, though p50/p95 meet it
   (§7). Reported explicitly, not papered over.
3. **Informational** — `transactions.spec.ts` includes a 2000 ms smoke bound on the edit round-trip
   which is not a `<100ms` proof; the real evidence is the sampled measurement in §7.

**Q-proposals raised: none.** I encountered no ambiguity that existing authority failed to resolve.
The one case where I initially suspected a defect (retention of `-0` history) is unambiguously
decided by FS-001's reject-only/never-rewrite clause and HANDOFF's invalid-legacy retention clause
in favour of the implementation.

## 10. Cleanup

- `playwright-cli -s=p16d-rev-01 delete-data` → `No user data found for browser 'p16d-rev-01'.`
- `playwright-cli -s=p16d-rev-01 close` → `Browser 'p16d-rev-01' is not open.`
- `playwright-cli list` → **`(no browsers)`** — session gone.
- `.playwright-cli/` is git-ignored (`.gitignore:40`); it holds only console/snapshot logs and no
  secret material. No recovery phrase, seed, or key was ever read, copied, or written.
- My dev server was stopped; `ss -ltnp | grep :3000` → **port 3000 free**.
- All my temporary verification artefacts (external vitest config, oracle test file, contrast
  helper, and the `node_modules` symlinks used to resolve them) were deleted from `/tmp`. **None of
  them ever lived inside the repository.**
- `git status --porcelain` shows only ` M next-env.d.ts` (build artefact, §8) and the untracked
  implementer evidence directory. No commit, no staging, no history rewrite. I wrote exactly one
  file: this review.

## 11. Verdict

Every P16D acceptance criterion in FS-001 §P16D, HS-009 §P16D, canonical §8, and the HANDOFF grid /
cell / test contracts maps to a concrete code location, a passing automated test, and reproduced
manual browser evidence. The orphan aggregate component is genuinely retired into a real one-Person
grid cell; every write routes exclusively through P16C `setTransactionAllocation` with no direct
allocation mutation anywhere in the page or components; explicit, effective and owner-remainder
values are kept rigorously distinct with exact P16A strings and no display rounding; invalid legacy
data is retained and repairable rather than dropped, clamped or rewritten; the header, every
virtualized row, the expanded notes row and the newly inserted Add row share one memoized template
that stayed pixel-aligned under real horizontal overflow, 200% zoom and 320px reflow; all
out-of-range, non-finite, negative-zero and malformed inputs are rejected locally without committing
while remaining focused and repairable, with an accessible error that does not resize or occlude the
virtualized row; two-peer different-cell CRDT value convergence is real and the P10 transport
boundary is stated honestly and matches the code. My independently written oracles — deliberately
stricter than the shipped tests on rejection breadth, legacy retention, remainder isolation and
derivation honesty — all pass against production. The full unit suite, typecheck, lint, build,
changed-path format check, 120 repeated retries-disabled E2E runs and the full 103-test E2E suite
all pass with no flake. The three non-blocking observations (pre-existing token contrast on the
error glyph, a dev-build latency tail above the target while p50/p95 meet it, and a weak smoke bound
in one E2E assertion) are recorded explicitly and none constitutes a materially unmet criterion or
an automatic-FAIL condition.

VERDICT: PASS

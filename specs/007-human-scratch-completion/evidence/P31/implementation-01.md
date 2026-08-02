# P31 — UR-010 implementation evidence, revision 01

- **Package/revision:** P31 / 01
- **Requirement:** UR-010, frozen source `specs/012-transaction-selection/spec.md` lines 11-29
  (markerless, immutable — not read for edit, not edited)
- **Implementer:** `p31-implementer-01`
- **BASE:** `054f77e057b4af9921afc81d1459f5a00d92193e`
- **HEAD:** `256e53326085964a9ddf85d603cb847d52fe7ba5`
- **Range:** non-empty
- **Companion package:** P32 / UR-011, implemented in the same change set. Both requirements live in
  `useTableSelection.ts` and both hinge on the same matching-row input, so splitting them would have
  guaranteed a conflict in one hook. Evidence is written per package;
  `evidence/P32/implementation-01.md` covers UR-011.

## Acceptance mapping — UR-010 clause by clause

| Frozen clause (`spec.md`)                                                                                                              | Where satisfied                                                                                                                                                 | Test                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `:22-23` range applies the anchor's own outcome; selecting selects, deselecting deselects                                              | `useTableSelection.ts` `toggleRow`, passing `anchor.outcome === "selected"` to `setRowsSelected`; `SelectionAnchor` in `table-selection.ts` carries the outcome | unit "DEselects the range when the anchor row was deselected", "deselects a range that spans already-mixed rows"; E2E `T021d`                                                                                            |
| `:24-25` range covers every row between anchor and clicked row in the order the table presents them, under filters and sort, inclusive | `findRowRange` + `rowIdsInRange` over `matchingRowIds`, which is the filtered, sorted result set                                                                | unit "extends a selection when the anchor row was selected", "extends upwards from the anchor", "spans a range whose interior rows were never rendered", "deselects across an unrendered interior just as symmetrically" |
| `:26` rows outside the range keep the state they had                                                                                   | `setRowsSelected` only writes the named ids                                                                                                                     | unit "leaves rows outside the deselected range exactly as they were"; E2E `T021d` asserts the two flanking rows                                                                                                          |
| `:27` the clicked row becomes the new anchor                                                                                           | `setAnchor({ rowId: id, outcome: anchor.outcome })` on the range branch                                                                                         | unit "makes the clicked row the new anchor", "carries a deselecting anchor across successive shift-clicks"; E2E `T021d` third step                                                                                       |
| `:28` where no anchor exists, ordinary single toggle                                                                                   | range is `null` when `anchor == null`, falling through to the toggle branch                                                                                     | unit "behaves as an ordinary toggle when no anchor exists", "falls back … when the anchor row left the result set", "ignores an anchor the selection no longer agrees with"                                              |
| `:29` keyboard range selection follows the same rule as the pointer                                                                    | No separate path exists or is added — see "Keyboard clause" below                                                                                               | E2E `T021e` (both directions)                                                                                                                                                                                            |

## Root cause, confirmed rather than assumed

Root's diagnosis was correct. At the pre-change `useTableSelection.ts:106-133` the shift branch only
called `newIds.add(filteredIds[i])`, so a range could never deselect. The deeper cause was also as
root described: `lastSelectedId` recorded _which_ row was last acted on but never _what was done to
it_, so the code had no way to know which outcome to apply.

The fix makes the anchor carry its action: `SelectionAnchor = { rowId, outcome }` where `outcome` is
`"selected" | "deselected"`. The range branch then applies `anchor.outcome`, and the clicked row
becomes an anchor carrying that same outcome so a further shift-click continues in the same
direction.

One case the frozen text does not name but that falls out of the requirement: the page replaces the
whole selection in places the gesture never sees (the People page's `?transaction=` deep link seeds
one row via `selectOnlyRow`). A surviving anchor can then claim an outcome the selection no longer
holds. `anchorMatchesSelection` treats such an anchor as absent, so `:28` governs and the gesture is
an ordinary toggle rather than extending a fiction.

## Keyboard clause — deviation from the brief, stated explicitly

The dispatch expected a keyboard path. There is none to add, and adding one would be wrong. The row
checkbox is a real `button` (Radix `CheckboxPrimitive.Root`), so a browser's `Shift+Space`
dispatches a click event carrying `shiftKey`, which reaches the _same_ `CheckboxCell.handleClick` as
the pointer gesture and therefore the same `toggleRow`. Symmetry is structural, not duplicated.

**This could not be confirmed under unit test**: jsdom does not synthesize a click from keyboard
activation, so a jsdom probe reports nothing either way and would be misleading evidence. E2E
`T021e` on real Chromium is the verification, exercising both a selecting and a deselecting range
from the keyboard alone.

**`T021e` now passes, in every campaign run.** The claim above is therefore demonstrated rather than
argued: `Shift+Space` on the row checkbox does reach the same handler as the pointer gesture, and
the deselecting direction works from the keyboard exactly as it does from the mouse. Had it failed,
this clause would have needed a real keyboard path; it did not.

`useGridCellNavigation` was inspected and is focus-only (arrow keys move the caret between cells);
it has no selection behaviour to keep in step.

## Blindness check — each assertion, would it pass with the defect present?

Verified by re-injecting the defect into the real tree and running, not by reasoning:

| Injected defect                                                           | Result                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Range branch passes `true` instead of `anchor.outcome` (the original bug) | **5 failures**: "DEselects the range when the anchor row was deselected", "leaves rows outside the deselected range exactly as they were", "deselects a range that spans already-mixed rows", "carries a deselecting anchor across successive shift-clicks", "deselects across an unrendered interior just as symmetrically" |
| Range clipped to the first 50 matching ids                                | **2 failures**: "spans a range whose interior rows were never rendered", "deselects across an unrendered interior just as symmetrically"                                                                                                                                                                                     |

The four pre-existing range tests (which assert only that a range gets selected) pass against the
defect, as expected — they are why the requirement was needed and are exactly the blindness the new
assertions close. They are retained, because the select direction must keep working.

## Changed paths

- `src/components/features/transactions/table-selection.ts` — **new**, the pure model
- `src/components/features/transactions/hooks/useTableSelection.ts` — rewritten
- `src/components/features/transactions/TransactionTable.tsx`
- `src/components/features/transactions/index.ts`
- `src/app/(app)/transactions/page.tsx`
- `tests/unit/transactions/selection.test.ts` — rewritten
- `tests/unit/transactions/select-all-beyond-page.test.tsx` — **new** (primarily P32)
- `tests/unit/transactions/selection-invariants.test.ts` — **new**, fast-check properties (P32)
- `tests/unit/transactions/add-transaction-focus.test.tsx` — prop migration only
- `tests/e2e/transactions.spec.ts` — `T021d`, `T021e` added (P31); `T021f`, `T021g` added (P32)

## Debug leftovers removed

The three `console.log` calls in `useTableSelection.ts` (pre-change `:71`, `:82`, `:94`) are gone.
Repo-wide `console.log` occurrences in `src` went **14 → 11**; the remaining 11 are the deliberate
`SyncManager` logging and docstring examples, untouched as instructed.

## Commands and results

| Command                             | Result                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                    | pass                                                                                                              |
| `pnpm lint`                         | 0 errors, 1 warning — pre-existing TanStack Virtual react-compiler warning at `TransactionTable.tsx:455`          |
| `pnpm exec oxfmt --check src tests` | clean, 456 files                                                                                                  |
| `pnpm format:check` (repo-wide)     | 18 files flagged, **all pre-existing root-owned `specs/**`\*\* — not touched                                      |
| `pnpm test`                         | 2440 passed, 2 skipped, 126 files. Repeated 3x; one pre-existing load-dependent flake, see below                  |
| E2E full suite, `--retries=0`       | 5 runs, 2 trees. Latest: **185 passed / 4 failed**, all 4 P30's. **Not a valid single-tree campaign** — see below |

## Guard mutation testing, and one guard removed

Every guard added by this package was mutated to confirm a test fails without it. The tree was
restored and verified byte-identical by md5 after each mutation, so none of this contaminated the
campaign.

| Mutation                                                        | Result                                                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `isRowSelected` ignores the baseline, always reading exceptions | **6+ failures**, including all three fast-check properties                                |
| Trailing identity-preservation block deleted                    | **1 failure**: "preserves identity when nothing changed, so React can skip the re-render" |
| Leading `previousMatchingRowIds === nextMatchingRowIds` guard   | **0 failures** — see below                                                                |

**The leading guard was unreachable and has been removed** (`b138894`). It compared the two id
arrays by reference, but the sole caller already makes exactly that comparison before calling:
`page.tsx:285` only reconciles when `matchingIdsAtSelection !== filteredTransactionIds`. So the
branch could never be taken in the product, and nothing tested it. Per the standing rule, a guard
with no test that fails without it is either pinned or removed; this one could not be meaningfully
pinned, because a test for it would have had to call the function in a way the product never does.

**The sole-caller premise is load-bearing, so it was checked rather than assumed, then made not to
matter, and finally removed as a premise altogether.** At the time of the guard removal
`reconcileToMatchingRows` was re-exported from `index.ts`, so a future caller could reach it without
`page.tsx`'s comparison. A grep across `src` and `tests` found exactly one product call site plus
that barrel re-export — but a premise like that stops being true quietly, so the removal was made
safe independently of it: with the guard gone, a same-reference call is still a no-op returning the
input by identity, because the _trailing_ identity block handles it. That is now pinned under
**both** baselines and for both the same-reference and equal-but-distinct array cases (`0398d19`);
previously only the `no-rows` baseline was covered. Deleting the trailing block reddens that test.

**The premise was then eliminated rather than insured against** (`a67c3f9`, widened by `256e533`).
The independent reviewer measured what a barrel caller would actually cost: identity is preserved in
all four selection shapes, but a redundant call runs **~19.5 ms at 100,000 matching rows** where the
removed guard was O(1). That is not a performance nicety — `spec.md:52-55` makes efficiency a hard
requirement and names a hundred-thousand-transaction vault, so such a caller on a render path would
breach the frozen clause with nothing in the types or tests objecting. The durable fix is not to
restore the guard but to stop publishing the function.

**Root then ruled the fix should cover the class rather than the instance, and that is what
shipped.** The reviewer's argument — that publishing a primitive with a caller-side precondition
turns a local invariant into a public trap — does not distinguish `reconcileToMatchingRows` from its
thirteen neighbours in the same module. So `256e533` removes the **entire** selection re-export
block from `index.ts`, not one line. Verified safe before removing: nothing in `src` or `tests`
consumed **any** selection primitive through the barrel — `page.tsx` and both test files import from
`table-selection` directly — and with the whole block gone, typecheck is clean and the full unit
suite passes (2443 passed, 2 skipped).

The reason now lives in the **module** docstring rather than one function's, since whoever considers
re-adding the block will be reading `table-selection.ts`. The per-function note is reduced to the
precondition and its measured cost. This was the reviewer's suggestion, root's ruling on scope, and
my measurement that the wider removal was safe — recorded that way because none of the three alone
would have produced it.

### Why both baselines needed pinning, and not just for symmetry

The two baselines are **different code paths through the same function**, so a test covering one
says nothing about the other. Only `all-matching` enters the middle branch — the one that walks
`nextMatchingRowIds` and adds newly-matching rows to the exception set. Under `no-rows` that branch
is skipped entirely, so an `all-matching` selection carrying exceptions is the only shape where
reconciliation has real work to preserve.

That is a claim about coverage, so it was **measured rather than reasoned about**. A defect was
injected into the `all-matching` branch alone — dropping the `previousMatchingRowIdSet` check so
every next row becomes an exception — and both versions of the identity test were run against it:

| Test version                                                  | Against an `all-matching`-only defect |
| ------------------------------------------------------------- | ------------------------------------- |
| Pre-`0398d19`, building its selection from `NO_ROWS_SELECTED` | **passes** — cannot see the defect    |
| Post-`0398d19`, also covering `ALL_MATCHING_ROWS_SELECTED`    | **fails**                             |

So the earlier test was blind to an entire branch, and would have kept passing while the branch it
never entered was broken. This is the fixture-axis rule in its exact form: **`baseline` is an axis
the code branches on, and a fixture set that holds it constant cannot see defects on the other
side.** Tree restored byte-identical (`md5 d80f67784a3e`) after the injection; no probe file was
left behind.

## E2E campaign

Run in an isolated worktree **outside** the repo at `/tmp/mf-p31`, `env -u CI`, full suite,
`--retries=0`, port :3000 granted and sequenced by root. Playwright reported **188 tests in 24
files** — above root's 187 tripwire, confirming the base was current rather than stale.

**Scope limitation, stated up front: the campaign tree contained P30's unreviewed rev 02/03 work.**
The two packages are fused in history from `e97b3f7` onward, so no run here is evidence for P31/P32
alone. Runs 1-4 were taken across two different trees and are **not a valid single-tree campaign**;
run 5 is a single clean run on the corrected tree. The selection results below are reported as what
they are — repeated observed passes — not as a three-run campaign digest.

| Run | Tree digest (`transactions.spec.ts`) | Result                | Failures                           |
| --- | ------------------------------------ | --------------------- | ---------------------------------- |
| 1   | `4e4289ecdab7`                       | 182 passed / 6 failed | 4 × P30 + **2 × mine** (see below) |
| 2   | `ae01e23a7b6d`                       | 184 passed / 4 failed | 4 × P30                            |
| 3   | `ae01e23a7b6d`                       | 184 passed / 4 failed | 4 × P30                            |
| 4   | `ae01e23a7b6d`                       | 184 passed / 4 failed | 4 × P30                            |
| 5   | `ae01e23a7b6d`                       | 185 passed / 4 failed | 4 × P30                            |

Run 5 was taken on a **later** HEAD (`d6567f6`), after P30 landed its Escape fix and a test. My
three files were byte-identical across runs 2-5 — `transactions.spec.ts` `ae01e23a7b6d`,
`table-selection.ts` `8602eb31a503`, `useTableSelection.ts` `1ac828cc7b54`.

**Those digests describe the campaign tree, NOT current HEAD.** Two later commits of mine changed
files the campaign covered, so **no E2E run in this table validates current HEAD**:

| File                 | Campaign digest | HEAD digest    | Changed by                          |
| -------------------- | --------------- | -------------- | ----------------------------------- |
| `table-selection.ts` | `8602eb31a503`  | `d80f67784a3e` | `b138894` unreachable-guard removal |
| `selection.test.ts`  | (campaign era)  | `464bf6bb54c7` | `0398d19` both-baselines pinning    |

An earlier revision of this file concluded the opposite — that the run-5 result "describes current
HEAD" — which was true when written and was falsified by my own subsequent commits. Corrected here
after the independent reviewer caught it (finding F-5). The delta is a two-line deletion of dead
code plus a strengthened unit test; both are covered by the unit suite at HEAD and by a differential
property test showing the guard removal is observationally identical to its predecessor over 1000
randomized cases, including reference identity on the same-reference call. **Neither is covered by
an E2E run, and that gap is real rather than argued away.**

**All five selection tests pass, in every run after the fix**: `T021c` (pre-existing range),
`T021d`, `T021e`, `T021f`, `T021g`. **Zero failures in `transactions.spec.ts` in runs 2-5.** Run 5
was the latest tree any E2E run covered — which, per the table above, is **not** current HEAD.

**`T021e` passing is the load-bearing result for the keyboard clause.** It is the only evidence that
`spec.md:29` holds, since jsdom cannot synthesise a click from keyboard activation. Real Chromium
confirms `Shift+Space` on the row checkbox reaches the same handler as the pointer gesture, in both
the selecting and the deselecting direction. **The clause needs no separate code path, and this is
now demonstrated rather than argued.**

### My own two failures in run 1, and the fix

`T021f` and `T021g` timed out after 30s on `getByPlaceholder(/search transactions/i)`. That is
`SearchFilter`'s **own default** placeholder; the transactions page overrides it with
`"Search description, notes..."`, so the locator never resolved against an element that was on
screen the whole time. Fixed in `07bc3d4` by using the `search-filter` test id that the rest of this
spec already uses. **This is a test defect I introduced and it was caught only by running the real
browser** — the unit test passed either way, because its jsdom fixture rendered the component's
default.

### The 4 remaining failures are P30's, and are deterministic

All four are in `tests/e2e/rule-creation-controls.spec.ts` and fail in that spec's own tag-dropdown
handling. In runs 2-4 (`:104`, `:237`, `:288`, `:328`) the assertion was that after `Escape`,
`Search tags...` is gone (`toHaveCount(0)` received 1). **The identical four failed in all three
runs, so this is a real defect rather than a flake.** The owning file is
`src/components/features/transactions/cells/InlineEditableTags.tsx`, last changed by P30's
`1040bba`.

Run 5 was taken on a later HEAD (`d6567f6`) carrying P30's Escape fix `a265e54` and a new test. It
**still shows 4 failures** in the same spec (`:111`, `:300`, `:342`, `:382`), three of them now
timing out at 30s rather than asserting. So P30's rev 02/03 work on this spec is not yet green. That
is P30's item to close; it is recorded here only because it is what a P31/P32 reviewer will see in
the same run.

Verified none of my four commits touch it: `git show --name-only` for `e97b3f7`, `8f492d8`,
`5d2d5d9` and `07bc3d4` each return **0** matches for `InlineEditableTags`. Selection does not
participate in tag editing.

**The campaign tree therefore contains P30's unreviewed rev 02 work, and this digest does not cover
P31/P32 alone** — stated plainly here as root instructed. A P31/P32 reviewer should read the 4
failures as P30's open item, not as a P31/P32 regression, and should not treat a green
`rule-creation-controls.spec.ts` as a precondition for this package.

`pnpm format:check` failing repo-wide is a pre-existing condition on root-owned control files
(PROGRESS, QUESTIONS, DECISIONS, HANDOFF, SCOPE.json, `human-scratch.md`, and P12/P14/P16D/P19/P30
evidence and reviews). Running bare `pnpm format` would reflow the frozen scratch file and the
frozen spec sources, so the formatter was scoped to `src` and `tests` only.

### Commits — and a fusion the reviewer must know about

This package's product and test changes are **not in a commit of their own**. They were swept into
another agent's P30 commit, together with that agent's unrelated rule-proposal work:

- **`e97b3f7`** "fix: stop the rule proposal remounting the cell and auto-applying without a blur" —
  contains **all** of the P31/P32 product and test changes listed above (`table-selection.ts`,
  `useTableSelection.ts`, `TransactionTable.tsx`, `index.ts`, `page.tsx`, all four test files)
  **plus** P30's `TransactionRuleProposal.tsx`, `TransactionRow.tsx`,
  `tests/unit/components/rule-proposal-stability.test.tsx` and
  `tests/e2e/rule-creation-controls.spec.ts`.
- **`8f492d8`** "refactor: bind the shift-range's rows and outcome into one value" — mine alone,
  committed with an explicit pathspec.

I did not make the fusing commit and did not notice it until afterwards: two agents were editing the
same working tree, and that commit was created with a pathspec wide enough to include my files. I
verified the committed content is complete and correct rather than assuming it
(`git show e97b3f7:…table-selection.ts` has all 20 exports; the page has the reconciliation, the
constant-time count and the full matching-id list).

**Consequence for review:** the P31/P32 diff cannot be read as `e97b3f7` alone, and reviewing
`e97b3f7` wholesale would mix two packages. The reviewable P31/P32 change is the union of the file
list above across `054f77e..256e533`, restricted to those paths.

### Tree drift observed mid-work

BASE was captured at `054f77e`, but `main` advanced under this working tree during implementation
(through `c4f472b`, `9975fff` and beyond) as concurrent P29/P30 work integrated. Two consequences,
both handled rather than absorbed:

1. **`use-field-rule-proposal.ts` gained calls to `useActiveDescriptionAliases`,
   `useVaultPreferences`, `usePubkeyHash`, `useFieldRuleActions` and `useApplyFieldRules`.** Any
   test that mounts the whole page must now stub them or the page throws on render. The new
   page-level test does. **Root should capture HEAD fresh rather than assuming `054f77e..` is still
   the range.**
2. `TransactionRow.tsx` and `TransactionRuleProposal.tsx` carry another agent's **uncommitted**
   edits in this shared tree. They are not part of this change and were left untouched; the handback
   commit uses an explicit pathspec so they cannot be swept in.

### Two environment problems that are not this change

- **`.p30-review-scratch/` — observed, reported, since resolved by its owner.** An untracked ~3.2M
  in-repo copy of the vendored `animate-ui` primitives. `eslint.config.mjs` ignores
  `src/components/animate-ui/**`, but that glob is anchored at the real `src/`, so ESLint walked the
  copy and reported **2 errors** (`animate/slot.tsx:82`, `effects/highlight.tsx:219`). Diagnosed by
  moving it aside — lint then reported 0 errors, 1 warning — and **restored untouched**, since
  another agent's working directory is not mine to delete. It has since been removed by its owner,
  and the final `pnpm lint` run recorded above is clean with no workaround in place.
- **`tests/unit/import/duplicates.test.ts` "scales linearly with input size"** fails intermittently
  under a saturated full-suite run (observed ratio 4.58 against a `< 4` bound) and **passes 5/5 in
  isolation**. It asserts a wall-clock ratio, so it is load-dependent by construction. Untouched by
  this change and pre-existing; recorded rather than "fixed" by loosening a bound that is not mine.

## Repo rules

No `as`, no `any`, no `!` in any product code added or changed. Pure functions and immutable data
throughout `table-selection.ts` — every operation returns a new selection, and no-op operations
return the input by identity so React can skip re-renders. No new dependency.

## Secret safety

No vault master key, seed phrase, recovery material, `SUPABASE_JWT_SECRET` value or vault plaintext
appears in any code, fixture, test or this evidence. All fixtures are synthetic (`tx-0000`-style
ids, `Groceries N` / `Fuel N` descriptions, `Virtual Transaction NNNN` CSV rows). The principal's
`~/Downloads/CSVData.csv` and `~/Downloads/OFXData.ofx` were **not read and not committed**.

## Risks

- **R-1 (low).** UR-010's keyboard clause rests on browser click-from-keyboard semantics rather than
  on a dedicated code path. Verified only by `T021e` on real Chromium, not by unit test. A future
  change replacing the checkbox `button` with a non-button control would silently break the clause.
- **R-2 (low).** `TransactionTableProps.matchingRowIds` is optional and defaults to the rendered
  rows. That keeps the existing narrower call sites correct, but a future caller that forgets it
  gets page-scoped selection back without a type error. The page passes it; no other caller renders
  the table with a wider set.

## Proposed questions

None for UR-010. See `evidence/P32/implementation-01.md` for `Q-PROPOSAL-P32-01-01`.

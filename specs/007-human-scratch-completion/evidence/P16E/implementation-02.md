# P16E / revision 02 — remediation evidence

- **Package / revision:** P16E / 02 (FS-001 final package) — IMPLEMENT (remediation)
- **Role:** human_scratch_implementer, fresh instance `p16e-implementer-02`. Not the reviewer, not
  `p16e-implementer-01`.
- **BASE (review base):** `191d0707f5e6dbfa5871dbddaa7318b9a14885dd`
- **Pre-implementation HEAD:** `d79a6307b2c82b2f64279b79153a532c1de0a869` (root ledger-only; product
  state byte-identical to the rev-01 product HEAD `be82ad0`)
- **Final HEAD:** `bb12e0c86e0a42ec682ab7a67df5b1a355084559`
- **Review range:** `191d070..bb12e0c`
- **Range empty?** No.

## 1. Sources read in full before coding

- `specs/007-human-scratch-completion/HANDOFF.md` — the P16E / 02 dispatch
- `specs/007-human-scratch-completion/reviews/P16E-review-01.md` — the FAIL (read only, not edited)
- `specs/007-human-scratch-completion/evidence/P16E/implementation-01.md` — rev-01 evidence (read
  only, not edited)
- `specs/008-transaction-percentage-allocations-settlement/spec.md` §13 (lines 545-575) and §14
- `.claude/CLAUDE.md`, `.claude/rules/coding-style.md`, `.claude/rules/typescript-style.md`

## 2. The fix for F-1

### What was wrong

`selectedTransactionIds` was a **derived** set that unioned `requestedTransactionId` back in on
every render for as long as the `?transaction=` param stayed in the URL. Because the union was
derived rather than backed by the real `selectedIds` state, a user's deselection had nowhere to
land: the next render re-added the row. The same set is what every bulk handler iterates, so a
subsequent bulk delete destroyed a row the user had explicitly deselected.

### What it is now

The deep link is a **one-shot navigation intent**, consumed exactly once and then discarded:

1. A render-phase guard (`landedSourceId`) detects a `?transaction=<stableId>` whose target has
   appeared in `filteredTransactions`, and once per navigation:
    - raises `displayCount` far enough to page the row in,
    - calls `setSelectedIds(new Set([requestedTransactionId]))` — the **real** selection state,
    - calls `setTransactionIdToReveal(requestedTransactionId)`, feeding the pre-existing reveal
      effect unchanged.
2. An effect then calls `router.replace("/transactions", { scroll: false })`, so the param cannot
   re-assert itself on any later render.
3. `selectedTransactionIds` reverts to its BASE form — purely
   `selectedIds ∩ displayedTransactionIds`, with no param term at all. Every bulk handler therefore
   acts on the user's real current selection only.

`landedSourceId` resets to `null` once the param is gone, so navigating to the same source again
later works rather than being permanently marked as spent.

### Why the seed runs during render rather than in an effect

Two independent reasons, in this order:

1. **Correctness/UX:** seeding during render means the row is already selected on its **first**
   paint. An effect-based seed paints once unselected and then again selected — a visible selection
   flicker, which the dispatch explicitly forbids. This is React's documented "adjusting state when
   props change" pattern, guarded so it runs at most once per navigation.
2. **Lint:** `react-hooks/set-state-in-effect` (React Compiler) rejects a plain `setState` in an
   effect body. I verified this empirically rather than assuming, with three throwaway probe
   components run through the repository's own ESLint: render-phase guarded `setState` → 0 errors;
   `setState` in an effect after an opaque DOM read → 0 errors; plain guarded `setState` in an
   effect → 2 errors. The probes were deleted immediately; nothing from them is in the commit. I did
   not suppress or reconfigure the rule.

The `router.replace` stays in an effect because navigation is a genuine side effect and must not run
during render.

### Net effect on the rev-01 code

The fix also **removes** rev-01's `focusedSourceIndex` / `effectiveDisplayCount` derived-pagination
pair and the `revealedIdRef` reveal guard. `displayedTransactions`, `selectedTransactionIds` and
`hasMore` are now byte-identical to BASE (`191d070`), so the surface area P16E adds to this file is
strictly smaller than rev-01's. The reveal effect is back to its BASE shape, keyed on
`transactionIdToReveal` alone.

## 3. RED → GREEN for the new regression tests

Both new tests live in `tests/e2e/people-settlement.spec.ts` under a new
`test.describe("View transaction deep link")`. RED was established by **reverting only the product
file** (`git checkout src/app/(app)/transactions/page.tsx`) while keeping the new tests, so the
tests were proven to fail against the exact rev-01 defect rather than against a strawman.

### RED (product file at rev-01 state, tests present)

`pnpm exec playwright test people-settlement --retries=0 --workers=2 -g "View transaction deep link"`
→ **2 failed**:

| Test                                         | Failure                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| lands selected and revealed, then deselected | `expect(page).toHaveURL(/\/transactions$/)` — received `…/transactions?transaction=fdf66329-…`; the param is never cleared |
| bulk delete after deselecting preserves it   | `aria-selected` expected `"false"`, received `"true"` — the deselection silently fails, exactly as the review reproduced   |

### RED probe — the data loss itself, not just the symptom

The second test fails at the deselection assertion, which is upstream of the destructive step. To
prove the tests actually cover the **data-loss** consequence, I ran a temporary probe that removed
only the intermediate deselection assertion so execution reached the bulk delete:

```
Error: expect(locator).toHaveCount(expected) failed
Locator:  locator('[data-transaction-id="9786c3a2-b466-45d3-a4e3-abc77d9ef9e4"]')
Expected: 1
Received: 0
   821 |         // Only the row the user actually selected is deleted; the deep-linked row survives.
   822 |         await expect(rowById(page, secondTransactionId)).toHaveCount(0);
 > 823 |         await expect(rowById(page, firstTransactionId)).toHaveCount(1);
```

The deep-linked, explicitly-deselected `t1` was **destroyed**. The probe was reverted immediately;
the committed spec contains the full assertion chain (verified: `grep -c "TEMPORARY RED PROBE"` =
0).

### GREEN (fix applied)

Same command → **2 passed (10.5s)**.

### What the tests assert

`the deep-linked row lands selected and revealed, and can then be deselected`

- Arrival: `aria-selected="true"`, `toBeInViewport()`, and the toolbar reads `1 selected` — this is
  the §13 landing assertion the dispatch requires be kept, so a future regression of the one-shot
  seed cannot pass silently.
- The URL has been reduced to `/transactions` — the intent is spent.
- Clicking the row checkbox flips `aria-selected` to `"false"`, the toolbar no longer says
  `selected`, and the bulk bar is gone (`toHaveCount(0)`).

`a bulk delete after deselecting the deep-linked row preserves it`

- Deep-link `t1`, deselect it, select `t2`, assert the bar reads `1 selected` / `Edit 1` (the review
  observed `2 selected` here).
- Bulk delete + confirm → `t2` gone, **`t1` present**.
- The surviving `t1` still produces `Bob → Me $50.00` on the People page, so the assertion covers
  the settlement consequence and not just row presence.

## 4. Documentation fix (non-blocking finding)

`src/components/features/people/README.md:52-56` claimed "if the source is filtered out, the filters
are cleared so it stays reachable." No such code exists — the only
`setFilters(createEmptyFilters())` call is the pre-existing one in `handleAddTransaction`. Corrected
to describe the actual mechanism (the transactions page holds filters in component state, which
starts empty on each arrival at the route), and a paragraph was added documenting the
one-shot-intent semantics. Doc-only; no behaviour depends on it.

## 5. Diff-scope statement

`git diff --name-status d79a630 bb12e0c` — **exactly three paths, all allowed**:

```
M  src/app/(app)/transactions/page.tsx
M  src/components/features/people/README.md
M  tests/e2e/people-settlement.spec.ts
```

Boundary paths, changed-file count in this revision — **all zero**:

| Boundary                                                          | Files changed |
| ----------------------------------------------------------------- | ------------- |
| `src/lib/**` (incl. `src/lib/domain/settlement.ts`)               | **0**         |
| `src/components/features/transactions/` (the whole P16D grid dir) | **0**         |
| `supabase/**` (no new migration)                                  | **0**         |
| `src/server/routers/realtime.ts`                                  | **0**         |
| `src/lib/supabase/realtime.ts`                                    | **0**         |
| `src/server/schemas/realtime.ts`                                  | **0**         |
| `settlement-view.ts` / `settlement-allocations.ts`                | **0**         |
| `BalanceSummary.tsx`                                              | **0**         |

- `git diff --stat 191d070 bb12e0c -- src/components/features/transactions/` is **empty** — the P16D
  grid is byte-identical to BASE across the entire range, not merely unchanged this revision.
- `vault_ops` occurrences in this revision's diff: **0**.
- No settlement cache/persistence added.
- **Single-engine invariant intact.** `grep -rn "calculateSettlementBalances" src/` →
  `src/lib/domain/settlement.ts` (definition, 1), `src/lib/domain/index.ts` (re-export, 1),
  `src/components/features/people/BalanceSummary.tsx` (sole consumer, 2).
- No `as`, `any` or `!` introduced:
  `git diff … | grep -E "^\+" | grep -E " as [A-Za-z]|: any|\w!\."` → none. Money remains integer
  minor units (this change touches no amount).
- `next-env.d.ts` was regenerated by the dev server (a Next build artifact) and reverted with
  `git checkout`; it is not in the commit.

## 6. Gates

| Gate                                                        | Result                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`                                            | **clean, exit 0**                                                                                                                                                        |
| `pnpm lint`                                                 | **0 errors**, 10 warnings — all pre-existing unused-imports in untouched `tests/unit/crdt/*` and `src/lib/crdt/queries.ts`                                               |
| `pnpm format:check`                                         | fails on **15 `specs/**`files only** — all untouched by this package (Q-024). Scoped`oxfmt --check` over my 3 changed paths: "All matched files use the correct format." |
| `pnpm test`                                                 | **84 files, 1735 passed, 2 skipped**                                                                                                                                     |
| `pnpm test:e2e` (full, `--retries=0 --workers=4`)           | **142/142 passed (3.2m)**, zero failures, zero flaky                                                                                                                     |
| `people-settlement --repeat-each=3 --retries=0 --workers=4` | **54/54 passed (1.6m)**, zero flaky                                                                                                                                      |

The full-suite count rose from rev-01's 140 to 142 — exactly the two new regression tests. No P16D
grid, keyboard, selection or bulk-edit test regressed.

A local Supabase stack was available (`supabase_db`, `supabase_realtime`, `supabase_kong` all
healthy), so nothing here is reported on unverified evidence. `--headed`, `--ui`, `--debug` and
`show` were never used.

## 7. Manual installed-CLI verification

Repository-installed `pnpm exec playwright-cli`, disposable session `p16e-rev02-m1`, against the
committed HEAD `bb12e0c`, with the dev server started using the same `SUPABASE_JWT_SECRET` the
Playwright config derives from the realtime container. No Playwright MCP, no `npx`, no ad-hoc
script, no temporary test or config, no headed/`--debug`/`--ui`/`show` mode, no arbitrary sleep.

- **Onboarding.** Identity created through the masked flow. The recovery phrase was **never
  revealed, read, copied or emitted** — the reveal control was deliberately not clicked, unlike the
  automated `createNewIdentity` helper which extracts it.
- **Data built through the real UI.** Bob added on People; `t1` = `-100.00` / `Paid` / Me 50% + Bob
  50% and `t2` = `-40.00`, both created through real grid cells. The allocation cells reported
  `Explicit: 50%. Effective: 50%. Owner remainder: 0%.` for both people.
- **People page.** `region "USD" > heading "USD" > button "Bob Me $50.00"` — one per-currency
  section, positive amount, no grand total. Expanding gave a source row whose link was
  `/transactions?transaction=91199717-b992-45b5-a1f6-334837fe775f` — the stable ID.
- **§13 landing preserved (the thing the fix could most easily have broken).** Clicking "View
  transaction" produced:

    ```
    { url: "http://localhost:3000/transactions",
      selected: "true", classes: true, inViewport: true,
      toolbar: "Add transaction2 transactions· 1 selected" }
    ```

    The row is selected, carries the `selected` highlight class, is scrolled into the viewport — and
    the URL has **already been reduced to `/transactions`**. Landing and param-clearing both hold.

- **F-1 is fixed.** Clicking `t1`'s checkbox gave `t1Selected: "false"`, toolbar
  `"Add transaction2 transactions"` (no count), bulk bar `absent`. The deselection sticks.
- **The data-loss path is closed.** Selecting `t2` gave `{ t1: "false", t2: "true" }`, toolbar
  `· 1 selected`, bulk bar `Edit 1` — where the review observed **"2 selected"**. Bulk delete +
  confirm gave `{ t1Present: 1, t2Present: 0 }`: **only the row the user selected was deleted, and
  the deep-linked row survived.** The People page still rendered `Bob Me $50.00` afterwards.
- **Console / network.** 39 console entries across the whole session: **0 errors, 0 warnings** (all
  `[LOG]`/`[INFO]` — HMR, Fast Refresh, React DevTools notice, SyncManager status). 10 dynamic
  requests, **all 200** (`vault.list`, `sync.getUpdates`, `realtime.authorize`, `realtime.revoke`).
  No response ≥400.
- **Privacy.** A scan of every dynamic request URL for the transaction descriptions, `Bob`,
  `100.00`, `50.00`, `seed`, `phrase` and `key=` returned **nothing**. The deep link carries only an
  opaque UUID.
- **Cleanup.** Session closed and its data deleted, `.playwright-cli/` removed, my dev server
  stopped, `next-env.d.ts` reverted. (A `next-server` process from **6 days ago**, predating this
  session and belonging to other work, was left running deliberately; port 3000 is free.)

## 8. Frozen-source integrity

- `sha256sum specs/008-transaction-percentage-allocations-settlement/spec.md` =
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` — matches.
- `wc -l -c` = `715` / `25441` — matches.

No ledger, scratch, SCOPE, task, review, canonical spec, `.claude` or `.codex` file was written by
this package. `reviews/P16E-review-01.md` and `evidence/P16E/implementation-01.md` were read only.

## 9. Q-proposals

**None new.** Rev-01's `Q-PROPOSAL-P16E-01-001` (100k/200ms benchmark disposition) is unchanged and
still stands for root to transcribe; the reviewer adjudicated it as inside the canonical
measured-evidence branch, and this revision touches no engine code, so nothing about it has moved.

F-1 was a straightforward defect with authority-clear direction in the dispatch, not a question
needing new authority. One implementation choice — seeding during render rather than in an effect —
had a genuine trade-off, but it is resolved by the dispatch's own "no selection flicker" requirement
plus a lint constraint I verified empirically, so it is recorded in §2 as a design note rather than
raised as a Q-PROPOSAL. It is fully reversible: an effect-based seed would restore the flicker but
would need a lint escape hatch, so the chosen form is both the safer and the smaller change.

## 10. Working tree at handback

Only `specs/007-human-scratch-completion/evidence/P08/implementation-01.md` (pre-existing, not mine)
and this document are untracked. This evidence file is left **UNCOMMITTED** per the dispatch.

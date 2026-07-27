# P20B revision 03 — implementation-05 (harden flaky virtualized-list E2E waits)

**Implementer:** `p20b-implementer-03` (fresh context) · **Base HEAD at start:** `5f2337b`
(root-ledger commit; product/test tip `5576175`) · **Commit:** `63787ec` (test-only)

## Scope / charter

Fix the NEW blocking flake of the same class that failed the P21 rev-02 final audit:
`tests/e2e/transactions.spec.ts:696` — after clicking "Clear search", the
`getByText("500 transactions", { exact: true }).toBeVisible()` count-restore assertion ran on the
bare 5s default and failed 1/5 full retries-disabled runs under 163-test / 4-worker parallel load.
Plus a conservative same-class sweep. Test-only; no `src/**`, no `identity.spec.ts:282`.

## Fix + sweep (all in `tests/e2e/transactions.spec.ts`, one virtualized test at `:523`)

The chartered defect and its three structural siblings are the identical operation — the virtualized
500-row list re-expanding its count text after an async re-render. The initial-import render at
`:578` already uses `{ timeout: 15_000 }`; only the later re-renders were left on the bare 5s
default. Sized all four to 15s to match `:578`:

| Line (pre-edit) | Context / async re-render before the assertion     | Before  | After                 |
| --------------- | -------------------------------------------------- | ------- | --------------------- |
| `:696`          | after "Clear search" — count-restore (chartered)   | bare 5s | `{ timeout: 15_000 }` |
| `:702`          | after `goToAccounts` → `goToTransactions` (nav)    | bare 5s | `{ timeout: 15_000 }` |
| `:705`          | after `page.reload()` — full rehydrate + re-render | bare 5s | `{ timeout: 15_000 }` |
| `:726`          | duplicate tab — new page rehydrate + re-render     | bare 5s | `{ timeout: 15_000 }` |

This is principled wait-sizing, not a mask: the count restore is deterministic (always eventually
succeeds); the post-reload / post-navigation / duplicate-tab paths do a full IndexedDB rehydrate +
decrypt + Loro rebuild + virtualized re-render, which is at least as slow as the initial import that
already warranted 15s. No `--retries`, no `waitForTimeout` sleeps, no try/catch swallowing.

### Diff summary

`git diff --stat 5576175..HEAD` (product/test, excluding `specs/**`):
`tests/e2e/transactions.spec.ts | 18 +++++++------ (12 insertions, 6 deletions)` — one file only. No
`src/**`, no `specs/**` product changes.

### Sweep outcome (HS-021 code-quality-sweep charter)

Grepped `tests/e2e/**` for bare `getByText(...).toBeVisible()` assertions immediately following an
async re-render (filter clear, navigation, import, virtualized scroll) that lack an explicit timeout
where the operation is known-slow.

- **Same class, hardened:** the four `500 transactions` count re-renders above (`:696` + the three
  siblings) — all in the single virtualized `:523` test.
- **Considered, left alone (conservative):** `undo-redo.spec.ts:178` (row visible after
  reload+import) targets a _small_ list, not the heavy virtualized count re-render; no evidence of
  fragility. The smaller `"N transactions"` count assertions elsewhere in `transactions.spec.ts`
  (2–3 rows, lines ~1363/1492/1542/1679/1767/2051) are not the virtualized-heavy class and are
  stable — not churned. `transactions.spec.ts:395` (`51 transactions`) already carries an explicit
  timeout.
- **Beyond `:696`:** the only same-class hardening was the three siblings in the same test. No other
  file matched THIS class.

## Validation — FULL suite, retries disabled, 8 sequential runs

Command per run: `pnpm exec playwright test --retries=0 --reporter=list` (163 tests / 4 workers,
fresh dev server each run; runs executed **one at a time**, never concurrently).

| Run | `transactions.spec.ts:523` (tx696 fix) | `identity.spec.ts:282` | Overall tally         |
| --- | -------------------------------------- | ---------------------- | --------------------- |
| 1   | ✓ PASS                                 | ✓ PASS                 | 163 passed (3.9m)     |
| 2   | ✓ PASS                                 | ✓ PASS                 | 163 passed (3.9m)     |
| 3   | ✓ PASS                                 | ✓ PASS                 | 163 passed (3.9m)     |
| 4   | ✓ PASS                                 | ✓ PASS                 | 163 passed (4.0m)     |
| 5   | ✓ PASS                                 | ✓ PASS                 | 1 failed 162 passed † |
| 6   | ✓ PASS                                 | ✓ PASS                 | 163 passed (3.9m)     |
| 7   | ✓ PASS                                 | ✓ PASS                 | 163 passed (3.8m)     |
| 8   | ✓ PASS                                 | ✓ PASS                 | 1 failed 162 passed ‡ |

**Chartered target `transactions:523` (incl. `:696`): 8/8 PASS. `identity:282`: 8/8 PASS (no
regression).** The rev-02 identity fix was not touched.

### Incidental failures (NOT my chartered class — reported for root to charter separately)

- **† Run 5 — `passkey.spec.ts:387`** ("passkey-only creation … unlocks the same identity"):
  `locator.click` timeout (30s) on `getByTestId("unlock-button")` at `passkey.spec.ts:401`, amid
  many `tRPC … Request authentication failed` / `Failed to fetch` server logs. Different subsystem
  (WebAuthn recovery-unlock + sync auth), different failure mode (action-click timeout, not a bare
  `toBeVisible`-after-render). Not the virtualized-count class. 1/8.
- **‡ Run 8 — `import.spec.ts:1527`** ("selecting template and importing auto-updates template
  config"): `getByText(/4 rows/i).toBeVisible({ timeout: 5000 })` at `import.spec.ts:1573` — preview
  not found within its **existing** 5s wait after the second CSV upload. Import-preview render;
  borderline-adjacent to the sweep's "import" class but it already carries an explicit timeout, so
  it is not the "bare / lacking-timeout" defect this charter targets. 1/8.

Both are independent, once-each flakes outside the P20B virtualized-list charter. I did **not**
expand my test-only commit to touch `passkey.spec.ts` or `import.spec.ts` — hardening unrelated
tests would be scope creep and risks masking a real defect. Flagged to root for a separate scope
decision.

## Unit gates

- `pnpm typecheck` — **PASS** (clean).
- `pnpm lint` — **PASS** (exit 0; 1 pre-existing `react-hooks/incompatible-library` _warning_ in
  `src/components/features/transactions/TransactionTable.tsx:401`, not introduced here, not an
  error).
- `pnpm format:check` — my authored `tests/e2e/transactions.spec.ts` is clean
  (`oxfmt --check tests/e2e/transactions.spec.ts` → all correct). The command's overall failure is
  **pre-existing** and confined to root-owned frozen `specs/**` markdown (PROGRESS.md, QUESTIONS.md,
  DECISIONS.md, human-scratch.md, prior evidence/review files) — I must not reformat those. No
  `tests/**` or `src/**` file fails format.
- `pnpm test` (unit) — **PASS**: 2091 passed / 2 skipped. One run showed a single transient failure
  that did **not** reproduce on immediate re-run (2091 passed again); unrelated to this E2E-only
  change.

## Secret-safety

No vault key / seed / recovery material / crypto secret / JWT secret / plaintext in the change,
logs, or this evidence. Only synthetic CSV fixtures and public patterns.

# P20B revision 02 — implementation evidence (implementation-04)

**Role:** fresh implementer, TEST-ONLY. Edited only `tests/e2e/identity.spec.ts`.

## HEAD

- Start HEAD: `4e950b7bde56b11847d044eb2c840d80abc2ac21`
- End HEAD: recorded in final report / see git log after commit.

## Frozen-source invariant

- `specs/human-scratch.md` SHA-256 before:
  `f46c2d3559c3110013330c9ff6a56650b72ad56e10c84349b9e2171ab5bfef28`
- `specs/human-scratch.md` SHA-256 after:
  `f46c2d3559c3110013330c9ff6a56650b72ad56e10c84349b9e2171ab5bfef28`
- UNCHANGED. ✓

## Diff summary

In `test.step("validate BIP39 words with visual feedback", ...)` (lines ~345-370), added two
auto-retrying class assertions so the validity className is observed to flip before it is read:

- After `fill("abandon")` + `toHaveValue("abandon")`:
  `await expect(firstInput).toHaveClass(/border-green-500/)` before reading `validClasses`.
- After `fill("invalidword123")` + `toHaveValue("invalidword123")`:
  `await expect(firstInput).toHaveClass(/border-destructive/)` before reading `invalidClasses`.

Existing `toBeEditable()` / `toHaveValue()` guards and the final
`expect(validClasses).not.toBe(invalidClasses)` assertion are retained unchanged. No product file
touched. No `as`/`any`/`!`. No new deps. Net: +4 lines (2 assertions + 1 explanatory comment line
pair).

## Gate results

- `pnpm typecheck` — PASS (tsc --noEmit, no errors).
- `pnpm lint` — PASS (0 errors; 1 pre-existing warning in
  `src/components/features/transactions/TransactionTable.tsx:401` react-hooks/incompatible-library,
  unrelated, product file untouched).
- `pnpm format:check` — the edited file `tests/e2e/identity.spec.ts` formats clean (`oxfmt --check`
  on it → "All matched files use the correct format", exit 0). The bare `format:check` reports
  pre-existing format drift ONLY in `specs/**` frozen/ledger files (human-scratch.md, PROGRESS.md,
  QUESTIONS.md, evidence/review docs, etc.) which are out of scope and must not be touched.

## Repeated-run pass/fail counts (retries disabled: `--retries=0`)

Focused loop on `tests/e2e/identity.spec.ts` (9 tests each):

| Run | Result   | identity.spec.ts:282 |
| --- | -------- | -------------------- |
| 1   | 9 passed | ✓                    |
| 2   | 9 passed | ✓                    |
| 3   | 9 passed | ✓                    |
| 4   | 9 passed | ✓                    |
| 5   | 9 passed | ✓                    |

Full suite (`pnpm test:e2e --retries=0`, 163 tests):

| Run | Result               | identity.spec.ts:282                                                  |
| --- | -------------------- | --------------------------------------------------------------------- |
| 1   | 163 passed           | ✓                                                                     |
| 2   | 163 passed           | ✓                                                                     |
| 3   | 162 passed, 1 failed | ✓ (failure was unrelated: `import.spec.ts:1527` template auto-update) |
| 4   | 163 passed           | ✓                                                                     |
| 5   | 163 passed           | ✓                                                                     |
| 6   | 163 passed           | ✓                                                                     |

`identity.spec.ts:282` passed in all 11 runs (5 focused + 6 full). Flake resolved.

## Pre-existing / unrelated flakes (untouched, reported separately)

- Full run 3:
  `tests/e2e/import.spec.ts:1527 › selecting template and importing auto-updates template config`
  failed once, passed in all other full runs. This is a distinct import-panel flake, not the
  identity step and not introduced by this change. Left untouched per brief. (Note: distinct from
  the tracked `import.spec.ts:301` Q-P20B-13 line.)
- `duplicates.test.ts` (Q-P20A-05) not encountered in these e2e runs; untouched.

## Scope confirmation

Only `tests/e2e/identity.spec.ts` changed and committed (explicit pathspec, one commit).
`next-env.d.ts` was modified by Next.js as a generated artifact during the test runs and was NOT
staged/committed.

# P20B Independent Review 03 — Verdict: PASS

Reviewer: distinct fresh-context reviewer (not a P20B implementer). No product/test code edited; no
ledger/marker/commit written.

- HEAD: `3e0318afc7aba0dcb099c236aad6c6e828461708`
- Diff base (frozen goal base): `5576175`
- Diff range: `git diff 5576175..HEAD -- . ':(exclude)specs'`

## Environment (pre-run)

- Port 3000 free; nothing listening on 3000-3009.
- Stray procs seen: a root-owned `next-server (v16.2.6)` (cwd owned by root, NOT on 3000-3009) and a
  `playwright-mcp` server. Neither is a suite worker nor binds port 3000, so neither blocks the
  webServer. No stray Playwright test workers / chrome-headless test browsers. Did not kill
  anything.

## Diff adjudication — PRINCIPLED, product-clean, secret-clean

Cumulative P20B change over the range is TWO test-only files. Zero product-code change (verified by
`--stat`: only `tests/e2e/passkey.spec.ts` and `tests/e2e/transactions.spec.ts`).

1. `tests/e2e/transactions.spec.ts` (four assertions): bare `toBeVisible()` on
   `getByText("500 transactions")` fired immediately after a 500-row virtualized re-render, now
   `toBeVisible({ timeout: 15_000 })`. Sized wait consistent with a heavy virtualized settle; no
   logic/assertion semantics changed. PRINCIPLED (sized timeout, not a mask — assertion still fails
   if the count never appears).
2. `tests/e2e/passkey.spec.ts` (unlock step "that phrase unlocks the identity the passkey created",
   line ~387/397): `getByTestId("recovery-phrase-credential").fill(words.join(" "))` replaced with
   `await enterSeedPhrase(page, words, true)` + `enterSeedPhrase` import + explanatory comment. The
   helper (`tests/e2e/helpers/auth.ts:95`) fills the validated per-word grid and, with
   `expectValid=true`, `waitFor` the "Valid recovery phrase" indicator — a deterministic settle
   before the unlock click, consistent with the other unlock tests. The single-field credential path
   remains covered at passkey :72/:171/:232 and identity/onboarding-vault specs. PRINCIPLED.

Verification:

- Test-count parity (base vs HEAD, `test(`/`test.step` grep): passkey 39 == 39; transactions 173
  == 173. No tests added/removed/skipped.
- No scaffolding added by the diff: no `console.log`, `DIAG`, `keyboard.type`, no new
  `as`/`any`/`!`, no `@ts-` directives. (grep hits in the files are pre-existing casts/comments,
  untouched.)
- No secret/recovery material: words are synthetic E2E vectors already present in the test.

## Full-suite E2E runs — 8/8 clean

Command (each run, foreground, sequential): `pnpm exec playwright test --retries=0 --reporter=list`

| Run | Result                | Duration | passkey:387 | txn:523 (500-count steps) | identity:282 | import:1527 |
| --- | --------------------- | -------- | ----------- | ------------------------- | ------------ | ----------- |
| 1   | 163 passed / 0 failed | 3.9m     | ✓ 4.7s      | ✓                         | ✓ 5.5s       | ✓ 7.7s      |
| 2   | 163 passed / 0 failed | 3.9m     | ✓ 5.1s      | ✓ 33.3s                   | ✓ 5.6s       | ✓ 7.6s      |
| 3   | 163 passed / 0 failed | 4.0m     | ✓ 5.1s      | ✓ 30.9s                   | ✓ 5.4s       | ✓ 7.4s      |
| 4   | 163 passed / 0 failed | 3.8m     | ✓ 5.2s      | ✓ 31.9s                   | ✓ 5.3s       | ✓ 8.0s      |
| 5   | 163 passed / 0 failed | 3.8m     | ✓ 5.6s      | ✓ 31.0s                   | ✓ 5.7s       | ✓ 7.5s      |
| 6   | 163 passed / 0 failed | 3.9m     | ✓ 5.0s      | ✓ 30.3s                   | ✓ 5.3s       | ✓ 7.5s      |
| 7   | 163 passed / 0 failed | 3.9m     | ✓ 5.3s      | ✓ 31.1s                   | ✓ 5.8s       | ✓ 7.5s      |
| 8   | 163 passed / 0 failed | 3.9m     | ✓ 5.4s      | ✓ 32.2s                   | ✓ 5.6s       | ✓ 8.0s      |

No failures, no flaky, no did-not-run across all 8 runs. The `transactions.spec.ts:523` test
contains the four re-timed 500-transaction assertions. `[WebServer] tRPC ... authentication failed`
lines are expected teardown-time noise from offline/failed-auth test scenarios; the owning tests
passed.

## Unit gates

- `pnpm typecheck`: PASS (tsc --noEmit, exit 0).
- `pnpm lint`: 0 errors, 1 warning — the known pre-existing `TransactionTable.tsx:401`
  useVirtualizer `react-hooks/incompatible-library` warning. Acceptable.
- `pnpm format:check`: FAILS on 14 files — ALL are `specs/**` markdown (DECISIONS/DEPENDENCIES/
  PROGRESS/RISKS, P12/P14/P16D/P19 evidence, P12 reviews) + `specs/human-scratch.md`.
  Root/other-agent owned frozen files, unrelated to P20B. The two P20B test files pass
  `oxfmt --check` cleanly (exit 0). Known "pnpm format reflows frozen specs" situation — NOT a P20B
  defect.
- `pnpm test`: PASS — 111 files, 2091 passed / 2 skipped. Matches known-acceptable baseline.

## Verdict

PASS. The cumulative P20B fix is a principled, test-only, product-clean, secret-clean set of
load-dependent timing-flake hardenings. It held green across 8 sequential full-suite `--retries=0`
runs (target tests included), with all unit gates clean apart from the two pre-existing/out-of-scope
items (TransactionTable lint warning; frozen-spec format reflow).

# P20B revision 02 — Independent Review Verdict

**Reviewer:** `p20b-reviewer-02` (fresh-context, independent; distinct from implementer
`p20b-implementer-01` and rev-01 reviewer `p20b-reviewer-01`). **Commit under review:** `5576175`
(range `4e950b7..5576175`).

## VERDICT: PASS

Unconditional PASS. Every check below was independently reproduced.

---

## Check 1 — Scope / diff

- `git show --stat 5576175`: touches ONLY `tests/e2e/identity.spec.ts`, `4 ++++`, +4/-0.
- `git rev-list --count 4e950b7..5576175` == `1` (single commit).
- Diff read in full. It is exactly a 2-line WHY comment plus two auto-retrying assertions:
    - `await expect(firstInput).toHaveClass(/border-green-500/);` after filling `"abandon"`.
    - `await expect(firstInput).toHaveClass(/border-destructive/);` after filling
      `"invalidword123"`.
- No `as`, no `any`, no `!` non-null assertion.
- No product code, spec, ledger, or frozen source touched. `SeedPhraseInput.tsx` is NOT in the
  commit. No `package.json` change → no new deps.

CONFIRMED.

## Check 2 — Frozen sources unchanged

- `sha256sum specs/human-scratch.md` ==
  `f46c2d3559c3110013330c9ff6a56650b72ad56e10c84349b9e2171ab5bfef28` (exact match).
- `git rev-parse HEAD:src/lib/domain/settlement.ts` == `010f3c93582a2ce311594d4dde8464760ca49c43`
  (matches expected `010f3c93…`).
- No 008 spec files in the commit diff.

CONFIRMED — no frozen-source drift.

## Check 3 — Flake actually fixed

Ran `pnpm exec playwright test identity.spec.ts --retries=0 --reporter=list` **9 times total** (1
initial + 8 batched). Every run: `9 passed`. The step-owning test
`identity.spec.ts:282 › unlock journey: enter seed phrase and access transactions` (which contains
`test.step("validate BIP39 words with visual feedback")`) passed on every run.

- `:282` test tally: **9 / 9 pass, 0 fail.**
- No masking flakes, no tracked-flake collisions (focused on identity.spec.ts only).
- Note: two runs emitted a benign WebServer teardown log
  `⚠️ tRPC failed on realtime.revoke: Request authentication failed` — server-side log noise, NOT a
  test failure; both those runs still printed `9 passed`.

CONFIRMED.

## Check 4 — No masking / no collateral

- The wait is on a real render signal — the validity className (`/border-green-500/`,
  `/border-destructive/`) — not an arbitrary `waitForTimeout`/sleep.
- The final assertion `expect(validClasses).not.toBe(invalidClasses)` is retained unchanged.
- Existing guards `await expect(firstInput).toBeEditable()`, `toHaveValue("abandon")`,
  `toHaveValue("invalidword123")` are all retained and not weakened.

CONFIRMED.

## Check 5 — Gates

- `pnpm typecheck` (`tsc --noEmit`): clean, 0 errors.
- `pnpm lint`: 0 errors, 1 warning — pre-existing React-Compiler `incompatible-library` warning in
  `src/components/features/transactions/TransactionTable.tsx:401` (TanStack Virtual), unrelated to
  this change and not in the edited file.
- `oxfmt --check tests/e2e/identity.spec.ts`: "All matched files use the correct format."

CONFIRMED.

## Check 6 — Tracked flakes

Not encountered (focused identity.spec.ts runs only). No new unexplained flake.

## Secret-safety

Diff and test use synthetic BIP39 only (`abandon`, `invalidword123`). No real vault key / seed /
recovery material anywhere in the change, runs, or this review.

CONFIRMED — no leak.

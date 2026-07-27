# HANDOFF — P20B revision 02 REVIEW (independent verdict) — to `p20b-reviewer-02`

**To:** `p20b-reviewer-02` — a fresh-context agent acting as the independent
`human_scratch_reviewer` for **P20B revision 02**. **From:** root coordinator. You are DISTINCT from
the implementer (`p20b-implementer-01`) and from the rev-01 reviewer (`p20b-reviewer-01`); if you
are either of those, STOP and tell root. You do NOT implement or fix anything. You INDEPENDENTLY
verify and return a **single unconditional PASS or FAIL**.

## What rev 02 is

P20B (HS-021 = "full-codebase style-guide/code-quality sweep") rev 01 PASSED, but the P21 rev 01
final audit independently reproduced a NEW E2E test-timing flake at `tests/e2e/identity.spec.ts:282`
(the `test.step("validate BIP39 words with visual feedback", ...)` step). Per §114 step4 P20B owns
it. Rev 02 is a **test-only** fix.

- **Commit under review:** `5576175` (range `4e950b7..5576175`, single commit).
- **Change:** in that test.step, two auto-retrying assertions added before each
  `getAttribute("class")` read — `await expect(firstInput).toHaveClass(/border-green-500/)` after
  filling a valid BIP39 word, `await expect(firstInput).toHaveClass(/border-destructive/)` after an
  invalid word — so the validity className is observed to flip before it is read. +4 lines, no
  deletions. The product component `src/components/features/identity/SeedPhraseInput.tsx` is CORRECT
  and untouched (synchronous useMemo → `border-green-500` / `border-destructive`).
- **Evidence:** `evidence/P20B/implementation-04.md`.

## Verify independently (do not trust the implementer)

1. **Scope/diff:** `git show --stat 5576175` must be ONLY `tests/e2e/identity.spec.ts`, +4/-0.
   `git rev-list --count 4e950b7..5576175` == 1. Read the actual diff; confirm it is exactly the two
   `toHaveClass` waits + comment, no `as`/`any`/`!`, no product/spec/ledger files touched, no new
   deps.
2. **Frozen sources unchanged:** `sha256sum specs/human-scratch.md` ==
   `f46c2d3559c3110013330c9ff6a56650b72ad56e10c84349b9e2171ab5bfef28`; `settlement.ts` blob
   `010f3c93…` intact; 008 spec unchanged. Any drift here is a blocking FAIL — report to root.
3. **Flake actually fixed:** run `pnpm test:e2e --retries=0` focused on `identity.spec.ts`
   repeatedly (≥8 focused runs) and confirm the `:282` step passes every time. A single failure of
   that step is a FAIL. (The product styling is synchronous, so a correct wait should be
   deterministic.)
4. **No masking / no collateral:** confirm the fix waits on a real render signal (the class), not an
   arbitrary timeout/sleep, and does not weaken the final
   `expect(validClasses).not.toBe(invalidClasses)` assertion or the existing
   `toBeEditable()`/`toHaveValue()` guards.
5. **Gates:** `pnpm typecheck`, `pnpm lint`, and `oxfmt --check tests/e2e/identity.spec.ts` on the
   edited file. (The bare `pnpm format:check` reports ONLY pre-existing `specs/**` frozen/ledger
   drift — out of scope; do not touch it.)
6. **Tracked flakes are NOT new blockers:** if during a full-suite run you hit `import.spec.ts:1527`
   (Q-P20B-14, environmental — 20/20 in isolation), `import.spec.ts:301` (Q-P20B-13), or
   `duplicates.test.ts` (Q-P20A-05), rerun that test in isolation to confirm it is the tracked
   environmental flake, not a regression. These are explained/tracked and are NOT P20B rev-02
   blockers. Only a NEW unexplained flake or an in-isolation-reproducing failure blocks.

## Secret-safety (blocking)

No real vault key / seed / recovery material / crypto secret anywhere in code, logs, or your review.
Tests use synthetic BIP39 vectors only (`abandon…`). Any real-material leak is a blocking FAIL,
reported to root immediately.

## Output

Write your verdict to `specs/007-human-scratch-completion/reviews/P20B-review-02.md`: a single
unconditional **PASS** or **FAIL** with reproduced evidence for each check above, your run tallies,
and explicit confirmation of the scope/diff and frozen-SHA facts. An empty/near-empty diff is
expected but is NEVER automatic approval — you must independently reproduce the flake-fixed state.
Then hand back to root with your verdict. Root will verify-not-trust and, on PASS, integrate +
re-pass HS-021.

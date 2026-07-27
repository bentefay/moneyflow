# HANDOFF — P20B revision 02 (implementer)

**Role:** fresh implementer for **P20B revision 02**. You are NOT root. You MAY edit test code.
**Scope is deliberately tiny and test-only.** Do not touch product code.

## Context

P21 revision 01 (final audit) FAILED. A DISTINCT reviewer independently reproduced a **test-timing
race**, not a product defect, at `tests/e2e/identity.spec.ts:282` — specifically the
`test.step("validate BIP39 words with visual feedback", ...)` at lines **345-366**.

The product is CORRECT: `src/components/features/identity/SeedPhraseInput.tsx` applies validity
styling synchronously via `useMemo` — valid word ⇒ `border-green-500`, invalid word ⇒
`border-destructive` (see lines 340-344). Do **not** change the component.

The flake: the test does `fill("abandon")` → `toHaveValue("abandon")` → immediately reads
`getAttribute("class")`, then repeats for an invalid word, then asserts the two class strings differ
(`:365`). `toHaveValue` confirms the DOM value but does **not** wait for the validity className to
re-render; a fill landing before/around hydration can be dropped, so the class is read before the
border color flips and both reads return the same string ⇒
`expect(validClasses).not.toBe(invalidClasses)` fails.

## Your single task

Harden ONLY that step so it waits for the validity className to actually flip before reading it,
using Playwright's auto-retrying class assertions. Concretely (adapt as you see fit, but this is the
intended shape):

- After `fill("abandon")`, wait `await expect(firstInput).toHaveClass(/border-green-500/)` before
  reading `validClasses`.
- After `fill("invalidword123")`, wait `await expect(firstInput).toHaveClass(/border-destructive/)`
  before reading `invalidClasses`.
- Keep the final `expect(validClasses).not.toBe(invalidClasses)` assertion (or strengthen it).

Keep the existing `toBeEditable()` / `toHaveValue()` guards. Match the file's existing style. No
`as`/`any`/`!`. No new dependencies.

## Proof obligation

- Run the FULL e2e suite with retries disabled repeatedly to prove the flake is gone:
  `pnpm test:e2e --retries=0` — run it enough times (target ≥5 clean full runs, plus a focused loop
  on this spec) to show `identity.spec.ts:282` no longer flakes. Report exact pass/fail counts.
- Run `pnpm typecheck && pnpm lint && pnpm format:check` and report results.
- Do NOT paper over any OTHER pre-existing flake; if you hit `duplicates.test.ts` (Q-P20A-05),
  `import.spec.ts:301` (Q-P20B-13), or similar tracked environmental flakes, report them separately
  and do not touch them.

## Boundaries & git

- Start HEAD: record `git rev-parse HEAD` at start (should be `4e01e6b` or a later root
  control-plane commit). Verify the product range from BASE is EMPTY — the only product/test change
  you introduce is this one file.
- Edit ONLY `tests/e2e/identity.spec.ts`. Commit ONLY that file (explicit pathspec). One commit.
  Parenthesis-free message, e.g. `test(P20B): wait for validity class flip in unlock feedback step`.
- Do NOT touch `specs/**`, frozen sources, ledgers, or any product file.
- Frozen-source invariant: `specs/human-scratch.md` SHA-256 must stay
  `f46c2d3559c3110013330c9ff6a56650b72ad56e10c84349b9e2171ab5bfef28`; `specs/008-.../spec.md` and
  `src/.../settlement.ts` blob `010f3c93…` unchanged. If any frozen source differs, STOP and report
  to root — do not proceed.
- Secret-safety: no real key/seed/recovery material in code, logs, or evidence — synthetic BIP39
  vectors only (`abandon…` is fine).

## Evidence

Write `specs/007-human-scratch-completion/evidence/P20B/implementation-04.md`: your diff summary,
the exact repeated-run pass/fail counts, gate results, start/end HEAD, and confirmation the frozen
SHAs are intact. Then hand back to root with your commit SHA. Root will verify-not-trust and
dispatch a DISTINCT reviewer.

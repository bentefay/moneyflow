# HANDOFF — P20B revision 06 REVIEW (HS-021 code-quality sweep: E2E eager-assertion flake class)

- **Package:** P20B (feature — full-codebase style-guide / code-quality sweep). **Requirement:**
  HS-021. **Revision:** 06. **Phase: INDEPENDENT REVIEW.**
- **You are the REVIEWER.** You are a DISTINCT fresh-context agent — you did NOT implement rev 06.
  Your job: independently decide PASS or FAIL on whether rev 06 closes the P21 rev-04 E2E blockers
  under load, without regressing anything. Do NOT edit product/test code, ledgers, markers, or the
  frozen scratch. Write only your review file. Root re-passes HS-021 only on your PASS.
- **Handback under review:** commit **`3f8e2f2`** ("test(P20B): close eager-assertion flake class
  under full-suite load"). BASE for the diff = its parent `95dea1b` (a root docs commit); the last
  product commit is `371a88a`. Root has already verified read-only that `3f8e2f2` touches only the 8
  allowed E2E paths + `evidence/P20B/implementation-07.md`, that no product code changed, that
  frozen `human-scratch.md` (`f46c2d35…`) and `src/lib/domain/settlement.ts` (`010f3c93…`) are
  byte-identical, and that no new `as`/`any`/`!` or secret material appears. You re-verify
  independently.

## What rev 06 changed (34 changes across 7 files + 1 helper re-export)

- **F-1 eager-assertion class (33 timeout widenings, 5000 → 15_000)** sized on the principled
  sibling `transactions.spec.ts:578/697`. Cohort: `import.spec.ts` (13), `transactions.spec.ts` (5),
  `identity.spec.ts` (4), `helpers/auth.ts` (3), plus the 7 `field-rule-editor` `waitFor` sites root
  authorised — `automations.spec.ts:34/83/95`, `field-rule-parity.spec.ts:51/175/293`,
  `transaction-rules.spec.ts:41`. A timeout raise cannot fail a passing test; it only converts a
  load-induced failure into a pass.
- **F-2 identity hydration (Q-P20B-19)** — replaced the invalid `toBeEditable()`/`toHaveValue()`
  "hydration wait" on an ungated controlled Input with a new `waitForUnlockHydration()` helper in
  `tests/e2e/helpers/auth.ts` that gates on the passkey branch (a hydration-gated control), then
  asserts only the post-`onChange` state-derived validity class. Read the evidence for the exact
  mechanism; confirm it waits on an actually-`useIsHydrated`-gated control, not another ungated one.
- **Q-P20B-20 parallel-safety fix** — `import.spec.ts` `createTestFile` used `Date.now()`-only temp
  names into shared `os.tmpdir()`, colliding across 4 workers → ENOENT on cleanup. Fixed by
  appending `crypto.randomUUID().slice(0,8)`. Confirm the three `/test-import-\d+/i` filename
  assertions still match (they are unanchored) and that `crypto` was already imported (no new
  import).

## VALIDATION MANDATE — the ONLY valid evidence for this flake class

- These are LOAD-DEPENDENT flakes: they pass 100% in isolation and fail only under full-suite
  parallel pressure. **Isolation runs prove NOTHING. Do not use them as evidence.**
- Run your OWN campaign in YOUR environment: **≥8 full-suite `pnpm test:e2e --retries=0` runs** (the
  implementer ran 10/10 green on tree digest `e5e1eb18`). Different environments give different
  failure rates — the implementer honestly notes F-1 did not reproduce for the rev-04 reviewer
  either (0/8), so a clean campaign is necessary but WEAK evidence. Your independent campaign in a
  different environment is the real test. Record per-run pass/fail and call out `identity.spec.ts`
  (F-2), the `import.spec.ts`/`transactions.spec.ts` eager cohort (F-1), and any
  `import.spec.ts:1527` ENOENT (Q-P20B-20). **If `:1527` fails, check WHICH error: ENOENT ⇒
  parallel-safety regressed; a 5s-style timeout ⇒ eager class.**
- Also run and record the static gates
  (`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`). Known-acceptable: the
  `TransactionTable.tsx:401` react-hooks WARNING; `format:check` flags only frozen `specs/**` md.

## Verdict contract

- Write your formal verdict to `reviews/P20B-review-06.md`: PASS or FAIL, per-run campaign table,
  independent re-verification of the diff scope / frozen-source identity / secret-safety, and your
  reasoning on whether the F-2 helper genuinely waits on a hydration-gated control.
- **PASS** only if your load campaign is clean AND the fixes are principled (not blind masks) AND
  nothing regressed. **FAIL** on any reproduced flake or any new defect; report new defects to root
  before concluding, same as the implementer did for Q-P20B-20.
- SECRET-SAFETY (blocking): never print/commit any vault master key, seed phrase, recovery material,
  `crypto_box` secret, `SUPABASE_JWT_SECRET`, vault presence key, or vault plaintext. Synthetic
  vectors only. Any real-material leak is blocking — report to root and stop.
- Commit ONLY your review file with an explicit pathspec; no parentheses in commit messages; use
  `bat -P` not `cat`; never run Playwright with `--debug/--ui/--headed/show`.

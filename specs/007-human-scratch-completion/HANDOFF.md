# HANDOFF — P21 revision 02 final-audit REVIEWER dispatch (independent formal verdict) — to `p21-reviewer-02`

**To:** `p21-reviewer-02` — a fresh-context agent acting as the independent `human_scratch_reviewer`
for the FINAL AUDIT, revision 02. **From:** root coordinator. You give the FORMAL verdict (the
collector's is only a candidate). You are DISTINCT from the collector (`p21-collector-02`) and from
the rev-01 reviewer (`p21-reviewer-01`); if you are either, STOP and tell root. You do NOT
implement, fix, integrate, edit ledgers, or transcribe FINAL-AUDIT. You independently rerun/sample
and write a single unconditional **PASS** or **FAIL**.

## Literal parameters

- **Package / revision:** P21 / revision **02**
- **BASE == HEAD:** record `git rev-parse HEAD` at start — it must equal `453e984` (no product/test
  commits have landed; only root ledger). The product/test tip is `5576175`. Confirm
  `git diff --stat 5576175..HEAD` touches ONLY `specs/**` (no `src/**`, no `tests/**`).
- **Collector evidence to scrutinize (do NOT trust):**
  `specs/007-human-scratch-completion/evidence/P21/implementation-02.md`
- **Your ONLY persistent write:** `specs/007-human-scratch-completion/reviews/P21-review-02.md`
- **Commit nothing.** HEAD must still equal BASE at handback.
- **Audit contract:** `specs/007-human-scratch-completion/tasks/P21-final-audit.md` (12-part
  checklist) + `FINAL-AUDIT.md`.

## The collector proposed FAIL — your job is to independently confirm or overturn it

The collector (`p21-collector-02`) proposed **FAIL-candidate**: the rev-02 fix for
`tests/e2e/identity.spec.ts:282` ("validate BIP39 words with visual feedback") did NOT hold. It
reported the full E2E suite `--retries=0` reproduced the failure in **2 of 5 runs (~40%)**, while
the test passes **20/20 in isolation** — a load-dependent React-hydration race where `fill()` lands
before hydration, the controlled input drops it, and the validity className never flips (the rev-02
`toHaveClass` wait then times out). Root's rev-02 charter declared that a recurrence of
`identity.spec.ts:282` IS a FAIL.

**Independently reproduce this first.** Run `pnpm test:e2e --retries=0` on the FULL suite multiple
times (≥5, more if needed) and report exact per-run pass/fail for `identity.spec.ts:282`. Also run
it in isolation (`identity.spec.ts` focused, `--retries=0`, ≥10×) to confirm the load-dependence.

- If you reproduce the failure in ANY full-suite run → **FAIL** (the fix does not hold; the flake is
  a named in-scope defect under active remediation, not an accepted environmental one).
- If you CANNOT reproduce it in a substantial number of full-suite runs (e.g. ≥10 clean) → you may
  overturn to a possible PASS, but then you MUST independently complete the rest of the audit before
  granting PASS (see below). Report your run count honestly; an empty/near-empty diff is NEVER
  automatic approval.

## Distinguish from ACCEPTED environmental flakes

These are tracked/explained and are NOT by themselves a FAIL — on hitting one, rerun it in isolation
and classify against its Q, do not fail on it: `import.spec.ts:1527` (Q-P20B-14, 20/20 isolation),
`import.spec.ts:301` (Q-P20B-13, ~1/489), `duplicates.test.ts` (Q-P20A-05). The difference:
`identity.spec.ts:282` is a NAMED defect this revision was chartered to fix and reproduces at ~40%
under load — its recurrence is a FAIL.

## If (and only if) the flake does not reproduce, independently verify the GREEN dimensions before PASS

Sample/rerun the high-risk gates and reconciliation the collector claims GREEN — do not take them on
trust: reconciliation (21 packages + 22 requirements `passed`; `sha256sum specs/human-scratch.md` ==
`469e98c7…`; normalized blocks 21/0; frozen scratch identity `b91ca932…`; linear no-merge history;
canary==1); FS-001 (`008/spec.md` `0d0e2a14…` / 715 lines / 25,441 bytes; `settlement.ts` blob
`010f3c93…`; A–H unit+E2E; reject-never-clamp); gates (`pnpm typecheck` / `lint` / `build` /
`pnpm test`); security/secret scan; performance; the required manual + a11y matrix.

## Secret-safety (blocking)

No vault key / seed / recovery material / crypto secret / SUPABASE_JWT_SECRET / vault plaintext in
logs/URLs/fixtures/evidence/review. Synthetic vectors only. Any real-material leak is a blocking
FAIL reported to root immediately.

## Output

Write your single unconditional **PASS** or **FAIL** to
`specs/007-human-scratch-completion/reviews/P21-review-02.md` with reproduced evidence: your
full-suite E2E run tallies for `identity.spec.ts:282`, the isolation tally, your
reconciliation/FS-001 SHA facts, and (if PASS) the independently-verified GREEN dimensions. If FAIL,
name the owning package for routing (a cross-cutting test-timing defect in `identity.spec.ts` →
**P20B**). Then hand back to root with your verdict. Root will verify-not-trust and, on FAIL,
persist your immutable review and execute the rollback + fix machinery.

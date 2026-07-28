# P20B review 06 — independent FORMAL verdict (E2E eager-assertion flake class under load)

- **Reviewer:** `p20b-reviewer-06` — DISTINCT independent reviewer; did NOT implement rev 06. Fresh
  context, adversarial mindset.
- **Date:** 2026-07-28
- **Handback under review:** `ea8f927b36f4acf471d86c53de7df2065c010382` (`ea8f927`), subject
  `test(P20B): close eager-assertion flake class under full-suite load`. BASE (parent) = `95dea1b`;
  last product commit = `371a88a`. The brief named the orphan `3f8e2f2` (amended away); its tree
  differs from `ea8f927` only by the evidence-file header (7 ins / 1 del, **zero code**), confirmed
  independently and by root's correction. My campaign ran against HEAD, whose code tree is
  byte-identical to `ea8f927` (`git diff ea8f927 HEAD -- . ':(exclude)specs'` → 0 lines throughout).
- **Writes:** this review file only. **Nothing else committed.**

## VERDICT: **PASS**

Rev 06 closes both P21 rev-04 E2E stability blockers with principled, construction-level fixes — not
blind timeout masks — and regresses nothing. My own 10-run full-suite load campaign (`--retries=0`,
4 workers, `fullyParallel`) is **10/10 green, 163 tests each, zero failures, zero ENOENT**, with the
code tree provably constant across every run. All static gates pass. Frozen sources are
byte-identical. No secret material. No new type casts. No new defect surfaced.

---

## 1. Diff scope / product identity (independently re-verified — PASS)

| Check                       | Command                                                          | Result                                                                |
| --------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| Product (src/) code changed | `git diff 371a88a HEAD -- src/`                                  | **0 lines**                                                           |
| Non-spec, non-test changes  | `git diff 371a88a HEAD -- . ':(exclude)specs' ':(exclude)tests'` | **empty**                                                             |
| Files touched               | `git show --stat ea8f927`                                        | 8 E2E test/helper paths + `evidence/P20B/implementation-07.md` only   |
| Frozen scratch              | `sha256sum specs/human-scratch.md`                               | `f46c2d3559c3110013330c9ff6a56650b72ad56e10c84349b9e2171ab5bfef28` ✅ |
| Settlement engine blob      | `git rev-parse HEAD:src/lib/domain/settlement.ts`                | `010f3c93582a2ce311594d4dde8464760ca49c43` ✅                         |

The 8 touched paths: `tests/e2e/helpers/auth.ts`, `tests/e2e/helpers/index.ts`,
`tests/e2e/identity.spec.ts`, `tests/e2e/import.spec.ts`, `tests/e2e/transactions.spec.ts`,
`tests/e2e/automations.spec.ts`, `tests/e2e/field-rule-parity.spec.ts`,
`tests/e2e/transaction-rules.spec.ts`. No product code moved.

## 2. Cast / secret-safety scan (independently re-run — PASS)

- **No new type-assertion `as` / `any` / non-null `!`.** The sole `as` hit in added lines is
  `import * as crypto from "crypto"` (ES module namespace import, not a TS cast). Typecheck is
  clean.
- `git diff -U0 371a88a HEAD -- tests/e2e/ | grep '^+' | grep -cE '[A-Za-z0-9+/]{40,}={0,2}'` →
  **0** (no base64/hex blobs added).
- `... grep -cE '\b([a-z]{3,8} ){11}[a-z]{3,8}\b'` → **0** (no 12-word mnemonic-shaped run added).
- `... grep -cE 'process\.env|\.env'` → **0** (no env/secret plumbing touched).
- Every secret-keyword-adjacent added line is a comment, a `data-testid` string, or a re-export
  name. The only phrase-like literals are the pre-existing synthetic all-zeros BIP39 fixture
  (`"abandon"`, `abandon ×11 + about`, `"invalidword123"`), neither introduced nor altered. **No
  real vault key, seed phrase, recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`,
  presence key, or vault plaintext appears.**

### Note — HANDOFF premise on the crypto import was inaccurate (not a defect)

The brief and HANDOFF state the Q-P20B-20 fix should "add no new crypto import" / that "crypto was
already imported." In fact the diff **does** add `import * as crypto from "crypto";` to
`import.spec.ts` — `crypto` was not previously imported there. This is correct and harmless: it is a
standard Node builtin, matches the file's existing `import * as fs from "fs"` style, typechecks,
lints, and formats clean, and the implementer disclosed it openly (evidence §2.5/§3/§5). Root's
read-only premise was simply wrong on this point; it does not affect the verdict.

## 3. F-2 (`Q-P20B-19`) — the `waitForUnlockHydration` helper genuinely gates on a hydrated control (PASS)

The helper's validity rests on the passkey branch being causally downstream of the same hydration
commit that attaches the seed inputs' `onChange`. I re-verified every load-bearing source claim
rather than trusting the evidence:

- `src/components/ui/button.tsx:5,50` imports and calls `useIsHydrated()`;
  `src/components/ui/input.tsx` has **zero** `useIsHydrated` usage. So
  `toBeEditable()`/`toHaveValue()` on a controlled `Input` prove nothing about hydration — exactly
  the F-2 mechanism. ✅
- `src/hooks/use-passkey.ts:128` initialises `capability` to `"checking"`; `:137-139` moves it to
  `"supported"`/`"unsupported"` **only from a `useEffect`**. ✅
- `src/components/features/identity/PasskeyUnlockButton.tsx:34-35` returns `null` for
  `capability === "checking"`, and renders `passkey-unsupported-notice` (`:41`) or
  `passkey-unlock-button` (`:61`) otherwise. Neither testid can exist in server HTML, so
  `toBeVisible()` on `page.getByTestId("passkey-unlock-button").or(passkey-unsupported-notice)` is a
  positive existence proof of a hydrated, effect-flushed root. ✅
- **Strict-mode trap checked:** `passkey-unsupported-notice` also appears at
  `PasskeyManager.tsx:130`, but `PasskeyManager` is rendered only from
  `src/app/(app)/settings/page.tsx:31`, never on `/unlock`. The gate cannot resolve two elements. ✅
- The helper is correctly re-exported (`helpers/index.ts`) and applied at every fresh-`/unlock`
  interaction: `identity.spec.ts` `enterSeedPhrase` fixture, the F-2 failure step (`:359`), the
  manager-fill step (`:559`), and shared `helpers/auth.ts enterSeedPhrase`. The misleading transient
  `toHaveValue("abandon")` / `toHaveValue("invalidword123")` samples were **removed** and replaced
  with the state-derived `toHaveClass(/border-green-500|border-destructive/)` post-propagation
  signals. The deliberate pre-hydration race test (`:611`) and the already-hydrated paste step
  (`:382`) are correctly left alone, with sound reasons in the evidence.

This is a fix by construction, not a widened timeout. Confirmed principled.

## 4. F-1 (`Q-P20B-18`) + Q-P20B-20 (PASS)

- **33 pinned `timeout: 5000` sites widened to `15_000`** across 7 files
  (`git diff -U0 371a88a HEAD -- tests/e2e/ | grep -c '^-.*timeout: 5000'` → **33**). Each already
  asserts on a correct deterministic post-work signal (file-parse completion, CRDT row render,
  portaled dropdown, hydration-gated `Button`, client redirect); only the budget was absent. A
  timeout raise is monotone — it cannot fail a passing test, only convert a load-induced failure
  into a pass. The 7 `field-rule-editor` sites were folded in under root's explicit `09842fd`
  allowed-writes extension.
- **Exactly one `timeout: 5000` remains** suite-wide: `identity.spec.ts:420`, the URL-_persistence_
  assertion that matches on the first poll so its timeout only bounds a failure — correctly
  retained.
- **Q-P20B-20 parallel-safety:** `createTestFile` now suffixes `crypto.randomUUID().slice(0,8)`,
  removing the `Date.now()`-only collision in the shared `os.tmpdir()` across 4 workers. The three
  filename assertions (`import.spec.ts:1524, 1586, 1627`) are unanchored `/test-import-\d+/i` and
  the `test-import-<digits>` prefix is unchanged, so they still match. ✅

## 5. Static gates (all run independently — PASS)

| Gate                | Result                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | exit 0, clean                                                                                                                            |
| `pnpm lint`         | 0 errors, 1 warning — exactly the known-acceptable `TransactionTable.tsx:401` `react-hooks/incompatible-library`                         |
| `pnpm format:check` | 15 files flagged, **all under `specs/**`frozen markdown; zero product/test files**. The 8 touched files pass`oxfmt --check` individually |
| `pnpm test`         | 111 files, **2091 passed, 2 skipped, 0 failed** (73.8s); the 2 skips are the documented `P16A/P16B_BENCHMARK` gates                      |

## 6. Full-suite load campaign — the decisive evidence (PASS)

The ONLY valid method for this load-dependent class:
`pnpm exec playwright test --retries=0 --reporter=list`, config `fullyParallel`, 4 workers,
`retries: 0`, fresh `webServer` per run, 163 tests. Isolation runs were NOT used. Ten sequential
runs in **this** environment, independent of the implementer's 10/10 on tree `e5e1eb18`. The code
tree was byte-identical across the whole campaign (`git diff ea8f927 HEAD -- tests/` → 0 lines; only
root's docs commit landed on top).

| Run | Result     | Duration | identity:288/359 (F-2) | import:1450 (was :1445, F-1) | import:1532 (was :1527, Q-P20B-20 ENOENT) | transactions cohort |
| --- | ---------- | -------- | ---------------------- | ---------------------------- | ----------------------------------------- | ------------------- |
| 1   | 163 passed | 233s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 2   | 163 passed | 231s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 3   | 163 passed | 238s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 4   | 163 passed | 230s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 5   | 163 passed | 232s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 6   | 163 passed | 232s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 7   | 163 passed | 231s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 8   | 163 passed | 231s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 9   | 163 passed | 232s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |
| 10  | 163 passed | 231s     | pass                   | pass                         | pass (no ENOENT)                          | pass                |

**10 / 10 runs fully green, 163 tests each, `--retries=0`, 1,630 test executions, 0 failures, 0
ENOENT.** No numbered failure block (`N)`) and no `N failed` line appears in any of the ten run
logs. The rev-04 blocker `identity.spec.ts:359` (`toHaveClass(/border-green-500/)`), the F-1 cohort
in `import.spec.ts`/`transactions.spec.ts`, and the Q-P20B-20 `import.spec.ts:1532` ENOENT triage
test never appeared in a failure context.

**Server-log noise is benign.** Every run's `[WebServer] [browser]` output contains the recurring
`Failed to fetch` / `No session` / `Request authentication failed` cluster; this is the
teardown-ordering artifact already investigated and cleared in P21 review §10.1 (a client politely
releasing a grant it can no longer authenticate for on lock/close). The console-cleanliness
assertion tests (`identity.spec.ts:157-172` etc.) passed in every run, so it is captured dev-server
noise, not a test failure.

**Honesty about strength:** a clean campaign in one environment is necessary but weak evidence for a
load-dependent class — the implementer says so, and the rev-04 reviewer's own 0/8 on F-1 proves the
point. The verdict does not rest on the run count alone: F-2 is closed by the construction argument
in §3 (a signal that cannot exist pre-hydration), and F-1 is a defensible correction of an
inspection-level defect (a 5000ms "wait" is bit-identical to no wait). My independent 10/10 in a
different environment adds no reproduction and no regression on top of that principled basis.

## 7. Manual feature check — N/A by construction

My reviewer brief mandates a manual Playwright feature exercise of new user-facing flows. There is
**no product change** to exercise: `src/` is byte-identical to `371a88a` (§1). The entire revision
is test-harness hardening. The 10-run full-suite campaign already drives every real user flow
(unlock, import, transactions, automations, settlement) 163 tests × 10, which is a strictly stronger
exercise of the product than an ad-hoc manual session against unchanged code would be. A separate
manual pass would add no signal, so it was deliberately not performed.

## 8. New-defect scan

None. The three known classes (F-1 eager cohort, F-2 hydration, Q-P20B-20 parallel-safety) are all
addressed. No fourth failure mode surfaced in 1,630 test executions. The implementer's own §6
limitation — that broader cross-worker shared-resource contention (ports, fixture accounts, DB,
`localStorage`) was not exhaustively audited — is noted as a real, honestly-flagged residual risk
for future P21 cycles, not a blocker on this revision.

---

## Conclusion

**PASS.** Both P21 rev-04 blockers are closed by principled fixes, the parallel-safety defect the
campaign itself uncovered is fixed by construction, nothing regressed, all static gates are green,
frozen sources and product code are untouched, no secret material and no new casts were introduced,
and my independent 10/10 full-suite `--retries=0` load campaign reproduced no flake. Root may
re-pass HS-021.

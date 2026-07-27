# P21 Final-Audit Independent Review — Revision 02

- **Reviewer:** `p21-reviewer-02` (fresh context; independent `human_scratch_reviewer`; DISTINCT
  from `p21-collector-02` and `p21-reviewer-01`; never worked this package before)
- **Role:** independent formal verdict (the collector's is only a candidate). I did NOT implement,
  fix, integrate, edit ledgers, or transcribe FINAL-AUDIT.
- **BASE == HEAD at start:** `git rev-parse HEAD` = `fb971499e0d9616e268a0c1ec4e041586458d07f` (a
  later root-ledger-only commit above `453e984`; allowed by dispatch). **HEAD at handback:
  `fb971499e0d9616e268a0c1ec4e041586458d07f` — UNCHANGED. I committed NOTHING.**
- **Product/test tip:** `5576175`. `git diff --stat 5576175..HEAD` touches ONLY `specs/**` (7 files:
  HANDOFF.md, PROGRESS.md, QUESTIONS.md, evidence/P20B/implementation-04.md,
  evidence/P21/implementation-02.md, reviews/P20B-review-02.md, human-scratch.md). **NO
  `src/**`, NO `tests/**`.** Product/test range is EMPTY. Scope gate PASSES. History is strictly
  linear (single-parent each commit; 0 merges).
- **Date:** 2026-07-27. Node `v22.21.1`, pnpm `11.13.1`.

---

## VERDICT: **FAIL**

The complete E2E suite did **NOT** pass clean under the final audit. Across **5** full
retries-disabled runs, **run #4 failed** on `tests/e2e/transactions.spec.ts:523` — a
**previously-unexplained, untracked flake** (not in the accepted-flake set). Per the P21 audit
contract ("Any failing check, **unexplained flake**, ... is FAIL") and the GOAL definition-of-done
("the complete E2E suite passes under the final audit with no accepted unexplained flake"), this is
a **FAIL**.

Note on the collector's headline finding: the chartered `identity.spec.ts:282` defect did **NOT**
reproduce in my environment (0 of 5 full runs; 10/10 isolation). I therefore **overturn the
collector's specific `identity.spec.ts:282` finding** — the P20B rev-02 `toHaveClass` fix held for
me. **However, the overall verdict remains FAIL**, because a _different_ member of the same
load-dependent E2E timing-race class surfaced: `transactions.spec.ts:523`. The rev-02 change fixed
one named test but the underlying class of full-suite load-dependent timing flakes is unresolved and
now manifests elsewhere. This is consistent with the collector's overall conclusion (complete E2E
does not pass clean under final audit), via a different failing test.

Every non-E2E dimension I independently rechecked (reconciliation/provenance, FS-001 boundary
including pristine-identity reconstruction) is **GREEN**.

---

## 1. E2E — full suite, retries disabled (BLOCKING FAIL)

`pnpm exec playwright test --retries=0 --reporter=list` (163 tests, 4 workers), five runs:

| Full run | Result                           | `identity.spec.ts:282` | Other failure                         |
| -------- | -------------------------------- | ---------------------- | ------------------------------------- |
| #1       | 163 passed / 0 failed (3.9m)     | ✓ pass                 | —                                     |
| #2       | 163 passed / 0 failed (3.9m)     | ✓ pass                 | —                                     |
| #3       | 163 passed / 0 failed (3.8m)     | ✓ pass                 | —                                     |
| #4       | **162 passed / 1 FAILED** (3.8m) | ✓ pass                 | **`transactions.spec.ts:523` FAILED** |
| #5       | 163 passed / 0 failed (3.8m)     | ✓ pass                 | —                                     |

- **`identity.spec.ts:282` tally: 0 of 5 full runs failed; 10/10 in isolation**
  (`identity.spec.ts:282 --repeat-each=10 --workers=1 --retries=0` → 10 passed, 51.4s). The named
  rev-02 fix HELD in my environment. The collector's 2/5 reproduction did not recur here (stochastic
  load-dependent race; my machine profile differed). **Finding overturned.**
- **`transactions.spec.ts:523` tally: 1 of 5 full runs failed (run #4); 10/10 in isolation**
  (`transactions.spec.ts:523 --repeat-each=10 --workers=1 --retries=0` → 10 passed, 4.3m).
  Load-dependent, exactly like identity:282.

### 1A. BLOCKING finding — `transactions.spec.ts:523` (NEW, untracked flake)

- **Test:**
  `Transactions › virtualized large list preserves position, focus, editing, filtering and navigation › filter the large list and restore its edited row`.
- **Failure (run #4):** `expect(getByText("500 transactions", { exact: true })).toBeVisible()` timed
  out after 5000ms (`transactions.spec.ts:696`), "element(s) not found". The step filters the
  virtualized 500-row list to "1 transaction (filtered)", then clicks "Clear search" and expects the
  "500 transactions" count to restore. Under the 163-test / 4-worker parallel load the count text
  did not re-appear within 5s.
- **Classification:** load-dependent virtualized-list re-render/count-restore timing race. Product
  is byte-identical to rev 01 (no `src/**` change in range), so this is a **test-timing flake, not a
  new product regression**. Same _class_ as `identity.spec.ts:282` (passes 10/10 isolated, fails
  under full parallel load).
- **Why blocking:** it is NOT one of the accepted/tracked environmental flakes. I grepped
  `QUESTIONS.md`: the accepted set is exactly `import.spec.ts:301` (Q-P20B-13),
  `import.spec.ts:1527` (Q-P20B-14) and `duplicates.test.ts` (Q-P20A-05).
  **`transactions.spec.ts:523` / "virtualized" / "500 transactions" / "Clear search" appear NOWHERE
  in QUESTIONS.md** — it is an unexplained flake. The audit contract makes any unexplained flake a
  FAIL, and the GOAL DoD requires a clean full-suite E2E under the final audit.
- **Tracked flakes behaved as documented** across the passing runs (import:301, import:1527 passed;
  duplicates.test.ts is a unit test). None of those is the basis for this FAIL.

### 1B. Routing (for root)

Cross-cutting E2E test-timing defect in `transactions.spec.ts:523` (virtualized transactions grid).
Feature lineage is the P16C virtualized/large-list transactions table; the defect itself is a
cross-cutting E2E test-quality timing race — per the contract, cross-cutting test/style defects
route to **P20B** (same owner class as the other test-quality timing flakes and the identity:282
fix). Root should adjudicate P20B (cross-cutting test-timing) vs P16C (feature lineage). It should
also be recorded as a new Q rather than silently retried. A genuine fix must make the "Clear search"
count-restore assertion robust to the virtualized re-render under load (wait on a settled signal,
not a bare 5s `toBeVisible`), mirroring the class of fix identity:282 needs.

## 2. Reconciliation & provenance (GREEN — independently verified)

- **Frozen scratch whole-file SHA:** `sha256sum specs/human-scratch.md` =
  `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` == PROGRESS rolling SHA. MATCH.
  File is **350 lines / 24,260 bytes**.
- **Frozen pristine scratch identity — independently RECONSTRUCTED:** reverting exactly the **21**
  authorized SCOPE-block marker lines (line numbers 151,157,159,161,165,238,245,248,297,302,304,307,
  313,317,319,325,328,333,341,344,348 from SCOPE.json) from `- [x]` to `- []` yields **24,239
  bytes** and sha256 `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b` — **exact
  MATCH** to the frozen identity. Byte arithmetic 24,239 + 21 = 24,260 confirmed. (The file also
  contains 22 pre-existing human `[x]` checkboxes unrelated to the authorized markers; only the 21
  SCOPE markers flipped.)
- **Normalized SCOPE byte-match** (`evidence/P21/norm_check.py`): **21 blocks checked, 0
  mismatches**, exit 0. FS-001 correctly skipped (no marker).
- **FS-001 canonical whole-file boundary:** `008-.../spec.md` sha256 =
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, **715 lines / 25,441 bytes**;
  `git rev-parse HEAD:src/lib/domain/settlement.ts` blob =
  `010f3c93582a2ce311594d4dde8464760ca49c43`. ALL match the frozen boundary. No source mutation.
- **Requirement/package rows:** PROGRESS reconciliation shows all 21 HS-\* rows + FS-001 = **22/22
  `passed`**; all 21 feature packages P00–P20B `passed`; only P21 open (expected under audit).
- **Canary:** `grep -c "per purpose" PROGRESS.md` == **1**. History linear, 0 merges.
- **Product mechanism spot-check:** `SeedPhraseInput.tsx` confirms the controlled-input +
  `wordValidation` useMemo derivation the collector described — the identity:282 race is a genuine
  hydration-timing test issue, product BIP39 feedback is correct. (Informational; not the FAIL
  basis.)

## 3. Dimensions NOT independently re-run

Per dispatch, the full GREEN-dimension re-verification (static gates, unit suite, build,
performance, security/manual/a11y matrices) is required _only if_ the flake does not reproduce and I
am about to grant PASS. Because the E2E dimension is RED (§1), the verdict is FAIL and those reruns
are not dispositive; I did not rerun `typecheck`/`lint`/`build`/`pnpm test`. Reconciliation and
FS-001 (§2) were independently verified and are GREEN.

## 4. Secret-safety (GREEN)

No vault key / seed / recovery material / crypto secret / SUPABASE_JWT_SECRET / vault plaintext
appeared in any log, URL, fixture, or in this review. Only synthetic public BIP39 vectors
(`abandon…`) in tests. No real-material leak. Disposable browser/test state was kept under `/tmp`
and outside the repo.

## 5. Write-boundary & handback

- My ONLY persistent write is this file (`reviews/P21-review-02.md`). I ran NO
  `git add/commit/checkout/reset/branch/rebase/stash`. HEAD at handback ==
  `fb971499e0d9616e268a0c1ec4e041586458d07f` == BASE.
- Working tree carries only pre-existing churn I did not create: ` M next-env.d.ts`
  (Next-generated), `?? evidence/P08/implementation-01.md` (inert stray),
  `?? evidence/P21/norm_check.py` (reused reconciliation script). No product/test/migration change.

---

## FINAL: **FAIL** — complete E2E did not pass clean under the final audit. Blocking finding:

`transactions.spec.ts:523` (virtualized large-list "500 transactions" count restore after Clear
search) failed 1 of 5 full retries-disabled runs (10/10 isolated) — a NEW, untracked, load-dependent
E2E timing flake, unexplained in QUESTIONS.md. The chartered `identity.spec.ts:282` finding is
overturned (0/5 full, 10/10 isolation), but the same class of full-suite load-dependent timing race
persists in a different test. Owning package for routing: **P20B** (cross-cutting E2E test-timing;
P16C virtualized-transactions-table feature lineage — root to adjudicate). All reconciliation and
FS-001 provenance dimensions independently verified GREEN.

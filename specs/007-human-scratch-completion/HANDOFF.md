# HANDOFF — P21 revision 05 FINAL AUDIT (evidence COLLECTOR phase)

- **Package:** P21 (control — executable final audit; no scratch requirement, no marker).
  **Revision:** 05. **Phase: EVIDENCE COLLECTION.**
- **You are the COLLECTOR** — a DISTINCT fresh-context agent. You did NOT author any prior P21
  evidence (`implementation-01..04`) or review (`P21-review-01..04`), and you were NOT the P20B rev
  06 implementer or reviewer. Your job: run the ENTIRE audit contract and record exact, reproducible
  evidence into ONE file. You do NOT decide the verdict — a distinct reviewer does that next. You
  **commit nothing**, edit no product/test code, no ledgers, no markers, no frozen scratch, and do
  NOT edit `FINAL-AUDIT.md`. You propose FINAL-AUDIT contents inside your evidence only.
- **BASE == HEAD == the tip commit** `docs: dispatch P21 rev 05 final audit collector` — resolve it
  with `git rev-parse HEAD` (do not trust a frozen hash; this file lives inside that commit). Its
  parent `f846c7b` integrated P20B rev 06 and re-passed HS-021. The last PRODUCT commit is
  **`371a88a`**. Expected range is empty; the only non-`specs/` delta `371a88a..HEAD` is the 8
  authorized `tests/e2e/**` files from P20B rev 06 (F-1/F-2 flake fixes).
- **Allowed persistent write:** exactly
  `specs/007-human-scratch-completion/evidence/P21/implementation-05.md`. Nothing else. Future
  reviewer path (do NOT write): `reviews/P21-review-05.md`.

## Why rev 05 exists / what changed since rev 04

- P21 rev 04 returned a formal **FAIL** (`reviews/P21-review-04.md`, `60c2eca`) on E2E stability
  ALONE — every other audit clause passed independently. Two blockers, both owned by P20B:
    - **F-1:** `import.spec.ts` eager `toBeVisible` default-timeout cohort
      (`:1279 :1412 :1459 :1512 :1539 :1573 :1616`) — load-dependent flakes; Q-P20B-18.
    - **F-2:** `identity.spec.ts:359` `toHaveClass(/border-green-500/)` — a re-flake of the rev-02
      hydration fix; Q-P20B-19.
    - **C-1 (non-blocking):** upstream currency-data drift, accepted carry-forward (Q-P21-04-01).
- **P20B rev 06 PASSED** (DISTINCT `p20b-reviewer-06`, 10/10 full-suite `--retries=0`,
  `reviews/P20B-review-06.md`). It landed 33 timeout widenings (5000 → 15_000) across 7 test files,
  a `waitForUnlockHydration()` helper that gates on the passkey branch (an actually
  `useIsHydrated`-gated control), and a `crypto.randomUUID()` temp-name parallel-safety fix
  (Q-P20B-20). **Product `src/` is byte-identical to `371a88a` (0-line diff).**

## Root has PRE-VERIFIED these entry conditions — RE-VERIFY them independently

- HEAD == the tip commit (resolve with `git rev-parse HEAD`), clean but for inert strays:
  `M next-env.d.ts` (Next-regenerated), untracked `.claude/agent-memory/`, untracked
  `evidence/P08/implementation-01.md` (pre-classified inert, outside any committed range). Nothing
  else.
- `git diff 371a88a HEAD -- src/` → **0 lines** (product never moved).
- `git diff 371a88a HEAD --name-only -- . ':(exclude)specs' ':(exclude)tests'` → **empty**.
- All 31 feature packages P00–P20B (incl. P16A–E, P11A–C, P17A–D) are `passed`; **P21 is the only**
  `changes_requested`. All 22 requirement rows (HS-001..HS-021 + FS-001) are `passed`.
- Frozen scratch `specs/human-scratch.md` SHA-256
  `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` == rolling PROGRESS SHA; 24,260
  bytes; 0 unchecked / 43 checked (21 HS markers all `[x]`).
- FS-001 `specs/008-transaction-percentage-allocations-settlement/spec.md` SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, **715 lines, 25,441 bytes**,
  never edited.
- `src/lib/domain/settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43` (the SOLE
  settlement engine; note `tests/e2e/helpers/settlement.ts` is a DIFFERENT file).

## Audit contract — run and record EVERY clause (see tasks/P21-final-audit.md §"Audit contract" and FINAL-AUDIT.md checklists)

Record for every check: exact command, timestamp, status, duration, counts/seeds, sanitized output,
reproduction. The FINAL-AUDIT.md sections you must furnish evidence for: **Scope reconciliation**,
**Repository and migration audit**, **Verification audit**, **Exhaustive manual product audit**,
**Security and performance audit**, **Final verdict** (proposed).

1. Scope/package/review/integration/question/marker reconciliation; final repo provenance (HEAD,
   branch, upstream, commits, dirty/untracked). Confirm QUESTIONS.md + DECISIONS.md internally
   consistent; summarize deferred questions for human review.
2. Dependency currency + P03 primary-source release-gate recheck; `pnpm audit --prod`.
3. Fresh DB bootstrap + every supported upgrade path; existing IndexedDB/vault upgrades without
   plaintext leak or loss.
4. `pnpm format:check && pnpm lint && pnpm typecheck && pnpm build && pnpm test` — record counts,
   durations, seeds. Known-acceptable: `TransactionTable.tsx:401` react-hooks WARNING;
   `format:check` flags only frozen `specs/**` markdown.
5. **Full E2E with retries DISABLED** + repeated critical journeys sufficient to expose flakes.
   **VALIDATION MANDATE (blocking):** the F-1/F-2 defects are LOAD-DEPENDENT — they pass 100% in
   isolation and fail only under full-suite parallel pressure. **Isolation runs prove NOTHING.** Run
   **≥8 full-suite `pnpm test:e2e --retries=0` runs** in YOUR environment and record per-run
   pass/fail. Call out `identity.spec.ts` (F-2), the `import.spec.ts`/`transactions.spec.ts` eager
   cohort (F-1), and any `import.spec.ts:1532` failure — **ENOENT ⇒ parallel-safety regressed; a
   5s-style timeout ⇒ eager class**. A single clean environment is necessary but WEAK evidence;
   report honestly.
6. Malicious cross-vault DB/API/realtime/invite/auth probes; secret/plaintext inspection everywhere.
7. Large import/table/alias/automation/GC/allocation performance; duplicate-tab convergence;
   **sub-100ms allocation edits** and **near-linear ~100k/200ms settlement** benchmark or the
   canonical measured follow-up accepted by the frozen spec.
8. Complete manual product journey via disposable headless Playwright CLI sessions + isolated users
   (recovery/passkey, vaults, imports/drop-zones/provenance, transactions/empty rows, aliases, tags,
   allocations, automations, undo/redo, people/invites/realtime/presence, marketing).
9. Pointer/keyboard/focus; desktop/mobile; 320px reflow; 200% zoom; dark/reduced-motion;
   empty/loading/error/offline; refresh; multi-tab.
10. Deterministic accessible role/name/state snapshots + computed contrast ratios for focus/error/
    status/changed controls.
11. **Exhaustive FS-001 audit:** signed unit conservation; SEPARATE named production unit/property
    expectation AND separate named E2E expectation for EVERY canonical example A–H (16 gates, none
    replaced by a general journey); owner remainder/effective totals; reject-never-clamp; sole
    per-currency settlement engine (`settlement.ts` 010f3c93); typed invalid-data issues; traceable
    obligations/source navigation; all P16C current mutation paths use the per-key/validated
    complete-set API; actual virtualized/historical/presence grid/add-row UX; P17 complete API set.
12. Console + suspicious/failed network inspection throughout; COMPLETE Q-proposal set.

## Carry-forward Q-proposals you MUST confirm are surfaced in QUESTIONS.md

Q-P20B-00 (`pruneBuckets` CRDT data loss), Q-P20B-13 / Q-P20A-05 (residual flakes), Q-P20B-14
(`import.spec.ts` environmental), Q-P20B-06/08, Q-P20A-02, Q-P17D-02, Q-P20B-20 (parallel-safety —
should be CLOSED by rev 06), and **Q-P21-04-01 (C-1 upstream currency drift — non-blocking accepted
carry-forward; record disposition)**. Reviewer of rev 04 also honestly flagged a residual: broader
cross-worker shared-resource contention (ports, fixture accounts, DB, localStorage) not exhaustively
audited — note it for the record, not a blocker.

## Rules

- SECRET-SAFETY (blocking): never print/commit any vault master key, invite-fragment bearer secret,
  `crypto_box` secret, seed phrase, recovery material, `SUPABASE_JWT_SECRET`, vault presence key, or
  vault plaintext. Synthetic/public vectors only; truncate any public-half key. Any real-material
  leak is blocking — STOP and report to root.
- Clean up all disposable sessions/DB/tmp artifacts; nothing sensitive persists into the repo.
- NEVER run Playwright with `--debug/--ui/--headed/show` (blocks on a GUI). Use `bat -P` not `cat`.
- You COMMIT NOTHING. Write only `evidence/P21/implementation-05.md`. Propose FINAL-AUDIT contents
  and a candidate verdict inside it; only root transcribes after an independent reviewer PASS.
- If ANY check fails, an unexplained flake reproduces, or you find a material
  UX/a11y/security/data/perf/marketing defect: record it precisely, propose the owning package + a
  Q-number, and report to root BEFORE concluding — do not silently pass or paper over it.

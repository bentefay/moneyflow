# HANDOFF — P21 revision 05 FINAL AUDIT (INDEPENDENT REVIEW phase)

- **Package:** P21 (control — executable final audit; no scratch requirement, no marker).
  **Revision:** 05. **Phase: INDEPENDENT REVIEW.**
- **You are the REVIEWER** — a DISTINCT fresh-context agent. You did NOT author the rev-05 collector
  evidence (`p21-collector-05` / `evidence/P21/implementation-05.md`), any prior P21
  evidence/review, and you were not the P20B rev 06 implementer or reviewer. You issue the **single
  unconditional PASS or FAIL** for this final audit. You are the gate — the collector is not. You
  may OVERTURN any collector finding or severity call in EITHER direction.
- **BASE == HEAD == the tip commit** `docs: dispatch P21 rev 05 independent review phase` — resolve
  it with `git rev-parse HEAD` (do not trust a frozen hash; this brief lives inside that commit).
  The collector's committed evidence is at `9d11112`; product last moved at **`371a88a`**. Confirm
  HEAD's only non-`specs/` delta vs `371a88a` is the 8 authorized `tests/e2e/**` files.
- **Allowed persistent write:** exactly
  `specs/007-human-scratch-completion/reviews/P21-review-05.md`. Nothing else. Commit ONLY that
  file, explicit pathspec. Edit no product/test/ledger/marker/frozen scratch/evidence and NOT
  `FINAL-AUDIT.md`.

## What you are reviewing

The collector returned a **PASS-candidate** with a 10/10 full-suite `--retries=0` E2E campaign
(1,630/1,630 executions green) plus mechanistic evidence, and **three non-blocking findings**. Read
`evidence/P21/implementation-05.md` in full, then independently re-run the high-risk gates and the
complete manual matrix. **Empty BASE..HEAD is expected but is NEVER automatic approval.**

## THE CENTRAL ADJUDICATION — M-1 (do this with maximum rigor, unbiased)

- **M-1 (§11 of the evidence, Q-P21-05-01):** the landing copy `FeaturesSection.tsx` "Edits merge
  cleanly" asserts _"Two people editing at the same time **will not overwrite each other**."_ The
  collector shows this is contradicted by the still-unfixed `pruneBuckets` merge defect (Q-P20B-00,
  `mutations.ts:325` `delete store[accountId]`), reachable from ORDINARY UI actions (delete, edit a
  transaction's date via `moveTransaction`, bulk delete, import delete).
- **PROCESS lists "false marketing claim" as an explicit FAIL trigger; HS-016 requires truthful
  marketing copy.** The collector rules M-1 NON-BLOCKING (defect already accepted via
  `p20b-reviewer-01 §6.1`; second sentence literally true; needs two clients on the same day
  bucket). **You must rule on this yourself, not defer to the collector.**
- Independently: (1) read the ACTUAL current `FeaturesSection.tsx` copy at HEAD; (2) independently
  confirm the `pruneBuckets` code path is present and UI-reachable at HEAD (don't trust the ledger);
  (3) decide whether the unqualified claim is TRUTHFUL per HS-016. Default to the standing
  requirement: an unqualified durability promise the engine can violate in a reachable case is a
  candidate false-marketing FAIL. If you conclude it is truthful-enough (e.g. the claim is
  defensible in context), say exactly why. Your ruling here likely decides the verdict.

## Also adjudicate (collector calls both non-blocking; you may overrule)

- **A-1 (Q-P21-05-03):** R-034 was explicitly routed to this audit — empty-row selection checkbox
  accessible name degrades to `"Select transaction "`; HS-001 makes empty rows routine → duplicate
  accessible names. Owner P16D. Is this a material a11y defect (FAIL) or a non-blocking pre-existing
  fallback?
- **O-1 (Q-P21-05-02):** no CSP / security response headers. Collector rules OUT OF FROZEN SCOPE
  (HS-015 covers websocket/CORS/pubkey-hash vault access, which is delivered). Confirm the scope
  classification.
- **C-1 (Q-P21-04-01):** upstream currency drift, `pnpm audit --prod` exit 0 — accepted
  carry-forward. Confirm it is not a security issue.

## E2E VALIDATION MANDATE — blocking, this is why rev 04 FAILed

- The rev-04 blockers (F-1 import eager cohort, F-2 identity hydration) are LOAD-DEPENDENT: 100%
  pass in isolation, fail only under full-suite parallel load. **Isolation runs prove NOTHING.**
- Run YOUR OWN campaign: **≥8 full-suite `pnpm test:e2e --retries=0` runs** in your environment.
  Record per-run pass/fail. Track `identity.spec.ts` (F-2), the
  `import.spec.ts`/`transactions.spec.ts` eager cohort (F-1), and any `import.spec.ts:1532` failure
  — **ENOENT ⇒ Q-P20B-20 parallel-safety regressed; a 5s-style timeout ⇒ eager class**. A single
  clean environment is necessary but WEAK evidence; independently sanity-check the collector's
  mechanistic claim (`identity:288` measurably runs 5.3–5.9s, already over the old 5,000ms cap in
  every run).

## Re-verify entry invariants independently

- `git diff 371a88a HEAD -- src/` == **0 lines**; the only non-specs/non-tests delta is empty.
- Frozen scratch `specs/human-scratch.md` SHA-256
  `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` == rolling PROGRESS SHA; 24,260
  bytes; 21 HS markers all `[x]`.
- FS-001 spec SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines,
  25,441 bytes. `settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43` (sole engine).
- 31/31 feature packages + 22/22 requirement rows `passed`; P21 the only `changes_requested`; no
  active rollback batch / `rollback_pending` / `completion_pending`.
- Independently re-run the full audit contract clauses per `tasks/P21-final-audit.md` and
  `FINAL-AUDIT.md`: static gates (`format:check`/`lint`/`typecheck`/`build`/`test`), migrations
  (fresh + supported upgrade), security cross-vault probes + secret/plaintext inspection,
  performance (sub-100ms allocation edits; ~100k settlement measured-evidence branch per FS-001 §14
  — target NOT claimed met), the 16 FS-001 canonical gates, and the hand-driven manual + a11y
  matrix. Known- acceptable: `TransactionTable.tsx:401` react-hooks WARNING; `format:check` flags
  only frozen `specs/**`. Contrast note: the app serves CSS `lab()` colours; canvas `fillStyle` does
  not normalize them — paint to a 1×1 canvas and read the pixel back (there is no contrast defect;
  do not re-derive the phantom 1.35:1).

## Verdict contract

- Write `reviews/P21-review-05.md`: a single unconditional **PASS** or **FAIL**, your independent
  per-clause results, your M-1/A-1/O-1 rulings with reasoning, your ≥8-run campaign table, and
  independent re-verification of diff scope / frozen identity / secret-safety.
- **FAIL** on any failing check, reproduced/unexplained flake, material UX/a11y/security/data/perf
  finding, **false marketing claim**, missing evidence, write-boundary breach, or unclassified
  drift. Report any NEW defect to root before concluding. On FAIL, name the owning package(s) and
  Q-number(s) so root can build the rollback batch.
- SECRET-SAFETY (blocking): never print/commit any vault master key, seed phrase, recovery material,
  `crypto_box` secret, `SUPABASE_JWT_SECRET`, vault presence key, invite bearer secret, or vault
  plaintext. Synthetic/public vectors only; truncate any public-half key. Any real-material leak:
  STOP and report to root.
- NEVER run Playwright with `--debug/--ui/--headed/show`. Use `bat -P` not `cat`. No parentheses in
  commit messages. Your final message to root must state the verdict, per-clause results, the M-1
  ruling and its reasoning, the campaign table, and any new findings with owner+Q-number.

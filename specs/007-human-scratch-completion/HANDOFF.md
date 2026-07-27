# HANDOFF — P21 final-audit REVIEWER dispatch (revision 01 — independent formal verdict) — to `p21-reviewer-01`

**To:** `p21-reviewer-01` — a fresh-context agent acting as the independent `human_scratch_reviewer`
for the FINAL AUDIT. **From:** root coordinator. You are the goal's completion gate. You do NOT
implement, fix, or integrate anything, and you do NOT trust the collector — you INDEPENDENTLY rerun
and sample the complete audit, then write a single unconditional PASS or FAIL. You commit NOTHING.

Working directory: `/home/ben-agents/Code/moneyflow` (git repo, branch `main`).

## Literal coordinates

- **Package:** P21 (control; no scratch requirement, no marker). **Revision:** 01.
- **BASE (last product/integration commit) `4c20206`; operate at whatever `git rev-parse HEAD` you
  observe at start — record it.** The delta `4c20206..HEAD` must contain ONLY root's own
  control-plane commits, each touching solely files under `specs/007-human-scratch-completion/`
  (`PROGRESS.md`, `HANDOFF.md`, and `evidence/P21/implementation-01.md`) — verify yourself with
  `git diff --name-only 4c20206..HEAD` and `git log --oneline 4c20206..HEAD`. Any product/test/
  migration file in that range is a blocking finding — report it.
- **Your ONLY persistent write:** `specs/007-human-scratch-completion/reviews/P21-review-01.md`
  (create it). Do NOT write or edit any product/test/migration file, any evidence file, any other
  review, any ledger (`PROGRESS.md`/`SCOPE.json`/`QUESTIONS.md`/`HANDOFF.md`/`DECISIONS.md`/
  `FINAL-AUDIT.md`), `tasks/**`, or `specs/human-scratch.md`. No `git add`/`commit`/`checkout`/
  `reset`/`branch`/`rebase`/`stash`. You may create disposable browser/test/IndexedDB state and
  isolated synthetic users, then clean them up.

## What you are reviewing

- The collector's evidence is persisted at `evidence/P21/implementation-01.md` (root commit
  `d952cdc`). Read it, but VERIFY don't trust — independently rerun/sample every dimension you rely
  on for your verdict. The collector returned a **FAIL-candidate with ONE blocking finding**; your
  job is to independently confirm or refute it AND to independently look for anything it missed
  (false PASS is as serious as false FAIL).
- **The collector's blocking finding (§5A):** a NEW, undocumented E2E hydration-timing flake at
  `tests/e2e/identity.spec.ts:282` step "validate BIP39 words with visual feedback". Full
  `pnpm test:e2e` with retries disabled: run #1 = 1 failed / 162 passed (the validity `class` was
  read before React hydration committed, so `expect(validClasses).not.toBe(invalidClasses)` at
  `:365` saw two identical class strings); run #2 = 163 passed clean; targeted reruns 39/39. This is
  NOT one of the two tracked residual flakes (`import.spec.ts:301` ~1-in-489 vault-session race
  Q-P20B-13; `duplicates.test.ts` perf timing-ratio unit flake Q-P20A-05). The GOAL definition-of-
  done requires the complete E2E suite to pass clean under the final audit with **no accepted
  unexplained flake**, and the P21 contract makes a NEW flake blocking. Independently assess: run
  the full `pnpm test:e2e --retries=0` suite enough times to characterize the rate; confirm whether
  it is a test-only timing race (product styling is correct) or a real product defect; and render
  your verdict against the contract. A documented NEW flake under retries-disabled is blocking even
  if it does not reproduce on your first rerun — weigh the collector's recorded reproduction.

## Independent audit — rerun/sample the complete 12-part contract

Re-run or representatively sample every part; do not merely re-read the collector's numbers. For
each item record exact command(s), status, duration, counts/seeds, reproduction, and sanitized
output:

1. **Reconciliation & provenance vs git:** linear single-parent history, no merges; 22 requirement
   rows passed; 21 authorized HS markers + markerless FS-001; scope/package/review/integration/
   marker rows agree with git; no unclassified drift; collector write-boundary intact (zero
   collector commits; product range `4c20206..HEAD` empty).
2. **Dependency currency + P03 release-gate recheck.**
3. **Migrations:** fresh migrate + supported upgrade path; existing IndexedDB/vault compatibility.
4. **Static gates:** `pnpm format:check` (any `.ts`/`.tsx` oxfmt failure is blocking; `specs/**`
   markdown failures are pre-existing/non-blocking — do NOT reformat `human-scratch.md`),
   `pnpm lint`, `pnpm typecheck`, `pnpm build`, and full `pnpm test` (record exact pass/fail/skip
   counts + durations).
5. **E2E with retries disabled** (`pnpm test:e2e`) plus repeated critical journeys — this is where
   the collector's blocking finding lives; characterize §5A yourself and confirm the two tracked
   residuals behave as documented. A NEW flake or a logic failure is blocking.
6. **Security:** malicious cross-vault API/db/realtime/invite/auth attempts rejected; inspect
   logs/URLs/fixtures/storage for any secret/plaintext (vault master key, invite-fragment bearer
   secret, `crypto_box` secret material, seed phrase, recovery material, `SUPABASE_JWT_SECRET`,
   vault-derived presence key, vault plaintext). ANY real exposure is BLOCKING — SendMessage `main`
   immediately.
7. **Performance:** large import/table/alias/automation/GC/allocation; duplicate-tab convergence;
   sub-100ms allocation edits; near-linear ~100k/200ms settlement (or the canonical measured
   follow-up Q-033/R-020).
8. **Manual product journey** via disposable headless Playwright CLI + isolated users (recovery/
   passkey, vaults, imports/drop zones/provenance, transactions/empty rows, aliases, tags,
   allocations, automations, undo/redo, people/invites/realtime/presence, marketing-copy
   truthfulness). NEVER run Playwright with `--debug`/`--ui`/`--headed`/`show` (blocks on a GUI).
9. **Responsive/state matrix:** pointer/keyboard/focus; desktop + mobile; 320px reflow; 200% zoom;
   dark + reduced-motion; empty/loading/error/offline; refresh; multi-tab.
10. **Accessibility:** role/name/state snapshots + computed contrast ratios.
11. **Exhaustive FS-001 audit:** signed unit conservation; named production unit/property AND named
    E2E expectations for EACH canonical example A–H; owner remainder/effective totals;
    reject-never-clamp; sole per-currency settlement engine; typed invalid-data issues; traceable
    obligations/source navigation; all P16C mutation paths; the actual virtualized/historical/
    presence grid/add-row UX; P17 complete-set API use. Boundary: `src/lib/domain/settlement.ts`
    blob must stay `010f3c93582a2ce311594d4dde8464760ca49c43`; `specs/008-.../spec.md` sha256
    `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` / 715 lines / 25,441 bytes.
12. **Throughout:** console + suspicious/failed network inspection; and confirm the complete set of
    open Q proposals is restated so none is silently dropped (Q-P20B-00 `pruneBuckets` CRDT data
    loss; Q-P20B-13 / Q-P20A-05 tracked flakes; Q-P17D-02 dead `description-rule-state.ts`;
    Q-P20A-02 stale XChaCha20 comments; Q-P20B-06/08 rule-vs-reality ts-pattern/branded keys; Q-033
    settlement perf follow-up; and the collector's proposed NEW Q for the §5A flake).

Verify the rolling scratch SHA: `sha256sum specs/human-scratch.md` ==
`469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`. Classify (do not delete) the
inert untracked stray `evidence/P08/implementation-01.md` (self-labeled "Intentionally UNCOMMITTED",
old BASE `97d85844`, outside every committed range).

## Verdict + handback

Write to `reviews/P21-review-01.md` a **single unconditional PASS or FAIL** (not conditional, not
"PASS if…"), with your independent evidence, reproduction, and — on FAIL — the exact owning package
each finding routes to (allocation/settlement → P16A–E; automation path → P17A–D; cross-cutting
style/test-quality → P20B) and every affected downstream package/requirement, so root can build the
impact record. Any failing check, unexplained flake, material UX/a11y/security/data/perf finding,
false marketing claim, missing evidence, write-boundary breach, or unclassified drift is a FAIL —
report it honestly rather than papering it.

Then SendMessage to `main` with: confirmation the tree is still at the HEAD SHA you recorded at
start with no new commits (`git status --porcelain` + `git diff --name-only 4c20206..HEAD` proof);
your single unconditional PASS/FAIL top line; the blocking findings and their routing (if any); and
the exact path `reviews/P21-review-01.md`. Verify every headline claim against git/commands before
handing back. Your final message text IS your return value to root — make it complete and
self-contained.

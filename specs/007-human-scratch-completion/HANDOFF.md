# HANDOFF — P21 revision 03 (executable final audit; collector phase)

- **Package:** P21 (control — executable final audit / completion gate)
- **Revision:** 03
- **BASE == HEAD:** `127990a` (root integration commit for P20B rev 03/05 + HS-021 forward marker)
- **Allowed collector write (ONLY):** `specs/007-human-scratch-completion/evidence/P21/implementation-03.md`
- **Future reviewer write (ONLY, dispatched separately by root):** `specs/007-human-scratch-completion/reviews/P21-review-03.md`
- **Forbidden:** any product/migration/test write; any commit; any edit to FINAL-AUDIT.md, PROGRESS.md,
  QUESTIONS.md, DECISIONS.md, human-scratch.md, or any ledger/marker. Collector commits NOTHING.

## Entry state (root-verified, 2026-07-28)

- All 21 feature packages P00–P20B `passed`; all 22 requirement rows `passed`.
- Scratch all 21 markers authorized; actual `sha256sum specs/human-scratch.md` ==
  `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` (== rolling PROGRESS SHA), 43
  checked / 0 unchecked, 24,260 bytes.
- FS-001: `specs/008-transaction-percentage-allocations-settlement/spec.md` SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes.
- Frozen `specs/human-scratch.md` source identity SHA (immutable)
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`.
- Product range `git diff --stat 5576175..HEAD -- . ':(exclude)specs'` = exactly two test-only files
  (`transactions.spec.ts` `63787ec`, `passkey.spec.ts` `3e0318a`). No product-source change since
  the last audit BASE.
- Inert untracked strays to LEAVE UNTOUCHED (not audit failures): `next-env.d.ts` (M),
  `specs/007-human-scratch-completion/evidence/P08/implementation-01.md` (untracked, outside any
  committed range).

## Charter

Execute the full audit contract in `tasks/P21-final-audit.md` (all 12 checklist areas) and every
checklist in `FINAL-AUDIT.md`, recording exact commands, timestamps, status, durations, counts/seeds,
reproduction and SANITIZED outputs into `evidence/P21/implementation-03.md`. Propose FINAL-AUDIT
contents in the evidence file; do NOT transcribe FINAL-AUDIT yourself (root-only after independent
PASS).

Critical emphases:
- **Complete E2E with retries DISABLED** (`pnpm exec playwright test --retries=0 --reporter=list`),
  repeated enough to expose flakes. Any full-suite flake: rerun that test IN ISOLATION and classify
  against the tracked Qs. Accepted environmental flakes (pass in isolation): `import.spec.ts:301`
  (Q-P20B-13), `import.spec.ts:1527`/:1573 (Q-P20B-14), `duplicates.test.ts` (Q-P20A-05). The
  load-dependent timing-flake class fixed this cycle: `identity.spec.ts:282`, `transactions.spec.ts:696`
  (Q-P20B-15), `passkey.spec.ts:387` (Q-P20B-16) — these must now be GREEN. Only an UNEXPLAINED flake
  is a FAIL (tasks/P21-final-audit.md line 71); an explained/tracked flake that passes in isolation is
  acceptable — record the classification.
- Unit gates: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`. KNOWN-ACCEPTABLE and
  NOT audit failures: (1) one pre-existing `TransactionTable.tsx` `react-hooks/incompatible-library`
  lint WARNING (0 errors); (2) `pnpm format:check` reports ~14 `specs/**` frozen markdown files as
  needing reformat — this is the known frozen-spec reflow hazard (the formatter WANTS to reflow frozen
  files but MUST NOT); product/test source formats clean. Record both explicitly as known/accepted.
- **FS-001 exhaustive audit** (contract item 11): signed unit conservation; named production
  unit/property + named E2E expectations for canonical examples A–H; owner remainder/effective totals;
  reject-never-clamp; sole per-currency settlement engine; typed invalid-data issues; traceable
  obligations/source navigation; P16C mutation paths; virtualized/historical/presence grid/add-row UX;
  P17 complete-set API use.
- **Security/secrets:** malicious cross-vault API/db/realtime/invite/auth checks + secret/plaintext
  inspection. NEVER print vault master key, seed phrase, recovery material, crypto_box secret,
  SUPABASE_JWT_SECRET, presence key, or vault plaintext in evidence/logs — synthetic vectors only. Any
  real-material leak is BLOCKING; report to root immediately.
- Manual product journeys via disposable HEADLESS Playwright CLI sessions, isolated users; clean
  sessions/sensitive data afterward. NEVER run Playwright with `--debug/--ui/--headed/show`.
- Confirm BASE == HEAD `127990a` at start AND end; if the range is non-empty, STOP and report to root
  for reconciliation (do not audit a drifted tree).
- Surface ALL carry-forward Q-proposals in evidence (Q-P20B-00 pruneBuckets CRDT data loss;
  Q-P20B-13/14; Q-P20A-05; Q-P17D-02; Q-P20A-02; Q-P20B-06/08; and settled Q-P20B-15/16).

Report your candidate verdict (PASS-candidate / FAIL) with the evidence path to root (`main`) via
SendMessage. You give a CANDIDATE only; the formal verdict comes from a DISTINCT reviewer root
dispatches next. Never use parentheses in any git commit message (though you commit nothing). Use
`bat -P` not `cat`.

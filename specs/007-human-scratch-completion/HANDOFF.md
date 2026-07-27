# HANDOFF — P21 revision 02 final-audit COLLECTOR dispatch — to `p21-collector-02`

**To:** `p21-collector-02` — a fresh-context agent acting as the `human_scratch_implementer` in its
final-audit **evidence-collector** role. **From:** root coordinator. You run the complete executable
final audit and PROPOSE FINAL-AUDIT contents in your evidence file. You are NOT the formal verdict —
a DISTINCT reviewer independently reruns and gives PASS/FAIL afterward. You do NOT fix, integrate,
edit ledgers, or transcribe FINAL-AUDIT.

## Literal dispatch parameters

- **Package / revision:** P21 / revision **02**
- **BASE == HEAD:** record `git rev-parse HEAD` at the moment you start — that value is your BASE
  (it will be the latest root control-plane commit, at or after `8a0631a`). The product/test tip is
  `5576175`. The delta from the product tip to your BASE is ONLY root control-plane ledger commits
  plus the authorized HS-021 marker re-application (`specs/human-scratch.md` `:159`). Verify this
  yourself: `git diff --stat 5576175..HEAD` must touch only `specs/**` (ledgers + human-scratch.md
  marker), NO `src/**` and NO `tests/**`. If any `src/**` or `tests/**` file differs in that range,
  STOP and report to root.
- **Your ONLY persistent write:**
  `specs/007-human-scratch-completion/evidence/P21/implementation-02.md`
- **Commit nothing.** HEAD must still equal your recorded BASE when you hand back. You may create
  disposable browser/test/session state but must clean it up.
- **Authority for the audit contract:**
  `specs/007-human-scratch-completion/tasks/P21-final-audit.md` (the 12-part audit checklist, lines
  29-60) and `FINAL-AUDIT.md`. Complete EVERY checklist item with exact commands, timestamps,
  status, durations, counts/seeds, reproduction and sanitized outputs.

## What changed since rev 01 (so you can be efficient but complete)

Rev 01 FAILED on ONE thing only: a NEW E2E test-timing flake at `tests/e2e/identity.spec.ts:282`
(the `validate BIP39 words with visual feedback` step). All other 11 audit dimensions were GREEN in
rev 01 (`evidence/P21/implementation-01.md`). The fix (P20B rev 02, commit `5576175`, test-only, +4
lines) added auto-retrying `toHaveClass(/border-green-500/)` / `toHaveClass(/border-destructive/)`
waits before reading the validity className. The product component `SeedPhraseInput.tsx` was NOT
changed.

You must still run a COMPLETE audit, but you may reference `evidence/P21/implementation-01.md` for
dimensions whose underlying artifacts are byte-identical — provided you FRESHLY re-derive the
identity/provenance facts (SHAs, counts, line/byte metadata) and FRESHLY re-run every automated
gate.

## Mandatory fresh re-runs (do not merely cite rev 01)

1. **Reconciliation/provenance (contract item 1):** all 21 package rows + 22 requirement rows
   `passed` in PROGRESS; `sha256sum specs/human-scratch.md` == rolling
   `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`; normalized scratch blocks
   byte-match SCOPE (21/0 — you may reuse `evidence/P21/norm_check.py`); frozen scratch identity SHA
   `b91ca932…`; linear single-parent history no merges over the whole goal range; no unclassified
   drift; the canary invariant holds.
2. **FS-001 (contract item 11):** `008/spec.md` SHA-256 `0d0e2a14…`, exactly 715 lines and 25,441
   bytes, no source mutation; `settlement.ts` blob `010f3c93…`; the full FS-001 A–H unit/property +
   E2E expectations present and passing; signed unit conservation; reject-never-clamp; sole
   per-currency settlement engine.
3. **Gate battery (contract item 4):** `pnpm format:check` (note: pre-existing `specs/**` ledger
   drift is out of scope — report it as such, do not fail on it), `pnpm lint`, `pnpm typecheck`,
   `pnpm build` (production), `pnpm test` (all unit/property/integration).
4. **E2E (contract item 5) — THE headline for rev 02:** `pnpm test:e2e --retries=0` for the FULL
   suite, repeated enough to expose flakes (≥3 full runs), PLUS a focused loop on `identity.spec.ts`
   (≥8 runs) proving the `:282` step no longer flakes. Report exact pass/fail per run.
5. **Security/secret inspection (item 6), performance (item 7), manual product journey (item 8),
   responsive/a11y (items 9-10), console/network (item 12):** re-verify. Where an artifact is
   byte-identical to rev 01 you may cite rev-01 evidence, but you must confirm the identity yourself
   and re-run any live check that could have regressed.

## Flake classification rule (critical)

The FAIL trigger is an **unexplained** flake (task line 71), not any flake. On ANY full-suite
failure, rerun that exact test in ISOLATION (≥15×, `--retries=0`). If it passes in isolation and
matches a tracked Q, classify it as the tracked environmental flake and continue — do NOT fail the
audit on it, and do NOT add a retry/sleep to mask it. Tracked environmental flakes:

- `import.spec.ts:1527` — Q-P20B-14 (20/20 in isolation)
- `import.spec.ts:301` — Q-P20B-13 (vault-session bootstrap race, ~1/489)
- `duplicates.test.ts` timing — Q-P20A-05 Only a NEW unexplained flake, or one that reproduces
  deterministically in isolation, is a FAIL — and `identity.spec.ts:282` reproducing again would be
  a FAIL (the fix must hold).

## Q proposals (contract item 12)

Confirm the full carry-forward Q set is surfaced (not silently dropped): Q-P20B-00 (`pruneBuckets`
CRDT data loss), Q-P20B-14, Q-P20B-13, Q-P20A-05, Q-P17D-02 (dead `description-rule-state.ts`),
Q-P20A-02 (stale XChaCha20 comments), Q-P20B-06/08 (rule-vs-reality).

## Secret-safety (blocking)

No vault master key, seed phrase, recovery material, crypto secret, SUPABASE_JWT_SECRET, or vault
plaintext in logs/URLs/fixtures/evidence. Synthetic/public vectors only (`abandon…`). Any
real-material leak is blocking — report to root immediately.

## Output

Write the complete proposed FINAL-AUDIT results to
`specs/007-human-scratch-completion/evidence/P21/implementation-02.md` with a TOP-LINE
PASS-candidate / FAIL-candidate verdict and per-dimension evidence. Do NOT transcribe
FINAL-AUDIT.md. Commit nothing. Hand back to root with: your top-line candidate verdict, the exact
E2E run tallies (full + focused), the gate results, the reconciliation + FS-001 SHA/line/byte facts
you re-derived, any flakes hit and how you classified them, and confirmation HEAD is still
`daf80ff`.

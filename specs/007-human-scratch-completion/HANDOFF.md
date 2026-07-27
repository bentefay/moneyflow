# HANDOFF — P20B revision 04 DIAGNOSIS+FIX dispatch (two new E2E flakes) — to `p20b-implementer-04`

**To:** `p20b-implementer-04` — a fresh-context developer continuing the `human_scratch` package
**P20B** ("Full-codebase style-guide/code-quality sweep"), revision **04**. **From:** root
coordinator. You DIAGNOSE, then fix-or-diagnose-only per a decision tree. You may commit
**test-only** fixes. You do NOT edit ledgers
(`PROGRESS.md`/`QUESTIONS.md`/`HANDOFF.md`/`DECISIONS.md`), markers (`specs/human-scratch.md`), or
review files — those are root-only. You do NOT run the final audit. You do NOT change `src/**`
product code — if you conclude a change to product/sync code is required, STOP and report to root;
do not make it.

## Why this revision exists

Rev 03 fixed the chartered `transactions.spec.ts:696` flake (validated 8/8 full-suite runs). But
during that 8-run validation, TWO NEW untracked flakes surfaced, each in 1 of 8 full-suite
`--retries=0` runs. Neither is in the accepted-environmental set, so each is currently an
"unexplained flake" that WOULD FAIL the next P21 final audit. Your job is to make the full E2E suite
either clean or fully-explained for these two:

- **`tests/e2e/passkey.spec.ts:387`** (tracked **Q-P20B-16**) — a click on the unlock-button (around
  `:401`) timed out at ~30s, amid tRPC auth / "Failed to fetch" console errors. This is NOT
  obviously an undersized-visibility-wait: a 30s action timeout amid backend fetch failures points
  more toward sync/auth-backend availability under 4-worker load than a too-short assertion.
  Diagnose before assuming.
- **`tests/e2e/import.spec.ts:1573`** (tracked **Q-P20B-17**) —
  `getByText(/4 rows/i).toBeVisible({ timeout: 5000 })` not found after a 2nd CSV upload's
  import-preview render. It ALREADY has an explicit 5s wait, so it is not a bare-default-timeout of
  the exact rev-03 class, though 5s may still be undersized for the preview re-render under load, OR
  there may be a 2nd-upload state race.

## Your task — DIAGNOSE FIRST, then classify each flake into A / B / C

For EACH of the two flakes:

1. **Reproduce and characterize.** Run the specific test in isolation many times
   (`pnpm exec playwright test <file>:<line> --repeat-each=15 --retries=0 --reporter=list`), AND
   observe it under a few FULL-suite `--retries=0` runs. Capture the EXACT failure: what selector/
   action timed out, what console/network errors accompanied it, whether it is deterministic-slow vs
   truly intermittent. (Redact any secret material from quoted logs — see secret-safety below.)

2. **Classify into exactly one:**
    - **(A) Fixable undersized test-timing / eager assertion** — the awaited outcome is
      deterministic (it always eventually succeeds) but the wait is sized too short for the
      re-render under parallel load, same class as `transactions:696`/`identity:282`. → **HARDEN it,
      test-only**: size the wait to the operation (explicit `{ timeout: … }` mirroring nearby
      siblings) and/or await a deterministic settle signal before the assertion. NO `--retries`, NO
      `waitForTimeout` sleeps, NO try/catch swallowing.
    - **(B) Environmental / infra** — passes reliably in isolation (isolation-green) and the cause
      is external to the product (e.g. sync/auth backend contention or a "Failed to fetch" under
      4-worker load), not a product bug and not a fixable test wait. → **do NOT change code**; write
      a clear diagnosis + isolation evidence + the mechanism, and recommend root classify it as an
      accepted environmental flake (like `import:301`/`:1527`, `duplicates`). Root makes the final
      classify call.
    - **(C) Real product/sync defect** — the flake reflects a genuine race or bug in `src/**` or the
      sync/auth path. → **do NOT mask it with a test change and do NOT fix `src/**` yourself\*\*;
      write the diagnosis (repro, mechanism, suspected code path) and STOP — report to root for
      escalation/ routing.

    State your classification and the evidence for it explicitly per flake. When genuinely uncertain
    between A and B, prefer diagnosing (B/C path with evidence) over a speculative mask — a wrong
    "harden" that hides a real defect is worse than an honest "needs classification".

3. **Do NOT touch** `transactions.spec.ts` (rev-03 fix — leave it), `identity.spec.ts:282` (rev-02
   fix — leave it), or any `src/**`.

## Validation — the crux (isolation alone is NOT sufficient)

These are load-dependent. For anything you HARDEN (class A), you must show it holds under load:

- Run the **FULL suite, retries disabled, MANY times** (≥8):
  `pnpm exec playwright test --retries=0 --reporter=list`. Report exact per-run pass/fail for ALL
  of: `passkey.spec.ts:387`, `import.spec.ts:1573`, `transactions.spec.ts:523` (rev-03, must stay
  green), and `identity.spec.ts:282` (rev-02, must stay green). Your class-A fixes hold only if
  their tests pass across all your full-suite runs with no regression elsewhere.
- If, across your ≥8 full runs, OTHER new flakes appear, list them with per-run tallies — do not
  silently drop them; do not scope-creep into fixing them without saying so.
- Never run Playwright with `--debug`, `--ui`, `--headed`, or `show` (opens a GUI, can block).

## Gates + constraints (CLAUDE.md + repo hard rules)

- Before handback run and report: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
  (unit) — all green — plus the full-suite E2E runs above. Fix any issue you surface even if
  pre-existing.
- **No `as` / `any` / `!`** in product code (repo-wide). Test-fixture casts tolerated per precedent;
  keep any change minimal and cast-free.
- Favour functional/immutable; match the conventions of the file you edit.
- **No parentheses in commit messages.** Commit any test-only change with a clear message. If you
  make NO code change (both classified B/C), commit nothing and just write evidence + report.

## Provenance / BASE (SHA-stable)

- Record `git rev-parse HEAD` at start — it should be `1bd1f07` or a later **root-ledger-only**
  commit (root may advance HEAD with ledger commits under `specs/**`; that is fine and separate).
  The current product/test tip is `63787ec`.
- Any commit(s) you make must touch **ONLY
  `tests/e2e/**`** (no `src/**`, no `specs/**`). After committing, verify `git diff --stat
  5576175..HEAD -- . ':(exclude)specs'`shows only`tests/e2e/\*\*` changes.
- Write your evidence to `specs/007-human-scratch-completion/evidence/P20B/implementation-06.md`
  (the ONE `specs/**` file you author). Include: per-flake repro method + raw-but-redacted failure
  signature, your A/B/C classification + justification, the diff summary for anything hardened, your
  per-run FULL-suite tallies for the four tests above, the unit-gate results, and any other flakes
  observed.

## Secret-safety (blocking)

No vault master key, seed phrase, recovery material, crypto_box secret, SUPABASE_JWT_SECRET,
vault-derived presence key, invite-fragment bearer secret, or vault plaintext in code, logs, URLs,
fixtures, or evidence. `passkey.spec.ts` exercises WebAuthn/recovery flows — be especially careful
that any failure logs you quote in evidence contain NO real credential/recovery material; redact.
Synthetic/public vectors only (BIP39 `abandon…` is fine). Any real-material leak is blocking — stop
and report to root immediately.

## Handback

Report to root: the commit SHA(s) if any (or "no code change"); your A/B/C classification for
`passkey:387` and `import:1573` with the evidence; your full-suite per-run tallies for `passkey:387`
/ `import:1573` / `transactions:523` / `identity:282`; the unit-gate results; and any other flakes
observed. Root will verify-not-trust, decide classification/escalation for B/C items, then dispatch
a DISTINCT reviewer over the cumulative P20B hardening.

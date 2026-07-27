# HANDOFF — P20B revision 05 FINALIZE dispatch (passkey:387 test-timing fix) — to `p20b-implementer-05`

**To:** `p20b-implementer-05` — a fresh-context developer finalizing one test-only fix for the
`human_scratch` package **P20B** ("Full-codebase style-guide/code-quality sweep"), revision **05**.
**From:** root coordinator. You edit ONE test file and author ONE evidence file, then commit. You do
NOT edit ledgers (`PROGRESS.md`/`QUESTIONS.md`/`HANDOFF.md`/`DECISIONS.md`), markers
(`specs/human-scratch.md`), or review files — those are root-only. You do NOT touch any `src/**`
product code. You do NOT run the final audit.

## Starting state — the fix already exists in the working tree

`git status` shows an UNCOMMITTED change to `tests/e2e/passkey.spec.ts` (about 7 insertions / 2
deletions). This is the fix from a prior aborted revision and it is SUBSTANTIVELY CORRECT — keep its
mechanics, do not rewrite the approach. In the
`test.step("that phrase unlocks the identity the passkey created")` around line 397-408, the unlock
input was changed from `await page.getByTestId("recovery-phrase-credential").fill(words.join(" "))`
to `await enterSeedPhrase(page, words, true)` (entering the phrase through the per-word grid, which
waits for the "Valid recovery phrase" indicator before proceeding), plus the corresponding
`enterSeedPhrase` import. That is the fix. Leave the mechanics as-is.

Also note: `tests/e2e/transactions.spec.ts` and `identity.spec.ts` already contain committed fixes
from earlier revisions — do NOT touch them. `next-env.d.ts` is an unrelated generated stray — ignore
it. `specs/007-human-scratch-completion/evidence/P08/implementation-01.md` is an untracked stray —
leave it.

## Why this revision exists

`passkey.spec.ts:387` ("passkey-only creation shows the recovery phrase and it unlocks the same
identity") flaked ~1 in 8 full-suite `--retries=0` runs under parallel load: the unlock step failed
after a fresh `sessionStorage.clear()` → `goto("/unlock")` → immediate `.fill()` on the single
off-screen `recovery-phrase-credential` credential field. Tracked as **Q-P20B-16**.

**This is a class-A load-dependent test-timing flake, NOT a product defect.** The evidence: the
IDENTICAL `page.getByTestId("recovery-phrase-credential").fill(seedWords.join(" "))` pattern is used
at `passkey.spec.ts:72`, `:171`, `:232` and passes reliably; the field accepts space-separated
phrases correctly in general; and a deterministic product space-handling bug would fail 100% of the
time, not ~1/8. So the failure is a load-dependent timing/hydration race in THIS test's interaction
with the freshly-navigated `/unlock` page, not a defect in `RecoveryPhraseCredentialFields` or the
unlock logic. Entering via the validated per-word grid (`enterSeedPhrase(..., expectValid=true)`)
adds a deterministic "Valid recovery phrase" settle before the unlock click, exactly as the other
unlock tests already do, and the single-field autofill path remains covered at `:72/:171/:232` and
in `identity.spec.ts` / `onboarding-vault.spec.ts`.

## Your tasks

1. **Correct the code comment.** The current uncommitted comment over-claims the mechanism — it
   asserts the field "strips spaces from a programmatic `.fill()` under parallel load, collapsing
   all 12 words into one unrecognised token." Root REJECTS that causal claim (it is unproven and
   inconsistent with the passing identical siblings). Replace the comment with an HONEST one of this
   substance, without over-claiming an unproven root cause:
    - the single-field `.fill()` here flaked only ~1/8 under full-parallel load while the identical
      `.fill()` at `:72/:171/:232` passes reliably, so this is a load-dependent test-timing flake,
      not a product defect;
    - entering the phrase through the validated per-word grid (`enterSeedPhrase(..., true)`) waits
      for the "Valid recovery phrase" indicator, giving a deterministic settle before the unlock
      click, consistent with the other unlock tests;
    - the single-field credential path stays covered at `:72/:171/:232` (and identity/onboarding
      specs). Reference Q-P20B-16. Do NOT claim "space stripping" unless you actually PROVE it (see
      item 2). Keep the comment concise.

2. **(Optional) If you want to state a more specific mechanism, PROVE it first — but only in a
   throwaway.** If you choose to investigate the exact DOM/timing cause, do it in a scratch file
   OUTSIDE `tests/e2e/` (e.g. `/tmp/…`) and DELETE it before validating. It is FORBIDDEN to add any
   diagnostic / `DIAG` / exploratory `test(...)` to `passkey.spec.ts` or any committed file, and
   FORBIDDEN to leave scaffolding behind. The prior revision was aborted for exactly this. If you do
   not prove a specific mechanism, keep the honest comment from item 1 and move on — that is fine.

3. **Verify the committed file is clean:** `passkey.spec.ts` must declare exactly its original test
   count (12 `test(...)` blocks — no added tests), contain no `DIAG`/`console.log`/`keyboard.type`
   diagnostic residue, and differ from BASE only by the `enterSeedPhrase` swap + import + your
   honest comment.

## Validation — run it FOREGROUND, one run per call (do NOT background+monitor)

The prior revision failed because it ran the 8-run loop in the background and its turn ended before
the loop finished. DO NOT do that. Instead run the full suite **one run at a time as a foreground
blocking command**, each call ~4 minutes (well under the tool timeout), and inspect the result
before starting the next. Do NOT modify ANY spec file between or during these runs — the file must
be byte-stable across all 8 runs, or the validation is void.

- For each run i = 1..8: `pnpm exec playwright test --retries=0 --reporter=list` (redirect to a
  distinct log if you like, e.g. `/tmp/rev05_run_${i}.log`), wait for it to finish, then record the
  pass/fail of: `passkey.spec.ts:387`, `transactions.spec.ts:523`, `identity.spec.ts:282`, and the
  import template test reported as `import.spec.ts:1527` (this last is the accepted-environmental
  flake Q-P20B-14 — if IT flakes, note it but it does NOT count against you; rerun it in isolation
  to confirm it still passes 20/20-style).
- Your fix holds only if `passkey.spec.ts:387` passes across ALL 8 full-suite runs with no
  regression in `transactions:523` / `identity:282`.
- If any OTHER new flake appears, list it with tallies — do not silently drop it, do not scope-creep
  into fixing it without saying so.
- Never run Playwright with `--debug`, `--ui`, `--headed`, or `show` (opens a GUI, can block).

## Gates + constraints (CLAUDE.md + repo hard rules)

- Before handback run and report: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
  (unit) — all green — plus the 8 full-suite E2E runs above.
- **No `as` / `any` / `!`** in product code (repo-wide). Test-fixture casts tolerated per precedent;
  keep this minimal and cast-free.
- Favour functional/immutable; match the conventions of `passkey.spec.ts`.
- **No parentheses in commit messages.**

## Provenance / BASE (SHA-stable)

- Record `git rev-parse HEAD` at start — it should be `cd4d313` or a later **root-ledger-only**
  commit under `specs/**` (root may advance HEAD; that is fine and separate). The current
  product/test tip is `63787ec`.
- Your commit(s) must touch **ONLY `tests/e2e/passkey.spec.ts`** (no `src/**`, no other test, no
  `specs/**`). After committing, verify `git diff --stat 5576175..HEAD -- . ':(exclude)specs'` shows
  only `tests/e2e/transactions.spec.ts` (the earlier rev-03 fix, already committed) and
  `tests/e2e/passkey.spec.ts` (yours).
- Write your evidence to `specs/007-human-scratch-completion/evidence/P20B/implementation-06.md`
  (the ONE `specs/**` file you author). Include: the final diff summary, your honest mechanism
  statement, the confirmation that no DIAG scaffolding remains and the test count is unchanged, your
  per-run full-suite tallies for the four tests across all 8 runs, the unit-gate results, and any
  other flakes observed.

## Secret-safety (blocking)

`passkey.spec.ts` exercises WebAuthn/recovery flows. No vault master key, seed phrase, recovery
material, crypto_box secret, SUPABASE_JWT_SECRET, vault-derived presence key, invite-fragment bearer
secret, or vault plaintext in code, logs, URLs, fixtures, or evidence — redact any failure logs you
quote. Synthetic/public vectors only (BIP39 `abandon…` is fine). Any real-material leak is blocking
— stop and report to root immediately.

## Handback

Report to root: the commit SHA; the final honest comment text; confirmation the file is clean (12
tests, no scaffolding); your per-run full-suite tallies for `passkey:387` / `transactions:523` /
`identity:282` / `import:1527` across all 8 runs; the unit-gate results; any other flakes. Root will
verify-not-trust, then dispatch a DISTINCT reviewer over the cumulative P20B hardening
`5576175..HEAD`.

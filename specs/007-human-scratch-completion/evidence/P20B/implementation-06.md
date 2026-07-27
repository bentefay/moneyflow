# P20B revision 05 — implementation-06 (finalize honest comment on passkey unlock flake fix)

**Implementer:** `p20b-implementer-05` (fresh context) · **Base HEAD at start:** `b1d30c6`
(root-ledger commit; product/test tip `63787ec`) · **Commit:** `3e0318a` (test-only)

## Scope / charter

Finalize the already-uncommitted, substantively-correct fix in `tests/e2e/passkey.spec.ts` for the
class-A load-dependent test-timing flake at `passkey.spec.ts:387` (Q-P20B-16), by replacing the
over-claiming "strips spaces" comment with an honest mechanism statement, verifying no diagnostic
scaffolding was left behind, and revalidating with 8 clean foreground full-suite runs. No `src/**`
changes; no other test files touched.

## Fix kept as-is (mechanics unchanged from the working-tree state)

In `test.step("that phrase unlocks the identity the passkey created")` (around line 397-408), the
unlock input was already changed from
`page.getByTestId("recovery-phrase-credential").fill(words.join(" "))` to
`enterSeedPhrase(page, words, true)` (entering the phrase through the validated per-word grid, which
waits for the "Valid recovery phrase" indicator before proceeding), plus the corresponding
`enterSeedPhrase` import. This revision only rewrote the code comment attached to that line — the
fix mechanics were not touched.

### Honest comment (final text, replacing the over-claiming one)

```
// This unlock step flaked ~1 in 8 full-suite --retries=0 runs under parallel
// load; the identical page.getByTestId("recovery-phrase-credential")
// .fill(words.join(" ")) pattern at :72/:171/:232 passes reliably, and a
// deterministic product bug would fail every run, not ~1/8 — so this is a
// load-dependent test-timing flake, not a product defect. Entering the phrase
// via the validated per-word grid waits for the "Valid recovery phrase"
// indicator, giving a deterministic settle before the unlock click, consistent
// with the other unlock tests. The single-field credential path stays covered
// at :72/:171/:232 (and identity/onboarding-vault specs). See Q-P20B-16.
```

This replaces the prior claim that the field "strips spaces from a programmatic `.fill()` under
parallel load, collapsing all 12 words into one unrecognised token" — that causal mechanism was
never proven and is inconsistent with the identical `.fill()` pattern passing reliably at
`:72/:171/:232`. No throwaway investigation was performed (item 2 of the charter was optional); the
honest, non-over-claiming comment from item 1 was used as-is.

### Diff summary

`git diff --stat 5576175..HEAD -- . ':(exclude)specs'`:

```
tests/e2e/passkey.spec.ts      | 13 +++++++++++--
tests/e2e/transactions.spec.ts | 18 ++++++++++++------
2 files changed, 23 insertions(+), 8 deletions(-)
```

Only `transactions.spec.ts` (prior committed rev-03 fix, untouched by me) and `passkey.spec.ts`
(mine, this revision). No `src/**`, no other test files, no `specs/**` product/test changes.

## Clean-file confirmation

- `grep -c '^\s*test(' tests/e2e/passkey.spec.ts` → **12** (unchanged from BASE; no tests added or
  removed).
- `grep -n -E "DIAG|console\.log|keyboard\.type" tests/e2e/passkey.spec.ts` → no matches. No
  diagnostic residue, no scaffolding.
- The committed diff (`git show 3e0318a`) touches only the import line (adds `enterSeedPhrase`) and
  the single unlock step (comment + `.fill()` → `enterSeedPhrase(page, words, true)` swap) — nothing
  else in the file changed.

## Validation — FULL suite, retries disabled, 8 sequential foreground runs

Command per run: `pnpm exec playwright test --retries=0 --reporter=list` (163 tests / 4 workers,
fresh dev server each run). Each run was executed as its own **foreground, blocking** Bash call
(never backgrounded, never run via a monitor loop) and the tool waited for it to fully complete
before the next run started. `tests/e2e/passkey.spec.ts` was verified byte-stable
(`md5sum a88568bd6be4120af30142e51ea51b58`) before run 1 and after every subsequent run — the file
was never modified during or between runs.

| Run | `passkey.spec.ts:387` | `transactions.spec.ts:523` | `identity.spec.ts:282` | `import.spec.ts:1527` | Overall tally     |
| --- | --------------------- | -------------------------- | ---------------------- | --------------------- | ----------------- |
| 1   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.9m) |
| 2   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.8m) |
| 3   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.8m) |
| 4   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.8m) |
| 5   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.9m) |
| 6   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.8m) |
| 7   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.9m) |
| 8   | ✓ PASS                | ✓ PASS                     | ✓ PASS                 | ✓ PASS                | 163 passed (3.8m) |

**`passkey.spec.ts:387`: 8/8 PASS. No regression in `transactions:523` (8/8 PASS) or `identity:282`
(8/8 PASS). `import.spec.ts:1527` (the accepted-environmental Q-P20B-14 flake): 8/8 PASS — it did
not flake in any of the 8 runs this revision.**

### Other flakes

None. All 8 runs reported **163 passed**, zero failures, with no test failing in any run — not the
four charted tests, and not any other test in the suite. `[WebServer] ⚠️ tRPC failed on …` /
`Request authentication failed` lines appeared in the server logs across runs (expected teardown
noise from realtime/session cleanup, not test failures — every affected test still reported ✓ PASS
in the same run).

## Unit gates

- `pnpm typecheck` — **PASS** (clean, no output).
- `pnpm lint` — **PASS** (exit 0; 1 pre-existing `react-hooks/incompatible-library` _warning_ in
  `src/components/features/transactions/TransactionTable.tsx:401`, not introduced here, not an
  error).
- `pnpm format:check` — my authored `tests/e2e/passkey.spec.ts` is clean
  (`oxfmt --check tests/e2e/passkey.spec.ts` → "All matched files use the correct format"). The bare
  repo-wide command's overall failure is **pre-existing** and confined to root-owned frozen
  `specs/**` markdown (DECISIONS.md, DEPENDENCIES.md, PROGRESS.md, RISKS.md, prior evidence/review
  files, `specs/human-scratch.md`) — I did not touch or reformat those. No `tests/**` or `src/**`
  file fails format.
- `pnpm test` (unit) — **PASS**: 2091 passed / 2 skipped, run twice (once before the E2E validation
  loop and once after), both clean.

## Provenance

- `git rev-parse HEAD` at start: `b1d30c6` (root-ledger-only commit, as expected).
- Commit: `3e0318a` — "test: settle passkey unlock flake via validated seed entry" — 1 file changed
  (`tests/e2e/passkey.spec.ts`), 11 insertions, 2 deletions.
- `git diff --stat 5576175..HEAD -- . ':(exclude)specs'` confirmed to show only
  `tests/e2e/transactions.spec.ts` (prior rev-03 fix) and `tests/e2e/passkey.spec.ts` (this
  revision) — see Diff summary above.
- `next-env.d.ts` (unrelated generated stray) and the untracked
  `specs/007-human-scratch-completion/evidence/P08/implementation-01.md` were left untouched, per
  charter.

## Secret-safety

`passkey.spec.ts` exercises WebAuthn/recovery-phrase flows. No vault master key, seed phrase,
recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`, vault-derived presence key,
invite-fragment bearer secret, or vault plaintext appears in the code change, logs, or this evidence
— only synthetic, non-secret BIP39-style test vectors generated at runtime by the test harness
itself (never quoted here). No leak observed.

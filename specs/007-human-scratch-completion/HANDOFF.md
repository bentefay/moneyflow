# HANDOFF — P20B revision 03 IMPLEMENTER dispatch (harden flaky E2E waits) — to `p20b-implementer-03`

**To:** `p20b-implementer-03` — a fresh-context developer implementing the `human_scratch` package
**P20B** ("Full-codebase style-guide/code-quality sweep"), revision **03**. **From:** root
coordinator. You implement and commit a **test-only** fix. You do NOT edit ledgers
(`PROGRESS.md`/`QUESTIONS.md`/`HANDOFF.md`/`DECISIONS.md`), markers (`specs/human-scratch.md`), or
review files — those are root-only. You do NOT run the final audit.

## Why this revision exists

The P21 rev 02 final audit FAILED (independent reviewer `reviews/P21-review-02.md`). The chartered
`identity.spec.ts:282` fix from rev 02 HELD (0/5 full runs, 10/10 isolation — do NOT touch it), but
a NEW blocking flake of the **same class** surfaced:

- **`tests/e2e/transactions.spec.ts:696`** — in the step "filter the large list and restore its
  edited row", after clicking "Clear search" the test asserts
  `await expect(page.getByText("500 transactions", { exact: true })).toBeVisible();` on the **bare
  default 5s timeout**. Under full-suite parallel load (163 tests / 4 workers) the virtualized
  500-row list did not re-expand its count within 5s → failed 1 of 5 full retries-disabled runs
  (10/10 in isolation). Tracked as **Q-P20B-15**.

The mechanism is specific and the fix is principled: the structurally identical "500 transactions"
assertion at **`transactions.spec.ts:578`** already uses `{ timeout: 15_000 }`, and the CSV-row
assertion at `:563` uses `10_000`. Only the post-"Clear search" restore at `:696` was left on the
bare 5s default. The count restoration IS deterministic — it always eventually succeeds; the wait
was simply undersized for the virtualized re-expansion under load.

## Your task

1. **Fix `transactions.spec.ts:696`** so the "500 transactions" count-restore assertion is robust to
   the virtualized re-render under parallel load. Size the wait to the operation — mirror the
   sibling `:578` (an explicit `{ timeout: 15_000 }`), and/or first await a deterministic settle
   signal (e.g. the transaction row/count settling) before the count assertion. This is NOT a blind
   retry/mask: the outcome is deterministic (the count always restores); you are correctly sizing a
   wait for a known slow re-render, exactly as `:578` already does for the initial 500-count render.
   Do NOT add Playwright `--retries`, `waitForTimeout` sleeps, or try/catch swallowing.
2. **Sweep the E2E suite for the same class of defect** (this is HS-021's "code-quality sweep"
   charter): grep `tests/e2e/**` for bare `getByText(...).toBeVisible()` / `toBeVisible()`
   assertions that immediately follow an async re-render (filter clear, navigation, import,
   virtualized scroll) and lack an explicit timeout where the operation is known-slow. Harden the
   ones that match THIS class. Be conservative — do NOT churn stable passing assertions with no
   evidence of fragility; prefer the ones near virtualized-list / count-restore / post-navigation
   re-renders. If you find none beyond `:696`, say so explicitly in evidence.
3. **Do NOT touch `identity.spec.ts:282`** (its rev-02 fix held) and do NOT change any `src/**`
   product code — the product is correct; this is a test-timing defect only.

## Validation — this is the crux (isolation is USELESS here)

The flake is **load-dependent**: it passes 10/10 in isolation and only fails under full-suite
parallel load. Therefore:

- Validate with the **FULL suite, retries disabled**, run **MANY times** (≥8, more if you can):
  `pnpm exec playwright test --retries=0 --reporter=list`. Report exact per-run pass/fail for
  `transactions.spec.ts:523` (the whole virtualized test) AND `identity.spec.ts:282` (must stay
  green — no regression). Your fix holds only if `transactions:696` passes across all your
  full-suite runs.
- Isolation runs are fine as a supplement but are NOT sufficient evidence — do not rely on them.
- Never run Playwright with `--debug`, `--ui`, `--headed`, or `show` (opens a GUI, can block).

## Gates + constraints (CLAUDE.md + repo hard rules)

- Before handback run and report: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`
  (unit) — all green — plus the full-suite E2E runs above. Fix any issue you surface even if
  pre-existing.
- **No `as` / `any` / `!`** in product code (repo-wide). Test-fixture casts are tolerated per
  precedent, but keep this change minimal and cast-free if possible.
- Favour functional/immutable style; match the conventions of `transactions.spec.ts`.
- **No parentheses in commit messages.** Commit your test-only change with a clear message.

## Provenance / BASE (SHA-stable)

- Record `git rev-parse HEAD` at start — it should be `7e9cdb5` or a later **root-ledger-only**
  commit (root may advance HEAD with ledger commits; that is fine). The current product/test tip is
  `5576175`.
- Your commit(s) must touch **ONLY
  `tests/e2e/**`** (no `src/**`, no `specs/**`). After committing, verify `git diff --stat
  5576175..HEAD`shows only`tests/e2e/**`product/test changes (root ledger under`specs/**` is
  expected and separate).
- Write your evidence to `specs/007-human-scratch-completion/evidence/P20B/implementation-05.md`
  (this is the ONE `specs/**` file you author). Include: the diff summary, your per-run full-suite
  E2E tallies for `transactions:523` and `identity:282`, the sweep results (what else you hardened
  or why nothing), and the unit-gate results.

## Secret-safety (blocking)

No vault key / seed phrase / recovery material / crypto_box secret / SUPABASE_JWT_SECRET /
vault-derived presence key / vault plaintext in code, logs, URLs, fixtures, or evidence. Synthetic /
public vectors only (the BIP39 `abandon…` test vectors are fine). Any real-material leak is blocking
— stop and report to root immediately.

## Handback

Commit your test-only change + write `implementation-05.md`, then return to root: state the commit
SHA(s), your full-suite E2E run tallies for `transactions:523` and `identity:282`, the unit-gate
results, and the sweep outcome. Root will verify-not-trust, then dispatch a DISTINCT reviewer.

# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P19 / 02 (remediation of review-01 FAIL)
- **Scope IDs:** HS-020 only. Marker authorized only after independent PASS.
- **State:** implementing; remediation dispatched.
- **Binding task:** `tasks/HS-020-passkey-prf.md`
- **Prior review (binding):** `reviews/P19-review-01.md` — VERDICT FAIL, 2 blocking (B-1, B-2),
  5 non-blocking. Sections 2-5 (crypto, server, secret-safety, not-blocked-external) all re-passed and
  MUST be preserved unchanged. Remediation is confined to the two client journeys.
- **Build BASE:** current product HEAD `77038d1bb4ece9053d2c1d89f72ba7c00ac68aee` (build revision 02
  on top of it — do NOT revert the sound crypto/server/migration work).
- **Cumulative re-review range:** original BASE `e72befd9ba1b2cbbf5c189b7d855e47cc752240e` -> your new
  HEAD.
- **Sole implementer artifact:** `evidence/P19/implementation-02.md`
- **Future immutable review artifact:** `reviews/P19-review-02.md`

## What to fix (ONLY these two blockers)

- **B-1 — failed/cancelled passkey creation strands the vault.** In
  `src/app/(onboarding)/new-user/page.tsx` the passkey-only flow calls `registerIdentity()` (server
  registration + session install + vault creation) BEFORE the passkey ceremony that can fail, with an
  empty catch, so a cancel/timeout leaves an orphaned identity with no passkey, no error surfaced, the
  busy control stuck, and a recovery phrase that was never shown and is unrevealable anywhere. Fix:
  (1) reorder so NO server identity/session/vault is committed before the passkey ceremony succeeds
  (or make it atomically rolled back on failure); (2) on failure/cancellation release the busy state
  and surface a clear error; (3) guarantee the recovery phrase is shown at creation or genuinely
  revealable afterward (see the mnemonic note below); (4) tighten the cancellation E2E
  (`tests/e2e/passkey.spec.ts` "leaves the user on a usable page with no partial state") to ASSERT no
  partial sessionStorage and no server rows.
- **B-2 — last-credential revocation loses a passkey-only vault.** In
  `src/components/features/identity/PasskeyManager.tsx`, revoking the sole credential deletes the only
  `wrapped_secret`; it is gated behind only changed prompt text. Fix: block last-credential revocation
  for a passkey-only vault outright, or gate it behind explicit recovery-phrase confirmation, matching
  the evidence recovery model §3 ("blocked outright if no recovery phrase exists"). Add counterfactual
  unit/E2E coverage proving the last credential cannot be silently destroyed.

## Recoverability design note (mnemonic irreversibility)

- A BIP39 mnemonic derives the seed one-way; you cannot reconstruct the 12 words from the stored
  64-byte master seed. So a "reveal phrase later" surface is only real if the flow retains the phrase
  by a secure means. Prefer showing/confirming the phrase during passkey-only creation (Q-026 option
  a) unless you can retain it without weakening secret-safety. NEVER persist the mnemonic or entropy in
  plaintext, logs, URLs, analytics, fixtures or evidence. If you add a reveal surface, it may reuse the
  authorized `src/app/(app)/settings/page.tsx` mount. Q-026 records the product-values call for the
  human; your job is to close every route to silent permanent loss.

## Allowed changes (exact)

- `src/app/(onboarding)/new-user/page.tsx` — reorder creation, error/busy handling, phrase display.
- `src/components/features/identity/PasskeyManager.tsx` — last-credential revocation guard.
- `src/hooks/use-passkey.ts` — only if needed for busy-state release / error propagation.
- `src/app/(app)/settings/page.tsx` and new/existing `src/components/features/identity/**` components
  (plus its `index.ts`) — ONLY if you add a recovery-phrase reveal/confirmation surface for B-1.
- Tests: `tests/e2e/passkey.spec.ts`, `tests/unit/**` and `tests/integration/**` for the two fixes.

## Preserve unchanged (do NOT touch)

- All crypto: `src/lib/crypto/passkeyWrap.ts`, `passkeyCeremony.ts`, `index.ts`, and the READ-ONLY
  derivation core (`seed.ts`, `keypair.ts`, `identity.ts`, entropy, wordlist).
- Server: `src/server/routers/passkey.ts`, `src/server/schemas/passkey.ts`, `_app.ts` wiring.
- `supabase/migrations/010_passkey_credentials.sql` and all existing migrations; the generated
  `src/lib/supabase/database.types.ts`; `src/types/webauthn-prf.d.ts`.
- The master-secret wrap invariant is untouchable: PRF output is only a KEK over the SAME existing
  64-byte master seed; recovery phrase and every passkey unlock the identical Ed25519/X25519 identity;
  never mint/re-derive an identity from a passkey; never reduce entropy; never hand-roll crypto.

## Forbidden writes

- Ledgers (`PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `HANDOFF.md`), scratch `specs/human-scratch.md`,
  `SCOPE.json`, canonical FS-001, `tasks/**`, any review file, `.claude/**`, `.codex/**`. Root alone
  writes those. Never `git add .`/`git add -A`; stage only exact authorized paths.

## Secret-safety (blocking)

- No master secret, PRF output, plaintext wrapped-secret bytes, mnemonic or entropy in logs, URLs,
  query strings, analytics, plaintext persistence, test fixtures or ANY evidence/review artifact.
  Zeroize secrets. Public vectors only in tests. Any real-material leak is a blocking finding reported
  to root immediately.

## Formatting hazard (Q-024)

- Do NOT run bare `pnpm format` from the repo root — it rewrites the frozen `specs/human-scratch.md`
  and root ledgers. Format only your exact changed `src/`/`tests/` paths (e.g.
  `pnpm exec oxfmt src/... tests/...`) and run `git status` before every commit; `git checkout` any
  `specs/**` change. `pnpm format:check` failing on `specs/**` is pre-existing and not yours to fix.

## Method & gates

- Architecture/notes first in `evidence/P19/implementation-02.md` (leave it uncommitted), then RED
  tests that fail against the current `77038d1` behavior, then GREEN. Run the full gate
  `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` (note the
  pre-existing `specs/**` format failure is not attributable) and the passkey E2E with retries
  disabled and repeated. Never use `--headed/--ui/--debug/show`.

## Q-proposals

- Place any `Q-*` proposal in `evidence/P19/implementation-02.md` and continue with the safest
  reversible data-preserving choice. Root alone transcribes `QUESTIONS.md`.

## Hand back

- When GREEN with all gates passing, summarize final HEAD, exact changed paths, test counts, how B-1
  and B-2 are closed (with reproduction of the fixed behavior), and confirm no secret leak and no
  change to the preserved crypto/server/migration surface. Message root `ready_for_review`. Do not
  edit any ledger or mark the requirement.

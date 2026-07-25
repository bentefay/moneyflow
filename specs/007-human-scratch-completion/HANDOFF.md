# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P19 / 01
- **Scope IDs:** HS-020 only. P19 authorizes the HS-020 marker after independent PASS; no other
  requirement is in scope. FS-001 and every P05-gated package (P08/P10/P16E and descendants) stay
  untouched.
- **State:** implementing; implementer dispatched from clean HEAD `e72befd`
- **Binding task:** `tasks/HS-020-passkey-prf.md`
- **Frozen source:** `specs/human-scratch.md:348-350`; exact text in `SCOPE.json#HS-020`:
  "Support using a passkey instead of, or in addition to, the recovery phrase, using the new PRF
  extension. Change the vault creation and login flows to support passkey as a second option using an
  ---- OR ---- style UI." Never edit the scratch source; root alone applies its marker after PASS.
- **Dependencies:** P04 security/RLS model, P06 user-storage cleanup and P18 recovery UX are all
  `passed`. P20A marketing later depends on this.
- **Literal cumulative review BASE / clean pre-product HEAD:**
  `e72befd9ba1b2cbbf5c189b7d855e47cc752240e`
- **Sole implementer artifact:** `evidence/P19/implementation-01.md`
- **Future immutable review artifact:** `reviews/P19-review-01.md`

## Architecture-first (mandatory before any product edit)

- Begin `evidence/P19/implementation-01.md` with a threat model, WebAuthn/PRF crypto protocol and a
  recovery/loss model, choosing secure standards from primary sources (W3C WebAuthn Level 3, the PRF
  extension, platform authenticator vendor docs). Only after that, write RED tests, then GREEN.
- **Load-bearing identity invariant:** the PRF output MUST be used only as a key-encryption key that
  wraps the SAME existing random master identity secret. The recovery phrase and every registered
  passkey unlock the identical Ed25519/X25519 identity. NEVER mint, substitute or derive a new vault
  identity from a passkey, and never reduce entropy or normalize/accept an invalid secret. Reuse the
  existing `src/lib/crypto` wrap/encryption primitives; do not hand-roll crypto.

## Allowed changes (exact)

- **One vetted WebAuthn library** may be added to `package.json` and the lockfile — recommended
  `@simplewebauthn/server` plus `@simplewebauthn/browser` — because server registration/authentication
  verification must not be a custom verifier. Add nothing else; if you choose a different vetted
  library, record a `Q-*` proposal with the primary-source rationale. Do not change any other
  dependency or engine pin.
- **One new Supabase migration** `supabase/migrations/010_passkey_credentials.sql` for credential
  metadata plus the encrypted wrapped secret, with RLS scoped by authenticated public-key hash exactly
  as `006_rls_hardening.sql`/`007_realtime_authorization.sql` do. Never edit an existing migration.
- **One new tRPC router** `src/server/routers/passkey.ts`, wired into `src/server/routers/_app.ts`.
  Use server-generated single-use challenges and verify origin, RP ID, credential ID, public key,
  signature counter and transports, with replay protection. Follow the crypto/tRPC/Zod rules.
- **New crypto helper(s)** under `src/lib/crypto/` (for example `passkeyWrap.ts`) that wrap/unwrap the
  master secret with the PRF-derived KEK, plus a barrel export line. The recovery-phrase derivation
  core (`seed.ts`, `keypair.ts`, `identity.ts` derivation, entropy and the wordlist) is READ-ONLY.
- **Onboarding + identity UI:** `src/app/(onboarding)/new-user/page.tsx`,
  `src/app/(onboarding)/unlock/page.tsx`, the creation branch of
  `src/app/(onboarding)/invite/[token]/page.tsx`, and new enumerated components under
  `src/components/features/identity/` (OR-style layout, passkey register/authenticate controls,
  capability detection, list/revoke, and a clear recovery fallback). The P18 recovery credential-form
  contract must keep working.
- **Tests:** new unit/property specs under `tests/unit/**`, integration specs under
  `tests/integration/**`, and `tests/e2e/identity.spec.ts`, `tests/e2e/onboarding-vault.spec.ts` plus
  one new enumerated passkey E2E spec under `tests/e2e/`.

## Read-only owners and forbidden writes

- Read-only: recovery-phrase seed/identity derivation, entropy and wordlist; existing migrations;
  `useIdentity` and other hooks consumed unchanged; P05 realtime authorization surfaces; existing
  server routers except the additive `_app.ts` wiring.
- Forbidden: substituting or re-deriving the vault identity from a passkey; reducing entropy; editing
  existing migrations, crypto derivation core, dependencies/engines beyond the one WebAuthn library;
  tasks/specs; scratch; canonical FS-001; SCOPE; ledgers; `.claude`; `.codex`; agent configuration and
  future review. Report a reproducible blocker before touching any other path.

## Secret-safety (blocking, ties to root halt condition)

- The master identity secret, PRF output, unwrapped/plaintext wrapped-secret bytes and any recovery
  phrase must NEVER appear in logs, URLs, query strings, analytics, plaintext persistence, test
  fixtures or ANY evidence/review artifact. Server storage holds only non-secret credential metadata
  and the ENCRYPTED wrapped secret. Zeroize secrets after use. Use only public WebAuthn/BIP39 test
  vectors in tests. Any leak of real recovery/identity material is a blocking finding reported to root
  immediately, not worked around.

## blocked_external handling (WebAuthn PRF automation, R-011)

- If the repository headless Chromium / CDP virtual authenticator genuinely cannot drive the PRF
  extension output, implement everything that does not require it: architecture, crypto protocol,
  server challenge/verification, migration, tRPC, wrap/unwrap and replay/tamper/revocation unit and
  property tests, capability detection, the OR UI and the recovery fallback, plus E2E for the
  non-PRF/virtual-authenticator registration and authentication paths that CDP does support. Document
  the exact automation limit as a `Q-*` proposal and a candidate `blocked_external` disposition for
  the real-PRF proof only. Never claim a simulated PRF success as real device evidence.

## Tests and manual charter

- Unit/property: wrap/unwrap yields the same identity; wrong-PRF/tamper/revoked/multiple-credential
  cases fail closed; server challenge single-use, replay, origin/RP/counter/credential checks.
- E2E (retries disabled, repeated): passkey-only creation, add-passkey to a recovery identity, unlock
  by passkey and by recovery, revoke, unsupported-PRF fallback, and same-vault identity continuity —
  to the extent the headless authenticator supports each; document what it cannot.
- Manual headless `playwright-cli` (never `--headed/--ui/--debug/show`): capability detection, both
  branches, cancellation, wrong/removed passkey, second credential, refresh/duplicate tab, sign
  out/in, keyboard/focus, responsive/dark/reduced-motion OR layout, and console/network/URL/storage
  inspection proving no secret artifact. Record real supporting-authenticator evidence where headless
  cannot drive PRF; store no secrets.

## Commit contract

- Create the sole evidence (architecture-first) before test/product edits. Check in exhaustive
  counterfactual RED tests against byte-identical production as exact-path RED commits, then stage and
  commit only exact authorized product/test/migration/dependency paths for GREEN with short
  no-parentheses messages. Leave `evidence/P19/implementation-01.md` uncommitted. Never use `git add .`
  or `git add -A`.

## Q-proposals

- Place any `Q-*` proposal in `evidence/P19/implementation-01.md` and continue with the safest
  reversible standards-first choice. Root alone transcribes `QUESTIONS.md`.

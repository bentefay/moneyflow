# HS-020 — WebAuthn PRF Passkeys

- **Status:** queued
- **Source:** `specs/human-scratch.md:348-350`; exact frozen text is in `SCOPE.json#HS-020`
- **Package:** P19
- **Depends on:** P04 security model, P06 user storage cleanup, P18 recovery UX

## Frozen requirement

> Support a PRF-extension passkey instead of or in addition to the recovery phrase, and present the
> two vault creation/login options with an “OR” UI.

## Current evidence to revalidate

- Current identity derives signing/encryption keys from the recovery phrase; no WebAuthn credential
  registration/challenge/verification or PRF-wrapped identity store exists.
- A generic user-data blob is explicitly being removed, so passkeys need dedicated credential and
  wrapped-secret schema. Browser/RP-ID/virtual-authenticator PRF support must be measured.

## Acceptance direction

- Threat-model before implementation. Use server-generated single-use challenges and verified
  WebAuthn registration/authentication with origin, RP ID, credential ID/public key, counter and
  transports validated.
- Use PRF output as a key-encryption key to wrap the same random master identity secret; recovery
  and every added passkey unlock the same Ed25519/X25519 identity. Never substitute a new vault
  identity.
- Support passkey-only creation where recoverability is clearly explained and adding multiple
  passkeys to an existing recovery identity; list/revoke/re-authenticate safely with no silent
  downgrade. Unsupported PRF gets a clear recovery fallback.
- Dedicated server storage contains only credential metadata and encrypted wrapped secret. Secrets
  are zeroized and absent from logs/URLs/evidence. The OR layout is semantic and accessible.

## Implementation and review checkpoints

- Write architecture/crypto protocol and recovery/loss model first using platform primitives and
  vetted libraries—no custom WebAuthn verifier or crypto. Reviewer performs adversarial protocol,
  migration, fallback and real-browser review.

## Automated tests

- Unit/property: wrap/unwrap same identity, wrong PRF/tamper/multiple credential/revocation; server
  challenge, replay, origin/RP/counter/credential permission integration tests.
- E2E via Chromium virtual authenticator/CDP only if it genuinely supports PRF; creation/unlock/add/
  revoke/fallback/multi-vault journeys, no-retry repeats. Document real-device PRF evidence.

## Exhaustive manual Playwright CLI charter

- Exercise capability detection, passkey and recovery branches, cancellation, wrong/removed passkey,
  add second credential, refresh/duplicate tab, sign out/in and same-vault identity continuity.
- Test keyboard, focus, responsive/dark/reduced-motion OR layout and errors. Inspect
  console/network/ URLs/storage metadata without capturing secrets. Use real supporting
  authenticator evidence where headless CLI cannot drive PRF; never claim simulated success as real.

## UX, style, and E2E review

Apply crypto/tRPC/component/E2E rules. UX must set honest loss/recovery expectations and never trap
a user behind unsupported PRF. Security protocol, meaningful tests and manual evidence are
mandatory.

## Risks and questions

- Highest risks: identity replacement, PRF availability, RP/origin mismatch, replay/counter
  handling, only-credential loss and downgrade. Return product preferences as Q proposals, but
  choose secure standards and truthful fallback without pausing.

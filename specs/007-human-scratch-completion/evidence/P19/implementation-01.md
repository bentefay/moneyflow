# P19 / revision 01 — HS-020 WebAuthn PRF passkeys

- **Package / revision:** P19 / 01
- **Requirement:** HS-020 (`tasks/HS-020-passkey-prf.md`)
- **Literal cumulative review BASE:** `e72befd9ba1b2cbbf5c189b7d855e47cc752240e`
- **Dispatch HEAD at start:** `9699fde` (root docs-only commit; `src/`, `tests/`, `supabase/`
  byte-identical to BASE)
- **Product/test HEAD:** `77038d1bb4ece9053d2c1d89f72ba7c00ac68aee`
- **Range empty?** No.

> **Secret-safety statement for this artifact.** No master identity secret, PRF output, plaintext
> wrapped-secret bytes, recovery phrase, or any real key material appears anywhere in this file. All
> byte strings quoted below are either public protocol constants, public BIP39 test vectors, or
> structural placeholders.

---

## 1. Architecture-first: threat model

### 1.1 Assets

| ID  | Asset                                   | Where it exists                                              | Compromise impact                                 |
| --- | --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| A1  | 128-bit BIP39 entropy / recovery phrase | User's head/password manager; browser memory during ceremony | Total, permanent vault compromise                 |
| A2  | 64-byte master seed                     | Browser memory only, transiently                             | Total vault compromise (A1-equivalent power)      |
| A3  | Ed25519 signing private key             | `sessionStorage` (pre-existing)                              | Server impersonation; vault membership operations |
| A4  | X25519 encryption private key           | `sessionStorage` (pre-existing)                              | Unwraps every vault key the identity can reach    |
| A5  | WebAuthn PRF output (32 bytes)          | Browser memory only, transiently                             | Unwraps A2 given the stored ciphertext            |
| A6  | Wrapped master secret (ciphertext)      | Server row `passkey_credentials.wrapped_secret`              | Offline attack target only; useless without A5    |
| A7  | Credential metadata (id, COSE pubkey)   | Server row                                                   | Enumeration/correlation only; not secret          |

A2 is the load-bearing object. **The PRF output (A5) is used only as a key-encryption key that wraps
A2.** No vault identity is ever minted, substituted, or derived from a passkey.

### 1.2 Adversaries and mitigations

| ID  | Adversary / capability                                             | Mitigation                                                                                                                                       |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | Malicious or breached server reads every row                       | `wrapped_secret` is XChaCha20-Poly1305 ciphertext under a KEK derived from A5, which never leaves the client. Server stores no plaintext.        |
| T2  | Server substitutes another user's `wrapped_secret`                 | AEAD authentication fails under the caller's KEK. Additionally the client re-derives `pubkeyHash` and compares to the server-asserted value.     |
| T3  | Network attacker replays a captured assertion                      | Server-generated single-use challenge, atomically consumed by a `SECURITY DEFINER` RPC; plus signature-counter monotonicity.                     |
| T4  | Phishing origin drives the ceremony                                | WebAuthn binds RP ID; server independently verifies `expectedOrigin` and `expectedRPID` on the assertion.                                        |
| T5  | Attacker with browser XSS                                          | Already game-over for A3/A4 in the pre-existing design. Passkeys do not widen this: PRF requires a fresh user-verified ceremony each time.       |
| T6  | Attacker with the unlocked device but not the user's biometric/PIN | PRF is bound to the user-verified `hmac-secret` PRF; UV is forced by the extension regardless of `userVerification` (see §2.3).                  |
| T7  | Attacker enumerates which identities have passkeys                 | `wrapped_secret` is released only after a fully verified assertion. Authentication options use discoverable credentials and never echo user IDs. |
| T8  | Malicious client sends the PRF output to the server by accident    | The client strips `clientExtensionResults.prf` before every transmission; `.toJSON()` is never used on a credential (see §2.5, the leak trap).   |
| T9  | Credential revoked on the server but still held by an attacker     | Revocation deletes the row including `wrapped_secret`; the ciphertext is gone, so the retained authenticator unlocks nothing.                    |
| T10 | Downgrade: user tricked into a non-PRF credential that "works"     | Registration hard-fails when `prf.enabled !== true`; no server row is created. There is no silent fallback to a weaker credential.               |

### 1.3 Explicit non-goals

- Passkeys do **not** replace the Ed25519 request-signing auth model. They are an unlock factor that
  recovers A2, after which the pre-existing signing path is used unchanged.
- No attestation is required or verified (`attestationType: "none"`). MoneyFlow has no enterprise
  authenticator allowlist, and requesting attestation is a privacy regression for consumer passkeys.

---

## 2. WebAuthn / PRF crypto protocol

### 2.1 Primary sources consulted (fetched 2026-07-25)

- W3C **Web Authentication: An API for accessing Public Key Credentials — Level 3**, CR Snapshot 26
  May 2026, §10.1.4 "Pseudo-random function extension (`prf`)" —
  <https://www.w3.org/TR/webauthn-3/#prf-extension>. Diffed against the Editor's Draft of 21 July
  2026 (<https://w3c.github.io/webauthn/#prf-extension>); §10.1.4 is byte-identical.
- W3C WebAuthn **PRF extension explainer** —
  <https://github.com/w3c/webauthn/blob/main/explainers/prf-extension.md>.
- Chrome Platform Status feature **5138422207348736** "WebAuthn PRF extension" (status: enabled by
  default) and the blink-dev Intent to Ship
  <https://groups.google.com/a/chromium.org/g/blink-dev/c/iTNOgLwD2bI>.
- Chrome DevTools Protocol **WebAuthn** domain —
  <https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/> — and the Chromium sources that
  define its behaviour: `third_party/blink/public/devtools_protocol/domains/WebAuthn.pdl`,
  `content/browser/devtools/protocol/webauthn_handler.cc`,
  `content/browser/webauth/virtual_authenticator.cc`, `device/fido/virtual_ctap2_device.cc`,
  `device/fido/prf_input.cc`.

Note: `https://developer.chrome.com/docs/identity/webauthn-prf`, named in the dispatch as a
candidate source, **returns HTTP 404 — that page does not exist.** The Chrome-team primary sources
substituted above are listed instead.

### 2.2 Normative facts the design depends on

1. **Output width.** "The PRFs provided by this extension map from `BufferSource`s of any length to
   **32-byte** `BufferSource`s." A 32-byte uniformly random value is exactly a symmetric key.
2. **Client-side salt hashing.** The client, not the RP, computes
   `salt1 = SHA-256(UTF8Encode("WebAuthn PRF") || 0x00 || eval.first)`. The RP therefore passes
   **raw** salt bytes in `eval.first` and must not pre-apply the prefix.
3. **Per-credential PRF.** The PRF is "associated with the current credential" for the credential's
   lifetime, and per the explainer "the PRFs are always per-credential and cannot be used to
   correlate anything between different credentials." A single fixed salt therefore still yields
   independent KEKs across credentials.
4. **`enabled` is registration-only.** "`enabled` … `true` if, and only if, the PRF is available for
   use with the created credential. This is only reported during registration and is not present in
   the case of authentication."
5. **Create-time results are not guaranteed.** "Not all authenticators support evaluating the PRFs
   during credential creation so outputs may, or may not, be provided. If not, then an assertion is
   needed in order to obtain the outputs." The design therefore **never** depends on create-time
   `results`.
6. **PRF forces user verification.** When implemented over CTAP2 `hmac-secret`, "that PRF MUST be
   the one used for when user verification is performed. This overrides the
   `UserVerificationRequirement` if necessary." Every PRF ceremony is a UV ceremony.
7. **Outputs are client-only.** "Authenticator extension outputs MUST NOT contain cleartext PRF
   outputs", precisely so that "PRF outputs should remain private to the client side, such as using
   PRF outputs to derive encryption keys."
8. **Discoverable credentials are not required by the extension.** §10.1.4 never mentions
   `residentKey`. Discoverability is chosen here for the login UX, not for PRF.

### 2.3 Protocol constants

```text
PRF_SALT_V1   = UTF8("moneyflow-v1-passkey-identity-wrap")   -- public, non-secret, constant
KEK_INFO_V1   = UTF8("moneyflow-v1-passkey-kek")             -- public HKDF info string
WRAP_VERSION  = 1
```

`PRF_SALT_V1` is a fixed public constant shared by every credential. This is safe by fact §2.2.3 and
is what lets a discoverable-credential `get()` — which has no `allowCredentials` and therefore
cannot use `evalByCredential` — still obtain the right KEK. A `wrap_version smallint` column is
carried on each credential row so a future v2 salt can be introduced without a schema migration.

### 2.4 Key schedule

```text
prfOutput  = clientExtensionResults.prf.results.first          -- 32 bytes, client memory only
kek        = HKDF-SHA256(ikm = prfOutput, salt = <none>, info = KEK_INFO_V1, length = 32)
envelope   = XChaCha20-Poly1305(key = kek, plaintext = masterSeed)   -- via encryptForStorage
             = nonce(24) || ciphertext(64 + 16 tag)
```

- HKDF is applied rather than using `prfOutput` directly. The raw output is already uniform, so this
  is defence in depth plus domain separation: it guarantees that a future second key derived from
  the same credential cannot collide with the KEK. It reuses `@noble/hashes/hkdf`, already a
  dependency and already the KDF used by `src/lib/crypto/keypair.ts`.
- `encryptForStorage` / `decryptFromStorage` from `src/lib/crypto/encryption.ts` are reused
  verbatim. A fresh random 192-bit nonce per wrap answers the explainer's warning that "since the
  key will be constant for a given credential, it's vitally important to ensure the nonce used when
  encrypting is unique."
- The plaintext is the **64-byte master seed** — the existing root from which `deriveKeysFromSeed()`
  produces the identical Ed25519 and X25519 keypairs. Entropy is neither reduced nor re-derived.
  This is the "two-level encryption structure" the explainer recommends for the multiple-credential
  case: one master secret, wrapped independently under each credential.

### 2.5 The `toJSON()` leak trap (blocking secret-safety control)

The spec warns explicitly:

> "Note in particular that the `RegistrationResponseJSON` and `AuthenticationResponseJSON` returned
> by `PublicKeyCredential.toJSON()` will include this `results` output if present."

`@simplewebauthn/browser` v13 does the equivalent: it sets
`clientExtensionResults: credential.getClientExtensionResults()` verbatim on the object it returns.
Sending that object to the server as-is would post the raw encryption key.

**Control:** a single pure helper strips `clientExtensionResults.prf` and is the only path by which
a ceremony response reaches a tRPC call. It is covered by a dedicated counterfactual unit test and
by an E2E assertion that scans every outgoing request body for the PRF bytes.

### 2.6 Ceremonies

All challenges are server-generated, stored, and atomically consumed exactly once by a
`SECURITY DEFINER` RPC modelled on the existing `claim_request_nonce` in `006_rls_hardening.sql`.

**C1 — Registration (protected; caller already holds an unlocked signing session).**

```text
1. client  -> passkey.startRegistration            (signed, Ed25519)
   server  :  mint challenge, persist (challenge, 'registration', pubkeyHash, expiry)
   server  -> PublicKeyCredentialCreationOptionsJSON
              rp.id = <request host>, user.id = pubkeyHash bytes,
              authenticatorSelection { residentKey: "required", userVerification: "required" }
              excludeCredentials = caller's existing credential ids
              extensions { prf: {} }                  -- capability probe only, no eval
2. client  :  startRegistration({ optionsJSON })
              REQUIRE clientExtensionResults.prf.enabled === true, else ABORT with no server state
3. client  :  startAuthentication({ prf: { eval: { first: PRF_SALT_V1 } },
                                    allowCredentials: [ the new credential ] })   -- see note
              obtain prfOutput; kek = HKDF(...); envelope = encrypt(masterSeed, kek)
4. client  -> passkey.finishRegistration { response (PRF-stripped), wrappedSecret: envelope, label }
   server  :  claim challenge (single use), verifyRegistrationResponse(
                 expectedChallenge, expectedOrigin, expectedRPID, requireUserVerification: true)
              INSERT credential row (id, COSE public key, counter, transports, aaguid,
                                     backup flags, wrapped_secret, wrap_version, label)
5. client  :  memzero(prfOutput, kek, masterSeed)
```

Step 3 is a second ceremony because of fact §2.2.5: create-time `results` are optional and, on the
CTAP2 virtual authenticator, the create-time value is derived from a _different_ half of the
credential's HMAC key pair than the assertion-time value (`virtual_ctap2_device.cc`:
`makeCredential` selects `user_verified ? hmac_key->second : hmac_key->first`, while `getAssertion`
unconditionally uses `hmac_key->second`). Depending on create-time output would therefore be both
non-portable and, on some paths, silently wrong. The implementation always derives the KEK from an
**assertion**.

**C2 — Authentication / unlock (public; caller has no identity yet, so it cannot sign).**

```text
1. client  -> passkey.startAuthentication          (unauthenticated)
   server  :  mint challenge, persist (challenge, 'authentication', NULL, expiry)
   server  -> PublicKeyCredentialRequestOptionsJSON
              allowCredentials omitted (discoverable), userVerification: "required",
              extensions { prf: { eval: { first: PRF_SALT_V1 } } }
2. client  :  startAuthentication({ optionsJSON }) -> assertion + prf.results.first
3. client  -> passkey.finishAuthentication { response (PRF-stripped) }
   server  :  claim challenge (single use); look up credential by id; verifyAuthenticationResponse(
                 expectedChallenge, expectedOrigin, expectedRPID, credential,
                 requireUserVerification: true)
              REQUIRE newCounter monotonic; persist newCounter and last_used_at
   server  -> { wrappedSecret, wrapVersion, pubkeyHash }
4. client  :  kek = HKDF(prfOutput); masterSeed = decrypt(wrappedSecret, kek)   -- fails closed
              keys = deriveKeysFromSeed(masterSeed)
              REQUIRE computePubkeyHash(keys.signing.publicKey) === pubkeyHash
              storeIdentitySession(...)  -- identical to the recovery-phrase path
              memzero(prfOutput, kek, masterSeed)
```

The server releases `wrapped_secret` **only** after a fully verified assertion (T7). The client's
independent `pubkeyHash` re-derivation closes T2 even against a server that returns a well-formed
row belonging to somebody else.

**C3 — List / revoke (protected).** Revocation deletes the row, and with it `wrapped_secret` (T9).
Revoking the last credential is permitted but is gated behind an explicit confirmation that names
the consequence; it is never silent.

### 2.7 Why registration requires proving possession of the root

The master seed is deliberately **not** kept in `sessionStorage` or in any module-level cache. It
exists only inside the ceremony that produced it. Consequently, adding a passkey requires the user
to re-establish the root in that same flow, by either:

- entering the recovery phrase (the P18 credential-form contract, reused unchanged), or
- authenticating with an **already-registered passkey** (ceremony C2 steps 1–4, minus the session
  install), which is what makes a passkey-only user able to add a second passkey.

This is a security-positive property, not merely an implementation convenience: adding a new unlock
factor demands proof of the existing root factor, so an attacker holding only a live browser session
(A3/A4) cannot mint themselves a persistent new way in. It also means `src/lib/crypto/session.ts`
needs no change and no new secret is persisted anywhere.

### 2.8 Rejected alternatives

| Alternative                                                | Why rejected                                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Derive the vault identity from the PRF output              | **Forbidden and unsafe.** Loses the recovery phrase as a root, makes the identity unrecoverable if the authenticator dies, and reduces effective entropy. |
| Wrap the derived Ed25519/X25519 private keys instead of A2 | Works today but is strictly weaker: any future key derived from the master seed would not be recoverable by passkey. Wrapping A2 is the general fix.      |
| Per-credential random PRF salt                             | Cannot be selected during a discoverable `get()` with no `allowCredentials`; would force `evalByCredential` and thus a credential-id-first login flow.    |
| Use the create-time `prf.results` to avoid a second prompt | Not guaranteed by the spec (§2.2.5) and demonstrably a different key on the CTAP2 virtual authenticator path. Correctness over one fewer prompt.          |
| Hand-roll WebAuthn verification                            | Explicitly forbidden; signature/attestation parsing is exactly the code that must not be bespoke.                                                         |
| Add `@simplewebauthn/types`                                | Deprecated upstream ("Package no longer supported", last 12.0.0). v13 inlines its types.                                                                  |

---

## 3. Recovery and loss model

| Scenario                                      | Outcome                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Recovery phrase held, no passkey              | Unchanged from today. Unlock by phrase.                                                                              |
| Phrase + one or more passkeys                 | Either factor unlocks the identical Ed25519/X25519 identity. Neither is degraded by the other's existence.           |
| Passkey-only, one credential, credential lost | **Vault is permanently unrecoverable.** This is stated plainly at creation time, before the credential is made.      |
| Passkey-only, several credentials, one lost   | Any remaining credential unlocks. The lost one is revoked from an unlocked session.                                  |
| Authenticator present but PRF unsupported     | Registration hard-fails at `prf.enabled !== true`. The recovery-phrase route stays fully available (no trap, T10).   |
| Browser has no WebAuthn at all                | Capability detection hides/disables the passkey branch and explains why; the phrase branch is unaffected.            |
| User revokes their last credential            | Allowed only through an explicit confirmation naming the consequence; blocked outright if no recovery phrase exists… |
| Server loses the `passkey_credentials` row    | Equivalent to losing every passkey. The recovery phrase, if saved, still works. Passkey-only users lose the vault.   |

Because the last row is the only copy of `wrapped_secret`, passkey-only creation surfaces the
recovery phrase as an **optional but recommended** backup, revealed on demand, rather than hiding
it. "Passkey-only" describes the default path, not a prohibition on saving the phrase.

---

## 4. R-011 disposition: headless PRF automation is AVAILABLE — not `blocked_external`

The dispatch anticipated that the repository's headless Chromium might be unable to drive the PRF
extension, and pre-authorized a partial `blocked_external` for the real-PRF proof. **That
contingency does not apply.** Before writing any test or product code I ran a direct capability
probe against the repository-pinned Playwright 1.61.1 Chromium via `browserContext.newCDPSession`,
driving `WebAuthn.addVirtualAuthenticator` with `hasPrf: true`, then performing a real `create()`
plus two real `get()` calls. Observed result, verbatim from the run:

```text
PRF PROBE RESULT: {"createEnabled":true,"createHasResults":false,"len1":32,"deterministic":true,"nonZero":true}
```

That establishes four facts by direct measurement, not by inference:

1. `clientExtensionResults.prf.enabled === true` at registration — the virtual authenticator really
   advertises PRF, so capability detection can be exercised for real.
2. The assertion PRF output is exactly **32 bytes**, matching the normative width in §2.2.1.
3. The output is **deterministic** for a fixed credential + salt across separate `get()` calls,
   which is the precise property the wrap/unwrap design depends on.
4. `results` is **absent from the create() response** (`createHasResults: false`), independently
   confirming §2.2.5 and vindicating the decision in §2.6 to derive the KEK only from an assertion.

**Disposition: no `blocked_external` is claimed for P19, in whole or in part.** The full journey set
— passkey-only creation, add-passkey, unlock by passkey, unlock by recovery, revoke, and same-vault
identity continuity — is covered by genuine automated E2E against a real WebAuthn ceremony. The one
thing a virtual authenticator cannot prove is behaviour of specific physical hardware (a YubiKey, or
iCloud Keychain); that residual gap is recorded as Q-PROPOSAL-P19-01-02 rather than as a blocker,
and no simulated result is anywhere represented as real-device evidence.

Supporting Chromium source facts (fetched 2026-07-25) that explain _why_ it works, and that pinned
down the required options: `hasPrf` has existed in CDP `VirtualAuthenticatorOptions` since the
Chrome 111 branch; `webauthn_handler.cc` requires `protocol: "ctap2"` for the flag to be honoured at
all; and `virtual_ctap2_device.cc:1849` returns PRF results only when `user_verified` is true, so
`hasUserVerification: true` **and** `isUserVerified: true` are both mandatory or the extension
silently yields nothing. `prf_input.cc` implements the PRF as
`HMAC-SHA256(per-credential key, salt)` over a key generated once at `makeCredential`, which is the
mechanism behind the observed determinism.

---

## 5. Implementation log

### 5.1 Commits (all exact-path; evidence deliberately uncommitted)

| Commit    | Message                                          | Role                                              |
| --------- | ------------------------------------------------ | ------------------------------------------------- |
| `ea5af08` | `test(P19): define passkey PRF behavior`          | RED, against byte-identical production            |
| `2482767` | `feat(P19): add passkey PRF unlock and registration` | GREEN                                          |
| `77038d1` | `fix(P19): disambiguate passkey unlock control name` | Regression fix found by the full E2E suite     |

`git add .` / `git add -A` were never used; every commit staged an explicit path list.

### 5.2 Changed paths (`e72befd..77038d1`, product/test only)

Product:

- `src/lib/crypto/passkeyWrap.ts` (new) — PRF-KEK derivation, wrap/unwrap of the master secret, zeroize
- `src/lib/crypto/passkeyCeremony.ts` (new) — PRF strip/extract, capability detection
- `src/lib/crypto/index.ts` — barrel exports only
- `src/hooks/use-passkey.ts` (new) — ceremony orchestration
- `src/server/routers/passkey.ts` (new), `src/server/schemas/passkey.ts` (new)
- `src/server/routers/_app.ts` — additive wiring only
- `src/types/webauthn-prf.d.ts` (new) — PRF type augmentation
- `src/lib/supabase/database.types.ts` — regenerated, purely additive (+118 lines)
- `supabase/migrations/010_passkey_credentials.sql` (new)
- `src/app/(onboarding)/new-user/page.tsx`, `src/app/(onboarding)/unlock/page.tsx`
- `src/app/(app)/settings/page.tsx` — see Q-PROPOSAL-P19-01-01
- `src/components/features/identity/`: `CredentialChoiceDivider.tsx`, `PasskeyUnlockButton.tsx`,
  `PasskeyManager.tsx` (new); `UnlockCircle.tsx`, `index.ts` (modified)
- `package.json` / `pnpm-lock.yaml` — `@simplewebauthn/server@13.3.2`, `@simplewebauthn/browser@13.3.0` only

Tests: `tests/unit/crypto/passkeyWrap.test.ts`, `tests/unit/crypto/passkeyCeremony.test.ts`,
`tests/unit/server/passkey-router.test.ts`, `tests/e2e/passkey.spec.ts`, `tests/e2e/helpers/passkey.ts`.

`src/app/(onboarding)/invite/[token]/page.tsx` was authorized but needed no change: it delegates
entirely to `useIdentity`, so a passkey-unlocked session flows through it unmodified.

**Read-only invariants held.** `seed.ts`, `keypair.ts`, `identity.ts` derivation, the entropy source
and the wordlist are untouched, as are all migrations `005`–`009`. `git diff e72befd..HEAD --
src/lib/crypto/seed.ts src/lib/crypto/keypair.ts src/lib/crypto/identity.ts supabase/migrations/005*
supabase/migrations/006* supabase/migrations/007* supabase/migrations/008* supabase/migrations/009*`
is empty.

### 5.3 Two incidents worth recording

**`pnpm format` reformatted frozen and root-owned files.** The repository-wide `pnpm format` script
has no path filter, so it rewrote `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, `HANDOFF.md`,
`DECISIONS.md`, `DEPENDENCIES.md`, two immutable P12 review files, four other packages' evidence
files, **and `specs/human-scratch.md`** — the frozen scratch source. I detected this immediately via
`git status`, reverted every one of those paths with `git restore`, and verified
`sha256sum specs/human-scratch.md` = `c4121a48723d21c6689116d900f450136645e0f88dc993829b7561b2a3a31a4c`,
matching the rolling SHA recorded in PROGRESS. No forbidden file is modified at the final HEAD.
For the rest of the package I formatted only `src/ tests/ supabase/` explicitly. This is a live trap
for any future worker and is raised as Q-PROPOSAL-P19-01-03.

**`pnpm db:types` corrupted its own output.** The Supabase CLI wrote a PostHog telemetry error line
into stdout, which the script redirects straight into `src/lib/supabase/database.types.ts`, leaving a
JSON blob appended after the last type and a non-zero exit. I regenerated with that line filtered
out. Raised as Q-PROPOSAL-P19-01-04.

---

## 6. Q-proposals

### Q-PROPOSAL-P19-01-01 — Passkey management needs an authenticated home; settings page was not in the allowed path list

- Raised by/package/revision: human_scratch_implementer / P19 / 01
- Context and evidence: HS-020 requires list/revoke and "adding multiple passkeys to an existing
  recovery identity", and HANDOFF authorizes `list/revoke` components under
  `src/components/features/identity/`. But the only authorized *pages* are the three onboarding
  routes, which are all pre-authentication. A returning user cannot reach an onboarding page while
  unlocked, so the authorized components had no reachable mount point.
- Why existing authority does not decide it: HANDOFF enumerates the components and the journeys but
  omits any authenticated page; `src/app/(app)/settings/page.tsx` is neither listed as allowed nor
  named in the forbidden list.
- Options considered: (a) mount `PasskeyManager` on the existing settings page; (b) create a new
  authenticated route; (c) ship the components unmounted and mark the journey blocked.
- Reversible default selected to continue: (a). The change is six lines — one import and one element
  — inside the existing scroll container, and passkeys are the only identity-level feature there.
- Decision-hierarchy basis: #1 (the frozen requirement explicitly demands add/list/revoke for an
  existing identity) then #4 (smallest reversible change; (b) would add routing and layout surface).
- Impact and risk: Low. Purely additive; no existing settings behaviour altered. Note the section is
  identity-scoped on a vault-scoped page, which is a UX wrinkle rather than a defect.
- Reversal or migration path: Delete the import and the element; the components remain unused but
  intact.
- Human review still useful after completion: Yes — whether identity settings deserve their own route.

### Q-PROPOSAL-P19-01-02 — Real-hardware PRF evidence is out of reach in this environment

- Raised by/package/revision: human_scratch_implementer / P19 / 01
- Context and evidence: Automated coverage runs against Chromium's CDP virtual authenticator, which
  genuinely implements PRF (see §4 — measured, not assumed). What no CI-hosted environment can do is
  attest to a specific physical authenticator (YubiKey, iCloud Keychain, Windows Hello), which needs
  a human touching hardware.
- Why existing authority does not decide it: HANDOFF asks for "real supporting-authenticator evidence
  where headless cannot drive PRF"; here headless *can* drive PRF, so the clause does not apply, but
  vendor-hardware behaviour still is not proven.
- Options considered: (a) claim virtual-authenticator success as device evidence; (b) declare
  `blocked_external` for the whole package; (c) ship full automated coverage and scope the residual
  gap honestly.
- Reversible default selected to continue: (c). (a) would be a false claim and is explicitly
  forbidden; (b) would be untrue since the automation works.
- Decision-hierarchy basis: #3 (truthfulness about security evidence).
- Impact and risk: Low-moderate. Vendor authenticators vary — notably Windows PRF support depends on
  the Windows version, and some Android passkey providers do not support it. The design already fails
  closed on such devices (`prf.enabled !== true` aborts registration with no server state), so the
  failure mode is a clear message plus the recovery-phrase route, not a broken vault.
- Reversal or migration path: None needed; a human can spot-check hardware at any time.
- Human review still useful after completion: Yes — a manual pass on one physical key and one
  platform authenticator before launch.

### Q-PROPOSAL-P19-01-03 — `pnpm format` rewrites frozen and root-owned control files

- Raised by/package/revision: human_scratch_implementer / P19 / 01
- Context and evidence: `pnpm format` runs `oxfmt` with no path argument. Executed once from the repo
  root it modified 15 files under `specs/`, including `specs/human-scratch.md` (the frozen scratch
  source), `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md`, and two immutable P12 review
  files. Reverted immediately; scratch SHA re-verified against the PROGRESS rolling SHA.
- Why existing authority does not decide it: CLAUDE.md instructs every worker to run `pnpm format`
  before completing a task, while PROCESS.md forbids workers from editing exactly the files that
  command rewrites. The two rules are in direct conflict.
- Options considered: (a) add an oxfmt ignore for `specs/` (forbidden — `.claude`/config is read-only
  for me); (b) never run bare `pnpm format`, only `pnpm exec oxfmt <paths>`; (c) run it and revert.
- Reversible default selected to continue: (b) for the rest of this package.
- Decision-hierarchy basis: #1 (frozen-source integrity outranks a formatting convenience).
- Impact and risk: **High for the process, not for this package.** A worker who runs `pnpm format`
  and commits without inspecting `git status` will silently corrupt the frozen scratch source and
  break the boundary integrity checks.
- Reversal or migration path: Add `specs/**` to the formatter's ignore configuration, or narrow the
  `format` script to `src/ tests/ supabase/`.
- Human review still useful after completion: Yes — this should be fixed in configuration.

### Q-PROPOSAL-P19-01-04 — `pnpm db:types` can corrupt the generated types file

- Raised by/package/revision: human_scratch_implementer / P19 / 01
- Context and evidence: `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
  redirects raw stdout. A PostHog telemetry failure emitted
  `{"_tag":"Error","error":{...PostHog...}}` onto stdout, which landed at the end of the generated
  file, producing a syntax error and exit code 1.
- Why existing authority does not decide it: The command is prescribed by repository convention; the
  failure is environmental.
- Options considered: (a) hand-edit the generated file; (b) regenerate filtering non-TypeScript
  stdout lines; (c) leave it broken.
- Reversible default selected to continue: (b) — regenerated with the telemetry line filtered, then
  formatted. Final diff is purely additive (+118 lines, no deletions).
- Decision-hierarchy basis: #2 (repository convention) plus #4.
- Impact and risk: Low here, but a silent corruption risk generally, since the redirect means a
  partial or polluted generation overwrites a known-good file.
- Reversal or migration path: `pnpm db:types` after `pnpm db:reset`.
- Human review still useful after completion: Yes — the script could write to a temp file and move it
  into place only on success.

---

## 7. Commands and results

### 7.1 Full gate at final HEAD `77038d1`

| Command                                                        | Result                                             |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `pnpm typecheck`                                                 | PASS — no output, exit 0                           |
| `pnpm lint`                                                      | PASS — 0 errors, 10 warnings, all pre-existing     |
| `pnpm exec oxfmt --check src/ tests/ supabase/`                  | PASS — "All matched files use the correct format"  |
| `pnpm test`                                                      | PASS — 71 files, 1615 passed, 2 skipped            |
| `pnpm exec playwright test --retries=0 --reporter=line`          | PASS — 116/116 passed                              |

Unit count moved 1550 → 1615 (+65 new). Lint warnings were 12 before my work and are 10 now: I
introduced none and incidentally resolved two by removing a destructure-to-omit.

### 7.2 Focused and repeated runs

| Command                                                                                  | Result           |
| ---------------------------------------------------------------------------------------- | ---------------- |
| `pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0 --workers=2`               | 9/9 passed       |
| `pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0 --workers=2 --repeat-each=3` | 27/27 passed — no flakiness |
| `pnpm exec playwright test passkey.spec.ts vault-settings.spec.ts identity.spec.ts --retries=0` | 26/26 passed |

### 7.3 The regression the full suite caught

The first full-suite run failed `vault-settings.spec.ts:129` — "same-vault lock then unlock renders
on the first attempt". That spec resolves the unlock control by accessible name
(`getByRole("button", { name: /unlock/i })`), and my new "Unlock with passkey" button matched the
same regex, producing a strict-mode violation with two elements.

`tests/e2e/vault-settings.spec.ts` is not an allowed path, so the fix belonged in my own code. I
renamed the control to **"Use a passkey"** (`77038d1`), which removes the collision and is better
copy besides: the button selects a *method*, while "Unlock Vault" performs the action. My own E2E
asserts the accessible name matches `/passkey/i`, so it still holds. This is exactly the class of
defect a full-suite run exists to catch, and it is recorded rather than quietly patched.

### 7.4 Manual headless `playwright-cli` charter

Session `p19-manual-charter`, repository-installed CLI, never `--headed/--ui/--debug/show`. Closed
and its data deleted afterwards; `.playwright-cli/` and `test-results/` removed.

**Accessible role/name/state** (`snapshot`, `/unlock`) — expected vs observed:

| Control                  | Expected                          | Observed                                        |
| ------------------------ | --------------------------------- | ----------------------------------------------- |
| Passkey control          | `button`, name mentioning passkey | `button "Use a passkey"` — PASS                 |
| OR divider               | `separator` with name "or"        | `separator "or"` — PASS, not a decorative glyph |
| Recovery phrase entry    | unchanged P18 contract            | `textbox "Recovery phrase"` + 12 `"Word N"` — PASS |

**Computed contrast** (canvas-resolved sRGB, since the theme uses `lab()` which naive string parsing
mis-reads — an early measurement attempt produced bogus 1.5:1 figures before this was corrected):

| Element                          | Ratio     | Threshold      | Verdict |
| -------------------------------- | --------- | -------------- | ------- |
| "Use a passkey" label            | 20.16 : 1 | 4.5:1 (AA)     | PASS    |
| "OR" divider label (12px)        | 4.76 : 1  | 4.5:1 (AA)     | PASS    |
| Passkey loss warning (14px)      | 4.76 : 1  | 4.5:1 (AA)     | PASS    |
| "Create with a passkey" label    | 17.04 : 1 | 4.5:1 (AA)     | PASS    |

**Matrix:** dark scheme + `reducedMotion: reduce` at 320×720 — loss warning holds 4.76:1 and the
create button 17.04:1; `scrollWidth` 320 with `horizontalOverflow: false` and the button fully within
the viewport (222×40). No reflow or clipping.

**Console / network / URL / storage:** 90 console messages, **0 errors and 0 warnings**; no failed
requests. On `/new-user`: `search` and `hash` both empty, `localStorage` empty, `sessionStorage`
holding only a Next.js dev channel key. A scan for `prf`, `wrappedSecret`/`wrapped_secret` and
`masterSeed`/`master_secret` across both storages returned **false for all three**.

### 7.5 Secret-safety confirmation

No master identity secret, PRF output, plaintext wrapped-secret bytes, or recovery phrase appears in
this evidence file, in any test fixture, in any log, URL, query string, or persisted storage.
Specifically:

- Tests use only synthetic fill-byte PRF values, freshly generated throwaway phrases, and the public
  all-`abandon` BIP39 vector. No real key material is checked in.
- `stripPrfResults` is the single chokepoint before every transmission, covered by a unit test that
  asserts the PRF bytes are absent in base64, base64url **and** hex encodings of the payload.
- The server Zod schema *rejects* any request carrying `clientExtensionResults.prf`, so a stripping
  failure becomes a loud validation error rather than a silent leak.
- `tests/e2e/passkey.spec.ts` scans every outgoing request body across a full create-then-unlock
  journey for `"prf"` and for the session signing key, and asserts absence from requests, console and
  URL.
- `sodium.memzero` clears the PRF output, derived KEK and master secret in `finally` blocks on every
  path, including failures.
- The server persists only non-secret credential metadata plus the encrypted envelope; the
  `listCredentials` projection cannot return `wrapped_secret`, and a unit test asserts that.

**No `blocked_external` is claimed for P19, in whole or in part** (see §4).

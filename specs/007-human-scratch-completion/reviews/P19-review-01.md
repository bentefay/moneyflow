# P19 / revision 01 — Independent Review (HS-020 WebAuthn PRF passkeys)

- **Package / revision:** P19 / 01
- **Requirement:** HS-020 (`tasks/HS-020-passkey-prf.md`)
- **Reviewed range:** `e72befd9ba1b2cbbf5c189b7d855e47cc752240e` ..
  `77038d1bb4ece9053d2c1d89f72ba7c00ac68aee`
- **Reviewer:** `human_scratch_reviewer` (independent; did not implement)
- **Reviewed evidence:** `specs/007-human-scratch-completion/evidence/P19/implementation-01.md`

> **Secret-safety statement for this artifact.** No master identity secret, PRF output, plaintext
> wrapped-secret bytes, recovery phrase or any real key material appears in this file. Byte counts,
> row counts and colour values quoted below are non-secret structural measurements.

---

## VERDICT: **FAIL**

- **Blocking findings: 2**
- **Non-blocking findings: 5**

The cryptographic core of this package is genuinely good work, and I want to say so plainly before
the findings: the master-secret wrap invariant holds exactly as specified, the server protocol is
sound, the secret-safety controls are real and layered, and the "not blocked_external" claim is
**true** — the E2E drives a real PRF ceremony, not a mock. I verified each of those independently
rather than accepting the evidence.

The package nevertheless fails on the **passkey-only creation journey**, which is the single
headline behaviour HS-020 asks for. A failed or cancelled passkey ceremony on `/new-user` registers
a server-side identity, installs a live session, shows no error, and leaves the button stuck on
"Waiting for passkey..." — permanently. I reproduced this in the real app, not only in theory. The
implementer's own E2E test is named "leaves the user on a usable page with no partial state" but
asserts neither of those things, which is why it passed.

---

## 1. Range integrity and path discipline

Every path in `e72befd..77038d1`, with its HANDOFF authority:

| Path                                                                                                                             | Ruling                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `supabase/migrations/010_passkey_credentials.sql`                                                                                | Authorized verbatim                                                                                  |
| `src/server/routers/passkey.ts`, `_app.ts` wiring                                                                                | Authorized verbatim                                                                                  |
| `src/lib/crypto/passkeyWrap.ts`, `passkeyCeremony.ts`, `index.ts` barrel                                                         | Authorized ("new crypto helper(s) … plus a barrel export line")                                      |
| `src/app/(onboarding)/new-user/page.tsx`, `unlock/page.tsx`                                                                      | Authorized verbatim                                                                                  |
| `src/components/features/identity/` (3 new, 2 modified)                                                                          | Authorized ("new enumerated components")                                                             |
| `package.json` / `pnpm-lock.yaml`                                                                                                | Authorized (exactly the two recommended `@simplewebauthn` packages, nothing else — verified by diff) |
| `tests/unit/**`, `tests/e2e/passkey.spec.ts`, `tests/e2e/helpers/passkey.ts`                                                     | Authorized                                                                                           |
| `src/app/(app)/settings/page.tsx`                                                                                                | **Flagged — ruled acceptable, see below**                                                            |
| `src/hooks/use-passkey.ts`, `src/server/schemas/passkey.ts`, `src/types/webauthn-prf.d.ts`, `src/lib/supabase/database.types.ts` | **Flagged — ruled acceptable, see below**                                                            |

No ledger, scratch, task, review, `.claude` or `.codex` file is touched in the product range
(`ad4103c` is root's own docs commit and is correctly excluded). `git add .` / `git add -A` were not
used; every commit carries an explicit path list. **Path discipline: PASS.**

### Ruling on `src/app/(app)/settings/page.tsx` (Q-022)

**Acceptable in-scope necessity. Not a boundary violation.** HS-020 explicitly requires
add/list/revoke for a returning user with an existing identity. The HANDOFF authorized the
list/revoke components but named only pre-authentication onboarding pages, so the authorized
components had no reachable mount point — the requirement was literally unsatisfiable within the
allowlist. The change is 6 lines (one import, one element, one spacing class), purely additive,
alters no existing settings behaviour, and the path is not in the forbidden list. The implementer
raised it as a Q-proposal with the reversal path rather than burying it. Halting here would have
been over-literal; the decision hierarchy puts the frozen requirement first.

### Ruling on the four additive files

**All acceptable natural consequences. Not overreach.**

- `src/server/schemas/passkey.ts` — the HANDOFF says "Follow the crypto/tRPC/Zod rules", and
  `.claude` convention places router schemas in `src/server/schemas/`. Putting them inline would
  have violated repository convention.
- `src/hooks/use-passkey.ts` — the authorized components need ceremony orchestration; the repo's
  established pattern is a hook (`use-identity.ts`). Inlining this into three components would
  duplicate the most security-sensitive client logic three times.
- `src/types/webauthn-prf.d.ts` — TypeScript's DOM lib has no PRF extension types yet. Without it
  the code could only compile via `as`/`any`, which `.claude/rules/typescript-style.md` forbids.
  This is the type-safe route.
- `src/lib/supabase/database.types.ts` — mechanically regenerated from the authorized migration;
  diff is +118 lines, additive only. I confirmed no deletions.

---

## 2. Master-secret wrap invariant — **HOLDS** (independently verified)

This is the load-bearing requirement and I attacked it specifically.

**Frozen sources are byte-identical.** `git diff --exit-code e72befd 77038d1` over `seed.ts`,
`keypair.ts`, `identity.ts` and migrations `005`–`009` is **empty**. I additionally SHA-256'd each
file at both commits and confirmed identical digests, including `encryption.ts`, `session.ts` and
the wordlist.

**PRF output is used only as a KEK.** `src/lib/crypto/passkeyWrap.ts:61-99` derives
`kek = HKDF-SHA256(prfOutput, info="moneyflow-v1-passkey-kek", 32)` and passes it to the
pre-existing `encryptForStorage`. The plaintext is the **64-byte master seed** — enforced by an
explicit length check that throws rather than normalizing (`passkeyWrap.ts:88-90`). Nothing in the
package derives a keypair, seed or entropy from PRF material; I grepped the range for any call into
`deriveKeysFromSeed`, `createIdentity` or `generateSeedPhrase` reachable from a PRF value and found
only the correct direction: unwrap → existing seed → existing derivation.

**Same identity from both factors.** `use-passkey.ts:191-201` unwraps, calls the untouched
`deriveKeysFromSeed`, recomputes `computePubkeyHash`, and — importantly — **compares it to the
server-asserted hash and throws on mismatch** before installing a session. That closes the
malicious-server substitution attack the threat model calls T2, and it is a genuine defence, not
decoration.

**No hand-rolled crypto.** Verification is `@simplewebauthn/server@13.3.2`; encryption is the
existing libsodium XChaCha20-Poly1305 path; HKDF is `@noble/hashes`, already used by `keypair.ts`.
No bespoke signature, CBOR or attestation parsing anywhere in the range.

**Live database corroboration.** Against the running local Supabase I found 84 real credential rows:
every `wrapped_secret` decodes to exactly **104 bytes** (24-byte nonce + 64-byte seed + 16-byte
Poly1305 tag), 84/84 envelopes distinct, and 84/84 nonce prefixes distinct — confirming fresh-nonce
discipline under a constant KEK, which is the one catastrophic mistake this design could have made.
Every passkey identity also had a corresponding vault membership (0 orphans among passkey holders).

**Verdict: the identity invariant is correctly and defensively implemented.**

---

## 3. Server verification and replay — **SOUND**

- Challenges are server-minted 32 random bytes, persisted with a 30–600s TTL bound, and consumed by
  `claim_passkey_challenge`, which is a `DELETE ... RETURNING` inside a `SECURITY DEFINER` function.
  Single-use is enforced by the database, so it is race-free — a replay is a no-row result
  regardless of concurrency. This correctly mirrors `claim_request_nonce` from `006`.
- Origin and RP ID come from **server configuration, never request headers** (`passkey.ts:48-65`),
  with an explanatory comment. Deriving them from `Host` would have re-opened exactly the phishing
  binding WebAuthn exists to provide; the implementer got this right where many do not.
- A registration challenge is bound to the minting identity and re-checked against `ctx.pubkeyHash`
  (`passkey.ts:202-204`) → `FORBIDDEN` on mismatch.
- `requireUserVerification: true` on both ceremonies; `residentKey: "required"`;
  `attestationType: "none"`; `excludeCredentials` populated.
- `allowCredentials` is deliberately omitted on authentication so an anonymous caller cannot
  enumerate identities, and all ceremony failures funnel through one uniform `UNAUTHORIZED`
  (`rejectCeremony`) so unknown-credential is indistinguishable from bad-signature.
- Counter monotonicity is enforced twice: the library rejects a regressed counter, and
  `record_passkey_authentication` uses `GREATEST(counter, p_counter)` so it can never roll back.
- RLS is `ENABLE` + `FORCE` with a RESTRICTIVE deny-all policy on both new tables, all privileges
  revoked from `anon`/`authenticated`, and function `EXECUTE` granted only to `service_role` —
  matching the `006`/`007` posture. `register_passkey_credential` refuses to rebind a credential ID
  owned by another identity, preventing wrapped-secret overwrite.

**The router tests genuinely exercise the adversarial paths, not just happy ones.** I read all 599
lines: replayed challenge (registration and authentication), challenge minted for another identity,
verifier returning `verified:false`, verifier throwing, counter-replay rejection, unknown
credential, anonymous access to all four protected procedures, non-base64 and oversized wrapped
secret, revocation scoped to caller, and a listing projection asserted not to contain the wrapped
secret. Each negative test also asserts the _absence_ of the downstream write, which is the part
that actually proves fail-closed behaviour.

---

## 4. Secret-safety — **NO LEAK FOUND**

Independently verified, and this is layered defence rather than a single check:

1. `stripPrfResults` is a pure function and the sole path to every tRPC call (`use-passkey.ts:155`,
   `188`). It removes the whole `prf` entry, not just `results`.
2. **The server Zod schema actively rejects any payload containing `prf`**
   (`schemas/passkey.ts:28-36`). A stripping regression becomes a loud validation error, not a
   silent leak. This is the right way round.
3. `sodium.memzero` clears the PRF output, KEK and master secret in `finally` blocks on every path
   including failures (`passkeyWrap.ts:96-98`, `133-135`; `use-passkey.ts:162-165`, `206-210`;
   `new-user/page.tsx:99-101`; `PasskeyManager.tsx:56-58`).
4. Grep of the entire new product surface: exactly **one** logging call (`passkey.ts:84`), which
   prints only an operation label and no data. No `localStorage`, no query strings, no analytics, no
   secret in any URL.
5. Server stores only non-secret metadata plus the encrypted envelope; the `listCredentials`
   projection cannot return `wrapped_secret` and a unit test asserts it.
6. Tests use only synthetic fill bytes, throwaway generated phrases, and the public all-`abandon`
   BIP39 vector. No real material is checked in.
7. I scanned all captured manual-session console logs for `prf`, `wrappedSecret`, `masterSeed` and
   the public vector: **no matches**, and **0 ERROR/WARNING console entries**.

No secret material appears in the evidence file or in this review.

---

## 5. "Not blocked_external" claim — **TRUE**

The claim survives adversarial checking. The E2E is not mocked:

- `tests/e2e/helpers/passkey.ts` drives CDP `WebAuthn.addVirtualAuthenticator` with
  `protocol: "ctap2"`, `hasPrf: true`, `hasUserVerification: true`, `isUserVerified: true`.
- The **only** `addInitScript` in the spec is in the unsupported-browser test, where deleting
  `navigator.credentials` is the point of the test.
- `@simplewebauthn` is not stubbed anywhere in `tests/e2e/`, and no `page.route` interception
  exists.
- Decisive corroboration: the 84 rows in the live database contain real verified COSE public keys
  and correctly-sized unique-nonce envelopes. A mocked ceremony could not have produced them —
  `verifyRegistrationResponse` would have rejected the attestation.

The residual gap (physical vendor hardware) is scoped honestly and never presented as measured. **No
blocked_external is warranted.**

---

## 6. Independently-run gate results

All commands run by me at `77038d1` (working tree equals the reviewed product HEAD).

| Command                                                                           | Result                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                  | **PASS** — exit 0, no output                                                                                                                                                                                                                                                                                                                                           |
| `pnpm lint`                                                                       | **PASS** — 0 errors, 10 warnings (all pre-existing, none in new files)                                                                                                                                                                                                                                                                                                 |
| `pnpm format:check`                                                               | **FAIL — pre-existing, not attributable.** 16 `specs/**` markdown files. I proved this by running the same binary against a clean worktree at BASE `e72befd`: **15 of the same files already fail there**; the 16th is the implementer's own uncommitted evidence file. `pnpm exec oxfmt --check src/ tests/ supabase/` passes cleanly. See non-blocking finding NB-1. |
| `pnpm test`                                                                       | **PASS** — 71 files, 1615 passed, 2 skipped                                                                                                                                                                                                                                                                                                                            |
| `pnpm test:e2e`                                                                   | **PASS** — 116/116 passed                                                                                                                                                                                                                                                                                                                                              |
| `pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0 --repeat-each=3` | **PASS** — 27/27, no flakiness                                                                                                                                                                                                                                                                                                                                         |

**RED→GREEN discipline verified, not assumed.** `git diff --name-only e72befd ea5af08` contains **no
`src/` path** — production is byte-identical at RED. I checked out `ea5af08` into a separate
worktree and ran the three new unit specs: **all 3 files fail** (modules do not exist). The RED
commit is genuine.

### Manual charter (repository CLI, headless, disposable sessions `p19rev` / `p19a11y`)

- Accessible names/roles at `/unlock`: `button "Use a passkey"`, `separator` with accessible name
  "or" (a real `role=separator`, not a decorative glyph), P18 recovery contract intact
  (`textbox "Recovery phrase"` + 12 `"Word N"` fields). Matches expectation.
- Dark + `reducedMotion: reduce` at 320×720: `scrollWidth` 320, **no horizontal overflow**, button
  222×40 fully in viewport.
- Contrast: the theme emits `lab()`, which naive parsing misreads as ~1.5:1. Converting to sRGB via
  `color-mix` and computing WCAG relative luminance myself gives **20.17:1** for the passkey button
  and OR-divider text against the page background (threshold 4.5:1) — independently confirming the
  implementer's 20.16:1 and their note about the parsing trap.
- Console: **0 errors, 0 warnings**; no secret artifacts.
- Sessions closed and `.playwright-cli/` + `test-results/` deleted. Working tree left clean.

---

## 7. Blocking findings

### B-1 — A failed or cancelled passkey creation permanently strands the user in a broken half-created state

**Severity: blocking. Reproduced in the real app, not merely by inspection.**

`src/app/(onboarding)/new-user/page.tsx:86-102` orders the passkey-only creation flow as:

```
1. generateNew()                       -- mint identity
2. await registerIdentity(identity)    -- REGISTER ON SERVER + install session + create vault
3. mnemonicToMasterSeed(...)
4. await registerPasskey(masterSecret) -- the ceremony that can fail
5. window.location.assign("/settings")
```

The irreversible server-side step happens **before** the step that can fail. When step 4 fails the
`catch` block is empty and the user is left with:

- a **registered server identity and a created vault** they can never unlock again;
- a **live session in `sessionStorage`** despite no visible success;
- **no error message** — `passkeyError` renders under `capability === "supported"`, but nothing
  resets the flow;
- the button **stuck on "Waiting for passkey..." forever** — I waited 15s past the ceremony timeout
  and it never recovered;
- the recovery phrase, which is the _only_ remaining way into that identity, **never shown and now
  unrecoverable** — `identity.mnemonic` is a local const that goes out of scope, the session stores
  only derived keys, and I confirmed by grep that **no surface anywhere in the authenticated app can
  reveal a recovery phrase**.

**Reproduction (exact steps I ran):**

1. `pnpm dev`; open `/new-user` in a headless CLI session with **no** virtual authenticator attached
   (equivalent to the user dismissing the system prompt).
2. Record `SELECT count(DISTINCT pubkey_hash) FROM vault_memberships` → 536.
3. Click `passkey-create-button`; wait.
4. Re-query → **537**. `passkey_credentials` unchanged at 84.
5. Page state: `url=/new-user`, `passkey-error` count **0**, button text **"Waiting for
   passkey..."**, `sessionStorage.moneyflow_session` **present**.

I reproduced the same orphan under the automated suite: running only the "cancelled ceremony" spec
moved the identity count by exactly **+1** with **+0** passkeys.

**Why the existing test did not catch it.** `tests/e2e/passkey.spec.ts:288` is named _"a cancelled
ceremony leaves the user on a usable page with no partial state"_ but asserts only that an error is
visible, the URL is `/new-user`, and the generate button is enabled. It asserts **nothing** about
partial state — not `sessionStorage`, not server rows. It passes because removing the authenticator
mid-flow produces a fast `NotAllowedError`, whereas the real dismissal path I exercised leaves the
promise pending. The test's name overstates what it verifies.

This contradicts the task's explicit acceptance criterion that unsupported/failed PRF "gets a clear
recovery fallback" and "never trap a user behind unsupported PRF", and the HANDOFF's "Registration
hard-fails … **with no server state**".

**Remediation for revision 02:**

1. Do not register the identity until the passkey ceremony has succeeded. Perform the ceremony first
   and derive the wrapped secret, then call `registerIdentity`; or hold registration until
   `finishRegistration` returns.
2. On failure, clear the installed session and surface the error, restoring the page to a usable
   state (`setIsBusy(false)` must run on the create path — currently the stuck button indicates the
   busy flag is never released on this branch).
3. Before creating a passkey-only account, show the recovery phrase (or at minimum make it
   revealable afterwards) so a failed ceremony is never an unrecoverable vault.
4. Strengthen the cancellation E2E to assert `sessionStorage` is empty and that no new server
   identity row was created — the assertions its own name promises.

### B-2 — A passkey-only user can revoke their last credential and permanently lose the vault, with no phrase to fall back on

**Severity: blocking.**

`PasskeyManager.tsx:104-126` gates last-credential revocation behind only a text change — _"This is
your only passkey. Remove it?"_ — and a confirm button. Revocation deletes the row and with it the
**sole copy** of `wrapped_secret`.

For a user created via the passkey-only flow this is unrecoverable data loss in two clicks:

- they were never shown their recovery phrase (see B-1);
- no surface exists to reveal it afterwards (verified by grep — `SeedPhraseDisplay` is referenced
  only from `/new-user`);
- so the deleted envelope was the only path to their master seed.

The evidence file's own recovery model states this should be _"blocked outright if no recovery
phrase exists"_ (§3, row 7) — the shipped code does not implement that clause, and the sentence is
even left truncated in the evidence table. Nothing in the system records whether a phrase was ever
saved; I confirmed no such flag exists anywhere in `src/`.

The task requires "list/revoke/re-authenticate safely with **no silent downgrade**". Deleting the
last unlock factor behind a one-line prompt is a silent downgrade from "recoverable" to "permanently
lost".

**Remediation for revision 02:** block last-credential revocation unless the user demonstrably holds
the recovery phrase — e.g. require re-entry of the phrase (the P18 credential-form contract is
already wired into this component for adding), or gate it behind an explicit phrase-reveal-and-
confirm step. Add a counterfactual E2E covering last-credential revocation for a passkey-only
identity.

---

## 8. Non-blocking findings

- **NB-1 — `pnpm format:check` fails repo-wide (pre-existing).** 15 of the 16 failing files already
  fail at BASE. This is not attributable to P19, but it means the CLAUDE.md instruction to run
  `pnpm format` before completing a task is actively dangerous: it rewrites `specs/human-scratch.md`
  and root-owned ledgers. The implementer hit this, reverted correctly, and re-verified the scratch
  SHA — I independently confirm `sha256sum specs/human-scratch.md` = `c4121a4…a31a4c`, unchanged.
  Q-024 should be prioritised; this is a live trap for every future worker.
- **NB-2 — Registration relies on a locally generated challenge for the PRF assertion.**
  `use-passkey.ts:108-129` uses a client-random challenge for the extra assertion that obtains the
  PRF output. The reasoning (the assertion is never transmitted or trusted, and consuming a server
  challenge would strand a row) is sound and documented, and no authentication decision is made from
  it. Recording it because it is the one place the protocol deviates from "all challenges are
  server-generated", so a future reader should not "fix" it by sending that assertion anywhere.
- **NB-3 — `as never` casts at the library boundary.** `passkey.ts:177`, `207`, `277`, `304`.
  `.claude/rules/typescript-style.md` forbids casts outside isolated, type-guarded helpers. These
  are inline at call sites rather than contained. Low risk (they bridge to a vetted library's own
  types) but they are the style rule's exact target.
- **NB-4 — Identity-scoped passkeys live on a vault-scoped settings page.** Acknowledged by the
  implementer in Q-022 and by an in-code comment. A user in two vaults sees the same passkey list
  under both, which reads as vault-specific but is not. Worth its own route eventually.
- **NB-5 — 8 unconsumed challenge rows persist locally.** Expired rows are only garbage-collected
  opportunistically on the next `create_passkey_challenge` call. Harmless (rows are useless once
  expired and `claim` checks expiry) but unbounded growth is possible on a quiet instance; a
  scheduled cleanup would be tidier.

---

## 9. Acceptance mapping

| Criterion (HS-020)                                                     | Status                                                                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Threat model / protocol / recovery model written before implementation | PASS — thorough, primary-sourced, correctly notes the dispatch-named Chrome URL 404s                |
| Server-generated single-use challenges                                 | PASS                                                                                                |
| Origin, RP ID, credential ID, public key, counter, transports verified | PASS                                                                                                |
| PRF output used only as KEK over the same master secret                | PASS                                                                                                |
| Recovery phrase and every passkey unlock the identical identity        | PASS                                                                                                |
| Never substitute/derive a new identity; entropy unchanged              | PASS                                                                                                |
| Passkey-only creation with recoverability clearly explained            | **FAIL — B-1** (warning text exists, but the phrase is never shown and the flow strands on failure) |
| Add multiple passkeys to an existing recovery identity                 | PASS                                                                                                |
| List / revoke / re-authenticate with no silent downgrade               | **FAIL — B-2**                                                                                      |
| Unsupported PRF gets a clear recovery fallback                         | PARTIAL — correct on `/unlock`; broken on the `/new-user` failure path (B-1)                        |
| Server stores only metadata + encrypted wrapped secret                 | PASS                                                                                                |
| Secrets zeroized, absent from logs/URLs/evidence                       | PASS                                                                                                |
| OR layout semantic and accessible                                      | PASS — real `role=separator`, 20.17:1 contrast, keyboard-operable, no 320px overflow                |

---

## 10. Verdict and required actions for revision 02

**FAIL** on 2 blocking findings, both concentrated in the client-side creation and revocation
journeys. The cryptographic protocol, server verification, migration, RLS posture, secret-safety
controls and test discipline are all sound and should be preserved unchanged; the entirety of
sections 2–5 above re-passes as-is. The remediation is confined to:

1. **B-1** — reorder the passkey-only creation flow so no server identity is registered before the
   ceremony succeeds; release the busy state and surface the error on failure; ensure the recovery
   phrase is shown or revealable; tighten the cancellation E2E to assert what its name claims.
2. **B-2** — prevent last-credential revocation from silently destroying a passkey-only vault; add
   counterfactual coverage.

Re-review should cover the original BASE `e72befd` through the new HEAD.

---

## 11. Q-proposals

### Q-PROPOSAL-P19-01R-01 — Should a passkey-only account be allowed to exist without the user ever seeing the recovery phrase?

- Raised by/package/revision: `human_scratch_reviewer` / P19 / 01
- Context and evidence: The passkey-only flow generates a full-entropy BIP39 phrase, uses it to
  derive the master seed, then discards it without display. No surface in the authenticated app can
  reveal it. Combined with B-1 and B-2 this makes several routes to permanent, silent data loss. The
  evidence file (§3) states the phrase should be surfaced as "optional but recommended, revealed on
  demand" — that surface was not built.
- Why existing authority does not decide it: HS-020 requires passkey-only creation "where
  recoverability is clearly explained"; it does not say whether explaining the loss risk suffices,
  or whether the phrase must be obtainable.
- Options considered: (a) show the phrase during passkey-only creation; (b) add a reveal-phrase
  surface to settings, phrase-gated; (c) status quo — warning text only.
- Reversible default selected to continue: recommend (b) plus B-1's reordering; (a) adds friction to
  the flow whose selling point is avoiding phrase handling.
- Decision-hierarchy basis: #3 (preservation of user data) over #4.
- Impact and risk: High — this is the difference between a recoverable and an unrecoverable vault.
- Reversal or migration path: Additive UI; no schema or protocol change.
- Human review still useful after completion: Yes — this is a genuine product-values call about how
  hard to push a phrase on a user who chose a passkey precisely to avoid one.

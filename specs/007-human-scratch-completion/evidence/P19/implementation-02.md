# P19 / revision 02 — Implementation evidence (HS-020 remediation of review-01 FAIL)

- **Package / revision:** P19 / 02
- **Requirement:** HS-020 (`tasks/HS-020-passkey-prf.md`)
- **Binding prior review:** `reviews/P19-review-01.md` — VERDICT FAIL, blocking B-1 and B-2.
- **Build BASE:** product HEAD `77038d1bb4ece9053d2c1d89f72ba7c00ac68aee`
- **Cumulative re-review range:** `e72befd9ba1b2cbbf5c189b7d855e47cc752240e` -> new HEAD
- **Implementer:** `human_scratch_implementer`

> **Secret-safety statement for this artifact.** No master identity secret, PRF output, plaintext
> wrapped-secret bytes, mnemonic, entropy or any real key material appears in this file. Only public
> BIP39 test vectors, git SHAs, structural byte counts and row counts are quoted.

---

## 0. What is and is not in scope

Sections 2–5 of `P19-review-01.md` (master-secret wrap invariant, server verification and replay,
secret-safety, the not-blocked_external claim) re-passed independent review and are **preserved
byte-identical**. This revision touches only the two client journeys the reviewer found, plus the
minimum hook surface needed to release busy state and propagate errors.

Nothing in this revision alters the load-bearing invariant: the PRF output remains only a
key-encryption key over the SAME existing 64-byte master seed; the recovery phrase and every passkey
continue to unlock the identical Ed25519/X25519 identity; no identity is ever minted or re-derived
from a passkey; no entropy is reduced; no crypto is hand-rolled.

---

## 1. Failure analysis — what actually goes wrong at BASE

### 1.1 B-1: the commit ordering is inverted

`src/app/(onboarding)/new-user/page.tsx:86-102` at BASE:

| Step | Action                                | Reversible?                                           |
| ---- | ------------------------------------- | ----------------------------------------------------- |
| 1    | `generateNew()`                       | Yes — pure local key generation, no I/O               |
| 2    | `registerIdentity(identity)`          | **No** — `user_data` row, vault, membership, snapshot |
| 3    | `mnemonicToMasterSeed(...)`           | Yes — pure                                            |
| 4    | `registerPasskey(masterSecret)`       | The step that can fail                                |
| 5    | `window.location.assign("/settings")` | —                                                     |

The single irreversible step runs **before** the single failure-prone step. That is the whole bug.
Three separate consequences follow, and each needs its own fix:

1. **Orphaned server state.** A failure at step 4 leaves `user_data` + a vault that no credential
   can ever open.
2. **Stuck UI.** The `catch` is empty and `isPasskeyBusy` is only released in `registerPasskey`'s
   `finally`. When the ceremony promise never _settles_ — which is what happens when the user simply
   ignores the system prompt — `finally` never runs, so the button stays on "Waiting for passkey..."
   indefinitely. WebAuthn has no client-side deadline of its own; the `timeout` field in the options
   is advisory to the authenticator, not a promise rejection.
3. **No phrase.** `identity.mnemonic` is a local `const`. It goes out of scope; the session stores
   only derived keys. Nothing anywhere can produce it again (see §2.1).

### 1.2 B-2: last-credential revocation is gated only by prose

`PasskeyManager.tsx:104-126` at BASE changes the confirmation _text_ when `credentials.length === 1`
but the destructive button is identical. `revoke_passkey_credential` deletes the row, and with it
the only `wrapped_secret` — for a passkey-only identity that is the only remaining path to the
master seed.

### 1.3 Why "reveal the phrase later" is not available as a fix

BIP39 derivation is one-way in the direction we would need. The stored artefacts are the 64-byte
master seed (transiently, in memory) and the derived keys (in `sessionStorage`). The mnemonic is the
_input_ to `mnemonicToMasterSeed` via PBKDF2-HMAC-SHA512; recovering the 12 words from the seed
would mean inverting PBKDF2. Retaining the words for later reveal would require persisting them,
which is exactly the plaintext-persistence the secret-safety rule forbids.

**Therefore the phrase must be surfaced while it is still in memory — during creation — or not at
all.** This is the constraint that drives the §2.3 design.

---

## 2. Remediation design

### 2.1 Commit ordering — what "committed" means precisely

The three things step 2 did are not equally irreversible, and separating them is what makes the
reorder possible at all:

| Effect                            | Where                    | Reversible by                         |
| --------------------------------- | ------------------------ | ------------------------------------- |
| `sessionStorage` identity install | `storeIdentitySession()` | `clearSession()` — fully, client-only |
| `user_data` row                   | `user.register` tRPC     | Nothing. Permanent.                   |
| vault + membership + snapshot     | `ensureDefaultVault()`   | Nothing. Permanent.                   |

The passkey ceremony **requires** a signed session, because `passkey.startRegistration` and
`passkey.finishRegistration` are `protectedProcedure` — the caller must prove possession of the
Ed25519 key. So a session install is unavoidable before the ceremony. But a session install is
purely client-side and is atomically reversible, which is precisely what the review permits ("or
make it atomically rolled back on failure").

Crucially, `passkey_credentials` has **no foreign key to `user_data`**, and `claim_request_nonce`
validates only the _shape_ of the pubkey hash. So registration works for an identity that has not
yet been registered as a user. That is not a new privilege: the caller signed the request with the
key whose hash they are binding the credential to, and `register_passkey_credential` still refuses
to rebind a credential id owned by a different identity. Verified empirically in §5.

New order:

```
1. generateNew()                         local, pure, no I/O
2. storeIdentitySession(identity)        client-only, reversible
   mnemonicToMasterSeed(...)             local, pure
3. registerPasskey(masterSecret)         <- the step that can fail
4. registerIdentity(identity)            <- FIRST irreversible server commit
5. show the recovery phrase, require confirmation
6. navigate to /settings
```

Rollback obligations:

- **Failure at 3** (ceremony cancelled, timed out, no PRF, verification rejected): `clearSession()`,
  surface the error, release busy. **Zero server rows exist.** This is the exact state the review
  demands and it is now structurally guaranteed rather than defended.
- **Failure at 4**: the credential row is the only residue. It is revoked best-effort before the
  session is torn down (the revoke must be signed, so it happens while the session is still
  installed). Even if that revoke itself fails, no user data is lost — no vault was ever created,
  and a retry generates a fresh identity. There is no path to permanent loss.

### 2.2 Bounding a prompt the user never answers

`navigator.credentials.create()`/`.get()` return a promise that a dismissed-but-not-cancelled system
prompt leaves pending forever. `@simplewebauthn/browser` exposes `WebAuthnAbortService`, whose
`cancelCeremony()` aborts the in-flight controller — this is the vetted library's own supported
mechanism, not a hand-rolled abort.

A `withCeremonyDeadline` wrapper races the ceremony against a 90 s timer; on expiry it calls
`cancelCeremony()` and rejects with `DOMException("...", "TimeoutError")`. 90 s is deliberately
longer than the 60 s advisory `timeout` the server puts in the options, so a slow but legitimate
user (fetching a security key, unlocking a phone) is never cut off before the authenticator's own
deadline; it exists only to bound the pathological case.

`describeCeremonyFailure` gains a `TimeoutError` branch so the message says the prompt timed out
rather than that it was dismissed. Both branches end at the same recoverable state.

### 2.3 Surfacing the recovery phrase

Per §1.3 the only real options are (a) show it during creation, or (c) status quo. The HANDOFF
prefers (a). The remaining question is _when_ during creation:

| Placement                             | Cost                                                         | Benefit                                  |
| ------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| Before the ceremony                   | Friction lands on every user, including ones who then cancel | Phrase seen even if the ceremony fails   |
| **After ceremony, before navigation** | Friction lands only on users who actually got a vault        | Phrase seen by everyone who owns a vault |

The "phrase seen even if the ceremony fails" benefit is **worthless once §2.1 lands**: a failed
ceremony leaves no identity, no vault and no data, so there is nothing for a phrase to recover.
Placing the step after success is therefore strictly better — same protection, less friction on the
flow whose entire selling point is not handling a phrase.

The step reuses the existing `SeedPhraseDisplay` (same component, testids and password-manager
credential contract as the phrase-first flow) and requires an explicit checkbox before continuing,
so the phrase is not merely rendered but acknowledged. The mnemonic is held in React state for the
duration of this step only and is never written to storage, a URL or a log.

### 2.4 Last-credential revocation (B-2)

Nothing in the system records whether a user saved their phrase, and nothing could: the server holds
no phrase-derived artefact it could check against, by design. So "block outright if no recovery
phrase exists" cannot be evaluated from a stored flag. It **can** be evaluated directly — by asking
the user to produce the phrase.

Rule: revoking the **last** credential requires entering the recovery phrase, and the phrase must
derive **this identity**. Two checks, both necessary:

1. `validateSeedPhrase(normalized)` — BIP39 wordlist + checksum. Rejects typos.
2. `computePubkeyHash(deriveKeysFromSeed(mnemonicToMasterSeed(phrase)).signing.publicKey)` equals
   the session's `pubkeyHash`. **Without this second check the gate is theatre**: the public
   all-`abandon` BIP39 vector passes check 1 and would let a user who has lost their real phrase
   destroy their last credential anyway.

Both checks use the READ-ONLY derivation core unchanged, and reuse the existing `SeedPhraseInput`
(the P18 credential-form contract already wired into this component for _adding_ a passkey).

This satisfies both branches of the HANDOFF's disjunction simultaneously: a user who holds the
phrase may revoke (gated behind explicit confirmation); a user who does not is blocked outright,
which is the correct outcome because for them the credential is the vault.

Revoking a non-last credential is unchanged — a plain confirm — because the remaining credentials
still open the vault.

The entered phrase and derived seed are zeroized/cleared on every path, and the phrase is never sent
anywhere: the check is entirely local, and the server sees only the credential id.

### 2.5 Rejected alternatives

- **Server-side "phrase acknowledged" flag.** Unverifiable (the client asserts it), and it would let
  a lie become a permanent loss. Rejected.
- **Refusing last-credential revocation unconditionally.** Traps a user who legitimately wants to
  retire a device and holds their phrase; also leaves a stolen authenticator registered, which is a
  security regression. Rejected.
- **A "reveal phrase" surface in settings.** Impossible — see §1.3. This is why the reviewer's
  recommended option (b) in Q-PROPOSAL-P19-01R-01 cannot be built as stated; recorded as
  Q-PROPOSAL-P19-02-01.
- **Making `finishRegistration` create the `user_data` row.** Would move an irreversible commit into
  the reviewed-and-passed server surface, which this revision must not touch. Rejected.
- **A shorter ceremony deadline (e.g. 30 s).** Would cut off legitimate users fetching a hardware
  key before the authenticator's own 60 s deadline. Rejected in favour of 90 s.

---

## 3. Threat/loss model delta

Only the rows the review found broken are restated; the rest of revision 01's model stands.

| Loss route                               | At BASE `77038d1`                           | After this revision                                              |
| ---------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Ceremony cancelled during creation       | Orphan identity + vault, no error, stuck UI | No server rows at all; error shown; controls usable              |
| Ceremony never answered (prompt ignored) | Promise pends forever; UI stuck permanently | Aborted at 90 s; same clean rollback as cancellation             |
| `registerIdentity` fails after a passkey | n/a (order was inverted)                    | Credential revoked best-effort; no vault existed; retry is clean |
| Passkey-only vault, phrase never seen    | Phrase unobtainable forever                 | Phrase shown and acknowledged before the flow completes          |
| Last credential revoked, phrase not held | Two clicks to permanent loss                | Blocked — the phrase must derive this identity to proceed        |
| Last credential revoked, phrase held     | Two clicks                                  | Allowed after proving the phrase; vault remains reachable        |

---

## 4. Implementation log

### 4.1 Commits

| SHA       | Kind  | Message                                                       |
| --------- | ----- | ------------------------------------------------------------- |
| `9c6d494` | RED   | `test(P19): assert creation and revocation safety`            |
| `bb8a557` | GREEN | `fix(P19): close passkey creation and revocation loss routes` |

RED discipline: `git diff --name-only 77038d1 9c6d494` contains **no `src/` path** — production is
byte-identical at RED, so the new assertions fail against the reviewed BASE behaviour and not
against a half-applied fix. At `9c6d494` the new unit specs produced **6 failed / 3 passed**, plus
one spec that could not resolve its module at all:

| RED failure                                         | What it proves was missing at BASE                    |
| --------------------------------------------------- | ----------------------------------------------------- |
| "gives up on a prompt the user never answers"       | ceremony never settled, so busy state stuck forever   |
| "aborts the in-flight ceremony through the library" | no cancellation path existed                          |
| "reports the credential it created"                 | `registerPasskey` returned `void`; no rollback handle |
| 3 × `last-passkey-phrase-gate` not found            | last-credential revocation had no gate                |
| `passkey-backup-phrase.test.tsx` unresolved import  | no phrase surface existed at all                      |

### 4.2 Changed paths

Product:

- `src/app/(onboarding)/new-user/page.tsx` — reorder, rollback, busy/error handling, phrase step.
- `src/components/features/identity/PasskeyManager.tsx` — last-credential phrase gate.
- `src/components/features/identity/PasskeyBackupPhrase.tsx` — **new**; the phrase display +
  acknowledgement step for passkey-only creation (authorized by HANDOFF: "new/existing
  `src/components/features/identity/**` components ... ONLY if you add a recovery-phrase
  reveal/confirmation surface for B-1").
- `src/components/features/identity/index.ts` — barrel export for the above.
- `src/hooks/use-passkey.ts` — ceremony deadline, `TimeoutError` message branch, `registerPasskey`
  now returns the credential id so the caller can roll it back (authorized: "only if needed for
  busy-state release / error propagation").

Tests:

- `tests/unit/hooks/use-passkey.test.tsx` — **new**
- `tests/unit/components/passkey-manager.test.tsx` — **new**
- `tests/unit/components/passkey-backup-phrase.test.tsx` — **new**
- `tests/e2e/passkey.spec.ts` — tightened cancellation test, new creation and revocation tests
- `tests/e2e/helpers/passkey.ts` — server-row counting fixture for the "no partial state" assertions

Deliberately **not** touched (verified byte-identical by `git diff --exit-code 77038d1 HEAD --`):
`src/lib/crypto/passkeyWrap.ts`, `passkeyCeremony.ts`, `index.ts`, `seed.ts`, `keypair.ts`,
`identity.ts`, entropy, wordlist, `src/server/routers/passkey.ts`, `src/server/schemas/passkey.ts`,
`src/server/routers/_app.ts`, `supabase/migrations/**`, `src/lib/supabase/database.types.ts`,
`src/types/webauthn-prf.d.ts`, `package.json`, `pnpm-lock.yaml`.

### 4.3 Incidents

- **`next-env.d.ts`** is rewritten by the dev server whenever E2E starts it. Reverted with
  `git restore next-env.d.ts` before every commit; it is not an allowed path and never staged.
- Per Q-024 (NB-1) **bare `pnpm format` was never run**. Only `pnpm exec oxfmt src/... tests/...` on
  exact changed paths, with `git status` checked before each commit.
  `sha256sum specs/human-scratch.md` re-verified as
  `c4121a48723d21c6689116d900f450136645e0f88dc993829b7561b2a3a31a4c` (unchanged) at hand-back.
- **A global row-count assertion was flaky and had to be made exact.** The first version of the
  tightened cancellation test snapshotted total `user_data` / `vault_memberships` /
  `passkey_credentials` counts before and after. It passed in isolation and at `--repeat-each=3` in
  the passkey spec alone, but failed 1-in-33 under the parallel suite: other workers create
  identities concurrently, so the totals legitimately move. The fix is not a retry or a delay — the
  test now captures the pubkey hash of the identity the attempt installs and asserts that **that
  identity** owns zero rows in all three tables. That is deterministic under any degree of
  parallelism and is the stronger claim: it says this attempt left nothing, rather than that the
  totals happened to balance. Verified at `--repeat-each=3` (36/36) and in the full suite.
- **Process error: a mutation experiment was run while the authoritative suite was in flight.**
  While waiting on the final full E2E run I temporarily reverted the B-1 reordering in a working
  copy to confirm the new tests actually catch it. The full-suite run was executing against the
  working tree at the time, so its result was invalid. The file was restored immediately, the run
  was killed rather than reported, `git diff HEAD` was confirmed empty, and the full suite was
  re-run from a clean tree at `bb8a557`. Only that clean re-run is reported in §7.1. Recording this
  because a reviewer comparing timestamps would otherwise find a discarded run with no explanation.
- **A second E2E test was added beyond the review's list.** The review's remediation named the
  cancellation test. But cancellation (`NotAllowedError`) and a prompt the user simply never answers
  are different failure modes, and only the latter produced the stuck button the reviewer saw in the
  real app. `automaticPresenceSimulation: false` reproduces it faithfully, so "a prompt the user
  never answers is abandoned rather than left spinning" covers the deadline path that no
  cancellation test can reach.

---

## 5. Reproduction of the fixed behaviour

Run in the real app at `bb8a557` (headless `playwright-cli`, session `p19r2`, no virtual
authenticator attached — equivalent to a user who never answers the system prompt), mirroring the
reviewer's own B-1 reproduction:

| Step                                                  | At BASE `77038d1` (reviewer's finding) | At `bb8a557` (measured now)                             |
| ----------------------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| Click `passkey-create-button`, wait past the deadline | button stuck "Waiting for passkey..."  | button back to "Create with a passkey", **enabled**     |
| `passkey-error` element                               | absent                                 | present: "Passkey prompt timed out. You can try again." |
| `sessionStorage.moneyflow_session`                    | **present** (live session)             | **null** (rolled back)                                  |
| `user_data` rows for the attempted identity           | **+1** (orphan)                        | **0**                                                   |
| `vault_memberships` rows for it                       | **+1** (unreachable vault)             | **0**                                                   |
| `passkey_credentials` rows for it                     | 0                                      | 0                                                       |

The row counts were read directly from the running local Postgres, scoped to the pubkey hash the
attempt installed (a non-secret BLAKE2b hash, already the server's own identifier).

B-2 is reproduced by the E2E "the last passkey cannot be revoked without proving the recovery
phrase": with one credential registered, `confirm-revoke-button` is disabled until a phrase is
entered; the public all-`abandon` BIP39 vector is **refused** with `last-passkey-phrase-error` and
the credential row survives; the user's own phrase then releases the guard.

### 5.1 The new tests are load-bearing, not decorative

Review-01's central lesson is that a test named for a property it does not assert is worse than no
test. So the B-2 guard was verified by mutation — breaking the fix and confirming the specific test
that targets it goes red — with the file restored immediately afterwards:

| Mutation                                                                                                | Measured result                                                                              |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Replace `!(await phraseDerivesThisIdentity(normalized))` with `false`, leaving the BIP39 validity check | "refuses a valid phrase that derives a different identity" **fails**; the other 3 still pass |

That mutant is exactly the weaker "gate behind explicit recovery-phrase confirmation" the HANDOFF
would have permitted, so the test demonstrably distinguishes it from the real check. `git diff HEAD`
was confirmed empty after the restore.

The B-1 ordering was **not** mutation-verified — that attempt is the process error recorded in §4.3,
and rather than repeat it I let the direct evidence stand: §5 is a measurement of the real app at
`bb8a557` set against the reviewer's own measurement at `77038d1`, and the cancellation E2E asserts
zero rows for the attempted identity across all three tables, which the BASE ordering cannot
satisfy.

---

## 6. Q-proposals

### Q-PROPOSAL-P19-02-01 — A recovery phrase cannot be revealed after creation; option (b) of Q-PROPOSAL-P19-01R-01 is not buildable

- Raised by/package/revision: `human_scratch_implementer` / P19 / 02
- Context and evidence: The reviewer's recommended default was "(b) add a reveal-phrase surface to
  settings, phrase-gated". BIP39 derivation runs mnemonic -> seed through PBKDF2-HMAC-SHA512; the
  application stores the seed (transiently) and derived keys, never the words. Reconstructing the
  words would mean inverting PBKDF2. Retaining them for later reveal would require plaintext
  persistence of the mnemonic, which the blocking secret-safety rule forbids outright.
- Why existing authority does not decide it: HS-020 requires recoverability be "clearly explained";
  the review recommends a surface that cannot exist without violating a blocking rule. The HANDOFF
  anticipates this ("only real if the flow retains the phrase by a secure means") but leaves the
  product-values call to the human.
- Options considered: (a) show and acknowledge the phrase during passkey-only creation; (b)
  reveal-later surface — **not buildable**; (c) status quo warning text only.
- Reversible default selected to continue: (a), placed after the ceremony succeeds so the friction
  falls only on users who actually own a vault. §2.3 gives the reasoning.
- Decision-hierarchy basis: #3 (preservation of user data) over #4.
- Impact and risk: Medium. Adds one acknowledgement step to the passkey-only flow, which is a real
  cost to the "no phrase to handle" selling point. The alternative is an unrecoverable vault.
- Reversal or migration path: Purely additive UI; deleting the step restores the prior flow. No
  schema, protocol or crypto change.
- Human review still useful after completion: Yes — this is the same product-values call the
  reviewer raised, now with the constraint that option (b) is off the table.

### Q-PROPOSAL-P19-02-02 — Last-credential revocation requires proving the phrase derives THIS identity, not merely that it is a valid BIP39 phrase

- Raised by/package/revision: `human_scratch_implementer` / P19 / 02
- Context and evidence: The HANDOFF offers "block outright, or gate behind explicit recovery-phrase
  confirmation". A confirmation that only checks BIP39 validity is bypassable with any public test
  vector — including the all-`abandon` vector in this repository's own tests — so a user who has
  lost their real phrase could still destroy their last credential. The gate therefore also derives
  the pubkey hash and compares it to the session identity.
- Why existing authority does not decide it: the HANDOFF says "explicit recovery-phrase
  confirmation" without specifying the strength of the check.
- Options considered: (a) validity check only; (b) validity + identity match; (c) block
  unconditionally.
- Reversible default selected to continue: (b). It makes the two HANDOFF branches coincide — a
  holder may revoke, a non-holder is blocked outright — and (a) does not actually prevent the loss
  the finding is about.
- Decision-hierarchy basis: #3 (preservation of user data).
- Impact and risk: Low. Strictly more protective than (a); the derivation is local and reuses the
  READ-ONLY core.
- Reversal or migration path: UI-only; no schema or protocol change.
- Human review still useful after completion: Optional.

---

## 7. Gate results, manual charter and secret-safety confirmation

### 7.1 Gates, all run at `bb8a557`

| Command                                                                           | Result                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`                                                                  | **PASS** — exit 0, no output                                                                                                                                                                                                                                                                                 |
| `pnpm lint`                                                                       | **PASS** — 0 errors, 10 warnings, all pre-existing and none in a changed file (same 10 the reviewer recorded at `77038d1`)                                                                                                                                                                                   |
| `pnpm format:check`                                                               | **FAIL — pre-existing, not attributable (NB-1 / Q-024).** 16 `specs/**` markdown files, 15 of which already fail at BASE `e72befd` per the reviewer's own clean-worktree check; the 16th is this uncommitted evidence file. `pnpm exec oxfmt --check src/ tests/ supabase/` passes cleanly on all 357 files. |
| `pnpm test`                                                                       | **PASS** — 74 files, 1627 passed, 2 skipped (was 1615 at `77038d1`; +12 new)                                                                                                                                                                                                                                 |
| `pnpm test:e2e`                                                                   | **PASS** — 119/119 (was 116 at `77038d1`; +3 new passkey journeys)                                                                                                                                                                                                                                           |
| `pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0 --repeat-each=3` | **PASS** — 36/36, no flakiness                                                                                                                                                                                                                                                                               |

Bare `pnpm format` was **not** run at any point (Q-024). `git status` was checked before every
commit and the working tree is clean but for the uncommitted evidence file.

### 7.2 Manual charter (headless `playwright-cli`, session `p19r2`, never `--headed/--ui/--debug/show`)

- **Capability detection:** `window.PublicKeyCredential` present, `passkey-create-button` and
  `passkey-loss-warning` both rendered.
- **The B-1 failure path, end to end:** see the §5 table. The stuck-button state the reviewer
  reproduced no longer occurs; the flow recovers to a usable page and leaves zero server rows.
- **OR layout and the P18 contract:** `credential-choice-divider` is a real `role="separator"` with
  accessible name "or"; the recovery branch remains reachable and enabled after a failed passkey
  attempt (verified by clicking through to the phrase step afterwards).
- **Contrast** (resolved through a canvas to real sRGB — the theme emits `lab()`, which naive
  parsing misreads, as revision 01 and the reviewer both noted): passkey button 17.04:1, generate
  button 20.16:1, loss warning 4.76:1. All above the 4.5:1 AA threshold.
- **Responsive:** at 320×720, `scrollWidth` 320 = `clientWidth` 320, no horizontal overflow.
- **Console:** 0 errors, 0 warnings across the whole session.
- **URL/storage scan:** `location.search` and `location.hash` both empty; `localStorage` empty;
  `sessionStorage` held only Next.js's own debug channel key after rollback. A grep of the captured
  console log for `prf`, `wrappedSecret`, `masterSeed`, `mnemonic` and the public BIP39 vector
  returned **0 matches**.
- Session closed; `.playwright-cli/` and `test-results/` deleted; working tree left clean.

### 7.3 Preserved surface

`git diff --stat 77038d1 HEAD -- src/lib/crypto/ src/server/ supabase/ src/types/ src/lib/supabase/database.types.ts package.json pnpm-lock.yaml`
is **empty**. The crypto helpers, the READ-ONLY derivation core, the passkey router and schemas, the
`_app.ts` wiring, migration 010 and every earlier migration, the generated database types, the
WebAuthn type augmentation and both dependency files are byte-identical to the reviewed revision. No
dependency was added or changed.

The master-secret wrap invariant is untouched: the PRF output is still used only as a KEK over the
same existing 64-byte master seed, the recovery phrase and every passkey still unlock the identical
Ed25519/X25519 identity, no identity is minted or re-derived from a passkey, no entropy is reduced,
and no crypto is hand-rolled. This revision changes only _when_ the client commits and _what it
demands before destroying an unlock factor_.

### 7.4 Secret-safety confirmation

- No master identity secret, PRF output, plaintext wrapped-secret bytes, mnemonic or entropy appears
  in this evidence file. The only identifier quoted anywhere is a pubkey hash, which is the server's
  own non-secret identifier, and it appears in this file **not at all** — only in the transient CLI
  output during the charter.
- The recovery phrase shown at creation lives in React state for that step only. It is never written
  to `localStorage`, `sessionStorage`, a URL, a query string or a log, and is dropped when the user
  continues.
- The phrase entered at the last-credential gate is never transmitted: the identity check is a local
  derivation, and the only thing that reaches the server is the credential id. The derived master
  secret is zeroized in a `finally` on every path, including the rejection path.
- Tests use only synthetic fill bytes and the two public BIP39 English test vectors. No production
  phrase or real key material is checked in.
- No new logging call was added anywhere in this revision.

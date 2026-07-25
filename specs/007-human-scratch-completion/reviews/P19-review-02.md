# P19 / revision 02 — Independent review (HS-020 WebAuthn PRF passkeys)

- **Reviewer:** `human_scratch_reviewer` (independent; did not implement this package)
- **Package / revision:** P19 / 02 — remediation of the review-01 FAIL
- **Requirement:** HS-020 (`tasks/HS-020-passkey-prf.md`)
- **Cumulative range reviewed:** BASE `e72befd9ba1b2cbbf5c189b7d855e47cc752240e` -> product HEAD
  `bb8a557d37190058c68b2cebfe721d3e15f18629`
- **Prior binding review:** `reviews/P19-review-01.md` — VERDICT FAIL, blocking B-1 and B-2
- **Git HEAD at review time:** `40b675f` (root docs-only; excluded from product review as
  instructed)

> **Secret-safety statement for this artifact.** No master secret, PRF output, plaintext
> wrapped-secret bytes, mnemonic or entropy appears in this file. The one pubkey hash quoted is the
> server's own non-secret BLAKE2b identifier for a throwaway identity that was never registered and
> owns zero rows.

---

## VERDICT: **PASS**

**Blocking findings: 0.** Both B-1 and B-2 are closed, and I confirmed each by mutation — breaking
the fix makes the specific test that targets it go red — rather than by reading the diff. The
preserved crypto/server/migration surface is byte-identical, so sections 2–5 of review-01 carry
forward unchanged. All gates re-run independently from a verified-clean tree.

Five non-blocking findings are recorded in §8. None is a route to data loss.

---

## 1. Range integrity and path discipline

`git diff 77038d1 bb8a557` covers exactly two implementer commits plus one root docs commit:

| SHA       | Author role | Kind      | Product paths touched                                |
| --------- | ----------- | --------- | ---------------------------------------------------- |
| `6d05811` | root        | docs      | ledgers + `reviews/P19-review-01.md` only — not mine |
| `9c6d494` | implementer | **RED**   | **none** — 5 test files only                         |
| `bb8a557` | implementer | **GREEN** | 5 product files + 2 test files                       |

`git diff --name-only 6d05811 bb8a557` returns exactly ten paths, all product/test:

```
src/app/(onboarding)/new-user/page.tsx
src/components/features/identity/PasskeyBackupPhrase.tsx     (new)
src/components/features/identity/PasskeyManager.tsx
src/components/features/identity/index.ts
src/hooks/use-passkey.ts
tests/e2e/helpers/passkey.ts
tests/e2e/passkey.spec.ts
tests/unit/components/passkey-backup-phrase.test.tsx         (new)
tests/unit/components/passkey-manager.test.tsx               (new)
tests/unit/hooks/use-passkey.test.tsx                        (new)
```

**Ruling: every path is inside the P19/02 HANDOFF allowlist.** Specifically:

- `PasskeyBackupPhrase.tsx` and `index.ts` are authorized by "new/existing
  `src/components/features/identity/**` components (plus its `index.ts`) — ONLY if you add a
  recovery-phrase reveal/confirmation surface for B-1". That is precisely what they are. The
  `index.ts` change is two additive export lines and nothing else (verified by diff).
- `use-passkey.ts` is authorized "only if needed for busy-state release / error propagation". The
  changes are the ceremony deadline, a `TimeoutError` message branch, and widening
  `registerPasskey`'s return from `void` to the credential id so the caller can roll it back. All
  three serve exactly that clause; no crypto or protocol logic moved.
- `settings/page.tsx` was **not** touched this revision. The Q-022 deviation I ruled acceptable in
  review-01 stands unchanged from `77038d1`; nothing new to rule on.

**Forbidden writes: none.** The implementer commits touch zero files under `specs/`, `tasks/`,
`.claude/`, `.codex/`, or any ledger or review (`git diff --name-only 6d05811 bb8a557 -- specs/`
returns 0 lines). The frozen scratch is untouched — it is not in the changed set at all.

**RED→GREEN is genuine, verified by me not by report.** `9c6d494` touches no `src/` path, so
production is byte-identical to the reviewed BASE at RED. I checked out `9c6d494` in a separate
worktree and ran the three new unit specs there:

```
Test Files  3 failed (3)
     Tests  6 failed | 3 passed (9)
```

That matches the implementer's claim exactly. The assertions therefore fail against the reviewed
`77038d1` behaviour and not against a half-applied fix.

---

## 2. Preserved surface — sections 2–5 of review-01 carry forward

Root asked me to verify rather than take its word:

```
git diff 77038d1 bb8a557 -- src/lib/crypto/ src/server/ supabase/ src/types/ \
    src/lib/supabase/database.types.ts package.json pnpm-lock.yaml
```

**Output: 0 lines. Empty.**

So the following are byte-identical to the revision I already passed on those axes, and my review-01
findings stand without re-derivation:

- **§2 master-secret wrap invariant — HOLDS.** `passkeyWrap.ts`, `passkeyCeremony.ts`, and the
  READ-ONLY derivation core (`seed.ts`, `keypair.ts`, `identity.ts`, entropy, wordlist) are
  unchanged. PRF output remains only a KEK over the same pre-existing 64-byte master seed; no
  identity is minted from a passkey; entropy is unchanged; no crypto is hand-rolled. Migrations
  005–010 unchanged.
- **§3 server verification and replay — HOLDS.** `src/server/routers/passkey.ts`,
  `src/server/schemas/passkey.ts` and the `_app.ts` wiring are unchanged: server-side origin/RP
  resolution, single-use challenges via `claim_passkey_challenge`, the `GREATEST` counter, uniform
  `rejectCeremony`, and the Zod refinement that actively rejects any payload containing `prf`.
- **§4 secret-safety at the crypto/server boundary — HOLDS.** The single `stripPrfResults`
  chokepoint is unchanged and is still the only path by which a ceremony response reaches the wire.
- **§5 "not blocked_external" — HOLDS, and is reconfirmed live.** No dependency changed
  (`package.json` and `pnpm-lock.yaml` both empty in the diff), so the CDP virtual authenticator
  still drives a real PRF ceremony with no mocking. I re-ran the full passkey spec myself (§6) and
  the live DB still shows genuine verified COSE credentials that a faked ceremony could not produce.

Revision 02's changes are confined to _when the client commits_ and _what it demands before
destroying an unlock factor_. That is the correct blast radius for this remediation.

---

## 3. B-1 — closed. Verified by mutation AND by re-running my own review-01 reproduction.

### 3.1 The fix

`new-user/page.tsx:94-128` now orders the flow:

```
1. generateNew()                     local, pure, no I/O
2. storeIdentitySession(attempted)   client-only, reversible
   mnemonicToMasterSeed(...)         local, pure
3. registerPasskey(masterSecret)     <- the step that can fail
4. registerIdentity(attempted)       <- FIRST irreversible server commit
5. phrase shown + acknowledged
6. navigate
```

The session install before the ceremony is unavoidable — `passkey.startRegistration` and
`finishRegistration` are `protectedProcedure` and require a signed request — but it is purely
client-side and `clearSession()` in the catch undoes it completely. This is exactly the "or make it
atomically rolled back on failure" branch review-01 permitted. **The irreversible step is now
strictly after the failure-prone step, which is the structural property the finding demanded.**

The empty catch is gone: it now best-effort revokes the credential (re-installing the session first,
because a failing `registerIdentity` tears the session down on its way out — I checked
`use-identity.ts:286`, which calls `clearIdentityClientState()` in its own catch, so this
re-installation is necessary and not superstition), then clears the session. Errors surface through
the hook state, which the page renders under `data-testid="passkey-error"`.

The never-answered prompt is bounded by `withCeremonyDeadline` (`use-passkey.ts:65-81`): a 90 s race
that calls `WebAuthnAbortService.cancelCeremony()` — the vetted library's own supported abort, not a
hand-rolled one — and rejects with a `TimeoutError`. 90 s is deliberately longer than the 60 s
advisory timeout in the server options, so a user fetching a hardware key is not cut off.

### 3.2 Mutation verification — the test is load-bearing

In an isolated worktree at `bb8a557` I restored the BASE ordering (`registerIdentity` before the
ceremony) and ran the cancellation E2E:

```
1) a cancelled ceremony leaves the user on a usable page with no partial state
   > the attempted identity owns no server row of any kind
   Expected: 0
   Received: 1        (footprint.users)
```

**The orphan reappears the instant the ordering is inverted, and the test catches it.** This is the
exact defect review-01 found, and the tightened test now detects it — where the old test, which
asserted only that an error was visible, passed straight over it.

I also mutated `withCeremonyDeadline` to return the bare ceremony (BASE behaviour). Two unit tests
went red: "gives up on a prompt the user never answers" and "aborts the in-flight ceremony through
the library". The deadline is likewise pinned by tests that actually fail without it.

### 3.3 My own review-01 §7 reproduction, re-run at `bb8a557`

Headless `playwright-cli` session `p19r2`, no virtual authenticator attached — a user who never
answers the system prompt. Same procedure as review-01, same tooling.

| Observation                         | At `77038d1` (review-01)          | At `bb8a557` (measured now)                                 |
| ----------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Button after the deadline           | stuck "Waiting for passkey..."    | **"Create with a passkey", `disabled: false`**              |
| `passkey-error`                     | **absent**                        | **present**: "Passkey prompt timed out. You can try again." |
| `generate-button`                   | (n/a)                             | `disabled: false` — recovery branch not blocked             |
| `sessionStorage.moneyflow_session`  | **present** (live orphan session) | **`null`**                                                  |
| `user_data` for attempted identity  | **+1**                            | **0**                                                       |
| `vault_memberships` for it          | **+1**                            | **0**                                                       |
| `passkey_credentials` for it        | 0                                 | **0**                                                       |
| `location.search` / `location.hash` | —                                 | both empty                                                  |
| `localStorage`                      | —                                 | empty                                                       |
| Console errors                      | —                                 | **0**                                                       |

Global table counts before and after the attempt were identical (`user_data` 1074, distinct
`vault_memberships` 1074, `passkey_credentials` 196) — the attempt left _nothing_.

I additionally queried the DB **while the ceremony was still pending** and found 0/0/0 for the
attempted identity. That is the structural claim rather than the rollback claim: no server row ever
existed to be cleaned up. The rollback path is a belt-and-braces second line, not the primary
defence.

Finally I clicked `generate-button` after the failed attempt and reached "Your Recovery Phrase" with
the confirm checkbox visible — **the user is never trapped in a dead end**, which is the HS-020
acceptance criterion the original defect violated.

**B-1 is closed.**

---

## 4. B-2 — closed. The gate is not theatre; a validity-only bypass is impossible.

### 4.1 The fix

`PasskeyManager.tsx:92-120`. When `credentials.length === 1`, revocation requires **two** checks:

1. `validateSeedPhrase(normalized)` — BIP39 wordlist + checksum;
2. `phraseDerivesThisIdentity(normalized)` — derives the master seed, derives the signing key, and
   compares `computePubkeyHash(keys.signing.publicKey)` against `getSessionPubkeyHash()`.

Both must pass or the mutation never fires. The confirm button is additionally disabled while the
field is empty, so the gate cannot be clicked past blindly.

### 4.2 A validity-only bypass is not possible — verified by mutation

Root asked specifically whether the all-abandon vector could pass. I tested it two ways.

**Mutation:** I replaced the compound condition with `if (!validateSeedPhrase(normalized))` — i.e.
exactly the weaker "gate behind explicit recovery-phrase confirmation" that the HANDOFF's
disjunction would have permitted — and ran the unit spec:

```
Tests  1 failed | 3 passed (4)
  ✗ refuses a valid phrase that derives a different identity
```

The test that targets this property is the _only_ one that fails, which is the signature of a
precise, load-bearing assertion rather than an incidental one.

**Direct probe:** the E2E "the last passkey cannot be revoked without proving the recovery phrase"
fills the gate with the public all-`abandon` BIP39 vector — checksum-valid, derives a real but
different identity — clicks confirm, and asserts `last-passkey-phrase-error` appears **and** the
credential row survives (`toHaveCount(1)`). It then supplies the user's own phrase and asserts the
row goes to 0. That is the exact adversarial vector root named, tested from both sides.

The unit spec covers the same property with two distinct public vectors, plus the negative control
that a **non-last** credential is revocable with a plain confirm (no phrase demanded) — so the guard
is scoped to the destructive case and does not add friction where the vault stays reachable.

Note the check is entirely local: `phraseDerivesThisIdentity` performs derivation in the browser and
compares against session state. The phrase is never transmitted; only the credential id reaches the
server. The derived master secret is zeroized in a `finally` on every path including rejection.

`getSessionPubkeyHash()` returns `string | null`. A `null` session would make the comparison fail
closed (a hash can never equal `null`), so an unauthenticated edge case blocks revocation rather
than permitting it. Fail-closed is the correct direction here.

**B-2 is closed.**

### 4.3 The loss-route loop now closes

Taking B-1 and B-2 together, I traced every remaining route to permanent loss of a passkey-only
vault and found none:

| Route                                                | Status                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Ceremony cancelled / timed out / never answered      | No server rows exist. Nothing to lose.                             |
| `registerIdentity` fails after the credential exists | Credential revoked best-effort; no vault was created; retry clean. |
| Vault created, phrase never seen                     | Phrase shown and acknowledged before the flow completes.           |
| User abandons at the phrase step                     | Vault exists **and the passkey opens it** — no loss, see NB-3.     |
| Last credential revoked without the phrase           | Blocked; the phrase must derive this identity.                     |
| Last credential revoked holding the phrase           | Allowed; the phrase still opens the vault.                         |

---

## 5. Secret-safety across the new phrase-display and phrase-confirmation code

**Assessment: no leak. Not a blocking finding.**

Static scan of all five changed product files:

- **Logging:** `grep -n "console\.|logger\."` across all five returns **NONE**. No logging call was
  added anywhere in this revision.
- **Persistence:** `grep` for
  `localStorage|sessionStorage|document.cookie|indexedDB|searchParams| location.search|history.push`
  across the five returns **no direct call**. The only storage interaction is via
  `storeIdentitySession` / `clearSession`, which are the pre-existing, previously reviewed helpers
  that store **derived keys only** — never the mnemonic, never the master seed, never the PRF
  output.
- **Zeroization:** every path that materializes a master secret zeroizes it in a `finally` —
  `new-user/page.tsx:126`, `PasskeyManager.tsx:67` and `:88`, `use-passkey.ts:216`, `:262`, `:263`.
  Both new secret-touching paths (the creation flow and the revocation gate) are covered.

**The creation phrase does not persist beyond its step.** `mnemonic` lives in React state for the
`passkey-phrase` step only, and `handlePasskeyPhraseAcknowledged` sets it to `null` _before_
`window.location.assign("/settings")` — so the full navigation that follows discards the component
tree with the state already cleared. It is never written to storage, a URL or a log.

**No URL exposure.** The passkey branch does no form submission and no query-string navigation. I
measured `location.search` and `location.hash` live: both empty.

**Reused components carry no leak.** `SeedPhraseDisplay` and `SeedPhraseInput` are pre-existing and
**untouched by P19** (`git diff e72befd bb8a557` on both is empty). `SeedPhraseDisplay` has one
`console.error("Failed to copy:", err)` on the clipboard path — it logs the _error_, not the
mnemonic, and it predates this feature entirely. `SeedPhraseInput` uses
`autoComplete="current-password"` on the combined field, which is the deliberate password-manager
contract established in P18.

**Live measurement.** Across the whole manual charter the captured console log contained **0
errors** and **0 matches** for `prf`, `mnemonic`, `masterSeed`, `wrappedSecret` or the public BIP39
vector. `localStorage` was empty; `sessionStorage` held only Next.js's own debug-channel key after
rollback.

**Test fixtures use public material only.** All three new unit specs use the two public BIP39
English test vectors, synthetic fill bytes (`.fill(7)`, `.fill(9)`), and a synthetic PRF output. No
real key material is checked in. The E2E uses the all-abandon vector as an adversarial probe, which
is precisely the right use for a public vector.

**This review artifact leaks nothing.** The single pubkey hash quoted is a non-secret BLAKE2b
identifier for a throwaway identity that was never registered and owns zero rows.

---

## 6. Gates — all re-run by me, from a verified-clean tree

Before starting I confirmed `git status --porcelain` showed only the untracked evidence directory
and `git diff HEAD` was **empty**. I did not rely on any implementer-reported number. Per root's
note about the implementer's disclosed mid-run tree mutation, every figure below is my own.

| Gate                                                                              | My result                                                                  |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                  | **PASS** — exit 0, no output                                               |
| `pnpm lint`                                                                       | **PASS** — 0 errors, 10 warnings                                           |
| `pnpm format:check`                                                               | **FAIL on `specs/**` only — pre-existing, NOT attributable (see below)\*\* |
| `pnpm exec oxfmt --check src/ tests/ supabase/`                                   | **PASS** — all 357 files correctly formatted                               |
| `pnpm test`                                                                       | **PASS** — 74 files, **1627 passed, 2 skipped**                            |
| `pnpm test:e2e`                                                                   | **PASS — 119/119** (2.6m)                                                  |
| `pnpm exec playwright test tests/e2e/passkey.spec.ts --retries=0 --repeat-each=3` | **PASS — 36/36**, zero flakes (1.8m)                                       |

**119/119 independently confirmed.** The implementer's reported number is correct, but I did not
take it on trust — I ran the full suite myself from a clean tree and watched it complete. The tree
was clean at start and the only working-tree change afterwards was `next-env.d.ts`, which the dev
server rewrites on every E2E start; I restored it with `git checkout`.

**The `format:check` failure is confirmed not attributable.** I checked out BASE `e72befd` in a
separate worktree and ran `oxfmt --check specs/` with the repo config present: **the same 15 files
already fail at BASE.** At HEAD the count is 16, and the extra one is the implementer's own
uncommitted `evidence/P19/implementation-02.md`, which is not a committed artifact. The implementer
also touched **zero** `specs/` files (verified by `git diff --name-only 6d05811 bb8a557 -- specs/`
returning 0 lines), so it could not have caused or fixed this. It is Q-024/NB-1, and correctly left
alone.

I found **no evidence** of the invalidated run in the committed state: the tree at `bb8a557` is
clean, `git diff HEAD` is empty, and my own from-scratch runs reproduce the reported numbers. The
disclosure was appropriate and the recovery was correct.

---

## 7. Q-proposals — assessment

Both are product-values calls for the human, not blockers. My independent read:

**Q-027 / Q-PROPOSAL-P19-02-01 (reveal-in-settings unbuildable; phrase shown at creation).** The
technical claim is **correct**, and it invalidates my own review-01 recommendation. BIP39 runs
mnemonic → seed through PBKDF2-HMAC-SHA512; the app stores the seed and derived keys, never the
words. Reconstructing them means inverting PBKDF2. Retaining them for later reveal means persisting
a mnemonic in plaintext, which the blocking secret-safety rule forbids outright. So option (b) is
genuinely off the table and I withdraw it. **Option (a) is the right call**, and placing it _after_
ceremony success rather than before is better reasoning than I gave: a failed ceremony now leaves no
vault, so a phrase shown beforehand would protect nothing while imposing friction on users who never
get an account. Sound.

**Q-028 / Q-PROPOSAL-P19-02-02 (derive-and-match rather than validity-only).** **Sound, and strictly
stronger than what the HANDOFF required.** The HANDOFF offered a disjunction — block outright _or_
gate behind confirmation — and the implementer noticed that the weaker branch does not actually
prevent the loss the finding is about, because any public vector satisfies a validity check.
Deriving the identity makes the two branches coincide: a holder may revoke, a non-holder is blocked
outright. My mutation test in §4.2 confirms the distinction is real and tested, not asserted. This
is the correct resolution and I would not want it weakened.

---

## 8. Non-blocking findings

**NB-1 — `pnpm format:check` still fails on 15 pre-existing `specs/**` files.\*\* Carried forward
from review-01; tracked as Q-024. Not attributable to P19 and correctly not fixed here, since the
fix would rewrite the frozen scratch and root ledgers. Root's to schedule.

**NB-2 — The best-effort credential revoke on `registerIdentity` failure is unverified by test.**
`new-user/page.tsx:119-122` re-installs the session and revokes the credential when the server
registration fails after the ceremony. That path has no test — it is genuinely awkward to provoke —
and the implementer says so plainly. The residual is small and bounded: a stranded
`passkey_credentials` row bound to an identity with no `user_data` and no vault. No user data is at
risk because no vault was ever created, and a retry generates a fresh identity. Worth a cleanup job
or a test if this area is revisited; not a loss route.

**NB-3 — A user can abandon the flow at the phrase step, and the phrase is then unobtainable.**
There is no `beforeunload` guard on the `passkey-phrase` step, so closing the tab there leaves a
vault whose phrase was displayed but not necessarily saved. This is **not a loss route**: the
passkey exists and opens the vault, and B-2's gate now prevents that passkey from being destroyed
without the phrase. So the loop still closes. But such a user is effectively single-factor, which is
the state Q-027 exists to inform the human about. Recording it so the human's decision is made with
the full picture.

**NB-4 — The 90 s deadline is a hard-coded module constant.** `CEREMONY_DEADLINE_MS` in
`use-passkey.ts:57`. The rationale for the value is documented well and 90 s is the right choice
(longer than the 60 s advisory server timeout). The cost is that the "prompt never answered" E2E
must wait out the real deadline, needing `test.setTimeout(180000)` and contributing ~90 s to the
suite. Making it injectable would let that test run fast — but would also let it test a different
thing, so the implementer's tradeoff is defensible. Noted only as future maintenance.

**NB-5 — The credential-id return widens `registerPasskey`'s contract slightly beyond "error
propagation".** `Promise<void>` → `Promise<string>`. Strictly speaking this is a rollback-handle
change rather than a busy-state or error change, so it sits at the edge of the HANDOFF's "only if
needed for busy-state release / error propagation" clause. I rule it **within scope**: the rollback
is inseparable from the error-handling fix B-1 demanded, since without the handle the catch block
cannot undo what it needs to undo. Additive, typed, and covered by a unit test. No action needed.

---

## 9. Acceptance criteria (HS-020) — final mapping

| Criterion                                                    | Status | Evidence                                                                               |
| ------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------- |
| Threat model stated before implementation                    | MET    | evidence §1–§3; loss-model delta table                                                 |
| Same-identity invariant (passkey wraps existing master seed) | MET    | §2 — preserved surface empty; E2E asserts identical pubkey hash across both factors    |
| Passkey-only creation with recoverability clearly explained  | MET    | `passkey-loss-warning` before creation; `PasskeyBackupPhrase` after; both E2E-asserted |
| List / revoke / re-auth with no silent downgrade             | MET    | PRF-incapable credential hard-fails; last-credential revocation gated on real phrase   |
| Unsupported-PRF fallback, never trapped                      | MET    | §3.3 — recovery branch reachable and enabled after a failed passkey attempt            |
| Server verification, replay resistance                       | MET    | §2 — unchanged from the review-01 PASS on this axis                                    |
| Secret-safety                                                | MET    | §5 — no leak, statically or in live measurement                                        |

---

## 10. Reviewer's write boundary

The only file I created or modified is this review,
`specs/007-human-scratch-completion/reviews/P19-review-02.md`. I edited no product code, no test, no
ledger, no task, no scratch, no `.claude`/`.codex` file, and not the prior review. Two throwaway git
worktrees used for mutation and RED verification were removed and pruned; `git worktree list` shows
only the main tree. `next-env.d.ts`, rewritten by the dev server, was restored. `.playwright-cli/`
and `test-results/` were deleted. The working tree is clean apart from the implementer's untracked
evidence directory.

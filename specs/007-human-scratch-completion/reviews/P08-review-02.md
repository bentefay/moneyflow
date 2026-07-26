# P08 review 02 — independent reviewer (`p08-reviewer-01`)

## VERDICT: PASS

- **Blocking findings: 0**
- **B-2 (the sole rev-01 blocker): CLOSED** — reproduced RED with the fix stashed, GREEN with it
  restored.
- **Flagged design call: RULED a defensible implementation choice, NOT a scope reduction.** The
  implementer's `realtime-recovery:108` regression claim **reproduces under controlled experiment**
  (4/6 failures markerless vs 18/18 pass as shipped). Reasoning recorded in §4 — no scope question
  needs routing to root.
- Review range: BASE `d2762f9` -> HEAD `d40b854`, restricted to the 6 authorized paths. Docs commits
  `565cbd8` / `2bf89b3` in the range are `specs/**` only and were excluded from the code review
  (their HANDOFF text was read as the binding dispatch).
- Everything below was reproduced by this reviewer. Nothing is accepted on the implementer's
  narrative.

---

## 1. Delta integrity and hard boundary (independently reproduced)

`git diff --name-status d2762f9 d40b854` over `src`/`tests` returns exactly the 6 authorized paths
and no others:

| Path                                                     | Verdict                       |
| -------------------------------------------------------- | ----------------------------- |
| `src/app/(onboarding)/invite/[token]/page.tsx`           | in-domain (invite acceptance) |
| `src/components/providers/vault-provider.tsx`            | in-domain (linkage reconcile) |
| `src/lib/vault/pending-person-link.ts`                   | in-domain (marker durability) |
| `src/components/features/vault/AccessMembersSection.tsx` | in-domain (N-4a copy only)    |
| `tests/e2e/invite-redemption.spec.ts`                    | test                          |
| `tests/integration/membership-remove-authz.test.ts`      | test (new)                    |

- **HARD BOUNDARY: EMPTY diff CONFIRMED.**
  `git diff --stat d2762f9 d40b854 -- supabase/migrations src/server/routers src/lib/realtime src/server/schemas '*realtime*'`
  produced **no output**. No migration, no `vault_ops` change, no router change of any kind in the
  delta.
- **No epoch machinery.** Grepping the whole delta for
  `epoch|access_generation|exact_operation_id|frontier|journal|saga|fence` returned **zero hits**.
- Note: repo HEAD is `d08deb1` (one docs-only commit past `d40b854`); the reviewed code is unchanged
  by it.

---

## 2. PRIMARY QUESTION — is B-2 genuinely CLOSED? **YES**

### 2.1 The member is delivered into the SHARED vault

Traced the mechanism rather than trusting the comment:

- `invite/[token]/page.tsx:195-203` — `handleAccept` now calls `markPendingPersonLink(vaultId)`
  **and `setActiveVaultStorage({ id: inviteInfo.vaultId })` before `router.push("/transactions")`**.
- I verified the claim in the code comment that this page "renders outside ActiveVaultProvider".
  `ActiveVaultProvider` is mounted only at `src/app/(app)/layout.tsx:92`; the invite page lives in
  the separate `(onboarding)` route group. So the React context provider genuinely does **not**
  exist on the invite page, and writing through the storage helper is the correct mechanism, not a
  shortcut.
- `active-vault-provider.tsx:91-94` seeds its `useState` **synchronously from localStorage on first
  render**, and `setActiveVaultStorage` (`:153-167`) writes the same `moneyflow_active_vault` key in
  the same JSON shape `setActiveVault` (`:98-110`) uses. So the navigation into `(app)` mounts the
  provider already pointed at the shared vault — no flash, no race with the reconciler at
  `vault-provider.tsx:128-140`.

### 2.2 RED -> GREEN proof (the decisive experiment)

I stashed **only** the fix line and re-ran the new test:

- **RED (fix removed):** FAILED at `invite-redemption.spec.ts:110` — member's active vault was
  `6f252d7a-…` (their own) where `94bf475c-…` (shared) was required. This is precisely the B-2
  signature I set in rev-01.
- **GREEN (fix restored, `git diff` empty):** `--repeat-each=3 --retries=0` -> **6/6 passed**.

The test is a real guard, not a tautology, and the repeat/retries-disabled claims hold.

### 2.3 The E2E asserts the right things

`invite-redemption.spec.ts:79-127` asserts from the **member's own context**: shared vault active
(`:110`), self `"You"` + owner `"Linked"` on the member's People page (`:114-115`), **no raw pubkey
hash rendered** (`:118`, `toHaveCount(0)` against the real owner hash read from the browser), and
bidirectional convergence on the owner's page (`:122-123`). That is materially stronger than the
rev-01 test, which asserted only on a server row and passed while B-2 was live.

---

## 3. Is the permanent-miss fragility actually REMOVED? **YES**

`pending-person-link.ts` changed from a one-shot `sessionStorage` consume to `localStorage` with
check-and-clear-on-confirmation. Verified against the real semantics:

| Property                                           | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Survives refresh / restart                         | `markPendingPersonLink` -> `localStorage.setItem` (`:30-33`); `sessionStorage` is gone from the file entirely.                                                                                                                                                                                                                                                                                                                                           |
| Shared across tabs                                 | localStorage is origin-scoped and shared; the old sessionStorage was per-tab.                                                                                                                                                                                                                                                                                                                                                                            |
| Mid-failure retries                                | `vault-provider.tsx:225-236` — `clearPendingPersonLink` is placed **after** `awaitLocalPersistence()` + `forceSync()`. Either throw propagates to the `catch` at `:257` and the clear is never reached, so the marker stays and the next open retries. Read the control flow directly to confirm there is no `finally` that would defeat this.                                                                                                           |
| Concurrent tabs / re-accept converge to ONE Person | `person.ts:82-88` returns the existing linked person unchanged before any create; the id is deterministic (`deriveMemberPersonId` -> `person-member-${pubkeyHash}`, `:54-56`), so two tabs writing concurrently write the **same CRDT map key** and merge rather than fork. Covered by `person.test.ts:83` (idempotence), `:170` (distinct members -> distinct persons), and `ensure-member-person-linked.test.ts:52` ("second call reports no change"). |
| Already-linked open is a no-op                     | `ensureMemberPersonLinked` returns a changed-flag via version-vector comparison; on a no-change the `forceSync()` branch is skipped entirely (`:231-234`), so no redundant synced op is emitted.                                                                                                                                                                                                                                                         |
| No raw pubkey hash ever renders                    | `resolvePersonDisplayName` (`person.ts:41-50`) chains name -> `memberFallbackName` (first 8 chars only, `:33-35`) -> `"Unnamed"`. Asserted end-to-end at `invite-redemption.spec.ts:118`.                                                                                                                                                                                                                                                                |

The "single miss is permanent" defect I raised in rev-01 is genuinely gone: the only path that
retires the marker is one where the Person is already durably persisted and pushed.

---

## 4. FLAGGED DESIGN CALL — ruling: **(a) legitimate; PASS**

The question: is retaining an acceptance marker a legitimate product signal, or is product behavior
being contorted to satisfy a test fixture?

**I did not take the implementer's framing. I built the markerless variant myself and ran a
controlled A/B.** I replaced the `hasPendingPersonLink(...)` gate in `vault-provider.tsx` with an
unconditional reconcile on every shared-vault open, changing nothing else:

| Variant                          | `realtime-recovery.spec.ts` `--repeat-each=6 --retries=0 --workers=1`                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Markerless (my patch)**        | **4 FAILED / 18** — all four at `:159`, the hidden receiver never converging on the missed tag |
| **As shipped (marker retained)** | **18/18 PASSED**                                                                               |

(Note: markerless passed 3/3 at `--repeat-each=3` with parallel workers — the regression only
surfaces under serial repetition. A reviewer who ran the implementer's exact reproduction and
stopped there would have wrongly called this a rationalization. It is not: **the claimed regression
is real.**)

**(c) The claim reproduces.** Mechanism confirmed by reading `shareActiveVaultWithMember`
(`tests/e2e/helpers/realtime.ts:214-265`): the fixture inserts a `vault_memberships` row **directly
via the admin client** and sets the receiver's active vault in localStorage. Under markerless, that
fixture receiver — who never accepted an invite — materializes a Person and emits a synced
`vault_ops` op at exactly the moment the test is suppressing and counting `vault_ops` pushes,
perturbing the very timing under measurement.

**(a) not (b) — the marker is a genuine product signal, and I hold this independently of the test.**
The discriminator "this user actually accepted an invite" is not a test artifact; it is a real
distinction with real product consequences:

- `PeopleTable.tsx:70-74` gives users a **delete** affordance that soft-deletes a Person
  (`deletedAt`), and `person.ts:85` deliberately **ignores a soft-deleted linked person and creates
  a fresh one** (asserted at `person.test.ts:109`). Under a markerless reconcile, a member who
  deliberately deletes their own auto-created Person would have it **resurrected on their very next
  vault open**, permanently and unfixably. The marker is what makes materialization a one-time
  consequence of an acceptance event rather than a standing invariant the user cannot escape.
- Membership can be created by means other than acceptance (the fixture proves one such path exists
  in the codebase; direct provisioning is another). "Materialize a Person because this user accepted
  an invite" is a narrower and more defensible trigger than "materialize a Person for whoever opens
  this vault."

**Against the HANDOFF's frozen intent.** The dispatch asks: "Make linkage reconcile whenever the
shared vault is opened (idempotent, re-runnable) rather than depending on a one-shot marker that is
never retried." The operative defect named there is **"a one-shot marker that is never retried"** —
and the parenthetical requirements are **idempotent, re-runnable**, with the explicit success
criterion "concurrent tabs / refresh / re-accept must still converge to a single Person." All of
that is met: the marker is no longer one-shot, it **is** retried on every open until the Person is
confirmed durable, the reconcile is idempotent, and convergence holds. The literal phrase "whenever
the shared vault is opened" describes the mechanism the implementer was steering toward, but the
named defect and every stated acceptance criterion are satisfied by the shipped design.

**This is therefore a defensible implementation choice, not a scope reduction — I am not routing a
scope question to root.** The delivered behavior satisfies the stated intent in full, and the one
sub-clause not taken literally is one whose literal reading (i) provably regresses a PRESERVED test
and (ii) would introduce a real product defect (Person resurrection) independent of any test. Had it
met the intent only by contorting around a fixture, I would have flagged it; it does not.

---

## 5. No regression of rev-01 passes

- **DoD 1 (real secure redemption): HOLDS.** The delta adds two lines to `handleAccept` and touches
  no crypto. `redeemRealVaultKey` / `selfWrapVaultKey` / the server-side sender-key resolution are
  byte-identical to the passed rev-01.
- **DoD 2 (authoritative reachable surface): HOLDS.** The only `AccessMembersSection.tsx` change is
  the N-4a copy block; no authz or routing change.
- **DoD 3 (removal via preserved path): HOLDS.** No rekey/epoch machinery added — confirmed by the
  zero-hit vocabulary grep and the empty router diff. My rev-01 B-1 withdrawal stands unchanged.
- **N-4a owner copy: PRESENT and ACCURATE.** `AccessMembersSection.tsx:105-112`, owner-gated: "the
  vault key is not rotated, so anything they already downloaded stays readable to them." That
  matches the true posture I established in rev-01 (`rekeyVault` has zero call sites) — it neither
  overclaims rotation nor understates revocation.
- **N-4b removal-authz test: GENUINE.** It drives the real `membershipRouter` via `createCaller`. I
  **mutation-tested both gates** rather than trusting green:
    - neutered `if (callerMembership.role !== "owner")` -> the FORBIDDEN test **FAILED** (1 failed /
      1 passed);
    - neutered `if (callerError || !callerMembership)` -> the NOT_FOUND test **FAILED**.
    - `membership.ts` restored to a clean diff after each. Both assertions are load-bearing.
- **N-4c evidence correction: DONE and accurate** (`evidence/P08/implementation-02.md:96-103`):
  states plainly that no rekey/rotation runs at all and that the rev-01 "sealed-box rekey ...
  unchanged" wording was inaccurate.

---

## 6. Gates (all reproduced by this reviewer)

| Gate                | Result                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`    | **PASS** (exit 0)                                                                                                                                                                                                        |
| `pnpm lint`         | **PASS** — 0 errors, 10 warnings, all pre-existing in untouched files (`TransactionTable.tsx`, `crdt/queries.ts`, 4 transaction/hierarchical test files)                                                                 |
| `pnpm test`         | **PASS — 1716 passed / 2 skipped**, 83 files (matches the implementer's claim exactly)                                                                                                                                   |
| `pnpm test:e2e`     | **PASS — 124 passed**, 0 failed (matches the claim)                                                                                                                                                                      |
| `pnpm format:check` | Fails on **16 `specs/**`docs only** (Q-024, root-owned, pre-existing and not attributable). The 6 changed source/test files pass: piping the delta through`oxfmt --check` -> "All matched files use the correct format." |
| Targeted repeat     | `invite-redemption.spec.ts --repeat-each=3 --retries=0` -> 6/6; `realtime-recovery.spec.ts --repeat-each=6 --retries=0 --workers=1` -> 18/18                                                                             |

---

## 7. Secret-safety: CLEAN

- Zero `console.*` additions in the delta.
- No key material, fragment secret, seed phrase or vault plaintext in any changed file.
- `membership-remove-authz.test.ts` uses only synthetic SHA-256 hashes of the literal strings
  `"non-owner-member"` / `"some-other-member"` and placeholder signature strings — no real vectors.
- The E2E reads the owner's pubkey **hash** solely to assert it is **absent** from rendered output —
  a `toHaveCount(0)` negative assertion, never logged.

---

## 8. Non-blocking notes (no action required for PASS)

- **N-6.** The marker is keyed per-vault but not per-identity
  (`moneyflow_pending_person_link:${vaultId}`). If two identities on the same browser origin were to
  accept invites to the same vault, the first open to complete clears the marker for both. Narrow
  and hypothetical; `ensureMemberPersonLinked` is keyed on the session pubkeyHash so no wrong Person
  can be written — worst case is a missed materialization for the second identity, self-healing on
  any subsequent accept. Not worth code in this package.
- **N-7.** The unused-at-runtime consequence of §4: because linkage is acceptance-gated, a member
  provisioned entirely out-of-band (never through the invite UI) gets no linked Person. That is the
  intended discriminator, but it is worth carrying forward as a known characteristic if out-of-band
  provisioning ever becomes a product path.
- **N-8.** `pnpm typecheck` rewrites `next-env.d.ts` as a build artifact; I reverted it so the tree
  is clean. Working tree at review end contains only the untracked
  `specs/007-human-scratch-completion/evidence/P08/` and this uncommitted review file.

---

## Summary

The single rev-01 blocker (B-2) is closed with a genuine RED->GREEN guard that I reproduced in both
directions. The permanent-miss fragility is properly removed — the marker is now durable and cleared
only on confirmed durability, so failures retry instead of silently losing the linkage. The flagged
design call survives adversarial scrutiny: I built the markerless alternative and it really does
regress a preserved test, and the marker has independent product justification (it prevents
resurrecting a user-deleted Person). The new authorization test is load-bearing under mutation. All
gates reproduce at the claimed numbers, the hard boundary diff is empty, and there is no secret
exposure.

**VERDICT: PASS — 0 blocking findings.**

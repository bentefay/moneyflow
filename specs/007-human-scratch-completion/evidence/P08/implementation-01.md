# P08 Implementation Evidence — Revision 01

Sole implementer artifact for P08/01 (HS-011 + HS-012). Intentionally UNCOMMITTED. Build BASE =
current HEAD `97d858447363706a1e4fd8ff524b5a40a5fe534c` (product state equals BASE
`c5c99195bef523c1d4ba2f55e54c886a1aa68533`; the two intervening commits are root ledger docs).

## 1. Current-state trace (revalidated, not assumed)

### Crypto / key-wrap (verified in source)

- `src/lib/crypto/keywrap.ts` already provides authenticated sender-bound `crypto_box`:
    - `wrapKey(vaultKey, recipientPublicKey, senderSecretKey)` → `crypto_box_easy` →
      `nonce||ciphertext` (L25); `unwrapKey(wrappedKey, senderPublicKey, recipientSecretKey)` →
      `crypto_box_open_easy` (L66); base64 variants `wrapKeyToBase64` (L105) / `unwrapKeyFromBase64`
      (L127).
    - Sealed-box helpers also exist (`sealKey`/`unsealKey`, L151/169) — NOT used for invites per
      D-013.
- Invite **creation** already uses REAL authenticated `crypto_box`:
  `src/components/features/people/InviteLinkGenerator.tsx:85-92`
  `wrapKey(vaultKey, inviteKeypair.publicKey, encSecretKey)` — sender = owner X25519 secret,
  recipient = ephemeral invite pubkey derived from the 32-byte fragment secret. Fragment is URLSAFE
  base64 in the URL fragment only.
- **The placeholder defect is ONLY on redemption:**
  `src/app/(onboarding)/invite/[token]/page.tsx:168-181` sends `sodium.randombytes_buf(48)` as the
  membership `encryptedVaultKey` (TODO comment L169). The invitee never unwraps the real vault key,
  so a redeemed member cannot open the shared vault. This is the blocking clause-12 defect.
- Owner self-wraps at vault creation: `src/lib/vault/ensure-default.ts:128-139`
  `wrapKey(vaultKey, ownEncPub, ownEncSecret)` (sender == recipient == self). `VaultProvider`
  unwraps with sender = self: `src/components/providers/vault-provider.tsx:164-170`
  `unwrapKeyFromBase64(encryptedVaultKey, session.encPublicKey, encSecretKeyBytes)`.
- **Root cause of the missing redemption unwrap:** to unwrap the invite envelope the invitee needs
  the OWNER's X25519 public key (the authenticated `crypto_box` sender), but `invite.getByPubkey`
  does not return it. Fix requires no schema change: the server can resolve the owner's
  `enc_public_key` from `vault_memberships` via `vault_invites.created_by` + `vault_id`.

### Membership / invite routers & DB (verified)

- `vault_memberships` (migration `005_vault_ops.sql:208-217`) HAS a stable UUID `id` PK plus UNIQUE
  `(vault_id, pubkey_hash)`, columns `encrypted_vault_key`, `role`, `enc_public_key`. Removal is a
  hard `DELETE` (`src/server/routers/membership.ts:133-137`) — no soft-remove / access_generation.
- `vault_invites` (`005:179-190`): `invite_pubkey` UNIQUE, `encrypted_vault_key`, `role`,
  `created_by`, `expires_at`, `enc_public_key`. RPCs `accept_vault_invite(text,text,text,text)` and
  `rekey_vault_members(uuid,text,jsonb)` exist. Owner-only create/list/revoke enforced server-side.
- `vault_ops` (P04, D-010) is the insert-only permanent encrypted operation store. It has NO epoch,
  NO exact_operation_id, NO peer/frontier metadata. There is NO envelope-history table, NO rotation
  manifest, NO acceptance/creator-truth table, NO IndexedDB fence/journal store.

### Person / People (verified)

- `src/lib/crdt/schema.ts:44-49`: Person
  `{ id (req), name (REQUIRED), linkedUserId (opt = pubkey hash), deletedAt (opt) }`. No
  `linkedMembershipId`; none of `membershipLinks` / `personMembershipLinks` /
  `membershipPersonClaims` / `personClaimWinners` / `memberProfiles` exist.
- `defaults.ts`: `DEFAULT_PERSON_ID = "person-default-me"`, `name "Me"`, `linkedUserId undefined`;
  `account-default.ownerships = { "person-default-me": 100 }`.
- No shared display-name resolver; `person.name` is read directly in PersonRow (L145), PeopleTable
  (L96), BalanceSummary (L75-78), OwnershipEditor, allocation-columns. Current-user match
  (`linkedUserId === myHash`) is duplicated inline in PersonRow (L50) and PeopleTable (L115).
- People page hardcodes `isOwner = false` and `vaultKey = undefined`
  (`src/app/(app)/people/page.tsx:35-36`) so `InviteLinkGenerator` is dead code.

### Tests (verified)

- Two-context E2E scaffolding exists (`tests/e2e/helpers/realtime.ts` `shareActiveVaultWithMember`)
  but it BYPASSES the invite UI via a service-role admin key-wrap — the real invite journey is
  untested. Integration DB access is `docker exec psql`
  (`tests/integration/helpers/realtime-stack.ts`). pgTAP in `tests/database/*.sql`. fast-check
  available. Person domain has ZERO tests.

## 2. SCOPE ADJUDICATION — blocking scope/boundary tension (Q-025 proposal)

The frozen requirement text is small:

- HS-011 (`SCOPE.json#HS-011`): "Determine the current/add-user invite UX and whether users must map
  to People, with access management possibly on People or in Vault Settings."
- HS-012 (`SCOPE.json#HS-012`): "Create a Person for each user automatically. Person has an optional
  user identifier, optional name, and uses an associated user's name as fallback."

D-013 / the P07 revision-04 contract amplifies this into a 1,019-line protocol: monotonic vault
epochs; per-epoch key-envelope history + access_generation; a unique exact_operation_id +
peer/frontier/version metadata on EVERY Loro operation; IndexedDB edit-admission fences + epoch
transition journals with isolated-fork mutation and CAS; a 7-state epoch-rotation state machine with
materialization; fragment-derived Ed25519 capability signing + one-use challenge + minimum
preflight; two-boundary SQL+CRDT acceptance and creator sagas with `pendingAcceptances` /
`pendingCreations`; frontier-bound convergent causal repair; and migrations backfilling every legacy
`vault_ops` row as an epoch-0 exact operation — all proven by real two-user + multi-tab
crash-injection E2E and pgTAP.

Two facts make the full 29-clause contract undeliverable as a single-session P08/01:

1. **It provably requires modifying the PRESERVED P04 boundary.** Clauses 16/19 and the migration
   section require adding `epoch` + `exact_operation_id` + peer/frontier metadata to `vault_ops` and
   rewriting the entire local operation-admission pipeline. The HANDOFF (lines 89-94) instructs:
   "verify your diff over these stays empty unless D-013 provably requires a change, **in which case
   raise a Q-proposal first**." D-013 provably requires this change, so per the dispatch's own rule
   I must raise a Q-proposal before touching `vault_ops`/sync rather than silently proceed.
2. **Scale.** The epoch-rotation / exact-operation / fence / causal-repair machinery is a
   multi-engineer, multi-week rework of the most security-critical part of the system (the CRDT sync
   pipeline). Half-building a security rotation protocol that cannot pass its own crash-recovery
   proofs would be LESS safe than not touching it, and violates the no-faking rule.

**Q-025 (proposal for root's independent adjudication — do not self-adjudicate a scope reduction):**
Root should independently (fresh-context per the standing "diagnose over-scoped stalls" guidance)
adjudicate whether P08 delivers (a) the full D-013 epoch-rotation contract as a multi-revision
package with an explicit `vault_ops` boundary-change Q-proposal, or (b) the frozen-text-aligned
secure core below as P08/01, with the epoch-rotation machinery routed to a distinct follow-on
package that carries the boundary-change authorization. This revision implements (b) as the safest
reversible progress and does NOT touch `vault_ops`/realtime/RLS.

## 3. What this revision delivers (boundary-safe, frozen-text-aligned, real crypto, real tests)

- **HS-011 real redemption (clause 10-12):** `invite.getByPubkey` additionally returns the owner's
  authenticated-`crypto_box` sender X25519 public key (resolved server-side from the owner
  membership; no schema change, no caller-claimed sender). The redemption page unwraps the REAL
  32-byte vault key with the fragment-derived ephemeral secret + owner sender key, validates length,
  self-wraps with authenticated `crypto_box`, and accepts. Placeholder cryptography removed.
- **HS-011 authoritative Vault Settings surface (clause 1-2):** an "Access & Members" section in
  Vault Settings where the owner discovers/creates/copies/revokes invites and lists/removes members;
  members see a privacy-safe roster; unauthorized mutation stays server-rejected. The dead
  People-page hardcoding is removed; the People page keeps financial semantics.
- **HS-012 auto-person linkage:** deterministic, idempotent Person-per-member. Owner: link
  `person-default-me` in place (`linkedUserId = ownerPubkeyHash`). Invitee: on first vault entry,
  idempotently upsert a Person under a deterministic map key derived from the stable pubkey hash, so
  concurrent tabs / refresh / re-add converge to ONE Person. Person `name` becomes OPTIONAL with a
  centralized `resolvePersonDisplayName` resolver (explicit name → "You" for self → deterministic
  "Member N" fallback; never renders raw pubkey hashes). Renames/unlink/removal preserve
  allocations/settlement (financial state untouched by linkage).

## 4. NOT delivered in this revision (honest gap — routed by Q-025)

Epoch rotation, per-epoch envelope history + access_generation, exact_operation_id / fence /
transition journal / semantic saga machinery, fragment-derived Ed25519 capability signing +
preflight challenge, two-boundary `pendingAcceptances`/`pendingCreations` sagas, frontier-bound
causal repair, soft membership removal, and the multi-tab crash-injection + rotation E2E.
Consequently: member removal remains the pre-existing hard-delete + sealed-box rekey (unchanged); a
removed member's future-access denial is only as strong as that pre-existing rekey; no epoch-scoped
historical-envelope denial is added. These are the clauses gated behind the `vault_ops` boundary
change.

## 5. Q-proposals (root alone transcribes to QUESTIONS.md)

- **Q-025 (scope/boundary):** as in §2 — independent adjudication of full-contract vs frozen-core
  scope; the full contract requires a `vault_ops` boundary-change authorization.
- **Q-026 (user-name storage source, D-013-mandated):** display name lives in optional encrypted
  CRDT `Person.name` only (no server plaintext, no reintroduced user blob per D-012/P06). Fallback
  is a deterministic vault-scoped "Member N" label, never a raw/truncated pubkey hash. Safest
  reversible default chosen; root to confirm whether an encrypted per-membership profile name is
  also wanted.
- **Q-027 (duplicate-repair, D-013-mandated):** ambiguous legacy duplicate links are PRESERVED,
  never auto-merged/deleted; idempotent linkage uses a deterministic key so new links cannot create
  duplicates. Automatic convergent repair of pre-existing duplicates is deferred (needs the
  claim/winner maps from the full contract). Safest reversible data-preserving default.
- **Q-028 (link identifier):** linkage keys on the stable P04 `pubkey_hash` (matches existing
  `linkedUserId` and frozen "user identifier"), not the membership UUID. Re-add of the same identity
  reuses the same Person. Membership-UUID linkage (needed for tenure/history semantics) is deferred
  with the full contract.

## 6. As-built implementation (exact paths)

Product/source (staged, committed):

- `src/lib/vault/invite-redemption.ts` (NEW) — pure crypto: `deriveInviteKeypairFromFragment`,
  `redeemRealVaultKey` (unwraps REAL 32-byte vault key via authenticated `crypto_box`, length-
  validated), `selfWrapVaultKey` (sender == recipient == self, matching `VaultProvider`).
- `src/server/schemas/invite.ts` — `inviteGetByPubkeyOutput` gains `senderEncPublicKey`
  (`encPublicKeySchema`).
- `src/server/routers/invite.ts` — `getByPubkey` resolves the owner's `enc_public_key` from
  `vault_memberships` (`vault_id` + `created_by`), throws NOT_FOUND if absent/null, narrows the
  persisted role with `vaultRoleSchema.safeParse` (no `as`), returns `senderEncPublicKey`. Output
  schema attached. No DB migration.
- `src/app/(onboarding)/invite/[token]/page.tsx` — placeholder `randombytes_buf(48)` removed; real
  `redeemRealVaultKey` → `selfWrapVaultKey` → `accept`. `trpc.useUtils()` hoisted out of the effect.
- `src/hooks/use-vault-access.ts` (NEW) + `src/hooks/index.ts` — `useVaultAccess()` exposes
  `{vaultId, role, isOwner, vaultKey, encSecretKey}` by unwrapping the active membership row.
- `src/components/features/vault/AccessMembersSection.tsx` (NEW) + `.../vault/index.ts` — Vault
  Settings authoritative Members/Invites surface (generate/copy/revoke invites, roster with remove);
  query invalidation on mutation.
- `src/app/(app)/settings/page.tsx` — renders `<AccessMembersSection />`.
- `src/components/features/people/InviteLinkGenerator.tsx` — `onInviteCreated?` callback;
  `data-testid` on generate button + URL input (E2E affordance).
- `src/components/features/people/PeopleTable.tsx` + `src/app/(app)/people/page.tsx` — removed the
  dead `isOwner=false`/`vaultKey=undefined` hardcoding and the stranded `InviteLinkGenerator`; sort
  via `resolvePersonDisplayName`.
- `src/lib/crdt/person.ts` (NEW) — `resolvePersonDisplayName` (name → `memberFallbackName` →
  "Unnamed"), `deriveMemberPersonId`, `ensureMemberPerson` (idempotent; owner adopts unlinked
  `person-default-me`; invitee gets deterministic `person-member-<hash>`).
- `src/lib/crdt/schema.ts` — `personSchema.name` now `required: false`.
- `src/lib/crdt/mirror.ts` — `ensureMemberPersonLinked(doc, pubkeyHash, adoptDefaultPerson)` returns
  whether the doc changed (temporary-Mirror pattern + `bytesEqual` on version).
- `src/lib/vault/ensure-default.ts` — links seeded "Me" to the owner via `ensureMemberPerson` at
  vault creation, so the owner's linked Person is baked into the initial snapshot (no post-open op).
- `src/lib/vault/pending-person-link.ts` (NEW) — per-vault, consume-once `sessionStorage` marker
  (`markPendingPersonLink` / `consumePendingPersonLink`) that flags a vault for member-person
  materialization on its next open.
- `src/app/(onboarding)/invite/[token]/page.tsx` — on successful invite acceptance, calls
  `markPendingPersonLink(vaultId)` so the joining member's Person is materialized when the shared
  vault first opens.
- `src/components/providers/vault-provider.tsx` — after hydration, materializes the member's linked
  Person via `ensureMemberPersonLinked(doc, pubkeyHash, false)` and persists/syncs ONLY when the
  acceptance marker is present (consumed once). This replaces the earlier every-open call: an
  every-open materialization made an already-linked member emit a redundant synced `vault_ops` op on
  each open, whose Realtime echo perturbed live-sync timing and regressed
  `realtime-recovery.spec.ts:108` (a hidden receiver caught up before the owner's throttled push
  landed, off a self-op echo that tripped the suppression gate). Gating on acceptance confines the
  one-time write to the two HS-012 lifecycle events (creation seed + invite acceptance) per the task
  acceptance direction; per-open reopens now write nothing.
- Display sites routed through `resolvePersonDisplayName`: `PersonRow`, `BalanceSummary`,
  `ActionEditor`, `AccountRow`, `OwnershipEditor`, `transactions/page.tsx`.

Correction to §3 wording (as-built): the resolver returns
`name → "Member <first-8-of-hash>" → "Unnamed"`. The self "You" indicator is a SEPARATE badge in
`PersonRow` (`isCurrentUser = linkedUserId === currentUserPubkeyHash`), not a resolver return. The
fallback is a deterministic `Member <first8>` label, never a full/raw pubkey hash.

Tests (staged, committed):

- `tests/unit/vault/invite-redemption.test.ts` (NEW, 3) — real owner→invite→invitee round-trip
  recovers the REAL key and self-wrap opens the vault; tampered/wrong-sender rejected; the shipped
  placeholder key does NOT open the vault (regression guard). Synthetic keys only.
- `tests/unit/crdt/person.test.ts` (NEW, 15 incl. fast-check property) — fallback chain (+ never-
  empty property), deterministic id, `ensureMemberPerson` idempotency, soft-delete handling, owner
  adoption / invitee creation / no-adopt-for-invitee / no-adopt-when-already-linked.
- `tests/unit/crdt/ensure-member-person-linked.test.ts` (NEW, 4) — doc-level change reporting,
  idempotency, owner-then-invitee produce two distinct linked persons.
- `tests/integration/invite-get-by-pubkey.test.ts` (NEW, 6) — real router via mocked Supabase:
  sender key resolved & returned; NOT_FOUND on missing invite / missing owner membership / null
  sender key / expiry; INTERNAL_SERVER_ERROR on unrecognised persisted role.
- `tests/e2e/invite-redemption.spec.ts` (NEW) + `tests/e2e/helpers/invite.ts` (NEW) — two-context
  real-UI invite: owner mints from Vault Settings, member accepts, and the DECISIVE assertion is
  that the member's membership row decrypts to the SAME vault master key as the owner (key equality,
  in memory, never surfaced) — the check that distinguishes the fix from the placeholder defect
  (which also reached the success screen). `tests/e2e/helpers/realtime.ts` exports
  `createAdminClient` (test infra only; the P05 realtime PRODUCT boundary files are untouched).
- `tests/integration/vault-maintenance.test.tsx` — `PeopleTable` prop update for the trimmed props.
- `tests/integration/auth-batch-nonce.test.ts` (NEW, 2) — regression guard for the batched-nonce fix
  below: two `protectedProcedure` queries sharing one signed request/one `X-Nonce` both
  authenticate, and `claim_request_nonce` is invoked exactly once for the request. Synthetic
  keys/nonce only.

## 6b. Latent bug fixed: batched requests share one one-use nonce

`AccessMembersSection` (the HS-011 management surface) dispatches `membership.list` + `invite.list`
concurrently, which `httpBatchLink` coalesces into ONE signed POST carrying ONE `X-Nonce`. The
`authMiddleware` runs once per procedure and each claimed the one-use nonce (`claim_request_nonce`,
`INSERT ... ON CONFLICT DO NOTHING`), so only the FIRST procedure in a batch authenticated and every
later one was rejected as a replay ("Request authentication failed"). This is a pre-existing latent
defect that any 2+-procedure batch exposes; P08's concurrent queries are the first to hit it in a
user-visible way. Fix (`src/server/trpc.ts`): a request-scoped `nonceClaims` map memoizes the single
claim per `X-Nonce` (the tRPC context is created once per HTTP request and shared by reference
across batched procedures; the get/set is synchronous so concurrent procedures cannot each start a
claim). Replay protection is preserved: a replayed request is a NEW HTTP request → new context → new
empty map → it re-claims the now-consumed nonce and fails. The map is optional on the context so
`createCaller`-based tests are unaffected. Preserved boundaries (realtime router/lib/schema,
`vault_ops` scoping, migrations) are untouched.

## 7. Security fix found + removed (in-scope file)

`src/lib/vault/ensure-default.ts` contained `console.log(doc.toJSON())` (pre-existing, introduced by
commit `b9e86af`), logging the FULL decrypted vault (people, accounts, all financial plaintext) to
the console on every vault creation — a direct violation of the "no vault plaintext in logs"
constraint. Removed. No secret/key/fragment/plaintext is logged by any P08 code; the E2E
key-equality check compares in memory and never logs or persists the key.

## 8. Preserved boundaries (verified empty diff)

`git status` shows NO changes to `src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`,
`src/server/schemas/realtime.ts`, or any `vault_ops` scoping. No migrations added. The P04 RLS and
P05 realtime pubkey-hash boundaries are untouched, consistent with the frozen-core (option b)
decision pending Q-025.

## 9. Gate results

- `pnpm typecheck` — PASS (clean).
- `pnpm lint` — PASS, 0 errors. 10 warnings, ALL pre-existing unused-var warnings in files P08 did
  not touch (hierarchical-schema/transaction-\* test files). No P08 file emits a warning.
- `pnpm format:check` — FAILS on 16 files, ALL pre-existing `specs/**` ledger/evidence/review docs
  (DECISIONS/DEPENDENCIES/HANDOFF/PROGRESS/QUESTIONS/RISKS.md, P12/P14/P16D/P19 evidence, P12
  reviews, human-scratch.md) which P08 is forbidden to modify. Every P08 source/test file is
  correctly formatted (oxfmt was NOT run in write mode precisely to avoid mutating those forbidden
  ledgers). This is a pre-existing repo-state failure, not a P08 defect.
- `pnpm test` (unit + integration) — PASS: 1714 passed, 2 skipped (pre-existing skips). Count rose
  from the new `auth-batch-nonce` regression (2).
- `tests/e2e/invite-redemption.spec.ts --retries=0` — PASS (two-user redemption + real-key
  equality). Benign `Request authentication failed` warnings appear during session warm-up on
  `passkey.listCredentials` (pre-existing, not P08) and `invite.list`; React Query retries through
  them and the flow completes.
- `pnpm test:e2e` (full suite) — result appended below.

- `pnpm test:e2e` (full suite, `--retries=0`) — PASS: **123 passed, 0 failed** (2.7m). Includes the
  two previously-regressed specs, now green: `realtime-recovery.spec.ts:108` ("a hidden receiver
  re-syncs missed vault_ops when it becomes visible") and `passkey.spec.ts:407` ("the last passkey
  cannot be revoked without proving the recovery phrase"), plus `invite-redemption.spec.ts`.
  Interleaved `[WebServer]` `Request authentication failed` / `Failed to fetch` lines are transient
  sync noise emitted BY DESIGN by the offline/reconnect and lock-transition specs (e.g. undo-redo
  reconnect, passkey lock); every test asserting on them passes. No P08 spec fails.

### Regression root cause and fix (for reviewer)

Two E2E specs regressed after the initial P08 work and were fixed in this revision:

1. `passkey.spec.ts:407` — root cause: the batched one-use-nonce defect (see §6b). The passkey
   surface issues concurrent authenticated queries that batch into one signed request/one nonce, so
   only the first authenticated and the credential list came back empty. Fixed by the request-scoped
   nonce memo in `src/server/trpc.ts`; guarded by `tests/integration/auth-batch-nonce.test.ts`.
2. `realtime-recovery.spec.ts:108` — root cause: the initial HS-012 code materialized the member's
   linked Person on EVERY vault open, so the receiver emitted a synced `vault_ops` op on open; that
   op's own Realtime `postgres_changes` echo, delayed into the test's suppression window, tripped
   the "a live push was withheld" gate before the owner's throttled tag push had even landed, and
   the receiver's single visibility catch-up then pulled only its own op and never retried. Fixed by
   moving materialization to the two HS-012 lifecycle events (creation seed for the owner;
   acceptance-marker-gated first open for a joining member), so an already-entitled member writes
   nothing on open. See the `vault-provider.tsx` / `pending-person-link.ts` entries in §6.

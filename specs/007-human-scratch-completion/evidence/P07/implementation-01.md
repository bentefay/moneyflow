# P07 Implementation Evidence — Revision 01

## Immutable no-code boundary

- Package/scope/revision: `P07` / `HS-011` architecture package / `01`.
- Literal BASE and required unchanged HEAD: `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`.
- Allowed implementation paths: none. This package collects current-state evidence and proposes the
  reversible architecture/P08 contract only.
- Sole worker artifact: `specs/007-human-scratch-completion/evidence/P07/implementation-01.md`,
  created before service or browser activity and intentionally left uncommitted.
- At dispatch, the index and untracked set were empty; Git-visible dirt was exactly root-owned
  unstaged `HANDOFF.md` and `PROGRESS.md`.

## Collection plan

1. Trace every owner/member/person/invite schema, table, role, router, key source and wrap/unwrap
   operation, identity/display source, UI entry point, placeholder/dead path, lifecycle rule and
   test.
2. Exercise proportional router/crypto/invite tests and relevant retries-zero real-browser journeys
   without changing code or using test results as a substitute for UI discoverability.
3. Use the installed headless browser CLI from normal navigation only to determine what owner,
   member and outsider controls are actually discoverable; retain no invite/key/identity secret.
4. Compare dedicated Vault Settings, People-owned access and linked-hybrid architectures against
   least privilege, privacy, removal/rekey, accessibility, reversibility and frozen wording.
5. Select the safest reversible default and specify a complete P08 acceptance, threat, privacy,
   migration, testing and reversal contract without editing product/tests/migrations/configuration.

## Executive finding

The current repository has three different concepts but exposes them as if they were one:

- a `Person` is an encrypted CRDT financial-allocation/settlement record;
- a `VaultMembership` is a server-authoritative identity/role/key-envelope access record; and
- an invite is a short-lived bearer capability which should convey a real vault key.

The data model still mostly preserves that distinction, but the UI copy places collaboration under
People, the only invite control is unreachable, and the redemption page writes a random placeholder
instead of the invited vault key. Removal and rekey are disconnected, and the current rekey helper
emits an envelope format the vault provider cannot open. There is therefore no honest end-to-end
membership journey in the product today.

**Proposed ADR decision:** adopt the linked-hybrid architecture. `Vault Settings > Access & Members`
is the authoritative access surface; People remains the financial surface and may show an optional
link/status plus a `Manage access` deep link. P08 must repair the key-envelope protocol and
introduce an atomic key-epoch removal/rekey operation before exposing the UI. Initial invites are
member-only until an explicit ownership-transfer/co-owner lifecycle exists.

This artifact is a proposed architecture and dispatch contract. It does not claim P07 review PASS,
does not implement P08, and does not waive the required P05/D-011 recheck before P08 dispatch.

## Source inventory examined

- Authority/schema: migrations 005–009, generated database types, `src/server/routers/invite.ts`,
  `membership.ts`, `vault.ts`, `user.ts`, the matching server schemas, request-signing context and
  router composition/call sites.
- Key lifecycle: `src/lib/crypto/identity.ts`, `keywrap.ts`, `rekey.ts`,
  `src/lib/vault/ensure-default.ts`, `src/components/providers/vault-provider.tsx`, snapshot/update
  encryption and sync-manager call sites.
- User journeys: People page/table/row/invite-generator, Vault Settings page/form/selector,
  `src/app/(onboarding)/invite/[token]/page.tsx`, new-user/unlock pages and navigation/provider
  state.
- Person/display model: CRDT schema/defaults/migration, Person allocation/account/settlement uses,
  deletion guards and the removed post-P06 user-state/profile paths.
- Evidence/history: invite/keywrap unit/integration tests, pgTAP RLS audit, onboarding/account/vault
  settings/Realtime E2E and helpers, original MVP data model/tasks/API contract, crypto flowchart,
  CRDT/rekey research, P04/P05/P06 artifacts and HS-011/HS-012 task text.

Repository-wide call-site searches found no product UI caller for invite list/revoke, membership
list/remove/rekey, vault member list or the complete-rekey helper. The paths below are therefore
described as code that exists, not as discoverable product behavior.

## Current-state trace

### Persistence and authority

| Surface                    | Current fact                                                                                                                                                                                                                  | Consequence                                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.vault_invites`     | UUID id, vault FK/cascade, unique invite public key, encrypted vault-key envelope, owner-or-member role, creator stable pubkey hash, expiry/creation timestamps, nullable `enc_public_key`; service-role-only selected grants | The table has no authoritative wrapping-sender key/version and permits creation of another owner. `enc_public_key` is unused.                                                                                    |
| `public.vault_memberships` | UUID id, unique `(vault_id,pubkey_hash)`, encrypted vault-key envelope, owner-or-member role, timestamps, nullable recipient `enc_public_key`; service-role-only access                                                       | Membership UUID already exists but UI/CRDT linkage uses the global stable pubkey hash. Nullable encryption keys can make exact-set rekey impossible.                                                             |
| `create_vault_for_owner`   | Migration 006 inserts vault and owner membership atomically with a client-produced self-wrapped real 32-byte vault key                                                                                                        | This is the one coherent live wrapping convention: recipient and sender encryption public keys are the owner's key.                                                                                              |
| `accept_vault_invite`      | Locks the unexpired row, inserts caller membership using caller-supplied envelope/public key and invite role, deletes invite atomically                                                                                       | Single-use/replay behavior is sound at the DB boundary, but it matches only the invite public key, not the route UUID, and cannot validate that the supplied membership envelope contains the invited vault key. |
| `rekey_vault_members`      | Owner RPC requires an exact complete member/key set and updates membership envelopes in one transaction                                                                                                                       | It does not create/commit the new snapshot/key epoch and is separate from removal. Current sealed-box helper output is incompatible with provider unwrap.                                                        |
| `cleanup_expired_invites`  | SQL function exists                                                                                                                                                                                                           | No caller was found; listing can retain expired invitations.                                                                                                                                                     |
| `public.user_data`         | After migration 009 contains identity hash/timestamp only                                                                                                                                                                     | There is deliberately no global display-name/profile blob to reuse. A new plaintext global display source would regress P06's minimization.                                                                      |

Direct anon/authenticated table access remains denied and the server derives the signed caller's
stable identity. These are good boundaries to retain; P08 should evolve the transactional RPCs and
encrypted data rather than expose direct client writes.

### Router and lifecycle matrix

| Procedure                       | Caller/authorization                               | Current behavior and gap                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invite.create`                 | signed protected caller; owner membership required | Accepts caller-provided valid-base64 invite public key/envelope, owner-or-member role, expiry 1–168 hours (48 default). It neither validates exact crypto lengths/version nor binds wrapping-sender metadata. |
| `invite.getByPubkey`            | public bearer lookup                               | Returns invite UUID, vault UUID, envelope, role and expiry; expired and absent are both `NOT_FOUND`. It cannot return the wrapping sender needed by `crypto_box_open_easy`.                                   |
| `invite.accept`                 | signed caller                                      | Calls the atomic DB accept with caller-chosen membership envelope/public key. Route token is not included or checked.                                                                                         |
| `invite.list` / `invite.revoke` | owner only                                         | List includes expired entries with `isExpired`; neither route has a UI caller.                                                                                                                                |
| `membership.list`               | any active member                                  | Returns every stable pubkey hash, role, encryption public key and creation time. No UI caller; raw identity exposure is not a safe display model.                                                             |
| `membership.remove`             | owner; cannot self                                 | Deletes the target first, then returns only remaining rows with non-null encryption keys. No caller. Filtering null keys means the subsequent exact-set RPC cannot succeed for such a vault.                  |
| `membership.rekey`              | owner                                              | Exact-set envelope update only; no caller, key epoch, snapshot coupling or stale-write rejection.                                                                                                             |
| `vault.members`                 | any member                                         | Duplicates a reduced membership list and has no caller.                                                                                                                                                       |
| `vault.leave`                   | member only                                        | Owner is told to transfer ownership, but no transfer/promotion procedure exists.                                                                                                                              |
| `vault.delete`                  | owner                                              | Any owner can delete. Together with owner invites/multiple owners and no governance lifecycle, this is unsafe escalation.                                                                                     |
| `user.myVaults`                 | signed caller                                      | Duplicates `vault.list`; only test exposure was found.                                                                                                                                                        |

All protected mutations now use the P04 signed-request boundary and derive `ctx.pubkeyHash`. P08
must retain that rule and must not accept a claimed actor identity, vault role or vault id from the
client when those values are derivable from the locked invite/membership rows.

### Key generation, wrapping and redemption

1. Identity derivation correctly domain-separates Ed25519 signing and X25519 encryption keys from
   the recovery seed.
2. Default-vault creation generates a real 32-byte vault key, wraps it to the owner's X25519 public
   key with the owner's X25519 secret key, and stores that envelope. `VaultProvider` unwraps with
   the session encryption public and secret key, so the self-sent convention works.
3. `InviteLinkGenerator` generates a 32-byte random secret, derives an ephemeral X25519 pair, wraps
   the real vault key from owner secret key to invite public key and builds
   `/invite/<uuid>#<secret>`. This is the intended bearer-envelope shape.
4. `src/app/(app)/people/page.tsx` hardcodes `isOwner = false` and `vaultKey = undefined`, so the
   generator is unreachable even for an owner.
5. The invite page looks up the invite by the derived public key but never unwraps the returned
   `encryptedVaultKey`. The response also lacks the inviter's X25519 public key required to open an
   authenticated `crypto_box` envelope. The original research flow explicitly marked that sender
   public key as still needing to be fetched.
6. Redemption instead generates random 48-byte `placeholderWrappedKey` data and accepts it as the
   new membership envelope. `VaultProvider` cannot decrypt that value, so acceptance can create a
   membership which cannot open the vault.
7. The page calls `trpc.useUtils()` inside an asynchronous effect, violating the Rules of Hooks; it
   also does not bind the lookup/acceptance to the route's invite UUID.
8. When locked, it places the fragment capability inside an encoded `/unlock?returnTo=` query. That
   converts a client-only secret into request/log/referrer-visible data, while the unlock page
   ignores `returnTo` and routes to Transactions. The capability is leaked and the journey is lost.
9. `performCompleteRekey` generates a new key and sealed-box envelopes for one snapshot. The active
   provider only understands authenticated `crypto_box` envelopes. It has no call site and cannot
   serve as a removal protocol. Existing append-only operations and writes racing the snapshot are
   not assigned a new key generation.

The P05 shared-vault fixture does not contradict this finding. It reads the owner vault key with
test authority, then self-wraps it using the member's own encryption key and inserts membership via
the service client. It proves isolated-context encrypted transport after fixture provisioning, not
invitation. Its removal fixture directly deletes membership through the service client; it proves
future server/Realtime delivery is denied, not that the old key was rotated or future ciphertext is
cryptographically inaccessible.

### Person, identity and display sources

- The CRDT `Person` record has an id, required financial display name, optional `linkedUserId`
  (currently a stable pubkey hash), and optional deletion timestamp. Accounts, allocations and
  settlement/history refer to Person ids. Delete is soft and is restricted when transactions use the
  Person.
- The default financial Person is named `Me` but has no membership link. A linked self is rendered
  `You`; another link is rendered `Linked` plus a truncated stable pubkey hash. That is a security
  identifier, not a meaningful or privacy-safe human-facing name.
- The People page copy says it manages household members and invites collaborators, but the live
  surface has only financial Person add/edit/delete and balances. No membership roster, invite,
  revoke, removal or rekey control is reachable.
- A Person may represent a child, merchant, category-like payee or non-user participant; deleting or
  renaming it cannot safely grant/revoke cryptographic access. Conversely, removing a member cannot
  delete historical allocation/settlement identity.
- There is no post-P06 plaintext profile/name source. Any member label must be optional encrypted
  vault data, explicitly unverified and non-authoritative for permissions.

## Architecture decision record

### Status

`Proposed for independent P07 review`; if approved, it is the binding P08 implementation contract.

### Context and forces

The design must keep financial history stable, make security authority obvious, avoid raw global
identity display, support a real invitation key exchange, prevent partial remove/rekey states, work
for owner/member/outsider users, remain local-first/end-to-end encrypted, and be reversible without
destroying user data. Frozen HS-011 requires a deliberate architecture decision; HS-012 requires
automatic Person/link behavior in the same P08 implementation.

### Alternatives considered

1. **Dedicated Vault Settings access.** Strong authority separation, but alone it gives no useful
   financial context/status in People and does not fulfill optional Person association well.
2. **People-owned access.** Convenient in one view, but conflates financial records with keys and
   roles. Person deletion/merge/history rules cannot safely map to revoke/remove/rekey, and many
   valid Persons will never be members.
3. **Linked hybrid — selected.** Vault Settings owns access and role actions; People optionally
   links a financial Person to a stable vault-scoped membership and shows non-authoritative status.
   This preserves the original domain split, follows least privilege, supports HS-012, and can be
   hidden or rolled back without deleting normalized records.

### Decision

- Add an `Access & Members` section to Vault Settings. All active members can see their own role and
  a privacy-safe roster; only an owner sees create/copy/revoke invite and remove-member actions.
- Keep People as the authoritative financial allocation/settlement surface. A Person may optionally
  link to one membership and show `Active member`, `Invitation pending`, or `Access removed`, plus a
  `Manage access` link for authorized owners. Person edit/delete never changes access.
- Use these terms consistently: **Person** = financial record; **Member** = cryptographic vault
  identity; **Invite** = single-use bearer capability. Do not call every Person a user/member.
- Initially allow only `member` invitations. Remove the owner-role selector and reject owner invites
  server-side until a separately designed, reviewed ownership transfer/co-owner governance flow
  exists. P08 removal likewise targets members only; existing additional owners remain visible but
  cannot be removed/promoted/demoted through the new workflow. Existing owner membership semantics
  remain unchanged for compatibility.
- Link Persons by stable vault-scoped membership UUID, never by a displayed global pubkey hash.
  Preserve membership rows through removal/reactivation so financial links remain stable.
- Store optional display profiles only inside encrypted vault CRDT data keyed by membership UUID.
  The profile name is convenience text, never proof of identity or authorization.
- Make removal, key-envelope replacement, new encrypted snapshot/key epoch, grant revocation and
  epoch advance one owner-authorized transactional commit. A delete-first/rekey-later sequence is
  forbidden.

### Consequences and limitations

The selected model adds schema/protocol work but makes authority legible and prevents Person
lifecycle operations from becoming security operations. A removed member who previously downloaded
the old key/ciphertext may retain that historical plaintext; cryptography cannot revoke already
received information. Product copy must state that removal prevents future access and must not
promise erasure of past copies. The design provides a migration/repair state rather than silently
discarding malformed legacy memberships or ambiguous Person links.

No residual product-preference question remains: the frozen wording, current domain model and
least-privilege hierarchy select the linked hybrid. Repository ambiguity is resolved by this
complete proposal rather than pausing for a human choice.

## P08 normative acceptance contract

The following clauses are all required; partial UI-only completion is not acceptable.

### A. Authoritative surfaces and permissions

1. Vault Settings contains the discoverable `Access & Members` region described above on desktop and
   mobile. People copy describes financial participants and no longer falsely claims an unreachable
   invite capability.
2. An owner sees active members, pending/expired invites, explicit expiry, Copy, Revoke and Remove.
   A member sees the safe roster and own role but no mutation control. An outsider sees no roster
   data. Loading or invoking an owner control directly as member/outsider is server-rejected.
3. P08 uses the existing signed mutation boundary and server-derived caller identity. Server code
   derives vault, role and target authority from locked records. No client-claimed actor/role can
   elevate access.
4. New invitations and P08 removals are member-only. Owner promotion/transfer/removal is out of P08
   and cannot be simulated with an invite or the new removal RPC. Existing multiple-owner data
   remains readable pending that follow-up. The existing standalone member `vault.leave` cannot be
   presented as secure key revocation; it is deprecated/rejected or converted to an owner-actionable
   leave request until it can complete the same atomic rotation protocol.
5. List endpoints return only the fields needed by the UI and normalize absent, expired, revoked,
   tampered and unauthorized lookup outcomes so they do not become an identity/vault oracle.

### B. Versioned real-key invitation protocol

6. The invite secret is exactly 32 cryptographically random bytes, encoded base64url without
   padding. It appears only after `#`; it is never placed in path/query/server component props,
   logs, analytics, request bodies, referrers, console output, screenshots/traces or error text.
7. Invite creation stores a versioned envelope and the authoritative owner's wrapping X25519 public
   key. The server obtains that public key from the owner's membership and validates exact key,
   nonce/ciphertext and encoding lengths; it does not trust a caller-claimed sender key.
8. Public lookup is bound to both route invite UUID and public key derived from the fragment secret.
   Acceptance locks and consumes that exact pair atomically. Route-id tamper, envelope substitution,
   expiry, revoke, replay, cross-vault substitution and concurrent double accept fail closed with a
   generic invalid-invite result.
9. Every invite records the vault key epoch it wraps. Acceptance requires that epoch to equal the
   locked vault's current epoch. Advancing an epoch atomically revokes every still-pending invite;
   owners must issue fresh links under the new key. This deliberately avoids carrying unaccepted
   bearer capabilities and their envelopes across a security-boundary change.
10. The invitee opens the returned authenticated `crypto_box` envelope with the stored owner public
    key and ephemeral invite secret. The result must be exactly 32 bytes and must successfully
    decrypt/authenticate the selected vault snapshot before membership is written.
11. The invitee re-wraps that same key to its own X25519 public key using its own secret key.
    Acceptance stores the caller-derived stable hash, caller encryption public key, self-wrapping
    sender public key and envelope version. `VaultProvider` reads explicit sender metadata; it no
    longer assumes every envelope sender is the current session by accident.
12. The route may not generate placeholder/random membership ciphertext. Crypto failure leaves the
    invite unconsumed and creates no membership, Person or vault selection.
13. Authenticated invite processing holds the secret only in ephemeral client memory and promptly
    clears the visible URL with `history.replaceState`. It zeroizes/drops secret/key buffers on
    accept, cancel and error. Refresh after URL clearing safely asks for the original invitation.
14. Locked/new-user navigation preserves the capability in a fragment-only invite-aware onboarding
    state. Unlock consumes it client-side and returns to the invite flow; it never serializes the
    secret into `returnTo`. Invite-aware first onboarding does not silently create/select a default
    personal vault before the shared-vault decision, or explicitly handles cancellation without an
    orphan/selection race.
15. Generated links are masked by default and exposed through an explicit Copy action with visible
    confirmation. Revocation and expiry remain visible without rendering the fragment secret in the
    DOM after generation.

### C. Atomic removal and key epochs

16. Add monotonic `key_epoch` to the vault and corresponding membership envelope, snapshot/update/op
    metadata; backfill legacy state as epoch 0. Server reads/writes reject an epoch inconsistent
    with the current vault epoch.
17. Before removal, the owner client prepares a fresh random 32-byte key, a complete encrypted
    snapshot for `epoch + 1`, the exact current server operation/update watermark that snapshot
    covers, and versioned authenticated envelopes for the exact remaining active recipients using an
    explicitly recorded sender public key. The current sealed-box helper is not mixed with the
    provider's authenticated-envelope protocol; either migrate both ends under a new version or use
    the chosen authenticated convention consistently.
18. One owner-only transactional RPC locks the vault/current active memberships, validates current
    epoch, target member, exact recipient set and unchanged operation/update watermark, writes the
    new snapshot, updates every remaining envelope/sender metadata, marks the target removed,
    revokes the target's Realtime grants and all pending invites, and advances the vault epoch. A
    concurrent old-epoch write or any validation/write failure rolls the whole operation back and
    leaves the member active; the owner refreshes and retries from the new watermark.
19. Old-epoch writes are rejected after commit. The current epoch's bootstrap does not serve old
    append-only operations to a new-key client. Remaining online/offline clients detect the epoch
    change, discard old in-memory key material and reinitialize from the authenticated snapshot.
20. Removed clients receive no future sync/Realtime payload and cannot decrypt new-epoch data with
    the old key. Tests and UI separately acknowledge that already downloaded old ciphertext/key
    material cannot be remotely erased.
21. Membership removal is soft (`removed_at`) and every active permission/list/realtime query
    requires `removed_at IS NULL`. Reaccepting a later valid invite reactivates the exact stable
    membership UUID when safe; it does not create a new identity link or revive an old key.

### D. Person linkage and display privacy

22. Vault creation links the default owner Person to the returned owner membership UUID. Invite
    acceptance idempotently links an explicitly selected unlinked Person or creates one linked to
    the accepted membership. Retry/refresh/concurrent accept cannot create duplicate Persons.
23. Optional invite link intent (such as a Person id) is carried in encrypted client-readable
    payload, not server-readable identity/name plaintext. The accepting member may supply an
    optional encrypted display name; absence is valid.
24. Person name becomes optional only with this exact fallback order: explicit Person name,
    associated encrypted member-profile name, `You` for self, then `Member` plus a vault-scoped
    disambiguator where needed. Raw/full/truncated pubkey hashes and encryption keys are never
    rendered as names, accessible labels or copyable identifiers.
25. Removal leaves the linked Person, allocations, settlements and history intact and changes only
    access status. Re-add reactivates the same membership/link. Person deletion or unlinking never
    removes membership. Duplicate/ambiguous existing Persons are preserved and surfaced for repair;
    they are never automatically merged or deleted.
26. Member profiles are encrypted CRDT convenience data keyed by membership UUID. They do not alter
    SQL authorization, signature identity or role, and no generic plaintext/global user blob is
    reintroduced.

### E. Accessible interaction and honest states

27. Create/copy/revoke/remove/accept/cancel are keyboard-operable with visible focus, meaningful
    names and status/error live regions. Destructive removal identifies the member and future-access
    consequence, requires confirmation, and keeps focus predictable on cancel/success/failure.
28. Expired/revoked/invalid/accepted links, crypto corruption, offline retry and transactional
    rollback each have a stable, non-enumerating recovery state. No state claims success before the
    vault has been decrypted and membership/Person/selection have committed.
29. Desktop/mobile, dark/light, reduced-motion and 200% zoom layouts expose every authorized action
    without clipping, horizontal traps or off-viewport controls. The current mobile 200% menu and
    Person-label regression is an explicit P08 test target.

## Threat and privacy model

| Threat                         | Required control/evidence                                                                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bearer-link theft              | The fragment secret necessarily grants possession capability until expiry/revoke; use short explicit expiry, member-only least privilege, masked display, explicit Copy, revoke and honest warning. Do not claim recipient identity binding before signed acceptance. |
| Server/log/referrer disclosure | Fragment-only transport, client-side parsing/clearing, no query/path/server props/analytics/log artifacts; network/history/referrer tests inspect the complete journey.                                                                                               |
| Invite enumeration/tamper      | Match UUID + derived public key under lock; generic failure for absent/expired/revoked/unauthorized; exact crypto length/version validation and authenticated open before write.                                                                                      |
| Role/vault/actor escalation    | Server-derived caller, invite row and membership authority; member-only invites; signed mutations; direct DB remains denied.                                                                                                                                          |
| Replay/concurrency             | Single transaction consumes one exact invite and idempotently establishes one membership/Person/link; second/concurrent accept cannot create duplicates.                                                                                                              |
| Malicious/corrupt envelope     | Authenticated `crypto_box` open, exact 32-byte result and known encrypted snapshot authentication before membership insertion. Sender metadata is authoritative/versioned.                                                                                            |
| Remove/rekey partial failure   | Exact-set, epoch-checked, all-or-nothing RPC including snapshot/envelopes/removal/grants/epoch. No delete-first state.                                                                                                                                                |
| Removed/offline client         | Old epoch cannot write/read future payloads; future ciphertext uses fresh key; remaining clients recover from new snapshot. Past downloaded material is an explicit non-goal/limitation.                                                                              |
| Identity correlation           | Vault-scoped membership UUID in encrypted CRDT links; no pubkey display; least-field roster response; optional encrypted profile only. Server still retains stable hashes where required for authorization, but does not expose them as names.                        |
| Person/access confusion        | Separate authoritative surfaces and terminology; financial edits never mutate access; access status is clearly linked but non-authoritative in People.                                                                                                                |
| Local secret retention         | Clear fragment immediately after acquisition, keep capability/key in ephemeral memory, zeroize/drop on every terminal path, and exclude secrets from test output/artifacts.                                                                                           |

## Migration and reversal contract

1. Add envelope version, wrapping-sender public key, key epoch and `removed_at` with a staged,
   backward-readable migration. Backfill active vaults/memberships as epoch 0.
2. Existing owner/default and P05-style memberships are self-wrapped. For structurally valid rows,
   backfill wrapping-sender public key from the recipient `enc_public_key` and mark the legacy
   authenticated-self-wrap version. Validate exact decoded lengths. Rows with missing/invalid
   encryption metadata enter an explicit repair-blocked state; they are not filtered out or silently
   granted access.
3. Existing pending invites were accepted under a sender-unbound, unversioned schema and have never
   had a working in-product redemption path. The safest migration is to expire/revoke all of them
   and tell owners to create new links under the reviewed protocol. Never synthesize a key or
   silently treat an old link as upgraded; preserving selected legacy links would require a separate
   exact creator-membership/encoding proof and explicit migration test.
4. Retain the existing `(vault_id,pubkey_hash)` uniqueness while soft-removing rows. Safe re-add
   reactivates the same membership UUID and installs only the current-epoch real-key envelope.
5. Introduce `linkedMembershipId` and encrypted `memberProfiles`. Migrate an old `linkedUserId` only
   when it maps to exactly one membership in that vault. The default `Me` plus sole owner is safe to
   link. Ambiguous, missing or cross-vault hashes remain preserved in a repair state; no automatic
   merge/delete occurs.
6. Deploy read compatibility before write cutover; gate the new UI/protocol until migration checks
   and real isolated-context journeys pass. Keep old fields read-only during the bounded
   compatibility window, then remove them only in a later reviewed migration.
7. Reversal hides/disables Access & Members and new mutations behind the gate while retaining
   normalized rows, membership UUIDs, epochs and encrypted links. Do not use a destructive down
   migration. An older app may read only compatible epoch-0 vaults; export/compatibility support is
   required before rollback of any vault advanced to a new epoch.

## P08 mandatory verification contract

The implementation evidence must map every acceptance clause above to a test/evidence item and must
include all of the following without placeholder/service-fixture substitution for the meaningful
journey:

- schema/router unit and pgTAP coverage for owner/member/outsider authorization, member-only invite,
  member-only removal, rejection of owner lifecycle changes/standalone insecure leave, derived
  identity/role/vault, exact encodings, generic failures, UUID+public-key+epoch matching,
  expiry/revoke/epoch-advance revoke/replay/concurrent accept and direct-table denial;
- real crypto tests proving owner-to-ephemeral unwrap, exact key equality, invitee
  self-wrap/provider reopen, corrupt sender/envelope/nonce/version rejection, and snapshot
  authentication before write;
- atomic removal tests for exact recipients/current epoch/current operation watermark, a concurrent
  write conflict followed by refresh/retry, rollback at every transaction stage, stale old-epoch
  writes, grant and pending-invite revocation, soft removal/reactivation, remaining offline-client
  bootstrap and removed-client inability to receive/decrypt future data;
- CRDT migration/link tests for default owner, selected/unselected Person,
  retry/refresh/concurrency, remove/re-add, optional/fallback names, ambiguous legacy mapping
  preservation and unchanged allocations/settlements/history;
- a real isolated-browser owner creates/copies an invite through discoverable Vault Settings, a
  separate new or existing identity accepts that exact real link and decrypts the same vault, both
  synchronize an edit, owner removes member with atomic rekey, remaining owner continues, and the
  removed context cannot receive/decrypt a later edit. No service-role membership insertion,
  self-wrapped fixture key, direct invite URL invented by the test, shared storage state, request
  mocking, arbitrary sleeps, forced actions, retry or secret logging may replace that journey;
- separate owner/member/outsider UI journeys, expired/revoked/cancelled/corrupt links, locked and
  first-user fragment-preserving onboarding, navigation refresh/back/history/referrer/network/log
  inspection proving no capability disclosure, and explicit old-history limitation copy;
- keyboard/focus/live-region/copy-confirmation/removal-confirmation checks plus light/dark,
  reduced-motion, mobile and 200% zoom/reflow evidence with no clipped or unreachable action;
- ordinary focused and full repository quality gates required by the worker/reviewer assignments,
  with fresh resets, retries zero for meaningful E2E, frozen-source/invariant checks and cleanup.

## Evidence collected in P07

### Automated, read-only validation

- `pnpm exec vitest run tests/integration/invite.test.ts tests/unit/crypto/keywrap.test.ts`: **2
  files, 39/39 tests passed**. The keywrap tests prove real authenticated/sealed primitive round
  trips and properties. The invite file proves schemas, base64/keypair generation and URL-safe
  derivation only; despite its filename it does not exercise a router, database, full invitation
  exchange or UI.
- `pnpm exec supabase test db tests/database/rls-audit.sql`: **97/97 passed**. This proves current
  database permissions, atomic one-time invite acceptance/replay rejection and exact-set membership
  envelope updates. Its fixture ciphertext is literal/manual, so it does not prove a real key
  exchange, provider open, route binding or removal/rekey protocol.
- From a fresh reset,
  `env -u SUPABASE_JWT_SECRET pnpm exec playwright test tests/e2e/accounts.spec.ts tests/e2e/realtime-security.spec.ts --workers=1 --retries=0 --reporter=list`:
  **8/8 passed**. Seven account/default-Person cases prove the financial `Me` default. The Realtime
  case proves isolated-context encrypted transport and post-fixture-removal delivery denial, with
  the P05-independent provisioning limitations described above.

These passing checks bound current behavior; none is represented as a passing invitation or atomic
rekey journey.

### Installed headless CLI discoverability evidence

An owner journey began at ordinary `http://localhost:3000`, used visible Get Started/new-identity
controls, retained no recovery phrase, and navigated only through visible application links. It did
not open a direct invite URL, create/read an invite secret, call an admin/service fixture, inspect
clipboard contents or bypass authorization.

- Vault selector exposed `My Vault owner`, confirming the owner state discoverably.
- Desktop Vault Settings exposed only Vault Information/name and Currency Settings; no Access,
  Members, Invite, Revoke, Remove or Rekey control existed.
- Desktop People said
  `Manage household members, invite collaborators, and track settlement balances`, but exposed only
  one `Me` Person and Add Person/Edit/Delete. Add Person focused `Enter person's name`, confirming
  the control creates a financial Person rather than membership.
- The request log contained normal register/vault/snapshot/sync/realtime and navigation calls, but
  no invite or membership list/create/accept/revoke/remove/rekey procedure. Browser console errors
  were **0**.
- At 390×844 in dark mode with reduced motion, the normal mobile menu exposed People and Vault
  Settings. At 200% zoom, the Person name disappeared from the accessibility snapshot and the Vault
  Settings menu link was outside the actionable viewport; a normal locator click timed out for that
  reason. P08 must turn this observation into regression coverage rather than copy the flaw.
- A legitimate member/outsider membership journey was unavailable: the owner had no discoverable way
  to issue an invitation. It was intentionally not manufactured with a direct URL, placeholder
  secret or service-role insertion.

## Dependency and dispatch status

- P07 can be independently reviewed as the architecture/evidence package with the fixed empty code
  range below.
- P08 is **not dispatch-ready** until the required D-011/P05 no-code diagnostic recheck resolves the
  installed-CLI real-hidden-topology external block recorded in `DEPENDENCIES.md`. P07 evidence does
  not downgrade or bypass that gate.
- If P07 review approves this exact artifact, P08 must implement the complete normative contract; it
  may not narrow the work to placing the existing generator on a page.
- Proposed questions for root transcription: **none**. The decision hierarchy yields a safe,
  reversible default without unresolved human input.

## Cleanup and immutable boundary verification

- Browser session data was deleted/closed, the temporary development server was stopped, and
  `.playwright-cli` plus `test-results` were moved to trash. No recovery phrase, invite fragment,
  signing/encryption key or wrapped vault key is retained in this artifact or workspace output.
- A final ordinary local database reset applied migrations 005–009. Aggregate row count is `0`
  across `auth.users`, all nine public mutable tables and `realtime.subscription`.
- Realtime remains `public.ecr.aws/supabase/realtime:v2.112.6` with 79 internal migrations,
  compatible subscription filter `ARRAY:_user_defined_filter`, and zero logged
  `MigrationCountMismatch` occurrences.
- Frozen-source boundary at handoff:
    - rolling scratch: SHA-256 `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`,
      350 lines, 24,244 bytes;
    - immutable FS-001: SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`,
      715 lines, 25,441 bytes;
    - `SCOPE.json`: SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450
      lines, 27,382 bytes.
- Required review range is the valid empty product-code range
  `fe1871ce7dce1e831b57ee5656d38ce5c800aae3..fe1871ce7dce1e831b57ee5656d38ce5c800aae3`.
- HEAD remains `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`; the index is empty. Git-visible state is
  exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this sole untracked P07 evidence
  directory. No product, test, migration, configuration, prior evidence/review, scratch,
  frozen-source or ledger file was changed by this worker.

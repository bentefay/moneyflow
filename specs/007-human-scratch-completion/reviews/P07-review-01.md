# P07 Independent Review — Revision 01

## Verdict

**FAIL.** The linked-hybrid decision is the correct architecture direction, and the evidence
accurately inventories the current nonfunctional invitation/removal implementation. Its proposed P08
contract is nevertheless not safe to implement as written.

Clause 19 discards an active remaining member's old key and reinitializes from the new epoch
snapshot without first preserving that member's old-epoch unpushed IndexedDB operations. Those
operations are deliberately encrypted before their immediate crash-safe local write, are absent from
the owner's server watermark/snapshot, and become undecryptable after the old key is discarded. That
is a financial-data-loss path, not an implementation detail. Separately, the threat model says one
transaction establishes SQL membership and an encrypted CRDT Person/link. A zero-knowledge server
cannot atomically mutate that client-encrypted document; the contract has no durable, idempotent
acceptance/reconciliation protocol for a crash after invite consumption but before the Person/link
commit.

P07 therefore cannot bind P08 to this artifact. No product/test/migration diff is requested. A
second no-code P07 evidence revision must retain the linked hybrid, sender-bound authenticated
envelopes, member-only governance and all unaffected clauses while adding a crash-safe epoch
transition and an honest cross-store acceptance saga. P08 remains blocked by the required D-011/P05
recheck regardless of this FAIL, and neither HS-011 nor HS-012 may be marked complete.

## Immutable review boundary

- Package/revision: `P07/01`, HS-011 architecture evidence only.
- Literal reviewed range is the valid empty range
  `fe1871ce7dce1e831b57ee5656d38ce5c800aae3..fe1871ce7dce1e831b57ee5656d38ce5c800aae3`.
- `git diff --exit-code BASE HEAD` passes; HEAD remains the exact assigned SHA and there is no P07
  commit or product/test/configuration change.
- Frozen implementation evidence:
  `specs/007-human-scratch-completion/evidence/P07/implementation-01.md`, independently verified
  SHA-256 `2e5173cdf1df4fac4de3b64ecb2887a3c70a00d387e36298f5c9eb8eaa1164ad`, 503 lines and 44,728
  bytes.
- The index is empty. Before this review artifact, Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md`/`PROGRESS.md` and the assigned untracked P07 evidence. No product, test, migration,
  prior artifact, ledger, scratch, feature-spec or agent path was changed by the worker or reviewer.

## Independently confirmed current state

The evidence's repository trace is accurate and appropriately distinguishes code existence from a
discoverable, secure product journey:

- A financial `Person` is encrypted CRDT data used by accounts, allocations, settlements and
  history. `linkedUserId` is an optional global public-key hash, while `name` is currently required.
  A server `vault_memberships` row instead carries stable SQL identity, role and a key envelope.
  Editing/deleting a Person cannot safely grant or revoke membership, and removing membership cannot
  delete the historical Person.
- The People page hardcodes `isOwner = false` and `vaultKey = undefined`, making
  `InviteLinkGenerator` unreachable. Its copy nevertheless claims household-member and invite
  management. The only live actions add/edit/soft-delete financial People; linked rows can render a
  truncated global identity hash as human-facing copy.
- Vault Settings exposes only vault name and currency. There is no roster, invite list, Copy,
  Revoke, Remove, rekey or owner-governance UI. Repository searches found no product caller for
  `invite.list/revoke`, `membership.list/remove/rekey`, `vault.members`, or `performCompleteRekey`.
- Current invite creation permits `owner` or `member`, accepts loose valid-base64 values, does not
  persist authoritative wrapping-sender/version/epoch metadata, and identifies public lookup only by
  derived invite public key. Acceptance does not bind the route UUID and trusts caller-provided
  membership envelope/public-key fields after the SQL row lock.
- The redemption page calls a hook from an asynchronous effect, never retains or unwraps the
  returned real envelope, and accepts with 48 random placeholder bytes. `VaultProvider` opens an
  authenticated `crypto_box` envelope using the session public key as sender, so the placeholder
  cannot open the vault.
- Locked redemption embeds the fragment inside an encoded `returnTo` query, exposing a bearer
  capability to request/log/referrer surfaces, while Unlock ignores that return route. The real
  fragment-only journey is therefore both leaked and lost.
- `membership.remove` physically deletes first and only then returns remaining rows whose nullable
  encryption key happens to exist. `membership.rekey` later updates only exact-set envelopes. It
  does not couple removal, snapshot, current-operation watermark, epoch, pending invites or Realtime
  grants. `vault.leave` is another delete-only path.
- `performCompleteRekey` emits sealed-box envelopes, whereas the active provider opens authenticated
  sender/recipient `crypto_box` envelopes. It has no caller and re-encrypts at most one snapshot,
  without assigning permanent operations or concurrent writes to a new epoch.
- The P05 E2E helper reads a real key with test authority, self-wraps it for a fixture member and
  inserts/deletes membership through service authority. It proves shared encrypted transport after
  provisioning, not owner invite discovery, sender-bound redemption, atomic rekey or old-key
  exclusion.

The existing positive boundaries should be retained: signed procedures derive the actor from the
verified request, direct anon/authenticated table access is denied, invite acceptance locks and
consumes one row by public key, vault creation atomically creates an owner membership with a real
self-wrapped key, and the exact-set rekey SQL rejects missing/duplicate current members. None makes
the present end-to-end invite/removal UI functional.

## Architecture-alternative adjudication

The selected **linked hybrid** is preferable to both alternatives and is not the reason for FAIL:

| Alternative         | Independent adjudication                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Vault Settings only | Correct security authority, but by itself omits the HS-012 financial Person association/status.                                               |
| People-owned access | Rejected: conflates allocation/history records with cryptographic roles and makes Person edit/delete a dangerous apparent access action.      |
| Linked hybrid       | Selected: Vault Settings owns access; People remains financial and may show an optional membership UUID link/status and authorized deep link. |

The associated terminology and governance choices are sound. `Person`, `Member` and `Invite` remain
separate; optional labels stay encrypted and non-authoritative; raw key hashes are not display
names; new invites/removals are member-only; and owner promotion/transfer/removal stays excluded
until an independently reviewed governance lifecycle exists. Existing extra owners may remain
visible for compatibility but cannot be changed through P08. This is the narrowest reversible model
consistent with HS-011/HS-012, P04 identity authority and P06 data minimization.

## Findings

### F-001 — Critical — key-epoch transition destroys a remaining offline member's unpushed work

The proposed clause 19 says old-epoch writes are rejected, old operations are not served during
current bootstrap, and remaining online/offline clients discard the old key and reinitialize from
the new snapshot (`implementation-01.md:302-304`). Its mandatory tests require only a “remaining
offline-client bootstrap” (`:401-404`). There is no step that reads, decrypts, merges and
re-encrypts an active remaining member's locally unpushed old-epoch operations before old-key
destruction.

That omission contradicts the actual persistence contract:

1. Every local Loro update is encrypted immediately and written to IndexedDB with `pushed=false`
   before throttled server sync (`src/lib/sync/manager.ts:229-269`).
2. IndexedDB's compound pushed index and `getUnpushedOps()` deliberately make those writes
   crash-safe (`src/lib/sync/persistence.ts:19-32`, `:58-75`, `:193-223`).
3. Startup decrypts and imports those operations with the current vault key before reporting or
   pushing them (`src/lib/sync/manager.ts:333-470`). It also sends `hasUnpushed` to prevent the
   server from replacing them with a snapshot (`:477-525`).
4. An offline remaining member's updates are not in the server watermark used by the removing
   owner's epoch+1 snapshot. Reinitializing from that snapshot omits them. Rejecting their old-epoch
   push is correct for security, but discarding the only key that can decrypt them makes recovery
   impossible.

This can occur without malicious behavior: member B edits offline, owner A removes member C, then B
reconnects after the atomic epoch advance. B remains authorized but loses its financial edits under
the proposed transition. A crash after receiving the new envelope but before an in-memory conversion
creates the same outcome unless the previous key is recoverably wrapped for B. The contract's honest
limitation for a removed member's past copies does not authorize data loss for a remaining member.

Revision 02 must choose and specify a crash-safe transition. The recommended design retains
versioned per-epoch envelopes, including explicit sender metadata, for continuously authorized
members. Only an active membership can fetch its historical envelope; the removed member gains no
new key. A remaining client must journal the transition, unwrap both epochs, decrypt/import every
old-epoch unpushed op into the authenticated current snapshot, persist and push equivalent new-epoch
operations, then mark the journal complete and zeroize the old key. Retries/crashes must be
idempotent, and no old-epoch operation may reach the server after advance. An equivalently safe
locally self-wrapped transition journal would require stronger loss/recovery proof; silent discard
is forbidden.

Required acceptance adds at least: an active member edits offline; another owner rotates while that
member is offline; reconnect, reload and an injected crash at every transition boundary preserve the
edit exactly once under the new epoch; another concurrent old-epoch server write makes removal
retry; and the removed member still cannot fetch a new envelope, publish an old-epoch op or decrypt
future data.

### F-002 — High — the contract claims impossible SQL/CRDT atomicity and lacks crash reconciliation

Clause 22 requires idempotent Person creation/linking on acceptance, and clause 28 correctly forbids
success before vault decryption, membership, Person and selection all commit
(`implementation-01.md:314-339`). The replay threat row then requires a **single transaction** to
consume the invite and establish “one membership/Person/link” (`:346-353`). That transaction cannot
exist under the same artifact's zero-knowledge boundary: membership/invite rows are server SQL,
while Person and member-profile records are encrypted client-side CRDT state that the server cannot
read or mutate.

The order has a real crash boundary. Mutating Person first can leave an orphan encrypted financial
link when the locked acceptance fails. Consuming the SQL invite first can leave a valid membership
without the required Person/link if the tab crashes before the CRDT write. Current clauses say
retry/refresh/concurrency cannot duplicate and no success is shown, but they do not define a durable
state, deterministic identity or load-time reconciler that finishes the second case. They also do
not name the capability-bound pre-membership snapshot route needed by clause 10 to authenticate the
real vault key before SQL acceptance.

Revision 02 must replace the impossible transaction claim with two explicit boundaries:

1. A capability endpoint bound to invite UUID, derived public key and current epoch returns the
   minimum versioned envelope/sender plus an encrypted current snapshot and watermark. The client
   authenticates the 32-byte real key and snapshot before any membership mutation; generic failure
   remains non-enumerating.
2. One SQL transaction locks/consumes that exact invite pair and epoch, idempotently creates or
   reactivates the stable membership UUID, and returns it. A durable client-side acceptance state
   then applies a deterministic/idempotent encrypted CRDT link keyed by that UUID, selects the vault
   and syncs. Every vault load/retry resumes reconciliation after a crash; concurrent tabs converge
   to one Person/link. The UI remains in an honest “finishing” state until completion. It must never
   imply that SQL rolled back a CRDT mutation.

For first-user acceptance, revision 02 should also resolve clause 14's alternative: the invite-aware
registration path defers default personal-vault creation until explicit invitation
cancellation/failure, then selects the accepted shared vault on success. This avoids an orphan vault
and makes the cancellation behavior deterministic. Real tests must crash after SQL acceptance and
before/between local Person, selection and sync commits, then prove refresh/concurrent tabs recover
exactly one linked Person without consuming or duplicating a second membership.

## Clause-by-clause P08 contract adjudication

| Clause | Verdict                         | Review                                                                                                                                                        |
| -----: | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      1 | sound                           | Discoverable Access & Members in Vault Settings plus corrected financial People copy implements the linked hybrid.                                            |
|      2 | sound                           | Owner/member/outsider visibility and server rejection preserve least privilege.                                                                               |
|      3 | sound                           | Signed, server-derived actor/authority is consistent with P04; locked rows must derive invite targets.                                                        |
|      4 | sound                           | Member-only invite/removal and explicit owner-governance exclusion avoid unsafe co-owner escalation.                                                          |
|      5 | sound                           | Least-field roster and generic failures address correlation/enumeration.                                                                                      |
|      6 | sound                           | Exact 32-byte unpadded fragment capability and complete artifact/network exclusions are appropriate.                                                          |
|      7 | sound                           | Authoritative membership sender key, version and exact lengths fix the current unbound envelope.                                                              |
|      8 | sound                           | UUID + derived-key + epoch locking closes route substitution, replay and concurrent accept.                                                                   |
|      9 | sound                           | Epoch-bound invites and atomic pending-invite revocation are necessary.                                                                                       |
|     10 | incomplete                      | Authenticating a real snapshot before membership is correct, but F-002 requires the exact capability-bound retrieval boundary.                                |
|     11 | sound                           | Rewrapping the exact key and storing explicit self-sender/version metadata makes provider open coherent.                                                      |
|     12 | sound before SQL                | Placeholder prohibition and crypto-failure non-consumption are correct; post-SQL Person failure belongs to F-002's saga.                                      |
|     13 | sound                           | Prompt URL clearing, ephemeral handling and zeroization/drop are proportionate.                                                                               |
|     14 | incomplete                      | Fragment preservation is correct, but the current “defer default vault or handle it” alternative must become the deterministic defer-on-invite path in F-002. |
|     15 | sound                           | Masked generation, explicit Copy and visible expiry/revoke avoid routine secret rendering.                                                                    |
|     16 | sound                           | Monotonic epochs on envelopes/snapshots/permanent operations are required for enforcement.                                                                    |
|     17 | sound after clarification       | Snapshot/watermark/exact recipients are correct; revision 02 should select authenticated `crypto_box` consistently and remove the sealed-box alternative.     |
|     18 | sound for SQL-owned state       | One locked RPC can atomically commit snapshot/envelopes/removal/grants/invites/epoch; it cannot include encrypted Person state.                               |
|     19 | **unsafe**                      | F-001: discard/reinitialize loses remaining-member unpushed old-epoch ciphertext.                                                                             |
|     20 | sound after F-001               | Future payload/key denial and honest past-copy limitation are correct once remaining clients transition safely.                                               |
|     21 | sound                           | Soft removal and stable UUID reactivation preserve links while active predicates deny access.                                                                 |
|     22 | **infeasible as specified**     | F-002: needs a deterministic crash-recoverable client reconciliation saga, not one cross-store transaction.                                                   |
|     23 | sound                           | Encrypted client-readable Person intent and optional encrypted label avoid server plaintext.                                                                  |
|     24 | sound                           | Exact fallback order and prohibition on key/hash labels meet HS-012 privacy/accessibility.                                                                    |
|     25 | sound                           | Person/history preservation and no implicit access action maintain financial integrity.                                                                       |
|     26 | sound                           | Encrypted UUID-keyed profiles remain non-authoritative and do not revive P06's global blob.                                                                   |
|     27 | sound                           | Keyboard, focus, live-region and destructive-confirmation requirements are complete interaction outcomes.                                                     |
|     28 | sound outcome, missing protocol | Honest recovery/success timing is right; F-002 supplies the durable state needed to achieve it.                                                               |
|     29 | sound                           | Complete responsive/preference/zoom reachability directly targets the reproduced current defect.                                                              |

## Threat, privacy, migration and reversal adjudication

The fragment threat model, generic invite failures, server-derived roles, exact sender
authentication, member-only governance, encrypted optional profiles, stable vault-scoped membership
link and old-history limitation are all suitable. They avoid plaintext identity profiles and do not
revive the deleted user blob. The proposal also correctly refuses to call a bearer invite
recipient-bound before signed acceptance.

The migration direction is mostly feasible: add envelope version/sender/epoch/removed metadata;
backfill structurally valid legacy self-wrap rows from recipient encryption keys; block malformed
rows for repair; revoke every nonfunctional legacy pending invite; preserve membership uniqueness;
and migrate `linkedUserId` only for an exact same-vault match while retaining ambiguity. Revision 02
must extend this model with versioned per-epoch envelope retention or an equally crash-safe key
transition record. Replacing the sole old envelope, as clauses 18–19 currently imply, is not a safe
migration for offline cache state.

The proposed feature gate and forward-only reversal correctly retain normalized rows instead of
destructively down-migrating epoch-advanced vaults. It is honest that an old binary can read only
compatible epoch-0 data. Revision 02 must add transition-journal recovery to reversal and export
proof so a rollback cannot strand unpushed work or an accepted-but-unlinked membership.

## Independent automated validation

| Check                                                                  |    Independent result |
| ---------------------------------------------------------------------- | --------------------: |
| exact empty `BASE..HEAD`                                               |                passed |
| focused invite/keywrap Vitest                                          | 2 files, 39/39 passed |
| typecheck                                                              |                passed |
| fresh migrations 005–009                                               |                passed |
| current RLS/invite/rekey pgTAP                                         |          97/97 passed |
| accounts + P05-independent Realtime E2E, repeat 2, retry 0, one worker |          16/16 passed |

The passing tests establish primitive authenticated/sealed-box round trips, schema/URL derivation,
current direct-table denial, one-time invite-row consumption, exact-set envelope update, default
financial `Me`, and shared transport after fixture provisioning. They do **not** execute an invite
router/database exchange, route-bound real-key unwrap/provider reopen, discoverable owner UI,
fragment-safe locked/new-user flow, atomic epoch removal, offline-key transition or automatic Person
linkage. Repeating them cannot cure the two contract defects, and the review does not misrepresent
fixture/service provisioning as a real invitation.

## Installed headless CLI discoverability and UX evidence

The reviewer used repository-installed `playwright-cli` in disposable headless session
`p07-review01`, starting at the ordinary landing page and using only visible onboarding/navigation
controls. The generated phrase remained masked, was copied only to the disposable browser clipboard
to complete normal onboarding, was never read into output, and the session/data were deleted.

- Desktop Vault Settings showed accessible heading `Vault Settings`, `Vault Information`,
  `Vault Name` and `Currency Settings`; it had no Access, Members, Invite, Copy, Revoke, Remove or
  Rekey control.
- The discoverable owner selector exposed `My Vault` with `owner`. People exposed heading `People`,
  misleading collaboration copy, one `Me` row and `Add Person`. Activating Add Person focused
  textbox `Enter person's name`, proving it creates a financial Person rather than membership.
- Network/server records contained normal register, vault creation/list, snapshot, sync and Realtime
  calls and no invite/membership/list/remove/rekey call. The inspected browser console had zero
  errors. Current navigation contained no query or fragment and no invite/key capability was
  created, opened or retained.
- At 390×844 with dark scheme and reduced motion active, `People`, `Me`, `Add Person` and mobile
  `Open menu` were reachable with no document-level horizontal overflow.
- At exact 200% CSS zoom, `Me` remained visual text but lost an accessible snapshot reference. The
  mobile drawer still listed `Vault Settings`, yet a normal locator click repeatedly failed because
  that link was outside the viewport. This independently reproduces the evidence's clause-29 target;
  no force/direct navigation was used to hide the defect.
- A member/outsider invitation session could not be created through normal UI. The review correctly
  stopped instead of inventing a direct invite URL, reading a secret or using service authority to
  claim discoverability.

## Q-PROPOSAL-P07-01-01 — Make epoch transition lossless and acceptance crash-recoverable

- **Raised by/package/revision:** `human_scratch_reviewer`, P07, revision 01, 2026-07-20.
- **Context and evidence:** The linked-hybrid access/person split and sender-bound invite are sound,
  but clause 19 destroys an active remaining member's unpushed old-epoch encrypted operations, and
  the replay model requires impossible SQL-plus-encrypted-CRDT transactionality. Installed UI and
  current automated coverage provide no mitigating journey.
- **Why existing authority does not decide it:** HS-011/HS-012 require secure access plus exactly
  one linked Person and preservation of financial history, while the sync rules require immediate
  crash-safe encrypted local writes. They decide the outcomes but not the epoch-envelope history or
  cross-store reconciliation mechanism. The server's zero-knowledge boundary excludes pretending it
  can transact the CRDT.
- **Options considered:** (A) retain per-epoch envelopes for continuously authorized members and use
  a durable client transition journal, plus a server-atomic membership/client-idempotent Person
  saga; (B) keep only the current envelope and discard old local work; (C) wait for all members to
  be online before removal; (D) let the server create plaintext Person/link data; (E) drop automatic
  linking. Only A preserves offline data, permits immediate revocation, maintains zero knowledge and
  satisfies both requirements. B loses data, C is unenforceable, D breaks privacy, and E violates
  HS-012.
- **Reversible default selected to continue:** choose **A**. P07 revision 02 remains an empty
  product range and may write only `evidence/P07/implementation-02.md`. Retain the linked-hybrid ADR
  and all unaffected clauses. Replace clause 19 with versioned per-epoch envelope/history access
  restricted to continuously active memberships, a crash-safe transition journal, exact
  re-encryption of every local unpushed old-epoch op before old-key zeroization, and idempotent
  retry. Replace the single cross-store transaction claim with the capability-bound snapshot check,
  one atomic SQL consume/reactivate returning membership UUID, then deterministic encrypted CRDT
  reconciliation resumed on every load until Person/link/selection sync. Select authenticated
  `crypto_box` as the sole P08 envelope version and defer default-vault creation during invite-aware
  first onboarding.
- **Required acceptance evidence:** add explicit transition/recovery state diagrams and storage
  ownership; active-offline edit + concurrent rotate + reconnect/reload/crash tests; removed-client
  denial; old-write conflict/retry; exact envelope-history authorization; invite snapshot capability
  privacy/oracle checks; crashes after SQL accept and before each CRDT/selection/sync boundary;
  concurrent-tab exactly-one Person/link; and every original 29-clause test plus the existing real
  isolated owner/invitee/removal journey. No service fixture, plaintext key journal or success
  before reconciliation is allowed.
- **Decision-hierarchy basis:** frozen access/link requirements first, then existing zero-knowledge
  and local-first crash-safety contracts, financial-data preservation, least privilege and the
  smallest no-code evidence correction.
- **Impact and risk:** Per-epoch envelopes add encrypted-key history and access-policy surface;
  transition journals can duplicate an operation if identity mapping is not exact; client-side
  reconciliation can loop or duplicate Persons without deterministic membership keys. Exact
  active-membership policies, epoch/op idempotency, journal crash tests and CRDT convergence tests
  are mandatory.
- **Reversal or migration path:** The P07 correction itself is evidence-only. P08 must gate new
  writes, backfill epoch-0 sender/envelopes, revoke pending legacy invites and retain old schema
  reads until migration proof. Reversal hides new UI/mutations while preserving memberships,
  per-epoch envelopes, journals and encrypted links; it never deletes pending local work or pretends
  an older app can read an advanced epoch.
- **Human review still useful after completion:** No preference blocks continuation. Root may apply
  this reversible default; optional human review may choose an equivalently lossless local journal
  instead of server-held encrypted envelope history only if it meets the same recovery and access
  proof.

P08 remains **not dispatch-ready** after this proposal. It first requires an independently approved
P07 revision-02 contract and the D-011/P05 no-product real-hidden-topology recheck required by
`DEPENDENCIES.md`. No architecture evidence can waive that external gate.

## Cleanup and frozen-source invariants

The reviewer closed/deleted the CLI session, stopped the development server, moved only generated
`.playwright-cli`/`test-results` artifacts to desktop trash, restored `next-env.d.ts`, and confirmed
no Playwright/Next process remains. A final ordinary database reset applied migrations 005–009 and
left aggregate mutable row count zero across auth, public and Realtime subscription state. Realtime
is healthy on `public.ecr.aws/supabase/realtime:v2.112.6`, with 79 internal migrations, compatible
`_user_defined_filter` subscription type and zero `MigrationCountMismatch` log entries.

Frozen identities remain exact:

- rolling `specs/human-scratch.md` SHA-256
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines and 24,244 bytes;
- immutable FS-001 SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines and 25,441 bytes; and
- immutable `SCOPE.json` SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines and 27,382 bytes.

Root should persist this immutable FAIL review/evidence, transcribe the complete proposal, leave P07
`changes_requested`, keep HS-011/HS-012 unchecked, and dispatch only the no-code P07 revision-02
evidence correction. No P08 implementation path is authorized by this review.

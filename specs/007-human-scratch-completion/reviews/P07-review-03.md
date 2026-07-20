# P07 Independent Review — Revision 03

## Verdict

**FAIL.** Revision 03 closes the revision-02 cross-tab data-loss race. Its isolated-fork edit
admission, same-store fence check/append, seal enumeration, journal-revision compare-and-swap,
terminal minimum epoch and no-late-lineage adoption proof form a feasible lossless protocol. The
creator SQL truth is also genuinely idempotent and recoverable, and the intended encrypted
winner/loser repair preserves financial history without giving the server CRDT authority.

Two remaining gaps prevent P07 approval.

First, the artifact equates a stable **semantic lineage** with an exact Loro operation. Concurrent
creator, acceptance or repair clients can assign the same values and lineage while producing
different peer-specific Loro update bytes. The zero-knowledge server stores only the first row for
that lineage and cannot prove the second ciphertext is the same operation. Treating the second as
already permanent either loses a locally durable CRDT operation from the permanent audit stream or
leaves the saga unfinished. The same value-only repair lineage cannot emit a causally newer repair
after a stale offline claim arrives following the earlier repair acknowledgement, contradicting the
claimed no-oscillation property.

Second, the creator saga prepares the established initial vault snapshot before SQL returns the
vault and owner membership UUID, then derives a different UUIDv5 owner Person afterward. The actual
initial snapshot already contains `person-default-me`, and the default account assigns it 100%
ownership. Revision 03 neither reuses that Person nor excludes/migrates it and its ownership before
creating the UUIDv5 Person. Implemented literally, the “one owner Person” protocol can create two
active People and leave the default account allocated to the unlinked one.

P07 remains `changes_requested`. Revision 04 may remain evidence-only and needs only the exact
CRDT-operation/causal-repair identity and initial-default reconciliation defined below. All sound
revision-03 fence, SQL truth, access-generation, capability, crypto, onboarding, privacy, migration,
reversal, export, accessibility and real-browser requirements must remain unchanged. P08 remains
separately blocked by D-011/P05.

## Immutable review boundary

- Package/revision/scope: `P07/03`, HS-011 architecture with integrated HS-012 contract.
- Literal original BASE: `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`.
- Literal reviewed HEAD: `55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d`.
- HEAD remained exact. Revision 03 added no product, test, migration, configuration or dependency
  commit.
- The cumulative range contains only root-owned P07 revision-01/02 evidence, reviews and
  control-ledger/question/risk history in commits `892bf53`, `033cb8f`, `51cf5ba` and `55bc57e`.
- Frozen revision-03 evidence:
  `specs/007-human-scratch-completion/evidence/P07/implementation-03.md`, independently verified
  SHA-256 `e071c6b240c7907f6814425f7da4dcb25f02e87b95522d9c6c95e953d85ddfbb`, 906 lines and 79,658
  bytes.
- Prior immutable hashes remain exact: revision-01 evidence
  `2e5173cdf1df4fac4de3b64ecb2887a3c70a00d387e36298f5c9eb8eaa1164ad`, revision-01 review
  `296a5d0a17e2e1ae882422c3975d11c9ffc289c0a273ac52fb50e23af8b8381e`, revision-02 evidence
  `463c9139e76a65542c49ad3ef62212571e9d59cf7c198a81dbd864a9b419a85f`, and revision-02 review
  `3f74108cff1bfc48fa49d0fe0e217f6ba491789851932ed229c94ffe93f6c4e3`.
- Before this artifact, the index was empty and Git-visible state was exactly root-owned unstaged
  `HANDOFF.md`/`PROGRESS.md` plus the assigned untracked revision-03 evidence. The reviewer changed
  only this assigned review file and made no commit.

## Revision-02 finding closure

### Prior F-001 — closed — persistent edit admission and terminal fence

The corrected ordering is sound:

1. A domain mutation runs first on an isolated Loro fork, so the live document cannot get ahead of
   durability (`implementation-03.md:187-202`).
2. One IndexedDB transaction reads the persisted epoch fence and either appends under the open
   epoch, extends the sealed transition journal, or rejects/re-admits the unchanged update under the
   terminal/current epoch (`:193-210`).
3. Seal and append use the same stores, so IndexedDB write-transaction serialization makes
   before-seal inclusion versus after-seal journal extension exhaustive (`:221-229`).
4. Every extension increments `journal_revision`; adoption checks captured fence/journal revisions,
   every mapping acknowledgement and zero deferred/unmapped source lineage in its transaction
   (`:231-238`).
5. Adoption atomically advances `minimum_admissible_epoch` and retains a terminal receipt, so a
   stale tab cannot later durably append or publish the source epoch (`:240-244`).

Subscriber persistence is suppressed only for an update already durably admitted, while remote
imports use a separately tagged path. BroadcastChannel/Web Locks remain notifications rather than
authority. The explicit crash table and two-real-tab both-sided barrier proof cover edit admission,
seal, extension, adoption, cleanup and stale-terminal re-admission without service-row fixtures.
This closes the exact lost-old-operation race from revision 02.

### Prior F-002 — partially closed

The server side is sound. Caller/default-purpose uniqueness creates one SQL vault, owner membership,
current envelope, initial snapshot and immutable creation truth; protected `pendingCreations` makes
a lost response or missing local journal recoverable (`implementation-03.md:515-534`). The server
never reads or writes Person plaintext. The client-side initial-default mismatch in new F-002 below
still prevents the claimed one-Person result.

### Prior F-003 — partially closed

The desired repair values are safe: retain the intended financial Person and winner, assign each
loser a deterministic fallback Person, change only link projections, and leave allocations/history
untouched (`implementation-03.md:576-610`). The operation-identity and causal-round defect in new
F-001 means those values are not yet guaranteed to become the exact permanent converged CRDT state.

## Findings

### F-001 — Critical — semantic lineage aliases distinct encrypted Loro operations

The creator link uses one lineage derived from creation truth and membership UUID
(`implementation-03.md:536-543`). Claim/repair clients similarly use one lineage derived from the
vault, intended Person, winning claim and sorted losers, on the premise that proposing the same
values and lineage lets server uniqueness accept or return one permanent operation (`:599-604`). The
acceptance saga makes the same general assumption when concurrent tabs emit redundant same-value
assignments (`:467-470`).

That assumption is false for Loro. A new Loro document has a random peer id, and a fork uses another
peer id. Operation identity includes peer/counter/causal history. The reviewer independently created
two documents from one snapshot, assigned peer ids 1 and 2, set the same map key to the same value,
committed, and exported the incremental updates. Both updates were 101 bytes but byte comparison was
false. No temporary file or product state was used.

The resulting failure is deterministic:

1. Two creator tabs recover the same SQL creation truth and derive the same Person ids and semantic
   lineage.
2. Each makes its own Loro assignment on its own peer/fork, durably admits a different encrypted
   update, and imports that exact operation into its live document.
3. Server uniqueness on `(vault_id, lineage_id)` retains the first ciphertext. Because the server
   cannot decrypt, it cannot establish that the second update is equivalent to the first.
4. If the second is acknowledged as existing/covered, that client's distinct `pushed=false` Loro
   operation is absent from the permanent all-ops stream. If it is not acknowledged, creator setup
   never completes. Pulling the first update does not erase the second peer operation from the
   loser's local Loro history.

This is hidden operation loss even if both current JSON projections happen to look equal. The two
peer operations can have different LWW order relative to a later rename/link repair, and a future
snapshot can carry the locally retained but never-permanent operation. The same defect affects
same-acceptance duplicate claims and multi-client loser repair.

It also invalidates the no-oscillation proof. Suppose claim/repair round R becomes permanent, then a
stale offline client imports or publishes its distinct old claim operation. The bijection scanner
derives the same value-only R lineage because winner/loser values have not changed. Server
idempotency returns the already-stored earlier R operation, which is not causally after the late
claim and therefore cannot guarantee that Loro projections return to the repaired state. The client
can remain `Finishing setup`, or repeat a repair that never produces a new permanent causal write.

Revision 04 must distinguish request/semantic idempotency from exact CRDT operation identity. It
must select one of these lossless forms:

- generate one canonical Loro operation with fixed peer/counter and canonical causal frontier for a
  semantic saga, bind the lineage to an exact update digest, and require every retry/client to
  import those exact authenticated permanent bytes; or
- give every actually distinct Loro update its own lineage/transport id and keep it permanently,
  while deterministic entity keys and an independently idempotent saga-completion record prevent
  duplicate People/links.

The zero-knowledge server may compare authenticated metadata/digests and return stored ciphertext;
it may not assert plaintext equivalence. A local operation can be marked covered only by the exact
same Loro update, never merely the same intended values. Every repair round must additionally bind
its lineage to the exact observed claim operation ids/causal frontier (or a monotonic encrypted
repair revision), so a late claim necessarily creates a new causally-later permanent repair.

Mandatory proof must cover two independent peers producing the same creator/acceptance/repair
values; response loss before either acknowledgement; exact permanent/local operation identity; and a
stale claim arriving after the first repair is permanent. It must finish with no unpushed or
non-permanent local operation, no repair oscillation and a stable bijection after reload on every
client.

### F-002 — High — creator saga does not reconcile the pre-existing default Person and ownership

Revision 03 prepares and stores the encrypted initial snapshot before SQL returns `vaultId` and
`membershipId` (`implementation-03.md:517-526`). Only afterward does it derive
`ownerPersonId = UUIDv5(namespace, vaultId || membershipId)` and create/upsert that Person plus
links (`:536-543`).

The established snapshot constructor already contains another active Person:

- `DEFAULT_PERSON_ID` is fixed as `person-default-me` and every new vault snapshot includes that
  `Me` Person (`src/lib/crdt/defaults.ts:49-65`, `:147-153`).
- The default account gives `person-default-me` 100% ownership (`:67-88`).
- Current real onboarding and repeated E2E confirm both `Me` and `Me (100%)` in a new vault.

Because the client does not yet know the server-returned vault/membership UUID while preparing the
snapshot, the UUIDv5 owner Person cannot be that established default. The contract does not state
that the initial snapshot omits the existing defaults, reuses `person-default-me`, rewrites default
account ownership, or safely retires an empty temporary Person. Its later “one Person” invariant and
test assertion do not supply those missing mutation semantics.

Implemented literally, the authenticated document contains `person-default-me` plus the new UUIDv5
Person, while the default account remains owned by the unlinked former. That violates HS-012's
automatic owner association and the exact creator-bijection promise; deleting the former without
moving ownership would also damage financial allocation integrity.

Revision 04 must make the initial snapshot and creator link one coherent model. The narrowest
established default is to retain `person-default-me` and, after SQL truth, idempotently link that
same vault-scoped Person to the returned owner membership UUID. An alternative may create a
Person/account-free initial snapshot and atomically create the final Person, default account and
100% ownership in the fenced creator operation. If a temporary default is ever present, the protocol
must migrate every ownership/reference and prove it has no history before any soft-delete; silent
duplicate, merge or delete is forbidden.

Creator tests must inspect ids and reciprocal maps, not only visible `Me`: exactly one active
default Person, default account ownership pointing to it at 100%, its link to the sole owner
membership, zero dangling references, one selected vault and permanent exact CRDT operations after
concurrent tabs, response loss and every crash boundary.

## Q-014, security and feasibility adjudication

| Area                                   | Independent adjudication                                                                                                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linked-hybrid surfaces                 | Sound. Vault Settings is authoritative for access; People remains encrypted financial state with optional status/deep link.                                                                                                      |
| Authenticated envelopes                | Sound. Sender/recipient `crypto_box` remains the sole exact-length/versioned convention; key material stays client-side and is zeroized.                                                                                         |
| Access generations/history             | Sound. Active exact generation plus uninterrupted epoch interval denies removed and re-added tenures unauthorized historical envelopes.                                                                                          |
| Server rotation                        | Sound. Locked epoch/watermark/lineage/recipient/invite sets serialize with append; any changed set aborts the entire rotation.                                                                                                   |
| Local edit-admission fence             | **Sound; prior F-001 closed.** Isolated fork, same-store admission/seal/adoption CAS and terminal minimum epoch prevent live-before-durable mutation and stale append.                                                           |
| Exact old-operation transition         | Sound. Stored exact bytes retain lineage across re-encryption and receive `covered`/`inserted` acknowledgement before source cleanup.                                                                                            |
| Capability preflight                   | Sound. UUID/X25519 pair, fragment-derived Ed25519 proof, snapshot binding, generic failures, `no-store`, rate limiting and least fields are feasible and non-enumerating.                                                        |
| Fragment/onboarding lifecycle          | Sound. Fragment persists only pre-SQL in URL/client memory; protected truth replaces it after commit; default creation is deferred through invitation outcome.                                                                   |
| SQL acceptance truth                   | Sound. Locked invite/epoch transaction and caller/attempt truth are idempotent and never claim encrypted CRDT atomicity.                                                                                                         |
| Protected acceptance/creation recovery | Sound. Caller-derived truth plus authorized current self-envelope and snapshot binding reconstructs a missing local journal.                                                                                                     |
| Default creator SQL identity           | Sound. Caller/default-purpose uniqueness prevents duplicate SQL vault/owner/snapshot truth. Client Person result remains blocked by F-001/F-002.                                                                                 |
| Person winner/loser values             | Sound as intended values. Intended Person/history are retained and deterministic loser ids avoid destructive merge. Permanent convergence remains blocked by F-001.                                                              |
| No-oscillation claim                   | **Unsound: F-001.** Value-only lineage is not an exact causally-versioned Loro repair round.                                                                                                                                     |
| Initial owner Person/allocation        | **Incomplete: F-002.** Existing snapshot defaults conflict with the later UUIDv5 Person.                                                                                                                                         |
| Privacy/profile boundaries             | Sound. Intent/profile/claims remain encrypted and non-authoritative; no global plaintext user blob or raw key label is introduced.                                                                                               |
| Migration/reversal/export              | Sound conditional on findings. Fence/journal/creator/claim state is retained and old unfenced writers are denied. Exact CRDT-op identities/repair rounds and initial-default reference migration must also be retained/exported. |
| P08/D-011 gate                         | Sound. Revision 03 explicitly refuses P08 readiness and preserves the supported genuinely-hidden-topology recheck.                                                                                                               |

## Complete 29-clause adjudication

Clauses 1–13, 15–21 and 23–29 retain their sound outcomes and strict proof directions, with clause
16 lineage identity conditioned on F-001. Owner/member/outsider authorization, member-only
governance, bearer secrecy, real-key proof, removal denial, privacy, accessible interaction and
real-browser coverage are not weakened.

| Clause | Verdict               | Review                                                                                                                                                            |
| -----: | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1–13 | sound                 | Surfaces, permissions, least fields, capability derivation, route/key/epoch binding, real-key authentication and fragment recovery remain complete.               |
|     14 | incomplete            | SQL/default-purpose idempotency is sound, but F-001/F-002 prevent proof of one exact fully linked default vault.                                                  |
|     15 | sound                 | Masked explicit Copy and visible expiry/revoke remain required.                                                                                                   |
|     16 | sound after F-001     | Epoch/watermark schema is sound; lineage must identify exact Loro operations rather than values alone.                                                            |
|  17–21 | sound                 | Rotation preparation/commit, persistent local fence, denial and generation-scoped readd are complete and feasible.                                                |
|     22 | **unsafe/incomplete** | F-001 can lose/alias concurrent encrypted CRDT ops and block causal repair; F-002 can duplicate the creator Person and orphan ownership.                          |
|  23–29 | sound after findings  | Encrypted intent/profile, history preservation, fallback, finishing guard and viewport/accessibility gates remain correct once bijection is actually established. |

The proof map must add byte/operation-identity assertions for creator, same-acceptance and repair
clients; a late-claim-after-repair causal round; and exact default Person/account
ownership/reference checks. Every existing real owner/invitee/removal, two-tab transition,
distinct-invite, migration, privacy, security and responsive test remains mandatory.

## Independent automated and CRDT validation

| Check                                                        |                       Independent result |
| ------------------------------------------------------------ | ---------------------------------------: |
| exact reviewed range/path audit                              | passed; root control/artifact paths only |
| focused invite/keywrap Vitest                                |                    2 files, 39/39 passed |
| typecheck                                                    |                                   passed |
| fresh migrations 005–009                                     |                                   passed |
| current RLS/invite/rekey pgTAP                               |                             97/97 passed |
| accounts + Realtime E2E, workers 1, retries 0, repeat each 2 |              16/16 passed in 1.2 minutes |
| two-peer same-value Loro update probe                        |      both 101 bytes; byte equality false |

The green repository tests remain current-state checks and do not execute the proposed fence,
creator truth, invitation, exact-operation identity or repair rounds. The two-peer probe directly
tests the assumption behind the findings without product mutation: same values and starting snapshot
are not enough to make one Loro update.

## Installed headless CLI and UX evidence

The reviewer used repository-installed `playwright-cli` in disposable headless session
`p07-review03`. The development server used the repository-configured local Realtime secret without
printing it. The generated phrase stayed inside the disposable browser and was never printed or
persisted in review evidence.

- Normal first-user onboarding reached `Vault Settings`. The accessibility snapshot exposed heading
  `Vault Settings`, textbox `Vault Name`, combobox `Default currency` and owner selector but no
  Access, Members, Invite, Copy, Revoke, Remove or Rekey control.
- People exposed one `Me`, `Add Person`, Edit/Delete and misleading collaboration copy. Activating
  Add Person focused textbox `Enter person's name`, confirming the current action is financial, not
  membership governance.
- The clean session had zero console errors. All observed application API requests were 200 and
  contained register, separate vault create/snapshot, list/sync and Realtime authorization; no
  invite, membership-list/remove or rekey request occurred.
- At 390×844 with dark scheme and reduced motion, People and its controls were exposed, both media
  queries were active and document horizontal overflow was false.
- At exact 200% CSS zoom, `Me` again lost its accessibility reference. The drawer exposed
  `Vault Settings`, but a normal click timed out because it remained outside the viewport. No force
  or direct navigation masked this inherited clause-29 defect.
- There is still no legitimate UI path for member/outsider/invite/removal/transition testing. The
  review did not invent a URL or use service authority. No changed control exists for a meaningful
  contrast measurement in this evidence-only revision.

## Revision-04 correction scope

No new human preference is required and there is no Q proposal. The CRDT permanence rule, frozen
HS-012 result and preservation hierarchy decide the narrow correction:

1. Preserve revision 03's fence, SQL creation/acceptance truth, linked-hybrid authority, envelope/
   tenure/capability/fragment security, onboarding, privacy, migration, reversal, export,
   accessibility and every existing proof gate.
2. Define exact CRDT-operation identity for concurrent saga/claim/repair emitters. Never acknowledge
   a different encrypted Loro update as covered merely because its intended values/semantic key
   match. Store every distinct operation or deterministically canonicalize exact bytes and causal
   frontier.
3. Give every post-late-claim repair a new causally bound monotonic round/lineage, and test a stale
   claim arriving only after the previous repair is permanent and acknowledged.
4. Reconcile the established `person-default-me` and default-account 100% ownership with the owner
   membership. Reuse it, or explicitly define a reference-complete Person/account-free
   initialization and final-default transaction; never leave or delete a referenced temporary
   Person.
5. Extend ownership/threat/schema/migration/reversal/export and clauses 14/16/22 with exact
   operation, causal repair and default-reference proof. No product implementation, server CRDT
   authority, plaintext journal, fixture substitute or weaker success gate is authorized.

P08 remains **not dispatch-ready** after this FAIL. It first needs independent approval of a P07
revision-04 contract and the separate D-011/P05 no-product supported-hidden-topology recheck.

## Cleanup and frozen-source invariants

- The CLI session was closed/deleted and the development server stopped. Generated
  `.playwright-cli`/`test-results` directories were moved to desktop trash and generated
  `next-env.d.ts` drift was restored exactly.
- A final `pnpm db:reset` applied migrations 005–009. Aggregate checks showed zero rows in
  `auth.users`, `public.vaults`, `public.vault_memberships`, `public.vault_invites`,
  `public.vault_ops`, `public.realtime_grants` and `realtime.subscription`.
- No Next or Playwright CLI process remained. The index stayed empty and HEAD remained
  `55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d`.
- Rolling scratch SHA-256 remains
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines and 24,244 bytes.
  Exactly 21 ordered blocks normalize byte-for-byte to SCOPE; the checked set is
  HS-002/HS-010/HS-014/HS-017/HS-018.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
- Immutable `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines and 27,382 bytes.

Root should persist immutable revision-03 evidence/review, leave P07 `changes_requested`, leave
HS-011/HS-012 unchecked, and dispatch only evidence-only P07 revision 04. No P08 implementation or
scratch marker is authorized.

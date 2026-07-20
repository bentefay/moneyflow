# P07 Implementation Evidence — Revision 03

## Immutable no-code boundary

- Package/revision/scope: `P07` / `03` / HS-011 architecture evidence correction.
- Original package BASE: `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`.
- Required unchanged pre-implementation HEAD: `55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d`.
- Allowed implementation paths: none. No product, test, migration, configuration, dependency,
  ledger, prior artifact/review, scratch, frozen source, SCOPE or agent path may change.
- Sole worker write: `specs/007-human-scratch-completion/evidence/P07/implementation-03.md`, created
  before further evidence work, intentionally uncommitted.
- At dispatch, the index and untracked set were empty. Git-visible dirt was exactly root-owned
  unstaged `HANDOFF.md` and `PROGRESS.md`.

## Correction plan

1. Preserve the independently accepted linked-hybrid architecture and every unaffected revision-01
   P08 clause.
2. Preserve revision 02's exact-operation transition, and close F-001 with one persistent,
   transactionally checked cross-tab edit-admission/append fence and a no-late-lineage proof.
3. Preserve revision 02's acceptance saga, close F-002 with a crash-recoverable default-vault
   creator-to-owner-membership Person saga, and close F-003 with deterministic post-merge repair
   when distinct invitations claim one Person.
4. Make creation, onboarding, schema/backfill/reversal, threat/privacy and test requirements
   executable and map every revised clause to proof.
5. Recheck formatting, frozen sources, workspace/HEAD/index boundaries and cleanup; do not claim
   review PASS or P08 dispatch readiness.

## Revision outcome

This revision implements canonical Q-014 as an evidence correction and closes all three revision-02
review findings without changing the selected architecture:

- **F-001 is corrected:** an active member never discards an old epoch key until every locally
  durable, unpushed operation from that authorization tenure is classified against the rotation's
  permanent-operation set, re-encrypted under the current key, durably persisted, published with the
  same semantic lineage, and acknowledged as either already covered or newly inserted. A local
  journal contains ciphertext references and state only; keys and plaintext operations remain
  memory-only and are zeroized. A persistent local fence serializes every edit admission and
  encrypted append with transition seal/adoption, so an edit cannot appear after enumeration as an
  unmapped source-epoch operation.
- **F-002 is corrected:** the server performs no CRDT Person mutation. A bearer-bound read lets the
  client authenticate the real vault key and current snapshot before mutation; one SQL transaction
  establishes durable membership/acceptance truth; then a reconstructible client saga creates or
  links one deterministic encrypted Person, persists selection and syncs before showing success.
  Default-vault creation has the same reconstructible two-boundary treatment: stable server creation
  truth returns the owner membership UUID and the client durably/synchronously establishes its
  deterministic default Person before reporting creation success.
- **F-003 is corrected:** encrypted claim records converge first; a deterministic post-merge repair
  preserves the intended financial Person and its winning reciprocal membership, moves each losing
  membership to its own deterministic fallback Person, and remains `Finishing setup` until the
  repaired bijection is durable and synced.
- **Onboarding is decided:** invite-aware first-user registration defers default-vault creation.
  Successful acceptance selects the shared vault; explicit cancellation or terminal invalidity
  resumes ordinary default-vault creation exactly once.

Revision 01's current-state trace and installed-CLI observations remain accurate and immutable. The
independent review accepted the linked-hybrid direction, terminology, member-only governance,
sender-bound fragment capability, stable membership identity, display privacy and clauses not named
below. This artifact restates the full corrected contract so P08 does not need to combine an unsafe
clause from revision 01 with this correction.

This artifact does not claim review PASS. P08 remains unavailable until revision 03 independently
passes and the D-011/P05 genuinely-hidden-topology gate is rechecked successfully.

## Retained architecture decision

### Status and selection

`Proposed for independent P07 revision-03 review.` The selected architecture remains **linked
hybrid**:

- `Vault Settings > Access & Members` is the sole authoritative membership/invite surface.
- People remains the financial allocation/settlement surface. It may display an optional membership
  link/status and an authorized `Manage access` deep link, but Person edit/delete never grants or
  revokes access.
- **Person** means an encrypted financial record, **Member** means a server-authorized identity with
  a vault-key envelope, and **Invite** means a single-use bearer capability.
- Only member invitations and member removal ship in P08. Owner promotion, transfer, demotion and
  removal remain out of scope; existing additional owners are visible but immutable. Standalone
  `vault.leave` is deprecated/rejected or becomes an owner-actionable request until it can invoke
  the same rotation protocol.
- Person linkage uses stable vault-scoped membership UUID, not a displayed global pubkey hash.
  Optional profile labels live only in encrypted CRDT data and never authorize access.

The dedicated-settings-only option still misses HS-012's financial association, while People-owned
access still conflates financial history with cryptographic authority. The linked hybrid remains the
narrowest reversible, least-privilege answer to the frozen wording.

### Corrected consequence

The SQL-owned portion of removal—new snapshot metadata/ciphertext, per-recipient envelopes,
membership status, epoch, grants and invites—can be atomic. Locally unpushed encrypted operations
cannot be part of that server transaction; continuously active clients reconcile them through the
lossless transition below. Likewise, SQL acceptance and encrypted CRDT Person/link state are two
durable boundaries joined by a resumable saga, not one transaction.

A removed member may retain plaintext/key material it downloaded while authorized. P08 must say
removal prevents future access, not that past copies are erased. It must not grant that member—or a
later reactivation tenure—any historical envelope it could not access while continuously active.

## Protocol ownership and storage model

| Record/state                        | Durable owner      | Required fields and authority                                                                                                                                                      | Plaintext boundary                                    |
| ----------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Vault epoch head                    | server SQL         | `vault_id`, monotonic `current_epoch`, monotonic operation watermark and permanent-lineage-set digest; mutations lock the vault row                                                | Identifiers/counters only                             |
| Membership tenure                   | server SQL         | stable `membership_id`, derived identity hash, role, recipient X25519 public key, monotonic `access_generation`, `active_from_epoch`, nullable `removed_at`/`active_through_epoch` | No name/profile                                       |
| Per-epoch key envelope              | server SQL         | `(membership_id, access_generation, epoch)`, authenticated-box version, authoritative sender and recipient X25519 public keys, ciphertext                                          | Vault key remains encrypted                           |
| Epoch snapshot                      | server SQL         | epoch, ciphertext, version vector, snapshot watermark, exact permanent lineage-set digest, rotation id                                                                             | CRDT snapshot remains encrypted                       |
| Permanent operation                 | server SQL         | transport UUID, stable `lineage_id`, epoch, server sequence, version vector, encrypted bytes, derived author                                                                       | CRDT update remains encrypted                         |
| Rotation manifest                   | server SQL         | rotation id, from/to epochs, exact covered permanent lineage set/digest, watermark, recipient set and resulting snapshot id                                                        | No CRDT plaintext                                     |
| Invite                              | server SQL         | route UUID, epoch, invite X25519 public key, domain-separated capability-signing public key, sender metadata/envelope, encrypted Person intent, expiry/status                      | Secret and Person intent remain unavailable           |
| Acceptance truth                    | server SQL         | unique invite/attempt, caller-derived membership UUID, access generation, vault/epoch/snapshot binding, encrypted intent, reconciliation claim/status                              | No Person/name plaintext                              |
| Local operation/cache               | IndexedDB          | operation epoch/lineage, ciphertext, version vector, pushed flag; snapshot epoch/watermark                                                                                         | No operation/snapshot plaintext at rest               |
| Local edit-admission fence          | IndexedDB          | vault/current/minimum-admissible epoch, phase, monotonic fence/journal revisions, transition id; co-transactional with every local encrypted append                                | No update plaintext or key                            |
| Epoch transition journal            | IndexedDB          | transition id/state, membership/access generation, source/target epochs, snapshot/manifest binding, old lineage ids, replacement transport ids, covered/publish/ack states         | No key, decrypted update, Person/name or fragment     |
| Acceptance saga journal             | IndexedDB          | acceptance/membership/vault ids, stage, deterministic Person/link ids, reconciliation op id/ack and selection status                                                               | No fragment, key, plaintext Person intent/name        |
| Default creator truth/saga          | SQL + IndexedDB    | caller/purpose/attempt, stable vault and owner membership UUID, opaque initial snapshot binding; deterministic Person/link lineage and stages                                      | Server never sees vault key, Person or name plaintext |
| Encrypted Person claim/repair       | CRDT + IndexedDB   | membership-keyed claim, Person-keyed reciprocal winner, deterministic loser Person ids and repair lineage/ack                                                                      | Server sees only encrypted op metadata                |
| Active vault keys/decrypted updates | client memory only | branded key material unwrapped from authorized envelopes; exact Loro bytes only while importing/re-encrypting                                                                      | Zeroized/dropped at transition/acceptance boundaries  |

`crypto_box` authenticated sender/recipient envelopes are the sole P08 vault-key-envelope
convention. P08 removes the sealed-box alternative from revision-01 clause 17. Capability proof is
an Ed25519 signature derived domain-separately from the fragment secret; it is proof, not a key
envelope. All primitives use libsodium, exact length/version validation and client-side key
handling.

### Continuous-authorization rule

Historical-envelope reads require all of these:

1. the signed caller maps to the exact membership row;
2. that row is active (`removed_at IS NULL`);
3. the requested envelope belongs to the row's **current** `access_generation`; and
4. the requested epoch lies within that uninterrupted generation's active interval.

Removal closes the interval and denies all subsequent envelope fetches, including old epochs. Safe
reacceptance preserves `membership_id` for Person history but increments `access_generation` and
creates only a current-epoch envelope. Thus a re-added identity does not reacquire keys from its
prior tenure. A member invited at epoch N has no envelope for epochs before N; it can read financial
history only through the authorized current snapshot.

Historical envelope rows are retained for an active generation because an offline device may hold an
arbitrarily old `pushed=false` operation. No garbage collection is allowed until a later reviewed
protocol can prove every device has no such ciphertext. Server export/reversal retains these rows;
their endpoint remains protected and least-field.

## F-001 correction — lossless epoch transition

### Server rotation preparation and commit

The operation lineage closes the acknowledgement-race hole. A normal operation starts with
`lineage_id = transport_id`. Re-encryption changes ciphertext/epoch/transport id but retains the
same lineage. The server enforces one permanent row per `(vault_id, lineage_id)`, so an old
operation which reached the server before its acknowledgement and a later replacement cannot both
become distinct semantic operations.

```mermaid
flowchart LR
    A[Owner requests rotation lease] --> B[Server locks/reads epoch E, watermark W, exact lineage set S, recipients R]
    B --> C[Owner decrypts state through S and prepares key E+1, snapshot, crypto_box envelopes]
    C --> D[Rotation transaction locks vault]
    D --> E{epoch E, watermark W, lineage set S and recipients R unchanged?}
    E -- no --> F[Abort everything; refresh and retry]
    E -- yes --> G[Append E+1 envelopes and snapshot]
    G --> H[Soft-remove target; close tenure; revoke grants and pending invites]
    H --> I[Persist rotation manifest; advance epoch atomically]
```

The preparation response contains a short-lived rotation id, current epoch, server-assigned
operation watermark, exact permanent lineage set or a canonical digest plus membership-proof
endpoint, current snapshot binding, exact active recipients/public keys and pending invite set. The
owner materializes a complete Loro document from the authenticated snapshot plus every permanent
operation through that set, creates a fresh 32-byte key, encrypts the epoch+1 snapshot and wraps it
for every remaining active recipient with authenticated `crypto_box` using the owner's authoritative
sender key.

The commit transaction serializes with `append_vault_ops` on the vault row. It verifies the exact
epoch, watermark, permanent lineage set/digest, active recipient/access-generation set, target
member and pending-invite set. On success it appends—not overwrites—epoch+1 envelopes, records the
snapshot/manifest, soft-removes only the member target, closes that access generation, revokes its
Realtime grants, revokes every pending invite and advances the epoch. Any operation appended before
the transaction changes the watermark/set and aborts rotation; after the advance, an old-epoch
append is rejected. There is no timing window in which an accepted permanent old operation is absent
from both the snapshot and manifest.

### Revision-03 persistent edit-admission and append fence

Revision 02 correctly preserved enumerated operations, but enumeration alone did not exclude a stale
sibling tab from durably appending another source-epoch operation. The governing P08 design
therefore has exactly one local mutation path. A UI/domain edit is first applied to an isolated fork
of the authenticated Loro document to obtain the exact update bytes; it does **not** mutate the live
document yet. The client encrypts those bytes in memory and opens one read-write IndexedDB
transaction spanning `vaultEpochFences`, `localOperations`, `editAdmissions` and
`epochTransitionJournals`. That transaction reads and compare-and-swaps the persisted vault fence
and chooses exactly one branch:

1. **Open at expected epoch E.** Atomically append ciphertext, epoch E, stable semantic lineage,
   version vector and `pushed=false` admission. Only after that commit may the exact update bytes be
   imported into the live document, with subscriber-derived persistence suppressed. A crash after
   commit/before import reloads and imports the durable row; a crash before commit has neither a
   live mutation nor success UI.
2. **Sealed E toward T, before adoption.** Atomically extend/reopen the same transition journal with
   this exact encrypted update, source lineage and a generated-once target mapping, increment its
   `journal_revision`, and leave the live document unchanged. The transition materializer imports
   and re-encrypts it under T. There is no standalone late E row outside the journal.
3. **Terminal/current T or any expected-epoch mismatch.** Refuse an E append. Authenticate the
   current envelope/snapshot, then retry the unchanged isolated Loro update bytes through the open-T
   admission transaction. Until current-epoch durability succeeds the live document remains
   unchanged and the UI remains `Updating vault security`; an old row can never be published.

The fence is a per-vault durable record containing `local_epoch`, `minimum_admissible_epoch`, phase
(`open`, `sealed`, `transitioning`, `terminal`), monotonic `fence_revision`, transition id/source/
target epochs and monotonic `journal_revision`. `terminal` is a durable receipt for E even after T
becomes the new open epoch. All local edit APIs—including undo/redo, imports that represent a user
edit, background rules and acceptance/creator/repair operations—must use this admission path. Remote
sync/snapshot imports use a separately tagged persistence-suppressed path. The old live-mutation
subscriber-to-append path is removed before P08 enablement; Web Locks, BroadcastChannel and leader
election only schedule/wake work and are never correctness authority.

The planning transaction serializes on the same IndexedDB stores. It compare-and-swaps `open E` to
`sealed E -> T`, records the exact fence revision, enumerates every source-epoch `pushed=false`
operation/admission, and places each lineage in the journal. IndexedDB write-transaction
serialization gives the exhaustive race proof:

- an admission transaction commits before sealing and is necessarily visible to enumeration;
- sealing commits first and the admission necessarily reads `sealed`, so it atomically extends the
  journal before any live adoption; or
- terminal adoption commits first and the stale tab is forced through current-epoch admission.

There is no callback suspended across a transaction and no check-then-append gap. The leader
materializes a captured journal revision. Every extension invalidates that capture. The adoption
transaction again spans the four stores and succeeds only if transition/fence/journal revisions
still match, every source row/admission is mapped, every mapping is `covered` or `inserted`, and no
deferred/unmapped lineage remains. It then saves the authenticated T snapshot, advances
`local_epoch` and `minimum_admissible_epoch`, and records the terminal E receipt atomically. A late
extension makes the compare-and-swap abort and materialization resumes. Cleanup may remove only
acknowledged source ciphertext after terminal durability; cleanup never removes the terminal fence.

Thus the exact no-late-lineage invariant is: at the adoption commit there is no locally durable
source-epoch mutation outside the sealed journal, after it no transaction can append or publish
below `minimum_admissible_epoch`, and every edit admitted on either side of the race reaches the
current document exactly once by its semantic lineage. This invariant is local-persistence based;
tab messaging can be lost indefinitely without weakening it.

### Remaining-client transition state machine

The sync manager sends epoch on every snapshot/op request and publish. `EPOCH_ADVANCED` is a typed
response, never a generic retry. Once observed, every tab stops old-epoch publication, displays a
non-success `Updating vault security` state, and enters the persistent fence protocol above.
Non-leaders may observe IndexedDB/BroadcastChannel state but each append still proves the fence in
its own transaction.

```mermaid
stateDiagram-v2
    [*] --> observed: current server epoch is newer
    observed --> planned: journal + complete old unpushed lineage set durably captured
    planned --> authenticated: active-generation old/current envelopes and current snapshot authenticate
    authenticated --> materialized: each uncovered old update is exactly re-encrypted and durably mapped
    materialized --> publishing: only current-epoch replacements are sent
    publishing --> adopted: every lineage acknowledged; current snapshot plus replacements saved
    adopted --> complete: local epoch switches; old ciphertext cleaned; old key zeroized
    observed --> denied: membership no longer active
    denied --> [*]: retain old local data; no publish/new envelope
```

State requirements:

1. **Observed.** Stop old publication and seal via the transactional fence above. Persist source
   epoch(s), target epoch, membership/access generation and transition id before key conversion. If
   offline, keep all ciphertext and wait; edits remain isolated until admitted to the sealed
   journal.
2. **Planned.** The sealing transaction enumerates every `pushed=false` operation/admission below
   target, records stable lineage and generated-once replacement transport id, and binds the journal
   to target snapshot/manifest. A racing edit is included before seal or increments the same journal
   after seal; reopening/retrying preserves the mapping.
3. **Authenticated.** Through the signed, least-field envelope endpoint, fetch only this active
   generation's required source envelope(s) and current envelope. Unwrap keys in memory, verify
   sender/recipient/version/epoch, authenticate the target snapshot and ask the immutable manifest
   membership endpoint which local lineages were already permanent at rotation.
4. **Materialized.** For **every** old `pushed=false` operation, decrypt the ciphertext with its
   source-epoch key, import the exact same Loro update bytes into the authenticated target snapshot,
   encrypt those same bytes with the target key and preserve its version vector/lineage. Persist the
   generated-once replacement transport id, target-epoch ciphertext and journal state atomically,
   even when the manifest says that lineage already became permanent during an acknowledgement race.
   Plaintext/key bytes never enter the journal.
5. **Publishing.** Send every persisted target/current-epoch replacement. Server active-generation/
   current-epoch checks and unique lineage return one of two durable acknowledgements: `covered`
   when the lineage was already in the rotation snapshot, or `inserted` when the current-epoch
   replacement becomes its sole permanent row. A crash after insert but before local acknowledgement
   retries the same transport/lineage and receives the same idempotent result. The original old row
   is not deleted or marked superseded until the replacement is durable and its lineage is
   acknowledged.
6. **Adopted.** Pull current-epoch operations after the watermark and import replacements. The
   adoption transaction proves matching fence/journal revisions, zero deferred/unmapped source
   lineages and durable acknowledgement for every mapping, then persists the authenticated snapshot,
   target epoch/minimum-admissible epoch and terminal source receipt. Edits may then be admitted at
   T.
7. **Complete.** Persist a compact non-secret completion receipt, then remove superseded old local
   ciphertext and zeroize all source-epoch keys. Envelope history remains server-side for other
   devices in the same active generation. If the vault advances again mid-transition, preserve the
   journal and repeat toward the newest epoch; never delete an intermediate source until its lineage
   is permanent under the newest target.

The removed target follows the `denied` branch: it receives no new envelope/snapshot/Realtime grant,
cannot fetch old envelopes after tenure closure, and cannot publish old operations. Its pre-removal
local ciphertext/key may remain readable as the honest past-copy limitation, but the server grants
no historical or future capability it did not already possess.

### Crash/idempotency proof obligations

| Injected boundary                                   | Durable recovery invariant                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| isolated edit before admission transaction          | live document and durable log are unchanged; action retries                              |
| admission commit before live import                 | ciphertext/lineage exists once; reload imports exact bytes                               |
| live import after durable admission                 | suppressed subscriber cannot create a second append                                      |
| edit append commits immediately before seal         | shared-store serialization makes sealing enumerate it                                    |
| seal commits immediately before edit append         | edit reads sealed and atomically increments/extends the journal                          |
| before journal creation                             | untouched old ciphertext remains; detection restarts                                     |
| after journal, before envelope fetch                | source ids/mappings remain; active caller refetches least-field envelopes                |
| after key unwrap/snapshot decrypt                   | no plaintext/key is durable; reload unwraps again from authorized history                |
| between classification records                      | one IndexedDB transaction per mapping resumes the first incomplete lineage               |
| after replacement encryption, before local put      | old ciphertext remains authoritative; replacement is regenerated with the stored id      |
| after local put, before publish                     | current ciphertext/mapping is durable and sent once by stable lineage                    |
| after server insert, before local ack               | retry returns the existing lineage; no duplicate semantic op                             |
| journal extension during materialization/adoption   | revision mismatch aborts adoption; new exact lineage is materialized                     |
| after all acks, before snapshot/local-epoch switch  | mappings, acknowledgements and sealed fence rebuild the same current document            |
| stale tab attempts E append after terminal adoption | persisted minimum epoch rejects E; exact isolated update is re-admitted once at T        |
| after local switch, before cleanup/zeroization      | terminal fence is monotonic; cleanup repeats without deleting current data               |
| concurrent old server append                        | shared vault-row serialization changes set/watermark; rotation aborts and owner rebuilds |
| second rotation during transition                   | prior journal/ciphertexts remain; active envelope history allows a new target transition |

No transition state may contain plaintext operations, vault keys, fragments, recovery material or
Person names. Storage-unavailable mode may not silently fall back to memory for a security
transition: it remains blocked with old ciphertext preserved until durable journal storage is
available.

The required real-browser proof uses two genuine tabs against one vault and the real sync/server
stack. A deterministic native IndexedDB transaction blocker/barrier controls ordering only; it does
not call a service method, inject rows, bypass UI, or substitute a fake coordinator. Both tabs make
visible UI edits on both sides of sealing. The test proves: the before-seal edit is enumerated and
applied once; the after-seal edit extends the journal and is applied once; a close/reload at each
admission, seal, extension, publish, adoption and cleanup boundary resumes; a stale tab after
terminal cannot create/publish an E row and re-admits its exact update at T; no source operation,
admission or deferred lineage remains. It inspects authenticated UI/document outcomes plus allowed
IndexedDB/server metadata, uses event/barrier assertions rather than sleeps, and runs both race
orders repeatedly. Lower-level integration tests may inject a persistence adapter for every
boundary, but they cannot replace this multi-tab proof.

## F-002 correction — capability read and acceptance saga

### Fragment-derived keys and pre-membership read

Invite creation derives two independent keypairs from the same exact 32-byte fragment secret with
distinct fixed domains:

- an X25519 invite recipient pair for the owner's authenticated `crypto_box` vault-key envelope;
- an Ed25519 capability-signing pair used only to prove secret possession during acceptance.

Only public keys are stored. The raw fragment secret and both derived secret keys stay client-side.
The protected identity still signs the complete P04 mutation; the capability signature is an
additional one-time proof and cannot select actor, vault or role.

The minimum pre-membership endpoint accepts only route invite UUID plus the derived invite X25519
public key. For an exact unexpired/unrevoked/unconsumed/current-epoch pair it returns:

- envelope version, epoch, authoritative sender X25519 public key, invite recipient public key and
  encrypted real vault-key envelope;
- opaque current snapshot id, encrypted snapshot, version vector, server watermark and digest of the
  permanent lineage set;
- a short-lived one-use acceptance challenge required for secret-possession proof.

It returns no vault id/name, roster, identity hash, creator label, role choice or plaintext Person
intent; the opaque encrypted intent remains on the locked invite and is copied only into acceptance
truth after SQL success. Responses are `no-store`, rate-limited and redacted from
procedure/request/error logging. Absent, malformed-key, UUID-only enumeration, expired, revoked,
consumed, stale-epoch and substitutions across vaults produce the same generic external result and
comparable response shape/timing. Possession of the exact pair reveals ciphertext size, expiry and
activity watermark to the intended bearer; the UI warns that the link is a bearer capability. It
reveals no plaintext.

The client opens the authenticated owner-to-invite envelope, requires exactly 32 key bytes, and
authenticates the returned snapshot before SQL mutation. It signs a canonical tuple containing
invite UUID, both stored capability public keys, challenge, epoch, snapshot id/watermark/digest,
caller identity hash, caller recipient X25519 public key, self-envelope digest and
acceptance-attempt UUID with the derived capability Ed25519 secret. The server verifies this
signature against the invite row. A leaked database public key or derived lookup value cannot
consume an invite without the fragment-derived signing secret.

The fragment remains in a fragment-only URL, masked, until durable SQL acceptance truth exists; this
is the only crash-safe way to retry a pre-SQL failure without persisting the bearer secret. It is
never sent raw. Immediately after the transaction is confirmed—or a protected pending-acceptance
read proves it committed—the client clears the fragment with `history.replaceState` and zeroizes the
fragment/invite secret keys. Before that boundary, reload restarts preflight from the fragment;
after it, reload resumes from membership/acceptance truth and the self-wrapped current key.

### Atomic SQL acceptance truth

```mermaid
sequenceDiagram
    participant C as Invitee client
    participant P as Capability read
    participant S as SQL accept transaction
    participant L as Local encrypted CRDT saga
    C->>P: invite UUID + derived X25519 public
    P-->>C: sender/envelope + encrypted snapshot/watermark + challenge
    C->>C: unwrap real key; authenticate snapshot; self-wrap; capability-sign tuple
    C->>S: identity-signed accept + capability proof + prepared binding
    S->>S: lock invite, vault, snapshot, membership; verify exact epoch/binding/proof
    S->>S: consume invite; create/reactivate membership; append self-envelope; write acceptance truth
    S-->>C: stable membership/access generation + vault/current binding + reconciliation required
    C->>L: resume deterministic Person/link/selection/sync
```

The transaction is the only acceptance authority. It:

1. locks the exact UUID/invite-public-key/challenge row, vault epoch/current snapshot and caller's
   membership row;
2. verifies expiry/status, current epoch and prepared snapshot watermark/digest, the P04-derived
   caller, exact encodings and capability signature;
3. creates a new stable membership or reactivates the same membership UUID with incremented access
   generation, member role and caller self-wrapped current key; it never promotes an owner;
4. consumes the invite/challenge and writes an immutable acceptance row keyed by invite and
   acceptance-attempt UUID, retaining only the opaque encrypted Person intent; and
5. returns membership UUID, access generation, vault id, epoch/snapshot binding and
   `reconciliation_required`.

If snapshot/epoch changed after preflight, the whole transaction returns typed stale-preflight and
leaves the invite unconsumed; the client refetches and reauthenticates. Same-caller/same-attempt
retry after a lost response returns the existing truth. Another caller, attempt substitution, replay
or consumed-link lookup receives the generic invalid result. A protected, caller-derived
`pendingAcceptances` read reconstructs committed-but-unfinished work even when the originating local
journal was never written.

The transaction does **not** create, link, select or claim to roll back a CRDT Person.

### Deterministic client reconciliation saga

```mermaid
stateDiagram-v2
    [*] --> sqlAccepted: acceptance truth exists
    sqlAccepted --> vaultAuthenticated: own envelope + current snapshot authenticate
    vaultAuthenticated --> linkDurable: one encrypted CRDT transaction is durably journaled
    linkDurable --> linkSynced: semantic link op is server-acknowledged or already present
    linkSynced --> selectionDurable: shared vault selection persists
    selectionDurable --> reconciled: protected acknowledgement; local proof complete
    reconciled --> [*]
```

Every authenticated app load checks protected acceptance truth before normal vault success UI. The
local journal is an optimization; server truth plus membership self-envelope and encrypted intent
can reconstruct it. The saga remains visibly `Finishing setup` until all stages complete.

1. **SQL accepted.** Persist/recover the acceptance id, membership id/access generation and vault
   binding. Clear/zeroize the fragment boundary as above. Offline operation now means retry later,
   not cancellation or default-vault creation.
2. **Vault authenticated.** Unwrap the membership's current self-envelope, authenticate the current
   snapshot and process any intervening epoch through the F-001 transition. Decrypt the opaque link
   intent client-side.
3. **Link durable.** Use encrypted CRDT maps keyed by `membershipId`. A link intent naming a valid
   unlinked Person selects that id; otherwise derive the new Person id deterministically from
   `(vaultId, membershipId)` using a fixed UUID namespace. One Loro transaction upserts the Person
   with `linkedMembershipId`, `membershipLinks[membershipId] = personId` and the reciprocal
   claim/map; it never creates a second random Person. Distinct claims converge and automatically
   enter the deterministic post-merge repair below rather than remaining repair-required. Persist
   the encrypted update through the fenced admission transaction before treating it as durable.
4. **Link synced.** Push the stable reconciliation lineage under the current epoch. Retry/concurrent
   tabs may emit redundant same-value assignments. Same-membership retries converge to one Person;
   different-membership contention runs post-merge repair to one Person per membership. Server
   lineage/idempotency prevents duplicate semantics. Satisfying state is observed, not recreated.
5. **Selection durable.** Persist the accepted shared vault as the originating device's active vault
   only after its local document contains the canonical link. Reload validates both selection and
   link before advancing.
6. **Reconciled.** After the link operation is server-acknowledged (or pulled as permanent) and
   selection is durable, send a signed reconciliation acknowledgement referencing the permanent op
   lineage. The server can verify actor/operation existence but not encrypted content. The client
   independently verifies one link/Person before showing success. All later loads still perform the
   idempotent invariant check; a global acknowledgement never suppresses device-local validation.

Crashes before the combined CRDT Person/link transaction leave no Person. Crashes after local
durability retry the same deterministic ids/lineage. Crashes after server sync but before local ack
observe the permanent lineage. Crashes before/after selection reapply the same vault id. Concurrent
tabs coordinate through a per-acceptance lock when available and converge through deterministic CRDT
keys when not. Ambiguous legacy links enter an explicit repair state; they are preserved and never
auto-merged/deleted.

| Injected acceptance boundary                                         | Durable recovery invariant                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| before SQL transaction                                               | invite remains usable unless protected truth proves the transaction committed                  |
| after SQL commit, before response/local journal                      | `pendingAcceptances` reconstructs the same membership/acceptance; no second consume            |
| after current-key/snapshot authentication                            | no plaintext/key is durable; membership self-envelope permits retry                            |
| during Person field write, before link field/CRDT commit             | no encrypted update or saga advance is durable; deterministic transaction restarts             |
| after combined Person/link CRDT commit, before IndexedDB transaction | in-memory partial state is disposable; reload deterministically emits both fields again        |
| after encrypted Person/link op and journal commit, before push       | one durable `pushed=false` reconciliation lineage resumes                                      |
| after server operation insert, before local acknowledgement          | same lineage is observed/acknowledged; no second Person/link                                   |
| after link sync, before vault selection                              | selection persists on resume only after link invariant recheck                                 |
| after selection, before reconciliation acknowledgement               | same vault id remains selected; signed acknowledgement retries                                 |
| after acknowledgement, before success render                         | every load rechecks authenticated vault, canonical link, permanent lineage and local selection |
| concurrent tabs at any stage                                         | per-acceptance lock serializes locally; deterministic CRDT keys converge if leaders race       |

### Deterministic invite-aware onboarding

- New-user navigation carries only the route/secret in the URL fragment. Registration creates the
  P06 identity-only row but **does not call default-vault creation** while an invite is pending.
- After unlock/registration, preflight and acceptance run. Successful reconciliation selects the
  shared vault and enters it; no personal vault is orphaned.
- Explicit pre-SQL cancellation or a confirmed terminal invalid/expired/revoked result clears and
  zeroizes the fragment, exits invite mode, invokes ordinary idempotent default-vault creation once
  and selects it. A transient offline/server/finishing error does not create a default vault.
- After SQL acceptance there is no invitation cancellation: membership is durable and the UI offers
  retry/resume `Finishing setup`. Any later leave/removal follows the reviewed member-removal flow.
- Existing-user unlock preserves the fragment client-side, returns to preflight and never converts
  it into a query parameter, server component value, log or referrer.

### Revision-03 default-vault creator-to-owner linkage saga

Default-vault creation is a separate reconstructible two-boundary protocol; listing then creating is
not its idempotency authority. Before the request, the client durably creates a non-secret
`creatorSaga` attempt for fixed purpose `initial-default` and prepares the real vault key, owner
authenticated self-envelope and encrypted initial snapshot. The server runs one transaction keyed by
`(caller_pubkey_hash, initial-default)`, with the caller attempt as an alias. A uniqueness
constraint makes every concurrent/repeated default-creation attempt for that identity resolve to one
truth. That transaction creates exactly one vault and stable owner `membership_id`, stores the
owner's current-generation envelope and the opaque epoch-0 initial snapshot/binding, and records
immutable creation truth containing caller, purpose/attempt aliases, vault id, membership UUID,
access generation and snapshot binding. It returns that truth on retry. Explicit user-created
additional vaults use a different purpose and idempotency key and are not coalesced.

The server validates caller ownership, envelope version/sender/recipient public keys, exact
ciphertext bounds and snapshot metadata, but never receives a vault key, decrypted CRDT, Person name
or financial field. `pendingCreations` is a protected caller-derived least-field read of unfinished
creation truth, so a lost SQL response or local journal is recoverable. The SQL transaction is
all-or-nothing: a crash before commit leaves no vault/membership/snapshot; after commit it
reconstructs the same vault, membership and opaque snapshot.

After SQL truth, the client authenticates that snapshot and derives
`ownerPersonId = UUIDv5(P07_OWNER_PERSON_NAMESPACE, vaultId || membershipId)`. In one Loro
transaction it creates/upserts the default owner Person, assigns
`linkedMembershipId = membershipId`, `membershipLinks[membershipId] = ownerPersonId`, the
authoritative reciprocal Person claim, and `personMembershipLinks[ownerPersonId] = membershipId`.
The optional display name remains encrypted. The exact update has stable lineage
`UUIDv5(P07_CREATOR_LINK_NAMESPACE, creationTruthId || membershipId)` and uses the F-001 fenced
admission path; server truth plus deterministic ids reconstruct it without local plaintext. The
creator state machine is:

`attempt durable -> SQL vault/owner/snapshot truth -> owner link durable -> owner link permanent -> active selection durable -> complete`.

No caller observes creation success, enters the vault or clears unfinished truth before the owner
Person/link bijection is in the authenticated local document, its lineage is permanent, and active
selection is durable. A protected completion ack may reference the opaque permanent lineage but
cannot attest to plaintext; every load independently checks the decrypted invariant. Invite-aware
onboarding defers this entire protocol until explicit cancel/terminal invite failure. Successful
invite acceptance never starts it.

| Injected creator boundary                  | Recovery/concurrency invariant                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| before local attempt durability            | no server call or success; retry creates one attempt                             |
| concurrent tabs choose different attempts  | SQL purpose uniqueness returns one creation truth and one vault/owner membership |
| before initial snapshot SQL commit         | atomic transaction leaves no vault, membership, envelope or snapshot             |
| after snapshot/SQL commit before response  | `pendingCreations` returns the same truth; no second vault                       |
| after response before local saga write     | server truth reconstructs deterministic Person and lineage                       |
| before fenced owner-link commit            | no live Person/link mutation or success                                          |
| after owner-link durability before push    | one `pushed=false` lineage resumes after crash/reload                            |
| after server insert before acknowledgement | retry/pull observes the same lineage; no second Person                           |
| before/after active selection persistence  | selection follows link proof and repeats with the same vault id                  |
| repeat calls after completion              | existing truth and satisfying one-Person bijection return, never recreate        |

Real-browser coverage opens two fresh creator tabs for one identity, releases create calls
concurrently, loses one SQL response, and closes/reloads at each snapshot/operation/selection
boundary. Through normal registration/unlock UI and real SQL/sync, it proves exactly one vault, one
owner membership UUID, one active default Person, reciprocal links, one permanent semantic lineage
and one selected vault. A second case crashes before versus after atomic initial-snapshot commit. It
asserts only opaque ciphertext/metadata reaches the server. No service fixture, direct row insertion
or hidden product hook can satisfy this proof.

### Revision-03 convergent repair for distinct invitations claiming one Person

An encrypted `membershipPersonClaims[membershipId]` value records acceptance id, intended Person id
and claim lineage. An encrypted Person-keyed `personClaimWinners[personId]` is one atomic reciprocal
value `{membershipId, acceptanceId}`; Loro's deterministic register convergence chooses one when
offline/concurrent acceptances propose different memberships. `Person.linkedMembershipId` and the
two link maps are checked/repaired projections, not separate authorization facts. SQL never reads
Person ids or chooses a winner.

On every authenticated merge, startup, acceptance resume and before success, the client scans active
claims. For multiple active claims to one intended Person, it preserves that Person and all
allocations/history. The winner is the valid converged `personClaimWinners` membership; if malformed
legacy state has none, the deterministic fallback is the smallest `(acceptanceId, membershipId)`. It
restores that winner's forward/reciprocal projections. For each loser sorted by membership UUID, one
transaction:

1. removes/overwrites **only** the loser's forward claim to the intended Person;
2. creates/reuses `UUIDv5(P07_MEMBERSHIP_PERSON_NAMESPACE, vaultId || loserMembershipId)`, a
   schema-reserved deterministic fallback Person with encrypted display fallback;
3. writes loser membership -> fallback Person, fallback Person -> loser membership, its atomic
   winner value and `linkedMembershipId`; and
4. leaves the intended Person, winner claim and every financial/history field unchanged.

Migration collision-checks the reserved namespace before new writes; a legacy collision is preserved
for explicit migration repair, never overwritten. Repair has one semantic lineage derived from
vault, intended Person, winning claim and sorted losing claims. All clients propose the same
values/lineage, so server uniqueness accepts or returns one permanent operation. It uses fenced
admission and repeats until every active membership has one forward link, every linked Person has
one reciprocal active membership and both projections agree; it cannot oscillate after convergence.
An optional encrypted owner reservation may reduce races but is not correctness authority.

An observed conflict remains or re-enters `Finishing setup` until claim/repair lineage is durable,
permanent, pulled through the current watermark and the bijection recheck passes. Later offline
claims trigger automatic repair on merge; they cannot leave permanent `repair-required` or overwrite
financial history. Removal keeps Person/history; safe re-add of the stable membership UUID reuses
its Person.

The exact concurrency proof accepts two distinct real invitation URLs for two identities against one
real vault while both encrypted intents name the same existing financial Person. Calls and claim
publication are barrier-released in both orders; tabs exchange real CRDT updates. The test
closes/reloads before claim durability, after one/both inserts, after merge and around repair ack.
It proves two memberships/two active Persons; the intended Person and history retained for the
winner; one deterministic loser Person; consistent reciprocal projections; no retry duplicates; no
permanent finishing; and no Person intent in SQL/logs.

## Revised complete P08 acceptance contract

All 29 clauses remain mandatory. Clauses 10, 13, 14, 17–19, 22 and 28 are corrected/expanded for
Q-014; the other clauses retain revision-01 outcomes.

### A. Authoritative surfaces and permissions

1. Vault Settings contains discoverable `Access & Members` on desktop/mobile. People copy describes
   financial participants and does not promise hidden invitation behavior.
2. Owners see safe active-member/pending-invite state and member-only create/copy/revoke/remove
   controls. Members see a privacy-safe roster and own role without mutations. Outsiders receive no
   roster. Direct member/outsider mutation is server-rejected.
3. Every protected mutation retains P04 signing and server-derived caller identity. Vault, role,
   target membership and invite authority come from locked rows, never client claims.
4. P08 invite/removal targets members only. Owner governance is excluded. Standalone insecure leave
   is rejected/deprecated or owner-coordinated through the same atomic rotation.
5. Endpoints return least fields and normalize absent/expired/revoked/tampered/unauthorized states
   so roster, invite, vault and identity enumeration do not result.

### B. Versioned real-key invitation

6. The fragment secret is exactly 32 libsodium-random bytes, unpadded base64url and never appears
   raw in request/path/query/server props/log/analytics/referrer/console/error/test artifact.
7. Creation stores exact-length/versioned authenticated `crypto_box` metadata using the sender key
   selected from the owner's membership plus the domain-separated capability-signing public key. The
   server does not trust caller-claimed sender identity.
8. Preflight/acceptance bind route UUID, derived invite X25519 public key, capability proof, current
   epoch and prepared snapshot. Tamper, cross-vault, replay and concurrent double acceptance fail
   closed without an oracle.
9. Invites wrap one explicit epoch. Epoch advance atomically revokes pending invites; owners issue
   fresh links instead of carrying bearer capabilities over a security-boundary change.
10. The minimum pre-membership endpoint and proof above return only sender/envelope plus encrypted
    current snapshot/watermark/digest/challenge. The client proves secret possession, obtains
    exactly 32 real key bytes and authenticates that snapshot **before** the SQL transaction.
11. The invitee self-wraps that exact key with authenticated `crypto_box`; acceptance stores the
    membership identity derived from the caller, recipient/sender public key, envelope version,
    epoch and tenure. `VaultProvider` opens using explicit sender metadata.
12. Placeholder/random membership ciphertext is forbidden. Pre-SQL crypto/authentication failure
    leaves invite, membership, Person and selection unchanged.
13. Raw fragment material remains only in the fragment and client memory until durable SQL truth,
    then is immediately removed/zeroized. Reload before commit retries from the fragment; reload
    after commit resumes from protected truth/self-envelope. No plaintext local capability store.
14. Invite-aware first-user registration deterministically defers default-vault creation. Success
    selects the shared vault; explicit cancellation/terminal pre-SQL failure resumes idempotent
    ordinary default creation through the creator-truth saga; transient/post-SQL finishing states do
    not. Creation returns the stable owner membership UUID and cannot succeed until exactly one
    deterministic owner Person and reciprocal link are durable and synced.
15. Generated links are masked and exposed only through explicit Copy with visible confirmation.
    Expiry/revoke remain visible without leaving the fragment rendered after use.

### C. Atomic rotation and lossless epochs

16. Vaults, membership/envelope history, snapshots and operations carry monotonic epoch metadata;
    operations additionally carry server watermark and stable lineage. Legacy data backfills
    epoch 0.
17. Owner preparation uses a fresh 32-byte key, exact permanent lineage set/watermark, complete
    authenticated snapshot and authenticated `crypto_box` envelopes for every exact remaining active
    recipient. Sealed boxes are not a P08 envelope option.
18. One owner-only SQL transaction validates locked epoch/watermark/lineages/recipients/target/
    invites, appends new snapshot and envelope history, soft-removes target, closes its tenure,
    revokes grants/invites and advances epoch. Concurrent operations abort/retry the entire
    rotation.
19. Every continuously active client follows the durable transition state machine above: classify
    every local edit admission/append checks the persistent fence in its write transaction; sealing
    atomically enumerates prior operations and later admissions extend the journal; adoption proves
    matching revisions and zero deferred/unmapped source lineage. It decrypts/imports exact updates,
    re-encrypts/publishes current-epoch replacements and receives covered/inserted acknowledgement.
    Terminal minimum epoch rejects stale old appends. No late lineage, old publish, plaintext
    journal, silent discard, live-before-durable mutation or memory-only fallback.
20. Removed clients receive no current/historical envelope after tenure closure, no future payload
    and no old-epoch publish; they cannot decrypt future data. UI/tests honestly preserve the
    limitation for past copies. Remaining clients preserve offline work exactly once.
21. Membership removal is soft. Every permission/list/realtime/envelope query requires active
    tenure. Reacceptance preserves membership UUID but increments access generation and grants only
    current epoch, preserving Person history without restoring prior keys.

### D. Crash-recoverable Person linkage and display privacy

22. Acceptance is the explicit two-boundary protocol above: atomic/idempotent SQL truth returns a
    stable membership UUID, then every load resumes the deterministic encrypted CRDT Person/link,
    claim/repair, current-vault selection and sync saga. Distinct claims on one Person preserve the
    converged winner/intended financial Person and deterministically create one Person for each
    loser. Default-vault creator truth similarly links the returned owner membership UUID to its
    deterministic default Person. Every flow converges to a membership/Person bijection and never
    claims SQL mutated encrypted CRDT state.
23. Optional Person intent/display data remains opaque server ciphertext and is decrypted only by an
    authorized client. Optional names remain valid; no plaintext identity/profile field is added.
24. Display fallback remains explicit Person name, encrypted member-profile name, `You` for self,
    then `Member` plus vault-scoped disambiguator. Raw/truncated pubkey hashes and encryption keys
    are never rendered or exposed as accessible names.
25. Removal preserves linked Person, allocations, settlement and history and changes only access
    status. Re-add uses the same membership/link. Person delete/unlink never revokes membership;
    duplicate/ambiguous legacy data is preserved for repair.
26. Encrypted member profiles keyed by membership UUID are convenience data only and never affect
    SQL roles, signatures or access. P06's removed plaintext/global user blob is not reintroduced.

### E. Accessible and honest interaction

27. Create/copy/revoke/remove/accept/cancel/retry are keyboard-operable with visible focus,
    meaningful names and live status/errors. Removal identifies member/future-access consequence,
    confirms destructiveness and restores focus predictably.
28. Invalid/expired/revoked/consumed/corrupt/offline/stale-preflight/transition/acceptance states
    are stable, non-enumerating and recoverable. UI remains `Finishing setup` after SQL acceptance
    and cannot claim success before authenticated vault, one Person/link, sync and selection all
    prove.
29. Desktop/mobile, light/dark, reduced-motion and 200% zoom/reflow expose all authorized actions
    without clipping, horizontal traps or off-viewport controls, including the current reproduced
    mobile menu/Person-label regression.

## Complete clause-to-proof map for P08

| Clause | Required automated proof                                                                                                | Required real/manual proof                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1      | route/component role tests and People-copy assertion                                                                    | owner finds Access & Members without direct URL; People remains financial                       |
| 2      | owner/member/outsider router and render matrix                                                                          | isolated role snapshots show exact authorized controls                                          |
| 3      | signed-input tamper tests; claimed actor/role/vault rejected                                                            | network inspection shows signed mutations and no client authority fields                        |
| 4      | owner invite/remove and standalone leave rejected; member target succeeds                                               | UI has no owner mutation path and explains governance boundary                                  |
| 5      | least-field output schemas and indistinguishable failure cases                                                          | outsider/tampered states reveal no roster/vault/identity detail                                 |
| 6      | exact random/base64url/derivation tests; secret-redaction assertions                                                    | URL/request/history/referrer/console/artifact inspection finds no raw secret                    |
| 7      | exact sender/recipient/version lengths and server-selected sender tests                                                 | created link uses real owner sender metadata without displaying keys                            |
| 8      | UUID/key/signature/epoch/snapshot/caller tamper, replay and concurrent accept                                           | altered route/fragment/cross-vault links fail generically                                       |
| 9      | rotation transaction revokes exact pending set; stale invite cannot accept                                              | owner sees revoked-by-security-change state and can create fresh link                           |
| 10     | capability endpoint oracle/rate/cache schema; real key/snapshot authenticate; malformed proof fails                     | new/existing invitee preflight uses real link with no membership side effect on failure         |
| 11     | owner-to-invite unwrap, equality, self-wrap and provider reopen property/integration tests                              | accepted invitee decrypts same vault in isolated context                                        |
| 12     | placeholder prohibited; crypto failures leave all SQL/CRDT rows unchanged                                               | corrupt envelope stays pre-SQL with honest recovery                                             |
| 13     | lifecycle tests before/after SQL boundary and zeroization hooks                                                         | reload before commit retains fragment-only retry; after commit URL is clear and saga resumes    |
| 14     | onboarding plus creator-truth idempotency; concurrent tabs/lost response yield one vault/owner membership/Person        | first user success has only shared vault; cancel creates one fully linked default vault         |
| 15     | masked/copy/revoke component behavior                                                                                   | keyboard Copy confirmation and no persistent DOM fragment                                       |
| 16     | schema/pgTAP epoch, watermark, lineage, uniqueness and backfill assertions                                              | version/epoch shown only as safe status where needed                                            |
| 17     | full-state reconstruction and authenticated per-recipient envelope equality                                             | owner removal preparation never uses sealed/self-fixture substitution                           |
| 18     | transaction rollback at every stage; exact set/digest; concurrent append forces retry                                   | owner sees retry, never partial removal/success                                                 |
| 19     | two real tabs, both seal/append race orders and crashes at admission/seal/extension/adoption/cleanup; zero late lineage | before/after-seal UI edits each appear once; stale terminal tab cannot append/publish old epoch |
| 20     | removed member cannot list any envelope, fetch future snapshot, publish old op or decrypt new ciphertext                | removed isolated context sees future-access denial and honest past-copy copy                    |
| 21     | soft remove/current-generation predicates; readd same UUID/new generation/current envelope only                         | Person link persists across remove/readd without old-key restoration                            |
| 22     | invite/creator response-loss and stage crashes; two claims/one Person post-merge repair; exact reciprocal bijection     | real creator and two-invite races finish with one Person per membership, no lost financial data |
| 23     | encrypted-intent round trip and absence of plaintext server columns/logs                                                | optional name/Person intent renders only after vault decrypt                                    |
| 24     | exact fallback-order cases and no hash/key text in DOM/accessibility tree                                               | owner/member snapshots show safe deterministic labels                                           |
| 25     | allocations/settlements/history unchanged through remove/readd/person repair                                            | People status changes but financial history remains usable                                      |
| 26     | profile mutations cannot affect membership/role; registry remains identity-only                                         | edited optional label does not change permissions                                               |
| 27     | keyboard/focus/live-region/destructive-dialog component/E2E checks                                                      | pointer/keyboard cancellation/success/error focus charter                                       |
| 28     | typed state-machine exhaustiveness, offline/stale/corrupt recovery and success guard                                    | UI never announces success during SQL-only or unsynced state                                    |
| 29     | viewport/preference/zoom automated accessibility checks                                                                 | CLI desktop/mobile/light/dark/reduced/200% snapshots and computed contrast                      |

Cross-cutting required suites additionally include:

- a real isolated-browser owner creates/copies a discoverable invite; a separate new or existing
  identity opens that exact link, proves capability possession, accepts, decrypts the same vault,
  creates/links exactly one Person and synchronizes edits; no service membership insertion,
  self-wrapped fixture provisioning, invented direct URL or secret logging substitutes;
- active member B makes an offline edit, owner A removes member C and rotates, B reconnects/reloads
  through every injected transition crash; two real B tabs edit immediately before/after seal and
  each edit appears once; stale post-terminal append/publish fails; C receives no new/history key;
- SQL acceptance commits followed by crashes before local journal, vault authentication, combined
  Person/link durability, sync, selection and acknowledgement; every load and concurrent tab
  converges without duplicate Person/link or second membership;
- two default-creator tabs, lost response and crashes around initial snapshot/link persistence
  converge to one vault, owner membership and linked Person; two distinct invites that target one
  Person converge after merge to the preserved intended Person plus one deterministic loser Person;
- retries disabled, repeated meaningful journeys, fresh migration/pgTAP security coverage, complete
  network/log/history/referrer redaction, frozen-source checks and cleanup.

No arbitrary sleep, forced action, retry masking, mock transport, shared browser storage, plaintext
journal, test-only crypto hook or service/admin fixture may replace those journeys.

## Threat, replay and privacy matrix

| Threat/failure                                | Binding/control                                                                                               | Required failure semantics                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| bearer link theft                             | short explicit expiry, member-only privilege, masked Copy/revoke; X25519 unwrap plus capability Ed25519 proof | possession is honestly sufficient until consumed/revoked; no recipient-identity claim before signed accept |
| database/log learns invite public key         | capability signature proves fragment-derived secret; raw secret excluded/redacted                             | public-key knowledge can retrieve at most intended ciphertext, never consume or decrypt                    |
| UUID/key/snapshot/cross-vault substitution    | exact locked invite pair, current epoch, snapshot id/watermark/digest and capability-signed tuple             | generic invalid/stale result; no mutation                                                                  |
| preflight enumeration/oracle                  | exact pair, same generic external response, no vault/roster/identity fields, no-store/rate-limit              | no distinction among absent/expired/revoked/consumed/malformed to non-holder                               |
| accept replay/response loss                   | unique invite and attempt truth, caller binding, one-use challenge, idempotent same-caller retry              | one membership/access generation; other caller generic denial                                              |
| malicious client supplies wrong self-envelope | honest client authenticates key/snapshot and equality before SQL; provider validation                         | self-harm cannot grant access/escalate; saga remains finishing/repair, never false success                 |
| concurrent old op versus rotation             | shared vault-row serialization and exact watermark/permanent lineage set                                      | rotation aborts completely and rebuilds                                                                    |
| remaining member offline/crashes              | active-generation envelope history, ciphertext-only journal, stable lineage                                   | all unpushed work survives exactly once; no old publish after advance                                      |
| sibling appends during/after local seal       | same-store persistent fence checked by every admission; seal/append/adoption serialize and CAS revisions      | included before seal, journal-extended after seal, or current-epoch re-admitted after terminal             |
| removed or re-added member asks for history   | active `access_generation`/epoch interval on every envelope/history query                                     | removed tenure and later generation receive no prior envelope                                              |
| transition duplicate/replay                   | unique vault lineage, stable replacement id and idempotent acknowledgement                                    | one permanent semantic update despite response loss/retry                                                  |
| SQL/CRDT crash gap                            | immutable acceptance truth plus protected pending read and deterministic encrypted saga                       | membership remains valid and UI stays finishing until reconciliation; no fake rollback                     |
| concurrent acceptance tabs                    | same acceptance truth, deterministic membership/person/link ids and CRDT map keys                             | exactly one active Person/link; local selection idempotent                                                 |
| distinct acceptances claim one Person         | converged encrypted reciprocal winner plus deterministic post-merge loser repair/semantic lineage             | intended Person/history survives; each loser receives one stable Person; Finishing ends after sync         |
| creator response loss/concurrent tabs         | unique caller/default-purpose creation truth, returned owner UUID and deterministic fenced link lineage       | one vault, owner membership, snapshot and default Person/link; success only after permanent linkage        |
| identity correlation/profile leak             | vault-scoped membership UUID, encrypted profiles/intents, least-field roster                                  | no raw/truncated pubkey, enc key or global plaintext profile display                                       |
| Person/access confusion                       | separate authoritative surfaces/terms and non-authoritative status                                            | financial edit/delete never changes membership; removal never deletes history                              |
| local secret/plaintext retention              | fragments only until SQL truth; keys/updates memory-only; libsodium zeroization; ciphertext-only journals     | reload uses authorized envelope/truth, not plaintext local storage                                         |

## Schema, backfill, migration and reversal consequences

1. Add current epoch/watermark to vaults; epoch/watermark/lineage to snapshots/ops; append-only
   per-epoch envelope history; rotation manifests; membership `access_generation`/active interval;
   invite capability public key/status; durable acceptance truth; and caller/default-purpose-unique
   creator truth returning owner membership UUID with atomic opaque initial snapshot. Every active
   server path gains explicit epoch/tenure predicates before the UI gate opens.
2. Backfill structurally valid existing owner/default and P05-style self-wrapped memberships as
   epoch 0, access generation 1, authenticated `crypto_box` self-sender envelope. Validate exact
   decoded lengths. Missing/invalid rows become explicit repair-blocked data, never silently
   filtered or granted.
3. Revoke all pending legacy invites: they are sender-unbound/unversioned and have no working
   in-product redemption proof. Owners create new domain-separated capability links. Do not
   synthesize secret/key/proof or silently upgrade an old bearer.
4. Backfill each permanent epoch-0 operation with `lineage_id = id`, a deterministic server sequence
   and epoch-0 manifest/digest. Migration asserts uniqueness before enabling current-epoch append.
5. Preserve `(vault_id,pubkey_hash)` and stable membership UUID across soft removal. Start
   generation 1 for existing active rows; increment on reactivation. Historical envelopes are
   generation-bound.
6. Add encrypted `membershipLinks`/`personMembershipLinks`/`membershipPersonClaims`/
   `personClaimWinners`/`memberProfiles` plus Person `linkedMembershipId`. Migrate `linkedUserId`
   only for one exact same-vault membership. Safely link default `Me` to its sole owner UUID.
   Validate the deterministic Person namespace has no legacy collision, preserve
   ambiguous/cross-vault financial data, and enable the convergent startup repair before
   invitations.
7. Add IndexedDB fence/edit-admission stores and migrate existing local operations under an open
   epoch fence before replacing direct live-document append. Deploy backward reads and startup
   reconcilers before enabling writes/UI. Feature gating cannot disable an in-progress epoch,
   acceptance, creator or claim-repair saga. Old fields stay bounded read-only until removal proof.
8. Reversal hides new invite/removal/creation entry points but retains membership generations,
   envelopes, manifests, acceptance/creator truths, fences, journals, claims and links. It continues
   transition, creator, acceptance and claim repair until quiescent. An old binary lacking the fence
   may not open a migrated vault for writes; no destructive down migration is allowed.
9. Export for an active user includes authorized encrypted envelope history,
   snapshots/ops/manifests, local fences/journals/unpushed admissions, caller-visible
   acceptance/creator truth and encrypted claims/links/repair lineage. It excludes raw
   keys/fragments and another membership's envelopes. Import preserves terminal minimum epochs and
   resumes every saga/repair before normal editing.

## Validation inherited and performed

Revision 03 changes no executable behavior, so rerunning current green tests would not execute the
new protocol and would add no evidence. The immutable revision-01 evidence and independent review
already record focused invite/keywrap `39/39`, current pgTAP `97/97`, the implementer's relevant E2E
`8/8`, reviewer typecheck, and reviewer repeated relevant E2E `16/16`; both explicitly state that
those checks do **not** prove invitation, epoch transition or the acceptance saga. This revision
converts those missing journeys into mandatory P08 proof rather than misrepresenting the existing
suite.

Proportional revision-03 validation is therefore:

- full read of GOAL/PROCESS, active HANDOFF, canonical Q-014, immutable failed review and the prior
  29-clause contract;
- source verification of IndexedDB `pushed=false` crash-safe operations, startup import and
  idempotent server operation ids which underlie F-001;
- complete clause retention/correction, ownership/state/threat/migration/reversal/export/test maps
  in this artifact;
- Markdown format check, exact Git range/write-boundary checks, frozen-source identities and cleanup
  verification below.

## Questions, dependencies and dispatch status

- Canonical **Q-014** is fully applied by the selected server envelope-history plus ciphertext-only
  local journal design and the SQL-truth/client-saga boundary. The allowed equivalently lossless
  locally self-wrapped alternative is not selected because server-held encrypted history gives a
  crashed/offline active device a recoverable old key without persisting a local key.
- New Q proposal for root transcription: **none**. No residual ambiguity survives the frozen
  requirements, Q-014 or the security/data-preservation hierarchy.
- P08 is **not dispatch-ready** unless revision 03 first receives independent approval and the
  D-011/P05 no-product recheck demonstrates a supported genuinely hidden topology. This evidence
  does not waive, emulate or narrow that gate.
- P04 signed identity/RLS, P06 identity-only registry, P19 passkey ownership and R-024 P20B/P21
  routing remain fixed. No new plaintext identity source or server CRDT authority is introduced.

## Cleanup and immutable-boundary verification

- No browser, development server, database mutation or generated test artifact was started by this
  evidence-only worker. Repository-local `.playwright-cli` and `test-results` are absent. An
  existing workspace Next process and environment-provided Playwright MCP processes are outside this
  package and were not started, used or stopped. The inherited clean database state was not mutated.
- Exact-path `oxfmt --check` passes for this artifact, and `git diff --check` reports no whitespace
  error.
- Frozen integrity is unchanged:
    - scratch SHA-256 `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines
      and 24,244 bytes; exactly 21 ordered blocks normalize byte-for-byte to SCOPE, with checked set
      exactly HS-002/HS-010/HS-014/HS-017/HS-018;
    - immutable FS-001 SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`,
      715 lines and 25,441 bytes; and
    - immutable `SCOPE.json` SHA-256
      `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines and 27,382
      bytes.
- Original package range
  `fe1871ce7dce1e831b57ee5656d38ce5c800aae3..55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d` contains only
  root-integrated P07 evidence/reviews and control-ledger/question/risk paths. Revision 03 adds no
  commit or product/test/migration/config/dependency change.
- HEAD remains `55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d` and the index is empty. Git-visible state
  is exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus this sole untracked revision-03
  artifact. No ledger, prior artifact/review, scratch, FS-001, SCOPE or agent path was edited by
  this worker.

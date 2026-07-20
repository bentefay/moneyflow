# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P07 / 02
- **Scope IDs:** HS-011 architecture package only; HS-011 remains incomplete until P08 also passes
- **State:** changes_requested
- **Task:** `tasks/HS-011-membership-invite-ux.md`
- **Original package BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Pre-implementation HEAD:** `033cb8f6d37208c1ba6ac0b0907672aa18e4ad6d`
- **Range meaning:** revision 02 is a no-product evidence correction. Root's immutable revision-01
  artifact/control commits sit after the original BASE, but the worker makes no commit and must
  leave the product/test/migration/config/dependency diff unchanged.
- **Allowed implementation paths:** none. Do not edit product, migration, test, config, dependency,
  durable ledger, prior evidence/review, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent paths.
- **Sole implementer artifact:** `evidence/P07/implementation-02.md`
- **Commit contract:** make no commit and leave HEAD/index unchanged. Write only the assigned new
  evidence artifact; revision-01 evidence/review are immutable.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md`, `HANDOFF.md` and
  `RISKS.md`, plus assigned uncommitted `evidence/P07/implementation-02.md` and
  `reviews/P07-review-02.md`; no staged or other dirty paths
- **Authoritative correction:** implement Q-014 and both findings in
  `reviews/P07-review-01.md`. Retain the linked-hybrid ADR, authoritative Access & Members in Vault
  Settings, optional financial Person link/status in People, member-only governance, sender-bound
  fragment capability, stable membership identity, privacy model and every unaffected P08 clause.
- **Lossless epoch transition:** replace discard/reinitialize semantics with an explicit state
  machine and storage ownership for versioned per-epoch envelope/history access restricted to a
  continuously active membership. Use authenticated sender/recipient `crypto_box` as the sole
  envelope convention. Define a durable local transition journal that can unwrap both authorized
  epochs, decrypt/import every local `pushed=false` old-epoch operation into the authenticated
  epoch+1 snapshot, persist and push exactly equivalent new-epoch operations, then complete and
  zeroize the old key. Specify retry, reload and injected-crash idempotency; no old-epoch publish
  after advance; removed members get no new or historical authorization they did not already have.
- **Conflict and proof:** bind epoch, snapshot watermark, permanent-operation set, recipient set,
  pending invite revocation and grants in the server rotation transaction. A concurrent old-epoch
  server write must make rotation retry rather than lose it. Require tests for an active offline
  edit across another member's removal, reconnect/reload/crashes at every transition boundary,
  exact-once preservation, old-write conflict/retry, historical-envelope authorization, removed-
  client new-envelope/future-decrypt/old-publish denial and no plaintext journal.
- **Capability-bound pre-membership read:** define the minimum non-enumerating endpoint bound to the
  route invite UUID, derived invite public key and current epoch. It returns only the versioned
  authenticated sender/envelope, encrypted current snapshot and watermark required for the client
  to authenticate the real 32-byte vault key and snapshot before SQL membership mutation. Specify
  expiry, tamper, replay, cross-vault, malformed-key and oracle/privacy behavior.
- **Crash-recoverable acceptance saga:** replace impossible cross-store atomicity with (1) one SQL
  transaction that locks/consumes the exact invite pair and epoch, idempotently creates/reactivates
  and returns a stable membership UUID and durable acceptance truth, then (2) a durable client-side
  acceptance state that deterministically/idempotently creates or links exactly one encrypted CRDT
  Person keyed by that membership UUID, selects the shared vault and syncs. Every load/retry resumes
  the saga; concurrent tabs converge; UI stays honestly `finishing` until all steps commit. Define
  crashes before/between Person, link, selection and sync, duplicate suppression and reversal/export
  behavior without claiming SQL can roll back encrypted CRDT state.
- **Deterministic onboarding:** select invite-aware first-user registration that defers creation of
  the default personal vault until explicit invite cancellation/failure. Successful acceptance
  selects the shared vault; cancellation/failure resumes ordinary default-vault creation without
  leaking or losing the fragment capability.
- **Acceptance contract:** provide corrected state diagrams, ownership tables, threat/replay/privacy
  matrix, schema/backfill/reversal consequences and a revised complete P08 clause/test map. Retain
  all original real isolated owner/invitee/removal, accessibility, responsive, preference and 200%
  zoom requirements. No service fixture, direct URL discovery substitute, plaintext secret,
  success before reconciliation, or claim that P08 is dispatch-ready is allowed.
- **Inherited gates:** P08 remains blocked until this revision independently passes and D-011/P05 is
  rechecked with a supported genuinely hidden topology. P04 identity/RLS, P06 identity-only
  registry, P19 passkey ownership and R-024 P20B/P21 routing remain fixed. Recheck rolling scratch
  SHA/21 blocks, immutable FS-001 and SCOPE without editing them.
- **Question route:** record any residual ambiguity as a complete Q proposal in the sole evidence;
  do not ask the human or pause. Apply the decision hierarchy and continue.

## Review dispatch

This review is complete and immutable in artifact commit
`51cf5baf7492dfb39b606feda2dcb5277ef3877d`.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Literal reviewed HEAD:** `033cb8f6d37208c1ba6ac0b0907672aa18e4ad6d`
- **Range type:** original BASE through unchanged pre-implementation HEAD; root-only immutable
  revision-01 artifact/control commits are expected, but revision 02 adds no product commit
- **Implementation evidence:** `evidence/P07/implementation-02.md`, SHA-256
  `463c9139e76a65542c49ad3ef62212571e9d59cf7c198a81dbd864a9b419a85f`
- **Sole reviewer artifact:** `reviews/P07-review-02.md`
- **Review artifact SHA-256:**
  `3f74108cff1bfc48fa49d0fe0e217f6ba491789851932ed229c94ffe93f6c4e3`
- **Verdict:** FAIL. The sibling-tab local append path is not transactionally fenced against a
  sealed transition set; the full contract drops vault-creator owner↔Person linkage; and distinct
  invites can concurrently claim one Person and leave non-bijective links.
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently verify the exact evidence and original BASE..HEAD,
  distinguishing root-only immutable revision-01 artifacts/control history from the empty revision-
  02 product diff. Re-audit every Q-014/F-001/F-002 correction: access-generation-scoped historical
  envelopes; sole authenticated `crypto_box` convention; rotation watermark/lineage/recipient
  serialization; ciphertext-only crash journal; exact-byte re-encryption, stable lineage and
  covered/inserted acknowledgement; removed/re-added denial; capability-bound non-enumerating
  snapshot/key preflight; fragment lifecycle; atomic stable SQL acceptance truth; protected recovery;
  deterministic encrypted CRDT Person/link/selection/sync saga; concurrency/crash idempotency and
  deterministic deferred-default onboarding. Confirm all unaffected linked-hybrid clauses, threat/
  privacy/schema/backfill/reversal/export and the complete 29-clause test map remain sound and
  feasible. Reject plaintext journals, inaccessible recovery, duplicate/lost operations or People,
  server-claimed encrypted-CRDT atomicity, secret/oracle leaks, weakened real-browser gates, or P08
  dispatch before the D-011/P05 recheck. Verify hashes, index/write boundary, cleanup, 21 scratch
  blocks, FS-001 and SCOPE.
- **Failure route:** persist immutable revision-02 artifacts, then revision 03 must preserve every
  sound revision-02 clause while adding a persistent per-vault transition fence checked atomically by
  every local append, transactional no-late-lineage completion proof, crash-recoverable vault-
  creator membership/default-Person linkage, and deterministic post-convergence same-Person claim
  repair that gives the losing membership its deterministic Person before success
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Exact-stage and commit revision-02 evidence/review with PROGRESS/HANDOFF/RISKS failure state. Record
artifact commit `51cf5baf7492dfb39b606feda2dcb5277ef3877d` in a second control commit, then
rewrite this handoff and dispatch only `human_scratch_implementer` for evidence-only
`evidence/P07/implementation-03.md`. No P08
implementation or HS marker is authorized; D-011/P05 remains a separate gate.

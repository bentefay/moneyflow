# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P07 / 03
- **Scope IDs:** HS-011 architecture with integrated HS-012 contract; both remain incomplete
- **State:** changes_requested
- **Task:** `tasks/HS-011-membership-invite-ux.md` and HS-012 contract in
  `tasks/HS-012-auto-person-link.md`
- **Original package BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Pre-implementation HEAD:** `55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d`
- **Range meaning:** evidence-only revision; root's immutable revision-01/02 artifact/control
  commits follow the original BASE, but the worker makes no commit and leaves every executable path
  unchanged.
- **Allowed implementation paths:** none. Do not edit product, test, migration, config, dependency,
  ledger, prior artifact/review, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent paths.
- **Sole implementer artifact:** `evidence/P07/implementation-03.md`
- **Commit contract:** make no commit and leave HEAD/index unchanged. Write only the assigned new
  evidence artifact; all prior evidence/reviews are immutable.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md`, `HANDOFF.md` and
  `RISKS.md`, plus assigned uncommitted `evidence/P07/implementation-03.md` and
  `reviews/P07-review-03.md`; no staged or other dirty paths
- **Authoritative correction:** implement all three findings and the exact revision-03 scope in
  `reviews/P07-review-02.md`. Preserve every sound revision-02 linked-hybrid, Q-014, capability,
  crypto, rotation, lineage, tenure, SQL acceptance, fragment, onboarding, privacy, migration,
  reversal, export, accessibility and real-browser requirement without weakening or restating it
  inconsistently.
- **Transactional cross-tab fence:** define a durable per-vault local epoch/write fence installed in
  the same IndexedDB transaction that seals the planned source-epoch lineage set. Every local edit
  admission and every encrypted-operation append transaction must read the persisted fence and
  current local epoch. A racing update must serialize into exactly one safe branch: commit before
  seal and be included; remain unapplied/deferred before document mutation; or atomically extend/
  reopen the transition journal with its exact encrypted update/lineage before adoption. Broadcast
  and leader locks are notification only, never correctness authority.
- **Stale-tab and completion proof:** specify how a tab suspended before/after in-memory mutation
  preserves its exact update when its callback observes the seal or advanced local epoch. Adoption/
  cleanup must transactionally prove no source-epoch `pushed=false` row or deferred/unmapped lineage
  exists, switch local epoch and leave a terminal fence that prevents any later old-epoch append.
  Define crash/reload/idempotency at edit admission, seal, append, journal extension, adoption and
  cleanup. Require two real same-vault tabs with injected both-sided races: before-seal included
  once, after-seal never unmapped, stale-after-completion cannot write/publish old epoch, and every
  legitimate edit survives exactly once.
- **Vault-creator linkage:** restore HS-012's vault-creation branch. Define a feasible zero-knowledge,
  crash-recoverable protocol using stable creation truth/attempt and owner membership UUID plus a
  deterministic default Person and reciprocal encrypted membership maps. Lost SQL response,
  refresh, concurrent creator tabs, crashes before/after initial snapshot or operation persistence,
  and repeated creation calls must converge to one vault, one owner membership, one active default
  Person and bijective links. No creation success before local durability and server sync; the
  server never creates/reads CRDT Person plaintext.
- **Distinct-invite Person contention:** define post-merge encrypted client reconciliation when two
  valid invitations carry the same unlinked Person intent. Preserve the intended financial Person
  and its converged winning reciprocal membership claim. Remove only the losing membership's stale
  forward claim, deterministically create that membership's `(vaultId,membershipId)` Person and
  repair its forward/reciprocal fields in an idempotent lineage. Keep `Finishing setup` until the
  bijection is durable/synced. Invitation reservations may reduce races but cannot replace this
  convergence rule. Never merge/delete financial history or expose intent to the server.
- **Complete contract update:** extend ownership/state/threat/privacy/schema/backfill/migration/
  reversal/export and the full 29-clause proof map with fence/creator/claim records. Tests must cover
  creator response loss/crash/concurrent tabs/repeated calls and two isolated concurrent invitees
  claiming one Person, proving two memberships, two active People, a bijective link set, preserved
  financial history and no permanent repair-only finishing state. Same-invite and all prior real
  owner/invitee/removal/transition tests remain mandatory.
- **Inherited gates:** P08 remains non-ready until revision 03 independently passes and D-011/P05
  verifies a supported genuinely hidden topology. No product implementation, service-fixture
  substitute, plaintext/memory-only journal, destructive repair, weakened success gate or HS marker
  is authorized.
- **Question route:** record residual ambiguity only as a complete Q proposal in the sole evidence;
  do not ask the human or pause. Apply the decision hierarchy and continue.

## Review dispatch

This review is complete and becomes immutable when root persists revision-03 failure artifacts.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Literal reviewed HEAD:** `55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d`
- **Range type:** original BASE through unchanged pre-implementation HEAD; root-only immutable
  failure artifacts/control commits expected; revision 03 adds no product commit
- **Implementation evidence:** `evidence/P07/implementation-03.md`, SHA-256
  `e071c6b240c7907f6814425f7da4dcb25f02e87b95522d9c6c95e953d85ddfbb`
- **Sole reviewer artifact:** `reviews/P07-review-03.md`
- **Review artifact SHA-256:**
  `af4857061be4e637b31b4a4ac682a1fb17e0b1fd8836b84d846b16eb8a80bff0`
- **Verdict:** FAIL. The cross-tab fence passes, but semantic lineage aliases distinct peer-specific
  Loro update bytes and lacks a causally newer late-claim repair round; creator reconciliation also
  creates a Person distinct from canonical `person-default-me` without migrating its 100% account
  ownership/references.
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently verify exact evidence/range and that revision 03 adds no
  executable diff. Re-audit the persistent same-store edit-admission/append fence, isolated-fork
  mutation ordering, seal/append/adoption serialization, journal revision CAS, terminal minimum
  epoch, no-late-lineage cleanup and two-real-tab injected race proof. Verify default-vault
  caller/purpose creation truth, one SQL vault/owner/snapshot, protected recovery, deterministic
  owner Person/link lineage and no success before sync. Verify encrypted claim winner convergence,
  deterministic loser Person/repair lineage, bijection, history preservation, no oscillation and
  isolated distinct-invite race proof. Confirm ownership/threat/privacy/schema/migration/reversal/
  export and all 29 clauses retain every sound revision-02 Q-014/security/UX gate. Reject any live-
  before-durable mutation, check/append gap, late old op, duplicate vault/Person/link, destructive
  financial repair, server CRDT authority, plaintext journal, fixture substitute, weakened real-
  browser proof or premature P08 dispatch. Verify hashes/index/write boundary/cleanup, 21 scratch
  blocks, FS-001 and SCOPE.
- **Failure route:** revision 04 remains evidence-only, preserves every sound revision-03 clause,
  distinguishes exact CRDT operation identity from request/value idempotency, permanently retains
  every distinct update or canonical exact bytes, creates a new causally bound repair round after
  late claims, and idempotently links the existing default `Me` to the owner membership while
  preserving default-account ownership and every reference
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Exact-stage and commit revision-03 evidence/review with PROGRESS/HANDOFF/RISKS failure state, record
the artifact commit in a second control commit, then dispatch only `human_scratch_implementer` for
`evidence/P07/implementation-04.md`. No P08 implementation or HS marker is authorized; D-011/P05
remains separate.

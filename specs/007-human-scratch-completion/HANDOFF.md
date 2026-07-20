# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P07 / 04
- **Scope IDs:** HS-011 architecture with integrated HS-012 contract; both remain incomplete
- **State:** passed; no HS marker because P08 remains required
- **Tasks:** `tasks/HS-011-membership-invite-ux.md` and `tasks/HS-012-auto-person-link.md`
- **Original package BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Pre-implementation HEAD:** `dfffea3c19b110b6021b050b8d9e36b01ae75ab9`
- **Range meaning:** evidence-only revision; immutable prior P07 artifacts/control commits follow
  BASE, but the worker makes no commit and leaves every executable path unchanged.
- **Allowed implementation paths:** none. Do not edit product, test, migration, config, dependency,
  ledger, prior artifact/review, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent paths.
- **Sole implementer artifact:** `evidence/P07/implementation-04.md`
- **Commit contract:** make no commit and leave HEAD/index unchanged. Write only the assigned new
  evidence artifact; all prior artifacts are immutable.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md`, `HANDOFF.md`,
  `DECISIONS.md` and `RISKS.md`, plus assigned uncommitted `evidence/P07/implementation-04.md` and
  `reviews/P07-review-04.md`; no staged or other dirty paths
- **Authoritative correction:** implement both findings and exact revision-04 scope in
  `reviews/P07-review-03.md`. Preserve unchanged every sound revision-03 cross-tab fence, SQL truth,
  Q-014, linked-hybrid, capability/crypto/tenure/fragment/onboarding, privacy, migration, reversal,
  export, accessibility and real-browser gate.
- **Exact CRDT operation identity:** separate semantic/request/saga idempotency from each actual
  Loro update. Two peers assigning the same values may emit different peer/counter/causal bytes;
  each distinct durably admitted update must receive its own stable exact operation identity and be
  permanently stored/acknowledged. Retries of the same local update reuse its exact id/ciphertext;
  only exact-operation retransmission or an exact source operation proven in a rotation manifest may
  be `covered`. The zero-knowledge server may compare authenticated ids/digests/metadata and return
  stored ciphertext, never infer plaintext/value equivalence.
- **Saga completion versus operations:** deterministic Person/map keys prevent duplicate entities;
  creator/acceptance/repair completion truth is separately idempotent and may reference a set of
  permanent exact operation ids. Concurrent peers' same-value operations are all retained and
  merged; no local `pushed=false` operation may be dropped merely because another peer completed the
  same saga outcome.
- **Causally newer repair rounds:** bind each claim/repair round to the exact observed claim operation
  ids plus imported Loro causal frontier/version vector (or an equivalent monotonic encrypted
  revision). A repair update is generated only after importing that frontier and has its own exact
  operation id. A stale claim arriving after an acknowledged repair necessarily changes the frontier
  and produces a new causally later permanent repair. Completion requires the current claim frontier
  be dominated, the bijection hold after merge and all local emitted updates be permanent; value-
  only lineage cannot terminate a round.
- **Canonical default Person/reference reconciliation:** the encrypted initial snapshot already
  contains vault-scoped `person-default-me` and the default account assigns it 100% ownership. After
  SQL creation truth returns the owner membership UUID, idempotently link that exact existing Person
  and reciprocal maps; do not create a UUIDv5 replacement. Preserve its id, name, account ownership,
  allocations and every reference. Standard creation is repair-blocked if authenticated defaults
  are malformed/missing rather than silently creating/deleting/merging referenced People. Apply the
  same coherent initial-default rule to every new-vault creation flow.
- **Proof update:** two independent peers must emit same creator/acceptance/repair values with
  unequal update bytes and both exact ops become permanent/local-pushed; response loss/reload must
  not duplicate or strand either. Publish a stale claim only after the first repair is permanent,
  then prove a new frontier-bound repair becomes causally later and all clients reload to a stable
  bijection with no unpushed ops/oscillation. Creator tests inspect exact ids/maps/default-account
  ownership: one `person-default-me`, 100% ownership pointing to it, sole owner membership link, no
  dangling reference, one vault/selection after concurrent tabs/crashes.
- **Complete contract update:** extend ownership/threat/schema/migration/reversal/export and clauses
  14/16/22 plus the full proof map without dropping any retained clause. No canonical-peer fiction,
  server plaintext equivalence, destructive Person migration, service fixture, weakened success
  gate, product implementation or P08 readiness claim.
- **Inherited gate:** P08 still requires independent P07 revision-04 PASS and the D-011/P05
  supported genuinely hidden topology recheck. No HS marker is authorized.
- **Question route:** record residual ambiguity only as a complete Q proposal in the sole evidence;
  do not ask the human or pause.

## Review dispatch

This review is complete and integrated.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Literal reviewed HEAD:** `dfffea3c19b110b6021b050b8d9e36b01ae75ab9`
- **Range type:** original BASE through unchanged pre-implementation HEAD; root-only immutable
  failure artifacts/control commits expected; revision 04 adds no product commit
- **Implementation evidence:** `evidence/P07/implementation-04.md`, SHA-256
  `313ce10cfd75c25f26d6a75f9c8785bd95f2e213e48285c4e745cde7ecce93c6`
- **Sole reviewer artifact:** `reviews/P07-review-04.md`
- **Corrected review SHA-256:**
  `313cc26bf5b537c9281839b40a422d3e19f4244b30e18bd9f746303951f01c13`
- **Verdict:** PASS with no finding and no Q proposal. The reviewer corrected one pre-freeze prior-
  review hash typo in the same assigned file; exact boundary/hashes were reverified.
- **Integration commit:** `1f6cb96b27c8093f0ba2c319f32d3c79c8aab126`
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently verify exact evidence/range/no executable diff. Re-audit
  semantic versus exact CRDT operation identity, generated-once immutable local ids/ciphertexts,
  exact retransmission/collision rules, transition re-encryption source binding, distinct peer-op
  permanence and semantic receipt non-substitution. Verify repair-round claim-operation set/imported
  causal frontier, late-claim new round, all peer exact ops permanent, stable no-oscillation
  completion. Verify every new-vault path authenticates canonical `person-default-me`/`account-
  default`, links that exact Person to returned owner UUID, preserves 100% ownership/all references,
  rejects malformed defaults and never creates/deletes/merges a replacement. Confirm all sound
  revision-03 fence/Q-014/security/privacy/migration/reversal/export/29-clause/real-browser gates.
  Reject server plaintext equivalence, exact-op loss, old receipt covering late claim, duplicate/
  dangling Person, weakened success or premature P08 dispatch. Verify hashes/index/write boundary/
  cleanup, 21 scratch blocks, FS-001 and SCOPE.
- **Failure route:** persist immutable revision-04 artifacts and use reviewer-confirmed next scope
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Commit this integration reference, then perform the D-011/P05 supported genuinely-hidden-topology
no-product recheck required by DEPENDENCIES before any P08 dispatch. P07 is passed; HS-011/HS-012
remain unchecked because P08 is still required. No product implementation or marker is authorized.

# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P07 / 01
- **Scope IDs:** HS-011 architecture package only; HS-011 remains incomplete until P08 also passes
- **State:** changes_requested
- **Task:** `tasks/HS-011-membership-invite-ux.md`
- **Original package BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Pre-implementation HEAD:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Allowed implementation paths:** none. This is an evidence/ADR package with a valid expected
  `BASE == HEAD` range. Do not edit product, migration, test, config, dependency or durable ledger.
- **Sole implementer artifact:** `evidence/P07/implementation-01.md`
- **Commit contract:** make no commit and leave HEAD/index unchanged. Write only the assigned
  evidence artifact. Never edit ledgers/tasks/reviews/scratch/FS-001/.claude/.codex, prior artifacts
  or agent configuration.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md`, `HANDOFF.md`,
  `QUESTIONS.md` and `RISKS.md`, plus assigned uncommitted
  `evidence/P07/implementation-01.md` and `reviews/P07-review-01.md`; no staged or other dirty paths
- **Exhaustive discovery:** trace every owner/member/person/invite route, schema/table/role, router,
  key-wrap/unwrap operation, identity source, UI entry point, current placeholder/dead path and test.
  Distinguish verified security Members from financial People and identify the exact real vault-key
  source, invite secret lifecycle, URL transport, expiry/reuse/revoke/removal behavior and current
  permissions. Do not infer completion from crypto/router unit tests or direct URLs.
- **ADR comparison:** compare dedicated Vault Settings access management, People-owned access and a
  linked hybrid against frozen wording, established navigation, least privilege/privacy, discoverability,
  revocation/rekey consequences, accessibility and reversibility. Select the safest reversible
  architecture without asking the human; preserve clear Person/Member terminology even if linked.
- **P08 contract:** specify exact data/UI/security flows for owner discover/create/copy/revoke,
  invitee new/existing identity acceptance, real selected-vault key wrap/unwrap, single-use/expiry/
  tamper/cancel/cross-vault denial, optional person linkage/status, member removal/re-add and honest
  rekey limitations. Secret material must stay in URL fragment or another non-server-visible channel
  and out of artifacts/logs. Define which display/fallback identity is privacy-safe without reviving
  the removed generic user blob; HS-012 implementation remains P08.
- **Evidence and validation:** inventory current automated coverage and gaps; run proportionate
  router/crypto/invite tests and relevant retries-zero E2E without changing them. Use the installed
  headless CLI to judge whether an owner can discover a flow without direct URL knowledge and record
  placeholder/unavailable behavior, roles/names/focus/mobile/dark/reduced-motion plus sanitized
  URL/network/console evidence. Do not create/retain a real secret or bypass UI to claim success.
- **Decision output:** write a complete ADR proposal inside the evidence with alternatives,
  decision, P08 acceptance map, threat/privacy/data-migration impact and reversal. Any residual
  preference becomes a complete Q proposal, but no ambiguity pauses execution.
- **Stop boundary:** any discovered security/data contradiction must be recorded with its exact P08
  owner; do not fix it, add UI, modify crypto, create schemas or broaden P07 into implementation.
- **Inherited boundaries:** P04 verified identity/RLS and P06 identity-only registry are fixed. P05
  is externally blocked under D-011 and must be rechecked before P08; do not claim P08 dispatch-ready
  while that dependency is blocked. P19 owns passkey credentials and R-024 remains P20B/P21. Recheck
  rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue.

## Review dispatch

This review is complete and immutable once root persists the revision-01 failure artifacts.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Literal reviewed HEAD:** `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`
- **Range type:** valid empty `BASE == HEAD`; no commit/product diff
- **Implementation evidence:** `evidence/P07/implementation-01.md`, SHA-256
  `2e5173cdf1df4fac4de3b64ecb2887a3c70a00d387e36298f5c9eb8eaa1164ad`
- **Sole reviewer artifact:** `reviews/P07-review-01.md`
- **Review artifact SHA-256:**
  `296a5d0a17e2e1ae882422c3975d11c9ffc289c0a273ac52fb50e23af8b8381e`
- **Verdict:** FAIL. The linked hybrid is retained, but the contract can destroy a continuously
  authorized offline member's unpushed old-epoch operations and claims impossible SQL plus encrypted
  CRDT atomicity without a durable recovery saga.
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently re-trace authority/routes/UI/key protocols and verify the
  current nonfunctional invite/removal/rekey findings without leaking secrets. Audit the linked-
  hybrid selection against alternatives, least privilege, Person/Member separation, privacy,
  migration/reversal and all 29 P08 clauses—especially real sender-bound key exchange, fragment-only
  onboarding, atomic epoch removal, stable membership link, optional names and owner-governance
  exclusion. Repeat proportional crypto/DB/E2E and installed CLI discoverability/mobile/zoom
  evidence. Reject any contract that is cryptographically inconsistent, infeasible, scope-evading or
  falsely dispatches P08 before the D-011/P05 recheck. Verify empty range, sole evidence write,
  cleanup and frozen sources.
- **Failure route:** Q-014 selects a no-code revision 02 retaining all unaffected clauses while
  adding active-only per-epoch envelopes, crash-safe idempotent transition journaling, a capability-
  bound pre-membership snapshot, atomic SQL acceptance returning stable membership UUID, resumable
  deterministic encrypted-CRDT Person/link/selection reconciliation, authenticated `crypto_box`
  only and deterministic invite-aware default-vault deferral
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Exact-stage and commit the immutable revision-01 implementation/review artifacts with Q-014,
R-005/R-006/R-007/R-018/R-027 and the P07/HS-011 failure state. Record that artifact commit in a
second control commit, then rewrite this handoff for P07 revision 02 and dispatch only
`human_scratch_implementer` to create `evidence/P07/implementation-02.md` over the same original
empty BASE. P08 remains blocked by both P07 and the D-011/P05 recheck.

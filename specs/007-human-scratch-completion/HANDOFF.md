# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P04 / 01
- **Scope IDs:** HS-014; no scratch marker before independent package PASS and root integration
- **State:** changes_requested after immutable `reviews/P04-review-01.md` FAIL; evidence, review,
  Q-002 and failure state persisted in `8a3e80702bd6cf9aa8d96899c840923363481e5e`
- **Task:** `tasks/HS-014-database-rls-audit.md`
- **Original package BASE:** `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`
- **Pre-implementation HEAD:** `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`
- **Allowed implementation paths:** `supabase/migrations/**`, `supabase/config.toml`,
  `src/lib/supabase/**`, `src/lib/crypto/signing.ts`, `src/server/trpc.ts`,
  `src/server/routers/{vault,membership,invite,sync}.ts`, corresponding `src/server/schemas/**`,
  directly required `src/app/api/**` request-boundary code, and task-relevant `tests/**`. Any other
  source/UI path requires a complete evidence proposal for a later revision; do not edit it now.
- **Sole implementer artifact:** `evidence/P04/implementation-01.md`; it must contain the complete
  threat-model/data-flow/table-retention/rollback ADR before documenting mutations
- **Commit contract:** commit authorized product/migration/test changes only with exact-path
  staging; leave evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/
  FS-001/.claude/.codex.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  the assigned uncommitted evidence file only; no staged paths
- **Inventory and design:** enumerate every table, policy, function, trigger, grant, index,
  publication and router operation. Define identity/signature proof, verified hash derivation, TLS,
  service-role bypass, RLS, router authorization, ops as permanent encrypted source, snapshots as
  cache, invite/member lifecycle, legacy retention/migration, rollback and existing-client behavior.
- **Security invariant:** no untrusted header/client claim may select the public-key hash. Server
  derives it only after verified signatures with replay protection. Financial plaintext, keys and
  secrets never enter DB/log/URL. Owner/member/outsider/invite roles are least privilege and
  cross-vault isolation is deterministic despite service-role RLS bypass.
- **Migration:** preserve permanent encrypted ops/audit history, remove or quarantine legacy
  duplication only through safe upgrade/fresh migration behavior, correct every affected policy/
  function/grant/index/router check, regenerate types where required, and include explicit rollback
  notes. No destructive data loss or silent existing-client breakage.
- **Automated evidence:** fresh/upgrade/rollback-safe fixtures; exhaustive router/RLS matrix for
  owner/member/outsider, spoofed hash/signature, replay, invite states and cross-vault read/write/
  delete; persistence/sync regression and full high-risk suite.
- **Manual charter:** isolated owner/member/outsider sessions create/sync/import/edit/delete and
  attempt direct cross-vault routes; refresh, opener duplicate, reconnect/offline; inspect UI flash,
  errors, console and request URLs/metadata/Supabase traffic for plaintext, keys, secrets and leaked
  existence. Use repository-installed headless CLI and clean all state/artifacts.
- **Question route:** use complete proposals in sole evidence; root alone appends QUESTIONS. Apply
  preservation/least privilege and continue unless genuinely destructive authority is required.

## Review dispatch

This section records the immutable completed revision-01 review.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`
- **Literal reviewed HEAD:** `20a489dc51542ee0c681cfba0a33aee820d70221`
- **Range type:** non-empty original package BASE through revision-01 HEAD
- **Implementation evidence:** `evidence/P04/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P04-review-01.md`
- **Prior review files:** none
- **Reviewer writes:** review file only; no other writes/commits
- **Review result:** FAIL; review SHA-256
  `89ffd44dccc6be9858033608c6e60656d9f33894ed3a7fe50c7d9c2d63efe947`
- **Blocking findings:** F-001 authenticated GET signatures omit the selected operation/input while
  tRPC serializes it in the URL; F-002 public user endpoints select/create/return service-role data
  by a caller-claimed hash. No HS-014 marker is authorized.
- **Required adversarial focus:** independently reproduce migration fresh/seeded-upgrade safety,
  direct-role grants/RLS and service-role router scoping, permanent-op retention/immutability,
  invite/replay/cross-vault behavior, real CLI isolation, and exact frozen-source/write boundaries.
  Treat authenticated GET operation/input binding and public claimed-hash user operations as
  mandatory acceptance gaps unless independently disproved. Confirm the narrow exact revision-02
  path expansion, and preserve P05/P08/P20B/P21 routes rather than crediting deferred evidence.
- **Failure route:** persist immutable artifacts, transcribe complete proposals, set
  `changes_requested`, and use a new revision-02 evidence/review pair covering the original BASE
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Rewrite this handoff for P04 revision 02 from the original BASE, including the review's exact
13-path authority, new evidence/review paths and mandatory F-001/F-002 counterfactual tests. Do not
authorize the HS-014 marker.

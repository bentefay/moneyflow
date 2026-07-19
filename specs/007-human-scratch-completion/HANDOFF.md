# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P04 / 02
- **Scope IDs:** HS-014; no scratch marker before independent package PASS and root integration
- **State:** passed/integrated in `b905ecb810334ed9697f57140047964135ade6ea`; HS-014 marker
  `completion_pending` from scratch SHA `db97178a…`
- **Task:** `tasks/HS-014-database-rls-audit.md`
- **Original package BASE:** `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`
- **Pre-implementation HEAD:** `ae6b1797e5c874fc48114f309bb9a7e02220a246`
- **Allowed implementation paths:** exactly `src/lib/trpc/client.ts`,
  `src/app/api/trpc/[trpc]/route.ts`, `src/lib/crypto/signing.ts`, `src/server/trpc.ts`,
  `src/server/routers/user.ts`, `src/server/schemas/user.ts`, `src/hooks/use-identity.ts`,
  `tests/unit/crypto/signing.test.ts`, `tests/unit/server/trpc-auth.test.ts`,
  `tests/unit/server/user-router.test.ts`, `tests/unit/hooks/use-identity.test.tsx`,
  `tests/e2e/onboarding-vault.spec.ts`, and `tests/e2e/vault-settings.spec.ts`. No other product,
  migration, test, caller or configuration path is authorized; propose an exact later revision if
  the hook contract cannot be preserved within this boundary.
- **Sole implementer artifact:** `evidence/P04/implementation-02.md`
- **Commit contract:** commit authorized product/migration/test changes only with exact-path
  staging; leave evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/
  FS-001/.claude/.codex.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  the assigned uncommitted `evidence/P04/implementation-02.md`; no staged paths. Revision-01
  evidence/review are committed and immutable.
- **F-001 correction:** force every authenticated tRPC query/mutation through canonical POST or an
  equally exact signed representation; client and server must bind the complete normalized
  operation/input list. Query URLs must omit serialized input, identity/vault identifiers, vectors
  and `hasUnpushed`. Counterfactual procedure and input substitutions must fail verification.
- **F-002 correction:** eliminate public claimed-hash selection/creation. User access derives only
  from verified `ctx.pubkeyHash`; remove or make `exists` self-only, and make register/get-or-create
  protected without claimed hash inputs. Preserve stored data and non-enumerating behavior.
- **Identity lifecycle:** new registration must establish proof before service-role access while a
  failed mutation leaves no stale session, active vault, cache or falsely unlocked state. Preserve
  the hook's page-facing contract and both new/existing identity journeys.
- **Required validation:** focused counterfactual signing/auth/user/hook tests; anonymous/other-hash
  rejection; new-user registration failure cleanup; existing-user unlock; exact request URL/body
  inspection; full unit/lint/type/build; fresh and seeded-upgrade database audits; full retries-zero
  E2E; installed Playwright CLI new/existing/outsider sessions with console/request inspection and
  cleanup. Preserve P05 Realtime and P08 real invite UI as later-package boundaries.
- **Inherited classifications:** repository-wide format remains red only if the frozen HS-018 marker
  reproduces R-024; do not edit scratch. Recheck scratch SHA/21 normalized blocks and immutable
  FS-001 identity at return.
- **Question route:** use complete proposals in sole evidence; root alone appends QUESTIONS. Apply
  preservation/least privilege and continue unless genuinely destructive authority is required.

## Review dispatch

This section is active; revision-02 evidence and the cumulative literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`
- **Literal reviewed HEAD:** `dbcf180e829c81a218e9a73791e40902c4f9eb31`
- **Range type:** non-empty cumulative original package BASE through revision-02 HEAD
- **Implementation evidence:** `evidence/P04/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P04-review-02.md`
- **Prior review files:** immutable `reviews/P04-review-01.md` FAIL, SHA-256
  `89ffd44dccc6be9858033608c6e60656d9f33894ed3a7fe50c7d9c2d63efe947`
- **Reviewer writes:** review file only; no other writes/commits
- **Review result:** PASS recommendation; SHA-256
  `60c42330718eeb942f48a1d073b1c5c81b1de8dd0dd35108383f9d8ce863c210`; no finding or Q proposal
- **Runtime limitation:** two classifier-driven scope replacements prevented the reviewer from
  completing its seeded-upgrade/E2E/CLI reruns. It independently passed focused/full unit, lint,
  type and fresh pgTAP 49/49, source-reviewed the remaining checked-in evidence, and recorded the
  limitation. Root restored the interrupted database to clean latest no-seed state.
- **Required review focus:** independently audit original BASE through newest HEAD; reproduce F-001/
  F-002 counterfactuals, anonymous/other-identity rejection, registration failure cleanup, exact
  signed POST URL/body behavior, full fresh/upgrade database and router regression, retries-zero E2E
  and real CLI new/existing/outsider journeys. Verify the 13-path boundary, evidence/prior-review
  hashes, cleanup, R-024 classification and both frozen sources. Revision-01 artifacts are immutable.
- **Failure route:** persist immutable revision-02 artifacts and use new revision-03 paths
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Execute and finalize only the exact HS-014 first-line `[] -> [x]` marker under PROCESS. Revalidate
the rolling SHA, authorized checked set, all 21 normalized blocks and immutable FS-001 before any
P05 dispatch.

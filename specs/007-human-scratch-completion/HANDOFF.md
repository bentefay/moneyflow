# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P06 / 01
- **Scope IDs:** HS-010; no scratch marker before independent package PASS and root integration
- **State:** reviewing
- **Task:** `tasks/HS-010-remove-user-state.md`
- **Original package BASE:** `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1`
- **Pre-implementation HEAD:** `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1`
- **Allowed implementation paths, exactly:**
  `supabase/migrations/009_remove_unused_user_state.sql`,
  `src/server/routers/user.ts`, `src/server/schemas/user.ts`, `src/hooks/use-identity.ts`,
  `src/types/index.ts`, `src/lib/crdt/snapshot.ts`, `src/lib/crdt/index.ts`,
  `src/lib/supabase/database.types.ts`, `src/lib/supabase/types.ts`,
  `tests/unit/server/user-router.test.ts`, `tests/unit/hooks/use-identity.test.tsx`,
  `tests/database/rls-audit.sql`, `tests/database/legacy-upgrade-fixture.sql`,
  `tests/database/legacy-upgrade-audit.sql`, `tests/e2e/identity.spec.ts`,
  `tests/e2e/onboarding-vault.spec.ts` and `tests/e2e/vault-settings.spec.ts`.
  No other source, migration, generated type, test, config or dependency path is writable.
- **Sole implementer artifact:** `evidence/P06/implementation-01.md`
- **Commit contract:** commit only exact authorized implementation paths with exact staging; leave
  evidence uncommitted. Never broad-stage or edit ledgers/tasks/reviews/scratch/FS-001/.claude/
  .codex or immutable prior artifacts.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  assigned uncommitted `evidence/P06/implementation-01.md`; no staged or other dirty paths
- **Target proof and migration:** prove by complete usage/schema-history search that
  `public.user_data.encrypted_data` is the unused opaque state named by HS-010, not identity,
  membership, wrapped vault keys, session state or local active-vault/cache state. Add forward
  migration 009 that removes only the opaque state column while preserving every identity row,
  `pubkey_hash`, registration metadata, membership and vault data. Record irreversible legacy-blob
  deletion and rollback implications honestly; do not archive or move the generic blob elsewhere.
- **Dead surface removal:** retain verified self-only identity registration/get-or-create and
  `myVaults`. Remove state-specific inputs/outputs and the demonstrably uncalled `exists`, `getData`
  and `upsertData` procedures plus dead Zod, generated/convenience, global-settings/vault-reference
  and encrypt/decrypt-user-data helpers only when whole-repository usage proves them dead. Registration
  and unlock must continue using signed empty inputs and must never accept a claimed identity.
- **Database evidence:** extend fresh RLS and seeded 005-to-009 upgrade audits to prove the legacy
  identity survives, the opaque state column is absent, no direct anon/auth access reappears, and all
  prior permanent ops/snapshots/memberships/migrations remain intact. Regenerate/hand-correct the
  checked-in database type only to exact post-009 schema.
- **Behavior invariants:** onboarding, recovery-phrase unlock, returning identity, default vault,
  vault list/switch, refresh/duplicate, local IndexedDB cache/offline recovery and existing invite/
  membership behavior remain intact. Network evidence must show no removed user-state endpoint,
  plaintext or secret/input URL. Do not create passkey/credential storage; P19 owns that design.
- **Validation:** run focused router/hook/identity tests, full unit/integration, lint/type/build/
  format/diff, fresh and seeded-upgrade database audits, repeated retries-zero identity/onboarding/
  vault-settings E2E, ordinary full zero-retry E2E and the installed CLI charter. Inspect sanitized
  console/network/DB evidence and perform responsive/dark/reduced-motion/offline/duplicate checks.
- **Stop boundary:** any hidden product consumer, destructive requirement conflict, migration loss
  beyond the named unused blob or remaining failure requires a complete exact next-owner proposal.
  Do not retain the blob under another name, change signing/session/vault membership/local cache,
  implement passkeys, widen migration scope, weaken tests or edit an unlisted path.
- **Inherited boundaries:** P04 verified identity/RLS/permanent-op rules and P05 reviewed Realtime
  behavior remain unchanged. P05/HS-015 is externally blocked under D-011 and is not writable here.
  P08 owns invite/key-wrap UX, P19 owns credential storage, and R-024 remains P20B/P21. Recheck the
  rolling scratch SHA/21 blocks and immutable FS-001.
- **Question route:** complete proposals in sole evidence; root alone appends QUESTIONS. Apply the
  decision hierarchy and continue unless another exact owner is proved necessary.

## Review dispatch

This section is active; revision-01 evidence and the literal range are frozen.

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1`
- **Literal reviewed HEAD:** `95e91dbcb17ffb9600eaa6cb795336898297ebae`
- **Range type:** non-empty; one commit and exactly 17 authorized paths
- **Implementation evidence:** `evidence/P06/implementation-01.md`, SHA-256
  `78fe921dbdd49e1a5ca5a499734f434a4e9715117499082110a5fb3450ae3f52`
- **Sole reviewer artifact:** `reviews/P06-review-01.md`
- **Review result:** PASS recommendation; SHA-256
  `0580e4c8fc9f14d30d4c4d21a761fb56b8ff42953decd30564dda36efe4b64df`; no finding or Q proposal
- **Reviewer writes:** review file only; no other writes/commits
- **Required review focus:** independently audit full BASE..HEAD, usage/history proof and exact
  one-column migration. Verify identity rows/timestamps and normalized encrypted vault state survive
  seeded 005→009 while the named blob is intentionally unrecoverable; audit grants/RLS/type output,
  strict signed empty identity inputs, race handling and removal of only dead procedures/types/
  wrappers. Repeat focused router/hook, fresh/upgrade pgTAP, changed E2E and sample broad gates.
  Manually test create/unlock/refresh/duplicate/offline/mobile preferences, absence of dead endpoints,
  no plaintext/secret URLs and honest later-package UI limitations. Recheck cleanup, P05 external
  boundary, hashes and frozen sources.
- **Failure route:** persist immutable revision-01 artifacts and use reviewer-confirmed next scope
- **PASS authority:** reviewer recommends; root verifies/transcribes/integrates and sets `passed`

## Next root action

Root integrates the immutable P06 evidence/review, D-012 and applicable risk state using exact-path
staging. Only after that integration commit exists may P06 become passed and the HS-010 completion
marker be durably prepared.

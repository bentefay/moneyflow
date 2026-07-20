# P06 Implementation Evidence — Revision 01

## Immutable dispatch boundary

- Package/scope/revision: `P06` / `HS-010` / `01`.
- Original package BASE and pre-implementation HEAD: `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1`.
- Writable implementation paths are exactly the 17 paths enumerated in `HANDOFF.md`; every other
  product, migration, generated type, test, configuration, dependency, control, prior artifact and
  frozen-source path remains read-only.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P06/implementation-01.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.

## Validation plan

1. Prove from repository-wide use, schema and history that `public.user_data.encrypted_data` is the
   unused opaque state named by HS-010 and distinguish it from verified identity, membership,
   wrapped vault keys, signing session, active-vault selection and IndexedDB cache.
2. Remove only demonstrably dead state-specific router/schema/type/crypto surfaces; preserve signed
   empty-input registration/get-or-create, `myVaults`, and every identity/vault/membership path.
3. Add forward migration 009 removing only the opaque column, update the exact post-migration
   checked-in type, and extend fresh plus seeded 005→009 audits for identity and encrypted vault
   data preservation, direct-access denial and honest irreversible legacy-blob loss.
4. Run focused router/hook/identity checks, full unit/static/build/database checks, repeated
   retries-zero identity/onboarding/vault-settings journeys, ordinary full E2E, and the installed
   CLI responsive/dark/reduced-motion/offline/refresh/duplicate charter.
5. Restore generated/environment state, close sessions and servers, reset the database, verify
   service and frozen sources, exact-stage only authorized implementation paths, and leave this
   evidence uncommitted. Any hidden consumer or loss beyond the named blob routes to a complete
   exact next-owner proposal.

## Pre-mutation target, usage and history proof

- The live post-008 schema has exactly `user_data.pubkey_hash text NOT NULL`,
  `encrypted_data text NOT NULL`, and nullable defaulted `updated_at timestamptz`. Its primary key
  is the identity hash. Migrations 005–008 are applied; the compatible Realtime image and internal
  migration/filter state are unchanged and logs contain no `MigrationCountMismatch`.
- Migration 005 and the frozen MVP design history identify only `public.user_data.encrypted_data` as
  the generic encrypted JSON originally intended to combine vault references and global settings.
  Migration 006 already removed direct browser access and retained service-only access pending P06.
  No later migration changes the blob or makes it a sync source.
- Whole-repository production/test usage finds the user blob only in `user.exists`,
  `user.register`'s optional input/default, `user.getOrCreate`'s state result, `user.getData`,
  `user.upsertData`, their Zod/types, the generated/convenience row types, the dead
  `GlobalSettings`/`VaultReference` model, and generic `encryptUserData`/`decryptUserData` wrappers.
  There is no application caller of `exists`, `getData`, `upsertData`, the model types or the
  wrappers. The only state-result test is a router mock of the obsolete blob.
- Identity registration and recovery unlock call `register({})` and `getOrCreate({})` only after the
  signing session is installed. The verified middleware-derived `ctx.pubkeyHash`, strict empty
  inputs, identity row and registration timestamp are independent of the blob and must remain.
- Vault membership and wrapped-key authority live in `vault_memberships.pubkey_hash`,
  `encrypted_vault_key`, role and encryption-public-key fields; vault listing comes from normalized
  vault/membership queries. Vault content remains encrypted Loro ops/snapshots. The selected vault
  is in identity-scoped local storage, and crash/offline state is in IndexedDB. None references
  `user_data.encrypted_data`.
- The removal is intentionally destructive only for legacy generic ciphertext. `DROP COLUMN`
  irreversibly deletes those opaque bytes; a down migration could recreate an empty column but could
  not reconstruct data. Recovery requires a pre-migration database backup. HS-010 explicitly calls
  for removal until a future sync/CRDT design exists, so migration 009 must neither archive nor move
  the blob under another name. Identity rows, hashes/timestamps, vaults, memberships, wrapped keys,
  ops and snapshots remain byte-preserved.
- Before implementation, frozen identities were exact: scratch
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd` (350 lines, 24,243 bytes),
  FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` (715 lines, 25,441
  bytes), and `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9` (450
  lines, 27,382 bytes).

## Implemented scope

- Added forward migration `009_remove_unused_user_state.sql`. It drops only
  `public.user_data.encrypted_data`, updates the table comment to describe the remaining verified
  identity registry, and revokes the now-useless service-role `UPDATE` privilege. The migration
  explicitly states that deleted opaque ciphertext is not reconstructible and recovery requires a
  pre-migration backup; it does not pretend to offer a data-restoring down path.
- Reduced the user router to the exact supported procedures `register`, `getOrCreate`, and
  `myVaults`. Registration and recovery retain protected signed authentication, derive identity only
  from `ctx.pubkeyHash`, accept strict empty objects, insert only the identity hash, return only
  registration metadata, and preserve duplicate-insert race recovery. Removed procedures are
  `exists`, `getData`, and `upsertData`.
- Removed the corresponding obsolete Zod inputs/outputs/types, generic user-state model aliases, and
  generic `encryptUserData`/`decryptUserData` wrappers. Vault-scoped encryption, sync persistence,
  membership, wrapped keys, identity signing, active-vault selection and cache types are unchanged.
- Regenerated the post-009 Supabase type from the live local schema. This removed the three
  `user_data.encrypted_data` row/insert/update fields and also captured the already-applied
  migration 008 `realtime_topic_send_allowed` function omitted by the prior checked-in generation.
  The type generator emitted the complete file, then its telemetry shutdown timed out and appended
  one JSON diagnostic line while exiting 1; that non-TypeScript diagnostic was removed, formatting
  was applied, and typecheck plus the schema audit independently prove the resulting checked-in
  type.
- Updated router and hook tests to assert exact identity-only inserts, strict rejection of claimed
  identities, registration-metadata scoping, procedure removal and unchanged anonymous rejection.
  Browser journeys now assert empty signed request bodies and the absence of obsolete routes.
- Extended the fresh audit to 97 assertions and the seeded upgrade audit to 40 assertions. The
  upgrade fixture contains a non-empty legacy user blob and fixed registration timestamp so the
  audit proves the intended blob loss while preserving the identity row/hash/timestamp and all
  normalized encrypted vault state.

## Database proof

- Fresh reset applied 005, 006, 007, 008 and 009 in ordinary order. Fresh pgTAP passed `97/97`.
  Post-009 `public.user_data` has exactly `pubkey_hash text NOT NULL` and nullable
  `updated_at timestamptz`, with `pubkey_hash` still the primary key. Service role retains `SELECT`
  and `INSERT` but not `UPDATE`; anon/authenticated direct reads remain denied.
- Seeded upgrade started at migration 005, loaded the authorized legacy fixture, then applied the
  ordinary 006→007→008→009 path. Upgrade pgTAP passed `40/40`: the legacy identity hash and fixed
  timestamp are byte/value preserved, the blob column is absent, normalized membership/wrapped-key,
  operation and snapshot ciphertext remains exact, direct access remains denied, and the migration
  ledger is exactly 005–009. A normal fresh reset followed the seeded run.
- Final service state is a fresh 005–009 reset with aggregate row count `0` across `auth.users`, all
  nine public mutable tables and `realtime.subscription`. The live identity column/primary-key query
  matches the generated type.
- Realtime remains `public.ecr.aws/supabase/realtime:v2.112.6`, its internal migration count is
  `79`, the subscription filter is the compatible `ARRAY:_user_defined_filter`, and logs contain
  zero `MigrationCountMismatch` occurrences. No service/config drift was introduced.

## Automated validation

- Focused Vitest: router plus identity hook, `2` files and `10/10` tests passed.
- Full Vitest: `47` files and `1172/1172` tests passed.
- TypeScript: `pnpm typecheck` passed.
- ESLint: passed with zero errors and 13 pre-existing warnings outside this package's changes.
- Production build: `pnpm build` passed and generated all 17 routes.
- Focused real-browser identity/onboarding/same-vault unlock: `3/3` passed from a fresh reset with
  one worker and retries disabled.
- Repeated stability gate: the 21 focused tests repeated three times, `63/63` passed in one process
  with one worker and retries disabled.
- Ordinary full real-browser suite: `81/81` passed from a fresh reset with one worker and retries
  disabled, including offline sync, duplicate-tab hydration and P08-independent membership/Realtime
  behavior.
- Authorized changed TypeScript/TSX files pass `oxfmt --check`; `git diff --check` passes. A
  production-tree search has zero references to removed user procedures, obsolete generic user
  crypto wrappers, or obsolete user-state models. Remaining `encrypted_data`/`encryptedData` names
  belong to the deliberately retained encrypted vault operations/snapshots and sync paths.

## Installed CLI charter

- Used the installed `playwright-cli` in session `p06rev01` against the real local service and a dev
  server carrying the compatible local Realtime secret in process memory only. No mocked app route,
  headed/debug dashboard, persisted credential, or manual database mutation was used.
- Created a new identity through the visible recovery flow, reached the initialized vault/settings,
  locked through the application control, pasted the already-copied phrase through the normal
  recovery form, and unlocked the same vault on the first attempt. The recorded network list showed
  only `user.register` during creation and `user.getOrCreate` during recovery; their request bodies
  were both exactly `{\"0\":{\"json\":{}}}`. No `user.exists`, `user.getData`, `user.upsertData`,
  claimed `pubkeyHash`, or user blob request appeared.
- A normal refresh rehydrated the authenticated vault with `Saved`. A browser-duplicated tab that
  inherited session storage loaded the same authenticated transactions route and `Saved` state.
- While offline, created `P06OfflineTag` through the visible Tags UI; it rendered immediately with
  `Saving...`. Returning online did not settle within the 15-second observation window, so a normal
  reload was used; the IndexedDB-backed tag survived and the reconnected app then reached `Saved`.
  The full existing offline/reconnect suite also passed. This observation predates and is outside
  the identity-only P06 change; no sync behavior was changed here.
- At 390×844 with dark color scheme and reduced motion emulated, media queries reported both
  preferences active, the Tags content remained present, and the mobile `Open menu` control was
  available.
- The visible `Create new vault` item currently invokes only the pre-existing `console.log`
  callback, so a second-vault/switch UI journey is unavailable. Invite/redeem UI is likewise
  P08-owned. The P06-independent full E2E fixture nevertheless passed its two real identities,
  normalized membership, wrapped-key and encrypted cross-context synchronization/removal journey.
  P06 does not expand into those later UI packages.

## Cleanup and handoff invariants

- Closed the CLI browser, stopped the dev server, and moved exact generated CLI/E2E artifact
  directories to the desktop trash. No `playwright-cli`, Playwright test or Next dev process
  remains.
- Restored build-generated `next-env.d.ts`; it has no diff. No package/dependency/configuration file
  changed.
- Final frozen identities remain exact: scratch
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd` (350 lines, 24,243 bytes),
  FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` (715 lines, 25,441
  bytes), and `SCOPE.json` `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9` (450
  lines, 27,382 bytes).
- Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were not edited or staged. No scratch marker,
  control ledger, prior-package artifact or agent configuration was edited. This evidence remains
  uncommitted.

## Commit and review range

- Original immutable review BASE: `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1`.
- Implementation HEAD: `95e91dbcb17ffb9600eaa6cb795336898297ebae` (`Remove unused user state blob`).
  The commit contains exactly the 17 authorized implementation paths and no control/evidence path.
- Reviewer must inspect the exact immutable `BASE..HEAD` range plus this evidence artifact.
- Questions/proposals: none. The destructive legacy-blob disposition is explicit in HS-010 and the
  migration; unavailable create/switch/invite UI belongs to already-mapped later packages.

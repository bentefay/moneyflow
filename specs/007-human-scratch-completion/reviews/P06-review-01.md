# P06 Independent Review — Revision 01

## Verdict

**PASS.** The literal revision removes exactly the unused generic `user_data.encrypted_data` blob
named by HS-010 and no normalized vault, identity, signing-session, local-cache or active-vault
state. Fresh and seeded-upgrade database checks, exact-value reviewer queries, generated-type
comparison, API/source inspection, repeated changed browser tests and an installed headless CLI
journey independently support the change. The legacy blob loss is deliberately irreversible and
documented; identity hashes/timestamps, memberships, wrapped keys, encrypted operations and
snapshots survive.

No finding or question proposal is raised. Root may integrate the exact reviewed range and mark P06
passed after its own ledger, artifact and scratch-marker checks. This recommendation does not change
the externally blocked P05/HS-015 state or claim P08 invite/key-wrap UX or P19 passkey work.

## Immutable review boundary

- Package/revision: `P06/01`, scope `HS-010`.
- Literal reviewed range:
  `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1..95e91dbcb17ffb9600eaa6cb795336898297ebae`.
- The range contains one commit, `95e91dbcb17ffb9600eaa6cb795336898297ebae`
  (`Remove unused user state blob`), whose exact parent is the supplied BASE.
- It changes exactly the 17 authorized paths below, with 147 insertions and 322 deletions. There is
  no committed control-ledger, evidence, review, scratch, FS-001, agent, dependency or config path.

```text
src/hooks/use-identity.ts
src/lib/crdt/index.ts
src/lib/crdt/snapshot.ts
src/lib/supabase/database.types.ts
src/lib/supabase/types.ts
src/server/routers/user.ts
src/server/schemas/user.ts
src/types/index.ts
supabase/migrations/009_remove_unused_user_state.sql
tests/database/legacy-upgrade-audit.sql
tests/database/legacy-upgrade-fixture.sql
tests/database/rls-audit.sql
tests/e2e/identity.spec.ts
tests/e2e/onboarding-vault.spec.ts
tests/e2e/vault-settings.spec.ts
tests/unit/hooks/use-identity.test.tsx
tests/unit/server/user-router.test.ts
```

- Frozen implementation evidence:
  `specs/007-human-scratch-completion/evidence/P06/implementation-01.md`, independently verified
  SHA-256 `78fe921dbdd49e1a5ca5a499734f434a4e9715117499082110a5fb3450ae3f52`.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact, the only
  Git-visible dirt was root-owned unstaged `HANDOFF.md`/`PROGRESS.md` and the assigned untracked P06
  evidence. The review did not edit or stage them.

## Exact migration and state ownership

Migration 005 introduced `public.user_data` with primary-key `pubkey_hash`, opaque `encrypted_data`,
and `updated_at`; source/history inspection confirms that blob represented an old global
settings/vault-reference design. Current vault membership and encrypted state instead live in
normalized `vault_memberships`, `vault_ops` and `vault_snapshots`. The selected active vault and
unlocked identity/session are browser-local, while offline CRDT persistence is IndexedDB-backed.
None reads or reconstructs the generic user blob.

Migration 009 is correspondingly exact: inside one transaction it drops only
`public.user_data.encrypted_data`, updates the table comment, and revokes service-role `UPDATE`
(`supabase/migrations/009_remove_unused_user_state.sql:1-14`). It neither renames, archives nor
moves the blob, and its comment correctly states that recovery requires a pre-migration backup. That
is honest irreversible deletion, not a false down migration. The retained identity row, primary key,
timestamp and normalized vault tables are untouched by its DDL.

Whole-production-tree searches found no remaining calls to `user.exists`, `user.getData` or
`user.upsertData`, and no consumer of the removed generic user-data schemas, `GlobalSettings`,
`VaultReference`, `UserData`, `encryptUserData` or `decryptUserData`. Remaining
`encrypted_data`/`encryptedData` names are owned by encrypted vault operations, snapshots, sync,
Realtime and vault creation. The deleted CRDT wrappers were only generic user-state convenience
exports; vault-scoped snapshot/update encryption remains present and exercised. Historical core-MVP
text still describing the abandoned blob is an immutable earlier design source, not a live consumer
or reason to preserve dead storage.

## Identity API, race and type adjudication

The resulting user router exposes only `register`, `getOrCreate` and unchanged `myVaults`.
Registration and recovery remain `protectedProcedure`s and accept strict empty objects
(`src/server/schemas/user.ts:13-50`). Both select/insert exclusively by `ctx.pubkeyHash`; callers
cannot submit a claimed identity. `register` retains idempotent duplicate handling, while
`getOrCreate` handles SQLSTATE `23505` by reselecting only the verified context identity before
returning registration metadata (`src/server/routers/user.ts:68-194`). Neither returns a blob or
normalized encrypted vault content.

The hook invokes these mutations with literal `{}` only after installing the signing identity
(`src/hooks/use-identity.ts:252`, `:317`, `:374`). Unit and real-browser request assertions reject
extra identity input, cover anonymous denial and confirm exact empty payloads. The installed CLI
network and server records likewise showed only `user.register` during creation and
`user.getOrCreate` during recovery, each with exact body `{"0":{"json":{}}}`. No removed procedure,
identity claim, secret, phrase or user blob appeared in a request URL or body.

The checked-in generated database type removes exactly the three `encrypted_data` row/insert/update
fields from `user_data`; its additional `realtime_topic_send_allowed` function reflects already
applied migration 008. A live `supabase gen types` output, formatted with repository tooling, diffed
clean against the revision. Convenience aliases were removed only where usage proved them dead, and
nullable `updatedAt` matches the live nullable database default/type.

## Database and preservation proof

An independent fresh reset applied 005 through 009 in order. `tests/database/rls-audit.sql` passed
97/97 and proved the two-column identity table, primary key, role privileges, RLS denial and prior
vault/Realtime rules. The live schema exposes exactly `{pubkey_hash,updated_at}`. Only
`service_role` has application-level `INSERT,SELECT`; it has no `UPDATE`, while anon/authenticated
remain denied and the explicit deny policy remains installed under RLS.

The seeded-upgrade run started at migration 005, loaded the fixed legacy fixture containing a
non-empty generic blob plus normalized encrypted state, and applied 006 through 009 normally. Its
pgTAP audit passed 40/40: the blob column is absent; the one identity hash and fixed timestamp are
exact; the migration ledger is 005–009; and membership, operations and snapshot state remain.
Reviewer SQL additionally compared the exact fixture values after upgrade and confirmed the owner
membership ID/vault/hash, wrapped vault key and encryption public key, plus the snapshot ID,
ciphertext and version vector. This closes the one detail that the committed pgTAP expresses as a
membership-role assertion rather than separate exact-value assertions. The migration's sole-table,
sole-column DDL and all exact reviewer values were clean, so this is not a product or acceptance
finding.

After the installed CLI journey, the live database still had exactly two `user_data` columns, one
identity, one vault, one complete membership and one complete encrypted snapshot. A final ordinary
`pnpm db:reset` then left aggregate row count zero across `auth.users`, all public mutable tables
and `realtime.subscription`, with migrations 005–009 installed. Realtime remained healthy on
`public.ecr.aws/supabase/realtime:v2.112.6`, with 79 service migrations, compatible
`_user_defined_filter` subscription type and zero `MigrationCountMismatch` log entries. No service,
schema or configuration drift remains.

## Independent validation

| Check                                                    |                       Independent result |
| -------------------------------------------------------- | ---------------------------------------: |
| focused router/hook Vitest                               |                    2 files, 10/10 passed |
| complete Vitest                                          |             47 files, 1,172/1,172 passed |
| fresh 005–009 reset + RLS pgTAP                          |                             97/97 passed |
| seeded 005 fixture -> 006–009 upgrade pgTAP              |                             40/40 passed |
| exact seeded identity/membership/snapshot SQL            |                                   passed |
| changed identity/onboarding/vault E2E, repeat 2, retry 0 |                             42/42 passed |
| implementation full E2E, one worker, retry 0             |                             81/81 passed |
| implementation focused repeat 3, retry 0                 |                             63/63 passed |
| typecheck                                                |                                   passed |
| lint                                                     |  passed; 0 errors, 13 inherited warnings |
| production build                                         | passed; all 17 routes compiled/generated |
| changed TypeScript/TSX `oxfmt --check`                   |                                   passed |
| live generated-type comparison                           |                                  no diff |
| `git diff --check BASE..HEAD`                            |                                   passed |

The independent repeated browser command covered all three changed specs in one-worker mode after a
fresh reset. This is proportional independent sampling of the frozen evidence's clean full 81-test
run and three-repeat 63-test stability run. The only browser log noise was expected teardown/offline
transport behavior from inherited P05 sync paths; assertions remained green. Repository-wide
`format:check` still reports only root-owned control ledgers and frozen source paths outside this
package, while every changed TypeScript/TSX path formats cleanly.

## Installed headless CLI charter and later-package boundaries

The reviewer used the installed repository `playwright-cli` in a unique disposable headless session
against the real local stack and a compatible dev server. No headed dashboard, mocked app route,
direct product-data mutation or persisted credential was used.

- A newly generated identity completed the visible onboarding flow, created its default vault,
  locked via the application control and unlocked on the first attempt through all 12 normal
  recovery fields. A normal refresh returned to authenticated Transactions with `Saved`.
- A same-context browser duplicate inherited the authenticated state and independently rendered the
  same Transactions route and `Saved`. No removed user endpoint appeared in network/server records.
- Offline, a tag created through the normal Tags UI appeared immediately. Returning online remained
  in the inherited sync-error state for the bounded 15-second observation; after a normal reload,
  the IndexedDB-backed tag survived and sync returned to `Saved`. This matches the candid frozen
  evidence and existing offline suite. It predates P06, and no P06 implementation path owns sync or
  Realtime behavior, so it is not an HS-010 regression or scope-widening basis.
- At 390×844 with dark scheme and reduced motion active, the Tags content and mobile `Open menu`
  remained available. The drawer exposed `Lock` and `Saved`. At 200% page scale, content remained
  reachable without document-level horizontal overflow. P06 changes no visual control, so a new
  control-specific contrast claim is not applicable.
- The existing visible `Create new vault` item still has only its pre-existing placeholder callback,
  and invite/redeem UI is not available. P08 owns that invite/key-wrap/member-management flow; P19
  owns passkey credential storage. The clean normalized database/E2E coverage verifies that P06 did
  not delete their underlying identity, membership or encrypted-key state, without claiming those
  later UIs complete.

P05/HS-015 remains externally blocked under D-011. The CLI's inherited reconnect observation and the
frozen suite's P05-independent membership coverage do not alter that state. P06 depends on the
already passed P04 identity/RLS foundation, preserves its verified self-only and append-only rules,
and introduces no write to P05, P08 or P19 ownership.

## Cleanup, frozen sources and recommendation

The reviewer closed the CLI browser, stopped the dev server, moved only the generated CLI/E2E
artifact directories to desktop trash, restored build-generated `next-env.d.ts`, and confirmed no
Playwright/Next process remains. The final index is empty; no package, lockfile, dependency,
configuration, prior artifact or scratch path was changed by review.

Frozen source identities remain exact:

- rolling `specs/human-scratch.md` SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, 350 lines and 24,243 bytes;
- immutable FS-001 SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines and 25,441 bytes; and
- immutable `SCOPE.json` SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines and 27,382 bytes.

The exact `BASE..HEAD` implementation and frozen evidence satisfy P06/HS-010. Root may record this
independent PASS, integrate the reviewed range and authorize only the exact HS-010 completion marker
under PROCESS. No other marker or package-state change follows from this review.

# P04 Implementation Evidence — Revision 01

## Contract and pre-mutation boundary

- Package/scope: `P04` / `HS-014`, revision `01`.
- Literal original BASE and pre-implementation HEAD: `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`.
- Sole worker artifact: `specs/007-human-scratch-completion/evidence/P04/implementation-01.md`.
- At dispatch, the only dirty paths were root-owned unstaged `HANDOFF.md` and `PROGRESS.md`; the
  index and untracked set were empty.
- This ADR and inventory were written before any product, migration, configuration, generated type
  or test mutation. Subsequent sections will keep the pre-mutation facts distinct from implemented
  and validated results.

This implementer does not mark PASS. Independent review owns the acceptance recommendation, and root
alone owns package/requirement state and the scratch marker.

## Pre-mutation threat model, data flow, retention and rollback ADR

### Assets, principals and trust boundaries

The protected assets are seed-derived Ed25519 signing keys, X25519 encryption keys, wrapped vault
keys, encrypted Loro operations and snapshots, invite capability secrets, financial plaintext,
membership/role metadata, public-key hashes and audit history. The relevant principals are:

| Principal                    | Intended authority                                                                              | Pre-mutation trust consequence                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| owner                        | Read/write encrypted vault state; manage invites/members; delete access to a vault              | Every owner-only service-role operation must re-check an active owner row scoped to the exact vault.                |
| member                       | Read/write encrypted vault state; leave; view members                                           | A member must never manage other members, invites or vault lifecycle.                                               |
| outsider                     | No vault, membership, invite or sync visibility                                                 | Existence and error behavior must not distinguish another vault from an absent one.                                 |
| invite capability holder     | Read one unexpired invite envelope and redeem it once                                           | Knowledge of a database row or public lookup key alone must not become general vault authority.                     |
| browser anon Supabase client | Realtime transport only; no trusted identity                                                    | The anon key and arbitrary request headers are public attacker inputs and cannot select a hash.                     |
| tRPC server                  | Verifies Ed25519 request proof, derives the hash, validates input and authorizes each operation | This is the production authorization boundary because its Supabase client uses `service_role`.                      |
| Supabase `service_role`      | Database transport with RLS bypass                                                              | RLS cannot compensate for an omitted router check; grants/functions still minimize accidental exposure.             |
| database owner/operator      | Emergency migration/repair authority                                                            | May bypass application controls, but migrations preserve permanent encrypted operations and make rollback explicit. |

Attacks in scope are a forged or client-selected public-key hash; signature substitution; stale or
concurrent replay; method/path/body substitution; GET query mutation; direct anon table/RPC access;
service-role confused deputy access; cross-vault read/write/delete; member-to-owner escalation;
invite enumeration, reuse or race redemption; operation deletion or overwrite; snapshot poisoning;
legacy-table divergence; public-key/hash/secret/plaintext leakage in URLs, logs, database columns or
browser flashes; and downgrade/rolling-deploy behavior during migration.

TLS protects request headers and bodies only in transit. It does not make a claimed hash trusted,
repair a signature that does not bind the request, or constrain `service_role`. Production browser
tRPC is same-origin HTTPS and production Supabase URLs must be HTTPS. Plain HTTP is acceptable only
for explicit loopback local development. Invite secrets remain URL fragments, which browsers do not
send to the server; public keys, hashes, encrypted payloads and vault IDs must remain out of query
strings when they are authentication or sensitive metadata.

### Complete pre-mutation data flow

1. The browser keeps the seed-derived secret signing key in the in-memory/session identity layer.
   `signRequest()` decodes it, hashes a JSON body, and signs `method + path + timestamp + bodyHash`.
   It sends `X-Pubkey`, `X-Timestamp` and `X-Signature`. There is no nonce, durable replay claim or
   secret-key zeroization in this path.
2. `httpBatchLink` signs the generic path `/api/trpc`. POST mutations bind a simplified operation
   list; GET queries deliberately pass no signed body even though tRPC places operation names and
   inputs in the URL. Consequently GET procedure/input selection is not cryptographically bound and
   a public-key hash used by `user.exists` is URL metadata.
3. The Next route reconstructs the simplified POST body, creates context, and the protected tRPC
   middleware verifies freshness/signature. Only after verification does `verifyRequest()` derive
   BLAKE2b-256 hex from the verified Ed25519 public key. That derivation is correct, but timestamp
   freshness alone permits replay throughout the five-minute window.
4. Protected routers receive the derived hash. Public user operations instead accept a client hash;
   public invite lookup accepts an invite public key. The server Supabase singleton uses the
   service-role key and therefore bypasses RLS. Most procedures perform a membership query before a
   second data query/mutation; correctness is entirely in those router checks and their exact vault
   filters.
5. The browser Supabase client uses the public anon key. It neither installs a verified identity nor
   sets the migration's `request.pubkey_hash`; therefore member policies cannot authenticate it.
   Realtime subscribes to legacy `vault_updates`, while the current sync manager reads/writes
   `vault_ops` through tRPC. Presence uses Realtime broadcast/presence rather than table rows.
6. Encrypted Loro operations are inserted into `vault_ops`; snapshots are uploaded to
   `vault_snapshots`; deprecated router procedures still write/read `vault_updates`. Both operation
   tables are published, creating two nominal persistence/realtime sources. `user_data` contains an
   encrypted opaque blob. Memberships contain wrapped keys and X25519 public keys. Invites contain a
   wrapped key and ephemeral public lookup key. Version vectors and lifecycle metadata are
   intentionally plaintext; financial content is not.

### Complete pre-mutation SQL inventory

The sole migration is `005_vault_ops.sql`, an 855-line schema dump. It installs six extensions and
creates seven public tables:

| Table               | Retained data and constraints                                                            | Pre-mutation access/security finding                                                                                                                    | ADR disposition                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_data`         | PK `pubkey_hash`; encrypted blob; update time                                            | Own-row policy trusts unsafe request setting; `ALL` granted to anon/authenticated/service. Public user router can select/create by a claimed hash.      | Retain pending P06 removal, revoke direct roles, retain service-only access, and record excluded-router remediation.                                 |
| `vaults`            | UUID PK and creation time                                                                | Insert requires only a non-null unsafe setting; owner delete cascades permanent ops.                                                                    | Add soft deletion, prevent hard service deletion, retain as metadata root.                                                                           |
| `vault_memberships` | UUID PK; unique `(vault_id,pubkey_hash)`; wrapped key, role, X25519 key; cascading FK    | Owner-insert bootstrap uses self-equality `vault_id = vault_id`, so any empty membership table permits unrelated insertion; all-table grants are broad. | Correct to deny direct API access; service routers derive caller and check exact vault/role. Membership rows remain the authorization index.         |
| `vault_invites`     | UUID PK; unique invite public key; role check; wrapped key; creator/expiry; cascading FK | SELECT and DELETE policies are unconditional `true`; anon/authenticated receive `ALL`. Any caller can enumerate or delete every invite directly.        | Revoke direct access, remove public policies, keep service-mediated capability lookup and owner lifecycle.                                           |
| `vault_ops`         | UUID PK; encrypted update, plaintext vector, author hash/time; cascading FK              | Intended permanent source but delete remains possible through cascade/grants; duplicate vault indexes; member policy depends on unset/unsafe setting.   | Make the sole writable permanent operation source; forbid update/delete, remove destructive cascade, keep only publication needed by P05.            |
| `vault_snapshots`   | UUID PK; unique vault; encrypted snapshot, vector and legacy version/HLC fields          | Cache table is described correctly, but multiple insert/upsert fallbacks are inconsistent and member DELETE is granted.                                 | Keep one replaceable cache row per vault; service-only select/insert/update; no source-of-truth semantics.                                           |
| `vault_updates`     | UUID PK; encrypted legacy update, base version/HLC/author/time; cascading FK             | Deprecated router still writes it and Realtime still publishes it, so it duplicates permanent ops. Member DELETE policy permits audit loss.             | Copy every row into permanent ops, quarantine original rows read-only, and provide a non-storing compatibility path only where rollback requires it. |

Five public functions exist:

- `cleanup_expired_invites()` deletes expired invites as invoker and is executable with `ALL` by
  anon/authenticated/service;
- `current_pubkey_hash()` trusts arbitrary request configuration `request.pubkey_hash`;
- `is_vault_member(vault)` and `is_vault_owner(vault)` are security-definer predicates built on that
  setting;
- `get_ops_stats_since_snapshot(vault)` is security definer, lacks caller authorization and is
  executable by anon/authenticated/service.

There are no user-defined triggers. The policies are:

1. unconditional invite SELECT and DELETE;
2. member SELECT/INSERT for ops;
3. member SELECT/INSERT/DELETE for snapshots;
4. member SELECT/INSERT/DELETE for legacy updates;
5. membership SELECT for members, DELETE for self or owner, and INSERT for owner/bootstrap with the
   self-equality defect;
6. invite INSERT for owner;
7. vault SELECT for member, INSERT for any non-null unsafe hash and DELETE for owner; and
8. user-data own-row USING/WITH CHECK through the unsafe hash.

All seven tables have RLS enabled but not forced. `anon`, `authenticated`, and `service_role` have
schema usage plus `ALL` on every table and function; postgres default privileges also grant all
future tables/functions/sequences to all three roles. Those grants make policy correctness the only
direct-API defense and make each security-definer function independently dangerous.

Explicit indexes are invite expiry; ops `(vault_id,created_at)`; redundant ops `vault_id`; snapshot
`(vault_id,updated_at DESC)` despite the unique vault constraint; and legacy updates
`(vault_id,created_at)`. PK/unique backing indexes exist for every PK, invite public key, membership
`(vault_id,pubkey_hash)`, and snapshot vault ID. Foreign keys from invites, memberships, ops,
snapshots and legacy updates all use `ON DELETE CASCADE` to vaults. There are no custom enum types
and no migration-owned scheduled jobs.

`supabase_realtime` publishes both `vault_ops` and `vault_updates`. No snapshots, invites,
memberships, vaults or user data are published. Publishing both operation stores contradicts a
single permanent source and exposes an unauthenticated-subscription design for P05 to replace.

### Complete pre-mutation router-operation inventory

All 28 operations use a service-role client unless noted:

| Router     | Operation                      | Auth and authorization before mutation                             | Finding/disposition                                                                                      |
| ---------- | ------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| user       | `exists` query                 | public; selects by input hash                                      | Client-selected identity and URL hash; excluded path requires revision proposal.                         |
| user       | `register` mutation            | public; selects/inserts input hash                                 | Client can squat any hash; excluded path requires verified derivation.                                   |
| user       | `getOrCreate` mutation         | public; reads/creates input hash and returns encrypted blob        | Critical cross-user disclosure by claimed hash; excluded path requires verified derivation.              |
| user       | `getData` query                | protected; exact derived hash                                      | Correct identity selection after middleware hardening.                                                   |
| user       | `upsertData` mutation          | protected; exact derived hash                                      | Correct identity selection after middleware hardening.                                                   |
| user       | `myVaults` query               | protected; exact derived hash                                      | Correct identity selection after middleware hardening.                                                   |
| vault      | `list` query                   | protected; memberships filtered by caller hash                     | Keep, sanitize database failures.                                                                        |
| vault      | `create` mutation              | protected; caller becomes owner                                    | Make create/membership atomic or rollback-safe.                                                          |
| vault      | `get` query                    | protected; exact vault and caller membership                       | Keep non-enumerating NOT_FOUND.                                                                          |
| vault      | `members` query                | protected member check, then exact-vault list                      | Keep; member visibility is required for collaboration/rekey.                                             |
| vault      | `delete` mutation              | protected exact-vault owner check, hard DELETE                     | Replace destructive cascade with soft lifecycle preserving ops.                                          |
| vault      | `leave` mutation               | protected exact-vault self membership; owner forbidden             | Keep exact self-delete.                                                                                  |
| membership | `list` query                   | protected exact-vault member check                                 | Keep.                                                                                                    |
| membership | `remove` mutation              | protected exact-vault owner; target scoped to vault                | Keep least privilege; return only same-vault remaining encryption keys.                                  |
| membership | `rekey` mutation               | protected exact-vault owner; per-key updates scoped to vault/hash  | Validate exact membership targets and make the multi-row update transaction-safe.                        |
| invite     | `create` mutation              | protected exact-vault owner                                        | Keep; role and envelope remain validated.                                                                |
| invite     | `getByPubkey` query            | public capability lookup                                           | Direct DB enumeration must close; return uniform invalid/expired behavior and no plaintext/secret.       |
| invite     | `accept` mutation              | protected identity; invite selected by public lookup key           | Make single-use redemption atomic and close race/replay; membership identity comes only from context.    |
| invite     | `list` query                   | protected exact-vault owner                                        | Keep.                                                                                                    |
| invite     | `revoke` mutation              | protected; reads invite before owner check                         | Collapse outsider/not-found behavior and perform owner-scoped deletion.                                  |
| sync       | `getSnapshot` query            | protected exact-vault member                                       | Keep; snapshot is cache only.                                                                            |
| sync       | `getUpdates` query             | protected exact-vault member                                       | Remove silent empty fallback; read only permanent ops.                                                   |
| sync       | `pushOps` mutation             | protected exact-vault member; author overwritten with context hash | Keep idempotent insert but reject conflicting IDs rather than silently accepting cross-vault collisions. |
| sync       | `pushSnapshot` mutation        | protected exact-vault member                                       | Use one direct upsert and preserve operations independently.                                             |
| sync       | `getSyncStatus` query          | protected exact-vault member                                       | Count permanent ops only; remove swallowed schema errors/legacy duplication.                             |
| sync       | `saveSnapshot` legacy mutation | protected exact-vault member                                       | Translate to the same one-row snapshot cache for rolling-client compatibility.                           |
| sync       | `pushUpdate` legacy mutation   | protected exact-vault member                                       | Translate into permanent `vault_ops`; never create new legacy-table rows.                                |
| sync       | `status` legacy query          | protected exact-vault member                                       | Derive compatibility status from permanent ops and the snapshot cache.                                   |

### Selected architecture and invariants

1. **Verified identity and replay:** extend signed requests with a 256-bit random nonce, bind it
   into the Ed25519 message, validate exact public-key/signature/nonce sizes and timestamp syntax,
   derive the BLAKE2b hash only after signature verification, zero signing-key buffers, and
   atomically claim `(derived_hash,nonce)` in Postgres. A unique conflict rejects replay across
   tabs, processes and instances. Expired claims are cleanup data, never identity authority. No hash
   header exists.
2. **Request binding:** POST operation lists stay canonicalized and signed. GET signing currently
   omits operation/input and therefore cannot satisfy full message binding without the excluded tRPC
   client path. The safe target is POST-only tRPC transport or canonical URL-query binding, with the
   server verifying the identical canonical representation. This is not silently approximated.
3. **TLS and leakage:** reject non-HTTPS production Supabase endpoints and inbound API requests;
   allow only loopback HTTP in development. Authentication material remains headers, mutations stay
   in bodies, errors/logs are sanitized, and no financial plaintext, key or invite secret enters the
   database. Version vectors and opaque identifiers remain the documented minimum metadata.
4. **Database boundary:** direct `anon`/`authenticated` table/function access becomes deny-by-grant
   and deny-by-RLS. Unsafe request-setting functions and policies are removed. `service_role`
   receives only operation-specific grants and still bypasses RLS, so every router operation must
   scope its membership/role query to both the derived hash and exact vault. RLS tests prove direct
   callers cannot spoof owner/member/hash state; router tests prove service-role checks.
5. **Operation retention:** `vault_ops` is append-only and permanent. Service-role UPDATE/DELETE is
   revoked, a trigger prevents accidental update/delete, and its vault FK cannot cascade. Vault
   deletion is a soft access-lifecycle event, not encrypted audit erasure. Operator repair remains
   an explicit privileged rollback route.
6. **Snapshot model:** `vault_snapshots` is one replaceable encrypted cache row per vault. It may be
   overwritten by an authorized member and may be rebuilt entirely from permanent operations. No
   snapshot operation deletes or compacts ops.
7. **Legacy migration:** copy every legacy row into ops with deterministic provenance before
   quarantining the original table read-only. Deprecated server procedures write/read the permanent
   model. A compatibility view/trigger may preserve rolling old-server inserts without storing a
   second copy; it receives no anon grants or Realtime publication. Counts, IDs, ciphertext, author
   and timestamps are checked in the upgrade fixture.
8. **Invites and membership:** invite lookup is service-mediated, owner create/list/revoke stays
   vault-scoped, redemption is atomic/single-use, and only the verified caller hash becomes a
   member. Members can read/write encrypted collaboration state and leave; only owners manage
   access.
9. **Errors and existence:** outsider and absent-vault paths converge on sanitized NOT_FOUND for
   reads and authorization mutations. Database messages, request contents and hashes are not logged.
   Expected forbidden/replay failures are stable typed errors and never expose another vault's data.

### Table-retention decision

| Object              | Source/cache/audit classification               | Retention and deletion rule                                                                                          |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `vault_ops`         | sole permanent encrypted operation/audit source | Forever; insert-only; no member, service or vault cascade deletion.                                                  |
| legacy rows         | migration evidence only                         | Copied losslessly, then retained in a revoked quarantine table through rollback window; no new authoritative writes. |
| `vault_snapshots`   | rebuildable performance cache                   | At most one current row per vault; replaceable; never used to justify op deletion.                                   |
| `vault_memberships` | current authorization/key-wrapping index        | Retain while access is active; removal is permitted and requires client rekey flow.                                  |
| `vault_invites`     | short-lived single-use capability envelope      | Delete on redemption/revocation/expiry; never public-table readable.                                                 |
| `vaults`            | opaque lifecycle root                           | Soft-delete access while preserving permanent ops; no service hard delete.                                           |
| `user_data`         | legacy encrypted per-user blob                  | Retain service-only until P06 removes/migrates it; no P04 destructive change.                                        |
| replay nonces       | short-lived authentication anti-replay state    | Retain beyond accepted clock window, then cleanup; contains derived hash/nonce/times only.                           |

### Migration, existing-client and rollback decision

The migration is additive/transforming and transaction-safe: create anti-replay state/functions; add
lifecycle/provenance columns; copy legacy encrypted rows; verify the copy before quarantine; replace
unsafe policies/grants/functions; change operation FK/immutability; publish only permanent ops; and
regenerate types. Fresh installs run 005 then the hardening migration. Upgrade fixtures seed owners,
members, outsiders, invites, snapshots, permanent ops and colliding/multiple legacy rows before
applying it, then prove exact retention and authorization.

Rollback never deletes `vault_ops`, the quarantine, membership, invite or snapshot data. Application
rollback can restore compatibility procedures/view grants for service only and disable the
immutability trigger under database-owner authority; it must not re-enable unconditional invite
policies, unsafe client-selected hash settings, broad anon grants or a second authoritative write
store. Schema rollback keeps new columns/tables inert because dropping provenance or nonce history
would add risk without restoring compatibility. An old client/server may use the compatibility shape
during a rolling deploy, but new writes still land in ops. If a migration assertion fails, the
transaction aborts before rename/policy/grant changes.

### Required authority proposal for excluded paths

#### Q-PROPOSAL-P04-01-01 — Complete the verified request and public-user boundary

- Raised by/package/revision: implementer / P04 / 01.
- Context and evidence: the active handoff allows signing middleware, request-boundary code and four
  routers, but excludes `src/lib/trpc/client.ts`, `src/server/routers/user.ts` and its schema. The
  client signs no GET operation/input; tRPC places query inputs in URLs. Public `user.exists`,
  `register` and especially `getOrCreate` select/read/create service-role data using a
  client-claimed hash. These directly contradict the frozen consistent verified-hash/no-URL
  invariant.
- Why existing authority does not decide it: the frozen requirement decisively requires the fixes,
  while the revision-01 writable-path contract decisively prohibits the necessary files. No change
  confined to middleware can cryptographically bind data the client did not sign or remove claimed
  hashes from excluded router inputs without breaking the client contract.
- Options considered: silently edit excluded files; leave the vulnerabilities undocumented; reject
  every GET/public onboarding request; approximate identity with a trusted header; or authorize an
  exact later revision covering the client transport and user router/schema/tests.
- Reversible default selected to continue: harden every authorized path, preserve compatibility,
  document the residual acceptance gap, and request an exact P04 revision-02 path expansion rather
  than modify excluded files.
- Decision-hierarchy basis: frozen security requirement first; then least privilege, no secret/hash
  URL exposure and narrowest exact path expansion. A claimed header/hash is never an acceptable
  substitute.
- Impact and risk: until the follow-up is reviewed, a valid signed GET does not prove its query
  selection and public user operations can enumerate/squat/read another hash's encrypted blob. TLS
  reduces interception but does not make client selection authorization. P04 must not be marked PASS
  with that gap.
- Reversal or migration path: switch tRPC to canonical signed POST transport and make user creation/
  fetch derive identity from verified public-key proof; retain temporary compatibility only if it
  returns no existing encrypted data and cannot claim another hash.
- Human review still useful after completion: no preference decision is needed; review should verify
  the exact path grant and decide whether root dispatches revision 02 immediately or folds the same
  mandatory fix into the next authorized security range before P04 acceptance.

## Mutation and validation ledger

No product mutation had occurred when the ADR above was completed. The following ledger records the
subsequent implementation and validation. It is evidence for independent review, not a PASS claim.

### Implemented acceptance mapping

- Added `006_rls_hardening.sql`, which atomically removes the unsafe request-setting authorization
  functions and every old policy; revokes the broad table/function/sequence/default grants; gives
  `service_role` an explicit operation-specific grant set; and installs restrictive deny policies
  for direct `anon` and `authenticated` access. The server remains the real authorization boundary.
- Added exact-vault, exact-caller, security-definer RPCs for vault creation/soft deletion, invite
  redemption, complete membership rekey and append-only operation batches. All pin `search_path`,
  revoke public execution and are granted only to `service_role`. Routers now call these atomic
  operations and translate database failures to non-enumerating application errors.
- Added durable replay claims keyed by `(verified_pubkey_hash, nonce)`. Request proofs now bind
  method, path, timestamp, 32-byte random nonce and body hash; validate strict timestamp/key/
  signature/nonce shapes; derive the BLAKE2b hash only after Ed25519 verification; and clear decoded
  secret-key and nonce buffers. The tRPC middleware atomically rejects a replay after proof
  verification.
- Added a shared Supabase URL validator. Non-production loopback HTTP remains available for local
  Supabase; every other URL must be HTTPS. The production API route also rejects non-HTTPS inbound
  requests.
- Made `vault_ops` the only permanent operation source and the only published operation relation. It
  is insert-only by grants and trigger, and its vault FK no longer cascades. Vault deletion is now
  soft deletion that removes access/invites while retaining permanent encrypted operations.
  Snapshots remain one replaceable cache row and never compact or delete operations.
- Migrated every legacy update into `vault_ops` with deterministic provenance, including a safe
  alternate namespace for a deliberately colliding deterministic ID. The legacy table is retained
  read-only as `vault_updates_legacy`; a security-invoker compatibility view and insert trigger
  route rolling-server writes into the one operation source without another publication or storage
  path.
- Removed sync fallbacks, swallowed schema errors and duplicate-source reads. Current and deprecated
  procedures all map to `vault_ops` plus the snapshot cache. Operation IDs that already exist with
  different vault/author/ciphertext/vector content are rejected rather than accepted as idempotent.
- Tightened the assigned invite, membership, sync and vault schemas with encrypted-data, key,
  vector, operation-count, hash and unique-complete-rekey bounds. Regenerated local Supabase types
  and updated typed Realtime compatibility use.
- Added pgTAP direct-role/RLS/grant/function/publication/retention audits, a populated upgrade
  fixture and upgrade audit, request-auth/replay unit coverage, TLS URL tests, and updated signing
  and invite-schema tests.

The implementation cannot complete two frozen acceptance points within revision-01 authority:
authenticated GET operation/input binding and public user identity derivation. The exact proposal
above routes those files for revision 02. The current browser also has no real invitation/key-wrap
journey; that pre-existing product gap belongs to P08 and prevents a genuine member redemption
manual case here. Neither gap is represented as completed.

### Exact committed product/test range

- BASE: `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`.
- HEAD: `20a489dc51542ee0c681cfba0a33aee820d70221`.
- Range: non-empty
  `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..20a489dc51542ee0c681cfba0a33aee820d70221`.
- Commit: `20a489dc51542ee0c681cfba0a33aee820d70221` — `fix: harden vault database access`.
- Commit summary: 25 files, 1,439 insertions, 368 deletions.

Committed paths are exactly:

```text
src/app/api/trpc/[trpc]/route.ts
src/lib/crypto/signing.ts
src/lib/supabase/client.ts
src/lib/supabase/database.types.ts
src/lib/supabase/realtime.ts
src/lib/supabase/server.ts
src/lib/supabase/types.ts
src/lib/supabase/url.ts
src/server/routers/invite.ts
src/server/routers/membership.ts
src/server/routers/sync.ts
src/server/routers/vault.ts
src/server/schemas/invite.ts
src/server/schemas/membership.ts
src/server/schemas/sync.ts
src/server/schemas/vault.ts
src/server/trpc.ts
supabase/migrations/006_rls_hardening.sql
tests/database/legacy-upgrade-audit.sql
tests/database/legacy-upgrade-fixture.sql
tests/database/rls-audit.sql
tests/integration/invite.test.ts
tests/unit/crypto/signing.test.ts
tests/unit/server/trpc-auth.test.ts
tests/unit/supabase-url.test.ts
```

### Migration and database verification

The environment used Supabase CLI `2.109.1`, Docker `29.6.2` and local PostgreSQL 17. The local
Supabase stack was already running at dispatch, so it was left running; the database was returned to
a clean latest-schema state after the upgrade exercise.

- Fresh: `corepack pnpm exec supabase db reset --no-seed` applied 005 then 006 repeatedly without
  error. `psql ... -f tests/database/rls-audit.sql` reported all **49/49** pgTAP assertions passing.
- Upgrade:
  `corepack pnpm exec supabase db reset --version 005 --sql-paths ../tests/database/legacy-upgrade-fixture.sql`,
  followed by migration-up and `legacy-upgrade-audit.sql`, reported all **14/14** assertions
  passing. The fixture contains owner, member and outsider identities; active/expired invites;
  memberships; a snapshot; permanent ops; multiple legacy updates; and a deliberate deterministic
  migrated-ID collision.
- The upgrade assertions prove exact legacy row count and preservation of ciphertext, author, base
  version, HLC, snapshot, membership and pre-existing permanent-operation data. Reapplying current
  migration state is a no-op. A final fresh reset restored the clean latest schema.
- An initial audit invocation exposed a pgTAP collation-sensitive array comparison; the assertion
  was made order-explicit and the full fresh and upgrade sequences were rerun from reset. No product
  behavior or migration was relaxed.
- `corepack pnpm exec supabase gen types typescript --local` regenerated `database.types.ts`;
  TypeScript validation of the result passed.

### Automated verification

| Command/scope                                                                                                | Result                                                            |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Focused Vitest: signing, tRPC auth, TLS URL, invite integration/schema, membership/sync/vault schema         | 8 files, **111/111 passed**                                       |
| Focused crypto/auth/TLS repeat                                                                               | **25/25 passed**                                                  |
| `corepack pnpm test`                                                                                         | 44 files, **1,153/1,153 passed**                                  |
| `corepack pnpm lint`                                                                                         | exit 0; same 13 pre-existing warnings, no errors                  |
| `corepack pnpm typecheck`                                                                                    | exit 0                                                            |
| `corepack pnpm build`                                                                                        | exit 0; compiled in 5.2 s, TypeScript in 8.1 s, 17 routes         |
| `corepack pnpm exec playwright test --reporter=list --retries=0` against explicit `corepack pnpm dev` server | **79/79 passed**, retries 0, about 1.2 minutes                    |
| `git diff --check` and exact changed TS/TSX/Markdown `oxfmt --check`                                         | passed                                                            |
| Repository-wide `corepack pnpm format:check`                                                                 | **RED only on frozen `specs/human-scratch.md`**, classified below |

Two expected test-maintenance failures occurred before the green focused run: an old dummy hash no
longer met the exact 64-hex schema, and an empty rekey set no longer met the complete-rekey
contract. The fixtures were corrected to exercise the intended valid cases; the stricter production
rules were retained. The configured E2E web-server startup also exited before collection,
reproducing the already routed P03 infrastructure behavior. Starting the repository dev command
explicitly reached ready state in 246 ms, after which the full retries-disabled E2E suite passed.
The generated `next-env.d.ts` was restored byte-for-byte after build.

The repository-wide format command wants to reindent an HS-018 continuation line solely because its
root-authorized `[x]` marker changes the Markdown parse shape. That file is frozen scope and was not
edited. Its whole-file SHA remains
`db97178a044343f9a99aba1596590986c4324586ec5a64f8426590da95833aeb`; the canonical feature spec
remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and
25,441 bytes. Root confirmed this is routed to R-024 and P20B/P21 for a formatter
configuration/exclusion solution that preserves frozen source semantics. All P04 product/test and
this evidence path are formatter-clean.

### Playwright CLI charter

Manual validation used repository-installed headless `@playwright/cli` `0.1.17` with isolated
`p04-owner`, `p04-matrix` and `p04-outsider` sessions and the real development app.

- A new owner identity was created through the UI; only the 12-word count was returned by browser
  observation, never the words. Identity, settings and People navigation produced five inspected
  fetches: no pubkey hash in URLs, no fragment transmission, no suspicious financial plaintext and
  no authenticated request missing `X-Nonce`.
- The People page exposed the owner badge and saved state with only `Me`. It exposed no invite-link
  control because the page currently hardcodes a non-owner state despite the badge. Therefore no
  fake invitation/redemption result was recorded; this is the concrete P08/P21 UI/key-exchange gap.
- Using the normal textbox interaction, `P04 Offline Member Metadata` was added while the browser
  was offline, remained visible offline, then survived reconnect and reload. Three post-reconnect
  requests again contained no hash, fragment, suspicious plaintext or authenticated request without
  a nonce. The final console had nine entries and **0 errors / 0 warnings**.
- A duplicate tab displayed the persisted data. The first observer attached to the wrong one of two
  pages and returned false; selecting the intended duplicate verified the value and the duplicate
  was closed. This diagnostic observer mistake was not counted as a product result.
- A separately created outsider identity had its own vault and saw **0** occurrences of the owner's
  unique marker. A synthetic invalid-invite URL showed the invalid-invite state with no transaction
  data flash and **0 console errors / 0 warnings**. Its fragment was locally generated
  non-capability data; no real secret or invite was used or retained.
- An early owner session crashed because an observer callback incorrectly treated asynchronous
  request headers as synchronous. A fresh isolated session was used; this was CLI diagnostic error,
  not application behavior.
- Development-server request logs exposed exact vault UUIDs, version vectors and `hasUnpushed` in
  tRPC GET URLs. Values are deliberately omitted here. This directly confirms the unresolved signed-
  GET/no-sensitive-URL gap in Q-PROPOSAL-P04-01-01 despite the sampled onboarding URLs being clean.

All three sessions were closed, CLI stored data was deleted, and generated console/page snapshot
files for the P04 sessions were removed. A final CLI directory scan found no later P04 artifact and
the CLI browser list was empty.

### Final dirty-path, preservation and risk record

After the product/test commit, the only dirty paths are:

```text
specs/007-human-scratch-completion/HANDOFF.md       # root-owned, pre-existing
specs/007-human-scratch-completion/PROGRESS.md      # root-owned, pre-existing
specs/007-human-scratch-completion/evidence/P04/implementation-01.md  # assigned, uncommitted
```

No root ledger, task, review, scratch, feature spec, agent configuration, package manifest or lock
file was staged or committed. No unrelated/user-owned diff was modified. The evidence file remains
uncommitted for independent review as required.

Material residual findings for the reviewer/root are:

1. Q-PROPOSAL-P04-01-01 is mandatory before P04 can satisfy consistent verified-hash and URL/
   request-binding acceptance. It needs the excluded tRPC client and user router/schema/test paths.
2. A real owner-to-member invite/redeem/key-wrap journey is absent in current UI and must be
   completed and independently exercised under P08 before the database boundary can receive that
   end-to-end proof.
3. P05 must replace the unauthenticated browser Realtime subscription design; 006 deliberately
   publishes only `vault_ops`, but direct table reads are now denied, so polling/server-mediated or
   authenticated channel design remains necessary.
4. Legacy quarantine is intentionally retained for rollback/data preservation. A future operator
   migration may remove it only after the rollback window and a separately reviewed retention
   decision; it must never delete the migrated permanent ops.

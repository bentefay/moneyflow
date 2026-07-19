# P05 Independent Review — Revision 03

## Verdict

**FAIL.** Revision 03 correctly fixes the database findings carried from revision 02. The forward
migration preserves concurrent sibling grants, rotates only an explicitly presented predecessor,
prunes only stale exact-scope history, and separates the extra Broadcast read check required by the
installed private Presence join from Presence send authority. Independent fresh and seeded-upgrade
audits pass 87/87 and 27/27, and the ordinary browser run no longer reports a private Presence
authorization failure.

HS-015 live delivery is nevertheless still red: the ordinary isolated two-context test sends a real
Postgres Changes join and binding but fails its first subscription assertion with zero
`realtime.subscription` rows. The new decisive evidence locates this failure in incompatible local
Supabase Realtime service state, not `src/lib/supabase/realtime.ts`: the running v2.80.7 image
reports 68 cached internal migrations while the persistent database has 79, and its three-field
filter encoder is incompatible with the database's newer four-field `realtime.user_defined_filter`
shape. Changing sync to `private: false` follows the same server Postgres-CDC path and cannot repair
that version skew. I therefore reject implementer `Q-PROPOSAL-P05-03-01` and do not authorize either
of its proposed product/unit paths.

The narrow revision-04 route is local-service recreation plus a diagnostic-only correction in
`tests/e2e/helpers/realtime.ts`; it has no product, configuration, dependency, migration or
unit-test authority. Root remains the sole question, ledger, integration and scratch-marker
authority. No HS-015 marker is authorized by this review.

## Immutable review boundary

- Package/revision: `P05/03`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..ec7dcf8b29ce93f46f73a904e7420ddf49317b11`.
- Revision-03 product/test commit: `ec7dcf8b29ce93f46f73a904e7420ddf49317b11`
  (`fix: support concurrent realtime grants`). Its exact parent is
  `f543c4b7a4f445c2e5d11a7f3f077a8929074335`.
- Revision 03 changes exactly the five authorized paths below, with 556 insertions and 20 deletions.
  The other four authorized paths are unchanged in this revision.

```text
supabase/migrations/008_realtime_authorization_lifecycle.sql
tests/database/legacy-upgrade-audit.sql
tests/database/rls-audit.sql
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
```

- Frozen revision-03 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-03.md`, independently verified
  SHA-256 `02ecbb1b2ca227bfbd88804aad47a3a4f240d1ccd54f2210769b5e7cc9815a17`, 233 lines and 14,648
  bytes.
- Prior immutable revision-02 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-02.md`, independently verified SHA-256
  `1bce7bce9d94b628d2068cb06edb2248f5c849f40c05afabb87af9cd70f810dd`, 291 lines and 19,389 bytes.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review file, Git-visible
  dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen untracked
  revision-03 evidence. Reviewer-generated `next-env.d.ts` and ignored Playwright result changes
  were removed.

## Findings

### F-001 — Critical — live Postgres Changes is red because the local Realtime image and persistent internal schema are incompatible

The required ordinary command was run from a fresh latest application schema with retries disabled
and the parent signing secret deliberately absent:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list --retries=0
```

It collected one test and failed 0/1 in 6.2 seconds at the initial lifecycle step. The browser had
already emitted at least one Postgres-change join and at least one binding, but
`tests/e2e/realtime-security.spec.ts:98-102` observed subscription total/authenticated/live-grant
counts of exactly 0/0/0. No incoming frame or permanent operation existed because the test stopped
before import. Post-cleanup database aggregates were sanitized and exactly:

| Aggregate                      | Total | Live | Revoked | Expired |
| ------------------------------ | ----: | ---: | ------: | ------: |
| sync grants                    |     4 |    4 |       0 |       0 |
| Presence grants                |     8 |    4 |       4 |       0 |
| permanent-op subscriptions     |     0 |    — |       — |       — |
| permanent encrypted operations |     0 |    — |       — |       — |

Unlike revision 02, neither browser console nor Realtime server logs contained a private Presence
`Unauthorized` error. This independently confirms the migration's Presence correction while
retaining the live-delivery counterexample.

The counterexample's owner is now narrower than the implementation evidence claimed:

1. The exact local components are pinned Supabase CLI 2.109.1, installed `@supabase/realtime-js`
   2.110.7, and running image `public.ecr.aws/supabase/realtime:v2.80.7`.
2. Realtime logs explicitly report `MigrationCountMismatch: cached=68 database=79`. Direct database
   inspection confirms 79 rows in `realtime.schema_migrations`. An ordinary `supabase db reset`
   rebuilds the application schema but retains that internal schema in the same volume, so the
   mismatch survives resets.
3. The current internal composite has four active fields: `column_name`, `op`, `value`, and
   `negate`. The exact
   [v2.80.7 subscription source](https://github.com/supabase/realtime/blob/v2.80.7/lib/extensions/postgres_cdc_rls/subscriptions.ex)
   parses filters into three-element tuples and binds that tuple array to the database insert. A
   rollback-only direct insert using the database's four-field composite succeeds, excluding the
   application `vault_ops` publication, filter value, role privilege and grant RLS as the immediate
   insert failure.
4. The exact
   [v2.80.7 channel source](https://github.com/supabase/realtime/blob/v2.80.7/lib/realtime_web/channels/realtime_channel.ex)
   calls its Postgres-CDC subscription path for the parsed `postgres_changes` configuration
   regardless of `private`; the private branch only assigns Broadcast/Presence policies and topic
   routing. The installed JS client similarly includes the same Postgres binding in its join payload
   at `RealtimeChannel.ts:385-413` for either private value.
5. Current primary Supabase guidance likewise documents
   [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) for
   Broadcast/Presence through `realtime.messages`, while
   [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) uses the
   subscribed table's publication, privileges and RLS. This supports the transport distinction in
   the implementer's question, but it does not support the inference that toggling `private` selects
   a different Postgres registration implementation.

A reviewer-only protocol probe reached `SUBSCRIBED` with `private: false`, then received the
sanitized server system event `extension=postgres_changes`, `status=error`,
`ArgumentError: 1st argument out of range`, with zero subscription rows. That invocation used a
standalone Node process and therefore did not conform to PROCESS's allowed manual-browser mechanism;
it is disclosed here as corroboration only and is not acceptance evidence. The independently
reproducible installed source, server mismatch warning, database type shape, rollback-only SQL and
ordinary checked-in E2E establish the finding without relying on that probe.

The safe correction is to recreate the already-empty disposable local Supabase service volume so the
pinned image initializes its matching internal schema, then rerun the unchanged real journey. No
repository config change is currently justified. If a clean `supabase start` itself recreates the
mismatch, revision 04 must stop and propose an exact CLI/image pin update with
`package.json`/`pnpm-lock.yaml` authority; it must not silently change those paths or weaken RLS.

### F-002 — Medium — `liveExactGrant` is not an exact-current-scope diagnostic

`tests/e2e/helpers/realtime.ts:340-388` names its third count `liveExactGrant`, but its `EXISTS`
predicate checks only grant ID, vault ID, stored role, purpose and grant lifetime. It does not check
the JWT's exact `realtime_table`, exact `realtime_topic`, sync purpose, current matching membership
role, or a non-deleted vault. A stale member or wrong-topic/table claim could therefore be counted
as an exact live registration if a matching unrevoked grant row still existed.

This did not create the current zero result: an incomplete predicate cannot turn an existing row
count into zero, and the live journey also has no incoming event. It would, however, weaken the
positive acceptance claim after environment repair. Revision 04 should correct this one diagnostic
query without changing its aggregate-only output or retaining identifiers. This finding justifies
the sole diagnostic test-helper path in the next boundary; it does not justify a transport, unit,
config or migration edit.

## Migration and database adjudication

Migration 008 is a forward-only correction and leaves migration 007 untouched. Its authorization
behavior is appropriately narrow:

- `realtime_topic_allowed` permits sync Broadcast reads and the actual Presence join's
  Broadcast/Presence reads, while `realtime_topic_send_allowed` prevents a Presence credential from
  publishing Broadcast payloads.
- Both paths still delegate to the exact claim/grant/membership predicate, so topic, vault, purpose,
  table, role, revocation, expiry, deleted-vault and removed-member denial remain.
- `rotate_realtime_grant` locks the current exact membership, leaves initial sibling grants live,
  revokes only the exact supplied predecessor and rejects a missing/wrong/already-revoked
  predecessor. Its cleanup excludes that predecessor and deletes only expired or revoked rows older
  than five minutes in the exact identity/vault/purpose scope; active siblings cannot match.
- Fresh audit 87/87 independently passes, including concurrent initial grants, explicit independent
  rotation/revoke, extension separation, cross-scope substitutions, expiry, pruning, outsider and
  membership-removal denial.
- A seeded reset to migration 005, fixture load, upgrade through 006/007/008 and legacy audit passes
  27/27. The audit covers preserved encrypted data/publication plus the new concurrency, extension
  and pruning behavior. A final latest reset successfully applies 005–008.

No migration, policy or grant-lifecycle finding remains. P05 still cannot pass until the real
Postgres Changes stream is proven in a compatible service environment.

## Independent validation

| Check                                    | Independent result                              |
| ---------------------------------------- | ----------------------------------------------- |
| exact revision-03 commit/path inspection | 5 authorized paths; 556 insertions/20 deletions |
| complete unit/integration suite          | 47 files, 1,170/1,170 passed                    |
| typecheck                                | passed                                          |
| changed TypeScript E2E ESLint            | passed                                          |
| changed TypeScript E2E Oxfmt             | passed; SQL intentionally ignored by Oxfmt      |
| fresh reset through migration 008        | passed                                          |
| fresh `tests/database/rls-audit.sql`     | 87/87 passed                                    |
| seeded 005-to-008 upgrade audit          | 27/27 passed                                    |
| ordinary isolated Realtime E2E           | 0/1; outgoing binding present, subscriptions 0  |
| private Presence                         | clean; no Unauthorized/console failure          |
| `git diff --check BASE..HEAD`            | passed                                          |

The production build, full browser suite, repeated Realtime journey, expiry/offline/duplicate-tab
continuations and installed Playwright CLI charter were not run after the deterministic initial
subscription failure. They cannot make the observed zero-registration boundary pass, and manual UI
acceptance is not meaningful before import delivery begins. Revision 04 must run them after service
recreation. This is a failed-review limitation, not evidence for PASS.

## Q-PROPOSAL-P05-03-01 adjudication — rejected transport-mode correction

The proposed addition of `src/lib/supabase/realtime.ts` and `tests/unit/sync/realtime.test.ts` is
**rejected**. The primary documentation correctly distinguishes Broadcast/Presence authorization
from Postgres Changes table RLS, but exact installed server source shows that private and public
channels use the same Postgres-CDC registration path. The local public probe also reproduced the
same zero-row protocol error. Neither path owns the demonstrated internal schema/image mismatch, and
changing them would conceal rather than fix the acceptance environment.

## Q-PROPOSAL-P05-03-02 — recreate compatible local Realtime state and harden only exact registration evidence

- **Raised by/package/revision:** `human_scratch_reviewer`, P05, revision 03, 2026-07-20.
- **Context and evidence:** the ordinary real E2E emits Postgres Changes bindings but registers zero
  rows. The v2.80.7 service reports 68 cached versus 79 database migrations; its three-field filter
  tuple conflicts with the retained four-field internal database type and yields the sanitized
  out-of-range protocol failure. Presence and all application migrations/audits are now correct.
- **Why existing authority does not decide it:** P05 requires real live delivery but does not define
  repair of stale local Supabase internal volumes. Revision 03 did not authorize service recreation,
  dependency pins or the incomplete positive registration diagnostic.
- **Options considered:** (A) after verifying the local database is disposable and empty, recreate
  the pinned Supabase services without backup, harden only the aggregate subscription query, and
  rerun acceptance; (B) update the pinned Supabase CLI/image contract immediately; (C) toggle sync
  channel privacy; or (D) accept polling/zero registration. A is the narrow evidence-backed default.
  B lacks proof that a clean pinned environment is incompatible, C is disproved by installed source,
  and D violates HS-015.
- **Reversible default selected to continue:** choose **A**. Revision 04 has exactly one writable
  implementation/test path and no others:

```text
tests/e2e/helpers/realtime.ts
```

First verify the latest reset left local grants, subscriptions and permanent ops at zero. Then run
`pnpm exec supabase stop --no-backup` for this exact local project and `pnpm exec supabase start`;
do not target a broad Docker volume or unrelated service. Verify the resulting Realtime image,
`realtime.schema_migrations` count and active `user_defined_filter` shape agree and that no
`MigrationCountMismatch` occurs. Apply/reset migrations 005–008 normally. In the sole writable
helper, make `liveExactGrant` require exact sync/table/topic claims, a current exact membership and
role, and a non-deleted vault while returning only aggregate integers. Do not add token, claim,
identity, vault, topic, filter or payload output.

- **Decision-hierarchy basis:** HS-015 genuine live import/edit/delete delivery and immediate
  unauthorized-reader denial control, followed by least privilege, reproducible pinned tooling,
  preservation of encrypted data and the smallest evidence-backed correction. The current failure
  occurs below product channel construction.
- **Impact and risk:** `stop --no-backup` deletes local Supabase data, so it is permitted only after
  exact-project and empty/disposable-state checks; it must never target a shared or production
  project. The diagnostic query must remain test-only and sanitized. No config/dependency path is
  authorized because no clean-start incompatibility has yet been shown.
- **Reversal or migration path:** the helper-only commit is independently revertible and changes no
  application or stored data. Local service recreation is recovered by `supabase start` plus the
  normal project migrations. If clean start recreates the mismatch, stop and propose the exact
  `package.json`/`pnpm-lock.yaml` CLI-pin change; if any product failure remains after compatible
  registration, stop with its new counterexample and exact owner.
- **Human review still useful after completion:** no product choice blocks continuation. Optional
  human review is useful only if this local database is not disposable or if repository policy
  prefers upgrading the pinned CLI rather than recreating its stale volume.

Required revision-04 evidence is the compatible service/version/type boundary; fresh 87/87 and
seeded-upgrade 27/27 audits; ordinary and repeated retries-zero two-context live import/edit/delete;
registered subscriptions whose sanitized counts all match current exact grants; incoming member
event kinds before UI updates; concurrent/background tabs; credential expiry/reconnect/offline
catch-up; lock/unlock, vault switch and membership removal; final revocation/pruning bounds; socket
URL/log/artifact sanitation; full unit/lint/type/build/format/diff/E2E; and the installed headless
Playwright CLI owner/member/outsider charter. A real incoming frame may not be replaced by refresh
or polling.

## Frozen sources and cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. Its 21 ordered normalized blocks still match `SCOPE.json`; the checked set remains HS-002,
  HS-014, HS-017 and HS-018. HS-015 is unchecked.
- FS-001, `specs/008-transaction-percentage-allocations-settlement/spec.md`, remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  exactly 450 lines and 27,382 bytes.
- The database is finally reset to fresh migrations 005–008 with zero grants, subscriptions and
  permanent ops. The known internal 79-migration/four-field state remains intentionally visible for
  revision-04 service recreation. No sensitive token, signing key, identifier, topic, filter, frame
  payload or financial record was written to this review or retained in test artifacts.

## Exact next revision

Root should preserve revision-01/02/03 evidence and reviews as immutable, transcribe the rejected
proposal and corrected `Q-PROPOSAL-P05-03-02` under its sole authority, set P05/HS-015 to
`changes_requested`, and dispatch P05 revision 04 against the same original BASE. The only writable
test path is `tests/e2e/helpers/realtime.ts`; there is no product, Supabase config, dependency,
migration, unit, SyncManager, CRDT or Loro path authority. Service recreation occurs only after the
exact empty/disposable checks above. Revision 04 must create a new immutable evidence file and a
committed diagnostic-only HEAD, then receive independent review in `reviews/P05-review-04.md`. No
HS-015 scratch marker may change before that cumulative range passes.

# P05 Implementation Evidence — Revision 04

## Immutable dispatch and pre-mutation boundary

- Package/scope/revision: `P05` / `HS-015` / `04`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `abbb4f52439025401d3ca858f9809b41daddcbe3`.
- Canonical `Q-005` selects verified-empty, repository-scoped local Supabase recreation before any
  transport or dependency change.
- Sole writable implementation path: `tests/e2e/helpers/realtime.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-04.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
- All prior evidence/reviews, control/task files, frozen sources, scratch markers, product,
  dependency/configuration, migration and other test paths remain read-only.

## Safe recreation and validation plan

1. Query the exact running `moneyflow` project's `auth.users`, all public application/ authorization
   tables, `realtime.subscription`, `realtime_grants` and permanent operations as aggregate counts
   only. If any is nonzero, stop before destruction.
2. Only on an all-zero result, immediately run from this repository:
   `pnpm exec supabase stop --no-backup`, then `pnpm exec supabase start`. No direct Docker
   deletion, broad volume operation, backup restoration or other project target is permitted.
3. Verify the recreated Realtime image, internal schema-migration count, active
   `realtime.user_defined_filter` composite shape and sanitized logs agree without
   `MigrationCountMismatch`. Reset/apply migrations 005–008 normally.
4. In the sole helper, make `liveExactGrant` require exact sync/table/topic/purpose/vault/role JWT
   scope, a matching current membership role and a non-deleted vault, while returning only aggregate
   integers.
5. Run fresh/upgrade audits, real incoming-frame E2E and required lifecycle/security/full/CLI gates.
   If a clean pinned start recreates internal skew, stop with an exact dependency-pin proposal; if a
   compatible environment exposes another owner, propose only that owner and do not widen.

## Verified-empty recreation

- Immediately before destructive recreation, one guarded command queried aggregate counts for
  `auth.users`, all nine public base tables (`realtime_grants`, `request_nonces`, `user_data`,
  `vault_invites`, `vault_memberships`, `vault_ops`, `vault_snapshots`, `vault_updates_legacy`, and
  `vaults`) and `realtime.subscription`.
- The exact result, in that order, was
  `auth_users,user_data,vaults,memberships,invites,snapshots,legacy_updates,nonces,grants,ops,subscriptions=0,0,0,0,0,0,0,0,0,0,0`.
- Only after the shell verified that exact all-zero tuple, it ran
  `pnpm exec supabase stop --no-backup` and `pnpm exec supabase start` from this repository. Start
  output containing local connection material was suppressed. No direct Docker deletion, broad
  volume operation, backup restore, or foreign project target was used.
- The recreated Realtime image is `public.ecr.aws/supabase/realtime:v2.112.6`. The Realtime internal
  migration ledger contains 79 rows, and active `realtime.user_defined_filter` attributes are
  `column_name:text`, `op:realtime.equality_op`, `value:text`, and `negate:boolean`.
- Realtime logs reported `Migrations already up` and no `MigrationCountMismatch`. The application
  ledger contained all four repository migrations 005–008. A subsequent normal `pnpm db:reset`
  reapplied 005–008, retained the same 79-row/four-field compatible internal state, and still
  produced no migration-count mismatch.

## Sole implementation change and static checks

- `getRealtimeSubscriptionCounts().liveExactGrant` now requires an authenticated `vault_ops` sync
  claim set whose vault, role, purpose and exact `vault:<uuid>:sync` topic agree with a live grant.
- The grant must also still agree with a current same-role membership and a non-deleted vault. The
  helper continues to return only the integer aggregates `total`, `authenticated`, and
  `liveExactGrant`; it exposes no claim, identity, vault, grant, topic, or payload values.
- `pnpm exec oxfmt --check tests/e2e/helpers/realtime.ts`: pass.
- `pnpm exec eslint tests/e2e/helpers/realtime.ts`: pass.
- `pnpm typecheck`: pass.
- `git diff --check -- tests/e2e/helpers/realtime.ts`: pass.
- An initial attempted `pnpm exec prettier --check ...` was inapplicable because this repository
  uses `oxfmt` and does not install Prettier; the authoritative formatter command above passed.

## Live WebSocket evidence and newly isolated owner

- Three fresh-database, single-worker, zero-retry runs used the ordinary Playwright command and a
  final JSON-timed diagnostic equivalent:
  `env -u SUPABASE_JWT_SECRET pnpm exec playwright test tests/e2e/realtime-security.spec.ts --workers=1 --retries=0`.
- Before reaching the failure, the ordinary runs passed the real transport/security assertions: at
  least one outgoing `postgres_changes` join and one server binding were observed; at least two
  `realtime.subscription` rows existed; every row was authenticated; and every row matched the
  strengthened exact-grant/membership/non-deleted-vault predicate. The incoming imported permanent
  operation and its member-side UI application also passed without refresh.
- Both ordinary runs reached the inline-edit step and ended only at the test's global 120-second
  timeout. One post-run aggregate query showed two permanent `vault_ops` rows (import plus the edit
  operation), while exposing no operation contents or identifiers.
- The final diagnostic isolated exact step durations: identity creation 5.116 s; member fixture
  0.037 s; two-context join 0.814 s; transport attribution 0.194 s; incoming import 4.043 s; inline
  edit 109.747 s. The terminal call log was `locator.press: Test ended` while waiting for
  `[data-testid="description-editable"][value="Realtime encrypted import"]`.
- This is a deterministic test-locator invalidation in `tests/e2e/realtime-security.spec.ts`: the
  step stores a locator qualified by the original input value, fills the new value, then reuses the
  now-nonmatching original-value locator for `press("Enter")`. The page snapshot correspondingly
  showed the edited value in the active owner input. The helper cannot affect or repair that
  Playwright locator.

## Required revision-05 proposal

- Decision: widen no production, dependency, migration, or transport path. Add exactly
  `tests/e2e/realtime-security.spec.ts` to the next revision's writable implementation boundary,
  while retaining `tests/e2e/helpers/realtime.ts` and the next immutable P05 evidence/review paths.
- Exact change: after filling `editedDescription`, press Enter through a locator that remains stable
  across the value change, preferably the transaction-row-scoped `description-editable` input; the
  minimal equivalent is to re-resolve `descriptionInput(owner, editedDescription).press("Enter")`.
  Do not weaken, skip, mock, retry, or increase the timeout of any transport, incoming-frame,
  lifecycle, membership-removal, duplicate, background, security, or aggregate assertion.
- Rationale: compatibility skew is resolved and genuine private Postgres Changes now registers and
  delivers the import. Only the test's self-invalidating selector prevents the inline edit, delete,
  credential refresh, membership-removal, full E2E, CLI, and cleanup gates from completing.
- Revision 04 stops here as required for a newly proven owner. Fresh/upgrade database audits and
  full unit/lint/build/format/E2E/CLI gates were therefore not represented as complete and must run
  in revision 05 after the one-line locator correction.

## Frozen sources and cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching the current rolling boundary. HS-015 was not edited.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes. The worker changed none of these frozen sources or any root ledger/control artifact.
- Playwright and Next development processes were absent at cleanup. Generated `test-results` and
  `.playwright-cli` paths were removed recoverably where present, and `next-env.d.ts` was restored
  byte-for-byte after Next development startup changed its generated route reference.
- The final normal database reset reapplied migrations 005–008 and left aggregate counts at zero for
  `auth.users`, all nine public base tables, and `realtime.subscription`. Realtime remains
  compatible at 79 internal migrations with the four active filter fields and no
  `MigrationCountMismatch` in post-reset logs.

## Commit boundary

- Revision-04 implementation commit: `4233b59c930117e7b160ac142a6f953b988b2dc8`
  (`test: tighten realtime subscription evidence`).
- The exact revision-04 range
  `abbb4f52439025401d3ca858f9809b41daddcbe3..4233b59c930117e7b160ac142a6f953b988b2dc8` changes only
  `tests/e2e/helpers/realtime.ts` (12 insertions, 1 deletion).
- The evidence file remains uncommitted for root freeze/review. Final Git-visible worktree state is
  exactly the root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this untracked evidence; the
  worker left no staged paths or other implementation/configuration/test dirt.

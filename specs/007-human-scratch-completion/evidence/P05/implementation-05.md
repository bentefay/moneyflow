# P05 Implementation Evidence — Revision 05

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `05`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `913b01381e0cbef49200368c40fb990e3873514a`.
- Canonical `Q-006` selects the smallest exact repair: after filling the edited description,
  re-resolve the unique input by the new value and press Enter through that locator.
- Sole writable implementation path: `tests/e2e/realtime-security.spec.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-05.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
- All prior evidence/reviews, helper/product/config/dependency/migration/unit/other E2E paths,
  control/task files, frozen sources and scratch markers remain read-only.

## Validation plan

1. Preserve `fill(editedDescription)`, re-resolve `descriptionInput(owner, editedDescription)`,
   assert the result is unique and focused, then press Enter without force, arbitrary waits,
   `.first()`, retry, timeout changes, refresh/poll substitutes, mocks, or assertion weakening.
2. Verify the running environment remains Realtime v2.112.6 with 79 internal migrations, the
   four-field filter composite, repository migrations 005–008, and no `MigrationCountMismatch`.
3. Run fresh and seeded-upgrade database audits; focused/repeated and ordinary full zero-retry E2E;
   full unit/integration, lint, type, build, format and diff gates.
4. Exercise the installed Playwright CLI owner/member/outsider/duplicate/background charter and
   inspect sanitized browser/network/socket/server evidence without retaining secrets, identities,
   vault IDs, topics, filters, payloads, or financial records.
5. Restore generated files, close browser/dev processes, remove browser artifacts, reset the local
   database to fresh migrations, verify frozen-source integrity, exact-stage only the spec and leave
   this evidence uncommitted. Any newly proven owner routes to an exact revision-06 proposal without
   widening revision 05.

## Sole implementation change and static boundary

- The inline-edit step retains `fill(editedDescription)`, then re-resolves
  `descriptionInput(owner, editedDescription)`, asserts exactly one match and focus, and presses
  Enter through that new locator.
- No forced action, arbitrary wait, `.first()`, retry, timeout increase, mock, refresh, polling
  substitute, assertion weakening, helper change, or other-path change was made.
- `pnpm exec oxfmt --check tests/e2e/realtime-security.spec.ts`: pass.
- `pnpm exec eslint tests/e2e/realtime-security.spec.ts`: pass.
- `pnpm typecheck`: pass.
- The running service boundary before live testing was Realtime
  `public.ecr.aws/supabase/realtime:v2.112.6`, 79 internal Realtime migrations, active filter fields
  `column_name:text`, `op:realtime.equality_op`, `value:text`, and `negate:boolean`, and four
  application migrations 005–008. Sanitized logs contained no `MigrationCountMismatch`.

## Corrected live journey and finite stop

- A fresh database was created with `pnpm db:reset`, then the ordinary zero-retry single-worker
  command ran:
  `env -u SUPABASE_JWT_SECRET pnpm exec playwright test tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list --retries=0`.
- The corrected journey passed identity creation, owner/member sharing, real private Realtime
  subscription registration, exact authenticated/current-grant aggregates, genuine incoming-frame
  import delivery, the corrected inline edit delivery, and encrypted delete delivery without a
  refresh. It reached the subsequent short-lived credential refresh step in 15.5 seconds.
- The run then failed immediately inside the existing `countRealtimeGrants` helper with
  `Realtime grant fixture query failed`. Sanitized Kong evidence identified its service-role
  `HEAD /rest/v1/realtime_grants?...` response as HTTP 403. Aggregate post-run database evidence
  showed 15 grant rows and 7 permanent operation rows, confirming the failure was the observer query
  rather than an absent grant or permanent operation.
- This failure is deterministic: `supabase/migrations/007_realtime_authorization.sql` explicitly
  executes `REVOKE ALL ON public.realtime_grants FROM PUBLIC, anon, authenticated, service_role`,
  and the live database confirms `service_role` has no table privilege. This is an intentional
  anti-enumeration boundary; retrying cannot make the service-role table `HEAD` legal.
- Per the revision-05 stop boundary, no additional retries, fresh/upgrade audits, full static/unit/
  build/E2E gates, CLI charter, expiry/reconnect/offline/duplicate/background/lock/vault-switch/
  removal assertions, or completion claim followed. Those gates remain required after the exact
  revision-06 repair below.

## Q-PROPOSAL-P05-05-01 — Observe credential rotation through the existing sanitized aggregate

- **Context and evidence:** The Q-006 locator repair passes genuine incoming import, edit and delete
  delivery. The next unchanged 70-second poll calls `countRealtimeGrants`, whose service-role REST
  query receives the schema's deliberate HTTP 403. Earlier in the same journey,
  `getRealtimeGrantAggregates` successfully reads only sanitized integer aggregates through the
  local database fixture boundary.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires expiry and
  refresh evidence without grant enumeration, but revision 05 authorizes only the Q-006 locator
  correction. It cannot change which aggregate observer the later assertion uses.
- **Options considered:** (A) in the same spec, remove the `countRealtimeGrants` import and make the
  unchanged poll read
  `(await getRealtimeGrantAggregates(fixture.ownerHash, fixture.vaultId)).sync.total`; (B) rewrite
  `countRealtimeGrants` in the helper to use the database fixture; (C) grant `service_role` direct
  table SELECT; or (D) retry/weaken/skip the expiry gate. A is the smallest existing-primitive
  reuse. B broadens helper ownership, C weakens the intentional non-enumeration boundary, and D
  cannot prove credential rotation.
- **Default selected for continued work:** Dispatch P05 revision 06 with exactly
  `tests/e2e/realtime-security.spec.ts` writable. Remove only the `countRealtimeGrants` import and
  preserve the existing 70-second `expect.poll(...).toBeGreaterThanOrEqual(2)` by returning
  `(await getRealtimeGrantAggregates(fixture.ownerHash, fixture.vaultId)).sync.total`. Retain every
  other assertion and timeout; do not edit helper, migration, config, product, transport,
  dependency, CRDT, or Loro paths.
- **Decision hierarchy basis:** The requirement prioritizes real refresh/revocation evidence and
  denial of enumeration. Repository precedent already uses `getRealtimeGrantAggregates` for
  sanitized lifecycle evidence in this exact test. Reusing it preserves both goals.
- **Impact and risk:** The test observes the same total number of owner sync grants as before, but
  through an aggregate-only privileged local fixture rather than a forbidden REST table request. The
  query validates its hash/UUID inputs and exposes no grant ID, identity, vault, topic, claim,
  filter, payload, or financial record. Runtime product behavior is unchanged.
- **How to reverse or migrate:** The spec-only observer substitution is independently revertible. If
  a later aggregate poll fails after a legal query, capture the sanitized counts and route that
  distinct lifecycle behavior to its proven owner rather than altering security privileges.
- **Does a human still need to decide after completion?:** No. Option A follows the existing
  aggregate fixture and least-privilege boundary; human input is optional only if repository policy
  prefers helper consolidation in a later cleanup package.

## Frozen sources and cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching the current rolling boundary. Its unchanged content preserves the same 21 ordered
  normalized blocks and marker state; HS-015 was not edited.
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
  `public.ecr.aws/supabase/realtime:v2.112.6` with 79 internal migrations, the four active filter
  fields, and no `MigrationCountMismatch` in post-reset logs.

## Commit boundary

- Revision-05 implementation commit: `0d24c802bc8c6dab93a6e1a1c1e1167e95b98583`
  (`test: stabilize realtime edit locator`).
- The exact revision-05 range
  `913b01381e0cbef49200368c40fb990e3873514a..0d24c802bc8c6dab93a6e1a1c1e1167e95b98583` changes only
  `tests/e2e/realtime-security.spec.ts` (4 insertions, 1 deletion).
- The evidence file remains uncommitted for root freeze/review. Final Git-visible worktree state is
  exactly the root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this untracked evidence; the
  worker left no staged paths or other implementation/configuration/test dirt.

# P05 Implementation Evidence — Revision 08

## Immutable dispatch boundary

- Package/scope/revision: `P05` / `HS-015` / `08`.
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Pre-implementation HEAD: `6ad32a6497861f6866209f79ae842a40e143a1ad`.
- Canonical `Q-009` requires exactly one visible online Presence avatar within 15 seconds
  immediately before the existing pre-lock baseline, closing asynchronous onboarding causally.
- Sole writable implementation path: `tests/e2e/vault-settings.spec.ts`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P05/implementation-08.md`,
  created before any service or implementation mutation and left uncommitted.
- At dispatch, HEAD matched the literal pre-implementation HEAD, the index and untracked set were
  empty, and Git-visible dirt was exactly root-owned unstaged `HANDOFF.md` and `PROGRESS.md`.
  Assigned revision-07 evidence was no longer present in the working tree.
- All prior evidence/reviews, helper, revision-06 spec,
  provider/product/config/dependency/migration/ unit/other E2E, transport/SyncManager/CRDT/Loro,
  control/task, frozen-source and scratch-marker paths remain read-only.

## Validation plan

1. Immediately before the existing baseline, define
   `page.getByTitle(/\(online\)$/).filter({ visible: true })` and require exactly one match within
   15 seconds. Retain observer placement, snapshot/subtraction and the exact authorize `<=2`/revoke
   `>=1` bounds.
2. Do not use `.first()`, bare strict visibility, sleeps, counter waits, retries, force/reload,
   timeout/bound changes or any other-path mutation. Preserve every UI, request-secrecy and runtime-
   error assertion.
3. Verify compatible Realtime state; run focused/repeated vault-settings and Realtime journeys,
   fresh/seeded-upgrade database audits, full unit/integration/static/build and ordinary 81-test
   zero-retry E2E gates.
4. Exercise the repository-installed Playwright CLI owner/member/outsider/duplicate/background
   charter, including persistence and sanitized console/request/socket/server inspection.
5. Restore generated files, close browser/dev processes, remove browser artifacts, reset the local
   database, verify frozen-source integrity, exact-stage only the spec and leave this evidence
   uncommitted. Any newly proven owner routes to an exact revision-09 proposal without widening.

## Implementation and static boundary

- Added the canonical locator immediately after `createNewIdentity(page)` and immediately before
  `realtimeLifecycle.snapshot()`:

    ```ts
    const onlinePresence = page.getByTitle(/\(online\)$/).filter({ visible: true });
    await expect(onlinePresence).toHaveCount(1, { timeout: 15_000 });
    ```

- The lifecycle observer remains installed before navigation. The pre-lock snapshot, final-minus-
  baseline delta calculation and exact authorize `<= 2` / revoke `>= 1` assertions are unchanged.
- No sleep, retry, counter wait, reload, force action, relaxed bound or timeout change was added.
- Focused `oxfmt`, ESLint and TypeScript validation passed for the authorized spec. A scoped diff
  inspection confirmed that the two readiness lines are the only implementation change.
- Realtime compatibility was established before execution: image
  `public.ecr.aws/supabase/realtime:v2.112.6`, four application migrations, 79 Realtime migrations,
  and the expected `column_name`, `op`, `value` and `negate` filter fields. No
  `MigrationCountMismatch` was present.

## Focused readiness result

- A fresh-reset, exact focused vault-settings run used one worker and zero retries.
- Result: **1/1 passed**; test duration 6.3 seconds, total duration 9.4 seconds.
- This proves the revision-08 online-Presence readiness assertion and the existing same-vault
  lock/unlock lifecycle journey pass together on the first attempt.

## Paired repeated result and deterministic stop

- After a fresh reset, the exact vault-settings and Realtime journeys were run together with one
  worker, `--repeat-each=3` and `--retries=0`.
- Vault-settings result: **3/3 passed**.
- Realtime-security result: **2/3 passed**. Overall result: **5 passed, 1 failed** in 55.3 seconds.
- The middle Realtime repetition observed aggregate attribution counts `total=6`, `authenticated=6`,
  `liveExactGrant=5`, so its existing equality assertion failed. The first and third Realtime
  repetitions passed in 16.0 and 14.6 seconds respectively.
- A post-run read after every browser context closed found `realtime.subscription=0`. The failing
  row was therefore a prior-context subscription still present during asynchronous teardown, not a
  surviving subscription or a failure of the revision-08 readiness gate.
- `getRealtimeSubscriptionCounts()` accepts no vault input and globally aggregates every
  `realtime.subscription` row for `vault_ops`. That global test helper allowed one subscription
  belonging to the preceding vault-settings fixture to contaminate the current Realtime fixture's
  otherwise exact aggregate.
- This is a newly proven owner outside the sole revision-08 implementation path. Per the immutable
  stop boundary, the remaining database/static/build/full-E2E/CLI matrix was not started and no
  further tests were run.

## Q-PROPOSAL-P05-08-01 — scope subscription attribution to the current vault

- **Context:** the paired repetition produced failure-time counts `6/6/5`, while the same database
  held zero Realtime subscriptions after all contexts closed. The helper globally scans all
  `vault_ops` subscriptions and has no fixture identifier input.
- **Why the requirement and repository do not decide it:** revision 08 authorizes only
  `tests/e2e/vault-settings.spec.ts`; both the aggregate helper and its Realtime-security caller are
  immutable in this revision. The canonical requirement mandates strict, sanitized runtime evidence
  but does not prescribe how a multi-fixture database query scopes attribution.
- **Option A (selected):** in a revision 09 writable only at `tests/e2e/helpers/realtime.ts` and
  `tests/e2e/realtime-security.spec.ts`, change the helper to
  `getRealtimeSubscriptionCounts(vaultId: string)`, strictly validate the UUID before SQL, add an
  outer `subscription.claims ->> 'vault_id' = '${vaultId}'` predicate, and call it with
  `fixture.vaultId`. Preserve the aggregate-only return shape of the same three integers and every
  existing assertion and bound.
- **Option B:** wait for global subscription convergence. Rejected because it couples independent
  fixtures to asynchronous teardown and turns attribution into timing.
- **Option C:** weaken or remove the equality. Rejected because it reduces the exact authorization
  evidence required by HS-015.
- **Option D:** change product code or browser teardown. Rejected because the evidence identifies
  test-query attribution, not a product defect or surviving cleanup failure.
- **Decision basis:** the current test already owns a vault fixture, claims carry its `vault_id`,
  and SQL-side filtering preserves sanitized aggregate-only evidence while making repetition and
  parallel execution independent.
- **Impact:** the query counts only current-vault subscriptions while retaining the exact-grant,
  membership and deleted-vault checks. Neither identifiers nor raw claims are returned or written to
  evidence.
- **Reverse path:** revert the two-path revision-09 test-only diff; no product or persisted-data
  migration is involved.
- **Human input:** none required under the decision hierarchy.
- **Next revision boundary:** writable implementation paths exactly `tests/e2e/helpers/realtime.ts`
  and `tests/e2e/realtime-security.spec.ts`; evidence/review use the next immutable revision-09
  artifact paths. No other implementation path is authorized.

## Frozen sources and cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes, matching the current rolling boundary. HS-015 and every scratch marker remain untouched.
- Immutable FS-001 at `specs/008-transaction-percentage-allocations-settlement/spec.md` remains
  SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and
  25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes. The worker changed none of these frozen sources or any root ledger/control artifact.
- The generated `next-env.d.ts` route reference was restored byte-for-byte. Generated `test-results`
  was removed recoverably; `.playwright-cli` was absent. No test Playwright or Next development
  process remained. The only observed `next-server` was the expected Supabase Studio container, not
  an application development server.
- The final normal database reset reapplied migrations 005–008 and left exact counts of zero for
  `auth.users`, `public.user_data`, `public.vaults`, `public.vault_memberships`,
  `public.vault_invites`, `public.vault_snapshots`, `public.vault_updates_legacy`,
  `public.request_nonces`, `public.realtime_grants`, `public.vault_ops` and `realtime.subscription`.
- Realtime remains `public.ecr.aws/supabase/realtime:v2.112.6` with four application migrations, 79
  internal migrations, the four active filter fields `column_name`, `op`, `value` and `negate`, and
  no `MigrationCountMismatch` in post-reset logs.

## Commit boundary

- Revision-08 implementation commit: `a4d62601dbb0ea17ad43308b39aabd81acbaf7fe`
  (`test: await realtime presence readiness`).
- The exact revision-08 range
  `6ad32a6497861f6866209f79ae842a40e143a1ad..a4d62601dbb0ea17ad43308b39aabd81acbaf7fe` changes only
  `tests/e2e/vault-settings.spec.ts` (2 insertions).
- The evidence file remains uncommitted for root freeze/review. Final Git-visible worktree state is
  exactly the root-owned unstaged `HANDOFF.md` and `PROGRESS.md` plus this untracked evidence; the
  worker left no staged paths or other implementation/configuration/test dirt.

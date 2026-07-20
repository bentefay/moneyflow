# P05 Independent Review — Revision 09

## Verdict

**FAIL.** Revision 09 closes the cross-fixture subscription-attribution defect. Its exact two-path
change strictly validates the vault input, applies the vault predicate to the outer subscription row
set, and passes the current fixture vault from the sole caller. The aggregate-only return, strict
equalities and every lifecycle bound are unchanged. Independent focused Realtime and vault-settings
runs pass, the one-worker interleaved repetition passes 6/6, and fresh/seeded-upgrade database
audits pass 87/87 and 27/27.

The full unit suite remains red. It independently reproduces exactly three failures, all in the
unchanged `VaultRealtimeSync` describe, with 1,167/1,170 tests passing. Each failure occurs before
channel creation at the production credential-expiry guard. The shared credential fixture expires at
`2026-07-20T00:01:00Z`, while the review run used the real clock around `00:46Z`. The two
`RealtimeCredentialManager` cases remain green because they already inject `00:00Z`.

`Q-PROPOSAL-P05-09-01` is confirmed. Revision 10 should change only
`tests/unit/sync/realtime.test.ts`: within the `VaultRealtimeSync` describe, fake `Date` only, set
it to `2026-07-20T00:00:00Z` before each test, and restore real timers after each test. Do not fake
timeouts/intervals, change the credential chronology or expiry guard, or weaken any assertion.
HS-015 remains incomplete while the complete unit gate is red, and no scratch marker is authorized.

## Immutable review boundary

- Package/revision: `P05/09`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..98f5e973f00e794f119dd3045e8b4c57b4a7b0a7`.
- Revision-09 implementation commit: `98f5e973f00e794f119dd3045e8b4c57b4a7b0a7`
  (`test: scope realtime subscription attribution`). Its exact parent is
  `cdf147d0dfdeec66f2722fafd802123c06bed09b`.
- Revision 09 changes only the two authorized paths: `tests/e2e/helpers/realtime.ts` has 9
  insertions and 1 deletion; `tests/e2e/realtime-security.spec.ts` has 1 insertion and 1 deletion.
  The combined revision is 10 insertions and 2 deletions.
- Frozen revision-09 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-09.md`, independently verified
  SHA-256 `82cff417d5d5b1f7785edd6c25b5e83d4d72fd1fbe8b7ff5249857c69517431b`, 160 lines and 11,092
  bytes.
- Prior immutable revision-08 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-08.md`, independently verified SHA-256
  `46c4403f0d8364e49500cb8cf5e6cb8f09f151d07e69bdcb9c7f1ac6310e58d4`, 200 lines and 11,266 bytes.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact,
  Git-visible dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  untracked revision-09 evidence.

## Revision-08 finding closure — fixture-local subscription attribution

The helper now requires `vaultId: string` and rejects every input that is not exact hexadecimal
8-4-4-4-12 UUID syntax before constructing SQL. Both uppercase and lowercase hexadecimal forms are
accepted, but misplaced hyphens, missing groups and non-hexadecimal characters are rejected. This
makes the sole interpolated value SQL-safe without copying the older loose `[0-9a-f-]{36}` check.

The SQL retains:

```sql
WHERE subscription.entity = 'public.vault_ops'::regclass
```

and adds alongside it:

```sql
AND subscription.claims ->> 'vault_id' = '${vaultId}'
```

Outer placement is correct: `total`, `authenticated` and `liveExactGrant` are all computed from the
same current-vault subscription rows. The existing inner `EXISTS` still independently requires the
exact live grant, membership role, undeleted vault, authenticated role, table, purpose and topic.
The helper still returns only `{ total, authenticated, liveExactGrant }`, never scope or claims.

The sole caller now passes `fixture.vaultId`. Its unchanged assertions still require `total >= 2`,
`authenticated === total`, and `liveExactGrant === total`. The 120-second test timeout, all
15-second live bounds, owner/member lifecycle limits, incoming-frame registration, import/edit/
delete delivery, refresh baseline, membership removal, socket secrecy and runtime checks are
unchanged. No teardown wait, retry or product change was introduced.

Independent browser validation began each phase with a fresh latest reset:

| Gate                                      | Result | Detail                    |
| ----------------------------------------- | -----: | ------------------------- |
| focused Realtime security                 |    1/1 | 16.0 s test; 18.9 s total |
| focused same-vault lock/unlock            |    1/1 | 6.3 s test; 9.2 s total   |
| one-worker interleaved, repeat 3, retry 0 |    6/6 | 1.1 minutes               |
| Realtime cases within interleaved run     |    3/3 | 15.4 s, 14.7 s, 15.2 s    |
| vault cases within interleaved run        |    3/3 | 5.1 s, 5.2 s, 5.1 s       |

The revision-08 `6/6/5` contamination does not recur. All three current-vault aggregates satisfy
their original strict relationships without waiting for unrelated subscriptions to disappear.

Database validation is also green:

- A normal reset applied migrations 005–008 and `tests/database/rls-audit.sql` passed 87/87 pgTAP
  assertions.
- A reset to migration 005 loaded `legacy-upgrade-fixture.sql`; normal migration-up applied 006, 007
  and 008; `legacy-upgrade-audit.sql` passed 27/27.
- A final normal reset restored the empty latest schema.

These results independently close review-08 F-001. The current failure belongs to the unit-clock
fixture, not the revision-09 E2E attribution change.

## F-001 — High — fixed credential expiry is evaluated against the advancing wall clock

The independent full command was:

```text
pnpm test
```

Vitest ran 47 files and 1,170 tests. Exactly 46 files and 1,167 tests passed. The sole failing file
was `tests/unit/sync/realtime.test.ts`, where all three cases in `describe("VaultRealtimeSync")`
failed:

1. `authorizes a private exact-vault vault_ops subscription`;
2. `keeps presence private without exposing an identity as the channel key`;
3. `removes the channel, disconnects its isolated client and revokes its grant`.

Every stack terminates at `src/lib/supabase/realtime.ts:111-113` with
`Realtime credential scope is invalid`, reached through `getAccessToken()` before the test's channel
assertions. No other unit or integration test fails.

The cause is deterministic in source and clock values:

- `credential()` defaults to `expiresAt = 2026-07-20T00:01:00.000Z` and
  `refreshAt = 2026-07-20T00:00:40.000Z` (`realtime.test.ts:71-82`).
- `VaultRealtimeSync` creates `RealtimeCredentialManager` without a test clock, so its default is
  real `Date.now` (`src/lib/supabase/realtime.ts:88-92,163-181`).
- Production correctly rejects `Date.parse(credential.expiresAt) <= this.now()`
  (`src/lib/supabase/realtime.ts:107-116`).
- The independent run occurred around `2026-07-20T00:46Z`, approximately 45 minutes after the fixed
  expiry.
- Both credential-manager unit cases pass because they explicitly inject a fixed `now()` at
  `2026-07-20T00:00:00Z`; they do not depend on the wall clock.

Moving the expiry farther into the future would only defer recurrence. Making the fixture relative
to real time would obscure its intended one-minute lifetime and disturb explicit refresh chronology.
Weakening production expiry validation would be a security regression. The unit describe owns its
missing deterministic clock.

## Confirmed Q-PROPOSAL-P05-09-01 — Date-only clock for VaultRealtimeSync units

- **Revision-10 sole writable implementation path:**

```text
tests/unit/sync/realtime.test.ts
```

- Add `afterEach` to the existing Vitest import.
- Inside `describe("VaultRealtimeSync")` only, install Date-only fake time and the fixed pre-expiry
  instant before every case, while retaining the existing mock setup:

```ts
beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
    // existing client, channel, authorization and revoke mock setup remains unchanged
});
```

- In the same describe, restore globals after every case even when an assertion fails:

```ts
afterEach(() => {
    vi.useRealTimers();
});
```

- `toFake: ["Date"]` is essential. `setTimeout`, `setInterval`, immediates, microtasks and animation
  APIs must remain real; no timer advancement or timer-driven behavior should be added.
- Do not apply fake time to the `RealtimeCredentialManager` describe, which already owns explicit
  injected clocks. Do not alter the fixed credential, expiry/refresh values, production clock or
  expiry guard.
- Preserve every authorization input, private channel/table/filter, opaque Presence key, teardown,
  disconnect, revoke and subscribed-state assertion unchanged. Add no retry or substitute test.

Vitest 4.1.10 explicitly supports `FakeTimerInstallOpts.toFake` containing `"Date"`, so this is a
narrow supported mechanism rather than an inferred timer workaround. It restores deterministic
pre-expiry state while leaving production behavior and actual timers untouched.

## Validation limits and final cleanup

The exact full-unit failure rejects revision 09. Production build, repository-wide format, ordinary
81-test zero-retry E2E and the installed CLI charter were not rerun after that deterministic
failure. They remain mandatory completion gates after revision 10; this failed-review stop is not a
waiver.

- Final `pnpm db:reset` reapplied migrations 005–008 and left exact zero counts for `auth.users`,
  all nine public base tables and `realtime.subscription`.
- Realtime is running as `public.ecr.aws/supabase/realtime:v2.112.6`; the database has 79 internal
  migrations and filter fields `column_name:text`, `op:realtime.equality_op`, `value:text`,
  `negate:boolean`. Post-reset logs contain no `MigrationCountMismatch`.
- Reviewer-generated `test-results` was moved to trash; no `playwright-report` or `.playwright-cli`
  path remains. Generated `next-env.d.ts` was restored byte-for-byte and no test browser or Next
  development process remains.
- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. All 21 ordered normalized blocks independently byte-match `SCOPE.json`; the checked set is
  exactly HS-002, HS-014, HS-017 and HS-018. HS-015 remains unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, exactly 450 lines and 27,382
  bytes.

## Exact next revision

Root should preserve revision-01 through revision-09 evidence/reviews as immutable, transcribe the
confirmed proposal, set P05/HS-015 to `changes_requested`, and dispatch P05 revision 10 against the
same original BASE. Only `tests/unit/sync/realtime.test.ts` is writable. Revision 10 must create a
new committed HEAD and immutable `evidence/P05/implementation-10.md`, then receive independent
review in `reviews/P05-review-10.md`. No HS-015 marker may change before that cumulative range
passes.

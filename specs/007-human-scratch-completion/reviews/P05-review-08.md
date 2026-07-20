# P05 Independent Review — Revision 08

## Verdict

**FAIL.** Revision 08 closes the asynchronous Presence-readiness defect. Its exact two-line change
uses the reviewed visible-only locator immediately before the existing baseline, and a fresh focused
same-vault lock/unlock run passes 1/1 with the original lifecycle observer, deltas and bounds.

The required one-worker paired repetition remains red at 5/6. Vault settings passes 3/3, while the
Realtime journey passes 2/3. The middle Realtime run observes subscription aggregates `total=6`,
`authenticated=6`, `liveExactGrant=5`: the authenticated equality passes and the exact- grant
equality alone fails. After all contexts close, `realtime.subscription` is exactly zero.

Source inspection confirms cross-fixture attribution. `getRealtimeSubscriptionCounts()` globally
counts every `public.vault_ops` subscription and accepts no vault scope, while its caller already
owns the current `fixture.vaultId`. A preceding vault-settings context can therefore remain in
Realtime's asynchronous server-side teardown window and add one authenticated subscription whose
grant has already been revoked. This is neither a surviving cleanup leak nor a product failure.

`Q-PROPOSAL-P05-08-01` is confirmed with strict UUID syntax made explicit below. Revision 09 should
change only `tests/e2e/helpers/realtime.ts` and `tests/e2e/realtime-security.spec.ts`: validate an
exact UUID shape before interpolation, scope the query's outer row set by the claims `vault_id`, and
pass `fixture.vaultId`. Preserve the aggregate-only return value, exact equalities, all lifecycle
bounds and teardown unchanged. HS-015 remains incomplete while the paired run is red, and no scratch
marker is authorized.

## Immutable review boundary

- Package/revision: `P05/08`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..a4d62601dbb0ea17ad43308b39aabd81acbaf7fe`.
- Revision-08 implementation commit: `a4d62601dbb0ea17ad43308b39aabd81acbaf7fe`
  (`test: await realtime presence readiness`). Its exact parent is
  `6ad32a6497861f6866209f79ae842a40e143a1ad`.
- Revision 08 changes only the authorized `tests/e2e/vault-settings.spec.ts`, with exactly two
  insertions and no deletions. The visible-filter locator and 15-second count assertion are
  immediately after awaited identity creation and immediately before the unchanged pre-lock
  snapshot.
- Frozen revision-08 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-08.md`, independently verified
  SHA-256 `dcfb79499ab725eb4881899fcf298804123d575d557ff9b7943772f9ed0f0c8d`, 150 lines and 10,061
  bytes.
- Prior immutable revision-07 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-07.md`, independently verified SHA-256
  `6698876b9b654bff6cd00e3bf54d4ac45f86cd9ba7348fc30a4b33a3048bde7c`, 183 lines and 10,971 bytes.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact,
  Git-visible dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  untracked revision-08 evidence.

## Revision-07 finding closure — visible Presence readiness

The independent focused command started from a fresh latest database:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/vault-settings.spec.ts \
  --grep 'same-vault lock then unlock renders on the first attempt' \
  --workers=1 --reporter=list --retries=0
```

It passed 1/1. The test itself took 6.3 seconds and the command completed in 9.2 seconds. This
independently closes revision-07 F-001: exactly one visible online avatar becomes observable before
the baseline, then Lock, unlock, first render, Saved state, browser-error checks and the unchanged
authorize `<=2` / revoke `>=1` delta assertions all pass on the first attempt.

The implementation matches the approved responsive-DOM correction exactly:

```ts
const onlinePresence = page.getByTitle(/\(online\)$/).filter({ visible: true });
await expect(onlinePresence).toHaveCount(1, { timeout: 15_000 });
const preLockLifecycle = realtimeLifecycle.snapshot();
```

It does not use `.first()`, a bare strict locator across hidden and visible elements, sleep, counter
polling, force, reload or retries. Observer placement, snapshot subtraction, sanitized annotations,
global timeout and lifecycle bounds are unchanged.

## F-001 — High — the subscription helper aggregates unrelated vault fixtures

After another fresh reset, the independent paired command was:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/vault-settings.spec.ts tests/e2e/realtime-security.spec.ts \
  --grep 'same-vault lock then unlock renders on the first attempt|private vault_ops push synchronizes import, edit and delete and stops after removal' \
  --workers=1 --reporter=list --retries=0 --repeat-each=3
```

It finished with 5 passed and 1 failed in 55.4 seconds:

| Journey           | Result | Individual durations                 |
| ----------------- | -----: | ------------------------------------ |
| vault settings    |    3/3 | 5.2 s, 5.1 s, 5.1 s                  |
| Realtime security |    2/3 | 15.9 s pass, 5.0 s fail, 14.6 s pass |

The failing Realtime repetition followed a passing vault-settings repetition. In its initial
sanitized attribution step, `subscriptions.total` was 6. The assertion that authenticated equals
total passed, proving authenticated was also 6. The next assertion received `liveExactGrant=5`
against expected total 6. The failure is therefore exactly `6/6/5`, not an unexplained product or
delivery failure. The failing run stopped before import/edit/delete, while the first and third
Realtime runs completed those genuine incoming-frame operations, refresh, member removal, socket
secrecy and runtime-error checks.

Immediately after the Playwright process and all browser contexts closed, a direct aggregate query
returned `realtime.subscription=0`. This excludes a persistent subscription leak. It is consistent
with a closed prior fixture whose server-side subscription row briefly overlaps the next test while
its already-revoked grant causes only `liveExactGrant` to be one lower.

The ownership is explicit in source:

- `getRealtimeSubscriptionCounts()` at `tests/e2e/helpers/realtime.ts:341-399` has no argument. Its
  outer query selects all rows whose entity is `public.vault_ops`; only the inner `EXISTS` validates
  each row's own claims/grant/membership/vault.
- The Realtime test creates `fixture` at `realtime-security.spec.ts:61-63` and already uses
  `fixture.vaultId` for owner/member grant aggregates at lines 79-82, but calls the subscription
  helper globally at line 83.
- Thus `total` and `authenticated` include unrelated vaults by construction. The inner exact-grant
  proof correctly rejects the revoked prior row, creating the observed `6/6/5` mismatch.

Waiting for the global row to disappear would couple independent fixtures to teardown timing.
Weakening equality would accept in-scope authorization defects. Changing context closure or product
code is unsupported because cleanup reaches zero and both complete Realtime repetitions pass.

## Confirmed Q-PROPOSAL-P05-08-01 — current-vault subscription attribution

- **Revision-09 writable paths, exactly:**

```text
tests/e2e/helpers/realtime.ts
tests/e2e/realtime-security.spec.ts
```

- Change the helper signature to `getRealtimeSubscriptionCounts(vaultId: string)`.
- Before constructing SQL, require exact 8-4-4-4-12 hexadecimal UUID structure. A sufficient
  injection-safe validation is:

```ts
if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(vaultId)) {
    throw new Error("Realtime subscription fixture scope is invalid");
}
```

The existing loose `[0-9a-f-]{36}` grant-helper check is not the strict syntax required for this new
interpolated input and should not be copied.

- Retain the existing `subscription.entity = 'public.vault_ops'::regclass` predicate and add an
  outer conjunct:

```sql
AND subscription.claims ->> 'vault_id' = '${vaultId}'
```

Outer placement is essential because all three aggregates must share the current-vault row set;
changing only the inner `EXISTS` would leave `total` and `authenticated` globally contaminated.

- At the sole caller, use `getRealtimeSubscriptionCounts(fixture.vaultId)`.
- Preserve the same aggregate-only `{ total, authenticated, liveExactGrant }` return shape. Do not
  return/log the vault ID, claims, grants, topics, identities or payloads.
- Preserve `total >= 2`, `authenticated === total`, `liveExactGrant === total`, every browser
  lifecycle/frame assertion, the 120-second global timeout, all 15-second live bounds, refresh
  baseline, operations, membership removal, cleanup and socket/runtime secrecy assertions.
- Add no wait, retry, sleep, teardown change, product/provider/transport change, schema/config
  change or other test scope.

This makes attribution fixture-local without weakening what each aggregate proves. The change is
fully reversible and requires no human product decision.

## Validation limits and final cleanup

The deterministic paired failure rejects revision 08, so full unit/integration/static/build/fresh-
upgrade database audits, the ordinary 81-test zero-retry E2E suite, additional repetitions and the
installed CLI charter were not rerun. They remain mandatory completion gates after revision 09; this
failed-review stop is not a waiver.

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

Root should preserve revision-01 through revision-08 evidence/reviews as immutable, transcribe the
confirmed proposal, set P05/HS-015 to `changes_requested`, and dispatch P05 revision 09 against the
same original BASE. Only `tests/e2e/helpers/realtime.ts` and `tests/e2e/realtime-security.spec.ts`
are writable. Revision 09 must create a new committed HEAD and immutable
`evidence/P05/implementation-09.md`, then receive independent review in `reviews/P05-review-09.md`.
No HS-015 marker may change before that cumulative range passes.

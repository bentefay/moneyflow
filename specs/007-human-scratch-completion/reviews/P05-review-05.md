# P05 Independent Review — Revision 05

## Verdict

**FAIL.** Revision 05 correctly repairs the inline-edit locator. The ordinary real two-context run
now passes exact subscription registration and genuine incoming import, edit and delete delivery
without refresh. It then fails in 15.4 seconds at the next observer: `countRealtimeGrants()` issues
a service-role REST `HEAD` against `realtime_grants` and receives HTTP 403. Migration 007
deliberately revokes every direct table privilege from `service_role` while granting only the
mint/revoke RPCs; the live database independently confirms table `SELECT=false` and
rotation-function `EXECUTE=true`. This is an intentional anti-enumeration boundary, not a missing
product privilege.

The implementer's proposed reuse of the existing sanitized `getRealtimeGrantAggregates()` fixture is
the correct owner and requires only the same spec path. Its proposed unchanged fixed `>=2` threshold
is not sufficient, however. At the 15-second failure boundary—well before the credential manager's
approximately 40-second refresh point—the two sanitized sync identity-group totals were already 2
and 3. Merely changing the observer would therefore make the step pass immediately without proving a
refresh. Revision 06 must capture the initial owner sync total and poll until the later legal
aggregate is strictly greater than that baseline, while retaining the 70-second bound and a
minimum-two floor. No helper, migration, privilege or product widening is justified.

HS-015 remains incomplete because expiry/refresh, removal, final cleanup, repeated/full E2E and the
manual charter do not execute past this observer. No scratch marker is authorized.

## Immutable review boundary

- Package/revision: `P05/05`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..0d24c802bc8c6dab93a6e1a1c1e1167e95b98583`.
- Revision-05 implementation commit: `0d24c802bc8c6dab93a6e1a1c1e1167e95b98583`
  (`test: stabilize realtime edit locator`). Its exact parent is
  `913b01381e0cbef49200368c40fb990e3873514a`.
- Revision 05 changes only the authorized `tests/e2e/realtime-security.spec.ts`, with four
  insertions and one deletion. It contains no helper, product, config, dependency, migration, unit,
  other E2E, control, evidence, review, scratch, FS-001, `.claude` or `.codex` change.
- Frozen revision-05 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-05.md`, independently verified
  SHA-256 `a3177aa1cabe07835c170e5c37eb8da7dc3f074fc82e90d6f03fe3245729349f`, 138 lines and 10,031
  bytes.
- Prior immutable revision-04 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-04.md`, independently verified SHA-256
  `dd629bc49ca8e0694406b113fbd3eb23996da6def212a852ed94a289a1449d33`, 250 lines and 15,623 bytes.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact,
  Git-visible dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  untracked revision-05 evidence.

## Findings

### F-001 — High — the expiry/refresh observer violates the deliberate grant-table privilege boundary

The independent ordinary command ran from a verified-empty latest database, omitted the parent
signing secret and disabled retries:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list --retries=0
```

It collected one test and reached the
`refresh the short-lived credential in-band without a reconnect storm` step in 15.4 seconds. Before
that failure, every preceding product assertion passed:

- real owner/member contexts joined the same encrypted vault;
- outgoing Postgres-change registration and the strengthened exact live-grant/current-member
  subscription aggregates passed;
- the member received the imported operation through a genuine incoming frame before its UI row
  appeared;
- the newly stable focused locator committed the owner edit and the member UI received it; and
- encrypted deletion reached the member without refresh.

The terminal error is exactly `Realtime grant fixture query failed` from
`tests/e2e/helpers/realtime.ts:268-277`. That helper creates the service-role client and sends a
REST table `HEAD` with exact count. Sanitized Kong evidence records
`HEAD /rest/v1/realtime_grants?<redacted> HTTP/1.1` with status 403. It exposes no identity, vault,
grant, token, topic, claim, filter or payload.

Migration 007 lines 211-223 intentionally implement a capability boundary:

- `REVOKE ALL ON public.realtime_grants FROM ... service_role` denies direct enumeration;
- execute on `rotate_realtime_grant(...)` and `revoke_realtime_grant(...)` is granted to
  `service_role`; and
- product authorization uses those security-definer functions rather than direct table access.

Independent live privilege queries return `service_select=false` and `service_rotate_execute=true`.
The fresh database audit also requires browsers not to enumerate grants and service-role minting
through the scoped function. Granting table `SELECT`, changing RLS, retrying the forbidden call or
weakening the gate would contradict the accepted security design.

`getRealtimeGrantAggregates()` is already imported and successfully used earlier in this same test.
It validates the fixture hash/UUID, queries through the local database process, returns only integer
totals/live/revoked/expired counts and suppresses command failure output. Reusing its owner sync
aggregate in the spec is the narrow legal replacement. The now-unused `countRealtimeGrants` import
must be removed from this spec, but its shared helper/export is outside revision-06 authority and
need not be deleted.

### F-002 — High — the proposed fixed `>=2` result is already true before credential refresh

`Q-PROPOSAL-P05-05-01` correctly identifies the legal observer but proposes keeping:

```text
expect.poll(..., { timeout: 70_000, intervals: [1_000] })
    .toBeGreaterThanOrEqual(2)
```

That fixed threshold does not prove the step's stated behavior. The route mints 60-second tokens
with a 20-second refresh lead, so an ordinary in-band refresh is expected roughly 40 seconds after
mint. The independent run failed at only 15.4 seconds. At that same sanitized boundary, grouping
grant rows by purpose and identity without returning either identity produced:

| Purpose | Total | Live | Revoked | Identity groups |
| ------- | ----: | ---: | ------: | --------------: |
| sync    |     2 |    2 |       0 |               1 |
| sync    |     3 |    3 |       0 |               1 |

The fixed `>=2` condition was therefore already satisfied for either owner/member assignment before
the intended refresh window. This is consistent with the bounded initial authorization overlap
already observed and accepted for React development lifecycle/concurrent managers. Replacing the 403
observer while retaining only that threshold would create a false green expiry gate.

Revision 06 should return the initial owner sync total from the existing attribution step, then
require a later aggregate total greater than that baseline. The 70-second timeout and one-second
poll intervals remain unchanged. To preserve the absolute floor as well as the causal condition, the
matcher can require at least `Math.max(2, initialOwnerSyncTotal + 1)`. This is stronger than the
current assertion: it proves a new grant appeared after the recorded initial boundary and cannot
pass merely because initial overlap produced multiple grants.

Migration 008's fresh/upgrade counterfactuals already prove that an explicit refresh revokes only
its predecessor while preserving active siblings. If the baseline-relative live poll exposes a later
rotation or reconnect failure, revision 06 must stop on that new counterexample rather than changing
privileges or suppressing it.

## Revision-04 finding closure

The revision-05 selector correction is exact and accepted. After filling the original-value input,
the test re-resolves `descriptionInput(owner, editedDescription)`, asserts exactly one match and
focus, then presses Enter through the new locator. It retains the existing 120-second global
timeout, 15-second delivery bounds, real browser contexts and every security/UI assertion. There is
no forced action, wait, `.first()`, retry, refresh, mock or polling substitute.

The independent run clearing import, edit and delete proves that revision-04 F-001 was solely the
old-value lazy locator. A sanitized post-failure query found seven permanent operation rows and 15
grant rows, consistent with real product activity; no contents or identifiers were retained.

## Service, database and static adjudication

The local service remains the accepted compatible boundary:

| Boundary                 | Result                                      |
| ------------------------ | ------------------------------------------- |
| Realtime image           | `public.ecr.aws/supabase/realtime:v2.112.6` |
| internal migration rows  | 79                                          |
| active filter fields     | four, including `negate`                    |
| application migrations   | 005–008                                     |
| `MigrationCountMismatch` | absent                                      |

Independent checks for this revision:

| Check                             | Result                                          |
| --------------------------------- | ----------------------------------------------- |
| exact spec-only revision diff     | passed                                          |
| spec ESLint                       | passed                                          |
| spec Oxfmt                        | passed                                          |
| cumulative `git diff --check`     | passed                                          |
| typecheck                         | passed                                          |
| complete unit/integration suite   | 47 files, 1,170/1,170 passed                    |
| ordinary isolated Realtime E2E    | 0/1; import/edit/delete pass, observer gets 403 |
| service-role direct grant SELECT  | denied as designed                              |
| service-role rotation RPC execute | allowed as designed                             |

Fresh 87/87 and seeded-upgrade 27/27 database audits were independently green in revision 04 and the
relevant migration range is byte-identical in revision 05. The final normal reset again applied
005–008 successfully. Build, full/repeated E2E, expiry continuation, membership removal and the
installed Playwright CLI charter were not run after the deterministic 403 stop. They remain required
after the legal baseline-relative observer correction; they cannot be claimed complete in this
failed revision.

## Q-PROPOSAL-P05-05-01 adjudication — corrected, not confirmed as written

The proposed sole path and legal aggregate primitive are confirmed. Direct table privilege,
migration, helper and product alternatives are rejected. The proposed unchanged fixed `>=2`
threshold is rejected because independent pre-refresh counts already satisfy it.

## Q-PROPOSAL-P05-05-02 — observe a new owner sync grant relative to the initial sanitized baseline

- **Raised by/package/revision:** `human_scratch_reviewer`, P05, revision 05, 2026-07-20.
- **Context and evidence:** genuine incoming import/edit/delete now pass. The next observer receives
  an intentional service-role table 403. The legal aggregate fixture is already in the spec, but
  sync totals are already 2/3 across identity groups at 15 seconds, before the approximately
  40-second refresh point, so a fixed `>=2` check is non-causal.
- **Why existing authority does not decide it:** revision 05 authorized only the stable edit
  locator. It could expose but not replace the observer or strengthen the expiry assertion.
- **Options considered:** (A) capture the initial owner sync total and poll the existing aggregate
  until it exceeds that baseline with the same 70-second bound; (B) retain fixed `>=2`; (C) edit the
  helper; (D) grant direct table SELECT; or (E) skip/retry the gate. A is the smallest truthful
  evidence. B is already true, C is unnecessary widening, D weakens non-enumeration, and E waives
  refresh acceptance.
- **Reversible default selected to continue:** choose **A**. Revision 06 has exactly one writable
  implementation/test path:

```text
tests/e2e/realtime-security.spec.ts
```

Remove the `countRealtimeGrants` import. Return or otherwise retain the initial
`grants.owner.sync.total` integer from the existing attribution step without exposing scope. In the
refresh step, poll
`(await getRealtimeGrantAggregates(fixture.ownerHash, fixture.vaultId)).sync.total` using the
unchanged 70-second timeout and one-second intervals until it reaches at least
`Math.max(2, initialOwnerSyncTotal + 1)`. Retain every other assertion and timeout. Do not edit the
helper/export, migration, privileges, config, dependency, product, transport, other E2E, unit,
SyncManager, CRDT or Loro paths.

- **Decision-hierarchy basis:** HS-015 requires actual expiry/refresh plus non-enumeration. Existing
  aggregate fixture precedent and least privilege control, while baseline-relative observation is
  required for truthful causal evidence.
- **Impact and risk:** the spec will wait for one new grant rather than pass on initial lifecycle
  overlap. This may add up to the already-authorized 70-second duration but does not widen timeouts
  or create retries. If no new grant arrives, the red exposes a real refresh defect instead of
  hiding it.
- **Reversal or migration path:** the spec-only observer change is independently revertible and has
  no schema, service, encrypted-data or product effect. A later helper cleanup may remove the now
  unused shared observer only under its own package authority.
- **Human review still useful after completion:** no product choice blocks continuation. Human input
  is optional only if a stricter aggregate condition, such as also observing predecessor revocation,
  is desired after the required causal total increase is green.

Revision 06 must then complete ordinary and repeated retries-zero
import/edit/delete/refresh/removal; exact registration and incoming-frame ordering; private
Presence; duplicate/background tabs; expiry, reconnect/offline catch-up, lock/unlock and vault
switch; final revoke/prune bounds; socket URL/log/artifact sanitation; fresh/upgrade audits;
complete unit/lint/type/build/format/diff/E2E; and the installed headless Playwright CLI
owner/member/outsider/duplicate/background charter. No refresh, polling of product data or retry may
fake push delivery.

## Frozen sources and final cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. All 21 ordered blocks normalize byte-for-byte to `SCOPE.json`; the checked set is exactly
  HS-002, HS-014, HS-017 and HS-018. HS-015 remains unchecked.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly
  715 lines and 25,441 bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  exactly 450 lines and 27,382 bytes.
- Reviewer-generated `next-env.d.ts` and ignored Playwright results were removed. No Playwright CLI
  session was created. The final latest database has zero auth users, public rows, subscriptions and
  permanent ops. Realtime remains running at v2.112.6/79 migrations/four filter fields without a
  mismatch warning.

## Exact next revision

Root should preserve revision-01 through revision-05 evidence/reviews as immutable, transcribe the
corrected proposal, set P05/HS-015 to `changes_requested`, and dispatch P05 revision 06 against the
same original BASE. The sole writable path remains `tests/e2e/realtime-security.spec.ts`; no helper,
privilege, migration or product path is authorized. Revision 06 must create a new committed HEAD and
immutable `evidence/P05/implementation-06.md`, then receive independent review in
`reviews/P05-review-06.md`. No HS-015 marker may change before that cumulative range passes.

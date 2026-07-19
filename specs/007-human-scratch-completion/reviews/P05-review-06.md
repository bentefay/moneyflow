# P05 Independent Review — Revision 06

## Verdict

**FAIL.** Revision 06 correctly closes the forbidden-observer and false-positive refresh findings.
The focused real Realtime journey independently passes 3/3: each run registers exact current-grant
subscriptions, receives import/edit/delete through genuine incoming frames, observes owner
sync-grant growth strictly after its captured initial baseline, removes the member, and finishes
with safe socket URLs and no runtime errors. Fresh and seeded-upgrade audits, unit/static checks and
production build are also green.

The ordinary full zero-retry suite remains red at 80/81. Its sole failure is the unchanged
same-vault lock/unlock lifecycle test, which counts four cumulative Presence authorizations against
a bound of two. A fresh isolated run reproduces the same `4 > 2`, excluding suite concurrency and
revision-06 observer effects. Sanitized chronology and source inspection show two valid Presence
authorizations during initial onboarding and two after unlock; the observer starts before
onboarding, so the final cumulative count does not measure only the interval named by the test.

`Q-PROPOSAL-P05-06-01` is confirmed. Revision 07 should snapshot the existing lifecycle counters
after identity creation and before Lock, then apply the unchanged authorize `<=2` and revoke `>=1`
bounds to final-minus-baseline deltas. The sole writable path is `tests/e2e/vault-settings.spec.ts`.
No bound, helper, provider, product, transport, migration, privilege or configuration widening is
justified. HS-015 remains incomplete while the full suite is red, and no scratch marker is
authorized.

## Immutable review boundary

- Package/revision: `P05/06`, cumulative `HS-015` review.
- Literal cumulative range:
  `007651beb814d98646aa2e786801b647e2abd0b5..95acc3b2e935b9bdf2788f301a79b490d2d5d509`.
- Revision-06 implementation commit: `95acc3b2e935b9bdf2788f301a79b490d2d5d509`
  (`test: prove realtime grant refresh causally`). Its exact parent is
  `a00eed992495f837eab34dfa0cf7cb13d62c97c5`.
- Revision 06 changes only the authorized `tests/e2e/realtime-security.spec.ts`, with 41 insertions
  and 35 deletions. Most churn is formatter wrapping of the existing attribution step; semantic
  changes are limited to removing the forbidden observer import/use, returning the existing initial
  owner sync total, and polling the legal aggregate relative to that baseline.
- Frozen revision-06 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-06.md`, independently verified
  SHA-256 `1c71d43ea08c7b9abc030126dc4444066f92d618bd0d84cce2cfe3ab17132599`, 180 lines and 13,152
  bytes.
- Prior immutable revision-05 FAIL review:
  `specs/007-human-scratch-completion/reviews/P05-review-05.md`, independently verified SHA-256
  `53edd79c1472196338ff721d9c8ded29ea8df35645d704813675dd5c1e42f460`, 258 lines and 16,265 bytes.
- `git diff --check BASE..HEAD` passes and the index is empty. Before this review artifact,
  Git-visible dirt was exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  untracked revision-06 evidence.

## Finding

### F-001 — High — the lock/unlock test applies a two-authorization interval bound to the entire onboarding journey

The independently repeated focused Realtime command was:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/realtime-security.spec.ts --workers=1 --reporter=list \
  --retries=0 --repeat-each=3
```

It passed 3/3 in 49.6 seconds with individual durations 15.9, 14.7 and 15.2 seconds. After a fresh
reset, the isolated lock/unlock command was:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  tests/e2e/vault-settings.spec.ts \
  --grep 'same-vault lock then unlock renders on the first attempt' \
  --workers=1 --reporter=list --retries=0
```

It failed 0/1 in 6.1 seconds only at `expect(counts.authorize.presence).toBeLessThanOrEqual(2)`,
receiving 4. The vault rendered on the first post-unlock page, Saved status was accessible, the sync
authorization bound passed, and no `Failed to load vault` or browser error preceded the attribution
failure.

`observeRealtimeLifecycle(page)` is created at `vault-settings.spec.ts:134`, before
`createNewIdentity(page)` at lines 150-151. Its snapshot is not taken until the final attribution
step at lines 178-187, after Lock and unlock. The current count therefore combines initial
authenticated mount work with the interval the test title intends to bound.

An aggregate-only database chronology after isolated reproduction returned no identifiers or scope
values:

| Purpose  | Ordinal | Relative creation | Revoked at cleanup boundary |
| -------- | ------: | ----------------: | --------------------------: |
| sync     |       1 |              0 ms |                         yes |
| sync     |       2 |          2,707 ms |                          no |
| Presence |       1 |            127 ms |                         yes |
| Presence |       2 |            129 ms |                         yes |
| Presence |       3 |          2,776 ms |                          no |
| Presence |       4 |          2,783 ms |                         yes |

Final aggregate totals were sync 2 with one revoked and Presence 4 with three revoked. These form
two clear authenticated-mount clusters: one during identity/onboarding and one after same-vault
unlock. `src/hooks/use-vault-presence.ts:71-130` supports the classification. Its effect creates a
new Presence transport, starts async subscribe, and unsubscribes in cleanup; React development
effect replay therefore creates and cleans a transient transport before retaining the second
transport on each authenticated mount. The paired Presence grants are bounded supported lifecycle
work, not a four-connection lock/unlock storm.

The proposed pre-lock snapshot is causally precise. Taken immediately after the awaited
`createNewIdentity` step and before clicking Lock, it includes the initial cluster. Subtracting it
from the final snapshot leaves lock/unlock deltas of one sync authorization, two Presence
authorizations, one sync revoke and two Presence revokes in the reproduced chronology. Those deltas
satisfy the existing strict bounds without changing them.

Raising the cumulative Presence limit to four would allow unrelated lifecycle growth. Moving the
observer itself after onboarding could miss late initial requests. Snapshotting the already-running
observer retains all evidence while isolating the named interval. No provider/product change is
supported because the interval deltas are within the accepted bounds and the UI/auth cleanup
behavior is correct.

## Revision-05 finding closures

### Legal causal refresh observer

The revised attribution `test.step` returns only `grants.owner.sync.total`, which was already part
of the sanitized initial annotation. The refresh step polls the existing validated
`getRealtimeGrantAggregates(...).sync.total` every second for at most 70 seconds and requires at
least `Math.max(2, initialOwnerSyncTotal + 1)`. It therefore cannot pass on initial React/concurrent
manager overlap and retains the absolute minimum-two floor.

The full 120-second test timeout, all 15-second delivery bounds, exact current-grant subscription
assertions, private owner/member contexts, incoming-frame ordering, import/edit/delete/removal UI
checks, socket secrecy and runtime error assertion remain unchanged. The forbidden
`countRealtimeGrants` import/use is gone; its shared helper/export remains untouched outside this
revision's authority.

Three consecutive focused passes and the Realtime test's pass inside the four-worker full suite
close revision-05 F-001/F-002. They demonstrate real post-baseline credential growth plus genuine
live operations and removal, not a pre-satisfied threshold or forbidden table enumeration.

## Full-suite and non-browser validation

The independent full command started from a fresh latest database:

```text
env -u SUPABASE_JWT_SECRET pnpm exec playwright test \
  --workers=4 --reporter=line --retries=0
```

It ran all 81 tests and finished 80/81 in 1.4 minutes. The revised Realtime-security journey passed
inside the concurrent suite. The sole failure was the exact isolated vault-settings cumulative
Presence assertion above; there was no second unexplained failure.

Independent validation summary:

| Check                           | Result                               |
| ------------------------------- | ------------------------------------ |
| exact spec-only revision diff   | passed                               |
| changed spec ESLint/Oxfmt       | passed                               |
| cumulative `git diff --check`   | passed                               |
| typecheck                       | passed                               |
| complete unit/integration suite | 47 files, 1,170/1,170 passed         |
| production build                | passed; all 17 routes generated      |
| repository lint                 | exit 0; 13 known warnings, no errors |
| fresh database audit            | 87/87 passed                         |
| seeded 005-to-008 upgrade audit | 27/27 passed                         |
| focused Realtime repeat         | 3/3 passed                           |
| isolated vault-settings         | 0/1; cumulative Presence 4 vs 2      |
| full E2E                        | 80/81; same sole failure             |

Repository-wide format check remains red only on frozen/root-owned control/source boundaries noted
in the evidence; the changed spec and this review are format-clean. The installed Playwright CLI
owner/member/outsider/duplicate/background charter was not run after the deterministic full-suite
failure. Revision 07 must run it and all completion gates after the delta correction. This is a
failed-review limitation, not a waiver.

## Q-PROPOSAL-P05-06-01 confirmation — attribute lock/unlock lifecycle using pre-lock deltas

- **Raised by/package/revision:** `human_scratch_implementer`, P05, revision 06, 2026-07-20;
  independently confirmed by `human_scratch_reviewer`.
- **Context and evidence:** focused Realtime is 3/3 and passes in the full suite. The only full and
  isolated failure is Presence authorize 4 against a cumulative bound of 2. The observer includes
  two onboarding grants and two post-unlock grants; sanitized chronology and effect source agree.
- **Why existing authority does not decide it:** revision 06 authorized only the causal refresh
  observer in the Realtime spec. It could identify but not edit the separate vault-settings
  attribution window.
- **Options considered:** (A) snapshot after identity and assert final-minus-baseline deltas with
  unchanged bounds; (B) raise the cumulative bound to four; (C) start observation after identity; or
  (D) weaken/skip/retry. A retains complete evidence and isolates the named interval. B permits
  unrelated growth, C can miss late onboarding work, and D does not prove lifecycle control.
- **Reversible default selected to continue:** choose **A**. Revision 07 has exactly one writable
  implementation/test path:

```text
tests/e2e/vault-settings.spec.ts
```

Immediately after the awaited `createNewIdentity` step and before clicking Lock, capture
`preLockLifecycle = realtimeLifecycle.snapshot()`. In the existing final attribution step, derive
authorize/revoke sync/Presence deltas by subtracting matching pre-lock counters. Apply the existing
sync/Presence authorize `<=2` and revoke `>=1` assertions to those deltas. Keep the cumulative
snapshots only as sanitized annotations if useful. Do not raise a bound, move observer creation, add
sleeps/retries, or edit the helper, revision-06 spec, provider, product, transport, migration,
privileges, config, dependencies, other tests, SyncManager, CRDT or Loro.

- **Decision-hierarchy basis:** HS-015 requires bounded reconnect and safe teardown; the test title
  specifically covers same-vault lock/unlock. Causal before/after deltas enforce those exact bounds
  while preserving least privilege and existing product behavior.
- **Impact and risk:** the test still fails more than two authorizations or fewer than one revoke
  per purpose during lock/unlock. Only aggregate integers are retained. If interval deltas fail
  after correction, route their exact values to the proven owner instead of relaxing thresholds.
- **Reversal or migration path:** the one-file test attribution change is independently revertible
  and has no schema, service, encrypted-data or product impact.
- **Human review still useful after completion:** no product decision blocks continuation. Optional
  human review may request separate onboarding bounds in a later package, but that is not required
  to correct this named interval.

Revision 07 must rerun isolated/repeated vault-settings, focused Realtime, full 81-test zero-retry
E2E, fresh/upgrade/unit/lint/type/build/format/diff, and the installed headless Playwright CLI
owner/member/outsider/duplicate/background charter. It must retain
import/edit/delete/refresh/removal, exact registration, Presence, socket secrecy and final
revoke/prune evidence. No refresh or product polling may fake push delivery.

## Frozen sources and final cleanup

- `specs/human-scratch.md` remains SHA-256
  `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`, exactly 350 lines and 24,243
  bytes. All 21 ordered blocks normalize byte-for-byte to `SCOPE.json`; the checked set is exactly
  HS-002, HS-014, HS-017 and HS-018. HS-015 remains unchecked.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly
  715 lines and 25,441 bytes.
- `SCOPE.json` remains SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  exactly 450 lines and 27,382 bytes.
- Reviewer-generated ignored Playwright results were removed; `next-env.d.ts` is clean and no
  Playwright CLI session was created. The final latest database has zero auth users, public rows,
  subscriptions and permanent ops. Realtime remains running at v2.112.6 with 79 internal migrations,
  the four-field filter type and no mismatch warning.

## Exact next revision

Root should preserve revision-01 through revision-06 evidence/reviews as immutable, transcribe the
confirmed proposal, set P05/HS-015 to `changes_requested`, and dispatch P05 revision 07 against the
same original BASE. The sole writable path is `tests/e2e/vault-settings.spec.ts`; every helper,
revision-06 spec, provider/product/config/migration path remains read-only. Revision 07 must create
a new committed HEAD and immutable `evidence/P05/implementation-07.md`, then receive independent
review in `reviews/P05-review-07.md`. No HS-015 marker may change before that cumulative range
passes.

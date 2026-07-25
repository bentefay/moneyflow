# Deferred Human Questions

Root is the sole writer of this ledger. Questions never pause the running Goal. Implementers and
reviewers put complete `Q-PROPOSAL-*` records in their one assigned artifact; root assigns a
canonical `Q-XXX`, appends it here with a source link, and logs transcription in PROGRESS. Workers
apply the PROCESS decision hierarchy and safest reversible default without editing this file.

No unresolved product questions were answered by scaffold creation.

## Q-001 — Animate UI notice and redistribution posture

- **Raised:** 2026-07-20, P02 revision 01, `human_scratch_implementer`; independently confirmed by
  `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P02/implementation-01.md#q-proposal-p02-01--animate-ui-notice-and-redistribution-posture`;
  confirmed in `reviews/P02-review-01.md`
- **Context and evidence:** Existing Animate UI tabs are copied into `src/components/animate-ui/**`.
  The pinned upstream “MIT + Commons Clause License Condition” requires its notice in copies or
  substantial portions and restricts selling or redistributing the components themselves in original
  form. Repository search found no Animate UI/Elliot Sutton notice or root third-party notice.
- **Why the frozen requirement/repository does not fully decide it:** HS-017 requires maintenance
  ownership and a reversible adoption decision, but does not authorize legal interpretation or
  define the repository's intended distribution model.
- **Options considered:** (A) add a reviewed third-party notice and confirm application distribution
  complies; (B) replace/remove the copied tabs with direct Radix code; (C) accept the missing-notice
  risk and expand copying.
- **Default selected for continued work:** Decline further Animate UI copying, retain the existing
  tabs temporarily, and require notice/distribution review before release. Prefer A if application
  distribution is compatible; otherwise use B. Reject C.
- **Decision hierarchy basis:** The frozen requirement permits decline; compliance and narrow,
  reversible ownership favor no new copied surface.
- **Impact and risk:** No P02 runtime impact. Unresolved notice/distribution obligations may affect
  release compliance and any future registry adoption.
- **How to reverse or migrate:** Add the reviewed notice and document intended distribution, or
  replace the copied tabs layers/helpers with a direct Radix implementation and re-run P02 gates.
- **Does a human still need to decide after completion?:** Yes. A repository/release owner must
  confirm distribution posture and approve the notice or replacement route.

## Q-002 — Verified-request and user-identity completion range

- **Raised:** 2026-07-20, P04 revision 01, `human_scratch_implementer`; independently confirmed and
  completed by `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P04/implementation-01.md#q-proposal-p04-01-01--complete-the-verified-request-and-public-user-boundary`;
  completed as `reviews/P04-review-01.md#q-proposal-p04-01-01--authorize-the-verified-request-and-user-identity-completion-range`
- **Context and evidence:** Revision 01 excludes the client transport, user router/schema and
  identity hook. Source proves production GET proof omits operation/input while tRPC serializes it
  in URLs; public user APIs use claimed hashes; both new-registration paths have no stored signing
  session until after their mutation.
- **Why the frozen requirement/repository does not fully decide it:** HS-014 mandates verified
  identity and URL privacy, but the revision-01 path contract forbids the files needed to satisfy
  them without breaking onboarding.
- **Options considered:** Leave the gaps; patch middleware only; retain public claimed-hash
  compatibility; sign the full GET URL; or authorize canonical signed POST plus verified self-only
  user procedures and their callers/tests.
- **Default selected for continued work:** Dispatch P04 revision 02 with exactly the review's 13
  paths; force canonical POST, derive user identity only from verified context, preserve the hook's
  page-facing contract, and require counterfactual plus new/existing-user no-retry evidence.
- **Decision hierarchy basis:** Explicit frozen requirement, then verified identity, least
  privilege, URL privacy, data preservation and the narrowest reversible path expansion.
- **Impact and risk:** Until independently approved, authenticated query selection is not bound to
  its proof and public callers can enumerate, squat or select user rows, including retrieving stored
  encrypted data. P04 and HS-014 remain incomplete.
- **How to reverse or migrate:** `methodOverride: "POST"` is a local transport setting; removing
  claimed router inputs needs no data migration because stored keys remain unchanged. Any temporary
  compatibility route must expose neither existence/blob data nor another identity claim.
- **Does a human still need to decide after completion?:** No product preference is unresolved;
  root authorizes the exact reviewed revision-02 range and verifies no silent caller-path expansion.

## Q-003 — Correct Realtime provider topology, identify churn, and bootstrap local E2E

- **Raised:** 2026-07-20, P05 revision 01, `human_scratch_reviewer`; supersedes implementer
  `Q-PROPOSAL-P05-01-01`
- **Source proposal:**
  `reviews/P05-review-01.md#q-proposal-p05-01-02--correct-provider-topology-identify-churn-and-bootstrap-local-e2e`;
  superseded source in `evidence/P05/implementation-01.md`
- **Context and evidence:** Correctly signed E2E reproduces missed permanent-op member delivery,
  Presence join errors, repeated live grants and incomplete revocation. `SyncStatusProvider` is
  nested below `VaultProvider`, so the consumer receives static no-op defaults; the implementer's
  proposed live-context identity cause cannot operate. Current churn may instead come from query
  data, tRPC utilities, the Presence hook or a combination. Plain Playwright startup also lacks the
  required local signing secret.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 fixes the live delivery
  and cleanup outcome but not React provider ownership or local-secret injection. Revision-01
  authority excludes the topology and Playwright files and does not justify guessing another owner
  or weakening private authorization/status behavior.
- **Options considered:** (A) put `SyncStatusProvider` above `VaultProvider`, use stable specific
  provider dependencies and sanitized lifecycle attribution; (B) memoize context without reordering;
  (C) apply only the provider dependency edit; (D) suppress status callbacks or accept pull/expiry.
  Only A repairs the disconnected status contract and proves the real trigger.
- **Default selected for continued work:** Dispatch revision 02 with exactly
  `src/app/(app)/layout.tsx`, `src/components/providers/vault-provider.tsx`,
  `playwright.config.ts`, `tests/e2e/helpers/realtime.ts`,
  `tests/e2e/realtime-security.spec.ts`, and `tests/e2e/vault-settings.spec.ts`. Attribute every
  sync/Presence initialize/cleanup before correcting stable dependencies; stop with a new proposal
  if another owning path is proven necessary.
- **Decision hierarchy basis:** Explicit live delivery/security/cleanup, then the connected status
  contract, evidence-backed diagnosis, least privilege and smallest reversible expansion.
- **Impact and risk:** Provider reordering can expose stale or overly broad dependencies, producing
  storms or retaining a manager across a real identity/vault change. Test bootstrap could disclose a
  secret or normalize an unsafe production fallback. Exact lifecycle, production fail-closed,
  URL/log, membership-removal and cross-vault tests remain mandatory.
- **How to reverse or migrate:** These topology/dependency/test-config changes require no data
  migration. Revert them if instrumentation worsens lifecycle behavior, retain the revision-01
  grant schema/transport, and propose only the newly proven owner; existing grants expire in 60s.
- **Does a human still need to decide after completion?:** No. Root applies the reversible default;
  optional human review may choose different status ownership or local-development secret policy.

## Q-004 — Support concurrent Realtime grants and the actual private join

- **Raised:** 2026-07-20, P05 revision 02, `human_scratch_implementer`; independently confirmed by
  `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P05/implementation-02.md#q-proposal-p05-02-01--concurrent-grants-and-actual-private-join-authorization`;
  confirmed in
  `reviews/P05-review-02.md#q-proposal-p05-02-01-confirmation--concurrent-grants-and-actual-private-join-authorization`
- **Context and evidence:** Corrected provider topology and ordinary hermetic startup reach the real
  two-context journey, but the member receives zero Postgres event kinds for 15 seconds and private
  Presence is repeatedly unauthorized. Migration 007 revokes every same-scope sibling grant on
  each mint and accepts mutually exclusive extensions even though the installed client's private
  Presence join carries default Broadcast configuration plus enabled Presence. Sanitized lifecycle
  aggregates show bounded cleanup and locate the failure before SyncManager, CRDT, Loro or React.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires concurrent
  tabs, secure private Presence, genuine no-refresh delivery and bounded revocation, but revision-02
  authority contains no migration or database-audit path. The zero-frame result provides no basis
  for widening into transport or CRDT code.
- **Options considered:** (A) forward-migrate to independently revocable concurrent short-lived
  grants, rotating only an explicit predecessor and minimally authorizing the exact extensions for
  each private purpose; (B) coordinate credentials/channels across tabs; (C) suppress React overlap
  while preserving one global live grant; or (D) accept pull/expiry instead of live delivery. A is
  the narrow direct correction; B adds broad ownership, C breaks genuine duplicate tabs and D
  violates HS-015.
- **Default selected for continued work:** Choose A. Dispatch revision 03 with exactly the six
  revision-02 paths plus `supabase/migrations/008_realtime_authorization_lifecycle.sql`,
  `tests/database/rls-audit.sql`, and `tests/database/legacy-upgrade-audit.sql`. Migration 008 must
  preserve independent active siblings, rotate only an explicitly presented predecessor, bound or
  prune stale rows, and minimally permit the installed client's actual private extension set while
  retaining exact identity/vault/role/purpose/topic/membership/expiry constraints. Fresh and
  005-to-latest audits must prove simultaneous grants, independent refresh/revoke, expiry/removal,
  stale-row bounds and cross-vault/purpose/extension denial.
- **Decision hierarchy basis:** Explicit HS-015 live-delivery, duplicate-client and secure shared
  Presence requirements control, followed by least privilege, current membership/removal, data
  permanence and the smallest forward-only correction. Incoming-frame evidence excludes later
  processing layers.
- **Impact and risk:** Concurrent grants increase usable credentials within the 60-second window,
  requiring exact per-grant revocation, expiry, membership revalidation and stale-row bounds. An
  over-broad extension policy could cross purpose boundaries, so adversarial topic/purpose tests
  remain mandatory.
- **How to reverse or migrate:** Migration 008 changes authorization functions/policies rather than
  encrypted user data. A later forward migration may tighten concurrency caps or extension mapping;
  individual grants can be revoked or expire. The six topology/config/test changes remain locally
  reversible.
- **Does a human still need to decide after completion?:** No product preference blocks continued
  work. Human review is optional only if the owner wants a different explicit concurrent-device cap.

## Q-005 — Recreate compatible local Realtime state before changing transport

- **Raised:** 2026-07-20, P05 revision 03, `human_scratch_reviewer`; rejects implementer
  `Q-PROPOSAL-P05-03-01` and selects reviewer `Q-PROPOSAL-P05-03-02`
- **Source proposal:**
  `reviews/P05-review-03.md#q-proposal-p05-03-01-adjudication--rejected-transport-mode-correction`
  and
  `reviews/P05-review-03.md#q-proposal-p05-03-02--recreate-compatible-local-realtime-state-and-harden-only-exact-registration-evidence`;
  rejected source in `evidence/P05/implementation-03.md`
- **Context and evidence:** The ordinary journey emits Postgres Changes joins/bindings but registers
  zero subscriptions. Running Realtime v2.80.7 reports 68 cached internal migrations against 79 in
  the persistent database; its three-field filter encoding conflicts with the database's four-field
  `realtime.user_defined_filter` shape and yields a sanitized out-of-range system error. A public
  channel follows the same CDC registration path and reproduces the error, so toggling `private`
  cannot fix it. Migration 008 and private Presence are independently correct.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires genuine live
  delivery but does not specify repair of stale local Supabase internal volumes. Revision 03 does
  not authorize service recreation, dependency pins or correction of its incomplete exact-current-
  grant diagnostic.
- **Options considered:** (A) verify the exact local database is empty/disposable, recreate the
  pinned services without backup, harden only the aggregate subscription query and rerun acceptance;
  (B) immediately update the pinned CLI/image contract; (C) toggle sync channel privacy; or (D)
  accept polling/zero registration. A is the narrow evidence-backed default; B lacks clean-start
  incompatibility evidence, C is disproved and D violates HS-015.
- **Default selected for continued work:** Choose A. Revision 04 may write only
  `tests/e2e/helpers/realtime.ts`. After re-verifying zero local grants, subscriptions and permanent
  ops for this exact project, run `pnpm exec supabase stop --no-backup` and
  `pnpm exec supabase start`; do not target broad Docker state or another project. Verify the image,
  internal migration count and active filter composite agree with no mismatch, then apply 005–008
  normally. Make `liveExactGrant` require exact sync/table/topic claims, current matching membership
  role and a non-deleted vault while returning sanitized aggregate integers only. If clean start
  recreates the mismatch, stop with a proposal for exact `package.json`/`pnpm-lock.yaml` pin
  authority; do not silently change dependencies or product code.
- **Decision hierarchy basis:** HS-015 genuine live delivery and immediate unauthorized-reader
  denial control, followed by least privilege, reproducible pinned tooling, data preservation and
  the smallest evidence-backed correction. The failure is below product channel construction.
- **Impact and risk:** `stop --no-backup` deletes local Supabase data, so it is allowed only after
  exact-project empty/disposable checks and must never target shared or production state. The helper
  remains test-only and sanitized. No config/dependency path is authorized without proof that a
  clean pinned environment is incompatible.
- **How to reverse or migrate:** The helper-only change is independently revertible. Local services
  are recreated by the pinned start command and normal migrations. A clean-start mismatch routes to
  a later exact pin proposal; any compatible-environment product failure must produce its own
  counterexample and owner.
- **Does a human still need to decide after completion?:** No product choice blocks continuation.
  Human input is useful only if this verified-empty local project is unexpectedly non-disposable or
  repository policy prefers a deliberate toolchain upgrade.

## Q-006 — Repair the self-invalidating Realtime edit locator

- **Raised:** 2026-07-20, P05 revision 04, `human_scratch_reviewer`; independently confirms the
  implementer's revision-05 owner proposal
- **Source proposal:**
  `reviews/P05-review-04.md#q-proposal-p05-04-01--repair-only-the-self-invalidating-inline-edit-locator`;
  supporting evidence in `evidence/P05/implementation-04.md`
- **Context and evidence:** A compatible local service now registers authenticated exact-grant
  subscriptions and genuinely delivers the imported operation to the member UI without refresh.
  The journey then fills the owner editor with a new value but reuses a lazy locator constrained to
  the old value for Enter. Independent zero-retry reproduction consumes the unchanged two-minute
  timeout in that step; the snapshot shows the new value focused and the database contains import
  plus edit operations.
- **Why the frozen requirement/repository does not fully decide it:** Revision 04 authorized only
  the aggregate helper. It proved the spec-owned blocker but could not edit the journey file.
- **Options considered:** (A) re-resolve the editor by its new value and retain every assertion and
  timeout; (B) use another locator stable across value changes with explicit uniqueness/focus; (C)
  increase timeouts/retries; or (D) widen product/transport code. A is the smallest exact fix; B is
  acceptable only if it cannot depend lazily on the old value, while C hides the empty locator and
  D contradicts registered/incoming-frame evidence.
- **Default selected for continued work:** Choose A. Revision 05 may write only
  `tests/e2e/realtime-security.spec.ts`. After filling, re-resolve
  `descriptionInput(owner, editedDescription)`, optionally assert it is uniquely focused, and press
  Enter. The revision-04 helper is read-only. Do not force the action, use ambiguous `.first()`, add
  waits/retries, increase timeouts, weaken assertions or edit product/config/dependency/migration/
  unit/other E2E/SyncManager/CRDT/Loro paths.
- **Decision hierarchy basis:** HS-015 genuine live import/edit/delete and removal denial control;
  current incoming-frame evidence excludes product transport before the failing call. Repository
  E2E rules require stable selectors and behavior assertions without arbitrary waits.
- **Impact and risk:** Re-resolving by the new value remains precise in this isolated flow but must
  be unique before Enter. An ambiguous locator or weakened timeout could produce false green live-
  delivery evidence. Delete, refresh/removal and cleanup remain unproven until the corrected run
  reaches them.
- **How to reverse or migrate:** The one-file test correction has no schema, service or encrypted-
  data impact and is independently revertible. Any later product failure requires its own exact
  counterexample and owner proposal.
- **Does a human still need to decide after completion?:** No. Human review is optional only for a
  different equally stable selector convention.

## Q-007 — Prove credential refresh against an initial sanitized baseline

- **Raised:** 2026-07-20, P05 revision 05, `human_scratch_reviewer`; corrects implementer
  `Q-PROPOSAL-P05-05-01`
- **Source proposal:**
  `reviews/P05-review-05.md#q-proposal-p05-05-02--observe-a-new-owner-sync-grant-relative-to-the-initial-sanitized-baseline`;
  corrected source in `evidence/P05/implementation-05.md`
- **Context and evidence:** Genuine incoming import/edit/delete now pass. The next observer receives
  an intentional HTTP 403 because `service_role` has rotate/revoke RPC execution but no direct
  `realtime_grants` table SELECT. The legal aggregate fixture is already used in the spec. However,
  independent pre-refresh identity-group totals are already 2 and 3 at 15 seconds, so the
  implementer's fixed `>=2` replacement would pass before the roughly 40-second refresh point.
- **Why the frozen requirement/repository does not fully decide it:** Revision 05 authorized only
  the stable edit locator. It exposed but could not replace the forbidden observer or make the
  refresh assertion causal.
- **Options considered:** (A) capture the initial owner sync total and poll the legal aggregate
  until it exceeds that baseline under the existing 70-second bound; (B) retain fixed `>=2`; (C)
  edit the helper; (D) grant direct table SELECT; or (E) skip/retry the gate. A is the smallest
  truthful evidence; B is pre-satisfied, C is unnecessary, D weakens non-enumeration and E waives
  refresh acceptance.
- **Default selected for continued work:** Choose A. Revision 06 may write only
  `tests/e2e/realtime-security.spec.ts`. Remove the `countRealtimeGrants` import, retain the initial
  `grants.owner.sync.total` integer from the existing attribution step, and poll
  `getRealtimeGrantAggregates(...).sync.total` every second for at most the unchanged 70 seconds
  until it is at least `Math.max(2, initialOwnerSyncTotal + 1)`. Retain every other assertion and
  timeout. Do not edit the helper/export, privileges, migration, product, config, dependency,
  transport, other E2E, unit, SyncManager, CRDT or Loro paths.
- **Decision hierarchy basis:** HS-015 requires actual expiry/refresh plus non-enumeration. Existing
  aggregate-fixture precedent and least privilege control, while baseline-relative observation is
  necessary for causal evidence.
- **Impact and risk:** The test waits for one new grant instead of passing on initial lifecycle
  overlap. It may consume the already-authorized 70-second window but adds no timeout or retry. A
  failure will expose a real refresh defect rather than conceal it.
- **How to reverse or migrate:** The spec-only observer change is independently revertible with no
  schema, service, encrypted-data or product impact. Any later failure requires its own sanitized
  counterexample and exact owner.
- **Does a human still need to decide after completion?:** No. Human input is optional only if a
  stricter post-green aggregate, such as explicit predecessor revocation, is desired later.

## Q-008 — Attribute same-vault lock/unlock using pre-lock deltas

- **Raised:** 2026-07-20, P05 revision 06, `human_scratch_implementer`; independently confirmed by
  `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P05/implementation-06.md#q-proposal-p05-06-01--attribute-lockunlock-lifecycle-relative-to-its-pre-lock-baseline`;
  confirmed in `reviews/P05-review-06.md`
- **Context and evidence:** Focused Realtime is 3/3 and passes in the full suite. The sole full and
  isolated failure is cumulative Presence authorization 4 against 2. The observer starts before
  identity creation; sanitized chronology shows two valid onboarding Presence grants and two after
  unlock, while sync/revocation and UI behavior pass.
- **Why the frozen requirement/repository does not fully decide it:** Revision 06 authorized only
  the causal refresh observer in the Realtime spec. It proved but could not edit the separate
  vault-settings attribution window.
- **Options considered:** (A) snapshot after identity and assert final-minus-baseline deltas using
  unchanged bounds; (B) raise the cumulative bound to four; (C) start observation after identity;
  or (D) weaken/skip/retry. A retains all evidence and isolates the named interval. B allows
  unrelated growth, C can miss late onboarding work and D waives lifecycle control.
- **Default selected for continued work:** Choose A. Revision 07 may write only
  `tests/e2e/vault-settings.spec.ts`. Immediately after awaited identity creation and before Lock,
  capture the current lifecycle snapshot. In final attribution, subtract matching pre-lock counters
  and apply the existing sync/Presence authorize `<=2` and revoke `>=1` assertions to those deltas.
  Do not raise bounds, move observer creation, add sleeps/retries or edit helper, revision-06 spec,
  provider/product/transport/migration/privileges/config/dependencies/other tests/CRDT/Loro paths.
- **Decision hierarchy basis:** HS-015 requires bounded reconnect and safe teardown, while the test
  specifically names same-vault lock/unlock. Causal before/after deltas enforce exactly that interval.
- **Impact and risk:** The test still rejects more than two authorizations or fewer than one revoke
  per purpose during lock/unlock. Only aggregate integers are retained; a remaining delta failure
  must route to its actual owner rather than relax thresholds.
- **How to reverse or migrate:** The one-file test attribution change is independently revertible
  with no schema, service, encrypted-data or product impact.
- **Does a human still need to decide after completion?:** No. Separate onboarding bounds may be
  considered later but are not required to measure this named interval correctly.

## Q-009 — Await visible initial Presence readiness before the lock baseline

- **Raised:** 2026-07-20, P05 revision 07, `human_scratch_implementer`; independently confirmed and
  selector-corrected by `human_scratch_reviewer`
- **Source proposal:** `evidence/P05/implementation-07.md#q-proposal-p05-07-01--await-initial-presence-readiness-before-freezing-the-pre-lock-baseline`;
  corrected in `reviews/P05-review-07.md#corrected-q-proposal-p05-07-01`
- **Context and evidence:** The immediate post-identity snapshot is all zero because identity setup
  returns before asynchronous Presence authorization. Final deltas therefore equal cumulative sync
  2/1 and Presence 4/3. Source ordering proves a visible online avatar occurs only after the retained
  subscription is `SUBSCRIBED` and Presence state synchronizes, while both replay authorization
  requests were observed earlier.
- **Why the frozen requirement/repository does not fully decide it:** Revision 07 authorized the
  immediate snapshot but not the missing behavior readiness assertion. Responsive layout also
  renders hidden mobile and visible desktop avatars, requiring visibility filtering.
- **Options considered:** (A) require exactly one visible online avatar before snapshot; (B) poll a
  dev-specific counter; (C) sleep; (D) raise/skip/retry bounds; or (E) change product/provider.
  A is causal and user-visible; B–D are brittle or weaken evidence, and E is unsupported.
- **Default selected for continued work:** Revision 08 may write only
  `tests/e2e/vault-settings.spec.ts`. Immediately before the existing baseline, use
  `page.getByTitle(/\(online\)$/).filter({ visible: true })` and require count one within 15 seconds.
  Retain observer placement, snapshot/subtraction, global timeout, all live bounds and authorize
  `<=2`/revoke `>=1`. Do not use `.first()`, bare strict `toBeVisible`, sleeps, counter waits,
  force/reload/retries, or edit any helper/product/provider/transport/migration/config/other path.
- **Decision hierarchy basis:** Repository E2E guidance prefers observable behavior auto-waiting;
  visible synchronized Presence causally closes onboarding before measuring lock/unlock.
- **Impact and risk:** The test now fails if initial Presence is not visibly connected within the
  existing bound and remains strict about lock/unlock deltas. Visibility filtering prevents hidden
  responsive duplicates from causing ambiguity.
- **How to reverse or migrate:** The spec-only assertion is independently revertible. Any remaining
  interval failure must route sanitized deltas to its exact owner rather than relax bounds.
- **Does a human still need to decide after completion?:** No; optional future work may expose a
  dedicated semantic Presence-ready test hook.

## Q-010 — Scope subscription attribution to the current vault fixture

- **Raised:** 2026-07-20, P05 revision 08, `human_scratch_implementer`; independently confirmed by
  `human_scratch_reviewer`
- **Source proposal:** `evidence/P05/implementation-08.md#q-proposal-p05-08-01--scope-subscription-attribution-to-the-current-vault`;
  confirmed in `reviews/P05-review-08.md`
- **Context and evidence:** Visible readiness passes. In an interleaved repeat, vault-settings is
  3/3 and Realtime 2/3; the middle Realtime attribution is exactly total/authenticated/live 6/6/5
  after a prior fixture, while subscriptions are zero after all contexts close. The helper globally
  counts all `vault_ops` subscriptions and has no vault input.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires exact
  sanitized evidence but does not define multi-fixture query scoping. Revision 08 cannot edit the
  helper or its caller.
- **Options considered:** (A) filter outer subscription rows to the validated current vault; (B)
  wait for global teardown; (C) weaken equality; or (D) change product teardown. A is fixture-local
  and preserves exact proof; B couples tests to timing, C weakens evidence and D lacks product fault.
- **Default selected for continued work:** Revision 09 may write only
  `tests/e2e/helpers/realtime.ts` and `tests/e2e/realtime-security.spec.ts`. Change the helper to
  accept `vaultId`, validate exact 8-4-4-4-12 hexadecimal UUID syntax, add the outer claims
  `vault_id` predicate alongside `public.vault_ops`, and call with `fixture.vaultId`. Preserve the
  aggregate-only three integers, `total >=2`, both exact equalities, and every timeout/lifecycle/
  security assertion. Add no wait/retry/teardown/product/schema/config/other-test change.
- **Decision hierarchy basis:** Fixture-local attribution preserves strict security evidence and
  parallel/repeat independence using the smallest reversible test-only scope.
- **Impact and risk:** Strict validation makes SQL interpolation injection-safe; outer filtering is
  required so all three aggregates share the same vault row set. No scope value is returned/logged.
- **How to reverse or migrate:** The two-file E2E-only change is independently revertible with no
  persisted-data or product impact.
- **Does a human still need to decide after completion?:** No.

## Q-011 — Freeze the VaultRealtimeSync unit Date without faking timers

- **Raised:** 2026-07-20, P05 revision 09, `human_scratch_implementer`; independently confirmed by
  `human_scratch_reviewer`
- **Source proposal:** `evidence/P05/implementation-09.md#q-proposal-p05-09-01--freeze-the-vaultrealtimesync-unit-clock`;
  confirmed in `reviews/P05-review-09.md#confirmed-q-proposal-p05-09-01--date-only-clock-for-vaultrealtimesync-units`
- **Context and evidence:** The full unit suite passes 1,167/1,170. Only the three unchanged
  `VaultRealtimeSync` cases fail before channel creation because their fixed credential expires at
  `2026-07-20T00:01:00Z` while the real review clock is later. Production correctly rejects this
  expired scope. The credential-manager cases remain green because they already inject `00:00Z`.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires correct
  credential expiry but does not prescribe a deterministic unit clock, and revision 09 could write
  only the Realtime E2E helper/spec.
- **Options considered:** (A) fake `Date` only at fixed `2026-07-20T00:00:00Z` within the affected
  describe; (B) move fixed expiry farther into the future; (C) derive expiry from the wall clock;
  or (D) weaken production validation. A preserves the explicit chronology and real timer behavior;
  B merely defers recurrence, C obscures chronology and D is a security regression.
- **Default selected for continued work:** Choose A. Revision 10 may write only
  `tests/unit/sync/realtime.test.ts`. Add `afterEach` to the Vitest import. Within
  `describe("VaultRealtimeSync")` only, retain existing setup and use
  `vi.useFakeTimers({ toFake: ["Date"] })` plus
  `vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"))` before every case, then
  `vi.useRealTimers()` after every case. Preserve actual timeouts, intervals, immediates,
  microtasks and animation APIs; do not advance timers or change any fixture, assertion, product,
  helper, E2E, migration, config or dependency path.
- **Decision hierarchy basis:** A describe-local deterministic Date fixes the test-owned wall-clock
  dependency with the smallest reversible scope while retaining the production expiry guard and all
  HS-015 security/lifecycle evidence.
- **Impact and risk:** The three cases evaluate their documented one-minute credential before
  expiry while channel authorization, private scope, Presence opacity, disconnect and revoke
  assertions remain unchanged. Scoped restoration prevents clock leakage into other tests.
- **How to reverse or migrate:** The one-file test setup change is independently revertible with no
  production, persisted-data, schema or service impact.
- **Does a human still need to decide after completion?:** No.

## Q-012 — Apply authorized same-identity operations in sibling tabs

- **Raised:** 2026-07-20, P05 revision 10, `human_scratch_implementer`; independently confirmed and
  evidence-tightened by `human_scratch_reviewer`
- **Source proposal:** `evidence/P05/implementation-10.md#q-proposal-p05-10-01--apply-authorized-same-identity-operations-in-sibling-tabs`;
  confirmed in `reviews/P05-review-10.md#confirmed-and-tightened-q-proposal-p05-10-01`
- **Context and evidence:** Two authenticated same-vault tabs each have live Presence and a current
  `vault_ops` subscription. One creates and persists exactly one transaction, but the sibling stays
  at zero rows beyond 15 seconds with no authorization, subscription, socket or browser error.
  `SyncManager.initialize()` drops every received op whose author public-key hash equals the local
  identity, so it conflates a same-identity sibling with the originating manager.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 explicitly requires
  duplicate-tab live behavior, but existing E2E separately proves true duplicated-tab hydration and
  different-identity live sync. Neither proves a same-identity live operation, and revision 10 could
  write only the unit-clock test.
- **Options considered:** (A) remove the identity early return and rely on the established serialized
  remote-import path plus an extension-backed duplicate-tab regression; (B) add per-tab identity to
  schema/encrypted metadata/transport; (C) catch up on focus/visibility; or (D) reload/poll/retry.
  Independent Loro probing shows A is safe: origin self-import and repeated sibling import are
  version-stable and trigger zero `subscribeLocalUpdates` callbacks. B is disproportionate protocol
  surface, and C/D leave or mask broken live delivery.
- **Default selected for continued work:** Choose A. Revision 11 may write only
  `src/lib/sync/manager.ts` and `tests/e2e/tab-duplication.spec.ts`. Remove only the comment and
  `authorPubkeyHash === this.pubkeyHash` early return, retaining the serialized
  `applyRemoteUpdate(update.encryptedData)` path. Extend the existing test and its true extension-
  backed `chrome.tabs.duplicate()` helper; retain cache/hydration coverage, navigate both authenticated
  duplicates to Transactions, attach console/page-error capture before mutation, and create one
  transaction through normal UI. Without reload, focus-triggered catch-up, polling substitute,
  sleep, retry or timeout increase, require both tabs to contain exactly one matching row within the
  existing 15-second bound, exactly one permanent op for the fixture vault, zero receiver
  `sync.pushOps` delta from its pre-mutation baseline, and zero collected browser errors. Preserve
  the 60-second test timeout, security/grant/topic/filter/throttle/durable-catch-up/encryption
  behavior and every other product/test path.
- **Decision hierarchy basis:** Explicit HS-015 duplicate-tab live acceptance controls, followed by
  independently proven CRDT idempotence/local-vs-remote behavior and the smallest reversible code
  plus meaningful-journey regression.
- **Impact and risk:** The origin can import its server echo and siblings can import the operation;
  exact one-row/one-op/zero-receiver-push evidence rejects duplication or loops. Authorization and
  payload/schema boundaries remain unchanged.
- **How to reverse or migrate:** Revert the two-path revision-11 diff. No persisted-data, schema,
  protocol, configuration or migration change is involved.
- **Does a human still need to decide after completion?:** No.

## Q-013 — Require a supported hidden topology before another Realtime product diff

- **Raised:** 2026-07-20, P05 revision 11, `human_scratch_reviewer`; rejects implementer
  `Q-PROPOSAL-P05-11-01`
- **Source proposal:** `reviews/P05-review-11.md#q-proposal-p05-11-r01--require-a-supported-hidden-topology-before-another-product-diff`;
  rejected source in `evidence/P05/implementation-11.md`
- **Context and evidence:** Revision 11's true extension-backed duplicate journey passes focused
  1/1 and repeated 3/3 with exact row/op/push/error assertions. The implementation evidence then
  claims a genuinely hidden installed-CLI receiver missed 15 seconds, but records neither hidden
  visibility nor causal timestamps. Independent required headless CLI runs report both opener pages
  `visible`; measured frame/import/DOM convergence is 2,549/2,549/2,591 ms with rows 1/1.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires background/
  foreground and duplicate live behavior, while PROCESS requires repository-installed headless CLI
  and forbids headed mode. The available headless topology does not make a non-selected page report
  `document.visibilityState === "hidden"`.
- **Options considered:** (A) enable Realtime `worker: true`; (B) label non-selection as hidden; (C)
  emulate page visibility/lifecycle; (D) raise the bound or focus/reload/poll; or (E) freeze product
  scope until a supported real hidden topology can capture the same sanitized timing edges. A is
  causally unsupported because the installed dependency moves only heartbeat timing while socket,
  decode, decrypt/import and React remain page-local; it also adds per-client Blob workers, CSP and
  disconnect-on-worker-error risk. B/C provide false evidence, and D weakens live acceptance.
- **Default selected for continued work:** Choose E. Reject the proposed `src/lib/supabase/client.ts`
  worker mutation. Authorize no revision-12 product/test diff until an approved mechanism verifies
  `document.visibilityState === "hidden"` without focus/reload. A no-product diagnostic must record
  visibility at mutation, 15 seconds and eventual completion plus elapsed socket receipt, exact Loro
  import and DOM publication. Only the first late edge may select the next writable owner. If no
  supported mechanism exists within repository authority, classify P05 `blocked_external`, continue
  independent packages and recheck before dependent milestones/P21.
- **Decision hierarchy basis:** Explicit hidden/live acceptance and PROCESS constraints control,
  followed by measured installed behavior, security/preservation and the smallest reversible no-
  product diagnostic.
- **Impact and risk:** This preserves the independently green same-identity manager correction while
  preventing an unmeasured global worker change or false certification of a visible page as hidden.
- **How to reverse or migrate:** No product/schema/protocol/dependency/persisted-data change. Retire
  the diagnostic once a supported topology yields causal timing evidence.
- **Does a human still need to decide after completion?:** No product decision is required; the
  executable review mechanism must be reconciled from repository/tool authority before another diff.

## Q-014 — Make epoch transition lossless and acceptance crash-recoverable

- **Raised:** 2026-07-20, P07 revision 01, `human_scratch_reviewer`
- **Source proposal:**
  `reviews/P07-review-01.md#q-proposal-p07-01-01--make-epoch-transition-lossless-and-acceptance-crash-recoverable`
- **Context and evidence:** The linked-hybrid Access/Member versus financial Person split and
  sender-bound invite direction are sound. However, clause 19 would discard an active remaining
  member's old vault key and reinitialize from the new snapshot without preserving locally durable,
  encrypted, `pushed=false` old-epoch operations that are absent from the owner's watermark. The
  replay model also requires impossible atomicity across server SQL membership/invite rows and a
  zero-knowledge client-encrypted CRDT Person/link. Current automated and installed-CLI evidence
  executes neither recovery journey.
- **Why the frozen requirement/repository does not fully decide it:** HS-011/HS-012 require secure
  access, exactly one linked Person and preserved financial history; the sync contract requires
  immediate crash-safe encrypted local writes. Those authorities decide the outcomes, but not the
  epoch-envelope history or cross-store reconciliation mechanism. The zero-knowledge boundary
  precludes pretending that the server can transact encrypted CRDT state.
- **Options considered:** (A) retain per-epoch envelopes for continuously authorized members and use
  a durable client transition journal, plus a server-atomic membership/client-idempotent Person
  saga; (B) keep only the current envelope and discard old local work; (C) wait for every member to
  be online before removal; (D) let the server create plaintext Person/link data; or (E) drop
  automatic linking. Only A preserves offline data, permits immediate revocation, maintains zero
  knowledge and satisfies both requirements. B loses data, C is unenforceable, D breaks privacy and
  E violates HS-012.
- **Default selected for continued work:** Choose A. P07 revision 02 remains an empty product range
  and may write only `evidence/P07/implementation-02.md`. Retain the linked-hybrid ADR and unaffected
  clauses. Replace clause 19 with versioned per-epoch envelope/history access restricted to
  continuously active memberships, a crash-safe transition journal, exact re-encryption of every
  local unpushed old-epoch operation before old-key zeroization, and idempotent retry. Replace the
  cross-store transaction claim with a capability-bound snapshot check, one atomic SQL invite
  consume/reactivation returning a stable membership UUID, and deterministic encrypted CRDT
  reconciliation resumed on every load until Person/link/selection sync. Use authenticated
  `crypto_box` as the sole P08 envelope convention and defer default-vault creation during
  invite-aware first-user onboarding.
- **Decision hierarchy basis:** Frozen access/link requirements, then established zero-knowledge and
  local-first crash-safety contracts, financial-data preservation, least privilege and the smallest
  no-code evidence correction.
- **Impact and risk:** Per-epoch envelopes add encrypted-key history and access-policy surface;
  transition journals can duplicate an operation if identity mapping is inexact; client
  reconciliation can loop or duplicate People without deterministic membership keys. Require exact
  active-membership authorization, epoch/op idempotency, journal crash tests and CRDT convergence
  tests. Acceptance must additionally cover active-offline edit/rotate/reconnect/reload and injected
  transition crashes; removed-client denial; old-write conflict/retry; snapshot-capability privacy;
  crashes after SQL acceptance and before every Person/selection/sync boundary; concurrent-tab
  exactly-one Person/link; and the original real isolated owner/invitee/removal journey. No service
  fixture, plaintext key journal or success before reconciliation is allowed.
- **How to reverse or migrate:** The P07 correction is evidence-only. P08 must gate new writes,
  backfill epoch-0 sender/envelopes, revoke pending legacy invites and retain old-schema reads until
  migration proof. Reversal hides new UI/mutations while preserving memberships, per-epoch
  envelopes, journals and encrypted links; it must never delete pending local work or claim an old
  app can read an advanced epoch.
- **Does a human still need to decide after completion?:** No preference blocks continuation. An
  equivalently lossless locally self-wrapped journal may replace server-held encrypted envelope
  history only if it proves the same recovery and access properties.

## Q-015 — Retain both conventional and literal Meta redo parity

- **Raised:** 2026-07-20, P09 revision 01, `human_scratch_implementer`; independently supported by
  `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P09/implementation-01.md#q-proposal-p09-01-01--metay-redo-parity`; confirmed in
  `reviews/P09-review-01.md#q-proposal-adjudication`
- **Context and evidence:** The frozen requirement explicitly names Ctrl+Shift+Z and Ctrl+Y, while
  acceptance additionally requires appropriate Meta equivalents. Meta+Shift+Z is the conventional
  macOS redo gesture; Meta+Y is the literal key-for-key counterpart to Ctrl+Y. Focused unit and
  real-browser tests prove that both work outside editable targets while the guard preserves native
  input history.
- **Why the frozen requirement/repository does not fully decide it:** Neither authority states
  whether literal Ctrl+Y parity or macOS convention alone should control when both aliases can
  coexist without persisted-data impact.
- **Options considered:** (A) support Meta+Shift+Z and Meta+Y; (B) support conventional
  Meta+Shift+Z only; or (C) expose no Meta redo beyond the frozen Ctrl forms. A satisfies both
  readings, B may fail literal parity and C does not satisfy acceptance.
- **Default selected for continued work:** Choose A. Retain both Meta+Shift+Z and Meta+Y outside
  editable targets while keeping the existing input/textarea/select/contenteditable/ARIA-textbox
  guard.
- **Decision hierarchy basis:** Explicit frozen Ctrl forms and Meta-equivalent acceptance control;
  established macOS convention supports Meta+Shift+Z, and the smallest reversible extension adds
  Meta+Y without displacing it.
- **Impact and risk:** One extra non-editable-shell alias broadens parity without stealing native
  field history. P09/01's logical grouping and offline-sync findings are separate observable defects
  and do not alter this shortcut decision.
- **How to reverse or migrate:** Remove the Meta+Y predicate and its focused unit/E2E assertions.
  There is no CRDT schema, persisted data or migration impact.
- **Does a human still need to decide after completion?:** Yes, only if a future project-wide
  platform-shortcut policy prefers B. No decision blocks continuation because A is isolated,
  tested and losslessly reversible.

## Q-016 — Normalize exact alias matches with trim and NFC while preserving case

- **Raised:** 2026-07-20, P11A revision 01, `human_scratch_implementer`; independently accepted as a
  provisional remediation default by `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P11A/implementation-01.md#q-proposal-p11a-01-01--exact-alias-normalization-and-case`;
  confirmed in `reviews/P11A-review-01.md#q-proposal-adjudication`
- **Context and evidence:** The frozen text requires a typed value that matches an existing alias to
  attach it and P11A requires exact normalization/matching, but it does not define whitespace,
  Unicode canonical equivalence or case. Direct helper tests select surrounding-whitespace removal,
  Unicode NFC normalization and case-sensitive equality: precomposed and decomposed `Café` match,
  while `CAFÉ` remains distinct. Revision-01 manual review also proved the shipped management route
  does not yet use this policy and can create visually equivalent duplicates.
- **Why the frozen requirement/repository does not fully decide it:** “Matches exactly” excludes
  partial matching but does not resolve canonical Unicode equivalence or case identity.
- **Options considered:** (A) trim + NFC with case-sensitive equality; (B) trim + NFC with
  locale-independent case folding; or (C) literal UTF-16 code-unit equality with no normalization.
- **Default selected for continued work:** Choose A. Apply the one named normalization boundary to
  every production alias create/rename/exact-match path, including existing management CRUD.
- **Decision hierarchy basis:** Frozen exact-match behavior controls. Existing UI already trims;
  NFC prevents invisible canonical duplicates, while preserving case is the least destructive
  unresolved choice.
- **Impact and risk:** A may retain deliberate aliases differing only by case. B can silently merge
  intended names and has language edge cases; C permits visually indistinguishable duplicates. The
  current implementation is not approved until every production path honors A.
- **How to reverse or migrate:** Replace the centralized comparator and rerun deterministic repair
  under an explicit collision policy. Preserve raw imported descriptions and alias recovery names.
- **Does a human still need to decide after completion?:** Yes, if later language/locale research
  favors case folding. A is deterministic, reversible and data-preserving, so no decision blocks work.

## Q-017 — Reject stale destructive alias intent and repair merged graphs without resurrection

- **Raised:** 2026-07-20, P11A revision 01, `human_scratch_implementer`; independently accepted as a
  provisional remediation default by `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P11A/implementation-01.md#q-proposal-p11a-01-02--concurrent-destructive-alias-operations`;
  confirmed in `reviews/P11A-review-01.md#q-proposal-adjudication`
- **Context and evidence:** Change/remove one/all can race with reassignment, deletion or opposing
  change-all. Local expected-alias preconditions can reject stale destructive intent; cross-peer
  field merges require deterministic repair. The frozen requirement defines final graph invariants
  but not simultaneous destructive-intent precedence. Revision-01 review proved production repair is
  currently unreachable and remove-all can be reversed visibly by later repair.
- **Why the frozen requirement/repository does not fully decide it:** Offline-first convergence and
  no-chain/reference invariants decide the required outcome, but not which concurrent user's display
  preference wins.
- **Options considered:** (A) reject stale local actions, make deletion non-resurrecting and
  deterministically repair merged graphs; (B) permit a last scalar writer to resurrect tombstones;
  or (C) require distributed locks/transactions for destructive actions.
- **Default selected for continued work:** Choose A. Local actions return typed stale errors with no
  writes; merged repair preserves transactions/raw text and converges while tombstoned visible alias
  groups remain removed.
- **Decision hierarchy basis:** Frozen offline-first CRDT behavior, no-chain/reference invariants and
  preservation of user data outrank unspecified preference ordering. A is the smallest coordination-
  free reversible policy.
- **Impact and risk:** A can clear a newly assigned pointer whose target was concurrently deleted,
  leaving immutable raw text visible. Deterministic cycle election may not reflect either peer's
  preferred name, so recovery metadata must be retained without exposing an illegal public state.
- **How to reverse or migrate:** Add explicit epochs/tombstone precedence or a conflict UI, then run
  versioned canonical repair. Existing IDs, raw text and hidden former names must remain available.
- **Does a human still need to decide after completion?:** Yes, if the product later prefers explicit
  conflict surfacing. A is convergent and preservation-first, so it remains the working default.

## Q-018 — Use a finite per-alias Undo-history reachability barrier for collection

- **Raised:** 2026-07-22, P12 revision 01, `human_scratch_reviewer`
- **Source proposal:**
  `reviews/P12-review-01.md#q-proposal-p12-01-01--finite-undo-safe-alias-collection-barrier`
- **Context and evidence:** The frozen requirement requires the active production worker to rewrite
  direct references and hard-delete proven-unreferenced symlinks while user Undo/Redo remains correct.
  Revision 01 instead retains every alias changed during the current provider session until remount;
  independent review proves ordinary change-all garbage cannot collect in that active session.
- **Why the frozen requirement/repository does not fully decide it:** Neither authority defines the
  exact frontier at which an obsolete alias can no longer be resurrected by live undo/redo history.
- **Options considered:** (A) expose per-alias live history reachability from the Undo coordinator,
  defer only while reachable, subscribe to frontier changes and requeue when unreachable; (B) store
  enough immutable undo payload to recreate the alias after immediate GC; or (C) retain until provider
  remount. C is the failed current behavior and contradicts active background collection.
- **Default selected for continued work:** Choose A. Require deterministic change-all → barrier →
  Undo/Redo, history clear/trim → same-provider collection, and document replacement/disposal tests.
- **Decision hierarchy basis:** Frozen active-worker and Undo/Redo acceptance both control. A is the
  smallest explicit interface that satisfies both without expanding persisted schema or privacy
  surface; C violates the active-worker requirement and B is a larger durable-data change.
- **Impact and risk:** Maintenance gains a narrow Undo-history interface and must requeue exactly when
  reachability changes. Incorrect tracking can either delete Undo-reachable aliases or retain garbage;
  exact per-alias tests and provider lifecycle cleanup are mandatory.
- **How to reverse or migrate:** Replace the reachability provider with a durable self-contained Undo
  payload under a separately reviewed schema/privacy design. No persisted migration is required for A.
- **Does a human still need to decide after completion?:** Yes, only if a future history architecture
  prefers B. A is finite, reversible and directly satisfies both frozen behaviors, so it does not
  block continuation.

## Q-019 — Invite page has no creation branch to instrument for the credential contract

- **Raised:** 2026-07-25, P18 revision 01, `human_scratch_implementer`
- **Source proposal:**
  `evidence/P18/implementation-01.md#q-proposal-p18-01-1--invite-page-has-no-creation-branch-to-instrument`
- **Context and evidence:** HANDOFF required the credential contract on "the join/creation branch of
  `invite/[token]`" and lists that file as an allowed product path. Inspection shows the file has no
  seed-phrase UI, no `SeedPhrase*` import, no `generateNew`/`createIdentity` call and no mnemonic
  state. A locked visitor is redirected to `/unlock?returnTo=…`; the `need-auth` branch links to
  `/unlock`. There is no in-page identity creation to wrap in a credential form.
- **Why the frozen requirement/repository does not fully decide it:** The frozen requirement covers
  "vault creation and login"; HANDOFF assumes an invite-local creation branch that does not exist in
  the current code.
- **Options considered:** (A) leave the invite file untouched and rely on the shared `/unlock` and
  `/new-user` surfaces, which now carry the contract; (B) add a new inline identity-creation flow to
  the invite page; (C) report a blocker and stop.
- **Default selected for continued work:** Choose A. Both destinations the invite page delegates to
  are covered, so an invited user still gets save-on-create and fill-on-unlock.
- **Decision hierarchy basis:** Established product behavior and repository convention, then the
  smallest reversible implementation. Option B would invent unrequested onboarding UX inside a
  redemption flow.
- **Impact and risk:** Low. No invite behavior changes. If a future package adds invite-local
  identity creation, it must render the shared recovery-phrase credential fields the same way
  `SeedPhraseDisplay` does.
- **How to reverse or migrate:** Import the shared component into the invite page; no data migration.
- **Does a human still need to decide after completion?:** Yes — confirm whether an invite-local
  creation branch was intended to exist at all.

## Q-020 — Real password-manager matrix cannot be produced in this environment

- **Raised:** 2026-07-25, P18 revision 01, `human_scratch_implementer`
- **Source proposal:**
  `evidence/P18/implementation-01.md#q-proposal-p18-01-2--real-password-manager-matrix-cannot-be-produced-in-this-environment`
- **Context and evidence:** The task asks for sanitized real-manager/browser observations "where
  available". Headless Chromium loads no manager extensions and the native save prompt is browser UI
  outside the page. Vendor opt-out attributes are also unevenly documented: `data-1p-ignore` is
  documented by 1Password and `data-bwignore` is confirmed in Bitwarden source, but
  `data-lpignore="true"` (LastPass) rests on secondary sources only.
- **Why the frozen requirement/repository does not fully decide it:** No repository authority can
  substitute for observing third-party software that is not installed.
- **Options considered:** (A) assert the standards-based contract with automated evidence and document
  the limit; (B) claim manager behavior that was not observed; (C) block P18 pending a manual matrix
  on real browsers with real managers.
- **Default selected for continued work:** Choose A. The contract is implemented to each engine's
  documented, source-verified thresholds and every observable property is asserted.
- **Decision hierarchy basis:** Authoritative external specs/vendor docs, then the smallest reversible
  implementation. Option B would be false evidence.
- **Impact and risk:** Medium-low. If a specific manager still misbehaves, the fix is attribute-level
  (add or drop an opt-out, adjust the anchor) and needs no structural change. `data-lpignore` is inert
  if LastPass does not honour it.
- **How to reverse or migrate:** Attributes are declarative and individually removable.
- **Does a human still need to decide after completion?:** Yes — a human-run matrix across
  Chrome/Safari/Firefox with 1Password, Bitwarden and the built-in managers, recording prompt
  behavior only and storing no phrase.

## Q-021 — Completeness now requires the BIP39 checksum on the fill path

- **Raised:** 2026-07-25, P18 revision 01, `human_scratch_implementer`
- **Source proposal:**
  `evidence/P18/implementation-01.md#q-proposal-p18-01-3--completeness-now-requires-the-bip39-checksum`
- **Context and evidence:** At BASE, `SeedPhraseInput` reported a phrase complete when all twelve
  words were in the wordlist, ignoring the checksum, so `abandon` x12 showed "Valid recovery phrase"
  and enabled Unlock while `unlockWithSeed` would reject it. Manager fills make whole-phrase entry the
  normal case, so a corrupted fill would have been shown as valid.
- **Why the frozen requirement/repository does not fully decide it:** HS-019 requires that an invalid
  secret is never silently normalized or accepted but does not itself name the checksum; the BASE
  behavior predates this package.
- **Options considered:** (A) use the read-only `validateSeedPhrase` (wordlist + checksum) for both
  `onComplete` and the indicator; (B) leave the weaker check and let unlock fail later with a
  server-ish error; (C) route the fix to another package.
- **Default selected for continued work:** Choose A.
- **Decision hierarchy basis:** Security, privacy and preservation of user data — a false "valid" on
  a recovery credential is a correctness and trust defect — and it is directly in the fill path this
  package owns.
- **Impact and risk:** Low, and strictly tightening. Nothing previously rejected is now accepted; no
  entropy change; derivation untouched. Users who typed a checksum-invalid phrase now see "Invalid
  phrase" immediately instead of a failed unlock.
- **How to reverse or migrate:** Revert two expressions in `SeedPhraseInput.tsx`.
- **Does a human still need to decide after completion?:** Yes — confirm the earlier lenient indicator
  was not intentional.

## Question template

### Q-XXX — Short title

- **Raised:** timestamp, package, agent
- **Source proposal:** exact evidence/review path and local proposal ID
- **Context and evidence:**
- **Why the frozen requirement/repository does not fully decide it:**
- **Options considered:**
- **Default selected for continued work:**
- **Decision hierarchy basis:**
- **Impact and risk:**
- **How to reverse or migrate:**
- **Does a human still need to decide after completion?:** yes/no and why

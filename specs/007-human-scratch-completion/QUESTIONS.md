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

## Q-022 — Passkey add/list/revoke needs an authenticated mount point outside the allowlist

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-01.md` proposal P19-01-01
- **Context and evidence:** HS-020 requires a returning user to add, list and revoke passkeys, but the
  P19/01 HANDOFF authorized new list/revoke components under `src/components/features/identity/**`
  without naming any authenticated page to mount them on. The implementer therefore edited
  `src/app/(app)/settings/page.tsx` (6 lines) to render `PasskeyManager`, a path NOT in the allowlist.
- **Why the frozen requirement/repository does not fully decide it:** The requirement mandates the
  management surface exist for a signed-in user; the HANDOFF underscoped by omitting a host page.
- **Options considered:** (A) mount the manager on the existing settings page — smallest additive
  change; (B) create a new dedicated `/settings/passkeys` route; (C) ship the components unmounted and
  defer wiring to a later package, leaving the requirement partially unmet.
- **Default selected for continued work:** Provisionally accept A pending independent review — root
  did not pre-authorize it, so the P19 reviewer must rule whether the 6-line settings mount is an
  in-scope necessity or a boundary violation requiring changes_requested.
- **Decision hierarchy basis:** Correctness and completeness of the frozen requirement, balanced
  against strict path discipline; the deviation is minimal, additive and directly required by HS-020.
- **Impact and risk:** Low and additive; renders existing authorized components on an existing page.
- **How to reverse or migrate:** Revert the 6 lines in `settings/page.tsx`; components remain.
- **Does a human still need to decide after completion?:** Yes — confirm the settings page is the
  intended home for passkey management rather than a dedicated route.

## Q-023 — Virtual authenticator cannot attest real hardware passkeys

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-01.md` proposal P19-01-02
- **Context and evidence:** Headless Chromium CDP `addVirtualAuthenticator` with `hasPrf: true` does
  drive the PRF ceremony end to end, so no `blocked_external` is claimed. But it cannot exercise a
  physical YubiKey or platform authenticator (iCloud Keychain, Windows Hello) or their real PRF
  outputs; those journeys are covered only by the synthetic virtual authenticator.
- **Why the frozen requirement/repository does not fully decide it:** HS-020 asks for passkey support
  generally; it does not enumerate which authenticators must be proven on real hardware.
- **Options considered:** (A) accept virtual-authenticator coverage and document the hardware gap
  honestly; (B) block on real-device proof unavailable in this environment; (C) add a manual
  hardware charter for a human to run pre-release.
- **Default selected for continued work:** A plus a note toward C.
- **Decision hierarchy basis:** Truthful evidence over false completeness; the automated path is real
  and unfaked, and the residue is disclosed rather than hidden.
- **Impact and risk:** Low for the automated logic; residual real-hardware assurance deferred.
- **How to reverse or migrate:** Add a human hardware-authenticator test pass before release.
- **Does a human still need to decide after completion?:** Yes — decide whether a real-device passkey
  smoke test is required before shipping.

## Q-024 — Bare `pnpm format` rewrites the frozen scratch source and immutable specs

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-01.md` proposal P19-01-03
- **Context and evidence:** `pnpm format` has no path filter; run from the repo root it rewrote 15
  files under `specs/`, including `specs/human-scratch.md`, `HANDOFF.md`, `PROGRESS.md`,
  `QUESTIONS.md`, `RISKS.md` and two immutable P12 reviews. The implementer caught it via
  `git status` and reverted every file, so no drift persisted (scratch SHA still `c4121a48…`).
  CLAUDE.md instructs every worker to run `pnpm format`, while PROCESS.md forbids editing exactly what
  a bare run rewrites. A worker who does not inspect `git status` would silently corrupt the frozen
  source and its rolling checksum.
- **Why the frozen requirement/repository does not fully decide it:** The tooling default and the
  process invariant are in direct conflict and neither file resolves it.
- **Options considered:** (A) instruct workers to run scoped `pnpm format <exact paths>` and to
  `git checkout` any specs/ change before committing (root already edits ledgers via Bash to dodge the
  oxfmt hook); (B) add a format ignore/scope for `specs/**`, which is P20B/P21 configuration work;
  (C) do nothing and rely on vigilance.
- **Default selected for continued work:** A now, with B recorded for P20B/P21; root continues to edit
  all immutable ledgers through Bash rather than formatting tools.
- **Decision hierarchy basis:** Preservation of frozen sources and canonical checksums outranks
  formatting convenience.
- **Impact and risk:** High if unmitigated — silent frozen-source corruption; low once workers scope
  format and check `git status`. No drift persisted here.
- **How to reverse or migrate:** `git checkout -- specs/human-scratch.md` and the other reverted files
  (already done); configure a format scope in P20B.
- **Does a human still need to decide after completion?:** Yes — approve a permanent format
  scope/ignore for `specs/**` so the hazard cannot recur.

## Q-025 — `pnpm db:types` injects a PostHog telemetry line into generated types

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-01.md` proposal P19-01-04
- **Context and evidence:** Running `pnpm db:types` appended a PostHog telemetry line into
  `src/lib/supabase/database.types.ts`, corrupting the generated file. The implementer regenerated
  with the stray line filtered so the committed diff is purely additive (+118 lines) for the new
  `passkey_credentials` table.
- **Why the frozen requirement/repository does not fully decide it:** The generator's telemetry output
  is an environment/tooling artifact not covered by the requirement.
- **Options considered:** (A) filter the telemetry line during generation and commit only the additive
  type diff; (B) hand-write the table types; (C) commit the raw corrupted output.
- **Default selected for continued work:** A.
- **Decision hierarchy basis:** Correctness of committed source over tooling convenience.
- **Impact and risk:** Low; the committed types are clean and additive.
- **How to reverse or migrate:** Regenerate with the same filter; no product effect.
- **Does a human still need to decide after completion?:** Yes — decide whether the db:types script
  should suppress telemetry so future regenerations are clean.

## Q-026 — May a passkey-only account exist without the user ever seeing the recovery phrase?

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_reviewer`
- **Source proposal:** `reviews/P19-review-01.md` section 11, Q-PROPOSAL-P19-01R-01
- **Context and evidence:** The passkey-only creation flow generates a full-entropy BIP39 phrase,
  derives the master seed from it, then discards it without display, and no surface in the
  authenticated app can reveal it (grep-verified). Combined with blocking findings B-1 (a failed or
  cancelled ceremony strands a half-created identity whose phrase was never shown) and B-2 (a
  passkey-only user can revoke their last credential), this opens several routes to permanent, silent
  data loss. The implementer's own evidence §3 said the phrase should be "optional but recommended,
  revealed on demand" — that surface was not built.
- **Why the frozen requirement/repository does not fully decide it:** HS-020 requires passkey-only
  creation "where recoverability is clearly explained" but does not say whether warning text suffices
  or whether the phrase must remain obtainable.
- **Options considered:** (a) show the phrase during passkey-only creation; (b) add a phrase-gated
  reveal surface to settings; (c) status quo — warning text only.
- **Default selected for continued work:** For P19/02 root directs the safest data-preserving
  remediation — reorder creation so no server identity is registered before the ceremony succeeds,
  make the recovery phrase shown or revealable (reviewer-recommended (b), a reveal surface), and block
  last-credential revocation for a passkey-only vault (or gate it behind explicit phrase confirmation).
  This resolves both blockers reversibly; the exact push-strength of (a) vs (b) is left to the human.
- **Decision hierarchy basis:** Preservation of user data (#3) over convenience (#4) — the difference
  between a recoverable and an unrecoverable vault.
- **Impact and risk:** High if unresolved (silent permanent loss); the remediation is additive UI with
  no schema or protocol change.
- **How to reverse or migrate:** Additive surfaces only; removable without migration.
- **Does a human still need to decide after completion?:** Yes — a genuine product-values call on how
  hard to push a recovery phrase onto a user who chose a passkey precisely to avoid one.

## Q-027 — Reveal-phrase-in-settings is not buildable; passkey-only creation shows the phrase at creation

- **Raised:** 2026-07-25, P19 revision 02, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-02.md` section 6, Q-PROPOSAL-P19-02-01
- **Supersedes option (b) of:** [[Q-026]]
- **Context and evidence:** Q-026 recorded the reviewer's recommended default (b) — a phrase-gated
  reveal surface in settings. Implementation showed (b) is not buildable: BIP39 runs mnemonic->seed
  one-way through PBKDF2, so retaining the words for a later reveal would require persisting a mnemonic
  in plaintext, which the blocking secret-safety rule forbids. P19/02 therefore took option (a): the
  passkey-only creation flow shows the recovery phrase after the ceremony succeeds and requires
  acknowledgement before navigating away. The phrase lives in React state for one step only.
- **Why the frozen requirement/repository does not fully decide it:** HS-020 requires recoverability
  be "clearly explained" but does not resolve how aggressively to surface the phrase for a user who
  chose a passkey to avoid one.
- **Options considered:** (a) show the phrase during passkey-only creation [selected]; (b) reveal
  surface in settings [ruled out as unbuildable without a plaintext-mnemonic leak]; (c) warning text
  only [rejected — reopens B-1/B-2 loss].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Preservation of user data (#3) over convenience (#4), constrained by
  secret-safety.
- **Impact and risk:** Low and additive; closes the silent-loss route without any schema/protocol
  change. Residual product-values question is push-strength, not recoverability.
- **How to reverse or migrate:** Additive UI; removable without migration.
- **Does a human still need to decide after completion?:** Yes — confirm that showing the phrase once
  at creation (with acknowledgement) is the intended strength, given (b) is off the table.

## Q-028 — Last-credential revocation requires proving the phrase derives THIS identity

- **Raised:** 2026-07-25, P19 revision 02, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-02.md` section 6, Q-PROPOSAL-P19-02-02
- **Context and evidence:** The P19/02 HANDOFF said last-credential revocation must be gated behind
  "explicit recovery-phrase confirmation" without specifying strength. A validity-only check would be
  theatre: the public all-`abandon` vector passes the BIP39 checksum, so a user who lost their real
  phrase could still destroy their last unlock factor. The implementer therefore derives the pubkey
  hash from the entered phrase and compares it to the session identity, so only the genuine
  phrase-holder for THIS vault may revoke the last credential; a non-holder is blocked outright. This
  makes the HANDOFF's two branches (block outright vs gate behind confirmation) coincide. Verified by
  mutation: replacing the identity check with `false` fails exactly and only the targeting test.
- **Why the frozen requirement/repository does not fully decide it:** HS-020 requires "no silent
  downgrade" but does not specify the confirmation strength for destroying the last factor.
- **Options considered:** (a) validity-only checksum check [rejected — theatre]; (b) derive-and-match
  this identity [selected]; (c) block last-credential revocation outright with no override [also safe;
  (b) preserves a legitimate escape hatch for a phrase-holder].
- **Default selected for continued work:** (b).
- **Decision hierarchy basis:** Preservation of user data (#3) — a stronger gate on an irreversible
  destructive action.
- **Impact and risk:** Low; strictly tightens a destructive path. No false blocks for a real holder.
- **How to reverse or migrate:** Adjust the gate predicate; no schema change.
- **Does a human still need to decide after completion?:** Yes — confirm derive-and-match is the
  intended strength rather than an unconditional block.

## Q-029 — P08 scope: full D-013 epoch contract vs frozen-aligned secure core

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label Q-025)
- **Source proposal:** `evidence/P08/implementation-01.md` section 2, Q-025
- **Context and evidence:** Honoring D-013's full 29-clause contract would force adding `epoch` + `exact_operation_id` + peer/frontier columns to the PRESERVED P04 `vault_ops` table and rewriting the local op-admission pipeline (verified absent in `supabase/migrations/005_vault_ops.sql:235-241`). The dispatch's own rule forbids touching the boundary without a Q-proposal. Root did NOT self-adjudicate this scope reduction (highest conflict of interest); it dispatched a distinct fresh-context opus-tier adjudicator (`adjudications/P08-scope-01.md`), never P08's implementer or reviewer, ruling from the frozen text.
- **Why the frozen requirement/repository does not fully decide it:** Frozen HS-011 (`specs/human-scratch.md:307-311`) / HS-012 (`:313-315`) is a UX-and-data-model ask about *adding* users and *where* management lives; it never mentions member removal, forward secrecy, epochs, exact-op permanence, crash-safe rotation, or causal repair — the entire problem domain the epoch protocol solves.
- **Options considered:** (a) full D-013 contract as a multi-revision package with an explicit `vault_ops` boundary-change Q-approval [rejected — no frozen root; modifies preserved boundary for an unmandated goal]; (b) frozen-aligned secure core as P08/01 with the epoch machinery classified future-work carrying NO frozen mandate and NOT spun into a new package [selected].
- **Default selected for continued work:** (b) — binding independent adjudicator ruling, transcribed as D-018.
- **Decision hierarchy basis:** Frozen-traceability floor and preserved-boundary integrity (no boundary change without a frozen mandate); the boundary-safe core still fixes the only genuine security defect (placeholder redemption).
- **Impact and risk:** Low; the core fixes the real defect, preserves the P04/P05/RLS boundaries, and introduces no new regression. Removed members lose future-envelope access at the strength the existing preserved remove+rekey path already provides.
- **How to reverse or migrate:** Reopen forward-secrecy-on-removal as a future frozen requirement with its own independently reviewed ADR + `vault_ops` boundary-change Q, built on the linked-hybrid data model retained by D-013/D-018.
- **Does a human still need to decide after completion?:** Yes — human audits the adjudicator's ruling after the fact and confirms the epoch machinery stays out of goal scope. Resolved binding by D-018.

## Q-030 — HS-012 user display-name storage source

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label Q-026)
- **Source proposal:** `evidence/P08/implementation-01.md` section 5, Q-026
- **Context and evidence:** HS-012 makes `Person.name` optional with the user name as fallback. The display name lives in the optional encrypted-CRDT `Person.name` only — no server plaintext, no reintroduced user blob (consistent with D-012/P06). The fallback is a deterministic vault-scoped "Member N" label via a centralized `resolvePersonDisplayName` resolver; a raw or truncated pubkey hash is never rendered.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text says "uses the user name as a fallback if it has an associated user" but does not specify whether a separate encrypted per-membership profile name is also wanted, nor the exact non-identifying fallback.
- **Options considered:** (a) encrypted-CRDT `Person.name` only + deterministic non-identifying fallback [selected]; (b) additional encrypted per-membership profile name; (c) server-visible name [rejected — violates zero-knowledge].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Client-side-encryption invariant (#1) and preservation of financial state; the resolver keeps identity non-identifying.
- **Impact and risk:** Low; reversible resolver change, no schema impact.
- **How to reverse or migrate:** Adjust the resolver / add an encrypted profile field later; no destructive migration.
- **Does a human still need to decide after completion?:** Yes — confirm whether an encrypted per-membership profile name is also wanted beyond `Person.name`.

## Q-031 — HS-012 legacy duplicate-link repair

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label Q-027)
- **Source proposal:** `evidence/P08/implementation-01.md` section 5, Q-027
- **Context and evidence:** Idempotent linkage uses a deterministic key derived from the stable pubkey hash so new links cannot create duplicates. Any ambiguous pre-existing duplicate links are PRESERVED — never auto-merged or deleted. Automatic convergent repair of pre-existing duplicates is deferred (it needs the claim/winner maps from the excised full contract).
- **Why the frozen requirement/repository does not fully decide it:** The frozen text asks for one auto-Person per user but is silent on how to reconcile pre-existing ambiguous duplicate links.
- **Options considered:** (a) preserve duplicates, deterministic idempotent key prevents new ones [selected]; (b) auto-merge/auto-delete duplicates [rejected — destructive, needs winner maps not in scope].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Preservation of user data (#3) — a data-preserving default over a destructive merge.
- **Impact and risk:** Low; no data loss. A residual duplicate may persist until a future repair pass.
- **How to reverse or migrate:** Add a reviewed convergent-repair pass later if forward-secrecy/tenure work lands.
- **Does a human still need to decide after completion?:** Yes — confirm deferring convergent duplicate repair is acceptable.

## Q-032 — HS-012 linkage identifier: pubkey hash vs membership UUID

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label Q-028)
- **Source proposal:** `evidence/P08/implementation-01.md` section 5, Q-028
- **Context and evidence:** Linkage keys on the stable P04 `pubkey_hash` (matches the existing `linkedUserId` and the frozen "user identifier"), not the membership UUID. Re-add of the same identity reuses the same Person. Membership-UUID linkage (needed for tenure/history semantics) is deferred with the excised full contract.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text says "optional user id (pub key hash?)" — it suggests the pubkey hash but does not settle pubkey-hash vs membership-UUID for tenure semantics.
- **Options considered:** (a) key on stable pubkey hash [selected — matches frozen hint and existing `linkedUserId`]; (b) key on membership UUID [deferred — needed only for tenure/history, which is out of the frozen scope].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Frozen-text alignment ("pub key hash?") and consistency with the existing P04 identifier.
- **Impact and risk:** Low; re-add reuses one Person. Tenure-scoped history is not modeled (out of frozen scope per D-018).
- **How to reverse or migrate:** Introduce membership-UUID linkage if tenure semantics become a future frozen requirement.
- **Does a human still need to decide after completion?:** Yes — confirm pubkey-hash linkage is the intended identifier.

## Q-033 — Strict 100k/200ms settlement benchmark is not met; carry measured evidence + follow-up

- **Raised:** 2026-07-26, P16E revision 01, `human_scratch_implementer` (implementer local label Q-PROPOSAL-P16E-01-001); adjudicated 2026-07-27 by distinct reviewer `p16e-reviewer-01`
- **Source proposal:** `evidence/P16E/implementation-01.md` section 13 (Q-PROPOSAL-P16E-01-001); reviewer ruling `reviews/P16E-review-01.md` section A
- **Context and evidence:** The production 100k settlement benchmark measures ~0.8s (implementer 0.76-0.86s; reviewer independently 0.93-1.10s), not the approximate 200ms §14 target. Scaling stays near-linear (~10-11x wall for 10x input) and correctness output is exact (100k qualifying, 75k contributions, 2 obligations, 0 issues, conservation true). The residual cost lies inside P16B's `snapshotMaterialized*` defensive materialization boundary, which is byte-unchanged in the P16E range (`src/lib/**` = 0 changed files) and was mandated by a prior immutable P16B/05 FAIL review for invalid-data honesty.
- **Why the frozen requirement/repository does not fully decide it:** §14 (spec 575-588) and the P16B benchmark clause state an explicit disjunction: meet ~200ms OR provide measured evidence and a documented optimization follow-up WITHOUT claiming the target passed. The frozen text permits the second branch; it does not fix which branch a given package must land in.
- **Options considered:** (a) report measured evidence + follow-up, target explicitly unclaimed [selected — reviewer ruled this is exactly §14's second branch, taken honestly]; (b) claim the target passed [rejected — false]; (c) treat ~0.8s as a scope reduction requiring an independent scope adjudicator [rejected by the reviewer on the merits — committed scope always included this branch, so it is not a reduction/supersession].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Frozen §14 disjunction + P16B's already-reviewed defensive-materialization boundary (byte-unchanged here); honest reporting.
- **Impact and risk:** Low-medium. The 200ms target is not abandoned — R-020 stays open and the production optimization follow-up is carried to P21. No correctness impact; scaling is near-linear.
- **How to reverse or migrate:** A later reviewed pass may memoize the projection / intern safely to approach 200ms; if that lands, R-020 can close.
- **Does a human still need to decide after completion?:** Yes — confirm that deferring the strict 200ms optimization (measured ~0.8s, near-linear, correct) to a post-FS-001 follow-up is acceptable.

### Q-034 — P17A vault root wiring for field-rule and preference collections

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local Q-P17A-DEFAULTS); adjudicated 2026-07-27 by root (scope COMPLETION, not reduction — no independent adjudicator required)
- **Source proposal:** `evidence/P17A/implementation-01.md`; corroborated by `src/lib/crdt/schema.ts:416-421` NOTE
- **Context and evidence:** Rev-01 defined `fieldRuleSchema` and `userAutomationPreferenceSchema` as wire contracts but did NOT add them as `vaultSchema` root keys, because a required root collection forces a matching seed in `src/lib/crdt/defaults.ts` (`getDefaultVaultState`/`initializeVaultDefaults`), which was outside the paths rev-01 wrote. Without root registration the collections do not exist in the vault and the engine is unreachable.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text mandates the behavior (rules persisted per vault, preferences per user per vault) but does not name the file that registers the collection; loro-mirror's `required:false` does not make a root VaultInput key optional, so defaults.ts must change.
- **Options considered:** (a) wire the collections into `vaultSchema` + seed `defaults.ts` as part of P17A [selected — required by P17A acceptance]; (b) defer wiring to a later package [rejected — leaves P17A engine dead code and cannot satisfy "preferences per user per vault"/"migrate existing rules"].
- **Default selected for continued work:** (a). `src/lib/crdt/**` (incl. defaults.ts) added to P17A allowed paths for a continuation of rev 01; additive wiring only, all other-package vault behavior preserved byte-for-byte, P16C `replaceTransactionAllocations` and settlement untouched.
- **Decision hierarchy basis:** Explicit P17A task text ("preferences are per user per vault", "migrate existing rules safely") + repository reality (root-key registration requires defaults.ts). Completing committed scope, not reducing it.
- **Impact and risk:** Low. Additive root collections + empty-collection seed; migration guarded.
- **How to reverse or migrate:** Remove the root keys + seed; the typed wire contracts remain harmless.
- **Does a human still need to decide after completion?:** No — required by acceptance; noted for audit.

### Q-035 — P17A application at import and migration at hydration

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local Q-P17A-IMPORT-WIRING); adjudicated 2026-07-27 by root
- **Source proposal:** `evidence/P17A/implementation-01.md`
- **Context and evidence:** Rev-01 shipped `apply.ts` (rule application) and `migration.ts` (legacy->field-rule) as pure, tested functions but did NOT invoke them at the import-commit or vault-hydration call-sites, which were outside rev-01's paths. As delivered, no imported transaction has rules applied and no existing vault is migrated.
- **Why the frozen requirement/repository does not fully decide it:** The P17A task text is explicit ("Apply the highest rule deterministically at import and explicit bulk operations"; "migrate existing rules safely") but the exact call-sites are implementation detail the implementer must locate.
- **Options considered:** (a) wire application at the import seam + migration at hydration within P17A rev-01 continuation [selected — P17A acceptance]; (b) defer invocation to P17B-D [rejected — P17B/C/D own UI, not the engine's import/hydration invocation, which the task assigns to P17A].
- **Default selected for continued work:** (a). Import seam (`src/hooks/use-import-state.ts` and the vault import-commit/hydration path under `src/lib/crdt/**`) added to allowed paths; preserve all existing P14 import + P16C behavior; application must be bounded, idempotent, convergent and route allocations only through P16C.
- **Decision hierarchy basis:** Explicit P17A task text; package boundary (engine invocation = P17A, UI = P17B-D).
- **Impact and risk:** Medium — touches the import path; mitigated by idempotence/convergence tests and preserving P14 behavior.
- **How to reverse or migrate:** Remove the call-site invocation; pure functions remain unused but harmless.
- **Does a human still need to decide after completion?:** No.

### Q-036 — P17A description-alias rule write ownership

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local Q-P17A-ALIAS-WRITE); adjudicated 2026-07-27 by root
- **Source proposal:** `evidence/P17A/implementation-01.md`; boundary at `src/lib/crdt/description-aliases.ts:204`
- **Context and evidence:** A description-alias field rule, when it matches an imported transaction, must set the transaction's `descriptionAliasId`. The existing P11 write path (`description-aliases.ts`) owns that mutation; rev-01's `apply.ts` planned alias rules but did not write, pending an ownership ruling.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text says description rules "set the field on a transaction" at import but does not say whether P17A writes directly or reuses P11's function.
- **Options considered:** (a) P17A invokes P11's existing alias-write function additively (P11 owns the mechanics, P17A owns the rule-driven trigger) [selected]; (b) P17A writes `descriptionAliasId` directly [rejected — bypasses P11's boundary/invariants]; (c) defer to P17C [rejected — P17C is the inline UI, not the import-time engine application].
- **Default selected for continued work:** (a). `src/lib/crdt/description-aliases.ts` allowed for an ADDITIVE integration point only; all existing P11 alias behavior preserved; any behavior change to P11 code is a finding, raise a Q.
- **Decision hierarchy basis:** Package boundaries; reuse over duplication; preserve P11 invariants.
- **Impact and risk:** Low-medium; mitigated by additive-only rule and preservation tests.
- **How to reverse or migrate:** Remove the rule-driven invocation; P11 path unchanged.
- **Does a human still need to decide after completion?:** No.

### Q-037 — P17A legacy-rule migration semantics

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local Q-P17A-MIGRATION-SEMANTICS); adjudicated 2026-07-27 by root
- **Source proposal:** `evidence/P17A/implementation-01.md`; `src/lib/domain/automation/migration.ts`
- **Context and evidence:** Legacy generic rules use `contains`/`regex`; the new model is EXACT-description. Rev-01 migrates a single `contains`-description rule to an exact rule (a documented tightening) and SKIPS regex/notes/amount/multi-condition/`setStatus` rules, retaining the legacy rule untouched (no data loss), reporting each skip.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text specifies the new exact model and that existing rules migrate safely, but does not enumerate the mapping for every legacy shape.
- **Options considered:** (a) convert single contains-description to exact, retain-and-report all other legacy shapes with no data loss [selected — safe, reversible, lossless]; (b) attempt lossy conversion of regex/multi rules [rejected — semantics not equivalent, risks silent behavior change]; (c) delete unconvertible legacy rules [rejected — data loss].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** No-data-loss + honest reporting; safest reversible default.
- **Impact and risk:** Low; legacy rules retained, skips audited.
- **How to reverse or migrate:** A later reviewed pass can widen conversion; retained legacy rules make it reversible.
- **Does a human still need to decide after completion?:** Yes — confirm the contains->exact tightening and the retained-legacy skip taxonomy are acceptable.

### Q-038 — P17A field-rule application at the PRODUCTION import commit

- **Raised:** 2026-07-27, P17A revision 01 continuation, `p17a-implementer-01b` (local Q-P17A-PROD-IMPORT); **RESOLVED IN_P17A** 2026-07-27 by an INDEPENDENT opus-tier adjudicator (high confidence; root barred from self-ruling a potential reduction)
- **Source proposal:** `evidence/P17A/implementation-01.md`
- **Context and evidence:** The continuation delivered a working application library `src/lib/crdt/field-rules.ts` (apply highest rule at import + bulk apply-all/apply-newer on a `VaultState`) and wired migration reachably at hydration, but did NOT invoke application at the production import-commit seam `src/app/(app)/imports/new/page.tsx` (`createImportBatch`). Root confirmed by inspection: (1) that seam is a UI page component, outside P17A's engine/no-UI allowed paths; (2) `ApplicationVaultState = Omit<VaultState,"descriptionAliases">` (`src/lib/crdt/context.tsx:182`) structurally forbids the P11 description-alias write through the application mutate context, so wiring it additively is not possible without changing that cross-package type boundary; (3) `field-rules.ts` apply is invoked nowhere under `src/app/**`/`src/hooks/**`/`src/components/**`. Net: rules apply via the library and at hydration/migration, but a real user import does not yet apply them.
- **Why the frozen requirement/repository does not fully decide it:** `specs/human-scratch.md:248-295` requires "apply the highest rule at import"; it does not state whether that means a callable engine (delivered) or the invocation wired into the production import event, nor which of P17A vs the P17B-D UI packages owns that wiring given the `ApplicationVaultState` boundary.
- **Options considered:** (a) production-import invocation is IN P17A committed scope — a further continuation must wire it (and resolve the `ApplicationVaultState` alias-write barrier) before P17A can pass [default / block-standing]; (b) the production-import invocation belongs to a later UI package (P17B/C/D) and P17A passes as the model+engine+migration+library slice [only if the frozen text/package split clearly assigns it there].
- **Default selected for continued work:** (a) — the adjudicator ruled IN_P17A with high confidence (frozen `human-scratch.md:272,287`; P17A 'apply at import' acceptance + 'Integration for import application' test; P16C-at-import constraint; PROGRESS 'import engine' row), and ruled the `ApplicationVaultState` alias barrier is inside P17A (reuse the P11 alias path). A continuation `p17a-implementer-01c` wires application at `createImportBatch`; scope completion, not reduction.
- **Decision hierarchy basis:** Binding rule — a scope reduction/supersession is adjudicated by a DISTINCT fresh-context reviewer, never the implementer/reviewer/root, defaulting to the block standing.
- **Impact and risk:** High for scope correctness — determines whether HS-007's user-visible "apply at import" is satisfied by P17A or later. Low code risk either way (additive).
- **How to reverse or migrate:** N/A pending ruling; either a further continuation wires it, or it is explicitly reallocated to a named later package in the ledger.
- **Does a human still need to decide after completion?:** No — the adjudicator's ruling governs; recorded for audit.

### Q-039 — P17A manual-row projection semantics for rule application

- **Raised:** 2026-07-27, P17A revision 01 continuation, `p17a-implementer-01b` (local Q-P17A-MANUAL-MATCH); reversible default accepted 2026-07-27 by root (human confirms)
- **Source proposal:** `evidence/P17A/implementation-01.md`; `src/lib/crdt/field-rules.ts`
- **Context and evidence:** Rule application must skip manual rows for description rules while including them for tag/allocation rules. The continuation projects a row as manual via `isManual = tx.importId == null` and matches description via `descriptionText = tx.description || null`.
- **Why the frozen requirement/repository does not fully decide it:** `specs/human-scratch.md:269` and `:294-295` describe manual-vs-imported handling but do not give the exact field predicate.
- **Options considered:** (a) `importId == null` ⇒ manual; description text from `tx.description` [selected — the obvious, reversible reading]; (b) a dedicated manual flag [rejected — no such field exists; would need schema change].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Safest reversible default consistent with the repository's existing import/manual distinction.
- **Impact and risk:** Low; predicate is localized and easily changed if the human reads the frozen text differently.
- **How to reverse or migrate:** Swap the predicate in `field-rules.ts`; no data migration.
- **Does a human still need to decide after completion?:** Yes — confirm `importId == null` is the intended manual-row test against human-scratch.md:269,294-295.

### Q-P17B-03 — Apply-mode SELECT choice persistence is an unmet frozen HS-007 requirement

- **Raised:** 2026-07-27, P17B review, root (from `p17b-reviewer-01` verify-not-trust caveat, confirmed by root against frozen text)
- **Source proposal:** `reviews/P17B-review-01.md` (Q-P17B-02 adjudication + honest caveat); `evidence/P17B/implementation-01.md` Q-PROPOSAL-P17B-02
- **Context and evidence:** Frozen text `specs/human-scratch.md:270` states: "We remember the user's last choices for **the select and check boxes** in a new user preferences part of the vault." P17B persists the check boxes plus field/tag-mode but NOT the four-mode apply **select**, because the P17A `userAutomationPreferences` schema (in `src/lib/crdt/schema.ts`) has no `applyMode` slot and `schema.ts` is a P17B hard boundary. Root re-read the frozen block and CONFIRMED the requirement is real and only partially delivered — this is not a P17B defect (P17B correctly stayed inside its boundary) but a genuine remaining slice of HS-007.
- **Why the frozen requirement/repository does not fully decide it:** Frozen text mandates persisting the select choice but does not name which package delivers it or whether the preference key is per-field or global; the P17A schema deliberately shipped without the slot.
- **Options considered:** (a) additively extend `userAutomationPreferences` in a later HS-007 package (P17C or P17D) to add an `applyMode` slot and wire the editor's mode select to persist/restore it; (b) reopen passed P17A with a schema revision; (c) drop it (VIOLATES frozen text — rejected).
- **Default selected for continued work:** Option (a), owner **P17D** (the HS-007 polish/parity package, which already extends the automation preference surface for tag/allocation parity). P17D additively adds the `applyMode` slot to `userAutomationPreferences` and wires the shared `FieldRuleEditor` mode select through `nextUserPreference`/persistence. P17C may subsume it if it proves more natural when the popup lands. This is completing HS-007's committed scope (MORE work, additive) — NOT a scope reduction — so the independent scope adjudicator is not triggered; the requirement stays tracked and HS-007 stays UNCHECKED until it is delivered and all of P17A-D pass.
- **Decision hierarchy basis:** Frozen text is authoritative and requires persistence; the block-standing/complete-the-scope default compels delivering it, not dropping it.
- **Impact and risk:** Low-medium; additive schema field + editor wiring, no data migration for existing vaults (absent key = current default `updateNew`). Deferring to P17D risks nothing because HS-007 cannot be checked until then regardless.
- **How to reverse or migrate:** Remove the additive preference key; absent key falls back to the session default. No destructive migration.
- **Does a human still need to decide after completion?:** Yes — confirm the P17D ownership and that per-field-vs-global apply-mode persistence matches the human's intent for `human-scratch.md:270`.
- **RESOLVED 2026-07-27 (P17D/01, delivered):** P17D additively added the optional `lastApplyMode` slot to `userAutomationPreferenceSchema` (`StringEnum` of the four frozen modes, `required:false`, no migration) and wired the shared editor's four-mode apply SELECT through `apply-mode.ts` + `preferences.ts`/`field-rule-mutations.ts` to persist on save and re-read on open. `p17d-reviewer-01` PASS confirmed choose -> reopen -> restored via E2E. `human-scratch.md:270` (select AND checkboxes) is now fully delivered. CLOSED.

### Q-P17C-01..06 — Inline description-rule popup/robot presentational defaults (all faithful, non-blocking)

- **Raised:** 2026-07-27, P17C implement, `p17c-implementer-01`; adjudicated by `p17c-reviewer-01` and root at P17C review.
- **Source proposal:** `evidence/P17C/implementation-01.md` local proposals Q-P17C-01..06; `reviews/P17C-review-01.md` adjudication.
- **Context and evidence:** Frozen text `specs/human-scratch.md:279-295` describes the robot-on-transaction-rows behaviour, the contextual popup reusing the automations UI, and apply-this/all/new — but leaves UI placement, glyph, drift copy, confirm-affordance, and the exact meaning of "actively being edited" open. Each was implemented as the safest reversible default: **01** portaled Radix Popover from the robot trigger with `onOpenAutoFocus` prevented (no table resize/scroll/focus-steal; content width `w-96` in code — evidence's `w-72` is stale prose); **02** lucide `Bot` glyph, muted normal / destructive on drift, `data-drift` + descriptive `aria-label`; **03** drift-explainer copy stating the current description differs from its rule and can be reconciled; **04** a single "apply to this transaction" button with no extra confirm dialog (additive, re-runnable, drift visibly clears); **05** "actively being edited" = the description cell input holding focus (robot hidden while focused, reappears on commit/blur); **06** the four-mode apply SELECT is NOT persisted (no `applyMode` schema slot yet) and defaults per session, while already-persisted field-mode/scope checkboxes ARE honoured via `draftFromRule`.
- **Why the frozen requirement/repository does not fully decide it:** The frozen block specifies behaviour and constraints (don't resize/occlude/steal focus; normal vs red drift; reuse the automations UI) but not the concrete widget/glyph/copy; those are presentation choices with no schema or engine impact.
- **Options considered:** implement the safest reversible default now and record for human confirmation (chosen), vs. pause for human wording/placement input (rejected under the no-pause rule for reversible UI defaults).
- **Default selected for continued work:** the defaults above stand. **Q-P17C-06 apply-mode SELECT persistence is explicitly deferred to Q-P17B-03 (owner P17D)** — it needs an additive `applyMode` slot in the `userAutomationPreferences` schema (a P17C hard boundary), so P17C correctly persists only the checkboxes/field-mode. This is NOT a P17C gap and NOT a scope reduction.
- **Decision hierarchy basis:** frozen text is authoritative on behaviour/constraints (all honoured) and silent on the presentational specifics; reversible-default rule applies. Q-P17C-06 defers to the tracked Q-P17B-03 so `human-scratch.md:270` stays honestly incomplete until P17D.
- **Impact and risk:** low — presentational/copy only; no schema/engine change; each is a one-file reversible tweak.
- **How to reverse or migrate:** change the widget/glyph/copy/threshold in the transactions-feature files; no data migration. Apply-mode persistence is added additively by P17D (absent key → session default).
- **Does a human still need to decide after completion?:** Yes — confirm the glyph, drift copy, no-confirm apply-this affordance, and the "focus == actively editing" interpretation match intent; and (via Q-P17B-03) confirm P17D's apply-mode persistence shape.

### Q-P17D-01 — Manual-row tag/allocation matching requires a `field-rules.ts` alias-name projection (RESOLVED: authorized)

- **Raised:** 2026-07-27, P17D/01 implement, `p17d-implementer-01` (local Q-P17D-MANUAL-MATCH), surfaced to root per the dispatch's "surface any engine change" instruction. **Resolved 2026-07-27 by root** (code-verified; NOT a scope reduction, so no independent adjudicator required).
- **Source proposal:** `evidence/P17D/implementation-01.md` (deliverable 3); implementer handback message. Links [[Q-P17A-MANUAL-MATCH]].
- **Context and evidence:** Frozen `specs/human-scratch.md:294-295` requires tag and person-percentage (allocation) rules to APPLY to manually-created transactions, "unlike description alias rules." Frozen `:269` states manual rows have no raw description text (only a description alias). Root VERIFIED in code (not trusting the implementer): `field-rules.ts:83-94 subjectForTransaction` projects `descriptionText` solely from raw `transaction.description`, which is empty for manual rows -> `null`; and `rules.ts:191-194 ruleMatchesSubject` short-circuits `if (subject.descriptionText == null) return false` BEFORE any field check, so no rule can currently match a manual row even though the `isManual` field-eligibility gate at `rules.ts:192` already admits tag/allocation. The matcher is deliberately alias-agnostic — `rules.ts:163` documents that "alias-aware description resolution is the caller's concern," the caller being `subjectForTransaction`. Q-P17A-MANUAL-MATCH accepted `descriptionText = tx.description || null` as an explicitly REVERSIBLE default, deferring the alias-name resolution.
- **Why the frozen requirement/repository does not fully decide it:** the frozen text mandates the behaviour but not the projection mechanism; the P17A engine intentionally left alias resolution to the caller and shipped the null default.
- **Options considered:** (a) **[SELECTED]** additively resolve a manual row's description-alias NAME (from `state.descriptionAliases[transaction.descriptionAliasId]`) as the match `descriptionText` inside `field-rules.ts`'s projection, so tag/allocation rules match manual rows by their alias name while the `isManual` gate keeps description-alias rules excluded (frozen `:268-269` preserved independently of `descriptionText`); (b) write the alias name into the raw `description` field — REJECTED: corrupts the documented manual-row provenance invariant and would make description-alias rules match manual rows; (c) drop/defer deliverable 3 (test.fixme) — REJECTED: that is a scope REDUCTION of committed frozen `:294-295` and would leave HS-007 incomplete.
- **Default selected for continued work:** Option (a), delivered in a **P17D/01 continuation** by the same implementer on top of `57487ee`. This COMPLETES committed frozen scope (MORE work), so the independent scope adjudicator is NOT triggered; it legitimately reopens the P17A `field-rules.ts` byte-identical boundary for a surgical additive projection change ONLY (the P17D dispatch pre-authorized surfacing exactly this). `rules.ts`/`apply.ts`/`migration.ts`/`import-commit.ts` stay byte-identical; `settlement.ts` and P16C `mutations.ts` stay HARD byte-identical; allocations remain P16C-only.
- **Decision hierarchy basis:** frozen text is authoritative and requires the behaviour; the complete-the-scope/block-standing default compels delivering it, not dropping it. Root code-verified there is no byte-identical alternative.
- **Impact and risk:** low-medium; a projection change threading the alias registry through `subjectForTransaction`/`targetForTransaction` + its call sites, guarded by existing passed P17A tests plus a new manual-row match test. No data migration. Description-alias rules provably unaffected (the `isManual` gate at `rules.ts:192` excludes them regardless of `descriptionText`).
- **How to reverse or migrate:** revert the projection to `tx.description || null`; no data migration.
- **Does a human still need to decide after completion?:** Yes — confirm that matching manual rows by their description-alias name is the intended reading of `:294-295`, and confirm precedence behaviour when multiple alias-name rules exist.

### Q-P17D-02 — Dead `description-rule-state.ts` superseded by `field-rule-robot-state.ts` (OPEN, non-blocking, deferred)

- **Raised:** 2026-07-27, P17D review, `p17d-reviewer-01` (non-blocking observation). Adjudicated by root as non-blocking; deferred.
- **Source proposal:** `reviews/P17D-review-01.md` non-blocking observation 1.
- **Context and evidence:** `src/components/features/transactions/description-rule-state.ts` and its unit test `tests/unit/components/description-rule-state.test.ts` are superseded by the per-field `field-rule-robot-state.ts` introduced in P17D and are no longer referenced by production code; a stale JSDoc `@link computeDescriptionRobotState` remains in `use-transaction-rule-workflow.ts:9`. All gates pass (lint 0 errors — no unused-export rule fires), so this is pure hygiene, not a correctness or boundary issue.
- **Why the frozen requirement/repository does not fully decide it:** frozen text is silent on internal module hygiene; CLAUDE.md's "no dead code / reuse-and-simplicity" is a standing style rule, not a gate failure.
- **Options considered:** (a) **[SELECTED]** defer removal to a P20/P21 cleanup sweep so the FINAL HS-007 marker is not delayed for non-blocking hygiene; (b) bounce a P17D revision solely to delete two files + fix a comment — REJECTED as disproportionate (a whole revision + re-review for zero behavioural change would delay HS-007 completion); (c) leave permanently — REJECTED (CLAUDE.md asks dead code be removed).
- **Default selected for continued work:** Option (a). HS-007 integrates now; the dead module + stale `@link` are swept during P20/P21 polish (root will dispatch the deletion to an implementer then — root never edits product code). Removal is byte-reversible and touches no engine/boundary file.
- **Decision hierarchy basis:** frozen text (authoritative) is satisfied; the block-standing default does not compel blocking a completed, reviewed, gate-green requirement on non-blocking hygiene.
- **Impact and risk:** negligible; deleting unreferenced files + one comment. No schema/engine/allocation/settlement impact.
- **How to reverse or migrate:** none needed; deletion is trivially reversible from git history.
- **Does a human still need to decide after completion?:** No — mechanical cleanup; root will action it in P20/P21.

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

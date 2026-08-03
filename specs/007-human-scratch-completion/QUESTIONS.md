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
  completed as
  `reviews/P04-review-01.md#q-proposal-p04-01-01--authorize-the-verified-request-and-user-identity-completion-range`
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
- **Does a human still need to decide after completion?:** No product preference is unresolved; root
  authorizes the exact reviewed revision-02 range and verifies no silent caller-path expansion.

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
  `src/app/(app)/layout.tsx`, `src/components/providers/vault-provider.tsx`, `playwright.config.ts`,
  `tests/e2e/helpers/realtime.ts`, `tests/e2e/realtime-security.spec.ts`, and
  `tests/e2e/vault-settings.spec.ts`. Attribute every sync/Presence initialize/cleanup before
  correcting stable dependencies; stop with a new proposal if another owning path is proven
  necessary.
- **Decision hierarchy basis:** Explicit live delivery/security/cleanup, then the connected status
  contract, evidence-backed diagnosis, least privilege and smallest reversible expansion.
- **Impact and risk:** Provider reordering can expose stale or overly broad dependencies, producing
  storms or retaining a manager across a real identity/vault change. Test bootstrap could disclose a
  secret or normalize an unsafe production fallback. Exact lifecycle, production fail-closed,
  URL/log, membership-removal and cross-vault tests remain mandatory.
- **How to reverse or migrate:** These topology/dependency/test-config changes require no data
  migration. Revert them if instrumentation worsens lifecycle behavior, retain the revision-01 grant
  schema/transport, and propose only the newly proven owner; existing grants expire in 60s.
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
  Presence is repeatedly unauthorized. Migration 007 revokes every same-scope sibling grant on each
  mint and accepts mutually exclusive extensions even though the installed client's private Presence
  join carries default Broadcast configuration plus enabled Presence. Sanitized lifecycle aggregates
  show bounded cleanup and locate the failure before SyncManager, CRDT, Loro or React.
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
  subscriptions and genuinely delivers the imported operation to the member UI without refresh. The
  journey then fills the owner editor with a new value but reuses a lazy locator constrained to the
  old value for Enter. Independent zero-retry reproduction consumes the unchanged two-minute timeout
  in that step; the snapshot shows the new value focused and the database contains import plus edit
  operations.
- **Why the frozen requirement/repository does not fully decide it:** Revision 04 authorized only
  the aggregate helper. It proved the spec-owned blocker but could not edit the journey file.
- **Options considered:** (A) re-resolve the editor by its new value and retain every assertion and
  timeout; (B) use another locator stable across value changes with explicit uniqueness/focus; (C)
  increase timeouts/retries; or (D) widen product/transport code. A is the smallest exact fix; B is
  acceptable only if it cannot depend lazily on the old value, while C hides the empty locator and D
  contradicts registered/incoming-frame evidence.
- **Default selected for continued work:** Choose A. Revision 05 may write only
  `tests/e2e/realtime-security.spec.ts`. After filling, re-resolve
  `descriptionInput(owner, editedDescription)`, optionally assert it is uniquely focused, and press
  Enter. The revision-04 helper is read-only. Do not force the action, use ambiguous `.first()`, add
  waits/retries, increase timeouts, weaken assertions or edit product/config/dependency/migration/
  unit/other E2E/SyncManager/CRDT/Loro paths.
- **Decision hierarchy basis:** HS-015 genuine live import/edit/delete and removal denial control;
  current incoming-frame evidence excludes product transport before the failing call. Repository E2E
  rules require stable selectors and behavior assertions without arbitrary waits.
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
  unchanged bounds; (B) raise the cumulative bound to four; (C) start observation after identity; or
  (D) weaken/skip/retry. A retains all evidence and isolates the named interval. B allows unrelated
  growth, C can miss late onboarding work and D waives lifecycle control.
- **Default selected for continued work:** Choose A. Revision 07 may write only
  `tests/e2e/vault-settings.spec.ts`. Immediately after awaited identity creation and before Lock,
  capture the current lifecycle snapshot. In final attribution, subtract matching pre-lock counters
  and apply the existing sync/Presence authorize `<=2` and revoke `>=1` assertions to those deltas.
  Do not raise bounds, move observer creation, add sleeps/retries or edit helper, revision-06 spec,
  provider/product/transport/migration/privileges/config/dependencies/other tests/CRDT/Loro paths.
- **Decision hierarchy basis:** HS-015 requires bounded reconnect and safe teardown, while the test
  specifically names same-vault lock/unlock. Causal before/after deltas enforce exactly that
  interval.
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
- **Source proposal:**
  `evidence/P05/implementation-07.md#q-proposal-p05-07-01--await-initial-presence-readiness-before-freezing-the-pre-lock-baseline`;
  corrected in `reviews/P05-review-07.md#corrected-q-proposal-p05-07-01`
- **Context and evidence:** The immediate post-identity snapshot is all zero because identity setup
  returns before asynchronous Presence authorization. Final deltas therefore equal cumulative sync
  2/1 and Presence 4/3. Source ordering proves a visible online avatar occurs only after the
  retained subscription is `SUBSCRIBED` and Presence state synchronizes, while both replay
  authorization requests were observed earlier.
- **Why the frozen requirement/repository does not fully decide it:** Revision 07 authorized the
  immediate snapshot but not the missing behavior readiness assertion. Responsive layout also
  renders hidden mobile and visible desktop avatars, requiring visibility filtering.
- **Options considered:** (A) require exactly one visible online avatar before snapshot; (B) poll a
  dev-specific counter; (C) sleep; (D) raise/skip/retry bounds; or (E) change product/provider. A is
  causal and user-visible; B–D are brittle or weaken evidence, and E is unsupported.
- **Default selected for continued work:** Revision 08 may write only
  `tests/e2e/vault-settings.spec.ts`. Immediately before the existing baseline, use
  `page.getByTitle(/\(online\)$/).filter({ visible: true })` and require count one within 15
  seconds. Retain observer placement, snapshot/subtraction, global timeout, all live bounds and
  authorize `<=2`/revoke `>=1`. Do not use `.first()`, bare strict `toBeVisible`, sleeps, counter
  waits, force/reload/retries, or edit any helper/product/provider/transport/migration/config/other
  path.
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
- **Source proposal:**
  `evidence/P05/implementation-08.md#q-proposal-p05-08-01--scope-subscription-attribution-to-the-current-vault`;
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
  and preserves exact proof; B couples tests to timing, C weakens evidence and D lacks product
  fault.
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
- **Source proposal:**
  `evidence/P05/implementation-09.md#q-proposal-p05-09-01--freeze-the-vaultrealtimesync-unit-clock`;
  confirmed in
  `reviews/P05-review-09.md#confirmed-q-proposal-p05-09-01--date-only-clock-for-vaultrealtimesync-units`
- **Context and evidence:** The full unit suite passes 1,167/1,170. Only the three unchanged
  `VaultRealtimeSync` cases fail before channel creation because their fixed credential expires at
  `2026-07-20T00:01:00Z` while the real review clock is later. Production correctly rejects this
  expired scope. The credential-manager cases remain green because they already inject `00:00Z`.
- **Why the frozen requirement/repository does not fully decide it:** HS-015 requires correct
  credential expiry but does not prescribe a deterministic unit clock, and revision 09 could write
  only the Realtime E2E helper/spec.
- **Options considered:** (A) fake `Date` only at fixed `2026-07-20T00:00:00Z` within the affected
  describe; (B) move fixed expiry farther into the future; (C) derive expiry from the wall clock; or
  (D) weaken production validation. A preserves the explicit chronology and real timer behavior; B
  merely defers recurrence, C obscures chronology and D is a security regression.
- **Default selected for continued work:** Choose A. Revision 10 may write only
  `tests/unit/sync/realtime.test.ts`. Add `afterEach` to the Vitest import. Within
  `describe("VaultRealtimeSync")` only, retain existing setup and use
  `vi.useFakeTimers({ toFake: ["Date"] })` plus
  `vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"))` before every case, then
  `vi.useRealTimers()` after every case. Preserve actual timeouts, intervals, immediates, microtasks
  and animation APIs; do not advance timers or change any fixture, assertion, product, helper, E2E,
  migration, config or dependency path.
- **Decision hierarchy basis:** A describe-local deterministic Date fixes the test-owned wall-clock
  dependency with the smallest reversible scope while retaining the production expiry guard and all
  HS-015 security/lifecycle evidence.
- **Impact and risk:** The three cases evaluate their documented one-minute credential before expiry
  while channel authorization, private scope, Presence opacity, disconnect and revoke assertions
  remain unchanged. Scoped restoration prevents clock leakage into other tests.
- **How to reverse or migrate:** The one-file test setup change is independently revertible with no
  production, persisted-data, schema or service impact.
- **Does a human still need to decide after completion?:** No.

## Q-012 — Apply authorized same-identity operations in sibling tabs

- **Raised:** 2026-07-20, P05 revision 10, `human_scratch_implementer`; independently confirmed and
  evidence-tightened by `human_scratch_reviewer`
- **Source proposal:**
  `evidence/P05/implementation-10.md#q-proposal-p05-10-01--apply-authorized-same-identity-operations-in-sibling-tabs`;
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
- **Options considered:** (A) remove the identity early return and rely on the established
  serialized remote-import path plus an extension-backed duplicate-tab regression; (B) add per-tab
  identity to schema/encrypted metadata/transport; (C) catch up on focus/visibility; or (D)
  reload/poll/retry. Independent Loro probing shows A is safe: origin self-import and repeated
  sibling import are version-stable and trigger zero `subscribeLocalUpdates` callbacks. B is
  disproportionate protocol surface, and C/D leave or mask broken live delivery.
- **Default selected for continued work:** Choose A. Revision 11 may write only
  `src/lib/sync/manager.ts` and `tests/e2e/tab-duplication.spec.ts`. Remove only the comment and
  `authorPubkeyHash === this.pubkeyHash` early return, retaining the serialized
  `applyRemoteUpdate(update.encryptedData)` path. Extend the existing test and its true extension-
  backed `chrome.tabs.duplicate()` helper; retain cache/hydration coverage, navigate both
  authenticated duplicates to Transactions, attach console/page-error capture before mutation, and
  create one transaction through normal UI. Without reload, focus-triggered catch-up, polling
  substitute, sleep, retry or timeout increase, require both tabs to contain exactly one matching
  row within the existing 15-second bound, exactly one permanent op for the fixture vault, zero
  receiver `sync.pushOps` delta from its pre-mutation baseline, and zero collected browser errors.
  Preserve the 60-second test timeout,
  security/grant/topic/filter/throttle/durable-catch-up/encryption behavior and every other
  product/test path.
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
- **Source proposal:**
  `reviews/P05-review-11.md#q-proposal-p05-11-r01--require-a-supported-hidden-topology-before-another-product-diff`;
  rejected source in `evidence/P05/implementation-11.md`
- **Context and evidence:** Revision 11's true extension-backed duplicate journey passes focused 1/1
  and repeated 3/3 with exact row/op/push/error assertions. The implementation evidence then claims
  a genuinely hidden installed-CLI receiver missed 15 seconds, but records neither hidden visibility
  nor causal timestamps. Independent required headless CLI runs report both opener pages `visible`;
  measured frame/import/DOM convergence is 2,549/2,549/2,591 ms with rows 1/1.
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
- **Default selected for continued work:** Choose E. Reject the proposed
  `src/lib/supabase/client.ts` worker mutation. Authorize no revision-12 product/test diff until an
  approved mechanism verifies `document.visibilityState === "hidden"` without focus/reload. A
  no-product diagnostic must record visibility at mutation, 15 seconds and eventual completion plus
  elapsed socket receipt, exact Loro import and DOM publication. Only the first late edge may select
  the next writable owner. If no supported mechanism exists within repository authority, classify
  P05 `blocked_external`, continue independent packages and recheck before dependent milestones/P21.
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
  and may write only `evidence/P07/implementation-02.md`. Retain the linked-hybrid ADR and
  unaffected clauses. Replace clause 19 with versioned per-epoch envelope/history access restricted
  to continuously active memberships, a crash-safe transition journal, exact re-encryption of every
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
- **Source proposal:** `evidence/P09/implementation-01.md#q-proposal-p09-01-01--metay-redo-parity`;
  confirmed in `reviews/P09-review-01.md#q-proposal-adjudication`
- **Context and evidence:** The frozen requirement explicitly names Ctrl+Shift+Z and Ctrl+Y, while
  acceptance additionally requires appropriate Meta equivalents. Meta+Shift+Z is the conventional
  macOS redo gesture; Meta+Y is the literal key-for-key counterpart to Ctrl+Y. Focused unit and
  real-browser tests prove that both work outside editable targets while the guard preserves native
  input history.
- **Why the frozen requirement/repository does not fully decide it:** Neither authority states
  whether literal Ctrl+Y parity or macOS convention alone should control when both aliases can
  coexist without persisted-data impact.
- **Options considered:** (A) support Meta+Shift+Z and Meta+Y; (B) support conventional Meta+Shift+Z
  only; or (C) expose no Meta redo beyond the frozen Ctrl forms. A satisfies both readings, B may
  fail literal parity and C does not satisfy acceptance.
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
  platform-shortcut policy prefers B. No decision blocks continuation because A is isolated, tested
  and losslessly reversible.

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
- **Decision hierarchy basis:** Frozen exact-match behavior controls. Existing UI already trims; NFC
  prevents invisible canonical duplicates, while preserving case is the least destructive unresolved
  choice.
- **Impact and risk:** A may retain deliberate aliases differing only by case. B can silently merge
  intended names and has language edge cases; C permits visually indistinguishable duplicates. The
  current implementation is not approved until every production path honors A.
- **How to reverse or migrate:** Replace the centralized comparator and rerun deterministic repair
  under an explicit collision policy. Preserve raw imported descriptions and alias recovery names.
- **Does a human still need to decide after completion?:** Yes, if later language/locale research
  favors case folding. A is deterministic, reversible and data-preserving, so no decision blocks
  work.

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
- **Decision hierarchy basis:** Frozen offline-first CRDT behavior, no-chain/reference invariants
  and preservation of user data outrank unspecified preference ordering. A is the smallest
  coordination- free reversible policy.
- **Impact and risk:** A can clear a newly assigned pointer whose target was concurrently deleted,
  leaving immutable raw text visible. Deterministic cycle election may not reflect either peer's
  preferred name, so recovery metadata must be retained without exposing an illegal public state.
- **How to reverse or migrate:** Add explicit epochs/tombstone precedence or a conflict UI, then run
  versioned canonical repair. Existing IDs, raw text and hidden former names must remain available.
- **Does a human still need to decide after completion?:** Yes, if the product later prefers
  explicit conflict surfacing. A is convergent and preservation-first, so it remains the working
  default.

## Q-018 — Use a finite per-alias Undo-history reachability barrier for collection

- **Raised:** 2026-07-22, P12 revision 01, `human_scratch_reviewer`
- **Source proposal:**
  `reviews/P12-review-01.md#q-proposal-p12-01-01--finite-undo-safe-alias-collection-barrier`
- **Context and evidence:** The frozen requirement requires the active production worker to rewrite
  direct references and hard-delete proven-unreferenced symlinks while user Undo/Redo remains
  correct. Revision 01 instead retains every alias changed during the current provider session until
  remount; independent review proves ordinary change-all garbage cannot collect in that active
  session.
- **Why the frozen requirement/repository does not fully decide it:** Neither authority defines the
  exact frontier at which an obsolete alias can no longer be resurrected by live undo/redo history.
- **Options considered:** (A) expose per-alias live history reachability from the Undo coordinator,
  defer only while reachable, subscribe to frontier changes and requeue when unreachable; (B) store
  enough immutable undo payload to recreate the alias after immediate GC; or (C) retain until
  provider remount. C is the failed current behavior and contradicts active background collection.
- **Default selected for continued work:** Choose A. Require deterministic change-all → barrier →
  Undo/Redo, history clear/trim → same-provider collection, and document replacement/disposal tests.
- **Decision hierarchy basis:** Frozen active-worker and Undo/Redo acceptance both control. A is the
  smallest explicit interface that satisfies both without expanding persisted schema or privacy
  surface; C violates the active-worker requirement and B is a larger durable-data change.
- **Impact and risk:** Maintenance gains a narrow Undo-history interface and must requeue exactly
  when reachability changes. Incorrect tracking can either delete Undo-reachable aliases or retain
  garbage; exact per-alias tests and provider lifecycle cleanup are mandatory.
- **How to reverse or migrate:** Replace the reachability provider with a durable self-contained
  Undo payload under a separately reviewed schema/privacy design. No persisted migration is required
  for A.
- **Does a human still need to decide after completion?:** Yes, only if a future history
  architecture prefers B. A is finite, reversible and directly satisfies both frozen behaviors, so
  it does not block continuation.

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
- **How to reverse or migrate:** Import the shared component into the invite page; no data
  migration.
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
- **Options considered:** (A) assert the standards-based contract with automated evidence and
  document the limit; (B) claim manager behavior that was not observed; (C) block P18 pending a
  manual matrix on real browsers with real managers.
- **Default selected for continued work:** Choose A. The contract is implemented to each engine's
  documented, source-verified thresholds and every observable property is asserted.
- **Decision hierarchy basis:** Authoritative external specs/vendor docs, then the smallest
  reversible implementation. Option B would be false evidence.
- **Impact and risk:** Medium-low. If a specific manager still misbehaves, the fix is
  attribute-level (add or drop an opt-out, adjust the anchor) and needs no structural change.
  `data-lpignore` is inert if LastPass does not honour it.
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
  and enabled Unlock while `unlockWithSeed` would reject it. Manager fills make whole-phrase entry
  the normal case, so a corrupted fill would have been shown as valid.
- **Why the frozen requirement/repository does not fully decide it:** HS-019 requires that an
  invalid secret is never silently normalized or accepted but does not itself name the checksum; the
  BASE behavior predates this package.
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
- **Does a human still need to decide after completion?:** Yes — confirm the earlier lenient
  indicator was not intentional.

## Q-022 — Passkey add/list/revoke needs an authenticated mount point outside the allowlist

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-01.md` proposal P19-01-01
- **Context and evidence:** HS-020 requires a returning user to add, list and revoke passkeys, but
  the P19/01 HANDOFF authorized new list/revoke components under
  `src/components/features/identity/**` without naming any authenticated page to mount them on. The
  implementer therefore edited `src/app/(app)/settings/page.tsx` (6 lines) to render
  `PasskeyManager`, a path NOT in the allowlist.
- **Why the frozen requirement/repository does not fully decide it:** The requirement mandates the
  management surface exist for a signed-in user; the HANDOFF underscoped by omitting a host page.
- **Options considered:** (A) mount the manager on the existing settings page — smallest additive
  change; (B) create a new dedicated `/settings/passkeys` route; (C) ship the components unmounted
  and defer wiring to a later package, leaving the requirement partially unmet.
- **Default selected for continued work:** Provisionally accept A pending independent review — root
  did not pre-authorize it, so the P19 reviewer must rule whether the 6-line settings mount is an
  in-scope necessity or a boundary violation requiring changes_requested.
- **Decision hierarchy basis:** Correctness and completeness of the frozen requirement, balanced
  against strict path discipline; the deviation is minimal, additive and directly required by
  HS-020.
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
- **Why the frozen requirement/repository does not fully decide it:** HS-020 asks for passkey
  support generally; it does not enumerate which authenticators must be proven on real hardware.
- **Options considered:** (A) accept virtual-authenticator coverage and document the hardware gap
  honestly; (B) block on real-device proof unavailable in this environment; (C) add a manual
  hardware charter for a human to run pre-release.
- **Default selected for continued work:** A plus a note toward C.
- **Decision hierarchy basis:** Truthful evidence over false completeness; the automated path is
  real and unfaked, and the residue is disclosed rather than hidden.
- **Impact and risk:** Low for the automated logic; residual real-hardware assurance deferred.
- **How to reverse or migrate:** Add a human hardware-authenticator test pass before release.
- **Does a human still need to decide after completion?:** Yes — decide whether a real-device
  passkey smoke test is required before shipping.

## Q-024 — Bare `pnpm format` rewrites the frozen scratch source and immutable specs

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-01.md` proposal P19-01-03
- **Context and evidence:** `pnpm format` has no path filter; run from the repo root it rewrote 15
  files under `specs/`, including `specs/human-scratch.md`, `HANDOFF.md`, `PROGRESS.md`,
  `QUESTIONS.md`, `RISKS.md` and two immutable P12 reviews. The implementer caught it via
  `git status` and reverted every file, so no drift persisted (scratch SHA still `c4121a48…`).
  CLAUDE.md instructs every worker to run `pnpm format`, while PROCESS.md forbids editing exactly
  what a bare run rewrites. A worker who does not inspect `git status` would silently corrupt the
  frozen source and its rolling checksum.
- **Why the frozen requirement/repository does not fully decide it:** The tooling default and the
  process invariant are in direct conflict and neither file resolves it.
- **Options considered:** (A) instruct workers to run scoped `pnpm format <exact paths>` and to
  `git checkout` any specs/ change before committing (root already edits ledgers via Bash to dodge
  the oxfmt hook); (B) add a format ignore/scope for `specs/**`, which is P20B/P21 configuration
  work; (C) do nothing and rely on vigilance.
- **Default selected for continued work:** A now, with B recorded for P20B/P21; root continues to
  edit all immutable ledgers through Bash rather than formatting tools.
- **Decision hierarchy basis:** Preservation of frozen sources and canonical checksums outranks
  formatting convenience.
- **Impact and risk:** High if unmitigated — silent frozen-source corruption; low once workers scope
  format and check `git status`. No drift persisted here.
- **How to reverse or migrate:** `git checkout -- specs/human-scratch.md` and the other reverted
  files (already done); configure a format scope in P20B.
- **Does a human still need to decide after completion?:** Yes — approve a permanent format
  scope/ignore for `specs/**` so the hazard cannot recur.

## Q-025 — `pnpm db:types` injects a PostHog telemetry line into generated types

- **Raised:** 2026-07-25, P19 revision 01, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-01.md` proposal P19-01-04
- **Context and evidence:** Running `pnpm db:types` appended a PostHog telemetry line into
  `src/lib/supabase/database.types.ts`, corrupting the generated file. The implementer regenerated
  with the stray line filtered so the committed diff is purely additive (+118 lines) for the new
  `passkey_credentials` table.
- **Why the frozen requirement/repository does not fully decide it:** The generator's telemetry
  output is an environment/tooling artifact not covered by the requirement.
- **Options considered:** (A) filter the telemetry line during generation and commit only the
  additive type diff; (B) hand-write the table types; (C) commit the raw corrupted output.
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
  passkey-only user can revoke their last credential), this opens several routes to permanent,
  silent data loss. The implementer's own evidence §3 said the phrase should be "optional but
  recommended, revealed on demand" — that surface was not built.
- **Why the frozen requirement/repository does not fully decide it:** HS-020 requires passkey-only
  creation "where recoverability is clearly explained" but does not say whether warning text
  suffices or whether the phrase must remain obtainable.
- **Options considered:** (a) show the phrase during passkey-only creation; (b) add a phrase-gated
  reveal surface to settings; (c) status quo — warning text only.
- **Default selected for continued work:** For P19/02 root directs the safest data-preserving
  remediation — reorder creation so no server identity is registered before the ceremony succeeds,
  make the recovery phrase shown or revealable (reviewer-recommended (b), a reveal surface), and
  block last-credential revocation for a passkey-only vault (or gate it behind explicit phrase
  confirmation). This resolves both blockers reversibly; the exact push-strength of (a) vs (b) is
  left to the human.
- **Decision hierarchy basis:** Preservation of user data (#3) over convenience (#4) — the
  difference between a recoverable and an unrecoverable vault.
- **Impact and risk:** High if unresolved (silent permanent loss); the remediation is additive UI
  with no schema or protocol change.
- **How to reverse or migrate:** Additive surfaces only; removable without migration.
- **Does a human still need to decide after completion?:** Yes — a genuine product-values call on
  how hard to push a recovery phrase onto a user who chose a passkey precisely to avoid one.

## Q-027 — Reveal-phrase-in-settings is not buildable; passkey-only creation shows the phrase at creation

- **Raised:** 2026-07-25, P19 revision 02, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-02.md` section 6, Q-PROPOSAL-P19-02-01
- **Supersedes option (b) of:** [[Q-026]]
- **Context and evidence:** Q-026 recorded the reviewer's recommended default (b) — a phrase-gated
  reveal surface in settings. Implementation showed (b) is not buildable: BIP39 runs mnemonic->seed
  one-way through PBKDF2, so retaining the words for a later reveal would require persisting a
  mnemonic in plaintext, which the blocking secret-safety rule forbids. P19/02 therefore took option
  (a): the passkey-only creation flow shows the recovery phrase after the ceremony succeeds and
  requires acknowledgement before navigating away. The phrase lives in React state for one step
  only.
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
- **Does a human still need to decide after completion?:** Yes — confirm that showing the phrase
  once at creation (with acknowledgement) is the intended strength, given (b) is off the table.

## Q-028 — Last-credential revocation requires proving the phrase derives THIS identity

- **Raised:** 2026-07-25, P19 revision 02, `human_scratch_implementer`
- **Source proposal:** `evidence/P19/implementation-02.md` section 6, Q-PROPOSAL-P19-02-02
- **Context and evidence:** The P19/02 HANDOFF said last-credential revocation must be gated behind
  "explicit recovery-phrase confirmation" without specifying strength. A validity-only check would
  be theatre: the public all-`abandon` vector passes the BIP39 checksum, so a user who lost their
  real phrase could still destroy their last unlock factor. The implementer therefore derives the
  pubkey hash from the entered phrase and compares it to the session identity, so only the genuine
  phrase-holder for THIS vault may revoke the last credential; a non-holder is blocked outright.
  This makes the HANDOFF's two branches (block outright vs gate behind confirmation) coincide.
  Verified by mutation: replacing the identity check with `false` fails exactly and only the
  targeting test.
- **Why the frozen requirement/repository does not fully decide it:** HS-020 requires "no silent
  downgrade" but does not specify the confirmation strength for destroying the last factor.
- **Options considered:** (a) validity-only checksum check [rejected — theatre]; (b)
  derive-and-match this identity [selected]; (c) block last-credential revocation outright with no
  override [also safe; (b) preserves a legitimate escape hatch for a phrase-holder].
- **Default selected for continued work:** (b).
- **Decision hierarchy basis:** Preservation of user data (#3) — a stronger gate on an irreversible
  destructive action.
- **Impact and risk:** Low; strictly tightens a destructive path. No false blocks for a real holder.
- **How to reverse or migrate:** Adjust the gate predicate; no schema change.
- **Does a human still need to decide after completion?:** Yes — confirm derive-and-match is the
  intended strength rather than an unconditional block.

## Q-029 — P08 scope: full D-013 epoch contract vs frozen-aligned secure core

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label
  Q-025)
- **Source proposal:** `evidence/P08/implementation-01.md` section 2, Q-025
- **Context and evidence:** Honoring D-013's full 29-clause contract would force adding `epoch` +
  `exact_operation_id` + peer/frontier columns to the PRESERVED P04 `vault_ops` table and rewriting
  the local op-admission pipeline (verified absent in
  `supabase/migrations/005_vault_ops.sql:235-241`). The dispatch's own rule forbids touching the
  boundary without a Q-proposal. Root did NOT self-adjudicate this scope reduction (highest conflict
  of interest); it dispatched a distinct fresh-context opus-tier adjudicator
  (`adjudications/P08-scope-01.md`), never P08's implementer or reviewer, ruling from the frozen
  text.
- **Why the frozen requirement/repository does not fully decide it:** Frozen HS-011
  (`specs/human-scratch.md:307-311`) / HS-012 (`:313-315`) is a UX-and-data-model ask about _adding_
  users and _where_ management lives; it never mentions member removal, forward secrecy, epochs,
  exact-op permanence, crash-safe rotation, or causal repair — the entire problem domain the epoch
  protocol solves.
- **Options considered:** (a) full D-013 contract as a multi-revision package with an explicit
  `vault_ops` boundary-change Q-approval [rejected — no frozen root; modifies preserved boundary for
  an unmandated goal]; (b) frozen-aligned secure core as P08/01 with the epoch machinery classified
  future-work carrying NO frozen mandate and NOT spun into a new package [selected].
- **Default selected for continued work:** (b) — binding independent adjudicator ruling, transcribed
  as D-018.
- **Decision hierarchy basis:** Frozen-traceability floor and preserved-boundary integrity (no
  boundary change without a frozen mandate); the boundary-safe core still fixes the only genuine
  security defect (placeholder redemption).
- **Impact and risk:** Low; the core fixes the real defect, preserves the P04/P05/RLS boundaries,
  and introduces no new regression. Removed members lose future-envelope access at the strength the
  existing preserved remove+rekey path already provides.
- **How to reverse or migrate:** Reopen forward-secrecy-on-removal as a future frozen requirement
  with its own independently reviewed ADR + `vault_ops` boundary-change Q, built on the
  linked-hybrid data model retained by D-013/D-018.
- **Does a human still need to decide after completion?:** Yes — human audits the adjudicator's
  ruling after the fact and confirms the epoch machinery stays out of goal scope. Resolved binding
  by D-018.

## Q-030 — HS-012 user display-name storage source

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label
  Q-026)
- **Source proposal:** `evidence/P08/implementation-01.md` section 5, Q-026
- **Context and evidence:** HS-012 makes `Person.name` optional with the user name as fallback. The
  display name lives in the optional encrypted-CRDT `Person.name` only — no server plaintext, no
  reintroduced user blob (consistent with D-012/P06). The fallback is a deterministic vault-scoped
  "Member N" label via a centralized `resolvePersonDisplayName` resolver; a raw or truncated pubkey
  hash is never rendered.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text says "uses the
  user name as a fallback if it has an associated user" but does not specify whether a separate
  encrypted per-membership profile name is also wanted, nor the exact non-identifying fallback.
- **Options considered:** (a) encrypted-CRDT `Person.name` only + deterministic non-identifying
  fallback [selected]; (b) additional encrypted per-membership profile name; (c) server-visible name
  [rejected — violates zero-knowledge].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Client-side-encryption invariant (#1) and preservation of financial
  state; the resolver keeps identity non-identifying.
- **Impact and risk:** Low; reversible resolver change, no schema impact.
- **How to reverse or migrate:** Adjust the resolver / add an encrypted profile field later; no
  destructive migration.
- **Does a human still need to decide after completion?:** Yes — confirm whether an encrypted
  per-membership profile name is also wanted beyond `Person.name`.

## Q-031 — HS-012 legacy duplicate-link repair

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label
  Q-027)
- **Source proposal:** `evidence/P08/implementation-01.md` section 5, Q-027
- **Context and evidence:** Idempotent linkage uses a deterministic key derived from the stable
  pubkey hash so new links cannot create duplicates. Any ambiguous pre-existing duplicate links are
  PRESERVED — never auto-merged or deleted. Automatic convergent repair of pre-existing duplicates
  is deferred (it needs the claim/winner maps from the excised full contract).
- **Why the frozen requirement/repository does not fully decide it:** The frozen text asks for one
  auto-Person per user but is silent on how to reconcile pre-existing ambiguous duplicate links.
- **Options considered:** (a) preserve duplicates, deterministic idempotent key prevents new ones
  [selected]; (b) auto-merge/auto-delete duplicates [rejected — destructive, needs winner maps not
  in scope].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Preservation of user data (#3) — a data-preserving default over a
  destructive merge.
- **Impact and risk:** Low; no data loss. A residual duplicate may persist until a future repair
  pass.
- **How to reverse or migrate:** Add a reviewed convergent-repair pass later if
  forward-secrecy/tenure work lands.
- **Does a human still need to decide after completion?:** Yes — confirm deferring convergent
  duplicate repair is acceptable.

## Q-032 — HS-012 linkage identifier: pubkey hash vs membership UUID

- **Raised:** 2026-07-26, P08 revision 01, `human_scratch_implementer` (implementer local label
  Q-028)
- **Source proposal:** `evidence/P08/implementation-01.md` section 5, Q-028
- **Context and evidence:** Linkage keys on the stable P04 `pubkey_hash` (matches the existing
  `linkedUserId` and the frozen "user identifier"), not the membership UUID. Re-add of the same
  identity reuses the same Person. Membership-UUID linkage (needed for tenure/history semantics) is
  deferred with the excised full contract.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text says "optional
  user id (pub key hash?)" — it suggests the pubkey hash but does not settle pubkey-hash vs
  membership-UUID for tenure semantics.
- **Options considered:** (a) key on stable pubkey hash [selected — matches frozen hint and existing
  `linkedUserId`]; (b) key on membership UUID [deferred — needed only for tenure/history, which is
  out of the frozen scope].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Frozen-text alignment ("pub key hash?") and consistency with the
  existing P04 identifier.
- **Impact and risk:** Low; re-add reuses one Person. Tenure-scoped history is not modeled (out of
  frozen scope per D-018).
- **How to reverse or migrate:** Introduce membership-UUID linkage if tenure semantics become a
  future frozen requirement.
- **Does a human still need to decide after completion?:** Yes — confirm pubkey-hash linkage is the
  intended identifier.

## Q-033 — Strict 100k/200ms settlement benchmark is not met; carry measured evidence + follow-up

- **Raised:** 2026-07-26, P16E revision 01, `human_scratch_implementer` (implementer local label
  Q-PROPOSAL-P16E-01-001); adjudicated 2026-07-27 by distinct reviewer `p16e-reviewer-01`
- **Source proposal:** `evidence/P16E/implementation-01.md` section 13 (Q-PROPOSAL-P16E-01-001);
  reviewer ruling `reviews/P16E-review-01.md` section A
- **Context and evidence:** The production 100k settlement benchmark measures ~0.8s (implementer
  0.76-0.86s; reviewer independently 0.93-1.10s), not the approximate 200ms §14 target. Scaling
  stays near-linear (~10-11x wall for 10x input) and correctness output is exact (100k qualifying,
  75k contributions, 2 obligations, 0 issues, conservation true). The residual cost lies inside
  P16B's `snapshotMaterialized*` defensive materialization boundary, which is byte-unchanged in the
  P16E range (`src/lib/**` = 0 changed files) and was mandated by a prior immutable P16B/05 FAIL
  review for invalid-data honesty.
- **Why the frozen requirement/repository does not fully decide it:** §14 (spec 575-588) and the
  P16B benchmark clause state an explicit disjunction: meet ~200ms OR provide measured evidence and
  a documented optimization follow-up WITHOUT claiming the target passed. The frozen text permits
  the second branch; it does not fix which branch a given package must land in.
- **Options considered:** (a) report measured evidence + follow-up, target explicitly unclaimed
  [selected — reviewer ruled this is exactly §14's second branch, taken honestly]; (b) claim the
  target passed [rejected — false]; (c) treat ~0.8s as a scope reduction requiring an independent
  scope adjudicator [rejected by the reviewer on the merits — committed scope always included this
  branch, so it is not a reduction/supersession].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Frozen §14 disjunction + P16B's already-reviewed
  defensive-materialization boundary (byte-unchanged here); honest reporting.
- **Impact and risk:** Low-medium. The 200ms target is not abandoned — R-020 stays open and the
  production optimization follow-up is carried to P21. No correctness impact; scaling is
  near-linear.
- **How to reverse or migrate:** A later reviewed pass may memoize the projection / intern safely to
  approach 200ms; if that lands, R-020 can close.
- **Does a human still need to decide after completion?:** Yes — confirm that deferring the strict
  200ms optimization (measured ~0.8s, near-linear, correct) to a post-FS-001 follow-up is
  acceptable.

### Q-034 — P17A vault root wiring for field-rule and preference collections

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local Q-P17A-DEFAULTS);
  adjudicated 2026-07-27 by root (scope COMPLETION, not reduction — no independent adjudicator
  required)
- **Source proposal:** `evidence/P17A/implementation-01.md`; corroborated by
  `src/lib/crdt/schema.ts:416-421` NOTE
- **Context and evidence:** Rev-01 defined `fieldRuleSchema` and `userAutomationPreferenceSchema` as
  wire contracts but did NOT add them as `vaultSchema` root keys, because a required root collection
  forces a matching seed in `src/lib/crdt/defaults.ts`
  (`getDefaultVaultState`/`initializeVaultDefaults`), which was outside the paths rev-01 wrote.
  Without root registration the collections do not exist in the vault and the engine is unreachable.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text mandates the
  behavior (rules persisted per vault, preferences per user per vault) but does not name the file
  that registers the collection; loro-mirror's `required:false` does not make a root VaultInput key
  optional, so defaults.ts must change.
- **Options considered:** (a) wire the collections into `vaultSchema` + seed `defaults.ts` as part
  of P17A [selected — required by P17A acceptance]; (b) defer wiring to a later package [rejected —
  leaves P17A engine dead code and cannot satisfy "preferences per user per vault"/"migrate existing
  rules"].
- **Default selected for continued work:** (a). `src/lib/crdt/**` (incl. defaults.ts) added to P17A
  allowed paths for a continuation of rev 01; additive wiring only, all other-package vault behavior
  preserved byte-for-byte, P16C `replaceTransactionAllocations` and settlement untouched.
- **Decision hierarchy basis:** Explicit P17A task text ("preferences are per user per vault",
  "migrate existing rules safely") + repository reality (root-key registration requires
  defaults.ts). Completing committed scope, not reducing it.
- **Impact and risk:** Low. Additive root collections + empty-collection seed; migration guarded.
- **How to reverse or migrate:** Remove the root keys + seed; the typed wire contracts remain
  harmless.
- **Does a human still need to decide after completion?:** No — required by acceptance; noted for
  audit.

### Q-035 — P17A application at import and migration at hydration

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local
  Q-P17A-IMPORT-WIRING); adjudicated 2026-07-27 by root
- **Source proposal:** `evidence/P17A/implementation-01.md`
- **Context and evidence:** Rev-01 shipped `apply.ts` (rule application) and `migration.ts`
  (legacy->field-rule) as pure, tested functions but did NOT invoke them at the import-commit or
  vault-hydration call-sites, which were outside rev-01's paths. As delivered, no imported
  transaction has rules applied and no existing vault is migrated.
- **Why the frozen requirement/repository does not fully decide it:** The P17A task text is explicit
  ("Apply the highest rule deterministically at import and explicit bulk operations"; "migrate
  existing rules safely") but the exact call-sites are implementation detail the implementer must
  locate.
- **Options considered:** (a) wire application at the import seam + migration at hydration within
  P17A rev-01 continuation [selected — P17A acceptance]; (b) defer invocation to P17B-D [rejected —
  P17B/C/D own UI, not the engine's import/hydration invocation, which the task assigns to P17A].
- **Default selected for continued work:** (a). Import seam (`src/hooks/use-import-state.ts` and the
  vault import-commit/hydration path under `src/lib/crdt/**`) added to allowed paths; preserve all
  existing P14 import + P16C behavior; application must be bounded, idempotent, convergent and route
  allocations only through P16C.
- **Decision hierarchy basis:** Explicit P17A task text; package boundary (engine invocation = P17A,
  UI = P17B-D).
- **Impact and risk:** Medium — touches the import path; mitigated by idempotence/convergence tests
  and preserving P14 behavior.
- **How to reverse or migrate:** Remove the call-site invocation; pure functions remain unused but
  harmless.
- **Does a human still need to decide after completion?:** No.

### Q-036 — P17A description-alias rule write ownership

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local Q-P17A-ALIAS-WRITE);
  adjudicated 2026-07-27 by root
- **Source proposal:** `evidence/P17A/implementation-01.md`; boundary at
  `src/lib/crdt/description-aliases.ts:204`
- **Context and evidence:** A description-alias field rule, when it matches an imported transaction,
  must set the transaction's `descriptionAliasId`. The existing P11 write path
  (`description-aliases.ts`) owns that mutation; rev-01's `apply.ts` planned alias rules but did not
  write, pending an ownership ruling.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text says
  description rules "set the field on a transaction" at import but does not say whether P17A writes
  directly or reuses P11's function.
- **Options considered:** (a) P17A invokes P11's existing alias-write function additively (P11 owns
  the mechanics, P17A owns the rule-driven trigger) [selected]; (b) P17A writes `descriptionAliasId`
  directly [rejected — bypasses P11's boundary/invariants]; (c) defer to P17C [rejected — P17C is
  the inline UI, not the import-time engine application].
- **Default selected for continued work:** (a). `src/lib/crdt/description-aliases.ts` allowed for an
  ADDITIVE integration point only; all existing P11 alias behavior preserved; any behavior change to
  P11 code is a finding, raise a Q.
- **Decision hierarchy basis:** Package boundaries; reuse over duplication; preserve P11 invariants.
- **Impact and risk:** Low-medium; mitigated by additive-only rule and preservation tests.
- **How to reverse or migrate:** Remove the rule-driven invocation; P11 path unchanged.
- **Does a human still need to decide after completion?:** No.

### Q-037 — P17A legacy-rule migration semantics

- **Raised:** 2026-07-27, P17A revision 01, `human_scratch_implementer` (local
  Q-P17A-MIGRATION-SEMANTICS); adjudicated 2026-07-27 by root
- **Source proposal:** `evidence/P17A/implementation-01.md`;
  `src/lib/domain/automation/migration.ts`
- **Context and evidence:** Legacy generic rules use `contains`/`regex`; the new model is
  EXACT-description. Rev-01 migrates a single `contains`-description rule to an exact rule (a
  documented tightening) and SKIPS regex/notes/amount/multi-condition/`setStatus` rules, retaining
  the legacy rule untouched (no data loss), reporting each skip.
- **Why the frozen requirement/repository does not fully decide it:** The frozen text specifies the
  new exact model and that existing rules migrate safely, but does not enumerate the mapping for
  every legacy shape.
- **Options considered:** (a) convert single contains-description to exact, retain-and-report all
  other legacy shapes with no data loss [selected — safe, reversible, lossless]; (b) attempt lossy
  conversion of regex/multi rules [rejected — semantics not equivalent, risks silent behavior
  change]; (c) delete unconvertible legacy rules [rejected — data loss].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** No-data-loss + honest reporting; safest reversible default.
- **Impact and risk:** Low; legacy rules retained, skips audited.
- **How to reverse or migrate:** A later reviewed pass can widen conversion; retained legacy rules
  make it reversible.
- **Does a human still need to decide after completion?:** Yes — confirm the contains->exact
  tightening and the retained-legacy skip taxonomy are acceptable.

### Q-038 — P17A field-rule application at the PRODUCTION import commit

- **Raised:** 2026-07-27, P17A revision 01 continuation, `p17a-implementer-01b` (local
  Q-P17A-PROD-IMPORT); **RESOLVED IN_P17A** 2026-07-27 by an INDEPENDENT opus-tier adjudicator (high
  confidence; root barred from self-ruling a potential reduction)
- **Source proposal:** `evidence/P17A/implementation-01.md`
- **Context and evidence:** The continuation delivered a working application library
  `src/lib/crdt/field-rules.ts` (apply highest rule at import + bulk apply-all/apply-newer on a
  `VaultState`) and wired migration reachably at hydration, but did NOT invoke application at the
  production import-commit seam `src/app/(app)/imports/new/page.tsx` (`createImportBatch`). Root
  confirmed by inspection: (1) that seam is a UI page component, outside P17A's engine/no-UI allowed
  paths; (2) `ApplicationVaultState = Omit<VaultState,"descriptionAliases">`
  (`src/lib/crdt/context.tsx:182`) structurally forbids the P11 description-alias write through the
  application mutate context, so wiring it additively is not possible without changing that
  cross-package type boundary; (3) `field-rules.ts` apply is invoked nowhere under
  `src/app/**`/`src/hooks/**`/`src/components/**`. Net: rules apply via the library and at
  hydration/migration, but a real user import does not yet apply them.
- **Why the frozen requirement/repository does not fully decide it:**
  `specs/human-scratch.md:248-295` requires "apply the highest rule at import"; it does not state
  whether that means a callable engine (delivered) or the invocation wired into the production
  import event, nor which of P17A vs the P17B-D UI packages owns that wiring given the
  `ApplicationVaultState` boundary.
- **Options considered:** (a) production-import invocation is IN P17A committed scope — a further
  continuation must wire it (and resolve the `ApplicationVaultState` alias-write barrier) before
  P17A can pass [default / block-standing]; (b) the production-import invocation belongs to a later
  UI package (P17B/C/D) and P17A passes as the model+engine+migration+library slice [only if the
  frozen text/package split clearly assigns it there].
- **Default selected for continued work:** (a) — the adjudicator ruled IN_P17A with high confidence
  (frozen `human-scratch.md:272,287`; P17A 'apply at import' acceptance + 'Integration for import
  application' test; P16C-at-import constraint; PROGRESS 'import engine' row), and ruled the
  `ApplicationVaultState` alias barrier is inside P17A (reuse the P11 alias path). A continuation
  `p17a-implementer-01c` wires application at `createImportBatch`; scope completion, not reduction.
- **Decision hierarchy basis:** Binding rule — a scope reduction/supersession is adjudicated by a
  DISTINCT fresh-context reviewer, never the implementer/reviewer/root, defaulting to the block
  standing.
- **Impact and risk:** High for scope correctness — determines whether HS-007's user-visible "apply
  at import" is satisfied by P17A or later. Low code risk either way (additive).
- **How to reverse or migrate:** N/A pending ruling; either a further continuation wires it, or it
  is explicitly reallocated to a named later package in the ledger.
- **Does a human still need to decide after completion?:** No — the adjudicator's ruling governs;
  recorded for audit.

### Q-039 — P17A manual-row projection semantics for rule application

- **Raised:** 2026-07-27, P17A revision 01 continuation, `p17a-implementer-01b` (local
  Q-P17A-MANUAL-MATCH); reversible default accepted 2026-07-27 by root (human confirms)
- **Source proposal:** `evidence/P17A/implementation-01.md`; `src/lib/crdt/field-rules.ts`
- **Context and evidence:** Rule application must skip manual rows for description rules while
  including them for tag/allocation rules. The continuation projects a row as manual via
  `isManual = tx.importId == null` and matches description via
  `descriptionText = tx.description || null`.
- **Why the frozen requirement/repository does not fully decide it:** `specs/human-scratch.md:269`
  and `:294-295` describe manual-vs-imported handling but do not give the exact field predicate.
- **Options considered:** (a) `importId == null` ⇒ manual; description text from `tx.description`
  [selected — the obvious, reversible reading]; (b) a dedicated manual flag [rejected — no such
  field exists; would need schema change].
- **Default selected for continued work:** (a).
- **Decision hierarchy basis:** Safest reversible default consistent with the repository's existing
  import/manual distinction.
- **Impact and risk:** Low; predicate is localized and easily changed if the human reads the frozen
  text differently.
- **How to reverse or migrate:** Swap the predicate in `field-rules.ts`; no data migration.
- **Does a human still need to decide after completion?:** Yes — confirm `importId == null` is the
  intended manual-row test against human-scratch.md:269,294-295.

### Q-P17B-03 — Apply-mode SELECT choice persistence is an unmet frozen HS-007 requirement

- **Raised:** 2026-07-27, P17B review, root (from `p17b-reviewer-01` verify-not-trust caveat,
  confirmed by root against frozen text)
- **Source proposal:** `reviews/P17B-review-01.md` (Q-P17B-02 adjudication + honest caveat);
  `evidence/P17B/implementation-01.md` Q-PROPOSAL-P17B-02
- **Context and evidence:** Frozen text `specs/human-scratch.md:270` states: "We remember the user's
  last choices for **the select and check boxes** in a new user preferences part of the vault." P17B
  persists the check boxes plus field/tag-mode but NOT the four-mode apply **select**, because the
  P17A `userAutomationPreferences` schema (in `src/lib/crdt/schema.ts`) has no `applyMode` slot and
  `schema.ts` is a P17B hard boundary. Root re-read the frozen block and CONFIRMED the requirement
  is real and only partially delivered — this is not a P17B defect (P17B correctly stayed inside its
  boundary) but a genuine remaining slice of HS-007.
- **Why the frozen requirement/repository does not fully decide it:** Frozen text mandates
  persisting the select choice but does not name which package delivers it or whether the preference
  key is per-field or global; the P17A schema deliberately shipped without the slot.
- **Options considered:** (a) additively extend `userAutomationPreferences` in a later HS-007
  package (P17C or P17D) to add an `applyMode` slot and wire the editor's mode select to
  persist/restore it; (b) reopen passed P17A with a schema revision; (c) drop it (VIOLATES frozen
  text — rejected).
- **Default selected for continued work:** Option (a), owner **P17D** (the HS-007 polish/parity
  package, which already extends the automation preference surface for tag/allocation parity). P17D
  additively adds the `applyMode` slot to `userAutomationPreferences` and wires the shared
  `FieldRuleEditor` mode select through `nextUserPreference`/persistence. P17C may subsume it if it
  proves more natural when the popup lands. This is completing HS-007's committed scope (MORE work,
  additive) — NOT a scope reduction — so the independent scope adjudicator is not triggered; the
  requirement stays tracked and HS-007 stays UNCHECKED until it is delivered and all of P17A-D pass.
- **Decision hierarchy basis:** Frozen text is authoritative and requires persistence; the
  block-standing/complete-the-scope default compels delivering it, not dropping it.
- **Impact and risk:** Low-medium; additive schema field + editor wiring, no data migration for
  existing vaults (absent key = current default `updateNew`). Deferring to P17D risks nothing
  because HS-007 cannot be checked until then regardless.
- **How to reverse or migrate:** Remove the additive preference key; absent key falls back to the
  session default. No destructive migration.
- **Does a human still need to decide after completion?:** Yes — confirm the P17D ownership and that
  per-field-vs-global apply-mode persistence matches the human's intent for `human-scratch.md:270`.
- **RESOLVED 2026-07-27 (P17D/01, delivered):** P17D additively added the optional `lastApplyMode`
  slot to `userAutomationPreferenceSchema` (`StringEnum` of the four frozen modes, `required:false`,
  no migration) and wired the shared editor's four-mode apply SELECT through `apply-mode.ts` +
  `preferences.ts`/`field-rule-mutations.ts` to persist on save and re-read on open.
  `p17d-reviewer-01` PASS confirmed choose -> reopen -> restored via E2E. `human-scratch.md:270`
  (select AND checkboxes) is now fully delivered. CLOSED.

### Q-P17C-01..06 — Inline description-rule popup/robot presentational defaults (all faithful, non-blocking)

- **Raised:** 2026-07-27, P17C implement, `p17c-implementer-01`; adjudicated by `p17c-reviewer-01`
  and root at P17C review.
- **Source proposal:** `evidence/P17C/implementation-01.md` local proposals Q-P17C-01..06;
  `reviews/P17C-review-01.md` adjudication.
- **Context and evidence:** Frozen text `specs/human-scratch.md:279-295` describes the
  robot-on-transaction-rows behaviour, the contextual popup reusing the automations UI, and
  apply-this/all/new — but leaves UI placement, glyph, drift copy, confirm-affordance, and the exact
  meaning of "actively being edited" open. Each was implemented as the safest reversible default:
  **01** portaled Radix Popover from the robot trigger with `onOpenAutoFocus` prevented (no table
  resize/scroll/focus-steal; content width `w-96` in code — evidence's `w-72` is stale prose);
  **02** lucide `Bot` glyph, muted normal / destructive on drift, `data-drift` + descriptive
  `aria-label`; **03** drift-explainer copy stating the current description differs from its rule
  and can be reconciled; **04** a single "apply to this transaction" button with no extra confirm
  dialog (additive, re-runnable, drift visibly clears); **05** "actively being edited" = the
  description cell input holding focus (robot hidden while focused, reappears on commit/blur);
  **06** the four-mode apply SELECT is NOT persisted (no `applyMode` schema slot yet) and defaults
  per session, while already-persisted field-mode/scope checkboxes ARE honoured via `draftFromRule`.
- **Why the frozen requirement/repository does not fully decide it:** The frozen block specifies
  behaviour and constraints (don't resize/occlude/steal focus; normal vs red drift; reuse the
  automations UI) but not the concrete widget/glyph/copy; those are presentation choices with no
  schema or engine impact.
- **Options considered:** implement the safest reversible default now and record for human
  confirmation (chosen), vs. pause for human wording/placement input (rejected under the no-pause
  rule for reversible UI defaults).
- **Default selected for continued work:** the defaults above stand. **Q-P17C-06 apply-mode SELECT
  persistence is explicitly deferred to Q-P17B-03 (owner P17D)** — it needs an additive `applyMode`
  slot in the `userAutomationPreferences` schema (a P17C hard boundary), so P17C correctly persists
  only the checkboxes/field-mode. This is NOT a P17C gap and NOT a scope reduction.
- **Decision hierarchy basis:** frozen text is authoritative on behaviour/constraints (all honoured)
  and silent on the presentational specifics; reversible-default rule applies. Q-P17C-06 defers to
  the tracked Q-P17B-03 so `human-scratch.md:270` stays honestly incomplete until P17D.
- **Impact and risk:** low — presentational/copy only; no schema/engine change; each is a one-file
  reversible tweak.
- **How to reverse or migrate:** change the widget/glyph/copy/threshold in the transactions-feature
  files; no data migration. Apply-mode persistence is added additively by P17D (absent key → session
  default).
- **Does a human still need to decide after completion?:** Yes — confirm the glyph, drift copy,
  no-confirm apply-this affordance, and the "focus == actively editing" interpretation match intent;
  and (via Q-P17B-03) confirm P17D's apply-mode persistence shape.

### Q-P17D-01 — Manual-row tag/allocation matching requires a `field-rules.ts` alias-name projection (RESOLVED: authorized)

- **Raised:** 2026-07-27, P17D/01 implement, `p17d-implementer-01` (local Q-P17D-MANUAL-MATCH),
  surfaced to root per the dispatch's "surface any engine change" instruction. **Resolved 2026-07-27
  by root** (code-verified; NOT a scope reduction, so no independent adjudicator required).
- **Source proposal:** `evidence/P17D/implementation-01.md` (deliverable 3); implementer handback
  message. Links [[Q-P17A-MANUAL-MATCH]].
- **Context and evidence:** Frozen `specs/human-scratch.md:294-295` requires tag and
  person-percentage (allocation) rules to APPLY to manually-created transactions, "unlike
  description alias rules." Frozen `:269` states manual rows have no raw description text (only a
  description alias). Root VERIFIED in code (not trusting the implementer):
  `field-rules.ts:83-94 subjectForTransaction` projects `descriptionText` solely from raw
  `transaction.description`, which is empty for manual rows -> `null`; and
  `rules.ts:191-194 ruleMatchesSubject` short-circuits
  `if (subject.descriptionText == null) return false` BEFORE any field check, so no rule can
  currently match a manual row even though the `isManual` field-eligibility gate at `rules.ts:192`
  already admits tag/allocation. The matcher is deliberately alias-agnostic — `rules.ts:163`
  documents that "alias-aware description resolution is the caller's concern," the caller being
  `subjectForTransaction`. Q-P17A-MANUAL-MATCH accepted `descriptionText = tx.description || null`
  as an explicitly REVERSIBLE default, deferring the alias-name resolution.
- **Why the frozen requirement/repository does not fully decide it:** the frozen text mandates the
  behaviour but not the projection mechanism; the P17A engine intentionally left alias resolution to
  the caller and shipped the null default.
- **Options considered:** (a) **[SELECTED]** additively resolve a manual row's description-alias
  NAME (from `state.descriptionAliases[transaction.descriptionAliasId]`) as the match
  `descriptionText` inside `field-rules.ts`'s projection, so tag/allocation rules match manual rows
  by their alias name while the `isManual` gate keeps description-alias rules excluded (frozen
  `:268-269` preserved independently of `descriptionText`); (b) write the alias name into the raw
  `description` field — REJECTED: corrupts the documented manual-row provenance invariant and would
  make description-alias rules match manual rows; (c) drop/defer deliverable 3 (test.fixme) —
  REJECTED: that is a scope REDUCTION of committed frozen `:294-295` and would leave HS-007
  incomplete.
- **Default selected for continued work:** Option (a), delivered in a **P17D/01 continuation** by
  the same implementer on top of `57487ee`. This COMPLETES committed frozen scope (MORE work), so
  the independent scope adjudicator is NOT triggered; it legitimately reopens the P17A
  `field-rules.ts` byte-identical boundary for a surgical additive projection change ONLY (the P17D
  dispatch pre-authorized surfacing exactly this).
  `rules.ts`/`apply.ts`/`migration.ts`/`import-commit.ts` stay byte-identical; `settlement.ts` and
  P16C `mutations.ts` stay HARD byte-identical; allocations remain P16C-only.
- **Decision hierarchy basis:** frozen text is authoritative and requires the behaviour; the
  complete-the-scope/block-standing default compels delivering it, not dropping it. Root
  code-verified there is no byte-identical alternative.
- **Impact and risk:** low-medium; a projection change threading the alias registry through
  `subjectForTransaction`/`targetForTransaction` + its call sites, guarded by existing passed P17A
  tests plus a new manual-row match test. No data migration. Description-alias rules provably
  unaffected (the `isManual` gate at `rules.ts:192` excludes them regardless of `descriptionText`).
- **How to reverse or migrate:** revert the projection to `tx.description || null`; no data
  migration.
- **Does a human still need to decide after completion?:** Yes — confirm that matching manual rows
  by their description-alias name is the intended reading of `:294-295`, and confirm precedence
  behaviour when multiple alias-name rules exist.

### Q-P17D-02 — Dead `description-rule-state.ts` superseded by `field-rule-robot-state.ts` (OPEN, non-blocking, deferred)

- **Raised:** 2026-07-27, P17D review, `p17d-reviewer-01` (non-blocking observation). Adjudicated by
  root as non-blocking; deferred.
- **Source proposal:** `reviews/P17D-review-01.md` non-blocking observation 1.
- **Context and evidence:** `src/components/features/transactions/description-rule-state.ts` and its
  unit test `tests/unit/components/description-rule-state.test.ts` are superseded by the per-field
  `field-rule-robot-state.ts` introduced in P17D and are no longer referenced by production code; a
  stale JSDoc `@link computeDescriptionRobotState` remains in `use-transaction-rule-workflow.ts:9`.
  All gates pass (lint 0 errors — no unused-export rule fires), so this is pure hygiene, not a
  correctness or boundary issue.
- **Why the frozen requirement/repository does not fully decide it:** frozen text is silent on
  internal module hygiene; CLAUDE.md's "no dead code / reuse-and-simplicity" is a standing style
  rule, not a gate failure.
- **Options considered:** (a) **[SELECTED]** defer removal to a P20/P21 cleanup sweep so the FINAL
  HS-007 marker is not delayed for non-blocking hygiene; (b) bounce a P17D revision solely to delete
  two files + fix a comment — REJECTED as disproportionate (a whole revision + re-review for zero
  behavioural change would delay HS-007 completion); (c) leave permanently — REJECTED (CLAUDE.md
  asks dead code be removed).
- **Default selected for continued work:** Option (a). HS-007 integrates now; the dead module +
  stale `@link` are swept during P20/P21 polish (root will dispatch the deletion to an implementer
  then — root never edits product code). Removal is byte-reversible and touches no engine/boundary
  file.
- **Decision hierarchy basis:** frozen text (authoritative) is satisfied; the block-standing default
  does not compel blocking a completed, reviewed, gate-green requirement on non-blocking hygiene.
- **Impact and risk:** negligible; deleting unreferenced files + one comment. No
  schema/engine/allocation/settlement impact.
- **How to reverse or migrate:** none needed; deletion is trivially reversible from git history.
- **Does a human still need to decide after completion?:** No — mechanical cleanup; root will action
  it in P20/P21.

### Q-P10-01 — Abrupt-tab-close presence retraction is bounded by ephemeral expiry, not the unload handler (OPEN, non-blocking, default in place)

- **Raised:** 2026-07-27, P10 implement, `p10-implementer-01` (Q-proposal with reversible default
  already implemented).
- **Source proposal:** `evidence/P10/implementation-01.md`; P10 handback Q-P10-01.
- **Context and evidence:** On deliberate navigation, route change, blur and unmount the session
  emits an immediate `untrack` retraction, so its indicator clears at once. On an ABRUPT tab close
  the `untrack` frame is emitted but the realtime socket tears down before the server processes it,
  so that session's indicator persists until Loro ephemeral expiry (`PRESENCE_TIMEOUT_MS`, Loro's
  ~30s default) — the same path a crashed tab already takes. State is therefore never wrong, only
  briefly stale on hard close.
- **Why the frozen requirement/repository does not fully decide it:** frozen `:161-163` requires
  using Loro ephemeral state for presence + active transaction and (via the task brief) expiring
  stale sessions and recovering across reconnects; it does not specify an instantaneous hard-close
  retraction, and expiry IS the ephemeral model's designed backstop.
- **Options considered:** (a) **[SELECTED]** accept ephemeral expiry as the hard-close backstop with
  `PRESENCE_TIMEOUT_MS` at Loro's 30s; (b) lower the timeout — REJECTED as default (proportionally
  more heartbeat/refresh traffic for a rare case), but a single-constant reversible change; (c) add
  a server-side disconnect webhook to retract instantly — REJECTED for P10 (new server surface + P05
  grant scope beyond the frozen ephemeral-presence requirement), additive later if desired.
- **Default selected for continued work:** Option (a), already in place. Immediate retraction on
  every graceful path; expiry backstop only on abrupt close/crash.
- **Decision hierarchy basis:** frozen text satisfied (ephemeral expiry is the model's own staleness
  mechanism); block-standing default does not compel a new server surface.
- **Impact and risk:** low — worst case a ~30s-stale indicator after a hard close, never an
  incorrect one. Tunable by one constant.
- **How to reverse or migrate:** change `PRESENCE_TIMEOUT_MS` or add a disconnect hook later; both
  additive/reversible.
- **Does a human still need to decide after completion?:** No — reversible default; revisit only if
  product wants sub-30s hard-close clearing.

### Q-P10-02 — Presence editing-field granularity is the cell, not the character (OPEN, non-blocking, default in place)

- **Raised:** 2026-07-27, P10 implement, `p10-implementer-01` (Q-proposal with reversible default
  already implemented).
- **Source proposal:** `evidence/P10/implementation-01.md`; P10 handback Q-P10-02.
- **Context and evidence:** presence reports which transaction row + which FIELD/cell a session is
  editing. Loro `Cursor` (character-position) semantics are only meaningful for `LoroText`; vault
  cells are LWW map values, not `LoroText`, so there is no character-offset to broadcast. The
  implementation reports cell-level editing-field presence.
- **Why the frozen requirement/repository does not fully decide it:** frozen text names "active
  transaction" and "editing field"; cell-level satisfies "editing field". Character-level cursors
  would require modelling cells as `LoroText`, an FS/schema change outside HS-003's committed scope.
- **Options considered:** (a) **[SELECTED]** cell-level editing-field granularity; (b)
  character-level cursor presence — REJECTED (requires converting cells to `LoroText`, an
  FS-boundary/schema change beyond this package).
- **Default selected for continued work:** Option (a), already in place.
- **Decision hierarchy basis:** frozen text satisfied at the field/cell level; character-level is
  not asked for and would cross a package boundary.
- **Impact and risk:** none within scope; a future character-level upgrade would be a separate
  schema-modelling package.
- **How to reverse or migrate:** additive later if cells ever become `LoroText`.
- **Does a human still need to decide after completion?:** No — cell-level meets the frozen
  requirement.

### Q-P20A-01 — Marketing tone preference (plain/declarative vs warmer)

- **Raised:** 2026-07-27, P20A, `p20a-implementer-01` (recorded by root)
- **Source proposal:** `evidence/P20A/implementation-01.md`, Q-proposal 1
- **Question:** the rewritten landing copy is plain and declarative; a warmer register is possible.
- **Options considered:** (a) **[SELECTED]** plain, declarative, factual copy; (b) warmer/friendlier
  tone.
- **Default selected for continued work:** Option (a), already in place — factual accuracy wins
  without pausing (frozen: "clear, succinct and not too markety").
- **Decision hierarchy basis:** frozen text prefers non-markety clarity; tone is presentational.
- **Impact and risk:** none; purely a wording preference, reversible.
- **How to reverse or migrate:** edit copy strings in the landing components later.
- **Does a human still need to decide after completion?:** No — a human may re-tune tone anytime;
  not a gate.

### Q-P20A-02 — Crypto source-comment vs corrected marketing mismatch (follow-up sweep)

- **Raised:** 2026-07-27, P20A, `p20a-implementer-01` (recorded by root)
- **Source proposal:** `evidence/P20A/implementation-01.md`, Q-proposal 2
- **Question:** P20A corrected the marketing copy to state vault data uses **XSalsa20-Poly1305**
  (`crypto_secretbox_easy` in `src/lib/crypto/encryption.ts`) and **HKDF-SHA256** key derivation. A
  code comment in `src/lib/crypto/encryption.ts` and the column comment in
  `supabase/migrations/005_vault_ops.sql` still say "XChaCha20-Poly1305" (genuine XChaCha20 is used
  only on the presence channel). Not a security defect — both are sound constructions — but the
  source comments now disagree with the corrected copy.
- **Options considered:** (a) **[SELECTED]** leave the `src/lib/**` + migration comments untouched
  in P20A (out of its marketing-only scope) and record a follow-up; (b) edit those comments in P20A
  — REJECTED (crosses the P20A editable boundary into `src/lib/**` and a migration).
- **Default selected for continued work:** Option (a) — implementer correctly did NOT touch those
  files.
- **Decision hierarchy basis:** P20A scope is marketing pages only; comment hygiene in engine/crypto
  files is out of scope.
- **Impact and risk:** low — comment-only mismatch, no runtime effect. Track for the P20/P21 cleanup
  sweep alongside [[diagnose-overscoped-stalls]]-style hygiene (cf. Q-P17D-02 dead-code sweep).
- **How to reverse or migrate:** a later hygiene commit corrects the two comments to XSalsa20/HKDF.
- **Does a human still need to decide after completion?:** No — mechanical comment fix; scheduled
  for P21 sweep.

### Q-P20A-03 — Licensing contradiction resolved by removing open-source claims

- **Raised:** 2026-07-27, P20A, `p20a-implementer-01` (recorded by root)
- **Source proposal:** `evidence/P20A/implementation-01.md`, Q-proposal 3
- **Question:** the landing pages claimed "Open source under MIT license" with an "Open Source" nav
  item and an auditability claim, but `README.md` states the project is proprietary/all-rights-
  reserved, there is no `LICENSE` file, and `package.json` is `"private": true`. The claim is
  therefore false as shipped.
- **Options considered:** (a) **[SELECTED]** remove the open-source/MIT/auditability claims
  (truthful given current repo state); (b) keep the claims and add a real `LICENSE` + fix `README`
  to make the project actually open source — REJECTED for P20A (would require a licensing decision +
  files outside the marketing scope; not the coordinator's or implementer's call to make
  unilaterally).
- **Default selected for continued work:** Option (a) — safe reversible default: do not advertise
  what is not true today.
- **Decision hierarchy basis:** frozen text demands truthful marketing; an unbacked license claim
  violates "no feature/claim advertised before it is real".
- **Impact and risk:** none negative; if the project is later made open source the claims can return
  with a real LICENSE.
- **How to reverse or migrate:** re-add the claims once a `LICENSE` exists and `README` is updated.
- **Does a human still need to decide after completion?:** Yes — IF the intent is open source, a
  human must add a `LICENSE` and update `README`/`package.json`; until then the truthful default
  stands. Not a completion gate for HS-016.

### Q-P20A-04 — Dead-but-working re-key-on-removal machinery (product decision, out of P20A scope)

- **Raised:** 2026-07-27, P20A, `p20a-reviewer-01` (recorded by root)
- **Source proposal:** `reviews/P20A-review-01.md`, non-blocking observation 1 (surfaced while
  verifying blocking finding B1)
- **Question:** the vault re-key machinery is fully built and tested but never wired to a caller:
  `rekeyVault`/`performCompleteRekey` (`src/lib/crypto/rekey.ts:50,120`), the tRPC
  `membership.rekey` procedure (`src/server/routers/membership.ts`), and the `rekey_vault_members`
  SQL function (`supabase/migrations/006_rls_hardening.sql:161`, covered by
  `tests/database/rls-audit.sql:91-107`). Member removal (`AccessMembersSection.tsx`) calls only
  `membership.remove`; no re-key follows, and the in-app copy correctly discloses that the key is
  NOT rotated. Should the product actually re-key on removal (invalidating a removed member's
  retained key wrap), or is cutting off future server access the intended threat model?
- **Options considered:** (a) **[SELECTED for P20A]** marketing states the truthful current behavior
  (no rotation); the wiring decision is deferred as a separate product question; (b) wire the re-key
  path into removal now — REJECTED for P20A (product/security change far outside a marketing
  package).
- **Default selected for continued work:** Option (a) — P20A B1 fix makes the copy match the shipped
  no-rotation behavior; no product change in this package.
- **Decision hierarchy basis:** HS-016 is marketing-truthfulness only; whether removal should rotate
  the key is a threat-model/product decision not committed by HS-016's frozen text.
- **Impact and risk:** if the intended model is rotation-on-removal, a removed member's retained
  ciphertext stays readable until a future wiring change — a real security consideration, tracked
  here for a human/product decision, NOT a P20A or completion gate.
- **How to reverse or migrate:** the primitives exist; a future package can wire
  `performCompleteRekey`
    - `membership.rekey` into the removal flow and then the marketing claim could truthfully return.
- **Does a human still need to decide after completion?:** Yes — a product owner should decide
  whether removal must rotate the key. Not a gate for HS-016 completion.

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

## P20B (HS-021 full-codebase style-guide sweep) — Q-proposals

These 13 proposals were surfaced by `p20b-implementer-01` in `evidence/P20B/implementation-01.md §3`
during the whole-codebase quality sweep. Root transcribes them verbatim-in-substance; they are
transparently-surfaced deferrals (not silent narrowing). None alters HS-021's committed scope.
`p20b-reviewer-01` must judge whether any deferral — especially Q-P20B-00 — is acceptable or must
bounce the package; Q-P20B-06 and Q-P20B-08 are root rule-vs-reality decisions.

### Q-P20B-00 — `pruneBuckets` destroys concurrent writes on merge (data loss)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `evidence/P20B/implementation-01.md §3 Q-0`
- **Context and evidence:** `pruneBuckets` (`mutations.ts:287-330`) splices the day/month/year list
  element and at `:325` deletes the account key outright. Reproduced independently with two-peer
  LoroDoc merges: peer A deletes `tx-1` while peer B inserts an unrelated `tx-2` into the same
  bucket → both converge to `[]`, `tx-2` lost. Not delete-specific: `moveTransaction` also calls
  `pruneBuckets` (`:573`), so merely changing a transaction's date destroys a collaborator's brand
  new unrelated transaction. The soft-delete hypothesis was investigated and REFUTED (hard delete is
  merge-safe and does not resurrect); the real defect is that pruning containers is not merge-safe.
- **Why the frozen requirement/repository does not fully decide it:** HS-021 is "sweep for code
  quality per the style guide". This is a correctness/data-loss defect, not a style discrepancy;
  fixing it is non-mechanical (14 tests + 20 assertions depend on physical removal; three production
  gaps — duplicate badge `page.tsx:335`, mutation resolvers `mutations.ts:444,:487`, nested-dup
  re-materialization `:872-900` — must close first; no tombstone GC exists). A style sweep is the
  wrong vehicle for a merge-safety redesign.
- **Options considered:** (a) **[SELECTED for continued work]** surface as a blocker-class
  Q-proposal, do NOT attempt a merge-safety redesign inside a style sweep; reviewer + P21 audit
  judge severity; (b) flip `deleteTransaction` `cascade` default to soft-delete now — REJECTED
  (motivation disproven, large blast radius, does not fix `moveTransaction`); (c) make pruning
  merge-safe / stop pruning containers — the likely real fix, but a bounded feature package of its
  own, out of P20B scope.
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** a correctness redesign is not committed by HS-021's frozen text; a
  style sweep must not silently take on a merge-safety rewrite. Flagged for human/product decision.
- **Impact and risk:** real multi-client data loss; needs two active clients to trigger. Severity
  depends on whether concurrent multi-user editing is exercised in practice. Left UNFIXED
  deliberately and transparently.
- **How to reverse or migrate:** a future package makes pruning merge-safe (or removes container
  pruning) with regression tests over the two reproduced two-peer scenarios.
- **Does a human still need to decide after completion?:** Yes — prioritize a merge-safety fix; this
  is not a HS-021 or completion gate but is a genuine data-loss risk.

### Q-P20B-01 — vault re-key machinery has zero callers (security posture)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `evidence/P20B/implementation-01.md §3 Q-1`
- **Context and evidence:** `membership.remove` deletes a member but nothing calls
  `membership.rekey`; `src/lib/crypto/rekey.ts` has zero callers. In-app copy already states the key
  is NOT rotated.
- **Why not decided by frozen text:** duplicates the standing Q-016/P20A rekey product question;
  wiring key rotation is a security-design decision, not a style fix.
- **Options considered:** (a) **[SELECTED]** leave as the standing product question already logged
  for P20A/HS-016; (b) wire rekey now — REJECTED (out of a style sweep's scope).
- **Default selected for continued work:** Option (a). See the earlier HS-016 rekey question.
- **Decision hierarchy basis:** threat-model decision, not committed by HS-021.
- **Impact and risk:** removed member's retained ciphertext stays readable; disclosed truthfully.
- **How to reverse or migrate:** future package wires `performCompleteRekey` + `membership.rekey`.
- **Does a human still need to decide after completion?:** Yes — same product decision as HS-016.

### Q-P20B-02 — `sync.getUpdates` returns all ops, ignores version vector (availability)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-2`
- **Context and evidence:** `sync.ts:127` selects every op for the vault with no limit and ignores
  the client version vector, so a 499-op vault returns all 499 on every catch-up.
- **Why not decided by frozen text:** performance/protocol change, not a style nit.
- **Options considered:** (a) **[SELECTED]** defer as a protocol/perf question; (b) redesign paging
  in P20B — REJECTED (behavior-level sync change beyond a style sweep).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** not committed by HS-021.
- **Impact and risk:** bandwidth/latency scales with vault history; correctness unaffected.
- **How to reverse or migrate:** add version-vector filtering + output limit in a sync package.
- **Does a human still need to decide after completion?:** No hard gate; product perf backlog.

### Q-P20B-03 — `sync.pushSnapshot` allows any member to overwrite snapshot, TOCTOU (integrity)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-3`
- **Context and evidence:** `sync.ts:276` lets any member overwrite the single authoritative
  snapshot with no version-vector monotonicity check and a check-then-write TOCTOU; `vault_ops` has
  an append-only trigger but snapshots do not.
- **Why not decided by frozen text:** server integrity/authorization design, not style.
- **Options considered:** (a) **[SELECTED]** defer as a server-integrity question; (b) add
  monotonicity + atomic guard now — REJECTED (schema/RLS design beyond a style sweep).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** not committed by HS-021.
- **Impact and risk:** a stale/malicious snapshot could clobber newer state; mitigated by op log.
- **How to reverse or migrate:** version-vector monotonicity check + atomic conditional write.
- **Does a human still need to decide after completion?:** Yes — integrity hardening decision.

### Q-P20B-04 — ~20 `*Output` tRPC schemas declared but never attached (contract)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-4`
- **Context and evidence:** the `.max(1000)` in `schemas/sync.ts` is unenforced because `getUpdates`
  has no `.output()`; ~20 `*Output` schemas are exported and never attached to procedures.
- **Why not decided by frozen text:** attaching outputs can change runtime behavior (response
  validation/stripping); needs per-procedure verification, not a blanket sweep edit.
- **Options considered:** (a) **[SELECTED]** defer as a bounded follow-up; (b) attach all outputs in
  P20B — REJECTED (risk of breaking clients if a response violates a stale schema).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** behavior risk; not committed by HS-021.
- **Impact and risk:** declared contracts unenforced; low correctness risk today.
- **How to reverse or migrate:** attach `.output()` per procedure with response fixtures.
- **Does a human still need to decide after completion?:** No hard gate; contract hygiene backlog.

### Q-P20B-05 — production-dead modules (dead code)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-5`
- **Context and evidence:** `src/lib/domain/automation.ts` (524 lines, superseded by the P17A
  field-rule engine, and it inverts layering by importing from `@/components`),
  `src/lib/import/processor.ts` (a second CSV pipeline already diverged from `use-import-state.ts`),
  `src/lib/crypto/rekey.ts`, and eight unused tRPC procedures are production-dead.
- **Why not decided by frozen text:** deletion of whole modules is a structural call with
  import-graph and future-use implications, not a mechanical style fix; some (rekey) tie to open
  product questions.
- **Options considered:** (a) **[SELECTED]** defer deletion as a structural cleanup Q; (b) delete
  now in P20B — REJECTED (couples to Q-P20B-01/04 decisions; risk of removing intended-future code).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** structural; not committed by HS-021.
- **Impact and risk:** dead code + a layering inversion; no runtime effect.
- **How to reverse or migrate:** delete with import-graph proof once rekey/output questions resolve.
- **Does a human still need to decide after completion?:** Yes — confirm nothing is intended-future.

### Q-P20B-06 — ts-pattern `.exhaustive()` mandated but not installed (rule vs reality)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-6`
- **Context and evidence:** `.claude/rules/typescript-style.md` mandates ts-pattern `.exhaustive()`,
  but ts-pattern is not a dependency and is not installed; three source files carry comments noting
  so. The sweep consolidated seven hand-rolled `assertNever` copies into one shared helper as the
  closest compliant option.
- **Why not decided by frozen text:** a rule-strength/tooling decision; the sweep charter forbids
  weakening `.claude` rules and defers rule conflicts to root as Q-proposals.
- **Options considered:** (a) **[SELECTED for continued work]** keep the shared `assertNever`
  helper; root decides later whether to add ts-pattern or amend the rule; (b) add ts-pattern
  dependency in P20B — REJECTED (adds a dependency + churn under a style sweep); (c) delete the rule
  — REJECTED (rule-strength change, out of scope).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** repo hard rule "do not weaken `.claude` rules"; rule-vs-reality is a
  root decision.
- **Impact and risk:** exhaustiveness enforced via shared helper rather than ts-pattern; equivalent
  safety.
- **How to reverse or migrate:** add ts-pattern and migrate, OR amend the rule to bless
  `assertNever`.
- **Does a human still need to decide after completion?:** Root rule-vs-reality decision; not a
  correctness gate.

### Q-P20B-07 — `--color-destructive-foreground` undefined in theme (token)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-7`
- **Context and evidence:** `--color-destructive-foreground` is not defined in `globals.css`, so
  `text-destructive-foreground` emits nothing; `ImportDropTarget` was left on its explicit red pair.
- **Why not decided by frozen text:** adding a theme token is a small design decision.
- **Options considered:** (a) **[SELECTED]** defer adding the token; keep the working explicit pair;
  (b) add token in P20B — reasonable but a design choice left to root.
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** cosmetic token; not committed by HS-021.
- **Impact and risk:** none currently (explicit colors render); latent for future consumers.
- **How to reverse or migrate:** define the token in the theme and switch consumers.
- **Does a human still need to decide after completion?:** No hard gate; theme hygiene.

### Q-P20B-08 — branded key types mandated by crypto skill do not exist (crypto typing)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-8`
- **Context and evidence:** `.claude/skills/crypto/SKILL.md` mandates branded key types (`VaultKey`,
  `SigningKey`); neither exists. Every key is a raw `Uint8Array`, so a vault key, an X25519 secret
  and a PRF output are mutually substitutable in `wrapKey`, where argument order is
  security-critical.
- **Why not decided by frozen text:** introducing branded types touches the crypto surface and every
  key call site — a security-typing project, not a style sweep edit; the charter defers rule
  conflicts to root.
- **Options considered:** (a) **[SELECTED for continued work]** defer as a dedicated crypto-typing
  question; (b) introduce brands across crypto in P20B — REJECTED (wide security-critical surface,
  needs its own review); (c) weaken the rule — REJECTED (out of scope).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** security-critical typing change; root rule-vs-reality decision.
- **Impact and risk:** key-confusion is currently type-permitted; no demonstrated live defect.
- **How to reverse or migrate:** add `VaultKey`/`SigningKey`/`X25519Secret` brands with construction
  at boundaries, in a dedicated package.
- **Does a human still need to decide after completion?:** Root decision; not a correctness gate.

### Q-P20B-09 — three FS-001 `settlement.ts` nits deferred (frozen boundary)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-9`
- **Context and evidence:** in the frozen `settlement.ts`: a fourth copy of `freezeResultGraph`
  (:204); `Object.create(null)` cast (:231, unavoidable); `issueOrder` falling back to
  `JSON.stringify` on both operands per comparison (:915, correct but O(n log n) serialisations).
  NOT touched — the file is the FS-001 byte-identical hard boundary (blob `010f3c93…`).
- **Why not decided by frozen text:** the file is a frozen boundary; it MUST stay byte-identical, so
  no fix is permitted here regardless of merit.
- **Options considered:** (a) **[SELECTED]** defer all three, do not touch the boundary; (b) fix —
  FORBIDDEN by the FS-001 boundary.
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** FS-001 byte-identical boundary overrides style.
- **Impact and risk:** minor duplication + a perf micro-cost; behavior correct.
- **How to reverse or migrate:** any change requires re-opening the FS-001 boundary decision.
- **Does a human still need to decide after completion?:** No — boundary is intentional.

### Q-P20B-10 — import decodes UTF-8 only, corrupts Latin-1/1252 exports (encoding)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-10`
- **Context and evidence:** import uses `file.text()` (always UTF-8), so Latin-1/Windows-1252 bank
  exports get U+FFFD in non-ASCII payee names; OFX files even declare `CHARSET:1252` in their
  header.
- **Why not decided by frozen text:** charset detection/transcoding is a feature-sized addition.
- **Options considered:** (a) **[SELECTED]** defer as a feature; (b) add charset handling in P20B —
  REJECTED (feature scope).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** feature, not style; not committed by HS-021.
- **Impact and risk:** non-ASCII names corrupted on affected files; data-quality, not crash.
- **How to reverse or migrate:** detect charset (incl. OFX header) and decode with an established
  lib.
- **Does a human still need to decide after completion?:** No hard gate; import backlog.

### Q-P20B-11 — `detectNumberFormat` fails on leading-minus / EU format (parsing)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-11`
- **Context and evidence:** `detectNumberFormat` regexes are anchored `^\d`, so a leading minus
  defeats detection and EU-format files fall back to US parsing. B-4's fix converts the resulting
  corruption into a structured per-row error, but auto-detection still fails; completing it needs a
  component file that was being edited concurrently.
- **Why not decided by frozen text:** completion depends on a concurrently-edited component; the
  safe partial fix (structured error instead of silent corruption) was landed.
- **Options considered:** (a) **[SELECTED]** land the structured-error guard now, defer full
  auto-detection; (b) rewrite detection in P20B — deferred to avoid the concurrent-edit conflict.
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** partial safe fix landed; remainder is a bounded follow-up.
- **Impact and risk:** EU-format numbers now error clearly rather than silently corrupt.
- **How to reverse or migrate:** anchor-tolerant detection handling a leading sign.
- **Does a human still need to decide after completion?:** No hard gate; import backlog.

### Q-P20B-12 — `useControlledState` casts `defaultValue as T` (typing)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01
- **Source proposal:** `§3 Q-12`
- **Context and evidence:** `use-controlled-state.tsx:16` casts `defaultValue as T`, which lies when
  neither `value` nor `defaultValue` is supplied (state is genuinely `undefined`). The honest fix is
  a discriminated props union. Its only consumer is vendored `animate-ui/.../tabs.tsx`. The `any` in
  its generic constraint WAS fixed (`Rest extends any[]` → `unknown[]`), removing the
  eslint-disable.
- **Why not decided by frozen text:** changing the hook's public shape is churn against vendored
  third-party code for no first-party benefit.
- **Options considered:** (a) **[SELECTED]** keep the single `as T` (only consumer is vendored),
  having removed the `any`; (b) discriminated union rewrite — REJECTED (churn vs vendored code).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** cast tolerated where it only serves vendored code; `any` was
  removed.
- **Impact and risk:** one residual `as T` behind a vendored-only API; net cast count still down.
- **How to reverse or migrate:** discriminated props union if a first-party consumer ever appears.
- **Does a human still need to decide after completion?:** No hard gate.

### Q-P20B-13 — `import.spec.ts:301` races vault-session initialisation (pre-existing E2E flake)

- **Raised:** 2026-07-27, P20B, p20b-implementer-01 (during the clean-tree gate re-run)
- **Source proposal:** `evidence/P20B/implementation-03.md §Q-13`
- **Context and evidence:** `import.spec.ts:301` ("transaction surface drop transfers one File
  without plaintext storage and cancel returns") fails ~1 run in 489 under full-suite load, timing
  out at `:365` waiting for `/transactions` after import, with
  `Failed to initialize vault: No session - user must be authenticated` in the server log. The test
  is byte-identical to BASE (`git diff --stat 659ca20 HEAD -- tests/e2e/import.spec.ts` empty) and
  passes 10/10 and 80/80 under targeted repetition, so it is a PRE-EXISTING vault-session bootstrap
  race, not sweep-induced. The implementer deliberately did NOT paper it over with a retry (that
  would violate the E2E guide the sweep enforces) and instead surfaced it. Distinct from the
  sweep-induced B-15 flake, which WAS fixed at cause (`3a241f8`).
- **Why not decided by frozen text:** the remedy is in vault-session bootstrap or the post-import
  wait, neither of which P20B touched; diagnosing a 0.2%-rate auth race needs its own reproduction
  budget. It is a pre-existing correctness/reliability issue, not a style-guide item HS-021
  committed.
- **Options considered:** (a) **[SELECTED for continued work]** surface as a follow-up flake
  Q-proposal; do NOT add a retry to mask it; (b) fix the race inside P20B — REJECTED (bootstrap race
  outside the sweep's diff, needs a dedicated repro budget); (c) add a retry — REJECTED (violates
  the E2E no-arbitrary-waits/no-mask guide the sweep enforces).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** pre-existing, test byte-identical to BASE; not introduced by and not
  committed by HS-021. Reviewer to judge whether a 1-in-489 pre-existing flake is acceptable to
  defer or must block.
- **Impact and risk:** occasional CI flake at 0.2% under full-suite load; targeted runs green. No
  product-behavior change.
- **How to reverse or migrate:** a follow-up hardens the vault-session bootstrap or the post-import
  wait with a deterministic signal (no arbitrary timeout).
- **Does a human still need to decide after completion?:** Reviewer/P21 rule on acceptability; if
  accepted, a follow-up owns the bootstrap-race fix. Not a HS-021 style-guide gate.

---

### Q-P20B-14 — `import.spec.ts:1527` template auto-update flakes under full-parallel suite only (environmental)

- **Raised:** 2026-07-27, P20B rev 02, root (during P21/01-triggered flake triage)
- **Source proposal:** surfaced by `p20b-implementer-01`'s rev-02 full-suite runs;
  `evidence/P20B/implementation-04.md §Pre-existing/unrelated flakes`
- **Context and evidence:** `import.spec.ts:1527` ("selecting template and importing auto-updates
  template config") failed once in 6 full-suite `--retries=0` runs during the rev-02 identity fix.
  Root sent the implementer to classify it: a focused isolation loop of that single test at
  `--retries=0` was **20 PASS / 0 FAIL**, with NO failure signature reproduced. It is therefore an
  environmental / full-parallel-run resource-contention flake, NOT a deterministic in-isolation
  read-before-render race. Distinct from Q-P20B-13 (`import.spec.ts:301`, a vault-session bootstrap
  race). The test file is byte-identical to BASE (rev 02 changed only `identity.spec.ts`).
- **Why not decided by frozen text:** there is no identifiable failing line or mechanism to harden
  (20/20 in isolation) — adding waits blindly would be exactly the retry/mask papering the E2E guide
  the sweep enforces forbids. It is not a style-guide item HS-021 committed.
- **Options considered:** (a) **[SELECTED]** classify + track as an explained environmental flake
  under the existing Q-P20A-05 / Q-P20B-13 precedent; do NOT paper it with a retry; (b) harden the
  test — REJECTED (no reproducible mechanism; blind waits = masking); (c) add a retry — REJECTED
  (violates the no-mask E2E guide).
- **Default selected for continued work:** Option (a).
- **Decision hierarchy basis:** explained via 20/20 isolation evidence; converts an "unexplained
  flake" (P21 FAIL trigger, tasks/P21-final-audit.md line 71) into a tracked environmental one. The
  P21 rev-02 audit must, on any recurrence, rerun the test in isolation and classify it against this
  Q rather than fail on it.
- **Impact and risk:** occasional CI flake (~1 in 6 full parallel runs observed); isolation runs
  green 20/20. No product-behavior change.
- **How to reverse or migrate:** a follow-up may harden the import-template flow's post-navigation
  settle with a deterministic signal if the flake rate proves material under CI.
- **Does a human still need to decide after completion?:** Reviewer/P21 rule on acceptability under
  the "unexplained flake" bar; if accepted, a follow-up owns any deterministic hardening. Not a
  HS-021 style-guide gate.

## Q-P20B-15 — `transactions.spec.ts:523` "Clear search" count-restore flake is a fixable test-timing defect, not environmental

- **Raised by:** root, from the independent `p21-reviewer-02` FAIL (`reviews/P21-review-02.md`), rev
  02 final audit.
- **Context:** In the virtualized-large-list E2E, the step "filter the large list and restore its
  edited row" clears the search and asserts `getByText("500 transactions", { exact: true })` with a
  **bare** `toBeVisible()` (default 5s) at `transactions.spec.ts:696`. It failed 1 of 5 full
  retries-disabled runs under 163-test / 4-worker load; 10/10 in isolation. Same load-dependent
  class as identity:282.
- **Why this is NOT the same as the accepted environmental flakes (Q-P20A-05 / Q-P20B-13 / -14):**
  there is a clear, specific mechanism and a clean fix. The structurally identical "500
  transactions" assertion at `:578` already uses `{ timeout: 15_000 }` and the CSV-row assertion at
  `:563` uses `10_000`; only the post-"Clear search" restore at `:696` was left on the bare 5s
  default. The virtualized list must re-expand the full 500-row count after the filter clears, which
  under parallel load can exceed 5s. This is an under-specified eager assertion — a genuine
  test-quality defect within HS-021's "code quality sweep" charter, NOT an unexplained/irreducible
  environmental flake.
- **Options considered:** (a) classify as environmental like the import flakes — REJECTED (there IS
  a reproducible mechanism and a principled fix; masking it as environmental would be papering); (b)
  **[SELECTED]** harden the assertion to be robust to the virtualized re-render under load — give
  the count-restore assertion an explicit timeout / wait on a settled signal (mirroring the `:578`
  sibling that already waits 15s), and sweep the E2E specs for other same-class bare-eager
  assertions after async re-renders; (c) add `--retries` — REJECTED (violates the no-mask E2E
  guide).
- **Default selected for continued work:** Option (b), routed to **P20B rev 03** (cross-cutting E2E
  test-quality; P16C virtualized-transactions-table is feature lineage only).
- **Decision hierarchy basis:** this is "more work to complete committed scope" (HS-021 code-quality
  sweep + GOAL DoD "clean full-suite E2E under final audit"), NOT a scope reduction — no independent
  adjudicator required. A deterministic wait is not a blind mask because it targets a specific,
  identified re-render race with a named settled signal.
- **Impact and risk:** occasional CI flake (~1 in 5 full parallel runs observed); isolation green
  10/10. No product-behavior change — product is byte-identical to rev 01 across the range.
- **How to reverse or migrate:** revert the test-timing change; the assertion returns to the bare
  default.
- **Does a human still need to decide after completion?:** No — the P20B rev-03 reviewer and the P21
  rev-03 audit rule on whether the hardened assertion holds under load. Not a human gate.

## Q-P20B-16 — `passkey.spec.ts:387` unlock-button click timeout under parallel load (under investigation)

- **Raised by:** root, from the P20B rev-03 implementer's full-suite validation (run #5 of 8;
  `evidence/P20B/implementation-05.md`).
- **Context:** In one of 8 sequential full-suite `--retries=0` runs, `passkey.spec.ts:387` failed —
  a click on the unlock-button (`:401`) timed out at 30s amid tRPC auth / "Failed to fetch" console
  errors. Different subsystem (WebAuthn recovery + sync auth) and different failure mode (a 30s
  action-click timeout, NOT an undersized visibility assertion) from the tx523/identity load-timing
  class. Observed 1/8.
- **Why it matters:** it is NOT in the accepted-flake set (`import:301`/Q-P20B-13,
  `import:1527`/Q-P20B-14, `duplicates`/Q-P20A-05). Left untracked it is an "unexplained flake" that
  would FAIL the P21 rev 03 audit. Must be diagnosed and either fixed (if a fixable test-timing
  defect) or explained+tracked as accepted-environmental (isolation-green + external mechanism)
  BEFORE the next audit.
- **Options considered:** (a) harden a test wait — only valid if the mechanism is an undersized
  wait; a 30s click timeout amid "Failed to fetch" suggests a backend/sync-availability cause, not
  an undersized assertion; (b) classify as accepted-environmental — valid iff isolation-green with a
  plausible external mechanism (sync/auth backend contention under 4-worker load); (c) escalate as a
  real product/sync defect — if it reproduces a genuine race. **[SELECTED: investigate first]** —
  routed to a P20B rev-04 diagnosis pass that classifies into (a)/(b)/(c); do NOT blindly mask.
- **Default selected for continued work:** diagnose (P20B rev 04), then fix-or-classify-or-escalate.
- **Decision hierarchy basis:** GOAL DoD "clean full-suite E2E with no unexplained flake" + audit
  line 71. Diagnosing/tracking it is more work to complete committed scope, not a reduction.
- **Impact and risk:** ~1/8 full parallel runs; unknown in isolation until diagnosed. If a real
  sync-auth race, could indicate a product issue; if backend contention, environmental.
- **How to reverse or migrate:** if hardened, revert the test change; if classified, remove the Q.
- **Does a human still need to decide after completion?:** the P21 rev-03 audit reviewer rules on
  acceptability; if escalated as a real defect it may need a product package.

## Q-P20B-17 — `import.spec.ts:1573` import-preview "4 rows" not found within its 5s wait (RESOLVED — SUBSUMED BY Q-P20B-14)

- **RESOLUTION (2026-07-27, root):** SUBSUMED by **Q-P20B-14**. Line 1573 is an assertion _inside_
  the test declared at `import.spec.ts:1527` ("selecting template and importing auto-updates
  template config") — the Playwright reporter identifies this test as `import.spec.ts:1527`, which
  is exactly the flake already classified environmental under Q-P20B-14 (20/20 in isolation, ~1-in-6
  under full parallel load, no reproducible mechanism, no product-behavior change). The rev-03
  implementer named it by its internal assertion line (1573) rather than the test-declaration line
  (1527); it is the SAME already-tracked environmental flake, not a new one. It passed cleanly in
  the P20B rev-04 full-suite runs (e.g. 8.0s in runs 1 and 2). **No new fix required**; the P21
  audit rule is to rerun this test in isolation and classify against Q-P20B-14, not fail. This Q
  remains only as a cross-reference pointer to Q-P20B-14. No human decision needed beyond the
  standing Q-P20B-14 disposition.

- **Raised by:** root, from the P20B rev-03 implementer's full-suite validation (run #8 of 8;
  `evidence/P20B/implementation-05.md`).
- **Context:** `import.spec.ts:1573` — `getByText(/4 rows/i).toBeVisible({ timeout: 5000 })` not
  found after a 2nd CSV upload's import-preview render, in 1 of 8 full-suite runs. Unlike tx523 it
  ALREADY has an explicit 5s wait, so it is not a bare/missing-timeout of the exact tx523 class,
  though 5s may still be undersized for the preview re-render under 4-worker load. A THIRD distinct
  `import.spec.ts` flake alongside the accepted `:301` and `:1527`. Observed 1/8.
- **Why it matters:** untracked ⇒ unexplained ⇒ would FAIL the P21 rev 03 audit. Must be fixed or
  explained+tracked before the audit.
- **Options considered:** (a) **[likely]** harden — bump the 5s wait / await a deterministic
  post-upload settle signal, consistent with the load-timing class, IF the diagnosis shows a
  deterministic-but-slow preview render; (b) classify as environmental (isolation-green) like its
  sibling import flakes; (c) escalate if a real 2nd-upload state race. **[SELECTED: investigate
  first]** via the P20B rev-04 diagnosis pass.
- **Default selected for continued work:** diagnose (P20B rev 04), then fix-or-classify.
- **Decision hierarchy basis:** GOAL DoD + audit line 71; more work to complete committed scope.
- **Impact and risk:** ~1/8 full parallel runs; import.spec.ts is an established flake hotspot.
- **How to reverse or migrate:** revert the wait change, or remove the Q if classified.
- **Does a human still need to decide after completion?:** P21 rev-03 audit reviewer rules on
  acceptability.

## Q-P21-03-01 — P21 rev 03 audit FAIL F-1: post-freeze HIGH dependency advisories on `next@16.2.10`

**Surfaced by:** P21 rev 03 final-audit collector (`evidence/P21/implementation-03.md`), independently
reproduced by root.

**Finding.** `pnpm audit --prod` at BASE product tip reports **10 advisories (5 HIGH, 5 MODERATE)** —
`next@16.2.10` is vulnerable (`>=16.0.0 <16.2.11`), patched `>=16.2.11`; HIGH set includes App Router
middleware/proxy AUTH BYPASS and SSRF in Server Actions/rewrites (e.g. GHSA-4c39-4ccg-62r3). Fixes
shipped in `next@16.2.11` (2026-07-21) and `16.2.12` (2026-07-25), both BEFORE this audit. Also a
transitive `sharp` HIGH fixed `>=0.35.0`. Prior P21 collectors rev 01/02 skipped `pnpm audit`; the
rev-03 charter-required dependency-currency recheck (audit contract item 2) newly surfaced it.

**Disposition (root, no independent adjudicator required).** This is a P21 FAIL: audit contract item
71 makes a material security finding / failing check a FAIL, and HS-002 mandates the "very latest
safe-chain supported version of all dependencies" — at audit time we do NOT meet that (16.2.10 vs
patched >=16.2.11) with a HIGH auth-bypass exposed, and the remedy is a trivial IN-CHAIN patch bump.
Routing the fix (reopen P01/HS-002 to bump `next` to the latest safe-chain that clears
`pnpm audit --prod`, plus `sharp`) is "more work to complete committed scope" and needs no
adjudicator. The alternative — recording F-1 as a human-accepted post-freeze currency carry-forward
and passing P21 — would SUPERSEDE the HS-002 mandate = a scope reduction that routes to a DISTINCT
fresh-context adjudicator DEFAULTING TO BLOCK; so block stands either way. Convergence criterion is a
CLEAN `pnpm audit --prod` (a terminating condition), not "chase every future release." Per the
no-pause rule root records this proposal and proceeds with the safe reversible choice (do the bump);
no human halt (halt criteria — frozen-source drift / secret exposure / blocked_external — do not
apply).

## Q-P20B-18 — P21 rev 04 audit FAIL F-1: `import.spec.ts:1512` eager `toBeVisible` default-timeout cohort

**Surfaced by:** P21 rev-04 final-audit collector (`evidence/P21/implementation-04.md`, 1/8 full-suite)
and upheld as a blocker by the DISTINCT reviewer (`reviews/P21-review-04.md`, 0/8 but mechanism + novelty
independently confirmed). NOT reproduced by the reviewer, but non-reproduction is not exoneration for a
load-dependent class.

**Finding.** `tests/e2e/import.spec.ts:1445` "CSV import creates transactions and auto-saves template on
first import", step "verify template was auto-saved on first import", assertion `:1512`
`await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 })` -> element(s) not found under
4-worker parallel load. NEW: zero prior hits for `1445`/`1512` in QUESTIONS.md / evidence / reviews.
NOT absorbable into Q-P20B-14 (that ticket is the test declared at `:1527`; F-1 sits inside the test
declared at `:1445` — different declarations). Mechanism: `loadFile` (`use-import-state.ts:242-445`) is
async file-read -> parse -> template sort -> `setSession`; `ImportPanel.tsx:262-297` only renders the
row count after that; `:1512` is the SECOND import in its test so it additionally sorts+applies templates
= the most load-exposed instance. The `{ timeout: 5000 }` merely pins Playwright's DEFAULT expect
timeout — it looks like a wait but grants no extra slack.

**Cohort (fix the class, not the line).** `toBeVisible({ timeout: 5000 })` appears exactly 13x in 2
files: 8 in `import.spec.ts` (incl. `:1279 :1412 :1459 :1512 :1539 :1616`), 5 in `transactions.spec.ts`.
`git log -- tests/e2e/import.spec.ts` shows no prior P20B revision ever touched that file — the one spec
every sweep skipped.

**Disposition (root, no adjudicator).** P21 FAIL (audit contract item 71: unexplained flake = FAIL).
Routing to P20B to harden the cohort with a deterministic settle signal is "more work to complete
committed HS-021 scope" and needs no adjudicator. The reviewer granted NO new carry-forward: unlike
Q-P20B-14 (no identifiable failing line/mechanism, 20/20 isolation), F-1 has a specific line, a specific
mechanism, and a clean fix. Owner P20B rev 06. Related: [[e2e-load-dependent-flake-validation]].
- **Impact and risk:** ~1/8 full parallel; import.spec.ts is an established flake hotspot; test-only defect (20/20 isolation, no product implicated).
- **How to reverse or migrate:** replace default-timeout `toBeVisible` with a deterministic post-parse settle wait sized like the file's existing `{ timeout: 15_000 }` siblings.
- **Does a human still need to decide after completion?:** No — fix + re-validate under full-suite load.

## Q-P20B-19 — P21 rev 04 audit FAIL F-2: `identity.spec.ts:282` RE-FLAKE; rev-02 fix cannot prove hydration for a controlled `Input`

**Surfaced by:** P21 rev-04 DISTINCT reviewer (`reviews/P21-review-04.md`): `identity.spec.ts:282`
FAILED 1 of 8 full-suite runs — the very test P20B rev 02 was dispatched to fix and whose fix was
accepted. NO accepted-flake ticket exists for it. A failing check on a CLOSED fix is strictly stronger
than an untracked flake -> contract item 71 FAIL. (The rev-04 collector saw it green 8/8 — honest sample
difference; the class is environment-dependent, so a single clean environment never proves a fix holds.)

**Finding.** Step "validate BIP39 words with visual feedback", assertion `:359`
`expect(firstInput).toHaveClass(/border-green-500/)`, first input observed 14x with `value=""`.
Mechanism (root INDEPENDENTLY CONFIRMED by reading source): `SeedPhraseInput.tsx:329-332` is a fully
controlled input (`value={word}` off `useState`). The rev-02 fix guards with `toBeEditable()` ->
`fill()` -> `toHaveValue()`. But `src/components/ui/button.tsx:50` gates on `useIsHydrated()` while
`src/components/ui/input.tsx` has NO such gate (confirmed: `grep useIsHydrated` -> button yes, input no).
So `toBeEditable`/`toBeEnabled` is a genuine hydration proof for a Button and NO proof at all for an
Input, which is editable from first paint. The pre-hydration `fill` sets the DOM value (so `toHaveValue`
passes), React never runs `onChange`, and the next commit clobbers it back to `""`. The rev-02
implementer reused the `helpers/auth.ts:20` idiom that works for gated controls and applied it to an
ungated one.

**Why it got through.** `reviews/P20B-review-02.md:39-45` validated with ISOLATION ONLY ("9/9"), which
cannot exercise a 4-worker load race — exactly the validation-method error the P21 contract and
[[e2e-load-dependent-flake-validation]] warn about.

**Disposition (root, no adjudicator).** P21 FAIL. Fix must gate on post-state-propagation evidence
(onChange applied / value survives a React commit) NOT the raw DOM value — OR close the class at source
by giving `src/components/ui/input.tsx` the `useIsHydrated` treatment `button.tsx` already has (product
change, within P20B's remit). MUST be validated under repeated FULL-SUITE `--retries=0` load, never
isolation. Owner P20B rev 06 (same batch as Q-P20B-18). "More work to complete committed HS-021 scope" —
no adjudicator.
- **Impact and risk:** ~1/8 full parallel; a regression of a fix believed closed; test-side (or a small hydration-gate product change).
- **How to reverse or migrate:** re-run >=8 full-suite `--retries=0` after the fix; isolation is not acceptable validation.
- **Does a human still need to decide after completion?:** No.

## Q-P21-04-01 — P21 rev 04 non-blocking C-1: upstream registry currency drift after the P01 rev-03 selection

**Surfaced by:** P21 rev-04 collector + DISTINCT reviewer. `pnpm audit --prod` is CLEAN (exit 0 / 0
advisories) so this is currency, not security — categorically unlike the rev-03 F-1 security FAIL
(Q-P21-03-01).

**Finding.** Some prod deps have a newer registry `latest` published 2026-07-20..24, AFTER the P01
rev-03 selection: `react`/`react-dom` 19.2.7->19.2.8, `@tanstack/react-virtual` 3.14.6->3.14.8,
`loro-crdt` 1.13.7->1.13.8, `radix-ui` 1.6.2->1.6.7, `supabase-js` 2.110.7->2.110.8, `lucide-react`
1.25.0->1.26.0 (an icon-set minor; the rest patch). `next`, `sharp`, `zod`, `motion` are EXACTLY current.

**Disposition (root, no adjudicator — adopts the DISTINCT reviewer's frozen-text ruling).** ACCEPTED as
an explicit human-visible carry-forward; NOT a blocker and does NOT reopen P01/HS-002. Reasoning: HS-002's
frozen "very latest safe-chain supported version" is satisfied at the audit instant (the same principle
already proven by `next` — 16.2.12 exists but is safe-chain age-suppressed, so 16.2.11 IS "latest
safe-chain supported"); the drift published after selection; `pnpm audit --prod` is clean so there is no
security exposure; and chasing every post-selection npm publish has no terminating condition (it would
reopen P01 on every release). This is an interpretation of the frozen phrase's temporal boundary, NOT a
scope reduction (no committed work is dropped). Reversible: a future P01 revision can bump these patches
if a human later wants them. Per the no-pause rule root records this and proceeds; no human halt.
- **Impact and risk:** cosmetic currency only; zero security advisories; all patch bumps except one icon minor.
- **How to reverse or migrate:** a trivial future P01 dependency bump if desired.
- **Does a human still need to decide after completion?:** Optional — a human may later elect the patch bumps; not required for Goal completion.

## Q-P20B-20 — `import.spec.ts` cross-worker temp-file collision is a real parallel-safety bug, NOT the eager-assertion class

**Surfaced:** P20B rev 06 campaign (run 2 of 10, digest `3fd09f48`), by `p20b-implementer-06`.

**Symptom:** `import.spec.ts:1527` "selecting template and importing auto-updates template config"
failed in its `cleanup` step with `ENOENT: unlink '/tmp/.../test-import-<ms>.csv'` at
`import.spec.ts:1637` (`fs.unlinkSync(csvPath)`).

**Root cause:** `createTestFile` (`import.spec.ts:74-80`) builds the temp path from
`Date.now()` (millisecond resolution) into the shared `os.tmpdir()`. Under `fullyParallel` + 4
workers, two callers entering in the same millisecond get the IDENTICAL path; the second
`writeFileSync` overwrites the first, and whichever test finishes first unlinks the shared file, so
the other's cleanup hits ENOENT. Nine call sites funnel through this one helper. This is a genuine
cross-worker parallel-safety defect — no timeout value can fix it.

**Fix (rev 06, inside allowed writes, `import.spec.ts` only):** append a random suffix —
`const uniqueName = \`test-import-${Date.now()}-${crypto.randomUUID().slice(0, 8)}\``. Root-verified:
`crypto` is already imported at `import.spec.ts:16` (pre-existing, no new import); the three
filename assertions (`:1524`, `:1586`, `:1627`) use the UNANCHORED regex `/test-import-\d+/i`, which
still matches the unchanged `test-import-<digits>` prefix.

**Material consequence for the audit trail:** the rev-04 F-1 diagnosis was INCOMPLETE.
`import.spec.ts:1527` was charted as an eager-assertion cohort member (and it does contain those),
but at least one of its observed failures was this ENOENT, which a timeout change would never have
fixed. **If a future audit sees `:1527` fail again, check WHICH error before assuming the
timeout fix regressed** — ENOENT ⇒ this parallel-safety class (should be closed by rev 06); a
5s-timeout timeout ⇒ the eager class. This is why 10 back-to-back full-suite runs surface defects a
single `pnpm test:e2e` never applied enough scheduling pressure to expose.

**Status:** fixed in rev 06 pending DISTINCT-reviewer confirmation under repeated full-suite load.
Not a scope reduction (completing committed HS-021 code-quality scope); no adjudicator required.

---

## Q-P21-05-01 — M-1: "Edits merge cleanly" copy overstates a known-imperfect CRDT guarantee

**Surfaced by:** `p21-collector-05` (P21 rev 05 final-audit evidence, §11). **Status:** OPEN —
awaiting DISTINCT `p21-reviewer-05` formal adjudication; NOT yet dispositioned by root.

`FeaturesSection.tsx` "Edits merge cleanly" asserts "Two people editing at the same time **will not
overwrite each other**." That is an unqualified durability promise. Q-P20B-00 documents a real,
still-unfixed merge defect: `pruneBuckets` (`mutations.ts:325` `delete store[accountId]`) discards a
concurrent peer's insert into the same day/month/year subtree on merge. The collector re-confirmed
the code is unchanged at HEAD and that the pruning paths are reachable from ORDINARY UI actions —
`deleteTransaction` (`:704`), `moveTransaction` (`:573`, i.e. merely editing a transaction's date),
bulk delete (`page.tsx:594`), and import-delete — so the claim is contradicted in a UI-reachable
case, not only an exotic one.

**Collector severity call (non-binding):** NON-BLOCKING, because (a) the underlying engine defect is
already surfaced and formally accepted by `p20b-reviewer-01 §6.1` and routed to a future scoped CRDT
package, (b) the claim's second sentence is literally true (the app genuinely uses Loro CRDTs, not
last-write-wins) and the general merge behaviour holds for the everyday cases the E2E suite
exercises, and (c) the failure needs two clients concurrently touching the same day bucket. Proposed
owner **P20A** (minimal fix: soften the absolute "will not overwrite each other"); the engine fix
stays Q-P20B-00. **The collector explicitly does NOT claim the copy is fully accurate.**

**Root note:** PROCESS lists "false marketing claim" as an explicit FAIL trigger and HS-016 requires
truthful marketing copy. Whether M-1 is a P21 FAIL is the central adjudication of rev 05 and is
reserved to the DISTINCT reviewer, who may overrule the collector's severity call. Requiring the
copy be softened to complete committed HS-016 scope is MORE work to complete committed scope, not a
scope reduction. If the reviewer FAILs on M-1, root routes to P20A.

## Q-P21-05-02 — O-1: no CSP / security response headers (OUT OF FROZEN SCOPE)

**Surfaced by:** `p21-collector-05` (§12.2). **Status:** OPEN — deployment-hardening follow-up.

`next.config.ts` has no `headers()` and there is no middleware, so no Content-Security-Policy or
security response headers are emitted. The collector rules this OUT OF FROZEN SCOPE: HS-015 is
scoped to websocket/CORS/pubkey-hash vault access, which IS delivered. Non-blocking; owner = a future
security package. Reviewer to confirm scope classification.

## Q-P21-05-03 — A-1: R-034 empty-row checkbox accessible-name fallback

**Surfaced by:** `p21-collector-05` (§12.7). **R-034 was explicitly routed to the P21 audit**, so the
collector adjudicated it. The transaction-row selection checkbox accessible name degrades to
`"Select transaction "` when the description is empty, and HS-001 makes empty rows routine, so two
added rows yield two identically-named checkboxes. **Status:** OPEN. Collector severity:
NON-BLOCKING (operable, correctly role-typed, other cells named, pre-existing/P16D-owned). Concrete
fix: fall back to amount+date in the accessible name. Note: the E2E suite scopes lookups per-row so
it cannot catch this class. Proposed owner **P16D**. Reviewer may overrule the severity call.

## P21 rev-05 reviewer rulings + Q-P20B-00 scope adjudication dispatched (2026-07-30)

DISTINCT `p21-reviewer-05` formal **FAIL** (`reviews/P21-review-05.md`, preserved by root at
`7cb651d`). Status updates to the rev-05 questions:

- **Q-P21-05-01 (M-1) → CONFIRMED BLOCKING.** The reviewer OVERTURNED the collector's NON-BLOCKING
  call and independently reproduced the data loss through the real sync merge path, establishing that
  the loss spans the whole pruned subtree [not just "same day bucket" — the collector's mitigation
  was factually wrong]. Audit contract `:72` names "false marketing claim" a FAIL trigger.
  **Owner P20A / HS-016** for the one-line copy correction at `FeaturesSection.tsx:65`. Root: routing
  the copy fix is more work to complete HS-016's committed "truthful marketing copy" scope, NOT a
  reduction → no adjudicator for the copy.
- **Q-P21-05-02 (O-1) → CONFIRMED out of frozen scope, non-blocking.** HS-015 frozen text is scoped
  to websocket/CORS/pubkey-hash vault access, which IS delivered and enforced; CSP is deployment
  hardening. Future security package.
- **Q-P21-05-03 (A-1) → UPHELD non-blocking; owner P16D.** Name-quality degradation, not a
  name-absence/operability failure; fix via a stable disambiguator (amount+date) and add a guard.

**Q-P20B-00 — SCOPE ADJUDICATION DISPATCHED (engine in/out-of-goal).** The reviewer recommends
routing only the copy and leaving the `pruneBuckets` merge-safety fix to a future CRDT package, but
whether the goal's committed scope REQUIRES the engine fix is a scope call that would supersede the
prior accepted `p20b-reviewer-01 §6.1` deferral and/or reduce the FINAL-AUDIT "converge without lost
changes" clause. Per PROCESS.md:335-347, root does NOT self-adjudicate [interest in unblocking] and
does NOT pause for the human. A DISTINCT fresh-context opus-tier **scope adjudicator** — never the
P21/P20A/P20B implementer or reviewer — is dispatched to rule, from the frozen `sourceTextLines`, the
binding task, and the decision being superseded, whether the `pruneBuckets` merge-safety fix is
genuinely required in-goal or is an over-scope, **defaulting to the block standing** unless the
frozen text plainly does not require it. Its written ruling is the authority; root transcribes it
here and into DECISIONS and proceeds on the safest reversible path. **Status: OPEN — adjudicator
running.**

## Q-P20B-00 SCOPE ADJUDICATION — RESOLVED OUT-OF-GOAL (2026-07-30)

**Ruling:** `reviews/P21-scope-adjudication-05.md` (commit `f290246`), independent fresh-context opus-tier scope adjudicator `p21-scope-adjudicator-05` (DISTINCT — never P20A/P20B/P21-05 implementer or reviewer). **VERDICT: ENGINE-FIX-OUT-OF-GOAL.** Transcribed to DECISIONS as **D-019**.

- No frozen `sourceTextLine` requires transaction-lifecycle merge-safety. `pruneBuckets` (`mutations.ts:327` `delete store[accountId]`) is in the transaction-container lifecycle, triggered by delete/move/duplicate/import — never by an allocation edit.
- The one frozen concurrency requirement is FS-001 allocation-map scope (`spec.md:451,452,628-629,703`, all "person"-qualified); a different capability, and per the rev-05 reviewer it IS delivered (16/16 gates).
- `p20b-reviewer-01 §6.1` (deferral) UPHELD, not superseded. `FINAL-AUDIT.md:90` "lost changes" clause does NOT trace to frozen text for the transaction-prune scenario (only anchor is allocation-scoped :703; the broadened reading is an over-scope per PROCESS.md:330-333). The allocation-scoped capability it rests on is met.
- **Owning package: none in-goal.** Q-P20B-00 stays routed to a future out-of-goal CRDT package. The ONLY in-goal work from rev-05 M-1 is the P20A/HS-016 copy correction at `FeaturesSection.tsx:65`.
- **Status: RESOLVED.** Root proceeds: execute §275 RB-P21-05 marker rollback of HS-016, then re-implement the truthful copy, re-review, and re-open P21 rev 06.

## Q-USER-2026-07-30 — Four user-reported items raised during P21 rev 06

Raised by the human user in-session on 2026-07-30 while `p21-collector-06` was mid-audit against BASE
`4e6ccee`. Recorded here by root; NONE were implemented at the time of writing (tree-drift discipline:
a product edit would invalidate the running audit, which is evidence only for the tree it ran on).

### U-1 — Add-transaction button selects the new row; should focus the description instead

**User decision: LOCKED IN as in-goal work — "focus only".**

`handleAddTransaction` (`src/app/(app)/transactions/page.tsx:538-585`) ends with
`setSelectedIds(new Set([transactionId]))` (`:584`). Discoverability is ALREADY handled without it:
filters reset (`:542`), `displayCount` bumped so the row is on the rendered page (`:571-579`), and
`setTransactionIdToReveal` (`:580`) drives the scroll-into-view effect (`:303-321`). The selection is
therefore not functionally necessary; it is being borrowed as a highlight mechanism.

Three problems with the current behaviour: (a) selection in this table means "target for bulk
operations" (`handleBulkDelete` `:588`, `BulkEditToolbar`), but a new empty row is an EDIT target, not
a bulk target — semantic mismatch; (b) `new Set([id])` REPLACES rather than adds, so an in-progress
multi-row selection is silently destroyed; (c) it does not actually help the user start typing.

**Agreed design — focus only:** drop the selection entirely and focus the new row's description
input. Reuse the EXISTING consume-once reveal channel (`transactionIdToReveal` or a sibling intent)
rather than adding a parallel mechanism — that effect already runs exactly when the row lands in
`displayedTransactions`, which is the correct moment to focus because the row is guaranteed rendered.
Preserve the "consume once and clear" discipline (see the deliberate comment at `:296-297`).
Precedent for the ref-then-focus idiom already exists in this codebase: `TransactionRow.tsx:254`,
`PersonAllocationCell.tsx:104`, `InlineEditableTags.tsx:134`, `BulkEditToolbar.tsx:107-110`.

Implementation care: the grid is VIRTUALIZED, so the row must be mounted when `.focus()` is called,
and the scroll must not immediately unmount/remount it. Rationale for focus-only over keeping the
highlight: focusing the description makes the row unmistakable AND immediately useful, subsuming the
highlight's discoverability job without hijacking bulk-selection semantics. If a highlight is later
wanted independently, a transient "recently added" style is a truer fit than selection.

### U-2 — Search misses alias-displayed descriptions (CONFIRMED DEFECT)

**User repro:** created a row with description "Testing" (aliased to a Tx Description), searched
"test", got no results.

**NOT case sensitivity** — `filterTransactions` lowercases both sides correctly
(`src/lib/crdt/queries.ts:560-567`). The actual cause is that search reads ONLY the raw stored field:

```
tx.description?.toLowerCase().includes(searchLower) ||
tx.notes?.toLowerCase().includes(searchLower)
```

When a transaction is aliased, the VISIBLE text is resolved from a different place —
`descriptionAliasId` via `aliasLookup.resolve(...)` (`page.tsx:337-338`, `:398-399`) — and aliases
form a one-hop symlink graph (`src/lib/crdt/schema.ts:87-94`). So the user searches what is displayed
while the filter matches what is stored. Consistent with the repro: manual rows are created with
`description: ""` (`page.tsx:557`) and then aliased.

**Open design question (decide before implementing):** should search match the resolved alias, the
raw description, or BOTH? Root's recommendation is BOTH — matching raw text preserves finding
pre-alias imported text, matching resolved text meets user expectation. One-hop symlink resolution
must be handled. Note `filterTransactions` is a pure query in `queries.ts` with no alias lookup in
scope today, so the alias resolver must be threaded in (or the search predicate lifted) — this is a
real design choice, not a one-line fix.

### U-3 — Presence avatar shows pubkey-hash initials, not the member name (CONFIRMED DEFECT)

**User repro:** a pink circle labelled "AD" next to "Saved"; hovering shows a long id; the user's name
is the default "Me".

"AD" is the first two hex characters of the user's PUBKEY HASH, not their name.
`src/app/(app)/layout.tsx:218-224` (and the second render site at `:343`) build presence users as
`{ userId, isOnline: true }` and **never pass `name`**. `PresenceAvatar.tsx:48` then does
`const displayName = name || userId`, falling back to the hash; `getInitials`
(`src/lib/utils/color.ts`) takes its hash branch (`/^[a-f0-9]+$/i` → first 2 chars uppercased) and
yields "AD". The tooltip is the same hash because `title={displayName…}` (`:56`) shares the fallback.
The pink is `hashToColor(userId)` — deterministic, hence stable but arbitrary.

Two distinct defects: (1) the display name is never plumbed through to presence avatars — it should
resolve from vault membership/people data; (2) a raw 64-char hex hash is not an acceptable
user-facing tooltip. The `getInitials` hash branch is a reasonable LAST-RESORT fallback; the bug is
that it is reached at all in the ordinary single-user case.

**Secret-safety note (non-blocking):** the exposed value is a PUBLIC key hash, not secret material —
this is a UX defect, NOT a secret-safety breach. No key, seed or recovery material is involved.

**Scope routing (root does NOT self-decide):** presence is HS-003 (scratch `:161-163`, package P10,
`passed`). Whether "presence avatar renders a hash instead of a name" is a defect IN delivered HS-003
scope — rather than new scope — determines routing. If in-scope it is a P10 defect and fixing it
COMPLETES committed scope (no adjudicator needed, per the rule that requiring more work to complete
committed scope is not a reduction). The FINAL-AUDIT checklist already covers presence and
deterministic accessible role/name/state snapshots, so `p21-collector-06` may surface it
independently; a P21 FAIL would route it in cleanly. Root will let the audit finding determine
routing rather than pre-empting it.

### U-4 — Default currency inferred from timezone: OUT OF FROZEN SCOPE (future work)

**User request:** implement choosing the default currency from the user's timezone via a lookup, as
discussed in design history.

**Root's finding — two blockers, so this is recorded as future work, NOT goal work:**

(a) **It is already implemented — but by LOCALE, not timezone.** `src/lib/domain/detect-currency.ts`
resolves `navigator.languages[0]` → BCP 47 region subtag → `REGION_TO_CURRENCY` (~70 countries,
`:170-260`), falling back to USD. Its header (`:4-6`) explicitly argues locale is "more reliable than
timezone because locale directly encodes cultural/regional preferences" — the OPPOSITE conclusion to
the scratch note's guess. Switching to timezone is therefore a deliberate BEHAVIOUR CHANGE reversing
a prior decision, not missing work, and deserves an explicit recorded decision rather than a silent
flip.

(b) **It is outside the frozen SCOPE selection.** The scratch note lives at `specs/human-scratch.md:33`
("When creating a vault the default currency should be inferred from time zone or culture … I'm
guessing time zone is probably a better indicator of country?"). SCOPE's 21 frozen top-level blocks
span lines **151-350** only (HS-001 `151-155` … HS-020 `348-350`). Line 33 is in an earlier region
never selected into this goal; it carries an `[x]` that was NOT set by this campaign's marker
mechanic and is not in the authorized checked-ID set. `SCOPE.json#sources[SRC-HUMAN-SCRATCH]` freezes
the file at `b91ca932…` with the leading-marker flip as the ONLY permitted edit, so root cannot
retroactively pull line 33 into SCOPE without breaking the freeze all 22 requirements validate
against.

**Disposition:** recorded as future work. Pulling it into this goal would be a scope EXPANSION; per
PROCESS.md root must not self-decide it — it would require dispatching the independent fresh-context
scope adjudicator. Root offered that route to the user and did not take it unilaterally.

### U-3 AMENDMENT (2026-07-30) — design LOCKED IN by the user: show the member's NAME INITIALS

The user confirmed the intended behaviour: the presence avatar must show the member's **initials
derived from their display name**, not pubkey-hash characters.

**Locked design:** plumb the member's display name through to `PresenceAvatar` at BOTH render sites
(`src/app/(app)/layout.tsx:218-224` desktop/mobile and `:343`), resolving the name from vault
membership/people data instead of passing only `userId`. No change is required to `getInitials`
(`src/lib/utils/color.ts`): its ordinary word-initials branch already produces the desired result once
fed a real name — default name "Me" -> "M", "Ben Tefay" -> "BT". The existing hash branch
(`/^[a-f0-9]+$/i` -> first 2 chars) is retained ONLY as a genuine last-resort fallback for the case
where no name can be resolved; the defect is that it is currently reached in the ordinary case.

**Tooltip:** `PresenceAvatar.tsx:56` `title={`${displayName}${isOnline ? " (online)" : ""}`}` must
likewise show the resolved name, not the raw 64-char hex hash. With the name plumbed through, the
existing expression yields the correct title automatically via the same `name || userId` fallback at
`:48`.

**Colour:** `hashToColor(userId)` (`:50`) should CONTINUE to key off the stable `userId`, not the
name — per-user colour stability must survive a rename, and distinct members with identical initials
must remain visually distinguishable.

Scope routing is unchanged by this amendment and is still NOT self-decided by root: the design is
settled, but whether this is an in-scope HS-003/P10 defect or new scope is left to the P21 rev 06
audit finding (see U-3 above).

### U-4 AMENDMENT (2026-07-30) — empirical evidence AGAINST the locale approach

The user reported the app inferred **USD** for them and asked whether their locale is wrong. Root
measured the actual environment:

| Signal | Value | Implied currency |
| --- | --- | --- |
| Locale (`LANG` -> `navigator.language`) | `en-US` | **USD** (wrong) |
| Timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) | `Australia/Brisbane` | **AUD** (correct) |

The user's locale is not misconfigured in any unusual sense: `LANG=en_US.UTF-8` is the default on most
Linux installs, Docker images and dev environments, and it only visibly affects date/number
formatting, so it is commonly left untouched. This is the systematic failure mode of the implemented
approach: **`en-US` is the world's default locale string, so region-from-locale silently collapses to
`US` for a large population who are not in the US**, biasing detection toward USD with no signal to
the user that it is wrong.

Timezone lacks that failure mode: it is set from a map at install time and is almost always genuinely
correct, because an incorrect timezone visibly breaks clocks and calendars. There is no equivalent
"default nobody changes".

**This is a direct empirical counterexample to the rationale currently asserted in
`src/lib/domain/detect-currency.ts:4-6`** ("more reliable than timezone because locale directly
encodes cultural/regional preferences"). Locale encodes LANGUAGE preference; its region subtag is a
frequently-inaccurate byproduct. The scratch note's original guess (`human-scratch.md:33`, "I'm
guessing time zone is probably a better indicator of country?") is better supported than the
implemented decision.

**Revised recommendation for the future-work item:** timezone PRIMARY, locale FALLBACK. Timezone
answers "where am I"; locale answers "how do I like things formatted"; currency follows location. A
fallback is still required because timezone can be `UTC` in containers/VMs, which maps to no country.
The detected value should remain a DEFAULT the user can override at vault creation, never a silent
lock-in.

**Implementation constraint:** there is NO IANA-zone -> ISO-3166 mapping in the dependency tree today,
and `Intl` does not expose one directly. Per CLAUDE.md ("use established libraries for algorithms;
custom implementations are bugs waiting to happen"), this must use a maintained tz->country package
rather than a hand-rolled table. The existing `REGION_TO_CURRENCY` map
(`detect-currency.ts:170-260`, ~70 countries) can be reused for the country -> currency half.

Disposition is UNCHANGED: still future work, still outside the frozen SCOPE selection (scratch `:33`
is outside the frozen 151-350 block range). This amendment records the evidence and the corrected
design rationale so the future decision is not re-litigated from the wrong premise. Pulling it into
this goal remains a scope EXPANSION requiring the independent scope adjudicator.

## Q-USER-2026-08-01 — Second scope admission UR-005..UR-008, with three open ambiguities

Four further items reported by the human principal on 2026-08-01 and admitted to committed scope at
the principal's instruction, via a NEW frozen source `specs/010-user-reported-refinements-2/spec.md`
(SHA `a137e38848db04c656169c97e4ff5b862feec6ca29d6e6069c81c2c279dc95c5`, 86 lines, 4,902 bytes).
`specs/human-scratch.md` was NOT edited; it remains frozen at rolling `469e98c7…`. See D-021.

Root played the fourth item back to the principal for confirmation and, per the no-pause rule, did
NOT wait for an answer: each ambiguity below is recorded with the safest reversible choice already
taken, so implementation can proceed and be corrected cheaply if the principal says otherwise.

### Q-UR008-01 — "22 rows errored" vs "15 errors"

The principal's report said "it said I think 22 rows were errored" and later quoted the summary as
`561 old, 46 duplicates and 15 errors`. Root measured the actual file: EXACTLY 15 rows carry an
amount with a leading `+` (`+69.00`, `+5000.00`, …), and `parseAmount`
(`src/lib/import/csv.ts:165-190`) handles `-`, accounting parentheses and currency symbols but has NO
branch for a leading `+`, so those rows fail magnitude validation. 15 measured == 15 reported.

**Safest reversible choice taken:** frozen text requires that EVERY row reported as an error be
genuinely unparseable, rather than fixing a specific count. That wording holds whether the true
figure is 15 or 22 — if a further error class exists, the requirement still fails until it is fixed.
No count is hard-coded in the frozen text. If the principal confirms 22 was a distinct run, the
implementer must find the second class; the requirement already obliges it.

### Q-UR008-02 — Wording of the old/duplicate/both labels

The principal asked for "another label for old duplicates, to distinguish duplicates that will be
included from those that are old and won't be included", and did not specify wording.

**Safest reversible choice taken:** the frozen text mandates the SEMANTIC — old, duplicate, and both
must be counted distinctly so no count is ambiguous about why a row was excluded or whether it will
be imported — and deliberately does NOT dictate label strings. Copy can be adjusted without a scope
change; a mandated string could not.

### Q-UR008-03 — Is "561 old" itself plausible?

At a 10-day cutoff against a 622-row file spanning months, 561 old is arithmetically plausible
(561 + 46 + 15 = 622, accounting for every row). The principal flagged it as confusing, not
necessarily wrong.

**Safest reversible choice taken:** treated as a LABELLING defect only, per Q-UR008-02, and NOT
specced as a miscount. If the principal reports the figure is itself wrong, that is a separate
finding to route then. Root did not invent a defect the evidence does not support.

### Reference data handling (root decision, no ambiguity)

The principal's `~/Downloads/CSVData.csv` and `~/Downloads/OFXData.ofx` are REAL personal financial
data, 622 transactions each. They must NOT be committed as fixtures. The task requires SYNTHETIC
fixtures reproducing the STRUCTURE only: no header row, `dd/MM/yyyy` dates, quoted fields, at least
one leading-plus amount, at least one quoted description containing a comma. Root measured the real
files read-only to locate the defect and committed no row of their content. This is a secret-safety
posture, not a preference.

### Q-UR008-01 and Q-UR008-02 — RESOLVED by the principal 2026-08-01

**Q-UR008-01 CLOSED — the count is 15, not 22.** The principal confirmed: "it was 15 - I was wrong
about 22." This matches root's independent measurement exactly: 15 rows in the reported CSV carry an
amount with a leading `+`, and `parseAmount` (`src/lib/import/csv.ts:165-190`) has no branch for a
leading plus. There is NO second error class to hunt. The frozen text is unchanged and remains
correct — it requires that every row reported as an error be genuinely unparseable, which this single
defect satisfies once fixed.

**Q-UR008-02 CLOSED — the principal specified the exact summary breakdown.** Requested categories,
verbatim:

- Total Rows
- Valid
- Errors
- Duplicates (will be marked)
- Old New (excluded)
- Old Duplicates (excluded)

Read against the reported figures, this resolves the ambiguity the principal originally raised. The
confusing `561 old` conflated two different exclusions; the requested breakdown splits them into
**Old New** and **Old Duplicates**, and separates both from **Duplicates**, which are IMPORTED and
merely marked. The parenthetical qualifiers carry the meaning: "(will be marked)" says the row is
imported; "(excluded)" says it is not. Every row therefore lands in exactly one of Valid, Errors,
Duplicates, Old New, or Old Duplicates, and those sum to Total Rows.

**Effect on frozen scope: NONE — this is a refinement WITHIN the frozen requirement, not an
expansion.** `specs/010-user-reported-refinements-2/spec.md:78-80` already mandates the semantic:
"The import summary distinguishes rows excluded for being older than the cutoff from rows excluded as
duplicates, and names separately those rows that are both old and duplicates, so no count is
ambiguous about why a row was excluded or whether it will be imported." The principal's list is a
concrete instance of exactly that. Root deliberately kept label STRINGS out of the frozen text so
wording could be settled without a scope change; this is that path working as intended. No new frozen
source, no SCOPE edit, no adjudicator.

**Binding instruction to the P29 implementer:** implement precisely these six categories with these
labels, preserving the parenthetical qualifiers, and assert in tests that the five outcome categories
partition Total Rows with no row counted twice and none omitted.

**Q-UR008-03 remains OPEN and unchanged** — treated as a labelling defect only. The requested
breakdown is expected to resolve the confusion the principal reported about `561 old`, since that
figure will now split into Old New and Old Duplicates.

## Q-P24-01 — `getByRole` name matching differs between harnesses, and the suite is already exposed

Raised by `p24-implementer-01` during P24, transcribed here by root because `QUESTIONS.md` is
root-owned. **Carry forward to P21.**

**The hazard.** Testing Library's `getByRole` `name` option matches EXACTLY by default; Playwright's
matches as a SUBSTRING. The same assertion is therefore correct in one harness and ambiguous in the
other. P24's first E2E campaign failed on precisely this: a locator for the accessible name `"Me"`
also matched `"Unnamed member"` — "Unna**me**d" contains "me" — producing a strict-mode violation
with two matched elements. The package's unit tests could not have caught it, because they run under
Testing Library where the same name matches exactly.

**Measured exposure, not asserted.** The implementer counted rather than warned: **469** `getByRole`
calls in `tests/e2e/` pass a `name`, of which only **33** pass `exact`. Pairwise containment over the
distinct short literal names surfaces collisions ALREADY PRESENT in the suite:

- `"Add"` is contained in `"Add owner"`, `"Add Person"`, `"Add Tag"`
- `"Coffee"` is contained in `"Coffee Shop"`
- `"Status"` is contained in `"Statuses"`

Each is a latent strict-mode violation that fires whenever both labels are simultaneously visible in
the same container — the exact condition that bit P24.

**Explicitly NOT the load-dependent flake class.** A timeout increase can never fix it: the locator
resolves to two elements deterministically whenever both are present. Cross-reference `Q-P20B-20`,
where assuming the wrong flake class already cost time in this goal, and `Q-P22-R02-01`, where a
transient-state synchronisation had to be replaced rather than given a longer deadline.

**Scope.** The implementer fixed only its own three locators with `exact: true` and deliberately did
NOT sweep the remaining 436, on the grounds that doing so would silently widen its package. Root
agrees: the sweep is a separate piece of work. Recorded here so P21 can decide whether to charter it
as its own package or accept the residual risk with reasons.

## Q-P24-02 — A required leaf prop does not make a state unrepresentable if an upstream prop is optional

Proposed by `p24-reviewer-01` during P24, generalised from its advisory finding A-1 and demonstrated
empirically rather than asserted. Transcribed by root because `QUESTIONS.md` is root-owned.
**Carry forward to P21.**

**The pattern.** P24 made `displayName` a REQUIRED prop on `PresenceAvatar` carrying a discriminated
union, so the component cannot be handed a raw pubkey hash. Root endorsed that as making the illegal
state unrepresentable, per `.claude/rules/typescript-style.md`. The guarantee is real AT THE LEAF and
does not hold along the whole path: `resolveMemberName?` is OPTIONAL on both
`TransactionTable.tsx:51` and `TransactionRow.tsx:100`, and `TransactionRow.tsx:225` supplies
`?? { kind: "unnamed" }`. So the row avatar's correctness rests on ONE unguarded call site,
`TransactionTable.tsx:496`, and the type system will not defend it.

**Demonstrated, not inferred.** In a throwaway `git archive` tree the reviewer deleted that single
plumbing line and observed **tsc exit 0 and 1810 unit tests passing** — a silent regression that both
the compiler and the unit suite accept. Root independently verified the optional props and the `??`
default. The probe tree was deleted and the shared checkout verified untouched.

**Why it is advisory and not blocking for P24.** The worst case is silent degradation to
"Unnamed member", never a pubkey hash, so shipped behaviour on the reviewed tree is correct and UR-003
is satisfied. The finding is about the DURABILITY of the guarantee, not its present truth.

**The general lesson for P21 and future packages.** "Made illegal states unrepresentable" is a claim
about a PATH, not a component. A required prop at the leaf combined with an optional prop plus a
default upstream reintroduces exactly the state the leaf forbids, and does so invisibly. When a
package claims this rule, the audit should check every hop between the data source and the leaf, or
require the intermediate props be non-optional too. Related: A-2, that the row presence surface has no
direct test coverage at all, so nothing would catch such a regression at runtime either.

### Q-P24-01 CORRECTION — the three named collisions do NOT hold; the mechanism does

`p24-reviewer-01` refuted the worked examples in `Q-P24-01` above, and root verified all three
independently rather than accepting the refutation. **The entry's totals and mechanism stand; its
three named collisions are withdrawn.**

**What survives.** The totals reproduce exactly: 469 name-carrying `getByRole` calls in `tests/e2e/`,
33 with `exact`, 436 residual. The MECHANISM is real and P24 holds a live demonstration of it — the
run-1 strict-mode violation where a locator for `"Me"` also matched `"Unnamed member"`.

**What is withdrawn — none of the three is a live collision, each for a different reason:**

- **`"Add"`** — already guarded before P24 began. Both occurrences pass `exact: true`:
  `tests/e2e/helpers/settlement.ts:38` and `tests/e2e/transactions.spec.ts:125`.
- **`"Coffee"` / `"Coffee Shop"`** — different ROLES and different FILES. `"Coffee"` appears only as a
  `button` (`field-rule-parity.spec.ts:116,138,204`); `"Coffee Shop"` appears once as an `option`
  (`description-aliases.spec.ts:233`), in a file carrying no `"Coffee"` locator. Playwright scopes name
  matching within a role.
- **`"Status"` / `"Statuses"`** — different ROLES. `"Status"` is a `button` (`transactions.spec.ts:433`);
  `"Statuses"` is a `heading` with `level: 1` (`helpers/nav.ts:31`).

**Root's error in transcribing this.** Root lifted the implementer's measured examples into
`QUESTIONS.md` as established fact because they were presented as measurements rather than assertions.
They WERE measurements — of a text comparison that did not filter by role, container or file, and did
not exclude names already carrying `exact`. A measurement of the wrong thing is not more reliable than
an assertion, and root did not ask what was measured. This is the same recorded root pattern in a new
form: accepting a narrower check as an answer to a broader question.

**Actionable correction for whoever picks up the sweep:** filter on ROLE and CONTAINER and exclude
locators already passing `exact`, or the comparison will mostly yield false positives. An unfiltered
substring sweep would have added `exact: true` to locators that did not need it, in files the package
had no business touching, chasing three hazards that do not exist.

**This strengthens rather than weakens the decision to flag rather than sweep.** That the implementer's
own measurement does not fully survive scrutiny is the best argument that declining to act on it was
correct. The reviewer reached the same scope conclusion independently and for a different reason:
P24's own three name locators all pass `exact: true`, and it checked every other `aria-label` in the
`aside` they are scoped to — only "Open menu" and "Expand/Collapse sidebar", neither colliding. P24's
exposure is closed; the rest of the suite was equally open before this package and is not worsened by
it.

## Q-P25-01 — A comment that paraphrases frozen text can assert a flow the code does not implement

Proposed by `p25-reviewer-01` during P25, generalised from its advisory finding P25-01. Transcribed
by root because `QUESTIONS.md` is root-owned. **Carry forward to P21.**

**The instance.** `src/lib/domain/detect-currency.ts:24-25` states the inferred currency "is presented
in the vault creation flow and the user can change it before and after creation." Root verified that
`grep -rniE 'currenc' 'src/app/(onboarding)/'` returns NOTHING: there is no pre-creation currency
prompt. The vault is created headlessly and the currency is first presented on `/settings`
immediately afterwards, so the "before creation" clause describes a flow that does not exist.

**Why it is advisory and not a defect.** The clause is lifted near-verbatim from frozen
`specs/009-user-reported-refinements/spec.md:97-98`, so the implementer was faithfully tracking the
requirement's own wording, and the SUBSTANTIVE requirement is fully met — the reviewer proved the
inferred value is only a default, that a returning user's unlock never re-runs detection
(`ensure-default.ts:143` sits after the existing-vault guard at `:113-123`), and that an existing
vault's currency cannot be reset by a later time-zone change. The implementer's own comment at
`ensure-default.ts:141-142` is precisely accurate about what the code does.

**The general failure mode.** Where a code comment paraphrases frozen requirement text, and the frozen
text describes a flow more loosely than the implementation realises it, the comment reads as VERIFIED
FACT while actually being an unverified restatement of a requirement. A later reader cannot tell the
difference. The rule this suggests: **a comment should describe what the code does and CITE the
requirement, rather than restating the requirement as though it were a description of the code.**

**Root's disposition.** Root will route the reword rather than have a worker edit wording derived from
frozen text — the frozen source itself is immutable, so only the COMMENT can change, and it should
move to the `ensure-default.ts:141-142` style. Recorded here so P21 can decide whether to charter the
reword, sweep for the same pattern elsewhere, or accept it with reasons.

## Q-P26-01 — A test that hand-copies a dependency's source cannot constrain that dependency

Proposed by `p26-reviewer-01` during P26 as advisory finding F-1, demonstrated empirically. Root
verified it independently. Transcribed here because `QUESTIONS.md` is root-owned. **Carry forward to
P21.**

**The instance, and note it lands on a check ROOT asked for.** Root's P26 dispatch required the fix's
blast radius be "PROVEN bounded, not assumed" — the concern being that a transaction-table styling fix
must not leak into the shared shadcn primitives that back every input in the product. The implementer
wrote `tests/unit/transactions/cell-resting-chrome.test.ts:82-87`, whose comment reads "Blast radius,
asserted rather than assumed". Root confirmed the test asserts against `SHARED_PRIMITIVE_BASES.input`,
a string literal declared in the SAME test file, and that the file contains no import of
`@/components/ui/input` at all.

**Demonstrated, not argued.** The reviewer leaked the fix's chrome into the real
`src/components/ui/input.tsx` product-wide and **both full suites stayed green: 2186 unit tests and
168 E2E.** A regression the test exists to catch would have shipped.

**Why it was advisory rather than blocking.** The blast radius genuinely IS bounded on the reviewed
tree — `git diff -- src/components/ui/` is empty and `RESTING_CELL_CHROME` is imported only by the five
cell sites — so shipped behaviour is correct and UR-005 is satisfied. What fails is the ASSURANCE the
test advertises. The reviewer validated a one-file fix in both directions, using the existing
`@testing-library/react` and `tests/unit/components/*.tsx` precedent, before proposing it.

**The general failure mode.** A test that hand-copies a dependency's source into a local fixture is
testing its own copy, not the dependency. It will pass forever regardless of what the dependency does,
while reading like a guarantee about it. **Recommended sweep for P21:** look for local fixtures that
duplicate production constants, and for test names containing "blast radius", "outside", "unchanged"
or "does not disturb" — those phrases advertise a claim about code the test may never touch.

## Q-P26-02 — A `bg-transparent` without a `dark:` counterpart is a latent instance of the UR-005 defect

Proposed by `p26-reviewer-01` during P26. **Carry forward to P21.**

The UR-005 defect existed because `twMerge` does not treat a bare utility as conflicting with a
variant-prefixed one: `bg-transparent` and `dark:bg-input/30` target different states, so BOTH survive
the merge and the dark-mode fill remains. This is invisible in source review — the cell's own classes
read as clean.

So any hand-written `bg-transparent` WITHOUT a `dark:bg-transparent` counterpart, on an element backed
by a shadcn primitive that carries `dark:bg-input/30`, is a latent instance of the same defect. Root
confirmed at least three primitives carry it: `input.tsx:11`, `select.tsx:34` and the outline Button
variant `button.tsx:17`, the last also carrying `dark:border-input`, the only source of a resting
border. `textarea.tsx:10` carries it too and is the subject of P26's advisory F-2.

**Recommended for P21:** sweep for the asymmetric pattern rather than for visible symptoms, since the
symptom only appears in one theme and only where the primitive is used. P26's fix pairs every utility
with its `dark:` variant in `RESTING_CELL_CHROME` precisely to remove the asymmetry rather than mask
the symptom.

## Q-P26-F2 — The notes Textarea is the last unfixed instance of the UR-005 pattern

Advisory F-2 from `p26-reviewer-01`, ruled OUT of UR-005 scope by that reviewer and recorded here so it
is not lost. **Carry forward to P21.**

`TransactionRow.tsx:583`, the expanded-row notes Textarea, carries the same dark-mode resting fill via
`textarea.tsx:10`, measured at `oklab(0.999998 … / 0.045)`. It is now the ONLY remaining instance of
the pattern P26 exists to eliminate, sitting one line from five fixed sites.

The reviewer ruled it outside UR-005 on the frozen text: `spec.md:11-24` names six cells as a CLOSED
list and states its subject as the RESTING state twice, and the expanded row is not present at rest. It
confirmed both measurements itself before ruling. That is a decision, not an oversight.

Fixing it is a one-line follow-up using the existing `RESTING_CELL_CHROME` constant. P21 should decide
whether to charter it, fold it into another package, or accept it with reasons.

## Q-P27-01 — An unresolvable import makes Playwright SKIP a spec file silently, not fail it

Found by `p27-implementer-01` during P27 while attempting an advisory suggested by the P24 review.
Root verified it independently. **Carry forward to P21 — this is a campaign-integrity hazard, not a
style point.**

**The instance.** `reviews/P24-review-01.md` §4 advised importing `UNNAMED_MEMBER_LABEL` from
`@/lib/crdt/person` into an E2E spec, so that renaming the label would break at compile time rather
than silently un-matching a hardcoded string. Sound reasoning; it does not work here. The import chain
is `person.ts:19 -> defaults.ts:12 -> @/types -> temporal-polyfill`, and root confirmed
`temporal-polyfill`'s package exports publish ONLY an `import` condition:
`{".": {"import": {"types": "./index.d.ts", "default": "./index.js"}}}`. Playwright's resolver fails
with `No "exports" main defined`.

**Why it is dangerous rather than merely inconvenient.** Playwright does not report a failure. It
reports **"No tests found"** and SKIPS THE ENTIRE SPEC FILE. On a campaign that surfaces as a reduced
test count, not a red run — and a reviewer comparing "3/3 green" across runs would see three green
campaigns while an entire spec silently contributed nothing. Every prior campaign in this goal that
asserted a count did so precisely because of a related hazard; this is the mechanism that makes that
discipline load-bearing rather than ceremonial.

**Why the cited precedents mislead.** The P24 advisory pointed at `helpers/settlement.ts:14` as
precedent for importing from `@/`. That works only because `@/lib/crypto/*` never reaches `@/types`.
The precedent is real but does not generalise, and nothing in the file signals which imports are safe.

**Mitigations for P21 to consider.** Always verify the expected test COUNT with
`playwright test --list` before and after a change, rather than trusting a green campaign — P27 did
exactly this and confirmed 168 at BASE and 170 at HEAD. Treat any unexplained drop in collected tests
as a failure. And note that the underlying advisory's GOAL — making a label rename break loudly rather
than silently — remains unmet; a different mechanism would be needed.

## Q-P23-01 EXTENSION — a SECOND wall-clock assertion exists, in the E2E suite

`Q-P23-01` recorded that `tests/unit/import/duplicates.test.ts:749` asserts a wall-clock RATIO and is
therefore load-sensitive by construction. `p27-reviewer-01` surfaced a second instance, in a different
suite, and root verified both. **Carry forward to P21 as an extension of `Q-P23-01`, not a duplicate.**

**Instance 1, already recorded — unit.** `duplicates.test.ts:724` "scales linearly with input size
(O(n+m) complexity)", asserting `expect(ratio1).toBeLessThan(4)` at `:749-750` on ratios of
`performance.now()` deltas whose baseline is a sub-millisecond batch.

**Instance 2, NEW — E2E.** `tests/e2e/transactions.spec.ts:725`, the virtualization test, measures
`Date.now()` around an expansion and asserts `expect(expansionDurationMs).toBeLessThan(10_000)` at
`:804`. Root verified the assertion exists. A 10-second budget is generous, but it is still an
absolute wall-clock bound and it WILL fail under enough concurrent load.

**Both were observed failing under load in this goal, by different agents.** `p27-implementer-01` hit
instance 1 once in five runs and honestly reported it as an unattributed red run, having lost the test
name to a grep. `p27-reviewer-01` then NAMED it on its third run — confirming the implementer's
labelled-as-unconfirmed inference was correct. The same reviewer hit instance 2 by running unit suites
concurrently with an E2E campaign, and correctly killed and restarted the campaign rather than
reasoning about whether the failure was real.

**The rule this establishes, and it is the important part.** Once a campaign's load is uncontrolled,
a wall-clock failure is UNPROVABLE in either direction — it cannot be shown to be a real defect, and it
cannot be shown not to be. The only sound response is to discard the campaign and re-run in a quiet
window, which is what the reviewer did. Do NOT reason from "it is probably the known flake" to a green
verdict.

**Recommended for P21:** replace both assertions with load-independent measures — an operation count,
a complexity assertion over instrumented call counts, or a comparison against a same-run baseline
rather than absolute time. Until then, every campaign in this goal must be run with nothing else heavy
on the machine, and any agent running unit suites alongside an E2E campaign is contaminating its own
evidence.

## Q-P27-02 — A campaign is evidence only for the LOAD it ran under, not only for the tree

Proposed by `p27-reviewer-01` during P27, from an error it made and disclosed itself. **Carry forward
to P21.**

**The established rule this extends.** This goal already enforces that a campaign is evidence only for
the TREE it ran on: any mid-campaign tree change voids it and the campaign restarts from run 1. That
rule has been applied repeatedly — P22 rev 03, P25 and P26 all restarted campaigns rather than report a
mixed one.

**The new axis.** `p27-reviewer-01` ran full `pnpm test` passes CONCURRENTLY with E2E run 1 of its own
campaign. That run came back `1 failed | 169 passed` on `transactions.spec.ts:725`, the virtualization
test that asserts a 10-second expansion budget (see the `Q-P23-01` extension). Under 117 concurrent
vitest files that is almost certainly self-inflicted load rather than a tree defect — **but once the
load is uncontrolled the failure is UNPROVABLE IN EITHER DIRECTION.** It cannot be shown to be a real
defect and it cannot be shown not to be. The reviewer killed the campaign and restarted with nothing
else running; its clean run 1 then passed the very test that had gone red, settling it as an artifact.

**Why this is easy to violate by accident, and worth a rule.** Running unit suites "while waiting" for
an E2E campaign feels productive and costs nothing visible. The contamination is invisible until a
wall-clock assertion trips, and by then the campaign's evidentiary value is already gone. Two agents in
this goal have now hit load-sensitive assertions, in two different suites.

**Recommended rule for P21:** a campaign must run with nothing else heavy on the machine, and the
evidence should state that explicitly rather than leave it assumed. If a wall-clock assertion fails and
the load was uncontrolled, the only sound response is to discard the campaign and re-run in a quiet
window — never to reason from "it is probably the known flake" to a green verdict. Root applied exactly
this reasoning when accepting the reviewer's restart.

**Operational note also from this reviewer, worth keeping.** Killing a contaminated campaign needs
care: the Playwright CLI parent has a RELATIVE cmdline, so a `/tmp/mf-*` scan misses it, and an
orphaned `next-server` holding :3000 is indistinguishable from the human's dev server by name — both
print `next-server (v16.2.11)`. They can only be told apart by `readlink /proc/<pid>/cwd`. Any agent
cleaning up a campaign must use that, or it risks killing the human's server.

## Q-P28-01 — A rewritten formatter can regress an entire input class the tests never name

Proposed by `p28-reviewer-01` during P28, found in static audit. Root reproduced it independently.
**Carry forward to P21.**

**The instance.** P28 correctly fixed a positional leading-zero strip that corrupted `ja-JP` dates, and
in doing so rewrote the strip as `String(Number(part.value))`. `Intl` emits day and month in the
LOCALE'S OWN NUMERALS, so for any locale whose resolved numbering system is not `latn` this produces the
literal string `"NaN"`. Root verified: `fa-IR` `formatToParts` yields `month="۵" day="۱۲"`, and
`String(Number("۱۲"))` is `NaN`. Confirmed across `fa-IR`, `bn-BD`, `my-MM`, `ne-NP`, `ar-SA`, `ar-EG`
and `ps-AF`.

**Why the package's own tests could not catch it.** All five locales the tests cover — `en-AU`,
`en-GB`, `en-US`, `de-DE`, `ja-JP` — use Latin digits. The regression is invisible to every one of
them, and invisible to the principal, whose browser is `en-US`. A package can therefore be
comprehensively tested against its named cases and still regress an entire unnamed class.

**How the reviewer caught it, which is the transferable part.** It imported the REAL product module
rather than reimplementing the expression, swept inputs OFF the tested path, and diffed the behaviour
against base `c9be708` to separate a regression from a pre-existing gap. That last step is what turned
"this output looks wrong" into "this package introduced it": base rendered `"۵/۱۲"`, a real date, so the
defect is unambiguously new.

**Recommended for P21.** When a package REWRITES a formatter, parser or normaliser rather than
extending one, the review should (a) import the real module, not a copy — see `Q-P26-01`, where a
hand-copied fixture proved nothing; (b) enumerate the input classes the tests do NOT name, here
non-Latin numbering systems and non-Gregorian calendars; and (c) diff against base to attribute any
defect found. `Q-P28-02` records the related `th-TH` Buddhist-calendar defect, which the same sweep
surfaced.

## Q-P28-02 — Do not dispatch review while the implementer still holds the tree and the single E2E port

Proposed by `p28-reviewer-01` during P28, from a root sequencing failure. **Carry forward to P21.**

**What happened.** Root dispatched `p28-reviewer-01` at 15:47 against `d657717`. The implementer
committed `d514d47` to `main` at 15:48 — one minute later — and continued running full E2E campaigns
from `/tmp/mf-p28`, holding port 3000 and driving load from 6.15 to 9.16. Because
`playwright.config.ts` pins `:3000` with `reuseExistingServer: false`, exactly one campaign runs
repo-wide, so the reviewer was blocked from its own campaign for the entire review. It did the static
half instead and found the blocking defect there, which is the only reason this cost little.

**Two distinct harms.** The tree moved under the reviewer, so its BASE was stale within a minute; and
the port was unavailable, so the authoritative campaign could not run at all. Compounding it, the
implementer's own recorded campaign no longer covered HEAD once `d514d47` changed tests — so at the
moment of review, NO campaign covered the tree that would ship.

**The rule.** Handing a package to review must be a genuine handoff: from that moment the implementer
stops committing to `main` for that package and releases the port, and root confirms the tree is FINAL
before the reviewer starts. Root should verify both — HEAD unchanged and port free — as part of
dispatch rather than assuming, exactly as it verifies the scratch SHA and FS-001 metadata.

**Root's error, recorded as such.** Root dispatched without confirming the implementer had finished,
and did not notice the port was still held. The reviewer caught it, blocked rather than reviewing a
moving target, and asked for a ruling instead of absorbing the problem. That is the correct behaviour
and it should not have been necessary.

## Q-P29-01 — A THIRD load-sensitive test, and an ESLint hazard from worktree placement

Two findings from P29, both verified by root. **Carry forward to P21.**

**(a) A third load-sensitive test, extending `Q-P23-01`.** `tests/integration/vault-maintenance.test.tsx`
("sanitizes generic action and edit callbacks") failed once under load with
`expected undefined to be 'before'`. It drives a MOCKED `requestAnimationFrame` — root confirmed the
`vi.spyOn(window, "requestAnimationFrame")` calls at `:447` and `:501` — so it is frame-timing
dependent rather than wall-clock dependent, a different mechanism from the two already recorded. It
passed in isolation and in both subsequent full runs.

The register of load-sensitive assertions in this goal is now:
1. `tests/unit/import/duplicates.test.ts:749` — a wall-clock RATIO. Observed failing at 4.098 and
   4.671 against a bound of 4, always under load, always passing on a quiet machine.
2. `tests/e2e/transactions.spec.ts:804` — an absolute 10-second expansion budget.
3. `tests/integration/vault-maintenance.test.tsx` — mocked-rAF frame timing.

Three tests, three different mechanisms, three different suites. That is enough to treat load
sensitivity as a property of the suite rather than a quirk of one assertion, and it is why
`Q-P27-02`'s rule — a campaign is evidence only for the load it ran under — is load-bearing rather
than pedantic. P21 should either make these load-independent or state explicitly that every campaign
must run on a quiet machine and that any wall-clock or frame-timing failure under uncontrolled load is
unprovable in both directions.

**(b) A worktree inside the repo silently breaks `pnpm lint` for EVERY package.** `p29-implementer-01`
placed its worktree at `.claude/worktrees/p29-ur008`. `.git/info/exclude` hides it from git, but ESLint
does not read that file and walked it, so a bare `pnpm lint` reported **591 errors and 18,773 warnings
across 219 files**. Attribution by path gave **217 worktree files** plus **2 entries that were the same
single pre-existing `TransactionTable.tsx:426` warning**. Every error was ESLint re-linting one
package's working copy through a second path.

It was diagnosed by `p28-implementer-01`, which correctly attributed it to another package rather than
to a repo defect and deliberately did NOT "fix" the offending files — which would have edited another
package's in-flight work. `p29-implementer-01` then verified the diagnosis independently before acting
on it, and relocated to `/tmp/mf-p29`. Root confirmed the worktree is gone from the repo and that a
bare `pnpm lint` now exits **0** with one pre-existing warning.

**Rule for P21 and for every future dispatch:** worktrees must live OUTSIDE the repository directory.
`/tmp/mf-<package>` is the convention every other package here followed. Note `git worktree move` fails
across filesystems with `Invalid cross-device link`, so relocation means commit, remove, re-create from
the branch — the implementer verified that was lossless by comparing tree digests before and after.
Worth stating in dispatches, since nothing in the repo enforces it and the failure mode is a
catastrophic-looking number that belongs to nobody.

## Q-P29-02 — Unblocking an inert code path makes everything downstream newly reachable and never-run

Generalised by `p29-implementer-01` from two defects it caught in its own package, both of which its
own fix would otherwise have converted from harmless into destructive. **Carry forward to P21 — this
is a review heuristic, not a one-off.**

**The mechanism.** When a fix unblocks a code path that was previously inert, everything downstream of
it becomes newly reachable and **has never actually run**. Latent defects below the blockage are
harmless precisely BECAUSE the path above them always failed, so they are invisible in the bug report,
invisible in the existing tests, and invisible to anyone reasoning about the reported symptom.

**Two instances, same package, same shape:**

| defect | at BASE | after a detection-only fix | user-visible result |
| --- | --- | --- | --- |
| `parseRawRows` computed `detectHeaders` and DISCARDED it, leaving `hasHeaders` true | harmless — nothing parses anyway | first data row silently dropped as a header that is not there | 621 of 622 rows import, and it **looks like success** |
| `MappingTab`'s Auto-detect button matched header NAMES and returned `{}` on a headerless file | merely useless | `onMappingsChange` overwrites wholesale, so clicking it WIPES the mappings the load path just resolved correctly | the working preview is destroyed by the button meant to repair it |

Both would have been introduced BY the fix, not found by it. Root's dispatch had independently
cautioned about the second — that the button-driven and on-load paths could now disagree — but the
observed behaviour was worse than disagreement: it was destruction of correct state.

**Why it matters more than an ordinary regression.** In both cases the post-fix failure is
*plausible-looking*. A silently dropped first row and a wiped mapping both present as ordinary results
rather than as errors, so neither would necessarily be caught by a reviewer checking that the reported
symptom is gone.

**Recommended for P21, and for any package that unblocks a previously-failing path:** enumerate what
becomes reachable for the first time, and test THOSE paths rather than only the fix. Ask "what has
never run before this change, and what does it assume?" The existing test suite cannot help here by
construction — it passed while the path was dead.

## Q-P29-03 — A green test that cannot fail discharges the obligation to check without checking

Self-caught by `p29-implementer-01` and recorded in its evidence §4.3. **Carry forward to P21.**

Writing a test for the `MappingTab` parity fix, the implementer first wrote an assertion comparing
`detectColumnMappingsFromValues(rows)` to `detectColumnMappingsFromValues(rows)` — both sides calling
the same function. It passes for ANY implementation of the button, including the broken one. **The tell
that caught it: it went green immediately, before the fix was applied.** It was replaced with a test
that renders the real component and clicks the real button via `fireEvent`, which fails at BASE with
`expected "vi.fn()" to be called with arguments: [ Array(1) ]`.

The implementer's framing is the right one and worth carrying verbatim: **a green test that cannot fail
is worse than no test, because it discharges the obligation to check without doing the checking.**

**This is the third shape of the same family in this goal**, and they should be swept for together:
- `Q-P26-01` — a test hand-copying a dependency's source into a local fixture, which can never
  constrain that dependency.
- `Q-P27-01` — an unresolvable import making Playwright or vitest report zero tests rather than
  failing, so a whole spec silently contributes nothing.
- `Q-P29-03` — a tautological assertion that passes for every implementation.

All three produce a PASSING-LOOKING result that proves nothing, and none is visible in a green summary
line. **Recommended detection for P21: run every new or changed test against the pre-fix tree and
require it to FAIL by name.** Every one of these three shapes is caught by that single check, and
several packages in this goal already adopted it voluntarily.

## Q-P28-03/04/05 — Three review-method findings from the P28 rev 02 re-review

Proposed by `p28-reviewer-02`. Root verified the mechanism behind Q-P28-03 directly. **Carry forward
to P21.**

**Q-P28-03 — a correctly-shaped round-trip table can still miss a defect if no member of it exercises
the axis.** P28's locale table was extended from 5 to 9 with coverage strictly up, deliberately naming
input CLASSES rather than adding arbitrary locales — non-Latin numerals, non-Gregorian calendar,
year-first order. It was a good table and it still missed F-4, because **all nine locales happen to
agree between the `numeric` and `2-digit` skeletons.** The axis that mattered — *the editing skeleton
is not the parsing skeleton* — was not represented by any member. Root confirmed the divergence
exists: `mt-MT` is `month/day/year` numeric but `day/month/year` 2-digit; `ug-CN` is `year/day/month`
against `year/month/day`. So "name the input classes" (`Q-P28-01`) is necessary and not sufficient: a
class is only covered if some member actually differs along it. Recommended check: for any table-driven
locale or format test, verify that at least one row DISAGREES on each axis the code branches over,
rather than assuming diversity of names implies diversity of behaviour.

**Q-P28-04 — Node ICU and browser ICU disagree, so census both.** The same F-4 census gave **9 of 114
locales, 52 cases** under Node ICU 76.1 and **4 of 112 locales** in Chromium. Neither number is wrong;
they are different ICU builds with different locale data. A defect censused only in Node may
under- or over-state what ships to a browser, and a fix verified only in Node is not verified for
users. The reviewer confirmed F-4 end to end in a real browser (`te-IN` displayed `15-06-25`, retyped
verbatim, stored `25-06-15`) rather than resting on the Node census — which is what made the finding
unarguable.

**Q-P28-05 — a reviewer's own probe can manufacture a defect, so re-run before reporting.** The
reviewer's first manual probe showed `th-TH` rendering `03/08/69` and it initially read this as F-2
unfixed. It did not survive scrutiny: the cause was its own scratch spec leaving the cell in a stale
state, and 12 of 12 clean re-runs were correct, with an in-page probe confirming Chromium honours the
Gregorian pin. **F-2 is genuinely fixed.** It recorded the false alarm in the review rather than
dropping it silently. That is the right disposition — an abandoned reviewer result should be visible,
because a reader who later finds the same artefact needs to know it was investigated and rejected
rather than never seen. Compare `Q-P24-01`, where an implementer's measured collisions did not survive
review and the totals stood while the named examples were withdrawn.

## Q-P28-06 — A coordinator's cleanup of a shared checkout can destroy an agent's uncommitted work

**Root's own error, recorded as such. Carry forward to P21.**

**What happened.** `p28-implementer-01` had ~145 uncommitted lines of F-4 work in the shared checkout
`/home/ben-agents/Code/moneyflow`. That blocked `p29-reviewer-01`, because `src/lib/utils/date-format.ts`
is imported by `ImportTable.tsx` inside P29's file set, so the reviewer could not distinguish the tree
under review from another package's work in progress. After asking three times for the work to be
moved, **root ran `git checkout -- src tests`** in the shared checkout.

Root saved a patch (`/tmp/p28-f4-wip.patch`) and a `git stash` first, and told the implementer where
they were. **But root did not announce the discard before doing it, and did not confirm recovery before
letting a dependent review proceed.** The implementer experienced its work vanishing mid-session,
recovered from its own copy, rewrote its tests, and — reasonably — attributed the reversion to a
concurrent P29 operation, because nothing told it otherwise. Root later verified the stash and the
committed work were the same change, so nothing substantive was lost, but that was luck rather than
design.

**The general failure.** The shared-checkout hazard runs in BOTH directions. `Q-P29-01` and the P29
incident record one agent's edits landing in the shared tree and endangering others. This records the
converse: **a coordinator's cleanup destroying an agent's uncommitted work.** The second is worse in one
respect — the agent has no way to attribute it, so it will look like corruption or another agent's
fault, which is exactly what happened.

**The rules this implies:**
1. Never discard a shared working tree without first telling the owner explicitly that a discard is
   about to happen, and confirming they have recovered.
2. A blocked dependent package is a reason to sequence, not a licence to destroy. Root should have
   held the reviewer's dispatch rather than clearing the tree under an active implementer.
3. **Worktree location outside the repository must be a dispatch requirement from the first package,
   not a lesson discovered per-package.** Three packages hit shared-checkout or in-repo-worktree
   problems before root made it standing guidance.
4. Committing early on a branch is the only defence available to a worker, and the implementer
   identified that itself. Dispatches should say so.

## Q-P28-07 — Adding a parse format cannot disambiguate two orders of the same digits

Found by `p28-implementer-01` while implementing the fix its own reviewer proposed. Root verified.
**Carry forward to P21 — it overturns a verified review finding.**

`p28-reviewer-02` diagnosed F-4 correctly: `parseLocaleDate` derived candidates from the `numeric`
skeleton while `formatDateForEditing` renders the `2-digit` one, and for 9 of 114 locales those
disagree. It proposed adding the editing skeleton to `candidateFormats` and reported the census going
**52 failures → 0**.

**That fix is necessary but NOT sufficient, and the shortfall is in the worst cases.** Root verified
the mechanism:
```
parse('03/08/26', 'M/d/yy') -> Sun Mar 08 2026
parse('03/08/26', 'd/M/yy') -> Mon Aug 03 2026
```
Where two skeletons differ only in field ORDER, both parse the same digits SUCCESSFULLY, so the first
candidate in the list wins and the added format changes nothing. Reordering only moves the failure.
The implementer observed `mt-MT` and `ug-CN` still storing `2026-03-08` for a displayed 3 August after
applying the reviewed fix — **precisely the two locales that store silently rather than rejecting.**

**Why the review's figure did not catch it:** a wrong parse that FAILS is visible in a census; a wrong
parse that SUCCEEDS is not. The reviewer's harness most plausibly counted null-rejections and missed
transpositions. So a verified "N → 0" figure can be sound in method and still blind to the worse half
of a defect class.

**The resolution, which generalises:** where several interpretations parse, prefer the one whose own
RE-RENDERING reproduces exactly what was typed. Round-trip verification is decisive precisely in the
ambiguous case and inert otherwise. Recommended for P21: any parser offering multiple candidate formats
over the same input should disambiguate by round-trip rather than by candidate order, and any census of
parse defects should separately count silent-wrong-value from loud-rejection.

## Q-PROPOSAL-P30-07-01 — a unit case's grading is load-dependent

**Raised by:** `p30-reviewer-04`, P30 rev 07 review. **Severity: LOW, advisory — not blocking.**

`rule-proposal-auto-apply.test.tsx:140` ("applies when the edit began with focus in the row…") grades
**10/20 red** against rev 06 when run inside its own file, but **20/20 red** in isolation. MEASURED.
Cause: a single `advanceTimersByTimeAsync(10)` coupled to the real clock via `shouldAdvanceTime:
true`, so whether rev 06's third deferred flush lands is load-dependent.

**Rev 07 itself grades 20/20 green — there is no flake in the shipped direction**, and the E2E suite
grades the same regression deterministically, which is why this is advisory.

**Why it matters beyond this case:** a test used as a *grading instrument* — run against a reverted
fix to prove it discriminates — needs its own timing to be load-independent, or the grade is a
measurement of machine load. **Recommended for P21:** where a revert-check is cited as evidence,
confirm the grading run was deterministic rather than a single sample.

## Q-PROPOSAL-P30-07-02 — the manual-mode clause is not covered at the decision layer

**Raised by:** `p30-reviewer-04`, P30 rev 07 review. **Severity: LOW, advisory — not blocking.**

Removing `isAutomatic` from `TransactionRuleProposal.tsx:202` — which makes the manual "Update" modes
auto-apply, a direct violation of frozen `human-scratch.md:263-266` — leaves the **entire unit and
integration suite green**. MEASURED. Cause: the test file's mock hard-codes `updatingAll`, so no unit
case ever exercises a manual mode through the component's decision.

**The clause is covered**, at E2E (6 of 11 journeys redden) and by `applyModeIsAutomatic`'s own unit
tests — but **not at the layer where the component decides**. A follow-up `updateAll` case in the
component's own file would close it.

**Generalises:** a mock that hard-codes one value of a discriminating input makes every case in that
file blind to the discrimination, however many cases there are. Same shape as the F-1 and F-2 fixture
gaps in P33: correct assertions over inputs that cannot express the failure.

## Q-P20B-21 — Should `expect.timeout: 15_000` be paired with a raised per-test `timeout`?

- **Source:** `evidence/P20B/implementation-08.md` §9 (`Q-P20B-07-01`), endorsed by
  `reviews/P20B-review-07.md` §9.
- **Context:** `playwright.config.ts` now sets a 15 s `expect` budget inside a 30 s test budget.
  MEASURED by the implementer: **156 tests remain on the 30 s default**, and **113 of 115 `toHaveCount(0)`
  absence assertions carry no explicit timeout**. Two failing bare assertions in one test can
  therefore exhaust the test budget and report a less precise error than the assertion itself would.
- **Reversible default selected:** leave the pairing unmade. The alternative — leaving `expect` at
  the 5 s Playwright default — is measurably worse and was the defect this revision closed.
- **Basis:** hierarchy 4 (smallest reversible change).
- **Status:** OPEN, non-blocking. Reversal is a one-line config change.

## Q-P20B-22 — The `goToPeople` content wait is defence in depth, not the load-bearing fix

- **Source:** `evidence/P20B/implementation-08.md` §9 (`Q-P20B-07-02`).
- **Context:** recorded so a later reader does not mistake it for the operative change; the
  `playwright.config.ts` lever carries the load.
- **Reviewer correction root carries across rather than transcribing verbatim
  (`reviews/P20B-review-07.md` §9):** the proposal's premise is **narrower than it reads**. The
  implementer measured "the vault is already selected when the h1 resolves" **on an idle machine**.
  The **structural** gap is real — `people/page.tsx` renders the h1 unconditionally and `PeopleTable`
  only when `activeVault?.id`. **The wait is therefore worth keeping on its own merits**, and this
  entry must not be read as a licence to remove it.
- **Status:** OPEN, non-blocking, retain-as-is.

## Q-P20B-23 — `setAllocation`'s old substring barrier: real in principle, REFUTED as the observed cause

- **Source:** `evidence/P20B/implementation-08.md` §9 (`Q-P20B-07-04`).
- **Transcribed WITH ITS RETRACTION ATTACHED, at the reviewer's explicit request**
  (`reviews/P20B-review-07.md` §9): the proposal as written states the substring barrier "can pass
  without the explicit allocation being stored". **The implementer's own §4.3c refutes that for all
  three failures it examined** — it printed the DOM instead of reasoning about it and found the
  string the theory required does not exist pre-commit — **and the reviewer's §2.3 measurements
  agree.** The mechanism is real in principle and **did not occur**.
- **Why the retraction is attached rather than the entry dropped:** transcribing it unqualified
  would re-seed a hypothesis this revision paid real time to kill. Recording the killed hypothesis
  with its refutation is what stops a later reader reviving it.
- **Status:** CLOSED as a cause; the barrier was nonetheless hardened on narrower grounds with a
  red-then-green proof (`c515173`).

## Q-P20B-24 — `next-env.d.ts` churns on every dev-server start and breaks naive campaign digests

- **Source:** `evidence/P20B/implementation-08.md` §9 (`Q-P20B-07-05`).
- **Context:** Next.js rewrites the generated import path whenever `pnpm dev` starts, so a
  `git diff | md5sum` digest moves every run even when nothing was authored. This aborted one
  campaign in this revision.
- **Reversible default:** campaigns exclude that generated path **and additionally hash the files
  under test directly**. Both are present in `/tmp/p20b07-c2/run.sh` and root re-derived the result.
- **Status:** OPEN as a method note for future campaigns.

## Q-P20B-25 — `oxfmt` has no ignore configuration and sweeps `specs/**`

- **Source:** `evidence/P20B/implementation-08.md` §9 (`Q-P20B-07-03`).
- **Context:** a bare `pnpm format` rewrites `specs/**` markdown **including the frozen
  `specs/human-scratch.md`**. Pre-existing, endorsed by the rev 06 reviewer as a follow-up, and
  unchanged by this work. It is why `pnpm format:check` is red at this tree with **0 files under
  `src/` or `tests/` affected**.
- **Status:** OPEN, pre-existing, carried forward. Agents scope `oxfmt` to their own files.

## Q-P20B-26 — Should the residual settlement failure class be re-routed off P20B?

- **Source:** `reviews/P20B-review-07.md` §9 (`Q-PROPOSAL-P20B-07-1`), raised by `p20b-reviewer-07`.
- **Context and evidence:** P21 rev 06 routed this class to P20B as a **test-instrument** defect
  (F-1). Three independent lines of evidence now contradict that classification:
  1. the failing pages render the **terminal `settled`** state, which `settlement-view.ts:186-193`
     reaches only when `obligations.length === 0` **and** `qualifyingTransactionCount !== 0`, a
     counter incremented at `settlement.ts:1227` **after** `commitCalculation` — so the page has
     **already hydrated and run the settlement engine**. It is a terminal answer, not a transient,
     and **no timeout can fix it**;
  2. the arithmetic discriminates a **missing explicit allocation** from every rival explanation;
  3. the pre-hydration transient rev 06 posited is **≤10 ms wide** against failures that hold for
     **15,000 ms**.
  Both instrument defects the routing named are now fixed and **the class persists at 1.10/run
  (root's 10-run campaign, `/tmp/p20b07-c2/`) and 2.25/run (the reviewer's 4-run campaign,
  `/tmp/rev07-campaign/`) on the identical tree.**
- **Why existing authority does not decide it:** `PROCESS.md:130` routes allocation/settlement
  ownership to P16A–E, or P17A–D for the automation path, and cross-cutting **style** defects to
  P20B. It gives no rule for a class routed to P20B on a diagnosis that the P20B revision then
  refuted.
- **Reversible default selected to continue:** **open it as an unowned tracked risk beside F-2,
  pending a mechanism measurement** — not re-routed to P16A–E, and not left on P20B by default.
  F-2's history in this goal shows that **assigning an owner on an unmeasured mechanism is what
  produces wasted revisions**; two consecutive audit cycles have now been spent that way.
- **Decision-hierarchy basis:** 2 (the contract's own warning against routing to a default package
  merely to avoid invalidating a prior PASS), then 4.
- **The single discriminating experiment that decides it**, named by the reviewer: read the
  persisted IndexedDB state after a **barrier-confirmed** allocation write and a navigation. **Entry
  absent → a lost write (P16A–E). Entry present but unapplied → rehydration/derivation.** Root is
  routing this measurement before any ownership ruling, so the routing is decided by evidence rather
  than by adjudication in the dark.
- **Status:** OPEN and BLOCKING for P21. Ownership deliberately unassigned.

## Q-P20B-27 — Should an evidence artifact be forbidden from being frozen before the campaign it reports?

- **Source:** `reviews/P20B-review-07.md` §9 (`Q-PROPOSAL-P20B-07-2`), raised by `p20b-reviewer-07`.
- **Context:** finding F-A. `implementation-08.md` was last written at **10:17:27**, inside **run 1**
  of a campaign that ended at **10:59:09**, leaving §4 as the literal token `PLACEHOLDER-CAMPAIGN`,
  two dangling `§4.2b` references and a "FINAL tree" line that a later section of the same file
  discards. `PROCESS.md:58` persists the file **unchanged**, and `PROCESS.md:359` makes artifacts —
  not chat — the recovery source, so the defect is durable.
- **Why existing authority does not decide it:** `PROCESS.md:153-159` lists what evidence must
  record but sets **no ordering constraint** between handback and the campaign the evidence depends
  on.
- **Reversible default selected:** require the implementer to hand back only after every artifact it
  cites exists — a one-line addition to the implementer checkpoint, no process restructuring. It
  costs the implementer a wait it was already going to spend.
- **Basis:** hierarchy 2, then 4. **Reversal:** delete the sentence.
- **Status:** OPEN. Root is applying the default to the revision 08 dispatch immediately.

## Q-P20B-28 — Is a single false claim in evidence that changes no conclusion a FAIL or a root-recorded correction?

- **Source:** `reviews/P20B-review-08.md` §8 (`Q-PROPOSAL-P20B-08-1`), raised by `p20b-reviewer-08`.
- **Context:** finding F-D. Evidence `implementation-09.md:111-113` carries a **`MEASURED`-tagged**
  sentence that is false, inside the very section that remediates F-A. Its conclusion is correct and
  no figure moves.
- **Why existing authority does not decide it:** `PROCESS.md:64` makes "any failed check or material
  finding" a FAIL for **P21**; it gives no calibration for a normal package revision where a claim
  is wrong but its conclusion is independently verifiable from the same section.
- **Reversible default selected:** **PASS with the correction stated exactly and recorded by root**,
  rather than a further revision. Root already has the mechanism — `be50232` recorded a
  post-handoff correction to a persisted review without opening a revision.
- **Basis:** hierarchy 4 (smallest reversible step). **Status:** OPEN, applied.

## Q-P20B-29 — Should a campaign directory be identified by its recorded `head=`, never by a completeness marker?

- **Source:** `reviews/P20B-review-08.md` §8 (`Q-PROPOSAL-P20B-08-2`), raised by `p20b-reviewer-08`.
- **Context:** F-D's substance. **MEASURED and re-verified by root:** of the four candidate
  directories, **two** end `CAMPAIGN_COMPLETE`, not one — `/tmp/p20b07-c2/` **and**
  `/tmp/p20b07-final/`. `-final` is a **complete ten-run campaign** (10 `run<N>.log` files) at
  **`head=6061ef7`**, the **pre-fix** tree whose `:281` step 11 failed in **10 of 10** runs. A future
  reader applying the completeness rule as written gets two candidates and can select the campaign
  the goal already paid to discard.
- **Reversible default selected:** identify a campaign by the `head=` recorded in its own START/END
  lines. `/tmp/p20b07-c2/` is the campaign whose twenty lines all read **`head=c515173`**, the
  handback commit. A completeness marker says a loop finished; it says nothing about which tree ran.
- **Basis:** hierarchy 2, then 4. **Status:** OPEN, adopted going forward.

### Q-P20B-26 — CLOSED as ROUTED 2026-08-03 (D-021)

The discriminating experiment this question named **was run and answered**: the entry is **ABSENT**
from persisted IndexedDB (195 runs, 50 losses, **no op row ever created**, zero counterexamples) —
a genuine **lost write**, not a rehydration gap. Evidence
`evidence/P21/diagnostic-Q-P20B-26.md`. Independent ruling `adjudications/P21-scope-02.md` → D-021:
the **E2E harness component is IN-GOAL to P20B (HS-021)**; **product
durability-at-acknowledgement is OUT-OF-GOAL**, tracked at `RISKS.md#R-LOSTWRITE-01`. The concern
this question was raised to guard against — leaving the class on P20B merely to avoid invalidating a
prior PASS — is answered: **the adjudicator found the P20B routing correct on the merits.**

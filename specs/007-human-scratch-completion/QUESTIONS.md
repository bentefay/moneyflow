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

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

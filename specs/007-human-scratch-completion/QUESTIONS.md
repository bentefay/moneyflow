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

# Decision Log

Append decisions; do not erase superseded reasoning. Product decisions discovered during execution
need evidence, alternatives, security/UX impact, and a reversal path.

## D-001 — Frozen scope includes the live code-quality item

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** Freeze the 21-requirement human-scratch source at scratch SHA-256 `b91ca932…`.
  Assign the later-added code-quality sweep `HS-021` and schedule it as P20B after feature work.
- **Reason:** The user's objective is every currently unticked item; omitting the live addition
  would knowingly leave the objective incomplete.
- **Consequence:** Historical IDs HS-003–HS-020 remain stable; HS-021 is intentionally out of source
  order. Later scratch changes use the drift process.

## D-002 — Sequential implementation and independent review

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** One implementer owns one package, followed by a distinct reviewer over exact
  `BASE..HEAD`; no parallel code-writing packages.
- **Reason:** Shared-worktree write conflicts and context pollution are more costly here than
  nominal parallel speed, while an independent UX/test review is explicitly required.

## D-003 — Ambiguity does not pause the Goal

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** Apply the PROCESS decision hierarchy, log uncertainty in QUESTIONS, and choose the
  safest reversible default. Human review is deferred until all feasible work is otherwise done.
- **Boundary:** This does not authorize destructive data loss, secret exposure, external
  publication, or pretending an unavailable dependency/API exists.

## D-004 — Canonical settlement spec is a first-class requirement in this Goal

- **Date:** 2026-07-19
- **Status:** accepted for orchestration
- **Decision:** Select the complete immutable
  `specs/008-transaction-percentage-allocations-settlement/spec.md` as `FS-001`, the 22nd
  first-class requirement, frozen at SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
  Prefixes identify provenance only; `FS-001` receives the same implementation, evidence, exhaustive
  independent review, style, E2E, manual UX and final-audit gates as all `HS-*` requirements.
- **Reason:** The canonical feature spec is explicit implementation authority and must not be hidden
  beneath the narrower scratch allocation item.
- **Consequence:** The Goal cannot complete until P16A–E and the FS-001 requirement ledger pass.
  Progress is never recorded by editing this source; its exact identity is checked at P00, every
  package boundary, recovery and P21.

## D-005 — Canonical allocation and settlement invariants are not design options

- **Date:** 2026-07-19
- **Package / scope:** P16A–E / FS-001 and HS-009
- **Status:** accepted for orchestration
- **Decision:** Explicit per-person allocations are finite decimal percentages in `-100..100`, may
  total any value and are rejected—not clamped or normalized—when invalid. The owner's remainder is
  `100 - sum(explicit)`, including zero and negative values; valid ownership divides that remainder
  so effective shares total exactly 100. Signed minor-unit apportionment uses the established
  decimal library, mathematical floor (including negatives), largest remainder and stable-ID
  tie-breaking. `src/lib/domain/settlement.ts` is the sole settlement engine, operating per currency
  with traceable positions, obligations, source contributions and typed issues.
- **Reason:** These are frozen normative clauses in FS-001. Treating them as open design questions
  would risk unit loss, silent financial mutation and competing totals.
- **Consequence:** All current/future mutation paths use the validated CRDT APIs; invalid legacy
  data is retained and surfaced honestly rather than silently migrated. P16A–E package contracts and
  P21 audit must exercise conservation, negative values, deterministic ties, invalid data,
  historical people and source traceability.

## D-006 — P00 accepts reproducible reds only as routed baseline facts

- **Date:** 2026-07-20
- **Package / scope:** P00 / control
- **Status:** accepted
- **Evidence:** `evidence/P00/implementation-02.md` and independent `reviews/P00-review-02.md` PASS.
- **Alternatives:** Fix product defects inside P00; omit known reds; or treat a green automated
  suite as sufficient baseline evidence.
- **Decision and reason:** P00 records reproducible defects without product edits only when the
  evidence is complete, truthful and routes ownership to the earliest applicable package. Revision
  01 failed for a false focus-restoration claim; revision 02 passed after independently reproducing
  and routing the actual focus loss.
- **Security, data, UX, and compatibility impact:** No defect is waived as delivered. Focus loss,
  reduced motion, dialog warnings, dark behavior, toolchain drift and future security/data work
  remain open gates for their owning packages and P21.
- **Reversal/migration path:** Owning packages remediate and independently review each red; a later
  audit finding invalidates affected package acceptance through PROCESS rollback/rereview.

## D-007 — P01 resolves latest-safe dependency currency against the installed 48-hour policy

- **Date:** 2026-07-20
- **Package / scope:** P01 / HS-002
- **Status:** accepted
- **Evidence:** `evidence/P01/implementation-02.md` and independent `reviews/P01-review-02.md` PASS
  over `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..71aa257bb9bdad736fb7ef7315854fce42c5cbb4`.
- **Alternatives:** Treat registry `latest` as authoritative despite Safe Chain suppression; retain
  review 01's unverified 24-hour assumption; or upgrade to releases younger than the installed
  policy permits.
- **Decision and reason:** “Latest safe-chain supported” means the newest stable mutually compatible
  release eligible under the effective installed Safe Chain policy at the frozen cutoff. With Safe
  Chain 1.5.13 and no configuration or environment override, the primary-source default is 48 hours;
  pnpm 11.13.1 and Vercel 56.3.1 were therefore current eligible releases. The revision-01
  “unpublished” narrative and 24-hour review premise are superseded, while its frozen pins remain
  correct.
- **Security, data, UX, and compatibility impact:** The compatible Node 22 LTS/Node 24-supported,
  TypeScript 6, Next 16 and React 19 graph passes frozen installs, dedupe, production audit, build,
  1,141 tests and 78 no-retry E2E cases. Serialized owning-client Realtime channel removal also
  closes the same-vault lock/unlock collision without reload. Eleven known audit advisories remain
  confined to the Vercel development chain; production audit is clean.
- **Reversal/migration path:** P21 repeats dependency currency, audit and runtime validation against
  the then-effective Safe Chain policy. A later incompatible or unsafe release routes to a new
  reviewed remediation range; P01 acceptance is rolled back if its assumptions no longer hold.

## Decision template

### D-XXX — Title

- **Date:**
- **Package / scope:**
- **Status:** proposed | accepted | superseded
- **Evidence:**
- **Alternatives:**
- **Decision and reason:**
- **Security, data, UX, and compatibility impact:**
- **Reversal/migration path:**

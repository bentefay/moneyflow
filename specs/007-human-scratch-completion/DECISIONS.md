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

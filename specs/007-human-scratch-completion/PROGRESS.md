# Progress Ledger

This is the authoritative execution ledger. The coordinator updates it after every state transition.
Do not infer completion from old specs, commits, or scratch checkmarks without linked independent
review evidence.

## Current position

- **Goal status:** in progress
- **Current package:** P00 revision 01 (`changes_requested`)
- **Next action:** root persists immutable revision-01 evidence/review and the failed-review state,
  records the resulting control commit, then dispatches P00 revision 02 with new exact artifact
  paths
- **Frozen sources:** `specs/human-scratch.md` at SHA-256
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b` and immutable
  `specs/008-transaction-percentage-allocations-settlement/spec.md` at SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes
- **Rolling scratch SHA-256:** `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`
- **Authorized checked HS IDs:** none
- **Active P21 rollback batch:** none
- **Semantic drift state:** clean; 21 normalized blocks byte-match SCOPE
- **Requirement state:** 22 first-class requirements queued; 21 HS marker-backed requirements plus
  one immutable whole-file FS requirement
- **Last ledger update:** 2026-07-20T00:13:06+10:00; immutable P00 revision 01 failure evidence,
  review and state persisted in control commit `00d47a420c3b6c7f66d6e89a9f8d95c2cc927c4c`

## Package ledger

| Package | Scope          | Work / task                                                                         | Depends on           | Status            | Rev | BASE..HEAD                                                                           | Implementation evidence             | Review                     | Integration commit                                           |
| ------- | -------------- | ----------------------------------------------------------------------------------- | -------------------- | ----------------- | --- | ------------------------------------------------------------------------------------ | ----------------------------------- | -------------------------- | ------------------------------------------------------------ |
| P00     | control        | [Executable baseline](tasks/P00-baseline.md)                                        | —                    | changes_requested | 01  | `0ea864f5d0142530b2d524add228d3b51f162876..0ea864f5d0142530b2d524add228d3b51f162876` | `evidence/P00/implementation-01.md` | `reviews/P00-review-01.md` | failure artifacts `00d47a420c3b6c7f66d6e89a9f8d95c2cc927c4c` |
| P01     | HS-002         | Upgrade dependencies by compatible safe chains                                      | P00                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P02     | HS-017         | Animate UI evaluation, ADR, and representative migration only if justified          | P01                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P03     | HS-018         | TanStack Virtual PR #1100 release gate and `useFlushSync`                           | P01                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P04     | HS-014         | Database/table/RLS threat model, migrations, and permission remediation             | P01                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P05     | HS-015         | Secure Supabase realtime authorization and correct live-op subscription             | P04                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P06     | HS-010         | Remove unused user-state storage and dead API surface                               | P04                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P07     | HS-011         | Evidence-led person/member/invite UX architecture and acceptance decision           | P04, P06             | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P08     | HS-012, HS-011 | Auto-person linkage and complete secure invite/member-management flow               | P05, P07             | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P09     | HS-006         | Loro UndoManager integration, controls, shortcuts and action grouping               | P01                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P10     | HS-003         | Encrypted Loro EphemeralStore presence and active transaction                       | P05, P08             | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P11A    | HS-004         | Alias schema, resolution, mutation invariants, migration and atomic bookkeeping     | P09                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P11B    | HS-004         | Alias management and transaction-cell pointer/keyboard UX                           | P11A                 | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P11C    | HS-004         | Alias import/manual/shared flows, performance hardening and exhaustive tests        | P11B                 | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P12     | HS-005         | Bounded requestAnimationFrame GC for buckets and alias symlinks                     | P11C, P09            | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P13     | HS-001         | Persisted normal empty Add Transaction rows and grid navigation                     | P11C, P09            | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P14     | HS-008         | Import lineage, immutable original amount, tooltip and delete-import behavior       | P09                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P15     | HS-013         | Whole transaction/import-list file drop targets                                     | P14                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P16A    | FS-001, HS-009 | Allocation/ownership validation, remainder/effective shares and exact apportionment | P01                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P16B    | FS-001         | Sole canonical settlement engine, eligibility, currencies, netting and traceability | P16A                 | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P16C    | FS-001, HS-009 | CRDT per-key/complete-set APIs and every mutation, hydration and history path       | P16A, P16B, P09, P14 | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P16D    | FS-001, HS-009 | Actual grid/add-row person columns, virtualization, history and presence UX         | P16C, P13            | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P16E    | FS-001         | People obligations/issues/source UX plus full integration, E2E, manual and perf     | P16D, P08, P11C      | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P17A    | HS-007         | Automation schema/migration, exact matcher, precedence, preferences, import engine  | P11C, P14, P16E      | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P17B    | HS-007         | Shared rule editor and automations-page UX                                          | P17A, P02            | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P17C    | HS-007         | Description inline proposals, robot drift state and scoped application              | P17B                 | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P17D    | HS-007         | Tags/allocation parity, bulk/new application, performance and polish                | P17C                 | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P18     | HS-019         | Password-manager-compatible recovery phrase creation and unlock                     | P01                  | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P19     | HS-020         | WebAuthn PRF passkeys sharing the vault identity secret                             | P04, P06, P18        | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P20A    | HS-016         | Truthful marketing copy and responsive feature presentation                         | P17D, P19            | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P20B    | HS-021         | Full-codebase style-guide/code-quality sweep after all feature work                 | P20A                 | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |
| P21     | control        | [Executable final audit](tasks/P21-final-audit.md)                                  | all prior            | queued            | —   | —                                                                                    | —                                   | —                          | —                                                            |

Every active/reviewed row must contain the exact revision, literal SHAs, evidence path, immutable
revisioned review path and root integration-control commit; `—` is valid only before dispatch.

`P03` may temporarily become `blocked_external` if the upstream release is unavailable. It must be
rechecked before each high-risk milestone and `P21`. An `HS-*` item maps to done only after all of
its packages are `passed`; therefore `HS-004` waits for P11A–C and `HS-007` waits for P17A–D. Every
scope ID, regardless of provenance prefix, uses the same lifecycle, evidence, independent review and
definition of done. Only `HS-*` entries have scratch markers; other first-class scope entries have
no marker operation.

## Requirement ledger

This ledger is requirement-level state. Package rows are execution units; a requirement becomes
`passed` only after every mapped package has passed every common gate. Prefix records provenance,
not priority. The two source families differ only in completion recording: `HS-*` receives one
authorized scratch marker after package PASS, while `FS-001` remains byte-identical and is completed
only here after P16A–E pass. A failed P21 may move already-passed package rows and every impacted
requirement row to `changes_requested`; root records the complete impact set and finishes all
required marker rollbacks before the next dispatch.

| Requirement | Frozen source                     | Packages                     | Completion recording                       | Status | Evidence |
| ----------- | --------------------------------- | ---------------------------- | ------------------------------------------ | ------ | -------- |
| HS-001      | human scratch block               | P13                          | authorized marker after package PASS       | queued | —        |
| HS-002      | human scratch block               | P01                          | authorized marker after package PASS       | queued | —        |
| HS-003      | human scratch block               | P10                          | authorized marker after package PASS       | queued | —        |
| HS-004      | human scratch block               | P11A, P11B, P11C             | authorized marker after all package PASSes | queued | —        |
| HS-005      | human scratch block               | P12                          | authorized marker after package PASS       | queued | —        |
| HS-006      | human scratch block               | P09                          | authorized marker after package PASS       | queued | —        |
| HS-007      | human scratch block               | P17A, P17B, P17C, P17D       | authorized marker after all package PASSes | queued | —        |
| HS-008      | human scratch block               | P14                          | authorized marker after package PASS       | queued | —        |
| HS-009      | human scratch block               | P16A, P16C, P16D             | authorized marker after all package PASSes | queued | —        |
| HS-010      | human scratch block               | P06                          | authorized marker after package PASS       | queued | —        |
| HS-011      | human scratch block               | P07, P08                     | authorized marker after all package PASSes | queued | —        |
| HS-012      | human scratch block               | P08                          | authorized marker after package PASS       | queued | —        |
| HS-013      | human scratch block               | P15                          | authorized marker after package PASS       | queued | —        |
| HS-014      | human scratch block               | P04                          | authorized marker after package PASS       | queued | —        |
| HS-015      | human scratch block               | P05                          | authorized marker after package PASS       | queued | —        |
| HS-016      | human scratch block               | P20A                         | authorized marker after package PASS       | queued | —        |
| HS-017      | human scratch block               | P02                          | authorized marker after package PASS       | queued | —        |
| HS-018      | human scratch block               | P03                          | authorized marker after package PASS       | queued | —        |
| HS-019      | human scratch block               | P18                          | authorized marker after package PASS       | queued | —        |
| HS-020      | human scratch block               | P19                          | authorized marker after package PASS       | queued | —        |
| HS-021      | human scratch block               | P20B                         | authorized marker after package PASS       | queued | —        |
| FS-001      | immutable whole-file feature spec | P16A, P16B, P16C, P16D, P16E | ledger completion; source never edited     | queued | —        |

## Package event log

Append one short row per transition; do not rewrite history.

| Timestamp                 | Package/rev | From -> To                       | Agent                               | BASE..HEAD / artifacts / reason                                                                                                                                                                                                                                                                                                                                                                                      | Scratch marker / SHA before -> after  |
| ------------------------- | ----------- | -------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 2026-07-19                | control     | — -> scaffolded                  | scaffold implementer                | Initial durable control plane; no product checks claimed                                                                                                                                                                                                                                                                                                                                                             | none / frozen and rolling `b91ca932…` |
| 2026-07-19T23:31:18+10:00 | P00/01      | queued -> implementing           | root -> `human_scratch_implementer` | BASE/expected HEAD `0ea864f5d0142530b2d524add228d3b51f162876`; `evidence/P00/implementation-01.md`; only pre-existing dirty path is unstaged `specs/human-scratch.md`                                                                                                                                                                                                                                                | none / rolling `b91ca932…` unchanged  |
| 2026-07-19T23:57:19+10:00 | P00/01      | implementing -> ready_for_review | `human_scratch_implementer` -> root | HEAD unchanged at `0ea864f5d0142530b2d524add228d3b51f162876`; empty range; evidence SHA-256 `73349df979f97d0c4fb4eb7318a81695e794aa5d721d3fe2807934a9321f819c`; assigned evidence is sole worker write                                                                                                                                                                                                               | none / rolling `b91ca932…` unchanged  |
| 2026-07-19T23:57:19+10:00 | P00/01      | ready_for_review -> reviewing    | root -> `human_scratch_reviewer`    | Literal BASE/HEAD `0ea864f5d0142530b2d524add228d3b51f162876`; evidence `implementation-01.md`; immutable output `reviews/P00-review-01.md`                                                                                                                                                                                                                                                                           | none / rolling `b91ca932…` unchanged  |
| 2026-07-20T00:13:06+10:00 | P00/01      | reviewing -> changes_requested   | `human_scratch_reviewer` -> root    | FAIL review SHA-256 `a0c0b3fa146efc96411bdc0588f289eadc36a21546a3c96393c993662cb92580`; I-001: keyboard Escape closes the 320px mobile menu but leaves zero focused elements, contradicting implementation evidence line 362; literal HEAD unchanged; revision 02 must record/route the red without product edits; immutable failure artifacts/control state committed as `00d47a420c3b6c7f66d6e89a9f8d95c2cc927c4c` | none / rolling `b91ca932…` unchanged  |

Before any P21-driven package downgrade, replace `Active P21 rollback batch: none` with a durable
prepared record containing: unique batch ID; failed P21 review/revision; every actual
owning/affected package; every impacted requirement; ordered pending set of all impacted checked HS
IDs; empty completed list; and exact starting/current rolling SHA. Then activate it, set those HS
requirements to `rollback_pending`, downgrade affected packages and FS-001, and process markers in
order. Each completed entry records ID/order, `[x] -> []`, exact before/after SHA, normalized byte
comparison, authorized-ID removal and state `rollback_pending -> changes_requested`; remove it from
pending and advance current SHA. Pending IDs remain validly checked. When empty, append the full
completed batch and hash chain to this immutable event log and reset the active field to `none`.
FS-001 never enters the marker set and is downgraded/re-passed without source mutation. No dispatch
is legal while the active field is prepared/active.

For P08, the prepared pending set must contain both HS-011 and HS-012 before P08 is downgraded;
after HS-011 completes, HS-012 remains `rollback_pending`/checked until its own linked rollback
completes. Only after both are unchecked, removed from authorized IDs, `changes_requested`, and the
batch is cleared may P08 remediation dispatch. After remediation, retain all history and append
package PASS, requirement PASS, HS `[] -> [x]`, and P21 revision NN+1 events; never rewrite history.

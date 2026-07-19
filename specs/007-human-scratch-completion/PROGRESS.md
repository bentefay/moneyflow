# Progress Ledger

This is the authoritative execution ledger. The coordinator updates it after every state transition.
Do not infer completion from old specs, commits, or scratch checkmarks without linked independent
review evidence.

## Current position

- **Goal status:** in progress
- **Current package:** P05 revision 01 (`changes_requested`)
- **Next action:** persist immutable FAIL artifacts, Q-003 and risk state, then dispatch P05
  revision 02 with the corrected exact six-path authority
- **Frozen sources:** `specs/human-scratch.md` at SHA-256
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b` and immutable
  `specs/008-transaction-percentage-allocations-settlement/spec.md` at SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes
- **Rolling scratch SHA-256:** `c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd`
- **Authorized checked HS IDs:** HS-002, HS-014, HS-017, HS-018
- **Active completion marker event:** none
- **Active P21 rollback batch:** none
- **Semantic drift state:** clean; 21 normalized blocks byte-match SCOPE
- **Requirement state:** four passed (HS-002, HS-014, HS-017, HS-018); 18 queued
- **Last ledger update:** 2026-07-20T07:33:48+10:00; P05 revision 01 independently FAILed on live
  delivery/cleanup, provider topology diagnosis and hermetic local/CI bootstrap; Q-003 transcribed

## Package ledger

| Package | Scope          | Work / task                                                                         | Depends on           | Status       | Rev | BASE..HEAD                                                                           | Implementation evidence             | Review                     | Integration commit                         |
| ------- | -------------- | ----------------------------------------------------------------------------------- | -------------------- | ------------ | --- | ------------------------------------------------------------------------------------ | ----------------------------------- | -------------------------- | ------------------------------------------ |
| P00     | control        | [Executable baseline](tasks/P00-baseline.md)                                        | —                    | passed       | 02  | `0ea864f5d0142530b2d524add228d3b51f162876..8f12d82ddb576af5cc8c6f04d32617d805e300de` | `evidence/P00/implementation-02.md` | `reviews/P00-review-02.md` | `7eb78075e0be7b6a881e59f03d2bfd2e202fc0f8` |
| P01     | HS-002         | Upgrade dependencies by compatible safe chains                                      | P00                  | passed       | 02  | `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..71aa257bb9bdad736fb7ef7315854fce42c5cbb4` | `evidence/P01/implementation-02.md` | `reviews/P01-review-02.md` | `c2b89b6676271142ad6802dcf2a30acf8899df48` |
| P02     | HS-017         | Animate UI evaluation, ADR, and representative migration only if justified          | P01                  | passed       | 02  | `19d73035b33b639f9927d2f78a55d74c44f65544..213100fadf5acea30aad7e90998bd575cdcd508c` | `evidence/P02/implementation-02.md` | `reviews/P02-review-02.md` | `d2dcf142a32f5d1f8e04a19a972a8e5bbf5989c7` |
| P03     | HS-018         | TanStack Virtual PR #1100 release gate and `useFlushSync`                           | P01                  | passed       | 01  | `c60f605bd811d8920122a66f3d6743d8a3ac044d..b8d4b448f52022970ca388654be14d24e347deb5` | `evidence/P03/implementation-01.md` | `reviews/P03-review-01.md` | `ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34` |
| P04     | HS-014         | Database/table/RLS threat model, migrations, and permission remediation             | P01                  | passed | 02 | `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31` | `evidence/P04/implementation-02.md` | `reviews/P04-review-02.md` | `b905ecb810334ed9697f57140047964135ade6ea` |
| P05     | HS-015         | Secure Supabase realtime authorization and correct live-op subscription             | P04                  | changes_requested | 01 | `007651beb814d98646aa2e786801b647e2abd0b5..29e4a1014d1cfa8ad5614b5fdadeba1890523554` | `evidence/P05/implementation-01.md` | `reviews/P05-review-01.md` | pending                                    |
| P06     | HS-010         | Remove unused user-state storage and dead API surface                               | P04                  | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P07     | HS-011         | Evidence-led person/member/invite UX architecture and acceptance decision           | P04, P06             | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P08     | HS-012, HS-011 | Auto-person linkage and complete secure invite/member-management flow               | P05, P07             | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P09     | HS-006         | Loro UndoManager integration, controls, shortcuts and action grouping               | P01                  | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P10     | HS-003         | Encrypted Loro EphemeralStore presence and active transaction                       | P05, P08             | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P11A    | HS-004         | Alias schema, resolution, mutation invariants, migration and atomic bookkeeping     | P09                  | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P11B    | HS-004         | Alias management and transaction-cell pointer/keyboard UX                           | P11A                 | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P11C    | HS-004         | Alias import/manual/shared flows, performance hardening and exhaustive tests        | P11B                 | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P12     | HS-005         | Bounded requestAnimationFrame GC for buckets and alias symlinks                     | P11C, P09            | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P13     | HS-001         | Persisted normal empty Add Transaction rows and grid navigation                     | P11C, P09            | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P14     | HS-008         | Import lineage, immutable original amount, tooltip and delete-import behavior       | P09                  | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P15     | HS-013         | Whole transaction/import-list file drop targets                                     | P14                  | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P16A    | FS-001, HS-009 | Allocation/ownership validation, remainder/effective shares and exact apportionment | P01                  | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P16B    | FS-001         | Sole canonical settlement engine, eligibility, currencies, netting and traceability | P16A                 | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P16C    | FS-001, HS-009 | CRDT per-key/complete-set APIs and every mutation, hydration and history path       | P16A, P16B, P09, P14 | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P16D    | FS-001, HS-009 | Actual grid/add-row person columns, virtualization, history and presence UX         | P16C, P13            | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P16E    | FS-001         | People obligations/issues/source UX plus full integration, E2E, manual and perf     | P16D, P08, P11C      | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P17A    | HS-007         | Automation schema/migration, exact matcher, precedence, preferences, import engine  | P11C, P14, P16E      | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P17B    | HS-007         | Shared rule editor and automations-page UX                                          | P17A, P02            | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P17C    | HS-007         | Description inline proposals, robot drift state and scoped application              | P17B                 | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P17D    | HS-007         | Tags/allocation parity, bulk/new application, performance and polish                | P17C                 | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P18     | HS-019         | Password-manager-compatible recovery phrase creation and unlock                     | P01                  | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P19     | HS-020         | WebAuthn PRF passkeys sharing the vault identity secret                             | P04, P06, P18        | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P20A    | HS-016         | Truthful marketing copy and responsive feature presentation                         | P17D, P19            | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P20B    | HS-021         | Full-codebase style-guide/code-quality sweep after all feature work                 | P20A                 | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P21     | control        | [Executable final audit](tasks/P21-final-audit.md)                                  | all prior            | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |

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

| Requirement | Frozen source                     | Packages                     | Completion recording                       | Status       | Evidence                                                                                                                |
| ----------- | --------------------------------- | ---------------------------- | ------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| HS-001      | human scratch block               | P13                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-002      | human scratch block               | P01                          | authorized marker after package PASS       | passed       | P01 integration `c2b89b6676271142ad6802dcf2a30acf8899df48`; `reviews/P01-review-02.md`; marker `b91ca932… -> dcd03b23…` |
| HS-003      | human scratch block               | P10                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-004      | human scratch block               | P11A, P11B, P11C             | authorized marker after all package PASSes | queued       | —                                                                                                                       |
| HS-005      | human scratch block               | P12                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-006      | human scratch block               | P09                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-007      | human scratch block               | P17A, P17B, P17C, P17D       | authorized marker after all package PASSes | queued       | —                                                                                                                       |
| HS-008      | human scratch block               | P14                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-009      | human scratch block               | P16A, P16C, P16D             | authorized marker after all package PASSes | queued       | —                                                                                                                       |
| HS-010      | human scratch block               | P06                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-011      | human scratch block               | P07, P08                     | authorized marker after all package PASSes | queued       | —                                                                                                                       |
| HS-012      | human scratch block               | P08                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-013      | human scratch block               | P15                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-014      | human scratch block               | P04                          | authorized marker after package PASS       | passed | P04 integration `b905ecb810334ed9697f57140047964135ade6ea`; `reviews/P04-review-02.md`; marker `db97178a… -> c74a2a78…` |
| HS-015      | human scratch block               | P05                          | authorized marker after package PASS       | changes_requested | revision-01 FAIL: `evidence/P05/implementation-01.md`; `reviews/P05-review-01.md`                                  |
| HS-016      | human scratch block               | P20A                         | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-017      | human scratch block               | P02                          | authorized marker after package PASS       | passed       | P02 integration `d2dcf142a32f5d1f8e04a19a972a8e5bbf5989c7`; `reviews/P02-review-02.md`; marker `dcd03b23… -> 5d283ab1…` |
| HS-018      | human scratch block               | P03                          | authorized marker after package PASS       | passed       | P03 integration `ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34`; `reviews/P03-review-01.md`; marker `5d283ab1… -> db97178a…` |
| HS-019      | human scratch block               | P18                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-020      | human scratch block               | P19                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-021      | human scratch block               | P20B                         | authorized marker after package PASS       | queued       | —                                                                                                                       |
| FS-001      | immutable whole-file feature spec | P16A, P16B, P16C, P16D, P16E | ledger completion; source never edited     | queued       | —                                                                                                                       |

## Package event log

Append one short row per transition; do not rewrite history.

| Timestamp                 | Package/rev | From -> To                        | Agent                               | BASE..HEAD / artifacts / reason                                                                                                                                                                                                                                                                                                                                                                                                                                            | Scratch marker / SHA before -> after     |
| ------------------------- | ----------- | --------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 2026-07-19                | control     | — -> scaffolded                   | scaffold implementer                | Initial durable control plane; no product checks claimed                                                                                                                                                                                                                                                                                                                                                                                                                   | none / frozen and rolling `b91ca932…`    |
| 2026-07-19T23:31:18+10:00 | P00/01      | queued -> implementing            | root -> `human_scratch_implementer` | BASE/expected HEAD `0ea864f5d0142530b2d524add228d3b51f162876`; `evidence/P00/implementation-01.md`; only pre-existing dirty path is unstaged `specs/human-scratch.md`                                                                                                                                                                                                                                                                                                      | none / rolling `b91ca932…` unchanged     |
| 2026-07-19T23:57:19+10:00 | P00/01      | implementing -> ready_for_review  | `human_scratch_implementer` -> root | HEAD unchanged at `0ea864f5d0142530b2d524add228d3b51f162876`; empty range; evidence SHA-256 `73349df979f97d0c4fb4eb7318a81695e794aa5d721d3fe2807934a9321f819c`; assigned evidence is sole worker write                                                                                                                                                                                                                                                                     | none / rolling `b91ca932…` unchanged     |
| 2026-07-19T23:57:19+10:00 | P00/01      | ready_for_review -> reviewing     | root -> `human_scratch_reviewer`    | Literal BASE/HEAD `0ea864f5d0142530b2d524add228d3b51f162876`; evidence `implementation-01.md`; immutable output `reviews/P00-review-01.md`                                                                                                                                                                                                                                                                                                                                 | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T00:13:06+10:00 | P00/01      | reviewing -> changes_requested    | `human_scratch_reviewer` -> root    | FAIL review SHA-256 `a0c0b3fa146efc96411bdc0588f289eadc36a21546a3c96393c993662cb92580`; I-001: keyboard Escape closes the 320px mobile menu but leaves zero focused elements, contradicting implementation evidence line 362; literal HEAD unchanged; revision 02 must record/route the red without product edits; immutable failure artifacts/control state committed as `00d47a420c3b6c7f66d6e89a9f8d95c2cc927c4c`                                                       | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T00:15:40+10:00 | P00/02      | changes_requested -> implementing | root -> `human_scratch_implementer` | Original BASE `0ea864f5d0142530b2d524add228d3b51f162876`; current expected HEAD `8f12d82ddb576af5cc8c6f04d32617d805e300de` includes only persisted revision-01 control artifacts/ledger commits; exact evidence `evidence/P00/implementation-02.md`; must reproduce and route review finding I-001 without product edits                                                                                                                                                   | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T00:27:35+10:00 | P00/02      | implementing -> ready_for_review  | `human_scratch_implementer` -> root | HEAD unchanged at `8f12d82ddb576af5cc8c6f04d32617d805e300de`; control-only non-empty original range; evidence SHA-256 `3ad9f4fe264d47b6d93c29b9c34cb60e03d230299cc6e5bd4ec0b8f2150d50b7`; assigned evidence is sole worker write; I-001 reproduced twice and routed                                                                                                                                                                                                        | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T00:27:35+10:00 | P00/02      | ready_for_review -> reviewing     | root -> `human_scratch_reviewer`    | Literal BASE `0ea864f5d0142530b2d524add228d3b51f162876`, HEAD `8f12d82ddb576af5cc8c6f04d32617d805e300de`; frozen `implementation-02.md`; new immutable output `reviews/P00-review-02.md`; prior FAIL remains immutable                                                                                                                                                                                                                                                     | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T00:38:03+10:00 | P00/02      | reviewing -> reviewing            | `human_scratch_reviewer` -> root    | Independent PASS recommendation; review SHA-256 `0f5129c9e2068cc0b8939ac27ec224b1843b34c613e6c951b0864bf81abe82f6`; unchanged literal HEAD and sole-review-file boundary verified; no findings or Q proposals; root acceptance awaits artifact/transcription integration commit                                                                                                                                                                                            | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T00:40:11+10:00 | P00/02      | reviewing -> passed               | root                                | PASS definition complete: reviewed product/test HEAD unchanged at `8f12d82ddb576af5cc8c6f04d32617d805e300de`; evidence/review hashes exact; BASELINE, RISKS and D-006 transcribed; no Q proposals; integration-control commit `7eb78075e0be7b6a881e59f03d2bfd2e202fc0f8`                                                                                                                                                                                                   | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T00:42:07+10:00 | P01/01      | queued -> implementing            | root -> `human_scratch_implementer` | Dependency P00 passed; BASE/pre-implementation sentinel HEAD `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`; exact allowed paths and `evidence/P01/implementation-01.md`; only pre-existing dirty path is preserved unstaged `specs/human-scratch.md`                                                                                                                                                                                                                          | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T01:37:51+10:00 | P01/01      | implementing -> ready_for_review  | `human_scratch_implementer` -> root | HEAD `cc429f5212f1122be7694fcee457cdcb7575e5dc`; 19 changed paths all authorized; evidence corrected before freeze and SHA-256 `74360f86886a1abb10095b8ddb516789fdcee7525844889d7fcc178d7aa06a64`; no Q proposal; frozen sources exact                                                                                                                                                                                                                                     | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T01:37:51+10:00 | P01/01      | ready_for_review -> reviewing     | root -> `human_scratch_reviewer`    | Literal range `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..cc429f5212f1122be7694fcee457cdcb7575e5dc`; frozen evidence `implementation-01.md`; new immutable output `reviews/P01-review-01.md`                                                                                                                                                                                                                                                                                | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T01:59:54+10:00 | P01/01      | reviewing -> changes_requested    | `human_scratch_reviewer` -> root    | FAIL review SHA-256 `f059d77dcfea8ab15283609b4a218cdfe35671afdb925d95f593fcdbcf073a48`; I-001 pnpm 11.15.0 eligible before dispatch and frozen evidence false; I-002 High same-vault lock/unlock reuses subscribed Supabase channel and terminates at `Failed to load vault`; revision 02 must correct dates/toolchain, lifecycle and deterministic regression coverage; immutable failure artifacts/control state committed as `94d7c77c9ee21390af0bb4a70b2f1abaa014ec75` | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T02:02:19+10:00 | P01/02      | changes_requested -> implementing | root -> `human_scratch_implementer` | Original BASE `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`; pre-implementation HEAD `fe00b2c5d574fffbb9bb92e1b8955bce9ec2a20f` includes revision-01 product range and immutable failure-control commits; exact evidence `evidence/P01/implementation-02.md`; remediate review I-001/I-002 and add lock/unlock regression                                                                                                                                                     | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T02:36:49+10:00 | P01/02      | implementing -> ready_for_review  | `human_scratch_implementer` -> root | HEAD `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`; six authorized remediation paths; evidence SHA-256 `9c16fc6b47dcca39f88b824b7ad995591a8d8731e87842a26d98f6cff315e8cf`; 48-hour policy/cutoff corrected; deterministic unit/E2E and three real no-reload unlock cycles pass; frozen sources exact                                                                                                                                                                          | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T02:36:49+10:00 | P01/02      | ready_for_review -> reviewing     | root -> `human_scratch_reviewer`    | Literal range `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..71aa257bb9bdad736fb7ef7315854fce42c5cbb4`; frozen evidence `implementation-02.md`; new immutable output `reviews/P01-review-02.md`; revision-01 FAIL immutable                                                                                                                                                                                                                                                    | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T02:58:41+10:00 | P01/02      | reviewing -> reviewing            | `human_scratch_reviewer` -> root    | Independent PASS recommendation; review SHA-256 `8a6f65b346c8c129d38b179a9fc04a7514dd634922c382bf123d8593b53b720f`; literal original BASE through HEAD, sole-review-file boundary, evidence/prior-review hashes and cleanup verified; no finding or Q proposal; exact `.claude/CLAUDE.md` transcription authorized; root acceptance awaits integration commit                                                                                                              | none / rolling `b91ca932…` unchanged     |
| 2026-07-20T02:59:30+10:00 | P01/02      | reviewing -> passed               | root                                | PASS definition complete: reviewed product HEAD `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`; exact evidence/review hashes; D-007, R-004/R-021 and authorized `.claude/CLAUDE.md` transcription integrated in `c2b89b6676271142ad6802dcf2a30acf8899df48`; no Q proposals; HS-002 `completion_pending` durably prepared with mapped review                                                                                                                                    | pending `[] -> [x]` / before `b91ca932…` |
| 2026-07-20T03:00:15+10:00 | HS-002      | completion_pending -> passed      | root                                | Exact marker-only change finalized after P01 review `reviews/P01-review-02.md` and integration `c2b89b6676271142ad6802dcf2a30acf8899df48`; private comparison copy removed; all 21 normalized blocks byte-match SCOPE; FS-001 remains exact at `0d0e2a14…`, 715 lines and 25,441 bytes                                                                                                                                                                                     | `[] -> [x]`; `b91ca932… -> dcd03b23…`    |
| 2026-07-20T03:01:16+10:00 | P02/01      | queued -> implementing            | root -> `human_scratch_implementer` | Dependency P01 and HS-002 passed; literal BASE/pre-implementation HEAD `19d73035b33b639f9927d2f78a55d74c44f65544`; exact evidence `evidence/P02/implementation-01.md`; decision-only no-code range is valid if a complete reproducible ADR declines adoption; otherwise only authorized representative product/test paths may change                                                                                                                                       | none / rolling `dcd03b23…` unchanged     |
| 2026-07-20T03:32:56+10:00 | P02/01      | implementing -> ready_for_review  | `human_scratch_implementer` -> root | HEAD unchanged at `19d73035b33b639f9927d2f78a55d74c44f65544`; valid empty range; sole evidence SHA-256 `0806cf0cf3918fb56103833c5d61812cdb4465cbe3a7ea69e2f048d1afdead36`; decision-only decline ADR; full no-retry E2E transparently 77/78 with exact untouched diagnostic 3/3 and R-009/P13/P21 route; one complete Q proposal; frozen sources exact                                                                                                                     | none / rolling `dcd03b23…` unchanged     |
| 2026-07-20T03:32:56+10:00 | P02/01      | ready_for_review -> reviewing     | root -> `human_scratch_reviewer`    | Literal empty BASE/HEAD `19d73035b33b639f9927d2f78a55d74c44f65544`; frozen `evidence/P02/implementation-01.md`; exact new immutable output `reviews/P02-review-01.md`; independently reproduce ADR sources, current/candidate behavior, bundle placement, inherited red classification and Q proposal                                                                                                                                                                      | none / rolling `dcd03b23…` unchanged     |
| 2026-07-20T03:50:40+10:00 | P02/01      | reviewing -> changes_requested    | `human_scratch_reviewer` -> root    | FAIL review SHA-256 `2ef03fd7a06459ca5483d5bd9004cf59d54077474e2185bcb5c69391a17e35cf`; I-001: all five 320 px import tabs and active panel are unnamed because their only labels are `hidden sm:inline`; revision 02 must preserve programmatic names and add a mobile regression; decline ADR otherwise justified; Q proposal confirmed/transcribed as Q-001; independent full E2E 78/78 then exact T021c 2/3 reinforces R-009/P13/P21 route                             | none / rolling `dcd03b23…` unchanged     |
| 2026-07-20T03:54:54+10:00 | P02/02      | changes_requested -> implementing | root -> `human_scratch_implementer` | Original BASE `19d73035b33b639f9927d2f78a55d74c44f65544`; pre-implementation HEAD `72710249b4ba2c515d159ce3560e68af3ac0b011` includes immutable revision-01 artifacts/control commits; exact evidence `evidence/P02/implementation-02.md`; only `ConfigTabs.tsx` and `tests/e2e/import.spec.ts` may change to close I-001; retain full ADR and T021c routing                                                                                                               | none / rolling `dcd03b23…` unchanged     |
| 2026-07-20T04:09:38+10:00 | P02/02      | implementing -> ready_for_review  | `human_scratch_implementer` -> root | HEAD `213100fadf5acea30aad7e90998bd575cdcd508c`; exact two authorized product/test paths; evidence SHA-256 `e45b577d3116255cbf0dadf68da6599bdfc383dd953e97855b4f2fd10a5620ec`; counterfactual red, fixed 1/1 and 5/5, import 6/6, full E2E 78/78, unit 1,141/1,141; installed CLI named five mobile tabs/panels; Q-001/R-009 routes retained; frozen sources exact                                                                                                         | none / rolling `dcd03b23…` unchanged     |
| 2026-07-20T04:09:38+10:00 | P02/02      | ready_for_review -> reviewing     | root -> `human_scratch_reviewer`    | Literal original range `19d73035b33b639f9927d2f78a55d74c44f65544..213100fadf5acea30aad7e90998bd575cdcd508c`; frozen `implementation-02.md`; exact new output `reviews/P02-review-02.md`; revision-01 evidence/review immutable                                                                                                                                                                                                                                             | none / rolling `dcd03b23…` unchanged     |

| 2026-07-20T04:27:00+10:00 | P02/02 | reviewing -> reviewing | `human_scratch_reviewer` -> root |
Independent PASS recommendation; review SHA-256
`01b5318b91e8cd898a7ab009b789809ab9d307e4c2279f113d1613bfe33cc998`; I-001 closed across five named
mobile tabs/panels and keyboard wrap; corrected decline ADR accepted; no new findings/Q; Q-001/R-022
and R-009/P13/P21 remain open; exact HEAD/write boundary/cleanup verified; root integration pending
| none / rolling `dcd03b23…` unchanged |

| 2026-07-20T04:29:00+10:00 | P02/02 | reviewing -> passed | root | PASS definition complete; exact
reviewed HEAD/evidence/review; D-008/R-010 integrated in `d2dcf142a32f5d1f8e04a19a972a8e5bbf5989c7`;
Q-001/R-022 and R-009 routes retained; HS-017 completion pending | pending `[] -> [x]` / before
`dcd03b23…` |

**2026-07-20T04:32:00+10:00 — HS-017 `completion_pending -> passed`:** Recovery found only the
prepared HS-017 marker already changed, as permitted by PROCESS. All 21 normalized blocks match
SCOPE; checked set is exactly HS-002/HS-017; FS-001 remains exact. Finalized `[] -> [x]`, SHA
`dcd03b23… -> 5d283ab1…`, review `reviews/P02-review-02.md`, integration
`d2dcf142a32f5d1f8e04a19a972a8e5bbf5989c7`.

**2026-07-20T04:34:00+10:00 — P03/01 `queued -> implementing`:** Dependency P01 passed; exact
BASE/pre-implementation HEAD `c60f605bd811d8920122a66f3d6743d8a3ac044d`; evidence
`evidence/P03/implementation-01.md`; primary-source PR/release/package-source gate required before
any upgrade; `blocked_external` is allowed only with independent proof. Scratch rolling SHA remains
`5d283ab1…`.

**2026-07-20T04:54:01+10:00 — P03/01 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`b8d4b448f52022970ca388654be14d24e347deb5`; three authorized paths; evidence SHA-256
`66b75fa029316ded9a63a58d42dd9899bb71a5f72ff43670b92ef97f20872f4d`; released gate and explicit
option implemented; 1,000-row persistence red routed P14/P21 and continuous-scroll jank P16D/P21;
new immutable output `reviews/P03-review-01.md`. Scratch SHA remains `5d283ab1…`.

**2026-07-20T05:12:00+10:00 — P03/01 `reviewing -> reviewing`:** Independent PASS recommendation,
review SHA-256 `9bd95d3fe197b2a3a02ad6f6ff161bc031ad8d4f3ecc035bf7fe35ce568b9824`; release/API
chain, explicit option and large-list gates verified; persistence red P14/P21, jank R-008/P16D/P21
and T021c R-009/P13/P21 retained; exact HEAD/write boundary/cleanup verified; integration pending.

**2026-07-20T05:15:00+10:00 — P03/01 `reviewing -> passed`:** PASS definition complete at exact
reviewed HEAD; artifacts, D-009 and R-008/R-023 integrated in
`ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34`; no Q; HS-018 completion marker durably prepared from SHA
`5d283ab1…`.

**2026-07-20T05:17:00+10:00 — HS-018 `completion_pending -> passed`:** Exact marker-only change;
comparison copy removed; all 21 normalized blocks match SCOPE; checked set is exactly
HS-002/HS-017/HS-018; FS-001 exact; `[] -> [x]`, SHA `5d283ab1… -> db97178a…`, review
`reviews/P03-review-01.md`, integration `ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34`.

**2026-07-20T05:20:00+10:00 — P04/01 `queued -> implementing`:** Dependency P01 passed; exact
BASE/pre-implementation HEAD `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`; evidence
`evidence/P04/implementation-01.md`; threat model precedes mutation; fresh/upgrade/rollback-safe and
owner/member/outsider/spoof/replay/invite cross-vault matrices required. Scratch remains
`db97178a…`.

**2026-07-20T05:49:31+10:00 — P04/01 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`20a489dc51542ee0c681cfba0a33aee820d70221`; 25 authorized product/migration/test paths; frozen
evidence SHA-256 `71eaaebfe3c95a23b387b794f02e703bacba8de7fc8166810b93a980861a3e9b`; fresh pgTAP 49/49,
seeded upgrade 14/14, unit 1,153/1,153 and retries-disabled E2E 79/79 reported. Mandatory proposal
`Q-PROPOSAL-P04-01-01` records unsigned GET operation/input plus claimed-hash public user endpoints;
independent review receives literal range `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..20a489dc51542ee0c681cfba0a33aee820d70221`
and exact new output `reviews/P04-review-01.md`. Scratch remains `db97178a…`; full format remains red
only on the frozen HS-018 marker shape routed to R-024/P20B/P21.

**2026-07-20T06:01:41+10:00 — P04/01 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `89ffd44dccc6be9858033608c6e60656d9f33894ed3a7fe50c7d9c2d63efe947`; F-001 Critical proves
authenticated GET proof omits procedure/input while tRPC serializes them in URLs; F-002 Critical
proves public user APIs select/create service-role rows by claimed hash and return stored encrypted
data. Two superseded reviewer attempts were tooling-classifier interruptions and produced no review
artifact; the final offline review established the blockers and exact 13-path revision-02 boundary.
Q-002 transcribes the complete reviewed proposal; P05/P08 remain later-package evidence and
R-024/P20B/P21 retains the frozen-marker formatter route. No HS-014 marker is authorized; scratch
remains `db97178a…`, 350 lines and 24,242 bytes, and FS-001 remains exact.

**2026-07-20T06:02:43+10:00 — P04/01 `changes_requested -> changes_requested`:** Immutable
revision-01 evidence, review, Q-002, R-003/R-013/R-024 and failure state persisted in control commit
`8a3e80702bd6cf9aa8d96899c840923363481e5e`; review-01 is now immutable. Revision-02 dispatch may
proceed after the artifact-commit reference is durably recorded; no marker or frozen-source change.

**2026-07-20T06:04:00+10:00 — P04/02 `changes_requested -> implementing`:** Original BASE
`9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`; pre-implementation HEAD
`ae6b1797e5c874fc48114f309bb9a7e02220a246` includes revision-01 product and immutable failure/control
commits. Exact 13-path authority from review-01; sole new evidence `evidence/P04/implementation-02.md`;
close F-001/F-002 with canonical signed POST, verified self-only user access, registration-session
rollback safety and counterfactual URL/procedure/input tests. Revision-01 artifacts remain immutable;
scratch stays `db97178a…` with no HS-014 marker.

**2026-07-20T06:30:16+10:00 — P04/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test HEAD `dbcf180e829c81a218e9a73791e40902c4f9eb31`; exactly 13 authorized
paths; evidence SHA-256 `987faf8217f57cd5294eda05884e402e22972d80a9f86d5ca11a6c9bb104509f`.
Reported green: focused 32/32, unit 1,166/1,166, fresh pgTAP 49/49, seeded upgrade 14/14,
authorized E2E 14/14, critical repeats 9/9, full E2E 80/80 retries zero, build and installed CLI
new/existing/outsider request inspection. Exact cumulative review range is
`9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31`;
new immutable output `reviews/P04-review-02.md`; review-01 remains immutable. Scratch stays
`db97178a…` and HS-014 remains unchecked.

**2026-07-20T06:37:29+10:00 — P04/02 `reviewing -> reviewing`:** Independent PASS recommendation;
review SHA-256 `60c42330718eeb942f48a1d073b1c5c81b1de8dd0dd35108383f9d8ce863c210`; exact cumulative
range, 13-path boundary, evidence/prior-review hashes, F-001/F-002 source and counterfactual test
closure verified. Reviewer independently passed focused 32/32, unit 1,166/1,166, lint/type and fresh
pgTAP 49/49; its interrupted seeded-upgrade/E2E/CLI reruns are candidly limited and corroborated by
the frozen implementation evidence plus checked-in tests. Root restored the interrupted local DB to
clean migrations 005+006 with no seed before integration. No finding or Q; P05/P08 and
R-024/P20B/P21 routes retained; exact write boundary and frozen sources verified. Integration and
HS-014 marker remain pending.

**2026-07-20T06:38:21+10:00 — P04/02 `reviewing -> passed`:** PASS definition complete at exact
reviewed HEAD; immutable evidence/review, D-010 and R-003/R-013 state integrated in
`b905ecb810334ed9697f57140047964135ade6ea`. Q-002 is implemented; P05/P08 and R-024 routes remain.
HS-014 `completion_pending` durably prepared from scratch SHA `db97178a…`; no marker changed yet.

**2026-07-20T06:40:00+10:00 — HS-014 `completion_pending -> passed`:** Exact marker-only
`[] -> [x]` finalized after P04 review `reviews/P04-review-02.md` and integration
`b905ecb810334ed9697f57140047964135ade6ea`; private comparison copy removed; all 21 normalized
blocks byte-match SCOPE; checked set is exactly HS-002/HS-014/HS-017/HS-018; FS-001 remains exact.
Scratch SHA `db97178a… -> c74a2a78…`, 350 lines and 24,243 bytes.

**2026-07-20T06:42:37+10:00 — P05/01 `queued -> implementing`:** Dependency P04/HS-014 passed;
exact BASE/pre-implementation HEAD `007651beb814d98646aa2e786801b647e2abd0b5`; sole evidence
`evidence/P05/implementation-01.md`. Current primary-source ADR must precede mutation and separate
origin/TLS controls from authorization. Required implementation binds short-lived credentials to
P04 verified identity, exact current vault membership/table/purpose, subscribes only permanent
`vault_ops`, and proves expiry/removal/reconnect plus genuine push-driven two-context sync. Scratch
remains `c74a2a78…`; no HS-015 marker.

**2026-07-20T07:17:55+10:00 — P05/01 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`29e4a1014d1cfa8ad5614b5fdadeba1890523554`; 19 authorized product/config/migration/test paths;
evidence SHA-256 `1016c7c479e20c9bc29da3e03d80a21bbdac34a78316e6e1f55539029a9f9066`.
Reported green: focused 8/8, unit 1,170/1,170, fresh pgTAP 69/69, upgrade 18/18, lint/type/build.
Retries-zero E2E is candidly 79/81: genuine member delivery misses 15 seconds and existing
vault-settings captures the same repeated manager/Presence teardown failure. Q-PROPOSAL-P05-01-01
requests exact revision-02 `vault-provider.tsx` authority after 11 sync/12 presence grants in
seconds; no scope widening or HS-015 marker. New immutable output `reviews/P05-review-01.md`.

**2026-07-20T07:33:48+10:00 — P05/01 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `52350e039f75934e59ec6f431fba4d041ef9df6f4e685411608fe86e06436ba5`. F-001 Critical
reproduces genuine corrected-secret E2E 7/9 and isolated 0/1: permanent owner op is not pushed to the
member within 15 seconds, Presence/401 teardown errors recur and grants remain live. F-002 High
proves implementer Q-01-01's cause is impossible because `SyncStatusProvider` is below its consumer;
status callbacks are static no-ops and current churn remains unattributed. F-003 Medium proves plain
local/CI Playwright lacks a hermetic JWT-secret bootstrap and fails 0/9. Reviewer independently
passes focused 8/8, unit 1,170/1,170, fresh pgTAP 69/69, upgrade 18/18, lint/type/build; database and
generated/browser state cleaned. Corrected Q-PROPOSAL-P05-01-02 transcribed as Q-003 with exact six
revision-02 paths; implementer proposal is superseded. No HS-015 marker; scratch stays `c74a2a78…`.

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

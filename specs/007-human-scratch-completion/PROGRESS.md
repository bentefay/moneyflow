# Progress Ledger

This is the authoritative execution ledger. The coordinator updates it after every state transition.
Do not infer completion from old specs, commits, or scratch checkmarks without linked independent
review evidence.

## Current position

- **Goal status:** in progress
- **Current package:** P15 revision 02 (`implementing` after current root control commit)
- **Next action:** dispatch `human_scratch_implementer` against exact pre-HEAD
  `49dcef93bdbd4d4d21f0313061bc262473801966` and sole evidence
  `evidence/P15/implementation-02.md`
- **Frozen sources:** `specs/human-scratch.md` at SHA-256
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b` and immutable
  `specs/008-transaction-percentage-allocations-settlement/spec.md` at SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes
- **Rolling scratch SHA-256:** `f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`
- **Authorized checked HS IDs:** HS-001, HS-002, HS-004, HS-005, HS-006, HS-008, HS-010, HS-014,
  HS-017, HS-018
- **Active completion marker event:** none
- **Active P21 rollback batch:** none
- **Semantic drift state:** clean; 21 normalized blocks byte-match SCOPE
- **Requirement state:** ten passed; HS-015 blocked externally; HS-011/HS-012 and eight other
  requirements queued
- **Last ledger update:** 2026-07-25; P15 revision-02 implementation dispatch prepared for all five
  revision-01 findings

## Package ledger

| Package | Scope          | Work / task                                                                         | Depends on           | Status       | Rev | BASE..HEAD                                                                           | Implementation evidence             | Review                     | Integration commit                         |
| ------- | -------------- | ----------------------------------------------------------------------------------- | -------------------- | ------------ | --- | ------------------------------------------------------------------------------------ | ----------------------------------- | -------------------------- | ------------------------------------------ |
| P00     | control        | [Executable baseline](tasks/P00-baseline.md)                                        | —                    | passed       | 02  | `0ea864f5d0142530b2d524add228d3b51f162876..8f12d82ddb576af5cc8c6f04d32617d805e300de` | `evidence/P00/implementation-02.md` | `reviews/P00-review-02.md` | `7eb78075e0be7b6a881e59f03d2bfd2e202fc0f8` |
| P01     | HS-002         | Upgrade dependencies by compatible safe chains                                      | P00                  | passed       | 02  | `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..71aa257bb9bdad736fb7ef7315854fce42c5cbb4` | `evidence/P01/implementation-02.md` | `reviews/P01-review-02.md` | `c2b89b6676271142ad6802dcf2a30acf8899df48` |
| P02     | HS-017         | Animate UI evaluation, ADR, and representative migration only if justified          | P01                  | passed       | 02  | `19d73035b33b639f9927d2f78a55d74c44f65544..213100fadf5acea30aad7e90998bd575cdcd508c` | `evidence/P02/implementation-02.md` | `reviews/P02-review-02.md` | `d2dcf142a32f5d1f8e04a19a972a8e5bbf5989c7` |
| P03     | HS-018         | TanStack Virtual PR #1100 release gate and `useFlushSync`                           | P01                  | passed       | 01  | `c60f605bd811d8920122a66f3d6743d8a3ac044d..b8d4b448f52022970ca388654be14d24e347deb5` | `evidence/P03/implementation-01.md` | `reviews/P03-review-01.md` | `ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34` |
| P04     | HS-014         | Database/table/RLS threat model, migrations, and permission remediation             | P01                  | passed | 02 | `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31` | `evidence/P04/implementation-02.md` | `reviews/P04-review-02.md` | `b905ecb810334ed9697f57140047964135ade6ea` |
| P05     | HS-015         | Secure Supabase realtime authorization and correct live-op subscription             | P04                  | blocked_external | 12 | `007651beb814d98646aa2e786801b647e2abd0b5..824bb1570f1e52bcd0afcbf89040d1c0ffac50ec` | `evidence/P05/implementation-12.md` | `reviews/P05-review-12.md` | diagnostic gate `0f7ee5222dd23794411427fdc013cf3a5b6f8648` |
| P06     | HS-010         | Remove unused user-state storage and dead API surface                               | P04                  | passed | 01  | `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1..95e91dbcb17ffb9600eaa6cb795336898297ebae` | `evidence/P06/implementation-01.md` | `reviews/P06-review-01.md` | `8e269ab9a6fc15ed6d845542b879e5499828134e` |
| P07     | HS-011         | Evidence-led person/member/invite UX architecture and acceptance decision           | P04, P06             | passed | 04  | `fe1871ce7dce1e831b57ee5656d38ce5c800aae3..dfffea3c19b110b6021b050b8d9e36b01ae75ab9` | `evidence/P07/implementation-04.md` | `reviews/P07-review-04.md` | `1f6cb96b27c8093f0ba2c319f32d3c79c8aab126` |
| P08     | HS-012, HS-011 | Auto-person linkage and complete secure invite/member-management flow               | P05, P07             | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P09     | HS-006         | Loro UndoManager integration, controls, shortcuts and action grouping               | P01                  | passed       | 02 | `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed..418234e28ac649e03ce8ad184d08a8a2f2416149` | `evidence/P09/implementation-02.md` | `reviews/P09-review-02.md` | `59bf82e894e45e034858e25255240701a3afb0b8` |
| P10     | HS-003         | Encrypted Loro EphemeralStore presence and active transaction                       | P05, P08             | queued       | —   | —                                                                                    | —                                   | —                          | —                                          |
| P11A    | HS-004         | Alias schema, resolution, mutation invariants, migration and atomic bookkeeping     | P09                  | passed | 04 | `eb5ab2e215130c358130d5411a92b51951c3c53a..fb72abdaf531dff40c59f6b3525fb1b9ce50f805` | `evidence/P11A/implementation-04.md` | `reviews/P11A-review-04.md` | `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f` |
| P11B    | HS-004         | Alias management and transaction-cell pointer/keyboard UX                           | P11A                 | passed | 01 | `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f..e35109dfe7b02bdb4058445f44d03a6dd678457b` | `evidence/P11B/implementation-01.md` | `reviews/P11B-review-01.md` | `0426866fa66cc022efca6d74cd5088d586d3d11b` |
| P11C    | HS-004         | Alias import/manual/shared flows, performance hardening and exhaustive tests        | P11B                 | passed | 03 | `0426866fa66cc022efca6d74cd5088d586d3d11b..daab038ee741faa9f92a373b27efe0c8fe8940db` | `evidence/P11C/implementation-03.md` | `reviews/P11C-review-03.md` | `78e2f978f8d258d8c4d379f53e75089a2ce975db` |
| P12     | HS-005         | Bounded requestAnimationFrame GC for buckets and alias symlinks                     | P11C, P09            | passed | 08 | `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..a2a31839f6bb57855fa60b8cfcc06feed069cafa` | `evidence/P12/implementation-08.md` | `reviews/P12-review-08.md` | `f8cbb5a8caacb763c0bb77199595a5ee332ab729` |
| P13     | HS-001         | Persisted normal empty Add Transaction rows and grid navigation                     | P11C, P09            | passed | 03 | `415ea080b3b19191fd71601742056a619b4a3080..9f307e200676711ca2a3ba81bd816314807434ad` | `evidence/P13/implementation-03.md` | `reviews/P13-review-03.md` | `7a04338fa7c3f68463d12d11082bc56e87c1872b` |
| P14     | HS-008         | Import lineage, immutable original amount, tooltip and delete-import behavior       | P09                  | passed | 04 | `b9105028926d24a5a0c5454777a6c33379ca606a..305d6613673cf200d456276c076463b68c075500` | `evidence/P14/implementation-04.md` | `reviews/P14-review-04.md` | `a2182116db08200b8b4df28412512b9ca3406aa2` |
| P15     | HS-013         | Whole transaction/import-list file drop targets                                     | P14                  | implementing | 02 | `b3e96ba9e9487d13df56956d220fffca63d6482d..pending`                                  | `evidence/P15/implementation-02.md` | `reviews/P15-review-02.md` | revision-01 failure `49dcef93bdbd4d4d21f0313061bc262473801966` |
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
| HS-001      | human scratch block               | P13                          | authorized marker after package PASS       | passed       | P13 integration `7a04338fa7c3f68463d12d11082bc56e87c1872b`; `reviews/P13-review-03.md`; marker `aa8a1f56… -> b09454de…` |
| HS-002      | human scratch block               | P01                          | authorized marker after package PASS       | passed       | P01 integration `c2b89b6676271142ad6802dcf2a30acf8899df48`; `reviews/P01-review-02.md`; marker `b91ca932… -> dcd03b23…` |
| HS-003      | human scratch block               | P10                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-004      | human scratch block               | P11A, P11B, P11C             | authorized marker after all package PASSes | passed | P11A integration `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`, P11B `0426866fa66cc022efca6d74cd5088d586d3d11b`, P11C `78e2f978f8d258d8c4d379f53e75089a2ce975db`; reviews `P11A-review-04.md`/`P11B-review-01.md`/`P11C-review-03.md`; marker `c2b986fd... -> 2c52bd78...` |
| HS-005      | human scratch block               | P12                          | authorized marker after package PASS       | passed       | P12 integration `f8cbb5a8caacb763c0bb77199595a5ee332ab729`; `reviews/P12-review-08.md`; marker `2c52bd78… -> aa8a1f56…` |
| HS-006      | human scratch block               | P09                          | authorized marker after package PASS       | passed       | P09 integration `59bf82e894e45e034858e25255240701a3afb0b8`; `reviews/P09-review-02.md`; marker `753be6b7… -> c2b986fd…` |
| HS-007      | human scratch block               | P17A, P17B, P17C, P17D       | authorized marker after all package PASSes | queued       | —                                                                                                                       |
| HS-008      | human scratch block               | P14                          | authorized marker after package PASS       | passed       | P14 integration `a2182116db08200b8b4df28412512b9ca3406aa2`; `reviews/P14-review-04.md`; marker `b09454de… -> f0adfef6…` |
| HS-009      | human scratch block               | P16A, P16C, P16D             | authorized marker after all package PASSes | queued       | —                                                                                                                       |
| HS-010      | human scratch block               | P06                          | authorized marker after package PASS       | passed | P06 integration `8e269ab9a6fc15ed6d845542b879e5499828134e`; `reviews/P06-review-01.md`; marker `c74a2a78… -> 753be6b7…` |
| HS-011      | human scratch block               | P07, P08                     | authorized marker after all package PASSes | queued | P07 PASS/integration `1f6cb96b27c8093f0ba2c319f32d3c79c8aab126`; P08 still required/gated; no marker |
| HS-012      | human scratch block               | P08                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-013      | human scratch block               | P15                          | authorized marker after package PASS       | queued       | —                                                                                                                       |
| HS-014      | human scratch block               | P04                          | authorized marker after package PASS       | passed | P04 integration `b905ecb810334ed9697f57140047964135ade6ea`; `reviews/P04-review-02.md`; marker `db97178a… -> c74a2a78…` |
| HS-015      | human scratch block               | P05                          | authorized marker after package PASS       | blocked_external | revision-12 diagnostic PASS reconfirms D-011 unchanged; no marker |
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

**2026-07-20T07:34:45+10:00 — P05/01 `changes_requested -> changes_requested`:** Immutable
revision-01 evidence, corrected review, Q-003, R-004/R-025 and failure state persisted in
`c8f2954f6119316af77dd56c6db9a2fae27ea4f2`; review-01 is immutable. Revision-02 dispatch may
proceed after this artifact-commit reference is durably recorded; no marker/frozen-source change.

**2026-07-20T07:36:12+10:00 — P05/02 `changes_requested -> implementing`:** Original BASE
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`72c90d132110d02641502b64d6263920abe0749d` includes revision-01 product and immutable failure/control
commits. Exact six-path authority from Q-003/review-01; sole evidence
`evidence/P05/implementation-02.md`. Instrument current sync/Presence churn, repair provider topology
and stable dependencies, preserve true change-driven recreation, make local/CI Playwright secret
bootstrap hermetic/fail-fast, and turn the genuine 7/9 and 0/1 reds green without reopening transport
or weakening assertions. No HS-015 marker; scratch remains `c74a2a78…`.

**2026-07-20T08:00:33+10:00 — P05/02 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`e865023f6001704be0304bed4e75e76956854ea6`; exactly six authorized topology/config/E2E paths;
evidence SHA-256 `6d96237408e29392901f1fecee164843753ff8c71cc11967a3feac9084e0cf30`.
F-002 topology/status and F-003 ordinary hermetic startup are corrected, but fresh ordinary isolated
E2E remains 0/1: member observes zero `postgres_changes` frames in 15 seconds and private Presence
is denied. Sanitized attribution rules out SyncManager/CRDT/UI and identifies migration 007's
global exact-scope initial rotation plus actual private join extension policy. Complete
Q-PROPOSAL-P05-02-01 requests forward migration 008 and two database audits while retaining six
paths; no widening, full green claim or HS-015 marker. New immutable output
`reviews/P05-review-02.md`; review-01 remains immutable.

**2026-07-20T08:08:43+10:00 — P05/02 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `1bce7bce9d94b628d2068cb06edb2248f5c849f40c05afabb87af9cd70f810dd`. F-002 and F-003 are
closed: provider topology/stable cleanup and ordinary env-unset process-memory secret bootstrap pass.
F-001 remains Critical and deterministically migration-owned: isolated E2E is 0/1 after initial
bounds, member receives zero `postgres_changes` kinds for 15 seconds, private Presence is repeatedly
unauthorized, and final sanitized aggregates are sync 5/3-live/2-revoked/0-expired-unrevoked and
Presence 10/3/7/0. Independent focused 8/8, unit 1,170/1,170, lint/type/build/format, fresh reset and
pgTAP 69/69 pass. Q-PROPOSAL-P05-02-01 is transcribed as Q-004 with exactly nine revision-03 paths:
the retained six plus forward migration 008 and the fresh/legacy database audits. No SyncManager,
transport, CRDT, Loro or scratch expansion; HS-015 remains unchecked at `c74a2a78…`.

**2026-07-20T08:10:31+10:00 — P05/02 `changes_requested -> changes_requested`:** Immutable
revision-02 evidence/review, Q-004, R-004/R-025 and failure state persisted in
`082551d73d1c6e0949a29f410a59e22817708ebf`; both P05 FAIL reviews are immutable. Revision-03
dispatch may proceed after this artifact-commit reference is durably recorded; scratch and FS-001
remain exact and no marker changed.

**2026-07-20T08:11:51+10:00 — P05/03 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`f543c4b7a4f445c2e5d11a7f3f077a8929074335` includes immutable revision-01/02 product and failure/
control commits. Q-004 authorizes exactly nine paths: the retained six topology/config/E2E paths,
forward-only migration 008 and both fresh/legacy database audits. Correct concurrent independent
grant rotation/revocation, actual private Presence extensions and stale-row bounds; prove genuine
incoming live import/edit/delete plus full expiry/removal/reconnect/upgrade gates. No transport,
SyncManager, CRDT, Loro, other path or HS-015 marker authority; scratch remains `c74a2a78…`.

**2026-07-20T08:27:25+10:00 — P05/03 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`ec7dcf8b29ce93f46f73a904e7420ddf49317b11`; commit changes exactly five paths within the authorized
nine. Evidence SHA-256 `02ecbb1b2ca227bfbd88804aad47a3a4f240d1ccd54f2210769b5e7cc9815a17`.
Migration 008 makes concurrent grant rotation/revoke independent, bounds stale pruning and permits
the actual least-privilege private Presence join; fresh pgTAP is 87/87 and seeded 005-to-008 is
27/27 with encrypted data preserved. Presence is clean, but decisive isolated E2E remains red:
member sends four joins with two Postgres bindings while database permanent-op/authenticated/live-
grant subscription counts and incoming events are all zero. Full Vitest 1,170/1,170, typecheck and
focused lint/format/diff pass; broad browser/build/CLI gates stop after the deterministic failure.
Q-PROPOSAL-P05-03-01 requests exactly the retained nine plus Realtime client registration and its
unit test, with no SyncManager/CRDT/Loro widening. New immutable output `reviews/P05-review-03.md`;
no PASS claim or HS-015 marker.

**2026-07-20T08:45:53+10:00 — P05/03 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `72934172c159a290695b895ddf15e85933a60cf25b240811e264dc7805c56348`. Migration 008,
fresh 87/87, seeded upgrade 27/27 and clean private Presence are accepted; F-002 Medium requires the
aggregate helper to check exact current scope. F-001 Critical remains live-delivery red, but the
owner is corrected: Realtime v2.80.7 reports cached migrations 68 versus persistent internal schema
79, and its three-field filter encoder is incompatible with the four-field composite. Ordinary E2E
is 0/1 with outgoing bindings but subscriptions 0/0/0; a public-channel diagnostic follows the same
CDC path and cannot justify the implementer's transport-mode proposal. Q-PROPOSAL-P05-03-01 is
rejected and reviewer Q-PROPOSAL-P05-03-02 is transcribed as Q-005: safely recreate only the verified-
empty exact project and permit only `tests/e2e/helpers/realtime.ts` in revision 04. R-004/R-021 are
updated; no product/config/dependency/migration/unit/SyncManager/CRDT/Loro or marker authority.

**2026-07-20T08:47:20+10:00 — P05/03 `changes_requested -> changes_requested`:** Immutable
revision-03 evidence/review, Q-005, R-004/R-021 and failure state persisted in
`1a513eb2490948211767a910ecd0f7c7ee1d5803`; all three P05 FAIL reviews are immutable. Revision-04
dispatch may proceed after this artifact-commit reference is durably recorded and the exact local
project is re-verified empty; no frozen source or marker changed.

**2026-07-20T08:49:14+10:00 — P05/04 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`abbb4f52439025401d3ca858f9809b41daddcbe3` includes all immutable P05 revision-01/02/03 product and
failure/control commits. Root independently verified the exact running `moneyflow` local project is
disposable: auth users, all public application/authz tables, Realtime subscriptions, grants and
permanent ops are zero. Q-005 authorizes exact-project `supabase stop --no-backup`/`start` followed
by normal migrations and exactly one writable path, `tests/e2e/helpers/realtime.ts`, to harden the
sanitized exact-current-grant predicate. If clean pinned recreation retains image/schema mismatch,
stop with a complete pin proposal. No product/config/dependency/migration/unit/transport/CRDT/Loro
or HS-015 marker authority; scratch remains `c74a2a78…`.

**2026-07-20T09:05:29+10:00 — P05/04 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`4233b59c930117e7b160ac142a6f953b988b2dc8`; revision diff is only the authorized helper (12
insertions/1 deletion). Evidence SHA-256
`fc7832cc801210332c960b38d37bdfc87c6c3ae5d9709c10ccf6ed3d8928fb2c`. Guarded empty-project
recreation produces Realtime v2.112.6 with 79 matching internal migrations, four active filter
fields and no mismatch. Ordinary runs register at least two authenticated exact-live-grant
subscriptions and genuinely deliver the imported op/UI update. The next inline edit writes its
permanent op but hits the 120-second global timeout; a bounded timing run proves the spec reuses an
original-value-qualified locator after `fill` changed that value, spending 109.747 seconds at
`locator.press`. Q-PROPOSAL-P05-04-01 requests adding only `tests/e2e/realtime-security.spec.ts`
for a stable/re-resolved Enter target, without timeout/assertion weakening. Static helper/type gates,
final compatible empty DB and cleanup pass; broader acceptance stops at this deterministic test
owner. New immutable output `reviews/P05-review-04.md`; no PASS claim or HS-015 marker.

**2026-07-20T09:15:40+10:00 — P05/04 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `dd629bc49ca8e0694406b113fbd3eb23996da6def212a852ed94a289a1449d33`. Compatible
Realtime v2.112.6/79/four-field/no-mismatch service state, strengthened helper, exact-grant
subscriptions and genuine incoming import/UI delivery are accepted; fresh 87/87, upgrade 27/27,
unit 1,170/1,170 and static gates pass. F-001 High remains solely test-owned: the old-value locator
is lazily re-resolved after `fill`, so Enter never occurs and the unchanged 120-second timeout
expires with two permanent ops. Q-PROPOSAL-P05-04-01 is transcribed as Q-006 with exact sole
revision-05 path `tests/e2e/realtime-security.spec.ts`; no timeout/assertion weakening or helper/
product/config/dependency/migration/unit/transport/CRDT/Loro expansion. R-004/R-009/R-021 updated;
HS-015 remains unchecked at `c74a2a78…`.

**2026-07-20T09:17:04+10:00 — P05/04 `changes_requested -> changes_requested`:** Immutable
revision-04 evidence/review, Q-006, R-004/R-009/R-021 and failure state persisted in
`3070cbf86692f70aceab33456261004482955701`; all four P05 FAIL reviews are immutable. Revision-05
dispatch may proceed after this artifact-commit reference is durably recorded; no frozen source or
marker changed.

**2026-07-20T09:18:22+10:00 — P05/05 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`913b01381e0cbef49200368c40fb990e3873514a` includes all immutable P05 revision-01/02/03/04 product
and failure/control commits. Q-006 authorizes exactly `tests/e2e/realtime-security.spec.ts`: after
fill, re-resolve the unique new-value editor and press Enter without forced action, wait, retry,
timeout/assertion weakening or any other path. Run the complete real import/edit/delete, lifecycle,
security, fresh/upgrade, full browser/static and installed CLI acceptance on the compatible service.
No helper/product/config/dependency/migration/unit/transport/CRDT/Loro or HS-015 marker authority;
scratch remains `c74a2a78…`.

**2026-07-20T09:25:45+10:00 — P05/05 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`0d24c802bc8c6dab93a6e1a1c1e1167e95b98583`; revision diff is only the authorized spec (4
insertions/1 deletion). Evidence SHA-256
`a3177aa1cabe07835c170e5c37eb8da7dc3f074fc82e90d6f03fe3245729349f`. The stable new-value
locator passes genuine incoming import, edit and encrypted delete, then the unchanged expiry poll
fails immediately because legacy `countRealtimeGrants` uses a service-role REST HEAD that migration
007 intentionally denies (HTTP 403); post-run aggregates show 15 grants/7 permanent ops. Complete
Q-PROPOSAL-P05-05-01 requests the same sole spec path to replace only that import/poll source with
the already-used validated `getRealtimeGrantAggregates(...).sync.total`, preserving 70 seconds and
`>=2`. No helper/migration/privilege/product widening or later-gate claim; compatible service, final
empty DB, cleanup and frozen sources pass. New immutable output `reviews/P05-review-05.md`; no PASS
claim or HS-015 marker.

**2026-07-20T09:31:09+10:00 — P05/05 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `53edd79c1472196338ff721d9c8ded29ea8df35645d704813675dd5c1e42f460`. Locator closure and
genuine import/edit/delete are accepted; migration 007's service-role table denial and rotation RPC
grant are confirmed. F-001 High requires replacing the forbidden HEAD with the existing legal
aggregate. F-002 High rejects the implementer's fixed `>=2` because initial pre-refresh identity
groups already total 2/3. Reviewer Q-PROPOSAL-P05-05-02 is transcribed as Q-007: the sole revision-
06 spec captures initial owner sync total and requires later total at least
`Math.max(2, initial + 1)` under unchanged 70-second/1-second polling. No helper/privilege/migration/
product/config/dependency/transport/other-test widening or marker; R-004/R-009 updated and scratch
remains `c74a2a78…`.

**2026-07-20T09:31:59+10:00 — P05/05 `changes_requested -> changes_requested`:** Immutable
revision-05 evidence/review, Q-007, R-004/R-009 and failure state persisted in
`a4961fdb53e0315a8b1925b1d65f90f237b139cd`; all five P05 FAIL reviews are immutable. Revision-06
dispatch may proceed after this artifact-commit reference is durably recorded; no frozen source or
marker changed.

**2026-07-20T09:33:00+10:00 — P05/06 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`a00eed992495f837eab34dfa0cf7cb13d62c97c5` includes all immutable P05 revision-01–05 product and
failure/control commits. Q-007 authorizes exactly `tests/e2e/realtime-security.spec.ts`: capture the
initial owner sync total, remove the forbidden direct-table observer and require a later legal
aggregate total at least `Math.max(2, initial + 1)` under unchanged 70-second/1-second polling.
Run the complete live/lifecycle/security/fresh/upgrade/full browser/static/CLI matrix. No helper/
privilege/product/config/dependency/migration/transport/other-test/CRDT/Loro or HS-015 marker
authority; scratch remains `c74a2a78…`.

**2026-07-20T09:46:41+10:00 — P05/06 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`95acc3b2e935b9bdf2788f301a79b490d2d5d509`; revision diff is only the authorized Realtime spec
(41 insertions/35 deletions, mostly formatter wrapping). Evidence SHA-256
`1c71d43ea08c7b9abc030126dc4444066f92d618bd0d84cce2cfe3ab17132599`. Baseline-relative legal
refresh proof passes ordinary 1/1 and repeated 3/3 with genuine subscription/import/edit/delete,
removal denial and zero runtime errors. Fresh 87/87, upgrade 27/27, unit 1,170/1,170, type/lint/build
pass. Full retries-zero E2E is 80/81 with the revised journey green; the sole vault-settings failure
reproduces isolated at cumulative Presence authorize 4 versus <=2. Sanitized chronology proves two
Presence grants on initial dev-effect mount and two post-unlock. Q-PROPOSAL-P05-06-01 requests only
`tests/e2e/vault-settings.spec.ts`: capture post-identity pre-lock counters and assert unchanged
authorize/revoke bounds on final-minus-baseline deltas. CLI stops after deterministic red; final
empty compatible DB and cleanup pass. New immutable output `reviews/P05-review-06.md`; no PASS or
HS-015 marker.

**2026-07-20T09:56:18+10:00 — P05/06 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `53dd7bfe51b392cd0b4ea316e37978bafe4f75fe1d592c937d135259a7ffbfb5`. Causal refresh and
genuine live/removal focused 3/3, fresh 87/87, upgrade 27/27, unit 1,170/1,170, static/build and
Realtime under full concurrency are accepted. Full suite independently remains 80/81 with the same
isolated cumulative Presence 4 versus 2. F-001 High confirms the observer includes two onboarding
and two post-unlock grants; post-identity final-minus-baseline deltas are authorize <=2 and revoke
>=1 per purpose. Q-PROPOSAL-P05-06-01 is transcribed as Q-008 with sole revision-07
`tests/e2e/vault-settings.spec.ts` and unchanged bounds. No helper/provider/product/transport/
migration/config/other-test widening; R-004/R-009 updated and HS-015 remains unchecked.

**2026-07-20T09:57:13+10:00 — P05/06 `changes_requested -> changes_requested`:** Immutable
revision-06 evidence/review, Q-008, R-004/R-009 and failure state persisted in
`253ed4b1d2ef828086420a49e85413cdb264162a`; all six P05 FAIL reviews are immutable. Revision-07
dispatch may proceed after this artifact-commit reference is durably recorded; no frozen source or
marker changed.

**2026-07-20T09:58:16+10:00 — P05/07 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`9729a422ff276064693810a47448a8de18492854` includes all immutable P05 revision-01–06 product and
failure/control commits. Q-008 authorizes exactly `tests/e2e/vault-settings.spec.ts`: snapshot after
identity/before Lock and assert unchanged sync/Presence authorize <=2 and revoke >=1 on final-minus-
baseline deltas. Run focused/repeated Realtime and lock/unlock, full retries-zero 81-test E2E,
fresh/upgrade/unit/static/build and installed CLI charter. No bound/helper/revision-06 spec/provider/
product/config/dependency/migration/transport/other-test/CRDT/Loro or HS-015 marker authority;
scratch remains `c74a2a78…`.

**2026-07-20T10:04:13+10:00 — P05/07 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`c2203faa84a1590263014d6426e2f854cdc036e8`; only the authorized vault-settings spec changes (19
insertions/5 deletions). Evidence SHA-256
`fa6296b49fac4eec9bd3afe9be9a9cad36241b7207c5543d4dce60e4081e32dd`. Exact isolated run reaches
final attribution but pre-lock Presence baseline is zero and delta remains 4 versus <=2:
`createNewIdentity` returns on URL/local-storage readiness before asynchronous Presence completion.
Q-PROPOSAL-P05-07-01 requests the same sole spec path to require exactly one visible `(online)`
Presence title within the existing 15-second behavior bound before taking the unchanged baseline;
source renders it only after connected synchronized Presence state. No sleep/counter threshold/
retry/bound/provider/product widening; further gates stop after deterministic red, final compatible
empty DB/cleanup/frozen sources pass. New immutable output `reviews/P05-review-07.md`; no PASS or
HS-015 marker.

**2026-07-20T10:13:04+10:00 — P05/07 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `6698876b9b654bff6cd00e3bf54d4ac45f86cd9ba7348fc30a4b33a3048bde7c`. Immediate baseline
zero and final delta Presence 4 versus 2 are reproduced. F-001 High confirms visible online state is
a causal barrier after both initial authorization requests, but corrects the selector because hidden
mobile plus visible desktop avatars both exist: filter `{ visible: true }` and require count one
within unchanged 15 seconds. Q-PROPOSAL-P05-07-01 is transcribed as Q-009 with sole revision-08
vault-settings spec, unchanged delta/bounds and no sleep/counter/retry/product widening. R-004/R-009
updated; final compatible empty DB/cleanup/frozen sources pass and HS-015 remains unchecked.

**2026-07-20T10:13:57+10:00 — P05/07 `changes_requested -> changes_requested`:** Immutable
revision-07 evidence/review, Q-009, R-004/R-009 and failure state persisted in
`ad26cf6b752e41eeac025586183b92b40751520d`; all seven P05 FAIL reviews are immutable. Revision-08
dispatch may proceed after this artifact-commit reference is durably recorded; no frozen source or
marker changed.

**2026-07-20T10:14:46+10:00 — P05/08 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`6ad32a6497861f6866209f79ae842a40e143a1ad` includes all immutable P05 revision-01–07 product and
failure/control commits. Q-009 authorizes exactly `tests/e2e/vault-settings.spec.ts`: require one
visible online Presence avatar within 15 seconds before the existing baseline, using a visibility-
filtered locator for responsive duplicate DOM, then retain unchanged delta/bounds. Run focused/
repeated/full E2E, complete fresh/upgrade/unit/static/build and installed CLI charter. No sleep/
counter/retry/bound/helper/provider/product/config/migration/other-test/CRDT/Loro or marker authority;
scratch remains `c74a2a78…`.

**2026-07-20T10:23:24+10:00 — P05/08 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`a4d62601dbb0ea17ad43308b39aabd81acbaf7fe`; only the authorized vault-settings spec changes (2
insertions). Evidence SHA-256 `dcfb79499ab725eb4881899fcf298804123d575d557ff9b7943772f9ed0f0c8d`.
Focused lock/unlock passes 1/1 and repeated vault-settings passes 3/3 with exactly one visible online
avatar before unchanged deltas/bounds. Paired Realtime is 2/3: middle run sees global subscription
counts 6/6/5 because one prior-fixture row lingers during async teardown; all subscriptions are zero
after contexts close. Q-PROPOSAL-P05-08-01 requests exactly helper + Realtime spec to validate a
vault ID, filter outer claims to the current vault and retain aggregate equality/bounds, with no
wait/retry/teardown/product widening. Remaining gates stop after deterministic red; final compatible
empty DB/cleanup/frozen sources pass. New immutable output `reviews/P05-review-08.md`; no PASS or
HS-015 marker.

**2026-07-20T10:30:59+10:00 — P05/08 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `46c4403f0d8364e49500cb8cf5e6cb8f09f151d07e69bdcb9c7f1ac6310e58d4`. Readiness focused
1/1 and vault-settings repeated 3/3 are accepted. Paired Realtime independently remains 2/3 with
exact 6/6/5 contamination and zero subscriptions post-close. F-001 High confirms the global helper
includes a revoked prior-vault teardown row. Q-PROPOSAL-P05-08-01 is transcribed as Q-010 with exact
helper+Realtime-spec revision-09 scope, strict UUID validation and outer current-vault claims filter,
preserving all equalities/bounds. No wait/retry/teardown/product/schema/config widening; R-004/R-009
updated, cleanup/frozen sources pass and HS-015 remains unchecked.

**2026-07-20T10:31:55+10:00 — P05/08 `changes_requested -> changes_requested`:** Immutable
revision-08 evidence/review, Q-010, R-004/R-009 and failure state persisted in
`ce587d2b2d4b9a15aa1ca28f8cb5ca1ab1d1f464`; all eight P05 FAIL reviews are immutable. Revision-09
dispatch may proceed after this artifact-commit reference is durably recorded; no frozen source or
marker changed.

**2026-07-20T10:33:00+10:00 — P05/09 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`cdf147d0dfdeec66f2722fafd802123c06bed09b` includes all immutable P05 revision-01–08 product and
failure/control commits. Q-010 authorizes exactly Realtime helper+spec: strict UUID validation,
outer current-vault claims filter and fixture caller, retaining aggregate-only output and all exact
equalities/bounds. Run paired repeats, full zero-retry E2E, complete database/unit/static/build and
installed CLI charter. No wait/retry/teardown/vault-settings/product/config/migration/other-test/
CRDT/Loro or marker authority; scratch remains `c74a2a78…`.

**2026-07-20T10:44:33+10:00 — P05/09 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`98f5e973f00e794f119dd3045e8b4c57b4a7b0a7`; exactly helper+Realtime spec change (10 insertions/2
deletions). Evidence SHA-256 `82cff417d5d5b1f7785edd6c25b5e83d4d72fd1fbe8b7ff5249857c69517431b`.
Strict UUID/current-vault outer scoping passes focused Realtime/vault 1/1 each and interleaved 6/6;
fresh 87/87, upgrade 27/27, changed static gates, repo lint/type pass. Full unit is 1,167/1,170:
three unchanged VaultRealtimeSync tests now reject their `00:01Z` credential because the real clock
is ~00:40Z. Q-PROPOSAL-P05-09-01 requests only `tests/unit/sync/realtime.test.ts`, Date-only fake
time at `00:00Z` scoped to that describe with real timers/restoration. Build interrupted and full
E2E/CLI unrun after deterministic stop; final compatible empty DB/cleanup/frozen sources pass. New
immutable output `reviews/P05-review-09.md`; no PASS or HS-015 marker.

**2026-07-20T10:54:55+10:00 — P05/09 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `58e40beca43c0ec272f2d9ccf950344040aa5235d695f914f55b684a3312a25d` accepts strict
current-vault attribution: focused Realtime 1/1, vault 1/1, interleaved 6/6, fresh 87/87 and seeded
upgrade 27/27. Full unit is exactly 1,167/1,170; only three unchanged `VaultRealtimeSync` cases
reject their fixed `00:01Z` expiry against the later real clock before channel creation. Q-011
transcribes the confirmed revision-10 sole `tests/unit/sync/realtime.test.ts` repair: fake Date only
at `00:00Z` within that describe and restore real timers after each case, with fixtures, production
guard and all assertions unchanged. R-004/R-009 updated; final empty compatible database, cleanup,
scratch 21-block/checked-set and immutable sources pass. HS-015 remains unchecked.

**2026-07-20T10:56:07+10:00 — P05/09 `changes_requested -> changes_requested`:** Immutable
revision-09 evidence/review, Q-011, R-004/R-009 and failure state persisted in
`3a8e17f9e134c071e1ef48e935bdd26f817148fc`; all nine P05 FAIL reviews are immutable. Revision-10
dispatch may proceed after this artifact-commit reference is durably recorded; no frozen source or
marker changed.

**2026-07-20T10:56:44+10:00 — P05/10 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`09c192e85ac3ee43c00a8f6a71da5d0a542dccf3` includes all immutable P05 revision-01–09 product and
failure/control commits. Q-011 authorizes only `tests/unit/sync/realtime.test.ts`: Date-only fake
time at `2026-07-20T00:00:00Z` within `VaultRealtimeSync`, real-timer restoration after each case,
and unchanged fixtures/product/assertions. Run focused/full unit, static/build/database, ordinary
zero-retry E2E and installed CLI charter. No product/E2E/helper/migration/config/dependency/other
path or marker authority; scratch remains `c74a2a78…`.

**2026-07-20T11:15:35+10:00 — P05/10 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`55e3cb60b39418e947503a189e78b89cd4292673`; sole unit-test path (7 insertions/1 deletion).
Evidence SHA-256 `ab7d6806d7937bbbdb9f1bac7b562fe12e93dc04657cd29554b3878b6f897fb0`.
Date-only repair passes focused 5/5, full unit 1,170/1,170, lint/type/build, fresh 87/87, seeded
upgrade 27/27, isolated Realtime 3/3 and full zero-retry E2E 81/81. Installed CLI then proves a
same-identity duplicate has live Presence/subscription but misses its sibling's persisted op beyond
15 seconds; source inspection attributes this to the `SyncManager` same-pubkey early return.
Q-PROPOSAL-P05-10-01 requests exact manager + true Chrome duplicated-tab regression paths. The
remaining CLI charter stops unassessed; final compatible empty DB/cleanup/frozen sources pass. New
immutable output `reviews/P05-review-10.md`; no PASS or HS-015 marker.

**2026-07-20T11:26:41+10:00 — P05/10 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `51bd77e62afb1adb08cd617db974d1df85f51eda7c7b06c20cd42d838aa7c9f8` accepts Date-only
closure with focused 5/5 and full unit 1,170/1,170. The installed CLI independently reproduces two
same-identity live tabs with Presence 2/subscriptions 2, creator row 1/server op 1, receiver row 0
after 15 seconds and zero console errors. The exact owner is the `SyncManager` same-pubkey early
return; independent Loro probes prove self/repeated import version stability and zero local-update
callbacks. Q-012 transcribes the tightened exact revision-11 manager + true Chrome duplicate spec
scope with both tabs row 1, fixture op 1, receiver push delta 0 and zero browser errors, retaining all
bounds/security. R-004/R-009 updated; final empty compatible DB, cleanup, scratch 21-block/checked-
set and immutable sources pass. HS-015 remains unchecked.

**2026-07-20T11:27:50+10:00 — P05/10 `changes_requested -> changes_requested`:** Immutable
revision-10 evidence/review, Q-012, R-004/R-009 and failure state persisted in
`af985817c24652ec85b433b04dc609e1cced5c8c`; all ten P05 FAIL reviews are immutable. Revision-11
dispatch may proceed after this artifact-commit reference is durably recorded; no frozen source or
marker changed.

**2026-07-20T11:28:16+10:00 — P05/11 `changes_requested -> implementing`:** Original BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`71b38d71aa17fa843f0c9354bf78c20a0d3b4400` includes all immutable P05 revision-01–10 product and
failure/control commits. Q-012 authorizes exactly manager + duplicated-tab spec: remove only the
same-pubkey early return and extend the true `chrome.tabs.duplicate()` journey to prove both tabs
row 1, fixture op 1, receiver push delta 0 and zero errors within unchanged bounds while backgrounded.
Run focused/full unit, static/build/database, repeated/full zero-retry E2E and the complete installed
CLI charter. No reload/focus/poll/sleep/retry/timeout/schema/config/dependency/other-path or marker
authority; scratch remains `c74a2a78…`.

**2026-07-20T11:48:43+10:00 — P05/11 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`7f0b0710e820b87be2ee8877a3b7693d90e5e505`; exact manager + duplicated-tab spec change (100
insertions/5 deletions). Evidence SHA-256
`2e57eb4e8540b364ceb8369bef5b508b4f9cc442e430723435503ee03d1bcb90`. True extension duplicate
passes focused 1/1, paired Realtime repeat 6/6, full zero-retry E2E 81/81 and proves rows 1/1,
fixture op 1, receiver push delta 0 and zero errors; unit 1,170/1,170, static/build and both database
audits pass. Installed CLI then proves a genuinely hidden sibling misses the unchanged 15-second
bound but converges later without focus/reload/poll, distinct from the fixed permanent drop.
Q-PROPOSAL-P05-11-01 requests measured owner confirmation before exact client worker + duplicate-
spec revision-12 scope. Remaining CLI charter stops unassessed; compatible empty DB/cleanup/frozen
sources pass. New immutable output `reviews/P05-review-11.md`; no PASS or HS-015 marker.

**2026-07-20T12:11:21+10:00 — P05/11 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `429b7b86c3fbceca9bbad6ae3d861037ca75a49d7a96a85c448dd7a195aa0244` accepts the exact
same-identity manager/test closure and true duplicate focused 1/1 + repeat 3/3. It rejects the
unproven hidden-page claim: required headless CLI reports both opener pages visible, while sanitized
socket/import/DOM timing is 2,549/2,549/2,591 ms with rows 1/1. `worker: true` moves only heartbeat
timing, is causally unmatched and adds per-client worker/CSP/failure surface. Reviewer proposal is
transcribed as Q-013: no product/test revision-12 diff until a supported verified-hidden topology
can time the first late edge; otherwise use evidence-backed `blocked_external` and continue
independent packages. R-004/R-009/R-026 updated; final empty compatible DB, cleanup and immutable
sources pass. HS-015 remains unchecked.

**2026-07-20T12:12:56+10:00 — P05/11 `changes_requested -> changes_requested`:** Immutable
revision-11 evidence/review, Q-013, R-004/R-009/R-026 and failure state persisted in
`f6fa2c2e411546f06e7b21e12157dfbb0c411d24`; all eleven P05 FAIL reviews are immutable. The
verified-hidden mechanism must now be reconciled before revision-12 dispatch or a dated
`blocked_external` transition; no frozen source or marker changed.

**2026-07-20T12:15:08+10:00 — P05/11 `changes_requested -> blocked_external`:** Dated installed-
tool and repository-authority audit confirms the mandatory headless `@playwright/cli` 0.1.17 has no
hide/background command, all allowed sibling pages report visible, and bundled protocol offers only
active/frozen lifecycle state. Headed/config/temp/emulated substitutes are forbidden; measured
visible socket/import/DOM convergence is 2,549/2,549/2,591 ms, so no product owner is available.
D-011 and DEPENDENCIES preserve the green revision-11 manager fix, forbid speculative worker/bound/
focus/reload/poll changes, and set recheck before P08/P10, a capable tool upgrade or P21. HS-015
remains unchecked; independent P06 may proceed after this disposition is persisted.

**2026-07-20T12:16:22+10:00 — P05/11 `blocked_external -> blocked_external`:** D-011, the dated
DEPENDENCIES gate, R-026 and exact P05/HS-015 blocked state persisted in
`e96d93bde4125a106ad9ca092cedf0b0998bf04e`. The reviewed product HEAD stays
`7f0b0710e820b87be2ee8877a3b7693d90e5e505`; recheck triggers and safe-work boundary are durable,
so independent P06 dispatch may proceed without weakening or falsely completing HS-015.

**2026-07-20T12:18:34+10:00 — P06/01 `queued -> implementing`:** P04 dependency is passed; P05's
external gate is independent. Original BASE and pre-implementation HEAD are exact
`a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1`. Dispatch authorizes migration 009 plus only the listed
router/schema/hook/dead-type/crypto-helper/database-audit/unit/E2E paths. Prove
`user_data.encrypted_data` is unused opaque state, preserve verified identity rows/memberships/vaults
and document irreversible blob deletion; remove dead state APIs without replacement storage. Run
fresh/upgrade, identity/onboarding/offline/duplicate/full/CLI gates. No passkey/P05/other-path or
marker authority; scratch remains `c74a2a78…`.

**2026-07-20T12:45:08+10:00 — P06/01 `implementing -> ready_for_review -> reviewing`:** Exact
HEAD `95e91dbcb17ffb9600eaa6cb795336898297ebae`; one commit across exactly 17 authorized paths.
Evidence SHA-256 `78fe921dbdd49e1a5ca5a499734f434a4e9715117499082110a5fb3450ae3f52`.
Migration 009 drops only unused `user_data.encrypted_data`, preserves identity timestamp and every
normalized vault/membership/op/snapshot field, revokes dead service UPDATE, and removes only proven-
dead procedures/Zod/types/crypto wrappers. Focused 10/10, unit 1,172/1,172, fresh 97/97, upgrade
40/40, focused 3/3, repeated 63/63, full zero-retry E2E 81/81, lint/type/build/format/diff pass.
Installed CLI confirms empty signed register/get-or-create bodies, no removed endpoints, create/
unlock/refresh/duplicate/offline/mobile preference behavior and later-package UI limits. Final
fresh 005–009 DB/service/cleanup/frozen sources pass; no proposal. New immutable output
`reviews/P06-review-01.md`; no PASS or HS-010 marker.

**2026-07-20T13:03:52+10:00 — P06/01 `reviewing -> reviewing`:** Independent PASS recommendation;
review SHA-256 `0580e4c8fc9f14d30d4c4d21a761fb56b8ff42953decd30564dda36efe4b64df`.
Exact 17-path range/evidence hash and sole-column target are verified. Reviewer independently passes
focused 10/10, unit 1,172/1,172, fresh 97/97, seeded upgrade 40/40 plus exact identity/membership/
snapshot SQL, changed E2E repeat 42/42, lint/type/build/type generation and installed CLI create/
unlock/refresh/duplicate/offline/mobile/network charter. Intentional blob loss is backup-only;
identity/normalized encrypted data and least privilege remain exact. No finding or Q; P05 external
and P08/P19 boundaries retained; final empty DB/cleanup/frozen sources pass. Integration, P06 PASS
and HS-010 marker remain pending.

**2026-07-20T13:04:49+10:00 — P06/01 `reviewing -> passed`:** PASS definition complete at exact
reviewed HEAD; immutable evidence/review, D-012 and R-003/R-007/R-013 state integrated in
`8e269ab9a6fc15ed6d845542b879e5499828134e`. No Q proposal; P05 external and P08/P19 ownership
remain. HS-010 `completion_pending` durably prepared from scratch SHA `c74a2a78…`; no marker changed
yet.

**2026-07-20T13:06:11+10:00 — HS-010 `completion_pending -> passed`:** Exact marker-only
`[] -> [x]` finalized after P06 review `reviews/P06-review-01.md` and integration
`8e269ab9a6fc15ed6d845542b879e5499828134e`; all 21 normalized blocks byte-match SCOPE and checked
set is exactly HS-002/HS-010/HS-014/HS-017/HS-018. Scratch SHA
`c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd ->
753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines and 24,244
bytes; FS-001 remains exact.

**2026-07-20T13:07:23+10:00 — P07/01 `queued -> implementing`:** P04 and P06 dependencies are
passed; exact BASE/pre-HEAD `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`. This is a no-product
evidence/ADR range: inventory every People/Member/invite/key-wrap/route/UI/test path, compare
dedicated Settings vs People-owned vs linked hybrid architecture, select the safest reversible
default and define the exact P08 security/UX/data/test contract. Installed CLI must candidly record
discoverability and placeholder/unavailable behavior without direct-URL or secret bypass. P05's
external gate remains a P08 dependency; no code/commit/marker authority and scratch remains
`753be6b7…`.

**2026-07-20T13:27:06+10:00 — P07/01 `implementing -> ready_for_review -> reviewing`:** Valid empty
range remains exact at `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`; no commit/product diff.
Evidence SHA-256 `2e5173cdf1df4fac4de3b64ecb2887a3c70a00d387e36298f5c9eb8eaa1164ad`.
Discovery proves the current generator unreachable, invite redemption placeholder/sender/route/
fragment flaws and delete-first/non-atomic rekey gap. ADR selects linked hybrid: authoritative
Vault Settings Access & Members, optional financial Person linkage, member-only invites, real
sender-bound fragment key exchange and atomic key-epoch removal. It defines 29 normative P08 clauses,
threat/privacy/migration/reversal and mandatory real-browser contract; no Q. Read-only 39/39 crypto/
invite, 97/97 DB and 8/8 E2E pass; installed CLI confirms no discoverable access flow and P08 mobile/
zoom targets. P08 remains gated on D-011/P05 recheck. Final empty DB/cleanup/frozen sources pass;
new immutable output `reviews/P07-review-01.md`. No P07 PASS or HS-011 marker.

**2026-07-20T13:43:59+10:00 — P07/01 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `296a5d0a17e2e1ae882422c3975d11c9ffc289c0a273ac52fb50e23af8b8381e` accepts the
linked-hybrid authority split but rejects two P08 clauses. F-001 proves discarding the old epoch key
can make a continuously authorized offline member's locally durable `pushed=false` operations
undecryptable. F-002 proves server SQL cannot atomically create client-encrypted CRDT Person/link
state and requires durable crash reconciliation after invite consumption. Q-014 selects an empty-
range revision-02 correction: active-only per-epoch envelopes plus an idempotent transition journal,
capability-bound pre-membership snapshot, atomic SQL acceptance returning a stable membership UUID,
and resumable deterministic encrypted-CRDT Person/link/selection reconciliation. Authenticated
`crypto_box` becomes the sole envelope convention and invite-aware onboarding defers default-vault
creation. R-005/R-006/R-007/R-018/R-027 route the new proof. P08 remains non-ready and separately
blocked by D-011/P05; HS-011/HS-012 stay unchecked. Empty range, artifact hashes, cleanup, scratch
`753be6b7…`, FS-001 and SCOPE are exact.

**2026-07-20T13:45:46+10:00 — P07/01 `changes_requested -> changes_requested`:** Immutable
revision-01 implementation evidence, independent FAIL review, Q-014, R-005/R-006/R-007/R-018/R-027
and exact P07/HS-011 failure state are persisted in artifact commit
`892bf536f0188cd1637d1eda5bfb5b1a1a040a44`. Revision 02 may proceed only after this artifact-commit
reference is durably recorded; no product, test, migration, scratch, FS-001 or SCOPE path changed.

**2026-07-20T13:46:54+10:00 — P07/02 `changes_requested -> implementing`:** Original BASE remains
`fe1871ce7dce1e831b57ee5656d38ce5c800aae3`; pre-implementation HEAD
`033cb8f6d37208c1ba6ac0b0907672aa18e4ad6d` contains only the preserved repository history and
immutable revision-01 artifact/control commits after that BASE. The worker may write only
`evidence/P07/implementation-02.md`, must make no commit, and must leave product/test/migration/
config/dependency paths and index unchanged. Q-014 requires a lossless active-member epoch
transition journal, per-epoch authorized envelopes, authenticated `crypto_box`, capability-bound
pre-membership snapshot authentication, stable server-atomic membership acceptance and a resumable
deterministic encrypted-CRDT Person/link/selection saga. All unaffected linked-hybrid clauses and
real-browser gates remain; P08 is still blocked by P07 and D-011/P05. Scratch stays `753be6b7…`.

**2026-07-20T14:05:58+10:00 — P07/02 `implementing -> ready_for_review -> reviewing`:** Worker
made no commit and HEAD remains `033cb8f6d37208c1ba6ac0b0907672aa18e4ad6d`; original
`fe1871ce7dce1e831b57ee5656d38ce5c800aae3..HEAD` contains only root's immutable revision-01
artifact/control history and no product/test/migration/config/dependency path. Sole new evidence
`evidence/P07/implementation-02.md` is 686 lines/60,110 bytes at SHA-256
`463c9139e76a65542c49ad3ef62212571e9d59cf7c198a81dbd864a9b419a85f`. Q-014 is applied with
access-generation-scoped per-epoch authenticated `crypto_box` history, exact lineage/watermark
rotation serialization, ciphertext-only crash journal and idempotent covered/inserted transition;
capability-bound snapshot/key preflight; atomic stable SQL acceptance truth; and protected,
deterministic encrypted CRDT Person/link/selection/sync recovery. The full 29-clause linked-hybrid
contract, privacy/migration/reversal/export and real isolated-browser proof remain; no new Q. P08 is
explicitly non-ready pending this independent review and D-011/P05. Exact-path formatting, index,
cleanup, empty service state, scratch/21 blocks, FS-001 and SCOPE pass; sole review output is
`reviews/P07-review-02.md`.

**2026-07-20T14:23:49+10:00 — P07/02 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `3f74108cff1bfc48fa49d0fe0e217f6ba491789851932ed229c94ffe93f6c4e3` confirms the central
Q-014 SQL/client saga, capability preflight, authenticated envelopes, lineage acknowledgements,
removed/re-added denial and onboarding corrections, but finds three remaining contract defects.
F-001 Critical: planning does not atomically fence every sibling-tab IndexedDB append, so a stale tab
can create an unmapped old-epoch `pushed=false` operation after enumeration. F-002 High: the full
restatement dropped new-vault owner membership↔default-Person linkage required by HS-012. F-003
High: two distinct invites can claim one encrypted Person and converge to non-bijective links.
Revision 03 remains evidence-only and must add a persistent append-checked transition fence with
late-lineage proof, a crash-recoverable vault-creator linkage saga, and deterministic post-merge
repair that preserves the intended Person while creating the losing membership's deterministic
Person before success. No Q proposal; all other revision-02 clauses remain frozen. Independent
39/39 crypto, typecheck, fresh 005–009/97 pgTAP and repeated 16/16 E2E pass without pretending to
execute the proposed protocol. CLI reconfirms no current discoverable flow and inherited 200% mobile
regression. Cleanup, empty service state, exact HEAD/index/range, scratch/21 blocks, FS-001 and SCOPE
pass. P08 and both HS markers remain blocked.

**2026-07-20T14:24:45+10:00 — P07/02 `changes_requested -> changes_requested`:** Immutable
revision-02 implementation evidence, independent FAIL review, R-006/R-018/R-027 updates and exact
P07/HS-011 failure state are persisted in artifact commit
`51cf5baf7492dfb39b606feda2dcb5277ef3877d`. Revision 03 may proceed only after this artifact-commit
reference is durably recorded; no product, test, migration, scratch, FS-001 or SCOPE path changed.

**2026-07-20T14:26:00+10:00 — P07/03 `changes_requested -> implementing`:** Original BASE remains
`fe1871ce7dce1e831b57ee5656d38ce5c800aae3`; pre-implementation HEAD
`55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d` includes immutable revision-01/02 failure artifacts and
control references. Worker may write only `evidence/P07/implementation-03.md`, makes no commit and
leaves all executable/index paths unchanged. Exact scope is the revision-02 review's three findings:
a persistent append-checked local epoch fence with transactional no-late-lineage proof; protected,
crash-recoverable vault-creator membership/default-Person linkage; and deterministic encrypted
post-merge repair for distinct invitations claiming one Person. Every sound revision-02 Q-014,
security/privacy/migration/reversal/export/accessibility/test clause remains fixed. P08 remains
blocked by P07 and D-011/P05; scratch stays `753be6b7…`.

**2026-07-20T14:36:17+10:00 — P07/03 `implementing -> ready_for_review -> reviewing`:** Worker made
no commit and HEAD remains `55bc57e8110c0a0b67c7e1cd470ea6bdc90c6d3d`; cumulative BASE..HEAD
contains only root-integrated P07 artifact/control paths and no executable change. Sole evidence
`evidence/P07/implementation-03.md` is 906 lines/79,658 bytes at SHA-256
`e071c6b240c7907f6814425f7da4dcb25f02e87b95522d9c6c95e953d85ddfbb`. F-001 adds one persistent
same-store edit-admission/append fence, isolated-fork live-after-durable mutation, serialized seal/
journal-extension/adoption CAS, terminal minimum epoch and exact no-late-lineage proof. F-002 adds
caller/default-purpose SQL creation truth plus protected deterministic owner membership↔Person link
recovery and sync-before-success. F-003 adds encrypted convergent winner claims and deterministic
loser-Person repair preserving financial history. Full Q-014, linked-hybrid, ownership/threat/
privacy/migration/reversal/export and 29-clause real-browser contract remains; no Q and no P08
readiness. Formatting, index, cleanup, scratch/21 blocks, FS-001 and SCOPE pass; sole review output
is `reviews/P07-review-03.md`.

**2026-07-20T14:48:18+10:00 — P07/03 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `af4857061be4e637b31b4a4ac682a1fb17e0b1fd8836b84d846b16eb8a80bff0` approves and closes the
cross-tab persistent fence, terminal epoch and no-late-lineage protocol; it also accepts SQL creator
truth/protected recovery and intended winner/loser values. F-001 Critical proves that two Loro peers
can assign identical values yet emit different exact update bytes (independent probe: 101/101 bytes,
unequal), so value-derived “semantic lineage” can falsely cover a distinct encrypted operation and
cannot generate a causally later repair after a stale claim. F-002 High proves the creator saga's
new UUIDv5 Person conflicts with the initial snapshot's canonical `person-default-me` and default-
account 100% ownership. Revision 04 must permanently store/dedupe only exact CRDT operation identity,
separate saga completion from each peer's actual update, bind later repair rounds to observed causal
frontier/claim operations, and link the existing default `Me` while preserving every ownership/
reference. No Q; all other revision-03 clauses remain fixed. Current 39/39, typecheck, fresh 005–
009/97 pgTAP, repeated 16/16 E2E and clean installed-CLI state pass without claiming proposed
protocol execution. Cleanup, zero DB rows, exact HEAD/index/write boundary, scratch/21 blocks,
FS-001 and SCOPE pass. P08/markers remain blocked.

**2026-07-20T14:49:05+10:00 — P07/03 `changes_requested -> changes_requested`:** Immutable
revision-03 implementation evidence, independent FAIL review, R-006/R-027 updates and exact P07/
HS-011 state are persisted in artifact commit `196b190066f75465061a1524fc8c51d067a2ef42`.
Revision 04 may proceed only after this reference is durably recorded; no executable, scratch,
FS-001 or SCOPE path changed.

**2026-07-20T14:50:27+10:00 — P07/04 `changes_requested -> implementing`:** Original BASE remains
`fe1871ce7dce1e831b57ee5656d38ce5c800aae3`; pre-implementation HEAD
`dfffea3c19b110b6021b050b8d9e36b01ae75ab9` includes immutable prior P07 artifacts/control. Worker
may write only `evidence/P07/implementation-04.md`, makes no commit and leaves executable/index paths
unchanged. Exact scope separates request/value idempotency from every peer-specific exact Loro op,
retains all distinct permanent operations, binds repair rounds to observed claim operations/causal
frontier so late claims force a newer repair, and links canonical `person-default-me` to the owner
membership while preserving default-account 100% ownership and every reference. All sound revision-
03 fence/security/privacy/migration/reversal/export/accessibility tests remain. P08 stays blocked by
P07 and D-011/P05; scratch remains `753be6b7…`.

**2026-07-20T14:59:31+10:00 — P07/04 `implementing -> ready_for_review -> reviewing`:** Worker made
no commit; HEAD remains `dfffea3c19b110b6021b050b8d9e36b01ae75ab9` and cumulative range has
only root-integrated P07 artifact/control paths. Sole evidence `evidence/P07/implementation-04.md`
is 1,019 lines/89,865 bytes at SHA-256
`313ce10cfd75c25f26d6a75f9c8785bd95f2e213e48285c4e745cde7ecce93c6`. It separates semantic
saga/round receipts from every generated-once peer-specific exact operation, retains every distinct
update, permits `covered` only for exact retransmit/manifest identity, and binds post-late-claim
repair to imported claim ids/causal frontier with a new permanent round. Creator reconciliation
links canonical `person-default-me` in place and preserves `account-default` 100% ownership/all
references, rejecting malformed defaults. Every sound revision-03 fence/Q-014/security/privacy/
migration/reversal/export/accessibility/real-browser clause remains; no Q/P08 readiness. Formatting,
index, cleanup, scratch/21 blocks, FS-001 and SCOPE pass; sole review is `reviews/P07-review-04.md`.

**2026-07-20T15:14:15+10:00 — P07/04 `reviewing -> reviewing`:** Independent PASS recommendation
at corrected review SHA-256 `313cc26bf5b537c9281839b40a422d3e19f4244b30e18bd9f746303951f01c13`;
the initial same-file PASS contained one wrong prior-review hash and the reviewer corrected only that
unfrozen metadata before root acceptance. Exact-operation permanence, semantic-receipt separation,
frontier-bound post-late-claim repair and in-place canonical `person-default-me` linkage with 100%
default ownership/references are independently sound. All 29 clauses, Q-014, cross-tab fence,
access-generation envelope history, capability/fragment/SQL-client security, privacy/migration/
reversal/export/accessibility and real-browser proof remain complete. No finding/Q. Independent
39/39 crypto, typecheck, fresh 005–009/97 pgTAP, repeated 16/16 E2E, unequal-peer Loro probe and
installed-CLI current-state evidence pass. Cleanup, zero DB state, HEAD/index/range, every artifact
hash, scratch/21 blocks, FS-001 and SCOPE pass. Root integration is pending; P08 still requires the
D-011/P05 supported-hidden-topology recheck and HS-011/HS-012 remain unchecked.

**2026-07-20T15:15:09+10:00 — P07/04 `reviewing -> passed`:** PASS definition complete at exact
reviewed HEAD `dfffea3c19b110b6021b050b8d9e36b01ae75ab9`; evidence/review hashes, D-013 and
R-005/R-006/R-018/R-027 updates are integrated in
`1f6cb96b27c8093f0ba2c319f32d3c79c8aab126`. No finding/Q remains. P07 architecture passes, but
HS-011 maps also to P08 and therefore returns to queued without a marker; HS-012 is likewise
unchanged/unchecked. D-011/P05 requires a supported genuinely-hidden-topology no-product recheck
before P08 can dispatch. Scratch remains `753be6b7…`; 21 blocks, FS-001 and SCOPE are exact.

**2026-07-20T15:16:41+10:00 — P05/12 `blocked_external -> implementing`:** The before-P08 D-011/
DEPENDENCIES trigger reopens P05 for a no-product diagnostic only. Original P05 BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; reviewed product HEAD
`7f0b0710e820b87be2ee8877a3b7693d90e5e505` stays preserved; pre-diagnostic repository HEAD is
`824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`. Worker may write only
`evidence/P05/implementation-12.md`, make no commit and must audit installed CLI/help/protocol/runtime
for a supported genuinely hidden headless page. If supported, exact hidden visibility plus socket/
import/DOM timing is required; if not, installed primary-source/allowed-page evidence must preserve
`blocked_external`. Headed/config/temp/emulated/frozen/focus/reload/poll/worker substitutes remain
forbidden. P08/P10, product edits and marker remain blocked; scratch is `753be6b7…`.

**2026-07-20T15:22:41+10:00 — P05/12 `implementing -> ready_for_review -> reviewing`:** HEAD/index
remain `824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`/empty; no commit or executable diff. Sole evidence
`evidence/P05/implementation-12.md` is 195 lines/12,423 bytes at SHA-256
`8f5ec6614f68db79f54d1ebf2f3ba4e4e89c2d3f1dc386c5ea61a00626a4f8fd`. Installed versions remain
CLI 0.1.17, bundled Playwright/Core 1.62.0-alpha-1783623505000 and repository Playwright 1.61.1;
help/README/runtime expose tab selection/`bringToFront()` but no hide/background API, and bundled
protocol exposes `active|frozen` only. Allowed disposable headless observation reports both pages
`visible`, `hidden:false`, `hasFocus:true`; therefore no product/timing run was falsely performed.
Evidence recommends unchanged `blocked_external`, revision-11 preservation and P08/P10 block; no Q.
Formatting, cleanup, zero service rows, scratch/21 blocks, FS-001 and SCOPE pass. Sole review output
is `reviews/P05-review-12.md`.

**2026-07-20T15:30:50+10:00 — P05/12 `reviewing -> blocked_external`:** Independent diagnostic PASS
review SHA-256 `551b4545fc19ac2fccd0e6f84258b79d931c6973dfaaa9f0471d02dfeecc5e35` reproduces every installed
version/source identity and the allowed two-page Chrome result: both `visible`, `hidden:false`,
`hasFocus:true`. CLI help/README/runtime/public API expose no hide/background method; bundled
protocol has `active|frozen` only. With no hidden predicate, omitting MoneyFlow/15-second timing was
the required honest stop; no product owner is inferred. No finding/Q. Revision-11 product work stays
preserved, P05/HS-015 returns to `blocked_external`, HS-015 remains unchecked and P08/P10 remain
dependency-blocked. DEPENDENCIES/D-011/R-026 receive the dated recheck; next trigger is a capable
installed upgrade or P21. Exact range/index, formatting, cleanup, zero state, scratch/21 blocks,
FS-001 and SCOPE pass; root artifact integration pending.

**2026-07-20T15:31:48+10:00 — P05/12 `blocked_external -> blocked_external`:** Immutable diagnostic
evidence/review and dated DEPENDENCIES/D-011/R-026 disposition are persisted in
`0f7ee5222dd23794411427fdc013cf3a5b6f8648`. The before-P08 trigger is satisfied honestly but the
external capability remains unavailable; P08/P10 stay blocked and independent P09 may proceed. No
executable, marker or frozen-source path changed.

**2026-07-20T15:34:57+10:00 — P09/01 `queued -> implementing`:** P01 is passed and P09 is the next
dependency-ready package while the P05 branch remains honestly blocked. Dispatch uses clean literal
BASE/pre-implementation HEAD `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`, exact evidence
`evidence/P09/implementation-01.md` and future immutable review `reviews/P09-review-01.md`. The
implementer is limited to the exact CRDT/sync/provider/shell/mutation-call-site/test paths in HANDOFF
and must implement the standard Loro UndoManager lifecycle, origin exclusion, logical grouping,
truthful accessible controls and guarded platform shortcuts with focused plus full no-retry evidence.
The only dispatch-time dirty paths are root-owned unstaged HANDOFF/PROGRESS updates; index and all
product/test paths are clean. Scratch is exact at `753be6b7…`, all 21 normalized blocks and marker/
state mappings pass, FS-001 remains `0d0e2a14…` at 715 lines/25,441 bytes, and SCOPE remains
`d03f33e7…`; no marker event or rollback batch is active.

**2026-07-20T16:11:06+10:00 — P09/01 `implementing -> ready_for_review -> reviewing`:** The
implementer committed exactly ten authorized product/test paths at literal HEAD
`af06fb2ad32fe292aef15a011c2040cb54cf5dfa`; original BASE remains
`c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`. Sole frozen evidence
`evidence/P09/implementation-01.md` is 172 lines/12,346 bytes at SHA-256
`6c6ece5aa7947243291f2d5202338a937c4b219b99a3bbfce7a00428170db20c`; its Q proposal was corrected
before freeze to the complete PROCESS schema as `Q-PROPOSAL-P09-01-01`. Evidence reports focused
8/8, full Vitest 1,180/1,180, typecheck, zero-error lint, full no-retry E2E 83/83 and focused repeat
2/2, plus the complete installed-CLI charter; repository format remains inherited red only on seven
protected coordinator/frozen files. Root independently verified exact paths, empty index,
`diff --check`, cleanup/no generated drift, scratch SHA and 21 marker/state-normalized blocks,
FS-001 identity/metadata and SCOPE identity. The only dirt before review dispatch is root-owned
HANDOFF/PROGRESS plus assigned evidence; exact new reviewer output is `reviews/P09-review-01.md`.

**2026-07-20T16:30:06+10:00 — P09/01 `reviewing -> changes_requested`:** Independent review FAIL at
unchanged literal HEAD `af06fb2ad32fe292aef15a011c2040cb54cf5dfa`; review is 202 lines/16,444 bytes
at SHA-256 `5ecd94f8f95009a3108057996adbb318b563eda6b832c7bfe537a5bf221c6a09`. Blocking F-01 proves
autosaved controlled text edits close a zero-merge group per input event, so sequential typing
globally undoes character-by-character instead of as one logical edit; existing Enter/fill/synchronous
tests miss the path. Blocking F-02 proves a throttled `sync.pushOps` failure while offline is not
rescheduled on reconnect/visibility, leaving the accessible state at `Sync error` and the resulting
edit/undo operations locally durable but unpushed. Otherwise standard UndoManager origins/lifecycle,
online peer exclusion/propagation, redo clearing, shortcuts/editable guard and responsive/a11y controls
are sound. Independent focused 8/8, full Vitest 1,180/1,180, changed no-retry E2E repeat 6/6 and full
83/83 pass but lack both regressions. Q proposal is accepted for transcription as Q-015; R-028/R-029
track the two failures. Exact HEAD/index/write boundary, cleanup, scratch/21 blocks, FS-001 and SCOPE
verify. Preserve revision-01 work/artifacts; revision 02 must add explicit cross-event logical edit
boundaries and real failed-push reconnect retry with focused no-retry automation and installed-CLI proof.
Immutable revision-01 artifacts, Q-015 and R-028/R-029 were integrated in
`74bbc7167d09fe54dff48fe7df26886f0923bdd6`.

**2026-07-20T16:32:54+10:00 — P09/02 `changes_requested -> implementing`:** Revision-01 failure
artifacts are immutable and linked through control HEAD
`54a9f28e1c272ada62bea52f46b587f206d3057f`; original P09 BASE remains
`c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`. Revision 02 receives exact evidence
`evidence/P09/implementation-02.md` and future review `reviews/P09-review-02.md`. Its narrow authority
covers the typed CRDT edit-session boundary, autosaved Vault Name wiring, actual SyncManager online
retry owner and focused unit/integration/E2E regressions. F-01 must prove separate-event typing/native
undo followed by one complete global Undo/Redo without time merging or unrelated-action capture. F-02
must prove a genuinely failed offline push automatically retries on browser reconnect without another
mutation/reload/test hook, reaches truthful saved state and preserves peer/server durability and listener
cleanup. Re-review will cover original BASE through newest HEAD. Dispatch-time dirt is only root-owned
unstaged HANDOFF/PROGRESS; index and executable paths are clean. Scratch/21 blocks, FS-001 and SCOPE
remain exact; no marker event or rollback batch is active.

**2026-07-20T16:57:53+10:00 — P09/02 `implementing -> ready_for_review -> reviewing`:** Revision-02
commit `418234e28ac649e03ce8ad184d08a8a2f2416149` changes exactly seven authorized remediation/test
paths. Cumulative review remains original BASE `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed` through
that newest HEAD, including immutable revision-01 failure/control history. Sole frozen evidence
`evidence/P09/implementation-02.md` is 220 lines/16,189 bytes at SHA-256
`ea8a779eedae9c4520edf37e01164db70c49ddd8d0b8ae8b6846c7d590b693cb`. It reports explicit typed
focus-to-close edit sessions with immediate per-event commits and action isolation; a real browser
online retry with single-flight/coalesced durable reread and listener cleanup; focused 13/13, full
Vitest 1,185/1,185, changed E2E 3/3 and repeated 9/9, full no-retry E2E 84/84, typecheck and
zero-error lint. Installed-CLI evidence records sequential character/native-input/global one-step
Undo/Redo plus failed offline requests 149/153 followed only by online-state change and successful
request 156/status Saved. Root verified exact paths/HEAD/index, cumulative `diff --check`, no generated
drift/process, scratch SHA and all 21 normalized marker mappings, FS-001 and SCOPE. Only root-owned
HANDOFF/PROGRESS plus frozen revision-02 evidence are dirty; new sole review output is
`reviews/P09-review-02.md`.

**2026-07-20T17:16:06+10:00 — P09/02 `reviewing -> reviewing`:** Independent PASS recommendation at
unchanged cumulative HEAD `418234e28ac649e03ce8ad184d08a8a2f2416149`; review is 214 lines/17,759
bytes at SHA-256 `610d0853632ec2596d60011133827971c982b39f1a6e8800ba9d54b9badf2966`. No finding/Q remains.
The reviewer independently closes F-01 with real separate-character/native-input evidence followed by
one complete global Undo/Redo, and F-02 with actual failed offline requests 168/172 followed only by
the online transition, successful idempotent peer/source requests 60/180, 15 inserted durable IDs,
both clients Saved and receiver history disabled. Standard Loro origins/lifecycle, synchronous action
grouping, shortcut guards, responsive/a11y controls and online peer semantics remain sound. Independent
focused 13/13, full Vitest 1,185/1,185, changed no-retry E2E repeat 9/9, full no-retry E2E 84/84,
typecheck/lint and all 13 cumulative product/test format checks pass; only the seven known protected
root/frozen format paths remain red. Q-015 is upheld once; D-014 records the accepted architecture and
R-028/R-029 are mitigated. Root verified unchanged HEAD/index, exact evidence/review hashes, sole-write
boundary, cleanup/no generated process or next-env drift, scratch/21 blocks, FS-001 and SCOPE. Package
PASS awaits artifact/ledger integration; HS-006 remains unchecked and no marker event is active.

**2026-07-20T17:17:16+10:00 — P09/02 `reviewing -> passed`; HS-006 `reviewing -> completion_pending`:**
PASS definition is complete at exact reviewed product/test HEAD
`418234e28ac649e03ce8ad184d08a8a2f2416149`. Immutable revision-02 evidence/review, D-014 and
R-028/R-029 mitigation are integrated in `59bf82e894e45e034858e25255240701a3afb0b8`; Q-015 was
already canonically transcribed from revision 01 and no new Q exists. The sole mapped P09 package is
passed. Root durably prepares HS-006's exact `[] -> [x]` marker using before SHA
`753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, mapped independent review
`reviews/P09-review-02.md` and the integration commit above. Scratch has not changed yet; all 21
normalized blocks, current five-marker set, FS-001 and SCOPE verify. No dispatch is legal until this
event is finalized or recovered.

**2026-07-20T17:18:50+10:00 — HS-006 `completion_pending -> passed`:** Root changed exactly the
HS-006 leading marker `[] -> [x]` after P09 review `reviews/P09-review-02.md` and integration
`59bf82e894e45e034858e25255240701a3afb0b8`. A private `mktemp` comparison proved the sole one-line
marker diff and was removed. All 21 normalized blocks byte-match SCOPE; the exact checked set is now
HS-002/HS-006/HS-010/HS-014/HS-017/HS-018. Scratch SHA advances contiguously from
`753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578` to
`c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines/24,245 bytes.
FS-001 remains exact at `0d0e2a14…`, 715 lines/25,441 bytes; SCOPE remains `d03f33e7…`. The active
completion event is cleared and normal dispatch may resume.

**2026-07-20T17:19:58+10:00 — P11A/01 `queued -> implementing`:** P09/HS-006 is passed and P11A is
the next dependency-ready critical-path package. Dispatch uses clean literal BASE/pre-implementation
HEAD `eb5ab2e215130c358130d5411a92b51951c3c53a`, exact evidence
`evidence/P11A/implementation-01.md` and future immutable review `reviews/P11A-review-01.md`. Authority
is limited to alias schema/domain/CRDT mutation/query/migration paths and focused unit/integration/
description-alias E2E tests; P11B interaction and P11C integrated/performance scope remain deferred.
The implementer must establish legal real/symlink states, O(1) one-hop resolution, exact forward/
backlink conservation, atomic one-step operations, deletion bookkeeping and deterministic idempotent
data-preserving partial-data migration with property/concurrency/convergence evidence. Ambiguous
normalization or destructive concurrency becomes a complete Q proposal without pausing. Dispatch-time
dirt is root-owned HANDOFF/PROGRESS only; index/executable paths are clean. Scratch is exact at
`c2b986fd…` with six authorized markers and 21 normalized blocks; FS-001 and SCOPE remain exact; no
completion marker or rollback event is active.

**2026-07-20T17:27:32+10:00 — P11A/01 implementation authority refinement:** Model inventory found
that the existing `createVaultMirror` test/bootstrap path omits the `descriptionAliases` root and
does not invoke `migrateVaultSentinels`, so real-mirror migration/invariant tests cannot exercise the
same post-hydration state as production. Root explicitly adds only `src/lib/crdt/mirror.ts` to set the
empty alias root and call the existing system-origin migration before consumers. This is a narrow
P11A bootstrap/migration owner, not P11B/P11C scope. Every other original path prohibition remains;
no product commit or review boundary exists yet.

**2026-07-20T17:43:13+10:00 — P11A/01 `implementing -> ready_for_review -> reviewing`:** Literal
HEAD `4920dcbcb3d30b113c0df2811cbca3e718e22b0f` contains exactly 12 authorized product/test paths;
original BASE remains `eb5ab2e215130c358130d5411a92b51951c3c53a`. Sole frozen evidence
`evidence/P11A/implementation-01.md` is 204 lines/15,149 bytes at SHA-256
`657c055c01ccc3edf4d183a0c250a744112cf12fb90d2ec297a5071ae064f63d`. It reports a legal public
real/symlink union, preflighted atomic full-vault mutations, final-real assignment, exact nested/
top-level deletion bookkeeping, deterministic chain/cycle/partial-data repair and production/test
bootstrap migration. Focused 68/68 includes 40-run random sequences, real two-peer opposing
change-all convergence and real UndoManager/system-origin proof; full Vitest 1,200/1,200, typecheck,
build, zero-error lint and two independent no-retry 2/2 current-management E2E runs pass. Manual
current-surface create/Undo/Redo/reload is green after transparently correcting the local Realtime
server environment; P11B/P11C are explicitly deferred. Two complete Q proposals cover exact
normalization/case and concurrent destructive policy. Root verified exact paths/HEAD/index,
`diff --check`, cleanup/no generated drift/process, scratch/21 blocks/six markers, FS-001 and SCOPE.
Only root HANDOFF/PROGRESS and frozen evidence are dirty; exact new review output is
`reviews/P11A-review-01.md`.

**2026-07-20T18:07:34+10:00 — P11A/01 `reviewing -> changes_requested`:** Independent FAIL at
unchanged HEAD `4920dcbcb3d30b113c0df2811cbca3e718e22b0f`; review is 283 lines/21,880 bytes at
SHA-256 `38a390dc182086b8257f16cec92cd9ca4a87166e0a4a3a58f6163ec19b0a106d`. Six blocking findings:
F-01 production `useVaultAction` recipes return a Result after mutating the draft, causing the Immer
return-and-mutate runtime exception, discarding typed errors and allowing mixed-update partial writes;
F-02 repair is wired only to helper mirrors, not the real hydrated provider; F-03 remove-all leaves
active symlinks targeting a tombstone and repair can resurrect their visible aliases; F-04 public
selectors/types still expose the illegal raw wire union and symlink recovery names; F-05 the shipped
management route bypasses named normalization/actions and creates NFC-equivalent duplicates; F-06
required operation/property/scale/provider/repair-exchange/UndoManager evidence is materially absent.
Focused 68/68 repeated, unit 1,200/1,200, type/build/lint and management repeat 6/6 pass, but full
no-retry E2E is honestly red 4 failed/80 passed from F-01. Current-route manual CRUD/undo/sync/privacy/
responsive behavior is otherwise usable and P11B/P11C remain correctly deferred. Q-016/Q-017 accept
the normalization and provisional concurrency defaults for remediation; R-030/R-031 track graph and
production-integration risk. Exact HEAD/index/write boundary, cleanup, scratch/21 blocks/six markers,
FS-001 and SCOPE verify. Preserve revision-01 work/artifacts; revision 02 must close all findings and
receive cumulative independent review.
Immutable revision-01 artifacts, Q-016/Q-017 and R-030/R-031 were integrated in
`571b1ed05ab540d5a2e9fe5ba142d304a32137fa`.

**2026-07-20T18:12:16+10:00 — P11A/02 `changes_requested -> implementing`:** Revision-01 failure
artifacts, Q-016/Q-017 and R-030/R-031 are immutable; pre-implementation HEAD
`faeaebd358401b6639cce1c1b24eac577f69a624` includes their control/link commits. Revision 02 retains
the original literal BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` for cumulative review and
uses exact new evidence `evidence/P11A/implementation-02.md` and future review
`reviews/P11A-review-02.md`. Narrow authority adds the actual hydrated vault provider, the existing
alias management table, and only any transaction-page adaptation required by an enforced legal
selector boundary. It must close production recipe Result handling and partial writes, pre-consumer
provider repair, non-resurrecting real/symlink remove-all, public legal-state/type enforcement,
Q-016-normalized shipped management CRUD, and the full operation/property/Undo/provider/peer/reopen/
scale evidence gaps. P11B caret/autocomplete/modal UX and P11C integrated performance remain out of
scope. Dispatch-time dirt is root-owned HANDOFF/PROGRESS only; HEAD/index/executable paths are clean.
Scratch remains `c2b986fd…` with exactly six authorized markers and all 21 normalized blocks; FS-001
and SCOPE remain exact; no completion or rollback event is active.

**2026-07-20T20:40:53+10:00 — P11A/04 `implementing -> ready_for_review -> reviewing`:** Exact
revision-04 product/test commit `fb72abdaf531dff40c59f6b3525fb1b9ce50f805` contains three
authorized paths; cumulative review retains original BASE
`eb5ab2e215130c358130d5411a92b51951c3c53a` and all immutable prior history. Frozen sole evidence
`evidence/P11A/implementation-04.md` is 214 lines/16,195 bytes at SHA-256
`c77582e4d6ae19e291e0499bfb0357fac5d944a77c99447086b7ca4e9f09bf87`. It reports stable-ID raw
pending updates whose failures remain barrier-visible across later successes and retry online without
loss/duplication; one persistent detached staging document that incrementally catches up, imports and
repairs remote state before one canonical live delta; actual Mirror single-legal-notification proof;
exact repair push acknowledgement; peer/reopen convergence; and retained gates. Focused Vitest 40/40,
affected 8/8, full Vitest 1,219/1,219, typecheck/build/scoped format/lint pass; final full no-retry
E2E is 84/84 and alias repeat 6/6. Evidence transparently records an initial causal 81/84 sync run,
quadratic per-operation fork diagnosis and persistent-staging correction. Installed-CLI management/
offline/peer/privacy/reflow/dark/reduced-motion checks pass with P11B/P11C deferred. Root verified
exact HEAD/three paths/index, `diff --check`, evidence hash/size, no runtime/generated drift and frozen
hashes/sizes. Only root HANDOFF/PROGRESS and frozen evidence are dirty; sole new review output is
`reviews/P11A-review-04.md`.

**2026-07-20T20:52:38+10:00 — P11A/04 `reviewing -> passed`:** Independent cumulative PASS at
unchanged HEAD `fb72abdaf531dff40c59f6b3525fb1b9ce50f805`; review is 245 lines/20,188 bytes
at SHA-256 `5f21b564eb9c5480491d7d126ad8e575daffd3d2998ea8f7e22e8b045bb7a0ed`.
All F-01–F-06 findings are closed. Independent proof covers sticky failed raw update A across queued B
success, repeated barrier rejection, stable-ID online recovery with no duplicate/loss; persistent
staging and incremental catch-up; one actual live Mirror legal notification; failed repair push
retention and exact-ID successful-batch completion; peer convergence/reopen/no user undo; immediate
local remove-all conservation; public legal boundary; management normalization; deterministic
properties and current-surface UX. Focused 40/40 repeated three times, full Vitest 1,219/1,219,
typecheck/build/lint/scoped format, alias E2E 6/6 and full exact-HEAD no-retry E2E 84/84 pass. The
review accepts the transparent pre-final 81/84 regression only because the persistent-staging fix and
fresh full pass close it. Manual offline/two-tab/encrypted-network/reflow/dark/reduced-motion/console,
cleanup, exact boundary, scratch/21 blocks/six markers, FS-001 and SCOPE pass. No Q proposal. P11A
alone may pass; HS-004 remains unchecked until P11B/P11C pass.

**2026-07-20T19:53:23+10:00 — P11A/03 `implementing -> ready_for_review -> reviewing`:** Exact
revision-03 product/test commit `722364b0417b4666de05df773933233d34e62033` contains 12 authorized
paths; cumulative review retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` and all
immutable prior history. Frozen sole evidence `evidence/P11A/implementation-03.md` is 235 lines/
17,213 bytes at SHA-256 `9656cee30c9260f5c44244fd40c6cecf46edd59d81a1ced19d7e350af77fb3cb`.
It reports a serialized real SyncManager encryption/persistence queue with awaited provider and
remote-repair barriers; immediate top-level/nested forward/reverse conservation for real/symlink
remove-all; alias-free public generic hooks/barrel exports; real IndexedDB/encryption ordering and
push-failure retry; aliased production-wrapper deletes; exchanged repair/reopen; and fixed-seed
concurrent plans while retaining F-01/F-05. Focused Vitest 39/39, full Vitest 1,218/1,218, typecheck,
build, committed-path formatting and lint with zero errors pass; alias E2E repeat is 6/6 and exact
HEAD full no-retry E2E is 84/84. Installed-CLI normalized management/offline/history/privacy/
responsive/dark/reduced-motion checks pass with explicit P11B/P11C deferral. Root verified exact
HEAD, 12-path revision diff, empty index, `diff --check`, evidence hash/size, no task-owned runtime/
generated drift, and frozen source hashes/sizes. Only root HANDOFF/PROGRESS and frozen evidence are
dirty; sole new review output is `reviews/P11A-review-03.md`.

**2026-07-20T20:10:38+10:00 — P11A/03 `reviewing -> changes_requested`:** Independent cumulative
FAIL at unchanged HEAD `722364b0417b4666de05df773933233d34e62033`; review is 243 lines/20,273
bytes at SHA-256 `153b51685afff22fa01bf74cb0ca49a49fef7242a1ba272e159500f5320a0085`.
F-01/F-04/F-05 are closed, and F-03's local real/symlink remove-all now immediately conserves every
top-level/nested pointer and reverse map in one undoable action. Two lifecycle blockers remain.
F-02 proves `localPersistenceQueue` chains later work from `prior.catch(() => undefined)`, so queued
update B can succeed after update A encryption fails and make `awaitLocalPersistence()` resolve while
A is lost; no controlled crypto-failure test detects it. F-03 proves `doc.import()` synchronously
notifies the actual loro-mirror store before SyncManager's later repair; revision-03 coverage observes
only optional `onRemoteUpdate`, which the shipped provider does not use, so consumers can see the
illegal intermediate graph. F-06 requires failure-sticky queue/recovery evidence and a real Mirror
subscriber proof that no illegal state is exposed. Focused 39/39 repeated three times, full Vitest
1,218/1,218, typecheck/build/lint/scoped format and alias E2E 6/6 pass. First full no-retry E2E was
83/84 on an unrelated shift-click flake, isolated replay 3/3 and second full run 84/84; installed-CLI
management/offline/privacy/reflow passes. Q-016/Q-017 remain canonical with no new proposal. Exact
HEAD/index/write boundary, cleanup, scratch/21 blocks/six markers, FS-001 and SCOPE verify. Preserve
revisions 01–03; revision 04 must close both remaining findings and receive cumulative review.
Immutable revision-03 evidence/review and R-030/R-031 transcription were integrated in
`2bdca0e584aabe3f3a3ac2fe0c0d91637b9fe79a`.

**2026-07-20T20:12:57+10:00 — P11A/04 `changes_requested -> implementing`:** Revisions 01–03 and
their reviews are immutable; clean pre-implementation HEAD
`b19f9a24733edabb405402e684baefef23d63b30` includes the revision-03 artifact link. Revision 04
retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` for cumulative review and uses
exact evidence `evidence/P11A/implementation-04.md` and future review
`reviews/P11A-review-04.md`. Scope is limited to making persistence failure-sticky and raw updates
retryable so later queued success cannot mask/loss an earlier encryption failure, plus applying
remote updates and deterministic repair on an isolated clone before one canonical import notifies
the actual live Mirror subscriber. Controlled crypto-failure/recovery, real subscriber single-legal-
notification, durable repair exchange, peer/reopen convergence and failed-push retry are mandatory.
All closed recipe/normalization/local-remove-all/public-boundary/property/E2E gates must remain green;
P11B/P11C stay out of scope. Dispatch-time dirt is root HANDOFF/PROGRESS only; index/product paths are
clean. Scratch remains `c2b986fd…` with six authorized markers and all 21 normalized blocks; FS-001
and SCOPE remain exact; no completion or rollback event is active.

**2026-07-20T18:40:27+10:00 — P11A/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test commit `d81c5039c41577f94791bedc4184b98940c631a6` contains 16 authorized
paths; cumulative review retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` and all
immutable revision-01 history. Frozen sole evidence `evidence/P11A/implementation-02.md` is 236
lines/16,405 bytes at SHA-256
`b612081957b3c710dbb574ad78ce4b39765117b85a290e4d13a117fbb49b101f`. It reports production void
recipe/typed Result handling with atomic mixed-update preflight, actual post-hydration/pre-consumer
system repair, non-resurrecting real/symlink group deletion, a legal public state/type boundary,
Q-016-normalized shipped management CRUD, and expanded fixed-seed/full-operation/provider/peer/
reopen/large-map/one-step Undo evidence. Focused Vitest 53/53, full Vitest 1,214/1,214, typecheck,
build, formatting and lint with zero errors pass; focused management E2E is 2/2 and full no-retry E2E
is 84/84. Installed-CLI management normalize/duplicate/delete/undo/redo, responsive/accessibility,
sync privacy and cleanup are recorded with P11B/P11C deferrals. Root verified exact HEAD, 16-path
revision diff, empty index, `diff --check`, evidence hash/size, no task-owned runtime/generated drift,
scratch/FS-001/SCOPE hashes and sizes. Only root HANDOFF/PROGRESS and frozen evidence are dirty; sole
new review output is `reviews/P11A-review-02.md`.

**2026-07-20T19:23:35+10:00 — P11A/02 `reviewing -> changes_requested`:** Independent cumulative
FAIL at unchanged HEAD `d81c5039c41577f94791bedc4184b98940c631a6`; review is 278 lines/22,861
bytes at SHA-256 `3cc9c32c6b9461ea5461231264b366c509483d5372dd981c543141e3f167c970`.
F-01 is closed by void production recipes, typed Result propagation, atomic mixed-update preflight
and real-wrapper one-step Undo evidence. F-05 is closed by Q-016-normalized named management CRUD and
independent current-surface validation. Four blockers remain: F-02 proves real SyncManager's async
void local-update callback can leave repair encryption/append detached while provider `forceSync`
reads an empty queue and exposes consumers, a race hidden by the fake provider manager; F-03 proves
remove-all does not atomically clear applicable transaction forward/reverse references and live
merged invalid edges persist until an uninvoked reload repair; F-04 proves exported generic
selectors/actions and wire schema still let application callers read/mutate illegal alias state;
F-06 requires the corresponding real encrypted queue/barrier, immediate conservation/undo, exchanged
live repair, randomized concurrent plan and application-import compile-boundary evidence. Focused
53/53 repeated three times, full Vitest 1,214/1,214, typecheck/build/lint, focused E2E 6/6 and full
no-retry E2E 84/84 pass; installed-CLI management/offline/accessibility/privacy checks pass. Q-016 and
Q-017 remain canonical; no new Q proposal. Exact HEAD/index/write boundary, cleanup, scratch/21
blocks/six markers, FS-001 and SCOPE verify. Preserve revisions 01/02; revision 03 must close every
remaining finding and receive cumulative independent review.
Immutable revision-02 evidence/review and R-030/R-031 transcription were integrated in
`0183a70afed010d862f4eb960d5464b09a17ecd5`.

**2026-07-20T19:26:23+10:00 — P11A/03 `changes_requested -> implementing`:** Revisions 01/02 and
their reviews are immutable; clean pre-implementation HEAD
`fa994d649e2cc55e1c2991c3d9b732bd75393284` includes the revision-02 artifact link. Revision 03
retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` for cumulative review and uses
exact new evidence `evidence/P11A/implementation-03.md` and future review
`reviews/P11A-review-03.md`. Narrow new authority adds `src/lib/sync/manager.ts` and its focused
sync tests for an awaitable encrypted local-update persistence barrier plus immediate awaited remote
repair, and `src/lib/crdt/index.ts` to close the public raw export. It must atomically conserve all
top-level/nested transaction forward/reverse references during real/symlink remove-all before any
repair; enforce the legal public selector/action boundary through ordinary application imports; add
real queue ordering/failure/retry, production-wrapper alias delete, exchanged peer repair/reopen and
fixed-seed concurrent-plan evidence; and retain closed F-01/F-05 with full no-retry E2E. P11B/P11C
remain out of scope. Dispatch-time dirt is root HANDOFF/PROGRESS only; index and product paths are
clean. Scratch remains `c2b986fd…` with six authorized markers and all 21 normalized blocks; FS-001
and SCOPE remain exact; no completion or rollback event is active.

**2026-07-20T20:56:30+10:00 — P11B/01 `queued -> implementing`:** P11A/04 PASS artifacts, risk
mitigation and integration are immutable in `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`; that clean
HEAD is P11B's literal BASE/pre-implementation sentinel. Dispatch uses exact new evidence
`evidence/P11B/implementation-01.md` and future review `reviews/P11B-review-01.md`. Authority is
limited to the transaction description cell, shared-change modal, narrow transaction page/row/table
wiring, focused interaction tests and description-alias E2E. It must prove one-click caret, lazy
no-default autocomplete, pointer and keyboard/grid transitions, seamless exact/new/first/single-use
paths, exact shared change/remove choices with focus trap/restoration/cancel/no blur race, one-step
named actions, imported tooltip/manual raw absence and real-app accessibility. P11C integrated scale/
import/refresh/duplicate-tab/concurrent performance remains deferred. Dispatch-time dirt is root
HANDOFF/PROGRESS only; index/product paths are clean. Scratch/21 blocks/six markers, FS-001 and SCOPE
are exact; no completion or rollback event is active.

**2026-07-20T21:20:37+10:00 — P11B/01 implementation authority refinement:** Full no-retry E2E
independently reproduced `tab-duplication.spec.ts:169` receiving two vault operations for manual add.
The P11B page correctly removed raw manual description but had to call existing transaction insert
and alias attach/create hooks separately; UndoCoordinator grouped history, yet two Mirror commits and
server ops remained. Root narrowly authorizes only `src/lib/crdt/description-aliases.ts` and
`src/lib/crdt/context.tsx` to add one named atomic manual transaction action that validates normalized
nonblank alias text, forces empty raw description/no import provenance, inserts and exact-selects or
creates the alias in one internal result/action. Existing integration coverage must prove typed
no-write errors, one Mirror/server op and one undo/redo step. No schema/sync/migration or other P11A
surface is reopened; every other P11B/P11C boundary remains.

**2026-07-20T21:52:11+10:00 — P11B/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `e35109dfe7b02bdb4058445f44d03a6dd678457b` contains 11 authorized paths
from literal BASE `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`. Frozen sole evidence
`evidence/P11B/implementation-01.md` is 239 lines/18,293 bytes at SHA-256
`f70f39969e1d4dcdf961c0ae2174b63fb36b03c5bb1a618c5727a45d9ebf9eb2`. It reports native always-
visible one-click caret input, controlled lazy/no-default autocomplete and grid handoff, exact/new/
single/shared commit planner, exact modal choices/trap/restoration/no blur race, controlled provenance
tooltip, alias-only manual storage and the authorized one-action/manual insert refinement. Focused
component/integration passes 9/9, full Vitest 1,226/1,226, typecheck/build/lint/scoped formatting and
changed E2E 12/12 repeated three times pass. Both full no-retry runs are honestly 85/86 on unchanged
T021c shift-click suite-order state; exact T021c passes 3/3 isolated and every P11B journey passes.
Installed-CLI seeded import/manual/symlink/shared, pointer/keyboard/modal/undo/provenance/privacy/
responsive/dark/reduced-motion/200% and zero-console-error charter passes; harness-only missing local
Realtime secret was corrected without disclosure. Root verified exact HEAD/paths/index,
`diff --check`, evidence hash/size, cleanup and frozen boundaries. Only root HANDOFF/PROGRESS and
frozen evidence are dirty; sole new review output is `reviews/P11B-review-01.md`.

**2026-07-20T22:18:37+10:00 — P11B/01 `reviewing -> passed`:** Independent PASS at unchanged HEAD
`e35109dfe7b02bdb4058445f44d03a6dd678457b`; review is 207 lines/15,686 bytes at SHA-256
`b19ef28c1fdb3fc6e88061631ffe7542b7994ae22040e2e5b9e87bc3bc091a90`. Static and runtime review
proves the native one-click caret control, lazy/no-default autocomplete and grid handoff, exact/new/
single/shared planner, exact modal copy/default/trap/cancel/restoration, controlled provenance
tooltip, alias-only manual persistence and one-action/one-undo/one-server-op manual insert. Focused
component/integration 9/9 repeated three times, full Vitest 1,226/1,226, typecheck/build/lint/scoped
format and changed E2E 12/12 repeated three times without retries pass. Independent full E2E is
honestly 85/86 and isolated T021c 2/3, confirming unchanged R-009 shared-state flakiness rather than
a P11B regression; P13/P21 retain ownership. Seeded installed-CLI pointer/keyboard/modal/management/
undo/provenance/privacy/responsive/dark/reduced-motion charter, exact boundary, cleanup, scratch/21
blocks/six markers, FS-001 and SCOPE pass. No Q proposal. P11B alone may pass; HS-004 remains
unchecked until P11C passes.

**2026-07-20T22:20:09+10:00 — P11C/01 `queued -> implementing`:** P11B/01 PASS artifacts and R-009
transcription are immutable in `0426866fa66cc022efca6d74cd5088d586d3d11b`; that clean HEAD is
P11C's literal BASE/pre-implementation sentinel. Dispatch uses exact new evidence
`evidence/P11C/implementation-01.md` and future review `reviews/P11C-review-01.md`. Authority is
limited to integrated alias surfaces and focused import/virtualized/duplicate-tab paths necessary to
prove management and every imported/manual/exact/new/single/shared/change/remove path after refresh,
one undo/redo, duplicate live tabs and causally concurrent edits. Stable reused alias lookup
structures, bounded virtual rows, active-cell-only combobox/listbox mounting and measured rendered
scale are mandatory; all P11A graph/atomic/persistence/public-boundary gates and P11B caret/keyboard/
modal/provenance/privacy gates must stay green. Schema/migration/sync/transport/dependency/config or
unrelated widening needs prior root authority after concrete reproduction. Dispatch-time dirt is
root HANDOFF/PROGRESS only; index/product/executable/generated paths are clean. Scratch/21 blocks/six
markers, FS-001 and SCOPE are exact; no completion or rollback event is active.

**2026-07-20T23:33:27+10:00 — P11C/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `dd0727f3562d4a9e40669d6d64109174690286a1` contains 15 authorized paths from
literal BASE `0426866fa66cc022efca6d74cd5088d586d3d11b`. Frozen sole evidence
`evidence/P11C/implementation-01.md` is 256 lines/21,694 bytes at SHA-256
`b3f65574606ca0584c03dab3ecba840528fd139b6b521070394d29f56bf1f7c7`. It reports one reusable
collection-identity alias index for final-real IDs, exact Q-016 names, complete reference counts and
active options; zero inactive-row filtering/listboxes; and a virtual range bounded to one additional
focused row. Real named-action/reopen tests prove one local update per action, legal exported reopen
and local-only undo. Four two-peer management/cell conflict matrices converge under Q-017 across
imported/manual/shared/symlink-capable data and 250 unrelated aliases. Domain/component datasets cover
10,000/2,000 aliases; installed CLI created 106 real management aliases and imported 500 rows, then
measured 14–18 mounted rows, 6 ms unique filtering and 1,775 ms row-499 scroll with row-0 focus/caret
retained. Focused 20/20 and strengthened 7/7, full Vitest 1,232/1,232, typecheck/build/lint/scoped
format, alias E2E 15/15 and rendered virtual E2E 3/3 pass without retries. A temporary optional blur-
pin handler caused T014a 86/87 and 0/3 isolated, was causally removed, then T014a passed 3/3 and in the
corrected full suite. Final full no-retry E2E is honestly 86/87 only on unchanged suite-order T021c,
which passes 3/3 isolated and remains R-009/P13/P21. Installed-CLI management/import/manual/shared/
two-tab/offline/undo/privacy/responsive/dark/reduced-motion/200% charter passes with no console errors
or plaintext manual values in four inspected encrypted push bodies. All 502 disposable rows/aliases,
browser data, sessions, processes and generated files were removed; next-env restored. Root verified
exact HEAD/15 paths/index, diff check, evidence hash/size, cleanup and frozen boundaries. Only root
HANDOFF/PROGRESS and frozen evidence are dirty; sole new review output is `reviews/P11C-review-01.md`.

**2026-07-21T00:04:24+10:00 — P11C/01 `reviewing -> changes_requested`:** Independent FAIL at
unchanged HEAD `dd0727f3562d4a9e40669d6d64109174690286a1`; review is 184 lines/14,279 bytes at SHA-256
`4c517fbfaae100ee5ae10addf5a60580e38298075dd2645826214403ce98521b`. Blocking F-01 traces the
actual production callback chain: every Mirror store notification reruns `useDescriptionAliases()`,
whose full `Object.fromEntries` conversion returns a fresh legal collection; that identity forces one
complete lookup rebuild, options rebuild and displayed-row remap even for transaction-only edits.
Repeating N unrelated edits therefore performs N full alias conversions/index builds. The green plain-
prop identity test never mounts VaultProvider/useDescriptionAliases or emits a real unrelated action,
so it cannot prove stable production reuse. Revision 02 must preserve legal collection and lookup
identity without first rescanning/reconverting aliases, retain the public raw-wire exclusion, and add
an actual-context large-graph regression using the real provider/hooks: repeated local transaction
actions plus a remote/import-style notification produce zero conversions/rebuilds and stable identity;
one alias mutation produces exactly one rebuild and correct resolution/options/counts. Independently,
focused P11C 20/20 repeated three times, full Vitest 1,232/1,232, typecheck/build/lint/scoped format,
alias E2E 15/15, virtual scale 3/3 and full no-retry E2E 87/87 pass. Installed-CLI management/history/
reload/manual/lazy/privacy smoke passes; a second CLI page lacked copied session auth, so repeated E2E
retains true two-tab proof. Cleanup, exact range/index, scratch/21 blocks/six markers, FS-001 and SCOPE
pass. No Q proposal. R-008 remains open; all other P11C behavior gates are green and must be retained.
HS-004 remains unchecked.

**2026-07-21T00:05:41+10:00 — P11C/01 failure integration:** Immutable revision-01 evidence/review,
F-01, R-008 transcription and changes-requested state are preserved in
`dd77d518fff81e4c5553ce9a559681ece8f30232`. Revision 02 must retain original cumulative BASE
`0426866fa66cc022efca6d74cd5088d586d3d11b`, close only the stable production selector/index
lifecycle blocker and preserve every independently green integrated behavior gate.

**2026-07-21T00:07:52+10:00 — P11C/02 `changes_requested -> implementing`:** Revision-01 failure
history is immutable; clean pre-implementation HEAD
`8856951cf4d4428b4c15cda814b74a3da81bcbba` includes its artifact link. Cumulative review retains
original BASE `0426866fa66cc022efca6d74cd5088d586d3d11b` and uses exact new artifacts
`evidence/P11C/implementation-02.md` / `reviews/P11C-review-02.md`. Authority is limited to the legal
alias selector/conversion/lookup lifecycle and actual-context tests. Repeated real production local
transaction actions and remote/import-style non-alias notifications over a large graph must cause
zero full alias conversions/index builds and preserve collection/lookup identity without first
rescanning; one alias-bearing notification must cause exactly one conversion/build and correct legal
resolution/options/counts. Raw-wire exclusion, P11A/P11B gates, all revision-01 integrated behavior,
10,000/2,000/500 scale bounds, lazy mounts, virtual focus and the removed T014a blur-pin regression
must remain. Dispatch-time dirt is root HANDOFF/PROGRESS only; index/product/executable/generated
paths are clean. Scratch/21 blocks/six markers, FS-001 and SCOPE are exact; no completion or rollback
event is active.

**2026-07-21T01:08:53+10:00 — P11C/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test HEAD `258f22af06c8a00b00d09f30c33f85f82377bc13` adds two authorized
paths to cumulative BASE `0426866fa66cc022efca6d74cd5088d586d3d11b`; revision-02 diff is 504
insertions/9 deletions. Frozen sole evidence `evidence/P11C/implementation-02.md` is 172 lines/13,015
bytes at SHA-256 `b1327d9cf6cc5b04ecc887fc5b8a545cbe4b5fa8834da709f52111c7c5be8e94`.
The real-provider counterfactual first hung even with one alias because an inline selector plus fresh
collection created a self-sustaining effect loop; later browser validation exposed stale first-alias
publication. Final provider-scoped semantic alias-root revision notification plus lazy stable selector
closes both without exposing raw types. Over 1,000 legal aliases, three local edits, production import-
style insert and an aligned remote transaction-only delta preserve collection/lookup identity at
0 conversion/0 build/0 options recomputation; local rename/Undo/Redo, remote alias create and one
alias-bearing migration each produce exactly 1/1/1 with correct NFC exact lookup, symlink resolution,
500 options and total count. Focused 22/22 passes in three fresh processes; full Vitest 1,234/1,234,
typecheck/build/lint/scoped format, alias E2E 15/15, virtual scale 3/3 and full no-retry E2E 87/87
pass. Installed CLI created 106 aliases and imported 500+1 rows; a true second-tab transaction import
left the active option DOM node identical with zero mutations, while second-tab alias rename produced
exactly one text mutation. Rest/lazy mounts, 1,644 ms row-500 scroll, history/reload, responsive/dark/
reduced-motion/200%, privacy/network and clean console pass. All disposable rows/aliases, browser data,
sessions, processes and generated dirs were removed; next-env restored. Root verified exact HEAD/two
paths/index, diff check, evidence hash/size, cleanup and frozen boundaries. Only root HANDOFF/PROGRESS
and frozen evidence are dirty; sole new review output is `reviews/P11C-review-02.md`.

**2026-07-21T01:29:22+10:00 — P11C/02 `reviewing -> changes_requested`:** Independent cumulative
FAIL at unchanged HEAD `258f22af06c8a00b00d09f30c33f85f82377bc13`; review is 175 lines/13,372
bytes at SHA-256 `429c844eb96ae9a186cec0b6c56b1ff1700eba619c0849a4b42df70a16c5205b`.
Revision 02 correctly filters semantic alias-root events, closes unrelated-notification rebuild churn
while observed and passes continuous local/remote/Undo/Redo/empty-first lifecycle gates. Blocking
F-01 remains at teardown: last-listener unsubscribe removes the document observer while retaining
cached aliases/revision, so alias events during the zero-consumer interval are never recorded and
remount reuses stale data. Independent real two-tab proof cached `After Gap`, navigated tab A to
Accounts, renamed/saved `During Gap` in tab B, then returned tab A by sidebar SPA navigation: it
incorrectly showed `After Gap`; hard reload immediately showed durable `During Gap`. Revision 03 must
eliminate the unobserved window, cover large actual-context unmount/local+remote-mutate/remount and
render-to-subscribe races, publish exactly one current rebuild, retain non-alias 0/0/0 and prove no
document-subscription leak after provider/doc disposal. Focused 22/22 repeats three times, full Vitest
1,234/1,234, typecheck/build/lint/scoped format, alias E2E 15/15, virtual scale 3/3 and full no-retry
E2E 87/87 pass independently. CLI cleanup, exact range/index, scratch/21 blocks/six markers, FS-001
and SCOPE pass. No Q proposal. R-008 remains open; every other cumulative P11C gate remains green.
HS-004 remains unchecked.

**2026-07-21T01:30:57+10:00 — P11C/02 failure integration:** Immutable revision-02 evidence/review,
F-01, R-008 transcription and changes-requested state are preserved in
`29d943757bae8147f3b66559d63c12afcd0e5362`. Revision 03 must retain original cumulative BASE
`0426866fa66cc022efca6d74cd5088d586d3d11b`, close only the unobserved zero-consumer/setup window
and preserve revision-02 zero-work non-alias behavior plus every independently green cumulative gate.

**2026-07-21T01:32:11+10:00 — P11C/03 `changes_requested -> implementing`:** Revisions 01–02 and
their failed reviews are immutable; clean pre-implementation HEAD
`2540969134f002330ad505836bdd92d01eb56308` includes the revision-02 artifact link. Cumulative review
retains original BASE `0426866fa66cc022efca6d74cd5088d586d3d11b` and uses exact new artifacts
`evidence/P11C/implementation-03.md` / `reviews/P11C-review-03.md`. Authority is limited to context
observer lifetime and the actual-provider lifecycle test. Revision 03 must eliminate the zero-
consumer and render-to-subscribe missed-event windows, prove first remounted UI is current after local
and remote alias mutations, and release every observer on provider/doc disposal without leaks or
duplicate callbacks. It must retain revision-02 local/remote non-alias 0/0/0, alias 1/1/1, empty-first
insertion, public raw isolation and every cumulative behavior/concurrency/privacy/scale/E2E gate.
Dispatch-time dirt is root HANDOFF/PROGRESS only; index/product/executable/generated paths are clean.
Scratch/21 blocks/six markers, FS-001 and SCOPE are exact; no completion or rollback event is active.

**2026-07-21T02:11:17+10:00 — P11C/03 `implementing -> ready_for_review -> reviewing`:** Exact
revision-03 product/test HEAD `daab038ee741faa9f92a373b27efe0c8fe8940db` adds two authorized paths
to cumulative BASE `0426866fa66cc022efca6d74cd5088d586d3d11b`; revision-03 diff is 398
insertions/14 deletions. Frozen sole evidence `evidence/P11C/implementation-03.md` is 189 lines/14,523
bytes at SHA-256 `264c6b104391998e05a7481468c823af857eed2446f8ea7d4eade630f4b59770`.
Pre-fix actual-provider tests captured three deterministic reds: stale large collection/lookup/options
after a local zero-consumer alias gap, a lost render-to-subscribe alias rename, and task observer
release at first all-consumer unmount. Final provider-lifetime semantic observer plus frontier/diff
setup reconciliation closes them. Four consumer off/on churns retain subscribed/active/released
2/2/0; document replacement releases exactly one old task observer and installs exactly one new;
final unmount releases it, and late updates cause no callback or lifecycle work. Local and subscribed
remote transaction-only gaps remain 0/0/0 and reuse identical collection; local/remote alias gap
remounts are exactly 1/1/1; setup injection totals one initial plus one exact alias rebuild. Focused
25/25 passes in three fresh processes; full Vitest 1,237/1,237, typecheck/build/lint/scoped format,
alias E2E 15/15, virtual scale 3/3 and full no-retry E2E 87/87 pass. Installed CLI exact two-tab SPA
gap shows only current `During Gap` on first committed remount with no stale intermediate. At 100
aliases/500+1 rows, peer transaction import keeps exact option DOM identity with zero mutations and
peer alias rename produces exactly one mutation; virtual focus/caret, history/reload, responsive/dark/
reduced-motion/200%, console/network and privacy sentinel across 7 HTTP bodies/49 WS frames pass.
All 501 transactions/101 aliases, browser data, sessions, processes and generated dirs were removed;
next-env restored. Root verified exact HEAD/two paths/index, cumulative diff check, evidence hash/size,
cleanup and frozen boundaries. Only root HANDOFF/PROGRESS and frozen evidence are dirty; sole new review
output is `reviews/P11C-review-03.md`.

**2026-07-21T02:33:03+10:00 — P11C/03 `reviewing -> passed`; artifact integration pending:**
Independent cumulative PASS at unchanged product/test HEAD
`daab038ee741faa9f92a373b27efe0c8fe8940db`; review
`reviews/P11C-review-03.md` is 175 lines/13,996 bytes at SHA-256
`c8cab25c854bdce25535fc0af5c3f2e0e491dd44e25f0c8c9b457a3bd04fcaaf`. No High/Medium
finding and no Q proposal remain. Both immutable F-01 lifecycle failures are closed: the
provider/document-lifetime semantic observer and frontier reconciliation preserve non-alias 0/0/0,
publish alias local/remote/Undo/Redo/remount work exactly 1/1/1, close the zero-consumer and setup
windows, and release exactly on document replacement/final disposal with no late callback. Focused
25/25 passes in three processes, full Vitest 1,237/1,237, typecheck/build/lint/scoped format, alias
E2E 15/15, virtual scale 3/3 and full no-retry E2E 87/87 pass independently. The exact two-tab SPA
gap first commits only current `During Gap`; responsive/dark/reduced-motion/200%, accessibility,
privacy, console/network and cleanup pass. Scratch remains `c2b986fd...` with the exact six authorized
markers and 21 normalized blocks; FS-001 and SCOPE remain immutable. R-008 is closed for P11C but
stays open for P16D/P21. Persist the exact evidence/review and this state in a root integration-control
commit, link that commit durably, then execute HS-004's root-only completion-pending/marker protocol.

**2026-07-22T15:35:25+10:00 — P11C/03 artifact integration; HS-004 `queued ->
completion_pending`:** Exact P11C/03 evidence/review, independent PASS state and R-008 transcription
are immutable in integration-control commit `78e2f978f8d258d8c4d379f53e75089a2ce975db`; unchanged
reviewed product/test HEAD is `daab038ee741faa9f92a373b27efe0c8fe8940db`. P11A/04, P11B/01 and
P11C/03 are all passed. Root authorizes only HS-004's first-line `[] -> [x]` marker from exact
pre-change scratch SHA `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`,
mapped to immutable `reviews/P11A-review-04.md`, `reviews/P11B-review-01.md` and
`reviews/P11C-review-03.md`. The checked set remains HS-002/HS-006/HS-010/HS-014/HS-017/HS-018
until finalization; all 21 normalized blocks, FS-001 and SCOPE are exact. No package dispatch is
legal while this event is pending. Root must take a private comparison copy, apply only the HS-004
marker, require a one-line diff, remove the copy, revalidate every frozen boundary, then atomically
record before/after SHAs, add HS-004 to the authorized checked set and set the requirement passed.

**2026-07-22T15:36:53+10:00 — HS-004 `completion_pending -> passed`:** Root changed exactly the
HS-004 leading marker `[] -> [x]` after immutable reviews `reviews/P11A-review-04.md`,
`reviews/P11B-review-01.md` and `reviews/P11C-review-03.md`; mapped integrations are
`959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`, `0426866fa66cc022efca6d74cd5088d586d3d11b`
and `78e2f978f8d258d8c4d379f53e75089a2ce975db`. A private `mktemp` comparison proved the sole
one-line marker diff and was removed. All 21 normalized blocks byte-match SCOPE; the exact authorized
checked set is HS-002/HS-004/HS-006/HS-010/HS-014/HS-017/HS-018. Scratch SHA advances contiguously
from `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae` to
`2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines/24,246 bytes.
FS-001 remains exact at `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`,
715 lines/25,441 bytes; SCOPE remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
450 lines/27,382 bytes. The active completion event is cleared and normal dispatch may resume.

**2026-07-22T15:39:43+10:00 — P12/01 `queued -> implementing`:** P09/02 and P11A–C are passed;
HS-004's marker transaction is finalized and P12 is the next dependency-ready package. Clean literal
BASE/pre-implementation HEAD is `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`; sole implementer
artifact is `evidence/P12/implementation-01.md` and future immutable review is
`reviews/P12-review-01.md`. Authority is limited to one pure resumable bounded maintenance layer,
provider/document RAF lifetime wiring, narrowly shared bucket/alias primitives and focused P12 tests.
Acceptance requires correct reads before GC; adjacent equal year/month/day merge with exact transaction
conservation/order under concurrent edits; direct parent/nested symlink rewrites; fresh proof before
the narrow symlink hard-delete exception; explicit `system:gc` excluded from Undo but included in
encrypted persistence/sync; exact per-frame item/time bounds; hidden pause/visible resume when
truthfully available; cancellation, idempotence, convergence and no self-loop/no-op churn. Fake-RAF,
property/integration, repeated no-retry journey, full validation and installed-CLI performance/UX/
privacy evidence are mandatory. No ambiguity pauses work; any unresolved budget/concurrency choice is
a complete Q proposal using the PROCESS hierarchy. Dispatch-time dirt is root-owned HANDOFF/PROGRESS
only; index/product/executable/generated paths are clean. Scratch is exact at `2c52bd78...` with the
seven authorized markers and 21 normalized blocks; FS-001/SCOPE are exact; no completion or rollback
event is active.

**2026-07-22T16:47:18+10:00 — P12/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `f9edda60afc946ddda927616a16435a075167d7c` commits seven authorized paths,
1,798 insertions/3 deletions, from literal BASE `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`.
Frozen sole evidence `evidence/P12/implementation-01.md` is 256 lines/19,209 bytes at SHA-256
`f67fec9718efadcd1bf7d3f8036b29afab68d5a618985f899ec328511ea2d452`. Counterfactuals include the
absent maintenance module, missing bucket CIDs, a Mirror cross-list commit fault, minimized concurrent
same-ID copy convergence failures and two real browser lifecycle failures; final design uses a
32-item/4ms resumable scheduler, copy/prove/remove structural phases, apply-time revalidation,
direct one-hop alias rewrites/full deletion proof, `system:gc`, and a provider-session changed-alias
barrier. Worker reports focused unit 7/7, integration 3/3, full Vitest 1,247/1,247, typecheck, lint
zero errors/10 known warnings, scoped format, affected no-retry repeat 12/12 and explicit full
no-retry E2E 87/87. Corrected installed-CLI evidence records real role/name/state, editing/history,
scroll/navigation/reload, visible duplicate tab, offline/reconnect, mobile/media/zoom and console/
network; it truthfully records all pages visible, a light surface under dark preference and 320/556
document zoom overflow. Root verified exact HEAD/seven paths/index, evidence hash/size, no generated
or task process, next-env clean, scratch SHA/seven markers/21 blocks and immutable FS-001/SCOPE. No Q
proposal. New review output is exactly `reviews/P12-review-01.md`; reviewer must independently test
correct-during-copy visibility, the session barrier, bounds/convergence/hard-delete/history/sync and
adjudicate both manual findings rather than accepting final state alone.

**2026-07-22T17:25:05+10:00 — P12/01 `reviewing -> changes_requested`:** Independent immutable
review `reviews/P12-review-01.md` is 259 lines/19,663 bytes at SHA-256
`15ea3267d1fa9c425bacf3cbb95ce4f371bd48114e10fdda8c9e02859175fb77` and returns FAIL over exact
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..f9edda60afc946ddda927616a16435a075167d7c`.
F-01 High proves the separate copy/remove commits expose duplicate logical IDs through real queries;
an intervening edit can preserve divergence, delete can resurrect the source and move can leave one
ID at two dates. F-02 High proves the append-only provider-session alias blacklist makes ordinary
change-all garbage wait for remount instead of active collection. F-03 High proves 32/4ms excludes
planning, recursive copy/apply and full proof scans, while repeated first-phase invalidation can
starve every later phase. F-04 Medium reproduces the new 256-conflict fixture as FAIL/PASS/FAIL in
three focused processes and again FAIL/PASS/FAIL in isolation because it assumes peer tie order.
Independent full Vitest was 1,247/1,247 and lint/typecheck/build/scoped format, targeted no-retry E2E
12/12 and full no-retry E2E 87/87 passed; these successes do not cover the four blockers. The real
installed-CLI charter passed lifecycle/history/sync/privacy and cleaned its data/processes; dark and
200% zoom findings are inherited P20A/P20B ownership. Review proposal P12-01-01 is transcribed as
Q-018: select Option A, a finite per-alias live Undo/Redo history-reachability barrier that requeues
within the same provider when history clears or trims. HS-005 stays unchecked and changes_requested;
revision-01 evidence/review remain immutable and cumulative revision 02 must close all four findings.
Failure evidence, review, Q-018, risk routing and the exact changes-requested state are durably
integrated by `d339972ec3ce5d26276fae511c82418cc8e436cb`; later revisions must never overwrite them.

**2026-07-22T17:27:52+10:00 — P12/02 `changes_requested -> implementing`:** Revision-01 failure
control is immutable at `d339972ec3ce5d26276fae511c82418cc8e436cb` and its link-only ledger
commit leaves clean preimplementation HEAD `b21ef639fb24020978cb39c2b69b83d6ff261ebb`. Cumulative review
BASE remains the original `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`; revision-02's sole
worker artifact is `evidence/P12/implementation-02.md` and future independent review is exactly
`reviews/P12-review-02.md`. Authority narrowly covers maintenance/context/alias/query/mutation/Undo
CRDT code and focused corresponding unit/integration tests. F-01 requires correct subscribed query,
UI identity and mutation semantics after every maintenance commit, including edit/delete/move and
same-ID peer cases. F-02 applies Q-018's finite per-alias history reachability and same-provider
requeue. F-03 requires cooperatively bounded discovery/plan/copy/apply/proof units plus fair phase
progress under sustained edits. F-04 requires a defined peer-tie invariant and three clean focused
and isolated processes. Full automation, installed-CLI manual validation, cleanup, frozen hashes and
all cumulative P12 gates remain mandatory. The implementer may commit only exact authorized product/
test paths and must leave the sole evidence uncommitted; the reviewer remains undispatched.

**2026-07-22T18:01:29+10:00 — P12/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test HEAD `e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e` commits eight authorized
paths, 792 insertions/173 deletions, from preimplementation HEAD `b21ef639fb24020978cb39c2b69b83d6ff261ebb`;
cumulative review remains original BASE `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Frozen sole evidence
`evidence/P12/implementation-02.md` is 166 lines/11,337 bytes at SHA-256
`7ed3e646ec39a75ab11650fbdc17498c94f27aa2c1d5208970eb79ea2a451574`. F-01 remediation
deduplicates physical copies at production read boundaries, mutates every copy for edit/delete/move/
alias actions and defines date/creation/import/ID total ordering; tests subscribe after every GC
commit and exercise intervening actions and both peer orders. F-02 mirrors per-alias live Undo/Redo
reachability across push/pop/trim/clear/invalidation/disposal, requeuing same-provider maintenance
when the frontier clears. F-03 adds before/after discovery/apply clock checks, persistent rescan and
fair progress under continuous edits, but evidence explicitly asks review to adjudicate whether one
arbitrarily large transaction-sized synchronous unit satisfies the frozen bound. F-04 defines the ID
tie-breaker and the five-file profile passes 32/32 in three clean processes. Full Vitest is
1,253/1,253; typecheck/build pass; lint is zero errors/10 known warnings; scoped format is clean.
The final-code full no-retry browser run is 86/87: the unrelated shift-click selection journey
observed 2 instead of 3 selected and reproduced PASS/FAIL/FAIL in isolation; an earlier pre-final
run was 87/87 and affected journeys previously passed 12/12, so the reviewer must independently
reproduce and attribute it rather than treat the gate as green. Installed-CLI change-all, Undo,
Redo, reload and same-provider collection passed with masked recovery material. Root verified exact
HEAD/paths, empty index, evidence hash/size, restored next-env, no generated/task process and exact
scratch/FS-001/SCOPE hashes. New review output is exactly `reviews/P12-review-02.md`; reviewer alone
adjudicates every cumulative acceptance gate and writes one explicit PASS/FAIL.

**2026-07-22T18:25:55+10:00 — P12/02 `reviewing -> changes_requested`:** Independent cumulative
review `reviews/P12-review-02.md` is 223 lines/19,850 bytes at SHA-256
`91fb0949549ffe2481f5109bf98808d07304bee97710ac244a0d2366cd79738b` and returns FAIL over exact
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`.
Revision-01 F-02 and F-04 are closed; F-01 and F-03 are only partially closed. New F-01 High proves
`unnestDuplicate` and `swapDuplicate` mutate only one physical parent in the copy/remove interval,
leaving divergent parent graphs and nested/standalone duplicates. F-02 Medium proves exported find,
find-by-ID and date-range reads still select/append raw physical copies and can expose stale,
duplicated or materialization-dependent data. F-03 High confirms before/after clock checks merely
observe arbitrarily large recursive transaction copy/equality, structural/vault proof, alias scan and
CRDT mutation overruns after they monopolize a callback. Revision 03 must make nested duplicate
operations physical-copy complete, canonicalize every public read and cursor within expensive work or
enforce a proven finite payload bound. Independent automation is fully green: focused 32/32 in three
processes, isolated conflict fixture 3/3, full Vitest 1,253/1,253, lint/typecheck/build/scoped format,
affected no-retry E2E 12/12, full no-retry E2E 87/87 and isolated shift-click 3/3. Manual change-all,
Undo/Redo, inherited duplicate tab, offline/reconnect/reload, same-provider collection, sync/privacy
and cleanup pass; dark/zoom remain inherited P20A/P20B findings. HEAD is unchanged, index empty,
next-env/generated state restored and port 3000 closed. HS-005 remains unchecked and revision-02
artifacts are immutable once the failure-control commit lands; no new question proposal was required.
Revision-02 evidence, review, risks and changes-requested state are durably integrated by
`7533fd76219a08b5e1c1aa5f66b9b85419b6275b`; later revisions must preserve them byte-for-byte.

**2026-07-22T18:29:45+10:00 — P12/03 `changes_requested -> implementing`:** Revision-02 failure
control is immutable at `7533fd76219a08b5e1c1aa5f66b9b85419b6275b` and its link-only ledger
commit leaves clean preimplementation HEAD `b2c32a40e0aca052771c45d086180522e040e5f4`. Cumulative review
BASE remains `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`; sole worker artifact is
`evidence/P12/implementation-03.md` and future review is `reviews/P12-review-03.md`. Narrow authority
covers maintenance, alias proof, transaction queries/mutations, optional Mirror support only for
container-preserving bounded relocation, and four focused unit/integration test files. F-01 requires
unnest/swap across every physical parent with deterministic pre-divergence handling, both peer orders
and a clean final graph. F-02 requires canonical find/find-by-ID/date-range semantics plus an audit of
all exported reads and the import caller. F-03 requires cursors inside recursive copy/equality,
structural/vault/alias proof and apply work, or a complete backward-compatible repository-wide payload
bound; clock checks after an indivisible overrun are forbidden. Oversized inner-work instrumentation,
three clean focused processes, full validation/no-retry browser/manual evidence and exact cleanup are
mandatory. Closed Undo frontier, same-provider collection, fairness, tie ordering, principal reads/
mutations, sync/lifecycle and all frozen boundaries must remain green. The implementer commits only
exact authorized product/test paths, leaves evidence uncommitted and makes no PASS claim; reviewer is
not dispatched until root freezes the exact new HEAD.

**2026-07-22T19:14:31+10:00 — P12/03 `implementing -> ready_for_review -> reviewing`:** Exact
revision-03 HEAD `058098dc74833523bc4a05094b164af5635f327f` contains interim conflict reconciliation
`7e1fb5d1145cbf363751c4f7bc7748844b0fd104` plus strict work-bound continuation
`058098dc74833523bc4a05094b164af5635f327f`, changing seven authorized product/test paths from
preimplementation `b2c32a40e0aca052771c45d086180522e040e5f4`. Cumulative review remains original BASE
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Frozen evidence
`evidence/P12/implementation-03.md` is 139 lines/8,688 bytes at SHA-256
`540a3e497d3d33f4d82be5925d588e31b9ce37d030d43e88d3e412f6a38a33ce`. All-copy unnest/swap
deterministically reconciles diverged parents and standalone/promoted identities; all exported find/
find-by-ID/date-range reads share canonical value/location/order semantics. Maintenance now discovers
root/account/alias/transaction/structural work through persistent generators; builds detached clones
in at-most-eight dynamic-item chunks; attaches the completed clone and removes the exact source in one
`system:gc` commit after fixed-depth position/state validation; prunes fixed-depth containers; and
proves alias deletion through a persistent one-reference-per-step graph cursor with exact-key constant-
work apply. Oversized tests cover 128 tags, 128 allocations, 64 nested duplicates and 128 transaction/
128 alias graphs over more than 20/256 steps. Reviewer must independently determine that final detached-
tree attach does not recursively redo unbounded work, invalidation cannot admit stale proof/partial
state, and every all-copy/query edge converges. Three focused processes pass 4 files/85 tests each;
full Vitest 1,258/1,258, typecheck, build, lint zero errors/10 warnings, scoped format/diff, and full
no-retry E2E 87/87 pass. Installed-CLI real change-all/Undo/Redo/reload/same-provider collection passes
with masked recovery material; initial missing-secret server failure is honestly disclosed and corrected
without secret output. Root verifies exact HEAD/seven paths/empty index, evidence hash/size, no process/
generated state, restored next-env and exact scratch/FS-001/SCOPE hashes. Review output is exactly
`reviews/P12-review-03.md`; implementer authority is closed and reviewer alone writes one PASS/FAIL.

**2026-07-22T19:40:54+10:00 — P12/03 `reviewing -> changes_requested`:** Independent cumulative
review `reviews/P12-review-03.md` is 223 lines/20,332 bytes at SHA-256
`3d68ffd573feff3e42d2b56d4be9d4626a3c4317c7bbda1079846127d20098ec` and returns FAIL over exact
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..058098dc74833523bc4a05094b164af5635f327f`.
F-01 High verifies against official Loro 1.13.7 source that final `pushContainer(job.root)` recursively
attaches/re-emits the whole detached transaction tree in one callback, so bounded preparation still
ends in an arbitrarily large apply. F-02 Medium proves multi-account `queryTransactions` and unscoped
duplicate reads concatenate per-account physical results without global logical-ID canonicalization.
F-03 Medium finds the new unnest/swap regressions are plain-object fixtures and do not supply the
mandated subscribed real-Loro relocation-interval/both-delivery-order convergence evidence. Focused
85/85 x3, full Vitest 1,258/1,258, type/lint/build/scoped format and affected E2E 12/12 pass; full
E2E is 86/87 only on inherited T021c and isolated T021c passes 3/3. Manual ordinary history,
same-provider collection, two-tab/offline/sync/privacy passes. Repo format retains only disclosed
frozen/root-ledger reds. HEAD/index/generated/browser/data/process/port cleanup and exact scratch/
FS-001/SCOPE hashes pass. HS-005 remains unchecked; revision 04 must close all three blockers.
Revision-03 evidence, review, risks and changes-requested state are durably integrated by
`86d39c19a5c5223a729c2f296cd8de9ea60a3c91`; later revisions preserve them byte-for-byte.

**2026-07-22T19:43:08+10:00 — P12/04 `changes_requested -> implementing`:** Revision-03 failure
control is immutable at `86d39c19a5c5223a729c2f296cd8de9ea60a3c91`; clean preimplementation HEAD
is `14259b5f6d02f566e32ac94ab4d63c20b5ef0353`, while cumulative review BASE remains
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Sole evidence is
`evidence/P12/implementation-04.md`; future review is `reviews/P12-review-04.md`. F-01 should replace
recursive detached-tree attachment with bounded in-document shadow construction invisible to every
public read/mutation, safely invalidated/discarded on edits and atomically revealed with source removal
only after complete fresh validation; official Loro cost, crash/reload, Undo/sync and orphan cleanup
must be proven. F-02 globally canonicalizes multi-account/unscoped results. F-03 uses subscribed real
Loro and both peer delivery orders for unnest/swap during the interval. Full cumulative automation,
no-retry E2E, installed-CLI manual evidence, cleanup and frozen checks remain mandatory. Reviewer is
undispatched; implementer writes only the exact new evidence and authorized product/test paths.

**2026-07-22T21:00:16+10:00 — P12/04 `implementing -> ready_for_review -> reviewing`:** Exact
HEAD `2489c41335ad2292f9005403c18022c46915507b` commits seven authorized paths, 1,290 insertions/
173 deletions, from preimplementation `14259b5f6d02f566e32ac94ab4d63c20b5ef0353`; cumulative review
remains original BASE `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Frozen evidence
`evidence/P12/implementation-04.md` is 207 lines/14,537 bytes at SHA-256
`8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`. The implementation replaces
detached recursive final attachment with bounded attached private shadows controlled by a low-level
synced Loro root outside public Mirror defaults; public reads/mutations filter shadows, relevant local/
remote edits invalidate them, and fixed-work completion reveals target/removes source. Global multi-
account queries canonicalize IDs. Subscribed real-Loro both-order unnest/swap, local invalidation,
crash/reload, remote classification/convergence/private visibility/no-echo tests pass. An initial public-
Mirror metadata design caused all affected onboarding E2E to fail with `Map value must be an object`;
the worker moved metadata low-level and reran gates. Final focused profile passes 4 files/91 tests in
three processes; full Vitest 1,264/1,264, type/lint/build/scoped format/diff pass; affected E2E 12/12;
full E2E 86/87 only on inherited T021c followed by three clean isolated passes. Installed CLI covers
settings/presence/Saved, change-all/history/reload/alias collection, offline reconnect, responsive/
dark/reduced/200%; duplicate tab required phrase unlock and was closed without secret re-entry. Root
verifies exact HEAD/paths/index, evidence hash/size, stopped browser/server, recoverable-trash generated
cleanup, restored next-env and exact frozen hashes. Review output is only `reviews/P12-review-04.md`.

**2026-07-22T22:05:00+10:00 — P12/04 `reviewing -> changes_requested`:** Independent cumulative
review `reviews/P12-review-04.md` is 236 lines/23,016 bytes at SHA-256
`0a97f910124dfbde35243a1d736337dc14179709108f2cb4c5df3d89cefcce49` and returns FAIL. Recursive
attach boundedness and global queries close. Four blockers remain: incomplete nested shadow children
leak through lookups; mixed maintenance/user imports bypass invalidation and can stale-reveal; unnest/
swap updates are not exchanged or physically compared; maintenance metadata persists in public Mirror.
All automation including full E2E 87/87 and T021c 3/3, manual and cleanup pass. HS-005 stays unchecked.

**2026-07-24 — P12/05 authority expansion:** Final worker audit after interim commit
`cfeb4dae13f9eff855a1b95feb14d9c06adda016` reproduces a malformed/legacy private parent whose
real-ID incomplete nested child leaks through raw `useTransaction`. Because review-04 explicitly names
that context hook and the original revision-05 path list omitted `context.tsx`, root authorizes exactly
`src/lib/crdt/context.tsx` plus one focused hook regression. Galileo continues the same revision and
must commit the correction, update `evidence/P12/implementation-05.md`, rerun affected gates and clean
the boundary before review. No other scope, prior artifact or frozen-source authority changes.

**2026-07-24 — P12/05 `implementing -> ready_for_review -> reviewing`:** Corrected final HEAD
`865a78774cee84a3ed4c2686422579af94d368b5` preserves interim `cfeb4dae...` and adds the authorized
raw-hook fix. Frozen evidence is 171 lines/11,731 bytes at SHA-256
`146a1cc4df55e5aa1bbfab922861ed069e7c5a7f55585f4a8f852d7cb6794ba5`. Revision-05 changes seven
authorized paths. The hook regression is red on `incomplete shadow` and green on `complete source`;
focused tests pass 96/96 in three processes, full Vitest 1,269/1,269, type/lint/build/scoped format,
affected E2E 12/12 and full no-retry E2E 87/87 pass. Root verifies exact HEAD/index, evidence hash/
size, no generated/process state, restored next-env and exact scratch/FS-001/SCOPE hashes. Reviewer
alone writes `reviews/P12-review-05.md` over the cumulative original BASE..HEAD range.

**2026-07-24 — P12/05 `reviewing -> changes_requested`:** Independent cumulative review
`reviews/P12-review-05.md` is 196 lines/14,376 bytes at SHA-256
`a54ea0b726d157fabab1b3d59a3f2ca84391cfc9ff0560b48a20e08296e8326a` and returns FAIL. Review-04
F-01 through F-03 close; F-04 closes for new generation/startup. F-05 High proves disposed scheduler
authority survives per document, so a same-doc remount can trust a partial shadow after equal-cardinality
tag/allocation edits, reveal stale collection and delete the edited source. F-06 Medium proves late
legacy metadata-only live sync bypasses alias-projection-gated cleanup and can reintroduce the reserved
account through raw `useTransactions`. Automated/manual gates are green; HEAD/index/cleanup/frozen
boundaries pass. HS-005 remains unchecked and revision 06 must close both lifecycle races.

**2026-07-24 — P12/06 `changes_requested -> implementing`:** Revision-05 failure is immutable at
`2f39bf17e64526b63376590f2f72e730a504472e`; clean preimplementation HEAD is
`a98b3b00a6858b40398531204633832790d59c5f`, cumulative BASE remains `0a9b8827...`, sole evidence is
`evidence/P12/implementation-06.md` and future review is `reviews/P12-review-06.md`. Authority is
narrowly scheduler/context lifecycle plus focused maintenance/context integration tests. Disposal must
revoke all trust generations; equal-cardinality value edits must stale the shadow; late legacy metadata-
only sync must independently trigger bounded cleanup and stay hidden from raw hooks. All cumulative
automation/manual/cleanup/frozen gates remain mandatory; reviewer is undispatched.

**2026-07-24 — P12/06 `implementing -> ready_for_review -> reviewing`:** Final HEAD
`9939d68cb6752f174c2fc60e4e815c7af52dd0d7` contains commits `8c83dd7`/`9939d68` across exactly
context, maintenance and vault-maintenance integration tests. Evidence is 191 lines/12,326 bytes at
SHA-256 `08ca7c17f64371f1f6c06ef1b8593cee035477f5b8a8dfb09431ec40b59a177c`. Four dispose/edit/remount
counterexamples pass; late marker-only and marker-plus-domain imports stay hidden, receive one bounded
cleanup update and do not resurrect. Focused 102/102 x3, full Vitest 1,275/1,275, type/lint/build/
scoped format, affected E2E 12/12 and full no-retry E2E 87/87 pass. Root verifies exact HEAD/paths/
index, evidence hash/size, no generated/process state and exact frozen boundaries. Reviewer alone writes
`reviews/P12-review-06.md` over cumulative original BASE..HEAD.

**2026-07-24 — P12/06 `reviewing -> changes_requested`:** Independent review
`reviews/P12-review-06.md` is 165 lines/11,879 bytes at SHA-256
`a6182d430b761fd57c0ebd5ce08045811e952979303ab59b74afa885d8a8693e` and returns FAIL. F-05 closes;
F-06 cleanup and `useTransactions` close. F-07 Medium proves generic exported
`useVaultSelector(state => state.transactions)` still forwards raw reserved state to People/Statuses/
Tags tables before the next visible cleanup frame. All automated/manual gates pass. HS-005 stays unchecked.

**2026-07-24 — P12/07 `changes_requested -> implementing`:** Revision-06 failure is immutable at
`150f17bf3a08ff911792db251d352e889e632d96`; clean preimplementation HEAD is `bebf4f546...` and
cumulative BASE remains `0a9b8827...`. Authority is narrowly `context.tsx` plus focused actual-context/
consumer regression tests. Generic `useVaultSelector` must sanitize transaction state before selectors
for People/Statuses/Tags or arbitrary callers run, in the same notification before cleanup, while
preserving unrelated state identity/subscription behavior. Evidence/review paths are revisioned 07;
all cumulative gates remain mandatory and reviewer is undispatched.

**2026-07-24T18:01:25+10:00 — P12/07 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `ebe2fb6caf70acbdb88245cf3121f8c6356b1162` changes only
`src/lib/crdt/context.tsx` and `tests/integration/vault-maintenance.test.tsx` from clean
preimplementation HEAD `bebf4f546c8a7715934adbafd757dfdcd27dec91`. Frozen evidence
`evidence/P12/implementation-07.md` is 196 lines/13,005 bytes at SHA-256
`f2bb54706d9f1c69b31573d6c3f9be3175043e63cb7a810f00d5917dc64c7a22`. Generic caller selectors
receive sanitized transaction state before execution while unrelated state identity is retained.
Reported green: focused 105/105 in three clean processes, full Vitest 1,278/1,278, typecheck, lint,
build, affected no-retry E2E 15/15, full no-retry E2E 87/87 and the authenticated/offline/two-tab/
responsive manual charter. Root verifies exact HEAD, two-path committed range, empty index, cleanup,
restored generated state, scratch SHA `2c52bd78...`, exact 21 normalized blocks and authorized checked
set, canonical FS-001 and SCOPE hashes. Independent review alone writes
`reviews/P12-review-07.md` over cumulative original BASE..HEAD; HS-005 remains unchecked.

**2026-07-24 — P12/07 `reviewing -> changes_requested`:** Independent cumulative review
`reviews/P12-review-07.md` is 209 lines/21,524 bytes at SHA-256
`2efb05fe259074868b4e2852550f9fcd8caf8ec654f1d1eb926e038f11d14ad5` and returns FAIL. The
selector portion of revision-06 F-07 closes across direct/whole-state/spread/descriptor/reserved-key
shapes and People/Statuses/Tags in the same pre-cleanup notification. F-08 High finds that the chosen
projection synchronously traverses the whole vault on a new transaction snapshot outside RAF
item/time budgets. F-09 Medium finds that exported generic `useVaultAction` still passes raw private
transaction state to callbacks. Independent focused 105/105 x3, full Vitest 1,278/1,278,
type/lint/build, affected no-retry E2E 15/15, full no-retry E2E 87/87 and the manual charter pass.
Root verifies exact HEAD/index/write boundary, cleans recoverable generated output, and retains exact
frozen hashes. No Q proposal; HS-005 remains unchecked and revision 08 must close F-08/F-09.
Immutable evidence, review and failure control state are committed as
`0216abbf76d40b07461af2bad94869fd3040c4fa`.

**2026-07-24 — P12/08 `changes_requested -> implementing`:** Revision-07 failure is immutable at
`0216abbf76d40b07461af2bad94869fd3040c4fa`; clean preimplementation HEAD is
`a5570e3d805cbb65af3f4cf5cead554fef279bce`, while cumulative BASE remains
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Sole evidence is
`evidence/P12/implementation-08.md`; future review is `reviews/P12-review-08.md`. Authority is
exactly `src/lib/crdt/context.tsx` plus focused `tests/integration/vault-maintenance.test.tsx`.
F-08 requires measured path-lazy/incremental or otherwise bounded public selector work that never
visits unrelated vault trees or moves unbounded work outside RAF budgets. F-09 requires every generic
application-state action callback to be unable to observe reserved/private transaction state before
cleanup while preserving legitimate mutation, Undo origin and one cleanup update. Same-notification
selector privacy and all cumulative gates remain mandatory; reviewer is undispatched and HS-005
remains unchecked.

**2026-07-24T18:54:27+10:00 — P12/08 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `a2a31839f6bb57855fa60b8cfcc06feed069cafa` changes only
`src/lib/crdt/context.tsx` and `tests/integration/vault-maintenance.test.tsx` from clean
preimplementation HEAD `a5570e3d805cbb65af3f4cf5cead554fef279bce`. Frozen evidence
`evidence/P12/implementation-08.md` is 202 lines/13,758 bytes at SHA-256
`c3d0753c48884fea4d15a93b3570301ea3c69f071ab02d1a831daa9a4ce50900`. A cached path-lazy proxy
membrane hides reserved/private transaction state for selectors and generic actions while avoiding
unrelated account/year/month/day/transaction/nested visits and retaining write-through domain
mutation/Undo behavior. Reported green: focused 107/107 in three clean processes, full Vitest
1,280/1,280, typecheck, lint, build, affected no-retry E2E 15/15, full no-retry E2E 87/87 and the
authenticated/offline/two-tab/responsive manual charter. Root verifies exact HEAD, two-path committed
range, empty index, cleanup, restored generated state, exact 21 normalized blocks/authorized checked
set and canonical scratch/FS-001/SCOPE hashes. Independent review alone writes
`reviews/P12-review-08.md` over cumulative original BASE..HEAD; HS-005 remains unchecked.

**2026-07-24 — P12/08 `reviewing -> passed`; artifact integration pending:** Independent cumulative
review `reviews/P12-review-08.md` is 154 lines/19,113 bytes at SHA-256
`6d46633271fbfcfcdcf573e62c4a0350d06b315faf7bf43ac006be379abedf85` and returns PASS over exact
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..a2a31839f6bb57855fa60b8cfcc06feed069cafa`.
F-08 closes because the cached membrane projects only explicitly requested paths; a 24-account
real-provider fixture records zero unrelated parent/nested classifier visits before and after an
ordinary update. F-09 closes because generic selector/action/edit callbacks all receive the runtime
public membrane; direct/enumeration/descriptor/nested reads stay clean while public writes persist,
one `system:gc` cleanup occurs and Undo reverts only user work. Independent focused 107/107 x3,
full Vitest 1,280/1,280, type/lint/build, affected no-retry E2E 15/15, full no-retry E2E 87/87 and
manual active-edit/offline/two-tab/responsive gates pass. Exact HEAD/index/cleanup/frozen boundaries
pass; no finding or Q proposal. Root acceptance integrates D-015 and R-006/R-008/R-009
transcriptions; HS-005 remains unchecked until the separate durable marker event.

**2026-07-24 — P12/08 artifact integration; HS-005 `queued -> completion_pending`:** Exact
revision-08 evidence/review, independent PASS, D-015 and R-006/R-008/R-009 transcriptions are
integrated in `f8cbb5a8caacb763c0bb77199595a5ee332ab729`; reviewed product/test HEAD remains
`a2a31839f6bb57855fa60b8cfcc06feed069cafa`. P12 is passed and is the sole package mapped to
HS-005. Root authorizes only HS-005's first-line `[] -> [x]` marker from exact scratch SHA
`2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, mapped to immutable
`reviews/P12-review-08.md`. The checked set remains HS-002/HS-004/HS-006/HS-010/HS-014/HS-017/
HS-018 until the marker is applied; all 21 normalized blocks, canonical FS-001 and SCOPE are exact.
No package dispatch is legal while this event is pending.

**2026-07-24 — HS-005 `completion_pending -> passed`:** Exact marker-only `[] -> [x]` finalized
after P12 review `reviews/P12-review-08.md` and integration
`f8cbb5a8caacb763c0bb77199595a5ee332ab729`. The private comparison copy showed exactly the HS-005
first-line marker change and was removed. All 21 normalized blocks byte-match SCOPE; checked set is
exactly HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018; FS-001 and SCOPE remain exact.
Scratch SHA advances
`2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744 ->
aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, 350 lines/24,247 bytes.
The completion event is cleared and package dispatch may resume.

**2026-07-24 — P13/01 `queued -> implementing`:** Dependencies P09/02 and P11A–C are passed and
HS-005's marker event is finalized. Literal original BASE/preimplementation HEAD is
`415ea080b3b19191fd71601742056a619b4a3080`; sole evidence is
`evidence/P13/implementation-01.md` and future review is `reviews/P13-review-01.md`. Authority is
limited to the ordinary Transactions page/table/row/toolbar/grid-navigation surface, narrowly
existing transaction insertion APIs only if required, and focused transaction/keyboard/
virtualization/integration/E2E tests. Replace the single special add form with immediate distinct
persisted empty rows using normal affordances; prove valid defaults, rapid-add uniqueness, alias
legality, selection/arrows/focus/virtualization, one-step Undo/Redo, reload/offline/two-tab
convergence, accessibility and no confirm/cancel/add-only state. Component, CRDT, sync and E2E
repository guides apply. Full focused x3, full Vitest/checks, affected x3 and full no-retry E2E,
installed-CLI charter, cleanup and frozen checks are mandatory. Reviewer is undispatched; HS-001
remains unchecked.

**2026-07-24 — P13/01 authority expansion:** Removing the authorized dead
`AddTransactionRow.tsx` implementation requires removing its export from
`src/components/features/transactions/index.ts`; root authorizes exactly that barrel-export edit.
The worker may not add any other unlisted path without a reproduced blocker and prior root
expansion. Revision, BASE, evidence/review paths, acceptance and frozen boundary remain unchanged.

**2026-07-24 — P13/01 retained-E2E authority expansion:** After the ordinary-row implementation,
the existing description-alias pointer journey times out on removed `new-transaction-description`
controls and the tab-duplication journey times out on its removed Description/0.00 special-form
block. A compatibility shim would restore the forbidden add-only UX. Root therefore authorizes
exactly `tests/e2e/description-aliases.spec.ts` and `tests/e2e/tab-duplication.spec.ts` to drive the
selected ordinary row instead; only the alias journey's Add-then-edit Undo expectation may change
with it. No additional product or E2E path is authorized.

**2026-07-24T20:07:05+10:00 — P13/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `6276108f4ebae4e63a23cbf5d532b8843e9f0a98` is one commit over literal BASE
`415ea080b3b19191fd71601742056a619b4a3080`, with exactly 15 authorized paths and deletion of the
dead add-only component. Frozen evidence `evidence/P13/implementation-01.md` is 227 lines/15,227
bytes at SHA-256 `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`.
Each Add now inserts/selects a distinct persisted ordinary empty row using valid account/status/date/
amount/description/alias/tag/note/allocation defaults; special submit/cancel mode and Add disabling
are removed. Reported green: focused 76/76 x3, full Vitest 1,286/1,286, type/lint/build, entire
Transactions E2E 37/37, affected no-retry repeats 63/63, full no-retry E2E 90/90 and the complete
rapid-add/grid/history/reload/offline/two-tab/responsive manual charter. Root verifies exact HEAD/
parent/path/index, evidence identity, cleanup, restored generated state and frozen hashes. Reviewer
alone writes `reviews/P13-review-01.md`; HS-001 remains unchecked.

**2026-07-24 — P13/01 `reviewing -> changes_requested`:** Independent review
`reviews/P13-review-01.md` is 163 lines/14,917 bytes at SHA-256
`579a6f08fa3096a92d1695a5de1184e18ce3912e5a651eda1d8202d20a99dd55` and returns FAIL. F-01 High
reproduces in the real app: with an excluding search/filter active, Add persists and selects a legal
default transaction but the table remains empty, the toolbar reports
`0 transactions (filtered) · 1 selected`, and Bulk Edit targets the inaccessible row; clearing the
filter reveals it. Revision 02 must apply a predictable reveal policy for every filter class, keep
visible row/count/selection coherent, and cover filter→Add→visible ordinary row plus reload and
Undo/Redo without restoring a special add mode. All other acceptance is green, including focused
76/76 x3, full Vitest 1,286/1,286, affected E2E 63/63, full no-retry E2E 90/90 and the remaining
manual charter. Exact HEAD/index/cleanup/frozen boundaries pass; no Q proposal. R-010 carries the
finding; HS-001 remains unchecked.
Immutable evidence, review, R-010 transcription and failure control state are committed as
`f54526821bec08698214065c48ea237bf718fe15`.

**2026-07-24 — P13/02 `changes_requested -> implementing`:** Revision-01 failure is immutable at
`f54526821bec08698214065c48ea237bf718fe15`; clean preimplementation HEAD is
`57398ea27d2af6523d26ccc3227433feaebe29e3`, while cumulative BASE remains
`415ea080b3b19191fd71601742056a619b4a3080`. Sole evidence is
`evidence/P13/implementation-02.md`; future review is `reviews/P13-review-02.md`. Authority is
exactly the Transactions page and focused `transactions.spec.ts` coverage. Close F-01 with a
predictable reveal policy across excluding search/account/tag/person/status/date/duplicates filters,
keeping visible row/count/selection/filter state coherent in the same Add interaction and through
reload plus one-step Undo/Redo. No special add mode or compatibility form may return. All cumulative
P13 automation/manual/cleanup/frozen gates remain mandatory; reviewer is undispatched and HS-001
remains unchecked.

**2026-07-24T20:59:39+10:00 — P13/02 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `8f6e4f2ad77da24016169a79286a9727f3394aca` changes only the Transactions page and
`transactions.spec.ts` from clean preimplementation HEAD
`57398ea27d2af6523d26ccc3227433feaebe29e3`. Frozen evidence
`evidence/P13/implementation-02.md` is 178 lines/11,584 bytes at SHA-256
`2ef2070960cac20bf0e9bc138928b3c11c94671f57af2f8a8ba94009e0e81bdd`. Add synchronously resets the
complete local filter state before ordinary-row insertion/selection. Search/date/tag/person/account/
status/duplicates exclusions each reveal one selected row with coherent unfiltered count; filters
remain outside CRDT/history. Reported green: focused 76/76 x3, full Vitest 1,286/1,286,
type/lint/build, targeted filter 1/1, affected no-retry 66/66, full no-retry E2E 91/91 and the
complete filter/history/reload/rapid-add/grid/offline/two-tab/responsive manual charter. Root verifies
exact HEAD/parent/two-path range/index, evidence identity, cleanup, restored generated state and
frozen hashes. Reviewer alone writes `reviews/P13-review-02.md`; HS-001 remains unchecked.

**2026-07-24T21:22:32+10:00 — P13/02 `reviewing -> changes_requested`:** Independent cumulative
review `reviews/P13-review-02.md` is 204 lines/21,835 bytes at SHA-256
`157dfc363788966f90fd5dca0f23506f65a75f4794261359ab89f443d9603b91` and returns FAIL over exact
`415ea080b3b19191fd71601742056a619b4a3080..8f6e4f2ad77da24016169a79286a9727f3394aca`.
The filter-control part of F-01 closes for search/date/tag/person/account/status/duplicates, but the
whole immediate-visibility gate remains open: after 51 legal future-dated imports, excluding
search→Add clears filters and reports `66 transactions · 1 selected` while the selected ordinary
row is absent from the initial 50-row slice until load-more. Revision 03 must reconcile the created
logical ID with pagination and displayed selection in the same interaction and add behavior-led
coverage with more than `PAGE_SIZE` higher-sorted rows, exact-ID Undo/Redo and reload persistence.
Independent focused 76/76 x3, clean full Vitest 1,286/1,286, affected no-retry E2E 66/66, full
no-retry E2E 91/91 and all other manual gates pass. The earlier concurrent performance red is
resolved by the clean full rerun plus three exact isolated passes. Exact HEAD/index/cleanup/frozen
boundaries pass; no Q proposal. R-010 carries the remaining finding; HS-001 remains unchecked.
Immutable revision-02 evidence, review, R-010 transcription and failure control state are committed
as `282b1d64b94c0e5614f3db5b723f99b23923cf44`.

**2026-07-24T21:25:00+10:00 — P13/03 `changes_requested -> implementing`:** Revision-02 failure is
immutable at `282b1d64b94c0e5614f3db5b723f99b23923cf44`; clean preimplementation HEAD is
`8971b63cf9671652c5739cb68681c42302813f6c`, while cumulative BASE remains
`415ea080b3b19191fd71601742056a619b4a3080`. Sole evidence is
`evidence/P13/implementation-03.md`; future review is `reviews/P13-review-03.md`. Authority is
exactly the Transactions page and focused `transactions.spec.ts` coverage. Close the remaining F-01
with more than `PAGE_SIZE` legal higher-sorted transactions: the created logical ID must be in the
displayed slice and selected immediately without load-more, count/Bulk Edit/selection must never
target an undisplayed row, and canonical ordering plus bounded virtualization must remain intact.
Prove exact-ID/defaults, one-step Undo/Redo and reload persistence while retaining all seven filter
classes and all cumulative P13 automation/manual/cleanup/frozen gates. Reviewer is undispatched and
HS-001 remains unchecked.

**2026-07-24T22:05:39+10:00 — P13/03 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `9f307e200676711ca2a3ba81bd816314807434ad` changes only the Transactions page and
`transactions.spec.ts` from clean preimplementation HEAD
`8971b63cf9671652c5739cb68681c42302813f6c`. Frozen evidence
`evidence/P13/implementation-03.md` is 212 lines/14,968 bytes at SHA-256
`1b6a949b7136b3e5aa3448f9815a9437624b1fb7c80a63951c49555fd67a2f2d`. Add computes the created
row's canonical index, expands the displayed prefix to the containing page boundary, scrolls the
existing virtualized grid to that row and derives count/Bulk Edit selection only from displayed
IDs. Reported green: exact pagination 1/1, focused 76/76 x3, full Vitest 1,286/1,286,
type/lint/build, affected no-retry 69/69, full no-retry E2E 92/92 and the complete >PAGE_SIZE
pagination/seven-filter/history/reload/rapid-add/grid/offline/two-tab/responsive/privacy manual
charter. One combined diagnostic's unchanged virtualization journey timed out, then passed isolated
3/3 and in both final matrices; evidence records it exactly. Root verifies exact HEAD/parent/
two-path range/index, evidence identity, cleanup, restored generated state, no task process/listener
and frozen hashes. Review-generated `.next` was moved to recoverable trash after the root server
stopped. Reviewer alone writes `reviews/P13-review-03.md`; HS-001 remains unchecked.

**2026-07-24T22:42:28+10:00 — P13/03 `reviewing -> passed`; artifact integration pending:**
Independent cumulative review `reviews/P13-review-03.md` is 177 lines/18,583 bytes at SHA-256
`d875ee06c2899bf28b96d2045df288cc2fc15a9b27af67492a293656befc5eda` and returns PASS over exact
`415ea080b3b19191fd71601742056a619b4a3080..9f307e200676711ca2a3ba81bd816314807434ad`.
Review-02 F-01 closes: more than `PAGE_SIZE` legal higher-sorted rows now produce an immediately
visible selected ordinary row at canonical index 51, only 17 mounted rows, coherent count/Bulk Edit
and preserved Add focus. Exact-ID Undo/Redo, reload, rapid Add, all seven filters, grid/alias/
ordinary editing, offline/two-tab convergence, encrypted sync and responsive behavior pass.
Independent focused 76/76 x3, full Vitest 1,286/1,286, exact pagination 1/1, broader affected
no-retry 147/147 and full no-retry E2E 92/92 pass. Exact HEAD/index/cleanup/frozen boundaries pass;
no High/Medium finding or Q proposal. Root acceptance integrates R-009/R-010 transcriptions;
HS-001 remains unchecked until the separate durable marker event.

**2026-07-24T22:43:15+10:00 — P13/03 artifact integration; HS-001
`queued -> completion_pending`:** Exact revision-03 evidence/review, independent PASS and
R-009/R-010 transcriptions are integrated in `7a04338fa7c3f68463d12d11082bc56e87c1872b`;
reviewed product/test HEAD remains `9f307e200676711ca2a3ba81bd816314807434ad`. P13 is passed and is
the sole package mapped to HS-001. Root authorizes only HS-001's first-line `[] -> [x]` marker from
exact scratch SHA `aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`,
mapped to immutable `reviews/P13-review-03.md`. The checked set remains
HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018 until the marker is applied; all 21
normalized blocks, canonical FS-001 and SCOPE are exact. No package dispatch is legal while this
event is pending.

**2026-07-24T22:45:00+10:00 — HS-001 `completion_pending -> passed`:** Exact marker-only
`[] -> [x]` finalized after P13 review `reviews/P13-review-03.md` and integration
`7a04338fa7c3f68463d12d11082bc56e87c1872b`. The private comparison copy showed exactly the HS-001
first-line marker change and was removed. All 21 normalized blocks byte-match SCOPE; checked set is
exactly HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018; FS-001 and SCOPE remain
exact. Scratch SHA advances
`aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f ->
b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`, 350 lines/24,248 bytes. The
completion event is cleared and package dispatch may resume.

**2026-07-24T22:48:00+10:00 — P14/01 `queued -> implementing`:** P09/02 is passed and the HS-001
marker event is finalized. Literal original BASE/preimplementation HEAD is
`b9105028926d24a5a0c5454777a6c33379ca606a`; sole evidence is
`evidence/P14/implementation-01.md` and future review is `reviews/P14-review-01.md`. Authority is
limited to the enumerated import/transaction schema, mutation, query, maintenance, amount-cell,
imports/transactions page, bounded sync-encoding owners and focused unit/integration/E2E paths in
HANDOFF. Implement exact parent/nested import lineage, first-edit immutable original minor units,
currency-correct accessible tooltip, one-action one-step reversible import deletion with
cross-import isolation, and R-023 1,000-row encrypted persistence without unbounded base64 spread.
Apply import/CRDT/components/sync/E2E guides; preserve legacy optionality, aliases, buckets, history,
privacy and frozen sources. Focused x3, full checks, affected repeated no-retry E2E, full no-retry
E2E, installed-CLI charter, cleanup and any complete non-blocking Q proposal are mandatory.
Reviewer is undispatched and HS-008 remains unchecked.

**2026-07-24T22:55:34+10:00 — P14/01 `implementing -> implementing`; narrow test-fixture scope
expansion:** Full typecheck deterministically proves that loro-mirror's `InferInputType` represents
the new runtime-optional `originalAmount` schema key as a required construction property whose value
may be `undefined`, matching the existing optional `descriptionAliasId`/`deletedAt` convention.
Seven pre-existing legacy fixture owners therefore fail until their transaction literals explicitly
provide `originalAmount: undefined`: `tests/integration/description-alias-actions.test.ts`,
`description-alias-crdt.test.ts`, `description-alias-lookup-lifecycle.test.tsx`,
`vault-maintenance.test.tsx`, `tests/unit/crdt/description-alias-mutations.test.ts`,
`maintenance.test.ts` and `transaction-ordering.test.ts`. Root authorizes only that mechanical
compatibility edit and directly owner-aligned provenance-retention assertions in those exact seven
test paths before any such edit. Product authority, BASE, evidence/review artifacts, package state,
HS-008 marker and every other prohibition remain unchanged.

**2026-07-24T23:37:38+10:00 — P14/01 `implementing -> ready_for_review -> reviewing`:** Exact
cumulative product/test HEAD is `8643fff75f8d70a6485f9c23fcca33a231d9d9cf`, covering the original
BASE `b9105028926d24a5a0c5454777a6c33379ca606a` through the 24 authorized implementation/test
paths plus the prior root-only dispatch/scope control commit. Frozen evidence
`evidence/P14/implementation-01.md` is 220 lines/14,875 bytes at SHA-256
`7e4c4f8244484ee8885ecc4c547069a10d7891689a917e3332a652574754c522`. Reproduced reds cover
cross-import nested-row loss, absent first-edit origin and the real 1,000-row base64 stack overflow.
Reported green includes focused 118/118 x3, owner-aligned 195/195, full Vitest 1,296/1,296, full
no-retry E2E 93/93, exact CSV/OFX repeats and the installed-CLI lineage/currency/delete/history/
large/offline/privacy charter. The initial 200%-zoom tooltip clipping and 3.22:1 positive contrast
were rejected during implementation; exact final recapture contains the full tooltip, arrow and
text inside 390x844 at 200%, with 4.94:1 and 20.17:1 contrast. Root verifies exact HEAD/range/path/
index/cleanup, no review artifact or Q proposal, scratch/21 blocks, FS-001 and SCOPE. Reviewer alone
may now write `reviews/P14-review-01.md`; HS-008 remains unchecked.

**2026-07-25T00:26:42+10:00 — P14/01 `reviewing -> changes_requested`:** Immutable independent
review `reviews/P14-review-01.md` is 171 lines/13,684 bytes at SHA-256
`92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f` and returns FAIL over exact
`b9105028926d24a5a0c5454777a6c33379ca606a..8643fff75f8d70a6485f9c23fcca33a231d9d9cf`.
F-01 Medium Requirements/UX proves that after an ordinary deletion leaves three live linked rows,
the imports row and destructive dialog still use immutable original `Import.transactionCount=4`
and falsely say four transactions will be deleted. The atomic current-set operation itself is
sound: it deletes the live three, preserves the 1,000-row other import/manual row, one Undo restores
exactly the three plus record while the independently deleted row stays absent, and one Redo removes
them again. Independent focused 118/118 x3, owner 195/195, full Vitest 1,296/1,296, changed E2E 3/3,
affected E2E 180/180 and full E2E 93/93 pass; installed CLI independently confirms lineage,
currency precision, 390x844/200% containment, encryption and 1,000-row persistence. Review also
records that frozen revision-01 evidence itself is a fourteenth repository format failure and
misreported that gate as the prior thirteen paths. Revision 02 must derive destructive copy from the
same live linked identity set, add the exact stale-count/delete/history/isolation journey and report/
format its new evidence accurately. No Q proposal; exact HEAD/index/cleanup/frozen boundaries pass;
HS-008 remains unchecked.

**2026-07-25T00:29:40+10:00 — P14/02 `changes_requested -> implementing`:** Revision-01
evidence/review and F-01 are immutable in control commit
`7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2`; original cumulative review BASE remains
`b9105028926d24a5a0c5454777a6c33379ca606a`, and the exact revision-02 pre-implementation HEAD is
`7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2`. Sole new evidence is
`evidence/P14/implementation-02.md`; future review is `reviews/P14-review-02.md`. Authority is
narrowed to the imports-page live canonical transaction projection, its existing table/dialog data
boundary, the checked-in import E2E, and only proven focused query/operation tests. Reproduce four →
ordinary-delete one → three live while dialog says four, then derive truthful destructive feedback
from the same live import identity set and prove exact three-row delete, one-step Undo/Redo,
independently deleted-row absence and cross-import/manual preservation. Repeat the exact no-retry
journey x3, retain full cumulative gates/CLI samples, and report repository formatting exactly;
format the new evidence without altering revision-01 evidence. HS-008 remains unchecked and the
reviewer is undispatched.

**2026-07-25T01:03:42+10:00 — P14/02 `implementing -> ready_for_review -> reviewing`:** Exact
cumulative product/test HEAD is `93d89145fe910a1348ccd4a4f0c79f2022801465`; the revision-02 delta
from pre-HEAD `7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2` is exactly
`src/app/(app)/imports/page.tsx` and `tests/e2e/import.spec.ts`, 58 insertions/11 deletions.
Frozen evidence `evidence/P14/implementation-02.md` is 156 lines/11,793 bytes at SHA-256
`e7d8dcf685f920f1ab182a2719fb3573fc3daceb199c01852505eaefad5eeb52`. Unchanged-product F-01
reproduced live/table/dialog `3/4`; the imports page now counts the existing canonical active
transaction projection by non-empty import ID and passes the current cardinality through the
existing table/dialog boundary. Reported green includes exact F-01 3/3, focused 118/118 x3, owner
195/195, clean full Vitest 1,296/1,296 after an inherited timing red/isolated 43/43 diagnostic,
affected E2E 60/60, full E2E 93/93 and installed-CLI exact current count/delete/Undo/Redo plus
cumulative tooltip/zoom/large/offline/privacy samples. Revision-02 evidence passes exact formatting
and truthfully records the same 14 inherited repository Markdown failures, including immutable
revision-01 evidence. Root verifies exact HEAD/range/path/index/cleanup, prior artifact hashes,
scratch/21 blocks, FS-001 and SCOPE. Reviewer alone may write `reviews/P14-review-02.md`; HS-008
remains unchecked.

**2026-07-25T01:36:23+10:00 — P14/02 `reviewing -> changes_requested`:** Immutable independent
review `reviews/P14-review-02.md` is 191 lines/14,936 bytes at SHA-256
`e6c4d2fdbd4ce5b2c5d6db75f6451a19d0a1901bb769640a1933e9fa9fdab7c4` and returns FAIL over exact
`b9105028926d24a5a0c5454777a6c33379ca606a..93d89145fe910a1348ccd4a4f0c79f2022801465`.
F-02 Medium Requirements/UX proves the revision-02 projection counts only top-level
`getAllTransactions()` rows while normal duplicate import stores a distinct imported identity in
`suspectedDuplicates` and atomic deletion removes it. Installed normal UI reproduced nested import
table/dialog count zero, confirm deleting one nested transaction/record, Undo restoring both and
Redo removing both while the other-import parent survived. Revision-01 F-01 remains fixed for
ordinary parents. Independent focused 118/118 x3, owner 195/195, full Vitest 1,296/1,296, F-01 E2E
3/3, affected E2E 60/60 and full E2E 93/93 pass; cumulative CLI origin/zoom/contrast/1,000-row/
encryption/offline/two-tab samples pass, with an uncredited final CLI reload probe closing
unexpectedly. Revision 03 must centralize complete active parent+nested distinct-ID enumeration,
deduplicate relocation/conflict copies with deletion-equivalent identity semantics, and add normal
nested-import count/delete/Undo/Redo coverage. No Q proposal; exact HEAD/index/cleanup/frozen
boundaries pass; HS-008 remains unchecked.

**2026-07-25T01:39:04+10:00 — P14/03 `changes_requested -> implementing`:** Revision-02
evidence/review and F-02 are immutable in control commit
`3f9597873ea965638a8f53e08ced339cdc3ce8ca`; original cumulative review BASE remains
`b9105028926d24a5a0c5454777a6c33379ca606a`, and the exact revision-03 pre-implementation HEAD is
`3f9597873ea965638a8f53e08ced339cdc3ce8ca`. Sole new evidence is
`evidence/P14/implementation-03.md`; future review is `reviews/P14-review-03.md`. Authority is
exactly the canonical transaction query, its context hook, imports-page consumer, focused query
unit test and import E2E. Centralize complete public parent/nested enumeration, collapse physical
relocation/conflict copies by logical ID, filter active identities with deletion-equivalent
semantics, and leave the parent-only transaction-grid contract and sound atomic mutation unchanged.
Reproduce the ordinary duplicate-import zero-count red; prove parent and nested counts one, exact
nested delete/Undo/Redo and parent/cross-import/manual preservation. Retain F-01 and every cumulative
HS-008 gate, run required repeated/full automated and installed-CLI evidence, report the 14 inherited
format failures exactly and format only the new evidence. Both prior revisions remain immutable,
HS-008 remains unchecked and the reviewer is undispatched.

**2026-07-25T02:18:06+10:00 — P14/03 `implementing -> ready_for_review -> reviewing`:** Exact
cumulative product/test HEAD is `cf6456eeb5bd4029ae57eeb83da7e53194396a4d`; the revision-03 delta
from pre-HEAD `3f9597873ea965638a8f53e08ced339cdc3ce8ca` is exactly the five authorized
query/context/imports-page/unit/E2E paths, 275 insertions/5 deletions. Frozen evidence
`evidence/P14/implementation-03.md` is 159 lines/11,901 bytes at SHA-256
`c07a417ba39a58801e7d411adcd4c87c47614e526d6c35aa1e456a306e85eb8d`. Unchanged revision-02 F-02
reproduced expected-one/received-zero and two missing-query unit reds. The new separate canonical
projection enumerates active public parents/nested identities and collapses relocation/conflict
copies by logical ID while leaving the transaction-grid hook and delete mutation unchanged.
Reported green includes F-02 3/3, retained F-01 1/1, focused 120/120 x3, owner 197/197, full Vitest
1,298/1,298, affected E2E 61/61 and full E2E 94/94 with retries zero. Installed CLI reports exact
nested count/delete/Undo/Redo, stale-parent count, lineage/accessibility, 1,000-row reload/
virtualization, encrypted request privacy, offline origin, duplicate-tab convergence and clean final
console. Root stopped the keyed server, restored generated source, recoverably cleaned only current
task artifacts, verified exact HEAD/range/path/index/artifact formatting/prior hashes and all frozen
boundaries. Reviewer alone may now write `reviews/P14-review-03.md`; HS-008 remains unchecked.

**2026-07-25T02:49:55+10:00 — P14/03 `reviewing -> changes_requested`:** Immutable independent
review `reviews/P14-review-03.md` is 201 lines/16,049 bytes at SHA-256
`e5df38ff0486c5f65d8f734e7dcdd87522ea169667f477d1bdaac6f1f1b57af8` and returns FAIL over exact
`b9105028926d24a5a0c5454777a6c33379ca606a..cf6456eeb5bd4029ae57eeb83da7e53194396a4d`.
F-03 Medium Accessibility/UX deterministically proves row-position-dependent original-amount
tooltip clipping at 390x844/200% zoom: a focused/hovered lower visible edited imported row places
the tooltip wholly below the viewport, and an offset virtualized row overflows right by 42px, while
the first-row control is contained and the programmatic description remains correct. F-01 and F-02
are closed. Independent focused 120/120 x3, owner 197/197, full Vitest 1,298/1,298, F-02 3/3,
F-01 1/1, affected E2E 61/61 and full E2E 94/94 pass with static/build/format gates; installed CLI
also confirms count/delete/history, lineage/origin/contrast, 1,000-row reload, encryption,
offline/two-tab and clean final reload. Revision 04 must implement collision-aware positioning in
the actual zoomed viewport/nested scroll context and add deterministic lower/right-offset focus and
hover containment tests. Root stopped the server, restored generated source and recoverably cleaned
only review artifacts. No Q proposal; exact HEAD/index/frozen boundaries pass; HS-008 remains
unchecked.

**2026-07-25T02:51:11+10:00 — P14/04 `changes_requested -> implementing`:** Revision-03
evidence/review and F-03 are immutable in control commit
`8fc2163b6a44cb01775d4134f702b98f4ff9a680`; original cumulative review BASE remains
`b9105028926d24a5a0c5454777a6c33379ca606a`, and the exact revision-04 pre-implementation HEAD is
`8fc2163b6a44cb01775d4134f702b98f4ff9a680`. Sole new evidence is
`evidence/P14/implementation-04.md`; future review is `reviews/P14-review-04.md`. Authority is
limited to the amount-tooltip component, checked-in import E2E and an optional exact new focused
component test. Reproduce F-03 before product code with deterministic 390x844/200%-zoom dark/
reduced-motion geometry across first, lower and right-offset virtualized rows using both focus and
hover; then keep every tooltip edge in the actual viewport without hiding it, weakening visual
access, relying only on aria description or disabling zoom/virtualization. Shared tooltip
primitives require a separately proven blocker and root expansion. Retain F-02 x3, F-01 and all
cumulative HS-008 automation/CLI/privacy/scale gates, report the exact 14 inherited format failures
and format only new evidence. All prior revisions remain immutable, HS-008 remains unchecked and
the reviewer is undispatched.

**2026-07-25T03:28:46+10:00 — P14/04 `implementing -> ready_for_review -> reviewing`:** Exact
cumulative product/test HEAD is `305d6613673cf200d456276c076463b68c075500`; the revision-04 delta
from pre-HEAD `8fc2163b6a44cb01775d4134f702b98f4ff9a680` is exactly the authorized
`InlineEditableAmount.tsx` and import E2E, 285 insertions/2 deletions. Frozen evidence
`evidence/P14/implementation-04.md` is 184 lines/13,865 bytes at SHA-256
`c68488162a547ca369a8cd7734b40dccc95140407ec9c931efdb6b8e4b7521d3`. Unchanged revision-03 F-03
reproduced with contained first-row control, lower-row tooltip reaching y≈1313 and right-offset
tooltip reaching x≈446 in a 390x844 viewport. The component-local open-state correction unions
content/arrow geometry, applies an 8px actual visual-viewport margin in local CSS scale and tracks
late portal/zoom/scroll/resize movement without changing the shared primitive. Reported green
includes F-03 3/3, F-02 3/3, F-01 1/1, focused 120/120 x3, owner 197/197, full Vitest 1,298/1,298,
affected E2E 62/62 and full E2E 95/95 with retries zero. Installed CLI reports all six first/lower/
right hover/focus boxes plus arrow contained at 390x844/200% dark/reduced, tightest margin 8.088px,
correct textbox/tooltip semantics, 20.17:1 contrast, exact nested history, 1,000-row reload,
encryption, offline/two-tab convergence and clean final console. Root stopped the keyed server,
restored generated source, recoverably cleaned only current artifacts and verified exact HEAD/
range/path/index/artifact formatting/prior hashes and frozen boundaries. Reviewer alone may now
write `reviews/P14-review-04.md`; HS-008 remains unchecked.

**2026-07-25T04:10:10+10:00 — P14/04 `reviewing -> passed`; artifact integration pending:**
Independent cumulative review `reviews/P14-review-04.md` is 202 lines/16,035 bytes at SHA-256
`11d524993eb312b318ebc3ec5c66a88fbbe68a580ef1103d66deb30fd3149d99` and returns PASS over exact
`b9105028926d24a5a0c5454777a6c33379ca606a..305d6613673cf200d456276c076463b68c075500`.
F-03 closes with all six first/lower/right-offset hover/focus content, rendered-text and arrow boxes
contained at 390x844/200% zoom, a tightest exact eight-pixel margin, stable settled frames, correct
accessible roles/descriptions and 20.157:1 contrast. F-02/F-01 remain closed with exact nested and
top-level live-identity count/delete/Undo/Redo isolation. Independent F-03 3/3, F-02 3/3, F-01
1/1, focused 120/120 x3, owner 197/197, full Vitest 1,298/1,298, affected no-retry E2E 62/62 and
full no-retry E2E 95/95 pass, along with typecheck/lint/build/scoped format and diff gates. The
installed-CLI charter independently preserves eight-decimal origin, 1,000-row encrypted persistence
and bounded rendering, offline/two-tab convergence, clean lifecycle/console and exact cleanup.
Frozen sources, all prior artifacts, HEAD and index boundaries pass; no material finding or Q
proposal. Root acceptance transcribes R-010/R-023 and D-016; HS-008 remains unchecked until the
separate durable marker event.

**2026-07-25T04:11:25+10:00 — HS-008 `queued -> completion_pending`:** P14 revision-04 PASS,
immutable evidence/review and root transcriptions are integrated as
`a2182116db08200b8b4df28412512b9ca3406aa2`. Root durably prepares the sole authorized frozen-source
edit: change only HS-008's first-line marker from `[]` to `[x]` against pre-change scratch SHA
`b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`. The authorized checked set
remains HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018 until the marker is applied.
All 21 normalized blocks, canonical FS-001 and SCOPE are exact. No package dispatch is legal while
this event is pending.

**2026-07-25T04:12:16+10:00 — HS-008 `completion_pending -> passed`:** Exact marker-only
`[] -> [x]` finalized after P14 review `reviews/P14-review-04.md` and integration
`a2182116db08200b8b4df28412512b9ca3406aa2`. The private comparison copy showed exactly the HS-008
first-line marker change and was removed. All 21 normalized blocks byte-match SCOPE; checked set is
exactly HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-014/HS-017/HS-018; FS-001 and SCOPE
remain exact. Scratch SHA advances
`b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d ->
f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`, 350 lines/24,249 bytes. The
completion event is cleared and package dispatch may resume.

**2026-07-25T04:15:08+10:00 — P15/01 `queued -> implementing`:** P14/04 and the exact HS-008 marker
are complete at clean preimplementation BASE/HEAD
`b3e96ba9e9487d13df56956d220fffca63d6482d`. Sole implementation evidence is
`evidence/P15/implementation-01.md`; future independent review is `reviews/P15-review-01.md`.
Authority is limited to the exact shared validation, bounded transfer/provider, reusable
whole-surface drop target, three app pages/layout, import exports and focused unit/component/import
E2E owners named in HANDOFF. Picker and real DataTransfer drop paths must share typed
single-file/extension/size/empty/readability/content validation before navigation; the existing
plaintext `FileReader`/sessionStorage copy must be removed. Imports-list and transactions-table
surfaces must remain stable across nested child/virtualized drag events, show accessible actionable
errors, transfer the original File one-shot into unchanged preview/mapping/confirmation, preserve
cancel/back/focus and never auto-import or leak content. Red-before-green, repeated focused,
affected/full automation, installed-CLI responsive/dark/reduced/privacy/cleanup and P13/P14
preservation gates are mandatory. Reviewer is undispatched; HS-013 remains unchecked.

**2026-07-25T05:00:38+10:00 — P15/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `d652032ea4f738e06fd5a29018bd341010285696` changes exactly 13 authorized paths
from control HEAD `f0373722ffeca6812820f5270190c203300f712b`. Frozen evidence
`evidence/P15/implementation-01.md` is 177 lines/13,180 bytes at SHA-256
`5ad467cdaaec07685d20fdeff28aff1d5564e571fbd5e3ca99d6a452c97cd05e`. BASE red was
2 missing-owner unit suites and 0/4 browser journeys; final focused unit is 9/9 x3 and real
DataTransfer E2E is 12/12 across three repeats. Shared typed 8-KiB-sniff validation, a one-shot
vault/route-scoped in-memory original-File transfer and one reusable nested-depth drop target replace
duplicated validation and plaintext sessionStorage copying across Imports, Transactions and the
existing picker. Reported green includes import profile 262/262, full Vitest 1,307/1,307, affected
no-retry Chromium 66/66 and full 99/99, plus type/lint/build/scoped format/diff gates. Installed CLI
reports stable 320px dark/reduced overlay, six invalid cases with focus restoration, keyboard
picker, mixed-case CSV/OFX/QFX cancel/confirm flows, filtered child/edge drop, deterministic reload,
encrypted push with no synthetic plaintext and zero console warnings/errors. Two failed exploratory
listener harnesses and one hung optional 60-row probe are explicitly excluded; automation owns the
repeated virtualized/scale result. Root stopped the keyed server, restored generated source and
moved only current `.next`, `test-results` and nine CLI artifacts to recoverable trash. Exact
HEAD/index/worktree/evidence formatting, frozen hashes and all 21 normalized blocks pass. Reviewer
alone may now write `reviews/P15-review-01.md`; HS-013 remains unchecked.

**2026-07-25T05:30:37+10:00 — P15/01 `reviewing -> changes_requested`; failure integration
pending:** Independent review `reviews/P15-review-01.md` is 227 lines/16,347 bytes at SHA-256
`4da58be357d490f28d5fbe0858a0e428ef8842258adcc2a87dd942da5b86cd44` and returns FAIL over exact
`b3e96ba9e9487d13df56956d220fffca63d6482d..d652032ea4f738e06fd5a29018bd341010285696`.
F-01 rejects supported XML-declaration/OFX-2.x input before the already-capable parser. F-02 admits
obvious JSON renamed as CSV. F-03 measures the 14px alert at only 4.2259:1 light and 2.7605:1 dark.
F-04 places overlay copy and alerts wholly below a 390x844 viewport at 200% zoom. F-05 strands the
overlay when an entered virtual row unmounts before its leave, until global dragend. Independent
focused unit 9/9 x3, import 262/262, full Vitest 1,307/1,307, changed E2E 12/12 x3, picker 2/2,
affected Chromium 66/66 and full Chromium 99/99 all pass but omit those five exact boundaries.
Positive CSV/SGML OFX/QFX, explicit confirm/cancel, 60-row encrypted persistence with 18 mounted,
P14 lineage/origin/history, privacy and clean console remain green. Root stopped both keyed review
server phases, restored generated source and moved only current `.next`, `test-results` and review
CLI artifacts to recoverable trash. Exact HEAD/index/worktree/frozen boundaries pass; no Q proposal.
HS-013 remains unchecked and revision 02 must close every finding without weakening the green
architecture or flows.

**2026-07-25T05:32:03+10:00 — P15/02 `changes_requested -> implementing`:** Revision-01
evidence/review and F-01 through F-05 are immutable in failure integration
`49dcef93bdbd4d4d21f0313061bc262473801966`; original cumulative review BASE remains
`b3e96ba9e9487d13df56956d220fffca63d6482d`, and the exact revision-02 preimplementation HEAD is
`49dcef93bdbd4d4d21f0313061bc262473801966`. Sole new evidence is
`evidence/P15/implementation-02.md`; future review is `reviews/P15-review-02.md`. Authority is
limited to shared validation, the reusable drop target and their exact unit/component/import E2E
owners. Revision 02 must align XML OFX with parser truth, reject obvious renamed JSON/documents,
measure at least 4.5:1 alert contrast in both themes, contain all guidance at 390x844/200% zoom and
clear virtual-unmount residue on outer leave without dragend. Checked-in red-before-green tests,
actual DataTransfer, exact contrast/geometry, focused x3, affected/full no-retry automation and the
complete installed-CLI/privacy/scale/P13/P14 preservation charter are mandatory. Reviewer is
undispatched; HS-013 remains unchecked.

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

# Progress Ledger

This is the authoritative execution ledger. The coordinator updates it after every state transition.
Do not infer completion from old specs, commits, or scratch checkmarks without linked independent
review evidence.

## Current position

- **Goal status:** in progress
- **Current package:** **P20A** (HS-016 — truthful marketing pages) `implementing` rev 02 at BASE
  `c9c7874`. `p20a-reviewer-01` returned **VERDICT: FAIL — 1 blocking finding (B1)**: the shipped
  landing copy at `SecuritySection.tsx:35` added a NEW sentence "Remove a member and the vault is
  re-keyed", which is FALSE — the re-key primitives (`rekeyVault`/`performCompleteRekey`/tRPC
  `membership.rekey`) have ZERO client/UI callers and the app's own settings page
  (`AccessMembersSection.tsx:108`) explicitly says the vault key is NOT rotated on removal. Root
  independently re-derived B1 against git (claim is a `+` line in the range diff, absent in BASE;
  grep confirms no caller; in-app disclaimer confirmed) — legitimate FAIL (an untruthful security
  guarantee, exactly what HS-016 exists to catch). All other review dimensions clean: every kept
  claim backed by shipping code, cuts justified, crypto corrections accurate, FS-001 byte-identical,
  links resolve, no secrets, gate counts match. Review persisted `reviews/P20A-review-01.md`.
  Bounced to `p20a-implementer-01` for a one-sentence fix (rev 02). TWENTY of twenty-two
  requirements `passed` (HS-016, HS-021 remain).
- **Next action:** rev-02 B1 fix handback from `p20a-implementer-01` is VERIFIED CLEAN against git
  (linear single commit `e50cbb23`, parent `e5dc9f2`; delta = exactly 2 files —
  `SecuritySection.tsx` one-line copy fix + `evidence/P20A/implementation-02.md`; the false "vault
  is re-keyed" sentence is gone, replaced with the honest wording matching
  `AccessMembersSection.tsx` disclosure; FS-001 blob `010f3c93…` byte-identical; no new casts;
  canary==1; scratch SHA `9fcdc51e…` unchanged). Row moved `implementing -> reviewing` rev 02.
  Re-dispatching `p20a-reviewer-01` (retains rev-01 context; DISTINCT from implementer) to confirm
  B1 resolved over the rev-02 delta `e5dc9f2..e50cbb23` and re-run gates. On PASS integrate P20A
  (Commit A persist `reviews/P20A-review-02.md` + evidence; Commit B flip `passed` + apply the
  SOLE-package HS-016 authorized forward marker `- []` -> `- [x]` at scratch `:328` per
  PROCESS.md:261-273, advancing rolling SHA). Then P20B (HS-021) full cycle, then the P21 executable
  final audit.
- **Frozen sources:** `specs/human-scratch.md` at SHA-256
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b` and immutable
  `specs/008-transaction-percentage-allocations-settlement/spec.md` at SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes
- **Rolling scratch SHA-256:** `9fcdc51e0d45176f887383bfdc9406ff19caecf6d9dc885e8f4b78219d2761cb`
- **Authorized checked HS IDs:** HS-001, HS-002, HS-003, HS-004, HS-005, HS-006, HS-007, HS-008,
  HS-009, HS-010, HS-011, HS-012, HS-013, HS-014, HS-015, HS-017, HS-018, HS-019, HS-020
- **Active completion marker event:** none
- **Active P21 rollback batch:** none
- **Last ledger update:** 2026-07-27; **P20A / 02 `implementing -> reviewing`** (B1 fix handback
  verified clean; re-dispatching distinct reviewer over `e5dc9f2..e50cbb23`). Prior: **P20A / 01
  review FAIL -> bounced to `implementing` rev 02**. `p20a-reviewer-01` (DISTINCT from the
  implementer) returned **VERDICT: FAIL — 1 blocking finding (B1)** over `b79c77d..6509ce7c`, with
  all five gate counts re-run and matching the implementer exactly (typecheck 0; lint 0 errors/10
  pre-existing; format:check 14 pre-existing `specs/**` markdown only; test 1939/2 skipped; e2e
  163). **B1:** `SecuritySection.tsx:35` added a NEW sentence "Remove a member and the vault is
  re-keyed" — FALSE. Root independently re-derived against git: the sentence is a `+` line in the
  range diff (absent in BASE); `rekeyVault`/`performCompleteRekey`
  (`src/lib/crypto/rekey.ts:50,120`) + tRPC `membership.rekey` have ZERO client/UI callers (only the
  definition, barrel `crypto/index.ts:80-85`, and server-router doc-comments reference them); the
  sole member-removal UI `AccessMembersSection.tsx` calls only `membership.remove`; and the app's
  own copy at `AccessMembersSection.tsx:108` states the vault key IS NOT rotated on removal — a
  direct contradiction. This is an untruthful SECURITY guarantee (frozen `:328-329`; brief "no
  feature advertised before it is usable"), the exact failure HS-016 exists to catch → legitimate
  FAIL. Everything else verified CLEAN by the reviewer and spot-checked by root: every kept claim
  backed by shipping code (CSV+OFX, tags, aliases, percentage allocations, rules→imports,
  presence/collab, client-side encryption, phrase-or-passkey, local-first), every cut claim
  genuinely false (budgeting vaporware, MIT vs proprietary, dead links/wrong GitHub, absolutes),
  crypto corrections accurate (XSalsa20/HKDF; XChaCha20 presence-only), FS-001 byte-identical, all
  CTAs resolve, no secrets, no new casts. Review persisted `reviews/P20A-review-01.md`. New
  non-blocking **Q-P20A-04** recorded (dead-but-working re-key machinery never wired to a caller —
  whether the product SHOULD re-key on removal is a separate out-of-scope decision). Bounce is
  required work to complete committed scope (NOT a scope reduction) → no adjudicator, no pause. P20A
  -> `implementing` rev 02 at BASE `c9c7874`; bounced to `p20a-implementer-01` for a one-sentence
  fix (delete/replace the false re-key sentence with the honest in-app wording). Rolling scratch SHA
  `9fcdc51e…` unchanged; TWENTY of twenty-two requirements `passed`; remaining packages P20A, P20B,
  P21.

## Package ledger

| Package | Scope          | Work / task                                                                         | Depends on           | Status    | Rev | BASE..HEAD                                                                           | Implementation evidence              | Review                                                      | Integration commit                                                             |
| ------- | -------------- | ----------------------------------------------------------------------------------- | -------------------- | --------- | --- | ------------------------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| P00     | control        | [Executable baseline](tasks/P00-baseline.md)                                        | —                    | passed    | 02  | `0ea864f5d0142530b2d524add228d3b51f162876..8f12d82ddb576af5cc8c6f04d32617d805e300de` | `evidence/P00/implementation-02.md`  | `reviews/P00-review-02.md`                                  | `7eb78075e0be7b6a881e59f03d2bfd2e202fc0f8`                                     |
| P01     | HS-002         | Upgrade dependencies by compatible safe chains                                      | P00                  | passed    | 02  | `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..71aa257bb9bdad736fb7ef7315854fce42c5cbb4` | `evidence/P01/implementation-02.md`  | `reviews/P01-review-02.md`                                  | `c2b89b6676271142ad6802dcf2a30acf8899df48`                                     |
| P02     | HS-017         | Animate UI evaluation, ADR, and representative migration only if justified          | P01                  | passed    | 02  | `19d73035b33b639f9927d2f78a55d74c44f65544..213100fadf5acea30aad7e90998bd575cdcd508c` | `evidence/P02/implementation-02.md`  | `reviews/P02-review-02.md`                                  | `d2dcf142a32f5d1f8e04a19a972a8e5bbf5989c7`                                     |
| P03     | HS-018         | TanStack Virtual PR #1100 release gate and `useFlushSync`                           | P01                  | passed    | 01  | `c60f605bd811d8920122a66f3d6743d8a3ac044d..b8d4b448f52022970ca388654be14d24e347deb5` | `evidence/P03/implementation-01.md`  | `reviews/P03-review-01.md`                                  | `ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34`                                     |
| P04     | HS-014         | Database/table/RLS threat model, migrations, and permission remediation             | P01                  | passed    | 02  | `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31` | `evidence/P04/implementation-02.md`  | `reviews/P04-review-02.md`                                  | `b905ecb810334ed9697f57140047964135ade6ea`                                     |
| P05     | HS-015         | Secure Supabase realtime authorization and correct live-op subscription             | P04                  | passed    | 13  | `92dfd4d002e8bcb2a6694c35aff8f713ba4689dc..b34dcf6ad53b6bb3fc6482180d2b0aaedd7fc1bc` | `evidence/P05/implementation-13.md`  | `reviews/P05-review-13.md`                                  | `8101bb2355a9894dd5cac9540afd38045973dd01`                                     |
| P06     | HS-010         | Remove unused user-state storage and dead API surface                               | P04                  | passed    | 01  | `a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1..95e91dbcb17ffb9600eaa6cb795336898297ebae` | `evidence/P06/implementation-01.md`  | `reviews/P06-review-01.md`                                  | `8e269ab9a6fc15ed6d845542b879e5499828134e`                                     |
| P07     | HS-011         | Evidence-led person/member/invite UX architecture and acceptance decision           | P04, P06             | passed    | 04  | `fe1871ce7dce1e831b57ee5656d38ce5c800aae3..dfffea3c19b110b6021b050b8d9e36b01ae75ab9` | `evidence/P07/implementation-04.md`  | `reviews/P07-review-04.md`                                  | `1f6cb96b27c8093f0ba2c319f32d3c79c8aab126`                                     |
| P08     | HS-012, HS-011 | Auto-person linkage and complete secure invite/member-management flow               | P05, P07             | passed    | 02  | `d2762f9..d40b854`                                                                   | `evidence/P08/implementation-02.md`  | `reviews/P08-review-02.md`                                  | PASS; A `a1e1b2d`; B markers HS-011/012                                        |
| P09     | HS-006         | Loro UndoManager integration, controls, shortcuts and action grouping               | P01                  | passed    | 02  | `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed..418234e28ac649e03ce8ad184d08a8a2f2416149` | `evidence/P09/implementation-02.md`  | `reviews/P09-review-02.md`                                  | `59bf82e894e45e034858e25255240701a3afb0b8`                                     |
| P10     | HS-003         | Encrypted Loro EphemeralStore presence and active transaction                       | P05, P08             | passed    | 01  | `54a88ae..71c378c`                                                                   | `evidence/P10/implementation-01.md`  | `reviews/P10-review-01.md`                                  | PASS; A `31ad9b5`; B row -> passed + HS-003 marker `1b56b21c… -> 9fcdc51e…`    |
| P11A    | HS-004         | Alias schema, resolution, mutation invariants, migration and atomic bookkeeping     | P09                  | passed    | 04  | `eb5ab2e215130c358130d5411a92b51951c3c53a..fb72abdaf531dff40c59f6b3525fb1b9ce50f805` | `evidence/P11A/implementation-04.md` | `reviews/P11A-review-04.md`                                 | `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`                                     |
| P11B    | HS-004         | Alias management and transaction-cell pointer/keyboard UX                           | P11A                 | passed    | 01  | `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f..e35109dfe7b02bdb4058445f44d03a6dd678457b` | `evidence/P11B/implementation-01.md` | `reviews/P11B-review-01.md`                                 | `0426866fa66cc022efca6d74cd5088d586d3d11b`                                     |
| P11C    | HS-004         | Alias import/manual/shared flows, performance hardening and exhaustive tests        | P11B                 | passed    | 03  | `0426866fa66cc022efca6d74cd5088d586d3d11b..daab038ee741faa9f92a373b27efe0c8fe8940db` | `evidence/P11C/implementation-03.md` | `reviews/P11C-review-03.md`                                 | `78e2f978f8d258d8c4d379f53e75089a2ce975db`                                     |
| P12     | HS-005         | Bounded requestAnimationFrame GC for buckets and alias symlinks                     | P11C, P09            | passed    | 08  | `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..a2a31839f6bb57855fa60b8cfcc06feed069cafa` | `evidence/P12/implementation-08.md`  | `reviews/P12-review-08.md`                                  | `f8cbb5a8caacb763c0bb77199595a5ee332ab729`                                     |
| P13     | HS-001         | Persisted normal empty Add Transaction rows and grid navigation                     | P11C, P09            | passed    | 03  | `415ea080b3b19191fd71601742056a619b4a3080..9f307e200676711ca2a3ba81bd816314807434ad` | `evidence/P13/implementation-03.md`  | `reviews/P13-review-03.md`                                  | `7a04338fa7c3f68463d12d11082bc56e87c1872b`                                     |
| P14     | HS-008         | Import lineage, immutable original amount, tooltip and delete-import behavior       | P09                  | passed    | 04  | `b9105028926d24a5a0c5454777a6c33379ca606a..305d6613673cf200d456276c076463b68c075500` | `evidence/P14/implementation-04.md`  | `reviews/P14-review-04.md`                                  | `a2182116db08200b8b4df28412512b9ca3406aa2`                                     |
| P15     | HS-013         | Whole transaction/import-list file drop targets                                     | P14                  | passed    | 02  | `b3e96ba9e9487d13df56956d220fffca63d6482d..91931688ef9463576b757a097968af543a4b8a75` | `evidence/P15/implementation-02.md`  | `reviews/P15-review-02.md`                                  | `9c5d7be8ee4cf7c3fda5f1a7320c053362672e3a`                                     |
| P16A    | FS-001, HS-009 | Allocation/ownership validation, remainder/effective shares and exact apportionment | P01                  | passed    | 02  | `1b42d27e11494a167a4768e0c2c308010aa51651..f84f66758708529c44342313e8632ee8b7dcead3` | `evidence/P16A/implementation-02.md` | `reviews/P16A-review-02.md`                                 | `41f5760f77c1a93ab650a93912bfaf3c0b627ab0`                                     |
| P16B    | FS-001         | Sole canonical settlement engine, eligibility, currencies, netting and traceability | P16A                 | passed    | 05  | `4c102600240e2804b801c2a320e10164defb14ea..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c` | `evidence/P16B/implementation-05.md` | `reviews/P16B-review-05.md`                                 | `136678a0ac864cf2d120b2b5b896d4fadcabcdd1`                                     |
| P16C    | FS-001, HS-009 | CRDT per-key/complete-set APIs and every mutation, hydration and history path       | P16A, P16B, P09, P14 | passed    | 02  | `0a7c9a49722ddc4d955f910af6dbb19cfffbd600..207e8c5758a48e66980b95eaeff51c0e5a605f7e` | `evidence/P16C/implementation-02.md` | `reviews/P16C-review-02.md`                                 | `e0f06f7fb60ce08ef2f75b0a9ca7769630a2a55c`                                     |
| P16D    | FS-001, HS-009 | Actual grid/add-row person columns, virtualization, history and presence UX         | P16C, P13            | passed    | 01  | `3a5081ac37e09817e0d02ae8799469d1bf09dad5..b5ebc2a8edbf5e1fc522873fb5ee7455266a3bcc` | `evidence/P16D/implementation-01.md` | `reviews/P16D-review-01.md`                                 | `47867d506978a3f571ef0feef6185e9436d5a908`                                     |
| P16E    | FS-001         | People obligations/issues/source UX plus full integration, E2E, manual and perf     | P16D, P08, P11C      | passed    | 02  | `191d070..bb12e0c`                                                                   | `evidence/P16E/implementation-02.md` | `reviews/P16E-review-02.md`                                 | PASS; A `b0023f6`; B control -> passed (FS-001 markerless)                     |
| P17A    | HS-007         | Automation schema/migration, exact matcher, precedence, preferences, import engine  | P11C, P14, P16E      | passed    | 01  | `a09c4b4..ee83b1b`                                                                   | `evidence/P17A/implementation-01.md` | `reviews/P17A-review-01.md`                                 | PASS; A `81401bf`; B row -> passed (HS-007 markerless; unchecked until P17B-D) |
| P17B    | HS-007         | Shared rule editor and automations-page UX                                          | P17A, P02            | passed    | 01  | `5e2ddd0..f0d3a37`                                                                   | `evidence/P17B/implementation-01.md` | `reviews/P17B-review-01.md`                                 | PASS; A `cef9f2b`; B row -> passed (HS-007 markerless; unchecked until P17C-D) |
| P17C    | HS-007         | Description inline proposals, robot drift state and scoped application              | P17B                 | passed    | 01  | `0d3de91..ce82cb5`                                                                   | `evidence/P17C/implementation-01.md` | `reviews/P17C-review-01.md`                                 | PASS; A `ea2ad75`; B row -> passed (HS-007 markerless; unchecked until P17D)   |
| P17D    | HS-007         | Tags/allocation parity, bulk/new application, performance and polish                | P17C                 | passed    | 01  | `27ac503..aad518e`                                                                   | `evidence/P17D/implementation-01.md` | `reviews/P17D-review-01.md`                                 | PASS; A `c434da2`; B row -> passed + HS-007 marker `df8ad9ce… -> 1b56b21c…`    |
| P18     | HS-019         | Password-manager-compatible recovery phrase creation and unlock                     | P01                  | passed    | 01  | `493bf19d3219f44efd4d4437fd8b0e33d012fba9..4cda92d40e9cc5b6490636c25d99b655905cb40a` | `evidence/P18/implementation-01.md`  | `reviews/P18-review-01.md`                                  | `fa9ae8d0b6b7948bd2c4a508ad869d5d6955a6a1`                                     |
| P19     | HS-020         | WebAuthn PRF passkeys sharing the vault identity secret                             | P04, P06, P18        | passed    | 02  | `e72befd9ba1b2cbbf5c189b7d855e47cc752240e..bb8a557d37190058c68b2cebfe721d3e15f18629` | `evidence/P19/implementation-02.md`  | `reviews/P19-review-02.md`                                  | `c06c851669f00093d1c78653125f784a48b1ed80`                                     |
| P20A    | HS-016         | Truthful marketing copy and responsive feature presentation                         | P17D, P19            | reviewing | 02  | `e5dc9f2..e50cbb23119d8b916d0100f36b86cce6f6a04392` (rev 02 B1 fix, verified)        | `evidence/P20A/implementation-02.md` | `reviews/P20A-review-01.md` (rev 01 FAIL); rev 02 in review | —                                                                              |
| P20B    | HS-021         | Full-codebase style-guide/code-quality sweep after all feature work                 | P20A                 | queued    | —   | —                                                                                    | —                                    | —                                                           | —                                                                              |
| P21     | control        | [Executable final audit](tasks/P21-final-audit.md)                                  | all prior            | queued    | —   | —                                                                                    | —                                    | —                                                           | —                                                                              |

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

| Requirement | Frozen source                     | Packages                     | Completion recording                       | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | --------------------------------- | ---------------------------- | ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HS-001      | human scratch block               | P13                          | authorized marker after package PASS       | passed | P13 integration `7a04338fa7c3f68463d12d11082bc56e87c1872b`; `reviews/P13-review-03.md`; marker `aa8a1f56… -> b09454de…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-002      | human scratch block               | P01                          | authorized marker after package PASS       | passed | P01 integration `c2b89b6676271142ad6802dcf2a30acf8899df48`; `reviews/P01-review-02.md`; marker `b91ca932… -> dcd03b23…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-003      | human scratch block               | P10                          | authorized marker after package PASS       | passed | P10 integration (Commit B); `reviews/P10-review-01.md`; `evidence/P10/implementation-01.md`; marker `1b56b21c… -> 9fcdc51e…`                                                                                                                                                                                                                                                                                                                                                        |
| HS-004      | human scratch block               | P11A, P11B, P11C             | authorized marker after all package PASSes | passed | P11A integration `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`, P11B `0426866fa66cc022efca6d74cd5088d586d3d11b`, P11C `78e2f978f8d258d8c4d379f53e75089a2ce975db`; reviews `P11A-review-04.md`/`P11B-review-01.md`/`P11C-review-03.md`; marker `c2b986fd... -> 2c52bd78...`                                                                                                                                                                                                             |
| HS-005      | human scratch block               | P12                          | authorized marker after package PASS       | passed | P12 integration `f8cbb5a8caacb763c0bb77199595a5ee332ab729`; `reviews/P12-review-08.md`; marker `2c52bd78… -> aa8a1f56…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-006      | human scratch block               | P09                          | authorized marker after package PASS       | passed | P09 integration `59bf82e894e45e034858e25255240701a3afb0b8`; `reviews/P09-review-02.md`; marker `753be6b7… -> c2b986fd…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-007      | human scratch block               | P17A, P17B, P17C, P17D       | authorized marker after all package PASSes | passed | P17A `81401bf`/P17B `cef9f2b`/P17C `ea2ad75`/P17D integration (Commit B); `reviews/P17D-review-01.md`; marker `df8ad9ce… -> 1b56b21c…`                                                                                                                                                                                                                                                                                                                                              |
| HS-008      | human scratch block               | P14                          | authorized marker after package PASS       | passed | P14 integration `a2182116db08200b8b4df28412512b9ca3406aa2`; `reviews/P14-review-04.md`; marker `b09454de… -> f0adfef6…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-009      | human scratch block               | P16A, P16C, P16D             | authorized marker after all package PASSes | passed | P16A integration `41f5760f77c1a93ab650a93912bfaf3c0b627ab0`, P16C `e0f06f7fb60ce08ef2f75b0a9ca7769630a2a55c`, P16D `47867d506978a3f571ef0feef6185e9436d5a908`; reviews `P16A-review-02.md`/`P16C-review-02.md`/`P16D-review-01.md`; marker `ce52d7df… -> 9a0f6633…`                                                                                                                                                                                                                 |
| HS-010      | human scratch block               | P06                          | authorized marker after package PASS       | passed | P06 integration `8e269ab9a6fc15ed6d845542b879e5499828134e`; `reviews/P06-review-01.md`; marker `c74a2a78… -> 753be6b7…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-011      | human scratch block               | P07, P08                     | authorized marker after all package PASSes | passed | P07 PASS `1f6cb96b...` + P08 PASS integration A `a1e1b2d`; marker `:307` applied; rolling `df8ad9ce...`                                                                                                                                                                                                                                                                                                                                                                             |
| HS-012      | human scratch block               | P08                          | authorized marker after package PASS       | passed | P08 PASS integration A `a1e1b2d`; marker `:313` applied; rolling `df8ad9ce...`                                                                                                                                                                                                                                                                                                                                                                                                      |
| HS-013      | human scratch block               | P15                          | authorized marker after package PASS       | passed | P15 integration `9c5d7be8ee4cf7c3fda5f1a7320c053362672e3a`; `reviews/P15-review-02.md`; marker `f0adfef6… -> ce52d7df…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-014      | human scratch block               | P04                          | authorized marker after package PASS       | passed | P04 integration `b905ecb810334ed9697f57140047964135ade6ea`; `reviews/P04-review-02.md`; marker `db97178a… -> c74a2a78…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-015      | human scratch block               | P05                          | authorized marker after package PASS       | passed | marker `specs/human-scratch.md:325` `[x]`; review `reviews/P05-review-13.md` PASS 0 blocking; integration `8101bb2`                                                                                                                                                                                                                                                                                                                                                                 |
| HS-016      | human scratch block               | P20A                         | authorized marker after package PASS       | queued | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| HS-017      | human scratch block               | P02                          | authorized marker after package PASS       | passed | P02 integration `d2dcf142a32f5d1f8e04a19a972a8e5bbf5989c7`; `reviews/P02-review-02.md`; marker `dcd03b23… -> 5d283ab1…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-018      | human scratch block               | P03                          | authorized marker after package PASS       | passed | P03 integration `ca0c42f8e5fcfe02f0deb0e3df8b39b21faa0e34`; `reviews/P03-review-01.md`; marker `5d283ab1… -> db97178a…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-019      | human scratch block               | P18                          | authorized marker after package PASS       | passed | P18 integration `fa9ae8d0b6b7948bd2c4a508ad869d5d6955a6a1`; `reviews/P18-review-01.md`; marker `9a0f6633… -> c4121a48…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-020      | human scratch block               | P19                          | authorized marker after package PASS       | passed | P19 integration `c06c851669f00093d1c78653125f784a48b1ed80`; `reviews/P19-review-02.md`; marker `c4121a48… -> ddd53142…`                                                                                                                                                                                                                                                                                                                                                             |
| HS-021      | human scratch block               | P20B                         | authorized marker after package PASS       | queued | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| FS-001      | immutable whole-file feature spec | P16A, P16B, P16C, P16D, P16E | ledger completion; source never edited     | passed | P16A `41f5760f77c1a93ab650a93912bfaf3c0b627ab0`, P16B `136678a0ac864cf2d120b2b5b896d4fadcabcdd1`, P16C `e0f06f7fb60ce08ef2f75b0a9ca7769630a2a55c`, P16D `47867d506978a3f571ef0feef6185e9436d5a908`, P16E A `b0023f6`; reviews `P16A-review-02.md`/`P16B-review-05.md`/`P16C-review-02.md`/`P16D-review-01.md`/`P16E-review-02.md`; canonical `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` 715 lines/25,441 bytes verified byte-identical, source never edited |

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
evidence SHA-256 `71eaaebfe3c95a23b387b794f02e703bacba8de7fc8166810b93a980861a3e9b`; fresh pgTAP
49/49, seeded upgrade 14/14, unit 1,153/1,153 and retries-disabled E2E 79/79 reported. Mandatory
proposal `Q-PROPOSAL-P04-01-01` records unsigned GET operation/input plus claimed-hash public user
endpoints; independent review receives literal range
`9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..20a489dc51542ee0c681cfba0a33aee820d70221` and exact new
output `reviews/P04-review-01.md`. Scratch remains `db97178a…`; full format remains red only on the
frozen HS-018 marker shape routed to R-024/P20B/P21.

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
`ae6b1797e5c874fc48114f309bb9a7e02220a246` includes revision-01 product and immutable
failure/control commits. Exact 13-path authority from review-01; sole new evidence
`evidence/P04/implementation-02.md`; close F-001/F-002 with canonical signed POST, verified
self-only user access, registration-session rollback safety and counterfactual URL/procedure/input
tests. Revision-01 artifacts remain immutable; scratch stays `db97178a…` with no HS-014 marker.

**2026-07-20T06:30:16+10:00 — P04/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test HEAD `dbcf180e829c81a218e9a73791e40902c4f9eb31`; exactly 13 authorized
paths; evidence SHA-256 `987faf8217f57cd5294eda05884e402e22972d80a9f86d5ca11a6c9bb104509f`. Reported
green: focused 32/32, unit 1,166/1,166, fresh pgTAP 49/49, seeded upgrade 14/14, authorized E2E
14/14, critical repeats 9/9, full E2E 80/80 retries zero, build and installed CLI
new/existing/outsider request inspection. Exact cumulative review range is
`9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31`; new immutable
output `reviews/P04-review-02.md`; review-01 remains immutable. Scratch stays `db97178a…` and HS-014
remains unchecked.

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

**2026-07-20T06:40:00+10:00 — HS-014 `completion_pending -> passed`:** Exact marker-only `[] -> [x]`
finalized after P04 review `reviews/P04-review-02.md` and integration
`b905ecb810334ed9697f57140047964135ade6ea`; private comparison copy removed; all 21 normalized
blocks byte-match SCOPE; checked set is exactly HS-002/HS-014/HS-017/HS-018; FS-001 remains exact.
Scratch SHA `db97178a… -> c74a2a78…`, 350 lines and 24,243 bytes.

**2026-07-20T06:42:37+10:00 — P05/01 `queued -> implementing`:** Dependency P04/HS-014 passed; exact
BASE/pre-implementation HEAD `007651beb814d98646aa2e786801b647e2abd0b5`; sole evidence
`evidence/P05/implementation-01.md`. Current primary-source ADR must precede mutation and separate
origin/TLS controls from authorization. Required implementation binds short-lived credentials to P04
verified identity, exact current vault membership/table/purpose, subscribes only permanent
`vault_ops`, and proves expiry/removal/reconnect plus genuine push-driven two-context sync. Scratch
remains `c74a2a78…`; no HS-015 marker.

**2026-07-20T07:17:55+10:00 — P05/01 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`29e4a1014d1cfa8ad5614b5fdadeba1890523554`; 19 authorized product/config/migration/test paths;
evidence SHA-256 `1016c7c479e20c9bc29da3e03d80a21bbdac34a78316e6e1f55539029a9f9066`. Reported green:
focused 8/8, unit 1,170/1,170, fresh pgTAP 69/69, upgrade 18/18, lint/type/build. Retries-zero E2E
is candidly 79/81: genuine member delivery misses 15 seconds and existing vault-settings captures
the same repeated manager/Presence teardown failure. Q-PROPOSAL-P05-01-01 requests exact revision-02
`vault-provider.tsx` authority after 11 sync/12 presence grants in seconds; no scope widening or
HS-015 marker. New immutable output `reviews/P05-review-01.md`.

**2026-07-20T07:33:48+10:00 — P05/01 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `52350e039f75934e59ec6f431fba4d041ef9df6f4e685411608fe86e06436ba5`. F-001 Critical
reproduces genuine corrected-secret E2E 7/9 and isolated 0/1: permanent owner op is not pushed to
the member within 15 seconds, Presence/401 teardown errors recur and grants remain live. F-002 High
proves implementer Q-01-01's cause is impossible because `SyncStatusProvider` is below its consumer;
status callbacks are static no-ops and current churn remains unattributed. F-003 Medium proves plain
local/CI Playwright lacks a hermetic JWT-secret bootstrap and fails 0/9. Reviewer independently
passes focused 8/8, unit 1,170/1,170, fresh pgTAP 69/69, upgrade 18/18, lint/type/build; database
and generated/browser state cleaned. Corrected Q-PROPOSAL-P05-01-02 transcribed as Q-003 with exact
six revision-02 paths; implementer proposal is superseded. No HS-015 marker; scratch stays
`c74a2a78…`.

**2026-07-20T07:34:45+10:00 — P05/01 `changes_requested -> changes_requested`:** Immutable
revision-01 evidence, corrected review, Q-003, R-004/R-025 and failure state persisted in
`c8f2954f6119316af77dd56c6db9a2fae27ea4f2`; review-01 is immutable. Revision-02 dispatch may proceed
after this artifact-commit reference is durably recorded; no marker/frozen-source change.

**2026-07-20T07:36:12+10:00 — P05/02 `changes_requested -> implementing`:** Original BASE
`007651beb814d98646aa2e786801b647e2abd0b5`; pre-implementation HEAD
`72c90d132110d02641502b64d6263920abe0749d` includes revision-01 product and immutable
failure/control commits. Exact six-path authority from Q-003/review-01; sole evidence
`evidence/P05/implementation-02.md`. Instrument current sync/Presence churn, repair provider
topology and stable dependencies, preserve true change-driven recreation, make local/CI Playwright
secret bootstrap hermetic/fail-fast, and turn the genuine 7/9 and 0/1 reds green without reopening
transport or weakening assertions. No HS-015 marker; scratch remains `c74a2a78…`.

**2026-07-20T08:00:33+10:00 — P05/02 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`e865023f6001704be0304bed4e75e76956854ea6`; exactly six authorized topology/config/E2E paths;
evidence SHA-256 `6d96237408e29392901f1fecee164843753ff8c71cc11967a3feac9084e0cf30`. F-002
topology/status and F-003 ordinary hermetic startup are corrected, but fresh ordinary isolated E2E
remains 0/1: member observes zero `postgres_changes` frames in 15 seconds and private Presence is
denied. Sanitized attribution rules out SyncManager/CRDT/UI and identifies migration 007's global
exact-scope initial rotation plus actual private join extension policy. Complete
Q-PROPOSAL-P05-02-01 requests forward migration 008 and two database audits while retaining six
paths; no widening, full green claim or HS-015 marker. New immutable output
`reviews/P05-review-02.md`; review-01 remains immutable.

**2026-07-20T08:08:43+10:00 — P05/02 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `1bce7bce9d94b628d2068cb06edb2248f5c849f40c05afabb87af9cd70f810dd`. F-002 and F-003 are
closed: provider topology/stable cleanup and ordinary env-unset process-memory secret bootstrap
pass. F-001 remains Critical and deterministically migration-owned: isolated E2E is 0/1 after
initial bounds, member receives zero `postgres_changes` kinds for 15 seconds, private Presence is
repeatedly unauthorized, and final sanitized aggregates are sync
5/3-live/2-revoked/0-expired-unrevoked and Presence 10/3/7/0. Independent focused 8/8, unit
1,170/1,170, lint/type/build/format, fresh reset and pgTAP 69/69 pass. Q-PROPOSAL-P05-02-01 is
transcribed as Q-004 with exactly nine revision-03 paths: the retained six plus forward migration
008 and the fresh/legacy database audits. No SyncManager, transport, CRDT, Loro or scratch
expansion; HS-015 remains unchecked at `c74a2a78…`.

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
nine. Evidence SHA-256 `02ecbb1b2ca227bfbd88804aad47a3a4f240d1ccd54f2210769b5e7cc9815a17`. Migration
008 makes concurrent grant rotation/revoke independent, bounds stale pruning and permits the actual
least-privilege private Presence join; fresh pgTAP is 87/87 and seeded 005-to-008 is 27/27 with
encrypted data preserved. Presence is clean, but decisive isolated E2E remains red: member sends
four joins with two Postgres bindings while database permanent-op/authenticated/live- grant
subscription counts and incoming events are all zero. Full Vitest 1,170/1,170, typecheck and focused
lint/format/diff pass; broad browser/build/CLI gates stop after the deterministic failure.
Q-PROPOSAL-P05-03-01 requests exactly the retained nine plus Realtime client registration and its
unit test, with no SyncManager/CRDT/Loro widening. New immutable output `reviews/P05-review-03.md`;
no PASS claim or HS-015 marker.

**2026-07-20T08:45:53+10:00 — P05/03 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `72934172c159a290695b895ddf15e85933a60cf25b240811e264dc7805c56348`. Migration 008, fresh
87/87, seeded upgrade 27/27 and clean private Presence are accepted; F-002 Medium requires the
aggregate helper to check exact current scope. F-001 Critical remains live-delivery red, but the
owner is corrected: Realtime v2.80.7 reports cached migrations 68 versus persistent internal schema
79, and its three-field filter encoder is incompatible with the four-field composite. Ordinary E2E
is 0/1 with outgoing bindings but subscriptions 0/0/0; a public-channel diagnostic follows the same
CDC path and cannot justify the implementer's transport-mode proposal. Q-PROPOSAL-P05-03-01 is
rejected and reviewer Q-PROPOSAL-P05-03-02 is transcribed as Q-005: safely recreate only the
verified- empty exact project and permit only `tests/e2e/helpers/realtime.ts` in revision 04.
R-004/R-021 are updated; no product/config/dependency/migration/unit/SyncManager/CRDT/Loro or marker
authority.

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
`fc7832cc801210332c960b38d37bdfc87c6c3ae5d9709c10ccf6ed3d8928fb2c`. Guarded empty-project recreation
produces Realtime v2.112.6 with 79 matching internal migrations, four active filter fields and no
mismatch. Ordinary runs register at least two authenticated exact-live-grant subscriptions and
genuinely deliver the imported op/UI update. The next inline edit writes its permanent op but hits
the 120-second global timeout; a bounded timing run proves the spec reuses an
original-value-qualified locator after `fill` changed that value, spending 109.747 seconds at
`locator.press`. Q-PROPOSAL-P05-04-01 requests adding only `tests/e2e/realtime-security.spec.ts` for
a stable/re-resolved Enter target, without timeout/assertion weakening. Static helper/type gates,
final compatible empty DB and cleanup pass; broader acceptance stops at this deterministic test
owner. New immutable output `reviews/P05-review-04.md`; no PASS claim or HS-015 marker.

**2026-07-20T09:15:40+10:00 — P05/04 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `dd629bc49ca8e0694406b113fbd3eb23996da6def212a852ed94a289a1449d33`. Compatible Realtime
v2.112.6/79/four-field/no-mismatch service state, strengthened helper, exact-grant subscriptions and
genuine incoming import/UI delivery are accepted; fresh 87/87, upgrade 27/27, unit 1,170/1,170 and
static gates pass. F-001 High remains solely test-owned: the old-value locator is lazily re-resolved
after `fill`, so Enter never occurs and the unchanged 120-second timeout expires with two permanent
ops. Q-PROPOSAL-P05-04-01 is transcribed as Q-006 with exact sole revision-05 path
`tests/e2e/realtime-security.spec.ts`; no timeout/assertion weakening or helper/
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
`a3177aa1cabe07835c170e5c37eb8da7dc3f074fc82e90d6f03fe3245729349f`. The stable new-value locator
passes genuine incoming import, edit and encrypted delete, then the unchanged expiry poll fails
immediately because legacy `countRealtimeGrants` uses a service-role REST HEAD that migration 007
intentionally denies (HTTP 403); post-run aggregates show 15 grants/7 permanent ops. Complete
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
`Math.max(2, initial + 1)` under unchanged 70-second/1-second polling. No
helper/privilege/migration/ product/config/dependency/transport/other-test widening or marker;
R-004/R-009 updated and scratch remains `c74a2a78…`.

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
aggregate total at least `Math.max(2, initial + 1)` under unchanged 70-second/1-second polling. Run
the complete live/lifecycle/security/fresh/upgrade/full browser/static/CLI matrix. No helper/
privilege/product/config/dependency/migration/transport/other-test/CRDT/Loro or HS-015 marker
authority; scratch remains `c74a2a78…`.

**2026-07-20T09:46:41+10:00 — P05/06 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`95acc3b2e935b9bdf2788f301a79b490d2d5d509`; revision diff is only the authorized Realtime spec (41
insertions/35 deletions, mostly formatter wrapping). Evidence SHA-256
`1c71d43ea08c7b9abc030126dc4444066f92d618bd0d84cce2cfe3ab17132599`. Baseline-relative legal refresh
proof passes ordinary 1/1 and repeated 3/3 with genuine subscription/import/edit/delete, removal
denial and zero runtime errors. Fresh 87/87, upgrade 27/27, unit 1,170/1,170, type/lint/build pass.
Full retries-zero E2E is 80/81 with the revised journey green; the sole vault-settings failure
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

> =1 per purpose. Q-PROPOSAL-P05-06-01 is transcribed as Q-008 with sole revision-07
> `tests/e2e/vault-settings.spec.ts` and unchanged bounds. No helper/provider/product/transport/
> migration/config/other-test widening; R-004/R-009 updated and HS-015 remains unchecked.

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
fresh/upgrade/unit/static/build and installed CLI charter. No bound/helper/revision-06
spec/provider/ product/config/dependency/migration/transport/other-test/CRDT/Loro or HS-015 marker
authority; scratch remains `c74a2a78…`.

**2026-07-20T10:04:13+10:00 — P05/07 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`c2203faa84a1590263014d6426e2f854cdc036e8`; only the authorized vault-settings spec changes (19
insertions/5 deletions). Evidence SHA-256
`fa6296b49fac4eec9bd3afe9be9a9cad36241b7207c5543d4dce60e4081e32dd`. Exact isolated run reaches final
attribution but pre-lock Presence baseline is zero and delta remains 4 versus <=2:
`createNewIdentity` returns on URL/local-storage readiness before asynchronous Presence completion.
Q-PROPOSAL-P05-07-01 requests the same sole spec path to require exactly one visible `(online)`
Presence title within the existing 15-second behavior bound before taking the unchanged baseline;
source renders it only after connected synchronized Presence state. No sleep/counter threshold/
retry/bound/provider/product widening; further gates stop after deterministic red, final compatible
empty DB/cleanup/frozen sources pass. New immutable output `reviews/P05-review-07.md`; no PASS or
HS-015 marker.

**2026-07-20T10:13:04+10:00 — P05/07 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `6698876b9b654bff6cd00e3bf54d4ac45f86cd9ba7348fc30a4b33a3048bde7c`. Immediate baseline zero
and final delta Presence 4 versus 2 are reproduced. F-001 High confirms visible online state is a
causal barrier after both initial authorization requests, but corrects the selector because hidden
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
counter/retry/bound/helper/provider/product/config/migration/other-test/CRDT/Loro or marker
authority; scratch remains `c74a2a78…`.

**2026-07-20T10:23:24+10:00 — P05/08 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`a4d62601dbb0ea17ad43308b39aabd81acbaf7fe`; only the authorized vault-settings spec changes (2
insertions). Evidence SHA-256 `dcfb79499ab725eb4881899fcf298804123d575d557ff9b7943772f9ed0f0c8d`.
Focused lock/unlock passes 1/1 and repeated vault-settings passes 3/3 with exactly one visible
online avatar before unchanged deltas/bounds. Paired Realtime is 2/3: middle run sees global
subscription counts 6/6/5 because one prior-fixture row lingers during async teardown; all
subscriptions are zero after contexts close. Q-PROPOSAL-P05-08-01 requests exactly helper + Realtime
spec to validate a vault ID, filter outer claims to the current vault and retain aggregate
equality/bounds, with no wait/retry/teardown/product widening. Remaining gates stop after
deterministic red; final compatible empty DB/cleanup/frozen sources pass. New immutable output
`reviews/P05-review-08.md`; no PASS or HS-015 marker.

**2026-07-20T10:30:59+10:00 — P05/08 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `46c4403f0d8364e49500cb8cf5e6cb8f09f151d07e69bdcb9c7f1ac6310e58d4`. Readiness focused 1/1
and vault-settings repeated 3/3 are accepted. Paired Realtime independently remains 2/3 with exact
6/6/5 contamination and zero subscriptions post-close. F-001 High confirms the global helper
includes a revoked prior-vault teardown row. Q-PROPOSAL-P05-08-01 is transcribed as Q-010 with exact
helper+Realtime-spec revision-09 scope, strict UUID validation and outer current-vault claims
filter, preserving all equalities/bounds. No wait/retry/teardown/product/schema/config widening;
R-004/R-009 updated, cleanup/frozen sources pass and HS-015 remains unchecked.

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
`55e3cb60b39418e947503a189e78b89cd4292673`; sole unit-test path (7 insertions/1 deletion). Evidence
SHA-256 `ab7d6806d7937bbbdb9f1bac7b562fe12e93dc04657cd29554b3878b6f897fb0`. Date-only repair passes
focused 5/5, full unit 1,170/1,170, lint/type/build, fresh 87/87, seeded upgrade 27/27, isolated
Realtime 3/3 and full zero-retry E2E 81/81. Installed CLI then proves a same-identity duplicate has
live Presence/subscription but misses its sibling's persisted op beyond 15 seconds; source
inspection attributes this to the `SyncManager` same-pubkey early return. Q-PROPOSAL-P05-10-01
requests exact manager + true Chrome duplicated-tab regression paths. The remaining CLI charter
stops unassessed; final compatible empty DB/cleanup/frozen sources pass. New immutable output
`reviews/P05-review-10.md`; no PASS or HS-015 marker.

**2026-07-20T11:26:41+10:00 — P05/10 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `51bd77e62afb1adb08cd617db974d1df85f51eda7c7b06c20cd42d838aa7c9f8` accepts Date-only closure
with focused 5/5 and full unit 1,170/1,170. The installed CLI independently reproduces two
same-identity live tabs with Presence 2/subscriptions 2, creator row 1/server op 1, receiver row 0
after 15 seconds and zero console errors. The exact owner is the `SyncManager` same-pubkey early
return; independent Loro probes prove self/repeated import version stability and zero local-update
callbacks. Q-012 transcribes the tightened exact revision-11 manager + true Chrome duplicate spec
scope with both tabs row 1, fixture op 1, receiver push delta 0 and zero browser errors, retaining
all bounds/security. R-004/R-009 updated; final empty compatible DB, cleanup, scratch
21-block/checked- set and immutable sources pass. HS-015 remains unchecked.

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
row 1, fixture op 1, receiver push delta 0 and zero errors within unchanged bounds while
backgrounded. Run focused/full unit, static/build/database, repeated/full zero-retry E2E and the
complete installed CLI charter. No
reload/focus/poll/sleep/retry/timeout/schema/config/dependency/other-path or marker authority;
scratch remains `c74a2a78…`.

**2026-07-20T11:48:43+10:00 — P05/11 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`7f0b0710e820b87be2ee8877a3b7693d90e5e505`; exact manager + duplicated-tab spec change (100
insertions/5 deletions). Evidence SHA-256
`2e57eb4e8540b364ceb8369bef5b508b4f9cc442e430723435503ee03d1bcb90`. True extension duplicate passes
focused 1/1, paired Realtime repeat 6/6, full zero-retry E2E 81/81 and proves rows 1/1, fixture op
1, receiver push delta 0 and zero errors; unit 1,170/1,170, static/build and both database audits
pass. Installed CLI then proves a genuinely hidden sibling misses the unchanged 15-second bound but
converges later without focus/reload/poll, distinct from the fixed permanent drop.
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
`7f0b0710e820b87be2ee8877a3b7693d90e5e505`; recheck triggers and safe-work boundary are durable, so
independent P06 dispatch may proceed without weakening or falsely completing HS-015.

**2026-07-20T12:18:34+10:00 — P06/01 `queued -> implementing`:** P04 dependency is passed; P05's
external gate is independent. Original BASE and pre-implementation HEAD are exact
`a7c0cb9a3ba0e4c66f25b53b1fa0883aeee968a1`. Dispatch authorizes migration 009 plus only the listed
router/schema/hook/dead-type/crypto-helper/database-audit/unit/E2E paths. Prove
`user_data.encrypted_data` is unused opaque state, preserve verified identity
rows/memberships/vaults and document irreversible blob deletion; remove dead state APIs without
replacement storage. Run fresh/upgrade, identity/onboarding/offline/duplicate/full/CLI gates. No
passkey/P05/other-path or marker authority; scratch remains `c74a2a78…`.

**2026-07-20T12:45:08+10:00 — P06/01 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`95e91dbcb17ffb9600eaa6cb795336898297ebae`; one commit across exactly 17 authorized paths. Evidence
SHA-256 `78fe921dbdd49e1a5ca5a499734f434a4e9715117499082110a5fb3450ae3f52`. Migration 009 drops only
unused `user_data.encrypted_data`, preserves identity timestamp and every normalized
vault/membership/op/snapshot field, revokes dead service UPDATE, and removes only proven- dead
procedures/Zod/types/crypto wrappers. Focused 10/10, unit 1,172/1,172, fresh 97/97, upgrade 40/40,
focused 3/3, repeated 63/63, full zero-retry E2E 81/81, lint/type/build/format/diff pass. Installed
CLI confirms empty signed register/get-or-create bodies, no removed endpoints, create/
unlock/refresh/duplicate/offline/mobile preference behavior and later-package UI limits. Final fresh
005–009 DB/service/cleanup/frozen sources pass; no proposal. New immutable output
`reviews/P06-review-01.md`; no PASS or HS-010 marker.

**2026-07-20T13:03:52+10:00 — P06/01 `reviewing -> reviewing`:** Independent PASS recommendation;
review SHA-256 `0580e4c8fc9f14d30d4c4d21a761fb56b8ff42953decd30564dda36efe4b64df`. Exact 17-path
range/evidence hash and sole-column target are verified. Reviewer independently passes focused
10/10, unit 1,172/1,172, fresh 97/97, seeded upgrade 40/40 plus exact identity/membership/ snapshot
SQL, changed E2E repeat 42/42, lint/type/build/type generation and installed CLI create/
unlock/refresh/duplicate/offline/mobile/network charter. Intentional blob loss is backup-only;
identity/normalized encrypted data and least privilege remain exact. No finding or Q; P05 external
and P08/P19 boundaries retained; final empty DB/cleanup/frozen sources pass. Integration, P06 PASS
and HS-010 marker remain pending.

**2026-07-20T13:04:49+10:00 — P06/01 `reviewing -> passed`:** PASS definition complete at exact
reviewed HEAD; immutable evidence/review, D-012 and R-003/R-007/R-013 state integrated in
`8e269ab9a6fc15ed6d845542b879e5499828134e`. No Q proposal; P05 external and P08/P19 ownership
remain. HS-010 `completion_pending` durably prepared from scratch SHA `c74a2a78…`; no marker changed
yet.

**2026-07-20T13:06:11+10:00 — HS-010 `completion_pending -> passed`:** Exact marker-only `[] -> [x]`
finalized after P06 review `reviews/P06-review-01.md` and integration
`8e269ab9a6fc15ed6d845542b879e5499828134e`; all 21 normalized blocks byte-match SCOPE and checked
set is exactly HS-002/HS-010/HS-014/HS-017/HS-018. Scratch SHA
`c74a2a782543d00880fa30a771be4e39c75d89889e484ee46570fb4a6cf0ecdd -> 753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`,
350 lines and 24,244 bytes; FS-001 remains exact.

**2026-07-20T13:07:23+10:00 — P07/01 `queued -> implementing`:** P04 and P06 dependencies are
passed; exact BASE/pre-HEAD `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`. This is a no-product
evidence/ADR range: inventory every People/Member/invite/key-wrap/route/UI/test path, compare
dedicated Settings vs People-owned vs linked hybrid architecture, select the safest reversible
default and define the exact P08 security/UX/data/test contract. Installed CLI must candidly record
discoverability and placeholder/unavailable behavior without direct-URL or secret bypass. P05's
external gate remains a P08 dependency; no code/commit/marker authority and scratch remains
`753be6b7…`.

**2026-07-20T13:27:06+10:00 — P07/01 `implementing -> ready_for_review -> reviewing`:** Valid empty
range remains exact at `fe1871ce7dce1e831b57ee5656d38ce5c800aae3`; no commit/product diff. Evidence
SHA-256 `2e5173cdf1df4fac4de3b64ecb2887a3c70a00d387e36298f5c9eb8eaa1164ad`. Discovery proves the
current generator unreachable, invite redemption placeholder/sender/route/ fragment flaws and
delete-first/non-atomic rekey gap. ADR selects linked hybrid: authoritative Vault Settings Access &
Members, optional financial Person linkage, member-only invites, real sender-bound fragment key
exchange and atomic key-epoch removal. It defines 29 normative P08 clauses,
threat/privacy/migration/reversal and mandatory real-browser contract; no Q. Read-only 39/39 crypto/
invite, 97/97 DB and 8/8 E2E pass; installed CLI confirms no discoverable access flow and P08
mobile/ zoom targets. P08 remains gated on D-011/P05 recheck. Final empty DB/cleanup/frozen sources
pass; new immutable output `reviews/P07-review-01.md`. No P07 PASS or HS-011 marker.

**2026-07-20T13:43:59+10:00 — P07/01 `reviewing -> changes_requested`:** Independent FAIL review
SHA-256 `296a5d0a17e2e1ae882422c3975d11c9ffc289c0a273ac52fb50e23af8b8381e` accepts the linked-hybrid
authority split but rejects two P08 clauses. F-001 proves discarding the old epoch key can make a
continuously authorized offline member's locally durable `pushed=false` operations undecryptable.
F-002 proves server SQL cannot atomically create client-encrypted CRDT Person/link state and
requires durable crash reconciliation after invite consumption. Q-014 selects an empty- range
revision-02 correction: active-only per-epoch envelopes plus an idempotent transition journal,
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

**2026-07-20T14:05:58+10:00 — P07/02 `implementing -> ready_for_review -> reviewing`:** Worker made
no commit and HEAD remains `033cb8f6d37208c1ba6ac0b0907672aa18e4ad6d`; original
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
F-001 Critical: planning does not atomically fence every sibling-tab IndexedDB append, so a stale
tab can create an unmapped old-epoch `pushed=false` operation after enumeration. F-002 High: the
full restatement dropped new-vault owner membership↔default-Person linkage required by HS-012. F-003
High: two distinct invites can claim one encrypted Person and converge to non-bijective links.
Revision 03 remains evidence-only and must add a persistent append-checked transition fence with
late-lineage proof, a crash-recoverable vault-creator linkage saga, and deterministic post-merge
repair that preserves the intended Person while creating the losing membership's deterministic
Person before success. No Q proposal; all other revision-02 clauses remain frozen. Independent 39/39
crypto, typecheck, fresh 005–009/97 pgTAP and repeated 16/16 E2E pass without pretending to execute
the proposed protocol. CLI reconfirms no current discoverable flow and inherited 200% mobile
regression. Cleanup, empty service state, exact HEAD/index/range, scratch/21 blocks, FS-001 and
SCOPE pass. P08 and both HS markers remain blocked.

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
account 100% ownership. Revision 04 must permanently store/dedupe only exact CRDT operation
identity, separate saga completion from each peer's actual update, bind later repair rounds to
observed causal frontier/claim operations, and link the existing default `Me` while preserving every
ownership/ reference. No Q; all other revision-03 clauses remain fixed. Current 39/39, typecheck,
fresh 005– 009/97 pgTAP, repeated 16/16 E2E and clean installed-CLI state pass without claiming
proposed protocol execution. Cleanup, zero DB rows, exact HEAD/index/write boundary, scratch/21
blocks, FS-001 and SCOPE pass. P08/markers remain blocked.

**2026-07-20T14:49:05+10:00 — P07/03 `changes_requested -> changes_requested`:** Immutable
revision-03 implementation evidence, independent FAIL review, R-006/R-027 updates and exact P07/
HS-011 state are persisted in artifact commit `196b190066f75465061a1524fc8c51d067a2ef42`. Revision
04 may proceed only after this reference is durably recorded; no executable, scratch, FS-001 or
SCOPE path changed.

**2026-07-20T14:50:27+10:00 — P07/04 `changes_requested -> implementing`:** Original BASE remains
`fe1871ce7dce1e831b57ee5656d38ce5c800aae3`; pre-implementation HEAD
`dfffea3c19b110b6021b050b8d9e36b01ae75ab9` includes immutable prior P07 artifacts/control. Worker
may write only `evidence/P07/implementation-04.md`, makes no commit and leaves executable/index
paths unchanged. Exact scope separates request/value idempotency from every peer-specific exact Loro
op, retains all distinct permanent operations, binds repair rounds to observed claim
operations/causal frontier so late claims force a newer repair, and links canonical
`person-default-me` to the owner membership while preserving default-account 100% ownership and
every reference. All sound revision- 03
fence/security/privacy/migration/reversal/export/accessibility tests remain. P08 stays blocked by
P07 and D-011/P05; scratch remains `753be6b7…`.

**2026-07-20T14:59:31+10:00 — P07/04 `implementing -> ready_for_review -> reviewing`:** Worker made
no commit; HEAD remains `dfffea3c19b110b6021b050b8d9e36b01ae75ab9` and cumulative range has only
root-integrated P07 artifact/control paths. Sole evidence `evidence/P07/implementation-04.md` is
1,019 lines/89,865 bytes at SHA-256
`313ce10cfd75c25f26d6a75f9c8785bd95f2e213e48285c4e745cde7ecce93c6`. It separates semantic saga/round
receipts from every generated-once peer-specific exact operation, retains every distinct update,
permits `covered` only for exact retransmit/manifest identity, and binds post-late-claim repair to
imported claim ids/causal frontier with a new permanent round. Creator reconciliation links
canonical `person-default-me` in place and preserves `account-default` 100% ownership/all
references, rejecting malformed defaults. Every sound revision-03 fence/Q-014/security/privacy/
migration/reversal/export/accessibility/real-browser clause remains; no Q/P08 readiness. Formatting,
index, cleanup, scratch/21 blocks, FS-001 and SCOPE pass; sole review is `reviews/P07-review-04.md`.

**2026-07-20T15:14:15+10:00 — P07/04 `reviewing -> reviewing`:** Independent PASS recommendation at
corrected review SHA-256 `313cc26bf5b537c9281839b40a422d3e19f4244b30e18bd9f746303951f01c13`; the
initial same-file PASS contained one wrong prior-review hash and the reviewer corrected only that
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
R-005/R-006/R-018/R-027 updates are integrated in `1f6cb96b27c8093f0ba2c319f32d3c79c8aab126`. No
finding/Q remains. P07 architecture passes, but HS-011 maps also to P08 and therefore returns to
queued without a marker; HS-012 is likewise unchanged/unchecked. D-011/P05 requires a supported
genuinely-hidden-topology no-product recheck before P08 can dispatch. Scratch remains `753be6b7…`;
21 blocks, FS-001 and SCOPE are exact.

**2026-07-20T15:16:41+10:00 — P05/12 `blocked_external -> implementing`:** The before-P08 D-011/
DEPENDENCIES trigger reopens P05 for a no-product diagnostic only. Original P05 BASE remains
`007651beb814d98646aa2e786801b647e2abd0b5`; reviewed product HEAD
`7f0b0710e820b87be2ee8877a3b7693d90e5e505` stays preserved; pre-diagnostic repository HEAD is
`824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`. Worker may write only
`evidence/P05/implementation-12.md`, make no commit and must audit installed
CLI/help/protocol/runtime for a supported genuinely hidden headless page. If supported, exact hidden
visibility plus socket/ import/DOM timing is required; if not, installed primary-source/allowed-page
evidence must preserve `blocked_external`.
Headed/config/temp/emulated/frozen/focus/reload/poll/worker substitutes remain forbidden. P08/P10,
product edits and marker remain blocked; scratch is `753be6b7…`.

**2026-07-20T15:22:41+10:00 — P05/12 `implementing -> ready_for_review -> reviewing`:** HEAD/index
remain `824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`/empty; no commit or executable diff. Sole evidence
`evidence/P05/implementation-12.md` is 195 lines/12,423 bytes at SHA-256
`8f5ec6614f68db79f54d1ebf2f3ba4e4e89c2d3f1dc386c5ea61a00626a4f8fd`. Installed versions remain CLI
0.1.17, bundled Playwright/Core 1.62.0-alpha-1783623505000 and repository Playwright 1.61.1;
help/README/runtime expose tab selection/`bringToFront()` but no hide/background API, and bundled
protocol exposes `active|frozen` only. Allowed disposable headless observation reports both pages
`visible`, `hidden:false`, `hasFocus:true`; therefore no product/timing run was falsely performed.
Evidence recommends unchanged `blocked_external`, revision-11 preservation and P08/P10 block; no Q.
Formatting, cleanup, zero service rows, scratch/21 blocks, FS-001 and SCOPE pass. Sole review output
is `reviews/P05-review-12.md`.

**2026-07-20T15:30:50+10:00 — P05/12 `reviewing -> blocked_external`:** Independent diagnostic PASS
review SHA-256 `551b4545fc19ac2fccd0e6f84258b79d931c6973dfaaa9f0471d02dfeecc5e35` reproduces every
installed version/source identity and the allowed two-page Chrome result: both `visible`,
`hidden:false`, `hasFocus:true`. CLI help/README/runtime/public API expose no hide/background
method; bundled protocol has `active|frozen` only. With no hidden predicate, omitting
MoneyFlow/15-second timing was the required honest stop; no product owner is inferred. No finding/Q.
Revision-11 product work stays preserved, P05/HS-015 returns to `blocked_external`, HS-015 remains
unchecked and P08/P10 remain dependency-blocked. DEPENDENCIES/D-011/R-026 receive the dated recheck;
next trigger is a capable installed upgrade or P21. Exact range/index, formatting, cleanup, zero
state, scratch/21 blocks, FS-001 and SCOPE pass; root artifact integration pending.

**2026-07-20T15:31:48+10:00 — P05/12 `blocked_external -> blocked_external`:** Immutable diagnostic
evidence/review and dated DEPENDENCIES/D-011/R-026 disposition are persisted in
`0f7ee5222dd23794411427fdc013cf3a5b6f8648`. The before-P08 trigger is satisfied honestly but the
external capability remains unavailable; P08/P10 stay blocked and independent P09 may proceed. No
executable, marker or frozen-source path changed.

**2026-07-20T15:34:57+10:00 — P09/01 `queued -> implementing`:** P01 is passed and P09 is the next
dependency-ready package while the P05 branch remains honestly blocked. Dispatch uses clean literal
BASE/pre-implementation HEAD `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`, exact evidence
`evidence/P09/implementation-01.md` and future immutable review `reviews/P09-review-01.md`. The
implementer is limited to the exact CRDT/sync/provider/shell/mutation-call-site/test paths in
HANDOFF and must implement the standard Loro UndoManager lifecycle, origin exclusion, logical
grouping, truthful accessible controls and guarded platform shortcuts with focused plus full
no-retry evidence. The only dispatch-time dirty paths are root-owned unstaged HANDOFF/PROGRESS
updates; index and all product/test paths are clean. Scratch is exact at `753be6b7…`, all 21
normalized blocks and marker/ state mappings pass, FS-001 remains `0d0e2a14…` at 715 lines/25,441
bytes, and SCOPE remains `d03f33e7…`; no marker event or rollback batch is active.

**2026-07-20T16:11:06+10:00 — P09/01 `implementing -> ready_for_review -> reviewing`:** The
implementer committed exactly ten authorized product/test paths at literal HEAD
`af06fb2ad32fe292aef15a011c2040cb54cf5dfa`; original BASE remains
`c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`. Sole frozen evidence `evidence/P09/implementation-01.md`
is 172 lines/12,346 bytes at SHA-256
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
globally undoes character-by-character instead of as one logical edit; existing
Enter/fill/synchronous tests miss the path. Blocking F-02 proves a throttled `sync.pushOps` failure
while offline is not rescheduled on reconnect/visibility, leaving the accessible state at
`Sync error` and the resulting edit/undo operations locally durable but unpushed. Otherwise standard
UndoManager origins/lifecycle, online peer exclusion/propagation, redo clearing, shortcuts/editable
guard and responsive/a11y controls are sound. Independent focused 8/8, full Vitest 1,180/1,180,
changed no-retry E2E repeat 6/6 and full 83/83 pass but lack both regressions. Q proposal is
accepted for transcription as Q-015; R-028/R-029 track the two failures. Exact HEAD/index/write
boundary, cleanup, scratch/21 blocks, FS-001 and SCOPE verify. Preserve revision-01 work/artifacts;
revision 02 must add explicit cross-event logical edit boundaries and real failed-push reconnect
retry with focused no-retry automation and installed-CLI proof. Immutable revision-01 artifacts,
Q-015 and R-028/R-029 were integrated in `74bbc7167d09fe54dff48fe7df26886f0923bdd6`.

**2026-07-20T16:32:54+10:00 — P09/02 `changes_requested -> implementing`:** Revision-01 failure
artifacts are immutable and linked through control HEAD `54a9f28e1c272ada62bea52f46b587f206d3057f`;
original P09 BASE remains `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`. Revision 02 receives exact
evidence `evidence/P09/implementation-02.md` and future review `reviews/P09-review-02.md`. Its
narrow authority covers the typed CRDT edit-session boundary, autosaved Vault Name wiring, actual
SyncManager online retry owner and focused unit/integration/E2E regressions. F-01 must prove
separate-event typing/native undo followed by one complete global Undo/Redo without time merging or
unrelated-action capture. F-02 must prove a genuinely failed offline push automatically retries on
browser reconnect without another mutation/reload/test hook, reaches truthful saved state and
preserves peer/server durability and listener cleanup. Re-review will cover original BASE through
newest HEAD. Dispatch-time dirt is only root-owned unstaged HANDOFF/PROGRESS; index and executable
paths are clean. Scratch/21 blocks, FS-001 and SCOPE remain exact; no marker event or rollback batch
is active.

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
request 156/status Saved. Root verified exact paths/HEAD/index, cumulative `diff --check`, no
generated drift/process, scratch SHA and all 21 normalized marker mappings, FS-001 and SCOPE. Only
root-owned HANDOFF/PROGRESS plus frozen revision-02 evidence are dirty; new sole review output is
`reviews/P09-review-02.md`.

**2026-07-20T17:16:06+10:00 — P09/02 `reviewing -> reviewing`:** Independent PASS recommendation at
unchanged cumulative HEAD `418234e28ac649e03ce8ad184d08a8a2f2416149`; review is 214 lines/17,759
bytes at SHA-256 `610d0853632ec2596d60011133827971c982b39f1a6e8800ba9d54b9badf2966`. No finding/Q
remains. The reviewer independently closes F-01 with real separate-character/native-input evidence
followed by one complete global Undo/Redo, and F-02 with actual failed offline requests 168/172
followed only by the online transition, successful idempotent peer/source requests 60/180, 15
inserted durable IDs, both clients Saved and receiver history disabled. Standard Loro
origins/lifecycle, synchronous action grouping, shortcut guards, responsive/a11y controls and online
peer semantics remain sound. Independent focused 13/13, full Vitest 1,185/1,185, changed no-retry
E2E repeat 9/9, full no-retry E2E 84/84, typecheck/lint and all 13 cumulative product/test format
checks pass; only the seven known protected root/frozen format paths remain red. Q-015 is upheld
once; D-014 records the accepted architecture and R-028/R-029 are mitigated. Root verified unchanged
HEAD/index, exact evidence/review hashes, sole-write boundary, cleanup/no generated process or
next-env drift, scratch/21 blocks, FS-001 and SCOPE. Package PASS awaits artifact/ledger
integration; HS-006 remains unchecked and no marker event is active.

**2026-07-20T17:17:16+10:00 — P09/02 `reviewing -> passed`; HS-006
`reviewing -> completion_pending`:** PASS definition is complete at exact reviewed product/test HEAD
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
`c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines/24,245 bytes. FS-001
remains exact at `0d0e2a14…`, 715 lines/25,441 bytes; SCOPE remains `d03f33e7…`. The active
completion event is cleared and normal dispatch may resume.

**2026-07-20T17:19:58+10:00 — P11A/01 `queued -> implementing`:** P09/HS-006 is passed and P11A is
the next dependency-ready critical-path package. Dispatch uses clean literal BASE/pre-implementation
HEAD `eb5ab2e215130c358130d5411a92b51951c3c53a`, exact evidence `evidence/P11A/implementation-01.md`
and future immutable review `reviews/P11A-review-01.md`. Authority is limited to alias
schema/domain/CRDT mutation/query/migration paths and focused unit/integration/ description-alias
E2E tests; P11B interaction and P11C integrated/performance scope remain deferred. The implementer
must establish legal real/symlink states, O(1) one-hop resolution, exact forward/ backlink
conservation, atomic one-step operations, deletion bookkeeping and deterministic idempotent
data-preserving partial-data migration with property/concurrency/convergence evidence. Ambiguous
normalization or destructive concurrency becomes a complete Q proposal without pausing.
Dispatch-time dirt is root-owned HANDOFF/PROGRESS only; index/executable paths are clean. Scratch is
exact at `c2b986fd…` with six authorized markers and 21 normalized blocks; FS-001 and SCOPE remain
exact; no completion marker or rollback event is active.

**2026-07-20T17:27:32+10:00 — P11A/01 implementation authority refinement:** Model inventory found
that the existing `createVaultMirror` test/bootstrap path omits the `descriptionAliases` root and
does not invoke `migrateVaultSentinels`, so real-mirror migration/invariant tests cannot exercise
the same post-hydration state as production. Root explicitly adds only `src/lib/crdt/mirror.ts` to
set the empty alias root and call the existing system-origin migration before consumers. This is a
narrow P11A bootstrap/migration owner, not P11B/P11C scope. Every other original path prohibition
remains; no product commit or review boundary exists yet.

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
return-and-mutate runtime exception, discarding typed errors and allowing mixed-update partial
writes; F-02 repair is wired only to helper mirrors, not the real hydrated provider; F-03 remove-all
leaves active symlinks targeting a tombstone and repair can resurrect their visible aliases; F-04
public selectors/types still expose the illegal raw wire union and symlink recovery names; F-05 the
shipped management route bypasses named normalization/actions and creates NFC-equivalent duplicates;
F-06 required operation/property/scale/provider/repair-exchange/UndoManager evidence is materially
absent. Focused 68/68 repeated, unit 1,200/1,200, type/build/lint and management repeat 6/6 pass,
but full no-retry E2E is honestly red 4 failed/80 passed from F-01. Current-route manual
CRUD/undo/sync/privacy/ responsive behavior is otherwise usable and P11B/P11C remain correctly
deferred. Q-016/Q-017 accept the normalization and provisional concurrency defaults for remediation;
R-030/R-031 track graph and production-integration risk. Exact HEAD/index/write boundary, cleanup,
scratch/21 blocks/six markers, FS-001 and SCOPE verify. Preserve revision-01 work/artifacts;
revision 02 must close all findings and receive cumulative independent review. Immutable revision-01
artifacts, Q-016/Q-017 and R-030/R-031 were integrated in
`571b1ed05ab540d5a2e9fe5ba142d304a32137fa`.

**2026-07-20T18:12:16+10:00 — P11A/02 `changes_requested -> implementing`:** Revision-01 failure
artifacts, Q-016/Q-017 and R-030/R-031 are immutable; pre-implementation HEAD
`faeaebd358401b6639cce1c1b24eac577f69a624` includes their control/link commits. Revision 02 retains
the original literal BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` for cumulative review and uses
exact new evidence `evidence/P11A/implementation-02.md` and future review
`reviews/P11A-review-02.md`. Narrow authority adds the actual hydrated vault provider, the existing
alias management table, and only any transaction-page adaptation required by an enforced legal
selector boundary. It must close production recipe Result handling and partial writes, pre-consumer
provider repair, non-resurrecting real/symlink remove-all, public legal-state/type enforcement,
Q-016-normalized shipped management CRUD, and the full operation/property/Undo/provider/peer/reopen/
scale evidence gaps. P11B caret/autocomplete/modal UX and P11C integrated performance remain out of
scope. Dispatch-time dirt is root-owned HANDOFF/PROGRESS only; HEAD/index/executable paths are
clean. Scratch remains `c2b986fd…` with exactly six authorized markers and all 21 normalized blocks;
FS-001 and SCOPE remain exact; no completion or rollback event is active.

**2026-07-20T20:40:53+10:00 — P11A/04 `implementing -> ready_for_review -> reviewing`:** Exact
revision-04 product/test commit `fb72abdaf531dff40c59f6b3525fb1b9ce50f805` contains three authorized
paths; cumulative review retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` and all
immutable prior history. Frozen sole evidence `evidence/P11A/implementation-04.md` is 214
lines/16,195 bytes at SHA-256 `c77582e4d6ae19e291e0499bfb0357fac5d944a77c99447086b7ca4e9f09bf87`. It
reports stable-ID raw pending updates whose failures remain barrier-visible across later successes
and retry online without loss/duplication; one persistent detached staging document that
incrementally catches up, imports and repairs remote state before one canonical live delta; actual
Mirror single-legal-notification proof; exact repair push acknowledgement; peer/reopen convergence;
and retained gates. Focused Vitest 40/40, affected 8/8, full Vitest 1,219/1,219,
typecheck/build/scoped format/lint pass; final full no-retry E2E is 84/84 and alias repeat 6/6.
Evidence transparently records an initial causal 81/84 sync run, quadratic per-operation fork
diagnosis and persistent-staging correction. Installed-CLI management/
offline/peer/privacy/reflow/dark/reduced-motion checks pass with P11B/P11C deferred. Root verified
exact HEAD/three paths/index, `diff --check`, evidence hash/size, no runtime/generated drift and
frozen hashes/sizes. Only root HANDOFF/PROGRESS and frozen evidence are dirty; sole new review
output is `reviews/P11A-review-04.md`.

**2026-07-20T20:52:38+10:00 — P11A/04 `reviewing -> passed`:** Independent cumulative PASS at
unchanged HEAD `fb72abdaf531dff40c59f6b3525fb1b9ce50f805`; review is 245 lines/20,188 bytes at
SHA-256 `5f21b564eb9c5480491d7d126ad8e575daffd3d2998ea8f7e22e8b045bb7a0ed`. All F-01–F-06 findings
are closed. Independent proof covers sticky failed raw update A across queued B success, repeated
barrier rejection, stable-ID online recovery with no duplicate/loss; persistent staging and
incremental catch-up; one actual live Mirror legal notification; failed repair push retention and
exact-ID successful-batch completion; peer convergence/reopen/no user undo; immediate local
remove-all conservation; public legal boundary; management normalization; deterministic properties
and current-surface UX. Focused 40/40 repeated three times, full Vitest 1,219/1,219,
typecheck/build/lint/scoped format, alias E2E 6/6 and full exact-HEAD no-retry E2E 84/84 pass. The
review accepts the transparent pre-final 81/84 regression only because the persistent-staging fix
and fresh full pass close it. Manual
offline/two-tab/encrypted-network/reflow/dark/reduced-motion/console, cleanup, exact boundary,
scratch/21 blocks/six markers, FS-001 and SCOPE pass. No Q proposal. P11A alone may pass; HS-004
remains unchecked until P11B/P11C pass.

**2026-07-20T19:53:23+10:00 — P11A/03 `implementing -> ready_for_review -> reviewing`:** Exact
revision-03 product/test commit `722364b0417b4666de05df773933233d34e62033` contains 12 authorized
paths; cumulative review retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` and all
immutable prior history. Frozen sole evidence `evidence/P11A/implementation-03.md` is 235 lines/
17,213 bytes at SHA-256 `9656cee30c9260f5c44244fd40c6cecf46edd59d81a1ced19d7e350af77fb3cb`. It
reports a serialized real SyncManager encryption/persistence queue with awaited provider and
remote-repair barriers; immediate top-level/nested forward/reverse conservation for real/symlink
remove-all; alias-free public generic hooks/barrel exports; real IndexedDB/encryption ordering and
push-failure retry; aliased production-wrapper deletes; exchanged repair/reopen; and fixed-seed
concurrent plans while retaining F-01/F-05. Focused Vitest 39/39, full Vitest 1,218/1,218,
typecheck, build, committed-path formatting and lint with zero errors pass; alias E2E repeat is 6/6
and exact HEAD full no-retry E2E is 84/84. Installed-CLI normalized
management/offline/history/privacy/ responsive/dark/reduced-motion checks pass with explicit
P11B/P11C deferral. Root verified exact HEAD, 12-path revision diff, empty index, `diff --check`,
evidence hash/size, no task-owned runtime/ generated drift, and frozen source hashes/sizes. Only
root HANDOFF/PROGRESS and frozen evidence are dirty; sole new review output is
`reviews/P11A-review-03.md`.

**2026-07-20T20:10:38+10:00 — P11A/03 `reviewing -> changes_requested`:** Independent cumulative
FAIL at unchanged HEAD `722364b0417b4666de05df773933233d34e62033`; review is 243 lines/20,273 bytes
at SHA-256 `153b51685afff22fa01bf74cb0ca49a49fef7242a1ba272e159500f5320a0085`. F-01/F-04/F-05 are
closed, and F-03's local real/symlink remove-all now immediately conserves every top-level/nested
pointer and reverse map in one undoable action. Two lifecycle blockers remain. F-02 proves
`localPersistenceQueue` chains later work from `prior.catch(() => undefined)`, so queued update B
can succeed after update A encryption fails and make `awaitLocalPersistence()` resolve while A is
lost; no controlled crypto-failure test detects it. F-03 proves `doc.import()` synchronously
notifies the actual loro-mirror store before SyncManager's later repair; revision-03 coverage
observes only optional `onRemoteUpdate`, which the shipped provider does not use, so consumers can
see the illegal intermediate graph. F-06 requires failure-sticky queue/recovery evidence and a real
Mirror subscriber proof that no illegal state is exposed. Focused 39/39 repeated three times, full
Vitest 1,218/1,218, typecheck/build/lint/scoped format and alias E2E 6/6 pass. First full no-retry
E2E was 83/84 on an unrelated shift-click flake, isolated replay 3/3 and second full run 84/84;
installed-CLI management/offline/privacy/reflow passes. Q-016/Q-017 remain canonical with no new
proposal. Exact HEAD/index/write boundary, cleanup, scratch/21 blocks/six markers, FS-001 and SCOPE
verify. Preserve revisions 01–03; revision 04 must close both remaining findings and receive
cumulative review. Immutable revision-03 evidence/review and R-030/R-031 transcription were
integrated in `2bdca0e584aabe3f3a3ac2fe0c0d91637b9fe79a`.

**2026-07-20T20:12:57+10:00 — P11A/04 `changes_requested -> implementing`:** Revisions 01–03 and
their reviews are immutable; clean pre-implementation HEAD
`b19f9a24733edabb405402e684baefef23d63b30` includes the revision-03 artifact link. Revision 04
retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` for cumulative review and uses
exact evidence `evidence/P11A/implementation-04.md` and future review `reviews/P11A-review-04.md`.
Scope is limited to making persistence failure-sticky and raw updates retryable so later queued
success cannot mask/loss an earlier encryption failure, plus applying remote updates and
deterministic repair on an isolated clone before one canonical import notifies the actual live
Mirror subscriber. Controlled crypto-failure/recovery, real subscriber single-legal- notification,
durable repair exchange, peer/reopen convergence and failed-push retry are mandatory. All closed
recipe/normalization/local-remove-all/public-boundary/property/E2E gates must remain green;
P11B/P11C stay out of scope. Dispatch-time dirt is root HANDOFF/PROGRESS only; index/product paths
are clean. Scratch remains `c2b986fd…` with six authorized markers and all 21 normalized blocks;
FS-001 and SCOPE remain exact; no completion or rollback event is active.

**2026-07-20T18:40:27+10:00 — P11A/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test commit `d81c5039c41577f94791bedc4184b98940c631a6` contains 16 authorized
paths; cumulative review retains original BASE `eb5ab2e215130c358130d5411a92b51951c3c53a` and all
immutable revision-01 history. Frozen sole evidence `evidence/P11A/implementation-02.md` is 236
lines/16,405 bytes at SHA-256 `b612081957b3c710dbb574ad78ce4b39765117b85a290e4d13a117fbb49b101f`. It
reports production void recipe/typed Result handling with atomic mixed-update preflight, actual
post-hydration/pre-consumer system repair, non-resurrecting real/symlink group deletion, a legal
public state/type boundary, Q-016-normalized shipped management CRUD, and expanded
fixed-seed/full-operation/provider/peer/ reopen/large-map/one-step Undo evidence. Focused Vitest
53/53, full Vitest 1,214/1,214, typecheck, build, formatting and lint with zero errors pass; focused
management E2E is 2/2 and full no-retry E2E is 84/84. Installed-CLI management
normalize/duplicate/delete/undo/redo, responsive/accessibility, sync privacy and cleanup are
recorded with P11B/P11C deferrals. Root verified exact HEAD, 16-path revision diff, empty index,
`diff --check`, evidence hash/size, no task-owned runtime/generated drift, scratch/FS-001/SCOPE
hashes and sizes. Only root HANDOFF/PROGRESS and frozen evidence are dirty; sole new review output
is `reviews/P11A-review-02.md`.

**2026-07-20T19:23:35+10:00 — P11A/02 `reviewing -> changes_requested`:** Independent cumulative
FAIL at unchanged HEAD `d81c5039c41577f94791bedc4184b98940c631a6`; review is 278 lines/22,861 bytes
at SHA-256 `3cc9c32c6b9461ea5461231264b366c509483d5372dd981c543141e3f167c970`. F-01 is closed by
void production recipes, typed Result propagation, atomic mixed-update preflight and real-wrapper
one-step Undo evidence. F-05 is closed by Q-016-normalized named management CRUD and independent
current-surface validation. Four blockers remain: F-02 proves real SyncManager's async void
local-update callback can leave repair encryption/append detached while provider `forceSync` reads
an empty queue and exposes consumers, a race hidden by the fake provider manager; F-03 proves
remove-all does not atomically clear applicable transaction forward/reverse references and live
merged invalid edges persist until an uninvoked reload repair; F-04 proves exported generic
selectors/actions and wire schema still let application callers read/mutate illegal alias state;
F-06 requires the corresponding real encrypted queue/barrier, immediate conservation/undo, exchanged
live repair, randomized concurrent plan and application-import compile-boundary evidence. Focused
53/53 repeated three times, full Vitest 1,214/1,214, typecheck/build/lint, focused E2E 6/6 and full
no-retry E2E 84/84 pass; installed-CLI management/offline/accessibility/privacy checks pass. Q-016
and Q-017 remain canonical; no new Q proposal. Exact HEAD/index/write boundary, cleanup, scratch/21
blocks/six markers, FS-001 and SCOPE verify. Preserve revisions 01/02; revision 03 must close every
remaining finding and receive cumulative independent review. Immutable revision-02 evidence/review
and R-030/R-031 transcription were integrated in `0183a70afed010d862f4eb960d5464b09a17ecd5`.

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
named actions, imported tooltip/manual raw absence and real-app accessibility. P11C integrated
scale/ import/refresh/duplicate-tab/concurrent performance remains deferred. Dispatch-time dirt is
root HANDOFF/PROGRESS only; index/product paths are clean. Scratch/21 blocks/six markers, FS-001 and
SCOPE are exact; no completion or rollback event is active.

**2026-07-20T21:20:37+10:00 — P11B/01 implementation authority refinement:** Full no-retry E2E
independently reproduced `tab-duplication.spec.ts:169` receiving two vault operations for manual
add. The P11B page correctly removed raw manual description but had to call existing transaction
insert and alias attach/create hooks separately; UndoCoordinator grouped history, yet two Mirror
commits and server ops remained. Root narrowly authorizes only `src/lib/crdt/description-aliases.ts`
and `src/lib/crdt/context.tsx` to add one named atomic manual transaction action that validates
normalized nonblank alias text, forces empty raw description/no import provenance, inserts and
exact-selects or creates the alias in one internal result/action. Existing integration coverage must
prove typed no-write errors, one Mirror/server op and one undo/redo step. No schema/sync/migration
or other P11A surface is reopened; every other P11B/P11C boundary remains.

**2026-07-20T21:52:11+10:00 — P11B/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `e35109dfe7b02bdb4058445f44d03a6dd678457b` contains 11 authorized paths from
literal BASE `959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`. Frozen sole evidence
`evidence/P11B/implementation-01.md` is 239 lines/18,293 bytes at SHA-256
`f70f39969e1d4dcdf961c0ae2174b63fb36b03c5bb1a618c5727a45d9ebf9eb2`. It reports native always-
visible one-click caret input, controlled lazy/no-default autocomplete and grid handoff, exact/new/
single/shared commit planner, exact modal choices/trap/restoration/no blur race, controlled
provenance tooltip, alias-only manual storage and the authorized one-action/manual insert
refinement. Focused component/integration passes 9/9, full Vitest 1,226/1,226,
typecheck/build/lint/scoped formatting and changed E2E 12/12 repeated three times pass. Both full
no-retry runs are honestly 85/86 on unchanged T021c shift-click suite-order state; exact T021c
passes 3/3 isolated and every P11B journey passes. Installed-CLI seeded
import/manual/symlink/shared, pointer/keyboard/modal/undo/provenance/privacy/
responsive/dark/reduced-motion/200% and zero-console-error charter passes; harness-only missing
local Realtime secret was corrected without disclosure. Root verified exact HEAD/paths/index,
`diff --check`, evidence hash/size, cleanup and frozen boundaries. Only root HANDOFF/PROGRESS and
frozen evidence are dirty; sole new review output is `reviews/P11B-review-01.md`.

**2026-07-20T22:18:37+10:00 — P11B/01 `reviewing -> passed`:** Independent PASS at unchanged HEAD
`e35109dfe7b02bdb4058445f44d03a6dd678457b`; review is 207 lines/15,686 bytes at SHA-256
`b19ef28c1fdb3fc6e88061631ffe7542b7994ae22040e2e5b9e87bc3bc091a90`. Static and runtime review proves
the native one-click caret control, lazy/no-default autocomplete and grid handoff, exact/new/
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
transcription are immutable in `0426866fa66cc022efca6d74cd5088d586d3d11b`; that clean HEAD is P11C's
literal BASE/pre-implementation sentinel. Dispatch uses exact new evidence
`evidence/P11C/implementation-01.md` and future review `reviews/P11C-review-01.md`. Authority is
limited to integrated alias surfaces and focused import/virtualized/duplicate-tab paths necessary to
prove management and every imported/manual/exact/new/single/shared/change/remove path after refresh,
one undo/redo, duplicate live tabs and causally concurrent edits. Stable reused alias lookup
structures, bounded virtual rows, active-cell-only combobox/listbox mounting and measured rendered
scale are mandatory; all P11A graph/atomic/persistence/public-boundary gates and P11B
caret/keyboard/ modal/provenance/privacy gates must stay green.
Schema/migration/sync/transport/dependency/config or unrelated widening needs prior root authority
after concrete reproduction. Dispatch-time dirt is root HANDOFF/PROGRESS only;
index/product/executable/generated paths are clean. Scratch/21 blocks/six markers, FS-001 and SCOPE
are exact; no completion or rollback event is active.

**2026-07-20T23:33:27+10:00 — P11C/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `dd0727f3562d4a9e40669d6d64109174690286a1` contains 15 authorized paths from
literal BASE `0426866fa66cc022efca6d74cd5088d586d3d11b`. Frozen sole evidence
`evidence/P11C/implementation-01.md` is 256 lines/21,694 bytes at SHA-256
`b3f65574606ca0584c03dab3ecba840528fd139b6b521070394d29f56bf1f7c7`. It reports one reusable
collection-identity alias index for final-real IDs, exact Q-016 names, complete reference counts and
active options; zero inactive-row filtering/listboxes; and a virtual range bounded to one additional
focused row. Real named-action/reopen tests prove one local update per action, legal exported reopen
and local-only undo. Four two-peer management/cell conflict matrices converge under Q-017 across
imported/manual/shared/symlink-capable data and 250 unrelated aliases. Domain/component datasets
cover 10,000/2,000 aliases; installed CLI created 106 real management aliases and imported 500 rows,
then measured 14–18 mounted rows, 6 ms unique filtering and 1,775 ms row-499 scroll with row-0
focus/caret retained. Focused 20/20 and strengthened 7/7, full Vitest 1,232/1,232,
typecheck/build/lint/scoped format, alias E2E 15/15 and rendered virtual E2E 3/3 pass without
retries. A temporary optional blur- pin handler caused T014a 86/87 and 0/3 isolated, was causally
removed, then T014a passed 3/3 and in the corrected full suite. Final full no-retry E2E is honestly
86/87 only on unchanged suite-order T021c, which passes 3/3 isolated and remains R-009/P13/P21.
Installed-CLI management/import/manual/shared/
two-tab/offline/undo/privacy/responsive/dark/reduced-motion/200% charter passes with no console
errors or plaintext manual values in four inspected encrypted push bodies. All 502 disposable
rows/aliases, browser data, sessions, processes and generated files were removed; next-env restored.
Root verified exact HEAD/15 paths/index, diff check, evidence hash/size, cleanup and frozen
boundaries. Only root HANDOFF/PROGRESS and frozen evidence are dirty; sole new review output is
`reviews/P11C-review-01.md`.

**2026-07-21T00:04:24+10:00 — P11C/01 `reviewing -> changes_requested`:** Independent FAIL at
unchanged HEAD `dd0727f3562d4a9e40669d6d64109174690286a1`; review is 184 lines/14,279 bytes at
SHA-256 `4c517fbfaae100ee5ae10addf5a60580e38298075dd2645826214403ce98521b`. Blocking F-01 traces the
actual production callback chain: every Mirror store notification reruns `useDescriptionAliases()`,
whose full `Object.fromEntries` conversion returns a fresh legal collection; that identity forces
one complete lookup rebuild, options rebuild and displayed-row remap even for transaction-only
edits. Repeating N unrelated edits therefore performs N full alias conversions/index builds. The
green plain- prop identity test never mounts VaultProvider/useDescriptionAliases or emits a real
unrelated action, so it cannot prove stable production reuse. Revision 02 must preserve legal
collection and lookup identity without first rescanning/reconverting aliases, retain the public
raw-wire exclusion, and add an actual-context large-graph regression using the real provider/hooks:
repeated local transaction actions plus a remote/import-style notification produce zero
conversions/rebuilds and stable identity; one alias mutation produces exactly one rebuild and
correct resolution/options/counts. Independently, focused P11C 20/20 repeated three times, full
Vitest 1,232/1,232, typecheck/build/lint/scoped format, alias E2E 15/15, virtual scale 3/3 and full
no-retry E2E 87/87 pass. Installed-CLI management/history/ reload/manual/lazy/privacy smoke passes;
a second CLI page lacked copied session auth, so repeated E2E retains true two-tab proof. Cleanup,
exact range/index, scratch/21 blocks/six markers, FS-001 and SCOPE pass. No Q proposal. R-008
remains open; all other P11C behavior gates are green and must be retained. HS-004 remains
unchecked.

**2026-07-21T00:05:41+10:00 — P11C/01 failure integration:** Immutable revision-01 evidence/review,
F-01, R-008 transcription and changes-requested state are preserved in
`dd77d518fff81e4c5553ce9a559681ece8f30232`. Revision 02 must retain original cumulative BASE
`0426866fa66cc022efca6d74cd5088d586d3d11b`, close only the stable production selector/index
lifecycle blocker and preserve every independently green integrated behavior gate.

**2026-07-21T00:07:52+10:00 — P11C/02 `changes_requested -> implementing`:** Revision-01 failure
history is immutable; clean pre-implementation HEAD `8856951cf4d4428b4c15cda814b74a3da81bcbba`
includes its artifact link. Cumulative review retains original BASE
`0426866fa66cc022efca6d74cd5088d586d3d11b` and uses exact new artifacts
`evidence/P11C/implementation-02.md` / `reviews/P11C-review-02.md`. Authority is limited to the
legal alias selector/conversion/lookup lifecycle and actual-context tests. Repeated real production
local transaction actions and remote/import-style non-alias notifications over a large graph must
cause zero full alias conversions/index builds and preserve collection/lookup identity without first
rescanning; one alias-bearing notification must cause exactly one conversion/build and correct legal
resolution/options/counts. Raw-wire exclusion, P11A/P11B gates, all revision-01 integrated behavior,
10,000/2,000/500 scale bounds, lazy mounts, virtual focus and the removed T014a blur-pin regression
must remain. Dispatch-time dirt is root HANDOFF/PROGRESS only; index/product/executable/generated
paths are clean. Scratch/21 blocks/six markers, FS-001 and SCOPE are exact; no completion or
rollback event is active.

**2026-07-21T01:08:53+10:00 — P11C/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test HEAD `258f22af06c8a00b00d09f30c33f85f82377bc13` adds two authorized paths
to cumulative BASE `0426866fa66cc022efca6d74cd5088d586d3d11b`; revision-02 diff is 504 insertions/9
deletions. Frozen sole evidence `evidence/P11C/implementation-02.md` is 172 lines/13,015 bytes at
SHA-256 `b1327d9cf6cc5b04ecc887fc5b8a545cbe4b5fa8834da709f52111c7c5be8e94`. The real-provider
counterfactual first hung even with one alias because an inline selector plus fresh collection
created a self-sustaining effect loop; later browser validation exposed stale first-alias
publication. Final provider-scoped semantic alias-root revision notification plus lazy stable
selector closes both without exposing raw types. Over 1,000 legal aliases, three local edits,
production import- style insert and an aligned remote transaction-only delta preserve
collection/lookup identity at 0 conversion/0 build/0 options recomputation; local rename/Undo/Redo,
remote alias create and one alias-bearing migration each produce exactly 1/1/1 with correct NFC
exact lookup, symlink resolution, 500 options and total count. Focused 22/22 passes in three fresh
processes; full Vitest 1,234/1,234, typecheck/build/lint/scoped format, alias E2E 15/15, virtual
scale 3/3 and full no-retry E2E 87/87 pass. Installed CLI created 106 aliases and imported 500+1
rows; a true second-tab transaction import left the active option DOM node identical with zero
mutations, while second-tab alias rename produced exactly one text mutation. Rest/lazy mounts, 1,644
ms row-500 scroll, history/reload, responsive/dark/ reduced-motion/200%, privacy/network and clean
console pass. All disposable rows/aliases, browser data, sessions, processes and generated dirs were
removed; next-env restored. Root verified exact HEAD/two paths/index, diff check, evidence
hash/size, cleanup and frozen boundaries. Only root HANDOFF/PROGRESS and frozen evidence are dirty;
sole new review output is `reviews/P11C-review-02.md`.

**2026-07-21T01:29:22+10:00 — P11C/02 `reviewing -> changes_requested`:** Independent cumulative
FAIL at unchanged HEAD `258f22af06c8a00b00d09f30c33f85f82377bc13`; review is 175 lines/13,372 bytes
at SHA-256 `429c844eb96ae9a186cec0b6c56b1ff1700eba619c0849a4b42df70a16c5205b`. Revision 02 correctly
filters semantic alias-root events, closes unrelated-notification rebuild churn while observed and
passes continuous local/remote/Undo/Redo/empty-first lifecycle gates. Blocking F-01 remains at
teardown: last-listener unsubscribe removes the document observer while retaining cached
aliases/revision, so alias events during the zero-consumer interval are never recorded and remount
reuses stale data. Independent real two-tab proof cached `After Gap`, navigated tab A to Accounts,
renamed/saved `During Gap` in tab B, then returned tab A by sidebar SPA navigation: it incorrectly
showed `After Gap`; hard reload immediately showed durable `During Gap`. Revision 03 must eliminate
the unobserved window, cover large actual-context unmount/local+remote-mutate/remount and
render-to-subscribe races, publish exactly one current rebuild, retain non-alias 0/0/0 and prove no
document-subscription leak after provider/doc disposal. Focused 22/22 repeats three times, full
Vitest 1,234/1,234, typecheck/build/lint/scoped format, alias E2E 15/15, virtual scale 3/3 and full
no-retry E2E 87/87 pass independently. CLI cleanup, exact range/index, scratch/21 blocks/six
markers, FS-001 and SCOPE pass. No Q proposal. R-008 remains open; every other cumulative P11C gate
remains green. HS-004 remains unchecked.

**2026-07-21T01:30:57+10:00 — P11C/02 failure integration:** Immutable revision-02 evidence/review,
F-01, R-008 transcription and changes-requested state are preserved in
`29d943757bae8147f3b66559d63c12afcd0e5362`. Revision 03 must retain original cumulative BASE
`0426866fa66cc022efca6d74cd5088d586d3d11b`, close only the unobserved zero-consumer/setup window and
preserve revision-02 zero-work non-alias behavior plus every independently green cumulative gate.

**2026-07-21T01:32:11+10:00 — P11C/03 `changes_requested -> implementing`:** Revisions 01–02 and
their failed reviews are immutable; clean pre-implementation HEAD
`2540969134f002330ad505836bdd92d01eb56308` includes the revision-02 artifact link. Cumulative review
retains original BASE `0426866fa66cc022efca6d74cd5088d586d3d11b` and uses exact new artifacts
`evidence/P11C/implementation-03.md` / `reviews/P11C-review-03.md`. Authority is limited to context
observer lifetime and the actual-provider lifecycle test. Revision 03 must eliminate the zero-
consumer and render-to-subscribe missed-event windows, prove first remounted UI is current after
local and remote alias mutations, and release every observer on provider/doc disposal without leaks
or duplicate callbacks. It must retain revision-02 local/remote non-alias 0/0/0, alias 1/1/1,
empty-first insertion, public raw isolation and every cumulative
behavior/concurrency/privacy/scale/E2E gate. Dispatch-time dirt is root HANDOFF/PROGRESS only;
index/product/executable/generated paths are clean. Scratch/21 blocks/six markers, FS-001 and SCOPE
are exact; no completion or rollback event is active.

**2026-07-21T02:11:17+10:00 — P11C/03 `implementing -> ready_for_review -> reviewing`:** Exact
revision-03 product/test HEAD `daab038ee741faa9f92a373b27efe0c8fe8940db` adds two authorized paths
to cumulative BASE `0426866fa66cc022efca6d74cd5088d586d3d11b`; revision-03 diff is 398 insertions/14
deletions. Frozen sole evidence `evidence/P11C/implementation-03.md` is 189 lines/14,523 bytes at
SHA-256 `264c6b104391998e05a7481468c823af857eed2446f8ea7d4eade630f4b59770`. Pre-fix actual-provider
tests captured three deterministic reds: stale large collection/lookup/options after a local
zero-consumer alias gap, a lost render-to-subscribe alias rename, and task observer release at first
all-consumer unmount. Final provider-lifetime semantic observer plus frontier/diff setup
reconciliation closes them. Four consumer off/on churns retain subscribed/active/released 2/2/0;
document replacement releases exactly one old task observer and installs exactly one new; final
unmount releases it, and late updates cause no callback or lifecycle work. Local and subscribed
remote transaction-only gaps remain 0/0/0 and reuse identical collection; local/remote alias gap
remounts are exactly 1/1/1; setup injection totals one initial plus one exact alias rebuild. Focused
25/25 passes in three fresh processes; full Vitest 1,237/1,237, typecheck/build/lint/scoped format,
alias E2E 15/15, virtual scale 3/3 and full no-retry E2E 87/87 pass. Installed CLI exact two-tab SPA
gap shows only current `During Gap` on first committed remount with no stale intermediate. At 100
aliases/500+1 rows, peer transaction import keeps exact option DOM identity with zero mutations and
peer alias rename produces exactly one mutation; virtual focus/caret, history/reload,
responsive/dark/ reduced-motion/200%, console/network and privacy sentinel across 7 HTTP bodies/49
WS frames pass. All 501 transactions/101 aliases, browser data, sessions, processes and generated
dirs were removed; next-env restored. Root verified exact HEAD/two paths/index, cumulative diff
check, evidence hash/size, cleanup and frozen boundaries. Only root HANDOFF/PROGRESS and frozen
evidence are dirty; sole new review output is `reviews/P11C-review-03.md`.

**2026-07-21T02:33:03+10:00 — P11C/03 `reviewing -> passed`; artifact integration pending:**
Independent cumulative PASS at unchanged product/test HEAD
`daab038ee741faa9f92a373b27efe0c8fe8940db`; review `reviews/P11C-review-03.md` is 175 lines/13,996
bytes at SHA-256 `c8cab25c854bdce25535fc0af5c3f2e0e491dd44e25f0c8c9b457a3bd04fcaaf`. No High/Medium
finding and no Q proposal remain. Both immutable F-01 lifecycle failures are closed: the
provider/document-lifetime semantic observer and frontier reconciliation preserve non-alias 0/0/0,
publish alias local/remote/Undo/Redo/remount work exactly 1/1/1, close the zero-consumer and setup
windows, and release exactly on document replacement/final disposal with no late callback. Focused
25/25 passes in three processes, full Vitest 1,237/1,237, typecheck/build/lint/scoped format, alias
E2E 15/15, virtual scale 3/3 and full no-retry E2E 87/87 pass independently. The exact two-tab SPA
gap first commits only current `During Gap`; responsive/dark/reduced-motion/200%, accessibility,
privacy, console/network and cleanup pass. Scratch remains `c2b986fd...` with the exact six
authorized markers and 21 normalized blocks; FS-001 and SCOPE remain immutable. R-008 is closed for
P11C but stays open for P16D/P21. Persist the exact evidence/review and this state in a root
integration-control commit, link that commit durably, then execute HS-004's root-only
completion-pending/marker protocol.

**2026-07-22T15:35:25+10:00 — P11C/03 artifact integration; HS-004 `queued -> completion_pending`:**
Exact P11C/03 evidence/review, independent PASS state and R-008 transcription are immutable in
integration-control commit `78e2f978f8d258d8c4d379f53e75089a2ce975db`; unchanged reviewed
product/test HEAD is `daab038ee741faa9f92a373b27efe0c8fe8940db`. P11A/04, P11B/01 and P11C/03 are
all passed. Root authorizes only HS-004's first-line `[] -> [x]` marker from exact pre-change
scratch SHA `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, mapped to immutable
`reviews/P11A-review-04.md`, `reviews/P11B-review-01.md` and `reviews/P11C-review-03.md`. The
checked set remains HS-002/HS-006/HS-010/HS-014/HS-017/HS-018 until finalization; all 21 normalized
blocks, FS-001 and SCOPE are exact. No package dispatch is legal while this event is pending. Root
must take a private comparison copy, apply only the HS-004 marker, require a one-line diff, remove
the copy, revalidate every frozen boundary, then atomically record before/after SHAs, add HS-004 to
the authorized checked set and set the requirement passed.

**2026-07-22T15:36:53+10:00 — HS-004 `completion_pending -> passed`:** Root changed exactly the
HS-004 leading marker `[] -> [x]` after immutable reviews `reviews/P11A-review-04.md`,
`reviews/P11B-review-01.md` and `reviews/P11C-review-03.md`; mapped integrations are
`959833af4fe01c1e13ab2b4ca6adfe2f76fcfc1f`, `0426866fa66cc022efca6d74cd5088d586d3d11b` and
`78e2f978f8d258d8c4d379f53e75089a2ce975db`. A private `mktemp` comparison proved the sole one-line
marker diff and was removed. All 21 normalized blocks byte-match SCOPE; the exact authorized checked
set is HS-002/HS-004/HS-006/HS-010/HS-014/HS-017/HS-018. Scratch SHA advances contiguously from
`c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae` to
`2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744`, 350 lines/24,246 bytes. FS-001
remains exact at `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
lines/25,441 bytes; SCOPE remains
`d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes. The
active completion event is cleared and normal dispatch may resume.

**2026-07-22T15:39:43+10:00 — P12/01 `queued -> implementing`:** P09/02 and P11A–C are passed;
HS-004's marker transaction is finalized and P12 is the next dependency-ready package. Clean literal
BASE/pre-implementation HEAD is `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`; sole implementer
artifact is `evidence/P12/implementation-01.md` and future immutable review is
`reviews/P12-review-01.md`. Authority is limited to one pure resumable bounded maintenance layer,
provider/document RAF lifetime wiring, narrowly shared bucket/alias primitives and focused P12
tests. Acceptance requires correct reads before GC; adjacent equal year/month/day merge with exact
transaction conservation/order under concurrent edits; direct parent/nested symlink rewrites; fresh
proof before the narrow symlink hard-delete exception; explicit `system:gc` excluded from Undo but
included in encrypted persistence/sync; exact per-frame item/time bounds; hidden pause/visible
resume when truthfully available; cancellation, idempotence, convergence and no self-loop/no-op
churn. Fake-RAF, property/integration, repeated no-retry journey, full validation and installed-CLI
performance/UX/ privacy evidence are mandatory. No ambiguity pauses work; any unresolved
budget/concurrency choice is a complete Q proposal using the PROCESS hierarchy. Dispatch-time dirt
is root-owned HANDOFF/PROGRESS only; index/product/executable/generated paths are clean. Scratch is
exact at `2c52bd78...` with the seven authorized markers and 21 normalized blocks; FS-001/SCOPE are
exact; no completion or rollback event is active.

**2026-07-22T16:47:18+10:00 — P12/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `f9edda60afc946ddda927616a16435a075167d7c` commits seven authorized paths, 1,798
insertions/3 deletions, from literal BASE `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Frozen sole
evidence `evidence/P12/implementation-01.md` is 256 lines/19,209 bytes at SHA-256
`f67fec9718efadcd1bf7d3f8036b29afab68d5a618985f899ec328511ea2d452`. Counterfactuals include the
absent maintenance module, missing bucket CIDs, a Mirror cross-list commit fault, minimized
concurrent same-ID copy convergence failures and two real browser lifecycle failures; final design
uses a 32-item/4ms resumable scheduler, copy/prove/remove structural phases, apply-time
revalidation, direct one-hop alias rewrites/full deletion proof, `system:gc`, and a provider-session
changed-alias barrier. Worker reports focused unit 7/7, integration 3/3, full Vitest 1,247/1,247,
typecheck, lint zero errors/10 known warnings, scoped format, affected no-retry repeat 12/12 and
explicit full no-retry E2E 87/87. Corrected installed-CLI evidence records real role/name/state,
editing/history, scroll/navigation/reload, visible duplicate tab, offline/reconnect,
mobile/media/zoom and console/ network; it truthfully records all pages visible, a light surface
under dark preference and 320/556 document zoom overflow. Root verified exact HEAD/seven
paths/index, evidence hash/size, no generated or task process, next-env clean, scratch SHA/seven
markers/21 blocks and immutable FS-001/SCOPE. No Q proposal. New review output is exactly
`reviews/P12-review-01.md`; reviewer must independently test correct-during-copy visibility, the
session barrier, bounds/convergence/hard-delete/history/sync and adjudicate both manual findings
rather than accepting final state alone.

**2026-07-22T17:25:05+10:00 — P12/01 `reviewing -> changes_requested`:** Independent immutable
review `reviews/P12-review-01.md` is 259 lines/19,663 bytes at SHA-256
`15ea3267d1fa9c425bacf3cbb95ce4f371bd48114e10fdda8c9e02859175fb77` and returns FAIL over exact
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..f9edda60afc946ddda927616a16435a075167d7c`. F-01 High
proves the separate copy/remove commits expose duplicate logical IDs through real queries; an
intervening edit can preserve divergence, delete can resurrect the source and move can leave one ID
at two dates. F-02 High proves the append-only provider-session alias blacklist makes ordinary
change-all garbage wait for remount instead of active collection. F-03 High proves 32/4ms excludes
planning, recursive copy/apply and full proof scans, while repeated first-phase invalidation can
starve every later phase. F-04 Medium reproduces the new 256-conflict fixture as FAIL/PASS/FAIL in
three focused processes and again FAIL/PASS/FAIL in isolation because it assumes peer tie order.
Independent full Vitest was 1,247/1,247 and lint/typecheck/build/scoped format, targeted no-retry
E2E 12/12 and full no-retry E2E 87/87 passed; these successes do not cover the four blockers. The
real installed-CLI charter passed lifecycle/history/sync/privacy and cleaned its data/processes;
dark and 200% zoom findings are inherited P20A/P20B ownership. Review proposal P12-01-01 is
transcribed as Q-018: select Option A, a finite per-alias live Undo/Redo history-reachability
barrier that requeues within the same provider when history clears or trims. HS-005 stays unchecked
and changes_requested; revision-01 evidence/review remain immutable and cumulative revision 02 must
close all four findings. Failure evidence, review, Q-018, risk routing and the exact
changes-requested state are durably integrated by `d339972ec3ce5d26276fae511c82418cc8e436cb`; later
revisions must never overwrite them.

**2026-07-22T17:27:52+10:00 — P12/02 `changes_requested -> implementing`:** Revision-01 failure
control is immutable at `d339972ec3ce5d26276fae511c82418cc8e436cb` and its link-only ledger commit
leaves clean preimplementation HEAD `b21ef639fb24020978cb39c2b69b83d6ff261ebb`. Cumulative review
BASE remains the original `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`; revision-02's sole worker
artifact is `evidence/P12/implementation-02.md` and future independent review is exactly
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
paths, 792 insertions/173 deletions, from preimplementation HEAD
`b21ef639fb24020978cb39c2b69b83d6ff261ebb`; cumulative review remains original BASE
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Frozen sole evidence `evidence/P12/implementation-02.md`
is 166 lines/11,337 bytes at SHA-256
`7ed3e646ec39a75ab11650fbdc17498c94f27aa2c1d5208970eb79ea2a451574`. F-01 remediation deduplicates
physical copies at production read boundaries, mutates every copy for edit/delete/move/ alias
actions and defines date/creation/import/ID total ordering; tests subscribe after every GC commit
and exercise intervening actions and both peer orders. F-02 mirrors per-alias live Undo/Redo
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
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..e8f2ca5be7ffa03c0ad6ac8e3fb72aac2accca3e`. Revision-01
F-02 and F-04 are closed; F-01 and F-03 are only partially closed. New F-01 High proves
`unnestDuplicate` and `swapDuplicate` mutate only one physical parent in the copy/remove interval,
leaving divergent parent graphs and nested/standalone duplicates. F-02 Medium proves exported find,
find-by-ID and date-range reads still select/append raw physical copies and can expose stale,
duplicated or materialization-dependent data. F-03 High confirms before/after clock checks merely
observe arbitrarily large recursive transaction copy/equality, structural/vault proof, alias scan
and CRDT mutation overruns after they monopolize a callback. Revision 03 must make nested duplicate
operations physical-copy complete, canonicalize every public read and cursor within expensive work
or enforce a proven finite payload bound. Independent automation is fully green: focused 32/32 in
three processes, isolated conflict fixture 3/3, full Vitest 1,253/1,253, lint/typecheck/build/scoped
format, affected no-retry E2E 12/12, full no-retry E2E 87/87 and isolated shift-click 3/3. Manual
change-all, Undo/Redo, inherited duplicate tab, offline/reconnect/reload, same-provider collection,
sync/privacy and cleanup pass; dark/zoom remain inherited P20A/P20B findings. HEAD is unchanged,
index empty, next-env/generated state restored and port 3000 closed. HS-005 remains unchecked and
revision-02 artifacts are immutable once the failure-control commit lands; no new question proposal
was required. Revision-02 evidence, review, risks and changes-requested state are durably integrated
by `7533fd76219a08b5e1c1aa5f66b9b85419b6275b`; later revisions must preserve them byte-for-byte.

**2026-07-22T18:29:45+10:00 — P12/03 `changes_requested -> implementing`:** Revision-02 failure
control is immutable at `7533fd76219a08b5e1c1aa5f66b9b85419b6275b` and its link-only ledger commit
leaves clean preimplementation HEAD `b2c32a40e0aca052771c45d086180522e040e5f4`. Cumulative review
BASE remains `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`; sole worker artifact is
`evidence/P12/implementation-03.md` and future review is `reviews/P12-review-03.md`. Narrow
authority covers maintenance, alias proof, transaction queries/mutations, optional Mirror support
only for container-preserving bounded relocation, and four focused unit/integration test files. F-01
requires unnest/swap across every physical parent with deterministic pre-divergence handling, both
peer orders and a clean final graph. F-02 requires canonical find/find-by-ID/date-range semantics
plus an audit of all exported reads and the import caller. F-03 requires cursors inside recursive
copy/equality, structural/vault/alias proof and apply work, or a complete backward-compatible
repository-wide payload bound; clock checks after an indivisible overrun are forbidden. Oversized
inner-work instrumentation, three clean focused processes, full validation/no-retry browser/manual
evidence and exact cleanup are mandatory. Closed Undo frontier, same-provider collection, fairness,
tie ordering, principal reads/ mutations, sync/lifecycle and all frozen boundaries must remain
green. The implementer commits only exact authorized product/test paths, leaves evidence uncommitted
and makes no PASS claim; reviewer is not dispatched until root freezes the exact new HEAD.

**2026-07-22T19:14:31+10:00 — P12/03 `implementing -> ready_for_review -> reviewing`:** Exact
revision-03 HEAD `058098dc74833523bc4a05094b164af5635f327f` contains interim conflict reconciliation
`7e1fb5d1145cbf363751c4f7bc7748844b0fd104` plus strict work-bound continuation
`058098dc74833523bc4a05094b164af5635f327f`, changing seven authorized product/test paths from
preimplementation `b2c32a40e0aca052771c45d086180522e040e5f4`. Cumulative review remains original
BASE `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Frozen evidence `evidence/P12/implementation-03.md`
is 139 lines/8,688 bytes at SHA-256
`540a3e497d3d33f4d82be5925d588e31b9ce37d030d43e88d3e412f6a38a33ce`. All-copy unnest/swap
deterministically reconciles diverged parents and standalone/promoted identities; all exported find/
find-by-ID/date-range reads share canonical value/location/order semantics. Maintenance now
discovers root/account/alias/transaction/structural work through persistent generators; builds
detached clones in at-most-eight dynamic-item chunks; attaches the completed clone and removes the
exact source in one `system:gc` commit after fixed-depth position/state validation; prunes
fixed-depth containers; and proves alias deletion through a persistent one-reference-per-step graph
cursor with exact-key constant- work apply. Oversized tests cover 128 tags, 128 allocations, 64
nested duplicates and 128 transaction/ 128 alias graphs over more than 20/256 steps. Reviewer must
independently determine that final detached- tree attach does not recursively redo unbounded work,
invalidation cannot admit stale proof/partial state, and every all-copy/query edge converges. Three
focused processes pass 4 files/85 tests each; full Vitest 1,258/1,258, typecheck, build, lint zero
errors/10 warnings, scoped format/diff, and full no-retry E2E 87/87 pass. Installed-CLI real
change-all/Undo/Redo/reload/same-provider collection passes with masked recovery material; initial
missing-secret server failure is honestly disclosed and corrected without secret output. Root
verifies exact HEAD/seven paths/empty index, evidence hash/size, no process/ generated state,
restored next-env and exact scratch/FS-001/SCOPE hashes. Review output is exactly
`reviews/P12-review-03.md`; implementer authority is closed and reviewer alone writes one PASS/FAIL.

**2026-07-22T19:40:54+10:00 — P12/03 `reviewing -> changes_requested`:** Independent cumulative
review `reviews/P12-review-03.md` is 223 lines/20,332 bytes at SHA-256
`3d68ffd573feff3e42d2b56d4be9d4626a3c4317c7bbda1079846127d20098ec` and returns FAIL over exact
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..058098dc74833523bc4a05094b164af5635f327f`. F-01 High
verifies against official Loro 1.13.7 source that final `pushContainer(job.root)` recursively
attaches/re-emits the whole detached transaction tree in one callback, so bounded preparation still
ends in an arbitrarily large apply. F-02 Medium proves multi-account `queryTransactions` and
unscoped duplicate reads concatenate per-account physical results without global logical-ID
canonicalization. F-03 Medium finds the new unnest/swap regressions are plain-object fixtures and do
not supply the mandated subscribed real-Loro relocation-interval/both-delivery-order convergence
evidence. Focused 85/85 x3, full Vitest 1,258/1,258, type/lint/build/scoped format and affected E2E
12/12 pass; full E2E is 86/87 only on inherited T021c and isolated T021c passes 3/3. Manual ordinary
history, same-provider collection, two-tab/offline/sync/privacy passes. Repo format retains only
disclosed frozen/root-ledger reds. HEAD/index/generated/browser/data/process/port cleanup and exact
scratch/ FS-001/SCOPE hashes pass. HS-005 remains unchecked; revision 04 must close all three
blockers. Revision-03 evidence, review, risks and changes-requested state are durably integrated by
`86d39c19a5c5223a729c2f296cd8de9ea60a3c91`; later revisions preserve them byte-for-byte.

**2026-07-22T19:43:08+10:00 — P12/04 `changes_requested -> implementing`:** Revision-03 failure
control is immutable at `86d39c19a5c5223a729c2f296cd8de9ea60a3c91`; clean preimplementation HEAD is
`14259b5f6d02f566e32ac94ab4d63c20b5ef0353`, while cumulative review BASE remains
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Sole evidence is `evidence/P12/implementation-04.md`;
future review is `reviews/P12-review-04.md`. F-01 should replace recursive detached-tree attachment
with bounded in-document shadow construction invisible to every public read/mutation, safely
invalidated/discarded on edits and atomically revealed with source removal only after complete fresh
validation; official Loro cost, crash/reload, Undo/sync and orphan cleanup must be proven. F-02
globally canonicalizes multi-account/unscoped results. F-03 uses subscribed real Loro and both peer
delivery orders for unnest/swap during the interval. Full cumulative automation, no-retry E2E,
installed-CLI manual evidence, cleanup and frozen checks remain mandatory. Reviewer is undispatched;
implementer writes only the exact new evidence and authorized product/test paths.

**2026-07-22T21:00:16+10:00 — P12/04 `implementing -> ready_for_review -> reviewing`:** Exact HEAD
`2489c41335ad2292f9005403c18022c46915507b` commits seven authorized paths, 1,290 insertions/ 173
deletions, from preimplementation `14259b5f6d02f566e32ac94ab4d63c20b5ef0353`; cumulative review
remains original BASE `0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Frozen evidence
`evidence/P12/implementation-04.md` is 207 lines/14,537 bytes at SHA-256
`8bc662894cf3efb60456ba235d539504f4520ef6b0af047e3d6eb882e6e63def`. The implementation replaces
detached recursive final attachment with bounded attached private shadows controlled by a low-level
synced Loro root outside public Mirror defaults; public reads/mutations filter shadows, relevant
local/ remote edits invalidate them, and fixed-work completion reveals target/removes source. Global
multi- account queries canonicalize IDs. Subscribed real-Loro both-order unnest/swap, local
invalidation, crash/reload, remote classification/convergence/private visibility/no-echo tests pass.
An initial public- Mirror metadata design caused all affected onboarding E2E to fail with
`Map value must be an object`; the worker moved metadata low-level and reran gates. Final focused
profile passes 4 files/91 tests in three processes; full Vitest 1,264/1,264, type/lint/build/scoped
format/diff pass; affected E2E 12/12; full E2E 86/87 only on inherited T021c followed by three clean
isolated passes. Installed CLI covers settings/presence/Saved, change-all/history/reload/alias
collection, offline reconnect, responsive/ dark/reduced/200%; duplicate tab required phrase unlock
and was closed without secret re-entry. Root verifies exact HEAD/paths/index, evidence hash/size,
stopped browser/server, recoverable-trash generated cleanup, restored next-env and exact frozen
hashes. Review output is only `reviews/P12-review-04.md`.

**2026-07-22T22:05:00+10:00 — P12/04 `reviewing -> changes_requested`:** Independent cumulative
review `reviews/P12-review-04.md` is 236 lines/23,016 bytes at SHA-256
`0a97f910124dfbde35243a1d736337dc14179709108f2cb4c5df3d89cefcce49` and returns FAIL. Recursive
attach boundedness and global queries close. Four blockers remain: incomplete nested shadow children
leak through lookups; mixed maintenance/user imports bypass invalidation and can stale-reveal;
unnest/ swap updates are not exchanged or physically compared; maintenance metadata persists in
public Mirror. All automation including full E2E 87/87 and T021c 3/3, manual and cleanup pass.
HS-005 stays unchecked.

**2026-07-24 — P12/05 authority expansion:** Final worker audit after interim commit
`cfeb4dae13f9eff855a1b95feb14d9c06adda016` reproduces a malformed/legacy private parent whose
real-ID incomplete nested child leaks through raw `useTransaction`. Because review-04 explicitly
names that context hook and the original revision-05 path list omitted `context.tsx`, root
authorizes exactly `src/lib/crdt/context.tsx` plus one focused hook regression. Galileo continues
the same revision and must commit the correction, update `evidence/P12/implementation-05.md`, rerun
affected gates and clean the boundary before review. No other scope, prior artifact or frozen-source
authority changes.

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
`a54ea0b726d157fabab1b3d59a3f2ca84391cfc9ff0560b48a20e08296e8326a` and returns FAIL. Review-04 F-01
through F-03 close; F-04 closes for new generation/startup. F-05 High proves disposed scheduler
authority survives per document, so a same-doc remount can trust a partial shadow after
equal-cardinality tag/allocation edits, reveal stale collection and delete the edited source. F-06
Medium proves late legacy metadata-only live sync bypasses alias-projection-gated cleanup and can
reintroduce the reserved account through raw `useTransactions`. Automated/manual gates are green;
HEAD/index/cleanup/frozen boundaries pass. HS-005 remains unchecked and revision 06 must close both
lifecycle races.

**2026-07-24 — P12/06 `changes_requested -> implementing`:** Revision-05 failure is immutable at
`2f39bf17e64526b63376590f2f72e730a504472e`; clean preimplementation HEAD is
`a98b3b00a6858b40398531204633832790d59c5f`, cumulative BASE remains `0a9b8827...`, sole evidence is
`evidence/P12/implementation-06.md` and future review is `reviews/P12-review-06.md`. Authority is
narrowly scheduler/context lifecycle plus focused maintenance/context integration tests. Disposal
must revoke all trust generations; equal-cardinality value edits must stale the shadow; late legacy
metadata- only sync must independently trigger bounded cleanup and stay hidden from raw hooks. All
cumulative automation/manual/cleanup/frozen gates remain mandatory; reviewer is undispatched.

**2026-07-24 — P12/06 `implementing -> ready_for_review -> reviewing`:** Final HEAD
`9939d68cb6752f174c2fc60e4e815c7af52dd0d7` contains commits `8c83dd7`/`9939d68` across exactly
context, maintenance and vault-maintenance integration tests. Evidence is 191 lines/12,326 bytes at
SHA-256 `08ca7c17f64371f1f6c06ef1b8593cee035477f5b8a8dfb09431ec40b59a177c`. Four
dispose/edit/remount counterexamples pass; late marker-only and marker-plus-domain imports stay
hidden, receive one bounded cleanup update and do not resurrect. Focused 102/102 x3, full Vitest
1,275/1,275, type/lint/build/ scoped format, affected E2E 12/12 and full no-retry E2E 87/87 pass.
Root verifies exact HEAD/paths/ index, evidence hash/size, no generated/process state and exact
frozen boundaries. Reviewer alone writes `reviews/P12-review-06.md` over cumulative original
BASE..HEAD.

**2026-07-24 — P12/06 `reviewing -> changes_requested`:** Independent review
`reviews/P12-review-06.md` is 165 lines/11,879 bytes at SHA-256
`a6182d430b761fd57c0ebd5ce08045811e952979303ab59b74afa885d8a8693e` and returns FAIL. F-05 closes;
F-06 cleanup and `useTransactions` close. F-07 Medium proves generic exported
`useVaultSelector(state => state.transactions)` still forwards raw reserved state to
People/Statuses/ Tags tables before the next visible cleanup frame. All automated/manual gates pass.
HS-005 stays unchecked.

**2026-07-24 — P12/07 `changes_requested -> implementing`:** Revision-06 failure is immutable at
`150f17bf3a08ff911792db251d352e889e632d96`; clean preimplementation HEAD is `bebf4f546...` and
cumulative BASE remains `0a9b8827...`. Authority is narrowly `context.tsx` plus focused
actual-context/ consumer regression tests. Generic `useVaultSelector` must sanitize transaction
state before selectors for People/Statuses/Tags or arbitrary callers run, in the same notification
before cleanup, while preserving unrelated state identity/subscription behavior. Evidence/review
paths are revisioned 07; all cumulative gates remain mandatory and reviewer is undispatched.

**2026-07-24T18:01:25+10:00 — P12/07 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `ebe2fb6caf70acbdb88245cf3121f8c6356b1162` changes only `src/lib/crdt/context.tsx`
and `tests/integration/vault-maintenance.test.tsx` from clean preimplementation HEAD
`bebf4f546c8a7715934adbafd757dfdcd27dec91`. Frozen evidence `evidence/P12/implementation-07.md` is
196 lines/13,005 bytes at SHA-256
`f2bb54706d9f1c69b31573d6c3f9be3175043e63cb7a810f00d5917dc64c7a22`. Generic caller selectors receive
sanitized transaction state before execution while unrelated state identity is retained. Reported
green: focused 105/105 in three clean processes, full Vitest 1,278/1,278, typecheck, lint, build,
affected no-retry E2E 15/15, full no-retry E2E 87/87 and the authenticated/offline/two-tab/
responsive manual charter. Root verifies exact HEAD, two-path committed range, empty index, cleanup,
restored generated state, scratch SHA `2c52bd78...`, exact 21 normalized blocks and authorized
checked set, canonical FS-001 and SCOPE hashes. Independent review alone writes
`reviews/P12-review-07.md` over cumulative original BASE..HEAD; HS-005 remains unchecked.

**2026-07-24 — P12/07 `reviewing -> changes_requested`:** Independent cumulative review
`reviews/P12-review-07.md` is 209 lines/21,524 bytes at SHA-256
`2efb05fe259074868b4e2852550f9fcd8caf8ec654f1d1eb926e038f11d14ad5` and returns FAIL. The selector
portion of revision-06 F-07 closes across direct/whole-state/spread/descriptor/reserved-key shapes
and People/Statuses/Tags in the same pre-cleanup notification. F-08 High finds that the chosen
projection synchronously traverses the whole vault on a new transaction snapshot outside RAF
item/time budgets. F-09 Medium finds that exported generic `useVaultAction` still passes raw private
transaction state to callbacks. Independent focused 105/105 x3, full Vitest 1,278/1,278,
type/lint/build, affected no-retry E2E 15/15, full no-retry E2E 87/87 and the manual charter pass.
Root verifies exact HEAD/index/write boundary, cleans recoverable generated output, and retains
exact frozen hashes. No Q proposal; HS-005 remains unchecked and revision 08 must close F-08/F-09.
Immutable evidence, review and failure control state are committed as
`0216abbf76d40b07461af2bad94869fd3040c4fa`.

**2026-07-24 — P12/08 `changes_requested -> implementing`:** Revision-07 failure is immutable at
`0216abbf76d40b07461af2bad94869fd3040c4fa`; clean preimplementation HEAD is
`a5570e3d805cbb65af3f4cf5cead554fef279bce`, while cumulative BASE remains
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e`. Sole evidence is `evidence/P12/implementation-08.md`;
future review is `reviews/P12-review-08.md`. Authority is exactly `src/lib/crdt/context.tsx` plus
focused `tests/integration/vault-maintenance.test.tsx`. F-08 requires measured path-lazy/incremental
or otherwise bounded public selector work that never visits unrelated vault trees or moves unbounded
work outside RAF budgets. F-09 requires every generic application-state action callback to be unable
to observe reserved/private transaction state before cleanup while preserving legitimate mutation,
Undo origin and one cleanup update. Same-notification selector privacy and all cumulative gates
remain mandatory; reviewer is undispatched and HS-005 remains unchecked.

**2026-07-24T18:54:27+10:00 — P12/08 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `a2a31839f6bb57855fa60b8cfcc06feed069cafa` changes only `src/lib/crdt/context.tsx`
and `tests/integration/vault-maintenance.test.tsx` from clean preimplementation HEAD
`a5570e3d805cbb65af3f4cf5cead554fef279bce`. Frozen evidence `evidence/P12/implementation-08.md` is
202 lines/13,758 bytes at SHA-256
`c3d0753c48884fea4d15a93b3570301ea3c69f071ab02d1a831daa9a4ce50900`. A cached path-lazy proxy
membrane hides reserved/private transaction state for selectors and generic actions while avoiding
unrelated account/year/month/day/transaction/nested visits and retaining write-through domain
mutation/Undo behavior. Reported green: focused 107/107 in three clean processes, full Vitest
1,280/1,280, typecheck, lint, build, affected no-retry E2E 15/15, full no-retry E2E 87/87 and the
authenticated/offline/two-tab/responsive manual charter. Root verifies exact HEAD, two-path
committed range, empty index, cleanup, restored generated state, exact 21 normalized
blocks/authorized checked set and canonical scratch/FS-001/SCOPE hashes. Independent review alone
writes `reviews/P12-review-08.md` over cumulative original BASE..HEAD; HS-005 remains unchecked.

**2026-07-24 — P12/08 `reviewing -> passed`; artifact integration pending:** Independent cumulative
review `reviews/P12-review-08.md` is 154 lines/19,113 bytes at SHA-256
`6d46633271fbfcfcdcf573e62c4a0350d06b315faf7bf43ac006be379abedf85` and returns PASS over exact
`0a9b8827debdfa96e6b87c3b9ccf95411bd5862e..a2a31839f6bb57855fa60b8cfcc06feed069cafa`. F-08 closes
because the cached membrane projects only explicitly requested paths; a 24-account real-provider
fixture records zero unrelated parent/nested classifier visits before and after an ordinary update.
F-09 closes because generic selector/action/edit callbacks all receive the runtime public membrane;
direct/enumeration/descriptor/nested reads stay clean while public writes persist, one `system:gc`
cleanup occurs and Undo reverts only user work. Independent focused 107/107 x3, full Vitest
1,280/1,280, type/lint/build, affected no-retry E2E 15/15, full no-retry E2E 87/87 and manual
active-edit/offline/two-tab/responsive gates pass. Exact HEAD/index/cleanup/frozen boundaries pass;
no finding or Q proposal. Root acceptance integrates D-015 and R-006/R-008/R-009 transcriptions;
HS-005 remains unchecked until the separate durable marker event.

**2026-07-24 — P12/08 artifact integration; HS-005 `queued -> completion_pending`:** Exact
revision-08 evidence/review, independent PASS, D-015 and R-006/R-008/R-009 transcriptions are
integrated in `f8cbb5a8caacb763c0bb77199595a5ee332ab729`; reviewed product/test HEAD remains
`a2a31839f6bb57855fa60b8cfcc06feed069cafa`. P12 is passed and is the sole package mapped to HS-005.
Root authorizes only HS-005's first-line `[] -> [x]` marker from exact scratch SHA
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
`2c52bd78c6efec683c2bc59fc2de225bb8bc997fc2f01699f90c98ddc3b65744 -> aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`,
350 lines/24,247 bytes. The completion event is cleared and package dispatch may resume.

**2026-07-24 — P13/01 `queued -> implementing`:** Dependencies P09/02 and P11A–C are passed and
HS-005's marker event is finalized. Literal original BASE/preimplementation HEAD is
`415ea080b3b19191fd71601742056a619b4a3080`; sole evidence is `evidence/P13/implementation-01.md` and
future review is `reviews/P13-review-01.md`. Authority is limited to the ordinary Transactions
page/table/row/toolbar/grid-navigation surface, narrowly existing transaction insertion APIs only if
required, and focused transaction/keyboard/ virtualization/integration/E2E tests. Replace the single
special add form with immediate distinct persisted empty rows using normal affordances; prove valid
defaults, rapid-add uniqueness, alias legality, selection/arrows/focus/virtualization, one-step
Undo/Redo, reload/offline/two-tab convergence, accessibility and no confirm/cancel/add-only state.
Component, CRDT, sync and E2E repository guides apply. Full focused x3, full Vitest/checks, affected
x3 and full no-retry E2E, installed-CLI charter, cleanup and frozen checks are mandatory. Reviewer
is undispatched; HS-001 remains unchecked.

**2026-07-24 — P13/01 authority expansion:** Removing the authorized dead `AddTransactionRow.tsx`
implementation requires removing its export from `src/components/features/transactions/index.ts`;
root authorizes exactly that barrel-export edit. The worker may not add any other unlisted path
without a reproduced blocker and prior root expansion. Revision, BASE, evidence/review paths,
acceptance and frozen boundary remain unchanged.

**2026-07-24 — P13/01 retained-E2E authority expansion:** After the ordinary-row implementation, the
existing description-alias pointer journey times out on removed `new-transaction-description`
controls and the tab-duplication journey times out on its removed Description/0.00 special-form
block. A compatibility shim would restore the forbidden add-only UX. Root therefore authorizes
exactly `tests/e2e/description-aliases.spec.ts` and `tests/e2e/tab-duplication.spec.ts` to drive the
selected ordinary row instead; only the alias journey's Add-then-edit Undo expectation may change
with it. No additional product or E2E path is authorized.

**2026-07-24T20:07:05+10:00 — P13/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `6276108f4ebae4e63a23cbf5d532b8843e9f0a98` is one commit over literal BASE
`415ea080b3b19191fd71601742056a619b4a3080`, with exactly 15 authorized paths and deletion of the
dead add-only component. Frozen evidence `evidence/P13/implementation-01.md` is 227 lines/15,227
bytes at SHA-256 `910135f64546a22d41218df0f7ce3c00c5b7b5434604108e057e51770a22c9f9`. Each Add now
inserts/selects a distinct persisted ordinary empty row using valid account/status/date/
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
finding; HS-001 remains unchecked. Immutable evidence, review, R-010 transcription and failure
control state are committed as `f54526821bec08698214065c48ea237bf718fe15`.

**2026-07-24 — P13/02 `changes_requested -> implementing`:** Revision-01 failure is immutable at
`f54526821bec08698214065c48ea237bf718fe15`; clean preimplementation HEAD is
`57398ea27d2af6523d26ccc3227433feaebe29e3`, while cumulative BASE remains
`415ea080b3b19191fd71601742056a619b4a3080`. Sole evidence is `evidence/P13/implementation-02.md`;
future review is `reviews/P13-review-02.md`. Authority is exactly the Transactions page and focused
`transactions.spec.ts` coverage. Close F-01 with a predictable reveal policy across excluding
search/account/tag/person/status/date/duplicates filters, keeping visible row/count/selection/filter
state coherent in the same Add interaction and through reload plus one-step Undo/Redo. No special
add mode or compatibility form may return. All cumulative P13 automation/manual/cleanup/frozen gates
remain mandatory; reviewer is undispatched and HS-001 remains unchecked.

**2026-07-24T20:59:39+10:00 — P13/02 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `8f6e4f2ad77da24016169a79286a9727f3394aca` changes only the Transactions page and
`transactions.spec.ts` from clean preimplementation HEAD `57398ea27d2af6523d26ccc3227433feaebe29e3`.
Frozen evidence `evidence/P13/implementation-02.md` is 178 lines/11,584 bytes at SHA-256
`2ef2070960cac20bf0e9bc138928b3c11c94671f57af2f8a8ba94009e0e81bdd`. Add synchronously resets the
complete local filter state before ordinary-row insertion/selection. Search/date/tag/person/account/
status/duplicates exclusions each reveal one selected row with coherent unfiltered count; filters
remain outside CRDT/history. Reported green: focused 76/76 x3, full Vitest 1,286/1,286,
type/lint/build, targeted filter 1/1, affected no-retry 66/66, full no-retry E2E 91/91 and the
complete filter/history/reload/rapid-add/grid/offline/two-tab/responsive manual charter. Root
verifies exact HEAD/parent/two-path range/index, evidence identity, cleanup, restored generated
state and frozen hashes. Reviewer alone writes `reviews/P13-review-02.md`; HS-001 remains unchecked.

**2026-07-24T21:22:32+10:00 — P13/02 `reviewing -> changes_requested`:** Independent cumulative
review `reviews/P13-review-02.md` is 204 lines/21,835 bytes at SHA-256
`157dfc363788966f90fd5dca0f23506f65a75f4794261359ab89f443d9603b91` and returns FAIL over exact
`415ea080b3b19191fd71601742056a619b4a3080..8f6e4f2ad77da24016169a79286a9727f3394aca`. The
filter-control part of F-01 closes for search/date/tag/person/account/status/duplicates, but the
whole immediate-visibility gate remains open: after 51 legal future-dated imports, excluding
search→Add clears filters and reports `66 transactions · 1 selected` while the selected ordinary row
is absent from the initial 50-row slice until load-more. Revision 03 must reconcile the created
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
`415ea080b3b19191fd71601742056a619b4a3080`. Sole evidence is `evidence/P13/implementation-03.md`;
future review is `reviews/P13-review-03.md`. Authority is exactly the Transactions page and focused
`transactions.spec.ts` coverage. Close the remaining F-01 with more than `PAGE_SIZE` legal
higher-sorted transactions: the created logical ID must be in the displayed slice and selected
immediately without load-more, count/Bulk Edit/selection must never target an undisplayed row, and
canonical ordering plus bounded virtualization must remain intact. Prove exact-ID/defaults, one-step
Undo/Redo and reload persistence while retaining all seven filter classes and all cumulative P13
automation/manual/cleanup/frozen gates. Reviewer is undispatched and HS-001 remains unchecked.

**2026-07-24T22:05:39+10:00 — P13/03 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `9f307e200676711ca2a3ba81bd816314807434ad` changes only the Transactions page and
`transactions.spec.ts` from clean preimplementation HEAD `8971b63cf9671652c5739cb68681c42302813f6c`.
Frozen evidence `evidence/P13/implementation-03.md` is 212 lines/14,968 bytes at SHA-256
`1b6a949b7136b3e5aa3448f9815a9437624b1fb7c80a63951c49555fd67a2f2d`. Add computes the created row's
canonical index, expands the displayed prefix to the containing page boundary, scrolls the existing
virtualized grid to that row and derives count/Bulk Edit selection only from displayed IDs. Reported
green: exact pagination 1/1, focused 76/76 x3, full Vitest 1,286/1,286, type/lint/build, affected
no-retry 69/69, full no-retry E2E 92/92 and the complete >PAGE_SIZE
pagination/seven-filter/history/reload/rapid-add/grid/offline/two-tab/responsive/privacy manual
charter. One combined diagnostic's unchanged virtualization journey timed out, then passed isolated
3/3 and in both final matrices; evidence records it exactly. Root verifies exact HEAD/parent/
two-path range/index, evidence identity, cleanup, restored generated state, no task process/listener
and frozen hashes. Review-generated `.next` was moved to recoverable trash after the root server
stopped. Reviewer alone writes `reviews/P13-review-03.md`; HS-001 remains unchecked.

**2026-07-24T22:42:28+10:00 — P13/03 `reviewing -> passed`; artifact integration pending:**
Independent cumulative review `reviews/P13-review-03.md` is 177 lines/18,583 bytes at SHA-256
`d875ee06c2899bf28b96d2045df288cc2fc15a9b27af67492a293656befc5eda` and returns PASS over exact
`415ea080b3b19191fd71601742056a619b4a3080..9f307e200676711ca2a3ba81bd816314807434ad`. Review-02 F-01
closes: more than `PAGE_SIZE` legal higher-sorted rows now produce an immediately visible selected
ordinary row at canonical index 51, only 17 mounted rows, coherent count/Bulk Edit and preserved Add
focus. Exact-ID Undo/Redo, reload, rapid Add, all seven filters, grid/alias/ ordinary editing,
offline/two-tab convergence, encrypted sync and responsive behavior pass. Independent focused 76/76
x3, full Vitest 1,286/1,286, exact pagination 1/1, broader affected no-retry 147/147 and full
no-retry E2E 92/92 pass. Exact HEAD/index/cleanup/frozen boundaries pass; no High/Medium finding or
Q proposal. Root acceptance integrates R-009/R-010 transcriptions; HS-001 remains unchecked until
the separate durable marker event.

**2026-07-24T22:43:15+10:00 — P13/03 artifact integration; HS-001 `queued -> completion_pending`:**
Exact revision-03 evidence/review, independent PASS and R-009/R-010 transcriptions are integrated in
`7a04338fa7c3f68463d12d11082bc56e87c1872b`; reviewed product/test HEAD remains
`9f307e200676711ca2a3ba81bd816314807434ad`. P13 is passed and is the sole package mapped to HS-001.
Root authorizes only HS-001's first-line `[] -> [x]` marker from exact scratch SHA
`aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f`, mapped to immutable
`reviews/P13-review-03.md`. The checked set remains
HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018 until the marker is applied; all 21
normalized blocks, canonical FS-001 and SCOPE are exact. No package dispatch is legal while this
event is pending.

**2026-07-24T22:45:00+10:00 — HS-001 `completion_pending -> passed`:** Exact marker-only `[] -> [x]`
finalized after P13 review `reviews/P13-review-03.md` and integration
`7a04338fa7c3f68463d12d11082bc56e87c1872b`. The private comparison copy showed exactly the HS-001
first-line marker change and was removed. All 21 normalized blocks byte-match SCOPE; checked set is
exactly HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018; FS-001 and SCOPE remain
exact. Scratch SHA advances
`aa8a1f56df6716cb73071c694015030311611fc102af71b0b2e5a31cba281a8f -> b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`,
350 lines/24,248 bytes. The completion event is cleared and package dispatch may resume.

**2026-07-24T22:48:00+10:00 — P14/01 `queued -> implementing`:** P09/02 is passed and the HS-001
marker event is finalized. Literal original BASE/preimplementation HEAD is
`b9105028926d24a5a0c5454777a6c33379ca606a`; sole evidence is `evidence/P14/implementation-01.md` and
future review is `reviews/P14-review-01.md`. Authority is limited to the enumerated
import/transaction schema, mutation, query, maintenance, amount-cell, imports/transactions page,
bounded sync-encoding owners and focused unit/integration/E2E paths in HANDOFF. Implement exact
parent/nested import lineage, first-edit immutable original minor units, currency-correct accessible
tooltip, one-action one-step reversible import deletion with cross-import isolation, and R-023
1,000-row encrypted persistence without unbounded base64 spread. Apply
import/CRDT/components/sync/E2E guides; preserve legacy optionality, aliases, buckets, history,
privacy and frozen sources. Focused x3, full checks, affected repeated no-retry E2E, full no-retry
E2E, installed-CLI charter, cleanup and any complete non-blocking Q proposal are mandatory. Reviewer
is undispatched and HS-008 remains unchecked.

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
BASE `b9105028926d24a5a0c5454777a6c33379ca606a` through the 24 authorized implementation/test paths
plus the prior root-only dispatch/scope control commit. Frozen evidence
`evidence/P14/implementation-01.md` is 220 lines/14,875 bytes at SHA-256
`7e4c4f8244484ee8885ecc4c547069a10d7891689a917e3332a652574754c522`. Reproduced reds cover
cross-import nested-row loss, absent first-edit origin and the real 1,000-row base64 stack overflow.
Reported green includes focused 118/118 x3, owner-aligned 195/195, full Vitest 1,296/1,296, full
no-retry E2E 93/93, exact CSV/OFX repeats and the installed-CLI lineage/currency/delete/history/
large/offline/privacy charter. The initial 200%-zoom tooltip clipping and 3.22:1 positive contrast
were rejected during implementation; exact final recapture contains the full tooltip, arrow and text
inside 390x844 at 200%, with 4.94:1 and 20.17:1 contrast. Root verifies exact HEAD/range/path/
index/cleanup, no review artifact or Q proposal, scratch/21 blocks, FS-001 and SCOPE. Reviewer alone
may now write `reviews/P14-review-01.md`; HS-008 remains unchecked.

**2026-07-25T00:26:42+10:00 — P14/01 `reviewing -> changes_requested`:** Immutable independent
review `reviews/P14-review-01.md` is 171 lines/13,684 bytes at SHA-256
`92bbcf462e6cceb973adb9525402cc357ed37706d67752169506ae286e1b621f` and returns FAIL over exact
`b9105028926d24a5a0c5454777a6c33379ca606a..8643fff75f8d70a6485f9c23fcca33a231d9d9cf`. F-01 Medium
Requirements/UX proves that after an ordinary deletion leaves three live linked rows, the imports
row and destructive dialog still use immutable original `Import.transactionCount=4` and falsely say
four transactions will be deleted. The atomic current-set operation itself is sound: it deletes the
live three, preserves the 1,000-row other import/manual row, one Undo restores exactly the three
plus record while the independently deleted row stays absent, and one Redo removes them again.
Independent focused 118/118 x3, owner 195/195, full Vitest 1,296/1,296, changed E2E 3/3, affected
E2E 180/180 and full E2E 93/93 pass; installed CLI independently confirms lineage, currency
precision, 390x844/200% containment, encryption and 1,000-row persistence. Review also records that
frozen revision-01 evidence itself is a fourteenth repository format failure and misreported that
gate as the prior thirteen paths. Revision 02 must derive destructive copy from the same live linked
identity set, add the exact stale-count/delete/history/isolation journey and report/ format its new
evidence accurately. No Q proposal; exact HEAD/index/cleanup/frozen boundaries pass; HS-008 remains
unchecked.

**2026-07-25T00:29:40+10:00 — P14/02 `changes_requested -> implementing`:** Revision-01
evidence/review and F-01 are immutable in control commit `7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2`;
original cumulative review BASE remains `b9105028926d24a5a0c5454777a6c33379ca606a`, and the exact
revision-02 pre-implementation HEAD is `7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2`. Sole new evidence
is `evidence/P14/implementation-02.md`; future review is `reviews/P14-review-02.md`. Authority is
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
from pre-HEAD `7db79a68db5e08f9ad4f8dfd0b01fb16b31b98a2` is exactly `src/app/(app)/imports/page.tsx`
and `tests/e2e/import.spec.ts`, 58 insertions/11 deletions. Frozen evidence
`evidence/P14/implementation-02.md` is 156 lines/11,793 bytes at SHA-256
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
`b9105028926d24a5a0c5454777a6c33379ca606a..93d89145fe910a1348ccd4a4f0c79f2022801465`. F-02 Medium
Requirements/UX proves the revision-02 projection counts only top-level `getAllTransactions()` rows
while normal duplicate import stores a distinct imported identity in `suspectedDuplicates` and
atomic deletion removes it. Installed normal UI reproduced nested import table/dialog count zero,
confirm deleting one nested transaction/record, Undo restoring both and Redo removing both while the
other-import parent survived. Revision-01 F-01 remains fixed for ordinary parents. Independent
focused 118/118 x3, owner 195/195, full Vitest 1,296/1,296, F-01 E2E 3/3, affected E2E 60/60 and
full E2E 93/93 pass; cumulative CLI origin/zoom/contrast/1,000-row/ encryption/offline/two-tab
samples pass, with an uncredited final CLI reload probe closing unexpectedly. Revision 03 must
centralize complete active parent+nested distinct-ID enumeration, deduplicate relocation/conflict
copies with deletion-equivalent identity semantics, and add normal nested-import
count/delete/Undo/Redo coverage. No Q proposal; exact HEAD/index/cleanup/frozen boundaries pass;
HS-008 remains unchecked.

**2026-07-25T01:39:04+10:00 — P14/03 `changes_requested -> implementing`:** Revision-02
evidence/review and F-02 are immutable in control commit `3f9597873ea965638a8f53e08ced339cdc3ce8ca`;
original cumulative review BASE remains `b9105028926d24a5a0c5454777a6c33379ca606a`, and the exact
revision-03 pre-implementation HEAD is `3f9597873ea965638a8f53e08ced339cdc3ce8ca`. Sole new evidence
is `evidence/P14/implementation-03.md`; future review is `reviews/P14-review-03.md`. Authority is
exactly the canonical transaction query, its context hook, imports-page consumer, focused query unit
test and import E2E. Centralize complete public parent/nested enumeration, collapse physical
relocation/conflict copies by logical ID, filter active identities with deletion-equivalent
semantics, and leave the parent-only transaction-grid contract and sound atomic mutation unchanged.
Reproduce the ordinary duplicate-import zero-count red; prove parent and nested counts one, exact
nested delete/Undo/Redo and parent/cross-import/manual preservation. Retain F-01 and every
cumulative HS-008 gate, run required repeated/full automated and installed-CLI evidence, report the
14 inherited format failures exactly and format only the new evidence. Both prior revisions remain
immutable, HS-008 remains unchecked and the reviewer is undispatched.

**2026-07-25T02:18:06+10:00 — P14/03 `implementing -> ready_for_review -> reviewing`:** Exact
cumulative product/test HEAD is `cf6456eeb5bd4029ae57eeb83da7e53194396a4d`; the revision-03 delta
from pre-HEAD `3f9597873ea965638a8f53e08ced339cdc3ce8ca` is exactly the five authorized
query/context/imports-page/unit/E2E paths, 275 insertions/5 deletions. Frozen evidence
`evidence/P14/implementation-03.md` is 159 lines/11,901 bytes at SHA-256
`c07a417ba39a58801e7d411adcd4c87c47614e526d6c35aa1e456a306e85eb8d`. Unchanged revision-02 F-02
reproduced expected-one/received-zero and two missing-query unit reds. The new separate canonical
projection enumerates active public parents/nested identities and collapses relocation/conflict
copies by logical ID while leaving the transaction-grid hook and delete mutation unchanged. Reported
green includes F-02 3/3, retained F-01 1/1, focused 120/120 x3, owner 197/197, full Vitest
1,298/1,298, affected E2E 61/61 and full E2E 94/94 with retries zero. Installed CLI reports exact
nested count/delete/Undo/Redo, stale-parent count, lineage/accessibility, 1,000-row reload/
virtualization, encrypted request privacy, offline origin, duplicate-tab convergence and clean final
console. Root stopped the keyed server, restored generated source, recoverably cleaned only current
task artifacts, verified exact HEAD/range/path/index/artifact formatting/prior hashes and all frozen
boundaries. Reviewer alone may now write `reviews/P14-review-03.md`; HS-008 remains unchecked.

**2026-07-25T02:49:55+10:00 — P14/03 `reviewing -> changes_requested`:** Immutable independent
review `reviews/P14-review-03.md` is 201 lines/16,049 bytes at SHA-256
`e5df38ff0486c5f65d8f734e7dcdd87522ea169667f477d1bdaac6f1f1b57af8` and returns FAIL over exact
`b9105028926d24a5a0c5454777a6c33379ca606a..cf6456eeb5bd4029ae57eeb83da7e53194396a4d`. F-03 Medium
Accessibility/UX deterministically proves row-position-dependent original-amount tooltip clipping at
390x844/200% zoom: a focused/hovered lower visible edited imported row places the tooltip wholly
below the viewport, and an offset virtualized row overflows right by 42px, while the first-row
control is contained and the programmatic description remains correct. F-01 and F-02 are closed.
Independent focused 120/120 x3, owner 197/197, full Vitest 1,298/1,298, F-02 3/3, F-01 1/1, affected
E2E 61/61 and full E2E 94/94 pass with static/build/format gates; installed CLI also confirms
count/delete/history, lineage/origin/contrast, 1,000-row reload, encryption, offline/two-tab and
clean final reload. Revision 04 must implement collision-aware positioning in the actual zoomed
viewport/nested scroll context and add deterministic lower/right-offset focus and hover containment
tests. Root stopped the server, restored generated source and recoverably cleaned only review
artifacts. No Q proposal; exact HEAD/index/frozen boundaries pass; HS-008 remains unchecked.

**2026-07-25T02:51:11+10:00 — P14/04 `changes_requested -> implementing`:** Revision-03
evidence/review and F-03 are immutable in control commit `8fc2163b6a44cb01775d4134f702b98f4ff9a680`;
original cumulative review BASE remains `b9105028926d24a5a0c5454777a6c33379ca606a`, and the exact
revision-04 pre-implementation HEAD is `8fc2163b6a44cb01775d4134f702b98f4ff9a680`. Sole new evidence
is `evidence/P14/implementation-04.md`; future review is `reviews/P14-review-04.md`. Authority is
limited to the amount-tooltip component, checked-in import E2E and an optional exact new focused
component test. Reproduce F-03 before product code with deterministic 390x844/200%-zoom dark/
reduced-motion geometry across first, lower and right-offset virtualized rows using both focus and
hover; then keep every tooltip edge in the actual viewport without hiding it, weakening visual
access, relying only on aria description or disabling zoom/virtualization. Shared tooltip primitives
require a separately proven blocker and root expansion. Retain F-02 x3, F-01 and all cumulative
HS-008 automation/CLI/privacy/scale gates, report the exact 14 inherited format failures and format
only new evidence. All prior revisions remain immutable, HS-008 remains unchecked and the reviewer
is undispatched.

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
`b9105028926d24a5a0c5454777a6c33379ca606a..305d6613673cf200d456276c076463b68c075500`. F-03 closes
with all six first/lower/right-offset hover/focus content, rendered-text and arrow boxes contained
at 390x844/200% zoom, a tightest exact eight-pixel margin, stable settled frames, correct accessible
roles/descriptions and 20.157:1 contrast. F-02/F-01 remain closed with exact nested and top-level
live-identity count/delete/Undo/Redo isolation. Independent F-03 3/3, F-02 3/3, F-01 1/1, focused
120/120 x3, owner 197/197, full Vitest 1,298/1,298, affected no-retry E2E 62/62 and full no-retry
E2E 95/95 pass, along with typecheck/lint/build/scoped format and diff gates. The installed-CLI
charter independently preserves eight-decimal origin, 1,000-row encrypted persistence and bounded
rendering, offline/two-tab convergence, clean lifecycle/console and exact cleanup. Frozen sources,
all prior artifacts, HEAD and index boundaries pass; no material finding or Q proposal. Root
acceptance transcribes R-010/R-023 and D-016; HS-008 remains unchecked until the separate durable
marker event.

**2026-07-25T04:11:25+10:00 — HS-008 `queued -> completion_pending`:** P14 revision-04 PASS,
immutable evidence/review and root transcriptions are integrated as
`a2182116db08200b8b4df28412512b9ca3406aa2`. Root durably prepares the sole authorized frozen-source
edit: change only HS-008's first-line marker from `[]` to `[x]` against pre-change scratch SHA
`b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d`. The authorized checked set
remains HS-001/HS-002/HS-004/HS-005/HS-006/HS-010/HS-014/HS-017/HS-018 until the marker is applied.
All 21 normalized blocks, canonical FS-001 and SCOPE are exact. No package dispatch is legal while
this event is pending.

**2026-07-25T04:12:16+10:00 — HS-008 `completion_pending -> passed`:** Exact marker-only `[] -> [x]`
finalized after P14 review `reviews/P14-review-04.md` and integration
`a2182116db08200b8b4df28412512b9ca3406aa2`. The private comparison copy showed exactly the HS-008
first-line marker change and was removed. All 21 normalized blocks byte-match SCOPE; checked set is
exactly HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-014/HS-017/HS-018; FS-001 and SCOPE
remain exact. Scratch SHA advances
`b09454dea925ebd5af185c4b5011762a38beac852ef728c9adaf4e343782561d -> f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`,
350 lines/24,249 bytes. The completion event is cleared and package dispatch may resume.

**2026-07-25T04:15:08+10:00 — P15/01 `queued -> implementing`:** P14/04 and the exact HS-008 marker
are complete at clean preimplementation BASE/HEAD `b3e96ba9e9487d13df56956d220fffca63d6482d`. Sole
implementation evidence is `evidence/P15/implementation-01.md`; future independent review is
`reviews/P15-review-01.md`. Authority is limited to the exact shared validation, bounded
transfer/provider, reusable whole-surface drop target, three app pages/layout, import exports and
focused unit/component/import E2E owners named in HANDOFF. Picker and real DataTransfer drop paths
must share typed single-file/extension/size/empty/readability/content validation before navigation;
the existing plaintext `FileReader`/sessionStorage copy must be removed. Imports-list and
transactions-table surfaces must remain stable across nested child/virtualized drag events, show
accessible actionable errors, transfer the original File one-shot into unchanged
preview/mapping/confirmation, preserve cancel/back/focus and never auto-import or leak content.
Red-before-green, repeated focused, affected/full automation, installed-CLI
responsive/dark/reduced/privacy/cleanup and P13/P14 preservation gates are mandatory. Reviewer is
undispatched; HS-013 remains unchecked.

**2026-07-25T05:00:38+10:00 — P15/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test HEAD `d652032ea4f738e06fd5a29018bd341010285696` changes exactly 13 authorized paths
from control HEAD `f0373722ffeca6812820f5270190c203300f712b`. Frozen evidence
`evidence/P15/implementation-01.md` is 177 lines/13,180 bytes at SHA-256
`5ad467cdaaec07685d20fdeff28aff1d5564e571fbd5e3ca99d6a452c97cd05e`. BASE red was 2 missing-owner
unit suites and 0/4 browser journeys; final focused unit is 9/9 x3 and real DataTransfer E2E is
12/12 across three repeats. Shared typed 8-KiB-sniff validation, a one-shot vault/route-scoped
in-memory original-File transfer and one reusable nested-depth drop target replace duplicated
validation and plaintext sessionStorage copying across Imports, Transactions and the existing
picker. Reported green includes import profile 262/262, full Vitest 1,307/1,307, affected no-retry
Chromium 66/66 and full 99/99, plus type/lint/build/scoped format/diff gates. Installed CLI reports
stable 320px dark/reduced overlay, six invalid cases with focus restoration, keyboard picker,
mixed-case CSV/OFX/QFX cancel/confirm flows, filtered child/edge drop, deterministic reload,
encrypted push with no synthetic plaintext and zero console warnings/errors. Two failed exploratory
listener harnesses and one hung optional 60-row probe are explicitly excluded; automation owns the
repeated virtualized/scale result. Root stopped the keyed server, restored generated source and
moved only current `.next`, `test-results` and nine CLI artifacts to recoverable trash. Exact
HEAD/index/worktree/evidence formatting, frozen hashes and all 21 normalized blocks pass. Reviewer
alone may now write `reviews/P15-review-01.md`; HS-013 remains unchecked.

**2026-07-25T05:30:37+10:00 — P15/01 `reviewing -> changes_requested`; failure integration
pending:** Independent review `reviews/P15-review-01.md` is 227 lines/16,347 bytes at SHA-256
`4da58be357d490f28d5fbe0858a0e428ef8842258adcc2a87dd942da5b86cd44` and returns FAIL over exact
`b3e96ba9e9487d13df56956d220fffca63d6482d..d652032ea4f738e06fd5a29018bd341010285696`. F-01 rejects
supported XML-declaration/OFX-2.x input before the already-capable parser. F-02 admits obvious JSON
renamed as CSV. F-03 measures the 14px alert at only 4.2259:1 light and 2.7605:1 dark. F-04 places
overlay copy and alerts wholly below a 390x844 viewport at 200% zoom. F-05 strands the overlay when
an entered virtual row unmounts before its leave, until global dragend. Independent focused unit 9/9
x3, import 262/262, full Vitest 1,307/1,307, changed E2E 12/12 x3, picker 2/2, affected Chromium
66/66 and full Chromium 99/99 all pass but omit those five exact boundaries. Positive CSV/SGML
OFX/QFX, explicit confirm/cancel, 60-row encrypted persistence with 18 mounted, P14
lineage/origin/history, privacy and clean console remain green. Root stopped both keyed review
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

**2026-07-25T06:13:08+10:00 — P15/02 `implementing -> ready_for_review -> reviewing`:** Exact
revision-02 product/test HEAD `91931688ef9463576b757a097968af543a4b8a75` changes exactly five
authorized paths from clean dispatch/control HEAD `6751860ba4d1501404b35bca27d0711b93424eb6`. Frozen
evidence `evidence/P15/implementation-02.md` is 169 lines/12,275 bytes at SHA-256
`a92301725fe0ee553cf5b21d9fb3796c92330994019c0224cf4952af5a21b501`. Checked-in tests first
reproduced all five revision-01 findings as 5 failed/9 passed and finish 14/14 in three clean
processes. Reported green includes import owners 267/267, focused browser 12/12, preserved
revision-01 browser 12/12, affected Chromium 69/69 and full Chromium 102/102, plus typecheck,
lint/build/scoped-format/diff gates. The first full-unit run was honestly non-green only because the
unrelated duplicate timing benchmark measured 4.165 against `<4`; that owner immediately passed
43/43 in isolation and the immediate full rerun passed 1,312/1,312. Installed CLI directly closes
XML OFX acceptance, renamed-JSON rejection, 10.03:1/16.17:1 theme contrast, both surfaces at
390x844/200% zoom and actual virtual-row unmount plus outer-leave cleanup without dragend, while
preserving cancel/confirm/retry, 60-row bounded rendering, P14 origin/history, encrypted persistence
and sanitized console/network/storage. All eight excluded exploratory harness categories are
recorded without contributing acceptance evidence. Root stopped the keyed server, verified port 3000
clear, restored generated source, and moved only current `.next`, `test-results` and five new CLI
artifacts to recoverable trash while preserving 13 older unrelated snapshots. Index is clean; the
evidence is the sole worktree artifact; future review-02 is absent. Scratch SHA/checked set/all 21
normalized blocks, immutable FS-001 and SCOPE remain exact. Reviewer alone may now write
`reviews/P15-review-02.md` over literal cumulative original BASE
`b3e96ba9e9487d13df56956d220fffca63d6482d` through literal HEAD
`91931688ef9463576b757a097968af543a4b8a75`; HS-013 remains unchecked.

**2026-07-25T06:45:46+10:00 — P15/02 `reviewing -> passed`; artifact integration pending:**
Independent cumulative review `reviews/P15-review-02.md` is 214 lines/15,898 bytes at SHA-256
`c29069c1f79e90cf7824fcce8fc7f8d99ffc527df38af7e48f6d0cd427b747fa` and returns PASS over exact
`b3e96ba9e9487d13df56956d220fffca63d6482d..91931688ef9463576b757a097968af543a4b8a75`. F-01 through
F-05 are independently closed: complete XML OFX works through picker/dropzone/both surfaces; bounded
validation rejects renamed JSON/document signatures; actual alert contrast is 10.0251:1 light and
16.1651:1 dark; guidance/alerts remain inside both target/viewport intersections at 390x844/200%
zoom; and an entered virtual row can unmount before outer leave clears overlay 1→0 without dragend.
Independent automation passes focused unit 14/14 in three clean processes, import 267/267, full
Vitest 1,312/1,312, affected Chromium 69/69 and full Chromium 102/102, with type,
lint/build/scoped-format/diff gates green. Installed CLI preserves explicit XML/SGML OFX/QFX/CSV
confirmation and cancellation, 60-row confirmation/reload with 18 mounted, filtered cancel/back/
retry, P14 original-value/history behavior, encrypted HTTP-200 persistence, same-origin resources,
plaintext storage/request absence and final zero console warnings/errors. Five categories of
exploratory harness behavior are explicitly excluded and no finding or Q proposal remains. Root
stopped the keyed server, restored generated source, removed only current generated/test and 12
review CLI artifacts to recoverable trash, and preserved 13 older snapshots. Exact HEAD/index/
worktree and frozen scratch/21 blocks/checked set, FS-001, SCOPE and evidence identities pass.
P15/HS-013 are passed, but HS-013 remains unchecked until the exact review/risk integration and
separate completion transaction are durable.

**2026-07-25T06:46:31+10:00 — HS-013 `queued -> completion_pending`:** P15 revision-02 PASS,
immutable evidence/review and exact R-009/R-010/R-032 transcriptions are integrated as
`9c5d7be8ee4cf7c3fda5f1a7320c053362672e3a`. Root durably prepares the sole authorized frozen-source
edit: change only HS-013's first-line marker from `[]` to `[x]` against pre-change scratch SHA
`f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1`, mapped to
`reviews/P15-review-02.md`. The authorized checked set remains
HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-014/HS-017/HS-018 until the marker is applied.
All 21 normalized blocks, canonical FS-001 and SCOPE are exact. No package dispatch is legal while
this event is pending.

**2026-07-25T06:47:54+10:00 — HS-013 `completion_pending -> passed`:** Exact marker-only `[] -> [x]`
finalized after P15 review `reviews/P15-review-02.md` and integration
`9c5d7be8ee4cf7c3fda5f1a7320c053362672e3a`. The private comparison copy showed exactly the HS-013
first-line marker change and was removed. All 21 normalized blocks byte-match SCOPE; checked set is
exactly HS-001/HS-002/HS-004/HS-005/HS-006/HS-008/HS-010/HS-013/HS-014/HS-017/HS-018; FS-001 and
SCOPE remain exact. Scratch SHA advances
`f0adfef6e19b80969dae748cf8c616614af61ba778837234c97af385a19adcb1 -> ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`,
350 lines/24,250 bytes. The completion event is cleared and package dispatch may resume.

**2026-07-25T06:51:25+10:00 — P16A/01 `queued -> implementing`:** P01/02 is passed and P15/HS-013
has fully cleared its marker transaction, so the next allocation-critical-path package starts from
literal clean original BASE `1b42d27e11494a167a4768e0c2c308010aa51651`. Sole implementation evidence
is `evidence/P16A/implementation-01.md`; future independent review is `reviews/P16A-review-01.md`.
Authority is limited to one new allocation domain owner, hardening the existing ownership domain
owner, domain exports, their exact two production unit/property test owners and manifest/lock only
if a direct exact decimal dependency is justified. P16A must reject negative
zero/non-finite/out-of-range allocation and ownership input, preserve any valid explicit total
without normalization, derive positive/zero/negative owner remainder and deterministic exact
effective weights over the explicit/owner union, and apportion signed integer minor units with
mathematical negative floors, largest fractional remainders, stable-ID ties and exact conservation.
Checked-in production red-to-green/property tests, focused x3, domain/full regression, affected/full
no-retry Chromium, dependency/benchmark evidence and an honest installed-CLI current-ownership
preservation charter are mandatory. P16B settlement, CRDT, UI/E2E edits and all frozen/control paths
are forbidden. Reviewer is undispatched; HS-009 remains unchecked and FS-001 remains immutable/open.

**2026-07-25T07:25:18+10:00 — P16A/01 `implementing -> ready_for_review -> reviewing`:** Exact
product/test/dependency HEAD `6671c09a5ca94ccb4ff47564c15d44935cc73479` changes exactly seven
authorized paths from dispatch/control HEAD `d0b2324f997d5dffe8326c9f4777a94daaedf49e`. Frozen
evidence `evidence/P16A/implementation-01.md` is 272 lines/16,695 bytes at SHA-256
`4fb0fadd5fafdde02d3d20cc3349a47abc228092ad375a112360f3864548ba33`. Unchanged-product red was a
missing production allocation module plus 10 ownership failures/37 passes at fixed seed 16001603.
Final production properties use seeds 16001601/16001602 for 1,000 runs each and 16001603 for 250;
focused allocation/ownership passes 83 plus one opt-in benchmark skip in three clean processes,
broader domain 429 plus one skip, and full Vitest 1,321 plus one skip. Typecheck, lint/build,
scoped-format/diff, affected Accounts/Transactions Chromium 46/46 and full Chromium 102/102 pass.
The exact dependency delta promotes already-transitive MIT `decimal.js@10.6.0` to a direct
dependency without package-node drift; the bounded 200-person primitive benchmark is explicitly not
P16B's settlement target. Installed CLI preserves the current account/People/Transactions,
responsive/dark/reduced/privacy/clean-console flows and honestly records the existing
OwnershipEditor 101→100/0 clamp followed by a visible persisted invalid 80% total and repair; it is
not claimed as canonical P16A rejection or P16D acceptance. Seven excluded exploratory harnesses are
recorded. Root stopped the keyed server, restored generated source and removed only current
generated/test plus 10 CLI artifacts to recoverable trash while preserving 13 older snapshots.
Index/cleanup, scratch/check set/21 blocks, immutable FS-001 and SCOPE are exact. Reviewer alone may
write `reviews/P16A-review-01.md` over the literal cumulative range; HS-009 remains unchecked and
FS-001 remains immutable/open.

**2026-07-25T07:48:18+10:00 — P16A/01 `reviewing -> changes_requested`; failure integration
pending:** Independent review `reviews/P16A-review-01.md` is 260 lines/18,276 bytes at SHA-256
`5ad6685bf5d4ceba62bde80b4074e7998313197bb494ce85a7e23ded5645184f` and returns FAIL over exact
`1b42d27e11494a167a4768e0c2c308010aa51651..6671c09a5ca94ccb4ff47564c15d44935cc73479`. F-01 proves
public result envelopes, individual typed error objects and several error arrays remain
runtime-mutable despite the binding immutable P16B/C/D API contract and evidence claim. Independent
mutations changed an invalid allocation result's `ok` false→true, its reason
`out-of-range`→`not-number`, appended an invented ownership error and changed valid derivation/
apportionment discriminants true→false. Tests freeze successful value maps but omit full exposed
result graphs and branch-complete errors. All independent financial evidence otherwise passes: two
BigInt rational oracles match 10,000 generated cases; focused 83+1 skip x3, domain 429+1 skip, full
Vitest 1,321+1 skip, type/lint/build/scoped-format/diff, affected Chromium 46/46 and full Chromium
102/102 are green. Dependency/performance and current-account/manual/privacy evidence are also
green. The unchanged OwnershipEditor 101→100/0→persisted invalid 80/0 path is adjudicated as a
separate visible/repairable current limitation, not P16A allocation acceptance or a waiver. Root
stopped the keyed server, restored generated source and recoverably removed only current generated/
test plus 14 review CLI artifacts while preserving 13 older page and nine older console artifacts.
No Q proposal. HS-009 remains unchecked; FS-001 remains immutable/open; revision 02 must close F-01
without disturbing the proven math or current compatibility.

**2026-07-25T07:49:33+10:00 — P16A/02 `changes_requested -> implementing`:** Revision-01
evidence/review, F-01 and R-015/R-033 transcriptions are immutable in failure integration
`ab5334d8d1311119f0e0240aea2e92ade239aa15`; original cumulative review BASE remains
`1b42d27e11494a167a4768e0c2c308010aa51651`. Sole new evidence is
`evidence/P16A/implementation-02.md`; future independent review is `reviews/P16A-review-02.md`.
Authority is narrowed to the allocation/ownership domain owners and their exact two unit/property
test owners. Revision 02 must freeze every public success/failure envelope, individual typed error,
error array and nested success value/map; add branch-complete runtime mutation regressions; and
preserve the independently proven 10,000-case financial math, schemas, explicit preservation,
remainder/effective/apportionment behavior, dependency, benchmark scope and current compatibility.
Exact F-01 red-to-green, focused x3, domain/full/static/build, affected/full no-retry Chromium and
honest installed-CLI preservation/cleanup remain mandatory. Reviewer is undispatched; HS-009 stays
unchecked and FS-001 immutable/open.

**2026-07-25T08:15:34+10:00 — P16A/02 `implementing -> ready_for_review`:** Exact revision-02
product/test HEAD `f84f66758708529c44342313e8632ee8b7dcead3` changes only the four authorized
allocation/ownership owner and unit-test paths from dispatch/control HEAD
`84e924497d5ee9ba6b7511464d969b7a21bedd44`, with 311 insertions / 24 deletions. Frozen evidence
`evidence/P16A/implementation-02.md` is 203 lines / 13,291 bytes at SHA-256
`8262393794bafe48d428e21bdcb39f0a51bb64fe65d735f7bb21f5f45e923868`. Exact unchanged-product red
failed 10 mutation cases; final focused runs pass 93 plus one skip three times, domain passes 439
plus one skip and full Vitest passes 1,331 plus one skip. Fixed mutation seeds 16001604/16001605 run
500 cases each while the preserved arithmetic properties retain seeds 16001601/16001602/16001603.
Typecheck, lint, build, scoped format/static checks, affected Chromium 46/46, full Chromium 102/102,
dependency/audit, benchmark and installed-CLI current-caller/privacy evidence are recorded. Root
stopped the keyed server, restored generated source and moved only current generated/test plus two
CLI artifacts to recoverable trash while preserving 13 older page and nine older console artifacts.
Index/cleanup, scratch/check set/21 blocks, immutable FS-001 and SCOPE are exact. Independent review
must cover original cumulative BASE `1b42d27e11494a167a4768e0c2c308010aa51651` through the exact
newest HEAD above and close F-01 without weakening the independently proven 10,000-case financial
math. HS-009 remains unchecked and FS-001 remains immutable/open.

**2026-07-25T08:17:16+10:00 — P16A/02 `ready_for_review -> reviewing`:** Frozen revision-02 evidence
and its exact review boundary are durable in control commit
`9f57538a07fd369093e5253eef0111d9d0218b63`. Distinct `human_scratch_reviewer` receives literal
cumulative range
`1b42d27e11494a167a4768e0c2c308010aa51651..f84f66758708529c44342313e8632ee8b7dcead3`, frozen
`evidence/P16A/implementation-02.md` at SHA-256
`8262393794bafe48d428e21bdcb39f0a51bb64fe65d735f7bb21f5f45e923868`, immutable revision-01 failure
review and sole new output `reviews/P16A-review-02.md`. Reviewer may write only that review artifact
and must independently close F-01 across the complete runtime result graph while re-proving the
canonical financial math and assigned gates. HS-009 remains unchecked and FS-001 remains
immutable/open.

**2026-07-25T08:40:34+10:00 — P16A/02 `reviewing -> reviewing`; independent PASS, integration
pending:** Independent `reviews/P16A-review-02.md` is 237 lines / 17,406 bytes at SHA-256
`2835a78fd15502d8bef54dd6d3f11b7d7a7875694270f953369a5cc4265c737b` and returns PASS with no findings
over exact cumulative range
`1b42d27e11494a167a4768e0c2c308010aa51651..f84f66758708529c44342313e8632ee8b7dcead3`. F-01 is closed
across 20 independently probed success/failure result shapes: every exposed envelope, nested
value/map, error array and individual error is frozen, attempted mutations fail, and caller input
remains mutable/unaliased. Independent BigInt rational seeds 16001901/16001902 match 10,000
generated derivation/signed-apportionment cases with zero floor, tie, order or conservation
mismatches. Focused 93+1 skip x3, domain 439+1, full unit 1,331+1, static/build, affected Chromium
46/46 and full Chromium 102/102 pass with one worker/retries zero. The installed CLI charter passes
current ownership, persistence, responsive/200%-zoom, privacy/request and clean teardown after one
disclosed setup-only missing-JWT server attempt; root injected the existing local container secret
in memory without printing/persisting it. Root then stopped the server, restored generated source
and recoverably removed current `.next`, results and exactly 22 current CLI artifacts while
preserving 13 older page and nine older console artifacts. Frozen source hashes, index and worktree
boundaries are exact. No Q proposal or marker is authorized; HS-009 remains unchecked and FS-001
remains immutable/open through their remaining packages.

**2026-07-25T08:41:12+10:00 — P16A/02 `reviewing -> passed`:** PASS definition is complete at exact
reviewed product/test HEAD `f84f66758708529c44342313e8632ee8b7dcead3`. Immutable review, applicable
R-015/R-025/R-033 evidence and package ledgers are integrated in
`41f5760f77c1a93ab650a93912bfaf3c0b627ab0`; no finding or Q proposal remains. P16A now provides the
independently accepted immutable validation/remainder/effective/apportionment boundary required by
P16B/C/D. This package alone does not complete either mapped requirement: HS-009 still requires
P16C/P16D and remains unchecked, while FS-001 still requires P16B–E and its canonical source remains
byte-identical. P16B is now dependency-ready.

**2026-07-25T08:43:55+10:00 — P16B/01 `queued -> implementing`:** P16A/02 is passed and the clean
post-pass original BASE is `4c102600240e2804b801c2a320e10164defb14ea`. Sole evidence is
`evidence/P16B/implementation-01.md`; future independent review is `reviews/P16B-review-01.md`.
Authority is limited to the canonical settlement owner, removal of the duplicate floating-point
`balance.ts` callable and barrel alias, the current People settlement caller pair, exact settlement/
balance tests and one optional focused caller-component test. P16B must reuse P16A exact immutable
primitives; implement canonical eligibility, account→vault→USD currency, signed effective-minus-
ownership positions, deterministic debtor/creditor matching, currency-isolated aggregation/reverse
netting, positive obligations, source contribution traceability, per-person positions and typed
issues. Separate named production expectations A–H, fixed-seed independent-oracle properties,
complete result immutability/input purity, no vacuous assertions, focused x3, domain/full/static/
build, affected/full no-retry Chromium and an honest current-caller installed-CLI charter are
mandatory. The deterministic 100,000-transaction benchmark must report approximate 200ms honestly or
a complete measured optimization follow-up without a false target claim. CRDT/schema, allocation UI,
E2E edits and P16C/D/E behavior are forbidden. Reviewer is undispatched; HS-009 remains unchanged
and FS-001 immutable/open.

**2026-07-25T09:24:08+10:00 — P16B/01 `implementing -> ready_for_review`:** Exact product/test HEAD
`5242a2422cd86dd48eac07a4422491d5079ccd23` changes exactly the eight authorized engine,
duplicate-removal, caller and focused-test paths from dispatch/control HEAD
`a584203aea4b1ac030d76c95289d784e8d0937b3`. Frozen evidence `evidence/P16B/implementation-01.md` is
323 lines / 21,736 bytes at SHA-256
`48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd`. Unchanged-product red failed
27/45 focused expectations; final focused passes 46 plus one skip in three clean processes, broader
domain/current caller passes 445 plus two skips and full Vitest passes 1,337 plus two skips. Named
A–H, seeds 16001611/16001612/16001613 over 2,500 independent BigInt cases, exact conservation,
source traceability, issue exclusion, structured caller and complete graph/input immutability are
recorded. Type/lint/build/scoped-format/diff, affected Chromium 46/46 and full Chromium 102/102
pass. Optimized 100k samples are 224.10–234.54ms with 75,000 source contributions, two obligations,
zero issues and exact conservation; evidence explicitly does not claim the strict 200ms target and
gives a complete P16E/query-memoization follow-up. Installed CLI preserves real current onboarding,
People/Accounts/Transactions/no-explicit-allocation behavior and sanitized privacy checks; a broad
common-substring storage false positive is disproved by exact marker checks. Root stopped the keyed
server, restored generated source and recoverably removed current generated/test plus exactly 20
current CLI artifacts while preserving all 22 older artifacts. Index/cleanup and frozen sources are
exact. Reviewer alone may write `reviews/P16B-review-01.md`; HS-009 remains unchanged and FS-001
immutable/open.

**2026-07-25T09:25:16+10:00 — P16B/01 `ready_for_review -> reviewing`:** Frozen implementation
evidence and exact review boundary are durable in control commit
`095a657698231b5ed34f70c3cfa737d5b7fdfc16`. Distinct `human_scratch_reviewer` receives literal range
`4c102600240e2804b801c2a320e10164defb14ea..5242a2422cd86dd48eac07a4422491d5079ccd23`, frozen
`evidence/P16B/implementation-01.md` at SHA-256
`48f10876f8e69e7f3bff022598c0236a775d061e1cc06a86cb3d48bfc60d3dfd` and sole output
`reviews/P16B-review-01.md`. Reviewer must independently prove the sole-engine/export/caller
boundary, all eligibility/currency/position/matching/netting/traceability/issue invariants, named
A–H, immutable output/input purity and honest benchmark disposition with different integer/rational
oracles. HS-009 remains unchanged and FS-001 immutable/open.

**2026-07-25T09:46:29+10:00 — P16B/01 `reviewing -> changes_requested`; failure integration
pending:** Independent `reviews/P16B-review-01.md` is 314 lines / 18,758 bytes at SHA-256
`5dd6be1a1efbdbecb0a4a3e42e54ec7d0b55a05555deebd88c3009c97fd7df38` and returns FAIL over exact
`4c102600240e2804b801c2a320e10164defb14ea..5242a2422cd86dd48eac07a4422491d5079ccd23`. F-01 proves
canonical old paid transactions with omitted allocations throw instead of deriving valid `{}`, while
missing duplicate lists/ownerships and non-string currency also throw before typed handling. F-02
proves a deleted same-ID physical copy can suppress an active copy and a parent-absent materialized
nested transaction can qualify through the ambiguous public array API. F-03 proves
delimiter-colliding invalid allocation fingerprints can reuse the wrong cached derivation and omit
required person issue context. Arithmetic/netting core otherwise passes: reviewer seed 26072501
matches 5,000 BigInt rational cases plus 1,000 multi-currency/reverse-source batches; focused 46+1
skip x3, broader 445+2, full unit 1,337+2, static/build, affected Chromium 46/46 and full Chromium
102/102 pass. Independent 100k samples are 228.93–241.21ms with full output and the honest P16E
optimization follow-up remains non-blocking. Manual was explicitly omitted because surfaced UI
cannot create malformed legacy shapes and direct production probes were decisive. Root restored
generated source, recoverably removed current `.next`/results and preserved the older ignored
report. No Q proposal. Revision 02 must close all three findings without weakening the proven core;
HS-009 stays unchanged and FS-001 immutable/open.

**2026-07-25T09:49:25+10:00 — P16B/02 `changes_requested -> implementing`:** Revision-01 failure
artifacts and risk updates are durable in integration commit
`e33453f098f4bdea62d6ea358d2e86b5d0f9356b`. Revision 02 retains the literal original cumulative
review BASE `4c102600240e2804b801c2a320e10164defb14ea`, uses sole implementer artifact
`evidence/P16B/implementation-02.md` and reserves immutable future review
`reviews/P16B-review-02.md`. Its exact four-path authority is `src/lib/domain/settlement.ts`,
`src/components/features/people/BalanceSummary.tsx`, `tests/unit/domain/settlement.test.ts` and
`tests/unit/components/balance-summary.test.tsx`. It must close only F-01 safe legacy envelopes,
F-02 canonical `TransactionStore` topology/active-copy selection and F-03 collision-free semantic
identity while preserving the independently green exact arithmetic, currency, matching, reverse
netting, source traceability, issue, immutability, named A–H and sole-engine/caller core. The
implementer must first check in exact red reproductions against byte-identical revision-01 product
owners, then prove fixed-seed legacy/topology/cache properties, full gates and honest performance.
Reviewer remains undispatched; HS-009 has no marker change and FS-001 remains immutable/open.

**2026-07-25T10:25:08+10:00 — P16B/02 `implementing -> ready_for_review`:** Exact red-test
checkpoint `6574405d1635c957299ef4650ccbc9bbfc7e0a00` captured F-01/F-02/F-03 before product edits;
green product/test HEAD is `50b36beb0c7cf9a73d623ed964b6ba05919fffc6`. The revision-02 delta from
dispatch HEAD `125f50ff404f088d3dbb70c578b1cdc548f755ea` contains exactly the four authorized paths
and the cumulative review range remains
`4c102600240e2804b801c2a320e10164defb14ea..50b36beb0c7cf9a73d623ed964b6ba05919fffc6`. Frozen
`evidence/P16B/implementation-02.md` is 264 lines / 18,293 bytes at SHA-256
`75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e`. Focused settlement/ caller
passed 71+1 skip in three clean processes, broader 470+2, full unit 1,362+2, typecheck, exact
formatting/lint, repository lint and build passed. Affected Chromium passed 46/46 and full Chromium
102/102 with one worker and zero retries. Deterministic 100k full-output samples were
256.16–288.03ms with 100k qualifying transactions, 75k source contributions, two obligations, zero
issues and conservation; the strict 200ms target is honestly unclaimed and retains its P16E
follow-up. Installed-CLI current onboarding/caller, reload, responsive/zoom, preference, console,
network and boolean-only privacy checks passed without claiming P16D/E UI. Root stopped the keyed
server, restored generated source, moved current `.next`/results and exactly 35 current CLI
artifacts to recoverable trash, preserved all 22 older CLI artifacts and the older report, and
verified no browser/port remains. No Q proposal. Reviewer alone may write
`reviews/P16B-review-02.md`; HS-009 remains unchanged and FS-001 immutable/open.

**2026-07-25T10:26:28+10:00 — P16B/02 `ready_for_review -> reviewing`:** Frozen implementation
evidence and exact review boundary are durable in control commit
`c43d07ead0af9c0d72ff9a457cc8d2fc2377cbd2`. Distinct `human_scratch_reviewer` receives literal
cumulative range
`4c102600240e2804b801c2a320e10164defb14ea..50b36beb0c7cf9a73d623ed964b6ba05919fffc6`, frozen
`evidence/P16B/implementation-02.md` at SHA-256
`75f0b7e4c7ca72c38be5843a2ef2e0de032a9b2539979990573068ef08c5c75e` and sole output
`reviews/P16B-review-02.md`. Reviewer must independently reproduce and close revision-01
F-01/F-02/F-03 across retained legacy shapes, hierarchical topology and adversarial semantic
identity, then re-prove the exact arithmetic/currency/matching/netting/source/issue/immutability
core, named A–H, caller/API closure, full gates and honest scale disposition. HS-009 remains
unchanged and FS-001 immutable/open.

**2026-07-25T10:54:49+10:00 — P16B/02 `reviewing -> changes_requested`; failure integration
pending:** Independent `reviews/P16B-review-02.md` is 329 lines / 19,155 bytes at SHA-256
`09814cd6a719189afd4951e6683b2f216d6eace729fe230d55add4a2c497054f` and returns FAIL over exact
`4c102600240e2804b801c2a320e10164defb14ea..50b36beb0c7cf9a73d623ed964b6ba05919fffc6`. Revision-01
F-01/F-02/F-03 are closed, and independent BigInt/rational, topology/cache, focused, broader/full
unit, static/build, affected Chromium 46/46, full Chromium 102/102 and real-app manual gates pass.
F-04 proves `Map`, `Date` and other non-plain allocation/financial-map containers pass the
permissive runtime-record guard, become empty through `Object.entries` and can yield a false
issue-free qualifying settled total. F-05 proves malformed hierarchy descendants such as
`years: null` are silently skipped without a topology issue, also allowing an issue-free zero
result. Independent 100k samples are 245.96–273.41ms with full output; the honest P16E follow-up
remains non-blocking. Root restored generated source, moved current generated output and exactly 40
reviewer CLI artifacts to recoverable trash, preserved all 22 older CLI artifacts and the older
report, and verified no browser/port remains. No Q proposal. Revision 03 must close F-04/F-05
without weakening the proven core; HS-009 stays unchanged and FS-001 immutable/open.

**2026-07-25T10:56:02+10:00 — P16B/03 `changes_requested -> implementing`:** Revision-02 failure
artifacts and risk updates are durable in integration commit
`ef35b2753b2a12fa73f0f1ebdf9c1454de81b07a`. Revision 03 retains the literal original cumulative
review BASE `4c102600240e2804b801c2a320e10164defb14ea`, uses sole implementer artifact
`evidence/P16B/implementation-03.md` and reserves immutable future review
`reviews/P16B-review-03.md`. Its exact two-path authority is `src/lib/domain/settlement.ts` and
`tests/unit/domain/settlement.test.ts`. It must close only F-04 contract-approved
plain/null-prototype financial maps versus arbitrary objects and F-05 deterministic visible issues
for every malformed retained hierarchy envelope, while preserving revision-02 closure of
F-01/F-02/F-03 and the proven exact
arithmetic/currency/matching/netting/source/issue/immutability/named-A–H/sole-engine core.
Checked-in red reproductions against byte-identical revision-02 product, generated object/topology
properties, full gates and honest performance/manual evidence are mandatory. Reviewer remains
undispatched; HS-009 has no marker change and FS-001 remains immutable/open.

**2026-07-25T11:24:28+10:00 — P16B/03 `implementing -> ready_for_review`:** Exact red-test
checkpoint `a325454d7d859742db08d0ccf2517f8794aaddc0` captured F-04/F-05 before product edits; green
product/test HEAD is `cd643afc8f168b3c8328eb54f1d5f280ca7ec717`. The revision-03 delta from dispatch
HEAD `0fd7b884975c6c954d70b224aecf05dc28bd947c` contains exactly the two authorized paths and the
cumulative review range remains
`4c102600240e2804b801c2a320e10164defb14ea..cd643afc8f168b3c8328eb54f1d5f280ca7ec717`. Frozen
`evidence/P16B/implementation-03.md` is 298 lines / 18,960 bytes at SHA-256
`f3dc7f26695109ec941eb308846872474cba72008e824970a86d7189334ef649`. Focused settlement/ caller
passed 107+1 skip in three clean processes, broader 506+2 and final full unit 1,398+2 after one
unrelated duplicates timing outlier was isolated and a clean full rerun passed. Typecheck, exact
formatting/lint, repository lint and build passed. Affected Chromium passed 46/46 and full Chromium
102/102 with one worker and zero retries. Deterministic 100k full-output samples were
257.46–309.60ms with 100k qualifying transactions, 75k source contributions, two obligations, zero
issues and conservation; strict 200ms remains honestly unclaimed with its P16E follow-up.
Installed-CLI current onboarding/caller, reload, responsive/zoom, preference, console/network and
boolean-only privacy checks passed without manufacturing malformed state or P16D/E claims. Root
stopped the keyed server, restored generated source, moved current output and exactly three CLI
artifacts to recoverable trash, preserved all 22 older CLI artifacts and the older report, and
verified no browser/port remains. No Q proposal. Reviewer alone may write
`reviews/P16B-review-03.md`; HS-009 remains unchanged and FS-001 immutable/open.

**2026-07-25T11:25:15+10:00 — P16B/03 `ready_for_review -> reviewing`:** Frozen implementation
evidence and exact review boundary are durable in control commit
`8f5eaad6a271058b2c5ef6842fc8840f44473df7`. Distinct `human_scratch_reviewer` receives literal
cumulative range
`4c102600240e2804b801c2a320e10164defb14ea..cd643afc8f168b3c8328eb54f1d5f280ca7ec717`, frozen
`evidence/P16B/implementation-03.md` at SHA-256
`f3dc7f26695109ec941eb308846872474cba72008e824970a86d7189334ef649` and sole output
`reviews/P16B-review-03.md`. Reviewer must independently reproduce and close F-04/F-05 across
non-plain financial-map objects and every malformed hierarchy envelope, re-prove F-01/F-02/F-03 and
the exact arithmetic/currency/matching/netting/source/issue/immutability core, named A–H, sole
API/caller, full gates and honest scale disposition. HS-009 remains unchanged and FS-001
immutable/open.

**2026-07-25T11:56:38+10:00 — P16B/03 `reviewing -> changes_requested`; failure integration
pending:** Independent `reviews/P16B-review-03.md` is 377 lines / 21,986 bytes at SHA-256
`5eac6d9a52f5cf96fe921df734a4f52367b898ce94a7af9130ee6af21883af8d` and returns FAIL over exact
`4c102600240e2804b801c2a320e10164defb14ea..cd643afc8f168b3c8328eb54f1d5f280ca7ec717`. Revision-02
literal F-04/F-05 shapes are closed, and independent arithmetic/adversarial oracles, focused,
broader/full unit, static/build, affected Chromium 46/46, full Chromium 102/102 and real-app manual
gates pass. Residual F-04 proves own-key/descriptor/getter/iterator traps escape as exceptions and
hidden/prototype-spoofed record shapes can become plausible totals because only `getPrototypeOf` is
guarded. Residual F-05 proves missing/null/numeric/mismatched account-tree identity and
non-finite/fractional/out-of-range or impossible date discriminators can still produce issue-free
qualifying Bob-to-Alice totals. Independent 100k samples are 248.83–292.06ms with full output; the
honest P16E follow-up remains non-blocking. Root restored generated source, moved current output and
the filesystem-resolved exact 22 reviewer CLI artifacts to recoverable trash, preserved all 22 older
CLI artifacts and the older report, and verified no browser/port remains. No Q proposal. Revision 04
must close the complete exception-safe materialized-snapshot boundary and required hierarchy
identity/calendar semantics without weakening the proven core; HS-009 stays unchanged and FS-001
immutable/open.

**2026-07-25T11:57:37+10:00 — P16B/04 `changes_requested -> implementing`:** Revision-03 failure
artifacts and risk updates are durable in integration commit
`f343f496f8838ce237d3866124f7a3112b6a6938`. Revision 04 retains literal original cumulative BASE
`4c102600240e2804b801c2a320e10164defb14ea`, uses sole implementer artifact
`evidence/P16B/implementation-04.md` and reserves immutable future review
`reviews/P16B-review-04.md`. Its exact two-path authority remains `src/lib/domain/settlement.ts` and
`tests/unit/domain/settlement.test.ts`. It must close residual F-04 with one complete exception-safe
materialized snapshot boundary covering every trap/access/enumeration/traversal and residual F-05
with canonical account-tree identity plus established supported-calendar validation. It must
preserve every prior closure and the proven exact arithmetic/topology/cache/currency/matching/
netting/source/issue/immutability/named-A–H/sole-engine core. Checked-in red reproductions against
byte-identical revision-03 product, mechanism-generating properties, full gates and honest
performance/manual evidence are mandatory. Reviewer remains undispatched; HS-009 has no marker
change and FS-001 remains immutable/open.

**2026-07-25T12:52:05+10:00 — P16B/04 `implementing -> ready_for_review`:** Exact first red-test
checkpoint `0d96c25c50f86590c5c7df3dccc8370ea247e9e3` captured the complete F-04 trap/snapshot and
F-05 identity/calendar residuals before product edits; first green
`8e607a1254e7494eaf4a0ca9fab64826e810bfee` materialized the defensive boundary. Installed-CLI
validation then found sanctioned non-enumerable string `$cid` on real initialized Loro mirrors,
captured separately red in `3d2a51e56060388c4d34f6181eb2d806d8259bb6` before exact final green
product/test HEAD `e09eb6bdbbfd796d970d85ef36c212795bcb4912`. The revision-04 delta from
dispatch/control HEAD `e9ece18b11cd3ad0b6b8783b6c80200599e617fd` changes exactly the two authorized
settlement owner and unit-test paths with 1,027 insertions / 103 deletions; the cumulative review
range remains `4c102600240e2804b801c2a320e10164defb14ea..e09eb6bdbbfd796d970d85ef36c212795bcb4912`.
Frozen `evidence/P16B/implementation-04.md` is 283 lines / 19,250 bytes at SHA-256
`a49c3f89693fae09e7b176612e11c57c416814ecb531313ac6ffa7c4882ab001`. Focused settlement/ caller
passes 159+1 skip in three clean processes, broader 558+2, full Vitest 1,450+2, typecheck, exact
format/static, repository lint and build. Affected Chromium passes 46/46 and full Chromium 102/102
with one worker and zero retries. Deterministic 100k full-output samples are 754.47–861.52ms with
100k qualifying transactions, 75k source contributions, two obligations, zero issues and
conservation; strict 200ms remains honestly unclaimed with its P16E production-
profile/memoized-projection follow-up. A wholly fresh installed-CLI journey preserves current
onboarding, People/Accounts/Transactions settlement, reload, responsive/200%-zoom, preferences,
console/network and boolean-only privacy behavior; the mid-journey dev-HMR failure recovered after
root restarted the exact-HEAD server without losing state. Root stopped the final keyed server,
restored generated source, recoverably moved current `.next` and all and only 32 enumerated
revision-04 CLI artifacts, preserved 22 older CLI artifacts and the older report, and verified no
browser/port remains. No Q proposal. Reviewer alone may write `reviews/P16B-review-04.md`; HS-009
remains unchanged and FS-001 immutable/open.

**2026-07-25T12:53:35+10:00 — P16B/04 `ready_for_review -> reviewing`:** Frozen implementation
evidence and its exact review boundary are durable in control commit
`86dd6fc63a8476bd9aaf3a6b56f1571240803f45`. Distinct `human_scratch_reviewer` receives literal
cumulative range
`4c102600240e2804b801c2a320e10164defb14ea..e09eb6bdbbfd796d970d85ef36c212795bcb4912`, frozen
`evidence/P16B/implementation-04.md` at SHA-256
`a49c3f89693fae09e7b176612e11c57c416814ecb531313ac6ffa7c4882ab001` and sole output
`reviews/P16B-review-04.md`. Reviewer must independently reproduce and close every revision-03
F-04/F-05 trap/snapshot/spoof/hidden-value and identity/calendar residual plus the real Loro-mirror
metadata compatibility case, then re-prove F-01/F-02/F-03, exact arithmetic/currency/matching/
netting/source/issue/immutability, named A–H, sole API/caller, full gates and honest scale
disposition. HS-009 remains unchanged and FS-001 immutable/open.

**2026-07-25T13:24:33+10:00 — P16B/04 `reviewing -> changes_requested`; failure integration
pending:** Independent `reviews/P16B-review-04.md` is 403 lines / 24,640 bytes at SHA-256
`8cc169c08f6c87fc16eec1fa3c6615b033abd291faaa0969619230558949b241` and returns FAIL over exact
`4c102600240e2804b801c2a320e10164defb14ea..e09eb6bdbbfd796d970d85ef36c212795bcb4912`. Revision-03
F-04/F-05 are closed: independent 2,000-case trap/snapshot and 5,000-case calendar oracles plus
direct armed-wrapper/identity/date probes pass, and the sole engine, arithmetic, currency, matching,
reverse netting, source traceability, issue immutability and named A–H core remain green. F-06
proves `recordFromLoroMap` silently skips every string-valued account/status entry instead of only
exact `$cid`: referenced malformed statuses yield zero issues, while unreferenced malformed
account/status entries coexist with issue-free plausible obligations in all 1,000 generated cases.
Focused 159+1 skip x3, broader 558+2, required full unit 1,450+2, static/build, affected Chromium
46/46, full Chromium 102/102 and honest real-app manual/privacy gates pass. The first
default-scheduling full-suite attempt retained one unrelated timing-threshold failure; the required
forks/one-worker run passed all 63 files. Independent 100k full-output samples are 751.29–852.72ms;
the disclosed P16E follow-up remains non-blocking. Root restored generated source, recoverably
removed current automation/server output and exactly 24 review CLI artifacts, preserved all 22 older
CLI artifacts, and truthfully removed the regenerated report that had replaced its older timestamp.
No Q proposal. Revision 05 must narrow metadata acceptance to exact `$cid` and emit complete
contextual issues for every other primitive collection entry without weakening any proven
revision-04 mechanism; HS-009 stays unchanged and FS-001 immutable/open.

**2026-07-25T13:25:33+10:00 — P16B/05 `changes_requested -> implementing`:** Revision-04 failure
artifacts and R-015/R-016/R-017/R-020 updates are durable in integration commit
`618254f1f381cd1e4dfb68a9258cccb667a0c838`. Revision 05 retains literal original cumulative BASE
`4c102600240e2804b801c2a320e10164defb14ea`, uses sole implementer artifact
`evidence/P16B/implementation-05.md` and reserves immutable future review
`reviews/P16B-review-05.md`. Its exact two-path authority remains `src/lib/domain/settlement.ts` and
`tests/unit/domain/settlement.test.ts`. It must close only F-06 by skipping exact `$cid` while
routing every other primitive account/status entry through the existing contextual snapshot/
validation path. Direct referenced/unreferenced account/status red reproductions, a genuinely
generated primitive-entry/insertion-order property and exact initialized-Loro `$cid` preservation
are mandatory. It must retain the independently passing complete trap/snapshot lifecycle,
identity/calendar semantics, F-01–F-05, exact arithmetic/currency/matching/netting/source/
immutability/named-A–H/sole-engine core, all gates and honest performance/manual evidence. Reviewer
remains undispatched; HS-009 has no marker change and FS-001 remains immutable/open.

**2026-07-25T13:51:47+10:00 — P16B/05 `implementing -> ready_for_review`:** Exact RED checkpoint
`b3e0235a8e7a1a2d15f45fb3c92ef85831d92c7d` captured all four F-06 referenced/unreferenced
account/status primitive-entry reproductions plus seed `26072508` before production changed;
unchanged revision-04 source failed five new expectations while all 159 prior focused expectations
passed. GREEN product/test HEAD `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c` skips only exact `$cid`,
routes every other primitive entry through contextual snapshot validation and lexically stabilizes
issue order. The revision-05 delta from dispatch/control HEAD
`f806cdae54469d6b1f3a286fa438e8c90cbd17f7` changes exactly the two authorized settlement owner and
unit-test paths with 248 insertions / two deletions; the cumulative review range remains
`4c102600240e2804b801c2a320e10164defb14ea..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`. Frozen
`evidence/P16B/implementation-05.md` is 245 lines / 15,982 bytes at SHA-256
`85bc279f87c02cbadedd5c2964cf72886fde2081903d8343a966cbf9c2b42e43`. Focused settlement/ caller
passes 164+1 skip in three clean processes, broader 563+2, full unit 1,455+2, typecheck, exact
format/static, repository lint and build. Affected Chromium passes 46/46 and full Chromium 102/102
with one worker, zero retries and line reporter. Deterministic 100k full-output samples are
753.25–852.90ms with complete output and conservation; strict 200ms remains honestly unclaimed with
its P16E follow-up. Fresh installed-CLI onboarding, real initialized-Loro People settlement,
Bob/Default/Paid/For Review persistence, responsive/dark/reduced/200%-zoom, console/network and
boolean-only privacy checks pass; one disclosed no-state Next-devtools misclick supports no claim.
Root stopped the keyed server, restored generated source, recoverably removed current `.next`,
results and all and only 18 enumerated revision-05 CLI artifacts, preserved all 22 older CLI files
and verified no browser/port remains. No Q proposal. Reviewer alone may write
`reviews/P16B-review-05.md`; HS-009 remains unchanged and FS-001 immutable/open.

**2026-07-25T13:52:24+10:00 — P16B/05 `ready_for_review -> reviewing`:** Frozen implementation
evidence and its exact review boundary are durable in control commit
`910cecbf0ea6c83ca12c41b7d98808d95158bf67`. Distinct `human_scratch_reviewer` receives literal
cumulative range
`4c102600240e2804b801c2a320e10164defb14ea..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`, frozen
`evidence/P16B/implementation-05.md` at SHA-256
`85bc279f87c02cbadedd5c2964cf72886fde2081903d8343a966cbf9c2b42e43` and sole output
`reviews/P16B-review-05.md`. Reviewer must independently reproduce and close F-06 across
referenced/unreferenced primitive account/status entries and insertion permutations, prove exact
initialized-Loro `$cid` compatibility, then re-prove F-01–F-05, exact arithmetic/currency/
matching/netting/source/issue/immutability, named A–H, sole API/caller, full gates and honest scale
disposition. HS-009 remains unchanged and FS-001 immutable/open.

**2026-07-25T14:22:25+10:00 — P16B/05 `reviewing -> reviewing`; independent PASS, integration
pending:** Independent `reviews/P16B-review-05.md` is 340 lines / 22,883 bytes at SHA-256
`edf379ab4d9c0d1dc64d158fdbc14caad06fcefe89eb6985ea14972321b3108e` and returns PASS over exact
`4c102600240e2804b801c2a320e10164defb14ea..46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`. F-06 closes:
exact `$cid` metadata remains accepted while every other primitive account/status entry receives its
complete stable contextual issue; 2,400 reviewer cases cover 11,252 primitive entries and 500
further cases preserve caller descriptors/purity across adversarial keys/types and insertion
reversal. Independent F-01–F-05 trap/snapshot/no-later-read, identity/calendar, 5,000-case BigInt
rational, 1,000 reverse/currency, named A–H, sole engine/caller, source traceability and recursive
immutability gates pass. Focused 164+1 skip x3, broader 563+2, full unit 1,455+2, static/build,
explicit affected Chromium 46/46 and full Chromium 102/102 pass with one worker, retries zero and
line reporter. Independent 100k full-output samples are 755.26–855.35ms; the honest P16E
optimization follow-up remains non-blocking. Real-app onboarding/People/Transactions, reload,
responsive/dark/reduced/200%-zoom, accessibility, console/network and boolean-only privacy evidence
pass. Reviewer unnecessarily used the supported recovery-phrase reveal control once; the disposable
phrase appeared in CLI output and one YAML, was never copied or used, the profile was deleted, and
root moved the exact sensitive 28-file/187,750-byte manifest to recoverable trash while preserving
all 22 older artifacts. The review discloses this reviewer-operation deviation and makes no false
never-revealed claim. Port/runtime/worktree/frozen boundaries are exact. No Q proposal or marker is
authorized; HS-009 remains unchecked and FS-001 immutable/open through P16C–E.

**2026-07-25T14:23:32+10:00 — P16B/05 `reviewing -> passed`:** PASS definition is complete at exact
reviewed product/test HEAD `46d8f9feb79c6dfc080c0869922fb8cd4c20ec6c`. Immutable review,
R-013/R-015/R-016/R-017/R-020 evidence and package ledgers are integrated in
`136678a0ac864cf2d120b2b5b896d4fadcabcdd1`; no product finding or Q proposal remains. P16B now
provides the independently accepted sole canonical settlement engine, exact arithmetic/currency/
matching/netting/source traceability, complete exception-safe retained validation and typed issue
boundary required by P16C/D/E. This package alone completes no first-class requirement: HS-009 still
requires P16C/P16D and remains unchecked, while FS-001 still requires P16C/P16D/P16E and its
canonical source remains byte-identical. No scratch marker is authorized. P16C is dependency-ready.

**2026-07-25T14:26:05+10:00 — P16C/01 `queued -> implementing`:** P16A/02, P16B/05, P09/02 and
P14/04 are passed. Literal original cumulative BASE and clean pre-product HEAD is
`0a7c9a49722ddc4d955f910af6dbb19cfffbd600`; sole implementer artifact is
`evidence/P16C/implementation-01.md` and future immutable review is `reviews/P16C-review-01.md`.
Exact authorized owners cover the dedicated CRDT allocation boundary,
transaction/context/index/mirror/migration/schema/alias integration, current automation and
manual/import insertion paths plus the enumerated unit/integration tests. Revision 01 must provide
set/remove-one and atomic complete-set APIs, reject-only inclusive signed bounds, initialized-Loro
per-key merge/LWW, one-action undo, every current automation/import/restore/hydration route,
non-destructive invalid-legacy retention, encrypted persistence/convergence and exact move/swap/
nest/unnest preservation. P16A/P16B/P09/P14 behavior is preservation authority; P16D UI and P16E
People UX remain excluded. Reviewer is undispatched. HS-009 remains unchecked and FS-001 remains
immutable/open; no marker is authorized.

**2026-07-25T15:06:43+10:00 — P16C/01 `implementing -> ready_for_review`:** Exact RED checkpoint
`ff45176c5e30f66e8d10990daddb955d1c2277ad` recorded five expected failures with unchanged production
before GREEN product/test HEAD `7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`. The revision changes
exactly eight authorized product/test owners from dispatch commit
`9418fa29003df3aa9ea659580593891d0bb8dddd`: dedicated CRDT allocations,
context/barrel/transaction/alias mutation routing, automation validation/application and two
allocation/automation test owners. Frozen `evidence/P16C/implementation-01.md` is 230 lines / 17,079
bytes at SHA-256 `0d08bb7884d37675d94735bdc65d6e5bfb7f5c488c4c64f8c10819bcc745a31b`. Reported gates
pass: focused 66/66 in three clean processes, broader 209/209, full Vitest 1,483 plus two inherited
skips, typecheck/lint/build/exact static checks, affected Chromium 66/66 and full Chromium 102/102
with one worker and retries zero. Fixed-seed initialized-Loro concurrency, one-action undo,
encrypted persistence, invalid-legacy retention/individual repair, automation/import absence/routing
and move/swap/nest/unnest preservation are recorded. Installed-CLI current-surface preservation and
boolean-only privacy checks passed without claiming P16D UI; root removed exactly 28 new CLI files,
preserved 22 older files, restored generated source, recoverably removed generated build/test trees,
stopped the server and exact-path deleted the 64-byte temporary CSV because `/tmp` cannot trash. No
Q proposal. Reviewer is still undispatched; HS-009 remains unchecked and FS-001 immutable/open.

**2026-07-25T15:07:26+10:00 — P16C/01 `ready_for_review -> reviewing`:** Frozen implementation
evidence and the exact review contract are durable in `92ce0a75cc5ced114e8a81e8d452961f738e1a60`.
Distinct `human_scratch_reviewer` receives literal cumulative range
`0a7c9a49722ddc4d955f910af6dbb19cfffbd600..7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`, frozen
`evidence/P16C/implementation-01.md` at SHA-256
`0d08bb7884d37675d94735bdc65d6e5bfb7f5c488c4c64f8c10819bcc745a31b` and sole output
`reviews/P16C-review-01.md`. Review must independently challenge true initialized-Loro per-key
merge/LWW, atomic rollback and adversarial container handling, generic/alias insertion bypasses,
automation apply/restore and honest import-time absence, one-action undo, invalid-legacy retention/
repair, encrypted persistence/convergence, every structural operation and the complete regression/
manual/cleanup claims. HS-009 remains unchanged and FS-001 immutable/open.

**2026-07-25T15:40:27+10:00 — P16C/01 `reviewing -> changes_requested`; failure integration
pending:** Independent `reviews/P16C-review-01.md` is 252 lines / 18,298 bytes at SHA-256
`72487e97a3a8f4f3515b398fbc399062bc0f65f5d6b8e938e39f1a76335c5a46` and returns FAIL over exact
`0a7c9a49722ddc4d955f910af6dbb19cfffbd600..7cf66fbf7f4b845355c5f956cdfa955ee6db2b59`. F-01 High
proves revoked ordinary proxies escape as `TypeError` from `Array.isArray` before typed container
rejection. F-02 Medium proves multi-error replacement results follow input insertion order rather
than canonical deterministic order. F-03 High proves actual initialized-Loro move and import-delete
promotion silently discard invalid legacy non-number allocation siblings through the number-filtered
stored-copy path. Independent seed `2607251201` otherwise passes 128 true two-peer schedules / 2,033
operations / 124 same-key deletes in both update orders, while seed `2607251202` passes 1,200
one-key plus 600 replacement cases with all 1,177 invalid attempts version/map-pure. Focused 66/66
x3, broader 209/209, full Vitest 1,483+2, static/build, affected Chromium 66/66, full Chromium
102/102 and honest current-surface manual/privacy preservation gates pass. Root restored generated
source, recoverably removed the exact current build/test trees and 35 review CLI files / 138,812
bytes while preserving 22 older files, and verified no browser/port remains. No Q proposal. Revision
02 must close only F-01 through F-03 while retaining every accepted revision-01 mechanism; HS-009
remains unchecked and FS-001 immutable/open.

**2026-07-25T15:41:52+10:00 — P16C/02 `changes_requested -> implementing`:** Revision-01 FAIL,
R-017/R-018 updates and immutable artifacts are durable in failure integration commit
`d81a8283552cb6b3cb312e0f2d3e0adab97819d8`. Revision 02 retains literal original cumulative BASE
`0a7c9a49722ddc4d955f910af6dbb19cfffbd600`, uses sole implementer artifact
`evidence/P16C/implementation-02.md` and reserves new immutable review `reviews/P16C-review-02.md`.
Exact authority is limited to allocation/transaction/automation and maintenance owners plus their
four enumerated test owners. It must contain revoked-proxy recognition within typed rejection,
canonicalize logically identical invalid result ordering and preserve every own enumerable stored
legacy string-key data sibling except exact `$cid` through
move/account+date/nest/unnest/swap/import-delete/maintenance/history paths. Public new-data
validation remains strict. Every accepted revision-01 initialized-Loro concurrency, rollback,
history, encrypted persistence, path, performance, browser/manual and cleanup gate must remain
green. Reviewer is undispatched; HS-009 has no marker and FS-001 remains immutable/open.

**2026-07-25T16:16:28+10:00 — P16C/02 `implementing -> ready_for_review`:** Exact RED checkpoint
`2b5cee4f8a1d97d96f1bbfe77e77c0ad3104fa83` captured nine F-01–F-03 failures against byte-identical
revision-01 production before GREEN product/test HEAD `207e8c5758a48e66980b95eaeff51c0e5a605f7e`.
The revision changes exactly five authorized product/test paths after dispatch commit
`bfb34d76928c11d49364c88c3f86ae3b94725f7c`: allocations, maintenance, automation, allocation
integration and maintenance unit owners. Frozen `evidence/P16C/implementation-02.md` is 220 lines /
15,273 bytes at SHA-256 `89876829842932aa7d32f66a5a4144eb21d0a14c60d952021329d4c0213813ec`. F-01
moves every potentially trapping recognition operation inside typed containment; F-02 uses stable
code-unit ordering for materialized keys and emitted errors; F-03 shares an own-enumerable
stored-data iterator that preserves unknown legacy runtime values except exact `$cid` through
transaction/maintenance/ automation-history paths while public validation remains strict. Reported
gates pass: focused 112/112 x3, broader 217/217, full Vitest 1,492+2, static/build, affected
Chromium 66/66 and full Chromium 102/102. Dedicated mean mutation timing remains about 0.06055ms
one-key / 0.36384ms replacement. Installed-CLI preservation/privacy passed without P16D claims; root
removed exact generated trees and 25 new CLI files / 81,048 bytes, preserved 22 older files and
cleared the server. No Q proposal. Reviewer remains undispatched; HS-009 unchanged and FS-001
immutable/open.

**2026-07-25T16:17:10+10:00 — P16C/02 `ready_for_review -> reviewing`:** Frozen revision-02 evidence
and its exact review contract are durable in `51928d50d9ad96f462dd67e9462b7932a0829c2b`. Distinct
`human_scratch_reviewer` receives literal cumulative range
`0a7c9a49722ddc4d955f910af6dbb19cfffbd600..207e8c5758a48e66980b95eaeff51c0e5a605f7e`, frozen
`evidence/P16C/implementation-02.md` at SHA-256
`89876829842932aa7d32f66a5a4144eb21d0a14c60d952021329d4c0213813ec`, immutable prior FAIL
`reviews/P16C-review-01.md` and sole new output `reviews/P16C-review-02.md`. Reviewer must
independently reproduce and close F-01 revoked-proxy containment, F-02 canonical invalid-result
ordering and F-03 lossless raw legacy sibling preservation through all transaction/maintenance/
history routes, then re-prove the entire accepted revision-01 concurrency/rollback/history/
persistence/path/performance/browser/manual core. HS-009 remains unchanged and FS-001
immutable/open.

**2026-07-25T16:50:38+10:00 — P16C/02 `reviewing -> reviewing`; independent PASS, integration
pending:** Independent `reviews/P16C-review-02.md` is 235 lines / 16,730 bytes at SHA-256
`cc8319e85ef0cf295e5e6cc673f6e691bee31be6da950a77114ded3ee11bc331` and returns PASS over exact
`0a7c9a49722ddc4d955f910af6dbb19cfffbd600..207e8c5758a48e66980b95eaeff51c0e5a605f7e`. F-01 closes
across six direct/CRDT/insertion/automation revoked-proxy mechanisms under seed `2607253201`; F-02
closes across 257 shuffled 12-key schedules with byte-identical 1,176-byte frozen graphs under seed
`2607253202`; F-03 closes across all transaction/history paths under seed `2607253203` and real
bounded maintenance relocation over 49 frames / 24 plans under seed `2607253204`. Independent seed
`2607253301` re-proves 128 initialized-Loro schedules / 2,304 operations / 512 same-key conflicts in
both import orders, while `2607253302` proves 900 invalid mutations version/map-pure. One-action
history, 32-byte-key encrypted snapshot/update, strict public validation, path matrix and mean
timings about 0.06050ms one-key / 0.36763ms replacement pass. Focused 112/112 x3, broader 217/217,
full Vitest 1,492+2, static/build, affected Chromium 66/66, full Chromium 102/102 and honest
installed-CLI preservation/privacy gates pass. Root restored generated source, recoverably removed
exact current build/test trees and nine review CLI files / 28,535 bytes while preserving 22 older
files, and verified no browser/port remains. The 67-byte temporary CSV was exact-path deleted
because `/tmp` cannot trash. No finding or Q proposal remains. HS-009 stays unchecked pending P16D;
FS-001 stays immutable/open pending P16D/P16E.

**2026-07-25T16:51:37+10:00 — P16C/02 `reviewing -> passed`:** PASS definition is complete at exact
reviewed product/test HEAD `207e8c5758a48e66980b95eaeff51c0e5a605f7e`. Immutable revision-02
evidence/review plus R-017/R-018 mitigation are integrated in
`e0f06f7fb60ce08ef2f75b0a9ca7769630a2a55c`; no product finding or Q proposal remains. P16C now
provides the independently accepted strict central set/remove/complete-set APIs, per-key
convergence, deterministic typed rollback, one-action history, encrypted persistence and lossless
invalid-legacy structural preservation required by P16D/P16E. This package alone completes no
first-class requirement: HS-009 still requires P16D and remains unchecked, while FS-001 still
requires P16D/P16E and its canonical source remains byte-identical. No scratch marker is authorized.
P16D is dependency-ready.

**2026-07-25T16:54:41+10:00 — P16D/01 `queued -> implementing`:** P16C/02 and P13/02 are passed.
Literal cumulative BASE and clean pre-product HEAD is `3a5081ac37e09817e0d02ae8799469d1bf09dad5`;
sole implementer artifact is `evidence/P16D/implementation-01.md` and future immutable review is
`reviews/P16D-review-01.md`. Exact authority is limited to the transaction page, table/row/dynamic
column model/one-Person cell/barrels and four enumerated real-grid/virtualization/navigation/E2E
test owners. Revision 01 must surface stable active/deleted/missing Person columns in the actual
virtualized grid and manual add row, share one computed template across header/data/notes, preserve
horizontal alignment/focus/virtualization, distinguish explicit/effective/remainder and route valid
signed-decimal edits exclusively through P16C. Invalid drafts and legacy values remain local or
surfaced without commit/repair-by-render; zero removes one key. Person field identity is exact
`allocation:<personId>`, while the still-pending P10 encrypted field-presence transport may neither
be invented nor falsely claimed. Real two-peer value convergence, undo/refresh, accessibility,
manual/browser/privacy and `<100ms` interaction gates are mandatory. Reviewer is undispatched.
HS-009 remains unchecked and FS-001 immutable/open; no marker is authorized.

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

**2026-07-25T18:17:26+10:00 — P16D/01 `implementing -> ready_for_review`:** The
`human_scratch_implementer` returned the exact sole artifact `evidence/P16D/implementation-01.md`
and a committed product/test HEAD. RED commit `b5d5252`
(`test(P16D): define allocation grid behavior`) touched only the four authorized test paths; GREEN
commit `b5ebc2a` (`feat(P16D): add allocation grid columns`) touched only the eight authorized
product paths plus authorized test files.
`git diff --stat 3a5081ac37e09817e0d02ae8799469d1bf09dad5..b5ebc2a` confirms no forbidden
product/test/schema/scratch/canonical/ledger/task path changed; the two intervening root docs
commits `fd8d23b` (dispatch) and the reviewing control update are the only non-product commits in
range. Working tree is clean except the uncommitted evidence file (frozen) and gitignored
CLI-session trails. Literal product/test HEAD is `b5ebc2a8edbf5e1fc522873fb5ee7455266a3bcc`; BASE is
not equal to HEAD (non-empty range). No `Q-PROPOSAL-P16D-01-*` was raised. Evidence is an
implementer claim only; no PASS is inferred.

**2026-07-25T18:17:26+10:00 — P16D/01 `ready_for_review -> reviewing`:** Root removed the untracked
root-owned runtime artifact `playwright.p16d.external.config.ts` (the base `playwright.config.ts`
auto-starts its own keyed webServer, so the reviewer needs no external config) and left
`.playwright-cli`/`test-results` intact as gitignored preserved trails. Frozen boundary re-verified
at this transition: scratch `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f`
equals the rolling SHA with no active completion/rollback event; canonical FS-001
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` at 715 lines/25,441 bytes; SCOPE
`d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`. A distinct
`human_scratch_reviewer` is dispatched with product BASE `3a5081ac37e09817e0d02ae8799469d1bf09dad5`,
literal product/test HEAD `b5ebc2a`, task contracts
`tasks/FS-001-transaction-percentage-allocations-settlement.md` P16D and
`tasks/HS-009-allocation-bounds.md` P16D, evidence `evidence/P16D/implementation-01.md`, and the
sole new review artifact `reviews/P16D-review-01.md`. HS-009 stays unchecked and FS-001
immutable/open; no marker is authorized until independent PASS and all mapped packages pass.

**2026-07-25T19:16:29+10:00 — P16D/01 `reviewing -> reviewing`; independent PASS, integration
pending:** Independent `reviews/P16D-review-01.md` is 435 lines / 62,073 bytes at SHA-256
`4b6f98f9347a92e8a51ff2af85fe16b498fbe996ee6c78f53e33822746c12850` and returns PASS over exact
`3a5081ac37e09817e0d02ae8799469d1bf09dad5..b5ebc2a8edbf5e1fc522873fb5ee7455266a3bcc`. Zero blocking
findings: the orphan aggregate cell is fully decomposed into a real one-Person grid cell; every
write routes exclusively through P16C `setTransactionAllocation` at `page.tsx:809` with no direct
allocation mutation anywhere in the page, columns or cells (independently grep-verified);
explicit/effective/owner-remainder values stay distinct with exact P16A strings and no display
rounding; invalid legacy data is retained and repairable rather than dropped, clamped or rewritten;
the header, virtualized rows, expanded-notes row and the new Add row share one memoized
pixel-aligned template under horizontal overflow, 200% zoom and 320px reflow; the tanstack range
extractor is untouched with virtualization and keyboard suites green; two-peer different-cell CRDT
convergence is real and the P10 transport boundary is stated honestly; 120 retries-disabled E2E
repeats plus the full 103-test Chromium suite, unit suite, typecheck, lint, build and changed-path
format check all pass with zero console errors or failed requests. Three non-blocking observations
are recorded without waiver: pre-existing error-glyph contrast 4.26:1 below AA normal-text where no
information is contrast-dependent (`role="alert"` + `sr-only` + `aria-describedby`), a dev-build
interaction max of 158.1 ms above the `<100ms` target while p50/p95 meet it, and one weak 2000 ms
smoke bound in `transactions.spec.ts` backed by the sampled section 7 measurement. No Q proposal
remains. Frozen sources exact at this transition: scratch
`ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f` equals the rolling SHA, canonical
FS-001 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c` at 715 lines/25,441 bytes,
SCOPE `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`. R-017 invalid-data
surfacing, R-018 grid/add-row routing and R-019 grid-UX mitigations are transcribed to RISKS. HS-009
stays unchecked pending its authorized marker; FS-001 stays immutable/open pending P16E.

**2026-07-25T19:20:10+10:00 — P16D/01 `reviewing -> passed`:** PASS definition is complete at exact
reviewed product/test HEAD `b5ebc2a8edbf5e1fc522873fb5ee7455266a3bcc`, unchanged since dispatch.
Immutable revision-01 evidence and review plus the R-017/R-018/R-019 mitigation transcription are
integrated in `47867d506978a3f571ef0feef6185e9436d5a908`; no product finding or Q proposal remains.
P16D delivers the independently accepted real transaction grid where dynamic per-Person allocation
columns render explicit, effective and owner-remainder values as distinct P16A strings, every edit
routes through P16C `setTransactionAllocation` with local reject-only validation,
virtualization/keyboard/ history and honest P10-boundary behaviour hold, and invalid legacy data is
retained and repairable. With P16A, P16C and P16D all passed, HS-009's mapped packages are complete
and its authorized forward marker is now enabled; FS-001 still requires P16E and its canonical
source remains byte-identical, so no FS completion is recorded.

**2026-07-25T19:20:55+10:00 — HS-009 `queued -> completion_pending`:** Root durably prepares the
authorized forward marker for HS-009 ("People percent allocations should not be able to exceed +
or - 100", scratch line 302) after all mapped packages passed: P16A integration
`41f5760f77c1a93ab650a93912bfaf3c0b627ab0` (`reviews/P16A-review-02.md`), P16C integration
`e0f06f7fb60ce08ef2f75b0a9ca7769630a2a55c` (`reviews/P16C-review-02.md`) and P16D integration
`47867d506978a3f571ef0feef6185e9436d5a908` (`reviews/P16D-review-01.md`). Exact pre-change scratch
SHA-256 `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f` equals the rolling
checksum; the intended single change is line 302 `- []` -> `- [x]` with byte-identical text. While
this event is pending, no package dispatch is allowed. The scratch source is not modified in this
commit; a private mktemp comparison copy is taken and the one-line patch, diff, normalization,
after-SHA and requirement `passed` flip land in the immediately following finalize control commit.

**2026-07-25T19:24:10+10:00 — HS-009 `completion_pending -> passed`:** Exact marker-only change
finalized after all mapped packages passed — P16A integration
`41f5760f77c1a93ab650a93912bfaf3c0b627ab0`, P16C `e0f06f7fb60ce08ef2f75b0a9ca7769630a2a55c`, P16D
`47867d506978a3f571ef0feef6185e9436d5a908`; reviews
`P16A-review-02.md`/`P16C-review-02.md`/`P16D-review-01.md`. Scratch line 302 `- []` -> `- [x]` is
the sole change; the private mktemp comparison copy showed exactly that one-line diff (`302c302`)
and was removed. All 21 normalized blocks still byte-match SCOPE and the checked set is now exactly
the twelve passed HS requirements; FS-001 remains byte-identical at
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
Rolling scratch SHA advances `ce52d7df87daf63117931e5bdee928212051242ae7f2b5d90e76f5610abcb00f` ->
`9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d`; authorized checked-ID metadata
gains HS-009. FS-001 stays immutable/open pending P16E and no other requirement is affected.

**2026-07-25T19:30:00+10:00 — P18/01 `queued -> implementing`:** P01 is passed and no other package
is dependency-ready (P08/P10/P16E and their P17/P19/P20 descendants remain gated behind P05
`blocked_external`), so P18 (HS-019, password-manager-compatible recovery phrase creation and
unlock) is the sole independent dispatch. Root rewrote `HANDOFF.md` for P18/01 from clean
pre-product HEAD `493bf19d3219f44efd4d4437fd8b0e33d012fba9` with binding task
`tasks/HS-019-password-manager-recovery.md`, frozen source `specs/human-scratch.md:344-346`, the
sole evidence `evidence/P18/implementation-01.md`, exact authorized identity-component and
onboarding-page product paths plus identity/onboarding tests, and read-only crypto seed/derivation
ownership. The dispatch emphasizes a standards-based canonical credential-form contract
(`new-password` on creation, `current-password` on unlock, stable account identifier, one canonical
field synchronized to the usable 12-word UI) and a blocking secret-safety rule: the real recovery
phrase must never reach logs, URLs, analytics, persistence, fixtures or any evidence/review
artifact, and only public BIP39 test vectors may appear in tests. HS-009 stays complete; the scratch
rolling SHA remains `9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d` and FS-001
byte-identical.

**2026-07-25T20:15:00+10:00 — P18/01 `implementing -> reviewing`:** The P18/01
`human_scratch_implementer` reported completion at GREEN HEAD
`4cda92d40e9cc5b6490636c25d99b655905cb40a` (exact-path RED `62a41d6` defining the recovery-phrase
credential-form contract against byte-identical production, GREEN `4cda92d` implementing it). Root
independently verified the worker-only range `6c6eb192..4cda92d` (parent chain `493bf19` ->
`6c6eb192` dispatch/ledger-only -> `62a41d6` RED -> `4cda92d` GREEN) touches only authorized
`src/components/features/identity/**` and `src/app/(onboarding)/**` product paths plus `tests/`
specs, with no forbidden path, no crypto entropy/derivation edit, and frozen sources byte-identical
(scratch `9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d`, FS-001
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`). The working tree holds only the
untracked sole evidence `evidence/P18/implementation-01.md` (465 lines). Reported checks: typecheck
PASS, lint PASS (10 pre-existing warnings), unit 1550 passed/2 skipped, e2e 107 passed, non-flake 51
passed/0 flakes; `format:check` fails only on 15 pre-existing root-owned frozen/ledger markdown
files (no `src/` or `tests/` file) — an accepted frozen-content-vs-oxfmt condition that must not be
"fixed" by running oxfmt on immutable bytes. No secret leak: only public BIP39 test vectors appear
and the form uses `method="post"`. Two implementation defects (fill-before-hydration stranding;
focus-reveal shifting the Unlock button) were found and fixed within the range. Three Q-proposals
were transcribed by root as `QUESTIONS.md` Q-019 (invite page has no creation branch — shared
`/unlock`+`/new-user` surfaces carry the contract), Q-020 (real password-manager matrix not
producible headless — standards-based contract asserted with documented vendor thresholds) and Q-021
(completeness now enforces the BIP39 checksum via read-only `validateSeedPhrase`, strictly
tightening). Root moved P18 to `reviewing` and dispatched a distinct `human_scratch_reviewer` over
the literal BASE `493bf19d3219f44efd4d4437fd8b0e33d012fba9`..HEAD
`4cda92d40e9cc5b6490636c25d99b655905cb40a` range with output `reviews/P18-review-01.md`. HS-009
stays complete; rolling scratch SHA unchanged and FS-001 immutable/open.

**2026-07-25T21:40:00+10:00 — P18/01 independent review PASS; integration pending:** The distinct
`human_scratch_reviewer` returned `VERDICT: PASS` with 0 blocking findings and 7 non-blocking
findings into the immutable `reviews/P18-review-01.md` over literal BASE
`493bf19d3219f44efd4d4437fd8b0e33d012fba9`..HEAD `4cda92d40e9cc5b6490636c25d99b655905cb40a`. The
review independently reproduced range integrity (only authorized
`src/components/features/identity/**`, `src/app/(onboarding)/new-user/page.tsx` and `tests/` paths;
no `src/lib/crypto/**` edit), frozen-source byte-identity, RED honesty (28/7 failing tests against
byte-identical BASE), the single-canonical `type="password"` credential-field contract with
`autocomplete="new-password"` on creation and `current-password` on unlock, bidirectional 12-word
synchronization, the BIP39 checksum tightening, and the checks (typecheck/lint PASS; unit/e2e green;
format:check fails only on pre-existing frozen/ledger markdown). Secret-safety independently
verified: no generated phrase reached git, logs, URLs, network, or storage; every test phrase
literal is the public BIP39 vector; the review file contains no generated recovery material. Root
independently re-scanned and confirmed no 12-word run in the review file and no leftover
`.playwright-cli/`/`test-results/` artifact directories. Non-blocking dispositions: NB-1/NB-2/ NB-4
are evidence-accuracy nuances with no product impact; NB-3 (`data-lpignore` secondary-source) was
already disclosed as Q-020; NB-5 (Playwright snapshot captures the canonical field value — no leak,
gitignored+deleted) recorded on R-013; NB-6 (pre-existing controlled-mode gap-collapse,
byte-identical at BASE, out of HS-019 scope) and NB-7 (pre-existing "Valid recovery phrase" 3.21:1
contrast below AA, untouched by P18) recorded on R-010 for a future UX/a11y pass. No finding is
material or waived. This persistence commit records the independent PASS; its own hash is the P18
integration commit, cited in the following control commit that flips P18 to `passed`. HS-009 stays
complete; scratch rolling SHA remains
`9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d` and FS-001 byte-identical.

**2026-07-25T21:55:00+10:00 — HS-019 `completion_pending`:** All packages mapped to HS-019 in SCOPE
are exactly {P18}, and P18 is now `passed` with independent review `reviews/P18-review-01.md`
(`VERDICT: PASS`, 0 blocking) and integration commit `fa9ae8d0b6b7948bd2c4a508ad869d5d6955a6a1`.
Root re-verified the two integrity preconditions: actual `sha256sum specs/human-scratch.md` equals
the rolling SHA `9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d`, and all 21
normalized top-level blocks byte-match `SCOPE.json#sourceTextLines` in SCOPE array order with
exactly the twelve passed IDs (HS-001/002/004/005/006/008/009/010/013/014/017/018) checked and
HS-019 still `[]`. Root appends this `completion_pending` marker for HS-019: exact pre-change SHA
`9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d`, intended single change `- [] `
-> `- [x] ` on the HS-019 block whose first line is `specs/human-scratch.md:344`, mapped package
review `reviews/P18-review-01.md` and integration `fa9ae8d0b6b7948bd2c4a508ad869d5d6955a6a1`. A
private `mktemp` copy of the pre-change scratch was taken for the one-line diff comparison. While
this marker is pending NO package dispatch is permitted. FS-001 stays immutable/open; the next
control commit applies the marker and finalizes HS-019 `passed`.

**2026-07-25T22:05:00+10:00 — HS-019 marker finalized `[] -> [x]`; requirement `passed`:** Root
applied the authorized forward marker for HS-019 by changing exactly the single block first line at
`specs/human-scratch.md:344` from `- [] ` to `- [x] `. The private `mktemp` pre-change copy was
diffed against the result and contained exactly that one marker-line change and nothing else; the
temp copy was then deleted. Post-change integrity re-verified: 21 normalized top-level blocks
byte-match `SCOPE.json#sourceTextLines` in SCOPE array order with exactly thirteen checked IDs (the
prior twelve plus HS-019) and every other block `[]`; actual `sha256sum specs/human-scratch.md` is
now `c4121a48723d21c6689116d900f450136645e0f88dc993829b7561b2a3a31a4c`. Finalization (this single
control commit): requirement HS-019 set `passed` citing P18 integration
`fa9ae8d0b6b7948bd2c4a508ad869d5d6955a6a1` and review `reviews/P18-review-01.md`; rolling scratch
SHA advanced
`9a0f6633ba671446684221679a2ef148122c09f7f1ed06978d8a9786a7170d4d -> c4121a48723d21c6689116d900f450136645e0f88dc993829b7561b2a3a31a4c`;
authorized checked-ID metadata gains HS-019 (thirteen total). FS-001 stays immutable/open at
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes. With
P18 passed, P19 (HS-020) is now dependency-ready (P04/P06/P18 all passed) and is the next dispatch;
no halt condition applies.

### 2026-07-25 — P19/01 dispatch (HS-020 WebAuthn PRF passkeys)

`queued -> implementing`. Root rewrote `HANDOFF.md` for P19/01 and dispatched a
`human_scratch_implementer` from clean pre-product HEAD `e72befd9ba1b2cbbf5c189b7d855e47cc752240e`
(tree clean; only ledger/handoff docs changed by root). Binding task `tasks/HS-020-passkey-prf.md`;
frozen source `specs/human-scratch.md:348-350` (`SCOPE.json#HS-020`). Dependencies P04, P06 and P18
are all `passed`. Authorized surface: one vetted WebAuthn library in `package.json`/lockfile
(recommended `@simplewebauthn/{server,browser}`), a new
`supabase/migrations/010_passkey_credentials.sql` (credential metadata plus encrypted wrapped
secret, RLS scoped by public-key hash), a new `src/server/routers/passkey.ts` wired additively into
`_app.ts`, new `src/lib/crypto` PRF-wrap helper(s), onboarding OR-UI edits
(`new-user`/`unlock`/`invite/[token]` creation branch) and new
`src/components/features/identity/**`, plus unit/integration/E2E tests. Load-bearing invariant: the
PRF output is only a KEK wrapping the SAME existing random master identity secret — never mint,
substitute or re-derive a vault identity, never reduce entropy, never hand-roll WebAuthn crypto. The
recovery-phrase derivation core (`seed.ts`, `keypair.ts`, `identity.ts` derivation, entropy,
wordlist), existing migrations and P05 realtime surfaces are read-only. Blocking secret-safety: no
master secret, PRF output, plaintext wrapped-secret bytes or recovery phrase in logs, URLs,
analytics, plaintext persistence, fixtures or any evidence/review artifact; server stores only
non-secret metadata and the encrypted wrapped secret; only public WebAuthn/BIP39 vectors in tests. A
genuine headless-Chromium PRF-automation limit (R-011) is a candidate partial `blocked_external` for
the real-PRF proof only, to be documented with a `Q-*` proposal — everything else must still ship
and no simulated PRF may be claimed as real. Requirement HS-020 stays `queued` (marker authorized
only after independent PASS). Scratch rolling SHA unchanged `c4121a48…`; FS-001 immutable/open;
thirteen requirements remain `passed`; no halt condition applies.

### 2026-07-25 — P19/01 ready_for_review (HS-020 WebAuthn PRF passkeys)

`implementing -> ready_for_review`. `human_scratch_implementer` returned P19/01 at product HEAD
`77038d1bb4ece9053d2c1d89f72ba7c00ac68aee` over cumulative BASE
`e72befd9ba1b2cbbf5c189b7d855e47cc752240e` (three product commits: RED `ea5af08`, GREEN `2482767`,
control-name fix `77038d1`). Root independently verified: `git rev-parse HEAD` == `77038d1`; working
tree clean apart from the untracked `evidence/P19/`; scratch `sha256 = c4121a48…` still matches the
rolling SHA with HS-020 marker line 348 unchecked; FS-001 `sha256 = 0d0e2a14…`, 715 lines / 25,441
bytes; the recovery-phrase derivation core (`seed.ts`, `keypair.ts`, `identity.ts`) and existing
migrations 005-009 are byte-identical via empty `git diff`. Crypto: PRF assertion output (32B) ->
HKDF-SHA256 -> KEK -> XChaCha20-Poly1305 wraps the SAME existing 64-byte master seed; recovery
phrase and every passkey unlock the identical Ed25519/X25519 identity; client re-derives
`pubkeyHash` and rejects a server mismatch. No `blocked_external`: P19/01 empirically confirmed
repo-pinned Playwright Chromium drives PRF via CDP `addVirtualAuthenticator` `hasPrf:true`
(create-time results absent, assertion-time deterministic), so all journeys have real automated E2E.
Reported gates: typecheck PASS, lint 0 errors, format PASS, unit 1615 passed (+65), E2E 116/116
(passkey spec 27/27 with `--repeat-each=3`). Boundary note carried to the reviewer: the changed set
is mostly within the authorized surface, but `src/app/(app)/settings/page.tsx` (6 lines, Q-022) is
OUTSIDE the allowlist, and `src/hooks/use-passkey.ts`, `src/server/schemas/passkey.ts`,
`src/types/webauthn-prf.d.ts` and regenerated `src/lib/supabase/database.types.ts` are additive but
not individually enumerated in the HANDOFF — the reviewer must rule on each. Four Q-proposals
transcribed Q-022 (settings mount), Q-023 (no real-hardware attestation), Q-024 (bare `pnpm format`
rewrote frozen scratch, reverted, no drift), Q-025 (db:types PostHog telemetry line, filtered);
R-011 updated (PRF automation available), R-024 updated (format-hazard witnessed and reverted).
Requirement HS-020 stays `queued` (marker authorized only after independent PASS). Thirteen
requirements remain `passed`; no halt condition applies.

### 2026-07-25 — P19/01 changes_requested (HS-020 review-01 FAIL)

`ready_for_review -> changes_requested`. A distinct `human_scratch_reviewer` independently reviewed
BASE `e72befd9ba1b2cbbf5c189b7d855e47cc752240e` -> HEAD `77038d1bb4ece9053d2c1d89f72ba7c00ac68aee`
and returned VERDICT **FAIL** with 2 blocking and 5 non-blocking findings; immutable output
`reviews/P19-review-01.md`. Blocking: **B-1** — `src/app/(onboarding)/new-user/page.tsx` calls
`registerIdentity()` (server registration + session install + vault creation) BEFORE the passkey
ceremony that can fail, with an empty catch; reviewer reproduced an orphaned identity (count
536->537, +0 passkeys, no error shown, button stuck, live session installed) whose recovery phrase
is never shown and is unrevealable anywhere in the app — permanent unreachable vault; the
cancellation E2E `passkey.spec.ts:288` asserts neither sessionStorage nor server rows so it passed
vacuously. **B-2** — `PasskeyManager.tsx` gates last-credential revocation behind only changed
prompt text; revoking the sole credential deletes the only `wrapped_secret`, and with B-1 the phrase
is unrecoverable — two-click permanent loss; the evidence recovery model §3 ("blocked outright if no
recovery phrase exists") was not implemented. Root independently confirmed the FAIL is well-founded
and concurs. The reviewer verified and root accepts: the master-secret wrap invariant HOLDS (frozen
`seed/keypair/identity` + migrations 005-009 byte-identical, PRF only an HKDF KEK over the same
64-byte seed, no minted identity, no hand-rolled crypto), server protocol sound (DB single-use
challenges, server-config origin/RP, monotonic counter, uniform failures, RLS FORCE deny-all,
599-line router test covers replay/tamper/revoked/anon/ wrong-identity), secret-safety has no leak
(single strip chokepoint + server Zod rejects `prf`, memzero in finally), "not blocked_external" is
TRUE (real CDP virtual authenticator, 84 real verified COSE keys), and RED->GREEN is genuine. Root's
pre-flagged deviations were ruled acceptable by the reviewer: `settings/page.tsx` (Q-022, additive
host for the required returning-user manager),
`use-passkey.ts`/`schemas/passkey.ts`/`webauthn-prf.d.ts`/regenerated `database.types.ts`
(convention/ type-rule/generated). `pnpm format:check` fails on 16 `specs/**` files but is
PRE-EXISTING and NOT attributable (15 fail at BASE; the 16th is the untracked evidence) — reinforces
Q-024. Reviewer raised Q-PROPOSAL-P19-01R-01 (transcribed Q-026): whether a passkey-only account may
exist without the phrase ever shown; root's P19/02 default is reorder-creation + reveal-phrase
surface + block last-credential revocation. P19/02 remediation is confined to the two client
journeys; the whole crypto/server/migration/secret-safety surface is preserved unchanged and
re-review spans original BASE `e72befd` -> new HEAD. Requirement HS-020 stays `queued` (no marker on
FAIL). Scratch rolling SHA unchanged `c4121a48…`; FS-001 immutable/open; thirteen requirements
remain `passed`; no halt condition applies.

### 2026-07-25 — P19/02 dispatch (HS-020 remediation of B-1/B-2)

`changes_requested -> implementing`. Root rewrote `HANDOFF.md` for P19/02 and dispatched
`human_scratch_implementer` from build BASE `77038d1bb4ece9053d2c1d89f72ba7c00ac68aee` (revision 02
is built ON TOP of the sound crypto/server/migration work — not reverted). Remediation is confined
to the two client journeys: B-1 reorder passkey-only creation so no server identity/session/vault is
committed before the ceremony succeeds, release busy state and surface errors on failure/cancel,
guarantee the recovery phrase is shown or genuinely revealable (the mnemonic is one-way from the
seed, so prefer showing at creation), and tighten the cancellation E2E to assert no partial
sessionStorage/server rows; B-2 block last-credential revocation for a passkey-only vault (or gate
behind explicit phrase confirmation) with counterfactual coverage. The
crypto/server/migration/RLS/secret-safety surface (review sections 2-5, all independently re-passed)
is preserved unchanged and forbidden to edit; the derivation core stays read-only. Cumulative
re-review spans original BASE `e72befd` -> the new HEAD. Q-024 formatting hazard restated in the
HANDOFF (no bare `pnpm format`). Requirement HS-020 stays `queued`. Scratch rolling SHA unchanged
`c4121a48…`; FS-001 immutable/open; thirteen requirements remain `passed`; no halt condition
applies.

### 2026-07-26 — P19/02 ready_for_review (HS-020 B-1/B-2 remediation)

`implementing -> ready_for_review`. `human_scratch_implementer` returned P19/02 at product HEAD
`bb8a557d37190058c68b2cebfe721d3e15f18629` (RED `9c6d494`, GREEN `bb8a557`) built on the review-01
FAIL record `6d05811`; full ancestry intact (my `9699fde`/`ad4103c`/`6d05811` are ancestors, the
immutable `reviews/P19-review-01.md` present at HEAD). Root independently verified: HEAD matches;
tree clean but for untracked `evidence/P19/`; scratch `sha256 = c4121a48…` with HS-020 marker line
348 unchecked; FS-001 `sha256 = 0d0e2a14…`; the preserved surface
`git diff --stat 77038d1 bb8a557 -- src/lib/crypto/ src/server/ supabase/ src/types/ src/lib/supabase/database.types.ts package.json pnpm-lock.yaml`
is EMPTY (byte-identical, no dependency change); derivation core untouched across
`e72befd..bb8a557`. Rev02 changed only authorized client/test paths:
`src/app/(onboarding)/new-user/page.tsx`, `src/components/features/identity/PasskeyBackupPhrase.tsx`
(new), `PasskeyManager.tsx`, `index.ts`, `src/hooks/use-passkey.ts`, and unit/E2E tests. B-1 closed:
new order generate(local) -> reversible client session -> derive seed -> passkey ceremony ->
`registerIdentity` -> show+acknowledge phrase -> navigate, with best-effort credential revoke +
session clear on any failure (reported 0 `user_data`/0 `vault_memberships` rows for a cancelled
attempt) and a 90s client-side ceremony deadline (a never-answered prompt previously never
rejected). B-2 closed: last- credential revocation requires the entered phrase to derive THIS
identity's pubkey hash, so a non-holder is blocked outright while a holder retains an escape hatch;
verified by mutation. Reported gates at `bb8a557`: typecheck PASS, lint 0 errors, unit 1627 passed/2
skipped (+12), E2E 119/119 (+3), passkey spec 36/36 with `--repeat-each=3`; `pnpm format:check`
fails only on the pre-existing 16 `specs/**` files (Q-024, not attributable). Implementer
self-reported a process error (mutated the tree mid-run during a full-suite execution, invalidating
it; restored the file, killed the run, re-ran clean — only the clean 119/119 counts; evidence §4.3)
and added a 12th E2E distinguishing cancellation from an unanswered prompt; the reviewer must
independently re-run gates from a clean tree. Secret-safety reaffirmed: no master secret/PRF
output/mnemonic/entropy in any log/URL/storage/fixture/artifact; creation phrase in React state one
step only; revocation phrase derived locally; secrets zeroized in `finally`. Q-027/Q-028
transcribed. Requirement HS-020 stays `queued` (no marker until PASS). Scratch rolling SHA unchanged
`c4121a48…`; FS-001 immutable/open; thirteen requirements remain `passed`; no halt condition
applies.

### 2026-07-26 — P19/02 reviewing -> PASS (integration-persistence)

`ready_for_review -> reviewing -> passed (integration pending)`. The distinct
`human_scratch_reviewer` returned VERDICT **PASS** with 0 blocking and 5 non-blocking findings over
original BASE `e72befd9ba1b2cbbf5c189b7d855e47cc752240e` -> product HEAD
`bb8a557d37190058c68b2cebfe721d3e15f18629`; immutable output `reviews/P19-review-02.md` is committed
in THIS integration-persistence commit, whose own hash is the P19 integration commit cited by the
following control commit. Root independently re-verified before recording: review-02 present with
VERDICT PASS; product HEAD unchanged at `bb8a557`; no 12-word BIP39 run or secret leaked into the
review; no `.playwright-cli/`/`test-results/` artifacts; the pre-marker normalized-block check
passes (unique HS-001 first line at scratch index 150, exactly 21 ordered blocks in SCOPE array
order, the 13 currently-passed IDs checked and every block byte-identical to
`SCOPE.json#sourceTextLines`, marker/ state consistent) and `sha256sum specs/human-scratch.md` ==
rolling `c4121a48…`. The reviewer closed both prior blockers by mutation, not diff-reading: B-1 —
reverting to the BASE ordering (registerIdentity before ceremony) makes the tightened cancellation
E2E fail on `footprint.users` Expected 0 Received 1, and a live headless reproduction past the 90s
deadline recovered the button, surfaced the timeout error, left sessionStorage null and 0/0/0 rows
for the attempted identity, with a mid-ceremony DB query also 0/0/0 (no server row ever exists); B-2
— replacing the compound revocation gate with validity-only fails exactly the "valid phrase that
derives a different identity" test, and a null session fails closed. Preserved surface confirmed
empty diff `77038d1..bb8a557`; path discipline clean (exactly the 10 authorized paths, 0 `specs/`
touched by implementer commits); RED `9c6d494` genuinely fails (6/3) at that commit. Reviewer's own
clean-tree gates: typecheck PASS, lint 0 errors, `format:check` fails only pre-existing `specs/**`
(confirmed same 15 fail at BASE, not attributable), unit 1627 passed/2 skipped, E2E 119/119
independently reproduced (invalidated-run residue explicitly searched for and not found), passkey
spec 36/36 with `--repeat-each=3`. Secret-safety: no leak; the creation phrase is nulled before
navigation. Reviewer withdrew its own review-01 recommendation (b) as unbuildable, endorsing Q-027's
show-at-creation, and endorsed Q-028's derive-and-match as strictly stronger. Non-blocking
NB-1..NB-5 recorded (pre-existing format Q-024; untested best-effort revoke path;
single-factor-after-abandon context for the human's Q-027 call; hard-coded 90s constant; slightly
widened `registerPasskey` contract ruled in scope). Requirement HS-020 remains `queued` until the
control commit applies the marker. Scratch rolling SHA unchanged `c4121a48…`; FS-001 immutable/open;
thirteen requirements remain `passed`.

### 2026-07-26 — HS-020 completion_pending (authorized forward marker)

Root-owned `completion_pending`. HS ID: **HS-020**. Exact pre-change scratch SHA-256:
`c4121a48723d21c6689116d900f450136645e0f88dc993829b7561b2a3a31a4c` (equals rolling SHA; normalized
blocks byte-match SCOPE in array order with the 13 currently-passed IDs checked). Mapped package:
**P19** `passed` — review `reviews/P19-review-02.md` VERDICT PASS 0 blocking,
integration-persistence commit `c06c851669f00093d1c78653125f784a48b1ed80`. Intended marker change:
`specs/human-scratch.md:348` first line `- [] ` -> `- [x] ` for the HS-020 block. While this event
is pending, no package dispatch is allowed. A private `mktemp` copy of the scratch file has been
taken for one-line-diff comparison. Finalization follows in this same control commit after the
marker is applied and re-verified.

### 2026-07-26 — HS-020 completion finalize (authorized forward marker) + P19 control

Root-owned finalize of the `completion_pending` above. **HS-020** marker applied at
`specs/human-scratch.md:348`: first line `- [] ` -> `- [x] ` for the HS-020 block. Pre-change
scratch SHA-256 `c4121a48723d21c6689116d900f450136645e0f88dc993829b7561b2a3a31a4c` -> post-change
`ddd5314297d9ffa9f6ebb9f3261c9f8b14c69a6d55b76d4490194980c4d2db49`; `git diff` on the scratch is
exactly one changed line (`348c348`, checkbox prefix only) and the private `mktemp` one-line-diff
comparison confirmed it before deletion. Post-marker normalized-block check re-run **green**: unique
HS-001 first line at scratch index 150, exactly 21 ordered top-level blocks in SCOPE array order,
all 14 currently-passed IDs (adding HS-020) byte-identical to `SCOPE.json#sourceTextLines`, every
`[x]` legitimate (HS-015 correctly still `[]`), and `sha256sum specs/human-scratch.md` == new
rolling `ddd53142…`. Package **P19** `reviewing -> passed` citing integration commit
`c06c851669f00093d1c78653125f784a48b1ed80` (Commit A, which persisted `reviews/P19-review-02.md` and
whose own hash is the integration hash). Requirement **HS-020** `queued -> passed`, mapped package
P19 review `reviews/P19-review-02.md` VERDICT PASS 0 blocking. Rolling scratch SHA advanced to
`ddd53142…`; authorized checked HS IDs += HS-020 (**fourteen**). Fourteen requirements now `passed`;
HS-015 remains `blocked_external`; FS-001 immutable/open. No dispatch was active while
`completion_pending`. Next: rewrite HANDOFF and dispatch P20A (HS-016).

### 2026-07-26 — Dependency sweep after P19 pass: blocked_external gate reached (HALT)

With P19 `passed`, root recomputed the dispatchable set from the package ledger. Result: **no
package is dispatchable.** 21 of 32 packages are `passed`; P05 (HS-015, secure Supabase Realtime
authorization) is `blocked_external` per **D-011**; and the 10 remaining `queued` packages — P08,
P10, P16E, P17A, P17B, P17C, P17D, P20A, P20B, P21 — are EACH transitively gated on P05. Verified
chain for the apparent next candidate P20A: P20A(dep
P17D)->P17D(P17C)->P17C(P17B)->P17B(P17A)->P17A(P16E)-> P16E(P08)->P08(P05, blocked_external). P21
depends on all prior, which includes these queued packages.

P05's documented recheck trigger (D-011 reversal path; R-026) is a **capable headless-CLI upgrade or
P21**. Neither is available in this environment: the npm registry is unreachable for a version
probe, and `@playwright/cli` is deliberately pinned at `0.1.17` (R-021/R-025), which cannot simulate
a genuinely-hidden background tab to measure the first late Realtime edge — exactly the measurement
D-011 requires before any P05 product/test diff. The before-P08 diagnostic (P05 rev 12,
`reviews/P05-review-12.md`) already re-confirmed the gate without executable change; re-running it
now would only re-confirm `blocked_external` again, not advance it.

This is the standing HALT condition: a genuine `blocked_external` gate with no independent work
left. No product code was touched. Ledger left consistent (rolling scratch SHA `ddd53142…`, 21
normalized blocks byte-match SCOPE with 14 checked IDs, canary intact). Reporting to the human.
Resumption trigger: a capable real-hidden-tab CLI/topology becomes available (or repository
authorization for one), at which point reopen P05 with a no-product diagnostic revision per D-011
and, on a measured first late edge, proceed to unblock P08 -> P16E/P10 -> P17A-D -> P20A/P20B ->
P21.

### 2026-07-26 — P05 reopened at revision 13 (D-017 rescope; supersedes D-011)

Root reopened P05 after a user-directed re-examination. Findings: (1) HS-015's frozen text asks only
about websocket connection security, CORS and public-key-hash vault access — NOT hidden-tab timing;
(2) that security substance is implemented and independently green —
`src/server/routers/realtime.ts` mints a 60s HS256 grant only after `rotate_realtime_grant` verifies
the caller `pubkey_hash` has vault access, scoped to `vault_ops`/topic/role with refresh+revoke, and
`src/lib/supabase/realtime.ts` subscribes to authoritative `vault_ops`; (3) a 2026-07-26 root
capability probe confirmed raw CDP `Emulation.setVisibilityState` is absent in the bundled Chromium
and the `addInitScript` visibility mock flips only the JS `visibilityState`/`hidden` predicate
(fires `visibilitychange`) WITHOUT throttling the real socket. Therefore the hidden-tab "first late
edge" timing study D-011/Q-013 pursued is out of HS-015 scope and cannot be genuinely measured here;
it is accepted as an unmeasured non-issue. **D-017** records this and supersedes D-011's hard
external block; D-011 marked superseded; R-026 -> mitigated, R-004 updated. P05 dispatched at
revision 13 to COMPLETE security acceptance with real
adversarial/authorization/publication/revoke/reconnect-catch-up/CORS tests and to verify background
as mock-driven re-sync BEHAVIOR only (never faked timing). HANDOFF rewritten for P05/13;
`evidence/P05/implementation-13.md` sole artifact, `reviews/P05-review-13.md` future immutable
review. No product code touched by root. Rolling scratch SHA unchanged `ddd53142…`; HS-015 remains
unchecked until independent PASS; fourteen requirements still `passed`.

### 2026-07-26 — P05/13 ready_for_review (HS-015 websocket security; root verification + reviewer dispatch)

`p05-implementer-13` handed back at HEAD `b34dcf6`. Root independently verified before dispatching
review: (1) commit is exactly 7 files, no ledger/scratch/evidence touched; (2) PRESERVED
AUTHORIZATION BOUNDARY intact — `git diff 92dfd4d..b34dcf6` over `src/server/routers/realtime.ts`,
`src/lib/supabase/realtime.ts`, `src/server/schemas/realtime.ts`, `src/lib/sync/manager.ts` and
`supabase/**` is EMPTY; (3) sole product change is `src/components/providers/vault-provider.tsx` (2
functional + 3 comment lines) routing durable sync catch-up through the direct tRPC client instead
of the React Query 60s-staleTime cache — a genuine "silent missed update" defect fix, but OUTSIDE
the HANDOFF's enumerated src grant (realtime.ts x3), FLAGGED for reviewer minimality/cross-consumer
scrutiny; (4) secret-safety clean — `realtime-stack.ts` derives the local symmetric key from the
Docker realtime JWKS at runtime, no hardcoded secret, none logged/asserted/written to evidence; (5)
evidence `evidence/P05/implementation-13.md` complete (all sections; uncommitted).
Implementer-reported gates on `b34dcf6`: typecheck pass, lint 0 errors, `pnpm test` 1,684 passed / 2
skipped (57 new), `pnpm test:e2e` 122/122 x2 at retries=0, serial repeat-each=3 15/15, format:check
failures all pre-existing specs/\*\* (Q-024). PROGRESS -> reviewing. Dispatched a DISTINCT reviewer
`p05-reviewer-13` (NOT the implementer) over BASE `007651be` -> HEAD `b34dcf6`, task
`tasks/HS-015-realtime-security.md` under D-017, output `reviews/P05-review-13.md`, with explicit
scrutiny of: the vault-provider.tsx cache-bypass (correctness/minimality/other sync consumers +
P08/P10 impact), the live-server security acceptance, the two RED controls, background asserting
BEHAVIOR-only (no faked hidden-tab timing), the CORS-does-not-gate-upgrade conclusion,
secret-safety, and the `nonTransportProblems` console-error filter judgement call. Rolling scratch
SHA unchanged `ddd53142…`; HS-015 unchecked until independent PASS.

### 2026-07-26 — P05/13 reviewing -> PASS (integration-persistence)

`p05-reviewer-13` (a DISTINCT reviewer, never the implementer) returned **VERDICT: PASS**, 0
blocking defects, for HS-015 under D-017. Immutable review `reviews/P05-review-13.md` is persisted
in THIS integration-persistence commit; its own hash is the P05/13 integration commit cited by the
following control commit. Root independently re-verified before recording: review-13 present with
VERDICT PASS; product HEAD unchanged at `b34dcf6` (no product/test diff `b34dcf6..HEAD`; only root
ledger commit `ffd187a` intervened); PRESERVED AUTHORIZATION BOUNDARY empty —
`git diff 92dfd4d..b34dcf6` over `src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`,
`src/server/schemas/realtime.ts`, `src/lib/sync/manager.ts` and `supabase/**` is 0 lines (60s HS256
pubkey-hash grant, `vault_ops` scoping, rev-11 duplicate-tab correction all intact); no
secret/12-word-mnemonic/recovery material in the review; no `.playwright-cli/`, and `test-results/`
is gitignored; pre-marker normalized-block check GREEN (21 ordered SRC-HUMAN-SCRATCH blocks
byte-identical to `SCOPE.json#sourceTextLines`, 14 checked IDs, HS-015 correctly still `[]`) and
`sha256sum specs/human-scratch.md` == rolling `ddd53142…`. Reviewer's independently-reproduced
findings: security acceptance proven against the REAL local Supabase server (57 integration tests:
23 grant-lifecycle + 25 live-socket + 9 origin/CORS —
outsider/expired/replayed/revoked/cross-vault/table/topic/role denial, publication correctness,
revoke, membership-removal fail-safe; real WebSocket + psql, not mocks on security paths); live DB
confirmed the publication is `vault_ops`-only and `realtime_grant_allows` is the real strict body
with `authenticated` holding no grant SELECT / no rotate EXECUTE; the sole product change
`vault-provider.tsx` (`getSnapshot`/`getUpdates` via `client.*.query` instead of `utils.*.fetch`)
fixes a REAL silent-missed-update defect (the 60s React Query staleTime answered recovery reads from
cache, dropping ops), is minimal (matches the existing pushOps/pushSnapshot pattern), is the only
consumer of that cache so cold-start/P08/P10 are unaffected — ACCEPTED on merits though outside the
enumerated realtime.ts-only src grant (grant-scope deviation noted, non-blocking); no faked timing
(visibility helper flips only the JS predicate; recovery spec asserts convergence with a
suppressedCount()>0 guard, never wall-clock); CORS-does-not-gate-upgrade supported; secret-safe (JWT
key derived at runtime from JWKS/env, never logged/returned/asserted; tests assert the token
excludes both the secret AND the identity hash); the `nonTransportProblems` filter is broad but
security is asserted directly, a non-blocking nit. Reviewer gates: typecheck PASS, lint 0 errors (10
pre-existing warnings), `pnpm test` 1,684 passed/2 skipped, realtime integration 57/57,
`realtime-recovery` e2e 3/3; limitations recorded (did not run the full 122 e2e suite; did not
replay the RED DB-function-weakening step — verified the restored end-state instead; did not re-run
format:check). P05 remains `reviewing` and HS-015 remains unchecked until the control commit applies
the forward marker. Rolling scratch SHA unchanged `ddd53142…`.

### 2026-07-26 — HS-015 completion_pending (authorized forward marker)

Root-owned `completion_pending`. HS ID: **HS-015**. Exact pre-change scratch SHA-256
`ddd5314297d9ffa9f6ebb9f3261c9f8b14c69a6d55b76d4490194980c4d2db49` (equals rolling SHA; normalized
blocks byte-match SCOPE in array order with the 14 currently-passed IDs checked, HS-015 still `[]`).
Mapped package: **P05** `reviewing -> passed` — review `reviews/P05-review-13.md` VERDICT PASS 0
blocking, integration-persistence commit `8101bb2355a9894dd5cac9540afd38045973dd01`. Intended marker
change: `specs/human-scratch.md:325` first line `- [] ` -> `- [x] ` for the HS-015 block (lines
325-326 per `SCOPE.json#sourceLineRange`). While this event is pending, no package dispatch is
allowed. A private `mktemp` copy of the scratch file was taken for one-line-diff comparison.
Finalization follows in this same control commit after the marker is applied and re-verified.

### 2026-07-26 — HS-015 completion finalize (authorized forward marker) + P05 control

Root-owned finalize of the `completion_pending` above. **HS-015** marker applied at
`specs/human-scratch.md:325`: first line `- [] ` -> `- [x] ` for the HS-015 block. Pre-change
scratch SHA-256 `ddd5314297d9ffa9f6ebb9f3261c9f8b14c69a6d55b76d4490194980c4d2db49` -> post-change
`29bbb2fc970ceadc58e13d8216a35317663a0b5331a7ba6e5c9d44e4b2949a16`; `git diff` on the scratch is
exactly one changed line (`325c325`, checkbox prefix only) and the private `mktemp` one-line-diff
comparison confirmed it before deletion. Post-marker normalized-block check re-run **green**:
exactly 21 ordered SRC-HUMAN-SCRATCH blocks in SCOPE array order, all 15 currently-passed IDs
(adding HS-015) byte-identical to `SCOPE.json#sourceTextLines`, every `[x]` legitimate, and
`sha256sum specs/human-scratch.md` == new rolling `29bbb2fc…`. Package **P05** `reviewing -> passed`
citing integration commit `8101bb2355a9894dd5cac9540afd38045973dd01` (Commit A, which persisted
`reviews/P05-review-13.md` and whose own hash is the integration hash);
`evidence/P05/implementation-13.md` persisted in this control commit. Requirement **HS-015**
`queued -> passed`, mapped package P05 review `reviews/P05-review-13.md` VERDICT PASS 0 blocking.
Rolling scratch SHA advanced to `29bbb2fc…`; authorized checked HS IDs += HS-015 (**fifteen**).
Fifteen requirements now `passed`; FS-001 immutable/open. P05 was the final `blocked_external` gate
— its pass unblocks P08 (deps P05, P07 both `passed`). No dispatch was active while
`completion_pending`. Next: rewrite HANDOFF and dispatch P08 (HS-012, HS-011).

### 2026-07-26 — P08/01 dispatch (HS-011 journey + HS-012 auto-person linkage)

With P05 `passed` (the final `blocked_external` gate, cleared under D-017), root recomputed the
dispatchable set: **P08** (deps P05, P07 — both `passed`) is now dispatchable and is the sole
next-dispatchable package (P10, P16E, P17A-D, P20A/B, P21 remain transitively gated behind P08).
HANDOFF rewritten for **P08 / 01** at BASE `c5c99195bef523c1d4ba2f55e54c886a1aa68533` (HANDOFF
commit `e123146`), scoped to HS-011 (deliver the selected journey) + HS-012 (auto-person linkage)
ONLY, governed by **D-013** (linked hybrid: Vault Settings authoritative for Members/Invites; People
optional-linked encrypted financial state) and the accepted P07 contract
(`evidence/P07/implementation-04.md` SHA `313ce10c…`, `reviews/P07-review-04.md`). Mandated: real
sender-bound authenticated `crypto_box` (no placeholder key), fragment-only bearer secrets,
per-epoch envelope history, locked server rotation, exact-op edit fence/journal, idempotent
`person-default-me` linkage, safe migration, and a genuine two-user E2E. Preserve P04 RLS and P05
realtime pubkey-hash boundaries. Dispatched `human_scratch_implementer` as `p08-implementer-01`.
Sole implementer artifact `evidence/P08/implementation-01.md`; future immutable review
`reviews/P08-review-01.md`. Rolling scratch SHA unchanged `29bbb2fc…`; fifteen requirements
`passed`; no marker until independent PASS.

### 2026-07-26 — P08/01 scope adjudication: ruling (b), D-018 rescope (supersedes D-013 in part)

During P08/01 implementation, `p08-implementer-01` surfaced a blocking scope/boundary tension
(evidence `evidence/P08/implementation-01.md` section 2, local proposal Q-025): honoring D-013's
full 29-clause epoch contract would require adding `epoch` + `exact_operation_id` + peer/frontier
columns to the PRESERVED P04 `vault_ops` table and rewriting the local op-admission pipeline — a
change the dispatch forbids without a Q-proposal. Because resolving it would REDUCE committed scope
/ supersede a prior decision (the highest-conflict-of-interest call), root applied the standing
over-scoped-stall rule: it did NOT self-adjudicate and did NOT pause the human. Root told the
implementer to keep building the boundary-safe core (the subset needed under either outcome) and
dispatched a DISTINCT fresh-context opus-tier scope adjudicator — never P08's implementer or
reviewer — to rule from the frozen HS-011/HS-012 text.

Ruling (`adjudications/P08-scope-01.md`): **(b)**. The epoch / per-epoch-envelope /
`exact_operation_id` / fence / journal / rotation / causal-repair / saga / backfill machinery maps
to NO frozen requirement — HS-011/HS-012 never mention removal, forward secrecy, epochs, exact-op
permanence, or crash-safe rotation. It is a losslessness/crash-safety hardening of an
ALREADY-EXISTING rekey capability (`src/server/routers/membership.ts` remove +
`rekey_vault_members`; `vault_memberships.enc_public_key`), invented by the P07 ADR from a
self-imposed member-removal/forward-secrecy ambition. D-013's linked-hybrid DATA MODEL stands
(frozen-traceable); its 29-clause mandate is over-scope. The boundary-change claim is CONFIRMED but
MOOT under (b): `vault_ops` MUST stay preserved, no boundary Q-approval issued.

Root independently reverified the load-bearing fact (verify-not-trust):
`supabase/migrations/005_vault_ops.sql` shows `vault_ops` has exactly six columns (id, vault_id,
version_vector, encrypted_data, author_pubkey_hash, created_at) with no
epoch/exact_operation_id/frontier metadata. Transcribed the ruling as binding authority: **D-018**
appended to DECISIONS.md (rescope P08 to the boundary-safe core; D-013 marked superseded-in-part);
implementer proposals renumbered from local Q-025..Q-028 to **Q-029..Q-032** in QUESTIONS.md (Q-029
= scope, resolved (b); Q-030/Q-031/Q-032 = name-source / duplicate-repair / link-identifier,
safest-reversible defaults accepted); HANDOFF.md rewritten so the eventual reviewer reviews against
the D-018 definition-of-done, not D-013's 29 clauses. Epoch machinery classified future-work with NO
frozen mandate — explicitly NOT spun into a new package. Rolling scratch SHA unchanged `29bbb2fc…`;
fifteen requirements `passed`; no marker until independent PASS. Human audits this ruling after the
fact. Next: await p08-implementer-01 handback, then dispatch a distinct P08 reviewer over the D-018
DoD.

### 2026-07-26 — P08/01 ready_for_review + distinct reviewer dispatched (D-018 boundary-safe core)

`p08-implementer-01` handed back P08/01 GREEN at HEAD `d2762f9` ("feat: HS-011 invite/member UX and
HS-012 auto-linked person"; product + test only). Reported gates: typecheck clean, lint 0 errors (10
pre-existing unused-var warnings in untouched test files), unit+integration 1714 passed / 2 skipped,
e2e 123 passed / 0 failed at --retries=0, format:check failing only on 16 root-owned
ledger/spec/review/evidence docs (pre-existing, Q-024, not attributable). Evidence
`evidence/P08/implementation-01.md` left uncommitted.

Root independent verify-not-trust BEFORE reviewer dispatch: (1) HARD boundary EMPTY-DIFF confirmed —
`git diff c5c9919 d2762f9 -- src/server/routers/realtime.ts src/lib/supabase/realtime.ts src/server/schemas/realtime.ts supabase/migrations`
is empty; the only `vault_ops` occurrences in the diff are explanatory comments, no schema/scoping
change. (2) Forbidden-writes clean — the implementer's own commit `d2762f9` is exclusively
`src/**` + `tests/**`, zero ledger/spec/review/.claude writes (the specs paths in the
c5c9919..d2762f9 range are root's own `d7e9e47`). (3) Secret-safety improvement confirmed — the
pre-existing decrypted-plaintext `console.log(doc.toJSON())` at BASE
`src/lib/vault/ensure-default.ts:160` is removed at HEAD. Flagged for reviewer scrutiny (disclosed
by implementer + noted by root): the diff is BROADER than the pure invite/person surface
(transactions/accounts/automations/BalanceSummary/PersonRow/ crdt/vault-provider) — presumed the
legitimate ripple of `Person.name` becoming optional (resolver adoption), plus an out-of-surface
`src/server/trpc.ts` request-scoped nonce memo fixing a latent batch-auth bug (httpBatchLink
one-nonce-per-batch vs claimed-per-procedure), guarded by
`tests/integration/auth-batch-nonce.test.ts`; and the HS-012 consume-once acceptance-marker
materialization (`src/lib/vault/pending-person-link.ts`) that avoids emitting a redundant synced
`vault_ops` op on every open.

Dispatched a DISTINCT fresh-context reviewer `p08-reviewer-01` (never the implementer or the scope
adjudicator) to review BASE `c5c9919` -> HEAD `d2762f9` against the **D-018** DoD (items 1-6) — NOT
D-013's 29 clauses — with explicit mandate to re-verify the boundary itself, reproduce the
placeholder-defect RED proof, adjudicate the flagged out-of-surface changes, run all gates, and
write `reviews/P08-review-01.md` (uncommitted) with a PASS / CHANGES_REQUESTED verdict + blocking
count. Package **P08** `implementing -> reviewing`. Rolling scratch SHA unchanged `29bbb2fc…`;
fifteen requirements `passed`; no marker until independent PASS. Next: on PASS, two-commit
integration + forward marker for HS-011 + HS-012.

### 2026-07-26 — P08/01 changes_requested (review-01: 1 blocker B-2; B-1 withdrawn, item 3 MET) + rev-02 dispatch

`p08-reviewer-01` (distinct fresh-context reviewer; not the implementer, not the scope adjudicator)
returned **VERDICT: CHANGES_REQUESTED** on `reviews/P08-review-01.md` over BASE `c5c9919` -> HEAD
`d2762f9`. It initially raised 2 blockers, then — prompted by root to adjudicate the removal nuance
from the code rather than by inference — ran the decisive query and **WITHDREW B-1**, recording the
withdrawal explicitly for the ledger rather than silently deleting it.

**B-1 (DoD 3) — WITHDRAWN; item 3 MET.** The reviewer's original inference ("BASE had no removal UI,
so a new removal UI that doesn't rotate is a regression") was overturned by the decisive comparison:
`rekeyVault`, `performCompleteRekey`, `reencryptSnapshot` had ZERO real call sites at BASE `c5c9919`
(only the `crypto/index.ts` barrel re-exports; the router's 6-step remove-then-rekey header was
aspirational, step 6 never called by any client) AND still zero at HEAD. Rotation posture is
unchanged: BASE never rotated, HEAD never rotates — a capability that never existed cannot be
downgraded. HEAD strictly ADDS owner-only membership revocation. Removed-member future-envelope
access is revoked at exactly "the strength the preserved boundary already provides" (D-018's
wording): `vault_ops` RLS is membership-scoped via `is_vault_member` (`005_vault_ops.sql:114`), and
realtime re-checks membership on every message via `realtime_grant_allows`
(`007_realtime_authorization.sql:36-66`, `revoked_at IS NULL`, 60s TTL). The residual (retained
key + already-downloaded data) is the exact limit D-018 rules OUT and that even the 29-clause
contract conceded it could not fix. Root independently reconfirmed the zero-call-site fact at both
BASE and HEAD before accepting the withdrawal (verify-not-trust; a blocker removal is
scope-relevant).

**B-2 (DoD 4/5) — SOLE REMAINING BLOCKER.** Invite acceptance never switches the member into the
shared vault: `invite/[token]/page.tsx:191-203` calls `markPendingPersonLink` + `router.push` but
never `setActiveVault`; the `vault-provider.tsx:136-140` reconciler only reassigns when the current
selection is INACCESSIBLE, and the member's own vault is accessible, so `consumePendingPersonLink`
is never reached and no member Person materializes. Reviewer reproduced live (two-context probe):
`openedShared=false`, marker stranded, member's People shows only "Me". Forcing the switch proves
the linkage LOGIC is correct (both peers converge to 2 persons, `Member <first8>` fallback renders,
marker consumed) — this is a pure wiring defect. Aggravating: the `sessionStorage` consume-once
marker has no reconciliation path, so a miss is permanent. The shipped E2E asserts only on the DB
membership row, never on what the member's app opens, so it cannot catch this.

**Non-blocking (N-4 revised + coverage):** (i) the remove control should state access is revoked but
the key is NOT rotated (discharges the binding task's "removal/rekey implications explained"); (ii)
add the DoD-5 removal authorization integration test (authorization itself is
pre-existing/server-side, verified at `membership.ts:102-107` / `:196-201`); (iii) evidence section
4's "sealed-box rekey ... unchanged" overstates — no rekey runs at all (`sealKeyToBase64` reachable
only from the uncalled `rekeyVault`); the "unchanged" part is fair.

**Verified PASSES (reviewer reproduced, not trusted):** boundary EMPTY diff (zero epoch /
exact_operation_id / fence / journal / saga hits); DoD 1 (real authenticated `crypto_box` unwrap +
32-byte validation + self-wrap, owner sender key resolved server-side from
`vault_memberships.created_by`, fail-closed NOT_FOUND, `safeParse` replaces an `as` cast, RED
placeholder guard real); DoD 2 (Settings-mounted surface, People hardcoding deleted at the type
level, server-side owner authz); DoD 3 (revoke-at-preserved-strength, per above); secret-safety
(synthetic vectors, zero `console.*` additions, plaintext `doc.toJSON()` dump removed); `trpc.ts`
nonce memo justified (guard proven by reversion -> `auth-batch-nonce.test.ts` 2/2 FAIL then
restored, replay preserved); Person.name resolver ripple justified across 7 files. Gates reproduced:
typecheck PASS, lint 0 errors, `pnpm test` 1714 passed / 2 skipped, `pnpm test:e2e --retries=0` 123
passed / 0 failed; format:check fails only on 16 root-owned `specs/**` docs (Q-024, not
attributable).

Root persisted the review (immutable) and did NOT integrate / did NOT apply any forward marker (no
PASS). Package **P08** `reviewing -> changes_requested`. HANDOFF rescoped to **P08 / 02** fixing
B-2 + N-4 with all rev-01 passes preserved. Re-tasked `p08-implementer-01` for rev-02.

### 2026-07-26 — P08/02 ready_for_review (B-2 remediation) + distinct reviewer dispatch

`p08-implementer-01` handed back rev-02 at HEAD `d40b854` (sole commit on top of root's `2bf89b3`;
product base == rev-01 `d2762f9`). Root verified handback integrity BEFORE dispatch
(verify-not-trust): `d40b854` touches EXACTLY the six authorized paths (`invite/[token]/page.tsx`,
`vault-provider.tsx`, `pending-person-link.ts`, `AccessMembersSection.tsx`,
`tests/e2e/invite-redemption.spec.ts`, `tests/integration/membership-remove-authz.test.ts`); zero
forbidden writes; EMPTY diff over `supabase/migrations/**`, `src/server/routers/**`, the Realtime
path and `vault_ops`; no epoch/`exact_operation_id`/fence/journal/saga content;
`evidence/P08/implementation-02.md` left uncommitted.

**Reported B-2 fix (to be reviewer-verified):** `handleAccept` now calls
`setActiveVaultStorage({id: vaultId})` before `router.push` — the invite page is outside
`ActiveVaultProvider`, so it uses the app's own non-React vault switch and `/transactions` reads it
on mount; this delivers the accepting member into the SHARED vault so the init effect runs and the
member Person materializes. The pending-person-link marker moved from sessionStorage (one-shot,
permanent-miss) to localStorage with check-and-clear-ON-CONFIRMATION — clears only once the Person
is durably present, retries on `forceSync` throw, no-ops when already linked, converges concurrent
tabs/refresh/re-accept to one deterministic Person. New two-user E2E asserts from the MEMBER's app
(shared vault active + self "You" + owner "Linked" + no raw pubkey hash + bidirectional); RED with
the fix stashed (member stuck in own vault), GREEN with it; `--repeat-each=3` on invite +
realtime-recovery = 15/15, retries disabled. Non-blocking: N-4a owner copy
(revoked-but-not-rotated), N-4b `membership-remove-authz.test` (non-owner->FORBIDDEN,
non-member->NOT_FOUND), N-4c corrected "sealed-box rekey" wording. Claimed gates: typecheck clean,
lint 0, `pnpm test` 1716 passed/2 skipped, `pnpm test:e2e` 124 passed; format:check fails only on
`specs/**` (pre-existing).

**Flagged design call (routed for explicit reviewer adjudication, NOT root-decided):** the
implementer did NOT implement a pure markerless "reconcile on every shared-vault open"; it states a
markerless reading provably regresses the PRESERVED `realtime-recovery:108` E2E 3/3 (the fixture
receiver would emit a racing `vault_ops` op), so it retained the acceptance marker as the
real-invitee vs fixture-receiver discriminator, and explicitly did NOT self-adjudicate this as a
scope change. Reviewer must rule whether this is a defensible product signal meeting the HANDOFF
intent (idempotent, re-runnable, permanent-miss removed) or a genuine scope reduction / test-driven
contortion; if the latter, reviewer flags to root (scope reductions route to an independent
adjudicator, never reviewer/implementer).

Distinct reviewer `p08-reviewer-01` (the rev-01 reviewer; NOT the implementer, NOT the scope
adjudicator) dispatched over `d2762f9..d40b854` to write `reviews/P08-review-02.md`. Package **P08**
`changes_requested -> reviewing`; rev stays 02; no forward marker (no PASS yet).

### 2026-07-26 — P08/02 review PASS (integration-persistence)

`p08-reviewer-01` (distinct fresh-context reviewer; not the implementer, not the scope adjudicator)
returned **VERDICT: PASS — 0 blocking findings** on `reviews/P08-review-02.md` over
`d2762f9..d40b854`. This is the integration-persistence commit (Commit A): it persists the immutable
review and records the verdict; package **P08 stays `reviewing`** until the control commit (Commit
B) applies the authorized forward marker. Root independently re-verified the load-bearing facts
before persisting (verify-not-trust): the review file states PASS/0-blocking; the tree is clean
except the review file + untracked evidence; the `d2762f9..d40b854` diff over
`supabase/migrations` + `src/server/routers` + the Realtime path + schemas is EMPTY; the core B-2
fix line (`setActiveVaultStorage({ id: inviteInfo.vaultId })`) is genuinely present in
`invite/[token]/page.tsx`.

**Why the PASS is trustworthy (reviewer method, recorded for audit):** the reviewer reproduced B-2
both directions — stashing ONLY the `setActiveVaultStorage` line made the new E2E FAIL at
`invite-redemption.spec.ts:110` (member stuck in their OWN vault), restored it went 6/6 at
`--repeat-each=3 --retries=0`. It confirmed the mechanism by reading that `ActiveVaultProvider`
mounts only at `src/app/(app)/layout.tsx:92` while the invite page lives in the `(onboarding)` group
(so the localStorage write is the correct mechanism, not a shortcut) and that
`active-vault-provider.tsx:91-94` seeds state synchronously from the same key/shape on first render.
It confirmed the permanent-miss fragility is removed (localStorage marker cleared only AFTER
`awaitLocalPersistence()+forceSync()` at `vault-provider.tsx:225-236`, no `finally` defeating it,
retry on throw; deterministic `person-member-${pubkeyHash}` id so concurrent tabs merge the same
CRDT key; already-linked open is a no-op).

**Flagged design call — reviewer ruled (a) LEGITIMATE, independently; NO scope question raised.**
The reviewer did NOT accept the implementer's framing: it built the markerless variant itself and
A/B-ran it (`--repeat-each=6 --retries=0 --workers=1`) — markerless 4 FAILED/18 on
`realtime-recovery` (serial repetition only; 3/3 GREEN under parallel workers, which is why a
shallow reviewer would wrongly call the claim a rationalization), as-shipped 18/18 — confirming the
regression is REAL (the fixture inserts a membership row via the admin client, so under markerless a
never-accepted receiver emits a synced `vault_ops` op exactly while the test suppresses/counts
them). Crucially it ruled (a) on grounds INDEPENDENT of the test: `PeopleTable.tsx:70-74` lets a
user soft-delete their own Person and `person.ts:85` deliberately ignores a soft-deleted linked
Person, so a pure "reconcile on every open" would RESURRECT a Person the user chose to delete — a
real product defect. Against the frozen HANDOFF (defect = "a one-shot marker that is never retried";
criteria idempotent + re-runnable + concurrent-tabs/refresh/re-accept converge to one Person), every
criterion is met; only the literal "whenever the shared vault is opened" sub-reading is not taken,
and that reading both regresses a PRESERVED test and introduces a defect. Intent satisfied in full →
defensible implementation choice, not a scope reduction. Therefore no independent-adjudicator
routing is warranted.

**No rev-01 regression; N-4 discharged (reviewer-reproduced):** DoD 1/2/3 hold (crypto
byte-identical; only N-4a copy added; zero epoch/rekey vocabulary in the delta). N-4a owner-gated
revoked-but-not-rotated copy at `AccessMembersSection.tsx:105-112`, accurate. N-4b
`membership-remove-authz.test.ts` MUTATION-TESTED (neutering owner check fails FORBIDDEN; neutering
membership check fails NOT_FOUND). N-4c evidence wording corrected (`implementation-02.md:96-103`).
Gates reproduced by the reviewer: typecheck PASS, lint 0 errors, `pnpm test` 1716 passed/2 skipped,
`pnpm test:e2e` 124 passed/0 failed, format:check fails only on 16 root-owned `specs/**` docs
(Q-024). Secret-safety CLEAN (zero `console.*`, synthetic hashes only, E2E reads the owner hash
solely to assert ABSENCE). Non-blocking notes N-6 (marker keyed per-vault not per-identity; worst
case a self-healing missed materialization, never a wrong Person) and N-7 (out-of-band-provisioned
members get no linked Person — the intended discriminator) carried forward, neither needed for PASS.

Control commit (Commit B) follows immediately: apply the authorized forward marker completing HS-012
AND HS-011 (its other package P07 already `passed`), flip P08 -> `passed`, advance the rolling
scratch SHA.

### 2026-07-26 — HS-011 + HS-012 completion_pending (authorized forward markers)

Root-owned `completion_pending` for the two markers mapped to package **P08**. HS IDs: **HS-011**
and **HS-012**. Exact pre-change scratch SHA-256
`29bbb2fc970ceadc58e13d8216a35317663a0b5331a7ba6e5c9d44e4b2949a16` (equals rolling SHA; normalized
blocks byte-match SCOPE in array order with the 15 currently-passed IDs checked, HS-011 and HS-012
still `[]`). Mapped package: **P08** `reviewing -> passed` — independent review
`reviews/P08-review-02.md` VERDICT PASS 0 blocking over `d2762f9..d40b854`, integration-persistence
commit `a1e1b2d` (Commit A, which persisted the review and appended the PASS event). HS-011 requires
ALL its mapped packages passed (P07 integration `1f6cb96b27c8093f0ba2c319f32d3c79c8aab126` + P08 now
passed) — both satisfied; HS-012 maps to P08 only. Intended marker changes:
`specs/human-scratch.md:307` first line `- [] ` -> `- [x] ` for the HS-011 block (lines 307-311 per
`SCOPE.json#sourceLineRange`) and `:313` for the HS-012 block (lines 313-315). While this event is
pending, no package dispatch is allowed. A private `mktemp` copy of the scratch file was taken for
exact-diff comparison. Finalization follows in this same control commit after the markers are
applied and re-verified.

### 2026-07-26 — HS-011 + HS-012 completion finalize (authorized forward markers) + P08 control

Root-owned finalize of the `completion_pending` above. **HS-011** marker applied at
`specs/human-scratch.md:307` and **HS-012** at `:313`: each block's first line `- [] ` -> `- [x] `.
Pre-change scratch SHA-256 `29bbb2fc970ceadc58e13d8216a35317663a0b5331a7ba6e5c9d44e4b2949a16` ->
post-change `df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3`; `git diff` on the
scratch is exactly two changed lines (`307c307` and `313c313`, checkbox prefix only) and the private
`mktemp` diff comparison confirmed it before deletion. Post-marker normalized-block check re-run
**green**: exactly 21 ordered SRC-HUMAN-SCRATCH blocks in SCOPE array order, all 17 currently-passed
IDs (adding HS-011 and HS-012) byte-identical to `SCOPE.json#sourceTextLines`, every `[x]`
legitimate, and `sha256sum specs/human-scratch.md` == new rolling `df8ad9ce...`. Package **P08**
`reviewing -> passed` citing integration commit `a1e1b2d` (Commit A, which persisted
`reviews/P08-review-02.md` and appended the PASS event); `evidence/P08/implementation-02.md`
persisted in this control commit. Requirements **HS-011** and **HS-012** `queued -> passed`, mapped
package P08 review `reviews/P08-review-02.md` VERDICT PASS 0 blocking; the implementer's flagged
marker-vs-markerless design call was ruled (a) legitimate by the reviewer on grounds independent of
the test suite, so no independent-adjudicator routing was required. Rolling scratch SHA advanced to
`df8ad9ce...`; authorized checked HS IDs += HS-011, HS-012 (**seventeen**). Seventeen requirements
now `passed`; FS-001 immutable/open. P08's pass unblocks **P10** (HS-003; deps P08) and **P16E**
(deps P16D, P08, P11C — all passed). No dispatch was active while `completion_pending`. Next:
rewrite HANDOFF and dispatch P10 (HS-003), noting P16E is co-dispatchable.

### 2026-07-27 — P16E/01 dispatch (FS-001 final package: People-page settlement experience)

With **P08** `passed`, root recomputed the dispatchable set. Two packages are dispatchable —
**P16E** (deps P16D, P08, P11C — all `passed`) and **P10** (deps P05, P08 — both `passed`) — and are
independent of each other. The root loop is serial (PROCESS step 3: exactly one package
`implementing`). P16E is chosen first because it sits on the deep remaining critical chain (P16E ->
P17A -> P17B -> P17C -> P17D -> P20A -> P20B -> P21) AND is the FINAL package of FS-001 (P16A–D
already `passed`); P10 is a leaf feeding only HS-003 and can follow. HANDOFF rewritten for **P16E /
01** at BASE `191d0707f5e6dbfa5871dbddaa7318b9a14885dd` (current HEAD; all P16A–D allocation work,
P08 people/member work and P11C alias flows are in this tree), root reviews `191d070..HEAD`. Scoped
to the P16E slice of FS-001 ONLY: replace the People summary
(`src/components/features/people/BalanceSummary.tsx` from `src/app/(app)/people/page.tsx`) with the
canonical structured obligations grouped in separate per-currency sections (never a combined
cross-currency total), highlight the linked Person; expand each obligation to contributing
transactions (date, resolved description/alias, account, signed contribution, explicit/effective
allocations) with a "View transaction" affordance that focuses the STABLE source transaction ID in
the existing P16D grid; the distinct states (everyone-settled only with no obligations AND no
issues; neutral no-qualifying-paid; prominent "Settlement incomplete" with affected count/reasons;
multi-currency; deleted/unknown stable labels); and integrated memoization/performance hardening
with NO settlement cache. Mandatory coverage: a named E2E for EACH canonical example A–H (§7)
against the production settlement path — all eight individually required, no substitute — plus the
12-step end-to-end journey (§15.3) and the additional matrices (add row, imported edit, joint
ownership, multi-currency, historical Person, invalid warnings, collaboration, keyboard,
responsive/horizontal scroll, dark/reduced-motion, accessibility, console/network, retries-disabled
repeats), with a linked production benchmark (near-linear engine, <100ms interaction, preserved
virtualization, 100k). Binds the whole canonical source `specs/008-.../spec.md` SHA-256 `0d0e2a14…`;
P16E MUST consume the SOLE P16B engine `src/lib/domain/settlement.ts` and the P16A/P16C/P16D
contracts — no second/duplicate settlement engine, no settlement cache/persistence, and an EMPTY
diff over `supabase/migrations/**` and the `vault_ops`/P04/P05 boundary. Dispatched
`general-purpose` as `p16e-implementer-01` (role: human_scratch_implementer). Sole implementer
artifact `evidence/P16E/implementation-01.md` (uncommitted); future immutable review
`reviews/P16E-review-01.md`. P16E state `queued -> implementing`, revision 01. Rolling scratch SHA
unchanged `df8ad9ce…`; seventeen requirements `passed`; FS-001 immutable/open; no marker until
FS-001's completion is recorded after P16E PASS. On PASS: two-commit integration (A: reviewing->PASS
event + persist review; B: control setting P16E `passed`); then FS-001 completes by verifying the
canonical source remains byte-identical at `0d0e2a14…`, 715 lines / 25,441 bytes, recording
completion WITHOUT editing it (no scratch marker — FS-001 has no checkbox). Next after P16E PASS:
dispatch P10 (HS-003) and, once P16E passed, P17A becomes dispatchable.

### 2026-07-27 — P16E/01 ready_for_review handback verified; dispatched distinct reviewer

Implementer `p16e-implementer-01` messaged `ready_for_review` for P16E/01 at final HEAD
`be82ad0622086759365d38a74982f492d1d9fc59` (one product commit `be82ad0` — "feat(P16E): render
canonical settlement on the People page" — on top of root's docs-only dispatch commit `1712d29`;
review range `191d070..be82ad0`). Root independently verified handback integrity (verify-not-trust)
BEFORE accepting: (1) the product commit touches EXACTLY 12 authorized paths — `BalanceSummary.tsx`,
new `settlement-view.ts` and `settlement-allocations.ts`, `PeopleTable.tsx`, `people/index.ts`,
`people/README.md`, root `README.md`, the flagged `src/app/(app)/transactions/page.tsx` (the
HANDOFF-permitted minimal open+focus-source glue), and four test files — with ZERO forbidden writes
(no ledger/scratch/SCOPE/task/review/`.claude`/`.codex`); (2) EMPTY diff over
`supabase/migrations/**`, `src/server/routers/realtime.ts`, `src/lib/supabase/realtime.ts`,
`src/server/schemas/realtime.ts` and the entire P16D grid dir
`src/components/features/transactions/` (byte-identical — grid untouched), and no `vault_ops` change
in any product path; (3) the single-engine invariant holds — `calculateSettlementBalances` is
defined only in `src/lib/domain/settlement.ts`, re-exported once in `domain/index.ts`, and consumed
only by `BalanceSummary.tsx`; no competing engine, and a cache/persist grep for settlement returns
nothing; (4) `evidence/P16E/implementation-01.md` is present and UNCOMMITTED and no `reviews/P16E-*`
file exists yet. P16E state `implementing -> reviewing`, rev 01; evidence path frozen.

A DISTINCT reviewer `p16e-reviewer-01` (role human_scratch_reviewer; NOT the implementer) was
dispatched to reproduce and verify `191d070..be82ad0` against canonical §7 (named E2E per example
A–H), §12 (result model), §13 (People-page obligations/states/navigation), §14 (performance), §15.3
(E2E journeys) and §17 (DoD), re-running all gates independently with retries disabled and repeated.
The reviewer must adjudicate two implementer-flagged calls: **(A)** the benchmark shortfall
(measured ~0.8s for 100k, near-linear, reported as §14 measured-evidence-with-follow-up and
explicitly NOT claimed as passing the ~200ms target; residual cost attributed to P16B's
already-reviewed defensive materialization boundary) — rule on the merits whether this is §14's
legitimate branch or a genuine scope reduction, and if the latter, do NOT self-resolve but flag to
root for an INDEPENDENT scope adjudicator (standing rule; per `diagnose-overscoped-stalls`); **(B)**
whether the E2E console allowlist of local `sync.pushOps`/`Failed to fetch` transport noise masks
any real P16E-originated error; plus confirm the RED→GREEN corrections changed only tests/fixtures,
never the engine or UI. Rolling scratch SHA unchanged `df8ad9ce…`; seventeen requirements `passed`;
FS-001 immutable/open; no marker until FS-001 completion is recorded after P16E PASS. On PASS:
two-commit integration then FS-001 completion by canonical-source byte-identity (no marker). On
CHANGES_REQUESTED: persist failed artifacts, transcribe proposals, rescope HANDOFF to rev-02.

### 2026-07-27 — P16E/01 CHANGES_REQUESTED — failed review persisted; rescoping to rev-02

Distinct reviewer `p16e-reviewer-01` (role human_scratch_reviewer; NOT the implementer) returned
**VERDICT: CHANGES_REQUESTED** for P16E/01 over `191d070..be82ad0`. Review artifact
`reviews/P16E-review-01.md` is 402 lines / 29,016 bytes at SHA-256
`94e22dd1d69ddb8023b36a52e3dec4eb3221a603419c0ff8ae1cc0f5b5c765cc`. Root verified before accepting
(verify-not-trust): product HEAD is still `be82ad0` (only root ledger commits above it; no new
product commit → no escalation on that ground), and the review file's first line is
`VERDICT: CHANGES_REQUESTED`.

**Blocking finding F-1 (root-confirmed in the code, not taken on trust):** in the flagged
`src/app/(app)/transactions/page.tsx`, `selectedTransactionIds` (lines 239-245) unconditionally
`explicit.add(requestedTransactionId)` on every render whenever `?transaction=` is in the URL; the
param is never cleared and the set is not backed by `selectedIds`. This is the exact set every bulk
handler iterates (`handleBulkDelete` 431-447, bulk tag/status/account/notes/amount 449-548,
row-delete 748), so a deep-linked row cannot be deselected and is destroyed by a subsequent bulk
delete. Reviewer reproduced end to end at `be82ad0` (deselect silently fails → "2 selected" when one
was chosen → confirm deletes both, `t1StillPresent: 0`); the control with no param deselects
normally, proving it is P16E-introduced, not pre-existing. No existing test catches it: every P16E
selection assertion checks the target IS selected, none asserts it can be DESELECTED, and none
combines a deep link with a bulk action.

**Adjudication of the two implementer-flagged calls (both ACCEPTABLE on the merits; NEITHER a scope
reduction, so NO independent scope adjudicator is triggered):**

- **(A) Benchmark shortfall (Q-PROPOSAL-P16E-01-001):** ruled within §14 / the P16B benchmark
  clause's explicit disjunction — "meet ~200ms OR provide measured evidence + documented
  optimization follow-up without claiming the target passed". All three conditions hold, each
  re-established by the reviewer: it independently measured 0.93-1.10s (worse than the implementer's
  reported 0.76-0.86s — no flattering number), the target is explicitly NOT claimed as passing, and
  §14 near-linearity holds (~10-11x wall for 10x input) with exact correctness output. Residual cost
  is in P16B's `snapshotMaterialized*` defensive boundary, which is byte-unchanged in this range
  (`src/lib/**` = 0 files) and was required by a prior immutable P16B/05 FAIL for invalid-data
  honesty. Committed scope always included this branch, so this is NOT a reduction or supersession
  of the 200ms target. Transcribed as **Q-033**; **R-020** stays open with the production follow-up
  (carried to P21).
- **(B) E2E console allowlist:** ruled non-masking. The four allowlisted literals are exact strings
  from `vault-provider.tsx:203` / `manager.ts:888` plus two browser transport strings with no
  product source; `grep -rn "console\." src/components/features/people/` returns nothing, so no
  People/settlement code can emit a console error to be hidden. The assertion stays meaningful
  (`toEqual([])`; React/hydration/render errors and ≥500 responses still fail). Reviewer
  corroborated live: 0 console errors, 0 failed requests with no allowlist applied at all.
- Reviewer also confirmed structurally that the RED→GREEN "engine-right/fixture-wrong" corrections
  touched ONLY `tests/` (`src/lib/**` and the grid dir have 0 changed files), so no engine/UI was
  altered to make a wrong result look right.

**Everything else PASSED, each established independently by the reviewer:** boundaries empty
(migrations/realtime/`vault_ops` = 0 bytes; P16D grid dir byte-identical by blob hash; `src/lib/**`
= 0 changed); single engine (`calculateSettlementBalances` defined once, sole consumer
`BalanceSummary.tsx` + `domain/index.ts` re-export; no cache/persistence; `balance.ts` has no
settlement logic); gates re-run (typecheck clean; lint 0 errors; `pnpm test` 1735 passed / 2
skipped; `people-settlement --repeat-each=2 --retries=0` 32/32 zero flaky; full E2E 140/140 zero
flaky, no P16D grid/keyboard/selection regression; `format:check` fails only on 15 untouched
`specs/**` files); §13 has no type-graph path capable of a cross-currency total; distinct states
(invalid data reads "Settlement incomplete", never settled); all eight Examples A-H present as named
E2E tests against the production path plus the 12-step journey and the
`-101`/`101`-preserved-not-clamped matrices; secret-safety clean (opaque UUID deep link, no
plaintext in 76 request URLs, recovery phrase never revealed). **Non-blocking note:**
`people/README.md:56` claims filters are cleared when the source is filtered out — no such code
exists (reachability comes from filters being component state that resets on route change);
behaviour is correct, the sentence is inaccurate. rev-02 will correct it alongside F-1.

**Control:** P16E `reviewing -> changes_requested`, revision stays 01. Immutable failure artifacts
(`reviews/P16E-review-01.md` + frozen `evidence/P16E/implementation-01.md`) and this ledger update
are persisted in this integration-persistence commit. Rolling scratch SHA unchanged `df8ad9ce…`;
seventeen requirements `passed`; FS-001 immutable/open; no scratch marker (FAIL grants none). rev-02
dispatch and the `changes_requested -> implementing` event follow in the next control commit.

### 2026-07-27 — P16E/02 `changes_requested -> implementing` (F-1 remediation dispatch)

Root dispatched **P16E / 02** to a fresh implementer `p16e-implementer-02` (NOT the reviewer, NOT
`p16e-implementer-01`) to remediate the single blocking finding F-1. Original BASE remains
`191d0707f5e6dbfa5871dbddaa7318b9a14885dd`; pre-implementation HEAD is
`839665d8bfb124da633a7d62dd711b569c4b3af4` — product/test state there equals the rev-01 product HEAD
`be82ad0`, the commits above it being root ledger-only (the rev-01 CHANGES_REQUESTED integration
`839665d`). Root will review `191d070..<handback HEAD>`.

HANDOFF locks the change to F-1 ONLY plus the non-blocking `people/README.md:56` wording. The fix
converts the `?transaction=` deep link from a permanent selection force (current `page.tsx:239-245`
re-adds the param id into `selectedTransactionIds` on every render) into a ONE-SHOT navigation
intent: on arrival reveal/focus the row and seed it into the REAL `selectedIds` once, then
`router.replace` away the param so subsequent renders derive selection only from real state — making
the deep-linked row deselectable and keeping every bulk handler on the user's real selection, while
preserving the canonical §13 reveal/landing and stable-ID source navigation. Required regression
tests: deselection flips `aria-selected true->false`; the data-loss path (deep-link t1, deselect,
select t2, bulk delete → t2 gone, t1 PRESERVED); and an assertion that arrival still starts the row
selected AND revealed. Allowed paths: `src/app/(app)/transactions/page.tsx`,
`src/components/features/people/README.md`, `tests/**` — nothing else; EMPTY diff required over the
settlement engine/`src/lib/**`, the People settlement view/model/summary
(`settlement-view.ts`/`settlement-allocations.ts`/`BalanceSummary.tsx`), the P16D grid dir
`src/components/features/transactions/` (byte-identical), `supabase/migrations/**`, realtime and any
`vault_ops`; single-engine invariant and no-cache preserved. Evidence
`evidence/P16E/implementation-02.md` (uncommitted); future immutable review
`reviews/P16E-review-02.md`. P16E `changes_requested -> implementing`, revision 02. Rolling scratch
SHA unchanged `df8ad9ce…`; seventeen requirements `passed`; FS-001 immutable/open; no scratch marker
(FS-001 completes only after P16E PASS, by canonical byte-identity).

### 2026-07-27 — P16E/02 `ready_for_review -> reviewing` (F-1 fix handback verified; distinct reviewer dispatched)

Implementer `p16e-implementer-02` messaged `ready_for_review` for P16E/02 at HEAD
`bb12e0c86e0a42ec682ab7a67df5b1a355084559` (one product commit `bb12e0c` — "fix(P16E): make the View
transaction deep link a one-shot navigation intent" — on top of the root ledger commits above the
rev-01 product `be82ad0`). Cumulative review range `191d070..bb12e0c`. Root independently verified
handback integrity BEFORE accepting (verify-not-trust):

1. **Delta scope:** `git diff --name-status d79a630..bb12e0c` = EXACTLY the three authorized paths —
   `src/app/(app)/transactions/page.tsx`, `src/components/features/people/README.md`,
   `tests/e2e/people-settlement.spec.ts` — in one commit; zero forbidden writes.
2. **Boundaries EMPTY over `191d070..bb12e0c`:** `src/lib/**` (settlement engine untouched), the
   P16D grid dir `src/components/features/transactions/` (byte-identical), `supabase/migrations/**`,
   the three realtime paths, and any `vault_ops` — all confirmed empty. No migration, no cache.
3. **F-1 root cause removed:** `selectedTransactionIds` is now the param-free BASE form
   `new Set([...selectedIds].filter(id => displayedTransactionIds.has(id)))` — no
   `requestedTransactionId` term. The deep link is consumed once by a render-phase guard
   `landedSourceId` (seeds real `selectedIds`
    - triggers reveal) then cleared by an effect
      `router.replace("/transactions", { scroll: false })`. Rev-01's
      `focusedSourceIndex`/`revealedIdRef`/`effectiveDisplayCount` are gone; the P16E footprint in
      this file shrank versus rev-01.
4. **Single-engine invariant intact:** `calculateSettlementBalances` defined only in
   `src/lib/domain/settlement.ts`, consumed only by `BalanceSummary.tsx` (+ `domain/index.ts`
   re-export).
5. **Coverage:** two new F-1 E2E tests present ("deep-linked row lands selected and revealed, and
   can then be deselected"; "a bulk delete after deselecting the deep-linked row preserves it").
   Evidence `evidence/P16E/implementation-02.md` uncommitted; no `reviews/P16E-review-02.md` yet.

P16E state `implementing -> reviewing`, rev 02; evidence path frozen. A DISTINCT reviewer
`p16e-reviewer-02` (role human_scratch_reviewer; NOT `p16e-implementer-02`, NOT the rev-01 reviewer
`p16e-reviewer-01`) was dispatched to reproduce `191d070..bb12e0c`: verify the delta scope and empty
boundaries, reproduce the F-1 fix in-app (deep-linked row lands selected+revealed, param clears, row
is deselectable, and a post-deselect bulk delete preserves it), verify the one-shot render-phase
mechanism is loop-free/idempotent/flicker-free, confirm NO regression of rev-01's passing §7
Examples A–H / §12 / §13 / §14 / §15.3 acceptance, and re-run all gates with retries disabled and
repeated. The rev-01 adjudications A (benchmark, Q-033, R-020 open) and B (console allowlist) are
SETTLED and not re-litigated since rev-02 changed no engine code. On PASS: two-commit integration
then FS-001 completion by canonical byte-identity (no marker). On CHANGES_REQUESTED: persist failed
artifacts, transcribe proposals, rescope to rev-03. Rolling scratch SHA unchanged `df8ad9ce…`;
seventeen requirements `passed`; FS-001 immutable/open; no marker.

### 2026-07-27 — P16E/02 `reviewing -> reviewing` (independent PASS recommendation)

Distinct reviewer `p16e-reviewer-02` returned **VERDICT: PASS**, 0 blocking findings, over
`191d070..bb12e0c`. Review artifact `reviews/P16E-review-02.md` is 300 lines / 19,411 bytes at
SHA-256 `c952838f2182bf18be0c3fc27d7a16d52d734024af58ac1f64b7dcd919bc028f`. Root verified before
accepting (verify-not-trust): product HEAD is still `bb12e0c` (only a root ledger commit above it;
`bb12e0c..HEAD` product/test diff empty), and the review's first line is `VERDICT: PASS`.

The reviewer reproduced the F-1 fix in the REAL app via the canonical §13 "View transaction" link
(not only via tests): the deep-linked row lands selected + highlighted + in viewport with exactly 1
selected; the URL is already reduced to `/transactions` on arrival (one-shot); deselection sticks
across forced re-renders (scroll + resize); and the data-loss path is CLOSED — after deselecting the
deep-linked row and selecting a different one, bulk delete + confirm yields
`{t1Present: 1, t2Present: 0}` (rev-01 destroyed both). Beyond the four required behaviours the
reviewer independently established: no render/replace loop (13 URL samples, `history.length` +1), no
first-paint flicker (a MutationObserver recorded a single `aria-selected` entry `init:…:true`),
correct cold async-vault landing, unknown-ID no-op without looping, repeatable revisits, and
provable guard termination; `focusedSourceIndex`/`revealedIdRef`/`effectiveDisplayCount` removed and
`selectedTransactionIds`/`displayedTransactions`/`hasMore` byte-identical to BASE. Delta = exactly
the 3 authorized paths; boundaries all EMPTY over the range (`src/lib/**` 0, P16D grid 0 bytes,
`supabase/**` 0, realtime 0, `vault_ops` 0); single engine, no cache, no cross-currency-total field;
frozen spec SHA/715/25441 match. Gates re-run independently: typecheck clean, lint 0 errors,
`format:check` fails only on the 15 untouched `specs/**` files, unit 1735 passed / 2 skipped, full
E2E 142/142 at retries=0, `people-settlement --repeat-each=3 --retries=0` 54/54 zero flaky, local
Supabase healthy. RED reproduced by the reviewer (revert product only → both new tests fail on the
real defect); GREEN corrections tests-only
(`git diff --name-only d79a630 bb12e0c -- src/lib/ src/components/features/transactions/` = 0).
Adjudications A (benchmark, Q-033, R-020 open) and B (console allowlist) not re-opened — rev-02
touched no engine code.

No new Q proposals. Rev-01's `Q-PROPOSAL-P16E-01-001` (100k/200ms measured follow-up) was ALREADY
transcribed by root as **Q-033** in the rev-01 FAIL integration `839665d`, with R-020 kept open —
nothing further owed there. One NON-BLOCKING reviewer observation, explicitly NOT a P16E finding:
the row checkbox's accessible name degrades to `"Select transaction "` when a row description is
empty (`TransactionRow.tsx:274`, P16D-owned and byte-unchanged across this range; the control stays
discoverable/focusable/keyboard-operable by role). Routed to P21 as **R-034**. Root acceptance and
the `reviewing -> passed` control + FS-001 completion follow in the next control commit. Rolling
scratch SHA unchanged `df8ad9ce…`; seventeen requirements `passed`; FS-001 immutable/open.

### 2026-07-27 — P16E/02 reviewing -> passed; FS-001 completed (control commit)

Control commit (Commit B) of the two-commit PASS integration; Commit A was `b0023f6` (persisted the
immutable rev-02 PASS review `reviews/P16E-review-02.md`, the evidence
`evidence/P16E/implementation-02.md`, the PASS recommendation event, and R-034). Preconditions
re-verified at `b0023f6` immediately before this commit: product tree untouched (only the benign
untracked `evidence/P08/implementation-01.md`), P16E review first line `VERDICT: PASS`, P16A-P16D
all `passed`, canonical FS-001 source byte-identical (`0d0e2a14…` / 715 / 25,441), canary == 1.

This commit: (1) P16E package row `reviewing -> passed`, integration `PASS; A `b0023f6`; B control`;
(2) **FS-001 completed** — requirement row `queued -> passed`. FS-001 is the immutable whole-file
feature spec and is markerless (no scratch checkbox), so completion is recorded purely by ledger
after all five mapped packages (P16A `41f5760f…`, P16B `136678a0…`, P16C `e0f06f7f…`, P16D
`47867d50…`, P16E) passed independent review, and by verifying the canonical source
`specs/008-transaction-percentage-allocations-settlement/spec.md` is byte-identical at SHA-256
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes —
WITHOUT editing it. No scratch marker applied; rolling scratch SHA `df8ad9ce…` unchanged. Eighteen
of twenty-two requirements now `passed` (HS-003, HS-007, HS-016, HS-021 remain). Reviewer-liveness
cron `deac2fb8` to be deleted. Next: recompute the dispatchable set and dispatch the next package
serially (P17A dispatchable; P10/HS-003 co-dispatchable).

### 2026-07-27 — P17A/01 queued -> implementing (serial dispatch after FS-001)

FS-001 completed at `a09c4b4`; no package was active, so the serial loop advances. Dispatchable set
recomputed = {P10 (deps P05,P08 passed), P17A (deps P11C,P14,P16E passed)}; every other queued
package is dependency-blocked. Chose **P17A** — head of the critical path
P17A->P17B->P17C->P17D->P20A->P20B->P21 and the most complex (FS-001-dependent automation engine),
best de-risked first; P10 (HS-003, a leaf needed only before P21) follows. PROCESS is serial (§72
'set exactly one package to implementing', one HANDOFF), so only P17A is dispatched now.

Frozen-source integrity (PROCESS step 2) re-run and PASSED: (1) scratch whole-file
`sha256sum specs/human-scratch.md` == rolling
`df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (§242 — actual==rolling is the
live check; the header's `b91ca932…` is the file's immutable ORIGINAL identity, from which it
legitimately diverged only via 17 authorized HS markers; no marker applied this turn so the
normalized-block state that produced the rolling SHA is unchanged — NOT drift); (2) canonical 008
spec `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes
byte-exact. BASE captured `a09c4b4`; only dirty path the benign untracked
`evidence/P08/implementation-01.md`. P17A row -> `implementing` rev 01, evidence
`evidence/P17A/implementation-01.md`. HANDOFF rewrite + `p17a-implementer-01` dispatch + liveness
cron follow.

### 2026-07-27 — P17A/01 scope-checkpoint handback, git recovery, scope ruling, continuation

`p17a-implementer-01` (synchronous subagent) returned final product HEAD `02512cf` reporting a
tested pure engine core but four open scope Q-proposals (defaults/vault wiring, import wiring,
alias-write ownership, migration semantics) it could not resolve without write paths it lacked. It
also flagged that HANDOFF.md on disk showed the OLD P16E review, not the P17A brief.

**Git recovery (root):** the subagent had created branch `p17a-implementer-01` FROM the pre-control
BASE `a09c4b4` (not from main `8d268eb`), which reverted the shared working tree to a09c4b4's
HANDOFF (the P16E version) — that is why it read a stale brief. Root's ledger work was never lost:
`main` stayed at `8d268eb`. Root returned to `main`, cherry-picked the product commit `02512cf` onto
the control commit `8d268eb`, yielding integrated product HEAD `21507dc` (topology a09c4b4 ->
8d268eb control -> 21507dc product, matching the established interleaved model), and deleted the
stray branch. Integrity verified at `21507dc`: product delta = exactly the 9 files
(`src/lib/crdt/schema.ts`; `src/lib/domain/automation/{rules,migration,apply,preferences}.ts`; four
test files); settlement.ts blob `010f3c93…` byte-identical to BASE; `supabase/migrations/**`=0,
realtime=0, all P17B/C/D UI (`src/components/features/automations/**`)=0,
`src/lib/crdt/defaults.ts`=0 (deferred as reported); no secret material. schema.ts:416-421
self-documents the un-wired root keys — corroborated.

**Process note (resolved, no scope impact):** the rev-01 stale-HANDOFF was caused by instructing the
implementer to 'branch from BASE' combined with a synchronous shared worktree. Fix for the
continuation and future dispatches: implementer commits on top of the CURRENT HEAD and never checks
out a BASE sha; BASE is only the review-range start.

**Scope ruling:** rev-01 delivered LESS than P17A's committed acceptance (engine unreachable: no
vault root collections, no import/hydration invocation). Completing the wiring restores committed
scope and is NOT a reduction/supersession, so the independent scope adjudicator is not triggered
(that gate is for reductions — the conflict-of-interest direction). Transcribed the four proposals
as **Q-034** (vault root wiring — in scope), **Q-035** (apply-at-import + migrate-at-hydration — in
scope), **Q-036** (alias-rule write reuses P11 additively — in scope), **Q-037** (contains->exact
tightening + lossless retained skip taxonomy — accepted, human confirms post-completion). Allowed
paths widened for the rev-01 continuation to `src/lib/crdt/**` (incl. defaults.ts,
description-aliases.ts additively) + `src/hooks/use-import-state.ts` + the import-commit/hydration
seam; additive only; P16C `replaceTransactionAllocations` and settlement stay byte-identical;
P17B/C/D UI stays out. P17A row HEAD -> `a09c4b4..21507dc`, status remains `implementing` rev 01
(review runs on the complete deliverable). Rolling scratch SHA `df8ad9ce…` unchanged; eighteen
requirements `passed`.

### 2026-07-27 — P17A/01 continuation handback verified; production-import scope routed to adjudicator

`p17a-implementer-01b` (fresh continuation) returned final product HEAD
`235ea31cc125006948887b083e4663fabf397606`, committed on top of control `0027e93` (topology 21507dc
-> 0027e93 control -> 235ea31 product; interleaved model preserved; implementer respected the
no-checkout discipline — HEAD chain is linear, no stray branch). **Integrity (verify-not-trust, all
via git, not the implementer's word):** committed delta `0027e93..235ea31` = exactly 9 files —
`src/lib/crdt/{schema.ts,defaults.ts,mirror.ts,index.ts,field-rules.ts(new,373L)}`,
`src/lib/domain/automation/rules.ts`, `tests/integration/field-rules-crdt.test.ts(new)`,
`tests/unit/crdt/defaults.test.ts`, `tests/unit/domain/automation/rules.test.ts` — every path inside
the widened allowed set. `settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43` and P16C
`mutations.ts` blob `118e994af45b4b531bebd4bf1ed0a4a861a6b6f0` byte-IDENTICAL at BASE `a09c4b4` and
HEAD. `supabase/migrations/**`, `src/components/features/automations/**`, `AutomationDropdown.tsx`,
the three realtime files, `src/lib/crdt/description-aliases.ts` (P11 reused additively via its
exported `assignDescriptionAlias`, file itself untouched), and both frozen specs = byte-EMPTY in the
delta. Secret scan of the diff = clean. Implementer-reported gates (to be re-verified independently
at review, NOT trusted now): typecheck PASS, lint 0 errors (10 pre-existing warnings), format:check
fails only on 15 pre-existing `specs/**` docs, `pnpm test` 1801 passed/2 skipped/89 files,
`pnpm test:e2e` 142 passed. next-env.d.ts modified-but-uncommitted = benign Next dev artifact.

**Scope question — NOT self-adjudicated.** The engine + migration are reachable (hydration path,
guarded, side-effect-free on clean vaults) and application exists as a library + bulk ops, but
application is NOT invoked at the PRODUCTION import commit (`src/app/(app)/imports/new/page.tsx`
`createImportBatch`). Root confirmed both stated blockers by inspection: that seam is a UI page
outside P17A's no-UI boundary, and `ApplicationVaultState = Omit<VaultState,"descriptionAliases">`
(`src/lib/crdt/context.tsx:182`) structurally forbids the P11 alias write through the application
mutate context; `field-rules.ts` apply is invoked nowhere under
`src/app/**`/`src/hooks/**`/`src/components/**`. Deferring "apply at production import" to a later
package would REDUCE P17A's committed scope — a reduction/supersession root is barred from ruling
on. Dispatched a DISTINCT fresh-context opus-tier **adjudicator** (`ad004bb8…`), READ-ONLY (no tree
mutation), to rule IN_P17A vs LATER_PACKAGE strictly from `specs/human-scratch.md:248-295` + the
P17A-D task/row split, defaulting to the block standing on any ambiguity. Recorded **Q-038**
(production-import invocation scope — awaiting adjudicator) and **Q-039** (manual-row projection
`descriptionText = tx.description||null`, `isManual = tx.importId==null` vs
human-scratch.md:269,294-295 — implementer's reversible default stands, human confirms). P17A stays
`implementing` rev 01 pending the ruling; rev unchanged (no review has run). Rolling scratch SHA
`df8ad9ce…` unchanged; eighteen requirements `passed`.

### 2026-07-27 — Adjudicator ruled Q-038 IN_P17A; dispatching production-import continuation

The independent, fresh-context, opus-tier scope adjudicator (`ad004bb8…`, read-only — no tree
mutation) returned **VERDICT: IN_P17A**, CONFIDENCE **high**. It independently verified the
structural facts (`applyFieldRulesToImport` at `field-rules.ts:226`, barrel-exported, invoked at
zero call-sites under `src/app`/`src/hooks`/`src/components`; `createImportBatch` at
`src/app/(app)/imports/new/page.tsx:140-275` inserts transactions with no rule application;
migration IS wired at hydration `mirror.ts:178`; `ApplicationVaultState` omit confirmed at
`context.tsx:182,590-596`) and ruled from frozen text: `human-scratch.md:~272` ("will run for newly
imported transactions"), `:~287` ("apply to new imports"); the P17A task line "Apply the highest
rule deterministically **at import**"; the P17A-specific "Integration for import application" test
requirement; the "P17A may write allocations only through P16C" constraint (meaningful only if P17A
applies allocation rules at import); and PROGRESS P17A row "import engine". It distinguished P17B
(editor), P17C (post-alias inline UI), P17D (bulk/new apply + polish) as NOT owning the base import
seam, and noted the block-standing default would compel the same result even under ambiguity. It
further ruled resolving the `ApplicationVaultState` alias-write barrier is inside P17A — route
description-rule alias writes through the existing P11 path (`assignDescriptionAlias`) from the
import action, or make a minimal additive context seam.

**Q-038 resolved IN_P17A.** This is scope COMPLETION, not reduction, so no further adjudication and
P17A does NOT advance to review yet. Rewrote HANDOFF for `p17a-implementer-01c` with the minimal
widened path set: the single import call-site `src/app/(app)/imports/new/page.tsx` (call-site ONLY,
no automation UI) plus additive `src/lib/crdt/**` (incl. a minimal additive `context.tsx` seam only
if no existing alias path is reachable, recorded as a Q). It must invoke `applyFieldRulesToImport`
at `createImportBatch`, resolve the alias-write barrier by reusing P11, keep allocations on P16C,
preserve all P14 import behavior, and prove it with an E2E where a real import applies a matching
rule. Settlement/P16C/automation-UI/realtime/migrations/frozen sources stay byte-untouched. P17A
stays `implementing` rev 01. Rolling scratch SHA `df8ad9ce…` unchanged; eighteen requirements
`passed`.

### 2026-07-27 — P17A/01 complete deliverable verified; -> ready_for_review, dispatching reviewer

`p17a-implementer-01c` returned final product HEAD `ee83b1b77409cbef2d873edf30bb810a6de99a58`
(linear on control `d52a269`; no branch/checkout of refs — only a file-level restore of the
auto-generated `next-env.d.ts`). Root verify-not-trust (all via git, not the implementer's word):

- Committed delta `d52a269..ee83b1b` = exactly 5 files: `src/lib/crdt/import-commit.ts` (new, pure
  `commitImportBatch` over full `VaultState`), `src/lib/crdt/context.tsx` (+`useCommitImportBatch`,
  an additive named internal action via the pre-existing `useInternalVaultAction`, origin `import`),
  `src/lib/crdt/index.ts` (re-exports), `src/app/(app)/imports/new/page.tsx` (swapped the inline
  `createImportBatch` for `useCommitImportBatch`; NO automation UI added),
  `tests/integration/import-commit-field-rules.test.ts` (new). Every path within the widened allowed
  set.
- `settlement.ts` `010f3c93…` and P16C `mutations.ts` `118e994a…` byte-IDENTICAL at `a09c4b4` and
  `ee83b1b`. `ApplicationVaultState = Omit<VaultState,"descriptionAliases">` still present
  (`context.tsx:184`, shifted +2 by additive code) — projection NOT weakened; the barrier was solved
  by a full-`VaultState` internal action, and the swap actually removed the page's prior
  `as unknown as …` cast.
- Boundaries byte-EMPTY across the full `a09c4b4..ee83b1b` range: all automation UI
  (`components/features/automations/**`, `AutomationDropdown.tsx`), the three realtime files,
  `supabase/migrations/**`, `src/lib/crdt/description-aliases.ts` (P11 reused via its exported
  `assignDescriptionAlias`, file untouched), and both frozen specs.
- Alias writes route through P11 `assignDescriptionAlias`; allocations exclusively through P16C
  `replaceTransactionAllocations` inside `applyFieldRulesToImport`; `import-commit.ts` writes no
  allocation key or alias record directly (confirmed by reading the file). Zero `as`/`any`/`!` in
  added product code. Secret scan of the full range = clean. Integration test present with real
  assertions and `applyFieldRulesToImport(state,…)` invoked from the seam.
- Implementer-reported gates (to be RE-RUN independently by the reviewer, not trusted here):
  typecheck PASS; lint 0 errors; format:check only pre-existing `specs/**`; `pnpm test` 1807
  passed/2 skipped/90 files; `pnpm test:e2e` 142 passed.

Q-038 (IN_P17A) is now satisfied by product. P17A row -> `ready_for_review`, HEAD
`a09c4b4..ee83b1b`. Dispatching a DISTINCT reviewer `p17a-reviewer-01` (fresh context, never an
implementer of this package) to independently run every gate and critically review the code; root
ledger commits interleaved in the range — reviewer ignores them. P17A stays rev 01 (first review).
Rolling scratch SHA `df8ad9ce…` unchanged; eighteen requirements `passed`.

### 2026-07-27 — P17A/01 REVIEW PASS (integration Commit A: persist review + evidence)

Distinct independent reviewer `p17a-reviewer-01` (fresh context, not any implementer) returned
**VERDICT: PASS**, zero blocking findings, over product delta `21507dc`/`235ea31`/`ee83b1b` (docs
commits ignored). It RE-RAN every gate itself: typecheck PASS (clean); lint 0 errors (10
pre-existing warnings, none in P17A files); format:check fails only on 15 pre-existing `specs/**`
docs (no `.ts`/`.tsx` in the delta); `pnpm test` 1807 passed/2 skipped/90 files; `pnpm test:e2e` 142
passed exit 0 (Supabase container present). It verified against frozen text (not the evidence):
production import genuinely wired (`page.tsx` -> `useCommitImportBatch` -> `commitImportBatch` ->
`applyFieldRulesToImport`, P14 nesting/counts preserved, old `as unknown` casts removed);
precedence + order-independence (500-run shuffle property test), strict date boundary no off-by-one;
manual gating `importId==null` matching `:269,294-295`; allocations only via P16C with invalid
complete-set rejected at decode -> zero mutation and `mutations.ts`+`settlement.ts` byte-identical
to BASE; aliases via existing P11 `assignDescriptionAlias` with back-map asserted and
`description-aliases.ts` byte-empty; migration once/idempotent/side-effect-free on clean vaults with
no data loss and `supabase/migrations/**` empty; root-key wiring with `ApplicationVaultState`
projection not weakened; no `as`/`any`/`!` in product delta; no automation UI. All boundaries
byte-empty; secret scan clean (only a `seedLegacyVault` test helper + fast-check `SHUFFLE_SEED`,
synthetic vectors). Non-blocking (do not gate): test-fixture casts follow the established pre-P17A
repo convention (product code cast-free); Q-039 manual-description-source human confirm stays open
per the question; the migration-version constant is kept in sync manually. This Commit A persists
`reviews/P17A-review-01.md` + `evidence/P17A/implementation-01.md` and moves P17A row
`ready_for_review -> reviewing`; Commit B flips it to `passed`. Rolling scratch SHA `df8ad9ce…`
unchanged; eighteen requirements `passed` (HS-007 stays UNCHECKED — it needs P17B-D too, so P17A
passing applies NO scratch marker).

### 2026-07-27 — P17A/01 integration Commit B: row -> passed (HS-007 markerless)

Control flip: P17A `reviewing -> passed`, integration-commit `PASS; A `81401bf`; B row -> passed`.
HS-007 is a multi-package requirement (P17A-D); P17A passing completes the engine +
import-application slice but NOT the requirement, so per the markerless rule for mid-requirement
packages, NO scratch marker is applied and the rolling scratch SHA stays
`df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (verified actual==rolling,
unchanged). The HS-007 requirement row stays UNCHECKED. Package tally: P00-P16E plus P17A = nineteen
packages `passed`; remaining P17B, P17C, P17D, P10, P20A, P20B, P21. Requirement tally unchanged at
eighteen `passed` (HS-003, HS-007, HS-016, HS-021 still open). Serial loop: recomputed dispatchable
= {P17B, P10}; choosing P17B next to keep the HS-007 critical path moving with P17A context fresh.
P10 (HS-003, a P21 pre-req leaf) follows.

### 2026-07-27 — P17B/01 dispatch (HS-007 shared rule editor + automations-page UX)

P17A passed at `ee83b1b` (integration `81401bf`/`5e2ddd0`); serial loop advanced. Frozen-source
integrity re-run and PASSED: scratch `sha256sum specs/human-scratch.md` == rolling
`df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (actual==rolling; no marker this
turn — P17A was a mid-HS-007 package); 008 canonical
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes
byte-exact. Dispatchable set after P17A = {P17B (deps P17A,P02 both passed), P10 (deps P05,P08 both
passed)}; chose **P17B** (head of remaining HS-007 chain, P17A context fresh). PROCESS is serial
(one package `implementing`), so only P17B dispatched.

**Scope note (no adjudicator — expansion, not reduction):** confirmed by inspection that P17A
exports only field-rule read/apply/migration + pure preference transforms (`readActiveFieldRules`,
`applyFieldRules*`, `migrateVaultAutomationsToFieldRules`, `nextUserPreference`) and NO
rule-CRUD/preference WRITE vault action. User-driven rule create/edit/delete is inherently the
editor's function, so P17B additively owns the thin field-rule CRUD + remembered-preference
persistence vault actions (new/additive `src/lib/crdt/**`, reusing P17A
`fieldRuleSchema`/validation). This requires MORE work to complete P17B's committed editor scope —
not a reduction of any package — so the independent scope adjudicator is not triggered, and
passed-P17A is neither reopened nor edited. P17B BASE `5e2ddd0`; row -> `implementing` rev 01,
evidence `evidence/P17B/implementation-01.md`. HANDOFF rewrite + `p17b-implementer-01` dispatch
follow. Rolling scratch SHA `df8ad9ce…` unchanged; eighteen requirements `passed`.

### 2026-07-27 — P17B/01 IMPLEMENT complete + verified + REVIEW dispatch (HS-007 shared rule editor)

`p17b-implementer-01` delivered the shared field-rule editor and reworked automations page at HEAD
`2577c15`, then (after a root-required in-place fix) at final HEAD `f0d3a37`. Root verify-not-trust
against git: product delta `5e2ddd0..f0d3a37` = 13 files, ALL within allowed paths
(`src/app/(app)/automations/page.tsx`;
`src/components/features/automations/{FieldRuleEditor,FieldRulesManager,rule-editor-model,index}`;
additive `src/lib/crdt/{field-rule-mutations,context,index}`; 5 test files). One shared accessible
`FieldRuleEditor` genuinely reused (single component, surface-agnostic seams for the P17C popup);
`FieldRulesManager` drives create/update/delete + apply-all/apply-new via new additive hooks.
Apply-all/apply-new route ONLY through the P17A engine (`useApplyFieldRules` ->
`applyFieldRulesToAllTransactions`/`applyFieldRulesToNewerTransactions`); CRUD mutations encode rule
records and never write transactions/allocations/aliases directly; allocations stay P16C-only. Hard
boundaries byte-EMPTY (settlement.ts, P16C `mutations.ts`, `field-rules.ts`, `import-commit.ts`,
automation `{rules,apply,migration}.ts`, `defaults.ts`/`schema.ts`, both frozen specs, realtime,
`supabase/migrations/**`, all control docs). Frozen blobs byte-identical: settlement
`010f3c93582a2ce311594d4dde8464760ca49c43`, P16C `mutations.ts`
`118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`.

**One defect found and fixed pre-review (NOT a scope reduction — completing committed scope, no
adjudicator):** `FieldRuleEditor.tsx:135` used a forbidden `value as RuleField` cast. Root bounced
it to the same implementer (context intact); fixed at `f0d3a37` by narrowing the shadcn Select's
`string` payload with an `isRuleField` type guard sourced from `FIELD_OPTIONS` (+9/-1, one file).
Re-verified: `as RuleField` gone; no `as`/`any`/non-null-`!` in any P17B-authored file (pre-existing
`context.tsx:818` `as unknown as Transaction` from `865a787` correctly left byte-identical, out of
P17B scope). No secret material in the delta. Implementer-reported gates (to be RE-RUN by the
reviewer): typecheck clean; lint 0 errors (11 pre-existing warnings in untouched
`tests/unit/crdt/transaction-*`); format:check clean on all 13 touched files (only pre-existing
`specs/**` docs fail); Vitest 1836 passed/2 skipped; Playwright 145 passed.

Two Q-proposals recorded in evidence (safest reversible defaults implemented, human confirms
post-completion): **Q-P17B-01** page-level apply-new reference date = today (routes through
`applyNewerThan`; import-time auto-application unaffected); **Q-P17B-02** the four-mode apply-select
is not persisted because the frozen P17A preference schema has no field for it (byte-empty) —
field/tag-mode/scopes persist, apply-mode defaults to updateNew per session. Row P17B ->
`ready_for_review` rev 01 range `5e2ddd0..f0d3a37`. HANDOFF rewritten as the P17B REVIEW dispatch; a
DISTINCT fresh-context `p17b-reviewer-01` (never the implementer) reviews product range
`5e2ddd0..f0d3a37`, re-running every gate itself and judging against frozen text. Rolling scratch
SHA `df8ad9ce…` unchanged; eighteen requirements `passed`; nineteen of twenty-two packages `passed`.

### 2026-07-27 — P17B/01 review PASS + integration Commit A (HS-007 shared rule editor)

Distinct fresh-context `p17b-reviewer-01` (independent of the implementer, read-only) returned
**VERDICT: PASS**, 0 blocking findings, over product range `5e2ddd0..f0d3a37`. It RE-RAN every gate
itself: typecheck clean; lint exit 0 (0 errors, 11 warnings — 10 pre-existing untouched, 1 NEW
tolerated: unused `locationOf` at `tests/integration/field-rule-mutations.test.ts:24`); format:check
fails only on 15 pre-existing `specs/**`/control docs (no P17B `.ts`/`.tsx`); `pnpm test` 1836
passed/2 skipped/0 failed; `pnpm test:e2e` 145 passed/0 failed (changed `automations.spec.ts` run
12x at `--retries=0`, zero flakiness). It confirmed against FROZEN text (not the evidence):
boundaries byte-EMPTY; frozen blobs byte-identical (`settlement.ts` `010f3c93…`, P16C `mutations.ts`
`118e994a…`); apply routes ONLY through the P17A engine
(`useApplyFieldRules`->`applyFieldRulesTo{All,Newer}Transactions`) with new
`field-rule-mutations.ts` writing ONLY `state.fieldRules`+`state.userAutomationPreferences` (no
transaction/allocation/alias write); allocations P16C-only with invalid sets rejected at decode ->
zero mutation; ONE genuinely-reused accessible `FieldRuleEditor` (surface-agnostic seams for the
P17C popup) with uniqueness enforced on create AND update; no new `as`/`any`/`!` (the `:135` breach
is now an `isRuleField` guard; pre-existing `context.tsx:818`/`AutomationRow.tsx` casts untouched);
no secrets; tests honest with meaningful a11y/validation/zero-mutation assertions. Root re-verified
against git BEFORE trusting: HEAD `082fdc8` (product `f0d3a37`), scratch SHA `df8ad9ce…` unchanged,
canary 1, all boundary/blob facts reproduced.

**Confirmed unmet frozen requirement carried forward (NOT a P17B defect, NOT a scope reduction):**
frozen `human-scratch.md:270` requires remembering "the user's last choices for the select and check
boxes"; P17B persists the check boxes + field/tag-mode but NOT the four-mode apply SELECT, because
that needs an `applyMode` slot in the P17A `userAutomationPreferences` schema (`schema.ts`) — a P17B
hard boundary. Root re-read the frozen block and CONFIRMED the gap is real. Recorded as
**Q-P17B-03** (QUESTIONS.md), default owner **P17D** (additive schema extension + editor wiring;
P17C may subsume). HS-007 stays UNCHECKED until delivered and all P17A-D pass — so deferring it
costs nothing. **Minor lint nit carried to P17C:** the new unused `locationOf` helper — P17C's
implementer is CLAUDE.md-bound to clear the tree's lint warnings (and may complete the intended
apply-new date-boundary integration test the dead helper implies).

Commit A (integration-persistence) persists `reviews/P17B-review-01.md` +
`evidence/P17B/implementation-01.md` + this event + Q-P17B-03, and moves row P17B
`ready_for_review -> reviewing`. Commit B flips it to `passed`. Integration is MARKERLESS: HS-007
spans P17A-D, so P17B passing applies NO scratch marker and the rolling scratch SHA stays
`df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (actual==rolling, unchanged); the
HS-007 requirement row stays UNCHECKED.

### 2026-07-27 — P17B/01 PASS integrated (Commit B) + serial loop -> P17C (HS-007)

Control flip: P17B `reviewing -> passed`, integration-commit `PASS; A `cef9f2b`; B row -> passed`.
MARKERLESS: HS-007 spans P17A-D, so P17B passing completes the shared-editor/automations-page slice
but NOT the requirement — no scratch marker applied, rolling scratch SHA stays
`df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (verified actual==rolling),
HS-007 row stays UNCHECKED. Package tally: P00-P16E + P17A + P17B = TWENTY of twenty-two packages
`passed`; remaining P17C, P17D, P10, P20A, P20B, P21. Requirement tally unchanged at eighteen
`passed` (HS-003, HS-007, HS-016, HS-021 still open). Two tracked carry-forwards from P17B review:
Q-P17B-03 (apply-mode SELECT persistence, default owner P17D) and the stray `locationOf` lint
warning (P17C implementer clears it). Serial loop: recomputed dispatchable = {P17C (dep P17B
passed), P10 (deps P05,P08 passed)}; choosing **P17C** to keep the HS-007 critical path moving with
P17B context fresh (P17C->P17D remain before HS-007 can be checked). P10 (HS-003, a P21 pre-req
leaf) follows the P17 chain. PROCESS serial (one package `implementing`), so only P17C is dispatched
next.

### 2026-07-27 — P17C/01 dispatch (HS-007 description inline workflow)

P17B passed at `f0d3a37` (integration `cef9f2b`/`0d3de91`); serial loop advanced. Frozen-source
integrity re-run and PASSED: scratch `sha256sum specs/human-scratch.md` == rolling
`df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (actual==rolling; markerless
mid-HS-007); 008 canonical `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
lines, 25,441 bytes byte-exact. Dispatchable after P17B = {P17C (dep P17B passed), P10 (deps P05,P08
passed)}; chose **P17C** (head of remaining HS-007 chain, P17B context fresh). PROCESS serial (one
package `implementing`), so only P17C dispatched.

**Scope note (no adjudicator — additive UI wiring, not a reduction):** P17A already exports the
read-only matcher primitives P17C needs (`selectWinningRule`, `ruleMatchesSubject`, `ruleScopeRank`,
`isNewerTransactionDate`, `RuleMatchSubject` in `src/lib/domain/automation/rules.ts`;
`readActiveFieldRules`), and P17B exports the shared `FieldRuleEditor` + CRUD
(`useFieldRuleActions`) + apply hooks (`useApplyFieldRules`) + remembered-choice reads
(`useUserAutomationChoice`). P17C therefore REUSES all of these (byte-identical, call-not-edit) and
adds only: the per-row robot state + contextual popup UI (transactions feature), a NEW popup wrapper
mounting the existing editor (automations feature), and ONE thin ADDITIVE single-transaction-apply
vault action (new `src/lib/crdt/**` file + additive `context.tsx` hook) that routes through P17A
`applyFieldRulesToTransaction` and P16C `replaceTransactionAllocations` ONLY. This completes P17C's
committed scope (more work, additive) — not a reduction — so the independent scope adjudicator is
not triggered; passed P17A/P17B are neither reopened nor edited. HANDOFF rewritten as the P17C
IMPLEMENT dispatch; `p17c-implementer-01` dispatched on the no-checkout discipline (commit on
`0d3de91`). Two carry-forwards restated: Q-P17B-03 apply-mode SELECT persistence stays default-owned
by P17D (schema boundary, not P17C); the stray `locationOf` lint warning is cleared by P17C per
CLAUDE.md. Row P17C -> `implementing` rev 01, evidence `evidence/P17C/implementation-01.md`. Rolling
scratch SHA `df8ad9ce…` unchanged; eighteen requirements `passed`; twenty of twenty-two packages
`passed`.

### 2026-07-27 — P17C/01 IMPLEMENT complete + root verify PASS + REVIEW dispatch (HS-007 inline workflow)

`p17c-implementer-01` delivered the inline description-rule robot + contextual popup at final HEAD
`ce82cb5` (parent `6667159`, linear on `main`). Root verify-not-trust against git PASSED: product
delta `0d3de91..ce82cb5` = 18 files, ALL within allowed paths (NEW:
`src/lib/crdt/apply-field-rule-to-transaction.ts`;
`src/components/features/automations/rule-editor-data.ts`;
`src/components/features/transactions/{description-rule-state,use-transaction-rule-workflow,TransactionRulePopup,TransactionRuleRobot}`;
MOD additive: `context.tsx`, `index.ts`, `FieldRulesManager.tsx` (refactor extracting
`rule-editor-data.ts` for popup reuse), `TransactionRow.tsx`, `TransactionTable.tsx`,
`cells/InlineEditableDescriptionAlias.tsx`, `app/(app)/transactions/page.tsx`; 5 test files). The
popup mounts the P17B `FieldRuleEditor` UNCHANGED (`descriptionEditable=false`); robot
NORMAL/RED-drift/hidden computed via reused P17A `selectWinningRule`/`ruleMatchesSubject` on a
faithful `RuleMatchSubject` projection; edit/delete route through P17B `useFieldRuleActions`;
apply-all/apply-new through `useApplyFieldRules`; apply-to-this is ONE additive vault action
(`applyFieldRulesToSingleTransaction`) delegating wholesale to P17A `applyFieldRulesToTransaction`
so allocations stay P16C-only and aliases P11-only — zero direct allocation/alias/transaction
writes. Hard boundaries byte-EMPTY; frozen blobs byte-identical (settlement
`010f3c93582a2ce311594d4dde8464760ca49c43`, P16C `mutations.ts`
`118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`, P17A `field-rules.ts`
`4656c3c55515267d9050b718d0556a0fbfee7ed2`, P17B `field-rule-mutations.ts`
`1b63b3c996bb1b894eccde7a8858c198faf1785c`, `schema.ts` `cab73f73f4010d15392ae3ff18e4331b795a7c6d`).
No new `as`/`any`/`!`; no secrets; the required lint cleanup landed (the stray `locationOf` is now
used by a completed apply-new date-boundary integration test; lint 0 errors, 10 pre-existing
warnings only, incl. `TransactionTable.tsx:360` useVirtualizer skip on a pre-existing line outside
P17C's hunks). Six Q-proposals recorded in evidence (Q-P17C-01..06: portalled Radix Popover no
focus/scroll steal; lucide Bot glyph with data-drift; drift copy; apply-this single button no
confirm; "actively edited" = description input focus; apply-mode select not persisted -> defers to
Q-P17B-03/P17D). Implementer flagged a pre-existing timing-sensitive perf flake in
`import/duplicates.test.ts` (unrelated to P17C; passes on clean full re-run) — reviewer to confirm.

Row P17C -> `ready_for_review` rev 01 range `0d3de91..ce82cb5`. HANDOFF rewritten as the P17C REVIEW
dispatch; a DISTINCT fresh-context `p17c-reviewer-01` (never the implementer) reviews product range
`0d3de91..ce82cb5`, re-running every gate and judging against frozen text. Rolling scratch SHA
`df8ad9ce…` unchanged; eighteen requirements `passed`; twenty of twenty-two packages `passed`.

### 2026-07-27 — P17C/01 review PASS + integration Commit A (HS-007 inline description workflow)

Distinct fresh-context `p17c-reviewer-01` (independent of the implementer, read-only) returned
**VERDICT: PASS**, 0 blocking findings, over product range `0d3de91..ce82cb5`. It RE-RAN every gate
itself: typecheck 0 errors; lint exit 0 (0 errors, 10 warnings ALL pre-existing incl.
`TransactionTable.tsx:360` useVirtualizer — NO new warning; the formerly-stray `locationOf` is now
used by a real apply-new-scoping test); format:check fails only on 15 pre-existing `specs/**`
markdown (no P17C `.ts`/`.tsx`); `pnpm test` 95 files 1856 passed/2 skipped/0 failed (incl.
`import/duplicates.test.ts` — the implementer-flagged perf flake did NOT reproduce); `pnpm test:e2e`
new `transaction-rules.spec.ts` 2/2 at `--retries=0`, full suite 146 passed + 1 UNRELATED
`passkey.spec.ts:387` full-suite timing flake (not in the P17C diff; passes 12/12 in isolation). It
confirmed against FROZEN text (not the evidence): boundaries byte-EMPTY; frozen blobs byte-identical
(settlement `010f3c93582a2ce311594d4dde8464760ca49c43`, P16C `mutations.ts`
`118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`, P17A `field-rules.ts`
`4656c3c55515267d9050b718d0556a0fbfee7ed2`, P17B `field-rule-mutations.ts`
`1b63b3c996bb1b894eccde7a8858c198faf1785c`, `schema.ts` `cab73f73f4010d15392ae3ff18e4331b795a7c6d`);
`FieldRuleEditor` reused UNCHANGED (byte-empty), refactor only extracted
`draftFromRule`+`mutationErrorToFieldErrors` into `rule-editor-data.ts` (behavior preserved,
strengthened to `switch`+`assertNever`); robot NORMAL/RED/hidden via reused P17A `selectWinningRule`
on a `RuleMatchSubject` projection byte-faithful to the engine's own `subjectForTransaction`; popup
portaled with `onOpenAutoFocus` prevented and fixed `w-96`/`max-w-[90vw]` (no
resize/occlude/focus-steal); inline alias-edit → `update({id,...})` (no create path);
apply-all/apply-new via `useApplyFieldRules` (apply-new strictly-newer than the row date),
apply-this via `applyFieldRulesToSingleTransaction` delegating wholesale to P17A
`applyFieldRulesToTransaction` so allocations stay P16C-only (invalid set → zero mutation) and
aliases P11-only, no direct write; no new `as`/`any`/`!`; no secrets; tests honest (robot states
over overlapping scopes + drift, single-tx zero-mutation + not-found, apply-new date boundary, E2E
popup journeys).

Root re-verified against git BEFORE trusting: HEAD product `ce82cb5` (parent `6667159`, linear on
`main`); all five pinned frozen blobs reproduced byte-identical BASE↔HEAD at the exact SHAs; every
other boundary (`defaults.ts`, `import-commit.ts`, `automation/{rules,apply,migration}.ts`,
`FieldRuleEditor.tsx`, both frozen specs) SAME BASE↔HEAD; 18-file product delta all in allowed paths
with NO src/tests change outside `ce82cb5`; `apply-field-rule-to-transaction.ts` is pure delegation
(no `replaceTransaction`/`insertTransaction`/allocation/alias write); no forbidden `as`/`any`/`!` in
added lines (the lone `any` hit is a comment word); no secret material; canary 1; rolling scratch
SHA `df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` unchanged.

Six presentational Q-proposals adjudicated faithful/non-blocking and recorded as **Q-P17C-01..06**
(QUESTIONS.md): popup anchoring/no-focus-steal, Bot glyph, drift copy, single apply-this button,
"focus == actively editing", and apply-mode SELECT deferral. **Q-P17C-06 defers apply-mode SELECT
persistence to Q-P17B-03 (owner P17D)** — not a P17C gap. Commit A (integration-persistence)
persists `reviews/P17C-review-01.md` + `evidence/P17C/implementation-01.md` + this event + the
Q-P17C-01..06 record, and moves row P17C `ready_for_review -> reviewing`. Commit B flips it to
`passed`. Integration is MARKERLESS: HS-007 spans P17A-D, so P17C passing applies NO scratch marker
and the rolling scratch SHA stays `df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3`
(actual==rolling, unchanged); the HS-007 requirement row stays UNCHECKED.

### 2026-07-27 — P17C/01 PASS integrated (Commit B) + serial loop -> P17D (HS-007 final package)

Control flip: P17C `reviewing -> passed`, integration-commit `PASS; A `ea2ad75`; B row -> passed`.
MARKERLESS: HS-007 spans P17A-D, so P17C passing completes the inline description-workflow slice
(per-row robot normal/red-drift/hidden, contextual popup reusing the P17B editor, inline alias-edit
-> UPDATE, apply-this/all/new scoped to the row date) but NOT the requirement — no scratch marker
applied, rolling scratch SHA stays
`df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (verified actual==rolling),
HS-007 row stays UNCHECKED. Package tally: P00-P16E + P17A + P17B + P17C = TWENTY-ONE of twenty-two
packages `passed`; remaining P17D, P10, P20A, P20B, P21. Requirement tally unchanged at eighteen
`passed` (HS-003, HS-007, HS-016, HS-021 still open). Carry-forward into P17D: **Q-P17B-03**
apply-mode SELECT persistence (additive `applyMode` slot in `userAutomationPreferences` +
shared-editor wiring) is P17D-owned and MUST be delivered before HS-007 can be checked; plus P17D's
own committed scope (tag/allocation-rule parity for the inline workflow, bulk/large-import
application, performance/polish). Serial loop: recomputed dispatchable = {P17D (dep P17C passed),
P10 (deps P05,P08 passed)}; choosing **P17D** to finish the HS-007 chain with P17C context fresh
(P17D is the last package before HS-007 checks). P10 (HS-003, a P21 pre-req leaf) follows. PROCESS
serial (one package `implementing`), so only P17D is dispatched next.

### 2026-07-27 — P17D/01 dispatch (HS-007 FINAL: tag/allocation parity + apply-mode persistence + polish)

P17C passed at `ce82cb5` (integration `ea2ad75`/`27ac503`); serial loop advanced. Frozen-source
integrity re-run at the P17D boundary and PASSED: scratch `sha256sum specs/human-scratch.md` ==
rolling `df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3` (actual==rolling;
markerless mid-HS-007, no marker applied for P17A-C); 008 canonical
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes
byte-exact. Dispatchable after P17C = {P17D (dep P17C passed), P10 (deps P05,P08 passed)}; chose
**P17D** — the FINAL HS-007 package (the last gate before HS-007 can be checked) with P17C context
fresh. PROCESS serial (one package `implementing`), so only P17D dispatched.

**Scope note (no adjudicator — additive completion, not a reduction):** discovery confirmed the P17A
model + engine ALREADY encode all three rule fields —
`RuleFieldSchema = ["descriptionAlias","tags","allocation"]` with `TagRuleMode` add/set
(`domain/automation/rules.ts`), and `apply.ts`/`field-rules.ts` already APPLY tag (add/set) and
allocation (spanning set) rules with migration mapping legacy actions. So P17D is NOT re-modelling:
it (a) surfaces tag add/set + allocation column-per-person parity in the shared `FieldRuleEditor`
and the P17C inline popup/robot; (b) delivers the deferred **Q-P17B-03** apply-mode SELECT
persistence as an additive vertical (`preferences.ts` remembered-choice field -> a new OPTIONAL
`lastApplyMode` slot on `userAutomationPreferenceSchema` in `schema.ts` -> P17B
`field-rule-mutations.ts` persist/read path -> editor wiring; absent key -> session default, NO
migration); (c) ensures tag/allocation rules apply to MANUAL rows (frozen `:294-295`), verifying the
existing engine already honors it and surfacing any true engine gap to root rather than silently
editing a passed file; (d) bulk/large-import/performance + every UX state. Every allocation write
stays routed through P16C `replaceTransactionAllocations` (no direct allocation-map write); FS-001
`settlement.ts` and effective/settled values stay byte-identical and FS-001-owned. This all
completes HS-007's committed scope (MORE work, additive) — not a reduction — so the independent
scope adjudicator is not triggered; passed P17A-C are reused call-not-edit and not conceptually
reopened. `schema.ts`/`preferences.ts`/`field-rule-mutations.ts` — hard boundaries for P17A-C — are
now legitimately ADDITIVE-ALLOWED for P17D's committed apply-mode slot only, and must break no
passed test. Row P17D -> `implementing` rev 01 at BASE `27ac503`, evidence
`evidence/P17D/implementation-01.md`. HANDOFF rewritten as the P17D IMPLEMENT dispatch;
`p17d-implementer-01` dispatched on the no-checkout discipline (commit on `27ac503`). Rolling
scratch SHA `df8ad9ce…` unchanged; eighteen requirements `passed`; twenty-one of twenty-two packages
`passed`.

### 2026-07-27 — P17D/01 partial handback + Q-P17D-01 adjudicated (authorize manual-row engine projection)

`p17d-implementer-01` committed P17D deliverables 1 (tag add/set select in shared editor + inline
popup), 2 (allocation column-per-person, all writes via P16C, `settlement.ts` untouched), 4
(four-mode apply SELECT remembered via a new OPTIONAL `lastApplyMode` slot, no migration) and 5
(bounded/non-intrusive popup at scale) at HEAD `57487ee` (parent `efc7f37`, linear), and surfaced
deliverable 3 (manual-row applicability) to root as a blocking scope question rather than silently
editing a passed engine file — exactly the escalation the P17D dispatch pre-authorized. Root
verify-not-trust of `27ac503..57487ee`: 16 product/test files all in allowed paths; frozen blobs
byte-identical (settlement `010f3c93…`, P16C `mutations.ts` `118e994a…`, P17A `field-rules.ts`
`4656c3c…`, `import-commit.ts`, automation `{rules,apply,migration}.ts`); `schema.ts` change is
EXACTLY the additive optional `lastApplyMode` StringEnum (four frozen modes, `required:false`); no
`as`/`any`/`!`; no direct allocation/alias write; no secrets. (Minor deviation: the implementer
committed `evidence/P17D/implementation-01.md` in the feat commit though the dispatch said leave it
uncommitted — harmless, already tracked; root will not re-add it at integration.)

**Q-P17D-01 adjudicated by root (code-verified, NOT a scope reduction -> no independent
adjudicator):** frozen `:294-295` requires tag/allocation rules to apply to manual rows; root
confirmed in code that `field-rules.ts` `subjectForTransaction` projects `descriptionText=null` for
manual rows and `rules.ts:193` short-circuits on null before the field-eligibility path, so manual
rows cannot match today. The matcher is alias-agnostic by design (`rules.ts:163` — "alias-aware
description resolution is the caller's concern"); the fix is a surgical ADDITIVE projection in
`field-rules.ts` resolving a manual row's description-alias NAME (from
`state.descriptionAliases[descriptionAliasId]`) as `descriptionText`, leaving description-alias
rules excluded via the independent `isManual` gate (`rules.ts:192`). Writing the alias name into raw
`description` was REJECTED (provenance corruption); dropping deliverable 3 was REJECTED (that would
be the scope reduction requiring an adjudicator). This COMPLETES committed frozen scope (more work),
legitimately reopening the P17A `field-rules.ts` byte-identical boundary for this projection ONLY;
`rules.ts`/`apply.ts`/`migration.ts`/`import-commit.ts`, `settlement.ts`, P16C `mutations.ts` stay
byte-identical; allocations stay P16C-only. Recorded as **Q-P17D-01** (RESOLVED, links
Q-P17A-MANUAL-MATCH).

Action: P17D stays `implementing` rev 01 (CONTINUATION); root bounces to the SAME
`p17d-implementer-01` (context intact) to add the projection change + a real manual-row match test
(removing the retained `test.fixme`) on top of `57487ee`, then re-run all gates and hand back. On
the completed handback root re-verifies the FULL range `27ac503..HEAD` and dispatches a DISTINCT
`p17d-reviewer-01`. For the P17D REVIEW, `field-rules.ts` becomes ADDITIVE-ALLOWED (surgical
projection only; must preserve description-rule manual exclusion + all passed P17A tests);
settlement + P16C stay HARD byte-identical. Rolling scratch SHA `df8ad9ce…` unchanged; eighteen
requirements `passed`; twenty-one of twenty-two packages `passed`.

### 2026-07-27 — P17D/01 continuation handback VERIFIED -> ready_for_review

`p17d-implementer-01` (`aa2a0d86…`) delivered the deliverable-3 continuation at HEAD `aad518e`
(parent `8d3e5e0`; linear chain `27ac503->efc7f37->57487ee->8d3e5e0->aad518e`, all single-parent).
Root verify-not-trust of the full range `27ac503..aad518e` (git facts, not the peer's claims):

- **File list:** 17 product/test files, ALL within P17D-allowed
  automation/transaction/schema/preferences/apply-mode paths, + 4 docs (root ledgers +
  implementer-committed `evidence/P17D/implementation-01.md`). No
  spec/realtime/supabase-migration/control file in the product diff.
- **Five hard boundaries BYTE-IDENTICAL BASE->HEAD:** `settlement.ts`
  (`010f3c93582a2ce311594d4dde8464760ca49c43`), P16C `mutations.ts`
  (`118e994af45b4b531bebd4bf1ed0a4a861a6b6f0`), and `automation/{rules,apply,migration}.ts` +
  `import-commit.ts` (blobs equal BASE, absent from diff). Allocations P16C-only; no direct
  allocation/alias/transaction write in the engine.
- **`schema.ts`:** ONLY the additive optional `lastApplyMode` StringEnum (four frozen modes,
  `required:false`) — no migration.
- **`field-rules.ts` (additive-allowed under Q-P17D-01):** surgical — a NEW pure
  `descriptionTextForMatching(transaction, aliases)` reusing the PRE-EXISTING `resolveAlias` helper
  (symlink-followed); imported rows keep raw text (provenance never rewritten), manual rows
  (`importId==null`) with a `descriptionAliasId` project the resolved alias NAME,
  manual-without-alias -> `null`. `isManual` UNCHANGED (`importId==null`), so description-alias
  rules stay excluded via the untouched `rules.ts` `fieldAppliesToManual` gate. Public
  `applyFieldRulesToTransaction` signature unchanged; typecheck-clean proves every internal caller
  (bulk/import/P17C single) is threaded.
- **Page/robot projection (`transactions/page.tsx`):** mirrors `descriptionTextForMatching` exactly;
  per-field description/tags/allocation robots mount only when a matching rule exists (bounded at
  scale).
- **Flagged test edit (`field-rules-crdt.test.ts`):** VERIFIED a legitimate CORRECTION, not a
  loosening — the prior setup seeded a manual row with a raw description (impossible per frozen
  `:269`); corrected to a valid aliased manual row; still proves the description-alias rule never
  mutates it. New `field-rule-mutations.test.ts` block proves tag-applies /
  allocation-applies-via-P16C (`[["person-1",100]]`) / alias-rule-excluded /
  raw-description-stays-empty. The retained E2E `test.fixme` is now a real passing journey.
- **No `as`/`any`/non-null `!`** in added product lines (sole scan hit is the word "as" in a prose
  comment). **No secrets** (synthetic vectors only).
- **Gates re-spot-checked by root:** `typecheck` clean; `format:check` flags ONLY pre-existing
  non-P17D markdown (incl. frozen `human-scratch.md`), zero P17D source/test files.
  Implementer-reported: lint 0 errors/10 pre-existing warnings, test 1878 passed/2 skipped, e2e 153
  passed — to be independently re-run by the reviewer.

Action: P17D -> `ready_for_review`, range frozen `27ac503..aad518e`. Dispatching a DISTINCT
`p17d-reviewer-01` (fresh, independent of implementer `aa2a0d86…`). For the review, `field-rules.ts`
is ADDITIVE-ALLOWED (surgical projection only; must preserve the description-rule manual exclusion +
all passed P17A/B/C tests); the five hard boundaries stay HARD byte-identical. On PASS this is the
FINAL HS-007 package -> NON-markerless integration (apply HS-007 scratch marker, advance rolling SHA
`df8ad9ce…`, flip HS-007 requirement -> passed). Rolling scratch SHA unchanged at this boundary.

### 2026-07-27 — P17D/01 review PASS (Commit A integration-persistence)

`p17d-reviewer-01` (fresh, independent of implementer `aa2a0d86…`) returned **VERDICT: PASS** (0
blocking findings) over `27ac503..aad518e`. Root persisted `reviews/P17D-review-01.md` and
re-verified every hard fact against git (already independently confirmed pre-dispatch): linear
single-parent chain; five hard boundaries byte-identical BASE->HEAD (`settlement 010f3c93…`, P16C
`mutations 118e994a…`, `automation/{rules,apply,migration}.ts`, `import-commit.ts`);
`field-rules.ts` a surgical additive projection (`descriptionTextForMatching` via pre-existing
`resolveAlias`) preserving the manual-row description-alias exclusion through the untouched
`rules.ts` `isManual` gate; `schema.ts` additive optional `lastApplyMode` only; allocations
P16C-only; no `as`/`any`/`!`; no secrets. Reviewer re-ran gates: typecheck clean, lint 0 errors/10
pre-existing warnings, format:check pre-existing markdown only (zero .ts/.tsx), test 1878 passed/2
skipped, e2e 153 passed.

Frozen behaviours confirmed honest + tested: manual-row applicability (`:294-295`/`:268-269`) —
tag + allocation rules apply to a manual row via its resolved alias name, description-alias rules
excluded; the `field-rules-crdt.test.ts` correction STRENGTHENS (models a valid aliased manual row
so the `isManual` gate is load-bearing — correction not loosening). Four-mode apply SELECT
persisted + re-read (`:255-256`/`:270`) — **Q-P17B-03 genuinely CLOSED**. Tag add/set (`:290-291`) +
allocation column-per-person whole-set (`:292-293`) via P16C complete-set (invalid -> zero
mutation). Robot parity holds.

Non-blocking observation recorded as **Q-P17D-02**: dead `description-rule-state.ts` (+ its unit
test) superseded by `field-rule-robot-state.ts`, plus a stale `@link` JSDoc in
`use-transaction-rule-workflow.ts:9` — low-severity hygiene, passes all gates; deferred to a P20/P21
cleanup sweep, NOT blocking HS-007.

P17D `ready_for_review -> reviewing`. Next (Commit B, NON-markerless — HS-007's four packages P17A-D
all passed and Q-P17B-03 delivered): flip P17D -> `passed`; apply the HS-007 authorized forward
marker (`- []` -> `- [x]` at scratch `:248`) per PROCESS.md:261-273 (copy to mktemp, one-line
marker-only diff, re-run normalized-blocks + SHA, record both checksums), advance rolling scratch
SHA, add HS-007 to authorized checked IDs, and flip the HS-007 requirement row -> `passed`. Rolling
scratch SHA still `df8ad9ce…` at this instant.

### 2026-07-27 — P17D/01 PASS integrated (Commit B) + HS-007 authorized forward marker applied (NON-markerless FINAL)

Control flip: P17D `reviewing -> passed`, integration-commit
`PASS; A `c434da2`; B row -> passed + HS-007 marker`. This is the FINAL HS-007 package — all four
mapped packages P17A-D now `passed` and the deferred Q-P17B-03 (apply-mode SELECT persistence)
delivered — so per the authorized forward-marker procedure (PROCESS.md:261-273) root applied the
HS-007 scratch marker. **Pre-marker verification:** actual `sha256sum specs/human-scratch.md` ==
rolling `df8ad9cee30241f4d7be34a3a8e1388a6d0bbf116820b64786b3b6940c840cf3`; normalized-block check
GREEN — 0 mismatches over all 21 ordered HS blocks vs SCOPE `sourceTextLines`; HS-007 block first
line (`:248`) UNCHECKED; authorized checked set was exactly the 17 prior IDs. **Marker
application:** copied scratch to a `mktemp`, flipped ONLY the leading `- []` -> `- [x]` on the
HS-007 block first line (`:248`), and confirmed the temp-vs-result diff is EXACTLY that one line
(git numstat 1 added / 1 deleted, single hunk). **Post-marker verification:** normalized-block check
STILL GREEN (0 mismatches — the marker flip normalizes away); new rolling scratch SHA
`1b56b21c0787b4fdebc800d1256816244e5b907549fffb2b067c9295c9b85a57` (independently reproduced by
`sha256sum`); authorized checked set now the 18 IDs (HS-007 added). Ledger updated: rolling scratch
SHA advanced `df8ad9ce… -> 1b56b21c…`; HS-007 added to Authorized checked HS IDs; the HS-007
requirement row -> `passed` (Evidence: P17A `81401bf` / P17B `cef9f2b` / P17C `ea2ad75` / P17D
Commit B integrations, `reviews/P17D-review-01.md`, marker `df8ad9ce… -> 1b56b21c…`). Requirement
tally now NINETEEN of twenty-two `passed` (HS-003, HS-016, HS-021 remain open). Remaining packages:
P10, P20A, P20B, P21. No marker event or P21 rollback batch is active. Serial loop: dispatchable
leaf = P10 (HS-003; deps P05, P08 both passed) — dispatched next over BASE = current HEAD (the
Commit B commit), PROCESS serial (one package `implementing`).

### 2026-07-27 — P10/01 dispatch (HS-003 Loro ephemeral presence + active transaction)

HS-007 completed at Commit B `41c6c81` (linear single-parent). Serial loop advanced: dispatchable
set = {P10 (deps P05, P08 both `passed`)} — P20A is gated on P20A-deps but its own deps (P17D, P19)
are now passed, yet PROCESS is serial and P10 is the ready leaf on the P21 critical path, so P10 is
dispatched. **Frozen-source integrity re-run and PASSED at the P10 boundary:** scratch
`sha256sum specs/human-scratch.md` == rolling
`1b56b21c0787b4fdebc800d1256816244e5b907549fffb2b067c9295c9b85a57` (actual==rolling; no marker this
turn — P10 is a single-package requirement, its marker applies only on P10 PASS); 008 canonical
`0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes
byte-exact. Frozen text `specs/human-scratch.md:161-163` (HS-003): use Loro ephemeral state for
presence + active transaction after understanding the complete Loro model docs + loro-mirror. Row
P10 -> `implementing` rev 01 at BASE `41c6c81`, evidence `evidence/P10/implementation-01.md`.
HANDOFF rewritten as the P10 IMPLEMENT dispatch; a fresh implementer is dispatched on the
no-checkout discipline (commit on `41c6c81`). Rolling scratch SHA `1b56b21c…` unchanged; nineteen
requirements `passed`; remaining packages P10, P20A, P20B, P21.

### 2026-07-27 — P10/01 implement handback VERIFIED -> ready_for_review -> reviewing (DISTINCT reviewer dispatched)

`p10-implementer-01` delivered HS-003 at final HEAD `71c378c` (parent chain
`54a88ae->f6ae3fe->d832443->71c378c`, linear single-parent, no merges). **Root verify-not-trust
against git (re-derived, not taken on faith):** product/test delta = 17 files +
`evidence/P10/implementation-01.md`, ALL within allowed paths — new
`src/lib/sync/presence-protocol.ts`, rewritten `sync/presence.ts`, new
`src/lib/crypto/presence-key.ts`, new `vault-presence-provider.tsx`, rewritten
`use-vault-presence.ts`, additive `supabase/realtime.ts` (opaque `payload?: unknown` carried via the
authorized Presence `track()` path — NOT raw Broadcast, consistent with the byte-identical RLS
audit), `sync/index.ts`, `hooks/index.ts`, `app/(app)/layout.tsx` + `transactions/page.tsx`,
`TransactionRow.tsx`, `TransactionTable.tsx`, and unit/integration/E2E test files. **NO file under
`src/lib/crdt/**`is touched** (corroborates: no ephemeral value enters the durable vault`LoroDoc`/UndoManager/IndexedDB/`vault_ops`); NO root-owned/marker/spec/migration file touched. **Hard boundaries byte-identical BASE(`54a88ae`)->HEAD:** FS-001 `settlement.ts` `010f3c93582a2ce311594d4dde8464760ca49c43`; P05 `tests/database/rls-audit.sql` `9b04bef7e55929d3993efd82b037fcf02d7bb637`(P05 authorization surface unchanged). Product code is cast-free — the only`as`in`src/**` added lines is an ESM re-export alias (`export
{ EMPTY_SNAPSHOT as EMPTY_PRESENCE_SNAPSHOT }`), not a type assertion; **one** `as unknown as never`
exists in a TEST fixture (`tests/integration/presence-ephemeral.test.ts:167`, a FakeTransport
structural shim) — flagged to the reviewer, non-blocking per P17A/P17C precedent while product stays
cast-free. No secret/presence-key/vault-plaintext in code/logs/tests/fixtures/evidence (synthetic
fixed-byte + fast-check vectors only). Canary==1; scratch `sha256sum` == rolling
`1b56b21c0787b4fdebc800d1256816244e5b907549fffb2b067c9295c9b85a57` (no marker this turn — HS-003 is
single-package, its forward marker applies only on P10 PASS). Root spot-check: `pnpm typecheck`
clean. **Two Q-proposals recorded (reversible defaults already implemented):\*\* Q-P10-01
(abrupt-tab-close retraction bounded by Loro ephemeral expiry ~30s, immediate on every graceful
path) and Q-P10-02 (editing-field granularity is the LWW cell, not a character-level `LoroText`
cursor) — neither is a scope reduction (frozen text satisfied), so no independent adjudicator
triggered. P10 -> `reviewing`; a DISTINCT fresh reviewer `p10-reviewer-01` (NOT the implementer) is
dispatched over `54a88ae..71c378c` on read-only no-checkout discipline; must independently re-run
all five gates and confirm the encrypted-ephemeral protocol, session-spoofing rejection,
departure-as-filter, no-durable-leak, and P05 channel constraint. On PASS this is the sole HS-003
package -> NON-markerless final integration applies the HS-003 scratch marker at `:161`. Rolling
scratch SHA `1b56b21c…` unchanged at this boundary; nineteen requirements `passed`.

### 2026-07-27 — P10/01 review PASS (Commit A integration-persistence)

`p10-reviewer-01` (fresh, independent of implementer `p10-implementer-01`) returned **VERDICT:
PASS** (0 blocking findings) over `54a88ae..71c378c`. Root persisted `reviews/P10-review-01.md` and
re-verified every hard fact against git before integrating: linear single-parent chain; two hard
boundaries byte-identical at BASE `54a88ae`, tip `71c378c`, AND current HEAD (FS-001 `settlement.ts`
`010f3c93582a2ce311594d4dde8464760ca49c43`; P05 `rls-audit.sql`
`9b04bef7e55929d3993efd82b037fcf02d7bb637`); delta touches NO `src/lib/crdt/**`, `sync/manager.ts`,
`sync/persistence.ts`, `src/server/**`, or migration; product code cast-free (only an ESM re-export
alias; the one `as unknown as never` is a test-fixture FakeTransport shim). Reviewer re-ran gates:
typecheck 0 errors, lint 0 errors / 10 pre-existing warnings, format:check 14 pre-existing
`specs/**` markdown only (0 `.ts`/`.tsx`; oxfmt over all 10 P10 sources correct), test 1919 passed /
2 skipped, e2e 156 passed / 0 flaky. The reviewer went beyond claims and EMPIRICALLY reproduced both
hazards against `loro-crdt@1.13.7`: a raw session-spoof `apply()` writes the victim key (so the
stage-and-verify `{sessionId}`-only guard is load-bearing), and a `delete()` + same-ms rejoin
suppresses the peer 200/200 (so departure-as-filter, not delete, is justified). No secret material
anywhere; the E2E traffic observer records counts only. Non-blocking observations: Q-P10-01/Q-P10-02
dispositions agreed; a cosmetic `disposed`-permanence note on bfcache restore (correct as written
under React remount). Commit A (integration-persistence) persists `reviews/P10-review-01.md`
(evidence `evidence/P10/implementation-01.md` already tracked at `71c378c`) + this event, and keeps
row P10 `reviewing`. Commit B flips it to `passed` and — HS-003 being the SOLE package for the
requirement — applies the HS-003 authorized forward marker (`- []` -> `- [x]` at scratch `:161`),
advancing the rolling scratch SHA. Rolling scratch SHA `1b56b21c…` unchanged at this instant.

### 2026-07-27 — P10/01 PASS integrated (Commit B) + HS-003 authorized forward marker applied (NON-markerless FINAL)

Control flip: P10 `reviewing -> passed`, integration-commit
`PASS; A `31ad9b5`; B row -> passed + HS-003 marker`. HS-003 maps to the SOLE package P10, now
`passed`, so per the authorized forward-marker procedure (PROCESS.md:261-273) root applied the
HS-003 scratch marker. **Pre-marker verification:** actual `sha256sum specs/human-scratch.md` ==
rolling `1b56b21c0787b4fdebc800d1256816244e5b907549fffb2b067c9295c9b85a57`; normalized-block check
GREEN — 0 mismatches over all 21 ordered HS blocks vs SCOPE `sourceTextLines`; HS-003 block first
line (`:161`) UNCHECKED; authorized checked set was exactly the 18 prior IDs. **Marker
application:** copied scratch to a `mktemp`, flipped ONLY the leading `- []` -> `- [x]` on the
HS-003 block first line (`:161`), confirmed the temp-vs-result diff is EXACTLY that one line
(`161c161`, one deletion + one addition, single hunk). **Post-marker verification:**
normalized-block check STILL GREEN (0 mismatches — the marker flip normalizes away); new rolling
scratch SHA `9fcdc51e0d45176f887383bfdc9406ff19caecf6d9dc885e8f4b78219d2761cb` (independently
reproduced by `sha256sum`); authorized checked set now 19 IDs (HS-003 added). Ledger updated:
rolling scratch SHA advanced `1b56b21c… -> 9fcdc51e…`; HS-003 added to Authorized checked HS IDs;
the HS-003 requirement row -> `passed` (Evidence: P10 Commit B integration,
`reviews/P10-review-01.md`, `evidence/P10/implementation-01.md`, marker `1b56b21c… -> 9fcdc51e…`).
Requirement tally now TWENTY of twenty-two `passed` (HS-016, HS-021 remain open). Remaining
packages: P20A, P20B, P21. No marker event or P21 rollback batch active. Serial loop: next
dispatchable = P20A (HS-016; deps P17D, P19 both `passed`) — dispatched next over BASE = the Commit
B HEAD, PROCESS serial.

### 2026-07-27 — P20A/01 dispatch (HS-016 truthful marketing pages)

HS-003 completed at Commit B `4290059` (linear single-parent). Serial loop advanced: with P10 passed
the ready dispatchable leaf is **P20A** (HS-016; deps P17D, P19 both `passed`). **Frozen-source
integrity re-run and PASSED at the P20A boundary:** actual `sha256sum specs/human-scratch.md` ==
rolling `9fcdc51e0d45176f887383bfdc9406ff19caecf6d9dc885e8f4b78219d2761cb` (actual==rolling; no
marker this turn — HS-016 is a single-package requirement, its forward marker applies only on P20A
PASS); 008 canonical `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines,
25,441 bytes byte-exact; canary==1. Frozen text `specs/human-scratch.md:328-331` (HS-016): update
the marketing pages truthfully — private; categorising and allocating transactions, NOT budgeting;
imports CSV and OFX; multiple people collaborate in real-time; intelligently applies
tags/aliases/allocations to new imports; clear, succinct, not "markety".

Row P20A -> `implementing` rev 01 at BASE `42900590302030f9b38a56a560e9f53ecb3f65ed`, evidence
`evidence/P20A/implementation-01.md`. HANDOFF rewritten as the P20A IMPLEMENT dispatch: editable
product scope confined to `src/app/(marketing)/**` + `src/components/features/landing/**` (+ tests);
audit and remove the current off-positioning copy (`FeaturesSection.tsx:68` "Smart Budgeting", `:76`
"Spending Insights"; `CTASection.tsx:35` / `Footer.tsx:56` / `HeroSection.tsx:54` "track/tracking"
language); produce a claim-to-evidence table BEFORE copy changes (no claim without a shipped/usable
feature); rewrite to the frozen positioning; privacy wording must match the threat model with no
false absolutes; responsive/dark/reduced-motion/accessibility intact; component/accessibility tests
(guard against false budgeting headings) + a public landing-to-create E2E. Hard rules restated: no
new `as`/`any`/`!` in product; secret-safety; FS-001 `src/lib/domain/settlement.ts` blob
`010f3c93582a2ce311594d4dde8464760ca49c43` byte-identical and nothing under `src/lib/**` touched. A
fresh `p20a-implementer-01` is dispatched on the no-checkout discipline (commit forward on
`4290059`). Rolling scratch SHA `9fcdc51e…` unchanged; twenty requirements `passed`; remaining
packages P20A, P20B, P21. Next: verify-not-trust the handback against git, then dispatch a DISTINCT
fresh reviewer; on PASS this SOLE HS-016 package -> NON-markerless final integration applies the
HS-016 scratch marker at `:328`.

### 2026-07-27 — P20A/01 implement handback VERIFIED -> ready_for_review -> reviewing (DISTINCT reviewer dispatched)

`p20a-implementer-01` delivered HS-016 (truthful marketing pages) at HEAD
`6509ce7c835b1d96a7b0e6dfda05209e0b3b95df` (handback quoted `6509ce7d` — a one-char typo; actual tip
is `6509ce7c`). Parent chain `b79c77d->6d5b5db->6509ce7c`, linear single-parent, no merges. **Root
verify-not-trust against git (re-derived, not taken on faith):** delta =
`src/app/(marketing)/layout.tsx`, six landing components (`HeroSection`, `FeaturesSection`,
`SecuritySection`, `CTASection`, `Footer`, `Header`), `tests/unit/components/landing-page.test.tsx`,
`tests/e2e/landing.spec.ts`, and `evidence/P20A/implementation-01.md` — ALL within the P20A
marketing scope. **NOTHING under
`src/lib/**`, `src/server/**`, `supabase/**`, or `src/app/(app)/**`; `package.json`/lockfile
untouched.** Hard boundary byte-identical BASE(`b79c77d`)->HEAD: FS-001
`src/lib/domain/settlement.ts` `010f3c93582a2ce311594d4dde8464760ca49c43`. Product code cast-free —
no new `as`/`any`/non-null `!` in added product lines (the only `as` hits are prose "Load statements
as CSV or OFX" and comments). No secret material anywhere (seed/recovery-phrase strings are truthful
copy ABOUT the auth model, or old copy being removed; no literal BIP-39 mnemonic or key bytes; broad
64-hex scan matched only the settlement blob). Canary==1; scratch `sha256sum` == rolling
`9fcdc51e0d45176f887383bfdc9406ff19caecf6d9dc885e8f4b78219d2761cb` (no marker this turn — HS-016 is
single-package, its forward marker applies only on P20A PASS). Root spot-check: `pnpm typecheck`
clean.

Implementer reported (peer claim — reviewer to re-run): typecheck 0 errors; lint 0 errors / 10
pre-existing warnings (none in P20A files); format:check 14 pre-existing `specs/**` markdown only
(all 12 P20A files pass oxfmt); test 1939 passed / 2 skipped; e2e 163 passed incl. 7 new landing
tests. Claim-to-evidence table written FIRST in the evidence file: KEPT claims (CSV+OFX import,
nested tags, description aliases, percentage People allocations, rules auto-applying
tags/aliases/allocations to new imports at `import-commit.ts`, real-time presence/collaboration,
invites+rekey, client-side encryption, honest server-visibility disclosure, local-first, 12-word
phrase OR passkey) each mapped to shipped code; CUT claims (Smart Budgeting + Spending Insights
vaporware — no budget schema/charting deps, `/dashboard` bare redirect; false "open source/MIT" —
README proprietary, no LICENSE; wrong GitHub account + `href="#"` dead links;
zero-knowledge/100%-private/military-grade/works-offline absolutes) removed; two crypto claims
corrected (vault data XSalsa20-Poly1305 via `crypto_secretbox_easy`, not XChaCha20; HKDF-SHA256 not
BLAKE2b — genuine XChaCha20 is presence-channel only).

**Three Q-proposals recorded (reversible defaults already in place):** Q-P20A-01 (tone:
plain/declarative chosen; preference only), Q-P20A-02 (crypto source-comment in
`src/lib/crypto/encryption.ts` + `005_vault_ops.sql` still says XChaCha20 where code is XSalsa20 —
out of P20A marketing scope, deferred to P20/P21 cleanup sweep; implementer correctly did NOT touch
those files), Q-P20A-03 (licensing contradiction resolved by removing the false open-source claims;
if the project is meant to be open source a human must add a LICENSE + fix README — not a completion
gate). **None is a scope reduction** — truthful removal of false/unbacked claims is MORE work toward
the frozen "clear, succinct, truthful, not markety" requirement, not a reduction of committed scope
— so no independent adjudicator triggered; no pause.

P20A `ready_for_review -> reviewing`; a DISTINCT fresh reviewer `p20a-reviewer-01` (NOT the
implementer) is dispatched over `b79c77d..6509ce7c` on read-only no-checkout discipline. It must
independently re-run all five gates and verify the TRUTHFULNESS core: every KEPT claim is backed by
a capability reachable today; every CUT claim was genuinely false/unbacked; the two crypto
corrections are accurate against `src/lib/crypto/encryption.ts`; privacy wording matches the threat
model with no false absolutes; responsive/dark/reduced-motion/accessibility hold; CTAs resolve to
live destinations. On PASS this is the SOLE HS-016 package -> NON-markerless final integration
applies the HS-016 scratch marker at `:328`. Rolling scratch SHA `9fcdc51e…` unchanged; twenty
requirements `passed`; remaining packages P20A, P20B, P21.

### 2026-07-27 — P20A/01 review FAIL (B1: false re-key security claim) -> bounced to rev 02

`p20a-reviewer-01` (fresh, independent of implementer `p20a-implementer-01`) returned **VERDICT:
FAIL — 1 blocking finding** over `b79c77d..6509ce7c`. All five gates re-run and matched the
implementer exactly (typecheck 0; lint 0 errors / 10 pre-existing warnings; format:check 14
pre-existing `specs/**` markdown only, 0 `.ts`/`.tsx`; test 1939 passed / 2 skipped; e2e 163
passed).

**Blocking finding B1 — shipped copy claims a re-key that does not happen.**
`src/components/features/landing/SecuritySection.tsx:35` ("Shared without sharing keys" card) added
a third sentence: _"Remove a member and the vault is re-keyed."_ The first two sentences are true
(`crypto_box_seal` `keywrap.ts:158`; fragment-only invite secret `InviteLinkGenerator.tsx:121`); the
third is FALSE. **Root independently re-derived against git before recording:** (1) the sentence is
a `+` added line in the range diff and is ABSENT from BASE `b79c77d` (a new claim, not
pre-existing); (2) `grep -rnE "rekeyVault|performCompleteRekey|membership\.rekey" src/` shows the
re-key primitives (`rekey.ts:50,120`, tRPC `membership.rekey`) are referenced ONLY by their own
definition, the barrel `crypto/index.ts:80-85`, and server-router doc-comments — ZERO
client/UI/hook/app callers; (3) the sole member-removal UI `AccessMembersSection.tsx` calls only
`membership.remove`; (4) the app's own in-product disclosure `AccessMembersSection.tsx:108` states
_"...the vault key is not rotated, so anything they already downloaded stays readable..."_ — the
landing page promises a security property the settings page explicitly disclaims. Frozen line
violated: `specs/human-scratch.md:328-329` ("clear, succinct, not too markety. It's private.") +
brief "no feature advertised before it is actually usable" and "without absolutes unsupported by the
threat model". Failing scenario: an owner removes a member believing removal rotates the key and
protects future data from the member's RETAINED key — it does not. This is an untruthful SECURITY
guarantee, the most consequential form of the exact failure HS-016 exists to prevent → legitimate
FAIL.

**Everything else CLEAN** (reviewer traced, root spot-checked): every advertised feature backed by a
shipping code path usable today (CSV+OFX import, nested tags, description aliases, percentage People
allocations + settlement, rules auto-applying tags/aliases/allocations to new imports via
`import-commit.ts:113`, real-time presence/collaboration, client-side encryption, 12-word phrase OR
passkey, local-first); every cut claim genuinely false/unbacked (Smart Budgeting + Spending Insights
vaporware, open-source/MIT vs proprietary README + no LICENSE + `private:true`, wrong GitHub
account + `href="#"` dead links, zero-knowledge/military-grade/works-offline absolutes); crypto
corrections accurate (vault XSalsa20-Poly1305 via `crypto_secretbox_*`; XChaCha20 presence-only in
`presence-protocol.ts`; HKDF-SHA256 derivation; BLAKE2b identity/body-hash only); FS-001
`settlement.ts` byte-identical (`010f3c93…`) with an empty
`src/lib`/`src/server`/`supabase`/`src/app/(app)`/`package.json`/lockfile diff; all CTA/nav links
resolve; no secret material; no new `as`/`any`/`!`. Review persisted `reviews/P20A-review-01.md`.

New non-blocking **Q-P20A-04** recorded: the re-key machinery (`rekeyVault`, `performCompleteRekey`,
`membership.rekey`, `rekey_vault_members` SQL) is fully built + tested but never wired to a caller —
whether the PRODUCT should re-key on removal is a separate threat-model/product decision, out of
P20A scope. Also carried: Q-P20A-01 (tone), Q-P20A-02 (stale XChaCha20 source-comments — deferred
sweep), Q-P20A-03 (licensing — false open-source claims removed).

**Disposition:** FAIL bounce is required work to complete committed scope (make the copy truthful),
NOT a scope reduction → no independent adjudicator, no pause, no halt. P20A
`reviewing -> implementing` rev 02 at BASE `c9c7874f9da65e87f604dadb4d54b0750323c896`. Bounced to
`p20a-implementer-01` (idle/available): make the SINGLE-sentence fix at `SecuritySection.tsx` —
delete the false re-key sentence or replace it with the honest in-app wording ("Removing a member
cuts off their access to future changes. The vault key is not rotated, so anything they already
downloaded stays readable to them."), keep all other copy, re-run gates, hand back. Then
`p20a-reviewer-01` re-reviews the rev-02 delta to confirm B1 resolved; on PASS root integrates
(Commit A persist rev-02 review; Commit B flip `passed` + HS-016 marker at scratch `:328`). Rolling
scratch SHA `9fcdc51e…` unchanged; TWENTY of twenty-two requirements `passed`; remaining packages
P20A, P20B, P21.

### 2026-07-27 — P20A/02 B1-fix handback VERIFIED -> `implementing -> reviewing` (distinct reviewer re-dispatched)

`p20a-implementer-01` returned the rev-02 fix. Reported HEAD `e50cbb27` was a short-SHA typo (its
recurring last-char pattern); actual HEAD resolved via `git log`/`git rev-parse` =
`e50cbb23119d8b916d0100f36b86cce6f6a04392`, parent `e5dc9f2`. **Root verify-not-trust against git,
ALL hard facts confirmed:** (1) linear single-parent chain (`e50cbb23` nparents=1, child of the
rev-01 tip `e5dc9f2`); (2) delta = EXACTLY 2 files —
`M src/components/features/landing/SecuritySection.tsx` (one line) +
`A specs/007-human-scratch-completion/evidence/P20A/implementation-02.md`; nothing else touched; (3)
the SecuritySection.tsx diff shows the false _"Remove a member and the vault is re-keyed."_ removed,
replaced with _"Removing a member cuts off their access to future changes; the vault key is not
rotated, so anything they already downloaded stays readable to them."_ — the first two (true)
sentences byte-identical, and the new wording matches the in-app disclosure
`AccessMembersSection.tsx:108-109`; (4) no residual "vault is re-keyed"/"re-keyed" claim anywhere in
`src/components/features/landing/`; (5) FS-001 `settlement.ts` blob `010f3c93…` byte-identical,
empty `src/lib`/`src/server`/`supabase` diff; (6) no new `as`/`any`/non-null `!` in the changed
line; (7) the PROGRESS canary count == 1 (single canonical occurrence at line 530); rolling scratch
SHA `9fcdc51e…` unchanged. **B1 is resolved.** Row `implementing -> reviewing` rev 02.
Re-dispatching `p20a-reviewer-01` (retains rev-01 context, DISTINCT from implementer) to confirm B1
resolved over `e5dc9f2..e50cbb23`, verify the corrected copy is itself truthful + matches the
settings disclosure, confirm no new issue introduced, and re-run all five gates. On PASS ->
integrate (Commit A persist `reviews/P20A-review-02.md`; Commit B flip `passed` + SOLE-package
HS-016 authorized forward marker `- []` -> `- [x]` at scratch `:328`, advancing rolling SHA). TWENTY
of twenty-two requirements `passed`; remaining packages P20A, P20B, P21.

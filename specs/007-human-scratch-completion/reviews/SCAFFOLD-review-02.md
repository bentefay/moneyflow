# Scaffold Review 02

- **Verdict:** FAIL
- **Reviewed:** complete updated orchestration scaffold, both agent roles, all task/control files,
  the entire 715-line canonical allocation specification, and review-01 resolution
- **Repository HEAD:** `6c3456ce701228a15b193f11cf3c0c270aa8a56f` on `main`
- **Review date:** 2026-07-19
- **Manual app testing:** intentionally not run; this is a scaffold/control-plane review

## Critical findings

None.

## Important findings

### I-001 — A failed P21 audit deadlocks scratch integrity before its reopened package can be fixed

`PROCESS.md:114-125` correctly routes a material P21 failure back to its owning package. At that
point all HS requirements have already passed and their markers are checked, because that is a P21
entry condition. Reopening an HS-owned package makes that package and its requirement no longer
passed, but `PROCESS.md:220-226` requires every unpassed item to use `- []`. The source still
contains its previously authorized `- [x]`, and `PROCESS.md:234-247` defines only a forward
`[] -> [x]` operation. There is no requirement-state rollback, authorized `[x] -> []` event, rolling
hash update, or later re-check procedure.

This is deterministically blocking:

1. Pass all packages and check all 21 markers.
2. Let P21 find a regression in any HS-owned package, for example P20B.
3. Follow the required failure route and reopen that package.
4. Run the mandatory boundary integrity check before its fix dispatch.
5. The still-checked marker now violates “an unpassed item must still use `- []`” and is classified
   as drift, so the normal package loop cannot continue.

Define one coherent rollback protocol. The safest form is for root to downgrade the owning package
and requirement, authorize and log exactly one `[x] -> []` marker change with before/after rolling
hashes, run the normal fix/re-review loop, then authorize a new `[] -> [x]` event after all mapped
packages pass again. FS-001 needs the same requirement-ledger downgrade/re-pass transition without a
source edit. Recovery, PROGRESS event semantics, P21 revision entry, and normalized-block validation
must all name this path explicitly.

### I-002 — The P16 evidence matrix weakens the canonical examples A–H E2E requirement

The immutable source is explicit at
`specs/008-transaction-percentage-allocations-settlement/spec.md:276`: **all** examples A–H are
mandatory unit and E2E expectations. The routing task requires P16B to “cover mandatory examples
A–H” at `tasks/FS-001-transaction-percentage-allocations-settlement.md:92`, but its P16E E2E list at
line 177 covers the canonical 12-step journey and selected additions rather than explicitly
requiring every example. More importantly, the section-7 coverage row at line 198 changes the gate
to “Production unit expectations plus E2E-visible representative results.” “Representative” allows a
subset and directly narrows the frozen all-examples clause.

The top-level canonical-authority paragraph says the source wins, but the package evidence matrix is
what a fresh coordinator uses to decide ownership and PASS. Remove the contradiction: assign unit
coverage for A–H explicitly to P16B and E2E coverage for each A–H explicitly to P16E, then require
the same complete matrix in P21. The existing integrated journey can remain; it is not a substitute
for the eight named expectations.

## Review-01 resolution audit

| Review-01 finding                            | Re-review result                                                                                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-001 P00/P21 lifecycle                      | **Partially resolved.** Both executable control tasks and normal BASE-equals-HEAD review lifecycles now exist, but I-001 above leaves P21 failure recovery non-executable. |
| I-002 role write/question/revision conflicts | Resolved. Each worker has one exact revisioned artifact, root alone transcribes Q proposals, and prior reviews are immutable.                                              |
| I-003 scaffold formatting                    | Resolved. Full `pnpm format:check` passes over 465 files.                                                                                                                  |
| I-004 reduced-motion mechanism               | Resolved. Narrow repository-CLI `run-code`/`eval` routes are explicit while standalone scripts/configs remain forbidden.                                                   |
| I-005 marker drift                           | **Partially resolved.** Forward marker changes, normalized reconstruction, rolling hashes, and FS immutability are mechanical, but the P21 rollback case is undefined.     |
| M-001 wrong README count                     | Resolved. README consistently states 22 first-class requirements: 21 HS blocks plus FS-001.                                                                                |
| M-002 deterministic accessibility evidence   | Resolved. Roles/names/states, 320px reflow, 200% zoom, reduced motion, and applicable computed contrast evidence are executable gates.                                     |

Review 01 remains a FAIL with all five Important and two Minor findings intact. Its current SHA-256
is `7af84476e3790c3608d8d2065bae8115f2007b61bc5b5acd3cda99736906e617`; this review did not edit it.

## Canonical allocation-spec audit

I read all 715 lines directly and checked sections 1–17 against P16A–E, HS-009, HS-007, P21, and the
final audit. Except for I-002, the scaffold preserves and assigns the required semantics:

- explicit signed decimal allocations, reject-only `-100..100` bounds, distinct ownership,
  positive/zero/negative owner remainder, and effective total 100 without normalization;
- established-decimal signed floor/largest-remainder apportionment, stable-ID ties, independent
  effective/ownership conservation, and exact minor-unit positions;
- one `src/lib/domain/settlement.ts` engine, top-level Treat-as-Paid eligibility, retained
  qualifying deleted statuses, nested-duplicate exclusion, transfer-tag neutrality,
  account/vault/USD currency fallback, per-currency isolation, deterministic obligations, reverse
  netting, and retained source contribution detail;
- historical/deleted/missing People, typed invalid-data issues, honest incomplete states, grouped
  People obligations, source expansion/navigation, and no misleading cross-currency total;
- actual virtual-grid/header/data/notes/add-row templates, horizontal virtualization, explicit
  versus effective/remainder UX, signed edit/cancel/blur/paste handling, historical columns,
  presence, accessibility, and interaction timing;
- per-key Loro mutation, atomic complete-set replacement, different/same-key concurrency,
  move/swap/nest preservation, encrypted persistence/sync, Loro-only history, undo grouping, and all
  grid/add-row/automation/import/automation-undo/hydration boundaries;
- near-linear computation, sub-100ms interaction, the approximate 100k/200ms benchmark or truthful
  measured follow-up, memoization, no persisted settlement cache, no plaintext audit store, and no
  competing engine; and
- HS-009 reject-only bounds and HS-007 explicit whole-set automation now agree with the canonical
  remainder model and P16C API.

## Mechanical validation

| Check                            | Result                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON parse and scope extraction  | 22 unique requirements; 21 ordered scratch blocks; all source ranges/text and 22 task paths exact                                                                                                             |
| Scratch identity                 | `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`; normalized reconstruction exact                                                                                                           |
| Canonical FS identity            | `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`; 715 lines; 25,441 bytes; whole-file selector exact                                                                                        |
| Reverse mapping and dependencies | 32 package rows; 22 requirement-ledger rows; exact bidirectional mappings; no unknown dependency or cycle                                                                                                     |
| Local links                      | 39 Markdown files; 22 relative links; none missing                                                                                                                                                            |
| Agent TOML                       | Both roles parse and contain valid required fields and unique nonempty nickname lists                                                                                                                         |
| Codex goal/agent support         | Official current local manual confirms project `.codex/agents`, direct-child orchestration, durable AGENTS guidance, and file-pointer goals; installed Codex 0.144.6 reports `goals` and `multi_agent` stable |
| Local Codex diagnostics          | Absolute installed binary `doctor --json` reports overall `ok`, config loaded, repository detected, and goal database integrity `ok`                                                                          |
| Formatting                       | `pnpm format:check` exit 0; all 465 files formatted                                                                                                                                                           |
| Playwright routes                | CLI 0.1.17 and Playwright Test 1.59.1 launch; headless session, snapshot, pointer/keyboard, resize, tabs, offline, console, requests, `run-code`, `eval`, and cleanup commands exist                          |
| Repository activation boundary   | HEAD unchanged at `6c3456ce...`; no staged path or product/test/migration/manifest/lockfile change; user-owned scratch remains the only tracked dirty path; scaffold still says not started                   |

The scaffold must not be activated as the long-running Goal until both Important findings are
corrected and independently re-reviewed in `SCAFFOLD-review-03.md`.

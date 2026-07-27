# HANDOFF — P21 final-audit COLLECTOR dispatch (revision 01 — executable completion gate) — to `p21-collector-01`

**To:** `p21-collector-01` — a fresh-context agent acting as the `human_scratch_implementer` in the
narrow role of FINAL-AUDIT EVIDENCE COLLECTOR. **From:** root coordinator. This is the goal's
completion gate. You do NOT implement, fix, or integrate anything. You RUN the full audit, observe,
and write your findings to exactly one file. You commit NOTHING.

## Literal coordinates

- **Package:** P21 (control; no scratch requirement, no marker).
- **BASE (last integration) `4c20206`; you operate at current HEAD `3b6a6b6`.** The only delta
  `4c20206..3b6a6b6` is root's own P21-dispatch docs commit (`PROGRESS.md` + `HANDOFF.md`, no
  product change) — that is the control plane, expected. The PRODUCT/collector range must stay
  EMPTY: you must NOT create any commit. At your handback HEAD must still be `3b6a6b6`; any new
  commit is a reconciliation event for root, not you.
- **Your ONLY persistent write:**
  `specs/007-human-scratch-completion/evidence/P21/implementation-01.md` (create the `evidence/P21/`
  directory). Do NOT write or edit any product/test/migration file, any other evidence/review file,
  any ledger (`PROGRESS.md`/`SCOPE.json`/`QUESTIONS.md`/`HANDOFF.md`/
  `DECISIONS.md`/`FINAL-AUDIT.md`), `tasks/**`, or `specs/human-scratch.md`. No `git add`/`commit`/
  `checkout`/`reset`/`branch`/`rebase`. You may create disposable browser/test/IndexedDB state and
  isolated synthetic users, then clean them up.

## Current verified state (root already established — re-verify, do not assume)

- All 31 feature packages P00–P20B `passed`; all 22 requirement rows `passed`; P21 is the only open
  package. Authorized checked HS IDs = 21 (HS-001..HS-021); FS-001 is markerless.
- Rolling scratch SHA `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` ==
  `sha256sum specs/human-scratch.md`; normalized scope byte-matches SCOPE (21 blocks / 0
  mismatches).
- FS-001 hard boundary: `specs/008-.../spec.md` sha256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441 bytes;
  `src/lib/domain/settlement.ts` blob `010f3c93582a2ce311594d4dde8464760ca49c43`.
- History is linear single-parent, no merges. Worktree carries only generated `next-env.d.ts` churn
  and an inert untracked `evidence/P08/implementation-01.md` stray (self-labeled "Intentionally
  UNCOMMITTED", references old BASE `97d85844`, outside every committed range). Classify that stray
  in your evidence; do not delete it.

## Audit contract — evidence must record, for every item: exact command(s), timestamp, status, duration, counts/seeds, reproduction, and sanitized output

1. **Reconciliation & provenance:** scope/package/review/integration/question/marker rows all agree
   with git; final repository provenance (HEAD, linear history, no merges); the 22 requirement rows
   and 21 authorized markers; confirm no unclassified drift.
2. **Dependency currency + P03 primary-source release-gate recheck** (versions still safe-chain).
3. **Migrations:** fresh migrate + supported-upgrade path; existing IndexedDB/vault compatibility.
4. **Gates:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and ALL
   unit/property/integration tests (`pnpm test`). Record exact pass/fail/skip counts and durations.
   Any `.ts`/`.tsx` oxfmt failure is blocking; `specs/**` markdown format failures are pre-existing
   and non-blocking (do NOT reformat `human-scratch.md`).
5. **E2E with retries disabled** (`pnpm test:e2e`), plus repeat the critical journeys enough times
   to expose flakes. Two residual flakes are already tracked and must be characterized, not papered:
   **`import.spec.ts:301`** (~1-in-489 vault-session race, Q-P20B-13) and the **`duplicates.test.ts`
   perf timing-ratio** unit flake (Q-P20A-05, passes in isolation). Report observed rates; a NEW
   flake or a logic failure is blocking.
6. **Security:** malicious cross-vault API/database/realtime/invite/auth attempts must be rejected;
   inspect logs/URLs/fixtures/storage for any secret or plaintext (vault master key, invite-fragment
   bearer secret, `crypto_box` secret material, seed phrase, recovery material,
   `SUPABASE_JWT_SECRET`, vault-derived presence key, vault plaintext). ANY real secret/plaintext
   exposure is BLOCKING and must be reported to root (SendMessage `main`) immediately.
7. **Performance:** large import/table/alias/automation/GC/allocation; duplicate-tab convergence;
   **sub-100ms allocation edits** and **near-linear ~100k/200ms settlement** evidence (or the
   canonical measured follow-up).
8. **Manual product journey** via disposable headless Playwright CLI + isolated users: recovery/
   passkey, vaults, imports/drop zones/provenance, transactions/empty rows, aliases, tags,
   allocations, automations, undo/redo, people/invites/realtime/presence, and marketing copy
   truthfulness. NEVER run Playwright with `--debug`/`--ui`/`--headed`/`show` (blocks on a GUI).
9. **Responsive/state matrix:** pointer/keyboard/focus; desktop + mobile; 320px reflow; 200% zoom;
   dark + reduced-motion; empty/loading/error/offline; refresh; multi-tab.
10. **Accessibility:** deterministic role/name/state snapshots and computed contrast ratios for
    focus/error/status/changed controls.
11. **Exhaustive FS-001 audit:** signed unit conservation; separate named production unit/property
    expectations AND separate named E2E expectations for EACH canonical example A–H; owner
    remainder/effective totals; reject-never-clamp; sole per-currency settlement engine; typed
    invalid-data issues; traceable obligations/source navigation; all P16C current mutation paths;
    the actual virtualized/historical/presence grid/add-row UX; and P17 complete-set API use.
12. **Throughout:** console + suspicious/failed network inspection; and restate the complete set of
    open Q proposals (Q-P20B-00 `pruneBuckets` CRDT data loss routed to the owning package;
    Q-P20B-13 / Q-P20A-05 flakes; Q-P17D-02 dead `description-rule-state.ts`; Q-P20A-02 stale
    XChaCha20 comments; Q-P20B-06/08 rule-vs-reality ts-pattern/branded-keys) so none is silently
    dropped.

Use only PROCESS-permitted CLI run-code/eval for observation/media/accessibility. Propose the
FINAL-AUDIT contents inside your evidence file — only root transcribes them, and only after an
independent reviewer PASS.

## Handback

SendMessage to `main` with: confirmation the tree is still at HEAD `3b6a6b6` with no new commits and
`git status --porcelain` proof; a top-line PASS-candidate/FAIL summary; the blocking findings (if
any); and the exact path `evidence/P21/implementation-01.md`. Any failing check, unexplained flake,
material UX/a11y/security/data/perf finding, false marketing claim, missing evidence, write-boundary
breach, or unclassified drift is a FAIL — report it honestly rather than papering it. Verify every
headline claim against git/commands before handing back.

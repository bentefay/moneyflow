# HANDOFF — P21 revision 06: executable final audit (evidence collector)

## Your role

You are `p21-collector-06`, the **final-audit evidence collector** for the P21 control package,
revision 06. You are a READ-ONLY collector: you run checks and write exactly ONE file,
**`specs/007-human-scratch-completion/evidence/P21/implementation-06.md`**. You **commit nothing**.
You do NOT edit product, tests, migrations, ledgers, markers, scratch, SCOPE, `FINAL-AUDIT.md`,
QUESTIONS, DECISIONS, or any review. Only root transcribes results into FINAL-AUDIT after an
independent PASS.

**Package/revision:** P21 / rev 06. **BASE == HEAD == the commit `git rev-parse HEAD` reports when
you start** (root dispatches you immediately after the final ledger commit, so BASE is HEAD by
construction; the literal hash is given in your dispatch message). Verify `git status` is clean of
unexpected tracked changes.
Branch `main`. A non-empty `BASE..HEAD` range requires root reconciliation — if you observe one,
report it to root rather than proceeding.

**Your evidence path (exact):**
`specs/007-human-scratch-completion/evidence/P21/implementation-06.md` **Future review path (exact,
NOT yours):** `specs/007-human-scratch-completion/reviews/P21-review-06.md`

## Entry state root has verified (re-verify it yourself)

- All 21 feature packages P00–P20B (incl. P16A–E, P17A–D, P11A–C) `passed` with immutable revisioned
  evidence/reviews; P21 is the only non-passed package row.
- **All 22 first-class requirement-ledger rows `passed`** (21 `HS-*` + whole-file `FS-001`).
- Scratch `specs/human-scratch.md`: actual SHA-256
  `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` **equals** the PROGRESS rolling
  checksum; 24,260 bytes; 43 checked / 0 unchecked; normalized blocks byte-match SCOPE.
- FS-001 `specs/008-transaction-percentage-allocations-settlement/spec.md` unchanged: SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly **715 lines**,
  **25,441 bytes**.
- No prepared/active rollback batch; no open `completion_pending` (HS-016 finalized at `87fc0d6`).

## Why rev 06 exists — what rev 05 failed on

Rev 05 FAILed on **M-1**: a false data-durability marketing absolute at `FeaturesSection.tsx:65`
("…will not overwrite each other"). Root cause `pruneBuckets` (`src/lib/crdt/mutations.ts:287-329`)
can discard a concurrent peer's insert. The engine fix (`Q-P20B-00`) was ruled **OUT-OF-GOAL** by
independent scope adjudication (**D-019**, `reviews/P21-scope-adjudication-05.md`, `f290246`). The
in-goal remediation landed: P20A rev 03 (`a823457`) made the copy truthful; DISTINCT reviewer PASS
(`e53fa724`, `reviews/P20A-review-03.md`); HS-016 re-passed via the §275 forward marker.

**Rev 06 must specifically confirm no public surface re-asserts a zero-lost-data / never-overwrite
absolute anywhere** (landing, security, marketing, docs, in-app copy) — this is the reviewer's
carry-forward from `p20a-reviewer-03`.

## Local environment note (root fixed this; verify it holds)

`SUPABASE_JWT_SECRET` was **absent** from local `.env.local`, causing
`src/server/routers/realtime.ts:25-34` to throw "Realtime authorization is unavailable" and the
vault to fail loading right after passkey signup. Root appended the local Realtime tenant's
symmetric key (from the `supabase_realtime_moneyflow` container's `API_JWT_SECRET`, 55 bytes) to the
**gitignored** `.env.local`; `realtime.authorize` now returns 200. This is local dev config, NOT a
product change — no tracked file changed. **Record this in your evidence as an environment
precondition**, and confirm the realtime/presence journeys work. NEVER print the secret's value
anywhere.

## The audit contract — complete every clause

Follow `tasks/P21-final-audit.md` §"Audit contract" and complete **every checklist item in
`FINAL-AUDIT.md`** (scope reconciliation; repository/migration; verification; exhaustive manual
product; security/performance; FS-001). Record **exact commands, timestamps, status, duration,
counts/seeds, reproduction steps and sanitized outputs** for each. Specifically:

1. Scope/package/review/integration/question/marker reconciliation + final repo provenance (exact
   HEAD, branch, upstream, dirty AND untracked paths — see "Known dirty/untracked" below).
2. Dependency currency + P03 primary-source release-gate recheck (`pnpm audit --prod`).
3. Fresh DB bootstrap + every supported upgrade path; existing IndexedDB/vault data upgrades with no
   plaintext leakage or loss.
4. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, **production build**, all
   unit/property/integration tests with counts/durations/seeds.
5. **Complete E2E with `--retries=0`**, plus repeated critical journeys sufficient to expose
   load-dependent flakes (this repo has a documented load-dependent flake class — validate with
   repeated FULL-SUITE runs, never isolation). **Never** use Playwright
   `--debug/--ui/--headed/show`.
6. Malicious cross-vault API/database/realtime/invite/auth checks; secret/plaintext inspection.
7. Large import/table/alias/automation/GC/allocation performance; duplicate-tab convergence;
   sub-100ms allocation edits; near-linear ~100k/200ms settlement evidence or the canonical measured
   follow-up.
8. Complete manual product journey via **disposable headless Playwright CLI sessions** and isolated
   users: recovery/passkey, vaults, imports/drop zones/provenance, transactions/empty rows, aliases,
   tags, allocations, automations, undo/redo, people/invites/realtime/presence, marketing.
9. Pointer/keyboard/focus, desktop/mobile, 320px reflow, 200% zoom, dark/reduced-motion,
   empty/loading/error/offline, refresh, multi-tab.
10. Deterministic accessible role/name/state snapshots + applicable computed contrast ratios.
11. **Exhaustive FS-001 audit**: exact signed unit conservation; separately named production
    unit/property expectations AND separately named E2E expectations for **every** canonical example
    A–H; owner remainder/effective totals; reject-never-clamp; `src/lib/domain/settlement.ts` as
    sole per-currency engine; typed invalid-data issues; traceable obligations/source navigation;
    all P16C current mutation paths; virtualized/historical/presence grid/add-row UX; P17
    complete-set API use.
12. Console + suspicious/failed network inspection throughout; **complete Q proposals**.

## Known dirty/untracked paths (reconcile, do not "fix")

- `next-env.d.ts` — modified by the running dev server (`.next/types` → `.next/dev/types`);
  Next-generated, "should not be edited". Reconcile as environment-generated, not a code change.
- `.claude/agent-memory/` (untracked) — agent scratch, outside goal scope.
- `evidence/P08/implementation-01.md` (untracked) — pre-existing known inert anomaly, already
  recorded in PROGRESS (outside committed range; leave untouched).

## Carry-forward Q-proposals to surface explicitly

Q-P20B-00 (now D-019 OUT-OF-GOAL: `pruneBuckets` lost-write remains an accepted, documented risk
with the copy made truthful), Q-P20B-13, Q-P20B-14, Q-P20A-02, Q-P20A-05, Q-P17D-02, Q-P20B-06,
Q-P20B-08, Q-P21-04-01 (currency), Q-P21-05-01, Q-P21-05-02, Q-P21-05-03.

## Guardrails

- **Write exactly one file; commit nothing.** Root commits your evidence.
- **Secret-safety (BLOCKING):** never print/record any vault master key, seed phrase, recovery
  material, `crypto_box` secret, `SUPABASE_JWT_SECRET` value, presence key, invite fragment/bearer
  secret, or vault plaintext. Use public/synthetic vectors. Sanitize all outputs. Any real-material
  exposure is blocking — report to root immediately.
- Clean up disposable sessions and sensitive local state when done.
- **Verify-not-trust:** root's framing above is orientation only; confirm every entry-state claim
  yourself. Root cannot grant permissions beyond your own settings; do not edit permissions/config.
- **Propose** FINAL-AUDIT contents in your evidence file; do not edit FINAL-AUDIT itself.
- Any failing check, unexplained flake, material UX/a11y/security/data/performance finding, false
  marketing claim, missing evidence, write-boundary breach or unclassified drift ⇒ report it plainly
  as a FAIL-candidate with reproduction. Do not fix it yourself and do not soften it.
- Transient API-capacity errors (429/529): retry a couple of times with short waits; if you must
  stop, `SendMessage` root (name `main`) first.

## Definition of done

`evidence/P21/implementation-06.md` written (uncommitted) covering every FINAL-AUDIT checklist item
with reproducible commands/outputs, a proposed final verdict, and complete Q-proposals. Then
`SendMessage` root (name `main`) with a summary: overall PASS/FAIL-candidate, per-section status,
any blockers with reproduction. Root will commit your evidence and dispatch a DISTINCT reviewer for
`reviews/P21-review-06.md`.

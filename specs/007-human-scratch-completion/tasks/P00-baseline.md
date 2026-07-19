# P00 — Executable Baseline Control Package

- **Status:** queued
- **Scope:** control package; no scratch requirement or marker
- **Owner:** `human_scratch_implementer` acting only as evidence collector
- **Independent gate:** `human_scratch_reviewer`
- **Allowed persistent implementer write:** exact dispatched `evidence/P00/implementation-<NN>.md`
  only
- **Allowed persistent reviewer write:** exact dispatched `reviews/P00-review-<NN>.md` only
- **Product/migration/test writes:** forbidden
- **Global ledger transcription:** root coordinator only
- **Expected range:** `BASE == HEAD`; a non-empty range requires root reconciliation before review

## Objective

Produce a truthful, reproducible starting baseline for the frozen 22-requirement Goal without fixing
or hiding any failure. Establish repository/worktree provenance, both frozen-source identities,
scope integrity, service/tool/browser state, quality/test results, flake evidence and a real
headless application smoke. P00 PASS means the baseline is complete and independently reproducible;
it does not mean every pre-existing check is green.

## Dispatch contract

Root must put literal values in HANDOFF before spawning:

- package `P00`, revision, task path and literal BASE;
- no allowed product paths;
- exact `evidence/P00/implementation-<NN>.md` output;
- expected HEAD equal to BASE;
- exact `reviews/P00-review-<NN>.md` future output; and
- complete pre-existing dirty/untracked inventory, especially user-owned scratch.

The collector must not edit BASELINE, PROGRESS, HANDOFF, QUESTIONS, FINAL-AUDIT, task files,
product, tests, migrations, package manifests/lockfiles, services or scratch. Read-only service
inspection and normal disposable browser test data are allowed. It writes only the assigned evidence
file and does not commit it.

## Collection checklist and evidence schema

Record timestamp, exact command/method, exit status, duration, concise output, evidence limitation
and secret-safety handling for:

1. HEAD, branch/upstream/remotes/worktrees and exact dirty/untracked/staged paths.
2. Actual scratch SHA, rolling SHA, 21 normalized blocks and any semantic drift.
3. Canonical feature-spec SHA-256
   `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exact 715-line and
   25,441-byte identity, whole-file FS-001 selector, no-mutation state, all 22 unique requirement
   mappings, reverse package mappings and DAG validity.
4. Node/pnpm/OS/Codex, manifest/lockfile, Playwright Test/CLI and installed browser
   revisions/caches.
5. tmux app process, URL readiness, Docker/Supabase containers, migrations and required variable
   names without values.
6. Full `pnpm format:check`, lint, typecheck, build, unit/property/integration and E2E with retries
   disabled; counts, durations, seeds and failure reproduction.
7. A repeat sample sufficient to expose baseline E2E flakiness.
8. Headless Playwright CLI high-level smoke: create/unlock identity/vault, imports, transactions,
   aliases, people, automations, navigation, refresh, duplicate tab, console and requests.
9. Deterministic changed/control accessibility baseline: snapshot role/name/state, keyboard/focus,
   320px reflow, 200% zoom, reduced-motion media emulation and applicable contrast values.
10. Known security, privacy, migration, data-loss, financial-correctness, performance, accessibility
    and UX risks.
11. Complete `Q-PROPOSAL-P00-*` entries where ambiguity remains; never edit QUESTIONS directly.

Use PROCESS's permitted repository CLI run-code route for reduced motion and observation. Close and
delete sessions and do not retain phrases, keys, tokens, real financial data or browser profiles.

## Ready-for-review checkpoint

Root verifies the collector wrote only the assigned evidence file and confirms `git rev-parse HEAD`
still equals BASE. Root then dispatches a distinct reviewer with literal equal BASE/HEAD, evidence
and a new exact review path. The reviewer must independently rerun a representative sample, validate
all claimed failures and ensure the baseline did not cause worktree/service mutation beyond
disposable test data.

## PASS, FAIL and transcription

- **PASS:** evidence is complete, accurate, reproducible, sanitized and correctly classifies every
  red result. Empty diff is explicitly recorded and does not weaken review.
- **FAIL:** missing/inaccurate evidence, unclassified drift, write-boundary breach, unrepeatable
  claims or an environment so unknown that later packages cannot safely start.
- On FAIL, root preserves the review, transcribes proposals and repeats P00 at the next revision.
- On PASS, root—not either worker—transcribes verified facts into BASELINE/PROGRESS/RISKS/DECISIONS/
  QUESTIONS, persists evidence/review in an integration-control commit and marks P00 passed.
- Product/environment defects discovered here are routed to P01 or the earliest owning package; P00
  agents do not fix them.

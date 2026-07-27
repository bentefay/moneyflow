# HANDOFF — P20B IMPLEMENT dispatch (revision 01 — HS-021 full-codebase style-guide sweep)

**To:** `p20b-implementer-01` (fresh implementer). **From:** root coordinator. You are the
IMPLEMENTER; a DISTINCT reviewer (`p20b-reviewer-01`) will review your work — never review your own.

**Package:** P20B — the SOLE package for **HS-021**: _"Do a sweep of the full code base for code
quality based on our style guide."_ Frozen source `specs/human-scratch.md:159`, exact text in
`SCOPE.json#HS-021`. Full brief:
`specs/007-human-scratch-completion/tasks/HS-021-code-quality-sweep.md` — read it in full; it is the
charter. This is the last feature-quality package before the P21 executable final audit.

**BASE = current HEAD `659ca20d9819b389ba100b052dfdbe2c0043affc`.** Commit forward on top of BASE in
coherent, reviewable sub-checkpoint commits. **No-checkout discipline: do NOT
checkout/reset/branch/switch/rebase.**

## What the sweep IS

1. **Bounded inventory first, then fixes.** Produce `evidence/P20B/implementation-01.md` (you may
   add more numbered files) with, BEFORE and alongside fixes: an inventory organized by `.claude`
   guide (general coding-style, TypeScript rules, and the component/CRDT/crypto/sync/tRPC/import/E2E
   skills) × subsystem, each finding with a file:line, the rule it violates, severity, and
   disposition (fixed here / deferred with a Q-proposal / no-action-justified). Record scanned paths
   and the tool queries you ran. Do not silently narrow the inventory — cover the whole first-party
   codebase.
2. **Fix concrete, demonstrated violations** in first-party code: correctness, type-safety
   (especially removing `as`/`any`/non-null `!` — see below), maintainability (dead code,
   duplication vs the "reuse before writing" rule, illegal-states-representable typing), boundary
   validation, named exports, Tailwind token/dark/responsive correctness, semantic/focus/keyboard
   a11y, CRDT draft-mutation + soft-delete rules, encrypted-sync/crypto safety, tRPC auth/permission
   gating, money-as-integer-minor-units + import rules, and E2E
   isolation/no-arbitrary-waits/flakiness.
3. **Add regression tests** for every behavior-changing fix; property/security tests where an
   invariant changes. Repeat every affected E2E journey with retries disabled and run a whole-suite
   flake sample.

## What the sweep IS NOT

- **No aesthetic churn, no unrelated redesign, no behavior change** except where fixing a
  demonstrated defect. Preserve behavior otherwise.
- **Do NOT weaken or delete a `.claude` rule to avoid a fix.** You MAY correct stale FACTUAL stack /
  convention text in `.claude/**` ONLY when repository reality proves it stale (e.g. a version or
  path that no longer matches) — cite the proof in evidence for each such edit. Rule-strength
  changes are out of scope; if a rule seems wrong, raise a Q-proposal instead.
- **Do NOT touch the frozen sources** `specs/human-scratch.md` and
  `specs/008-transaction-percentage-allocations-settlement/spec.md` — not one byte.
- **FS-001 hard boundary:** `src/lib/domain/settlement.ts` MUST stay byte-identical (blob
  `010f3c93582a2ce311594d4dde8464760ca49c43`). Do not modify it even if you spot a style nit — flag
  it as a deferred Q-proposal instead.
- **Do NOT edit root-owned files:** `PROGRESS.md`, `SCOPE.json`, `QUESTIONS.md`, `HANDOFF.md`,
  `DECISIONS.md`, `FINAL-AUDIT.md`, any `reviews/**`, or the `tasks/**` briefs. Your writes are
  product/test/`.claude` code + your own `evidence/P20B/**`.

## Hard repo rules (blocking)

- **NO new `as` / `any` / non-null `!` in product code** — repo-wide hard rule. Net direction must
  be DOWN, never up. Test-fixture casts tolerated only where existing precedent allows; product
  stays cast-free. If a genuine type hole forces a cast, raise a Q-proposal rather than adding one
  silently.
- **Secret-safety (blocking):** no vault master key, invite-fragment bearer secret, crypto_box
  secret material, seed phrase, recovery material, `SUPABASE_JWT_SECRET`, vault-derived presence
  key, or vault plaintext in code/logs/URLs/fixtures/evidence. Tests use public/synthetic vectors
  only. Any real-material exposure is a blocking finding — stop and report to root immediately.
- **Functional/immutable style**, established libraries over custom algorithms, money as integer
  minor units (`toMinorUnitsForCurrency()`), client-side encryption invariants intact.
- **Playwright:** never run with `--debug`, `--ui`, `--headed`, or `show` (blocks on a GUI). Clean
  up sessions/evidence. No secret material in any captured evidence.
- **No parentheses in commit messages.**

## Manual Playwright CLI charter

Per the brief's exhaustive charter: after the sweep, smoke every top-level page and critical journey
(create/unlock, imports, transactions, aliases/tags/allocations/automation,
people/invites/realtime/presence, settings) across pointer/keyboard, desktop/mobile, dark/reduced
motion, empty/loading/error/offline, refresh, duplicate tabs, isolated users. Inspect all console
errors/warnings and failed/suspicious network requests. Record what you exercised and any defects in
evidence. Headless only.

## Gates — run ALL and report REAL counts

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`, plus `pnpm build`.
`format:check` failing only on pre-existing `specs/**` markdown is non-blocking; any `.ts`/`.tsx`
you touched failing oxfmt is blocking (`pnpm format` your own files). Report the real counts, not
"passing".

## Handback

When done, SendMessage to `main` with: final HEAD SHA + the linear chain from `659ca20`; a summary
of the inventory (counts by severity, fixed vs deferred) with the evidence path; the exact list of
`.claude/**` factual edits (if any) with proof; explicit confirmation that (a) frozen sources +
`settlement.ts` are byte-identical, (b) no new `as`/`any`/`!` in product code (ideally a net
reduction, with the before/after count), (c) no secret material anywhere, (d) all gate counts real,
(e) regression tests added for behavior-changing fixes, (f) E2E flake sample result. List every
Q-proposal you raised for root. Do not checkout/reset. Verify your own claims against git before
handing back.

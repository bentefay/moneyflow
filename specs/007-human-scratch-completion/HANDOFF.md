# HANDOFF — P20B revision 06 (HS-021 code-quality sweep: E2E eager-assertion flake class)

- **Package:** P20B (feature — full-codebase style-guide / code-quality sweep). **Requirement:**
  HS-021. **Revision:** 06 (reopened by the P21 rev-04 audit FAIL; HS-021 rolled back via
  `RB-P21-04`).
- **You are the IMPLEMENTER.** Fix the two E2E stability blockers below, validate them the ONLY way
  that is valid for this flake class (repeated FULL-SUITE load — see the VALIDATION MANDATE), write
  evidence, and commit. A DISTINCT reviewer verifies afterward under load; do not mark HS-021 passed
  yourself.
- **BASE = current `main` tip** (`git rev-parse HEAD` — a root docs commit `fd67ec1`). The product
  tree at BASE is byte-identical to the last product commit `371a88a`; your commits advance product
  beyond it. Root will verify your handback with `git diff <BASE> HEAD`.
- **Authoritative context — read these first:**
    - `reviews/P21-review-04.md` (the DISTINCT reviewer's formal FAIL — full mechanism for both
      blockers, independently confirmed by root).
    - `QUESTIONS.md` → **Q-P20B-19** (F-2, identity) and **Q-P20B-18** (F-1, import cohort).
    - `evidence/P21/implementation-04.md` (collector evidence).

## The two blockers

### F-2 (Q-P20B-19) — `identity.spec.ts:282` re-flake; the rev-02 fix cannot prove hydration

Test `tests/e2e/identity.spec.ts:282` "unlock journey: enter seed phrase and access transactions",
step "validate BIP39 words with visual feedback", assertion `:359`
`expect(firstInput).toHaveClass(/border-green-500/)` — first input observed with `value=""` under
load.

**Root cause (confirmed by source, not guessed).** `SeedPhraseInput.tsx:329-332` is a fully
controlled input (`value={word}` off `useState`). The P20B rev-02 fix guards with `toBeEditable()` →
`fill()` → `toHaveValue()`. But `src/components/ui/button.tsx:50` gates rendering on
`useIsHydrated()` while `src/components/ui/input.tsx` has **no such gate** (verify:
`grep -n useIsHydrated src/components/ui/button.tsx src/components/ui/input.tsx`). So
`toBeEditable`/`toBeEnabled` is a real hydration proof for a `Button` and **no proof at all** for an
`Input`, which is editable from first paint. A pre-hydration `fill` sets the DOM value (so
`toHaveValue` passes) but React never runs `onChange`; the next commit clobbers it back to `""`, so
the validity class never applies.

**Fix — two acceptable routes (your call; state which and why):**

1. **Test-side (preferred, least blast radius):** make the fill happen only after hydration, using a
   deterministic hydration signal — e.g. wait for a control that IS hydration-gated (a `Button`
   using `useIsHydrated`, such as the unlock/continue action) to be enabled BEFORE filling the seed
   inputs, then assert. Assert on post-state-propagation evidence (the validity class the onChange
   drives), not the raw DOM value. Reuse the working idiom in `helpers/auth.ts:20` where it fits.
2. **Source-side (closes the class at the root):** give `src/components/ui/input.tsx` the
   `useIsHydrated` treatment `button.tsx` has. NOTE the UX trade-off: gating input editability on
   hydration can delay interactivity for real users — only take this route if it does not regress
   the typing UX, and cover it with the full check suite. This is a product change within P20B's
   remit; keep it functional/immutable and **NO `as`/`any`/`!`**.

### F-1 (Q-P20B-18) — eager `toBeVisible` default-timeout cohort

`tests/e2e/import.spec.ts:1512` (test declared at `:1445`) asserts
`await expect(page.getByText(/6 rows/i)).toBeVisible({ timeout: 5000 })` immediately after
`setInputFiles`, racing async file-read → CSV parse → template sort → render under 4-worker load.
`{ timeout: 5000 }` merely pins Playwright's DEFAULT expect timeout — it looks like a wait but
grants no slack. `:1512` is the SECOND import in its test (extra template sort/apply) = the most
load-exposed instance.

**Fix the CLASS, not the one line.** `toBeVisible({ timeout: 5000 })` appears exactly **13×** in two
files: **8 in `import.spec.ts`** (incl. `:1279 :1412 :1459 :1512 :1539 :1616`) and **5 in
`transactions.spec.ts`**. Confirm the exact set yourself:
`grep -n "toBeVisible({ timeout: 5000 })" tests/e2e/import.spec.ts tests/e2e/transactions.spec.ts`.
Replace each with a deterministic settle wait sized like the file's existing principled siblings
(e.g. `transactions.spec.ts:578` uses `{ timeout: 15_000 }`) — a real wait on the post-parse/render
signal, not a blind mask. `git log -- tests/e2e/import.spec.ts` shows no prior P20B rev ever touched
that file; it is the spec every sweep skipped.

## VALIDATION MANDATE (this is why rev 02 regressed — do NOT repeat it)

- **Validate ONLY with repeated FULL-SUITE runs:**
  `pnpm exec playwright test --retries=0 --reporter=list`, **at least 8 times**. Record per-run
  pass/fail counts.
- **Isolation runs are USELESS as validation** — the rev-02 fix passed `identity.spec.ts` 9/9 in
  isolation and still regressed under 4-worker load (`reviews/P20B-review-02.md:39-45`). A test can
  be 20/20 in isolation and fail under full-suite parallelism. Isolation is fine only to
  _characterise_ a failure, never to _prove_ a fix.
- This flake class is environment-dependent: a clean run in your environment does not prove the fix
  holds everywhere, so the fix must be principled (address the hydration / async-render race by
  construction), not merely "green on my machine". Explain WHY each change eliminates the race.
- NEVER run Playwright with `--debug`, `--ui`, `--headed`, or `show`. Note the local DB may be empty
  (a prior audit ran `pnpm db:reset`) — bootstrap before E2E.

## Allowed writes

- `tests/e2e/identity.spec.ts`, `tests/e2e/import.spec.ts`, `tests/e2e/transactions.spec.ts` (and
  any E2E helper you must touch, e.g. `tests/e2e/helpers/*`).
- IF you take the F-2 source route: `src/components/ui/input.tsx` (and only what that requires).
- `specs/007-human-scratch-completion/evidence/P20B/implementation-07.md` (your evidence — NOTE the
  +1 skew: rev 06 files to implementation-07.md; `implementation-06.md` is the frozen, cited rev-05
  artifact and MUST NOT be touched).
- Do NOT edit any other product code, any ledger (`PROGRESS.md`/`QUESTIONS.md`/`HANDOFF.md`/
  `FINAL-AUDIT.md`), the frozen `specs/human-scratch.md`, or `settlement.ts` (blob
  `010f3c93582a2ce311594d4dde8464760ca49c43` must stay byte-identical). Leave the two inert strays
  (`next-env.d.ts`, untracked `evidence/P08/implementation-01.md`) untouched.

## Before handback (CLAUDE.md — run ALL, fix everything, then commit)

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` — plus the ≥8
full-suite `--retries=0` campaign above. `pnpm lint` must be 0 errors (the one
`TransactionTable.tsx:401` react-hooks/incompatible-library WARNING is known-acceptable);
`format:check` may flag only frozen `specs/**` md. **NO `as`/`any`/`!` in product code.** Commit
your own work (product + evidence) with an explicit pathspec; **no parentheses in commit messages**;
use `bat -P` not `cat`.

## Output + reporting

- Write full evidence to `evidence/P20B/implementation-07.md`: the F-2 route chosen + why, the F-1
  cohort diff, your ≥8-run full-suite campaign table (per-run pass/fail, call out
  `identity.spec.ts:282` and `import.spec.ts:1512` explicitly), and a secret-safety self-scan.
- SECRET-SAFETY (blocking): never print/commit any vault master key, seed phrase, recovery material,
  `crypto_box` secret, `SUPABASE_JWT_SECRET`, vault presence key, or vault plaintext. Synthetic
  vectors only. Any real-material leak is blocking — report to root and stop.
- You are an automated task, NOT the human user; you cannot self-escalate permissions or mark HS-021
  passed. If you need to write outside your allowed set, STOP and ask root via SendMessage.
- Report to root (`main` / `team-lead`) via SendMessage: your handback HEAD, the F-2 route, the F-1
  cohort count fixed, your full-suite run count + per-run results, and any material finding.

## After your handback (root, not you)

Root verifies your handback read-only (delta touches only allowed paths, frozen sources +
`settlement.ts` byte-identical, no new `as`/`any`/`!`), then dispatches a DISTINCT
`p20b-reviewer-06` to confirm under repeated full-suite load. On PASS root integrates, re-passes
HS-021, re-applies the forward marker `[] → [x]` at scratch `:159` (rolling
`f46c2d35… → 469e98c7…`), and opens P21 rev 05.

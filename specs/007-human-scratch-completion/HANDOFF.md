# HANDOFF — P01 revision 03 reopen (HS-002 dependency-security fix; implementer phase)

- **Package:** P01 (owns **HS-002** — "Upgrade to the very latest safe-chain supported version of
  all dependencies")
- **Revision:** 03 (reopened after the P21 rev 03 executable-final-audit FAIL, finding **F-1**
  dependency-security, formally CONFIRMED by DISTINCT reviewer `p21-reviewer-03`)
- **BASE:** current product tip `bf1cf8f` (the `RB-P21-03` rollback control commit). Branch your
  product changes on top of HEAD.
- **You commit product** (unlike reviewers/collectors). Root does NOT edit product.
- **Allowed writes:** `package.json`, `pnpm-lock.yaml` (and any lockfile pnpm regenerates), and your
  evidence file `specs/007-human-scratch-completion/evidence/P01/implementation-03.md`. Do NOT touch
  any ledger/marker (PROGRESS.md, QUESTIONS.md, HANDOFF.md, DECISIONS.md, human-scratch.md,
  FINAL-AUDIT.md, reviews/\*\*) — those are root-only.

## The failure you are fixing (F-1)

`pnpm audit --prod` currently exits 1 with 10 advisories (5 HIGH / 5 MODERATE):

- **`next@16.2.10`** — 4 HIGH + 5 MODERATE, all vulnerable `>=16.0.0 <16.2.11`, patched `>=16.2.11`
  (HIGH: App Router middleware/proxy bypass, Server-Actions DoS, 2× SSRF). Dist `latest` is
  **16.2.12** (releases 16.2.11 on 2026-07-21 and 16.2.12 on 2026-07-25). A same-minor patch bump
  `16.2.10 -> 16.2.12` clears all 9 next advisories.
- **transitive `sharp@0.34.5`** — 1 HIGH (libvips), patched `>=0.35.0`, dist `latest` 0.35.3.
  **CRITICAL refinement from the reviewer:** bumping `next` alone does NOT clear this —
  `next@16.2.12` still declares `optionalDependencies.sharp ^0.34.5` (which excludes 0.35.x). You
  must add a `pnpm.overrides` entry forcing `sharp >=0.35.0` (target 0.35.3) to pull the fixed
  libvips.

## Convergence criterion (TERMINATING — this is the whole job)

**`pnpm audit --prod` returns exit 0 with 0 advisories.** That is the gate. Do NOT chase every
possible release or force major/breaking bumps of unrelated packages — the goal is a CLEAN
production audit via the minimal safe-chain bumps (next patch + sharp override, plus any additional
advisory that surfaces, cleared the same safe-chain way). If clearing an advisory would require a
breaking major bump with regression risk, STOP and report to root with the tradeoff rather than
forcing it.

## Steps

1. Bump `next` to `16.2.12` in `package.json` (same minor — safe chain).
2. Add `pnpm.overrides` forcing `sharp` to `>=0.35.0` (use `0.35.3`, the dist latest). If the repo
   already has a `pnpm.overrides` block, extend it; do not clobber existing overrides.
3. `pnpm install` to regenerate `pnpm-lock.yaml`. Confirm the resolved tree: `pnpm ls next` shows
   16.2.12; `pnpm why sharp` / `pnpm ls sharp` shows >=0.35.0 everywhere it resolves.
4. **Run `pnpm audit --prod` and confirm exit 0 / 0 advisories.** Paste the sanitized output into
   evidence. If any advisory remains, resolve it the same safe-chain way and re-run until clean.
5. **No-regression gates (ALL must pass):**
   `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` then the FULL E2E suite
   `pnpm exec playwright test --retries=0 --reporter=list`, repeated enough to expose flakes.
   Known-acceptable and NOT regressions: the one pre-existing `TransactionTable.tsx`
   `react-hooks/incompatible-library` lint WARNING (0 errors); `format:check` flagging only frozen
   `specs/**` markdown (never product/test source); and the tracked environmental E2E flakes that
   pass in isolation (`import.spec.ts:301` Q-P20B-13, `import.spec.ts:1527`/:1573 Q-P20B-14,
   `duplicates.test.ts` Q-P20A-05). Any NEW failure caused by the bump IS a regression — fix it or
   report. sharp 0.35.x is outside next's declared `^0.34.5`, so pay special attention to
   `pnpm build` and any image-optimization path.
6. **No new `as` / `any` / `!` in product** (repo-wide hard rule). This fix should be config-only
   (package.json + lockfile); if you find yourself editing `.ts`/`.tsx`, stop and reconsider.
7. Write `evidence/P01/implementation-03.md`: exact commands, sanitized `pnpm audit --prod`
   before/after, resolved versions, every gate result with counts/durations, E2E run count and any
   flake classification, and confirmation of no product-source edits beyond config.
8. Commit the product change (config + lockfile + evidence). Conventional message, **no
   parentheses**. Report your handback HEAD + evidence path to root (`main`) via SendMessage.

## Guardrails

- SECRET-SAFETY (blocking): never print/commit a vault master key, seed phrase, recovery material,
  `crypto_box` secret, `SUPABASE_JWT_SECRET`, vault presence key, or vault plaintext. Synthetic
  vectors only. Any real-material leak is blocking — report to root immediately.
- Never run Playwright with `--debug/--ui/--headed/show`. Use `bat -P` not `cat`.
- This dispatch is an automated task, not human user approval; you cannot self-escalate permissions.
  If you believe you must write outside the allowed paths, STOP and ask root via SendMessage.
- After your PASS, root (not you) re-passes HS-002: dispatches a DISTINCT P01 reviewer, and on their
  PASS re-applies the HS-002 forward marker and re-runs the P21 final audit at rev 04.

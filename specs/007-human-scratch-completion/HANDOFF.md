# HANDOFF — P01 revision 03 INDEPENDENT REVIEW (HS-002 dependency-security fix; reviewer phase)

- **Package:** P01 (owns **HS-002** — "Upgrade to the very latest safe-chain supported version of
  all dependencies")
- **Revision:** 03 (implementer handback COMPLETE; this is the distinct-reviewer phase)
- **You are the DISTINCT reviewer.** You did NOT implement this fix. Rule from the frozen text and
  the committed tree; default to blocking on genuine ambiguity.
- **HANDBACK HEAD to review:** `371a88a` (on `main`). The implementer's product delta is
  `git diff f785de9..371a88a` — exactly 4 files.
- **You do NOT edit product or ledgers.** Your ONLY allowed write is your review file
  `specs/007-human-scratch-completion/reviews/P01-review-03.md`. Commit nothing else. Leave the tree
  byte-identical to `371a88a` (the two inert strays `next-env.d.ts` (M) and untracked
  `evidence/P08/implementation-01.md` are pre-existing — do NOT touch, stage, or commit them).

## What HS-002 requires (frozen)

"Upgrade to the very latest **safe-chain supported** version of all dependencies." The environment
ships the `safe-chain` supply-chain tool (on PATH) enforcing a minimum-package-age policy.
"Safe-chain supported" = the latest version safe-chain permits (age-clean), NOT the absolute dist
`latest` if that release is age-suppressed. The fix must NOT bypass the age policy.

## The fix under review (config-only)

- `package.json`: `next` 16.2.10 -> **16.2.11** (16.2.12 is age-suppressed by safe-chain; 16.2.11 is
  the latest safe-chain-supported release; clears all 9 `next` advisories, patched `>=16.2.11`).
- `pnpm-workspace.yaml`: ONE added `overrides` entry `"sharp@<0.35.0": 0.35.3` (transitive libvips
  HIGH, patched `>=0.35.0`). pnpm 11 ignores `package.json` `pnpm.overrides`, so the workspace
  `overrides:` block is the correct mechanism.
- `pnpm-lock.yaml`: regenerated (diff limited to next + sharp/@img sub-packages).
- `evidence/P01/implementation-03.md`: the implementer's evidence.

## Convergence gate (TERMINATING — the whole point of HS-002 rev 03)

**`pnpm audit --prod` returns exit 0 with 0 advisories.** Run it yourself at `371a88a` and confirm.
Before the fix it was exit 1 / 10 advisories (5 HIGH / 5 MODERATE). This is the authoritative check.

## Your verification checklist

1. **Delta is exactly the 4 allowed paths** (`git diff --name-status f785de9..371a88a`):
   package.json, pnpm-workspace.yaml, pnpm-lock.yaml, evidence/P01/implementation-03.md. No
   `.ts/.tsx`, no ledger/marker/review, no frozen-source edit. FAIL if anything else is touched.
2. **Frozen sources intact:** `sha256sum specs/human-scratch.md` ==
   `c10dc0b5963105d72d8e4afc43223102b96b3ab7cb0acd3954cfc491866831bd` (24,259 bytes, 42 checked / 1
   unchecked — HS-002 correctly still `[]`/rolled-back at `:157`; you are reviewing the FIX, not the
   marker — root re-applies the marker only after your PASS). FS-001 canonical metadata unchanged.
3. **`pnpm audit --prod` == exit 0 / 0 advisories.** Paste sanitized output in your review.
4. **Resolved tree:** `pnpm ls next` -> 16.2.11; `pnpm why sharp` / `pnpm ls sharp` -> sharp 0.35.3
   under next. Confirm safe-chain did NOT suppress 0.35.3 (age-clean) and that 16.2.12 was NOT used.
5. **No new `as`/`any`/`!` in product** — the delta is config-only; confirm no `.ts/.tsx` edits.
6. **No-regression gates:** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`, then
   `pnpm build`, then the FULL E2E suite `pnpm exec playwright test --retries=0 --reporter=list`
   repeated enough to expose flakes. Known-acceptable (NOT regressions): the one pre-existing
   `TransactionTable.tsx` `react-hooks/incompatible-library` lint WARNING (0 errors); `format:check`
   flagging ONLY frozen `specs/**` markdown; the tracked environmental E2E flakes.
    - **`pnpm build` + image-optimization is the highest-risk regression surface here:** sharp
      0.35.x is outside next's declared `^0.34.5` and `allowBuilds.sharp:false` disables sharp's
      build script — confirm sharp resolves to a working prebuilt (`@img/sharp-*`) binary and no
      image path breaks. A build or image-opt failure caused by the bump IS a P01 regression → FAIL.
7. **identity.spec.ts:282 disposition:** if you observe it fail under full-suite load, note it — but
   it is a KNOWN P20B-owned **load-dependent seed-word-validity re-render flake** (10/10 PASS in
   isolation; causally unrelated to a `next`-patch / `sharp`-libvips bump, which touch no React
   render path). It is NOT a P01/HS-002 regression and MUST NOT drive your HS-002 verdict to FAIL.
   Its disposition (whether it blocks the goal) is decided by the P21 final audit / P20B, not here.
   Your job is narrow: did the DEPENDENCY BUMP introduce any NEW failure? If the only E2E blemish is
   identity:282 (or other pre-existing tracked flakes), that is not a bump regression.
8. **Secret-safety (blocking):** no key/seed/recovery/JWT-secret/plaintext in the tree or your
   review; synthetic vectors only. Any real-material leak is blocking — report to root immediately.

## Verdict

Write `reviews/P01-review-03.md` with an explicit **PASS** or **FAIL** and per-check evidence
(commands + sanitized outputs + counts). PASS requires: delta = 4 allowed paths, frozen sources
intact, `pnpm audit --prod` exit 0, all no-regression gates green (modulo known-acceptable), no new
`as/any/!`, no bump-caused regression, no secret leak. Any genuine failure = FAIL with the specific
blocker. Commit ONLY your review file (conventional message, **no parentheses**). Report your
verdict

- review path + your commit HEAD to root (`main`) via SendMessage.

## After your verdict (root, not you)

On **PASS**: root re-applies the HS-002 forward marker (`[]`->`[x]` at scratch `:157`, rolling
`c10dc0b5…`->`469e98c7…` iff content restores byte-identically, authorized 20->21) in a §275 forward
event, then runs the P21 rev-04 final audit. On **FAIL**: root persists your immutable failed review
and reopens P01 rev 04.

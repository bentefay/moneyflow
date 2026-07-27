# HANDOFF — P21 revision 03 formal review (DISTINCT reviewer; verdict phase)

- **Package:** P21 (control — executable final audit / completion gate)
- **Revision:** 03 — **formal reviewer verdict** on the `p21-collector-03` FAIL-candidate
- **You are DISTINCT:** you are NOT `p21-collector-03` and NOT any P20B implementer/reviewer. Fresh
  context. Rule from the evidence and your own independent reruns — do not defer to the collector.
- **BASE:** the current docs-only tip, with product integration `127990a` underneath. The docs-tip
  hash may advance between now and dispatch; do NOT pin it. Confirm PRODUCT identity at start AND
  end via an EMPTY `git diff 127990a HEAD -- . ':(exclude)specs'` — the product tree must be
  byte-identical to `127990a`.
- **Allowed reviewer write (ONLY):** `specs/007-human-scratch-completion/reviews/P21-review-03.md`
- **Forbidden:** any product/migration/test write; any commit; any edit to FINAL-AUDIT.md,
  PROGRESS.md, QUESTIONS.md, DECISIONS.md, HANDOFF.md, human-scratch.md, or any ledger/marker. You
  commit NOTHING.

## Why you exist (do not skip)

The collector `p21-collector-03` returned a **FAIL-candidate** on a single blocking finding **F-1**
(dependency-security). A collector verdict is a CANDIDATE only. §275's marker-rollback machinery
requires an IMMUTABLE FAILED REVIEW as precondition, and per §114 the FORMAL P21 verdict comes from
a DISTINCT reviewer — you. Root will NOT roll back HS-002 / reopen P01 until your formal verdict
lands. Precedent: rev 01 and rev 02 both had distinct-reviewer FAIL artifacts, and rev 02's reviewer
OVERTURNED one collector finding — so your independent judgment genuinely matters. Do not
rubber-stamp.

## The candidate finding to adjudicate

- **F-1 (dependency-security, claimed BLOCKING):** `pnpm audit --prod` reports 10 advisories
  (collector: 5 HIGH / 5 MODERATE). `next@16.2.10` is claimed vulnerable to `>=16.0.0 <16.2.11` with
  HIGH App-Router auth-bypass + SSRF advisories, patched `>=16.2.11` (releases 16.2.11 on 2026-07-21
  and 16.2.12 on 2026-07-25 both predate this audit). Transitive `sharp` HIGH claimed fixed
  `>=0.35.0`.
- Root independently reproduced `pnpm audit --prod` and saw the same class of result. **You must
  reproduce it yourself, from a clean tree, and rule independently.**

## Your charter (efficient, bounded — the FAIL is already narrowed to F-1)

1. **Confirm the PRODUCT tree matches `127990a`** via an empty
   `git diff 127990a HEAD -- . ':(exclude)specs'`, and a clean audited scratch state:
   `sha256sum specs/human-scratch.md` ==
   `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a`, 24,260 bytes, 43 checked / 0
   unchecked, HS-002 marker `[x]` at `:157`. If the tree is drifted, STOP and report to root.
2. **Independently reproduce F-1:** run `pnpm audit --prod` yourself. Record exact advisory count
   and severities, the installed `next` version (`pnpm ls next` /
   `node -p "require('next/package.json').version"`), the vulnerable-range and patched-range for
   each HIGH advisory, and whether a safe-chain upgrade exists (i.e. is there a published `next` in
   the compatible range that clears the HIGH advisories, and likewise `sharp >=0.35.0`). Determine:
   **is F-1 a real, currently-unpatched-in-our-tree security gate failure?** A clean
   `pnpm audit --prod` would REFUTE it; a HIGH advisory against an installed, upgradable dependency
   CONFIRMS it.
3. **HS-002 scope check:** HS-002 = "Upgrade to the very latest safe-chain supported version of all
   dependencies." Independent of CVE severity, is the installed tree actually on the latest
   safe-chain versions, or has it drifted behind available safe upgrades? Note your finding.
4. **Sanity-check the collector's GREEN claims** for gross fabrication only (you need NOT re-run the
   full E2E suite — rev 04 will re-audit everything on the bumped tree): spot-confirm the ledger
   package/requirement reconciliation is internally consistent, and that no OTHER blocking finding
   is hiding in `evidence/P21/implementation-03.md`. If you find an ADDITIONAL blocking issue,
   report it.
5. **Secrets:** never print vault master key, seed phrase, recovery material, crypto_box secret,
   SUPABASE_JWT_SECRET, presence key, or vault plaintext. Synthetic vectors only. Any real-material
   leak is BLOCKING — report to root immediately.

## Verdict

Write `reviews/P21-review-03.md` with an explicit **PASS** or **FAIL**, the exact commands +
sanitized outputs you ran, and your independent ruling on F-1 (CONFIRMED / OVERTURNED, with
reasoning). If F-1 is confirmed (or any other blocking issue is found), the verdict is **FAIL**.
Report your formal verdict with the review path to root (`main`) via SendMessage — root alone acts
on it (persist review → §275 `RB-P21-03` → reopen P01). Never use parentheses in any git commit
message (you commit nothing). Use `bat -P` not `cat`. Never run Playwright with
`--debug/--ui/--headed/show`.

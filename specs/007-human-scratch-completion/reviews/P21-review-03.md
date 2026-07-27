# P21 Review — Revision 03 (DISTINCT formal reviewer verdict)

## VERDICT: **FAIL**

- **Package:** P21 (control — executable final audit / completion gate)
- **Revision:** 03 — formal DISTINCT-reviewer verdict on the `p21-collector-03` FAIL-candidate
- **Reviewer:** `p21-reviewer-03` (fresh context; NOT the collector, NOT any P20B agent)
- **Adjudicated finding:** **F-1 (production dependency-security)** → **CONFIRMED**
- **Environment:** Node `v22.21.1`, pnpm `11.13.1`, Linux. Audit run UTC 2026-07-28.
- **Basis:** independent reruns from a clean, BASE-identical tree. Not a rubber-stamp; F-1 is
  reproduced first-hand and materially true at the completion gate.

---

## 1. Start-check — product identity and audited scratch state (PASS)

| Check                     | Command                                        | Result                                                                                      |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Product tree == `127990a` | `git diff 127990a HEAD -- . ':(exclude)specs'` | **EMPTY** (exit 0) — byte-identical                                                         |
| HEAD                      | `git rev-parse HEAD`                           | `b39764dd597fbc11dbc497146e92bfb6016ebf44`                                                  |
| BASE..HEAD delta          | `git diff --name-only 127990a HEAD`            | only `specs/007-.../{HANDOFF,PROGRESS,QUESTIONS}.md` — docs-only, no product/test/migration |
| Scratch SHA-256           | `sha256sum specs/human-scratch.md`             | `469e98c7c8ee842acfc08e0844a47b4bc6495111b0463d8ca14727d3949d2f6a` ✓                        |
| Scratch bytes             | `wc -c`                                        | **24,260** ✓                                                                                |
| Marker counts             | `grep -cE '^\s*- \[x\]' / '- \[ \]'`           | **43 checked / 0 unchecked** ✓                                                              |
| HS-002 marker             | `sed -n '157p'`                                | `- [x] Upgrade to the very latest safe-chain supported version of all dependencies` ✓       |

The product tree is the clean audited state. No drift. Proceeding to the verdict on the merits.

## 2. F-1 reproduction — `pnpm audit --prod` (CONFIRMED)

Command: `pnpm audit --prod` → **exit 1**, **10 vulnerabilities: 5 high | 5 moderate**. Reproduced
first-hand; identical class to the collector's evidence and to root's independent run.

Installed `next` version (`node -p "require('next/package.json').version"`, `pnpm ls next`):
**`16.2.10`**. Installed transitive `sharp` (`pnpm why sharp --prod`): **`0.34.5`**
(`.>next>sharp`).

### HIGH advisories (5)

| #   | Package (installed)         | Advisory                                                                            | Vulnerable range    | Patched     |
| --- | --------------------------- | ----------------------------------------------------------------------------------- | ------------------- | ----------- |
| 1   | `next@16.2.10`              | App Router Middleware/Proxy bypass (Turbopack, single locale) — GHSA-6gpp-xcg3-4w24 | `>=16.0.0 <16.2.11` | `>=16.2.11` |
| 2   | `next@16.2.10`              | DoS in App Router via Server Actions — GHSA-m99w-x7hq-7vfj                          | `>=16.0.0 <16.2.11` | `>=16.2.11` |
| 3   | `next@16.2.10`              | SSRF in Server Actions on custom servers — GHSA-89xv-2m56-2m9x                      | `>=16.0.0 <16.2.11` | `>=16.2.11` |
| 4   | `next@16.2.10`              | SSRF in rewrites via attacker-controlled destination hostname — GHSA-p9j2-gv94-2wf4 | `>=16.0.0 <16.2.11` | `>=16.2.11` |
| 5   | `sharp@0.34.5` (transitive) | libvips inherited vulns CVE-2026-33327/33328/35590/35591 — GHSA-f88m-g3jw-g9cj      | `<0.35.0`           | `>=0.35.0`  |

### MODERATE advisories (5) — all `next@16.2.10`, all `>=16.0.0 <16.2.11`, patched `>=16.2.11`

Cache confusion of response bodies (GHSA-68g3-v927-f742); cache confusion with invalid-UTF-8 bodies
(GHSA-4633-3j49-mh5q); unbounded Edge Server-Action payload (GHSA-4c39-4ccg-62r3);
image-optimization DoS via SVGs (GHSA-q8wf-6r8g-63ch); unauthenticated disclosure of internal
Server-Function endpoints (GHSA-955p-x3mx-jcvp).

Tally: **9× `next`** (4 HIGH + 5 MODERATE) + **1× `sharp`** (HIGH) = 10 = 5 HIGH / 5 MODERATE.
Matches the collector's `evidence/P21/implementation-03.md` §2/§13 exactly.

### Safe-chain upgrade availability (registry.npmjs.org)

- `next` dist-tag `latest` = **`16.2.12`**. Release times: `16.2.10` 2026-07-01, **`16.2.11`
  2026-07-21**, **`16.2.12` 2026-07-25** — all published BEFORE this audit (2026-07-28).
- `next@16.2.11` / `16.2.12` are same-minor **patch** bumps from the pinned `16.2.10` (package.json
  `dependencies.next` = exact `"16.2.10"`). Their patched range `>=16.2.11` clears **all 9 `next`
  advisories**. This is a compatible safe-chain upgrade — the literal HS-002 / P01 mandate.
- **`sharp` nuance (my independent refinement):** bumping `next` alone does NOT clear the `sharp`
  HIGH. `next@16.2.12` still declares `optionalDependencies.sharp = "^0.34.5"` (i.e.
  `>=0.34.5 <0.35.0`), so a plain next bump keeps `sharp@0.34.x`. `sharp` dist `latest` = `0.35.3`
  (patched). Clearing the `sharp` HIGH therefore requires an explicit `pnpm.overrides` / resolution
  forcing `sharp >=0.35.0` — still upgradable, but a separate step from the next bump. The collector
  treated the `sharp` HIGH as a distinct item and did not claim the next bump fixes it; that framing
  is accurate.

### Ruling on F-1: **CONFIRMED**

Per the audit contract (`tasks/P21-final-audit.md:71`) and the charter rule, **a HIGH advisory
against an installed, upgradable dependency = CONFIRMED = FAIL.** Here there are **five** HIGH
advisories (four in `next`, one in `sharp`) against currently-installed production dependencies,
with published in-range fixes available at audit time (`next >=16.2.11`, `sharp >=0.35.0`). This is
a material, presently-true security exposure in a shipped production dependency of a
security-centric financial app, at the completion gate, with an available in-scope compatible-chain
remedy. A clean `pnpm audit --prod` would have refuted F-1; it is instead exit-1 with 5 HIGH. F-1 is
real, not papered over. **CONFIRMED.**

## 3. HS-002 scope angle (independent finding)

HS-002 = "Upgrade to the very latest safe-chain supported version of all dependencies" — marker
`[x]` at scratch `:157`. At the completion gate the installed tree is `next@16.2.10` while the
latest safe-chain version is **`16.2.12`** (two patch releases behind, both published 2026-07-21 /
2026-07-25, before this audit). The tree has **drifted behind available safe upgrades**, so HS-002's
completion claim is materially false as of this audit. (Contextual note, not exculpatory: the
advisories/versions post-date P01/HS-002's original pass; this is upstream drift after the marker
was set. It remains a completion-gate failure regardless — the gate is a point-in-time snapshot and
the snapshot is red.) This independently reinforces the F-1 FAIL.

## 4. Sanity-check of collector GREEN claims (no gross fabrication; no additional blocker)

Spot-checks (not a full re-run — rev 04 re-audits everything on the bumped tree):

- `pnpm typecheck` → **exit 0** (clean). Matches §4.
- `pnpm format:check` → **exit 1**, and every flagged path is under `specs/**` frozen markdown
  (`DECISIONS.md`, `PROGRESS.md`, `QUESTIONS.md`, evidence/reviews, `human-scratch.md`, …). **Zero
  `.ts`/`.tsx`/product/test source flagged.** Confirms the collector's "known frozen-spec reflow
  hazard, product-source clean" characterization in §4 — not a fabrication, not a blocker.
- Marker/scratch reconciliation internally consistent: scratch SHA == rolling PROGRESS SHA
  `469e98c7…`, 24,260 B = 24,239 original + 21 marker flips, 43/0 counts — all as claimed in §1.
- E2E (163×2) and full unit (2091/2 skip) claims not independently re-run per charter; nothing in
  the evidence contradicts them, and the two skips are env-gated benchmarks (run/passed in §7).
- **No ADDITIONAL blocking finding hiding in the evidence.** The most serious carry-forward
  (`Q-P20B-00` `pruneBuckets` concurrent-merge data loss) is genuinely concerning but is explicitly
  out of frozen scope, maps to no in-scope HS/FS requirement, and was transparently adjudicated and
  deferred by the owning package to future work — consistent with a carry-forward, not a P21
  completion-gate blocker. I concur with the collector's disposition: flag for human/product
  prioritization; it is not the basis of this FAIL. F-1 is.

## 5. Secret-safety

No vault master key, seed phrase, recovery material, `crypto_box` secret, `SUPABASE_JWT_SECRET`,
presence key, or vault plaintext was printed or written during this review. Advisory identifiers and
version strings only. **No leak.**

## 6. Commands index (sanitized)

- `git rev-parse HEAD`; `git diff 127990a HEAD -- . ':(exclude)specs'`;
  `git diff --name-only 127990a HEAD`.
- `sha256sum specs/human-scratch.md`; `wc -c specs/human-scratch.md`; `grep -cE` checked/unchecked;
  `sed -n '157p'`.
- `pnpm audit --prod`; `node -p "require('next/package.json').version"`; `pnpm ls next`;
  `pnpm why sharp --prod`; `curl -sS https://registry.npmjs.org/next` (dist-tags + release times);
  `curl -sS https://registry.npmjs.org/next/16.2.12` (optionalDependencies.sharp);
  `curl -sS https://registry.npmjs.org/sharp` (dist-tags).
- `pnpm typecheck`; `pnpm format:check`.

## 7. Verdict routing

**FAIL** on **F-1 (CONFIRMED)**. Per `tasks/P21-final-audit.md:71-89`, root preserves this failed
review, moves P21 to `changes_requested`, and drives the §275 rollback batch: roll back the
**HS-002** marker (`RB-P21-03`), reopen **P01** for the `next 16.2.10 → 16.2.12` compatible
safe-chain bump plus a `sharp >=0.35.0` override to clear the transitive HIGH, then start **P21
revision 04** from a new BASE with entirely new evidence/review paths. Do not overwrite or amend
this verdict.

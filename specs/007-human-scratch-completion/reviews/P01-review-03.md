# P01 revision 03 — INDEPENDENT REVIEW (HS-002 dependency-security fix)

**Verdict: PASS**

- **Package / HS item:** P01 — HS-002 "Upgrade to the very latest safe-chain supported version of
  all dependencies"
- **Revision:** 03 (distinct-reviewer phase)
- **Reviewer:** `p01-reviewer-03` (did NOT implement this fix; fresh-context, ruled from the frozen
  requirement text and the committed git tree)
- **Handback HEAD reviewed:** `371a88a`. Product tree at current HEAD `c771012` is byte-identical to
  `371a88a` for all code/config paths; the only intervening commit is root's own dispatch doc
  (`c771012 docs: dispatch distinct P01 rev 03 reviewer`, which touched ONLY
  `specs/007-human-scratch-completion/HANDOFF.md`). Confirmed
  `git merge-base --is-ancestor 371a88a HEAD` = yes.
- **Product delta reviewed:** `git diff f785de9..371a88a`.

---

## Convergence gate (TERMINATING) — PASS

```
$ pnpm audit --prod
No known vulnerabilities found
AUDIT_EXIT=0
```

Exit 0, 0 advisories. Before the fix the tree was exit 1 / 10 advisories (5 HIGH / 5 MODERATE). The
authoritative convergence criterion for HS-002 rev 03 is met.

---

## Per-check evidence

### 1. Delta is exactly the 4 allowed paths — PASS

```
$ git diff --name-status f785de9..371a88a
M	package.json
M	pnpm-lock.yaml
M	pnpm-workspace.yaml
A	specs/007-human-scratch-completion/evidence/P01/implementation-03.md
```

No `.ts/.tsx`, no ledger/marker/review, no frozen-source edit. The two inert strays (`next-env.d.ts`
modified; untracked `evidence/P08/implementation-01.md`) are pre-existing and were NOT touched,
staged, or committed by this review.

### 2. Frozen sources intact — PASS

```
$ sha256sum specs/human-scratch.md
c10dc0b5963105d72d8e4afc43223102b96b3ab7cb0acd3954cfc491866831bd  specs/human-scratch.md
$ wc -c specs/human-scratch.md
24259 specs/human-scratch.md
```

sha256 == expected `c10dc0b5…`, 24,259 bytes. Marker count: 42 checked `[x]` / 1 unchecked. HS-002
at `:157` is correctly still `- []` (rolled back / not yet re-applied) — reviewing the FIX, not the
marker; root re-applies the marker only after this PASS.

```
- [] Upgrade to the very latest safe-chain supported version of all dependencies
```

### 3. Resolved tree — PASS

```
$ pnpm ls next
└── next@16.2.11

$ pnpm why sharp
sharp@0.35.3
└─┬ next@16.2.11
  └── moneyflow@0.1.0 (dependencies)
```

- `next` resolves to **16.2.11** — the latest safe-chain-supported release. The age-suppressed
  **16.2.12** was NOT used (independently corroborated: 16.2.12 is 3 days old vs. safe-chain's
  minimum-package-age policy; installing it would require the policy-bypass flag). 16.2.11 is the
  patched version for all 9 `next` advisories (`patched >=16.2.11`).
- `sharp` resolves to **0.35.3** under `next` via the single workspace override; 0.35.3 is age-clean
  (not suppressed) and is the patched version for the transitive libvips HIGH (`patched >=0.35.0`).

`package.json` diff: `next` 16.2.10 → 16.2.11 (single line). `pnpm-workspace.yaml` diff: one added
`overrides` entry `"sharp@<0.35.0": 0.35.3` — the correct mechanism (pnpm 11 ignores `package.json`
`pnpm.overrides`). `pnpm-lock.yaml` diff is limited to `next` + `sharp`/`@img` sub-packages.

### 4. No new `as`/`any`/`!` in product — PASS

```
$ git diff --name-only f785de9..371a88a | grep -E '\.(ts|tsx)$'
NONE (config-only confirmed)
```

Delta is config-only; no `.ts/.tsx` edits, so no new assertions/casts possible.

### 5. Highest-risk regression surface: `pnpm build` + sharp image optimization — PASS

sharp 0.35.x is outside next's declared optional `^0.34.5`, and `allowBuilds.sharp:false` disables
sharp's build script. Confirmed the override resolves to a working **prebuilt** binary (no build
script needed):

```
node_modules/.pnpm/@img+sharp-linux-x64@0.35.3/node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.3.node
node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.2/...  (libvips-cpp.so.8.18.3)

$ node -e "require('<store>/sharp@0.35.3').versions"
OK sharp 0.35.3 libvips 8.18.3
```

`pnpm build` (Next.js 16.2.11, Turbopack): **exit 0**, `✓ Compiled successfully`, all 17 static
pages generated. A full-log grep for `sharp|@img|image.opt|libvips|warn|deprecat` returned NO
matches — zero image/sharp warnings or errors. The bump does not break the build or the image path.

### 6. No-regression gates — PASS (modulo known-acceptable)

| Gate                                                           | Result                                                                                                                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`                                               | PASS (exit 0, no errors)                                                                                                                                                             |
| `pnpm lint`                                                    | PASS (0 errors, 1 warning) — the sole warning is the pre-existing known-acceptable `TransactionTable.tsx:401` `react-hooks/incompatible-library` (TanStack Virtual).                 |
| `pnpm format:check`                                            | Exit 1 on **frozen `specs/**`markdown ONLY** (15 files, all under`specs/\*\*`, incl. `specs/human-scratch.md`). No product/config file flagged. Known-acceptable — NOT a regression. |
| `pnpm test`                                                    | PASS — Test Files 111 passed; Tests 2091 passed / 2 skipped.                                                                                                                         |
| `pnpm build`                                                   | PASS — see check 5.                                                                                                                                                                  |
| E2E `pnpm exec playwright test --retries=0 --reporter=list` ×2 | PASS both runs — **163 passed, 0 failed, 0 flaky** (3.9m / 4.0m).                                                                                                                    |

### 7. identity.spec.ts:282 disposition — not triggered

The known P20B-owned load-dependent seed-word-validity re-render flake did NOT fail in either of the
two full-suite runs (163/163 both times). No pre-existing tracked flakes (import:301/:1527/:1573,
duplicates) surfaced either. There is therefore no E2E blemish to attribute, and nothing that could
be mistaken for a bump regression. A `next`-patch / `sharp`-libvips bump touches no React render
path, consistent with the clean E2E result.

### 8. Secret-safety — PASS

```
$ git diff f785de9..371a88a | grep -iE 'seed|passphrase|recovery|secret_key|private_key|SUPABASE_JWT|master_key|BEGIN ... PRIVATE|crypto_box'
```

The only matches in the delta are attestation/flake-description prose in the evidence file (naming
the secret categories to declare their absence) — no vault master key, seed phrase, recovery
material, `crypto_box` secret, `SUPABASE_JWT_SECRET`, vault presence key, or plaintext is present in
the tree or this review. Synthetic vectors only. No leak.

---

## Conclusion

PASS. The dependency-security fix clears the terminating convergence gate (`pnpm audit --prod` exit
0 / 0 advisories) via `next@16.2.11` (safe-chain-supported; 16.2.12 correctly avoided) and the
`sharp@0.35.3` workspace override. The delta is exactly the 4 allowed config/evidence paths, frozen
sources are byte-intact, no product `.ts/.tsx` changed, all no-regression gates are green modulo the
documented known-acceptable items, the highest-risk sharp/image build surface is verified working
via a prebuilt binary, the full E2E suite is 163/163 across two runs with no bump-caused failure,
and no secret material is exposed. Root may re-apply the HS-002 forward marker.

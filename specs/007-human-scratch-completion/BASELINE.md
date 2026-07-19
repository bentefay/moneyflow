# Execution Baseline

P00 revision 02 received independent PASS over original BASE
`0ea864f5d0142530b2d524add228d3b51f162876` through reviewed control-only HEAD
`8f12d82ddb576af5cc8c6f04d32617d805e300de`.

- Implementation evidence: [evidence/P00/implementation-02.md](evidence/P00/implementation-02.md),
  SHA-256 `3ad9f4fe264d47b6d93c29b9c34cb60e03d230299cc6e5bd4ec0b8f2150d50b7`
- Independent PASS: [reviews/P00-review-02.md](reviews/P00-review-02.md), SHA-256
  `0f5129c9e2068cc0b8939ac27ec224b1843b34c613e6c951b0864bf81abe82f6`
- Immutable failed predecessor: [reviews/P00-review-01.md](reviews/P00-review-01.md), SHA-256
  `a0c0b3fa146efc96411bdc0588f289eadc36a21546a3c96393c993662cb92580`
- Collection/review window: 2026-07-19T23:31:18+10:00 through 2026-07-20T00:35:26+10:00

P00 PASS proves that this baseline is complete, reproducible, sanitized and correctly routed. It
does not claim that any future feature requirement or recorded red product risk is delivered.

## Repository and frozen scope

- Repository: `/home/ben-agents/Code/moneyflow`, branch `main`, upstream `origin/main`.
- Reviewed product/test HEAD: `8f12d82ddb576af5cc8c6f04d32617d805e300de`; its range after original
  BASE contains only P00 revision-01 evidence/review and root control ledgers.
- The pre-existing unstaged `specs/human-scratch.md` working copy was preserved and never staged by
  workers. Its SHA-256 is the rolling SHA
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`, with 350 lines and 24,239
  bytes.
- All 21 ordered HS blocks are unchecked and normalize byte-for-byte to SCOPE `sourceTextLines`.
- The immutable FS-001 source remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes, selected as whole-file lines 1–715 with no completion mutation.
- SCOPE contains 22 declared, actual and unique requirements: HS-001 through HS-021 plus FS-001. All
  forward/reverse mappings agree with 32 unique package rows; the dependency graph is acyclic.

## Executable environment

| Item                     | Verified baseline                                                  |
| ------------------------ | ------------------------------------------------------------------ |
| OS                       | Ubuntu/Linux kernel `7.0.0-15-generic`, x86_64                     |
| Node / pnpm              | `v22.21.1` / `10.25.0`                                             |
| Codex CLI                | `0.144.6`                                                          |
| TypeScript / ESLint      | `6.0.2` / `9.30.1`                                                 |
| Next / React             | `16.2.9` / `19.2.4`                                                |
| Vitest                   | `4.1.2`                                                            |
| Playwright Test          | `1.59.1`, Chromium revision 1217                                   |
| Playwright CLI           | `0.1.17`, alpha core/Chromium revision 1232                        |
| Supabase CLI             | `2.84.10`; CLI reported `2.109.1` available                        |
| `package.json` SHA-256   | `341091fff0c32947df6b73ea0c567f0649ba1a45842cacaa47906550b1f365e3` |
| `pnpm-lock.yaml` SHA-256 | `8ab2d742e281f15b1ec205a9ff1bb79a52321a2d32b794088410a69cb4fcc8b8` |

- The app and local REST endpoint each returned HTTP 200.
- Docker client/server was `29.6.2`. Supabase studio, pg-meta, rest, realtime, kong, vector,
  analytics and database containers ran; auth, inbucket, storage, imgproxy, edge-runtime and pooler
  were stopped optional services in the local baseline.
- Local and remote migrations both reported `005`.
- Evidence records only environment-variable names, never values: `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and exported
  `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE`.

The executable Node/Next/TypeScript majors differ from `.claude/CLAUDE.md`; package-manager/engine
pins are absent; Playwright Test and CLI use different browser revisions; and the Supabase CLI is
behind its reported available version. P01 owns dependency/toolchain reconciliation.

## Verification results

| Check            | Exact method                                                                                     | Verified result                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Formatting       | `pnpm format:check`                                                                              | PASS; 472 files after review artifact creation                                                         |
| Lint             | `pnpm lint`                                                                                      | Exit 0; 0 errors and 12 classified pre-existing unused-symbol warnings                                 |
| Typecheck        | `pnpm typecheck`                                                                                 | PASS                                                                                                   |
| Build            | `pnpm build`                                                                                     | PASS in revision 01; 17 pages in 17.57s; transient `next-env.d.ts` rewrite restored byte-for-byte      |
| Unit/integration | `pnpm test`                                                                                      | PASS; 41/41 files and 1,139/1,139 tests                                                                |
| Full E2E         | `pnpm exec playwright test --retries=0 --reporter=line`                                          | PASS; 78/78 tests, 4 workers, about 1.4 minutes                                                        |
| Flake sample     | Four critical specs with `--retries=0 --repeat-each=3 --workers=4 --reporter=line`               | PASS twice independently; 51/51 each run, no inconsistent or retry-dependent outcome                   |
| Manual CLI       | Unique disposable repository-installed headless `playwright-cli` sessions in revisions 01 and 02 | PASS as a baseline: complete journey and deterministic accessibility/console/network evidence recorded |

Passing fast-check seeds are not emitted by the current configuration; no failing seed existed to
reproduce. The baseline has 34 unit and seven integration files; 14 files import fast-check and
contain 59 `fc.assert` calls.

## Manual product and accessibility baseline

Independent sessions verified identity/vault creation, recovery-phrase unlock, People, aliases,
automations, manual transaction creation, 2/2 synthetic CSV import, navigation, refresh persistence,
native-semantics duplicate-tab hydration, deterministic accessible roles/names/states, keyboard
search/filter focus, 320px reflow, 200% authorized CSS zoom, reduced-motion and dark emulation,
computed contrast, console and sanitized network traffic.

- Document reflow passed at 320px; a populated 1,040px grid stayed within its 270px horizontal
  scrolling container.
- Sampled contrast passed: Add transaction 4.64:1, search text 20.16:1, focused ring 17.83:1, and
  Saved status 18.32:1.
- Console showed zero errors. Mobile menu opens reproducibly emitted six Radix `DialogContent`
  missing-description warnings.
- Retained dynamic requests had no 4xx/5xx response. Headers, bodies, query contents and secrets
  were deliberately not retained, so P04/P05 still own transport/RLS proof.
- Disposable browser profiles, generated session artifacts and recovery material were removed; older
  pre-existing CLI artifacts were preserved.

## Truthful red baseline and ownership

- At 320x720, keyboard `Open menu` -> Enter focuses `My Vault owner`; Escape closes the dialog but
  leaves the trigger unfocused/not focus-visible and the document with zero focused elements. The
  sequence reproduced twice independently in both corrected collection and review. Route: P20B.
- Under reduced motion, 150ms and 500ms animations remain. Route: P02 and P20B.
- OS dark media matches but sampled controls remain visually unchanged. Route: P20B unless an
  earlier UI package owns the behavior.
- Current Add Transaction still uses the confusing tick/cancel row. Route: P13.
- Marketing says “Smart Budgeting”/budget tracking contrary to frozen HS-016. Route: P20A.
- People/invite, automation, RLS/realtime, historical migration/destructive recovery, allocation/
  settlement correctness and large-data performance remain future package work and are not claimed
  by P00.

Revision 01 failed solely because it incorrectly claimed mobile-menu focus restoration. Its failed
evidence/review remain immutable. Revision 02 corrected, reproduced and routed that red without a
product edit, and the independent reviewer approved the complete baseline.

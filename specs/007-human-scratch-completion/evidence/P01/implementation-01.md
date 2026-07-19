# P01 Implementation Evidence — Revision 01

## Contract and result

- Package: `P01` / `HS-002` dependency upgrades.
- Exact worker artifact: `specs/007-human-scratch-completion/evidence/P01/implementation-01.md`.
- Assigned base: `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`.
- Implementation head: `cc429f5212f1122be7694fcee457cdcb7575e5dc`.
- Review range:
  `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..cc429f5212f1122be7694fcee457cdcb7575e5dc`.
- Outcome: complete and ready for independent review.
- This evidence file is intentionally uncommitted. All product, test, manifest, lockfile and
  configuration changes are committed in the exact review range.

The implementation upgrades the supported runtime, direct dependency graph and relevant transitive
packages in compatibility-ordered chains. It includes the minimum source/test migrations required by
the upgraded APIs and lint rules. The final graph was rebuilt from no `node_modules` and no lockfile
with the exact published package-manager pin, then deduplicated and verified frozen.

## Boundary and ownership

- The worker did not edit any root ledger, task artifact, `SCOPE.json`, canonical feature spec,
  Supabase migration, or scratch completion marker.
- Pre-existing root-owned changes to `HANDOFF.md` and `PROGRESS.md` were preserved unstaged.
- The pre-existing user-owned `specs/human-scratch.md` working copy was preserved unstaged.
- Initial and final scratch identity is SHA-256
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`, 350 lines and 24,239 bytes.
- Initial and final immutable FS-001 source identity is SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes at
  `specs/008-transaction-percentage-allocations-settlement/spec.md`.
- Product commits were staged with exact paths only. The evidence artifact is the sole worker-owned
  uncommitted path.

## Commit chain

- `1aa6610dcb7a5539a7d10d198f5227a51e548c53` — `build: upgrade Node pnpm and development toolchain`
- `c480f650e9257f32d7fca8c6e80f8a71607f25fa` — `build: upgrade crypto temporal and Loro chain`
- `fd00495d2ef99e06b858343bcaec3d95361aef19` — `build: externalize Loro wasm from server bundle`
- `c2456e0f3c1d4abaac356212095c409d71acedd0` — `build: upgrade Next React and UI dependency chain`
- `2f571f444f45ca0e94de0cbd1d33e3a9f589ffab` — `build: upgrade data and API dependency chain`
- `7a3a924230b52102b364f76f14ceb66720f0c749` — `build: upgrade Playwright test runner`
- `034dffba703f6849e2605fcb09eddaaeec51f662` —
  `build: patch and deduplicate transitive dependencies`
- `cc32b3c642446c0e316c8b77388d09a2f7834126` — `build: pin repository-compatible oxfmt`
- `3be552c7b11c05840f61aa1ca009360bfaf1db83` — `build: update pnpm and rebuild clean lockfile`
- `817ffde4509387d935f9f05b346e6daff099d911` — `refactor: satisfy current React hook lint rules`
- `cc429f5212f1122be7694fcee457cdcb7575e5dc` — `build: pin published pnpm toolchain`

## Runtime and package-manager result

- `.nvmrc`: Node `22.21.1`.
- `engines.node`: `^22.13.0 || >=24.0.0 <25.0.0`, matching Next 16's Node floor while keeping the
  repository on the current Node 22 LTS line and explicitly allowing Node 24.
- `packageManager`: exact published `pnpm@11.13.1`.
- `engines.pnpm`: `>=11.13.1 <12.0.0`.
- `pnpm-workspace.yaml` carries pnpm 11 `allowBuilds` policy for `esbuild`, `sharp`, `supabase`, and
  `unrs-resolver`, plus the audited transitive overrides listed below.

The initial pnpm upgrade trial selected `11.15.0`; the final boundary audit proved that version was
not published and Corepack correctly refused it. The pin was corrected to the registry's latest
published `11.13.1` (published 2026-07-16), the install was purged with
`corepack pnpm clean --lockfile`, and the graph was rebuilt, deduplicated, reinstalled frozen, and
fully revalidated. No evidence or handoff was issued with the invalid pin.

## Complete direct dependency inventory

### Runtime dependencies

| Package                         |    Before |     After |
| ------------------------------- | --------: | --------: |
| `@f-o-t/ofx`                    |   `2.4.6` |   `2.4.6` |
| `@noble/hashes`                 |   `2.0.1` |   `2.2.0` |
| `@radix-ui/react-alert-dialog`  |  `1.1.15` |  `1.1.19` |
| `@radix-ui/react-checkbox`      |   `1.3.3` |   `1.3.7` |
| `@radix-ui/react-dialog`        |  `1.1.15` |  `1.1.19` |
| `@radix-ui/react-dropdown-menu` |  `2.1.16` |  `2.1.20` |
| `@radix-ui/react-label`         |   `2.1.8` |  `2.1.11` |
| `@radix-ui/react-popover`       |  `1.1.15` |  `1.1.19` |
| `@radix-ui/react-radio-group`   |   `1.3.8` |   `1.4.3` |
| `@radix-ui/react-select`        |   `2.2.6` |   `2.3.3` |
| `@radix-ui/react-slider`        |   `1.3.6` |   `1.4.3` |
| `@radix-ui/react-slot`          |   `1.2.4` |   `1.3.0` |
| `@radix-ui/react-tooltip`       |   `1.2.8` |  `1.2.12` |
| `@scure/bip39`                  |   `2.0.1` |   `2.2.0` |
| `@supabase/supabase-js`         | `2.101.1` | `2.110.7` |
| `@tanstack/react-query`         |  `5.96.2` | `5.101.2` |
| `@tanstack/react-virtual`       | `3.13.23` |  `3.14.6` |
| `@trpc/client`                  | `11.16.0` | `11.18.0` |
| `@trpc/react-query`             | `11.16.0` | `11.18.0` |
| `@trpc/server`                  | `11.16.0` | `11.18.0` |
| `chrono-node`                   |   `2.9.0` |  `2.10.0` |
| `class-variance-authority`      |   `0.7.1` |   `0.7.1` |
| `clsx`                          |   `2.1.1` |   `2.1.1` |
| `cmdk`                          |   `1.1.1` |   `1.1.1` |
| `currency.js`                   |   `2.0.4` |   `2.0.4` |
| `date-fns`                      |   `4.1.0` |   `4.4.0` |
| `idb`                           |   `8.0.3` |   `8.0.3` |
| `libsodium-wrappers`            |   `0.8.2` |   `0.8.4` |
| `lodash-es`                     |  `4.18.1` |  `4.18.1` |
| `loro-crdt`                     |  `1.10.8` |  `1.13.7` |
| `loro-mirror`                   |   `2.1.0` |   `2.2.0` |
| `loro-mirror-react`             |   `2.1.0` |   `2.2.0` |
| `lucide-react`                  |   `1.7.0` |  `1.25.0` |
| `motion`                        | `12.38.0` | `12.42.2` |
| `next`                          |  `16.2.9` | `16.2.10` |
| `papaparse`                     |   `5.5.3` |   `5.5.4` |
| `radix-ui`                      |   `1.4.3` |   `1.6.2` |
| `react`                         |  `19.2.4` |  `19.2.7` |
| `react-day-picker`              |  `9.14.0` |  `10.0.1` |
| `react-dom`                     |  `19.2.4` |  `19.2.7` |
| `remeda`                        |  `2.33.7` |  `2.39.0` |
| `string-comparison`             |   `1.3.0` |   `1.3.0` |
| `superjson`                     |   `2.2.6` |   `2.2.6` |
| `tailwind-merge`                |   `3.5.0` |   `3.6.0` |
| `temporal-polyfill`             |   `0.3.2` |   `1.0.1` |
| `zod`                           |   `4.3.6` |   `4.4.3` |

### Development dependencies

| Package                       |    Before |     After |
| ----------------------------- | --------: | --------: |
| `@playwright/cli`             |  `0.1.17` |  `0.1.17` |
| `@playwright/test`            |  `1.59.1` |  `1.61.1` |
| `@tailwindcss/postcss`        |   `4.2.2` |   `4.3.3` |
| `@testing-library/dom`        |  `10.4.1` |  `10.4.1` |
| `@testing-library/jest-dom`   |   `6.9.1` |   `6.9.1` |
| `@testing-library/react`      |  `16.3.2` |  `16.3.2` |
| `@types/lodash-es`            | `4.17.12` | `4.17.12` |
| `@types/node`                 |  `25.5.2` | `22.20.1` |
| `@types/papaparse`            |   `5.5.2` |   `5.5.2` |
| `@types/react`                | `19.2.14` | `19.2.17` |
| `@types/react-dom`            |      `19` |  `19.2.3` |
| `@vitejs/plugin-react`        |   `5.2.0` |   `6.0.3` |
| `babel-plugin-react-compiler` |   `1.0.0` |   `1.0.0` |
| `eslint`                      |  `9.30.1` |  `9.39.5` |
| `eslint-config-next`          |  `16.2.2` | `16.2.10` |
| `fake-indexeddb`              |   `6.2.5` |   `6.2.5` |
| `fast-check`                  |   `4.6.0` |   `4.9.0` |
| `jsdom`                       |  `29.0.1` |  `29.1.1` |
| `oxfmt`                       |  `0.43.0` |  `0.57.0` |
| `oxlint`                      |  `1.58.0` |  `1.74.0` |
| `supabase`                    | `2.84.10` | `2.109.1` |
| `tailwindcss`                 |   `4.2.2` |   `4.3.3` |
| `tw-animate-css`              |   `1.4.0` |   `1.4.0` |
| `typescript`                  |   `6.0.2` |   `6.0.3` |
| `vercel`                      | `50.39.0` |  `56.3.1` |
| `vitest`                      |   `4.1.2` |  `4.1.10` |

## Deliberate pins and safe-chain decisions

- TypeScript stays on `6.0.3`, the latest compatible stable line. TypeScript 7 is a native port with
  ecosystem and API migration implications outside a dependency-only package.
- ESLint stays on `9.39.5`. ESLint 10 has explicit breaking configuration/runtime changes and the
  current Next lint stack is verified on 9.
- `@types/node` is `22.20.1`, aligned with the repository's Node 22 runtime rather than declaring
  Node 25/26 APIs unavailable in production.
- `oxfmt` is `0.57.0`, the newest version that formats the repository without rewriting protected
  scope artifacts. `0.59.0` failed four protected/repository files; `0.58.0` still rewrote the
  protected spec-006 quickstart. Version `0.57.0` checks all 472 matched files cleanly.
- Vercel is `56.3.1`. Trial `56.3.2` was inside the configured 24-hour minimum release-age window
  (published 2026-07-18T18:28Z; evaluation cutoff 2026-07-18T15:18Z) and was rejected rather than
  bypassing supply-chain policy.
- `@playwright/cli` remains `0.1.17`, its current published package version. The CLI embeds a newer
  alpha Playwright core independently of the stable `@playwright/test` runner.
- Unchanged direct dependencies were individually inventoried; they were already current or had no
  compatible stable update.

Primary references used for breaking-change and support decisions (all checked 2026-07-20 AEST):

- Next 16 upgrade guide: <https://nextjs.org/docs/app/guides/upgrading/version-16>
- Next 16.2 release: <https://nextjs.org/blog/next-16-2>
- Next `serverExternalPackages`:
  <https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages>
- TypeScript 6 release notes:
  <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>
- TypeScript 7 announcement: <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- ESLint 10 migration guide: <https://eslint.org/docs/latest/use/migrate-to-10.0.0>
- Vite 8 release: <https://vite.dev/blog/announcing-vite8>
- pnpm releases: <https://github.com/pnpm/pnpm/releases>
- pnpm 11 discussion: <https://github.com/orgs/pnpm/discussions/11377>
- Loro quick start and JS API: <https://www.loro.dev/docs/tutorial/get_started> and
  <https://www.loro.dev/docs/api/js>
- Loro Mirror release context: <https://loro.dev/blog/loro-mirror>
- Loro releases: <https://github.com/loro-dev/loro/releases>
- React DayPicker documentation: <https://react-day-picker.js.org/>
- Oxc/oxfmt releases: <https://github.com/oxc-project/oxc/releases>

## Compatibility migrations

- Next/React/UI chain: upgraded Next, React, Radix and React DayPicker together. DayPicker 10
  renamed the calendar table class slot, so the local mapping changed from `table` to `month_grid`.
- Loro chain: upgraded `loro-crdt`, `loro-mirror`, and `loro-mirror-react` together. Next's server
  bundle could not locate Loro's WASM asset at runtime at either trial `1.13.6` or final `1.13.7`;
  declaring `loro-crdt` in `serverExternalPackages` preserves package-relative WASM loading and was
  verified in build, browser and sync tests.
- Supabase chain: generated TypeScript declarations were refreshed from the actual local schema
  after newer clients exposed stale declarations. Snapshot writes now provide the schema's required
  `version_vector`; the two affected tests provide the same value.
- Current `eslint-plugin-react-hooks` resolution (`7.1.1`) identified stale effect-driven derived
  state and ref patterns. Eight source files were migrated without suppressions: derive/render state
  directly, reset through event boundaries, use stable callbacks, and avoid reading or writing refs
  during render.
- The remaining lint result is 0 errors and 13 warnings: 12 pre-existing unused-symbol warnings and
  one new `react-hooks/incompatible-library` advisory for TanStack Virtual's `useVirtualizer`. The
  advisory is deliberately retained because changing virtualization/conditional `useFlushSync`
  behavior belongs to `HS-018`, not this dependency package.
- `next-env.d.ts` was regenerated by the supported Next 16 build and is committed.

## Transitive security treatment

`pnpm-workspace.yaml` pins patched compatible transitive releases for:

- `@babel/core` `7.29.7`
- `@tootallnate/once` `2.0.1`
- `ajv` `8.20.0`
- `brace-expansion` `5.0.7`
- `js-yaml` `4.3.0`
- `minimatch` `10.2.5`
- `path-to-regexp` `6.3.0` and `8.4.2`
- `postcss` `8.5.19`
- `smol-toml` `1.7.0`
- `tar` `7.5.20`

Production audit is clean: 0 known vulnerabilities. Full audit improved from the baseline's 58
findings (10 low, 24 moderate, 24 high) to 11 dev-only findings (3 low, 5 moderate, 3 high; 0
critical) across a 1,013-package graph. The remaining advisories are Vercel CLI's nested Undici
versions and the Vitest/Vite toolchain's constrained esbuild version. Forcing patched major lines
would violate those tools' declared dependency ranges; both are development-only, so no unsafe
override was added.

The rebuilt graph reports one deprecated transitive package, `stream-to-promise@2.2.0`; it is nested
under tooling and has no compatible direct replacement controlled by this repository.

## Clean-install and static validation evidence

All commands below ran on 2026-07-20 AEST at final head with Node `v22.21.1` and Corepack pnpm
`11.13.1` unless noted. Exit codes are explicit; elapsed times are command-reported or runner wall
times. No test command exposed or accepted a reusable random seed.

| Gate                                                                                                                                                                                                      |         Exit |           Duration | Result                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----------: | -----------------: | --------------------------------------------------------------------------------- |
| `corepack pnpm clean --lockfile && corepack pnpm install`                                                                                                                                                 |          `0` |       4.6s install | Clean graph rebuilt; 1,013 packages resolved, 807 installed                       |
| `corepack pnpm install --frozen-lockfile --strict-peer-dependencies`                                                                                                                                      |          `0` |              319ms | Already up to date with exact pnpm `11.13.1`                                      |
| `corepack pnpm dedupe --check`                                                                                                                                                                            |          `0` |          4.7s wall | Pass after applying the one clean-rebuild optional-peer dedupe                    |
| pnpm automatic supply-chain lock verification                                                                                                                                                             |          `0` |     Included above | Minimum-age policy accepted every final resolution                                |
| `corepack pnpm audit --prod`                                                                                                                                                                              |          `0` |                <1s | No known vulnerabilities                                                          |
| `corepack pnpm audit --json`                                                                                                                                                                              | `1` expected |          0.9s wall | 11 dev findings: 3 low, 5 moderate, 3 high, 0 critical                            |
| `corepack pnpm format:check`                                                                                                                                                                              |          `0` |             3.174s | 472 product/repository files; final evidence-inclusive check is 473/473 in 1.278s |
| `corepack pnpm lint`                                                                                                                                                                                      |          `0` | <10s parallel gate | 0 errors, 13 documented warnings                                                  |
| `corepack pnpm typecheck`                                                                                                                                                                                 |          `0` | <10s parallel gate | Pass                                                                              |
| `corepack pnpm test`                                                                                                                                                                                      |          `0` |              4.90s | 41 files, 1,139 tests                                                             |
| `corepack pnpm build`                                                                                                                                                                                     |          `0` |          About 22s | Next 16.2.10 Turbopack compile, TypeScript, 17 static/dynamic routes              |
| `corepack pnpm exec playwright test --reporter=list --retries=0`                                                                                                                                          |          `0` |               1.1m | Chromium 78/78                                                                    |
| `corepack pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/import.spec.ts tests/e2e/sync-persistence.spec.ts tests/e2e/tab-duplication.spec.ts --repeat-each=3 --retries=0 --reporter=list` |          `0` |              47.3s | Critical identity/import/sync/tab set 51/51                                       |

The first post-correction Playwright invocation could not start its configured web-server process
and exited before collecting any tests. Starting the same `pnpm dev` command explicitly proved the
server healthy; both the full 78-test run and 51-test repeated critical run then passed against that
server. It was stopped cleanly, and the final production build passed afterward.

Known harmless runtime diagnostics during passing browser tests were the environment's
`NO_COLOR`/`FORCE_COLOR` warning and existing expected direct-sync fallback/signature-race warnings.
They did not cause a browser test retry or failure.

## Required Playwright CLI charter

An actual CLI session named `p01-deps-20260720`, run on 2026-07-20 AEST, exercised the upgraded
application, not merely test runner APIs. The CLI did not emit a session-duration field, so no
synthetic precision is asserted. Sensitive generated recovery material was never copied into
evidence or retained.

- Created an identity and vault; exercised People, description alias management, automation, manual
  transaction creation, and synthetic CSV preview/import of two rows.
- Created a second identity and unlocked it from an in-memory 12-word recovery value; no phrase or
  derived secret was retained.
- Verified reload persistence and browser-opener tab duplication.
- Exercised offline edit, online recovery to `Saved`, and a subsequent reload.
- Exercised 320px mobile navigation and confirmed no document-level horizontal overflow.
- Exercised 200% zoom and confirmed no document-level horizontal overflow.
- Exercised keyboard navigation/focus-visible behavior.
- Emulated dark color scheme and reduced motion. Both media queries were active. The root background
  remained white under dark emulation, an existing P00 product limitation rather than a dependency
  regression.
- Final console capture: 0 errors and 0 warnings.
- Sanitized final dynamic requests for the Loro WASM, `vault.list`, and `sync.getUpdates` returned
  HTTP 200; no failed requests remained.
- Closed the session with data deletion and stopped the dev server.
- Removed exactly 30 timestamped artifacts created by this session from `.playwright-cli`; older
  ignored/user artifacts were preserved.

Browser provenance:

- Stable `@playwright/test@1.61.1` ran the automated Chromium suite with cached headless-shell
  revision `1228`.
- The installed CLI package carries Playwright core alpha revision `1232`, while the actual CLI
  session used its declared `chrome` channel at `/opt/google/chrome`, reporting `HeadlessChrome/150`
  / Google Chrome `150.0.7871.128`. This distinction is intentional and is not represented as
  testing the CLI session against cached Chromium revision `1232`.

## Changed-path rationale

- `.nvmrc`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`: runtime, complete direct
  inventory, clean graph, build policy, security overrides and package-manager pin.
- `next.config.ts`: externalize Loro so its runtime WASM resolves package-relatively.
- `next-env.d.ts`: supported Next 16 generated declaration path.
- `src/components/ui/calendar.tsx`: React DayPicker 10 class-name migration.
- `src/lib/supabase/database.types.ts`, `src/server/routers/sync.ts`, and two sync tests:
  regenerated schema contract and required `version_vector` compatibility.
- Eight React source files under onboarding, accounts, transaction cells/filters, providers and
  hooks: current React hook lint compatibility without suppressions.

No application feature outside dependency compatibility was intentionally added. In particular, the
TanStack Virtual warning did not trigger implementation of the separately scoped `HS-018`.

## Questions, decisions and residual risks

- No `Q-*` proposal is required. Every version or compatibility ambiguity was resolved using the
  process hierarchy, published metadata, primary release documentation, and executable evidence.
- Residual risk is limited to the documented dev-only audit findings, one deprecated dev transitive,
  the intentionally deferred major TypeScript/ESLint upgrades, and the existing TanStack Virtual
  compiler advisory. Production audit, application build, unit/integration suite and browser suite
  are green.

## Final immutable identifiers

- `package.json`: SHA-256 `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b`.
- `pnpm-lock.yaml`: SHA-256 `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`.
- Review head: `cc429f5212f1122be7694fcee457cdcb7575e5dc`.
- Review base: `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`.

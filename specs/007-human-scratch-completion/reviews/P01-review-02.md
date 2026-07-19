# P01 Revision 02 — Independent Review

- **Verdict:** PASS
- **Package/revision:** `P01/02`
- **Reviewer:** independent `human_scratch_reviewer`
- **Review window:** 2026-07-20T02:20+10:00 through 2026-07-20T02:52+10:00
- **Literal original BASE:** `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`
- **Literal HEAD:** `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`
- **Range:** non-empty; 14 commits and 28 changed paths, including the complete revision-01
  dependency migration, its immutable review records, and the revision-02 lifecycle fix
- **Frozen revision-02 evidence:** `evidence/P01/implementation-02.md`, SHA-256
  `9c16fc6b47dcca39f88b824b7ad995591a8d8731e87842a26d98f6cff315e8cf`
- **Prior immutable review:** `reviews/P01-review-01.md`, SHA-256
  `f059d77dcfea8ab15283609b4a218cdfe35671afdb925d95f593fcdbcf073a48`
- **Sole reviewer write:** this file

P01 revision 02 passes. The revision-01 dependency result is compatible and reproducible, and the
two prior blocking findings are closed. The installed, unconfigured Safe Chain 1.5.13 policy is a
48-hour publication-age floor, not the 24-hour premise used by review 01. At the frozen cutoff, pnpm
11.13.1 and Vercel 56.3.1 were therefore the newest eligible releases. The revision-02 evidence
explicitly corrects the earlier false “unpublished” statement and erroneous cutoff.

The Supabase Realtime fix removes channels through their owning singleton client and serializes
same-client, same-topic teardown/remount operations. Source review, deterministic unit coverage,
five repeated regression journeys, and three real CLI lock/unlock cycles show that the first
post-unlock render now succeeds without reload, failure UI, callback-registration errors, or
retained-channel collision.

No new material finding or `Q-*` proposal remains. The documented development-tool advisories,
deprecated Vercel transitive, deliberate migration-sized tool pins, and inherited OS-theme selection
limitation are unchanged non-blocking residuals; production audit remains clean.

## I-001 closure — installed Safe Chain policy and release currency

The primary Aikido Safe Chain source at <https://github.com/AikidoSec/safe-chain> states that
ordinary metadata resolution suppresses packages newer than the configured minimum age and that the
unconfigured default is 48 hours. It also documents precedence as command-line argument,
`SAFE_CHAIN_MINIMUM_PACKAGE_AGE_HOURS`, then `~/.safe-chain/config.json`. Independent checks found:

- installed Safe Chain `1.5.13`;
- no `/home/ben-agents/.safe-chain/config.json`;
- no `SAFE_CHAIN_*` environment override;
- the ordinary `pnpm` path enters Safe Chain for registry/install metadata commands;
- the wrapper intentionally bypasses the proxy for repository script execution such as `run` and
  `exec`, while raw `corepack pnpm` bypasses Safe Chain entirely;
- `pnpm safe-chain-verify` returned `OK: Safe-chain works!`.

The evidence cutoff is `2026-07-19T16:06:55Z`. Independent raw registry publication metadata and UTC
arithmetic reproduce the frozen table exactly:

| Release         | Published UTC              | Age at cutoff | 48-hour result |
| --------------- | -------------------------- | ------------: | -------------- |
| `pnpm@11.13.1`  | `2026-07-16T00:20:58.940Z` |   87h 45m 56s | eligible       |
| `pnpm@11.14.0`  | `2026-07-17T22:17:39.092Z` |   41h 49m 16s | suppressed     |
| `pnpm@11.15.0`  | `2026-07-18T12:31:32.691Z` |   27h 35m 22s | suppressed     |
| `vercel@56.3.2` | `2026-07-18T18:28:01.916Z` |   21h 38m 53s | suppressed     |

Executable behavior matches the policy rather than merely the prose:

- ordinary wrapped `pnpm view pnpm version` returned `11.13.1` and reported suppression;
- ordinary wrapped pnpm metadata exposed neither 11.14 nor 11.15 as eligible and rewrote `latest` to
  11.13.1;
- ordinary wrapped `pnpm view vercel version` returned `56.3.1` and reported suppression;
- raw `corepack pnpm view pnpm version` and the raw `latest`/`latest-11` tags returned `11.15.0`;
- raw `corepack pnpm view vercel version` returned `56.3.2`;
- pnpm 11.15's `node >=22.13` engine is compatible but does not override the age floor.

Thus review 01 was correct that pnpm 11.15 existed, but its unverified 24-hour eligibility premise
was wrong. Revision 02 truthfully supersedes the revision-01 implementation narrative that called
11.15 unpublished, and corrects the Vercel date. No dependency diff was needed because the already
frozen 11.13.1/56.3.1 pins are the actual newest releases permitted by the installed policy.

## Complete dependency, peer, lock, and security audit

The original BASE through HEAD range was re-read, not only commit `71aa257`. All 28 paths and 14
commits were inspected; the two committed P01 ledger/review artifacts are root-owned process
history, not implementation scope. `git diff --check BASE..HEAD` passes. No unauthorized
`.claude/**`, `.codex/**`, database migration, immutable FS-001, or HS-018 implementation is in the
product range.

The complete retained revision-01 result remains sound:

- Node `22.21.1`, pnpm `11.13.1`, Next `16.2.10`, React/ReactDOM `19.2.7`, TypeScript `6.0.3`,
  Supabase JS `2.110.7`, Loro `1.13.7`, Playwright Test `1.61.1`, and the direct peer graph are
  mutually compatible.
- Both raw Corepack and ordinary Safe-Chain-wrapped strict frozen installs report already up to
  date. `pnpm dedupe --check` and the pnpm build/supply-chain policy pass on the 1,013-package
  graph.
- The single direct React, ReactDOM, Supabase, Loro, Next, and Playwright identities are deduped.
  TypeScript `5.9.3` is only a Vercel transitive alongside the direct TypeScript `6.0.3` toolchain.
- The 11 targeted overrides resolve patched compatible transitive versions. Build scripts remain
  explicitly allowed only where intended, with esbuild, sharp, and unrs-resolver denied.
- Loro server externalization, browser WASM delivery, DayPicker 10 classes, generated Supabase
  declarations, React hook migrations, and the Node/pnpm engine range all pass real build/runtime
  checks.
- Production audit reports zero known vulnerabilities. Full audit reports exactly 11 Vercel CLI-only
  Undici findings: 3 low, 5 moderate, 3 high, 0 critical. The sole deprecated
  `stream-to-promise@2.2.0` is also confined to the Vercel development chain.
- The deliberate `@types/node` 22, ESLint 9, TypeScript 6, and oxfmt 0.57 pins remain documented
  migration/tool-compatibility decisions. TanStack Virtual HS-018 remains out of scope.

## I-002 closure — Realtime teardown and lifecycle races

The revision-01 fault is directly addressed. `VaultRealtimeSync` now retains the exact Supabase
client and topic that own a channel, clears local callback/subscription state synchronously, and
uses `client.removeChannel(channel)` rather than only `channel.unsubscribe()`. A WeakMap scopes
operation queues by owning browser client; the nested map scopes them again by exact sync/presence
topic. Different clients or topics do not block one another.

For one client/topic, subscribe first waits for prior work and removes every registry-retained
channel with the exact `realtime:${topic}` identity. It then rechecks client/topic identity before
creating and wiring a fresh channel. Unsubscribe captures the original channel/client/topic,
invalidates the instance immediately, and queues removal behind any in-flight subscribe. Rejected
prior operations are absorbed only for queue progression; the current operation's failure still
propagates to its caller. Queue entries delete themselves only if still current, avoiding stale
cleanup deleting newer work.

Callback and owner races were also reviewed:

- presence and subscription callbacks compare the captured channel with the live instance before
  mutating state;
- `SyncManager.disconnectRequested` terminates initialization before Realtime construction, after
  initial loading, and after subscription, unsubscribing any late-created Realtime instance;
- `disconnect()` marks terminal intent before cancelling throttles, listeners, handlers, and
  Realtime;
- `VaultProvider` captures the manager being initialized, awaits terminal cleanup after a cancelled
  initialization, and does not allow a stale manager to publish a document/failure state;
- `useVaultPresence` awaits subscription before reporting connected/starting heartbeat, and its
  cancellation path unsubscribes the captured instance without clearing a newer ref.

The two new unit tests are meaningful counterfactual regressions. On revision 01, the ownership test
necessarily fails because old code calls `channel.unsubscribe()` and never
`client.removeChannel(channel)`. The deferred-removal remount test also necessarily fails because
old teardown does not await the mocked owning-client removal; the second subscription receives the
already-subscribed retained channel and its guarded mock `on()` throws. This was proved from the
immutable revision-01 source without creating a temporary checkout. On HEAD, all four focused
Realtime tests pass, including both new cases.

The E2E replacement is also materially stronger than revision 01: it presses the authenticated
application's real `Lock` button, enters the same vault's recovery phrase without reloading the
client, requires `/transactions`, the initialized search and add controls, accessible `Saved`, no
failure UI, and no console/page error.

## Independent automated verification

All commands used Node `v22.21.1` and pinned Corepack pnpm `11.13.1`. No runner retry masked a
failure.

| Gate                                                | Result                                                   |
| --------------------------------------------------- | -------------------------------------------------------- |
| focused `tests/unit/sync/realtime.test.ts`          | 4/4 pass                                                 |
| Corepack strict frozen install                      | pass; already up to date                                 |
| wrapped strict frozen install                       | pass; already up to date; Safe Chain verification active |
| `pnpm dedupe --check` / supply-chain policy         | pass; 1,013 packages                                     |
| `pnpm audit --prod`                                 | pass; 0 known vulnerabilities                            |
| full audit                                          | expected exit 1; 11 dev-only findings, 0 critical        |
| format check                                        | pass; 475 matched files at review time                   |
| lint                                                | pass; 0 errors, 13 unchanged documented warnings         |
| typecheck                                           | pass                                                     |
| complete unit/integration suite                     | 41 files, 1,141/1,141 pass                               |
| production build                                    | pass twice; Next 16.2.10, TypeScript, 17 routes          |
| complete Chromium E2E, retries 0                    | 78/78 pass in 1.1m                                       |
| changed same-vault test, repeat 5, retries 0        | 5/5 pass in 12.2s                                        |
| identity/import/sync/tab slice, repeat 3, retries 0 | 51/51 pass in 46.4s                                      |

The first full-E2E launch could not start Playwright's configured web server and exited before test
collection. The exact repository `corepack pnpm dev` command then started normally; the full and
repeated suites passed against it. This reproduces the frozen evidence's environmental startup event
and is not a test retry or product failure. The explicit server was stopped, and the final
production build passed afterward with `next-env.d.ts` byte-clean.

## Independent installed-CLI product and UX charter

The review used repository-installed `@playwright/cli@0.1.17` through exact Corepack pnpm in unique
headless disposable sessions. It did not use MCP, `npx`, temporary files/config, headed/debug/UI,
dashboard/show, screenshots, PDF, trace, video, HAR, or storage-state output. Recovery material
remained inside automation calls and was zeroed before return; it is absent from this review and
retained artifacts.

Product/lifecycle results:

1. A real identity and vault completed three consecutive real Lock-button then same-vault unlock
   cycles in one page/client without reload. Every cycle reached `/transactions` on the first
   attempt, rendered the initialized vault, exposed accessible `Saved`, and showed neither failure
   UI nor browser errors.
2. All nine application destinations were traversed by named links: Transactions, Accounts, People,
   Tags, Statuses, Tx Descriptions, Automations, Imports, and Vault Settings.
3. The CLI created and rendered a person, description alias, automation, and `42.50` manual
   transaction. A synthetic in-memory CSV imported two valid transactions with zero filesystem
   temporary and left its two-row import ledger.
4. Reload/direct-navigation checks retained the transactions and CRUD/import records. A separate
   persistence transaction survived reload/unlock and was then edited while browser networking was
   offline; after reconnect and reload it retained the offline value and returned to `Saved`.
5. A named native `window.open` duplicate had a true opener, authenticated vault state, the same
   transaction data, and accessible `Saved`; it closed normally.

UX/accessibility results:

- Named semantics were present for search textbox, Add transaction button, status, navigation, and
  populated grid rows. Eight consecutive keyboard Tab targets had accessible names and at least one
  visible outline/ring treatment.
- At `320x720`, document client width, document scroll width, and body scroll width were all exactly
  320; the named mobile-menu button was present.
- At 200% CSS zoom in the 320px viewport, client and scroll width remained 320 with no
  document-level horizontal overflow.
- `prefers-reduced-motion: reduce` matched.
- Exercising the application `.dark` design tokens produced foreground RGB `[248,250,252]` on
  background `[2,6,24]`, independently calculated at `19.265:1` WCAG contrast. The inherited fact
  that OS dark emulation alone does not select the app's `.dark` class is unchanged and is not
  caused by this range.
- A fresh CLI page reported two informational development messages and zero warnings/errors. Loro
  WASM returned HTTP 200. Sanitized server/request inspection showed exercised registration, vault,
  sync, navigation, CRUD, and import requests returning HTTP 200.

One observer-popup close and one later observer account transition ended the CLI transport with
`Session closed`; the browser process was gone, the product had emitted no error, and a fresh
disposable observer immediately loaded normally with clean console/WASM results. This is a
repository-installed CLI transport quirk, not an application result, and did not substitute for any
required product assertion.

Browser provenance is explicit:

- stable E2E runner `@playwright/test@1.61.1` declares and used cached Chromium/headless-shell
  revision `1228` (Chrome for Testing `149.0.7827.55`);
- CLI's embedded Playwright core `1.62.0-alpha-1783623505000` declares Chromium revision `1232`
  (Chrome for Testing `151.0.7922.10`);
- the CLI used `/opt/google/chrome`; the executable reported Google Chrome `150.0.7871.128` in
  headless mode.

## Boundary, cleanup, and root action

HEAD remained exactly `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`; staged paths are empty. All CLI
sessions are closed and `playwright-cli list` reports no browsers. Revision-02 CLI YAML/log
artifacts were moved to recoverable trash, no temporary CSV was created, the dev server is stopped,
and pre-existing CLI/report artifacts were preserved. The final status contains only the root-owned
HANDOFF/PROGRESS changes, user-owned scratch change, and the frozen untracked implementation
evidence, plus this assigned review artifact.

This PASS authorizes root, and only root, to perform the exact reviewed `.claude/CLAUDE.md`
transcription from:

```text
- TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router), React 19
```

to:

```text
- TypeScript 6.x, Node.js 22.x LTS (Node.js 24.x supported), Next.js 16 (App Router), React 19
```

No other `.claude/CLAUDE.md` text is authorized by this review.

## Verdict

**PASS.** P01 satisfies HS-002 against the installed 48-hour Safe Chain policy, closes both
revision-01 findings, preserves the frozen dependency/runtime graph, and passes the required
automated, repeated, security, manual lifecycle, UX, browser, and cleanup gates.

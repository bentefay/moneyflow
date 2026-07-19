# P01 Implementation Evidence — Revision 02

## Contract and result

- Package: `P01` / `HS-002` dependency upgrades, revision `02`.
- Exact worker artifact: `specs/007-human-scratch-completion/evidence/P01/implementation-02.md`.
- Original package BASE: `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`.
- Pre-implementation HEAD: `fe00b2c5d574fffbb9bb92e1b8955bce9ec2a20f`.
- Implementation HEAD: `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`.
- Required review range:
  `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73..71aa257bb9bdad736fb7ef7315854fce42c5cbb4`.
- Revision-02 worker range:
  `fe00b2c5d574fffbb9bb92e1b8955bce9ec2a20f..71aa257bb9bdad736fb7ef7315854fce42c5cbb4`.
- Outcome: both revision-01 findings are remediated; complete and ready for independent review.
- This evidence file is intentionally uncommitted. The sole revision-02 implementation commit is
  `71aa257bb9bdad736fb7ef7315854fce42c5cbb4` — `fix: serialize realtime channel teardown`.

Revision 01's immutable implementation and review artifacts remain the historical record. This
revision corrects their pnpm/Vercel safety-window narrative using the installed Safe Chain policy,
then remedies the Supabase Realtime lifecycle regression with deterministic unit and real journey
coverage. The manifest and lockfile did not require another byte change: their `pnpm@11.13.1` pin
was already the newest release admitted by the installed policy's actual default 48-hour window.

## Boundary and ownership

- The worker changed only six authorized source/test paths in the implementation commit and wrote
  only this assigned evidence path afterward.
- The worker did not edit `.claude/**`, `.codex/**`, `supabase/**`, root ledgers, task artifacts,
  `SCOPE.json`, scratch, or the immutable FS-001 source.
- Root-owned unstaged changes to `HANDOFF.md` and `PROGRESS.md` were preserved.
- The user-owned unstaged `specs/human-scratch.md` was preserved. Its initial and final SHA-256 is
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`, 350 lines and 24,239 bytes.
- The immutable FS-001 source at `specs/008-transaction-percentage-allocations-settlement/spec.md`
  remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and
  25,441 bytes.
- Exact-path staging was used for the six implementation paths. No blanket staging was used.
- The final staged-path inventory is empty. This file is the sole worker-owned uncommitted path.

## Revision-02 implementation paths

| Path                                          | Purpose                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/supabase/realtime.ts`                | Serialize same-topic lifecycle operations, remove channels through their owning client, and reject stale callbacks.   |
| `src/lib/sync/manager.ts`                     | Await Realtime subscription and make disconnect terminal across initialization races.                                 |
| `src/hooks/use-vault-presence.ts`             | Await/cancel presence setup safely and clear heartbeat/reference state during cleanup.                                |
| `src/components/providers/vault-provider.tsx` | Disconnect managers that finish initialization after effect cancellation and explicitly discard cleanup promises.     |
| `tests/unit/sync/realtime.test.ts`            | Prove owning-client removal and teardown-before-same-topic-remount ordering.                                          |
| `tests/e2e/vault-settings.spec.ts`            | Exercise real authenticated Lock followed by same-vault unlock in one browser client with no reload or browser error. |

The implementation commit contains 302 insertions and 121 deletions across these six paths. No
manifest, lock, database schema, migration, or feature-scope path changed in revision 02.

## I-001 remediation — truthful installed Safe Chain result

### Policy authority

The installed executable is Safe Chain `1.5.13`. There is no user configuration file at
`/home/ben-agents/.safe-chain/config.json`; therefore no local minimum-age override applies. Safe
Chain's primary project documentation states that newly published packages are blocked by default
for 48 hours. The final executable checks were:

```text
safe-chain --version       -> Current safe-chain version: 1.5.13
user config check          -> NO_USER_SAFE_CHAIN_CONFIG
pnpm --version             -> 11.13.1
pnpm safe-chain-verify     -> OK: Safe-chain works!
corepack pnpm --version    -> 11.13.1
```

Primary policy source: <https://github.com/AikidoSec/safe-chain>. Registry version pages were also
checked directly at <https://www.npmjs.com/package/pnpm?activeTab=versions> and
<https://www.npmjs.com/package/vercel?activeTab=versions>.

Root resolved the revision-01 review's assumed 24-hour interval against this installed authority:
the unconfigured Safe Chain `1.5.13` default of 48 hours governs P01. No `Q-*` proposal is needed.

### Dated release calculation

Registry metadata was evaluated at `2026-07-19T16:06:55Z` (`2026-07-20T02:06:55+10:00`):

| Package/release | Registry publication time  | Age at cutoff | Default 48h result |
| --------------- | -------------------------- | ------------: | ------------------ |
| `pnpm@11.13.1`  | `2026-07-16T00:20:58.940Z` |   87h 45m 56s | eligible           |
| `pnpm@11.14.0`  | `2026-07-17T22:17:39.092Z` |   41h 49m 16s | suppressed         |
| `pnpm@11.15.0`  | `2026-07-18T12:31:32.691Z` |   27h 35m 22s | suppressed         |
| `vercel@56.3.2` | `2026-07-18T18:28:01.916Z` |   21h 38m 53s | suppressed         |

The registry's `latest` and `latest-11` tags pointed to `pnpm@11.15.0`, whose engine requirement was
compatible (`node >=22.13`), but it was not ordinary-safe-chain eligible at the cutoff.
`pnpm@11.14.0` was also still inside the same window. Before any diagnostic cache change, the
ordinary wrapped `pnpm --version` explicitly suppressed both releases and selected `11.13.1` as the
newest eligible pnpm 11. `vercel@56.3.2` was likewise correctly excluded, so `56.3.1` remains the
newest eligible Vercel release.

The revision-01 statement that `pnpm@11.15.0` was unpublished was false and is superseded by the
table above. Its Vercel cutoff date was also wrong; the corrected cutoff and age are above.

### Attempt ledger and clean final graph

While reconciling the review's 24-hour assumption, one exploratory, non-manifest command used
`SAFE_CHAIN_MINIMUM_PACKAGE_AGE_HOURS=24 pnpm --version`; it resolved and cached `11.15.0`. Root
then ruled that the installed unconfigured 48-hour default is authoritative. No product/manifest
state was accepted from that diagnostic. The repository was restored to exact `11.13.1`, then the
graph was rebuilt and frozen with that Corepack version:

```text
corepack pnpm clean --lockfile && corepack pnpm install
  -> exit 0; 1,013 resolved, 807 installed, 4.6s
corepack pnpm dedupe
  -> exit 0; eight redundant packages removed
corepack pnpm dedupe --check
  -> exit 0; dedupe and supply-chain verification pass
corepack pnpm install --frozen-lockfile --strict-peer-dependencies
  -> exit 0; already up to date, 291ms
pnpm install --frozen-lockfile --strict-peer-dependencies
  -> exit 0 through the installed Safe Chain wrapper, 296ms
pnpm dedupe --check
  -> exit 0 through the wrapper with supply-chain policy verification
```

The clean rebuild reproduces revision 01's exact final package identities:

- `package.json`: SHA-256 `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b`.
- `pnpm-lock.yaml`: SHA-256 `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`.
- `packageManager`: `pnpm@11.13.1`.
- `engines.pnpm`: `>=11.13.1 <12.0.0`.

`corepack pnpm outdated --format json` reports only the already documented deliberate major/tool
pins: Node-aligned `@types/node@22.20.1` versus 26, ESLint `9.39.5` versus 10, TypeScript `6.0.3`
versus 7, and repository-compatible oxfmt `0.57.0` versus 0.59. Every other direct pin remains
current under the final policy result. Revision 01's full before/after direct inventory and primary
migration references continue to apply unchanged.

## I-002 remediation — serialized Realtime lifecycle

### Root cause reproduced

Supabase Realtime `2.110.7` retains/reuses a client channel by topic. Revision 01 called the channel
object's unsubscribe method without removing it from the owning singleton client's registry. A
same-vault remount could therefore receive the previously subscribed channel and throw when the app
registered a new `postgres_changes` callback.

Two deterministic unit tests were added before the source fix and run against the failing source.
The focused result was exactly two passes and two failures:

- owning-client teardown expected one `removeChannel` call but observed zero;
- a deferred teardown followed by same-topic remount reproduced
  `cannot add callbacks after subscribe` against a realistic client channel registry.

This proves the tests fail for the defect rather than merely describing the final implementation.

### Lifecycle design

- A module-level `WeakMap`, keyed by the owning browser Supabase singleton, holds per-topic promise
  queues. It does not keep a client alive.
- `subscribe()` is now asynchronous. Before constructing/registering callbacks on a new channel, it
  waits for preceding same-topic work and removes any retained channel through
  `client.removeChannel`.
- `unsubscribe()` synchronously clears instance channel/client/topic/callback state, then queues
  removal through the captured owning client. This prevents stale callbacks while allowing effect
  cleanup to remain non-blocking.
- Channel status and presence callbacks capture the new channel and ignore themselves if that
  channel is no longer the instance's current channel.
- Sync and presence retain separate topics. Their callback semantics and update payloads are
  unchanged.
- `SyncManager.initialize()` checks a terminal `disconnectRequested` flag before and after initial
  loading and subscription. A disconnect racing initialization cannot publish an initialized manager
  or surface a cancellation as a product error.
- The vault provider and presence hook await setup, disconnect work completed after cancellation,
  and explicitly discard promises only at React cleanup boundaries where awaiting is impossible.
  Presence heartbeat and references are cleared synchronously.

After the fix, the focused Realtime test file passes 4/4. The real E2E journey now creates the
identity/vault, clicks the authenticated `Lock` control, unlocks the same vault with the same
in-memory phrase, and asserts `/transactions`, search, Add transaction, accessible `Saved`, no
failure UI, and no accumulated console/page errors—all without a page reload.

## Automated verification

All final commands ran on 2026-07-20 AEST with Node `v22.21.1` and Corepack pnpm `11.13.1`. No
runner retry masked a failure.

| Gate                                                                   |         Exit | Duration/result                                             |
| ---------------------------------------------------------------------- | -----------: | ----------------------------------------------------------- |
| Clean rebuild and final strict frozen installs                         |          `0` | Results recorded in I-001; exact 1,013-package graph        |
| `pnpm safe-chain-verify`                                               |          `0` | `OK: Safe-chain works!`                                     |
| `corepack pnpm audit --prod`                                           |          `0` | 0 known vulnerabilities                                     |
| `corepack pnpm audit --json`                                           | `1` expected | 11 dev-only findings: 3 low, 5 moderate, 3 high, 0 critical |
| `corepack pnpm format:check` before evidence                           |          `0` | 474 matched files, 2.656s                                   |
| `corepack pnpm lint`                                                   |          `0` | 0 errors; 13 documented warnings unchanged                  |
| `corepack pnpm typecheck`                                              |          `0` | 5.34s                                                       |
| `corepack pnpm test`                                                   |          `0` | 41 files, 1,141 tests, 4.59s                                |
| `corepack pnpm build`                                                  |          `0` | Next 16.2.10 compile/TypeScript/17 routes, about 22s        |
| `corepack pnpm exec playwright test --reporter=list --retries=0`       |          `0` | Chromium 78/78, 1.1m                                        |
| changed same-vault test, `--repeat-each=5 --retries=0`                 |          `0` | 5/5, 12.4s                                                  |
| identity/import/sync/tab critical slice, `--repeat-each=3 --retries=0` |          `0` | 51/51, 46.6s                                                |

The unit total increased from 1,139 to 1,141 solely because of the two Realtime regression tests.
The final E2E total remains 78 because the weak prior existing-user test was replaced by the real
same-client Lock/unlock journey.

The first Playwright invocation again could not start its configured auto web server and exited
before test collection. Starting the exact declared `corepack pnpm dev` process explicitly proved
healthy. The full, repeated changed, and repeated critical suites then passed against that server.
The server was stopped cleanly and a final production build passed afterward, leaving
`next-env.d.ts` byte-clean.

The remaining lint warnings, full-audit findings, and deprecated `stream-to-promise@2.2.0` are the
same documented revision-01 development-tool residuals. Production audit remains clean. No unsafe
transitive override or unrelated HS-018 implementation was added.

## Real headless installed-CLI charter

- Session: `p01-rev02-20260720`.
- Tool: repository-installed `@playwright/cli@0.1.17` through exact Corepack pnpm; no MCP, `npx`,
  headed/debug/dashboard/show, temporary test/config, trace, video, screenshot, PDF, HAR, or saved
  storage state.
- Sensitive recovery material was kept only inside browser automation calls. It is not reproduced
  here. All revision-02 generated CLI YAML/log artifacts were moved to recoverable trash after the
  session; pre-existing artifacts were preserved.

### Product, persistence, sync, and lifecycle

1. Created a real identity/vault and completed three consecutive same-vault Lock then unlock cycles
   in one page/client, without reload. Every cycle reached authenticated content, accessible
   `Saved`, and no `Failed to load vault` UI.
2. Navigated the complete product sidebar. Created and rendered `Revision Person`, `Revision Alias`,
   `Revision Rule`, and a `42.50` manual transaction.
3. Created an in-browser synthetic CSV `File` without a filesystem temporary. Preview showed two
   total/valid rows, zero errors, duplicates, and old rows, with the default account. Import
   produced two rows alongside the manual row, and the import ledger retained its filename/count.
4. Reload proved persistence of the three transactions. Later direct navigations proved the person,
   alias, rule, and import ledger also persisted.
5. A named native `window.open` duplicate retained a true opener relationship, authenticated vault
   state, `Saved`, and the three-row transaction state. It was closed normally.
6. With browser networking offline, changed a transaction description. The local value remained
   available; after reconnect the app reported `Saved`, and reload retained the edited value.

### UX, accessibility, theme, console, and requests

- At `320x720`, mobile navigation and populated content rendered with document width exactly 320 and
  no document-level horizontal overflow.
- At 200% CSS page zoom, document width still matched the viewport and had no horizontal overflow.
- Keyboard Tab reached named application links, menu, search, and filter controls. Inputs/buttons
  exposed visible focus rings (including a 2px computed ring on the search/filter sequence).
- `prefers-reduced-motion: reduce` matched. Dark design tokens were exercised by the application's
  `.dark` variant; representative foreground RGB `[248,250,252]` on background `[2,6,24]` measured
  WCAG contrast `19.27:1`, with no overflow. As already documented in P00/P01 review, mere OS dark
  emulation does not itself add the app's `.dark` class; that inherited theme-selection limitation
  is unchanged by this range.
- Final fresh-page CLI console inspection reported five informational messages, 0 warnings, and 0
  errors. No hydration, deprecation, callback-registration, or runtime failure appeared.
- Sanitized request inspection showed Loro WASM and all observed user/vault/sync/navigation/import
  application requests returning HTTP 200. No reusable identifier or request payload is copied into
  this evidence.

Browser provenance is explicit and unchanged from the revision-01 independent check:

- `@playwright/test@1.61.1` uses cached Chromium/headless-shell revision `1228`.
- CLI's embedded Playwright core alpha declares revision `1232`.
- The CLI used its declared `/opt/google/chrome` channel; the executable reported Google Chrome
  `150.0.7871.128` in headless mode.

## Revision-01 dependency result retained

The revision-01 implementation range remains part of the required original-BASE review range. Its
compatibility migrations and final dependency graph are retained without product changes here:

- Node `22.21.1`, pnpm `11.13.1`, Next `16.2.10`, React/ReactDOM `19.2.7`, TypeScript `6.0.3`,
  Supabase JS `2.110.7`, Loro CRDT `1.13.7`, stable Playwright Test `1.61.1`, and the complete
  direct table in `implementation-01.md`.
- Loro remains externalized from the Next server bundle, with browser WASM loading verified.
- DayPicker 10's `month_grid`, refreshed Supabase schema declarations/`version_vector`, and React
  hooks lint migrations remain covered by the full static/unit/browser gates.
- Patched transitive overrides, pnpm 11 build-script policy, production audit 0, and the documented
  dev-only residuals remain unchanged.
- TypeScript 7, ESLint 10, Node-aligned types, and oxfmt 0.57 remain deliberate major/tool pins;
  TanStack Virtual HS-018 remains explicitly out of scope.

The only superseded revision-01 claims are that pnpm 11.15 was unpublished, that a 24-hour window
governed, and the erroneous Vercel cutoff date. The corrected installed-policy decision and dated
metadata are authoritative in this revision.

## Required root-owned transcription

The worker correctly did not edit `.claude/CLAUDE.md`. After independent PASS, root must perform the
already-reviewed exact toolchain transcription from:

```text
- TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router), React 19
```

to:

```text
- TypeScript 6.x, Node.js 22.x LTS (Node.js 24.x supported), Next.js 16 (App Router), React 19
```

The exact pnpm patch remains in `package.json#packageManager`; no other authority text requires
revision-02 worker changes.

## Cleanup and final write boundary

- The CLI browser was closed. `delete-data` found no remaining session data, and CLI `list` reported
  `(no browsers)`.
- Exactly the revision-02 session's generated YAML/log artifacts (8 console logs and 25 page YAML
  files) were moved to recoverable trash. All older `.playwright-cli` artifacts were preserved.
- No temporary CSV or other filesystem test artifact was created.
- The explicit dev server was stopped. The final production build passed afterward.
- Before this evidence write, HEAD was exactly `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`; staged
  paths were empty; `next-env.d.ts` had no worktree diff; and the only pre-existing dirty paths were
  root-owned `HANDOFF.md`/`PROGRESS.md` plus user-owned scratch.
- `git diff --check` over the required original BASE through HEAD passed.

## Questions, decisions, and residual risks

- No `Q-*` proposal is required. Root resolved the only policy ambiguity by the process hierarchy:
  the installed unconfigured Safe Chain `1.5.13` default is authoritative.
- Residual risks are the unchanged dev-only audit advisories, one deprecated dev transitive,
  intentionally deferred migration-sized major/tool releases, and the existing TanStack Virtual
  compiler advisory. Production audit, frozen install, peer/dedupe policy, application build, 1,141
  tests, complete browser suite, repeated lifecycle journey, and real CLI charter are green.
- The Realtime operation queue is intentionally scoped per owning client and topic. Its behavior is
  directly covered with deferred teardown; the real same-client three-cycle charter adds runtime
  evidence beyond the automated regression.

## Final immutable identifiers

- Review BASE: `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`.
- Pre-implementation HEAD: `fe00b2c5d574fffbb9bb92e1b8955bce9ec2a20f`.
- Review/implementation HEAD: `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`.
- Revision-02 implementation commit: `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`.
- `package.json` SHA-256: `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b`.
- `pnpm-lock.yaml` SHA-256: `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`.

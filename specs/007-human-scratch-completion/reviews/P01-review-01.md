# P01 Revision 01 — Independent Review

- **Verdict:** FAIL
- **Package/revision:** `P01/01`
- **Reviewer:** independent `human_scratch_reviewer`
- **Review window:** 2026-07-20T01:38+10:00 through 2026-07-20T02:01+10:00
- **Literal BASE:** `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`
- **Literal HEAD:** `cc429f5212f1122be7694fcee457cdcb7575e5dc`
- **Range:** non-empty; 11 implementation commits and 19 changed paths, all inspected
- **Frozen implementation evidence:** `evidence/P01/implementation-01.md`, SHA-256
  `74360f86886a1abb10095b8ddb516789fdcee7525844889d7fcc178d7aa06a64`
- **Sole reviewer write:** this file

P01 revision 01 fails two core acceptance gates. First, it does not pin the latest published safe
pnpm 11 toolchain and its evidence incorrectly says that the already-published latest version did
not exist. Second, the Supabase upgrade introduces a same-vault lock/unlock regression: the first
authenticated page after unlock can terminate at `Failed to load vault` because the new Realtime
client reuses a previously subscribed channel and rejects the app's attempt to add callbacks. A
reload creates a fresh client and recovers, but that does not make the unlock journey acceptable.

The remainder of the dependency migration is substantially sound. Strict frozen installation,
peer/dedupe policy, formatting, lint, typecheck, production build, 1,139 unit/integration tests, 78
no-retry E2E tests, and a 51-test three-repeat critical slice all pass. Production audit is clean;
the 11 remaining advisories and one deprecated transitive are dev-tool-only and accurately scoped.

## Important findings

### I-001 — The pinned pnpm is not the latest published safe-chain toolchain, and the evidence's publication claim is false

- **Severity:** Medium
- **Category:** Dependency currency / evidence accuracy
- **Affected paths:** `.nvmrc`, `package.json`, `pnpm-lock.yaml`
- **Requirement:** `tasks/HS-002-dependency-upgrades.md:10,26-29,59`

The final manifest pins `packageManager: pnpm@11.13.1` and permits `>=11.13.1 <12`. The frozen
evidence says an initial `11.15.0` trial was “not published,” that Corepack correctly refused it,
and that `11.13.1` was the registry's latest published version. Independent registry metadata
contradicts that account:

| Release        | Registry publication time  |
| -------------- | -------------------------- |
| `pnpm@11.13.1` | `2026-07-16T00:20:58.940Z` |
| `pnpm@11.14.0` | `2026-07-17T22:17:39.092Z` |
| `pnpm@11.15.0` | `2026-07-18T12:31:32.691Z` |

Root dispatched P01 at `2026-07-20T00:42:07+10:00`, or `2026-07-19T14:42:07Z`. Thus `11.15.0` had
been published for more than 26 hours before implementation began, and `11.14.0` for more than 40
hours. At review time:

```text
corepack pnpm view pnpm version       -> 11.15.0
corepack pnpm view pnpm@11.15.0 version -> 11.15.0
pnpm@11.15.0 engines.node             -> >=22.13
```

It is compatible with the selected Node `22.21.1`. This is not harmless registry drift after the
evidence freeze: the release predates the entire implementation window and was beyond the stated
24-hour safety interval before dispatch. Revision 02 must select and validate the newest eligible
pnpm 11 release, regenerate/freeze the lock with that exact Corepack version, and replace the false
publication narrative with exact dated metadata and actual command results.

The Vercel pin itself remains defensible: `vercel@56.3.2` was published at
`2026-07-18T18:28:01.916Z`, less than 24 hours before the actual P01 evaluation window. However, the
frozen evidence gives its evaluation cutoff as `2026-07-18T15:18Z`, nearly a day before P01 was
dispatched and even before that release was published. Revision 02 must correct the apparent date
typo (likely July 19), recheck the release at its new cutoff, and state the true policy source.

### I-002 — Supabase 2.110.7 can leave same-vault unlock at a terminal realtime initialization error

- **Severity:** High
- **Category:** Runtime compatibility / sync / authentication
- **Affected dependency:** `@supabase/supabase-js@2.110.7` and its `@supabase/realtime-js@2.110.7`
- **Observed application paths:** `src/lib/supabase/realtime.ts:75-84`,
  `src/lib/sync/manager.ts:188-190`, `src/components/providers/vault-provider.tsx:158`
- **Requirement:** `tasks/HS-002-dependency-upgrades.md:24-31,42-45`

The installed CLI created a real identity and vault, locked it, entered the same in-memory recovery
phrase, and successfully completed the unlock mutation. `/transactions` then rendered only:

```text
Failed to load vault
cannot add `postgres_changes` callbacks for
realtime:vault:<redacted>:sync after `subscribe()`.
```

The browser emitted two errors, `SyncManager error` and `Failed to initialize vault`, with this
exact application stack:

```text
VaultRealtimeSync.subscribe        src/lib/supabase/realtime.ts:84
SyncManager.initialize             src/lib/sync/manager.ts:190
initialize                         src/components/providers/vault-provider.tsx:158
```

The upgraded installed Realtime source explains the result. Its `RealtimeClient.channel()` now
explicitly “creates (or reuses)” a channel and returns the existing object for the same topic. Its
`RealtimeChannel.on()` throws once `subscribe()` has already been called. The application's
`VaultRealtimeSync.unsubscribe()` awaits `channel.unsubscribe()` but does not call
`supabase.removeChannel(channel)`/teardown, so the singleton client's channel registry can retain
the subscribed object. Re-entering the same vault asks for the same topic and receives that old
object; adding the new `postgres_changes` callback then throws synchronously.

A full page reload recovered because it recreated the browser client, and the final fresh-page
console and WASM/API requests were clean. That recovery confirms rather than excuses the lifecycle
bug. The current E2E unlock test creates/unlocks an identity but does not cover lock followed by
same-vault unlock in one browser client, so 78/78 did not detect it.

Revision 02 must make channel lifecycle compatible with the upgraded client (for example, remove and
teardown through the owning Supabase client, with ordering safe across effect cleanup and remount),
then add a deterministic same-vault lock/unlock regression test that fails on this range. It must
prove the first post-unlock render succeeds without reload and without console errors.

## Complete range and semantic audit

The reviewed range contains these 11 commits, in order:

| Commit    | Subject                                                |
| --------- | ------------------------------------------------------ |
| `1aa6610` | `build: upgrade Node pnpm and development toolchain`   |
| `c480f65` | `build: upgrade crypto temporal and Loro chain`        |
| `fd00495` | `build: externalize Loro wasm from server bundle`      |
| `c2456e0` | `build: upgrade Next React and UI dependency chain`    |
| `2f571f4` | `build: upgrade data and API dependency chain`         |
| `7a3a924` | `build: upgrade Playwright test runner`                |
| `034dffb` | `build: patch and deduplicate transitive dependencies` |
| `cc32b3c` | `build: pin repository-compatible oxfmt`               |
| `3be552c` | `build: update pnpm and rebuild clean lockfile`        |
| `817ffde` | `refactor: satisfy current React hook lint rules`      |
| `cc429f5` | `build: pin published pnpm toolchain`                  |

All 19 changed paths are authorized by the dispatch. `git diff --check BASE..HEAD` passes. The range
does not modify `.claude/**`, `.codex/**`, `supabase/**`, scratch, control ledgers, or the immutable
FS-001 source.

Semantic results outside the findings:

- Node `22.21.1`, the Node 22/24 engine range, Next `16.2.10`, React `19.2.7`, and the direct peer
  graph are mutually compatible; strict peer installation passes.
- `serverExternalPackages: ["loro-crdt"]` is necessary and effective. Build succeeds and the real
  browser's Loro WASM request returns HTTP 200. `loro-crdt@1.13.7`, `loro-mirror@2.2.0`, and
  `loro-mirror-react@2.2.0` resolve as one compatible peer chain.
- DayPicker 10's `table` to `month_grid` class migration is correct; calendar E2E interaction
  passes.
- The regenerated Supabase declarations match migration 005's `vault_ops`, required snapshot
  `version_vector`, `updated_at`, one-to-one vault snapshot relationship, and RPC. The initial
  snapshot insert now supplies the required version vector.
- The controlled-state, prop-draft, hydration, identity, and auto-height React migrations are
  consistent with the new lint rules. The changed account, allocation, search, calendar, identity,
  onboarding, and transaction journeys pass. The invite page's hook-inside-effect issue predates
  this range and was not attributed to P01.
- `next-env.d.ts` is the supported Next 16 generated production routes reference and remained byte
  stable after the independent build.
- HS-018 was not smuggled in: `TransactionTable` still directly calls `useVirtualizer`, no
  conditional `useFlushSync` implementation appears, and the sole compiler advisory remains
  explicitly deferred.

## Currency, peer, lock, build-policy, audit, and deprecation review

`corepack pnpm outdated --format json` independently reports only the deliberate direct-major/tool
pins: `@types/node` 26 vs Node-aligned 22, ESLint 10 vs 9, TypeScript 7 vs 6, and oxfmt 0.59 vs
0.57. The TypeScript 7 and ESLint 10 deferrals are migration-sized and documented from official
sources. The oxfmt 0.57 pin is reproducibly the repository-compatible formatter selected by the
evidence. The missing pnpm update is separate because `packageManager` is not included in
`pnpm outdated`.

`pnpm-workspace.yaml` permits install scripts only for Supabase and explicitly denies esbuild,
sharp, and unrs-resolver. Its 11 targeted overrides resolve to patched compatible versions. The
lockfile installs frozen under strict peers, and `pnpm dedupe --check` exits 0. Direct React,
ReactDOM/types, tRPC, Loro, and major UI peers resolve consistently without an invalid peer warning.

- `pnpm audit --prod`: 0 known vulnerabilities.
- Full audit: 11 dev-only advisories, exactly 3 low, 5 moderate, 3 high, 0 critical, all through
  Vercel CLI's Undici graph in the independent result.
- `stream-to-promise@2.2.0`: one deprecated dev-only transitive under `vercel > @vercel/fun`; no
  repository-controlled compatible replacement was found.

These residual dev-tool findings are disclosed and do not independently fail P01.

## Independent automated verification

All commands used Node `v22.21.1` and the range's pinned Corepack pnpm `11.13.1` unless the registry
query names another release.

| Command/check                                                        | Result                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile --strict-peer-dependencies` | Exit 0; exact frozen graph.                                                           |
| `corepack pnpm dedupe --check`                                       | Exit 0; 1,013 packages, one documented deprecated transitive.                         |
| `corepack pnpm format:check`                                         | Exit 0; 473/473 matched files.                                                        |
| `corepack pnpm lint`                                                 | Exit 0; 0 errors and 13 warnings (12 existing unused symbols plus TanStack advisory). |
| `corepack pnpm typecheck`                                            | Exit 0.                                                                               |
| `corepack pnpm test`                                                 | Exit 0; 41/41 files and 1,139/1,139 tests.                                            |
| `corepack pnpm build`                                                | Exit 0; Next 16.2.10 Turbopack, TypeScript, and 17 routes.                            |
| `corepack pnpm audit --prod`                                         | Exit 0; no known vulnerabilities.                                                     |
| `corepack pnpm audit --json`                                         | Expected exit 1; 11 dev-only findings, 0 critical.                                    |
| full Playwright suite, `--retries=0`                                 | Exit 0; 78/78 in 1.1 minutes.                                                         |
| identity/import/sync/tab slice, `--repeat-each=3 --retries=0`        | Exit 0; 51/51 in 47.2 seconds.                                                        |

As disclosed by the implementation, the first full Playwright invocation could not start the
configured web server and exited before test collection. Starting the exact declared `pnpm dev`
command explicitly succeeded; the full and repeated suites then passed against it. The server was
stopped cleanly after the charter.

## Real headless installed-CLI review

- **Session:** `p01-review-20260720`
- **Tool/mode:** repository-installed `corepack pnpm browser` / `@playwright/cli@0.1.17`, unique
  headless session
- **No prohibited route:** no MCP, `npx`, temporary test/config/file, headed/debug/UI/show,
  dashboard, trace, video, screenshot, PDF, HAR, or storage-state artifact
- **Secrets:** recovery material was held only in the one CLI call intended to create/lock/unlock;
  it was not copied into this review or retained in browser storage/artifacts

### Product and persistence charter

1. Created an identity/vault, locked it, and unlocked the same vault. This exposed I-002 before any
   page reload.
2. After the diagnostic reload, navigation exposed deterministic owner role, named sync status, all
   product links, grid/rows, form controls, and keyboard-operable actions.
3. Created `Review Person`, `Review Alias`, and `Review Rule`; all rendered in their owning pages.
4. Created a manual `12.34` transaction.
5. Injected an in-browser synthetic CSV `File` without a filesystem temporary. Preview reported two
   total/valid rows, zero errors/duplicates/old rows, and the default account; import rendered
   `7.89` and `-4.56` alongside the manual row.
6. Reload retained the three transactions and later retained an offline description edit.
7. An opener-created native duplicate tab reached authenticated `/transactions`; a plain isolated
   new tab correctly lacked per-tab session state and was not misrepresented as duplication.
8. Offline editing produced expected failed network calls and local persistence. Reconnection did
   not show `Saved` within the two-second observation, but reload applied four unpushed IndexedDB
   ops, pushed successfully, and returned to `Saved`. This is retained as residual sync evidence,
   not promoted above the deterministic I-002 failure.

### UX, accessibility, theme, and browser provenance

- At `320x720`, mobile `Open menu` and the populated transaction grid remained exposed, with no
  document-level horizontal overflow.
- At a 640px CSS viewport with Chromium page scale 2, no document-level horizontal overflow appeared
  and keyboard Tab moved from the named search textbox to a `:focus-visible` control.
- `prefers-color-scheme: dark` and `prefers-reduced-motion: reduce` both matched. As in P00, the
  document body remained white under dark emulation; near-black search text on white has ample
  contrast. This inherited limitation is not caused by the dependency range.
- Snapshots exposed owner role, `Saved`/`Saving...` states, navigation/link/button/textbox/combobox/
  checkbox/grid/row names, and the responsive menu control.
- Final fresh-page console: 0 errors and 0 warnings. Cumulative request inspection retained the
  expected offline failures; later WASM, `vault.list`, `sync.getUpdates`, and `sync.pushOps`
  requests all returned HTTP 200.

Browser provenance is explicit:

- Stable `@playwright/test@1.61.1` uses cached Chromium/headless-shell revision `1228`.
- CLI's embedded Playwright core alpha declares revision `1232`.
- The actual CLI session launched the declared `/opt/google/chrome/chrome` channel in headless mode;
  the executable reported Google Chrome `150.0.7871.128` and the UA normalized the patch to
  `HeadlessChrome/150.0.0.0`.

## Required root-owned `.claude/CLAUDE.md` transcription

P01 correctly could not edit `.claude/**`, but the current authority still says:

```text
- TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router), React 19
```

After revision 02 has selected and passed the final toolchain, root must replace that exact line
before package PASS with:

```text
- TypeScript 6.x, Node.js 22.x LTS (Node.js 24.x supported), Next.js 16 (App Router), React 19
```

No other `.claude/CLAUDE.md` text requires dependency-version transcription. The exact pnpm patch
continues to belong in `package.json#packageManager`; the authority's generic `pnpm` commands remain
valid because Corepack resolves that repository pin.

## Cleanup and final write boundary

Before this review file was created:

- HEAD remained exactly `cc429f5212f1122be7694fcee457cdcb7575e5dc`, and staged paths were empty.
- Root-owned `HANDOFF.md`/`PROGRESS.md`, preserved scratch, and frozen untracked P01 evidence were
  the only pre-existing dirty/untracked paths.
- The evidence SHA, package SHA `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b`,
  and lock SHA `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f` remained exact.
  `next-env.d.ts` acquired no worktree diff.
- The review browser was closed; CLI list reported no browsers. Exactly 20 session YAML/log files
  were moved to recoverable trash, while all older `.playwright-cli` artifacts were preserved.
- No temporary CSV or other filesystem test artifact was created. The explicit dev server was
  stopped cleanly.

No product, test, migration, task, evidence, prior review, ledger, agent configuration, scratch, or
immutable FS source was edited by this reviewer. No commit was created.

## Questions

No `Q-PROPOSAL-P01-01-*` is needed. Published metadata, installed source, the runtime reproduction,
and the process hierarchy fully determine both remediations.

## Final verdict

**FAIL.** Preserve this review immutably and route P01 revision 02. Revision 02 must pin and
validate the latest eligible pnpm 11 toolchain with truthful dated evidence, correct the Vercel
cutoff date, and remediate/test the upgraded Supabase Realtime same-vault lock/unlock lifecycle.
Root may perform the exact `.claude/CLAUDE.md` transcription only after a new independent review
approves the revised literal range.

# P00 Revision 01 — Executable Baseline Evidence

## Dispatch and collection identity

- Package/revision: `P00/01`
- Role: `human_scratch_implementer` acting only as the P00 evidence collector
- Collection window: 2026-07-19T23:31:18+10:00 dispatch through 2026-07-19T23:55:53+10:00 final
  boundary recheck
- Literal BASE: `0ea864f5d0142530b2d524add228d3b51f162876`
- Final HEAD: `0ea864f5d0142530b2d524add228d3b51f162876`
- Range: empty; `git diff --exit-code BASE HEAD` exited 0
- Assigned persistent write: this file only
- Product/test/migration commit: none
- Collector verdict authority: none; this artifact reports results for independent review and does
  not mark P00 PASS

## Secret safety and evidence handling

- No environment values, request bodies/headers, recovery words, user/vault IDs, signatures, tokens,
  keys, or real financial records are recorded here.
- `.env.local`, `.env.local.example`, and `.envrc` were inspected only for variable names.
- Request query strings and long identifier-shaped values were redacted before terminal display.
- Manual data used only the labels `P00 Test Person`, `P00 Coffee Alias`, `P00 Test Automation`,
  `P00 Manual Transaction`, `P00 Imported Coffee`, and `P00 Imported Income`, with synthetic amounts
  `12.34`, `-4.25`, and `25.00`.
- The second identity's 12 recovery words existed only in a local variable inside one CLI `run-code`
  interaction, were never printed or written, and the array was overwritten before the command
  returned.
- Browser session `p00-baseline-01-20260719` used an in-memory, headless profile. It was closed;
  `delete-data` reported no retained user-data directory; `playwright-cli list` then reported no
  browsers.
- Only this session's exact timestamped `.playwright-cli` YAML/log files were removed. Twenty-three
  older, pre-existing `.playwright-cli` artifacts were preserved. No trace, HAR, video, PDF,
  screenshot, or storage-state file was created by this collector.

## Repository and worktree provenance

Command group, collected immediately after dispatch (exit 0, 0.1 seconds observed wall time):

```bash
git rev-parse HEAD
git branch --show-current
git status --short --branch
git status --porcelain=v2 --branch
git remote -v
git worktree list --porcelain
git rev-list --left-right --count HEAD...@{upstream}
git diff -- specs/human-scratch.md
git diff --cached --name-status
git ls-files --others --exclude-standard
```

Results:

- HEAD `0ea864f5d0142530b2d524add228d3b51f162876`, branch `main`, upstream `origin/main`, ahead 1
  and behind 0.
- Origin fetch/push remote is `git@github.com:bentefay/moneyflow.git`.
- One worktree: `/home/ben-agents/Code/moneyflow`, on `main` at the literal BASE.
- No staged or untracked paths.
- Actual initial unstaged paths were: `specs/007-human-scratch-completion/HANDOFF.md`,
  `specs/007-human-scratch-completion/PROGRESS.md`, and `specs/human-scratch.md`. The first two are
  root-owned dispatch/ledger edits created for this active package; the third is the preserved,
  user-owned frozen scratch working copy. The HANDOFF's earlier pre-dispatch inventory named only
  the scratch file, so this distinction is explicit rather than treating the root's dispatch writes
  as collector output.
- Final recheck at 2026-07-19T23:51:46+10:00 again showed the same three unstaged paths before this
  evidence file was added, no staged path, no other untracked path, and unchanged HEAD.
- `git diff --name-only BASE HEAD` was empty. The exact empty-range check exited 0.

### Required build side effect and restoration

`pnpm build` temporarily changed generated tracked file `next-env.d.ts` from
`./.next/dev/types/routes.d.ts` to `./.next/types/routes.d.ts`. This was a Next.js build side
effect, not a product implementation. The collector restored the single line byte-for-byte to the
BASE form with an exact patch. The final `git diff --exit-code -- next-env.d.ts` exited 0. This
transient side effect is disclosed for the reviewer; no tracked product/test change remains.

## Frozen sources, scope, reverse mappings, and DAG

Commands (exit 0; 0.1 seconds observed):

```bash
sha256sum specs/human-scratch.md \
  specs/008-transaction-percentage-allocations-settlement/spec.md
wc -l -c specs/human-scratch.md \
  specs/008-transaction-percentage-allocations-settlement/spec.md
```

A read-only Node check then:

1. loaded `SCOPE.json`;
2. located the unique HS-001 first line;
3. parsed top-level `- []`/`- [x]` blocks through EOF;
4. removed only the one structural blank line between blocks;
5. normalized an allowed `[x]` prefix to `[]`;
6. byte-compared every block to `sourceTextLines` in SCOPE array order;
7. checked the exact 22-ID set and uniqueness;
8. built every package-to-requirement reverse mapping; and
9. parsed the PROGRESS package table to verify dependency references and detect cycles.

Results:

- Scratch actual and rolling SHA-256:
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`.
- Scratch metadata: 350 lines, 24,239 bytes. HS-001 begins at byte offset 9,931.
- Exactly 21 ordered blocks; all 21 are unchecked, no authorized checked IDs, and every normalized
  block byte-matches its `sourceTextLines`.
- Per-block line counts in SCOPE order: `HS-001=5`, `HS-002=1`, `HS-021=1`, `HS-003=3`, `HS-004=72`,
  `HS-005=6`, `HS-006=2`, `HS-007=48`, `HS-008=4`, `HS-009=1`, `HS-010=2`, `HS-011=5`, `HS-012=3`,
  `HS-013=1`, `HS-014=5`, `HS-015=2`, `HS-016=4`, `HS-017=7`, `HS-018=2`, `HS-019=3`, `HS-020=3`.
- Canonical FS-001 actual SHA-256:
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`; exact 715 lines and 25,441
  bytes.
- FS-001 selector is exactly `{ "kind": "wholeFile", "lineRange": "1-715" }`; the canonical source
  has no mutation/completion marker.
- `SCOPE.json`: schema version 2, two sources, declared/actual/unique requirement count 22, exact ID
  set `HS-001` through `HS-021` plus `FS-001`.
- Package table: 32 unique rows including P00/P21; 32 expected; all reverse mappings agree and the
  dependency graph is acyclic with no missing/unknown dependency.

Exact requirement-to-package mappings verified:

| Requirement | Packages                     |
| ----------- | ---------------------------- |
| HS-001      | P13                          |
| HS-002      | P01                          |
| HS-003      | P10                          |
| HS-004      | P11A, P11B, P11C             |
| HS-005      | P12                          |
| HS-006      | P09                          |
| HS-007      | P17A, P17B, P17C, P17D       |
| HS-008      | P14                          |
| HS-009      | P16A, P16C, P16D             |
| HS-010      | P06                          |
| HS-011      | P07, P08                     |
| HS-012      | P08                          |
| HS-013      | P15                          |
| HS-014      | P04                          |
| HS-015      | P05                          |
| HS-016      | P20A                         |
| HS-017      | P02                          |
| HS-018      | P03                          |
| HS-019      | P18                          |
| HS-020      | P19                          |
| HS-021      | P20B                         |
| FS-001      | P16A, P16B, P16C, P16D, P16E |

Reverse multi-scope edges were explicitly verified as `P08 -> HS-011, HS-012` and
`P16A/P16C/P16D -> HS-009, FS-001`; every other reverse edge is the inverse of the table above.

One preliminary collector-only parser invocation incorrectly expected `[ ]` rather than the
repository's literal `[]`, reported one block, and was immediately corrected. The corrected parser
above is the authoritative result; this was not source drift.

## Tools, manifests, lockfile, and browser state

Command/method group (exit 0; 4.0 seconds observed):

```bash
node --version
pnpm --version
uname -a
codex --version
pnpm exec tsc --version
pnpm exec eslint --version
pnpm exec vitest --version
pnpm exec playwright --version
pnpm exec playwright-cli --help
pnpm list --depth=0 @playwright/test @playwright/cli playwright typescript next react vitest
pnpm exec playwright install --list
sha256sum package.json pnpm-lock.yaml
```

Results:

| Item                     | Baseline                                                           |
| ------------------------ | ------------------------------------------------------------------ |
| OS                       | Ubuntu kernel `7.0.0-15-generic`, x86_64                           |
| Node                     | `v22.21.1`                                                         |
| pnpm                     | `10.25.0`                                                          |
| Codex CLI                | `0.144.6`                                                          |
| TypeScript               | `6.0.2`                                                            |
| ESLint                   | `9.30.1`                                                           |
| Vitest                   | `4.1.2`, Node `v22.21.1`                                           |
| Next                     | `16.2.9`                                                           |
| React                    | `19.2.4`                                                           |
| Playwright Test          | `1.59.1`                                                           |
| Playwright CLI           | package `@playwright/cli 0.1.17`                                   |
| `package.json` SHA-256   | `341091fff0c32947df6b73ea0c567f0649ba1a45842cacaa47906550b1f365e3` |
| `pnpm-lock.yaml` SHA-256 | `8ab2d742e281f15b1ec205a9ff1bb79a52321a2d32b794088410a69cb4fcc8b8` |

- `package.json` has no `packageManager` or `engines` field.
- Playwright Test references browser revision `chromium-1217`, headless shell 1217 and ffmpeg 1011.
- Playwright CLI's alpha core `1.62.0-alpha-1783623505000` references Chromium/headless-shell 1232
  and the same ffmpeg 1011. Both revisions exist in `.cache/ms-playwright`; no separate
  `.cache/playwright-cli` directory exists.
- The repository authority describes Node 20, Next 15, TypeScript 5.x while the executable baseline
  is Node 22, Next 16, TypeScript 6. This is classified below rather than changed in P00.

## Services, URL readiness, migrations, and variable names

Read-only commands/methods (exit 0 after explicitly tolerating absent optional processes; 4.0
seconds in the combined tool/service group):

```bash
tmux list-sessions
tmux list-panes -a -F '#S:#I.#P pid=#{pane_pid} cmd=#{pane_current_command} path=#{pane_current_path}'
curl --output /dev/null --write-out '%{http_code}' --max-time 5 http://localhost:3000
curl --output /dev/null --write-out '%{http_code}' --max-time 5 \
  http://127.0.0.1:54321/rest/v1/
docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
pnpm exec supabase --version
pnpm exec supabase status
pnpm exec supabase migration list --local
```

Sensitive status lines were removed and database credentials were redacted before display.

- tmux session `0` is attached with two panes in this repository: pane 0's command is
  `safe-chain-bin`; pane 1 is `codex`. The app was already available and was not started/stopped by
  this collector.
- `http://localhost:3000` returned HTTP 200 before collection and after final cleanup.
- `http://127.0.0.1:54321/rest/v1/` returned HTTP 200.
- Docker client/server `29.6.2`.
- Running Supabase containers: studio, pg-meta, rest, realtime, kong, vector, analytics, and
  postgres; health was reported for studio, pg-meta, realtime, kong, analytics, and postgres.
- Supabase reported stopped auth, inbucket, storage, imgproxy, edge-runtime, and pooler services,
  while classifying the local development setup as running.
- Supabase CLI `2.84.10`; it reported `2.109.1` available. No upgrade was attempted.
- Migration list connected to local DB and reported local `005` and remote `005`, time `005`.
- Environment files present: `.env.local`, `.env.local.example`, `.envrc`.
- Names in `.env*`, never values: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`.
- Matching exported process variable names, never values: `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE`.
- Repository references also include names `NEXT_PUBLIC_ANALYTICS_ID`, `NEXT_PUBLIC_DEBUG`,
  `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET`, and `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN`; this records
  references only, not a claim that they are required for the local baseline.

## Executable quality and test matrix

All commands ran from `/home/ben-agents/Code/moneyflow`. Durations are `/usr/bin/time -p` real times
except where the runner's observed duration is identified.

| Timestamp/result                    | Exact command                                                                                                                                                                                                | Exit | Duration | Result/classification                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---: | -------: | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-19 before 23:34 +10         | `pnpm format:check`                                                                                                                                                                                          |    1 |    1.73s | RED: 468 files checked; only root-owned dirty `specs/007-human-scratch-completion/PROGRESS.md` reported. No collector fix permitted. |
| 2026-07-19 before 23:35 +10         | `pnpm lint`                                                                                                                                                                                                  |    0 |    8.81s | Green exit with 12 warnings, 0 errors.                                                                                               |
| 2026-07-19 before 23:35 +10         | `pnpm typecheck`                                                                                                                                                                                             |    0 |    2.33s | Green.                                                                                                                               |
| 2026-07-19 before 23:35 +10         | `pnpm build`                                                                                                                                                                                                 |    0 |   17.57s | Green; Next compiled, typechecked and generated 17 pages. The disclosed `next-env.d.ts` side effect was restored exactly.            |
| Start shown by Vitest: 23:34:51 +10 | `pnpm test`                                                                                                                                                                                                  |    0 |    3.90s | 41/41 files and 1,139/1,139 tests passed; Vitest duration 3.44s.                                                                     |
| 2026-07-19 after unit run           | `pnpm exec playwright test --retries=0 --reporter=line`                                                                                                                                                      |    0 |   79.29s | Full Chromium suite: 78/78 passed using 4 workers in reported 1.3m.                                                                  |
| Immediately after full E2E          | `pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/import.spec.ts tests/e2e/sync-persistence.spec.ts tests/e2e/tab-duplication.spec.ts --retries=0 --repeat-each=3 --workers=4 --reporter=line` |    0 |   58.12s | Flake sample: 51/51 passed, three repeats of 17 identity/import/persistence/duplicate-tab tests, no retries.                         |

Test inventory and seed limitations:

- 34 unit test files and 7 integration test files account for all 41 Vitest files.
- 11 E2E spec files account for 78 Playwright tests.
- Fourteen test files import fast-check and contain 59 `fc.assert` calls.
- Explicit `numRuns` values found: 10, 20, 30, and 50; assertions without an explicit value use
  fast-check's configured/default behavior.
- No property or E2E failure occurred, so neither framework emitted a failure seed. Passing
  fast-check random seeds are not printed by this configuration; that is an evidence limitation, not
  a hidden failure. There was therefore no failing seed to reproduce.
- Both Playwright runs explicitly disabled retries. The repeat sample had no inconsistent outcome.
- Playwright emitted repeated non-failing process warnings that `NO_COLOR` was ignored because
  `FORCE_COLOR` was set.

Lint warnings, all pre-existing and routed to P20B's full code-quality sweep unless an earlier
owning feature touches the file:

- unused `deleteAlias` in `src/app/(app)/transactions/page.tsx`;
- unused `InlineEditableText` in `TransactionRow.tsx`;
- unused `EPOCH_ZERO` in `src/lib/crdt/migration.ts`;
- unused `AccountTransactionTree` and `YearBucket` in `src/lib/crdt/queries.ts`;
- seven unused test imports/types across hierarchical-schema, transaction-mutations,
  transaction-ordering, and transaction-queries tests.

## Real headless Playwright CLI charter

Session/method:

```bash
pnpm exec playwright-cli -s=p00-baseline-01-20260719 open http://localhost:3000
# role/test-id CLI click/fill/press/snapshot/reload/resize/tab commands
# scoped run-code only for browser observation, media, synthetic file interaction,
# duplicate-tab behavior, contrast calculation, and the in-memory unlock journey
pnpm exec playwright-cli -s=p00-baseline-01-20260719 console error
pnpm exec playwright-cli -s=p00-baseline-01-20260719 console warning
pnpm exec playwright-cli -s=p00-baseline-01-20260719 requests
pnpm exec playwright-cli -s=p00-baseline-01-20260719 close
pnpm exec playwright-cli -s=p00-baseline-01-20260719 delete-data
```

- Headless session opened at artifact timestamp 2026-07-19T13:37:54Z and was closed/deleted before
  the 23:51:46+10 boundary check. Approximate charter duration: 12 minutes.
- No Playwright MCP, `npx`, ad-hoc Node browser script, temporary test/config, headed mode,
  `--debug`, `--ui`, or `show` was used.

### Product journey observed

1. Marketing home loaded with named Global navigation, Unlock/Get Started links, H1, feature and
   security content.
2. Get Started exposed a named `Generate Recovery Phrase` button. After generation, one checkbox
   changed `Create Account` from disabled to enabled. The first phrase remained unrevealed.
3. Account/vault creation landed on `/settings`; deterministic snapshot showed H1 `Vault Settings`,
   textbox `Vault Name`, combobox `Default currency`, status `Saved`, and all sidebar links.
4. People page started with default person `Me`. Keyboard Enter submitted `P00 Test Person`; count
   changed from 1 to 2.
5. Tx Descriptions started empty. `P00 Coffee Alias` was created with keyboard Enter and remained
   visible after `reload`.
6. Automations started empty. `P00 Test Automation` was created and rendered with `No conditions`
   and `No actions`.
7. Transactions initially showed 0. `Add transaction` opened the current tick/cancel entry row;
   `P00 Manual Transaction` amount `12.34` was submitted and rendered as one row.
8. A CSV was supplied through a browser `File`/`DataTransfer` interaction using only the synthetic
   three-line content. Preview showed 3 CSV rows including header, 2 total/valid, 0 errors,
   duplicates or old rows, and enabled `Import 2 Transactions`.
9. Import submitted and navigated to `/transactions`; input values proved all three descriptions and
   amounts `25.00`, `12.34`, and `-4.25`.
10. Refresh/persistence was observed for the alias and for saved transaction state.
11. A deliberately fresh `tab-new` had isolated session storage and redirected protected
    `/transactions` to `/unlock`. An opener-created browser duplicate (`window.open`, equivalent to
    native duplicate semantics for session storage) stayed on `/transactions` and rendered all three
    P00 values. A final duplicate check used only deterministic locator waits, not a sleep.
12. A second synthetic identity was created, its 12 words held only in memory, browser session
    storage cleared, 12 indexed unlock fields filled, and enabled Unlock submitted. The URL became
    `/transactions`; deterministic waits then observed visible `Add transaction` and `Saved`.

### Manual collector diagnostics that are not product failures

- The first synthetic CSV attempt contained literal escaped `\n` text, yielding no valid rows. It
  was cancelled; the corrected browser File contained actual line breaks and imported 2/2.
- The first import completion wait expected `/imports`, but successful product behavior navigated to
  `/transactions`; the wait timed out after the import had succeeded. The page and three input
  values then proved success.
- CLI `tab-new` is a fresh tab, not native duplicate semantics; its redirect was expected. The
  opener-created duplicate was the valid duplicate-tab observation.
- Preliminary duplicate observations included one arbitrary 500 ms wait, one unsupported
  `getByDisplayValue`, and one overly broad strict locator. Each was discarded and superseded by a
  clean reproduction using `waitForURL`, the named `Saved` status, and an exact input-value locator.
- A cleanup attempt to remove the whole `.playwright-cli` directory was rejected before execution.
  That broad deletion would also have removed user-owned artifacts. Exact session files were instead
  deleted while the 23 older files remained.
- A harmless `tab-close 1` reported that tab 1 did not exist immediately before the sanitized unlock
  run; tab 0 continued and the run succeeded.

## Deterministic accessibility, reflow, media, and contrast baseline

### Roles, names, states, and keyboard

- Desktop snapshot included links `Transactions`, `Accounts`, `People`, `Tags`, `Tx Descriptions`,
  `Statuses`, `Automations`, `Imports`, `Vault Settings`; button `Lock`; status `Saved`; H1
  `Vault Settings`; named settings controls.
- Transaction snapshot included grid `Transactions`, checkbox `Select all transactions`, each row's
  named selection checkbox, textboxes, account/status comboboxes, `Add notes`, and
  `Delete transaction`.
- Search textbox `Search description, notes...` was `:focus-visible=true`. Tab moved focus to named
  button `All time`, also `:focus-visible=true`; Shift+Tab returned to the named textbox.
- At 320 px, named `Open menu` opened a dialog with navigation links and moved focus to
  `My Vault owner`; Escape closed it and restored the menu trigger path.

### 320 px reflow

Exact route:

```bash
pnpm exec playwright-cli -s=p00-baseline-01-20260719 resize 320 720
pnpm exec playwright-cli -s=p00-baseline-01-20260719 snapshot
```

- viewport/client/document/body widths: `320/320/320/320`; no document horizontal overflow.
- The transaction grid intentionally contained horizontal overflow: scroll width 1,040, client
  width 270. It remained contained rather than widening the document.
- Desktop navigation was hidden; mobile `Open menu` and `Add transaction` remained visible.

### 200% zoom

After resize to 1280x720, scoped browser observation set
`document.documentElement.style.zoom = "200%"` and then reset it.

- zoom reported `200%`; document client/scroll widths `1280/1280`; body scroll width 640.
- No document horizontal overflow; Add transaction and the accessible transaction snapshot remained
  available.
- Limitation: CSS `zoom` is the PROCESS-authorized deterministic route but is not identical to every
  browser/platform's native zoom implementation.

### Contrast calculation

Canvas `getImageData` converted CSS Color 4 `lab()` colors to sRGB, and WCAG relative luminance was
calculated against the first opaque ancestor background.

| Control/state                  | Foreground / background |   Ratio | Threshold/result               |
| ------------------------------ | ----------------------- | ------: | ------------------------------ |
| `Add transaction`, 14 px/500   | `[98,116,142]` / white  |  4.76:1 | 4.5:1 normal text; passes      |
| Focused search text, 14 px/400 | `[2,6,24]` / white      | 20.16:1 | 4.5:1 normal text; passes      |
| Focused search ring/border     | `[15,23,43]` / white    | 17.83:1 | 3:1 focus/UI component; passes |

The unfocused generic border measured 1.23:1; this is recorded but not independently treated as a
WCAG failure because the sampled control has other visible affordances and a strong focused state.

### Reduced motion — reproducible accessibility defect

Exact route used repository CLI scoped `run-code` to emulate `{ reducedMotion: "reduce" }`.
`matchMedia("(prefers-reduced-motion: reduce)")` returned true. Opening the mobile menu still
produced five active animations, with observed durations including 150 ms and 500 ms. The 500 ms
sheet animation changed transform, opacity and filter; the overlay's 150 ms animation changed
transform, opacity and filter; three 150 ms button transitions changed background/color/opacity.
This is a truthful red accessibility baseline, routed to P02 animation evaluation and P20B final
quality/accessibility sweep.

### Dark media limitation

`emulateMedia({ colorScheme: "dark" })` made the dark media query true, but sampled transaction
button/search foregrounds and white background remained byte-identical to light mode. P00 does not
infer whether an explicit theme control is intended; it records that OS dark preference is not
currently reflected for P21's required dark-mode audit and routes product ownership to P20B unless
an earlier UI package introduces the behavior.

## Console and network evidence

Sanitized commands:

```bash
pnpm exec playwright-cli -s=p00-baseline-01-20260719 console error
pnpm exec playwright-cli -s=p00-baseline-01-20260719 console warning
pnpm exec playwright-cli -s=p00-baseline-01-20260719 requests \
  | sed -E 's/\?[^ ]*/?[REDACTED-QUERY]/g; s/[0-9a-f]{32,}/[REDACTED-ID]/g'
```

- Main charter: 0 console errors and 6 warnings.
- All six warnings were the same Radix accessibility warning:
  `Missing Description or aria-describedby={undefined} for DialogContent`, emitted on repeated
  mobile menu opens. This is reproducible and routed to the owning responsive shell/UI work or P20B.
- After the isolated create/unlock run: 0 errors and 0 warnings in that page's console set.
- Sanitized dynamic request list showed 27 entries. Twenty-five had terminal HTTP 200 responses,
  including user register, vault create/list, snapshot save/get, update get, op pushes, route
  navigations, and the Loro WASM.
- Two entries (`sync.pushOps` during alias reload/navigation and `sync.getUpdates` during a tab
  transition) had no terminal status in the cumulative CLI list. No 4xx/5xx response appeared; the
  later saved status and successful 200 sync operations are consistent with navigation-aborted or
  still-pending entries, but P00 does not overclaim a failure reason.
- CLI omitted 188 successful/static-detail requests by default. Full request headers/bodies were
  deliberately not opened because doing so could retain signatures or identifiers. Consequently this
  smoke does not prove that sensitive identity material is absent from every query; P04/P05 must do
  the authoritative RLS/realtime transport audit.

## Risk classification and route

| Category              | Baseline evidence and disposition                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control/format        | `format:check` is red only on root-owned dirty PROGRESS. Root must format its own ledger before claiming the repository-wide formatting gate green. P00 collector cannot edit it.                                                                                                                                                                                                                              |
| Dependency/toolchain  | Executable Node/Next/TS major versions differ from `.claude/CLAUDE.md`; package manager/engine pins are absent; Test and CLI use different Playwright core/browser revisions; Supabase CLI is behind its reported latest. Route compatibility and authority updates to P01, with CLI/test divergence retained as flake context.                                                                                |
| Security              | Local register/sync calls succeeded and no 4xx/5xx appeared, but P00 did not inspect signatures, RLS policies, raw query contents, realtime authorization, or stopped optional Supabase auth/storage services. No security delivery is claimed. Route to P04/P05/P06/P19 as scoped.                                                                                                                            |
| Privacy               | No real data or secrets were logged; browser profile/recovery material was deleted. Synthetic encrypted server records may remain like normal E2E test records. Query contents were intentionally not retained, so URL/header privacy requires P04/P05 verification.                                                                                                                                           |
| Migration             | Local/remote migration `005` agree, and a new vault works. No historical vault, rollback, alias/import/allocation schema migration, or stopped-service path was exercised. Route schema/migration proof to the owning feature packages and P21.                                                                                                                                                                |
| Data loss/recovery    | Refresh, IndexedDB-backed duplicate hydration and new-user unlock passed; full E2E sync/persistence passed. Import deletion/lineage undo, CRDT undo/redo, crash/offline conflict recovery, and multi-user destructive paths remain unproved/unimplemented. Route P09, P10, P14 and relevant P16/P17 packages.                                                                                                  |
| Financial correctness | Manual/import cents rendered correctly for three synthetic values, but the frozen percentage-allocation/settlement engine, bounds, exact apportionment, currencies, netting and traceability are not evidenced by this baseline. Route FS-001 to P16A-E and HS-009 to P16A/C/D.                                                                                                                                |
| Performance           | Build/test times are recorded and the small transaction grid contains horizontal overflow correctly. No large-vault, import-volume, virtualizer, GC-frame budget, memory, network-throttle or settlement benchmark was run. Route quantitative proof to P11C/P12/P13/P16D/P16E/P17D/P20B.                                                                                                                      |
| Accessibility         | Sampled names/roles, keyboard focus, 320 reflow, 200% zoom and contrast passed. Mobile DialogContent lacks a description warning, reduced-motion still runs a 500 ms transform/opacity/filter animation, and OS dark preference does not change sampled colors. Route P02/P20B and any earlier shell owner.                                                                                                    |
| UX/truthfulness       | Current Add Transaction still opens the confusing tick/cancel entry row explicitly targeted by HS-001/P13. People copy mentions invites while only person CRUD was visible; automation cards have no conditions/actions; these map to P07/P08 and P17A-D. Marketing claims `Smart Budgeting` and budget tracking despite frozen HS-016 saying MoneyFlow is categorising/allocating, not budgeting; route P20A. |
| Flake/reproducibility | Full no-retry E2E and 3x critical slice were green. Passing fast-check seeds are not logged. Two cumulative request entries lacked terminal statuses during navigation, with later saved/200 evidence. No retry-dependent pass is accepted.                                                                                                                                                                    |

## Questions and limitations

No ambiguity requires a `Q-PROPOSAL-P00-01-*` record. Existing Goal/PROCESS/SCOPE/task authority
determines all routes above. Human review may still be useful after completion, but no ordinary
preference question is needed to continue.

Evidence limitations are explicit:

- passing fast-check seeds are not emitted;
- request bodies/headers/query payloads were not retained for privacy;
- manual data volume was small and local-only;
- no two-distinct-user realtime collaboration was manually exercised in P00, although automated
  persistence/duplicate journeys passed;
- synthetic server records were not deleted because the app exposes no scoped cleanup in this
  charter; browser secret/profile state was deleted; and
- a truthful baseline does not assert that scoped future requirements are already implemented.

## Final handoff boundary

At 2026-07-19T23:55:53+10:00, after formatting this artifact:

- HEAD exactly `0ea864f5d0142530b2d524add228d3b51f162876`;
- BASE..HEAD empty (`git diff --exit-code` 0);
- no staged path;
- this assigned evidence file was the sole untracked path; root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md`, and preserved `specs/human-scratch.md` were the only other dirty paths;
- scratch and FS source hashes remained exact;
- package/lockfile hashes remained exact;
- app still returned HTTP 200;
- no CLI browser session remained;
- no P00 session artifact remained; and
- the transient `next-env.d.ts` build change was fully restored.

The sole new implementer path is
`specs/007-human-scratch-completion/evidence/P00/implementation-01.md`, intentionally uncommitted
for independent review. No commit was created.

# P00 Revision 02 — Corrected Executable Baseline Evidence

## Dispatch and correction identity

- Package/revision: `P00/02`
- Role: `human_scratch_implementer` acting only as the P00 evidence collector
- Collection window: 2026-07-20T00:18:11+10:00 through the final boundary audit recorded below
- Original literal BASE: `0ea864f5d0142530b2d524add228d3b51f162876`
- Dispatch/current HEAD: `8f12d82ddb576af5cc8c6f04d32617d805e300de`
- Assigned persistent write: this file only, left uncommitted
- Product, migration, test, task, ledger, configuration, and scratch writes: none
- Product/test/migration commit: none
- Collector verdict authority: none; independent review decides P00

Revision 02 corrects the sole defect identified by independent review in `P00-review-01.md`:
revision 01 incorrectly said Escape restored the 320 px mobile menu trigger. This revision
reproduced the sequence twice and records the actual deterministic result: after `Open menu` ->
Enter -> Escape and dialog detachment, the trigger is not focused, is not `:focus-visible`, and the
document has zero focused elements. This is a truthful red baseline routed to P20B. No product fix
is permitted in P00.

## Immutable revision-01 inheritance

Revision 01 and its review are immutable inputs:

| Artifact                            | SHA-256                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `evidence/P00/implementation-01.md` | `73349df979f97d0c4fb4eb7318a81695e794aa5d721d3fe2807934a9321f819c` |
| `reviews/P00-review-01.md`          | `a0c0b3fa146efc96411bdc0588f289eadc36a21546a3c96393c993662cb92580` |

The independent reviewer accepted revision 01's repository provenance, scope/DAG validation,
toolchain and services inventory, automated gates, broader product journey, security handling,
accessibility checks other than focus restoration, risk routing, and boundary discipline. Revision
02 refreshes the material checks below and supersedes only the false focus-restoration statement.
All other revision-01 evidence remains incorporated by reference where explicitly noted.

## Secret safety and browser cleanup

- No environment values, request bodies/headers, recovery words, user/vault identifiers, signatures,
  tokens, keys, or real financial records were printed or retained.
- Environment inspection recorded names only: `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`; the matching exported process name
  was only `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE`.
- A fresh identity was generated through the UI. Exactly 12 masked recovery entries were counted;
  none was revealed, read, printed, copied, or stored by the collector.
- Network output was sanitized and only terminal status/method/path-class evidence was retained.
  Headers, bodies, and query contents were not opened.
- Session `p00-baseline-02-20260720` was headless and in-memory. `close` reported the browser
  closed; `delete-data` reported no user data; the final CLI session list reported no browsers.
- Four exact revision-02 YAML/log artifacts were removed after the session. All 23 pre-existing CLI
  artifacts (21 YAML/log files and two PNGs) were preserved. No screenshot, trace, HAR, video, PDF,
  storage-state, or temporary browser script/config was created.
- A separately owned interactive Chrome process was present before and after the run and was not
  altered. It was not the CLI session used for this evidence.

## Repository provenance and authorized range

The initial repository audit at 2026-07-20T00:18:11+10:00 used:

```bash
git rev-parse HEAD
git branch --show-current
git status --short --branch
git status --porcelain=v2 --branch
git rev-list --left-right --count HEAD...@{upstream}
git log --oneline 0ea864f5d0142530b2d524add228d3b51f162876..HEAD
git diff --name-status 0ea864f5d0142530b2d524add228d3b51f162876..HEAD
git diff --cached --name-status
git ls-files --others --exclude-standard
```

Results:

- HEAD was exactly `8f12d82ddb576af5cc8c6f04d32617d805e300de`, branch `main`, ahead 3 and behind 0
  relative to its upstream.
- No staged or untracked path existed at collector start.
- The three unstaged paths were root-owned `HANDOFF.md`, root-owned `PROGRESS.md`, and preserved
  user-owned `specs/human-scratch.md`. The HANDOFF pre-dispatch inventory named only the scratch
  path; the two ledger paths are active root dispatch edits, not collector output.
- Original BASE..HEAD contains commits `00d47a4` (`docs: persist P00 revision 01 failure`) and
  `8f12d82` (`docs: record P00 revision 01 artifact commit`).
- Its changed paths are only `HANDOFF.md`, `PROGRESS.md`, immutable revision-01 evidence, and
  immutable revision-01 review. Product/test/migration/configuration/scratch path-filtered diff is
  empty.
- The non-empty range is therefore control evidence/ledger history only. Revision 02 did not amend,
  commit, stage, or edit any range path.

## Frozen sources, scope, mappings, and dependency graph

Refreshed at 2026-07-20T00:18:31+10:00 using `sha256sum`, `wc`, and the same read-only normalized
block/reverse-map/DAG checker documented in revision 01:

- `specs/human-scratch.md` SHA-256 remained
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`, exactly 350 lines and 24,239
  bytes.
- The canonical FS source SHA-256 remained
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes.
- All 21 normalized scratch blocks were unchecked and byte-matched their `SCOPE.json`
  `sourceTextLines` entries.
- `SCOPE.json` remained schema version 2 with 22 declared, actual, and unique requirements: exactly
  HS-001 through HS-021 plus FS-001. FS-001 retained the whole-file selector `1-715`.
- All requirement-to-package and package-to-requirement reverse mappings were exact.
- The package table contained 32 expected, actual, and unique rows; all dependencies resolved and
  the graph was acyclic.
- No completion marker or canonical scope source was edited.

## Tools, manifests, services, and readiness

Refreshed at 2026-07-20T00:18:44+10:00:

| Item                     | Revision-02 executable baseline                                    |
| ------------------------ | ------------------------------------------------------------------ |
| OS                       | Linux/Ubuntu kernel `7.0.0-15-generic`, x86_64                     |
| Node                     | `v22.21.1`                                                         |
| pnpm                     | `10.25.0`                                                          |
| Codex CLI                | `0.144.6`                                                          |
| TypeScript               | `6.0.2`                                                            |
| ESLint                   | `9.30.1`                                                           |
| Vitest                   | `4.1.2`                                                            |
| Next                     | `16.2.9`                                                           |
| React                    | `19.2.4`                                                           |
| Playwright Test          | `1.59.1`, browser revision 1217                                    |
| Playwright CLI           | `0.1.17`, alpha core/browser revision 1232                         |
| `package.json` SHA-256   | `341091fff0c32947df6b73ea0c567f0649ba1a45842cacaa47906550b1f365e3` |
| `pnpm-lock.yaml` SHA-256 | `8ab2d742e281f15b1ec205a9ff1bb79a52321a2d32b794088410a69cb4fcc8b8` |

- App `http://localhost:3000` and local REST `http://127.0.0.1:54321/rest/v1/` each returned
  HTTP 200.
- Docker client/server was `29.6.2`.
- Running Supabase containers were studio, pg-meta, rest, realtime, kong, vector, analytics, and db;
  stopped optional containers were auth, inbucket, storage, imgproxy, edge-runtime, and pooler.
- Supabase CLI was `2.84.10` and reported `2.109.1` available. No upgrade was attempted.
- Local and remote migrations both reported `005`.
- Environment files present were `.env.local`, `.env.local.example`, and `.envrc`; only the variable
  names listed in the secret-safety section were recorded.
- The Node/Next/TypeScript authority drift and Playwright Test/CLI browser-revision divergence
  remain the same routed dependency/toolchain risks recorded in revision 01.

## Refreshed executable quality matrix

All commands ran from `/home/ben-agents/Code/moneyflow`; durations are `/usr/bin/time -p` real
times.

| Exact command                                                                                                                                                                                                | Exit | Duration | Result                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---: | -------: | -------------------------------------------------------------------- |
| `pnpm format:check`                                                                                                                                                                                          |    0 |    1.71s | 470/470 files formatted.                                             |
| `pnpm lint`                                                                                                                                                                                                  |    0 |    9.11s | 0 errors and the same 12 pre-existing warnings.                      |
| `pnpm typecheck`                                                                                                                                                                                             |    0 |    2.33s | Green.                                                               |
| `pnpm test`                                                                                                                                                                                                  |    0 |    3.87s | 41/41 files and 1,139/1,139 tests passed; runner start 00:19:15 +10. |
| `pnpm exec playwright test --retries=0 --reporter=line`                                                                                                                                                      |    0 |   84.43s | 78/78 passed using 4 workers; runner reported 1.4m.                  |
| `pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/import.spec.ts tests/e2e/sync-persistence.spec.ts tests/e2e/tab-duplication.spec.ts --retries=0 --repeat-each=3 --workers=4 --reporter=line` |    0 |   60.55s | 51/51 passed; three repeats, no retries or inconsistent outcomes.    |

Lint warnings are unchanged from revision 01: five unused product symbols and seven unused test
imports/types. They remain routed to P20B unless an earlier owning package touches the file.

`pnpm build` was not rerun in revision 02. Immutable revision-01 evidence records a green exact run
(`pnpm build`, exit 0, 17.57s, 17 generated pages), independently accepted by the reviewer. A build
also knowingly rewrites tracked generated `next-env.d.ts`; rerunning it would violate this
dispatch's no-product-write boundary. Package/lock hashes are unchanged and the
original-BASE-to-current-HEAD product/test diff is empty, so revision 02 inherits that accepted
build result and clearly identifies the limitation rather than causing and restoring another
forbidden write.

Passing fast-check seeds remain unavailable because the configuration does not emit them. No test
failed, no framework emitted a failure seed, and no retry-dependent pass is accepted.

## Real headless CLI correction charter

The repository CLI was used with session `p00-baseline-02-20260720` and deterministic locator/state
waits. No MCP browser, `npx`, temporary script/config, arbitrary sleep, headed mode, debugger, or UI
runner was used.

### Fresh identity and persistence sanity

1. `/new-user` loaded and `Generate Recovery Phrase` was activated.
2. Exactly 12 masked phrase entries appeared; the confirmation checkbox enabled `Create Account`.
3. Creation reached `/settings`, where H1 `Vault Settings` and status `Saved` were visible.
4. At desktop width, `/transactions` showed `Saved` and `Add transaction`; after reload both were
   visible again.

This minimal refresh supplements, but does not replace, revision 01's accepted broader journey:
identity creation/unlock, people, aliases, automations, transaction creation, CSV import, refresh,
sync persistence, and duplicate-tab behavior.

### Required I-001 reproduction — iteration 1

At viewport 320 x 720:

1. Focused named button `Open menu`: trigger focused `true`, `:focus-visible=true`, document focus
   count `1`.
2. Pressed Enter: the dialog was visible; `My Vault owner` was focused `true` and
   `:focus-visible=true`; focus count `1`.
3. Pressed Escape and waited for the dialog to reach deterministic state `detached`.
4. Result: dialog count `0`; trigger focused `false`; trigger `:focus-visible=false`; document focus
   count `0`.

### Required I-001 reproduction — iteration 2

The exact sequence was repeated independently at 320 x 720:

1. Before opening: trigger focused `true`, `:focus-visible=true`, focus count `1`.
2. After Enter: dialog visible; `My Vault owner` focused and `:focus-visible`; focus count `1`.
3. After Escape plus deterministic dialog detachment: dialog count `0`; trigger focused `false`;
   trigger `:focus-visible=false`; focus count `0`.

The result was identical twice. Escape closes the dialog but **does not restore focus to the mobile
menu trigger**. The focus path disappears entirely. This supersedes revision 01's contradictory
sentence and is routed as an accessibility/keyboard defect to P20B, the package owning the final
responsive-shell and accessibility quality sweep. P00 does not fix it.

## Accessibility, reflow, media, and contrast refresh

### 320 px and reduced motion

- At 320 x 720 under `prefers-reduced-motion: reduce`, media matching returned `true`.
- Document client/scroll/body widths were `320/320/320`; no document horizontal overflow occurred.
- `Open menu` remained visible and keyboard operable through opening.
- Three active animations were observed during this sample: a 150 ms button opacity transition, a
  150 ms div transform/opacity/filter animation, and a 500 ms div transform/opacity/filter
  animation.
- Escape plus deterministic detachment again left focus count `0`.

Reduced-motion animation remains a red issue routed primarily to P02's animation evaluation and to
P20B's final audit. The focus-loss defect is separately routed to P20B.

### 200% authorized CSS zoom

At 1280 x 720, `document.documentElement.style.zoom = "200%"` produced document client/scroll widths
`1280/1280`, body scroll width `640`, no document horizontal overflow, and a visible
`Add transaction` control. Zoom was reset after observation. As in revision 01, deterministic CSS
zoom is not identical to every browser/platform native-zoom implementation.

### Keyboard focus and contrast

- Search textbox `Search description, notes...` was keyboard focusable and `:focus-visible=true`
  with a 2 px focus ring.
- Refreshed CSS color observations for the focused search were foreground
  `lab(1.76974 1.32743 -9.28855)` and ring/border `lab(7.78673 1.82345 -15.0537)`.
- With unchanged product CSS and an empty product range, the independently accepted revision-01
  calculations remain: Add text `4.64:1`, search text `20.16:1`, focused ring `17.83:1`, and Saved
  status `18.32:1`, all above their applicable sampled thresholds.

## Console and network evidence

- The repeated mobile-dialog actions produced six cumulative warnings: the known Radix
  `DialogContent` missing-description/`aria-describedby` accessibility warning. No console error was
  observed during those actions. This remains routed to the responsive shell/P20B.
- After navigation and reload to the final transaction page, the current page console set contained
  0 errors and 0 warnings. This page-set reset does not erase or contradict the six earlier dialog
  warnings.
- Sanitized request output contained 14 dynamic entries, all with terminal HTTP 200 responses,
  including WASM, register/create, snapshot, vault-list, sync-update, and sync-snapshot operations.
  The CLI omitted 173 successful/static-detail entries.
- No 4xx/5xx or missing terminal status appeared in the retained dynamic list.
- Headers, bodies, signatures, identifiers, and query contents were intentionally not opened, so
  this smoke does not claim transport/RLS privacy proof. Those remain owned by P04/P05.

## Risk classification and routes

| Category                | Revision-02 evidence and disposition                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control/format          | All refreshed formatting/type/test gates are green. Original BASE..HEAD is non-empty only for persisted P00 control artifacts. This sole evidence file remains uncommitted.                                                       |
| Dependency/toolchain    | Node/Next/TypeScript differ from repository narrative authority; package/engine pins are absent; Test and CLI use different Playwright revisions; Supabase CLI is behind the reported available version. Retain P01/P20B routing. |
| Security/privacy        | No secret or real data was retained. HTTP smoke passed, but signatures, request payloads, RLS, realtime authorization, and stopped optional services were not audited. Route P04/P05/P06/P19.                                     |
| Migration/data recovery | Local/remote `005` agree and identity creation/persistence works. Historical upgrade, rollback, destructive recovery, offline conflict, import lineage, and CRDT undo/redo remain unproved. Route owning packages and P21.        |
| Financial correctness   | This correction charter did not re-evaluate the future allocation/settlement engine, bounds, currencies, netting, or traceability. Route FS-001 to P16A-E and HS-009 to P16A/C/D.                                                 |
| Performance             | Automated durations are recorded, but no large-vault, memory, import-volume, virtualizer, network-throttle, settlement, or frame-budget benchmark ran. Retain owning package/P20B routes.                                         |
| Accessibility           | **Red:** Escape loses the mobile menu focus path twice at 320 px. Reduced-motion still has 150/500 ms animations. Dialog description warnings remain. Route focus/shell/warnings to P20B and motion to P02 plus P20B.             |
| UX/truthfulness         | Revision 01's accepted future-feature and marketing-copy routes remain unchanged. This revision makes no implementation-completeness claim.                                                                                       |
| Flake/reproducibility   | Full no-retry E2E and the 3x critical slice are green. The focus defect reproduced identically twice with deterministic dialog-detachment waits. Passing property seeds are not emitted.                                          |

## Questions and limitations

No ambiguity requires a `Q-PROPOSAL-P00-02-*` record. Existing authority determines the routes and
P00 explicitly forbids product remediation.

Limitations remain explicit:

- revision 02 inherits the accepted green build rather than causing a forbidden tracked generated
  file rewrite;
- passing fast-check seeds are not emitted;
- request headers, bodies, and queries were not retained for privacy;
- manual data volume was small and local-only;
- the broader manual product journey is inherited from immutable revision 01 rather than repeated;
- deterministic CSS zoom does not cover every native browser zoom implementation; and
- a baseline records routed red findings and does not assert future scoped requirements are done.

## Final handoff boundary

At 2026-07-20T00:26:49+10:00, after formatting and secret scanning this artifact, the final audit
showed:

- HEAD exactly `8f12d82ddb576af5cc8c6f04d32617d805e300de`;
- original BASE..HEAD changed paths limited to P00 control ledgers/evidence/review, with an empty
  product/test/migration/configuration/scratch path-filtered diff;
- no staged path;
- this assigned evidence file as the sole new untracked path;
- the same root-owned HANDOFF/PROGRESS edits and preserved user-owned scratch change;
- unchanged scratch, FS, package, and lockfile hashes;
- app and local REST each still returned HTTP 200;
- `playwright-cli list` reported `(no browsers)` and no retained user-data directory existed for
  `p00-baseline-02-20260720`;
- no revision-02 CLI artifact; and
- no commit created by the revision-02 collector.

`git diff --check` exited 0, the targeted high-confidence credential-pattern scan returned no match,
and the evidence-only formatter check passed. The unchanged immutable input hashes are recorded
above.

The sole revision-02 implementer output is
`specs/007-human-scratch-completion/evidence/P00/implementation-02.md`, intentionally uncommitted
for independent review.

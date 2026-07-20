# P05 Diagnostic Evidence — Revision 12

## Immutable no-product boundary

- Package/scope/revision: `P05` / `HS-015` / `12`, diagnostic recheck only.
- Checked date/time: `2026-07-20T15:18:22+10:00` (Australia/Brisbane).
- Original package BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Preserved last reviewed P05 product HEAD: `7f0b0710e820b87be2ee8877a3b7693d90e5e505`.
- Required unchanged pre-diagnostic HEAD: `824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`.
- Allowed product/test/config/dependency/migration paths: none. No executable change or commit is
  authorized.
- Sole worker write: `specs/007-human-scratch-completion/evidence/P05/implementation-12.md`,
  intentionally uncommitted.
- Initial index/untracked set was empty. Git-visible dirt was exactly root-owned unstaged
  `HANDOFF.md` and `PROGRESS.md`.

This diagnostic applies D-011, canonical Q-013, the P05 external gate in `DEPENDENCIES.md`, the
HS-015 task and immutable revision-11 evidence/review. A diagnostic PASS would mean only that this
recheck is complete. It cannot mark P05/HS-015 passed or authorize P08/P10.

## Recheck question and stop rule

The only success topology is a repository-authorized installed headless CLI page that is truly
hidden and proves `document.visibilityState === "hidden"` at normal-UI mutation, 15 seconds and
eventual completion without focus/reload. Only then may sanitized elapsed socket receipt, exact Loro
import and DOM publication identify the first late owner.

The following are explicitly not substitutes: a non-selected visible tab; headed mode; temporary
test/config/custom launcher; lifecycle/visibility emulation; direct unsupported CDP; a minimized or
frozen page called hidden; focus/reload/poll; arbitrary sleep; timeout changes; fixture/service
mutation; or speculative `worker: true`. If installed supported authority cannot create the
topology, the required result is the exact unchanged unavailable condition and `blocked_external`.

## Installed version and path inventory

Repository and lockfile remain pinned as follows:

| Layer                                | Installed/resolved version   | Primary installed path/evidence                                                                 |
| ------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| CLI package                          | `@playwright/cli 0.1.17`     | `node_modules/.pnpm/@playwright+cli@0.1.17/node_modules/@playwright/cli/package.json`           |
| CLI-bundled Playwright               | `1.62.0-alpha-1783623505000` | `node_modules/.pnpm/playwright@1.62.0-alpha-1783623505000/node_modules/playwright/package.json` |
| CLI-bundled Playwright Core/protocol | `1.62.0-alpha-1783623505000` | `node_modules/.pnpm/playwright-core@1.62.0-alpha-1783623505000/node_modules/playwright-core`    |
| Repository test runner               | `@playwright/test 1.61.1`    | `node_modules/.pnpm/@playwright+test@1.61.1/node_modules/@playwright/test/package.json`         |
| Repository Playwright/runtime        | `1.61.1`                     | `node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/package.json`                     |

`package.json` pins `@playwright/cli` to `0.1.17` and `@playwright/test` to `1.61.1`.
`pnpm-lock.yaml` resolves the CLI to bundled Playwright/Core `1.62.0-alpha-1783623505000` and the
repository runner to Playwright/Core `1.61.1`. Observed commands agree: `playwright-cli --version`
returned `0.1.17`; repository `playwright --version` returned `1.61.1`.

Installed primary-source identities used for this recheck:

| Installed source              | SHA-256                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| CLI `package.json`            | `3c502a0c69fd29faaa649c907d243ba13f6593575d2834a9b0d9a1fc2bd3524c` |
| CLI `README.md`               | `93f5675ea24792987df053e6a5cab4f063c500e1aad7388855ce09a13c9acd20` |
| bundled `types/protocol.d.ts` | `b836eed98b79fabb54f1df73252a0ce178b8df4a89794251ade2fa0c5e52b678` |
| bundled CLI `help.json`       | `9ab2fbca8401ce994f2148f90b7f322150526b39fbf937fcc166bd2bc1d2c509` |
| bundled `coreBundle.js`       | `be2e09efef3017b4eaa76f0cb5289f66c4ea57833f94319b17c1c2f184987ad7` |
| bundled `browsers.json`       | `612a100346f104d83de93de79fe9510e0b5f47435688bb0ba7ebb34409efad51` |
| repository `package.json`     | `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` |
| repository `pnpm-lock.yaml`   | `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f` |

The CLI bundle declares Chromium/headless-shell revision `1232`, browser version `151.0.7922.10`;
Firefox revision `1534`, version `152.0.4`; and WebKit revision `2327`, version `26.5`. No package,
lockfile or installed runtime upgrade has occurred since D-011's version check.

## Installed CLI help and README audit

`pnpm exec playwright-cli --help`, `--help open`, `--help tab-select` and `--help run-code` are the
installed command authority.

- The CLI is headless by default. `open` exposes `--headed`, which PROCESS and HANDOFF forbid.
- Its complete Tabs surface is `tab-list`, `tab-new`, `tab-close` and `tab-select`. There is no
  hide, background, minimize, occlude or page-visibility command/flag.
- `tab-select` only selects an index. Installed runtime source implements it by
  `await tab.page.bringToFront()` and assigning `_currentTab`; it does not hide the other page.
- `run-code` invokes a function with public Playwright `page` authority. Public Playwright exposes
  `page.bringToFront()`, not a symmetric hide/background API. Using it to open a raw CDP session is
  the specifically forbidden unsupported-CDP substitute, not a hidden-topology feature.
- README 0.1.17 likewise documents headless/headed selection and the four tab commands, but no
  supported real-hidden operation. Its phrase about agents running “in the background” describes
  processes/dashboard monitoring, not `Document.visibilityState`.

No help/README/runtime command changed the prior unavailable condition.

## Bundled protocol and runtime audit

The bundled Chromium protocol declaration is unchanged at the controlling edge:

```text
Page.setWebLifecycleState.state: "frozen" | "active"
Page.setPageVisibilityState: absent
```

`frozen` pauses lifecycle work and is forbidden as a hidden substitute. The protocol also declares
`Browser.setWindowBounds` with `normal|minimized|maximized|fullscreen`, but the installed CLI does
not expose it; headless mode has no ordinary OS window to minimize; direct CDP use is forbidden; and
minimized/frozen alone would still require an independently observed hidden document rather than a
label. Therefore this raw protocol declaration is not an installed supported hidden topology.

The CLI runtime's only relevant tab operation calls `page.bringToFront()`. Searches of installed CLI
help, README, public types, CLI client/runtime and protocol found no supported inverse that creates
and verifies a truly hidden headless page. Element `hidden` assertions, extension background pages,
background services, omitted screenshot backgrounds and headless launch settings are unrelated to
the Page Visibility API and cannot satisfy Q-013.

## Allowed runtime observation

Because installed sources expose no supported hidden mechanism, no MoneyFlow app/server/session or
product mutation was authorized. I used one unique disposable installed-CLI session,
`p05-recheck12`, only with two `about:blank` pages:

1. `pnpm exec playwright-cli -s=p05-recheck12 open about:blank`
2. `pnpm exec playwright-cli -s=p05-recheck12 tab-new about:blank`
3. list and select tab 1 through normal CLI commands;
4. supported `run-code` read `document.visibilityState`, `document.hidden` and `document.hasFocus()`
   from both context pages.

Observed sanitized result after selection:

```json
[
    { "index": 0, "visibilityState": "visible", "hidden": false, "hasFocus": true },
    { "index": 1, "visibilityState": "visible", "hidden": false, "hasFocus": true }
]
```

`playwright-cli list` independently reported browser type `chrome`, in-memory user data and
`headed: false`. The result reproduces D-011's exact topology limitation: selection/non-selection
does not create a hidden document in the mandatory headless CLI. Both pages even report focus, which
further prevents treating headless tab selection as an OS visibility fact.

This observation is intentionally not an HS-015 live-sync test. Since no page was hidden, I did not
wait 15 seconds, start the product, create an identity/vault/financial value, instrument a socket or
Loro document, or record fictional frame/import/DOM timing. Revision-11's independently measured
visible-page timings remain the only applicable values: socket frame/import `2,549 ms`, DOM
publication `2,591 ms`, rows `1/1`. They prove visible live convergence, not hidden acceptance and
not a product owner.

## Disposition and dependency impact

The D-011/Q-013 unavailable condition is **unchanged** on 2026-07-20:

- repository authority still requires installed headless CLI and forbids every known substitute;
- the installed CLI still has no supported hide/background/minimize visibility command;
- tab selection still calls only `bringToFront()`;
- the bundled protocol still offers only `active|frozen` lifecycle and no page-visibility command;
- the allowed two-page runtime still reports both documents `visible`.

Recommendation: retain P05/HS-015 as `blocked_external`; preserve revision-11's independently green
same-identity manager fix at product HEAD `7f0b0710e820b87be2ee8877a3b7693d90e5e505`; keep HS-015
unchecked; authorize no `worker: true`, timeout, reload/focus/poll, emulation or product/test diff;
and keep P08/P10 dependency-blocked. Recheck at the next installed CLI/Playwright upgrade that
documents a verifiable real-hidden headless topology, or before P21. Only a future causal hidden run
may name the first late owner.

No new Q proposal is needed. D-011 and Q-013 completely decide this result.

## Validation and cleanup

- No broad product tests were rerun: this revision changes no executable behavior and the required
  topology is unavailable. Revision-11 green manager/product evidence remains immutable.
- The disposable CLI browser was closed and `delete-data` reported no persistent profile because it
  was in-memory. `playwright-cli list` returned `(no browsers)`.
- The two generated `.playwright-cli` snapshots/directory were moved to desktop trash with `gio`.
  Repository-local `.playwright-cli`, `test-results` and `playwright-report` are absent. No
  `p05-recheck12` CLI/daemon process remains.
- No app development server was started or used. Any pre-existing workspace process was left
  untouched.
- Read-only local SQL checks found exact zero rows in `auth.users`, all nine public base tables and
  `realtime.subscription`. No reset or service mutation was needed.
- Exact-path `oxfmt --check` and `git diff --check` are required at final handoff.

Frozen identities remain exact:

- rolling scratch SHA-256 `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350
  lines and 24,244 bytes; its 21 selected ordered blocks retain the authorized checked set
  HS-002/HS-010/HS-014/HS-017/HS-018 and HS-015 remains unchecked;
- immutable FS-001 SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines and 25,441 bytes; and
- immutable `SCOPE.json` SHA-256 `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`,
  450 lines and 27,382 bytes.

## Exact handoff boundary

- Original preserved product range remains
  `007651beb814d98646aa2e786801b647e2abd0b5..7f0b0710e820b87be2ee8877a3b7693d90e5e505`.
- Later HEAD `824bb1570f1e52bcd0afcbf89040d1c0ffac50ec` contains only already-integrated
  package/control history beyond that reviewed P05 product HEAD; revision 12 adds no commit or
  executable diff.
- HEAD remains `824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`; the index remains empty. Git-visible
  state is exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus this sole untracked
  revision-12 artifact. No ledger, prior artifact/review, product/test/config/dependency/migration,
  scratch, FS-001, SCOPE or agent path was edited by this worker.

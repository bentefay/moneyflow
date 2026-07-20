# P05 Independent Diagnostic Review — Revision 12

## Verdict

**PASS — diagnostic recheck only.** Revision 12 accurately proves that the D-011/Q-013 unavailable
condition remains unchanged on 2026-07-20. The repository-installed headless CLI has no supported
operation or public Page API that creates and verifies a genuinely hidden page. Its supported
two-page Chrome topology independently reports both documents `visible`, `hidden: false` and focused
after normal tab selection.

Because no page was hidden, the worker was correct not to start MoneyFlow, mutate product state,
wait 15 seconds, or claim socket/import/DOM timing. Those actions would test a visible page and
could not satisfy Q-013. They would neither identify a late boundary nor authorize a product owner.

There are no findings and no new Q proposal. The independently green revision-11 same-identity
manager correction remains preserved. This diagnostic PASS does **not** mean P05 or HS-015 passes:
root must retain P05/HS-015 as `blocked_external`, keep HS-015 unchecked, and keep P08 and P10
dependency-blocked. No product/test/dependency/configuration change or marker is authorized.

## Immutable review boundary

- Package/scope/revision: `P05` / `HS-015` / `12`, no-product diagnostic only.
- Literal original BASE: `007651beb814d98646aa2e786801b647e2abd0b5`.
- Preserved last reviewed P05 product HEAD: `7f0b0710e820b87be2ee8877a3b7693d90e5e505`.
- Literal cumulative reviewed HEAD: `824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`.
- The product HEAD is an ancestor of the reviewed HEAD. Later commits are persisted P05 failure/
  external-gate control history plus independently integrated P06/P07 work. Revision 12 adds no
  commit or executable diff.
- `src/lib/sync/manager.ts` and `tests/e2e/tab-duplication.spec.ts` are byte-unchanged from the
  revision-11 product HEAD. That commit still changes exactly those two paths: 100 insertions and 5
  deletions.
- Frozen revision-12 evidence:
  `specs/007-human-scratch-completion/evidence/P05/implementation-12.md`, independently verified
  SHA-256 `8f5ec6614f68db79f54d1ebf2f3ba4e4e89c2d3f1dc386c5ea61a00626a4f8fd`, 195 lines and 12,423
  bytes.
- Immutable revision-11 evidence remains SHA-256
  `2e57eb4e8540b364ceb8369bef5b508b4f9cc442e430723435503ee03d1bcb90`; immutable revision-11 review
  remains SHA-256 `429b7b86c3fbceca9bbad6ae3d861037ca75a49d7a96a85c448dd7a195aa0244`.
- HEAD remained exact and the index remained empty. Before this review file, Git-visible state was
  exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen untracked revision-12
  evidence. The reviewer wrote only this assigned review file and made no commit.

## Installed version, lock and source identity audit

The independently resolved package graph matches the artifact:

| Layer                                         | Independently verified version |
| --------------------------------------------- | -----------------------------: |
| repository pin / installed `@playwright/cli`  |                       `0.1.17` |
| CLI-bundled Playwright and Playwright Core    |   `1.62.0-alpha-1783623505000` |
| repository pin / installed `@playwright/test` |                       `1.61.1` |
| repository Playwright and Playwright Core     |                       `1.61.1` |

`pnpm why` confirms the CLI resolves only its alpha Playwright/Core pair and the repository test
runner resolves only its stable 1.61.1 pair. `playwright-cli --version` returned `0.1.17` and the
repository Playwright command returned `1.61.1`. `package.json` and `pnpm-lock.yaml` agree exactly.

Every recorded installed-source identity independently matches:

| Installed source              | Verified SHA-256                                                   |
| ----------------------------- | ------------------------------------------------------------------ |
| CLI `package.json`            | `3c502a0c69fd29faaa649c907d243ba13f6593575d2834a9b0d9a1fc2bd3524c` |
| CLI `README.md`               | `93f5675ea24792987df053e6a5cab4f063c500e1aad7388855ce09a13c9acd20` |
| bundled `types/protocol.d.ts` | `b836eed98b79fabb54f1df73252a0ce178b8df4a89794251ade2fa0c5e52b678` |
| bundled CLI `help.json`       | `9ab2fbca8401ce994f2148f90b7f322150526b39fbf937fcc166bd2bc1d2c509` |
| bundled `coreBundle.js`       | `be2e09efef3017b4eaa76f0cb5289f66c4ea57833f94319b17c1c2f184987ad7` |
| bundled `browsers.json`       | `612a100346f104d83de93de79fe9510e0b5f47435688bb0ba7ebb34409efad51` |
| repository `package.json`     | `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` |
| repository `pnpm-lock.yaml`   | `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f` |

The CLI bundle still declares Chromium/headless-shell revision 1232 at `151.0.7922.10`, Firefox
revision 1534 at `152.0.4`, and WebKit revision 2327 at `26.5`. This is bundle metadata, not
evidence that each browser executable is installed. The supported Chrome run is available; supported
headless Firefox and WebKit launch attempts independently reported their browsers are not installed.
Installing new browsers would change external state and is outside this installed-authority
diagnostic, so no download was performed.

## Help, README, runtime, public API and protocol adjudication

The complete installed `--help`, `--help open`, `--help tab-select`, `--help run-code`, README,
command JSON, tab runtime, public types and Chromium protocol preserve the same boundary:

1. The CLI is headless by default. `open --headed` exists but is explicitly forbidden by PROCESS,
   HANDOFF and repository E2E authority.
2. The complete supported Tabs surface is `tab-list`, `tab-new`, `tab-close` and `tab-select`. There
   is no hide, background, minimize, occlude or visibility command/flag.
3. The runtime implementation of `selectTab(index)` calls only `await tab.page.bringToFront()` and
   updates `_currentTab`. It does not hide the other page.
4. Public Playwright `Page` exposes `bringToFront(): Promise<void>` but no symmetric hide or
   background operation. Element highlight/background-page/screenshot uses of those words do not
   change `Document.visibilityState`.
5. `run-code` receives public `page` authority. Creating a raw CDP session through it would be the
   specifically forbidden unsupported-CDP substitute, not an installed CLI hidden-page feature.
6. Bundled Chromium declares `Page.setWebLifecycleState` only with `active|frozen` and has no
   `Page.setPageVisibilityState`. Frozen lifecycle is not hidden and is explicitly forbidden as a
   substitute.
7. The raw protocol declares `Browser.setWindowBounds` and a `minimized` window state, but the CLI
   does not expose it, the allowed run is headless, direct CDP is forbidden, and a minimized label
   would still not prove an independently observed hidden document.
8. README language about browser automation running “in the background” describes agent processes
   and the visual dashboard; it does not describe the Page Visibility API. The dashboard itself is
   forbidden GUI authority.

No supported installed command, flag, public method or ordinary headless runtime behavior changed
the D-011 unavailable condition.

## Independent allowed two-page observation

The reviewer used a unique disposable repository-installed CLI session, `p05-review12`, and only
normal supported commands:

1. `open about:blank`;
2. `tab-new about:blank`;
3. `tab-list` and `tab-select 1`; and
4. scoped `run-code` reads of `document.visibilityState`, `document.hidden` and
   `document.hasFocus()` for both context pages.

`playwright-cli list` identified the session as browser type Chrome, in-memory user data and
`headed: false`. After normal selection, the exact sanitized result was:

```json
[
    { "index": 0, "visibilityState": "visible", "hidden": false, "hasFocus": true },
    { "index": 1, "visibilityState": "visible", "hidden": false, "hasFocus": true }
]
```

This exactly reproduces revision-12 evidence and D-011. Non-selection is not hidden; both pages even
report focus. No focus action, reload, polling, visibility/lifecycle emulation, CDP, headed mode,
temporary file/config/test, custom launcher, frozen/minimized state or worker substitute was used.

## Honest stop before product and timing

Q-013 requires a page to prove `visibilityState === "hidden"` at the normal-UI mutation, at 15
seconds and at eventual completion. Only after that predicate exists may sanitized timestamps at
socket receipt, exact Loro import and DOM publication select the first late owner.

Here the predicate failed before any product setup. Running onboarding, creating a vault or
financial value, waiting 15 seconds, or instrumenting the socket/Loro/DOM would therefore produce
visible-page data only. It could not establish hidden acceptance, a failure, or product ownership.
Omitting that work is the honest required stop, not missing validation.

Revision 11's independently measured visible topology remains applicable only as a control: socket
frame and exact Loro import at 2,549 ms, DOM publication at 2,591 ms, and rows 1/1. It proves
visible live convergence and the manager correction; it does not waive hidden-page acceptance or
point to a new product owner.

No broad tests were rerun because revision 12 changes no executable behavior and no supported hidden
topology exists. Repeating visible product tests would not answer the recheck. The immutable
revision-11 review already independently accepted the exact manager/test correction and its focused
1/1 plus retry-disabled 3/3 true-duplicate results.

## Disposition, dependencies, findings and questions

The exact unavailable condition remains:

- mandatory repository-installed CLI authority is headless;
- its installed commands and public API cannot create a verified hidden page;
- direct CDP, headed/config/temp/emulated/frozen/minimized/focus/reload/poll/worker substitutions
  are prohibited; and
- the allowed installed two-page runtime reports both documents visible.

Therefore:

- P05/HS-015 remains `blocked_external` and HS-015 remains unchecked;
- revision-11 product HEAD `7f0b0710e820b87be2ee8877a3b7693d90e5e505` remains preserved;
- no `worker: true`, timeout change, reload/focus catch-up, poll, product/test diff or inferred
  owner is authorized;
- P08 and P10 remain dependency-blocked; and
- the next trigger remains a repository-installed CLI/Playwright upgrade with a documented,
  verifiable genuinely hidden headless topology, or the mandatory pre-P21 recheck.

There are **no findings** and **no Q proposal**. D-011, Q-013 and DEPENDENCIES completely decide the
result.

## Cleanup, zero state and frozen-source invariants

- The `p05-review12` browser was closed; `delete-data` found no persistent profile; final
  `playwright-cli list` returned `(no browsers)`.
- Generated `.playwright-cli` state was moved to desktop trash. Repository-local `.playwright-cli`,
  `test-results` and `playwright-report` are absent. No assigned CLI browser/daemon or Next
  development server was started or remains. Pre-existing user-owned Chrome processes were not
  touched and are outside this diagnostic.
- Read-only SQL checks found zero rows in `auth.users`, all nine public base tables and
  `realtime.subscription`. No database reset or service mutation was performed.
- `git diff --check` passes. HEAD remains `824bb1570f1e52bcd0afcbf89040d1c0ffac50ec`; the index is
  empty; Git-visible state is exactly root-owned unstaged `HANDOFF.md`/`PROGRESS.md` plus the frozen
  evidence and this assigned review.
- Rolling scratch SHA-256 remains
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, 350 lines and 24,244 bytes.
  Exactly 21 selected ordered blocks normalize byte-for-byte to SCOPE, with checked set
  HS-002/HS-010/HS-014/HS-017/HS-018; HS-015 remains unchecked.
- Immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
  `SCOPE.json` still selects its whole lines 1–715.
- Immutable `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines and 27,382 bytes.

Root should freeze this diagnostic PASS, retain P05/HS-015 as `blocked_external`, leave HS-015
unchecked, preserve revision-11 product state, keep P08/P10 blocked and use only the existing
documented recheck trigger. This review authorizes no product implementation or marker.

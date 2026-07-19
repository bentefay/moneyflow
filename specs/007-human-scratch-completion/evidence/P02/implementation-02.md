# P02 Implementation Evidence — Revision 02

## Contract and outcome

- Package: `P02` / `HS-017`, revision `02`.
- Sole worker artifact: `specs/007-human-scratch-completion/evidence/P02/implementation-02.md`.
- Original package BASE: `19d73035b33b639f9927d2f78a55d74c44f65544`.
- Revision-02 pre-implementation HEAD: `72710249b4ba2c515d159ce3560e68af3ac0b011`.
- Implementation HEAD: `213100fadf5acea30aad7e90998bd575cdcd508c`.
- Required independent review range:
  `19d73035b33b639f9927d2f78a55d74c44f65544..213100fadf5acea30aad7e90998bd575cdcd508c`.
- Revision-02 worker range:
  `72710249b4ba2c515d159ce3560e68af3ac0b011..213100fadf5acea30aad7e90998bd575cdcd508c`.
- Sole implementation commit: `213100fadf5acea30aad7e90998bd575cdcd508c` —
  `fix: preserve mobile import tab names`.
- ADR outcome remains **decline broader Animate UI adoption**. Revision 02 repairs the retained
  Animate tabs' mobile semantics; it does not adopt another registry primitive.

Revision 01 and its FAIL review are immutable. This artifact corrects the revision-01 claim that the
real import tabs retained accessible names at 320 px, closes blocking finding `I-001`, and carries
forward the independently supported source, bundle, compatibility, ownership, aesthetics, Q-001 and
T021c conclusions.

## Revision chain and boundary ownership

The original package range now contains three commits in order:

1. `67311b9f716611bb2a5e655460f7ae638203c10a` — root's P02 revision-01 finding/ledger commit;
2. `72710249b4ba2c515d159ce3560e68af3ac0b011` — root's immutable revision-01 evidence/review commit;
   and
3. `213100fadf5acea30aad7e90998bd575cdcd508c` — this worker's two-path product/test repair.

Consequently the complete `BASE..HEAD` path list includes root-owned `HANDOFF.md`, `PROGRESS.md`,
`QUESTIONS.md`, `RISKS.md`, immutable revision-01 evidence/review, and the following two worker
paths. Only the last two belong to the implementation commit:

| Authorized path                                 | Revision-02 purpose                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/components/features/import/ConfigTabs.tsx` | Preserve one deterministic text-derived accessible name per visually compact mobile tab.                                 |
| `tests/e2e/import.spec.ts`                      | Exercise the real CSV journey at 320x720 across all five named tabs, ArrowRight selection/focus and panel relationships. |

Exact-path staging named those two paths only. No blanket staging was used. The staged inventory is
empty after commit. Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were preserved; no task,
review, prior evidence, global ledger, Animate primitive, dependency, scratch, FS-001, Supabase or
agent-configuration path was edited by this worker.

## I-001 counterfactual and remediation

### Reviewer finding reproduced before the source fix

Revision-01 review found that each trigger's only text was
`<span className="hidden sm:inline">…</span>`. At 320 px, `display: none` removed the text from the
accessibility tree, producing five unnamed `tab` roles and an unnamed active `tabpanel`.

Revision 02 added the checked-in mobile journey assertion **before** changing the component, then
ran it against the unchanged revision-01 product behavior with retries disabled and one worker. The
first configured Playwright launch could not start its web server and exited before collection; it
is not counterfactual evidence. After starting the exact declared `corepack pnpm dev` server, the
real test ran and failed:

```text
1 failed
preserve named keyboard tabs and labelled panels on mobile
locator.focus: Test timeout of 30000ms exceeded
waiting for getByRole('tab', { name: 'Template', exact: true })
```

The failure occurred at the first exact accessible-name lookup. It is meaningful: the source still
rendered all five visual icon triggers and keyboard mechanics, but the browser could not find the
required named `Template` tab at 320x720.

### Smallest semantic fix

The source change is one class replacement:

```diff
- <span className="hidden sm:inline">{tab.label}</span>
+ <span className="sr-only sm:not-sr-only">{tab.label}</span>
```

This keeps the same single text node as the accessible-name source. Below `sm`, Tailwind's `sr-only`
clips it visually without `display: none`; at `sm` and above, `not-sr-only` restores ordinary text.
No `aria-label` or `aria-labelledby` was added to the trigger, so there is no second spoken copy and
no risk that visible copy drifts from an independent ARIA string. Icons and the compact five-icon
mobile layout are unchanged.

At 320 px the real label computed to `position: absolute`, `width: 1px`, `height: 1px`,
`margin: -1px`, `overflow: hidden`, `clip-path: inset(50%)` and `white-space: nowrap`. At 1280 px,
the same Columns label computed to `position: static`, width `58.0312px`, height `20px`, visible
overflow and normal whitespace. This proves compact mobile visuals and unchanged visible desktop
copy from the same node.

### Regression design

The existing CSV import journey now:

1. creates a real isolated identity and uploads the existing real CSV fixture;
2. sets the viewport to exactly 320x720;
3. resolves exactly one tab for each exact accessible name `Template`, `Columns`, `Format`,
   `Duplicates` and `Account`;
4. focuses Template and walks all five controls with ArrowRight;
5. at every step asserts focused state and `aria-selected="true"`;
6. resolves the visible `tabpanel` by the same exact accessible name;
7. proves both directions of the programmatic relationship: trigger `aria-controls` equals panel
   `id`, and panel `aria-labelledby` equals trigger `id`;
8. presses ArrowRight from Account and proves focus/selection wraps to Template; and
9. restores the standard 1280x720 viewport before the remainder of the pre-existing journey.

The fixed test passed 1/1, then 5/5 under `--repeat-each=5 --retries=0 --workers=1`. The complete
import file passed 6/6 with retries disabled. No test-only hook or product-state shortcut was added.

## Installed-CLI accessibility evidence

### Tool, session and privacy

- Repository-installed `@playwright/cli@0.1.17` was invoked through exact Corepack pnpm.
- Disposable session: `p02-rev02-local-20260720`.
- No MCP browser, `npx`, temporary test/config, saved auth state, headed/debug/UI/show mode, trace,
  video, screenshot, PDF or HAR was used.
- A synthetic identity was created inside one browser closure. Recovery material was never returned,
  logged or persisted in this artifact.
- The CSV was created as an in-browser `File`; no host temporary file was created.
- The session was closed, data deletion found no persistent profile, `playwright-cli list` returned
  no browsers, and the two generated P02 YAML/log files were removed by exact filename.

### Deterministic 320 px snapshot

After the real upload and resize, the repository CLI accessibility snapshot was:

```text
- tablist:
  - tab "Template" [selected]
  - tab "Columns"
  - tab "Format"
  - tab "Duplicates"
  - tab "Account"
- tabpanel "Template"
```

This directly replaces revision 01's inaccurate mobile claim and the review's deterministic unnamed
snapshot. Each name occurs once; the trigger has no `aria-label` or `aria-labelledby`, confirming
that the one retained text node supplies the name.

ArrowRight was then exercised through all five tabs. For every state, CLI inspection recorded:

- exact expected text-derived name;
- `aria-selected="true"` and `document.activeElement === trigger`;
- trigger `aria-controls` exactly matching the active panel `id`;
- active panel `aria-labelledby` exactly matching the trigger `id`; and
- a visible panel resolved by the same exact accessible name.

Account ArrowRight wrapped focus and selection to Template. This is both a keyboard result and a
screen-reader relationship result; it does not merely inspect DOM text.

### Proportionate responsive/media checks

- **Desktop:** at 1280x720 the snapshot retained all five names, Format focus/selection and
  `tabpanel "Format"`; labels were ordinary visible text rather than clipped text.
- **200% zoom:** with a 640 px viewport and supplemental CSS `zoom: 200%`, the tablist stayed within
  the viewport (`x=82`, `right=558`, width `476`, document scroll width `640`) and all five exact
  accessible names remained present.
- **Dark:** under `.dark`, named keyboard focus/selection and panel relationships were unchanged;
  the class repair introduces no color or surface override.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, ArrowRight still selected/focused the
  named Duplicates tab and labelled panel. Two active-panel animations of 500 ms were still running
  after 20 ms. That is the already-recorded Animate tabs limitation, not concealed as fixed by this
  semantics repair, and remains part of the decline/rollout standard.
- **Console/network:** the local session accumulated zero console errors or warnings. Sanitized
  request inspection found no 4xx/5xx/failed request; identity, vault, sync and page calls returned
  successful responses.

## Complete corrected decline ADR

### Decision

Decline adoption of Animate UI Dialog, Alert Dialog, Dropdown Menu and Tooltip. Retain the existing
route-local Animate tabs now that their deterministic mobile names are repaired. Continue using the
direct Radix/shadcn wrappers unless a future component-specific package satisfies the rollout gates
below.

This remains reversible. It is not a ban on Animate UI and does not claim the current tabs' motion
policy is complete.

### Exact upstream pin and compatibility

The primary-source pin from revision 01 remains current and was independently reproduced by its
reviewer:

- live registry: <https://animate-ui.com/r/{name}.json>;
- latest documented distribution: Animate UI `1.0.27`, dated 2025-12-15;
- exact upstream HEAD:
  [`efeb96ffd7a3b7a4868667e4ac3c346620fb3044`](https://github.com/imskyleen/animate-ui/commit/efeb96ffd7a3b7a4868667e4ac3c346620fb3044),
  committed 2025-12-31;
- official introduction, troubleshooting, accessibility and changelog:
  <https://animate-ui.com/docs>, <https://animate-ui.com/docs/troubleshooting>,
  <https://animate-ui.com/docs/accessibility>, and <https://animate-ui.com/docs/changelog>;
- pinned license:
  <https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/LICENSE.md>.

Animate UI is a copy-first component distribution, so copied code becomes locally owned. Its
documented minima—Motion `>=12.23`, React `>=19`, Tailwind `>=4.1`, and Radix UI `>=1.4`—are met by
MoneyFlow's Motion `12.42.2`, React/React DOM `19.2.7`, Tailwind `4.3.3`, `radix-ui@1.6.2`, and Next
`16.2.10`. Existing tabs compile under Next 16. Candidate code uses no Next-specific API, but
upstream does not explicitly certify Next 16; P02 makes no stronger claim.

There is no Git tag or GitHub release for `1.0.27`. Relevant source changes date from August through
November 2025, so a stable exact pin is possible but update review is manual.

### Exact candidate source hashes

These SHA-256 values are over raw files at the pinned commit and were independently reproduced in
revision-01 review:

| Candidate     | Component SHA-256                                                  | Primitive SHA-256                                                  |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| tabs          | `59b57bb21fd3136b2eb47b484216482e1d38a2f27e67fa465acc9329fc6d7999` | `75720767cfe5a964b429b8fdc1f266069f7de4167b013667db95a416705d1474` |
| dialog        | `c6dff1ff45cb4f08aa3c37acbf006a0233a36d95d0a16a5285ec4b564d864b93` | `3943abfadf21049a99c7e4bf1ad23ef23fdb4f24c78e08dd0fdf1dea7c54418b` |
| alert dialog  | `100a8c84e940a02d4ffee32811e37b73ef11a2808534f0d8139355f7c5233e5d` | `46db331b2b113daceca487282073850250ce053a4f657863e0034c4c5e0af37a` |
| dropdown menu | `de9f6a16427460ef36b38bf389d01cbe8d775a090b55a58d1945bb6202eaa0ac` | `b412d2a2f4f95f5c350bb46cbf567c27c824df762199446367746cc920224738` |
| tooltip       | `9a1783ad00ffbb66b8ebf683ccad0c32234dfde3659d7099083b86548418efa5` | `86ef655ee27aaeaf1e5ad6d9db70f2df946423c261dd6906e44bef14f5a803e5` |

The live dependency graph remains Motion plus umbrella Radix and owned controlled-state/context
helpers for all primitives; tabs add highlight/auto-height, dropdown adds highlight/data-state, and
tooltip adds cursor-follow support. Dialog/dropdown component layers add Lucide and alert also
refers to an Animate UI button.

### Local inventory and candidate matrix

| Surface       | Current state                                                                                           | Latest candidate consequence                                                                               | Decision                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Tabs          | current local copy, only `/imports/new`; mobile names now repaired; 500 ms/reduced-motion issue remains | same Radix/Motion highlight, auto-height and `AnimatePresence mode="wait"` behavior                        | retain as route-local owned exception, not blanket precedent     |
| Dialog        | 129-line direct Radix wrapper; account, alias and command consumers                                     | controlled state plus 3D rotate/0.8 scale/4 px blur spring; content `asChild`/`forceMount` unsupported     | decline; no semantic gain and blocking-task motion is excessive  |
| Alert Dialog  | 135-line direct Radix wrapper; delete-import consumer                                                   | same forceful 3D/blur spring on destructive decision; narrowed content API                                 | decline strongly; destructive copy should be immediately stable  |
| Dropdown Menu | 235-line direct wrapper; no product consumer                                                            | 563-line primitive plus Motion/highlight/data-state helpers; official submenu clipped 27 px left at 320 px | decline; unused code and representative mobile collision failure |
| Tooltip       | 57-line direct wrapper used in shared authenticated layout/features                                     | scale-0.5 spring, optional cursor follow, controlled helpers and shared-route Motion spread                | decline; negligible benefit at highest bundle blast radius       |

Radix remains the semantic foundation in both approaches. Official docs establish named/described
dialogs and alerts, focus traps, Escape, menu focus/navigation/typeahead, tooltip focus/Escape and
the WAI-ARIA Tabs pattern. Animate candidates generally retained those semantics, but did not add a
semantic capability that justified copied Motion layers. Revision 02 corrects the one local consumer
error rather than misattributing it to the registry primitive.

Current controlled dialog/alert consumers without persistent Radix triggers did not automatically
restore focus; adoption would not invent the missing trigger. Candidate Dialog/Alert official demos
did restore focus when using their real triggers. Candidate content/subcontent documentation
explicitly removes `asChild`/`forceMount` at animated boundaries, reducing composition and test
escape hatches.

The app has no root `MotionConfig reducedMotion="user"`; direct CSS wrappers also lack a complete
generic reduced-motion override. Live current/candidate testing continued to animate under reduced
motion. The candidate dialog/alert entry begins near 0.8 scale with perspective rotation, ~4 px blur
and near-zero opacity; tooltip begins near 0.5 scale. Those polished demo effects reduce immediate
readability and are disproportionate to frequent financial and destructive workflows.

Current and candidate semantic foreground/background tokens work under dark mode, ordinary portals
use `z-50`, and dialog/alert fit at 320 px. The official dropdown nested submenu reproducibly
settled at `x=-27..101` in a 320 px viewport. That may be a demo integration/collision interaction,
but it fails a representative adoption gate until independently resolved.

`pnpm why` found one resolved version of each relevant Radix primitive: dialog/alert `1.1.19`,
dropdown `2.1.20`, tooltip `1.2.12`, Motion `12.42.2`, umbrella Radix `1.6.2`. Broader adoption
fixes no duplicate version and would leave two import styles.

### Updated route/bundle measurement

The semantic class literal changed only the import/config chunk. The final production build emitted
46 JavaScript chunks totalling 4,698,982 bytes, six raw bytes above revision 01:

| Route          | Unique chunks | Sum of unique emitted bytes | Revision-01 delta |
| -------------- | ------------: | --------------------------: | ----------------: |
| `/dashboard`   |            10 |                   1,581,390 |                 0 |
| `/accounts`    |            13 |                   1,672,525 |                 0 |
| `/imports/new` |            15 |                   1,939,085 |                +6 |

The current import/config/Motion chunk is `2-8hkk5b4q954.js`, 240,840 raw / 75,949 gzip bytes, both
six bytes above revision 01. It contains both import strings and Motion markers, so P02 still does
not attribute all bytes to Motion. The defensible result is that the current Animate tabs/Motion
graph remains route-local and absent from accounts/dashboard; adopting shared-layout Tooltip would
spread a similar graph and must be measured by a real future diff.

### Reusable rollout standard

Future Animate UI adoption remains component-by-component and must:

1. name a real consumer and user benefit; never copy an unused candidate;
2. pin exact registry JSON, upstream commit and hashes;
3. preserve required Radix APIs, with explicit `asChild`, `forceMount`, controlled-state and portal
   decisions;
4. implement and test root/local reduced motion, including CSS wrappers;
5. keep motion subtle and normally `<=200 ms`; prohibit blur, perspective, large rotation and
   cursor-follow motion for blocking, destructive or frequent work;
6. remain interruptible and pass rapid open/close/change focus and jank checks;
7. remain leaf-route local where possible and record before/after route, raw and gzip measurements;
8. test exact role/name/description/state relationships, keyboard, trap/restore, Escape/outside,
   nested/scrolling portals, dark, 320 px, 200% zoom and reduced motion with retries disabled;
9. verify React/Next hydration plus console/network cleanliness; and
10. satisfy the pinned maintenance/license/notice obligations before copying.

## Q-001 and compliance route

No new question is raised in revision 02. Root already transcribed revision 01's complete proposal
as canonical `Q-001 — Animate UI notice and redistribution posture` and `R-022`.

The pinned “MIT + Commons Clause License Condition” permits application use/modification but
requires the upstream notice in copies/substantial portions and restricts selling/redistributing the
components themselves in original form. The repository has an existing copied tabs subtree and no
identified Animate UI/Elliot Sutton notice.

Q-001's reversible default remains:

- decline additional copied Animate UI code;
- retain existing tabs temporarily;
- prefer a reviewed third-party notice and confirmed compatible application distribution;
- otherwise replace the copied tabs with direct Radix code; and
- reject silent acceptance/expanded copying.

A repository/release owner still must decide the distribution posture before release. This semantic
consumer fix neither expands copied registry surface nor resolves that legal decision.

## T021c and R-009 route

The complete retry-disabled history remains visible:

- revision-01 implementer full suite: 77/78, T021c failed; immediate exact diagnostic 3/3 passed;
- revision-01 independent reviewer full suite: 78/78 passed; immediately subsequent exact T021c
  repeat with one worker: 2/3, same five-second `/3 selected/i` timeout; and
- revision-02 implementer full suite: 78/78 passed, including T021c.

No single green run supersedes either red run. This revision changes only import tab label
presentation and the import journey, not transaction selection. T021c is demonstrably intermittent
and remains routed to canonical `R-009`, the next package touching transaction table/rows (`P13`),
and the no-retry final audit (`P21`). No retry converted a failure into a pass.

## Automated validation

All final gates ran on Node `v22.21.1` and Corepack pnpm `11.13.1` with the final product/test
bytes.

| Gate                                                             | Exit/result                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| intentional counterfactual, changed journey before source fix    | `1`; named Template tab absent at 320 px                   |
| fixed changed journey, `--retries=0 --workers=1`                 | `0`; 1/1                                                   |
| fixed changed journey, `--repeat-each=5 --retries=0 --workers=1` | `0`; 5/5                                                   |
| complete `tests/e2e/import.spec.ts`, `--retries=0`               | `0`; 6/6                                                   |
| full E2E, `--retries=0`                                          | `0`; 78/78 in 1.1 minutes                                  |
| `corepack pnpm format:check`                                     | `0`; 478 files at product/test boundary; 479 with evidence |
| `corepack pnpm lint`                                             | `0`; 0 errors, 13 unchanged base warnings                  |
| `corepack pnpm typecheck`                                        | `0`                                                        |
| `corepack pnpm test`                                             | `0`; 41 files, 1,141 tests                                 |
| `corepack pnpm build`, first and final                           | `0`; 17 routes; final compile 5.0 s, TypeScript 8.1 s      |

The first revision-02 counterfactual invocation could not auto-start the web server before
collection. This repeated the known revision-01 launch pattern. The exact declared
`corepack pnpm dev` command started explicitly in 242/245 ms; all reported E2E counts above then ran
against that healthy server. Startup failures are diagnostics, not counted tests.

## Final self-audit and handoff

At the final boundary:

- implementation HEAD is `213100fadf5acea30aad7e90998bd575cdcd508c`;
- worker commit `213100fadf5acea30aad7e90998bd575cdcd508c` contains exactly the two authorized
  paths;
- the original `BASE..HEAD` includes only the named root revision-01/control paths plus those two
  authorized product/test paths;
- no path is staged;
- root-owned unstaged `HANDOFF.md` and `PROGRESS.md` remain preserved;
- this file is the sole worker-created uncommitted path;
- `package.json` and `pnpm-lock.yaml` remain SHA-256
  `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` and
  `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`;
- `specs/human-scratch.md` remains SHA-256
  `dcd03b23aab92da4b0944d683ef4c0a363a56e70d6fc8775066502ed5f626ca7`, 350 lines and 24,240 bytes;
- immutable FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes;
- the final production build restored `next-env.d.ts` byte-for-byte;
- no CLI session or revision-02 CLI artifact remains; and
- ignored automated Playwright result/report output is runner-owned, not an implementation path.

The non-empty original range and this complete corrected ADR are ready for independent revision-02
review. This implementer does not mark PASS.

# P02 Implementation Evidence — Revision 01

## Contract and result

- Package: `P02` / `HS-017` Animate UI component evaluation, revision `01`.
- Exact worker artifact: `specs/007-human-scratch-completion/evidence/P02/implementation-01.md`.
- Original package BASE: `19d73035b33b639f9927d2f78a55d74c44f65544`.
- Pre-implementation HEAD: `19d73035b33b639f9927d2f78a55d74c44f65544`.
- Implementation HEAD: `19d73035b33b639f9927d2f78a55d74c44f65544`.
- Required review range: the valid empty range
  `19d73035b33b639f9927d2f78a55d74c44f65544..19d73035b33b639f9927d2f78a55d74c44f65544`.
- Outcome: **decline broader Animate UI adoption**. Keep the already-owned Animate UI tabs for now,
  retain the four direct Radix wrappers, and apply the rollout standard below to any future animated
  primitive work.
- Product/test changes: none. No commit was created. This is the complete decision-only ADR allowed
  by the dispatch.

The decision is reversible: a future package may adopt a single candidate after it meets API parity,
reduced-motion, route-bundle, mobile collision, focus and regression gates. P02 does not install or
copy code merely to demonstrate an investigation.

## Decision summary

MoneyFlow already has the useful part of the proposal: its import configuration tabs are a local
copy of the current Animate UI tabs design. Expanding that ownership model to Dialog, Alert Dialog,
Dropdown Menu and Tooltip is not justified now:

1. the current wrappers already inherit the relevant Radix accessibility behavior and use short,
   comprehensible CSS transitions;
2. the registry candidates retain Radix semantics but add controlled-state/AnimatePresence layers,
   Motion wrappers and owned helper code, while removing `asChild` and `forceMount` at important
   content boundaries;
3. neither the app nor the live Animate UI demonstrations applies Animate UI's documented root
   `MotionConfig reducedMotion="user"` recommendation, so transforms, blur and springs continued
   under emulated reduced motion;
4. the dialog and alert candidates use a visually forceful 3D rotate/scale/blur spring for blocking
   and destructive decisions, and the tooltip adds a spring/cursor-follow system where a compact
   disclosure is sufficient;
5. the live dropdown candidate's nested submenu settled 27 CSS pixels off the left edge at a 320 px
   viewport;
6. the production build isolates the current Animate tabs/Motion graph to `/imports/new`; changing
   the shared-layout tooltip would spread that graph to every authenticated route; and
7. broader copy-first adoption creates maintenance and license-notice ownership without removing any
   duplicate installed Radix version.

This is not a claim that the current wrappers are perfect. The existing Animate tabs and the direct
CSS wrappers both need an explicit reduced-motion policy. The controlled consumers that do not use a
Radix trigger also need deliberate focus restoration. Those findings become rollout requirements,
not a reason to copy four more animated forks.

## Reproducible source pin

### Upstream identity

The comparison was performed on 2026-07-20 AEST against:

- live registry base: <https://animate-ui.com/r/{name}.json>;
- documented distribution version: Animate UI `1.0.27`, the latest changelog version, dated
  2025-12-15;
- exact upstream repository HEAD:
  [`efeb96ffd7a3b7a4868667e4ac3c346620fb3044`](https://github.com/imskyleen/animate-ui/commit/efeb96ffd7a3b7a4868667e4ac3c346620fb3044),
  committed 2025-12-31;
- upstream introduction, troubleshooting, accessibility and changelog:
  <https://animate-ui.com/docs>, <https://animate-ui.com/docs/troubleshooting>,
  <https://animate-ui.com/docs/accessibility>, and <https://animate-ui.com/docs/changelog>;
- upstream license at the pinned commit:
  <https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/LICENSE.md>.

Animate UI describes itself as a copy-first distribution, not a runtime component library. The app
therefore owns copied code. Its troubleshooting minima are Motion `>=12.23`, React `>=19` and
Tailwind `>=4.1`; MoneyFlow has Motion `12.42.2`, React/React DOM `19.2.7`, Tailwind `4.3.3`, Next
`16.2.10`, `radix-ui@1.6.2`, and the individual current Radix packages listed below. The source is a
client component and has no Next-specific API, so it is structurally compatible and the existing
tabs build under Next 16. There is no explicit upstream Next 16 certification, so P02 does not
invent one.

The repository exposes no Git tag or GitHub release for `1.0.27`. Relevant registry source files
were last changed from August through November 2025: dialog/alert 2025-09-16, dropdown 2025-10-21,
tooltip component 2025-08-21 and primitive 2025-11-16, tabs component 2025-09-09 and primitive
2025-09-14. This is enough for a stable pinned comparison, but it means update detection is manual.

### Exact pinned source files

The following SHA-256 values are over the raw GitHub file bytes at the exact commit. The live
registry JSON was also fetched successfully for all ten registry items; its generated content uses
consumer aliases, while the pinned repository files retain registry aliases.

| Registry item      | Exact pinned source                                                                                                                                                                                              | SHA-256                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| tabs component     | [`apps/www/registry/components/radix/tabs/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/components/radix/tabs/index.tsx)                   | `59b57bb21fd3136b2eb47b484216482e1d38a2f27e67fa465acc9329fc6d7999` |
| tabs primitive     | [`apps/www/registry/primitives/radix/tabs/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/primitives/radix/tabs/index.tsx)                   | `75720767cfe5a964b429b8fdc1f266069f7de4167b013667db95a416705d1474` |
| dialog component   | [`apps/www/registry/components/radix/dialog/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/components/radix/dialog/index.tsx)               | `c6dff1ff45cb4f08aa3c37acbf006a0233a36d95d0a16a5285ec4b564d864b93` |
| dialog primitive   | [`apps/www/registry/primitives/radix/dialog/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/primitives/radix/dialog/index.tsx)               | `3943abfadf21049a99c7e4bf1ad23ef23fdb4f24c78e08dd0fdf1dea7c54418b` |
| alert component    | [`apps/www/registry/components/radix/alert-dialog/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/components/radix/alert-dialog/index.tsx)   | `100a8c84e940a02d4ffee32811e37b73ef11a2808534f0d8139355f7c5233e5d` |
| alert primitive    | [`apps/www/registry/primitives/radix/alert-dialog/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/primitives/radix/alert-dialog/index.tsx)   | `46db331b2b113daceca487282073850250ce053a4f657863e0034c4c5e0af37a` |
| dropdown component | [`apps/www/registry/components/radix/dropdown-menu/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/components/radix/dropdown-menu/index.tsx) | `de9f6a16427460ef36b38bf389d01cbe8d775a090b55a58d1945bb6202eaa0ac` |
| dropdown primitive | [`apps/www/registry/primitives/radix/dropdown-menu/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/primitives/radix/dropdown-menu/index.tsx) | `b412d2a2f4f95f5c350bb46cbf567c27c824df762199446367746cc920224738` |
| tooltip component  | [`apps/www/registry/components/radix/tooltip/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/components/radix/tooltip/index.tsx)             | `9a1783ad00ffbb66b8ebf683ccad0c32234dfde3659d7099083b86548418efa5` |
| tooltip primitive  | [`apps/www/registry/primitives/radix/tooltip/index.tsx`](https://github.com/imskyleen/animate-ui/blob/efeb96ffd7a3b7a4868667e4ac3c346620fb3044/apps/www/registry/primitives/radix/tooltip/index.tsx)             | `86ef655ee27aaeaf1e5ad6d9db70f2df946423c261dd6906e44bef14f5a803e5` |

The live registry dependency graph was recorded rather than inferred:

- tabs primitive: `motion`, `radix-ui`, highlight, auto-height, controlled-state and strict-context;
- dialog and alert primitives: `motion`, `radix-ui`, controlled-state and strict-context;
- dropdown primitive: `motion`, `radix-ui`, highlight, controlled-state, data-state observer and
  strict-context;
- tooltip primitive: `motion`, `radix-ui`, controlled-state and strict-context;
- component layers add styling; dialog/dropdown add `lucide-react`, and alert also refers to the
  Animate UI button component.

### Local versions and copy comparison

Installed direct versions are:

| Package                         |   Version |
| ------------------------------- | --------: |
| `@radix-ui/react-dialog`        |  `1.1.19` |
| `@radix-ui/react-alert-dialog`  |  `1.1.19` |
| `@radix-ui/react-dropdown-menu` |  `2.1.20` |
| `@radix-ui/react-tooltip`       |  `1.2.12` |
| `motion`                        | `12.42.2` |
| `radix-ui`                      |   `1.6.2` |

`pnpm why`/lock inspection found a single resolved version of each relevant Radix primitive; the
umbrella package resolves the same packages. There is no duplicate Radix version for broader
adoption to cure. Keeping both import styles still increases conceptual/API surface.

The local tabs component and primitive are SHA-256
`9186b44e39590e4bc95ae19bc87893d0235c6ea3b130fc1f2b4228dcacc15fb5` and
`f98ef3d5ea3f6eae1ef7149e0c4a25453fa2156c2b747b860190045e4b62a245`. Direct comparison found the same
current behavior as the pinned/live registry after local formatting and alias-path differences:
Radix tabs, Motion highlight, `AnimatePresence mode="wait"`, auto-height and the same transition
defaults. It is not an obsolete fork requiring a refresh.

## Current repository inventory

| Surface       | Current implementation/use                                                                        | Current ownership           |
| ------------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| Tabs          | two Animate UI files plus highlight/auto-height/slot helpers; only `ConfigTabs` on `/imports/new` | already-owned registry fork |
| Dialog        | 129-line direct wrapper; account creation, alias change, command dialog                           | direct Radix/shadcn pattern |
| Alert Dialog  | 135-line direct wrapper; delete-import confirmation                                               | direct Radix/shadcn pattern |
| Dropdown Menu | 235-line direct wrapper; no current product consumer                                              | dormant direct wrapper      |
| Tooltip       | 57-line direct wrapper; authenticated layout, vault/sync, aliases, import and transaction cells   | shared direct wrapper       |

No `motion/react` import exists outside `src/components/animate-ui/**`. In particular, the current
tooltip is used by the authenticated layout for collapsed navigation, so adopting the registry
tooltip is not a leaf-only change.

## Candidate comparison matrix

All candidates continue to use Radix for roles, focus and keyboard foundations. Primary Radix
references were the official Dialog, Alert Dialog, Dropdown Menu, Tooltip and Tabs pages under
<https://www.radix-ui.com/primitives/docs/components/>. Radix documents trapped dialog/alert focus,
title/description announcements, Escape handling, dropdown managed focus/full navigation/typeahead,
tooltip focus/hover and Escape behavior, and the WAI-ARIA Tabs keyboard pattern.

| Concern                 | Existing/direct state                                                                         | Latest Animate UI candidate                                                                                                                                            | ADR consequence                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Animation               | direct wrappers use short Tailwind fade/scale/slide; tabs use 500 ms fade/blur                | dialog/alert add perspective 3D rotate, `scale: 0.8`, 4 px blur and spring; dropdown scales from 0.95 over 200 ms; tooltip scales from 0.5 with a spring/cursor option | animated blocking prompts and utility disclosures are more forceful than their task value |
| Semantics/screen reader | Radix roles/names/descriptions preserved                                                      | still Radix; live demos exposed correct roles and labelled/described relationships                                                                                     | no semantic improvement sufficient to justify a fork                                      |
| Focus/keyboard          | Radix trap/navigation; consumers opened without a Radix trigger must restore focus themselves | controlled-state wrapper and AnimatePresence retain Radix behavior; official trigger demos restored focus                                                              | registry cannot repair consumer-controlled trigger absence automatically                  |
| API parity              | direct wrappers expose Radix composition surface                                              | docs explicitly say content/subcontent `asChild` and `forceMount` are unsupported for animation                                                                        | adoption narrows escape hatches and testing/composition options                           |
| Reduced motion          | generic current CSS transitions and existing Animate tabs have no complete override           | source has no local `useReducedMotion`; docs require root `MotionConfig`, absent from app and live demos                                                               | fail closed: no broader adoption before an app-wide policy exists                         |
| Portals/z-index         | current content portals at `z-50`                                                             | candidate also portals and uses `z-50`                                                                                                                                 | neutral at ordinary widths; nested mobile collision is a regression signal                |
| Dark mode               | current semantic foreground/background tokens changed correctly under `.dark`                 | candidate component styles use the same semantic tokens                                                                                                                | neutral                                                                                   |
| Bundle/tree shaking     | Motion is route-local to imports                                                              | each primitive adds Motion and helpers; shared tooltip would pull the graph into the app layout                                                                        | keep Motion at leaf routes unless measured value exceeds route cost                       |
| React/Next              | current wrappers build on React 19/Next 16                                                    | declared minima pass; no explicit Next 16 support promise                                                                                                              | compatible enough to evaluate, not a reason to migrate                                    |
| Maintenance             | small direct wrappers follow familiar shadcn/Radix API                                        | copy-first files become local forks; relevant source is months old, without tags/releases                                                                              | higher owned surface and manual update review                                             |
| Aesthetics/jank         | conventional, quick, visually quiet                                                           | live dialog/alert began nearly invisible at ~0.80 scale with ~4 px blur/3D rotation; tooltip began near 0.51 scale                                                     | visually polished in isolation but excessive for fast financial workflows                 |

### Component decisions

#### Tabs — retain, do not use as a blanket precedent

The local implementation is semantically current and the real import page preserved tab roles,
`aria-selected`/controls/labelled panel relationships and automatic arrow-key activation. It is
already paid-for ownership and route-local. However, after `prefers-reduced-motion: reduce`, three
animations were still running 20 ms after a tab change; the official demo likewise had two. Its 500
ms content fade/blur is longer than necessary for repeated configuration. Retain now, but place
reduced motion and a shorter opacity-only transition in the UI-quality backlog.

#### Dialog — decline

Current and candidate behavior both supplied a named `dialog`, labelled/described relationships,
focus containment, Escape and portal/z-index behavior. The official candidate restored focus when a
real `DialogTrigger` was used. The current account dialog is opened after an external command-menu
option, so focus returned to `body`; copying Animate UI would not create the missing trigger.

The candidate's initial live frame contained four running animations, approximately `scale 0.803`,
`blur 3.94px`, opacity `0.016`, and a perspective/rotate matrix. That is distracting for an account
form and creates no completion benefit. It also drops content `asChild`/`forceMount`.

#### Alert Dialog — decline strongly

Both implementations exposed `alertdialog`, title/description references, initial Cancel focus,
trapping and Escape. Outside click remained prevented in the candidate, as required for a
destructive decision. The candidate nevertheless applies the same 3D/blur spring; its live entry had
eight running animations and nearly the same `scale 0.803`/4 px blur/near-zero-opacity frame. A
destructive confirmation should be calm, stable and immediately readable.

#### Dropdown Menu — decline

There is no current MoneyFlow consumer, so migration creates code without a product journey. The
candidate retained menu roles, arrow navigation, submenu entry and Escape/focus restoration. It also
adds a 563-line primitive, Motion wrapper, highlight primitive, mutation-observer data-state hook
and controlled-state helper while narrowing content/subcontent APIs.

At 320 px, the primary menu settled inside the viewport (`x=96`, `right=320`), but the nested
submenu settled at `x=-27`, leaving 27 px clipped after 300 ms. This was the official current demo
and may be an integration/collision interaction rather than every possible consumer; either way, it
fails the representative adoption gate and must be independently reproduced before future rollout.

#### Tooltip — decline

Current tooltips opened on keyboard focus, attached `aria-describedby`, closed on Escape and changed
semantic colors under `.dark`. The official candidate did the same, but began at approximately
`scale 0.513`, opacity `0.025`, with two active spring animations even under reduced-motion
emulation. Cursor following adds continuous motion and pointer bookkeeping not needed by any current
MoneyFlow tooltip. Because tooltips occur in the shared app layout, this is also the worst route
placement for a Motion adoption.

## Bundle and compatibility evidence

The unchanged production build emitted 46 JavaScript chunks totalling 4,698,976 uncompressed bytes.
Unique route-manifest sums are not transfer-size totals and may share chunks, but they make route
placement reproducible:

| Route          | Unique JS chunks | Sum of unique emitted bytes |
| -------------- | ---------------: | --------------------------: |
| `/dashboard`   |               10 |                   1,581,390 |
| `/accounts`    |               13 |                   1,672,525 |
| `/imports/new` |               15 |                   1,939,079 |

The import route alone references `3efeiz7bia9vn.js`, a 240,834-byte / 75,943-byte-gzip route chunk.
Inspection finds both import/config strings and Motion implementation markers (`VisualElement`,
springs and `prefers-reduced-motion`) in that chunk. Therefore P02 does **not** attribute every byte
to Motion. It records the narrower, defensible fact: the current Animate tabs plus their Motion
graph are isolated in a sizeable route-only chunk, absent from `/accounts` and `/dashboard`. A
shared tooltip migration would move a similar dependency graph into the authenticated layout; an
actual future diff must measure its exact incremental output.

The production build passed under Node `v22.21.1`, Corepack pnpm `11.13.1`, React `19.2.7` and Next
`16.2.10`. No hydration or console error occurred in either local or official candidate CLI
sessions.

## Reusable rollout standard

Future registry adoption is permitted only component by component; this ADR does not ban Animate UI.
The adopting package must satisfy all of the following:

1. name a real consumer and user benefit; never copy an unused candidate;
2. pin the exact registry JSON and upstream commit/hashes in evidence;
3. preserve the Radix API required by consumers, including an explicit decision for `asChild`,
   `forceMount`, controlled state and portal container;
4. use `MotionConfig reducedMotion="user"` or an equally tested local policy, plus CSS
   `motion-reduce` coverage for non-Motion wrappers;
5. allow only opacity and small-distance/scale motion, normally `<=200 ms`; do not use blur,
   perspective, large rotation or cursor-follow motion for blocking, destructive or frequent tasks;
6. keep animation interruptible, avoid exit waits that delay the next task, and verify rapid
   open/close/tab changes for stale focus or layout jank;
7. keep Motion in a leaf route where possible; record before/after route manifests, emitted and gzip
   bytes, and prove tree-shaking rather than assuming it;
8. test role/name/description, screen-reader relationships, keyboard navigation, trap/restore,
   Escape, outside interaction, nested portals, collision, scroll, dark mode, 320 px, 200% zoom and
   reduced motion with retries disabled;
9. verify React/Next hydration and console/network cleanliness; and
10. review upstream maintenance and satisfy the pinned license/notice obligations before copying.

Until those gates pass, direct Radix/shadcn wrappers are the project default. Existing Animate tabs
are grandfathered, not evidence that all Radix surfaces should migrate.

## Real installed-CLI charter

### Tool and hygiene

- Repository-installed `@playwright/cli@0.1.17` was invoked through exact Corepack pnpm.
- Sessions: `p02-local-20260720`, `p02-animate-docs-20260720`, the narrow/mobile follow-up
  `p02-layout-20260720`, and the final dark-token check `p02-dark-20260720`.
- No MCP browser, `npx`, headed/debug/dashboard/show mode, temporary test/config, saved auth state,
  trace, video, PDF or HAR was used.
- A synthetic local identity was created entirely inside one browser automation closure. Its
  recovery material was neither returned nor written to the evidence/artifacts.
- All four sessions were closed; `playwright-cli list` returned no browsers. All P02-generated CLI
  YAML/log artifacts were removed by exact filename; pre-existing artifacts were preserved.

### Local current behavior

- Imported an in-memory two-transaction CSV without a temporary file and exercised all five real
  import tabs.
- ArrowRight moved focus/selection from Template to Columns, the visible panel was correctly
  labelled, and the tab/panel contents remained usable.
- With reduced motion emulated, a Format change still had three running animations at 20 ms.
- Opened the real Create Account dialog from the import account combobox. Initial focus reached
  `#account-name`, repeated Tab remained inside, Escape closed, content was fixed at `z-index: 50`,
  and the CSS entry duration was 200 ms. Because this controlled flow had no persistent Radix
  trigger after the command option closed, focus was not automatically restored.
- Imported the CSV and opened the real delete-import alert. It exposed a named/described
  `alertdialog`, initially focused Cancel, contained repeated Tab, closed on Escape and portalled to
  body at `z-index: 50`. Its external controlled trigger likewise did not receive focus afterward.
- Collapsed the sidebar and focused the real vault selector. Tooltip disclosure opened on focus,
  populated `aria-describedby`, changed semantic text colors under `.dark`, and closed on Escape.
- Local console: zero errors. Sanitized dynamic requests used successful 200 responses for register,
  vault creation/listing, snapshot/updates and the exercised pages; no 4xx/5xx was observed.

### Latest official candidate behavior

- Used the live official preview for each of tabs, dialog, alert dialog, dropdown and tooltip, not a
  locally invented substitute.
- Dialog and alert kept Radix labels/descriptions, focus traps, Escape, body portals and `z-50`;
  official triggers restored focus. Dialog outside click closed; alert outside click remained
  blocked.
- Dropdown opened a nested submenu with ArrowRight, focused Email, and Escape unwound the layers;
  the main menu stayed in the narrow viewport, while the settled submenu clipped left as recorded.
- Tooltip opened on focus, exposed `aria-describedby`, closed on Escape and used `z-50`.
- With the official document root switched to `.dark`, the candidate dialog and tooltip both
  resolved to dark semantic surfaces (`oklch(0.145 0 0)` background and `oklch(0.985 0 0)`
  foreground); no hard-coded light surface appeared.
- Tabs used arrow activation and labelled panels. After the asynchronous state change, Account was
  focused/selected and two animations were still active under reduced-motion emulation.
- At 320x720, the candidate dialog box was approximately 260x297 at `x=30`, and the alert was
  approximately 271x217 at `x=25`; both fit horizontally. A supplemental CSS `zoom: 2` check left
  the dialog itself horizontally inside the 320 px viewport but is not claimed as a perfect browser
  zoom emulation. The stricter 320 px check and exact measurements are retained for review.
- Rapid entry samples showed the dialog/alert/tooltip motion described above; keyboard interruption
  with Escape worked. The aesthetics were smooth in isolation but reduced immediate readability and
  were disproportionate to the workflow.
- Official candidate console: zero errors/warnings on the final pages; no failed 4xx/5xx request was
  observed.

## Automated verification

All commands ran against the unchanged `BASE == HEAD` tree. No Playwright retry converted a failure
to a pass.

| Gate                                                     | Exit/result                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| `corepack pnpm format:check`                             | `0`; 476 files matched                                        |
| `corepack pnpm lint`                                     | `0`; 0 errors, 13 unchanged base warnings                     |
| `corepack pnpm typecheck`                                | `0`                                                           |
| `corepack pnpm test`                                     | `0`; 41 files, 1,141 tests                                    |
| focused accounts/import/sidebar/alias E2E, `--retries=0` | `0`; 16/16                                                    |
| same focused slice, `--repeat-each=3 --retries=0`        | `0`; 48/48                                                    |
| production `corepack pnpm build`                         | `0`; compile 5.2 s, TypeScript 8.0 s, 17 routes               |
| full E2E, `--retries=0`                                  | `1`; **77/78**, one untouched transaction shift-click timeout |
| exact failed `T021c`, `--repeat-each=3 --retries=0`      | `0`; 3/3 diagnostic passes                                    |

The first focused Playwright invocation failed before collection because its configured web server
could not start. Starting the exact `corepack pnpm dev` command explicitly succeeded in 248 ms, and
all subsequent focused/repeated/full runs used that healthy declared server. This startup diagnostic
is not counted as a test pass.

The initial full result remains 77/78 and is not replaced by the later green diagnostic. The exact
failure was
`Transactions › US2: Checkbox Selection › T021c: shift-click selects range of transactions`, timing
out after 5 s waiting for `/3 selected/i` after Shift-clicking the third row. P02 changed no
transaction, selection or test code. P00 previously recorded a no-retry 78/78 and the same
repository risk ledger already has open `R-009` for retry-masked/shared-state E2E flake. The exact
case then passed independently three times with retries disabled, so the failure is currently
non-reproducible, not a justified P02 product change. Playwright cleaned the initial failure
directory when the diagnostic run began, so no durable DOM error-context remains beyond the verbatim
assertion/locator/timeout above. Route it to `R-009`, the next package touching the transaction
table/rows (`P13`), and the no-retry final audit (`P21`). It must not be hidden or treated as a
green full-suite result.

## Maintenance, license and question route

The pinned upstream license is “MIT + Commons Clause License Condition,” not the ordinary MIT text.
It permits use/modification as part of an application but requires the copyright/permission notice
in copies or substantial portions and prohibits selling/redistributing the components themselves in
original form. No root license/third-party notice or Animate UI/Elliot Sutton notice was found in
the repository, despite the existing copied tabs. P02 does not make a legal conclusion or add an
unscoped notice; it uses the safest reversible technical default—do not copy more code—and raises
the following complete non-blocking proposal for root transcription.

### Q-PROPOSAL-P02-01 — Animate UI notice and redistribution posture

- **Raised:** 2026-07-20, P02, `human_scratch_implementer`.
- **Context and evidence:** existing Animate UI tabs are copied into `src/components/animate-ui/**`;
  the pinned upstream license requires its notice in copies/substantial portions and restricts
  selling or redistributing components in original form; repository search found no notice file.
- **Why frozen authority does not fully decide it:** HS-017 requires maintenance ownership and a
  reversible adoption decision, but it does not authorize legal interpretation or name the
  repository's intended distribution model.
- **Options considered:** (A) add a reviewed third-party notice and confirm application distribution
  complies; (B) replace/remove the copied tabs with direct Radix code; (C) accept the missing-notice
  risk and expand copying.
- **Default selected for continued work:** decline further copying; retain existing tabs
  temporarily; route a notice/distribution review before release. Option A is the preferred
  remediation if the application's distribution is compatible, otherwise use B. Reject C.
- **Decision hierarchy basis:** frozen requirement permits decline; security/compliance and
  preservation rules favor no new copied surface; the choice is reversible.
- **Impact and risk:** no P02 runtime impact. Unresolved notice/distribution obligations may affect
  release compliance and future registry adoption.
- **How to reverse or migrate:** add the reviewed notice and document intended distribution, or
  replace the two tabs layers/helpers with a direct Radix implementation and re-run P02 gates.
- **Does a human still need to decide after completion?:** yes; a repository/release owner must
  confirm the distribution posture and approve the notice or replacement route.

## Final boundary and handoff

At the final self-audit:

- HEAD remains exactly `19d73035b33b639f9927d2f78a55d74c44f65544` and `BASE..HEAD` is empty;
- no implementation or test path changed, no commit was created, and the staged path inventory is
  empty;
- root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were preserved;
- this assigned evidence file is the sole worker-created uncommitted path;
- `package.json` and `pnpm-lock.yaml` remain SHA-256
  `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` and
  `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`;
- `specs/human-scratch.md` remains SHA-256
  `dcd03b23aab92da4b0944d683ef4c0a363a56e70d6fc8775066502ed5f626ca7`, 350 lines and 24,240 bytes;
- the immutable FS-001 source remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes;
- the transient Next dev `next-env.d.ts` rewrite was byte-restored by the production build;
- no CLI browser session or P02 CLI artifact remains; and
- ignored Playwright report/test-result outputs from automated E2E remain runner-owned and are not
  represented as implementation artifacts.

The exact empty range and this complete ADR are ready for independent review.

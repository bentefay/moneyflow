# P02 Independent Review — Revision 01

## Verdict

**FAIL.** The decision to decline broader Animate UI adoption is well supported, the upstream pin
and bundle evidence reproduce, and no representative migration is justified. The decision-only ADR
is nevertheless incomplete on a task-mandated accessibility/mobile boundary: the retained real
import tabs have no accessible names at 320 px. That contradicts the evidence's unqualified claim
that the real tabs preserve labelled relationships and misses a defect on the exact current Animate
UI surface P02 evaluated.

## Review contract and immutable boundary

- Package/revision: `P02/01`, `HS-017`.
- Frozen evidence: `evidence/P02/implementation-01.md`, independently verified SHA-256
  `0806cf0cf3918fb56103833c5d61812cdb4465cbe3a7ea69e2f048d1afdead36`.
- Assigned BASE and HEAD are both `19d73035b33b639f9927d2f78a55d74c44f65544`.
- `git rev-list --count BASE..HEAD` returned `0`, and `git diff --exit-code BASE..HEAD` returned
  `0`. This is a valid literal empty range, not an automatic PASS.
- HEAD remained the assigned HEAD throughout review. There are no staged paths. Root-owned
  `HANDOFF.md` and `PROGRESS.md` and the frozen implementation evidence were preserved.
- I read the full task, frozen evidence, active HANDOFF, PROCESS reviewer contract, repository
  `.claude/CLAUDE.md`, both applicable rules, and the repository skills relevant to components,
  imports, and E2E. This review did not edit product, test, evidence, scratch, FS-001, ledgers,
  agent configuration, or any prior review.

## Findings

### I-001 — blocking: all retained import tabs are unnamed at the 320 px breakpoint

The real retained Animate UI surface does not satisfy P02's screen-reader/mobile evaluation.

Independent reproduction with repository-installed `@playwright/cli@0.1.17`:

1. Created an isolated synthetic local identity, opened `/imports/new`, and supplied an in-memory
   CSV through the real file input.
2. Resized to `320x720` and inspected the real tablist.
3. Every trigger had `role="tab"`, `aria-controls`, and correct selection state, but no `aria-label`
   or `aria-labelledby`. Its only label is the child `<span className="hidden sm:inline">` in
   `ConfigTabs.tsx:140`; computed `display` was `none` for all five triggers.
4. The deterministic accessibility snapshot was:

    ```text
    - tablist:
      - tab
      - tab [selected]
      - tab
      - tab
      - tab
    ```

    The active panel likewise appeared as unnamed `tabpanel` in the accessibility snapshot.

5. `ArrowRight` still moved focus/selection to the second tab, proving that keyboard mechanics work,
   but the selected control remained unnamed. The five DOM states were all
   `{ ariaLabel: null, ariaLabelledby: null, labelDisplay: "none" }`.

This is not an aesthetics preference. A screen-reader user at the responsive breakpoint receives
five indistinguishable tab controls and an unnamed panel. It directly contradicts implementation
evidence lines 288–291 and the decision matrix's unqualified semantics claim. It also violates the
ADR's own rollout gate requiring role/name relationships at 320 px.

Revision 02 must make the retained tabs keep programmatic names when visual labels are hidden—for
example, keep text in an `sr-only sm:not-sr-only` label or provide stable `aria-label` values—and
add a retries-disabled 320 px regression that asserts the accessible names and active panel name for
all five tabs. The corrected evidence must report both the previous failure and the fixed mobile
snapshot. This narrow repair does not require or justify adopting any additional Animate UI
primitive.

### N-001 — non-blocking for P02: T021c is demonstrably flaky, not a green full-suite substitute

The frozen evidence correctly retains its no-retry full-suite result as **77/78** and does not turn
its later exact-case 3/3 diagnostic into a green full suite. Independent review produced a stronger
flake demonstration:

- full no-retry suite: `78/78` passed, including T021c;
- immediately subsequent exact T021c `--repeat-each=3 --retries=0 --workers=1`: **2/3**, with the
  same 5 s timeout waiting for `/3 selected/i` after the Shift-click.

Thus the frozen 3/3 diagnostic was a truthful observation at that time, but it did not establish
stability. The empty P02 range contains no transaction table, selection, or test change, so this is
not attributed to P02. Existing `R-009` plus `P13` and the no-retry `P21` audit remain the correct
owners. Both the implementer and reviewer results must remain visible; neither green run replaces a
red run.

## Independent primary-source and ownership audit

### Upstream identity and registry pin

On 2026-07-20 AEST, independent official-source checks established:

- `git ls-remote https://github.com/imskyleen/animate-ui.git HEAD` returned
  `efeb96ffd7a3b7a4868667e4ac3c346620fb3044`, matching the evidence. GitHub records the commit at
  `2025-12-31T12:51:05Z`.
- The official changelog still identifies `1.0.27` dated 2025-12-15 as the latest documented
  distribution version. GitHub exposes no tags and no latest release.
- The official introduction describes Animate UI as an open, copy-first component distribution, not
  an NPM runtime wrapper. The official troubleshooting minima remain Motion `>=12.23`, React `>=19`,
  Tailwind `>=4.1`, and Radix UI `>=1.4`.
- The official accessibility page still requires consumers to provide a root
  `MotionConfig reducedMotion="user"`; neither the MoneyFlow app nor the official live previews did
  so locally.
- All ten live registry items fetched successfully using the actual names `components-radix-*` and
  `primitives-radix-*`. Their dependency/registry-dependency graphs match the frozen evidence,
  including Motion plus controlled-state/context helpers, dropdown highlight and data-state helpers,
  and tooltip cursor-follow support.

The ten raw files at the pinned commit independently produced these SHA-256 values:

| File pair     | Component SHA-256                                                  | Primitive SHA-256                                                  |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| tabs          | `59b57bb21fd3136b2eb47b484216482e1d38a2f27e67fa465acc9329fc6d7999` | `75720767cfe5a964b429b8fdc1f266069f7de4167b013667db95a416705d1474` |
| dialog        | `c6dff1ff45cb4f08aa3c37acbf006a0233a36d95d0a16a5285ec4b564d864b93` | `3943abfadf21049a99c7e4bf1ad23ef23fdb4f24c78e08dd0fdf1dea7c54418b` |
| alert dialog  | `100a8c84e940a02d4ffee32811e37b73ef11a2808534f0d8139355f7c5233e5d` | `46db331b2b113daceca487282073850250ce053a4f657863e0034c4c5e0af37a` |
| dropdown menu | `de9f6a16427460ef36b38bf389d01cbe8d775a090b55a58d1945bb6202eaa0ac` | `b412d2a2f4f95f5c350bb46cbf567c27c824df762199446367746cc920224738` |
| tooltip       | `9a1783ad00ffbb66b8ebf683ccad0c32234dfde3659d7099083b86548418efa5` | `86ef655ee27aaeaf1e5ad6d9db70f2df946423c261dd6906e44bef14f5a803e5` |

The pinned license is accurately characterized as “MIT + Commons Clause License Condition.” It
requires the copyright/permission notice in copies or substantial portions and limits selling or
redistributing the components in original form. Repository search found no Elliot Sutton/Animate UI
notice or root license/third-party notice for the already-copied tabs.

### Local copy, API, dependency, and route ownership

- Local tab hashes match the evidence:
  `9186b44e39590e4bc95ae19bc87893d0235c6ea3b130fc1f2b4228dcacc15fb5` and
  `f98ef3d5ea3f6eae1ef7149e0c4a25453fa2156c2b747b860190045e4b62a245`.
- Direct diffs against the pinned upstream tab files show only formatting/import alias ordering;
  controlled Radix state, highlight, auto-height, `AnimatePresence mode="wait"`, blur/opacity, and
  transition defaults are behaviorally the same.
- The four local wrappers have the reported 129/135/235/57 lines. Dialog has account, alias, and
  command consumers; alert dialog has the import deletion consumer; dropdown has no product
  consumer; tooltip is shared across authenticated layout and feature cells.
- `pnpm why` found exactly one resolved version for each relevant primitive: dialog/alert `1.1.19`,
  dropdown `2.1.20`, tooltip `1.2.12`, Motion `12.42.2`, and umbrella Radix `1.6.2`. Broader
  adoption cures no duplicate version.
- Direct wrappers preserve Radix composition props. The candidate source explicitly omits
  `asChild`/`forceMount` at animated content boundaries while adding controlled state,
  `AnimatePresence`, Motion nodes, and owned helpers.
- `motion/react` remains confined to `src/components/animate-ui/**`. There is no root
  `MotionConfig`, and the shared tooltip is the highest-blast-radius candidate.

The production route-manifest calculation reproduced exactly:

| Route          | Unique chunks | Sum of unique bytes |
| -------------- | ------------: | ------------------: |
| `/dashboard`   |            10 |           1,581,390 |
| `/accounts`    |            13 |           1,672,525 |
| `/imports/new` |            15 |           1,939,079 |

There are 46 emitted JS chunks totalling 4,698,976 bytes. Import-only `3efeiz7bia9vn.js` is 240,834
raw / 75,943 gzip bytes, contains Motion and import markers, and is absent from the
account/dashboard manifests. The evidence correctly avoids claiming that all of that chunk is
Motion.

## Real installed-CLI behavior review

I used only the repository-installed headless CLI in unique disposable sessions. No MCP browser,
`npx`, temporary test/config, headed/debug/UI/show mode, saved auth state, trace, video, PDF, or HAR
was used.

| Surface           | Independent observation                                                                                                                                                                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current tabs      | At desktop size, roles, selection, `aria-controls`, ArrowRight activation, focus, and labelled panel relationships worked. Under reduced-motion emulation, tab/highlight/content animations with 450–500 ms timings were still running. At 320 px, I-001 applies: keyboard state still works but every tab and the panel are unnamed.               |
| Current dialog    | Real Create Account dialog was named/described, initially focused `#account-name`, trapped repeated Tab, closed on Escape, portalled at `z-index: 50`, and fit at 320 px (`x=16`, width `288`). CSS `zoom: 200%` remained horizontally contained. Focus returned to `body` because the controlled command option is not a persistent Radix trigger. |
| Current alert     | Real Delete Import exposed a named/described `alertdialog`, initially focused Cancel, trapped Tab, blocked outside click, closed on Escape, and portalled at `z-index: 50`. Its controlled external delete button did not receive restored focus.                                                                                                   |
| Current dropdown  | Static inventory confirmed no real consumer, so there is no honest current product journey to migrate or smoke-test.                                                                                                                                                                                                                                |
| Current tooltip   | Collapsed-layout vault tooltip opened on keyboard focus, attached `aria-describedby`, exposed `role=tooltip`, used dark semantic foreground/background colors, stayed inside the desktop viewport, used `z-index: 50`, and closed on Escape.                                                                                                        |
| Official dialog   | Retained name/description, focus trap, Escape/trigger restoration, outside-click close, body portal and `z-50`. Even with reduced motion, its entry sample was opacity `0.049`, blur `3.81px`, roughly 0.81-scale 3D transform, with 14 active document animations. Dark tokens resolved to `oklch(0.145 0 0)` / `oklch(0.985 0 0)`.                |
| Official alert    | At 320x720 it fit (`x=35.35`, width `249.30`), initially focused Cancel, trapped focus, blocked outside click, restored trigger focus on Escape, and remained horizontally contained during the supplemental CSS zoom check. Reduced-motion entry still used the 3D/blur/scale treatment and six active animations.                                 |
| Official dropdown | Keyboard Enter opened the menu and ArrowRight opened the nested submenu with Email focused. At 320 px the settled main menu was `x=96..320`, but the official submenu reproduced exactly at `x=-27..101`, clipping 27 px left. Escape unwound and ultimately restored the trigger.                                                                  |
| Official tooltip  | Keyboard focus attached `aria-describedby`; Escape closed. At 320 px/dark/reduced-motion, entry began at scale `0.502`, opacity `0.0049`, with eight active document animations, while semantic colors and `z-50` were correct.                                                                                                                     |
| Official tabs     | ArrowRight moved focus/selection to Password and the panel relationship was correct. Multiple 500 ms highlight/content animations remained active under reduced-motion emulation.                                                                                                                                                                   |

Both local and official sessions reported zero console errors. The reviewed dynamic local requests
and official document requests were successful 200 responses; no suspicious 4xx/5xx was observed.
Animations remained interruptible by Escape, but the candidate dialog/alert/tooltip entry states
made content initially less readable and were disproportionate to frequent financial workflows.

These checks support the aesthetic/usability rejection, candidate portal/collision assessment,
dark-mode assessment, reduced-motion gate, API-ownership concerns, and React 19/Next 16 structural
compatibility conclusion. They do not support the ADR's current-mobile tabs claim.

## Automated verification

All commands were run at the assigned unchanged HEAD with retries disabled where applicable.

| Gate                                         | Independent result                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `corepack pnpm format:check`                 | PASS; 478 files                                                                       |
| `corepack pnpm lint`                         | PASS; 0 errors, 13 unchanged warnings                                                 |
| `corepack pnpm typecheck`                    | PASS                                                                                  |
| `corepack pnpm test`                         | PASS; 41 files, 1,141 tests                                                           |
| production build                             | PASS twice; 17 routes; final run restored generated production `next-env.d.ts`        |
| first focused E2E launch                     | web-server startup failed before collection; not counted as a test result             |
| focused accounts/import/sidebar/alias repeat | PASS; 48/48 with `--repeat-each=3 --retries=0` after explicit healthy dev server      |
| full E2E                                     | PASS; 78/78 with `--retries=0`                                                        |
| exact T021c diagnostic                       | FAIL; 2/3 with `--repeat-each=3 --retries=0`, same timeout as frozen full-run failure |

No retry converted a failure into a pass. The focused launch failure and T021c failure remain red.
The former is an environment launch diagnostic; the latter is the existing unrelated R-009 flake.
I-001 is independently deterministic and is not covered by the current import E2E because that test
only checks tab visibility/names at the default desktop viewport.

## ADR and migration verdict

The core ADR direction is sound and reversible:

- Dialog and alert add excessive 3D/blur motion to blocking/destructive tasks without semantic gain.
- Dropdown has no consumer and its official narrow submenu currently clips.
- Tooltip would spread Motion/helper ownership into the shared authenticated layout for negligible
  product benefit.
- Candidate APIs narrow Radix escape hatches, copy-first code increases maintenance/license
  ownership, and no duplicate dependency is removed.
- The ten-point rollout standard is appropriately strict on real consumers, source pinning, API
  parity, reduced motion, <=200 ms subtle motion, interruption, leaf bundling, behavior, hydration,
  and licensing.

Therefore **no representative candidate migration is justified**. A migration merely to satisfy the
investigation would create unused or higher-risk code. The FAIL is instead because a decision-only
PASS requires a complete and accurate ADR, and the retained current tabs fail a tested
screen-reader/mobile boundary that the ADR says it covered.

## Question and risk routing

`Q-PROPOSAL-P02-01` is complete in substance, supported by the pinned license and repository search,
uses the decision hierarchy, selects the safest reversible default, and correctly leaves legal/
distribution posture to a repository or release owner. Root should transcribe it to the canonical
QUESTIONS ledger (or link an exact canonical duplicate) even though this revision FAILs.

I-001 needs no new human decision: accessible names are required by the task and component guidance,
and the narrow reversible fix is clear. N-001 should update/continue `R-009` and remain routed to
P13/P21; it is not a reason to modify unrelated P02 transaction code.

## Hygiene and final boundary

- CLI sessions `p02-review-local-20260720` and `p02-review-upstream-20260720` were closed; session
  data deletion found no persistent profiles; `playwright-cli list` returned no browsers.
- Every review-generated CLI YAML/log artifact was removed by exact path. Pre-existing CLI artifacts
  were preserved.
- The synthetic recovery phrase was never returned, logged, or persisted in this artifact.
- The final production build restored the transient dev rewrite of `next-env.d.ts`.
- Package/lock hashes remain `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` and
  `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`.
- `specs/human-scratch.md` remains
  `dcd03b23aab92da4b0944d683ef4c0a363a56e70d6fc8775066502ed5f626ca7`, 350 lines / 24,240 bytes.
- Immutable FS-001 remains `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes.
- HEAD remains `19d73035b33b639f9927d2f78a55d74c44f65544`; the reviewed range remains empty.

**Final recommendation: FAIL P02 revision 01.** Preserve this review immutably, transcribe
`Q-PROPOSAL-P02-01`, set P02 to `changes_requested`, and dispatch revision 02 over the original BASE
through the new HEAD after the retained tabs receive mobile accessible names and a regression test.

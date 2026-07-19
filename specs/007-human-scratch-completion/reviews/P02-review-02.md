# P02 Independent Review — Revision 02

## Verdict

**PASS.** Revision 02 closes revision 01 finding I-001 with the smallest production change and a
meaningful real-journey regression. At 320 px, each of the five retained import tabs now has exactly
one deterministic accessible name, its active tabpanel has the same exact name through a valid
`aria-controls` / `aria-labelledby` pair, and ArrowRight moves focus and selection through all five
tabs and wraps. At the desktop breakpoint the same text is visibly restored. The corrected evidence
no longer overstates mobile semantics.

The broader ADR remains a justified decline: adopting the other Animate UI candidates would add
copy-owned API/motion/portal risk without a demonstrated consumer benefit. Q-001/R-022 and the
T021c/R-009/P13/P21 route correctly remain open; this PASS does not claim those independent matters
are resolved.

## Review contract and immutable boundary

- Package/revision: `P02/02`, `HS-017`.
- Original BASE: `19d73035b33b639f9927d2f78a55d74c44f65544`.
- Assigned and reviewed HEAD: `213100fadf5acea30aad7e90998bd575cdcd508c`.
- Frozen revision-02 evidence: `evidence/P02/implementation-02.md`, independently verified SHA-256
  `e45b577d3116255cbf0dadf68da6599bdfc383dd953e97855b4f2fd10a5620ec`.
- Immutable revision-01 evidence and review remained exact at
  `0806cf0cf3918fb56103833c5d61812cdb4465cbe3a7ea69e2f048d1afdead36` and
  `2ef03fd7a06459ca5483d5bd9004cf59d54077474e2185bcb5c69391a17e35cf`.
- The full original `BASE..HEAD` contains three commits: root's revision-01 finding/control commits
  `67311b9f716611bb2a5e655460f7ae638203c10a` and `72710249b4ba2c515d159ce3560e68af3ac0b011`,
  followed by implementation commit `213100fadf5acea30aad7e90998bd575cdcd508c`.
- I reviewed all eight paths in that range. The first six are the named root-owned control and
  immutable revision-01 artifact paths. The implementation commit contains exactly the two assigned
  paths, `src/components/features/import/ConfigTabs.tsx` and `tests/e2e/import.spec.ts`.
- `git diff --check BASE..HEAD` passed. HEAD remained exact throughout review; no path was staged.
  Root-owned unstaged `HANDOFF.md` and `PROGRESS.md` and the untracked frozen implementation
  evidence were preserved.
- I read the full task, both immutable evidence revisions, the immutable failed review, active
  HANDOFF, PROCESS reviewer contract, repository `.claude/CLAUDE.md`, applicable TypeScript/coding
  rules, and the component/import/E2E skills. This review edited only this assigned new review file.

## Findings

No blocking or non-blocking product finding remains for P02 revision 02.

Revision-01 I-001 is closed. The open compliance and unrelated flaky-test routes below are retained
ledger matters, not newly discovered revision-02 defects.

## I-001 counterfactual, fix, and selector audit

The counterfactual is meaningful and independently checkable:

- Revision 01 used `<span className="hidden sm:inline">`. At 320 px, `hidden` computed to
  `display: none`, removing the only trigger text from the accessibility tree. The immutable
  revision-01 review recorded the resulting five unnamed tabs and unnamed active tabpanel in a real
  installed-CLI snapshot.
- The new regression queries `getByRole("tab", { name: tabName, exact: true })` and
  `getByRole("tabpanel", { name: tabName, exact: true })` at exactly `320x720`. Those locators
  cannot pass against the independently observed unnamed revision-01 tree. The frozen evidence also
  records that this checked-in assertion was introduced before the source fix and failed on the
  missing named Template tab.
- Revision 02 changes only the label utility to `sr-only sm:not-sr-only`. It retains the same single
  label text node, visually clips it below `sm` without removing it from the accessibility tree, and
  restores ordinary visible text at `sm` and above. It adds no parallel `aria-label`, hidden
  duplicate label, component state, or test-only behavior.

The added test is part of the existing CSV import journey. It asserts one exact tab locator per
name, focus, `aria-selected=true`, one visible exact-name tabpanel, non-empty IDs, both reciprocal
ID relationships, five ArrowRight transitions and wrap back to Template. It uses role/name
selectors, has no arbitrary sleep, no retry override, no brittle generated-ID literal, and no test
hook. The viewport is restored before the rest of the desktop journey.

This directly tests user-visible accessibility behavior rather than implementation classes. The
generated Radix IDs are checked only relationally, so their exact values may change safely.

## Independent installed-CLI behavior review

I used the repository-installed `playwright-cli` version `0.1.17`, an isolated synthetic local
identity, the real `/imports/new` route, and an in-browser CSV `File`. No recovery phrase was
returned or persisted in this artifact.

At `320x720`, independent inspection proved all of the following for Template, Columns, Format,
Duplicates and Account:

- each exact-name tab locator had count `1`, and each selected exact-name tabpanel had count `1`;
- each trigger had exactly one label span with exact text, no `aria-label` or `aria-labelledby`, and
  an `aria-hidden="true"` icon, leaving one deterministic accessible-name source;
- the mobile label computed to `position: absolute`, `width: 1px`, `height: 1px`, hidden overflow
  and nowrap, while remaining present in the accessibility tree;
- every trigger snapshot was `tab "<name>" [selected]` in its turn and every panel snapshot began
  `tabpanel "<name>"`;
- every trigger's `aria-controls` equalled the active panel ID and every panel's `aria-labelledby`
  equalled the trigger ID;
- focus and `aria-selected=true` moved on every ArrowRight, and Account ArrowRight wrapped both
  focus and selection to Template; and
- the tablist fit the real 320 px viewport without internal overflow (`238/238` client/scroll width,
  bounds `41..279`).

The final deterministic mobile tablist snapshot was:

```text
- tablist:
  - tab "Template" [selected]
  - tab "Columns"
  - tab "Format"
  - tab "Duplicates"
  - tab "Account"
```

At `1280x720`, all five label spans computed to `position: static`, measured visibly from about 47.5
to 68.9 px wide and 20 px high, and Format plus its exact-name tabpanel selected normally. Thus
`sm:not-sr-only` restores the existing desktop presentation rather than leaving visually hidden
labels.

Proportionate media/reflow checks also passed the revised semantic boundary:

- dark mode retained the exact tab and panel names and selected/focus behavior;
- under `prefers-reduced-motion: reduce`, Duplicates ArrowRight still selected/focused exact-name
  Account and its labelled panel; live animations remained, which accurately supports the ADR's
  statement that existing motion policy is not solved and remains a future rollout gate;
- with a 640 px viewport and supplemental CSS `zoom: 2`, all five exact names and the Template panel
  remained available. The tablist used its intended internal horizontal scrolling (`238/292`
  client/scroll width) while the document itself had no horizontal overflow (`640/640` client/scroll
  width); and
- the clean `localhost` session recorded zero console errors and zero warnings. All displayed
  identity, vault and sync requests returned HTTP 200; no failed application request appeared.

An initial discarded `127.0.0.1` setup hit Next's documented dev-origin HMR block. No acceptance
claim was derived from it; the review restarted against the server's declared `localhost` origin,
obtained the clean result above, and removed both sessions' generated artifacts by exact path.

Refresh/persistence, multiple browser tabs, offline data mutation and empty/error transaction states
are not changed by this one-class accessible-name repair. The real isolated-user upload journey,
responsive breakpoints, keyboard/focus, dark, reduced-motion, zoom/reflow and console/network checks
cover the task-relevant execution paths without inventing unrelated state behavior.

## Independent automated verification

All substantive reviewer commands used repository-local tooling and retries remained disabled:

| Check                                                             | Independent result                               |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| `corepack pnpm format:check`                                      | PASS; 479 files                                  |
| `corepack pnpm lint`                                              | PASS; 0 errors, 13 pre-existing warnings         |
| `corepack pnpm typecheck`                                         | PASS                                             |
| `corepack pnpm test`                                              | PASS; 41 files, 1,141 tests                      |
| changed CSV journey, `--repeat-each=5 --retries=0 --workers=1`    | PASS; 5/5                                        |
| full `tests/e2e/import.spec.ts`, `--retries=0 --workers=1`        | PASS; 6/6                                        |
| full E2E, `--retries=0 --workers=4`                               | PASS; 78/78 in 1.1 minutes                       |
| exact T021c diagnostic, `--repeat-each=3 --retries=0 --workers=1` | PASS; 3/3                                        |
| final `corepack pnpm build`                                       | PASS; compile 5.1 s, TypeScript 8.1 s, 17 routes |

The focused runner's first attempt could not auto-start its configured web server before test
collection. I started the repository's declared dev server explicitly and reran the unchanged
commands; the focused, file-level and full-suite results above are the collected results. This is a
harness startup event, not a product retry or hidden test retry.

The new 5/5 repeat, file 6/6, full 78/78 and manual role/name matrix agree. There is no regression
signal in the implementation's two changed paths.

## Corrected decline ADR and ownership verdict

The corrected ADR is complete enough to PASS a decision package:

- It retains the independently reproduced exact upstream pin
  `efeb96ffd7a3b7a4868667e4ac3c346620fb3044`, documented distribution `1.0.27`, license/source
  hashes, dependency minima and the precise limit that upstream does not explicitly certify Next 16.
- It distinguishes a copy-first locally owned component distribution from a package dependency and
  does not imply that a registry version is a Git tag or release.
- The inventory names current local wrappers and consumers. The candidate matrix records the actual
  API narrowing, portal/collision, controlled-state, motion and bundle costs instead of presuming
  visual animation is a benefit.
- Dialog and Alert Dialog add aggressive 3D/blur motion to blocking/destructive work; Dropdown Menu
  has no current product consumer and its representative nested submenu collided left at 320 px;
  Tooltip would spread Motion through shared authenticated surfaces for negligible demonstrated
  benefit. Declining all four remains proportionate.
- Retaining the existing import tabs as a route-local exception is now accurate because I-001 is
  fixed. The ADR explicitly does not claim their reduced-motion policy is complete and makes the
  exception non-precedential.
- The rollout standard requires a real consumer, an exact pin, API/portal decisions, subtle and
  interruptible motion, reduced-motion behavior, route-local measurement, full role/keyboard/portal/
  responsive/media checks, hydration/console cleanliness and notice compliance. It is reusable and
  falsifiable.

I independently reproduced the final bundle claims from the production build: 46 JavaScript chunks,
4,698,982 raw bytes; dashboard `10 / 1,581,390`, accounts `13 / 1,672,525`, and imports/new
`15 / 1,939,085` unique chunks/bytes. Only the import route moved by six raw bytes. The
import/Motion chunk `2-8hkk5b4q954.js` measured 240,840 raw / 75,949 gzip bytes and remained absent
from the dashboard/accounts manifests. The ADR properly avoids attributing the entire shared chunk
to Motion.

Therefore no representative migration is justified in P02, and no additional Animate UI code should
be copied merely to manufacture one.

## Questions, risks, and carried flake route

Revision 01's complete question proposal is present canonically as
`Q-001 — Animate UI notice and redistribution posture`; no duplicate or new proposal is needed. Its
safest reversible default is still correct: copy no additional Animate UI source, and before release
either approve a notice-compatible distribution treatment for the existing copied tabs or replace
them. `R-022` accurately remains open with that release-owner route. P02 does not fake legal
authority.

T021c remains correctly routed despite both revision-02 full-suite runs and this review's exact 3/3
being green. The immutable history contains the implementer's revision-01 77/78 failure and the
reviewer's later exact 2/3 failure after a green 78/78 full suite. A subsequent green sample does
not erase demonstrated intermittency. The revision-02 diff changes import presentation/tests only
and does not own transaction selection. Keep `R-009` open, route remediation to the next
transaction-row owner P13, and require P21 no-retry proof. No unrelated transaction change belongs
in P02.

## Hygiene and final boundary

- Installed-CLI sessions were closed; `playwright-cli list` returned no browsers.
- All four review-created CLI YAML/log artifacts were removed by exact path; pre-existing CLI
  artifacts were preserved.
- The synthetic recovery phrase was never returned, logged or persisted in this review.
- The final production build restored the transient dev rewrite of `next-env.d.ts` byte-for-byte.
- Package/lock hashes remain `45606e0163d9d2acfcb315279d6bd80298900037f5825a716f3b2642bf08c26b` and
  `c9916d4ba936b2b483292d774adda7b85af2b1b58c523cc1a82b9493c676b42f`.
- `specs/human-scratch.md` remains
  `dcd03b23aab92da4b0944d683ef4c0a363a56e70d6fc8775066502ed5f626ca7`, 350 lines / 24,240 bytes.
- Immutable FS-001 remains `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes.
- `SCOPE.json` remains `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`; both
  frozen sources and the two-source scope boundary remain intact.
- HEAD remains `213100fadf5acea30aad7e90998bd575cdcd508c`; staged paths remain empty.

**Final recommendation: PASS P02 revision 02.** Root may persist the immutable implementation and
review artifacts, retain Q-001/R-022 and R-009/P13/P21 exactly as routed, record the unchanged
reviewed HEAD and integration-control commit, and complete HS-017 only after the normal root
acceptance and marker procedure succeeds.

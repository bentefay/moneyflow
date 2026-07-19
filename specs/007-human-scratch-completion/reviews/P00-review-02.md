# P00 Revision 02 — Independent Review

- **Verdict:** PASS
- **Package/revision:** `P00/02`
- **Reviewer:** independent `human_scratch_reviewer`
- **Review window:** 2026-07-20T00:28+10:00 through 2026-07-20T00:35:26+10:00
- **Original literal BASE:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Literal reviewed HEAD:** `8f12d82ddb576af5cc8c6f04d32617d805e300de`
- **Range:** non-empty control-only history, fully inspected
- **Corrected implementation evidence:** `evidence/P00/implementation-02.md`, frozen SHA-256
  `3ad9f4fe264d47b6d93c29b9c34cb60e03d230299cc6e5bd4ec0b8f2150d50b7`
- **Sole reviewer write:** this file

Revision 02 satisfies P00. The corrected evidence explicitly supersedes revision 01's false focus-
restoration statement, reproduces the actual keyboard focus loss twice, and routes the red to P20B
without making a prohibited product fix. Independent reproduction matched every required focus state
exactly. The reviewed non-empty range contains only persisted revision-01 control artifacts and
ledgers; it changes no product, test, migration, configuration, scratch, or immutable FS source.

**VERIFICATION PASSED. NO CODE ISSUES.**

## Findings

No High or Medium findings.

The mobile-menu focus loss, reduced-motion animations, and DialogContent warning are accepted only
as truthful P00 baseline reds with explicit future ownership. This PASS does not accept those
product defects as delivered behavior and does not waive their later package/P21 gates.

## Reviewed range and immutable history

The first range command was:

```bash
git diff --exit-code 0ea864f5d0142530b2d524add228d3b51f162876 \
  8f12d82ddb576af5cc8c6f04d32617d805e300de
```

It exited 1 because the assigned range is intentionally non-empty. Full inspection found exactly:

| Commit                                     | Subject                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `00d47a420c3b6c7f66d6e89a9f8d95c2cc927c4c` | `docs: persist P00 revision 01 failure`        |
| `8f12d82ddb576af5cc8c6f04d32617d805e300de` | `docs: record P00 revision 01 artifact commit` |

The aggregate path set is exactly:

| Status | Path                                                                   |
| ------ | ---------------------------------------------------------------------- |
| M      | `specs/007-human-scratch-completion/HANDOFF.md`                        |
| M      | `specs/007-human-scratch-completion/PROGRESS.md`                       |
| A      | `specs/007-human-scratch-completion/evidence/P00/implementation-01.md` |
| A      | `specs/007-human-scratch-completion/reviews/P00-review-01.md`          |

Both ledger diffs were read line by line. They persist the revision-01 dispatch, evidence freeze,
review failure, immutable artifact commit, and revision-02 route. The two added artifacts were read
completely during revision 01 and their committed bytes were independently rehashed from HEAD.

```text
implementation-01.md  73349df979f97d0c4fb4eb7318a81695e794aa5d721d3fe2807934a9321f819c
P00-review-01.md       a0c0b3fa146efc96411bdc0588f289eadc36a21546a3c96393c993662cb92580
```

The path-filtered BASE..HEAD diff for `src`, `tests`, `supabase`, manifests/lockfile,
`next-env.d.ts`, `.claude`, `.codex`, scratch, and the canonical FS source was empty.
`git diff --check BASE HEAD` also exited 0.

## Corrected evidence audit

The corrected artifact is complete, internally consistent, secret-safe, and reproducible:

- HEAD and range identity are literal and current.
- Revision-01 evidence/review hashes are exact and immutable.
- Scratch SHA, 21 normalized unchecked blocks, FS SHA/line/byte identity, 22 unique requirements,
  mappings, and dependency graph remain exact.
- Tool, manifest, service, migration, environment-name, and readiness inventory is unchanged and
  correctly scoped.
- Full no-retry E2E, three-repeat critical E2E, unit/integration, format, lint, and typecheck
  results are explicit.
- The known build side effect and inherited green revision-01 build are disclosed rather than
  causing a forbidden tracked generated-file write.
- The product/accessibility/security/privacy/migration/data-loss/financial/performance/UX limits and
  routes do not overclaim future feature delivery.
- The focus-loss red now records deterministic pre-open, dialog-open, and post-detachment states
  twice and routes ownership to P20B.
- No ordinary ambiguity requires a question proposal.

## Independent verification

| Command/check                                                                                                                                                                                                | Result                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `git rev-parse HEAD`                                                                                                                                                                                         | Exact reviewed HEAD `8f12d82ddb576af5cc8c6f04d32617d805e300de`.          |
| range commits/path audit                                                                                                                                                                                     | Two documentation commits; four allowed control paths only.              |
| product/test/migration/config/scratch range filter                                                                                                                                                           | Empty.                                                                   |
| prior/corrected evidence hashes                                                                                                                                                                              | All three exact.                                                         |
| scratch normalized `jq`/`awk`/`diff` audit                                                                                                                                                                   | 21 blocks, 0 checked, byte comparison passed.                            |
| scratch/FS metadata                                                                                                                                                                                          | 350 lines/24,239 bytes and 715 lines/25,441 bytes; hashes exact.         |
| SCOPE identity                                                                                                                                                                                               | 22 declared/actual/unique requirements; 21 HS plus whole-file FS-001.    |
| `pnpm format:check`                                                                                                                                                                                          | Exit 0; 471 files matched before review output.                          |
| `pnpm lint`                                                                                                                                                                                                  | Exit 0; exact known 12 warnings, 0 errors.                               |
| `pnpm typecheck`                                                                                                                                                                                             | Exit 0.                                                                  |
| `pnpm test`                                                                                                                                                                                                  | Exit 0; 41/41 files and 1,139/1,139 tests passed.                        |
| `pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/import.spec.ts tests/e2e/sync-persistence.spec.ts tests/e2e/tab-duplication.spec.ts --retries=0 --repeat-each=3 --workers=4 --reporter=line` | Exit 0; 51/51 passed in 1.0 minute; no retries or inconsistent outcomes. |
| app/local REST readiness                                                                                                                                                                                     | HTTP 200/200.                                                            |
| `git diff --exit-code -- next-env.d.ts`                                                                                                                                                                      | Exit 0.                                                                  |

`pnpm build` was not rerun because it is already a green immutable revision-01 result and knowingly
rewrites tracked generated `next-env.d.ts`; this reviewer has no authority to restore that product-
adjacent file. The unchanged package/lock hashes and empty product/test range make the inherited
limitation explicit and safe.

## Real headless Playwright CLI charter

- **Session:** `p00-review-02-20260720-0032`
- **Tool/mode:** repository-installed `pnpm exec playwright-cli`, unique headless in-memory session
- **Prohibited routes avoided:** no MCP, `npx`, standalone/ad-hoc script, temporary test/config,
  headed/debug/UI/dashboard/show, trace, video, screenshot, PDF, HAR, or storage-state file
- **Secrets:** 12 masked recovery entries counted; none revealed, read, copied, printed, or retained

### Role, name, state, and smoke

`/new-user` exposed H1 `Get Started`, named `Generate Recovery Phrase`, and the unlock link.
Generation produced exactly 12 masked entries while `Create Account` was disabled. The named
acknowledgement became checked and enabled `Create Account`. Creation reached `/settings` with H1
`Vault Settings`, textbox `Vault Name`=`My Vault`, one named `Default currency` combobox, status
`Saved`, all sidebar links, and `Lock`.

Transactions exposed named search/filter controls, `Add transaction`, status `Saved`, and the empty
state. Reload retained the authenticated route and both `Saved` and `Add transaction`. The search
textbox was focus-visible; Tab moved focus visibly to named button `All time`; Shift+Tab restored
visible focus to search.

This fresh sanity complements the immutable revision-01 review's accepted broader journey covering
people, aliases, automations, manual/CSV transactions, refresh, and duplicate hydration.

### Required corrected focus-loss reproduction

Both independent iterations at `320x720` produced this exact state matrix:

| Stage                               |  Dialog | Trigger focused | Trigger focus-visible | `My Vault owner` focused/focus-visible | Document focus count |
| ----------------------------------- | ------: | --------------: | --------------------: | -------------------------------------: | -------------------: |
| before Enter                        |       0 |            true |                  true |                                    n/a |                    1 |
| after Enter                         | visible |             n/a |                   n/a |                            true / true |                    1 |
| after Escape plus dialog `detached` |       0 |           false |                 false |                                    n/a |                    0 |

Iteration 2 repeated every value independently. The corrected evidence is therefore truthful: the
dialog closes but focus is not restored and the focus path disappears. P20B is a valid owner for the
final responsive-shell/accessibility sweep; P00 correctly performs no remediation.

### Reflow, zoom, reduced motion, dark media, and contrast

- At `320x720`, viewport/document client/document scroll/body scroll were `320/320/320/320`, so the
  empty-state document had no horizontal overflow and `Open menu` remained visible. The immutable
  revision-01 populated-grid sample separately proved its 1,040px grid remained inside a 270px
  scrolling container.
- At `1280x720` with authorized CSS zoom `200%`, document client/scroll were `1280/1280`, body
  scroll width was 640, and `Add transaction` remained visible. Zoom was reset.
- Under `prefers-reduced-motion: reduce`, the media query matched and three active animations
  remained: 150ms opacity, 150ms transform/opacity/filter, and 500ms transform/opacity/filter. This
  exactly reproduces the corrected evidence's routed red.
- Dark media matched while sampled Add/search foregrounds remained identical to light, confirming
  the inherited routed dark-mode limitation.

| Sample                     | Foreground / composited background |   Ratio | Threshold/result |
| -------------------------- | ---------------------------------- | ------: | ---------------- |
| Add transaction, 14px/500  | `[98,116,142]` / `[251,252,253]`   |  4.64:1 | 4.5:1; pass      |
| Focused search text        | `[2,6,24]` / `[255,255,255]`       | 20.16:1 | 4.5:1; pass      |
| Focused search border/ring | `[15,23,43]` / `[255,255,255]`     | 17.83:1 | 3:1; pass        |
| Saved status               | `[2,6,24]` / `[219,252,231]`       | 18.32:1 | 4.5:1; pass      |

CSS Color 4 values were rasterized to sRGB in-browser. The Add background composites its 30%-alpha
`[242,245,248,77]` muted layer over opaque white, yielding the recorded `[251,252,253]`.

### Console and network

- Console: 0 errors and six copies of the known Radix
  `Missing Description or aria-describedby={undefined} for DialogContent` warning from the three
  mobile menu opens. The evidence truthfully routes this to the responsive shell/P20B.
- Sanitized CLI requests: 12 retained dynamic entries, all terminal HTTP 200, covering WASM,
  register, vault create/list, snapshot, updates, and transaction navigation. No 4xx/5xx or missing
  terminal status occurred. The CLI omitted 142 successful/static-detail entries.
- No headers, bodies, signatures, identifiers, tokens, recovery words, or query contents were opened
  or retained. Query strings and long identifiers were redacted before display.

## Risk and route verdict

The dependency/toolchain mismatch, absent engine/package-manager pins, Playwright revision split,
stale Supabase CLI, unproved RLS/realtime transport, historical migrations, destructive recovery,
future financial engine, large-data performance, misleading future-feature copy, reduced-motion,
mobile-dialog warning, dark limitation, and focus loss remain explicitly routed. None is hidden,
waived, or misrepresented as delivered. The baseline is adequate for P01 to begin after root
performs the required transcription/integration checks.

## Cleanup and final boundary

Before this review file was created:

- HEAD remained the literal reviewed HEAD and staged paths were empty.
- Dirty paths were only root-owned `HANDOFF.md`/`PROGRESS.md`, preserved user-owned scratch, and
  untracked corrected implementation evidence.
- Prior artifacts, corrected evidence, scratch, FS, package, and lock hashes remained exact.
- Product/test/migration/configuration/scratch BASE..HEAD remained empty.
- App readiness remained HTTP 200 and `next-env.d.ts` remained unchanged.
- The session was closed; `delete-data` reported no user data; CLI list reported no browsers.
- Eight exact session YAML/log artifacts were moved to trash; all 23 older artifacts were preserved.
  No disposable CSV or other temporary file was created.

No product, test, migration, task, evidence, prior review, ledger, agent configuration, scratch, or
immutable FS source was edited by this reviewer. No commit was created.

## Questions

No `Q-PROPOSAL-P00-02-*` is needed. Existing authority fully determines the defect routes and the
reversible next step.

## Final verdict

**PASS.** P00 revision 02 is complete, accurate, reproducible, sanitized, and correctly classifies
and routes every observed red. Root must still verify the unchanged reviewed HEAD and write
boundary, persist this review/corrected evidence, transcribe baseline facts and risks, and record
the integration-control commit before assigning package state `passed`.

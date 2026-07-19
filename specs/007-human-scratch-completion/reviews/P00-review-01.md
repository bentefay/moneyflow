# P00 Revision 01 — Independent Review

- **Verdict:** FAIL
- **Package/revision:** `P00/01`
- **Reviewer:** independent `human_scratch_reviewer`
- **Review window:** 2026-07-19T23:58+10:00 through 2026-07-20T00:09:51+10:00
- **Literal BASE:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Literal HEAD:** `0ea864f5d0142530b2d524add228d3b51f162876`
- **Range:** empty; the required first command,
  `git diff --exit-code 0ea864f5d0142530b2d524add228d3b51f162876 0ea864f5d0142530b2d524add228d3b51f162876`,
  exited 0 with no output
- **Frozen implementation evidence:** `evidence/P00/implementation-01.md`, SHA-256
  `73349df979f97d0c4fb4eb7318a81695e794aa5d721d3fe2807934a9321f819c`
- **Sole reviewer write:** this file

The empty product range is reviewable and was not treated as an automatic PASS. Most of the
collector's baseline is accurate and independently reproducible, including its green checks and
known red routes. P00 revision 01 nevertheless fails because its required keyboard/focus baseline
states that closing the mobile menu restored the trigger path, while a deterministic keyboard
reproduction twice left the document with no focused element. This is a material omitted and
contradictory accessibility red under the P00 completeness and accuracy gate.

## Important finding

### I-001 — Mobile menu Escape loses focus, contradicting the frozen baseline

- **Severity:** Medium
- **Category:** Accessibility / baseline accuracy
- **Evidence:** `evidence/P00/implementation-01.md:362`; `tasks/P00-baseline.md:58`

The frozen evidence says: “Escape closed it and restored the menu trigger path.” P00's contract
requires deterministic keyboard/focus evidence. In the review session, the exact keyboard path was:

1. Resize to `320x720` and focus the named button `Open menu`.
2. Verify the trigger is `:focus-visible=true`.
3. Press Enter. The named dialog opens, focus moves to `My Vault owner`, and that control is
   `:focus-visible=true`.
4. Press Escape and wait for the dialog to detach.
5. Query `Open menu`, `:focus`, and `:focus-visible`.

Observed result, reproduced twice: the dialog detached, `Open menu` was neither focused nor
focus-visible, and `page.locator(":focus").count()` returned `0`. The second reproduction began from
an explicitly keyboard-focused trigger and therefore is not explained by pointer focus behavior or
an arbitrary timing wait.

This is a real keyboard accessibility defect and, more importantly for P00, makes the assigned
baseline incomplete/inaccurate. A truthful red baseline may pass, but an unreported or contradictory
red may not. P00 revision 02 must record the exact focus-loss reproduction and route it to the
earliest owning responsive-shell package or P20B. P00 agents must not fix product code.

## Evidence and acceptance audit

| P00 checklist area    | Independent result                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository provenance | HEAD, branch, empty range, ahead/behind state, dirty inventory, evidence path, and no staged paths agree.                                                                                  |
| Frozen scratch        | SHA-256 is exact; 21 ordered blocks are unchecked and byte-equal to normalized SCOPE source lines.                                                                                         |
| Frozen FS source      | SHA-256 `0d0e2a…`, 715 lines, 25,441 bytes, whole-file selector, and no source mutation are exact.                                                                                         |
| Scope/mappings        | Schema 2; 22 declared/actual/unique IDs; 21 HS plus FS-001. Sampled mappings and reverse multi-scope edges agree.                                                                          |
| Tools/services        | App and local REST endpoint returned 200; installed repository Playwright Test/CLI worked; no service was started or stopped.                                                              |
| Quality/test baseline | Current formatting is green after the root-owned ledger correction; lint reproduces exactly 12 warnings/0 errors; typecheck, Vitest, and repeated E2E are green.                           |
| Flake baseline        | The same critical 17-test slice passed three times with retries disabled: 51/51.                                                                                                           |
| Product smoke         | Create/account/settings, People, aliases, automations, manual transactions, CSV import, refresh, and duplicate hydration passed.                                                           |
| Accessibility/UX      | Role/name/state, search/filter keyboard focus, reflow, zoom, reduced motion, dark media, contrast, and known UX reds reproduced; mobile-menu focus restoration did not match the evidence. |
| Console/network       | Zero console errors; six repeated DialogContent description warnings; no 4xx/5xx; one cumulative sync request lacked terminal status.                                                      |
| Risks/questions       | Existing security/privacy/migration/data-loss/financial/performance/UX limitations and ownership routes are reasonable. No new ambiguity needs a Q proposal.                               |

## Independent commands and results

| Command/check                                                                                                                                                                                                | Result                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `git diff --exit-code BASE HEAD`                                                                                                                                                                             | Exit 0; exact empty range.                                                                                      |
| `git rev-parse HEAD`                                                                                                                                                                                         | `0ea864f5d0142530b2d524add228d3b51f162876`.                                                                     |
| `sha256sum` evidence/scratch/FS/package/lock                                                                                                                                                                 | All five hashes exactly match the frozen evidence.                                                              |
| normalized scratch `jq`/`awk`/`diff` audit                                                                                                                                                                   | `blocks=21`, `checked=0`; byte comparison passed.                                                               |
| SCOPE `jq` identity audit                                                                                                                                                                                    | 22 declared, actual, and unique requirements; 21 HS and one whole-file FS selector.                             |
| `pnpm format:check`                                                                                                                                                                                          | Exit 0; 469 files matched. This correctly supersedes the collector's transient root-ledger-only formatting red. |
| `pnpm lint`                                                                                                                                                                                                  | Exit 0; exactly 12 documented unused-variable warnings and no errors.                                           |
| `pnpm typecheck`                                                                                                                                                                                             | Exit 0.                                                                                                         |
| `pnpm test`                                                                                                                                                                                                  | Exit 0; 41/41 files and 1,139/1,139 tests passed.                                                               |
| `pnpm exec playwright test tests/e2e/identity.spec.ts tests/e2e/import.spec.ts tests/e2e/sync-persistence.spec.ts tests/e2e/tab-duplication.spec.ts --retries=0 --repeat-each=3 --workers=4 --reporter=line` | Exit 0; 51/51 passed in 57.1 seconds; no retry-dependent result.                                                |
| app/local REST readiness                                                                                                                                                                                     | HTTP 200/200.                                                                                                   |
| final `git diff --exit-code -- next-env.d.ts`                                                                                                                                                                | Exit 0; the collector's disclosed build side effect remains fully restored.                                     |

I did not rerun `pnpm build` because P00's immutable reviewer boundary grants no product/generated
file restoration write; its known Next side effect changes tracked `next-env.d.ts`. The collector's
build result was instead checked against the unchanged package/lock hashes, unchanged reviewed HEAD,
and its final byte-restoration proof. The independent sample covers formatting, lint, typecheck,
every unit/integration test, and a three-repeat no-retry E2E slice.

## Real headless Playwright CLI review

- **Session:** `p00-review-01-20260720-0002`
- **Tool:** repository-installed `pnpm exec playwright-cli`
- **Mode:** headless, unique, disposable
- **Prohibited routes:** no MCP, `npx`, standalone/ad-hoc browser script, temporary test/config,
  headed/debug/UI/dashboard/show, trace, video, screenshot, PDF, HAR, or storage state
- **Synthetic labels only:** `P00 Review Person`, `P00 Review Alias`, `P00 Review Automation`,
  `P00 Review Transaction`, `P00 Review Imported Coffee`, and `P00 Review Imported Income`; amounts
  `12.34`, `-4.25`, and `25.00`

### Product journey and persistence

1. Marketing loaded with navigation `Global`, links `Unlock`/`Get Started`, an H1, feature cards,
   security content, and footer navigation. It independently reproduced the routed misleading
   `Smart Budgeting`/budget-tracking copy.
2. `Generate Recovery Phrase` produced 12 masked entries. Checking the named acknowledgement changed
   `Create Account` from disabled to enabled; no recovery words were revealed, copied, printed, or
   retained.
3. Account creation reached `/settings`; the snapshot exposed H1 `Vault Settings`, textbox
   `Vault Name`, combobox `Default currency`, status `Saved`, navigation links, and `Lock`.
4. People began with `Me`. `Add Person`, textbox `Enter person's name`, keyboard Enter, and the
   resulting two-person state worked.
5. Tx Descriptions began empty. `P00 Review Alias` was created with keyboard Enter and remained
   after reload.
6. Automations began empty. `P00 Review Automation` was created and rendered with `No conditions`
   and `No actions`.
7. Transactions began empty. `Add transaction` reproduced the current tick/submit-and-Cancel row
   explicitly routed to P13. A `12.34` transaction was created successfully.
8. A disposable synthetic CSV previewed 2 total/valid, 0 errors, 0 duplicates, and 0 old rows.
   `Import 2 Transactions` succeeded and rendered `25.00` and `-4.25` alongside the manual row.
9. After status `Saved`, reload retained the imported value and all three rows.
10. An opener-created native-semantics duplicate reached `/transactions`, retained the imported
    value, and displayed status `Saved` without a sleep.

One diagnostic call used the CLI alpha surface's unsupported `page.getByDisplayValue`, returned a
TypeError, and was immediately superseded by a deterministic exact input-value locator. It did not
represent a page console error or product failure.

### Deterministic accessibility and UX matrix

| Area                      | Expected                                                                  | Observed                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop roles/names/state | Named navigation, transaction controls, grid/rows, selection, sync state  | Present; status exposed `Saved`; rows and controls had deterministic names.                                                                                                            |
| Search keyboard focus     | Search focus visible; Tab reaches `All time`; Shift+Tab returns           | Passed with `:focus-visible=true` at all three observations.                                                                                                                           |
| Mobile dialog entry       | `Open menu` keyboard activation opens named dialog and moves focus within | Passed; Enter opened dialog, `My Vault owner` became focus-visible.                                                                                                                    |
| Mobile dialog exit        | Escape closes and returns focus to `Open menu`                            | **Failed twice; dialog detached and no element remained focused.**                                                                                                                     |
| 320px reflow              | No document horizontal overflow; wide grid remains internally scrollable  | Passed: viewport/client/document/body `320/320/320/320`; grid client/scroll `270/1040`.                                                                                                |
| 200% zoom                 | No document overflow; controls remain exposed                             | Passed: zoom `200%`, document client/scroll `1280/1280`, body scroll 640; Add transaction and the accessible grid remained present.                                                    |
| Reduced motion            | Media query true and significant motion suppressed                        | Reproduced red: five animations remained: three 150ms color/opacity transitions, one 150ms transform/opacity/filter animation, and one 500ms transform/opacity/filter sheet animation. |
| OS dark media             | Query true and product response recorded                                  | Query became true; sampled add/search colors were unchanged from light. This confirms the collector's routed limitation rather than dark-mode delivery.                                |

### Contrast evidence

CSS Color 4 values were independently rasterized to sRGB with browser canvas and WCAG relative
luminance was calculated. The Add transaction background includes a 30%-alpha muted layer over the
white body, so the actual composited background is recorded rather than treating that translucent
layer as opaque.

| Control/state                 | Foreground / composited background |   Ratio | Threshold/result        |
| ----------------------------- | ---------------------------------- | ------: | ----------------------- |
| `Add transaction`, 14px/500   | `[98,116,142]` / `[251,252,253]`   |  4.64:1 | 4.5:1 normal text; pass |
| Focused search text, 14px/400 | `[2,6,24]` / `[255,255,255]`       | 20.16:1 | 4.5:1 normal text; pass |
| Focused search border/ring    | `[15,23,43]` / `[255,255,255]`     | 17.83:1 | 3:1 focus/UI; pass      |
| `Saved` status, 14px/400      | `[2,6,24]` / `[219,252,231]`       | 18.32:1 | 4.5:1 normal text; pass |

The collector's simpler 4.76:1 Add transaction calculation against opaque white and the more exact
4.64:1 composited result both pass, so that numerical refinement is not a finding.

### Console and network

- `console error`: 0 errors.
- `console warning`: six copies of Radix's
  `Missing Description or aria-describedby={undefined} for DialogContent`, reproduced on mobile menu
  opens and correctly routed by the collector.
- Sanitized dynamic requests: 28 entries shown by the CLI, 27 with HTTP 200 and one cumulative
  `sync.pushOps` entry with no terminal status during navigation. No 4xx/5xx response appeared;
  later `Saved` and successful sync responses prevent overclaiming a network failure.
- The CLI omitted 232 static requests. No request header, body, token, signature, recovery phrase,
  long identifier, or query content was opened or retained. Query strings and long IDs were redacted
  before terminal display.

## `.claude`, security, data, performance, and test audit

The no-code range introduces no implementation to assess against coding/TypeScript/component/CRDT/
crypto/import/sync/tRPC patterns. The review followed the repository E2E authority: installed CLI,
role-first selectors where exposed, no arbitrary wait in accepted evidence, no hidden retry,
refresh, duplicate hydration, console/request inspection, and session cleanup. The repeated E2E
slice covers meaningful identity, import, persistence, and duplicate-tab journeys.

The collector correctly avoids claiming security, RLS/realtime authorization, migration history,
financial settlement, large-data performance, destructive recovery, or multi-user delivery from this
small local smoke. Those limitations and routes are evidence-backed. Synthetic encrypted records may
remain in the normal local development backend, but no browser secret/profile state or real
financial data remains. The newly found focus red is a product accessibility risk routed for a later
owning package; it does not authorize a P00 product fix.

## Write boundary and cleanup

Before this review file was created:

- HEAD remained the literal reviewed HEAD;
- staged paths were empty;
- root-owned `HANDOFF.md` and `PROGRESS.md`, preserved `specs/human-scratch.md`, and the frozen
  untracked implementation evidence were the only dirty/untracked paths;
- `next-env.d.ts` had no diff;
- evidence, source, package, and lock hashes remained exact;
- app readiness remained HTTP 200;
- `playwright-cli list` reported no browsers;
- the review session was closed and `delete-data` reported no retained user-data directory;
- all 28 exact `T14-*` session YAML/log artifacts were moved to trash; the 23 older pre-existing
  `.playwright-cli` artifacts were preserved; and
- the exact disposable CSV was deleted.

No product, test, migration, task, evidence, agent configuration, global ledger, scratch marker, or
immutable FS source was edited by this reviewer. No commit was created.

## Questions

No `Q-PROPOSAL-P00-01-*` is needed. The task and PROCESS already decide the safe route: preserve the
red as baseline evidence and route ownership without pausing or changing product in P00.

## Final verdict

**FAIL.** The exact empty range is valid and the large majority of the baseline is accurate, but P00
revision 01 does not satisfy the complete/accurate accessibility evidence gate. Preserve this review
immutably and repeat P00 with revision 02 evidence and a new independent review after the
mobile-menu focus-loss red is explicitly recorded and routed.

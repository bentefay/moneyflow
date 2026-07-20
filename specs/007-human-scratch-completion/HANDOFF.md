# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P09 / 01
- **Scope IDs:** HS-006
- **State:** changes_requested; revision-01 evidence/review immutable after root integration
- **Task:** `tasks/HS-006-undo-redo.md`
- **Dependencies:** P01 passed; P09 is independent of the blocked P05/P08/P10 branch
- **Original package BASE:** `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`
- **Pre-implementation HEAD:** `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`
- **Range meaning:** first P09 implementation range; review must cover literal original BASE through
  the implementer's committed HEAD
- **Allowed implementation paths:** `src/lib/crdt/**`; `src/lib/sync/**` only where required to
  classify local versus remote/hydration/migration/GC origins; `src/components/providers/vault-provider.tsx`;
  `src/components/features/undo/**`; `src/app/(app)/layout.tsx`; existing mutation call sites under
  `src/app/(app)/imports/**`, `src/app/(app)/transactions/**`, and
  `src/components/features/{accounts,automations,description-aliases,import,people,statuses,tags,transactions,vault}/**`
  only where required to define one logical user-action boundary; focused new or modified tests under
  `tests/unit/**`, `tests/integration/**`, `tests/e2e/**`, and `tests/e2e/helpers/**`. Do not edit
  dependencies, migrations, server/database/auth/crypto/realtime code, global ledgers, prior artifacts,
  review files, scratch, FS-001, SCOPE, `.claude`, `.codex`, or agent configuration.
- **Sole implementer artifact:** `evidence/P09/implementation-01.md`
- **Future immutable review artifact:** `reviews/P09-review-01.md`
- **Commit contract:** inspect first, change only the narrow authorized subset actually needed, stage
  exact paths only, commit product/test changes with a message containing no parentheses, and leave the
  assigned evidence uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  frozen untracked `evidence/P09/implementation-01.md`; no staged, product/test or other dirty path
- **Required architecture:** one standard Loro `UndoManager` follows the active document/vault
  lifecycle; expose reactive `canUndo`/`canRedo` and typed action-boundary/origin APIs. Define and test
  user, remote, hydration, sync, migration and maintenance origins before UI wiring. Remote/hydration/
  sync/migration/GC commits must never enter local user history, and vault switch/strict-mode remount
  must dispose listeners/managers and reset history.
- **Required grouping:** one logical add/edit/delete/import/bulk/alias action is one undo step even
  when it spans several mirror actions; undo/redo itself must sync as a resulting local CRDT change.
  New user edits clear redo. Do not conflate existing automation domain-history records with the
  document UndoManager.
- **Required UX:** visible semantic Undo and Redo buttons in the authenticated shell, truthful disabled
  states, accessible names, discoverable tooltips, focus treatment, responsive/collapsed/mobile/dark/
  reduced-motion behavior. Implement Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y plus conventional Meta equivalents,
  without stealing native undo/redo from editable inputs, textareas or contenteditable controls.
- **Required validation:** trace the installed Loro/loro-mirror API from repository packages; focused
  unit/integration tests for lifecycle, grouping/origin filters, redo clearing, input guards, vault switch
  and remote exclusion; meaningful journey E2E for buttons and every shortcut across representative
  add/edit/delete/import/alias behavior, concurrency/second client and refresh. Run focused checks, then
  all repository checks required by `.claude/CLAUDE.md`; repeat changed E2E with retries disabled and
  record exact results, including any inherited red without hiding it.
- **Manual evidence:** use only repository-installed headless `pnpm exec playwright-cli` in unique
  disposable sessions. Exercise pointer/keyboard/focus, native text editing, two sessions/duplicate tab,
  vault switch, refresh and offline/reconnect; inspect responsive/dark/reduced-motion, deterministic
  accessible role/name/state snapshots, zoom/reflow, applicable computed contrast, console and requests.
  Close/delete sessions and remove generated CLI artifacts. No Playwright MCP, `npx`, ad-hoc script or
  temporary test/config, headed/debug/UI/show mode, sleeps, retries, or test-only product hook.
- **Evidence contract:** record package/revision, literal BASE and HEAD, commits, exact changed and dirty
  paths, acceptance mapping, installed API reasoning, commands/results, manual evidence, cleanup, risks,
  source-integrity results and complete Q proposals. Do not claim PASS. If ambiguity remains, apply the
  PROCESS hierarchy, choose the safest reversible behavior, write a complete Q proposal and continue.
- **Boundary checks:** exact HEAD/index/status; scratch SHA
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578` with exactly the authorized
  checked set HS-002/HS-010/HS-014/HS-017/HS-018 and all 21 normalized blocks; immutable FS-001 SHA
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes; SCOPE
  SHA `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`; do not edit SCOPE.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`
- **Literal reviewed HEAD:** `af06fb2ad32fe292aef15a011c2040cb54cf5dfa`
- **Range type:** non-empty first implementation range containing exactly ten authorized product/test
  paths
- **Implementation evidence:** `evidence/P09/implementation-01.md`, SHA-256
  `6c6ece5aa7947243291f2d5202338a937c4b219b99a3bbfce7a00428170db20c`, 172 lines/12,346 bytes
- **Sole reviewer artifact:** `reviews/P09-review-01.md`
- **Review SHA-256:** `5ecd94f8f95009a3108057996adbb318b563eda6b832c7bfe537a5bf221c6a09`,
  202 lines/16,444 bytes
- **Verdict:** FAIL — F-01 logical text edits split per input event; F-02 failed offline push is not
  retried after reconnect and remains `Sync error`
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently audit the full literal BASE..HEAD, installed Loro
  API/lifecycle/origins/grouping, every acceptance criterion, meaningful no-retry automated coverage and
  the complete manual CLI charter. Reject remote/hydration history, split logical actions, native-input
  shortcut theft, listener leaks, stale history after vault switch, inaccessible/misleading controls,
  weak selectors, sleeps/retries/test hooks, unapproved paths or inaccurate evidence. Independently
  adjudicate complete proposal `Q-PROPOSAL-P09-01-01`; verify inherited format-red classification,
  exact paths/index/write boundary, cleanup, scratch/21 blocks, FS-001 and SCOPE.

## Next root action

Persist the immutable revision-01 evidence/review with Q-015 and R-028/R-029 transcription, then
rewrite HANDOFF for P09 revision 02. Re-review must cover original BASE through the newest HEAD and
use exact new artifacts `evidence/P09/implementation-02.md` and `reviews/P09-review-02.md`.

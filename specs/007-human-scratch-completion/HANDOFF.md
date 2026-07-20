# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P09 / 02
- **Scope IDs:** HS-006
- **State:** passed in `59bf82e894e45e034858e25255240701a3afb0b8`; HS-006 marker finalized
- **Task:** `tasks/HS-006-undo-redo.md`
- **Prior immutable failure:** `evidence/P09/implementation-01.md` and
  `reviews/P09-review-01.md`, integrated in `74bbc7167d09fe54dff48fe7df26886f0923bdd6`;
  never edit or overwrite them
- **Original package BASE:** `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`
- **Revision-01 product HEAD:** `af06fb2ad32fe292aef15a011c2040cb54cf5dfa`
- **Pre-implementation HEAD:** `54a9f28e1c272ada62bea52f46b587f206d3057f`
- **Range meaning:** revision 02 preserves the revision-01 work and remediates both independent
  findings. Re-review must cover the original P09 BASE through the newest committed HEAD, including
  intervening immutable control history.
- **Allowed implementation paths:** `src/lib/crdt/undo.tsx`; `src/lib/crdt/context.tsx` only if the
  typed edit-session API requires it; `src/components/features/vault/VaultSettingsForm.tsx`;
  `src/lib/sync/manager.ts`; `tests/unit/crdt/undo.test.tsx`; focused files under
  `tests/unit/sync/**`; `tests/integration/sync-offline.test.ts`; and
  `tests/e2e/undo-redo.spec.ts`. Change only the narrow subset needed. Do not edit any other product,
  test, dependency, config, migration, server/database/auth/crypto/realtime, global ledger, prior
  evidence/review, scratch, FS-001, SCOPE, `.claude`, `.codex` or agent path.
- **Sole implementer artifact:** `evidence/P09/implementation-02.md`
- **Future immutable review artifact:** `reviews/P09-review-02.md`
- **Commit contract:** stage exact authorized product/test paths only, commit remediation with a
  message containing no parentheses, and leave the assigned evidence uncommitted. Never use
  `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  frozen untracked `evidence/P09/implementation-02.md`; no staged, executable or other dirty path
- **F-01 required remediation:** replace per-microtask grouping for autosaved controlled edits with
  an explicit typed logical edit-session boundary. Sequential keyboard/paste/native-undo input events
  from focus through commit/blur must remain immediate CRDT/IndexedDB writes but form one document
  undo step. One global Undo after blur restores the exact pre-edit CRDT value and one Redo restores
  the complete edited value. Close safely on blur/commit/cancel/unmount/vault replacement and when a
  different edit begins; never merge unrelated fields/actions. Preserve synchronous bulk/import/alias
  grouping and editable-target shortcut guards. Do not use an arbitrary time window.
- **F-01 regression:** focused unit/component coverage must drive several separate event turns and
  prove session lifecycle, native input interaction, one Undo/Redo step, unrelated action separation
  and cleanup. Real E2E must type characters sequentially into the autosaved Vault Name field, use
  native Ctrl/Meta undo while focused, blur, then prove one global Undo/Redo restores the complete
  before/after values. `fill()` or an Enter-commit-only field is insufficient.
- **F-02 required remediation:** when a throttled `sync.pushOps` attempt fails offline, a genuine
  browser reconnect must automatically retry locally durable `pushed:false` operations without
  another mutation, reload, focus-only substitute or test hook. Use the actual SyncManager owner and
  browser `online` lifecycle; prevent concurrent/duplicate retry, preserve throttle/durable ordering,
  state transitions and cleanup of listeners on disconnect/strict remount. Do not add infinite retry,
  sleeps or weaken errors.
- **F-02 regression:** focused unit/integration coverage must force a real failed push, dispatch the
  reconnect lifecycle event, and prove exact retry/idempotence/listener cleanup. A no-retry real E2E
  journey must stay offline long enough for the scheduled push to fail, perform a local edit and Undo,
  reconnect without further mutation/reload, observe successful `sync.pushOps`, truthful saved status
  and peer/server durability of the resulting operations. Retain online peer exclusion/undo propagation.
- **Validation:** rerun focused tests, typecheck, lint, full Vitest, full E2E with retries disabled and
  changed E2E repeated with retries disabled. Diagnose every red and retain the exact inherited-format
  classification. Use only repository-installed headless `playwright-cli` for independent real-app
  manual evidence covering both findings plus the original task matrix; record deterministic role/name/
  state, native input, remote/local, offline/reconnect, responsive/dark/reduced-motion, 200% reflow,
  contrast, console and requests. Close/delete sessions, stop servers and restore generated files.
- **Evidence contract:** record exact BASE/pre-HEAD/new HEAD, commits/paths/index, counterfactual and
  fixed results for F-01/F-02, acceptance mapping, commands/results, sanitized manual request/state
  evidence, cleanup, risks and frozen-source checks. Do not claim PASS. Any ambiguity becomes a complete
  Q proposal under PROCESS; Q-015 already decides Meta+Y parity and should not be duplicated.
- **Boundary checks:** exact HEAD/index/status; scratch SHA
  `753be6b73d1086a35659e1416d9f6c183e61107c72a91aeaa55a13344bf96578`, checked set
  HS-002/HS-010/HS-014/HS-017/HS-018 and all 21 normalized blocks; FS-001 SHA
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes; SCOPE
  SHA `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `c9146fae2c5534313d21b4f34cb2b012eaeeb4ed`
- **Literal reviewed HEAD:** `418234e28ac649e03ce8ad184d08a8a2f2416149`
- **Range type:** cumulative original P09 BASE through revision-01 product, immutable failure/control
  commits and revision-02 remediation
- **Implementation evidence:** `evidence/P09/implementation-02.md`, SHA-256
  `ea8a779eedae9c4520edf37e01164db70c49ddd8d0b8ae8b6846c7d590b693cb`, 220 lines/16,189 bytes
- **Sole reviewer artifact:** `reviews/P09-review-02.md`
- **Review SHA-256:** `610d0853632ec2596d60011133827971c982b39f1a6e8800ba9d54b9badf2966`,
  214 lines/17,759 bytes
- **Verdict:** PASS with no finding or new Q; Q-015 remains accepted
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently reproduce revision-01 F-01/F-02, audit the complete
  original BASE through exact newest HEAD, then prove both counterfactuals are closed without
  regressing every previously sound P09 acceptance. Independently verify the typed edit-session
  lifecycle/separation/immediate updates, real offline failed-push online retry/single-flight/state/
  cleanup, focused and full no-retry automation, exact causal installed-CLI request sequence, Q-015,
  inherited format classification, write boundary/cleanup, scratch/21 blocks, FS-001 and SCOPE.

## Next root action

Verify the clean post-marker boundary and rewrite HANDOFF for dependency-ready P11A. No further P09
product, artifact or marker edit is authorized.

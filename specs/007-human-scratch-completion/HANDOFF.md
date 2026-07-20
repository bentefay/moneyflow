# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P11C / 02
- **Scope IDs:** HS-004 integrated-behavior/performance checkpoint only; P11A/04 and P11B/01 passed;
  P11C/01 failed only F-01; HS-004 remains incomplete and unchecked
- **State:** changes_requested; revision-01 evidence/review/F-01 are immutable in
  `dd77d518fff81e4c5553ce9a559681ece8f30232`
- **Task:** `tasks/HS-004-description-aliases.md`, complete frozen 72-line HS-004 block in SCOPE,
  P11C acceptance only
- **Dependencies:** P11B/01 PASS is immutable; P11C remains independent of blocked P05/P08/P10
- **Original package BASE:** `0426866fa66cc022efca6d74cd5088d586d3d11b`
- **Revision-02 pre-implementation HEAD:** `8856951cf4d4428b4c15cda814b74a3da81bcbba`
- **Range meaning:** cumulative P11C remediation range; independent review must cover the original
  literal BASE through the new revision-02 committed HEAD and preserve revision-01 work/artifacts
- **Allowed implementation paths:** `src/lib/crdt/context.tsx` narrowly to provide a legal alias
  selector/snapshot whose identity is stable across unrelated Mirror notifications;
  `src/lib/domain/description-aliases.ts` narrowly for a conversion/cache primitive genuinely keyed
  to unchanged raw alias identity/revision without rescanning first;
  `src/components/features/description-aliases/useDescriptionAliasLookup.ts` narrowly if the lookup
  lifecycle needs compatible stable-input handling; `src/app/(app)/transactions/page.tsx` only if an
  actual-context counterexample proves a dependent memo still churns after selector correction; and
  focused existing/new tests under `tests/unit/components/**`, `tests/unit/domain/**`,
  `tests/unit/crdt/**` or `tests/integration/**` for the required real-provider lifecycle proof.
  Existing P11C E2E files may be modified only if needed to strengthen the same production lifecycle
  assertion; otherwise rerun them unchanged. Do not change transaction/management/cell interaction,
  virtualization, schema/defaults/migration/mirror/sync/transport/server/database/auth/crypto/
  realtime, dependencies/config or unrelated product/tests. Any concrete need outside this list
  requires root authority before editing. Never edit global ledgers, prior evidence/reviews, scratch,
  FS-001, SCOPE, `.claude`, `.codex` or agent configuration.
- **Sole implementer artifact:** `evidence/P11C/implementation-02.md`
- **Future immutable review artifact:** `reviews/P11C-review-02.md`
- **Commit contract:** inspect first, change only the narrow authorized subset actually needed,
  stage exact paths only, commit product/test changes with a message containing no parentheses, and
  leave the evidence uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  frozen untracked `evidence/P11C/implementation-02.md`; no staged, product, executable, generated or
  other dirty path
- **Revision-02 F-01 correction:** preserve one legal alias-collection identity and one
  `DescriptionAliasLookup` identity while raw aliases have not changed. An unrelated local
  transaction action, remote/import-style notification or other non-alias store emission must cause
  zero full alias conversions, zero index builds, stable lookup identity and no dependent alias-option
  recomputation. Do not merely intern the final lookup after rescanning/reconverting every raw alias.
  One actual alias mutation must cause exactly one conversion/build and expose correct legal
  resolution, Q-016 exact options and total group counts.
- **Public/legal boundary:** keep raw wire alias states internal as P11A requires; never re-expose raw
  unions, recovery names or generic write access to application consumers. Stable caching may key on
  a genuinely stable raw alias identity/revision, but must not miss local, remote, hydration, repair,
  undo or redo alias changes. Retain deterministic Q-017 repair, one-hop legality, backlinks, atomic
  named actions, persistence failure recovery and one canonical legal live notification.
- **Actual-context acceptance:** mount the real `VaultProvider`, `useDescriptionAliases()` and
  `useDescriptionAliasLookup()` over a large legal graph. Capture legal collection/lookup identity
  and instrument conversion/build/dependent-option counts. Perform repeated production transaction
  edits/actions plus at least one subscribed remote/import-style non-alias update: prove identities
  stable and every count remains zero. Mutate aliases locally and remotely, including undo/redo where
  applicable: prove exactly one build per alias-bearing notification and correct visible/selectable/
  count state. A plain prop rerender, pure helper benchmark or mocked selector is insufficient.
- **Retained P11C gates:** keep the revision-01 shared lookup's O(1) reads, active-cell-only suggestion
  filtering, zero rest/focus-only listboxes/options, at-most-one focused virtual-row pin and all
  10,000/2,000/500 scale bounds. Preserve every management/import/manual/exact/new/single/shared/
  change/remove refresh/undo/redo/two-peer/offline behavior, manual raw privacy and P11B caret/
  keyboard/modal/tooltip contract. Retain the removed blur-pin handler; do not reintroduce the proven
  T014a calendar regression.
- **Required automation:** first add a red actual-context counterexample for F-01, then prove the
  corrected lifecycle at large scale for repeated local and remote non-alias notifications and one
  alias notification. Repeat focused P11C tests three times; run full Vitest, typecheck, lint, build,
  scoped format and every repository check required by `.claude/CLAUDE.md`. Repeat changed alias and
  large virtualization E2E at least three times with retries disabled and run full no-retry E2E,
  reporting T021c or any other red exactly. Preserve all prior regression matrices.
- **Validation/manual charter:** use repository-installed headless `playwright-cli` in a disposable
  session to seed a large real alias/transaction surface and measure the production selector/index
  lifecycle across unrelated transaction edits, import/remote-style update and an alias mutation;
  helper-only render timings do not close F-01. Recheck management/transaction refresh/history,
  active-cell lazy surface, virtual focus, duplicate/live-tab behavior where the tool can preserve
  auth, manual plaintext absence, console/network, responsive/dark/reduced-motion/200% state. Record
  sanitized evidence and cleanup browsers/data/processes/generated files; restore `next-env.d.ts`.
- **Evidence contract:** record exact cumulative BASE/new HEAD, revision commits/paths/index, the red
  F-01 counterfactual, actual-context architecture and conversion/build/identity measurements,
  retained acceptance mapping, commands/results/repeats, sanitized manual evidence, inherited reds,
  cleanup, risks, frozen checks and complete Q proposals. Do not claim PASS.
- **Boundary checks:** scratch SHA
  `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, authorized checked set
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018 and all 21 normalized blocks; FS-001 SHA
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes; SCOPE
  SHA `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `0426866fa66cc022efca6d74cd5088d586d3d11b`
- **Literal reviewed HEAD:** `258f22af06c8a00b00d09f30c33f85f82377bc13`
- **Range type:** cumulative P11C range from original BASE through revision-02 HEAD
- **Implementation evidence:** `evidence/P11C/implementation-02.md`, SHA-256
  `b1327d9cf6cc5b04ecc887fc5b8a545cbe4b5fa8834da709f52111c7c5be8e94`, 172 lines/13,015 bytes
- **Sole reviewer artifact:** `reviews/P11C-review-02.md`
- **Review SHA-256:** `429c844eb96ae9a186cec0b6c56b1ff1700eba619c0849a4b42df70a16c5205b`,
  175 lines/13,372 bytes
- **Verdict:** FAIL — revision 02 closes continuously mounted churn, but F-01 proves the observer is
  removed at zero alias consumers while stale revision/cache survive, so alias changes in the gap are
  missed and SPA remount renders stale data until hard reload
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently review the full cumulative range and reproduce F-01 through
  the actual provider/hooks with large aliases and real local/remote non-alias notifications; reject
  post-rescan caching, raw-boundary reopening, missed alias-bearing notifications or helper-only proof.
  Retain every revision-01 green interaction/concurrency/privacy/scale gate, honest no-retry suite,
  cleanup, exact boundaries, all 21 blocks and frozen source hashes.

## Next root action

Persist the exact revision-02 evidence/review, FAIL state and R-008 transcription, then dispatch P11C
revision 03 with cumulative review from the original BASE. HS-004 remains unchecked.

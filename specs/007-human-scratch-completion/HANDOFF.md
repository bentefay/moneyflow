# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P11C / 01
- **Scope IDs:** HS-004 integrated-behavior/performance checkpoint only; P11A/04 and P11B/01 passed;
  HS-004 remains incomplete and unchecked until this package independently passes
- **State:** changes_requested; F-01 must be remediated in revision 02
- **Task:** `tasks/HS-004-description-aliases.md`, complete frozen 72-line HS-004 block in SCOPE,
  P11C acceptance only
- **Dependencies:** P11B/01 PASS evidence/review are immutable in
  `0426866fa66cc022efca6d74cd5088d586d3d11b`; P11C is independent of the blocked P05/P08/P10 branch
- **Original package BASE / pre-implementation HEAD:**
  `0426866fa66cc022efca6d74cd5088d586d3d11b`
- **Range meaning:** first P11C implementation range; independent review must cover this literal BASE
  through the implementer's committed HEAD
- **Allowed implementation paths:** existing alias product surfaces
  `src/app/(app)/tx-descriptions/page.tsx`,
  `src/components/features/description-aliases/DescriptionAliasesTable.tsx`,
  `src/components/features/description-aliases/DescriptionAliasChangeModal.tsx`,
  `src/components/features/description-aliases/descriptionAliasInteraction.ts`,
  `src/components/features/transactions/TransactionTable.tsx`,
  `src/components/features/transactions/TransactionRow.tsx`,
  `src/components/features/transactions/cells/InlineEditableDescriptionAlias.tsx`, and
  `src/app/(app)/transactions/page.tsx`; `src/app/(app)/imports/new/page.tsx` narrowly if the frozen
  import path requires named atomic alias association while preserving immutable raw descriptions;
  `src/lib/crdt/description-aliases.ts`, `src/lib/crdt/context.tsx` and
  `src/lib/domain/description-aliases.ts` narrowly for integrated consistency, stable memoizable
  lookup structures or typed concurrency handling; focused new helpers under those same feature/
  domain directories; focused tests under `tests/unit/components/**`, `tests/unit/domain/**`,
  `tests/unit/transactions/**`, `tests/integration/**`; and existing/new P11C journeys under
  `tests/e2e/description-aliases*.spec.ts`, with narrow additions to `tests/e2e/import*.spec.ts`,
  `tests/e2e/transactions.spec.ts` or `tests/e2e/tab-duplication.spec.ts` only when required to prove
  the named import, virtualized-list or duplicate-tab contracts. Preserve all P11A/P11B production
  behavior; do not edit schema/defaults/migration/mirror/sync/transport/server/database/auth/crypto/
  realtime, dependencies/config or unrelated product/tests unless a concrete failure is reproduced
  and root first records narrower authority. Do not edit global ledgers, prior evidence/reviews,
  scratch, FS-001, SCOPE, `.claude`, `.codex` or agent configuration.
- **Sole implementer artifact:** `evidence/P11C/implementation-01.md`
- **Future immutable review artifact:** `reviews/P11C-review-01.md`
- **Commit contract:** inspect first, change only the narrow authorized subset actually needed,
  stage exact paths only, commit product/test changes with a message containing no parentheses, and
  leave the evidence uncommitted. Never use `git add .` or `git add -A`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md` only;
  no staged, product, executable, generated or other dirty path
- **Integrated-consistency contract:** management create/rename/delete and every imported/manual,
  exact/new, first/single/shared, change-one/change-all and remove-one/remove-all path must preserve
  the legal P11A graph and exact visible P11B behavior after hard refresh, one undo, one redo,
  duplicate tabs and causally concurrent edits. Imported raw descriptions stay immutable; manual
  rows retain no raw/import provenance; every logical local choice stays one action/Undo step/server
  operation where P11A/P11B require it. No stale name, blank valid display, dangling backlink,
  symlink chain, lost transaction, duplicate alias, silent last-writer data loss or illegal live
  intermediate state may be exposed.
- **Concurrency contract:** exercise two live tabs/peers for management rename/delete against cell
  exact/new/change/remove operations, including shared change-all and undo/redo around remote work.
  User undo must never undo remote work. Apply PROCESS decision hierarchy to genuine unspecified
  destructive conflicts, choose the smallest reversible data-preserving outcome, write a complete
  Q proposal and continue. Do not weaken the P11A isolated-repair/single-legal-notification boundary.
- **Refresh/import/manual contract:** prove current imported exact, partial and duplicate raw cases,
  manually added alias-only rows, management CRUD and transaction edits survive persistence/reload;
  exact matching follows Q-016 normalization. Validate transaction deletion and later management
  deletion conservation where touched. Inspect encrypted outbound operations so raw manual text is
  absent and immutable imported raw text is neither overwritten nor repurposed as an alias name.
- **Virtualized performance contract:** derive active aliases/final real lookup and per-row resolved
  state through stable reused/memoized structures rather than per-row whole-map scans or rebuilding
  equivalent maps. The combobox/listbox/portal must not mount for every virtual row: only the active
  hovered/focused/edited cell may mount its interactive suggestion surface. Preserve virtual-row
  focus/caret when scrolling and recycling. Prove bounded mounted row/control counts and large alias/
  transaction behavior with explicit datasets and measurements; report numbers honestly rather than
  substituting a helper microbenchmark for the rendered path.
- **Retained interaction gates:** keep one-click clicked-character caret placement; always-visible
  legal text; lazy/no-default suggestions; Down/Up/Enter/Escape and closed-grid arrow handoff; exact/
  novel/first/single seamless commits; exact shared modal copy/default/trap/cancel/restoration; shadcn
  provenance tooltip only when raw differs; and no manual raw value. Preserve P11A typed no-write
  errors, atomic bookkeeping, one-hop resolution, public raw-wire exclusion, hydration repair,
  persistence failure recovery and one canonical legal live notification.
- **Required automation:** extend unit/component coverage for stable lookup identity, bounded lookup
  work and lazy mounted controls across large virtual data. Integration must exercise real named
  actions, Loro UndoManager, persistence/export/reopen, two peers and large alias maps for the full
  integrated matrix. E2E must cover management plus imported/manual/exact/new/single/shared/change/
  remove flows through refresh, undo/redo and duplicate/concurrent tabs, plus virtual scrolling/focus/
  lazy mounts at scale. Repeat all changed E2E at least three times with retries disabled, retain all
  P11A/P11B regression gates and run every repository check required by `.claude/CLAUDE.md`. Report
  every inherited red exactly; never hide it with retry, wait inflation or narrowed assertions.
- **Validation/manual charter:** use only repository-installed headless `playwright-cli` in disposable
  sessions. Seed exact/partial/duplicate imported descriptions, alias-only manual rows, one-use/shared
  real aliases and symlinks plus a large virtualized dataset. Exercise management and all cell/modal
  choices with pointer/keyboard, refresh, undo/redo, duplicate tabs, causally concurrent rename/
  delete/change-all/remove, offline/reconnect and virtual scroll/recycling. Inspect accessible role/
  name/state, focus/caret, desktop/mobile, dark/reduced-motion/200% reflow, console/network, operation
  count and manual raw plaintext absence. Record sanitized measurements and cleanup; close browsers,
  delete session data, stop task processes, remove generated artifacts and restore `next-env.d.ts`.
- **Evidence contract:** record exact BASE/HEAD, commits/paths/index, integrated state/concurrency
  matrices, acceptance mapping, counterfactuals, commands/results/repeat counts, datasets and measured
  performance/mount/lookup numbers, sanitized manual evidence, inherited reds, cleanup, risks, frozen
  checks and complete Q proposals. Do not claim PASS.
- **Boundary checks:** scratch SHA
  `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, authorized checked set
  HS-002/HS-006/HS-010/HS-014/HS-017/HS-018 and all 21 normalized blocks; FS-001 SHA
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines/25,441 bytes; SCOPE
  SHA `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines/27,382 bytes.

## Review dispatch

- **Reviewer:** distinct `human_scratch_reviewer`
- **Literal reviewed BASE:** `0426866fa66cc022efca6d74cd5088d586d3d11b`
- **Literal reviewed HEAD:** `dd0727f3562d4a9e40669d6d64109174690286a1`
- **Range type:** first P11C implementation range
- **Implementation evidence:** `evidence/P11C/implementation-01.md`, SHA-256
  `b3f65574606ca0584c03dab3ecba840528fd139b6b521070394d29f56bf1f7c7`, 256 lines/21,694 bytes
- **Sole reviewer artifact:** `reviews/P11C-review-01.md`
- **Review SHA-256:** `4c517fbfaae100ee5ae10addf5a60580e38298075dd2645826214403ce98521b`,
  184 lines/14,279 bytes
- **Verdict:** FAIL — F-01 proves every unrelated Mirror notification reallocates the complete legal
  alias collection and rebuilds the whole lookup plus dependent options/row maps; helper-only identity
  evidence does not satisfy the production stable-reuse contract
- **Reviewer writes:** review file only; no other writes or commits
- **Required review focus:** independently audit the literal integrated range and full frozen HS-004
  source; reproduce refresh/undo/redo/duplicate/concurrent behavior across the complete management/
  import/manual/single/shared/change/remove matrix; inspect real virtualization, stable reused lookup
  structures and lazy mount counts at scale; preserve every P11A/P11B invariant/interaction/privacy
  gate; verify honest full-suite results, cleanup, exact boundaries, all 21 blocks and source hashes.
  Reject narrow helper-only performance, fake peers, retry-masked E2E, hidden stale UI, raw manual
  leakage, remote undo, partial writes or any completion claim that omits a required path.

## Next root action

Revision-01 evidence/review, FAIL state and R-008 transcription are immutable in
`dd77d518fff81e4c5553ce9a559681ece8f30232`; dispatch P11C revision 02 with cumulative review from
the original BASE through its new HEAD. Do not mark HS-004 or edit scratch before exact PASS and the
root marker gate.

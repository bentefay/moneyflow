# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P02 / 01
- **Scope IDs:** HS-017; no scratch marker until independent package PASS and root integration
- **State:** changes_requested after immutable `reviews/P02-review-01.md` FAIL; evidence SHA-256
  `0806cf0cf3918fb56103833c5d61812cdb4465cbe3a7ea69e2f048d1afdead36`; review SHA-256
  `2ef03fd7a06459ca5483d5bd9004cf59d54077474e2185bcb5c69391a17e35cf`; artifact integration in
  progress
- **Task:** `tasks/HS-017-animate-ui-evaluation.md`
- **Original package BASE:** `19d73035b33b639f9927d2f78a55d74c44f65544`
- **Pre-implementation HEAD:** `19d73035b33b639f9927d2f78a55d74c44f65544`
- **Allowed implementation paths:** `package.json`, `pnpm-lock.yaml`,
  `src/components/animate-ui/**`, `src/components/ui/dialog.tsx`,
  `src/components/ui/alert-dialog.tsx`, `src/components/ui/dropdown-menu.tsx`,
  `src/components/ui/tooltip.tsx`, directly affected representative consumers under `src/**`, and
  task-relevant tests under `tests/**`. Product changes are optional and legal only if the ADR
  justifies one representative low-risk adoption. Do not edit `.claude/**`, `.codex/**`,
  `supabase/**`, task/control files, scratch or FS-001.
- **Sole implementer artifact:** `evidence/P02/implementation-01.md`; this must contain the complete
  reproducible ADR whether adoption is accepted or declined
- **Commit contract:** commit authorized product/test changes only with exact-path staging; leave
  evidence uncommitted. A decision-only `BASE == HEAD` range is valid. Never use `git add -A` or
  `git add .`.
- **Pre-existing dirty/untracked paths:** root-owned unstaged `PROGRESS.md` and `HANDOFF.md`, plus
  the sole untracked assigned evidence; no staged paths; branch `main` is twenty-two commits ahead
  of `origin/main`
- **Decision evidence:** inventory tabs plus dialog, alert-dialog, dropdown-menu and tooltip;
  compare exact current/latest Animate UI primary-source registry files/version with current Radix
  wrappers for animation, accessibility, focus/keyboard/screen-reader behavior, reduced motion,
  portals/z-index, dark mode, bundle/tree-shaking, React 19/Next 16 compatibility, maintenance
  ownership and visual quality. Record a reversible accept/decline decision and rollout standard.
- **Validation:** exercise tabs and all four candidates with pointer/keyboard, trap/restore,
  Escape/outside click, nested/scrolling portals, 320px/mobile, 200% zoom, dark and reduced-motion;
  inspect hydration/console/network and animation interruption/jank. If code changes, add meaningful
  component/E2E regressions, build/bundle comparison and retries-disabled repeats; if no code
  changes, independently reproducible behavior and a complete ADR are still required.
- **Question route:** complete proposals in assigned evidence; root alone appends QUESTIONS

## Review dispatch

This section records the completed failed independent review.

- **Reviewer:** a `human_scratch_reviewer` instance distinct from the implementer
- **Literal reviewed BASE:** `19d73035b33b639f9927d2f78a55d74c44f65544`
- **Literal reviewed HEAD:** `19d73035b33b639f9927d2f78a55d74c44f65544`
- **Range type:** `empty`; reviewer must establish with `git diff --exit-code BASE HEAD`
- **Implementation evidence:** `evidence/P02/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P02-review-01.md`
- **Prior review files:** none
- **Reviewer writes:** assigned review file only; no evidence/ledger/product/test/scratch writes
- **Failure route:** persist review, P02 `changes_requested`, next paths
  `evidence/P02/implementation-02.md` and `reviews/P02-review-02.md`
- **Verdict:** FAIL; I-001: at 320 px all five retained import tabs and the active panel are unnamed
  because their only labels are `hidden sm:inline`; revision 02 must add persistent programmatic
  names and a retries-disabled 320 px regression
- **Question route:** transcribe `Q-PROPOSAL-P02-01` as canonical Q-001; I-001 requires no human
  choice

## Next root action

Persist the exact revision-01 evidence/review, Q-001, R-009/R-022 and failure state. Record that
artifact commit, then rewrite this handoff for P02 revision 02 over the original BASE with exact new
artifact paths and the narrow mobile accessible-name remediation. Do not authorize HS-017's marker.

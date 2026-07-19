# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P01 / 01
- **Scope IDs:** HS-002; authorized scratch marker only after independent package PASS and root
  integration
- **State:** changes_requested after immutable `reviews/P01-review-01.md` FAIL; evidence, review and
  failed-review state persisted in `94d7c77c9ee21390af0bb4a70b2f1abaa014ec75`
- **Task:** `tasks/HS-002-dependency-upgrades.md`
- **Original package BASE:** `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`
- **Allowed implementation paths:** `.nvmrc`; `package.json`; `pnpm-lock.yaml`;
  `pnpm-workspace.yaml`; `eslint.config.mjs`; `next.config.ts`; `next-env.d.ts`;
  `playwright.config.ts`; `postcss.config.mjs`; `tsconfig.json`; `vitest.config.ts`; and only
  dependency-migration-required files under `src/**` and `tests/**`. Do not edit `.claude/**`,
  `.codex/**`, `supabase/**`, task/control files, scratch or FS-001; propose any required authority
  update in evidence for root transcription.
- **Sole implementer artifact:** `evidence/P01/implementation-01.md`
- **Commit contract:** commit authorized implementation changes only with exact-path staging; leave
  evidence uncommitted. Never use `git add -A` or `git add .`.
- **Pre-existing dirty/untracked paths:** unstaged modified `specs/human-scratch.md`; no staged or
  untracked paths; branch `main` is five commits ahead of `origin/main`
- **Acceptance focus:** dated inventory of every direct/dev dependency from primary sources; newest
  mutually compatible stable safe chain; explicit pins/removals/security findings; Node/pnpm and
  peer graph; deterministic frozen-lockfile install; browser revisions; minimal official-migration
  compatibility changes; no HS-018 unreleased TanStack work; full validation and real headless CLI
  regression charter
- **Question route:** complete proposals in assigned evidence; root alone appends QUESTIONS

## Review dispatch

This section is the active independent review dispatch.

- **Reviewer:** a `human_scratch_reviewer` instance distinct from the implementer
- **Literal reviewed BASE:** `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`
- **Literal reviewed HEAD:** `cc429f5212f1122be7694fcee457cdcb7575e5dc`
- **Range type:** `non-empty`; 11 implementation commits and 19 authorized changed paths
- **Implementation evidence:** `evidence/P01/implementation-01.md`
- **Sole reviewer artifact:** `reviews/P01-review-01.md`
- **Prior review files:** none
- **Reviewer writes:** assigned review file only; no evidence/ledger/product/test/scratch writes
- **Failure route:** persist review, P01 `changes_requested`, next paths
  `evidence/P01/implementation-02.md` and `reviews/P01-review-02.md`
- **PASS authority:** reviewer recommends PASS; root alone verifies/transcribes/integrates and sets
  `passed`

## Next root action

Rewrite this handoff for P01 revision 02. Revision 02 must use the actual eligible pnpm release,
correct release-age evidence, remove/teardown Supabase channels safely across same-vault
lock/unlock, and add deterministic regression coverage. Do not authorize the HS-002 marker.

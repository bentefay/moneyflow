# Current Package Handoff

Root rewrites this compact file for one package/revision. It is not a dispatch while an applicable
literal field is `pending`. Workers may read but never edit it.

## Implementation dispatch

- **Package / revision:** P01 / 02
- **Scope IDs:** HS-002; authorized scratch marker only after independent package PASS and root
  integration
- **State:** independently recommended PASS; root integration pending; revision 02 evidence frozen
  at SHA-256 `9c16fc6b47dcca39f88b824b7ad995591a8d8731e87842a26d98f6cff315e8cf`; revision 01 failure
  artifacts remain immutable in `94d7c77c9ee21390af0bb4a70b2f1abaa014ec75`
- **Task:** `tasks/HS-002-dependency-upgrades.md`
- **Original package BASE:** `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`
- **Pre-implementation HEAD:** `fe00b2c5d574fffbb9bb92e1b8955bce9ec2a20f`
- **Allowed implementation paths:** `.nvmrc`; `package.json`; `pnpm-lock.yaml`;
  `pnpm-workspace.yaml`; `eslint.config.mjs`; `next.config.ts`; `next-env.d.ts`;
  `playwright.config.ts`; `postcss.config.mjs`; `tsconfig.json`; `vitest.config.ts`; and only
  dependency-migration/remediation-required files under `src/**` and `tests/**`. Do not edit
  `.claude/**`, `.codex/**`, `supabase/**`, task/control files, scratch or FS-001; root performs the
  exact `.claude/CLAUDE.md` toolchain transcription only after independent PASS.
- **Sole implementer artifact:** `evidence/P01/implementation-02.md`
- **Commit contract:** commit authorized implementation/remediation changes only with exact-path
  staging; leave evidence uncommitted. Never use `git add -A` or `git add .`.
- **Pre-existing dirty/untracked paths:** unstaged modified `specs/human-scratch.md`; no staged or
  untracked paths; branch `main` is eighteen commits ahead of `origin/main`
- **Required finding I-001 remediation:** pin and validate the actual newest eligible stable pnpm 11
  release from dated registry metadata; rebuild/freeze with exact Corepack; correct the false
  publication narrative and Vercel cutoff date/policy source; recheck every direct pin at the new
  cutoff.
- **Required finding I-002 remediation:** safely remove/teardown Supabase Realtime channels across
  cleanup/remount so same-vault lock -> unlock succeeds on the first render without reload or
  console errors; add deterministic lower-level and journey E2E regression coverage that fails at
  revision 01 and exercises the real lifecycle.
- **Acceptance focus:** retain all revision-01 safe-chain, peer/lock/audit/migration/build/browser
  evidence; full validation and exhaustive real headless CLI regression, especially repeated
  lock/unlock, duplicate tab, offline/reconnect, channel cleanup, console and network.
- **Question route:** complete proposals in assigned evidence; root alone appends QUESTIONS

## Review dispatch

This section records the completed independent review pending root integration.

- **Reviewer:** a `human_scratch_reviewer` instance distinct from the implementer
- **Literal reviewed BASE:** `d54a6285dd9b9f0824927b3d8a3a4e14c5315c73`
- **Literal reviewed HEAD:** `71aa257bb9bdad736fb7ef7315854fce42c5cbb4`
- **Range type:** `non-empty`; full original BASE through all revision-01/control/remediation
  commits
- **Implementation evidence:** `evidence/P01/implementation-02.md`
- **Sole reviewer artifact:** `reviews/P01-review-02.md`
- **Prior review files:** `reviews/P01-review-01.md`; immutable FAIL
- **Reviewer writes:** assigned review file only; no evidence/ledger/product/test/scratch writes
- **Failure route:** persist review, P01 `changes_requested`, next paths
  `evidence/P01/implementation-03.md` and `reviews/P01-review-03.md`
- **Verdict:** PASS; review SHA-256
  `8a6f65b346c8c129d38b179a9fc04a7514dd634922c382bf123d8593b53b720f`; no findings or Q proposals
- **PASS authority:** root verified the recommendation boundary; root alone integrates and sets
  `passed`

## Next root action

Integrate the exact P01 revision 02 evidence/review, authorized `.claude/CLAUDE.md` transcription,
and root decision/risk records. Only after that commit may root set P01 `passed`, durably prepare
the HS-002 `completion_pending` event, and execute its exact marker transaction.

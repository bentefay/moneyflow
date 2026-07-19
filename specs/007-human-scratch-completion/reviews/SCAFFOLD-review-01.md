# Scaffold Review 01

- **Verdict:** FAIL
- **Reviewed:** orchestration scaffold, root `AGENTS.md`, and both project agent TOMLs
- **Repository HEAD:** `6c3456ce701228a15b193f11cf3c0c270aa8a56f` on `main`
- **Review time:** 2026-07-19T22:40:54+10:00
- **Manual app testing:** intentionally not run; this review checks whether the future manual gate
  is executable

## Critical findings

None.

## Important findings

### I-001 — P00 and P21 do not have an executable implement/review lifecycle

`GOAL.md:25-28` requires every package to use the implementer and then an independent reviewer, and
`GOAL.md:45` requires P00 and P21 to become `passed`. The generic coordinator loop starts by reading
"the next task" (`PROCESS.md:22`), but neither control package has a mapped task. P00 is especially
contradictory: `PROCESS.md:25` tells the coordinator to refresh the baseline, while `PROGRESS.md:11`
says to refresh P00 and then dispatch P01; `HANDOFF.md:16` nevertheless reserves a P00 review. P21
has a checklist in `FINAL-AUDIT.md`, but no defined owner, handoff, exact review range, transition
sequence, or final independent-review writer. Both custom roles require a mapped task
(`human-scratch-implementer.toml:7` and `human-scratch-reviewer.toml:7`).

As written, a fresh root cannot follow the contract exactly and prove both control packages passed.
Define explicit P00 and P21 control-task contracts, permitted writers, handoffs, state transitions,
review filenames, and evidence owners. If control packages intentionally omit an implementer, encode
that exception consistently in GOAL, PROCESS, the roles, and the ledger while retaining an
independent reviewer gate.

### I-002 — Agent write permissions contradict the persistent question and review contracts

The implementer is forbidden from editing global ledgers at
`.codex/agents/human-scratch-implementer.toml:11-14`, then is told to write unresolved ambiguity to
`QUESTIONS.md` at lines 22-25. The reviewer may write only one review and evidence at
`.codex/agents/human-scratch-reviewer.toml:11-14`, then is told to use the persistent question route
at lines 31-32 without a coordinator handoff format. The coordinator is the intended ledger owner,
but PROCESS defines no agent-to-coordinator question record.

The reviewer path also conflicts with append-only recovery: its role names
`reviews/<package>-review.md`, while `reviews/README.md:3-4` requires revisioned files such as
`P11B-review-01.md` and forbids overwriting a failed review. A reusable reviewer can therefore
follow one instruction only by violating another.

Make both agents return a fully formed `Q-*` record to the coordinator, with only the coordinator
appending QUESTIONS. Give every review dispatch one exact revisioned output path and say that this
assigned path, not a static `<package>-review.md`, is the reviewer's sole writable review file.

### I-003 — The new scaffold itself fails the repository formatting gate

Fresh `pnpm format:check` exited 1 and reported format changes needed in 32 newly scaffolded files,
including `AGENTS.md`, SCOPE, core ledgers, and most task files. This makes P00 start from a
known-red baseline caused by the scaffold, conflicts with `.claude/CLAUDE.md:10-17`, and prevents
the scaffold from satisfying its own completion discipline.

Format the scaffold without rewriting the user-owned scratch text, then rerun the complete check.

### I-004 — The reviewer is required to test reduced motion but is forbidden from using the available

CLI mechanism

The reviewer must manually test reduced motion (`human-scratch-reviewer.toml:16-23` and
`PROCESS.md:69-75`) while also being forbidden from using ad-hoc browser scripts or temporary config
files (`human-scratch-reviewer.toml:17-18` and `PROCESS.md:80-81`). The installed CLI's `open`
command has no reduced-motion option. Its own installed reference uses `playwright-cli run-code`
with `page.emulateMedia({ reducedMotion: "reduce" })` for this check, and no repository
`.playwright/cli.config.json` exists. Dark mode may be reachable through application UI, but the OS
media preference is not.

Permit narrowly scoped repository-CLI `run-code`/`eval` for observation and media emulation, or add
reviewed repository CLI configuration profiles using `contextOptions.reducedMotion`. Keep the ban on
standalone Node scripts and temporary tests. The future reviewer otherwise cannot honestly satisfy
the manual charter.

### I-005 — Approved checkbox updates are guaranteed to look like unclassified scope drift

`GOAL.md:38-39` and `PROCESS.md:37-38` require the coordinator to change each approved scratch
marker from `[]` to `[x]`. PROCESS then compares the entire scratch file with the original frozen
SHA before later packages (`PROCESS.md:22-24`), and GOAL classifies every post-freeze checksum
change as drift (`GOAL.md:15-19`). No rule distinguishes authorized marker-only changes from human
edits to the requirement text, additions, removals, or reorderings. After the first PASS, the frozen
checksum must fail forever, leaving a fresh root to reconstruct intent heuristically.

Define semantic drift mechanically: permit only `- []` to `- [x]` for scope IDs whose mapped
packages are passed, require every other byte to equal the frozen `sourceTextLines`, and record a
rolling working-copy checksum after each authorized marker change. Any other delta remains real
drift.

## Minor findings

### M-001 — README reports the wrong frozen requirement count

`README.md:3` correctly says 21, but `README.md:16` calls SCOPE an immutable snapshot of 20
requirements. The machine scope and Goal both prove 21. Correct the stale count before using README
as a recovery entry point.

### M-002 — Accessibility evidence could be made more deterministic

The reviewer is broadly compelled to audit accessibility through focus, keyboard behavior,
inaccessible-control findings, `.claude` rules, and task-specific charters. The shared role/process
do not explicitly require recording accessible names/roles/states from CLI snapshots, zoom/reflow,
or contrast evidence. Adding those items would make the otherwise strong accessibility gate less
dependent on reviewer interpretation.

## Passed checks

### Frozen scope and acceptance coverage

- A read-only Node extraction found exactly 21 top-level `- []` blocks and exactly 21 SCOPE
  requirements. Every entry's `sourceLineRange` and `sourceTextLines` matched the source
  byte-for-byte; IDs and task paths were unique; there were no missing or extra blocks.
- `sha256sum specs/human-scratch.md` returned
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`, identical to `SCOPE.json:6`
  and `GOAL.md:12`.
- All 21 SCOPE task paths exist. Every SCOPE package mapping has an exact reverse mapping in the
  28-row package ledger, and the dependency graph has no missing nodes or cycles.
- The updated Loro sources are preserved exactly in SCOPE (`SCOPE.json:54`) and made an actionable,
  pre-code full-read/commit-record gate in `tasks/HS-003-loro-ephemeral-presence.md:32-40`.
- The complete 72-line alias source is binding, with P11A model invariants, P11B one-click caret,
  lazy autocomplete, no default option, Up/Down/Enter/Escape/grid restoration, click/exact/new
  alias, modal/focus/tooltip/manual-storage behavior, and P11C integrated/performance coverage in
  `tasks/HS-004-description-aliases.md:29-81`. Its automated and manual charters require both
  pointer and keyboard journeys.
- All automation clauses map to P17A-D. In particular, the non-resizing/non-occluding nearby popup,
  automatic-versus-manual blur/tick modes, remembered per-user/per-vault choices, exact matcher,
  amount/account precedence, contextual versus page "new" boundaries, shared editor, robot drift,
  tags add/set, and spanning allocations are actionable in
  `tasks/HS-007-automation-redesign.md:26-81` and are covered by automated and manual matrices.
- Every other frozen block has one stable task and package acceptance/testing/manual charter. Multi-
  package HS-004, HS-007, and HS-011 cannot be checked until all mapped packages pass.

### Config, links, tools, and non-activation

- `jq empty specs/007-human-scratch-completion/SCOPE.json` passed.
- Python `tomllib` parsed both agent files. Required standalone-role fields were nonblank; nickname
  lists were nonempty, unique, and used permitted ASCII characters. Codex 0.144.6's current
  role-file loader supports automatic discovery under a config layer's `agents/` directory and
  strips the standalone `name`, `description`, and `nickname_candidates` before applying the
  remaining config:
  <https://github.com/openai/codex/blob/main/codex-rs/core/src/config/agent_roles.rs>.
- A local Markdown-link resolver checked 16 relative links across 35 scaffold/AGENTS Markdown files;
  none was missing. SCOPE-to-task and SCOPE-to-package references were checked separately and all
  resolved.
- `pnpm exec playwright-cli --help`, `--help open`, and `--version` passed at CLI 0.1.17. The
  commands needed for headless sessions, snapshots, pointer/keyboard, resize, tabs, offline state,
  console, requests, and cleanup exist. `pnpm exec playwright --version` returned 1.59.1, and the
  test CLI exposes both `--retries` and `--repeat-each`.
- The reviewer contract does require repository-installed headless CLI rather than MCP/npx, unique
  sessions, exhaustive task-relevant UX, console/network, multi-tab/users, responsive/dark/error/
  offline states, `.claude` audit, meaningful E2E, and repeated retries-disabled runs. Except for
  I-004, the gate is executable.
- `git diff --name-only` contained only the pre-existing user-owned `specs/human-scratch.md`; all
  scaffold/control files were untracked. No product source, test, migration, lockfile, or manifest
  change was present before this report.
- `PROGRESS.md:9-13`, `BASELINE.md:3-20`, and `FINAL-AUDIT.md:1-4,56-62` explicitly say
  scaffolded/not started/pending. No Goal activation, implementation, verification, or final PASS is
  claimed.

## Commands and results

| Check                                                    | Result                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| `git rev-parse HEAD && git branch --show-current`        | `6c3456ce...`, `main`                                          |
| scope extraction/range/text/hash Node audit              | 21 source blocks, 21 SCOPE entries, 0 failures                 |
| `sha256sum specs/human-scratch.md`                       | exact recorded SHA-256                                         |
| `jq empty specs/007-human-scratch-completion/SCOPE.json` | exit 0                                                         |
| SCOPE/task/package reverse-map audit                     | 28 packages, 21 requirements, 0 failures                       |
| package dependency DAG audit                             | 28 nodes, 0 unknown dependencies, 0 cycles                     |
| Markdown relative-link audit                             | 35 files, 16 links, 0 missing                                  |
| Python TOML and standalone-role semantic validation      | 2/2 passed                                                     |
| `codex --version`                                        | `codex-cli 0.144.6`                                            |
| `/home/linuxbrew/.linuxbrew/bin/codex doctor --json`     | overall `ok`; config loaded                                    |
| `pnpm exec playwright-cli --help` / `--help open`        | exit 0; required command surface present                       |
| `pnpm exec playwright-cli --version`                     | `0.1.17`                                                       |
| `pnpm exec playwright --version`                         | `1.59.1`                                                       |
| `pnpm format:check`                                      | **exit 1; 32 scaffold files need formatting**                  |
| `git status --short --untracked-files=all`               | user scratch preserved; scaffold untracked; no product changes |

The scaffold must be re-reviewed after all Important findings are corrected.

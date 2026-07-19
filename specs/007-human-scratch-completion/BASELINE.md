# Execution Baseline

This root-owned ledger is a template until P00. The P00 collector writes only its exact assigned
evidence and the reviewer writes only its revisioned review; after PASS root transcribes verified
facts here. All values below are scaffold provenance, not a claim that Goal checks have run.

## Scaffold-time provenance

- Repository root: `/home/ben-agents/Code/moneyflow`
- Source ancestry commit supplied for the freeze: `6c3456ce701228a15b193f11cf3c0c270aa8a56f`
- Frozen working-copy scratch SHA-256:
  `b91ca932d536285fc3e47091baea176ab2f4c314d02147e61df3615ff8cd5e8b`
- Frozen immutable canonical feature spec
  `specs/008-transaction-percentage-allocations-settlement/spec.md`: SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes.
- SCOPE selects 22 equally first-class requirements: 21 ordered scratch blocks and the complete
  canonical feature spec as `FS-001`. The prefixes record source provenance only.
- `specs/human-scratch.md` was modified and user-owned. It was not edited or staged by scaffold
  work.
- The canonical feature spec was also not edited or staged by scaffold work and may never be edited
  to record Goal progress.
- Package manifest observed during planning: Next `16.2.9`, React `19.2.4`, TypeScript `6.0.2`,
  `loro-crdt` `1.10.8`, `@tanstack/react-virtual` `3.13.23`, `@playwright/test` `1.59.1`, and
  `@playwright/cli` `0.1.17`. P00/P01 must re-read the manifest and lockfile.
- The user reported a Next.js process in tmux and Supabase dependencies in Docker. Their health was
  not verified by scaffold creation.
- No build, lint, typecheck, unit, integration, E2E, performance, security, or manual browser check
  is claimed here.

## P00 refresh checklist

Record command, timestamp, exit status, duration, and evidence path for each:

- [ ] `git rev-parse HEAD`, branch/upstream, worktrees, remotes, and exact dirty/untracked paths.
- [ ] Frozen scratch checksum, rolling checksum and all 21 normalized blocks from SCOPE.json.
- [ ] Canonical feature-spec SHA-256, exact 715-line/25,441-byte identity, whole-file selector and
      no-mutation state.
- [ ] All 22 requirement mappings, reverse package mappings and package DAG validate.
- [ ] Node, pnpm, OS, Codex, Playwright CLI/test package, and installed browser versions/cache
      paths.
- [ ] tmux sessions/process command, application URL health, Docker/Supabase services and
      migrations.
- [ ] Environment-variable names required for tests, without printing values or secrets.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- [ ] Unit/integration suite counts, failures, duration, and seeds where relevant.
- [ ] Complete E2E suite counts, duration, and failures with retries disabled.
- [ ] A second/repeated E2E sample sufficient to identify existing flakes.
- [ ] Headless Playwright CLI smoke of identity/vault, imports, transactions, aliases, people,
      automations, refresh, duplicate tab, console, and requests.
- [ ] Deterministic role/name/state snapshots, keyboard/focus, 320px reflow, 200% zoom,
      reduced-motion emulation and applicable computed contrast ratios.
- [ ] Current accessibility, performance, console/network, security, and migration warnings.

## Refreshed baseline results

| Check                | Command / method | Result  | Duration | Evidence |
| -------------------- | ---------------- | ------- | -------- | -------- |
| HEAD and dirty paths | pending          | not run | —        | —        |
| Services             | pending          | not run | —        | —        |
| Quality checks       | pending          | not run | —        | —        |
| Unit/integration     | pending          | not run | —        | —        |
| E2E                  | pending          | not run | —        | —        |
| Manual smoke         | pending          | not run | —        | —        |

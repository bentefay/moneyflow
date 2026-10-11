# CLI

TypeScript CLI built on [Optique](https://optique.dev/) and run by Bun. `run` is the entry point for
every development, CI and maintenance task; the root `package.json` has no `scripts`.

## Usage

```bash
run --help                 # every command; `run <command> --help` for one
run dev                    # Next.js dev server (Turbopack); extra args go to `next dev`
run build | run start      # production build / serve it
run check                  # every pre-commit gate, in order, stopping at the first failure
run tsc [app|cli|all]      # type check (default all); --watch for a single target
run lint                   # oxlint; extra args are passed through
run format [--check] [PATH...]
run test unit|cli [--watch] [--filter TEXT]...
run test e2e [playwright args...]  # e.g. --ui, --reporter=html, a spec path
run browser install | run browser <playwright-cli args...>
run db start|stop|reset|types
run deps outdated [--all]  # updates old enough to pass the minimum release age
```

`run` is on `PATH` through the flake's `shellHook`, which direnv loads. Outside the dev shell, call
`cli/bin/run` directly.

## Structure

```
cli/
├── bin/run          # Entry point: installs missing node_modules, then `bun cli/bin/run.ts`
├── bin/run.ts       # Runs the root parser and dispatches the parsed command
├── commands/        # Thin Optique wrappers: arguments and options only
│   └── index.ts     # The root `or(...)` parser and the exhaustive dispatch switch
├── lib/             # Implementation logic
└── tests/           # vitest, run with `run test cli`
```

Commands define a parser and delegate to `lib/` through a lazy import, so `run --help` never loads
implementation code:

```typescript
// commands/example.ts
export const exampleCommand = command(
    "example",
    object({ command: constant("example"), force: option("--force") }),
    { description: message`Does the example thing` }
);

export const example = async ({ force }: InferValue<typeof exampleCommand>) =>
    (await import("../lib/example")).doThing({ force });
```

Every parsed value carries a unique `command` constant. `commands/index.ts` switches on it, so
adding a command means adding its parser to `cli` and a `case` to `dispatch`; TypeScript rejects a
missing case through the `ExitCode` return type.

## Conventions

- **Run tools through `lib/exec.ts`.** `exec(command, args)` prepends the repo's
  `node_modules/.bin`, inherits stdio, never uses a shell, and resolves with the exit code.
  `execCapture` captures stdout instead. Ctrl-C reaches the child directly; `exec` waits for it.
- **Return exit codes, don't throw** for expected failures. Sequences use `lib/steps.ts` `runSteps`,
  which stops at the first non-zero code.
- **Prefer `node:` APIs in `lib/`** so it stays testable under vitest, which runs on Node. Keep Bun
  APIs (`Bun.file`, `Bun.TOML`) in small modules that tests don't import, like
  `lib/deps/minimumReleaseAge.ts`.
- **`lib/realtimeJwtSecret.ts` is shared with `playwright.config.ts` and the integration tests.**
  Keep it to `node:` APIs. `run dev` and `run start` use it to pass `SUPABASE_JWT_SECRET` from the
  local Realtime container when the environment doesn't set one.
- **Parsers are pure, so test them.** `tests/parser.test.ts` checks argv against the parsed value
  with `parseSync`; add a row for every new command or option.

## Dependencies

The CLI is its own Bun project with its own `bun.lock`. `cli/bunfig.toml` is a symlink to the root
`bunfig.toml`, so both installs share one minimum release age. Packages the root already provides
(`vitest`, `fast-check`, `typescript`, `@types/node`) resolve from the root `node_modules` and are
not repeated here; bump them in the root `package.json`.

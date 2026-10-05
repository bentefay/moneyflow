# MoneyFlow Development Guidelines

## Critical Rules

- Favour functional programming with pure functions and immutable data.
- **Tests are not optional**: Unit tests for pure functions, E2E tests for user flows.
- **Use established libraries** for algorithms (Levenshtein, CSV parsing, dates). Custom
  implementations are bugs waiting to happen.
- Keep `.claude/` files updated alongside code changes.
- Fix all lint, typecheck, formatting, and test issues before committing, even if you didn't create
  them.

## Before Completing Any Task

1. Run ALL checks: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`
2. Fix any issues found
3. **Commit the changes**

## Commands

- `pnpm dev` - dev server
- `pnpm build` - production build
- `pnpm test` - unit tests
- `pnpm test:e2e` - E2E tests
- `pnpm typecheck` - type checking
- `pnpm lint` - ESLint
- `pnpm format` / `pnpm format:check` - oxfmt formatting
- `pnpm exec playwright-cli -s=<session> open http://localhost:3000` - manual browser testing
- Use `bat -P` rather than `cat` (aliased to bat with pager)
- Never run Playwright with `--debug`, `--ui`, `--headed`, or `show` (opens a GUI and can block)
- Never use parentheses in commit messages

## Tech Stack

- TypeScript 6.x, Node.js 22.x LTS (Node.js 24.x supported), Next.js 16 (App Router), React 19
- Loro CRDT + loro-mirror (client state), Supabase (server sync), IndexedDB (persistence)
- shadcn/ui + Tailwind CSS
- tRPC v11 + Zod
- libsodium (client-side crypto)
- Vitest + fast-check + Playwright

## Architecture Principles

1. **Client-Side Encryption**: All financial data encrypted before storage. Server never sees
   plaintext.

2. **CRDT State**: Vault state is a Loro document. Use loro-mirror's draft-style mutations (mutate
   in place, don't return new objects).

3. **Money as Integers**: All amounts stored as minor units (cents for USD, yen for JPY). Use
   `toMinorUnitsForCurrency()`.

4. **Ed25519 Auth**: API requests signed with keys derived from seed phrase. No passwords.

5. **Sync**: IndexedDB writes immediate (crash safety), server pushes throttled (~2s). Shallow
   snapshots for cold starts.

## Testing

| Type        | Location             | Style                                        |
| ----------- | -------------------- | -------------------------------------------- |
| Unit        | `tests/unit/`        | Table-driven; property-based with fast-check |
| Integration | `tests/integration/` | Happy path + error cases                     |
| E2E         | `tests/e2e/`         | Harness functions, assert behaviour not text |

### Tests that need the real Supabase stack

`tests/integration/realtime-*.test.ts` run against the running local containers on purpose — they
assert the deployed RLS and JWT boundary, which a mock cannot prove. They need `pnpm db:start` and
either a `.env.local` or exported `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
`SUPABASE_JWT_SECRET` (exported wins over the file). `.env.local` is gitignored, so **a fresh
worktree must copy it from the main checkout** before these suites can run. They fail loudly with
the missing variable named rather than skipping themselves.

Their fixtures own rows in the shared local database, so:

- Delete only your own vault ids, and delete `vault_ops` (and `vault_updates_legacy`) before
  `vaults` — both hold `ON DELETE RESTRICT` foreign keys, so skipping them fails the whole cleanup.
- `runSql` sets `ON_ERROR_STOP=1`. Without it psql exits 0 on a failed statement, which is how a
  cleanup that had never once succeeded went unnoticed until the leaked rows made an RLS read time
  out under full-suite load.
- Every RLS predicate on a table an authenticated role can read should be indexable on its own, not
  only inside a `SECURITY DEFINER` helper. A helper the planner cannot see through turns any
  unfiltered read into a whole-table scan against PostgREST's 8s `statement_timeout`.

### Provenance markers for realtime fixture rows

A fixture row that outlives its cleanup can only be identified later if the row itself proves it was
synthetic. Age, an absent owner and UUID shape are not provenance. So `realtime-stack.ts` writes
constant public test vectors, and a row counts as classifiable only when **both** columns of its
pair match exactly:

| row type   | written by                              | marker pair                                                                         |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| membership | `createVaultOwnedBy` / `addVaultMember` | `encrypted_vault_key = 'd3JhcHBlZA=='` AND `enc_public_key = 'cHVibGlj'`            |
| op         | `appendVaultOp`                         | `encrypted_data = 'aHMwMTUtZW5jcnlwdGVkLW9w'` AND `version_vector = 'e30='`         |
| snapshot   | reserved — no writer exists yet         | `encrypted_data = 'aHMwMTUtZW5jcnlwdGVkLXNuYXBzaG90'` AND `version_vector = 'e30='` |

`aHMwMTUtZW5jcnlwdGVkLXNuYXBzaG90` is base64 of `hs015-encrypted-snapshot`, and `e30=` is base64 of
`{}`. Both are public test vectors, not genuine encrypted Loro data: never use them in production
code, or in a browser fixture whose data has to decrypt.

**No integration helper writes `public.vault_snapshots` today.** The table appears in
`tests/integration/helpers/realtime-stack.ts` only as the scoped `DELETE` inside
`cleanUpVaultFixtures`, and none of the RPCs the helpers call — `create_vault_for_owner`,
`append_vault_ops`, `rotate_realtime_grant`, `revoke_realtime_grant` — touches it either. The
snapshot marker above is reserved for the writer that does not exist yet;
`tests/unit/realtime-fixture-provenance.test.ts` fails the suite if an `INSERT`, `UPDATE` or upsert
against that table appears in the integration helpers without the rest of this convention.

Deliberately outside this convention:

- `tests/database/legacy-upgrade-fixture.sql` inserts its own snapshot ciphertext, which
  `tests/database/legacy-upgrade-audit.sql` asserts survives the migration. It is a migration
  fixture, not a realtime one — leave both alone.
- Application paths write real client ciphertext: `src/server/routers/sync.ts:pushSnapshot`, reached
  through `src/lib/sync/manager.ts`, and any E2E flow that drives it. They must never write marker
  bytes, and a snapshot they created is not a fixture.

**If you add a snapshot writer, everything below belongs in that same change:**

1. Write both marker values verbatim, populate the required `version`, `hlc_timestamp`,
   `encrypted_data` and `version_vector` columns, and write only for vault ids the suite created —
   `vault_id` is unique per vault and its foreign key cascades.
2. Leave `cleanUpVaultFixtures` as it is. It already deletes snapshots exactly once, after
   `vault_updates_legacy` and before `vault_invites`; do not add a second `DELETE`.
3. Extend `countVaultFixtureRows` — its return type, its empty-input result, its `SELECT`, its
   parsed-arity check, and every caller asserting the exact object, including
   `tests/integration/realtime-origin-controls.test.ts`.
4. Replace the source guard with behaviour tests over the new writer's markers and counts. Extend
   the coverage; do not simply delete it.

**A marker is never retroactive.** It says something about rows written after it exists, and only
about the row carrying the exact pair. A missing, NULL or different marker means _unclassified_ — it
does not mean real data, and it does not mean safe to delete. A marked child classifies neither its
parent vault nor its siblings. Nothing here authorizes a purge, a backfill, a retroactive
classification or any widening of MF-006's manifest; a future deletion needs its own confirmed
selection, manifest and review.

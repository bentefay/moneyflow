# P04 Implementation Evidence — Revision 02

## Contract and pre-mutation boundary

- Package/scope/revision: `P04` / `HS-014` / `02`.
- Original package BASE: `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9`.
- Pre-implementation HEAD: `ae6b1797e5c874fc48114f309bb9a7e02220a246`.
- Sole new worker artifact: `specs/007-human-scratch-completion/evidence/P04/implementation-02.md`.
- At dispatch, only root-owned unstaged `HANDOFF.md` and `PROGRESS.md` were dirty. The index and
  untracked set were empty. Revision-01 product/evidence/review and control commits are immutable.
- Product/test authority is exactly the 13 paths in the current handoff. This evidence preamble was
  written before any revision-02 product or test mutation.

This implementer does not mark PASS. Independent review and root integration retain their PROCESS
authority.

## Finding and Q-002 correction plan written before mutation

### F-001 — Exact authenticated request binding and URL privacy

Red source behavior at the pre-implementation HEAD uses tRPC GET for query-only batches. The client
signs a fixed `/api/trpc` path with no body, while tRPC serializes procedure inputs in the URL. The
route reconstructs a normalized signed operation list only for POST. Therefore procedure/input
substitution does not change the verified GET representation and identifiers, vectors and
`hasUnpushed` can enter URLs and server logs.

The selected correction is the Q-002 default: configure the browser tRPC link to use POST for every
query and mutation; sign the ordered normalized `{ path, input }` operation list; reconstruct that
same list from the actual POST procedure path and deserialized body; and reject protected non-POST
requests. Counterfactual tests will prove both procedure and input substitution fail before nonce
claim, while transport tests/E2E/CLI will inspect that serialized inputs and identity/vault/vector/
`hasUnpushed` values occur only in the body, never the URL.

### F-002 — Verified self-only user access

Red source behavior exposes `exists`, `register` and `getOrCreate` as public procedures whose inputs
select a service-role `user_data` row by claimed hash. `getOrCreate` can return the selected row's
encrypted blob. The selected Q-002 correction makes all three protected self-only procedures,
removes every hash input, and filters/inserts exclusively with the hash derived by signature
middleware as `ctx.pubkeyHash`. Stored rows and keys need no migration.

New registration currently calls the server before installing the new signing session. The hook will
instead clear prior identity-scoped selection/cache, install only the confirmed identity long enough
to sign the protected registration, and expose unlocked state only after registration and
default-vault setup succeed. Any failure will clear the signing session, active-vault storage,
identity-scoped query cache, in-memory session/new-user state and unlocked status. The same cleanup
will cover the legacy create and existing-seed unlock paths without changing their page-facing
function signatures or return types.

### Acceptance boundaries retained

- P05 still owns authenticated/server-mediated Realtime and multi-client reconnect behavior.
- P08 still owns the real invitation/key-wrap UI and redemption journey.
- R-024 remains a frozen-scratch formatter configuration/exclusion issue for P20B/P21. Revision 02
  will reproduce and classify it without changing scratch.
- If implementing the lifecycle safely requires any caller/provider/configuration path beyond the
  exact grant, work will stop after a complete proposal here rather than silently widening scope.

## Mutation and validation ledger

No revision-02 product or test mutation had occurred when the sections above were completed. The
following results were recorded after the implementation.

### Implemented correction map

- F-001: `httpBatchLink` now uses POST for queries and mutations. Its signature binds the ordered
  procedure names and each operation's exact serialized SuperJSON wire input. The route reconstructs
  that representation from the actual URL procedure list and exact indexed POST body, refuses
  malformed/count-mismatched input, and enables tRPC's intentional POST-query override. Protected
  middleware rejects non-POST requests and bodies that are not non-empty signed-operation lists.
- F-001 counterfactual evidence: authentication tests change only the procedure and only the input;
  both substitutions fail verification. A production-client transport test captures the real method,
  URL, body and headers, reconstructs the route representation, and verifies the signature. The same
  test proves no serialized input occurs in the URL.
- F-002: `user.exists`, `user.register` and `user.getOrCreate` are protected self-only procedures.
  Their strict schemas accept no claimed hash; every select, insert and duplicate-race lookup uses
  only `ctx.pubkeyHash`. Anonymous calls fail, a different claimed hash fails strict parsing, and
  router tests prove only the verified context identity is selected/inserted.
- Q-002 lifecycle: registration installs the confirmed signing identity before its protected server
  request, but does not expose unlocked state until registration and default-vault setup complete.
  Registration, legacy creation and seed unlock all clear the old signing session, active vault,
  identity-scoped queries/mutations and in-memory session/new-user state before transition and again
  on failure. `lock()` clears the same identity selectors. Caller signatures and return types remain
  unchanged.
- Database migration `006_rls_hardening.sql` required no revision-02 change: fresh and upgrade-path
  verification below confirms the revision-01 schema/RLS work remains valid.
- P05 remains responsible for authenticated/server-mediated Realtime and reconnect behavior. P08
  remains responsible for invitation/key-wrap UI and redemption. This revision does not pre-claim
  either boundary.

### Red-before evidence

- Before product changes, the focused four-file Vitest command reported 9 failures and 6 passes. The
  failures demonstrated that anonymous user existence resolved, strict empty inputs were rejected, a
  caller-provided other hash could register, registration had no signing session, production queries
  used GET, and unlock sent a claimed hash.
- The first signed-GET test fixture accidentally hashed `undefined`, which libsodium rejected before
  exercising middleware. After correcting only that test fixture, the isolated red run reached the
  old middleware and resolved the authenticated identity instead of rejecting GET. Thus the red
  result was established against the pre-correction product behavior.

### Automated green evidence

- `pnpm exec vitest run tests/unit/crypto/signing.test.ts tests/unit/server/trpc-auth.test.ts tests/unit/server/user-router.test.ts tests/unit/hooks/use-identity.test.tsx`:
  4 files, 32/32 tests passed.
- `pnpm test`: 46 files, 1,166/1,166 tests passed. The first run found one test-only relative-URL
  construction error after 1,165 product tests passed; using the same localhost base as the real
  transport corrected the assertion fixture, and the complete rerun passed.
- `pnpm typecheck`: exit 0, including after the final E2E addition and formatting.
- `pnpm lint`: exit 0 with the same 13 repository baseline warnings and no errors.
- `pnpm build`: Next.js 16.2.10 production build passed; compilation completed in 5.2 seconds,
  TypeScript in 8.3 seconds, and all 17 routes were generated.
- `pnpm exec playwright test tests/e2e/onboarding-vault.spec.ts tests/e2e/vault-settings.spec.ts --reporter=list`:
  14/14 passed with zero retries. The initial run deterministically exposed tRPC's POST-query 405;
  adding the documented route `allowMethodOverride` completed the intended integration. A new
  failure-cleanup assertion initially matched both the app alert and Next announcer; narrowing that
  locator corrected only the test. The final authorized-spec run passed.
- Critical new-user/select-vault, registration-failure cleanup and same-vault lock/unlock journeys
  repeated with `--repeat-each=3`: 9/9 passed.
- Full `pnpm test:e2e`: 80/80 passed with zero retries after all revision-02 tests were present.
- E2E request capture proves every observed tRPC operation is POST, URLs contain only procedure
  paths plus `batch=1`, and serialized input, identity/vault identifiers, state vectors and
  `hasUnpushed` do not occur in URLs. Registration/get-or-create bodies contain no claimed hash. The
  forced registration network failure leaves no signing session, active vault, cached unlocked state
  or settings access.

### Database evidence

- Fresh reset applied `005_vault_ops.sql` and `006_rls_hardening.sql`; pgTAP reported 49/49 passing.
- Seeded upgrade reset to migration 005, loaded `tests/database/legacy-upgrade-fixture.sql`, applied
  migration 006, and the upgrade audit reported 14/14 passing.
- The host did not provide `psql` (diagnostic exit 127), so the same audit SQL was executed with
  `psql` inside the running local Postgres container. This changes no coverage or assertion.
- After all browser verification, `pnpm exec supabase db reset --no-seed` again completed
  successfully, applied migrations 005 and 006, restarted containers, and left a clean
  current-schema database.

### Browser CLI evidence

All output below is deliberately sanitized: the seed phrase, keys, hashes and vault IDs stayed only
inside isolated browser closures and were never printed.

- New user (`p04r2-new`): completed confirmation through Vault Settings. The accessible result
  showed `Vault Settings`, `My Vault` with owner role, `Saved`, vault-name input and
  default-currency input. Captured registration, vault creation, snapshot save/list/read operations
  were POST and their URLs contained only `batch=1`, with no inputs. The initial `127.0.0.1` run
  produced HMR-origin websocket noise; reopening the same isolated session on `localhost` produced a
  clean console. A post-journey metrics closure used Node's unavailable global `URL` and failed
  after the app result was already retained; metrics were repeated successfully in the other
  isolated sessions.
- Existing user (`p04r2-existing`): a single closure retained the 12-word phrase internally, locked,
  unlocked and reached Transactions. Sanitized metrics were `unlocked=true`, `requestCount=10`,
  `nonPost=0`, `inputUrls=0`, `sensitiveUrls=0`, `claimedHashBodies=0`, `missingNonce=0`, and
  `consoleErrors=0`. The accessible result showed the owner vault, `Saved`, Search, Add transaction
  and zero transactions; console warnings/errors were both zero.
- Outsider (`p04r2-outsider`): anonymous POST `user.getOrCreate` returned 401 and its response
  exposed neither encrypted data nor a public-key hash. The isolated outsider then created only its
  own identity and saw its own owner vault. Sanitized metrics were `anonymousStatus=401`,
  `anonymousDataDisclosure=false`, `requestCount=6`, `nonPost=0`, `inputUrls=0`, `sensitiveUrls=0`,
  `claimedHashBodies=0`, `missingNonce=0`, and `consoleErrors=0`.
- All three isolated sessions were closed and deleted; the browser CLI reported no remaining
  browsers. Exact revision-02 generated page/console artifacts were deleted, while older unrelated
  CLI artifacts were preserved.

### Frozen-source and repository-boundary evidence

- `specs/human-scratch.md` remains SHA-256
  `db97178a044343f9a99aba1596590986c4324586ec5a64f8426590da95833aeb`, 350 lines and 24,242 bytes.
  Parsing from the unique HS-001 first line found exactly 21 ordered top-level blocks; normalizing
  only the marker made every block byte-equal its `SCOPE.json` `sourceTextLines`. The checked set is
  exactly HS-002, HS-017 and HS-018, matching the passed requirement ledger. HS-014 remains
  unchecked.
- Canonical FS-001 remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines and 25,441 bytes.
- `pnpm format:check` reproduces R-024 and exits 1 only for frozen/control Markdown: root-owned
  `PROGRESS.md`, clean `QUESTIONS.md`, clean `RISKS.md`, and frozen `specs/human-scratch.md`. No
  formatter was allowed to mutate those paths. All 13 authorized paths and this evidence pass
  exact-path `oxfmt --write`; `git diff --check` passes.
- No revision-02 question proposal is required. Q-002's accepted default is implemented and tested.

### Commit and handoff boundary

- Revision-02 product/test commit: `dbcf180e829c81a218e9a73791e40902c4f9eb31`
  (`fix: bind verified identity requests`). It contains exactly the 13 authorized revision-02 paths
  and no evidence/control/scratch path.
- Exact package review range:
  `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31`. This
  intentionally includes the immutable revision-01 implementation, failed review and root
  failure-artifact commits before the revision-02 correction commit; the reviewer must assess this
  exact cumulative package range and this revision's assigned evidence.
- The worker will leave this evidence uncommitted. Root-owned `HANDOFF.md` and `PROGRESS.md` remain
  preserved and unstaged. The index will be empty at handoff.

# P04 Independent Review — Revision 01

## Verdict

**FAIL.** Revision 01 materially improves the database boundary, but two source-visible defects
directly contradict HS-014 and are acceptance-blocking:

1. authenticated tRPC GET batches sign only `GET`, the fixed `/api/trpc` endpoint, timestamp, nonce
   and an empty body hash while tRPC puts the selected procedure and input in the URL; and
2. public user procedures use an unverified caller-provided hash to select or create service-role
   data, with `getOrCreate` returning the selected row's stored encrypted blob.

The frozen requirement says the server must derive the public-key hash only after verified proof,
untrusted client claims must not select it, and prohibited identity/vault data must not travel in
URLs. Both defects remain in the reviewed HEAD. P04 therefore cannot pass and no HS-014 scratch
marker is authorized.

## Review contract and immutable boundary

- Package/revision: `P04/01`, `HS-014`.
- Literal reviewed range:
  `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..20a489dc51542ee0c681cfba0a33aee820d70221`.
- BASE independently resolved to `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9` and HEAD to
  `20a489dc51542ee0c681cfba0a33aee820d70221`.
- The range contains one commit, `20a489d fix: harden vault database access`, and exactly the 25
  paths reported in the frozen evidence: 1,439 insertions and 368 deletions.
- Frozen evidence: `specs/007-human-scratch-completion/evidence/P04/implementation-01.md`, verified
  SHA-256 `71eaaebfe3c95a23b387b794f02e703bacba8de7fc8166810b93a980861a3e9b`.
- `git diff --check BASE..HEAD` passed. The index was empty. Final source/Git inspection found only
  root-owned unstaged `HANDOFF.md` and `PROGRESS.md`, the frozen untracked implementation evidence,
  and this assigned review artifact.
- The scratch working copy remains SHA-256
  `db97178a044343f9a99aba1596590986c4324586ec5a64f8426590da95833aeb`, 350 lines and 24,242 bytes. It
  was not edited or staged. Its known formatter interaction remains routed to R-024 and P20B/P21; it
  cannot be reformatted or marked for this failed package.

Read-only review commands for the final scoped pass were `git rev-parse`, `git log`,
`git diff --name-status`, `git diff --stat`, `git diff --check`, `git status`, `sha256sum`, `wc`,
`rg`, `sed` and `nl`. No product, migration, test, ledger, frozen source or configuration file was
edited by this review.

## Severity-ranked findings

### F-001 — Critical — Authenticated GET proof does not bind the selected operation or input

`src/lib/trpc/client.ts:42-73` uses `httpBatchLink`, chooses GET for an all-query batch, constructs
the operation/input body, but deliberately passes `undefined` to `signRequest` for GET. It also
signs the fixed path `/api/trpc`, not the actual tRPC procedure path or query string.

The server preserves the same omission. `src/app/api/trpc/[trpc]/route.ts:165-183` parses and
normalizes a body only for POST. Lines 189-197 then give signature verification the fixed
`/api/trpc` path and that absent GET body. `src/lib/crypto/signing.ts:42-50,84-85` turns an absent
body into an empty hash, so all production GET procedure/input selections have the same signed
method/path/body representation apart from timestamp and nonce.

The result is a proof of possession for a generic GET request, not proof of the exact query being
authorized. Changing the procedure path or serialized input does not change the verified message.
The same transport also serializes query inputs in URLs, contrary to the requirement that hashes,
vault identifiers and sensitive request metadata not be exposed there. TLS is necessary but does not
repair an authorization proof that omits the authorization target, and it does not remove values
from URLs or logs.

The new tests miss this production composition defect:

- `tests/unit/server/trpc-auth.test.ts:23-55,67-107` covers only POST with a signed normalized body;
  its useful body-substitution assertion does not exercise GET.
- `tests/unit/crypto/signing.test.ts:85-101` signs a concrete `/api/trpc/vault.list` path, unlike
  the production client's fixed `/api/trpc`; it therefore cannot prove that production GET selection
  is bound.

Required correction: force tRPC queries and mutations through canonical POST transport (the
narrowest compatible client option is `methodOverride: "POST"`) and keep the exact normalized
operation/input list in the signed body. An alternative is acceptable only if client and server
canonicalize and sign the entire exact GET selection while also satisfying the no-prohibited-data-
in-URL requirement. Add counterfactual tests showing that procedure or input substitution fails and
that authenticated query URLs contain neither serialized inputs nor identity/vault metadata.

### F-002 — Critical — Public user APIs select service-role data by an unverified claimed hash

`src/server/routers/user.ts` explicitly makes all three affected endpoints public:

- `exists` at lines 81-110 selects `user_data` with `input.pubkeyHash` and returns existence;
- `register` at lines 112-163 selects and inserts with `input.pubkeyHash`, including optional
  caller-provided encrypted data; and
- `getOrCreate` at lines 165-248 selects, inserts and race-reselects with `input.pubkeyHash`, then
  returns the selected row's `encrypted_data` and timestamp.

The corresponding schemas expose the claim directly at
`src/server/schemas/user.ts:47-49,69-81,102-104`. These procedures use the server Supabase client,
whose service role is intentionally the real database transport boundary. Because no
`protectedProcedure` middleware runs, no verified Ed25519 public key is available and no derived
`ctx.pubkeyHash` constrains the row. A caller can therefore enumerate an identity, pre-create/squat
its row, or request the stored encrypted blob for any guessed or observed hash. Encryption does not
make cross-identity blob disclosure or identity squatting acceptable.

Required correction: make identity registration/fetch authenticated, remove claimed hash inputs, and
select/insert only with the hash derived from verified `ctx.pubkeyHash`. Remove `exists` if it has
no required caller, or convert it to a protected self-only operation with no hash input. Any
temporary compatibility endpoint must neither reveal an existing blob/existence nor create/select
another identity's row.

This correction necessarily includes `src/hooks/use-identity.ts`. In `registerIdentity`, lines
231-238 call the registration mutation before storing the identity session. The legacy `createNew`
path does the same at lines 294-304. In contrast, mnemonic unlock obtains a stored signing session
through `unlockWithSeed` before calling `getOrCreate` at lines 350-357. Merely converting the router
to `protectedProcedure` would therefore break both new-registration paths. Revision 02 must either
establish the confirmed identity's signing session before registration with correct failure cleanup,
or provide an equally narrow one-request proof using that identity. Tests must ensure a failed
registration cannot leave a stale or falsely unlocked session.

## Partial acceptance mapping

The remainder of the range contains substantial, directionally correct P04 work, but partial work
cannot override either critical finding:

- `006_rls_hardening.sql` removes old policies at lines 427-444, installs direct-API deny policies,
  enables nonce RLS, and grants service role operation-specific table capabilities at lines 481-488.
  Default/direct anon and authenticated table grants are revoked.
- The migration defines atomic nonce claim, soft-delete, invite-acceptance and operation-append
  functions at lines 16, 86, 119 and 218. Permanent `vault_ops` has only service SELECT/INSERT,
  legacy updates are quarantined behind a compatibility view, operation FKs become restrictive, and
  the legacy table is removed from Realtime publication.
- The reviewed vault, membership and sync routers are protected and consistently pair exact
  `input.vaultId` membership filters with verified `ctx.pubkeyHash`; owner-only mutations also check
  role or invoke caller-scoped RPCs. Invite acceptance passes the verified context hash to an atomic
  function.
- The checked-in pgTAP sources visibly cover direct-role denial, exact grants, cross-vault access,
  invite replay, append-only operations, soft deletion and seeded upgrade preservation.

Those source properties support the chosen server-mediated architecture and permanent-op retention
model. They do not cure the request-binding or public-user boundary above.

## Runtime-evidence limitation and frozen evidence adjudication

Two prior tool-assisted review attempts were interrupted/superseded before a single governed review
cycle could complete. During the latter, a configured Playwright invocation exited before test
collection. The final coordinator directive therefore limited this artifact to ordinary offline
source/Git review and prohibited further services, browsers, network requests and database commands.

Accordingly, this review does **not** independently certify the frozen evidence's runtime counts for
fresh/seeded migration execution, rollback rehearsal, pgTAP, full E2E, or Playwright CLI. The
evidence reports 49/49 fresh database assertions, 14/14 seeded-upgrade assertions, 1,153/1,153 unit
tests and 79/79 retries-disabled E2E tests, plus cleanup. Its CLI section candidly records the GET
URL metadata and missing invite UI rather than claiming those gaps passed, which agrees with source.
Those claims are internally consistent with the checked-in test sources and exact evidence hash, but
revision 02's reviewer must rerun the full fresh/upgrade/rollback, role/grant/RLS, invite/replay,
permanent-operation, focused auth/user and retries-disabled E2E matrices. No runtime claim is needed
to establish this FAIL because both acceptance defects follow directly from production source.

The frozen formatter report is non-blocking in classification but does not alter the verdict. The
immutable scratch file is the known R-024/P20B/P21 formatter case; root's currently edited
`PROGRESS.md` is outside the P04 range. The immutable P04 product/test range passed
`git diff --check`; no formatter-driven frozen-source edit is authorized.

## Exact revision-02 path authority recommendation

The narrow product authority required to fix both findings without reopening unrelated product areas
is:

```text
src/lib/trpc/client.ts
src/app/api/trpc/[trpc]/route.ts
src/lib/crypto/signing.ts
src/server/trpc.ts
src/server/routers/user.ts
src/server/schemas/user.ts
src/hooks/use-identity.ts
tests/unit/crypto/signing.test.ts
tests/unit/server/trpc-auth.test.ts
tests/unit/server/user-router.test.ts            # new
tests/unit/hooks/use-identity.test.tsx            # new
tests/e2e/onboarding-vault.spec.ts
tests/e2e/vault-settings.spec.ts
```

The route, signing middleware and their existing tests were already authorized in revision 01 and
should remain available only where needed for canonical POST verification and counterfactual
coverage. `client.ts`, the user router/schema and `use-identity.ts` are mandatory additions.
Onboarding and unlock page source need not be writable if the hook's public contract is preserved;
their existing pages are exercised through the two named E2E journeys. If an implementer proposes to
change that hook contract instead, root must first grant the exact affected caller path rather than
silently widening the package.

Revision-02 evidence must show: all authenticated operations use a signed representation containing
the exact procedure and input; query URLs omit serialized inputs and prohibited values; anonymous
user selection/creation is rejected; verified user procedures cannot select a different claimed
hash; registration signs before service-role access without leaving stale session state on failure;
and both new-user and existing-user unlock journeys pass with retries zero.

## Later-package boundaries

- P05 still owns the real authenticated/server-mediated Realtime design and multi-client reconnect
  evidence. P04's publication/grant groundwork is not evidence that the current anonymous browser
  subscription can read permanent operations.
- P08 still owns the owner-to-member invitation UI, fragment handling, member key wrapping and real
  redemption journey. P04's atomic database invitation/replay behavior is useful groundwork, not a
  substitute for that later end-to-end proof.

Neither later route permits P04 to pass with F-001 or F-002 unresolved.

## Question proposal

### Q-PROPOSAL-P04-01-01 — Authorize the verified-request and user-identity completion range

- Raised by/package/revision: independent reviewer / P04 / 01.
- Context and evidence: revision 01 excludes the client transport, user router/schema and identity
  hook. Source proves that production GET proof omits operation/input and that public user APIs use
  claimed hashes; new registration also has no stored signing session until after its mutation.
- Why existing authority does not decide it: the frozen requirement mandates the fixes, but the
  revision-01 path contract forbids the files needed to make them without breaking onboarding.
- Options considered: leave the gap; patch only middleware; keep public claimed-hash compatibility;
  sign the full GET URL; or authorize canonical signed POST plus verified self-only user procedures
  and their callers/tests.
- Reversible default selected to continue: dispatch P04 revision 02 with exactly the 13 paths listed
  above; force canonical POST, derive user identity only from verified context, and preserve the
  hook's page-facing contract.
- Decision-hierarchy basis: explicit frozen requirement first, then verified identity, least
  privilege, URL privacy, data preservation and the narrowest reversible path expansion.
- Impact and risk: until independently approved, authenticated query selection is not bound to its
  proof and public callers can enumerate/squat/select user rows, including retrieval of stored
  encrypted data. P04 and HS-014 must remain incomplete.
- Reversal or migration path: `methodOverride: "POST"` is a local client transport setting; router
  inputs can remove claimed hashes without a data migration because stored keys remain unchanged. A
  temporary compatibility route, if proved necessary, must not expose existence/blob data or accept
  another identity claim.
- Human review still useful after completion: no product-preference decision is required; root need
  only approve the exact revision-02 dispatch and later verify that no caller-path expansion was
  silently taken.

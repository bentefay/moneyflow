# P04 Independent Review — Revision 02

## Verdict

**PASS on the required source/Git review.** Revision 02 corrects both critical findings from the
immutable revision-01 FAIL. Authenticated application requests now use a POST-only signed
representation containing the ordered procedure path and exact SuperJSON wire input, and user-row
selection/creation now derives exclusively from verified `ctx.pubkeyHash`. New registration installs
proof before service-role access and clears temporary identity state on failure.

No P04-owned blocking or non-blocking source finding remains. This is a review recommendation only:
root retains integration, ledger and scratch-marker authority.

## Immutable review boundary

- Package/revision: `P04/02`, cumulative `HS-014` review.
- Literal reviewed range:
  `9de8b0e8c41087b96523ecc55faa10bf19ec0ff9..dbcf180e829c81a218e9a73791e40902c4f9eb31`.
- The cumulative range contains revision-01 implementation `20a489d`, immutable failure artifacts
  `8a3e807` and `ae6b179`, and revision-02 product/test commit
  `dbcf180e829c81a218e9a73791e40902c4f9eb31` (`fix: bind verified identity requests`).
- `dbcf180e` changes exactly the 13 handoff-authorized paths: seven production paths, four unit-test
  paths and two E2E paths. It contains 776 insertions and 181 deletions and no control, evidence,
  scratch, feature-spec, configuration or unrelated path.
- Frozen revision-02 evidence:
  `specs/007-human-scratch-completion/evidence/P04/implementation-02.md`, independently verified
  SHA-256 `987faf8217f57cd5294eda05884e402e22972d80a9f86d5ca11a6c9bb104509f`.
- Prior immutable FAIL review: `specs/007-human-scratch-completion/reviews/P04-review-01.md`,
  independently verified SHA-256 `89ffd44dccc6be9858033608c6e60656d9f33894ed3a7fe50c7d9c2d63efe947`.
- Revision-01 evidence remains SHA-256
  `71eaaebfe3c95a23b387b794f02e703bacba8de7fc8166810b93a980861a3e9b`.
- `git diff --check BASE..HEAD` passed. The index is empty. Git-visible dirt before this artifact is
  limited to root-owned unstaged `HANDOFF.md`/`PROGRESS.md` and the frozen untracked revision-02
  evidence.

## Findings

No finding remains.

### F-001 closure — exact signed POST operation/input and URL privacy

`src/lib/trpc/client.ts:42-67` configures `httpBatchLink` with `methodOverride: "POST"`, serializes
every input with SuperJSON, signs the ordered `{ path, input }` list and no longer signs an empty
GET representation. `src/app/api/trpc/[trpc]/route.ts:28-79` reconstructs that same ordered list
from the actual procedure path and indexed wire body, rejecting missing, malformed or
count-mismatched representations. Lines 157-190 parse only POST bodies and enable the intentional
tRPC POST-query override. `src/server/trpc.ts:97-139` rejects protected non-POST requests and
malformed/empty operation lists before signature verification or nonce claim.

The counterfactual coverage is specific rather than circular:

- `tests/unit/server/trpc-auth.test.ts:127-170` rejects signed GET, exact procedure substitution and
  exact input substitution before nonce access.
- Lines 195-268 exercise the production client and prove POST method, no `input` parameter, no vault
  ID/vector/`hasUnpushed` in the URL, presence in the body, required auth headers, and successful
  independent verification of the normalized wire representation.
- `tests/e2e/onboarding-vault.spec.ts:9-54` and `tests/e2e/vault-settings.spec.ts:127-190` inspect
  the real new-user and lock/unlock request flows: all captured tRPC operations are POST, URLs
  contain no serialized input or identity/vault/vector fields, and registration/get-or-create bodies
  contain no claimed hash.

This closes revision-01 F-001. The application transport no longer emits query inputs in URLs, and
the verified representation changes if either procedure or input changes.

### F-002 closure — verified self-only user rows and lifecycle cleanup

`src/server/routers/user.ts:81-235` makes `exists`, `register` and `getOrCreate` protected and uses
only `ctx.pubkeyHash` for every select, insert and duplicate-race lookup.
`src/server/schemas/user.ts: 35-95` removes hash inputs and uses strict schemas, so an authenticated
compatibility caller cannot smuggle another identity claim. Existing encrypted data can only be
returned from the verified caller's row.

`src/hooks/use-identity.ts:185-196` centralizes cleanup of in-memory identity/new-user state, active
vault storage, signing session and the complete query cache. Registration installs the confirmed
signing identity before the protected mutation at lines 242-252, exposes unlocked state only after
default-vault setup, and repeats cleanup in its failure path at lines 285-289. Legacy creation does
the same at lines 305-349; mnemonic unlock establishes its signing identity before self-only
`getOrCreate` and cleans the same state on failure at lines 362-408. Lock also clears identity-
scoped cache and vault selection at lines 423-432.

Checked-in tests cover the relevant boundary:

- `tests/unit/server/user-router.test.ts:78-123` rejects anonymous access before service-role use,
  selects/inserts the verified hash, rejects a different claimed hash, and returns an encrypted blob
  only after filtering by the verified identity.
- `tests/unit/hooks/use-identity.test.tsx:74-172` proves proof-before-registration plus session,
  selected-vault, query-cache and false-unlocked cleanup for registration and legacy creation. Lines
  174-204 preserve the existing-seed verified self-only journey.
- `tests/e2e/onboarding-vault.spec.ts:57-84` forces registration transport failure and proves no
  session, selected vault, unlocked route or stranded continue state remains.

This closes revision-01 F-002 without a data migration or caller-contract expansion.

## Cumulative database/data-integrity adjudication

Revision 02 does not weaken revision 01's database design. Source inspection of
`006_rls_hardening.sql` and the checked-in pgTAP fixtures still establishes the intended model:
direct anon/authenticated table access is denied; service grants are operation-specific; nonce and
invite redemption are atomic; vault operations are insert-only and retained across soft deletion;
legacy updates migrate into the one permanent operation source; snapshots remain replaceable cache;
and exact-caller/exact-vault service operations reject outsider and cross-vault access.

Before the final offline-only scope replacement, independent local checks completed:

| Check                                 | Independent result                      |
| ------------------------------------- | --------------------------------------- |
| focused signing/auth/user/hook Vitest | 4 files, 32/32 passed                   |
| complete unit suite                   | 46 files, 1,166/1,166 passed            |
| lint                                  | exit 0; 13 baseline warnings, no errors |
| typecheck                             | exit 0                                  |
| fresh `supabase db reset --no-seed`   | migrations 005 and 006 applied          |
| fresh `tests/database/rls-audit.sql`  | 49/49 passed                            |
| `git diff --check BASE..HEAD`         | passed                                  |

## Runtime limitation and evidence accuracy

Two coordinator scope replacements interrupted the reviewer runtime sequence. The first arrived
after the focused/full unit, lint, type and fresh 49-assertion database checks above, before
reviewer build/E2E/CLI completion. The second arrived while the seeded-upgrade reset was running; it
completed loading the legacy fixture at migration 005, but the new offline-only directive prohibited
the remaining migration-up/audit and final database reset. No browser session was started in this
revision-02 review.

Consequently, the reviewer did not independently rerun the build, 14-assertion seeded-upgrade audit,
retries-zero E2E or installed CLI journeys after the final scope replacement. The frozen implementer
evidence candidly records those results and its diagnostic corrections: production build success;
14/14 seeded upgrade; 80/80 full E2E; 32/32 focused and 1,166/1,166 full unit; plus isolated new,
existing and outsider CLI journeys. Its sanitized existing-user metrics are 10 requests, zero
non-POST/input/sensitive URLs, zero claimed-hash bodies, zero missing nonces and zero console
errors; the outsider reports anonymous 401 with no data disclosure and the same zero transport
violations. Those claims align with the exact checked-in tests and production paths and do not
conceal the two prior findings or the retained P05/P08 gaps.

The interrupted reviewer DB is locally left at migration 005 with the seeded legacy fixture; root
was notified immediately. Under the final no-database-command directive this review could not reset
it. This is an environment-cleanup limitation, not a product/source finding; root must restore the
normal latest no-seed state before integration or further package execution.

## Frozen sources, formatting and later-package boundaries

- `specs/human-scratch.md` remains SHA-256
  `db97178a044343f9a99aba1596590986c4324586ec5a64f8426590da95833aeb`, exactly 350 lines and 24,242
  bytes. All 21 SCOPE-selected blocks normalize byte-for-byte; the checked set is exactly HS-002,
  HS-017 and HS-018. HS-014 remains unchecked, as required before root integration.
- FS-001, `specs/008-transaction-percentage-allocations-settlement/spec.md`, remains SHA-256
  `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, exactly 715 lines and 25,441
  bytes.
- Repository-wide format remains red on frozen/control Markdown. The product/test range is
  formatter/diff clean; R-024 remains routed to P20B/P21 and authorizes no scratch edit here.
- P05 still owns authenticated/server-mediated Realtime and multi-client reconnect proof. P08 still
  owns real invite/member UI, fragment/key-wrap and redemption proof. P04 correctly preserves both
  later boundaries rather than claiming their journeys complete.

No new question proposal is required. Q-002's least-privilege POST/self-only default is implemented
within the exact authorized range.

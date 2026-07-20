# P11A Independent Review — Revision 01

## Review identity and verdict

- Package / requirement / revision: `P11A` / `HS-004` model checkpoint / `01`.
- Literal reviewed range:
  `eb5ab2e215130c358130d5411a92b51951c3c53a..4920dcbcb3d30b113c0df2811cbca3e718e22b0f`.
- Frozen implementation evidence: `evidence/P11A/implementation-01.md`, SHA-256
  `657c055c01ccc3edf4d183a0c250a744112cf12fb90d2ec297a5071ae064f63d`, 204 lines / 15,149 bytes.
- The implementation commit contains exactly the 12 authorized product/test paths stated in HANDOFF.
  The index was empty and HEAD exact throughout review.
- **Verdict: FAIL.** The pure one-hop resolver and several draft-level mutations are promising, but
  the production wrappers crash on successful alias mutations, the production hydration path never
  invokes repair, remove-all can leave an illegal graph and later resurrect visible aliases, the
  public application boundary still exposes the raw illegal union, and the existing management route
  bypasses the new normalization/invariant helpers. Required randomized, scale, provider,
  typed-error and remove-all evidence is also absent. Full no-retry E2E regressed 4 of 84 tests.

## Findings

### F-01 — BLOCKING: successful production alias actions return a value from an Immer recipe and crash

`useVaultAction` declares a void updater but forwards the updater's runtime return value directly
from the Mirror recipe (`src/lib/crdt/context.tsx:39-50`). JavaScript still returns values from a
function contextually typed `void`. The new named action wrappers use expression bodies or explicit
`return` for result-returning helpers, including add, delete, assign, create-and-assign, exact-name,
rename, change-one, change-all and remove-one/all (`context.tsx:481-569`). Each helper both mutates
the draft and returns a typed result. Immer therefore observes a modified draft plus replacement
result and throws:

`[Immer] An immer producer returned a new value and modified its draft.`

This is executable production behavior, not a theoretical type concern. Independent full E2E reached
`TransactionsPage` add-alias behavior through `context.tsx:50` and failed four unrelated
transaction/realtime journeys because the edit never committed:

- Realtime security: inline encrypted edit did not reach the member.
- Virtualized transaction list: the edited description remained unchanged.
- T012: Enter/Escape description editing remained unchanged.
- T013: Tab-save description editing remained unchanged.

The same wrapper also returns `(...args) => void`, so callers cannot observe any typed success,
stale-input or validation result even after the crash is fixed. Some bridge wrappers avoid the Immer
exception only by discarding the result inside a block (`context.tsx:489-501`). The generic
transaction updater similarly ignores a failed alias assignment, then still invokes the generic
update (`context.tsx:399-415`). Because the lower updater filters raw description/pointer writes but
still applies other allowed fields, one combined request can reject its alias field while applying
its notes or other fields. That violates the required typed-error/no-partial-write contract.

Required remediation is to keep every Mirror producer genuinely void while capturing and returning
the typed result outside that producer, then make the public action signature expose that result.
Every error branch, including mixed generic transaction updates, needs an exact no-write assertion
through the production wrapper rather than only direct helper calls.

### F-02 — BLOCKING: graph migration/repair is unreachable from real vault hydration

The helper factories call `migrateVaultSentinels()` after constructing a Mirror
(`src/lib/crdt/mirror.ts:80-107,118-142`), and that migration eventually calls
`repairDescriptionAliases()` (`src/lib/crdt/migration.ts:185-266`). The real application does not
use either factory. `components/providers/vault-provider.tsx` instead creates a bare
`new LoroDoc()`, hydrates it through `SyncManager.initialize()`, constructs the undo coordinator,
and gives that same document directly to the React provider (`vault-provider.tsx:155-205`). There is
no migration or repair between hydration and the first consumer read, nor any later production
invocation.

Consequently a restored legacy/partial vault, broken target, chain, cycle, stale backlink or stale
transaction reverse map reaches consumers unchanged. The implementation evidence's migration and
convergence claim is true only for test/helper Mirrors, not for the shipped provider. It also means
the promised system-origin exclusion is never exercised on the application's actual hydration
lifecycle.

The repair must be wired into the sole production initialization path after all durable hydration
and before the document is exposed to consumers/undo. A provider-level integration test must load a
malformed or legacy snapshot through that exact path and prove legal/idempotent state on first
consumer access, encrypted persistence/sync, and no user-history step.

### F-03 — BLOCKING: remove-all violates the active graph invariant and is not repair-stable

`removeAllDescriptionAliases()` removes a backlink only when the supplied node is itself a symlink,
then soft-deletes only that one node (`src/lib/crdt/description-aliases.ts:364-376`). If the
supplied node is a real alias with active inbound symlinks, every inbound node remains active and
still points to a deleted target. The target retains the active backlinks. That immediately violates
the stated legal graph and exact-backlink invariants.

Although reads temporarily render those references as empty because one-hop resolution rejects the
deleted target, the next repair converts each now-broken active symlink to a real alias using its
retained recovery name (`migration.ts:64-73,101-123`). Transactions that point directly to those
nodes become visible as aliased again. Thus “Remove from all” is not stable across the package's own
mandatory repair and can effectively resurrect part of the removed visible group. Passing a symlink
ID deletes only that internal node rather than the resolved final-real group.

No test imports or invokes `removeAllDescriptionAliases`; neither a direct target with inbound
symlinks nor a direct transaction pointer on an inbound symlink is covered. The operation needs a
preflighted legal group outcome, exact forward/backlink updates, idempotent repair stability and one
real undo/redo step.

### F-04 — BLOCKING: the application boundary still exposes illegal real/symlink combinations

The wire schema necessarily retains a symlink recovery name, but the inferred exported application
type still has required public `name`, optional `kind`, optional `targetAliasId`, and public
`symlinkIds` (`src/lib/crdt/schema.ts:94-106,381,404-407`). It therefore permits a real-with-target,
a symlink-without-target, and a symlink used as a named real alias. `useDescriptionAliases()`
returns that raw map directly (`src/lib/crdt/context.tsx:148-152`). Existing components import and
consume the raw exported type.

`LegalDescriptionAlias` and `toLegalDescriptionAlias()` correctly omit the symlink recovery name and
reject some illegal values (`src/lib/domain/description-aliases.ts:23-68`), but they are an opt-in
adapter used by selected domain helpers. They do not establish the required typed boundary for
application reads or writes. A caller remains free, and type-correct, to display a symlink's
recovery name or create an illegal combination.

The wire-recovery representation may remain internal, but public selectors, inputs and named
mutations must expose/accept the discriminated legal union only. Compile-time/type tests should
reject all impossible combinations at that boundary.

### F-05 — BLOCKING: the shipped management route bypasses normalization and the named model actions

The existing `/tx-descriptions` route remains wired to a private `useVaultAction` that directly
assigns, `Object.assign`s and tombstones raw aliases (`DescriptionAliasesTable.tsx:17-18,37-66`).
Create trims only and writes no explicit legal kind (`DescriptionAliasesTable.tsx:96-117`); rename
also directly applies its raw payload. It does not use the new create/rename/delete helpers.

Independent installed-CLI counterexample on the real route:

1. Create `Café Review`, then rename it with the canonically equivalent decomposed input
   `Cafe\u0301 Reviewed`.
2. The displayed and synced value remains decomposed instead of the selected trim + NFC policy.
3. Create the precomposed `Café Reviewed`.
4. The route accepts it as a second alias and displays two visually equivalent active aliases.

This is within P11A's model/invariant checkpoint, not a request for P11B's new autocomplete/cell UX.
Deferring direct adoption of named actions to P11B leaves the current management creation and rename
paths capable of manufacturing states that P11A says are normalized and canonical. It also means the
route's delete behavior is a separate raw tombstone path rather than the reviewed remove-all
semantics. P11A must establish one model path for existing management CRUD before P11B builds more
consumers on it.

### F-06 — BLOCKING: required model evidence is materially incomplete

The focused tests pass, but they do not establish the acceptance surface assigned to this package:

- `description-alias-mutations.test.ts` contains nine examples plus one property. It never imports
  or calls `removeAllDescriptionAliases` or `renameDescriptionAlias`.
- The only property runs 40 cases of assignment/removal across six transactions and three aliases
  (`description-alias-mutations.test.ts:293-332`). It does not randomize create, rename, change-one,
  change-all, remove-all, delete, concurrent plans, malformed graphs or repair. No replay seed is
  frozen in the evidence.
- Only change-all is placed inside a real `VaultUndoCoordinator` step
  (`tests/integration/description-alias-crdt.test.ts:132-173`). The other required atomic operations
  do not prove one complete production undo/redo step.
- Migration tests manufacture invalid state in a helper Mirror and explicitly call repair. They do
  not cover the real provider path, a missing alias map/snapshot lifecycle, or production
  invocation.
- The opposing-peer test exchanges user operations, then invokes repair independently on both peers
  and compares them (`description-alias-crdt.test.ts:84-130`). It does not exchange repair updates,
  reopen through production hydration, or prove durable post-repair convergence.
- There is no large alias map, scale assertion, exact proxy-read instrumentation beyond the small
  resolver unit, complete typed-error/no-partial-write matrix, management-normalization integration,
  or remove-all/repair-stability case.
- The unchanged management E2E covers CRUD/navigation only. It cannot detect the production inline
  alias crash and does not test normalization-equivalent duplicates.

The missing evidence is particularly material because F-01, F-02, F-03 and F-05 occur precisely at
those untested boundaries.

## Sound implementation material retained for remediation

- `resolveAlias()` performs a direct source lookup and, for a symlink, one direct target lookup; it
  rejects deleted/missing/illegal targets and chains (`domain/description-aliases.ts:109-129`). This
  is the intended O(1) one-hop shape.
- Direct helper create/assign/exact-name/change-one/change-all/remove-one and transaction/import
  unlinking generally preflight their local inputs before changing the draft. Raw imported
  descriptions remain filtered from the generic low-level updater.
- Repair is deterministic by sorted IDs, flattens paths, elects a lexicographic cycle root, retains
  recovery names and rebuilds reverse maps. Its helper-level idempotence test is useful once it is
  made reachable and removal semantics are compatible with it.
- The implementation introduces no dependency, server/auth/crypto/configuration change or
  unauthorized product/test path.

These positives do not overcome the production and invariant failures above.

## Independent automated validation

| Check                                                                                                                      | Independent result                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused P11A Vitest command over the four assigned alias/domain/integration files, repeated in three independent processes | PASS each run, 4 files / 68 tests.                                                                                                                                               |
| `pnpm test`                                                                                                                | PASS, 52 files / 1,200 tests.                                                                                                                                                    |
| `pnpm typecheck`                                                                                                           | PASS. The contextual `void` signature masks F-01 rather than proving runtime correctness.                                                                                        |
| `pnpm lint`                                                                                                                | PASS with 0 errors / 12 inherited warnings.                                                                                                                                      |
| `pnpm build`                                                                                                               | PASS, 17 routes.                                                                                                                                                                 |
| `pnpm exec oxfmt --check` on all 12 P11A product/test paths                                                                | PASS.                                                                                                                                                                            |
| `git diff --check eb5ab2e215130c358130d5411a92b51951c3c53a..4920dcbcb3d30b113c0df2811cbca3e718e22b0f`                      | PASS.                                                                                                                                                                            |
| `pnpm format:check`                                                                                                        | Inherited FAIL only on `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`, `RISKS.md` and frozen `specs/human-scratch.md`; every P11A path is clean. |
| `pnpm exec playwright test tests/e2e/description-aliases.spec.ts --retries=0 --repeat-each=3 --workers=1 --reporter=line`  | PASS, 6/6. This unchanged management CRUD test does not reach the new named action wrappers or NFC-equivalent duplicate case.                                                    |
| `pnpm exec playwright test --retries=0 --workers=4 --reporter=line`                                                        | **FAIL, 4 failed / 80 passed in 1.6 minutes.** All four failures are executable consequences of the Immer return-and-mutate exception in F-01.                                   |

The full-suite failures were `realtime-security.spec.ts` inline encrypted edit,
`transaction-virtualized.spec.ts` large-list edit, and transaction description cases T012
(Enter/Escape) and T013 (Tab-save). Failure artifacts showed the original description remained
unchanged; the Realtime member never received the edit. The task dev log captured the exact Immer
exception at `context.tsx:50`, reached from the transaction page's add-alias action.

## Independent installed-CLI UX, accessibility, sync and privacy evidence

- Used the repository-installed headless `playwright-cli` with disposable session `review-p11a-r01`,
  the real Next application and local encrypted sync service. No recovery phrase, private key or
  durable secret was printed. No route was mocked and no arbitrary sleep was used.
- Created `Café Review` from the visible management UI. One global Undo removed the complete alias;
  one Redo restored it. Rename and the two-click delete confirmation worked, and delete was one
  complete undo/redo step on this legacy direct path.
- A duplicate tab loaded the same alias with its own empty history. An offline rename appeared
  locally, undid/redid as a whole, remained pending, and after the sole network-online transition
  reached `Saved` and appeared in the peer. Remote receipt did not create a peer history step.
- A successful `sync.pushOps` body contained only vault/operation identifiers, ciphertext and a
  version vector; neither alias plaintext was present.
- The NFC-equivalent duplicate counterexample in F-05 was reproduced after peer/offline checks. All
  manually seeded alias records were subsequently deleted and the final visible state returned to
  zero aliases with status `Saved`.
- At 320x720, ordinary zoom, `scrollWidth == viewport == 320`; no button, input or link was out of
  bounds. The route remained legible in light and app dark-token modes with reduced motion active.
  The alias card, Add button and explanatory copy retained clear visual hierarchy. Expanded and
  collapsed 1440x900 desktop layouts both had no horizontal overflow.
- Keyboard traversal reached Add Alias, Edit and Delete in order. The inherited controls expose
  semantic button names. The route's visual/responsive surface is usable; the model integration, not
  layout, is the reason for FAIL. Full P11B cell/modal accessibility and P11C large virtual
  transaction UX remain correctly deferred.
- Forced-offline browser errors were expected failed sync/Realtime requests. After reconnect and on
  the final clean online page, the console had zero errors and zero warnings.

## P11B/P11C deferral boundary

This review does not require P11A to implement P11B's complete autocomplete, caret preservation,
keyboard grid handoff, shared-alias modal, tooltip or focus behavior, nor P11C's complete
import/manual/refresh/concurrent-tab/large-virtualized transaction journeys. It does require the
P11A model to be callable by production consumers, legal after every operation, repaired during
production hydration, normalized through the already shipped management route, and proven at its
assigned invariant boundaries. F-01 through F-06 are therefore P11A defects, not deferred feature
requests.

## Q proposal adjudication

### Q-PROPOSAL-P11A-01-01

The proposal is complete and suitable for root transcription. Option A — trim + NFC with
case-sensitive equality — is deterministic, data-preserving and reversible. The direct helpers
implement it. F-05 shows that the shipped management route does not yet honor the selected default,
so transcription must not be read as implementation approval.

### Q-PROPOSAL-P11A-01-02

The proposal is complete and suitable for root transcription as the provisional policy: reject stale
local destructive intent, use non-resurrecting deletion, then deterministically repair merged
graphs. The current implementation does not realize that policy in production because repair is
unreachable (F-02), and remove-all followed by repair can restore visible aliases (F-03). The
proposal remains useful authority for remediation but cannot support a PASS in this revision.

No new ambiguity requires a Q proposal. The findings above are decided directly by frozen legal
state, atomicity, migration, management and evidence requirements.

## Boundary, frozen-source and cleanup verification

- Final reviewed product/test HEAD is exactly `4920dcbcb3d30b113c0df2811cbca3e718e22b0f`; the index
  is empty. Before this review file, dirt was only root-owned `HANDOFF.md`, root-owned
  `PROGRESS.md`, and frozen untracked `evidence/P11A/implementation-01.md`. I made no product, test,
  ledger, configuration, marker or frozen-evidence edit.
- Scratch SHA-256 is `c2b986fd3e952190149b2d3e87530f5cfad6f180d452c881f93984c36f2471ae`, 350 lines /
  24,245 bytes. The 21 ordered normalized HS blocks byte-match `SCOPE.json`; the checked set remains
  exactly HS-002/HS-006/HS-010/HS-014/HS-017/HS-018. HS-004 remains unchecked.
- FS-001 remains SHA-256 `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715
  lines / 25,441 bytes. `SCOPE.json` remains SHA-256
  `d03f33e718f1ec5f7c8ad0119d283397dcc59407199da4b5887a2e5eee7ef0f9`, 450 lines / 27,382 bytes, with
  22 unique requirements: 21 HS and the immutable whole-file FS-001 selector.
- Closed both CLI tabs and the disposable browser, cleared its local data, stopped the task-owned
  dev server, removed every manually seeded alias through the visible UI, and moved the exact
  generated `.playwright-cli` and `test-results` directories to desktop trash; they are recoverable
  and absent from the workspace. No task-owned Next, Playwright test or CLI process remains.
- Full-E2E and manual runs regenerated `next-env.d.ts`; it was restored byte-for-byte to reviewed
  HEAD and has no final diff.

## Single final verdict

**FAIL.** P11A revision 01 is not suitable for integration. Remediation must close F-01 through F-06
and receive independent review over a new immutable revision range/evidence artifact.

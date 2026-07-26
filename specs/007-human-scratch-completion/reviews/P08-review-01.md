# P08 Independent Review — Revision 01

## VERDICT: CHANGES_REQUESTED

- **Reviewer:** `p08-reviewer-01` (independent fresh-context; not the implementer, not the scope
  adjudicator)
- **Date:** 2026-07-26
- **Range reviewed:** BASE `c5c99195bef523c1d4ba2f55e54c886a1aa68533` → HEAD `d2762f9`, restricted
  to `src/**` and `tests/**` (`git diff c5c9919 d2762f9 -- src tests`; 34 files, +1661/-136). The
  intervening `d7e9e47` is root ledger-only and was ignored, as was the later ledger-only `565cbd8`
  (`git diff --stat d2762f9 HEAD -- src tests` is EMPTY — no product drift after the reviewed
  commit).
- **Standard applied:** the D-018 boundary-safe definition-of-done (HANDOFF items 1-6), NOT D-013's
  29 clauses. Every finding below was reproduced by the reviewer, not taken from the implementer's
  narrative.

**Blocking findings: 1**

- **B-2** — DoD items 4/5: accepting an invite does not switch the member into the shared vault, so
  the HS-012 acceptance-gated Person materialization does not run on the real journey, and the
  consume-once marker is stranded. Reproduced live; the shipped E2E cannot catch it because it
  asserts only on the DB membership row, never on what the member's app actually opens.

**WITHDRAWN — B-1 (removal without rekey).** My revision-01 draft raised this as a second blocker.
On a supplemental fact-check I performed the BASE-side query I should have run the first time, and
it refutes my own finding: `rekeyVault` / `performCompleteRekey` had **zero** callers at BASE too.
Rekey was NEVER auto-triggered — not before P08, not after. There is therefore no BASE guarantee to
downgrade. The full evidence and corrected ruling are in "DoD item 3" below; the item is **MET**. I
record the withdrawal rather than silently deleting it, because the error is instructive: I inferred
"BASE had no removal UI, so a new removal UI must be a regression" without checking whether the
_rekey_ half had ever been wired to anything. It had not.

The remaining blocker is neither a boundary violation nor a secret leak. The cryptographic core
(DoD 1) is genuinely fixed and is good work.

---

## Boundary re-verification (independently reproduced)

```
git diff c5c9919 d2762f9 -- src/server/routers/realtime.ts src/lib/supabase/realtime.ts \
    src/server/schemas/realtime.ts supabase/migrations
```

**EMPTY.** Confirmed by my own run, not by the implementer's claim. No `vault_ops` schema/scoping
change, no new migration anywhere in the diff.

I additionally grepped the whole reviewed diff for excised-machinery vocabulary
(`epoch|access_generation|exact_operation_id|frontier|journal|saga|capability sign|pendingAcceptances|pendingCreations|causal repair|fence`):
**zero hits.** No epoch machinery was introduced. DoD item 3's "no new epoch machinery" half is
satisfied.

---

## DoD item 1 — real, secure invite redemption: **MET**

The `sodium.randombytes_buf(48)` placeholder is GONE. Verified by reading the diff at
`src/app/(onboarding)/invite/[token]/page.tsx:176-196`: the page now calls `redeemRealVaultKey` →
`selfWrapVaultKey` and passes the resulting `membershipKey` to `invite.accept`.

- **Real authenticated `crypto_box`.** `src/lib/vault/invite-redemption.ts:79-91` unwraps via
  `unwrapKeyFromBase64(encryptedVaultKey, senderEncPublicKey, inviteSecretKey)` — sender-bound
  `crypto_box_open_easy`, not a sealed box — and length-validates the recovered key to exactly 32
  bytes (`:86-88`). `selfWrapVaultKey` (`:108-113`) re-wraps sender==recipient==self, matching the
  convention `VaultProvider` unwraps with (`src/components/providers/vault-provider.tsx:164-171`).
- **Sender key resolved SERVER-SIDE, no caller-claimed sender, no schema change.**
  `src/server/routers/invite.ts:130-146` resolves the owner's `enc_public_key` from
  `vault_memberships` keyed on `vault_id` + `invite.created_by` — both server-held. The client
  cannot influence which sender key is used. `senderEncPublicKey` is added to the _output_ schema
  only (`src/server/schemas/invite.ts:118-122`); no DB migration. Correct.
- **Fail-closed.** Missing owner membership or a null `enc_public_key` throws NOT_FOUND
  (`invite.ts:141-146`) rather than proceeding with a partial result. The persisted role is narrowed
  with `vaultRoleSchema.safeParse` (`:156-162`) instead of the previous `as` cast — a genuine
  type-safety improvement consistent with the repo's no-`as` rule.
- **Fragment discipline.** The secret is read only from `window.location.hash` (`page.tsx:164`) and
  is passed to `deriveInviteKeypairFromFragment`. It never enters a path, query, log, or network
  payload — only the derived _public_ `invitePubkeyBase64` is sent to the server (`page.tsx:192`).
  Verified by reading the whole handler.

**Security proof reproduced.** `tests/unit/vault/invite-redemption.test.ts` contains a genuine RED
test proving the old placeholder was insecure (`:107-131` — the random 48-byte membership key fails
to unwrap and cannot equal a real envelope), plus wrong-sender/tampered rejection (`:91-105`) and
the full owner→invite→invitee round-trip proving key equality (`:55-89`). Synthetic keys only,
generated per-test. I ran these: **3/3 pass.**

Rejection coverage across the surfaces: expired (`invite-get-by-pubkey.test.ts:151-157`),
nonexistent (`:125-131`), unresolvable sender (`:133-149`), tampered/wrong-sender (unit `:91-105`).
Revocation and single-use reuse are enforced by the pre-existing `accept` path and
`accept_vault_invite` RPC, unchanged by P08 — acceptable, since P08 did not regress them, though see
N-2.

## DoD item 2 — reachable, authoritative access surface: **MET**

- **New surface is in Vault Settings, not People.**
  `src/components/features/vault/AccessMembersSection.tsx` (206 lines, new) renders "Access &
  Members" and is mounted at `src/app/(app)/settings/page.tsx:28`. It provides invite generate/copy
  (via `InviteLinkGenerator`, `:92-98`), invite revoke (`:191-193`), member list (`:113-153`) and
  member remove (`:139-144`).
- **Dead People-page hardcoding REMOVED.** `src/app/(app)/people/page.tsx` no longer contains
  `isOwner = false` / `vaultKey: Uint8Array | undefined = undefined`; the props were deleted from
  `PeopleTable`'s interface entirely (`PeopleTable.tsx:26-31`) so the stale values are now
  unrepresentable rather than merely unused. People keeps its financial semantics (balances,
  allocations, add/edit/delete person) untouched.
- **Server-side role authorization actually enforced — I verified the server, not the UI.**
  `src/server/routers/membership.ts:102-107` rejects a non-owner `remove` with FORBIDDEN _before_
  any delete, and `:196-201` rejects a non-owner `rekey`. `invite.create`/`revoke`/`list` are
  owner-gated server-side in the pre-existing router. The `isOwner &&` guards in
  `AccessMembersSection` are cosmetic on top of a real server check, which is the correct
  arrangement.
- `useVaultAccess` (`src/hooks/use-vault-access.ts`) derives role and vault key from the caller's
  own membership envelope (sender==self, `:70-79`) rather than threading secret bytes through
  context — a clean replacement for the deleted hardcoding.

## DoD item 3 — member removal via the EXISTING preserved path only: **MET** (B-1 withdrawn)

Adjudicated afresh against BASE-vs-HEAD code after a supplemental fact-check. My revision-01 draft
ruled this NOT MET; **that ruling was wrong and is withdrawn.** The corrected ruling and the
evidence that overturned it follow.

### 1. What did removal actually do at BASE `c5c9919`?

Three separate BASE-side queries, run by me:

```
# (a) Was there ANY reachable removal UI at BASE?
$ git grep -n "membership\.remove\|removeMutation\|Remove member" c5c9919 -- src
c5c9919:src/lib/crypto/rekey.ts:8          # doc comment
c5c9919:src/server/routers/membership.ts:8 # doc comment
   -> NO caller. No removal UI existed at BASE.

# (b) DECISIVE — was the rekey half EVER wired to anything at BASE?
$ git grep -n "rekeyVault\|performCompleteRekey\|reencryptSnapshot" c5c9919 -- src \
      | grep -v src/lib/crypto/rekey.ts
c5c9919:src/lib/crypto/index.ts:80,83,84   # barrel re-exports ONLY
   -> ZERO call sites. Rekey was never auto-triggered at BASE.

# (c) Same query at HEAD:
$ git grep -n "rekeyVault\|performCompleteRekey" d2762f9 -- src | grep -v src/lib/crypto/rekey.ts
d2762f9:src/lib/crypto/index.ts:80,84      # barrel re-exports ONLY
   -> unchanged.
```

So at BASE: no removal UI, **and** `src/lib/crypto/rekey.ts` was already dead code reachable only
through a barrel export. The router header (`membership.ts:7-13`) documents a six-step flow, but
that flow was **never** automated in the product — step 6 (`membership.rekey`) has always been a
separate, manually-invoked step that nothing in the client ever called. Rekey was aspirational
documentation at BASE, not a live guarantee.

### 2. Does exposing remove-without-rekey introduce a NEW regression vs BASE?

**No.** This is where my draft finding failed. I reasoned "BASE had no removal UI, therefore any new
removal UI is a downgrade" — but I never checked whether the rekey half had ever been wired to
anything. Query (b) shows it had not. The correct comparison is:

|                          | BASE                     | HEAD                          |
| ------------------------ | ------------------------ | ----------------------------- |
| Reachable removal UI     | none                     | owner-only, server-authorized |
| Membership row deleted   | n/a                      | yes                           |
| RLS/fetch access revoked | n/a                      | yes                           |
| Vault key rotated        | **never** (0 call sites) | **never** (0 call sites)      |

There is **no BASE path that rotated the key**, so there is no rotation guarantee for HEAD to
silently weaken. HEAD strictly _adds_ capability (owner-only membership revocation) on top of an
unchanged key-rotation posture. A capability that did not exist cannot be downgraded.

What removal genuinely delivers at HEAD, verified in the schema rather than assumed:

- `vault_ops` RLS is membership-scoped — `is_vault_member(vault_id)` (`005_vault_ops.sql:437,461`)
  resolves live against `vault_memberships` (`:114-123`). Deleting the row immediately revokes both
  read and insert of future ops.
- The realtime path re-checks membership on **every** message, not just at token issue:
  `realtime_grant_allows` (`007_realtime_authorization.sql:45-66`) JOINs `realtime_grants` against
  `vault_memberships` and additionally requires
  `revoked_at IS NULL AND expires_at > clock_timestamp()`. With `REALTIME_TOKEN_TTL_SECONDS = 60`
  (`src/server/routers/realtime.ts:16`), a removed member's live stream dies as soon as the
  membership row is gone.

So a removed member loses future-envelope access at exactly "the strength the preserved boundary
already provides" — the D-018 item-3 wording. The residual — they retain a copy of the current vault
key and any data already downloaded — is precisely the limit D-018 rules OUT of scope, and which the
adjudication notes even the full 29-clause contract conceded it could not fix
(`adjudications/P08-scope-01.md:104-109`).

### 3. Ruling against frozen HS-011 intent + D-018 item 3

**MET.** Frozen HS-011 asks about the UX for _adding_ users and _where_ access management lives; it
never mentions removal, re-keying, or forward secrecy (`adjudications/P08-scope-01.md:56-61`). D-018
puts epoch/forward-secrecy rotation firmly OUT. The escape clause ("removal may ship as the
pre-existing behavior unchanged; either way no NEW security regression") is satisfied on its
operative condition: **no new regression**, because rotation was never wired at BASE. The literal
"must invoke rekey" wording does not bind here, per the lead's correct instruction not to auto-fail
on literal wording when BASE never rotated either — and I have now verified that BASE did not.

The "no new epoch machinery" half is also satisfied: zero hits across the diff for
`epoch|access_generation|exact_operation_id|frontier|journal|saga|fence` etc.

**Residual, non-blocking (folded into N-4).** Auto-wiring rotation on removal would be a genuine
improvement and the server already returns `remainingMembers` + `enc_public_key`
(`membership.ts:146-167`) to enable it. But it is optional hardening with no frozen mandate, exactly
the class D-018 defers. Two things are still worth doing on revision, neither blocking: (i) the UI
should not imply rotation occurred — the binding task requires removal/rekey implications be
"explicitly handled and explained" (`tasks/HS-011-membership-invite-ux.md:41-42`), and a one-line
note near the remove control that access is revoked but the key is not rotated would discharge that
honestly; (ii) the DoD-5 removal-authorization integration test is still absent (see item 5).

## DoD item 4 — HS-012 auto-linked Person: **PARTIALLY MET (B-2)**

The pure logic is correct and well-tested; the wiring onto the real acceptance journey is not.

**What is correct (verified by reading and by live reproduction):**

- Deterministic and idempotent. `src/lib/crdt/person.ts:76-112`: an existing non-deleted person
  linked to the pubkey hash short-circuits (`:84-88`); otherwise the id is
  `person-member-<pubkeyHash>` (`:54-56`), so concurrent tabs / refresh / re-add converge to the
  SAME CRDT map key — the property that makes convergence a data-model guarantee rather than a race.
  Keyed on the stable pubkey hash per Q-032.
- Owner adopts `person-default-me` in place. `ensureMemberPerson(..., {adoptDefaultPerson: true})`
  (`person.ts:91-101`) links the seeded person only if it is still unlinked, and is invoked at vault
  creation _before_ the snapshot is exported (`src/lib/vault/ensure-default.ts:150-153`) — so the
  owner's link is baked into the initial snapshot and costs no post-open op. Good design.
- **Financial state untouched.** `ensureMemberPerson` mutates only `linkedUserId` on adoption and
  otherwise inserts a new person; it never touches `ownerships` or allocations. Because adoption is
  in-place on `person-default-me`, the default account's `{"person-default-me": 100}` ownership
  remains valid. Confirmed by inspection and by the passing allocation/settlement suites.
- **Legacy duplicates preserved, never auto-merged** (Q-031): there is no merge/delete path anywhere
  in `person.ts`.
- **`Person.name` optional with a centralized resolver.** `schema.ts:46-48` makes `name` optional;
  `resolvePersonDisplayName` (`person.ts:42-51`) resolves explicit-name → `Member <first-8>` →
  `"Unnamed"`. **A raw pubkey hash is never rendered** — the fallback truncates to 8 chars
  (`person.ts:34-36`), and the fast-check property at `tests/unit/crdt/person.test.ts:49-58` proves
  the resolver never returns empty. I confirmed live that a joining member renders as
  `Member 69890aed`, never a full hash.

**B-2 — the linkage does not run on the real journey.** I reproduced this with a throwaway
two-context Playwright probe (since deleted; working tree left clean):

```
PROBE memberOwnVault=70d874e2-...  sharedVault=aa8dc9fc-...  activeAfterAccept=70d874e2-...
      openedShared=false  pendingMarkerStillSet=true
PROBE memberPeoplePage="... People (1) ... Me / You ..."
```

After accepting the invite, the member is redirected to `/transactions` but the **active vault is
still their own**, not the shared one. Tracing the cause: the acceptance handler
(`page.tsx:191-203`) calls `acceptMutation` then `markPendingPersonLink(inviteInfo.vaultId)` then
`router.push("/transactions")` — it never calls `setActiveVault`/`setActiveVaultStorage`. The
reconciliation effect in `vault-provider.tsx:136-140` only reassigns the active vault when the
current selection is _inaccessible_; the member's own vault is still perfectly accessible, so the
selection stands. `consumePendingPersonLink` is therefore never reached for the shared vault, the
`sessionStorage` marker remains set (confirmed above), and no Person materializes.

Because the marker is **`sessionStorage`** (`pending-person-link.ts:20,25,35`), it is also lost on
browser restart, on a new tab, and on any acceptance completed in a different tab from the one that
later opens the vault. Combined with consume-once semantics, a member who is not linked on that
exact first open is never linked at all — there is no reconciliation path, since the every-open call
was deliberately removed.

I confirmed the underlying logic is sound once reached, by forcing the switch the way
`VaultSelector` would:

```
PROBE2 activeNow=<sharedVault> isShared=true markerStillSet=false
PROBE2 memberPeoplePage="... People (2) ... Me / Linked to identity: 33c7a410... ;
                                            Member 69890aed / You ..."
PROBE2 ownerPeoplePage="... People (2) ... Me / You ; Member 69890aed / Linked ..."
```

So linkage, convergence across both peers, and the non-identifying fallback all work correctly — the
defect is purely that acceptance does not deliver the member into the shared vault. Per HS-012's
acceptance direction ("On vault creation **and invite acceptance**, idempotently ensure one linked
Person for that member"), the acceptance half is currently not delivered on the real journey.

**Suggested fix (reviewer's judgment, implementer's choice):** call
`setActiveVaultStorage({ id: inviteInfo.vaultId })` in the acceptance handler before `router.push`,
which both fixes the journey and makes the marker fire immediately. Consider also making the marker
resilient (localStorage, or a cheap "is this member already linked in the doc?" check on open —
`ensureMemberPersonLinked` already returns `false` when nothing changed, so an unconditional call
writes nothing for an already-linked member and would not reintroduce the realtime regression; that
is worth re-measuring rather than assuming).

## DoD item 5 — real tests: **PARTIALLY MET**

Present and genuinely good:

- Unit/property for the resolver and idempotent linkage — `tests/unit/crdt/person.test.ts` (15 tests
  incl. a fast-check property), `tests/unit/crdt/ensure-member-person-linked.test.ts` (4, doc-level
  change reporting + idempotence + two distinct linked persons).
- Crypto round-trip and the RED placeholder guard — `tests/unit/vault/invite-redemption.test.ts`
  (3).
- Integration for the server half of redemption — `tests/integration/invite-get-by-pubkey.test.ts`
  (6), covering sender-key resolution and four rejection paths.
- A two-user E2E over the REAL invite UI — `tests/e2e/invite-redemption.spec.ts` drives Vault
  Settings → generate → member accepts, with **no** service-role admin-key-wrap bypass on the
  journey. `createAdminClient` is used only by the _assertion_ helper to read the stored membership
  row (`tests/e2e/helpers/invite.ts:62-71`), which is legitimate test instrumentation, not a bypass
  of the flow under test. The key-equality assertion is exactly the right discriminator, since the
  old placeholder also reached the success screen.

Gaps:

- **No integration test for removal + rekey authorization** — required verbatim by DoD 5
  ("integration tests ... for removal+rekey authorization"). I searched: no test anywhere exercises
  `membershipRouter.remove` or `.rekey`. `tests/integration/invite.test.ts` covers only Zod _schema_
  shapes for `membershipRemoveInput`/`membershipRekeyInput`, not the FORBIDDEN paths at
  `membership.ts:102-107` and `:196-201`. Non-blocking on its own (the authorization it would cover
  is pre-existing, server-side and unchanged by P08 — I read it directly), but it is a literal DoD-5
  item and is cheap to add now that removal is reachable from the UI.
- **The E2E stops short of the DoD's journey.** DoD 5 and the binding task require the invitee to
  "decrypt the SAME vault, **sync edits bidirectionally**, see permissions, then
  removal/revocation", and to accept "twice/concurrently to prove person idempotence". The shipped
  spec asserts key equality at the DB layer and ends. That is a real and well-chosen assertion, but
  because it never checks what the member's _app_ opens, it passes while B-2 is live. An E2E that
  asserted the member sees the shared vault's People/transactions would have caught it.

## DoD item 6 — gates: reproduced

All run by me on a clean tree at `d2762f9`'s product state:

| Gate                        | Result                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm typecheck`            | **PASS** (exit 0, clean)                                                                |
| `pnpm lint`                 | **PASS** (exit 0; 0 errors, 10 warnings)                                                |
| `pnpm test`                 | **PASS** — 82 files, **1714 passed, 2 skipped**                                         |
| `pnpm test:e2e --retries=0` | **PASS** — **123 passed, 0 failed** (2.7m), incl. `invite-redemption.spec.ts:21` (6.4s) |
| `pnpm format:check`         | FAILS — **16 files, ALL `specs/**`\*\*                                                  |

- The 10 lint warnings are all pre-existing unused-vars in `TransactionTable.tsx`, `crdt/queries.ts`
  and four `tests/unit/crdt/transaction-*|hierarchical-schema` files — **none** of which appear in
  P08's 34 changed paths. Not attributable.
- `format:check`'s 16 failures are exclusively root-owned ledger/spec/evidence/review docs
  (DECISIONS, DEPENDENCIES, HANDOFF, PROGRESS, QUESTIONS, RISKS, P12/P14/P16D/P19 evidence, P12
  reviews, `human-scratch.md`). Pre-existing per Q-024, and P08 is forbidden to touch them. I
  confirmed **every changed src/tests file is itself format-clean**:
  `git diff --name-only c5c9919 d2762f9 -- src tests | xargs pnpm exec oxfmt --check` → _"All
  matched files use the correct format"_, 34 files, exit 0.

Note: `pnpm typecheck` rewrites `next-env.d.ts` (a Next.js build artifact) as a side effect. I
reverted it; the tree is clean apart from the intentionally uncommitted `evidence/P08/`.

## Secret-safety: **PASS**

- No vault master key, fragment secret, `crypto_box` secret material, seed phrase, recovery
  material, `SUPABASE_JWT_SECRET` or vault plaintext appears in any changed source, any test, or
  this review.
- Tests use synthetic material only: freshly generated mnemonics/keypairs
  (`invite-redemption.test.ts:29-33`) and obviously-fake base64 literals
  (`invite-get-by-pubkey.test.ts:69-71`), plus a placeholder nonce string in
  `auth-batch-nonce.test.ts:32`.
- The E2E compares the recovered vault key **in memory** and returns only a boolean
  (`tests/e2e/helpers/invite.ts:57-72`); the key is never logged, returned, or written to an
  artifact.
- I grepped every added line in the diff for `console.log|warn|error`: **zero additions.**

**Pre-existing leak genuinely fixed:** `src/lib/vault/ensure-default.ts` previously ran
`console.log(doc.toJSON())`, dumping the entire decrypted vault (people, accounts, all financial
plaintext) to the console on every vault creation. Its removal is confirmed in the diff and is a
real security improvement squarely inside P08's own domain — correctly in scope and correctly
disclosed.

---

## Judgment on each flagged out-of-surface change

**`src/server/trpc.ts` (request-scoped nonce memo) — JUSTIFIED, correct, and I verified all four
sub-claims.**

(a) _The fix is correct._ `createContext` is invoked once per HTTP request by the fetch adapter
(`src/app/api/trpc/[trpc]/route.ts`), so `nonceClaims` is genuinely request-scoped. The memo stores
the _promise_ and the get/set is synchronous (`trpc.ts:184-201`), so concurrently-dispatched batched
procedures cannot each start a claim — the second awaits the first's promise. This is the right
concurrency primitive; a naive "await then cache" would still race.

(b) _Replay protection is PRESERVED._ A replayed HTTP request is a new request → new context → new
empty Map → it re-calls `claim_request_nonce`, which the DB rejects. I confirmed the existing replay
test still passes: `tests/unit/server/trpc-auth.test.ts:101` ("rejects replay when the database
nonce claim loses the unique race") — **10/10 pass** across that file plus the new guard. Signature
verification and body-substitution rejection run _before_ the nonce claim and are untouched
(`trpc-auth.test.ts:112+` still green).

(c) _No preserved boundary touched_ — `trpc.ts` is not in the P04/P05 preserved set, and the
realtime router/lib/schema and migrations diffs are empty.

(d) _The regression guard genuinely fails without the fix._ I proved this rather than trusting it: I
reverted the memo to a direct `claimRequestNonce` call and re-ran
`tests/integration/auth-batch-nonce.test.ts` → **2/2 FAILED** with
`UNAUTHORIZED: Request authentication failed` thrown at `trpc.ts:195`. I then restored the file and
confirmed `git diff src/server/trpc.ts` is empty and the tests pass again. The guard is real.

The latent bug is also real and worth fixing: `httpBatchLink` coalesces `membership.list` +
`invite.list` (dispatched concurrently by the new surface) into one signed POST with one `X-Nonce`,
and every procedure after the first was rejected. This is the correct minimal fix at the correct
layer.

**`src/lib/vault/ensure-default.ts` (removed plaintext `console.log`) — JUSTIFIED.** In-domain,
disclosed, and a strict security improvement. See secret-safety above.

**The broader `Person.name`-optional ripple — JUSTIFIED and behavior-preserving.** I read all seven
files. Every change is the mechanical consequence of `name` becoming optional, adopting the
centralized resolver at a display site:

- `PersonRow.tsx:47,67` — `useState(person.name ?? "")` (required, since `name` may now be
  undefined); `:146-148` renders the resolver. The `isCurrentUser` "You" badge is pre-existing and
  unchanged.
- `PeopleTable.tsx:85` — sort comparator now compares resolved names (was `a.name.localeCompare`,
  which would now throw on undefined). Necessary, not cosmetic.
- `BalanceSummary.tsx:78-79`, `AccountRow.tsx:130-134`, `OwnershipEditor.tsx:67-70,211`,
  `ActionEditor.tsx:169-172`, `transactions/page.tsx:297,305,890` — each replaces a direct
  `person.name` read with `resolvePersonDisplayName(person)`.

Two of these subtly _improve_ behavior in a way I checked deliberately: `AccountRow` and
`OwnershipEditor` previously guarded on `person.name` being truthy and would drop an unnamed owner
from the display entirely; they now render the fallback. That is a correct and necessary consequence
of unnamed auto-created people existing at all — not scope creep. No financial computation, no
allocation math, and no unrelated surface changed. `InviteLinkGenerator`'s additions are an optional
`onInviteCreated` callback and two `data-testid` attributes — minimal E2E affordances.

**HS-012 materialization timing (`pending-person-link.ts` + `vault-provider.tsx`) — sound in
principle, but see B-2.** Idempotent: `ensureMemberPersonLinked` (`mirror.ts:197-214`) reports
whether the doc version actually changed and the caller persists/syncs only then
(`vault-provider.tsx:220-231`); the marker is consume-once. It does not perturb the preserved
realtime boundary (empty diff there), and the implementer's stated rationale — that an every-open
materialization made already-linked members emit a redundant synced `vault_ops` op whose Realtime
echo regressed `realtime-recovery.spec.ts:108` — is coherent and consistent with the now-green
suite. My objection is not to the consume-once design but to the fact that, on the real journey, the
marker is never consumed at all (B-2), and to the fragility of `sessionStorage` for a never-retried
one-shot.

---

## Non-blocking notes

- **N-1.** `pending-person-link.ts` uses `sessionStorage`, so the one-shot marker does not survive a
  browser restart or a cross-tab acceptance. Given consume-once semantics and no reconciliation
  path, a missed materialization is permanent. Worth reconsidering alongside B-2.
- **N-2.** The DoD-1 adversarial set is proven for outsider/expired/tampered/unresolvable-sender.
  Revoked and reused redemptions rely on the pre-existing `accept` path / `accept_vault_invite` RPC
  and are covered only at the pgTAP layer (`tests/database/rls-audit.sql:88` "invite replay yields
  no membership"). P08 did not regress them, so this is a note, not a blocker — but a router-level
  reuse/revoke integration test would close the loop cheaply.
- **N-3.** `AccessMembersSection` identifies members by shortened pubkey hash (`shortenPubkeyHash`,
  `:28-30`) with no cross-reference to the linked Person's display name. Both concepts now exist;
  showing the resolved Person name next to the hash would make the Settings-authoritative surface
  materially more usable. Out of the strict DoD, offered as a suggestion.
- **N-4.** Removal ships as revoke-without-rotate. This is NOT a regression and NOT blocking (see
  item 3 for the BASE evidence), but two honesty/coverage items are worth doing on revision: (i) the
  remove control should state that access is revoked while the vault key is not rotated, discharging
  the binding task's "removal/rekey implications are explicitly handled and explained"
  (`tasks/HS-011-membership-invite-ux.md:41-42`); (ii) add the DoD-5 removal-authorization
  integration test. Separately, the implementer's evidence §4 describes removal as "the pre-existing
  hard-delete + sealed-box rekey (unchanged)" — the "unchanged" is fair (rotation was never wired,
  before or after), but "sealed-box rekey" overstates it: no rekey runs at all, since
  `sealKeyToBase64` is reachable only from the uncalled `rekeyVault`. Worth correcting so the ledger
  does not record a rotation that never happens.
- **N-5.** `pnpm typecheck` mutates `next-env.d.ts` as a side effect. Harmless here, but it means a
  gate run dirties the tree; worth knowing before staging.

---

## Summary

P08's cryptographic core is genuinely and carefully fixed: the placeholder is gone, the invitee
unwraps the real vault key through authenticated `crypto_box` with a server-resolved sender, the
fragment stays in the fragment, and a real two-user E2E proves same-key redemption. The Vault
Settings surface is reachable and server-authorized, the People-page hardcoding is properly deleted,
the `Person.name` ripple is disciplined, the batch-nonce fix is correct with replay protection
intact and a guard I verified genuinely fails without it, a real plaintext-logging leak was removed,
no epoch machinery was introduced, and the preserved boundary diff is empty.

Member removal (item 3) is **MET**: on a supplemental fact-check I confirmed `rekeyVault` had zero
call sites at BASE as well as at HEAD, so rotation was never wired in either state and the new
owner-only removal surface adds membership/RLS revocation without downgrading any BASE guarantee. My
draft's contrary finding (B-1) is withdrawn, with the reasoning error recorded above.

**One blocker** stands between this and PASS: invite acceptance never delivers the member into the
shared vault, so HS-012's acceptance-side linkage is undelivered on the real journey and its
one-shot `sessionStorage` marker is stranded (B-2). It is fixable within the D-018 boundary-safe
scope — plausibly a one-line `setActiveVaultStorage` in the acceptance handler plus an E2E assertion
on what the member's app actually opens — and requires touching neither the preserved boundary nor
any excised machinery.

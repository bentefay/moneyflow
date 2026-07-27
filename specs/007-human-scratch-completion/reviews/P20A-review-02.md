# P20A — HS-016 Truthful marketing pages — independent review 02

**Reviewer:** `p20a-reviewer-01` (independent; did not implement P20A) · **Verdict: PASS**

**Range diffed:** `e5dc9f2..e50cbb23` (rev-02 tip `e50cbb23119d8b916d0100f36b86cce6f6a04392`, parent
`e5dc9f21787cd5688db56dce8899a1d0c03f322e`). Chain verified linear single-parent by
`git rev-list --parents` — one commit, one parent, no merges. Working tree left at HEAD
`e55fc7f5ccb0adcb1891ad4be5a667a8a3e278b0`, which differs from the rev-02 tip only in two root-owned
docs files (`HANDOFF.md`, `PROGRESS.md`); product state is identical. No checkout/reset/branch
performed; no product file edited.

Scope of this review is the rev-02 delta only. Revision 01 findings other than B1 were assessed in
`P20A-review-01` and are not re-litigated here.

---

## B1 — false re-key claim: FIXED and verified

Revision 01 was blocked because `SecuritySection.tsx:35` ended the "Shared without sharing keys"
card with _"Remove a member and the vault is re-keyed."_ — a security guarantee the product does not
deliver, and one the app's own settings page explicitly contradicts.

**The offending sentence is gone.**
`grep -rn "re-keyed\|rekeyed" src/components/features/landing/ src/app/(marketing)/` returns zero
hits. The string appears nowhere in the marketing surface.

**The replacement is truthful.** `src/components/features/landing/SecuritySection.tsx:35` now reads:

> Inviting someone wraps the vault key to their key. The invite secret stays in the link fragment
> and never reaches the server. Removing a member cuts off their access to future changes; the vault
> key is not rotated, so anything they already downloaded stays readable to them.

Both new clauses were independently verified against shipping code, not against the implementer's
evidence:

1. _"cuts off their access to future changes"_ — TRUE. `membership.remove`
   (`src/server/routers/membership.ts:132-137`) hard-`delete`s the `vault_memberships` row. Every
   read path is gated on that row: `src/server/routers/sync.ts` checks membership before returning
   ops at :52, :114, :213, :262, :308, :378, :427, :472 (e.g. `getUpdates` at :112-125 throws
   `NOT_FOUND` when the membership select fails). The realtime path is gated too —
   `realtime.authorize` (`src/server/routers/realtime.ts:82-95`) mints grants via the
   `rotate_realtime_grant` RPC, which selects `membership.role FROM public.vault_memberships`
   (`supabase/migrations/007_realtime_authorization.sql:122-123`, likewise
   `008_realtime_authorization_lifecycle.sql:86`). With the row deleted, both pull and realtime are
   closed.
2. _"the vault key is not rotated, so anything they already downloaded stays readable to them"_ —
   TRUE, and confirms the rev-01 finding. `rekeyVault` / `performCompleteRekey`
   (`src/lib/crypto/rekey.ts:50,120`) are referenced only by the barrel export
   (`src/lib/crypto/index.ts:80-85`) and by `rekey.ts` itself. The `membership.rekey` procedure
   (`src/server/routers/membership.ts:178`) has no client caller. The only member-removal UI
   (`src/components/features/vault/AccessMembersSection.tsx:63,145-152`) calls `membership.remove`
   and nothing else. The server's own comment at :80-82 says the client "MUST re-key" and no client
   does.

**It matches the in-app disclosure.** `AccessMembersSection.tsx:106-109` tells owners: _"Removing a
member revokes their access to future changes immediately. The vault key is not rotated, so anything
they already downloaded stays readable to them."_ The marketing copy is now the same statement,
differing only in the opening verb ("cuts off" vs "revokes … immediately"). The landing page and the
product no longer contradict each other. Note the marketing wording drops "immediately" and is
therefore, if anything, marginally weaker than the in-app claim — an understatement, not an
overclaim.

**No new unbacked claim introduced.** The two retained sentences were already verified in review 01:
sealed-box wrapping at `src/lib/crypto/keywrap.ts:158` (`crypto_box_seal`), and the invite secret
confined to the URL fragment at `src/components/features/people/InviteLinkGenerator.tsx:121`. The
new sentence asserts only the two properties proven above. It is the only place in the entire
landing surface that mentions removal or rotation (verified by grep across
`src/components/features/landing/`).

**Truthfulness guards intact.** No test asserted this card's prose —
`grep -rn "re-key\|rekey\|rotated\|Shared without sharing"` over
`tests/unit/components/landing-page.test.tsx` and `tests/e2e/landing.spec.ts` returns nothing, so
nothing was weakened to accommodate the fix. The new sentence trips none of the `not.toMatch`
truthfulness guards (`landing-page.test.tsx:180,203,224, 240,241,248`).

---

## Confirmations

1. **False sentence removed** — yes; absent from `SecuritySection.tsx` and from everything under
   `src/components/features/landing/` and `src/app/(marketing)/`.
2. **Replacement truthful and matches in-app disclosure** — yes; both clauses proven against
   `membership.remove` + the membership-gated sync/realtime paths, and the wording mirrors
   `AccessMembersSection.tsx:106-109`. No new unbacked claim.
3. **Delta is exactly 2 files** — yes; `git diff --name-status e5dc9f2 e50cbb23` returns exactly
   `M src/components/features/landing/SecuritySection.tsx` (1 line: `2 +-`, i.e. one string
   replaced) and `A specs/007-human-scratch-completion/evidence/P20A/implementation-02.md`. 77
   insertions, 1 deletion total.
4. **FS-001 byte-identical** — yes; `src/lib/domain/settlement.ts` blob is
   `010f3c93582a2ce311594d4dde8464760ca49c43` at both `e50cbb23` and HEAD.
   `git diff --name-only e5dc9f2 e50cbb23 -- src/lib src/server supabase src/app package.json pnpm-lock.yaml`
   is empty.
5. **No new `as` / `any` / non-null `!`** — yes; grep over added product lines returns nothing.
6. **No secret material** — yes; scanned the full rev-02 diff for seed phrases, mnemonics,
   `SUPABASE_JWT_SECRET`, `service_role`, secret keys, PEM blocks and 64-hex strings. Zero hits.

---

## Gate results (re-run by the reviewer, real counts)

| Gate                | Real result                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | **0 errors** (`tsc --noEmit`)                                                         |
| `pnpm lint`         | **0 errors / 10 warnings** — all pre-existing, none in P20A files                     |
| `pnpm format:check` | fails on **13 pre-existing `specs/**`markdown files, 0`.ts`/`.tsx`\*\* — NON-blocking |
| `pnpm test`         | **1939 passed / 2 skipped** (100 files) on re-run — see flake note below              |
| `pnpm test:e2e`     | **163 passed**                                                                        |

**Unit-test flake (non-blocking, not P20A).** The first full run showed `1938 passed / 1 failed`:
`tests/unit/import/duplicates.test.ts:748` — "scales linearly with input size (O(n+m) complexity)",
`expected 4.448833561457002 to be less than 4`. This is a wall-clock ratio assertion
(`times[1] / times[0]`, `duplicates.test.ts:723-749`) that is inherently sensitive to load, JIT
warmup and GC under Vitest's parallel workers. It is unrelated to P20A: the file is untouched by
both revisions (`git diff --name-only b79c77d e50cbb23 | grep duplicates` is empty) and the rev-02
delta contains no `src/lib/**` change. Re-run 3/3 green in isolation (43 passed each time) and the
full suite re-run was green at 1939 passed / 2 skipped. Recorded as a pre-existing flaky test, not a
regression. See Q-proposal below.

`format:check` count differs from review 01 (13 vs 14) purely because root reformatted `PROGRESS.md`
in the interim; still zero `.ts`/`.tsx` failures, so still non-blocking per the HANDOFF.

---

## Non-blocking observations and Q-proposals

- **Q-P20A-03 (restated from review 01).** The re-key machinery — `rekeyVault`,
  `performCompleteRekey`, `membership.rekey`, and the `rekey_vault_members` SQL function
  (`supabase/migrations/006_rls_hardening.sql:161`, covered by
  `tests/database/rls-audit.sql:91-107`) — is fully built and tested but has no caller. The copy is
  now honest about this, so it is no longer a marketing defect, but it remains an open product
  question: should removal rotate the key? Out of P20A scope.
- **Q-P20A-04 (new).** `tests/unit/import/duplicates.test.ts:723-749` asserts an O(n+m) complexity
  bound via wall-clock ratios with a hard `< 4` threshold at n=100/200/400. Those durations are
  sub-millisecond, so scheduling noise alone can breach the bound under parallel load. Worth
  replacing with an operation-count assertion (instrument the comparison count) or raising the
  threshold. Pre-existing; unrelated to HS-016.
- **Pre-existing a11y (restated).** The mobile menu in `Header.tsx:82-143` still has no
  `role="dialog"`, `aria-modal`, focus trap or Escape-to-close. Unchanged from before P20A; not
  introduced by this package.
- **Positive.** The implementer's `implementation-02.md:46-49` records the root cause honestly —
  file existence was accepted as evidence of a shipped capability without checking for a call path,
  the same standard that had been correctly applied to budgeting and charts. The fix is minimal (one
  string), reuses the product's own wording rather than inventing new copy, and touches nothing
  else.

## Verdict

**PASS** — 0 blocking findings. B1 is genuinely fixed: the false security guarantee is gone, its
replacement is verified true on both clauses, and it now agrees with what the app tells users
in-app. All boundaries hold and all five gates are green (the single unit failure was a pre-existing
timing flake, green on re-run and in isolation).

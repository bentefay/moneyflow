# HANDOFF — P20A REVIEW dispatch (revision 02 — confirm B1 resolved)

**To:** `p20a-reviewer-01` (you reviewed rev 01 and correctly FAILED it on B1; you retain that
context). **From:** root coordinator. You remain DISTINCT from the implementer `p20a-implementer-01`
— role separation holds.

**Package:** P20A (HS-016 — Truthful marketing pages). Rev 01 FAILED on your **B1** (false "vault is
re-keyed" security claim). The implementer shipped a one-sentence rev-02 fix. This review confirms
B1 is resolved and nothing else regressed.

## Scope of THIS review — the rev-02 delta only

**Review range: `e5dc9f2..e50cbb23`** (rev-02 tip = `e50cbb23119d8b916d0100f36b86cce6f6a04392`,
parent `e5dc9f2`). Root has already verified the chain is linear and the delta is exactly 2 files:

- `M src/components/features/landing/SecuritySection.tsx` — the one-line copy fix
- `A specs/007-human-scratch-completion/evidence/P20A/implementation-02.md` — implementer's B1 note

The entire rest of rev 01 was verified clean at your rev-01 review and is unchanged — do NOT
re-litigate it. Focus tightly on the changed sentence.

## What to confirm

1. **B1 is gone.** The false _"Remove a member and the vault is re-keyed."_ sentence no longer
   appears in `SecuritySection.tsx` (or anywhere under `src/components/features/landing/`). The
   "Shared without sharing keys" card now reads:

    > "Inviting someone wraps the vault key to their key. The invite secret stays in the link
    > fragment and never reaches the server. Removing a member cuts off their access to future
    > changes; the vault key is not rotated, so anything they already downloaded stays readable to
    > them."

2. **The replacement copy is itself truthful.** It must match the product's actual behavior and the
   in-app disclosure at `src/components/features/vault/AccessMembersSection.tsx:106-109` ("The vault
   key is not rotated, so anything they already downloaded stays readable to them."). Confirm the
   member-removal path (`membership.remove`) does NOT rotate the key and that the new sentence
   claims no property the product does not deliver. It must introduce NO new unbacked claim.

3. **No collateral change.** Delta is exactly the 2 files above; FS-001
   `src/lib/domain/settlement.ts` byte-identical (`010f3c93582a2ce311594d4dde8464760ca49c43`);
   nothing under `src/lib`/`src/server`/`supabase`/`src/app` changed beyond the one landing string;
   no new `as`/`any`/non-null `!`; no secret material.

4. **If `tests/unit/components/landing-page.test.tsx` was touched** to match the corrected copy,
   confirm the truthfulness guards remain intact and were not weakened (root's delta shows the test
   file was NOT modified in rev 02 — confirm the existing assertions still pass and none reference
   the removed false sentence).

## Gates — run ALL and report REAL counts

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. `format:check`
failing only on pre-existing `specs/**` markdown is non-blocking; any P20A `.ts`/`.tsx` failing
oxfmt is blocking.

## Handback

SendMessage to `main` with: **VERDICT: PASS or FAIL**; the review range you actually diffed and the
resolved rev-02 tip SHA; explicit confirmation that (a) B1's false sentence is gone, (b) the
replacement copy is truthful and matches the in-app no-rotation disclosure, (c) the delta is the 2
expected files with FS-001 byte-identical, (d) the five real gate counts, (e) no new casts, (f) no
secret material. If PASS, note it is ready for NON-markerless final integration (HS-016 marker at
scratch `:328`). Persist your review as `reviews/P20A-review-02.md`. Do not checkout/reset/branch.

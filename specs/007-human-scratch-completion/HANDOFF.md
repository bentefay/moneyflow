# HANDOFF — P20A IMPLEMENT dispatch (revision 02 — B1 fix)

**To:** `p20a-implementer-01` (you implemented rev 01; this is your one-sentence fix). **From:**
root coordinator.

**Package:** P20A (HS-016 — Truthful marketing pages). Rev 01 FAILED review with **1 blocking
finding (B1)**. This revision fixes ONLY B1. The rest of your rev-01 work was verified clean and
must stay byte-for-byte as-is.

**BASE = current HEAD `c9c7874f9da65e87f604dadb4d54b0750323c896`.** Commit your fix forward on top
of BASE. **No-checkout discipline: do NOT checkout/reset/branch/switch.** One small feat commit.

## The blocking finding to fix — B1

`src/components/features/landing/SecuritySection.tsx:35` — the "Shared without sharing keys" card
currently reads:

> "Inviting someone wraps the vault key to their key. The invite secret stays in the link fragment
> and never reaches the server. **Remove a member and the vault is re-keyed.**"

The **third sentence is false.** The re-key primitives exist (`src/lib/crypto/rekey.ts`,
`membership.rekey`) but have **zero callers** — member removal does NOT rotate the vault key. The
app's own settings page `src/components/features/vault/AccessMembersSection.tsx:108` correctly
discloses: _"...The vault key is not rotated, so anything they already downloaded stays readable to
them."_ The landing page must not promise a security property the product does not deliver.

## The fix (do EXACTLY this — nothing more)

Replace the false third sentence with the honest behavior, matching the in-app wording. Recommended
copy for that card's body (keep the first two sentences unchanged):

> "Inviting someone wraps the vault key to their key. The invite secret stays in the link fragment
> and never reaches the server. Removing a member cuts off their access to future changes; the vault
> key is not rotated, so anything they already downloaded stays readable to them."

(If the card's length budget is tight, simply deleting the false sentence — ending after "never
reaches the server." — is also acceptable. Do NOT invent any new claim.)

## Hard constraints

- **Change ONLY the copy string in `SecuritySection.tsx` for B1.** Do not touch any other landing
  component, the marketing layout, or any other file — the rest of rev 01 passed review.
- If your `tests/unit/components/landing-page.test.tsx` asserts anything about that card's text,
  update the assertion to match the corrected copy — but keep the truthfulness guards intact and do
  NOT weaken them. Do not add coupling to incidental prose.
- **No new `as`/`any`/non-null `!`** in product code.
- **Secret-safety** unchanged: no real secret material anywhere.
- **FS-001 `src/lib/domain/settlement.ts` stays byte-identical**
  (`010f3c93582a2ce311594d4dde8464760ca49c43`); nothing under `src/lib/**` changes.
- Do NOT edit root-owned files except appending your rev-02 note to
  `evidence/P20A/implementation-01.md` (or add `evidence/P20A/implementation-02.md`) recording the
  B1 fix.

## Gates — run ALL and report REAL counts

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. `format:check`
failing only on pre-existing `specs/**` markdown is non-blocking; any P20A `.ts`/`.tsx` failing
oxfmt is blocking (`pnpm format` your own files).

## Handback

SendMessage to `main` with: the final HEAD SHA + the linear chain from `c9c7874`; the exact
corrected copy; confirmation that (a) the false re-key sentence is gone and the card now matches the
in-app no-rotation disclosure, (b) no other landing copy changed, (c) FS-001 byte-identical and
nothing under `src/lib/**` changed, (d) the five real gate counts, (e) no new casts, (f) no secret
material. Do not checkout/reset.

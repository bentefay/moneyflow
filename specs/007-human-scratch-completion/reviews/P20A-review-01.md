# P20A / 01 — Independent Review

**Reviewer:** `p20a-reviewer-01` (fresh, independent of the P20A implementer `p20a-implementer-01`;
read-only on product code). **Package:** P20A (HS-016 — Truthful marketing pages; SOLE HS-016
package). **Review range:** `b79c77d..6509ce7c` (test commit `6d5b5db` + feat commit `6509ce7c`;
`b79c77d` is the docs dispatch commit / BASE). **Frozen text:** `specs/human-scratch.md:328-331`.
**Verdict:** **FAIL** (1 blocking finding). Persisted by root from the reviewer's verify-not-trust
SendMessage verdict; root independently re-derived B1 and every clean fact against git before
recording.

## Range / git discipline

- Product/test delta reviewed = `b79c77d..6509ce7c`, chain linear single-parent
  (`b79c77d->6d5b5db->6509ce7c`). Read-only git only; no checkout/reset/branch. Tree left at HEAD
  `c9c7874` (only `next-env.d.ts` was already dirty from a dev-server run, unrelated to P20A).

## Gate results (re-run by the reviewer — real counts, all match the implementer's)

| Gate         | Result                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------ |
| typecheck    | PASS — 0 errors                                                                            |
| lint         | 0 errors / 10 warnings (all pre-existing: TransactionTable virtualizer + 9 crdt lib/tests) |
| format:check | FAIL on 14 files — ALL pre-existing `specs/**` markdown; ZERO `.ts`/`.tsx`. Non-blocking.  |
| test         | PASS — 1939 passed / 2 skipped (100 files)                                                 |
| test:e2e     | PASS — 163 passed (incl. 7 new landing tests)                                              |

## BLOCKING FINDING — B1: shipped copy claims a re-key that does not happen

`src/components/features/landing/SecuritySection.tsx:35` ("Shared without sharing keys" card):

> "Inviting someone wraps the vault key to their key. The invite secret stays in the link fragment
> and never reaches the server. **Remove a member and the vault is re-keyed.**"

The first two sentences are true and verified (`crypto_box_seal` in `src/lib/crypto/keywrap.ts:158`;
fragment-only secret at `src/components/features/people/InviteLinkGenerator.tsx:121`). **The third
sentence is false**, and it is a NEW claim added by `6509ce7c` (root confirmed it appears as a `+`
line in the range diff and is absent from BASE).

Root-reconfirmed evidence:

- **Re-key primitives have ZERO callers.** `rekeyVault` / `performCompleteRekey`
  (`src/lib/crypto/rekey.ts:50,120`) and the tRPC `membership.rekey` procedure
  (`src/server/routers/membership.ts`) are referenced ONLY by `rekey.ts` itself, the barrel export
  `src/lib/crypto/index.ts:80-85`, and server-router doc-comments. Nothing in `src/components/**`,
  `src/hooks/**`, or `src/app/**` calls them (root re-ran the exhaustive grep — no client/UI
  caller).
- The only member-removal UI, `src/components/features/vault/AccessMembersSection.tsx`, calls
  `trpc.membership.remove` and nothing else — no re-key follows.
- The server code itself says the client must re-key and the client doesn't
  (`src/server/routers/membership.ts` "the client MUST re-key the vault").
- **The app's own in-product copy states the opposite:** `AccessMembersSection.tsx:107-110` tells
  owners _"...The vault key is not rotated, so anything they already downloaded stays readable to
  them."_ The landing page promises a security property the settings page explicitly disclaims.

- **Frozen line violated:** `specs/human-scratch.md:328-329` ("clear, succinct and not too
  'markety'. It's private."); task brief "describe privacy/encryption precisely without absolutes
  unsupported by the threat model"; "no feature is advertised before it is actually usable."
- **Failing scenario:** an owner reads the landing page, believes removal rotates the key, removes a
  member after a dispute, and assumes future data is protected from that member's RETAINED key. It
  is not — no rotation occurs; the member's `encrypted_vault_key` wrap is never invalidated; server
  access is cut off but any ciphertext they already hold or later obtain stays readable.
- **Suggested fix (root's call):** delete the third sentence, or replace it with the honest wording
  already used in-app, e.g. "Removing a member cuts off their access to future changes. The vault
  key is not rotated, so anything they already downloaded stays readable to them." No other line in
  the card needs to change.

## Everything else verified clean (independently traced)

- **(a) Every advertised feature backed by a capability usable today — YES (except B1):** CSV+OFX
  import (`papaparse` `csv.ts:8`; `@f-o-t/ofx` parser `ofx.ts:357`; auto-detect `ofx.ts:412` wired
  at `use-import-state.ts:92`; `/imports`, `/imports/new`); column auto-map + duplicate flagging;
  nested tags (`schema.ts:81` `parentTagId`); percentage People allocations (`allocation.ts:19,157`;
  settlement `settlement.ts:1060` via `BalanceSummary`); rules→new-imports (`RuleFieldSchema`
  `rules.ts:40` = the exact three named; `applyFieldRulesToImport` unconditional at
  `import-commit.ts:113`); real-time collab/presence (`realtime.ts:156,202`, `presence.ts:72`,
  provider→`(app)/layout.tsx:141`; presence carries `field`); client-side encryption
  (`encryption.ts:56`); 12-word phrase OR passkey (`seed.ts:21`; passkey UI at
  `/unlock`,`/new-user`, `/settings`); local-first IndexedDB (`persistence.ts`); "works when
  connection drops" correctly narrowed (no service worker/manifest exists, so old "works without
  internet" would have been false).
- **(b) Every removed claim genuinely false/unbacked — YES:** "Smart Budgeting" (no `budget` in
  `schema.ts`; only unrelated `VaultMaintenanceBudget`), "Spending Insights" (no charting dep;
  `/dashboard` bare `redirect("/transactions")`), open-source/MIT (`README.md` "proprietary. All
  rights reserved."; no `LICENSE`; `package.json` `"private": true`), wrong GitHub account
  (`benallfree` vs real `bentefay`) + `href="#"` dead links, and the zero-knowledge/100%-private/
  military-grade/works-offline absolutes.
- **(c) Crypto corrections accurate; no false absolutes — YES:** vault data XSalsa20-Poly1305
  (`crypto_secretbox_*` `encryption.ts:25,53,56,91`); XChaCha20 presence-only
  (`crypto_aead_xchacha20poly1305_ietf_*` only in `presence-protocol.ts:188,255`); HKDF-SHA256
  derivation (`keypair.ts`, `presence-key.ts:30`, `passkeyWrap.ts:68`); BLAKE2b for identity/body
  hash only (`crypto_generichash` in `identity.ts:53`, `signing.ts`); honest "what the server can
  see" card accurate/understated (`005_vault_ops.sql` plaintext `created_at`/`author_pubkey_hash`/
  `version_vector`; membership graph in `vault_memberships`). The stale XChaCha20 comments in
  `encryption.ts` + `005_vault_ops.sql` are Q-P20A-02, out of scope, not required here.
- **(d) FS-001 boundary intact — YES:** `settlement.ts` blob
  `010f3c93582a2ce311594d4dde8464760ca49c43` at BASE and HEAD; `git diff --name-only` over
  `src/lib`, `src/server`, `supabase`, `src/app/(app)`, `package.json`, lockfile is EMPTY. Delta = 7
  marketing files + 2 test files + evidence doc.
- **(e) All CTA/nav links resolve — YES:** zero `href="#"` and zero github/discord/twitter refs
  remain in the landing surface; `#features`/`#security` anchors have matching `id=` targets;
  `/new-user`,`/unlock`,`/` resolve. E2E covers desktop CTA, header unlock, in-page anchor, mobile
  CTA.
- **(f) No secret material — YES:** only descriptive uses of "12-word recovery phrase" in
  copy/evidence; no mnemonic wordlist, keys, PEM, `SUPABASE_JWT_SECRET`, or `service_role`.
- **Casts:** no new `as`/`any`/non-null `!` in product (only the prose "as" in a string literal).

## Non-blocking observations

1. Whichever way B1 is fixed, the _product_ re-key machinery (`rekeyVault`, `performCompleteRekey`,
   `membership.rekey`, `rekey_vault_members` SQL in `006_rls_hardening.sql:161`, covered by
   `tests/database/rls-audit.sql:91-107`) is fully built + tested but never wired to a caller —
   dead-but-working security machinery. Whether the product SHOULD re-key on removal is a separate
   decision, out of P20A scope. (Recorded by root as **Q-P20A-04**.)
2. Pre-existing (unchanged from BASE, not P20A's job): the mobile menu in `Header.tsx:82-143` lacks
   `role="dialog"`/`aria-modal`/focus-trap/Escape-to-close — future a11y sweep.
3. Positive: the truthfulness guards in `tests/unit/components/landing-page.test.tsx:165-249` assert
   the ABSENCE of unbacked claims (incl. "only ever mentions budgeting to deny it") and are
   correctly destination/structure-based rather than prose-coupled — a good regression guard for the
   frozen positioning.

**Verdict: FAIL — bounce B1 to the implementer as a one-sentence fix; everything else is ready.**
Root re-derived B1 and the FS-001 boundary against git before recording this review.

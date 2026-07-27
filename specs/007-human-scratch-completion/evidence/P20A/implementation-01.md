# P20A — HS-016 Truthful marketing pages — implementation evidence 01

**Agent:** `p20a-implementer-01` · **Base:** `b79c77db39455662f61637c534cbfdfb8a044ad6`

**Frozen requirement** (`specs/human-scratch.md:328-331`, read directly as bytes):

> Update the marketing pages to include all these features. Be clear, succinct and not too
> "markety". It's private. It's for categorising and allocating your transactions, not budgeting.
> Supports importing CSV and ofx. Multiple people can collaborate in real-time. It intelligently
> applies your tags, aliases and allocations to new imports.

---

## 1. Claim-to-evidence table

Produced **before** any copy change. Every row was verified by reading the shipped source, not by
reading prior evidence files. A claim is only allowed to ship if the capability is reachable by a
real user today through a real route.

### 1a. Claims KEPT (backed by shipped, usable capability)

| Public claim (as shipped in new copy)                                                                          | Backing capability                                                      | Evidence in `src/`                                                                                                                                                                                                                       | Usable via                       |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| "Import CSV and OFX" — statements load as CSV or OFX                                                           | Real CSV parser and real OFX parser (OFX 1.x SGML + 2.x XML, `.qfx`)    | `src/lib/import/csv.ts`, `src/lib/import/ofx.ts` (built on the `@f-o-t/ofx` dependency), `src/lib/import/processor.ts`; format auto-detected in `src/hooks/use-import-state.ts` (`isOFXFormat`)                                          | `/imports`, `/imports/new`       |
| "Columns are mapped for you" / duplicate flagging                                                              | Mapping + template config; duplicate detection                          | `src/hooks/use-import-state.ts` (mapping, OFX fixed mappings, ACCTID account matching), `src/lib/import/duplicates.ts`                                                                                                                   | `/imports/new` tabbed config     |
| "Organise transactions with nested tags"                                                                       | Hierarchical parent/child tags, assignable per transaction and in bulk  | `src/app/(app)/tags/page.tsx`, `TagsTable`, `ParentTagSelector`, `InlineEditableTags` (rendered from `TransactionRow`), `BulkEditToolbar`                                                                                                | `/tags`, `/transactions`         |
| "Give a bank description a readable alias"                                                                     | Description aliases are a first-class vault collection                  | `descriptionAliases` in `src/lib/crdt/schema.ts`; `src/lib/crdt/description-aliases.ts`                                                                                                                                                  | `/tx-descriptions`, transactions |
| "Split a transaction across the people in your vault" / "see who owes whom"                                    | Per-person allocation cells + derived allocations + settlement balances | `src/lib/domain/allocation.ts`, `src/lib/domain/ownership.ts` (`deriveEffectiveAllocations`), `src/lib/crdt/allocations.ts`, `PersonAllocationCell`, `BalanceSummary`, `src/lib/domain/settlement.ts`                                    | `/transactions`, `/people`       |
| "Set a rule once and your tags, aliases and allocations are applied to future imports"                         | Field rules auto-applied at import commit, unconditionally              | `src/lib/domain/automation/rules.ts` (`RuleFieldSchema = ["descriptionAlias","tags","allocation"]`), `src/lib/crdt/field-rules.ts` (`applyFieldRulesToImport`), called from `src/lib/crdt/import-commit.ts` inside the same vault action | `/automations`, auto at import   |
| "Several people can work in the same vault at once" / "changes merge without conflicts"                        | Loro CRDT + Supabase Realtime, server-minted short-lived grants         | `src/lib/sync/manager.ts`, `src/lib/supabase/realtime.ts`, `src/server/routers/realtime.ts`                                                                                                                                              | any authenticated route          |
| "You can see who's editing what"                                                                               | Encrypted ephemeral presence (online members + field being edited)      | `src/lib/sync/presence.ts`, `src/lib/sync/presence-protocol.ts`, `src/hooks/use-vault-presence.ts`                                                                                                                                       | `/transactions`                  |
| "Invite the people you share money with"                                                                       | Invite create/redeem/revoke; secret stays in the URL fragment           | `src/server/routers/invite.ts`, `InviteLinkGenerator`, `AccessMembersSection`, `src/app/(onboarding)/invite/[token]/page.tsx`                                                                                                            | `/people`, `/settings`           |
| "Encrypted in your browser before it is stored"                                                                | Client-side symmetric encryption of all vault data before upload        | `src/lib/crypto/encryption.ts`, used by `src/lib/sync/manager.ts` and `src/lib/vault/ensure-default.ts`                                                                                                                                  | all sync                         |
| "The server stores blobs it has no key for"                                                                    | Server only ever receives `encrypted_data`                              | `src/server/schemas/**` input schemas; `supabase/migrations/005_vault_ops.sql`                                                                                                                                                           | —                                |
| "It does see who is in a vault, and when each change was made and how big it was"                              | **Deliberate honest disclosure** of plaintext metadata (see §3)         | `vault_ops.created_at`, `vault_ops.author_pubkey_hash`, `vault_ops.version_vector`, `vault_memberships`, `get_ops_stats_since_snapshot` in `005_vault_ops.sql`                                                                           | —                                |
| "Changes are saved on your device first and pushed when you are back online"                                   | IndexedDB-first persistence, unpushed-op durability, `online` retry     | `src/lib/sync/persistence.ts` (`idb`), `src/lib/sync/manager.ts`                                                                                                                                                                         | all sync                         |
| "No email address and no password" / "12-word recovery phrase or a passkey"                                    | BIP-39 12-word seed → Ed25519 identity; WebAuthn PRF passkey wrap       | `src/lib/crypto/seed.ts` (`generateMnemonic(wordlist, 128)` = 12 words), `src/lib/crypto/keypair.ts`, `src/lib/crypto/passkeyWrap.ts`, `src/server/routers/passkey.ts`                                                                   | `/new-user`, `/unlock`           |
| Crypto stack list: Ed25519 / X25519 / XSalsa20-Poly1305 / HKDF-SHA256 / BLAKE2b / BIP-39 / CRDT / WebAuthn PRF | Each verified against the actual calls (see §2 for two corrections)     | `src/lib/crypto/*`, `src/lib/sync/presence-protocol.ts`                                                                                                                                                                                  | —                                |

### 1b. Claims CUT (no shipped evidence, or provably false)

| Claim removed                                                                                                                             | Where it was                                                                         | Why it was cut                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Smart Budgeting"** — "Set budgets for categories… nudges when you're approaching limits"                                               | `FeaturesSection.tsx:68-70`                                                          | **Vaporware.** No budget schema, route, component or lib exists. Vault collections in `src/lib/crdt/schema.ts` contain no budgets. Also directly contradicts the frozen "not budgeting".                                      |
| **"Spending Insights"** — "clear visualizations… just local charts"                                                                       | `FeaturesSection.tsx:76-78`                                                          | **Vaporware.** No charting dependency in `package.json` at all; no chart/report/insight/analytics file under `src/`. `/dashboard` is a bare `redirect("/transactions")`.                                                      |
| "Open source under MIT license"                                                                                                           | `Footer.tsx:133`                                                                     | **False.** `README.md` states "This project is proprietary. All rights reserved." There is no `LICENSE` file and `package.json` is `"private": true` with no `license` field.                                                 |
| "All encryption code is open source and auditable" + GitHub link                                                                          | `SecuritySection.tsx:107-115`                                                        | Same as above; also the URL `github.com/benallfree/moneyflow` is the wrong account (real remote is `bentefay/moneyflow`), so it was a dead/incorrect destination.                                                             |
| "Open Source" nav item → GitHub                                                                                                           | `Header.tsx:18`                                                                      | Project is proprietary; the repository is not a public destination. Removed rather than relabelled.                                                                                                                           |
| GitHub icon link + GitHub/Discord/Twitter footer column                                                                                   | `Footer.tsx:34-37, 60-68`                                                            | Wrong GitHub account; Discord and Twitter were `href="#"` dead destinations for communities that do not exist.                                                                                                                |
| "Documentation" / "Privacy Policy" / "Terms of Service"                                                                                   | `Footer.tsx:29-31`                                                                   | All three were `href="#"`. No such pages exist. Dead destinations removed rather than shipped.                                                                                                                                |
| "Zero-Knowledge" (badge, feature name, section title)                                                                                     | `HeroSection.tsx:40`, `FeaturesSection.tsx:20`, `SecuritySection.tsx:17`             | Overclaim — the server sees substantial plaintext metadata (§3). Replaced with a precise description of what is and is not encrypted.                                                                                         |
| "100% Private"                                                                                                                            | `HeroSection.tsx:40`                                                                 | False absolute.                                                                                                                                                                                                               |
| "hackers can't steal it"                                                                                                                  | `FeaturesSection.tsx:22`                                                             | False absolute; unfalsifiable security guarantee.                                                                                                                                                                             |
| "We literally cannot read your financial data, even if compelled by law"                                                                  | `SecuritySection.tsx:19`                                                             | Legal absolute the threat model does not support (metadata is compellable). Replaced with a factual statement about keys.                                                                                                     |
| "military-grade encryption"                                                                                                               | `FeaturesSection.tsx:98`                                                             | Meaningless marketing term — exactly the "markety" register the frozen text rejects.                                                                                                                                          |
| "the same battle-tested algorithms that protect your cryptocurrency"                                                                      | `SecuritySection.tsx:58-59`                                                          | Markety by-association claim. Replaced with a plain statement that MoneyFlow does not roll its own crypto.                                                                                                                    |
| "XChaCha20-Poly1305" for vault data                                                                                                       | `SecuritySection.tsx:13, 39`                                                         | **Factually wrong.** `src/lib/crypto/encryption.ts` calls `crypto_secretbox_easy`, which is **XSalsa20-Poly1305**. (XChaCha20-Poly1305 is used only on the presence channel, `presence-protocol.ts`.) Corrected, not deleted. |
| "BLAKE2b for key derivation"                                                                                                              | `SecuritySection.tsx:40`                                                             | **Factually wrong.** Key derivation is HKDF-SHA256 (`src/lib/crypto/keypair.ts`, `presence-key.ts`, `passkeyWrap.ts`). BLAKE2b is used for identity/body hashing only. Corrected to two accurate lines.                       |
| "Works without internet"                                                                                                                  | `FeaturesSection.tsx:38`                                                             | Overclaim — there is no service worker or PWA manifest, so a cold load still needs the network. Narrowed to "keep working when your connection drops".                                                                        |
| "No accounts. No cloud access."                                                                                                           | `HeroSection.tsx:56`                                                                 | "No cloud access" is false — there is a server, and sync depends on it. Rewritten.                                                                                                                                            |
| "Your 12-word seed phrase is the only key to your data"                                                                                   | `FeaturesSection.tsx:46`, `SecuritySection.tsx:25`                                   | Incomplete after P18/P19 — passkeys ship and are a second unlock factor. Rewritten to name both.                                                                                                                              |
| "Track expenses together" / "Start tracking your household expenses" / "household finance tracking" / "Track expenses, share with family" | `HeroSection.tsx:54`, `CTASection.tsx:35`, `Footer.tsx:56`, `FeaturesSection.tsx:99` | Expense-**tracking** framing implies budgeting. Replaced throughout with categorise + allocate.                                                                                                                               |
| "Ready to take control of your finances?"                                                                                                 | `CTASection.tsx:32`                                                                  | Markety, and implies financial-control/budgeting outcomes the product does not deliver.                                                                                                                                       |
| "Everything you need" / "Privacy meets simplicity"                                                                                        | `FeaturesSection.tsx:92, 95`                                                         | Empty marketing register; replaced with a plain statement of what the product is and is not.                                                                                                                                  |
| Root metadata "Track shared household expenses…"                                                                                          | `src/app/layout.tsx:21` (out of scope)                                               | Overridden for the public route group with truthful metadata exported from `src/app/(marketing)/layout.tsx`. The root file was **not** edited.                                                                                |

**Net:** every advertised feature in the shipped copy maps to a row in §1a. Two entire feature cards
(budgeting, insights) were deleted rather than reworded, because no amount of rewording makes an
absent feature true.

---

## 2. Two factual corrections to the cryptography claims

The previous copy named two primitives the code does not use. Both were verified by reading the call
sites, not the comments (the source comments are themselves mislabelled):

- **Vault data is XSalsa20-Poly1305, not XChaCha20-Poly1305.** `src/lib/crypto/encryption.ts` calls
  `sodium.crypto_secretbox_easy` / `crypto_secretbox_open_easy`, which is XSalsa20-Poly1305 in
  libsodium. Same in `src/lib/vault/ensure-default.ts`. Both are 256-bit-key / 192-bit-nonce
  constructions and both are sound — this is a labelling defect, but shipping a specific algorithm
  name the code does not use is a concrete inaccuracy, so the copy now names the real one.
- **Key derivation is HKDF-SHA256, not BLAKE2b.** `src/lib/crypto/keypair.ts`, `presence-key.ts` and
  `passkeyWrap.ts` all derive with HKDF-SHA256 (`@noble/hashes`). BLAKE2b (`crypto_generichash`) is
  used for the public-key hash and request-body hash (`src/lib/crypto/identity.ts`, `signing.ts`).
  The copy now lists both accurately and separately.

I did **not** change any crypto source or comment — that is outside P20A's editable scope. Flagged
to root as a follow-up: the mislabelled comments in `src/lib/crypto/encryption.ts` and the
`XChaCha20-Poly1305` comment in `supabase/migrations/005_vault_ops.sql` should be corrected by a
package that owns those files.

---

## 3. Privacy wording vs. the threat model

The old copy claimed "Zero-Knowledge Architecture" and "Our servers only see encrypted blobs". The
second half of that is true of _financial content_ and false of _metadata_. Reading
`supabase/migrations/005_vault_ops.sql` and the tRPC schemas, the server sees in plaintext:

- `vault_ops.created_at` — a server-assigned timestamp on every operation (a full editing timeline)
- `vault_ops.author_pubkey_hash` — which member made each change
- `vault_ops.version_vector` — per-device operation counters (commented "Plaintext to enable
  server-side filtering without decryption")
- operation counts and byte volumes — `get_ops_stats_since_snapshot`, surfaced through
  `src/server/schemas/sync.ts` as `opsSinceSnapshot` / `bytesSinceSnapshot`
- `vault_memberships` — the membership graph: who shares a vault with whom, and their role
- X25519 public keys (`vault_memberships.enc_public_key`)
- passkey metadata including `aaguid` (authenticator make/model), `transports`, `last_used_at`

So the shipped copy states the true thing in both directions: the server holds ciphertext it has no
key for, **and** it can see who is in a vault and when each change was made and how large it was.
The word "zero-knowledge" does not appear anywhere in the new copy. No absolute ("unhackable",
"100%", "nobody can ever", "even if compelled by law") appears anywhere. Where the guarantee was
ambiguous I understated it.

---

## 4. Files changed

Product (marketing surface only):

- `src/app/(marketing)/layout.tsx` — truthful route-group `metadata` (title + description),
  overriding the root layout's "Track shared household expenses" without editing the root file.
- `src/components/features/landing/HeroSection.tsx` — positioning rewrite; honest badge; the empty
  screenshot placeholder replaced with a factual three-step description of the real flow.
- `src/components/features/landing/FeaturesSection.tsx` — budgeting and insights cards deleted;
  eight true capability cards; heading structure fixed so the visually-large text is the `h2`
  (previously a `<p>` sat under a small `h2`, which read incorrectly to assistive tech).
- `src/components/features/landing/SecuritySection.tsx` — accurate crypto names, honest metadata
  disclosure, open-source/MIT badge removed.
- `src/components/features/landing/CTASection.tsx` — "tracking" framing removed; accurate unlock
  copy.
- `src/components/features/landing/Footer.tsx` — all `href="#"` dead destinations removed, wrong
  GitHub account links removed, MIT claim removed.
- `src/components/features/landing/Header.tsx` — dead "Open Source" nav item removed; fixed a
  dark-mode defect where the header bar stayed opaque white in dark mode.

Tests:

- `tests/unit/components/landing-page.test.tsx` — semantics, heading order, CTA/nav destinations,
  false-heading guard, false-absolute guard, no-dead-link guard.
- `tests/e2e/landing.spec.ts` — unauthenticated landing → primary CTA → new-user entry, both desktop
  and mobile nav, plus in-page anchor navigation.

Nothing under `src/lib/**`, `src/server/**`, `supabase/**` or `src/app/(app)/**` was touched.

---

## 5. Gate results

Recorded in the handback message to root with real counts.

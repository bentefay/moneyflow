# P08 Scope Adjudication — Revision 01

- **Adjudicator:** `p08-scope-adjudicator-01` (independent; not P08 implementer, not P08 reviewer)
- **Date:** 2026-07-26
- **Question:** Does the full 29-clause D-013 "linked hybrid + lossless epoch rotation" contract
  stand as P08's definition-of-done (ruling **a**), or does the frozen text not require the epoch
  machinery, making a boundary-safe core sufficient (ruling **b**)?
- **Standard applied:** The FROZEN requirement text (SCOPE.json / human-scratch.md) is the only
  authority. D-013 and the P07 ADR may themselves be over-scoped. Default to **(a)** unless the
  frozen text PLAINLY does not require the elaborated machinery; the burden is on **(b)**. Security
  floor: do not rule (b) if it would leave a genuine security defect the frozen intent implies.

---

## RULING: (b)

The frozen text of HS-011 and HS-012 plainly does not require epoch rotation, exact-operation
identity, edit fences, transition journals, or frontier-bound causal repair. The **linked-hybrid
data model** (Vault-Settings-authoritative membership + People-financial + auto-linked Person) is
frozen-traceable and is P08's real ask; the **lossless multi-epoch rotation apparatus** bolted onto
it by the P07 ADR is an independent security-engineering ambition with no frozen mandate. This is
the same failure mode already corrected once in this goal (D-011 → D-017): an earlier agent inflated
a small frozen ask into a large security ambition, and the downstream review validated the
ambition's internal coherence rather than its frozen basis.

The `vault_ops` boundary must therefore stay PRESERVED. No boundary-change Q-approval is required,
because the frozen text does not demand the machinery that would force the change.

---

## The frozen text (the only authority)

**HS-011** (`SCOPE.json#HS-011`, `human-scratch.md:307-311`) — verbatim:

> - [] What is the current UX for adding a new user to a vault? I thought we had an invite flow? But
>   I can't see it? Does it make sense that each user must be a person in the vault? You can then
>   optionally invite that person to join the vault as a user? So the person page is also used for
>   managing users that have access to the vault? Or perhaps users with access should live in vault
>   settings?

**HS-012** (`SCOPE.json#HS-012`, `human-scratch.md:313-315`) — verbatim:

> - [] There should be a person created for each user automatically, person should have an optional
>   user id (pub key hash?) and the person name should become optional and uses the user name as a
>   fallback if it has an associated user.

**What the frozen text asks for, exhaustively:**

1. A discoverable, working invite flow for _adding_ a user to a vault (the human "can't see it").
2. A decision on whether each user maps to a Person, and whether you invite a Person to join as a
   user.
3. A decision on _where_ member/access management lives — the People page or Vault Settings.
4. (HS-012) Auto-create a Person per user; optional user id (pubkey hash); optional Person name with
   the user's name as fallback.

**What the frozen text never mentions — not once:** member _removal_, re-keying, forward secrecy,
epochs, what a removed member can or cannot decrypt, exact-operation permanence, crash-safe
rotation, causal repair, or concurrent-offline-edit reconciliation. Every one of those is the
subject matter of the excised 29-clause machinery. The frozen ask is a UX-and-data-model question
about _adding_ users and _where_ management lives; it is silent on the entire problem domain the
epoch protocol solves.

---

## Independent findings

### 1. The epoch machinery's sole purpose is rekey-on-removal, which is not in the frozen text

Reading the P07 ADR (`evidence/P07/implementation-04.md`) end to end, the entire epoch / per-epoch
envelope / `exact_operation_id` / fence / journal / rotation-manifest / causal-repair apparatus
exists to serve one self-imposed goal: when a member is _removed_, re-key the vault losslessly and
crash-safely so the removed member cannot fetch _future_ envelopes (ADR lines 88, 101–108, 145–150,
210–311). The ADR itself introduces removal as an in-scope choice ("Only member invitations and
member removal ship in P08", line 88) and then derives all the machinery from making that removal's
rekey lossless across concurrent offline/sibling edits.

Because the frozen text never asks for removal or forward secrecy, the machinery derived from them
has no frozen root. The ADR's own claim that the linked hybrid is "the narrowest ... answer to the
frozen wording" (line 97) refers to the **data-model choice** (Settings-authoritative vs
People-owned), which is frozen-traceable — not to the epoch apparatus, which the same paragraph does
not tie to any frozen clause.

### 2. The P07 review validated internal coherence, not frozen traceability

`reviews/P07-review-04.md` is an internal-consistency review: it confirms the 29 clauses are
mutually consistent, that exact-op identity is preserved across rotation, that receipts are
monotonic, etc. It never tests whether frozen HS-011/HS-012 _demand_ epoch rotation; it accepts the
ambition as given ("all 29 P08 clauses ... remain intact"). A PASS there is not evidence of frozen
mandate — exactly the D-011/D-017 pattern.

### 3. A rekey-on-removal path ALREADY EXISTS in the preserved P04 boundary

Decisive for the security floor. The preserved system already ships forward-secrecy-on-removal
machinery:

- `src/server/routers/membership.ts` — `remove` (owner-only member DELETE) plus `rekey` calling the
  `rekey_vault_members(uuid,text,jsonb)` RPC. The router header documents the flow: owner removes →
  client generates a new vault key → re-encrypts the CRDT snapshot → wraps the new key for each
  remaining member via their `enc_public_key` → `rekey` updates `encrypted_vault_key` for all
  remaining members.
- `vault_memberships.enc_public_key` (migration `005_vault_ops.sql:266`) is explicitly commented
  "for vault re-keying when members are removed."

So "removing a member re-keys future access" is an _existing, preserved_ capability, not something
the boundary-safe core omits. D-013's epoch protocol is a losslessness/crash-safety _hardening_ of
this existing rekey — an engineering-quality upgrade, not the introduction of a missing security
floor. Even D-013 concedes it cannot erase data a removed member already downloaded (ADR 107–108;
D-013 "honest past-copy limits"), so the machinery does not deliver true forward secrecy anyway; it
only makes the _rekey transition_ lossless under concurrency.

### 4. The security floor is met by the boundary-safe core, with no new defect

Is real authenticated `crypto_box` key-wrap + server-side role authorization + fragment-only bearer
secrets enough to call the invite flow "properly secure" per the frozen intent (the HS-015 sibling
standard)? **Yes.** The only genuine security defect in the current code is the placeholder
redemption (`src/app/(onboarding)/invite/[token]/page.tsx:168-181` sends
`sodium.randombytes_buf(48)` as the membership key, so an invitee cannot open the real vault). The
boundary-safe core _fixes_ that with real authenticated key-wrap so the invitee opens the same
vault. That is a real security fix, not a placeholder.

**Is rotation-on-member-removal essential such that omitting it is a defect?** No, for three
independent reasons: (i) the frozen text never mentions removal or forward secrecy; (ii) a
rekey-on-removal path already exists and is preserved unchanged; (iii) even the full contract
concedes it cannot erase past copies. Omitting the _lossless-epoch_ elaboration therefore leaves no
security defect against the frozen intent — it is a smaller, harder-engineering feature set, not a
hole. **The frozen text does not require rekey-on-removal as a new deliverable at all**; to the
extent "managing users that have access" implies removal must work, the _existing preserved_
remove+rekey path satisfies it.

### 5. Boundary-change factual claim: CONFIRMED (but rendered moot by ruling b)

Independently verified against the real schema. `vault_ops` (migration `005_vault_ops.sql:235-241`)
has exactly six columns —
`id, vault_id, version_vector, encrypted_data, author_pubkey_hash, created_at`. There is **no**
`epoch`, `exact_operation_id`, or peer/frontier metadata anywhere in `supabase/migrations/` (grep
for `exact_operation_id|access_generation|epoch_transition| envelope_history` returns nothing).
Therefore the implementer's claim is TRUE: honoring the full D-013 contract as written _would_ force
adding `epoch` + `exact_operation_id` + peer/frontier columns to `vault_ops` and rewriting the local
operation-admission pipeline — a modification of the PRESERVED P04 boundary.

Because I rule **(b)**, that boundary change is **not** required and must **not** be made. The P04
`vault_ops` boundary stays preserved; no boundary-change Q-approval is warranted.

---

## Definition-of-done for P08 (fully satisfies frozen HS-011 + HS-012)

P08 MUST deliver all of the following; it must NOT touch `vault_ops` / realtime / RLS.

1. **HS-011 — real, secure invite redemption.** Remove the `randombytes_buf(48)` placeholder. The
   invitee unwraps the REAL vault key via authenticated `crypto_box` (fragment-derived ephemeral
   secret + owner's authoritative X25519 sender key, resolved server-side — no schema change, no
   caller-claimed sender) and self-wraps it, so a redeemed member opens the SAME vault. Fragment
   secret stays in the URL fragment only.
2. **HS-011 — authoritative, reachable membership/access surface.** The linked-hybrid answer to the
   frozen UX question: an "Access & Members" surface in **Vault Settings** where the owner discovers
   / creates / copies / revokes invites and lists members; members see a privacy-safe roster.
   Server-side role authorization is enforced (unauthorized mutation rejected). The dead People-page
   hardcoding (`isOwner=false`, `vaultKey=undefined`) is removed; People keeps financial semantics
   with, at most, an optional membership-link display and a deep link to Settings.
3. **HS-011 — member removal via the EXISTING preserved path.** Member removal must be reachable and
   must invoke the existing `membership.remove` + `membership.rekey` (`rekey_vault_members`)
   mechanism so a removed member loses future-envelope access at the strength the preserved boundary
   already provides. **Rekey-on-removal is IN only as the existing preserved capability wired up —
   NOT as new epoch machinery.** The lossless/crash-safe/concurrent-offline guarantee is OUT (see
   below). If wiring the existing rekey fully is out of P08's reach, removal may ship as the
   pre-existing behavior unchanged; either way no NEW security regression is introduced.
4. **HS-012 — auto-linked Person per user.** Deterministic, idempotent Person-per-member: owner
   links `person-default-me` in place (`linkedUserId = ownerPubkeyHash`); invitee idempotently
   upserts one Person keyed on the stable pubkey hash so concurrent tabs / refresh / re-add converge
   to a single Person. `Person.name` becomes OPTIONAL with a centralized display-name resolver
   (explicit name → self label → deterministic non-identifying fallback; never renders a raw pubkey
   hash). Existing allocations/settlement/financial state are untouched by linkage.
5. **Real tests.** Unit/property tests for the resolver and idempotent linkage; integration tests
   for invite create → redeem → membership and for removal+rekey authorization; a two-user E2E that
   exercises the REAL invite UI journey (not the service-role admin-key-wrap bypass currently in
   `tests/e2e/helpers/realtime.ts`).
6. **Gates.** `pnpm typecheck && lint && format:check && test && test:e2e` green.

### Excised epoch machinery — classification

Epoch rotation, monotonic vault epochs, per-epoch envelope history + `access_generation`,
`exact_operation_id` + peer/frontier/version metadata on every Loro op, IndexedDB edit-admission
fences + epoch-transition journals, the 7-state rotation state machine, fragment-derived Ed25519
capability signing + preflight challenge, two-boundary `pendingAcceptances`/`pendingCreations`
sagas, frontier-bound causal repair, soft membership removal / tenure denial, legacy-op epoch-0
backfill migration, and multi-tab crash-injection + rotation E2E:

**These map to NO frozen requirement in SCOPE.json.** They are a losslessness/crash-safety hardening
of an already-existing rekey capability, invented by the P07 ADR from a self-imposed
member-removal/forward-secrecy ambition the frozen text does not state. They are future-work with NO
frozen mandate. **They should NOT be spun out into a new goal package.** They may be recorded as
optional future hardening (documented as undelivered, no frozen basis) and left dormant unless a
future human requirement introduces forward-secrecy-on-removal into scope. No security defect
against the frozen intent remains once the boundary-safe core (items 1–6) is delivered.

---

## Consequences for the ledger (for root to transcribe; adjudicator does not edit ledgers)

- **D-013 should be superseded / rescoped** (mirroring D-011 → D-017): its linked-hybrid data-model
  decision STANDS as frozen-traceable; its "lossless epoch and client reconciliation protocols"
  elaboration and the "P08 must implement all 29 clauses" mandate are OVER-SCOPED beyond the frozen
  text and are removed from P08's definition-of-done.
- **Q-025** resolves to **(b)**. No `vault_ops` boundary-change Q-approval is issued; the boundary
  stays preserved.
- **Q-026 / Q-027 / Q-028** collapse to their safest-reversible defaults already proposed by the
  implementer (encrypted-CRDT-only optional name with deterministic non-identifying fallback;
  preserve—never auto-merge—legacy duplicate links; key linkage on the stable pubkey hash). These
  are consistent with the frozen text and carry no epoch dependency.

---

## Boundary-change claim verdict (one line)

**CONFIRMED**: the full D-013 contract as written would require adding `epoch` +
`exact_operation_id`

- peer/frontier columns to the preserved `vault_ops` table (verified absent in
  `supabase/migrations/005_vault_ops.sql:235-241`) — but ruling (b) means that change is not
  required and must not be made.

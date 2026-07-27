# HANDOFF — P20A IMPLEMENT dispatch (revision 01)

**To:** `p20a-implementer-01` (fresh implementer). **From:** root coordinator.

**Package:** P20A (HS-016 — Truthful marketing pages). **This is the SOLE HS-016 package** — on the
independent reviewer's PASS, root performs the NON-markerless final integration that checks the
HS-016 scratch block and flips the HS-016 requirement to `passed`. Build it as the last product work
before HS-016 is declared complete (only HS-021 remains after you).

**BASE = current HEAD `42900590302030f9b38a56a560e9f53ecb3f65ed`.** Commit your work on top of BASE.
**No-checkout discipline: do NOT checkout / reset / branch / switch** — the tree stays at HEAD; make
commits forward only. Linear single-parent chain, one logical feat commit (plus optional test
commit) is ideal.

## Frozen requirement — the source of truth

`specs/human-scratch.md:328-331` (HS-016), exact bytes (also in `SCOPE.json#HS-016`):

> Update the marketing pages to include all these features. Be clear, succinct and not too
> "markety". It's private. It's for categorising and allocating your transactions, not budgeting.
> Supports importing CSV and ofx. Multiple people can collaborate in real-time. It intelligently
> applies your tags, aliases and allocations to new imports.

Full brief: `specs/007-human-scratch-completion/tasks/HS-016-marketing-pages.md`. Read the frozen
text, not any evidence, as your source of truth.

## The marketing surface (your ONLY editable product scope)

Public landing pages live under:

- `src/app/(marketing)/page.tsx`, `src/app/(marketing)/layout.tsx`
- `src/components/features/landing/` — `HeroSection.tsx`, `FeaturesSection.tsx`,
  `SecuritySection.tsx`, `CTASection.tsx`, `Footer.tsx`, `Header.tsx`, `index.ts`

**Untruthful/off-positioning copy to audit and correct (non-exhaustive — inventory ALL of it):**

- `FeaturesSection.tsx:68,76` — advertises **"Smart Budgeting"** ("Set budgets for categories and
  track spending… nudges when you're approaching limits") and **"Spending Insights"**. Budgeting is
  explicitly NOT what this product does (frozen: "not budgeting"). Remove/replace.
- `CTASection.tsx:35` — "Start tracking your household expenses…"; `Footer.tsx:56` — "household
  finance **tracking**"; `HeroSection.tsx:54` — "**Track** expenses together". Audit
  "track/tracking" language that implies budgeting/expense-tracking rather than **categorising and
  allocating**.

You may add small presentational components/helpers under `src/components/features/landing/` if
needed, but do **NOT** modify anything under `src/lib/**`, `src/server/**`, any migration, any
`src/app/(app)/**` product page, or any root-owned spec/ledger/marker file.

## What to build

1. **Claim-to-evidence table FIRST (before copy changes).** In your evidence file
   `evidence/P20A/implementation-01.md`, produce a table mapping every public claim you will make to
   the independently-passed feature that supports it (privacy/client-side encryption; CSV **and
   OFX** import; categorising + allocating transactions; People allocations; real-time
   collaboration; intelligent auto-application of tags/aliases/allocations to new imports). **No
   claim may be made for a feature that isn't actually usable** — if a claim has no shipped
   evidence, cut the claim.
2. **Rewrite copy to the frozen positioning:** private; **categorising and allocating** your
   transactions, **not budgeting**; imports **CSV and OFX**; **multiple people collaborate in
   real-time**; **intelligently applies your tags, aliases and allocations to new imports**. Clear,
   succinct, plain, credible — **not "markety"**. Coherent information hierarchy; working CTA/nav
   links (no dead destinations; auth/CTA copy correct after P18/P19).
3. **Privacy wording must match the threat model — no false absolutes.** Describe client-side
   encryption accurately (financial data encrypted on the client; the server never sees plaintext)
   without overclaiming ("unhackable", "perfectly anonymous", metadata claims the model doesn't
   support). When in doubt, understate.
4. **Presentation stays polished:** responsive (desktop + mobile), dark/light,
   `prefers-reduced- motion` respected, metadata/`<title>`/semantics and accessibility (heading
   order, link text, focus order, contrast) intact.

## Hard rules (blocking if violated)

- **No new `as` / `any` / non-null `!` in product code** (repo-wide hard rule; product stays
  cast-free). Test-fixture casts tolerated only if genuinely necessary and honest.
- **SECRET-SAFETY (BLOCKING):** no seed phrase, recovery material, vault master key, vault-derived
  key, invite bearer secret, `crypto_box` secret material, `SUPABASE_JWT_SECRET`, or vault plaintext
  anywhere in copy/code/tests/fixtures/evidence. Synthetic/public content only. Any real-material
  leak is a blocking finding reported to root IMMEDIATELY.
- **Do not advertise unreleased or blocked behavior.** Every advertised feature must be usable
  today.
- **Hard boundary byte-identical BASE->HEAD:** FS-001 `src/lib/domain/settlement.ts` blob
  `010f3c93582a2ce311594d4dde8464760ca49c43` — must NOT change (your scope is marketing only;
  nothing under `src/lib/**` should move at all).

## Automated tests (required)

- **Component/accessibility tests** for the landing surface: semantic structure, heading order,
  link/CTA destinations, and a **guard against false headings** — assert the page does **NOT**
  render "Smart Budgeting" / "Spending Insights" / budgeting language. Assert the true positioning
  is present (categorise/allocate, CSV + OFX, real-time collaboration, auto-apply to imports) at the
  heading/landmark level, **not** brittle full-prose equality.
- **A public landing-to-create E2E journey** (unauthenticated landing → primary CTA →
  create/new-user entry), plus keep any existing visual/navigation coverage green. Assert behaviour
  and destinations, not incidental wording.

## Gates — run and report REAL counts

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. Report the real
counts for each. A `format:check` failure confined to pre-existing `specs/**` markdown is
NON-blocking; any P20A `.ts`/`.tsx` failing oxfmt IS blocking. Never run Playwright with
`--debug/--ui/--headed/show`.

## Handback

SendMessage to `main` with: the final HEAD SHA and the linear commit chain BASE(`4290059`)->HEAD;
the **claim-to-evidence table**; the five real gate counts; an explicit statement that (a) all
budgeting/insight/"tracking-as-budgeting" copy is gone and positioning is categorise+allocate (not
budgeting), (b) every advertised feature is backed by a shipped/usable capability, (c) privacy
wording matches the threat model with no false absolutes, (d) the FS-001 boundary is byte-identical
and nothing under `src/lib/**` changed, (e) no secret material anywhere, and (f) responsive/dark/
reduced-motion/accessibility are intact. Include any Q-proposals (e.g. tone preference — factual
accuracy wins without pausing) and note the evidence path `evidence/P20A/implementation-01.md`. Do
not edit root-owned ledger/marker/spec files; do not checkout/reset.

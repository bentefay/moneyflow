# HS-016 — Truthful Marketing Pages

- **Status:** queued
- **Source:** `specs/human-scratch.md:328-331`; exact frozen text is in `SCOPE.json#HS-016`
- **Package:** P20A
- **Depends on:** delivered product behavior, especially P17 automations and P19 auth

## Frozen requirement

> Update marketing with clear, succinct, non-markety truth: private transaction categorisation and
> allocation—not budgeting—CSV/OFX, real-time collaboration, and intelligent
> tags/aliases/allocations.

## Current evidence to revalidate

- `FeaturesSection.tsx` currently advertises “Smart Budgeting” and “Spending Insights,” which do not
  match the required positioning.
- Existing CTA/navigation copy should be audited for unsupported budgeting/tracking claims, dead
  destinations and auth claims after P18/P19.

## Acceptance direction

- Inventory every public claim against independently passed features; remove budgeting/insight
  claims and describe privacy/encryption, CSV/OFX import, categorisation, People allocations,
  collaboration, aliases/tags and automation precisely without absolutes unsupported by the threat
  model.
- Keep copy short, plain and credible with a coherent information hierarchy and working CTA links.
- Responsive/dark/reduced-motion presentation and metadata/accessibility remain polished; no feature
  is advertised before it is actually usable.

## Implementation and review checkpoints

- Produce claim-to-evidence table before copy changes. Reviewer checks real product behavior and
  security wording, not marketing intent alone.

## Automated tests

- Component/accessibility checks for semantics/links; existing visual/navigation E2E plus a public
  landing-to-create journey. Avoid brittle assertions over full prose while guarding false headings.

## Manual Playwright CLI charter

- Read every public page at desktop/mobile, dark/light and reduced motion; follow all navigation/CTA
  links with keyboard and pointer, inspect focus/order/overflow and compare claims to real app
  flows.
- Inspect console/network, metadata and unauthenticated errors. Reject vague hype, false absolutes,
  budgeting language, dense copy or animation that obscures content.

## UX, style, and E2E review

Apply component/style/accessibility/E2E guides. The reviewer must give a plain-language truthfulness
and UX verdict and require maintained journey tests without coupling to incidental wording.

## Risks and questions

- Risks: claiming unreleased/blocked behavior, overstating privacy, SEO regressions. Return optional
  tone preference as a Q proposal; factual accuracy wins without pausing.

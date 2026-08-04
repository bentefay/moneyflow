---
name: playwright-getbyrole-name-is-substring
description:
    Playwright getByRole name matching is substring-based while Testing Library's is exact, so an
    assertion correct in a unit test is ambiguous in E2E
metadata:
    type: project
---

Playwright's `getByRole(role, {name})` matches the accessible name as a **substring**; Testing
Library's `getByRole` `name` option matches **exactly** by default. Pass `exact: true` in Playwright
whenever one expected label could appear inside another.

**Why:** In P24/UR-003 the presence avatars are labelled "Me" for the vault owner and "Unnamed
member" for an unnamed invitee. `getByRole("img", {name: "Me"})` matched BOTH — "me" sits inside
"Unna**me**d member" — and failed with a strict-mode violation resolving to two elements. The
equivalent unit-test assertion passed, because the two harnesses differ on this default. The
E2E-only failure looked like a product bug in the run log but was purely a locator defect.

**How to apply:** When writing E2E label assertions, list every label that can render in the same
container and check for substring containment before choosing the locator. Short labels ("Me", "OK",
"All") are the risky ones. If a full-suite run fails on a locator resolving to multiple elements,
read the printed elements first — they often show the product behaving correctly, as they did here.

Related: [[e2e-catches-what-unit-tests-cannot]].

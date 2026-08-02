---
name: copied-fixture-defeats-dependency-test
description:
    A test that hand-copies a dependency's source into a local fixture cannot constrain that
    dependency; mutate the real module to prove the gap.
metadata:
    type: feedback
---

When a test's stated purpose is to constrain a module OTHER than the one under test — "blast
radius", "outside the table", "unchanged", "does not disturb" — check whether it actually imports or
renders that module, or merely asserts against a hand-copied string literal of its source. A copied
fixture makes the assertion true by construction; it decouples silently at exactly the moment the
dependency changes, which is the only moment it was supposed to matter.

**Why:** In P26/UR-005 a unit case titled "does not disturb a shared primitive used outside the
transaction table", commented "Blast radius, asserted rather than assumed", asserted
`cn(SHARED_PRIMITIVE_BASES.input)` contains `dark:bg-input/30` — where that constant was a literal
declared at the top of the same test file. I mutated the real `src/components/ui/input.tsx` to leak
the fix's chrome product-wide and BOTH full suites stayed green: 2186 unit, 168 E2E. Inspection
alone would have made this a weak stylistic note; the mutation made it a provable Medium finding.

**How to apply:** Copied fixtures are legitimate when the case tests a pure transformation against
known inputs. They are a false assurance the moment the case's name claims coverage of the real
dependency. Ask the standard question: _could this assertion still pass if the thing it claims to
prevent had already happened?_ Then prove the answer by mutating the real module, per
[[mutation-probe-test-gaps]] — and mutate the site the test CLAIMS to cover, per
[[mutation-probe-must-match-claimed-site]]. Before proposing the replacement test, validate it in
BOTH directions: it must fail against the mutation and pass against the unmutated tree. Watch for a
known load-sensitive test failing during the probe and being misread as the mutation being caught.

---
name: changed-assertion-containment-test
description:
    To judge whether a changed test assertion is stronger or merely different, enumerate what each
    version accepts and check set containment — do not read the diff and judge it plausible.
metadata:
    type: feedback
---

When a package changes an existing assertion, decide stronger-vs-weaker by **enumerating the set of
values each version accepts** and checking containment. Reading the diff and finding it plausible is
not an audit.

**Why:** P28/UR-007 landed a test-only commit mid-review that replaced

```
OLD  expect(result).toMatch(/25\/6\/15|6\/15\/25/)
NEW  expect(...).toBe("25/6/15")
```

The old alternation accepted **both field orders**, and being unanchored also accepted any string
containing either — which is exactly why it passed while the `ja-JP` output was corrupted to
`1/1/5`. The test had been written to accept the bug. Containment settles it: every value NEW
accepts, OLD also accepted; the converse is false, so NEW is strictly stronger. The same commit's
other file had **no removed lines at all**, so nothing there could have been weakened.

A changed assertion is where a package silently weakens coverage, and a test commit landing after
handoff is the highest-risk version of it. The lead had called it "good-faith hardening" and still
explicitly told me not to accept that framing — correctly.

**How to apply:** For each changed assertion, ask what set of values passes before and after. Strict
strengthening means new-accepts is a proper subset of old-accepts. Watch for: unanchored regexes,
alternations spanning mutually exclusive correct answers, `toMatch` replacing `toBe`, `toContain`,
and loosened numeric tolerances. Support it with cheap mechanical checks — `git diff | grep '^-'` to
prove a file is purely additive, and counts of `it()` and `expect()` before/after to show no case
was dropped. Report the counts; they make the conclusion checkable by someone who did not run it.
Pairs with [[probe-real-module-across-inputs]]: that one finds bugs the tests never named, this one
finds bugs the tests were written to tolerate.

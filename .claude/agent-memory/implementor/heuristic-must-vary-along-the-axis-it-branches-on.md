---
name: heuristic-must-vary-along-the-axis-it-branches-on
description:
    When code picks one of several candidates, the fixture must place the correct candidate in a
    losing position - and a comment claiming a protection must be checked against the code
metadata:
    type: feedback
---

When code **selects among candidates** (best column, best match, highest score), a fixture where the
correct candidate already sits in the winning position proves nothing: the buggy rule and the
correct rule agree. **Build the fixture so the right answer is in a losing position** — not
leftmost, not first, not highest-scoring by the naive metric.

Corollary: if two candidates are genuinely **identical** along the axis you are measuring, no rule
over that axis can separate them. Find another axis or accept you will be wrong half the time. Money
columns: a running balance and an all-positive amount column have the same signs, same minor units,
same magnitudes — only a header name separates them.

**Why:** P29 rev 01 shipped a column detector that ranked with `rate > best.rate` (strictly
greater), so ties fell to the **leftmost** column. `Date,Check No,Description,Amount` imported the
CHECK NUMBERS as money with every row marked valid — silently wrong money presented as success, and
a regression against the header-name detector it replaced. My fixture was
`Date,Description,Amount,Balance`, the one arrangement where the correct column is leftmost among
the numeric ones. 20 green tests, defect shipped.

Two aggravating factors worth remembering:

- **I wrote a comment claiming a protection the code did not provide** — "columns that read as
  amounts are set aside first, so a trailing balance column does not win the role". That set-aside
  fed only the _description_ selection; nothing guarded the amount role. Prose asserting a property
  the code does not enforce is worse than no comment: it suppresses the question. **Re-read every
  comment that claims a guarantee and trace it to the line that enforces it.**
- **I had already written the general lesson**
  ([[unblocking-a-path-makes-downstream-newly-reachable]]) in the same package's evidence, then
  committed an instance of it. Stating a principle is not applying it.

**The lesson recurred one level down, inside the helper written to fix it.** The rev-02 fix added a
fallback — "prefer columns a header does not disown, else use them all" — which is a NEW BRANCH, and
therefore a new axis. Every fixture contained a real `Amount` column, so the fallback was never
reached, and it hid a defect that imported a running balance as money. All six value-level tests
written specifically to escape the earlier blindness would still have passed.

**THE OPERATIONAL RULE: write the other-path fixture in the SAME EDIT as the branch, before running
anything.** Not in the test-writing pass afterwards — deferring it is where it evaporates. The
insight ("a branch you ADD is an axis no existing fixture covers") is the diagnosis; the immediacy
is the thing that actually prevents the defect. I did not lack the insight in P29 rev 02; I deferred
the fixture, and deferred meant never.

"Assert values, not the selection" was too narrow a generalisation; the correct form is: _a fixture
set must vary along every axis the code branches on, and adding a branch obliges you to add a
fixture that reaches it._

Applied to the rev-03 fix itself before shipping it: the new `if (preferred.length === 0)` was
exercised from both sides — all-disowned, one-preferred, unnamed-but-not-disowned, and
disowned-beside-unknown — rather than assuming the happy path covered it.

Related: when a denylist-style guard misfires, check whether the bug is a **missing entry** or the
code **overriding the guard when it fires**. Extending the list does not touch the second.

**How to apply:** For any ranking/selection code, ask "which arrangement makes the naive rule agree
with the correct rule?" and make sure that is NOT your only fixture. See also
[[test-that-cannot-fail-proves-nothing]].

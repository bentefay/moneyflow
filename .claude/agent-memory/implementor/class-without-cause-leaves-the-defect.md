---
name: class-without-cause-leaves-the-defect
description:
    establishing that a failure is a flake class and stopping there leaves the cause at every other
    site it lives at; this repo has now shipped the same race three times over
metadata:
    type: feedback
---

A prior agent diagnosed an E2E failure as "a load-dependent test-timing flake, not a product
defect", reasoned it correctly ("a deterministic product bug would fail every run, not ~1 in 8"),
fixed the one site that had failed, and wrote a comment saying the sibling sites were deliberately
left alone "for coverage". The reasoning was sound and the conclusion was right. It still shipped
the defect, because it identified the **class** and never the **cause** — so the same race stayed at
three other call sites and duly failed one of them weeks later.

I then repeated it in miniature: I fixed the two sites I judged racy and cleared a third on a single
grep hit (`PasskeyManager` passes `autoFocus={false}`). There are **two** `SeedPhraseInput` uses in
that file; the other one takes the default `autoFocus` and was racy. My reviewer caught it by asking
for a count rather than a fix.

**Why:** "it's a flake" is a statement about the failure's _statistics_. It licenses nothing about
where else the mechanism lives. Only the cause tells you the blast radius, and until you have it,
every judgement about which other sites are safe is a guess wearing a justification.

**How to apply:** when a failure turns out to be a race or a timing dependency, do not stop at
classifying it. Find the mechanism, then **enumerate every call site of that mechanism** and state a
count — how many exist, how many were unprotected, how many are now, and which are deliberately left
alone and why. A site you believe is safe needs the reason checked against the source, not against
the one example you happened to grep. If you cannot protect a site, name it rather than omitting it:
in this case one site fills _deliberately_ before hydration to test that path, and gating it would
have deleted the test. See [[a-stopped-agent-may-have-already-fixed-it]] and
[[verify-dispatch-site-enumerations]].

---
name: remove-fallbacks-dont-bypass-them
description:
    When a bad default caused the defect, delete the optional prop and make the good value required,
    so the bug cannot regress at a future call site
metadata:
    type: feedback
---

When a defect traces to an optional prop with a silent fallback (`name?: string` defaulting to
`name || userId`), fix it by making the good value **required** and typed, not by passing the right
value at each current call site.

**Why:** In P24/UR-003 the presence avatar fell back to rendering the member's pubkey hash whenever
no name was passed. Passing a name at the three known sites would have fixed the report while
leaving the trap armed for the next site someone adds. Making `displayName: MemberDisplayName`
required turned "avatar rendered without a resolved name" into a compile error. A discriminated
union rather than a string also forces the caller to handle the unresolved case deliberately, which
is where the bad output came from.

**How to apply:** Reach for this when the reported bug is a rendering of the wrong identifier and
the mechanism is a `||` or `??` fallback. Check the repo rule first — this codebase's "make illegal
states unrepresentable" guidance in `.claude/rules/typescript-style.md` backs it. Say in evidence
that you changed the prop contract rather than the call sites, and why, since it is a wider diff
than the dispatch may have anticipated.

Related: [[verify-dispatch-site-enumerations]].

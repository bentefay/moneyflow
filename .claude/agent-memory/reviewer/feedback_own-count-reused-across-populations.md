---
name: own-count-reused-across-populations
description:
    A number I derived minutes earlier for a different population reappears in a new sentence as if
    measured for that one; re-run the grep per sentence.
metadata:
    type: feedback
---

When two counts are live in working memory at once, the freshly derived one leaks into the next
sentence even when that sentence is about a different population. In P20B rev 09 I derived **16
in-app client-side link navigations**, then wrote "**16** raw `page.goto` teardowns remain" in a
finding and in the verdict summary. The real figure was **53** in spec files, 52 unbarriered. Both
sentences were tagged MEASURED and neither was.

**Why:** the slip is invisible on reread — the number has a real derivation behind it, just not the
one the sentence claims, so it reads as measured to me and to every later reader. It is the same
failure mode as [[fabricated-measurement-voice]] and
[[dispatch-premise-contradicts-its-own-citation]], except the source is my own arithmetic minutes
earlier rather than a handed-down claim, so none of my defences against inherited numbers fire.

**How to apply:** every quantified sentence in a review gets its own command, run in the message
that quotes it — never a number recalled from an earlier tool result, however recent. Before writing
a count, name the population out loud ("raw `.goto(` in `*.spec.ts`" vs "link clicks followed by
`.click()`") and check the command actually filtered to that population. Two counts of similar
magnitude in one review are the danger sign; re-derive both. See also
[[predicates-inherit-unchecked]].

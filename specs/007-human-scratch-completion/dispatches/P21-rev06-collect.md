# P21 rev 06 — executable final audit — ACTIVE

**Entry condition: MET, and MEASURED by root at dispatch time.** All 34 requirement-ledger rows show
`passed`; P21 is the only package row not passed. P30 rev 07 PASSED (`reviews/P30-review-04.md`) and
P33 rev 03 PASSED (`reviews/P33-review-03.md`) and is merged at `05e16df`.

Rev 06 was dispatched once before and **voided** when UR-001..UR-004 were admitted mid-audit. The
condition has been unmet since. **Re-verify it yourself before starting** — if any row is not
`passed` when you look, stop and report rather than proceeding.

**Collector:** `p21-collector-06`. **Reviewer:** `p21-reviewer-06`, dispatched by root only after
the collector hands back and root re-confirms HEAD still equals BASE.

MEASURED across every P21 artifact — ten prior agents exist, and **both proposed names are unused**:

```
p21-collector-01 … -05      p21-reviewer-01 … -05
```

Neither `-06` collides. An earlier version of this draft listed only four prior agents; that was
wrong and is the kind of understated denominator this dispatch warns about below.

**BASE:** re-derive with `git rev-parse HEAD` at dispatch time. Do not carry a hash from this draft.

## What this audit is

Root owns `FINAL-AUDIT.md`; the collector proposes results in its own evidence only, the reviewer
independently re-runs them, and only root transcribes after an unconditional PASS. Empty diff is
expected and is never automatic approval.

## FAIL triggers, verbatim from the contract (`tasks/P21-final-audit.md`)

Any failing check, unexplained flake, material UX/accessibility/security/data/performance finding,
**false marketing claim**, missing evidence, write-boundary breach, or unclassified drift.

## Carry-forward Q-proposals the audit must confirm are surfaced

`Q-P20B-00` (`pruneBuckets` CRDT data loss — ruled OUT-OF-GOAL by `D-019`, independently adjudicated
at `f290246`; **still a tracked live risk, not a closed one**), `Q-P20B-13/14`, `Q-P20A-02/05`,
`Q-P17D-02`, `Q-P20B-06/08`, `Q-P21-04-01`, `Q-P21-05-01/02/03`, and `Q-PROPOSAL-P32-01-01` (toast
stacking, measured at 4 stacked toasts).

## Known-open items the audit must NOT treat as new findings

- **`InlineEditableTags` Escape handler is bound to a `CommandInput` that has lost focus by the time
  Escape arrives.** Pre-existing, measured, ruled out of UR-009 scope. Still open.
- **`people-settlement.spec.ts` rotation.** Read the limitation note in PROGRESS.md before drawing
  any conclusion from a settlement result. Binding: **a green settlement run carries no
  information** (a fully clean 19/19 has been observed), and **for 5 of 19 tests the ID does not
  identify the failing assertion** — `:281` demonstrably varies within its ID. Do not use a clean
  settlement run as evidence of stability, and do not treat a settlement failure as a package
  defect.

## A finding the audit should carry, not rediscover

Three blocking or advisory defects across two packages share one shape, and the packages themselves
named it. **Each instrument was correct in what it asserted and blind to what mattered, because each
examined a narrower object than the claim built on it:**

- P33 F-1 — a fixture with no tag, so the pill whose remove button was buried never existed.
- P33 F-2 — a constant measured in one of two geometries, applied unchanged in the other.
- P30 Q-PROPOSAL-07-02 — a mock hard-coding the discriminating input, so no case in the file could
  exercise the clause the component decides.

Three green campaign runs were consistent with each of these being present.

**The distinction that makes the resulting sweep checkable, from `p33-implementer-01`:** *a mount
count is a census — it tells you where to look; the rule tells you which mounts can be wrong.*
`AccountCombobox` has two mounts and is safe; `CheckboxCell` had two and was not. The rule that
separates them: **a hit area applied inside a component travels to every mount; one applied at the
call site does not.**

**And one general property, visible only because two packages hit it from opposite directions:** a
locator keyed on a value **the test** edits (P30) and one keyed on a value **the product** rewrites
when a portal opens (P33) are the same defect — **a locator keyed on anything mutable is unstable,
regardless of who mutates it.**

## Method note — read before trusting any number in the ledger

This goal's final phase produced repeated instrument failures, all of one shape: **a correct,
well-formed check answering a narrower question than the claim it was used to support.** None
produced an error message; all returned conclusion-shaped answers. Instances include a `pkill -f`
that killed its own shell, a `/proc` scan that counted itself, a glob that missed the retained logs,
a diff read in the wrong direction, a test count sanctioned for the wrong tree, and a call-site
sample that **could not have falsified the claim it supported** because two of its four data points
were structurally incapable of varying.

**Root's own ledger has been corrected four times by implementers checking it against files root had
not opened.** Do not relay any figure from PROGRESS.md, HANDOFF.md, or this dispatch — re-derive it.
Where a claim is marked INFERRED, treat it as unverified. Where it is unmarked, treat it as
inferred.

**A second, distinct failure mode, identified by `p30-implementer-01` about its own work and
reproduced by root in the same exchange:**

> The pattern is not that I check badly; it is that I check the conclusion and not the step I am
> about to reuse.

Three instances in this package each had a sound load-bearing claim and a broken **intermediate**
step — and in each case the intermediate step was the part lifted out and generalised into a rule.
**Intermediate steps escape checking precisely because they are not the finding.** Operationally:
when about to generalise from a result, **re-verify the step you are lifting out of it, not the
result**. And prefer a procedure that _deletes_ an error-prone step over one that warns about it —
e.g. read a failing test's step name from Playwright's failure header, which carries it verbatim,
rather than correlating stack frames to source lines.

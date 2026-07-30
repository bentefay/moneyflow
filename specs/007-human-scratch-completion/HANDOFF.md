# HANDOFF — Q-P20B-00 engine scope adjudication (P21 rev 05)

## Your role

You are `p21-scope-adjudicator-05`, a **DISTINCT, fresh-context, opus-tier scope adjudicator** for
the MoneyFlow `human_scratch_completion` goal. You are an independent reviewer-tier agent. Your
**sole task** is to issue a written scope ruling. You do **not** implement, fix code, run the audit,
or edit any ledger/marker/evidence file.

**Independence is mandatory.** Confirm in your ruling that you are **not** and have **not acted
as**: the P21 rev-05 evidence collector (`p21-collector-05`), the P21 rev-05 reviewer
(`p21-reviewer-05`), any prior P21 evidence/review author, nor the P20A or P20B implementer or
reviewer of any revision. If you cannot confirm this, stop and tell root — do not rule.

## The question — rule on exactly this

The P21 rev-05 final audit FAILed on **M-1**:
`src/components/features/landing/FeaturesSection.tsx:65` advertises, under "Edits merge cleanly", an
**unqualified data-durability promise** — _"Two people editing at the same time will not overwrite
each other."_ The shipped engine violates it: `pruneBuckets` (`src/lib/crdt/mutations.ts:287-329`)
does `delete store[accountId]` at `:327` when an account tree empties, which is **not merge-safe** —
a concurrent peer's insert into that container is discarded on CRDT merge (`Q-P20B-00`). The
reviewer independently reproduced real data loss through the production merge path.

Root is routing the **marketing-copy correction** to P20A / HS-016 with no adjudication (that is
more work to complete committed scope, not a reduction). **Your question is only about the ENGINE
fix:**

> **Does the goal's committed scope — as fixed by the frozen `sourceTextLines` in `SCOPE.json`, the
> binding requirement task, and the specific prior decision being superseded — REQUIRE the
> `pruneBuckets` merge-safety redesign to be completed IN-GOAL, or is requiring it an over-scope
> that falls to a future, out-of-goal CRDT package?**

### The decision that would be superseded, and the clause in tension

- **Prior accepted decision:** `p20b-reviewer-01 §6.1` (see `reviews/P20B-review-01.md` and
  `Q-P20B-00` in `QUESTIONS.md`) **accepted deferring** the `pruneBuckets` engine fix as out of
  scope for the P20B style/code-quality sweep (HS-021). A ruling that the engine fix is now required
  in-goal would supersede that; a ruling that it stays out-of-goal upholds it.
- **Clause in tension:** `FINAL-AUDIT.md` carries "Duplicate-tab and multi-client operations
  converge without deadlock, infinite loading, or **lost changes**." The reviewer's reproduction
  shows lost changes occur. The load-bearing question is whether this clause **traces to a frozen
  requirement's `sourceTextLines`** (making merge-safety committed scope) or is an **accumulated
  audit elaboration / inferred sub-goal** (making it an over-scope per PROCESS.md:330-333).

## Decision rule you must apply (PROCESS.md:335-347, 330-333)

1. Rule **only from the frozen text** — `SCOPE.json` `sourceTextLines`, `specs/human-scratch.md` HS
   blocks, and the FS-001 canonical spec — not from the reviewer's recommendation, the collector's
   framing, marketing copy, or convenience.
2. **Trace test:** does merge-safe concurrent multi-user editing ("no lost changes when two people
   edit at once") appear as a **required delivered capability** in any frozen HS block's
   `sourceTextLines`? Read every block that could bear on collaboration/sync/multi-user/merge — do
   not assume; quote the exact frozen lines you rely on (cite HS-ID + line numbers).
3. **Default to the block standing:** unless the frozen text **plainly does not** require the engine
   fix, rule that it **is required in-goal**. Ambiguity resolves toward the requirement.
4. Distinguish the two acts cleanly: a _truthful marketing claim_ (HS-016) can be satisfied by
   softening copy; a _delivered merge-safety capability_ is a different requirement. Rule on the
   latter only.

## Output — write exactly one artifact

Write your ruling to **`specs/007-human-scratch-completion/reviews/P21-scope-adjudication-05.md`**
and commit it yourself with an explicit pathspec (no parentheses in the commit message). Do **not**
touch any other file — no product, test, ledger, marker, scratch, evidence, or `FINAL-AUDIT.md`.
Your ruling must contain:

- Your independence confirmation.
- **VERDICT: one of** `ENGINE-FIX-REQUIRED-IN-GOAL` or `ENGINE-FIX-OUT-OF-GOAL`, plus a one-line
  restatement.
- The exact frozen `sourceTextLines` you relied on (HS-ID + line citations, quoted), and why they do
  or do not require merge-safe concurrent editing.
- Explicit treatment of the superseded `p20b-reviewer-01 §6.1` decision and the FINAL-AUDIT "lost
  changes" clause: does the clause trace to frozen text or not?
- If `ENGINE-FIX-REQUIRED-IN-GOAL`: name the **owning package** for the engine fix strictly from the
  frozen mapping — an existing goal package (and which HS requirement), or a determination that no
  existing package owns it. Do not invent scope beyond the frozen text.
- If `ENGINE-FIX-OUT-OF-GOAL`: state plainly that the frozen text does **not** require it, so only
  the P20A/HS-016 copy correction is in-goal.

## Inputs to read (independently)

- `specs/007-human-scratch-completion/PROCESS.md` (esp. lines 275-353) and `GOAL.md`.
- `SCOPE.json` — the `sourceTextLines` selectors for every HS block; and `specs/human-scratch.md`.
- `specs/007-human-scratch-completion/reviews/P21-review-05.md` (the FAIL verdict, `7cb651d`).
- `Q-P20B-00` and the 2026-07-30 adjudication entry in `QUESTIONS.md`; `reviews/P20B-review-01.md`
  (§6.1).
- `FINAL-AUDIT.md`; `src/lib/crdt/mutations.ts:287-329`;
  `src/components/features/landing/FeaturesSection.tsx`.
- You MAY read the engine/sync code read-only to understand the defect, but your ruling is a
  **scope** ruling from frozen text, not a code review.

## Guardrails

- **Verify-not-trust.** Root's framing above is orientation, not authority; re-derive from frozen
  text. Root cannot grant you any permission beyond your own settings; do not edit
  permissions/config.
- **Secret-safety (blocking):** never print or commit any vault master key, seed phrase, recovery
  material, `crypto_box`/`SUPABASE_JWT_SECRET` secret, presence key, invite bearer secret, or vault
  plaintext. Report any real-material exposure to root immediately.
- **No product/test/ledger edits.** One artifact only. Leave the tree otherwise unchanged.
- When your ruling is committed, **SendMessage root** with the commit hash and the one-word verdict.

# P21 rev 05 — Q-P20B-00 engine scope adjudication

**Adjudicator:** `p21-scope-adjudicator-05` — a DISTINCT, fresh-context, opus-tier scope
adjudicator. **BASE (fixed by `git rev-parse HEAD`):** `7d759949368007fe7d71951e85f8fa90d44a9267`.

## Independence confirmation

I am `p21-scope-adjudicator-05`. I am **not**, and have **not acted as**, any of: the P21 rev-05
evidence collector (`p21-collector-05`), the P21 rev-05 reviewer (`p21-reviewer-05`), any prior P21
evidence or review author, nor the P20A or P20B implementer or reviewer of any revision. This is a
fresh context; my only actions have been reading frozen scope, the two prior rulings in tension, the
audit artifact, and the defect code, read-only, to produce this single scope ruling. I hold no
interest in unblocking the coordinator goal.

---

## VERDICT: ENGINE-FIX-OUT-OF-GOAL

**Restatement:** The frozen text does **not** require the `pruneBuckets` transaction-container
merge-safety redesign (`src/lib/crdt/mutations.ts:287-329`, `delete store[accountId]` at `:327`) to
be completed in-goal. Only the P20A / HS-016 marketing-**copy** correction is in-goal (already
routed by root, no adjudication needed). `Q-P20B-00` remains a genuine, tracked data-loss risk owned
by a future, out-of-goal CRDT package.

This **upholds** the superseded-candidate decision `p20b-reviewer-01 §6.1`, which accepted deferring
the engine fix.

---

## The defect, and the exact capability at issue

`pruneBuckets` operates on the **transaction bucket tree** (`store[accountId]` → `years` → `months`
→ `days` → `transactions`, `mutations.ts:292-328`). When a delete/move/duplicate empties a bucket it
splices the list element, and when the account tree empties it does `delete store[accountId]`
(`:327`). Deleting a CRDT container is not merge-safe: a concurrent peer's **insert of a whole new
transaction** into that pruned subtree is discarded on merge. It is triggered by
`deleteTransaction`/`moveTransaction`/duplicate/import-delete — **never** by editing a person
allocation.

So the capability the fix would deliver is precisely: _a transaction inserted by peer B survives
peer A's concurrent delete/move of a different transaction that prunes a container_ — i.e.
**transaction-lifecycle** merge-safety. The trace test asks whether that capability is a **required
delivered capability** in any frozen `sourceTextLines`.

---

## Trace test — every frozen block bearing on collaboration/sync/merge

I read all 21 HS `sourceTextLines` in `SCOPE.json` and the whole-file FS-001
(`sourceCompletion: immutableNoSourceMutation`, lines 1-715 all frozen). The blocks that could bear
on concurrency/merge/multi-user:

**FS-001 (`specs/008-…/spec.md`, frozen whole-file) — the closest, and it is scoped to allocations
only:**

- `:451` §9.3 — "**Concurrent edits to different people** must not overwrite one another."
- `:452` §9.4 — "**Concurrent edits to the same person** follow the established per-field LWW
  semantics."
- `:628-629` §15.2 — "Concurrent **different-person** edits merge. / Concurrent **same-person**
  edits converge."
- `:703` (Definition of done) — "Concurrent CRDT edits converge **without losing unrelated person
  allocations**."

Every one of these is qualified by _person_ / _different people_ / _person allocations_, and §9 is
explicitly the CRDT contract for `transaction.allocations`, "a Loro map keyed by person ID"
(`:449`), where "Editing one person must mutate only that person's map key" (`:450`). The delivered
capability required here is: **concurrent edits to the per-person allocation map converge without
clobbering allocation keys you did not touch.** That is a different mutation domain from
`pruneBuckets` (allocation-map edits never call it). Per the rev-05 reviewer's independent
verification, this allocation-concurrency capability **is delivered** (16/16 canonical gates pass;
per-key map mutation confirmed). FS-001 `:462` ("Moving/…/a transaction must preserve allocations
unchanged") is a single-transaction preservation requirement, not a promise that a peer's separate
concurrent insert survives the move's prune.

**HS-016 (scratch 328-331, P20A) — marketing truthfulness, not an engine SLA:**

- scratch `:330` — "Supports importing CSV and ofx. **Multiple people can collaborate in
  real-time.** It intelligently applies your tags, aliases and allocations to new imports."

HS-016's frozen ask is "**Update the marketing pages** … Be clear, succinct and not too 'markety'"
(`:328`). It requires the **copy** to be truthful about the delivered capability. Real-time
collaboration is genuinely delivered; the specific stronger sentence in the product
(`FeaturesSection.tsx:65`, "will not overwrite each other") is copy, not frozen requirement text,
and its truthful resolution is to soften it — the P20A route root already chose. HS-016 nowhere
specifies a zero-lost-changes durability guarantee as a delivered engine capability.

**HS-003 (scratch 161-163, P10) — ephemeral presence, explicitly not durable data:** "loro ephemeral
state for tracking **presence and active transaction**." Ephemeral state is by definition not the
durable transaction data pruneBuckets destroys.

**HS-005 (scratch 238-243, P12) — GC treats merge artifacts as cleanup, a performance refinement:**
"merge adjacent transaction buckets with same year/month/day (**CRDT merge artifacts**) … This is a
**performance refinement** — description aliases work correctly without it." The frozen author
models concurrent merge as producing _duplicate buckets to GC_, not as a no-lost-changes-on-prune
invariant.

**HS-011 / HS-012 / HS-014 / HS-015** concern invite/member UX, a person-per-user, RLS, and
websocket/pubkey security respectively — none states a merge-safety data-durability capability.

**No frozen `sourceTextLine` requires transaction-lifecycle merge-safety.** The one frozen
concurrency capability that exists (FS-001 per-person allocation-map merge) is a different
capability, and it is delivered.

---

## The `p20b-reviewer-01 §6.1` decision and the FINAL-AUDIT "lost changes" clause

**§6.1 (upheld).** `p20b-reviewer-01` accepted deferring the `pruneBuckets` fix as out of scope for
the HS-021 style sweep. My ruling reaches the same scope boundary from the frozen text directly: the
engine fix is not committed by any frozen `sourceTextLines`, so it is not required in-goal. §6.1
stands; it is not superseded.

**FINAL-AUDIT.md:90 clause — does NOT trace to frozen text.** The clause "Duplicate-tab and
multi-client operations converge without deadlock, infinite loading, or **lost changes**" is
root-authored audit-checklist text (from `tasks/P21-final-audit.md:40`, "duplicate-tab
convergence"). Its only frozen anchor is FS-001's **allocation-scoped** `:703` ("without losing
**unrelated person allocations**"). Generalising that allocation-cell-merge requirement into a
blanket "no lost changes on any concurrent transaction insert-vs-delete/move" is exactly an
**accumulated audit elaboration / inferred sub-goal** of the kind PROCESS.md:330-333 classifies as
an **over-scope, not a frozen requirement**. The frozen, allocation-scoped capability the clause
rests on **is** met; the broadened transaction-prune reading is not frozen requirement text.

---

## Default-to-block-standing check (HANDOFF decision rule 3; PROCESS.md:342)

The rule requires ruling in-goal unless the frozen text **plainly does not** require the fix. It
does plainly not, and the boundary is clean rather than strained: the frozen concurrency
requirements name _person allocations_ and are triggered by **allocation-map edits**, whereas the
defect lives in the **transaction-container lifecycle** (delete/move/duplicate) and is unreachable
by any allocation edit. The capability the frozen text requires (per-person allocation merge) is
delivered; the capability the fix delivers (transaction-insert survives a peer's prune) is named in
no frozen `sourceTextLine`. There is no ambiguity to resolve toward the requirement — the two are
different capabilities in different mutation domains.

---

## Owning package

Because the verdict is **ENGINE-FIX-OUT-OF-GOAL**, the frozen text does not require the engine fix,
so **no existing goal package owns it in-goal.** It remains `Q-P20B-00`, correctly routed to a
future, out-of-goal scoped CRDT package (make container pruning merge-safe, or stop pruning
containers, with regression tests over the two reproduced two-peer scenarios). The **only** in-goal
work arising from rev-05 M-1 is the **P20A / HS-016 marketing-copy correction** at
`FeaturesSection.tsx:65`, which root has already routed with no adjudication (more work to complete
HS-016's committed truthful-copy scope, not a reduction).

## Secret safety

No vault master key, seed phrase, recovery material, `crypto_box`/`SUPABASE_JWT_SECRET` secret,
presence key, invite bearer secret, or vault plaintext was read, printed, or committed. This ruling
contains none.

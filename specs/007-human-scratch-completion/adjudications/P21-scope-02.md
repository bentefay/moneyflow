# P21 scope adjudication 02 — the lost-write class: harness component vs product durability component

**Adjudicator:** `p21-scope-adjudicator-07` — a distinct, fresh-context, opus-tier scope
adjudicator. **Authority:** `PROCESS.md:335-347`. **BASE (fixed by `git rev-parse HEAD` at ruling
time):** `5bf545ac3833e292b85a25a35940bffc65f10085`.

## Independence confirmation

I am not, and have not acted as, the implementer or reviewer of any package in this goal, nor the
Q-P20B-26 diagnostician, nor any P21 collector or reviewer, nor `p21-scope-adjudicator-05`. This is
a fresh context. Every action I took was read-only: frozen scope, the binding task contracts, D-019
and the ruling behind it, the diagnostic report, its raw logs, and the product and test source. I
wrote exactly this one file and committed nothing. I hold no interest in unblocking the coordinator.

---

# VERDICT

- **Component 1 — E2E harness navigation/durability fidelity: IN-GOAL. Owner: P20B (HS-021).**
- **Component 2 — product durability-at-acknowledgement (crash-safety for the few-millisecond window
  after each write): OUT-OF-GOAL.** No frozen `sourceTextLine` commits it. Recorded as a tracked
  risk, as `Q-P20B-00` was.
- **D-019 is FOLLOWED, not distinguished.** The distinction root offered — that this defect is
  reachable by an allocation edit whereas `pruneBuckets` is not — is real but does not carry the
  weight, for the reason given in §5.

---

## 1. Provenance — the measurements describe the tree as it stands now

MEASURED. The diagnostic ran in `/tmp/mf-q26` at `10a290d`, reporting
`find src tests/e2e/helpers -type f | sort | xargs md5sum | awk '{print $1}' | md5sum` =
`e7662f03b51f3415fc5ec4b2e1eec062`. I ran the identical command in `/home/ben-agents/Code/moneyflow`
at `HEAD=5bf545a` and got the same digest. The code under test has not drifted; nothing below is a
claim about a superseded tree.

MEASURED, re-derived by me from `/tmp/q26-logs/` rather than accepted:

| Claim                                    | My re-derivation                                   | Result                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Arms A/B/C/D/E loss counts               | `[CDE]/VERDICT` lines over `campaign{2,3,4,6}`     | A 0/70, B 0/70, C 21/70, D 17/70, E 12/55 — exactly as reported                                                                            |
| 195 runs / 50 losses / 0 counterexamples | op-row discriminator over every C/D/E verdict line | 195 runs, 50 losses, 0 counterexamples (the 12 lines my first parse flagged use the key `opsBeforeMe`; read correctly they are consistent) |
| J1 0/70, J2 48/70                        | `J1//J2/VERDICT` over `campaign{12,13}-armJ`       | J1 0/70; J2 21+27 = **48/70**                                                                                                              |

MEASURED, verified by me in source:

- `tests/e2e/helpers/nav.ts:9-73` — every navigation helper is `page.goto`, a full document
  teardown. 137 call sites across `tests/e2e/*.spec.ts`.
- The sidebar is real `next/link` (`src/app/(app)/layout.tsx:63-72`, `:386-389`), so a user's
  navigation is the client-side transition arm J1 measured at 0/70.
- The FS-001 mandatory journey as implemented does `setAllocation(row,"Me","50")` →
  `setAllocation(row,"Bob","50")` → `goToPeople(page)`
  (`tests/e2e/people-settlement.spec.ts:305-312`; also `:516-519`). That is arm D's shape exactly: a
  full teardown fired immediately after the write.
- `SyncManager.awaitLocalPersistence()` at `src/lib/sync/manager.ts:367-377`; the write path
  `subscribeLocalUpdates` → encrypt → `appendOp` at `:292-345`.

## 2. Two corrections to the framing I was given

Neither changes the verdict; both would mislead whoever implements from this record.

**2a. The premise "the sync indicator reads `Saved` while the write is not durable" is NOT
established.** MEASURED, and the diagnostic says so itself (§4): in 350/350 samples taken ~2 ms
after the barrier returned, the indicator read `Saving...` _and_ the op was already durable — "I
never caught the indicator over a non-durable write... Not observed, and I would not claim it." The
single `Saved` observation in `reviews/P20B-review-08.md` §6 is uncontrolled, and that reviewer
explicitly wrote "one observation licenses no conclusion about a class." INFERRED, from code I read:
the indicator could not vouch for durability either way — `hasUnsavedChanges` is
`usePollUnsavedChanges(activeVault?.id ?? null, 2000)` (`src/app/(app)/layout.tsx:161`), a 2 s poll.
What _is_ established is narrower and sufficient for this ruling: the **DOM barrier** (the cell's
`Explicit:` text) commits before durability.

**2b. "`awaitLocalPersistence()` is surfaced to neither the UI nor tests" is false as written.**
MEASURED: it is called from `src/components/providers/vault-provider.tsx:49` and `:232`, and
directly by `tests/unit/sync/manager.test.ts` and two integration tests. The true statement is that
it is not surfaced to the **E2E harness** and is not a barrier on the interactive edit path.

## 3. The frozen text I ruled from

`SCOPE.json` is authoritative for `sourceTextLines`. FS-001 uses a whole-file selector
(`SRC-TRANSACTION-PERCENTAGE-ALLOCATIONS-SETTLEMENT`, `wholeFile`, `1-715`,
`immutableNoSourceMutation`), so its frozen text is the file itself. MEASURED: that file still
hashes to `0d0e2a141249ecace04b02b4cecbadb25ac5747faa24d59ab297aca509dcfe8c`, 715 lines, 25,441
bytes.

Frozen lines that bear on this question, quoted literally:

**`SCOPE.json#FS-001`** (`specs/008-transaction-percentage-allocations-settlement/spec.md`):

- `:419` §8.3 — "Save on Enter or blur."
- `:463` §9.9 — "Allocation mutations must remain encrypted through the existing vault sync path."
- `:464` §9.10 — "Changes must synchronize between collaborators within existing near-real-time
  expectations."
- `:630` §15.2 — "Persistence through snapshot/export/import/reload."
- `:645-646, :649` §15.3 mandatory journey — "5. Enter Me 50%, Bob 50% through real transaction-grid
  cells. / 6. Verify Bob owes Me $50 on the People page." … "9. Reload and verify allocations and
  settlement persist."
- `:668` §15.3 — "Run changed E2E journeys repeatedly with retries disabled."
- `:693` §17 — "Add-row allocations persist."
- `:703` §17 — "Concurrent CRDT edits converge without losing unrelated person allocations."
- `:705` §17 — "Relevant E2E journeys pass repeated runs with retries disabled."
- `:706` §17 — "Manual Playwright CLI testing verifies persistence, keyboard behavior, responsive
  layout, console, and network."

**`SCOPE.json#HS-021`** (`specs/human-scratch.md:159`):

- "Do a sweep of the full code base for code quality based on our style guide"

**Negative result, MEASURED.** `grep -nEi "unsaved|durab|data ?loss|lose|lost"` across all five
frozen sources (`human-scratch.md`, `008/spec.md`, `009/spec.md`, `010/spec.md`, `011/spec.md`)
returns no line about durability, crash safety, unsaved work or data loss. The only hits are about
keyboard focus and autocomplete. **No frozen source anywhere in this goal uses the vocabulary of
durability.**

## 4. Component 1 — IN-GOAL, owner P20B

The blocked work: the E2E navigation helpers tear the document down where the requirement's user
performs a client-side transition, and no helper offers a way to await durability, so the frozen
allocation journeys fail intermittently.

**It traces to frozen text plainly, on two independent anchors.**

FS-001 `:705` — "Relevant E2E journeys pass repeated runs with retries disabled" — is a **Definition
of done** clause, and `:668` repeats it as a testing obligation. That clause is currently unmet:
MEASURED, the class produced non-zero failures in every campaign run against this tree
(`reviews/P20B-review-08.md` §2.5, §3.2, §6). I make no cross-campaign rate comparison; the
load-bearing fact is only that the count is not zero. The journey the clause governs is the frozen
mandatory journey at `:645-649`, and MEASURED, its implementation places a full teardown between
frozen step 5 and frozen step 6.

HS-021 `:159` independently reaches it. The binding task contract
`tasks/HS-021-code-quality-sweep.md` names the E2E skill as part of "our style guide" ("Repository
authority spans `.claude/CLAUDE.md`, general/TypeScript rules and component, CRDT, crypto, sync,
tRPC, import and E2E skills") and directs the sweep to "Check … E2E isolation/no-waits/flakiness"
and to fix "test-quality violations". `.claude/skills/e2e/SKILL.md` states "Fix flaky tests
immediately, regardless of when introduced."

**Owner: P20B.** `PROCESS.md:128-130` routes "Allocation/settlement ownership … to P16A–E, or P17A–D
when the automation path owns the defect; cross-cutting style ownership routes to P20B." The defect
being fixed lives in `tests/e2e/helpers/nav.ts`, a shared helper with 137 call sites — cross-cutting
test quality, not allocation behaviour. HS-021's contract claims exactly this territory. Root's
existing routing (`6061ef7`, `c515173`) is therefore correct on the merits, not merely by default —
which answers the concern `Q-P20B-26` recorded about leaving it on P20B to avoid invalidating a
prior PASS.

**Two conditions on the fix, both of which follow from the frozen text rather than from my
preference:**

1. **It must not be a suppression.** Deleting, weakening or timing-out the persistence assertions
   would breach HS-021's contract ("reject broad suppressions/casts/test skips") and would not
   deliver `:705`. Frozen step 9's `page.reload()` (`:649`) must survive: reload-persistence
   coverage is itself frozen, at `:630` and `:706` as well. The legitimate shapes are (a) navigate
   the way the requirement's user navigates — MEASURED at 0/70 for the real `next/link` sidebar
   click — and/or (b) give the harness a durability barrier before a deliberate teardown.
2. **If the chosen fix changes allocation product behaviour rather than the harness or a test seam,
   ownership flips to P16A–E** per `PROCESS.md:128-129`. Exposing the existing
   `awaitLocalPersistence()` to the harness through a test seam is within P20B's remit and does not
   trigger the flip; changing when the interactive edit path becomes durable would be Component 2
   and is out-of-goal (§5).

## 5. Component 2 — OUT-OF-GOAL

**The capability the fix would deliver**, stated precisely so it can be tested against the frozen
text: _an allocation write is durable at the moment the UI acknowledges the edit, so that an unaimed
full-document teardown — crash, OS kill, force-quit — landing in the few-millisecond window after
the write cannot discard it._

That capability is named in no frozen `sourceTextLine`. Taking the candidates in turn:

- **`:649` "Reload and verify allocations and settlement persist."** This is the strongest candidate
  and I treated it as such. Read alone, the word "persist" is unqualified, and arm C — MEASURED
  21/70 — is literally "enter an allocation, reload, verify it persists." But the sentence is **step
  9 of an ordered twelve-step journey**, and frozen steps 6, 7 and 8 stand between the allocation
  entry at step 5 and the reload. The frozen text therefore does constrain the timing, by its own
  ordering, and it never asks for a reload adjacent to a write. Arm C deletes steps 6-8; it is a
  synthetic probe, not the frozen journey. MEASURED: any delay of a few milliseconds closes the
  window entirely (arms A/B 0/140, arm G2 0/52), so the journey as frozen is delivered.
- **`:645-646` steps 5→6.** These _do_ place a navigation immediately after the write. But the
  frozen text does not specify the navigation primitive, and MEASURED, the primitive a real user has
  — the `next/link` sidebar — loses nothing in 70 runs (J1), against 48/70 for `location.assign`
  (J2), from a byte-identical harness differing in one line. The frozen ordering is satisfiable in
  the shipped product. This is Component 1's anchor, not Component 2's.
- **`:703` "Concurrent CRDT edits converge without losing unrelated person allocations."** Does not
  reach it. MEASURED: in every loss the op row is _never created_ (0/50), so there is no operation
  to converge; this is not a merge outcome. D-019 already held this line to be allocation-**merge**
  scoped.
- **`:419` "Save on Enter or blur."** §8.3 is the _edit-state_ contract, and its sibling clauses fix
  its sense: "Cancel on Escape", "Preserve the original value when cancelled", "Zero removes the
  allocation map entry", "Keep invalid typed text local until corrected". "Save" there means the
  gesture commits the value rather than discarding it — not that storage is fenced at that instant.
  The CRDT and storage contract is §9, and §9 says nothing about durability timing.
- **`:463` "Allocation mutations must remain encrypted through the existing vault sync path."** If
  anything this cuts the other way: it ratifies the existing asynchronous path rather than requiring
  it be made synchronous. `:464` is about propagation to collaborators, not local durability.
- **`:630`, `:693`, `:706`.** `:630` is a CRDT integration-test obligation, and integration tests do
  not tear a document down mid-flight. `:693` is §8.4's requirement that the add row stop discarding
  entered allocations. `:706` is a manual-verification obligation, and a human's reload is seconds
  after the edit.
- **HS-021 `:159` via `.claude/CLAUDE.md`.** I raised this myself because it is the strongest anchor
  root did not offer: CLAUDE.md's Architecture Principles say "Sync: IndexedDB writes immediate
  (crash safety), server pushes throttled (~2s)", and HS-021 commits a sweep against "our style
  guide". It does not carry. That sentence is a descriptive orientation contrasting
  _local-immediate_ with _server-throttled_, and MEASURED, the contrast holds: the op row lands 4-66
  ms after the DOM commit against a ~2 s server throttle. There is no style-guide statement being
  violated, so there is no HS-021 violation to fix. Independently, D-019 already declined to let the
  HS-021 sweep own a discovered engine defect — see §6.

**Real-user exposure, for the record and tagged honestly.** INFERRED (the diagnostician's own tag,
which I did not re-derive and do not upgrade): a human cannot aim a reload at a window this narrow,
so the realistic exposure is an unaimed teardown inside the few-millisecond window after an
individual write — small per write, not zero. INFERRED from `manager.ts:439-448`: a user-initiated
window close should hit `beforeunload`, where `hasPendingWorkSync()` is true while
`pendingLocalUpdates` is non-empty, so that path raises the unsaved-changes dialog rather than
silently dropping the write. Not measured. Arm H (`page.close()`, 17/70) does not run `beforeunload`
and so models a crash, not a user closing the window.

**Severity is not the test, and I have not let it be.** This is a genuine data-loss defect and I say
so plainly in §7. It is out-of-goal because the frozen text does not commit the capability, which is
the same reason `Q-P20B-00` is out-of-goal.

## 6. D-019 — followed

`D-019` (ruling at `reviews/P21-scope-adjudication-05.md`, commit `f290246`) held that the
`pruneBuckets` merge-safety fix is out-of-goal because no frozen `sourceTextLine` commits
transaction-lifecycle merge-safety, and that generalising `FINAL-AUDIT.md:90`'s root-authored
"converge without … lost changes" clause beyond FS-001's allocation-scoped `:703` would be an
over-scope under `PROCESS.md:330-333`.

**The offered distinction is real but does not carry.** `pruneBuckets` is unreachable by an
allocation edit; this defect is reachable by one and has destroyed an allocation
(`reviews/P20B-review-08.md` §6). Reachability decides whether the defect _touches_ the frozen
domain. It does not decide D-019's actual test, which is whether the **capability the fix delivers**
is a required delivered capability in frozen text. FS-001's allocation-persistence capability is
"allocations persist across a reload", and MEASURED, that is delivered for every reload not fired
within milliseconds of the write. The capability the Component-2 fix adds — durability at
acknowledgement — is named nowhere, in any frozen source, in any vocabulary (§3, negative result).

**And the same rule, applied consistently, forecloses the alternative route.** D-019 upheld
`p20b-reviewer-01 §6.1`, which deferred the `pruneBuckets` engine fix as out of scope **for the
HS-021 style sweep** — a defect discovered by that very sweep, which is why it bears a `Q-P20B-*`
ID. So the proposition "HS-021's code-quality sweep converts a discovered engine defect into
committed scope" has already been adjudicated and rejected. Ruling Component 2 in-goal on the HS-021
route would overturn D-019 by implication while purporting to distinguish it.

**`FINAL-AUDIT.md:90` is likewise unavailable here**, for D-019's reason: it is root-authored audit
text, and `PROCESS.md:330-333` makes a block that traces only to accumulated audit elaboration an
over-scope rather than an external gate. The same applies to the P21 "E2E stability clause" insofar
as it is invoked beyond frozen `:668`/`:705` — those two frozen lines are what make **Component 1**
in-goal, and they are satisfied by a faithful harness.

## 7. Alternatives I rejected

- **(a) Rule Component 2 IN-GOAL to P16A–E on `:649`.** Rejected: the frozen journey's own ordering
  puts steps 6-8 between the write and the reload, and MEASURED, any delay closes the window. Arm C
  is not the frozen sentence's journey.
- **(b) Rule Component 2 IN-GOAL to P20B under HS-021 as a code-quality/correctness defect.**
  Rejected: it proves too much — it would have made `pruneBuckets` in-goal — and D-019 has already
  rejected exactly that route.
- **(c) Rule Component 1 OUT-OF-GOAL as well, on the ground that it is "only a test."** Rejected:
  `:705` is a frozen Definition-of-done clause and is currently unmet. This is the default-to-block-
  standing case, and the block stands.
- **(d) Rule Component 1 to P16A–E because the failing journey is FS-001's.** Rejected on the
  merits: the defect is in a shared helper with 137 call sites, and `PROCESS.md:130` routes
  cross-cutting ownership to P20B. Condition 2 in §4 preserves the flip if the fix turns out to
  change allocation product behaviour.
- **(e) Declare the frozen text unsettled and ask for the narrowest reversible resolution.**
  Rejected: it is settled. Component 1 has two explicit frozen anchors; Component 2 has none, and
  the absence is not marginal — no frozen source in this goal contains any durability vocabulary at
  all.

## 8. Residual risk and how it must be recorded

The Component-2 gap is a genuine, unfixed, tracked data-loss risk, of the same standing as
`Q-P20B-00` under D-019. It must be recorded, not closed:

1. `RISKS.md` — a new entry beside `Q-P20B-00`: a local write is not durable for a few milliseconds
   after the UI acknowledges it, so an unaimed full-document teardown in that window discards it
   silently; routed to a future, out-of-goal scoped sync package (fence the interactive edit path on
   `awaitLocalPersistence()`, or make the acknowledgement wait for it, with regression coverage over
   the measured arms). **Not** spun into a new goal package.
2. `QUESTIONS.md#Q-P20B-26` — closed as _routed_, recording that the discriminating experiment it
   named was run and answered (entry **absent** → lost write), that the harness component went to
   P20B and the product component out-of-goal by this ruling.
3. The risk record must carry the reproduction, because Component 1's fix removes the suite's
   ability to surface this class: `evidence/P21/diagnostic-Q-P20B-26.md`, the probe artifact
   `/tmp/q26-logs/zz-q26-idb.spec.ts.artifact` and its config (both under `/tmp`, so they should be
   copied into the goal's evidence tree if they are to survive), and the measured arms.
4. Named in the P21 status report for after-the-fact human audit, per `PROCESS.md:344-345`.

**What this means for the goal's completion condition.** `FINAL-AUDIT.md:90` and the P21 E2E
stability clause are satisfied when the frozen journeys pass repeated retry-free runs after
Component 1 lands; P21 proceeds on Component 1 alone. Root must not record any claim of crash-safe
durability, and no marketing claim may assert one. MEASURED, and I checked because
`FINAL-AUDIT.md:65` requires marketing to match shipped behaviour: the only adjacent copy is
`src/components/features/landing/FeaturesSection.tsx:78-81` — "Saves locally first … Changes are
written to your browser first and pushed when the network allows" — which is true of the shipped
behaviour and makes no immediacy or crash-safety claim. **No HS-016 consequence follows from this
ruling.**

## 9. Reversal path

If a future frozen requirement introduces durability-at-acknowledgement, crash safety, or a truthful
save barrier, reopen with an independently reviewed ADR owning the interactive-edit-path fence,
built on the existing `awaitLocalPersistence()` (`src/lib/sync/manager.ts:367-377`) rather than a
parallel mechanism. This routing neither fixes nor masks the risk; it records it for future work. If
the Component-1 fix is later found to have changed allocation product behaviour rather than the
harness, `PROCESS.md:128-129` flips ownership to P16A–E and this ruling does not stand in the way.

## 10. Secret safety

No vault master key, seed phrase, recovery material, `crypto_box` or `SUPABASE_JWT_SECRET` secret,
presence key, invite bearer secret, or vault plaintext was read, printed or committed. The op-log
fields quoted in the diagnostic are opaque ciphertext lengths, ids and version vectors. This ruling
contains none. I ran no database command, touched no port, and committed nothing.

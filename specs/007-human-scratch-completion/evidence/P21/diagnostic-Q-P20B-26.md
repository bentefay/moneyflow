# Q-P20B-26 — discriminating experiment

**ANSWER: the entry is ABSENT from persisted IndexedDB state. This is a genuine lost write, not a
rehydration/derivation gap.** MEASURED, 50 reproductions in 195 runs, zero counterexamples.

The write never reaches storage: no op row is ever created for it, before the navigation, after the
navigation, after the reload, or 8 s later. It is not on the server either.

---

## 1. The discriminator and its result

| Outcome of a barrier-confirmed write, after the reload | Runs | Op row created for that write? |
| ------------------------------------------------------ | ---- | ------------------------------ |
| **missing** from the UI                                 | 50   | **never** — 0 / 50             |
| present in the UI                                       | 145  | **always** — 145 / 145         |

MEASURED. Arms C, D and E across four campaigns; correlation checked mechanically over every verdict
line in `/tmp/q26-logs/campaign{2,3,4,6}*.log`:

```
runs=195 losses=50 consistent=195 counterexamples=0
```

There is no run in which the entry was present in IndexedDB and absent from the UI. The
rehydration/derivation branch of the question is not merely unsupported — it never occurred.

## 2. The raw dumps

One complete losing run, serial worker, no interleaving — `/tmp/q26-logs/campaign7-armD-serial.log`
lines 6–50. Arm D is the captured journey exactly: `setAllocation(Me,50)` → `setAllocation(Bob,50)`
→ `goToTransactions()` → `reload()`, with nothing inserted between Bob's barrier and the navigation.

```
D/0-before-bob ops=6 snapshots=1 stores=ops,snapshots,sync_meta
D/0-before-bob   op[0] id=cf121da5 vv=Aqnbo+GK5+acdzCzv53HlZ7+kc8BBg== pushed=1 len=316 at=1785725638705
D/0-before-bob   op[1] id=fe09d425 vv=A5yFvKb2hs/s+AEwqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=720 at=1785725639221
D/0-before-bob   op[2] id=54938aab vv=A5yFvKb2hs/s+AFAqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=524 at=1785725639304
D/0-before-bob   op[3] id=35aca356 vv=A5yFvKb2hs/s+AFCqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=172 at=1785725639379
D/0-before-bob   op[4] id=2f33565e vv=A5yFvKb2hs/s+AFEqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=188 at=1785725639735
D/0-before-bob   op[5] id=ddfe21be vv=A5yFvKb2hs/s+AFGqduj4Yrn5px3MLO/nceVnv6RzwEG pushed=0 len=184 at=1785725639965
D/0-before-bob   snapshot {"data_len":2076,"updated_at":1785725638423,"vault_id":"547747d1-...","version_vector":"{}"}

  << setAllocation(row, "Bob", "50") — barrier `Explicit: 50%.` confirmed in the live DOM >>
  << goToTransactions() >>

D/1-after-goto ops=6      (op[0..5] byte-identical, all now pushed=1; NO op[6])
D/2-after-reload ops=6    (op[0..5] byte-identical; NO op[6])
D/post-reload DOM Me="50%Explicit: 50%. Effective: 100%. Owner remainder: 50%."
D/post-reload DOM Bob="—Explicit: not stored. Effective: 0%. Owner remainder: 50%."
D/settled-8s  DOM Bob="—Explicit: not stored. Effective: 0%. Owner remainder: 50%."
D/3-settled-8s ops=6      (still no op[6], 8 s after the reload)
D/SETTLE bobStillLost=true opsSettled=6
D/VERDICT meLost=false bobLost=true opsBeforeBob=6 opsAfterGoto=6 opsAfterReload=6
```

The two DOM lines reproduce the originally captured failure verbatim
(`/tmp/rev08-artifacts/zz-rev08-fb-control-F-B-PR-52aba-ocation-is-genuinely-stored-chromium/error-context.md`
lines 168–174), including Me's `Effective: 100%. Owner remainder: 50%.`

A surviving run from the same file, for contrast — one extra op row and both cells present:

```
D/1-after-goto ops=7
D/1-after-goto   op[6] id=f12ef9a4 vv=A57unKWnnNjAR0jfsf3Y1OerloQBMIXsitmf+8GiOwY= pushed=1 len=212 at=1785725652548
D/post-reload DOM Me="50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
D/post-reload DOM Bob="50%Explicit: 50%. Effective: 50%. Owner remainder: 0%."
D/VERDICT meLost=false bobLost=false opsBeforeBob=6 opsAfterGoto=7 opsAfterReload=7
```

MEASURED. `encrypted_data` is opaque to the probe, but `version_vector` is stored plaintext
(`/home/ben-agents/Code/moneyflow/src/lib/sync/persistence.ts:24`) and is captured from the doc
frontier at enqueue time (`/home/ben-agents/Code/moneyflow/src/lib/sync/manager.ts:304`), so an
absent row with an unadvanced frontier is direct evidence that no doc change reached storage. The op
ids are byte-identical across all four checkpoints, so nothing was written and later removed, and no
snapshot compaction occurred (`snapshots` stayed at 1 with an unchanged `updated_at`).

## 3. Per-arm results

All arms run against product code byte-identical to repo `HEAD` = `10a290d` (§7).

| Arm       | Shape                                                                          | Losses      |
| --------- | ------------------------------------------------------------------------------ | ----------- |
| A         | two writes, **IndexedDB poll inserted** between barrier and nav                | **0 / 70**  |
| B         | three writes, **IndexedDB poll inserted** between each barrier and nav         | **0 / 70**  |
| C         | `setAllocation(Bob)` → `reload()` immediately                                  | **21 / 70** |
| D         | the captured journey: `setAllocation(Bob)` → `goToTransactions()` → `reload()` | **17 / 70** |
| E         | arm D with the write order swapped (`Bob` first, then `Me`)                    | **12 / 55** |
| F         | `createTransaction()` → `reload()` immediately (corrected oracle)              | **0 / 28**  |
| F-control | arm F with durability allowed before the reload                                | **0 / 28**  |

MEASURED. Per-campaign breakdown in `/tmp/q26-logs/campaign{2,3,4,6}*.log`; arm F and F-control in
`/tmp/q26-logs/campaign{5-armF,6-final-w4-r20}.log`. Every run used
`env -u CI pnpm exec playwright test --config=playwright.q26.config.ts --retries=0 --workers=4 --repeat-each=<N>`.

Arms A and B differ from C/D/E **only** by the IndexedDB poll inserted between the barrier and the
navigation. That poll is what makes the difference: 0 losses in 140 runs with it, 50 in 195 without.

## 4. The sub-questions the brief asked about

**Is the losing write always the second write into the map?** No — MEASURED. In arm E the write
order is reversed and the lost write is `Me` (12/12 losses `meLost=true bobLost=false`,
`/tmp/q26-logs/campaign{3,4,6}*.log`). The loss follows _adjacency to the document teardown_,
not position in the allocation map and not which person.

**Per-key or whole-map?** Per-key — MEASURED. In every arm D loss `meLost=false`; in every arm E
loss `bobLost=false`. Exactly the one write adjacent to the teardown is missing; the rest of the map
survives. INFERRED from `manager.ts:292-345`: each mirror commit is its own op, so "per key" here is
really "per op", and the two coincide because each cell edit is one commit.

**Is `Saved` reported before the data is durable?** Not observed, and I would not claim it.
MEASURED: in 350/350 samples taken ~2 ms after the barrier returned, the indicator read `Saving...`
_and_ the op was already durable — so I never caught the indicator over a non-durable write.
INFERRED from code: the indicator cannot function as a durability barrier regardless —
`hasUnsavedChanges` comes from `usePollUnsavedChanges(vaultId, 2000)`
(`src/app/(app)/layout.tsx:161`), a 2 s poll of IndexedDB, and `setSyncState("saving")` only runs
_after_ `appendOp` resolves (`manager.ts:346-348`). Both signals are downstream of, or staler than,
the write they would be vouching for.

**Undo/redo (F-2) vs a direct cell edit.** NOT MEASURED. I did not build an undo arm; INFERRED from
`manager.ts:292` that both paths go through the same `subscribeLocalUpdates` queue, but that is an
argument from reading, not a measurement, and should not be relied on.

**Does the class extend beyond allocations?** Not demonstrated. Arm F (create a transaction, reload
at once) lost nothing in 28 runs. So the `51 transactions` observation in `/tmp/p20b07-F2-repro/` is
**not** shown by this experiment to be the same class — treat it as a separate open question.

## 5. Mechanism

INFERRED — consistent with every measurement above, but the causal step is read from code, not
measured:

`setAllocation`'s barrier waits on the cell's `Explicit:` clause, which reflects the loro-mirror
commit and the React re-render. Persistence is downstream and asynchronous: `subscribeLocalUpdates`
enqueues the update (`manager.ts:292-296`), and a queued attempt then dynamically imports the crypto
module, encrypts, and only then calls `appendOp` (`manager.ts:312-345`). The server push runs after
that (`manager.ts:388-396`), so an update that never reaches IndexedDB is never pushed either —
which is why the value does not come back from the server after the reload.

`goToTransactions` is `page.goto("/transactions")` (`tests/e2e/helpers/nav.ts:9`) — a full document
teardown, the same as `reload()`. A teardown issued in the window between the barrier and `appendOp`
discards the queued work.

MEASURED, and the reason the loss is intermittent rather than constant: the gap between the DOM
commit and the barrier returning is bimodal, because `expect().toContainText` polls. Distribution of
`op.created_at − barrierSampleTime` over 200 arm A/B writes (`/tmp/q26-logs/campaign{4,6}*.log`,
range −4 to −66 ms): a near cluster of 53 writes at −4 to −8 ms and a far cluster of 147 writes at
−37 to −66 ms. When the barrier returns in the tight cluster an immediately following teardown beats
the write; when it returns in the late cluster the write is already durable.

## 6. What I got wrong on the way, and how it was caught

Arm F initially reported `descriptionLost=true amountLost=true` in **35/35** runs
(`/tmp/q26-logs/campaign{3,4}*.log`). That was an instrument defect, not a finding: description and
amount render inside `<input>` elements, and I was reading `row.textContent()`, which never contains
an input's value — the oracle would have reported those fields lost on a perfectly intact
transaction. Rewriting it to use `inputValue()` and adding the F-control arm (which proves the
oracle can read fields that are genuinely present) turned the result to 0/28. **The 35/35 figure in
those two logs should be disregarded.**

## 7. Reproduction

- Worktree: `/tmp/mf-q26`, detached at `10a290d`, `.env.local` copied in,
  `pnpm install --frozen-lockfile`. Dev server on **:3100** (not :3000, not :3001) via
  `/tmp/mf-q26/playwright.q26.config.ts`. Remove with `git worktree remove /tmp/mf-q26 --force`.
- Product code unmodified.
  `find src tests/e2e/helpers -type f | sort | xargs md5sum | awk '{print $1}' | md5sum` →
  `e7662f03b51f3415fc5ec4b2e1eec062` in **both** `/tmp/mf-q26` and
  `/home/ben-agents/Code/moneyflow`, both at `HEAD=10a290d`. `git status` in the worktree shows only
  `next-env.d.ts` (dev-server churn) plus the two untracked probe files. Nothing was committed.
- Probe: `/tmp/q26-logs/zz-q26-idb.spec.ts.artifact` (copy of
  `/tmp/mf-q26/tests/e2e/zz-q26-idb.spec.ts`), config:
  `/tmp/q26-logs/playwright.q26.config.ts.artifact`.
- Logs — every figure above is grep-able from these: `/tmp/q26-logs/smoke.log`,
  `campaign1-w4-r12.log`, `campaign2-w4-r15.log`, `campaign3-w4-r15.log`, `campaign4-w4-r20.log`,
  `campaign5-armF.log`, `campaign6-final-w4-r20.log`, `campaign7-armD-serial.log`.
- The probe reads IndexedDB through the raw IDB API in `page.evaluate` and closes its connection
  after each dump, so it cannot block the app's own `openDB`.

## 8. Open questions this did not settle

1. Does a **client-side** in-app navigation (no document teardown) also lose the write, or is the
   exposure confined to full teardowns — reload, tab close, crash? This decides whether a real user
   can hit it or only a test that navigates within milliseconds. One arm, same probe.
2. Is the `51 transactions` case in `/tmp/p20b07-F2-repro/` this class? Arm F says transaction
   creation does not reproduce it in 28 runs, so assume not until measured.
3. Does the undo/redo path share the queue? Read, not measured.

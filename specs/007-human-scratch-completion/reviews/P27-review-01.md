# P27 review 01 — UR-006 vault members are listed by name

**Reviewer:** `p27-reviewer-01`, fresh context, DISTINCT from `p27-implementer-01`. I authored none
of the code under review.

**Tree reviewed:** HEAD == `d4d8c407f1bef9bf6b4168b8b93ec01df8f2a6fc`, confirmed by
`git rev-parse HEAD`. The dispatch named `ae79e36` "or later root ledger commit"; `d4d8c40` is one
docs-only commit later and I verified the advance is inert for this review:

```
$ git diff --stat ae79e36a1874fa7640d6b932fa8b13de0be4bc04 HEAD -- src tests
(empty)
```

Commits under review `8c5cda6` (fix), `98858b4` and `ab80bbc` (evidence). All three confirmed
ancestors of HEAD by `git merge-base --is-ancestor`, not by `git show` alone, so none is a dangling
amended commit.

**Reviewer worktree:** `/tmp/mf-e2e-p27r1` at `d4d8c40` for the six checks and the E2E campaign, and
a throwaway `git archive` tree at `/tmp/mf-p27r1-base` for the unit-level BASE probes. I did not
touch the implementer's `/tmp/mf-e2e-p27`, nor any other agent's worktree under `/tmp/mf-*`, and I
never mutated the shared main checkout.

## VERDICT: **PASS**

The reported defect is fixed. I did not take the tests' word for it: I reverted ONLY the component
to BASE in my own trees and confirmed every new test goes red with the reported hash roster visible
in the failure output. All six checks pass on my own tree, and my own independent full-suite
`--retries=0` campaign is green at 170 with a stable source digest.

**The scope question routed to me is ruled in §5: the `PresenceAvatar`/`TransactionRow` hunks are
legitimate consolidation, not scope creep.** UR-003's behaviour is unchanged, and I verified that
exhaustively rather than by assertion.

No blocking findings. Two advisory notes are in §9; neither affects shipped behaviour.

**One honesty item is mine, not the package's:** I contaminated my own first E2E campaign by running
the unit suite concurrently, killed it, and restarted from run 1. Recorded in full in §7 because it
produced a red E2E run that a reader would otherwise see in my logs and misattribute to this tree.

---

## 1. The dispatch's claims, checked rather than trusted

The dispatch asked me to check its claims and report any that do not survive. **All survive.** The
dispatch also asked me to verify the frozen citation against `SCOPE.json` myself rather than accept
its quotation, which I did.

### The frozen source — VERIFIED against `SCOPE.json`

`specs/010-user-reported-refinements-2/spec.md` line 26 is
`## UR-006 — Vault members are listed by name` and line 38 is the final bullet requiring the
accessible name to follow the visible label's rule. The freeze, not just the line numbers:

```
$ sha256sum specs/010-user-reported-refinements-2/spec.md
a137e38848db04c656169c97e4ff5b862feec6ca29d6e6069c81c2c279dc95c5

$ wc -l -c specs/010-user-reported-refinements-2/spec.md
  86 4902
```

`SCOPE.json`'s `SRC-USER-REPORTED-REFINEMENTS-2` entry records exactly that digest, that line count
and that byte count. The source is unmodified and the citation is correct. The dispatch's caution
was warranted and its reading is accurate.

### `aria-label` at `:159` carries the name — VERIFIED

```
$ sed -n '159p' src/components/features/vault/AccessMembersSection.tsx
                                            aria-label={`Remove member ${memberLabel}`}
```

### `shortenPubkeyHash` deleted with no remaining callers — VERIFIED

```
$ grep -rn "shortenPubkeyHash" src tests
(no matches, exit 1)
```

### `resolveMemberDisplayName` was at `person.ts:99` at BASE — VERIFIED

```
$ git show 736c471:src/lib/crdt/person.ts | sed -n '99p'
export function resolveMemberDisplayName(
```

It is now at `:113`; the implementer's edit added lines above it, and its evidence says so.

### The implementer's two corrections to the dispatch — BOTH CONFIRMED

**Correction 1.** The dispatch said `AccessMembersSection` "takes NO props (`:40`)". At BASE `:40`
is in fact the opening of `AccessMembersSectionProps`, which carries an optional `className`. The
claim's substance — that it receives no `people` — is unaffected. The implementer was right to flag
it and right to say the substance survives.

**Correction 2.** P24 review-01 §4's advisory to import `UNNAMED_MEMBER_LABEL` into an E2E spec does
not work. I verified the mechanism independently rather than accepting the report: `person.ts:19`
imports `./defaults`, `defaults.ts:12` imports `@/types`, and `temporal-polyfill`'s `package.json`
publishes only an `import` condition:

```
  "exports": {
    ".": {
      "import": {
        "types": "./index.d.ts",
        "default": "./index.js"
      }
    },
```

The chain and the conclusion both hold. This is now `Q-P27-01`; see §8.

---

## 2. Requirement conformance — the frozen text, bullet by bullet

**"Each member row shows the member's display name, resolved the same way the presence avatar
resolves it."** MET, and by construction rather than by convention.
`AccessMembersSection.tsx:127-129` calls the shared `resolveMemberDisplayName(people, ...)` — the
same function `layout.tsx:151` and `transactions/page.tsx:207` call for the avatars. There is one
resolution path in the codebase:

```
$ grep -rn "resolveMemberDisplayName" src/
src/app/(app)/layout.tsx:151                displayName: resolveMemberDisplayName(people, userId),
src/app/(app)/transactions/page.tsx:207        (pubkeyHash: string) => resolveMemberDisplayName(allPeople, pubkeyHash),
src/components/features/vault/AccessMembersSection.tsx:128                                resolveMemberDisplayName(people, member.pubkeyHash)
src/lib/crdt/person.ts:113 (the definition)
```

**No second resolution path was added.** This is criterion 2 of the dispatch and it is satisfied.

**"A raw public key hash is never the visible label for a member."** MET. The `font-mono` span that
rendered the truncation is gone; the row renders `memberLabel`, which is
`memberDisplayLabel(MemberDisplayName)` and therefore either a person's own trimmed name or the
constant `"Unnamed member"`. Neither branch can carry hash characters — the `named` branch holds
`personOwnName`, the `unnamed` branch holds no payload at all.

**"Where no display name can be resolved, a clearly human-readable fallback is shown rather than a
bare hash."** MET; see §3.

**"Any tooltip or accessible name for the member follows the same rule as the visible label."** MET,
and this is the strongest part of the design. One binding at `:127` feeds both the visible span at
`:138` and the `aria-label` at `:159`. The two cannot diverge, because there is nothing to keep in
sync — the same technique P24 used for `PresenceAvatar`'s `title`/`aria-label`. The frozen text asks
for a rule to be followed; the implementation makes following it the only possibility.

---

## 3. The unnamed case — checked, not assumed

The dispatch asked what the list shows for `{kind:"unnamed"}`, whether visible label and accessible
name agree, and whether either contains hash characters.

**Shown: `UNNAMED_MEMBER_LABEL`, i.e. "Unnamed member", for both.** They agree by construction — one
`memberLabel` binding — and neither contains hash characters, since the `unnamed` branch of the
union carries no payload. This is verified at three levels: the union's shape, the unit test
asserting no `aria-label` or rendered text contains any part of either hash, and the E2E asserting
`not.toMatch(/[0-9a-f]{8}/i)` against the whole roster.

The choice is the right one and the justification is sound. The same person is simultaneously
visible as a presence avatar labelled "Unnamed member" (P24) and as a roster row; two different
fallbacks on one screen would be a defect of its own. `memberFallbackName` was correctly rejected —
it embeds the hash, which is exactly what UR-006 forbids.

`memberFallbackName` itself is unchanged and still reached via `resolvePersonDisplayName`, which the
People page renders (`PersonRow.tsx:147`). I confirmed that surface is untouched. This matches P24's
deliberate restraint.

---

## 4. Proof the tests catch the defect — reproduced in my own trees

The dispatch required me to reproduce this rather than accept the claim. I did, in a throwaway
`git archive` tree and in my own worktree, **never in the shared main checkout**. In each case I
reverted ONLY `AccessMembersSection.tsx` to its BASE content and left the new tests untouched, so
the A/B isolates the fix.

### Unit — all 6 fail against the BASE component

```
$ cd /tmp/mf-p27r1-base   # git archive of d4d8c40, component reverted to 736c471
$ ./node_modules/.bin/vitest run tests/unit/components/access-members-section.test.tsx

 FAIL  ... > renders NO part of any member's pubkeyHash, in text or in any accessible name
AssertionError: expected 'Access & MembersMembersRemoving a mem…' not to contain '3f2a9b1c'
Received: "...3f2a9b1c…5555(you)owner7e8d0a2b…9999memberPending InvitesNo pending invites."

 Test Files  1 failed (1)
      Tests  6 failed (6)
```

**The reported defect is visible verbatim in the failure output** — `3f2a9b1c…5555(you)owner` — and
it matches the implementer's quoted string exactly. Its claim is accurate as written.

### E2E — both fail against the BASE component

```
$ cd /tmp/mf-e2e-p27r1   # component temporarily reverted, restored immediately after
$ env -u CI pnpm exec playwright test --retries=0 --reporter=line vault-settings.spec.ts -g "Members List"

  1) ... › identifies members by name and never by a pubkey hash › the owner is listed by their seeded name
    Error: expect(received).toMatch(expected)
    Expected pattern: /^Me\b/
    Received string:  "417ad4dc…414b(you)owner"

  2) ... › shows a readable fallback for a member with no name, not a hash
    Test timeout of 30000ms exceeded.

  2 failed
```

Again the defect is visible in the failure: `417ad4dc…414b(you)owner`. After restoring the component
I re-verified the worktree digest returned to its exact pre-probe value,
`be04ab6c04f99d7ac8fa29366f4dbba1`.

### The rename step — the dispatch asked me to judge whether it holds. It does.

The third `test.step` navigates to the People page, renames the person to "Ben Tefay" through the
real edit control (`PersonRow.tsx:121`'s `"Person name"` placeholder), returns to settings, and
requires the roster row to read `/^Ben Tefay\b/`. **This is the assertion a future agent cannot
satisfy by hardcoding a string**, because the expected value is produced by a mutation the test
itself makes elsewhere in the app. A component that returned any constant — including the correct
initial "Me" — fails it. It genuinely pins the join rather than the copy.

The rest of the coverage splits the way it should: the hash-absence assertions are structural and
survive any wording change, while the two label-naming locators are copy-dependent but fail loudly.
Per `.claude/skills/e2e/SKILL.md`'s "assert behaviour, not text", the text here IS the behaviour
under test — UR-006 is a requirement about what a user sees — so naming it is correct.

I also checked the harness-exactness hazard from `Q-P24-01` in both directions. The E2E passes
`exact: true` on the `Remove member Unnamed member` locator, and the unit tests use Testing
Library's `getByText`, which is whole-text exact by default, so `getByText("Me")` cannot match
"Unnamed member". Both harnesses are handled correctly.

---

## 5. THE SCOPE QUESTION — ruled: legitimate consolidation, not scope creep

The implementer surfaced this itself rather than burying it, and noted a FAIL here would be
actionable. **I rule it in scope.** Three independent reasons, and I checked the behaviour claim
rather than accepting it.

**It is what the project rules require.** `.claude/rules/coding-style.md` says "Never duplicate code
unless there is a very good reason" and "Extract reusable patterns early". Landing UR-006 with an
open-coded copy of the label rule would have made three copies. The extraction is the repo's stated
convention, not a personal preference.

**It is what P24's helper exists for.** `tasks/ur-006.md` is explicit: "Use the SAME shared pure
helper as P24 so the members list and the presence avatar cannot drift." Resolution was already
shared; the label was not. Consolidating the label completes the anti-drift purpose rather than
extending beyond it.

**UR-003's behaviour is genuinely unchanged, verified exhaustively.** Both call sites are total
two-branch matches over a two-case union, so the comparison is finite and complete:

- `PresenceAvatar.tsx:64` — BASE
  `displayName.kind === "named" ? displayName.name : UNNAMED_MEMBER_LABEL` vs HEAD
  `memberDisplayLabel(displayName)`. The helper body is character-identical to the replaced
  expression. Identical on both branches.
- `TransactionRow.tsx:234` — BASE
  `const resolved = resolveMemberName?.(pubkeyHash); return resolved?.kind === "named" ? resolved.name : UNNAMED_MEMBER_LABEL;`
  vs HEAD `memberDisplayLabel(resolveMemberName?.(pubkeyHash) ?? { kind: "unnamed" })`. The
  `?? { kind: "unnamed" }` reproduces the BASE optional-chaining behaviour exactly: when
  `resolveMemberName` is absent, BASE's `resolved?.kind === "named"` is false and yields the
  fallback; HEAD substitutes `{kind:"unnamed"}` and yields the same fallback. Identical on all three
  cases — undefined prop, named, unnamed.

The pin the implementer claims is real: those 41 tests pass unchanged on my tree.

```
$ ./node_modules/.bin/vitest run tests/unit/crdt/person.test.ts tests/unit/components/presence-avatar.test.tsx
 Test Files  2 passed (2)
      Tests  41 passed (41)
```

And no existing test was weakened to accommodate the change — `person.test.ts` gained 34 lines with
exactly 1 deletion, which is the reformatted import line. `presence-avatar.test.tsx` and
`presence.spec.ts` are untouched by the diff.

The blast radius is minimal and net-negative: the two UR-003 files total **+6/-7 lines**.

One residual `kind === "named"` check remains at `PresenceAvatar.tsx:85`. I checked it and it is
correctly left alone — it selects _initials vs a person icon_, a visual branch, not a label. After
this change `UNNAMED_MEMBER_LABEL` has exactly one consumer in `src/`, which is the point of the
extraction.

---

## 6. The A-1 lesson — the claim holds, and I proved it rather than inspecting

P24's A-1 showed a leaf-level guarantee defeated by an optional prop upstream, proved by deleting a
plumbing line and watching tsc and 1810 unit tests stay green. The dispatch asked me to verify the
implementer's claim that no equivalent path exists here, **for every path that reaches the members
list**.

First, the paths. There is exactly one render site:

```
$ grep -rn "AccessMembersSection" src tests | grep -v "vault/AccessMembersSection.tsx:"
src/components/features/vault/index.ts:1  (re-export)
src/app/(app)/settings/page.tsx:9,28      (the only render site)
tests/unit/components/access-members-section.test.tsx:67,94
```

There is no prop to omit — `people` arrives via `usePeople()`, not through the component's props —
so the A-1 shape cannot occur. The chain is `usePeople` (`context.tsx:701`) -> `useVaultSelector`
(`:570`) -> `useInternalVaultSelector` (`:84`, = `loroContext.useLoroSelector`) -> `useLoroContext`,
which throws when no provider is above it.

I did not stop at reading the library source. I wrote a disposable probe rendering the real
component with the real hook and no provider, in the throwaway tree:

```
AssertionError: expected [Function] to not throw an error but
'Error: useLoroContext must be used within a LoroProvider' was thrown

 Test Files  1 failed (1)
      Tests  1 failed (1)
```

**Observed, not inferred.** The failure mode for a missing data source is a loud throw at first
render, not a roster silently reading "Unnamed member" for every named member. The implementer's
claim is correct and its stated limit — that this guarantees the data source, not the absence of
hash-shaped strings in the type system — is the right limit to state. The probe file was deleted and
both trees verified unchanged afterwards.

---

## 7. The six checks — real output, run in my own worktree

| Check               | Command              | Result                                  |
| ------------------- | -------------------- | --------------------------------------- |
| `pnpm typecheck`    | `tsc --noEmit`       | **PASS**, exit 0, no output             |
| `pnpm lint`         | `eslint`             | **0 errors**, 1 pre-existing warning    |
| `pnpm format:check` | `oxfmt --check`      | 17 pre-existing frozen `specs/**` files |
| `pnpm test`         | 3x `vitest run`      | 2 green at **2195**, 1 known-flake red  |
| `pnpm test:e2e`     | 5x `playwright test` | **5/5 green, 170 passed each**          |
| Manual browser      | `playwright-cli`     | **PASS** — see §7.4                     |

### `pnpm lint`

```
  426:25  warning  Compilation Skipped: Use of incompatible library
✖ 1 problem (0 errors, 1 warning)
```

The single warning is `useVirtualizer` at `TransactionTable.tsx:426`. **That file is not in the P27
diff at all**, so the warning is pre-existing — the same one P24's and P26's reviewers verified. The
implementer's characterisation is accurate.

### `pnpm format:check` — still exactly 17, none a P27 file

```
Format issues found in above 17 files.
```

The 17 are `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`,
`RISKS.md`, `SCOPE.json`, `evidence/P12/implementation-0{3,4,5,6}.md`,
`evidence/P14/implementation-01.md`, `evidence/P16D/implementation-01.md`,
`evidence/P19/implementation-01.md`, `reviews/P12-review-0{5,6}.md`, and `specs/human-scratch.md`.
Every one is a pre-existing frozen `specs/**` file. **Zero are P27 files** — in particular
`evidence/P27/implementation-01.md` is NOT in the list — and no `src/**` or `tests/**` file appears.
The count matches the dispatch's known condition exactly.

### `pnpm test` — and I NAMED the implementer's unattributed red run

The implementer reported one unreproducible `1 failed | 2194 passed` out of five runs, whose failing
test name it had lost to a `grep`, and it labelled the attribution an UNCONFIRMED INFERENCE. The
dispatch asked me to watch for it and to name it if I could.

**I reproduced it and it is named.** My third full run:

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/import/duplicates.test.ts > detectDuplicates performance > scales linearly with input size (O(n+m) complexity)
 Test Files  1 failed | 116 passed (117)
      Tests  1 failed | 2194 passed | 2 skipped (2197)
```

That is `tests/unit/import/duplicates.test.ts:749`, the wall-clock RATIO assertion named in the
dispatch's known-conditions list — `expect(ratio1).toBeLessThan(4)` over `performance.now()` deltas.
The count matches the implementer's report exactly at `1 failed | 2194 passed`.

**So the implementer's inference was correct, and it was still right to label it unconfirmed.** On
the evidence it had — no test name — it could not have asserted this. Recording a self-caught gap
honestly and refusing to over-claim from it is exactly the behaviour the process wants. My runs: 3
full-suite runs, 2 green at 2195, 1 red on this known load-sensitive test. It is not in the P27
diff's area and is a documented pre-existing condition.

### E2E campaign — 5 consecutive full-suite runs, one tree, nothing else running

`env -u CI ./node_modules/.bin/playwright test --retries=0`, full suite, in `/tmp/mf-e2e-p27r1`. The
dispatch's bar is at least 3; I ran 5, because a 3-run campaign has roughly even odds of missing a
1-in-6 flake — a lesson from P22 rev 02 in this same goal, where two agents' 3-run campaigns each
came back clean and a 6-run campaign found a genuine flake.

`CI` was never set for a Playwright run — `playwright.config.ts:56,60` would give 1 worker and 2
retries under CI, inverting the required profile. `CI=true` was used only for `pnpm install`.
Playwright was never run with `--debug`, `--ui`, `--headed` or `show`. Before starting I confirmed
`:3000` was unbound by reading `/proc/<pid>/cmdline` for every candidate rather than `pgrep -f`,
which matches the checking command itself; the only Next server was the human's on `:3001`.

| Run | Digest before                      | Result                | Exit | Digest after                       |
| --- | ---------------------------------- | --------------------- | ---- | ---------------------------------- |
| 1   | `be04ab6c04f99d7ac8fa29366f4dbba1` | **170 passed** (4.0m) | 0    | `be04ab6c04f99d7ac8fa29366f4dbba1` |
| 2   | `be04ab6c04f99d7ac8fa29366f4dbba1` | **170 passed** (4.0m) | 0    | `be04ab6c04f99d7ac8fa29366f4dbba1` |
| 3   | `be04ab6c04f99d7ac8fa29366f4dbba1` | **170 passed** (4.0m) | 0    | `be04ab6c04f99d7ac8fa29366f4dbba1` |
| 4   | `be04ab6c04f99d7ac8fa29366f4dbba1` | **170 passed** (4.1m) | 0    | `be04ab6c04f99d7ac8fa29366f4dbba1` |
| 5   | `be04ab6c04f99d7ac8fa29366f4dbba1` | **170 passed** (4.0m) | 0    | `be04ab6c04f99d7ac8fa29366f4dbba1` |

**5/5 green, zero failures, zero flakes**, at the count the dispatch predicted. The digest was
computed before and after every run and never moved, so all five runs covered one tree. It excludes
`next-env.d.ts`, which `next dev` rewrites on every start and which is the only entry in
`git status` afterwards. The port was released after run 5 and I verified `:3000` unbound.

This reproduces the implementer's 3/3 result and extends it. Its digest was `f73143fa`; mine is
`be04ab6c`, which is expected — different worktree paths and a docs-only HEAD advance change the
digest input without changing any `src/**` or `tests/**` content, and I verified that separately
with an empty `git diff ae79e36 HEAD -- src tests`.

### 7.4 Manual feature testing — real browser, real app

Per `.claude/skills/e2e/SKILL.md` I used the repository-installed `playwright-cli` with a unique
non-persistent session, not Playwright MCP, `npx`, an ad-hoc script or a temporary test file. I read
from the human's dev server on `:3001` and did not start or kill any server. I ran this AFTER the
campaign released `:3000`, not during it.

Created a fresh identity and vault through the real UI, then read the accessibility tree at
`/settings`:

```
- heading "Members" [level=3]
- list:
  - listitem:
    - generic: Me(you)
    - generic: owner
```

**The reported defect is fixed in the running application.** The row the principal saw as
`3f2a9b1c…4d5e` now reads "Me".

Then I did the part that a test alone cannot establish — renamed the person on the People page and
returned to Vault Settings by in-page navigation:

```
- listitem:
  - generic: Ben Tefay(you)
  - generic: owner
```

**The roster followed the rename in the product**, confirming the label is genuinely resolved from
the people map rather than being a constant that happens to read correctly. On the People page the
presence avatar simultaneously showed `img "Me": M` with tooltip `Me (online)`, so the two surfaces
agree — which is the entire point of the shared helper.

I verified persistence with `reload`: the roster still read `Ben Tefay(you) owner`. `console error`:
**0 errors** of 5 messages. `requests`: no failed request. Session closed, `delete-data` run,
`.playwright-cli/` artifacts removed, and the main checkout verified to contain no new files beyond
this review.

I did not reveal the generated recovery phrase at any point — I left the "Click to reveal" control
untouched and checked the confirmation box without displaying the phrase.

### My own campaign contamination, disclosed

My FIRST campaign attempt is void and I am recording why, because its log contains a red E2E run
that has nothing to do with this tree. I started the campaign and then, to hunt the unit red run
above, ran two full `pnpm test` passes CONCURRENTLY with E2E run 1. That run returned
`1 failed | 169 passed` on `transactions.spec.ts:725` — a virtualization test whose assertion is an
`expect.poll` with a 10-second budget, precisely what 117 concurrent vitest files will break.

I could have argued it was contention and moved on. I did not, because once the load is uncontrolled
the campaign cannot be interpreted either way. I killed it and restarted from run 1 with nothing
else of mine running. The restarted campaign's run 1 passed that same test. **The failure was my
artifact, not a property of the tree** — but the disciplined response is to discard the campaign,
not to explain the failure away.

Cleanup was non-trivial and is worth recording for the next reviewer: the driver shell respawns
runs, so it must be killed first; the Playwright CLI parent's cmdline is a RELATIVE path
(`node ./node_modules/.bin/../@playwright/test/cli.js`) so a `/tmp/mf-*` cmdline scan misses it
while matching its workers; and the orphaned `next-server` holding `:3000` shows only
`next-server (v16.2.11)`, identical to the human's. I distinguished mine by
`readlink /proc/<pid>/cwd` — `/tmp/mf-e2e-p27r1` vs `/home/ben-agents/Code/moneyflow` — and killed
only mine. **The human's dev server on `:3001` (818156/818182) was verified alive and untouched
throughout.**

---

## 8. Campaign integrity — `Q-P27-01` applied to my own campaign

The dispatch required me to verify my collected count explicitly rather than trust a green run,
because an unresolvable import makes Playwright report "No tests found" and silently skip a whole
spec file.

```
$ env -u CI pnpm exec playwright test --list
Total: 170 tests in 22 files
```

**170 = BASE's 168 + 2 new**, in the same 22 files because the implementer extended an existing spec
rather than adding one. And I confirmed the two new tests are not merely listed but actually
EXECUTED, by finding them in the run log rather than inferring from the total:

```
[167/170] ... vault-settings.spec.ts:304:13 › Members List › identifies members by name and never by a pubkey hash
[168/170] ... vault-settings.spec.ts:356:13 › Members List › shows a readable fallback for a member with no name, not a hash
```

The hazard does not apply to this spec: it repeats the `UNNAMED_MEMBER_LABEL` literal with a comment
explaining exactly why, rather than importing it. That was the correct call, and `presence.spec.ts`
sets the precedent.

I endorse `Q-P27-01` as transcribed. Its mechanism is verified independently in §1.

---

## 9. Type safety, secret-safety, and scope hygiene

**Type safety — BLOCKING, cleared.** No `as`, `any` or `!` in the added product code. A grep over
the diff's added `src/**` lines returns only prose inside comments — the word "as" in "the same
reason as" and "Same helper as the presence avatars". `memberDisplayLabel` discriminates on `kind`
with no cast, and `MemberDisplayName` is a proper discriminated union per
`.claude/rules/typescript-style.md`.

**Secret-safety — BLOCKING, cleared.** No key material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` value, presence key, invite fragment or vault plaintext appears in the diff or
in the evidence. The only "recovery" hit in the changed files is the unit test's own header comment
asserting that no such material is present. Unit fixtures are synthetic
(`"3f2a9b1c4d".padEnd(64, "5")`); the E2E reads hashes from its own fixture via the pre-existing
`readBrowserIdentity`, which returns hashes and a vault id only. I agree with the implementer's
framing that a pubkeyHash is public material, so UR-006 is a presentation defect rather than a
disclosure — and I checked that against the frozen text rather than assuming it. The fix reduces
exposure either way.

**Scope.** Product and tests plus the evidence file. No ledger, marker, scratch, SCOPE, spec,
FINAL-AUDIT or review file is touched by `8c5cda6`; `playwright.config.ts` and `next.config.ts` are
untouched. The commit message contains no parentheses.

**Evidence honesty — criterion 11, verified line by line.** The evidence discloses: the unattributed
red unit run with its attribution explicitly labelled an inference rather than an observation
(`implementation-01.md:303`); the disproved P24 §4 advisory with the verbatim failure text; the
scope flag on the two UR-003 files, offered with a concrete revert path rather than defended
(`:402`); and both corrections to the dispatch. Claims are consistently marked "Observed, not
inferred" where they are observations. I found no claim in the evidence that my own runs contradict.

### Advisory notes — non-blocking, no action required for PASS

**N-1. The roster has no loading state distinct from an unnamed member.** While the people map is
still hydrating, a named member resolves to `{kind:"unnamed"}` and the row reads "Unnamed member"
until the CRDT state arrives. This is not the reported defect, shows no hash, and is self-correcting
on the next render — and the E2E's 60-second visibility budget shows the real timing is not
marginal. Worth knowing rather than worth fixing.

**N-2. `memberDisplayLabel` returns a plain `string`.** The implementer states this limit itself.
What actually prevents a hash-shaped label is that neither union branch can carry one, plus the
structural tests. A branded `MemberLabel` type would move the guarantee into the compiler. Not
proposed as a change — the current design is sound and the tests cover it.

## 10. Q-proposals for P21 carry-forward

**I endorse `Q-P27-01`** as already transcribed; I verified its mechanism independently rather than
accepting the report, and its "silently reduced count, not a red run" characterisation is the part
that matters.

**Proposed `Q-P27-02` — a verification campaign is evidence only for the LOAD it ran under, not just
the tree it ran on.** Raised from my own error in §7. The goal already has
`campaign-tree-drift-discipline` for the tree axis: if the tree changes mid-campaign, discard and
restart. The same is true of machine load, and it is easier to violate accidentally because running
unit tests "while waiting" feels productive. A latency-budget assertion under concurrent load
produces a red run indistinguishable at a glance from a real flake. Suggested disposition: campaigns
run alone; any other verification work happens before the campaign is armed, not during it. Pair
with the existing per-run digest discipline — digest proves the tree, serialization proves the load.

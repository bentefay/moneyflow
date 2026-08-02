# P24 review 01 — UR-003 presence avatars show member name initials

**Reviewer:** `p24-reviewer-01`, fresh context, DISTINCT from `p24-implementer-01`. I authored none
of the code under review.

**Tree reviewed:** BASE == HEAD == `9e81a8d83531d2f46f2d5af6d7bac5736f59e6b2`, confirmed by
`git rev-parse HEAD` at dispatch. Commits under review `befe694`, `162d75a`, `629352f`, `a318b40`,
each confirmed an ancestor of HEAD by `git merge-base --is-ancestor` rather than by `git show`
alone, so none is a dangling amended commit. `b70280c` — an evidence-only commit landed after the
implementer's handback — is also in the reviewed range and is included below.

**Reviewer worktree:** `/tmp/mf-e2e-p24r1` at `9e81a8d`. I did not use `/tmp/mf-e2e-p24` (the
implementer's), nor `/tmp/mf-e2e-p22`, `/tmp/mf-e2e-p22r3`, `/tmp/mf-e2e-p23`.

## VERDICT: **PASS**

The reported defect is fixed on both linkage paths, at all three render sites, and I confirmed it in
a real browser rather than only in tests. All six checks pass on my own tree, and my own independent
5-run E2E campaign reproduced the implementer's result exactly.

Two findings are recorded below as **advisory, non-blocking**. Neither is a defect in shipped
behaviour and neither justifies a FAIL; both are proposed as carry-forward.

---

## 1. Verification — commands and real output

Run in `/tmp/mf-e2e-p24r1`, my own worktree at `9e81a8d`, never in the shared main checkout.

One environment note recorded for honesty: my first `pnpm test` produced **2 failures**, both
`ENOENT: no such file or directory, open '.env.local'` from
`tests/integration/helpers/realtime-stack.ts:36`. `.env.local` is gitignored (`.gitignore:14`) and
therefore absent from a freshly created worktree. I copied it in from the main checkout and re-ran.
This is a worktree-provisioning artifact of my own making, not a property of the tree under review,
and I record it rather than quietly omitting it.

| Check               | Command                          | Result                                          |
| ------------------- | -------------------------------- | ----------------------------------------------- |
| `pnpm typecheck`    | `tsc --noEmit`                   | **PASS**, exit 0, no output                     |
| `pnpm lint`         | `eslint`                         | **exit 0** — 1 pre-existing warning, 0 errors   |
| `pnpm format:check` | `oxfmt --check`                  | 17 pre-existing frozen `specs/**` files         |
| `pnpm test`         | `vitest run`                     | **115 files, 2140 passed, 2 skipped, 0 failed** |
| `pnpm test:e2e`     | 5x `playwright test --retries=0` | **5/5 green, 167 passed each**                  |
| Manual browser      | `playwright-cli`                 | **PASS** — see section 3                        |

### `pnpm lint` — verbatim

```
/tmp/mf-e2e-p24r1/src/components/features/transactions/TransactionTable.tsx
  426:25  warning  Compilation Skipped: Use of incompatible library
...
✖ 1 problem (0 errors, 1 warning)
LINT_EXIT=0
```

The single warning is on `useVirtualizer` at `TransactionTable.tsx:426`. That line is **not** in the
P24 diff — the diff touches `:51`, `:222` and `:496` of that file — so the warning is pre-existing
and the implementer's characterisation is accurate.

### `pnpm format:check` — count verified as still exactly 17, none a P24 file

```
Format issues found in above 17 files. Run without `--check` to fix.
```

The 17 are `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`,
`RISKS.md`, `SCOPE.json`, `evidence/P12/implementation-0{3,4,5,6}.md`,
`evidence/P14/implementation-01.md`, `evidence/P16D/implementation-01.md`,
`evidence/P19/implementation-01.md`, `reviews/P12-review-0{5,6}.md`, and `specs/human-scratch.md`.
Every one is a pre-existing frozen `specs/**` file. **Zero are P24 files** — in particular
`evidence/P24/implementation-01.md` is NOT in the list, and no `src/**` or `tests/**` file is. The
count is unchanged at 17, as the dispatch's known-conditions list states.

### `pnpm test` — the load-sensitive test, handled per the known condition

Two of my full-suite runs failed on exactly one test,
`tests/unit/import/duplicates.test.ts:724-749`, which asserts a wall-clock RATIO. Per the dispatch's
known-conditions list I checked it first, in isolation: **43 passed**, clean. A subsequent full run
was clean end to end:

```
 Test Files  115 passed (115)
      Tests  2140 passed | 2 skipped (2142)
```

This matches the documented load-sensitive behaviour and the implementer's reported 2140/0. I record
the intermediate red runs rather than only the green one.

### E2E campaign — my own, not the implementer's

`env -u CI pnpm exec playwright test --retries=0`, full suite, in `/tmp/mf-e2e-p24r1`. `CI` was
never set for a run — `playwright.config.ts:56,60` would give 1 worker and 2 retries under CI,
inverting the required 4-worker retries-disabled profile. `CI=true` was used only for
`pnpm install`. Playwright was never run with `--debug`, `--ui`, `--headed` or `show`. The human's
dev server on `:3001` was never touched.

| Run | Digest before run                  | Result                | Exit |
| --- | ---------------------------------- | --------------------- | ---- |
| 1   | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (4.2m) | 0    |
| 2   | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (3.9m) | 0    |
| 3   | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (4.0m) | 0    |
| 4   | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (4.0m) | 0    |
| 5   | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (3.9m) | 0    |

```
PRE-CAMPAIGN DIGEST: 65cd36733093dabe5559e02907ff70e5
PRE-CAMPAIGN HEAD: 9e81a8d83531d2f46f2d5af6d7bac5736f59e6b2
PRE-CAMPAIGN STATUS: []
...
POST-CAMPAIGN DIGEST: 65cd36733093dabe5559e02907ff70e5
CAMPAIGN COMPLETE
```

Digest verified before run 1 and again after run 5, unchanged throughout — so all five runs covered
one tree and the campaign is evidence for that tree. **5/5 consecutive green, zero failures, zero
flakes**, clearing the 5-run bar. This independently reproduces the implementer's reported 5/5 at
167 and its digest `65cd3673…`; I did not accept their campaign. The port was released immediately
after run 5 and root was told before this document was written.

The only `POST-CAMPAIGN STATUS` entry is ` M next-env.d.ts`, the known Next artifact.

---

## 2. Per-criterion findings

### 1. All THREE render sites are plumbed — **CONFIRMED**

```
$ grep -rn '<PresenceAvatar' --include='*.tsx' src
src/components/features/presence/PresenceAvatarGroup.tsx:75
src/components/features/transactions/TransactionRow.tsx:552
```

Two direct render sites; `PresenceAvatarGroup` is fed from `layout.tsx:232` (mobile header) and
`layout.tsx:351` (sidebar), giving the three surfaces. All three receive a resolved name:
`layout.tsx:145-155` memoizes `presentUsers` over `resolveMemberDisplayName`, shared by both groups;
`TransactionRow.tsx:224-226` resolves via the `resolveMemberName` prop threaded from
`transactions/page.tsx:206-208` through `TransactionTable.tsx:496`.

The dispatch's line numbers were slightly stale — the group render is at `:75` not `:74`, and the
row's at `:552` not `:539` — an artifact of the two follow-up commits. The substance holds.

The row wrapper `title` at `TransactionRow.tsx:550` is covered. At base it read
`` `Editing: ${...map(memberFallbackName)}` `` producing "Editing: Member 3f2a9b1c"; it now maps
each hash through `resolveMemberName` and substitutes `UNNAMED_MEMBER_LABEL`, so it can no longer
emit hash characters. I verified the base-tree text with `git show e02470f:` rather than trusting
the dispatch. `grep -rn '<PresenceAvatar'` over all of `src` returns exactly those two lines, so
there is no unenumerated fourth site.

### 2. Initials derive from the resolved name — **CONFIRMED**

`PresenceAvatar.tsx:84` calls `getInitials(displayName.name)` on the resolved name only. Verified in
a real browser: "Me" → "M", "Ben Tefay" → "BT" (section 3). `git diff` over the commit range shows
`src/lib/utils/color.ts` is **not in the changed-file list**, so `getInitials` is untouched — as the
frozen orientation required. No change beyond what is justified.

### 3. Tooltip and accessible name follow the same rule as the visible label — **CONFIRMED**

`PresenceAvatar.tsx:65` computes one `label` binding; `:69` uses it for `title` and `:83` for
`aria-label`. A single binding means the three cannot diverge by construction. `label` is either
`displayName.name` or `UNNAMED_MEMBER_LABEL` — never `userId`, which is documented at `:12` as "used
for colour only — never displayed". The `(online)` suffix is the only decoration.

### 4. Colour derives from the stable `userId` — **CONFIRMED**

`PresenceAvatar.tsx:62` is `hashToColor(userId)`, unchanged, with an added comment explaining why.
Two unit tests pin it, and I confirmed the rename case in a live browser: the background stayed
`rgb(14, 165, 233)` across a "Me" → "Ben Tefay" rename (section 3).

### 5. BOTH PATHS implemented and tested against the REAL `ensureMemberPerson` — **CONFIRMED**

I verified the two paths from source, not from the dispatch's framing. `defaults.ts:52,61-62` seeds
`DEFAULT_PERSON` with `name: "Me"`. `person.ts` step 2 sets `linkedUserId` on the seeded person,
keeping "Me" — the owner path. Step 3 creates a person with `name: undefined` — the invited path.
Both callers of `ensureMemberPerson` are real (`ensure-default.ts:149` with
`adoptDefaultPerson: true`, and `mirror.ts:235` via `ensureMemberPersonLinked`).

The dispatch's specific concern — a fixture hand-asserting `{linkedUserId, name:"Me"}` that would
pass even if the adopt path stopped setting the name — **does not apply**. The tests build fixtures
by calling the production function:

```ts
function vaultWithOwner(): PeopleDraft {
    const draft: PeopleDraft = { people: { [DEFAULT_PERSON_ID]: { ...DEFAULT_PERSON } } };
    ensureMemberPerson(draft, OWNER_HASH, { adoptDefaultPerson: true });
    return draft;
}
```

and the invited path with a bare `ensureMemberPerson(draft, MEMBER_HASH)`. If the adopt branch
stopped propagating the name, `vaultWithOwner()` would resolve `unnamed` and the "Me" → "M"
assertions would fail. The coupling the dispatch asked for is genuinely present.

### 6. The unnamed-member decision — **SATISFIES the frozen text**

Chosen: a `User` person icon, with `aria-label` and `title` both `"Unnamed member"`, zero hash
characters. Judged against `spec.md:66-74`: the tooltip "shows the resolved display name, not a key
hash" — satisfied, "Unnamed member" contains no hex. "Deriving initials from a key hash remains only
as a last-resort fallback" — satisfied more strongly than required, since the avatar cannot reach
the hash branch at all. "A clearly human-readable fallback" — "Unnamed member" is ordinary English
naming exactly the situation.

The rejected alternatives are the right ones to reject. "M3" (initials of "Member 3f2a9b1c") has
hash text as its second character and is no better than the reported "AD". A bare "M" would be
indistinguishable from a member named "Me". I agree with the decision and its stated reasoning.

### 7. `linkedUserId` scan versus derived-id lookup — **REASONING VERIFIED, and the test pins it**

The reasoning holds and I verified each step independently. The owner adopts `DEFAULT_PERSON_ID` =
`"person-default-me"` (`defaults.ts`), while `deriveMemberPersonId` returns
`` `person-member-${pubkeyHash}` ``. A derived-id lookup therefore finds invited members and misses
the owner — the reported defect's own case. Scanning `linkedUserId` matches what
`ensureMemberPerson` itself does when checking for an existing link, so the two cannot disagree.

The pinning test does its job as an executable constraint, not merely a happy-path assertion:

```ts
expect(draft.people[deriveMemberPersonId(PUBKEY_HASH)]).toBeUndefined();
expect(resolveMemberDisplayName(draft.people, PUBKEY_HASH).kind).toBe("named");
```

The first line is the load-bearing one: it asserts the derived id is _absent_ while the owner still
resolves. A future agent "optimizing" the scan into a derived-id lookup fails immediately. This is
the strongest single test in the package.

### 8. `displayName` as a REQUIRED discriminated-union prop — **GENUINELY makes the state unrepresentable, at the avatar**

The old `name?: string` with `const displayName = name || userId` is gone; the prop is required and
typed `MemberDisplayName`. Omitting it is a compile error, and neither variant carries a hash-shaped
string — `{kind:"named", name}` comes only from `personOwnName`, and `{kind:"unnamed"}` carries no
payload. So _the avatar_ cannot render hash characters however it is called. That is real, and it is
stronger than passing a name at three call sites, because it also constrains a future fourth site.

Scoped precisely: the guarantee is that an avatar handed a `MemberDisplayName` cannot show a hash.
It does not extend to _whether a caller resolves the name at all_ — see finding A-1.

### 9. `memberFallbackName` deliberately NOT changed — **RESTRAINT HOLDS**

```
$ grep -rn 'memberFallbackName' --include='*.ts' --include='*.tsx' src tests
src/lib/crdt/person.ts:67   (definition)
src/lib/crdt/person.ts:81   (called by resolvePersonDisplayName)
tests/unit/crdt/person.test.ts:17,37,40
```

Its body is byte-identical to base. The `TransactionRow.tsx:222` caller the dispatch flagged is gone
— but replaced by per-hash resolution, not by a changed shared helper, so no _other_ consumer was
silently altered. The row's presence LABEL grammar is unaltered: still
`` `${"Editing"|"Viewing"}: ${names.join(", ")}` ``, verified against `git show e02470f:`. Only the
name source changed, which is precisely what UR-003 requires. Restraint confirmed.

### 10. Shared helper, behaviour preserved for existing callers — **CONFIRMED**

`resolveMemberDisplayName(people, pubkeyHash) -> MemberDisplayName` exists in
`src/lib/crdt/person.ts` with the required signature. `personOwnName` is extracted and
`resolvePersonDisplayName` rebuilt on it. I read the rebuild line by line: base inlined
`person.name?.trim()` with a `!= null && length > 0` guard; `personOwnName` is that expression
verbatim, returning `null` where the guard failed. The two later rungs are untouched. Behaviour is
identical, not merely similar.

`resolvePersonDisplayName` has 11 caller files besides `person.ts`; the diff touches exactly one of
them (`transactions/page.tsx`) and there only to widen an import. Its 4 pre-existing tests are
unmodified — the file went 15 → 26 `it(` blocks with **zero deletions** across all test files
(`git diff ... -- tests/ | grep -c '^-[^-]'` returns 0). No existing test was weakened.

For P27/UR-006 the helper is directly reusable: `AccessMembersSection.tsx:130` and its `aria-label`
at `:152` currently call a local `shortenPubkeyHash`, and `UNNAMED_MEMBER_LABEL` is exported for the
unnamed case. The evidence's note that P27 must pull in `usePeople()` is correct — that component
reads membership from tRPC only today.

### 11. All six checks — **RUN, with real output recorded** — see section 1

### 12. Type safety and secret-safety — **PASS, BLOCKING criterion cleared**

No `as`, `any` or `!` in the added product code. The only `as` occurrences in the touched files are
`as const` literal assertions (`PresenceAvatar.tsx:35,41,47`, `PresenceAvatarGroup.tsx:55,61`),
which the dispatch permits and which `typescript-style.md` positively encourages. The pre-existing
`as unknown as` casts in `transactions/page.tsx:152,376,377,1030` are on lines outside the diff.

`LinkedPerson.deletedAt` is typed `unknown` and used only in a `!= null` comparison — a genuinely
type-safe way to accept the schema's `Instant` without importing it, not an escape hatch.

Secret-safety: I grepped the P24 product files, both new test files, the E2E spec and the evidence
for `SUPABASE_JWT_SECRET`, seed phrase, mnemonic, recovery, `secretKey`, `privateKey` and PEM
headers. The only hit is the evidence's own prose _asserting_ none is present. Fixtures are
synthetic (`"ad3f2a9b1c".padEnd(64,"0")`), and the E2E reads hashes from its fixture rather than
hardcoding them. A pubkey hash is public material, so this is a presentation defect and not a
disclosure — I verified that framing against the frozen text at `spec.md:60-62` rather than assuming
it. During manual testing I declined to reveal the generated recovery phrase and no key material
appears in this document.

### 13. Evidence honesty — **CONFIRMED on every point**

Each of the five items the dispatch listed is present and prominent rather than buried:

- **The DISCARDED first campaign** is recorded under a heading reading "A discarded first campaign,
  reported in full rather than omitted", with the 166/1 result, the verbatim strict-mode violation,
  and an explicit statement that the campaign restarted from run 1 per tree-drift discipline.
- **The `deriveMemberPersonId` correction** is recorded as changing the design, with the reason the
  dispatch's own suggestion would have shipped the principal's defect.
- **The `presentIdentities` self-correction** is recorded in full — what was first written, why the
  model was wrong, and that it was found by reading `use-vault-presence.ts` before committing. I
  verified the cited code at `:128-134`: self is prepended first, so the corrected `toHaveCount(1)`
  is right and the original zero-count assertion would have been false.
- **`memberFallbackName` deliberately unchanged** is stated as restraint, with the second caller
  named.
- **The kept `getInitials(...) === "AD"` assertion** is marked deliberate in a comment added by
  `162d75a` specifically so a reviewer does not read it as an unfixed defect. It worked — I read the
  comment before forming a view.

Inferences are labelled. Two passages are explicitly marked "**Observed, not inferred**", both
correctly: `getInitials("ad3f2a9b1c…") === "AD"` is a live assertion, and the strict-mode violation
text is quoted from a real run log.

I independently re-measured the evidence's headline numbers rather than accepting them: `getByRole`
calls in `tests/e2e/` passing a `name` = **469**; of those, passing `exact` = **33**. Both match
exactly.

---

## 3. Manual feature testing — real browser, real app

Per the e2e skill I used the repository-installed `playwright-cli` with a unique non-persistent
session `p24rev1`, not Playwright MCP, `npx`, an ad-hoc script or a temporary test file. The human's
dev server on `:3001` was already running and serves a tree with `9e81a8d` as an ancestor and no
`src/**` or `tests/**` change since; I confirmed that before trusting the result. I did not start or
kill any server.

Created a fresh identity and vault through the real UI, then read the live DOM at `/transactions`:

```json
[
    {
        "label": "Me",
        "text": "M",
        "tooltip": "Me (online)",
        "bg": "rgb(14, 165, 233)",
        "svg": false
    },
    {
        "label": "Me",
        "text": "M",
        "tooltip": "Me (online)",
        "bg": "rgb(14, 165, 233)",
        "svg": false
    }
]
```

**The reported defect is fixed in the running application.** The avatar the principal saw as "AD"
with a raw-hash tooltip now reads "M", labelled and tooltipped "Me". Two elements are the mobile and
sidebar groups — both plumbed, confirming criterion 1 in the product rather than only in tests.

`reload` → identical, so it is not a transient post-mount state.

On the People page the accessible tree shows the avatar in its reported position, immediately beside
the "Saved" status where the principal saw "AD":

```
- generic "Me (online)":
  - img "Me": M
```

Renamed the person "Me" → "Ben Tefay" through the UI and re-read:

```json
[
    "Ben Tefay|BT|Ben Tefay (online)|rgb(14, 165, 233)",
    "Ben Tefay|BT|Ben Tefay (online)|rgb(14, 165, 233)"
]
```

Both frozen initials examples confirmed live: "Me" → "M" and "Ben Tefay" → "BT". The tooltip follows
the name. **The background stayed `rgb(14, 165, 233)` across the rename**, confirming criterion 4 in
the real product — colour keyed on `userId`, not the name.

`console error`: 0 errors of 11 messages. `requests`: no failed request. Session closed,
`delete-data` run, `.playwright-cli/` artifacts removed, working tree verified clean afterwards.

---

## 4. The open question the dispatch asked me to judge: label-assertion robustness

The implementer flags label assertions as the weakest part of the package. **I agree with the
diagnosis and largely with the mitigation, with one real limit.**

**The `exact: true` locators are robust for the collision that actually bit.** Playwright matches
accessible names by substring, Testing Library matches exactly, so `{name: "Me"}` matched inside
"Unna**me**d member". All three name-carrying locators in the new E2E now pass `exact: true`
(`presence.spec.ts:282,289,329`), which removes the ambiguity: `"Me"` under `exact` cannot match
"Unnamed member". I checked the rest of the `aside` for further collisions — the only other
`aria-label`s are "Open menu" and "Expand/Collapse sidebar", neither containing nor contained in the
avatar labels. The two unnamed-avatar locators additionally assert `toHaveCount(1)` rather than mere
visibility, so a regression that collapsed both avatars onto one label would fail rather than pass
ambiguously.

**Would the coverage survive a label change?** Partly, and the split is worth being precise about.

- The **strongest** assertions are label-independent and would survive any copy change: the loop at
  `:296-320` reads every avatar's text, `aria-label` and tooltip and asserts none contains hash
  characters, plus `tooltip.startsWith(label)` — a structural invariant. The unit test "never
  renders any part of the pubkeyHash, named or unnamed" is likewise structural. These encode
  UR-003's actual requirement.
- The **weakest** are the `{name: "Me", exact: true}` and `{name: "Unnamed member", exact: true}`
  locators. Renaming `UNNAMED_MEMBER_LABEL` breaks the E2E — but it breaks it _loudly_, as a failing
  locator, not silently. That is acceptable: `.claude/skills/e2e/SKILL.md` says "assert behaviour,
  not text", and here the text _is_ the behaviour under test — UR-003 is a requirement about what
  label a user sees, so a test that did not name it would not be testing the requirement.

One concrete improvement, offered as advice rather than a finding: `UNNAMED_MEMBER_LABEL` is
exported from `src/lib/crdt/person.ts`, and E2E specs can already import from `@/`
(`helpers/invite.ts` and `helpers/realtime.ts` do). Importing the constant instead of repeating the
literal three times would make a rename a compile-time update rather than three silent E2E failures.
The existing `DEFAULT_PERSON_NAME` in `helpers/settlement.ts:14` is the established precedent. Not
required for PASS; the current form fails loudly and correctly.

I also endorse the implementer's `Q-P24-01` carry-forward. I re-measured its exposure (469/33) and
confirm the collision class is real and repo-wide.

---

## 5. Advisory findings — non-blocking

Both are recorded so root can decide; neither affects shipped behaviour on this tree and neither
warrants FAIL.

### A-1. `resolveMemberName` is optional, so the row avatar's guarantee is call-site convention rather than compile-enforced

**Severity: Medium (advisory). Category: Test gap / type modelling. File:
`src/components/features/transactions/TransactionRow.tsx:100`,
`src/components/features/transactions/TransactionTable.tsx:51`.**

`displayName` on `PresenceAvatar` is required, which is what makes the illegal state unrepresentable
_at the avatar_. But the prop that feeds it through the table is optional in both components, and
`TransactionRow.tsx:225` falls back with `?? { kind: "unnamed" }`. So if a future caller renders
`<TransactionTable>` without `resolveMemberName`, every row avatar silently becomes "Unnamed member"
for members who do have names. That is a degradation, not the reported defect — no hash is ever
shown — which is why this is advisory rather than blocking.

I did not report this from inspection alone. I built a throwaway `git archive` tree, deleted the
single plumbing line `TransactionTable.tsx:496`, and ran the checks:

```
tsc --noEmit                → exit 0, no errors
vitest run tests/unit/      → 89 files, 1810 passed, 0 failed
```

**The unplumbing is invisible to typecheck and to the entire unit suite.** The throwaway tree was
removed and the shared main checkout verified untouched and at its original HEAD.

The optionality is defensible: three existing test files render `<TransactionTable>` without the
prop, and requiring it would have forced churn there. But it means the row surface's correctness
rests on one call site, unguarded.

Two ways to close it, for root to weigh: make the prop required and update the three test call
sites; or add a unit test rendering `TransactionRow` with a `presence` prop and a
`resolveMemberName` stub, asserting the avatar's `aria-label` and the wrapper `title`. The second is
cheaper and also closes A-2.

### A-2. The row presence surface has no direct test coverage at all

**Severity: Medium (advisory). Category: Test gap. File:
`src/components/features/transactions/TransactionRow.tsx:224-238, 543-558`.**

This is the third render site — the one the implementer added to scope and correctly fixed, and the
only one whose base-tree tooltip demonstrably read "Editing: Member 3f2a9b1c". It is the _least_
tested of the three:

```
$ grep -rn 'resolveMemberName\|presenceLabel\|Editing:\|Viewing:' tests/
(no matches)
```

The new unit tests cover `PresenceAvatar` and `PresenceAvatarGroup` directly; the new E2E scopes
every locator to `page.locator("aside")`, so it exercises the sidebar group only. The row avatar and
its `title` are reached by neither. The pre-existing E2E `readRowPresenceEditing` helper asserts the
left-border indicator's `data-presence-editing`, not the avatar or the label.

Nothing here is wrong in shipped behaviour — I read the code closely and it is correct, and the
frozen requirement is met at this site. The gap is that a regression at the site with the worst
base-tree defect would be caught by no test. Together with A-1 this is the package's thinnest area.

Worth noting the row avatar's wrapper is `aria-hidden="true"` (`:547`), deliberately per its comment
so keyboard navigation never stops on it — which means an E2E `getByRole` cannot reach it. A unit
test on `TransactionRow`, or an E2E reading the wrapper `title` attribute directly, would be the
route.

---

## 6. Q-proposals for P21 carry-forward

**`Q-P24-01`** — already proposed by the implementer and, I am told, transcribed into root-owned
`QUESTIONS.md` at `76e7e3d`. I re-measured its exposure independently (469 name-carrying `getByRole`
calls in `tests/e2e/`, 33 with `exact`) and both figures are exact. I endorse it: the class is real,
it presents as a sporadic failure that mimics a timing flake, and no timeout change can fix it.

**Proposed `Q-P24-02` — a required prop on a leaf component does not make a state unrepresentable if
the prop feeding it is optional upstream.** Raised from A-1, generalised beyond P24. The pattern
"make the illegal state unrepresentable" is applied correctly at the leaf here, but an optional prop
one level up with a `?? fallback` reintroduces a silent-degradation path that typecheck and the unit
suite both miss — demonstrated empirically in A-1, not hypothesised. Suggested disposition: when a
requirement is enforced by making a leaf prop required, check the whole plumbing chain for
optionality with defaulting, and either make the chain required or add a test at the surface where
the default would apply. Not swept beyond P24 — flagging rather than widening this package.

---

## 7. Scope discipline

I wrote exactly one file, this review. I edited no product, test, ledger, marker, scratch, SCOPE,
spec or FINAL-AUDIT file. The mutation experiment in A-1 ran in a disposable `git archive` tree that
has been deleted; the shared main checkout was never mutated and was verified clean afterwards. The
manual browser session was closed, its data deleted and its artifacts removed.

---

## 8. Addendum — `b70280c`, and the three named `Q-P24-01` collisions

Added after root corrected its own dispatch, which listed four commits and omitted `b70280c`. The
verdict is unchanged: **PASS**.

### The correction did not affect this review

Root's correction is factually right, and I verified it rather than accepting it:
`git log --oneline a318b40..9e81a8d` returns exactly `b70280c` then `9e81a8d`, and
`git show --name-only b70280c` touches only `evidence/P24/implementation-01.md` — no product or test
file, so the campaign target is unaffected.

The hazard root flagged did not materialise: **I assessed the evidence at HEAD throughout**, which
is why section 2 criterion 13 confirms the verbatim strict-mode block, the `presentIdentities`
self-correction and the `Q-P24-01` draft as present, and why section 1 of this document already
names `b70280c` as in scope. Confirming the difference is real: `grep -c 'strict mode violation'` on
the evidence returns 0 at `a318b40` and 1 at HEAD; `Q-P24-01` likewise 0 then 1;
`'Observed, not inferred'` 1 then 2. Had I reviewed the `a318b40` version I would indeed have raised
three findings that are false at HEAD.

### Judgement 1: are the measured numbers accurate? **The two totals yes; the three named collisions, no.**

The headline figures reproduce exactly — 469 name-carrying `getByRole` calls in `tests/e2e/`, 33
with `exact`, 436 residual. Those are sound and I confirmed all three independently.

The three named collisions do **not** hold up. I checked each against the suite rather than
accepting the list, and all three fail to be live hazards, each for a different reason:

- **`"Add"` ⊂ `"Add owner"`/`"Add Person"`/`"Add Tag"` — already guarded.** Both `"Add"` locators in
  the suite (`helpers/settlement.ts:38`, `transactions.spec.ts:125`) already pass `exact: true`.
  This collision was closed before P24 began, so it cannot fire.
- **`"Coffee"` ⊂ `"Coffee Shop"` — different roles, different files.** `"Coffee"` is only ever a
  `getByRole("button")` and only in `field-rule-parity.spec.ts`, `automations.spec.ts` and
  `transaction-rules.spec.ts`. `"Coffee Shop"` appears as a `getByRole` name exactly once, as an
  `option`, in `description-aliases.spec.ts:233` — a file containing no `"Coffee"` locator at all.
  Playwright scopes name matching within a role, so a `button` locator cannot match an `option`. The
  `"Coffee"` locators are additionally scoped to `getByRole("group", {name: /tags to apply/i})`.
- **`"Status"` ⊂ `"Statuses"` — different roles.** `"Status"` is a `button`
  (`transactions.spec.ts:433`); `"Statuses"` is a `heading` with `level: 1` (`helpers/nav.ts:31`).
  Again unreachable across roles.

This does not damage `Q-P24-01`. The mechanism is real and P24 has a live demonstration of it — the
run-1 strict-mode violation, where two avatars shared the `img` role in one container. What is
overstated is the claim that these three are "real collisions already present in the suite ... each
a strict-mode violation waiting for both labels to be visible in the same container". They are
substring pairs found by text comparison, not collisions: the sweep that produced them compared name
strings without filtering by role, container, or file, and did not exclude names already carrying
`exact`. **A future sweep must filter on role and container, or it will generate mostly false
positives** — which is the more useful finding for whoever picks the sweep up, and I suggest root
attach it to `Q-P24-01` rather than open a new entry.

### Judgement 2: was declining the sweep the right scope call? **Yes — and my correction above strengthens that, rather than weakening it.**

I reached this independently and agree with root, for reasons root did not give.

The sweep belongs elsewhere. It spans 436 locators across the whole E2E suite, touches specs owned
by no package in this goal, and has nothing to do with presence avatars or UR-003. Doing it inside
P24 would have made the package's diff mostly unrelated test churn and buried the eight-file fix
under it. The repo rule "don't add features beyond what's needed for the current task"
(`.claude/rules/coding-style.md`) points the same way.

**It does not leave P24 under-covered.** Under-coverage would mean a collision the package's own
tests could still hit. P24's three name-carrying locators all pass `exact: true`, and I separately
checked every other `aria-label` in the `aside` container they are scoped to — only "Open menu" and
"Expand/Collapse sidebar", neither containing nor contained in the avatar labels. P24's own exposure
is closed. What remains open is the rest of the suite, which was equally open before this package
and which P24 did not worsen.

My correction sharpens this. Had the implementer swept on the basis of that unfiltered text
comparison, it would have added `exact: true` to locators that did not need it, in files it had no
business touching, on the strength of three findings that turn out not to be live — churn in the
name of a hazard that was not there. Declining the sweep avoided that. Flagging with measured
exposure and leaving disposition to root was the right call, and the fact that its own measurement
does not fully survive scrutiny is the strongest argument that it was.

# P27 implementation 01 — UR-006 vault members are listed by name

**Implementer:** `p27-implementer-01`.

**BASE:** `a0a3399c74ae9cfa03476415abc10e390262cbd4`, the dispatch's stated base. By the time my
worktree was created, `main` had advanced one docs-only commit to
`736c47167cc8883f2c5703ba4fdcdde483b732e5` ("docs: transcribe Q-P26-01 Q-P26-02 and Q-P26-F2
carry-forwards"). I confirmed `a0a3399` is an ancestor of `736c471` with
`git merge-base --is-ancestor`, and that `git diff --name-only a0a3399 736c471` touches exactly one
file, `specs/007-human-scratch-completion/QUESTIONS.md` — no product or test file. So the tree under
test is BASE plus a ledger edit, which the dispatch permits as "a later root ledger commit".

**Commit under review:** `8c5cda6` — `fix: list vault members by name rather than by pubkey hash`.

**Implementer worktree:** `/tmp/mf-e2e-p27` at `8c5cda6`. I did not touch `/tmp/mf-e2e-p22`,
`/tmp/mf-e2e-p22r3`, `/tmp/mf-e2e-p23`, `/tmp/mf-e2e-p24`, `/tmp/mf-e2e-p25` or `/tmp/mf-e2e-p26`.

---

## 1. The dispatch's claims, checked rather than trusted

The dispatch asked me to verify its groundwork and report anything that did not survive. **All three
substantive claims survive.** Two small corrections and one disproved carry-forward suggestion are
recorded below.

### The spec citation — **VERIFIED against `SCOPE.json`**

`specs/010-user-reported-refinements-2/spec.md` lines 26-38 are indeed UR-006: line 26 is the
`## UR-006 — Vault members are listed by name` heading and line 38 is the final bullet, the one
requiring the tooltip/accessible name to follow the same rule. I checked the freeze rather than only
the line numbers:

```
$ sha256sum specs/010-user-reported-refinements-2/spec.md
a137e38848db04c656169c97e4ff5b862feec6ca29d6e6069c81c2c279dc95c5
```

`SCOPE.json:49` records exactly that digest for `SRC-USER-REPORTED-REFINEMENTS-2`. The source is
unmodified and the citation is correct.

### Claim 1 — the shared helper exists and must be reused — **VERIFIED**

`resolveMemberDisplayName(people, pubkeyHash) -> MemberDisplayName` is at
`src/lib/crdt/person.ts:113` with the stated signature, and `MemberDisplayName` is the union at
`:42`. It scans `linkedUserId` and skips soft-deleted people (`:119-124`). The dispatch cited `:99`,
which was correct at BASE; my own edit added lines above it. I reused it and added no second
resolution path.

### Claim 2 — `usePeople()` is directly usable, no prop threading — **VERIFIED**

`usePeople()` is at `src/lib/crdt/context.tsx:701`, a `useVaultSelector` over `state.people`. The
settings page renders inside `VaultProvider`: `src/app/(app)/layout.tsx:96-101` nests
`ActiveVaultProvider > SyncStatusProvider > VaultProvider > VaultPresenceProvider > AppLayoutContent > {children}`,
and `src/app/(app)/settings/page.tsx:28` renders `<AccessMembersSection />` bare inside that tree.
Confirmed in the real browser too — the roster renders, which it could not if the provider were
absent (section 4).

### Claim 3 — two call sites, then the helper is dead — **VERIFIED**

`shortenPubkeyHash` had exactly the two stated call sites. Both are replaced and the helper is
deleted:

```
$ grep -rn "shortenPubkeyHash" src tests
(no matches)
```

### Correction 1 — `AccessMembersSection` does take a prop

The dispatch says it "takes NO props (`:40`)". It takes an optional `className`
(`AccessMembersSectionProps`, `:40-43`); what is true, and what the claim actually rests on, is that
it receives no `people`. The substance of the claim is unaffected — I mention it only because the
dispatch asked me to report claims that do not survive verbatim.

### Correction 2 — P24 review-01's advisory suggestion does not work

P24's review §4 suggested importing `UNNAMED_MEMBER_LABEL` from `src/lib/crdt/person.ts` into an E2E
spec instead of repeating the literal, citing `helpers/invite.ts` and `helpers/realtime.ts` as
precedent for `@/` imports in `tests/e2e/`. **I tried it and it fails.** Verbatim, from a real run:

```
Error: No "exports" main defined in /tmp/mf-e2e-p27/node_modules/temporal-polyfill/package.json
   at ../../src/types/index.ts:8
    at Object.<anonymous> (/tmp/mf-e2e-p27/src/lib/crdt/person.ts:19:1)
    at Object.<anonymous> (/tmp/mf-e2e-p27/tests/e2e/vault-settings.spec.ts:16:1)

Error: No tests found.
```

The chain is `person.ts:19` -> `defaults.ts:12` -> `@/types` -> `temporal-polyfill`, whose
`package.json:25-31` publishes only an `import` condition, so Playwright's loader cannot resolve it.
The cited precedents import from `@/lib/crypto/*`, which does not reach `temporal-polyfill`. The
failure mode is bad: the whole spec file is skipped with "No tests found" rather than failing an
assertion. I therefore repeated the literal, exactly as `presence.spec.ts` does, with a comment
recording why. **Observed, not inferred** — the error text above is quoted from a real run log.

---

## 2. What changed and why

### The join, in the component

`AccessMembersSection` now calls `usePeople()` and resolves each member through the shared helper.
The membership roster is server-authorized identity and the people map is encrypted vault state, so
the two come from different sources; `member.pubkeyHash` is the join key, matching what
`ensureMemberPerson` itself links on.

### One binding for the visible label and the accessible name

The frozen text requires "any tooltip or accessible name for the member follows the same rule as the
visible label". Rather than call the resolver twice, the component computes a single `memberLabel`
per row and uses it for both the visible span and the remove button's `aria-label`. The two cannot
diverge by construction — the same technique P24 used for `PresenceAvatar`'s `title`/`aria-label`.

### A new shared helper: `memberDisplayLabel`

`MemberDisplayName -> string` was being open-coded at each surface. It existed twice at BASE —
`PresenceAvatar.tsx:64` and `TransactionRow.tsx:235` — and UR-006 would have made it three. I
extracted `memberDisplayLabel` (`person.ts:59`) and routed all three through it.

This is the same reasoning that made P24 extract `resolveMemberDisplayName`: the surfaces must not
drift. Resolution was already shared; the _label_ was not, so a change to the unnamed wording would
previously have had to be made in three places. The extraction is small and in scope — it is the
mechanism by which UR-006's "same rule as the visible label" is guaranteed rather than merely
intended. `PresenceAvatar` and `TransactionRow` are behaviour-identical: both branches produce the
same strings they did before, which the pre-existing P24 tests pin (41 tests across `person.test.ts`
and `presence-avatar.test.tsx` pass unchanged).

### The unnamed case — decision and justification

**Chosen: `UNNAMED_MEMBER_LABEL`, i.e. "Unnamed member"**, for both the visible label and the
accessible name.

Judged against the frozen text at `spec.md:36-38`: "a clearly human-readable fallback is shown
rather than a bare hash" — "Unnamed member" is ordinary English naming exactly the situation, and
carries no hex. "Any tooltip or accessible name follows the same rule as the visible label" —
satisfied by construction, since one binding feeds both.

Consistency with P24 is the deciding argument: the same member is simultaneously visible as a
presence avatar labelled "Unnamed member" and as a roster row. Two different fallbacks for one
person on one screen would be a defect of its own. Rejected alternatives: `memberFallbackName`
("Member 3f2a9b1c") is disqualified outright — it embeds the hash, which is precisely what UR-006
forbids; "Unknown"/"Pending" imply an error or a state that does not exist, since an unnamed member
is a perfectly normal auto-created person.

Per the dispatch and P24's restraint, `memberFallbackName` itself is **unchanged**. It is still used
by `resolvePersonDisplayName` (`person.ts:95`), which the People page renders (`PersonRow.tsx:147`).
Changing it would alter an unrelated surface.

### The A-1 lesson, applied — and the result is different here

P24's A-1 finding: a required leaf prop does not make a state unrepresentable if an upstream prop is
optional with a `?? default`. The reviewer proved it by deleting a plumbing line and watching tsc
and 1810 unit tests stay green.

I checked the whole path rather than only the consuming component. **My design has no equivalent
silent-degradation route, and I verified that empirically rather than by inspection.** There is no
prop to omit: the data comes from a hook, and `usePeople` -> `useVaultSelector` ->
`useInternalVaultSelector` -> `useLoroContext`, which **throws** when no provider is above it
(`loro-mirror-react/dist/hooks.js:202-208`, the throw at `:205`). I rendered the component with the
real hook and no provider:

```
AssertionError: expected [Function] to not throw an error but
'Error: useLoroContext must be used within a LoroProvider' was thrown
```

**Observed, not inferred.** So the failure mode for an unplumbed data source is a loud throw at the
first render, not a roster silently showing "Unnamed member" for every named member. The probe test
was disposable and was deleted; the worktree digest returned to its baseline afterwards.

I record the limit honestly: this guarantees the _data source_ cannot go missing quietly. It does
not make a hash-shaped label unrepresentable in the type system — `memberDisplayLabel` returns a
plain `string`. What constrains that is that neither union branch can carry hash text (`named` holds
a person's own trimmed name, `unnamed` holds no payload), plus the structural tests in section 3.

---

## 3. Tests — and proof they catch the defect

A test that passes on the fixed tree proves nothing on its own. I ran every new test against the
**unmodified BASE component** and confirmed each fails.

### Unit — `tests/unit/components/access-members-section.test.tsx`, 6 new tests

Renders the real component with only the two data boundaries mocked (tRPC and `usePeople`). The
**real** `resolveMemberDisplayName` is under test — mocking the resolver would let the test pass
even if the component stopped joining at all. Fixtures are built by calling the production
`ensureMemberPerson`, following P24's pattern, so a regression in the owner-adoption path breaks
them.

Coverage: owner by name; a named invited member; the no-name fallback; a member with **no linked
person at all** (a membership row can exist before the member first opens the vault — the case with
the strongest pull towards rendering the hash); the remove control's accessible name; and a
structural test asserting that no rendered text and no `aria-label` anywhere contains any part of
either hash.

Against the BASE component, **all 6 fail**, and the failure output shows the reported defect
verbatim:

```
AssertionError: expected 'Access & MembersMembersRemoving a mem…' not to contain '3f2a9b1c'
Received: "...3f2a9b1c…5555(you)owner7e8d0a2b…9999memberPending Invites..."
```

**Observed, not inferred** — quoted from a real run.

### Unit — `tests/unit/crdt/person.test.ts`, 3 new tests

Cover `memberDisplayLabel` directly, including a fast-check property that for any people map and any
name, the label is non-empty and contains no part of the pubkeyHash. Existing tests unmodified — the
file gained 3 `it(` blocks with zero deletions.

### E2E — `tests/e2e/vault-settings.spec.ts`, 2 new tests

Added to the existing spec per the e2e skill's preference for extending over creating. Both drive
the real UI.

1. **"identifies members by name and never by a pubkey hash"** — asserts the owner's row leads with
   their name; that no roster text and no accessible name carries hash characters, including
   `not.toMatch(/[0-9a-f]{8}/i)` which fails on any 8-char hex run whatever the wording; and then
   **renames the person on the People page and requires the roster to follow**. That last step is
   the load-bearing one: it proves the label is genuinely resolved from the people map rather than a
   coincidental constant, and it is the assertion a future agent cannot satisfy by hardcoding.
2. **"shows a readable fallback for a member with no name, not a hash"** — two browser contexts, a
   real shared vault, and a second member who has never named themselves. Asserts the readable
   fallback, no hash characters, and that the remove control's accessible name follows the same rule
   (`exact: true`, per `Q-P24-01`).

Both **fail against the BASE component** and pass against the fix.

One locator correction worth recording, because it produced a real failure I had to diagnose: my
first attempt used `getByText("Me", {exact: true})`, which found nothing. The product was correct —
the accessibility snapshot read `listitem: Me(you) owner`. The name shares its span with the nested
`(you)` marker, so the element's own text is `Me(you)` and Testing-Library-style `exact` matches the
whole text. I switched to asserting the row's leading label with `/^Me\b/`. This is the mirror image
of `Q-P24-01`: Playwright's `getByRole` name matching is substring-based, while `getByText`'s
`exact` is whole-text — the two defaults differ, and both have now cost time in this goal.

---

## 4. The six checks — real output

Run in `/tmp/mf-e2e-p27`, my own worktree, and in the main checkout for the static checks. Never in
another agent's worktree.

| Check               | Command                          | Result                                           |
| ------------------- | -------------------------------- | ------------------------------------------------ |
| `pnpm typecheck`    | `tsc --noEmit`                   | **PASS**, exit 0, no output                      |
| `pnpm lint`         | `eslint`                         | **0 errors**, 1 pre-existing warning             |
| `pnpm format:check` | `oxfmt --check`                  | 17 pre-existing frozen `specs/**` files          |
| `pnpm test`         | `vitest run`                     | **117 files, 2195 passed** — 4/5 runs; see below |
| `pnpm build`        | `next build`                     | **PASS**, all routes emitted                     |
| `pnpm test:e2e`     | 3x `playwright test --retries=0` | **3/3 green, 170 passed each**                   |
| Manual browser      | `playwright-cli`                 | **PASS** — see section 5                         |

### `pnpm lint`

```
src/components/features/transactions/TransactionTable.tsx
  426:25  warning  Compilation Skipped: Use of incompatible library
✖ 1 problem (0 errors, 1 warning)
```

The single warning is on `useVirtualizer` at `TransactionTable.tsx:426`. My diff does not touch that
file at all, so it is pre-existing — the same warning P24's reviewer verified.

### `pnpm format:check` — count verified as still exactly 17, none a P27 file

The 17 are `DECISIONS.md`, `DEPENDENCIES.md`, `HANDOFF.md`, `PROGRESS.md`, `QUESTIONS.md`,
`RISKS.md`, `SCOPE.json`, `evidence/P12/implementation-0{3,4,5,6}.md`,
`evidence/P14/implementation-01.md`, `evidence/P16D/implementation-01.md`,
`evidence/P19/implementation-01.md`, `reviews/P12-review-0{5,6}.md`, and `specs/human-scratch.md`.
Every one is a pre-existing frozen `specs/**` file. **Zero are P27 files**, and no `src/**` or
`tests/**` file appears. I formatted only my own seven files with an explicit `oxfmt` pathspec
rather than running bare `pnpm format`, which would reflow the frozen specs.

### `pnpm test`

```
 Test Files  117 passed (117)
      Tests  2195 passed | 2 skipped (2197)
```

`.env.local` was copied into the worktree at creation, so the two `realtime-*.test.ts` integration
tests had their configuration and did not produce the ENOENT that bit P24's reviewer.

**One red run I could not attribute, recorded rather than omitted.** Of five full-suite `pnpm test`
runs at HEAD, four were green at 2195/0 and **one reported `1 failed | 2194 passed`**. I did not
capture the failing test's name — I had piped that run's output through `grep` for the summary lines
and the failure detail was discarded. That was my mistake and I record it rather than quietly
reporting only the green runs.

I then tried to reproduce it rather than assume the known condition explained it:

- `duplicates.test.ts` alone: **43 passed**, clean.
- Full suite with a concurrent `pnpm lint`: **2195 passed**.
- Full suite with a concurrent `pnpm build` **and** `pnpm lint`: **2195 passed**.

So it did not reproduce in three deliberate attempts, including under heavier contention than the
run that failed. The dispatch's known condition — `tests/unit/import/duplicates.test.ts:749` asserts
a wall-clock **ratio** and is load-sensitive — is the most probable explanation, and the failing run
was concurrent with other work on this host. **But I want to be explicit that this is an inference,
not an observation:** I did not see the failing test's name, so I cannot state that it was
`duplicates.test.ts`, and a reviewer should treat the attribution as unconfirmed. What I can state
as observed is that four subsequent full-suite runs at this exact tree are green at 2195/0, that the
suspected test passes in isolation, and that no test in my diff's area failed on any run. A reviewer
running their own campaign should watch for a recurrence and capture the name if it appears.

### E2E campaign — 3 consecutive full-suite runs, one tree

`env -u CI pnpm exec playwright test --retries=0`, full suite, in `/tmp/mf-e2e-p27`. `CI` was never
set for a Playwright run — `playwright.config.ts:56,60` would give 1 worker and 2 retries under CI,
inverting the required profile. `CI=true` was used only for `pnpm install`. Playwright was never run
with `--debug`, `--ui`, `--headed` or `show`. The human's dev server on `:3001` (PIDs 818156/818182)
was never killed; I only read from it.

Before starting I confirmed `:3000` was unbound by reading `/proc/<pid>/cmdline` for every candidate
process rather than using `pgrep -f`, which would match the checking command itself. The only Next
server was the human's on `:3001`.

| Run | Digest before run                  | Result                | Exit |
| --- | ---------------------------------- | --------------------- | ---- |
| 1   | `f73143fa6575de21b3c4c8088fddecd8` | **170 passed** (4.1m) | 0    |
| 2   | `f73143fa6575de21b3c4c8088fddecd8` | **170 passed** (4.0m) | 0    |
| 3   | `f73143fa6575de21b3c4c8088fddecd8` | **170 passed** (4.1m) | 0    |

```
PRE-CAMPAIGN DIGEST: f73143fa6575de21b3c4c8088fddecd8
PRE-CAMPAIGN HEAD:   8c5cda6cc11845eba729830f5dfd9cd7fdeca230
PRE-CAMPAIGN STATUS: []
POST-CAMPAIGN DIGEST: f73143fa6575de21b3c4c8088fddecd8
POST-CAMPAIGN STATUS: [ M next-env.d.ts]
```

Digest verified before run 1 and again after run 3, unchanged throughout, so all three runs covered
one tree. **3/3 consecutive green, zero failures, zero flakes.** No restart was needed — there was
no tree drift and no discarded campaign. The digest excludes `next-env.d.ts` per the dispatch, since
`next dev` rewrites it on every start; it is the only `POST-CAMPAIGN STATUS` entry. The port was
released immediately after run 3.

**The test count matches the dispatch's prediction exactly.** `playwright test --list` returns
`Total: 168 tests in 22 files` at `736c471` and `Total: 170 tests in 22 files` at `8c5cda6` — BASE's
168 plus my 2 new tests, in the same 22 files since I extended an existing spec.

---

## 5. Manual feature testing — real browser, real app

Per the e2e skill I used the repository-installed `playwright-cli` with a unique non-persistent
session `p27impl1`, not Playwright MCP, `npx`, an ad-hoc script or a temporary test file. I read
from the human's dev server on `:3001`, which serves the main checkout and therefore my committed
change; I did not start or kill any server.

Created a fresh identity and vault through the real UI, then read the accessibility tree at
`/settings`:

```
- heading "Members" [level=3]
- list:
  - listitem:
    - generic: Me(you)
    - generic: owner
```

**The reported defect is fixed in the running application.** The row the principal saw as a
truncated hash now reads "Me". Then renamed the person "Me" -> "Ben Tefay" on the People page and
returned to settings:

```
- listitem:
  - generic: Ben Tefay(you)
  - generic: owner
```

The roster followed the rename, confirming in the product — not merely in a test — that the label is
genuinely resolved from the people map. The sidebar presence avatar showed `img "Me": M` with
tooltip `Me (online)` on the same tree, so the two surfaces agree, which is the whole point of the
shared helper.

`console error`: **0 errors** of 5 messages. `requests`: no failed request. Session closed,
`delete-data` run, `.playwright-cli/` artifacts removed, working tree verified clean afterwards.

I did not reveal the generated recovery phrase at any point — the "Click to reveal" control was left
untouched and I checked the confirmation box without displaying the phrase.

---

## 6. Type safety, scope and secret-safety

**Type safety.** No `as`, `any` or `!` anywhere in the added product code. `memberDisplayLabel`
discriminates on `kind` with no cast. Verified: `grep -nE '\bas\b|\bany\b|!\.' ` over the diff's
product hunks returns nothing but prose in comments.

**Scope.** Product and tests only, plus this evidence file. I edited no ledger, marker, scratch,
SCOPE, spec, FINAL-AUDIT or review file, and never `playwright.config.ts` or `next.config.ts`. The
A-1 probe test was disposable and deleted, and the worktree digest returned to its pre-probe
baseline. I did not sweep `Q-P24-01`'s residual `exact: true` locators — out of scope for this
package, and P24's reviewer showed the unfiltered sweep list was mostly false positives.

The diff touches four product files. Two of them — `PresenceAvatar.tsx` and `TransactionRow.tsx` —
are UR-003 surfaces, not UR-006 ones. I flag that explicitly rather than letting a reviewer discover
it: they change only by routing an open-coded ternary through the new shared helper, with identical
behaviour, because leaving them open-coded would have meant three copies of the same rule and would
have defeated the anti-drift purpose the extraction exists for. If a reviewer judges this
out-of-scope, reverting those two hunks would restore the duplication without affecting UR-006's
observable behaviour.

**Secret-safety — BLOCKING criterion, cleared.** No key material, seed phrase, recovery material,
`SUPABASE_JWT_SECRET` value, presence key, invite fragment or vault plaintext appears in any changed
file or in this document. Unit fixtures are synthetic (`"3f2a9b1c4d".padEnd(64, "5")`); the E2E
reads hashes from its own fixture rather than hardcoding them. A pubkeyHash is public material, so
UR-006 is a presentation defect and not a disclosure — I verified that framing against the frozen
text rather than assuming it, and the fix reduces exposure regardless.

---

## 7. Proposed carry-forward

**`Q-P27-01` — E2E specs cannot import from `@/lib/crdt/*`, and the failure is silent.** Raised from
correction 2. P24 review-01 §4 recommended importing `UNNAMED_MEMBER_LABEL` into an E2E spec; doing
so makes Playwright fail to resolve `temporal-polyfill` and report **"No tests found"**, skipping
the entire spec file rather than failing an assertion. On a suite run this presents as a silently
reduced test count, not a red run — the most dangerous possible failure mode for a verification
campaign, and one that a per-run "N passed" check catches only if someone is watching the absolute
number.

Suggested disposition: record that `tests/e2e/**` may import from `@/lib/crypto/*` but not from
modules reaching `@/types` (hence not `@/lib/crdt/*`), and prefer a repeated literal with a comment.
Worth pairing with the existing digest/count discipline, since "168 vs 170" is exactly the signal
that would expose it. Not swept beyond P27 — flagging rather than widening this package.

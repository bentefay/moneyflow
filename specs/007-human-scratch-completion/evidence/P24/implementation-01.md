# P24 revision 01 — implementation-01 (UR-003 presence avatars show member name initials)

**Implementer:** `p24-implementer-01` (fresh context) · **Base HEAD at start:**
`c7547fb5d49fa97dc9f74cde380d9abf2d8235e3` (root ledger dispatch commit) · **Commits:** `befe694`
(product + tests), `162d75a` (comment marking the reproduced "AD" assertion deliberate), `629352f`
(E2E locator exactness fix) · **Final tree:** `629352f`, digest `65cd36733093dabe5559e02907ff70e5`

## Scope / charter

Frozen `UR-003` (`specs/009-user-reported-refinements/spec.md` lines 55-74). The reported defect: a
pink circle labelled "AD" next to "Saved", tooltip showing a long id — the first two hex characters
of the principal's own pubkey hash, not their name.

No ledger, marker, scratch, `SCOPE.json`, frozen spec, `FINAL-AUDIT.md` or `reviews/**` file was
written. Every fixture is a synthetic hash; a pubkey hash is public material in any case, and no
key, seed phrase, recovery material, presence key, invite fragment or vault plaintext appears in
anything I touched.

## Verifying the dispatch's read before acting on it

The dispatch asked me to verify each of root's findings rather than trust them. **All four held
exactly as stated**, read directly from the base tree:

| Claim from dispatch                                                           | Verified at              | Result    |
| ----------------------------------------------------------------------------- | ------------------------ | --------- |
| `DEFAULT_PERSON` seeded with a real `name: "Me"`                              | `defaults.ts:52,61-62`   | Confirmed |
| `ensureMemberPerson` resolves in 3 steps; adoption keeps "Me"; step 3 unnamed | `person.ts:76-112`       | Confirmed |
| Two paths: owner adopts a named person, invitees start unnamed                | same                     | Confirmed |
| `memberFallbackName` has a second caller building the row presence label      | `TransactionRow.tsx:222` | Confirmed |

Two things the dispatch left open, which I resolved empirically and which changed the design:

**1. A direct lookup by `deriveMemberPersonId` would have been WRONG, and taking the suggestion at
face value would have shipped the principal's own defect.** The dispatch asked me to "check whether
a direct lookup is more appropriate than scanning `people`". It is not. The vault owner adopts the
seeded default person, so their person is keyed `person-default-me` — **not**
`person-member-<hash>`. A derived-id lookup resolves invited members and silently misses the owner,
which is precisely the reported case.

This is the sharpest illustration in the package of why verify-not-trust applies to the orientation
itself: such a fix would have passed every invited-member test, looked correct in review, and still
shown the principal "AD". I scan on `linkedUserId`, matching what `ensureMemberPerson` itself does
at `person.ts:84-88`. A dedicated test encodes the rejected design as an executable constraint — it
asserts `draft.people[deriveMemberPersonId(OWNER_HASH)]` is `undefined` while the owner still
resolves, so a future agent "optimizing" the scan into the direct lookup fails immediately rather
than silently reintroducing the defect.

**2. There is a THIRD presence avatar render site the dispatch does not enumerate.** Beyond
`layout.tsx:218-224` and `:343`, `TransactionRow.tsx:539` renders `<PresenceAvatar>` directly. Its
wrapper `title` was built by mapping `memberFallbackName` over presence hashes, so that surface
rendered **both** hash-derived initials **and** a `"Editing: Member 3f2a9b1c"` tooltip. The frozen
text requires the name at "every place presence avatars are rendered", so I fixed all three and
raised the scope divergence to root rather than deciding it silently.

## The change

**1. `src/lib/crdt/person.ts` — the ONE shared helper** required by both UR-003 and UR-006/P27:

```ts
export type MemberDisplayName =
    | { readonly kind: "named"; readonly name: string }
    | { readonly kind: "unnamed" };

export function resolveMemberDisplayName(
    people: Readonly<Record<string, LinkedPerson | undefined>>,
    pubkeyHash: string
): MemberDisplayName;
```

A discriminated union rather than a string, because the two cases must be **presented** differently:
a resolved name becomes initials, an unresolved one has no name to take initials from. Collapsing
them to a string is what let the hash leak into the UI in the first place.

To avoid a second resolution path I extracted the "does this person have a usable name" rung into a
private `personOwnName` and rebuilt the existing `resolvePersonDisplayName` on top of it.
**Behaviour is byte-identical** — its 4 pre-existing tests pass unmodified and all 10 caller files
are untouched. `memberFallbackName` itself is **not** changed, so its second caller is not silently
altered.

**2. `PresenceAvatar` — the fallback is removed, not merely bypassed.** The old `name?: string` prop
with `const displayName = name || userId` is gone, replaced by a **required**
`displayName: MemberDisplayName`. A caller can no longer omit the name and silently fall through to
hash characters; omitting it is now a compile error. This is what stops the defect regressing at a
future fourth render site, and it is why I changed the prop contract rather than just passing a name
at the three current sites.

**3. All three render sites plumbed.** `layout.tsx` resolves once into a memoized `presentUsers`
shared by the mobile and sidebar groups. `TransactionRow` takes a `resolveMemberName` function prop
threaded from `transactions/page.tsx` (which already held `usePeople()`) through `TransactionTable`,
keeping the row presentational per its own comment at `TransactionRow.tsx:134-136`.

## The unnamed-member decision, and why

The dispatch required a justified decision and ruled out silently inheriting "M3".

**Chosen: a person icon; `aria-label` and tooltip both "Unnamed member".**

- Rejected **"M3"** (initials of `"Member 3f2a9b1c"`): its second character is hash text. It is not
  a name-derived initial in any meaningful sense and is no better than the reported "AD".
- Rejected **"Member 3f2a9b1c"** as the tooltip: it embeds 8 hash characters, and the frozen text
  says the tooltip shows the display name, "not a key hash".
- Rejected a bare **"M"**: it would be indistinguishable from a real member named "Me" or "Mary".

**`memberFallbackName` was deliberately NOT changed, and a reviewer should read that as restraint
rather than oversight.** It has a second caller at `TransactionRow.tsx:222` that builds the row's
presence LABEL. Changing the shared fallback to satisfy the avatar would have silently altered that
second surface. So the row's avatar and its tooltip now resolve real names, while
`memberFallbackName` itself and every other consumer of it are untouched.

Colour continues to derive from `hashToColor(userId)`, never the name. Two tests pin this: colour is
unchanged across a rename, and two unnamed members get different colours — so the icon fallback does
not make collaborators visually identical.

## Requirement-to-test mapping

Each frozen behaviour and the test that covers it. **Path exercised is stated per test**, as
required.

| Frozen behaviour (spec.md:66-74)                | Covering test                                                               | Path        |
| ----------------------------------------------- | --------------------------------------------------------------------------- | ----------- |
| Name supplied to every avatar, every site       | E2E `presence avatars are labelled by name...`; group tests                 | both        |
| "Me" yields "M"                                 | `shows initials of the OWNER's name, not their pubkeyHash`                  | **owner**   |
| "Ben Tefay" yields "BT"                         | `shows both initials of a two-word name`                                    | **owner**   |
| Tooltip shows the name, not a key hash          | `tooltip carries the resolved name...`, `tooltip of an unnamed member...`   | both        |
| Hash initials only as last-resort fallback      | `never renders any part of the pubkeyHash`, `still has a hash branch...`    | both        |
| Colour from the stable identifier, not the name | `keeps colour keyed on the userId`, `gives two unnamed members distinct...` | both        |
| Unnamed invited member is not hash-derived      | `shows no initials at all for an INVITED MEMBER who has no name yet`        | **invited** |

The owner and invited fixtures are built by calling the **real** `ensureMemberPerson` — with
`adoptDefaultPerson: true` and without — rather than hand-writing person records, so the tests track
how members are actually linked rather than how I assume they are.

**Observed, not inferred:** `getInitials("ad3f2a9b1c…")` returns `"AD"` — the principal's reported
string, reproduced exactly. That assertion is kept live in
`tests/unit/components/presence-avatar.test.tsx` to document that the hash branch still exists for
other callers, while the avatar tests prove the avatar can no longer reach it. The dispatch ruled
out changing `getInitials`, so the branch stands.

## Tests added

- `tests/unit/crdt/person.test.ts` — 14 new (26 total in file). Owner path, invited path, the
  derived-id trap, soft-delete skipping, trimming, empty inputs, and a fast-check property that a
  resolved name is never the hash nor contains it.
- `tests/unit/components/presence-avatar.test.tsx` — 12 new, at the render boundary.
- `tests/e2e/presence.spec.ts` — 1 new test, two real identities against the real presence channel,
  asserting the owner's avatar reads "M", the invited member's renders an icon, and that no avatar's
  text, `aria-label` or tooltip contains hash characters.

No existing test was weakened or deleted.

## Verification

Run on the committed tree (`befe694`).

| Check               | Result                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS                                                                          |
| `pnpm lint`         | exit 0 — one pre-existing `useVirtualizer` warning on a line I did not touch  |
| `pnpm format:check` | Fails on exactly the 17 known frozen `specs/**` files; **zero** src/tests     |
| `pnpm test`         | 115 files, **2140 passed**, 2 skipped, 0 failed (`duplicates.test.ts` passed) |
| `pnpm build`        | PASS                                                                          |
| `pnpm test:e2e`     | See below                                                                     |

I formatted only my own files via a scoped `oxfmt` invocation; the bare `pnpm format` was never run,
so no frozen spec was reflowed.

### E2E campaign

Worktree `/tmp/mf-e2e-p24`, `env -u CI pnpm exec playwright test --retries=0`, full suite, never
`CI=true`. Root raised the bar from 3 to **5** consecutive runs because the scope grew by a render
site and a prop-contract change.

**A discarded first campaign, reported in full rather than omitted.** An initial run on `162d75a`
(digest `79224b93…`) gave **166 passed, 1 failed**. The failure was a defect in MY TEST, not in the
product: Playwright's `getByRole` name matching is SUBSTRING-based, and "Me" matches inside
"Unna**me**d member", so the locator resolved to two elements and raised a strict-mode violation.

That failure output is itself evidence the product is correct — it printed both matched elements,
`aria-label="Me"` rendering text `M`, and `aria-label="Unnamed member"` rendering none. Exactly the
designed behaviour on both paths.

Two things worth recording from it:

- The unit tests could not have caught this. Testing Library's `getByRole` name option matches
  **exactly** by default; Playwright's matches as a **substring**. The same assertion is correct in
  one harness and ambiguous in the other.
- While fixing it I disproved one of my OWN assumptions. `presentIdentities`
  (`src/hooks/use-vault-presence.ts:129-135`) puts **self first**, so each shell renders the
  viewer's own avatar beside their peer's. I had drafted an assertion that the member's sidebar
  holds zero "Unnamed member" avatars; that is false, since the member sees their own. I read the
  hook before committing and asserted `toHaveCount(1)`, which is a stronger check — it proves the
  named and unnamed cases render distinguishably side by side in one group.

Fixed in `629352f`, test-only (`git diff 162d75a..629352f --stat` touches
`tests/e2e/presence.spec.ts` alone). Per the tree-drift discipline the campaign **restarted from run
1**; the run above is discarded and not counted.

| Run | Tree      | Digest before run                  | Result                |
| --- | --------- | ---------------------------------- | --------------------- |
| 1   | `629352f` | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (4.0m) |
| 2   | `629352f` | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (3.9m) |
| 3   | `629352f` | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (3.9m) |
| 4   | `629352f` | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (3.9m) |
| 5   | `629352f` | `65cd36733093dabe5559e02907ff70e5` | **167 passed** (3.9m) |

**5 consecutive green full-suite runs, zero failures, zero flakes.** The digest was verified before
run 1 and again after run 5 — `65cd36733093dabe5559e02907ff70e5` throughout, so all five runs
covered the same tree. Suite count 166 -> 167 with the one added test. The port was released
immediately after run 5 and before this section was written.

The five non-E2E checks were re-run on the final tree `629352f`: typecheck PASS, lint exit 0,
`format:check` clean for `src/**` and `tests/**`, `pnpm test` 2140 passed / 0 failed, build PASS.

## Hard rules

No `as`, `any` or `!` in the product code — verified by scanning every added product line. Immutable
data and pure functions throughout: `resolveMemberDisplayName` is pure, and the resolution in
`layout.tsx` and `transactions/page.tsx` is memoized derivation, not mutation. Commit message
carries no parentheses and no AI attribution. Playwright was never run with `--debug`, `--ui`,
`--headed` or `show`.

## For P27 / UR-006

`resolveMemberDisplayName` is the shared helper the two requirements were told to share. **P24
landed first and created it; P27 reuses it and needs no new lookup.** For the members list at
`AccessMembersSection.tsx:130` and the `aria-label` at `:152`, call it with the vault's people map
and the member's `pubkeyHash`, and render `UNNAMED_MEMBER_LABEL` for the `unnamed` case so both
surfaces agree. **P27 must reuse this helper rather than add a second resolution path** — two
independent implementations are exactly what the shared-helper instruction exists to prevent, and
they would drift the moment either surface's fallback changed.

Note P27 will need a people map in that component, which currently has none — `AccessMembersSection`
reads membership from tRPC only, so it will have to pull the vault people in (`usePeople()`) the way
`layout.tsx` and `transactions/page.tsx` now do. That is the one piece of work P24 could not do for
it.

Also inherited: `shortenPubkeyHash` at `AccessMembersSection.tsx:28-29` becomes dead once `:130` and
the `aria-label` at `:152` stop using it. P27 should check for remaining callers and remove it if
none, rather than leaving a hash-formatting helper available for reuse.

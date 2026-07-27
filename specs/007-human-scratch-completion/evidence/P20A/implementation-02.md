# P20A — HS-016 — implementation evidence 02 (revision 02: B1 fix)

**Agent:** `p20a-implementer-01` · **Base:** `e5dc9f21787cd5688db56dce8899a1d0c03f322e`

Revision 01 failed independent review with one blocking finding. This revision fixes exactly that
finding and nothing else. See `implementation-01.md` for the full claim-to-evidence table, which is
unchanged apart from the one row corrected below.

---

## B1 — false re-key claim (FIXED)

**Finding.** `src/components/features/landing/SecuritySection.tsx:35` ended the "Shared without
sharing keys" card with _"Remove a member and the vault is re-keyed."_ That promises a security
property the product does not deliver.

**Independently confirmed before changing anything.** The re-key primitives exist but have no caller
on any path a user can trigger:

- `grep -rn "rekeyVault\|performCompleteRekey\|rekey" src --include="*.ts" --include="*.tsx"`
  returns only: barrel re-exports in `src/lib/crypto/index.ts:80,84-85`; the server procedure
  `src/server/routers/membership.ts:178` (`rekey`) and its RPC at `:203`; a comment at `:12`; and a
  generated type in `src/lib/supabase/database.types.ts:533`. **No client code calls
  `membership.rekey`, and nothing calls `rekeyVault` or `performCompleteRekey`.**
- Member removal therefore does not rotate the vault key.
- The app's own settings UI already discloses this. `AccessMembersSection.tsx:106-109`: _"Removing a
  member revokes their access to future changes immediately. The vault key is not rotated, so
  anything they already downloaded stays readable to them."_

So the landing page was promising the opposite of what the product tells users in-app.

**Corrected copy** (third sentence replaced; first two sentences kept verbatim):

> Inviting someone wraps the vault key to their key. The invite secret stays in the link fragment
> and never reaches the server. Removing a member cuts off their access to future changes; the vault
> key is not rotated, so anything they already downloaded stays readable to them.

This now matches the in-app disclosure rather than contradicting it. No new claim was invented — the
wording is the settings page's own, adapted only in tense.

**Correction to the rev-01 claim table.** The row reading "Invites; re-key on removal" was wrong in
its second half. It should read: _invites and member removal are shipped; key rotation on removal is
NOT, and the copy now says so._ The invite half of that row stands: `src/server/routers/invite.ts`,
`InviteLinkGenerator`, `AccessMembersSection`, `src/app/(onboarding)/invite/[token]/page.tsx`.

**Root cause, for the record.** In revision 01 I accepted the existence of `src/lib/crypto/rekey.ts`
as evidence that re-keying shipped, without checking for a call path. File existence is not evidence
of a usable capability — the same standard I applied to budgeting and charts should have been
applied here. The reviewer was right to block it.

---

## Scope of this revision

Exactly one line changed: the `description` string of the fourth entry in `securityFeatures` in
`src/components/features/landing/SecuritySection.tsx`. No other landing copy, no test, no other
file. No test asserted that card's prose (verified by grepping the landing specs for
`re-key|rekey|rotated`), so the truthfulness guards remain intact and unweakened.

Boundaries re-verified at this revision's HEAD:

- FS-001 `src/lib/domain/settlement.ts` blob = `010f3c93582a2ce311594d4dde8464760ca49c43`
  (unchanged)
- nothing under `src/lib/**`, `src/server/**`, `supabase/**` or `src/app/(app)/**` touched
- no new `as` / `any` / non-null `!`
- no secret material in copy, code, tests or evidence

## Gate results (revision 02, real counts)

| Gate                | Result                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS — `tsc --noEmit`, 0 errors                                                                                                                   |
| `pnpm lint`         | PASS — 10 problems, **0 errors**, 10 warnings (all pre-existing, none in P20A files)                                                              |
| `pnpm format:check` | 14 files fail, all pre-existing root-owned `specs/**` markdown. All P20A `.ts`/`.tsx` pass oxfmt (verified separately). Non-blocking per HANDOFF. |
| `pnpm test`         | PASS — 100 files, **1939 passed**, 2 skipped (1941)                                                                                               |
| `pnpm test:e2e`     | PASS — **163 passed**, 0 failed (4.2m)                                                                                                            |

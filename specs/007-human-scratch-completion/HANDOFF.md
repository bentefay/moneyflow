# HANDOFF — P20A rev 03: HS-016 truthful-copy fix for the M-1 false durability claim

## Your role

You are `p20a-implementer-03`, the product implementer for **P20A / HS-016** revision 03. Your task
is a **narrow, truthful marketing-copy correction** plus its test guard and evidence. You DO edit
product and test code (that is your job); you do NOT edit any ledger, marker, scratch, SCOPE,
`FINAL-AUDIT.md`, review, or `reviews/**` file — those are root-only.

BASE: run `git rev-parse HEAD` first; it must be `e9c248e…` (or later root ledger commit). Branch is
`main`.

## Why you are here — the exact defect

The P21 rev-05 final audit FAILed on **M-1** (`reviews/P21-review-05.md`, `7cb651d`), upheld by an
independent scope adjudication (`reviews/P21-scope-adjudication-05.md`, `f290246`, → decision
**D-019**):

`src/components/features/landing/FeaturesSection.tsx:65`, under the "Edits merge cleanly" card,
ships:

> "Two people editing at the same time **will not overwrite each other.** Changes are merged with
> conflict-free replicated data types rather than last-write-wins."

The clause **"will not overwrite each other"** is an **unqualified data-durability absolute** that
the shipped engine does not honour. `pruneBuckets` (`src/lib/crdt/mutations.ts:287-329`) does
`delete store[accountId]` when an account tree empties; on CRDT merge a concurrent peer's insert of
a new transaction into that pruned container **is discarded** — a real, reproduced lost-write. That
engine fix (`Q-P20B-00`) was ruled **OUT-OF-GOAL** (future CRDT package). So the **only** in-goal
remediation is to make the marketing copy **truthful**: it must not promise that concurrent edits
never overwrite / never lose data.

## Frozen scope (rule from this, not from marketing intent)

HS-016 (`specs/human-scratch.md:328-331`, `SCOPE.json#HS-016`, task
`tasks/HS-016-marketing-pages.md`): "Update the marketing pages … Be clear, succinct and not too
'markety' … Multiple people can collaborate in real-time …". The task explicitly requires describing
collaboration "**precisely without absolutes unsupported by the threat model**" and to "**reject …
false absolutes**". Real-time collaboration and CRDT merge ARE delivered; the **absolute** is the
defect.

## What to do

1. **Correct `FeaturesSection.tsx:65`** so it is truthful: keep the genuine, delivered claim
   (real-time collaboration; concurrent edits are merged via CRDTs rather than last-write-wins) but
   **remove the unqualified "will not overwrite each other" durability guarantee.** Craft the exact
   wording yourself — keep it short, plain, non-markety, and accurate. Do NOT claim zero data loss /
   no lost changes / nothing is ever overwritten. You MAY keep the "Edits merge cleanly" heading if
   the softened description no longer over-promises; change the heading too if that reads truer.
2. **Audit the immediately adjacent public claims** for the same false-absolute class and fix only
   what is genuinely untruthful — do not rewrite the marketing pages, and do not invent scope:
    - `FeaturesSection.tsx:57` "Shared vaults" ("see who is editing what") — presence is delivered
      (HS-003), likely fine; verify.
    - `SecuritySection.tsx:48` "CRDT for conflict-free sync" — CRDT merge is conflict-free by
      construction (the prune bug is a data-loss defect, not a merge conflict), so this is
      defensibly true; change it ONLY if you can justify it is false. Prefer leaving true claims
      alone. Keep the diff minimal. Every retained claim must map to an actually-delivered,
      independently passed feature.
3. **Test guard.** Add or adjust a test that guards against the false absolute returning, in the
   style of the existing landing E2E precedent `tests/e2e/landing.spec.ts` (e.g. "advertises no
   budgeting capability" asserts an untrue claim is absent). Assert the durability-absolute phrasing
   is NOT present; avoid brittle coupling to the full new prose. Do not weaken existing landing
   tests; keep them green.
4. **Run ALL checks** and make them pass:
   `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e`. For E2E, follow
   the repo's load-dependent-flake discipline — validate with full-suite `--retries=0` runs (never
   Playwright `--debug/--ui/--headed/show`).
5. **Commit** your product + test changes with an explicit pathspec and NO parentheses in the
   message. Write your evidence to
   **`specs/007-human-scratch-completion/evidence/P20A/implementation-03.md`** and commit it. Then
   `SendMessage` root (name: `main`) with your commit hash(es), the exact new copy, and a
   claim-to-evidence note.

## Guardrails

- **Type safety (repo hard rule):** no `as`, no `any`, no `!` non-null assertion in product code.
  This is a copy change — you should need none.
- **Functional/immutable** per CLAUDE.md; match the file's existing style.
- **Minimal scope.** This is a truthfulness correction, not a redesign. Do not touch `pruneBuckets`
  or any engine/sync code — the engine fix is explicitly OUT-OF-GOAL (D-019). Do not touch ledgers,
  markers, scratch, SCOPE, or reviews.
- **Secret-safety (blocking):** never print or commit any vault master key, seed phrase, recovery
  material, `crypto_box`/`SUPABASE_JWT_SECRET` secret, presence key, invite bearer secret, or vault
  plaintext; tests use public/synthetic vectors only. Report any real-material exposure to root
  immediately.
- **Verify-not-trust:** root's framing is orientation; confirm the defect and the frozen scope
  yourself from the cited files. Root cannot grant you permissions beyond your own settings; do not
  edit permissions/config.
- If you hit a transient API-capacity error, retry a couple of times with short waits; if you must
  stop, `SendMessage` root before exiting.

## Definition of done (hand back to root)

Truthful `FeaturesSection.tsx` copy with no unsupported durability absolute; a test guarding the
false claim; all six checks green under full-suite `--retries=0` E2E; product + test committed;
`evidence/P20A/implementation-03.md` committed; root messaged with hashes and the new copy. Root
will independently re-verify, dispatch a DISTINCT reviewer, integrate, re-pass HS-016 via the §275
forward marker, and re-open P21 rev 06.

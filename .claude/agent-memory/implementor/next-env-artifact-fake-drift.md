---
name: next-env-artifact-fake-drift
description:
    next-env.d.ts flips on every `next dev` start, so a whole-diff md5 digest shows tree drift
    between E2E campaign runs even when no source changed.
metadata:
    type: project
---

When computing the per-run md5 digest for a repeated-run E2E validation campaign, exclude
`next-env.d.ts`: `git diff <base>..HEAD -- . ':!next-env.d.ts' | md5sum`. Playwright's `webServer`
runs `pnpm dev`, and Next rewrites that file's import between `./.next/types/routes.d.ts` and
`./.next/dev/types/routes.d.ts` on start, so a bare `git diff | md5sum` changes between run 1 and
run 2 by construction.

**Why:** On P25 this produced an apparent tree drift (`b1086650…` -> `b6fabd0b…`) between two
otherwise-identical passing runs. Campaign discipline says drift invalidates the campaign and forces
a restart from run 1, so a digest that includes this artifact will make every multi-run campaign
look drifted and unreportable.

**How to apply:** Scope the digest to source before starting, and `git checkout next-env.d.ts` after
each run to keep the tree clean. Also note `.env.local` is gitignored, so a fresh worktree lacks it
and two `tests/integration/realtime-*.test.ts` files fail with ENOENT until you copy it from the
main checkout — that is environment setup, not a defect. See [[campaign-tree-drift-discipline]] and
[[e2e-port-3000-serializes-campaigns]].

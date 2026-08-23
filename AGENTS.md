# MoneyFlow Agent Instructions

Follow `.claude/CLAUDE.md` and every applicable file under `.claude/rules/` and `.claude/skills/`.
Those files are the repository's style, architecture, security, and testing authority.

## Human Scratch Completion Goal

When a user starts or resumes the goal at `specs/007-human-scratch-completion/GOAL.md`, follow that
file and `specs/007-human-scratch-completion/PROCESS.md` exactly.

- Keep the root thread as coordinator and sole durable-ledger editor. It must not implement product
  code. Only root may edit GOAL/PROCESS/PROGRESS/BASELINE/DEPENDENCIES/DECISIONS/QUESTIONS/RISKS/
  HANDOFF/FINAL-AUDIT, agent configuration, or approved scratch markers during execution.
- Use the project agents `human_scratch_implementer` and `human_scratch_reviewer` sequentially.
- Run only one implementation package at a time. Never run concurrent write-heavy packages.
- Every dispatch names one exact revisioned worker artifact path. Failed review files are immutable;
  re-review uses the next revision number.
- An implementation is not complete until an independent reviewer approves the exact immutable
  `BASE..HEAD` range and assigned evidence. `BASE == HEAD` is a valid no-code range for P00/P21 or a
  package needing no product diff; it does not waive review.
- Do not ask the human questions or pause merely because a decision is ambiguous. Record it in the
  assigned evidence/review as a complete `Q-*` proposal, apply the decision hierarchy in
  `PROCESS.md`, and continue. Root alone transcribes that proposal into
  `specs/007-human-scratch-completion/QUESTIONS.md`.
- Preserve unrelated and user-owned work. Never stage with `git add -A` or `git add .`; stage exact
  paths only.
- Do not edit `specs/human-scratch.md` except for the exact checkbox belonging to an independently
  approved and integrated scope item. A multi-package epic is checked only after every mapped
  package passes review.
- Treat `SCOPE.json` as the immutable 22-requirement, two-source scope. Prefixes record provenance
  only; lifecycle, review and definition-of-done gates are equal. Verify both sources at every
  boundary. Only HS entries use marker/rolling-checksum completion; FS-001's canonical source is
  immutable and must never be edited.

Outside that explicitly started goal, use the repository normally; this orchestration protocol does
not automatically apply to unrelated tasks.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's
directory; in monorepos the `next` package may not be visible from the repo root) before writing any
code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at
`node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates
the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

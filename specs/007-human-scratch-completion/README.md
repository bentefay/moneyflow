# Human Scratch Completion Orchestration

This directory is the durable control plane for completing 22 equally first-class requirements from
two frozen sources: 21 human-scratch blocks and the complete transaction percentage allocations and
settlement specification. Start or resume work by giving Codex the goal pointer:

> Complete `specs/007-human-scratch-completion/GOAL.md`.

The root thread coordinates one package at a time. A dedicated implementer changes the product, then
an independent reviewer inspects the exact commit range, manually tests the real app with headless
Playwright CLI, audits the style guides and tests, and either approves or sends it through another
fix/re-review cycle.

## Durable files

- [GOAL.md](GOAL.md): objective and finish contract.
- [SCOPE.json](SCOPE.json): immutable machine-readable two-source snapshot of all 22 requirements.
- [PROGRESS.md](PROGRESS.md): authoritative package state and next action.
- [PROCESS.md](PROCESS.md): coordinator state machine and role boundaries.
- [BASELINE.md](BASELINE.md): refreshed environment and verification baseline.
- [DEPENDENCIES.md](DEPENDENCIES.md): ordering graph and external gates.
- [DECISIONS.md](DECISIONS.md): append-only decisions and assumptions.
- [QUESTIONS.md](QUESTIONS.md): non-blocking questions for final human review.
- [RISKS.md](RISKS.md): active risk register.
- [HANDOFF.md](HANDOFF.md): compact context for the current package only.
- [FINAL-AUDIT.md](FINAL-AUDIT.md): final completion and flake/security/UX audit.
- `tasks/`: one stable requirement file per frozen scope item.
- `tasks/P00-baseline.md` and `tasks/P21-final-audit.md`: executable control-package contracts.
- `reviews/`: independent package reviews.
- `evidence/`: concise, non-sensitive command and manual-testing evidence.

`SCOPE.json` is immutable during execution. All requirement IDs use equal evidence, independent
review and definition-of-done gates; prefixes record provenance only. Root applies marker/rolling-
checksum completion to the 21 HS entries and records FS-001 completion without editing its immutable
canonical source. `PROGRESS.md` is operational truth; old checklists are not evidence.

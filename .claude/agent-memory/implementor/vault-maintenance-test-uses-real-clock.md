---
name: vault-maintenance-test-uses-real-clock
description:
    vault-maintenance "sanitizes generic action and edit callbacks" fails under heavy load because
    VaultProvider's maintenance budget reads real performance.now while the test fakes only
    animation frames
metadata:
    type: project
---

`tests/integration/vault-maintenance.test.tsx` "sanitizes generic action and edit callbacks before
cleanup without changing Undo" failed once at load ~20 (undo left `action-public` notes undefined)
and passed 3/3 alone and in the next full run. Mechanism, not just "flake": the test mocks
`requestAnimationFrame`, but `VaultMaintenanceOwner` in `src/lib/crdt/context.tsx` builds its host
with `now: () => performance.now()`, and the scheduler stops a frame after a 4 ms wall-clock budget.
CPU contention therefore changes how maintenance chunks into commits relative to the undo step.

**Why:** a fake clock does not reproduce it faithfully — a clock advancing per read starves the loop
and the harness reports "Maintenance frames did not settle" instead.

**How to apply:** if it fails, check `uptime` and rerun in a quiet window before investigating; a
real fix would inject the host's clock into the provider for this test. Related:
[[class-without-cause-leaves-the-defect]], [[port-discipline-is-cpu-discipline]].

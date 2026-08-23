---
name: derivation-failure-is-the-normal-state
description:
    deriveEffectiveAllocations returns ok:false whenever account ownership is empty, which is
    ordinary, so gating a displayed value on .ok blanks the common case
metadata:
    type: project
---

`deriveEffectiveAllocations(allocations, ownerships)` in `src/lib/domain/allocation.ts` returns
`{ ok: false, errors: [{ type: "invalid-ownership", reason: "empty" }] }` whenever the ownership
record is empty — which is the ordinary state of any account nobody has assigned owners to, not a
data-corruption case. `PersonAllocationCell` knows this: on the derivation-failure path it still
renders the stored percentage (`describeDerivationFailure` returns
`display: explicitDisplay ?? "Invalid"`), and only the _description_ loses its effective figure.

**Why:** I wrote a v9 column accessor that returned the explicit allocation only when
`derivation.ok`, reasoning that a failed derivation meant malformed data. It meant "this account has
no owners", so the accessor returned `undefined` for every such row and the whole allocation column
would have copied and sorted as empty. The unit test caught it, but only because a fixture happened
to omit `accountOwnerships`.

**How to apply:** When reading a `Result`-returning domain helper to produce a _displayed_ or
_copied_ value, check what its error cases actually are before treating `!ok` as "no value". For
allocations specifically, the explicit stored percentage is independent of whether the effective
derivation succeeds — validate the value itself (finite number, not `-0`, per the cell's own
`displayPercentage`) rather than the derivation. Related: [[print-before-asserting]],
[[mark-inference-as-inference]].

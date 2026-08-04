---
name: unblocking-a-path-makes-downstream-newly-reachable
description:
    When a fix unblocks a code path that was previously inert, re-examine everything downstream - it
    has never actually run and its latent bugs become user-visible
metadata:
    type: feedback
---

When your fix makes a previously-dead code path start succeeding, **everything downstream of it is
newly reachable and has never actually executed**. Audit it before shipping. Latent defects there
are harmless while the path is blocked and become user-visible the moment it is not — and they
typically convert a loud failure into a quiet wrong answer, which is worse.

**Why:** P29 hit this **twice in one package**, both times where my own fix would have introduced
the visible regression:

- `parseRawRows` computed `detectHeaders` and discarded it, so `hasHeaders` stayed `true` for a
  headerless file. Harmless at BASE because column detection returned `{}` and nothing parsed
  anyway. Once detection worked, it would have **silently dropped the first data row** — 621 of 622
  rows importing looks like success and does not get reported.
- The Auto-detect button matched header names while the load path became value-driven. At BASE the
  button was merely useless; afterwards a click would have **wiped the correct mappings**, because
  `onMappingsChange` overwrites wholesale.

**How to apply:** After fixing a detection/parse/guard that previously always failed, list every
consumer of its output and ask "what did this do when the input was empty, and what will it do
now?". Pay special attention to (a) values computed and then thrown away, (b) a second entry point
to the same decision — a button beside an on-load path — which may still run the old implementation.
State averted regressions in evidence with that framing; a reviewer reading "X now works" cannot see
what was avoided. Related: [[verify-dispatch-site-enumerations]].

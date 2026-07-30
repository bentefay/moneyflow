# User-Reported Refinements

Frozen requirement source for four refinements reported directly by the human principal on
2026-07-30 during the P21 rev 06 final audit of goal `007-human-scratch-completion`, and admitted
into that goal's committed scope at the principal's explicit instruction.

This file is a frozen source. Once its SHA-256 is recorded in `SCOPE.json`, its text is immutable:
no edits, no checkbox markers. Completion for each requirement is recorded only in the
requirement/package ledgers after implementation and independent review, exactly as `FS-001` is
completed.

## UR-001 — Add transaction focuses the description instead of selecting the row

The "Add transaction" button must not select the newly created row. It must instead move keyboard
focus into the new row's description field so the user can begin typing immediately.

Selection in the transaction table means "target for bulk operations". A newly created empty row is
an edit target, not a bulk-operation target, so using selection to highlight it is a semantic
mismatch. The current implementation additionally replaces rather than extends the selection set, so
creating a transaction silently discards an in-progress multi-row selection.

Required behaviour:

- Creating a transaction must leave any pre-existing selection unchanged.
- The new row's description input receives focus once the row is rendered.
- Existing discoverability behaviour is retained: filters reset, the page extends far enough to
  include the new row, and the row is scrolled into view.
- The focus intent is consumed exactly once and then cleared, so it cannot re-assert on a later
  render.
- The row is virtualized: focus must occur only when the row is actually mounted, and the
  scroll-into-view must not leave the row unmounted or the focus lost.

Not required: any highlight or "recently added" styling. Focus alone identifies the row.

## UR-002 — Transaction search matches alias-resolved descriptions

Transaction search must find transactions by the description text the user can actually see.

When a transaction carries a description alias, the visible description is resolved through the
alias graph, while the raw stored description field may hold different text or be empty. Search
currently matches only the raw stored field, so a transaction displaying an alias cannot be found by
searching for the text shown on screen.

Required behaviour:

- Search matches against the alias-resolved description text when a transaction has a description
  alias.
- Search continues to match against the raw stored description, so imported text that predates an
  alias remains findable.
- Search continues to match against notes.
- Alias resolution follows the one-hop symlink relationship between aliases, matching whatever text
  the table displays for that transaction.
- Matching remains case-insensitive and substring-based, consistent with existing behaviour.

## UR-003 — Presence avatars show member name initials

A presence avatar must show initials derived from the member's display name, and its tooltip must
show that display name.

The avatar currently receives no display name and falls back to the member's public key hash, so it
renders the first characters of that hash and exposes the raw hash as the tooltip text. This is a
presentation defect, not a disclosure of secret material: the value is a public key hash.

Required behaviour:

- The member's display name is resolved and supplied to every presence avatar, at every place
  presence avatars are rendered.
- Initials derive from that display name using the existing initials derivation: a default name of
  "Me" yields "M"; a two-word name such as "Ben Tefay" yields "BT".
- The tooltip shows the resolved display name, not a key hash.
- Deriving initials from a key hash remains only as a last-resort fallback when no display name can
  be resolved.
- Avatar colour continues to derive from the stable per-member identifier rather than the name, so
  colour survives a rename and members sharing initials stay visually distinct.

## UR-004 — Default currency inferred from time zone

When creating a vault, the default currency must be inferred primarily from the user's time zone
rather than from the browser or system locale.

Locale encodes language preference; its region subtag is an unreliable indicator of location.
`en-US` is the default locale on most Linux installations, container images and development
environments, so inferring region from locale silently resolves to the United States for users who
are not there, and defaults them to US dollars with no indication that the value is wrong. A user in
`Australia/Brisbane` with an `en-US` locale is defaulted to USD when AUD is correct. Time zone does
not share this failure mode, because an incorrect time zone visibly breaks clocks and calendars and
is therefore usually correct.

Required behaviour:

- The user's time zone is the primary signal for the inferred default currency.
- Locale-derived inference remains as a fallback for when the time zone yields no country, such as
  the `UTC` time zone commonly configured in containers and virtual machines.
- A final fallback currency applies when neither signal yields a supported currency.
- The mapping from time zone to country uses an established, maintained library rather than a
  hand-written table. The existing country-to-currency mapping may be reused.
- The inferred currency is only a default. It is presented in the vault creation flow and the user
  can change it before and after creation. It is never silently locked in.

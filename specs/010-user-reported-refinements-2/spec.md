# User-Reported Refinements 2

Frozen requirement source for four refinements reported directly by the human principal on
2026-08-01, and admitted into goal `007-human-scratch-completion`'s committed scope at the
principal's explicit instruction.

This file is a frozen source. Once its SHA-256 is recorded in `SCOPE.json`, its text is immutable:
no edits, no checkbox markers. Completion for each requirement is recorded only in the
requirement/package ledgers after implementation and independent review, exactly as `FS-001`.

## UR-005 — Transaction table chrome is minimal at rest

The transaction table must look clean and minimal at rest. The subtle background fill currently
carried by the row's data cells is distracting chrome and must be removed.

Required behaviour:

- The date, description, account, status, percentage and amount cells carry no background fill in
  their resting state.
- Hover, focus, focus-visible, selected, editing and any presence or validation states keep their
  existing visual treatment. Removing resting chrome must not remove state feedback.
- Focus indication remains clearly visible and keyboard focus remains obvious at every cell.
- Contrast for text and for every retained state remains at least WCAG AA, and the accessible
  role/name/state exposed by each cell is unchanged.

## UR-006 — Vault members are listed by name

The Vault Settings members list must identify each member by their display name, not by a raw
identifier.

Required behaviour:

- Each member row shows the member's display name, resolved the same way the presence avatar
  resolves it.
- A raw public key hash is never the visible label for a member.
- Where no display name can be resolved, a clearly human-readable fallback is shown rather than a
  bare hash.
- Any tooltip or accessible name for the member follows the same rule as the visible label.

## UR-007 — Dates display in the browser's locale

Dates must be presented using the viewer's locale rather than a fixed United States format.

Required behaviour:

- Displayed dates use the browser's resolved locale ordering and separators. For an
  Australian-English viewer, `03/08` is the third of August, not the eighth of March.
- A date in the current year displays as day and month only.
- A date in a different year, and any date shown while editing, includes the year.
- The year is rendered in full in the editing and different-year presentations, so a viewer can tell
  one century from another.
- Date entry accepts what the same locale displays, so a value can be typed back in the form it was
  shown.
- The browser reports its LANGUAGE, not the viewer's regional format, and no web API exposes the
  latter, so an `en_US` desktop in Australia is reported as `en-US` and renders month-first
  correctly-as-written but wrongly-for-the-viewer. A setting must therefore let a viewer override
  the presentation, choosing between following the browser, day first, month first and year first.
  The choice is per viewer: members of a shared vault in different countries each keep their own.
- The calendar picker follows the same choice, including which day the week starts on.
- Stored values remain unchanged: this is a presentation and parsing concern only. Dates are stored
  and compared as calendar dates, and no displayed value shifts because of a time zone.

## UR-008 — CSV import parity with OFX, and honest import counts

A CSV export and an OFX export of the same account activity must import to the same result, and the
import summary must describe its own counts truthfully.

Required behaviour:

- An amount carrying an explicit leading plus sign parses as a positive amount. `+69.00` is
  equivalent to `69.00`. Existing handling of minus signs, accounting parentheses, currency symbols
  and thousands separators is retained.
- A quoted field containing the delimiter is parsed as a single field, so a description such as
  `"PAYMENT RECEIVED, THANK YOU"` does not shift the columns of its row.
- Collapsing repeated whitespace is enabled by default for new imports, for every supported file
  type.
- Column detection runs automatically when a delimited file is loaded, without the user having to
  invoke it, and it runs on a file that has no header row.
- Column detection identifies each column from its values: a column whose values parse as dates is
  the date, a column whose values parse as amounts once currency symbols and signs are accounted for
  is the amount, and the remaining text column is the description.
- Date format detection identifies the format from the values present, including a day-first format
  such as `30/06/2026`, and it does not require a header.
- The import summary distinguishes rows excluded for being older than the cutoff from rows excluded
  as duplicates, and names separately those rows that are both old and duplicates, so no count is
  ambiguous about why a row was excluded or whether it will be imported.
- Every row the summary reports as an error is genuinely unparseable. A row rejected only because of
  a supported amount or quoting form is a defect, not an error.

The two files the principal reported, each holding the same 622 transactions, are the reference
case: the CSV has no header row, uses `dd/MM/yyyy` dates, quotes its fields, contains 15 rows whose
amount carries a leading plus sign, and contains 10 rows whose quoted description contains a comma.
Importing either file must yield the same transactions, and the CSV must report no errors.

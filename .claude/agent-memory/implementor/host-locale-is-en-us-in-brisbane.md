---
name: host-locale-is-en-us-in-brisbane
description:
    This host resolves navigator.language to en-US while sitting in Australia/Brisbane, so
    locale-keyed and timezone-keyed features disagree by default.
metadata:
    type: project
---

The development host runs `LANG=en_US.UTF-8` with time zone `Australia/Brisbane`. Chromium launched
by Playwright therefore reports `navigator.language === "en-US"` in a default context, while
`Intl.DateTimeFormat().resolvedOptions().timeZone` is `Australia/Brisbane`. Chrome's own profile
carries `intl.selected_languages: "en-US,en"`.

**Why:** `en-US` is the default locale on most Linux installs and container images, so any feature
keyed on locale silently behaves as if the user were American. UR-004 (P25) resolved this for
currency by making time zone the primary signal; UR-007 (P28) resolved it the opposite way for
dates, because its frozen text explicitly names "the browser's resolved locale". Two requirements in
the same goal, same environmental conflict, opposite calls.

**The desktop's own Formats setting cannot reach the browser.** GNOME's Region & Language separates
Language from Formats, and Formats exports `LC_TIME` (plus `LC_NUMERIC`, `LC_MONETARY`). Measured on
this host: launching Chromium with `LC_TIME=en_AU.UTF-8` leaves `navigator.language`,
`navigator.languages` and `Intl.DateTimeFormat().resolvedOptions().locale` all reporting `en-US`,
and `Intl` still formats `1/27/1988`. Only the UI-language chain moves them (`--lang`, `LANGUAGE`,
`LC_ALL`, `LANG`) — and `LANG=en_AU.UTF-8` yields `en-GB`, not `en-AU`, because Chromium has no
en-AU UI locale. There is no web API for OS regional-format preferences at all. So "ask the user to
fix their locale" is not a workable answer to a date-format complaint on Linux; the app has to offer
the override. That is what `src/lib/domain/date-format-preference.ts` and the per-viewer
`userDisplayPreferences` CRDT record are for. Firefox differs: its
`intl.regional_prefs.use_os_locales` pref (default off) does route OS regional prefs into `Intl`.

**How to apply:** never let an E2E test inherit the host locale or zone when the behaviour under
test depends on either — pass explicit `locale` and `timezoneId` to `browser.newContext()`, as
`onboarding-vault.spec.ts` and `date-locale.spec.ts` do. When a feature has both a detected default
and a stored override, drive the pair explicitly: set the context locale to the one the override
contradicts, so a test that passes only because the browser happened to agree cannot go green.
Otherwise a test can pass for the wrong reason on this machine and fail elsewhere. When a
requirement's frozen text and the principal's reported symptom imply different signals, raise it
with root rather than choosing; see [[locale-defect-check-parse-not-just-display]].

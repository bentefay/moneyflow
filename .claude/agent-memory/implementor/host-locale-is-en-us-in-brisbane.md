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

**How to apply:** never let an E2E test inherit the host locale or zone when the behaviour under
test depends on either — pass explicit `locale` and `timezoneId` to `browser.newContext()`, as
`onboarding-vault.spec.ts` and `date-locale.spec.ts` do. Otherwise a test can pass for the wrong
reason on this machine and fail elsewhere. When a requirement's frozen text and the principal's
reported symptom imply different signals, raise it with root rather than choosing; see
[[locale-defect-check-parse-not-just-display]].

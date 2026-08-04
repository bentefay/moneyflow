---
name: node-icu-is-not-browser-icu
description:
    Intl-governed behaviour differs between Node's ICU and Chromium's; census both or the reported
    blast radius will be wrong in either direction.
metadata:
    type: feedback
---

When a defect's behaviour is governed by `Intl`, census it in **both** Node (what vitest sees) and
Chromium (what users see). Never state a blast radius from one engine alone.

**Why:** In P28 rev 02 the editing-vs-parsing skeleton mismatch affected 9 of 114 locales under
Node's ICU 76.1 but only 4 of 112 under Chromium. Three locales that failed every unit-level check
(`it-CH`, `lv-LV`, `sr-RS`) worked correctly in the real browser, because Chromium happened to
render their `numeric` and `2-digit` skeletons with the same separator. Had I reported only the Node
census I would have overstated user impact threefold; had I reported only the browser census I would
have hidden a defect that a future Chromium ICU bump can expose with no code change.

**How to apply:** Run the sweep as a vitest probe importing the real module, then run the same sweep
via `page.evaluate` in a real browser context. Report the browser number as the user-visible blast
radius and the Node number as the latent one, and say explicitly that the gap is an ICU-version
accident. Use a scratch playwright config on a free port so this never contends for `:3000` — see
[[serialize-my-own-verification-load]].

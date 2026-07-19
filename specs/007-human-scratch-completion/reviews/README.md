# Independent Reviews

Root assigns one exact new review path per package revision, for example `P11B-review-01.md`. That
is the reviewer's sole persistent writable path. Reviews are immutable after handoff; never
overwrite a failed review, and use `P11B-review-02.md` for the next attempt.

Each review records package/scope, reviewer agent, exact BASE and HEAD, complete changed-path audit,
acceptance mapping, findings by severity, automated commands/results, repeated no-retry E2E results,
manual headless Playwright CLI charter and session cleanup, console/network evidence, `.claude`
style guide audit, accessibility/performance/security/data checks, UX verdict, and final PASS or
FAIL.

The review also contains sanitized manual evidence and complete Q proposals for root transcription;
the reviewer does not write global QUESTIONS or a separate evidence path. Only an independent
reviewer writes a verdict. An explicit BASE-equals-HEAD range still requires evidence review. Any
product/migration/test change after reviewed HEAD requires a new full-range review; later root-only
artifact/ledger integration is recorded separately.

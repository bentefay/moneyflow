# Evidence

Each implementer dispatch assigns exactly one revisioned file such as
`evidence/P11B/implementation-01.md`; it is the worker's only orchestration-artifact write. Store:

- command, timestamp, exact options, exit code, duration, summary/counts, and relevant seed;
- sanitized Playwright CLI snapshots or concise interaction transcripts;
- console error and network-failure summaries;
- performance measurements and migration/security test results;
- primary-source links and checked dates for external gates.
- complete `Q-PROPOSAL-*` records for root transcription when needed.

Do not store recovery phrases, private/public key material beyond deliberately public test fixtures,
vault data, real financial records, auth tokens, environment values, HAR files containing secrets,
browser profiles, huge raw logs, generated dependency directories, or disposable Playwright state.
Keep enough information to reproduce the result without retaining sensitive state.

P00/P21 collectors may write only their assigned evidence file and no product/test/ledger path.
Reviewers write evidence inside their exact assigned review file, not here. Root persists artifacts
and transcribes global ledgers after the verdict.

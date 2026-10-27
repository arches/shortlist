# Shortlist Principles

Standing rules. Each one was already being obeyed in several places and owned in none, which is what earned it a section here — the phrasings had started to drift, and this file is now the one that governs.

A principle looks forward and carries no date. Anything here that turns out to be one dated choice, with alternatives that were weighed and rejected, does not belong in this file.

## Frontend env vars are injected

**Statement.** The frontend bundle carries no configuration: what is environment-specific is served by the API at startup or inferred from where the frontend is running.

**Rationale.** Trying to minimize the number of places we set env vars.

**Implications.** Right now nothing has to be served, which is the cheapest the rule ever gets. The only environment-specific thing the frontend needs is the API's own address, and that comes from detecting where the frontend is running, so no fetch stands between load and first paint. The rule still governs the next value that comes along: anything the frontend cannot infer is served by the API, unauthenticated, since the frontend needs it before anybody has signed in — and the first paint then waits on that one round trip.

**Enforcement.** No `import.meta.env` anywhere under `frontend/src`.

<!-- alloy: principles -->

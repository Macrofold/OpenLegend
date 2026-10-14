# Narration failures and explicit chat retry verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

## Explicit narration failure

September 27, 2026, on `codex/narration-failure-cleanup` from `origin/main` at
`45210d41`. A one-off disposable SQLite world used the real server factory,
WorldService commit, story selection, Narrator worker and public history route with
`AI_BUDGET_USD=0`. Missing provider configuration produced a durable failed entry
containing exactly “Narration failed.” while retaining its source evidence and
diagnostic reason. An explicitly claimed job survived close/reopen as uncertain
with failed presentation; recovery, resume and a later worker wakeup queued no retry.
The database recorded zero paid reservations.

Manual publication preserved successful prose. Injected historical fallback and native
merge-notice records verified public projection: the former showed the failure message,
the latter retained its notice. The real `/api/history` route returned these entries,
and the standalone projection returned the same failure message. These fixtures prove
presentation/plumbing only, not live model quality or the full NC12 acceptance matrix.

Browser interaction in the disposable game verified Journal failures, successful prose,
the native notice, absence of Regenerate narration, history refresh, and the failed
Narrator banner's dismissal. The normal local Sign in link recovered the browser's stale
local session. No authentication policy or user save was changed.

Pinned Prettier on changed files, `pnpm typecheck`, `pnpm build`, local-link review and
`git diff --check` passed. Build warnings about PlayCanvas `worker_threads` externalization
and the large client chunk remain. No automated suites or live-provider calls ran;
[NC12/CR12](../maintainers/narration-and-conversations.md) retain broad qualification.

After rebasing onto freshly fetched `origin/main` at `61437608`, TypeScript and the
production build passed again. A fresh current-format disposable SQLite world verified
failed generation, successful publication, native notice display, actor-scoped source
evidence, HTTP history, the failure banner, and close/reopen/resume without a retry.
Zero paid reservations were recorded. The two additive conflicts preserved main's
evidence helper and changelog entries alongside the narration changes. Browser evidence
above remains from the original implementation; no browser or automated suite was rerun
for the rebase, and no old-save compatibility fixture was used.

## Explicit chat retry runtime observation

With a disposable SQLite save, injected no-network client and zero spending allowance, an initial chat failed and an explicit retry created a linked job retaining the same speech event. Speech count remained one. Repeating the retry request ID returned the same job; a distinct request to retry the superseded failure was rejected. The production build passed. No automated test files/suites or live provider requests were used; successful model completion, tooltip interaction and recovery boundaries remain in maintainer TODO.

### 2026-09-20 — persistence/editor runtime follow-up

Production build passed. Isolated in-memory SQLite execution with an explicit zero AI budget exercised composed append proof, incompatible fork rejection, earlier-prefix edit journal replay, Person summary paging/save/reload, importance-only edits preserving a dependent summary, and a routine milestone/event surviving a control flush. The latter scenarios used disposable synthetic records and the routine acceptance method directly; they do not establish browser, live-provider, native action-loop or PostgreSQL acceptance. An initial synthetic event omitted its required sequence and was rejected; rerunning with a complete event passed. No test files were added or edited and no test suite was run; async fixture migration and regression coverage remain in the maintainer TODO.

### 2026-09-21 — live Person editor fields

Production build passed. An isolated in-memory SQLite run with an explicit zero AI budget loaded the default resident through the Person editor, saved description, personality, backstory and two current goals, reloaded durable state, and confirmed that the first goal drove the native planning field, all goals and authored identity fields appeared in the protected identity document, and creation-time initial goals were unchanged. This does not establish browser layout or live-provider behavior. No test files were added and no test suite was run; deferred schema/context regression coverage is listed in the maintainer TODO.

The same production build and an additional isolated SQLite run verified Person-editor stat snapshots and save merging: a simulated fullness change after opening survived an unrelated description save, while an explicit fill after later energy drift persisted health/fullness/energy as 100/100/100. This does not establish browser interaction or visual layout. Automated stat-editor coverage remains deferred in the maintainer TODO.

## October 14 interrupted conversations and call allowance

A reported Tavin greeting was saved as cancelled after the player's control/access changed; the server remained running and the browser reconnected. The Talk panel previously omitted the reason for cancelled/stale replies. Current and paged history now share `replyReason`; the shared conversation display shows a neutral stopped-reply explanation beside the original speech. Only a technical failure offers the existing explicit Retry action, which clears its prior reason. Browser inspection confirmed the original greeting now displays its recorded cancellation reason.

Separate background decision requests reached Macrofold but were rejected before model invocation with `run_budget_exhausted`. Its conservative admission bound uses request size rather than OpenLegend's expected final token bill. The local development environment's `JEV_CALL_RESERVE_USD` was deliberately raised from $0.005 to $0.02; the checked-in default is unchanged. Confirmed terminal spending-limit rejection now retains accounting and reports the specific per-call limit instead of a generic provider failure.

TypeScript, production build, the existing conversation projection check and focused existing greeting/failure/cancellation cognition checks pass (3 tests; 4 unselected tests skipped). Production build's existing bundle/dependency warnings remain. Browser inspection used the actual cancelled Tavin transcript; the player world was temporarily paused during diagnosis.

Live qualification remains in progress. The first disposable-world greeting completed three Jev decision calls, including the larger action-attention request, but could not reach generation because the scratch fixture omitted recurring presence heartbeats and became paused. These three unique provider receipts report estimates totaling $0.001498; duplicate diagnostic copies of receipts are not additional calls. No uncertainty is recorded, and no text-generation request occurred in that first trial. A corrected fixture supplies normal authenticated presence heartbeats. This is not evidence of a completed live reply yet. Raw scripts, configuration and receipts remain outside Git.

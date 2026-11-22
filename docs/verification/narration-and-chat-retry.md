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

Separate background decision requests reached Macrofold but were rejected before model invocation with `run_budget_exhausted`. Its conservative admission bound uses request size rather than Open Legend's expected final token bill. The local development environment's `JEV_CALL_RESERVE_USD` was deliberately raised from $0.005 to $0.02; the checked-in default is unchanged. Confirmed terminal spending-limit rejection now retains accounting and reports the specific per-call limit instead of a generic provider failure.

TypeScript, production build, the existing conversation projection check and focused existing greeting/failure/cancellation cognition checks pass (3 tests; 4 unselected tests skipped). Production build's existing bundle/dependency warnings remain. Browser inspection used the actual cancelled Tavin transcript; the player world was temporarily paused during diagnosis.

The first disposable-world greeting completed three Jev decision calls, including the larger action-attention request, but could not reach generation because the scratch fixture omitted recurring presence heartbeats and became paused. These three unique provider receipts report estimates totaling $0.001498; duplicate diagnostic copies of receipts are not additional calls. No uncertainty is recorded, and no text-generation request occurred in that first trial. The corrected fixture supplied normal authenticated presence heartbeats, disabled native ticking and used production assets to avoid sharing the development HMR port. Its greeting to Tavin completed with committed speech “Morning.” and a private thought; shutdown confirmed saving with no reported problems. That run's three Jev calls cost $0.001498, and its one `openai/gpt-5-mini` completion cost $0.004349, totaling $0.005847. Text-generation billing was reconciled against its terminal Macrofold Run/result and complete non-provisional BYOK usage after the scratch receipt extractor omitted the nested generation receipt; missing extraction was not treated as free execution. Including the earlier partial trial, cumulative provider-reported costs are $0.002996 Jev + $0.004349 generation = $0.007345, with no uncertain completions.

A separate one-microdollar negative-admission check returned `failed` with “The AI request exceeded its per-call spending limit.” and a confirmed $0 cost, preserving zero uncertainty. All owned test servers/databases were closed. No server-process crash was established in the reported incident, and no crash repair is claimed. The checks qualify this greeting and interrupted-reply presentation, not wider dialogue quality or an authenticated browser playthrough of the disposable greeting. The existing model/account spending protections and failure-only explicit Retry behavior are unchanged. Raw scripts, configuration, screenshots and receipts remain outside Git.

## Stand-alone Rust Journal — November 21, 2026

On frozen source `cc85bde50c5a4db61d5b32519dcf6bedd6e8eebb`, a signed-in Chromium player walked into an authored landmark, opened its Journal passage and saw the matching banner. The real server saved both. Repeating the regeneration request made one additional controlled HTTPS attempt and updated the same entry. Exact stored text included a NUL, an isolated UTF-16 code unit and literal escape spelling. It survived cold reopen. Forgetting the source removed the passage and banner. The explicit failure check reopened a body-effect job produced by Source, then confirmed the Rust worker delivered and persisted the failure through the browser Journal.

Separate runs passed an authored place fallback without generation, a silent installed policy with no story job, and forgetting while a controlled provider reply was held. The dispatched call settled and its passage stayed absent. A second signed-in account could read its own history. The first account’s story and banner stayed absent on the first and later pages, and regeneration was refused. A process interruption left the job uncertain with its conservative reservation and admitted no repeat call. Rust and PostgreSQL closed and process inspection found no orphaned browsers. The two-account and interrupted cases exceeded the harness’s browser-close callback deadline. The separate exact cold, fallback, held-withdrawal, silent and explicit-failure cases passed cleanup.

The worker uses a bounded set of private context. Positive optional citation generation, parity with Source’s richer context and the stand-alone item and body-effect producers remain open. The worker used controlled responses with no paid model calls. No performance comparison ran. The fixture archive is `native-runtime-foundations/typed-npc-effects-20261121.Rlh3EDn4/private-journal/`.

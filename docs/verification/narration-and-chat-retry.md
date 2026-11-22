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

The worker uses a bounded set of private context. Positive optional citation generation and parity with Source’s richer context remain open. The [body-effect](#a-real-body-effect-in-the-rust-journal--november-22-2026) and [item inspection](#an-inspected-item-in-the-rust-journal--november-22-2026) cases exercise additional Rust producers. The worker used controlled responses with no paid model calls. No performance comparison ran. The fixture archive is `native-runtime-foundations/typed-npc-effects-20261121.Rlh3EDn4/private-journal/`.

## A real body effect in the Rust Journal — November 22, 2026

A signed-in Chrome player walked into the authored territorial encounter and took an 18-point health hit. In this disposable opening, an installed story rule selected that committed effect. The Rust server scheduled one private Journal passage from the actual event and its permitted personal account. The passage contained the exact recorded health impact. A controlled local HTTPS response rendered in Story and in the owner’s banner. Submitting the same regeneration request twice produced one additional provider attempt and updated the original entry. Source independently applied the same 18-point hit and queued a passage with the corresponding exact effect and impact fields.

A second signed-in Chrome player entered normally and loaded Story through its real browser request. Recent and older pages and the banner contained none of the first player’s passage. The second player’s attempt to regenerate it was refused. Cold opening recovered the first player’s exact passage. The authorized forgetting operation removed the linked entry and banner. A separate run forgot the injury while the model reply was held. The one dispatched receipt settled and neither the passage nor its banner appeared. The exact Rust source tree was `dc795c35418fc79681fce870bcf4a9164ad52aa0` and the executable SHA-256 was `a76bbb9b0824d9e2014ae8b2f8361581fe831e41c03539621482844d988e1b54`.

The initial shared Chrome process held the second account at “Loading artwork” after successful session, state, character entry and stream responses. Separate default Chrome processes admitted both players. A subsequent older-page request returned a transient busy refusal. In the final two-browser and held-withdrawal runs, the gameplay checks passed, the disposable databases were dropped, and the exact Chrome processes were reaped after their close callbacks missed the fixture deadline. The independent one-browser cold and forgetting run closed normally. Raw results are retained under `nsc04-journal-body-20261122` as `native-body-r7`, `held-body-r1`, `owner-only-r1` and `source-body-r2`, alongside the earlier attempts. These are local correctness checks with zero paid calls.

## An inspected item in the Rust Journal — November 22, 2026

The signed-in Chrome player picked up a fish, opened their inventory and selected that exact lot. Only the explicit inspection recorded its first private encounter. The Rust and Source inspections agreed on the item, definition version, carried location, audience, authored importance and exact observed description. A request before custody and a request with an outdated inventory revision both left evidence unchanged. Retrying the accepted request preserved one observation. A later deliberate inspection recorded another observation without creating a second story for the known item definition.

The authored rule selected this item and the existing worker used one controlled HTTPS response. Story displayed the passage. The player cooked the fish and retained the already published passage and original inspection receipt after restarting. With the provider unavailable, the worker used the exact observed description and created no provider attempt. In two other runs, the player cooked away the item or forgot the exact evidence while the reply was held. Each run settled the already dispatched receipt and published no passage or banner. Restart preserved that outcome.

The first Rust run tried to read the inspected label from the external visible scene. The fish was inside inventory, so the name reader refused. The receiving path uses the exact label already acquired in this observer’s private inspection. The tested source was `05f4c6542436f4c8324d1f9d25a6d1b570c09273` and the local verification executable SHA-256 was `bb0c883c58e53c36f096218821b70d33f2b0b62ffa5f8921cfc8e26c2845e8cc`. The source control, diagnostic, unsuccessful runs and completed `complete-r2`, `fallback-r3`, `loss-r3` and `forget-r3` cases are retained under `native-runtime-foundations/nsc04-journal-item-20261122/`. Disposable databases and processes were closed and no paid provider ran. Nested and paged container inspections, attached place reports and recipe records, and NPC inspection have separate callers.

## Speaking through the Rust browser — November 22, 2026

Chromium signed in to a freshly activated 12-entity Solo world and used Speak → Say. The player received the exact utterance, including the emoji. PostgreSQL saved one speech event. Replaying the command returned the same result, a forged recipient was refused, and the original receipt survived a cold restart. A second run with zero allowance refused the command without publishing an event. A 5,347-byte JSON request containing escaped text also saved and reopened once with its exact text. The same authenticated camp speech check on independent Source and Rust databases matched the command result, speech fields and cold receipt. These were correctness runs with a controlled provider and zero dispatches.

The frozen Rust tree `aed93126c196` and executable `f590f61e339a` serve these cases. Results `eb38ed41ff98`, `c740c25dc5be8`, `f7527bd39cae`, `7303806621f0` and `a8ce457859b6` are in `nsc04-opening-artwork-20261122`. Direct speech uses the current Speak allowance and the same scoped contact and remembered-person checks as conversation. The simulation owns the actual utterance, delivery and consequences. The Main listener check includes its airborne wildlife and has its own acceptance case.

Connected tree `b620c42c1ead` and executable `36df4a75bce5` also passed the controlled NPC reply through the shared target resolver. The player kept moving during a held preparation, and PostgreSQL retained the movement and the one applied reply across restart. The result is `2de337c25a2a`. The locked builds and network boundary check passed.

## Spoken text preparation in Rust — November 22, 2026

The stand-alone server passes the exact spoken string to its local language library. The language library returns the positions of the words and lowercase text directly to the pending event. The event checks its original ticket and word boundaries before deciding what each nearby character heard. The transitional Node caller still receives the same request format through its addon.

Two signed-in browsers in the 163-entity Main world received movement and one spoken line. Revoking access stopped the observer's stream, and the speaker recovered the original receipt after restart. A separate 5,358-byte Solo command included an emoji, control characters and one unmatched UTF-16 code unit in its text. One exact saved occurrence, repeat request and cold receipt passed. On independent River databases, Source and Rust returned identical ordinary speech outcomes, saved event fields and original cold receipts.

Three controlled HTTPS conversations also passed. Movement during a held valid request allowed one saved reply. Withdrawal stopped final generation and cancellation during settlement prevented reply effects. All disposable databases were removed. The locked stand-alone build, addon compilation and network policy check passed. The tree is `801b03e137b3` and the Rust executable is `f5e5c205ee0c6`. The Main and exact-text results are `07ffb73a4e67` and `5eef404e7d6b`. The conversation results are `d79b75df9956`, `4f127687897f` and `08c796b75645` under `nsc04-typed-utterance-20261122`. Provider traffic was entirely local. There is no speed comparison for this edge.

## Spoken introductions on the Rust listener — November 22, 2026

The local language library receives the selected name and the words each listener actually heard. It returns typed word lists to the same event's exact ticket. The installed world still decides whether that hearing is enough to name a recognized subject. Only the Node addon encodes this internal exchange.

On separate PostgreSQL worlds, both the previous encoded path and the typed path let a moving player hear “Sable Fern” twice. At first the player remembered the words and the visible body stayed anonymous. A second qualifying utterance taught the private name of the voice, with both voice samples and the evidence for the name. Restart preserved the name and both original reply receipts. Forgetting the second source removed the learned label from the player while preserving the occurrence and the speaker's own record. An early probe expecting the first utterance to rename a nearby body failed in both builds. A disposable trace confirmed a refusal at the installed recognition check, after the heard words matched. This agrees with the [earlier connected Source and Native result](../maintainers/native-simulation-core-coverage.md#required-proof-and-acceptance-mapping).

The new path also passed a real reply whose proposed alias was absent from the words, withdrawal before the final generation and cancellation during settlement. The invalid alias produced no name while the actual utterance and its receipt survived restart. The two stopped requests applied no reply. All five scenarios removed their disposable databases and made only local controlled HTTPS calls. The previous tree and executable are `801b03e137b3` and `f5e5c205ee0c6`; the typed tree and executable are `7e8e1f6b04f2` and `9d5979395962`. Results under `nsc04-typed-introduction-20261122` are `voice-control` (`1661c326e2b1`), `voice-candidate` (`75fd5d7952e2`), `voice-invalid` (`f5b181967b99`), `voice-withdraw` (`23dc02a04d12`) and `voice-cancel` (`5a5be63188d9`). No speed comparison was run.

## Direct Rust collation — November 22, 2026

The simulation passes the exact strings it has selected to the stand-alone server’s ICU ordering function. The answer returns typed positions and equality groups under the issuing candidate’s binding. ICU still receives the same UTF-16 units, and the simulation still validates the result before using it. The provider owns its admitted input and sort workspace for the duration of the read. The answer carries its own reservation into the candidate. The Node addon encodes the same request only when its caller asks for it.

The adjacent encoded control and direct build both saved two actual HTTPS replies and learned the same permitted voice name. Both recovered the original replies after restart. With the direct build, another held reply was received after evidence was withdrawn and correctly refused before applying effects. A scheduled hourly review separately selected four records in order, kept younger and protected records, and cold reopened with the saved summary. Locked server and addon checks passed. The evidence is under `nsc04-typed-collation-20261122` on tree `010c4d9001db`; the encoded and direct executables are `5f362f8f3ef8` and `19af0f89050d`. The four result digests are `7265c6ffeb51`, `9d33a4b6547c`, `97f58c8cac6d`, and `4f055f3f70eb`. This is caller evidence. The isolated performance comparison remains open.

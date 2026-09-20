# Deferred validation and documentation

From September 19: do not add or run tests or update other documentation for incremental changes. Queue that work here until requested.

## NPC memory and Macrofold integration

- [ ] Resume live integration after Macrofold credit is available. Latest explicit retry: sandbox setup now passes the execution-enabled gate but returns HTTP 402 `insufficient_credit`. No model run was admitted. Reuse the original setup operation and $10 allocation; no automatic paid retry or extra sandbox.
- [ ] Complete encounter → authored relationship/belief → restart → later decision acceptance, then reflection/dream acceptance, only when authorized execution is available. Fixture success is not live evidence.
- [ ] Verify Macrofold generic JSON inference supports OpenRouter GPT-5.4-mini. Inspected implementation supported Anthropic JSON and Jev via Typesafe/OpenRouter; fast/complex mini calls must not silently substitute another model or harness.
- [ ] Reconcile `docs/memory-architecture.md` implementation audit with final live outcomes and HTTP 402 blocker. Update architecture, extension guide and provider/setup documentation in the next batch. Current audit was written before the instruction to defer documentation.
- [ ] Verify newly admitted actors receive seed identity atomically with their first saved transition and one separately scoped Macrofold workspace. Verify unexpected Jev routes abstain rather than selecting unoffered cognition opportunities.
- [ ] Fix new god-endpoint fixture's no-cookie expectation: HTTP 401 is the actual unauthenticated contract; 403 remains the unauthorized-origin/god-disabled contract. This assertion failed before the instruction to stop tests; runtime rejected the request correctly.
- [ ] Refresh six existing menu assertions (five catalogue tests and one HTTP catalogue test) for the previously requested target-specific/empty-grass behavior. Last full check before test suspension: formatting/typecheck passed; 166 tests passed, six outdated menu assertions failed. A later god-route fixture exposed the 401/403 expectation above. Build passed before the newest small runtime refinements.
- [ ] Run formatting, typecheck, focused cognition/privacy/retention/atomicity fixtures and full checks in the next explicitly requested batch. Do not interpret the latest untested refinements as passing those checks.
- [ ] Expand rejection checks for byte limits, stale evidence/policies, quota-preserving commitment summaries, async provisioning shutdown, and exactly-once recovery after uncertain sandbox admission.
- [ ] Extend full-harness memory tools/files only through actor-scoped bounded interfaces. Current accepted mind and staged typed proposals travel inline with tools/files denied; no MCP recall tool is installed.
- [ ] Add native obligation fulfillment/deadlines and richer relationship/emotion mechanics through typed rules. Current commitment facets require actual self-attributed promise speech and cannot erase active obligations.
- [ ] Review god-inspector UX, document revision/evidence presentation, refresh after new accepted thoughts and world-switch clearing. Ordinary state must continue excluding private mind data.

Earlier deferred UI batches remain tracked in `docs/deferred-validation-and-documentation.md`.

## Muse Spark 1.3 Contributor model migration

- [ ] Macrofold handoff: enabled model `meta/muse-spark-1.3-contributor` already appears in the local catalogue for `opencode` (managed/byok). Add `model_parameters` to both POST `/v1/runs` and POST `/v1/inferences`: `{reasoning:{effort:"low"|"max"},provider:{require_parameters:true}}`. Forward this OpenRouter-shaped object without dropping reasoning or changing the model; include parameters in admission, idempotency, execution and usage provenance. Honor explicit model/harness/parameters on session continuations or reject incompatible continuations without dispatch. The current exposed schemas lack this field; do not claim live support yet.
- [ ] Ensure generic JSON inference via OpenRouter supports this model as well as Jev. Open Legend sends the exact slug in `model_binding.model`, with `provider:"openrouter"`; no `openai/` prefix. Jev routing remains unchanged. No fallback to the standard/non-contributor model is allowed.
- [ ] Verify all generation routes: fast uses low effort; complex uses max; full NPC deliberation/reflection/dreams, invention and world-agent chat use OpenCode at max. Existing chat continuations must not silently retain the previous GPT model. Confirm warm compute compatibility.
- [ ] Run deferred static/fixture checks for request shapes, contributor identity, continuation overrides, missing parameter support, and budget enforcement. Complex inference now allows 16,384 output tokens (including reasoning); fast defaults to 2,048. Monetary caps remain unchanged. No tests or paid inference were run for this migration.
- [ ] Update model/setup/memory documentation and live acceptance scripts' old mini-model wording in the next requested documentation batch. Contributor identity uses the model slug, not a separate boolean. Sources: https://openrouter.ai/meta/muse-spark-1.3-contributor and https://openrouter.ai/docs/guides/best-practices/reasoning-tokens .

## Local BYOK billing

- [ ] Validate `MACROFOLD_BILLING_MODE=byok` for harness runs (including continuations), Muse fast/complex inference and Jev inference; no silent managed fallback. Catalogue validation follows the selected billing mode.
- [ ] Document optional `MACROFOLD_PROVIDER_CONNECTION_ID` for the OpenRouter connection and separate `MACROFOLD_JEV_CONNECTION_ID` for Typesafe. IDs select credentials stored in Macrofold; never send raw provider keys in prompts or frontend code. If omitted, Macrofold must resolve configured BYOK credentials or report unavailable.
- [ ] Verify existing managed sessions reject incompatible BYOK overrides explicitly or migrate according to Macrofold's supported contract. Keep original pending mutation IDs/bodies intact during reconciliation.
- [ ] Clarify model-provider BYOK versus sandbox compute allocation: compute caps/reservations remain unchanged. Tests and documentation deferred per session instruction; no paid calls made for this change.

## Contributor effort correction

- [ ] Supersedes earlier `max` handoff examples: Contributor fast thoughts use `reasoning.effort="low"`; complex thoughts and all harness calls use `"xhigh"`. `"max"` is standard-tier only. Update earlier documentation/handoff examples and verify serialized initial/continuation/inference requests in the next requested batch. Shared runtime parameter helper updated; no tests or paid calls run.

## Jev through OpenRouter

- [ ] Supersedes the separate Typesafe-connection requirement: Macrofold Jev choice requests now use `provider:"openrouter"`, `model:"typesafe/jev-1.13"` (the exact identifier accepted by Macrofold's decision-model resolver), with the existing OpenRouter BYOK connection by default. `MACROFOLD_JEV_CONNECTION_ID` remains an optional override; `MACROFOLD_JEV_MODEL` controls this route independently of direct Typesafe `JEV_MODEL`.
- [ ] Verify live Jev choice parsing, confidence/probabilities, BYOK connection selection, spending and NPC/invention routing. No paid calls or automated tests run for this configuration change. Update prior setup and memory documentation in the next batch.

## Conversations across simulation pauses

- [ ] Explicit chat/invention requests no longer abort merely because the game pauses or the tab is hidden. An admitted provider stage may finish; successful results wait for resume before another paid stage or deterministic commit. Background NPC cognition still cancels on pause. Shutdown cancels pending resume waits; process-restart recovery of held responses remains follow-up work.
- [ ] Check pause during Jev, harness execution and after completion; repeated blur/resume; no new stage while paused; stale actor/action/evidence rejection after resume; no duplicate billing or dispatch; shutdown cleanup and actual provider failure messages.
- [ ] Update pause-policy and UI documentation in the next batch. Thinking text now explains that detailed responses can take about a minute; completed held responses say to resume. No automated tests or paid calls run for this change.

## Manual AI cancellation and player priority

- [ ] Verify the authenticated, same-origin `/api/ai/cancel` route binds an exact current job ID; stale cancel clicks cannot cancel newer work. Check paused response waits, remote cancellation, uncertain completion and no new paid retries.
- [ ] Verify composer Cancel request / Cancel background thought controls and background thoughts no longer disabling Send. Explicit player submissions abort background cognition and await cleanup before taking its worker; concurrent player submissions retain one-job admission.
- [ ] Check refresh/reconnect, interrupted-server recovery, preserved drafts, status messages, and no immediate automatic restart following user cancellation. Update UX documentation in the next batch. Runtime changes only; tests deferred.

## Stale composer cancellation warning

- [ ] Verify newest-first job selection: the composer previously reversed the server's newest-first list and redisplayed the oldest chat cancellation. It now selects the newest matching job and labels terminal errors as previous requests; cancellation wording no longer implies the world is currently paused.
- [ ] Cover refreshed/reconnected views, a new successful chat replacing an old cancellation, background versus interactive jobs, and focus/resume status. No tests run; documentation deferred.

## Message-local reply outcomes

- [ ] Verify new chat jobs persist the exact player speech event ID and cancellation/failure labels appear only alongside that message, including repeated identical text and reloads. Terminal statuses no longer linger above the composer. Legacy unlinked messages intentionally receive no guessed status.
- [ ] Add an index for speech-event job lookup if chat history/job counts grow; verify actor visibility boundaries and terminal status persistence. Update conversation UX docs in the next batch. No automated tests run.

## AI status from request history

- [ ] Verify old failed jobs no longer keep the badge degraded after a newer successful completion. Cancellations are not provider-health evidence. Labels now say Recent AI error / Latest AI request failed instead of implying a live Service limited health check.
- [ ] Document the distinction between configured providers, request outcomes and actual service health; consider independent per-provider health later. No tests run for this change.

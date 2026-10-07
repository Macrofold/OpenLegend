# AI execution and spending: limits and constraints

[Feature contract](../ai-providers.md) · [Implementation work](../maintainers/macrofold-worker-api.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. Entries marked **source inspected 2026-10-06** were checked against review-branch source at `7fddcea7c7c1adf79bd53c1dfa16558111c772d3`; synchronization is deferred. Provider-limit claims and dated prices below retain their stated historical scope, not fresh vendor verification. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [validation.ts](../../packages/ai/src/validation.ts), [embedding.ts](../../packages/ai/src/embedding.ts), [config.ts](../../apps/server/src/config.ts).

The qualified Macrofold direct-conversation route uses one original structured inference with optional text progress and the same final receipt/accounting owner. Direct Responses and full-harness callers remain completed-value paths. [NPV01](interface.md#npv01--private-npc-reply-preview) owns disclosure and bounded stream delivery; [NP05 evidence](../verification/npc-reply-preview.md) records measured ordinary-route/browser benefit and remaining qualification. No new paid request, automatic retry or parallel billing path is introduced.

## LA046

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The serialized `{state, questions}` envelope is locally limited to 220,000 JavaScript string units, estimated as 55,000 tokens at four units per token. JSON structure and question text both count. This is a local heuristic before dispatch, not an exact tokenizer count or a freshly verified provider allowance.

**Reason / tradeoff:** Preserve the local margin established against the historical 64,000-token provider claim below. Verify the current provider contract before changing it; do not treat a fixed string-to-token estimate as proof of fit.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA047

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The serialized shared state plus the longest serialized individual question is locally limited to 112,000 JavaScript string units, estimated as 28,000 tokens. This check is separate from the complete envelope in LA046; it does not divide a large shared state among questions.

**Reason / tradeoff:** Preserve the local margin established against the historical 32,000-token state/question claim below, report the oversized part, and verify the provider contract before changing the margin.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA048

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

One Jev multiple-choice question may offer between 2 and 255 answer options.

**Reason / tradeoff:** Keep the question-format restriction; it limits answers within one question, not the number of questions in the request.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA049

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

One Jev scoring question uses between 2 and 10 described score levels.

**Reason / tradeoff:** Keep the scoring-format restriction; it does not impose a ten-question limit on a request.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA050

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

A question identifier must contain 1–64 ASCII letters, digits, underscores or hyphens. The same identifiers match returned answers; they are bookkeeping, not a substitute for the actual model-visible question instructions.

**Reason / tradeoff:** Keep question labels bounded and consistent with the labels used to match returned answers.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA051

**Removed on October 3, 2026 · Restrictiveness: — (removed).**

The former decoder required probability totals and named-choice agreement within 0.005, and score averages within 0.01 times the number of score levels. Mike superseded the original **Keep** recommendation after a usable choice response totaling 0.99 was rejected. These assertions had no consumer benefit: [current decoding](../ai-providers.md#provider-behavior-and-limits) selects the highest offered raw score and preserves the provider's rating without a distribution-average or conventional-range assertion. Missing, nonnumeric or nonfinite required values remain invalid; scores are not normalized and application thresholds are unchanged.

[Implementation starting point](../../packages/ai/src/validation.ts).

## LA052

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The canonical JSON encoder permits at most 20,000 visited values, including containers and the root, and depth at most 32 with the root at zero. An array also has an explicit 20,000-entry guard, but its elements still consume the shared node budget. These are not independent allowances that can be multiplied. The same serializer also checks decoded direct/Macrofold JSON responses; cycles, nonfinite numbers and non-JSON values are rejected.

**Reason / tradeoff:** Allow supported large requests to pass the value-count check, while retaining protection against excessively complex nested input.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Expand**.

## LA053

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The direct AI client defaults to a 500,000-byte UTF-8 request allowance, configurable from 1 to 1,048,576. The game explicitly selects 500,000 bytes. Both context serialization and the final provider body use this bound; an individually fitting context can still exceed it once instructions, questions or schema are included.

**Reason / tradeoff:** Align this network-payload limit with the actual model input allowance so a valid request is not rejected by an unrelated smaller check.

[Direct client](../../packages/ai/src/client.ts) · [Game adapter setup](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## LA054

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The direct AI client defaults to a 262,144-byte response allowance, configurable from 1 to 2,097,152; the game selects 500,000 bytes. Streaming body reads stop above the configured byte limit, then parsed responses and generated values also pass canonical JSON complexity/size validation. These are direct-adapter bounds, distinct from Macrofold progress-stream transport in LA192.

**Reason / tradeoff:** Keep a download-size guard that accommodates every response the game explicitly allows the model to generate.

[Direct client](../../packages/ai/src/client.ts) · [Game adapter setup](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## LA055

**Current — source inspected 2026-10-06 · Restrictiveness: Liberal.**

The direct AI client defaults to 2,048 output tokens, accepts a configured ceiling from 1 to 16,384, and is instantiated by the game with 8,192. A request-specific value must be a positive integer no larger than that client ceiling; lower per-task and semantic-level allowances remain separate. The generic ceiling is not a promise that every route can request 16,384.

**Reason / tradeoff:** Choose output limits by task and model, with spending reserved before generation; do not assume these defaults describe every call.

[Direct client](../../packages/ai/src/client.ts) · [Game adapter setup](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## LA056

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The direct AI client defaults to a 20,000-millisecond timeout, configurable from 1 to 120,000 milliseconds. The earlier of that duration and an explicit absolute request deadline applies, including response-body reading. Application setup normally replaces the default with LA186; cancellation after dispatch does not prove that provider work stopped or cost nothing.

**Reason / tradeoff:** Keep finite waiting times, but report whether a timeout might have occurred after the provider already started billable work.

[Direct client](../../packages/ai/src/client.ts).

Original recommendation: **Review**.

## LA057

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

When no schema name is supplied, the direct client replaces non-ASCII identifier characters in the task name with underscores and truncates the result to 64 characters. An explicitly supplied schema name is instead validated against the 1–64-character ASCII letters/digits/underscore/hyphen form and rejected if invalid; it is not silently shortened. Neither path truncates instructions or game evidence.

**Reason / tradeoff:** Keep short format names; this should never truncate the actual instructions, game facts or generated response.

[Direct schema-name admission](../../packages/ai/src/client.ts).

Original recommendation: **Keep**.

## LA093

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The game configures 512 embedding dimensions by default within the 64–3,072 range. The direct embedding adapter additionally requires an integer dimension and exact-length finite, nonzero vectors for every requested text. This configuration range does not establish that every provider/model supports every dimension.

**Reason / tradeoff:** Keep a finite representation size and change it only when retrieval quality or storage measurements justify a different choice.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA094

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

One request to the service that converts text into numerical representations for meaning-based search accepts at most 33 text strings.

**Reason / tradeoff:** Keep a per-request batch allowance; process additional texts in later batches rather than limiting the searchable collection to thirty-three.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA095

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The embedding adapter allows 8,000 UTF-8 bytes per text and 64,000 bytes for the exact JSON text array. Action retrieval separately packs that array to 60,000 bytes and at most 33 texts, including an initial query; later batches need their own spending admission. The action packer does not itself check each text against 8,000 bytes before dispatching to the adapter, so a fitting array can still be rejected there. Memory indexing uses the shared count-and-byte batcher instead; its limits do not automatically fix this separate caller.

**Reason / tradeoff:** Align these size checks so a supported text or action description is not accepted by one stage and rejected by the next.

[Embedding admission](../../packages/ai/src/embedding.ts) · [Action retrieval](../../apps/server/src/action-retrieval.ts) · [Memory batch packing](../../apps/server/src/embedding-batches.ts).

Original recommendation: **Review**.

## LA096

**Current — source inspected 2026-10-06 · Restrictiveness: Liberal.**

A downloaded response from the service that converts text into numerical representations for meaning-based search is limited to 2,000,000 bytes.

**Reason / tradeoff:** Keep a download-size guard that is large enough for the configured batch count and number of values per vector.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Review**.

## LA097

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The embedding adapter defaults to a 15-second abort timeout and combines it with the caller's abort signal. Game callers such as action retrieval supply the configured AI timeout instead. This adapter does not independently consume the request's absolute `deadlineMs` field; a caller needing that earlier deadline must include it in its signal. Missing/uncertain completion retains the original accounting exposure and does not trigger a retry.

**Reason / tradeoff:** Keep a finite wait for optional search preparation and preserve directly retrieved required facts when the service is unavailable.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Review**.

## LA182

**Removed by NP01 on October 2, 2026 · Restrictiveness: — (removed).** Configuration already accepted $0–$100 per agent per UTC month with a $50 default, but the reservation owner still clamped admission to $50 on `c2e670b0`. The earlier audit's removal claim was inaccurate; the planning audit identified that mismatch. NP01 now removes the actual remaining clamp, with [synthetic $75 admission after $50, exact exhaustion, lowered/episode/background ceilings and concurrent reservation evidence](../verification/level1-decisions.md#np01-reliable-ai-outcomes-and-spending--october-2-2026).

**Reason / tradeoff:** Honor the already accepted operator setting without changing the $50 default or $100 configuration maximum. Atomic admission, conservative uncertain exposure, separate episode/decision bounds and real account-owner spending authorization remain. This software allowance grants no engineering spending permission. [Reservation owner](../../apps/server/src/store.ts), [configuration](../../apps/server/src/config.ts), [NP01](../maintainers/parallel-batch-02-foundations-and-usability.md#np01--reliable-ai-outcomes-and-spending).

## LA183

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Configured reservation defaults are $0.005 for Jev, $0.01 for embeddings and $0.08 for generation. Each accepts a minimum of $0.000001; configured maxima are $1, $1 and $10 respectively. These are inputs to admission, not universal exact charges or the final reserved amount: direct decision/generation allowances may increase them using requested-model prices and the conservative floors in LA184/LA185.

**Reason / tradeoff:** Estimate and reserve each call's cost before starting it, and align reservation limits with the actual request and authorized spending.

[Configured floors](../../apps/server/src/config.ts) · [Allowance owner](../../apps/server/src/cognition-budget.ts).

Original recommendation: **Review**.

## LA184

**Current PW01 branch evidence · Restrictiveness: Safe.**

The direct generation-allowance helper defaults to a minimum of the greater of $0.25 and the configured generation reservation, before requested-model pricing can raise it. A caller may supply a different floor and token estimate: narration uses 26,000 input tokens, 1,800 output tokens and the configured generation reservation as its floor. This is a reservation calculation, not a minimum provider charge. The general interactive-headroom calculation reserves room for two generation calls, three judgments and one embedding call; in Jev-only mode it instead retains three judgment allowances and no generation/embedding headroom. This is admission headroom, not an instruction to make all those calls or proof of actual cost.

The shared allowance now selects the actual configured model's prices; an undecided route takes the maximum across configured default/mini/complex/summary models, including cache-rate premiums. The existing floor and interactive headroom remain; no added provider allowance is implied. [Evidence](../verification/level1-decisions.md#pw01-reliability-repairs--october-2-2026).

**Reason / tradeoff:** Reduce unnecessarily large reservations using the actual planned calls without allowing background work to consume the money needed to answer the player.

[Allowance owner](../../apps/server/src/cognition-budget.ts) · [Narration caller](../../apps/server/src/narrator.ts).

Original recommendation: **Review**.

## LA185

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The direct interactive-headroom calculation uses 120,000 input tokens and an 8,192-output-token generation allowance. The ordinary direct generation/decision allowance instead defaults to 500,000 input tokens, with 8,192 output tokens for generation. Both use the configured requested-model prices and their applicable minimums. These are conservative reservation calculations, not the actual model-context or response-size contract.

**Reason / tradeoff:** Base reserved cost on the admitted request's actual maximum sizes instead of unrelated worst-case constants where practical.

[Allowance owner](../../apps/server/src/cognition-budget.ts).

Original recommendation: **Review**.

## MP01 — Configured model prices

**Current PW01 branch evidence · Restrictiveness: Safe.** Direct-provider estimates require an exact operator-configured requested model and prices. A differing reported identity requires an explicit alias belonging to that same entry. Unknown models, mismatches or reported cache writes without a write rate stay unpriced and retain the existing conservative reservation. Models and aliases have unique ownership; rates are finite/nonnegative. Identifiers use the adapter's 1–128-character model form. Default price fields remain the single default entry; an identical catalogue entry can attach aliases, while conflicting rates fail startup.

**Reason / tradeoff:** Prevent a more expensive model from inheriting cheaper prices or being admitted below its defensible estimate. Operators must maintain price/alias configuration; this is estimated application spending, not invoice reconciliation. There is no independent catalogue/model-alias count cap in this trusted startup configuration; it is copied/frozen once and exact-model lookup grows linearly with catalogue entries. No new billing authority, automatic price download or paid retry is added. [PG01's follow-up](../verification/camp-life.md#embedding-accounting-and-readable-descriptions--october-4-2026) reuses this exact-model pricing contract for direct embeddings. The verified standard small-embedding default is $0.02 per million input tokens; explicit catalogue ownership overrides it, and other models never inherit it. Forty completed prior calls are now estimated through normal settlement; one interrupted call without usage retains $0.01 under WW11. [Configuration](../ai-providers.md#configuration-and-interface) · [PW01 evidence](../verification/level1-decisions.md#pw01-reliability-repairs--october-2-2026).

## LA186

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The game's configured AI-call timeout defaults to 35 seconds and accepts values from 5 to 120 seconds.

**Reason / tradeoff:** Keep finite waiting times while distinguishing a definite pre-execution rejection from a timeout after billable work may have started.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA187

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

`MACROFOLD_RUN_MAX_USD` defaults to $0.25 and accepts $0.000001–$10 for ordinary native/model Run admission. The selected creator route has its separate `MACROFOLD_WORLD_RUN_MAX_USD` default of $1 and range $0.000001–$5. Neither is the shared workshop total, a Worker allocation-rate ceiling, or account-owner permission to spend.

**Reason / tradeoff:** Keep a per-run spending ceiling and change its value only within the owner's authorized total budget.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA188

**Removed by the Worker cutover — absence rechecked 2026-10-06 · Restrictiveness: — (removed).**

The old `MACROFOLD_COMPUTE_MAX_USD` default of $0 and maximum of $100 belonged to finite Sandbox allocation. Current configuration does not read it. OpenLegend selects an existing operator-owned Worker; it does not allocate compute or translate that old allowance into an hourly Worker ceiling. Run/model limits do not cap shared allocation or idle spend.

**Reason / tradeoff:** Preserve the [application/world compute owner's controls](../ai-providers.md#shared-worker-setup-and-cutover), explicit authorization and settlement of real historical obligations. The removal does not authorize unlimited compute, restoring a legacy allocator or refunding uncertain charges. The original **Review** recommendation is superseded by the accepted Worker ownership contract.

[Current configuration](../../apps/server/src/config.ts) · [Remaining deployment and accounting gates](../maintainers/macrofold-worker-api.md#mw04--remaining-deployment-and-qualification-gates).

## LA189

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Ordinary native Run queue and execution timeout parameters use `MACROFOLD_TIMEOUT_SECONDS`, default 300 seconds and range 5–300. Local waiting also retains its request deadline/cancellation. The creator route has a separate `MACROFOLD_WORLD_TIMEOUT_SECONDS`, default 900 and range 5–1,800; fast/complex direct inference uses LA186. Do not apply one route's default to every remote operation or add queue and execution allowances to claim a longer locally authorized wait.

**Reason / tradeoff:** Keep a finite remote-work deadline and expose queue delay separately from model execution time.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA190

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The non-fast/non-complex native generation path checks the serialized instructions/schema/context object against 98,000 UTF-8 bytes, not characters. It adds its response-format wrapper afterward, subject to the separate transport body bound. This check does not describe fast/complex direct inference or every reflection/creator prompt; those callers retain their own complete-input and workspace contracts.

**Reason / tradeoff:** Align this prompt-size check with the remote service's actual allowance and the game's other model-input checks.

[Native generation caller](../../apps/server/src/macrofold.ts).

Original recommendation: **Review**.

## LA191

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Macrofold Jev calls request 64 output tokens per question, with a minimum of 1,024 and maximum of 16,384 tokens.

**Reason / tradeoff:** Ensure the permitted questions have enough answer space, and split work if the output ceiling is reached before the input ceiling.

[Judgment inference caller](../../apps/server/src/macrofold.ts).

Original recommendation: **Review**.

## LA192

**Current — source inspected 2026-10-06 · Restrictiveness: Liberal.**

Macrofold JSON requests use a 500,000-byte canonical body bound. Ordinary response reads default to 1,000,000 bytes; a caller can select a lower positive bound, and parsed JSON also passes complexity validation. The 30-second timeout is a fallback only when no caller signal is supplied, not an extra ceiling added to longer admitted Run waits. Direct inference progress uses a total wire-stream allowance of four times the selected response bound, a separate 1,000,000-byte frame bound and an accumulated text bound equal to the selected response limit. A failed preview follows the same accepted Run/receipt; it never launches replacement inference.

**Reason / tradeoff:** Keep network-size and wait protections while aligning them with the remote operations the game officially supports.

[Macrofold transport](../../packages/ai/src/macrofold.ts) · [Stream framing](../../packages/ai/src/event-stream.ts).

Original recommendation: **Review**.

## LA194

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Diagnostic event/billing inspection reads pages of 100, stopping after ten pages and exposing `truncated` and the remaining cursor. Authoritative Run settlement is different: it accepts at most one complete 100-row usage page with an explicit null cursor; incomplete coverage retains the original reservation. Native model discovery checks only its first 100-row listing, without following a cursor. Question/progress event replay can read four pages per pass and reduce page size when response bytes overflow; reflection tool-count inspection instead rejects an incomplete 100-event window. Workspace file listing uses the separate 20-entry rule in [LA042](memory.md#la042). These consumers must not borrow one another's completeness claims.

**Reason / tradeoff:** Fetch further pages when complete discovery is required, or clearly report that inspection stopped before all records were read.

[Discovery, event replay and billing](../../apps/server/src/macrofold.ts) · [Workspace listing](../../apps/server/src/workspace.ts).

Original recommendation: **Review**.

## LA195

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Pending Run observation waits 500 milliseconds between passes; workspace operation polling waits 300 milliseconds. These delays follow the previous request/work, so they are not guaranteed fixed request rates. Diagnostic detail-page calls use a ten-second signal per page, while later receipt reconciliation uses one ten-second signal for its related completion/usage reads. Streaming progress and its publication window remain separate from status polling.

**Reason / tradeoff:** Keep polling frequent enough for responsiveness without repeatedly querying a remote service faster than useful information changes.

[Run observation and inspection](../../apps/server/src/macrofold.ts) · [Workspace operations](../../apps/server/src/workspace.ts).

Original recommendation: **Keep**.

## LA196

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

The named default `LLM_*_USD_PER_MILLION` and `JEV_INPUT_USD_PER_MILLION` settings accept $0–$1,000 per million tokens. Additional entries in trusted `OPENAI_MODEL_PRICES_JSON` instead require finite nonnegative rates with exact model/alias ownership; that catalogue schema has no $1,000 ceiling. These are configuration checks, not a global spending allowance; checked cost conversion and authoritative admission remain required.

**Reason / tradeoff:** Treat the price ceiling as a configuration sanity check and do not confuse it with the authorized amount the game may spend.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## Historical provider context

The original audit cited Jev provider allowances of 64,000 tokens per complete request and 32,000 for shared state plus the longest question, versus the local estimated targets of 55,000 and 28,000 (LA046/LA047, four characters per token). These are historical source claims, not freshly verified provider specifications. Recheck the provider contract before changing margins; the 255-option bound is per multiple-choice question, not a question-count cap.

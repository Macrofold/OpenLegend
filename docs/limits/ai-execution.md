# AI execution and spending: limits and constraints

[Feature contract](../ai-providers.md) · [Implementation work](../maintainers/macrofold-worker-api.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. Entries marked **source inspected 2026-10-06** retain their original source-review baseline at `7fddcea7c7c1adf79bd53c1dfa16558111c772d3`; that historical base is not an outstanding integration prerequisite. Provider-limit claims and dated prices below retain their stated historical scope, not fresh vendor verification. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

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

The direct AI client defaults to a 262,144-byte response allowance, configurable from 1 to 2,097,152; the game selects 500,000 bytes. Streaming body reads stop above the configured byte limit, then parsed responses and generated values also pass canonical JSON complexity/size validation. Native OpenAI Decisions shares that cancellable UTF-8 reader with its own 1,000,000-byte response bound and current JSON-complexity checks. These are direct-adapter bounds, distinct from Macrofold progress-stream transport in LA192.

**Reason / tradeoff:** Keep a download-size guard that accommodates every response the game explicitly allows the model to generate.

[Direct client](../../packages/ai/src/client.ts) · [Game adapter setup](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## HD01 — Bounded provider HTTP diagnostics

**Current — source inspected 2026-10-15 · Restrictiveness: Safe.**

The direct AI client and native OpenAI Decisions client read at most **8,192 bytes** of an unsuccessful HTTP response for diagnostic identifiers; a smaller configured direct-response allowance remains controlling. A larger declared or received body stops diagnostic reading. Only error code/type identifiers of 1–128 lowercase ASCII letters, digits or underscores, beginning with a letter, are retained. Raw messages and bodies are discarded. Rate-limit headers are read on successful responses too: remaining request/token counts accept at most 32 decimal characters, while reset and `Retry-After` fields accept at most 128 characters. Recorded counts and millisecond delays must be nonnegative safe integers; malformed or unrepresentable values are omitted. Valid minimum waits are preserved without an arbitrary shorter cap.

**Reason / tradeoff:** Distinguish temporary throttling from quota/billing exhaustion without retaining private provider messages or allowing unbounded diagnostic reads. A large or malformed error can lose its identifier; the original HTTP outcome and conservative spending obligation remain unchanged. The transport never schedules a retry. [Receipt behavior](../ai-providers.md#receipts-outcomes-and-accounting) · [Shared diagnostic reader](../../packages/ai/src/http-diagnostics.ts).

## LA055

**Current — source inspected 2026-10-06 · Restrictiveness: Liberal.**

The direct AI client defaults to 2,048 output tokens, accepts a configured ceiling from 1 to 16,384, and is instantiated by the game with 8,192. A request-specific value must be a positive integer no larger than that client ceiling; lower per-task and semantic-level allowances remain separate. The generic ceiling is not a promise that every route can request 16,384.

**Reason / tradeoff:** Choose output limits by task and model, with spending reserved before generation; do not assume these defaults describe every call.

[Direct client](../../packages/ai/src/client.ts) · [Game adapter setup](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## LA056

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The direct AI client defaults to a 20,000-millisecond timeout, configurable from 1 to 300,000 milliseconds. The October15 benchmark extended this transport-only ceiling from120,000; the game configuration retains its own narrower timeout range. The earlier of that duration and an explicit absolute request deadline applies, including response-body reading. Application setup normally replaces the default with LA186; cancellation after dispatch does not prove that provider work stopped or cost nothing.

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

**Current — integrated PW01 evidence · Restrictiveness: Safe.**

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

**Current — integrated PW01 evidence · Restrictiveness: Safe.** Direct-provider estimates require an exact operator-configured requested model and prices. A differing reported identity requires an explicit alias belonging to that same entry. Unknown models, mismatches or reported cache writes without a write rate stay unpriced and retain the existing conservative reservation. Models and aliases have unique ownership; rates are finite/nonnegative. Identifiers use the adapter's 1–128-character model form. Default price fields remain the single default entry; an identical catalogue entry can attach aliases, while conflicting rates fail startup.

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

Diagnostic event/billing inspection reads pages of 100, stopping after ten pages and exposing `truncated` and the remaining cursor. Authoritative Run settlement is different: it accepts at most one complete 100-row usage page with an explicit null cursor; incomplete coverage retains the original reservation. Native model discovery checks only its first 100-row listing, without following a cursor. Question/progress event replay can read four pages per pass and reduce page size when response bytes overflow; reflection tool-count inspection instead rejects an incomplete 100-event window. Workspace file listing uses the separate 20-entry rule in [LA193](memory.md#la193). These consumers must not borrow one another's completeness claims.

**Reason / tradeoff:** Fetch further pages when complete discovery is required, or clearly report that inspection stopped before all records were read.

[Discovery, event replay and billing](../../apps/server/src/macrofold.ts) · [Workspace listing](../../apps/server/src/workspace.ts).

Original recommendation: **Review**.

## LA195

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Ordinary pending Run observation waits 500 milliseconds between passes; background reflection with bounded tool-count inspection waits 2,000 milliseconds. Event replay with remaining pages uses the 500-millisecond wait, and workspace operation polling waits 300 milliseconds. These delays follow the previous request/work, so they are not guaranteed fixed request rates. Diagnostic detail-page calls use a ten-second signal per page, while later receipt reconciliation uses one ten-second signal for its related completion/usage reads. Streaming progress and its publication window remain separate from status polling.

**Reason / tradeoff:** Keep polling frequent enough for responsiveness without repeatedly querying a remote service faster than useful information changes.

[Run observation and inspection](../../apps/server/src/macrofold.ts) · [Workspace operations](../../apps/server/src/workspace.ts).

Original recommendation: **Keep**.

## LA196

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

The named default `LLM_*_USD_PER_MILLION` and `JEV_INPUT_USD_PER_MILLION` settings accept $0–$1,000 per million tokens. Additional entries in trusted `OPENAI_MODEL_PRICES_JSON` instead require finite nonnegative rates with exact model/alias ownership; that catalogue schema has no $1,000 ceiling. These are configuration checks, not a global spending allowance; checked cost conversion and authoritative admission remain required.

**Reason / tradeoff:** Treat the price ceiling as a configuration sanity check and do not confuse it with the authorized amount the game may spend.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## DB01 — Standalone synthetic decision evaluation

**Current — source inspected 2026-10-17 · Restrictiveness: Safe.**

The standalone decision client admits the two reviewed native models (`typesafe/jev-1.13`, `microsoft/microsoft-decision-1`) with explicit managed or exact BYOK binding. It reuses Macrofold’s 500,000-byte request and 1,000,000-byte response bounds, limits output to 1,024–16,384 tokens according to question count, and accepts a caller timeout up to 300 seconds. Streaming is rejected before dispatch. Provider-specific tokenizer windows remain provider admission constraints, not a claim that every byte-bounded input fits.

The evaluation tool now compares seven explicit configurations: Jev/Microsoft through Macrofold, direct OpenAI Luna Decisions, direct Luna Responses at low/medium/high effort, and Muse Spark 1.3 Contributor through OpenRouter/Macrofold. Initial concurrency is four (manifest 1–4); deliberate execution phases may use 1–16 workers with recorded source/concurrency and per-phase latency. Deadline 180 seconds (up to 300), generative output 8,192 tokens, and per-call safety ceiling $0.10. The explicit aggregate experiment cap is $100, increased from $50 by Mike on October 16. Existing manifests retain their frozen caps; every earlier charge and unresolved reservation carries into the revised comparison. This does not change the repository's standing allowance for other tasks.

Ordinary Macrofold generation can explicitly opt into streamed delivery through the existing transport. This avoids the server's separate sixty-second nonstreaming response-body deadline while retaining the original overall deadline, final schema checks and exact accepted-Run observation. The delivery choice is frozen in the benchmark manifest and recorded per request; changing it requires a new cohort. Native decision requests still reject streaming. An interrupted stream does not authorize another inference or release an uncertain charge.

The current corpus contains exactly 4,000 scored decision questions in 724 scenes plus 80 separate generation tasks. Inventory totals are supplied as actor-permitted engine facts instead of being reconstructed by models. Scene state is reviewed within 600–400,000 serialized characters and complete native input within 480,000 UTF-8 bytes. Direct OpenAI Decisions admits at most its documented 200 questions per request; generic Jev execution retains no question-count maximum. Actual corpus maxima and effective provider capacity are reported separately in the [audit](../verification/decision-benchmark-audit.md); no automatic truncation or tokenizer-fit claim follows from a byte bound.

The running Macrofold deployment rejected oversized Spark inputs at its **262,144-byte canonical inline-input ceiling** during the October 15 comparison. This is a deployment admission limit, independent of the local adapter’s larger request allowance and Spark’s tokenizer/model capacity. Such HTTP 413 cases do not establish that Spark processed the history. Evidence is not truncated to fit this experiment. Native OpenAI mixed refusals preserve independent answers and exact refused IDs; the benchmark journal accepts at most 200 unique refusal identifiers, each 1–256 characters, with no question simultaneously answered and refused.

Per-call reservations use conservative complete-input/output bounds and verified rates; Macrofold also receives the reserved provider cap. Complete measured usage with a known conservative price estimate releases unused reservation headroom. Incomplete/uncertain calls retain at least their full reservation and any larger known charge. Above-reserve charges stop further admission when they exhaust the task cap. A crashed single-writer lock requires process investigation before removal; changed corpus, prompt, funding, prior commitment or execution binding refuses resume. Provider-reported invoices remain distinct from usage-based estimates.

Validated journal replay reconstructs spending totals, call counts and pending reservations in one pass. Live events update that same accounting owner only after the append and sync succeed; admission and settlement no longer scan completed history. The append-only evidence remains authoritative, and full offline reports still materialize their selected dataset. This reduces growing work without weakening spending durability or adding a gameplay cache.

Complete corpus export writes one bounded scene/task at a time instead of constructing a whole document's string and UTF-8 buffer. File bytes, private mode and exclusive creation are unchanged. This bounds temporary output allocation, not resident corpus construction: all authored views still build at import before selection. The [current tooling limits](../verification/decision-benchmark-audit.md#reproduction-and-tooling-limits) and [expansion constraint](../maintainers/cognition-redesign.md#db01--synthetic-decision-api-comparison) remain explicit; no numerical corpus cap or gameplay policy is introduced.

Supplemental answer ranking uses the [benchmark-only points policy](../../scripts/decision-benchmark/README.md#supplemental-answer-points): accepted Choice alternatives tie at 100; explicit 75/50/25/0 preferences distinguish useful alternatives from contradictions without declaring measured harm. Ordered Score answers use their nearest offered category for both accuracy and points, with exact halves upward and finite endpoints bounded; raw values remain available. Actual probability estimates remain continuous. The current 4,000 questions all have references and none is excluded. Correct/answered accuracy and earned/available points exclude missing answers; answered/4,000 reports coverage separately. Policy preparation still precedes admission, and changed complete inputs require fresh predictions. These benchmark interpretations do not change native action/feeling admission. [Current evidence](../verification/decision-api-benchmark.md#answer-quality).

The separate [factual-error analysis](../../scripts/decision-benchmark/README.md#clear-objective-error-analysis) checks explicit factual, permission and constraint violations. Subjective or merely suboptimal reference misses are still graded for accuracy and points, but are not automatically factual violations. Its error-free fraction includes only returned answers actually assessed by that extra check; each model's checked denominator is explicit. Neither missing nor unassessed answers receive factual-correctness credit. The same nearest-category helper handles objective ordered ratings; confidence and real probabilities are not rounded. The runtime scoped rating reader has a separate task contract; no benchmark proposal was executed in gameplay.

Native chat reservation bounds include the additional JSON escaping of text-encoded character evidence. An explicit `recover-budget` operation can repair only authoritative, terminal, zero-charge Macrofold budget refusals proven never to have invoked the provider. It locks the source ledger, permanently binds one recovery directory, preserves both service attempts and funds the supplementary ledger from the source's complete task commitment. Uncertain, cancelled or paid calls are ineligible. Recovery is never automatic.

Every benchmark run with direct OpenAI configurations shares one benchmark-only request/token admission check. It retains at most sixteen in-flight capacity claims and two observed reset windows per counter. Input bytes plus 4,096 framing bytes, plus the full 8,192-token output allowance for Responses, provide a conservative token-capacity estimate; this is not measured token usage. Reported reset times and `Retry-After` pace future unattempted tasks; a remaining-count observation without a reset uses a 60-second window, and classified temporary HTTP 429 without usable timing receives a 30-second cooldown. Waiting is abortable in intervals of at most 60 seconds. Known quota/credit/billing/spending failures and unclassified HTTP 429 stop new direct OpenAI admissions. Resume reconstructs these stops and cooldowns from validated receipt completion times; restarting does not restart an expired wait or clear a terminal stop. Failed tasks are never automatically resubmitted, and corrected cohorts retain earlier calls and uncertain spending under the same task cap. [Measured coverage and financial accounting](../verification/decision-api-benchmark.md) remain separate from these admission rules. [Pacing owner](../../packages/ai/src/rate-gate.ts).

**Reason / tradeoff:** The expanded explicit experiment needs room for 5,388 calls without counting completed cheap requests at their maximum forever. Conservative bounds, exact journal binding, measured-usage settlement and no automatic paid retries preserve the spending boundary. Larger contexts and normal LLM prompts measure new capabilities; they do not alter gameplay defaults or establish natural character quality. [Harness and grading](../../scripts/decision-benchmark/README.md) · [Evidence](../verification/decision-api-benchmark.md).

## Decision escalation limits

The following are implemented bounds, with fallback **enabled by default** for the configured primary origin at Mike’s explicit October 17 request. Explicit configuration can still opt out. Their values are conservative starting points, not measured optima. Deployment delivery and quality gates remain unqualified; [evidence](../verification/decision-escalation.md). [Design](../projects/decision-escalation-tech-design.md) · [DE01–DE05](../maintainers/cognition-redesign.md#decision-escalation). Existing CG08/CG09 and provider/body limits still apply; these entries grant no additional spending or privacy authority.

### DE-L01 — Immediate and delayed deadlines

**Implemented; default apply · Restrictiveness: Safe.** Record an immediate action, continuation or explicit deferral within **1,000 ms** of accepting the semantic opportunity, including preparation, queue and all fast-model stages. An immediate-only task cannot admit an answer for publication after that deadline; actual durable delivery must still be measured. A useful-later task may accept a late primary answer through the delayed checks before its original usefulness deadline; it is never counted as an immediate answer and need not buy a higher model. Native urgent behavior does not wait for AI. This is a response target, not a claim that the current integration meets it or that deferral resolves a choice.

A stronger attempt has a **30-second maximum elapsed lifetime from escalation eligibility**, including queue/preparation; start dispatch within **2 seconds** or end that queued request explicitly. The original task's earlier usefulness deadline always wins. A simulation-time deadline remains separate and can expire sooner at higher game speed. Cancellation/receipt cleanup is separately bounded by its existing owner and cannot extend publication eligibility.

The useful-later root defaults to at most **31 seconds from original intake** (the immediate budget plus higher lifetime); a task may shorten, never lengthen, that envelope. This also bounds waiting for an uncertain primary before escalation becomes eligible. Comparisons are strict: reaching a deadline expires that work. Refresh, provider wait, pause and restart never extend it. [Exact deadline arithmetic](../projects/decision-escalation-tech-design.md#fast-stage-and-immediate-deadline) owns the derived timestamps.

Reason: the selected Low fallback measured 2.66/5.04 seconds in the complete-gap candidate test, with an 18.08-second maximum. The unchanged 30-second limit remains a maximum for useful delayed work, not a gameplay wait or a guarantee. Short queue admission avoids spending on already obsolete choices. Revisit using useful-result timing and starvation/overflow evidence, not by resetting expired deadlines. Owner: [decision flow](../projects/decision-escalation-tech-design.md#decision-flow).

Active-release delivery target: **at least 95.00%** of opportunities declared immediate-only before evaluation receive an admissible resolved choice within one second on the representative deployment workload. Timely deferral is reported separately and does not satisfy that target. Correct/answered accuracy and the timely resolved fraction must not regress relative to fast-only operation. The fresh 48-case local live batch delivered all 12 immediate-only choices correctly within one second; the dense load profile did not qualify representative deployment speed. This prevents a timely deferral or a small unloaded batch from being described as a population-capacity pass.

### DE-L02 — Bounded scheduling and context retention

**Implemented; default apply · Restrictiveness: Very safe.** Initially share **one active optional background-generation slot per server process** with existing background generation; do not add a separate unbounded fallback pool. Allow **16 queued escalation descriptors per process**, at most **one queued or running child per actor**, and at most **8 KiB of scalar/reference metadata per queued descriptor**. Required current execution/accounting records are not discarded on overflow. An execution with unknown completion retains its occupied slot, including across restart through durable attempt links; ending local waiting is not proof that remote work stopped. A definitively completed call with missing price frees execution capacity but retains its financial obligation.

Retain a separate **one-primary-inference execution allowance per process**, including an original request that is still running after its immediate coordination slot is released. Saturation causes native/explicit deferral, never a paid fallback solely to bypass that limit. This preserves the prior effective primary concurrency and prevents the new handoff from creating unbounded remote waiters. Both execution classes reconstruct uncertain leases after restart. No new primary paid stage starts after its immediate deadline.

Queue full, too-old work or oversized metadata ends optional admission with an inspectable reason; it never stalls native simulation or silently erases evidence. Hydrate request bodies only for admitted active preparation, under DE-L04. Distinct player messages and events remain in their normal stores. No payload copies containing hundreds of memories accumulate in the waiting queue.

Eligible decision and maintenance classes alternate when both have work; decisions order by trusted urgency, original eligibility time and stable ID. No preemption of another actor's paid fallback. No queued coalescing across distinct events. Only one existing urgent-evidence refresh is shared across primary and higher preparation before higher reservation, within unchanged deadlines; further change ends stale. These choices favor bounded, understandable behavior over maximizing throughput, and uncertain execution can suspend optional generation until reconciled.

Reason: conservative initial qualification and bounded retained bytes; this is not a large-population capacity claim. Increase the shared allowance only after complete-path tests show foreground/native headroom and provider/account capacity. No new stand-alone performance project is created; DE04 owns this delivery's measurement. Owner: [scheduling](../projects/decision-escalation-tech-design.md#scheduling-without-blocking-other-characters).

### DE-L03 — Attempts, permissions and spending

**Implemented; default apply · Restrictiveness: Very safe.** One higher-model inference per root decision across its attempts/refreshes, **zero tool rounds**, no recursive escalation, automatic same-model retry, third-model substitution or concurrent paid hedging. A changed child ID cannot renew the allowance. Uncertain first dispatch must be reconciled before a higher attempt; confirmed terminal output with unknown price retains its full reserve while any separately funded escalation is considered.

Fallback preparation makes **zero additional paid calls** for attention, embedding, summarization, compaction or grounding. Use existing valid cached/native context or refuse incomplete/oversized preparation. Earlier primary preparation still counts in the root total. Restart ends unfinished gameplay work; it does not authorize an unsent child to start later.

Default apply for the configured primary origin. Dispatch still requires the operator-selected provider/model/effort, permitted reasons and finite existing decision/account limits; explicit off or generation-disabled operation denies it. No extra monthly budget, per-character spending allowance or automatic larger per-call cap is created. Exact request estimates and uncertain commitments share existing reservation/accounting. A bill above an estimate remains a real obligation and prevents further admission as appropriate.

Financial admission retains the existing SQL aggregate over applicable monthly ledger rows. Pending execution and unsent recovery select unfinished attempts before linked records, including before refreshed database statistics, but that does not make the monthly budget aggregate constant-time. DE04 measures a 20,000-attempt history; larger/long-lived account throughput remains unqualified. If admission tails grow materially with that history, extend the existing transactional financial owner with an atomic aggregate and reconciliation, rather than adding a second writable balance in the scheduler.

Reason: limit failure amplification and retain explicit financial authority. This intentionally leaves some questions unresolved. The benchmark's $100 experiment cap does not configure the live game. Owner: [adoption](../projects/decision-escalation-tech-design.md#adoption-and-current-policy).

### DE-L04 — Input, output and retained evidence

**Implemented; default apply · Restrictiveness: Safe.** Reuse current generative admission: **100,000 UTF-8 bytes for instructions plus context**, schema under the existing **65,536-byte** allowance, and the actual configured provider/transport total limits. Allow **8,192 output tokens including reasoning** for the Luna Low fallback request, with task-specific structured output and existing visible-operation bounds; a narrower verified model/route limit wins. The current 100,000-byte limit can exclude large required histories despite the model's advertised context capacity.

There is **no new universal cap on the number of character meters or stored memories**. Select evidence before hydration through current actor-scoped retrieval and byte admission. Required relevant constraints, accepted identity and protected evidence cannot be dropped to make room; complete overflow refuses before new inference. Optional selection reports coverage. Existing retrieval pre-selection work and storage growth limits remain in [memory](memory.md) and [cognition](cognition.md); small returned output does not bound those scans.

Reason: retain current preparation/privacy contracts while admitting enough reasoning for a meaningful comparison. This output allowance is provisional, not measured optimal latency or a change to all ordinary generation. A finite request cap does not cap historical accounting retention; its existing indexed owners and retention rules remain authoritative. Owner: [context](../projects/decision-escalation-tech-design.md#context-and-prompt).

### DE-L05 — Quality routing and enabled consumers

**Implemented; default apply · Restrictiveness: Safe.** Initial enabled reasons are explicit semantic escalation/abstention, supported native rejection, confirmed unusable completed output and independently recoverable definitive provider admission failure. Task-specific closeness/confidence thresholds remain **disabled until held-out qualification**; no universal accuracy-confidence threshold is selected. Keep existing suitability policy distinct.

Offered-action selection, structured responses, opted-in appraisal and exact scoped choice/rating/likelihood/optional-relevance readers have implemented consumers. Their qualification is tracked in DE03; the scoped readers do not themselves execute gameplay effects. No automatic tools, mind-file changes or new world laws follow.

Decision-time appraisal changes require an explicit installed `decision` permission, separate from reflection, checked by the native owner. The bundled interpreted fear/anger definitions enable it; other definitions retain their own permissions, including source-linked grief's reflection permission and disabled decision permission. An opted-in authored fixture qualifies the existing source-bound mechanism without establishing general emotional appropriateness. A partially committed response group cannot be regenerated; only predeclared independent unresolved groups on an escalation-permitted route can use its remaining higher attempt. Detailed fallback contracts and acceptance cases remain in the [technical design](../projects/decision-escalation-tech-design.md#deterministic-acceptance-examples).

**Selected independent emotional review; unimplemented.** [EP-C08](../projects/emotional-physiology-tech-design.md#ep-c08--independently-selectable-emotional-review) requires its own review permission and exact opportunity. The dedicated route permits one finite Jev request under existing spending, execution and useful-later limits, without paid preparation, escalation or an extra urgent slot. Compatible ordinary requests may include due components. Review-only acknowledgement preserves ordinary evidence. [FL28–FL30](feelings.md#fl28--finite-adaptive-review-policy) own the new envelopes; [EP](../maintainers/emotional-physiology.md) owns qualification. Ordinary fallback limits remain unchanged.

The quality release gate requires a **95.00% episode-grouped interval** whose lower bound for paired weighted-point improvement exceeds zero, without reduced answer/delivery coverage. [Qualification](../projects/decision-escalation-tech-design.md#qualification-and-rollout) owns the complete comparison and human-review procedure; DE-L01 owns immediate delivery. This conservative production-release evidence requirement prevents claiming qualification from a noisy positive average or from excluding rejected bad proposals. Mike separately authorized current default activation on October 17; that decision does not establish the broader release gate. It is not a runtime confidence cutoff.

Reason: protect a clear useful path without claiming semantic verification of all subjective answers. The inspector must show which checks apply and when no check can establish correctness. Native arithmetic is removed from model routing only when the installed native owner actually supplies the answer; the synthetic answer key grants no runtime computation. Owner: [facts, policy and judgments](../projects/decision-escalation-tech-design.md#separate-facts-policy-and-model-judgments).

## Historical provider context

The original audit cited Jev provider allowances of 64,000 tokens per complete request and 32,000 for shared state plus the longest question, versus the local estimated targets of 55,000 and 28,000 (LA046/LA047, four characters per token). These are historical source claims, not freshly verified provider specifications. Recheck the provider contract before changing margins; the 255-option bound is per multiple-choice question, not a question-count cap.

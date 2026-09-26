# AI execution and spending: limits and constraints

[Feature contract](../ai-providers.md) · [Implementation work](../maintainers/macrofold-worker-api.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [validation.ts](../../packages/ai/src/validation.ts), [embedding.ts](../../packages/ai/src/embedding.ts), [config.ts](../../apps/server/src/config.ts).

## LA046

**Historical — needs recheck · Restrictiveness: Safe.**

A Jev request's shared facts and all questions together are locally limited to 220,000 characters, estimated as 55,000 tokens.

**Reason / tradeoff:** Keep protection for Jev's real 64,000-token total limit, but improve token estimates and split optional questions when necessary.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA047

**Historical — needs recheck · Restrictiveness: Safe.**

A Jev request's shared facts plus its longest individual question are locally limited to 112,000 characters, estimated as 28,000 tokens.

**Reason / tradeoff:** Keep protection for Jev's real 32,000-token shared-facts-plus-question limit, and report which part makes an oversized request fail.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA048

**Historical — needs recheck · Restrictiveness: Medium.**

One Jev multiple-choice question may offer between 2 and 255 answer options.

**Reason / tradeoff:** Keep the question-format restriction; it limits answers within one question, not the number of questions in the request.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA049

**Historical — needs recheck · Restrictiveness: Medium.**

One Jev scoring question uses between 2 and 10 described score levels.

**Reason / tradeoff:** Keep the scoring-format restriction; it does not impose a ten-question limit on a request.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA050

**Historical — needs recheck · Restrictiveness: Medium.**

The internal label identifying a question in a Jev request must contain 1–64 characters.

**Reason / tradeoff:** Keep question labels bounded and consistent with the labels used to match returned answers.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA051

**Historical — needs recheck · Restrictiveness: Medium.**

Validation allows probability totals and winning-choice comparisons to differ by 0.005 due to rounding; score averages have a tolerance of 0.01 times the number of score levels.

**Reason / tradeoff:** Keep small rounding allowances while rejecting model results whose numbers contradict their selected answers.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA052

**Historical — needs recheck · Restrictiveness: Safe.**

The generic AI request encoder permits at most 20,000 nested values, 20,000 entries in any array and 32 levels of nesting.

**Reason / tradeoff:** Allow supported large requests to pass the value-count check, while retaining protection against excessively complex nested input.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Expand**.

## LA053

**Historical — needs recheck · Restrictiveness: Safe.**

The generic AI client accepts requests of 500,000 bytes by default, configurable up to 1,048,576 bytes.

**Reason / tradeoff:** Align this network-payload limit with the actual model input allowance so a valid request is not rejected by an unrelated smaller check.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA054

**Historical — needs recheck · Restrictiveness: Safe.**

The generic AI client accepts responses of 262,144 bytes by default, configurable up to 2,097,152; the game configures 500,000 bytes.

**Reason / tradeoff:** Keep a download-size guard that accommodates every response the game explicitly allows the model to generate.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA055

**Historical — needs recheck · Restrictiveness: Liberal.**

The generic AI client defaults to 2,048 output tokens, allows configuration up to 16,384, and is configured by the game with an 8,192-token default.

**Reason / tradeoff:** Choose output limits by task and model, with spending reserved before generation; do not assume these defaults describe every call.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA056

**Historical — needs recheck · Restrictiveness: Safe.**

The generic AI client waits 20 seconds by default, with a configurable maximum of 120 seconds.

**Reason / tradeoff:** Keep finite waiting times, but report whether a timeout might have occurred after the provider already started billable work.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Review**.

## LA057

**Historical — needs recheck · Restrictiveness: Medium.**

The fallback name for the response-format definition sent to a model is cut to 64 characters.

**Reason / tradeoff:** Keep short format names; this should never truncate the actual instructions, game facts or generated response.

[Implementation starting point](../../packages/ai/src/validation.ts).

Original recommendation: **Keep**.

## LA093

**Historical — needs recheck · Restrictiveness: Safe.**

The numerical representation used for meaning-based search defaults to 512 numbers per text and accepts configurations from 64 to 3,072.

**Reason / tradeoff:** Keep a finite representation size and change it only when retrieval quality or storage measurements justify a different choice.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA094

**Historical — needs recheck · Restrictiveness: Safe.**

One request to the service that converts text into numerical representations for meaning-based search accepts at most 33 text strings.

**Reason / tradeoff:** Keep a per-request batch allowance; process additional texts in later batches rather than limiting the searchable collection to thirty-three.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Keep**.

## LA095

**Historical — needs recheck · Restrictiveness: Safe.**

Requests to convert text into numerical representations for meaning-based search allow 8,000 bytes per text and 64,000 bytes per batch; action indexing packs batches to 60,000 bytes.

**Reason / tradeoff:** Align these size checks so a supported text or action description is not accepted by one stage and rejected by the next.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Review**.

## LA096

**Historical — needs recheck · Restrictiveness: Liberal.**

A downloaded response from the service that converts text into numerical representations for meaning-based search is limited to 2,000,000 bytes.

**Reason / tradeoff:** Keep a download-size guard that is large enough for the configured batch count and number of values per vector.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Review**.

## LA097

**Historical — needs recheck · Restrictiveness: Safe.**

The client that requests numerical text representations for meaning-based search waits 15 seconds by default, unless its caller supplies another timeout.

**Reason / tradeoff:** Keep a finite wait for optional search preparation and preserve directly retrieved required facts when the service is unavailable.

[Implementation starting point](../../packages/ai/src/embedding.ts).

Original recommendation: **Review**.

## LA182

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The configured per-agent AI allowance defaults to $50 and is clamped to $50 even though configuration parsing accepts values up to $100.

**Reason / tradeoff:** Removed the hidden $50 spending-configuration clamp. Configuration now honors the existing $0–$100 range; the $50 default and actual spending authorization/reservation remain.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Completed removals**.

## LA183

**Historical — needs recheck · Restrictiveness: Safe.**

Default cost reservations are $0.005 per Jev call, $0.01 per call that prepares text for meaning-based search and $0.08 per text-generation model call; configuration ranges also impose per-call maximums.

**Reason / tradeoff:** Estimate and reserve each call's cost before starting it, and align reservation limits with the actual request and authorized spending.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA184

**Historical — needs recheck · Restrictiveness: Safe.**

Direct-model accounting reserves at least $0.25 per generation and keeps room for two text-generation calls, three relevance or classification judgments and one call to prepare text for meaning-based search for an interactive response.

**Reason / tradeoff:** Reduce unnecessarily large reservations using the actual planned calls without allowing background work to consume the money needed to answer the player.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA185

**Historical — needs recheck · Restrictiveness: Safe.**

Some cost reservations assume up to 120,000 input tokens and 8,192 output tokens.

**Reason / tradeoff:** Base reserved cost on the admitted request's actual maximum sizes instead of unrelated worst-case constants where practical.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA186

**Historical — needs recheck · Restrictiveness: Safe.**

The game's configured AI-call timeout defaults to 35 seconds and accepts values from 5 to 120 seconds.

**Reason / tradeoff:** Keep finite waiting times while distinguishing a definite pre-execution rejection from a timeout after billable work may have started.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA187

**Historical — needs recheck · Restrictiveness: Medium.**

A Macrofold remote-model run has a default spending allowance of $0.25, configurable from $0.000001 to $10.

**Reason / tradeoff:** Keep a per-run spending ceiling and change its value only within the owner's authorized total budget.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA188

**Historical — needs recheck · Restrictiveness: Medium.**

Macrofold remote-compute spending is disabled by a $0 default allowance, configurable up to $100.

**Reason / tradeoff:** Keep explicit authorization before creating paid remote workers, regardless of what model inference itself costs.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA189

**Historical — needs recheck · Restrictiveness: Safe.**

Macrofold remote runs and queue waits default to a 300-second timeout, configurable from 5 to 300 seconds.

**Reason / tradeoff:** Keep a finite remote-work deadline and expose queue delay separately from model execution time.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA190

**Historical — needs recheck · Restrictiveness: Safe.**

The complete prompt for the Macrofold full-cognition workflow cannot exceed 98,000 serialized characters.

**Reason / tradeoff:** Align this prompt-size check with the remote service's actual allowance and the game's other model-input checks.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA191

**Historical — needs recheck · Restrictiveness: Safe.**

Macrofold Jev calls request 64 output tokens per question, with a minimum of 1,024 and maximum of 16,384 tokens.

**Reason / tradeoff:** Ensure the permitted questions have enough answer space, and split work if the output ceiling is reached before the input ceiling.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA192

**Historical — needs recheck · Restrictiveness: Liberal.**

The Macrofold API client limits request bodies to 500,000 bytes, response bodies to 1,000,000 bytes and ordinary calls to 30 seconds by default.

**Reason / tradeoff:** Keep network-size and wait protections while aligning them with the remote operations the game officially supports.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA194

**Historical — needs recheck · Restrictiveness: Safe.**

Macrofold event, resource and model listings request pages of 100 records, and billing inspection stops after 10 pages.

**Reason / tradeoff:** Fetch further pages when complete discovery is required, or clearly report that inspection stopped before all records were read.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA195

**Historical — needs recheck · Restrictiveness: Safe.**

Macrofold status checks run every 500 milliseconds, remote file checks every 300 milliseconds, and inspection calls use 10-second timeouts.

**Reason / tradeoff:** Keep polling frequent enough for responsiveness without repeatedly querying a remote service faster than useful information changes.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Keep**.

## LA196

**Historical — needs recheck · Restrictiveness: Medium.**

Configuration rejects provider token prices above $1,000 per million tokens.

**Reason / tradeoff:** Treat the price ceiling as a configuration sanity check and do not confuse it with the authorized amount the game may spend.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## Historical provider context

The original audit cited Jev provider allowances of 64,000 tokens per complete request and 32,000 for shared state plus the longest question, versus the local estimated targets of 55,000 and 28,000 (LA046/LA047, four characters per token). These are historical source claims, not freshly verified provider specifications. Recheck the provider contract before changing margins; the 255-option bound is per multiple-choice question, not a question-count cap.

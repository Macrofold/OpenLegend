# AI providers

`@open-legend/ai` is a server-only HTTP boundary with two independent methods: `judge` for Jev and `generate` for OpenAI Responses. It imports Node utilities and must never be bundled into the browser. No credentials, fabricated answers, fixture fallbacks, automatic retries, scheduled work, or budget storage are built into the package. Tests inject HTTP responses explicitly.

The game server owns routing, fresh context assembly, audience restrictions, request deduplication, durable reservations, cancellation, model eligibility, and validating proposals before world changes. A valid JSON result establishes its shape, not its truth, safety, or applicability to the current world. Native known actions need neither method. Jev can select among supplied routes or rate supplied evidence; conversation, thoughts, and novel declaration drafts require the generator. The server also implements a Macrofold backend; a configured `MACROFOLD_API_KEY` selects it ahead of direct providers. The direct client described below remains a separate adapter. Current live full deliberation requires Macrofold and fails explicitly without it.

## Current Macrofold routes

Macrofold uses `POST /v1/inferences` with only `model_binding`, native provider `input`, and `limits`. Jev input is `{state, questions}` with independent named choice/score questions; it is never encoded as a Cartesian product of choices. Default synchronous 200 and asynchronous/replayed 202 share durable run handling. Answers come from `result.inference.value.answers`. Generative input uses native messages and strict JSON Schema. BYOK puts `provider_connection_id` inside `model_binding`; local Jev and generation use the configured saved OpenRouter connection, with no managed fallback.

The server routes level 2 to mini/low, levels 3/4 to complex/low or high, and cleanup to nano. Reflection uses the full harness with fresh sessions, actor-scoped `mind/*.md` grants and independent PostgreSQL publication; shell and unrelated tools remain denied. Model aliases and actual reported revisions appear in receipts. Per-call monetary/output/time limits remain explicit, and no paid retry occurs automatically.

`jev-questions.ts` separates relevance, immediate complexity, lasting significance and invention admissibility/mechanism. One attention request contains as many candidate questions as its serialized size budget allows; routing asks route and reflection together; invention asks admissibility and route together. Useful contradictory evidence must survive relevance selection. A provider confidence field is not the same as a selected answer's probability. Invention remains conservatively gated; routing never grants domain authority.

Reported BYOK provider costs are distinct from zero platform model charges. Complete harness usage rows supply token/cost receipts when available; missing or ambiguous billing retains the admitted reserve and can be reconciled later. The grouped god debugger links actual provider input/output to trigger, recall, route and committed outcome. Live synthetic examples and limitations remain in [TODO](maintainers/TODO.md).

## Shared Worker setup and cutover

Native full cognition, reflection and creator conversations require `MACROFOLD_WORKER_ID`, selected by the application/world compute owner. The caller sends that same top-level `worker_id` with each native Run; actor Worktrees and Sessions remain independent. OpenLegend does not create, discover, resume, pause, replace or destroy Workers. A missing setting disables only native execution, not `/v1/inferences`.

```dotenv
MACROFOLD_WORKER_ID=<existing-authorized-worker-uuid>
MACROFOLD_RUN_MAX_USD=0.25
```

Create or select the Worker in Macrofold using a separate owner/admin credential. Inspect `/v1/worker-offerings`, the accepted offering/rates and effective limits before enabling traffic. Configure the trust boundary, isolation, capacity, idle policy, credit and compute-rate ceiling deliberately. Preserve `isolate_runs: true` unless the owner explicitly authorizes mutually trusted sharing; sharing a Worker does not itself require disabling isolation. Use a zero baseline for demand-driven sleep, or an explicitly funded baseline for sustained traffic. See the upstream [Worker guide](https://github.com/Macrofold/Macrofold/blob/feat/worker-economics-autoscaling/docs/features/execution/workers.md) for fields and lifecycle rules.

The runtime key needs `workers:use` for the selected Worker plus its existing Run, Workspace, Session and file permissions. Worker authorization does not grant file/tool authority. The caller does not need `workers:write` or `workers:read`: it neither manages compute nor gates submission on a Worker read. The separate operator needs `workers:read` to inspect and administrative `workers:write` to manage the Worker. Worker-ID restrictions and Workspace restrictions remain independent.

**Worker compute is a separate owner-managed expense.** `AI_BUDGET_USD` continues to admit per-agent calls and conservatively retain unpriced reservations; `MACROFOLD_RUN_MAX_USD` caps a Run, not shared capacity. Neither setting caps the Worker's idle/allocation spend. The removed `MACROFOLD_COMPUTE_MAX_USD` was a finite per-Sandbox allowance, not an hourly Worker ceiling; it is not read or converted. Set Worker limits and account credit controls in Macrofold and inspect compute usage by `worker_id`; do not count shared allocation costs once per actor or refund old holds as zero.

Submit a Run directly to an enabled sleeping Worker, then observe the accepted Run's status/result and queue deadline. Reading a Worker does not wake it. The existing `queue_if_busy: false` prevents same-Worktree follow-ups; it does **not** disable Worker-capacity queuing. Independent Worktrees may share capacity concurrently. Full cognition/reflection use fresh Sessions, whereas creator conversation turns keep their existing Session.

Closing a creator conversation aborts its local wait, durably fences that conversation and cancels only its known Run. A late acceptance with a returned Run ID is cancelled; an admission whose response is lost remains blocked for reconciliation of the original request rather than paid replay. Another actor's Run, the shared Worker and published Worktree/Session state are not destroyed. Server shutdown also performs no Worker lifecycle operation. A manual pause, expiration or destruction needs an explicit owner action; there is no replacement Worker or automatic-execution fallback.

For the server/caller cutover, stop old native admissions and drain old Sandbox allocations **before** removing their API. Reconcile uncertain launches and financial obligations, and preserve the database's operational records as well as verified files and Sessions. Deploy the matching Macrofold Worker contract and this caller together, then set the approved Worker ID. Do not reset worlds, reinterpret saved Sandbox IDs as Worker IDs, clear billing history or run the removed `macrofold-resume-setup.ts` script against the new API. Existing actor provisioning keys and timeline-scoped conversation mappings are unchanged; old Sandbox metadata remains historical and is ignored by native routing.

Changing `MACROFOLD_WORKER_ID` is an explicit operator reconfiguration, not automatic recovery. Drain/reconcile outstanding work before restarting with another target; saved verified Sessions can continue on an authorized compatible Worker. Lost/ambiguous Run requests are still fenced by their original journal/fingerprint, including the originally requested target. The current server supplies one trusted configuration per world; unrelated worlds/customers must not inherit a shared target or relaxed isolation accidentally.

Implementation and remaining live-deployment gates: [MW01–MW04](maintainers/macrofold-worker-api.md). Local HTTP and build evidence: [Worker API cutover](verification.md#macrofold-worker-api-cutover).

## Configuration and interface

Construct the client in trusted server code. Read keys from the server environment or a server secret store; never pass them through game requests, browser configuration, saved world state, telemetry, or receipts. Omitting a provider or supplying an empty key returns `unavailable` without dispatching. Configured endpoints require HTTPS; redirects are rejected. Endpoint configuration is privileged, since it determines where credentials and context go.

```ts
import { createAiClient } from '@open-legend/ai';

const ai = createAiClient({
  jev: {
    apiKey: process.env.TYPESAFE_API_KEY ?? '',
    model: 'jev-1.13.0',
    prices: { inputUsdPerMillion: 0.042, outputUsdPerMillion: 0 },
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: 'gpt-5.6-luna',
    reasoningEffort: 'low',
    prices: {
      inputUsdPerMillion: 0.2,
      cachedInputUsdPerMillion: 0.02,
      cacheWriteInputUsdPerMillion: 0.25,
      outputUsdPerMillion: 1.2,
    },
  },
  timeoutMs: 20_000,
  maxRequestBytes: 28_000,
  maxOutputTokens: 1800,
});
```

These price examples are standard short-context API rates checked **2026-09-19**, not prices embedded in the adapter. Jev lists $0.042 per million input tokens and free output. OpenAI lists Luna input/cached-input/cache-write/output rates of $0.20/$0.02/$0.25/$1.20 per million tokens. Recheck rates when changing providers, models, context limits, endpoints, or processing tiers. [Jev models](https://docs.typesafe.ai/models), [OpenAI API pricing](https://developers.openai.com/api/docs/pricing).

Luna is the initial configurable candidate for focused generation; model selection still requires task-specific quality evaluation. The adapter defaults to `gpt-5.6-luna` and Jev `jev-1.13.0`, and sends OpenAI `service_tier: "default"`. Regional/long-context/fast processing charges are not modeled automatically. [Luna model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

Both methods accept `requestId`, optional `signal`, and optional `deadlineMs` as an **absolute Unix millisecond timestamp**. The earlier of that deadline and the client timeout applies, including response-body reading. Default request/response caps are 65,536/262,144 bytes and default output cap is 2,048 tokens. A request-specific output limit cannot exceed its client cap. JSON depth and node limits also apply. There is no provider-side deadline or exactly-once promise: cancellation stops waiting locally but may follow provider completion or billing.

```ts
const judgment = await ai.judge({
  requestId: 'job-123',
  state: { observation: 'A rigid metal helmet covers the target’s head.' },
  questions: {
    route: {
      type: 'choice',
      instructions:
        'Choose the applicable supplied route. Select unknown if the evidence is insufficient.',
      criteria: {
        known: 'An already declared rule fully covers this interaction.',
        novel: 'The interaction needs a new declaration.',
        unknown: 'The supplied evidence is insufficient to decide.',
      },
    },
  },
});

const generated = await ai.generate<{ text: string }>({
  requestId: 'job-124',
  task: 'thought',
  instructions: 'Write one short thought grounded in the supplied observations.',
  context: { observations: ['I am hungry.'] },
  schema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
    additionalProperties: false,
  },
});
```

The routing example illustrates transport structure; production context must include declared capabilities and the actual evidence needed for that decision. A helmet description alone cannot establish native rule coverage.

## Provider behavior and limits

Context/action relevance uses one Noul per candidate with the shared rubric in `state.attentionPolicy`; each short question explicitly references its candidate because question keys are not model input. Noul directly supplies P(yes), without repeated yes/no option descriptions. [Noul documentation](https://docs.typesafe.ai/primitives/noul).

Jev uses `POST https://api.typesafe.ai/v1/systemone` with bearer authentication and `{model,state,questions}`. Choice returns an option, probability distribution, and confidence; Score returns a rubric position, legend, distribution, and confidence; Noul returns a value between zero and one. Question IDs are bookkeeping, so instructions must carry the complete question. This adapter supports text instructions and string rubric descriptions, a deliberately narrower subset of the provider’s structured-instruction features. [HTTP API reference](https://docs.typesafe.ai/api).

The client requires at least one question but imposes no question-count maximum; Choice admits 2–255 options and Score 2–10 levels. Jev documents a 64k total context and a 32k state-plus-longest-question limit. We conservatively estimate four characters per token and allow 55k total and 28k state-plus-longest-question; this is a heuristic, not tokenizer-exact accounting. Oversize requests fail locally with explicit reasons before dispatch. [Model limits](https://docs.typesafe.ai/models). Score levels start at zero, and interpolation is a rubric position, not a physical constant or calibrated outcome probability. [Score documentation](https://docs.typesafe.ai/primitives/score).

All expected answer keys, answer types, choice membership, numeric ranges, and distributions are checked. Distribution sums allow 0.005 rounding tolerance. The generic transport does not impose a universal confidence threshold: callers must evaluate task-specific thresholds and explicit unknown options. An option named `unknown` remains a successful typed value so the domain can distinguish semantic abstention from service failure. Confidence does not prove correctness. [Confidence documentation](https://docs.typesafe.ai/confidence).

OpenAI uses `POST https://api.openai.com/v1/responses` with bearer authentication, `store:false`, no tools or conversation continuation, and strict `text.format` JSON Schema. The caller’s trusted schema must have an object root, require all properties, and use `additionalProperties:false` for every object. Nullable properties and nested `anyOf` branches are supported. Local Ajv validation performs no coercion, default insertion, or mutation. References and remote schema loading are rejected. Only server-authored schemas belong here; bounded schema size does not make arbitrary regular expressions or validators safe to accept from players. [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

The decoder scans message output beyond reasoning entries, handles refusals, rejects incomplete/invalid output, then validates generated JSON locally. It does not expose provider error bodies or raw exception text. `store:false` is a request setting, not a promise of zero provider retention; retention requirements must be assessed separately. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Receipts, outcomes, and accounting

Results are a discriminated union: `{outcome:'value',value,receipt}` or `{outcome,reason,receipt}`. Failure outcomes are `unavailable`, `invalid`, `failed`, `refused`, `cancelled`, and `uncertain`; `unknown` is reserved for adapters with explicit semantic abstention. These adapters preserve Jev’s unknown option instead. Reasons are stable short codes rather than provider messages.

Receipts include request ID, provider, requested and reported model, timestamps, latency, dispatch status, completion uncertainty, context SHA-256, and the actual JSON request SHA-256 when assembled. Hashes are canonical exact-input identifiers; they neither prove equivalent meaning nor prevent stale-state reuse. Receipts contain no prompts or keys. Provider-reported models are recorded as reported, including aliases; absent model metadata leaves `modelVersionStatus:'unavailable'`. Callers should reject incompatible model changes rather than interpret metadata as a guarantee of immutable weights.

Authentication/model unavailability and rate limits return `unavailable`. Rejected request schemas and malformed/oversized results return `invalid`. Transport failure, timeout after dispatch, HTTP 408/most 5xx responses, or unfinished generation can leave completion uncertain. Caller cancellation after dispatch is `cancelled` with `completionUncertain:true`. No outcome triggers a retry or fallback inside this package.

Token usage is optional and validated as nonnegative integer counters. `estimatedCostUsd` is present only when usable reported usage and explicit rates are available. Cached and cache-write tokens are subsets of input tokens; reasoning tokens are already part of output tokens. Ordinary input rate is a conservative fallback for an omitted cached-input rate, but reported writes require an explicit write rate. Missing/invalid usage or prices means **unpriced**, never zero cost.

The server must reserve a conservative upper bound before dispatch and retain that bound when usage is unavailable or completion is uncertain. The floating-point estimate is not a billing ledger; the server stores conservative integer microdollars and reconciles invoices separately. Reject untrusted requests before reserving expensive work, but do not release a dispatched reservation merely because its response failed validation.

## Verification

Run `pnpm exec vitest run packages/ai/src/client.test.ts`. Injected HTTP fixtures cover both request shapes; Choice/Score/Noul; nullable generated schemas; refused, incomplete, malformed, and oversized responses; missing configuration; invalid schema references; cost estimation; transport failures; deadline and cancellation behavior; stalled bodies; canonical digests; and no automatic retry. No live or paid calls were made during implementation. Passing fixtures verifies protocol handling, not vendor availability, real model quality, observed latency, or calibrated routing accuracy.

The configured Macrofold inference transport also limits output to 16,384 tokens. Jev output allowance scales with question count up to that transport ceiling. A route may impose stricter context admission than Jev's published limits; report rejection and use the permitted context fallback, without automatic paid retry. Definitive admission rejections, including HTTP 413, are undispatched provider work rather than uncertain execution.

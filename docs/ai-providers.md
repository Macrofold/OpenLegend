# AI providers

`@open-legend/ai` is a server-only HTTP boundary with two independent methods: `judge` for Jev and `generate` for OpenAI Responses. It imports Node utilities and must never be bundled into the browser. No credentials, fabricated answers, fixture fallbacks, automatic retries, scheduled work, or budget storage are built into the package. Tests inject HTTP responses explicitly.

The game server owns routing, fresh context assembly, audience restrictions, request deduplication, durable reservations, cancellation, model eligibility, and validating proposals before world changes. A valid JSON result establishes its shape, not its truth, safety, or applicability to the current world. Native known actions need neither method. Jev can select among supplied routes or rate supplied evidence; conversation, thoughts, and novel declaration drafts require the generator. The server also implements a Macrofold backend; a configured `MACROFOLD_API_KEY` selects it ahead of direct providers. The direct client described below remains a separate adapter. Current live full deliberation requires Macrofold and fails explicitly without it.

## Jev-only execution

`AI_JEV_ONLY=true` permits known action selection while disabling generative replies, reflection, narration generation, conversation-summary generation and paid embeddings. Guards reject generation before provider dispatch; no automatic generative fallback repairs uncertainty. Direct Jev credentials or the configured Macrofold connection suffice. Existing native plan continuation remains zero-call.

The current `cognition-questions-v11` level-1 path batches independent Noul judgments over permitted known actions. Non-speech triggers prepare those actions first and rate them in the routing request; speech triggers route first and rate them in a dependent second request. Questions assess concrete progress on a current need or goal, with explicit positive/negative criteria separating useful preparation from unavailable prerequisites, pointless repetition and ordinary uncertainty of success. Action descriptions identify purpose, equipment and the finite attempt; the approved comparison follow-up adds short tool descriptions, compact native combat capabilities and world-permitted visible animal health without restoring the separate game-mechanics paragraph. It selects the highest score at or above **0.7**, preserving deliberate continue separately. Below that, the decision escalates to an offered generative level when generation is enabled and otherwise defers with an explicit reason; missing or invalid ratings defer without escalation. In this Jev-only mode every such decision therefore defers. An exact offered equipment prerequisite can become an ordinary two-step plan; unrelated ratings never compose actions. Novel goal text, speech and proposals still need generation when enabled. [The runtime contract](../archive/07-technical-architecture/agent-agency-runtime.md#24-level-1-selection-without-generative-escalation) owns admission; [CG05](limits/cognition.md#cg05) records the provisional threshold.

[Live trials](verification/embodied-survival.md#renewed-jev-only-diagnosis-and-hunting-demonstration) demonstrate eating/gathering comparisons and spontaneous knife hunting with miss-aware retries, without seeded operational goals or generation. The [final minimal-context trials](verification/embodied-survival.md#minimal-context-and-equipment-derived-hunting) retain deer hunting and a later retry, while also exposing unarmed preference and delayed reconsideration. The later [complete-meal qualification](verification/embodied-survival.md#complete-jev-only-meals) demonstrates Jev-selected hare/deer harvesting, cooking and eating with real knife/spear/bow outcomes. Individual decisions used two calls, or three when memory selection ran; native equip, movement and execution add none. This establishes working scenarios, not calibrated reliability, novel goal formation or learned activity reuse.

## Current Macrofold routes

Macrofold uses `POST /v1/inferences` with only `model_binding`, native provider `input`, and `limits`. Jev input is `{state, questions}` with independent named choice/score questions; it is never encoded as a Cartesian product of choices. OpenLegend requests asynchronous admission with `Prefer: respond-async` so available provider scheduling can queue inference instead of refusing a busy synchronous slot. Synchronous 200 and asynchronous/replayed 202 share durable run handling; the original request deadline and cancellation remain in force. Answers come from `result.inference.value.answers`. Generative input uses native messages and strict JSON Schema. BYOK puts `provider_connection_id` inside `model_binding`; local Jev and generation use the configured saved OpenRouter connection, with no managed fallback.

The server routes level 2 to mini/low, levels 3/4 to complex/low or high, and cleanup to nano. The requested model, reasoning effort and output ceiling are forwarded unchanged: direct Responses bodies are fixture-verified, while Macrofold inference forwarding is established by code inspection only (its `execution` selects Macrofold reasoning parameters; the direct API has no equivalent field). The reflection harness ignores per-request model/effort and uses its configured model and effort. [CG08](limits/cognition.md#cg08) sets independent per-level limits. Reflection uses the full harness with fresh sessions, actor-scoped `mind/*.md` grants and independent PostgreSQL publication; shell and unrelated tools remain denied. Model aliases and actual reported revisions appear in receipts. Per-call monetary/output/time limits remain explicit, and no paid retry occurs automatically.

Direct player/NPC conversations on the qualified Macrofold fast/complex inference route can deliver the complete validated first speech operation before the remaining decision finishes. The request includes `stream: true`; only the deployed direct-inference output channel is decoded. Accepted Run identity is recorded before progress, and its normal terminal inference result supplies final validation and accounting. Interrupted non-replayable delivery withdraws the preview and observes the same accepted Run through existing polling; it never submits another inference. Callback/browser errors cannot interrupt receipt observation. Stream frames are omitted from diagnostic body capture; normal final typed results/receipts remain recorded. [NP05 evidence](verification/npc-reply-preview.md) separates the passing ordinary-route gate from browser and fixture results.

Structured preview parsing uses exact-pinned [`@streamparser/json` 0.0.26](https://github.com/juanjoDiaz/streamparser-json), with partial-token/value emission disabled and only the server-selected first operation assembled. Its incremental parser owns JSON syntax and completion. A small AI-layer wrapper enforces the existing byte/depth/key bounds, rejects decoded duplicate keys and unsupported root fields throughout the document, and rejects nonfinite numbers and lone surrogates. The server still strictly validates the complete speech operation and current recipient/hearing before showing it. No JSON repair, custom alternate parser or additional inference is retained; parser references are released on decoding failure or completion. [NPV01](limits/interface.md#npv01--private-npc-reply-preview) owns the unchanged bounds.

Direct Responses generation, full-harness structured calls, invention/workshop explanations and private/background callers retain completed-value delivery and are not qualified by this slice. Jev uses its native question protocol; Mike authorized correcting the local decision setting to `typesafe/jev-1.13`, without changing generation models or routes. [NC19](maintainers/narration-and-conversations.md#nc19--progressive-display-of-structured-conversation-replies) retains broader caller qualification.

`jev-questions.ts` separates relevance, immediate complexity, lasting significance and invention admissibility/mechanism. One attention request contains as many candidate questions as its serialized size budget allows; routing asks route and reflection together; invention asks admissibility and route together. Useful contradictory evidence must survive relevance selection. A provider confidence field is not the same as a selected answer's probability. Invention remains conservatively gated; routing never grants domain authority.

Reported BYOK provider costs are distinct from zero platform model charges. Complete harness usage rows supply token/cost receipts when available; missing or ambiguous billing retains the admitted reserve and can be reconciled later. Inspector reconciliation of current-timeline World Agent messages reads their exact receipt from the accounting repository when reply diagnostics omit it; complete usage and a confirmed terminal Run are still required. The grouped god debugger links actual provider input/output to trigger, recall, route and committed outcome. Live synthetic examples and limitations remain in [TODO](maintainers/TODO.md).

## Scoped World Agent connection access

An operator approves the world MCP connection's tool ceiling. OpenLegend keeps organization-wide access off and creates an exact workspace grant for each tool-profile-specific creator conversation before paid Run admission. The workspace permissions still select only that profile's tools; a connection grant never broadens the immutable profile or permits unapproved world changes.

The existing provisioner journals the access revision, conditional request and operation identity before dispatch. Lost responses retain that exact identity; retries use the original body and `If-Match`. A confirmed stale revision refuses before paid admission and permits a later explicit request to reread the operator's current ceiling. Successfully recorded grants are not automatically recreated after operator revocation. Native authoring still requires approval of an exact prepared change; tool availability is not approval to apply it. [Local qualification](verification/macrofold-worker.md#scoped-local-authoring-completion--october-3-2026) records matching Macrofold source/runtime, bounded read-only native execution and actual unapproved-plan denial. Hosted/multi-process gates remain MW04.

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

Closing a creator conversation aborts its local wait, durably fences that conversation and cancels only its known Run. Cancellation is checked immediately before dispatch; a cancelled request is not sent and does not consume its reservation. Closure does not abort an already-sent admission request, so a late acceptance returns its Run ID and is cancelled; an admission whose response is lost remains blocked for reconciliation of the original request rather than paid replay. Another actor's Run, the shared Worker and published Worktree/Session state are not destroyed. Server shutdown also performs no Worker lifecycle operation. A manual pause, expiration or destruction needs an explicit owner action; there is no replacement Worker or automatic-execution fallback.

For the server/caller cutover, stop old native admissions and drain old Sandbox allocations **before** removing their API. Reconcile uncertain launches and financial obligations, and preserve the database's operational records as well as verified files and Sessions. Deploy the matching Macrofold Worker contract and this caller together, then set the approved Worker ID. Do not reset worlds, reinterpret saved Sandbox IDs as Worker IDs, clear billing history or run the removed `macrofold-resume-setup.ts` script against the new API. Existing actor provisioning keys and timeline-scoped conversation mappings are unchanged; old Sandbox metadata remains historical and is ignored by native routing.

Changing `MACROFOLD_WORKER_ID` is an explicit operator reconfiguration, not automatic recovery. Drain/reconcile outstanding work before restarting with another target; saved verified Sessions can continue on an authorized compatible Worker. Lost/ambiguous Run requests are still fenced by their original journal/fingerprint, including the originally requested target. The current server supplies one trusted configuration per world; unrelated worlds/customers must not inherit a shared target or relaxed isolation accidentally.

Implementation and remaining live-deployment gates: [MW01–MW04](maintainers/macrofold-worker-api.md). Local HTTP and build evidence: [Worker API cutover](verification/macrofold-worker.md#macrofold-worker-api-cutover).

## Configuration and interface

Construct the client in trusted server code. Read keys from the server environment or a server secret store; never pass them through game requests, browser configuration, saved world state, telemetry, or receipts. Omitting a provider or supplying an empty key returns `unavailable` without dispatching. Configured endpoints require HTTPS; redirects are rejected. Endpoint configuration is privileged, since it determines where credentials and context go.

Direct generation uses an immutable operator-supplied model-price catalogue. The existing `LLM_*_USD_PER_MILLION` fields price only `OPENAI_MODEL`; `OPENAI_MODEL_PRICES_JSON` adds records shaped as `{ "model": "exact-requested-model", "prices": { "inputUsdPerMillion": 1, "outputUsdPerMillion": 2 }, "reportedAliases": ["explicitly-equivalent-reported-model"] }` (the numbers here are illustrative, not vendor rates). Cached-input and cache-write rates are optional fields in `prices`. An identical default-model record may attach aliases and collapses into the existing default entry; conflicting default rates, repeated models/aliases, malformed records and nonfinite/negative rates fail startup. The client copies and freezes the catalogue so later caller mutation cannot change an admitted request.

Reservations select the same requested model as settlement. Before a route has chosen its model, the interactive allowance conservatively uses the most expensive configured default/mini/complex/summary model, including cached-input or cache-write premiums. A named decision or maintenance model never borrows the default model's rates. A different provider-reported identity is priced only when explicitly listed as that requested model's alias; otherwise its cost remains unknown and the existing conservative hold applies. No prices are downloaded automatically. [Catalogue and spending limits](limits/ai-execution.md#mp01--configured-model-prices) · [PW01 evidence](verification/level1-decisions.md#pw01-reliability-repairs--october-2-2026).

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

The game server keeps these outcomes distinct in job results and god-mode traces: a decision job that stops on a provider result records `refused`, `unavailable`, `invalid`, `failed` or `cancelled`, reports `uncertain` whenever the receipt marks completion uncertain (even if an adapter labelled it `failed`), and records `budget-exhausted` when a spending reservation or per-level decision limit refuses the request. Generation that is disabled or unconfigured is `unavailable`, never a substituted model or harness. A generated response that fails the director's schema, envelope or visible-size validation is `invalid` and is rejected without a paid repair request.

The server must reserve a conservative upper bound before dispatch and retain that bound when usage is unavailable or completion is uncertain. The floating-point estimate is not a billing ledger; the server stores conservative integer microdollars and reconciles invoices separately. Reject untrusted requests before reserving expensive work, but do not release a dispatched reservation merely because its response failed validation.

Macrofold judgment, short/native generation and reflection use the same final outcome meanings. Verified admission rejection is unavailable (credentials/model/rate/credit) or invalid (body/schema/size), with no model dispatch. Generic network errors and arbitrary 409/5xx retain possible dispatch. The original journaled admission cannot be resubmitted automatically, including after rejection; explicit continuation uses its existing new request identity. Stopping that same Run is an idempotent control operation: a rejected cancellation can be requested again without creating another generation or spending admission. Caller cancellation and deadlines retain their first cause: a pre-dispatch deadline is unavailable, a possible-dispatch deadline is uncertain, and a confirmed ended timeout is failed. Completed malformed output is invalid independently of whether its bill is known. A terminal Run identity and supported, correctly typed inference outcome are required before its output or cost can be trusted; native execution also requires its matching execution outcome. Recovery applies the same completion rule as original execution. A price alone cannot prove completion, and explicit provider uncertainty retains the hold even after pricing arrives. Malformed UTF-8, excessive JSON nesting and oversized bodies are rejected through the bounded transport; cancellation also stops a stalled body read.

Costs use one checked conversion meaning across provider normalization, reservations, settlement and decision diagnostics. Nonnegative USD numbers round their represented decimal value upward to integer microdollars without binary-multiplication artifacts. Provider microdollar strings require decimal digits, safe magnitude and lossless recovery through the public USD number. Explicit zero is valid; blanks, signs, exponent/fraction strings, negative/nonfinite USD and unsafe sums are unpriced. Complete Run-bound BYOK usage combines provider model bills with other attributable charges without counting the zero platform model charge as a free invoice. A model-body cost alone no longer substitutes for complete attributable billing when Run usage is missing or incomplete; successful output can therefore remain unpriced until authoritative rows arrive. Managed inference uses the verified Run charge, without replacing a missing or contradictory bill with a cheaper token estimate. Truncated/incomplete or wrong-Run usage cannot produce an aggregate charge. Usage pages require an explicit completed cursor and supported charge kinds. Every model row validates input, output and cache-token subsets before checked aggregation, including cache writes; malformed counters cannot be coerced to zero.

The authoritative ledger independently normalizes cost, binds late evidence to the original attempt and known external request, refuses to retract recorded possible dispatch, and preserves final priced receipts. A completed invalid/refused/failed request settles its usable price; missing/invalid billing or uncertain execution retains the full admitted reserve. Later authoritative pricing reconciles that same attempt, including a charge above its estimate, only after original-Run completion is established; receipts with known price but uncertain execution can also be checked for later completion. Gameplay restore does not rewind obligations. Monthly admission honors the configured $0–$100 range ($50 default), while episode/decision limits and background interactive headroom remain effective. Required-context overflow reports `context-exceeded` before further dispatch without truncating accepted identity or required evidence; completed earlier preparation keeps its own receipts. [NP01 evidence](verification/level1-decisions.md#np01-reliable-ai-outcomes-and-spending--october-2-2026) is synthetic execution/accounting evidence, not live model quality or deployment qualification.

## Verification

Run `pnpm exec vitest run packages/ai/src/client.test.ts`. Server fixtures in `apps/server/src/cognition-verification.test.ts` drive the director through these real direct adapters with an injected transport and a network guard, checking fresh request bodies and forwarded model, effort and output limits; distinct director job outcomes are verified there with a fake client, while adapter outcome classification remains covered by `client.test.ts`; [level-1 decisions evidence](verification/level1-decisions.md) records the runs. Injected HTTP fixtures cover both request shapes; Choice/Score/Noul; nullable generated schemas; refused, incomplete, malformed, and oversized responses; missing configuration; invalid schema references; cost estimation; transport failures; deadline and cancellation behavior; stalled bodies; canonical digests; and no automatic retry. No live or paid calls were made during implementation. Passing fixtures verifies protocol handling, not vendor availability, real model quality, observed latency, or calibrated routing accuracy.

The configured Macrofold inference transport also limits output to 16,384 tokens. Jev output allowance scales with question count up to that transport ceiling. A route may impose stricter context admission than Jev's published limits; report rejection and use the permitted context fallback, without automatic paid retry. Definitive admission rejections, including HTTP 413, are undispatched provider work rather than uncertain execution.

## Maintained records

- Implementation: [Feature tasks](maintainers/macrofold-worker-api.md).
- Limits and constraints: [AI execution and spending inventory](limits/ai-execution.md).

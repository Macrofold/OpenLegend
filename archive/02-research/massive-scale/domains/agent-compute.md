# Agent compute, orchestration and inference economics

[Research index](../README.md) · Preserve the existing separation of native continuation, Jev attention/selection, immediate generation and background reflection. No new model/provider commitment is made here.

## Agent population is not inference concurrency

A durable character can exist without a live model context, process or active request. Count resident simulation agents, admitted decision opportunities, running inference, queued work and retained minds separately. Scale the scheduler by meaningful work, not by allocating one always-running service per NPC.

The ACL 2025 AgentSociety implementation groups agents into workers to share connections and reduce process/resource overhead. Its 30,000-agent evaluation uses substantial GPU resources and simulation rounds; it does not establish low-latency service for 30,000 simultaneously conversing humans. [S21](../sources.md#s21)

## Proposed execution lifecycle

```text
native event / direct speech / due goal review
 → scope-valid opportunity, coalesced where semantically safe
 → native continuation or selected/generative execution class
 → admission: priority, quota, deadline, reserved spend, concurrency
 → consistent permitted input boundary
 → asynchronous provider/harness execution
 → typed proposal + recorded attempt outcome
 → world-owner validation and atomic accepted effects/receipt
 → derived presentation and background maintenance
```

The native world does not wait for optional reflection. Attention is not automatically free, and an opportunity is not automatically a paid call. A hard provider outage should leave supported native actions, urgent protection and valid ongoing plans functional.

## Queue design is part of character responsiveness

Use a small number of execution classes: immediate player dialogue, urgent semantic reconsideration, ordinary autonomous reasoning, maintenance/reflection and content generation. Each needs concurrency limits, deadlines, per-world/per-account fairness and cost accounting. The exact priorities are product policy, not determined by the model vendor.

Avoid letting one crowded world monopolize all global inference. Avoid strict priority that starves every autonomous mind indefinitely. Weighted fair scheduling with explicit admission ceilings is a candidate; measure age distributions and character continuity before adoption.

A queue stores durable intent where needed, not an unbounded duplicate of the complete world prompt. Construct or refresh the narrow input at a defined boundary. Cancellation must release unused reservations without pretending an already-dispatched paid request was free.

## Stale work and retries

An answer is a proposal, not an authorized database patch. Validate actor existence/control, world timeline, owner epoch, relevant state and evidence versions, target bindings, resource conditions and any protected publishing boundary.

Do not reject every answer merely because an unrelated world field changed. Use relevant dependencies where safe. Conversely, do not accept an old plan because its JSON validates while the bridge it depended on has disappeared.

Classify provider outcomes as accepted, rejected, canceled-before-dispatch, failed-known, or unknown where appropriate. Unknown billing/execution requires reconciliation, not an automatic new paid call. Persist stable attempt IDs and operation receipts. This follows the same idempotent-effect reasoning as native commands. [S35](../sources.md#s35)

## Reduce work before reducing character quality

Useful candidates include continuing known plans natively, sharing immutable prompt prefixes, retrieving narrower eligible evidence, coalescing redundant wakeups, caching stable semantic descriptors, batch embedding, and using a smaller execution class where evaluations show it meets the task.

Do not silently omit required accepted About-me text, replace legitimate perception with sampled witnesses, or make every ordinary conversation a canned response. A cheaper classifier can route among already specified options; it should not be assumed capable of every generative decision.

Cache keys need model/prompt/rule versions and the full relevant scope. A cached explanation from actor A can contain private information even when actor B asks the same words. Global semantic caches require explicit public-only contracts.

## Batch throughput and interactive latency are different objectives

PagedAttention is important serving research about managing LLM attention-cache memory and batching; it concerns inference infrastructure, not durable autobiographical memory. A throughput-optimized batch may worsen time-to-first-token for a waiting player. [S30](../sources.md#s30)

Measure admission wait, prompt assembly, retrieval, provider queue, first useful output, complete response, and accepted action latency independently. Streaming speech can improve perceived responsiveness, but visible text must remain associated with the correct speaker, scope and admitted conversation. Mechanical actions should not commit from unvalidated partial output.

Self-hosting may become useful for a sufficiently steady workload with operational expertise and favorable measured utilization. API use may remain better for bursty or frontier reasoning. Price the complete system: idle capacity, model upgrades, failed jobs, memory, network, orchestration, evaluation and on-call—not only GPU-hours or headline token cost.

## What the large-agent papers really suggest

AgentScope's million-agent experiments use a tightly defined guessing game and show strong dependence on output length. Light Society's billion-agent opinion experiment uses distilled behavior and a precomputed lookup table over a constrained input space. These are useful demonstrations of batching, representation and workload specialization, not evidence that open-ended dialogue and physics are solved at those counts. [S22](../sources.md#s22), [S23](../sources.md#s23)

A possible later application is a validated surrogate for a narrow, repeated background decision. It requires agreement on fidelity, scope and fallback. Test both individual behavior and aggregate drift: a small bias can reshape an economy or society over many interactions. Native finite mechanics are often an even simpler and more interpretable solution where the design permits them.

## Failure and quality qualification

Run scripted provider timeouts, quota exhaustion, long-tail latency, malformed output, duplicate callbacks, model-version changes, stale targets, cancellation during migration and delayed results after save restoration. Verify no duplicate spend or accepted effect and no loss of native continuity.

Separately evaluate agency: goal persistence, appropriate silence, believable dialogue, evidence fidelity, action feasibility and long-term social consequences. A scheduler that serves more calls but makes every villager forget a promise is not an improvement.

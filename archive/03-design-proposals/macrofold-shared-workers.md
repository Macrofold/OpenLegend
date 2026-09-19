# Macrofold as the shared agent execution platform

Status: **conditional recommendation and design exploration**, September 19, 2026. Requested in [U09](../00-source/design-followups.md#u09--macrofold-with-shared-long-running-workers). No Macrofold feature, Open Legend integration, pricing policy or capacity has been implemented or accepted by this discussion. Current behavior and earlier cost assumptions remain in the [repository comparison](../02-research/macrofold-workspaces.md).

## Revised recommendation

If Macrofold provides efficient long-running workers that load independent agent contexts on demand, prefer evaluating it for ordinary Open Legend reasoning as well as heavier tasks. The previous recommendation to keep ordinary reasoning outside Macrofold was driven by its inspected sandbox-per-run lifecycle, not by a fundamental mismatch between an agent platform and a simulation.

The desired separation is persistent NPC identity and memory from the compute used to think. Macrofold can own that execution infrastructure. Open Legend still owns the game and what its characters know. Structured memory in a shared database is compatible with Macrofold-managed execution; these are not competing choices.

The subsequent [AI-workflow and world-state proposal](macrofold-ai-workflows-and-world-state.md) extends this direction to Jev judgments, environment context, consolidation and capability generation. It distinguishes generic platform storage from the game's authority over valid state changes, and proposes lightweight inference and structured workspace resources as reusable additions.

An illustrative deployment could have 1,000 persistent NPC contexts and a much smaller pool of worker processes. Each job loads one actor's permitted context and submits results, then releases its slot. Worker count follows measured concurrent demand and latency requirements, rather than the count of living NPCs. This is a topology example, not a throughput promise.

## What reuse buys

| Responsibility | Existing Macrofold foundation | Remaining work for a shared execution mode |
|---|---|---|
| Job lifecycle | Durable admission/outbox, identities, leases, cancellation, deadlines and scheduling | Bind short reasoning jobs to worker assignments; preserve safe failure behavior without requiring a VM lifecycle |
| Models and spending | Model gateway, per-run grants, frozen rate cards, reservations and usage accounting | Define a suitable compute accounting model, retain per-call controls, and measure control-plane overhead |
| Tools and permissions | Granted tool broker, server-side checks, supported native permission adapters | Enforce per-assignment context/credential boundaries; restrict ordinary jobs to approved tools |
| Persistence | Workspaces, portable files, checkpoints and native conversation continuation | Avoid full filesystem restore/capture when a lightweight job only needs bounded memory records; define which state is canonical |
| Operations | APIs/SDKs, run events, usage reporting and diagnostics | Surface worker queue/latency and NPC identifiers without leaking private mind data to players |

These facilities are valuable independently of dedicated sandboxes. In particular, the inspected runtime capability binds organization, run, lease and expiry, and the model gateway checks run authorization and budget. It does not inherently identify one VM as the only possible caller. This is a useful reuse seam, not proof that a shared paid executor already exists. Sources: [runtime capabilities](../../../AgentCloud/packages/core/src/runtime-auth.ts), [model gateway](../../../AgentCloud/packages/core/src/model-gateway.ts), [scheduling](../../../AgentCloud/docs/features/execution/scheduling.md), [permissions](../../../AgentCloud/docs/features/execution/permissions.md), [operations](../../../AgentCloud/docs/features/operations/README.md).

Open Legend would otherwise need a small execution layer or an existing library for calling models and tools, then enough scheduling, limits, diagnostics and failure handling for the game. It does not need to recreate Macrofold's entire commercial platform. The fair comparison is the minimum reliable game-specific layer versus the actual effort of adapting and operating Macrofold.

## Two different meanings of a worker pool

**Warm isolated execution slots:** keep a limited set of runtimes ready and assign one job/workspace to each exclusive slot. This can amortize boot costs while retaining broad native harness/file/shell capabilities. Workspace loading, verification, cleanup and safe reassignment still cost time. Keeping a dedicated sandbox warm for every NPC only fixes startup; it does not pool capacity across NPCs.

**Lightweight shared execution:** a long-running service hosts many bounded agent loops with separate context objects and approved tools. It waits asynchronously for remote models and loads structured memory or selected files as needed. Arbitrary generated code runs in a separate isolated mode. This is the more relevant shape for frequent NPC reasoning and conversation, but native harnesses must be checked for process-global state, filesystem assumptions and compatibility before being placed together.

Macrofold's current `MachineProvider` contract explicitly covers provisioning, staging, restoration, probing, snapshots and closure. A warm exclusive slot pool may reuse much of that boundary with careful lifecycle adaptation. A lightweight executor that does not reconstruct a VM filesystem is a broader execution path, not merely a different implementation of `provision()`. Existing limits and charges count runs/lifecycle windows; pooled worker allocation and concurrent model calls need deliberately defined limits and accounting. [Provider contract](../../../AgentCloud/packages/core/src/ports.ts), [execution engine](../../../AgentCloud/packages/core/src/cloud-engine.ts), [billing](../../../AgentCloud/docs/features/billing/implementation.md).

The existing native worker changes process-global environment/working directory, and the supervisor uses fixed directories and cleanup by agent UID. They must not simply be launched concurrently in one shared process or common user environment. Pooling exclusive isolated slots and building a compatible restricted executor are distinct approaches to those assumptions. [Native worker](../../../AgentCloud/packages/runtime/src/native-worker.ts), [supervisor](../../../AgentCloud/packages/runtime/src/supervisor.ts).

Workers may live for hours while jobs remain short, cancellable and individually budgeted. Do not represent an NPC's entire lifetime as one giant run holding a writer lock and budget reservation. Persist needed state between jobs so process memory is a cache rather than the sole durable mind. Isolate actor context, credentials, sessions and cached files across assignments. Recovery must distinguish a job that can safely retry from a game action whose outcome is already committed or uncertain.

## What Open Legend owns either way

Open Legend defines perception, needs, personalities, accelerated time, action rules, authoritative world state, and the semantic policies for recall, belief changes, commitments and forgetting. Macrofold may physically store files or provide access to an application-owned memory service without deciding what an NPC is allowed to know.

An ordinary job receives an actor/world identity, bounded observations, a memory reference, input versions, permitted tools, a deadline and a budget. It returns proposed speech/actions and memory changes with provenance. Those are conceptual contract fields, not claims about an existing Macrofold endpoint. Open Legend validates actions against the current world and applies memory changes against expected revisions. The generic execution platform should not acquire knowledge of hunger rates, private conversations, recipe rules or biological aging.

Keep detailed simulation events out of generic run creation. The game decides which events warrant reasoning, coalesces repeated triggers and continues native survival while a job waits. Start with serialized plan-changing jobs per NPC if useful, while perception ingestion can continue independently. Priority for a conversation over a background reflection and deadlines after world changes need explicit integration; Macrofold's present interactive scheduling is not an immediate-response guarantee or preemption system.

## Cost and adoption decision

Shared execution changes the infrastructure denominator: pool capacity, utilization and overhead matter more than total stored agent count. Actual spend includes shared worker capacity, model tokens, persistence, tools and management services. It does not inherit the earlier hypothetical one-full-runtime-per-NPC cost automatically, and it does not eliminate model costs or make unused warm capacity free. Cross-agent request batching must preserve separate model contexts and cannot be assumed to reduce provider token prices.

Macrofold becomes more attractive if pooled execution is independently useful to the product—for example for many assistants, background workflows or simulations—and if Open Legend can consume it through a narrow contract. Its infrastructure work then benefits both projects. That is a product hypothesis, not validated demand. The disadvantages are a second service and release dependency, adapting a coding-oriented lifecycle, operational overhead, and possible delays if platform expansion becomes a prerequisite for the game.

After implementation authorization, compare the same small workload through a minimal game-specific executor and the proposed Macrofold mode, alongside the existing sandbox path. Use identical model, context and tool policy; measure queued and warm latency, throughput, tokens, database/control-plane work, worker memory, storage traffic and total operating cost. Check cancellation, cross-actor isolation, stale results, forgotten native history and worker crashes after a committed action. Choose actual p95 targets and spending limits before claiming success.

The adoption gate is concrete: if Macrofold supplies the required behavior with acceptable measured overhead and reasonable implementation effort, use it for ordinary agent execution. If realizing that mode requires a large platform rewrite, keep a small replaceable Open Legend executor initially. Avoid building a second general agent platform in Open Legend by default. This updates the conditional recommendation in D28; it does not authorize implementation.

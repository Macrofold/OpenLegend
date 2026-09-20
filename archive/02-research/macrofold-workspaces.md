# Macrofold workspaces as NPC minds

Status: **repository research and recommendation**, September 18, 2026 planning session (America/New_York). No integration, paid inference, benchmark, or changes to Macrofold. The sibling directory is named `AgentCloud`; its README identifies the product as Macrofold. Findings describe the inspected working tree, not a pinned released service or a hosted price quotation. Related request: [U03](../00-source/design-followups.md#u03--macrofold-and-richer-agent-memory).

## Recommendation

Give every NPC a persistent, workspace-like mind. Use shared application-owned storage for its memories and state, and bounded reasoning workers for ordinary decisions. Use Macrofold when a job benefits from a full agent harness, files, tools, or isolated execution. This is a proposed hybrid, not an accepted technology decision.

**September 19 refinement:** the selective-use recommendation above assumes the inspected sandbox-per-run lifecycle. If Macrofold supplies efficient shared long-running workers, prefer evaluating it for ordinary NPC reasoning too: its budgets, model gateway, tools, job lifecycle and diagnostics remain useful without a dedicated VM per NPC. The [shared-worker proposal](../03-design-proposals/macrofold-shared-workers.md) separates that conditional recommendation from existing capabilities. Shared structured memory and Macrofold-managed execution are compatible.

The subsequent [world-state and AI-workflow proposal](../03-design-proposals/macrofold-ai-workflows-and-world-state.md) considers reusable Macrofold additions for typed Jev inference, structured resources and composable jobs. It favors a common AI infrastructure layer while keeping Open Legend's state-transition rules authoritative; physical storage may be provided by Macrofold. These additions have not been implemented or selected.

One persistent Macrofold workspace per NPC is reasonable for a small research cast if the aim is to explore autonomous file organization and reuse Macrofold's interface. It is not inherently the expensive part: a saved workspace does not imply a continuously running machine. Making a full runtime the unit of every routine decision would add lifecycle overhead and complicate a rapidly changing game.

## What Macrofold currently supplies

| Inspected capability | Consequence for Open Legend | Evidence |
|---|---|---|
| A workspace is a persistent filesystem and Git clone; a session retains native harness state; a run is bounded execution | NPC identity, stored mind, conversation and active computation are separate concepts. A workspace need not stay running | [Workspace implementation](../../../AgentCloud/docs/features/workspaces/implementation.md) |
| File-memory starter uses a profile, topic notes and a task file | Useful inspectable scaffolding; not a semantic memory engine or automatic task scheduler | [Memory guide](../../../AgentCloud/docs/features/customer-agents/memory.md) |
| The memory guide recommends application-owned memory for large collections or stronger recall/deletion guarantees | Structured game memory complements Macrofold's intended integration boundary | [Memory guide](../../../AgentCloud/docs/features/customer-agents/memory.md) |
| One writer per workspace; competing sessions receive `409 workspace_busy` | A long reflection and a new conversation cannot independently edit that NPC's files at the same time. The game must manage scheduling or keep live memory outside the workspace | [Shared agents](../../../AgentCloud/docs/features/workspaces/shared-agents.md) |
| File reads show the last published persisted revision | The file browser is not a live, atomic view of all ongoing NPC thoughts | [Read files](../../../AgentCloud/docs/features/workspaces/read-files.md) |
| Runs provision/restore a runtime, execute, capture and verify persistence, then clean up | Measure end-to-end latency and occupied capacity, not just model response time. Routine decisions may not need this machinery | [Runtime](../../../AgentCloud/docs/features/execution/runtime.md) |
| Native conversations and historical checkpoints persist separately from current notes | Deleting a current memory file alone does not enforce forgetting; continuation can contain old details | [Memory guide](../../../AgentCloud/docs/features/customer-agents/memory.md) |
| Organization-wide concurrency and run budgets are built in | Useful budget controls, but one workspace per NPC does not mean unlimited parallelism or a separate subscription per NPC | [Billing](../../../AgentCloud/docs/features/billing/README.md), [scheduling](../../../AgentCloud/docs/features/execution/scheduling.md) |

The current proposal already uses shared PostgreSQL and asynchronous workers. It already separates episodes, beliefs, relationships, skills and commitments. Before this follow-up it did **not** specify a concrete table layout, indexing strategy or recall evaluation. There is no implemented “current method” to replace. See the new [storage and retrieval proposal](../03-design-proposals/memory-storage-and-retrieval.md).

## Practical choices

| Approach | Advantages | Costs and limitations | Best use |
|---|---|---|---|
| Shared structured memory and bounded model/tool calls | Precise perception and retention rules; efficient event writes and queries; shared infrastructure; straightforward version checks | We build the memory interface, retrieval, consolidation and reasoning loop; arbitrary file creation is less natural | Ordinary NPC life at growing population sizes |
| Persistent Macrofold workspace per NPC, activated on demand | Reuses file browser, native harnesses, checkpointing, tools and budgeting; lets an agent organize prose and artifacts freely | More startup/persistence work; one-writer conflicts; context growth; game-specific recall still needs design; native history complicates forgetting | Small experimental cast or unusually autonomous characters |
| Shared memory plus selective Macrofold execution | Rich structured minds with full workspaces available when valuable; ordinary decisions avoid full runtime lifecycle | Two execution paths to observe and maintain; snapshots and proposed changes need a clear adapter | Baseline recommendation for the currently inspected execution mode |
| Shared memory plus Macrofold-managed pooled execution | Reuses agent operations, budgets, model/tool access and diagnostics for routine thinking as well as heavier jobs | New execution mode and accounting/isolation work; platform dependency; benefit needs measurement | Conditional preference if efficient shared-worker support is independently worthwhile for Macrofold; [proposal](../03-design-proposals/macrofold-shared-workers.md) |

Free-form files offer flexibility, but a folder tree does not resolve contradictory memories or distinguish fact, rumor and imagination. Conversely, a database does not require reducing a person to numeric meters: entries can contain substantial prose, links, interpretations and evolving goals. A workspace-like UI can present those records without making files the sole source of truth.

## Where cost grows

Separate storage, active runtime, model usage, and the shared game/control-plane infrastructure. Macrofold's checked-in compute default is `8000` micro-USD per minute: **$0.008/minute or $0.48/hour**. It is configurable; local Docker defaults to zero platform compute charge, which does not mean zero hardware cost. Settlement uses elapsed seconds within the configured execution window when a machine exists. Sources: [rate calculation](../../../AgentCloud/packages/core/src/catalog.ts), [settlement](../../../AgentCloud/packages/core/src/cloud-engine.ts), [billing implementation](../../../AgentCloud/docs/features/billing/implementation.md).

Explicit clarification from [U04](../00-source/design-followups.md#u04--vercel-sandbox-startup-and-token-costs): the $576/$34,560 monthly examples below are **Macrofold retail runtime compute only, excluding LLM tokens**. The later $6/hour example is separately hypothetical model-token cost, not an all-in total. Neither is an estimate of the owner's actual Vercel invoice. Compare costs at the same workload and cadence before combining them.

Illustrations at that default, with 30 days and continuous operation throughout the month:

| Runtime pattern | 100 NPCs: compute/month | 1,000 NPCs: compute/month |
|---|---:|---:|
| Stored workspaces with no runs | $0 active-run compute | $0 active-run compute |
| One billable runtime-minute per NPC per real hour | $576 | $5,760 |
| Thirty billable seconds every five real minutes per NPC | $3,456 | $34,560 |
| Continuously occupied runtimes | $34,560 | $345,600 |

These exclude subscriptions, storage, inference, tools and shared infrastructure. Durations mean total billable elapsed time, not just useful thinking. They are arithmetic scenarios, not capacity promises: repository plans default to 2/10/50 concurrent runs and bounded maximum run lengths. A population of 100 simultaneously active runtimes would exceed those ordinary concurrency defaults. Repeated runs, admission limits and reserved budgets also affect throughput. Hosted configuration is authoritative. [Plan and budget defaults](../../../AgentCloud/docs/features/billing/README.md).

For storage scale, assume **1 MiB of raw current memory per NPC**, solely as a sizing example: 100 NPCs use about 100 MiB; 1,000 use about 0.98 GiB. The repository's storage-overage default is $0.10/GiB per 30 days, beyond plan allowances and only when enabled. This illustrates why small text memories are unlikely to dominate charges. It is not a database hosting estimate or total checkpoint footprint: indexes, vectors, files, native histories, Git, retained revisions and backups add storage. [Storage policy](../../../AgentCloud/docs/features/billing/README.md).

If we operate Macrofold ourselves, its retail compute rate is an internal pricing policy, not our incremental vendor invoice. Current Vercel Sandbox pricing for `iad1` lists active CPU at $0.128/vCPU-hour and provisioned memory at $0.0212/GB-hour, with a one-minute minimum for memory. Model waiting can avoid active CPU consumption while memory remains provisioned. Measure the actual adapter configuration and full operating cost; do not add a platform retail charge to its underlying vendor costs as though both were necessarily external invoices. [Vercel pricing](https://vercel.com/docs/sandbox/pricing).

### Model usage and accelerated time

Illustrative prices, **not a quote for any model**: at $1 per million input tokens and $5 per million output tokens, a compact call using 1,500 input and 200 output tokens costs $0.0025. Tool-using sessions may require many such requests and larger contexts.

| Thought cadence | Calls per real hour, 100 NPCs | Illustrative model cost per real hour |
|---|---:|---:|
| Once per ten real minutes | 600 | $1.50 |
| Once per real minute | 6,000 | $15 |
| Once per simulated hour, at 24× world time | 2,400 | $6 |
| Same simulated cadence, at another 20× creator acceleration | 48,000 | $120 |

Retries, consolidation, embeddings, voice, tools and infrastructure are excluded. Multiply by ten for 1,000 equally active NPCs. Compact retrieval matters even without workspaces: repeatedly sending each character's whole biography can dominate inference cost.

Keep basic survival, movement and known actions mechanical. Trigger bounded thought on meaningful surprises, dialogue, conflicts and plan failures; continue valid plans between calls. Prioritize interaction and emergencies, spread scheduled reflections, cache stable context where supported, and cap input size, tool rounds, output and retries. Budget by **real elapsed time** at world and project level, with fair per-actor allowances; a cap per simulated day alone multiplies spending during acceleration.

This has a fidelity trade-off. A fixed real-time budget at higher speed gives fewer detailed deliberations per simulated day. Survival mechanics can remain coherent, but learning and social development may differ. If preserving the same deliberation density is essential, constrain speed or raise the budget. Never promise unlimited acceleration, unchanged cognition and fixed cost simultaneously. See [time model](../03-design-proposals/time-and-simulation-speed.md).

## Where to use Macrofold first

The clearest fit is the **capability builder**: invent a new interaction, manipulate files, run isolated tests, and return a candidate for validation. It may need a full coding harness. The NPC that discovers an idea need not receive authority to edit the running game or access its source.

For NPCs, selectively use a workspace for extended investigation, multi-step planning or persistent authored artifacts when a small model call with memory tools is insufficient. Simple sleep consolidation does not automatically need a sandbox. A temporary job can receive a bounded, versioned view of one mind and submit proposed changes; optional durable scratch files can persist without becoming a competing memory authority.

## Vercel and slow startup

The inspected cloud execution path uses Vercel Sandbox, with Vercel Workflow coordinating phases; local execution has a Docker adapter. Each new run uses a new `run-<runId>` sandbox identity. Retries look up the same identity to avoid duplicate execution. Creation uses an immutable custom image with the native harnesses already installed. Normal cross-run continuation restores the platform's persisted workspace and native session into the new runtime. Provider persistence/snapshots support recovery; they do not mean the next normal run reuses an already-running workspace VM. [Runtime design](../../../AgentCloud/docs/features/execution/runtime.md), [provider adapter](../../../AgentCloud/packages/providers/src/vercel.ts), [execution engine](../../../AgentCloud/packages/core/src/cloud-engine.ts).

The user's observed wait is real feedback, but this inspection did not time their run or identify its dominant bottleneck. Time to first visible response can include admission/queueing, input preparation, VM creation, configuration, content transfer, integrity-checked restore, harness initialization, the first model response and output delivery. Time until the workspace is durable adds checkpointing and publication afterward. Do not count post-response persistence as initial startup, or assume all visible delay is Vercel boot time.

**Historical finding, superseded by the later September 19 inspection:** the earlier snapshot imposed one-second phase delays and staged small hydration batches sequentially. The current working tree advances ready phases without artificial sleeps, uses bounded verified hydration batches and records internal phase timings. Preserve those improvements; do not submit them as missing work again. Hosted latency and the dominant source of the user's observed wait remain unmeasured. [Engine](../../../AgentCloud/packages/core/src/cloud-engine.ts), [Workflow](../../../AgentCloud/apps/web/workflows/run.ts), [provider](../../../AgentCloud/packages/providers/src/vercel.ts), [current implementation brief](../07-technical-architecture/macrofold-implementation-brief.md).

Prioritize improvements according to measured stage durations:

1. Use the existing internal phase timings and add missing end-to-end spans for queue-to-admission, create request-to-ready, restore transfer/verification, harness-ready, first model request/token, first UI event and final durable publication. Compare empty, small-memory and larger continuation workspaces; report p50/p95 plus bytes/file counts and concurrency.
2. Measure the now-implemented ready-phase and hydration improvements under representative workloads. Preserve leases, idempotency, integrity verification and provider limits; further batch tuning should follow evidence.
3. Compare the existing prebuilt image with a smaller selected-harness image or a prepared snapshot if image startup is significant. Vercel documents custom images and snapshots for avoiding repeated environment setup; Macrofold already implements the main preinstallation step. Additional savings require measurement. [Custom images](https://vercel.com/docs/sandbox/concepts/images), [snapshots](https://vercel.com/docs/sandbox/concepts/snapshots).
4. Consider a short warm reuse window or a small prewarmed pool for frequent interactive work. This requires a lifecycle change, fresh per-run grants, correct checkpoint ownership and a policy preventing state from leaking between actors. Warm capacity costs money while idle; stopped/resumed sandboxes are distinct from keeping a process warm. Vercel's current platform supports persistence, but Macrofold's existing run/session binding must be deliberately adapted rather than silently bypassed. [Vercel overview](https://vercel.com/docs/sandbox).

For Open Legend, ordinary NPC reasoning should run in a small shared service that loads the appropriate mind and calls the model, including bounded memory tools when needed. This avoids requiring a sandbox boot for each conversation or decision while retaining independent NPC context. Model latency and queueing still exist. Full sandboxes remain useful for isolated generated code and extended file/tool tasks. Accelerated world time magnifies the gameplay impact of wall-clock waits, which reinforces keeping native survival independent of those jobs.

The speed/cost trade-off is fundamental: frequent teardown saves idle capacity but repeats startup; keeping capacity warm reduces startup at a carrying cost. At Vercel's provider layer, waiting on models does not consume Active CPU but provisioned memory continues to be billed while the sandbox runs. The earlier flat per-minute examples instead used Macrofold's application pricing. [Vercel pricing](https://vercel.com/docs/sandbox/pricing). No startup optimization or benchmark was performed in this planning task.

## Evidence needed before adoption

Run the same small cast and histories through direct bounded calls and on-demand Macrofold runs. Measure recall accuracy, attribution, missed commitments, unauthorized knowledge, forgetting behavior, end-to-end latency, occupied concurrency, token counts, checkpoint bytes and actual dollars. Include long conversations, accelerated days, interrupted persistence, fresh versus resumed sessions, and a new observation arriving during consolidation. Macrofold provides useful existing infrastructure; no NPC workload or cost savings were demonstrated by this inspection. Track [D28](../05-project/open-decisions.md) and [R19](../05-project/research-backlog.md).

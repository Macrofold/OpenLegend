# Invention and World Agent: start here

This is a continuation guide and navigation map, not a competing specification or task list. A new contributor does not need the originating chat or its temporary Git bundles to continue the architecture and implementation. Read the current branch, not a mixture of files from main and old review branches. Code establishes what exists; specifications establish the target; verification records establish what was actually exercised.

## Working branch and reading order

Continue on `feature/invention-repertoire-foundation`. Inspect its current remote head and compare it with current main before editing. Preserve other contributors' changes. An old successful rebase is not evidence that today's main is included. Do not merge into main or rewrite published history merely to begin this handoff.

1. Read [repository instructions](../AGENTS.md), [project overview](../README.md), [implemented architecture](architecture.md), and [implementation status](../archive/05-project/implementation-status.md).
2. Read [engine/world boundaries](engine-and-world-boundaries.md), [base-world ownership](worlds/base/README.md), and [current save-development policy](save-and-load.md#active-development-policy). These govern all later feature choices.
3. Read [Invention foundation](invention-foundation.md), then the relevant canonical contracts in the decision map below.
4. Read the [INV parent tracker](maintainers/inventions-and-world-evolution.md), [World Agent write detail](maintainers/world-agent-writes.md), and [deferred regression TODOs](maintainers/TODO.md). Follow links to AC, AG, EWF, EPR, CR, NC, PF and SL instead of creating duplicate task owners.
5. Read [Verification](verification.md), especially [write/recovery evidence](verification/workshop-continuation.md), [transport/funding evidence](verification/workshop-transport-funding.md), and [navigation/custom-value evidence](verification/workshop-navigation.md). Do not upgrade local/injected/manual results to live hosted acceptance.

## Settled decision map

The descriptions below identify decisions to preserve. Full contracts, exceptions, task bodies and acceptance criteria remain only at their linked owners.

| Decision or concern | Canonical owner |
| --- | --- |
| Authored realities, existing four-layer boundary, protected integrity versus replaceable laws; native code is not automatically universal | [Engine/world boundaries](engine-and-world-boundaries.md), [common runtime](../archive/07-technical-architecture/world-module-runtime.md), [base world](worlds/base/README.md) |
| G0–G3 and the honest boundary between supported invention, bounded algorithms and new host engineering | [Declarations/evolution](../archive/07-technical-architecture/declarations-and-evolution.md) |
| One editable invention project, immutable submitted revisions, separate mechanical and art outputs | [Foundation](invention-foundation.md) |
| Separate candidate acceptance, world activation, learning, possession, crafting, and publication | [Foundation](invention-foundation.md), [composition](invention-composition.md) |
| Edit function and appearance during creation or later; preserve liked alternatives and explicit player constraints | [Foundation](invention-foundation.md), [art pipeline](invention-art-pipeline.md) |
| Logical revalidation after changed design; reuse compatible work; local output repair versus design revision; no silent upstream substitutions | [Foundation](invention-foundation.md), [validation](invention-validation.md) |
| Current live version survives failed replacements; superseded results cannot publish; cancellation is not historical rollback | [Foundation](invention-foundation.md), [composition](invention-composition.md), [save/load](save-and-load.md) |
| Instant adequate native fallback, optional rough generation, optional async refinement, review/promotion; not every invention needs paid art | [Art pipeline](invention-art-pipeline.md) |
| Structured presentation requirements; independent visual/mechanical versions; durable assets, safe current-state binding, shared generation and rights | [Art pipeline](invention-art-pipeline.md) |
| Observer-relative faithful depiction, illusions/disguises/hidden objects; pixels do not grant physics or knowledge | [Repertoire foundation](repertoire-foundation.md), [art pipeline](invention-art-pipeline.md), [perception](events-perception-and-reactions.md) |
| World constitution, immutable versions, installation pins, owner freezes, author refinement locks, scope, indirect bypass, quarantine | [World constitution](world-constitution.md) |
| Deterministic mandatory checks; Jev for focused semantic judgments; LLMs for novelty and unresolved conceptual issues; evidence is not universal proof | [Validation](invention-validation.md) |
| Invented mechanics can define their own obligations, but cannot waive governing obligations; compositional and temporal verification | [Validation](invention-validation.md), [composition](invention-composition.md), [repertoire foundation](repertoire-foundation.md) |
| One derived typed graph: exact definitions, live arrangements and evidence; enforced/derived/observed/hypothesized relationships remain distinct | [Graph](invention-graph.md), [repertoire foundation](repertoire-foundation.md) |
| Reverse consumers, query membership, cycles, bounded traversal, explicit incomplete frontiers, versioned snapshots and future visualization | [Graph](invention-graph.md), [finite investigation tools](world-agent-inspection-and-edits.md) |
| One unified, action-capable World Agent conversation, asking approval when needed; the World Agent is not an embodied NPC | [World Agent runtime](world-agent-runtime.md) |
| Full authorized world-level inspection versus separately scoped NPC tools; read, disclose, spend and mutate are distinct powers | [Shared tools](invention-workshop-tools.md), [MCP](world-agent-mcp.md) |
| One application tool service, replaceable executor, thin official TypeScript MCP adapter, native Macrofold connector/harness | [Shared tools](invention-workshop-tools.md), [MCP](world-agent-mcp.md), [runtime](world-agent-runtime.md) |
| Complete relevant information is reachable through bounded tools; exact refs, schemas, provenance, coverage and truthful receipts | [Shared tools](invention-workshop-tools.md), [inspection/edit contracts](world-agent-inspection-and-edits.md) |
| Durable session/context, human approvals bound to exact change plans, one authoritative mutation and replay-safe receipts | [Runtime](world-agent-runtime.md), [MCP](world-agent-mcp.md) |
| $5 per explicitly funded workshop session including images, no mandatory separate art split; capability first, cost optimization later | [Runtime](world-agent-runtime.md), [budgets](invention-budgets.md) |
| Settled/reserved/uncertain exposure; revisions do not reset allowances; worker/run allocations; recurring CPU, cognition, events and assets | [Budgets](invention-budgets.md) |
| Positive typed material/port composition, real subsystem adapters, meaningful art redesign and coherent shared-law transitions | [Composition](invention-composition.md), [module runtime](../archive/07-technical-architecture/world-module-runtime.md) |
| Novel use is not necessarily invention: action, goal, activity, process and definition; structured invocations beyond a shortlist | [Action capabilities](action-capabilities.md), [repertoire integration](repertoire-foundation.md) |
| Typed instance/part/result references, hard method constraints, truth/unknown/evidence, actual completion versus admission | [Action capabilities](action-capabilities.md) |
| N-ary live relationships, operator labor versus autonomous processes, resource channels, joint readiness/withdrawal and temporal methods | [Repertoire foundation](repertoire-foundation.md), [action capabilities](action-capabilities.md) |
| Information content versus carrier versus depiction; false claims, copying and scoped learning; agreements versus obligations versus enforcement | [Repertoire foundation](repertoire-foundation.md) |
| Unusual bodies, split/merge identity, local clocks, non-Euclidean topology and deformation are explicit extension seams, not latent implemented powers | [Repertoire foundation](repertoire-foundation.md), [capability limits](action-capabilities.md) |
| Player/NPC/creator target journeys and ambitious but incremental qualification | [Invention scenarios](invention-scenarios.md), [action repertoire](repertoires/actions.md) |
| Native encounter/awareness bottlenecks, workload attribution, cold/warm evidence and no performance wins by deleting semantics | [Encounter plan](encounter-scaling.md), [PF tracker](maintainers/performance.md) |
| Tool/vendor research is evaluated input, not a mandate to replace the renderer, physics, memory or character authority | [MCP research](../archive/02-research/mcp-tooling-and-integration.md), [hybrid art](../archive/03-design-proposals/procedural-art-and-animation.md) |

## Implementation navigation

Read these files with their canonical contracts before making changes:

- Tool schemas and dispatch: `apps/server/src/world-tools.ts`; wire/reference types: `packages/protocol/src/relationships.ts` and `world-agent.ts`.
- Source-backed relationships: `world-graph.ts`, `relationship-index.ts`, `relationship-trace.ts`, `live-relationships.ts`, `evidence-relationships.ts`, `entity-directory.ts` in `apps/server/src/`.
- Authoring: `world-authoring.ts`, `world-authoring-contracts.ts`, `world-authoring-kinds.ts`, `world-authoring-metadata.ts`, `world-authoring-bindings.ts`, `world-authoring-values.ts`; these delegate to existing domain mutations.
- MCP and local transport: `world-mcp.ts`, `mcp-config.ts`, `http-json.ts`, `http.ts`.
- Durable execution and funding: `world-agent-store.ts`, `world-agent-runner.ts`, `macrofold.ts`, `macrofold-provisioning.ts`, `macrofold-allocation.ts`, `attempt-budget.ts`, `store.ts`.
- Owner UI: `apps/client/src/ui/world-agent.tsx`, `world-agent-session.tsx`, `world-agent-review.tsx`, `world-inspection.tsx`.
- Existing finite recipe shortcut: `invention-service.ts`, `invention-context.ts`, `invention-tools.ts`, `invention-workshop.ts`, `actor-invention.ts`; it is not the full native harness.

The exact current catalogue comes from shared descriptors and `tools/list`, not a hypothetical specification table. `ol_` simply namespaces OpenLegend tools. Do not implement a tool per noun, another writable graph, another wallet, a universal state patch, or an independent NPC planner.

## Next-work navigation and stop conditions

[WW11](maintainers/world-agent-writes.md) owns current-main reconciliation and sustained integration. [WW07 / INV-21.5](maintainers/world-agent-writes.md) owns the real Macrofold connector/harness release gate. [WW15 / INV-15](maintainers/world-agent-writes.md) owns expanded graph investigation, complete impact jobs and visual editing. [INV-12/18/19](maintainers/inventions-and-world-evolution.md) owns generated art, image-inclusive funding and capability-first qualification; [INV-20 and AC](maintainers/inventions-and-world-evolution.md) own actual repertoire consumers. These are pointers, not new tasks or claims that the parent work is finished.

Unresolved product choices belong in [Open decisions](../archive/05-project/open-decisions.md). Do not ask again whether the conversation is unified or images count toward $5: those are settled. A reachable authenticated deployment and qualified harness/model are operational enablement inputs. Do not treat their absence as an excuse to duplicate adapters or invent credentials.

## Continuing work discipline

Use the GitHub connector for Git operations and publish small coherent commits as work proceeds, at least once every five minutes while making changes. Keep work on the named feature branch; preserve unrelated edits. Read current AGENTS and save policy rather than importing superseded instructions from old conversation messages.

For this work, the owner requested no new automated test suites and no suite execution. Record deferred cases in `docs/maintainers/TODO.md`; run the actual application, production/static build and appropriate existing performance stress tools. Distinguish manual/injected/provider evidence. The owner allowed up to $10 total paid work for the task, including retained uncertain exposure; the $5 product-session default is not another authorization. Ask before changing consequential unresolved semantics, exceeding authority or spending, merging main, or discarding state. Document each implemented subset without checking off its broader unqualified parent.

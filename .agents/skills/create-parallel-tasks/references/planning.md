# Select important work and make it implementable

Use this reference when discovering, prioritizing, expanding or designing a set of tasks. For an already adequate plan, inspect only what is needed to confirm it still supports the requested handoff.

## Establish the current project picture

Start with the [maintainer index](../../../../docs/maintainers/README.md), [general TODOs](../../../../docs/maintainers/TODO.md) and the requested project plans. Follow links to the actual specifications, accepted decisions, relevant [architecture](../../../../docs/architecture.md) and verification evidence. Scan the overall plan enough to understand priority and dependencies; do not read every archive or research document indiscriminately.

For each serious candidate, identify:

- What a player, character, world creator or maintainer cannot currently do reliably, and why solving it matters now.
- Its existing task IDs, requirements, status, dependencies and definition of completion. Several trackers may describe overlapping parts of the same work.
- What relevant source code and recent commits actually implement. A stale checkbox or historical report is not proof of an open bug or absent feature. Distinguish confirmed defects, missing capabilities, hypotheses and unmeasured performance.
- Related active branches/worktrees or other explicitly supplied work. Inspect their scope without modifying them. Exclude duplicate implementation; explain a dependency or shared boundary when useful work touches the same area. Label any uncertainty about current activity.
- Whether the underlying system is an accepted foundation, an incomplete design or behavior scheduled for replacement. This determines whether a local repair is useful or would become throwaway work.

Use focused searches and source references to reduce rediscovery for the eventual worker. Record the inspected revision and important evidence qualifications in the plan, without freezing future prompts to an obsolete commit.

## Four areas to consider, without balancing quotas

These areas help find candidates. They do not impose four workstreams, minimum coverage, equal effort or one engineer per area. User focus and the project's next most important requirements control the selection.

### 1. Bugs in systems the project will keep building on

Prioritize confirmed failures in established shared systems, plugins and extension mechanisms. Consider lost or duplicated actions, incorrect persistence, authorization/privacy errors, incorrect charging, broken player interactions and behavior that silently makes valid decisions fail. Describe a concrete trigger, actual result and expected result; distinguish a source-confirmed path from an observed reproduction.

Avoid spending the batch patching incidental behavior whose accepted replacement will remove the defect. If a defect in a changing system still independently threatens integrity or blocks the selected work, explain that separate reason and select the smallest durable repair. Do not use “subject to change” to ignore a defect in a shared component that the next features rely on.

### 2. Foundations and the engine/world boundary

Apply the [engine/world principles](../../../../docs/engine-and-world-boundaries.md). Look throughout relevant domain, server, protocol, UI, prompt and configuration paths, not only the file where a literal first appears.

Identify world laws or content made universal by engine code: fixed capabilities, examples and vocabulary repeated in prompts or schemas; hard-coded demonstration outcomes; arbitrary lists that force an engine edit for each new world behavior; and multiple writable versions of the same fact. Authored content and finite trusted capabilities are legitimate. The problem is misplaced ownership, unjustified rigidity or a missing supported mechanism, not every constant or every unsupported feature.

Prefer a useful complete extension through existing owners over a parallel framework or speculative universal system. Explain the native mechanism, the world's replaceable rules, the exact extension point and what remains unsupported. Include a genuinely different case when it establishes that the mechanism is reusable rather than a renamed demonstration. Consider current callers, units, definitions, save/load, privacy, character knowledge, failure, cancellation and repeated delivery where they affect the change.

Audit relevant [limits](../../../../docs/limits/README.md) and [limit-change priorities](../../../../docs/maintainers/limits-audit.md). Distinguish:

- A per-request work bound with explicit continuation or honest failure.
- A temporary supported-capability restriction with a documented reason and expansion trigger.
- A retained-data or population cap that conceals unresolved growth, correctness or architecture.

Shortcuts can help development, but must not create false confidence. For example, a small allowed memory count does not prove that retrieval will work as a character accumulates years of experience. State what dimension grows, what work grows with it, what is currently measured, and what the planned change proves. Do not promise scale by shrinking the workload or quietly removing required evidence. Track actual new or changed limitations with their owner rather than introducing another limit catalogue.

### 3. World behavior that makes play richer

Apply [the repertoire-priority check](../../openlegend-prioritize/SKILL.md#check-repertoire-priorities-when-selecting-gameplay): inspect current catalogue priorities and whole-game coverage, identify the highest-priority unfinished relevant entries, and reconcile them with delivered/ongoing work and prerequisites. Cite selected IDs/priorities and explain departures from higher-ranked unfinished alternatives. Consult the relevant [repertoire proposals](../../../../docs/repertoires/README.md), action plans and existing game research for their full behavior. Favor a useful player/character journey over another isolated command or canned scene. When choosing gameplay work, select the valued experience before its supporting mechanics using [Prioritization](../../openlegend-prioritize/SKILL.md). Survival can offer discovery, dangerous opponents, useful invention, relationships or making a home; do not default to maintenance and supply management merely because nearby code supports them. The user’s focus controls which experiences to compare.

Specify what starts the situation, what the character knows, which choices are available, what native actions can actually accomplish, and what changes in the world when they succeed or fail. Identify missing supporting mechanics rather than describing an attractive outcome the engine cannot deliver. Do not confuse a scripted demonstration with autonomous choice or an implemented primitive with reliable model behavior.

Use the selected behavior as a concrete example of building an authored world on the engine: world-specific policy, language and tuning stay with that world, while reusable execution and integrity stay with their established owners. Avoid adding special cases merely to make one named character perform the desired action. Describe the general solution and the genuine evidence needed for its claimed behavior.

Use existing research to explain useful patterns and rejected tradeoffs. Conduct new external research when requested or when a current external claim needs verification; do not call old research “up to date” without checking it. Inspiration is not a requirement to reproduce another game's entire system.

### 4. Presentation, usefulness and usability

Inspect the actual supported player/creator task, then read [UI/UX essentials](../../../rules/ui-ux.md) and only the relevant handbook chapters. Inventory, authoring tools and conversations are examples of surfaces to consider, not compulsory assignments.

Consider aesthetics, functionality, convenience and clarity together. Specify information hierarchy, placement, line wrapping, spacing, proportions, useful visible content, scrolling and narrow/short layouts. Avoid both overwhelming displays and omission of facts needed to choose an action. Account for input, focus, loading, empty/error states, stale information and preservation of unfinished user input when relevant.

Use suitable game and application patterns from maintained research. For conversation tools, consider early visible output, meaningful progress and readable long conversations only where the current provider/application contract can support them. A cosmetic progress indicator is not evidence of actual streamed text. Identify server/protocol work needed for an honest UI; never let presentation imply authority or capability the game lacks.

## Rank the candidates and size the batch

Apply the prioritization skill’s experience, smallest-complete-delivery and full-burden comparison when choosing work. Make the priority reasoning visible: severity/urgency, player value, foundational dependencies unlocked, reach, risk of expensive future rework, effort, uncertainty and existing coverage. Prefer qualitative reasoning and evidence over invented numerical scores. State why major attractive alternatives are deferred without producing a second exhaustive backlog.

Honor a user's named task or restricted focus. Enabling work may be necessary, but explain it. A broad candidate audit does not authorize unrelated implementation. If the requested count exceeds the useful independent work, explain the shortfall instead of padding the batch with minor chores or disguising serial dependencies as parallel tasks.

Estimate affected logic and complexity under `AGENTS.md`. If capacity is given, include design completion, implementation, relevant verification, documentation and integration effort. Show uncertainty and bottlenecks; do not equate AI assistance with a guaranteed speed multiplier, or fill an hour target with invented requirements. Shared integration effort belongs in the allocation, not in a hidden extra engineer.

## Divide the work so agents can act independently

Group by coherent behavior and responsibility, not arbitrary file counts or the four task categories. Several related items can belong to one assignment. Shared files are normal; avoid needless fragmentation merely to eliminate merge conflicts. Minimize competing edits to the same meaning, especially authority, data contracts and state transitions.

For each shared boundary, specify its producer, consumers, agreed request/result meanings, invariants, failure behavior and where the definition lives. Resolve consequential design choices in the plan before handoff. One task owns each semantic implementation; another task may consume it without recreating it.

**Do not make worker communication part of the design.** A dependency must be one of:

- Already implemented and identified by a usable reference.
- Included in the same assignment.
- A documented prerequisite delivered in an earlier wave, with the owner told when the dependent task can start.

Planning a later wave is valid; labeling a blocked task immediately runnable is not. If meaningful work can proceed independently before the prerequisite, identify that part and the exact remaining gate. Never solve missing design detail with “coordinate with another agent.” Do not allocate an integration-agent role, cross-branch merging or other operational powers unless the user specifically requests them; describe the combined acceptance and dependency order instead.

## Complete the task definitions and design documents

Use existing adequate documentation. Where material design is missing, create or strengthen the paired feature/technical design and focused maintainer records under the repository's design/documentation rules. Avoid copying full canonical contracts into every brief.

Each assignment must provide or precisely reference:

1. **Purpose and priority:** the concrete problem/opportunity, intended player/character/creator outcome, and why it belongs in this batch.
2. **Current versus intended behavior:** evidence of what exists, the exact change, examples, and supported limits. Keep proposed, approved, implemented and verified distinct.
3. **Scope:** included work, explicit exclusions, shared responsibilities and relevant existing task IDs. Clarify a partial child task's relationship to its broader parent.
4. **Design:** engine versus world ownership, existing mechanism to extend, public/data/configuration contracts, units, authority and lifecycle implications. Resolve important alternatives instead of telling the engineer to rediscover them.
5. **Implementation map:** ordered changes, relevant source entrypoints/callers and precise design sections. Include enough concrete references to shorten searching without pretending filenames alone explain behavior.
6. **Dependencies:** what is already available, what belongs to this task, and what prerequisite must be supplied before dependent work starts. State assumed versions/definitions only where current integrity requires them.
7. **Completion evidence:** observable success and meaningful failure cases, existing applicable checks/tools and required integration outcomes. Follow `AGENTS.md` for how verification is performed; do not introduce a requirement to author tests.
8. **Documentation mapping:** canonical specifications, world rules, limits and every overlapping maintainer requirement that must be reconciled as the change is delivered.
9. **Estimate and risks:** likely effort/logic affected, uncertainties, consequences of a dependency failing and what evidence would require revisiting the plan.

Walk a concrete scenario through inputs, decisions, execution, visible effects and persistence where relevant. An engineer should know what must happen, who owns it, what may fail and how completion is established without the originating chat. If an unanswered question requires developer input, complete the independent definitions and then ask under [the root question rule](../../../../AGENTS.md#resolve-developer-questions-before-dependent-work) before finishing dependent designs or assignments. Labeling the assignment design-only does not resolve its prerequisite.

## Keep every affected record truthful

Use the [documentation policy](../../../rules/documentation.md#keep-maintainer-work-synchronized) as the owner. The allocation may index existing work; it must not become a conflicting replacement backlog.

Identify overlaps before writing prompts. Completion of one scoped requirement should update that requirement wherever it is tracked, with concise evidence links. A partial implementation should narrow the remaining task and preserve unmet acceptance, not check the whole parent feature. Reopen a regression and record changed dependencies when evidence requires it. Update specifications and actual behavior descriptions together; do not rewrite accepted requirements merely to declare success.

Planning itself never closes runtime tasks. Existing accurate documentation needs no ceremonial rewrite. Give the future worker exact affected paths/sections and the expected reconciliation, rather than a generic “update docs” instruction.

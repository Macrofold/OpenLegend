---
name: openlegend-design
description: >-
  Choose the scope of feature specs and technical designs, execute a project plan after chat approval,
  or design changed engine/world contracts and gameplay discoveries, rewards, knowledge or progression;
  not routine fixes or prose corrections.
---

# Design from playable behavior

When Mike asks for a prioritized allocation or standalone task prompts, use [create-parallel-tasks](../create-parallel-tasks/SKILL.md). For agents working together on an already authorized implementation, coordinate their work under the [implementation workflow](../../rules/implementation.md).

Start with player/NPC scenarios: trigger, available knowledge, interaction, visible outcome and meaningful failure, or equivalent non-game examples. Consult relevant [repertoires](../../../docs/repertoires/actions.md) for context and expansion possibilities, not automatic requirements. Separate the ambitious target from feasible, incremental end-to-end stages. Follow the [root planning requirement](../../../AGENTS.md#plan-before-implementation), scaling detail to the task.

For a new gameplay mechanic, compare the complete benefit and burden with the already-capable ordinary route, including the actual world clock, materials, approach, controls and conversation. Correct counters or probability arithmetic establish mechanical behavior, not whether people notice or value it; record that human-evidence gap separately. This check applies while implementing an agreed feature too, without reopening prioritization or silently retuning accepted rules.

Apply [the developer-question rule](../../../AGENTS.md#resolve-developer-questions-before-dependent-work) to design as well as code: complete the independent parts, then obtain the developer's answers before developing the dependent specification. An open-decisions section records remaining questions; it does not replace asking them or authorize designing around assumed answers.

## Discoveries, rewards and earned progress

For gameplay discovery/reward/knowledge/progression work, read the relevant [knowledge contract](../../../docs/knowledge.md) and authored-world profile before planning changes. Distinguish finding a place, inspecting an object, learning a method, taking stock, manufacturing and using the result; one does not imply the others. Compose existing custody, knowledge, admission and manufacture owners, with the world's profile selecting rewards, grants and tuning. A physical record discloses its exact admitted method through [the record contract](../../../docs/knowledge.md#physical-production-method-records); it is not a hidden substitute for live invention. Keep origin and qualifying action evidence durable and consistent across receipts, repeated requests, persistence and player labels. Progress must credit what actually happened, not merely the presence of equivalent knowledge or an output item.

Name the useful option or tradeoff the reward adds and a worthwhile stopping point where the feature allows partial participation. Specify how a player would use the reward in ordinary play. For a discovery that teaches a production method, follow it through manufacture and use. Where the world has finite stock, repeat inspection or private knowledge, check what remains and what a second visitor can actually discover. In a design-only task, describe these checks. Run the applicable checks during authorized implementation or verification. Report mechanical correctness, the engineer's assessment of usefulness, uncoached player enjoyment and balance separately. See the [expedition example](../../../docs/verification/rewarding-expeditions.md#practical-value-of-the-second-trip).

## Feature-spec or technical-design requests

Honor an explicit request for only one document or for both. When Mike asks for a feature spec or technical design without restricting the deliverables, choose by what needs deciding.

- For a new capability, or a change with distinct product and engineering decisions, create or update the cross-linked pair in `docs/projects/<project>-feature-spec.md` and `docs/projects/<project>-tech-design.md`. The feature spec explains what people or characters can do. The technical design explains how the system delivers it.
- For a small change to an established feature, update its existing document when it covers the whole change, including the affected behavior, implementation decision and how to verify it. Reconcile affected tasks and limits in their existing records. A request for a design of that change does not by itself require a second document.

Follow [Feature documentation](../../../docs/feature-documentation.md) for required content and the Maintained records section linking the focused implementation tracker and feature limits/constraints inventory. Keep behavior distinct from mechanism and proposals from implemented behavior; record numerical and behavioral restrictions with reasons, restrictiveness and removed/no-limit decisions under the linked tracking rules.

For each costly qualification, distinguish a required pass from a required measurement or exploration. State the workload and what a failed result means; do not silently create a capacity promise. At completion use [contract promotion and project filing](../../../docs/documentation-system.md#current-contracts-and-completed-projects).

## Architecture and extension boundaries

Read the specification and focused tracker for the feature being changed. Use the [boundary questions](../../../docs/engine-and-world-boundaries.md#5-a-repeatable-boundary-decision) and [twelve design principles](../../../docs/engine-and-world-boundaries.md#design-principles-for-every-feature) to decide who owns each rule.

Distinguish protected runtime integrity, reusable mechanisms, replaceable policy and authored content. Could another coherent world differ? Compose existing operations first; add a narrow trusted capability only for missing computation. Native code can implement world policy. Generality is not arbitrary strings, ambient permissions or executable prose.

Trace relevant ownership, units, permitted reads/writes, triggers, work bounds, interaction effects and lifecycle through save/restore. Include cognition/observation and player discoverability, not only storage. For invention/world-authoring work, specify supported inspection, creation and modification through existing admission, with understandable consequences and explicit unsupported capabilities.

For physical mechanics, apply the [physical-interaction design checks](../../../docs/spatial-world.md#physical-interaction-design-checks) before calling the design ready. For repeated native processes, collection queries or derived caches, read [Performance](../openlegend-performance/SKILL.md) during design rather than waiting for a measured slowdown. Source inspection and paper calculations can establish a design's contracts; they do not establish runtime geometry, player usability or scaling acceptance.

For a change to a reusable rule or a claim that it works across cases, apply the [contrasting-example requirement](../../../docs/engine-and-world-boundaries.md#5-a-repeatable-boundary-decision). Localize necessary v1 specificity with its owner, limit, seam and extraction trigger instead of building an unused framework. Logical modularity does not require new packages, services or an ECS replacement.

When replacing a fixed world behavior with installed definitions, trace availability, parameter binding, NPC offers, player details, resource effects, reusable methods and saves to the same definition owner. Vary the contrasting example's real requirements, input/output cardinality or duration, not only its name; include shared-material requirements and stale or missing prerequisites when applicable. A generalized executor alone does not prove that downstream consumers stopped assuming the original recipe.

## Approval to implementation

Use [root task authorization](../../../AGENTS.md#task-scope-and-authorization). Mike's chat approval of the discussed implementation plan is enough to start its approved scope. Interpret “looks good” or “yes” in light of what Mike was asked to approve. Honor qualifications such as “phase one only” or “do not implement yet.” A standalone “continue” resumes the current assignment. During design it continues design. After implementation is authorized it resumes unfinished implementation. A GitHub approval or document-status change supplies no new chat authorization.

For a design-only request, deliver the document or pair selected above, feasible stages and any open choices. Reconcile affected documents, tasks and navigation under [Documentation](../../rules/documentation.md#reconcile-documentation), closing only satisfied design scope under [completion](../../rules/documentation.md#project-status-and-completion). Only after executable work is authorized, follow the [implementation workflow](../../rules/implementation.md) and [initial startup](../../../AGENTS.md#work-discipline). Reconcile actual missing/conflicting requirements and tracker coverage under [Documentation](../../rules/documentation.md#project-approval-and-current-truth), then commence implementation in the same session. Accurate plans need not be copied into several owners before coding; planning alone does not complete implementation.

Use [root completion/handoff](../../../AGENTS.md#completion-and-handoff--every-task) and [Verification](../../rules/verification.md) through the full agreed scope, including user/agent surfaces; the linked documentation policy owns work IDs, dependencies and acceptance status.

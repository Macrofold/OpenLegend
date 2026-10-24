# Workflow adoption — scope and completion

| Status      | Current progress                                                                                          | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Operational guidance and named migrations are verified locally; fresh-session routing remains unobserved. | 2026-10-24   |

Mike authorized the package from `f48601abe` on October 24, 2026. Base: `https://github.com/Macrofold/OpenLegend.git`, refreshed `origin/main` at `ecf49b1237e0aa83e408572a486aadb7f29cb910`. The [feature specification](01-workflow-feature-spec.md) owns the accepted outcome; the [technical design](02-workflow-tech-design.md) owns routing and acceptance cases.

## Scope and canonical owners

| Concern                                                                             | Operational owner                                                                                                       |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Authority, world/engine boundaries, development-save policy, reporting and commits  | [Root instructions](../../../AGENTS.md)                                                                                 |
| Authorized implementation, planning and continuity                                  | [Implementation workflow](../../../.agents/rules/implementation.md)                                                     |
| Conditional technical reads, including new files and cross-layer consumers          | [Engineering context](../../../.agents/rules/engineering-context.md)                                                    |
| Risk-based local checks, required passes versus measurements, fixtures and spending | [Verification](../../../.agents/rules/verification.md)                                                                  |
| Cost-aware design and detailed topic routes                                         | [Performance core](../../../.agents/skills/openlegend-performance/SKILL.md), [technical chapters](../../performance.md) |
| Complete affected review, correction-driven follow-up and finding severity          | [Review](../../../.agents/skills/openlegend-review/SKILL.md)                                                            |
| Documentation ownership, current contracts, research, evidence and completed filing | [Documentation policy](../../../.agents/rules/documentation.md), [handbook](../../documentation-system.md)              |
| Design-only scope and approved implementation                                       | [Design](../../../.agents/skills/openlegend-design/SKILL.md)                                                            |
| Base selection, conflict stops and history protection                               | [Rebase](../../../.agents/skills/openlegend-rebase/SKILL.md)                                                            |
| Guidance maintenance, adapters and native discovery                                 | [System guide](../../../.agents/README.md), [guidance skill](../../../.agents/skills/openlegend-guidance/SKILL.md)      |

Contributor guidance, feature-documentation guidance and the explicitly invoked full-documentation-review skill use these same owners. No additional implementation framework, maintained checker, test suite, scheduler or game runtime is part of adoption. Detailed replacement wording has its operational home above; it is not a second live policy in this plan.

## Document restructuring

The [bounded migration](06-documentation-system-design.md#bounded-adoption) names the historical project snapshots, first-playable/combat evidence and designs, guidance tracker and changelog. Existing useful contract paths remain valid. Historical failures, dates, revisions, accounting scope and unresolved acceptance remain discoverable; duplicate wording and obsolete editing instructions need no parallel copy. Unrelated performance histories adopt the convention when their owner next maintains them.

## Acceptance

- Preserve the protected development-save block and the intent of authority/privacy, world ownership, test-authoring, spending and conflict/history rules. Later local-only verification remains controlling.
- Preserve every unique useful contract, open task and valid result; one canonical body per subject, with repaired references.
- Validate changed-file formatting, structural guidance, local targets/anchors and representative navigation. Review the complete affected diff, including overlapping instruction obligations.
- Assess representative task read sets, including scoped guidance and conditional detail. Root bytes alone are insufficient; static sizes are not observed loading or a speedup claim.
- Observe the [focused fresh-session cases](02-workflow-tech-design.md#focused-routing-and-behavior-checks-for-later-adoption), correct demonstrated issues and repeat only invalidated checks. The broader historical CG05 vendor matrix is separate.
- Close and file the project only after this scoped acceptance is complete. Current operational owners stay discoverable after filing.

## Current adoption progress

Operational instructions, navigation, named migrations and local checks are delivered and integrated into local `main`. The source branch remains `codex/agent-workflow-adoption` in `/Users/mzw/.codex/worktrees/workflow-adoption/OpenLegend`. [Local evidence](../../verification/agent-guidance/2026/2026-10-24-workflow-adoption.md) records scope, preservation, context measurements and limitations. [CG34](../../maintainers/agent-guidance.md#cg34--adaptive-workflow-and-documentation-adoption) tracks acceptance without another progress diary.

Remaining: a bounded read-only fresh-session routing exercise on the installed development runtime, then final project status/filing. The source session did not run those observations; static review cannot close that requirement. No developer decision, extra spending or broad game qualification is needed. No services or unresolved financial commitments are owned by this task. Integration does not close the remaining fresh-session qualification or complete the adoption project.

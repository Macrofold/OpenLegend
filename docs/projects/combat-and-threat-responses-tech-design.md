# Combat and threat responses: technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The contract and delivery plan are being detailed against current main; runtime implementation remains unstarted. | 2026-10-17 |

## Design baseline and work plan

Repository `Macrofold/OpenLegend`, refreshed `main` at `0eb7358f251d1ab706592ccb6e9829e98c729fe9`; design branch `codex/combat-reactions-and-animal-escape-20261017`. The [feature specification](combat-and-threat-responses-feature-spec.md) records Mike's accepted scope. This task changes documentation only: estimated executable logic change in this branch is **zero**. Future implementation crosses domain, world policy, server cognition and player controls and therefore needs staged integration and separate runtime qualification.

Complete the design by tracing existing owners, specifying physical/contact authority, recording animal policy, defining actor-permitted evidence and appraisal, defining both Decision API stages, and reconciling contextual controls. Review every repertoire's structure and the relevant entries, preserving useful alternatives as possibilities rather than turning all of them into obligations. Reconcile scoped design-register dispositions, focused tasks, world contracts, limits and significant decision history. Review the complete changed documentation and its links before final delivery.

No game or provider experiments are run for this design. Additional Jev cost is **$0**, cumulative task total **$0**. Implementation must measure actual calls, receipts, latency and costs; a claimed faster model is not evidence of faster complete reactions.

## Existing owners and change boundaries

| Responsibility | Existing owner or seam | Design requirement |
| --- | --- | --- |
| Exact attack admission and physical execution | Domain strike, ranged, contact-defense, body-effect and action owners | Preserve one effect owner, exact life/tool bindings, costs and recovery. |
| World harm and participation choices | Bundled body/participation policies and combat permission adapter | Allow human PvP and physical collateral under authored world rules. |
| Animal behavior | Bundled animal policy, native action/movement and navigation owners | One controller per animal; no model work; destination-based multi-danger escape. |
| Actor evidence | Perception, event observation, retained experience and response-context owners | Distinguish event-time observations from current visibility and hidden truth. |
| Appraisal and personal state | Existing appraisal definitions, source-linked records and cognition context | Interpret threat with actor-specific context without creating a second feeling store. |
| Relevant choices and decisions | Action catalogue/context, Decision API selection and ai-director | Complete feasible offers while busy, two explicit semantic stages, stale-result handling. |
| Reconsideration | Existing attention, dependency invalidation and decision scheduling | Wake for meaningful observed transitions and chosen-purpose boundaries. |
| Command-click | Existing installed context-action ranking and exact preferred-choice guard | Extend current aggression facts with per-opponent continuity; preserve exact preview/admission. |
| Persistence | Current-format save/load and identity owners | Save authoritative ongoing consequences; rebuild derived indexes; no legacy adapters. |

The engine does not infer hostility from selection, a species name, an NPC name or prose. It transports typed evidence and executes admitted commands. World-specific native algorithms are legitimate policy when installed through a narrow supported seam; hiding them in generic callers is not.

## Implementation modules

Use the stable CTR identifiers in the [tracker](../maintainers/combat-and-threat-responses.md). Keep dependent work sequential at its semantic owner; independent profile/catalogue drafting may proceed in parallel.

1. **CTR01:** reconcile attack permission and released-projectile contact consequences.
2. **CTR02:** add exact, observer-scoped encounter evidence and derived per-opponent projections.
3. **CTR03–CTR04:** implement the native animal-controller seam and bundled escape/speed profile.
4. **CTR05:** repair complete cognition choice preparation with explicit work transition semantics.
5. **CTR06–CTR07:** implement generalized appraisals and the two-stage prepared response repertoire.
6. **CTR08:** connect evidence changes and chosen-purpose progress to bounded reconsideration.
7. **CTR09:** extend the existing contextual action preference through the same authoritative catalogue.
8. **CTR10:** qualify the integrated player and independent-character journeys, resolve failures, and reconcile delivered truth.

Each module must leave an end-to-end usable path, not merely add a type with no consumer. The finished design will supply fields, dependencies, failure rules, deadlines, work bounds and acceptance for those modules.

## Performance questions answered before implementation

Cost grows with nearby living density, active danger relations, route candidates, prepared action/tool combinations, retained evidence and concurrent model work. Share actor-independent tool feasibility and observer-permitted snapshots within the existing read scope. Spatial/native work uses meaningful-change triggers and existing regional/navigation preparation rather than all-animal/all-human scans each tick. Model work is reserved and scheduled through the existing owner.

Invalidate reuse for the actual entity life, control or timeline, observed evidence, physical/navigation dependencies, chosen objective, relevant authored definitions and elapsed deadlines. A whole-world revision is not a substitute for identifying those dependencies. Budget exhaustion means incomplete work, not safety, lack of witnesses or unreachable terrain.

Measure complete caller paths, including cold preparation, dense danger, obstacle invalidation, provider-stage delay and persisted continuation. Retain deterministic native ordering and saved random choices. Report planned targets separately from measured results.

## Maintained records

- Implementation and acceptance state: [Combat and threat responses](../maintainers/combat-and-threat-responses.md).
- Limits: [Base world](../limits/base-world.md), [ranged/evasion](../limits/parallel-batch-06-rivals-and-contested-ground.md), and [interface](../limits/ui-ux.md).
- Player behavior and scope: [Feature specification](combat-and-threat-responses-feature-spec.md).
- Shared contracts: [Engine/world boundaries](../engine-and-world-boundaries.md), [targeted actions](../targeted-actions.md), [spatial world](../spatial-world.md), and [save/load](../save-and-load.md).

# State systems and anticipation of future influences

New state systems and ownership changes must respect the [save/load design](../../docs/save-and-load.md); define their durable facts and reconstruction responsibilities as part of their own design.

Recorded September 19, 2026. **Accepted direction from M07/M08:** changing quantities should have meaningful state, a responsible update system, and contributions from other mechanics. When a new mechanic exposes a missing state/system, the engine should recognize it and propose the necessary definition. It should consider existing influences and plausible influences not yet specified, implemented, or discovered, without creating every related subsystem. Data shapes and calculations below are proposals, not code.

Related: [world creation/discovery](world-creation-and-discovery.md), [materials/construction](evolving-materials-and-construction.md), [complexity control](simulation-scope-and-complexity.md), and [world rules](world-rules-and-parameters.md).

## A numeric variable with an owner

Wetness, temperature, integrity, fatigue, and similar quantities need defined meaning, range/units, initialization, persistence, and one responsible system. A system can be a small registered rule/module inside the simulation; it does not imply a separate service, agent, or continuously running process for each variable. Several closely related variables can share a system when their updates must be coordinated.

Other mechanics supply contributions or requests. The owner combines valid contributions and updates the authoritative value. State changes that are not naturally numeric can remain typed relations, categories, flags, or records; numeric thresholds should not force every fact into a scalar.

A simple wetness sketch is:

```text
wetness_change = (sum(incoming_rates) - sum(drying_rates)) × simulation_elapsed_time
```

This is an illustrative game model. Contributions must use compatible units; discrete changes apply once rather than being multiplied by elapsed time again. Evaluate applicable contributions against consistent state, account for resource sources/sinks where relevant, and obey range/saturation behavior. Do not count one rain exposure twice merely because two mechanics reference it. If moisture is tracked physically, saturation/overflow needs an explicit sink or transfer rather than duplicated water.

Actual rain exposure changes object wetness whether or not someone sees it. Perception updates an actor's knowledge. A character's mistaken belief that a roof is dry cannot overwrite the roof's actual moisture state.

Thresholds can change behavior or emit events. Some effects depend on duration or accumulation: a proposed deterioration model can accumulate damage during sustained unfavorable conditions rather than instantly creating rot at the first wetness crossing. Define reset, recovery, hysteresis, or accumulation only where useful. These are game-design choices to test, not a comprehensive physical model.

## When a new system is genuinely needed

The authoring path first checks whether a proposed effect belongs to an existing state/system family. Use the registry to avoid duplicate variables such as independent `wetness`, `dampness`, and `water_saturation` values describing the same condition. A new label may map to an existing quantity or a derived display value.

If no compatible owner exists, propose a component/system definition with:

| Field | Required meaning |
|---|---|
| State contract | ID, type, units, range, initial/unknown semantics, instance versus shared definition |
| Ownership | Update system, authoritative inputs/outputs, permitted contribution interface |
| Progression | Rate/event model, simulation clock, natural drift, accumulation and limits |
| Current influences | Supported causes that can increase, decrease, or otherwise change the state |
| Anticipated influences | Plausible causes not yet available, with assumptions and missing dependencies |
| Consumers | Admitted rules that read the state; separately listed possible future consequences |
| Observability | What the server knows, what actors can perceive, and how changes are presented |
| Compatibility | Profile/rule versions, inheritance, initialization/migration for old objects and ongoing work |
| Verification | Representative cases, counterexamples, resource constraints, interruption and failure behavior |

Not every system needs an elaborate bespoke implementation. Prefer a supported rate/event family with parameters. New custom algorithms or host operations still use their established admission paths. Registering a state variable without meaningful initialization and behavior does not implement the mechanic.

## Anticipate beyond the current feature set

When defining wetness, the AI should think beyond the action that first required it. It might identify rain, immersion, splashing, contact with another wet material, shelter, evaporation, warming, wringing, or an absorbent covering as possible influences. Some may already work; others may not exist in the current game. A fantasy-world profile might admit an additional influence that a grounded profile forbids.

These are candidate relationships to evaluate, not universal claims that all materials react identically. Record conditions and uncertainty. A non-absorbent part and a cloth may need different representation or applicability even when both are described as wet.

For an illustrative world where only rain and basic drying exist:

| Candidate influence | Intended relationship | Proposed authoring status |
|---|---|---|
| Exposed rain | Increase wetness using actual coverage | Supported/admitted if its rule already exists |
| Basic drying | Reduce wetness over simulation time | Supported/admitted if its rule already exists |
| Immersion | Potentially increase wetness | Anticipated; requires contact/immersion semantics |
| Wringing a cloth | Potentially reduce retained moisture | Anticipated; requires deformable/absorbent-material applicability and action/resource rules |
| Contact with an absorbent material | Potential moisture transfer | Anticipated; requires both materials' capacities and transfer accounting |
| Moisture-removal spell | Profile-dependent effect | Forbidden under grounded realism; otherwise a candidate subject to an actual magic system |

The status names describe proposed runtime records. No rows above claim these mechanics are implemented in Open Legend today.

Keep separate lists for causes that change a variable and consequences that read it. Wetness influencing ignition is a consumer relationship; a supported heat/drying process influencing wetness is an input relationship. Avoid creating circular updates implicitly. Each admitted feedback connection needs an explicit contract and evaluation policy.

## A lightweight influence record

An anticipated influence should retain a concise description, the affected state and direction/conditional behavior, applicability assumptions, world compatibility, missing dependencies, known related families, and examples/counterexamples. Useful additional fields include provenance, confidence/uncertainty, priority, what request would make it relevant, and its status.

Distinguish:

- **Supported/admitted:** an executable, versioned relationship actually participates in state updates.
- **Anticipated:** a plausible future relationship recorded for retrieval and design, with no active effect.
- **Uncertain:** insufficient information about relevance, feasibility, or compatibility; no assumed effect.
- **Forbidden in this profile:** contradicts the selected world's rules; ordinary requests cannot activate it.

Engine-known but character-undiscovered behavior is a different dimension. An admitted drying rule can operate even if a particular NPC has not learned it. An anticipated unimplemented influence cannot operate merely because the authoring AI thought of it. These notes are engine/creator knowledge, not automatic memories or skills for every resident.

Bound the anticipation step to a small relevant set of likely causes, consumers, and surprising counterexamples, using reusable domain/material templates. Do not recursively expand every missing dependency into another generated subsystem. Store the notes compactly, merge duplicates, and avoid loading the entire speculative catalog into each runtime prompt. Breadth/depth and token budgets are implementation choices, still open.

## How a future influence becomes active

When an action or design request makes an anticipated relationship relevant, retrieve its record and recheck current world compatibility, definitions, and live context. The note can help identify dependencies and tests; it is not an approval or proof of correctness.

Reuse an existing compatible implementation if one has since appeared. Otherwise generate the smallest required definition, validate effects and limits, register its owner/contribution contract, initialize or migrate affected state, and activate it with the correct physical scope. Update the record to point to the admitted version. Concurrent attempts to define the same relationship need canonical identity/version checks so they do not install duplicate writers or contributions.

Do not replay hypothetical historical effects that were never simulated. A recorded possibility of immersion is not evidence that an object was immersed yesterday. Preserve actual history and use an explicit initialization policy where earlier detail is unavailable. If the relationship remains unsupported, report missing support/uncertainty honestly; do not treat it as physically impossible solely because it is unimplemented.

This approach creates a map of likely future connections. It does not require all those connections to run, exist as services, or become commitments on the development backlog immediately.

## Evidence to collect

Test simultaneous rain and drying, duplicate contributions, event-versus-rate accounting, saturation, sustained-condition thresholds, hidden state versus observed beliefs, duplicate generated variable names, a future influence requested later, and a profile-forbidden proposed influence. Verify that anticipated notes have no active effects and are not leaked into character knowledge; activation must validate dependencies and preserve actual history. Re-run saved scenarios under pinned versions and compare different simulation step sizes. These are proposed checks only.

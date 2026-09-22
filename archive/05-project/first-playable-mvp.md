# First playable MVP — AI residents and emergent survival

This specification owns the accepted first-playable product scope. The current executable implementation is described in [Architecture](../../docs/architecture.md); [Verification](../../docs/verification.md) distinguishes automated evidence from the open live-provider acceptance gate. The [roadmap](roadmap.md) describes product milestones, and the [maintainer work index](../../docs/maintainers/README.md) links detailed delivery tasks.


The [agency specification](../../docs/agent-agency.md) owns optional decisions and operational goals/plans; [memory architecture](../../docs/memory-architecture.md) owns the memory/attention target: level-2 speech with Jev escalation, independent background reflection and hourly memory cleanup, awareness-scoped recall and accepted inner-world text. [CR01–CR12](../../docs/maintainers/cognition-redesign.md) extend the delivery plan; they do not erase this MVP's useful live conversation, continuity, invention or native-survival acceptance requirements.
## What the first version must demonstrate

The first playable world includes a live AI resident who makes decisions, remembers relevant interactions, and can converse with the player. The player can find resources, ask for a plausible new tool, have AI generate its supported mechanical definition, craft it, and use it to affect the world. The concrete initial story is **gather resources → invent and craft a sling → hunt an animal → harvest and eat it**, alongside ordinary survival and conversation.

A carrying-bundle demonstration remains a useful engineering fixture. It does not satisfy this agreed first playable scope on its own. Likewise, a headless or no-model simulation is valuable for testing and service-failure recovery, but it does not demonstrate the promised AI experience.

Keep the setting small: one wilderness map, one conversational NPC initially, a few resources and animal types, some possessions and practical survival knowledge, readable grounded PlayCanvas presentation, and simple rules. The eventual primitive group and larger social world remain the direction; 6–12 residents are not a prerequisite for this first personal playtest. NPC mistakes and death remain possible.

The follow-on invention within this initial creative loop should exercise another supported construction, with a basic bow-and-arrow path the agreed candidate. The user's arrow example was tentative; exact recipe and balance remain open. An arrow requires a compatible launcher to function as intended. Suitable prepared grass fibers, wood and bone can supply recipe roles when their actual properties meet the requirements; naming those ingredients must not guarantee a usable weapon. Simple material grades and ranged rules are sufficient for this game feature.

## Live intelligence and ordinary execution

“Constantly making decisions” means the resident remains autonomously active and responds to meaningful changes. It does not require a paid model call for each step, bite, work increment or simulated second.

| Responsibility | Initial implementation boundary |
|---|---|
| Conversation, goals, plans, meaningful reconsideration, interpretation of unusual requests | Live LLM calls with scoped evidence, bounded work and validated outputs |
| Suitable bounded semantic judgments, such as selecting among candidate interaction families | Jev through the execution interface, with explicit unknown/other outcomes and measured game cases |
| Novel supported recipes and item definitions | LLM generation or a bounded authoring workflow; independent admission before execution |
| Movement, inventory, work, needs, damage, food and projectile resolution | Trusted ordinary code operating on authoritative state |
| Basic animal behavior | Simple movement, awareness and flee/reaction rules; no requirement for an LLM per animal |

The preceding conversation interpreted “Java” as **Jev**, the semantic service already under discussion, and the user agreed to that response. This records Jev plus LLMs as the first-playable integration direction; it does not select Java as the game implementation language. Jev is not the recipe generator or final authority on physics. Not every action needs both services.

Maintain a current goal and short executable plan. Reconsider when addressed, materially hungry or threatened, blocked, finished, or presented with a relevant opportunity. Native urgency/interruption rules can stop unsuitable work promptly. Record observations, attributed beliefs, learned procedures and important commitments in bounded structured memory; the MVP does not require a full personal workspace or comprehensive mind simulation for every resident.

Use fixtures and a direct execution adapter for development when helpful. A live demonstration must actually exercise conversation, decisions, generation and the selected Jev route. If a service is unavailable, report that limitation; a fixture or silent replacement does not establish that the agreed integration works. Macrofold remains the preferred candidate execution service subject to fit, with a replaceable port. This agreement does not require a native sandbox or durable workflow for every thought.

## What is native and what is invented

The trusted foundation needs enough capabilities to make the hunting story real: perception and resource discovery; movement; finite gathering and inventory; material preparation and timed assembly; equipment and ammunition compatibility; launching and simple ranged resolution; animal reactions; damage and death; harvesting remains; food preparation and consumption; rest and needs; persistence and an event feed.

AI supplies a new recipe or equipment definition from those capabilities: material roles and requirements, preparation/assembly steps, supported parameters, work and resource costs, use prerequisites, and presentation bindings. It may retrieve reusable material and mechanism families. The final sling recipe must genuinely be generated and admitted during play, rather than a prewritten sling recipe retrieved by an apparently creative conversation. Seed the capabilities and examples needed to compose recipes, without requiring the exact requested composition to exist already.

The same ranged family should support the later bow/arrow example where its contracts fit. Do not create an unrelated special engine for each weapon. A missing trusted operation is a real boundary: defer that unsupported portion with useful feedback or add it through normal engineering. G2 arbitrary scripts and autonomous invention of arbitrary physics are not required for this MVP.

A successful generated recipe spends actual materials and work, creates a durable usable item, and can be found again through compatible wording. Equipping and firing must consume or otherwise account for ammunition consistently. Hits, misses, fleeing, damage, death, available remains, harvested food and eating must change state visibly. Prevent repeat harvesting of the same yield; abstract quantities are sufficient, but harvesting cannot create unlimited meat or bone.

Choose a simple explicit food-preparation rule. If the starting meat requires cooking, provide a dependable supported heat source and cooking action in the same slice. Do not silently omit the preparation dependency or treat all raw meat as equivalent to prepared food. Detailed disease, nutrition and thermal simulation can wait. Basic foraging and rest should remain usable while a novel recipe is evaluated; the NPC need not discover the entire survival action vocabulary to take a known action.

Reasonable assumptions should keep requests flowing. The player can describe a goal and observe the proposed method, relevant costs and progress. Ask only when unresolved meaning materially changes the outcome. Invalid materials, absent ammunition, unreachable prey, forbidden magic and unavailable generation receive distinct truthful feedback. A model timeout does not consume an animal or become a failed physical experiment.

## Time, pause and absence

Pause and speed controls are required from the first playable version. Work, needs, movement, environmental processes and chronological age use the same authoritative simulation clock. The September 19 timing refinement sets 1× to **one simulated minute per real second**, or one simulated day per 24 real minutes. Provide 0.5×, 1×, 3× and 8×; every clock-driven native system uses the same multiplier.

For this initial personal world, **Pause game when hidden** is a saved checkbox in the time-controls settings panel, checked by default. When checked, hiding the tab or taking focus away pauses the world. When unchecked, an open connected game tab permits background simulation and ordinary autonomous AI scheduling under the existing caps. Manual pause still freezes both. Closing all game connections pauses after disconnect detection, with no offline progression or return-time catch-up. Resume from committed state when play resumes. Stop autonomous AI scheduling whenever the effective world state is paused. Cancel unnecessary pending work where supported; a request already sent may still complete and incur usage. Its result must not advance a paused world, and must be revalidated before any later effect. Persistence, cancellation and usage reconciliation may finish without advancing game time.

Manual pause similarly freezes simulation effects and autonomous scheduling. Inspection may remain available; any explicitly requested interaction while paused has a separate, visible policy. Foreground detection combines visibility and window focus; background opt-in uses the event-stream connection even when browser timers are throttled. Disconnect grace and any conversation slowdown remain tuning choices. Do not infer absence from a brief gap between inputs. Fully offline progression and shared-world pause arbitration remain future policy changes.

Acceleration must not produce an unbounded decision queue. Coalesce stimuli, reuse valid plans and admitted recipes, limit concurrent work, and reduce achieved speed or pause visibly when needed. Basic survival can continue during transient provider delays while the world is running; an unavailable AI service is still a degraded experience, not a completed AI MVP.

## Evidence required for a first playable claim

1. In a real session, the NPC pursues a goal, responds to changing circumstances, converses with the player and later recalls a relevant interaction using its permitted evidence.
2. A freeform sling request produces a previously absent supported definition through live AI, passes admission, spends real resources/work and creates usable equipment. Paraphrasing reuses it; unsuitable material and duplicate requests are handled consistently.
3. The player can equip ammunition, hunt with an outcome governed by the game rules, observe an animal react or die, harvest finite remains, prepare food as required and eat it. Success is possible, not guaranteed for every shot.
4. Another supported invention exercises reuse beyond the one sling example; a basic bow-and-arrow path is the selected candidate, with launcher/ammunition and material constraints checked.
5. Save/reload retains world state, item identity, admitted definitions, knowledge and relevant memory. Restore does not repeat paid inference, consumed ammunition or harvested yields.
6. Pause, resume, speed changes and leaving/returning preserve accounting. Absence advances neither simulation nor autonomous AI scheduling. Slow, stale, canceled or failed requests cannot create partial or duplicate effects.
7. A useful Jev classification route and the LLM routes are exercised live, with queue/provider/total latency and actual usage recorded. No cost or capacity claim follows from fixtures alone.

Use targeted fixtures for these outcomes and failure boundaries. No-model tests remain part of engineering verification; live-model acceptance demonstrates the product experience. Detailed anatomy, calibrated ballistics, rich ecosystems, fire spread, structural physics, large populations, voice, sectors, commerce and general G2 execution have separate later gates.

Before paid integration, choose working credentials, development/session spending ceilings and bounded timeout/retry policies. Selecting a live-AI product direction does not set a dollar budget or authorize purchases. Before declaring the creative loop ready, specify the narrow automatically admitted G1 envelope and its counterexamples. These are concrete implementation decisions; they do not require designing every possible future mechanic first.

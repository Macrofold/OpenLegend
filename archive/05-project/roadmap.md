# Roadmap — earn complexity through playable evidence

Status: **proposed sequence**. No implementation has started. Milestones describe outcomes and gates, not calendar commitments. A schedule needs team size, budget, art availability, and the open decisions below.

## What to build first when implementation is authorized

The accepted starting direction is a small group of people in a primitive wilderness setting, with survival knowledge, accessible resources and some possessions, before a village exists. Shelter, cooperation and settlement can develop through play. NPCs may live or die as they learn to survive; survival is not guaranteed by artificially forgiving needs. The proposed first external playtest adds browser login, simple movement, 6–12 people, text conversation, selective memory and an understandable local event log. Cast size and interface details remain proposals.

Treat a reliable [built-in survival foundation](../03-design-proposals/survival-baseline.md) and believable social behavior as parts of one vertical slice. Gathering, eating, drinking, resting and the tools/actions essential to this starting environment must work before novelty generation. Basic work duration, needs, environmental progression, injury, death and persistence belong in P1/P2. Use a minimal shared simulation clock from the outset; creator speed control is wanted, while one real hour per game day is a provisional 24× pacing candidate, not a chosen rate. See [time and simulation speed](../03-design-proposals/time-and-simulation-speed.md).

Do not spend months building a generic engine before anyone can talk to a person. After the survival foundation works, the first generated mechanic should be a bounded, reversible composition with visible consequences, such as using plant-fiber ties to carry a bundle more efficiently. Generation extends established survival abilities; it must not be required to discover an essential action while someone is starving.

Use the accepted PlayCanvas/custom-simulation boundary. Begin P1 with a small [visual proof](../03-design-proposals/visual-direction.md) and a headless simulation fixture: visual appeal must be credible before broad asset production, and game time/rules must work without graphics. This is one small scene and one core, not a custom graphics engine or a multi-renderer framework. Fixed camera and standalone TypeScript remain proposed implementation defaults; their details need evaluation.

## Milestones

| Phase | Deliverable | Explicit scope boundary | Evidence to proceed |
|---|---|---|---|
| P0 — this archive | Research, baseline, proposals, decisions, experiment plan | Documentation only; no running game | Complete mapping and a shortlist of consequential decisions |
| P1 — one embodied survivor | One compelling PlayCanvas wilderness scene, independent headless simulation, player movement, authoritative commands, one NPC with seeded survival knowledge, gathering/eating/drinking/resting, timed work, basic injury/death, simulation clock with creator speed control, save/load and event explanations | No generated code, voice, sectors, paid tiers or deep anatomy; necessities for the selected environment are native actions; no custom graphics engine | Visual proof meets grounded pixel-art/readability goals before broad assets; headless outcomes match displayed outcomes; survival actions work across tested clock rates; injury/death and identity/items persist; duplicates/stale commands rejected |
| P2 — first playable wilderness group | 6–12 distinct people with initial possessions, relationships, text conversation, bounded memory, accessible resources, native fire/survival shelter if needed, small shared world, login/reconnect, basic inventory and barter; human recovery policy selected before enabling player death | Fixed camera, one region, simple rules, creator/debug tools separate; no prebuilt village or guaranteed NPC survival | Returning-player memory feels credible; competent NPCs can access available necessities; deaths have explainable causes and durable consequences; multiplayer conflicts, speed changes and inference outage remain playable |
| P3 — world learns a small invention | Freeform action mapping, guarded mechanism registry, G1 recipe/effect generation, one new reusable interaction, one timed environmental process | Only approved primitives, local canaries, existing assets, no G2 arbitrary scripts | Unseen compatible wording reuses mechanic; negative cases abstain; inventory and privacy invariants hold; broken version can be quarantined |
| P4 — durable community | More crafting/building stages, agreements, simple currency, sparse group records, richer anatomy/conditions, phone text, fuller world persistence | Add only systems players actually use; no assumed civilization simulation | Multiple sessions produce meaningful continuity; recovery and migration tests pass; runaway economy/population loops constrained |
| P5 — voice and living surroundings | NPC voice, speech input, human proximity voice, in-world phone calls, readable captions, basic wall attenuation, light/weather improvements | Text remains complete; complex acoustics/deformation optional | Target browsers work; hostile media subscription tests pass; measured voice spend and intelligibility acceptable |
| P6 — multiple sectors and sustainable access | Admission queues, durable handoff, room routing, entitlements, free/paid quotas, load-tested deployment | Thousands overall only after evidence; no unlimited paid inference | No duplicate inventory on transfer/crash; stable soak/load tests; acceptable cost distribution and restore times |
| P7 — deeper generativity and society | Selected G2 sandbox algorithms, richer assets, families, richer biological aging/development, institutions, scenarios, broader ecology | Early clock/age accounting remains foundational; detailed life stages come later; each feature has a bounded trial; G3 core changes remain releases | Each new layer improves observed play enough to justify maintenance and compute |

P4–P6 can change order based on feedback. Voice may be pulled earlier if spoken presence is essential, but would displace other work. Scale should follow demand; a second sector for testing is useful long before thousands of players, while a global infrastructure program is not.

## P1/P2 implementation backlog, proposed only

| Work ID | Outcome | Dependencies | Verification |
|---|---|---|---|
| I00 | Small PlayCanvas visual proof and repeatable pixel-art family | D02 accepted direction; D09 reference devices; R01/R02; implementation authorization | Creator reviews grounded tone and beauty; sprites, terrain, shadows, tools, captions and camera motion remain coherent; record performance and cleanup effort before broad art production |
| I01 | Engine-independent IDs/component schemas, authoritative simulation clock, creator speed control, timed work, seeded RNG, command/result contract | D01 starting direction; D03 provisional clock policy; D29 | Run without browser/GPU/PlayCanvas imports; serialized state round-trips; invalid operations rejected; work/needs/environment agree across tested speed changes and pause behavior |
| I02 | One sector with navigation, selection and movement | I01, D02 camera/engine | Two clients see the same outcome; server checks speed/reach |
| I03 | Player identity, login/session and reconnect | I01, D05 initial host/auth approach | Reconnect recovers same character; other account cannot claim it |
| I04 | Native survival actions and resources, hunger/thirst/fatigue, minimal injury/death, seeded survival knowledge and utility controller | I01–I02, D26 survival scope | NPC can gather, consume and rest without semantic calls each tick; deprivation can kill; deaths are attributable to world conditions/choices rather than missing essential actions |
| I05 | Local visible-event feed and private-state filtering | I01–I02 | Unseen actors/private memories never appear in client payloads |
| I06 | Provider-neutral asynchronous dialogue and thought queue | I04–I05, D04 cognition budget | Slow calls do not stall survival actions; late/canceled answers discarded; accelerated time cannot apply obsolete plans or require proportionally unbounded inference |
| I07 | Episodic memory, beliefs and commitments | I06 | NPC recalls a promise, distinguishes rumor, preserves active commitments during forgetting |
| I08 | Persistence, durable consequential events, restore, death records and clock/age state | I01, I03–I04 | Crash/restart retains inventories, injuries, deaths, elapsed world/biological time and versioned results without re-calling LLMs |
| I09 | Small cast, art family and first-session content | I00, I02, I04, D02 | Expand the proven art family; players identify residents/actions and understand one cause/effect loop |
| I10 | Usage ledger, queue ceilings, provider fallback and metrics | I06 | Outage/quota/retry tests show bounded cost and no duplicate debit |
| I11 | Shared wilderness playtest and feedback study | I01–I10; R08 clock/survival evidence | Observed conversation/memory value, explainable survival/death, understandable speed controls and limitations, measured costs |

The list is a dependency map, not an instruction to start coding now. No tasks above are complete merely because their designs are documented.

## The P3 experiment that tests the product's distinctive idea

Seed known plant-fiber ties, gatherable materials, inventory, carrying limits and binding/unbinding primitives. Ordinary gathering and carrying must already work. Ask a player who has not seen a special menu to “tie these sticks into a bundle so I can carry them together.” The system should recognize a missing composition, produce and validate it, use existing visuals, and make it available for later compatible situations. The benefit is a new hauling method built on reliable actions, not access to an otherwise missing necessity.

Then test: unsuitable fiber; overloaded or incompatible contents; another actor took the ties; unbinding; duplicate request; interruption during timed work; speed change; reload; another player's reuse; someone who has not learned the method; request text trying to grant administrator powers. The interesting metric is not how fluent the generation is. It is whether the new interaction produces correct, visible, persistent, reusable consequences.

A woven drying rack is a possible second composition using established placement, support and drying rules. Basic fire ignition and survival shelter are native wherever the starting environment requires them. A later constrained tree-fire experiment can extend those fire rules with no propagation, followed by helmet-dependent contact under private testing. These trials stress time/rates and conditional applicability without making essential survival depend on generation.

## Playtest questions and provisional gates

All targets below are hypotheses to adjust with evidence, not service guarantees.

| Area | Question | Suggested early gate |
|---|---|---|
| Visual quality | Is the wilderness compelling to watch, grounded and modern while retaining detailed pixel art? | Creator-reviewed moving scene; stable pixels, coherent depth/shadows and readable people/actions/UI across chosen zoom and lighting states; target-browser budgets measured |
| Simulation ownership | Does the game work independently of its presentation? | The same scripted scenario advances and restores headlessly; a PlayCanvas client displays its permitted state without becoming the source of clock, resources or mechanics |
| Social value | Do people care to meet the same resident again? | In a small observed test, most can recount a remembered relationship or commitment and want a second session |
| Autonomy | Can people use their seeded survival knowledge without constant high-level guidance? | No systematic starvation caused by inaccessible essential actions or unbounded plan thrashing; starvation and other deaths from choices or scarcity remain valid outcomes |
| Time | Does acceleration change elapsed time without corrupting the simulation? | Equivalent scripted scenarios agree within declared tolerances across rates; no skipped lethal thresholds, free work, stale AI commits or inconsistent saved clock/age state; pause behavior explicit |
| Grounding | Does speech agree with possible actions? | Physical completion claims reference committed events; promises have tracked pending/fulfilled/broken/canceled states; unsupported attempts explained |
| Interaction reuse | Does a learned capability generalize within bounds? | Critical counterexamples reject; successful variants use the appropriate mechanism/version |
| Responsiveness | Is the world responsive during slow AI? | Known-action acknowledgment near proposed 250 ms p95 regional target; semantic work visibly acknowledged immediately |
| Consistency | Can retries/crashes create duplicates? | None in authored duplicate-command, restart, reservation, and transfer scenarios |
| Cost | Is a session economically sustainable? | p50/p95 cost/player-hour under a creator-selected budget; retries and background work included |
| Perception | Can a client or NPC learn hidden information? | No unauthorized disclosures in tested payload, retrieval, caption, log, and media paths |
| Operations | Can the world recover from a bad mechanic? | Quarantine stops new uses; active processes follow documented cleanup; restore tested |

“Zero in the test suite” is not a proof of zero production risk. Record dataset size, workload, duration, browser/hardware, versions, and failures alongside every claim.

## Explicit deferrals and why

- A hundred emotion axes: first demonstrate that a handful produces distinct, readable behavior.
- Detailed organs and hereditary development: store an extensible anatomy/lifecycle schema, but implement when visible consequences justify tuning.
- Full generated 3D art/animations: reuse placeholders and asset families until the mechanical loop works.
- Unrestricted generated scripts: G1 compositions test the promise with a much smaller failure surface.
- Seamless planet-scale interaction: sector gates are compatible with the user brief and far simpler.
- Physical destruction and accurate acoustic simulation: logical integrity/perception rules deliver most initial value.
- Complex governance and modern industry: start with persistent promises, resources, and shared projects.
- Advertising and a B2B platform: first establish an audience or a buyer with a concrete problem.

## Planning without invented delivery dates

Use short experiments with capped scope, then estimate the next phase from measured throughput. The highest uncertainties are content quality, social coherence, generation reliability, and art cleanup—not typing speed. AI coding can accelerate work, but does not eliminate evaluation, persistence correctness, multiplayer testing, or the need to decide what is enjoyable.

The wilderness start, seeded competence, native survival foundation, meaningful NPC mortality, PlayCanvas, grounded pixel art and independent custom simulation are accepted directions. The next product choices are D02 camera/editor/asset details, D03 exact clock/aging/absence policies, D04 budget envelope, D07 player conflict rules and D26 the minimal survival content set. D01 still needs concrete cast and first-session scope. Validate the selected visual direction through R01/R02; no broad engine bake-off or large platform is required by default.

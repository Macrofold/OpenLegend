# Roadmap — earn complexity through playable evidence

Status: **initial P1 implementation exists; live acceptance remains open** after U13 authorized development. See [current architecture](../../docs/architecture.md) and [verification evidence and pending gates](../../docs/verification.md). The larger sequence below remains a product roadmap, not a claim that all proposed systems are built. Milestones describe outcomes and gates, not calendar commitments.

## What to build first when implementation is authorized

The accepted [first playable MVP](first-playable-mvp.md) is a small primitive wilderness world with live AI decisions, NPC conversation and relevant memory, actual AI-generated crafting, and a resource → sling → hunting → harvesting/preparing/eating loop. A second supported invention, with bow-and-arrow as the candidate, tests reuse. The first personal playtest can begin with one NPC; a larger group follows. People start with some knowledge, resources and possessions, without an established village. NPC mortality remains consequential.

M10/M11 supersede the earlier separation of native survivor, conversational group and generated invention into successive playable releases. Those remain useful engineering steps, but P1 now includes the full small AI creative loop. A no-model survivor or carrying-bundle demonstration alone does not meet P1. Live LLMs handle conversation, plans and generation; Jev handles suitable bounded semantic judgments; code executes ordinary actions and physical effects.

Pause and speed controls belong in P1. The initial personal world defaults to pausing on hidden/unfocused tabs; a saved time setting allows connected background progression and ordinary autonomous scheduling when unchecked. Manual pause still freezes both, and there is no offline catch-up. The accepted base is one game minute per real second at 1×, with 0.5×, 1×, 3× and 8× presets. Work, needs, environment and chronological age share the clock; [time policy](../03-design-proposals/time-and-simulation-speed.md) details pending work and remaining tuning choices.

Use the accepted PlayCanvas/custom-simulation boundary. Prove a small attractive scene alongside a headless simulation fixture; keep world state and rules independent of graphics. Seed reliable survival and action families, then let AI compose new usable definitions during the same first playable milestone. Fixed camera and standalone TypeScript remain proposed implementation defaults. Jev integration does not select Java as the language.

## Milestones

| Phase | Deliverable | Explicit scope boundary | Evidence to proceed |
|---|---|---|---|
| P0 — this archive | Research, baseline, proposals, decisions, experiment plan | Documentation only; no running game | Clear accepted scope and consequential open decisions |
| P1 — first playable AI wilderness | One small PlayCanvas scene and independent simulation; player movement; one live conversational/autonomous NPC with bounded memory; gathering/eating/resting and required survival actions; generated sling crafting, equipment/ammunition, hunting, finite harvesting and food preparation; another invention with bow-and-arrow the candidate; pause/speed/absence controls, save/load and explanations | Few material/animal types, simple ranged rules, finite G1 templates; no G2, voice, sectors, deep anatomy or structural/thermal solver; native fixtures are internal checkpoints | Live AI decisions/chat/generation and useful Jev route demonstrated; crafted tools affect animals and food; reused definitions and knowledge persist; pause/absence, stale/duplicate work and costs satisfy [MVP acceptance](first-playable-mvp.md#evidence-required-for-a-first-playable-claim) |
| P2 — shared wilderness group | More distinct people, relationships, cooperation, inventory/barter, login/reconnect and multiple players; 6–12 NPCs remains a candidate after smaller cost/continuity tests | One region, simple rules; choose human recovery before player death; no prebuilt village or guaranteed NPC survival | Useful social continuity at measured cost; multiplayer conflicts and reconnect recover correctly; deaths remain explainable |
| P3 — broader world discovery | State-family extension, one migration, AI-assisted world creation with substantial presets, additional supported construction/environmental interactions | Coarse owned state and scope-consistent admission; no unrestricted scripts or complete physics catalog | World boundaries reject forbidden effects, supported evolution preserves history/state and natural learning; cloak-as-roof story exercises material continuity |
| P4 — durable community | More crafting/building stages, agreements, simple currency, sparse group records, richer conditions, phone text and fuller persistence | Add systems players actually use; no assumed civilization simulation | Multiple sessions produce meaningful continuity; migrations work; runaway economy/population loops constrained |
| P5 — voice and living surroundings | NPC voice, speech input, human proximity voice, phone calls, captions, basic wall attenuation and environmental improvements | Text remains complete; complex acoustics/deformation optional | Target browsers, audience controls, measured spend and intelligibility meet selected gates |
| P6 — multiple sectors and sustainable access | Admission queues, durable handoff, room routing, entitlements, quotas and measured deployment | Thousands overall only after evidence; no unlimited paid inference | No duplicate inventory on transfer/crash; stable load tests and acceptable cost/restore distributions |
| P7 — deeper generativity and society | Selected G2 algorithms, richer assets, families, deeper biological development, institutions and ecology | Each feature has bounded evidence; G3 core changes remain engineering releases | Each layer improves observed play enough to justify maintenance and compute |

Later phases may change order based on feedback. Voice, scale and commerce have separate gates; they need not delay the first personal creative loop. P3's creator/state work can be explored earlier once its dependencies work, without becoming a prerequisite for P1.

The first implemented shelter uses editable parts with persistent material/state and simple coverage/support, following [modular construction](../03-design-proposals/evolving-materials-and-construction.md). Later expansion preserves the same assembly. Reserve script-reference contracts while staging G2 execution. A dependable campfire/cooking path belongs in P1 if its food preparation needs one; detailed [ignition and local spread](../03-design-proposals/heat-and-fire.md) remain later scope.

## P1/P2 dependency map

Start with a fixed inspectable [world profile](../03-design-proposals/world-rules-and-parameters.md), native actions and coarse consistent systems. Check plausible missing versus forbidden causes before generating and at admission/commit. Use [responsible state owners and bounded future-influence notes](../03-design-proposals/state-systems-and-future-influences.md); anticipated relationships do not automatically become tasks. The [complexity proposal](../03-design-proposals/simulation-scope-and-complexity.md) governs expansion.

| Work ID | Outcome | Dependencies | Verification |
|---|---|---|---|
| I00 | Small PlayCanvas visual proof and repeatable pixel-art family | D02/D09, R01/R02; implementation authorization | Grounded tone, readable resources/tools/actions and coherent camera/lighting before broad assets |
| I01 | Independent IDs/state, authoritative clock, pause/speed/absence, seeded RNG and command/result contract | D03/D29 and F52 | Headless round-trip; invalid operations rejected; coherent accounting across speed changes and pauses |
| I02 | One region with navigation, selection and movement | I01 | Authoritative speed/reach and displayed outcomes agree |
| I03 | Player/controller identity, login/session and reconnect | I01/D05; basic identity in P1, external/shared login before P2 | Reconnect preserves character; another account cannot claim it |
| I04 | Native survival, needs, injury/death, seeded knowledge and executable plans | I01–I02, D26; tiny I08 seam first | Gather/eat/rest and urgent reactions work during provider delay; meaningful deprivation can kill |
| I05 | Visible events, observations and private-state filtering | I01–I02 | Unseen/private information excluded from player/NPC evidence |
| I06 | Task-specific context, live LLM dialogue/planning/generation and useful Jev classification route through replaceable execution port | I04–I05, I08 durable decisions, I10 budgets/access before paid calls | Live useful decisions and conversations; unknown/late/canceled cases handled; bounded measured latency/usage |
| I07 | Learning, episodic memory, attributed beliefs and protected commitments | I05/I08; I06 for selected appraisals | Relevant recent promises recalled; observations/testimony do not grant hidden recipe knowledge |
| I08 | Batched persistence, receipts, event-time observations and restore | I01; prove minimal path before expanding survival or paid AI | Restore committed state; ambiguous commits reconcile; no repeated external work or effects |
| I09 | First-session resources, animal types, possessions and coherent visuals | I00/I02/I04/I12 | Resources and consequences readable; few supported types provide a usable complete story |
| I10 | Cost/queue ceilings, usage receipts, explicit fallback and diagnostics | I01/I08 fixtures; limits before paid I06 | No duplicate accounting or unbounded queue; absence stops autonomous scheduling; late usage retained |
| I11 | First personal AI creative playtest, then shared group study | P1: I00–I10, I12–I13; P2 adds external identity/shared conflict checks | Full [MVP evidence](first-playable-mvp.md#evidence-required-for-a-first-playable-claim); later social/cost evidence before widening cast |
| I12 | Trusted preparation/assembly, equipment/ammunition, simple projectiles, animal reactions, damage/death, finite remains/harvest and food preparation | I01/I02/I04/I08; small reusable families | Material/work/ammo/yield accounting; hits and misses; finite harvest; food can actually be eaten |
| I13 | Live generated sling recipe plus another supported invention, with bow-and-arrow the candidate | I06/I08/I10/I12; D06 narrow G1 envelope | Previously absent recipe admitted, crafted, used, saved and semantically reused; negative cases and interruptions handled |

U13 authorized implementation of this dependency map. The [reviewed S0–S5 sequence](../07-technical-architecture/review-and-delivery-plan.md#delivery-order-with-exit-evidence) remains the acceptance framework: S0–S4 together deliver P1, while S5 expands discovery/creation. Conversation and the AI integration can begin as soon as their small native/context contracts exist; do not finish every survival feature before testing real AI. Macrofold's [lightweight execution work](../07-technical-architecture/macrofold-implementation-brief.md) can proceed independently; fixtures/direct adapters enable development without making live AI optional at acceptance.

## The P1 experiment that tests the product's distinctive idea

Begin with gathering, material roles, preparation/assembly, inventory, equipment/ammunition and ranged-action families, animal behavior and food handling. A player asks to make a sling in free text. AI composes a previously absent supported recipe; validation checks the profile, resources, material suitability, units, limits and behavior. Crafting spends real work/materials. The item then participates in hunting, finite harvesting and preparing/eating the result. The NPC can converse, contribute to plans and remember what it observed.

Test paraphrases, unsuitable material, absent ammunition/launcher, fleeing or unreachable prey, misses, death, repeat harvest, competing resource claims, interruption, pause/speed, reload and service failures. Recipe knowledge remains distinct from global definition availability. Try another compatible invention, with a basic bow-and-arrow path as the candidate, to test whether shared families work beyond a single demonstration.

Carrying bundles remain a cheap internal fixture or additional invention. They no longer defer hunting and generativity to P3. More ambitious fire/material/shelter extensions follow their own evidence; the detailed thermal proposal is not a hidden P1 checklist.

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

## U14 extension track

The [governance, controls and workshop delivery track](../07-technical-architecture/review-and-delivery-plan.md#u14-delivery-track-governance-controls-and-the-workshop) sequences F53–F60: admission policy/provenance, complete action discovery and durable inspection, configurable controls and scoped read agents, one versioned G1 edit, then account libraries and complete pack cloning. Contribution terms precede shared-world contributions; marketplace commerce follows proven rights and compatibility. These additions preserve the existing P1 live-AI acceptance requirements and do not imply the prototype already supports them.

## Planning without invented delivery dates

Use short experiments with capped scope, then estimate the next phase from measured throughput. The highest uncertainties are content quality, social coherence, generation reliability, and art cleanup—not typing speed. AI coding can accelerate work, but does not eliminate evaluation, persistence correctness, multiplayer testing, or the need to decide what is enjoyable.

The wilderness start, seeded competence, native survival foundation, meaningful NPC mortality, PlayCanvas, grounded pixel art and independent custom simulation are accepted directions. The next product choices are D02 camera/editor/asset details, D03 exact clock/aging and absence-detection details, D04 budget envelope, D07 player conflict rules and D26 the minimal survival content set. D01/D26 retain content and balance choices within the accepted first-playable scope; pause while away and the live-AI creative loop are settled. Validate the selected visual direction through R01/R02; no broad engine bake-off or large platform is required by default.

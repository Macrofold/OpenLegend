# Consolidated principles proposed for OpenLegend

**Research checked:** 17 October 2026. **Status:** recommendations for adoption, not newly accepted project policy. Existing architecture, visual direction, spending rules and runtime contracts remain in their canonical owners. Each principle below states why it fits OpenLegend and what would make the recommendation inappropriate.

## The central recommendation

Organize production around **a small, convincing player experience**, supported by coherent references, reusable assets and native rules. Use AI to explore worthwhile possibilities, produce the parts that benefit from generation or interpretation, and inspect and revise the real result. Judge the resulting experience separately from its reliability and complete production cost.

The research supports this pattern across traditional procedural production, newer AI asset workflows and current agent UI practice. It supports it more strongly than a universal claim about the best model, engine or number of agents.

The [reusable production workflows](../../../docs/production-workflows/README.md) carry these findings from an idea through useful game content and revision. The project's existing [playability questions](../../../docs/projects/five-product-feature-specs.md#playability-gates) and [repertoire design foundation](../../../docs/repertoires/design-foundation.md) own the desired experiences. Reliable, coherent output may still fail to create curiosity, mastery, expression, companionship or a reason to return. Conversely, a more expressive action or memorable person may justify greater production cost. The research supplies methods for pursuing those ambitions; it does not replace them with an output-volume target.

## 1. Make a useful player experience the unit of progress

**Proposed principle.** Define the player-visible outcome before assigning work. Complete a small loop that can be played and judged, rather than measuring progress by screens, generated models, token volume or uninterrupted agent time.

**Why it fits OpenLegend.** The first game needs combat, exploration, useful crafting and recovery, with a small real invention opportunity, an independently motivated person and a remembered consequence. Those distinctive elements belong in the early proof. A generic survival demonstration would not test whether the project is becoming the game Mike wants. [Gameplay priorities](../../../docs/repertoires/gameplay-priorities.md).

**Evidence.** Motion Twin's production accounts link art and animation choices to readable action and revision. The supplied Unreal tutorial acknowledges incomplete controls and recommends beginning with one function. The community's one-hour experiment separates pleasing art from engaging play. [Case studies](02-developer-case-studies.md), [supplied-example audit](12-supplied-examples-and-community.md).

**Application and limit.** An illustrative slice could connect acquiring a useful resource, facing a readable threat, making a supported invention and returning to a resident whose response reflects what happened. This is a proposed exercise, not an accepted new quest or a rigid script. Small scope should preserve the core premise, not postpone it indefinitely.

Ask what the player chose to try, whether an invention changed their approach or expressed their intention, and what a particular person or consequence made them want to do next. A technically new object and an accurate callback can still feel ordinary. Use the existing playability questions to investigate that gap, including legitimate choices to use a known method, leave an encounter or enjoy a quiet activity. No one scene has to demonstrate every source of enjoyment.

## 2. Make the visual target concrete before multiplying output

**Proposed principle.** Explore meaningfully different visual or interaction directions when the choice is unresolved, then select a complete scene or screen, a coherent reference family and explicit visual roles. Resolve the relevant silhouette, value, palette, material, typography and density before scaling the selected family.

**Why it fits OpenLegend.** The project already has a hybrid pixel-art direction and UI design system. The missing production input may be an enforceable exemplar and coherent art family, not another prose style document. A detailed world and sharp interface also need different visual treatment. [Art direction](../../../docs/maintainers/art-direction.md), [UI brief](../../../docs/ui-design-brief.md).

**Evidence.** Coherent's documented UI experiments and Scenario's named customer accounts attribute consistency to shared design/style inputs. The WoW transcript describes extensive reference preparation. These differ in maturity, but converge on a useful method. [UI dossier](08-ui-quality-and-production.md), [developer cases](02-developer-case-studies.md).

**Application and limit.** Review the selected family's representative screen or scene before expanding it. For an inventory, that means real items and interactions; for a character, it includes expressive movement at game scale. During exploration, an art idea can suggest a better interaction and an interaction can reveal a better silhouette. Reconcile the final appearance and behavior with their existing owners. An exemplar should preserve OpenLegend's identity, not require literal imitation of another game's artwork. Do not treat one attractive screenshot as proof of interaction or motion quality.

## 3. Reuse a coherent recipe before generating another unrelated asset

**Proposed principle.** Follow the existing choice order: appropriate exact reuse, compatible composition and selective generation. Prefer editable material, geometry and motion families when the variation is understood.

**Why it fits OpenLegend.** The game must express many objects and possible inventions without making every new appearance a separate production project. Shared components can preserve identity and revision economy, while genuinely new silhouettes remain possible. [Invention-art owner](../../../docs/invention-art-pipeline.md).

**Evidence.** Project Tomorrow's graphs, Guerrilla's procedural production, Dead Cells' authored/generated combination and SideFX's parameter-prediction example illustrate different forms of controlled variation. None requires recreating an entire large-studio toolchain. [Procedural methods](03-procedural-art-and-animation.md).

**Application and limit.** Start with a material family or a few compatible prop parts. A graph that takes longer to maintain than the repeated task is not efficient. Reuse also must not force an unfamiliar invention into an inaccurate stock appearance or silently restrict its supported mechanics.

## 4. Keep the source that makes revision cheap

**Proposed principle.** Preserve editable source art, graphs, rigs, accepted settings, final exports and the reference that defines success. Treat generated files as candidates until they work through the delivery path.

**Why it fits OpenLegend.** One object's world appearance, inventory representation and equipment presentation should agree. A palette change or a repaired animation should not require reconstructing the object's identity from scratch. The current mercenary is a useful baseline, while the general intake remains proposed. [World presentation](../../../docs/world-presentation.md), [asset-pipeline proposal](../../../docs/projects/3d-pixel-art-asset-pipeline.md).

**Evidence.** Motion Twin retains 3D sources for cheap timing changes; Embark's photogrammetry pipeline automates repeated preparation; inspected art skills retain native files and validate exports. [Case studies](02-developer-case-studies.md), [tooling audit](04-skills-and-tooling.md).

**Application and limit.** Save approved outputs, not every disposable intermediate forever. Stochastic regeneration may not recreate identical bytes. Retain the important accepted artifact and its lineage rather than assuming a prompt is a sufficient backup.

## 5. Select the model for the game task, and identify the actual generator

**Proposed principle.** Evaluate authoring, character play, image editing, 3D, motion and voice separately. Record the language agent, specialist model, tool interface, inputs and review process.

**Why it fits OpenLegend.** Distinctive characters and consistent item art pose different problems. A story-writing preference win says little about permitted knowledge or skeleton deformation. The project already separates native authority and provider roles. [AI-provider owner](../../../docs/ai-providers.md).

**Evidence.** Current primary model documentation separates text, image, mesh and voice capabilities. Creative-writing ratings justify an audition, while persona research and roleplay evaluations show why short preference tests do not settle persistent character quality. [Narrative comparison](06-models-for-stories-and-characters.md), [asset comparison](07-image-3d-and-audio-models.md).

**Application and limit.** Keep the actual incumbent as a baseline and add a small challenger set. Do not create a new service for every row of the evaluation table. Provider switching earns its cost only through accepted task outcomes.

## 6. Inspect the actual game, including what surrounds the change

**Proposed principle.** Give agents and reviewers reproducible views of the complete running client. Pair visual judgment with real interactions and relevant performance evidence.

**Why it fits OpenLegend.** The camera can orbit and pitch; objects animate under changing light; the interface overlays the world. A neutral render cannot show whether an enemy's attack is readable or a panel captures movement input. [World-presentation owner](../../../docs/world-presentation.md).

**Evidence.** Official PlayCanvas skills call for controlled captures and real joint-motion checks. Coherent records visual errors, surrounding-input regression and a packaged-build-only failure. Play2Code's research makes gameplay observation part of the revision loop; its small browser tasks do not establish human enjoyment. [Skills](04-skills-and-tooling.md), [UI](08-ui-quality-and-production.md), [Play2Code project](https://continual-game-generation.vercel.app/).

**Application and limit.** Control camera, time, viewport and state before comparing images. Use exact pixel equality only when it is the intended property. A screenshot metric and an automated player can assist review; neither can decide all artistic or gameplay value.

## 7. Parallelize independent work after defining shared constraints

**Proposed principle.** Use parallel agents for independent research, asset variants or clearly separated deliverables. Give one owner responsibility for integration and final consistency.

**Why it fits OpenLegend.** Parallelism helps only if outputs agree on world facts, visual identity, interfaces and current project owners. Independent agents redesigning the same inventory or character family can create more reconciliation work than they save.

**Evidence.** The supplied WoW transcript combines parallel work with substantial preparation and inspection. The case does not establish its agent count as optimal. The repository's own ownership and review rules already address integration. [Demo audit](12-supplied-examples-and-community.md), [root guidance](../../../AGENTS.md).

**Application and limit.** Share a small brief, exact baseline, output contract and acceptance evidence. Separate file or asset ownership where possible. Keep dependent edits and stateful application mutations sequential. Escalate concurrency only when actual throughput improves; do not copy “ten agents” as a production law.

## 8. Adopt narrow skills that enable useful work

**Proposed principle.** Inspect a skill's real instructions, dependencies, helper scripts, compatibility and side effects. Prefer first-party operating guidance where available; adapt it to local rules.

**Why it fits OpenLegend.** The project already has substantial local skills and routing. Adding another generic router can duplicate or contradict them. Its direct PlayCanvas integration also differs from an Editor project or a React wrapper.

**Evidence.** The audit found useful official PlayCanvas and React Aria skills, a version-gated runtime inspector, a concrete Substance Designer adapter, and a Material Maker bridge whose central operations are still stubs. Actual source inspection changed the recommendation. [Skills dossier](04-skills-and-tooling.md).

**Application and limit.** Select a skill for a concrete production opportunity, including a valuable capability we have not yet exercised. Verify reuse with another representative output when broad reuse is the claim. Simple reference skills do not need a separate production trial. Preserve a short useful instruction after a recurring error. An “official” badge does not guarantee compatibility, and a popular repository is not a substitute for an accepted result. Do not install overlapping bridges without a distinct need.

## 9. Preserve native authority while using AI for interpretation and expression

**Proposed principle.** Let models propose, interpret, select and express within supported interfaces. Let native systems decide what exists, what can happen, who may know it and what actually happened.

**Why it fits OpenLegend.** Real invention and persistent consequences depend on a world whose rules remain meaningful. A fluent claim of success cannot create inventory, inflict damage, grant a new capability or become a memory of an event that never occurred. This is existing architecture, not a new research proposal. [Engine/world boundaries](../../../docs/engine-and-world-boundaries.md), [AI providers](../../../docs/ai-providers.md).

**Evidence.** RPG evaluation research separates mechanical correctness from narration. Bounded commercial/prototype features and procedural content systems also distinguish generated content from application rules. [Narrative research](06-models-for-stories-and-characters.md), [production cases](02-developer-case-studies.md).

**Application and limit.** Evaluate new authoring or runtime tools at those existing boundaries. Avoid importing generic editor samples that derive authoritative collision from art or keep an independent client inventory. This principle should not be misused to replace real novel invention with a hidden list of canned outcomes.

## 10. Judge characters by perspective, agency and development across time

**Proposed principle.** Judge a resident's voice and choices across a coherent episode: ordinary conversation, curiosity, enjoyment, disagreement, solitude, uncertainty, failure and changed circumstances where relevant. Reward appropriate continuity and change grounded in actual experience.

**Why it fits OpenLegend.** The game calls for authored people with their own concerns, not interchangeable assistants or permanently fixed scripts. Expressive dialogue matters, but private-information leakage, invented history and unearned certainty can damage the experience even when the prose is excellent. [Character direction](../../../docs/projects/compelling-characters-feature-spec.md), [memory owner](../../../docs/memory-architecture.md).

**Evidence.** Ubisoft's iterative character work and primary persona/multi-turn research motivate broader tests than a single charming answer. Current leaderboards do not identify the winner for OpenLegend's combined requirements. [Character-model dossier](06-models-for-stories-and-characters.md).

**Application and limit.** Reuse the [complete character episodes](../../../docs/projects/compelling-characters-feature-spec.md#complete-behavioral-flows) and [existing episode comparison](../../../docs/projects/intelligent-simulation-evaluation-feature-spec.md#the-episode-not-the-preferred-answer). Compare equal permitted evidence and complete budgets. Keep validity separate from human judgments of what made this particular person interesting, amusing, challenging or worth knowing. Test mature scenes within the accepted scope as well as ordinary ones. Do not import a benchmark's preference for verbosity, agreeableness or explicit escalation as our objective.

## 11. Separate offline production from live player delivery

**Proposed principle.** Use slower, exploratory generation where review is available. Qualify live generation separately for latency, spending, cancellation, failure, disclosure and truthful fallback.

**Why it fits OpenLegend.** An offline character concept can wait for several alternatives. A player waiting for a reply or an invented object's appearance needs a predictable experience. The existing asset direction deliberately separates mechanical readiness from appearance readiness. [Invention art](../../../docs/invention-art-pipeline.md), [AI delivery and accounting](../../../docs/ai-providers.md).

**Evidence.** The asset and voice APIs expose distinct output and timing stages. Runtime character examples and provider claims do not eliminate downstream validation, audio preparation or context selection. [Assets/audio](07-image-3d-and-audio-models.md), [case studies](02-developer-case-studies.md).

**Application and limit.** Reuse already-qualified paths. For a new generation dependency or output family, establish offline production quality before introducing live delivery. Respect the project's existing retry, budget and cancellation rules. Faster drafts are useful, but a partially correct result must not be presented as a completed world action.

## 12. Measure total accepted-output cost and revision effort

**Proposed principle.** Count all attributable preparation, generation, rejection, cleanup, export, review and integration. Record actual cash spending separately from subscriptions, sponsored credits and API-equivalent estimates.

**Why it fits OpenLegend.** The goal is a better game with less total effort. A cheap image that takes repeated manual correction can be more expensive than an existing asset or a small procedural recipe. A stronger model may be economical if it reduces that correction work.

**Evidence.** The supplied demo's cache-heavy usage and sponsored access illustrate accounting confounds. Vendor case studies rarely disclose full rejection and finishing costs. [Seed audit](12-supplied-examples-and-community.md), [production evidence](02-developer-case-studies.md).

**Application and limit.** Use accepted comparable assets as the denominator for a repeated asset task. For play, report the complete cost of a specified episode alongside its separate experience judgment; do not count unequal player moments as interchangeable units. Hold the intended quality and experience constant when claiming savings, and report a quality gain when greater spending buys a worthwhile improvement. Show correction minutes separately if labor has no agreed dollar valuation. A workflow with zero acceptable outputs has not achieved a cheap unit cost. Do not disguise uncertain measurements with a precise return-on-investment estimate.

## 13. Choose tools for concrete player or production gains

**Proposed principle.** A substantial tool or platform change should resolve a material limitation, reduce complete production effort, or enable a valuable form of play or expression that the current route makes impractical. Identify the claimed gain and investigate it at an appropriate scope.

**Why it fits OpenLegend.** The project already has a working browser/TypeScript presentation and substantial custom behavior. A client rewrite has an opportunity cost against the next enjoyable slice. An alternative can nevertheless earn consideration through a substantial authoring advantage or a new creative possibility; the current stack need not be completely incapable of the result.

**Evidence.** Official engine documents show real capabilities and platform restrictions, while the skills catalog's Godot default reflects its own coverage. Embark's learned animation illustrates how much specialist effort can sit behind a compelling demonstration. [Engine assessment](05-playcanvas-godot-and-engine-choice.md), [developer cases](02-developer-case-studies.md).

**Application and limit.** Keep PlayCanvas as the current production baseline. Compare an appropriate representative task in Godot if a credible capability or full-workflow gain warrants the investigation; include integration and migration costs before adopting a change. Use pooling, batching, baking or compression when evidence identifies their benefit. Keep exploratory capability work distinct from optimization and from permanent adoption. A large world's scale is not itself a reason to rebuild its infrastructure.

## 14. Turn repeated learning into a small durable production record

**Proposed principle.** Preserve accepted references, decisions, sources, exact successful settings and observed failure patterns in the existing owners. Refine the workflow when a second attempt reveals a gap.

**Why it fits OpenLegend.** AI sessions and contributors need continuity without an expanding pile of competing specifications. The repository already distinguishes current behavior, proposals, research and trackers. [Documentation ownership](../../../.agents/rules/documentation.md).

**Evidence.** Coherent's production notes outlasted prototype code; the community's second-bird exercise exposed undocumented steps; inspected asset skills preserve editable sources and concrete verification evidence. [UI research](08-ui-quality-and-production.md), [community audit](12-supplied-examples-and-community.md), [skills](04-skills-and-tooling.md).

**Application and limit.** Add the shortest instruction that prevents a demonstrated recurrence. Keep accepted policy in its canonical owner and research rationale here. This research creates recommendations, not a new compulsory process at every keystroke.

## Adoption map

| Proposed principle group                              | Immediate place to apply it                                  | Evidence needed before broader adoption                                           |
| ----------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Player outcome, concrete art direction, real review   | The selected worthwhile activity and its relevant surfaces   | Useful play, a valued consequence, coherent presentation and working interactions |
| Reuse, editable sources, narrow skills                | One material family, prop/icon pair and compatible animation | Repeatable accepted export and cheaper second variation                           |
| Task-specific models and persistent character tests   | Small authoring and roleplay comparison                      | Valid outputs preferred by reviewers with acceptable latency/correction cost      |
| Offline/live separation and accepted-output economics | Existing asset/provider production records                   | Complete costs, failure behavior, honest fallback and qualified delivery          |
| Engine and production capability decisions            | A representative current or newly valuable production task   | Evidence of a material capability or full-workflow gain, including change cost    |

The [reusable routes](../../../docs/production-workflows/README.md) connect ideas, sources, tool operations, working game content and revision. The [research applications](10-openlegend-workflows.md) illustrate their use in specific tasks. The [evaluation plan](11-evaluation-and-adoption.md) defines comparisons that can resolve remaining tool choices while reusing the existing player-experience and character-evaluation owners.

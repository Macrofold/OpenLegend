# Playable game first

**Skillful participation should create meaningful choices, not mandatory chores.** [ND38](../projects/action-execution-and-skill-expression-feature-spec.md) tests whether moving while aiming at an actual deer and optionally fitting a useful pouch improves the game's enjoyment. Quick attacks and ordinary craft remain fully viable. Measure voluntary use after mastery and whether improved capacity really helps an expedition, trade or gift. [ASE](../maintainers/action-execution-and-skill-expression.md) owns implementation and user evidence.

This document owns feature-selection policy for the current OpenLegend survival-adventure. The [28 canonical catalogues](README.md#catalogue-map) own entry descriptions and priorities; [whole-game coverage](coverage.md) distinguishes essential capabilities from later elaborations. The [first-playable scenario](../worlds/base/playable-openings.md#first-playable-game-target) owns required world content. [FPV](../maintainers/first-playable-validation.md) coordinates delivery and player evidence through existing subsystem owners.

## The game we need to be able to play

**Make a complete, enjoyable OpenLegend experience, not a generic survival game that postpones its defining features.** The player survives from an empty-handed start, makes useful things, builds a defensible home, meets people with their own purposes, explores danger, gains something worthwhile and finds a reason to continue. Practical invention, independent choice and remembered consequences belong within that first playable loop.

The world target's camp walls/entrance, four-or-five-person initially non-hostile cast, useful cooperation and roaming animal/human danger are required scope. A focused test may examine one activity or character; it does not replace full acceptance. Known methods remain viable, invention is optional for an individual playthrough, and cooperation or persuasion may fail. Qualification must establish the distinctive alternatives as real rather than force the player or NPC to demonstrate them.

A peaceful creation, beautiful place, performance or relationship may be valuable without a combat bonus. The whole survival-adventure still needs understandable opposition, usable weapons, exploration, rewards, progression and a worthwhile home. Interesting personality descriptions or domestic routines cannot substitute for those activities.

The [engine-research application guide](../engine-research-guide.md) connects current simulation, presentation, authoring and persistence mechanisms to these ambitions. Use it to identify a concrete benefit and its existing design owner; the priority and first-playable scope here remain controlling.

## Priority

Priority is an ordinal product judgment for the **whole current game**, not a measured fun score, an engineering estimate or the importance of a feature within its own subdomain. Lower numbers come first.

| Score            | Meaning                                                                               | Selection test                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **1 Core**       | A representative capability or content needed for the first rewarding OpenLegend loop | Does the loop fail without usable survival/camp play, challenge, payoff, recovery, useful invention or independent character consequence? |
| **2 Complete**   | Variety, progression and supporting activities worth continuing                       | Does this add a substantial challenge, destination, reward, build or practical way to keep playing?                                       |
| **3 Depth**      | Richer combinations and longer consequences                                           | Does this deepen worthwhile play whose essential promise a smaller version already delivers?                                              |
| **4 Detail**     | Optional granularity, administration, decoration or narrow convenience                | Is the baseline already enjoyable, with this mainly adding fidelity or a small local benefit?                                             |
| **5 Specialist** | Separate-world features, research models and frontier systems                         | Does this require a different product promise, expressly selected world constitution or dedicated experiment?                             |

Rank the **described scope**, not its most important noun. A detailed companion-staffing simulation is not Core merely because recovery is Core; a sentimental multipurpose kettle is not Core merely because food is Core. Basic containment and a usable camp can be Core while their administrative and historical elaborations remain optional. Explicit first-scenario subsets take precedence over broader family-level rankings.

Difficulty does not demote a necessary experience. An expensive combat capability may be Core; cheap sharpening may be Detail. Engineering adjacency, realism and novelty do not establish player value. Conversely, a serious integrity, access or responsiveness failure can outrank content because it prevents the selected experience.

## Whole-game build order

Build connected, testable activities rather than exhaustively completing isolated subsystems. These strands can advance together when their real dependencies permit it.

| Experience strand                               | Smallest worthwhile scope                                                                                                          | Expansion to keep separate                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Understand, survive and continue                | Responsive controls, inspection, inventory/equipment, readable needs/results, stop/cancel and a viable continuation                | Command bureaucracy, verbose tutorials or a new universal pause policy                                 |
| Gather, craft and establish a home              | Obtainable inputs, noncircular known recipes, useful making, shelter/storage/cooking, walls/entrance and return                    | City planning, every building family, compulsory repairs or general structural physics                 |
| Venture, confront and recover                   | Worthwhile destinations, readable enemies, usable melee/ranged choices, defense/escape, rewards and recovery                       | Exhaustive arsenals, hit-location physics, full ecology or regional war                                |
| Invent a practical alternative                  | Realize a new supported tool or method, use it against an actual obstacle and retain another use                                   | Universal physics, executable prose, a marketplace or model calls for every ordinary action            |
| Meet people and do useful things together       | The required differentiated cast, grounded guidance, consent/refusal, sharing/trade and cooperative activity                       | Generated life histories, formal institutions, omniscient reputation or a global affinity meter        |
| Earn, learn and use the consequences            | An attainable improvement, access, knowledge or relationship consequence that matters in another activity                          | Grind, universal classes, career administration or escalating maintenance                              |
| Defend or change the place you made             | Real terrain/barriers/entrance, equipment and willing help affect an encounter; negotiation, retreat or relocation remain possible | Scripted raids, automatic safe zones, generalized siege systems or new human-property harm permissions |
| Add reasons for another session                 | Further destinations, encounters, useful gear, inventions, relationships and creative activities                                   | Expanding every category without additional payoff                                                     |
| Explore richer or different worlds deliberately | A selected longer social, political, magical or automation experience                                                              | Treating alternate-world systems as hidden prerequisites for ordinary play                             |

Required behavior must work through actual world state, permissions and actions. Authored content and native behavior are valid implementations; effect-free narration or forced demonstration outcomes are not evidence of invention or independent choice. Correctness, privacy, cancellation, accounting and current-format persistence protect the selected scope without justifying unrelated bureaucracy.

## Scope, realization and priority are different questions

Keep **Small / Moderate / Large** build scope separate from Priority and from **F / U / C / D** realization labels. F identifies a reusable grounding/control operation, not a player-value endorsement; C means composition, not complexity. Identify a missing dependency explicitly rather than inflating every action that uses it.

| Example                                                | Priority                                         | Smallest sensible scope                                                                           | Keep separate                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Sharpen a blade, MAK-05                                | **4 Detail**                                     | Small bounded restoration with an existing condition/maintenance capability                       | Do not invent durability merely to require sharpening; abrasion geometry and metallurgy are separate |
| Repair a handle, MAK-04                                | **4 Detail**                                     | Small authored repair using compatible part/condition support; otherwise name the missing support | General fracture and arbitrary reconstruction                                                        |
| Patch a seam, MAK-06                                   | **4 Detail**                                     | Small supported sealing/condition change with real inputs                                         | Fluid dynamics, seam topology and universal compatibility                                            |
| Bedding or a specially dry sleeping spot, BLD-07       | **4 Detail**                                     | Optional comfort/protection treatment                                                             | A mandatory prerequisite for basic rest or recovery                                                  |
| Agree on work and report completion, COOP elaborations | **4 Detail** for administration                  | Existing communication and activity results where adequate                                        | A formal agreement/reporting system before useful help, hunting or defense                           |
| Prepare supplies                                       | No standalone feature without a demonstrated gap | Existing inventory, bags, equipment and consumables                                               | A duplicate planning subsystem                                                                       |
| Basic enemy encounter and usable weapon                | **1 Core**                                       | Complete readable opposition, damage/defense, reward and failure                                  | Its Moderate or Large effort does not lower its importance                                           |
| First-camp wall and usable entrance                    | **1 Core**                                       | Useful construction with real geometry, access and defensive effect                               | Fortresses, general siege physics and domestic administration                                        |

These are scope distinctions, not implementation estimates from a fresh code audit. Check existing capabilities in their owning documents before scheduling work.

## How to choose the next implementation

1. Identify the highest-priority **missing player experience** from the required opening, coverage guide and actual implementation evidence. State the activity, meaningful choice, opposition or uncertainty, payoff and reason to continue.
2. Select a minimal connected set. Core examples may be alternatives; a representative weapon does not require every weapon, and a camp does not require every building family.
3. Include only real dependencies. Reuse adequate inventory, movement, communication and crafting; a small blocking dependency does not promote its whole catalogue.
4. Define the smallest complete scope and evidence in existing design/tracker owners. Preserve useful invention and independent choice instead of replacing them with canned outcomes. Test an honest partial activity early when it can resolve a meaningful uncertainty.
5. Prefer a substantial missing Core or Complete experience over another refinement to a delivered one. Effort helps choose between comparable benefits, not replace product judgment.

Sort catalogue entries by Priority and then stable ID, or stable heading for entries without IDs. This supports navigation, not a delivery order among equally useful alternatives. Build estimates and F/U/C/D are not priority tie-breakers.

## Keep play worthwhile as players learn and return

When comparing proposals of similar priority and scope, consider the questions relevant to the intended activity. A one-time discovery, a repeatable hunt and a shared home can provide different kinds of lasting value.

- **Useful investment through progression.** Make wanted improvements recognizable and attainable while they are still useful. Better equipment and greater power can be satisfying while earlier knowledge, tools, places or relationships retain another purpose. Identify what the new opportunity preserves, broadens or replaces. Continuing value need not mean permanently optimal gear or mandatory revisits to every old activity.
- **Meaningful alternatives.** Ask whether an apparently optional choice changes play or conceals a prerequisite for a capability already promised at that stage. Distinguish this from intentional learning, specialization or cooperation.
- **Enjoyment after learning an efficient method.** For activities intended to repeat, consider a player who understands a reliable approach or consults a guide. Look for satisfying execution, mastery, meaningful choices, different circumstances, expression or a wanted result. Optimization can itself be enjoyable. Surprise alone does not establish repeat value, and a good one-time discovery need not become a recurring grind.
- **Relationships beyond a shared task.** Distinguish useful help, pleasant company and voluntarily meeting again. Ask whether participants can recognize contributions, retain meaningful roles and choose how to continue. Brief exchanges, quiet participation and solo play remain legitimate; rivalry and shared competitive mastery can also give people a reason to return. Friendship is one possible outcome, not a compulsory reward.
- **The whole activity's time cost.** Include arrival, preparation, waiting and recovery when judging the payoff. Consider what a player can meaningfully accomplish before stopping and what it takes to resume within the supported world's rules. Deliberate travel and demanding group expeditions can earn their time through interest and stakes; repeated administration or compulsory upkeep needs its own justification.

The [five-game RPG comparison](../../archive/02-research/game-inspiration/essays/tactical-rpgs-character-histories-and-commercial-outcomes.md#applying-the-research-through-existing-design-owners) adds a useful way to connect these questions: can something accomplished in one wanted activity become useful or meaningful in another? Exploration can reveal a possibility; practice, a tool or willing cooperation can make it attainable; the result can give a particular person a later reason to act. Look for recognizable contributions and actual changed possibilities. Ordinary achievement can carry this continuity alongside adversity, without requiring every event to award a trait, a relationship bonus or a new task. The linked comparison maps this reasoning to existing design and delivery owners.

### Make execution and presentation earn their attention

When two designs provide the same core capability, prefer the one whose moment-to-moment execution and presentation make the underlying choice easier to understand or more satisfying **without replacing the choice**.

- **Execution follows a meaningful decision.** A timing, aiming, tracking or hold/release interaction is valuable when changing conditions make the result worth attending to. If the player already knows the answer and merely repeats a precision ritual, the extra input can become fatigue. Omission, automation or assistance can be the better design.
- **Different actions can deserve different execution.** Physical input should express what the action is doing rather than force every activity through one reflex test. The authoritative world still decides capability, cost, contact and consequence.
- **A beautiful place should support curiosity or life, not just screenshots.** Give places recognizable large forms, coherent material/light relationships and enough quiet space to read people and routes. Distinctive features are stronger when ecology, history or use explains them.
- **Discovery can be its own reward, but attached progression should add a useful option.** Avoid turning every peaceful place or side activity into a required checklist before narrative closure.
- **Judge the complete repeated loop.** Test after the player learns the efficient tactic, recognizes the timing cue and has seen the visual surprise. Continuing value can come from changing opponents, weather, companions, goals, expression or mastery; spectacle alone is not durable variety.

The focused [Sea of Stars synthesis](../../archive/02-research/game-inspiration/synthesis/art-audio-and-game-feel.md) supplies one source and counterexamples for these questions. They are product-selection prompts, not evidence that OpenLegend should adopt its combat or camera.

These are selection prompts. The [player-learning plan](../projects/first-playable-playtest-plan.md#step-4--observe-distinct-player-journeys) owns how to examine effort, payoff and return, including the applicable handling of test progress; existing world acceptance and delivery owners define required scope. The [Forever synthesis](https://github.com/Macrofold/OpenLegend/blob/14ac519648f4dd0c681db8fa168479fb9ed4e387/archive/02-research/game-inspiration/essays/wow-forever-and-a-world-worth-returning-to.md) and [video examples](../../archive/02-research/game-inspiration/references/wow-forever-video-lessons.md) supply comparative reasoning and counterexamples from prelaunch evidence, not proof of long-term outcomes.

## Completion checks for the first playable game

Use the [world's full acceptance requirements](../worlds/base/playable-openings.md#full-experience-acceptance-and-scope) and [FPV09](../maintainers/first-playable-validation.md#fpv09--complete-first-playable-and-next-commitment-decision). The [playtest plan](../projects/first-playable-playtest-plan.md) distinguishes mechanical correctness, actual invention/independent behavior, player understanding/enjoyment, continuing value and delivery cost.

Complete acceptance needs the connected ordinary-player experience and its consequences, not a supplied kit, prebuilt camp, individual component pass or narrated success. Missing evidence stays explicit. A failed attempt must have understandable consequences and a viable continuation under the chosen world's rules; success is allowed to remain success.

The four seed-world labels are suitability recommendations, not simultaneous delivery commitments. A future explicit product choice can rerank an alternate experience for its own goals. World-specific laws and optional lore remain world-owned.

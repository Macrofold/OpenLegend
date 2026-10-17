# Playable starting worlds

| Status | Current progress | Last updated |
|---|---|---|
| Implemented openings and required first-playable target | Main world and Solo testing ground exist; survival-first camp building, the differentiated social cast and roaming conflict below are required targets whose remaining design, implementation and player evidence are tracked separately. | 2026-10-17 |

This document owns the bundled opening's content and first-playable scenario requirements. [Gameplay priorities](../../repertoires/gameplay-priorities.md) owns selection policy; existing world/mechanic specifications own their detailed behavior. The [playtest plan](../../projects/first-playable-playtest-plan.md) selects tests of this experience, and [delivery coordination](../../maintainers/first-playable-validation.md) links actual gaps to existing owners. A limited test does not reduce the complete first-playable scope.

The bundled `base:playable-opening` creation profile currently offers **Main world** and **Solo testing ground**. The application's explicit trusted composition selects its implementation; shared creation transport receives only the candidate's profile and world identity and invokes that profile's real validator. The profile owns supported identity slots, candidate fields, construction, editable fields, preview meaning and readiness. Account binding, exact human approval, target admission and atomic publication remain application responsibilities. It does not copy a running world, produce fictional historical work or create omitted people and then remove them.

## First-playable game target

**Required experience: begin with nothing, survive through understandable resource use, build a defensible camp into a home, form chosen relationships, invent useful alternatives, and encounter independent danger and opportunity.** This is a connected survival-adventure, not a pre-equipped construction demonstration or a sequence of compulsory chores. The player can explore, improve their capabilities and return to a place they made. Building belongs in first-playable acceptance, not only later settlement depth.

The Main world and Solo testing ground sections below describe the current supplied setups, including their existing tools and stock. Those are not evidence that the empty-handed target has been delivered. Update the existing main-world initializer and its authored sources when implementation is authorized; do not create a second copied marketing world or silently replace compatible development progress. The [development compatibility policy](../../../AGENTS.md#development-save-policy) remains controlling.

### Survival-first arrival

The ordinary player begins without a player-owned camp, carried food, tools, weapons, prepared building materials or a supplied construction kit. Basic clothing, ordinary competence and discoverable familiar methods do not constitute free crafting stock. The final authored starting inventory must make this distinction explicit. The player is not given creator powers as a shortcut around survival.

The opening starts with understanding hunger, finding accessible food, discovering nearby resources and learning how this world works. It must support a complete **bare-hand bootstrap**: hand-accessible resources and food lead to simple preparation and tools, which unlock more useful crafting and construction. A stone edge cannot require a workbench that itself requires the stone edge; lighting the first usable fire and obtaining the first meal cannot depend on a friendly character agreeing to rescue the player. Gathering and processing are separate activities when they have different prerequisites.

Start with enough physical capability and time to learn and make a meaningful choice. Empty inventory is not a requirement to be one missed click from starvation. Basic recovery, readable danger, viable withdrawal and the existing loss/continuation rules remain available. Food and shelter provide useful motivation without burying the interesting game behind bedding, sharpening, repeated reporting or an exhaustive realism simulation. Water collection/drinking is required if thirst is enabled; this target does not independently add a thirst meter or punitive weather law.

The player chooses a camp site using understandable tradeoffs: access to food, wood, stone and water; travel routes; visibility; defensible approaches; and proximity to other people. There need not be one correct marked plot or a compulsory fixed build order. Existing people's possessions and structures remain theirs, not the player's starter kit.

### Natural resources and known crafting

The opening needs a substantially broader **usable material foundation**, not merely more names in inventory. Each selected resource needs a findable source, a workable collection/preparation route, meaningful properties, permitted uses and readable limits. Several inputs should serve both familiar recipes and supported invented alternatives. The following is the design palette to resolve into actual authored entries; exact quantities, gathering times and recipes remain in the owning material/work design, not invented by the test plan.

| Functional foundation | Concrete resources to consider | Useful first-camp and invention applications |
|---|---|---|
| Wood in different workable forms | Fallen branches, deadwood, cut poles/logs, split stakes and bark | Fuel, handles, frames, walls, gates and containers; loose collection precedes tool-dependent cutting |
| Stone with differentiated use | Loose stones, sharp/knappable stone such as flint, larger building stone and abrasive stone | Cutting edges, hammering, hearths, tools and weighted or supported constructions |
| Flexible plant material | Grass, reeds, vines and bast/other fibers | Binding, cordage, weaving, baskets, mats, screens and thatch |
| Earth and binders | Diggable soil, clay, resin or other selected natural binder | Ground preparation, packing, sealing and supported composite construction; firing is not a prerequisite for the first meal or camp |
| Food and fresh water | Recognizable edible plants/berries/roots, fish, small game, huntable larger animals and accessible water | A viable initial food route and useful later forage, fishing, preparation and cooperative hunting choices |
| Animal-derived material | Hide, bone, sinew and fat from appropriate actual remains | Covering, binding, tool components and selected cooking/fuel uses; not rewards generated solely because a hunt was discussed |
| Useful processing products | Prepared fiber, cord, split timber, worked stone and, where the relevant process is selected, charcoal | Short comprehensible production chains and interchangeable functional ingredients rather than an isolated fixed recipe for every output |

The first playable must select enough complementary resources from this palette to support its camp, survival and invention requirements. It does not promise that every illustrative ingredient or a general chemistry/thermal solver is implemented. Mineral refining, extensive metallurgy, industrial automation and encyclopedic plant species are not hidden prerequisites. Resource location and depletion should motivate worthwhile trips and opportunities for encounter; a complete regenerating ecology is not required before ordinary collection works.

Provide an explicit known-crafting catalogue covering the whole first-camp journey: elementary cutting/striking tools, bindings, a simple weapon and defense, a carrying/storage option, a workable fire/cooking arrangement, shelter/cover, wall or fence sections and a usable entrance. Include enough alternatives for players to make choices about camp layout and materials rather than one golden-path kit. Familiar recipes must be inspectable and discoverable without guessing a secret prompt or paying for model invention on every ordinary craft.

Keep **known recipe use**, **learning an existing method**, **inventing a new method**, and **physically making the result** distinct. A successful first playthrough is possible with supplied methods. Invention remains available and useful for an obstacle, tool, shelter adaptation or other supported purpose; it is not compulsory, an unrestricted physics promise or a reskinned canned recipe. The acceptance evidence must demonstrate at least one genuinely new useful alternative through normal admission, material acquisition, manufacture/use and later reuse. Detailed contracts remain with [knowledge](../../knowledge.md), the invention owners and the installed material/action families.

### A camp the player can defend and call home

A player must be able to gather and prepare actual materials, place and build a useful camp, alter its layout, and return to it. Minimum functional coverage is food preparation, shelter/rest, storage, basic making, light where the selected darkness requires it, and a perimeter or barriers with an usable entrance. These functions can share objects; they do not mandate a separate elaborate workstation for every recipe.

**Walls are real construction.** Their occupied space, openings, collision, sight/cover and effect on approaches must agree with the supported geometry. Enemies cannot walk or shoot through a solid wall merely because it is player-built. Enclosing a camp must leave an ordinary usable way in and out; placement cannot trap the builder or become a free item-duplication route. A defended site still has understandable vulnerabilities and costs, not an unexplained invulnerable safe-zone label.

The selected construction design must explicitly settle which materials form walls/entrances, actual work and input requirements, placement/reach, partial work, alteration/reclaim, damage or breach behavior where offered, and meaningful failure/recovery. Existing open canopies and lean-tos are foundations, not proof that walls, doors or a defensible compound already work. Do not quietly invent a general structural solver, new property system or universal right to destroy any person's structures. World-specific hostile interactions and real human access protections remain separate.

Defensive play must have actual value: site choice, barriers, an entrance, equipment, observation, escape and voluntary allies can change an encounter. A camp need not force a fight; leaving, negotiation or trading remain possible. A player can organize possessions, choose a layout and improve the place in ways that make it recognizably theirs. A new global home-affection score, compulsory decorations or a building-level ladder is unnecessary. Persistence must preserve the actual site, stock, modifications and consequences across ordinary leaving and returning under the supported save policy.

### Four or five differentiated non-hostile characters

The working cast target is **four or five individually authored, initially non-hostile characters the player can meet and develop relationships with**, not four interchangeable service menus. This is the first scenario's intended breadth, not a universal population cap or a rule that all must always survive or gather at camp.

The existing Main world already names Ada, the Peacock Mercenary, Mara Reed and Tavin Vale as candidates alongside the player and distant rivals. Reuse their identities and existing authored character material where suitable. Character preparation must check actual characterization rather than assume names alone satisfy differentiation; a fifth character is optional within the requested range, not mandatory filler.

For each selected character record distinct immediate aims, longer interests, temperament, conversational manner, values, risk tolerance, skills, resources and boundaries. Differences must affect visible choices: who enjoys exploring, who wants a secure place, who is willing to hunt, who is curious about making, how they respond to help or danger, and what they refuse. These are design dimensions, not fixed professions or new backstories assigned by this document. Avoid a single universally agreeable optimal companion. Different players should have credible reasons to prefer different people.

Characters live and act outside conversations with the player, have information limited to what they perceived or learned, and retain independent aims. Initially non-hostile does not mean permanently loyal, automatically generous, invulnerable or willing to live in the player's camp. Existing world life/death rules continue to apply. Relationships should develop through meaningful shared activity and remembered events; a full personality-transformation system or universal affinity meter is not required.

### Things to do together

The first playable must provide usable opportunities for:

| Activity | Required player-visible result |
|---|---|
| Alliances and mutual help | A mutually accepted, understandable small arrangement with specific participants/purpose; it can be declined, ended or reconsidered without creating a compulsory guild/government system |
| Collaborative hunting | Ask someone to join a real hunt, travel and pursue actual quarry, make useful contributions under their own decisions, and handle actual food/material custody afterward |
| Guidance and ideas | Ask about resources, crafting, dangers or possible approaches; answers use the character's knowledge and can lead to an executable known or supported invented option, not just convincing unsupported narration |
| Sharing | Offer or request actual resources or useful work; permission, custody, quantities and withdrawal remain clear |
| Trade | Propose and revise a mutually beneficial exchange; acceptance transfers the actual agreed goods once, while rejection changes no ownership |
| Camp and exploration company | Invite company or help for a meaningful activity, with independent participation, departure and future responses to what happened |

An agreement is not remote control of an NPC. Teaching requires knowledge, making requires resources, and willingness is not guaranteed. A resource-sharing alliance need not imply pooled ownership, permanent access, formal contracts or a new economy. Reuse existing barter, outings, combat-help and character owners, extending them only where the selected shared activity genuinely needs it. Record desired sharing or proceeds terms before claiming a hunt automatically divides loot.

### Wildlife, darkness and predators

Include prey/resource animals and credible aggressive-animal danger. The existing stag is useful current content but does not by itself establish roaming predator or pack behavior. **Wolves roaming at night, including the possibility of surrounding a lone traveler, are the working predator example.** Species, numbers, sensing, pursuit, group behavior and tuning need a scoped authored design before implementation; this is not a factual claim about real wolf biology or a universal engine rule.

Danger must arise from real animals in the world, their location, perception and behavior. Darkness can affect what participants perceive under the selected world rules, not grant predators hidden knowledge of the player's coordinates. A pack does not teleport around someone because they crossed a timer or ventured alone. Sounds, tracks, silhouettes or other actually available signs can make risk understandable without exposing unseen exact information.

Provide practical responses appropriate to the selected animal: retreat, choose another route, obtain light, use terrain/camp barriers, fight, or ask willing help. No claim that fire always frightens a predator or that shelter guarantees safety is made without an implemented rule. Test solo and accompanied travel and an actual camp-defense opportunity, including an unfavorable encounter and a workable recovery/escape. Exact night length, pack size, damage and pursuit limits are tuning work, not filled in with arbitrary values here.

### Distant hostile people and unscripted camp contact

Hostile characters begin elsewhere on the map, outside the immediate starting encounter. Retain a place the player can discover by exploring; the Watchpost and its residents are existing candidates, not an obligation to keep the current distance or loadouts if the opening's design changes. The starting experience must allow survival and orientation without opponents already attacking beside the player.

Hostiles also have ordinary needs and purposes: finding resources, hunting, exploring, obtaining supplies and pursuing their own interests. Design real shared-resource destinations, travel corridors and bounded exploration opportunities so these activities can bring them into the player's camp area during continued play. They discover the camp through supported perception or learned information. Neither a hidden camp marker, an elapsed-day raid order, a wave spawn, teleportation nor omniscient tracking supplies the encounter.

**Camp contact is an intended reachable recurring opportunity, not a promise of a raid on a fixed day.** Author enough overlap that opponents are not permanently parked at a distant site; qualification must include actual ordinary behavior leading them to discover a player-created camp. Do not force contact in every playthrough: killing the rivals, moving camp, changing supplies, losing a route, reaching an agreement or other legitimate consequences can prevent or alter it. A claim of unscripted arrival needs evidence of the originating goal, perceived/known destination, actual travel and discovery; a manually issued approach command does not qualify independent migration.

At an encounter the player can attempt materially different approaches: fight, including lethal combat under the selected rules; talk to de-escalate; offer trade or mutual benefit; or run away. The opponent evaluates what it knows and wants and may refuse or remain hostile. A successful agreement must affect subsequent action, not merely produce friendly dialogue while attacks continue unchanged. No universal persuasion success, mandatory kill, compelled alliance or automatic revenge wave is selected. Player defenses, known tools, inventions and chosen relationships should create practical options.

### Full-experience acceptance and scope

The full first playable is not complete until a player can start without supplied survival equipment, obtain food/resources, craft useful familiar items, build and use a camp with meaningful barriers, interact with the differentiated cast, attempt useful cooperation, encounter animal and distant-human danger, and carry earned results into later play. Live useful invention and an independent character consequence must be demonstrated without forcing every player to choose them.

Record implementation correctness, independent-character evidence, uncoached player enjoyment, responsiveness and operating cost separately. A prebuilt camp, a peaceful isolated workshop, individually passing mechanics or a short clip cannot close this combined acceptance. Early partial tests are worthwhile when their missing requirements are named and the complete target remains open.

Detailed construction extensions, material transformations/known recipes, cast preparation, cooperative hunting/alliances and roaming-conflict behavior are explicit design/delivery work in [the coordinating tracker](../../maintainers/first-playable-validation.md#required-capability-and-owner-map), with existing subsystem ownership retained. Large societies, universal physics, automatic ecology, expansive metallurgy, a marketplace, unsolicited PvP and unlimited unattended simulation are not prerequisites. Documentation does not authorize runtime implementation, paid tests or public claims.

## Main world

The main opening and ordinary `wilderness` startup use the same authored `createWorld` initializer. It combines Mike, Ada, the Peacock Mercenary, Mara Reed, Tavin Vale, Kest and Orin; hunting/harvesting/cooking, making and containers, shelter materials and permission, fishing, sling practice, exploration rewards, the territorial stag, the missing-belonging investigation and Broken Watchpost. Existing world laws, finite supplies, character identities and independent decisions remain unchanged. Camp people know the shared authored woven-container method; knowledge creates no physical pouch or invention credit.

Kest and Orin start at the Watchpost, roughly 37–40 metres from Mike's camp arrival, beyond his ordinary 28-metre sight radius and the normal opening camera. Workshop directions lead to that optional destination. Camera preferences can change framing; administrative opening review deliberately shows the proposed full scene without granting the eventual player knowledge of distant people.

The compact main candidate retains exact prospective world/player/resident identities, seed and authored title/premise. Its scenario contents come from the shared initializer rather than a second world snapshot or editable list of copied fixtures. Main-template editing changes its title/premise; **Describe a world** still begins with the supported editable small-opening model. Real native approach/material/action checks qualify initial activities, not every future encounter, autonomous decision or population cost.

## Solo testing ground

The supplied solo opening creates one controlled person with tools, a fire, finite nearby fiber/wood/stone/berries and a known pouch method. It creates no resident, hunting animal, rival, investigation or expedition. Gather and prepare fibers, then make the pouch; the limited starting prepared fiber keeps this useful testing sequence available.

The authored riverside work area is reserved before random rock/tree/shrub placement, so a selected landscape seed cannot put a rock under the starting person. Other generated terrain and ordinary support/body-clearance checks remain active. New bundled worlds share this small clearing; compatible saved terrain is not regenerated.

Direct development startup uses `OPEN_LEGEND_WORLD_PRESET=solo` with its own PostgreSQL database and save directory. Ordinary startup defaults to `wilderness`. A preset only constructs an empty world; reopening compatible progress does not reseed it. The charge and touch-only presets remain separate diagnostic world-law variations, not extra primary starting choices and not overlays that disable wilderness combat or replace everyone's body rules.

## Selected activities

The custom inhabited camp offers fibers, wood, stone, berries, a lit fire and a hare. The person arrives with basic tools and finite crafting materials and can request a supported new hunting tool through ordinary invention, obtain its inputs, make it and pursue food. The resident has authored character identity and ordinary independent cognition; their helpfulness, agreement or reward is never scripted. Knowing a woven gathering-container method supplies a dependable alternative making activity.

The solitary opening places the person and supplies farther along the same supported landscape, without a resident or hunting animal. The person knows the same container method but starts with too little prepared fiber to craft it immediately. Gathering and preparing actual fibers enables making a reusable pouch. Solitude changes the initial construction rather than requiring character-removal machinery.

The native prepared openings have no model cost. In custom/solo candidates, names, descriptions, personality, backstory, trait descriptions, explicitly authored scenario intentions, supported placements, finite resources, possessions and learned-method selections may be revised. A deliberately harsh proposal may retain scarcity or lower starting fullness. Merely labeling a proposal harsh never provides materials, grants permission or establishes readiness. Preview notices come from the profile's check of actual accessible starting food: an opening with ample food is not described as scarce; incomplete access remains unestablished.

## Fresh construction

[`createFreshBaseWorld`](../../../packages/domain/src/worlds/base/world.ts) installs existing bundled definitions, policies and the supported landscape in otherwise empty current-format state. Ordinary `createWorld` remains a caller and retains its existing cast, supplies, wilderness, threats and expeditions. The custom/solo builder adds only its selected people, scene elements and stock through the existing actor, placement, item and recipe owners. It supplies no canopy construction grant. The main builder reuses the ordinary initializer and returns its explicit permission for the actual starting player and their exact materials; destination authority publishes that permission with the fresh world. Construction controls use an exact selected family and a suggested place on the current opening's actual supported terrain. The optional finite shower covers that opening's configured building place rather than the original camp's coordinates.

Custom/solo openings and the ordinary camp read fixed gathering durations from the same [world-owned resource setup](../../../packages/domain/src/worlds/base/resources.ts). Each selected resource patch retains its own quantity and placement; this shared starter setup does not make its timings universal engine law.

The application allocates the prospective world, actor, scene and stock identities before retaining a candidate. Revisions preserve unchanged identities; labels are not references. A stock lot uses its supplied exact identity instead of merging into an unrelated possession. The retained candidate contains the exact seed, RNG state, traits and selected values. Reconstruction does not reroll an opening or sample a new personality.

An authored identity may already match a later native entity number. Initial person/scene admission and explicit lot creation reserve canonical native-looking numbers in the world's existing saved sequence; IDs and RNG remain unchanged. This deliberately advances the counter past those numbers, protecting a consumed object even after its records leave active memory. Ordinary item, pile, assembly, corpse and spawned-person/animal creation additionally checks the actual entity dictionary when selecting its next key. It preserves the authored object rather than overwriting it or refusing ordinary later play. Unrelated event, memory and work identities retain their own meaning; no retained-history scan, tombstone registry or global ID restriction is introduced.

Account ownership is a trusted input supplied separately by the destination policy. The builder returns the prepared world, creator/player role bindings and explicit setup-grant seeds. It publishes nothing, contacts no database and supplies no control lease. Authenticated ordinary entry remains necessary.

Recipe installation, initial learning and physical endowment are separate operations. The supported initial learned methods are the woven gathering container, river line and wooden shield, installed through the same trusted native compilers as ordinary authored methods. The source of initial learning is authored setup, with no actor invention credit. Backstory remains authored personal history; current location and possessions remain actual world state, and an explicitly seeded intention retains the ordinary creator attribution.

## Validation and readiness

The candidate validator rejects unsupported profiles or scene kinds, unknown fields, duplicate or unsafe identities, absent stock/learning recipients, incompatible native definition pins, invalid quantities and unbounded authored text. Construction validates actual support and body clearance and then uses current domain validation. Initial cognition, perception and body conditions are prepared before publication; these are actual initial observations, not imported events or invented earlier experiences.

The profile's readiness checker establishes standing and approach through actual native geometry, ordinary gather eligibility at a proven reachable stance, learned-method admission, carried supplies and the inherited finite fiber/cord preparation rules. Inhabited checks additionally establish its installed human invention family/policy, compatible ammunition, a current approach toward supported quarry and reachable cooking heat. Starting food must be carried or reachable; deliberate harshness can preserve food scarcity, never waive manufacturing inputs or required activity routes.

A structurally valid world cannot prove that a route finishes, an invention will be admitted or a hunt will hit. A pending route remains incomplete until the existing isolated navigation worker supplies a complete physically checked result for that exact prepared opening. Worker failure, unavailable preparation or an exhausted search remains incomplete rather than evidence of no route. Preview and preparation change none of the eventual people's positions, knowledge, time, RNG or experience. The initial direct and deferred checks use the same geometry/native action owners; they do not introduce a different movement path.

The custom/solo candidate admits at most two people, 24 selected scene elements, 32 possession lots, six learning selections, eight traits and eight explicitly seeded intentions per person. Names contain at most 120 Unicode characters; each authored prose field at most 4,000. A resource patch holds at most 10,000 finite units, a possession lot at most 512 units, and a fire at most seven days of finite fuel. These preparation envelopes bound the current small-opening consumer and are not universal fictional laws or measured hosted capacity. [World-creation limits](../../limits/world-creation.md) owns their qualification and expansion decisions. The four-or-five-person first-playable target concerns the main scenario, not permission to bypass these separate custom/solo bounds.

Creation preparation occurs after explicit selection/edit/check/start. It performs no simulation-tick creation work and reads no source-world history. Definitions and the prepared world are shared across the opening's rows and checks; learning compiles each distinct selected method once. Complete source/destination/browser/first-play qualification belongs to [Batch 07](../../maintainers/parallel-batch-07-playable-world-creation.md), not a native builder pass.

## Maintained records

- First-playable target delivery and remaining design: [coordination and owner map](../../maintainers/first-playable-validation.md).
- Test preparation and evidence requirements: [first-playable playtest plan](../../projects/first-playable-playtest-plan.md).
- Existing opening implementation: [OC06 delivery and remaining parent acceptance](../../maintainers/parallel-batch-07-playable-world-creation.md#oc01--construct-the-selected-fresh-opening).
- [Creation limits](../../limits/world-creation.md) distinguish the fixed main template from editable small-opening bounds. New camp/material/conflict tuning belongs with its selected subsystem design and inventory before implementation.
- [Main/solo evidence](../../verification/playable-world-creation.md#october-14-main-world-and-solo-testing-ground) and [shared construction design](../../projects/parallel-batch-07-playable-world-creation-tech-design.md#main-world-and-solo-testing-ground--october-14-implementation).

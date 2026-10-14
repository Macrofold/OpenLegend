# Playable starting worlds

The bundled `base:playable-opening` creation profile offers **Main world** and **Solo testing ground**. The application’s explicit trusted composition selects its implementation; shared creation transport receives only the candidate’s profile and world identity and invokes that profile’s real validator. The profile owns supported identity slots, candidate fields, construction, editable fields, preview meaning and readiness. Account binding, exact human approval, target admission and atomic publication remain application responsibilities. It does not copy a running world, produce fictional historical work or create omitted people and then remove them.

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

The native prepared openings have no model cost. In custom/solo candidates, names, descriptions, personality, backstory, trait descriptions, explicitly authored scenario intentions, supported placements, finite resources, possessions and learned-method selections may be revised. A deliberately harsh proposal may retain scarcity or lower starting fullness. Merely labeling a proposal harsh never provides materials, grants permission or establishes readiness. Preview notices come from the profile’s check of actual accessible starting food: an opening with ample food is not described as scarce; incomplete access remains unestablished.

## Fresh construction

[`createFreshBaseWorld`](../../../packages/domain/src/worlds/base/world.ts) installs existing bundled definitions, policies and the supported landscape in otherwise empty current-format state. Ordinary `createWorld` remains a caller and retains its existing cast, supplies, wilderness, threats and expeditions. The custom/solo builder adds only its selected people, scene elements and stock through the existing actor, placement, item and recipe owners. It supplies no canopy construction grant. The main builder reuses the ordinary initializer and returns its explicit permission for the actual starting player and their exact materials; destination authority publishes that permission with the fresh world. Construction controls use an exact selected family and a suggested place on the current opening’s actual supported terrain. The optional finite shower covers that opening’s configured building place rather than the original camp’s coordinates.

Custom/solo openings and the ordinary camp read fixed gathering durations from the same [world-owned resource setup](../../../packages/domain/src/worlds/base/resources.ts). Each selected resource patch retains its own quantity and placement; this shared starter setup does not make its timings universal engine law.

The application allocates the prospective world, actor, scene and stock identities before retaining a candidate. Revisions preserve unchanged identities; labels are not references. A stock lot uses its supplied exact identity instead of merging into an unrelated possession. The retained candidate contains the exact seed, RNG state, traits and selected values. Reconstruction does not reroll an opening or sample a new personality.

An authored identity may already match a later native entity number. Initial person/scene admission and explicit lot creation reserve canonical native-looking numbers in the world's existing saved sequence; IDs and RNG remain unchanged. This deliberately advances the counter past those numbers, protecting a consumed object even after its records leave active memory. Ordinary item, pile, assembly, corpse and spawned-person/animal creation additionally checks the actual entity dictionary when selecting its next key. It preserves the authored object rather than overwriting it or refusing ordinary later play. Unrelated event, memory and work identities retain their own meaning; no retained-history scan, tombstone registry or global ID restriction is introduced.

Account ownership is a trusted input supplied separately by the destination policy. The builder returns the prepared world, creator/player role bindings and explicit setup-grant seeds. It publishes nothing, contacts no database and supplies no control lease. Authenticated ordinary entry remains necessary.

Recipe installation, initial learning and physical endowment are separate operations. The supported initial learned methods are the woven gathering container, river line and wooden shield, installed through the same trusted native compilers as ordinary authored methods. The source of initial learning is authored setup, with no actor invention credit. Backstory remains authored personal history; current location and possessions remain actual world state, and an explicitly seeded intention retains the ordinary creator attribution.

## Validation and readiness

The candidate validator rejects unsupported profiles or scene kinds, unknown fields, duplicate or unsafe identities, absent stock/learning recipients, incompatible native definition pins, invalid quantities and unbounded authored text. Construction validates actual support and body clearance and then uses current domain validation. Initial cognition, perception and body conditions are prepared before publication; these are actual initial observations, not imported events or invented earlier experiences.

The profile's readiness checker establishes standing and approach through actual native geometry, ordinary gather eligibility at a proven reachable stance, learned-method admission, carried supplies and the inherited finite fiber/cord preparation rules. Inhabited checks additionally establish its installed human invention family/policy, compatible ammunition, a current approach toward supported quarry and reachable cooking heat. Starting food must be carried or reachable; deliberate harshness can preserve food scarcity, never waive manufacturing inputs or required activity routes.

A structurally valid world cannot prove that a route finishes, an invention will be admitted or a hunt will hit. A pending route remains incomplete until the existing isolated navigation worker supplies a complete physically checked result for that exact prepared opening. Worker failure, unavailable preparation or an exhausted search remains incomplete rather than evidence of no route. Preview and preparation change none of the eventual people's positions, knowledge, time, RNG or experience. The initial direct and deferred checks use the same geometry/native action owners; they do not introduce a different movement path.

The custom/solo candidate admits at most two people, 24 selected scene elements, 32 possession lots, six learning selections, eight traits and eight explicitly seeded intentions per person. Names contain at most 120 Unicode characters; each authored prose field at most 4,000. A resource patch holds at most 10,000 finite units, a possession lot at most 512 units, and a fire at most seven days of finite fuel. These preparation envelopes bound the current small-opening consumer and are not universal fictional laws or measured hosted capacity. [World-creation limits](../../limits/world-creation.md) owns their qualification and expansion decisions.

Creation preparation occurs after explicit selection/edit/check/start. It performs no simulation-tick creation work and reads no source-world history. Definitions and the prepared world are shared across the opening's rows and checks; learning compiles each distinct selected method once. Complete source/destination/browser/first-play qualification belongs to [Batch 07](../../maintainers/parallel-batch-07-playable-world-creation.md), not a native builder pass.

## Maintained records

- [OC06 delivery and remaining parent acceptance](../../maintainers/parallel-batch-07-playable-world-creation.md#oc01--construct-the-selected-fresh-opening).
- [Creation limits](../../limits/world-creation.md) distinguish the fixed main template from editable small-opening bounds.
- [Main/solo evidence](../../verification/playable-world-creation.md#october-14-main-world-and-solo-testing-ground) and [shared construction design](../../projects/parallel-batch-07-playable-world-creation-tech-design.md#main-world-and-solo-testing-ground--october-14-implementation).

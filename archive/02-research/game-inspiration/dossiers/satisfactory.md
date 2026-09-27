# Satisfactory — the factory is also a place

**G28 · Full research pass · September 26, 2026.** Research, not an implementation specification. No gameplay session, performance benchmark, accessibility-device test or video playback was conducted. **Spoilers:** technology progression and broad narrative framing; the final revelation is not recounted. This is an independent Satisfactory pass, not a second completion credit for Factorio.

[Original comparative chapter](../games/factorio-and-satisfactory.md) · [Preserved granular study](../mechanics/factorio-satisfactory-flows-blueprints-and-place.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

## 1. Identity, versions and the experience offered

Coffee Stain Studios' first-person factory game makes its industrial network a landscape the player inhabits. The Pioneer explores, gathers, builds, configures, transports, climbs and fights while working for FICSIT. Machines continue their configured work while attention moves elsewhere. Walking under a conveyor, riding a train or surveying an illuminated plant provides a different relationship to the production graph than an exclusively overhead editor. Native third-person presentation in vehicles and Hyper Tubes does not make ordinary construction third-person. [S1][S2]

The Early Access releases were Epic Games Store in March 2019 and Steam in June 2020; **1.0 arrived September 10, 2024**. Console editions followed on **November 4, 2025**, not at the PC 1.0 launch. **1.2 shipped June 2, 2026** across PC, PlayStation 5 and Xbox Series X/S. Controller and later quality-of-life support mean that launch criticism about missing controls cannot automatically describe the current product. Current official support explicitly separates the ecosystems: PlayStation and Xbox can cross-play with one another through Epic Online Services, while PC/console cross-play and console access to PC dedicated servers are not supported. [S1][S3][S4][S41]

The map is authored rather than a newly generated terrain for every save. Starting areas place the player in different parts of it; they are not separate campaign maps. Version 1.2's optional new-game resource randomization changes selected resource properties, not the entire terrain into a procedural world. Creative Mode and new-game rules are separate contracts: the former disables achievements, while the new-game modifiers have their own restrictions. This pass does not claim to have tested all combinations or the latest hotfix. [S4]

**Interpretation:** Satisfactory rewards making something understandable and useful, but also making somewhere recognizable and personally satisfying. These goals can reinforce one another without being identical. A road, facade or viewing platform may be worth building even when it barely changes production.

## 2. Construction, materials and manufacturing

The Build Gun expresses a selected structure in the world; foundations, walls, walkways, supports, paint and other architectural options let the player organize both access and appearance. Layout is reversible through dismantling and rebuilding rather than a permanent punishment for a poor first attempt. Snapping, repeated placement and customization reduce manipulation, but do not remove the need to decide interfaces, elevation, access and layout. The original chapter retains the distinction between choosing a design and laboriously expressing it. [R3][P1]

Resource nodes continuously supply material: they do not run out like finite ore patches in Factorio. Their purity and extraction equipment constrain rate. Small hand-harvested deposits are a different kind of object. The resource scanner finds supported resources, while expanding the range of known resources and the ability to exploit them gives exploration a practical role. Infinite supply over time does not mean infinite instantaneous throughput or costless transport. [S5]

The core production vocabulary includes miners, smelters, constructors, assemblers, manufacturers, foundries and refineries. Iron/copper/limestone become plates, rods, wire, cable and concrete; steel, oil, aluminum and later exotic materials widen the dependency network. Multiple-input machines make a missing intermediate visible as a stopped process. The research progression adds coal/water infrastructure, steel, oil products, rail, aluminum, drones, nuclear processing and finally converters, quantum encoders and portals. These are machine/recipe unlocks, not a role-playing character gaining levels from kills. [S6]

Belts, lifts, splitters, mergers and containers move and buffer solids. A belt's selected direction, capacity and actual connection matter independently of the apparent nearness of two objects. More finishing machines do not solve an underfed input. A shared warehouse may make stock convenient while concealing that the rate feeding it is too low. The earlier Ray Knight account of mismatched rod/constructor rates remains explicitly a **2019 Early Access** analysis, not a current recipe-ratio prescription. [P2]

**Alternate recipes** are obtained through Hard Drives found in crash-site exploration and researched in the MAM. The current reference describes choosing between two offered recipes, retaining researched choices in a library and a limited reroll. An alternate can exchange one burden for another: fewer awkward ingredients, more water, different power demand, or a new manufacturing arrangement. They are factory recipes, not universally available at the hand-crafting bench. Exploration therefore changes possible industrial designs, not just the amount of ore owned. [S7]

## 3. Fluids, electricity and side effects

Oil-derived **plastic and rubber** link useful output to byproducts and further processing. Heavy Oil Residue, fuel and recycled plastic/rubber chains create ways to consume what another step produces. A refinery cannot be evaluated as merely an isolated output-per-minute number. A buffer delays an overflow problem; an actual consumption or disposal route changes whether the chain can continue. The documented examples are version-sensitive, so this dossier does not repeat old optimization ratios as universal current answers. [S8][S9]

Pipelines introduce a vertical transport constraint. **Head lift** is not pipe throughput: a sufficiently wide pipe can still fail to carry liquid uphill. Pumps have direction and a supported elevation, and placing two adjacent pumps does not simply add their head lift as though they were numerical upgrade modules. Gas handling has different rules. A fluid buffer stores liquid; it should not automatically be treated as a powered pump. These distinctions make the terrain part of the logistics problem. [S10]

The Packager converts liquids into transportable packaged items and can unpack them, returning containers. That permits belt/vehicle logistics but adds a container flow. Version 1.2 adds fluid trucks and stations as another choice; its Build Gun vehicle-path tools replace the older necessity to record every route by driving it. Old reviews of vehicle setup must retain their dates. Neither a new transport type nor a large tank guarantees stable loading, delivery and return behavior. [S11][S4]

Power is shared through connected infrastructure. Biomass, coal, fuel and nuclear systems have different supply requirements; the graph exposes production and consumption rather than only a generic efficiency grade. **Power Storage** charges from eligible surplus generation and bridges later deficits, but its stored energy is finite. It cannot permanently cure insufficient generation. Overclocking and alternate recipes change the tradeoff between space, supply and energy rather than making expansion free. [S12]

Nuclear generation adds radioactive material and waste management. Uranium and plutonium routes create different downstream responsibilities; the documented late Ficsonium fuel route avoids creating further waste at the generator. Hazmat protection and production-chain design solve different problems. This is game-resource handling, not a simulation of actual nuclear engineering or a guide to real materials. [S13]

**Somersloops** can amplify supported production while raising energy demands, or contribute to Alien Power Augmenters. They are not just another ordinary ore or an automatically compatible upgrade for every structure. Wiki pages disagree on shorthand power multipliers, so no universal amplification-power formula is asserted here. The useful evidence is the distinct objective: obtain more output from the same material flow while paying an additional infrastructure cost. [S14]

## 4. Logistics, reuse and the player's inventory

Tractors, trucks, trains and drones solve different spatial problems. Rail provides scheduled transport and introduces block/path signaling; its infrastructure occupies space and must connect correct loading/unloading points. Drones link ports without ground routes, but require eligible fuel at a port and have limited cargo throughput. Current drones accept several specified fuels—not literally everything labeled fuel—and fuel choice changes travel characteristics. Airborne transport is particularly useful for comparatively small flows of valuable products, not automatically the best substitute for every belt. [S6][S15]

The **Blueprint Designer** makes bounded reusable arrangements. The three documented design volumes are 32, 40 and 48 meters per side, unlocked at different progression points. A blueprint is a prepared local design, not an unlimited copy of any arbitrary finished factory. Its value depends on useful external interfaces and an appropriate site. The native tool and a mod that removes placement restrictions are different capabilities. [S16]

A **Dimensional Depot Uploader** adds shared remote storage, with per-item limits and upload throughput. Crafting and building can use depot stock, but it is not an unrestricted world inventory: the documented MAM, HUB and Space Elevator submission cases still require taking items into the appropriate interaction. A full buffer of one item does not use a generic unlimited pool, and increasing upload speed is distinct from increasing capacity. This is a concrete example of convenience with retained constraints. [S17]

The **AWESOME Sink** exchanges eligible surplus products for progress toward FICSIT Coupons. The AWESOME Shop spends those coupons on unlocks and items, including architectural possibilities. These are earned in-world rewards, not paid premium currency. The system gives an alternative use to surplus and another goal after immediate production needs are met; it does not mean every dangerous, story-related or unusual item is accepted. Conflicting old coupon re-sinking descriptions are not relied on for a universal exploit. [S18][S19]

## 5. Traversal, equipment, combat and failure

The Pioneer has no class or companion build tree. Capability comes from research, crafted equipment and infrastructure. Blade Runners improve movement; a Jetpack uses carried fuel and requires replenishment between bursts; Hoverpack access is a different relationship to the factory. Parachutes, Zipline, jump pads and Hyper Tubes offer additional ways to cross the space being industrialized. The Jetpack's fuel type affects behavior, so possession of the item is not the entire travel plan. [S1][S20][S21]

The action/equipment inventory includes Xeno-Zapper and Xeno-Basher melee tools, Rebar Gun, Rifle, Nobelisk Detonator, Chainsaw, medical consumables, Object Scanner, Gas Mask and Hazmat Suit. Weapons and ammunition are manufactured tools rather than randomized loot tiers. The Object Scanner's proximity/directional cues find supported objects and differs from scanning resource nodes. Hazmat protection uses filters for radiation and does not replace a Gas Mask's gas protection. Exploration preparation therefore combines tools, consumables and route knowledge. [S22][S23][S24]

Hogs charge, Spitters attack at range, and Stingers make some enclosed spaces threatening. Passive animals and the Lizard Doggo create a different kind of encounter. These are authored creature families and spawn behaviors, not evidence of a continuously evolving ecosystem or faction diplomacy. A ride on the Giant Flying Manta is a documented traversal possibility, not a trainable flying-worker system. Native ordinary play is not a settlement siege-management game with squads of recruitable NPC laborers. [S25][S26]

There are no ordinary hunger, thirst, romance or companion-approval loops. Combat, falls and environmental hazards threaten health; food and medical items are useful for recovery rather than mandatory daily calorie accounting. On death, inventory retention depends on chosen settings; dropped items go to a recoverable crate. Co-op players can revive another Pioneer. The outcome is therefore not accurately summarized as either universal inventory loss or completely consequence-free death. The constructed factory remains a separate persistent achievement. [S27]

## 6. Progression, story, people and a continuing world

HUB milestones, MAM research and **Project Assembly** are complementary progression systems. The HUB supplies technology milestones; MAM research ties particular discoveries and materials to new tools; the Space Elevator consumes project parts to advance large phases. Early play alternates manual work and modest automation. Later progress asks for increasingly interdependent manufactured products, creating reasons to revisit old lines, expand power and connect distant sites. Finishing a local factory can immediately reveal the next system-level constraint. [S6][S28]

MAM paths include Caterium, Quartz, Sulfur, nutrients, alien organisms/technology and Power Slugs. Their value is not only another main-quest checkbox: tools and alternate approaches can make a personally chosen project easier. The late game includes exotic conversion, quantum production, portal travel and the final Project Assembly phase. After formal narrative completion, the player can continue building, decorating, optimizing or pursuing collection/achievement goals; there is no forced seasonal reset of every factory. [S28][S6][S29]

**Narrative premise, without revealing the ending:** FICSIT frames extraction as duty, and ADA instructs, evaluates and comments with dry corporate humor. Alien artifacts open a secondary communication thread whose language contrasts with industrial accounting. The written transcript documents authored dialogue; ADA's fictional title does not imply the game is running a generative conversational model. There is no ordinary branching political-faction quest network, romance cast or NPC work schedule hiding behind the factory interface. [S29]

Version 1.1 expanded authored ADA material but subsequently removed periodically repeated construction comments after community feedback. This is a useful production example: more apparent companion presence can become interruption. Presence, timing and relevance matter independently of the amount of recorded dialogue. The optional FICSMAS event adds a themed production/collection loop; its seasonal content is not a prerequisite for the core campaign. [S29][S30]

**Interpretation:** a factory also records player history. An old improvised belt, an unnecessary road, or a rebuilt entrance can identify what the builder understood and valued at a particular moment. This is player-authored meaning, not evidence that the game stores a psychological biography of its creator.

## 7. Eight concrete situations

These are **constructed sequences based on documented mechanics**, except the explicitly attributed critic example. They were not played afresh for this research.

**1 — Reach water, not merely calculate enough water.** Intention: power machines above a lake. Preconditions: extraction, connected piping and sufficient electricity. Place the route, then inspect elevation and pump direction when the consumer remains dry. Correct head lift rather than simply widening the pipe. The next decision is whether another level needs another pumping stage. A visually connected pipe and an adequate nominal flow rate do not prove vertical delivery. [S10]

**2 — Stop a useful refinery from choking on its other product.** Intention: maintain plastic output. Inspect both outputs and discover an accumulated byproduct. Add an appropriate processing or disposal destination, rather than only another plastic refinery. The result is continued operation; the next question is whether the new fuel or recycled-product route has its own blocked output. More buffer merely delays the same structural failure. [S8][S9]

**3 — Rebuild for a newly discovered recipe.** Intention: simplify a production line. Explore a crash site, research its Hard Drive, and compare an offered alternate with the existing plan. Choose it only after considering changed ingredients, energy and logistics. A different recipe can remove one bottleneck while creating another. Next decide whether the improvement warrants rebuilding a functioning old line. Discovery expands options; it does not automatically select a universally superior factory. [S7]

**4 — Remote supplies still have a rate.** Intention: keep building far from home without repeated inventory trips. Feed a depot uploader with desired materials and use its accessible stock. A short burst of construction can exhaust that item's reserve faster than uploads refill it. Increase the relevant supply or upload capacity rather than assuming the remote interface creates materials. For a research submission, withdraw the items into the required interaction. [S17]

**5 — Make a reusable room, not a magical entire factory.** Intention: repeat a tested production module. Build it within the chosen Blueprint Designer's supported volume, save it, and place it at an appropriate site. Connect its actual inputs, outputs and support infrastructure. The next question is whether that module fits the terrain and downstream demand. Bounded reuse reduces repetitive expression while retaining layout choices. [S16]

**6 — Amplify one process without collapsing its support.** Intention: stretch scarce intermediate inputs. Install supported Somersloop amplification and inspect the changed power requirements. Higher output may reveal a power or transport bottleneck that was previously harmless. Decide whether extra generation, another recipe or unamplified capacity better serves the goal. A beneficial local modification is not automatically beneficial to the whole network. [S14]

**7 — Recover the explorer without rebuilding the world.** Intention: retrieve discoveries after a dangerous route fails. Depending on settings, use the death-crate marker and prepare the equipment required to return, or have a teammate perform the supported revival. The original hazard can still make retrieval difficult. The next plan can change the route or preparation; it need not erase all prior construction. This is not a claim that every setting drops the same possessions. [S27]

**8 — Build something unnecessary for throughput and valuable for place.** Krupička describes making roads whose purpose was visual satisfaction rather than faster transport. The intention is to inhabit a coherent industrial place; the actions are construction and arrangement; the result is not properly assessed only by items per minute. This is his attributed play account. It does not prove that every player wants decorative work, especially when another player experiences placement itself as the burden. [R4]

## 8. Cooperation, mods and different kinds of participation

Native multiplayer is cooperative, with shared HUB/MAM/Space Elevator/AWESOME progression and friendly fire. The published PC recommendation is four players, not a guarantee that arbitrary larger groups perform well. Steam/Epic PC players can play together; PlayStation/Xbox console cross-play is a separate pool, and Coffee Stain's current support page explicitly says PC/console cross-play is not planned and consoles cannot join dedicated servers. Shared progress is not automatically a personal campaign copied to every participant's account. [S31][S41]

The prior Cook account of one person maintaining production while another explores and connects sites remains intact. The group can benefit from different preferences without formal character classes. **Interpretation:** the difficult coordination problem is often explanation—why a line exists, which reserves are intentional and what a teammate was trying to make. An unsolicited “optimization” can improve output while removing another person's understandable work. [P2]

Community mods add separate capabilities and compatibility obligations. The Satisfactory Modding documentation warns that disabling mods and saving after their objects disappear can make losses persistent. Installing a manager and installing compatible mods are different operations. Mods are not the same as Creative Mode, and their achievement behavior differs. No mod was installed or tested here; the mod names in player accounts remain attributed examples, not recommendations certified for the current build. [S32]

## 9. Art, audio, interface and production history

Industrial color, large silhouettes, moving conveyors and visible terrain establish scale; vertical construction gives the player something to navigate, not only an output graph. The five critics differ on how much that embodiment helps or obstructs construction. This tension is concrete: an object can be readable from a distance yet obscure the immediate connection point when its hologram fills the screen. Presentation and manipulation cannot be assessed independently. [R2][R3][R4]

The official soundtrack credits **Jannik Reuterberg, Dream Thing**. Its synth-led score and named biome pieces are separate from an inference about retention or player psychology. Community documentation describes music varying with place, time and activity, and the Boom Box's selectable tapes provide another layer. The album, trailer music and in-game playback are not identical evidence; no full soundtrack listening or footage inspection was performed. [S33][S34]

Accessibility involves more than controller support. Original 1.0 reviews cannot establish that controls still lack later features; 1.1 introduced controller support, and subsequent notes address font sizes and subtitle timing. Version 1.2 adds further input/rebinding and presentation changes. Creature/arachnophobia options and configurable rules can reduce some friction, but this pass did not test motion sensitivity, low-vision tools, screen readers or assistive devices. It does not infer comprehensive accessibility from one option. [S4][S35][R1]

Coffee Stain's development path includes five years of public Early Access before 1.0, continuing PC revisions, and collaboration with Fishlabs on console/controller work. Update 8's engine transition to Unreal Engine 5 and 1.2's later engine upgrade are delivered production changes, not evidence that engine version alone determines performance. Developer patch notes and the public feedback route show iterative maintenance; a reviewer who encountered no bug on one system does not certify every platform or save. Exact title budget and all-in staffing were not established. [S3][S4][S35][S36]

## 10. Distribution, visibility and commercial evidence

Early exclusivity, subsequent Steam distribution, full release and consoles are distinct audience-expansion events. Long-form factory tours, reusable build designs, updates and co-op stories are visible sharing units. The official site and maintained community-facing patch notes document communication rather than measurable acquisition attribution. **Growth hypothesis:** an impressive factory immediately communicates scale and ownership, while visible supply chains promise that the spectacle is something the player can learn to build. This does not establish how many sales any trailer, streamer or individual feature caused. [S1][S3][P1]

Contemporary reporting attributes **more than five million sales by the end of 2023** to Coffee Stain's holiday announcement. Reports differ on five versus 5.5 million at that date, so the conservative threshold is retained and the unwatched original video is not represented as a primary read. A September 2024 report separately attributes 5.5 million to the developer. These are dated sales reports, not the latest lifetime count or a calculation of profit. [S36][S37]

Coffee Stain Group's **August 5, 2026** interim release says Satisfactory's net sales grew significantly year over year and identifies consoles and the June update as contributors. That is management's product assessment. The accompanying **SEK 253 million** revenue is for the group, not Satisfactory alone; group cash earnings, cash flow and headcount are likewise not title figures. No revenue allocation or retention rate is invented from them. [S38]

The game is sold as a premium product, with storefront/platform pricing and a separately purchasable soundtrack. FICSIT Coupons are an in-game earned system, not proof of microtransaction revenue. The dossier does not multiply a unit count by a present store price to claim gross or net lifetime revenue. [S3][S19][S33]

## 11. Reception: five full reviews and Steam contrasts

All five substantive written bodies were read through their conclusions. The Italian, Czech and Dutch articles were read in their original text and paraphrased in English. They are not five score snippets, nor are their opinions averaged into a population estimate.

**Adam Cook, God is a Geek, September 10, 2024.** Cook values the transition from manual work to self-sustaining processes and the possibility of complementary co-op roles. A group can choose worthwhile tasks rather than all following an identical action loop. He also notes that the opening pace will not suit everyone. His 2024 controller limitation is historical, not current evidence. [R1]

**TJ Denzer, Shacknews, September 10, 2024.** Denzer emphasizes the rewarding exchange between exploration, equipment and factory expansion, alongside the humor and enjoyable distractions. The main comparison is not simply a larger production spreadsheet: tools and landscape supply other activities. Placement precision can still interrupt the otherwise satisfying loop. This is a tested 1.0 impression, not an audit of 1.2 vehicle tools. [R2]

**Francesco Serino, Multiplayer.it, September 19, 2024.** Serino praises gradual learning, reversibility, alternative approaches and construction that becomes visually distinctive. His reservations concern awkward placement and the mental load of increasingly complicated production. The article's enthusiasm does not imply that every player will regard ever-expanding dependencies as a reward. Mechanics details here use current documentation rather than uncritically importing incidental review numbers. [R3]

**Michal Krupička, Games.cz, September 18, 2024.** The original article date is September 18, not the aggregator's September 26 listing. Krupička values the beauty of a constructed place and meaningful recipe discoveries, but feels the next demand can arrive before there is time to enjoy the current solution. Exploration can lose novelty, and another player's construction can require detective work. His road example explicitly separates aesthetic satisfaction from transport efficiency. [R4]

**Claudia Tjia, Gameliner, September 15, 2024.** Tjia enjoys routing, escalating scale and the natural arrival of useful tools, with collaborative experimentation broadening the appeal. She warns that early manual repetition and the lack of an action-led experience make this a particular taste. Her comparatively comfortable account of pacing contrasts with Krupička's pressure rather than canceling it out. [R5]

**Steam helpful-positive evidence.** The English Most Helpful (All Time) surface was read. [COHF] LordRIB's January 14, 2024 entry contains later edits referring to 2026 and celebrates factories as places to visit, with natural sound and infrastructure intertwined; its named building mods are not native features. Conjam99's June 6, 2023 account describes repeated worlds evolving from mess to planned industry and cooperative playfulness. The displayed total playtime is not necessarily time at original publication. These older high-helpfulness entries are qualitative accounts, not a current-player survey. [S39]

**Steam helpful-negative evidence.** The English Most Helpful (All Time), Negative Only surface was successfully read. Nelenith's October 14, 2024 review distinguishes enjoying logistical design from disliking large-scale placement and three-dimensional alignment. Soup's November 13, 2021 Early Access review complains about missing blueprints and signals; those missing-feature claims are obsolete, while the distinction between designing and repeatedly placing remains historically informative. Wraithflight's April 13, 2023 account finds the 3D view physically uncomfortable and progression insufficiently purposeful despite appreciating the craft. None is evidence that all current players share those problems. [S40]

The older negative placement account in the original chapter is therefore preserved **and newly contextualized**, not erased because later tools exist. Conversely, later tools must not be ignored to reproduce an outdated criticism. A complaint about friction, a preference for another camera, a technical bug and a demand for a different purpose are different kinds of feedback.

## 12. Transfer hypotheses and limits

**Preserve the distinction between the useful system and the inhabited place.** A production metric cannot fully evaluate architecture that a player wants to walk through, show someone or remember. An assistant that optimizes only output can miss the user's actual objective.

**Remove repeated expression without automatically taking ownership of the design.** Blueprint volumes, depot upload limits and reusable routes illustrate bounded convenience. They suggest studying which work is a meaningful choice and which work is copying an already understood choice. They do not establish that a whole-factory optimizer is always desirable.

**Make infrastructure consequences diagnosable.** Head lift, byproducts, reserve energy and shared inventory are valuable because superficially similar failures have distinguishable causes. A new mechanic should communicate its actual constraints rather than supplying a vague failure sentence.

**Support different contributions without manufacturing arbitrary classes.** An explorer, industrial planner and aesthetic builder can all improve the same world. Their role comes from what they enjoy and know, not necessarily an imposed character class. This is a research hypothesis, not an approved NPC assignment system.

**Do not mistake reduced hostility for a missing game.** Satisfactory's ordinary factory is not built around continual enemy sieges, yet infrastructure and self-chosen goals still create problems. Adding hunger, raids or social simulation would change its promise, not merely fill empty checklist categories. Equally, its comparatively sparse social world would not satisfy every other game's goals.

## 13. Coverage, preservation and source limits

### September 26 requirements-and-corrections audit

A fresh pass against the explicit mechanics inventory confirms the dossier covers the full requested surface and makes the meaningful absences explicit:

- **Identity / classes / attributes / skills / leveling / perk or tech trees:** the Pioneer has no class/attribute/skill-XP build. HUB milestones, MAM research, Project Assembly, equipment and infrastructure form the progression stack (§§1, 5–6).
- **Items / inventory / weapons / armor / equipment / crafting / upgrading:** §§2, 4–5 cover hand/machine crafting, transport/storage, the Build Gun, weapons, ammunition, protection gear, traversal equipment, Somersloops, alternate recipes and reusable blueprints.
- **Magic / spells / powers:** absent natively; unusual alien technology and late-game machinery remain authored technology, not a spell system.
- **Traversal / environmental and object interaction:** §5 covers Blade Runners, Jetpack, Hoverpack, parachute, Zipline, jump pads and Hyper Tubes; §§2–4 cover placement, snapping, dismantling, resource scanning, fluids, power, vehicles, trains, drones and terrain/elevation constraints.
- **Activities / minigames:** exploration, crash-site/Hard Drive discovery, factory design, transport planning, combat, collection, decoration and seasonal FICSMAS are activities around the production loop. There is no separate native card/sport/casino-style minigame economy.
- **Combat / stealth / loot and rewards:** §5 covers creature combat and manufactured weapons. There is no conventional stealth system. Crash sites, alien artifacts, Power Slugs/Hard Drives and exploration discoveries are rewards, but enemies are not a randomized equipment-loot ladder.
- **Death / failure / recovery / economy / trading:** §§3–5 and 7 cover power/logistics failures, death crates/revival and reversible building. The resource/throughput economy and earned AWESOME coupons are separate from real-money sales; ordinary Freeplay has no merchant-price market.
- **Story / relationships / romance / reputation / party / companions:** §6 covers ADA/FICSIT and artifact narrative. Native romance, companion approval, recruitable party members and a relationship-reputation simulation are absent.
- **NPC/AI behavior and schedules / factions:** hostile/passive creature families have authored behavior (§5); FICSIT is narrative framing rather than a competing-faction simulation, and there is no daily NPC worker schedule or recruitable settlement population.
- **World map / environment / quests / events:** the authored world, biome/resource placement, starting areas and optional resource randomization are covered in §§1–6. HUB/MAM/Project Assembly objectives substitute for a conventional quest log; FICSMAS is a distinct seasonal event.
- **Building / settlements / management:** world-scale factory/architecture construction is the core system, but there is no NPC settlement-governance layer.
- **Multiplayer / social / endgame / return loops:** §8 covers co-op, platform pools and mods; §6 covers Project Assembly completion followed by continued building, collecting, decorating and optimization rather than a forced seasonal reset.

The multiplayer reread also replaces an earlier intentionally cautious formulation with the current official boundary: console cross-play is PlayStation ↔ Xbox only; Coffee Stain says PC and console remain separate ecosystems and console clients do not join dedicated servers. [S41]


R01: §1; R02–R03: §§2–5; R04: §§4–6 and §10; R05: §7; R06: §§5–6 and §8; R07: §9; R08: §6; R09: §9; R10–R11: §10; R12: §11; R13: §12; R14: here and source register. Applicable absent systems, version boundaries and untested claims are stated rather than silently filled with another game's behavior.

Both earlier owners were read fully and remain **unchanged**. This preserves the full placement/alignment criticism, embodied-place interpretation, cliff-route and power cases, Ray Knight's historical rod example, Adam Cook's complementary roles, and the entire Factorio half of the two shared files. Their source annotations and dates remain intact. The [Satisfactory 1.0 trailer](https://www.youtube.com/watch?v=Jt4XOPiPJHs) is a retained viewing route, **not footage watched** here; no timestamps are invented. This relevant-owner comparison does not certify the separate seven-file packet-wide P01 gate.

### Annotated sources

Accessed September 26, 2026. Official wiki pages are community-maintained documentation; multiple substantive bodies were retrieved through search when direct page opening failed. That is not a game-code audit. Inconsistent minor tables and obsolete Fandom descriptions are not promoted into current rules. All reviews and Steam bodies counted above were actually read; videos were not.

- **S1–S4:** Official product site and documented version/platform/patch history; shipped features separated from older launch constraints. Patch text is developer material reproduced by the wiki.
- **S5–S17:** Resource, recipe, fluid, power, logistics, equipment-amplification, blueprint and depot documentation. Exact balance formulas are omitted where unnecessary or conflicting.
- **S18–S19:** In-world coupon/shop rules; not a real-money economy.
- **S20–S28:** Traversal, equipment, observation, creatures, death and research documentation. Species descriptions are not inferred autonomous ecology.
- **S29–S30:** Authored dialogue transcript and seasonal equipment history. Spoiler route contains the ending, although this dossier does not repeat it.
- **S31–S32:** Multiplayer and mod-maintainer documentation, including platform pools and save-loss cautions; no local compatibility testing.
- **S33–S35:** Publisher soundtrack credits, community music reference and developer maintenance notes. Music/controls were not personally tested.
- **S36–S37:** Contemporary reported sales/engine/release history. Holiday video was not watched; discrepancies are bounded rather than concealed.
- **S38:** Primary August 5, 2026 group report. Product commentary is attributed to management; consolidated financials are not title financials.
- **S39–S40:** Actual English helpful-ranked positive and negative Steam surfaces, with historical dates and later edits distinguished.
- **S41:** Coffee Stain's current Satisfactory Support/FAQ, retrieved September 26, 2026. Primary platform and multiplayer boundary: PlayStation/Xbox console cross-play, no PC/console cross-play, and no console dedicated-server joining.
- **R1–R5:** Five independently credited full written reviews; publication dates/languages specified above.
- **P1–P2:** Existing repository owners, preserved rather than replaced.

[S1]: https://www.satisfactorygame.com/
[S2]: https://satisfactory.wiki.gg/wiki/Pioneer
[S3]: https://satisfactory.wiki.gg/wiki/Satisfactory/it
[S4]: https://satisfactory.wiki.gg/wiki/Patch_1.2.2.2
[S5]: https://satisfactory.wiki.gg/wiki/Resource_Node
[S6]: https://satisfactory.wiki.gg/wiki/Milestones
[S7]: https://satisfactory.wiki.gg/wiki/Hard_Drive
[S8]: https://satisfactory.wiki.gg/wiki/Plastic
[S9]: https://satisfactory.wiki.gg/wiki/Rubber
[S10]: https://satisfactory.wiki.gg/wiki/Head_lift
[S11]: https://satisfactory.wiki.gg/wiki/Packager
[S12]: https://satisfactory.wiki.gg/wiki/Power
[S13]: https://satisfactory.wiki.gg/fr/wiki/Centrale_nucl%C3%A9aire
[S14]: https://satisfactory.wiki.gg/wiki/Somersloop
[S15]: https://satisfactory.wiki.gg/wiki/Drone
[S16]: https://satisfactory.wiki.gg/wiki/Blueprint_Designer
[S17]: https://satisfactory.wiki.gg/wiki/Dimensional_Depot_Uploader
[S18]: https://satisfactory.wiki.gg/wiki/FICSIT_Coupon
[S19]: https://satisfactory.wiki.gg/wiki/AWESOME_Shop
[S20]: https://satisfactory.wiki.gg/wiki/Blade_Runner
[S21]: https://satisfactory.wiki.gg/wiki/Jetpack
[S22]: https://satisfactory.wiki.gg/wiki/Category:Equipment
[S23]: https://satisfactory.wiki.gg/wiki/Object_Scanner
[S24]: https://satisfactory.wiki.gg/wiki/Hazmat_Suit
[S25]: https://satisfactory.wiki.gg/wiki/Creatures
[S26]: https://satisfactory.wiki.gg/wiki/Giant_Flying_Manta
[S27]: https://satisfactory.wiki.gg/wiki/Damage
[S28]: https://satisfactory.wiki.gg/wiki/MAM
[S29]: https://satisfactory.wiki.gg/wiki/Story
[S30]: https://satisfactory.wiki.gg/wiki/FICSMAS/Equipment
[S31]: https://satisfactory.wiki.gg/wiki/Multiplayer
[S32]: https://docs.ficsit.app/satisfactory-modding/v3.10.0/faq.html
[S33]: https://store.steampowered.com/app/2873550/Satisfactory_Soundtrack/
[S34]: https://satisfactory.wiki.gg/wiki/Music
[S35]: https://satisfactory.wiki.gg/wiki/Patch_1.1.2.2
[S36]: https://gamermatters.com/satisfactory-sold-more-than-5-million-copies-after-four-years-of-early-access-release/
[S37]: https://gamesbeat.com/coffee-stains-satisfactory-launches-after-five-years-in-early-access
[S38]: https://coffeestain.com/release/coffee-stain-group-interim-report-q1-april-june-2026-net-sales-amounted-to-sek-253-million/
[S39]: https://steamcommunity.com/app/526870/reviews/?browsefilter=toprated
[S40]: https://steamcommunity.com/app/526870/negativereviews/?browsefilter=toprated
[S41]: https://www.satisfactorygame.com/support/
[R1]: https://godisageek.com/reviews/satisfactory-review/
[R2]: https://www.shacknews.com/article/141372/satisfactory-reivew-score
[R3]: https://multiplayer.it/recensioni/satisfactory-recensione.html
[R4]: https://games.tiscali.cz/recenze/satisfactory-recenze-noveho-krale-automatizace-581739
[R5]: https://gameliner.nl/reviews/satisfactory-review-was-zeker-wel-satisfactory/5132-1-1-181
[P1]: ../games/factorio-and-satisfactory.md
[P2]: ../mechanics/factorio-satisfactory-flows-blueprints-and-place.md

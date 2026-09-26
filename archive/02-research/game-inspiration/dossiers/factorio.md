# Factorio — making a working system visible

**G27 · Full research pass · September 26, 2026.** Research and interpretation, not an implementation plan. Covers the base game and the separate Space Age expansion; experimental changes are labeled. No gameplay session, benchmark, accessibility-device test or video playback was conducted. Spoilers concern technology and planet mechanics rather than a character-driven plot.

[Original comparative chapter](../games/factorio-and-satisfactory.md) · [Preserved granular study](../mechanics/factorio-satisfactory-flows-blueprints-and-place.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

## 1. Identity and version boundaries

Factorio is Wube's overhead factory-building game: a directly controlled engineer constructs a production system that increasingly performs its own work. It supports solo and cooperative play, while scenarios, a map editor and mods can change the contract. Its central experience is neither issuing jobs to simulated villagers nor controlling an abstract spreadsheet. The engineer inhabits the same belts, machines and hostile landscape being organized. [F1][F2]

As accessed September 26, the official wiki lists **2.0.77 stable and 2.1.20 experimental**, and warns that its documentation follows 2.1. Space Age adds interplanetary production; it is not synonymous with the free 2.0 update. Wube's June 26, 2026 experimental announcement warns that upgraded saves and blueprints cannot simply be downgraded. This dossier describes established systems without treating every current wiki option as a feature of every historical version. [F1][F3]

The Nintendo Switch edition and **Switch 2 edition** must also be distinguished. Wube confirms the latter and its Space Age release on **December 22, 2025**, with a free technical upgrade for existing owners and PC cross-play. Space Age is not available on the original Switch. The September 18, 2026 developer post adds an ARM64 Linux release, with Steam availability on the experimental branch; it describes conventional 2D play on Steam Frame, not a new room-scale VR factory simulation. [F4][F5]

**Interpretation:** the promise is cumulative competence. A small solved problem remains useful after attention moves elsewhere. Progress changes what the player thinks about—from carrying fuel, to routing it, to managing the capacity and reliability of a network.

## 2. What the player does, and what things are made of

The basic verbs are moving, inspecting, mining, crafting, placing, rotating, recovering structures, configuring recipes, transferring inventory, connecting infrastructure, selecting research and fighting. The inventory's crafting queue can manufacture eligible prerequisites; that convenience is distinct from a permanently operating assembler. Structures expose interfaces rather than requiring the player to guess their state from appearance alone. Alt-mode overlays recipe and content information. The older quick-start guide is useful for this durable grammar, but its obsolete tutorial names and menu routes are not adopted as current instructions. [F6]

Early material families include **iron and copper ore, coal, stone and wood**; later oil and uranium support different chains. Iron plates become such intermediates as gears and steel; copper contributes cable and circuits; oil processing supplies chemical intermediates. Burner drills and furnaces need fuel, while electrical infrastructure changes the delivery problem rather than eliminating energy demand. Ore extraction, smelting, assembly and chemistry are separate transformations, not one universal crafting station. Iron acquisition itself changes across Space Age: drills on Nauvis, asteroid crushing in space, biological production on Gleba, recycling on Fulgora, and imports to Aquilo. [F6][F7]

**Science is manufactured demand.** Automation, logistic, military, chemical, production, utility and space science packs feed research. New research unlocks recipes, machines or improvements; it is not experience awarded to a character for killing enemies. Space Age adds metallurgic, electromagnetic, agricultural, cryogenic and promethium science, and changes the route to space science. Agricultural packs introduce freshness into the value of research supply. A laboratory without the necessary pack mix is a visible destination problem whose cause may be several transformations upstream. [F8]

There is no native class selection, spellbook, companion approval, romance, dialogue quest tree or merchant-price economy in ordinary Freeplay. Equipment and research provide capabilities, while the player chooses the role of explorer, planner, defender or builder. The tutorial supplies finite authored objectives; Freeplay makes most intermediate objectives the player's responsibility. Wave Defense demonstrates a genuinely different scenario: technologies start unlocked, a central silo must survive, and the ordinary research loop is absent. A mod or scenario can add systems that should not be attributed to standard play. [F9][F10]

## 3. Four transport and control layers

**Belts and inserters.** Belts move solids without an electricity bill and have two lanes. Yellow, red and blue belts provide successively higher throughput; Space Age adds green turbo belts. Underground sections cross obstacles, splitters distribute or filter flows, and inserters transfer between the ground, belts, machines and containers. Faster transport does not manufacture absent inputs. Nor does an apparently full lane prove that every consumer receives enough: direction, lane use, access and local consumption matter. [F11][F6]

**Fluid networks and power.** The prior study preserves oil's important asymmetry: advanced processing has coupled heavy-oil, light-oil and petroleum outputs, so a full unwanted output can halt the wanted one. Basic processing is different. Pipes, tanks, pumps, cracking and consumption create flow and control decisions. Electricity is another network: early fuel-to-steam production, solar panels with night-time storage, and more advanced generation have different dependencies. Exact solar ratios are planet- and rules-dependent; a figure for Nauvis is not a universal ratio for every Space Age surface. [P2][F12]

**Rail.** Fueled locomotives, cargo or fluid wagons, train stops, schedules and wait conditions make repeated delivery possible. Departure can depend on time, cargo, inactivity or a circuit condition rather than only a fixed timetable. Signals divide connected tracks into blocks and constrain automatic travel direction; chain signals consider the onward route so a train need not enter a junction it cannot leave. Track connectivity, stop orientation and signal placement therefore matter independently of locomotive speed. Elevated rails add grade separation but do not supply a correct schedule or unloading system. [F13][F14][F15][F16]

**Robots.** Logistic robots move items among appropriately configured chests and player requests within connected roboport coverage. Active providers push out stock; passive providers make it available; requesters ask for it; storage and buffer chests serve different purposes. Construction robots build, repair, remove and upgrade supported entities. Both fleets still need infrastructure and charging; airborne mobility is not unlimited throughput. This distinction is important for delegation: specifying the desired object does not erase travel, power, supply or coverage constraints. [F17]

**Circuits add information, not transport capacity.** The preserved study explains summed numeric signals, separate red/green connections, comparisons, arithmetic/decider logic and conditional devices. Held values and pulses mean different things. A tank can report stock to a pump; a chest can stop an inserter at a threshold. These rules make a factory reactive without implying that it invents goals or understands its owner's prose. [P2]

## 4. Reuse, equipment and optimization

Blueprints encode arrangements; books organize them; sharing transfers a design rather than its materials. Ghost placement, construction and operation remain separate. Parameterized designs expose selected variations within a reusable pattern. Deconstruction and upgrade planning reduce repeated manipulation, but an imported arrangement may still assume particular recipes, inputs or transport directions. The earlier chapter's blueprint case remains intact rather than being replaced by a generic claim that copying is creativity. [P1][P2]

**Modules express competing objectives.** Speed increases output rate with additional energy demand; productivity increases outputs per consumed inputs but has compatibility and cost tradeoffs; efficiency reduces energy use; the expansion's quality module changes upgrade probabilities. A throughput objective, an ore-conservation objective and a power-conservation objective need not choose the same configuration. Beacons transmit supported module effects to nearby compatible machines, but consume power and space, and overlapping effects have diminishing returns. Productivity and quality modules cannot simply be put in a beacon. No version-independent optimal layout is asserted. [F18][F19]

Personal armor progresses through light, heavy, modular and power variants, with equipment grids in the advanced forms; Space Age adds mech armor. The buildable inventory also includes cars, tanks and Spidertron, as well as guns, ammunition, walls and turret families. Equipment is manufactured and supplied, not a random rarity loot stream from each defeated creature. Different damage/resistance and delivery relationships matter more than an assumed universal “higher tier always solves this enemy” rule. [F20][F21]

**Quality** has Normal, Uncommon, Rare, Epic and Legendary tiers. It is an expansion-owned feature that can be used separately from the full interplanetary campaign. Higher quality changes item-specific properties, not every property indiscriminately. Solid ingredients for a selected recipe quality must match that quality; fluids do not acquire quality tiers. Quality modules can generate upgraded outputs probabilistically, while sorting and recycling can support further attempts. The extra inventory categories and chance of success create another logistical objective, not guaranteed free improvements. [F22]

## 5. Pressure, time, failure and progression

Nauvis' biters and spitters attack in a world affected by production. The prior study distinguishes **emitted pollution, the spreading/absorbed cloud, attack formation and evolution**. Keeping the visible cloud away from a nest does not nullify evolution associated with total emissions. Territorial Demolishers on Vulcanus and spore-attracted pentapods on Gleba impose different conditions; not every planet reproduces Nauvis' attack model. [P2][F21]

Map generation provides meaningful contracts: resource distribution, terrain, enemy settings, pollution, and presets such as Rail World or a narrow Ribbon World change the problem. Peaceful behavior and disabling enemies are not identical options; console, mod and version differences should remain visible. A player can seek a construction-focused session rather than accepting escalating defense as the only legitimate way to play. These are chosen game rules, not a claim that every danger can be switched off independently on an existing save. [F23]

When the engineer dies, carried possessions remain in a corpse and the character can respawn. Recovery, not a permanent character-level reset, is the ordinary consequence. The documented 2.0.7 change removed corpse despawning; older corpse timers should not be recycled into current advice. Factory damage, resource starvation and a lost space platform can remain expensive even when the engineer returns. Save/load offers another recovery contract rather than making every mistake irreversible. [F24][F25]

**Early play** establishes raw production and small research chains. **Middle play** expands power, oil, defenses, trains and automation of the machines needed to expand. **Late base-game play** reaches the rocket and can continue into larger, more efficient production and repeatable research goals. **Space Age** relocates the rocket from final aspiration to recurring transport infrastructure. After reaching interstellar space, players can submit a factory snapshot to the Galaxy of Fame; this is an optional exhibition of a save, not a competitive rank that proves unmodified completion. [F8][F16][F26]

**Interpretation:** “finished” has several meanings: achieved the formal objective, built a reliable system, solved a self-imposed challenge, or learned enough to start again with a better plan. The possibility of endlessly enlarging output can support mastery or become an obligation without a satisfying stopping point. Neither response is evidence that the other player misunderstood the game.

## 6. Space Age: places change the production grammar

**Vulcanus** replaces ordinary assumptions about metal scarcity with lava-based metallurgy, calcite, tungsten, foundries and big mining drills. Useful space is constrained by terrain and Demolisher territories. Building inside an undefeated creature's territory invites destruction; defeating it permanently frees that territory rather than triggering identical respawns forever. Metallurgic science and new manufacturing equipment make the place valuable beyond a one-off visit. This is territorial risk, not a hidden diplomacy system. [F27]

**Fulgora** makes ruins and scrap the basis of a reverse-production problem: obtain useful products, sort them, and avoid being blocked by what arrives in excess. Lightning is both danger and a power opportunity. Buildable plateaus are separated by oil lowlands, changing where a factory, rail support or connected network can fit. The landscape is not only a different resource color; distribution and constrained area affect how a working solution is expressed. The ruins imply a history without providing a cast of conversational survivors. [F28][F16]

**Gleba** uses agriculture and biological processing. Yumako and jellynut cultivation, nutrient-fueled biochambers, bacteria and agricultural science challenge the habit of solving everything with larger buffers. Many products age into spoilage wherever they sit. Spores attract pentapods; farming, layout and defense are coupled. The player must distinguish keeping a process alive from maximizing a warehouse's contents. An abundant stock that expires before use is not productive security. [F29]

**Aquilo** depends on importing basic materials and keeping machinery warm. Ice platforms extend the available surface; concrete enables many placements; heat pipes and generators prevent freezing. Ammonia, fluorine and lithium processing lead into cryogenics and fusion-related production. The cold is principally an infrastructure rule here, not evidence of a native hunger-and-exposure survival simulation for the engineer. A machine can have electricity and ingredients yet remain stopped for a different physical reason. [F30]

**Space platforms** are self-contained factories and transports, built through remote ghost placement and supplied via rockets. Asteroid collectors and processing support fuel, ammunition and space production; defenses keep the platform intact. Destroying its hub loses the platform and its contents. More engines are not sufficient evidence of readiness: supply, storage, defense and the journey's conditions matter. Platforms and surface installations create a network of interdependent responsibilities rather than one factory being moved intact to a prettier map. [F25][F16]

## 7. Eight worked situations

The following are constructed sequences from documented rules and the preserved studies, not a newly observed play session. Each illustrates a decision and a boundary.

**1 — Diagnose before expanding.** You want more electronic circuits, but the assemblers wait for inputs. Inspect the feed rather than adding identical idle machines. Trace the shortage back to the missing intermediate or its transport, then increase that supply. The successful outcome is higher sustained production; the next limit may move elsewhere. A machine-count increase alone does not establish improvement. The original starvation example is preserved. [P1]

**2 — Solve a shortage caused by a surplus.** You need petroleum while heavy oil has filled its outlet. The refinery cannot continue all its outputs. Add consumption or a cracking route, using a reserve condition where another process needs heavy oil. Production resumes, but simple additional storage only postpones the same bottleneck. The next choice is how much reserve is useful, not how to maximize every tank simultaneously. [P2]

**3 — Keep a crossing clear.** You want two trains to share a junction. A normal entrance signal can admit a train into an empty crossing even when its exit is occupied. Place and connect chain signaling so admission depends on an available onward path, with adequate exit blocks. The train waits before the crossing and other traffic can proceed. Incorrect stop placement or insufficient space beyond the junction can still defeat the layout. [F14][F15]

**4 — Build the design you already chose.** You want another working subfactory. Place a blueprint ghost, supply the necessary items and construction coverage, and let supported construction execute it. The result is an installation, not yet proof of sufficient input or power. Next inspect its interfaces. Reuse saved the transcription of a decision without necessarily solving whether the decision fits this location. [P2][F17]

**5 — Recover a power-dependent fuel chain.** You want to restore a stalled factory whose electrically supplied fuel flow has become inadequate. Trace fuel stock, delivery and generation separately; restore an operating source before reconnecting the whole load. This is a reasoning example based on the energy and transport dependencies, not a claim of a scripted event. The next choice is redundancy or demand management. A chest of fuel elsewhere is not the same as fuel reaching the boiler. [F12][F17]

**6 — Stop treating freshness as quantity.** You want agricultural products to reach their consumer while useful. A large buffer ages in place, eventually replacing desired items with spoilage. Shorten residence time and provide a route for the unwanted output; where appropriate, convert spoilage into nutrients to restart biological work. The outcome depends on sustained circulation rather than initial stock. Spoilage can itself be an input, but that does not make all expired products equivalent to fresh ones. [F29][F31]

**7 — Defend the transport that supplies its own defense.** You want a platform to make a longer journey. Establish asteroid collection, processing, ammunition delivery and turret coverage before relying on thrust. A shortage in that chain can turn incoming material into destruction rather than useful supply. The next iteration can change the factory's layout or mission. This is an engineered contingency, not an encounter solved by a single nominal ship-level statistic. [F25][F16]

**8 — Optimize the property that matters.** You want a compact installation with better output. Consider recipe-compatible productivity, speed, beacon coverage and quality separately. Upgraded products require appropriate ingredients and chance-based production; speed can conflict with a quality objective. The useful next question is whether the constraint is material, energy, footprint or randomness. More expensive components do not automatically improve the chosen objective. [F18][F19][F22]

## 8. Cooperation, extensibility and social meaning

Co-op lets participants divide a shared project into exploration, power, rail, defense or production. That is genuine complementary work without requiring character classes. It also creates negotiation: replacing another player's deliberately simple line with an opaque optimized blueprint may improve a metric while reducing their understanding or ownership. This is an interpretation of the shared construction contract, not a claim that the game measures trust or assigns social jobs. [F2]

The mod portal, Lua modding and map editor support small conveniences and large overhauls. **Space Exploration is a mod, not another name for the official Space Age expansion.** Platform/version compatibility must be checked separately; a PC mod list cannot be assumed usable on the Switch editions. Sharing a blueprint, publishing a mod, playing on a server and uploading a Galaxy of Fame snapshot are different participation routes. The latter supports modded saves and initially accepted editor/command use, so it should not be mistaken for an audited leaderboard. [F2][F26]

The game creates stories principally through authored rules and player history: the first successful train, an inadequately defended outpost, a teammate's baffling wiring, or a recovery from a cascading shortage. Fulgora's ruins and the crash premise provide setting, but ordinary play does not depend on a large authored quest cast. **Interpretation:** the factory can become autobiographical because its layout records the builder's changing understanding.

## 9. Presentation, usability, accessibility and production

Animated machinery makes work observable, while overlays, inventories, maps and graphs expose states that animation alone cannot. Brown industrial imagery can communicate function while making small placement mistakes hard to see. The Switch reviewers below report concrete targeting, text and pop-up friction; these are dated tested experiences, not current cross-platform performance verdicts. The free Switch 2 upgrade adds mouse-mode support, but that does not retroactively erase the older controls' difficulty. [R1][R3][R4][R5][F4]

Accessibility should distinguish reduced manual repetition from perceptual and cognitive access. HexTree's negative 2019 review identifies color differentiation as a barrier; its historical claim is not evidence of an unchanged 2026 feature set. Current community mods such as Color Blind Ultimate expose custom icons, overlays and wire/map colors. Their existence establishes a mod-based response, not comprehensive native accessibility or suitability for every visual impairment. No screen-reader or assistive-controller audit was performed. [S3][F32]

The base score is credited to **Daniel James Taylor**; Space Age's orchestral, planet-specific music is by **Petr Wajsar**. Wube's November 1, 2024 account explains that the released album selects and remixes material, including pieces cut from the game. An album listen would therefore not prove that every track appears during ordinary play. Factory sound, recurring motion and music contribute to a sustained working atmosphere; their exact effect on retention is not measured here. [F2][F16][F33]

Wube's press kit dates development to May 2012, crowdfunding to February 2013, its company formation to September 2014, Steam release to February 2016 and 1.0 to August 2020. It identifies a custom C++ engine, Lua extension and Blender-based machine visuals. The press kit is not uniformly updated: its early “development ended” wording is contradicted by later primary release posts. Its roughly thirty-person team description is an undated snapshot, not a verified current headcount. No total development budget or title-level profit was established. [F2]

The preserved 2017 belt-optimization account is a useful actual production example: represent transport-line gaps rather than changing every item's absolute position independently. It concerns 0.15-era work, not a universal present-day constant-time guarantee. Wube's 2021 rationale for a coherent expansion rather than many fragmented packs, and its caution about exposing unstable prototypes, also remains intact. In May 2026 Wube described 2.1 as polish, quality of life and modding rather than new planets or research chains, while anticipating continued maintenance after its last major update. [P2][F34]

## 10. Visibility, distribution and economics

The observable channels include a demo, the long-running Friday Facts blog, reusable construction content, an established mod community, press/creator keys and gameplay videos. Wube explicitly encourages previewers to spend enough time to understand the initial slow phase. Its press kit names a May 2014 trailer surge, but does not supply a causal acquisition model. **Growth hypothesis:** visible before/after improvements and shareable factories communicate competence, while the demo and unusually detailed development communication reduce uncertainty about a demanding niche game. Neither a viral clip nor a review score alone explains the outcome. [F2][P1]

Dated primary milestones are more useful than an unsupported current total. The earlier study preserves **more than 2.5 million base copies by February 5, 2021**. Wube reported **400,000 Space Age copies** and nearly **100,000 concurrent players** on October 25, 2024; on October 24, 2025 it reported that expansion sales had crossed **one million**, with over fifty thousand Galaxy of Fame entries. Expansion units, simultaneous players and exhibition entries are distinct measures. They are not unique all-time users, retained players or profit. [P2][F26][F35]

The current press kit lists the base game at **US$35**, while the Switch 2 expansion announcement lists Space Age at **US$35**. These are source-listed US prices, not a checkout test of tax, regional pricing or every storefront. The business is premium game/expansion sales, not an in-world paid currency governing production. The press kit's older 3.5-million base-sales figure lacks a capture date and is not promoted here as the latest lifetime total. [F2][F35]

## 11. Reception — five base reviews, an expansion review and Steam

The following substantive article bodies were read through their conclusions. The three Switch reviews concern their tested original hardware/version; they do not establish Switch 2 performance. Scores are deliberately not averaged.

**Rick Lane, PC Gamer, August 24, 2020.** Lane values the moment automation begins producing the tools for further automation and the way complexity accumulates in comprehensible layers. He finds direct combat less engaging and some small industrial components hard to distinguish. His enthusiasm is for the problem-solving system, not for every individual action being equally enjoyable. [R1]

**Erik-André Vik Mamen, Gamer.no, August 21, 2020.** Mamen describes repeatedly learning and restarting, with satisfaction in removing manual work. His demand for more advanced tutorial missions is specific: the initial instruction does not adequately explain later technologies and objectives. He explicitly had not launched a rocket, so his strong affection is not an endgame-completion assessment. The Norwegian article was read in its original text and paraphrased here in English. [R2]

**Trent Cannon, Nintendo Life, October 28, 2022.** Cannon praises cumulative production and cooperative scale while identifying precision, overlapping interface elements, loading and prelaunch connection problems. His account shows a distinction between a system worth learning and controls that make expressing an understood decision unnecessarily difficult. A historical multiplayer problem is not assumed to persist. [R3]

**Mick Fraser, God is a Geek, November 7, 2022.** Fraser values creativity and shared planning but finds aspects of Freeplay insufficiently directed. Small text, targeting and muted visual distinctions make the port harder to manipulate. His aimlessness contrasts with Mamen's enjoyment of repeated self-directed starts: freedom to set the next goal can be either a pleasure or an instructional gap. [R4]

**Aiden Crawford, Nintendo World Report, February 28, 2023.** Crawford emphasizes the satisfaction of production/research milestones, functional visuals and atmosphere. His reservations also concern joystick precision and interface occlusion. This is a separately credited written review, not additional evidence from a second PC configuration. Similar complaints across these selected articles are a qualitative pattern, not a measured population rate. [R5]

**Additional expansion evidence: Rick Lane, PC Gamer, October 24, 2024.** Lane praises planets that demand different reasoning and the expanded scope of production, but reports poorly explained platform interaction and severe consequences for inadequate preparation. This is a separate Space Age article by an already counted author, not a sixth independent writer. The dossier uses official documentation for names and mechanics where review shorthand is imprecise. [R6]

**Steam helpful-positive sampling.** The English **Most Helpful (All Time)** base-game page was read. Mayreau's April 12, 2017 account stresses space for expansion, iron supply and infrastructure; tweenk.pl's July 31, 2020 review values automation removing repetitive manual work. Jack Bright's April 13, 2016 comic co-op account highlights entangled repairs and reluctant redesign. Its exaggerated fictional epilogue is not mechanics evidence. The ranking strongly favors memorable older accounts; it is not representative of a newly arriving 2026 player. The default helpful-week page was also inspected: Adama's September 18 entry values ongoing active decisions rather than idle waiting. [S1][S2]

**Steam negative sampling.** The negative-list and JSON routes failed, so two individually accessible, helpful-rated negative reviews were located through search rather than falsely described as the top two in the negative ranking. **HexTree**, October 30, 2019, updated May 28, 2020, objects to color differentiation despite seeing promise in the game; 65 helpful votes were displayed. **Sliverious**, a March 6 entry whose display omits the year, praises Space Age's technical quality but regards its planets as inconvenient outposts and platform construction as frustrating enough to import a design; ten helpful votes were displayed. The latter is expansion feedback, not a base-game verdict. DLC zero-hours display is not evidence that the author never played the expansion. [S3][S4]

**Interpretation:** the main tension is not automation versus no automation. It is which decisions remain interesting after repetition is removed. One person welcomes a new planetary constraint; another sees an obstacle to the factory they already wanted to make. A helpful assistant or blueprint can remove transcription, but can also remove the act of understanding that the player values.

## 12. Transfer hypotheses and limits

**Expose causes, not only scores.** The strongest reference is an inspectable relationship among stock, flow, capacity, dependencies and control. An invention that fails should reveal which supported requirement is unmet. That principle can apply to a small workshop without simulating planetary industry.

**Separate design authorship from repetitive execution.** Blueprint and construction-robot distinctions show how an expressed decision can be executed more conveniently without deciding its purpose. A proposed OpenLegend experiment could let a player inspect and revise a bounded construction plan; it need not automatically optimize every tradeoff for them.

**Let places invalidate selected assumptions.** Fulgora, Gleba and Aquilo are useful because familiar operations remain recognizable while a constraint changes. A new setting need not introduce an entirely unrelated skill tree. Conversely, changing every assumption simultaneously can make earned competence feel irrelevant.

**Do not universalize one motivation.** Factorio's comparatively thin authored social world is compatible with its central promise. It is not evidence that companions, psychological needs or interpersonal drama are unimportant in a game pursuing a different promise. A throughput optimizer is not automatically a good world inhabitant.

**Do not promise unlimited simulation.** The historical optimization study and current port work show that rich-looking behavior depends on representation, testing and constraints. This research does not measure how many machines another engine could support, approve a particular architecture, or turn Factorio's rules into OpenLegend requirements.

## 13. Coverage, evidence and preservation

R01 is addressed in §1; R02–R03 in §§2–6; R04 in §§4–6 and §10; R05 in §7; R06 in §8; R07 in §9; R08 in §§5–6 and §8; R09 in §9; R10–R11 in §10; R12 in §11; R13 in §12; R14 here and below. Native absences, historical port evidence, experimental documentation, qualitative selection and untested accessibility are explicitly bounded.

Both earlier owners were read completely and remain **unchanged**. They retain the electronic-circuit, oil-output, conditional cracking, pulse/hold, blueprint, pollution/evolution and historical belt-optimization passages, plus the separate Satisfactory examples, reviewer annotations and both trailer routes. The [Factorio 2020 trailer](https://www.youtube.com/watch?v=J8SBp4SyvLc) remains a viewing route, not footage watched for this pass. There are no invented timestamps. Preservation of these relevant files is not completion of the separate seven-file packet-wide P01 gate.

### Annotated source register

All new retrievals September 26, 2026. Wiki pages are maintained documentation, not a fresh runtime audit; some search retrievals supplied the relevant article text when direct opening failed. Promotional claims, measured milestones, critic experiences and this dossier's interpretations are kept separate.

- **F1:** Official wiki front page; explicit stable/experimental versions and documentation baseline.
- **F2:** Wube press kit; product, production and distribution facts. Mixed-age page; undated team/sales claims are not current certifications.
- **F3–F5:** Primary release posts: 2.1 experimental, actual Switch 2 delivery, ARM64 Linux. No generalized performance extrapolation.
- **F6–F10:** Quick-start, resource, science, tutorial and scenario documentation. Older quick-start menu/mission names are excluded; search-retrieved text was available.
- **F11–F15:** Transport, energy and railway rules. No universal planet-independent production ratios.
- **F16:** Official Space Age content; overview and composer, not independent reception.
- **F17–F25:** Logistics, modules, beacon, equipment, enemies, quality, map settings, death and platforms. Player/Module body excerpts were search-retrieved after direct fetch errors.
- **F26–F31:** Primary launch statistics and planet/spoilage documentation, with resource and environmental distinctions.
- **F32:** Color Blind Ultimate's own published project description; mod-based features, not native coverage or medical efficacy.
- **F33–F35:** Developer soundtrack, 2.1 strategy and anniversary/port accounts; creator assessments and dated reported sales.
- **R1–R5:** Five independently credited substantive base-game reviews, authors/dates/platforms specified in §11; full bodies read.
- **R6:** Additional Space Age review by Lane; not a sixth independent author.
- **S1–S4:** Actual Steam review bodies. Positive helpful-all-time/week routes read; negative bodies individually found, their global helpful ranking not established.
- **P1–P2:** Existing research owners preserved, including their older dates and access/viewing qualifications.

[F1]: https://wiki.factorio.com/Main_Page
[F2]: https://www.factorio.com/support/press-kit
[F3]: https://factorio.com/blog/post/fff-444
[F4]: https://factorio.com/blog/post/factorio-switch-2-release
[F5]: https://www.factorio.com/blog/post/fff-446
[F6]: https://wiki.factorio.com/Quick_Start_Guide
[F7]: https://wiki.factorio.com/Iron_ore
[F8]: https://wiki.factorio.com/Science_pack
[F9]: https://wiki.factorio.com/Tutorial
[F10]: https://wiki.factorio.com/Wave_defense
[F11]: https://wiki.factorio.com/Belt_transport_system
[F12]: https://wiki.factorio.com/Power_production
[F13]: https://wiki.factorio.com/Railway
[F14]: https://wiki.factorio.com/Rail_signal
[F15]: https://wiki.factorio.com/Rail_chain_signal
[F16]: https://www.factorio.com/space-age/content
[F17]: https://wiki.factorio.com/Logistic_network
[F18]: https://wiki.factorio.com/Module
[F19]: https://wiki.factorio.com/Beacon
[F20]: https://wiki.factorio.com/Armor
[F21]: https://wiki.factorio.com/Enemies
[F22]: https://wiki.factorio.com/Quality
[F23]: https://wiki.factorio.com/Map_generator
[F24]: https://wiki.factorio.com/Player
[F25]: https://wiki.factorio.com/Space_platform
[F26]: https://www.factorio.com/blog/post/fff-434
[F27]: https://wiki.factorio.com/Vulcanus
[F28]: https://wiki.factorio.com/Fulgora
[F29]: https://wiki.factorio.com/Gleba
[F30]: https://wiki.factorio.com/Aquilo
[F31]: https://wiki.factorio.com/Spoilage
[F32]: https://github.com/Rycieos/factorio-colorblind-ultimate
[F33]: https://www.factorio.com/blog/post/fff-435
[F34]: https://factorio.com/blog/post/fff-440
[F35]: https://www.factorio.com/blog/post/fff-439
[R1]: https://www.pcgamer.com/factorio-review/
[R2]: https://www.gamer.no/artikler/et-spill-jeg-aldri-gar-lei-av/497604
[R3]: https://www.nintendolife.com/reviews/switch-eshop/factorio
[R4]: https://godisageek.com/reviews/factorio-switch-review/
[R5]: https://www.nintendoworldreport.com/review/63017/factorio-switch-review
[R6]: https://www.pcgamer.com/games/sim/factorio-space-age-review/
[S1]: https://steamcommunity.com/app/427520/reviews/?browsefilter=toprated
[S2]: https://steamcommunity.com/app/427520/reviews/
[S3]: https://steamcommunity.com/id/hextree/recommended/427520/
[S4]: https://steamcommunity.com/profiles/76561198022475318/recommended/645390
[P1]: ../games/factorio-and-satisfactory.md
[P2]: ../mechanics/factorio-satisfactory-flows-blueprints-and-place.md

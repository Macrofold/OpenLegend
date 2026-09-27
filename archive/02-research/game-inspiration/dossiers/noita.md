# Noita — learning to control a dangerous composition

**G32 · Full research pass · September 26, 2026.** Windows base game with delivered Epilogue 2 systems; launch criticism, later patches, community documentation and mods are distinguished. No gameplay, benchmark, source-code inspection or footage playback was conducted. Sections 5–7 contain substantial world/ending spoilers.

[Earlier chapter](../games/noita.md) · [Preserved mechanics study](../mechanics/noita-wands-materials-and-experimentation.md) · [Roster](../research-roster.md) · [Progress](../research-progress.md)

## 1. Identity and the actual activity

Noita is Nolla Games' single-player, two-dimensional action roguelite: a witch enters a material world, finds and assembles magical tools, explores and repeatedly risks a permanent death. The Finnish title means witch. The official pitch emphasizes burning, melting, freezing, evaporation and procedural generation, not dialogue choices or a predetermined sequence of spell upgrades. Its custom Falling Everything Engine connects falling-sand-like matter with other physical objects. This is simplified game simulation, not a claim that the world's chemistry reproduces nature. [P0]

Early Access began September 24, 2019; version 1.0 arrived October 15, 2020. The 2020 press kit still contains prelaunch phrasing, so its production history must not be mistaken for present release status. [P1]

**Epilogue 2 shipped April 8, 2024**, adding spells, creatures, bosses, a small biome, secret content and quality-of-life changes. Its developer notes explicitly require a new run, offering the `update_20240214` Steam branch to finish older saves. The official announcement list retrieved for this pass most recently displayed **January 25, 2025**, a modding tag-limit change; it also records August/April 2024 fixes. No later major release was verified. This is an observed announcement boundary, not a promise that development has permanently stopped. [P3]

An ordinary attempt alternates between dangerous exploration and a Holy Mountain's chance to heal, replenish limited spells, spend gold, choose a perk and rebuild wands. The early question is whether to collect another resource or reach safety. The later question can become whether to abandon the apparent downward route altogether. Knowledge is more durable than the current character, but the game also has specific persistent unlocks; calling it literally devoid of any cross-run progression would be inaccurate. [M-CONTROL] [M-ORB]

## 2. Actions, exposure and the material vocabulary

### The body is not a cursor outside the experiment

Movement, aiming, limited levitation, kicking, throwing, collecting, spraying, drinking, eating and casting are separate verbs. Inventory management and interaction have their own controls; a potion's use is not identical to throwing its container. Levitation makes vertical space traversable without eliminating the need for places to land. Strong Levitation increases the meter's capacity but also the time needed to refill it fully: reach, endurance and recovery rate are distinct. [M-CONTROL] [M-LEV]

Health, levitation, wand mana and limited spell charges are different resources. A room can be reachable but unsafe to remain in, while a powerful wand can run dry before it kills everything. Eating and drinking participate in status and material systems rather than a farming-and-meal production loop. There is no ordinary character-creation class tree, town-building progression or party-management interface: the current loadout and discoveries do most of the character-building work. [M-CONTROL] [M-STATUS] [M-WAND]

### Staining, ingestion and transformation

A liquid can act as terrain, container contents, a reagent and something coating a creature. Wetness protects against ignition but changes electrical risk; blood can also suppress fire and improve critical chance. Alcohol can make aiming less reliable and create another fire vulnerability. These are not cosmetic particle effects pasted over unrelated status icons. [M-STATUS]

**Ambrosia demonstrates why the route of application matters.** Its stain protects against health damage; drinking it causes food poisoning rather than invulnerability. Movement and other liquids can remove the stain, and protection against damage is not protection against every non-damaging hostile effect. An incidental review description of drinking it to become immortal is therefore not adopted as a rule. [M-AMBROSIA]

Polymorph effects change the creature being controlled rather than simply recoloring its health bar. The associated vulnerability remains consequential even in an otherwise powerful run: Extra Life does not rescue a death while polymorphed. Damage immunity, resistance to transformation and revival are separate protections. [M-LIFE] [M-STATUS]

### A flask is a reusable container, not a single consumable icon

Potions contain materials, including ordinary liquids. They can be sprayed, consumed, thrown, gently dropped or refilled; a displayed arc helps predict a throw, but a seemingly safe drop can still roll or break. Mixing compatible contents can trigger reactions inside the bottle: water and toxic sludge eventually leave water. An empty bottle can thus be more useful than a mediocre liquid occupying it. [M-POTION]

The four item slots compete among bottles, stones, tablets and other tools. That is a different limitation from the four wand slots. A Thunderstone supplies a persistent electrical source whose interaction with water, metal and nearby explosives changes where it is safe to carry or deploy. Emerald Tablets are lore-bearing objects and physical projectiles; they can produce valuable indirect kills, but some enemies defeat that tactic. The identity of an object does not exhaust its uses. [M-ITEM] [P2] [M-TABLET]

### Alchemy, ordinary and exceptional

Material mixing can occur in the environment as well as containers. Some useful reactions are discoverable through familiar expectations, such as fire control; other recipes are deliberately obscure. Lively Concoction supplies healing, while Alchemic Precursor can become Draught of Midas when combined with meat, converting contacted matter into gold. The three initial ingredients for each of those special precursor mixtures vary by seed. A successful recipe from one run is not a guaranteed universal crafting recipe. [M-ALCHEMY]

**Fungal Reality Shift** goes further than making a potion. Accumulating the required Tripping duration can replace a material with another for the current run, potentially removing a hazard or turning an ordinary resource into one. It cannot simply be undone through an ordinary cancel command. Its cooldown, seed-dependent result and possible transformation chains make it an experiment with world-scale consequences rather than a reliable menu purchase. The exact advanced chain behavior belongs in its reference, not an invented general-purpose transmutation law. [M-SHIFT]

## 3. Wands: components, delivery and operating constraints

### Chassis and sequence

A wand is a platform with **shuffle behavior, spells per cast, cast delay, recharge time, maximum mana, mana regeneration, capacity and spread**. Starting combat and utility wands can have quite different strengths. A small reservoir with fast replenishment can sustain useful repeated fire; a large reservoir with slow replenishment may instead suit occasional expensive casts. Mana replenishes when the wand is not held, so switching tools can be an actual resource strategy. [M-WAND]

On a non-shuffle wand, the sequence is read in order; a shuffle wand randomizes that order. Modifiers, multicasts and payloads make the sequence richer than one slot equaling one trigger pull. Double/Triple Spell group projectiles. A trigger delivers a following payload when its carrier hits; a timer delays release until its condition is met. **Delivery and effect are different choices.** An explosive payload delivered at a distance can become a point-blank disaster when a shuffle changes the arrangement. [M-GUIDE]

### Named components and their different jobs

| Component or family | What it changes; consequential limitation |
| --- | --- |
| Spark Bolt with Trigger / timer variants | Moves another spell's origin away from the caster; the payload still has resource and collateral consequences. [M-GUIDE] |
| Chainsaw | A short-range slicing/digging spell that also resets cast delay at its position in a cast. Later spells can add delay again; it does not automatically erase recharge or mana costs. [M-CHAIN] |
| Add Mana | Reduces the effective mana burden of a composition while bringing timing costs that must be managed. A strong resource operator is not necessarily a strong attack. [M-RAPID] |
| Luminous Drill | A short beam that damages and digs, with timing reductions. Its initially short reach and sustained mana demand differ from a ranged projectile; modifiers can extend it, and careless digging can destroy wanted gold. [M-DRILL] |
| Black Hole | A limited-use terrain-clearing projectile with gravitational side effects. The ordinary version does not directly damage creatures, but can pull dangerous objects/projectiles toward a route. Unlimited Spells does not remove its usage limit. [M-BLACK] |
| Healing Bolt | Restores health when it hits; delivering it back to the caster is its own problem. Some damage-adding modifiers/perks can make the supposed healing tool harmful. [M-HEALBOLT] |
| Circle of Vigour | Creates a regenerative area with limited charges. Staying in the useful area matters; Unlimited Spells does not turn it into an unlimited free heal. [M-VIGOUR] |
| Teleportation, light, material and field spells | Change access, visibility or local conditions, not only damage. A utility configuration can be worth a wand slot even when it is a poor weapon. [M-CONTROL] [M-BLACK] [M-STATUS] |

Chainsaw's timing effect is especially instructive because its name does not disclose its most important compositional property. It sets delay to zero **within the relevant cast**, not all future casts; a trigger's internal payload does not automatically reset the carrier's delay. This pass read a much fuller indexed Chainsaw reference than the earlier granular study could access. That supplements the older access limitation without rewriting what that researcher had actually inspected. [M-CHAIN]

Rapid-fire design requires handling multiple bottlenecks. Reducing delay while ignoring recharge produces a burst followed by a pause; solving both without enough mana produces another failure. Later Greek-letter spells and Wand Refresh interactions add copying and charge-management possibilities. Their detailed conditions make them advanced composition tools, not evidence that every limited spell becomes unlimited from any modifier labeled powerful. [M-RAPID] [M-GREEK]

### Choosing a build also means choosing its hazards

Perks alter the character's relationship with tools and space. Holy Mountains normally offer a choice, and taking one removes alternatives; gold-paid rerolls become more expensive. The choice competes with shopping, so hunting for an ideal perk can cost access to a useful spell. [M-PERKS]

Glass Cannon greatly increases spell damage and blast size while imposing a severe maximum-health restriction. Explosion Immunity is not immunity to every piece of falling debris, liquid or follow-on environmental hazard. Invisibility supports avoidance but staining, attacking and damage can interrupt it; enemies may continue attacking a last known location. Extra Life is a one-off recovery rather than a save-anywhere system. These alter plans, not merely end-of-run score multipliers. [M-GLASS] [M-INVIS] [M-LIFE]

Exploding Gold is an unusually clear collateral-damage example. Its own explosions do not normally hurt the player, but they can trigger dangerous props. A benefit can be locally safe yet unsafe through another system. The claim that a perk cannot directly damage its owner is therefore not equivalent to a general safety guarantee. [M-EXGOLD]

## 4. Economy, recovery and the rhythm of risk

Gold is both a material and a wallet currency. It can exist in terrain or enemy-dropped nuggets, sink beneath other matter, melt, or become inaccessible without digging. Reaching it can be more expensive than its shop value. Indirect or trick kills can produce more nuggets, rewarding physical and environmental solutions rather than only direct projectile damage. [M-GOLD] [M-TRICK]

A Holy Mountain is a temporary workshop and resupply point, not an automatically safe persistent home. Its exit collapse removes normal wand editing there. Bypassing the collapse trigger can preserve that access, while damaging protected surroundings can anger the gods and introduce Stevari; escalation can bring Skoude. Knowing how the room behaves changes its strategic value. The whole mechanic should not be reduced to buying damage upgrades between levels. [M-HOLY]

Ordinary healing is limited enough that damage shapes route selection. A health pickup, healing spell and friendly healing behavior are not interchangeable. For example, positioning between Hiisi healers can intercept their healing shots, but requires a suitable situation and surviving other threats. More maximum health is not the same as immediately recovering every lost point. [M-HEALING]

Death normally ends the character/run rather than offering a corpse-retrieval expedition. Records, learned interactions and unlocks survive, not a guaranteed larger next starting health bar. Orbs can permanently make particular spells available in later runs; familiar orbs instead grant health pickups. A save-and-continue session should not be confused with manually restoring a backup after death. Duncan's use of the latter in Early Access is disclosed in the reception section. [M-ORB] [R2]

**Interpretation:** this produces three different learning costs. A player may not understand a rule, may understand it but lack its components, or may possess both yet lose the run through execution. Treating all three as insufficient skill conceals where frustration actually comes from. A persistent-world design borrowing composition should decide separately which kinds of progress survive an experiment.

## 5. World structure, enemies and authored mystery

The ordinary descent passes through **Mines, Coal Pits, Snowy Depths, Hiisi Base, Underground Jungle, the Vault, Temple of the Art and the Laboratory**. Side regions and the surface create alternative destinations, including the Fungal Caverns, Dragoncave, Pyramid, Lake, Cloudscape, Ancient Laboratory and Meat Realm. Procedural local layout coexists with recognizable world geography; procedural does not mean every place is in an unrelated random position every run. [M-BIOMES]

Terrain is part of encounter design: open air allows different movement than a metal corridor, while destruction can connect spaces that initially appear separate. Digging can uncover a reward, shorten a route or remove protection. It can also expose materials and enemies the player was safer not meeting yet. This is neither a conventional sequence of sealed combat rooms nor an unlimited creative-building mode. [M-BIOMES] [M-DRILL] [M-BLACK]

Creatures have hostility relationships and can fight one another. Humanoid enemies may pick up dropped wands; kicking can disarm them. That gives discarded equipment consequences beyond the player's inventory. Charm, ghost-like helpers and healing creatures support unusual cooperation without creating a dialogue companion system, settlement economy or romance narrative. A faction relation in combat is not evidence of simulated diplomacy or political institutions. [M-CREATURES] [M-HEALING]

The narrative is largely environmental and cryptic: tablets, symbols, hidden rooms and the pursuit of the Work rather than extensive conventional quest conversations. An Orb of True Knowledge is simultaneously lore-bearing discovery, progression reward and a change to the final challenge, since collecting orbs strengthens Kolmisilmä. More exploration is not unconditionally easier progression. [M-ORB]

**Ending spoilers:** the Sampo, a gear-like object at the Laboratory, triggers the central confrontation when acquired. Where it is taken and how many orbs have been collected can lead to different endings or New Game Plus. The ordinary ending transforms the world into gold; other paths substantially qualify what completion means. New Game Plus regenerates the world with changed conditions, while some material transformations persist. These are specific rule-governed alternatives, not an AI-generated ending for any written wish. [M-SAMPO] [M-NGPLUS]

**Deep exploration spoilers:** reaching parallel worlds requires overcoming extremely dense and cursed barriers, not selecting a server from a menu. Transport, digging, healing and protection become a combined expedition capability. The Sun Quest makes the long game stranger still: create and position dangerous celestial objects through a chain involving a seed, transformations, sacrifices and elemental stones. Its crown and changed moons can persist across runs. This demonstrates that ordinary permadeath coexists with selected world flags, not that every previous terrain edit survives. [M-PARALLEL] [M-SUN]

## 6. Modes, community and extension boundaries

New Game generates an ordinary fresh attempt. Daily Run gives players a shared daily seed with a limited attempt; Daily Practice starts with randomized equipment/location and permits retries within that day's seed. Nightmare is unlocked through completion and changes the challenge. New Game Plus is reached through play rather than just being a synonym for selecting Nightmare. [M-MODES] [M-NGPLUS]

Steam lists single-player, Workshop, Cloud and achievements. Community mods can alter starting health, spell content and the look or behavior of the experience. They are not silently included in the vanilla mechanics above. Modes and mods can also affect achievement eligibility: the community achievement reference notes that even the official daily/Nightmare implementations and Twitch integration are classified as mods for that purpose. A platform achievement percentage therefore is not a clean estimate of how many buyers are capable of reaching a region. [STORE] [M-ACHIEVE]

The official Twitch integration lets viewers periodically vote among offered events, potentially changing health, creature behavior or other conditions. This makes an audience a participant without turning the native game into a cooperative campaign. Viewer votes, modded multiplayer projects and ordinary single-player are three different experiences; this pass does not certify any third-party networking mod. [M-TWITCH]

The community also distributes knowledge: seeds, wand arrangements, annotated maps, alchemy tools and demonstrations. Puli's helpful Steam review eventually qualified its original advice to discover everything unaided. Expert exchange can become part of the pleasure, but a player who wants self-contained discovery may see the same ecosystem as explanation missing from the product. [S1] [S2]

## 7. Eight worked situations

Cases are constructed illustrations of documented rules unless explicitly attributed. They are not represented as sessions played for this research.

### A. A water bottle is emergency infrastructure

**Intention:** stop burning and continue an expedition. **Conditions:** a filled bottle, a stain-producing fire and enough space to act. **Action:** spray water rather than drink or smash the container. **Interaction:** wetness suppresses ignition, while the bottle remains useful for refilling. **Result/next decision:** find a safe refill or preserve the remainder for another hazard. Water is not universal safety: standing in a conducting environment changes the electrical risk. [M-POTION] [M-STATUS]

### B. Returning projectiles return the danger too

**Attributed incident:** Barbosa reports combining a boomerang perk, bombs and rapid fire, expecting a useful spread. The bombs instead turned back and killed him. The interesting consequence is not just loss: the configuration exposes the relationship between trajectory, timing and self-damage. His criticism is that the game makes the learning process difficult to interpret. This is a reviewer's particular failure, not a claim that every boomerang configuration is unusable. [R5]

### C. The strongest beam can destroy the reward

**Preserved attributed account:** the earlier mechanics study records a player using a trigger-delivered plasma cutter with a spiral arc to kill the temple guardian, while destroying the wanted gold. The intent succeeds, the acquisition goal fails, and the next experiment concerns containment rather than damage. That study retains the original Reddit source and uncertainty; the current pass did not independently reproduce or newly reread the whole thread. [Earlier mechanics study](../mechanics/noita-wands-materials-and-experimentation.md#2-delivery-is-an-invention-dimension)

### D. A delay fix exposes another bottleneck

**Intention:** turn a slow tool into sustained fire. **Conditions:** a suitable wand, grouped projectile and Chainsaw, adequate editable space. **Action:** arrange Chainsaw after delay-adding components in the relevant cast. **Interaction:** cast delay falls, but recharge and mana can remain limiting. **Result/next decision:** adjust the chassis, recharge reductions or mana supply rather than assuming the experiment failed randomly. Placing it inside a triggered payload is not equivalent to resetting the carrier's delay. [M-CHAIN] [M-RAPID]

### E. Healing requires delivery, not just ownership

**Intention:** recover without reaching the next Holy Mountain. **Conditions:** Healing Bolt and a safe way to intercept it. **Action:** redirect the bolt with an appropriate spell or use liquid to slow it and move into its path. **Interaction:** the projectile must contact the player; some damage-adding modifiers can outweigh its healing. **Result/next decision:** retain a deliberately safe healing wand or continue toward another recovery source. A universally applied damage upgrade can be the wrong upgrade. [M-HEALBOLT]

### F. The empty room has a contract

**Intention:** revisit a workshop after scouting. **Conditions:** an uncollapsed Holy Mountain and a route-changing spell. **Action:** avoid the normal collapse trigger without carelessly cutting through protected walls. **Interaction:** editing access and divine retaliation use different conditions. **Result/next decision:** keep a return route or accept the permanent loss of that editing location. The room's special rule creates a meaningful spatial problem; it is not equivalent to generic destructible terrain. [M-HOLY]

### G. The harmless explosion finds a second hazard

**Intention:** collect gold after a fight. **Conditions:** Exploding Gold and an explosive prop nearby. **Action:** touch a nugget. **Interaction:** the perk's directly harmless-to-player burst can activate another dangerous object. **Result/next decision:** clear the prop first, collect from another angle or abandon the reward. The useful lesson is to inspect the chain of effects rather than treating an immunity statement as universal. [M-EXGOLD]

### H. Knowledge changes what completion asks of you

**Intention:** collect an orb for its reward before finishing. **Conditions:** an accessible orb and a living final boss. **Action:** acquire it and later continue downward. **Interaction:** the discovery unlocks or grants something useful while making Kolmisilmä stronger. **Result/next decision:** choose between a direct finish, further exploration or a different Sampo route. A collectible is not always a free upgrade, and the same object can serve progression, narrative and difficulty. [M-ORB] [M-SAMPO]

## 8. Presentation, interfaces and accessibility

The pixel art needs to communicate substances, projectiles, creature silhouettes and the source of danger, not merely look nostalgic. Lighting, stains, liquid motion, explosions and the sudden absence of a wall supply evidence about what happened. Dense simultaneous effects can also obscure that evidence; mystery about the world's secrets and uncertainty about what just killed the character are different experiences. [R3] [R4; interpretation]

Niilo Takalainen's sound design and his soundtrack collaboration with From Grotto are credited by the developer. The contrast between a Holy Mountain's respite and a dangerous region helps separate deliberation from action. Duncan specifically values monster sounds as warning beyond visible fog; Suskie finds the spaces much less compelling. Neither opinion establishes universal sensory accessibility. [P1] [R2] [R3]

Tooltips, resource bars, the inventory spell arrangement, potion capacity and material identification make some state inspectable. Epilogue 2 added potion-content percentages, allowed spells to be dropped outside editing areas and adjusted camera/audio behavior during fast movement. Those are meaningful changes to handling and feedback, so a 2020 inventory complaint cannot automatically certify unchanged 2026 behavior. [P3]

The same UI exposes a learning problem: a visible spell list is not necessarily an explanation of evaluation order, grouping or a hidden timing effect. A player can read every number and still misunderstand the composition. The research question is whether a preview, trace or safer test environment could teach that relationship without removing authorship. This is an interpretation, not a proposed committed feature.

Suskie's launch-era accessibility notes report remappable keyboard/mouse controls and limited other options. They are not a current full accessibility audit. The store lists eleven interface languages; neither translation breadth nor a health mod guarantees readability, motor access or fair signaling for every player. [R3] [STORE]

## 9. Production, promotion and economics

Nolla's founders brought distinct independent-game histories: Petri Purho with Crayon Physics Deluxe, Olli Harjola with The Swapper and Arvi Teikari with Baba Is You. The press kit names Liero, falling-sand games and roguelikes among the inspirations. Collaborators include Antti Tiihonen, and the credits distinguish programming, visuals, audio, trailers and marketing rather than presenting the product as three programmers' work alone. [P1]

Purho's GDC 2019 session abstract discusses scaling falling-sand simulation to a continuous world and integrating destructible rigid bodies. The public abstract supports those topics, not an uninspected explanation of current chunking, threading or source architecture. A custom simulation can generate many related situations, but that is not proof that it is inexpensive or automatically well balanced. [P4; interpretation]

The developer's historical devlog provides unusually concrete promotion evidence: regular short clips/GIF posts, a reveal/Early Access trailer, wishlist requests and reviewer/streamer-key access. One post discusses a community-requested ability to kick individual particles; another describes Thunderstone setting off an explosive barrel through electricity. These communicate a recognizable cause-and-effect novelty before requiring the audience to understand every wand statistic. [P2]

The press kit also distributes ready-to-use GIFs, images and trailer downloads and identifies trailer/PR collaborators. The inference is that legible incidents can travel as compact demonstrations, while recipes and secrets support longer expert content. Those are plausible mechanisms, not measurements of which channel caused a sale. A visible list of awards/nominations is evidence of exposure, not proof of financial profitability. [P1; interpretation]

**Commercial snapshot, September 26, 2026:** the retrieved US-dollar Steam page lists an upfront **$19.99** game purchase and a separately sold **$9.99** soundtrack, plus bundles. It shows **47,554 English reviews, 95% positive**, and a recent thirty-day subset of **456, 91% positive**. These are review populations at retrieval, not all-language buyers, units sold, concurrent users, retention or revenue. No reliable first-party lifetime-unit, budget, revenue or profit disclosure was found in the consulted searches, so none is estimated by multiplying review counts or price. [STORE]

The Windows store requirements are not a benchmark or evidence that the game scales linearly with CPU cores. Likewise, free content updates and a robust mod community do not create an obligation for endless additional releases. The available historical/current evidence supports an upfront game with a long afterlife of play and learning, not a quantified service business model.

## 10. Five written reviews and Steam reception

All five independently authored substantive review bodies were read through their conclusions. They concern their reviewed builds, primarily 2020, not a fresh hands-on evaluation of Epilogue 2.

| Critic and edition | What is compelling | What limits it |
| --- | --- | --- |
| **Luke Winkie, PC Gamer, October 14, 2020** | Spectacular self-destructive spells, satisfying experimentation and the absurdity of player-caused disasters. | Uneven difficulty, opacity and sudden escalation. His account of a boomeranging saw killing him illustrates the attraction and frustration together. Incidental geography/alchemy wording is not adopted as rules authority. [R1] |
| **Andrew Duncan, GameGrin, 2020** | Destructibility, extensive exploration, varied material environments and audio warning. | Strong affection coexists with a higher-starting-health mod and Early Access save restoration. His roughly eighty-hour history and positive verdict do not establish satisfaction with unmodified punishment. [R2] |
| **Mike Suskie, GameCritics, November 18, 2020** | Material physics and environmental possibilities, including an attributed poison-to-oil mistake preserved in the earlier study. | Repetitive beginnings, opaque numerical explanations and combat/story engagement that did not sustain him; about thirteen hours without completion. His rejection is an experience report, not proof that no deeper world exists. [R3] |
| **Gabriele Malacasa, RPGamer, October 25, 2020; updated July 26, 2021** | Synergistic spells, secrets, reactive terrain and dynamic audiovisual atmosphere. | Interesting toys can feel too dependent on the draw; scarce recovery, obstructed movement and rapid escalation can make the promised freedom hard to reach. [R4] |
| **Alessandro Barbosa, GameSpot, October 20, 2020** | Inventive environmental solutions and a world extending beyond the apparent main route. | Minimal tutorialization and difficult early encounters interfere with discovering the depth. His returning-bomb incident above is his report, not a replayed test. He discloses over twenty hours and publisher-supplied code. [R5] |

### Direct player sample

Both accessed Steam surfaces were **English, Most Helpful (All Time)**; the second additionally selected **Negative Only**. Bodies were read, not merely ratings. This is purposive qualitative evidence, not a representative survey. Current playtime is not substituted for hours at publication. [S1] [S2]

**Puli, Recommended, February 8, 2021:** the displayed review includes a later five-year edit. It values freedom and learning how to use the game's systems, while revising earlier advice to avoid guides: deeper play often depends on shared knowledge. The edit is important chronology rather than a separate 2026 review. [S1]

**Not Recommended, December 31, 2022, obscured display name:** the writer respects the game's uniqueness but finds slow careful repetition and dependence on external knowledge frustrating. The page displays 65 hours, without establishing the hours at original publication. The writer's percentages about completion or doomed runs are rhetoric/personal estimates, not accepted population statistics. [S2]

**Synthesis:** the split is not a disagreement about whether many interactions exist. It concerns whether the game makes their discovery worth the cost. A spectacular death can be a shareable joke, a useful lesson or the loss of an evening; the player's goals and ability to understand its cause change which interpretation wins. Strong aggregate approval does not make the rejected experience imaginary.

## 11. Transferable patterns, dependencies and cautions

These are research interpretations, not accepted OpenLegend architecture or implementation tasks.

**Separate what an effect does from how it reaches the world.** Trigger delivery, fields, timing and trajectory can make a familiar payload newly useful. Copying only a long list of magical nouns misses the compositional depth. The dependency is clear targeting, timing, resource and collateral semantics.

**Treat capacity and throughput as different properties.** Mana storage, replenishment, cast delay and recharge support distinct tool identities. A system that reports those properties should also help the player see which one constrained an attempt; otherwise variety becomes notation debt.

**Make consequences cross boundaries consistently.** A gold pickup can initiate an explosion chain; a bottle can be storage and a reagent vessel; a discarded wand can become an enemy's weapon. The desirable feature is a reusable connection, not arbitrary punishment after an apparently safe action. Consistency does not require pixel simulation.

**Let failure produce a next experiment.** The preserved plasma/guardian/gold incident gives a precise new goal: reduce collateral damage. An unexplained instant death does not always provide that. Recovery policy should be chosen independently from effect richness; a persistent world may need tools, relationships or evidence to survive even when the experiment fails.

**Do not confuse secret content with absent explanation.** Hiding an alchemical objective can reward collective discovery. Hiding which component changed a wand's timing can prevent a player from meaningfully experimenting. Both can be intentionally obscure, but they serve different motivations and should be evaluated separately.

**Respect the cost of becoming an expert.** Daily Practice and mods reveal ways to change the acquisition/repetition burden. A strong expert community can support a product while also masking onboarding gaps. Knowledge-sharing should supplement player agency rather than be the sole way to understand routine actions.

## 12. Preservation, coverage and source access

### September 26 requirements-and-corrections audit

A fresh audit against the full mechanics inventory found no material version correction: the official announcement archive still ends with the **January 25, 2025** modding-tag-limit change, so the dossier's post-Epilogue-2 maintenance boundary remains appropriately cautious. [P3] The explicit category closure is:

- **Identity / classes / attributes / skills / leveling / trees:** no conventional character creator, class tree or XP-level ladder; run identity comes from health, perks, wands/spells, items, discoveries and selected persistent unlocks (§§1–4).
- **Items / inventory / weapons / armor / equipment / crafting / upgrading:** four wand slots and four item slots, potions/material containers, tablets/stones, wand chassis and spell composition are covered in §§2–3. There is no armor-set crafting/equipment ladder comparable to an RPG.
- **Magic / spells / powers:** wand construction, modifiers, triggers/timers, utility spells, healing and perks are the central compositional system (§3).
- **Traversal / environment / object interaction:** levitation, digging, teleportation, kicking/throwing, fluids, fire/electricity, alchemy, stains, fungal shifts and destructible terrain are covered across §§2–5.
- **Activities / minigames:** exploration, wand experimentation, alchemy, secrets, Daily Run/Practice, Nightmare and long-form quests constitute the activity set. There is no separate settlement/crafting minigame economy.
- **Combat / stealth / loot / rewards:** projectile/melee-like magical combat, environmental/trick kills, invisibility, gold/perks/spells and unlocks are covered in §§2–5. Invisibility is a bounded perk mechanic rather than a full social-stealth simulation.
- **Death / failure / recovery / economy / trading:** permadeath, limited healing, persistent knowledge/unlocks, gold, Holy Mountain shops and perk rerolls are covered in §4.
- **Story / relationships / romance / reputation / party / companions:** tablets, Sampo/Work, bosses and environmental mystery provide narrative (§5). Conventional dialogue relationships, romance, recruitable party members and reputation systems are absent.
- **NPC/AI schedules / factions:** creatures have hostility relationships, can fight each other and may use dropped wands, but there is no daily schedule, civic faction politics or settlement population simulation (§5).
- **World map / environment / quests / events:** recognizable biome/world geography coexists with procedural local generation; parallel worlds, Orbs, endings and Sun Quest provide authored secret objectives (§5).
- **Building / settlements / management:** absent as a native progression pillar; terrain can be destroyed/transformed but the game is not a persistent base-building/settlement manager.
- **Multiplayer / social / endgame / return loops:** vanilla is single-player; Workshop/Twitch integration and community knowledge sharing are separate social layers (§6). Endings, NG+, Nightmare, Daily modes, secrets and persistent unlock flags support return loops.

The audit therefore strengthens completeness without pretending the absence of a newer announcement proves development has permanently ended.


The prior chapter and granular study were read and left unchanged. Their trigger/plasma/gold testimony, Chainsaw and mana discussions, Suskie's incident, Duncan's disclosures, original references and videos retain their original owners. The expanded indexed mechanics evidence here does not retroactively change the earlier researcher's access claims.

**Viewing route:** begin with the [official 1.0 overview and Chainsaw tutorial in the earlier chapter](../games/noita.md), then read this dossier's safe introductory systems before the world/ending sections. Purho's GDC abstract is useful for the technical premise. No linked recording was watched in this pass, no precise scenes were newly observed, and no timestamps are invented.

| Requirement | Coverage |
| --- | --- |
| R01 | Section 1: identity, edition, delivered updates and explicit evidence boundary. |
| R02 | Sections 2–6: physical verbs, combat, material use, movement, modes and resource loops. |
| R03 | Sections 2–3: named objects, spells, perks, interactions and limitations. |
| R04 | Sections 4–5: money, recovery, death, unlocks and different endgame continuities. |
| R05 | Section 7: eight worked situations, with constructed/attributed status explicit. |
| R06 | Sections 5–6: hostility, helpers, missing conventional social systems, audience and mod boundaries. |
| R07 | Section 8: visual/audio information, UI, controls, accessibility and feel. |
| R08 | Section 5: named world structure, mystery, Sampo/Work and spoiler boundaries. |
| R09 | Sections 1 and 9: developer histories, production roles, technology and iteration. |
| R10 | Section 9: actual promotional artifacts and carefully qualified distribution hypotheses. |
| R11 | Section 9: dated purchase/review snapshot and explicitly unknown private economics. |
| R12 | Section 10: five full written reviews and positive/negative helpful Steam bodies. |
| R13 | Section 11: concrete design patterns and conditions under which they fail. |
| R14 | Adjacent references, source annotations below, preservation and viewing routes. |

### Source register

All accessed September 26, 2026 unless explicitly identified as preserved prior evidence. Community wiki pages often returned substantial indexed text while direct retrieval was unreliable; that indexed material was inspected, not assumed to be a complete current database. No archived video or proprietary code was inspected. References support bounded systems and examples rather than every possible interaction.

- **P0:** Nolla's official product explanation. Primary simulation promise and engine identity, not measured scientific fidelity.
- **P1:** Developer press kit. Historical dates, people, inspirations, credits and promotion assets; stale prelaunch sentences explicitly excluded from current-status inference.
- **P2:** Official 2019 devlog. Actual outreach/material posts; Tumblr app ratings are not game metrics.
- **P3:** Official Steam announcement list. Epilogue 2 and later dated bugfix notes; list observed through January 25, 2025, not an unsupported lifetime-support promise.
- **P4:** GDC 2019 public abstract. Technical subjects verified, full talk not watched.
- **STORE:** Current first-party Steam listing. Platform/features, US-dollar price and language-specific review populations at retrieval.
- **R1–R5:** Original written criticism, authors/editions and distinct judgments preserved in section 10.
- **S1–S2:** Actual Steam helpful-all-time review bodies; method and date/edit limitations in section 10.
- **M-*:** Named community mechanics pages. Spell/item/condition and progression references, with exact deep formulas left to the cited guides. A mod-prefixed or retired-content page was not silently treated as vanilla.

[P0]: https://noitagame.com/
[P1]: https://noitagame.com/press/index.html
[P2]: https://devlog.noitagame.com/
[P3]: https://steamcommunity.com/app/881100/announcements/
[P4]: https://www.gdcvault.com/play/1025695/Exploring-the-Tech-and-Design
[STORE]: https://store.steampowered.com/app/881100/Noita/
[R1]: https://www.pcgamer.com/noita-review/
[R2]: https://www.gamegrin.com/reviews/noita-review/
[R3]: https://gamecritics.com/mike-suskie/noita-review/
[R4]: https://rpgamer.com/review/noita-review/
[R5]: https://www.gamespot.com/reviews/noita-review/1900-6417589/
[S1]: https://steamcommunity.com/app/881100/reviews/?browsefilter=toprated
[S2]: https://steamcommunity.com/app/881100/negativereviews/?browsefilter=toprated
[M-CONTROL]: https://noita.wiki.gg/wiki/Controls
[M-LEV]: https://noita.wiki.gg/wiki/Strong_Levitation
[M-STATUS]: https://noita.wiki.gg/wiki/Stains
[M-AMBROSIA]: https://noita.wiki.gg/wiki/Magic_liquid_protection_all
[M-LIFE]: https://noita.wiki.gg/wiki/Extra_Life
[M-POTION]: https://noita.wiki.gg/wiki/Potion
[M-ITEM]: https://noita.wiki.gg/wiki/Items
[M-TABLET]: https://noita.fandom.com/wiki/Emerald_Tablet
[M-ALCHEMY]: https://noita.wiki.gg/wiki/Alchemy
[M-SHIFT]: https://noita.wiki.gg/wiki/Fungal_Shift
[M-WAND]: https://noita.wiki.gg/wiki/Wands
[M-GUIDE]: https://noita.wiki.gg/wiki/Guide%3A_Wand_Mechanics
[M-CHAIN]: https://noita.wiki.gg/wiki/Chainsaw
[M-RAPID]: https://noita.wiki.gg/wiki/Guide%3A_Rapid-Fire_Wands
[M-DRILL]: https://noita.wiki.gg/wiki/Luminous_Drill
[M-BLACK]: https://noita.wiki.gg/wiki/Black_Hole
[M-HEALBOLT]: https://noita.wiki.gg/wiki/Healing_Bolt
[M-VIGOUR]: https://noita.wiki.gg/wiki/Circle_of_Vigour
[M-GREEK]: https://noita.wiki.gg/wiki/Advanced_Guide%3A_Introduction_to_Greek_Letter_Spells
[M-PERKS]: https://noita.fandom.com/wiki/Perks
[M-GLASS]: https://noita.wiki.gg/wiki/Glass_Cannon
[M-INVIS]: https://noita.wiki.gg/wiki/Invisibility
[M-EXGOLD]: https://noita.wiki.gg/wiki/Exploding_gold
[M-GOLD]: https://noita.wiki.gg/wiki/Gold_nugget
[M-TRICK]: https://noita.wiki.gg/wiki/Trick_kill
[M-HOLY]: https://noita.wiki.gg/wiki/Holy_Mountain
[M-HEALING]: https://noita.wiki.gg/wiki/Healing
[M-ORB]: https://noita.wiki.gg/wiki/Orbs_of_True_Knowledge
[M-BIOMES]: https://noita.wiki.gg/wiki/Biome
[M-CREATURES]: https://noita.wiki.gg/wiki/Enemies
[M-SAMPO]: https://noita.wiki.gg/wiki/Sampo
[M-NGPLUS]: https://noita.wiki.gg/wiki/NG%2B
[M-PARALLEL]: https://noita.wiki.gg/wiki/Parallel_Worlds
[M-SUN]: https://noita.wiki.gg/wiki/Advanced_Guide%3A_Sun_Quest
[M-MODES]: https://noita.wiki.gg/wiki/Category%3AGame_Modes
[M-ACHIEVE]: https://noita.wiki.gg/wiki/Steam_and_GOG_Achievements
[M-TWITCH]: https://noita.wiki.gg/wiki/Twitch_Integration

# Project Zomboid — ordinary precautions become a life story

**G37 · Full research pass · September 26, 2026.** Build 42.20 Stable and its maintenance line are distinguished from September's 42.21 Unstable. Five substantial written critical accounts were read: two titled reviews, two editorial hands-on retrospectives and one long player review—not five scored professional reviews. Helpful positive and negative Steam bodies were read, with different sampling windows disclosed. No gameplay, code inspection or footage playback performed.

[Earlier chapter](../games/project-zomboid.md) · [Preserved shared mechanics study](../mechanics/valheim-zomboid-preparation-risk-and-home.md) · [Progress](../research-progress.md)

## 1. Identity, versions and the invitation

The Indie Stone's Project Zomboid is an isometric survival sandbox in fictionalized 1993 Kentucky. The player creates an ordinary survivor, scavenges, establishes shelter and tries to keep living. There is no conventional campaign victory that makes all subsequent survival unnecessary. The Steam Early Access date is November 8, 2013, distinct from the earlier public game. The current storefront still identifies the product as Early Access; a stable numbered build is not a 1.0 declaration. [P4] [P13] [G2]

On July 29, 2026, the developer released **Build 42.20 to Stable**, with older-save incompatibility and legacy branch choices explained. On September 23, it released **42.21 Unstable**, an opt-in follow-up addressing disappearing zombies, synchronization, duplication and visibility problems. The specific dated post supersedes the site's stale channel header; it does not demonstrate that the fixes are already in every stable installation. Its advice to back up saves is not evidence that a particular player's save has been tested. [P1] [P2]

Current presets include **Apocalypse, Outbreak, Rising and Extinction**, alongside custom sandbox configuration and named challenges. They change the intended rhythm rather than creating one universal difficulty. Build 42's animals, broader crafting, map revisions, controller remapping and mod-management work are delivered scope in the 42.20 overview. This is separate from **planned human NPCs** and the old Kate/Baldspot story ambitions listed on the product page. Animal behavior and human co-op do not prove a finished social-NPC simulation. [P3] [P4]

**Interpretation:** the initial promise is unusually easy to imagine: find useful things without making a mistake that ends your life. The expertise needed to enact it is much less simple. A good account must explain that gap rather than advertising either limitless realism or a generic zombie combat game.

## 2. Identity, learning and the survivor's changing body

### Creation and skills

Occupation and positive/negative traits establish capabilities and liabilities within a point budget. **Carpenter, Burglar, Electrician, Doctor, Nurse, Mechanic, Park Ranger and Rancher** suggest different initial competencies; they are not immutable combat classes. A starting advantage can support a social role without forbidding later learning. Traits affecting hearing, reading, movement or appetite change the routine of survival, not merely an avatar's biography. Exact point costs and balance values are version-sensitive and are not copied from older wiki tables as current constants. [G4]

Practice develops skills such as Carpentry, Mechanics, Electrical, Cooking, Tailoring, Aiming, Reloading, Foraging and Fishing. Strength and Fitness are bodily capacities rather than an unrestricted pool spent on arbitrary talents. Appropriate skill books accelerate learning from activity; reading one is not generally identical to receiving a completed skill level. Learning, possessing a recipe and having its tools are different prerequisites. [G3] [G10]

**Interpretation:** an initially knowledgeable survivor can be valuable before they are a superior fighter. Conversely, training can become routine labor when a player repeats a safe action only to cross a threshold. A long progression list does not establish a long list of interesting decisions.

### Condition is not one health bar

Hunger, thirst, endurance, tiredness, temperature, load, panic, stress, boredom and unhappiness describe different pressures. A survivor can be physically unwounded yet poorly prepared to fight. Restoring one condition does not automatically fix the rest: stopping to catch breath is not a full night's sleep, and eating does not remove every source of distress. The interface's moodles communicate these states, but their compact icons also impose a learning burden. [G5]

The health display distinguishes 17 body locations and injuries including scratches, lacerations, burns, fractures and deep wounds. Medical supplies, improvised bandages and attention to an injury can prevent one problem from escalating while the player is focused elsewhere. **Ordinary wound infection is not the same as Knox Infection**. Disinfecting a wound must not be described as curing the fictional zombie disease. The transmission and mortality settings matter; a default-survival claim is not universal to every custom server. [G1] [G2]

Clothing contributes coverage and protection alongside insulation, wetness and movement considerations. Holes and damaged coverage matter; a protective-looking outfit is not blanket immunity. Tailoring can improve or repair usable clothing, making a familiar garment part of a continuing equipment history. The clothing reference mixes versioned sections and a large catalog; only its relevant mechanics were read, not every item row. [G9]

## 3. Actions, equipment and practical risk

The activity vocabulary includes moving cautiously, looking, listening, searching containers, opening or breaking access points, climbing, carrying, pushing, striking, shooting, treating wounds, cooking, reading, crafting, maintaining vehicles and improving shelter. These verbs interact: opening a route can injure the survivor; using a weapon can broadcast their presence. The player's overhead camera does not give the character knowledge of every hidden room or approaching enemy. [P4] [R2]

**Melee and ranged combat are not interchangeable upgrades.** The available tools include blades, axes, blunt implements, spears and firearms, with condition, handling, skill and the surrounding crowd affecting usefulness. A gun can resolve an immediate threat while worsening the next encounter through noise. Retreat, a different route or avoiding attention may be better than winning the visible fight. The 42.20 overview also describes revised aiming and weapon-part behavior; launch-era control impressions are not current numerical weapon specifications. [G3] [P3]

Loot has use-value rather than only rarity. A water container, cooking vessel, screwdriver, bandage, skill book or spare vehicle component can unlock a practical plan. Carrying capacity and access compete: accumulating more useful objects does not mean they are all conveniently available when something goes wrong. Crafting requires a valid recipe, suitable materials and tools, and sometimes a workstation or other conditions; it is not unrestricted object invention. [G10]

### Vehicles: a bundle of dependencies

Vehicles offer movement, cargo space and passenger transport, but keys, fuel, battery, engine condition and individual components matter. A key may be found near its associated vehicle; hotwiring is an alternative supported by appropriate starting knowledge or learned skills. It is not a universal operation available to an untrained survivor. Loading and maintaining a vehicle are different projects from locating one. A car that starts can still be a poor choice for a difficult expedition. [G6]

**Interpretation:** this creates several meaningful forms of competence. Recognizing a usable car, restoring one, packing it sensibly and safely driving home are related but distinct accomplishments. A system that collapses all four into owning a vehicle would lose much of the practical story.

## 4. Shelter, production and a home that still needs the world

A house can be fortified and stocked without becoming permanently self-sufficient. Configurable utility failure changes the value of refrigerators, lights and water fixtures. A generator can supply electricity, but it needs fuel, condition management and a suitable setup; a fuel pump itself needs power. Building alarms do not simply cease to matter when the ordinary grid fails. This is a dependency chain, not several unrelated resource meters. [G7]

The generator reference documents different models and more than one route to operating knowledge. Its skill threshold is from an earlier 42.x snapshot, not a freshly tested universal 42.20 rule. That qualifies the older study's magazine-search frustration: the player's reported search was real testimony, but it does not establish that a magazine is the sole possible route in every build. Generators are heavy carried objects, with placement and operation distinct from keeping a small item in a backpack. [G8]

Water can be stored, collected or obtained from sources outside the initial house. Its uses include drinking, cooking, washing and growing food, with source quality and treatment relevant to safe consumption **within the game's rules**. Possessing a rain collector and maintaining a usable water supply are not synonymous. This section describes the simulation, not real-world medical or equipment advice. [G13]

### Farming, animals and manufacturing

Agriculture connects planting conditions, season, water and crop care to later food. More skill reveals information about a plant as well as improving the player's practical capabilities. A bed of crops is therefore a delayed commitment, not instant replacement for scavenged meals. The referenced page carries older-build warnings; precise growing times, optimal calendars and yields are not asserted as current constants. [G11]

Animal Care adds watering, petting, milking, shearing and egg collection. Greater expertise improves readable animal information and harvesting; stressed animals are not passive vending machines. The page's documented relationship between skill and interrupted handling is useful, but its incomplete 42.3.1 snapshot is not an exhaustive 42.20 animal-behavior specification. Care and butchering are different activities, with different purposes for keeping an animal alive. [G12]

The crafting expansion supports more of a material lifecycle. An item can contain parts whose condition matters; breaking it can create a different usable object or salvage rather than erasing all value. The 2023 **Zleigh Ride** post explains that design direction through weapon components and workstation-based production. It was a development proposal then; the current feature overview independently confirms the delivered broader part/crafting system, not necessarily every old proposed recipe unchanged. [P7] [P3]

Cooking, carpentry, metal work, pottery, tailoring and other trades provide different productive paths. Their interesting unit is **input → tool/workspace → knowledge → time → output → use**, not simply the number of profession labels. Recipe requirements can also become a source of friction when the interface does not make the missing condition apparent. [G10]

Fishing and foraging offer alternatives to repeated town looting. The developer's **Critterz** account describes fishing being designed around disturbances, attraction and clearer feedback, with dedicated sound work. It is a historical production account, not proof that every detail of its prototype became a permanent current rule. The important supported contrast is between passive collection and attending to a place while vulnerable. [P9]

There is no completed native human merchant economy, romance ladder, recruitable human party or functioning human-faction diplomacy system implied by these trades. In multiplayer, people can exchange goods and specialize; that is human cooperation under server rules, not evidence that autonomous survivors are negotiating markets. [P4]

## 5. World, narrative, failure and return

The setting's towns and infrastructure make needs geographically specific. **Muldraugh, Rosewood, Riverside, West Point and Louisville** are not interchangeable random rooms. Art director Ayrton Orio's July 2026 account describes the revised map, additional towns, over 1,400 new unique buildings and a mix of hundreds of basement layouts with individually authored ones. These counts describe created content, not a fully procedural civilization or an infinite authored map. [P6]

The outbreak has radio, television, documents, environmental traces and competing in-world explanations. Rumors about its origin are part of the fiction, not a confirmed scientific explanation or a claim about real events. The absence of a mandatory main quest does not make the setting narratively empty: a survivor encounters an interrupted everyday world and then makes a new history through practical choices. [G2] [R3]

Failure can be immediate or delayed. Winning a fight does not cancel bleeding, and a well-stocked base does not reverse an infected character's fate under the chosen rules. The invitation to begin another life is different from promising resurrection with every skill and possession intact. This dossier does not infer exact cross-character save persistence from an inaccessible death-reference page. Permanent stakes also make a poorly explained command or synchronization bug disproportionately costly. [G1] [R6] [S2]

Longer-term goals can include restoring a vehicle, securing a favorite building, exploring a dangerous town, creating a farm or sustaining a cooperative settlement. Brown's red-van account is particularly useful: he ignored already functional cars because restoring **that** van had become the project. The value was not the fastest route to generic transport. That is an attributed play account, not a claim that all players supply their own goals equally easily. [R6]

**Interpretation:** survival, infrastructure and purpose are separate problems. Adding a new craft can deepen the second without solving the third. Some people enjoy the calm after danger; others feel that the central problem has ended. The appropriate response need not be endlessly stronger zombies.

### Native multiplayer and modifications

The published product supports solo play, player-hosted online multiplayer and local split-screen. Community maps and Lua modifications extend content and rules. A server can change the cost of death, scarcity and cooperation, so a story from one configuration is not a universal balance report. A platform feature label is not proof of console availability or any claimed simultaneous-player ceiling. [P4] [P13]

Current mod-management tools expose dependencies and compatibility more clearly, while control remapping includes axes as well as buttons. These are delivered improvements, not reasons to assume every old modification works on a new save. The stable-release instructions explicitly preserved legacy versions for older worlds. [P3] [P12]

## 6. Eight concrete situations

Constructed cases below explain documented interactions; the two marked player incidents are attributed, not reproduced.

### A. The threat is gone, but the wound is not

**Intent:** enter a useful building after defeating nearby zombies. **Conditions:** broken access glass and an injured survivor. **Actions:** inspect the route and condition, remove or avoid the hazard, and treat a bleeding injury before continuing to loot. **Interaction/result:** the successful fight has not established safety. **Next decision:** continue searching or withdraw with fewer supplies. **Limit:** medical attention to an ordinary injury does not cure Knox Infection. More tactical skill is not a substitute for noticing a different problem. [G1] [G2]

### B. Keep the refrigerator working

**Intent:** preserve stored food after power loss. **Conditions:** a generator and a fuel source outside the base. **Actions:** operate and maintain the generator, consider unnecessary electrical demand, and prepare a trip to a pump that also needs power. **Result:** infrastructure reduces one risk but creates a continuing logistical obligation. **Next decision:** maintain that dependency or use less power-dependent food plans. **Limit:** acquiring a machine does not provide unlimited fuel or automatic operating knowledge. This preserves the earlier shared study's exact dependency insight. [G7] [G8]

### C. A plausible recipe is not yet executable

**Intent:** make a needed object. **Conditions:** the survivor has some materials but lacks a recipe, tool or suitable workspace. **Actions:** distinguish the missing requirement, search or learn specifically, then return to production. **Result:** a failed attempt can identify the next useful expedition. **Next decision:** pursue the prerequisite or choose a substitute. **Limit:** repeatedly collecting generic scrap will not solve a knowledge constraint. The fiction's plausibility does not establish that an unsupported recipe exists. [G10]

### D. Plan beyond the next scavenged meal

**Intent:** replace unreliable food trips with a crop. **Conditions:** land, seeds, appropriate timing and water. **Actions:** choose a suitable planting opportunity, maintain the plants and use increasing expertise to interpret their state. **Result:** future supply becomes dependent on present care and environmental conditions. **Next decision:** diversify food sources rather than assume the first harvest is guaranteed. **Limit:** farming can become maintenance rather than interesting planning; a larger list of crops alone does not solve that. [G11]

### E. Care changes what can be known

**Intent:** obtain renewable animal products. **Conditions:** a cared-for animal and an appropriate interaction. **Actions:** water and tend it, then milk, shear or collect eggs where applicable. **Result:** skill and the animal's condition affect the process and available information. **Next decision:** improve care or choose a different food plan. **Limit:** a frightened animal is not simply an item with a cooldown, and the older wiki's exact tuning is not a current guarantee. [G12]

### F. Restore this vehicle, not merely any vehicle

**Attributed case:** Brown describes spending days restoring a battered red van despite passing usable cars. **Interaction:** the vehicle system permits a particular object to organize scavenging and travel. **Next decision:** accept the extra risk and work because the object matters, or use an easier substitute. **Limit:** this is self-authored purpose; another player can reasonably find the same labor pointless. The editor's attachment is not an autonomous sentiment computed by the van. [R6]

### G. A trait removes a channel of evidence

**Attributed case:** beben's January 2, 2022 Steam review describes discovering that the selected deafness trait explained the absence of expected sound. **Interaction:** character identity changes what the player can learn about danger. **Next decision:** rely on other precautions rather than assume an audio bug. **Limit:** a challenge trait is not an accessibility feature; making deafness mechanically meaningful does not establish that the interface adequately serves a deaf player. [S1]

### H. A shared errand becomes a shared disaster

**Attributed case:** OrbitalMechanist's December 22, 2021 review turns an injury and medical-supply expedition into a chain of risky choices and losses. **Interaction:** practical objectives acquire social stakes because other people depend on the plan. **Next decision:** rescue, retreat or accept a loss. **Limit:** the account's precise events and configuration are not independently verified, and a funny retelling does not make every weeks-long setback acceptable. The original account and qualifications remain in the earlier chapter. [S1]

## 7. Presentation, sound and access

The isometric presentation can show rooms, routes and objects while retaining gaps in the survivor's knowledge. It should not be confused with omniscience. Orio's account emphasizes coherent rebuilding and environmental detail; the content palette and varied basements support recognizable places without making every interior identical. The design interpretation is that the ordinary setting reduces the explanation needed for why a medicine cabinet or an exit matters. [P6]

The audio history is equally deliberate. **Eine Kleine Nachtmoozik** describes expanding Zach Beever's material with intensity and situational variation, working with Armin Haas and Matthias Wolf through the audio team then identified as Formosa. That 2023 production account is not a current staffing list. It provides evidence for adapting atmosphere to play rather than assuming music is an unchanging background loop. [P10]

Readable condition indicators, inventories, target selection and context menus bear much of the simulation's explanatory burden. The developer already recognized scaling and control issues in its 2023 **Sky High** discussion; the 42.20 overview describes later delivered remapping and interface work. Historical criticism therefore belongs beside the update history rather than being labeled permanently unresolved. [P11] [P3]

No assistive-technology, controller, caption or hardware benchmark was personally tested. A strong character-sense model and good real-player accessibility are separate requirements: intentionally denying a character hearing should not accidentally deny the player unrelated menu feedback. Likewise, slow-paced preparation does not remove the precision needed when combat suddenly accelerates. These are analytical tensions, not a certification of accessibility.

## 8. Production, discovery and commercial context

The long public-development sequence matters: an early public game, Steam Early Access, substantial Build 41 adoption and the later Build 42 transition are different stages, not a single launch. The July 24, 2026 stable-plans post explains legacy saves and credits the trailer's art/capture contributors, including Ayrton, Amz and 3DWerlias. The trailer is a documented promotional artifact; it was not watched for this pass. [R3] [P12]

In Simon Carless's June 9, 2026 article, creative director Will Porter attributes the game's reach to customization, modding, legible incidents and long-term community investment. Carless separately emphasizes the advantages of its early Steam position. These are attributed explanations, not isolated causal estimates. The article's estimate of **more than 15 million Steam units** comes from GameDiscoverCo's model, **not an audited developer sales disclosure**. The linked longer Q&A was not fetched; the published interview excerpts were read. [P5]

The official game page displayed a **£22.49** purchase route at this capture, while Steam still offered a paid Early Access game. No unverified current USD price is supplied. Steam displayed **159,006 English reviews at 93% positive**, with **6,394 recent reviews at 90% positive** on September 26. Those are filtered review populations, not owners, retention, concurrency or revenue. Multiplying any of them by a list price would not establish earnings. [P4] [P13]

The earlier chapter's captured concurrency figures—38,139 at an instant, 54,701 over its 24-hour window and a 124,995 peak dated August 9, 2026—remain preserved **as that prior snapshot**, not freshly measured here. No private budget or profit information was recovered. Mods, repeatable personal challenges, group sessions and creator narratives plausibly reinforce return play, but their individual contribution to purchases is unknown. [Earlier metric owner](../games/project-zomboid.md)

**Interpretation:** the shareable unit is often a comprehensible mistake rather than an impressive crafting spreadsheet. A large simulation can be easy to talk about when its incidents have ordinary motives and consequences. Its years of accumulated community work are not a launch advantage a new project automatically inherits.

## 9. Five written critical accounts and Steam contrast

The substantive bodies and conclusions of the five accounts below were read. The Spanish and Italian articles are paraphrased in English; their scores and experiences are attributed, not our rating. A further Brown retrospective supplies the van example but does not create an additional independent reviewer.

### Ford Hollett — HollettGaming, displayed date 11/4/2024

Hollett values scavenging that supports a defensible home, configurable challenge and cooperative play. Progress feels tangible because ordinary supplies make the survivor more capable. The reservations are steep entry, simple presentation and little conventional authored narrative. The ambiguous numerical publication date is retained rather than silently interpreted as either April 11 or November 4. This is a personal review, not a platform-wide technical assessment. [R1]

### Ricardo Fernández — Meristation, March 4, 2022, 7.8/10

Fernández praises the collision of survival systems with player plans and the range of available approaches. He strongly criticizes control friction and visual presentation, especially when danger demands immediate execution. His broad statements about pausing and character creation are not used as precise current rules. The useful distinction is admiration for systemic consequence without treating awkward commands as an essential source of that consequence. [R2]

### Francesco Serino — Multiplayer.it, January 16, 2022

This purchased-copy hands-on retrospective values Build 41's multiplayer improvements, object-level detail and community role-play. Serino's closing concerns are interface, accessibility and the question of what follows a self-sufficient home. His anticipation of human NPCs belongs to the historical account, not the list of delivered 2026 features. The piece explicitly is not a definitive final-release review; its substantive criticism still contributes a distinct perspective. [R3]

### Andrew Brown — GamesRadar, introducing friends

The actual byline is Brown, despite a secondary reference crediting Iain Harris. Teaching newcomers renews his appreciation of practical expertise, while an alarm and failed retreat show how quickly a shared expedition changes character. The full ending still describes Build 42 multiplayer as unavailable, so this is a historical hands-on account rather than a current feature census. No reliable publication date was exposed in the retrieved text. [R4]

### AncientGammoner — Steam, December 1, 2015

The long positive review values the remembered shape of individual survival lives but finds secure self-sufficiency less compelling. Its answer is not that the systems never work; sometimes they work well enough to end the problem the writer cared about. This is a substantive player review, not professional criticism or evidence that every person becomes bored at the same stage. [S1]

### Helpful Steam sampling

The **English Most Helpful (All Time) positive** surface supplied the three historical accounts above, including the freshly retrieved deafness and medical-expedition stories. The **English Most Helpful (Week) negative** surface supplied **NUK3V01D, September 19**, reporting multiplayer desynchronization, interrupted actions and lost constructions, and **ChronicCandy93, September 17**, objecting to multiplayer problems and perceived reporting friction. These are actual bodies, not inferred from a review ratio. They are also differently timed samples, not a controlled sentiment comparison. [S1] [S2]

The September 23 Unstable patch addresses related defect categories, but this does not establish that each reviewer's problem is fixed in Stable. Insults, speculation about the developers and unverified allegations are not adopted. The earlier generator-magazine and late-purpose discussions remain separately attributed evidence in the shared study. [P2]

**Synthesis:** meaningful danger, repetitive upkeep, opaque controls, group reliability and self-authored purpose are different dimensions. A player can love the first and reject one of the others. More recipes do not repair desynchronization; a technical fix does not supply a new purpose for someone already materially secure.

## 10. OpenLegend patterns and limits — interpretation

**Ordinary objects can carry complex stakes.** A useful household object needs a contextual relationship to an intention, not an elaborate rarity hierarchy. A generator matters because of what depends on it and what it makes the player do next.

**Senses should change practical choices.** Distinguish what the actor observed from what the player camera could display. Preserve uncertainty and outdated knowledge without making fundamental command feedback mysterious.

**Knowledge has several forms.** A recipe, skill, remembered location and understanding of an environmental cue enable different actions. A language model's ability to describe a technique should not silently give every inhabitant that knowledge.

**Care can create individuality.** Tending a place, animal or particular vehicle supplies continuity. A world of interchangeable resource sources loses that possibility even with a large content catalog.

**Infrastructure and purpose require separate attention.** Delegating known maintenance can leave the strategic choice intact. Generating more emergencies is not the only way to sustain a community after basic survival is solved.

**Consequences need reliable execution.** Severe loss magnifies ambiguous UI and synchronization failures. Borrow the causal richness, not automatically the lethality, long grind, protected setting or every simulation detail.

## 11. Coverage, preservation and viewing routes

| Requirement | Substantive owner |
| --- | --- |
| R01 identity/version/promise | §1; dated stable/unstable distinction |
| R02 actions and major mechanics | §2–5 |
| R03 items and composition | §2–4; equipment, medicine, vehicle and manufacturing dependencies |
| R04 progression/economy/time | §2, §4–5 and §8; use-value versus monetization |
| R05 concrete situations | Eight cases in §6 |
| R06 people/AI/social play | §4–5; animals and humans distinguished; NPC plans separate |
| R07 art/audio/UI/access | §7 |
| R08 story and consequences | §5–6; outbreak ambiguity and personal projects |
| R09 production | §7–8 and release history |
| R10 discovery/distribution | §8; attributed creator explanations and trailer credits |
| R11 commercial/participation | §8; model estimates and review populations labeled |
| R12 criticism/player feedback | §9; five written bodies and contrasting helpful Steam samples |
| R13 patterns and limits | §10 and labeled interpretation |
| R14 sources/preservation/navigation | This section and annotations below |

Both earlier owners were read in full and remain unchanged, including **all Valheim material** in the shared study. The deafness incident, medical expedition, safe-base boredom, generator/pump chain, magazine-search frustration, late-purpose disagreement, historical metrics, source anchors and original videos are preserved. This pass does not declare the global seven-file packet audit complete.

For viewing, retain the chapter's **Build 42 beginner guide** and **200-hour retrospective** with their original cautions. They are linked recommendations, not footage watched for this research; no scene claims, timestamps or watched durations are invented. No exact infection probabilities, complete recipe catalog, current hardware benchmark or general human-NPC behavior model has been reconstructed from incomplete sources.

## Annotated sources

Accessed September 26, 2026. Wiki pages are first-party-hosted, volunteer-maintained documentation with mixed Build 41 and early Build 42 labels. Specific old thresholds and exact balancing tables are not asserted as current unless corroborated. Relevant mechanics sections were read; this does not mean every catalog entry, navigation link or source-code sample was audited.

- **P1 — [Build 42.20 release][P1], July 29, 2026.** Primary Stable delivery/save boundary.
- **P2 — [42.21 Unstable][P2], September 23, 2026.** Dated release body and fixes; stale header explicitly superseded.
- **P3 — [42.20 feature overview][P3].** Complete overview read; current presets, parts, controller and mod-management scope, not independent reception.
- **P4 — [The game][P4].** Published native modes, purchase route and clearly separate future NPC promises.
- **P5 — [Carless/Porter][P5], June 9, 2026.** Published interview excerpts plus analyst model; linked extended Q&A not read and modeled sales not an audited company total.
- **P6 — [Orio: The Big Glow Up][P6], July 27, 2026.** Primary art/map production, content counts and authorship account; promotional visuals not analyzed as personal gameplay.
- **P7 — [Zleigh Ride][P7], December 2023.** Historical material/part/workstation design; delivery checked at the broader level against P3.
- **P9 — [Critterz][P9], March 2023.** Fishing/audio development account, not a current formula table.
- **P10 — [Eine Kleine Nachtmoozik][P10], March 2023.** Primary adaptive-audio collaboration and intentions.
- **P11 — [Sky High][P11], September 2023.** Historical UI/access work; proposals distinguished from later shipped features.
- **P12 — [Stable plans][P12], July 24, 2026.** Legacy-branch and promotional-production context; future tool work not counted as delivered.
- **P13 — [Steam store][P13].** September 26 Early Access, release and filtered review capture; no invented USD price or earnings.
- **G1–G13 — [Health][G1], [Knox Infection][G2], [Skill][G3], [Occupation][G4], [Moodle][G5], [Vehicle][G6], [Electricity][G7], [Generator][G8], [Clothing][G9], [Crafting][G10], [Agriculture][G11], [Animal Care][G12], [Water][G13].** Documented system references; Animal Care is explicitly incomplete and early-42-tagged. A separate Death-page request failed; its unseen contents are not asserted.
- **R1 — [Hollett review][R1].** Complete personal review; ambiguous date retained.
- **R2 — [Fernández review][R2].** Complete Spanish criticism, March 4, 2022; English paraphrase, imprecise mechanics statements excluded.
- **R3 — [Serino retrospective][R3].** Complete Italian purchased-copy account, January 16, 2022; not relabeled a final-release review.
- **R4 — [Brown introduces friends][R4].** Complete hands-on account, correct byline, unavailable publication date and historical multiplayer boundary explicit.
- **R6 — [Brown's eleven-year retrospective][R6].** Full body read; additional source by the same writer, not another independent reviewer. Forecasts predate Build 42 delivery.
- **S1 — [Helpful positive Steam][S1].** Historical full review bodies and present selection, not representative sampling.
- **S2 — [Helpful negative Steam][S2].** Actual recent bodies; different sampling window, allegations/insults excluded.

[P1]: https://projectzomboid.com/blog/news/2026/07/project-zomboid-build-42-20-released/
[P2]: https://projectzomboid.com/blog/news/2026/09/re-population-of-the-dead-build-42-21-unstable-released/
[P3]: https://projectzomboid.com/blog/features-overview-build-42-20/
[P4]: https://projectzomboid.com/blog/the-game/
[P5]: https://newsletter.gamediscover.co/p/how-project-zomboid-just-kept-selling
[P6]: https://projectzomboid.com/blog/news/2026/07/42-20-the-big-glow-up/
[P7]: https://projectzomboid.com/blog/news/2023/12/zleigh-ride/
[P9]: https://projectzomboid.com/blog/news/2023/03/critterz/
[P10]: https://projectzomboid.com/blog/news/2023/03/eine-kleine-nachtmoozik/
[P11]: https://projectzomboid.com/blog/news/2023/09/sky-high/
[P12]: https://projectzomboid.com/blog/news/2026/07/build-42-stable-plans/
[P13]: https://store.steampowered.com/app/108600/Project_Zomboid/
[G1]: https://pzwiki.net/wiki/Health
[G2]: https://pzwiki.net/wiki/Knox_Infection
[G3]: https://pzwiki.net/wiki/Skill
[G4]: https://pzwiki.net/wiki/Occupation
[G5]: https://pzwiki.net/wiki/Moodle
[G6]: https://pzwiki.net/wiki/Vehicle
[G7]: https://pzwiki.net/wiki/Electricity
[G8]: https://pzwiki.net/wiki/Generator
[G9]: https://pzwiki.net/wiki/Clothing
[G10]: https://pzwiki.net/wiki/Crafting
[G11]: https://pzwiki.net/wiki/Agriculture
[G12]: https://pzwiki.net/wiki/Animal_Care
[G13]: https://pzwiki.net/wiki/Water
[R1]: https://www.hollettgaming.com/newsarticle/206/ProjectZomboidReview/
[R2]: https://as.com/meristation/2022/03/04/analisis/1646386518_791178.html
[R3]: https://multiplayer.it/articoli/project-zomboid-provato-early-access.html
[R4]: https://www.gamesradar.com/games/survival/introducing-my-friends-to-project-zomboid-ended-in-disaster-but-its-given-me-a-newfound-appreciation-for-the-best-zombie-survival-sim-around/
[R6]: https://www.gamesradar.com/games/simulation/11-years-in-early-access-has-turned-project-zomboid-into-the-ultimate-survival-sim-but-i-think-the-best-is-yet-to-come/
[S1]: https://steamcommunity.com/app/108600/reviews/?browsefilter=toprated
[S2]: https://steamcommunity.com/app/108600/negativereviews/

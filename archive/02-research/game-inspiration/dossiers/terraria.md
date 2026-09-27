# Terraria — capabilities turn a sandbox into an adventure

**G29 · Full research pass · September 26, 2026.** Research and interpretation, not an implementation specification. No new gameplay session, performance benchmark, source-code audit, accessibility-device test or video playback was conducted. **Spoilers:** progression gates, boss names, equipment and special liquids; not a walkthrough of every discovery.

[Original chapter](../games/terraria.md) · [Preserved mechanics study](../mechanics/terraria-equipment-composition-settlements-and-discovery.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

## 1. Identity and versions

Terraria combines side-view exploration, excavation, construction, real-time combat and equipment progression. A generated world is a place to alter, not simply a sequence of combat arenas. The player can build a home, tunnel toward a discovery, prepare a boss arena, collect decorative material or improve mobility. Those activities feed one another: a difficult place motivates a tool, the expedition supplies materials, and the improved settlement supports the next trip. It is not accurately reduced to Minecraft with one less dimension. [P1][R1]

The current maintenance baseline is **1.4.5.8**. Re-Logic's **September 24, 2026** update still describes 1.4.6 and the first cross-play phase as unfinished, not universally available. tModLoader likewise still keeps 1.4.4 as its default stable line while 1.4.5.8 adaptation proceeds on the 1.4.5 development/beta branch; its August 31 update explicitly says the team is **not yet ready to set a date** for making 1.4.5 the default release. A matching vanilla major version is therefore not proof that the mod loader has completed its transition, and neither is it proof that every platform can already share a session. [V1][V4]

**1.4.5, January 27, 2026**, added collaboration content, seed combinations and important interface changes. Crafting from nearby chests, station-filtered crafting and clearer equipment/reforge feedback matter when interpreting older criticism. An old console or 3DS review documents its own content and controls; it cannot establish what a current PC, mobile or supported console player receives. Some older exclusive content is retired rather than missing from a supposedly complete modern checklist. [V2][R2][R3][R4][R5]

### Three different meanings of difficulty

Character settings govern loss: Classic primarily loses coins, Mediumcore drops carried items, and Hardcore prevents ordinary respawning. World settings—Classic, Expert and Master—change challenge and rewards separately. **Hardmode** is a world-progression transition after the Wall of Flesh, not another name for Expert or Hardcore. Journey requires a Journey character and world, and offers research/duplication plus configurable time, weather and difficulty controls. Thus a frustrating death or a creative building session may reflect a deliberately selected contract, not an unavoidable universal rule. [M1]

## 2. The action vocabulary and material world

Movement, jumping, aiming, attacking, mining, placing, using, equipping and crafting form the ordinary action vocabulary. Pickaxes remove suitable blocks, axes handle trees, and hammers reshape supported construction or remove walls. Platforms, ropes, light sources and hooks turn excavation into a route the player can use again. Mining eligibility depends on the tool and material rather than any pickaxe instantly cutting every progression gate. Combat and construction share the same physical space. [M2]

The world includes surface forests, desert, snow, jungle, ocean, underground/cavern layers, a Dungeon and Underworld, alongside evil biomes and the later Hallow. Different depth, time and biome combinations change encounters and useful finds. Ore families can substitute at world-generation level—iron/lead is one example—without implying every alternate item has identical combat properties. A world seed changes discovery; it does not make every ruin, boss or item an independently invented narrative. [M2][M3]

A practical early manufacturing chain is wood into a workbench, ore into bars at a furnace, and bars into equipment at an anvil. Workbenches can have different appearances while performing the same ordinary crafting role. Iron and Lead Anvils are functional equivalents; advanced anvil and forge types unlock other recipes. The Hellforge is both a discovered world object and a component of later infrastructure. Crafting stations therefore combine place, knowledge and equipment access rather than being one generic “craft” button. [M4][M5][M6]

The Guide can expose uses for supplied materials. That is a different kind of help from selecting the optimal complete build. Chests organize the many materials, consumables and spare equipment; carrying capacity and finding a stored component create practical friction. Version 1.4.5's nearby-chest crafting reduces that friction but does not manufacture ingredients or remove station requirements. Reforging through the Goblin Tinkerer and accessory combination at a placed Tinkerer's Workshop are separate operations, a distinction a novice in the preserved study missed. [M2][V2][P2]

## 3. Equipment as a build, not a fixed class

There is no ordinary class-selection screen or experience-level ladder. **Melee, ranged, magic and summoning** describe equipment synergies. Armor, accessories, weapon choice, ammunition and consumables shape a role; changing them can change it. Swords, spears, yoyos and boomerangs differ in handling; bows and guns consume compatible ammunition; magic draws on mana; minions and whips create another control relationship. A minion used beside another weapon does not automatically make a fully optimized summoner. [M7]

Named examples show breadth without reproducing an item encyclopedia: a found **Starfury** changes how a sword delivers its attack; **Abigail's Flower** grants a summon; **Terra Blade** and **Vampire Knives** are later weapon identities, not merely anonymous damage tiers. Armor families such as Hallowed, Shroomite and Spectre support different arrangements. Set bonuses can reward coherent equipment, while a mixed collection can trade a bonus for another useful property. The guide's recommended loadouts are authored suggestions, not proof that only one combination works. [M7]

Mana is a replenishing spell resource, expanded by Mana Crystals and modified by equipment. **Life Crystals** increase permanent health toward the ordinary early cap; later **Life Fruit** extends it further. A spare Life Crystal can also become a Heart Lantern, turning a personal-upgrade resource into a placed support object. Raising survivability, improving movement and improving damage are therefore different uses of progression, not interchangeable increases in one level number. [M8][M9]

The preserved **Terraspark Boots** study traces the historical Frostspark Boots/Lava Waders combination. Its useful pattern is retaining earlier movement/environmental functions while reducing accessory-slot pressure. It does not imply every intermediate must be acquired by every player or every acquisition route is unchanged in 2026. **Reforging** spends money to change an item's modifier; **combining** consumes compatible items to produce another item. Their costs, affordances and relationship to equipment slots differ. [P2]

Utility includes grappling, double jumps, wings, mounts, minecarts and recall/teleportation tools. These can make old terrain newly traversable and change boss positioning. Vanity slots, dyes and building materials create identity without needing to increase damage. The persistent value of an old discovery may be its function inside a later combination, its appearance, or its usefulness in another world—not only its resale price. [R1][P2]

## 4. Bosses, preparation and a changing world

Early play establishes shelter, health, ore processing, mobility and an exploratory repertoire. Bosses supply authored tests and unlocks within this freedom: the Eye of Cthulhu, the world's evil-biome boss and Skeletron are recognizable objectives, but the player still chooses preparation and construction. An arena can change the encounter by providing maneuvering space, lighting and support, rather than only improving the character sheet. [M2][P1]

Defeating the **Wall of Flesh** transforms the world into Hardmode. New threats, materials and biome pressures change the meaning of an established home and expedition route. This is not a fresh map that discards all previous work. Advanced ores and stations lead toward the **Twins, Destroyer and Skeletron Prime**; defeating all three enables the ordinary Plantera stage. The current mechanical-boss reference notes an immediately generated first bulb after completing that gate, an important qualification to older reports of searching without direction. [M10][M11]

The broad later route runs through **Plantera**, the Jungle Temple/Golem, the **Lunatic Cultist**, the Lunar Events and **Moon Lord**. Optional challenges such as Duke Fishron are not interchangeable mandatory links in that chain. The source documentation distinguishes current rules from legacy editions, some of which have different gates or no modern final stages. Post-completion play can focus on building, events, collections, stronger equipment, another seed or a modded run rather than an imposed seasonal account reset. [M12]

Day/night, weather and events make time useful even without a farm-calendar campaign. Some bosses require night or a particular summoning context; invasions interrupt ordinary work; Blood Moons and eclipses change encounters. The Mechanical Worm, for example, is a conditional summoning item, not a permanently reusable “start any boss” menu. Preparation includes selecting the time and place, carrying consumables, and deciding whether to risk valuable inventory under the selected loss mode. [M13][M1]

## 5. Housing, services, travel and economic purpose

Residents make construction functional. The Guide provides information, the Merchant trades, the Nurse heals, the Arms Dealer supplies combat-related goods, the Goblin Tinkerer provides reforging and the Mechanic supplies mechanisms. Some residents must be encountered or rescued; progression and possessed items can matter. Valid housing retains residents and supports a settlement, but current rules allow limited homeless arrivals who leave at night if not housed. It would now be too strong to claim that no NPC can ever appear before a home exists. [M14][V2]

Characters have authored preferences, dialogue, service roles and limited combat behavior. They do not run a simulated employment market, become freely recruitable adventure companions, or develop unscripted romances. Placement and happiness can affect service economics. Their individuality is useful, but should not be mistaken for a deep autonomous social simulation. The ordinary game also lacks mandatory hunger/thirst and an agriculture calendar; special seeds and mods can change that contract. [M14][M1]

**Important update to the preserved pylon account:** the 2020 discussion connected pylon purchase to happiness. **1.4.5 removed that happiness purchase requirement and the ordinary boss/invasion usage ban.** Pylons still have relevant placement/biome/resident conditions; the earlier troubleshooting remains historical evidence of how people learned the old system, not current purchase instructions. The useful durable idea is that distributed settlements can become travel infrastructure. It is not that every old NPC pairing remains an optimal or required recipe. [M15][P2]

Copper, silver, gold and platinum coin denominations support purchases, healing, reforging and other services. Loot and sales generate money; repeated modifier attempts and services consume it. This is an in-world currency system, not a premium-currency storefront or a player-driven global auction market. A resident's pricing role can motivate town organization, while decorative housing can be valuable independently of that optimization. [M14][P2]

## 6. Fishing, potions, mechanisms and transformations

Fishing uses a pole, suitable bait and a body of liquid. Casting alone does not guarantee a catch; biome and depth determine relevant opportunities. The Angler's daily request changes at the in-game day boundary and creates a reason to visit a specific environment. Fish, crates, useful equipment and ingredients connect this activity to exploration and preparation. A fishing side goal is not evidence that every player must complete the entire collection to finish the game. [M16][M17]

Potion crafting connects gathering, water, bottles and specialized stations. Healing/mana recovery, temporary buffs and weapon flasks are different categories. **Ironskin** combines bottled water, Daybloom and an eligible iron/lead ore input to improve defense temporarily; regeneration, movement and role-specific buffs can complement preparation. These effects have duration and use constraints rather than being permanent character levels. Food can supply a useful buff without ordinary play imposing starvation as a survival clock. [M18][M19]

Wiring creates connections among triggers and supported mechanisms: switches, pressure plates, timers, lights, traps, pumps, actuators and other devices. Carrying the relevant tool reveals a layer normally hidden from view. A switch can control a placed effect, but “wired” does not imply every item implements every possible reaction. A trap, a decorative light and a transport device can share an activation vocabulary while having different eligible targets and consequences. [M20]

**Teleporters** illustrate this precisely. A wired pair and trigger exchange eligible nearby actors in both directions; an enemy at the destination can be brought into the player's supposedly safe base. Dropped objects, liquids, bosses and various other entities do not use that transport rule. A teleporter network is therefore different from a universal matter-transfer system or a pylon settlement network. More than two connected pads also introduce destination-selection rules rather than arbitrary player intent. [M21]

**Shimmer** adds sideways and backward paths through the item graph. Some items transform, many crafted items can be decrafted, some transformations are progression-gated and some items are explicitly excluded. A Life Crystal can become a Vital Crystal; transforming an NPC's appearance is cosmetic, not a new personality. Shimmer also affects the player physically, so testing it is not identical to placing an item in a safe crafting menu. The preserved discussion's warning remains important: an evocative substance does not promise that every conceivable reversal works. [M22]

## 7. Eight worked situations

These distinguish constructed rules-based illustrations from attributed play. None was reproduced in a new test session.

**1 — A flooded cabin changes the lighting problem.** Winkie's 2018 review describes accidentally admitting water into an underground cabin. Ordinary torches fail; a glowstick supplies underwater light, and opening a door lets water drain elsewhere. Intention shifts from entering a room to managing the room's changed conditions. The next decision can use the newly accessible space. This is the critic's particular incident, not proof of unrestricted fluid simulation or universal object destruction. [R1]

**2 — Preparation changes the place as well as the combatant.** To attempt the Wall of Flesh, organize a traversable route and choose suitable equipment, mobility and consumables before initiating the encounter. The intended benefit is control over movement and recovery rather than simply a larger attack number. A route cannot compensate for every failed dodge or unsuitable weapon. The preserved novice account reports a later successful attempt after advice; it is not evidence the boss is universally easy. [P2]

**3 — Free an accessory slot instead of buying another modifier.** A player owns separately useful movement accessories but has insufficient slots. At the appropriate placed workshop, a supported combination can retain functions in one equipped item. Reforging one of the originals would not solve the same problem. The next choice is what to put in the freed slot. The historical Terraspark guide supplies the concrete chain, with its old acquisition information still labeled historical. [P2]

**4 — Make a settlement part of an expedition route.** Build suitable homes in a useful biome, retain residents, and establish a pylon under current conditions. This can shorten repeated travel and make a distant place worth maintaining. The next decision is where another settlement is useful, not merely how to duplicate a central apartment block. Applying a 2020 happiness-purchase guide without noticing the 2026 rule change creates unnecessary work. [M15]

**5 — Move the body, not everything occupying the area.** Connect two Teleporters and a suitable trigger to create an escape route. Test which actors stand in each pad's activation area; activation exchanges eligible participants in both directions. The destination's enemy can become the base's new problem. The next improvement is safer placement or a different trigger. A dropped treasure pile will not arrive simply because its owner does. [M21]

**6 — Discover that casting is not fishing.** Take a pole to the Angler's requested environment but fail to obtain the desired catch. Check bait, liquid, biome and depth rather than merely repeating casts faster. With the conditions corrected, fishing becomes eligible, not guaranteed to return the target immediately. The next choice is whether today's request is worth the time or another project is more attractive. [M16][M17]

**7 — Turn an extra permanent-upgrade item into another kind of benefit.** After the current ordinary health use of a Life Crystal is exhausted, consider a Heart Lantern or a supported Shimmer conversion rather than assuming the item is obsolete. These outputs support different goals and have their own conditions. The next decision depends on whether the player wants a placed benefit, a personal upgrade or another use. This does not establish that every consumed upgrade can be reversed. [M9][M22]

**8 — Begin a new progression stage without deleting the old world.** Defeat the Wall of Flesh and return to a place whose danger and resources have changed. Reassess equipment, access and protection rather than expecting pre-Hardmode routines to remain sufficient. The existing construction and knowledge still help, but new threats expose weaknesses. The next project can be a new route or production station rather than abandonment of the entire settlement. [M10]

## 8. Cooperation, return loops and story

The player character and world are separate persistence units: equipment can accompany a character between compatible worlds, while terrain and settlement changes belong to a world save. Shared sessions can divide mining, construction and preparation, but an over-equipped visitor can also remove a newcomer's discovery curve. The inspected players describe returning with friends for updates and alternating vanilla/modded play. That establishes specific social routines, not a measured share of sales attributable to co-op. [P1][P2][S1]

tModLoader supports a substantial modification ecosystem, but its default stable release does not track every vanilla update immediately. The September Terraria account celebrates ten thousand Workshop mods, while tModLoader's own August 31 update says 1.4.5.8 adaptation remains on a beta/development branch with no default-release date yet. A Workshop count is not the number of independent creators, unique players or compatible mods in one save. Cross-play announcements likewise must not be confused with a currently working universal multiplayer pool. [V1][V4]

The setting supplies bosses, ruins, residents, corruption and broad mythic framing, while most moment-to-moment story comes from what a player discovered, lost or built. The Dungeon, a surprising island, the first flight and an unexpectedly dangerous excavation can become autobiographical landmarks. **Interpretation:** authored goals make discovery directional without specifying the exact house, route, equipment combination or personal project. The game need not generate new dialogue to let two people remember meaningfully different adventures.

## 9. Presentation, interface and development

Pixel silhouettes, animated projectiles, biome backgrounds, lighting and the side view make many simultaneous actions legible within limited screen space. Slopes, half-blocks, paint, furniture and layering widen expression without requiring a different simulation for every decorative block. The same dense inventory can make finding a relevant recipe difficult. Controller, touch and mouse interfaces solve different targeting problems, which is why the historical port reviews should remain separate rather than averaged together. [P2][R3][R4]

The official soundtrack credits **Scott Lloyd Shelly / Resonance Array**. Named day, night, underground, biome and boss pieces connect musical identity to the changing place and activity. Nakamura finds the music memorable; Vogel finds it comparatively forgettable. Neither opinion is a technical defect report. No soundtrack listening or accessibility-device testing was performed here. Small sprites, visual effects, text density and repeated precision remain relevant access questions even when a reviewer likes the art. [A1][R3][R5]

In a **May 2011** interview, Andrew Spinks describes an initially small distributed team, including Jeremy Guerrette and Finn Brice, and a deliberately equipment-based alternative to conventional experience levels. He identifies influences including Liero and Minecraft and explains choosing Steam partly for account/payment handling. These are creator statements about origin and distribution, not causal proof that one comparison produced the game's later audience. [D1]

A later Spinks interview describes self-taught C# development, the rapid 2011 creation period and Engine Software's console adaptation. The page displays **May 5, 2013**, despite `/2013/01/` in its URL. Its statements about considering PC development finished are historical intentions, not the current maintenance policy. The subsequent years of updates show why an early production plan cannot stand in for a verified current feature boundary. No exact present team size, total budget or title-level net profit was established. [D2]

## 10. Distribution, community and commercial evidence

Re-Logic's **May 16, 2026** anniversary account reports **70 million copies**: 39.6 million PC, 10.7 million console and 19.7 million mobile. It separately reports **12.3 million Steam downloads of tModLoader** and PC daily-player figures. Daily participation is not simultaneous concurrency; the reported average of 461,000 daily PC players cannot be compared as though it were a Steam concurrent-player record. None of these numbers independently establishes retention, per-player spending or profit. [V3]

The original chapter's **489,886 Steam peak on May 16, 2020** and its later review-count capture remain dated inherited measurements. Its earlier inability to retrieve an original 2026 sales source remains part of the historical evidence record; the newly read anniversary announcement resolves that access gap here without rewriting what the earlier researcher could verify. [P1][V3]

The premium game, long-running updates, console/mobile adaptation, modification ecosystem and recognized crossover items provide different distribution and return routes. The September primary update documents convention/community outreach; the preserved Palworld collaboration account traces a particular unsolicited approach between teams. These observed events are not acquisition-attribution percentages. **Growth hypothesis:** new content can give old friends a shared reason to return, while visible builds and unusual equipment communicate possibilities to newcomers. That hypothesis does not imply a new project must launch with fifteen years of accumulated content. [V1][P2]

## 11. Reception: five written reviews and Steam sampling

All five substantive review bodies were read through their conclusions. They are independently credited articles, although two share an outlet. Their edition, date and tested configuration matter more than an averaged score.

**Luke Winkie, PC Gamer, June 7, 2018.** Winkie values the way discovery and equipment transform possible actions; the flooding incident makes ordinary material properties memorable. He also finds the crafting interface and knowledge burden difficult, with presentation that can feel dated. The current crafting changes qualify an unchanged-bug interpretation but do not erase the historical lesson about discoverability. [R1]

**Britton Peele, GameSpot, April 9, 2013.** Peele values a console tutorial and map that help newcomers enter a broadly freeform world. Automatic targeting helps mining while precise construction demands different control. His comparatively positive multiplayer experience is evidence of that test, not a universal claim of technically trouble-free ports. His discussion of the harder progression stage is not a review of today's Expert preset. [R2]

**Mitch Vogel, Nintendo Life, July 14, 2019.** Vogel praises breadth, discovery and the varied challenges of the Switch port, but finds analog precision burdensome and questions its price and then-missing local split-screen. He is less enthusiastic about the music. These are historical Switch observations, not current feature omissions or general PC judgments. [R3]

**Marcel van Duyn, Nintendo Life, January 9, 2016.** The 3DS touchscreen makes map and grid work approachable, while older hardware struggles more than New 3DS in his account. Content lag and local-only multiplayer are central limits of this specific adaptation. They should not be transferred to contemporary versions or treated as an incomplete reading of their modern systems. [R4]

**Darren Nakamura, Destructoid, April 17, 2013.** Nakamura values the way new discoveries change the player's understanding, with a tutorial that explains enough without resolving every mystery. He reports control inconvenience and multiplayer/connection problems that contrast with Peele's experience. He likes the music more than Vogel does. The disagreement separates configuration, subjective taste and design appeal rather than forcing one timeless technical verdict. [R5]

**Steam positive evidence:** the English **Most Helpful (All Time)** surface was read, including Bebojo and Kitto. Bebojo's May 2020 account, later edited, values the mix of combat, exploration and building while criticizing rare-drop grinding and learning friction. Kitto's December 2020 account describes friends returning for updates and sometimes mods. Displayed present hours are not hours at initial publication. [S1]

**Steam negative evidence:** the all-time negative URL failed, but the bare negative route returned **Most Helpful (Week), Negative Only**. EmilyShoots120's September 19 entry finds equipment acquisition an unconvincing motivation while acknowledging a taste mismatch. Tymtek12's September 20 entry objects to finding Plantera's bulb. The displayed dates omit years; no year or broad prevalence is invented. Other sampled insults/jokes do not explain a system and are not counted as substantive causal evidence. Current bulb-generation documentation supplies a useful qualification to an undifferentiated claim that the old search burden is unchanged. [S2][M11]

## 12. Interpretation and limits for another game

**Let a capability change a practical project.** A hook, flight, underwater light or compact accessory can change where a player goes and what they build. This is a stronger reference than treating every discovery as another damage number.

**Preserve previous effort without making every chain compulsory.** Combining old items can make discoveries durable, but a long recipe can become an externally researched checklist. A useful optional construction should disclose relevant compatibility without insisting every player pursue the same final collection.

**Separate helping from solving.** The novice who missed accessory combination needed a rule explained, not necessarily the optimal full boss loadout. Guidance can remove accidental misunderstanding while preserving experimentation and personal priorities.

**Give settlements practical consequences without assuming deep psychology.** Residents connect services, construction and travel. That works in Terraria's comparatively simple social model; another game should not assume arranging people as utility components will satisfy a promise of psychologically rich relationships.

**Keep the direction/freedom balance explicit.** A next boss can motivate preparation while leaving the means open. Conversely, infinite building alone does not supply a satisfying reason for every player to keep acquiring equipment. The negative account about motivation is a real alternative preference, not a mistake to dismiss.

## 13. Coverage and preservation

### September 26 requirements-and-corrections audit

A fresh mechanics-inventory audit confirms the full requested surface and records the useful absences explicitly:

- **Identity / classes / attributes / skills / leveling / trees:** Terraria has no fixed class picker or character-XP level ladder; melee/ranged/magic/summoning are equipment synergies. Permanent health/mana upgrades, equipment/accessories and world/boss progression provide growth (§§1, 3–4).
- **Items / inventory / weapons / armor / equipment / crafting / upgrading:** §§2–3 and 6 cover tools, storage, crafting stations, armor/set bonuses, accessories, reforging, combinations, potions and Shimmer transformations.
- **Magic / spells / powers:** mana weapons and summon equipment are native magic-like capability systems; utility comes through items rather than a learned spellbook/class level table (§3).
- **Traversal / environment / object interaction:** mining, block/wall placement/removal, liquid interaction, hooks, jumps, wings, mounts, minecarts, pylons, teleporters, wiring and Shimmer are covered in §§2–6.
- **Activities / minigames:** fishing/Angler quests, building/decorating, wiring, collection and events diversify play (§6). They are not a separate real-money or persistent competitive minigame economy.
- **Combat / stealth / loot / rewards:** bosses, weapons, ammunition, drops, treasure, exploration finds and world gates are covered in §§3–4. Terraria has no general-purpose stealth system analogous to a stealth RPG; invisibility-like item effects should not be inflated into one.
- **Death / failure / recovery / economy / trading:** §1 distinguishes Classic/Mediumcore/Hardcore character-loss contracts; §5 covers coins, NPC services and reforging. World construction persists separately from character death.
- **Story / relationships / romance / reputation / party / companions:** §5 and §8 cover authored residents and environmental/mythic framing. Native NPC friendship/romance, companion approval and freely recruitable adventuring parties are absent.
- **NPC/AI schedules / factions:** town NPCs have roles, housing, happiness/pricing and combat behavior, but not a deep employment market or emergent faction-politics simulation (§5). Enemy/biome groupings are not automatically social factions.
- **World map / environment / quests / events:** generated worlds, biomes, progression stages, invasions, weather/time and Angler daily quests are covered in §§2, 4 and 6. Most progression is discovery/boss/world-state driven rather than a conventional campaign quest log.
- **Building / settlements / management:** housing, decoration, services and pylon-linked towns are major systems (§5), without NPC labor scheduling or colony production management.
- **Multiplayer / social / endgame / return loops:** §8 covers shared worlds, character/world persistence and mods; §4 covers Moon Lord/post-completion building, collections, events, new seeds and modded replays rather than seasonal account resets.

The version audit also removes an over-specific timing claim: tModLoader has **not** promised that its 1.4.5 branch will become default within a stated number of months. As of the August 31 stable update, 1.4.4 remains the default stable line, 1.4.5.8 work is active on beta/dev, and the team says it is not ready to set a release date. [V4]


R01: §1; R02–R03: §§2–6; R04: §§1, 3–6, 10; R05: §7; R06: §§5, 8; R07: §9; R08: §§4, 8; R09: §9; R10–R11: §10; R12: §11; R13: §12; R14: here and below. Mechanics absences, source dates, old-platform limitations and future cross-play/mod work are explicit.

Both earlier repository owners were read completely and remain **unchanged**. Their flooded cabin, mobility, Terraspark, novice combination, pylon disagreement, Shimmer, edited Steam accounts and collaboration passages remain in their original locations with annotations. This pass explicitly qualifies the old pylon rule rather than silently deleting it. The [2024 retrospective](https://www.youtube.com/watch?v=MUtkCXPHggI) remains an **unwatched viewing route**; no scene timestamps or new firsthand gameplay are claimed. This relevant-owner preservation check is not the separate seven-file packet-wide P01 audit.

## Sources and access boundaries

Accessed September 26, 2026. Official-wiki content is community-maintained rules documentation, not our runtime test. Several substantive bodies were returned through indexed search after direct-page failures. Native mechanics are not sourced from invented footage. Source aliases are local to this dossier.

- **V1:** September 24 developer update read in full from the announcement archive. The archive UI is Korean but the relevant announcement body is English. Current update/mod/cross-play limits, not a claim of released 1.4.6.
- **V2:** 1.4.5.0 patch text and history; delivered changes, not universal compatibility promises.
- **V3:** May 16 anniversary announcement body read in the archive. The individual-post route returned only a shell. Primary reported sales and daily participation are separate measures.
- **V4:** tModLoader September 2026 Stable Update, published August 31. Primary tModLoader status: default stable remains on Terraria 1.4.4; 1.4.5.8 adaptation is active on the 1.4.5 beta/dev branch; no date is set for making it default.
- **M1–M22:** Version-qualified mechanics references. Exact optimal builds, drop tables and every conversion are deliberately not reproduced. Teleporter and Shimmer restrictions matter as much as their useful effects.
- **A1:** Official soundtrack credits; identifies the composer without claiming a listening study.
- **D1–D2:** Primary creator interviews, with historical intent and the displayed-date/URL mismatch retained.
- **R1–R5:** Five full independent written reviews, with authors, platforms and publication dates above.
- **S1–S2:** Actual Steam bodies from different helpful-ranking windows. Qualitative selection, not a representative survey.
- **P1–P2:** Prior repository owners, preserving their original dates, access limits and examples.

[V1]: https://steamcommunity.com/app/105600/announcements/?l=koreana
[V2]: https://terraria.wiki.gg/wiki/1.4.5.0
[V3]: https://steamcommunity.com/app/105600/announcements/
[V4]: https://steamcommunity.com/app/1281930
[M1]: https://terraria.wiki.gg/wiki/Difficulty
[M2]: https://terraria.wiki.gg/wiki/Guide:Getting_started
[M3]: https://terraria.wiki.gg/wiki/Ore
[M4]: https://terraria.wiki.gg/wiki/Guide:Crafting_101
[M5]: https://terraria.wiki.gg/wiki/Lead_Anvil
[M6]: https://terraria.wiki.gg/de/wiki/Crafting-Stationen
[M7]: https://terraria.wiki.gg/wiki/Class_setups
[M8]: https://terraria.wiki.gg/fr/wiki/Mana
[M9]: https://terraria.wiki.gg/wiki/Life_Crystal
[M10]: https://terraria.wiki.gg/wiki/Guide:Getting_started_with_Hardmode
[M11]: https://terraria.wiki.gg/wiki/Mech_Bosses
[M12]: https://terraria.wiki.gg/fr/wiki/Hardmode
[M13]: https://terraria.wiki.gg/wiki/Mechanical_Worm
[M14]: https://terraria.wiki.gg/fr/wiki/PNJs
[M15]: https://terraria.wiki.gg/wiki/Pylons
[M16]: https://terraria.wiki.gg/wiki/Bait
[M17]: https://terraria.wiki.gg/wiki/Angler/Quests
[M18]: https://terraria.wiki.gg/wiki/Alchemy
[M19]: https://terraria.wiki.gg/wiki/Ironskin_Potion
[M20]: https://terraria.wiki.gg/wiki/Mechanisms
[M21]: https://terraria.wiki.gg/wiki/Teleporter
[M22]: https://terraria.wiki.gg/wiki/De-craft
[A1]: https://store.steampowered.com/app/409210/Terraria_Official_Soundtrack/
[D1]: https://steamaddicts.com/2011/05/terraria-mania/
[D2]: https://godisageek.com/2013/01/interview-terrarias-andrew-spinks/
[R1]: https://www.pcgamer.com/terraria-review/
[R2]: https://www.gamespot.com/reviews/terraria-review/1900-6406597/
[R3]: https://www.nintendolife.com/reviews/nintendo-switch/terraria
[R4]: https://www.nintendolife.com/reviews/3ds/terraria
[R5]: https://www.destructoid.com/reviews/review-terraria/
[S1]: https://steamcommunity.com/app/105600/reviews/?browsefilter=toprated
[S2]: https://steamcommunity.com/app/105600/negativereviews/
[P1]: ../games/terraria.md
[P2]: ../mechanics/terraria-equipment-composition-settlements-and-discovery.md

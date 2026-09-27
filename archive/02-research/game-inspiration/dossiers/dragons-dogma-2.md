# G127 — Dragon's Dogma 2

**Status: complete full-pass research dossier.** Research date: September 26, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Dragon's Dogma 2 is especially useful as a study of **single-player companionship that borrows other players' experience without turning into co-op**. Its Pawn system, dangerous travel, physical combat, limited fast travel, day/night pressure and persistent NPC consequences make a trip feel like a party expedition rather than movement between content markers.

## R01 — identity, current scope, and player promise

Capcom released Dragon's Dogma 2 worldwide on March 22, 2024 for PlayStation 5, Xbox Series X|S and PC. It is a single-player open-world action RPG directed by Hideaki Itsuno. The player creates the Arisen and a permanent Main Pawn, then hires up to two additional support Pawns to form a four-character party. Online connectivity enables Pawn exchange and related asynchronous systems; it does **not** make another human a controllable party member.

The current base game in September 2026 is materially changed from launch through title updates, including performance and usability work. Capcom's September 2026 update improved performance and expanded save/configuration options; current Steam accounts broadly report large gains on some hardware while other users still report poor performance, so "fixed" is hardware-dependent rather than universal.

**Future boundary:** Capcom has announced **Dragon's Dogma 2: Dark Arisen** for **October 9, 2026**, after this research date. It is a paid expansion adding a new story/region/content and is also the vehicle for a Nintendo Switch 2 version containing the main game plus expansion. It is **not yet released** and none of its announced systems are counted as current base-game behavior. [Capcom announcement](https://www.capcom.co.jp/ir/english/news/html/e260610.html).

The player promise is "fantasy-world action simulator" more than checklist open world. Itsuno described the sequel as realizing ideas that were technically infeasible for the first game and as aiming for a world where AI, physics and action generate individual adventures. [PlayStation Blog](https://blog.playstation.com/2023/11/28/dragons-dogma-2-arrives-march-22-2024-on-ps5/).

## R02 — action vocabulary and major mechanics

### Physical action combat

Combat is real-time and strongly vocation-dependent. The Arisen can attack, use vocation skills, sprint, jump, grab, carry/throw smaller entities, revive allies, use items and physically climb large monsters. Encounters therefore have a spatial layer beyond hit-point exchange: climbing to a cyclops's head, targeting exposed weak points, knocking an enemy off balance, setting up elemental effects or dropping a monster from terrain can matter more than trading attacks.

Stamina powers sprinting, climbing and many vocation actions. Running out while clinging to a monster can cause a fall; a powerful vocation skill can deliberately consume most or all stamina. Enemy size, posture, elemental weakness and knockdown state create windows rather than a fixed rotation.

### Vocations and skills

The Arisen can change vocations through vocation guilds after unlocking them. Launch/current base vocations include:

- **Fighter** — sword/shield defense, counters and frontline control.
- **Archer** — ranged physical attacks and targeted shots.
- **Thief** — fast melee, evasion, climbing and burst damage.
- **Mage** — elemental enchantment, healing and utility magic.
- **Warrior** — heavy weapon commitment, charged blows and knockdown.
- **Sorcerer** — slow, large-scale offensive magic.
- **Mystic Spearhand** — Arisen-only hybrid physical/magick control/mobility.
- **Magick Archer** — Arisen-only magical ranged support/offense.
- **Trickster** — Arisen-only indirect/illusion/support play, including manipulating aggro and empowering Pawns.
- **Warfarer** — Arisen-only flexible weapon/vocation mixture at the cost of specialization.

Vocation rank unlocks weapon skills, core skills and **Augments**. Augments learned through one vocation can be equipped while using another, making vocation experimentation a persistent build investment. Vocation Maisters can grant special teachings after relationship/quest conditions are met. [Official Warfarer/Maister overview](https://blog.playstation.com/2024/01/31/new-dragons-dogma-2-trailer-showcases-warfarer-vocation-out-march-22/).

### Travel as gameplay

Walking is the default. Roads contain monsters, travelers, caves, materials, escort events and large-monster interruptions; night sharply reduces visibility and can introduce more dangerous threats. A lantern is therefore a real travel tool.

Two travel shortcuts preserve friction:

- **Oxcarts** run on fixed routes. The player can ride and doze to skip time, but carts can be attacked and destroyed, converting convenience back into an encounter.
- **Ferrystones** teleport the party to active **Portcrystals**. Portcrystals are limited/fixed or placeable, while Ferrystone availability makes teleportation a resource decision. Later 2026 updates substantially soften launch scarcity, including an Eternal Ferrystone route and additional travel conveniences; that is a current-update boundary, not how launch reviewers experienced the game.

### Health attrition, camping and rest

Damage reduces current health; significant damage also creates a **Loss Gauge** that lowers how much maximum health can be restored through ordinary healing. Proper rest at an inn or camp restores that long-term loss. This means a party can win several fights while becoming strategically less able to survive the next one.

Camping sites let the party rest in the wild using a camping kit, manage the expedition and cook food. Inns provide another full-rest/save route. Time of day advances, changing lighting, NPC availability and danger.

## R03 — Pawns, items, equipment and composition

### Pawn party as the central "equipment" decision

The Arisen's **Main Pawn** is created by the player and levels alongside the campaign. Up to two support Pawns are recruited through the Rift/world. Support Pawns retain the level/build their creator gave them rather than leveling permanently with the hiring player, so an expedition naturally outgrows hired companions and motivates replacement.

Pawns differ through vocation, learned skills, equipment, inclination, specialization, knowledge and their creator's customization.

Capcom's official manual defines four inclinations:
- **Kindhearted** prioritizes aid/support and stays near the Arisen.
- **Calm** emphasizes survival, defense/evasion and can discard items it judges unnecessary.
- **Simple** explores/gathers and may gift found items.
- **Straightforward** aggressively spots and rushes enemies, including large monsters.

[Official Pawn manual](https://game.capcom.com/manual/dd2/en/ps5/page/4/2).

Specializations add utility behaviors such as translating Elvish or using curatives/logistics, while Pawn badges and experience can improve situational knowledge. Itsuno specifically described Specializations, Pawn Quests and badges as additions intended to make individual Pawns feel more distinct and useful to borrowers. [Developer interview](https://blog.ja.playstation.com/2024/03/06/20240306-dragonsdogma2/).

### Equipment and resources

Weapons and armor are vocation-gated and can be enhanced through regional smithing styles with different tradeoffs. Rings add modifiers. Carry weight is shared pragmatically across the party because items can be handed to Pawns.

Important consumable/material families include:
- curatives and status remedies;
- stamina restoratives;
- food, some of which ages/spoils and can be combined before deterioration;
- camping kits;
- Ferrystones and placeable Portcrystals;
- Wakestones assembled from shards, which can revive the Arisen and many dead NPCs;
- crafting/combinable plants, ores and monster parts;
- Rift Crystals, tied especially to Pawn systems;
- Wyrmslife Crystals and late-game equipment/economy.

The inventory is therefore not only combat loot: travel, corpse recovery, crafting, time and Pawn logistics all consume or transform carried objects.

## R04 — progression, economies, failure and time

### Character progression

Experience raises character level/stats. Discipline Points and vocation use increase vocation rank and unlock skills/augments. Changing vocations can dramatically alter moment-to-moment verbs while retaining learned cross-vocation Augments.

The Main Pawn has its own level/vocation progression and equipment. Borrowed support Pawns create a **social replacement loop**: keep beloved companions despite falling behind, or replace them with stronger Pawns created by other players.

### Multiple currencies and scarcity

- **Gold** buys equipment, services, inns and travel.
- **Discipline Points** buy vocation abilities.
- **Rift Crystals** support Pawn recruitment/services, especially when hiring above the Arisen's level.
- **Wyrmslife Crystals** become important in late-game/special equipment exchange.
- **Time/daylight** is itself a resource because quests and NPC states can change and nights are dangerous.
- **Recoverable maximum health** is an expedition resource because the Loss Gauge accumulates until full rest.

### Save/failure

The game historically uses restrictive autosave/manual/inn-rest recovery compared with conventional RPG save scumming. That made bad travel outcomes unusually consequential in launch reviews; Digital Trends recounts losing substantial progress after an emergent death. 2026 title updates add more save flexibility, so the current experience should not be described solely through launch restrictions.

Wakestones can reverse many deaths, including important NPCs, but they are finite enough to make death recovery a choice.

### New Game+ and late game

New Game+ preserves much acquired character/equipment progression while restarting world/story state, but the base game historically lacks substantial enemy scaling, a common criticism in current Steam reviews. **Major story spoilers:** the postgame **Unmoored World** changes the geography/rules and introduces a constrained endgame progression with different priorities. It is more than a harder copy of the ordinary map.

## R05 — worked interactions and concrete situations

These are rules-based illustrations unless attributed.

### Case 1 — the borrowed Pawn knows the road

**Intention:** find a quest destination the player has never visited.  
**Conditions:** a hired Pawn has learned that quest/location in another Arisen's world.  
**Actions:** select/follow the Pawn's offer to guide.  
**Interaction:** another player's prior experience appears as AI navigation/dialogue rather than as a human teammate.  
**Result:** asynchronous social knowledge reduces map-marker dependence.  
**Limit:** Pawn guidance can be imperfect, outdated for the current quest state or simply absent.

### Case 2 — a griffin destroys "fast" transport

**Intention:** save time by taking an aerial ropeway/other convenient traversal route.  
**Conditions:** the world simulation spawns a large flying threat.  
**Actions:** travel normally.  
**Interaction:** the monster collides with/attacks the conveyance.  
**Result:** a convenience system turns into a lethal emergent event.  
**Evidence:** TechRadar's reviewer describes a griffin destroying a Battahl ropeway and killing the party; Digital Trends records a comparable unexpected transportation disaster. [TechRadar](https://www.techradar.com/gaming/dragons-dogma-2-review).

### Case 3 — the Pawn composition compensates for the Arisen

**Intention:** play an aggressive melee vocation without giving up healing/ranged coverage.  
**Conditions:** Arisen is Thief/Fighter/Warrior.  
**Actions:** recruit a Mage Pawn plus ranged/control support.  
**Interaction:** AI companions cover missing roles automatically.  
**Result:** class choice remains expressive without demanding manual control of four characters.  
**Next decision:** replace a lower-level Pawn or keep a familiar one with useful knowledge.

### Case 4 — Loss Gauge turns victory into retreat

**Intention:** finish a distant cave after several roadside fights.  
**Conditions:** party has healing items but maximum recoverable health has been reduced.  
**Actions:** press on or seek camp/inn.  
**Interaction:** ordinary healing cannot restore the lost maximum.  
**Result:** the player may camp before the dungeon despite technically "winning" every earlier encounter.  
**Lesson:** attrition survives between battles.

### Case 5 — climb the monster instead of attacking its legs

**Intention:** stagger/disable a cyclops or ogre efficiently.  
**Conditions:** stamina and safe grab opportunity.  
**Actions:** grab/climb body, reach a weak point/head, attack while Pawn party distracts it.  
**Interaction:** character physics, stamina and monster animation create a moving combat platform.  
**Result:** spatial positioning changes damage/knockdown opportunities.  
**Limit:** exhausted stamina or a violent shake can throw the Arisen off.

### Case 6 — a planned oxcart trip becomes a road expedition

**Intention:** skip a long walk between cities.  
**Conditions:** paid oxcart route.  
**Actions:** board and doze.  
**Interaction:** monsters can ambush and potentially destroy the cart.  
**Result:** the party wakes into combat and may have to finish the journey on foot.  
**Design effect:** travel shortcuts shorten routine without removing world risk.

### Case 7 — Dragonsplague turns asynchronous sharing into danger

**Intention:** hire a powerful Pawn from the Rift.  
**Conditions:** Pawn carries **Dragonsplague**, a contagious Pawn condition.  
**Actions:** travel/rest while missing behavioral/visual symptoms.  
**Interaction:** the disease can spread among Pawns and at advanced state can cause a devastating calamity.  
**Result:** a social import can affect the player's local world.  
**Boundary:** Capcom later adjusted frequency/readability after launch, so early anecdotes must be dated. Capcom publicly described the disease before release as something transferred among Pawns "on their travels between worlds." [PlayStation Blog](https://blog.playstation.com/2024/01/31/new-dragons-dogma-2-trailer-showcases-warfarer-vocation-out-march-22/).

### Case 8 — NPC death changes quest access

**Intention:** continue a quest chain involving a named NPC.  
**Conditions:** that NPC is killed during world combat or another event.  
**Actions:** locate the corpse/morgue and spend a Wakestone, if possible.  
**Interaction:** open-world combat, mortality and narrative state intersect.  
**Result:** resurrection can recover content; ignoring death may close/change an authored route.  
**Limit:** not every state is reversibly repairable and the system can be opaque.

## R06 — Pawns, NPCs, affinity, social systems and multiplayer

### Pawns learn and travel between players without human co-op

The Main Pawn is persistent to its creator but can be hired asynchronously into other worlds. On return, it can bring Rift rewards, gifts and experiential knowledge. Other players' Pawns can guide routes, call out chests/places, recognize monster tactics and comment on differences between worlds.

This creates the **feeling of a networked party culture** inside a single-player game. Capcom's 2023 hands-on material describes knowledgeable Pawns hinting at treasure locations and guiding the player; the 2024 developer interview says the team deliberately strengthened guidance and letting Pawns take over chores users might find tedious. [PlayStation hands-on](https://blog.playstation.com/2023/09/26/dragons-dogma-2-hands-on-report-with-capcoms-upcoming-ps5-action-rpg/).

Pawn **Quests** let creators attach objectives/rewards to their Main Pawn for hirers, adding an explicit asynchronous exchange loop.

### NPCs and affinity

Many town/world NPCs have daily positions/schedules and can die persistently. Affinity can rise through quests, gifts and interactions, affecting greetings, escort requests and some story/romance outcomes. The breadth is ambitious but depth uneven: PC Gamer praises world systemic ambition while criticizing flat scripted NPC/romance interactions.

### Monsters as world actors

Large and small monsters can attack travelers, fight near settlements, interrupt transport and collide with other systems. They do not exist only inside fenced combat arenas, which is why the same road can produce substantially different trips.

### Multiplayer boundary

Storefront/platform metadata lists one player. Pawns are shared online, but **no human-controlled cooperative party exists in Dragon's Dogma 2**. Pawn exchange is asynchronous persistence, not conventional multiplayer.

## R07 — art, audio, interface and feel

Capcom uses RE Engine for a grounded fantasy aesthetic, high-detail character creation and physics-heavy creature interaction. Official pre-release material says the character creator uses photogrammetry-informed technology and supports both humans and beastren. Armor, vocation silhouettes and large-monster motion make party roles readable during chaotic fights.

The game deliberately minimizes some modern convenience:
- comparatively sparse quest navigation;
- limited fast travel at launch;
- very dark nights;
- animation/weight in movement;
- contextual Pawn chatter rather than an omniscient route UI.

That supports immersion for players who enjoy expedition friction but becomes tedium for others. Reviews repeatedly split on this exact boundary.

Performance is the biggest presentation caveat. Launch reviews from PC Gamer, RPG Site, Push Square and TechRadar all document frame-rate/CPU problems, particularly in cities. Capcom continued performance updates through September 2026. Current Steam reports range from dramatic improvements to "still unplayable" on particular systems; current technical quality therefore must be described as improved but configuration-dependent, not universally solved.

## R08 — story, world and narrative connection to play

**Spoiler-light:** the Arisen survives an encounter with the Dragon after losing their heart and becomes a figure with supernatural authority over Pawns. In Vermund, a political conflict centers on a false Sovran whose claim challenges the Arisen. Battahl provides a culturally distinct kingdom where Pawns and the Arisen's role are viewed differently.

The authored plot is frequently criticized as thinner than the world simulation. Dragon's Dogma 2's stronger narrative engine is often **the journey between quests**: which Pawn led the party, what giant monster interrupted the road, whether night fell, who survived, and what was lost.

**Major spoilers:** the apparent "slay the Dragon and reclaim rule" structure sits inside a recurring metaphysical cycle. The true ending can open the **Unmoored World**, physically transforming the world and reframing the Arisen's role. The late game therefore makes world-state transformation—not only a final cutscene—the narrative consequence.

The disconnect is instructive: a game can generate excellent *player stories* while its scripted political cast feels underdeveloped. PC Gamer, Digital Trends and current Steam reviews all articulate versions of that split.

## R09 — production and development

Dragon's Dogma 2 was developed by Capcom under director Hideaki Itsuno, who described the original Dragon's Dogma as a childhood dream combining tabletop-style fantasy and action. For the sequel he explicitly said technological advances allowed ideas that were impossible during the first game. [PlayStation Blog](https://blog.playstation.com/2023/11/28/dragons-dogma-2-arrives-march-22-2024-on-ps5/).

The team retained the first game's Pawn concept instead of replacing it with co-op. Itsuno described the concept as unchanged but strengthened so individual Pawns reflect their creator more clearly; new Specializations, Pawn Quests and badges increase learned individuality. This is useful evidence of iterative design rather than simply "better AI." [Developer interview](https://blog.ja.playstation.com/2024/03/06/20240306-dragonsdogma2/).

RE Engine supports the large open world and dense NPC/physics simulation, but launch CPU/performance problems show the cost of that ambition. Digital Trends' technical analysis found the PC game unusually CPU-heavy for RE Engine. [Technical analysis](https://www.digitaltrends.com/computing/dragons-dogma-2-pc-performance-best-settings/).

Capcom continued title updates after launch and says the upcoming Dark Arisen expansion is being developed in response to broad main-game feedback, with accessibility and additional content as explicit goals. That future expansion should be analyzed after release rather than treated as already-delivered remediation.

## R10 — marketing, distribution, promotion and virality

The clearest marketing hook was **"adventure with other players' Pawns in a single-player world."** Capcom's showcase material foregrounded the Arisen/Main Pawn character creator, the physical open world, new vocations and AI/physics rather than promising co-op.

Before launch, Capcom released a free Character Creator & Storage tool, letting players create the Arisen/Main Pawn in advance and import them into the game. Character creation itself became shareable content, with players recreating recognizable fictional/public characters; this is a concrete example of a creation tool doubling as promotion.

The March 2024 release covered PS5, Xbox Series and PC. The future October 2026 Dark Arisen package expands to Nintendo Switch 2 as part of Capcom's stated multiplatform strategy. [Capcom](https://www.capcom.co.jp/ir/english/news/html/e260610.html).

Launch discourse was also shaped by performance problems and day-one optional DLC/microtransactions. Reviews such as Push Square criticized these even while highly praising the game. Those controversies are distribution/reception facts; current player claims that every disliked transaction has been "removed" are not adopted without storefront verification.

## R11 — commercial and participation context

Capcom's current Platinum Titles table lists **4.20 million Dragon's Dogma 2 units**. [Capcom Platinum Titles](https://www.capcom.co.jp/ir/english/business/million.html).

Capcom separately states that the **Dragon's Dogma series** exceeded **14 million cumulative units as of March 31, 2026**. That series figure includes other Dragon's Dogma releases and must not be mislabeled as Dragon's Dogma 2 sales. [Dark Arisen announcement](https://www.capcom.co.jp/ir/english/news/html/e260610.html).

The base commercial model is premium software plus optional DLC. Dark Arisen is an upcoming paid expansion; Nintendo Switch 2 receives a combined package. Online Pawn infrastructure adds a service obligation even though the game is single-player.

Steam participation remains active in September 2026, with current reviews heavily discussing the September performance update and upcoming expansion. Review counts/concurrency are participation signals, not sales or retention rates.

## R12 — reception, five written reviews and Steam evidence

### Five independent substantive reviews

**Fraser Brown — PC Gamer, March 20, 2024.** Brown praises the chaotic open-world adventure, combat and Pawns, including their learned guidance and personalities, while criticizing major-city performance and finding scripted NPC/romance writing much flatter than the systemic journey. [Review](https://www.pcgamer.com/games/rpg/dragons-dogma-2-review/).

**Richard Wakeling — GameSpot, March 20, 2024.** Wakeling argues limited fast travel is a strength because roads generate discovery and unscripted encounters. He praises combat/vocation variety and the player-created Pawn system, framing the sequel as a fuller realization rather than a conventional modernization of the original. [Review](https://www.gamespot.com/reviews/dragons-dogma-2-review-pawn-stars/1900-6418199/).

**James Galizio — RPG Site, March 20, 2024.** Galizio praises vocation combat, autonomy, quest/world reactivity and the willingness to preserve strange friction, while documenting significant performance cost. [Review](https://www.rpgsite.net/review/15622-dragons-dogma-2-review).

**Rhys Wood — TechRadar, March 20, 2024.** Wood praises the world, distinct vocations and Pawn system and gives a specific account of a griffin destroying a ropeway mid-trip. The main criticism is inconsistent console performance plus occasional enemy frustration. [Review](https://www.techradar.com/gaming/dragons-dogma-2-review).

**Robert Ramsey — Push Square, March 22, 2024.** Ramsey strongly praises discovery, roads, dynamic combat and Pawns while criticizing frame rate, dialogue animation, fetch quests and unnecessary microtransactions. [Review](https://www.pushsquare.com/reviews/ps5/dragons-dogma-2).

**Additional contrasting account:** Tomas Franzese at Digital Trends praises emergent moments, vocation/Pawn creativity and dangerous exploration but criticizes slow onboarding, performance and restrictive saves, including losing substantial progress after an unexpected traversal death. [Review](https://www.digitaltrends.com/gaming/dragons-dogma-2-review/).

### Current Steam helpful/player sampling

The September 2026 helpful-week surface shows a major version effect. Positive players say the latest updates dramatically improved frame pacing/performance and praise combat, vocations, exploration and Pawns. Some of the same positive reviews still call story, movement, enemy variety or late-game difficulty weak. [Current reviews](https://steamcommunity.com/app/2054970/reviews/).

A current negative review with more than 60 displayed hours says performance remains "utterly unplayable"; other community threads show hardware-dependent gains ranging from almost none to very large. These accounts prevent turning improvement into a universal claim.

Current players also criticize late-game enemy scaling, repetitive/underrewarded exploration and story weakness even when recommending the game. Another detailed player specifically calls improved Pawn map memories/AI one of the sequel's clearest gains over the first.

**Sampling limit:** Steam helpful/recent sorting is qualitative and version-sensitive, not representative prevalence. Current displayed playtime is not assumed to equal hours at review publication unless Steam states it.

### Reception synthesis

Consistent praise:
- tactile large-monster action;
- vocation differentiation;
- Pawn individuality and asynchronous knowledge;
- unpredictable road travel and discovery;
- strong character creator/world atmosphere.

Consistent criticism:
- launch/current technical performance variance;
- underdeveloped authored story/NPC romance;
- enemy/reward variety and late-game balance;
- deliberately inconvenient travel/save systems for players who do not value friction;
- launch microtransaction optics.

The key audience split is whether **friction produces adventure** or merely delays desired content.

## R13 — transferable inspiration and limits

1. **Share agents, not players.** A persistent companion can carry another player's knowledge/personality into a solo world without requiring synchronized co-op.
2. **Let companions learn geography and events.** "I know this route" is more socially evocative than a static waypoint.
3. **Make AI personality behavioral.** Inclinations alter support, aggression, scavenging and even inventory decisions—not only dialogue flavor.
4. **Turn travel into encounter space.** Limited shortcuts make the road a gameplay layer rather than dead time.
5. **Carry attrition across fights.** The Loss Gauge makes several individually won battles accumulate into expedition pressure.
6. **Allow physical interaction with large entities.** Climbing/grabbing makes creature scale mechanically meaningful.
7. **Let asynchronous systems carry risk as well as benefit.** Dragonsplague is an extreme example of a borrowed companion changing the local world.
8. **Give world NPC mortality teeth.** If named characters can die, resurrection/recovery and quest states become systemic rather than purely scripted.
9. **Use vocation switching to encourage breadth.** Cross-vocation Augments reward trying different identities without permanently abandoning a preferred build.

### Limits

- Companion autonomy can become chatter, bad pathing or unwanted action if player intent is not legible.
- Harsh travel friction works only when roads repeatedly produce worthwhile variation.
- Restrictive saves amplify technical bugs and accidental failure.
- Persistent NPC death requires strong recovery/clarity or players may lose content unknowingly.
- Asynchronous diseases/network effects can feel unfair when diagnosis is obscure; Capcom later adjusted Dragonsplague readability/frequency.
- Emergent stories do not substitute for satisfying authored characters when the game also foregrounds political/romance plots.
- Performance matters disproportionately in simulation-dense towns where many NPCs/AI states are active.

The transferable principle is **make companions and journeys stateful enough that the trip develops history of its own**.

## R14 — annotated sources, preservation and requirement map

### Primary/developer/current sources read

- [Capcom — Dark Arisen announcement, June 10 2026](https://www.capcom.co.jp/ir/english/news/html/e260610.html) — October 9 future release, new platform, expansion positioning, series 14m milestone.
- [Capcom Platinum Titles](https://www.capcom.co.jp/ir/english/business/million.html) — current 4.20m Dragon's Dogma 2 unit milestone.
- [Official Pawn manual](https://game.capcom.com/manual/dd2/en/ps5/page/4/2) — four Pawn inclinations and behavior.
- [PlayStation/Capcom showcase](https://blog.playstation.com/2023/11/28/dragons-dogma-2-arrives-march-22-2024-on-ps5/) — single-player-with-Pawns positioning, character creation, release and Itsuno's design statement.
- [PlayStation hands-on](https://blog.playstation.com/2023/09/26/dragons-dogma-2-hands-on-report-with-capcoms-upcoming-ps5-action-rpg/) — Pawn location knowledge and world-monster behavior.
- [PlayStation/Capcom Warfarer article](https://blog.playstation.com/2024/01/31/new-dragons-dogma-2-trailer-showcases-warfarer-vocation-out-march-22/) — vocation Maisters and official pre-release Dragonsplague description.
- [Japanese PlayStation developer interview](https://blog.ja.playstation.com/2024/03/06/20240306-dragonsdogma2/) — Itsuno on strengthening Pawn individuality, Specializations, Pawn Quests/badges and guidance; Japanese-language primary interview.
- [Digital Trends technical analysis](https://www.digitaltrends.com/computing/dragons-dogma-2-pc-performance-best-settings/) — secondary measured launch PC/CPU performance context.

### Critical/player sources read

Six independent written reviews are summarized in R12 (PC Gamer, GameSpot, RPG Site, TechRadar, Push Square, Digital Trends); five are required, the sixth adds save-system contrast. [Steam current reviews](https://steamcommunity.com/app/2054970/reviews/) supplied current post-update praise and criticism.

### Viewing routes

Capcom/PlayStation pages embed trailers showing vocations, character creation and Pawns. They are useful visual routes, but this dossier does not claim scene-specific video findings where the written article did not independently establish them.

### Preservation check

G127 is a newly curated subject. Direct branch checks found no prior dossier, game chapter or dedicated Pawn mechanics file for Dragon's Dogma 2. This dossier therefore creates a new owner rather than overwriting earlier research. The original Dragon's Dogma is not treated as interchangeable with the sequel. The October 2026 Dark Arisen expansion remains future. Packet-wide P01–P05 reconciliation remains separate.

### Requirement map

| Requirement | Coverage |
| --- | --- |
| R01 | Current base game, platform, update and future Dark Arisen boundaries |
| R02 | Combat/climbing, vocations, travel, health/rest |
| R03 | Pawn composition, inclinations, equipment, resources |
| R04 | Level/vocation/Main Pawn progression, currencies, save/failure, NG+/endgame |
| R05 | Eight worked systemic travel/combat/Pawn/NPC cases |
| R06 | Asynchronous Pawn knowledge, NPC mortality/affinity, monster actors, no co-op |
| R07 | RE Engine presentation, character creation, friction and dated performance |
| R08 | Arisen/Dragon framing, player stories and spoiler-marked late world state |
| R09 | Itsuno's sequel goals, Pawn iteration, RE Engine/performance and ongoing updates |
| R10 | Pawn/creator marketing, Character Creator, platform expansion and launch discourse |
| R11 | DD2 4.20m and separate 14m series milestone |
| R12 | Six written reviews plus current Steam praise/criticism |
| R13 | Transferable asynchronous-companion/travel patterns and failure modes |
| R14 | Annotated evidence, current/future distinction, preservation and map |

**Completion review:** R01–R14 are substantively covered; Pawn exchange is never mislabeled as direct multiplayer; Dark Arisen is explicitly future as of September 26, 2026; eight worked cases span Pawns, travel, combat, attrition, network risk and NPC persistence; six independent reviews and current Steam samples were read; official DD2 sales are separated from series sales; and no prior DD2 owner was overwritten.

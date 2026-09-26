# G92 — Final Fantasy XV

**Research pass:** September 26, 2026. **Scope:** the 2016 game, its significant free updates, Royal/Windows editions, playable Episodes and Comrades; cancelled content and non-game continuations remain separate. **Purpose:** a gameplay/production reference, not accepted OpenLegend design.

[Library](../README.md) · [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Previous: Final Fantasy XIV](final-fantasy-xiv.md)

## 1. Identity, player promise, and edition boundaries

The original game released **November 29, 2016 on PS4 and Xbox One**. Its central promise is a journey with prince Noctis and three friends through a contemporary-looking fantasy world while seeking the strength to reclaim his homeland. The party, not a player-created protagonist or a freely assembled roster, is the persistent identity of the main campaign. Publisher language about revolutionary technology is promotional positioning, not a measured comparison. [S1](#s1)

The useful design tension is between **getting somewhere important** and **enjoying being together along the way**. Driving, stopping for food, fishing, looking at photographs and helping strangers supply a very different rhythm from urgent royal destiny. The research below asks when these activities reinforce the relationship and when they become friction; it does not assume that the presence of optional content makes either interpretation correct.

| Version or associated work | Boundary that matters |
| --- | --- |
| November 2016 launch | Launch reviews describe Noctis-led combat and the original campaign/content. Later control options and expanded scenes cannot be assumed. |
| Free updates | Character switching, the alternate Chapter 13 route and off-road Regalia are later additions. Multiple simultaneous hunts were also enabled after launch. |
| Royal Edition / Windows Edition, March 2018 | Expanded Insomnia, the controllable Royal Vessel, Armiger Unleashed and first-person play supplement the original game and season-pass material. Royal Pack and a complete edition bundle are not interchangeable purchasing concepts. |
| Episode Gladiolus, Prompto and Ignis | Separate playable perspectives with distinct combat emphases; not merely new outfits for the original protagonist. |
| Comrades | A separate customizable-avatar, mission-based cooperative campaign; not drop-in cooperative play through Noctis's entire main story. |
| Episode Ardyn, March 2019 | A separately released prequel episode; the original season-pass wording does not establish its inclusion. |
| Cancelled Dawn of the Future episodes | Aranea, Lunafreya and Noctis episodes were cancelled. Their concepts must not be described as delivered DLC. |
| The Dawn of the Future novel | A published alternate continuation, not a playable completion of those cancelled episodes. |

The edition table combines the publisher's product description, its Royal interview, the Comrades release announcement and the explicit cancellation statement. In particular, the old hunt guide's one-contract limit is superseded by the **November 15, 2017** update; it is not silently carried into the current mechanics account. [S2](#s2) [S3](#s3) [S31](#s31) [S41](#s41) [S37](#s37)

Tabata deliberately avoided the name **Complete Edition** for Royal while more content was planned. He described first-person warp-striking and chocobo riding as difficult implementation work, and underwater exploration as a wish displaced by other priorities. A developer's wish is not a shipped feature. The Royal additions also make the previously underexplored ruined capital a larger playable endgame space rather than merely adding numerical difficulty. [S3](#s3)

**Retired features:** the official April 1, 2020 notice, effective June 24, removes PC avatar replacement, other-player ghosts, user/official treasure, user photographs and online Mod Organizer builds. It separately ends **Origin Comrades matchmaking and Steam–Origin matching**, while retaining NPC participation. This is not evidence that all Steam Comrades play ended. Present matchmaking population, platform reliability and mod compatibility were not tested. [S21](#s21)

## 2. What the player does: combat, progression, and tactical control

### Action vocabulary and resources

Noctis moves, sprints, jumps, selects targets, changes equipped weapons, attacks, evades, warps, uses objects and orders a companion technique. The distinction between initiating an action and managing its conditions matters more than simply calling this an action RPG.

**Warp-striking** spends MP to close distance and attack; **point-warps** use designated locations to recover MP and create breathing room. Phasing avoids eligible attacks at an MP cost, while prompted parries create counters. Techniques can also provide protected animation windows. Position is therefore part of resource management: an escape point is useful because it changes what Noctis can afford next, not only because it is farther from the enemy. These are documented player-observed rules, not reconstructed collision or AI code. [S9](#s9)

Four weapon slots support rapid loadout changes. Eligible rear attacks can become **Blindside link-strikes** when a suitable companion is nearby; proximity, weapon and target state matter. Later **Cross Chains** begin from a warp-strike against a Vulnerable enemy and proceed through timed cooperative attacks. Core attributes include HP, MP, Strength, Vitality, Magic, Spirit and resistances. **Danger** at zero current HP allows a recovery window while maximum HP drains; **Stasis** follows depleted MP and constrains Noctis's options. Neither is simply another name for instant death. [S10](#s10)

The player is not choosing from permanently separate classes. **Ascension** spends AP on categorized development paths. Airstep and its successors change aerial movement; Osmostrike connects aerial hits to MP recovery. Teamwork unlocks conditional ally behavior. Ignis's **Regroup** and Gladiolus's **Royal Guard** are recovery/protection choices rather than interchangeable damage buttons. Later character-control nodes open direct play as the other friends, but do not erase their separate kits. [S11](#s11)

**Wait Mode** stops the action under its activation conditions and supports target inspection. It is an alternative rhythm, not conversion into a conventional turn-based game. Roberts values its breathing space; Dwan finds that it can interfere with combat's flow. The disagreement is useful: an accessibility or control option can help one player while making the same encounter less satisfying for another. No full accessibility certification is implied. [S5](#s5) [S6](#s6)

### Distinct forms of combat power

| Form | What it asks the player to manage | Important limit |
| --- | --- | --- |
| Ordinary weapons | Range, movement, directional combinations, enemy susceptibility and equipped effects. | A higher attack number does not summarize every weapon's behavior. |
| Royal Arms | Special moves and equipped benefits, often with HP costs or statistical penalties. | Royal ancestry does not make every weapon an unconditional upgrade. |
| Armiger | A built-up resource enables a temporary royal-weapon assault and associated cooperation. | Ordinary Armiger and Royal's Armiger Unleashed are distinct systems. |
| Elemancy | Gather energy, choose a catalyst, prepare a flask and expend limited casts. | Not a reusable unrestricted spell list or freeform invention system. |
| Ring of the Lucii | Separate Death, Holy and Alterna actions with their own MP, timing and resistance rules. | The 1.06 changes make launch descriptions of its effectiveness historical. |
| Astrals | Spectacular help made available under particular encounter conditions. | They are not ordinary companions who can always be summoned on command. |

The distinctions are supported by the mechanics/inventory guides, edition description and launch criticism. Brown's frustration with summon access is an opinion about that conditional availability, not a complete table of summoning probabilities. [S10](#s10) [S12](#s12) [S29](#s29) [S2](#s2) [S4](#s4)

## 3. Objects, equipment, magic, and economic chains

### Gear is a set of rules, not only a ladder

The inventory spans swords, greatswords, polearms, daggers, firearms, shields and machinery, plus attire and accessories. **Royal Arms** add distinctive behavior: the Trident of the Oracle leaves damaging afterimages, while the Shield of the Just supports guarding/recovery but reduces other attributes. Their attack costs and tradeoffs matter. The **Ring** makes Death resistance relevant, gives timed Holy a different payoff from holding guard, and makes Alterna consume the full MP pool. The guide explicitly records patch 1.06's changed effectiveness. Attire is not always purely cosmetic: the jacket/no-jacket variants can exchange HP emphasis for offensive stats. [S29](#s29)

Rather than treating every pickup as saleable junk, the player must distinguish equipment, curatives, ingredients, fish, elemental energy, catalysts, upgrade materials and quest objects. Some categories intersect. The practical question is often **what else could this object become?** Donaldson specifically criticizes how poorly the importance of some saleable loot is communicated. That is an onboarding problem in a compositional economy, not evidence that composition itself is absent. [S7](#s7)

### Elemancy: a bounded recipe grammar

Fire, Ice and Lightning energy are combined into limited-use flasks. An absolute majority determines a single-element spell; without one, **Unicast** randomizes the element. Catalysts can change potency, extra effects and yield. A **Potion** produces Healcast, an **Antidote** Venomcast and an **Elixir** Tricast. Other families include Expericast, resource-saving Freecast and Blastcast with a self-HP penalty. Multicast does not guarantee every possible extra cast. These are explicit recipes, not permission to describe an arbitrary desired spell and obtain it. [S12](#s12)

Friendly-fire risk makes choosing the moment and area of a spell part of party management. Brown describes elemental effects harming or disrupting allies as well as enemies. The important design distinction is between an impressive area effect and one whose consequences remain readable while several companions are moving through it. This observation does not establish universal physical simulation of fire, water or scenery. [S4](#s4)

### Upgrading as a journey through other systems

**Cid** accepts eligible weapons and designated materials. The Engine Blade develops through Rusted Bit and Glass Gemstone requirements before its final **Sturdy Helixhorn** requirement. The latter comes from breaking a Duplicorn's horn rather than merely treating every kill as equivalent. The guide also gives multiple acquisition routes for some materials, including a Survival find. A workshop quest can therefore turn exploration, enemy-part targeting and a companion proficiency into alternative routes toward the same equipment goal. [S30](#s30)

Gil is spent on such services and supplies as lodging, food, equipment, transport-related needs and minigames; hunts and selling goods provide money. This is an authored shop/reward economy, not a market of player-owned businesses. The guide/review evidence does not establish commodity prices emerging from independently simulated civilian demand. Inventory scarcity is predominantly about useful possessions, costs and preparation rather than managing a residential warehouse or a grid-based encumbrance puzzle. [S13](#s13) [S25](#s25) [S31](#s31) [S32](#s32)

A small **Caem garden** supplies a different conversion chain: seeds, rest and harvested carrots can lead to trades for items. A cat-feeding quest connects fishing with an NPC's preparation of the catch. These are bounded authored interactions. They do not mean that every resident has simulated hunger or that the player can establish arbitrary agricultural settlements. [S33](#s33)

## 4. Rest, food, personal skills, and the passage of time

**Experience is banked and settled at rest.** Camps apply the normal amount; paid lodging can multiply it. The **Nixperience Band** prevents settlement while equipped, allowing the party to camp without cashing out the bank. It must be removed before deliberately using a lodging multiplier. Thus “rest” participates in recovery, progression and the pacing of a journey, and an equipment rule can separate those purposes. [S13](#s13)

**Ignis cooks at Havens**, not at every lodging. Recipes come from cooking growth, discovered ingredients, written material, restaurant experiences and other encounters. Sometimes gathering an ingredient, rather than merely buying it, is the relevant discovery trigger. Meals provide temporary benefits, and favorites interact with companion techniques. The older guide's recipe total is not imported as the final Royal catalog. [S14](#s14)

**Gladiolus's Survival** grows through travel on foot rather than car or chocobo riding. It can generate an additional item after a completed battle, with better possible finds at higher ranks; running away is not the same trigger. This is a useful companion contribution, but it is not a hunger/thirst simulation or an autonomous wilderness survival planner. [S15](#s15)

**Noctis's Fishing** has its own equipment and execution demands. Rod, reel, line and lure interact with a fish's stamina, interest and struggle. The player must follow movement, manage tension and stop reeling at the right times. Breaking the line loses the lure. Some catches yield ingredients while others yield non-edible items; the collection is not synonymous with food production. [S26](#s26)

**Prompto's Photography** is developed separately from attack strength. He takes pictures during the journey; resting presents a selection for review and saving. Snapshot provides a more direct combat-photo action, while skill growth adds capabilities and presentation options. The loop contains both automatic capture and human selection: a companion proposes memories, but the player decides which to preserve. [S27](#s27)

Several different clocks coexist: combat resources, temporary food, day/night conditions, travel, accumulating skill practice, banked experience and the longer main-story sequence. Our interpretation is that their alignment helps make stopping feel like an event rather than only maintenance. Their misalignment can also encourage awkward optimization, such as carrying an experience-control accessory solely to manipulate the reward timing.

## 5. World, traversal, quests, activities, and return goals

### Travel changes what a day contains

The Regalia supplies a road-trip pace with automated and manual driving; later off-road capability must not be confused with the original road restrictions. Discoveries populate the map. Tipsters connect a place to information, meals and hunt contracts. Day/night and sometimes weather affect what can be encountered. Night daemons can erode maximum HP, making a normal current-HP recovery plan insufficient. A decision to remain outside is therefore partly a preparation decision. [S25](#s25) [S2](#s2)

**Chocobos** become rentable after the relevant quest, are called with a whistle and gain benefits through riding. Their development adds speed, stamina and combat-related assistance. They offer off-road exploration and presentation choices, not the breeding/genetics economy of Final Fantasy VII. The guide's original car comparison is historical because the Type-D update later changed that boundary. [S28](#s28)

Royal's controllable boat creates another kind of excursion, including fishing opportunities. Its existence does not mean the game provides underwater exploration: Tabata explicitly identifies that as an unrealized idea. This is a useful distinction between making a route traversable and simulating everything visually adjacent to it. [S3](#s3)

### Activity inventory

| Activity | Concrete structure and reward | Boundary or friction |
| --- | --- | --- |
| Main quests | A chaptered route connects the journey, set pieces and major powers. | Open-world freedom is concentrated in part of the campaign, not every chapter. |
| Hunts | Tipster contracts identify targets and grant hunter-rank stars, gil and items. | Rank and conditions matter; the old one-hunt limit was removed. |
| Sidequests | Deliveries, rescues, photographs, ingredients, specimen collection and specialist requests create reasons to revisit places. | A named requester does not guarantee a meaningful choice or a rich character arc. |
| Royal tombs and ordinary dungeons | Exploration and combat lead to distinctive weapons, loot and story progress. | Many spaces are authored routes rather than generated expeditions. |
| Menace dungeons | Sealed postgame depths change preparation, navigation and attrition demands. | One-way progress can block missed branches; Costlemark forbids ordinary item use. |
| Pitioss | A combat-free puzzle/platforming dungeon demands spatial execution. | Familiar combat movement is not automatically a precise platforming interface. |
| Fishing and chocobo riding | Specialist equipment/practice and route choice provide alternative goals. | Their rewards do not amount to a separate unrestricted life simulator. |
| Justice Monsters V | A pinball-like monster game converts play into prizes. | Different-priced machines have different rewards; it is not the separate mobile game's entire service. |
| Totomostro | Medals are wagered on monster teams, with horns providing limited support during fights. | Condition and odds are not certainty; the player is not freely designing the arena combatants. |
| Photograph collection | A personal record accumulates alongside authored progress. | Automatic shots can be uninteresting; selection is part of the experience. |

This inventory is supported by the distinct activity guides, not inferred from one promotional list. [S7](#s7) [S26](#s26) [S27](#s27) [S28](#s28) [S31](#s31) [S32](#s32) [S33](#s33) [S34](#s34) [S35](#s35) [S36](#s36) [S41](#s41)

**Hunts** are a repeatable combat/reward layer, with first-clear rank progress distinct from simply choosing another field monster to fight. They can make a creature relevant both as a contract and as a source of a needed part. The 2017 update reduces a practical routing burden by allowing several contracts at once. It does not turn the contracts into freely negotiated employment or a persistent faction-reputation model. [S31](#s31) [S41](#s41)

**Menace** includes long branching sequences whose correct forward route can lock the return path. Costlemark's no-item rule makes recovery abilities, food and Healcast more important than a large potion stack. The guide's preparation recommendations are a playstyle, not mandatory minimum levels. **Pitioss** instead contains no enemies and centers on switches, platforms and navigation; the guide specifically notes awkward movement on narrow surfaces. These are different forms of difficulty, not merely two larger health bars. [S34](#s34) [S35](#s35)

In **Justice Monsters V**, elemental monster-balls, charging, switching and interrupting a boss target coexist with bumper-triggered prize opportunities. Chest accumulation determines the external reward when the session ends. **Totomostro** emphasizes choosing a team and intervening with horns rather than performing its attacks directly. Both provide a non-main-combat use for money or a specialized currency, but neither establishes real-money gambling in the game. [S36](#s36) [S32](#s32)

Late purpose can therefore come from completing collections, obtaining a weapon, mastering a dungeon, revisiting an activity or playing a different perspective. The world does not offer unrestricted construction, civilian job selection, a branching diplomacy simulator or a player-run kingdom after its ending. Those absences are important for OpenLegend: a convincing journey through places is not evidence that those places contain a full social simulation.

## 6. Companions, relationships, factions, and AI

The main party has **fixed individuals with different forms of usefulness**. Ignis's meals, Gladiolus's finds, Prompto's pictures and Noctis's fishing distribute competence across everyday life. In combat, unlocked conditional teamwork supplements explicit technique orders. There is no general gambit editor equivalent to Final Fantasy XII, no romance selection among party members and no ordinary system for replacing them with arbitrary recruited citizens. The documented controls are specific rather than an open-ended command language. [S11](#s11) [S14](#s14) [S15](#s15) [S26](#s26) [S27](#s27)

Their social effect is contested. Roberts finds their travel animations and shared routines persuasive; Brown finds their characterization too narrow. This is not a contradiction that a feature checklist can settle. A companion can be recognizable and useful without being psychologically deep, and the player may value those qualities differently. [S4](#s4) [S5](#s5)

The developer's **Prompto's Facebook** GDC abstract explicitly describes a buddy AI taking context-sensitive photographs to let players revisit and share different adventures. Only the written abstract was inspected; the presentation was not watched, and no hidden scheduling, scoring or memory architecture is asserted. Its importance here is the role: an NPC helps preserve a record of experience rather than merely telling the player that an experience occurred. [S16](#s16)

Other people largely participate through authored roles: Cid upgrades, tipsters distribute information/contracts, cooks sell meals, and quest-givers request particular services. The sources establish triggers and availability, not unrestricted daily schedules, privately simulated ambitions or dynamically changing allegiances. Political factions matter greatly to the plot, but the main campaign is not a reputation sandbox in which Noctis can freely join Niflheim and rewrite the war.

### DLC and Comrades: genuinely different kinds of participation

**Episode Gladiolus** shifts toward guarded, committed fighting in the Tempering Grounds with Cor. Blocking is limited, pillars can be used as heavy weapons, and health/failure rules differ from Noctis's ordinary Danger recovery. Camps provide dialogue as well as help with the expedition. This makes a protector's physical style playable; it is not simply Noctis with a larger sword. [S39](#s39)

**Episode Prompto** shifts toward aiming, firearms and scavenged limited-ammunition weapons, with snowmobile travel and Aranea assistance. Its personal identity material occurs during his separation from the party. This paragraph follows a community mechanics reference; it does not claim direct testing of the shooting or camera. The different control emphasis is worth distinguishing from his automated role in the original group. [S46](#s46)

**Episode Ignis** returns to the Altissia crisis from a protector's viewpoint. Fire favors concentrated damage, Ice crowd control and Lightning dispersed targets; Total Clarity changes with the selected element. Its later alternate story route is a distinct branch, not proof that every main-campaign decision branches. The guide warns that its content exposes endgame information despite occurring earlier chronologically. [S40](#s40)

**Episode Ardyn**, announced for March 26, 2019, takes place 35 years earlier. Shadow-Stepping and daemonic powers provide a different traversal/combat identity and a villain-centered historical perspective. This is an actual released episode; the other planned Dawn of the Future episodes are not. [S22](#s22) [S37](#s37)

**Comrades** puts a created Kingsglaive avatar in the period of Noctis's absence, with a Lestallum base, Royal Sigils and cooperative or NPC-supported quests. Its progression links missions to restoring electrical infrastructure and opening further activity. This differs from merely leveling one of the original four friends. [S41](#s41) [S42](#s42)

Its **weapon remodeling** feeds materials into both experience and statistics. For example, a Javelin needs the relevant Vitality threshold before reaching its remodeling level; selecting materials solely for experience can miss the transformation. Later dismantling returns useful components, including meteorites that extend weapon-level capacity. This is a more explicit production/build loop than the main game's Cid request chain. Guide strategies are version-labeled; their recommendation to use an older ruleset is not adopted as necessary or current advice. [S42](#s42) [S43](#s43)

## 7. Worked interactions

**All examples below are constructed from documented rules, not reports of sessions we played.** They span movement, production, progression, food, recovery and memory.

### A. Escape is an investment in the next attack

**Intention:** remain useful rather than exhaust MP in place. **Conditions:** Noctis has spent much of his MP and a designated point-warp is available. **Action:** leave the immediate melee through that point, recover, then choose a new attack. **Interaction:** spatial position replenishes the resource used for both mobility and defense. **Result:** retreat can support another offensive sequence. **Next decision:** return, use a technique or reassess the target. **Limit:** this depends on the encounter's available points; arbitrary scenery is not automatically a valid refuge. [S9](#s9)

### B. One camp, two progression goals

**Intention:** get a useful meal while saving experience for a later lodging multiplier. **Conditions:** the Nixperience Band and ingredients are available. **Action:** equip the band, camp and cook, complete the outing, then remove the band before the chosen paid rest. **Interaction:** an accessory separates cooking from experience settlement. **Result:** a social stop does not immediately cash out the reward bank. **Next decision:** decide whether the lodging cost is worthwhile. **Limit:** forgetting the band at either end defeats the intended timing. [S13](#s13) [S14](#s14)

### C. The target is a horn, not just an HP bar

**Intention:** finish the Engine Blade upgrade chain. **Conditions:** Cid needs a Sturdy Helixhorn and the relevant Duplicorn encounter is accessible. **Action:** target and break the horn, collect the possible drop, then return for the upgrade. **Interaction:** anatomy targeting changes resource acquisition, which changes equipment progression. **Result:** fighting deliberately can serve a workshop objective. **Next decision:** retry if the required drop did not appear or pursue another task while the upgrade advances. **Limit:** breaking the part is an opportunity, not a guaranteed drop. [S30](#s30)

### D. Fishing can become tomorrow's preparation

**Intention:** obtain a cooking ingredient rather than merely catch something. **Conditions:** an edible target and suitable lure are available. **Action:** attract it, manage movement and line tension, then retain the catch for a known recipe. **Interaction:** a minigame supplies a temporary party benefit through Ignis's cooking. **Result:** preparation includes execution skill, not only shopping. **Next decision:** cook for a planned outing or save the ingredient. **Limit:** an incompatible lure, broken line or non-edible catch does not satisfy the same plan. [S26](#s26) [S14](#s14)

### E. A prohibition changes what counts as a healing resource

**Intention:** survive Costlemark's Menace without normal item use. **Conditions:** the party can prepare Healcast and relevant recovery options beforehand. **Action:** build the loadout around permitted healing rather than simply buying more potions. **Interaction:** an encounter rule changes the relative value of spell crafting and passive/party recovery. **Result:** a normally secondary option becomes central. **Next decision:** conserve remaining casts or use an appropriate camp. **Limit:** a workaround does not remove enemy damage or the spell's finite supply. [S34](#s34) [S12](#s12)

### F. Capture first; decide what mattered later

**Intention:** retain something distinctive from an outing. **Conditions:** Prompto has taken pictures and the party reaches a review opportunity. **Action:** inspect the generated selection and save one that evokes a particular moment. **Interaction:** automatic observation becomes a player-curated memory object. **Result:** the record can reflect this journey rather than only the same mandatory cutscene. **Next decision:** keep collecting or revisit the album. **Limit:** capture is selective and imperfect; the system cannot guarantee that it recorded the player's most meaningful event. [S27](#s27) [S16](#s16)

### G. More experience can be the wrong crafting input

**Intention:** remodel a Comrades Javelin. **Conditions:** it has an unmet Vitality requirement and limited levels remaining. **Action:** choose materials that satisfy that statistic before completing the level threshold. **Interaction:** material composition and experience progression constrain each other. **Result:** deliberate sequencing unlocks a different weapon instead of only a higher-level original. **Next decision:** select its later role and enhancements. **Limit:** a material that looks efficient for leveling may consume the remaining opportunity without meeting the requirement. [S42](#s42)

### H. A dungeon tests the wrong kind of familiarity

**Intention:** clear Pitioss using a character already strong in combat. **Conditions:** the route contains narrow platforms and moving obstacles rather than enemies. **Action:** slow down, observe timing and execute controlled jumps. **Interaction:** the same movement controls face a different precision requirement. **Result:** combat power does not bypass the challenge. **Next decision:** retry a missed movement or identify a safer route. **Limit:** unfamiliar camera/movement behavior can create frustration rather than a satisfying test of strength. [S35](#s35)

## 8. Story and worldbuilding — major spoilers

**Spoiler boundary:** the following discusses the Altissia tragedy, Ignis's injury, Noctis's absence and the ending.

The journey begins as travel toward Noctis's arranged marriage to Lunafreya, but Niflheim's attack on Insomnia, Regis's death and the theft of the Crystal turn it into a quest to reclaim power. Royal Arms and the Astrals connect playable acquisition to ancestry and divine obligation. In Altissia, Ardyn fatally wounds Lunafreya during the Leviathan crisis; Ignis is blinded. The party's grief and changed capacities accompany a more constrained train journey. Ardyn is eventually revealed as a corrupted, rejected member of the Lucian line whose revenge is bound to the Starscourge. Noctis learns that cleansing it requires his life. After ten years in the Crystal, he returns to darkness, reunites with his friends and sacrifices himself to restore the light and end Ardyn's curse. This plot outline is a secondary synopsis, not a claim to have reread every scene or the full novel. [S38](#s38)

The most useful connection to play is the contrast between an early road full of possible detours and a later narrowing of freedom. That can make the earlier ordinary time precious: it was not merely filler before the “real” story. It can also make a player feel that the game abandoned the form of exploration they enjoyed. Those are interpretations of the structure, and the reviews show both responses rather than proving one universal effect. [S6](#s6) [S7](#s7)

Ignis's injury is not only a line in a scene. The Chapter 10 guide records changed access to his ordinary techniques and an encounter-specific intervention. A companion's condition therefore changes the party's practical capability. The limitation is equally important: this is an authored event with a controlled subsequent sequence, not a general system in which any injury organically changes every relationship and career. [S45](#s45)

Immediately before the final throne-room approach, Noctis chooses one of Prompto's photographs. A record generated along the journey can enter the authored farewell. This is a particularly strong bridge between personal play history and a fixed ending: the main outcome need not branch for one object inside it to be personally selected. That does not establish a fully emergent narrative; it identifies a bounded place where the player's earlier experience is acknowledged. [S44](#s44)

**Transmedia and alternate endings remain separate.** Kingsglaive and Brotherhood help frame the larger conflict and relationships, while the Episodes fill or revisit particular absences. The cancelled later episodes cannot be retroactively counted as repaired gameplay. The official novel instead follows Ardyn, Aranea, Lunafreya and Noctis through another confrontation with fate. Its English digital and print dates are June 23 and July 14, 2020. Only its publisher description was inspected, not the complete book. [S23](#s23) [S37](#s37) [S47](#s47)

## 9. Presentation, music, interface, and feel

The visual proposition places highly styled companions and enormous fantasy creatures beside roads, diners, vehicles and recognizable leisure. Critics value the landscapes and carefully observed group behavior, while repeatedly criticizing the combat camera when terrain, vegetation or large enemies obscure important information. Attractive environments can therefore be simultaneously a source of attachment and a readability problem. This is attributed reception, not a new visual-performance benchmark. [S4](#s4) [S5](#s5) [S7](#s7)

Food and photographs receive deliberate presentation rather than remaining abstract inventory entries. Their role is not only decorative: the player revisits them at a repeated pause in the day's activity. Our interpretation is that this makes the party's life legible at a human scale, between large battles and political events. Whether that compensates for thin supporting dialogue remains the central reception disagreement.

**Yoko Shimomura's September 28, 2016 interview** describes continuity from Versus XIII, including Somnus, and additional music as XV's scope changed. She discusses writing for specific places, battles and companionship rather than trying to illustrate “realism” in the abstract. She also identifies daypart changes and battle trigger points that govern musical transitions. The accompanying Abbey Road/London Philharmonic performance is documented as an event; its recording was not watched here. [S48](#s48)

The interface places loadout configuration, scanning, inventory crafting and real-time action next to one another. That can be powerful but also interruptive: Donaldson finds preparing magic awkward in the middle of fighting, and Dwan's Wait Mode criticism illustrates how a control aid changes pacing. The Windows review reports dated hardware-dependent differences; those tests do not certify 2026 drivers, machines or storefront builds. [S6](#s6) [S7](#s7)

First-person play is an optional Royal addition, not the camera model assumed by the launch design. Tabata's account of adapting warps and riding is a warning that camera changes affect more than field of view. No claim is made that the game has a modern comprehensive accessibility feature set; this pass establishes concrete options and reported friction rather than an exhaustive audit. [S3](#s3)

## 10. Production history, iteration, and abandoned work

In **Miho Aoyagi's December 22, 2016 interview**, Tabata dates his involvement to around 2012 and distinguishes the demands of a large real-time game from expertise in attractive CG. He describes working backward from a high-end-PC target to identify technical and organizational requirements. The original Versus XIII announcement should not be flattened into ten years of unchanged full production on the same final product. [S17](#s17)

The interview's second part describes growth from fewer than 100 people to several hundred internal/external contributors. It emphasizes clear decision authority, avoiding feedback that merely blocks colleagues, and changing leadership responsibilities with production phases. These are a director's retrospective claims, not an independent demonstration that one management method caused the shipped game's successes or failures. [S18](#s18)

The third part connects simultaneous worldwide release with the intention that players share different journeys. Tabata explicitly sought a position between a fully open-world game and traditional Final Fantasy structure. His rough percentages about achieving that intention are impressions, not participation telemetry. This is useful primary context for the game's hybrid shape, while the critics remain the better evidence for how particular people experienced it. [S19](#s19)

Post-release iteration changed both convenience and content: simultaneous hunts, character control, Chapter 13 alternatives, Royal's finale and separate Episodes. Iteration also ended. In the November 2018 official statement reproduced by Gematsu, brand director **Akio Ofuji** explains that resources were being redirected toward a new AAA project at Luminous Productions, cancelling Aranea, Lunafreya and Noctis while Ardyn continued. The statement does not establish a product-level profit calculation or license us to attribute every cancellation to one person's departure. [S2](#s2) [S37](#s37) [S41](#s41)

The production lesson is conditional: a team can add perspectives and systems after launch, but a long-lived promise creates expectations that may outlast the resources allocated to fulfill it. Royal's name, the planned episodes and the eventual novel illustrate why “complete” should describe a verifiable package rather than an open-ended marketing aspiration.

## 11. Marketing, distribution, community, and economics

The **Uncovered** campaign assembled a media ecosystem: the game, Kingsglaive film, five Brotherhood anime episodes, Justice Monsters V's separate mobile project and the Platinum Demo. Sony's April 5, 2016 account records the Los Angeles event and interviews with Tabata and Takeshi Nozue. Its then-planned September release date is not the actual November launch date. The media offers multiple entry points, but critics' complaints about missing in-game context demonstrate the corresponding dependency risk. [S47](#s47) [S1](#s1)

Photography supplies a small shareable unit: one image can communicate a player's excursion more cheaply than retelling the whole campaign. The GDC abstract establishes that this was an intended role for the buddy-camera system. Any claim that it caused a particular sales increase would require evidence this pass does not have. Community guide-making, personal photos and edition updates are observable activities, not a measured channel-attribution model. [S16](#s16)

| Dated milestone | What the evidence actually says | What it does not establish |
| --- | --- | --- |
| December 1, 2016 announcement | More than **five million first-day units**, explicitly combining initial packaged shipments and digital sales. | Five million verified retail sell-through transactions, concurrent players, profit or development cost. |
| May 17, 2022 report of the official announcement | **Ten million copies worldwide**, with the official Japanese announcement embedded. | A September 2026 total, active players, retention or a comparable revenue-per-player figure. |

The first milestone is a publisher release. The second is secondary reporting reproducing the official announcement; the direct social page did not yield a readable body in this pass. They are kept as dated measures rather than combined with subscription or player metrics from other Final Fantasy games. [S20](#s20) [S49](#s49)

The business structure includes a premium game, edition bundles, a season pass and separately sold additions. No current price is frozen here because platform, territory, discount and bundle change what is actually purchased. No private development budget, product-level margin, cohort retention or break-even threshold was established. Nor does the eventual retirement of selected online functions prove that the standalone campaign ceased to be playable. [S2](#s2) [S21](#s21) [S22](#s22) [S41](#s41)

## 12. Reception: five substantive written reviews

**Method:** the substantive written bodies below were inspected. They cover different editions and dates, across five publications, not five score blurbs about an identical product. Praise and criticism remain attributed. No embedded review video is counted as watched evidence.

**Peter Brown — GameSpot, November 27, 2016.** Values the world, fluid fighting, monster variety and optional challenges, but finds the central story predictable, the friends too narrowly characterized and summons unreliable as a player-controlled resource. His Noctis-only account belongs to launch. An erroneous family-relationship sentence in the review is not used as canonical lore. [S4](#s4)

**David Roberts — GamesRadar+, launch PS4 review.** Finds shared meals, photographs, travel behavior and cooperation unusually effective at making the four friends matter. The wider story lacks context, supporting characters are thin and the camera obstructs fights. His positive response to the ending and companionship contrasts directly with Brown's reservations; the value of everyday characterization is the disagreement, not only the final score. [S5](#s5)

**Hannah Dwan — PC Gamer, March 13, 2018.** Regards Windows/Royal as a more complete and visually impressive version, with a better finale and appealing road-trip interactions. Shallow sidequests, restricted development choices and repetitive extended fights remain. Her SSD/HDD and team hardware observations are explicitly dated tests, not a present-day compatibility guarantee. [S6](#s6)

**Alex Donaldson — RPG Site, November 28, 2016.** Praises grounded companionship, tactical preparation and optional dungeons while emphasizing that this is a game with an open-world portion, not a wholly open campaign. Camera trouble, weak fetch quests, awkward magic preparation and unclear loot importance undermine it. His inference that production changes explain narrative gaps remains a critic's hypothesis rather than inside production evidence. [S7](#s7)

**Mike Epstein — Digital Trends, displayed August 23, 2019.** Likes the world and personable ensemble but finds the plot awkward and some genre-changing set pieces poorly supported by the normal action vocabulary. Streamlined systems can become forgettable, while chaotic fights do not always reward the intended rhythm. The displayed date does not establish a fresh Royal test; apparent franchise/name errors are excluded from the factual account. [S8](#s8)

**Synthesis:** the sample supports a meaningful split between attachment to the journey and dissatisfaction with the larger narrative or repeated tasks. It also separates a mechanically appealing fight from camera, interface and pacing costs around that fight. None of this establishes the proportion of all players who preferred one aspect.

## 13. Helpful Steam player testimony and access limits

**Access record, September 26, 2026:** the main store encountered an age gate. The **Most Helpful (All Time)** community feed was accessible and read. Repeated negative-only routes, an English-language variant and an API route failed. This is an evidence limit, not evidence that negative reviews are absent. No recommended review is relabeled negative to manufacture a balanced sample.

A **June 28, 2023** recommended account dislikes repeated tasks and thin world/narrative material but finds the companions make the time worthwhile. A **September 21, 2018** recommended account similarly criticizes repetitive optional work and abrupt storytelling while retaining affection for the journey and ending; its unfinished-production explanation is not adopted as fact. A **March 7, 2018** account reports successful play on its own hardware while acknowledging other users' issues, and later retracts a claimed frame-rate configuration fix. That retraction is a useful warning against copying player troubleshooting claims uncritically. [S24](#s24)

The accessible evidence is therefore mixed in content despite those recommendation labels. It is a helpfulness-selected historical sample, not a random survey or a measure of current sentiment. Displayed lifetime hours can postdate publication. Technical complaints were not independently reproduced, and the unavailable negative-only sample remains explicitly unavailable.

## 14. OpenLegend implications — hypotheses, not requirements

**Make relationships useful in more than combat.** A cook, photographer, scavenger and fishing partner express a group through things its members repeatedly do. The transferable pattern is distributed competence plus recognizable behavior, not importing these exact characters or hobbies. Its limit is clear in the criticism: usefulness and repetition can produce familiarity without deep characterization.

**Give an agent a role in noticing and preserving experience.** Prompto suggests a companion who helps a player remember a journey. The valuable output is a legible object that can be reviewed, selected and later recalled. This is not the same as adding an invisible memory database. A poor selector could preserve dozens of interchangeable events and miss the moment that mattered.

**Connect resources across activities without obscuring their meaning.** A horn becomes an upgrade, a fish becomes a meal and a curative becomes a spell catalyst. Such chains can make the world feel connected. The cost is inventory anxiety when players cannot tell what is safe to sell or consume. Multiple acquisition routes and clear use information matter as much as the number of recipes.

**Let positioning change options.** A warp point changes the resource situation; an enemy part changes the eventual reward. These create reasons to care about where and how an action happens. The transfer should preserve intelligible rules, not assume that spectacular movement is automatically meaningful agency.

**Attach personal history to an authored moment.** Selecting a journey photograph before the ending shows a bounded way to personalize a fixed narrative. OpenLegend could study which artifacts can enter later scenes without requiring every plot branch to be generated. The danger is a cosmetic callback that claims more causality than the player's actions actually had.

**Keep side systems distinctive and bounded.** Fishing, Pitioss, cooking and Comrades remodeling test different competencies. They can support different moods and roles in one world. But a new activity should not inherit unsuitable controls, misleading rules or an obligation to behave like a full simulation when it is only an authored minigame.

**Do not make optional media responsible for essential coherence.** Multiple entry points can broaden a world and audience; they can also distribute indispensable context across purchases and formats. A complete main experience and clearly optional enrichment are different promises. The eventual cancellation makes that distinction more important, not less.

## 15. Reading routes, preservation, and requirement map

**For mechanics:** start with the combat and Ascension guides, then compare Elemancy, Cid's requests, cooking and Menace. Follow the worked examples as rule explanations rather than claimed observations. Use Comrades' version-labeled guide only for that separate mode.

**For relationships and narrative:** compare Brown and Roberts before reading the photography guide and GDC abstract. Then inspect the Chapter 10 and Chapter 14 references with the spoiler warning in mind. This route separates authored consequences, practical companion usefulness and the player's interpretation of an accumulated record.

**For production and reach:** read all three ITmedia interview parts, the Royal Q&A and the explicit cancellation statement. Compare the launch metric's shipment definition with the later reported copy milestone. The Uncovered and composer interviews document promotional events without claiming causal attribution.

**Viewing pointers:** the Prompto GDC presentation, official Episode Ardyn prologue, Royal/Comrades promotional media and the Abbey Road performance are routes for later viewing. Only the explicitly identified written abstracts/interviews/announcements were inspected here. No timestamps, watched durations, gameplay testing or full-film/book consumption are claimed.

**Preservation and ownership:** this new roster-addition dossier supplements the existing library; it does not replace older `games/`, `mechanics/` or packet material. The prior G81–G91 dossiers remain separate, and the [packet-provenance map](../references/packet-provenance.md) retains the original supplied-file identities. Checkpoint findings have been incorporated with their version/access qualifications rather than silently treating incomplete notes as finished research. The global seven-file preservation and other-branch integration gates remain the ledger's separate work; completion of this added subject does not certify those gates.

| Requirement | Substantive location |
| --- | --- |
| R01 — Identity/scope | Section 1 and the mode boundaries in section 6. |
| R02 — Action inventory | Sections 2–6, including useful absences. |
| R03 — Objects/composition | Section 3, plus cooking, fishing and Comrades. |
| R04 — Progression/economy/time | Sections 2–5, with distinct Danger/Stasis, rest and endgame constraints. |
| R05 — Worked situations | Section 7: eight constructed cases across different systems. |
| R06 — People/AI/social | Section 6, photography and the Comrades boundary. |
| R07 — Presentation/interface | Section 9 and the attributed control disagreements. |
| R08 — Story/play | Spoiler-marked section 8 and the photo/companion consequences. |
| R09 — Production | Section 10; plans, delivered changes and cancellations separated. |
| R10 — Discovery/distribution | Section 11, primary event/intent evidence and causal limits. |
| R11 — Economics | Defined dated measures and missing-private-data boundaries in section 11. |
| R12 — Reception | Five written reviews in section 12 and truthful Steam access/sample record in section 13. |
| R13 — Transfer/limits | Section 14; interpretations remain hypotheses. |
| R14 — Sources/navigation | This section and the annotated register, with source and media-access limits. |

### Annotated source register

All sources accessed **September 26, 2026**. Guides are attributed observations/references, not proprietary implementation evidence. Historical metadata, version recommendations and optimization advice are not automatically current rules. Source bodies or specifically named sections were inspected; exceptions are stated.

<a id="s1"></a>**S1.** Square Enix, [original product](https://na.store.square-enix-games.com/final-fantasy-xv). Publisher identity, premise and release/platform information.

<a id="s2"></a>**S2.** Square Enix, [Royal contents](https://eu.store.square-enix-games.com/final-fantasy-xv). Edition/free-update boundaries; original season-pass content is not all later content.

<a id="s3"></a>**S3.** Lowey Ding interviewing Hajime Tabata, [PlayStation Blog](https://blog.playstation.com/2018/03/06/final-fantasy-xv-director-qa-royal-edition-out-today/), March 6, 2018. Primary Royal-production interview, including an unrealized underwater feature.

<a id="s4"></a>**S4.** Peter Brown, [GameSpot review](https://www.gamespot.com/reviews/final-fantasy-15-review/1900-6416579/), November 27, 2016. Written launch criticism; erroneous lore sentence excluded.

<a id="s5"></a>**S5.** David Roberts, [GamesRadar+ review](https://www.gamesradar.com/final-fantasy-xv-review/). Written launch PS4 criticism; image gallery is not additional observed play.

<a id="s6"></a>**S6.** Hannah Dwan, [PC Gamer review](https://www.pcgamer.com/final-fantasy-15-pc-review/), March 13, 2018. Written Windows criticism and dated hardware tests.

<a id="s7"></a>**S7.** Alex Donaldson, [RPG Site review](https://www.rpgsite.net/review/5107-final-fantasy-xv-review), November 28, 2016. Written launch criticism; production speculation separated.

<a id="s8"></a>**S8.** Mike Epstein, [Digital Trends review](https://www.digitaltrends.com/gaming/final-fantasy-xv-review/). Historical written criticism; displayed date not assumed to prove a new-edition test.

<a id="s9"></a>**S9.** Game8 walkthrough team, [Combat Guide](https://game8.co/games/Final-Fantasy-XV/archives/280849), 2020. Player-observed movement, resource and defense rules.

<a id="s10"></a>**S10.** Lost_Nemo10, [Gameplay Mechanics](https://gamefaqs.gamespot.com/ps4/932981-final-fantasy-xv/faqs/78252/gameplay-mechanics-), version 1.2, July 22, 2021. Controls, cooperation, attributes and status distinctions.

<a id="s11"></a>**S11.** Lost_Nemo10, [Ascension](https://gamefaqs.gamespot.com/ps4/932981-final-fantasy-xv/faqs/78252/ascension). Action development, techniques, conditional teamwork and later switching.

<a id="s12"></a>**S12.** Lost_Nemo10, [Elemancy](https://gamefaqs.gamespot.com/ps4/932981-final-fantasy-xv/faqs/78252/elemancy). Element majority, catalysts and finite casts; coefficients not independently reproduced.

<a id="s13"></a>**S13.** TrueTrophies, [General Hints and Tips](https://www.truetrophies.com/game/FINAL-FANTASY-XV/walkthrough/2). Rest multipliers and Nixperience Band; guide preferences are not mandatory play.

<a id="s14"></a>**S14.** Nathan Garvin/Jarrod Garripoli, [Cooking](https://www.gamerguides.com/final-fantasy-xv/guide/the-basics/skills/cooking). Recipe acquisition, camping, benefits and favorites; old total count excluded.

<a id="s15"></a>**S15.** Same guide team, [Survival](https://www.gamerguides.com/final-fantasy-xv/guide/the-basics/skills/survival). Foot-travel growth and post-battle finds.

<a id="s16"></a>**S16.** Prasert Prasertvithyakarn, [GDC — Prompto's Facebook](https://www.gdcvault.com/play/1024023/Prompto-s-Facebook-How-a). Primary written talk abstract inspected; presentation not watched.

<a id="s17"></a>**S17.** Miho Aoyagi interviewing Hajime Tabata, [ITmedia, part 1](https://www.itmedia.co.jp/business/articles/1612/22/news066.html), December 22, 2016. Primary technical/organizational retrospective in Japanese.

<a id="s18"></a>**S18.** Same interview, [part 2](https://www.itmedia.co.jp/business/articles/1612/22/news066_2.html). Team scale, authority and phase-dependent leadership; retrospective self-report.

<a id="s19"></a>**S19.** Same interview, [part 3](https://www.itmedia.co.jp/business/articles/1612/22/news066_3.html). Worldwide release, sharing and intended hybrid structure; rough estimates not telemetry.

<a id="s20"></a>**S20.** Square Enix, [first-day five-million announcement](https://www.jp.square-enix.com/company/ja/news/2016/html/a1eaa01f1f091ddbb88ca3aabdc2faa843d60b8f.html), December 1, 2016. Explicit packaged-shipment plus digital-sales definition.

<a id="s21"></a>**S21.** Square Enix, [2020 retirement notice](https://blog.jp.square-enix.com/ffxvuniverse/information/category/game/202004news.php), April 1, 2020. Exact PC/Origin/cross-store scope, not an all-platform shutdown.

<a id="s22"></a>**S22.** Square Enix, [Episode Ardyn announcement](https://na.finalfantasy.com/news/1011), February 19, 2019. Release, prequel setting and movement/combat identity; prologue not watched.

<a id="s23"></a>**S23.** Square Enix Books, [The Dawn of the Future](https://squareenixmangaandbooks.square-enix-games.com/en-us/product/9781646090006). Official premise, authorship and English release dates; full novel not read.

<a id="s24"></a>**S24.** [Steam — Most Helpful, All Time](https://steamcommunity.com/app/637650/reviews/?browsefilter=toprated). Selected readable review bodies; repeated negative-only/API access failures retained.

<a id="s25"></a>**S25.** Gamer Guides, [Exploration](https://www.gamerguides.com/final-fantasy-xv/guide/the-basics/gameplay/exploration). Routes, tipsters and day/night rules; launch road restrictions separated from Type-D.

<a id="s26"></a>**S26.** Gamer Guides, [Fishing](https://www.gamerguides.com/final-fantasy-xv/guide/the-basics/skills/fishing). Equipment, lure compatibility, tension and catch types.

<a id="s27"></a>**S27.** Gamer Guides, [Photography](https://www.gamerguides.com/final-fantasy-xv/guide/the-basics/skills/photography). Capture/review/save loop and skill capabilities; old capacity count not generalized.

<a id="s28"></a>**S28.** Gamer Guides, [Chocobos](https://www.gamerguides.com/final-fantasy-xv/guide/optional-content/miscellaneous-info/chocobos). Rental, riding growth, customization and assistance.

<a id="s29"></a>**S29.** Lost_Nemo10, [Inventory](https://gamefaqs.gamespot.com/ps4/932981-final-fantasy-xv/faqs/78252/inventory160). Named gear, Royal Arms, Ring and attire sections; explicit patch changes preserved.

<a id="s30"></a>**S30.** Gamer Guides, [Cid's Sidequests](https://www.gamerguides.com/final-fantasy-xv/guide/optional-content/sidequests/cids-sidequests). Upgrade/material/target-part chains; not every guide estimate independently reproduced.

<a id="s31"></a>**S31.** Gamer Guides, [Introduction to Hunts](https://www.gamerguides.com/final-fantasy-xv/guide/optional-content/hunts/introduction-to-hunts). Rank and reward rules; obsolete one-contract restriction corrected using S41.

<a id="s32"></a>**S32.** Gamer Guides, [Totomostro](https://www.gamerguides.com/final-fantasy-xv/guide/optional-content/miscellaneous-info/totomostro). Medals, teams, condition and limited horn intervention.

<a id="s33"></a>**S33.** Lost_Nemo10, [Side Quests](https://gamefaqs.gamespot.com/ps4/932981-final-fantasy-xv/faqs/78252/side-quests-). Caem gardening and cat-feeding chains; authored triggers, not inferred simulation.

<a id="s34"></a>**S34.** Gamer Guides, [Menace Dungeons](https://www.gamerguides.com/final-fantasy-xv/guide/walkthrough/chapter-15-end-of-the-road/menace-dungeons). One-way progression, Costlemark restriction and alternate recovery; recommended levels not requirements.

<a id="s35"></a>**S35.** Gamer Guides, [Pitioss Ruins](https://www.gamerguides.com/final-fantasy-xv/guide/walkthrough/chapter-15-end-of-the-road/pitioss-ruins-1). Combat-free spatial challenge and movement cautions.

<a id="s36"></a>**S36.** Gamer Guides, [Justice Monsters V](https://www.gamerguides.com/final-fantasy-xv/guide/optional-content/miscellaneous-info/justice-monsters-v). In-game machine, actions and prize system; separate mobile service not conflated.

<a id="s37"></a>**S37.** Akio Ofuji's official statement, [reproduced by Gematsu](https://www.gematsu.com/2018/11/final-fantasy-xv-dlcs-episode-aranea-episode-lunafreya-and-episode-noctis-cancelled), November 2018. Primary cancellation/resource-allocation statement within secondary reporting.

<a id="s38"></a>**S38.** [Wikipedia — Final Fantasy XV, Plot](https://en.wikipedia.org/wiki/Final_Fantasy_XV#Plot). Secondary synopsis used only for the compact spoiler outline; not a primary implementation or economic source.

<a id="s39"></a>**S39.** Jen Glennon, [Player.One — Episode Gladiolus guide](https://www.player.one/final-fantasy-xv-episode-gladiolus-dlc-tips-and-strategies-gilgameshs-trial-591614), March 30, 2017. Firsthand strategy and distinct recovery/control rules.

<a id="s40"></a>**S40.** bover_87, [Episode Ignis](https://gamefaqs.gamespot.com/pc/217648-final-fantasy-xv-windows-edition/faqs/78363/episode-ignis), July 26, 2020 version. Playthrough guide; elemental kit and chronological-spoiler warning.

<a id="s41"></a>**S41.** Square Enix announcement, [Comrades release via Gematsu](https://www.gematsu.com/2017/11/final-fantasy-xv-multiplayer-expansion-comrades-now-available), November 15, 2017. Publisher mode description and simultaneous-hunts update; historical subscription names not current advice.

<a id="s42"></a>**S42.** GameFAQs, [Comrades walkthrough](https://gamefaqs.gamespot.com/ps4/211428-final-fantasy-xv-multiplayer-expansion-comrades/faqs/77190/walkthrough). Avatar, electrical-grid and early remodeling sections; version-specific routes/optimizations kept separate.

<a id="s43"></a>**S43.** Same guide, [Comrades dismantling](https://gamefaqs.gamespot.com/ps4/211428-final-fantasy-xv-multiplayer-expansion-comrades/faqs/77190/dismantling). Resource recovery and meteorite capacity extensions; exact efficiency table not reproduced.

<a id="s44"></a>**S44.** Lost_Nemo10, [Chapter 14](https://gamefaqs.gamespot.com/ps4/932981-final-fantasy-xv/faqs/78252/chapter-14). Royal-era finale and photograph selection; guide's final-boss opinion not adopted as consensus.

<a id="s45"></a>**S45.** Lost_Nemo10, [Chapter 10](https://gamefaqs.gamespot.com/ps4/932981-final-fantasy-xv/faqs/78252/chapter-10160). Changed Ignis technique access and encounter-specific intervention.

<a id="s46"></a>**S46.** Final Fantasy Wiki, [Episode Prompto](https://finalfantasy.fandom.com/wiki/Final_Fantasy_XV%3A_Episode_Prompto). Community mechanics synopsis, not direct testing in this pass.

<a id="s47"></a>**S47.** Roland Fauster, [PlayStation Blog — Uncovered/transmedia account](https://blog.de.playstation.com/2016/04/05/final-fantasy-xv-eine-welt-ist-nicht-genug/), April 5, 2016. Event/interview reporting in German; planned release date superseded.

<a id="s48"></a>**S48.** Clara Hertzog interviewing Yoko Shimomura, [PlayStation Blog](https://blog.playstation.com/archive/2016/09/28/composing-final-fantasy-xv-the-story-behind-the-music/), September 28, 2016. Primary composing/music-trigger account; concert footage not viewed.

<a id="s49"></a>**S49.** Adam Vitale, [RPG Site — ten-million milestone](https://www.rpgsite.net/news/12757-final-fantasy-xv-hits-10-million-copies-sold), May 17, 2022. Secondary reporting embedding the official announcement; direct social-page body unavailable.

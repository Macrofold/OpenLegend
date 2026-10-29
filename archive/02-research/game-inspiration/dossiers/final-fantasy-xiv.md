# G91 — Final Fantasy XIV

**Research baseline:** September 26, 2026; **refresh:** October 26, 2026. **Scope:** the original 2010 service, A Realm Reborn and its expansions. The September systems check covers rules through 7.56; the October refresh confirms 7.57 and distinguishes announced content from delivery. **Use:** gameplay and production reference, not accepted OpenLegend design or an implementation task list.

[Library](../README.md) · [Canonical roster](../research-roster.md) · [Completion requirements](../research-requirements.md) · [Progress and resume ledger](../research-progress.md) · [G88: Final Fantasy XI](final-fantasy-xi.md)

## 1. Identity, promise, and version boundaries

XIV offers an unusually broad combination: a sequential, authored Final Fantasy story; repeatable cooperative encounters; and a persistent character who can acquire many combat and noncombat professions. Its world is socially shared, but its central plot is not collectively authored by players. A character can become a different kind of participant without abandoning their name, appearance, accumulated relationships, or previous occupations. That distinction is more useful than simply describing it as a large MMORPG. The current official job, party and crafting guides document the separate activities behind that promise. [S5](#s5) [S9](#s9) [S13](#s13)

The failed **2010 version** and **A Realm Reborn, relaunched August 27, 2013**, are not interchangeable editions. Yoshida describes ARR as effectively a different game, rebuilt under a constrained schedule while the PlayStation 3 remained relevant. The successful relaunch also suffered capacity problems: demand caused server failures and a temporary halt to downloadable sales. Neither the original failure nor the eventual recovery should be reduced to one mechanic or one marketing intervention. [S23](#s23)

### Edition and access map

| Layer                                 | What this study uses it for                                                                                 | What must not be carried forward unqualified                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Original XIV, 2010                    | The project and trust failure that preceded the rebuild.                                                    | Original interface, map, class, combat and launch reception are not modern ARR rules.                                             |
| ARR, 2013, and early console editions | Rebuilt regions, accessible party entry, one-character professions, and the early campaign.                 | Reviews describing cross-class prerequisites, early dungeon layouts, PS3 limitations or Vita Remote Play are historical accounts. |
| Heavensward, 2015                     | Ishgard, flight, Au Ra, and three additional jobs; a larger expansion structure.                            | Its original job kits and balancing judgments are not current job guides.                                                         |
| Stormblood, 2017                      | Liberation in two regions, Samurai/Red Mage, and swimming/diving-era expansion of traversal and activities. | Earlier role-action selection, inventories, caps and PvP kits changed subsequently.                                               |
| Shadowbringers, 2019                  | The First, a reversal of light/dark expectations, and the NPC-party era.                                    | The original umbrella use of “Trust” predates the later Duty Support/Trust split.                                                 |
| Endwalker, 2021                       | A conclusion to the Hydaelyn/Zodiark saga, followed by new adventures rather than termination of the MMO.   | An ending to an authored arc is not an ending to the service.                                                                     |
| Dawntrail, 2024, and the 7.x service  | Tural, a new political cast, Pictomancer/Viper, graphical changes, and later side systems.                  | Launch reviews do not describe every subsequent job adjustment or added activity.                                                 |
| 7.5–7.57, 2026                        | Expanded trial, Switch 2 service, limited Beastmaster, and Japan's expanded matching scope.                 | Features scheduled for later in 2026 or Evercold are not shipped merely because they share a promotional page.                    |

The dates and boundaries above combine the official release archive, expansion material, and the relaunch interview; their role is to keep mechanics and reception attached to the version actually described. [S6](#s6) [S21](#s21) [S23](#s23) [S52](#s52) [S53](#s53) [S54](#s54) [S55](#s55)

**October status.** Patch 7.57 had shipped by October 13. Same-region matchmaking and party recruitment now cross Japan's logical data centers; other regions remain conditional on a later rollout. This supersedes older blanket inter-data-center party restrictions in the travel guide. [E26-01](#e26-01) [E26-02](#e26-02)

**Current access check.** The 7.5 page explicitly expands the free trial and Starter Edition through **Shadowbringers, level 80**, and identifies the Switch 2 service date as **August 4, 2026**. This resolves an internally stale sentence on the general trial page that still names only the earlier expansions. The trial is not a normal subscription with an indefinite free period: gil, chat, trading, market, retainer, Free Company and PvP restrictions materially change its economic and social experience. Trial users can use Duty Finder and accept party invitations, but cannot recruit via Party Finder. [S17](#s17) [S21](#s21)

The product page distinguishes Windows/Steam, Mac and console licenses and subscriptions. [S22](#s22) Switch 2 has its own subscription, discounted when another platform subscription is active; linking the existing service account preserves character access, and Nintendo Switch Online is not required. [E26-16](#e26-16) A cross-platform game is not necessarily a single interchangeable purchase. Exact regional prices are intentionally not frozen here. **Evercold, announced for January 2027**, and its proposed new battle-mode direction remain future material. Likewise, the 7.5 promotional page explicitly schedules **Keybound Brawler for October 28, 2026**; this dossier does not count it as a playable Gold Saucer attraction on the research date. [S22](#s22) [S56](#s56) [S21](#s21)

## 2. Player identity and the everyday action vocabulary

Character creation includes race, clan, gender, appearance, starting class and World. The manual lists initial STR, DEX, VIT, INT and MND differences by race/clan, while gender does not alter those starting attributes. This is not a racial talent-tree system. The distinction between an initial class and its later job also explains a genuine onboarding burden: the name chosen at creation is not always the name of the mature profession. [S8](#s8)

The player alternates among movement and observation; target selection; hotbar actions; positioning; interaction with NPCs and objects; accepting and handing in quests; equipment management; gathering and synthesis; matching or recruiting a party; and social/presentation activities. Much of the freedom lies in choosing the next activity, not in freely changing the rules of an individual encounter. The official UI categorizes combat, party, equipment, currencies, communication, outfit customization and photography as distinct interface areas. [S51](#s51)

### Progression and attributes

| System                        | Concrete function                                                                                                                                 | Consequence for play                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Profession levels and unlocks | Jobs acquire actions and traits; the normal current battle guides describe kits through level 100.                                                | Switching occupation preserves identity, but not an automatically trained second kit.                         |
| Primary combat attributes     | Strength/Dexterity support their associated physical jobs; Intelligence supports magical damage; Mind supports healing; Vitality supports HP.     | Equipment appropriate to one role is not automatically useful to another.                                     |
| Secondary combat attributes   | Critical Hit, Direct Hit, Determination and speed statistics affect different aspects of output; Tenacity and Piety have role-specific relevance. | Similar item levels can conceal different stat fits; more of a statistic is not universally the right choice. |
| Crafting attributes           | Craftsmanship, Control and CP concern completion, quality and action resources.                                                                   | A strong fighter does not thereby have an effective crafting loadout.                                         |
| Gathering attributes          | Gathering, Perception and GP affect obtaining materials, quality-related opportunities and resource spending.                                     | Gathering has its own equipment and action budget rather than using weapon damage.                            |
| Story and feature flags       | Quests unlock places, duties, systems and later narrative chapters.                                                                               | Being high-level is not the same as having the required content access.                                       |

The attribute distinctions are a current community rules reference, not a reconstruction of proprietary formulas or an optimization recommendation. Exact stat weights are deliberately omitted. Job progression is separately checked against the official job guide. [S26](#s26) [S5](#s5)

### Roles and combat structure

The official inventory distinguishes tanks, healers, melee damage, physical-ranged damage and magical-ranged damage. Among ordinary jobs, Paladin/Warrior/Dark Knight/Gunbreaker, White Mage/Scholar/Astrologian/Sage, and such damage jobs as Dragoon, Ninja, Dancer, Red Mage and Pictomancer provide different kits within those responsibilities. **Blue Mage and Beastmaster are limited jobs**, not universally eligible substitutes in every duty. [S5](#s5)

Target-based actions have ranges, cast times, recasts, resources and conditions. Mobility therefore competes with some casts, and an otherwise available attack may be inappropriate because of enemy position or an incoming mechanic. Role cooperation and encounter rules sit above the button sequence. This is not free-aim action combat, nor a general simulation in which a fire spell necessarily burns arbitrary scenery. Current action tables make the first distinction explicit; the broader environmental limitation is the boundary of the documented systems, not a source-code claim. [S11](#s11) [S24](#s24)

**White Mage:** combat-time Lilies fund instant heals. Spending three nourishes the Blood Lily, enabling Afflatus Misery and connecting recovery to offense. Swiftcast makes the next spell immediate, which can aid recovery rather than damage. Potencies, trait levels and PvP variants are version-specific; the PvP table is not the PvE kit. [S11](#s11)

**Red Mage:** different spells build Black and White Mana for enchanted weapon attacks. Dualcast follows a cast-time spell with an instant spell, creating a movement and recovery rhythm. Verraise resurrects at substantial MP cost, so a damage kit can serve another role during a failing encounter. [S24](#s24)

**Blue Mage:** witnessing an enemy use a learnable attack and then defeating it can add the spell to a collection. The player chooses up to 24 active actions, with saved sets and restrictions on changes during combat or particular duties. The Masked Carnivale makes enemy weaknesses and advance preparation meaningful. Its level-80 cap and limited-duty access separate this highly configurable spell collection from the ordinary endgame balance environment. [S25](#s25)

**Beastmaster, 7.56:** Gauge checks suitable targets; Capture creates a capture opportunity during which defeating the target may form a pact, with weakening improving the chance. Familiars are recorded and assigned to battlehorns; only one is summoned at a time. Tempered Release and Borrow distinguish commanding a familiar from using its power personally. Its level-1–50 progression, explicit duty exclusions and separate Crucible challenge are important constraints, not incidental shortcomings to omit from the feature description. [S7](#s7) [S14](#s14)

## 3. Equipment, objects, inventory, and production

### Gear as power, role configuration, and appearance

A **gear set** saves the current equipment arrangement, can be named and reordered, and can be placed on a hotbar. This makes changing professions practically manageable rather than merely theoretically supported. Weapons and armor occupy the Armoury Chest, with inventory overflow when its relevant category is full. These are storage and configuration tools; they do not remove the need to possess the equipment. [S27](#s27) [S59](#s59)

A **glamour prism** can store an item's appearance in the glamour dresser; glamour plates apply coordinated appearances. Conversion has conditions and consequences, including full durability and removal of materia and spiritbond, while dyes are retained. The appearance can later be restored to an item. This matters because old 4.2-era descriptions called conversion irreversible: the current guide, not that launch rule, is the appropriate reference. Appearance collection gives equipment a purpose after its combat value has expired. [S28](#s28)

**Materia** is another layer, not a replacement for the item. Patch 5.2 changed extraction so that fully spiritbound equipment could produce materia without destroying the underlying gear, resetting its spiritbond. It also broadened qualifying crafting jobs for melding. This historical change shows how a consumption rule can be softened without removing the system's recurring production loop. Do not infer unrestricted melding: equipment eligibility, sockets, caps and materia types still matter. [S29](#s29)

**Item level and level sync are separate from job level.** A duty may impose gear requirements or scale stronger equipment down. Sync can remove access to higher-level normal actions and suppress materia contributions; role actions have different treatment. This keeps old activities usable with later characters but can make a practiced kit feel incomplete. Choosing an unrestricted older duty is a different experience from experiencing its intended synchronized rules. [S34](#s34)

### Items and economic transformations

| Object or resource                                      | Where it participates                                                | Important boundary                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Equipment and materia                                   | Role power, spiritbond, enhancement and later appearance collection. | Not every item is tradeable, meldable or appropriate to every role.                                            |
| Glamour prisms and dyes                                 | Appearance conversion and outfit construction.                       | Cosmetics and statistics are related through the item, but are not identical goals.                            |
| Logs, ore, textiles, ingredients and intermediate goods | Gathering, recipes and trade.                                        | Different professions and unlocks create dependencies; a recipe is not arbitrary natural-language fabrication. |
| Food and medicines                                      | Consumable preparation for activities.                               | These are manufactured resources, not a survival-hunger simulation.                                            |
| Furnishings                                             | Residence or supported decorating systems.                           | Placement permissions and inventories are bounded; the public world is not freely rebuildable.                 |
| Timeworn maps                                           | Tradeable opportunity leading to interpretation, travel and a fight. | Deciphering changes the map's state; opening the cache risks losing the opportunity.                           |
| Tomestones and activity currencies                      | Earned equipment/reward paths.                                       | A weekly allowance and an inventory ceiling are different constraints.                                         |
| Ventures and retainer equipment                         | Delegated resource procurement.                                      | Delegation has unlocks, assignments and waiting; it is not a general autonomous worker economy.                |

The table connects the official crafting families, market interface, historical venture introduction, treasure rules and current currency reference. It is an inventory of documented uses, not a claim that all outputs exchange freely in one universal market. [S13](#s13) [S30](#s30) [S31](#s31) [S35](#s35) [S42](#s42)

The **market board** exposes player listings, search/filter functions and sale history; a retainer is needed to sell. This gives a producer information for deciding whether to buy inputs, make an intermediate good or sell a finished item. A visible asking price is not proof of a sale, and a recipe with positive gross revenue is not necessarily profitable after input, time and transaction costs. The latter is an analytical caution, not a measured market result. [S30](#s30)

Retainer ventures assign a class, equipment and a timed task to a hired NPC. The original 2.2 documentation distinguishes targeted procurement and exploration, retainer experience and the venture currency used to dispatch work. This is a useful bounded-delegation example: selecting a worker and order changes what can return later, while the player remains responsible for capacity, equipment and collection. Historical level caps in that introduction are not current caps. [S31](#s31)

### Crafting and gathering are playable systems

The eight crafting professions are Carpenter, Blacksmith, Armorer, Goldsmith, Leatherworker, Weaver, Alchemist and Culinarian; the gathering families are Miner, Botanist and Fisher. Their outputs include tools, equipment, materials, medicine, food and furnishings. Consequently, a character can acquire expertise that serves another person's activity rather than only their own next combat upgrade. [S13](#s13)

In **Carpenter synthesis**, progress must finish before durability runs out. Quality competes for steps and CP. Synthesis actions advance completion; Touch actions raise quality; Master's Mend restores durability; Waste Not reduces durability costs. Inner Quiet and Byregot's Blessing connect accumulated preparation to a quality payoff. Trial synthesis allows practice. This is an ordered action problem, not simply a “make” button followed by an unavoidable timer. [S12](#s12)

**Botanist** distinguishes locating nodes, gathering attempts, yield-related opportunities and collectable gathering. Scour, Brazen and Meticulous actions alter collectability under a limited-attempt budget; Collect takes the result. Aetherial reduction provides a further conversion route for suitable collectables. Ordinary quantity and collectable rating therefore motivate different decisions. [S32](#s32)

**Fisher** connects bait and catches: Mooch can turn a suitable caught fish into bait for another. GP-funded actions and the distinction between ordinary hooking, specialized hooks and spearfishing introduce different resource and timing decisions. Fish Eyes is not universal permission to catch anything at any time. The guide explicitly limits which restrictions and fish it affects. This is directed collection and opportunity management, not evidence of a fully simulated marine food web. [S33](#s33)

## 4. Places, quests, exploration, and activity families

A player moves through authored regions, settlements and instanced duties rather than one uninterrupted, freely alterable landscape. ARR criticism values the diversity of those places but also identifies repetitive errands and repeated travel as costs. Improving the scenic world does not itself make every journey or task meaningful. [S1](#s1)

**Persistent identity, bounded spaces.** The international service divides Japan, North America, Europe and Oceania into logical data centers and home Worlds. World Visit crosses Worlds within a logical center; Data Center Travel uses a character-selection/title-screen transition, with Oceania the current cross-physical-region destination. Retainers, housing purchase and some social functions remain restricted while visiting. Logout normally preserves the visit; prolonged absence may return the character home. Japan's newer matching exception above does not remove every home-World restriction. Persistence therefore concerns character/history continuity across spaces, not one seamless simulation. [E26-03](#e26-03) [E26-04](#e26-04)

**Flight** in expansion zones requires attuning to field and quest-linked Aether Currents. The Aether Compass supplies direction and distance to the nearest field current. Flight thus arrives after a phase of ground-level traversal and story progress rather than replacing it immediately. Current counts in older expansions have been reduced; the design reference is the staged access, not a timeless number of collectibles per map. [S41](#s41)

**FATEs** are public, time-limited objectives such as enemy waves, bosses, escorts and collections. Entering the event area permits participation; contribution and level sync affect rewards. They can interrupt an existing journey with an optional social activity. This is event-based activity, not proof that the world generates new political or ecological stories independently. [S39](#s39)

**The Hunt** adds named marks and rewards. Community-organized hunt trains connect scouting, location sharing, group formation and rapid travel among targets. The conductor and etiquette are player organization layered over field monsters, not an official exclusive ownership right over every spawn. This makes it valuable evidence for emergent coordination, while also revealing how efficiency norms can conflict with another player's spontaneous encounter. [S40](#s40)

**Treasure hunting** transforms an item into a route and a group occasion. Decipher exposes a location clue; comparing it with the area map and using Dig reveals a cache; opening it triggers enemies that must be defeated. The historical 2.1 notes document the chain and failure boundary. Their specific tomestone names and reward tables are historical, not current loot promises. [S42](#s42)

### Encounter and side-content inventory

| Family                                          | What makes it a different activity                                                                         | Failure, persistence, or access boundary                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Main-scenario quests and supported story duties | Sequential scenes and tasks connect regions, NPCs and playable confrontations.                             | Story flags gate subsequent content; NPC support is not available for every possible duty.                            |
| Dungeons, trials and raids                      | Party roles meet authored enemy mechanics; higher-difficulty versions emphasize learning and coordination. | Repeated attempts and equipment preparation do not substitute for understanding the encounter.                        |
| Duty roulettes and older synchronized content   | Matchmaking and rewards bring later characters back into an older content pool.                            | Current-level mastery may rely on actions removed by sync.                                                            |
| Palace of the Dead and related deep dungeons    | Reconfigured floors, internal levels, aetherpool equipment and shared consumables create an expedition.    | Its internal power is distinct from ordinary gear; later Palace floors impose stricter save/failure conditions.       |
| Eureka                                          | Elemental experience and the Magia Board add regional combat progression.                                  | Elemental death penalties and rescue stakes differ from routine overworld defeat.                                     |
| Bozja                                           | Resistance rank, skirmishes, critical engagements and a limited holster of Lost Actions.                   | Mettle can be lost without reducing attained Resistance rank; carried actions are a deliberate loadout.               |
| Occult Crescent                                 | Knowledge levels plus Phantom Jobs supplement the ordinary battle job.                                     | Knowledge loss, party-level relationships and regional action rules bound this extra power.                           |
| Cosmic Exploration                              | Crafting/gathering missions contribute to shared construction and personal rewards.                        | Project stages and participation systems constrain how the public location changes.                                   |
| Island Sanctuary                                | Gathering, crops, animals, buildings and scheduled mammet work create a personal production space.         | Separate resources/currencies and visitor permissions prevent it from being unrestricted multiplayer land simulation. |
| Gold Saucer                                     | Cards, racing, minigames and other noncombat competitions reward different competencies.                   | Collection and specialized currencies are their own progression, not simply combat item level.                        |
| PvP                                             | Objective-based combat uses its own action/balance context.                                                | A strong PvE kit or item collection is not automatically the same advantage here.                                     |

Sources are the party/support manuals and the specific rules for each activity, not one review generalized across the whole service. [S9](#s9) [S10](#s10) [S34](#s34) [S43](#s43) [S44](#s44) [S45](#s45) [S46](#s46) [S47](#s47) [S48](#s48) [S49](#s49) [S50](#s50)

**Palace of the Dead** substitutes internal levels and aetherpool equipment for ordinary progression. Parties share limited pomanders for information, combat and transformations. Fixed-party saves retain a particular team/composition; later floors restrict matching and invalidate a run after a wipe. Aetherpool progress persists separately from the expedition state. [S43](#s43)

**Eureka's Magia Board** connects enemy element, offensive affinity and defensive affinity. Rotating the board consumes a replenishing resource. The 4.25 introduction also establishes elemental-level death penalties and rescue opportunities. **Bozja's Lost Actions**, by contrast, come from appraised fragments and occupy a capacity-limited holster before assignment or use. One is elemental alignment; the other is a carried supplemental capability set. Calling both merely “another grind” misses their different action structures. [S44](#s44) [S45](#s45)

**Occult Crescent**, introduced in 7.25, adds Knowledge progression and Phantom Jobs to the underlying job. Supplemental actions can also interact with Knowledge crystals for party benefits. Higher Knowledge levels introduce loss on unrecovered defeat, while balanced-party rules address level differences. This is a contained place for combinations and cooperation; it does not imply that every Phantom action is legal in ordinary raids. [S46](#s46)

**Cosmic Exploration**, introduced in 7.21, lets noncombat professions contribute through stellar missions to shared infrastructure milestones. An exo-tablet organizes activity, a cosmopouch separates mission items, and rewards distinguish personal work from public project progress. Mech operations include pilot selection and ground-support participation. The meaningful connection is that a crafter's work helps change a shared place, not that all builders can freely redesign it. [S47](#s47)

**Island Sanctuary** combines a personal rank with crops, captured animals, construction and automated workshop schedules. Mammets execute planned production; granaries send timed foraging expeditions. Cowries and island resources are separate from ordinary gil and crafting inventories. Visitors require permission and do not perform the owner's production work. Its pastoral appearance should not hide its scheduling/optimization layer, nor should that layer be mistaken for general-purpose NPC initiative. [S48](#s48)

**Triple Triad** turns collected cards into a prepared deck and an opponent-specific contest. Cards can come from NPCs, duties and other rewards, while duplicates can be exchanged for MGP. Normal player challenges do not hand over the opponent's collectible cards. Its special rules change what a good card or placement means. The guide retains a clearly labeled historical 2.51 count; that count is not today's complete card library. [S49](#s49)

**Crystalline Conflict** is about moving a tactical crystal along a route, with contesting players stopping movement, checkpoints and distinct overtime conditions. Arena events and consumable pickups create local reasons to reposition. Its job/gear/item restrictions keep it a bounded competition, and its spectator controls provide a viewing surface. The objective is not interchangeable with maximizing personal kills. [S50](#s50)

## 5. Time, rewards, failure, and the long tail

There are several clocks: action recasts, encounter timers, an expedition's remaining time, daily or weekly rewards, real-time production/ventures, and the longer release cadence. Treating all of them as “progression” hides their different effects. An action cooldown asks when to act; a weekly reward allowance asks when to return; a production assignment asks what to prepare before leaving. This comparison is our interpretation of the documented systems above, not a developer claim about retention.

**Tomestones** provide an earned-currency path to equipment alongside item drops and crafting. The current rules reference distinguishes the wallet cap from weekly acquisition limits and describes the rotation of newer currencies while Poetics serves older expansion equipment. This creates predictable acquisition and catch-up, but also a waiting boundary for a player who wants to finish a set immediately. Current currency names, caps and item levels must be rechecked before practical gearing advice. [S35](#s35)

Failure ranges from a missed mechanic and a recoverable incapacitation, through a group wipe and retry, to loss of expedition progress or regional experience. The Red Mage action guide explicitly describes resurrection to a weakened state; Palace, Eureka and Occult Crescent document different additional consequences. A persistent MMO need not choose a single universal death cost, but the player needs to know which rule set they entered. [S24](#s24) [S43](#s43) [S44](#s44) [S46](#s46)

Endgame also contains non-power goals: a desired outfit, collection completion, another profession, difficult synchronized fights, a residence, a social event or a better production plan. These goals can preserve attachment when a new raid set is no longer interesting. The risk is fragmentation: two people may both “play XIV” while preferring activities with very different schedules and skill demands. The activity guides establish the alternatives; the claim about motivation is an interpretation, supported qualitatively rather than measured by the review sample. [S13](#s13) [S28](#s28) [S37](#s37) [S38](#s38) [S49](#s49)

## 6. People, party formation, NPC behavior, and social ownership

**Duty Finder** automates matching for unlocked activities; **Party Finder** lets people state the purpose and requirements of a group. Replacement recruitment can fill a vacancy. These reduce organization costs without resolving whether someone wants a blind learning party, an experienced farm group or a relaxed evening. Matching compatible roles is not the same as matching compatible intentions. [S9](#s9)

**Duty Support** provides NPC companions in supported story instances; ARR lineups can be fixed, while other duties permit substitutions. It is an access and pacing feature, not proof that all raids and trials support NPC completion. **Trust avatars** are a distinct later leveling/replay system. The community reference records authored individual behaviors, including companions' different movement, offensive and interpersonal tendencies. These are useful characterful automation examples, but no source here establishes a general learning agent, freeform memory model or simulated private life. [S10](#s10) [S36](#s36)

Free Companies, linkshell-style communication, party chat and community recruitment provide different social containers. A guild-like organization, a temporary encounter party and a recurring chat circle are not the same relationship. Likewise, the **Ceremony of Eternal Bonding** is a player-to-player ritual with reservations and customization; it is not a systemic NPC romance model. The venue process requires coordinating participants and agreeing on a reservation, making a relationship visible through a scheduled shared occasion. [S9](#s9) [S17](#s17) [S38](#s38)

**Housing** adds persistent place and presentation but also scarcity and administration. The official land guide distinguishes personal and Free Company eligibility and describes the lottery cycle, deposit, winner claim and refund rules. Buying land and obtaining the construction permit are separate steps. A lottery does not mean every interested player obtains a plot. This is a useful warning against letting a desired social fantasy depend on scarce infrastructure without acknowledging exclusion. [S37](#s37)

**Decorating is a separate activity from acquisition.** The documented native workflow previews furnishings, moves and rotates them, and transfers them between placement and a housing storeroom. Patch 4.1 records both owner/authorized-tenant access and the distinction between storing an item and returning it to ordinary inventory; some otherwise irretrievable furnishings can be stored but not safely withdrawn. Patch 3.1 introduced separately configurable tenant rights for furnishing changes, gardening and stabling. Those dated records establish composition and delegated authority, not timeless caps. [S60](#s60) [S61](#s61)

The current 7.5 implementation raises indoor placement limits to 150 for apartments/private chambers and 300/450/600 for estate sizes, while limiting simultaneous displayed furnishings to 400. It also ships furnishings originating in the 2025 design contest. Thus native creative participation includes assembling a room and curated contributions to the shared asset catalog; rendering constraints and publisher selection still bound both. [S62](#s62)

**Leaving has different costs for different possessions.** Under the ordinary estate-reclamation rule, a private owner or a member of the owning Free Company must enter the respective estate within 45 days; temporary suspensions can qualify that clock. A preserved character account therefore does not guarantee indefinite preservation of a scarce plot during absence. [E26-07](#e26-07) [E26-08](#e26-08)

The game's central companions can accumulate enormous authored history with the player across expansions, while most ordinary conversations remain quest- and scene-controlled. That is a different achievement from simulating every citizen's relationships. For OpenLegend, the relevant question is where persistent history is emotionally legible, not whether a familiar face is automatically evidence of autonomous cognition.

## 7. Worked cross-system situations

**These are constructed examples, not claims that we played these sessions or observed named players doing them.** They illustrate documented rules and explicitly identify limits.

### A. The healer falls; the damage dealer changes priorities

**Intention:** prevent a recoverable party mistake from becoming a wipe. **Conditions:** a Red Mage has Verraise unlocked, enough MP and time for a short cast. **Sequence:** cast a short spell, use Dualcast for immediate Verraise, then decide whether another recovery action or damage is appropriate. **Interaction:** a damage kit's cast-time trait supports another role's recovery need. **Result:** a fallen ally can return weakened without the long normal resurrection cast. **Next decision:** recover resources and handle the next mechanic. **Limit:** MP, level sync, incoming damage and encounter-specific failure can still defeat the plan; instant does not mean free or guaranteed. [S24](#s24)

### B. Healing builds toward an offensive opportunity

**Intention:** keep a moving party alive without treating each heal as an isolated interruption. **Conditions:** White Mage has Lilies and the relevant Afflatus actions. **Sequence:** spend Lily healing when required, maintain position, and later use the completed Blood Lily opportunity. **Interaction:** necessary recovery contributes to a later attack. **Result:** survival and offense are connected through the job resource. **Next decision:** choose an appropriate attack window rather than firing solely because a gauge is ready. **Limit:** spending heals into full HP just to manipulate a gauge is not automatically beneficial, and exact optimal play depends on the encounter and patch. [S11](#s11)

### C. An attractive quality target threatens the entire craft

**Intention:** make a useful high-quality item. **Conditions:** a recipe has remaining progress, limited durability and CP. **Sequence:** build quality, observe that another Touch would jeopardize completion, then use durability recovery or finish with synthesis instead. **Interaction:** quality, completion and resources share the same sequence. **Result:** the crafter may accept lower quality to avoid losing the craft. **Next decision:** practice a revised order in Trial Synthesis or obtain better inputs/equipment. **Limit:** this is not a universal macro or a guarantee for every recipe; conditions and learned actions change the feasible sequence. [S12](#s12)

### D. A saved appearance can destroy an enhancement investment

**Intention:** preserve an old outfit while clearing storage. **Conditions:** the gear carries materia and can be placed in the dresser. **Sequence:** inspect its state, retrieve or otherwise account for valuable enhancements, repair it as needed, and convert it with a glamour prism. **Interaction:** inventory cleanup crosses appearance, repair and enhancement systems. **Result:** the appearance remains usable without treating the original as everyday combat equipment. **Next decision:** assemble a plate or restore the item later. **Limit:** conversion does not preserve every property; the current guide explicitly warns about materia and spiritbond loss. [S28](#s28) [S29](#s29)

### E. A map creates a social trip, not just a loot roll

**Intention:** turn a found or purchased timeworn map into rewards. **Conditions:** the player has Decipher/Dig and a suitable group for the map. **Sequence:** decipher it, compare the clue with geography, travel together, dig and open the cache, then defeat the triggered enemies. **Interaction:** trade, spatial interpretation, traversal and combat form one chain. **Result:** the map becomes a shared occasion and payout. **Next decision:** continue with another person's map or return to other work. **Limit:** a wrong location wastes time; failing or abandoning the triggered fight can lose the opportunity. [S42](#s42)

### F. Shared expedition consumables create a coordination problem

**Intention:** preserve a Palace run rather than maximize one person's immediate output. **Conditions:** the party shares limited pomanders and faces an uncertain floor. **Sequence:** discuss whether to spend an information or combat resource now, explore within the chosen safety margin, then reevaluate at the next checkpoint. **Interaction:** shared inventory, incomplete information and a run-level failure cost make restraint meaningful. **Result:** one person's resource use affects everyone's future options. **Next decision:** conserve for deeper floors or spend to protect the current save. **Limit:** the later-floor rules can invalidate the run after a wipe; ordinary external gear does not erase that risk. [S43](#s43)

### G. A group wants a home but cannot assume ownership

**Intention:** establish a shared social place. **Conditions:** the group satisfies the relevant housing eligibility and can afford the deposit and subsequent construction. **Sequence:** enter a suitable lottery, wait for results, claim if successful, and obtain the permit; otherwise reclaim the refund and reconsider the plan. **Interaction:** a social goal crosses eligibility, currency, scarcity and real-world timing. **Result:** winning provides a location, not a guarantee that friends will use it meaningfully. **Next decision:** decide its actual purpose and decoration. **Limit:** the land guide's claim deadlines and refund conditions matter, and losing is a valid outcome. [S37](#s37)

### H. A familiar collection is powerful only within its permitted context

**Intention:** use a newly acquired creature capability. **Conditions:** Beastmaster has formed a pact and assigned the familiar. **Sequence:** choose the companion and its relevant commands for an eligible activity, then switch the intended activity when a duty excludes limited jobs. **Interaction:** collection, loadout and content permissions constrain one another. **Result:** an expressive subsystem need not fit the ordinary raid environment. **Next decision:** pursue its Crucible or another compatible activity. **Limit:** owning the creature is not a universal license to bring its powers anywhere. [S14](#s14)

## 8. Presentation, audio, interface, and feel

Historical ARR criticism values the contrast among its regions and the wit of its localization. The PS4-focused account additionally emphasizes its improved presentation and controller interface relative to the earlier console experience. These are attributable judgments about those releases, not a benchmark of every current platform. [S1](#s1) [S2](#s2)

Dawntrail's visual upgrade does not simply mean every asset is newly made. The reviews separate more expressive lighting and attractive new environments from remaining clipping, shadow and old-asset inconsistencies. Hashimoto also questions the coherence of Tural's mixture of cultural references, whereas other critics respond positively to its variety. A bigger palette can supply novelty without producing agreement about a place's coherence. [S3](#s3) [S18](#s18)

The sound identity is broader than orchestral accompaniment. Wood describes a range extending into metal and electronic styles; the music helps duties and places develop recognizable identities. In the fifth-anniversary messages, sound director/composer **Masayoshi Soken** describes work spanning game audio, voice/sound recording, promotional production, concerts, band performances and albums. Those are documented surfaces for a soundtrack's life outside the game, not proof that any particular concert caused a subscription increase. [S4](#s4) [S57](#s57)

The official UI guide offers movable/resizable layouts, ordinary and cross hotbars, gear-set shortcuts, party and status displays, communication modes and Group Pose. These are not superficial niceties in a game with many overlapping systems: the player must see a mechanic, maintain a useful party view and find the correct action while moving. Wood's accessibility discussion also notes color-vision options and visual sound alerts. Such options help, but their existence is not a full accessibility certification for every encounter or disability. [S51](#s51) [S4](#s4)

The important feel contrast is between quiet repetition and concentrated group attention. ARR reviews find routine travel and leveling tedious while praising particular cooperative fights. Dawntrail reviews can dislike the story while liking the duties. “Fun combat” and “a satisfying evening” are therefore separate research questions: sequencing, waiting and the reason to do an activity matter as well as its peak moment. [S1](#s1) [S3](#s3)

## 9. Story and worldbuilding — spoilers for expansion premises and prior-arc outcomes

**Spoiler boundary:** this section discusses the end of the Dragonsong War, subsequent liberation arcs, the First, ancient sacrifices and the overall Endwalker conclusion. It avoids pretending the main story is dynamically rewritten by the player.

ARR establishes an adventurer's place within Eorzea and the Scions' larger struggle. Its sequel-like rebuild also gives the world a history before a new player's arrival. The useful structural lesson is that the player can enter a world already marked by catastrophe and prior heroes, rather than needing to witness every foundational event firsthand. The official ARR presentation supplies the setting/promise; the interpretation about entry into history is ours. [S58](#s58)

**Heavensward** makes Ishgard and the dragon conflict central. Its flying mounts, new regions and jobs accompany an expansion of the journey's physical scope, rather than being an unrelated feature list. The subsequent Stormblood story page explicitly treats the thousand-year dragon/man conflict as ended. Thus a later campaign begins from a previous campaign's result instead of resetting every political relationship to its original state. [S52](#s52) [S53](#s53)

**Stormblood** splits liberation between Ala Mhigo and Doma under Garlean domination. The official account connects local peoples, places and beliefs to encounters: the Kojin's collection of sacred objects and many indwelling gods differs from worship centered on a single deity, while Susano's summoning turns that culture into a confrontation. This is authored worldbuilding expressed through an encounter context. It is not a rule that any player-collected sacred object can generate a new god on demand. [S53](#s53)

**Shadowbringers** takes the Scions and Warrior of Light to the First, where overwhelming light threatens the world. A familiar heroic alignment is reversed: becoming a Warrior of Darkness can be an act of rescue. The official story setup also leaves the Source facing its own danger while its saviors are absent. This creates tension through competing places and meanings rather than merely adding a numerically stronger villain. The change of moral framing is authored; it does not establish free player choice to side permanently with any faction. [S54](#s54)

**Endwalker** was explicitly announced as the climax of the Hydaelyn/Zodiark arc, including a journey to the moon, while promising subsequent adventures. The important content-design distinction is between resolution and service exhaustion. A long-lived world can deliver a genuine ending to a major arc and still leave other places, activities and relationships worth returning to. The announcement is evidence of that declared structure, not a source for uninspected scene-by-scene details. [S55](#s55)

**Dawntrail** shifts attention toward Wuk Lamat and the succession contest in Tural, with the established hero often serving as support. This directly divides the critics: Wood and Buchanan welcome the new focal character and rebuilt stakes, while Hashimoto finds the development insufficiently earned. The disagreement is especially useful for a persistent protagonist: lowering the player's narrative centrality can renew a world for one audience and feel like enforced passivity to another. Later 7.x material continues beyond the launch campaign; its current plot developments should not be retroactively attributed to those launch reviews. [S3](#s3) [S4](#s4) [S18](#s18) [S7](#s7)

**Cosmology becomes a conflict over people and memory.** The official story _Ere Our Curtain Falls_ gives a concrete aether interaction: Azem plans to draw a volcano's excess into the fire manifestation Ifrita and disperse it elsewhere. In the same account, Emet-Selch remembers Elidibus becoming Zodiark's heart and later clinging to duty while losing personal memories, despite crystals preserving the Convocation's recollections. These are canonical fictional events, not a player-accessible volcano or memory-editing mechanic. Their design value is the link between a world rule, an institution and a particular person's cost. [S63](#s63)

_A Friendship of Record_ makes the opposed motive explicit. After Zodiark averts the Final Days, his devotees intend to exchange new lives for those sacrificed. Venat's faction refuses to make the future pay for recovering the past and sacrifices itself to manifest Hydaelyn, with Venat as her heart. Her earlier curiosity, travels and willingness to learn from others give that stance personal roots. The resulting interpretive lesson is more specific than “deep lore”: revelations can change what familiar powers and historical sites mean without becoming a list of unrelated proper names. These official companion stories supplement, rather than substitute for, the campaign evidence above. [S64](#s64)

**Narrative limitation:** the reviewed structure mainly offers an authored route, recurring companions and controlled callbacks, not freely branching faction sovereignty, permanently murdered quest providers, or player-created political endings. This is a boundary for OpenLegend comparison. Emotional continuity alone should not be labeled emergent narrative.

## 10. Production history and constraints

Yoshida's **GDC 2014 slides** identify organizational causes of the original failure: graphics took priority over functioning systems, the team lacked contemporary MMO knowledge, and prior success encouraged confidence that launch problems could be repaired afterward. His response combined continued service work with a new game developed over two years and eight months. Core direction was centralized while experienced leads owned details; quest plans and interface mockups preceded volume production. Work on the old version supplied experiments and operational knowledge, while public updates and internal communication rebuilt confidence. The transferable analysis concerns production priorities, delegated competence and usable feedback changing together. It does not establish a generally affordable rescue or a hierarchy for OpenLegend to copy. The slides were read; the talk was not watched. [P26-01](#p26-01)

In the **August 26, 2013 PlayStation interview**, Yoshida emphasizes restoring trust, rebuilding the play experience and fulfilling the promised PS3 release. He specifically discusses a controller-oriented Cross Hot Bar rather than merely transplanting the mouse interface. He also describes housing, PvP and a regular update cadence as plans, and rejects mandatory voice communication because it can pressure beginners. These are attributed priorities at relaunch, not a guarantee that every proposal or timetable survived unchanged. [S15](#s15)

In the **August 25, 2016 RPG Site interview**, he distinguishes vocal feedback from actual participation data. Deep Dungeon was attracting new players and solo/duo experiments while some intermediate players wanted more challenge. Raid entry requirements and recruitment were also under reconsideration. This is a concrete example of why “players asked for harder content” is not a sufficient specification: different participants have different problems, and the people posting are not the entire audience. He also explains that a continuously updated service needs durable localization capacity, not simply a one-time translation purchase. [S23](#s23)

The **fifth-anniversary staff messages** broaden the production picture beyond one director. Community work spans streams, forums, social media and live meetings; UI staff describe a sustained update schedule and learning from players' unexpected ways of using systems. Soken's message shows the parallel production burden outside the client itself. These are first-person staff accounts, not an independently audited staffing or cost model. [S57](#s57)

The recovery therefore contains several different undertakings: restoring an acceptable product, supporting actual demand, making control schemes usable, sustaining content production, and rebuilding a relationship with players. The sources do not establish a reusable budget, an exact team-size formula, or a guarantee that another failed service can afford the same recovery.

## 11. Distribution, community, marketing, and commercial evidence

The **August 31, 2018 publisher announcement** places a registration milestone beside an anniversary livestream, developer/actor appearances, a Producer Live Letter, the Monster Hunter collaboration, the Rising celebration and Fan Festivals. The **February 6, 2021 Endwalker announcement** uses a dedicated online showcase to reveal the expansion. The dated commercial measures are recorded below. [S16](#s16) [S55](#s55)

The present entry funnel combines the expanded trial, familiar franchise identity, continuing announcements and several platform storefronts. The 2026 Evercold announcement ties the next expansion to Fan Festival in Anaheim and reveals future crossover material. Such channels let current players anticipate events, returning players identify a reentry point and newcomers inspect a large amount of content. That funnel explanation is our inference; no source here allocates customer acquisition or retention causally among trailers, memes, trials, streamers, concerts or expansions. [S17](#s17) [S21](#s21) [S22](#s22) [S56](#s56)

**Paid mechanisms.** A purchased job boost supplies level 90, equipment and 500,000 gil through vendorable pieces; the separate Endwalker story skip advances quests without raising job level. These buy acceleration and resources, without establishing purchase of current level-100 raid completion. [E26-05](#e26-05) Additional paid retainers expand storage, market-selling and Venture capacity. On expiry, their property persists but access requires reactivation. Persistent data, entitlement and practical economic capacity are different things. [E26-06](#e26-06)

These payment/platform/travel details concern the international edition. Official Korean and mainland-Chinese sites show separate continuing services; UserJoy records a 2025 Traditional Chinese release. Their entitlements and interoperability must not be assumed identical. [E26-14](#e26-14) [E26-15](#e26-15) [E26-17](#e26-17)

| Product and period                                                   | Reported evidence                                                                                              | Interpretation and limit                                                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| XIV; August 31, 2018 publisher announcement                          | **More than 14 million registered players**.                                                                   | Dated registration milestone. [S16](#s16)                                                                                                         |
| XIV; February 6, 2021 Endwalker announcement                         | **Over 20 million registered players**.                                                                        | Dated registration milestone. [S55](#s55)                                                                                                         |
| XIV; April 2026 publisher report                                     | **Over 30 million total registered accounts**.                                                                 | Registrations, not active or paying population. [E26-13](#e26-13)                                                                                 |
| XIV; October 2021 Yoshida interview published by Sony                | Described as the franchise's most profitable title.                                                            | No numerical profit or accounting method published. [E26-10](#e26-10)                                                                             |
| **Multi-title MMO subsegment**, not XIV alone; year ended March 2026 | **¥41.0bn net sales; ¥15.1bn operating income**.                                                               | Management explained the decline against the preceding Dawntrail launch year. [E26-11](#e26-11)                                                   |
| Same multi-title MMO subsegment; April–June 2026                     | **¥12.7bn net sales; ¥3.6bn operating income**.                                                                | Management credited improved XIV activity for sales growth while pre-expansion development and marketing limited profit growth. [E26-12](#e26-12) |
| XIV lifetime through this research date                              | **Title revenue, numerical profit and total development/operating cost: not estimable** from disclosed inputs. | Targeted budget and subscription searches supplied no defensible model.                                                                           |

Registration milestones are not concurrent users, current paid subscriptions, unique purchasers, revenue or profit. Neither cumulative registrations, Steam activity, company write-offs nor the entire MMO subsegment can stand in for XIV's accounts.

**Outcome inference:** the reported profitability and continuing investment support durable commercial recovery. Expansion timing and continuing costs complicate any single-quarter verdict on game quality.

## 12. Reception — five substantive written reviews

**Method:** the written bodies below were read, rather than substituting scores, search snippets or video titles. The two GameSpot articles are separate writers/platform perspectives but one publication; the set spans four publications and different releases. It is a purposive qualitative sample, not five independent measurements of one version's popularity.

**1. Kevin VanOrd — GameSpot, A Realm Reborn; displayed page date May 5, 2014.** Values the rebuilt world's variety, localization and profession flexibility, and especially dungeons that require cooperation. Objects to familiar quest formulas, slow ordinary fighting, repeated travel and alternate-class leveling work. This explains how a recommendation can coexist with criticism of the minute-to-minute routine. Its early cross-class rules and encounter details remain historical. [S1](#s1)

**2. Brittany Vincent — GameSpot, ARR on PS4.** Praises the console presentation, Cross Hot Bar, touchpad use and then-relevant Vita Remote Play. Demanding Primal encounters and noncombat alternatives broaden the attraction, but class/job terminology, leveling and housing costs impose friction. This is a platform-focused account, not another vote on Dawntrail. Simplified lore claims and historical PvP descriptions are not used as current rules. [S2](#s2)

**3. Kazuma Hashimoto — GamesRadar+, Dawntrail, July 11, 2024.** Welcomes new jobs and more demanding duties but strongly dislikes the central narrative and aspects of its English performance. Job homogenization is another concern. The review is particularly useful because battle enjoyment does not cancel dissatisfaction with characterization and world coherence. Its launch Viper and other job descriptions are not silently applied after subsequent adjustments. [S3](#s3)

**4. Rhys Wood — TechRadar, Dawntrail, August 2, 2024.** Welcomes Wuk Lamat's central role and the lower-stakes new beginning, with enthusiasm for Pictomancer and encounter design. Still identifies pacing drops and a largely unchanged progression template. The declared testing covers story, several jobs, Normal raids and Extreme trials, not only a launch-day story impression. This directly contradicts the idea that all critics rejected the narrative shift. [S4](#s4)

**5. Colin Buchanan — Noisy Pixel, Dawntrail, July 9, 2024.** Appreciates the established protagonist's supporting role, local character development and more demanding baseline duties. Criticizes a prolonged middle-story slowdown after a promised reveal, and notes visual imperfections despite the upgrade. The disclosed White Mage playthrough, Expert dungeons and Extreme attempts give context to its emphasis. The embedded video was not treated as watched evidence. [S18](#s18)

**Mature-play counterpoint.** James Galizio's April 22, 2026 retrospective praises later Savage tiers and Pilgrim's Traverse while criticizing Chaotic rewards, the difficulty of assembling a Forked Tower group in one instance, and weak narrative framing around side content. His position as an active raider matters: rewarding encounters for one audience can coexist with poor access or purpose for another. This is firsthand criticism of mature Dawntrail, not a subscriber survey, proof of universal abandonment or evidence that an announced remedy succeeded. [R26-01](#r26-01)

**Synthesis:** recurring attractions include role flexibility, presentation, long-form continuity and cooperative encounter learning. Recurring criticisms include repetitive gates or errands, pacing and the cost of making jobs easier to standardize. The important disagreement is not simply a score spread: critics differ about the value of shifting the established hero into a supporting role. That distinction should remain visible in any design comparison.

## 13. Steam helpful-review sample

**Access record, September 26, 2026:** the store encountered an age gate and an initial language-qualified community route failed. The **Most Helpful (All Time)** community route and its **Negative Only** counterpart were accessible and read. These are selected, sometimes old or subsequently updated accounts. They are not a representative subscriber survey; displayed lifetime hours can postdate the review; helpfulness order is itself a selection effect.

**Positive surface.** A May 29, 2021 review values changing jobs without abandoning one character, while acknowledging separate leveling. A June 5, 2017 account updated through September 2021 values music, help for beginners and the long story, but calls ordinary dungeons relatively conventional. A June 28, 2021 account discusses the slow opening and multiple reasons to continue rather than offering unconditional praise. Historical prices, trial limits, level caps and encounter counts in these reviews are not current facts. [S19](#s19)

**Negative surface.** A December 22, 2017 account likes the game but criticizes Steam-specific purchasing constraints; a February 1, 2024 account likewise separates affection for the MMO from launcher/connection frustration. A substantial June 15, 2025 account appreciates blind or minimum-item-level discovery but objects to optimization pressure, misrepresented Party Finder expectations, loot gates and Dawntrail pacing. Its unsupported claims about specific gear sharing or writing responsibility are not adopted as facts. Another review updated May 28, 2026 reports installation interruptions; that report was not independently reproduced. [S20](#s20)

**October 26 contrast.** The helpful-review surfaces were accessible again; these additional accounts were search-selected. Discepless values one-character jobs, crafting, story and self-paced play. Merdo reports registration, early-game and subscription friction when attempting to return. Their stages differ; the positive account's “no FOMO” judgment does not erase housing or reward timers, and an attempted return is not verified permanent departure. [R26-02](#r26-02) [R26-03](#r26-03)

The actionable distinction is between **access failure**, **group-expectation mismatch**, **activity fatigue**, and **dislike of the underlying experience**. A negative recommendation does not identify which of these applies without reading the body. No prevalence or causal commercial estimate is inferred from this sample.

## 14. OpenLegend implications — hypotheses and limits

**Persistent identity can host changing roles.** The strongest transfer is not “add many classes.” It is allowing a person to change how they contribute without losing accumulated social identity. The limit is the learning and equipment burden of each role; nominal flexibility can conceal repetitive preparation.

**Put unusual powers inside understandable boundaries.** Blue Mage, Beastmaster and field-operation actions show several ways to let expressive abilities exist without promising compatibility with every encounter. OpenLegend could study how a rule boundary is communicated. It should not copy a list of exclusions merely to avoid designing coherent world laws.

**Separate the opportunity to organize from compatibility of intentions.** A matcher can fill roles; it cannot by itself determine whether everyone wants discovery, efficiency, teaching or relaxed play. For agent and human groups, stating intent may matter as much as finding participants. This is an inference from the matching rules and reception, not an approved feature.

**Noncombat work can have public meaning.** Cosmic Exploration links specialist effort to visible shared construction. The transferable question is whether a contribution changes something others can recognize. The limit is that XIV uses authored projects and controlled stages, not open-ended player invention or an unrestricted simulated supply chain.

**History needs a legible expression.** Recurring companions, recognizable music, saved appearances and persistent meeting places make continuity tangible. OpenLegend should study which concrete reminders carry history into the next scene. It should not equate a large memory database with an emotionally convincing relationship.

**A side system needs an identity, not just a reward schedule.** Palace, Island Sanctuary, cards, field operations and ordinary raids ask different questions of the player. This supports a world with varied roles and moods. The warning is maintenance and fragmentation: each subsystem needs comprehensible rules, compatible access and a reason to return beyond another currency.

**Do not transplant the whole MMO operating model.** XIV's authored-content volume, licensed platforms, regional service, continuous localization and community production are substantial obligations. Its recovery is evidence that rebuilding can work under particular circumstances, not a recommendation that OpenLegend promise comparable scale or cadence.

### Routes into existing design and qualification

These hypotheses inform existing work; they do not select additional MMO systems.

| Reference question                                                                             | Existing owner and concrete use                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can different people contribute without confusing compatible roles with compatible intentions? | [CP01–CP10](../../../../docs/maintainers/first-playable-cooperation.md) and [PS07.4/PS07.7](../../../../docs/maintainers/product-scalability.md): observe voluntary help, exact custody and worthwhile aftermath, including partial success.                                                                                                                                  |
| Does a place carry history into a later visit?                                                 | [ND01/DG34](../../../../docs/maintainers/needs-design.md#nd01--assemble-a-new-world-from-a-creators-premise) and [discoverable-history authoring](../../../../docs/narrative/authoring-discoverable-history.md): rehearse a place, object and encounter in different discovery orders; retain named motives and recognizable consequences.                                    |
| Is a home useful after the effort of obtaining and improving it?                               | [SH12/DG13](../../../../docs/maintainers/needs-design.md#dg13--editable-shelter-and-useful-places) and [FPV06–FPV08](../../../../docs/maintainers/first-playable-validation.md): assess construction, actual use, revision and return against the complete effort. Scarce plots are not a proposed OpenLegend requirement.                                                    |
| Can an unusual capability or creative work travel with understandable limits?                  | [ND12/INV-8/EWF11](../../../../docs/maintainers/needs-design.md#nd12--cross-world-invention-libraries-and-usable-pack-publishing) and [ND23/PACK](../../../../docs/maintainers/published-packs-and-creator-revenue.md): test preview, dependencies, destination permissions and update/removal within selected scope. Preserve world-owned rules and accepted paid authoring. |

## 15. Player creation and external ecosystem — R15

**Applicability: yes, desktop Windows, October 26, 2026.** A substantial catalog, maintained tools and authored packages demonstrate sustained community creation; they do not measure its share of players. Square Enix prohibits third-party programs/tools. Community distribution review is therefore distinct from publisher approval. Dalamud injects client code; it neither supplies the game's server source nor establishes a safe data-only sandbox. Equivalent console support and Linux/macOS wrappers were not established here. No game, plugin or installer was run. [M26-01](#m26-01) [M26-03](#m26-03) [M26-09](#m26-09)

**Creation to another player's use.** SamplePlugin supplies a command, main/settings windows, an image and configuration. An author changes its C# project, builds a DLL and loads it through a development-plugin location; edits require rebuilding/reloading. Code, manifest, API version and author/repository metadata have distinct roles. A constructed test changes a control, exercises command → window → saved setting → close/reopen, checks unload cleanup and profiles UI cost. That is a documented-workflow example, not an executed test. [M26-04](#m26-04) [M26-05](#m26-05) [M26-07](#m26-07)

Publishing submits a manifest referencing an exact public repository commit. New submissions enter testing before reviewed stable distribution; updates supply another commit and changelog. Players obtain community-supported plugins through the in-game `/xlplugins` installer, rather than building each project. A programmer extending a plugin and a player enabling it face different work. The game supplies the existing world and authoritative service; the community framework supplies loading/APIs, while creators supply code or asset work, testing, packaging and continued support. [M26-06](#m26-06) [M26-09](#m26-09)

**Contrasting creations and authorship.** Caraxi's **SimpleTweaks** collects small usability changes that did not warrant separate plugins, including keeping tooltips on screen and retaining a Party Finder description. **Penumbra**, maintained under xivdev, substitutes assets without rewriting base files and exposes ordering, conflicts and missing-file redirections. Its model/material/texture dependencies make composition more demanding than selecting a thumbnail. **Brio** began with Asgard and is maintained by Minmoose, crediting Anamnesis, Ktisis and other projects. It supports GPose actors, posing, cameras and saved scenes. Those presentation actors are not persistent server inhabitants; these projects do not establish a player-authored replacement for the server's rules. [M26-10](#m26-10) [M26-11](#m26-11) [M26-12](#m26-12) [M26-13](#m26-13)

**Failure, maintenance and trust.** Penumbra resolves overlapping replacements by ordering, but importing TexTools packages is expressly best effort; deleting files can leave broken redirections. Dalamud waits for client-version compatibility after patches, and individual plugins may need further repair. Duplicate manual installations can interfere with updates. Maintainers describe spare-time constraints, so capability depends on continued maintenance. Community admission rules restrict automation, unfair information and account-identifier exposure; technical guidance asks for minimal data collection and consent for additional telemetry. Review and visible build provenance support accountability without proving arbitrary client code secure. [M26-07](#m26-07) [M26-08](#m26-08) [M26-09](#m26-09) [M26-10](#m26-10) [M26-11](#m26-11)

The privacy failure is concrete. In January 2025 Yoshida addressed tools correlating characters through part of an internal account identifier, while distinguishing that exposure from addresses or payment information. Announced countermeasures establish a response, not independently verified enforcement. The design question concerns another person's ability to link and publish data available to one client. [M26-02](#m26-02)

**Rights and incentives.** Creator **Cultist** distinguishes private edits, credited public derivatives, paid work, redistributed files and use outside XIV. Support/payment links coexist with older creations requiring manual Dawntrail updates. This demonstrates mixed free/paid work and upkeep demands, not typical earnings or universal permission. Open-source plugin code does not license game assets or every imported package. No defensible aggregate creator-income estimate was found. [M26-14](#m26-14)

Native decorating and publisher-selected furnishing designs remain the separate supported creation path described in section 6. [S60](#s60) [S61](#s61) [S62](#s62) OpenLegend's existing ND12/ND23 and package routes above can use the lessons about dependency visibility, previews, rights, failure reports and support ownership. They do not adopt arbitrary DLL loading or this unofficial architecture. The [current root policies](../../../../AGENTS.md), including development-save compatibility and generated-content boundaries, still govern; accepted paid authoring remains intact.

<a id="15-reading-routes-preservation-and-completion-map"></a>

## 16. Reading routes, preservation, and completion map

**To study interacting rules:** read the Red Mage and White Mage action/gauge sections, then Blue Mage's active-set rules, Beastmaster's restrictions, and the Palace and field-operation guides. Compare ordinary job identity with a supplemental or restricted power system. The worked situations above are constructed explanations, not substituted gameplay observations.

**To study people and places:** read Duty Support beside the Trust reference; compare housing's acquisition rules with Eternal Bonding's scheduled ritual and Cosmic Exploration's shared progress. This separates access, ownership, authored personality and collective activity instead of calling all four “social systems.”

**To study the service:** read the 2013 and 2016 Yoshida interviews, then the staff anniversary messages and dated publisher milestones. Compare the five reviews before drawing an audience conclusion. For current rules, follow the patch index to the relevant individual note rather than relying on old review descriptions.

**To study creation:** compare native housing in section 6 with SamplePlugin's build/publication path, Penumbra's dependency inspection and Brio's presentation tools in section 15. Read the publisher policy before the community's admission rules; the two authorities are distinct.

**Viewing route:** the official ARR and current expansion sites contain trailers/media routes, and the Noisy Pixel review contains an embedded review video. They are pointers for subsequent viewing only. No playback, transcript review, timestamps or scene-specific observations are claimed here. Sources are linked, not redistributed.

**Preservation:** the September 26 dossier is the evidence baseline for this refresh, including its eight worked situations and qualified historical systems. It supplements the original game chapters, essays and evidence notebook. The [packet-provenance map](../references/packet-provenance.md) remains authoritative about the supplied seven-file packet. This pass does not claim the library-wide preservation gates are complete. Existing G81–G90 research and work on other branches remain independent.

Related owners remain intact: the [FFXIV interface study](../../../../docs/ui-ux/games/final-fantasy-xiv.md) preserves eight inspected images and its return-to-play explanation; [COMBAT-L001](../synthesis/combat-and-encounters.md#combat-l001) and its [assessment](../synthesis/assessment-records.md#combat--final-fantasy-xiv) own combat-interface implications; the [G91 engagement evidence](../references/fun-and-engagement-dossier-evidence-g81-g148.md) feeds the [fun and sustainable engagement essay](../essays/fun-and-sustainable-engagement.md). This refresh neither repeats their visual analysis nor claims a new runtime inspection.

| Requirement                                | Substantive coverage                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 identity and editions                  | Sections 1–2, including current/future separation and access limits.                                                                                                      |
| R02 mechanics inventory                    | Sections 2–6: combat, crafting, gathering, traversal, events, modes, social and NPC systems.                                                                              |
| R03 objects and combinations               | Section 3 and the named job/side-system resources.                                                                                                                        |
| R04 progression, economy, time and failure | Sections 2–5 and 11; bounded regional and expedition consequences.                                                                                                        |
| R05 worked situations                      | Section 7: eight constructed intention-to-consequence examples with limits.                                                                                               |
| R06 people and AI                          | Section 6, supported by party/support/Trust and social-place evidence.                                                                                                    |
| R07 presentation and usability             | Section 8, with attributed visual disagreement, sound production and UI/accessibility boundaries.                                                                         |
| R08 story and worldbuilding                | Section 9, with spoiler warning and authored-versus-emergent distinction.                                                                                                 |
| R09 development history                    | Section 10 and relaunch evidence in section 1.                                                                                                                            |
| R10 discovery and community                | Section 11 and primary staff/community accounts.                                                                                                                          |
| R11 economics                              | Section 11: dated registrations, actual paid mechanisms, scoped segment results, commercial-outcome inference and explicit estimation limits.                             |
| R12 criticism and player testimony         | Five written bodies in section 12 and dated helpful positive/negative Steam evidence in section 13.                                                                       |
| R13 transfer and limitations               | Section 14; proposals remain hypotheses.                                                                                                                                  |
| R14 sources and reading routes             | Section 16 and annotated register below; baseline examples, owner links and access/viewing limitations retained.                                                          |
| R15 player-creation ecosystem              | Section 15: yes gate; client/server and native boundaries, actual workflow, contrasting projects, composition/maintenance, rights/incentives and existing-owner transfer. |

### Annotated source register

Sources S1–S59 were accessed **September 26, 2026**; additions below record the **October 26, 2026** refresh. Selected review passages were rechecked in October; the fresh S2 fetch was blocked, so its earlier body-read record remains the evidence. Official guides are mutable snapshots. Patch notes are dated historical rules unless explicitly identified as current. Community references are not first-party documentation or source-code audits. Critical opinions and player reports remain attributed.

<a id="s1"></a>**S1.** Kevin VanOrd, [GameSpot — ARR review](https://www.gamespot.com/reviews/final-fantasy-xiv-online-a-realm-reborn-review/1900-6414792/). Written firsthand criticism; early rules and displayed May 5, 2014 date.

<a id="s2"></a>**S2.** Brittany Vincent, [GameSpot — ARR/PS4 review](https://www.gamespot.com/reviews/final-fantasy-xiv-online-a-realm-reborn-review/1900-6415747/). Written platform-focused criticism; historical console features separated.

<a id="s3"></a>**S3.** Kazuma Hashimoto, [GamesRadar+ — Dawntrail review](https://www.gamesradar.com/games/mmo/final-fantasy-14-dawntrail-review-a-slow-insubstantial-start-with-promising-gameplay/). Written launch-expansion criticism; later balance changes not assumed.

<a id="s4"></a>**S4.** Rhys Wood, [TechRadar — Dawntrail review](https://www.techradar.com/gaming/final-fantasy-14-dawntrail-review). August 2, 2024; written body and declared testing inspected.

<a id="s5"></a>**S5.** Square Enix, [Job Guide](https://na.finalfantasyxiv.com/jobguide/battle/). Current role/job inventory; future battle-mode discussion separated.

<a id="s6"></a>**S6.** Square Enix, [patch-note index](https://na.finalfantasyxiv.com/lodestone/special/patchnote_log/). Release chronology and routes to individual rules, not a detailed mechanics source alone.

<a id="s7"></a>**S7.** Square Enix, [7.56 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/a8a526ad64db45c8ca8d1c7fdcce8a5eedaa18bc). Current main-scenario and Beastmaster additions; masked quest names remain masked.

<a id="s8"></a>**S8.** Square Enix, [Getting Started](https://na.finalfantasyxiv.com/game_manual/start/). Character creation, starting attributes and World choices.

<a id="s9"></a>**S9.** Square Enix, [Party Play](https://na.finalfantasyxiv.com/game_manual/pp/). Party formation, matching, recruitment and replacement mechanics.

<a id="s10"></a>**S10.** Square Enix, [Duty Support](https://na.finalfantasyxiv.com/game_manual/dutysupport/). Supported NPC-instance rules, not universal solo access.

<a id="s11"></a>**S11.** Square Enix, [White Mage](https://na.finalfantasyxiv.com/jobguide/whitemage/). PvE actions and Lily gauge; separate PvP table not conflated.

<a id="s12"></a>**S12.** Square Enix, [Carpenter](https://na.finalfantasyxiv.com/crafting_gathering_guide/carpenter/). Synthesis, quality, durability and action ordering.

<a id="s13"></a>**S13.** Square Enix, [Crafting and Gathering](https://na.finalfantasyxiv.com/crafting_gathering_guide/). Profession families and output categories.

<a id="s14"></a>**S14.** Square Enix, [Beastmaster](https://na.finalfantasyxiv.com/jobguide/beastmaster/). Capture, familiar commands, Crucible and limited-job boundaries.

<a id="s15"></a>**S15.** Aurelie Reman interviewing Naoki Yoshida, [PlayStation Blog](https://blog.playstation.com/2013/08/26/the-past-present-and-future-of-final-fantasy-xiv-a-realm-reborn/), August 26, 2013. Primary interview; plans distinguished from delivery.

<a id="s16"></a>**S16.** Square Enix, [14-million registration/anniversary announcement](https://na.finalfantasy.com/news/886), August 31, 2018. Dated publisher metric and promotional activities.

<a id="s17"></a>**S17.** Square Enix, [Free Trial](https://freetrial.finalfantasyxiv.com/na/). Current restrictions; stale expansion wording reconciled with S21.

<a id="s18"></a>**S18.** Colin Buchanan, [Noisy Pixel — Dawntrail review](https://noisypixel.net/final-fantasy-xiv-dawntrail-review/), July 9, 2024. Written body inspected; embedded video not watched.

<a id="s19"></a>**S19.** [Steam — Most Helpful, All Time](https://steamcommunity.com/app/39210/reviews/?browsefilter=toprated). Visible selected English player testimony, not a representative survey.

<a id="s20"></a>**S20.** [Steam — Most Helpful, Negative Only](https://steamcommunity.com/app/39210/negativereviews/?browsefilter=toprated). Access, culture and design complaints distinguished; technical reports not reproduced.

<a id="s21"></a>**S21.** Square Enix, [7.5 special site](https://na.finalfantasyxiv.com/dawntrail/patch_7_5/). Trial/platform dates and explicitly future content; promotional descriptions require release boundaries.

<a id="s22"></a>**S22.** Square Enix, [product guide](https://na.finalfantasyxiv.com/product/). Current editions, licenses and subscription distinctions; regional prices not generalized.

<a id="s23"></a>**S23.** Andrea Kasparian interviewing Naoki Yoshida, [RPG Site](https://www.rpgsite.net/interview/4958-interview-with-final-fantasy-xivs-naoki-yoshida-celebrating-3-years-of-eorzea), August 25, 2016. Primary relaunch, participation, difficulty and localization account.

<a id="s24"></a>**S24.** Square Enix, [Red Mage](https://na.finalfantasyxiv.com/jobguide/redmage/). Dualcast, mana, enchanted actions and Verraise; PvE/PvP kept separate.

<a id="s25"></a>**S25.** Square Enix, [Blue Mage](https://na.finalfantasyxiv.com/jobguide/bluemage/). Learning, active sets, Carnivale and duty exclusions.

<a id="s26"></a>**S26.** FFXIV Online Wiki, [Attributes](https://ffxiv.consolegameswiki.com/wiki/Attributes). Community rules reference; not proprietary formulas or optimal stat weights.

<a id="s27"></a>**S27.** Square Enix, [Saving Current Gear Set](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-gearset/equipment_set.html). Configuration and hotbar shortcuts.

<a id="s28"></a>**S28.** Square Enix, [Using the Glamour Dresser](https://na.finalfantasyxiv.com/uiguide/fashion/equipment-glamours/fashion_dresser_how_to.html). Current conversion, appearance and property-loss rules.

<a id="s29"></a>**S29.** Square Enix, [5.2 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/b0151eaed1faecb46061b947cf9c08bed75d230d). Materia extraction/melding changes; historical introduction, not today's full item catalog.

<a id="s30"></a>**S30.** Square Enix, [Buying and Selling Items](https://na.finalfantasyxiv.com/uiguide/item/). Market interfaces, listing and retainer requirement.

<a id="s31"></a>**S31.** Square Enix, [2.2 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/250fa2fc9b3709d18dca7ee733c851473cb34da5). Retainer-venture introduction; original caps not imported.

<a id="s32"></a>**S32.** Square Enix, [Botanist](https://na.finalfantasyxiv.com/crafting_gathering_guide/botanist/). Gathering attempts, collectability and conversion actions.

<a id="s33"></a>**S33.** Square Enix, [Fisher](https://na.finalfantasyxiv.com/crafting_gathering_guide/fisher/). Hooking, mooching, GP and specialized constraints.

<a id="s34"></a>**S34.** FFXIV Online Wiki, [Level Sync](https://ffxiv.consolegameswiki.com/wiki/Level_Sync). Community reference for action/equipment scaling and exceptions.

<a id="s35"></a>**S35.** FFXIV Online Wiki, [Allagan Tomestones](https://ffxiv.consolegameswiki.com/wiki/Allagan_Tomestones). Currency rotation, wallet/weekly limits and older equipment routes.

<a id="s36"></a>**S36.** FFXIV Online Wiki, [Trust](https://ffxiv.consolegameswiki.com/wiki/Trust_System). Duty Support split, avatar progression and authored companion behavior.

<a id="s37"></a>**S37.** Square Enix, [Housing Land](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/housing_land/). Eligibility, lottery, claims and permits; not guaranteed access.

<a id="s38"></a>**S38.** Square Enix, [Eternal Bonding reservations](https://na.finalfantasyxiv.com/eternalbond/planning/reservation/). Scheduled player ritual and coordinated reservation.

<a id="s39"></a>**S39.** FFXIV Online Wiki, [FATEs](https://ffxiv.consolegameswiki.com/wiki/FATEs). Event types, contribution and synchronization; no emergent-world claim.

<a id="s40"></a>**S40.** FFXIV Online Wiki, [The Hunt](https://ffxiv.consolegameswiki.com/wiki/The_Hunt). Rules plus clearly identified community train organization.

<a id="s41"></a>**S41.** FFXIV Online Wiki, [Aether Currents](https://ffxiv.consolegameswiki.com/wiki/Aether_Currents). Flight progression, compass and historical count changes.

<a id="s42"></a>**S42.** Square Enix, [2.1 notes](https://de.finalfantasyxiv.com/lodestone/topics/detail/03843d6bf7ba69adc37d7955ff7af43f3c43828a). Accessible English treasure-hunt text on a regional route; historical reward names excluded.

<a id="s43"></a>**S43.** Square Enix, [Palace of the Dead](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/deepdungeon/). Internal progression, aetherpool, pomanders and save/failure boundaries.

<a id="s44"></a>**S44.** Square Enix, [4.25 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/5ad19879fc01a5d878af9a7f90f29e4a2394c5b4). Eureka's original elemental and Magia rules.

<a id="s45"></a>**S45.** Square Enix, [5.35 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/f1e5bfcb2a0bf477bcc8c81845c440f300e12f75). Bozja's mettle, rank and Lost Action systems.

<a id="s46"></a>**S46.** Square Enix, [7.25 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/6e4b5a23048ddb2569b12f8567baf7e8a2f370d9). Occult Crescent, Knowledge and Phantom Jobs.

<a id="s47"></a>**S47.** Square Enix, [7.21 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/6f824223a7e10da7b9b7dfc84f626d10d4df88b3/). Cosmic missions, public construction and participation systems.

<a id="s48"></a>**S48.** FFXIV Online Wiki, [Island Sanctuary](https://ffxiv.consolegameswiki.com/wiki/Island_Sanctuary). Community reference for production, currencies, visitors and separate progression.

<a id="s49"></a>**S49.** Square Enix, [Triple Triad](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/goldsaucer/tripletriad/). Collection, deck and match boundaries; old card count labeled historical.

<a id="s50"></a>**S50.** Square Enix, [Crystalline Conflict](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/crystallineconflict/). Objective, contesting, overtime, restrictions and spectators.

<a id="s51"></a>**S51.** Square Enix, [UI Guide](https://na.finalfantasyxiv.com/uiguide/). Current interface categories and customization routes; not a full accessibility audit.

<a id="s52"></a>**S52.** Square Enix, [Heavensward release announcement](https://www.prnewswire.com/news-releases/final-fantasy-xiv-heavensward-releases-today-300103083.html), June 23, 2015. Publisher statement distributed by PR Newswire.

<a id="s53"></a>**S53.** Square Enix, [Stormblood story](https://na.finalfantasyxiv.com/stormblood/story/). Official premise, prior-war outcome and cultural/encounter context.

<a id="s54"></a>**S54.** Square Enix, [Shadowbringers story](https://na.finalfantasyxiv.com/shadowbringers/story/). Official First/light/dark premise, not a full plot transcript.

<a id="s55"></a>**S55.** Square Enix, [Endwalker announcement](https://na.finalfantasy.com/news/1606), February 6, 2021. Declared arc conclusion, showcase and dated registrations.

<a id="s56"></a>**S56.** Square Enix, [Evercold announcement](https://na.finalfantasy.com/news/2819), April 30, 2026. Future expansion and event context, not shipped mechanics.

<a id="s57"></a>**S57.** Square Enix, [fifth-anniversary staff messages](https://na.finalfantasyxiv.com/5th_anniversary/message/), 2018. First-person audio, community and UI-production accounts.

<a id="s58"></a>**S58.** Square Enix, [ARR official site](https://na.finalfantasyxiv.com/a_realm_reborn/). Setting/promise and media route; trailers not watched in this pass.

<a id="s59"></a>**S59.** Square Enix, [Gear Placed in the Armoury Chest](https://eu.finalfantasyxiv.com/uiguide/equipment/equipment-chest/equipment_where_is.html). Equipment storage and overflow behavior.

#### October 26 core-system and lore additions

<a id="s60"></a>**S60.** Square Enix, [Patch 4.1 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/cfd6b53bc9cd08b494512a662c04942848db9539), October 9, 2017. Housing/storeroom body read; historical preview, placement and storage distinctions. Old numerical caps are not reused.

<a id="s61"></a>**S61.** Square Enix, [Patch 3.1 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/903444f2b2789767bba60554a1ad32e90623d123), November 9, 2015. Estate-sharing body read; delegated native permissions at introduction, not a fresh UI audit.

<a id="s62"></a>**S62.** Square Enix, [Patch 7.5 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/07320affa7e0fcd9685afcbe54fbf55405b6d822/), 2026. Housing body read, including placement/display limits and delivered contest furnishings. The full patch inventory was not used as a feature checklist.

<a id="s63"></a>**S63.** Square Enix, [_Ere Our Curtain Falls_, Tales from the Shadows](https://na.finalfantasyxiv.com/lodestone/special/tales_from_the_shadows/sidestory_07/). Full official story body read; Emet-Selch's narrated perspective and Shadowbringers-era spoilers, not direct play observation.

<a id="s64"></a>**S64.** Square Enix, [_A Friendship of Record_, Tales from the Dawn](https://na.finalfantasyxiv.com/lodestone/special/tales_from_the_dawn/sidestory_01/). Full official story body read; Venat/Hydaelyn's motive and an archivist's perspective, with Endwalker spoilers.

#### October 26 reception additions

<a id="r26-01"></a>**R26-01.** James Galizio, [MMORPG.com — The Successes and Failures of Final Fantasy XIV: Dawntrail](https://www.mmorpg.com/editorials/the-successes-and-failures-of-final-fantasy-xiv-dawntrail-2000137875), April 22, 2026. Full relevant body read; active-raider retrospective, not a new scored review. Embedded videos not watched.

<a id="r26-02"></a>**R26-02.** [Discepless's recommended Steam review](https://steamcommunity.com/profiles/76561198039086014/recommended/39210/). Full body/metadata read: August 24, year omitted by UI but body identifies 2026; 907.4 hours at review, 96 helpful votes. Snapshot, not a representative sample.

<a id="r26-03"></a>**R26-03.** [Merdo's negative Steam review](https://steamcommunity.com/id/Merdo_v9/recommended/39210). Full body/metadata read: May 14, 2026 per search metadata; UI omits year. 10.2 displayed Steam hours, 43 helpful votes. Claimed returning-player status does not establish total non-Steam experience.

#### October 26 service and economics additions

<a id="e26-01"></a>**E26-01.** Square Enix, [7.57 notes](https://na.finalfantasyxiv.com/lodestone/topics/detail/6f063f4b9a856812a296954827b771da1426b4fb/), October 2026. Body read; Japan-only initial matching rollout.

<a id="e26-02"></a>**E26-02.** Square Enix, [7.57 issue notice](https://na.finalfantasyxiv.com/lodestone/news/detail/ef3faa0cdf98be4cad2c55f2605b626e6def47ce), October 13, updated October 21, 2026. Body establishes prior release; its resolved restriction is not a current defect claim.

<a id="e26-03"></a>**E26-03.** Square Enix, [World Visit](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/worldvisit/). Current guide body read; home/visited World and logout continuity.

<a id="e26-04"></a>**E26-04.** Square Enix, [Data Center Travel](https://na.finalfantasyxiv.com/lodestone/playguide/contentsguide/datacentertravel/). Body read; topology and restrictions, with E26-01 superseding older party-access language.

<a id="e26-05"></a>**E26-05.** Square Enix, [Tales of Adventure](https://na.finalfantasyxiv.com/tales_of_adventure/). Current product body read; distinct job/story purchases and included resources.

<a id="e26-06"></a>**E26-06.** Square Enix, [Additional Retainer Service](https://na.finalfantasyxiv.com/lodestone/playguide/option_service/additional_retainer/). Body read; capacity, activity and suspended access. Conflicting old maximum-count FAQs excluded.

<a id="e26-07"></a>**E26-07.** Square Enix, [Estate reclamation](https://na.finalfantasyxiv.com/lodestone/topics/detail/424658bcd52a5737194a4088eb3e7ccabefa9954), October 20, 2015. Body read for the entry rule; obsolete resale pricing excluded.

<a id="e26-08"></a>**E26-08.** Square Enix, [Demolition-counter resumption notice](https://na.finalfantasyxiv.com/lodestone/news/detail/ff0334468a9e32da6ee45ff0a44b2b181117a23e), October 22, 2026. Body read; temporary suspension and scheduled October 26 resumption, not observed runtime.

<a id="e26-10"></a>**E26-10.** Sony, [Naoki Yoshida interview](https://blog.playstation.com/?p=354966), October 13, 2021. Body read; comparative profitability characterization without audited title figures.

<a id="e26-11"></a>**E26-11.** Square Enix, [FY2026 results](https://www.hd.square-enix.com/eng/ir/news/pdf/26q4slides.pdf), May 14, 2026, printed slide 11. Extracted PDF text read; multi-title MMO scope, no successful visual inspection.

<a id="e26-12"></a>**E26-12.** Square Enix, [FY2027 Q1 outline](https://www.hd.square-enix.com/eng/ir/library/pdf/27q1outline.pdf), August 10, 2026, p.3. Extracted text read; April–June segment results and management attribution.

<a id="e26-13"></a>**E26-13.** Square Enix, [7.5 press release](https://press.na.square-enix.com/FOLLOW-THE-PATHS-OF-FATE-WITH-FINAL-FANTASY-XIV-PATCH-75-TRAIL-TO-THE-), April 28, 2026. Body read; cumulative registration threshold.

<a id="e26-14"></a>**E26-14.** UserJoy, [Company milestones](https://www.userjoy.com.tw/en/about/about_05.aspx). Body read; Traditional Chinese release under 2025.

<a id="e26-15"></a>**E26-15.** [Korean official service](https://www.ff14.co.kr/main). October 2026 notices/patch body read; regional continuity only.

<a id="e26-16"></a>**E26-16.** Square Enix, [Switch 2 registration/subscription](https://na.finalfantasyxiv.com/lodestone/topics/detail/cd235c020c1016a289792d8f2da9c03bdb91bb4b), September 2, 2026. Body read; current account/subscription terms, not an ongoing introductory free period.

<a id="e26-17"></a>**E26-17.** [Mainland China 7.5 site](https://actff1.web.sdo.com/project/20240927dawntrail/patch75/index.html). Official localized body read; April 28, 2026 release/current updates, not Japan's rollout rules.

#### October 26 production addition

<a id="p26-01"></a>**P26-01.** Naoki Yoshida, [GDC 2014 primary slides](https://media.gdcvault.com/GDC2014/Presentations/GDC2014_FFXIV_Behind_The_Realm_Reborn_NaokiYoshida_v2.pdf). PDF text inspected for failure, rebuilding and production organization; no claim of watching the talk.

#### October 26 player-creation additions

<a id="m26-01"></a>**M26-01.** Square Enix, [Prohibited activities](https://support.na.square-enix.com/faqarticle.php?id=5382&kid=68216&la=1). Current third-party-software policy body read; publisher authority.

<a id="m26-02"></a>**M26-02.** Naoki Yoshida, [Account-identifier tools statement](https://forum.square-enix.com/ffxiv/threads/515102), January 24, 2025. Staff body read; correlation scope and proposed response.

<a id="m26-03"></a>**M26-03.** Dalamud, [Community plugin catalog](https://goatcorp.github.io/DalamudPlugins/plugins). Entries inspected for breadth/authorship, not a population census or comprehensive code audit.

<a id="m26-04"></a>**M26-04.** [SamplePlugin README](https://github.com/goatcorp/SamplePlugin/blob/master/README.md). Build/load/reload body read; blob `f792e33402d406007e17208b2465e62cc78f9d7a`. Old SDK-version advice not adopted as current.

<a id="m26-05"></a>**M26-05.** Dalamud, [Project layout](https://dalamud.dev/plugin-development/project-layout/). Entry point, manifest, metadata and cleanup body read.

<a id="m26-06"></a>**M26-06.** Dalamud, [Submission](https://dalamud.dev/plugin-publishing/submission/). Exact-commit build and testing/stable distribution body read.

<a id="m26-07"></a>**M26-07.** Dalamud, [Technical considerations](https://dalamud.dev/plugin-development/technical-considerations/). UI profiling and data-minimization guidance read, not tested.

<a id="m26-08"></a>**M26-08.** Dalamud, [Restrictions](https://dalamud.dev/plugin-publishing/restrictions/). Community admission rules read; not Square Enix permission.

<a id="m26-09"></a>**M26-09.** [XIVLauncher/Dalamud troubleshooting](https://github.com/goatcorp/faq/blob/main/xl_troubleshooting.md). Architecture, installer, patch gates, dependencies/support/uninstall body read; blob `2fab7553f4d2529252b6633c3e9610ac311f7ad2`. Antivirus-bypass advice excluded.

<a id="m26-10"></a>**M26-10.** [Penumbra README](https://github.com/xivdev/Penumbra/blob/testing/README.md). Assets, conflicts/import limits and support read; blob `d4be2605a2a34635762d7c997cd948a21fa8e6cf`.

<a id="m26-11"></a>**M26-11.** Penumbra, [Advanced Editing](https://github.com/xivdev/Penumbra/wiki/Advanced-Editing). Dependency/redirection body read; illustrations not separately inspected.

<a id="m26-12"></a>**M26-12.** [Brio README](https://github.com/Etheirys/Brio/blob/main/README.md). Features, original/current authors and acknowledgements read; blob `ebc3f619dbf9ff54b82153615dee9b7ae42a2450`.

<a id="m26-13"></a>**M26-13.** Caraxi, [SimpleTweaks README](https://github.com/Caraxi/SimpleTweaksPlugin/blob/main/README.md) and [feature list](https://github.com/Caraxi/SimpleTweaksPlugin/blob/main/Tweaks.md). Author purpose/features read; README blob `25b9fac45acba1f53e2e9802ee9c60093c1f373f`.

<a id="m26-14"></a>**M26-14.** Cultist, [Links and permissions](https://www.xivmodarchive.com/modid/79004). Creator terms/support/update body read; one author's rules. Linked assets/images not inspected.

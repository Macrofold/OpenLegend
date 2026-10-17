# Clash of Clans — full-game dossier (G170)

[Library](../README.md) · [Roster](../research-roster.md#october-17-mobile-successes-and-unsuccessful-services) · [Research status](../research-progress-mobile-2026-10-17.md) · [Research requirements](../research-requirements.md)

**Research date: October 17, 2026.** This is an additive reference study of the selected mobile game and its explicitly identified platform/edition counterparts. It combines documented mechanics, concrete constructed situations, original commercial evidence, production context and independent reception. It grants no OpenLegend implementation or monetization decision. Detailed access and version limitations remain beside the claims.

## Game, mechanics and player-created content

### 1. Account structure and the current service

Clash of Clans combines three persistent construction-and-attack spaces: the Home Village, the two-stage Builder Base, and the clan's collectively funded Clan Capital. Their buildings, armies and resource loops differ. Progression improves the same account rather than starting a new run. The original releases were iOS on 2 August 2012 and Android on 7 October 2013; the commercial section covers subsequent PC distribution. [Release chronology](https://en.wikipedia.org/wiki/Clash_of_Clans)

The current Home Village includes Town Hall 18, introduced in November 2025. Its defensive Guardians are an additional layer rather than attacking Heroes: choose one active Guardian, upgrade it with a builder, and account for its patrol route. Smasher emphasizes close-range area damage and rage; Longshot emphasizes ranged area damage and an explosive death. Live defenses lose an upgrading Guardian, while applicable War, League and Ranked snapshots preserve its completed level. [Supercell, TH18 release notes, 17 November 2025; full body read](https://supercell.com/en/games/clashofclans/blog/release-notes/town-hall-18-crash-lands-update/)

An important historical correction is the removal of troop, spell and siege-machine training waits and Hero recovery in March 2025. The army-preparation loop remains a composition decision, but ordinary army recovery no longer gates the next attack. Donations still consume Elixir or Dark Elixir and follow request timers; unlimited attacking therefore does not make every cooperative transaction free. The announcement also describes attacking stored village snapshots while their owners remain shielded. Such attacks give the attacker rewards without deducting the shielded owner's resources. [Supercell, training explanation, 11 March 2025; full body read](https://supercell.com/en/games/clashofclans/blog/news/troop-training-the-wait-is-over/)

The March release added editable army recipes and let players choose the Grand Warden's air or ground mode during deployment. Villagers can remove obstacles without occupying a builder. These changes reduce repeated preparation and housekeeping interactions while retaining the longer construction, laboratory and account-development commitments. Their actual effect on retention cannot be established from patch notes alone. [Supercell, Clash Anytime release notes, 24 March 2025, including rollout edits; main body read](https://supercell.com/en/games/clashofclans/blog/release-notes/welcome-to-clash-anytime-update/)

### 2. Home Village: actions, armies, defenses and development

The player rearranges buildings and walls, upgrades, collects resources, prepares armies, scouts, deploys, casts spells and triggers Hero abilities. Home Village attacks normally last at most three minutes. Stars reward Town Hall destruction, 50% destruction and total destruction. These overlapping goals allow farming, partial clearing and full clearing to require different plans. [Basic scoring; other dated claims excluded](https://en.wikipedia.org/wiki/Clash_of_Clans)

The army is an allocation of housing capacity and complementary behaviors. Target priorities matter: Sneaky Goblins seek resources and initially evade defensive targeting; Super Giants prefer defenses; Super Wall Breakers seek walls and explode even if killed en route. The attacker influences routes through deployment position, obstacles and removing alternative targets, rather than directly steering every soldier. A precise reverse-engineered pathfinding algorithm was not verified. [Supercell, Spring 2020 unit descriptions, 30 March 2020; body read, old activation prices/durations excluded](https://supercell.com/en/games/clashofclans/blog/news/the-spring-update-is-here-2/)

Army Camps constrain capacity; Barracks unlock troop types, while Laboratory research improves levels. Spell capacity and Clan Castle reinforcements add separate choices. Siege machines transport reinforcements: Wall Wrecker opens a ground route through walls; Battle Blimp crosses above them toward the Town Hall. Releasing the payload early sacrifices protection for placement control. [Supercell, TH12 release, 11 June 2018; siege/capacity sections read](https://supercell.com/en/games/clashofclans/blog/news/town-hall-12-patch-notes/)

Spells provide several kinds of intervention, with placement and timing limited by the prepared spell capacity:

| Function | Named examples and decision |
| --- | --- |
| Damage | Lightning attacks a location; Earthquake damages structures and helps break walls. |
| Sustain | Healing restores units within an area; placement must anticipate where they move. |
| Acceleration | Rage increases damage and movement; Haste emphasizes movement without the damage bonus. |
| Access | Jump temporarily lets ground troops cross walls. |
| Suppression | Freeze disables affected defenses/units; Poison damages and slows defending units. |
| Additional bodies | Clone copies eligible troops temporarily; Skeleton and Bat spells summon different attackers. |

These functional categories come from a player's detailed guide; its 2020 costs, numeric balance and meta recommendations are excluded. [Irfan Gaming, Clash School, 7 February 2020; full main body read](https://www.clashschool.com/2020/02/07/the-ultimate-spell-guide-for-all-spells-by-ifran-gaming/)

Later tools expand control: Recall removes eligible units for redeployment elsewhere without healing away their existing damage. Defensive Spell Towers choose effects including Rage, Poison and Invisibility; Monolith's damage includes a component based on the target's maximum health, making thick single units a distinct risk. [Supercell's October 2022 notes republished by Clash Champs; relevant primary-text sections read, obsolete training/TH-weapon costs excluded](https://www.clashchamps.com/2022/10/10/town-hall-15-full-release-notes-update-patch-notes/)

Overgrowth temporarily makes affected buildings untargetable, invulnerable and inactive, redirecting attackers around them; it does not suppress Clan Castle troop deployment. This is another exception to treating deployment as the player's last influence on targeting. [Supercell, 27 February 2024; gameplay body read](https://supercell.com/en/games/clashofclans/blog/release-notes/february-2024-update-patch-notes/)

Super Troops are temporary enhanced variants, activated with Dark Elixir or a Super Potion; the ordinary model permits two concurrent types, with an event exception permitting three. This is a limited-duration roster choice layered onto permanently researched troops, not randomized character acquisition. The December 2020 change established three-day activations and allowed normal and enhanced versions together. Current support confirms the two-type baseline and event exception. [Supercell, 23 November 2020; full body read](https://supercell.com/en/games/clashofclans/blog/game-updates/new-super-potion/); [current Super Troops support; substantive indexed text only](https://support.supercell.com/clash-of-clans/en/articles/what-are-super-troops-3.html)

#### Heroes, equipment and companions

The current Hero roster comprises Barbarian King, Archer Queen, Minion Prince, Grand Warden, Royal Champion and Dragon Duke. Up to four can be assigned to an army. Current support places the King's initial availability at TH4, with upgrades and equipment beginning at TH7; applying his old TH7 unlock to the whole current game would be wrong. [Current Hero support; indexed rules read, direct page returned no text](https://support.supercell.com/clash-of-clans/en/articles/about-heroes-pets-9.html)

Hero Hall level gates Hero development and supports separate offensive/defensive assignments; Hero Banners position defenders. The Builder's Apprentice accelerates construction and the Lab Assistant accelerates research, with repeat assignment available. These helpers improve timed work rather than replacing the prerequisite chain. [Supercell, TH17 release, 25 November 2024; full main body read](https://supercell.com/en/games/clashofclans/blog/game-updates/the-town-hall-17-update-is-here-2/)

Each Hero equips two items. Active equipment adds an effect the player triggers; passive equipment operates without that trigger. Barbarian Puppet summons support, Vampstache sustains the King through healing on attacks, and Earthquake Boots attack wall access. Thus the same Hero can support different plans. The Blacksmith upgrades equipment using Shiny Ore, Glowy Ore and, at relevant Epic levels, Starry Ore. These currencies have their own reward sources and bottlenecks, rather than simply duplicating Gold. The 2023 introduction is used for the system's structure, not its old unlock thresholds or present shop availability. [Supercell, Hero Equipment, 12 December 2023; full body read](https://supercell.com/en/games/clashofclans/blog/news/introducing-hero-equipment/)

At TH14, Pet House unlocks companions: assign one per Hero and develop them separately. Named examples include Unicorn's healing, Mighty Yak's wall-breaking contribution and Electro Owl's chained ranged damage. Pairing a healing pet with a Hero expected to operate alone creates a different composition from pairing wall access with a ground Hero. These are configurable combat combinations, not freeform companion dialogue. [Supercell, Hero Pets, 10 April 2021; full body read](https://supercell.com/en/games/clashofclans/blog/game-updates/meet-the-hero-pets-1-2/)

Dragon Duke adds an explicit separation incentive: he gains his rage condition when other flying troops are absent nearby. Greedy Raven, a TH18 pet introduced in February 2026, instead prioritizes resource buildings near its Hero. Their positioning requirements can therefore conflict with a generic plan to deploy every air unit together. [Supercell, February release notes, 23 February 2026; full gameplay body read](https://supercell.com/en/games/clashofclans/blog/release-notes/the-february-update-has-escaped/)

#### Economy, dependencies and defensive construction

Mines, pumps/drills and raids provide Gold, Elixir and Dark Elixir; storages limit ordinary holdings. Gold chiefly funds defenses and Town Hall growth; Elixir and Dark Elixir support military buildings, research and applicable Heroes. Storage capacity can block an upgrade even when the player knows how to earn its price. [Basic resource/building roles](https://en.wikipedia.org/wiki/Clash_of_Clans)

Construction occupies builders, while research, equipment development and pet development have distinct interfaces and constraints. The strategic dependency is concrete: advancing Town Hall opens building levels; a Barracks upgrade unlocks a troop; laboratory development makes that troop competitive; capacity improvements allow a usable composition. Spending all resources on one track can leave the others behind. This is an analytical account of the documented upgrade systems, not a universal recommended upgrade order. Ordinary five-builder development and the Builder Base route to a sixth are distinct from helper acceleration; the cross-village B.O.B route is detailed below.

The Alchemist converts resources daily, helping redirect an imbalance. Merged defenses change layout decisions: Multi-Gear Tower combines a geared Cannon and Archer Tower and offers long-range or fast-attack modes. More building levels therefore do not always mean simply filling more tiles with independent towers. [Supercell, 10 February 2025 release; full main body read](https://supercell.com/en/games/clashofclans/blog/news/get-geared-up-for-the-latest-update--3/)

Defensive placement must cover different approaches. TH17's Firespitter has a chosen facing and cone; merging Eagle Artillery into the Town Hall changes its attack behavior. Revive Spell returns a defeated attacking Hero, so defense must consider repeated pressure. [TH17 release rules](https://supercell.com/en/games/clashofclans/blog/game-updates/the-town-hall-17-update-is-here-2/)

Crafted Defenses add temporary choice at the latest Town Hall: select an active defense from the phase's options and upgrade its modules. The June 2025 introduction made these rotating experimental structures rather than permanent additions to every player's upgrade ladder. Supercharges likewise add smaller buffs to maximum-level buildings but disappear when a new ordinary level arrives. Permanent village progress and temporary maximum-level investment consequently have different durability. [Crafted Defenses, 16 June 2025; relevant body read](https://supercell.com/en/games/clashofclans/blog/release-notes/welcome-to-lets-get-crafty-update/); [Supercharges, 9 September 2024; full body read](https://supercell.com/en/games/clashofclans/blog/game-updates/september-update-full-patch-notes/)

### 3. Builder Base: a separate tactical and construction loop

Builder Base 2.0 divides sufficiently advanced bases into Builder Hall and O.T.T.O's Outpost stages, with building-allocation limits and separate layouts. Clearing stage one unlocks stage two; surviving units return to deployment with some healing, supplemented by reinforcement camps. Initially only the first stage is scouted, so preserving flexibility matters. Each stage supplies up to three stars, for six total. [Supercell, Builder Base 2.0 design, 4 April 2023; full body read](https://supercell.com/en/games/clashofclans/blog/news/builder-base-2-0-staying-small-going-deeper-2/)

Smaller armies make individual control consequential. The Cannon Cart can switch between a moving direct-fire unit and a stationary long-range mortar; the Boxer Giant has an activated protection window. Heroes introduce a separate timing problem: their abilities charge through three strengths, so waiting can improve the effect but risks losing the unit before activation. Battle Machine offers a ground option and Battle Copter an air option. At a stage transition, the player may retain the surviving Hero or choose the other eligible Hero at full health. [Supercell, Battle Copter and troop abilities, 12 May 2023; relevant main-body sections read](https://supercell.com/en/games/clashofclans/blog/news/new-battle-copter-and-troop-abilities/)

Builder Gold comes from attacks and Builder Elixir from defenses, collected through its Elixir Cart. One attack opens one defensive opportunity; these are asynchronous results, not the old head-to-head duel where one waited for an opponent. Resources are awarded rather than stolen from the defender. A daily Star Bonus concentrates rewards, but further attacks still earn resources. Offense and defense therefore feed different sides of development, and a poor defense costs trophies/opportunity rather than saved building funds. [Supercell, attacking and defending in Builder Base 2.0, 13 May 2023; full body read](https://supercell.com/en/games/clashofclans/blog/news/attacking-and-defending-in-builder-base-2-0/)

B.O.B makes Builder Base relevant to Home Village capacity. At BH9 its task chain requires three Gear Ups, a level-18 troop, a level-9 defense and combined Hero levels of 45; completion supplies an extra Home Village builder. New troops start at specified minimum levels, reducing the need to research every later unlock from level one. [Supercell, B.O.B and troop-level changes, 3 May 2023; full body read](https://supercell.com/en/games/clashofclans/blog/news/builder-base-2-0-layouts-troop-levels-and-bob/)

Builder capacity changed again in May 2026: an additional Builder Base builder appears in the shop from BH2, conditional on unlocking all Home Village builders. The publisher describes another concurrent upgrade. Its brief notice does not reconcile every named builder with the 2023 roster, so this dossier does not infer a current total from the old roster alone. [Supercell, May Update, 26 May 2026; full body read](https://supercell.com/en/games/clashofclans/blog/release-notes/may-update/)

### 4. Clan Capital: shared investment and cumulative assaults

Capital attacks use shared clan-unlocked armies; private-village Heroes stay behind. Raid Weekends provide five attacks and one possible bonus for finishing a district. Damage persists between attacks, traps remain spent, and spells can affect the following attack. District clears unlock Capital Peak; clearing the capital produces another opponent. Contributions therefore accumulate instead of each attack beginning against a pristine base. [Supercell, Clan Capital Raids, 1 May 2022; gameplay body read](https://supercell.com/en/games/clashofclans/blog/game-updates/clan-capital-raids/)

Defenses differ in what they can hit and whether damage spreads: Cannons oppose ground troops, Air Defense counters flyers, and the Capital’s Blast Bow deals splash damage. Layouts must cover these distinct threats. [Defense descriptions](https://supercell.com/en/games/clashofclans/blog/game-updates/clan-capital-raids/)

Capital Gold funds ruins and upgrades through incremental clan contributions; a project completes instantly when fully funded. Capital Hall and District Hall levels gate development. Forge collection and, when eligible, conversion of Home/Builder resources with a builder feed this shared economy. Raid Medals reward raid participation and can buy personal benefits, including reinforcements. Capital development therefore creates both collective investment and returns to the individual account. [Supercell, Capital and Forge, 1 May 2022; gameplay body read](https://supercell.com/en/games/clashofclans/blog/game-updates/capital-forge/)

Coordination must weigh personal finishing opportunities against leaving the next member a useful approach. This is an analytical implication of persistent damage, not a claim that every clan coordinates efficiently. Capital progression belongs to the clan's shared space; it is not another private Home Village to carry away when changing clans.

### 5. Ranked competition, clans and resets

Since October 2025, regular Battles offer unlimited farming/practice from TH2 without trophies; Ranked opens at TH7 and uses limited attacks in scheduled tournaments. Magic Shields protect regular-battle resources and are not shortened by attacking. Revenge targets a shadow copy rather than deducting resources from that owner again. Consequently, the current trade-off is choosing farming versus scored competition, not assuming every raid risks the same ranking. [Supercell, Ranked release, 6 October 2025; full body read](https://supercell.com/en/games/clashofclans/blog/release-notes/get-ready-for-ranked-update/)

April 2026 split Legend into III, II and I: III has 24 weekly battles, II 30, and I eight daily battles within four-week tournaments. Difficulty modifiers vary by tier. Tournament resets affect ranking, while stored account development remains. The same update added Logger, a Guardian with piercing knockback projectiles, and Sky Wagon, an aerial siege machine that distributes reinforcement barrels. Clan War Leagues also gained Titan/Legend tiers. These additions prevent the November TH18 roster or the old single-Legend format from being mistaken for the full current game. [Supercell, Sound of Clash, 27 April 2026; full gameplay body read](https://supercell.com/en/games/clashofclans/blog/release-notes/the-sound-of-clash-update/)

Regular Clan Wars use preparation followed by a battle day, with two attacks per participant against different targets. Only each enemy base's best result contributes; stars lead and destruction percentage breaks ties. Failure still earns some rewards. Friendly Wars allow arranged practice. Historical payout percentages are excluded. [Supercell, Clan Wars: Battle Day, 11 April 2018; full body read](https://supercell.com/en/games/clashofclans/blog/news/clan-wars-explained-part-2-battle-day/)

Clan War Leagues run a monthly grouped competition with a sequence of opponents, roster rotation and one attack per participant per battle day. Promotion/relegation makes sustained roster reliability valuable. The original article's 15-versus-15-only description and 18-tier count are historical: February 2026 explicitly added 5-versus-5 support, and April expanded top tiers. [Supercell, CWL introduction, 10 October 2018; full body read](https://supercell.com/en/games/clashofclans/blog/news/clan-war-leagues-are-coming-1/); [2026 smaller-war change](https://supercell.com/en/games/clashofclans/blog/release-notes/the-february-update-has-escaped/)

Clan Games give members time-limited challenges whose points unlock shared reward tiers. The 2021 rebalance explicitly shortened task workloads; it does not prove present retention effects. Current support requires completing a challenge for eligibility, permits a reward choice from each unlocked tier and adds an extra selection for reaching the personal point cap. Starting a challenge binds participation to that clan's Games, preventing collection of several clans' tracks by moving around. [Supercell, 14 October 2021 task redesign; full body read](https://supercell.com/en/games/clashofclans/blog/news/clan-games-changes-2/); [current rewards](https://support.supercell.com/clash-of-clans/en/articles/clan-games-rewards.html) and [participation](https://support.supercell.com/clash-of-clans/en/articles/clan-games.html), indexed text only.

Defeat, expiry and persistence must be separated. A destroyed Home Village represents a battle outcome, not a requirement to repurchase every building. Exposed resources and competitive standings can be lost; Builder Base resources are not stolen; Capital district damage persists within the shared raid. Timed challenges, temporary units and temporary defensive upgrades have their own expiry rules. A new season supplies a new objective/reward window rather than resetting the Town Hall to level one. These distinctions are synthesis of the mode rules above; no universal refund rule for unused event currency is assumed.

### 6. Named current mechanics and update boundaries

Hero Journey, added in June 2026, rewards cumulative Hero development with equipment and other progression items, including catch-up help. The same update introduced Ruin Witch, whose summons depend on reaching destroyed-building rubble, and Angry Spell, which temporarily redirects affected troops toward defenses; siege machines are excluded. It also added late-battle fast-forward and a Treasury for fully developed Capitals' excess contributions. [Supercell, Anime Fury release notes, 15 June 2026; full gameplay body read](https://supercell.com/en/games/clashofclans/blog/release-notes/the-anime-fury-update-is-here/)

Ruin Witch's June limit is already historical: the August update raised its summon allowance to ten and removed Ruin Knights' health decay. That update also allowed Wall Rings without a free builder, added direct activation of Revive Spell through a fallen Hero's portrait, and made the fast-forward control optional. These changes are dated corrections, not assumptions that every 2025 guide describes the October 2026 game. [Supercell, August Update, 30 August 2026; full body read](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/)

### 7. Six constructed worked situations

1. **Preserve a flexible second-stage army.** A Builder Base attacker sees first-stage defenses vulnerable to a ranged approach. They deploy only enough force to clear them, protect surviving units, then enter the second stage with those survivors and a reinforcement choice. If its defenses punish the original composition, an unused camp can supply a complementary unit. The limiting condition is that the first stage must actually be cleared; saving too much force achieves nothing if it prevents the transition. [Stage and reinforcement rules](https://supercell.com/en/games/clashofclans/blog/news/builder-base-2-0-staying-small-going-deeper-2/)

2. **Use a toggle as a targeting decision.** A Cannon Cart approaches a dangerous defensive cluster. The attacker switches it into mortar mode to exploit range, then moves it again when the current targets are gone. Meanwhile a Giant's protection is saved for concentrated incoming fire. The next decision concerns timing, not merely adding more troops; remaining stationary too early can waste attack time or leave a useful target unreachable. [Troop ability rules](https://supercell.com/en/games/clashofclans/blog/news/new-battle-copter-and-troop-abilities/)

3. **Prepare another member's Capital finish.** The first attacker removes a blocking defense, opens ground for later deployments and leaves a spell covering the remaining approach. The next attacker uses the changed deployment space and persistent spell to finish the district. That completion can award their one bonus attack. The clan then chooses the next district; damage persistence makes the first partial attempt useful even though it did not produce the finish. [Raid persistence and bonus-attack rules](https://supercell.com/en/games/clashofclans/blog/game-updates/clan-capital-raids/)

4. **Separate entry from payload.** An attacker wants reinforcements in the core. They choose a Battle Blimp, deploy it on an approach, then decide whether to release early. Destruction automatically deploys its cargo: the choice concerns where troops emerge and how long the machine protects them. Holding risks an unwanted deployment location; releasing guarantees the current location. A subsequent attempt can change the approach or payload. [Siege delivery and release](https://supercell.com/en/games/clashofclans/blog/news/town-hall-12-patch-notes/)

5. **Treat a third star as a marginal improvement.** A clan has already scored two stars on an enemy base. A member with one attack left compares attempting its third star against attacking an untouched enemy. Improving the first base contributes only the improvement, whereas an untouched target offers more potential new stars. They check remaining teammates' capabilities before committing; target scarcity and unreliable attendance can reverse the apparent best choice. [Best-result scoring](https://supercell.com/en/games/clashofclans/blog/news/clan-wars-explained-part-2-battle-day/)

6. **Turn parallel-village progress into capacity.** A player working toward B.O.B has met the defense and troop tasks but still lacks Hero levels and a Gear Up. They redirect Builder Base upgrades toward those remaining dependencies while maintaining Home Village work with existing builders. Completion creates additional construction capacity for later Home upgrades. The return depends on finishing the whole chain; spreading spending across unrelated Builder Base levels may improve combat but delay this particular payoff. [B.O.B prerequisites](https://supercell.com/en/games/clashofclans/blog/news/builder-base-2-0-layouts-troop-levels-and-bob/)

### 8. Source and access register

The adjacent citations form the source register: each identifies the system, publisher, dated update and access depth. The research combines first-party rule announcements with current primary support indexes, a republished publisher statement, and a directly authored player guide. Current values take precedence over earlier release tables. Historical patch notes document introductions and functional relationships; they are not presumed to retain every original price, capacity, unlock or balance value.

- **Bodies read:** the cited Supercell blogs' relevant gameplay sections; the full short rules/design articles; Clash School's main spell guide; the cited TH15 publisher text on Clash Champs. Long patch pages were read in their relevant sections rather than described as an exhaustive numerical audit.
- **Indexed text only:** current Hero/Pet, Super Troop and Clan Games support. Direct attempts on Hero/Pet and Clan Games pages returned empty text. Those sources support only the explicit indexed rules, and are not represented as completed full-page reads.
- **Secondary bounded corroboration:** Wikipedia's basic scoring/resource/release sections. Its mistaken later-version chronology and blanket builder requirement were excluded.
- **Unverified:** proprietary pathfinding internals, exact combat simulation tick behavior, every event's refund rules, undocumented matchmaking weights, causal retention effects, and current numeric prices/statistics for every unit. No hands-on experiment or private telemetry is implied.


### Fiction, recurring characters and stories around the village

**Scope:** this is a lightly framed fantasy war game with durable player projects and occasional authored stories. The player is addressed as Chief; the single-player campaign presents attacks on the Goblin King's bases. That does not establish a simulated kingdom with individual citizens, jobs, food needs, romance or diplomatic relations. The recurring characters primarily give recognizable faces to army roles, construction and progression. [Supercell, Google Play description, retrieved October 17, 2026](https://play.google.com/store/apps/details?hl=en&id=com.supercell.clashofclans).

The Builder is a useful example of turning an everyday action into a character attachment. In the August 2017 fifth-anniversary story he left the village to travel. Supercell supplied transparent character images and asked players to place him in photographs of their neighborhoods, with gems and merchandise as contest rewards. Here the story attached meaning to a familiar worker and invited real-world creative participation. It was a publisher-directed campaign, not an autonomous NPC departure caused by the player's treatment of workers. [Supercell, “Builder World Tour” contest, August 14, 2017](https://supercell.com/en/games/clashofclans/blog/news/builder-world-tour-contest/).

Dragon Duke's March 2026 escape illustrates how a character introduction can also organize a season. The notice described a newly freed dragon hero, temporary access at the maximum strength allowed by the player's Town Hall, bespoke challenge levels, dragon-themed army events and a volcanic-prison scenery. Those links made the fiction actionable: try the character, learn attacks and collect themed rewards. The season's time limits matter; its temporary troop injections and challenge schedule are not permanent campaign rules. [Supercell, “It's time for Dragon Escape!”, March 1, 2026](https://supercell.com/en/games/clashofclans/blog/news/its-time-for-dragon-escape/).

**Seasonal story spoiler:** June 2026's Anime Fury sequel cast the Duke as a corrupted opponent whom the other heroes confront. Ten Japanese manga artists contributed ten differently styled chapters, released daily and readable in-game. Matching hero skins, scenery and limited activities connected that story to the month's play. This is substantive authored transmedia inside the client; it does not establish that every village action advances a branching plot or that the event's alternate costumes replace the permanent setting's history. [Supercell, “Anime Fury Returns”, June 1, 2026](https://supercell.com/en/games/clashofclans/blog/news/anime-fury-returns-season-2-hits-different/).

**Interpretation:** much of the enduring narrative is the player's own village and clan history: the layout that finally defended well, the donated army that enabled an attack, or the war decided by a last attempt. Authored heroes and seasonal stories can give those activities emotional texture without requiring a large quest narrative. A transferable research question for OpenLegend is whether familiar, useful characters acquire meaning through repeated consequential interaction; a decorative backstory by itself would not test that proposition.


### Native layout creation, testing and sharing

**Concrete native creation example:** adapt a defensive village layout to test whether a different wall arrangement redirects an attacking army. In Village Edit mode, reposition buildings/walls, save an inactive revision, then inspect missing-building and obstacle warnings before using it. The editor can rotate the village in 90-degree steps; rotation triggers the layout cooldown. Saving an inactive layout can stash invalidly placed buildings, so a saved design is not necessarily ready to defend. [L01](https://supercell.com/en/games/clashofclans/blog/game-updates/quality-of-life-improvements-june21/) Use a Friendly Challenge to test the design, inspect the attack, and revise; upgrading Heroes/Pets have been usable in friendly tests since April 2026. [L02](https://supercell.com/en/games/clashofclans/blog/release-notes/the-sound-of-clash-update/) Share the resulting layout in clan chat or as a link. That link captures a snapshot: later edits require a newly generated link, and unused links can eventually expire. [L03](https://supercell.com/en/games/clashofclans/fr/blog/news/nouveau-mode-entra%C3%AEnement-et-liens-de-partage-de-plans-de-base/) A recipient taps the link to import into their Layout Editor—a workflow Supercell demonstrated with QueeN Walkers' tournament bases. [L04](https://supercell.com/en/games/clashofclans/blog/esports/queen-walkers-war-layouts-2/)


This is a constructed workflow, not a layout personally created or tested in this research. L01 is Supercell’s June 14, 2021 editor update; L02 its April 27, 2026 update; L03 its June 15, 2019 French-language sharing announcement; L04 its July 5, 2019 community-layout demonstration. Their relevant bodies were read. A saved layout still needs to satisfy the game’s validation; current numeric compatibility thresholds and the exact friendly-challenge cooldown were not independently verified. These tools arrange the game’s available buildings and defenses; they do not author new units or executable rules.

## Commercial results, production and distribution

### Commercial judgment and measurement

**Classification: established commercial success, with substantial recent tracked-store contraction.** A fourteen-year service can be an exceptional lifetime business while its latest observable annual sales decline. This case is useful because durable social investment, recurring progression purchases and continued production coexist with that decline; success should not imply uninterrupted growth or a proved current game-level profit.

| Period / disclosure | Metric and source | Scope and interpretation |
|---|---|---|
| Lifetime, disclosed 2024-02-14 | Supercell says Clash of Clans generated **over US$10 billion** during its preceding decade. [C01](https://supercell.com/en/news/comfortable-feeling-uncomfortable/) | Company-reported title revenue, with no audited title-level reconciliation, fee basis or channel breakdown in this statement. The same paragraph's **over $14 billion** covers the wider World of Clash including Clash Royale; it is not this game's standalone result. |
| Calendar 2019, reported January 2020 | Sensor Tower estimated **$727 million gross player spending**, **27% above 2018**. [C02](https://sensortower.com/blog/clash-of-clans-revenue-2019) | Historical store-intelligence estimate, not Supercell's recognized revenue or profit. Provides a dated revival episode rather than a 2026 run rate. |
| Calendar 2025 versus 2024, reported 2026-01-13 | AppMagic figures reported by Mobilegamer: **$254 million versus $323 million**, with 2025 placing 33rd. [C03](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/) | Approximately **21% lower**, calculated from rounded figures. The report excludes Apple/Google's 30%, advertising, webshops and China's third-party Android ecosystem. These are estimated net store receipts, not directly comparable with gross spending. |
| Supercell FY2025, disclosed 2026-02-10 | **€2.65 billion / $3.01 billion revenue; €0.93 billion / $1.06 billion EBITDA**. [C04](https://supercell.com/en/news/the-best-games-havent-been-made-yet/) | Entire company. The CEO identifies Clash Royale as the biggest contributor. Neither revenue nor EBITDA can be assigned to Clash of Clans; EBITDA also differs from net profit. |

**Estimation decision:** do not synthesize a current all-channel lifetime total, current payer rate, ARPPU, acquisition cost or title profit. Public channel coverage, accounting treatment and operating-cost allocation are insufficient. A decline inside tracked stores also cannot establish an equally sized decline in all-channel receipts: purchases can move between app stores and the direct shop. Conversely, merely possessing a webshop does not prove that missing receipts offset the measured decline. These are alternative explanations requiring transaction data, not corrections to apply by assumption.

### Production and sustained operation

Product lead Lasse Louhento's October 2012 interview reports six months from development start to first release, with five people initially and eight near launch. The early playable build arrived after two months. He names Travian and Backyard Monsters among gameplay references and describes reuse of knowledge from Gunshine's multiplayer balancing and client-server technology. This was experienced production using prior learning, not evidence that a modern equivalent costs only eight salaries. His stated intent was accessible strategy with deeper interactions; single-player missions were added following testing. [C05](https://www.pocketgamer.biz/chart-rush-making-of-clash-of-clans/)

The long-lived service eventually needed a different operating model. In November 2023, general manager Stuart McGaw said the Clash team had roughly doubled since January because the backlog of improvements had outgrown its small team. He acknowledged onboarding and organizational disruption and said the enlarged team was not yet at full speed. This supports treating ongoing development as a substantial continuing requirement; it does not disclose a contemporary headcount, payroll, server bill or total game budget. [C06](https://supercell.com/en/games/clashofclans/blog/community/it-takes-a-village-to-build-clash-of-clans/)

### Recurring purchases: current Gold Pass

The March 1, 2026 redesign distinguishes free Silver from paid Gold. Eight daily tasks earn stamps; completed cards yield Season Points, with cards accumulating for catch-up. Gold grants extra points, selectable skins/upgrade items and a fivefold end-of-season Hoggy Bank payout. Rewards scale to Town Hall/Builder Hall levels fixed at season start. The Prospector unlocks at 2,400 points for paying Town Hall 10+ players, converting ore every 23 hours. Silver gained randomized chests, replacing many fixed Potions. Unclaimed choices default to the first option or Gems when inventory is full. March removed the old consecutive-purchase points bonus. Buying access does not instantly grant every reward. [C07](https://supercell.com/en/games/clashofclans/blog/news/big-changes-are-coming-to-gold-pass/)

The May 26 update subsequently restored a loyalty incentive: buying in consecutive months grants an extra Stamp. From June, purchasing mid-season also retroactively grants premium points for previously completed cards. Thus March's removal is historical, not evidence that loyalty rewards remain absent. [C23](https://supercell.com/en/games/clashofclans/blog/release-notes/may-update/)

The historical evidence for a pass-led revival is suggestive rather than experimental. Sensor Tower associated the April 2019 Gold Pass launch with monthly spending reaching $66.6 million, up 58% from March, and subsequent improvement. The timing and recurring offer fit a conversion/retention explanation, but the public report does not isolate the pass from events, marketing, returning players or concurrent changes. [C02](https://sensortower.com/blog/clash-of-clans-revenue-2019)

### Purchase portfolio, distribution and marketing

**Progression and convenience.** Gems can be bought or earned, and buy additional Builder capacity, resource replenishment and immediate upgrade completion. Magic Books finish relevant ongoing upgrades, Runes fill their specified resource storage, and Potions accelerate selected processes. Items can come from play, Trader exchanges and paid bundles; distinguish these routes instead of describing every item as cash-only. These bounded descriptions use Clash Ninja's guides; their obsolete training-time and old hero-potion details are not treated as current rules. [C08](https://www.clash.ninja/guides/new-player-guide), [C09](https://www.clash.ninja/guides/what-are-magic-items)

**Seasonal rewards and deadlines.** September 2026's Equipment Blast had a separate Event Pass for extra rewards/progression. Raiding earned track tickets; medals bought equipment, ore or cosmetics. Some fixed paid-track rewards moved into randomized WWE Chests. The developer's claim that this improved value does not establish each buyer's realized outcome. Event play ended September 22; the spending window lasted until September 24. This is an observed past event, not an offer still available on the research date. [C10](https://supercell.com/en/games/clashofclans/blog/news/equipment-blast-medal-event/)

June 2026 added **Chain Offers**: successive free, Gem-paid or cash-paid steps unlock later steps, with one expiry timer for the chain. [C11](https://supercell.com/en/games/clashofclans/blog/release-notes/the-anime-fury-update-is-here/)

**Direct distribution.** The official web store offers purchase-linked Store Bonuses and ID Rewards. Web-bought Gold Passes enter Supercell ID inventory for later activation, up to eight stored passes. The inspected anonymous page exposed no live checkout price. Local prices change: Supercell's August 25, 2026 update cited exchange rates and changed several markets. A historical US price should not be presented as a universal current quote. [C12](https://store.supercell.com/clashofclans/product/gold-pass/128e4740), [C13](https://supercell.com/en/news/price-changes/)

Clash of Clans also became officially playable on Windows through Google Play Games on October 23, 2023, with mouse controls, the same gameplay, cross-play and Supercell ID progress. The original Clash team handled the port and live operation. This is an access extension of the service rather than a separately reported PC business. [C14](https://supercell.com/en/news/clash-games-live-on-pc/)

Supercell remains within Tencent's controlled gaming portfolio: Reuters' March 2026 reporting identifies the majority stake acquired in 2016; Tencent's 2026 second-quarter release still includes Supercell titles in its International Games results. Neither establishes this game's individual margin. [C15](https://www.reuters.com/world/china/trump-administration-debates-whether-let-tencent-keep-its-gaming-stakes-ft-2026-03-04/), [C16](https://www.prnewswire.com/apac/news-releases/tencent-announces-2026-second-quarter-results-302849608.html)

September 2026's second WWE collaboration combined celebrity promotion with actual raiding objectives: players searched for John Cena's base, sought a victory statue, and encountered six wrestlers represented as Hero characters, plus temporary troops and themed village presentation. **Interpretation:** recognizable personalities create a reason to notice or revisit the game; turning the campaign into raids carries that attention into its familiar loop. No public controlled measurement establishes campaign return on advertising spend. [C17](https://supercell.com/en/news/clashxwwe2/)

### Why people pay, and why that does not guarantee growth

**Analytical synthesis:** the persistent village makes elapsed effort visible. Paying can bring the next upgrade, army capability or construction slot forward; recurring passes package several useful outputs around actions a committed player already performs. Clan participation can make readiness valuable to other people as well as the purchaser. Cosmetic presentation offers an additional motive after progression utility weakens. These are mechanisms supported by the purchase and social systems, not measured proportions of player motivations.

The same structure has tradeoffs. Long waits can establish anticipation or become a reason to leave. An accumulating progression ladder gives veterans goals but raises the catch-up burden for returning friends. Seasonal deadlines create appointments but can make a hobby feel obligatory. Adding random rewards can increase surprise while weakening a player's ability to plan for a particular result. Repeated content, balancing, customer support, moderation and acquisition therefore remain part of operating the business. The commercial evidence above supports longevity and scale, but not a numerical causal decomposition into clan loyalty, pass design, celebrity campaigns or paid acquisition.

### R15 applicability — uncertain; popular external content-modding not established

**Scope:** official iOS/Android service and its Windows access, checked 2026-10-17. Built-in base construction and sharing clearly matter, but they do not by themselves satisfy R15's external-modification criterion. For example, Base Atlas advertises a catalog of user layouts imported through Supercell's official copy-link system; that is a companion distribution layer for native layouts, not an editor for new game rules. No popularity inference is made from this small app's existence. [C18](https://apps.apple.com/us/app/base-atlas/id6765773332)

Searches for Clash of Clans mods on Nexus and ModDB returned notable false positives: the inspected ModDB project modifies **Mount & Blade: Warband** using Clash-inspired troops. It is not a Clash of Clans mod catalog. [C19](https://www.moddb.com/mods/clash-of-clans)

Null's own site does advertise a separate private server with unlimited resources and multiplayer. That establishes an unofficial server offering; its self-description does not demonstrate a sustained, independently authored catalog of new scenarios, assets or rule modifications, nor audited adoption. No installation or connection was performed. [C20](https://nulls.gg/servers/nulls-clash/)

The governance distinction is explicit: Supercell's Fan Content Policy allows selling base layouts as coaching but disallows fan content made with private servers; its Fair Play policy prohibits unfair gameplay modifications and bots. Policy alone cannot prove that unofficial creation is absent. The missing evidence is a substantive modification catalog plus sustained authorship/use, so the seven-part R15 deep dive is **not triggered on present evidence**, with uncertainty retained rather than a categorical claim that modding does not exist. [C21](https://supercell.com/en/fan-content-policy/), [C22](https://supercell.com/en/safe-and-fair-play/)

### Annotated source register

All listed source bodies were read on 2026-10-17. Source IDs are local to this section.

- **C01 — Supercell, 2024-02-14, CEO retrospective.** Primary title/franchise lifetime distinction; financial scope insufficiently specified for a gross/net reconciliation. https://supercell.com/en/news/comfortable-feeling-uncomfortable/
- **C02 — Sensor Tower, January 2020, original store-intelligence analysis.** Historical estimated spending and pass-associated revival, not causal experiment. https://sensortower.com/blog/clash-of-clans-revenue-2019
- **C03 — Mobilegamer / AppMagic, 2026-01-13.** Dated annual title estimate and explicit channel/fee omissions; secondary reporting of provider data. https://mobilegamer.biz/the-top-grossing-mobile-games-of-2025/
- **C04 — Supercell, 2026-02-10.** Primary FY2025 company finances; no standalone Clash of Clans margin. https://supercell.com/en/news/the-best-games-havent-been-made-yet/
- **C05 — PocketGamer.biz, 2012-10-17, interview with Lasse Louhento.** First-person launch production and design history, not current mechanics. https://www.pocketgamer.biz/chart-rush-making-of-clash-of-clans/
- **C06 — Supercell / Stuart McGaw, 2023-11-20.** First-person explanation for expanding the live team. https://supercell.com/en/games/clashofclans/blog/community/it-takes-a-village-to-build-clash-of-clans/
- **C07 — Supercell, 2026-02-16.** Current pass rules. Its incidental 2018-origin claim conflicts with contemporaneous C02; omitted. https://supercell.com/en/games/clashofclans/blog/news/big-changes-are-coming-to-gold-pass/
- **C08 / C09 — Clash Ninja, undated guides.** Bounded Gem/item functions; stale training and hero-potion details excluded. https://www.clash.ninja/guides/new-player-guide; https://www.clash.ninja/guides/what-are-magic-items
- **C10 — Supercell, 2026-09-09.** Actual event products, deadlines and published chest probabilities; promotional value claims distinguished. https://supercell.com/en/games/clashofclans/blog/news/equipment-blast-medal-event/
- **C11 — Supercell, 2026-06-15.** Primary update. https://supercell.com/en/games/clashofclans/blog/release-notes/the-anime-fury-update-is-here/
- **C12 / C13 — Supercell, current store / August 2026 pricing notice.** Direct-store entitlements and regional variability; no checkout price verified. https://store.supercell.com/clashofclans/product/gold-pass/128e4740; https://supercell.com/en/news/price-changes/
- **C14 — Supercell, 2023-10-23.** Primary Windows launch and service compatibility. https://supercell.com/en/news/clash-games-live-on-pc/
- **C15 / C16 — Reuters, 2026-03-04 / Tencent, Q2 2026 release.** Ownership reporting plus current portfolio context; release republished by PR Newswire. https://www.reuters.com/world/china/trump-administration-debates-whether-let-tencent-keep-its-gaming-stakes-ft-2026-03-04/; https://www.prnewswire.com/apac/news-releases/tencent-announces-2026-second-quarter-results-302849608.html
- **C17 — Supercell, 2026-09-01.** First-party WWE campaign account, not an independent effectiveness study. https://supercell.com/en/news/clashxwwe2/
- **C18 — Base Atlas developer's App Store listing, current.** Native layout-sharing workflow; no adoption claim accepted. https://apps.apple.com/us/app/base-atlas/id6765773332
- **C19 / C20 — ModDB project / Null's server landing page, current.** R15 screening: another game's modification versus an unofficial server advertisement. https://www.moddb.com/mods/clash-of-clans; https://nulls.gg/servers/nulls-clash/
- **C21 / C22 — Supercell policy pages, current.** Fan Content Policy dated 2023-09-27; Fair Play page undated. Governance evidence, not proof of compliance or absence. https://supercell.com/en/fan-content-policy/; https://supercell.com/en/safe-and-fair-play/
- **C23 — Supercell, 2026-05-26.** Later loyalty and retroactive pass-point changes. https://supercell.com/en/games/clashofclans/blog/release-notes/may-update/

## Reception, enjoyment and criticism

### Five substantive written reviews

These are independently authored critical accounts, not five independent corporate owners: Pocket Gamer and 148Apps share a present publishing network. Four describe 2012 iOS play; the fifth carries an updated date over older material. This is strong evidence for the original appeal, with current testimony and patch documentation needed for the present experience.

#### 1. Peter Willington — Pocket Gamer, 18 December 2012

[Clash of Clans review](https://www.pocketgamer.com/clash-of-clans/review/). Full review body read; iPhone experience, early progression into more varied defenses; exact build unstated. The current page's Android tag does not establish an Android test in 2012.

Willington welcomes meaningful strategy inside a freemium builder: early Barbarian success gives way to walls and cannons, making Giants, Wall Breakers, deployment location, and unit counters matter. Defensive replays turn being raided into information for rebuilding. He finds the unlock sequence manageable and the opposition engaging, while waiting interrupts the moment a new plan becomes exciting. His favorable matchmaking judgment belongs to that experience; it is not evidence of current competitive fairness. The valuable retention mechanism is a visible mistake that suggests a next experiment.

#### 2. Leif Johnson — Gamezebo, 7 August 2012

[Clash of Clans review](https://www.gamezebo.com/reviews/clash-of-clans-review/). Full body read; iPhone discussion, exact build and progression endpoint unstated. The current body names Johnson but omits a date; 7 August 2012 appears in the [bibliographic reference](https://en.wikipedia.org/wiki/Clash_of_Clans) and historical article path, rather than a visible current byline date.

Johnson initially sees a familiar social builder, then values the active raiding available alongside construction. Touch deployment is simple, but choosing where to commit different troops creates decisions suitable for a short phone session. He distinguishes the lack of an explicit energy meter from practical resource scarcity: rising costs can recreate a gate and increase the attraction of premium Gems. His complaints about battlefield visibility and troop loss describe his launch experience; they should not serve as an authoritative current rules reference. His praise concerns playable tactical substance inside the familiar format.

#### 3. Brad Nicholson — TouchArcade, 16 November 2012

[Free-to-Play Friday: “Clash of Clans” — A Surprisingly Versatile Game](https://toucharcade.com/?p=116128). Full firsthand critical feature read; iOS, device/build unstated, several days of early play. This is a substantial experiential assessment rather than a scored review.

Nicholson starts by enjoying a resource economy and arranging a village, then becomes interested in attacking because that village has acquired meaning. He values seeing an actual inhabited-looking settlement over abstract social-game combat. Upgrade prerequisites constrain his freedom, and learning what raids really destroy changes his willingness to participate: apparent devastation does not erase the settlement he built. Crucially, he does not promise permanent engagement; competing games may still pull him away. This is evidence for attachment developing through construction, not longitudinal proof that the loop retains everyone.

#### 4. Rob Rich — 148Apps, 3 August 2012

[Clash of Clans review](https://www.148apps.com/clash-of-clans/clash-clans-review/). Full body read; explicitly tested on iPhone 3GS; launch period, exact build unstated. Current platform tags are not evidence of later testing.

Rich emphasizes the difference between a pleasant town and a defensible stronghold: production and fortification need simultaneous attention. The combination of solo enemy encounters and other players gives the settlement a practical purpose. He likes the distinctive, colorful presentation and recognizable warriors, but the underlying town-builder structure remains familiar and will not convert every skeptic of that genre. His phone-specific criticism is severe text crowding at small display size. This mixed assessment is useful because charm and strategic intent do not automatically overcome basic legibility or a player's dislike of scheduled construction.

#### 5. Chris Morris — Common Sense Media, last updated 11 November 2020

[Clash of Clans app review](https://www.commonsensemedia.org/app-reviews/clash-of-clans). Full authored assessment and supporting content analysis read; platform list includes iOS/Android. App details list version 5.64 and release date 6 November 2013; original review date is unverified. Older mechanics in the prose mean the 2020 timestamp must not imply a verified 2020 retest.

Morris sees a polished familiar formula and treats watching a lost defense as a route to improvement. Autonomous troops can pursue resources while suffering fire, and upgrade waits create pressure to spend. His suggestion that reaching the top needs purchases or exceptional luck is a critic's judgment, not proof that free progress is impossible. Its discussion of global chat and older maintenance chores requires historical context.

### Contrasting direct player testimony

[Google Play, US English listing](https://play.google.com/store/apps/details?id=com.supercell.clashofclans), visible review bodies read 17 October 2026; ordering is whatever the public page returned, not a verified all-review ranking. The displayed samples are anecdotal:

- **Landon, 13 September 2026:** early upgrades feel rewarding; longer high-level upgrades now suit a busier adult schedule. Continued updates sustain interest. Device, Town Hall, and spending unstated.
- **Leo Fraust, 7 September 2026:** reports repeated crashes during ranked and Clan War League attacks on a Galaxy S26 Ultra and frustration with unsuccessful support attempts. The report is not an independently reproduced bug.
- **Chris Zani, 21 September 2025:** describes lowering a previously positive rating after recruitment stopped filling the clan. The proposed Clan Notice bug is the player's hypothesis, not a confirmed cause.

[Apple App Store, US](https://apps.apple.com/us/app/clash-of-clans/id529479190), three full displayed player reviews read; exact devices/builds and spending unstated:

- **Zayzanater, 26 August 2023:** recommends continued play and appreciates updates, while objecting to near-three-day upgrades, strong attacking options, slow advertised-versus-experienced progress, and difficulty finding or populating a clan. Town Hall unstated.
- **FuryRex09, 4 April 2023:** returns after weeks or a month away, finding lost rank recoverable. A family clan created attachment; enjoyment outlasted that clan's decline and a replacement's small membership. Town Hall unstated.
- **Stormtrooper71, 12 October 2020:** explicitly reports deleting the game after repeatedly exhausting available upgrades at a maximum Town Hall and finding the waits between updates boring, despite longstanding clan friendships. This is a historical account of insufficient goals, not evidence of current content cadence.

These accounts distinguish continued play, returning after absence, and reported departure. They establish neither satisfaction rates nor population-wide reasons for quitting.

### Historical complaints versus current mechanics

[Supercell, “Home Village Changes,” 26 June 2022](https://supercell.com/en/games/clashofclans/blog/news/home-village-changes-2/), full relevant sections read: training resource costs were removed for troops, spells, and siege machines. The stated aim was freer experimentation. Consequently, launch criticism about paying resources to rebuild an attacking army must not describe the current basic attack loop.

[Supercell, “Welcome to Clash Anytime Update,” 24 March 2025](https://supercell.com/en/games/clashofclans/blog/release-notes/welcome-to-clash-anytime-update/), relevant sections read: that update introduced removal of training and Hero recovery waits, with the feature arriving after the initial update. It did not remove building, research, or Hero upgrade progression. Avoid collapsing distinct timer systems into “the game makes you wait before every attack.”

[Supercell, “The Anime Fury Update Is Here,” 15 June 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/the-anime-fury-update-is-here/), relevant sections read: rebuilt Global Chat returns through Groups, Communities, and Town Square. Angry Spell also temporarily redirects troops toward defenses. Neither permanent chat absence nor completely unchangeable targeting accurately describes this update.

### R07 — visual, audio, interface, and mobile controls

Rich praises vibrant visuals and quirky warriors viewed close up; these are specifically 2012 observations. Willington describes a pleasing isometric presentation with limited animation frames, but also camera pans mistaken for building drags and disruptive loading when returning home. These are historical touch-interface criticisms, not a present-device benchmark. Morris describes explosions, cries, and brief ghost/tombstone defeat imagery without blood. That documents stylized battle feedback; no soundtrack quality or modern audio mix was assessed firsthand here. The reading evidence suggests that visual charm and battlefield readability deserve separate evaluation.

### Research interpretation and OpenLegend hypotheses

The sources suggest three distinct reasons to return: finish something personally arranged, apply a lesson from a raid, and participate in a functioning clan. They also identify different failure points: a wait blocks an intended experiment, a control or reliability problem obscures the result, or a social group cannot sustain itself. A delay can suit one player's available time while irritating another. Neither reaction establishes that waiting is intrinsically enjoyable.

For OpenLegend, investigate whether a persistent settlement can make repeated encounters feel consequential without erasing accumulated work after failure; whether intelligible defeat feedback produces a self-chosen next attempt; and whether social coordination remains rewarding when a player returns after an absence. These are hypotheses grounded in the accounts above, not instructions to copy timers, premium acceleration, or clan obligations. Distinguish wanting to improve from returning merely because resources, rankings, or teammates might suffer.

### Access limits and viewing routes

The five critical bodies above were read in full. Common Sense Media's machine-generated parent/kid summaries were excluded. Attempted [GameFAQs](https://gamefaqs.gamespot.com/android/751143-clash-of-clans/reviews/162509) and [Modojo](https://www.modojo.com/reviews/clash_of_clans) review routes were inaccessible and do not count toward the gate. The [appreciation](https://www.reddit.com/r/ClashOfClans/comments/1jo9qjb) and [UI complaint](https://www.reddit.com/r/ClashOfClans/comments/1x54y35/they_are_taking_down_bad_ratings_regarding_ui_and/) Reddit routes also failed; their indexed snippets were excluded. No Steam review population was substituted for the mobile audience. The [official game page](https://supercell.com/en/games/clashofclans/) and current store screenshots/trailer are useful visual viewing routes, but the trailer was not watched. Later Town Hall balance and current device performance require the separate mechanics evidence and direct testing, respectively.

## Requirement coverage and preservation

| Requirement | Substantive coverage |
| --- | --- |
| R01 | Player promise, exact game identity, release and version boundaries in the game and commercial sections. |
| R02–R03 | Major mechanics inventory, named resources, capabilities, compatibility and worked situations. |
| R04 | Fictional economy, permanent versus temporary progress, time costs, failure and restart boundaries. |
| R05 | Constructed multi-system situations with conditions, actions, outcomes and limitations. |
| R06 | Character roles, authored behavior, social systems, multiplayer or explicit absences. |
| R07 | Art, sound, controls, interface, feedback and production evidence; firsthand device testing not claimed. |
| R08 | Fiction, named characters/institutions and narrative connections to actual play. |
| R09–R10 | Production, release sequence, iteration, distribution, marketing and qualified discovery hypotheses. |
| R11 | Dated financial metrics, platform/territory definitions, estimate method and missing cost/profit evidence. |
| R12 | Five substantive independent written reviews where accessible, contrasting player testimony, enjoyment and abandonment analysis. |
| R13 | Explicitly labeled transferable research hypotheses, dependencies and counterexamples. |
| R14 | Adjacent sources, annotated access/version limits, reading/viewing routes, navigation and this map. |
| R15 | Dated modding applicability finding and conditional investigation in the mechanics or commercial/creation section. |
| October 13 amendment | Commercial outcome; reasons to enjoy, return or leave; fictional economy; meaningful lore; actual creator capabilities. |

This subject had no earlier full dossier at the recorded branch base. Existing mobile reference studies, game dossiers and their historical evidence remain intact. Source observations are distinguished from interpretation and constructed examples. No gameplay, purchases, account modifications or uninspected video content are presented as firsthand evidence. The linked research ledger owns completion and commit status, including any remaining review work.

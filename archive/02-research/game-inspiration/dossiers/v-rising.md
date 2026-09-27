# G146 — V Rising

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

V Rising is most useful as a study of **making progression a hunt for embodied capability**. Its bosses are not merely gates between equipment tiers: named V Blood carriers physically inhabit the world, and defeating them advances crafting, castle infrastructure, spells, transformations, resources, traversal and access. The vampire fantasy is similarly systemic rather than cosmetic: sunlight makes shadows tactical terrain, blood type changes the current build, humans can become prisoners or servants, and a gothic castle is simultaneously home, factory, transport hub and PvP asset.

## R01 — identity, current scope, versions and player promise

Swedish studio **Stunlock Studios** develops and self-publishes V Rising. The PC version entered Steam Early Access on **May 17, 2022**, reached **1.0 on May 8, 2024**, and launched on **PlayStation 5 on June 11, 2024**. [Stunlock PS5 launch](https://blog.stunlock.com/v-rising-out-now-on-the-playstation-5/) · [PC Gamer 1.0 review](https://www.pcgamer.com/games/survival-crafting/v-rising-review/).

The current content boundary matters:

- **1.0** completed the main ascent toward Dracula, added the Ruins of Mortium/endgame, Dracula, difficulty modes, castle relocation, controller support, achievements and other major system revisions.
- **Update 1.1: Invaders of Oakveil** released **April 28, 2025**. It added Oakveil Woodlands, the Venom Blades, Megara the Serpent Queen, blood/combat/itemization changes, arenas, more castle/building content and other systems/QoL. [Stunlock 1.1 launch](https://blog.stunlock.com/invaders-of-oakveil-out-now/) · [Oakveil overview](https://playvrising.com/expansions/oakveil).
- **Patch 1.1.1** arrived in May 2026 as a balance/bug pass and explicitly did **not** require a save wipe. [1.1.1 notes](https://blog.stunlock.com/free-weekend-and-patch-notes/).
- On **March 26, 2026**, Stunlock stated that the journey to Dracula is complete and **no V Rising 1.2/content update is currently in development**. Balance and important bug-fix support continue. The studio is making a **new game in the V Rising world**, not another V Rising content patch. [Dev Update #32](https://blog.stunlock.com/dev-update-32-the-next-era/).

That March 2026 statement supersedes earlier open-ended speculation about future expansions. Cosmetic DLC remains separate from gameplay progression.

The player promise is: awaken as a weakened vampire in the handcrafted world of **Vardoran**, hunt progressively stronger V Blood carriers, steal their knowledge/power, gather and refine materials, construct an increasingly extravagant castle, maintain a useful blood supply, avoid daylight and other vampiric hazards, and eventually defeat Dracula. The same campaign can be played solo, in cooperative PvE, or under configurable PvP/server rules.

## R02 — player actions and major mechanics

### Blood is both survival resource and build layer

The vampire has a **Blood Pool** that drains over time and can be replenished by feeding on living targets. Feeding also replaces the vampire's current **blood type and quality** with that victim's, which grants tiered bonuses associated with the type. Types historically include Creature, Worker, Rogue, Warrior, Brute and Scholar; 1.1 revised blood balance and added **Corrupted Blood** plus the Blood Mixer system. [Oakveil overview](https://playvrising.com/expansions/oakveil).

Blood therefore does three things at once:

1. keeps the vampire functioning;
2. is consumed by vampiric recovery such as Blood Mend;
3. acts as a temporary build modifier.

A high-quality human is not generic food. It may be strategically worth preserving because its blood enables a preferred playstyle.

### Feeding creates an execution-versus-resource choice

Many weakened living enemies become feedable. Feeding can finish the target and replace the current blood. The player therefore asks:
- Is this blood type/quality better than what I have?
- Do I want to keep my current build bonuses?
- Is the target valuable as a potential servant/prisoner instead?

The fantasy of predation becomes a resource-selection verb.

### Sunlight makes time and shadows spatial resources

Daylight rapidly becomes lethal if the vampire remains directly exposed. Trees, rocks, walls, structures and cloud/shadow conditions can provide cover. The sun moves, so a safe shadow can cease to be safe.

This changes basic traversal:
- travel at night for speed/safety;
- during daytime, route between shadows;
- fight under cover;
- delay a long trip;
- use buildings/castle interiors.

The game does not model generic hunger/thirst. The signature "survival bar" is instead **blood plus sunlight**, which is tightly tied to the vampire premise.

### Garlic, silver and holy/radiant hazards extend the vampire rule set

Certain regions/resources punish vampires in fiction-specific ways. Garlic exposure can accumulate a debuff; carrying silver is harmful without sufficient resistance/protection; holy/radiant spaces historically require appropriate resistance. These pressures make map/resource access feel like weaknesses of a supernatural body rather than arbitrary biome keycards.

### V Blood bosses are the progression spine

The V Blood interface tracks named bosses across increasing levels/acts. Defeating them unlocks combinations of:
- recipes;
- crafting stations;
- structures;
- spells/spell points;
- transformations;
- equipment pathways;
- resource processing;
- progression into later regions.

PC Gamer's 1.0 review counted **57** V Blood bosses in its review build; Stunlock's PS5 marketing described **50+**. 1.1 adds further boss/content. Exact current count should therefore be version-dated rather than frozen to one launch-review number.

This system solves a common survival-crafting problem: "What should I do next?" The next boss is a concrete goal whose reward often expands several other systems.

### Gear level replaces conventional character XP levels

V Rising does not primarily use a normal kill-XP character-level ladder. **Gear Level** derives from equipped progression and acts as an important measure for boss/enemy difficulty.

To fight stronger V Blood targets, the player generally:
1. defeats currently viable bosses;
2. unlocks recipes/stations/resources;
3. gathers/refines required material;
4. crafts/upgrades the next equipment tier;
5. uses that gear to challenge the next targets.

Progression is therefore a **boss → knowledge → manufacturing → gear → boss** cycle.

### Combat inherits Stunlock's arena-game DNA

Combat uses direct WASD/twin-stick movement, aimed attacks, cooldown abilities, dodges/counters and positioning rather than point-and-click auto-attacks. A loadout combines:
- weapon basic attacks;
- weapon abilities;
- two regular spells;
- an ultimate;
- a movement/dash ability;
- passive/item/blood modifiers.

Weapons support distinct kits rather than being only DPS numbers. Stunlock explicitly links the feel to its decade of Bloodline Champions/Battlerite combat work. [Early design interview](https://blog.stunlock.com/interview-with-the-vampire/) · [Press Play interview](https://pressplaynews.net/2022/11/11/developer-interview-v-rising/).

Bosses commonly demand:
- reading telegraphs;
- dodging/projectile spacing;
- target priority when adds appear;
- cooldown sequencing;
- build adaptation;
- controlling arena space.

This is why multiple reviews describe the game as an action RPG at least as much as a survival game.

### Spells and schools create flexible builds

Spell progression is not locked to character classes. Players can choose among spell schools and mix abilities within the current loadout constraints. Across 1.0/1.1, spells, passives, jewels and itemization broaden build expression.

The key design is **limited simultaneous action vocabulary + broad out-of-combat reconfiguration**. The player owns many possible spells but equips a small operational set.

### Weapons and equipment

Weapon categories have unique abilities and range/mobility patterns. Armor, jewelry and weapons define Gear Level and other combat statistics. Higher-tier equipment requires region-specific processed resources and unlocked stations/recipes.

1.1 further reworked combat statistics, equipment customization and blood interactions. Patch 1.1.1 then adjusted underperforming spells and PvP/PvE balance rather than introducing another content tier. [1.1.1](https://blog.stunlock.com/free-weekend-and-patch-notes/).

### Castle Heart, territory and construction

A **Castle Heart** establishes/anchors vampire territory. Building develops from rough early structures into multi-floor gothic castles with:
- enclosed rooms;
- specialized floor types;
- crafting/refinement stations;
- storage;
- prisons;
- servant coffins;
- throne;
- waygates;
- gardens;
- decorative spaces.

Specific room/floor/station combinations can improve production efficiency. The castle is therefore not merely shelter; it is an optimization graph.

1.0's **castle relocation** system lets players move a developed castle to another qualifying location with dramatically less manual dismantling/rebuilding. PC Gamer singled this out as a major quality-of-life improvement. [PC Gamer](https://www.pcgamer.com/games/survival-crafting/v-rising-review/).

### Resource processing

The economy climbs through familiar but strongly staged material families:
- wood/stone → planks/bricks;
- copper;
- iron;
- cloth/leather;
- higher magical/metal resources;
- region- and boss-gated components.

Sawmills, grinders, furnaces, tailoring/jewel/other production stations convert raw resources. Castle layout and room bonuses reduce repeated manufacturing cost/time.

Resource refinement can continue on real/server time depending on host/server operation and configured settings. Current Steam criticism still includes frustration with long servant/crafting timers; server settings can reduce many of these waits.

### Servants turn human enemies into delegated labor

Humans can be dominated/converted and placed into **Servant Coffins**. Servants can:
- defend the castle;
- be equipped;
- be dispatched on Hunts/missions for resources.

Their origin/type and equipment matter to mission suitability/performance. This is one of the game's most relevant agent-like systems: a human encountered as an enemy can become **persistent delegated capability** rather than disappearing after combat.

It is not a deep personality simulation. Servants are primarily functional agents.

### Prisoners turn blood quality into domestic infrastructure

High-quality blood targets can be preserved in prison infrastructure rather than consumed once. Repeated blood extraction/feeding makes the castle a **blood-production economy**. The prisoner has a misery/health cost that must be managed.

This qualitatively changes exploration: spotting rare high-quality blood can trigger a "capture, don't kill" objective.

### Forms as traversal and utility unlocks

Boss progression can unlock vampire transformations/forms such as:
- wolf;
- bear;
- rat;
- frog/toad-like movement utility;
- bat and other later forms.

Forms can change traversal, stealth/avoidance or access rather than merely combat damage. Restrictions vary by form/server/content state.

### Horses and travel

Horses provide ground travel; later systems improve ownership/control. Vampire Waygates provide fast travel but historically restrict carrying some resources unless server settings relax rules. These constraints make the return trip from resource-rich regions part of the survival economy.

### Ruins of Mortium and Rift Incursions

1.0 added the **Ruins of Mortium**, Dracula-linked enemies and **Rift Incursions** as repeatable world events/endgame progression. These provide high-end resources and reasons to revisit contested worldspace after ordinary region progression.

**Soul Shards** are powerful late-game objectives/items associated with top bosses and can create PvP/social conflict depending on server rules. Exact ownership/decay/quantity behavior is server/version-sensitive.

### Oakveil and 1.1

Invaders of Oakveil adds:
- Oakveil Woodlands;
- Venom Blade faction;
- Megara the Serpent Queen;
- Venom Sap;
- Corrupted Blood;
- revised blood types;
- Blood Mixer;
- combat/itemization additions;
- new castle content;
- PvP/practice arenas with reduced/no ordinary gear-loss stakes.

[Oakveil](https://playvrising.com/expansions/oakveil).

### PvE, PvP and server rules

V Rising can be:
- solo/private;
- cooperative PvE;
- public/private PvP.

Server configuration can change:
- resource yields;
- crafting/refining rates;
- damage;
- castle limits/decay;
- PvP windows;
- raid behavior;
- teleport restrictions;
- clan/player caps;
- other survival friction.

This configurability is a major part of the design. A "V Rising rule" described by one PvP server may be a host setting rather than universal game law.

### Castle raiding

On PvP rulesets, castles become strategic targets. Siege/raid systems make:
- location;
- walls;
- defense;
- servants;
- valuable stored materials;
- online/offline timing

matter socially. Raiding can turn a home-design system into a territorial/economic conflict system.

### Death and recovery

Death rules vary by server mode/settings. On ordinary PvE/PvP configurations the vampire respawns and can recover dropped carried resources, while equipped progression is not equivalent to a hardcore full-character deletion. Historically harsher PvP variants could increase loss.

The critical lesson is to document **the server's death contract**, not assert one universal penalty across every realm.

### Useful absences

V Rising has no:
- conventional hunger/thirst bars;
- fixed RPG class chosen at creation;
- deep dialogue/romance/companion quest simulation;
- procedurally regenerated world geography each run;
- broad player-market/auction-house economy;
- normal XP character-level progression;
- current open-ended 1.2 content roadmap.

## R03 — items, entities and composition

### Blood is a temporary equipment layer

A build is not just armor/weapons/spells. Current blood contributes its own modifier package and can be replaced at any feed. That means the "character sheet" partly exists in the **world's living population**.

A good blood target can be:
- consumed for immediate build power;
- preserved as a prisoner;
- ignored to keep current blood;
- converted into a servant instead.

One entity therefore has several mutually exclusive economic meanings.

### Castle rooms compose into production chains

A functional castle is a system of:
- storage adjacent to stations;
- specialized floors/rooms;
- furnaces/sawmills/grinders;
- crafting rooms;
- prisons/blood storage;
- servant infrastructure;
- throne/mission control;
- gardens;
- teleport/access points.

Players naturally separate "pretty castle" from "efficient workshop" only until they discover the game rewards making them the same place.

### Gear and spell composition

A combat build combines:
- weapon kit;
- armor/jewelry;
- spell school choices;
- jewels/modifiers;
- current blood;
- consumables;
- passives;
- server/difficulty rules.

Because abilities are skill-shot/cooldown oriented, build power is conditional on execution rather than purely stat multiplication.

### Humans are convertible entities

Humans can be enemies, food, blood sources, prisoners or servants. This is a particularly strong systemic identity because the **same ontology supports several player relationships** rather than spawning separate "resource NPCs" and "combat NPCs."

## R04 — progression, economy, time and return loops

### Early → mid → late game

**Early**
- gather wood/stone/basic materials;
- establish Castle Heart;
- craft primitive gear;
- learn daylight/blood rules;
- hunt lower V Blood targets.

**Mid**
- expand castle production;
- move through copper/iron and later materials;
- unlock more spells/forms;
- imprison high-quality blood sources;
- build servant workforce;
- traverse Dunley/Gloomrot/other regions.

**Late**
- high-end equipment;
- Rift Incursions/Mortium;
- Soul Shards/top bosses;
- Dracula;
- Oakveil/1.1 endgame content;
- castle perfection and PvP/server goals.

### Bosses serve as both quest log and tech tree

The V Blood board/list always implies a meaningful next objective. This solves the open-world survival "I built a house; now what?" problem by connecting bosses to production unlocks.

The weakness is equally clear: current Steam players who want Rust/Minecraft-like emergent resets criticize V Rising as **too linear/replay-constrained** because repeated wipes still lead through substantially the same boss ladder.

### No player currency economy dominates progression

Resources, recipes and equipment are the real economy. Merchants and coin systems exist, but they do not replace gathering/refining/boss progression with gold purchasing.

### Real-time/server timers

Crafting/refinement and servant missions can involve waiting. In a continuously running dedicated server, time may continue while a player is away; in another host configuration it may not behave identically. Server settings can compress much of this.

Current Steam negative testimony shows that long servant/resource timers remain a meaningful playstyle complaint even in 2026.

### Wipes and version migrations

V Rising's history makes **save compatibility** a major product boundary. Major Early Access/1.0/1.1 world changes have required fresh/current saves; Stunlock preserves older versions through legacy branches rather than pretending old worlds are always forward-compatible.

March 2026's "no 1.2 in development" statement specifically notes that a new major-content wipe should not be expected soon. [Dev Update #32](https://blog.stunlock.com/dev-update-32-the-next-era/).

This is useful but should not be reframed as an eternal no-wipe guarantee for every private/public server; community servers can choose their own wipe cadence.

### Post-Dracula purpose

After completing the boss ladder, purpose can come from:
- high-end PvP/raiding;
- optimized/beautiful castle building;
- farming rare build combinations/blood;
- arenas/practice;
- replay under different server settings/difficulty;
- co-op with a new group.

A recurrent criticism is that solo/endgame replay loses momentum once the authored boss ladder is exhausted.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations.

### Case 1 — a tree shadow is temporary cover

**Intention:** cross a field during daytime to reach a boss/resource route.  
**Conditions:** direct sunlight is lethal after exposure builds.  
**Actions:** sprint between tree/building shadows, stop under cover, watch the moving sun and reroute when a shadow shifts.  
**Interaction:** time-of-day and geometry jointly determine traversability.  
**Result:** a decorative lighting concept becomes moment-to-moment navigation.

### Case 2 — don't feed on the better-looking target automatically

**Intention:** recover blood while preserving a strong combat setup.  
**Conditions:** current 90%+ preferred blood; nearby low-quality feedable enemy.  
**Actions:** decide whether to feed anyway, use another recovery option or seek a better target.  
**Interaction:** feeding restores/replaces blood but can overwrite valuable blood-type/quality bonuses.  
**Result:** "eat health pickup" becomes a build-management decision.

### Case 3 — capture a rare blood source instead of killing it

**Intention:** secure repeatable high-quality blood.  
**Conditions:** high-quality human found; domination/prison infrastructure available.  
**Actions:** subdue/transport the target, place them in prison, manage health/misery, extract blood when needed.  
**Interaction:** immediate kill/loot is sacrificed for persistent future build access.  
**Result:** a random encounter can permanently improve the home economy.

### Case 4 — boss victory becomes a manufacturing unlock

**Intention:** enter the next equipment tier.  
**Conditions:** next recipe/station is tied to a V Blood target.  
**Actions:** track target, fight it, consume V Blood, return to castle, construct unlocked station/process new material, craft better gear.  
**Interaction:** combat success changes what the domestic production system can do.  
**Result:** adventure and crafting are one progression loop, not parallel minigames.

### Case 5 — servant converts explored geography into passive logistics

**Intention:** replenish a material without personally repeating the trip.  
**Conditions:** converted/equipped servant and throne/mission system.  
**Actions:** assign the servant to a suitable Hunt region/mission.  
**Interaction:** prior exploration/unlocked areas plus servant quality/gear determine delegated resource return after a timer.  
**Result:** mastery can convert active gathering into offscreen delegation.  
**Limit:** long timers can feel like mobile-game waiting if they are not aligned with server cadence/settings.

### Case 6 — castle floor is an economic upgrade

**Intention:** reduce the recurring cost/time of metal production.  
**Conditions:** required specialized room/floor unlocked.  
**Actions:** enclose/rebuild the workshop and place stations in the matching production room.  
**Interaction:** architectural organization changes manufacturing efficiency.  
**Result:** decoration/building is mechanically connected to long-run resource economics.

### Case 7 — sunlight interrupts a boss hunt rather than pausing it

**Intention:** defeat a roaming/outdoor V Blood target.  
**Conditions:** fight begins near dawn.  
**Actions:** continue attacking while repositioning fight under trees/structures, or disengage and wait for night.  
**Interaction:** boss telegraphs/cooldowns compete with a moving environmental hazard.  
**Result:** the same boss can be meaningfully harder depending on time/place without changing its stats.

### Case 8 — PvP castle turns personal expression into strategic exposure

**Intention:** build a dramatic, resource-rich fortress.  
**Conditions:** PvP raid-enabled server.  
**Actions:** choose castle location/layout, store resources, station servants and prepare defenses.  
**Interaction:** the home is visible territorial wealth that other players can target under server raid rules.  
**Result:** aesthetic pride, industrial efficiency and strategic defensibility can conflict.  
**Boundary:** this social threat does not exist in the same form on solo/PvE worlds.

## R06 — people, AI, servants, clans and multiplayer

### NPCs are functionally rich but socially shallow

Named V Blood carriers have identity, locations/patrols, combat kits and progression meaning. Ordinary humans/creatures participate in world conflict and can fight one another, but the player does not build relationship meters or branching dialogue bonds with them.

The game's character richness comes more from **what an entity is good for** than from conversational simulation.

### Servants are persistent delegated agents

Servants are the closest thing to an owned worker system:
- converted from world NPCs;
- persistent in the castle;
- equipable;
- defend;
- perform Hunts.

They have useful traits/mission affinities rather than deep personal goals. For OpenLegend, this is a clean baseline of **delegation without personhood simulation**.

### Clans

Players can form clans to cooperate on castles/resources/combat. Official/default clan caps are server-rule dependent; Stunlock marketing often frames small groups, while private settings can differ.

Clan play changes boss fights because attacks and aggro can be distributed. PC Gamer's reviewer considered solo boss encounters meaningfully more overwhelming than group play.

### PvP information asymmetry and territory

On PvP servers:
- players can ambush resource runs;
- castles advertise investment;
- raid windows/settings shape offline risk;
- Soul Shards/high-end objectives can concentrate conflict.

This makes server governance/settings part of actual game design, not admin-only infrastructure.

### No cross-platform multiplayer assumption

PC and PS5 are separate platform contexts unless explicitly supported by current first-party networking docs. This dossier does not claim broad PC↔PS5 cross-play.

## R07 — art, audio, controls, interface and feel

V Rising uses a stylized gothic isometric presentation with strong silhouettes, readable telegraphs and dramatic spell effects. The perspective supports:
- competitive-style combat readability;
- castle overview/building;
- large enemy groups.

The day/night lighting is mechanically legible: direct sun produces strong audiovisual warning and escalating danger, while shade reads as safety.

The soundtrack and visual branding draw on gothic/vampire traditions. Stunlock's early marketing interview cites classic horror literature, Castlevania, Netflix's Castlevania and Swedish nature as influences. [Stunlock interview](https://blog.stunlock.com/interview-with-the-vampire/).

### Control lineage and PS5 friction

WASD + mouse aim grew naturally from Stunlock's arena games. The PS5 version required translating a PC-dense interface/build/combat game onto controller. Push Square and GameSpew both say the result works but menus/camera/control density can feel awkward. [Push Square](https://www.pushsquare.com/reviews/ps5/v-rising) · [GameSpew](https://www.gamespew.com/2024/06/v-rising-review-an-engrossing-vampire-filled-action-rpg/).

This is a useful distinction:
- combat feels naturally controller-compatible;
- inventory/build/menu density is the harder porting problem.

### Difficulty/server customization as accessibility

TheSixthAxis particularly praises the ability to reduce resource grind, wait time and travel restrictions while preserving combat/world play. This lets a player access the game's strongest systems without accepting every survival-friction default. [TheSixthAxis](https://www.thesixthaxis.com/2024/06/11/v-rising-review/).

## R08 — narrative, fantasy and systemic storytelling

V Rising's authored narrative is intentionally light. The broad premise:
- vampires once dominated;
- humanity rose against them;
- the player awakens weakened;
- hunt V Blood to rebuild power;
- eventually challenge Dracula and other apex entities.

1.0's Ruins of Mortium make Dracula's legacy more concrete and culminate the main power ascent.

The story's stronger delivery mechanism is **mechanical vampirism**:
- sunlight changes travel;
- blood changes builds;
- prisoners create feeding infrastructure;
- servants turn humans into labor;
- coffins/castles establish identity;
- forms express supernatural capability.

GameSpew explicitly says the game gives context and then lets the player make their own story rather than relying on dense story scenes. [GameSpew](https://www.gamespew.com/2024/06/v-rising-review-an-engrossing-vampire-filled-action-rpg/).

That creates player-authored narratives around:
- stealing a perfect blood donor;
- barely reaching shadow at dawn;
- castle feuds;
- losing/recovering loot;
- group boss kills;
- defending a home.

The tradeoff is that players wanting character-driven RPG relationships can find the world emotionally thin.

## R09 — production, technical history and design evolution

Stunlock Studios was formed in **Skövde, Sweden** around 2009 out of a university/student project that became **Bloodline Champions**. It later made Dead Island: Epidemic, Battlerite and Battlerite Royale before V Rising. [FULLSYNC interview](https://fullsync.co.uk/chatting-with-v-rising-developer-stunlock-studios/).

The studio deliberately moved away from more than a decade of competitive arena design. Early Stunlock interviews describe the project as:
- applying proven tight/skill-shot combat to an open-world survival context;
- exploring a vampire survival fantasy as a change from pure PvP;
- balancing top-down arcadey combat with immersive world/castle play.

[Dev Update #1](https://blog.stunlock.com/v-rising-dev-update-first-info-qa/) · [Interview with the Vampire](https://blog.stunlock.com/interview-with-the-vampire/).

A 2022 developer interview says the team began by wanting a new challenge after primarily PvP titles, selected survival, prototyped, and then crystallized around the vampire premise. Battlerite learning informed combat responsiveness, PvP readability and networking. [Press Play](https://pressplaynews.net/2022/11/11/developer-interview-v-rising/).

### Engine architecture

Stunlock changed technical strategy for V Rising. A published engine/dev blog explains that older games separated rendering from a custom gameplay/network engine, while V Rising moved all-in on **Unity DOTS/ECS-oriented technology** to overcome CPU/single-thread constraints and support a large networked world. [Stunlock engine PDF](https://cdn.stunlock.com/blog/docs/vrising_dev_blog_04_fr.pdf).

This is direct developer evidence of architecture motivation, not inference from frame rate.

### Early Access changed major systems

The Early Access path substantially rebuilt:
- castle construction/multi-floor behavior;
- spells;
- regions (Gloomrot);
- itemization;
- progression;
- endgame;
- controller/UI;
- difficulty;
- castle relocation;
- world events.

Major-version compatibility sometimes required new saves. Stunlock kept legacy branches for old saves rather than silently converting incompatible worlds.

### Current end of content expansion

Dev Update #32 is especially important production evidence. Stunlock says:
- it explored future directions;
- V Rising's current architecture/foundation limits some new ambitions;
- it investigated official modding support but did not believe the game structure could support tools at its desired quality;
- it chose a **new game/new architecture** in the same world rather than continuously extending V Rising.

This is a strong real-world example of recognizing an architecture's **successful endpoint** instead of forcing indefinite extensibility. [Dev Update #32](https://blog.stunlock.com/dev-update-32-the-next-era/).

## R10 — marketing, distribution, community and virality

V Rising's premise is unusually easy to communicate:
**survival crafting, but you are the vampire rather than the survivor hiding from one.**

Its strongest shareable units include:
- gothic castle builds;
- boss kills;
- PvP raids;
- high-quality blood discoveries;
- sunlight disasters;
- spell/build clips.

Stunlock had an existing Battlerite community and strong combat reputation, but V Rising reached a far broader survival audience.

Early Access created large update beats:
- launch;
- Secrets of Gloomrot;
- 1.0/Dracula/Castlevania crossover;
- PS5;
- Invaders of Oakveil.

The **Castlevania** collaboration provided a culturally legible crossover while keeping the substantive Simon Belmont encounter available as gameplay and selling a separate cosmetic pack.

2026's free weekend and large discounts show continued acquisition marketing after content completion. [Free weekend](https://blog.stunlock.com/free-weekend-and-patch-notes/).

Community servers are themselves retention/discovery infrastructure. Stunlock's March 2026 update says future communication will promote active community servers even while content development shifts away from the original game.

## R11 — commercial and participation context

V Rising is a premium game with optional **cosmetic DLC packs**, not a battle-pass/power-selling progression economy.

Public milestones must keep their wording:

- PS5 launch messaging in June 2024 said **more than 4 million vampires/players** had played V Rising. [Stunlock PS5 launch](https://blog.stunlock.com/v-rising-out-now-on-the-playstation-5/).
- At the April 28, 2025 Oakveil release, Stunlock invited newcomers to join **over 5 million players**. [Oakveil launch](https://blog.stunlock.com/invaders-of-oakveil-out-now/).

Earlier press reported milestone **copies sold** during Early Access, but this dossier uses the current first-party "players" language for the 4m/5m milestones rather than silently equating all measures.

The Oakveil launch paired the free 1.1 gameplay update with **Eternal Dominance**, a $19.99 cosmetic DLC. Other cosmetic packs historically include Eldest Bloodline, Dracula's Relics, Sinister Evolution and Legacy of Castlevania. Gameplay updates are not paywalled behind those cosmetics.

The commercial model therefore aligns monetization primarily with:
- base-game purchases;
- platform expansion;
- optional aesthetics;
- discounts/free-weekend acquisition.

No private revenue/profit/retention figure is invented.

## R12 — five substantive written reviews and current player feedback

### Five independent written reviews

1. **PC Gamer — Lewis Parker, May 7, 2024.** Strongly praises the boss→craft→gear loop, boss variety, polished combat, castle building and 1.0 quality-of-life. The main criticism is solo play: the world feels less alive alone and some bosses become oppressive without teammates. [Full review](https://www.pcgamer.com/games/survival-crafting/v-rising-review/).

2. **TheSixthAxis — Miguel Moran, June 11, 2024.** Praises V Rising specifically for solving common survival-crafting tedium through boss direction and highly granular difficulty/server customization. It likes the MOBA-like limited combat loadout and handcrafted world but finds the visuals somewhat drab/repetitive. [Full review](https://www.thesixthaxis.com/2024/06/11/v-rising-review/).

3. **GameSkinny — Ashley Erickson, May 7, 2024.** Praises castle building, V Blood recipe progression, world breadth and vampire-specific mechanics. Its central criticism is material-fast-travel restriction, which can turn gathering runs into long return journeys. [Full review](https://www.gameskinny.com/reviews/v-rising-1-0-review-a-bloody-good-survival-game/).

4. **Push Square — Robert Ramsey, June 13, 2024.** Calls the PS5 game addictive after a tedious first act. Praises later combat, bosses, server customization, solo/co-op and vampire aesthetic while criticizing early grind, slow combat ramp, controller/menu awkwardness and some PvP slog. [Full review](https://www.pushsquare.com/reviews/ps5/v-rising).

5. **GameSpew — Richard Seagrave, June 11, 2024.** Praises exploration, spell acquisition, vampire fantasy and the depth of the action-RPG/survival blend. Its primary negative is the density/fiddliness of controls on PS5. [Full review](https://www.gamespew.com/2024/06/v-rising-review-an-engrossing-vampire-filled-action-rpg/).

### Current Steam/player evidence — September 2026

Current English Steam surfaces were directly inspected.

**Recent positives include:**
- hundreds of hours of return play;
- castle/building as a major source of attachment;
- combat challenge and build experimentation;
- vampire-specific mechanics such as sunlight/blood;
- strong co-op value.

One September 19 review describes the game as a "vampire real estate simulator" with 60+ bosses and praises castle building while saying the endgame loses momentum and solo is weaker. [Current Steam surface](https://steamcommunity.com/app/1604030/reviews/?l=english).

**Recent negatives include:**
- material grind;
- late-game/meta build constraints;
- boss variance/overload;
- rubber-banding/technical complaints even in some solo contexts;
- long servant/crafting wait timers;
- low perceived replay variety because boss progression is linear;
- frustration with historical major-update save resets/wipes and active-server population cadence.

[Recent negative surface](https://steamcommunity.com/app/1604030/negativereviews/).

These are qualitative anecdotes, not frequency estimates. In particular, a player describing "every update wipes my save" is historically understandable around major versions but is **not the current 2026 content roadmap**: Stunlock explicitly says no 1.2 content update is in development and patch 1.1.1 did not require a wipe.

### Durable reception tensions

**Direction versus replay freedom.** The boss ladder solves aimlessness but can make repeat wipes feel scripted.

**Castle pride versus resource grind.** Building is one of the most loved systems, yet the materials/timers feeding it can become the primary friction.

**Skillful combat versus multiplayer scaling.** Tight arena-style combat differentiates V Rising, but solo bosses can feel more oppressive and PvP balance creates its own meta pressure.

**Vampire systems versus narrative thinness.** The fantasy is mechanically rich even when character-driven story is sparse.

**Configurable friction versus default identity.** Server rules can transform grind/travel/raiding so extensively that player accounts may describe meaningfully different games.

## R13 — transferable inspiration and limits for OpenLegend

### 1. Embody the tech tree in people and places

V Blood progression is powerful because "unlock the tannery" is not merely a menu requirement—it means **find and defeat a particular person in the world**.

For OpenLegend:
- let capabilities live in teachers, institutions, creatures, artifacts and locations;
- make gaining capability produce history/relationships;
- avoid making every progression edge an abstract XP purchase.

### 2. A fictional identity is strongest when it rewrites ordinary verbs

V Rising does not stop at vampire cosmetics:
- eat → choose/steal blood properties;
- daytime travel → shadow puzzle;
- NPC capture → prisoner/servant economy;
- home → coffin/castle;
- boss kill → drink knowledge/power.

OpenLegend should ask whether a world's ontology changes **what ordinary actions mean**.

### 3. The same entity can support several relationships

A human can be:
- prey;
- a blood build;
- a prisoner;
- a servant;
- a combat threat.

This composability is more powerful than separate bespoke entity classes for each system. In OpenLegend, one person should remain one person while different systems expose different affordances.

### 4. Delegation should be earned through world engagement

Servants convert prior capture/exploration/equipment into resource missions. The player does not unlock an abstract "passive income +10%"; they acquire an agent and assign work.

A richer OpenLegend version could preserve personality, consent, goals, relationships and failure rather than treating agents as resource drones.

### 5. Environmental weakness can make time/space mechanically alive

Sunlight gives real meaning to moving shadows. OpenLegend can make character-specific vulnerabilities transform the map dynamically.

**Limit:** frequent environmental waiting is tedious unless there are alternative routes/actions.

### 6. Buildings are better when architecture changes economics

Specialized production rooms connect aesthetic/organizational choices to manufacturing. A base can be both expressive and useful.

Avoid the opposite extreme: dozens of mandatory rooms that turn architecture into spreadsheet compliance.

### 7. Shared-world configuration is part of the product

V Rising demonstrates that death, gathering, PvP, raids, clans and timers are **world rules**, not merely difficulty numbers.

OpenLegend's authored realities can make these explicit, named configurations while preserving which laws the world actually owns.

### 8. Know when architecture should end rather than accrete

Stunlock investigated official modding/future expansion and concluded V Rising's current architecture could not support the ambitions at their desired standard. It chose a new project architecture.

This is unusually relevant to OpenLegend: extensibility is valuable, but **not every successful runtime should be forced to host every future idea**. Preserve the world/lessons and create a cleaner seam when foundational constraints are real.

### What not to copy automatically

- domination/prisoner slavery as a neutral generic worker mechanic outside this villainous vampire fiction;
- long real-time timers solely to create retention;
- wipes as a default substitute for durable world evolution;
- gear-score gating without world meaning;
- PvP raid rules in relationship-centric worlds without explicit consent/governance;
- Stunlock's protected vampire characters, Vardoran, art, boss designs or narrative.

## R14 — sources, preservation, route and requirement map

### Prior-owner / preservation check

Repository search plus the canonical game-inspiration navigation found **no prior dedicated V Rising dossier, game chapter or mechanics study**. G146 is a new September 27 survival-expansion subject. This dossier preserves:
- Early Access → 1.0 → 1.1 boundaries;
- PS5 separation where controls/platform behavior matter;
- current March/May 2026 support state;
- server/PvE/PvP variability;
- paid cosmetics versus free gameplay updates.

No video is represented as watched.

### Annotated source register

**S01 — Stunlock, Dev Update #1.** Primary early design goals: arena-game experience applied to open-world survival, server/private/PvP vision.  
https://blog.stunlock.com/v-rising-dev-update-first-info-qa/

**S02 — Stunlock, “Interview with the Vampire.”** Primary design/marketing interview: Battlerite combat lineage, vampire inspirations, castle fantasy, top-down design challenges.  
https://blog.stunlock.com/interview-with-the-vampire/

**S03 — Press Play Media developer interview, Nov. 11, 2022.** Developer account of leaving PvP-only comfort zone, survival prototyping and Battlerite lessons.  
https://pressplaynews.net/2022/11/11/developer-interview-v-rising/

**S04 — Stunlock 1.0 launch/update site.** Primary 1.0 scope: Mortium/Dracula, difficulty, castle relocation, controller/QoL, Castlevania and launch systems.  
https://playvrising.com/launch-update

**S05 — Stunlock PS5 launch, Jun. 11, 2024.** Primary PS5 date/platform and >4m-player milestone language.  
https://blog.stunlock.com/v-rising-out-now-on-the-playstation-5/

**S06 — Stunlock Oakveil launch, Apr. 28, 2025.** Primary 1.1 date/scope, >5m-player language and Eternal Dominance cosmetic-DLC boundary.  
https://blog.stunlock.com/invaders-of-oakveil-out-now/

**S07 — Oakveil official overview.** Primary 1.1 systems: Oakveil, blood revision/Corrupted Blood/Blood Mixer, combat/gear, arenas and castle additions.  
https://playvrising.com/expansions/oakveil

**S08 — Stunlock Patch 1.1.1 / Free Weekend, May 13, 2026.** Primary current balance-support context, no-save-wipe statement and detailed PvP/PvE balance rationale.  
https://blog.stunlock.com/free-weekend-and-patch-notes/

**S09 — Stunlock Dev Update #32, Mar. 26, 2026.** Primary current roadmap: V Rising content journey complete; no 1.2 in development; bug/balance support remains; mod-tool investigation rejected; new separate V Rising-world game in early development.  
https://blog.stunlock.com/dev-update-32-the-next-era/

**S10 — Stunlock technical engine/dev blog.** Primary architectural history: prior custom-engine split and V Rising move toward Unity/DOTS to address multithreading/scale constraints. Accessible PDF mirror is French, with architecture/code terms intact; used only for stated technical strategy.  
https://cdn.stunlock.com/blog/docs/vrising_dev_blog_04_fr.pdf

**S11 — FULLSYNC Stunlock interview.** Developer/studio history: 2009/student-project origins, Bloodline Champions/Battlerite lineage and horror influences.  
https://fullsync.co.uk/chatting-with-v-rising-developer-stunlock-studios/

**S12 — PC Gamer, Lewis Parker, May 7, 2024.** Full independent 1.0 review read; boss/crafting loop, castle/QoL and solo weakness.  
https://www.pcgamer.com/games/survival-crafting/v-rising-review/

**S13 — TheSixthAxis, Miguel Moran, Jun. 11, 2024.** Full independent review read; combat/loadout, handcrafted world and unusually strong server/difficulty customization.  
https://www.thesixthaxis.com/2024/06/11/v-rising-review/

**S14 — GameSkinny, Ashley Erickson, May 7, 2024.** Full independent review read; V Blood progression, castle building and fast-travel/resource friction.  
https://www.gameskinny.com/reviews/v-rising-1-0-review-a-bloody-good-survival-game/

**S15 — Push Square, Robert Ramsey, Jun. 13, 2024.** Full independent PS5 review read; grind/pacing and controller/UI criticism against strong later combat/boss loops.  
https://www.pushsquare.com/reviews/ps5/v-rising

**S16 — GameSpew, Richard Seagrave, Jun. 11, 2024.** Full independent PS5 review read; vampire action-RPG depth, exploration/spells and controller density.  
https://www.gamespew.com/2024/06/v-rising-review-an-engrossing-vampire-filled-action-rpg/

**S17 — Steam Community current English/recent-negative surfaces, Sep. 2026.** Direct qualitative player testimony for castle/combat/blood praise and grind, replay, timers, technical/wipe complaints. Not prevalence evidence.  
https://steamcommunity.com/app/1604030/reviews/?l=english  
https://steamcommunity.com/app/1604030/negativereviews/

### Suggested reading route

1. Read **S12 (PC Gamer)** for the complete 1.0 loop.
2. Read **S13 (TheSixthAxis)** for why server customization materially changes genre friction.
3. Read **S06/S07** for current 1.1 additions.
4. Read **S09** immediately afterward for the definitive September-2026 future boundary.
5. Read S01–S03 for Stunlock's transition from arena PvP into survival.
6. Compare S15/S16 for controller-specific concerns.
7. Read S17 last to see current post-content-completion replay/server tensions.

### Requirement-to-section map

| Requirement | Substantive owner |
| --- | --- |
| R01 | identity/version/platform/current support boundary |
| R02 | blood, sunlight, bosses, combat, gear, castle, servants, prisoners, PvE/PvP |
| R03 | blood/item/entity/castle composition |
| R04 | boss/manufacturing progression, timers, wipes, endgame |
| R05 | eight worked interactions |
| R06 | V Blood/NPCs, servants, clans and multiplayer |
| R07 | gothic presentation, controller and customization |
| R08 | vampire fantasy and systemic/player-authored narrative |
| R09 | Stunlock lineage, engine, EA evolution/current architecture endpoint |
| R10 | launch/update/crossover/community-server promotion |
| R11 | 4m/5m player milestones and cosmetic monetization |
| R12 | five full reviews + current Steam testimony |
| R13 | transferable patterns and limits |
| R14 | sources, preservation, route and map |

### Evidence limits

- No current server/build was installed or tested.
- No PvP raid, servant Hunt or Dracula fight was reproduced.
- No video or soundtrack is represented as watched/listened to.
- Server settings can materially change timings, death loss, PvP, teleports and progression; anecdotal rules are not generalized beyond their mode.
- Review sources primarily describe 1.0; current 1.1 systems use first-party sources and current player testimony.
- Current Steam samples are qualitative, not prevalence estimates.
- The 4m/5m first-party milestones use **players** wording and are not silently converted into copies sold or revenue.
- Stunlock's separate new V Rising-world project is not called V Rising 1.2 and is not used as evidence of current-game mechanics.

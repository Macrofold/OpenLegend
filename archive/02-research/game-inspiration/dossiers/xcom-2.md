# G125 — XCOM 2

**Status: complete full-pass research dossier.** Research date: September 26, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

XCOM 2 is a reference for converting interchangeable procedural units into people the player cares about, then making operational pressure force painful tradeoffs among those people. Its tactical battles, strategic economy and campaign clock continuously damage one another: a bad tactical win can create a strategic roster crisis, while a delayed research/build choice can make later battles materially harder.

## R01 — identity, scope and edition boundaries

Firaxis Games' XCOM 2 launched on Windows in February 2016, later reaching consoles, macOS/Linux, Switch and mobile ports through Firaxis/Feral and publishing partners. It follows XCOM: Enemy Unknown but assumes humanity lost: Earth is occupied by ADVENT and XCOM is a mobile resistance operating from the captured Avenger.

The **base game** includes the guerrilla campaign, four core soldier classes plus Psi Operatives, procedural maps, the Avenger strategic layer and the Avatar Project doomsday pressure.

Major official additions are distinct:
- **Alien Hunters** adds ruler enemies and associated weapons/armor.
- **Shen's Last Gift** adds the SPARK robotic soldier and narrative mission chain.
- **War of the Chosen (2017)** is a large expansion that overlays the campaign with three Chosen nemeses, Reapers/Skirmishers/Templars, soldier bonds, Will/fatigue/negative traits, covert actions, resistance orders, new enemies and mission/story content.
- **Tactical Legacy Pack (2018)** adds legacy operations, maps, equipment variants and retrospective material.
- **Long War 2** is a Pavonis Interactive total-conversion mod, not base Firaxis rules; **Long War of the Chosen** is a later community port/overhaul for WotC. [Long War 2 Workshop description](https://steamcommunity.com/workshop/filedetails/?id=844674609).

Original XCOM 2 included two-player tactical multiplayer. Firaxis announced that Steam multiplayer and Challenge Mode services would be retired on March 28, 2022; those features should therefore not be described as current Windows/Steam functionality. [Official Steam announcement](https://store.steampowered.com/oldnews/?appgroupname=XCOM%C2%AE+2&appids=268500&feed=steam_community_announcements&headlines=0&l=english).

## R02 — player actions and major mechanics

### Tactical action economy

Combat is turn-based on destructible isometric maps. Most soldiers receive two actions. Moving within the first-action range typically preserves a second action; sprinting/dashing spends both. Firing a standard weapon usually ends that soldier's turn, making action order central.

Core decisions include:
- move between half/full cover;
- flank enemies to remove cover protection and raise critical opportunity;
- fire, grenade, slash or use class abilities;
- enter **Overwatch** to fire reactively when an enemy moves;
- reload, heal, hack, suppress or use items;
- carry unconscious/dead soldiers to extraction when mission rules allow.

Fog of war and pod activation mean information itself is dangerous: moving one soldier too far can reveal another enemy group after the rest of the squad has spent its actions.

### Concealment and ambush

Many missions begin with XCOM concealed. Enemy detection tiles constrain movement until the squad attacks, is spotted or otherwise breaks concealment. This lets players scout, route around patrols and prepare overwatch/area attacks for an opening ambush. Timers stop concealment from becoming unlimited patience. Firaxis explicitly built concealment around the new resistance premise. [GameSpot changes feature](https://www.gamespot.com/articles/xcom-2-whats-changed-since-xcom-1/1100-6434329/).

### Cover, destruction and explosives

Cover is not permanent geometry. Grenades/heavy weapons can destroy walls, floors and roofs, remove cover and expose new lines of sight. A grenade can therefore deal damage, shred armor, eliminate defensive bonuses and physically drop a rooftop enemy or turret. The terrain is part of the combat toolkit.

### Timed objectives and retreat

Many missions demand hacking, rescuing, planting, defending or extracting within a turn limit. The system punishes pure Overwatch turtling and forces risk. Some missions can be partially failed while soldiers escape; others are campaign-critical. Knowing when to abandon an objective to preserve veterans is a real strategic decision.

## R03 — soldiers, classes, equipment and composition

### Core classes

Rookies promote into:
- **Ranger** — shotgun/sword, close assault and concealment branches.
- **Grenadier** — cannon/grenade launcher, explosives, armor destruction and suppression.
- **Specialist** — rifle plus GREMLIN drone for remote healing, hacking and support.
- **Sharpshooter** — sniper rifle/pistol, long-range and gunslinger options.
- **Psi Operative** — separately trained psychic soldier with control/support/offense.
- **SPARK** (Shen's Last Gift) — robotic heavy unit with different injury/repair and equipment rules.

WotC adds hero classes:
- **Reaper** — extreme concealment/scouting and remote explosives.
- **Skirmisher** — grapple, action economy and aggressive repositioning.
- **Templar** — focus-building melee/psionic escalation.

### Equipment

Weapons advance through conventional, magnetic and beam tiers; armor improves survivability and can add utility slots/mobility. Weapon upgrades and Personal Combat Sims specialize individual soldiers. Grenades, medikits, ammo types, mimic beacons, skulljacks and heavy weapons occupy limited slots.

The key compositional property is **role overlap without full interchangeability**. A Specialist can save a wounded Ranger remotely; a Grenadier can remove cover for a Sharpshooter; a Reaper can reveal a pod without breaking the main squad's concealment. Equipment and learned abilities amplify those dependencies.

## R04 — progression, economy and campaign time

### Soldier progression and mortality

Kills/participation earn promotions and unlock class abilities. Soldiers can be wounded for days or weeks; death is normally permanent. Training replacements therefore consumes time while losing a veteran also removes accumulated abilities, gear continuity and player attachment.

WotC expands this with **Will/fatigue**. Repeated deployment while Will is low makes soldiers Tired; sending tired soldiers back can create negative traits and battlefield Will tests. The official WotC manual also defines soldier **bonds**, which grow through compatible soldiers serving together and unlock Teamwork, Dual Strike and other benefits. [WotC manual](https://assets.2k.com/1a6ngf98576c/6LIsXornIgRpO5WnGoU1oS/d99b534548498ac045f80e5888d2c3f3/XCOM2_WOTC_ONLINE_MANUAL_SHEET_ENG.pdf).

### Avenger economy

The strategy layer allocates:
- **Supplies** for construction, gear and staffing;
- **Intel** for contacting regions, black market purchases and strategic actions;
- **Alien alloys/Elerium and corpses** for advanced research/equipment;
- **Scientists/Engineers** as labor multipliers;
- facility space and excavation time;
- contacts/communications capacity;
- research and engineering queues.

Scanning on the Geoscape advances time and produces resources/opportunities while enemy progress also advances. The Avatar Project is the central failure clock: players must expand the resistance and attack facilities/objectives to reduce or delay it.

### Research, engineering and facilities

Research unlocks weapons, armor, autopsies and plot capabilities; Engineering builds items and facilities. A Guerrilla Tactics School expands squad size and trains tactics; Proving Ground projects create experimental equipment; Resistance Comms expands reach; WotC's Resistance Ring dispatches soldiers on covert actions.

The early game is defined by scarcity and vulnerable rookies. Midgame is a race to field magnetic weapons/stronger armor while maintaining regional access. Late game can produce elite soldiers, but WotC deliberately keeps strategic disruptions alive through Chosen, fatigue, covert operations and Dark Events.

## R05 — worked interactions

### Case 1 — the "safe" move activates another pod
**Intention:** flank one remaining ADVENT soldier. **Conditions:** most squad actions already spent. **Action:** advance a Ranger several tiles. **Interaction:** the move reveals a second enemy pod. **Result:** fresh enemies receive positioning opportunities while XCOM lacks actions. **Next decision:** burn consumables, retreat, or accept exposure. **Lesson:** information radius couples movement to risk.

### Case 2 — grenade changes geometry
**Intention:** kill a turret on a roof. **Conditions:** direct shots face armor/cover. **Action:** grenade the roof/floor beneath it. **Interaction:** explosion destroys supporting terrain. **Result:** turret falls and takes destruction/fall consequences. **Limit:** explosives are finite and can destroy loot/objectives.

### Case 3 — timed mission forces imperfect cover
**Intention:** reach a hack before the countdown expires. **Conditions:** safest route requires too many turns. **Action:** dash a Specialist/Ranger to weaker forward cover. **Interaction:** strategic objective pressure increases tactical exposure. **Result:** objective becomes reachable, but a veteran may be wounded or killed. **Next decision:** complete mission or evacuate the endangered unit.

### Case 4 — wound creates a roster cascade
**Intention:** win a mission using the A-team. **Conditions:** victory leaves two veterans gravely wounded. **Action:** next urgent mission arrives before recovery. **Interaction:** strategic schedule forces rookies/backups into harder combat. **Result:** one tactical success changes the difficulty of future missions. **Lesson:** health is organizational capacity, not only HP.

### Case 5 — WotC bond turns attachment into action economy
**Intention:** rescue a bondmate trapped out of position. **Conditions:** two bonded soldiers deploy together. **Action:** spend Teamwork to grant the other an additional action. **Interaction:** an authored systemic relationship becomes tactical tempo. **Result:** bond can enable movement plus attack/extraction that would otherwise be impossible.

### Case 6 — fatigue prevents a permanent "best squad"
**Intention:** deploy highest-level soldiers every mission. **Conditions:** Will is low after repeated operations. **Action:** either rest them or deploy Tired. **Interaction:** overuse risks negative traits/panic effects. **Result:** the player develops a deeper bench. **Counterexample:** without WotC this exact fatigue system does not apply.

### Case 7 — research delay becomes future casualties
**Intention:** prioritize a utility technology over magnetic weapons. **Conditions:** ADVENT force level keeps advancing. **Action:** spend research time elsewhere. **Interaction:** enemy HP/armor rises before squad damage does. **Result:** later encounters require more actions per kill, increasing incoming fire. **Lesson:** strategic decisions surface much later as tactical risk.

### Case 8 — preserve a soldier, lose the objective
**Intention:** rescue a wounded colonel on a failing mission. **Conditions:** mission objective is becoming impossible. **Action:** pick up/escort the soldier and call or reach evacuation. **Interaction:** mission score/resources are sacrificed for human capital. **Result:** campaign continues with veteran intact. **Limit:** some critical missions cannot be abandoned without larger consequences.

## R06 — identity, relationships, factions and multiplayer

### Procedural identity

Soldiers arrive from national/name/cosmetic templates but become memorable through customization, promotions, scars, nicknames, voices and event history. The game records fallen soldiers in the memorial bar. PC Gamer's launch review specifically uses this memorial to describe remembering *how* individual soldiers died.

This is emergent characterization: a soldier may have almost no authored dialogue but becomes "the Ranger who survived three impossible rescues." Permadeath gives those histories finality.

### WotC relationships and factions

WotC formalizes social structure:
- compatible soldiers form bonds with tactical/covert benefits;
- traumatic battle states can produce fears/negative traits;
- Reapers, Skirmishers and Templars are distinct Resistance factions with hero units and strategic orders;
- the Chosen repeatedly encounter XCOM, gain knowledge/strengths, kidnap or incapacitate soldiers and are eventually hunted at strongholds.

This gives recurring enemies and allies a campaign history rather than making every mission anonymous.

### Multiplayer boundary

XCOM 2 shipped with two-player tactical multiplayer, but Firaxis retired Steam multiplayer and Challenge Mode functionality in March 2022. It is not part of the core campaign and should not be used as evidence for persistent cooperative/social play.

## R07 — art, audio, interface and feel

The resistance premise gives XCOM 2 a stronger visual contrast than Enemy Unknown: sleek ADVENT propaganda/cities versus improvised resistance spaces, the repurposed alien Avenger, personalized armor and battle-scarred soldiers. Soldier customization is not merely cosmetic catalog breadth; it increases recognition and emotional ownership.

The camera alternates between tactical overhead readability and cinematic closeups for shots, abilities and deaths. Hit-percentage UI exposes uncertainty numerically, which is why a missed 95% shot becomes emotionally memorable. The downside is that hidden modifiers/edge cases can make a formally transparent probability interface still feel deceptive; a current Steam negative review complains specifically about hidden damage caps/attributes.

Sound and combat animation sell impact, but launch performance/camera/pathing bugs were widely criticized. Destructoid's launch review is particularly valuable because it liked the underlying systems while documenting crashes, performance hitches and Ironman-damaging bugs. Those 2016 observations should not be represented as the current state of every port/build.

## R08 — story and emergent narrative

Authored plot: twenty years after losing the first war, the Commander is recovered from ADVENT captivity and rebuilds XCOM. The global resistance uncovers the Avatar Project and ultimately assaults the alien regime.

The more distinctive narrative is procedural:
- soldiers acquire nicknames and abilities;
- a low-percentage shot lands or misses;
- a veteran panics after a bondmate falls;
- a rescue mission saves a favorite operative;
- a Chosen repeatedly harasses the same campaign;
- the memorial accumulates names.

The strategic layer creates causal continuity between stories. A soldier is not merely dead "in lore": their absence changes the next squad, which may cause another loss. This mechanical persistence is why XCOM anecdotes tend to be specific and personal.

## R09 — production and development

Firaxis developed XCOM 2 after Enemy Unknown/Enemy Within. Producer Garth DeAngelis and designer Mark Nauta described roughly a two-year process of brainstorming, iteration and experimentation to GameSpot. The sequel's resistance premise justified concealment, procedural maps, mobile-base scarcity and more aggressive mission pacing rather than merely adding content. [Developer interview](https://www.gamespot.com/articles/xcom-2-how-firaxis-crafted-a-superior-sequel/1100-6434134/).

Modding was an explicit product pillar. Firaxis partnered with Long War Studios (later Pavonis Interactive) for launch-era mods, and Long War 2 later became a large total conversion. The distinction matters: its infiltration, nine-class structure and expanded strategic AI are community/Pavonis rules, not vanilla XCOM 2.

War of the Chosen functioned as an expansion-scale systems revision. Its manual documents bonds, fatigue, traits and resistance structures; reviews describe it as materially changing mid/late campaign rhythm rather than simply adding missions.

## R10 — marketing, distribution and longevity

The sequel was announced around the inversion "the aliens won," a compact narrative hook that simultaneously explained gameplay changes. PC launched first, with later console and platform ports broadening distribution.

DLC sustained the game through 2016–2018, especially War of the Chosen. Steam Workshop support created a second longevity channel: cosmetic packs, balance changes and total conversions extended play beyond official campaigns. Long War 2's Workshop page alone shows thousands of ratings and a historically large audience; its current visibility/status and WotC compatibility must be treated separately from official support.

A later PC-distribution change matters to current usability: **2K removed the 2K Launcher from XCOM 2 on Steam in November 2024.** Steam now exposes direct launch choices for base XCOM 2, War of the Chosen and mod-launcher routes. This means older launcher complaints remain historical reception evidence but are not a correct description of the September 2026 default Steam launch flow. [2K Launcher sunset](https://support.2k.com/hc/en-us/articles/34845053169939-2K-Launcher-Complete-Sunset) · [XCOM 2 Steam announcement](https://store.steampowered.com/oldnews/?appgroupname=XCOM%C2%AE+2&appids=268500&enddate=1748761200&feed=steam_community_announcements).

XCOM's strongest sharing unit is the **war story**. A screenshot of a named soldier or a text account of a catastrophic 95%-miss can be understood by another player because the systems create repeatable grammar but unique outcomes. That is an observed design property; exact acquisition impact from anecdotes/mods is not publicly attributable.

## R11 — commercial and participation context

XCOM 2 is premium software with paid expansions/DLC and free mod support. Public, audited lifetime unit/revenue totals are not consistently disclosed in the primary material read for this pass, so third-party ownership estimates are not presented as official sales.

Participation evidence is stronger:
- Steam Workshop supported extensive modding from launch.
- Long War 2 and later Long War of the Chosen accumulated large Workshop subscriber/visitor counts; these are **mod-page participation metrics**, not game sales.
- Current Steam reviews still show players with hundreds or over a thousand displayed hours, illustrating long-tail campaign/mod engagement without establishing retention rates.

## R12 — reception and player feedback

### Five independent written reviews read

**Tom Senior — PC Gamer, February 1, 2016.** Praises punishing tactical systems, classes/equipment and especially the personal histories created by soldiers and memorial deaths; also documents the campaign's harshness. [Review](https://www.pcgamer.com/xcom-2-review/).

**Mike Mahardy — GameSpot, updated September 27, 2016.** Emphasizes time pressure, strategic/tactical interplay and the willingness to continue after campaign failure; the reviewer's account of four failed campaigns is clearly firsthand experience, not universal prevalence. [Review](https://www.gamespot.com/reviews/xcom-2-review/1900-6416347/).

**Rowan Kaiser — Ars Technica, February 2, 2016.** Praises stronger thematic coherence, concealment, procedural levels, destructibility and class teamwork, while criticizing progression/difficulty states that can make a campaign effectively unrecoverable and tempt reloads. [Review](https://arstechnica.com/gaming/2016/02/xcom-2-review-best-in-class-tactical-battles-with-a-new-sense-of-style/).

**Rich Stanton — The Guardian, February 5, 2016.** Praises timers, concealment, consequence and aggressive AI for forcing players out of defensive habits, while criticizing navigation/readability in multi-level buildings. [Review](https://www.theguardian.com/technology/2016/feb/05/xcom-2-review-best-strategy-game-ever-truth-is-in-here).

**Nic Rowen — Destructoid, February 15, 2016.** Loves combat/perk strategy and global pressure but records severe launch-era bugs, hitches and crashes—especially damaging for single-save Ironman play. This is a valuable version-specific criticism, not evidence that current builds retain the same bug profile. [Review](https://www.destructoid.com/reviews/review-xcom-2/).

**Expansion context:** PC Gamer and GameSpot's War of the Chosen reviews praise factions, Chosen, bonds and new classes; PC Gamer also calls out campaign bloat. These are supplementary expansion evidence, not substitutes for the five independent base-game reviews. [PC Gamer WotC](https://www.pcgamer.com/xcom-2-war-of-the-chosen-review/) · [GameSpot WotC](https://www.gamespot.com/reviews/xcom-2-war-of-the-chosen-review/1900-6416748/).

### Steam helpful sampling

Current helpful-week Steam reviews praise research/enemy/progression variety, procedural replay and tense probability while still describing the game as difficult/unfair at times. A current negative account with substantial playtime criticizes hidden attributes/damage caps as undermining informed planning. [Current reviews](https://steamcommunity.com/app/268500/reviews/).

The all-time helpful surface contains detailed positive reviews alongside older practical complaints about launcher friction. Those complaints are valid for their posting-era experience, but the 2K Launcher itself was removed from Steam/Epic in November 2024; they should not be read as evidence that the same launcher is still mandatory in September 2026. [All-time helpful](https://steamcommunity.com/app/268500/reviews/?browsefilter=toprated) · [2K support](https://support.2k.com/hc/en-us/articles/34845053169939-2K-Launcher-Complete-Sunset).

**Sampling limit:** Steam ranking is not representative prevalence; current displayed hours do not establish hours at original posting unless explicitly supplied.

### Synthesis

Praise converges on tactical consequence, squad attachment, class synergy, destructible maps and the two-layer campaign. Criticism clusters around difficulty opacity, timers for players who prefer slower tactics, campaign snowball/failure states, UI/pathing and launch-era performance. Historical external-launcher friction is retained in dated player evidence but is **not** a current Steam platform defect after the November 2024 launcher sunset.

## R13 — transferable inspiration and limits

1. **Make procedural people mechanically expensive to lose.** Attachment strengthens when history and capability disappear together.
2. **Let injuries affect organizational scheduling.** A wound should alter who is available next, not merely pause one stat bar.
3. **Use uncertainty with transparent stakes.** Percentages make risk discussable and memorable, though hidden exceptions erode trust.
4. **Force movement with objective pressure.** Timers counter dominant passive strategies when fiction and reward justify urgency.
5. **Make terrain mutable.** Destruction turns environment from backdrop into tactic.
6. **Connect relationships to action economy.** WotC bonds make repeated joint history mechanically meaningful.
7. **Build recurring adversaries that remember the campaign.** The Chosen turn otherwise anonymous missions into rivalry.
8. **Support authored systems with mod seams.** XCOM's long tail shows how a strong core loop can sustain radical community variants.

**Limits:** permadeath plus technical bugs is intolerable; campaign snowballs can reveal failure too late; too many timers can erase deliberate playstyles; procedural soldiers need readable differentiation or deaths feel interchangeable; nemeses can become repetitive if their recurrence outlasts novelty.

## R14 — sources, preservation and map

### Primary/developer/mechanics sources
- [War of the Chosen manual](https://assets.2k.com/1a6ngf98576c/6LIsXornIgRpO5WnGoU1oS/d99b534548498ac045f80e5888d2c3f3/XCOM2_WOTC_ONLINE_MANUAL_SHEET_ENG.pdf) — official bonds, Will/fatigue, negative traits and resistance mechanics.
- [Official Steam multiplayer retirement announcement](https://store.steampowered.com/oldnews/?appgroupname=XCOM%C2%AE+2&appids=268500&feed=steam_community_announcements&headlines=0&l=english) — Steam mode retirement.
- [2K Support — Launcher Complete Sunset](https://support.2k.com/hc/en-us/articles/34845053169939-2K-Launcher-Complete-Sunset) and [XCOM 2 Steam announcement](https://store.steampowered.com/oldnews/?appgroupname=XCOM%C2%AE+2&appids=268500&enddate=1748761200&feed=steam_community_announcements) — November 2024 removal of the 2K Launcher and current direct/base/WotC/mod-launch options; used in the September 27 audit to qualify older launcher complaints.
- [GameSpot developer interview](https://www.gamespot.com/articles/xcom-2-how-firaxis-crafted-a-superior-sequel/1100-6434134/) — production/iteration with Firaxis producer/designer.
- [Long War 2 Workshop](https://steamcommunity.com/workshop/filedetails/?id=844674609) and [Long War of the Chosen](https://steamcommunity.com/sharedfiles/filedetails/?id=2683996590) — mod authors' scope descriptions; explicitly non-vanilla.

### Critical/player sources
Five independent base-game reviews are summarized in R12: PC Gamer, GameSpot, Ars Technica, The Guardian and Destructoid. WotC reviews are supplemental. Current/all-time Steam surfaces supplied qualitative player evidence.

### Preservation
G125 is a newly curated subject. Direct branch-path checks found no prior dedicated XCOM 2 dossier or game chapter. This file therefore does not overwrite a prior XCOM owner. Enemy Unknown/Within and community total conversions are not silently imported as XCOM 2 base rules. Packet-wide P01–P05 gates remain separate.

### Requirement map

| Requirement | Coverage |
| --- | --- |
| R01 | Base/WotC/DLC/mod/platform/multiplayer boundaries |
| R02 | Two-action tactics, concealment, cover, destruction, timers |
| R03 | Classes, gear and squad composition |
| R04 | promotions, injury/death, fatigue/bonds, Avenger economy/research |
| R05 | Eight tactical-strategic worked cases |
| R06 | procedural identity, WotC relationships/factions, multiplayer boundary |
| R07 | faction visual language, customization, camera/UI and technical friction |
| R08 | authored resistance plot plus persistent emergent soldier stories |
| R09 | Firaxis iteration, mod partnership and expansion production |
| R10 | resistance hook, ports/DLC, Workshop and shareable war stories |
| R11 | premium model and bounded participation evidence |
| R12 | five written reviews plus WotC and Steam evidence |
| R13 | transferable attachment/pressure/system patterns and limits |
| R14 | annotated sources, preservation and map |

**Completion review:** R01–R14 are substantively covered; WotC/DLC/mod boundaries are explicit; eight cross-layer situations are present; five independent written base-game reviews plus expansion criticism and Steam samples were read; online mode retirement is dated; and no pre-existing XCOM dossier was overwritten.

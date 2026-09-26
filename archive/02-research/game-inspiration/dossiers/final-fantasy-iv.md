# Final Fantasy IV — full research dossier

**G81 · In-progress research checkpoint, September 26, 2026.** This dossier treats the **1991 Final Fantasy IV design** as the primary subject while separating materially different releases: the localized SNES version once titled *Final Fantasy II* in North America, later 2D ports, *Final Fantasy IV Advance*, the Nintendo DS 3D remake and its descendants, *Final Fantasy IV: The Complete Collection*, and the 2021+ *Pixel Remaster*. The roster specifically requires fixed identities, Active Time Battle, party turnover, abilities, equipment, world/narrative progression and remake differences. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

**Checkpoint boundary:** core mechanics, narrative-system relationships, production history and the major remake branches are drafted below. Before this pass can be marked complete it still needs (1) a final edition/release chronology check, (2) five fully inspected independent written reviews with balanced reception synthesis, (3) current Steam top/helpful positive and negative sampling, (4) dated commercial/participation milestones with metric definitions, (5) a source-anchor/link audit and final R01–R14 requirement map. No completion is claimed yet.

## 1. Identity, scope, and player promise

*Final Fantasy IV* is Square's 1991 role-playing game built around an unusually tight marriage of **authored character identity, real-time pressure inside menu combat, and a linear dramatic journey**. The player begins as Cecil, a Dark Knight and captain of Baron's Red Wings, then travels through a sequence of kingdoms, dungeons and world layers while companions repeatedly join, leave, return or transform for story reasons.

The original design is not a freeform class-building RPG. It gives the player a rotating cast whose combat verbs express who those characters are:
- Cecil begins as a Dark Knight and later becomes a Paladin;
- Kain is a Dragoon defined by Jump;
- Rosa is a White Mage and archer;
- Rydia is a summoner and spellcaster whose abilities change with her story;
- Yang is a Monk;
- Palom and Porom are complementary Black/White Mage twins who can Twincast;
- Edge is a Ninja who can dual-wield, Throw, Steal and use Ninjutsu;
- other temporary characters similarly arrive with authored specialties.

Takashi Tokita later described the game as an attempt to combine the stronger character/story emphasis associated with *Final Fantasy II* and the job variety of *Final Fantasy III*: instead of letting the player freely change jobs, FFIV distributes that mechanical variety across distinct people. [FFIV01](#ffiv01)

That decision defines the player promise. The player is not primarily asking, “What class should Cecil become?” The game asks, “Given **this** party, **this** character history, and **this** immediate threat, how do I use the verbs I have now?”

## 2. Edition boundaries: there is no single timeless FFIV ruleset

The game's long re-release history makes version discipline essential.

### 2.1 Original Super Famicom / SNES family

The Japanese Super Famicom release is the 1991 source design. The first North American SNES release was titled **Final Fantasy II** because the original Japanese FFII and FFIII had not received equivalent North American releases. That localization also simplified or removed some commands and content. Those changes should not be silently projected back onto the Japanese original, and the later Japanese *Easy Type* is not treated here as proof that every North American simplification was identical.

### 2.2 Advance and later 2D expansion branch

*Final Fantasy IV Advance* preserved the 2D game while adding later-game party-selection and bonus-dungeon material. Those additions materially change the original's authored endgame-party constraint: the original's final party is story-selected, whereas the Advance branch eventually gives the player more control over which returning allies enter optional/endgame content. [FFIV02](#ffiv02)

### 2.3 Nintendo DS 3D remake branch

The Nintendo DS remake is not merely the SNES game with polygonal graphics. It adds:
- fully 3D characters/environments and voiced presentation;
- a substantially revised translation/presentation;
- higher encounter/boss difficulty;
- the **Augment** system, which lets one-use items teach abilities to characters and therefore creates build composition absent from the original;
- new side systems and remake-specific content such as Namingway-related material, map-completion rewards and Whyt;
- New Game+ support and other remake-specific changes.

Augments are especially important to the design comparison because they partially relax the original's “identity equals fixed command set” rule. An ability such as Counter, Draw Attacks, Darkness or Dualcast can be reassigned through a scarce one-use item, creating build planning without turning FFIV into a class-switching game. [FFIV03](#ffiv03) [FFIV04](#ffiv04)

### 2.4 Complete Collection

The PSP *Final Fantasy IV: The Complete Collection* packages a polished 2D FFIV with the later *The After Years* and a new connecting episode, *Interlude*. Those sequel systems are not base-FFIV mechanics. The bundle matters as preservation/version history, but moon-phase and Band mechanics in *The After Years*, for example, must not be backfilled into G81's original game. [FFIV05](#ffiv05)

### 2.5 Pixel Remaster

The 2021 *Pixel Remaster* deliberately returns closer to the original 2D content/mechanical line rather than serving as a “definitive edition” containing every Advance/DS/PSP addition. It updates pixel art, soundtrack, interface and convenience features. Later updates added optional encounter toggling, EXP multipliers, an original-BGM choice and other presentation/accessibility controls. [FFIV06](#ffiv06) [FFIV07](#ffiv07)

That means a useful modern comparison is:

- **original / Pixel Remaster:** authored fixed kits and story-selected party, with modernized convenience;
- **Advance:** 2D base plus late optional party freedom/bonus content;
- **DS/3D:** same broad narrative spine but harder encounters and a new build layer through Augments;
- **Complete Collection:** preservation/bundle branch with sequel/interlude material.

For OpenLegend, this is a valuable case in how a remake can alter **player agency and optimization** even when the plot appears familiar.

## 3. Core action vocabulary

Outside battle, the player:
- walks through towns, castles, caves, towers, overworld terrain and later distinct world layers;
- talks to NPCs;
- searches containers and environmental tiles for treasure;
- buys/sells equipment and items;
- rests at inns or uses recovery resources;
- equips weapons/armor and arranges formation;
- saves on the overworld and at designated dungeon save points in the classic structure;
- uses progressively unlocked vehicles to cross otherwise impassable terrain;
- pursues a small set of optional summons, weapons and side areas around a heavily authored main route.

Inside battle, the recurring verbs are:
- Attack;
- character-specific commands such as Jump, White Magic, Black Magic, Summon, Kick, Sing, Steal, Throw or Ninjutsu;
- Item;
- Defend;
- Row/formation changes;
- escape/flee where allowed.

The important design pattern is that **verbs are concentrated by character** rather than pulled from one universal action pool.

## 4. Active Time Battle: time becomes a combat resource

FFIV is the first mainline Final Fantasy built around **Active Time Battle (ATB)**. Hiroyuki Ito designed the system; Tokita later recalled Ito using Formula 1 lapping as an analogy for characters with different speeds acting at different frequencies. [FFIV01](#ffiv01)

In broad terms:
1. each combatant has a time gauge;
2. when a party member becomes ready, the player chooses an action;
3. actions can themselves involve execution/casting delay;
4. other combatants continue advancing according to the selected battle mode and rules;
5. speed therefore changes not only turn order but **how often** someone may act over a span of combat.

The classic configuration supports **Active** and **Wait** behavior. In Active mode, enemy time continues while the player is navigating commands/menus; Wait pauses relevant action progression while the player is inside certain selection menus. [FFIV08](#ffiv08)

This produces several design effects:

- **hesitation has a cost:** menu literacy and familiarity matter;
- **speed is multiplicative:** a fast actor can receive more opportunities, not just an earlier fixed turn;
- **casting creates windows:** selecting a spell does not always imply immediate resolution;
- **enemy reactions matter:** Tokita identifies FFIV as the first game in the series to implement enemies that react/counter in response to player actions, which becomes more legible and dramatic inside ATB. [FFIV01](#ffiv01)

The result is not action combat, but it prevents menu selection from being completely detached from urgency.

## 5. Fixed characters as mechanically legible people

### Cecil

Cecil begins as a Dark Knight with equipment and abilities emphasizing offense. His transformation into a **Paladin** is not cosmetic: the game redefines his equipment/command identity, gives him limited White Magic and Cover, and in the classic structure resets his level so he must rebuild strength under a new role. [FFIV09](#ffiv09)

This is an unusually direct story-system statement: redemption costs accumulated numerical power in exchange for a different identity and responsibility.

### Kain

Kain's signature **Jump** removes him from ordinary ground interaction before a delayed diving attack. Mechanically, that changes both damage timing and exposure: the Dragoon can be absent while other actions resolve. Narratively, Kain is also one of the game's least stable party presences. The same character who creates temporal discontinuity in battle repeatedly creates relational discontinuity in the story.

### Rosa

Rosa supplies White Magic and ranged bow use. Healing, revival, status recovery and support make her function distinct from a generic damage caster. Some commands vary by version, another reason not to treat every rerelease as identical. [FFIV09](#ffiv09)

### Rydia

Rydia embodies progression through narrative change. She begins with a young mage/summoner identity, disappears into the Feymarch, and later returns older with a changed spell profile and much stronger summoning role. Her growth is therefore not merely “gain levels”; the story itself changes the available mechanical vocabulary.

### Palom and Porom

The twins have complementary Black/White Mage identities and can **Twincast** together. This is a small but important composition rule: an ability exists because two particular people are simultaneously present and cooperating.

### Edge

Edge combines physical and magical utility:
- dual-wielding;
- Steal;
- Throw, which converts inventory weapons into combat effects;
- Ninjutsu.

This makes inventory itself part of his tactical vocabulary: an otherwise valuable weapon can become a one-use attack.

### Temporary allies

Tellah, Edward, Yang, Cid and FuSoYa each change what the party can do while present. That prevents the campaign from settling into one stable optimal rotation too early, but it also removes long-term party-composition agency.

**Transferable tension:** forced party turnover can keep tactics fresh and make mechanics narratively expressive, but players who want to master/self-author one persistent build may experience it as loss of control.

## 6. Magic, summons, statuses, and composition

The classic game distributes several magic families:
- White Magic;
- Black Magic;
- Summon;
- Ninjutsu;
- Twincast as a paired specialty.

Magic is not simply a second damage type. It interacts with:
- elemental weaknesses/resistances;
- healing and revival;
- buffs/debuffs;
- transformation/status effects;
- reflection;
- environmental hazards.

Tokita specifically recalled that areas such as the Sylph Cave and Passage of the Eidolons were built to make **Levitate/Float** materially useful, rather than letting magic exist only as battle-menu decoration. [FFIV01](#ffiv01)

That principle matters: an ability becomes more memorable when it solves a **world rule** rather than only modifying DPS.

Summoning also has narrative geography. Rydia's Eidolons are not just anonymous spell effects; optional areas and encounters connect powerful summons to places/characters in the world. The game therefore makes some combat verbs feel like relationships discovered in the fiction.

## 7. Equipment, inventory, items, and meaningful constraints

Equipment is character-restricted rather than universally interchangeable. Weapon/armor choice can affect:
- physical attack/defense;
- magic defense/evasion;
- elements;
- status infliction/resistance;
- stat bonuses/penalties;
- whether a shield can be equipped;
- special behaviors.

Examples in the classic equipment tables include elemental weapons, status-inflicting weapons, the Berserk-inducing Avenger and HP-absorbing Blood Sword. [FFIV10](#ffiv10)

This creates a modest composition layer even in a game without freeform jobs:
- *who* can equip the item;
- what enemy/environment it counters;
- whether a special property is worth raw-stat tradeoffs;
- whether the item is better equipped, sold, retained or—in Edge's case—thrown.

Consumables provide healing, revival, status recovery, escape/travel and battle utility depending on edition. Key items gate authored story/world progression.

There is **no base-game crafting system** comparable to later sandbox/RPG crafting loops. Acquisition is primarily treasure, shops, drops, optional quests/areas and story rewards. That absence is useful: FFIV's equipment game is about **selection and discovery**, not production.

## 8. Progression, economy, failure, and time

### Character progression

The classic spine is conventional level/EXP growth with character-specific stat/spell progression. It has:
- no player-authored job tree;
- no perk graph;
- no universal skill-point economy;
- no respec loop.

The major exception is Cecil's authored Dark Knight → Paladin transformation, while the DS remake adds the separate Augment build layer.

### Economy

Gil finances:
- weapons/armor;
- consumable items;
- inn/recovery services.

Treasure and drops can bypass shops or supply rare equipment. The economy mainly supports travel/combat preparedness; it is not a simulated trade economy.

### Failure and recovery

KO can be reversed by revival effects/items when the party can act. Total party defeat returns the player to prior saved progress rather than creating a persistent corpse/recovery world state.

The save structure matters to pacing:
- overworld saving is comparatively permissive;
- dungeon saving is constrained to designated points;
- save points therefore also telegraph a change in risk, often near major encounters.

Tokita remembered the final dungeon's pre-boss save point as part of deliberate difficulty shaping. [FFIV01](#ffiv01)

### Grind and encounter pressure

Random encounters provide EXP/gil and resource attrition. Contemporary rereleases expose a core tension: the original economy/difficulty assumed some amount of encounter volume, while modern convenience settings can drastically change leveling pace and threat. Pixel Remaster's encounter toggle and EXP multipliers are therefore not “just UX”; they let the player rewrite the campaign's time/economy curve. [FFIV06](#ffiv06)

## 9. World progression and traversal tools

FFIV's world is strongly gated, but it repeatedly changes the player's **mobility vocabulary** rather than only unlocking the next door.

The campaign uses combinations of:
- walking/overworld travel;
- a hovercraft for shallow terrain;
- airships;
- airship upgrades/transport interactions;
- an Underworld layer with its own traversal restrictions;
- special flight capabilities;
- eventually the **Lunar Whale**, which connects Earth and the Moon. [FFIV11](#ffiv11)

The Lunar Whale itself functions as more than a menu teleport in the classic game: it is a diegetic vehicle/location that can provide services while also opening a new world layer.

This creates a useful sequence:
1. learn the current map as bounded;
2. gain a traversal capability;
3. reinterpret previously visible barriers;
4. reach a new region or world layer;
5. encounter new resource/enemy/story constraints.

**OpenLegend pattern:** progression can live in **world permission** rather than a character-level gate. A vehicle, relationship or physical tool can expand the set of reachable plans.

## 10. Dungeons and encounters as rule tests

FFIV's strongest encounters are often memorable because they temporarily change the ordinary combat rule rather than merely increasing HP.

The game's overall encounter vocabulary includes:
- enemies with elemental weaknesses/resistances;
- enemies that counter particular categories of actions;
- bosses whose state changes alter what is safe to do;
- environmental constraints that make particular magic/equipment relevant;
- battles in which timing under ATB matters;
- optional superboss/summon encounters that reward preparedness rather than mandatory progression.

Tokita explicitly described the introduction of reaction/counter behavior in FFIV: an enemy might respond to being attacked, creating a primitive sense that the opponent is **reading what the player did**. [FFIV01](#ffiv01)

That is the important transferable idea. A tactical system gains depth when enemies expose *conditional rules*:
- “do X while state Y is active and the enemy punishes you”;
- “wait for state Z”;
- “use a non-obvious defensive/utility tool”;
- “change formation/equipment rather than only grind levels.”

The limitation is opacity. If a counter rule is poorly telegraphed, the interaction feels like trial-and-error punishment rather than an intelligible world law.

## 11. Story and mechanics are intentionally interlocked

**Major plot spoilers in this section.**

FFIV is highly authored:
- Cecil begins complicit in Baron's violent crystal campaign;
- his guilt and rejection of the Dark Knight identity lead to the Paladin transformation;
- Kain's loyalty and jealousy are repeatedly disrupted through Golbez's control;
- Rosa and Cecil have an authored romance rather than a player-selected relationship;
- Rydia's time in the Feymarch changes both her age and combat identity;
- party members repeatedly leave because of sacrifice, injury, capture, allegiance or plot circumstance;
- the campaign expands from kingdom conflict to an Underworld and lunar/cosmic scale.

The game does not provide dialogue trees that let the player rewrite those relationships. Instead it uses **party composition as narrative state**.

This can be exceptionally efficient:
- a missing person means missing combat verbs;
- a returning person can be felt immediately through restored capabilities;
- a transformation can alter both story meaning and tactical role;
- a sacrifice can remove a system from the party, not just a portrait from a cutscene.

The cost is low narrative agency. The player's authorship occurs mainly in **how to survive and optimize within the story**, not which story to create.

## 12. People, NPCs, factions, social systems, and multiplayer

FFIV is not a social simulation.

NPCs primarily serve authored functions:
- dialogue;
- shops/services;
- lore;
- quest/event triggers;
- scripted state changes as the plot progresses.

There is no general:
- daily schedule simulation;
- affinity/romance choice system;
- reputation meter;
- procedural faction diplomacy;
- recruit-anyone social graph.

Named kingdoms/groups such as Baron, Mysidia, Fabul, Troia, Eblan, the Dwarves, Eidolons and Lunarians matter to the plot, but their relationships are mostly authored rather than driven by a reusable faction-simulation layer.

The current Pixel Remaster product is officially **single-player**. [FFIV07](#ffiv07) Historical controller-sharing quirks in older editions are not treated as modern native multiplayer without edition-specific evidence.

For OpenLegend this is an important negative case: memorable relationships do **not** require a generalized social simulation, but a fixed script cannot provide the open-ended interpersonal causality OpenLegend is aiming for.

## 13. Art, audio, interface, and feel

### Original technical staging

The move to Super Famicom/SNES mattered to how FFIV staged drama. Kitase and Tokita recall Sakaguchi reacting to demonstrations of the hardware's scaling/rotation capabilities, and the famous opening Red Wings sequence became an early showcase for that presentation. [FFIV12](#ffiv12)

The game combines:
- compact character sprites;
- expressive battle poses/effects;
- large enemy illustrations;
- tile-based towns/dungeons;
- world-map scale changes;
- event scripting that moves characters around scenes rather than relying only on text boxes.

### Music

Nobuo Uematsu's score supplies battle identity, place identity and emotional continuity. Modern Pixel Remaster releases include arranged soundtrack work while later updates let players choose original BGM, turning preservation preference into an explicit option. [FFIV06](#ffiv06)

### Pixel Remaster UI

Modern conveniences include faster/automated battle handling, map/minimap support and later boosters/toggles. These can reduce friction without rewriting the story structure, but encounter/EXP controls can also change the actual difficulty/progression economy.

### DS remake presentation

The DS remake makes a different trade:
- 3D chibi-proportioned models;
- voice acting;
- cinematic staging;
- revised difficulty and mechanics.

That version is not merely “higher resolution”; presentation and rules were redesigned together.

## 14. Production: a synthesis of earlier Final Fantasy ideas

Square's own anniversary interviews are unusually useful here because FFIV's leads explicitly describe the design synthesis.

Tokita recalls development beginning while FFIII work was still underway, with an earlier NES conception before the project shifted to Super Famicom/SNES. The SNES-form production was extremely compressed—roughly on the order of a year—because cartridge manufacturing lead time required the game to be completed months before release. [FFIV12](#ffiv12)

Key documented roles/ideas include:
- Hironobu Sakaguchi directing and setting the larger plot/world flow;
- Takashi Tokita moving into a game-design/event/scenario role;
- Hiroyuki Ito creating Active Time Battle;
- Nobuo Uematsu composing the score;
- the team using the new hardware to stage larger/more cinematic events.

Tokita later framed FFIV as an attempt to synthesize the preceding games rather than discard them:
- *FFII*-style character/story emphasis;
- *FFIII*-style job/mechanical variety;
- now expressed through **fixed specialist characters** rather than freely changeable jobs. [FFIV01](#ffiv01)

A later Game Developer interview records a related commercial/design ambition: FFIV was meant to become a model for the series and compete at a scale its predecessors had not reached. [FFIV13](#ffiv13)

## 15. Remake changes expose the original design's tradeoffs

FFIV's rereleases can be read as experiments around one central question: **how much player authorship can be added without losing authored character identity?**

| Branch | What it preserves | What it materially changes |
| --- | --- | --- |
| Original / modern Pixel Remaster line | fixed roles, authored party turnover, ATB, classic world/story | modern presentation/QoL; later PR boosters/toggles can alter pacing/difficulty |
| Advance | 2D mechanics/story | adds bonus content and late party selection |
| DS / 3D | broad story/character identities | adds Augments, harder tuning, 3D/voice, remake-specific side systems |
| Complete Collection | polished 2D core | bundles Interlude / The After Years and bonus material; sequel systems remain separate |

The design lesson is not that one branch is “correct.” They serve different player desires:
- preservation;
- challenge;
- build expression;
- optional postgame breadth;
- story continuity;
- convenience.

A future OpenLegend mechanic should likewise distinguish **core world law** from optional convenience/presentation and from expansion content.

## 16. Preliminary transferable inspiration and limits

### A. Let character identity live in verbs

FFIV's strongest characters are mechanically recognizable before the player reads a biography. Jump, Summon, Twincast, Throw and Cover are identities.

**OpenLegend application:** an NPC/player role can become memorable when capabilities, obligations and constraints arise from who they are in the world, not merely from prose traits.

**Limit:** fixed verbs reduce self-authorship. OpenLegend should not assume every person needs a locked JRPG class.

### B. Party turnover can make narrative loss mechanically real

When someone leaves, tactics change.

**Application:** relationships and presence should affect real capability—knowledge, access, labor, powers, social permission—not just dialogue availability.

**Limit:** forced removal can invalidate player plans. In an open simulation, departures should usually follow legible causes and allow response.

### C. Time pressure can exist inside deliberative interfaces

ATB proves that menu-based decision making can still make hesitation consequential.

**Application:** some OpenLegend systems could have world time continue during planning where fiction demands urgency.

**Limit:** never make UI navigation speed itself the hidden difficulty unless that is intentional and accessible.

### D. Counters make opponents feel rule-aware

FFIV's reaction/counter behaviors create a primitive action-response grammar.

**Application:** agents/creatures should react to *meaningful categories of action* when they can perceive them and have a reason to respond.

**Limit:** hidden counters feel arbitrary; the world needs observable cues or learnable consequences.

### E. Traversal tools should reinterpret space

Airships and the Lunar Whale turn the same world from barrier into route.

**Application:** progression can grant physical/social/legal access that changes route planning rather than only boosting stats.

### F. Story transformation can modify systems

Cecil's Paladin change is remembered because it affects mechanics, equipment and progression.

**Application:** major identity changes should alter capabilities and constraints when the fiction supports it.

**Limit:** do not force mechanical resets merely for drama; the causal rule must belong to the world.

### G. Version history argues for separable policy layers

Pixel Remaster can offer original BGM and modern QoL independently, while other versions alter builds/content.

**Application:** keep simulation law, content, presentation and accessibility knobs separable enough that one need not corrupt the others.

## 17. Preservation status

No prior FFIV-specific file or packet passage was found in:
- the existing games/ case-study filenames;
- the existing mechanics/ study filenames;
- references/field-guide.md;
- references/review-evidence*.md;
- references/popularity-and-economics.md;
- references/youtube-watchlist.md;
- references/sources-01.md through sources-05.md.

So this dossier is additive. It does not supersede an earlier FFIV chapter.

**Still required before completion:** review/reception synthesis, Steam positive/negative sample, commercial milestones, chronology check, final requirement table and source/link audit.

## Sources — checkpoint set

<a id="ffiv01"></a>**FFIV01 — [FINAL FANTASY IV 30th Anniversary Special Interview — Part 1](https://na.finalfantasy.com/topics/296).** Square Enix / Final Fantasy Portal, July 19, 2021. Primary retrospective interview with Takashi Tokita on fixed character roles, story/gameplay synthesis, ATB, enemy counters, difficulty and environmental use of magic.

<a id="ffiv02"></a>**FFIV02 — [Final Fantasy IV Advance guide / late-party and Cave of Trials material](https://gamefaqs.gamespot.com/gba/929937-final-fantasy-iv-advance/faqs/40483).** Community-authored edition-specific guide. Used only to establish Advance-branch optional-party/bonus-dungeon behavior; not treated as primary production history.

<a id="ffiv03"></a>**FFIV03 — [Final Fantasy IV: Nintendo DS changes](https://strategywiki.org/wiki/Final_Fantasy_IV/Nintendo_DS_changes).** StrategyWiki community mechanics reference. Edition-specific checklist for 3D presentation, difficulty and system changes.

<a id="ffiv04"></a>**FFIV04 — [Final Fantasy IV: Augments](https://strategywiki.org/wiki/Final_Fantasy_IV/Augments).** StrategyWiki community mechanics reference. One-use ability-grant system and example Augments for the DS/3D branch.

<a id="ffiv05"></a>**FFIV05 — [Takashi Tokita Talks Final Fantasy IV: The Complete Collection & RPGs](https://blog.playstation.com/archive/2011/03/23/takashi-tokita-talks-final-fantasy-iv-the-complete-collection-rpgs/).** PlayStation Blog, 2011. Developer interview on FFIV's role in the series, redemption theme, and later creation of *Interlude* to connect the original to *The After Years*.

<a id="ffiv06"></a>**FFIV06 — [Final Fantasy Pixel Remaster FAQ](https://finalfantasypixelremaster.square-enix-games.com/en_US/faq).** Square Enix. Primary current feature/update reference, including encounter toggles, EXP multipliers, font and original-BGM options added to Steam/mobile and corresponding modern releases.

<a id="ffiv07"></a>**FFIV07 — [FINAL FANTASY IV Pixel Remaster product information](https://support.na.square-enix.com/faqarticle.php?c=4&id=18953&kid=80361&la=1&ret=faqtop&sc=0).** Square Enix Support. Current platform/release-date and single-player reference.

<a id="ffiv08"></a>**FFIV08 — [Final Fantasy IV: Gameplay](https://strategywiki.org/wiki/Final_Fantasy_IV/Gameplay).** StrategyWiki. Community mechanics reference for ATB, Active/Wait behavior, formation, encounters, towns, inns and save structure.

<a id="ffiv09"></a>**FFIV09 — [Final Fantasy IV: Characters](https://strategywiki.org/wiki/Final_Fantasy_IV/Characters).** StrategyWiki. Community mechanics reference for character-specific equipment, magic families and commands; version differences retained rather than generalized.

<a id="ffiv10"></a>**FFIV10 — [Final Fantasy IV: Weapons](https://strategywiki.org/wiki/Final_Fantasy_IV/Weapons) and [Armors](https://strategywiki.org/wiki/Final_Fantasy_IV/Armors).** StrategyWiki. Community equipment tables used for item-property/composition examples, not production claims.

<a id="ffiv11"></a>**FFIV11 — [Final Fantasy IV: To the Moon](https://strategywiki.org/wiki/Final_Fantasy_IV/To_The_Moon).** StrategyWiki. Community walkthrough reference for Lunar Whale world traversal and onboard functions.

<a id="ffiv12"></a>**FFIV12 — [FINAL FANTASY IV 35th Anniversary Special Interview](https://na.finalfantasy.com/news/2831).** Square Enix / Final Fantasy Portal, July 18, 2026. Primary current retrospective with Tokita and Yoshinori Kitase on development timing, the NES-to-SNES shift and hardware-informed staging such as the Red Wings opening.

<a id="ffiv13"></a>**FFIV13 — [Years After: The Final Fantasy IV Interview](https://www.gamedeveloper.com/design/years-after-the-i-final-fantasy-iv-i-interview).** Game Developer, 2011. Substantive Tokita interview on FFIV as a synthesis/model for the series and its commercial/design ambition.

# Final Fantasy V — full research dossier

**G82 · Complete research pass, September 26, 2026.** Primary mechanics baseline: the 1992 Super Famicom Final Fantasy V. Later releases are separated where they materially alter content or convenience: PlayStation/Anthology localization, Final Fantasy V Advance, the 2013 mobile/legacy-PC branch, and the 2021+ Pixel Remaster. The roster focus is job/ability composition, ATB, equipment, exploration and challenge-run affordances. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

No personal playthrough is claimed. Mechanics examples are reconstructed from documented rules and version-specific guides/reviews.

## 1. Identity and player promise

Final Fantasy V takes the party structure of a traditional authored JRPG and places unusually broad **mechanical identity under player control**. Bartz, Lenna, Galuf/Krile and Faris are fixed story characters, but their combat roles are not fixed. Once the crystals begin granting jobs, each character can switch among jobs such as Knight, Monk, White Mage, Black Mage, Blue Mage, Time Mage, Summoner, Mystic Knight, Ninja, Ranger, Beastmaster, Bard, Samurai, Dragoon, Dancer and Chemist.

The central loop is:

1. choose jobs for four characters;
2. fight and gain normal EXP plus Ability Points (ABP);
3. learn permanent job abilities;
4. switch jobs;
5. equip selected learned abilities on a different job;
6. discover combinations that solve encounters more efficiently—or break them entirely.

The 1992 development team described this as an iteration on ideas from FFIV: not “freedom” as an abstract goal, but fun from giving the player many elements to choose and combine. They also explicitly wanted to move away from FFIV's forced-character solutions and linearity criticisms. [FFV01](#ffv01)

That makes FFV almost an inverse companion to FFIV:
- FFIV says **the story determines who is present and therefore what verbs exist**.
- FFV says **the player assigns most combat identities and carries learned verbs across roles**.

## 2. Version boundaries

### 2.1 1992 Super Famicom original

The Japanese original released December 6, 1992. It establishes the baseline job/ABP system, ATB battles, three-world structure, equipment, Blue Magic, Mix, summons, optional bosses and the original 22-job ecosystem when Freelancer and Mime are included in the broad job count used by modern retrospectives. [FFV02](#ffv02)

Unlike FFIV, FFV did not receive a contemporaneous North American SNES localization. Western official access came later, first through the PlayStation era and then more successfully through GBA.

### 2.2 Final Fantasy V Advance

The GBA edition is not merely a portable copy. It adds:
- four extra jobs: Gladiator, Cannoneer, Oracle and Necromancer;
- Sealed Temple bonus content;
- additional bosses/equipment;
- a new localization widely praised over the earlier PlayStation localization;
- handheld conveniences such as quick save.

Those four extra jobs should never be backfilled into the 1992 job inventory. [FFV03](#ffv03) [FFV04](#ffv04)

### 2.3 2013 mobile / legacy-PC branch

The 2013 mobile version retains much of the Advance-content lineage, including extra jobs/endgame content, while replacing the presentation with redrawn sprites and touch-oriented UI. Its art direction was divisive enough to become a recurring comparison point when the Pixel Remaster later returned toward 16-bit proportions. [FFV05](#ffv05)

That legacy Steam version was delisted in 2021 when Square Enix moved to the Pixel Remaster line. [FFV06](#ffv06)

### 2.4 Pixel Remaster

The 2021 Pixel Remaster returns toward the **original Super Famicom content baseline**, rather than collecting every later addition. Square Enix's series FAQ explicitly says the Pixel Remasters are based on the original releases and omit some additions from other remakes. They add redrawn pixel art, rearranged music, modern UI, maps, auto-battle and later optional progression/encounter controls. [FFV07](#ffv07)

That means the Pixel Remaster can be the most convenient current way to study the original design while still **not** being the content-maximal version. Advance/mobile-specific jobs and Sealed Temple content are missing.

## 3. Job system: identity as a composable module

The job system separates **character level** from **job mastery**.

- Normal EXP raises the underlying character's level/stats.
- ABP advances the currently equipped job.
- Job levels unlock active or passive abilities.
- Learned abilities can be equipped while using other jobs.
- Equipment permissions and stat profiles are job-specific unless an ability overrides them.
- Swapping jobs is a menu choice rather than a permanent respec event.

This creates two progression axes:
- broad vertical character growth;
- horizontal accumulation of reusable capabilities.

### Examples

A player might create:
- a Knight with White Magic for self/party sustain;
- a Ninja with Spellblade/Mystic Knight magic and innate Dual Wield;
- a Ranger-derived Rapid Fire attacker carrying Dual Wield;
- a physically sturdy job carrying Time Magic;
- a mage equipped with an armor/weapon permission learned elsewhere;
- a Chemist whose Mix command solves problems through consumable combinations.

The important feature is not any one “best build.” It is that the player can **move capabilities across class boundaries after investing in the source class**.

## 4. Freelancer and Mime: mastery becomes inheritance

The baseline Freelancer job is deliberately plain at first but becomes one of the system's most important end states.

As jobs are mastered, Freelancer inherits eligible innate abilities and beneficial stat tendencies from mastered jobs. It also has two open ability slots. This turns “job mastery” into a long-horizon account of what a character has learned across careers.

Mime is another late/optional composition chassis, centered on Mimic and multiple command slots with its own equipment/stat rules.

The design consequence is elegant:
- jobs are useful as temporary identities;
- learned abilities remain useful after leaving them;
- mastering many jobs eventually strengthens a generalist state.

**OpenLegend transfer:** careers, training and lived roles can leave durable capabilities without requiring a person to remain permanently labeled by one class.

## 5. A job is more than a stat bundle

FFV's jobs differ in several dimensions simultaneously:

- base stat modifiers;
- equipment permissions;
- command set;
- passive traits;
- ABP cost curve;
- field/exploration utility;
- access to separate spell/ability acquisition systems.

Examples:
- **Thief:** Steal plus field benefits such as sprinting and detecting secret passages.
- **Blue Mage:** learns enemy abilities after being successfully hit while Learning is present.
- **Mystic Knight:** applies spell effects to weapons via Spellblade.
- **Beastmaster:** captures/controls monsters, turning enemies into temporary resources or teaching tools.
- **Ranger:** ranged weapon use, animals and eventually Rapid Fire.
- **Geomancer:** terrain-based effects plus environmental utility.
- **Bard:** songs whose usefulness varies by encounter/enemy category.
- **Chemist:** modifies healing and combines two items into effects through Mix.
- **Samurai:** physical techniques including gil-consuming offense.
- **Ninja:** Throw plus Dual Wield.
- **Berserker:** automated aggression that trades tactical control for power.

StrategyWiki's job tables expose how broad that verb vocabulary is; several abilities solve world-navigation or information problems in addition to direct damage. [FFV08](#ffv08)

## 6. Ability composition creates second-order mechanics

Many of FFV's most interesting strategies are **compositions between systems** rather than standalone skills.

### Dual Wield + Rapid Fire

A Ninja-derived Dual Wield ability combined with Ranger-derived Rapid Fire creates a famous multi-hit physical package. Add Spellblade and weapon properties and the build crosses three job identities.

### Blue Magic + Control

Blue Magic is learned from enemies, sometimes requiring the ability holder to be targeted by a particular skill. Beastmaster Control can cause enemies to use abilities they would not normally target onto the party, making one job's command unlock another job's learning system. [FFV09](#ffv09)

### Chemist Mix

Mix consumes combinations of items to produce effects unavailable through ordinary item use. Community references enumerate dozens of outcomes from a compact set of ingredients. [FFV09](#ffv09)

This creates:
- an information/recipe-discovery layer;
- resource tradeoffs;
- support effects that can outperform conventional spells when understood;
- a powerful “expert knowledge” ceiling.

### Equipment abilities

Some jobs teach equipment permissions, allowing another job to wear weapons/armor it normally could not. That means the player can treat equipment rules themselves as something learnable and transferable. [FFV10](#ffv10)

## 7. ATB and battle pacing

FFV retains Active Time Battle from FFIV. Each combatant receives action opportunities as time advances; speed and battle configuration affect the rhythm.

The major design change is **what the player does with those opportunities**. FFIV knows which commands Cecil/Kain/Rydia have. FFV must support a far larger possibility space because any party member can arrive with many cross-job combinations.

That pushes encounter design toward:
- elemental/status rules;
- conditional counters;
- learnable enemy behavior;
- equipment preparation;
- specific but not usually single-job-exclusive answers.

The 1992 team explicitly discussed avoiding FFIV-style bosses that could only be beaten by using one required character. They wanted default-job play to remain valid even though job-switching was the marquee system. [FFV01](#ffv01)

## 8. Equipment, magic, items and resources

Equipment remains strongly job-linked:
- swords, rods, axes, bows, whips, harps, spears, katanas and other weapon families have different job permissions;
- armor categories map broadly onto martial/specialist/mage/generalist roles;
- learned Equip abilities can relax those restrictions;
- weapons can carry elemental/status/special rules rather than functioning only as attack-score upgrades. [FFV10](#ffv10)

Magic and command families include:
- White Magic;
- Black Magic;
- Time Magic;
- Summon;
- Blue Magic;
- Spellblade;
- songs;
- terrain effects;
- monster control/capture;
- item mixing;
- throwables;
- money-consuming Samurai techniques.

Gil supports shops, equipment, items and certain battle actions. Consumable inventory becomes tactically important because Chemist and Ninja can transform stored items/weapons into combat effects.

There is no general crafting/building system in the base game. Mix is closer to **combat alchemy** than a persistent production profession.

## 9. Progression, failure and grind

The player manages several overlapping progression curves:
- character EXP/levels;
- ABP/job levels;
- spell/item/equipment acquisition;
- crystal-driven job unlocks;
- optional summons/Blue Magic/rare items;
- eventual mastered-job inheritance.

This can encourage grinding, but it also supports targeted experimentation: a player may briefly use a job only to obtain one transferable ability.

Failure is conventional JRPG party defeat/save recovery rather than a persistent death-state simulation. Modern versions add stronger autosave/quicksave/checkpoint protection.

Pixel Remaster's later booster options can alter EXP acquisition and encounter frequency. Those are accessibility/pacing controls, but they also change how quickly the job/level economy develops and how much random encounter attrition exists. [FFV07](#ffv07)

## 10. World progression and exploration

FFV uses a strongly authored quest but provides more exploration and optionality than FFIV's most linear stretches.

Major world-state structure:
1. the first world opens as crystal disasters and meteor events push the party across regions;
2. travel capabilities expand;
3. the party reaches a second world;
4. later events merge/reconfigure the worlds;
5. previously separate geography is recontextualized, opening optional endgame locations and sealed rewards.

Traversal uses familiar Final Fantasy devices such as:
- chocobos;
- ships;
- air travel;
- submarine/underwater travel;
- world-map navigation;
- dungeon-specific movement rules.

The submarine is a good example of traversal as world-key: underwater routes expose hidden entrances/optional areas, including paths tied to summons and side content. [FFV11](#ffv11)

## 11. Encounter design rewards recomposition

Because the job system is broad, a difficult boss often becomes a **party-design question**.

Typical solutions include:
- changing jobs to improve survivability or damage type;
- equipping one learned command on an otherwise stronger chassis;
- using status ailments that would be ignored in many JRPGs;
- reflecting or absorbing magic;
- changing rows/equipment;
- exploiting monster type;
- controlling an enemy to learn Blue Magic;
- using Mix, Spellblade, songs or summoned effects;
- deliberately designing around ATB timing.

RPG Site's boss guide summarizes the game's practical rule: do not assume one job setup will carry every situation. [FFV12](#ffv12)

This is a strong OpenLegend pattern: **difficulty can test whether the player understands available systems, not whether a designer chose the correct build for them in advance.**

## 12. Story, characters and the relationship to mechanics

FFV is still an authored story about elemental crystals, Exdeath and the Void, but the cast is smaller and role identity is mechanically decoupled from personality.

Bartz remains Bartz whether he is a Knight, Bard or Chemist. Faris's narrative identity does not mechanically require “pirate” as a combat class.

That separation produces benefits:
- players can experiment without violating party continuity;
- any character can become tactically essential;
- story deaths/changes do not destroy a unique irreplaceable class kit in the same way FFIV party departures do;
- costumes/job sprites communicate chosen role visually without rewriting personality.

It also creates a weakness noted by some reviews: because combat identity is player-assigned, the characters can feel less mechanically individuated than FFIV's fixed specialists. [FFV13](#ffv13)

The world/state changes do more mechanical storytelling than the jobs do: crystal destruction changes access to classes; world transformation changes routes; narrative progression literally expands and then recombines the map.

## 13. NPCs, factions, social systems and multiplayer

FFV is not a social simulation.

NPCs largely provide:
- dialogue/lore;
- shops and services;
- event triggers;
- navigation hints;
- scripted reactions to changing world state.

There is no general:
- reputation/faction diplomacy;
- affinity system;
- romance choice;
- dynamic schedule simulation;
- recruit-any-NPC system.

Party membership is story-authored; party combat roles are player-authored.

Current Pixel Remaster is a single-player product. Multiplayer/social value arises mostly outside the software through strategy discussion, challenge runs and community events rather than a built-in persistent multiplayer layer.

## 14. Four Job Fiesta: system depth generates a metagame without new code

FFV is unusually important as a case where the **player community manufactured a durable new mode from existing rules**.

The Four Job Fiesta constrains a run to four randomly assigned jobs, traditionally tied to the four crystal unlock groups. Instead of using the full toolbox, the player must solve the entire game using a narrow subset.

Why it works:
- almost every job contains enough depth to contribute;
- commands can solve encounters in multiple ways;
- equipment/consumables/statuses remain universal support layers;
- the main game does not hard-require one specific job for completion;
- random assignments make familiar bosses into new planning problems.

RPG Site describes the Fiesta as a long-running charity challenge and reports that it had raised more than $20,000 by the time of its guide; 2026 community materials show the event still active that summer under charity rules. [FFV14](#ffv14) [FFV15](#ffv15)

This is one of the strongest transferable lessons in the entire FF series:

> A composable system can create **challenge-run affordances** far beyond the modes the developer explicitly ships.

For OpenLegend, world laws should ideally be rich enough that players can invent meaningful constraints, professions, rituals, tournaments or self-imposed rules without needing a dedicated bespoke feature for every mode.

## 15. Production and design intent

A translated 1992 developer interview with Hironobu Sakaguchi and other FFV staff provides unusually direct design evidence.

The team said:
- the new job/ability system was intended to iterate on prior ideas and create a new kind of fun;
- criticism that FFIV was too linear informed FFV;
- memory doubled from FFIV's 8 Mbit to 16 Mbit, but the team still ran into capacity pressure;
- developers intentionally allowed players to stick with default jobs if desired;
- bosses should not require one specific character the way some FFIV encounters effectively did;
- the apparent freedom emerged from offering many elements to choose among rather than from a pure “freedom-first” philosophy. [FFV01](#ffv01)

Credited development roles discussed in that source include Sakaguchi as director, Akihiko Matsui and others on battle/system work, Tetsuya Nomura on monster work and Nobuo Uematsu on music.

This production history is useful because the final design's greatest strength—combinatorial freedom—was not framed as an ideology. It emerged from **modular content + cross-system reuse**.

## 16. Art, audio, interface and feel

The original uses:
- distinct job sprites/costumes for each playable character;
- expressive 16-bit overworld/event animation;
- large enemy/boss sprites;
- towns/dungeons spread across multiple world maps;
- Uematsu's score, including “Battle on the Big Bridge,” later strongly associated with Gilgamesh.

Job costumes are especially important UI. A role switch is visible at a glance, so mechanical state has a strong visual identity.

Pixel Remaster:
- returns character proportions closer to the 16-bit original than the 2013 mobile branch;
- redraws environments/effects;
- rearranges music under Uematsu's oversight across the Pixel Remaster project;
- adds modern map/chest information, quicksave/autosave and auto-battle conveniences. [FFV07](#ffv07) [FFV16](#ffv16)

Reviews consistently praise the rearranged soundtrack and job sprites while disagreeing about which rerelease should be considered definitive because Advance content is absent from Pixel Remaster.

## 17. Distribution, commercial and participation context

FFV's Western history is unusually important to its reputation. The 1992 Super Famicom game stayed Japan-only during the SNES generation; later PlayStation localization and then the 2006 GBA edition were key Western entry points. [FFV03](#ffv03)

The current Pixel Remaster released on Steam in November 2021 and later expanded across modern consoles/mobile. In 2026 it also joined Xbox/PC Game Pass. [FFV17](#ffv17)

As of the September 26, 2026 research snapshot, Steam displayed **92% positive across roughly 1.46k English-language reviews** and 92% positive across 39 recent reviews. Those counts are reception/participation signals, not sales figures. [FFV18](#ffv18)

Square Enix announced in December 2025 that the **six-game Pixel Remaster series collectively** had passed six million worldwide sales. There is no defensible basis here for attributing one-sixth, or any other assumed share, to FFV. [FFV19](#ffv19)

No reliable current public source inspected here gives FFV-only lifetime revenue, current MAU or profit across its many releases.

## 18. Reception: five independent written reviews

| Source | Version | Main praise | Main criticism |
| --- | --- | --- | --- |
| RPGFan | Pixel Remaster, 2021 | job system remains deeply combinatorial; soundtrack/art/QoL; bosses reward system knowledge | some jobs weak/late; trial-and-error encounters; simpler story/villain |
| GameSpot | Advance, 2006 | excellent systems, portable Western release, strong job legacy | still an older RPG with familiar structure |
| GamesRadar+ | Advance, 2006 | diverse job system, improved translation/content | dated aspects; story/characters less compelling |
| Pocket Gamer | mobile, 2013 | flexible job customization, brisk adventure, improved touch interface | plot less deep than later FFs; visual overhaul divisive/value concern |
| TouchArcade | Pixel Remaster, 2021 | replayability, job variety, bosses/dungeons, faithful new presentation/music | Pixel Remaster still sits amid a complicated version history rather than absorbing every prior addition |

[FFV20](#ffv20) [FFV21](#ffv21) [FFV22](#ffv22) [FFV13](#ffv13) [FFV23](#ffv23)

### Review synthesis

**The job system is the consensus center of gravity.** Critics separated by fifteen years repeatedly identify the ability to learn, cross-equip and recombine job abilities as the game's defining achievement.

**Story criticism is comparative, not “no story.”** Reviewers often find FFV lighter or simpler than IV/VI, but several praise its humor, pace and warmth. RPG Site's retrospective specifically argues that job-system fame can obscure meaningful worldbuilding. [FFV24](#ffv24)

**Replayability is structural.** The same game supports normal optimization, weak-job experimentation, speedrunning and restricted Fiesta runs because player power is a composition problem.

**Opaque knowledge is the price of depth.** Blue Magic acquisition, Mix recipes, special equipment behavior and boss counters can be hard to infer. The system rewards experimentation but can push players toward external guides.

## 19. Steam helpful-review sample

The most-helpful English Steam surface is useful because it captures both veteran praise and launch-era implementation criticism.

Positive/helpful themes:
- soundtrack and pixel-art direction;
- minimap, quicksave, auto-battle, hidden-path/chest information;
- preservation of the original job gameplay;
- huge replay value from the job system.

Negative/helpful themes:
- launch-era bugs and softlocks;
- ATB behavior differences that disrupted known tactics;
- frustration that Advance/mobile bonus jobs/content were not included in Pixel Remaster.

A particularly helpful negative review came from a self-described speedrunner/Four Job Fiesta participant and praised the remaster's fidelity, visuals and audio while documenting many launch bugs and tactical differences. Another helpful positive review praised the same QoL/art/audio package while explicitly noting the missing later-release content. [FFV25](#ffv25)

**Time caveat:** those reviews were posted primarily around the 2021 launch. They are strong evidence of what expert players valued/criticized then, not proof every listed bug remains in the September 2026 build. The current aggregate remains very positive. [FFV18](#ffv18)

## 20. Comprehensive mechanics inventory

| Category | Implementation |
| --- | --- |
| Character creation | Fixed story cast; player chooses changing jobs rather than creating identities |
| Jobs/classes | Core system; crystal unlocks; ~22 original job states depending counting convention, four extra Advance jobs |
| Skills/abilities | ABP mastery, transferable commands/passives, job innates |
| Stats/leveling | Character EXP/levels plus job ABP; mastered-job inheritance into Freelancer |
| Equipment | Job-restricted weapons/armor; learned Equip permissions can cross boundaries |
| Items | Healing/status/key items, throwables, Mix ingredients, rare drops |
| Crafting | No general crafting; Chemist Mix combines consumables in battle |
| Magic | White/Black/Time/Summon/Blue/Spellblade plus job-specific powers |
| Enemy interaction | Control/Catch, Steal, Blue Magic learning, status/element exploitation |
| Combat | ATB, rows, commands, buffs/debuffs, counters, party composition |
| Exploration | Multi-world overworlds, towns/dungeons, secret passages, optional summons/bosses |
| Traversal | Walking, chocobo, ship, air travel, submarine and other story-gated movement |
| Economy | Gil, shops/inns/items/equipment; some abilities can consume money/resources |
| Death/failure | KO/revival; total defeat/save recovery; modern checkpoint/autosave conveniences |
| Story | Authored quest; crystals/job unlocks and world merge connect narrative to system/world state |
| Relationships | Authored party bonds; no romance/reputation simulation |
| NPC/factions | Scripted NPCs/kingdoms; no dynamic diplomacy system |
| Multiplayer | Current Pixel Remaster single-player; community metagame exists outside game |
| Challenge/endgame | Optional bosses/areas, mastery experiments; Advance adds Sealed Temple/jobs |
| User-generated modes | No editor/mod framework required for Four Job Fiesta-style self-imposed rules |

## 21. OpenLegend transferable lessons and limits

### A. Skills should outlive roles

A person who was once a sailor, medic or locksmith may retain capabilities after taking a new job.

**Borrow:** model roles as bundles that can teach durable competencies.

**Limit:** unrestricted cross-equipping can flatten identity if every expert eventually becomes the same omnipotent generalist.

### B. Let systems compose across domains

Blue Magic + Control and job abilities + equipment permissions are powerful because one system modifies another.

**Borrow:** prefer capabilities that interact with perception, items, people, terrain and other skills rather than siloed spell lists.

### C. Build encounters around laws, not prescribed classes

FFV's developers explicitly wanted to avoid “use this character or fail.”

**Borrow:** a problem should generally permit several causal solutions even if some are easier.

### D. Expert systems need discoverability

Mix and Blue Magic are rich but opaque.

**Borrow:** let NPC knowledge, books, observation, experimentation and teachable discovery expose system rules inside the world instead of forcing an external wiki.

### E. Challenge-run affordance is a test of systemic health

Four Job Fiesta works because restrictions expose alternative solutions rather than making the game impossible.

**Borrow:** test OpenLegend with artificial constraints—no violence, one profession, no money, one settlement, no magic, etc.—to discover whether systems genuinely support different plans.

### F. World transformation is stronger than a static content unlock

The merge of FFV's worlds changes what the same geography means.

**Borrow:** large events should be able to alter routes, ownership, ecology and opportunities rather than merely flipping quest flags.

## 22. Preservation and requirement audit

No FFV-specific prior file or packet owner was found in the existing game/mechanics/dossier filenames checked on this branch, so this pass is additive.

| Requirement | Coverage |
| --- | --- |
| R01 identity/scope/promise | §§1–2 |
| R02 actions/major mechanics | §§3–11, 20 |
| R03 items/entities/composition | §§3–8, 20 |
| R04 progression/economy/time | §§3, 7–9, 20 |
| R05 concrete interactions | §§6, 11, 14 |
| R06 people/AI/social/multiplayer | §§12–14, 20 |
| R07 art/audio/interface/feel | §§2, 16 |
| R08 narrative/play | §§10, 12 |
| R09 production/development | §15 |
| R10 marketing/distribution/virality | §§14, 17 |
| R11 commercial/participation | §17 |
| R12 reception/player feedback | §§18–19 |
| R13 transferable inspiration/limits | §21 |
| R14 sources/viewing/preservation/navigation | §§2, 22 + annotated sources |

### Evidence limits

- Version-specific mechanics are labeled; Advance/mobile additions are not projected into the 1992 baseline.
- Five independent substantive reviews are used.
- Steam feedback is sampled from a helpful-review surface and is not representative polling.
- Pixel Remaster six-million sales are series-level only.
- Four Job Fiesta is a community-created challenge/charity format, not a built-in FFV game mode.
- No dossier claim depends on unwatched video footage.

## 23. Completion conclusion

FFV's core contribution is a progression architecture where **roles are temporary, learning is durable and capabilities compose**. Its best systems turn specialization into ingredients for later hybridization. The community's ability to create Four Job Fiesta from those rules is strong evidence that the design space is not only deep when unconstrained—it remains interesting when deliberately constrained.

For OpenLegend, the highest-value lesson is to make professions, education, equipment permissions and learned techniques **modular enough to combine, but grounded enough that combinations still feel like consequences of a person's history rather than arbitrary build slots**.

## Sources — annotated set

<a id="ffv01"></a>**FFV01 — [Final Fantasy V — 1992 Developer Interview](https://shmuplations.com/ffv/).** Shmuplations translation/collation of contemporary Famicon Tsuushin/Dengeki SFC/GSLA interviews with Hironobu Sakaguchi and multiple FFV developers. Primary-era statements via secondary translation; used for design intent, memory constraints, job freedom and deliberate contrast with FFIV.

<a id="ffv02"></a>**FFV02 — [Final Fantasy V 30th-anniversary overview](https://www.nintendolife.com/news/2022/12/anniversary-super-famicom-favourite-final-fantasy-v-is-30-years-old).** Nintendo Life, 2022-12-06. Release date and concise original job-count/system retrospective.

<a id="ffv03"></a>**FFV03 — [Final Fantasy V Advance Review](https://www.gamespot.com/reviews/final-fantasy-v-advance-review/1900-6161822/).** Greg Kasavin, GameSpot, 2006-11-15. Western/version history and full GBA review.

<a id="ffv04"></a>**FFV04 — [Final Fantasy V Advance Review](https://www.pocketgamer.com/final-fantasy-v-advance/review/).** Mike Cook, Pocket Gamer, 2007-01-05. Advance-specific 26-job count and challenge/customization evidence.

<a id="ffv05"></a>**FFV05 — [Final Fantasy V Review](https://www.pocketgamer.com/final-fantasy-v/review/).** Jon Mundy, Pocket Gamer, 2013-04-01. Mobile visual/UI branch and job/story assessment.

<a id="ffv06"></a>**FFV06 — [Final Fantasy V and VI legacy Steam versions being delisted](https://www.rpgsite.net/news/11420-final-fantasy-v-and-final-fantasy-vi-are-being-delisted-from-steam-on-july-27).** RPG Site, 2021-06-29. Store/version transition evidence.

<a id="ffv07"></a>**FFV07 — [Final Fantasy Pixel Remaster FAQ](https://finalfantasypixelremaster.square-enix-games.com/en_US/faq).** Square Enix. Primary series design/current-feature source for original-release basis, art/music goals and later encounter/EXP/QoL options.

<a id="ffv08"></a>**FFV08 — [Final Fantasy V Jobs](https://strategywiki.org/wiki/Final_Fantasy_V/Jobs).** StrategyWiki community mechanics reference. Job unlock groups, commands, passives, ABP abilities and Advance-only jobs.

<a id="ffv09"></a>**FFV09 — [Final Fantasy V Magic and skills](https://strategywiki.org/wiki/Final_Fantasy_V/Magic_and_skills).** StrategyWiki. Blue Magic learning and Chemist Mix mechanics; community reference, not production evidence.

<a id="ffv10"></a>**FFV10 — [Final Fantasy V Weapons](https://strategywiki.org/wiki/Final_Fantasy_V/Weapons) and [Armor](https://strategywiki.org/wiki/Final_Fantasy_V/Armor).** StrategyWiki. Equipment permissions and cross-job Equip ability evidence.

<a id="ffv11"></a>**FFV11 — [Final Fantasy V Submarine](https://strategywiki.org/wiki/Final_Fantasy_V/Submarine).** StrategyWiki. Underwater traversal/optional-area example.

<a id="ffv12"></a>**FFV12 — [Final Fantasy V Boss Guide](https://www.rpgsite.net/feature/11940-final-fantasy-v-boss-guide-every-boss-and-how-to-beat-them).** RPG Site, 2021-11-14. Encounter/composition reference.

<a id="ffv13"></a>**FFV13 — [Final Fantasy V Review](https://www.pocketgamer.com/final-fantasy-v/review/).** Jon Mundy, Pocket Gamer, 2013. Review evidence on job freedom versus fixed-character individuality; counted once in the five-review set.

<a id="ffv14"></a>**FFV14 — [Final Fantasy V Four Job Fiesta guide](https://www.rpgsite.net/feature/11964-final-fantasy-v-four-job-fiesta-guide-how-to-tackle-this-unique-challenge).** Scott White, RPG Site, updated 2023. Rules, community history and reported charity total.

<a id="ffv15"></a>**FFV15 — [Final Fantasy V Four Job Fiesta 2026](https://retroachievements.org/forums/topic/36321).** RetroAchievements community event page, 2026. Current evidence that the challenge format remained active in 2026 and was tied to charity pledges.

<a id="ffv16"></a>**FFV16 — [Final Fantasy V Pixel Remaster review](https://www.rpgfan.com/review/final-fantasy-v-pixel-remaster/).** Alana Hagues, RPGFan, 2021-11-16. Detailed current-remaster review emphasizing art/music, jobs, boss patterns, QoL and story tradeoffs.

<a id="ffv17"></a>**FFV17 — [Final Fantasy V joins Xbox/PC Game Pass](https://www.rpgsite.net/news/20184-final-fantasy-5-game-pass-release-date-pixel-remaster).** RPG Site, 2026-04-21. Current distribution/platform-subscription context.

<a id="ffv18"></a>**FFV18 — [FINAL FANTASY V on Steam](https://store.steampowered.com/app/1173810/).** Valve/Square Enix, snapshot retrieved 2026-09-26. Current Steam aggregate/release/product framing; dynamic source.

<a id="ffv19"></a>**FFV19 — [Final Fantasy Pixel Remaster series sales top six million](https://www.gematsu.com/2025/12/final-fantasy-pixel-remaster-series-sales-top-six-million).** Gematsu, 2025-12-17, reporting Square Enix. Series-wide six-game sales only.

<a id="ffv20"></a>**FFV20 — [Final Fantasy V Pixel Remaster Review](https://www.rpgfan.com/review/final-fantasy-v-pixel-remaster/).** RPGFan, 2021. One of five independent review publications.

<a id="ffv21"></a>**FFV21 — [Final Fantasy V Advance Review](https://www.gamespot.com/reviews/final-fantasy-v-advance-review/1900-6161822/).** GameSpot, 2006. One of five independent review publications.

<a id="ffv22"></a>**FFV22 — [Final Fantasy V Advance review](https://www.gamesradar.com/final-fantasy-v-advance-gba-review/).** GamesRadar+, 2006. One of five independent review publications; praises job/translation/content while noting age/story limits.

<a id="ffv23"></a>**FFV23 — [Final Fantasy V Pixel Remaster Review](https://toucharcade.com/?p=287208).** Shaun Musgrave, TouchArcade, 2021-11-23. One of five independent review publications; replayability/job system/version-history perspective.

<a id="ffv24"></a>**FFV24 — [Final Fantasy V's Job System is Amazing, But its Story and Worldbuilding are its Soul](https://www.rpgsite.net/feature/11370-final-fantasy-vs-job-system-is-amazing-but-its-story-and-worldbuilding-are-its-soul).** James Galizio, RPG Site, 2021-06-18. Interpretive retrospective used to balance “gameplay only” summaries.

<a id="ffv25"></a>**FFV25 — [FINAL FANTASY V most-helpful English Steam reviews](https://steamcommunity.com/app/1173810/reviews/?browsefilter=toprated&l=english).** Steam user reviews, inspected 2026-09-26. Qualitative launch-era veteran praise/criticism; self-selected and patch-sensitive.


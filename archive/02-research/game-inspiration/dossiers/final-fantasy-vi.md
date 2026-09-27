# Final Fantasy VI — full research dossier

**G83 · Complete research pass, September 26, 2026; expanded after the substantive coverage audit.** Primary mechanics baseline: the 1994 Super Famicom *Final Fantasy VI*. The initial North American SNES localization, later PlayStation/GBA/mobile branches and the 2022+ Pixel Remaster are treated as distinct versions where mechanics, translation, content or presentation differ. The roster focus is ensemble characters, Espers/magic, Relics, the World of Balance → World of Ruin state shift, party composition and side content. [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Coverage audit](../coverage-audit-g81-g100.md).

No personal playthrough or unwatched-video evidence is claimed. Worked examples below are reconstructed from documented mechanics and version-specific written sources. **Major spoilers:** sections 10–15 discuss the catastrophe, optional character survival/recruitment and late-game choices.

## 1. Identity, scope and player promise

*Final Fantasy VI* is Square's 1994 ensemble role-playing game about a world where industrial technology has replaced ancient magic, an empire is rediscovering supernatural power through Espers, and a large cast of playable characters becomes entangled in resistance, loss and reconstruction.

Its core mechanical identity sits between FFIV and FFV:

- like **FFIV**, each character has a strong authored combat identity expressed through signature commands;
- like **FFV**, much of the party can acquire a shared layer of magic and stat development;
- unlike either, FFVI later breaks its world and lets the player rebuild much of the party in a comparatively open order.

The result is an RPG where **identity has two layers**:
1. a person-specific verb such as Blitz, Tools, Runic, Rage, Lore, Sketch, Throw, Dance, Steal or Slot;
2. a shared Magicite/Esper layer through which many characters can learn the same spells and receive level-up bonuses.

That combination creates both depth and a long-term homogenization risk: characters begin sharply distinct, but sufficiently trained party members can converge around the same strongest magic.

## 2. Version boundaries

### 2.1 1994 Super Famicom / North American SNES

The Japanese release is the original mechanics baseline. The first North American release was titled **Final Fantasy III** because several preceding numbered entries had not been released there.

The localization changed names, text and some presentation under cartridge-space, schedule and regional-content constraints. Those changes should not be generalized back into the Japanese original.

### 2.2 PlayStation / Anthology

The PlayStation release brought an official version to additional territories and added presentation/extras, but introduced loading/performance friction that later reviews repeatedly cite when comparing ports. Its additions are not part of the 1994 baseline.

### 2.3 Final Fantasy VI Advance

The GBA edition adds:
- a revised localization;
- four extra Espers;
- additional spells/equipment;
- the multi-party **Dragons' Den** bonus dungeon;
- the **Soul Shrine** combat gauntlet after its unlock;
- bestiary/music-player and other port features.

These additions are substantial but late/postgame-oriented. They are not present in the original and are omitted from the Pixel Remaster content line. [FFVI01](#ffvi01) [FFVI02](#ffvi02)

### 2.4 2014 mobile / legacy-PC branch

The 2014 mobile version modernized UI and redrew character sprites in a style that became highly divisive among veteran players. The corresponding older PC release later inherited that branch and was ultimately displaced/delisted when the Pixel Remaster arrived.

It preserves GBA-derived bonus content in ways the Pixel Remaster does not, so “newer release” does not mean “contains everything.”

### 2.5 Pixel Remaster

The Pixel Remaster released on Steam/mobile in February 2022 and later on consoles. It aims to re-present the **original-release line** rather than aggregate all GBA/mobile additions. [FFVI03](#ffvi03)

Its notable changes include:
- newly redrawn pixel art;
- rearranged soundtrack;
- new UI/maps/autosaves/quality-of-life;
- a substantially rebuilt opera sequence with new staging and sung vocals in seven languages;
- later console/PC/mobile options such as encounter and EXP controls across the Pixel Remaster project;
- omission of Dragons' Den, Soul Shrine and the four GBA Espers. [FFVI04](#ffvi04) [FFVI05](#ffvi05)

The best version therefore depends on the question:
- **original rules/presentation history:** Super Famicom/SNES;
- **bonus-content breadth:** Advance/legacy-mobile line;
- **current accessibility and presentation:** Pixel Remaster.

### 2.6 Defeat is not the same operation in every edition

The **Advance manual, printed page 30**, explicitly says that a game-over restart returns to the last saved location, resets items and gil acquired since saving, but retains earned EXP and levels. That is not a manual reload of the old save. The title-screen Continue command also has a separate quicksave meaning in that manual; it should not be used as a universal name for post-defeat recovery. [FFVI30](#ffvi30)

The community version reference distinguishes **Pixel Remaster**, where loading saved progress after defeat loses unsaved EXP as well. The PR-specific mechanics guide independently describes restarting from the last saved game. Neither source supplies a personally verified test of every platform build here. The older EXP exception is therefore preserved, but not generalized into retention of every learned spell, item or Esper-related bonus. [FFVI31](#ffvi31) [FFVI33](#ffvi33)

**Interpretation:** a game can preserve some investment while undoing a failed excursion. That can soften repetition, but players need to know which history survives. An inherited assumption about recovery can change whether they save, reload or accept a defeat.

## 3. Ensemble structure: many protagonists rather than one permanent lead

FFVI does not organize its entire campaign around one mechanically dominant protagonist.

Terra opens the story and remains central to the magic/Esper theme, but control repeatedly shifts among:
- Locke;
- Edgar;
- Sabin;
- Celes;
- Cyan;
- Gau;
- Shadow;
- Setzer;
- Strago;
- Relm;
- Mog;
- and optional/late figures such as Umaro and Gogo.

The development process mirrored the ensemble design. The 1994 developer interviews describe a collaborative process in which many staff contributed character, world and event ideas rather than one writer specifying every detail in advance. Square Enix's 2024 Tetsuya Nomura anniversary interview similarly describes staff across roles pitching story/world concepts, with Sakaguchi and leads deciding what entered the game. [FFVI06](#ffvi06) [FFVI07](#ffvi07)

**OpenLegend relevance:** an ensemble can feel coherent without one central protagonist if each person has:
- a distinct capability;
- a distinct problem or motivation;
- relationships that change the meaning of events;
- opportunities to matter when the player chooses to bring them.

## 4. Character-specific verbs

The cast is differentiated by commands that are more than cosmetic class labels.

Examples include:

- **Terra — Trance/Morph:** temporary transformation that changes her combat output.
- **Locke — Steal:** turns enemies into item opportunities; relics can alter the command.
- **Edgar — Tools:** purchased/found machinery gives him reusable special attacks and utility.
- **Sabin — Blitz:** the player enters command sequences to execute martial techniques.
- **Celes — Runic:** absorbs eligible incoming magic into MP, changing the tactical value of enemy spellcasting.
- **Cyan — Bushido/SwdTech:** selects from a character-specific technique sequence, with timing differing by version.
- **Gau — Rage:** learns behavioral packages from monsters on the Veldt and then fights according to the chosen Rage.
- **Shadow — Throw:** converts weapons/scrolls into consumable offense.
- **Mog — Dance:** learns terrain-associated dances and then performs semi-autonomous sequences.
- **Strago — Lore:** learns enemy Blue-Magic-like techniques by witnessing them under valid conditions.
- **Relm — Sketch / Control via relic:** uses or manipulates enemy abilities.
- **Setzer — Slot:** risk/combination-based outcomes; equipment/relic choices can change his tactical profile.
- **Gogo — Mimic:** can reproduce the previous action and equip several other characters' command types.
- **Umaro:** largely uncontrollable Berserker whose special relics modify his autonomous behavior. [FFVI08](#ffvi08)

This is a strong example of **verbs as character identity**. The player's party-selection decision changes the action vocabulary before equipment or magic is considered.

## 5. Magicite and Espers: shared learning layered over unique identities

Magicite is FFVI's central customization system.

An equipped Esper can provide:
- a once-per-battle summon effect;
- one or more spells learned through AP/magic-point accumulation;
- in many cases, a stat bonus when the character gains a level while that Esper is equipped. [FFVI09](#ffvi09)

### Spell learning

Each spell has a learning multiplier. Battle rewards add progress until the spell reaches 100%, after which that character knows it permanently even after removing the Esper.

This means Espers are simultaneously:
- equipment;
- teachers;
- summons;
- long-term build-shaping tools.

### Level bonuses

Some Espers alter stats at level-up:
- Strength;
- Magic;
- Stamina;
- Speed;
- HP/MP percentage gains.

That creates a hidden optimization layer: players who understand the system may swap Magicite immediately before level-ups to influence permanent stat growth.

### The design tradeoff

Magicite increases player authorship but weakens hard class boundaries.

Early game:
- Celes feels like Celes because Runic is unusual;
- Edgar feels like Edgar because Tools define his turn;
- Sabin's Blitz is uniquely his.

Late game:
- many controllable characters can learn Cure, Haste, elemental magic, Ultima and other common spells;
- high-end magic can outperform some signature commands.

TouchArcade explicitly identifies this as a weakness: once the magic system fully develops, some differentiating factors between characters can blur. [FFVI10](#ffvi10)

**OpenLegend lesson:** shared education is powerful, but people need persistent differences—body, history, permissions, affinities, relationships, instincts, costs or exclusive expertise—if learning is not supposed to converge everyone into the same optimal toolkit.

## 6. Relics: equipment that changes rules, not only numbers

Each character can equip up to two Relics. Relics include conventional stat/status modifiers, but the system is most interesting when an item changes **how a rule works**.

Examples:
- **Genji Glove:** allows dual-wielding.
- **Master's Scroll/Offering:** turns Attack into multiple strikes.
- **Gauntlet:** trades shield use for two-handed weapon handling.
- **Ribbon:** blocks a broad set of status ailments.
- **Sprint Shoes:** alter field movement in older versions.
- **Molulu's Charm/Moogle Charm:** lets Mog suppress random encounters.
- command-changing relics can turn Steal into Mug or Sketch into Control.
- Umaro-exclusive relics expand his autonomous move possibilities. [FFVI11](#ffvi11)

A famous composition is **Genji Glove + multi-attack relic**, allowing a dual-wielding attacker to multiply weapon strikes. The important design property is not the exact number of hits; it is that two independent item rules compose into a qualitatively different turn.

Relics therefore behave more like **small rule modules** than ordinary accessory-stat slots.

## 7. Equipment, items and inventory

Characters retain authored equipment affinities:
- Locke favors knives/boomerang-like weapons;
- Cyan uses katanas;
- Edgar/Mog use spears among other options;
- Relm uses brushes;
- Strago/Gogo use caster-oriented weapons;
- Shadow uses ninja equipment;
- Sabin uses claws;
- Setzer uses gambling-themed weapon types. [FFVI12](#ffvi12)

Weapons and armor can carry:
- elemental properties;
- status effects;
- stat modifiers;
- command prerequisites;
- evasion/magic-evasion behavior;
- special proc or attack rules.

Some Relics alter who may equip what, further composing item and character identity.

There is no general crafting/building economy. Items are acquired through:
- shops;
- treasure;
- steals/drops;
- events/choices;
- optional dungeons;
- the Coliseum's wager/reward system.

The Coliseum is especially notable because it turns owned equipment into **risked input for specified reward chains** rather than simply buying/selling gear. Specified rewards do not make winning deterministic.

### Coliseum: preparation replaces direct combat control

The World of Ruin's arena takes an item wager and pits one selected character against one opponent. The player chooses the loadout beforehand, but actions are selected automatically from eligible commands. Items and Esper summons are not ordinary options there, and the reward is the prize rather than EXP/AP training. The opponent/reward relationship lets a player plan an exchange chain before having all its necessary equipment. [FFVI28](#ffvi28)

Both victory and defeat consume the wager; victory replaces it with the promised prize. Ejection through effects such as Teleport or Snort returns the wager without the prize. The PR guide distinguishes that from holding the ordinary flee buttons, which can waste actions without escaping. A large learned spellbook can produce unwanted choices; Gogo's configurable commands offer a different kind of preparation. **Interpretation:** more available actions need not mean better autonomous behavior. [FFVI29](#ffvi29)

## 8. ATB, party formation and combat pacing

FFVI continues Active Time Battle:
- characters act when their gauges fill;
- speed/timing matter;
- Active/Wait configurations affect whether time continues during menu selection;
- commands can have their own execution behavior.

Normal parties contain up to four active combatants, but the game repeatedly asks the player to form different groups from the larger roster.

That matters because character identity is strongly asymmetric:
- bringing Celes changes the value of enemy magic;
- Edgar provides reusable Tool coverage;
- Gau's value depends on known Rages;
- Strago depends on acquired Lores;
- a heavily trained magic user may cover healing/offense regardless of signature command.

So party formation becomes a **composition problem across person-specific and learned capabilities**.

## 9. Split-party play: one world state, multiple simultaneous teams

FFVI repeatedly uses party splitting as an explicit mechanic.

Examples include:
- the early branching scenario sequence, where the player selects whose story to follow before the branches reconverge;
- defensive encounters in Narshe;
- the Phoenix Cave, where two parties operate switches/paths for each other;
- Kefka's Tower, where the player forms three parties and alternates control to solve route/puzzle/combat dependencies. [FFVI13](#ffvi13)

In Kefka's Tower, weak characters cannot simply hide forever: separate groups encounter their own enemies/bosses and must activate paths for one another.

**OpenLegend transfer:** multi-agent play becomes interesting when different people or groups occupy **different physical positions with interdependent tasks**, not merely when a menu says “Party A / Party B.”

## 10. World of Balance → World of Ruin: catastrophic state transition

**Major story and world-state spoilers.** FFVI's defining structural move is that the apparent midpoint climax **fails**.

Kefka disrupts the Warring Triad, the world is physically devastated, continents and settlements change, the party scatters, and the player later begins from Celes's isolated perspective.

This is not a temporary “dark world filter.” The World of Ruin changes:
- geography;
- which routes exist;
- settlement conditions;
- NPC circumstances;
- enemy distribution;
- accessible sidequests;
- party availability;
- the player's immediate goal.

The campaign changes genre-feel:
- World of Balance is comparatively guided and ensemble-scripted;
- World of Ruin becomes a reconstruction/search phase where much of the cast is optional to reacquire before the final dungeon.

After core steps to regain mobility, the player can pursue many allies/sidequests in a flexible order and can even approach the ending without restoring every optional character. [FFVI14](#ffvi14)

This is one of the strongest precedents for OpenLegend:

> A major event should be allowed to **mutate the world graph**, not merely set a quest flag.

A catastrophe becomes meaningful when it alters routes, institutions, people, resources and goals in ways the player must rediscover.

## 11. Optional recruitment makes relationships mechanically consequential

**Character-availability spoilers.** The World of Ruin turns old relationships into optional recovery projects.

Examples:
- Terra's situation in Mobliz links her character arc to protecting children and a community.
- Cyan's return is connected to a chain involving letters, grief and later dream material.
- Locke's Phoenix Cave pursuit ties his reunion to his unresolved past and the Phoenix Esper.
- Relm and Strago can become sequentially linked through side content.
- Mog can be recovered in Narshe; his presence can then lead to Umaro.
- Shadow's later availability depends on an earlier player decision at the Floating Continent.
- Gogo is hidden inside an optional world encounter/location. [FFVI15](#ffvi15)

These are not a generic “friendship meter.” The relationship state is expressed through:
- who is present;
- what the player knows;
- what places/events are reachable;
- what combat verbs become available.

**OpenLegend lesson:** social consequence can be mechanical without reducing relationships to a scalar affinity number.

## 12. Side content as character completion

FFVI's sidequests are often not detached bounty-board content. They function as **character-resolution modules**.

Common World of Ruin sidequests reveal or resolve:
- family history;
- grief;
- guilt;
- belonging;
- lost companions;
- identities;
- unfinished obligations.

Mechanically they may award:
- party members;
- Espers;
- Relics/equipment;
- new techniques;
- access to optional bosses;
- world knowledge.

This means an optional quest can be simultaneously:
- narrative closure;
- recruitment;
- progression;
- system unlock.

That is useful for OpenLegend because optionality need not imply inconsequence. The world can continue without resolving someone's problem, but resolving it should change more than a checklist.

## 13. Encounters: asymmetric character tools + shared systemic rules

FFVI's encounter vocabulary combines:
- elemental weaknesses/absorptions;
- status effects;
- reflect/reraise and other spell-state interactions;
- counters;
- special boss states;
- character-specific command opportunities;
- equipment/Relic immunities;
- multi-party constraints.

The result can be highly breakable. Reviews and veteran commentary frequently note that sufficiently developed Magicite/Relic combinations can trivialize much of the late game.

That is both strength and weakness.

**Strength:** the player discovers combinations and feels clever.

**Weakness:** if a universal high-output magic strategy dominates, the carefully authored differences among fourteen characters matter less.

For OpenLegend, systemic composition should create power without making the rest of the world's affordances irrelevant.

## 14. Example interactions

**Constructed rules-based situations, not recorded play.** The four original examples remain below with the missing conditions, next decisions and counterexamples supplied. The added arena case connects equipment ownership to autonomous action and risk. Late-game spoilers follow.

### A. Magicite as both teacher and growth modifier

**Intention:** develop a stronger spellcaster. **Conditions:** the character can equip the desired Esper, has spells left to learn and still has levels available. The original sequence is:

1. equip an Esper that teaches useful spells;
2. earn AP until the spells become permanent;
3. before level-ups, equip Magicite with a desired stat-growth bonus;
4. later remove the Esper but retain learned magic/stat growth.

One object has generated short-term combat effect, learning progression and permanent development. **Next decision:** keep training another spell or switch to a different level-up bonus. **Limit:** AP learning and an EXP level-up are separate events; an Esper chosen for its spell list need not grant the desired growth bonus, and equipping it after the level-up cannot retroactively change that event. [FFVI09](#ffvi09)

### B. Relic composition changes attack structure

**Intention:** build a repeated-strike attacker. **Conditions:** Genji Glove, Master's Scroll/Offering and compatible weapons are available. The original sequence is:

1. equip a Relic that enables dual wield;
2. equip a Relic that changes Attack into repeated strikes;
3. choose compatible weapons;
4. the resulting turn has qualitatively different behavior from either Relic alone.

This is rule composition, not additive +5% stacking. **Next decision:** retain the offensive combination or replace a slot with protection for the next enemy. **Limit:** both Relic slots are committed; the multi-strike effect changes targeting and suppresses some ordinary attack properties, including random spell activation in the documented original rules. Multiplying hits is not the same as multiplying every weapon effect. [FFVI11](#ffvi11) [FFVI28](#ffvi28)

### C. Phoenix Cave requires distributed coordination

**Intention:** reach Locke and the Phoenix-related conclusion. **Conditions:** two parties are prepared for their separate routes, not one strong party and an unusable reserve. The original sequence is:

1. divide available characters into two parties;
2. move Party A to a switch/path control;
3. switch to Party B and traverse the opened route;
4. repeat while each party handles its own encounters;
5. eventual progress depends on both spatial positions.

**Result:** an actor elsewhere changes the controlled party's reachable space. **Next decision:** advance the newly opened route or return control to the team needed at the next mechanism. **Limit:** making one party overwhelmingly strong does not let it occupy both required positions; an underprepared second team can interrupt the entire plan. This is spatial coordination by one player, not native network co-op. [FFVI16](#ffvi16)

### D. Ragnarok creates an irreversible world choice

**Intention:** choose the most useful form of a rare reward. **Conditions:** the Narshe choice is available and the player understands its alternative uses. The original choice grants Ragnarok as:
- an Esper that teaches Ultima and can transform enemies into items; or
- a sword that can be developed through the Coliseum reward chain.

Alternative routes can later provide Ultima, but the immediate decision still makes one object express **different system identities**. **Actions/result:** choose the form, then either allocate the teacher to a learner or build around the weapon/exchange path. **Next decision:** pursue the missing capability elsewhere rather than assuming the unchosen option remains in the same menu. **Limit:** a sword is not also the equipped Esper, and the initial reward decision should not be confused with version-specific later acquisition opportunities. [FFVI17](#ffvi17)

### E. A desired weapon requires a reliable delegate

**Intention:** exchange Ragnarok for Lightbringer. **Conditions:** the sword is owned and an arena fighter is prepared. **Actions:** inspect the wager, select a character/loadout suited to automatic action and fight Daedalus. **Interaction:** an equipment exchange depends on how the delegated fighter uses its available commands. **Result:** victory replaces the wager with Lightbringer. **Next decision:** equip the reward or preserve it for another build. **Limit:** a suicidal or unhelpful automatic choice can lose the wager; ejection merely preserves it without earning the reward. This is a planned exchange, not a guaranteed upgrade purchase. Older localization names such as Illumina describe the corresponding reward, not an extra separate sword in this chain. [FFVI29](#ffvi29) [FFVI28](#ffvi28)

## 15. Story-mechanics coupling

FFVI frequently gives story events direct system consequences.

- Terra's relationship to Espers explains her unique transformation and natural magic.
- Celes's imperial/magitek background supports Runic and magic access.
- Gau's upbringing on the Veldt becomes Rage/Leap learning from monsters.
- Edgar's technological kingdom corresponds to Tools.
- Sabin's martial training becomes Blitz.
- Shadow's occupation maps to Throw and his optional/missable presence.
- the destruction of the world changes the campaign structure itself.

Yet it also intentionally allows a shared Magicite layer that crosses those identities.

This tension is central:
- **authored biography creates initial affordances**;
- **player-directed learning expands beyond biography**.

OpenLegend likely wants the same basic pattern, but with more causal simulation behind how learning happens.

## 16. NPCs, factions, social systems and multiplayer

FFVI's Empire, Returners, kingdoms and communities are primarily authored factions. There is no general diplomacy/reputation engine.

NPCs provide:
- story state;
- local reaction;
- shops/services;
- clues;
- optional-character/Esper/event access.

They do not generally simulate:
- schedules;
- careers;
- social memory;
- procedural relationships;
- autonomous faction strategy.

The current Pixel Remaster is officially single-player. Its long-term social layer is cultural/community discussion rather than a native networked world.

For OpenLegend, FFVI is valuable less as an NPC simulation precedent than as a demonstration that **world-state changes can make static authored NPCs feel changed because context around them changed**. A simulation-first game can take that much further.

## 17. Art, animation, music and interface

FFVI was the last mainline Final Fantasy built around the classic 2D pixel-art era before VII's 3D transition.

The 1994 team described:
- a deliberate industrial/mechanical visual identity rather than mysterious ancient technology;
- larger and more expressive character sprites;
- effort to make towns/dungeons feel inhabited and materially plausible;
- battle/monster visuals rebuilt rather than simply reusing FFV routines. [FFVI06](#ffvi06)

Square Enix's 2024 Nomura interview adds that:
- ideas such as magic/machinery coexistence and the frozen Esper came from staff proposal documents;
- Shadow/Setzer concepts emerged collaboratively;
- the Statue of the Gods/final-boss presentation was shaped in response to visual design rather than a completely fixed upfront encounter plan. [FFVI07](#ffvi07)

### Music

Nobuo Uematsu's score gives many characters and locations individual musical identities. The opera is especially significant because music becomes an in-world performed event.

Pixel Remaster rebuilt that scene with:
- new visual staging;
- live-performer vocals;
- sung localization in seven languages. [FFVI04](#ffvi04) [FFVI18](#ffvi18)

The localization team describes that work as unusually complex, including remote recording during COVID-era production. [FFVI18](#ffvi18)

## 18. Production: collaborative authorship produced an ensemble

The game's production method is unusually aligned with its final structure.

Contemporary interviews describe a process where:
- staff contributed ideas across nominal job boundaries;
- character/world/event concepts were collected and combined during production;
- different developers had substantial ownership over particular characters or scenes;
- battle/system code was rebuilt rather than simply reusing FFV routines. [FFVI06](#ffvi06)

Square Enix's 2024 interview with Nomura reinforces this:
- contributors proposed concepts outside their formal specialization;
- Sakaguchi and leads selected/composed them;
- Shadow and Setzer grew from partial ideas that other team members extended;
- the game's final boss staging evolved alongside visual concept work. [FFVI07](#ffvi07)

This is a useful production analogue for OpenLegend itself: a world with many protagonists may benefit from **modular ownership plus a strong coherence layer**, rather than one designer prescribing every detail.

## 19. Distribution and commercial/participation context

FFVI originally released in Japan in April 1994 and in North America later that year under the title *Final Fantasy III*. It has since moved through:
- SNES/Super Famicom;
- PlayStation anthology releases;
- Game Boy Advance;
- mobile/legacy PC;
- Pixel Remaster on Steam/mobile and later modern consoles.

Square Enix's 2022 Pixel Remaster release announcement positioned FFVI around its large cast, Magicite customization and rebuilt opera scene. [FFVI04](#ffvi04)

As of the September 26, 2026 Steam snapshot, the current Pixel Remaster showed:
- **93% positive across 3,132 English-language reviews**;
- **89% positive across 77 recent reviews**. [FFVI19](#ffvi19)

Those counts are reception/participation evidence, not sales or active-player counts.

Square Enix announced in December 2025 that the **entire six-game Pixel Remaster series** had surpassed six million worldwide sales. This cannot be converted into an FFVI-specific figure without unsupported assumptions. [FFVI20](#ffvi20)

Historical sales figures for the 1994 release are commonly reported in secondary market compilations, but this dossier does not rely on a precise lifetime FFVI-only number because methodology/territory windows vary across those sources.

## 20. Reception: five substantive independent written reviews

| Source | Version | Praised | Criticized / tradeoff |
| --- | --- | --- | --- |
| RPGFan | Pixel Remaster (PS4), 2023 | storytelling, sprite expression, soundtrack, QoL | brightness/visual changes, conventional combat, missing bonus dungeon |
| GameSpot | Advance, 2007 | ensemble cast, presentation, enduring story/music, strong port | some GBA presentation limits and age-related friction |
| GamesRadar+ | Advance, 2007 | ahead-of-era ensemble/story, unique commands, new script/content | weaker second half, some low-value skills |
| Pocket Gamer | mobile, 2014 | story, Esper customization, Relics, touch QoL | limited tutorial and controversial visual changes |
| TouchArcade | Pixel Remaster, 2022 | story/cast/music/ambition and strong current mobile version | slower second-half pacing, easy system-breaking, Magicite can blur character identity, some remaster choices |

[FFVI21](#ffvi21) [FFVI22](#ffvi22) [FFVI23](#ffvi23) [FFVI24](#ffvi24) [FFVI10](#ffvi10)

### Reception synthesis

**The ensemble remains the defining achievement.** Reviews repeatedly emphasize that the game distributes attention across a large cast rather than relying on one hero.

**The World of Ruin is admired for freedom but criticized for pacing.** It creates discovery and optional character resolution, but the strong authored momentum of the first half becomes more diffuse.

**Magicite is powerful but can flatten differences.** The system gives broad customization, while reviews note that universal access to top-tier magic can reduce the importance of signature commands.

**Remaster preference depends on values.** Pixel Remaster offers current access, soundtrack and QoL; Advance offers bonus content; the SNES original retains historical art/timing/presentation choices some veterans prefer.

## 21. Current Steam helpful/player evidence

### Preserved original capture and its locator limits

The original pass described a positive 2026 feed emphasizing:
- music;
- Terra/Celes and the broader cast;
- scale/ambition relative to earlier 2D entries;
- exploration and optional World of Ruin content;
- nostalgia that survives the remaster. [FFVI25](#ffvi25)

It also recorded a negative account criticizing:
- brighter/color-shifted presentation;
- animation feel;
- technical behavior/performance on its setup;
- differences from the SNES aesthetic. [FFVI26](#ffvi26)

**Correction to evidence status:** the inherited FFVI26 link identifies a review-profile root, not a reliable game-specific permalink. Attempts to recover its game-specific page and the negative-only feed failed in the corrective pass. The earlier summary is preserved as the earlier researcher's account, not recertified as newly read testimony. It cannot establish a reproducible defect or a representative audience view.

The original pass also recorded Steam discussion about boss opacity and reliance on external strategies. That remains qualitative community evidence, not a prevalence estimate. [FFVI27](#ffvi27)

### Fresh, identifiable native review bodies

The corrective pass read the native **Most Helpful (Week), All, English** page. **BabytheStorm, August 23 as displayed**, recommends the game and values Terra's theme and the cast, but finds the story less impressive by modern standards and the difficulty insufficient to demand much tactical variety. **SpyroThyKing, August 21**, does not recommend this version and objects to perceived art/content changes; hostile motive claims and unverified mod-support assertions are not adopted as facts. **Mr. E Knight, August 24**, praises the characters, story and fantasy/technology mixture. [FFVI32](#ffvi32)

The cards did not expose publication years; displayed lifetime hours are not publication-time play duration. This is a selected weekly surface, not an all-time ranking or statistically representative survey. The mixed recommended account is especially useful: liking the work does not imply liking every system or every difficulty decision.

## 22. Comprehensive mechanics inventory

| Category | FFVI implementation / absence |
| --- | --- |
| Character creation | No avatar creator; authored ensemble |
| Classes / identity | Fixed person-specific command identities rather than switchable jobs |
| Attributes / leveling | EXP/levels plus Esper level-up bonuses; natural magic for select characters |
| Skill acquisition | Unique commands + Magicite-taught spells + Lore/Rage/Dance and other character-specific learning |
| Equipment | Character-restricted weapons/armor; Relics can alter commands/equipment/rules |
| Inventory / items | Consumables, key items, throwables, Tools, equipment, Coliseum wagers |
| Crafting | No general crafting/production system; Coliseum exchanges risk an owned item for a specified reward |
| Magic / powers | Shared learned spell layer via Espers; summons; Terra transformation; unique commands |
| Combat | ATB, four-person active party, rows, status/elemental/reflection/counter rules |
| Multi-party | Scenario splits, Phoenix Cave two-party coordination, Kefka's Tower three parties |
| Exploration | Towns, dungeons, overworld, hidden routes, optional areas/characters/Espers |
| Traversal | Walking, ships/chocobos/airships and story/event-specific transport |
| Economy | Gil shops/inns plus item-risk Coliseum exchange; no market simulation |
| Death/failure | KO/revival; older post-defeat EXP retention differs from manual load and Pixel Remaster recovery (§2.6); no persistent corpse state |
| Story | Authored first half; catastrophic world-state transition; more optional reconstruction second half |
| Relationships | Authored histories and optional resolution; no scalar affinity/romance system |
| Party/recruitment | Large roster; World of Ruin makes many reunions optional and order-flexible |
| NPC/factions | Scripted Empire/Returners/kingdom/community states; no general diplomacy simulation |
| World state | World of Balance physically transforms into World of Ruin |
| Sidequests | Often character-resolution + recruitment + mechanical reward together |
| Building/settlements | No player construction/settlement management |
| Multiplayer | Current Pixel Remaster single-player |
| Endgame | Multi-party Kefka's Tower; Advance adds Dragons' Den/Soul Shrine postgame content |

## 23. OpenLegend transferable lessons and limits

### A. Give every important person a distinctive verb

FFVI's cast remains legible because commands communicate history/role.

**Borrow:** professions, bodies, training and possessions should create actions unique enough that *who is present* matters.

**Limit:** avoid arbitrary game-class locks when a person could causally learn the skill.

### B. Overlay shared learning without erasing identity

Magicite adds flexibility but can converge the cast.

**Borrow:** people should be able to learn outside their starting roles.

**Limit:** persistent differences—talent, physical constraints, credentials, relationships, cultural knowledge, equipment, habits—should continue to matter after broad training.

### C. Catastrophes should rewrite the world graph

World of Ruin is memorable because locations, routes, people and goals change together.

**Borrow:** wars, disasters, migrations, ecological shifts and political collapses should mutate multiple systems at once.

### D. Optional reunion is stronger than a quest marker

Finding allies in the World of Ruin changes party capability and resolves personal arcs.

**Borrow:** helping a person should change what the world can do through that person.

### E. Distributed parties create true coordination

Phoenix Cave/Kefka's Tower require different groups to occupy different places and operate mechanisms.

**Borrow:** parallel agent groups should have local perception/resources and causal interdependence.

### F. Accessories can be small rule modules

Relics often change verbs or constraints rather than adding only stats.

**Borrow:** items should alter world interactions in legible, composable ways.

### G. Beware universal optimal strategies

If everyone learns the same best magic, distinct identities weaken.

**Borrow:** powerful general-purpose skills need costs, prerequisites, contexts or countervailing specialties.

### H. Capability breadth and delegated reliability are different

The Coliseum can make a large action repertoire a liability because the fighter does not select actions as a human would.

**Borrow:** evaluate an agent's policy over its capabilities, not just whether it possesses enough abilities. Restricting a task's action set can improve reliability, but opaque restrictions or random self-defeating behavior can instead make delegation feel arbitrary. This is a research interpretation, not an accepted OpenLegend implementation requirement.

## 24. Preservation and requirement audit

No FFVI-specific prior game/mechanics/dossier owner existed on this branch before G83, so this dossier is additive rather than a replacement. The corrective pass preserves the four earlier situations, expands their missing reasoning, adds a fifth arena case and qualifies the unrelocated player source instead of silently replacing its historical account.

| Requirement | Coverage |
| --- | --- |
| R01 identity/scope/promise | §§1–3 |
| R02 player actions/major mechanics | §§4–14, 22, including operative Coliseum rules |
| R03 items/entities/composition | §§5–7, 14, 22 |
| R04 progression/economy/time | §§2.6, 5, 7, 19, 22 |
| R05 concrete interactions | §14: five full situations spanning learning, loadouts, spatial coordination, reward choice and autonomous wagering |
| R06 people/AI/social/multiplayer | §§3, 7, 11–12, 16, 22 |
| R07 art/audio/interface/feel | §§2, 17 |
| R08 story/narrative/play | §§3, 10–15, with explicit spoiler boundaries |
| R09 production/development | §§17–18 |
| R10 marketing/distribution/virality | §19 |
| R11 commercial/participation | §19 |
| R12 reviews/player feedback | §§20–21, including fresh named native players and inherited-source limits |
| R13 transferable inspiration/limits | §23 |
| R14 sources/viewing/preservation/navigation | §§2, 24 + sources |

### Evidence limits

- Original, North American SNES, Advance, mobile/legacy PC and Pixel Remaster are not collapsed into one ruleset.
- GBA-only bonus Espers/dungeons are not attributed to the 1994 original or Pixel Remaster.
- Five independent substantive written reviews were inspected in the original pass; this repair did not reread every inherited article.
- Steam evidence is self-selected. The new named weekly sample is separately identified from the old negative account that could not be relocated.
- Six-million Pixel Remaster sales are series-wide, not FFVI-specific.
- Recovery is source- and version-qualified, not personally reproduced on every port.
- No claim depends on unseen video footage; useful future visual-study targets include the Magitek snow opening, opera staging across versions, party-split dungeons, World of Ruin map transition, character-specific command animations, the arena selection/result screens and Kefka's multi-tier final battle.

## 25. Completion conclusion

FFVI's strongest design contribution is not one isolated mechanic. It is the way **person-specific capabilities, shared learning, party composition and a mutable world structure reinforce one another**.

The first half proves that many authored protagonists can coexist without collapsing into one main character. Magicite proves that identity can remain flexible rather than class-locked. The World of Ruin proves that a narrative catastrophe can become a genuine systems transition, turning old relationships into optional recovery paths and old geography into a new planning problem.

For OpenLegend, the highest-value lesson is: **make identity persistent but learnable, and let major events change the actual option graph of the world.**

## Sources — annotated set

<a id="ffvi01"></a>**FFVI01 — [Final Fantasy VI Advance Review](https://rpgamer.com/review/final-fantasy-vi-advance-review/).** RPGamer, 2007. Advance-specific evidence for four new Espers, new spells and late bonus dungeon; review notes these additions are largely postgame.

<a id="ffvi02"></a>**FFVI02 — [Final Fantasy VI Advance Review](https://www.nintendoworldreport.com/review/12623/final-fantasy-vi-advance-game-boy-advance).** Nintendo World Report, 2007. Advance content, new dungeon/endurance mode, portraits, equipment and GBA audio/performance boundary.

<a id="ffvi03"></a>**FFVI03 — [FINAL FANTASY VI on Steam](https://store.steampowered.com/app/1173820/FINAL_FANTASY_VI/).** Valve/Square Enix, retrieved 2026-09-26. Current Pixel Remaster release/platform/single-player and review-aggregate snapshot.

<a id="ffvi04"></a>**FFVI04 — [FINAL FANTASY VI Pixel Remaster now available](https://press.fr.square-enix.com/FINAL-FANTASY-VI-PIXEL-REMASTER-NOW-AVAILABLE-ON-STEAM-AND-MOBILE-IN-E).** Square Enix press release, 2022-02-23. Primary release positioning, Magicite customization and rebuilt opera scene.

<a id="ffvi05"></a>**FFVI05 — [Final Fantasy VI version differences](https://finalfantasy.fandom.com/wiki/Final_Fantasy_VI_version_differences).** Community version reference. Used narrowly for omission of Advance bonus dungeons/four Espers and version-specific Pixel Remaster changes; not treated as production testimony.

<a id="ffvi06"></a>**FFVI06 — [Final Fantasy VI — 1994 Developer Interview](https://shmuplations.com/ff6/).** Shmuplations translation/collation of 1994 Japanese developer interviews. Primary-era testimony via secondary translation on collaborative development, industrial-world design, graphics and rebuilt systems.

<a id="ffvi07"></a>**FFVI07 — [FINAL FANTASY VI 30th Anniversary Interview](https://na.finalfantasy.com/topics/528).** Square Enix / Final Fantasy Portal, 2024-06-07. Primary Tetsuya Nomura retrospective on collaborative ideas, Shadow/Setzer, machinery/magic concepts and final-boss visual design.

<a id="ffvi08"></a>**FFVI08 — [Final Fantasy VI Skills](https://strategywiki.org/wiki/Final_Fantasy_VI/Skills).** StrategyWiki community mechanics reference for character-specific commands, Gogo customization and Umaro relic behavior.

<a id="ffvi09"></a>**FFVI09 — [Final Fantasy VI Espers](https://strategywiki.org/wiki/Final_Fantasy_VI/Espers).** StrategyWiki. Magic-learning rates, summon effects and level-up bonuses.

<a id="ffvi10"></a>**FFVI10 — [Final Fantasy VI Pixel Remaster Review](https://toucharcade.com/?p=290245).** Shaun Musgrave, TouchArcade, 2022-02-25. Full written review; story/cast/music strengths, World of Ruin pacing, Magicite identity flattening and remaster-version tradeoffs.

<a id="ffvi11"></a>**FFVI11 — [Final Fantasy VI Relics](https://strategywiki.org/wiki/Final_Fantasy_VI/Relics).** StrategyWiki. Two-slot Relic system, command/rule changes, status protection and field effects.

<a id="ffvi12"></a>**FFVI12 — [Final Fantasy VI Weapons](https://strategywiki.org/wiki/Final_Fantasy_VI/Weapons).** StrategyWiki. Character equipment permissions, weapon families and command prerequisites.

<a id="ffvi13"></a>**FFVI13 — [Kefka's Tower](https://strategywiki.org/wiki/Final_Fantasy_VI/Chapter_12%3A_Kefka%27s_Tower).** StrategyWiki. Three-party final-dungeon structure and separate group dependencies.

<a id="ffvi14"></a>**FFVI14 — [World of Ruin opening / Chapter 11](https://strategywiki.org/wiki/Final_Fantasy_VI/Chapter_11%3A_From_Cid%27s_Island_to_Darill%27s_Tomb).** StrategyWiki. Post-catastrophe reacquisition structure and early World of Ruin route.

<a id="ffvi15"></a>**FFVI15 — [Final Fantasy VI table of contents / sidequests](https://strategywiki.org/wiki/Final_Fantasy_VI/Table_of_Contents).** StrategyWiki. Character-sidequest inventory and World of Ruin navigation reference.

<a id="ffvi16"></a>**FFVI16 — [Locke's sidequest / Phoenix Cave](https://strategywiki.org/wiki/Final_Fantasy_VI/Locke%27s_sidequest).** StrategyWiki. Two-party switch/path interaction and late rewards.

<a id="ffvi17"></a>**FFVI17 — [Locke's sidequest / Narshe rewards](https://strategywiki.org/wiki/Final_Fantasy_VI/Locke%27s_sidequest).** StrategyWiki. Ragnarok Esper-versus-sword decision and related alternate Ultima path.

<a id="ffvi18"></a>**FFVI18 — [FINAL FANTASY Pixel Remaster Localization Team Special Interview, Part 2](https://na.finalfantasy.com/topics/443).** Square Enix / Final Fantasy Portal, 2023-06-10. Primary localization-team account of FFVI opera re-recording and seven sung languages; Part 1 documents remote-production constraints.

<a id="ffvi19"></a>**FFVI19 — [FINAL FANTASY VI on Steam](https://store.steampowered.com/app/1173820/FINAL_FANTASY_VI).** Valve, snapshot retrieved 2026-09-26. 93% of 3,132 English-language reviews positive; 89% of 77 recent reviews positive at retrieval. Dynamic data.

<a id="ffvi20"></a>**FFVI20 — [Final Fantasy Pixel Remaster series sales top six million](https://www.gematsu.com/2025/12/final-fantasy-pixel-remaster-series-sales-top-six-million).** Gematsu, 2025-12-17, reporting Square Enix. Six-million figure covers the entire six-game Pixel Remaster series.

<a id="ffvi21"></a>**FFVI21 — [Final Fantasy VI Pixel Remaster Review](https://www.rpgfan.com/review/final-fantasy-vi-pixel-remaster-2/).** Jerry Williams, RPGFan, 2023-06-24. Full independent review used for presentation, soundtrack, combat and missing-content tradeoffs.

<a id="ffvi22"></a>**FFVI22 — [Final Fantasy VI Advance Review](https://www.gamespot.com/reviews/final-fantasy-vi-advance-review/1900-6165876/).** Greg Mueller, GameSpot, 2007-02-13. Full independent GBA review; ensemble/presentation/port evidence.

<a id="ffvi23"></a>**FFVI23 — [Final Fantasy VI Advance review](https://www.gamesradar.com/final-fantasy-vi-advance-gba-review/).** GamesRadar+, 2007. Full independent review; ensemble viewpoints, unique abilities and second-half/skill criticisms.

<a id="ffvi24"></a>**FFVI24 — [Final Fantasy VI mobile review](https://www.pocketgamer.com/final-fantasy-vi-ios-android/review/).** Matthew Diener, Pocket Gamer, 2014-02-06. Full independent review; ATB, fixed commands, Esper/Relic customization and mobile-QoL evidence.

<a id="ffvi25"></a>**FFVI25 — [FINAL FANTASY VI English Steam reviews](https://steamcommunity.com/app/1173820/reviews/?l=english).** Individual Steam reviewers, original inspection 2026-09-26. Preserved qualitative positive sample; self-selected and dynamic. Fresh identified bodies are separately recorded as FFVI32.

<a id="ffvi26"></a>**FFVI26 — [Inherited negative-review locator](https://steamcommunity.com/profiles/76561198001743210/recommended).** Original pass reported inspection on 2026-09-26 and criticism of art/animation/technical presentation. The locator is a profile root; the corrective pass could not recover a game-specific body after real attempts. Earlier testimony is preserved but not independently recertified; it is not used as a new sampled player or measured defect.

<a id="ffvi27"></a>**FFVI27 — [FINAL FANTASY VI Steam community discussions](https://steamcommunity.com/app/1173820/).** Original discussion capture 2026-09-26; qualitative boss-difficulty/strategy-opacity complaints, not a representative sample.

<a id="ffvi28"></a>**FFVI28 — [The Colosseum](https://guides.gamercorner.net/ffvi/walkthrough/the-colosseum).** Gamer Corner Guides, authored original/SNES reference; operative arena and Offering passages read September 26, 2026. Reward chains, automated selection and tradeoffs; older names remain version-labeled. The loose word “run” is qualified by the specific PR ejection/flee distinction rather than treated as a guaranteed manual escape.

<a id="ffvi29"></a>**FFVI29 — [Coliseum](https://gamefaqs.gamespot.com/pc/323473-final-fantasy-vi-pixel-remaster/faqs/79866/coliseum).** bover_87, GameFAQs Pixel Remaster guide v1.1, updated June 5, 2023; mechanics, Ragnarok wager and preparation passages read September 26, 2026. Specific outcomes and commands, not personally tested success probabilities or a universal optimal build.

<a id="ffvi30"></a>**FFVI30 — [Final Fantasy VI Advance instruction manual](https://manuals.plus/square-enix/agb-bz6e-final-fantasy-vi-advance-manual).** Square Enix/Nintendo AGB-BZ6E manual, hosted HTML transcription; printed page 30's Game Over paragraph and save/Continue distinctions read September 26, 2026. Primary recovery wording; not proof that every later edition retains the same rule.

<a id="ffvi31"></a>**FFVI31 — [Final Fantasy VI stats — EXP](https://finalfantasy.fandom.com/wiki/Final_Fantasy_VI_stats).** Community mechanics reference; substantive indexed EXP/version passage inspected September 26, 2026 after direct retrieval failed. Pixel Remaster saved-state recovery is kept distinct from the older EXP-retention rule. Other formulas and exploit claims on the page are not adopted.

<a id="ffvi32"></a>**FFVI32 — [Native weekly-helpful Steam review page](https://steamcommunity.com/app/1173820/reviews/).** Direct player bodies read September 26, 2026: BabytheStorm, SpyroThyKing and Mr. E Knight. Displayed August dates lack years; ranking and hours are dynamic. This is a new identifiable qualitative sample, not an invented replacement identity for FFVI26.

<a id="ffvi33"></a>**FFVI33 — [Game Mechanics — battle outcomes](https://gamefaqs.gamespot.com/pc/323473-final-fantasy-vi-pixel-remaster/faqs/79866/game-mechanics).** bover_87's PR guide; substantive game-over/escape/reward passage inspected September 26, 2026. Supports the saved-game recovery distinction; unrelated disputed status/EXP details are not generalized.

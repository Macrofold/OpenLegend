# Final Fantasy VII — full research dossier

**G84 · Complete research pass, September 26, 2026; expanded after the substantive coverage audit.** Primary mechanics baseline: the 1997 PlayStation *Final Fantasy VII*. Later ports are separated where presentation or convenience materially differs, especially the February 24, 2026 PC re-release. *Final Fantasy VII Remake* (2020), *Final Fantasy VII Rebirth* (2024), and the announced *Final Fantasy VII Revelation* (2027) are treated as a separate reinterpretation trilogy rather than substitutes for the original ruleset. [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Coverage audit](../coverage-audit-g81-g100.md).

No personal playthrough is claimed. Concrete examples are reconstructed from documented rules, contemporary developer interviews, reviews and version-specific reference material. Section 30 supplies the corrected audit's deeper minigame and remake comparison and complete cross-system situations; the earlier material is retained.

## 1. Identity, scope and player promise

The original *Final Fantasy VII* is a 1997 party RPG built around an unusual combination:

- a strongly authored protagonist and ensemble;
- **highly portable character abilities** through Materia;
- character-specific **Limit Breaks** that restore mechanical individuality;
- Active Time Battle;
- a journey that expands from one dense industrial city into a traversable planet;
- a large volume of bespoke minigames, side systems and optional discoveries;
- cinematic presentation using polygonal characters, pre-rendered backgrounds and FMV.

Cloud Strife is the clear central protagonist, unlike FFVI's deliberately protagonist-less ensemble. Contemporary director Yoshinori Kitase said this was decided from the beginning. At the same time, the battle team intentionally avoided hard-wiring most abilities to characters: Materia could be placed into compatible equipment by almost anyone, so combat identity would depend heavily on **what the player equipped**. [FFVII01](#ffvii01)

That gives the game's central design tension:

> **Build identity is flexible; personal identity is authored.**

The player can turn Cloud into a healer, Aerith into an offensive caster, Barret into a support character, or Red XIII into a physical attacker through Materia/equipment. But their stories, weapons, animations, stats and Limit Breaks still remind the player that they are different people.

## 2. Version and continuity boundaries

### 2.1 1997 PlayStation original

The PlayStation release is the canonical mechanics baseline for this dossier.

It established:
- three-person active parties;
- ATB;
- Materia/AP growth;
- character-specific weapons and Limit Breaks;
- pre-rendered field maps plus 3D battle/world-map scenes;
- a multi-disc progression structure;
- the Gold Saucer and its minigames;
- chocobo breeding/racing and traversal;
- optional characters and superbosses.

The original international releases contain localization and balance/content differences from the first Japanese build; this dossier does not assume every regional 1997 build is byte-identical.

### 2.2 1998 PC and later original-game ports

The 1998 Windows release is fundamentally the same game but altered the technical presentation. GameSpot's PC review praised the underlying story/combat while criticizing PC-specific music, FMV and keyboard/interface compromises. [FFVII02](#ffvii02)

Later PSN, mobile, PS4, Xbox and Switch releases preserved the original game while adding differing convenience layers. Modern versions commonly include speed-up, encounter suppression and battle boosters.

### 2.3 2013 Steam edition → February 24, 2026 PC re-release

On **February 24, 2026**, Square Enix replaced the purchasable 2013 Steam edition with a new original-game PC release and also launched it on GOG. Existing 2013 owners retained the older build and received the new one at no charge; save files are not compatible between the two PC editions. [FFVII03](#ffvii03)

The new release adds:
- 3× speed;
- random-encounter toggle;
- battle enhancement that restores HP/MP and fills the Limit gauge;
- autosave.

Square Enix's current Steam description explicitly says there are **no changes or additions to the story**. [FFVII04](#ffvii04)

This matters to research methodology: the current Steam review score partly measures a **2026 port**, not merely player opinion of the 1997 design.

### 2.4 Compilation of Final Fantasy VII

Works such as *Crisis Core*, *Advent Children* and *Dirge of Cerberus* expand the setting and character histories but are not silently used as evidence for systems in the 1997 game.

### 2.5 Remake trilogy

The modern remake project is a three-game reinterpretation:
- *Final Fantasy VII Remake* (2020) expands the original Midgar portion into a full standalone game;
- *Final Fantasy VII Rebirth* (2024) expands the journey outside Midgar into multiple large regions and adds new relationship/combat systems;
- *Final Fantasy VII Revelation*, announced as the finale, is scheduled for **April 8, 2027**. [FFVII05](#ffvii05) [FFVII06](#ffvii06)

The remake trilogy has different combat, traversal, character progression, encounter design and narrative structure. It is therefore comparison material, not the G84 baseline.

## 3. Materia: abilities as portable objects

Materia are equippable objects inserted into slots in weapons and armor. They are the foundation of the build system.

Broad categories include:
- **Magic Materia** — spells such as healing, elemental magic, status and utility;
- **Summon Materia** — summon commands;
- **Command Materia** — new battle commands such as Steal, Manipulate, Throw, Morph or Mime;
- **Support Materia** — modifies a paired Materia when placed into linked equipment slots;
- **Independent Materia** — passive/stat/encounter effects;
- **Enemy Skill Materia** — stores learned enemy abilities. [FFVII07](#ffvii07) [FFVII08](#ffvii08)

This means character ability is partially **externalized into world objects**. A character does not permanently “become a White Mage”; they can become a healer because Restore and related Materia are currently in their loadout.

### Why this matters

Materia support several kinds of agency simultaneously:
- role assignment;
- build experimentation;
- collection;
- long-term growth;
- spatial/equipment tradeoffs;
- cross-system combinations.

The same Fire Materia can have a different meaning depending on:
- who equips it;
- whether it is linked;
- which Support Materia is paired with it;
- whether it is in a weapon or armor;
- how far it has grown;
- what enemy is being faced.

That is a much denser design than “spell item grants Fire.”

## 4. AP and Materia growth: knowledge persists independently of the person

After battle, equipped Materia can gain AP when placed in equipment with Materia growth.

As a Materia gains AP:
- additional spell/effect levels may unlock;
- some abilities increase in strength or usage;
- mastering a Materia can create a fresh copy of that Materia;
- the object remains transferable between characters. [FFVII09](#ffvii09)

Equipment therefore has two values at once:
1. combat power now;
2. **learning rate** for the Materia being trained.

Some weapons/armor provide no Materia growth, some normal growth, some double or triple growth. The player can deliberately equip weaker training gear to accelerate long-term capability development. [FFVII10](#ffvii10)

This is a strong progression pattern because the player chooses between:
- immediate effectiveness;
- future capability;
- slot count;
- linked-slot topology;
- character-specific weapon properties.

## 5. Linked Materia: a visual grammar for composition

Support Materia becomes especially powerful when paired with another Materia in linked equipment slots.

Documented examples include:
- **All + compatible Magic** — turns a normally single-target spell into a multi-target version;
- **Elemental + elemental Materia** — adds that element to attacks or provides elemental defense depending on equipment placement;
- **Added Effect + status-producing Materia** — applies status to attacks or protects against it;
- **HP/MP Absorb + compatible action** — attaches resource recovery to another effect;
- **Counter/Magic Counter + compatible action** — creates reactive behavior;
- **Final Attack + a compatible spell/summon** — triggers the paired action when the character is defeated. [FFVII11](#ffvii11)

The interface communicates composition spatially: two linked sockets form a relationship.

That is an important OpenLegend precedent. System composition is easier to reason about when the UI shows **what modifies what** instead of hiding it in a formula.

## 6. Enemy Skill and Manipulate: the world teaches abilities

Enemy Skill Materia can learn certain abilities after the equipped character is targeted by them. Manipulate can be used to control some enemies and deliberately make them cast learnable abilities. [FFVII12](#ffvii12)

This creates a multi-system acquisition loop:

1. encounter a creature;
2. discover that it has an interesting ability;
3. equip Enemy Skill Materia;
4. use Manipulate or another tactic to cause the ability to hit the learner;
5. permanently store that capability in that specific Enemy Skill Materia;
6. carry the learned repertoire to another character by moving the Materia.

The world itself becomes a curriculum.

**OpenLegend transfer:** creatures, teachers, artifacts and observed phenomena can be sources of learnable actions. Knowledge acquisition becomes more meaningful when the player has to interact with the source rather than merely spend an abstract skill point.

## 7. Character identity persists through Limit Breaks

Materia deliberately makes character builds flexible. Tetsuya Nomura said this created a need for a counterweight: **Limit Breaks were added to bring out each character's innate personality and individuality**. [FFVII01](#ffvii01)

The Limit gauge fills as the character takes damage. Fury makes it fill faster; Sadness makes it fill more slowly. Most characters progress through multiple Limit levels by:
- personally defeating enemies;
- repeatedly using current Limits;
- ultimately finding a character-specific final Limit manual. [FFVII13](#ffvii13)

Examples of identity preserved by Limits:
- Cloud's escalating sword techniques;
- Tifa's chained slot-like martial sequence;
- Aerith's support/healing-oriented Limits;
- Barret's gun-arm barrages;
- Red XIII's beast-like attacks/support;
- Yuffie's ninja techniques;
- Cid's spear/air-support identity;
- Vincent's transformation Limits, which surrender direct control after transformation;
- Cait Sith's highly unusual random/slot-based Limits.

So FFVII solves a systems problem explicitly:

- **Materia:** “anyone can learn/equip many things.”
- **Limit Break:** “this is still this person.”

## 8. Weapons, armor and accessories are build topology

Weapons are character-specific, preserving some hard identity even while Materia is portable.

Weapons/armor vary by:
- attack/defense and magic-related stats;
- number of Materia slots;
- which slots are linked;
- AP growth rate;
- special rules;
- range;
- ultimate-weapon scaling conditions. [FFVII10](#ffvii10)

The “best” weapon is therefore contextual.

A weapon with:
- lower attack;
- more slots;
- linked pairs;
- double or triple AP growth

may be preferable while training Materia, while an ultimate weapon with no growth may dominate a final encounter.

Accessories add another single-slot layer for:
- attribute changes;
- status immunity;
- resource/combat effects;
- encounter-specific protection. [FFVII14](#ffvii14)

This is a good example of **equipment as build architecture**, not only vertical stat replacement.

## 9. ATB and party composition

The original retains Active Time Battle:
- gauges fill over time;
- once ready, characters execute menu-selected commands;
- battle settings alter how time behaves during command selection;
- speed affects action rhythm.

The active party contains up to three characters.

Because most command/magic capability can be moved through Materia, party choice is influenced by:
- base stats;
- weapon types/properties;
- ranged versus melee positioning;
- Limit Breaks;
- story availability;
- preferred character identity;
- equipment currently owned;
- build investment. [FFVII15](#ffvii15)

This makes FFVII less dependent than FFIV on bringing the one “correct class,” but more character-distinct than a completely interchangeable roster.

## 10. Story progression repeatedly changes the player's scale

The campaign begins in **Midgar**, where:
- movement is corridor/district based;
- Shinra's industrial machinery dominates the visual/world logic;
- Avalanche's conflict feels local and political;
- the party is constrained by one city.

Leaving Midgar reveals a 3D world map and reframes the entire adventure.

Over time the player gains new traversal permissions through:
- chocobos;
- vehicles such as the buggy;
- the Tiny Bronco;
- submarine;
- the Highwind airship;
- specially bred chocobos that can cross rivers, mountains and eventually sea. [FFVII16](#ffvii16)

This is progression as **expanding geographic possibility** rather than merely increasing stats.

## 11. Chocobo breeding converts a minigame into world access

Late-game chocobo breeding/racing is one of FFVII's most elegant cross-system loops.

Special chocobos acquire traversal capabilities:
- blue: rivers;
- green: mountains;
- black: rivers + mountains;
- gold: rivers + mountains + sea. [FFVII16](#ffvii16)

Those traversal abilities unlock otherwise unreachable Materia caves, including rewards such as:
- Mime;
- Quadra Magic;
- HP↔MP;
- Knights of Round.

The chain crosses several systems:
1. catch chocobos in the world;
2. rent stable capacity;
3. feed/train them;
4. race at Gold Saucer;
5. breed for special offspring;
6. gain traversal capability;
7. access secret geography;
8. obtain rare build components;
9. use those components against optional/endgame encounters.

The striking lesson is that **a side activity changes the topology of the main world**.

## 12. Gold Saucer: a deliberately different economy and activity space

The Gold Saucer concentrates minigames into an in-world amusement complex.

Activities across the broader game include:
- arcade-style games;
- Battle Square;
- Chocobo Square/racing;
- motorcycle sequences;
- snowboarding;
- submarine gameplay;
- Fort Condor's strategic defense;
- date/social variation;
- other one-off set pieces. [FFVII17](#ffvii17)

The Gold Saucer uses **GP** as a local activity currency distinct from ordinary gil, while Battle Square uses its own BP reward loop.

This creates a diegetic sub-economy:
- outside wealth does not directly substitute for all participation;
- the player earns special currency by engaging with the venue;
- rewards include items and important character progression such as Cloud's Omnislash manual.

The broader game frequently changes interaction genre for a few minutes. That variety creates memorability, but reviews also show that not every minigame ages equally well. Section 30 develops the operative Battle Square and Fort Condor rules rather than treating this inventory as sufficient explanation.

## 13. Optionality: characters, areas, limits, summons and superbosses

FFVII contains significant optional content that can materially change capability.

Examples include:
- recruiting **Yuffie**;
- recruiting **Vincent**;
- Wutai side content;
- character-specific final Limit Breaks;
- optional summons/Materia;
- Ancient Forest;
- Sunken Gelnika;
- chocobo breeding/racing;
- Emerald and Ruby Weapon;
- Master Materia paths;
- hidden character/story scenes. [FFVII18](#ffvii18)

Optional characters are especially important. Kitase has specifically pointed to Vincent as a party member the player can miss by failing to explore the mansion thoroughly. [FFVII19](#ffvii19)

This means exploration affects not only loot but **who exists in the player's party history**.

## 14. Story and systems: identity, memory, ecology and extraction

**Major plot spoilers in this section.**

FFVII's central themes include:
- industrial extraction of planetary life energy;
- ecological damage;
- corporate/state power;
- identity and constructed memory;
- grief;
- scientific experimentation;
- inheritance and belonging.

The most important story-system connection is **Materia itself**.

In fiction, Materia crystallizes knowledge/wisdom associated with the Planet/Lifestream; mechanically, it carries spells/abilities between people. The game's main customization system therefore echoes a narrative idea: knowledge exists in a material form that people can use, combine, exploit and fight over.

Cloud's identity crisis also creates an interesting contrast:
- his **story identity is unstable**;
- his **mechanical build is intentionally reconfigurable**;
- his Limit Breaks/weapons still provide stable person-specific cues.

Aerith's role is the opposite kind of authored constraint: no amount of ordinary build optimization gives the player control over the central story event involving her. The game sharply separates **combat authorship** from **narrative authorship**.

## 15. Relationships are authored but lightly player-reactive

FFVII does not have a generalized relationship simulation.

However, a hidden affinity system can influence who accompanies Cloud during the Gold Saucer date sequence. Dialogue/party choices accumulate toward a small number of authored outcomes.

This is not:
- procedural romance;
- NPC memory simulation;
- faction reputation;
- a reusable social graph.

But it is an early example of the game quietly tracking **relational history** and later reflecting it in a social scene.

For OpenLegend, the useful idea is the delayed consequence, not the hidden scalar itself: past interactions should be able to change later social opportunities.

## 16. Encounters and build recomposition

FFVII's Materia system makes encounter preparation broad rather than class-prescriptive.

Players can respond to threats by:
- changing elemental attack/defense pairs;
- adding status resistance;
- reassigning healing/revival;
- moving ranged capability;
- equipping counter/support combinations;
- manipulating or learning from enemies;
- changing accessories;
- switching party members;
- using Limit-specific tactics.

### Concrete interaction 1: Elemental pairing changes by slot context

A player faces an elemental threat.

1. equip an elemental Magic Materia;
2. link it to Elemental;
3. place the pair in a weapon to add elemental offense, **or**
4. place it in armor to reduce/negate/absorb that element as the Materia develops.

The same two objects become either attack or defense because **equipment location changes semantic meaning**. [FFVII11](#ffvii11)

### Concrete interaction 2: Manipulate → Enemy Skill

1. find a monster with a useful learnable ability;
2. give one character Manipulate;
3. give the intended learner Enemy Skill;
4. manipulate the monster;
5. force it to cast the relevant skill on the learner;
6. retain the ability in that Enemy Skill Materia. [FFVII12](#ffvii12)

This is an unusually rich acquisition loop because another entity's ability becomes a permanent portable tool through direct causal interaction.

### Concrete interaction 3: AP-growth equipment as an investment choice

1. equip a weaker double/triple-growth weapon;
2. place high-cost Materia in its limited slots;
3. accept lower immediate battle power;
4. earn accelerated AP;
5. later move the matured Materia into stronger/no-growth final equipment.

This creates explicit **training gear** versus **combat gear**.

### Concrete interaction 4: chocobo breeding → Knights of Round

1. capture/train/breed special chocobos;
2. race enough to improve breeding prospects;
3. eventually obtain a gold chocobo;
4. cross otherwise impassable sea to a hidden island;
5. collect Knights of Round Materia. [FFVII16](#ffvii16)

A long optional husbandry/racing chain produces a top-tier combat capability through world traversal. Section 30 supplies conditions, next choices and counterexamples for these retained sketches.

## 17. Progression, economy, death and time

### Character progression

Characters gain:
- EXP and levels;
- stat growth;
- equipment;
- Limit Break progression;
- permanent stat-source items.

Materia separately gains AP.

This two-layer structure lets the player distinguish:
- **person growth**;
- **capability-object growth**.

### Economy

Gil supports:
- weapons;
- armor;
- accessories;
- Materia in shops;
- consumables;
- services;
- chocobo-related spending.

Gold Saucer introduces separate GP/BP loops.

Mastered Materia can also become economically valuable, creating a connection between training and wealth.

### Failure

KO can be reversed through items/magic. Full party defeat returns the player to earlier saved progress/modern continue behavior depending on release.

The original saves on the world map and at designated field save points rather than universally at any moment. The 2026 PC release adds autosave, reducing the time-risk of failure without rewriting encounter rules. [FFVII03](#ffvii03)

### Current convenience toggles

The 2026 PC release can:
- accelerate time;
- suppress random encounters;
- effectively remove ordinary battle attrition through battle enhancement.

These are useful accessibility/replay tools, but they change the original resource/time economy. “Quality of life” and “same gameplay pressure” are not always identical.

## 18. Art, interface, music and cinematic staging

FFVII's technological transition was fundamental to its identity.

The team moved from sprite/tile-based 2D production to:
- real-time polygonal characters;
- 3D battle scenes;
- pre-rendered field backgrounds;
- CG movies;
- camera-directed staging.

Contemporary interviews say camera behavior and Materia were among the earliest systems decided. CD-ROM capacity was chosen partly because the team's visual ambitions would not fit comfortably in cartridge ROM, while lower media cost was also commercially attractive. [FFVII01](#ffvii01)

Art director Yusuke Naora described using seamless background images to create varied, lived-in spaces without reusing tile sprites. Kitase emphasized smooth transitions between field scenes, movies and battle presentation. [FFVII01](#ffvii01)

### Music

Nobuo Uematsu wrote a score of roughly 100 pieces using the PlayStation's internal sound capabilities rather than streaming every track from CD, partly to avoid load/access friction. [FFVII01](#ffvii01)

The soundtrack also carries strong location/character identity:
- Midgar's industrial unease;
- world-map release;
- character themes;
- boss escalation;
- Sephiroth's musical identity.

The result is a world whose *systemic mechanics* are relatively abstract but whose **place identity** is unusually strong.

## 19. Production: flexibility was designed, not accidental

The 1997 interviews provide rare direct evidence of system intent.

Kitase says:
- Cloud was deliberately established as the main protagonist from the start;
- 3D camera planning and Materia were among the first major decisions;
- because weapons/armor could accept Materia, combat would depend on how Materia was used rather than fixed innate character skills. [FFVII01](#ffvii01)

Nomura says:
- Limit Breaks grew from FFVI's desperation attacks;
- he wanted them to restore individual character personality because Materia made builds so free. [FFVII01](#ffvii01)

The team also underwent a production-model shift:
- traditional Square staff produced most field/game mechanics;
- specialist CG staff joined the project;
- teams learned new PlayStation/3D workflows while making the game;
- the project was assembled more like a film production than earlier Final Fantasy development. [FFVII01](#ffvii01)

The hardware change did not merely improve fidelity. It expanded:
- scene composition;
- camera language;
- vehicle/set-piece plausibility;
- background variety;
- marketing spectacle.

## 20. Distribution, marketing and commercial context

FFVII was a major commercial inflection point for the franchise.

The 1998 GameSpot PC review recalls the original North American release's unusually visible promotion, including television commercials and large urban bus-stop advertising. [FFVII02](#ffvii02)

The game then persisted across:
- PlayStation;
- Windows;
- PSN;
- mobile;
- PS4;
- Xbox;
- Switch;
- multiple later PC storefront builds.

As of Square Enix's **April 10, 2026** Rebirth platform announcement, the company states that the **1997 original has sold over 15.5 million copies worldwide**. [FFVII20](#ffvii20)

That is an original-game lifetime-sales claim, unlike series-wide figures used for earlier dossiers.

The February 2026 Steam/GOG re-release demonstrates that Square Enix is still maintaining the original as a commercially separate product while the remake trilogy is active. [FFVII03](#ffvii03)

## 21. Five substantive independent reviews of the original game/ports

| Source | Version | Praised | Criticized / tradeoff |
| --- | --- | --- | --- |
| GameSpot | PlayStation, 1997 | integration of technology, playability and narrative; cinematic presentation | occasional design friction and genre conventions |
| RPGFan | PlayStation, 1998 | broad audiovisual/gameplay/story package | considered it excellent but below extreme hype in some areas |
| Push Square | PS4 port, 2015 | pacing, cast, ATB, Materia depth, soundtrack | visibly dated 3D models and cumbersome pre-rendered navigation |
| Nintendo Life | Switch port, 2019 | enduring story/world, ATB/Materia, modern speed option | heavy random encounters, antiquated elements, some systems surpassed by later games |
| Pocket Gamer | iOS port, 2015 | underlying original remains compelling | touch controls and port adaptation weak; booster/encounter toggles change feel |

[FFVII21](#ffvii21) [FFVII22](#ffvii22) [FFVII23](#ffvii23) [FFVII24](#ffvii24) [FFVII25](#ffvii25)

### Reception synthesis

**Materia is the mechanically durable achievement.** Later reviewers repeatedly single it out as approachable but deep because simple socketing grows into support pairings, AP planning and party-wide role design.

**Presentation aged unevenly.** The original's art direction, backgrounds and music remain frequently praised; low-poly field models, fixed-camera navigation and some technical port choices are much more visibly historical.

**Random encounters/minigames are the main friction points.** Modern speed/no-encounter options are widely valued by reviewers returning to the game, but their usefulness is also evidence that the original time-cost assumptions have aged.

**Story/cast remain the primary emotional draw.** Even critical retrospective reviews tend to regard Cloud and the ensemble, Midgar, and the game's dramatic progression as the reason the whole package retains relevance.

## 22. Current Steam evidence: port quality must be separated from game quality

The current Steam app is the February 2026 re-release, even though inherited storefront metadata still references the older PC lineage.

At the September 26, 2026 snapshot, Steam showed approximately:
- **74% positive across ~1.45k all-time reviews**;
- **~90% positive across ~130 recent reviews**. [FFVII04](#ffvii04)

The most-helpful review surface is unusually important because the low aggregate is heavily affected by **launch/port criticism**:
- a highly helpful negative review criticized filtering, presentation, launch-speed bugs, the new launcher and the decision to replace the purchasable 2013 edition;
- other negative reviews focused on blurry filtering, sound/loop behavior and losing the older purchasable build;
- positive helpful reviews praised removal of the older Square Enix account requirement, same-day battle-speed fixes, improved controller/input behavior and the built-in convenience options;
- by later 2026, some users reported no major technical problems on their setups and emphasized the original game's Materia/story/exploration strengths. [FFVII26](#ffvii26) [FFVII27](#ffvii27)

This evidence must be read carefully:
- February launch complaints may describe already-patched behavior;
- technical experiences vary by hardware;
- helpful-review rankings are self-selected;
- a review rejecting the 2026 port may still strongly admire the 1997 game.

For R12, the correct conclusion is not “FFVII is 74%-liked.” It is: **the current PC package has mixed port reception sitting on top of a much more positively regarded underlying classic.** The qualitative sample does not measure what proportion of the aggregate difference was caused by port problems; “heavily affected” above records the original interpretation, not a causal estimate established by this audit.

## 23. Remake (2020): the same fiction becomes a different game architecture

Square Enix describes *Final Fantasy VII Remake* as a standalone game that covers and greatly expands the original's Midgar section through the party's escape. [FFVII05](#ffvii05)

### Combat

Remake changes the original menu/ATB structure into a hybrid:
- direct real-time attacks, blocking and movement;
- active character switching;
- actions help fill ATB;
- ATB bars are spent on abilities, spells and items;
- Tactical Mode slows time while selecting commands. [FFVII28](#ffvii28)

This preserves the **resource meaning of ATB** while moving low-level combat execution into real time.

Summons also become field participants for a limited duration rather than a single cinematic spell, with special abilities the player can command. [FFVII29](#ffvii29)

### Structural contrast

Original Midgar:
- one opening portion of a much larger game.

Remake Midgar:
- a full game with expanded districts, sidequests, bosses, character scenes and new narrative material.

Push Square's review praised the combat and expanded core character work while criticizing some corridor level design, sidequests and uneven environmental texture quality; it also emphasized that the narrative is not an exact replica. [FFVII30](#ffvii30)

**OpenLegend lesson:** a reinterpretation can preserve a resource/system concept while changing its interaction layer. “ATB” need not imply identical controls. Pressure, weapon learning and Hard Mode are developed in §30.

## 24. Rebirth (2024): relationship mechanics and regional exploration move to the foreground

*Final Fantasy VII Rebirth* expands outside Midgar into multiple explorable regions. Square Enix describes its world as region-based, with different environments and traversal requirements. [FFVII31](#ffvii31)

It builds on Remake's action/ATB hybrid and adds **Synergy**:
- two-character skills/abilities;
- a growth system with skill trees;
- additional Materia;
- systems explicitly intended to make the bonds between characters felt during battle. [FFVII32](#ffvii32)

This is a notable design evolution from the 1997 game's mostly hidden relationship-value/date logic.

Original:
- relationship history affects a small authored social outcome.

Rebirth:
- party relationships are also represented through paired combat actions and character-focused side content.

RPGFan's review praised the characters, combat, regions and huge range of activities while noting occasional empty-feeling spaces, control/visual issues and divisive narrative choices. [FFVII33](#ffvii33)

The modern trilogy therefore provides a useful comparison:
- the original makes **Materia composition** the main player-authored battle identity;
- Remake adds **real-time embodiment**;
- Rebirth adds more explicit **inter-character mechanical cooperation**.

Section 30 distinguishes Synergy Skills from Synergy Abilities and develops crafting and Queen's Blood. Those systems are not interchangeable merely because the initial overview groups them under “side content” or “synergy.”

## 25. Revelation (announced, not yet released)

As of September 26, 2026, *Final Fantasy VII Revelation* is announced as the trilogy's final entry for **April 8, 2027** on PS5, Switch 2, Xbox Series X|S and PC storefronts. [FFVII06](#ffvii06)

Official material says the Highwind will enable free travel around a broad world and that combat will continue to evolve, but this dossier does **not** treat unreleased mechanics, balance or final narrative behavior as known facts beyond published material.

This section exists only to keep the 2026 trilogy status accurate.

## 26. Comprehensive mechanics inventory

| Category | Original FFVII implementation / absence |
| --- | --- |
| Character creation | No avatar creator; authored Cloud + fixed party cast |
| Classes/jobs | No switchable jobs; flexible roles emerge primarily through Materia |
| Attributes/levels | Character EXP/levels + permanent Sources; weapon/stat differences |
| Ability progression | Materia AP, Limit Break progression, Enemy Skill acquisition |
| Magic | Magic Materia, summons, Enemy Skills, support-linked modifications |
| Equipment | Character-specific weapons; armor; one accessory; Materia-slot topology/growth |
| Inventory/items | Consumables, key items, Limit manuals, equipment, greens/nuts, Materia |
| Crafting | No general crafting system; chocobo breeding is the closest long-horizon production/breeding loop; Rebirth's Item Transmuter is a different system (§30) |
| Combat | Three-character ATB, rows/range, commands, magic, summons, statuses, Limits |
| Character identity | Weapons/stats/Limit Breaks/story; most general abilities portable via Materia |
| Enemy interaction | Steal, Sense, Manipulate, Morph, Enemy Skill learning |
| Exploration | Pre-rendered field scenes, world map, hidden/optional areas, secrets |
| Traversal | Walking, vehicles, airship, submarine, chocobos with terrain permissions |
| Minigames | Gold Saucer, motorcycle, snowboarding, submarine, Fort Condor, racing and many bespoke events; operative arena/defense rules in §30 |
| Economy | Gil plus Gold Saucer GP/BP sub-economies |
| Death/failure | KO/revival; party wipe returns to save/modern continue; minigame loss contracts differ |
| Story | Authored linear main plot with optional characters/sidequests and some hidden relationship tracking |
| Relationships | Light hidden affinity/date outcome; no general social simulation |
| NPCs/factions | Scripted NPCs; Shinra/Avalanche/communities authored, no reusable diplomacy engine |
| World state | Story opens access, changes locations/party availability, but no fully simulated persistent ecology/politics |
| Optional/endgame | Optional characters, Weapons, rare Materia, final Limits, chocobo chain, side areas |
| Multiplayer | Single-player |
| Building/settlements | No player building/management |
| User-generated systems | No native editor; mod community is significant on PC but external to original design |

## 27. OpenLegend transferable lessons and limits

### A. Make abilities portable when the fiction supports portable knowledge

Materia makes power an object that can be moved between people.

**Borrow:** books, artifacts, implants, tools, credentials, spells, software or taught techniques can carry capabilities.

**Limit:** if everything is transferable, people lose mechanical identity.

### B. Preserve personhood with non-transferable traits

Limit Breaks were explicitly added to restore individuality.

**Borrow:** even broadly trainable agents should retain differences grounded in body, temperament, history, relationship, talent, obligation or unique experience.

### C. Let modifiers compose visibly

Linked Materia makes “A modifies B” spatially clear.

**Borrow:** expose dependency/composition relationships in the interface and world model.

### D. Let the world be a teacher

Enemy Skill + Manipulate means knowledge comes from interacting with entities.

**Borrow:** observation, apprenticeship, experimentation and capture/control should be able to create durable learning.

**Limit:** rare/missable acquisition becomes frustrating if causal requirements are unknowable.

### E. Side systems should feed the main world

Chocobo breeding is not isolated amusement: it grants traversal and rare Materia.

**Borrow:** hobbies/professions/minigames should produce capabilities, relationships, resources or access that matter elsewhere in the world.

### F. Traversal progression should reinterpret remembered geography

Gold chocobos make old barriers newly crossable.

**Borrow:** new tools/vehicles/status/permissions should encourage players to reconsider previously visited places.

### G. Separate convenience from simulation law

3× speed is largely a presentation/time tool; encounter suppression and battle enhancement materially change risk/resource economics.

**Borrow:** label accessibility/convenience options according to what they actually change.

### H. Relationship mechanics can live in shared action

Rebirth's Synergy systems make relationships visible as cooperative capability.

**Borrow:** trust/familiarity should sometimes unlock **things people can do together**, not only numerical affinity.

### I. A remake need not preserve interaction modality to preserve design ideas

Remake retains ATB as a strategic resource while surrounding it with real-time action.

**Borrow:** distinguish a concept's underlying purpose from its old control scheme.

### J. Beware port evidence when evaluating game design

The 2026 Steam aggregate includes criticisms of the current client, although their quantitative contribution was not measured.

**Borrow for research process:** always separate **artifact quality** (port/client/UI/performance) from **underlying system quality**.

## 28. Preservation and requirement audit

No prior FFVII-specific game/mechanics/dossier owner existed on this branch before G84, so this dossier is additive. It does not replace an older FFVII research chapter. The corrective pass retains all four original interaction sketches and FFVII01–33, expanding rather than substituting the original and remake comparison.

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2, 30 |
| R02 player actions / major mechanics | §§3–18, 26, 30 |
| R03 items / entities / composition | §§3–8, 11–13, 26, 30 |
| R04 progression / economy / time | §§4, 7, 11–12, 17, 30 |
| R05 concrete interactions | §§6, 11–12, 16; complete cases in §30 |
| R06 people / AI / social / multiplayer | §§7, 13–15, 26, 30 |
| R07 art / audio / interface / feel | §§2, 18, 22–24, 30 |
| R08 story / narrative / play | §§10, 13–15, 23–25 |
| R09 production / development | §§18–19 |
| R10 marketing / distribution / virality | §20 |
| R11 commercial / participation | §§20, 22 |
| R12 reviews / player feedback | §§21–24, with sample limits retained |
| R13 transferable inspiration / limits | §§27, 30 |
| R14 sources / viewing / preservation / navigation | §§2, 28, 30 + annotated sources |

### Evidence limits

- The 1997 game, old PC build, 2013 Steam edition and 2026 PC re-release are kept separate where relevant.
- Remake/Rebirth/Revelation are not backfilled into original mechanics.
- Five independent substantive reviews of the original/ports were inspected in the original pass; this repair does not claim a fresh reading of every inherited review.
- Steam review evidence is self-selected and confounded by the February 2026 client replacement. It does not establish quantitative causal attribution for the aggregate.
- The 15.5-million sales figure is Square Enix's current claim for the 1997 original across its releases.
- Revelation is unreleased; only officially published facts are included.
- No claim depends on unwatched video footage. Future visual-study targets include Midgar's pre-rendered navigation, field→FMV transitions, linked Materia UI, Gold Saucer activity transitions, chocobo traversal, original vs Remake ATB feedback, Rebirth Synergy presentation and Queen's Blood's territory/score indicators.

## 29. Completion conclusion

The original FFVII's strongest systems contribution is the deliberate separation of **person**, **equipment**, and **portable capability**.

Materia says that many abilities belong to objects and can move between people. AP says those objects can themselves learn/grow. Equipment topology says context changes how capabilities compose. Limit Breaks then reassert that people are not interchangeable.

Around that combat core, chocobo breeding and Gold Saucer show how side systems can feed traversal and build power, while the world map repeatedly expands the player's geographic agency.

For OpenLegend, the highest-value lesson is:

> **Let capability move through the world—through people, objects, teaching and discovery—without letting mobility of skill erase the causal identity of the person using it.**

## 30. Operative minigames, substantive remake contrast and complete situations

**Corrective research, September 26, 2026.** These rules are edition-labeled. The cases are constructed illustrations, not personal gameplay tests. They close the audit's R02–R05 deficiencies without treating every remake system as a 1997 feature.

### Original Battle Square: earned currency can be locally temporary

Entry costs 10 GP. One selected character fights up to eight rounds, choosing whether to continue between victories. Continuing adds a slot-selected handicap. Quitting safely or completing the sequence earns BP; defeat forfeits that attempt's points. BP purchases prizes such as Omnislash, but leaving Battle Square clears the accumulated balance. It is not a permanent account currency. The arena also does not award ordinary EXP/AP or permanently teach Enemy Skills, despite using familiar battle presentation. [FFVII34](#ffvii34)

### Original Fort Condor: funding, composition and a fallback battle

The player finances and positions a force, then directs it against troops climbing toward the reactor. Attackers counter Beasts, Defenders counter Barbarians and Shooters counter Wyverns; each has a corresponding weakness. Workers place explosives, Repairers sustain allies, and fixed artillery trades mobility for area coverage. An impressive army can still fail if its composition or placement is wrong. These are bounded minigame units, not newly recruitable members of Cloud's ordinary party. [FFVII36](#ffvii36)

The game's own dialogue offers either direct participation or financial help. Clearing the attackers or defeating their commander wins the strategic encounter; an enemy reaching the shed instead triggers a direct party battle. Thus a breached defense is a change of control scale, not automatically the ordinary game-over screen. Later story use of the location is distinct from repeated earlier optional visits. The similarly named board games in INTERmission/Rebirth must not supply rules for this original activity. [FFVII35](#ffvii35)

### Remake: create an opening, then exploit it

**Pressure is not stagger.** Pressure is an enemy-specific temporary opportunity in which suitable actions fill the stagger gauge more effectively. Filling that gauge produces the larger vulnerability window. Assess can explain relevant conditions; elemental weaknesses, interrupted attacks, defended actions and destroyed parts do not all pressure every enemy identically. A move valuable for building stagger need not be the highest-damage move once stagger begins. [FFVII38](#ffvii38)

Weapons add a learning axis beyond original Materia AP: using a weapon's ability increases its proficiency until the wielder can use it with another weapon. Spending SP to improve a weapon's statistics or Materia capacity is a different operation. Classic mode can automate ordinary actions while leaving ATB spending to the player; direct intervention remains possible. These options separate learned technique, equipped object and motor-control assistance rather than combining them into one “level.” [FFVII37](#ffvii37)

**Hard Mode** changes expedition planning as well as enemy strength: items are unavailable and benches restore HP but not MP. Manuscripts from specified encounters and expanded simulator challenges provide further goals. Chapter Select governs entering this difficulty; it is not an unrestricted mid-fight switch. The guide's proposed maximum-level preparation is advice, not a universal eligibility condition. These are Remake rules; Rebirth's Cushion exception is not imported backward. [FFVII40](#ffvii40) [FFVII43](#ffvii43)

### Rebirth: two kinds of synergy and a separate growth interface

**Synergy Skills** are real-time paired actions, accessed through the defensive shortcut interface—R1 plus an assigned button in the documented PlayStation controls. They do not consume ATB. Availability depends on the participating characters, so “free” is not “usable by anyone at any time.” [FFVII42](#ffvii42)

**Synergy Abilities** require qualifying ATB actions to build the participating characters' charges. Their consequences extend beyond a cinematic hit: Cloud/Tifa's Relentless Rush can extend an existing stagger, whereas other pairs affect Limit access. Folio spending supplies character upgrades and additional paired actions; it can be reallocated. Weapon passives and learned weapon techniques remain separate from that growth interface. The reviewed benefit is coordinated timing, not merely making two attack animations overlap. [FFVII41](#ffvii41)

### Rebirth: craft knowledge is not character combat level

Broden supplies the Item Transmuter early in Chapter 2. Materials and craftsmanship gate recipes; making a recipe for the first time earns crafting EXP, so repeatedly producing one familiar consumable is not an unlimited leveling loop. Transmuter Chips add recipes obtained through exploration and other activities. The inspected reference includes incomplete tables, so this dossier uses its operative rules rather than copying questionable or placeholder recipes. [FFVII43](#ffvii43)

For example, the first armor-upgrade chip comes from Grasslands excavation and unlocks improvements to early armor. A discovery therefore changes what existing possessions can become. It does not grant the missing materials or automatically perform the upgrade. The broader chip page contains obvious repeated placeholder rows for unrelated objects; those are explicitly excluded from this account. [FFVII45](#ffvii45)

### Rebirth: Queen's Blood is territory, deck composition and lane scoring

The ordinary game uses a fifteen-card deck and a three-by-five board. A card needs a friendly position with sufficient pawn rank; its pattern changes future placement opportunities, while special effects can enhance, weaken or replace cards. After play ends, a player receives the score from lanes they win, not automatically every point they placed. Consequently, winning more lanes is not itself the scoring objective. NPC victories and card acquisition provide a progression route separate from battle equipment. [FFVII44](#ffvii44)

**Interpretation:** these revisions preserve the broad idea of connected activities while changing the ownership of progress. Original Materia grows as a transferable object; Remake adds a character's retained weapon technique; Rebirth adds paired readiness and a separately learned production repertoire. A comparison that only says “more action and bigger regions” misses those different decisions.

### A. Original Elemental: placement chooses the intended protection

**Intention:** survive a known elemental threat. **Conditions:** compatible Materia and linked armor slots are available. **Actions:** move the Elemental pair from offensive gear into armor and inspect its attained level. **Interaction/result:** the same objects now modify incoming damage rather than ordinary attacks. **Next decision:** retain that defense or sacrifice it for another encounter's need. **Limit:** lower development does not grant the strongest absorption effect, and unlinked slots do not establish the relationship. This completes §16's first sketch. [FFVII11](#ffvii11)

### B. Original learning: the recipient matters as much as the source

**Intention:** acquire a learnable enemy action. **Conditions:** the creature is manipulable and the intended recipient carries Enemy Skill. **Actions:** control the creature and direct the suitable move onto that recipient. **Interaction/result:** the particular Materia records the ability. **Next decision:** transfer the trained object or keep building its repertoire. **Limit:** another copy is not automatically taught, and an arbitrary enemy move is not necessarily learnable. This completes §16's second sketch without presenting a generic successful control attempt as guaranteed. [FFVII12](#ffvii12)

### C. Original training gear: accelerated learning has a present cost

**Intention:** mature important Materia before a difficult encounter. **Conditions:** growth-boosting gear and a manageable source of AP exist. **Actions:** equip the training loadout, earn AP, then move the developed Materia into the intended combat configuration. **Interaction/result:** weaker immediate equipment can create future capability. **Next decision:** train another object or stop preparing. **Limit:** fewer slots, lost links or reduced survival can negate the practical advantage; no-growth equipment does not secretly train its sockets. This completes §16's third sketch. [FFVII10](#ffvii10)

### D. Original breeding: a traversal reward still needs a route

**Intention:** reach the island holding Knights of Round. **Conditions:** the breeding chain has produced a gold chocobo. **Actions:** locate the otherwise inaccessible island and ride across the relevant terrain to claim the Materia. **Interaction/result:** husbandry and racing preparation become geographic access, then combat power. **Next decision:** equip and develop the new option or pursue another cave. **Limit:** owning the bird does not automatically reveal every destination or remove the summon's use costs. This completes §16's fourth sketch. [FFVII16](#ffvii16)

### E. Original arena: stop safely, then spend before leaving

**Intention:** earn a desired BP prize. **Conditions:** a solo attempt has accumulated points but acquired a damaging handicap. **Actions:** choose a safe between-round exit and redeem the balance locally. **Interaction/result:** restraint preserves an attempt's payout. **Next decision:** reenter or leave. **Limit:** leaving the venue before spending clears the balance; surviving a single round is not the same as banking permanent wealth. [FFVII34](#ffvii34)

### F. Original defense: an opening can demand a new kind of control

**Intention:** protect the fort. **Conditions:** purchased defenders are losing ground near the shed. **Actions:** redirect suitable units; if the line breaks, confront the commander with the ordinary party. **Interaction/result:** tactical failure changes the action system rather than instantly deleting the campaign. **Next decision:** improve the next deployment or fund defenders while traveling. **Limit:** a strong party is not evidence that its mercenary formation was effective; repeated failures have their own consequences. [FFVII35](#ffvii35) [FFVII36](#ffvii36)

### G. Remake Sweeper: damage is not the only value of a spell

**Intention:** make a dangerous machine vulnerable. **Conditions:** Lightning and sufficient ATB/MP are available. **Actions:** use Thunder to pressure the Sweeper, spend the short window on Focused Thrust, then switch to damage once staggered. **Interaction/result:** one action changes the usefulness of another. **Next decision:** exploit the opening or rescue a bound ally by changing controlled characters. **Limit:** the window expires and the same elemental plan does not pressure every enemy. [FFVII39](#ffvii39)

### H. Remake Hard Mode: recovery now competes with resources later

**Intention:** reach a chapter's later fight with enough MP. **Conditions:** the party is injured and a bench or non-MP healing action is available. **Actions:** use the appropriate recovery instead of automatically casting another costly heal. **Interaction/result:** mode restrictions change the value of an ordinary rest stop and the equipped Materia. **Next decision:** spend MP on a necessary weakness or preserve it. **Limit:** avoiding all expenditure can cause defeat now; no-item rules do not make every encounter safely avoidable. [FFVII40](#ffvii40)

### I. Rebirth cooperation: spending earlier creates a later joint option

**Intention:** extend a useful stagger window. **Conditions:** Cloud and Tifa have earned the charges for Relentless Rush. **Actions:** trigger the paired ability during stagger rather than solely because it is ready. **Interaction/result:** earlier individual actions enable a shared timing benefit. **Next decision:** exploit the extension or recover. **Limit:** the partner and charges must be available; a Synergy Skill shortcut is not interchangeable with this charged ability. [FFVII41](#ffvii41) [FFVII42](#ffvii42)

### J. Rebirth crafting: diversity of production teaches more than repetition

**Intention:** unlock additional recipes. **Conditions:** several unmade recipes and materials are available. **Actions:** make useful new outputs rather than endlessly repeating one known item. **Interaction/result:** first-time crafting develops the separate craftsmanship track. **Next decision:** gather a missing ingredient or seek a chip. **Limit:** character EXP and raw money do not automatically satisfy every crafting requirement; consuming rare material for novelty can conflict with a more urgent recipe. [FFVII43](#ffvii43)

### K. Rebirth cards: a larger local lead can be the wrong investment

**Intention:** win the total Queen's Blood score. **Conditions:** one lane is already secure while another could change hands. **Actions:** compare the end-of-game lane totals before placing the next card. **Interaction/result:** strengthening the right lane can matter more than maximizing one card's raw power. **Next decision:** commit or pass. **Limit:** card abilities and remaining moves can change the result; the board is not scored by simply counting captured spaces. [FFVII44](#ffvii44)

**Transfer limits:** these cases demonstrate several forms of connected design, not a recommendation to copy their exact currencies, slots or scripted exceptions. An interface needs to disclose the actual persistence rule: an arena balance, a learned technique, a crafting level and temporary paired readiness should not look like interchangeable kinds of progress. The original and remake comparison is now substantive; it does not certify unseen footage, every current patch statistic or five separate reviews for every edition.

## Sources — annotated set

<a id="ffvii01"></a>**FFVII01 — [Final Fantasy VII — 1997 Developer Interviews](https://shmuplations.com/ff7/).** Shmuplations translation/collation of contemporary Japanese interviews with Sakaguchi, Kitase, Nomura, Naora, Narita, Uematsu and other leads. Primary-era testimony via secondary translation. Used for Materia/Limit intent, Cloud-as-protagonist decision, 3D/CD-ROM production and team structure.

<a id="ffvii02"></a>**FFVII02 — [Final Fantasy VII PC Review](https://www.gamespot.com/reviews/final-fantasy-vii-review/1900-2536027/).** Ron Dulin, GameSpot, 1998-07-07. Historical PC-port technical critique plus contemporary marketing recollection.

<a id="ffvii03"></a>**FFVII03 — [New Final Fantasy VII PC Version Released on Steam, GOG.com](https://rpgamer.com/2026/02/new-final-fantasy-vii-pc-version-released-on-steam-gog-com/).** RPGamer, 2026-02-24/25. Current re-release date, replacement/free-upgrade behavior, incompatible saves and added QoL features.

<a id="ffvii04"></a>**FFVII04 — [FINAL FANTASY VII on Steam](https://store.steampowered.com/app/3837340/).** Valve/Square Enix, inspected 2026-09-26. Current storefront, official “no story changes” statement, re-release features, single-player status and dynamic review aggregate.

<a id="ffvii05"></a>**FFVII05 — [Final Fantasy VII Remake product description](https://eu.store.square-enix-games.com/final-fantasy-vii-remake).** Square Enix. Official scope: first remake-series game covers through escape from Midgar and expands that material into a standalone game.

<a id="ffvii06"></a>**FFVII06 — [FINAL FANTASY VII REVELATION releases April 8, 2027](https://na.finalfantasy.com/news/2840).** Square Enix / Final Fantasy Portal, 2026-09-03. Official current finale title, date, platforms and high-level published scope.

<a id="ffvii07"></a>**FFVII07 — [Final Fantasy VII Materia](https://strategywiki.org/wiki/Final_Fantasy_VII/Materia).** StrategyWiki community mechanics reference for Materia categories, acquisition and rare Materia.

<a id="ffvii08"></a>**FFVII08 — [Final Fantasy VII Command Materia](https://strategywiki.org/wiki/Final_Fantasy_VII/Command_Materia).** StrategyWiki. Command-grant behavior such as Mime, Steal, Manipulate and other portable commands.

<a id="ffvii09"></a>**FFVII09 — [Final Fantasy VII Training](https://strategywiki.org/wiki/Final_Fantasy_VII/Training).** StrategyWiki. AP/Limit progression and training reference.

<a id="ffvii10"></a>**FFVII10 — [Final Fantasy VII Weapons](https://strategywiki.org/wiki/Final_Fantasy_VII/Weapons).** StrategyWiki. Character weapon restrictions, slot/growth tradeoffs, double/triple-growth gear and ultimate-weapon properties.

<a id="ffvii11"></a>**FFVII11 — [Final Fantasy VII Support Materia](https://strategywiki.org/wiki/Final_Fantasy_VII/Support_Materia).** StrategyWiki. Linked-slot composition rules and examples including Elemental, Added Effect, absorb/counter/final-action modifiers.

<a id="ffvii12"></a>**FFVII12 — [Final Fantasy VII Enemy Skills](https://strategywiki.org/wiki/Final_Fantasy_VII/Enemy_Skills).** StrategyWiki. Target-to-learn behavior, Manipulate interactions and individual Enemy Skill Materia repertoires.

<a id="ffvii13"></a>**FFVII13 — [Final Fantasy VII Limit Breaks](https://strategywiki.org/wiki/Final_Fantasy_VII/Limit_Breaks).** StrategyWiki. Limit-gauge conditions, progression patterns, Fury/Sadness and character-specific Limit structures.

<a id="ffvii14"></a>**FFVII14 — [Final Fantasy VII Accessories](https://strategywiki.org/wiki/Final_Fantasy_VII/Accessories).** StrategyWiki. Accessory effects and encounter/build-specific equipment layer.

<a id="ffvii15"></a>**FFVII15 — [Final Fantasy VII Basic combat](https://strategywiki.org/wiki/Final_Fantasy_VII/Basic_combat).** StrategyWiki. ATB/Limit timing and party-composition basics.

<a id="ffvii16"></a>**FFVII16 — [Final Fantasy VII Chocobos](https://strategywiki.org/wiki/Final_Fantasy_VII/Chocobos).** StrategyWiki. Breeding, racing, terrain permissions and Materia-cave rewards.

<a id="ffvii17"></a>**FFVII17 — [Final Fantasy VII Walkthrough / minigame index](https://strategywiki.org/wiki/Final_Fantasy_VII/Walkthrough) and [Gold Saucer](https://strategywiki.org/wiki/Final_Fantasy_VII/Gold_Saucer).** StrategyWiki. Activity inventory and GP/BP/minigame context.

<a id="ffvii18"></a>**FFVII18 — [Final Fantasy VII Items](https://strategywiki.org/wiki/Final_Fantasy_VII/Items) plus walkthrough appendices.** StrategyWiki. Final Limit manuals and optional-progression item references.

<a id="ffvii19"></a>**FFVII19 — [Yoshinori Kitase on creating Final Fantasy VII](https://blog.playstation.com/?p=353736).** PlayStation Blog, 2021. Developer retrospective emphasizing Materia's player-controlled abilities and Vincent as an optional recruit.

<a id="ffvii20"></a>**FFVII20 — [FINAL FANTASY VII REBIRTH — Latest Updates Vol. 1](https://www.square-enix.com/asia/newsportal/en/topics/ffvii-rebirth/post26.html).** Square Enix Asia, 2026-04-10. Primary current source stating the 1997 original has sold **over 15.5 million copies worldwide**. The corrective pass also inspected its written battle/synergy descriptions; embedded media was not watched.

<a id="ffvii21"></a>**FFVII21 — [Final Fantasy VII Review](https://www.gamespot.com/reviews/final-fantasy-vii-review/1900-2547583/).** Greg Kasavin, GameSpot, 1997-09-29. Contemporary PlayStation review; one of the five independent review publications.

<a id="ffvii22"></a>**FFVII22 — [Final Fantasy VII Review](https://www.rpgfan.com/review/final-fantasy-vii/).** Ken Chu, RPGFan, 1998-09-22. Early retrospective PlayStation review; one of five independent review publications.

<a id="ffvii23"></a>**FFVII23 — [Final Fantasy VII Review (PS4)](https://www.pushsquare.com/reviews/ps4/final_fantasy_vii).** Robert Ramsey, Push Square, 2015-12-13. Materia/ATB/cast strengths and aging visuals/navigation; one of five independent reviews.

<a id="ffvii24"></a>**FFVII24 — [Final Fantasy VII Review (Switch)](https://www.nintendolife.com/reviews/switch-eshop/final_fantasy_vii).** Mitch Vogel, Nintendo Life, 2019-04-02. Modern-port retrospective and speed/encounter-friction evidence; one of five independent reviews.

<a id="ffvii25"></a>**FFVII25 — [Final Fantasy VII — a classic RPG, but not a classic port](https://www.pocketgamer.com/final-fantasy-vii/review/).** Harry Slater, Pocket Gamer, 2015-08-25. iOS-port review; one of five independent reviews.

<a id="ffvii26"></a>**FFVII26 — [FINAL FANTASY VII most-helpful Steam reviews](https://steamcommunity.com/app/3837340/reviews/?browsefilter=toprated&l=english).** Steam user reviews, inspected 2026-09-26. Current qualitative positive/negative evidence, especially port/filtering/launcher/modding criticism. Self-selected and patch-sensitive.

<a id="ffvii27"></a>**FFVII27 — [FINAL FANTASY VII positive helpful Steam reviews](https://steamcommunity.com/app/3837340/positivereviews/?browsefilter=toprated&l=english).** Steam user reviews, inspected 2026-09-26. Positive current client/QoL/control and underlying-game testimony; self-selected.

<a id="ffvii28"></a>**FFVII28 — [Square Enix dives deep into Final Fantasy VII Remake gameplay](https://blog.playstation.com/2019/06/10/square-enix-dives-deep-into-final-fantasy-vii-remake-gameplay/).** PlayStation Blog / Square Enix presentation, 2019. Remake's real-time combat, revamped ATB and Tactical Mode.

<a id="ffvii29"></a>**FFVII29 — [Final Fantasy VII Remake summons](https://blog.playstation.com/2019/09/24/final-fantasy-vii-remake-box-art-revealed/).** PlayStation Blog, 2019. Remake summon-gauge and on-field summon behavior.

<a id="ffvii30"></a>**FFVII30 — [Final Fantasy VII Remake Review](https://www.pushsquare.com/reviews/ps4/final-fantasy-vii-remake).** Push Square, original 2020 review republished 2022. Independent reception evidence for combat/character expansion versus sidequest/level-design/narrative tradeoffs.

<a id="ffvii31"></a>**FFVII31 — [FINAL FANTASY VII REBIRTH world](https://ffvii.square-enix-games.com/en-us/games/rebirth) and [regions](https://ffvii.square-enix-games.com/en-gb/games/rebirth/world).** Square Enix. Official region-based world/traversal context.

<a id="ffvii32"></a>**FFVII32 — [Final Fantasy VII Rebirth developer interview](https://blog.playstation.com/?p=384274).** PlayStation Blog, 2023. Director Naoki Hamaguchi on Synergy moves, character bonds, skill trees and new Materia.

<a id="ffvii33"></a>**FFVII33 — [Final Fantasy VII Rebirth Review](https://www.rpgfan.com/review/final-fantasy-vii-rebirth/).** Zach Wilkerson, RPGFan, 2024-02-22. Independent reception evidence for regional exploration, combat, character writing, minigames and divisive narrative/visual issues.

<a id="ffvii34"></a>**FFVII34 — [Battle Square](https://finalfantasy.fandom.com/wiki/Battle_Square).** Community mechanics reference; substantive indexed rules read September 26, 2026 after direct retrieval failed. Entry, rounds, handicaps, reward/reset and learning exclusions; no personally tested odds.

<a id="ffvii35"></a>**FFVII35 — [Fort Condor script](https://www.yinza.com/Fandom/Script/11.html).** Original game text transcribed by Yinza; funding, unit instructions and breach/result dialogue read September 26, 2026. Primary text via transcription, not footage watched. Awkward localization is not interpreted as an aircraft-simulation claim.

<a id="ffvii36"></a>**FFVII36 — [The Battle(s) of Fort Condor](https://www.cavesofnarshe.com/ff7/condor.php).** Zephir, Caves of Narshe; substantive indexed operative rules read September 26, 2026 after direct retrieval failed. Composition and placement, not mandatory adoption of the guide's favored strategy.

<a id="ffvii37"></a>**FFVII37 — [Remake weapon abilities and Classic mode](https://blog.playstation.com/archive/2019/11/25/new-final-fantasy-vii-remake-screens-feature-moogles-weapon-abilities-materia-mini-games-and-more/).** Square Enix-supplied explanations hosted by PlayStation Blog, November 25, 2019; relevant full text read September 26, 2026. Old planned release date and changed author-profile affiliation are not game facts.

<a id="ffvii38"></a>**FFVII38 — [Stagger in Remake](https://finalfantasy.fandom.com/wiki/Stagger_(VII_Remake)).** Community rules reference; pressure/conditions/intel paragraphs read September 26, 2026. No reconstruction of every hidden formula or personal timing test.

<a id="ffvii39"></a>**FFVII39 — [Sweeper in Remake](https://finalfantasy.fandom.com/wiki/Sweeper_(VII_Remake)).** Community encounter reference; Thunder, Focused Thrust and binding passages read September 26, 2026. Specific example, not a universal enemy solution.

<a id="ffvii40"></a>**FFVII40 — [Remake Hard Mode guide](https://game8.co/games/FF7-Remake/archives/286622).** Authored Game8 guide; substantive indexed restrictions, recovery and reward text read September 26, 2026 after direct access failed. Recommended levels/builds are not requirements; INTERmission/Rebirth rules remain separate.

<a id="ffvii41"></a>**FFVII41 — [Rebirth: Destiny's Child review](https://www.gamespot.com/reviews/final-fantasy-7-rebirth-review-destinys-child/1900-6418187/).** Tamoor Hussain, GameSpot, February 22, 2024; substantive synergy and growth passages read September 26, 2026. “Only way” strategy rhetoric is not adopted as necessity. This is supplementary remake evidence, not another original-game review.

<a id="ffvii42"></a>**FFVII42 — [Synergy Skills and controls](https://game8.co/games/Final-Fantasy-VII-Rebirth/archives/Skill-Trees-Synergy-Skills).** Game8, March 10, 2024; substantive indexed controls/no-ATB text read September 26, 2026 after direct failure. PlayStation bindings are not universal keyboard mappings.

<a id="ffvii43"></a>**FFVII43 — [Rebirth items and transmutation](https://gamefaqs.gamespot.com/ps5/371123-final-fantasy-vii-rebirth/faqs/81141/items).** Uta, guide v0.8.6, January 26, 2025; operative acquisition/crafting/restriction text read September 26, 2026. Incomplete or contradictory numerical recipe rows are not copied as certified values.

<a id="ffvii44"></a>**FFVII44 — [Queen's Blood tips](https://www.gamespot.com/gallery/final-fantasy-7-rebirth-queens-blood-tips-guide/2900-5133/).** Jason Rodriguez, GameSpot, March 2, 2024; written board, rank, effects and scoring rules read September 26, 2026. The “five decks in hand” typo is not adopted; no screenshot position is claimed personally reproduced.

<a id="ffvii45"></a>**FFVII45 — [Transmuter Chips](https://gamefaqs.gamespot.com/ps5/371123-final-fantasy-vii-rebirth/faqs/81141/transmuter-chip).** Uta, guide v0.8.6; introductory mechanism and first armor-chip entry read September 26, 2026. Repeated placeholder entries for later/key items are excluded. The recipe-unlock concept is not unrestricted material fabrication.

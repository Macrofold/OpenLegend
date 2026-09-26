# Final Fantasy X — full research dossier

**G87 · Complete research pass, September 26, 2026.** Primary mechanics baseline: the 2001 PlayStation 2 *Final Fantasy X*. The International/PAL content line and *Final Fantasy X/X-2 HD Remaster* are separated where they add the Expert Sphere Grid, Dark Aeons/Penance, presentation changes or platform-specific boosters. *Final Fantasy X-2* is covered substantively as a direct-sequel contrast rather than substituted for FFX's mechanics. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

No personal playthrough is claimed. Concrete situations are reconstructed from documented rules, primary developer interviews, written reviews and version-specific reference material.

## 1. Identity, scope and player promise

*Final Fantasy X* is Square's 2001 PlayStation 2 role-playing game about Tidus, a blitzball star displaced into the world of Spira, and Yuna, a summoner undertaking a religious pilgrimage to defeat the recurring catastrophe Sin.

Mechanically, FFX makes three unusually clean breaks from the preceding run of games:

1. **Conditional Turn-Based Battle (CTB)** replaces Active Time Battle.
2. **The Sphere Grid** replaces ordinary automatic level-up growth with player-directed movement through a visible board.
3. **Aeons remain on the battlefield** as controllable entities rather than appearing for one summon animation.

It also removes the traditional interactive overworld map and builds the journey as a mostly continuous route through full-scale 3D spaces.

Producer/director Yoshinori Kitase has said these changes were deliberate attempts to create a new format for the new hardware generation: the battle team wanted greater strategic depth than ATB, and the Sphere Grid was inspired by the tactile feeling of moving pieces and filling a board. [FFX01](#ffx01)

The game's core promise is therefore:

> **A linear pilgrimage can still support highly tactical moment-to-moment choice if the player can see causality, manipulate turn order, rotate specialists and direct long-term growth.**

## 2. Version boundaries

### 2.1 2001 PlayStation 2 original

The Japanese and North American launch versions establish the base design:
- CTB;
- standard Sphere Grid;
- party switching;
- Overdrives;
- Aeons;
- equipment customization;
- Blitzball;
- Cloisters of Trials;
- Monster Arena;
- Celestial Weapons and other side content.

### 2.2 International / PAL branch

*Final Fantasy X International* and corresponding PAL-era content add important systems/content such as:
- an optional **Expert Sphere Grid**;
- Dark Aeons;
- Penance;
- additional balance/content changes.

Those are not silently projected into every 2001 release. [FFX02](#ffx02) [FFX03](#ffx03)

### 2.3 HD Remaster

The HD Remaster first arrived on PS3/Vita and later PS4, PC, Switch, Xbox One and, in July 2026, Switch 2. [FFX04](#ffx04) [FFX05](#ffx05)

It incorporates International-version content and modern presentation:
- higher-resolution models/environment work;
- rearranged soundtrack alongside later original-music choice on some platforms;
- trophies/achievements;
- cross-platform/version-specific save features;
- PC/modern-platform convenience or boost options depending release.

The Steam package also includes X-2 and related bonus material, so its user-review score is **package-level evidence**, not a pure FFX-only measure. [FFX06](#ffx06)

### 2.4 Direct sequel boundary

*Final Fantasy X-2* uses the same world and many locations but rewrites the core game architecture:
- mission-based/nonlinear exploration;
- three primary playable heroines;
- fast ATB rather than CTB;
- Dresspheres/jobs that can be switched during battle;
- Garment Grids that constrain available Dresspheres and can grant gate bonuses;
- AP-based Dressphere ability mastery;
- no FFX Sphere Grid progression. [FFX07](#ffx07) [FFX08](#ffx08)

This contrast is treated in detail in §23.

## 3. Conditional Turn-Based Battle makes time inspectable

FFX abandons the real-time pressure of ATB for a system where battle pauses for player decisions.

A visible turn list shows upcoming actions. Turn order changes based on:
- Agility;
- Haste/Slow;
- Delay attacks;
- action recovery cost;
- certain abilities and enemy behaviors. [FFX09](#ffx09)

The key design move is not merely “turn based.” It is that **future causality is visible**.

A player can inspect:
- who acts next;
- whether choosing a fast action preserves another near-term turn;
- whether a heavy action pushes the acting character back;
- whether delaying an enemy creates a safe healing window.

Nintendo Life's modern review describes this directly: hovering/choosing actions changes the future turn schedule, letting the player plan several actions ahead. [FFX10](#ffx10)

### Why it matters for OpenLegend

A simulation can be complex without being opaque.

If the game exposes:
- likely consequences;
- action duration;
- who can respond;
- resource cost;

then players can reason about the world rather than guessing at hidden scheduler behavior.

## 4. Mid-battle party switching is itself a tactical action

Only three party members are on the field, but a benched member can replace an active character during that character's turn and act immediately without spending an extra turn. [FFX10](#ffx10)

This creates a fundamentally different party model from “choose three before battle.”

The question becomes:

> **Who should take this particular action?**

Examples:
- Wakka handles flying enemies with high accuracy/range.
- Auron pierces armored targets.
- Lulu exploits elemental weaknesses.
- Tidus handles fast enemies and turn manipulation.
- Yuna heals/summons.
- Rikku uses items, Steal/Use and later equipment customization.
- Kimahri can move into hybrid roles.

Enemy composition itself teaches this role grammar.

The system also helps keep the entire cast involved because characters earn AP by participating in battle. Switching someone in for a meaningful action keeps them progressing.

**OpenLegend pattern:** when multiple agents are nearby, assigning the next task to the best-suited person can itself be a core strategic decision.

## 5. Sphere Grid: progression as movement through capability space

Characters earn AP after participating in battles. Enough AP yields Sphere Levels, which are spent to move a character marker around the Sphere Grid. Spheres obtained from enemies, treasure and events activate nearby nodes. [FFX11](#ffx11) [FFX12](#ffx12)

Node types include:
- HP/MP;
- Strength/Defense;
- Magic/Magic Defense;
- Agility/Accuracy/Evasion/Luck;
- skills;
- special abilities;
- White Magic;
- Black Magic.

Key Spheres unlock gated paths. Other spheres can:
- jump to another character's position;
- return to prior areas;
- teleport to activated nodes;
- create new stat nodes;
- clear nodes in advanced optimization. [FFX12](#ffx12)

### Standard Grid

Characters begin in areas designed around recognizable combat roles.

Examples:
- Tidus → speed/time support;
- Yuna → White Magic/summoner;
- Lulu → Black Magic;
- Auron → physical armor-breaking;
- Wakka → accuracy/status;
- Rikku → item/speed utility.

Eventually, paths intersect and advanced players can move characters beyond those starting roles.

### Expert Grid

International/HD versions can offer an Expert Grid in which characters start more centrally and can branch much earlier, trading onboarding clarity for build freedom. [FFX02](#ffx02)

This is a useful staged-freedom design:
- **default path:** strong identity and understandable onboarding;
- **later path crossing:** self-authorship;
- **expert option:** early flexibility for returning players.

## 6. Progression requires two resources, not one

Sphere Grid advancement separates:

1. **movement capacity** — Sphere Levels earned through AP;
2. **node activation materials** — Power, Mana, Speed, Ability and rarer sphere items.

This means “I leveled” does not automatically equal “my stats changed.”

The player needs:
- enough movement;
- the right activation spheres;
- access past locks;
- a path decision.

That creates more agency but also more interface burden.

The system becomes especially deep in endgame optimization when players can use Clear/attribute spheres to rebuild the grid for superboss statistics. [FFX03](#ffx03)

## 7. Character identity is strong early and porous late

FFX's combat onboarding relies on clear specialists, but the Sphere Grid means most ordinary abilities/stat roles are not permanently exclusive.

Over time:
- Yuna can enter physical paths;
- Auron can learn healing;
- Tidus can reach Black Magic;
- characters can eventually traverse large portions of one another's grid.

Exceptions preserve identity:
- Overdrives remain character-specific;
- Yuna alone summons Aeons;
- Kimahri alone converts Lancet on specific enemies into Ronso Rage Overdrives;
- weapons remain character-specific families;
- narrative/social roles remain authored.

This is another useful answer to the “shared learning vs individual identity” problem seen across FFV–IX:

> **Let people learn beyond their starting role, but keep some capabilities tied to unique history, body, relationship or responsibility.**

## 8. Overdrives make personal identity interactive

Each character has a distinct Overdrive:

- **Tidus — Swordplay:** timing minigame; learns additional moves through repeated use.
- **Yuna — Grand Summon:** brings an Aeon in with a full Overdrive gauge.
- **Auron — Bushido:** timed button sequences; techniques are learned partly through Jecht Spheres.
- **Wakka — Slots:** reel-based outcomes; new Slots are tied to Blitzball progression.
- **Lulu — Fury:** analog-stick input determines repeated spell casts.
- **Kimahri — Ronso Rage:** learns enemy techniques through Lancet.
- **Rikku — Mix:** combines two inventory items into special effects. [FFX13](#ffx13)

Overdrive **Modes** also change how the gauge fills based on behavior/conditions.

This creates two layers of characterization:
- what the person's ultimate move does;
- what kinds of behavior make that person reach a heightened state.

For OpenLegend, the latter is especially interesting: emotional/adrenaline/resource states can fill under **different triggers for different people**.

## 9. Rikku's Mix turns the item inventory into a combinatorial system

Rikku's Mix combines two inventory items to produce a new effect.

The larger inventory therefore becomes:
- recovery stock;
- equipment-customization material;
- bribery/resource input;
- Mix recipe space.

This is a strong example of **one resource family serving multiple systems**.

The benefit:
- item knowledge becomes expertise.

The risk:
- hundreds of possible combinations are difficult to discover naturally.

Modern challenge-run documentation shows how powerful item-based play can become: even severe No-Sphere-Grid/No-Summon/No-Overdrive runs rely heavily on carefully sourced items and Rikku's Use toolkit. [FFX14](#ffx14)

## 10. Equipment is defined by abilities, then becomes customizable

Weapons and armor are character-specific families but are primarily distinguished by **Auto-Abilities**, not a single conventional attack/defense tier.

Examples include:
- elemental strikes/wards;
- status infliction/resistance;
- Counter;
- First Strike;
- AP multipliers;
- Overdrive→AP;
- Half/One MP Cost;
- Break Damage Limit. [FFX15](#ffx15)

After Rikku joins, the Customize menu lets the player consume items to add eligible abilities to empty equipment slots. [FFX15](#ffx15)

So an item can be:
- used directly;
- Mixed;
- spent to customize equipment.

This makes treasure acquisition relevant across several planning layers.

## 11. Aeons become controllable party substitutes

FFX radically changes summoning.

When Yuna summons an Aeon:
- the normal party leaves the battlefield;
- the Aeon remains;
- the player chooses its commands;
- it has HP/stats/abilities;
- it can die;
- it has its own Overdrive;
- its power is linked substantially to Yuna's development. [FFX16](#ffx16)

This enables tactics unavailable to one-animation summons:
- use an Aeon to absorb a boss Overdrive;
- heal an elemental Aeon with matching elemental magic where applicable;
- delay enemies through an Aeon's special attack;
- bank an Aeon Overdrive before a difficult fight;
- use Grand Summon for immediate Overdrive access.

The summon is therefore a **temporary replacement agent**, not an effect.

## 12. Optional Aeons are world-integrated progression

Several powerful Aeons are optional.

Examples:
- **Yojimbo** depends on reaching the Cavern of the Stolen Fayth and a gil-based relationship/payment mechanic.
- **Anima** depends on hidden/destruction-sphere treasure progress across Cloisters plus return to Baaj.
- **Magus Sisters** require layered sidequest prerequisites involving Remiem Temple, Aeon battles, Monster Arena progress and prior optional Aeons. [FFX17](#ffx17)

This is excellent dependency design:
- one reward proves knowledge/progress across several world systems;
- optional summons are not just vendor unlocks.

## 13. Story structure: a pilgrimage makes linearity diegetic

FFX is famously linear for much of its runtime, but the linear path is not arbitrary.

Yuna is literally undertaking a **pilgrimage**:
- travel to temples;
- complete Cloisters of Trials;
- pray at Chambers of the Fayth;
- gain Aeons;
- move toward Zanarkand;
- prepare for the Final Summoning.

This gives sequence meaning.

Kitase has also explained a production reason: because FFX was fully 3D, rendering an explorable traditional overworld at the desired quality/cost was impractical, so the team dropped the old world-map structure. [FFX01](#ffx01)

Both explanations matter:
- fiction makes the route coherent;
- production shaped what kind of world could be built.

**OpenLegend limit:** this is not a template for an open authored reality. OpenLegend should borrow **route meaning**, not the assumption that one route must exist.

## 14. Spira: institutions create world logic

Spira is organized around institutions and beliefs:
- Yevon;
- summoners and guardians;
- temples/fayth;
- Crusaders;
- Al Bhed;
- Blitzball communities;
- Guado;
- Ronso;
- recurring destruction by Sin.

Technology is not merely an art-style detail. Machina is socially/religiously contested.

The party's journey repeatedly encounters tensions between:
- public doctrine;
- personal belief;
- institutional hypocrisy;
- minority treatment;
- survival practice.

FFX does not simulate these institutions autonomously, but it demonstrates how **rules, taboo and material technology** can make cultures mechanically/narratively distinct.

## 15. Voice acting changed story production

FFX was the first fully voiced mainline Final Fantasy.

Kitase's 2026 anniversary account describes Square learning the process almost from scratch:
- auditions held internally;
- external recording studio;
- multiple actors often recorded together to preserve conversational feel. [FFX18](#ffx18)

Voice brought benefits:
- stronger performance continuity;
- a clearer emotional relationship between Tidus/Yuna and the ensemble;
- more cinematic scene direction.

It also created localization constraints. Current player criticism still notices awkward line speed/timing in parts of the English dub. [FFX19](#ffx19)

This is an important production lesson:
- adding a richer presentation channel changes **authoring constraints**, not only fidelity.

## 16. Blitzball is a sport, recruitment system and progression economy

Blitzball is not just a one-off minigame.

Players can:
- recruit players found around Spira;
- assign positions;
- learn techniques;
- choose formations;
- play leagues/tournaments;
- level athletes;
- win prizes. [FFX20](#ffx20)

Stats include:
- HP;
- Speed;
- Endurance;
- Attack;
- Pass;
- Block;
- Shoot;
- Catch.

An on-ball encounter resolves numerically based on:
- whether to break through defenders;
- tackle/Endurance;
- passing decay;
- block interception;
- shot versus goalkeeper Catch.

Blitzball feeds the main RPG because rewards include Wakka's Overdrive progression and important weapon-upgrade items.

### OpenLegend lesson

A sport becomes world-building when:
- NPCs have careers/positions;
- teams persist;
- recruits can move;
- competition grants status/resources;
- the activity matters to culture and character identity.

OpenLegend can take this far beyond a self-contained minigame by allowing teams/leagues to exist autonomously.

## 17. Monster Arena turns ecology into a collection/endgame loop

At the Calm Lands Monster Arena, special weapons with **Capture** let the player register fiends by landing killing blows with eligible attacks. [FFX21](#ffx21)

Collecting:
- species from a region;
- enough of a species;
- broad world coverage

unlocks:
- Area Conquest creations;
- Species Conquest creations;
- Original creations;
- rare item/stat-farming rewards.

This produces a loop:

**explore old regions → capture representative creatures → unlock artificial superboss → earn rare development resources → optimize Sphere Grid/equipment → fight harder creations**

The monsters become an endgame progression corpus rather than discarded early-game content.

## 18. Optional/endgame structure reopens the linear world

After obtaining the airship, much more optional content becomes available:
- secret coordinates/locations;
- Omega Ruins;
- Baaj Temple;
- Cavern of the Stolen Fayth;
- Remiem Temple;
- Monster Arena;
- Celestial Weapons;
- Cactuar/chocobo/lightning-dodge minigames;
- International/HD Dark Aeons and Penance. [FFX22](#ffx22) [FFX03](#ffx03)

This creates a two-phase structure:

**main game:** directed pilgrimage  
**late game:** revisit/research/optimize across the whole world

That is a strong pacing pattern when story urgency and exploration freedom would otherwise conflict.

## 19. Celestial Weapons make personal side challenges into build completion

Each character's ultimate weapon chain is tied to different activities, locations and personal motifs.

For example, Auron's Masamune path connects:
- a Rusty Sword;
- a location interaction;
- Monster Arena unlock milestones;
- a crest/sigil chain. [FFX23](#ffx23)

Other Celestial Weapon upgrades are tied to:
- Blitzball;
- chocobo racing;
- lightning dodging;
- butterfly catching;
- hidden exploration.

This is divisive: the diversity is memorable, but some activities require execution/repetition disconnected from the character's ordinary combat expertise.

**OpenLegend lesson:** personalized advancement tasks can create identity, but arbitrary minigame gates can feel like external tests rather than causal world challenges.

## 20. Story, relationships and sacrifice

**Major story spoilers.**

FFX's central story is structurally linked to its gameplay journey:
- Yuna must gather Aeons because summoning is her social/religious role;
- Guardians are both story companions and combat specialists;
- the pilgrimage's expected endpoint is sacrifice;
- Tidus and Yuna's relationship complicates the accepted social script;
- the party eventually rejects the institutionally prescribed solution.

Tidus is the audience outsider:
- he does not know Spira's norms;
- other characters explain them;
- his refusal to accept them creates conflict.

Yuna is arguably the world-story's central actor:
- the route exists because of her duty;
- communities react to her status;
- the party is defined socially as her guardians.

This creates an important distinction:

> The player controls Tidus most often, but the **social role generating the campaign is Yuna's**.

## 21. NPCs, factions, social systems and multiplayer

FFX is single-player.

NPCs primarily provide:
- authored dialogue;
- shops/services;
- Blitzball recruitment;
- story and institutional context;
- sidequest access.

There is no general:
- NPC daily schedule simulation;
- autonomous faction diplomacy;
- procedural romance;
- persistent arbitrary memory.

But named social roles matter mechanically:
- summoner;
- guardian;
- Crusader;
- monk/priest;
- Blitzball player;
- merchant;
- Al Bhed engineer.

That is a useful halfway point toward OpenLegend: roles are meaningful, but they are scripted rather than simulated.

## 22. Five substantive independent written reviews

| Source | Version | Praised | Criticized / tradeoff |
| --- | --- | --- | --- |
| GameSpot | PS2, 2001 | strategic combat, presentation, story, production leap | linearity and some genre/story preferences |
| RPGFan | HD Remaster, 2014 | methodical combat, Sphere Grid, International content, strong remaster | minor textures/framerate/package quirks |
| Push Square | PS4, 2015 | pacing, Spira, addictive battle/growth systems | dated voice delivery, port-specific technical issues |
| Nintendo Life | Switch, 2019 | CTB, party switching, worldbuilding, Sphere Grid | linearity/minigame/friction varies by player; X-2 tonal shift divisive |
| The Guardian | HD Remaster, 2014 | both games still hold up, epic FFX story, strong battle systems | uneven remaster texture quality |

[FFX24](#ffx24) [FFX25](#ffx25) [FFX26](#ffx26) [FFX10](#ffx10) [FFX27](#ffx27)

### Reception synthesis

**CTB has aged unusually well.** Modern reviews repeatedly praise the visible turn queue and party switching because the strategic information is explicit.

**Sphere Grid balances identity and freedom.** Standard Grid onboards clear roles; Expert Grid exposes more freedom.

**Linearity is simultaneously strength and criticism.** It gives the pilgrimage strong pacing and narrative coherence, but offers less geographic self-direction until late game.

**The minigames are remembered more unevenly.** Blitzball has deep fans; some Celestial Weapon requirements are notorious friction points.

**The remaster is more preservation than reinvention.** It adds content/presentation but retains old animation, voice and structural quirks.

## 23. FFX-2: same world, inverse game structure

FFX-2 is not “more FFX combat.”

Kitase explains that a different battle lead wanted a different combat system, leading to a return to fast ATB. Dresspheres were partly motivated by the disappearance of FFX's summons: transformations preserved the spectacle of big visual changes in battle. [FFX01](#ffx01)

### Dresspheres

A Dressphere is a job:
- Gunner;
- Warrior;
- White Mage;
- Black Mage;
- Thief;
- and many others.

Characters can change Dressphere **during battle**, altering:
- stats;
- commands;
- available abilities;
- tactical role. [FFX07](#ffx07)

### Garment Grids

Dresspheres are placed on a Garment Grid.

The Grid:
- determines which jobs are reachable in a battle;
- can grant passive effects;
- can contain gates that grant bonuses when crossed by changing jobs. [FFX08](#ffx08)

This means loadout design determines the **state-transition graph** available in combat.

### Structure

FFX:
- fixed pilgrimage;
- gradual geographic route;
- CTB;
- seven-character roster with specialist switching.

X-2:
- early access to broad Spira map;
- mission/hotspot structure;
- much optional content;
- fast ATB;
- three fixed heroines with fluid job identity.

GameSpot's original X-2 review notes that this freedom makes most content optional but can fragment narrative momentum if the player does not revisit locations repeatedly. [FFX28](#ffx28)

### OpenLegend contrast

FFX and X-2 form a valuable pair:
- **FFX:** structure the world around a strong social obligation;
- **X-2:** revisit the same world after the obligation disappears and let new factions/activities emerge.

A living world needs both:
- periods where obligations constrain action;
- periods where changed history opens new possibilities.

## 24. Production, distribution and commercial context

FFX development began around 1999 for PlayStation 2. The team had to build new 3D production leadership because key prior developers were split across other projects such as *Kingdom Hearts*. [FFX18](#ffx18)

Major production decisions included:
- full 3D environments;
- no traditional world map partly for production-cost reasons;
- late switch toward higher-resolution output instead of more colors;
- first full mainline voice pipeline;
- strategic turn-based battle overhaul;
- Sphere Grid board-like progression. [FFX01](#ffx01) [FFX18](#ffx18)

As of July 2026, Square Enix was still actively celebrating and rereleasing the game: a 25th-anniversary campaign accompanied the Switch 2 release of the HD Remaster. [FFX05](#ffx05)

Commercially:
- Square Enix confirmed the **FFX series** (FFX + X-2 across releases) had surpassed **20.8 million worldwide shipments and digital sales as of September 2021**. [FFX29](#ffx29)
- This is a series-level metric, not a clean FFX-only number.
- Older PS2-only figures are often cited separately, but this dossier avoids combining incomparable shipment/sell-through estimates into a fake precise lifetime figure.

## 25. Current Steam evidence

The Steam app is the combined *Final Fantasy X/X-2 HD Remaster* package.

At the September 2026 snapshot:
- approximately **88% of ~11.3k English-language reviews** were positive;
- recent English/all-language snapshots were around the low-70s positive range, fluctuating by retrieval window. [FFX06](#ffx06)

Current player evidence is especially useful because the **recent decline is dominated by PC technical complaints**, not a sudden re-evaluation of FFX's story/battle design.

Recent/top review themes include:

Positive:
- Sphere Grid remains flexible;
- party switching/CTB remains excellent;
- story/music retain strong emotional impact.

Negative:
- crashes to desktop;
- green-screen FMV failures on some modern PC/GPU configurations;
- need for community 4GB/compatibility fixes in some setups. [FFX19](#ffx19)

A recent player explicitly says their only major complaint is the PC green-screen bug while praising Sphere Grid and mid-fight swapping. Another reports crashes and frozen visuals. These are hardware/configuration-sensitive qualitative reports, not prevalence estimates.

**Research conclusion:** current Steam sentiment is partly **port maintenance evidence**, not simply FFX-design evidence.

## 26. Comprehensive mechanics inventory

| Category | FFX implementation / absence |
| --- | --- |
| Character creation | No avatar creator; authored Tidus/Yuna ensemble |
| Classes/roles | Strong intended starting roles; Sphere Grid eventually permits crossing |
| Attributes/leveling | AP → Sphere Levels → grid movement; sphere items activate stat/ability nodes |
| Skill trees | Sphere Grid is a spatial shared progression board with locked/crossing paths |
| Equipment | Character-specific weapon/armor families defined by Auto-Abilities and slots |
| Crafting/upgrading | Item-consuming equipment customization; Celestial Weapon upgrade chains |
| Magic | White/Black magic learned via Grid; elements/status/time manipulation |
| Summons | Aeons replace party and act as controllable combatants |
| Items | Recovery, battle items, sphere items, Mix/customization materials |
| Combat | CTB, visible turn queue, action-delay manipulation, instant party switching |
| Overdrives | Character-specific interactive moves + selectable gauge-fill modes |
| Enemy interaction | Steal/Use, Lancet/Ronso Rage, Capture, Overkill, status/element weaknesses |
| Traversal | Mostly contiguous pilgrimage path; boats/chocobo/airship and late world selection |
| Environment | Cloister puzzles, temples, settlements, field exploration; no freeform physics sandbox |
| Activities/minigames | Blitzball, chocobo races, lightning dodge, butterflies, Cactuar quests and more |
| Economy | Gil, merchants, bribe/item loops; no dynamic player market |
| Death/failure | KO/revival; three active-party wipe causes game over despite reserves |
| Story | Authored pilgrimage with institutional/religious conflict |
| Relationships | Authored Tidus/Yuna/guardian relationships; no generic affinity sim |
| Party | Seven main controllable humans + instant reserves; Yuna's Aeons |
| NPC/AI | Scripted NPCs; Blitzball recruitable athletes; no broad autonomy |
| Factions | Yevon, Al Bhed, Crusaders, Ronso/Guado etc. are authored, not dynamically simulated |
| World map | No classic walkable overworld; late airship destination/coordinate system |
| Quests/events | Linear main route + substantial late/optional side content |
| Building/settlements | No player construction/management |
| Multiplayer | Single-player |
| Endgame | Monster Arena, Celestial Weapons, Omega Ruins; International/HD Dark Aeons/Penance |
| Direct-sequel contrast | X-2 replaces CTB/Sphere Grid with ATB + Dressphere/Garment Grid state transitions |

## 27. OpenLegend transferable lessons and limits

### A. Make future consequences visible when tactical planning matters

CTB turns scheduler state into readable UI.

**Borrow:** show action duration, response windows and likely ordering where users need to plan.

### B. Let “who does the next action?” be a first-class decision

Instant party switching makes specialization useful without punishing roster breadth.

**Borrow:** nearby agents should be assignable dynamically based on skills, relationships and current state.

### C. Use structured onboarding before opening full freedom

Standard Sphere Grid gives clear identities; later crossing creates freedom.

**Borrow:** teach coherent roles first, then enable hybridization through actual learning.

### D. Tie progression to a visible map of prerequisites

Sphere Grid makes paths/locks/crossroads inspectable.

**Borrow:** make capability dependencies legible rather than burying them in invisible prerequisites.

### E. Let allied nonhuman entities be agents, not animations

Aeons have turns, health, abilities and failure.

**Borrow:** summons/pets/vehicles/constructs should participate causally if the fiction says they exist.

### F. Social roles should generate economics

Summoners, guardians and Blitzball players have meaningful world roles.

**Borrow:** careers should create obligations, income, permissions, status and relationships.

### G. Let leisure be culture

Blitzball has teams, athletes, recruits, leagues and rewards.

**Borrow:** sports/games should exist as institutions in the world, not isolated UI widgets.

### H. A linear route can be meaningful when it is an obligation

The pilgrimage explains sequence.

**Limit:** OpenLegend should not author one mandatory route when the world should support alternate causal plans.

### I. Reopen old content through changed goals

Monster Arena and airship endgame make prior regions relevant again.

**Borrow:** new capabilities/questions should change why old places matter.

### J. Keep port/runtime quality separate from system quality

2026 Steam complaints are often technical.

**Borrow for research:** never infer that a mechanic is disliked because a current client crashes.

## 28. Preservation and requirement audit

No FFX-specific prior game/mechanics/dossier owner existed on this branch before G87, so this dossier is additive.

| Requirement | Coverage |
| --- | --- |
| R01 identity/scope/promise | §§1–2 |
| R02 actions/major mechanics | §§3–19, 23, 26 |
| R03 items/entities/composition | §§5–12, 16–19 |
| R04 progression/economy/time | §§3, 5–10, 16–19 |
| R05 concrete interactions | §§3–12, 16–19 |
| R06 people/AI/social/multiplayer | §§4, 14, 16, 20–21, 26 |
| R07 art/audio/interface/feel | §§2, 15, 22, 25 |
| R08 story/narrative/play | §§13–15, 20, 23 |
| R09 production/development | §§15, 24 |
| R10 marketing/distribution/virality | §24 |
| R11 commercial/participation | §§24–25 |
| R12 reviews/player feedback | §§22, 25 |
| R13 transferable inspiration/limits | §27 |
| R14 sources/viewing/preservation/navigation | §§2, 28 + sources |

### Evidence limits

- Launch, International/PAL and HD content are separated.
- Dark Aeons/Penance are not attributed to every 2001 version.
- Five independent substantive written review publications were inspected.
- Steam's current score measures a combined X/X-2 PC package and is affected by technical issues.
- 20.8m is a combined FFX-series shipments + digital-sales milestone as of September 2021.
- X-2 is treated as a separate ruleset.
- No claim depends on unseen video footage; the official *Inside Final Fantasy X/X-2* featurette is recorded as a useful viewing route, but this dossier uses written primary interviews for factual production claims.

## 29. Completion conclusion

FFX's enduring strength is **strategic legibility**.

The player can see turn order. They can choose which specialist takes the next action. They can see a progression board and decide which path to follow. They can customize equipment through explicit slots. Aeons exist as controllable combatants rather than hidden effects.

At the same time, the game shows where structure helps:
- the Standard Sphere Grid creates strong early identity;
- the pilgrimage gives linearity narrative purpose;
- late-game airship/sidequests release the player back into broader exploration.

For OpenLegend, the highest-value principle is:

> **A complex world becomes more empowering when it exposes who can act, when they can act, why they are qualified, and what future possibilities each choice opens.**

## Sources — annotated set

<a id="ffx01"></a>**FFX01 — [Final Fantasy X and X-2 producer reflects on the innovative PS2 titles](https://blog.playstation.com/2022/01/05/final-fantasy-x-and-x-2-producer-reflects-on-the-innovative-ps2-titles/).** Yoshinori Kitase / PlayStation Blog, 2022-01-05. Primary developer account of PS2 production, no-world-map decision, CTB strategy goal, Sphere Grid board-game inspiration and X-2 Dressphere/ATB rationale.

<a id="ffx02"></a>**FFX02 — [Final Fantasy X Gameplay](https://strategywiki.org/wiki/Final_Fantasy_X/Gameplay).** StrategyWiki community mechanics reference. Sphere Grid, Expert Grid and Aeon system.

<a id="ffx03"></a>**FFX03 — [Final Fantasy X Dark Aeons](https://strategywiki.org/wiki/Final_Fantasy_X/Dark_Aeons).** StrategyWiki. International/PAL/HD superboss boundary and Penance prerequisite chain.

<a id="ffx04"></a>**FFX04 — [Final Fantasy X/X-2 HD Remaster Review](https://www.rpgfan.com/review/final-fantasy-x-x-2-hd-remaster/).** John McCarroll, RPGFan, 2014-03-29. International/Expert Grid/remaster content and release-quality evidence.

<a id="ffx05"></a>**FFX05 — [FINAL FANTASY X 25th Anniversary Information](https://na.finalfantasy.com/news/2833).** Square Enix / Final Fantasy Portal, 2026-07-19. Primary current anniversary and Switch 2 release context.

<a id="ffx06"></a>**FFX06 — [FINAL FANTASY X/X-2 HD Remaster on Steam](https://store.steampowered.com/app/359870/FINAL_FANTASY_X_X2_HD_Remaster/).** Valve/Square Enix, snapshot retrieved 2026-09-26. Current combined-package release/features and dynamic review aggregate.

<a id="ffx07"></a>**FFX07 — [Final Fantasy X-2 Review](https://www.gamespot.com/reviews/final-fantasy-x-2-review/1900-6083743/).** Brad Shoemaker, GameSpot, 2003-11-17. Full written sequel review; Dressphere/job swapping, mission structure and fast ATB.

<a id="ffx08"></a>**FFX08 — [Final Fantasy X-2 Garment Grid FAQ](https://gamefaqs.gamespot.com/ps2/562386-final-fantasy-x-2/faqs/22790).** Community mechanics reference. Grid nodes, Dressphere transitions and gate/equipped effects.

<a id="ffx09"></a>**FFX09 — [Final Fantasy X International FAQ/Walkthrough](https://gamefaqs.gamespot.com/ps2/197344-final-fantasy-x/faqs/17195).** Community version reference for CTB action timing, Sphere Grid and equipment customization.

<a id="ffx10"></a>**FFX10 — [Final Fantasy X | X-2 HD Remaster Review (Switch)](https://www.nintendolife.com/reviews/nintendo-switch/final_fantasy_x_x-2_hd_remaster).** Mitch Vogel, Nintendo Life, 2019-04-21. Full independent review; detailed CTB turn list, instant party-switching, Sphere Grid and sequel contrast.

<a id="ffx11"></a>**FFX11 — [Final Fantasy X Gameplay — Sphere Grid](https://strategywiki.org/wiki/Final_Fantasy_X/Gameplay).** StrategyWiki. AP → Sphere Level → movement/node activation architecture.

<a id="ffx12"></a>**FFX12 — [Final Fantasy X Items](https://strategywiki.org/wiki/Final_Fantasy_X/Items).** StrategyWiki. Activation, Key, Friend, Return, Teleport, Warp, stat and other sphere functions.

<a id="ffx13"></a>**FFX13 — [Final Fantasy X Overdrives](https://strategywiki.org/wiki/Final_Fantasy_X/Overdrives).** StrategyWiki. Character-specific Overdrives and acquisition/input patterns.

<a id="ffx14"></a>**FFX14 — [No Sphere Grid / No Summon / No Overdrive Challenge FAQ](https://gamefaqs.gamespot.com/ps2/197344-final-fantasy-x/faqs/29961).** Community challenge-run evidence. Demonstrates item/Use/customization depth under severe progression constraints; not developer-intent evidence.

<a id="ffx15"></a>**FFX15 — [Final Fantasy X Equipment](https://strategywiki.org/wiki/Final_Fantasy_X/Equipment).** StrategyWiki. Auto-Abilities, empty slots and item-consuming customization.

<a id="ffx16"></a>**FFX16 — [Final Fantasy X Aeons](https://strategywiki.org/wiki/Final_Fantasy_X/Aeons) and [Gameplay](https://strategywiki.org/wiki/Final_Fantasy_X/Gameplay).** StrategyWiki. Aeon-as-party-replacement behavior, stats, attacks and Overdrives.

<a id="ffx17"></a>**FFX17 — [Final Fantasy X Remiem Temple](https://strategywiki.org/wiki/Final_Fantasy_X/Remiem_Temple) plus [Secret World Map Locations](https://strategywiki.org/wiki/Final_Fantasy_X/Secret_World_Map_Locations).** StrategyWiki. Optional Aeon prerequisites and hidden-location dependencies.

<a id="ffx18"></a>**FFX18 — [FINAL FANTASY IV 35th Anniversary & FINAL FANTASY X 25th Anniversary Special Interview](https://na.finalfantasy.com/news/2831).** Square Enix / Final Fantasy Portal, 2026-07-18. Primary Kitase/Tokita account of FFX development start, Eastern fantasy direction, team split, late-resolution shift, water ambitions and early voice-recording process.

<a id="ffx19"></a>**FFX19 — [FINAL FANTASY X/X-2 HD Remaster current Steam review feed](https://steamcommunity.com/app/359870/reviews/).** Individual Steam reviewers, inspected 2026-09-26. Qualitative current praise for Sphere Grid/party swapping and negative reports of crashes/green-screen FMV issues; hardware/self-selected evidence, not prevalence.

<a id="ffx20"></a>**FFX20 — [Final Fantasy X Blitzball](https://strategywiki.org/wiki/Final_Fantasy_X/Blitzball).** StrategyWiki. Player/team stats, positions, formations, leagues, tournaments and recruitment/activity structure.

<a id="ffx21"></a>**FFX21 — [Final Fantasy X Monster Arena](https://strategywiki.org/wiki/Final_Fantasy_X/Monster_Arena).** StrategyWiki. Capture weapons, regional/species collection and conquest creation loop.

<a id="ffx22"></a>**FFX22 — [Final Fantasy X Secrets and Sidequests](https://strategywiki.org/wiki/Final_Fantasy_X/Secrets_and_Sidequests).** StrategyWiki. Airship-era optional areas, Monster Arena, Celestial Weapons and side activities.

<a id="ffx23"></a>**FFX23 — [Final Fantasy X Auron / Masamune](https://strategywiki.org/wiki/Final_Fantasy_X/Auron).** StrategyWiki. Example of Celestial Weapon chain crossing exploration and Monster Arena milestones.

<a id="ffx24"></a>**FFX24 — [Final Fantasy X Review](https://www.gamespot.com/reviews/final-fantasy-x-review/1900-2832771/).** Greg Kasavin, GameSpot, 2001-12-14. Contemporary PS2 review; one of five independent review publications.

<a id="ffx25"></a>**FFX25 — [Final Fantasy X/X-2 HD Remaster Review](https://www.rpgfan.com/review/final-fantasy-x-x-2-hd-remaster/).** John McCarroll, RPGFan, 2014. Full independent review; methodical combat, Expert Grid, International content and port-quality evidence.

<a id="ffx26"></a>**FFX26 — [Final Fantasy X|X-2 HD Remaster Review (PS4)](https://www.pushsquare.com/reviews/ps4/final_fantasy_xx-2_hd_remaster).** Robert Ramsey, Push Square, 2015-05-12. Full independent review; Spira/pacing/growth/combat and voice-age evidence.

<a id="ffx27"></a>**FFX27 — [Final Fantasy X/X-2 HD Remaster review](https://www.theguardian.com/technology/2014/mar/30/final-fantasy-x-x-2-hd-remaster-review).** Matt Kamen, The Guardian, 2014-03-29. Independent review of remaster consistency and both games' enduring battle/story strengths.

<a id="ffx28"></a>**FFX28 — [Final Fantasy X-2 Review](https://www.gamespot.com/reviews/final-fantasy-x-2-review/1900-6083743/).** Brad Shoemaker, GameSpot, 2003. Sequel's mission-based optionality, Dressphere progression and narrative-fragmentation tradeoff.

<a id="ffx29"></a>**FFX29 — [Final Fantasy X series shipments and digital sales top 20.8 million](https://www.gematsu.com/2022/07/final-fantasy-x-series-shipments-and-digital-sales-top-20-8-million).** Gematsu, 2022-07-19, reporting confirmation from Square Enix. Metric covers FFX + X-2 across releases as of September 2021, not FFX alone.

<a id="ffx30"></a>**FFX30 — [Inside FINAL FANTASY X/X-2 HD Remaster featurette announcement](https://na.finalfantasy.com/news/1081).** Square Enix, 2019-05-07. Official viewing route listing Kitase, Toriyama, Naora and Katano interviews. The video itself was not represented as watched.


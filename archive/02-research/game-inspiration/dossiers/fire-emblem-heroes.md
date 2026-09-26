# Fire Emblem Heroes — full research dossier

**G65 · Complete research pass, September 26, 2026.** This dossier studies Fire Emblem Heroes as a **live-service mobile tactics/collection game**, not as a mainline Fire Emblem substitute. Current reference point: **Ver. 10.9.0 / Book X** in September 2026, including the newly introduced Vista Heroes and Divine Games. Launch-era reviews are used to establish the original promise; current official notices and player accounts establish how nine years of systems/power growth changed that experience. [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Heroes is a remarkable OpenLegend case because it proves how aggressively a deep tactics vocabulary can be compressed:
- tiny maps;
- four-unit teams;
- deterministic hit/damage;
- touch drag controls;
- very short sessions.

It is also one of the clearest warnings in this library about **live-service complexity debt**. A system that begins legible can become opaque when each new collectible must create enough novelty/power to motivate acquisition.

## 1. Identity, scope, and current state

**Developer:** Intelligent Systems, with DeNA/mobile-platform collaboration credited in launch-era material.  
**Publisher:** Nintendo.  
**Platforms:** iOS and Android.  
**Launch:** February 2, 2017.  
**Business model:** free-to-start/free-to-play with optional in-app purchases. [HE01](#he01)

The player is a **Summoner** recruited by the Order of Heroes in Askr. Their defining fiction/mechanic is the power to summon Fire Emblem characters across worlds.

Unlike a conventional crossover roster, this premise naturally supports:
- multiple versions of the same character;
- seasonal costumes;
- alternate timelines/forms;
- protagonists from every mainline game;
- original Heroes characters.

### September 2026 boundary

Nintendo's official topic feed shows:
- **Book X** active;
- **Ver. 10.9.0** released in September 2026;
- **Vista Heroes** newly introduced;
- a new **Divine Games** event;
- continuing Arena/revival/refine/skill updates. [HE02](#he02) [HE03](#he03)

The game is therefore actively operated, not maintenance-only.

## 2. The mobile battle core

Standard maps are compact, commonly **8×6**, and many teams deploy four Heroes.

A turn consists of moving each available unit and choosing an action such as:
- attack;
- Assist skill;
- wait;
- map/mode-specific interaction.

Movement types include:
- infantry;
- armored;
- cavalry;
- flying.

Terrain affects traversal and positioning.

### Determinism

Heroes removes major traditional combat randomness:
- attacks do not ordinarily miss;
- there are no random critical hits;
- Specials charge through a visible cooldown/count system.

TouchArcade's launch account highlighted this as a major compression choice: a player can reason about a short puzzle without surprise misses/criticals. [HE04](#he04)

### Why this works

The player's cognitive load shifts from:
> “will this 78% hit?”

to:
> “what exact sequence of movement, buffs, follow-ups and cooldowns produces survival?”

That makes the game closer to a deterministic tactics puzzle.

## 3. Weapon/color triangle and movement composition

Heroes maps weapons into a color system:
- red;
- blue;
- green;
- colorless.

The classic triangle broadly follows:
- red > green;
- green > blue;
- blue > red.

Weapon types include:
- swords/lances/axes;
- bows;
- daggers;
- tomes;
- staves;
- dragon breath;
- beast weapons;
- later special categories/variants.

Movement type and weapon/range compose:
- cavalry has broad movement but terrain constraints;
- fliers ignore many terrain barriers but face anti-flier effects;
- armor has low mobility but historically high stats/specialized skills;
- infantry has broad skill access.

### OpenLegend lesson

A tiny rules space can remain expressive when orthogonal dimensions combine:
- body/mobility;
- attack medium;
- affinity;
- range;
- skills.

## 4. Hero identity, rarity, levels, and IV-like traits

Heroes are individual collectible instances.

Core progression includes:
- rarity stars;
- level up to 40;
- stats;
- Skill Points (SP);
- learned/equipped skills;
- merges;
- weapon refinement;
- Dragonflowers;
- blessings and other later enhancement layers.

Summoned copies can have an Asset/Flaw-style stat distribution (historically called IVs by players), though merging and later systems can neutralize parts of the disadvantage.

### Duplicate copies

Duplicates are not merely redundant:
- they can merge into the same Hero;
- become Combat Manuals;
- supply skills through inheritance;
- sometimes serve mode-specific/economy functions.

This makes the collection economy compositional but also monetizes redundancy.

## 5. Skills and inheritance: the lasting design breakthrough

Heroes' most important long-term mechanic is **Skill Inheritance**.

A Hero has slots such as:
- weapon;
- Assist;
- Special;
- A;
- B;
- C;
- Sacred Seal;
- plus newer/exclusive layers depending on unit type.

Many skills can be inherited from one Hero to another subject to:
- weapon/movement restrictions;
- exclusive-skill restrictions;
- inheritance-slot/count rules.

The donor is consumed or represented through a Combat Manual under applicable systems.

### Why it is powerful

A newly summoned unit is not only:
- a fighter.

It can also be:
- a **bundle of transferable capabilities**.

This creates secondary value:
> “I do not want this character for my team, but I need their skill for my favorite.”

### OpenLegend transfer

This is highly relevant to:
- teaching;
- books/manuals;
- artifacts;
- technique transfer.

But OpenLegend should preserve semantic acquisition:
- who taught it?
- what practice is required?
- can the learner understand it?

Heroes abstracts those questions into compatibility tables.

## 6. Sacred Seals, weapon refines, and keeping old units relevant

Live service creates a fundamental problem:
> older collectibles must remain emotionally valuable while new collectibles must be desirable.

Heroes has added catch-up/customization systems including:
- **Sacred Seals** — equipable versions of many skill effects;
- **Weapon Refinery** — upgrades/new effects;
- **Dragonflowers** — stat investment;
- **Resplendent Heroes** through FEH Pass for eligible older units;
- merges;
- Arcane/reusable inheritance-related weapon systems;
- later skill/hero categories.

The September 2026 update still adds refines to older Heroes. [HE03](#he03)

### The structural lesson

Backward-support systems only work if power growth is bounded enough that:
- +stats;
- one refine;
- one inherited skill

can meaningfully close the gap.

Current player criticism argues that recent unit kits sometimes leap beyond what old-unit investment can practically compensate for. [HE05](#he05)

## 7. Summoning and Orb economy

**Orbs** are the central premium currency.

They can be obtained from:
- story clears;
- quests;
- events;
- login campaigns;
- other rewards;
- real-money purchases.

Summoning typically presents colored stones. The player can:
- choose based on color;
- summon multiple units in a session with reduced marginal Orb cost;
- target focus banners.

Modern banners may include:
- focus rates;
- pity-rate increases after unsuccessful pulls;
- guaranteed-choice/"spark" systems under specified event/subscription conditions;
- free first summons/tickets.

### Design significance

Color choice gives the gacha some **agency before randomness**.

It does not eliminate:
- uncertain acquisition;
- duplicates;
- limited-time pressure;
- spending variance.

### OpenLegend warning

Do not use probabilistic scarcity to gate core expression merely because it drives engagement.

## 8. Hero categories and live-service semantic inflation

Over nine years, Heroes introduced numerous premium/special categories, for example:
- Legendary;
- Mythic;
- Duo;
- Harmonized;
- Ascended;
- Rearmed;
- Attuned;
- Emblem-linked forms;
- Entwined and other later forms;
- **Vista Heroes** in Ver. 10.9.0. [HE03](#he03)

These categories often introduce:
- new inheritance rules;
- team-wide effects;
- blessing/scoring interactions;
- special resources;
- status effects.

### Vista Heroes

The September 2026 update describes Vista Heroes as granting:
- a unique status scene;
- a **Vignette** strengthening item;
- additional stats/effects to other Heroes under the system. [HE03](#he03)

The exact current category matters less than the pattern:
> collectible type becomes a new layer of game rules.

### OpenLegend warning

A growing platform must prefer **general primitives** over one new exception taxonomy per content release.

## 9. Merges, manuals, and collection transformation

### Merge Allies

Combining duplicate copies increases long-term investment in a Hero, traditionally up to +10 merges.

### Combat Manuals

A Hero can be converted into a manual:
- freeing barracks space;
- preserving merge/inheritance utility;
- losing the deployable character instance.

### Compile Combat Manuals

Divine Codes and limited Ephemera can be exchanged for predetermined manuals.

Ver. 10.9.0 continues monthly Ephemera/manual lineups. [HE03](#he03)

This is a useful inventory abstraction:
> when an entity's remaining value is purely knowledge/material, convert it into a lighter representation.

OpenLegend could similarly archive:
- recipes;
- teachings;
- blueprints;
- records

without keeping a full active entity.

## 10. Story Books and ongoing narrative

Heroes' original story begins with:
- Askr;
- Embla;
- Alfonse;
- Sharena;
- Anna;
- Veronica;
- the Summoner.

Each annual **Book** introduces new realms/characters/conflicts and a new set of story chapters.

By September 2026:
- **Book X** is current. [HE02](#he02)

The live-story format allows:
- yearly tonal reset;
- new gods/realms;
- seasonal/festival side material;
- cross-franchise character appearances without breaking the core summon premise.

### Limitation

Launch reviewers considered the initial story thin and primarily an excuse to fight familiar faces. [HE06](#he06) [HE07](#he07)

Later Books are more elaborate, but the game remains collection-first rather than a character-continuity RPG where every summoned Hero deeply participates in the main plot.

## 11. Modes: a portfolio of repeat loops

Heroes accumulated many modes. Major families include:

### Main Story / Paralogues
- authored maps;
- Orbs;
- narrative.

### Special / Grand / Legendary / Mythic Hero Battles
- fixed challenge encounters;
- recruit/reward or high-difficulty clear objectives.

### Arena
- weekly score competition;
- fight AI-controlled teams created from other players' rosters;
- scoring depends on performance and roster factors.

### Aether Raids
- build an offense team;
- attack other players' defensive maps;
- construct an Aether Keep with structures/traps;
- seasonal ladder/rewards.

### Summoner Duels
- one of the more direct competitive formats;
- alternating/synchronous tactical decisions rather than only attacking AI defenses.

### Tempest Trials
- repeated sequential-map endurance event.

### Forging Bonds
- battles plus character conversations/rewards.

### Hall of Forms
- temporary predefined roster;
- gain random skill choices during a run;
- eligible Forma can later be acquired through special resources.

### Binding Worlds
- borrow/encounter developed Heroes from others and progress through maps; later acquisition mechanics use scarce premium bonds.

### Pawns of Loki / Mjölnir's Strike / Seer's Snare / Heroes Journey / Resonant Battles / Limited Hero Battles
- each remixes roster constraints, auto-battling, progression, cooperative/community scoring or run-based skill accumulation.

### Divine Games

Ver. 10.9.0 adds **Divine Games**, described by Nintendo as a new event centered on specialized skills and the player's own strength. [HE03](#he03)

### Live-service insight

Mode proliferation creates many reasons to use a roster—but also demands that returning players understand a very large menu of currencies/rules.

## 12. Aether Raids: player-authored tactical space

Aether Raids is especially relevant to OpenLegend.

Players configure:
- defensive units;
- structures;
- traps;
- map layout;
- seasonal blessings.

Other players attack the saved defense.

This turns one's roster and spatial design into an **asynchronous artifact**.

It demonstrates a useful middle ground:
- no simultaneous shared world required;
- another player's authored configuration still creates gameplay for you.

## 13. Build complexity and status vocabulary

Modern Heroes units can combine:
- visible buffs/debuffs;
- in-combat modifiers;
- start-of-turn effects;
- pre-combat damage;
- damage reduction;
- damage-piercing;
- follow-up manipulation;
- cooldown acceleration;
- Canto;
- terrain/divine-vein effects;
- movement warping;
- Savior/protection;
- Miracle/survival;
- numerous named statuses.

The September 2026 official update notes UI work to make bonuses and penalties visually distinguishable, evidence that communicating effect state has become a substantial usability problem. [HE03](#he03)

### Player criticism

A January 2026 long-time player described reaching a point where enemy effects felt unreadable even in PvE, especially repeated survival/Miracle-like behavior. [HE08](#he08)

An April 2026 newcomer thread contains experienced players explicitly warning about:
- feature creep;
- power creep;
- old units requiring extreme investment. [HE09](#he09)

### OpenLegend lesson

When effect text becomes longer than the decision it supports, **semantic compression** is overdue.

Use shared typed concepts that the UI can summarize:
- shield;
- burning;
- pinned;
- hidden;
- exhausted.

Do not encode every new ability as a paragraph of bespoke exceptions.

## 14. Failure and persistence

Heroes has no campaign permadeath.

A defeated Hero:
- is unavailable for the remainder of that map;
- remains in the player's collection afterward.

Failure may cost:
- stamina;
- a competitive resource/score;
- event attempt;
- time.

The collection is persistent and safe.

This is appropriate for a gacha product:
> permanent destruction of a paid/randomly acquired Hero would be commercially and emotionally incompatible.

OpenLegend should similarly align loss rules with ownership expectations.

## 15. Monetization layers

Major monetization includes:
- Orb packs;
- limited/event summoning;
- special packs;
- FEH Pass subscription;
- scarce acquisition items tied to specific systems.

### FEH Pass

The subscription historically/currently offers benefits such as:
- Resplendent Hero distribution/eligibility;
- quality-of-life automation/repeat functionality;
- additional quests/rewards;
- some summon guarantee access depending on banner rules.

The exact perk set evolves and should be treated as live.

### Monetization tension

At launch, several reviews found the game playable for free but worried about:
- stamina;
- gacha randomness;
- duplicates;
- endgame pressure. [HE06](#he06) [HE07](#he07)

Nine years later, player frustration focuses more on:
- power creep;
- premium-skill access;
- competitive viability;
- complexity

than the original 50-stamina bottleneck, which the service softened over time.

## 16. Production and mobile adaptation

Heroes was one of Nintendo's earliest major smartphone products.

The product challenge:
> preserve enough Fire Emblem identity to be recognizable while designing for sessions measured in minutes.

Launch coverage documents deliberate compression:
- four-unit teams;
- tiny maps;
- touch drag;
- deterministic outcomes;
- no permadeath;
- simplified inventory;
- gacha recruitment. [HE04](#he04) [HE10](#he10)

### Why Fire Emblem fit gacha unusually well

TouchArcade identified structural compatibility:
- decades of named characters;
- recruitment already central to the franchise;
- cross-world fiction available;
- battles naturally broken into stages;
- fans have strong favorites. [HE04](#he04)

This is an important product insight:
> monetization works best when it attaches to an existing fantasy instead of an unrelated store layer.

That does not remove the ethical/design tradeoffs of random paid acquisition.

## 17. Art, audio, and interface

Heroes uses:
- newly commissioned illustrated character art;
- multiple artists across the roster;
- character voice lines;
- chibi map sprites;
- recycled/remixed/new franchise music;
- portrait/animation emphasis during Specials.

The visual split is efficient:
- premium illustration carries identity/collection desire;
- low-complexity sprites keep tiny maps readable and cheap to animate.

Launch reviewers widely praised:
- character art;
- clean mobile UI;
- soundtrack.

They criticized:
- simplistic/chibi battle models in comparison with the illustration quality. [HE07](#he07) [HE11](#he11)

## 18. Choose Your Legends and community participation

**Choose Your Legends (CYL)** lets players vote on Fire Emblem characters; winners later receive special versions.

The official 2026 feed shows:
- **Choose Your Legends Round 10**;
- a Shadows Cup variant tied to a new Fire Emblem release. [HE02](#he02)

This is a strong live-service loop:
> community attention becomes production input.

It creates:
- campaign/social discussion;
- yearly ritual;
- demand signal;
- character promotion.

### OpenLegend inspiration

Community voting can guide:
- curated official content;
- spotlighted inventions;
- new world packs

without letting popularity directly rewrite the simulation's laws.

## 19. Commercial and participation context

Sensor Tower reported that Heroes surpassed **$1 billion in global player spending** by June 2022, making it Nintendo's first mobile game to cross that milestone. It estimated:
- 17.8 million installs by then;
- Japan ~54% of spending;
- U.S. ~32.4%. [HE12](#he12)

These are third-party estimates, not Nintendo-audited revenue.

The significant structural point:
- spending was enormous relative to downloads;
- Heroes succeeded through long-term monetization of a relatively concentrated audience.

Do not infer current 2026 revenue from the 2022 milestone.

## 20. Five substantive written reviews

### 1. GameSpot — Kallie Plagge, 2017

**Praised:** strong touch adaptation, short-session tactical puzzles and franchise fan appeal.

**Criticized:** shallow story, repetitive grinding and summoning loop, weak long-term reason to play beyond collecting favorites. [HE06](#he06)

### 2. Nintendo Life — Thomas Whitehead, 2017

**Praised:** slick presentation, good “lite” Fire Emblem feel, short-burst play.

**Criticized:** stripped-down depth and increasingly visible pay-to-win/gacha pressure for completionists. [HE11](#he11)

### 3. Game Informer — Javy Gwaltney, 2017

**Praised:** extremely effective compression of tactical combat and accessibility.

**Criticized:** missing permadeath/relationship depth, weak story, duplicate summons and launch stamina pressure. [HE07](#he07)

### 4. Destructoid — CJ Andriessen, 2017

**Praised:** addictive quick battles, accessible strategy and satisfying roster acquisition.

**Criticized/qualified:** called it “Fire Emblem Jr.” and documented the economic absurdity of chasing a guaranteed/premium pull under launch rules. [HE13](#he13)

The outlet later named it its best mobile game of 2017 after major free-content/QoL updates, showing how materially the service improved within its first year. [HE14](#he14)

### 5. Pocket Gamer — Harry Slater, 2017

**Praised:** polished casual tactics adaptation and approachable mobile loop.

**Criticized:** shallower than mainline Fire Emblem and bound to familiar free-to-play/gacha compromises. [HE15](#he15)

### Review synthesis

Launch consensus was not “bad gacha”:
- reviewers generally liked the mobile battle translation.

The disagreement was whether that compact loop had enough:
- depth;
- story;
- long-term purpose

to justify the free-to-play economy.

Nine years of updates answered “enough content” decisively—but introduced a new problem: **too much layered content/effect complexity**.

## 21. Current player/community evidence

There is no Steam version, so Steam review sampling is not applicable.

### February 2026 veteran discussion

A long-time player asked whether the game remained fun and cited:
- extreme unit/skill power creep;
- declining perceived F2P attention;
- homogeneous modern effect packages.

Replies included both continuing attachment and burnout. [HE05](#he05)

### January 2026 power-creep discussion

A launch-era player who could previously ignore some kit complexity reported that recent units became difficult to reason about even in story PvE because survival/damage effects were no longer visually/intuitively obvious. [HE08](#he08)

### April 2026 newcomer discussion

Experienced players warned a prospective newcomer that nine years of:
- power creep;
- feature creep;
- overloaded kits

create a steep re-entry/onboarding wall. [HE09](#he09)

### Counterweight

The game still has active players after almost a decade, frequent content updates, fan-voting events and enough official support to launch entirely new Hero categories in September 2026.

The correct conclusion is:
> retention success and onboarding/readability quality can diverge.

## 22. Worked interactions

### A. Inherit one rare skill into a favorite old Hero

**Intent:** keep a beloved launch-era character useful.

**Conditions:** obtain a donor Hero with inheritable skill; target satisfies restrictions.

**Actions:** convert/consume donor through Skill Inheritance → equip learned skill → combine with refine/Seal/flowers.

**Result:** new collectible value transfers into old identity.

**Next choice:** invest further or preserve future donor copies.

**Limit:** if base kit/stat/effect power has moved too far, inheritance cannot fully close the gap.

### B. Choose summon color to constrain randomness

**Intent:** target a blue focus Hero.

**Action:** enter summon session → inspect generated stone colors → spend Orbs only on blue stones or decide whether to continue session.

**Result:** player has partial agency over random acquisition.

**Limit:** desired Hero is still not guaranteed without an applicable spark/guarantee.

### C. Build an Aether Raids defense as asynchronous content

**Intent:** make opponents spend actions into a trap.

**Actions:** choose map → structures/traps → unit formation → save defense.

**Result:** other players fight the authored state without the owner being online.

**Next:** inspect results and iterate.

**OpenLegend lesson:** player-authored places can create asynchronous social gameplay.

### D. Hall of Forms turns random skill offers into a temporary build run

**Intent:** develop a fixed Forma unit.

**Actions:** clear chambers → select one of offered skills → continue difficulty climb.

**Result:** temporary progression creates a build story distinct from owned roster.

**Limit:** the reward/acquisition layer can convert experimentation back into premium scarcity.

### E. Deterministic combat becomes unreadable through effect layering

**Intent:** answer “will my unit kill this enemy?”

**Original core:** compare exact stats, weapon triangle, speed/follow-up, Special.

**Modern case:** numerous start-of-turn, status, damage-reduction, piercing, Canto, miracle and conditional effects may interact.

**Result:** no random miss exists, yet outcome can be harder to understand than an older probabilistic system.

**OpenLegend lesson:** determinism alone does not create legibility.

## 23. Transferable inspiration for OpenLegend

### A. Compress interfaces, not underlying meaning

Heroes proves a complex genre can fit:
- touch controls;
- tiny maps;
- short sessions.

OpenLegend can expose a context-specific subset of actions without deleting world depth.

### B. Make reusable capability transfer a core primitive

Skill Inheritance is one of the strongest systems here.

OpenLegend equivalents:
- teach technique;
- copy blueprint;
- transfer spell inscription;
- demonstrate craft.

### C. Asynchronous authored state is powerful

Aether Raids shows a player's:
- roster;
- space;
- traps;
- rules

can become content for someone else without live co-presence.

### D. Preserve favorites with horizontal expansion

Players want to keep using emotionally meaningful characters.

Prefer:
- new roles;
- situational tools;
- alternate strategies

over pure vertical stat/effect escalation.

### E. Community attention can feed creation

CYL is a durable annual ritual.

### F. Tiny deterministic maps are excellent testbeds

Heroes demonstrates how constrained scenarios expose:
- movement;
- counter relationships;
- sequence order.

OpenLegend can use small challenge spaces to teach new mechanics.

## 24. Limits / do not copy automatically

### Do not monetize relationship with random access

A favorite character should not require unpredictable spend in OpenLegend.

### Do not solve old-content relevance with endless upgrade currencies

Each catch-up system adds onboarding debt.

### Do not add a new semantic category whenever content needs novelty

Hero-type proliferation becomes taxonomy overload.

### Do not let ability text become executable legal contracts

If human players cannot predict outcomes, the system has failed as a game interface even if the simulation is technically deterministic.

### Do not confuse retention with delight

A nine-year player can remain active through habit/investment while describing declining enjoyment.

## 25. Requirement and preservation map

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2 |
| R02 player actions / mechanics | §§2–18 |
| R03 items / entities / composition | §§3–9 |
| R04 progression / economy / time | §§4–9, 11, 14–15 |
| R05 concrete interactions | §22 |
| R06 people / AI / social / multiplayer | §§10–12, 18, 21 |
| R07 art / audio / interface / feel | §§2, 13, 17 |
| R08 story / narrative | §10 |
| R09 production | §16 |
| R10 marketing / distribution / virality | §§16, 18–19 |
| R11 commercial / participation | §§15, 19 |
| R12 reviews / player feedback | §§20–21 |
| R13 inspiration / limits | §§23–24 |
| R14 sources / preservation / navigation | this section + Sources |

### Mechanics inventory

Covered:
- Summoner identity;
- Hero stats/levels/rarity;
- skill slots/inheritance;
- merges/manuals/refines/flowers;
- weapons/colors/movement;
- summoning/economy;
- small-map combat;
- Assists/Specials/statuses;
- story Books;
- event modes;
- PvP/asynchronous modes;
- Aether Keep construction;
- collection/social voting;
- failure/recovery;
- subscription/monetization;
- current live-service categories.

Absent/not native in the main gameplay:
- free-roam traversal;
- crafting/settlement survival;
- permadeath;
- conventional romance/children;
- continuous NPC schedules;
- shared synchronous world.

### Preservation check

G65 is an independent roster pass and no inherited full Heroes dossier existed on the branch. This document intentionally separates:
- launch design/reviews;
- later accumulated systems;
- September 2026 current state.

No launch review is treated as evidence for current balance, and current Reddit anecdotes are qualitative rather than prevalence estimates.

## Sources

<a id="he01"></a>**HE01 — [Fire Emblem Heroes overview](https://www.nintendolife.com/games/mobile/fire_emblem_heroes).** Nintendo Life profile reproducing official core description/release boundary; current official service source is HE02–HE03.

<a id="he02"></a>**HE02 — [Fire Emblem Heroes official topic feed](https://fire-emblem-heroes.com/en/include/topics_title.html).** Nintendo / Intelligent Systems. Primary current evidence: Book X, ninth anniversary, Ver. 10.9.0 and September 2026 activity.

<a id="he03"></a>**HE03 — [Official update notices](https://fire-emblem-heroes.com/en/include/topics_detail.html).** Nintendo / Intelligent Systems. Primary Ver. 10.9.0 evidence for Vista Heroes, Divine Games, manuals/refines and current system changes.

<a id="he04"></a>**HE04 — [Fire Emblem Heroes First Impressions](https://toucharcade.com/2017/02/03/fire-emblem-heroes-early-review/).** Shaun Musgrave, TouchArcade, February 3, 2017. Detailed launch mechanics/monetization/mobile-adaptation account.

<a id="he05"></a>**HE05 — [Is the game still fun to you?](https://www.reddit.com/r/FireEmblemHeroes/comments/1qztlhx/is_the_game_still_fun_to_you/).** r/FireEmblemHeroes, February 9, 2026. Qualitative veteran evidence on power/feature creep and enjoyment.

<a id="he06"></a>**HE06 — [Fire Emblem Heroes Review](https://www.gamespot.com/reviews/fire-emblem-heroes-review/1900-6416615/).** Kallie Plagge, GameSpot, February 13, 2017. Full launch review.

<a id="he07"></a>**HE07 — [Fire Emblem Heroes Review: The Bare Necessities](https://gameinformer.com/games/fire_emblem_heroes/b/ios/archive/2017/02/07/the-bare-necessities).** Javy Gwaltney, Game Informer, February 7, 2017. Full launch review.

<a id="he08"></a>**HE08 — [Honest question about recent power creep](https://www.reddit.com/r/FireEmblemHeroes/comments/1q0yvb4/honest_question_about_recent_power_creep/).** r/FireEmblemHeroes, January 1, 2026. Qualitative readability/PvE-friction account.

<a id="he09"></a>**HE09 — [How is this game in 2026?](https://www.reddit.com/r/FireEmblemHeroes/comments/1sgc06u/how_is_this_game_in_2026/).** r/FireEmblemHeroes, April 9, 2026. Qualitative newcomer/advice thread.

<a id="he10"></a>**HE10 — [Everything You Need to Know About Fire Emblem Heroes](https://gameinformer.com/b/features/archive/2017/02/03/everything-you-need-to-know-about-fire-emblem-heroes).** Javy Gwaltney, Game Informer, February 3, 2017. Launch mechanics/online/stamina overview.

<a id="he11"></a>**HE11 — [Fire Emblem Heroes Review](https://www.nintendolife.com/reviews/mobile/fire_emblem_heroes).** Thomas Whitehead, Nintendo Life, February 6, 2017. Full review.

<a id="he12"></a>**HE12 — [Fire Emblem Heroes Hits $1 Billion in Global Player Spending](https://sensortower.com/blog/fire-emblem-heroes-one-billion-revenue).** Sensor Tower, June 2022. Third-party spending/download estimates with geographic/platform breakdown.

<a id="he13"></a>**HE13 — [Review: Fire Emblem Heroes](https://www.destructoid.com/reviews/review-fire-emblem-heroes/).** CJ Andriessen, Destructoid, February 8, 2017. Full review.

<a id="he14"></a>**HE14 — [Destructoid's Best Mobile Game of 2017](https://www.destructoid.com/destructoids-award-for-best-mobile-game-of-2017-goes-to/).** Destructoid, December 2017. Evidence of first-year service/QoL improvement; award/opinion, not participation metric.

<a id="he15"></a>**HE15 — [Fire Emblem Heroes review](https://www.pocketgamer.com/fire-emblem-heroes/review/).** Harry Slater, Pocket Gamer, February 2, 2017. Independent launch review.

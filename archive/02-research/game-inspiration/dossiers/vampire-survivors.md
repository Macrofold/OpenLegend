# Vampire Survivors — full research dossier

**G44 · Complete research pass, September 26, 2026.** This dossier uses **Vampire Survivors 1.16.x** as the current product boundary, while separating the base-game rules from paid DLC and from historical versions. Local couch co-op and current online co-op are treated as distinct rulesets. The August 2026 **Legacy of the Bloodmoon** expansion is included as current expansion scope but is not silently attributed to the base game.

[Preserved overview](../games/vampire-survivors.md) · [Detailed mechanics study](../mechanics/vampire-survivors-automated-attacks-evolution-and-cooperative-agency.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

Vampire Survivors is a compact demonstration that **automation can relocate agency instead of eliminating it**. The character attacks automatically, yet movement, weapon geometry, build selection, evolution dependencies, pickup timing, route choice and cooperative resource allocation remain meaningful. For OpenLegend, this is unusually relevant to delegation: a player does not need to manually issue every low-level action if the remaining intervention points still determine purpose and risk.

## 1. Identity and current scope

Vampire Survivors is poncle's gothic-horror action roguelite / “survivors-like” in which a character automatically attacks while the player primarily moves, chooses upgrades and navigates a growing horde.

The game began on itch.io/Steam Early Access in 2021 and reached 1.0 on October 20, 2022. It subsequently expanded across:
- Windows/macOS;
- Xbox;
- Switch / Switch 2;
- PlayStation;
- iOS/Android;
- Apple Arcade;
- other distribution routes.

As of September 2026, Steam's current line is **1.16.x**, following:
- 1.15 “The Wet One,” which added save slots, content filters, stability/performance work, a new stage/characters/weapons/Darkanas/Relics;
- 1.16, which supports **Legacy of the Bloodmoon**, additional Moonspell content and further performance/QOL changes. [VS-A](#vs-a) [VS-B](#vs-b)

Current paid/free content history includes multiple expansions and collaborations. This dossier focuses on the base grammar, using expansion content only where it demonstrates how the grammar scales.

## 2. First-session loop

A typical base-style run begins:
- pick a character;
- pick a stage;
- move through enemies;
- automatic weapons fire on their own schedules/target rules;
- collect experience gems;
- level up;
- choose one upgrade from a small offered set;
- collect chests/pickups;
- assemble weapons/passives;
- evolve compatible weapons;
- survive escalating enemy waves;
- reach the stage's time endpoint/boss state;
- spend persistent gold/unlocks between runs.

The player does **not** normally:
- press an attack button for every strike;
- manually aim every projectile.

This removes execution load while preserving:
- positioning;
- route;
- build;
- timing;
- risk.

## 3. Character identity

Characters differ through:
- starting weapon;
- stats;
- scaling traits;
- special mechanics;
- unlock conditions.

Some characters are straightforward stat variants; later/base-update/DLC characters can radically change:
- movement;
- weapon behavior;
- economy;
- level-up rules;
- stage interactions.

The roster has grown enormous by 2026, making **content discovery/selection itself** a UX problem. Patch 1.15 explicitly added character-setup and content-filter tooling to keep the menu manageable. [VS-A](#vs-a)

### OpenLegend lesson

Extensibility needs:
- discoverability;
- filtering;
- provenance;
- compatibility;

not only “support unlimited content.”

## 4. Movement is also aiming

Automatic attacks still respond to spatial state.

Examples preserved in the mechanics study:
- Whip attacks horizontally;
- Magic Wand targets the nearest enemy;
- Knife fires in the faced direction;
- King Bible orbits;
- Garlic creates an aura. [VS-C](#vs-c)

Therefore movement changes:
- which enemy becomes nearest;
- which direction a weapon points;
- where orbit/aura coverage lands;
- where experience/chests can safely be collected;
- how enemies bunch.

This is a strong abstraction:
> automate repetitive execution; preserve **positioning and purpose** as player-controlled inputs.

## 5. Weapons are geometric behaviors, not only damage values

Weapons differ through:
- targeting;
- projectile path;
- area;
- cooldown;
- duration;
- amount;
- speed;
- knockback/control;
- persistence;
- screen coverage.

A high-damage weapon can still be poor at:
- close defense;
- focused boss damage;
- a specific direction;
- keeping escape lanes open.

The best builds often combine **coverage shapes**.

### King Bible + Garlic example

King Bible occupies an orbiting band.

Garlic covers the close inner zone and can affect susceptibility to knockback/freezing for nonimmune enemies.

The value is not just additive DPS:
- one tool covers a geometry the other leaves exposed. [VS-C](#vs-c)

OpenLegend effects should similarly preserve:
- range;
- shape;
- direction;
- timing;

instead of reducing everything to one power number.

## 6. Level-ups: bounded random choice

Experience gems fill the level bar.

On level-up, the player chooses from a small randomized offer of:
- new weapon;
- weapon level;
- passive;
- passive level;
- later alternative depending on current systems/unlocks.

Meta tools such as:
- Reroll;
- Skip;
- Banish;
- Seal/content filters

let players increasingly shape the random offer pool.

This creates a progression from:
- accept uncertainty;
to
- learn the pool;
to
- actively curate uncertainty.

A September 2026 Steam complaint argues that the ever-growing content pool can make reroll/Banish management itself feel like wasted time. That is a meaningful downside of extensibility: more valid options can reduce **signal density**. [VS-D](#vs-d)

## 7. Passive items and build constraints

Passives modify character/weapon properties such as:
- cooldown;
- duration;
- area;
- speed;
- amount;
- movement;
- armor;
- regeneration;
- experience gain;
- luck.

They matter twice:
1. their direct effect;
2. their role in weapon-evolution prerequisites.

A passive can therefore be selected for a future dependency even when another item would solve a stronger immediate need.

This is a clear commitment mechanic:
> future recipe potential competes with present survival.

## 8. Weapon evolution: understandable dependency with strong payoff

The common evolution pattern requires:
- a compatible base weapon;
- sufficient weapon level;
- a paired passive or other prerequisite;
- an eligible chest/condition.

There are exceptions by weapon/stage/DLC, so it is wrong to turn one ordinary recipe into a universal law. [VS-C](#vs-c)

Examples:
- Whip + Hollow Heart → Bloody Tear;
- Magic Wand + Empty Tome → Holy Wand;
- King Bible + Spellbinder → Unholy Vespers.

Evolution can change:
- reliability;
- coverage;
- side effect;
- resource behavior;

not just raw damage.

### Pentagram → Gorgeous Moon

Pentagram can clear enemies while also destroying pickups/chests under its rules, trading safety for reward loss.

Gorgeous Moon changes that relationship: it no longer destroys pickups and instead becomes connected to experience generation/gathering. [VS-C](#vs-c)

This is an excellent upgrade pattern:
> remove a memorable liability rather than merely multiplying the number.

## 9. Chests, pickups and route

The player physically moves to:
- experience gems;
- chests;
- food/healing;
- magnets/vacuums;
- stage items;
- special interactables.

Therefore an automated combat build still creates movement decisions:
- push into danger for a chest?
- delay pickup until safe?
- preserve a screen-clear pickup?
- route toward a stage passive or secret?

In a system with automatic workers/defenses, OpenLegend can preserve agency by making **where/when to collect or commit resources** meaningful.

## 10. Stages, clocks and endpoints

Classic stages often revolve around an approximately thirty-minute survival arc:
- enemy schedules intensify;
- new wave compositions arrive;
- bosses/time gates appear;
- the Reaper/death endpoint marks completion unless later systems alter it.

Other stages/modes vary the structure.

The bounded timer is important because the game often reaches near-automatic dominance.

Instead of asking the player to watch their solved build forever:
- the run ends;
- rewards/unlocks feed the next experiment.

A persistent OpenLegend world cannot simply reset after thirty minutes. Once automation solves one problem it needs:
- new goals;
- social change;
- exploration;
- creation;
- player-authored projects;

not manufactured endless busywork.

## 11. Arcana and Darkana: global run modifiers

Arcana and later Darkana systems add broader rule modifiers.

They can reshape:
- weapon behavior;
- damage relationships;
- pickups;
- healing;
- movement;
- stage events;
- build incentives.

These are closer to run-level “law modifiers” than normal equipment.

Version 1.15 added three Darkanas alongside other content. [VS-A](#vs-a)

OpenLegend world packages can similarly support:
- explicit local laws;
- scenario modifiers;

but those should be inspectable and versioned rather than hidden prompt text.

## 12. Gold, PowerUps and persistent progression

Runs award resources/unlocks that persist outside the run.

Gold purchases PowerUps and historically other progression options.

Persistent progression includes:
- characters;
- weapons/items;
- stages;
- systems;
- PowerUps;
- collection/unlock checklist;
- secrets;
- Adventures/DLC content.

The progression is largely **breadth + controlled baseline advantage**, not one endless RPG level ladder.

### Golden Eggs / extreme scaling

Later systems can create intentionally absurd persistent stat growth for chosen characters.

This supports sandbox escalation but also contributes to:
- menu complexity;
- late-game performance pressure;
- balance becoming knowingly noncompetitive.

poncle has repeatedly treated “broken” power as part of a single-player pleasure rather than pursuing symmetric competitive balance.

## 13. Death and recovery

A run usually ends on death.

The player keeps:
- unlocked meta progression;
- gold/PowerUps;
- knowledge.

The temporary build is lost.

Local co-op historically used coffins/revival behavior for fallen players.

Online mode has its own disconnect/progress rules rather than simply networking the couch implementation. [VS-E](#vs-e)

## 14. Local couch co-op

The 2023 couch mode supports up to four players on one screen.

Its design changed multiple base assumptions:
- all players share screen travel;
- experience is shared;
- level-up choices rotate;
- weapon capacity depends on player count;
- fallen players can become coffins and later revive;
- movement destination becomes a negotiation.

A Friendship Amulet can offer:
- one desired personal upgrade;
versus
- random group-wide weapon improvement. [VS-C](#vs-c)

This makes resource allocation social without requiring dialogue trees.

## 15. Current online co-op

Current online play is **not just couch play over the internet**.

Official online documentation distinguishes:
- up to four players;
- independent roaming rather than one shared camera;
- invitation/room-code entry rather than random matchmaking;
- host-owned stage/item availability;
- individual unlocks;
- optional acceptance of acquired progress back into a player's own save;
- host/client disconnect consequences. [VS-E](#vs-e)

Current 1.15/1.16 patch notes also show continued work on:
- online desyncs;
- DLC sharing groundwork;
- save management.

This is useful OpenLegend evidence:
> multiplayer changes ownership/progression semantics, not only network transport.

## 16. DLC and collaboration boundaries

Major expansion/collaboration families include historically:
- Legacy of the Moonspell;
- Tides of the Foscari;
- Emergency Meeting;
- Operation Guns;
- Ode to Castlevania;
- later packs/content;
- **Legacy of the Bloodmoon** in 2026.

Bloodmoon adds:
- 12 characters;
- 16+ weapons/evolutions;
- 11 tracks;
- one Adventure;
- a large stage. [VS-B](#vs-b)

It also shipped with a free Moonspell content expansion and 1.16 base-engine/QOL changes.

These are **content built on the same grammar**.

OpenLegend's expansion packs should ideally do the same:
- add actors/items/laws/content;
- reuse common systems;
- avoid building an unrelated one-off runtime for every pack.

## 17. Story and narrative

The base game uses:
- parody;
- environmental flavor;
- unlock text;
- absurd character/weapon names;
- secrets;
- stage framing.

It does not need a conventional linear narrative to produce run stories.

DLC can add stronger authored setting/story identity:
- Foscari's academy/fairy-tale framing;
- Castlevania collaboration;
- Bloodmoon's clan/pilgrimage/manor premise.

The meaningful base narrative is often:
- what the build became;
- what secret was discovered;
- how a fragile start became a screen-clearing machine.

## 18. Art, audio and interface

The presentation is deliberately low-fi:
- pixel sprites;
- exaggerated effects;
- simple movement animation;
- dense enemies;
- escalating particles/numbers.

Sound is disproportionately important:
- weapon rhythm;
- pickup sounds;
- chest sequence;
- soundtrack;
- escalating feedback.

Nintendo Life praised the soundtrack/sound design and “flow,” while noting framerate/readability problems when the screen becomes overloaded, particularly in co-op. [VS-F](#vs-f)

The current Steam surface still contains both:
- praise for audiovisual spectacle;
- complaints that huge content and effects can overwhelm menus/readability/performance. [VS-D](#vs-d)

Patch 1.15 directly responded with:
- filters;
- character-setup UX;
- performance/stability improvements;
- loading improvements. [VS-A](#vs-a)

## 19. Production: hobby project → breakout → engine migration

Luca Galante originally built Vampire Survivors as a hobby project, influenced by the mobile game **Magic Survival** and his experience in gambling-machine/software work. He initially hoped for a tiny player base and feedback rather than forecasting a global hit. [VS-G](#vs-g)

### Word-of-mouth breakout

The game launched cheaply and initially looked visually unremarkable.

Its rapid escalation/build loop was hard to communicate through screenshots but easy to demonstrate through:
- streams;
- clips;
- player recommendations.

GameSpot's developer features document how unexpectedly the project expanded. [VS-G](#vs-g)

### Engine migration

The original was effectively built with web/JavaScript technology.

As platform/performance needs grew, poncle rebuilt/migrated the game to a more appropriate engine while trying to preserve **feel** so players would not notice a behavior change. [VS-H](#vs-h)

That is a powerful engineering lesson:
> infrastructure can be replaced without changing the player's learned semantics.

OpenLegend should similarly treat behavior compatibility as a product contract when changing runtime internals.

## 20. Marketing, distribution and discovery

Vampire Survivors benefited from a clear experiential hook once seen:
- move only;
- attacks automate;
- become impossibly powerful;
- drown the screen in effects.

Discovery routes included:
- Steam;
- creator/streamer coverage;
- word of mouth;
- low purchase price;
- Game Pass;
- mobile free access;
- later platform ports.

poncle's production interview says Game Pass helped people who did not understand the appeal from screenshots try the game and return to it. That is the developer's account, not measured causal attribution. [VS-H](#vs-h)

The free mobile release also reduced trial friction, using optional ads for specific rewards rather than a conventional forced-ad/F2P economy. [VS-I](#vs-i)

## 21. Commercial and participation context

The game is a clear commercial/cultural breakout, but private lifetime revenue/profit should not be invented.

Useful public evidence includes:
- repeated presence among Steam best sellers during the breakout;
- platform expansion;
- Game Pass reach;
- BAFTA Best Game/Game Design awards;
- current Steam review volume.

At access, Steam shows approximately:
- **251k purchaser reviews** across languages;
- **128k English reviews**;
- Overwhelmingly Positive current/recent reception;
- SteamDB ~97% rating from a larger review corpus. [VS-J](#vs-j)

Those are review/participation proxies, not unit sales.

## 22. Five substantive written reviews

### 1. PC Gamer — Ted Litchfield, October 27, 2022

**Praised:** complementary weapon patterns, extreme power curve, generous secrets and strong value.

**Criticized:** easy starts can become boring late-game steamrolls; historical portable performance could slow badly.

The review directly supports the “automation relocates agency” interpretation. [VS-K](#vs-k)

### 2. Nintendo Life — Charlie Wacholz, August 16, 2023

**Praised:** gripping progression, secrets, sound/music, local co-op and short bounded runs.

**Criticized:** framerate can dip, especially in co-op; busy screens can become difficult to parse. [VS-F](#vs-f)

### 3. Nintendo World Report — Melanie Zawodniak, August 16, 2023

**Praised:** surprising depth from minimal direct controls, upgrade decisions and satisfying escalation.

**Criticized:** calls out the fundamental simplicity and examines whether “only move + choose upgrades” is substantial enough for the player; the review still finds the resulting progression compelling. [VS-L](#vs-l)

### 4. Destructoid — Zoey Handley, 2023 Switch-era review

**Praised:** simple input hides an irresistible progression/build structure; spectacle and unlocks continually pull play forward.

**Criticized:** deliberately crude presentation and mechanically minimal moment-to-moment input will not suit everyone. [VS-M](#vs-m)

### 5. God is a Geek — Chris White, August 8, 2022

**Praised:** enormous satisfaction from growth, weapon combinations and survival loop.

**Criticized:** the visual presentation can look generic/dull enough to repel players before they understand the loop; the game's depth is not legible from trailers/screenshots alone. [VS-N](#vs-n)

## 23. Current Steam/player feedback

Steam's aggregate rating remains extremely positive.

### Positive sample

Current reviews praise:
- huge content volume;
- inexpensive DLC;
- soundtrack;
- the pleasure of watching a build become overwhelming;
- easy “background/relaxing” play.

A September 2026 review explicitly praises the massive roster/stage/item volume while noting menu/display roughness. [VS-O](#vs-o)

### Negative/current sample

A September 25, 2026 negative review argues that the content pool has become so large that players spend excessive time on Banish/Reroll/Skip/restarts to force desired builds. [VS-D](#vs-d)

Other current complaints include:
- online crashes/desyncs;
- late-run performance;
- clutter/content overload.

Metacritic's 2026 user sample includes both:
- praise for continued inexpensive updates;
- complaints about crashes/slowdowns, especially online. [VS-P](#vs-p)

No prevalence is inferred beyond the official Steam aggregate.

## 24. Concrete situations

### Situation A — automatic weapon still rewards deliberate movement

**Goal:** kill a dangerous target with Magic Wand while escaping a crowd.

**Action:** reposition so the desired target becomes nearest.

**Result:** automated target selection changes without pressing an attack button.

**Lesson:** automation can remain steerable through world state.

### Situation B — coverage shapes complement

**State:** King Bible orbit + Garlic aura.

**Action:** move so the orbit hits the outer edge while aura handles close enemies.

**Result:** two geometries cover different failure zones.

**Lesson:** effect shape matters as much as magnitude.

### Situation C — future evolution costs present flexibility

**Goal:** evolve one weapon.

**Action:** select its required passive now.

**Result:** an inventory slot is committed to future payoff, potentially weakening immediate defense.

**Lesson:** dependencies create strategy when visible.

### Situation D — clearing danger destroys reward

**State:** Pentagram before evolution.

**Action:** automatic trigger wipes enemies and potentially pickups/chests.

**Result:** safer screen, poorer resource collection.

**Lesson:** one action can improve one objective while damaging another.

### Situation E — local co-op changes upgrade ownership

**State:** group shares experience and alternating choices.

**Choice:** take a precise personal upgrade or a random group upgrade through a co-op mechanic.

**Result:** build optimization becomes negotiation.

**Lesson:** multiplayer changes resource ownership, not simply player count.

## 25. Transferable inspiration for OpenLegend

### A. Automate execution after the player establishes intent

An inhabitant can:
- keep tending assigned crops;
- continue hauling from known source to destination;
- maintain a machine;

without another high-level decision every second.

### B. Preserve steering variables

Even when execution is automatic, player choices should affect:
- target;
- position;
- priority;
- resource budget;
- risk;
- stop conditions.

### C. Make capability geometry explicit

A magical sensor, social role or tool has:
- range;
- direction;
- timing;
- coverage;
- blind spots.

### D. Build progression through dependencies, not only bigger numbers

Tool + skill + material can unlock a changed behavior.

### E. Solved automation needs new purpose

Do not punish successful infrastructure by endlessly scaling chores.

Let success enable:
- exploration;
- culture;
- politics;
- invention;
- relationships;
- larger self-chosen projects.

### F. Multiplayer requires explicit ownership/progression semantics

Decide:
- shared XP?
- personal unlocks?
- host world state?
- transferable rewards?
- disconnect handling?

### G. Extensibility requires content management

By 2026 Vampire Survivors needs filters precisely because it succeeded at adding enormous amounts of content.

OpenLegend's mechanics/character/world libraries need:
- search;
- tags;
- provenance;
- hiding/banishing;
- compatibility;

from early on.

## 26. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / promise | §§1–2 |
| R02 player actions / mechanics | §§2–16 |
| R03 items / entities / composition | §§3–12, 16 |
| R04 progression / economy / time | §§6–13, 16, 21 |
| R05 concrete interactions | §24 |
| R06 people / AI / social / multiplayer | §§13–15 |
| R07 art / audio / interface / feel | §18 |
| R08 story / narrative | §17 |
| R09 production / development | §19 |
| R10 marketing / distribution / virality | §20 |
| R11 commercial / participation | §21 |
| R12 reviews / player feedback | §§22–23 |
| R13 inspiration / limits | §25 |
| R14 sources / preservation / navigation | this section + sources |

**Mechanics-inventory check:** characters, stats/PowerUps, weapons/passives, evolutions, pickups/chests, movement/traversal, combat/targeting, stages/waves, death, gold/meta progression, Arcana/Darkana, local/online multiplayer and DLC boundaries are covered. There is no conventional crafting, settlement construction, NPC relationship/faction or dialogue-driven narrative system in the base game.

**Preservation check:** [the original Vampire Survivors chapter](../games/vampire-survivors.md) remains intact. [The detailed automation/co-op study](../mechanics/vampire-survivors-automated-attacks-evolution-and-cooperative-agency.md) remains the canonical owner for Whip/Wand/Knife, King Bible/Garlic, Pentagram/Gorgeous Moon and couch-versus-online examples. This dossier adds the current 1.16/Bloodmoon/content-management boundary rather than overwriting the dated study.

## Sources

<a id="vs-a"></a>**VS-A — [Vampire Survivors official Steam announcements](https://steamcommunity.com/app/1794680/announcements/?l=english).** poncle, accessed 2026-09-26. Current 1.15/1.16 update, platform, content-management and performance history.

<a id="vs-b"></a>**VS-B — [Legacy of the Bloodmoon is out now](https://steamcommunity.com/app/1794680/announcements/).** poncle, 2026-08-28; current announcement surface also shows 1.16.107 hotfixes in September. Expansion scope and base/Moonspell accompanying changes.

<a id="vs-c"></a>**VS-C — [Vampire Survivors automated attacks, evolution, and cooperative agency](../mechanics/vampire-survivors-automated-attacks-evolution-and-cooperative-agency.md).** Internal detailed study with adjacent community/official mechanic sources.

<a id="vs-d"></a>**VS-D — [Vampire Survivors recent negative Steam reviews](https://steamcommunity.com/app/1794680/negativereviews/?browsefilter=mostrecent&p=1).** Steam Community, accessed 2026-09-26. Self-selected current criticism including content-pool/reroll friction.

<a id="vs-e"></a>**VS-E — [poncle Online FAQ](https://poncle.games/vs-online-faq).** Official current online-mode documentation, accessed 2026-09-26. Online/couch/progress/disconnect boundaries.

<a id="vs-f"></a>**VS-F — [Vampire Survivors Review](https://www.nintendolife.com/reviews/switch-eshop/vampire-survivors).** Charlie Wacholz, Nintendo Life, 2023-08-16. Switch/local-co-op criticism.

<a id="vs-g"></a>**VS-G — [How Vampire Survivors Went From Hobby Project To Game Of The Year](https://www.gamespot.com/articles/how-vampire-survivors-went-from-hobby-project-to-game-of-the-year/1100-6511980/).** Steven T. Wright / Luca Galante, GameSpot, 2023-03-02. Developer-origin/growth account.

<a id="vs-h"></a>**VS-H — [How Vampire Survivors Was Rebuilt for Xbox Without Players Even Noticing](https://news.xbox.com/en-us/2023/04/13/vampire-survivors-dlc-2-launch/).** Xbox Wire / poncle interview, 2023-04-13. Engine migration and Game Pass/distribution account.

<a id="vs-i"></a>**VS-I — [Vampire Survivors gets surprise mobile release, and it's free](https://www.pcgamer.com/vampire-survivors-gets-surprise-mobile-release-and-its-free/).** PC Gamer, 2022-12-09. Historical mobile free/ad model.

<a id="vs-j"></a>**VS-J — [Vampire Survivors on Steam](https://store.steampowered.com/app/1794680/Vampire_Survivors/).** Steam, accessed 2026-09-26. Dynamic review counts/current product surface; SteamDB rating used only as a separate current storefront-derived metric.

<a id="vs-k"></a>**VS-K — [Vampire Survivors review](https://www.pcgamer.com/vampire-survivors-review/).** Ted Litchfield, PC Gamer, 2022-10-27. Original 1.0 review.

<a id="vs-l"></a>**VS-L — [Vampire Survivors Review](https://nintendoworldreport.com/review/64583/vampire-survivors-switch-review).** Melanie Zawodniak, Nintendo World Report, 2023-08-16. Switch review.

<a id="vs-m"></a>**VS-M — [Review: Vampire Survivors](https://www.destructoid.com/reviews/review-vampire-survivors-switch-pc-indie-xbox/).** Destructoid, 2023. Full independent review.

<a id="vs-n"></a>**VS-N — [Vampire Survivors review](https://godisageek.com/reviews/vampire-survivors-review/).** Chris White, God is a Geek, 2022-08-08. Early Access criticism of progression and visual first impression.

<a id="vs-o"></a>**VS-O — [Vampire Survivors Steam review feed](https://steamcommunity.com/app/1794680/reviews/).** Steam Community, accessed 2026-09-26. Current self-selected positive/negative qualitative evidence.

<a id="vs-p"></a>**VS-P — [Vampire Survivors user reviews](https://www.metacritic.com/game/vampire-survivors/user-reviews/).** Metacritic, accessed 2026-09-26. Current dated individual user accounts; not representative telemetry.


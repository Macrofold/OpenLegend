# Vampire Survivors — full research dossier

**G44 · Research pass and substantive audit remedies, September 26, 2026.** This dossier uses **Vampire Survivors 1.16.x** as its current product boundary, separating base rules, DLC, local cooperation and online cooperation. The audit adds the missing mode/progression operations, exact expansion inventory, group-access restrictions and an actually inspected helpful Steam sample. Historical rules and unresolved official-document discrepancies remain qualified. This is reference research, not accepted OpenLegend implementation requirements, and no game, network session, footage or soundtrack was tested.

[Preserved overview](../games/vampire-survivors.md) · [Detailed mechanics study](../mechanics/vampire-survivors-automated-attacks-evolution-and-cooperative-agency.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Library](../README.md)

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

The exact eight gameplay DLC packages and their paid/free distinction are in §16. The soundtrack is separate merchandise, not a ninth gameplay expansion. A desktop feature or later patch is not automatically available on every mobile/console edition. [VS-X](#vs-x)

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

The original pass recorded a September 2026 complaint that the growing content pool makes offer management itself feel wasteful. This is retained as dated testimony rather than a representative finding or a newly recovered helpful-ranked account. [VS-D](#vs-d)

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

### Six slots are an acquisition rule, not a universal ceiling

Ordinary level-up selection allows six weapons and six passive items. Picking up stage-spawned equipment can exceed those limits. Therefore filling the ordinary slots before collecting a known floor item can produce a different final build from taking that item early. This is not unrestricted mid-run equipment replacement. [VS-R](#vs-r)

Special content adds further exceptions. The 1.16.100 notes explicitly let eligible Operation Guns and Emergency Meeting special passives appear through level-ups/Arma Dio despite a filled passive inventory. Older references saying an empty slot is always required should not override that dated change. [VS-B](#vs-b)

**Interpretation:** a clear limit can create route planning, but exceptions need to identify which acquisition channel they belong to. “Six items maximum” would incorrectly erase both ordinary floor pickups and the later explicit DLC rule.

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

### Inverse and Endless change different contracts

**Gracia's Mirror** unlocks Inverse, a harder stage variant with greater enemy pressure and reward bonuses. The upside-down presentation can be controlled separately from the difficulty; it is not merely a cosmetic rotation. Additional Merchant offerings also change preparation. [VS-S](#vs-s)

**Seventh Trumpet** unlocks Endless. The stage-ending Reaper is suppressed and enemy waves cycle with increasing pressure; this does not make the run harmless or freeze progression at the first cycle. Merchant returns can create further opportunities. Eudaimonia Machine's Directer grants the relics through its “Too Easy”/“Too Hard” interaction; receiving one first does not permanently exclude the other. [VS-S](#vs-s)

**Interpretation:** removing an endpoint and increasing difficulty are separate decisions that can compose. Neither should be silently inferred from the other. A player who wants to see a completed build operate longer is expressing a different preference from a player asking for harder initial survival.

## 11. Arcana and Darkana: global rules with acquisition timing

Randomazzo in Gallo Tower unlocks the Arcana system. When enabled, a player ordinarily selects an unlocked card at the start and later chooses from randomized offers in Arcana chests. The familiar thirty-minute-stage bosses appear at minutes 11 and 21, but shorter stages use different schedules. Three is the ordinary acquisition pattern, not a universal hard maximum. [VS-T](#vs-t)

Darkasso in Room 1665 extends that same selection system with Darkanas, rather than creating a separate equipment inventory. **Moonlight Bolero** adds a treasure-bearing boss each minute; some resulting chests can supply further Arcanas or passives beyond ordinary limits. The cost is facing and collecting from those enemies, not receiving every desired modifier automatically. [VS-U](#vs-u)

These cards can reshape:
- weapon behavior;
- damage relationships;
- pickups;
- healing;
- movement;
- stage events;
- build incentives.

Version 1.15 added three Darkanas alongside other content. [VS-A](#vs-a)

**Interpretation:** a run modifier can alter how later modifiers are obtained. That is more consequential than another flat bonus and creates another reason to explain timing, eligibility and limits. OpenLegend world packages can support explicit local laws or scenario modifiers, but these should be inspectable and versioned rather than hidden prompt text.

## 12. Gold, PowerUps and several kinds of progression

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

### Limit Break extends the current weapon build

Great Gospel unlocks this selectable modifier. Once equipped weapons and passives reach their ordinary upgrade limits, further levels can offer weapon-stat improvements instead of the usual gold/healing options. “Random always” automates those repeated choices. Acquiring an additional unmaxed stage passive can temporarily restore ordinary upgrading. Chests do not simply become the same Limit Break menu. [VS-V](#vs-v)

The reference documents evolution resetting accumulated extra stats in the ordinary case; that should not be generalized into an untested claim about every later DLC union. This is growth within a run, not an automatic permanent upgrade to the character's next attempt.

**Interpretation:** a mature build gains somewhere to put experience, but another input's arrival can change what “fully upgraded” means. A meaningful explanation identifies the scope of growth rather than calling every larger number persistent progression.

### Adventures reset a subset, not the main save

The official FAQ describes chapter-based mini-campaigns with restricted arsenals and distinct objectives. Main-game Relics and unlocked modes carry over, while most other advancement does not. Buying a weapon from an Adventure Merchant equips it for that run and opens it in that Adventure's later choices—not every other Adventure. Completing the sequence can reward the main game with coins; Ascending restarts that Adventure while awarding adjustable bonuses. [VS-Q](#vs-q)

Base access uses Atlas Gate under its documented progression conditions; DLC Adventures require their relevant pack. **Evidence limit:** the same FAQ contains incompatible old and updated Ascension percentage/cap descriptions. This dossier relies on the reset-and-bonus structure, not a fabricated exact reconciliation or its obsolete “launch soon” sentence. [VS-Q](#vs-q)

**Interpretation:** bounded local renewal can coexist with a durable larger collection. Reusing a known grammar with a smaller initial arsenal creates another learning arc without deleting what the player already earned elsewhere.

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

## 15. Online cooperation: access and continuity are part of the mode

The official FAQ describes up to four independently roaming players, using invitations/room codes rather than random matchmaking. Each needs a device and game copy; couch and online cannot be mixed. Mobile was excluded at online launch. Crossplay is **within identified ecosystems**—for example Microsoft-store PC/Xbox and PS4/PS5—not universal Steam/console interoperability. Relevant DLC content requires ownership by everyone. [VS-E](#vs-e)

Characters come from each player's save, while the host determines available stages/items. Group-acquired progress can optionally be accepted into an individual's save afterward. If the host disconnects, everyone's session ends. A departing client's weapons are redistributed and play continues, but that player cannot rejoin mid-run. Console access may also require its platform subscription. These are dated documentation rules, not a current connection test. [VS-E](#vs-e)

Current 1.15/1.16 notes show continued desync, save and DLC-sharing work. A plan or groundwork for sharing does not itself supersede the FAQ's published ownership requirement. [VS-A](#vs-a)

**Interpretation:** multiplayer changes ownership, admission and interruption costs, not only transport. Independent roaming removes some shared-camera negotiation while a host departure introduces a different collective dependency.

## 16. DLC and collaboration boundaries

The inspected Steam DLC catalog lists eight gameplay packages, plus a separate soundtrack. Dates below identify those packages, not the introduction of every later feature inside them. Paid/free is the inspected storefront classification, not a permanent price promise. [VS-X](#vs-x)

| Package | Release | Access and identity |
| --- | --- | --- |
| Legacy of the Moonspell | December 15, 2022 | Paid; Moonspell clan and eastern-fantasy setting. |
| Tides of the Foscari | April 13, 2023 | Paid; academy/fairy-tale adventure. |
| Emergency Meeting | December 18, 2023 | Paid; Among Us collaboration. |
| Operation Guns | May 9, 2024 | Paid; Contra collaboration. |
| Ode to Castlevania | October 31, 2024 | Paid; Castlevania collaboration. |
| Emerald Diorama | April 10, 2025 | Free; SaGa: Emerald Beyond collaboration. |
| Ante Chamber | October 28, 2025 | Free; Balatro collaboration. |
| Legacy of the Bloodmoon | August 28, 2026 | Paid; Bloodmoon clan expansion. |

**Emerald Diorama** adds Glimmer: attacking with eligible weapons can reveal an additional technique. Fleuret can acquire a freezing cutting technique, for example. Its characters also include paired/puppet allies and a low-health Showstopper burst. These are defined conditions, not arbitrary emergent ability invention. [VS-Y](#vs-y)

**Ante Chamber** translates Balatro motifs into this game's activity: Jimbo amplifies Survarot stat rewards, Chicot changes bosses, and Fibonacci Seltzer can trigger other weapons. The Outer Saboteur spends the player's coins offensively. A collaboration therefore can modify resources and triggers instead of simply importing a costume; it does not turn the game into Balatro's turn-based hand scoring. [VS-Z](#vs-z)

**Bloodmoon** adds twelve characters, sixteen-plus weapons/evolutions, eleven tracks, an Adventure and a large stage. Its release accompanies free Moonspell additions and base 1.16 work; those are different entitlements. The exact original announcement and inspected official-text mirror are preserved below. [VS-B](#vs-b)

**Interpretation:** expansion packs can deepen a shared grammar through new eligibility, resources and relationships. The counterpressure is discoverability: more content can dilute the pool from which a player is trying to construct a particular experiment.

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

Adventures add short, connected chapter objectives within their limited inventories (§12). The developer treats their lore playfully rather than presenting a comprehensive, authoritative history of a simulated society. [VS-Q](#vs-q)

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

The player surfaces contain both praise for spectacle and complaints about menus, readability and performance. These are particular experiences, not uniform hardware results. [VS-D](#vs-d) [VS-O](#vs-o)

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

## 23. Steam and other direct player evidence

### Actually inspected helpful-positive sample

The English **Most Helpful (All Time)** general surface was successfully reopened during the audit remedy. **Baron Calamity, January 15, 2022**, values controls that work for their access needs and later appended a positive release-edition update. **hsagebear0, February 2, 2024**, similarly values one-handed movement and simple menu inputs. **Osirus, February 21, 2022**, values immediate, low-ceremony repeat play. These are specific accounts of accessibility and appeal, not proof that the game is accessible to every disabled player. Present hours and later edits are not publication-time measurements. [VS-W](#vs-w)

Many highly ranked entries are jokes or price comparisons. They are retained as cultural context rather than coded as detailed mechanics evidence. The original pass's broader positive feed also recorded appreciation for content volume, inexpensive additions, music and relaxing escalation; that feed was not a helpful-ranked sample. [VS-O](#vs-o)

### Negative contrast and a narrower ranking claim

The ranked negative URLs repeatedly failed retrieval, including language and pagination variants. A reopened **Most Recent / Negative Only** page instead exposed a cached early-September surface. **caeris, displayed September 6 without a year**, dislikes cooperative waiting and repeated death; **jerry, September 5**, reports level-up freezes and an inability to rejoin; **lorainpsycho, September 1**, objects to obtaining a required Foscari progression tool through uncertain offers. These are directly read criticisms, **not all-time top-negative rankings or independent bug verification**. The displayed day/month is preserved without inventing a year. [VS-D](#vs-d)

The original pass separately recorded a September 25, 2026 account objecting to content-pool/Banish/Reroll burden. The reopened cache did not expose that same post, so it is retained as inherited evidence rather than a newly re-read account. The actual 1.16 Banish change and broader complaint about managing offers need not contradict one another. [VS-D](#vs-d) [VS-B](#vs-b)

Metacritic's original-pass 2026 sample includes praise for continued inexpensive updates and complaints about crashes/slowdowns, especially online. That is another self-selected surface, not representative telemetry. [VS-P](#vs-p)

**Interpretation:** simplicity can remove an access barrier while also leaving another player wanting more active control. Group progression can create negotiation or unwanted waiting. These are different preferences and failure modes, not one average satisfaction score.

## 24. Concrete situations

These are constructed rules-based illustrations, not claimed sessions played for this research.

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

### Situation F — delay a pickup to change the final inventory

**Goal:** include a known stage passive beyond the normal selected set. **Conditions:** its location is reachable and ordinary slots are not yet full. **Action:** finish selecting the intended six before collecting it. **Result:** acquisition order changes the final composition. **Next decision:** accept the travel risk or take the immediate benefit instead. This is a permitted pickup exception, not an arbitrary capacity increase. [VS-R](#vs-r)

### Situation G — renew a small campaign without deleting the larger one

**Goal:** repeat a favorite Adventure with another bonus emphasis. **Conditions:** that Adventure is complete. **Action:** Ascend and redistribute its supported bonuses. **Result:** local progression restarts while the main save remains distinct. **Next decision:** pursue the remixed route rather than assume every main-game weapon is immediately available. Exact unresolved FAQ coefficients are not required for the example. [VS-Q](#vs-q)

### Situation H — an apparent cap becomes a different kind of growth

**Goal:** keep developing an already maxed loadout. **Conditions:** Limit Break is enabled. **Action:** choose further weapon-stat upgrades, then collect an unmaxed stage passive. **Result:** ordinary upgrading temporarily returns before extra weapon growth resumes. **Next decision:** finish that new dependency or avoid adding it. A completion condition should be evaluated against actual current state. [VS-V](#vs-v)

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
| R01 identity / scope / promise | §§1–2, exact expansion inventory in §16 |
| R02 player actions / mechanics | §§2–16, including the formerly missing mode operations |
| R03 items / entities / composition | §§3–12, 16; acquisition-channel limits |
| R04 progression / economy / time | §§6–13, 16, 21; Adventure versus run versus permanent growth |
| R05 concrete interactions | §24, eight constructed cases |
| R06 people / AI / social / multiplayer | §§13–15; explicit ecosystem and continuity limits |
| R07 art / audio / interface / feel | §18 |
| R08 story / narrative | §§12, 16–17 |
| R09 production / development | §19 |
| R10 marketing / distribution / virality | §20 |
| R11 commercial / participation | §21 |
| R12 reviews / player feedback | §§22–23; actual helpful-positive and labeled negative alternatives |
| R13 inspiration / limits | §25 and section-level interpretations |
| R14 sources / preservation / navigation | this section + annotated sources |

**Mechanics-inventory check:** characters, stats/PowerUps, weapons/passives and capacity exceptions, evolutions, pickups/chests, movement/targeting, waves, death, gold/meta growth, Limit Break, Adventures/Ascension, Inverse/Endless, Arcana/Darkana, local/online multiplayer and all eight identified gameplay DLC packages are covered. There is no conventional crafting, settlement construction, NPC relationship/faction or dialogue-driven narrative system in the base game.

**Preservation check:** [the original chapter](../games/vampire-survivors.md) and [automation/co-op study](../mechanics/vampire-survivors-automated-attacks-evolution-and-cooperative-agency.md) remain intact. They preserve the targeting, evolution, geometric, engine-migration, game-value and cooperation evidence. Earlier five-review summaries and all five original constructed cases remain here, with later additions rather than replacement.

**Audit remedies applied:** the missing mode and progression frameworks are operationally explained, exact DLC scope and online restrictions are supplied, the helpful-positive page was actually read, and the exact Bloodmoon release was recovered. Failed ranked-negative requests are distinguished from the newly read recent-negative alternative. Conflicting official Adventure coefficients and cache dates remain explicit. The historical audit matrix is not the live tracker; current remedy state belongs in the progress ledger. No packet-wide preservation certification, fresh gameplay, soundtrack audition or performance test is claimed.

**Reading route:** compare §§7/10/11/12 for four distinct ways rules change; read the online FAQ before treating a group invitation as compatible; contrast the helpful control-access accounts with the cooperation complaints. Existing linked videos remain viewing routes, not footage represented as watched.

## Sources

<a id="vs-a"></a>**VS-A — [Vampire Survivors official Steam announcements](https://steamcommunity.com/app/1794680/announcements/?l=english).** poncle, accessed 2026-09-26. Original pass's 1.15/1.16, platform, content-management and performance history; not proof of every announced future release.

<a id="vs-b"></a>**VS-B — [Legacy of the Bloodmoon is out now](https://steamcommunity.com/games/1794680/announcements/detail/717913919982667417), [inspected official-text mirror](https://steamdb.info/patchnotes/24926490/).** poncle, August 28, 2026, build 24926490 / 1.16.100. The mirror's original link was followed; the direct page returned a shell. Relevant expansion, Moonspell, Banish and special-passive change sections read. Later planned platform/achievement work is not represented as already shipped by this announcement.

<a id="vs-c"></a>**VS-C — [Vampire Survivors automated attacks, evolution, and cooperative agency](../mechanics/vampire-survivors-automated-attacks-evolution-and-cooperative-agency.md).** Internal detailed study with adjacent community/official mechanic sources.

<a id="vs-d"></a>**VS-D — [Recent negative Steam reviews](https://steamcommunity.com/app/1794680/negativereviews/?browsefilter=mostrecent&p=1).** Accessed 2026-09-26. Original pass's late-September complaint is retained with its access attribution; the remedy's reopened cache shows earlier day/month-only posts by caeris, jerry and lorainpsycho. Ranked-negative variants failed. The recent page is not recast as all-time helpful ranking or independently verified current bug prevalence.

<a id="vs-e"></a>**VS-E — [poncle Online FAQ](https://poncle.games/vs-online-faq).** Official body reopened 2026-09-26. Independent movement, platform ecosystems, ownership, save acceptance and disconnect/rejoin restrictions. The page is marked under construction and contains launch-qualified mobile wording; no current all-platform connection test is implied.

<a id="vs-f"></a>**VS-F — [Vampire Survivors Review](https://www.nintendolife.com/reviews/switch-eshop/vampire-survivors).** Charlie Wacholz, Nintendo Life, 2023-08-16. Switch/local-co-op criticism.

<a id="vs-g"></a>**VS-G — [How Vampire Survivors Went From Hobby Project To Game Of The Year](https://www.gamespot.com/articles/how-vampire-survivors-went-from-hobby-project-to-game-of-the-year/1100-6511980/).** Steven T. Wright / Luca Galante, GameSpot, 2023-03-02. Developer-origin/growth account.

<a id="vs-h"></a>**VS-H — [How Vampire Survivors Was Rebuilt for Xbox Without Players Even Noticing](https://news.xbox.com/en-us/2023/04/13/vampire-survivors-dlc-2-launch/).** Xbox Wire / poncle interview, 2023-04-13. Engine migration and Game Pass/distribution account.

<a id="vs-i"></a>**VS-I — [Vampire Survivors gets surprise mobile release, and it's free](https://www.pcgamer.com/vampire-survivors-gets-surprise-mobile-release-and-its-free/).** PC Gamer, 2022-12-09. Historical mobile free/ad model.

<a id="vs-j"></a>**VS-J — [Vampire Survivors on Steam](https://store.steampowered.com/app/1794680/Vampire_Survivors/).** Steam, accessed 2026-09-26. Dynamic review counts/current product surface; SteamDB rating is a separate storefront-derived metric.

<a id="vs-k"></a>**VS-K — [Vampire Survivors review](https://www.pcgamer.com/vampire-survivors-review/).** Ted Litchfield, PC Gamer, 2022-10-27. Original 1.0 review.

<a id="vs-l"></a>**VS-L — [Vampire Survivors Review](https://nintendoworldreport.com/review/64583/vampire-survivors-switch-review).** Melanie Zawodniak, Nintendo World Report, 2023-08-16. Switch review.

<a id="vs-m"></a>**VS-M — [Review: Vampire Survivors](https://www.destructoid.com/reviews/review-vampire-survivors-switch-pc-indie-xbox/).** Destructoid, 2023. Full independent review from the original pass.

<a id="vs-n"></a>**VS-N — [Vampire Survivors review](https://godisageek.com/reviews/vampire-survivors-review/).** Chris White, God is a Geek, 2022-08-08. Early Access criticism of progression and visual first impression.

<a id="vs-o"></a>**VS-O — [Steam review feed](https://steamcommunity.com/app/1794680/reviews/).** Accessed 2026-09-26 in the original pass. Self-selected qualitative evidence, not a demonstrated helpful-ranked sample; remedy sampling is VS-W.

<a id="vs-p"></a>**VS-P — [User reviews](https://www.metacritic.com/game/vampire-survivors/user-reviews/).** Metacritic, accessed 2026-09-26 in the original pass. Dated individual accounts; not representative telemetry.

<a id="vs-q"></a>**VS-Q — [Adventures FAQ](https://poncle.games/adventures-faq).** poncle, reopened 2026-09-26. Chapter, inventory, reset and cross-mode reward rules. Mixed old/new Ascension coefficients and obsolete launch-future wording are explicitly not reconciled by invention.

<a id="vs-r"></a>**VS-R — [Weapons](https://vampire-survivors.fandom.com/wiki/Weapons) and [Passive items](https://vampire-survivors.fandom.com/wiki/Passive_items).** Community rules/game-description references, indexed relevant sections inspected 2026-09-26. Ordinary six-slot selection versus floor acquisition; old special-passive wording is qualified by the primary 1.16 notes. Exact expanding catalog counts are not copied.

<a id="vs-s"></a>**VS-S — [Stages](https://vampire-survivors.fandom.com/wiki/Stages), [Gracia's Mirror](https://vampire-survivors.fandom.com/wiki/Gracia%27s_Mirror) and [Seventh Trumpet](https://vampire-survivors.fandom.com/wiki/Seventh_Trumpet).** Indexed original-game mode/relic sections inspected 2026-09-26. Distinguishes harder conditions, display rotation, repeating waves and access; no exhaustive current coefficient table or personally reproduced unlock claimed.

<a id="vs-t"></a>**VS-T — [Arcanas](https://vampire-survivors.fandom.com/wiki/Arcanas).** Indexed selection/timing/exception sections inspected 2026-09-26. Ordinary three-card sequence is not a hard cap; exact exception strategies are not prescribed as universal optima.

<a id="vs-u"></a>**VS-U — [Moonlight Bolero](https://vampire-survivors.fandom.com/wiki/Moonlight_Bolero_%28VI%29), with Darkasso access in VS-S.** Indexed Darkana acquisition and extra-boss/chest behavior inspected 2026-09-26. Random outcomes are not guaranteed delivery of a selected passive.

<a id="vs-v"></a>**VS-V — [Limit Break](https://vampire-survivors.fandom.com/wiki/Limit_Break).** Indexed mechanics inspected 2026-09-26. Great Gospel, maxed-inventory condition, random selection, new-passive interruption and chest distinction; ordinary evolution/reset description not extended blindly to every later union.

<a id="vs-w"></a>**VS-W — [Most Helpful (All Time) Steam reviews](https://steamcommunity.com/app/1794680/reviews/?browsefilter=toprated).** English bodies actually read 2026-09-26. Baron Calamity, hsagebear0 and Osirus are identified in §23. Initial language-filtered request failed; this simpler route succeeded. Jokes, current hours and mutable votes are not a representative survey.

<a id="vs-x"></a>**VS-X — [Publisher's Steam DLC catalog](https://store.steampowered.com/dlc/1794680/Vampire_Survivors/).** Full nine-result listing inspected 2026-09-26: eight gameplay packs plus soundtrack. Exact release dates and free/paid boundaries; sale prices not frozen as permanent economics.

<a id="vs-y"></a>**VS-Y — [Emerald Diorama](https://store.steampowered.com/app/3451100/Vampire_Survivors_Emerald_Diorama/).** poncle, April 10, 2025; full relevant product body read. Glimmer, character-party examples and Showstopper are developer-described features, not independent quality or a general NPC cognition claim.

<a id="vs-z"></a>**VS-Z — [Ante Chamber](https://store.steampowered.com/app/3929770/Vampire_Survivors_Ante_Chamber/).** poncle, October 28, 2025; relevant product body read after following the catalog link. Free access, named effects and resource-spending sidekick; no Balatro hand-scoring system inferred from the collaboration's imagery.

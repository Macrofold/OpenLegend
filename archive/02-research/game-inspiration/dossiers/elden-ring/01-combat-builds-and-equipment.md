# Elden Ring — combat, builds and equipment

[Full dossier](../elden-ring.md)

**Research boundary:** base game, Shadow of the Erdtree, and Tarnished Pack; sources checked October 24, 2026. This chapter studies delivered rules and their design consequences. It does not claim firsthand play, reproduction of frame data, or access to FromSoftware's implementation. The official October 20 update identifies **App 1.17.2 / Regulation 1.17.3** for PlayStation, Xbox and Steam; the older 1.17 balance changes remain important when interpreting earlier guides. [C01](#c01) [C02](#c02)

## 1. The central design decision: several ways to become capable

Elden Ring layers player execution, character statistics, equipment development, tactical preparation and access to allies. These do not form one interchangeable difficulty setting. A stronger weapon changes what happens when an attack lands; a different moveset changes which openings the player can exploit; a spirit changes whom an enemy attacks. Treating all three as simply “more power” conceals the decisions the game offers.

Miyazaki's explanation supplies useful evidence of intent. In a translated account of his March 2022 Famitsu interview, he connects stance breaking, guard counters and jump attacks to adding depth to Souls melee. He describes Ashes of War as an expression of greater customization freedom, and spirits as both tactical choices and companions a player might simply like. He also says magic was consolidated into two broad disciplines because more catalyst divisions constrained builds. These are attributed design intentions; they do not prove every combination is equally viable or equally enjoyable. [C03](#c03)

**Analysis:** the unusual achievement is the combination of a demanding execution test with many ways to reshape that test. A player can improve at a particular duel, make a different character, or arrive with different support. The corresponding design risk is attribution: when the game does not explain why a tactic failed, a player may not know whether to practice, change equipment, raise survivability, or leave. More options help only when a player can discover and understand enough of them.

## 2. Character investment is a set of connected constraints

The eight attributes divide into survivability/resources—Vigor, Mind and Endurance—and requirements/scaling involving Strength, Dexterity, Intelligence, Faith and Arcane. Vigor increases health; Mind increases the FP used by many abilities; Endurance affects stamina and equipped weight capacity. Offensive attributes matter in relation to the weapon or catalyst actually used, rather than granting equal benefits to every attack. Arcane's item-discovery role is distinct from its role in compatible status builds. [C04](#c04)

A **soft cap** is a point where another invested level returns less benefit, not a prohibition on further investment. The official advanced-stats guide uses Vigor's 40 and 60 breakpoints to illustrate diminishing returns. Two-handing gives an effective Strength multiplier of 1.5 for supported weapon requirements/scaling; it does not grant the same multiplier to Dexterity or every component of damage. Thus changing how a weapon is held can make it usable before buying more levels. [C05](#c05)

**Analysis:** these constraints create opportunity costs. Spending on health can buy another mistake and more learning time. Spending on a new spell's requirement buys access, but may leave too little FP to use it comfortably or too little health to survive its casting commitment. A displayed character level therefore says much less about practical readiness than the distribution of that investment and the equipment it supports.

### Origins are opening conditions, with a lasting statistical floor

The original ten classes are Vagabond, Warrior, Hero, Bandit, Astrologer, Prophet, Samurai, Prisoner, Confessor and Wretch. They supply initial attributes and possessions, rather than exclusive career trees. The official class page explicitly presents them as starting points. The 2026 Tarnished Pack adds Heavy Knight and Idus Knight; analyses of the original ten should retain that release boundary. [C07](#c07) [C02](#c02)

The opening contrasts are instructive. Vagabond starts with sword, shield and halberd; Warrior introduces two scimitars; Astrologer starts toward sorcery; Prophet toward incantations; Samurai supplies a katana and bow. Wretch starts at level one with ten in every attribute, which does not automatically make it the most efficient choice for every specialized build. Starting points already spent on attributes the eventual build does not need remain relevant. [C08](#c08)

Rebirth at Rennala reallocates earned attribute points in exchange for a Larval Tear, after the player defeats her. It cannot reduce an attribute below the chosen class's initial value. Appearance changes are a separate option; changing a face is not the same transaction as rebuilding attributes. This is substantial reversibility with a cost and an unlock gate, rather than unrestricted experimentation from the first minute. [C09](#c09)

**Constructed case 1 — a heavy-feeling starting knight.** A newcomer chooses Vagabond, equips its supplied sword, halberd and shield, and finds the roll cumbersome. The class guide identifies this starting load as heavy. Removing the unused halberd changes the equipped burden without discarding it or earning a level. The immediate lesson is that possession and readiness are different: the player can keep options in inventory without paying their equipped weight. The next decision is whether to trade protection for mobility or invest in capacity. **Limit:** this does not fix poor dodge timing or every dangerous attack, and the lighter load does not itself teach why an attack connected. [C08](#c08)

### Loadouts are a constrained portfolio

Equipped weight is evaluated as a proportion of capacity: below 30% is light, below 70% is medium, below 100% is heavy, and 100% or more is overloaded. These are discontinuities; a small equipment change can cross a category boundary. Scaling grades from E to S summarize a contribution rather than specifying final damage by themselves. Weapon reinforcement, attributes and affinity interact, so the attractive letter is only one input to the decision. [C05](#c05)

**Analysis:** a class establishes an initial lesson; equipment determines the practiced lesson. A shield start invites observation through blocking, whereas a ranged start introduces spacing and resource expenditure. The ability to migrate between them broadens ownership of the character. But the cost of a change is distributed across attributes, upgrades, unfamiliar timing and resource supply. A respec interface can refund levels while the player still feels economically or psychologically committed to an old weapon.

## 3. Combat commitment and defensive choices

The publisher's combat guide explicitly describes **input buffering**: a pressed action can queue until it becomes executable. Repeated panic inputs can therefore produce an unwanted later dodge, while an attack already underway prevents an immediate evasive response. The same guide distinguishes blocking, parrying and guard counters. Blocking spends stamina and mitigates damage according to the guard; a parry is a timed deflection; a guard counter is an attack after a block and can still be interrupted by the enemy's next strike. [C06](#c06)

**Analysis:** the player is managing future vulnerability, not merely selecting damage. The important question is not “Can I hit now?” but “Can I finish this action, survive the response and still have resources for the next decision?” A slow move can be excellent when it creates an interruption or finishes the fight, and disastrous when its recovery overlaps an enemy continuation. This gives spacing, anticipation and restraint intrinsic value.

### Distinguish the different meanings of “stagger”

For design analysis, the following terms should remain separate. Community discussions sometimes call several of them “poise,” making superficially similar advice incompatible.

| Mechanism | What it concerns | Decision it makes important |
| --- | --- | --- |
| Ordinary hit interruption | Whether a hit prevents an actor continuing its current action | Can a light strike safely stop this opponent, or will it trade into the player's attack? |
| Armor poise | Resistance supplied by the equipped character configuration | Is additional weight worth tolerating a particular hit? |
| Hyperarmor | Action-dependent resistance to interruption during parts of an attack | Can this particular committed swing continue through contact? |
| Enemy stance depletion | Accumulated pressure that can expose a critical opening | Can the player maintain pressure long enough to earn a larger opening? |
| Guard break | A defensive guard failing under resource pressure | Is there enough stamina left to block the next strike? |
| Critical attack | A contextual high-damage response to an opening, including eligible backstabs and ripostes | Can the player reach and activate the appropriate position before the opening ends? |

The table is an analytical separation, not a claim that the implementation uses these exact six modules. The publisher guide describes stance breaks and critical opportunities; community poise work distinguishes passive armor contributions from weapon/action-dependent hyperarmor. The latter's numerical tables are explicitly versioned, and are not universal current-PvE thresholds. [C06](#c06) [C12](#c12)

Patch history makes that caution consequential. Update 1.10 explicitly separated PvP-only adjustments to poise damage, attack poise and evasive skills from general critical-hit changes. A dueling breakpoint or a particular patch's two-handed trade does not automatically describe a knight in a single-player dungeon. [C13](#c13)

**Analysis:** these layers reward different kinds of aggression. Interrupting a weak enemy can make rapid attacks safe; attempting the same behavior against an attack with hyperarmor can lose the trade. Building stance pressure creates a reason to act before the opponent fully resets, while stamina creates a reason to stop. Good combat emerges from the tension between those incentives. Poor explanation turns the same tension into apparently inconsistent rules.

### Defense is a choice of exposure, resources and position

The important comparison is not a hierarchy in which dodge always replaces block or parry always replaces dodge. Each defense buys something different. Blocking can preserve a close position while spending stamina. A dodge changes location and has timing commitments. A parry bets on an eligible move and a narrow timing opportunity. Simply standing outside a strike's reach can preserve resources and readiness, but requires reading its geometry. These are strategic interpretations of the action vocabulary, not measured success rates.

The combat guide differentiates a shield's damage negation from its guard boost: one concerns damage passing through; the other concerns stamina lost while blocking. It also emphasizes that charging heavy attacks, jumping heavies and guard counters can create stance pressure. A weapon's ordinary hit damage therefore cannot fully describe the value of an opening. [C06](#c06)

**Constructed case 2 — the guard-counter trap.** A shield user wants to punish a soldier safely. After blocking the first swing, the player immediately starts the counter, but the soldier's continuation lands during the response. On the next attempt, the player observes the combination, preserves enough stamina to finish defending, and counters its ending. The interaction has changed from “block enables free damage” to “block buys information and positioning.” **Limit:** a different opponent, elemental chip damage, a grab or a much larger stamina demand can invalidate the tactic. The example illustrates the timing rule; it is not a transcript of an observed session. [C06](#c06)

## 4. The weapon is an action vocabulary

An armament changes reach, direction, speed, recovery, contact frequency and access to skills. The base game's families include small blades, straight and curved swords, thrusting swords, katanas, twinblades, greatswords and colossal weapons; axes, hammers and flails; spears, halberds, reapers and whips; fists and claws; bows, crossbows and larger projectile weapons; shields, torches, staves and seals. This inventory is useful because it exposes different verbs, not because every member of a family is interchangeable. The weapon guide itself cautions that range, attack patterns and special abilities matter alongside attributes. [C15](#c15)

**Analysis:** compare attacks along six axes: where contact happens, when it happens, how long the player remains committed, how much resource it costs, what it interrupts, and what secondary effect it builds. A thrust can suit a narrow opening; a sweep can cover several targets; a long recovery can be acceptable after a stance break. “Higher damage” is a meaningful improvement only after specifying which opportunities actually occur. A shorter weapon can fail to connect after a dodge that leaves a longer one in range, making the theoretically faster option slower in practice.

### One hand, two hands, two weapons

Two-handing one armament makes its two-handed actions available while setting aside the other hand's active tool. A weapon can still block, but it does not inherit a dedicated shield's protection. Powerstancing uses a compatible weapon in each hand to gain combined attacks; ordinary right-hand actions remain available. The right comparison includes the loss of an actively usable shield or catalyst, the second weapon's weight, and the investment in developing both weapons. [C11](#c11)

**Constructed case 3 — meeting a requirement is not doubling a build.** Suppose a hypothetical supported weapon requires 30 Strength and the character has 20. The 1.5 effective-Strength rule makes it eligible when two-handed; this arithmetic is an illustration of the published rule, not a measured damage calculation for a named weapon. One-handing it to regain a shield reintroduces the unmet requirement. A Dexterity shortfall remains a shortfall. The next decision is whether the chosen stance is reliable enough for the intended encounters or whether permanent attribute investment is worthwhile. **Limit:** the example does not establish a 50% total-damage increase; scaling, damage components and the selected attack still matter. [C05](#c05)

### Shadow of the Erdtree expands movement expression

The expansion's additions include light greatswords, great katanas, backhand blades, beast claws, hand-to-hand arts, throwing blades, perfume bottles and thrusting shields. These matter because they change the physical performance available to a mature character. In Sarah James's first-person guide, Beast Claw is an acrobatic assault, Backhand Blade's skill combines evasion and an attack, Milady mixes thrusts with sweeping follow-ups, and Dryleaf Arts makes punches and kicks a primary style. Her reactions are a named player's judgments, not a popularity poll. [C10](#c10)

Perfume-bottle weapons also differ from consumable perfumes: the weapon's ordinary attacks do not spend a crafted bottle or FP. Smithscript Dagger provides repeatable throwing attacks rather than a stock of disposable knives, with range still a constraint. These are useful examples of turning an occasional utility action into a sustained character identity. [C10](#c10)

**Analysis:** expanding a mature action game can be more valuable through new movement relationships than through a succession of stronger stat sticks. The cost is readability: enemies and players need time to recognize unfamiliar sequences, and a visually spectacular new action can become a dominant answer if its protection, damage and interruption all exceed its commitments. Update 1.17's changes to throwing weapons and perfume bottles demonstrate that this balance remained a maintenance concern. [C02](#c02)

## 5. Skills, affinities and upgrades separate identity from power

Ashes of War associate a skill with compatible equipment and allow affinity choices. They can be reassigned at a Site of Grace without being consumed by the swap. Compatibility is constrained; possessing an Ash does not mean every weapon can use it. A shield's skill can take precedence over a right-hand skill, making the currently active skill and hand configuration important parts of the interface. Whetblades expand affinity access, subject to the weapon and skill combination. [C14](#c14)

Affinities form several broad choices: Standard retains a baseline; Heavy, Keen and Quality emphasize physical scaling; Magic, Fire, Flame Art, Lightning and Sacred alter elemental/scaling relationships; Cold, Blood and Poison introduce or emphasize buildup; Occult emphasizes Arcane scaling. Fire and Flame Art are different choices, despite sharing a damage type. The guide's claim that Occult universally prevents undead revival is not reliable and is deliberately not adopted here. [C14](#c14)

**Analysis:** this is a powerful separation of a weapon's silhouette and basic moves from the character investment that makes it effective. The player can enjoy a familiar blade's timing without being permanently bound to its default skill. Conversely, restricted and unique weapons preserve distinctive authored identities. The tradeoff is a larger compatibility matrix: “I found the right ability” may still mean “I need the right armament and unlock to apply it.”

Displayed attack rating is a useful comparison, but actual damage also depends on the move, the target's defenses and negation, and active effects. Tarnished.dev's author separates attack-rating and damage calculators for exactly these inputs; its documentation also accounts for PvP modifiers, incompatible buffs and selected movesets. This chapter uses that documentation as evidence of the required distinctions, not as a claim that its experimental calculations were reproduced. [C16](#c16)

**Constructed case 4 — the larger menu number disappoints.** A player switches an otherwise comparable weapon to a split-damage affinity because the combined menu total rises. Against a particular enemy, the actual hit does not improve enough to justify the change. The player tests the same attack and target, checks the damage types, then compares a physical alternative. The productive lesson is to compare controlled outcomes rather than treating a summed rating as a universal ranking. **Limit:** this does not mean split damage is inherently worse. Target weakness, attribute distribution, reinforcement and the skill can make it the better choice. [C16](#c16)

## Sources and access

Sources below were read as written bodies unless explicitly qualified. Official beginner guides are player explanations, not complete frame-data specifications. Community testing and patch notes must resolve edge cases before treating simplified advice as a universal rule.

<a id="c01"></a>**C01 — Current patch boundary.** [Bandai Namco, Elden Ring Tarnished Edition — Patch 1.17.2](https://www.bandainamcoent.com/news/elden-ring-tarnished-edition-patch-1-17-2), October 20, 2026. Official update: App 1.17.2 / Regulation 1.17.3, named platforms and specific fixes; no new content.

<a id="c02"></a>**C02 — Current major balance boundary.** [Bandai Namco, Patch 1.17](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-patch-notes-version-117), August 27, 2026. Official Tarnished Pack, parry/shield/weapon/spell changes and separate PvP changes.

<a id="c03"></a>**C03 — Attributed combat-system intent.** [Frontline Gaming Japan, Miyazaki release interview, part 2](https://www.frontlinejp.net/2022/03/08/discussing-design-philosophy-elden-ring-release-interview-with-director-miyazaki-part-2-2/), March 8, 2022. Translation/report of Weekly Famitsu's interview, not this researcher's interview or a transcript independently checked against Japanese print.

<a id="c04"></a>**C04 — Attribute roles and resistance families.** [Bandai Namco / FightinCowboy, Introduction Part 1 — Stats](https://www.bandainamcoent.com/news/elden-ring-introduction-part-1-stats), July 19, 2023. Officially published creator guide. Broad Arcane wording requires compatibility qualifications; armor does not inherit weapon-stat requirements.

<a id="c05"></a>**C05 — Diminishing returns and two-handing.** [Bandai Namco / FightinCowboy, Introduction Part 2 — Advanced Stats](https://www.bandainamcoent.com/news/elden-ring-introduction-part-2-advanced-stats), July 19, 2023. Officially published explanatory guide, not a universal numerical table for every weapon or later patch.

<a id="c06"></a>**C06 — Inputs and combat vocabulary.** [Bandai Namco / FightinCowboy, Introduction Part 4 — Combat Guide](https://www.bandainamcoent.com/news/elden-ring-introduction-part-4-combat-guide), July 19, 2023. Officially published creator guide. Its broad movement, poise and parry advice should not substitute for current attack-specific data.

<a id="c07"></a>**C07 — Class scope.** [Bandai Namco, official classes page](https://en.bandainamcoent.eu/elden-ring/elden-ring/classes), undated, accessed October 24, 2026. Official descriptions; page includes the two Tarnished Pack additions while introductory prose still describes the original ten.

<a id="c08"></a>**C08 — Opening configurations.** [PC Gamer / Lauren Morton, Elden Ring classes](https://www.pcgamer.com/all-elden-ring-classes-origins/), March 3, 2022. Original guide, starting-stat table and explicit Vagabond heavy-load warning. Used for initial conditions, not universal build rankings.

<a id="c09"></a>**C09 — Rebirth restrictions.** [Push Square / Liam Croft, How to Respec Character Stats](https://www.pushsquare.com/guides/elden-ring-how-to-respec-character-stats), displayed update August 26, 2026; and [VGKAMI / Reyadh Rahaman, How to Respec](https://vgkami.com/how-to-respec-in-elden-ring/), March 18, 2022. Original guides: Rennala, Larval Tear, base-stat floor and separate cosmetic option.

<a id="c10"></a>**C10 — Expansion weapon experiences.** [PC Gamer / Sarah James, Shadow of the Erdtree new weapon type locations](https://www.pcgamer.com/games/rpg/elden-ring-shadow-of-the-erdtree-best-weapons/), June 20, 2024. Written firsthand guide; consulted descriptive sections for movement and resource behavior. Not a frame-data source or exhaustive current weapon ranking.

<a id="c11"></a>**C11 — Hand configuration.** [Push Square / Damien McFerran, Two-hand and Power Stance weapons](https://www.pushsquare.com/guides/elden-ring-how-to-two-hand-and-dual-wield-power-stance-weapons), displayed update August 26, 2026. Original control guide. Its broad claims about always doing substantially more damage are not adopted as mathematical rules.

<a id="c12"></a>**C12 — Community poise distinctions.** [u/antungong, Hyper armour poise values for weapons](https://www.reddit.com/r/EldenRingPVP/comments/1eggrab/hyper_armour_poise_values_for_weapons_elden_ring/), July 29, 2024, later edited. Original community technical compilation, crediting Chrightt and Emilia and linking versioned motion/frame data. Read as evidence of attack-specific distinctions and testing practice, not reproduced or certified as current PvE values.

<a id="c13"></a>**C13 — PvP and general balance separation.** [Bandai Namco, Patch 1.10](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-patch-notes-version-110), July 26, 2023. Official notes explicitly distinguish PvP-only poise/evasion changes from general critical-hit adjustments.

<a id="c14"></a>**C14 — Ashes and affinity configuration.** [GamesRadar / Joel Franey and Will Sawyer, Ashes of War explained](https://www.gamesradar.com/elden-ring-ashes-of-war/), July 4, 2022. Original guide; read skill assignment, affinity and whetblade sections. Contains erroneous or overbroad advice, including Occult preventing undead revival and Quality as an automatic improvement; those claims are excluded.

<a id="c15"></a>**C15 — Weapon families and alternative functions.** [GamesRadar, Best weapons in Elden Ring](https://www.gamesradar.com/elden-ring-weapons-best/), displayed update accessed October 24, 2026. Original guide; used for weapon categories and named distinctions, not its subjective “best” ranking.

<a id="c16"></a>**C16 — Community calculation boundaries.** [Tarnished.dev, calculator documentation and change log](https://www.tarnished.dev/), data marked version 1.17, updated August 28, 2026. Primary documentation by the calculator's maintainer. No calculator-output reproduction or proprietary implementation claim.

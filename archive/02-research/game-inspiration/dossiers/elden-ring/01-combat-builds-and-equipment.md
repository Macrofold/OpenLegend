# Elden Ring — combat, builds and equipment

[Full dossier](../elden-ring.md)

**Research boundary:** base game, Shadow of the Erdtree, and Tarnished Pack; sources checked October 24, 2026. This chapter studies delivered rules and their design consequences. It does not claim firsthand play, reproduction of frame data, or access to FromSoftware's implementation. The official October 20 update identifies **App 1.17.2 / Regulation 1.17.3** for PlayStation, Xbox and Steam; the older 1.17 balance changes remain important when interpreting earlier guides. [C01](#c01) [C02](#c02)

## 1. The central design decision: several ways to become capable

Elden Ring layers player execution, character statistics, equipment development, tactical preparation and access to allies. These do not form one interchangeable difficulty setting. A stronger weapon changes what happens when an attack lands; a different moveset changes which openings the player can exploit; a spirit changes whom an enemy attacks. Treating all three as simply “more power” conceals the decisions the game offers.

Miyazaki's Famitsu interview connects stance breaking, guard counters and jump attacks with deeper melee, Ashes of War with customization, and spirits with tactics and attachment. He also explains that reducing magic's catalyst divisions broadened builds. These are attributed intentions in a translated account, not proof that every resulting combination is equally viable or enjoyable. [C03](#c03)

**Analysis:** the unusual achievement is the combination of a demanding execution test with many ways to reshape that test. A player can improve at a particular duel, make a different character, or arrive with different support. The corresponding design risk is attribution: when the game does not explain why a tactic failed, a player may not know whether to practice, change equipment, raise survivability, or leave. More options help only when a player can discover and understand enough of them.

## 2. Character investment is a set of connected constraints

Vigor supplies HP, Mind supplies FP, and Endurance affects stamina and equipped weight capacity. Strength, Dexterity, Intelligence, Faith and Arcane support requirements and scaling according to the chosen armament. Arcane also affects item discovery. The benefit of an offensive attribute depends on the weapon or catalyst using it. [C04](#c04)

A **soft cap** marks diminishing returns rather than a prohibition on investment. The official advanced-stats guide illustrates this with Vigor's 40 and 60 breakpoints. Two-handing also changes effective Strength for eligible requirements and scaling, as case 3 demonstrates. [C05](#c05)

**Analysis:** these constraints create opportunity costs. Spending on health can buy another mistake and more learning time. Spending on a new spell's requirement buys access, but may leave too little FP to use it comfortably or too little health to survive its casting commitment. A displayed character level therefore says much less about practical readiness than the distribution of that investment and the equipment it supports.

### Origins are opening conditions, with a lasting statistical floor

The original ten classes are Vagabond, Warrior, Hero, Bandit, Astrologer, Prophet, Samurai, Prisoner, Confessor and Wretch. They supply initial attributes and possessions, rather than exclusive career trees. The official class page explicitly presents them as starting points. The 2026 Tarnished Pack adds Heavy Knight and Idus Knight; analyses of the original ten should retain that release boundary. [C07](#c07) [C02](#c02)

The opening contrasts are instructive. Vagabond starts with sword, shield and halberd; Warrior introduces two scimitars; Astrologer starts toward sorcery; Prophet toward incantations; Samurai supplies a katana and bow. Wretch starts at level one with ten in every attribute, which does not automatically make it the most efficient choice for every specialized build. Starting points already spent on attributes the eventual build does not need remain relevant. [C08](#c08)

Rebirth at Rennala reallocates earned attribute points in exchange for a Larval Tear, after the player defeats her. It cannot reduce an attribute below the chosen class's initial value. Appearance changes are a separate option; changing a face is not the same transaction as rebuilding attributes. This is substantial reversibility with a cost and an unlock gate, rather than unrestricted experimentation from the first minute. [C09](#c09)

**Constructed case 1 — a heavy-feeling starting knight.** A Vagabond equips its supplied sword, halberd and shield, and rolls cumbersomely. The class guide identifies this load as heavy. Unequipping the unused halberd reduces burden without discarding it or earning a level: owning an option differs from keeping it ready. The next decision is whether to trade protection for mobility or invest in capacity. **Limit:** lighter equipment does not fix poor timing or explain every connected attack. [C08](#c08)

### Loadouts are a constrained portfolio

Weight categories use capacity percentages: light below 30%, medium from 30% to below 70%, heavy from 70% to below 100%, overloaded at 100% or more. A small change can cross a boundary. Scaling grades E–S summarize contributions; reinforcement, attributes and affinity also affect the result. [C05](#c05)

Armor does not follow weapon reinforcement levels. Tailoring changes eligible garments, and Boc can provide alterations without the usual charge after receiving his needle. These are different systems from upgrading a sword or shield. **Analysis:** preserving outfit choice without a separate armor-stone economy reduces one layer of replacement investment, while weight and defensive properties still make appearance a practical decision. [C48](#c48)

**Analysis:** a class establishes an initial lesson; equipment determines the practiced lesson. A shield start invites observation through blocking, whereas a ranged start introduces spacing and resource expenditure. The ability to migrate between them broadens ownership of the character. But the cost of a change is distributed across attributes, upgrades, unfamiliar timing and resource supply. A respec interface can refund levels while the player still feels economically or psychologically committed to an old weapon.

## 3. Combat commitment and defensive choices

The publisher's combat guide describes **input buffering**: an input can queue until executable, producing unwanted actions after panic presses. An attack already underway can prevent immediate evasion. Blocking mitigates damage while spending stamina; parrying times a deflection; a guard counter attacks after blocking and remains vulnerable to an enemy's continuation. [C06](#c06)

**Analysis:** the player is managing future vulnerability, not merely selecting damage. The important question is not “Can I hit now?” but “Can I finish this action, survive the response and still have resources for the next decision?” A slow move can be excellent when it creates an interruption or finishes the fight, and disastrous when its recovery overlaps an enemy continuation. This gives spacing, anticipation and restraint intrinsic value.

### Distinguish the different meanings of “stagger”

For design analysis, the following terms should remain separate. Community discussions sometimes call several of them “poise,” making superficially similar advice incompatible.

| Mechanism                 | What it concerns                                     | Decision it makes important                         |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Ordinary hit interruption | Whether contact stops an action [C17](#c17)          | Will this strike interrupt the enemy or trade hits? |
| Armor poise               | Equipped resistance to interruption [C12](#c12)      | Is tolerating a hit worth additional weight?        |
| Hyperarmor                | Action-dependent interruption resistance [C12](#c12) | Can this committed swing continue through contact?  |
| Enemy stance depletion    | Pressure exposing a critical opening [C06](#c06)     | Can pressure be maintained?                         |
| Guard break               | Stamina exhaustion while guarding [C47](#c47)        | Can the next strike be blocked?                     |
| Critical attack           | Contextual backstab or riposte [C06](#c06)           | Can the player reach the opening?                   |

The table separates player-facing concepts; it does not assert six implementation modules. Community poise tables are versioned, so their weapon-specific PvP values must not become universal current-PvE thresholds. [C12](#c12)

Patch history makes that caution consequential. Update 1.10 explicitly separated PvP-only adjustments to poise damage, attack poise and evasive skills from general critical-hit changes. A dueling breakpoint or a particular patch's two-handed trade does not automatically describe a knight in a single-player dungeon. [C13](#c13)

**Analysis:** these layers reward different kinds of aggression. Interrupting a weak enemy can make rapid attacks safe; attempting the same behavior against an attack with hyperarmor can lose the trade. Building stance pressure creates a reason to act before the opponent fully resets, while stamina creates a reason to stop. Good combat emerges from the tension between those incentives. Poor explanation turns the same tension into apparently inconsistent rules.

### Defense is a choice of exposure, resources and position

The important comparison is not a hierarchy in which dodge always replaces block or parry always replaces dodge. Each defense buys something different. Blocking can preserve a close position while spending stamina. A dodge changes location and has timing commitments. A parry bets on an eligible move and a narrow timing opportunity. Simply standing outside a strike's reach can preserve resources and readiness, but requires reading its geometry. These are strategic interpretations of the action vocabulary, not measured success rates.

Shield damage negation concerns damage passing through; guard boost concerns stamina lost blocking. Charged heavies, jumping heavies and guard counters create stance pressure beyond HP damage. Running, rolling and crouching change attacks. Rolling supplies invulnerability intervals; jumping or crouching can avoid particular attack geometry. [C06](#c06)

**Constructed case 2 — the guard-counter trap.** A shield user blocks a soldier's first swing and immediately counters, but the continuation hits during the response. Next time, the player observes the combination, preserves stamina and counters its ending. Blocking has bought information and positioning; choosing the counter's timing remains essential. **Limit:** a different opponent, elemental chip, a grab or a larger stamina demand can invalidate the tactic. This illustrates the timing rule; it is not an observed session. [C18](#c18)

## 4. The weapon is an action vocabulary

An armament changes reach, direction, speed, recovery, contact frequency and access to skills. The base game's families include small blades, straight and curved swords, thrusting swords, katanas, twinblades, greatswords and colossal weapons; axes, hammers and flails; spears, halberds, reapers and whips; fists and claws; bows, crossbows and larger projectile weapons; shields, torches, staves and seals. This inventory is useful because it exposes different verbs, not because every member of a family is interchangeable. The weapon guide itself cautions that range, attack patterns and special abilities matter alongside attributes. [C15](#c15)

**Analysis:** compare attacks along six axes: where contact happens, when it happens, how long the player remains committed, how much resource it costs, what it interrupts, and what secondary effect it builds. A thrust can suit a narrow opening; a sweep can cover several targets; a long recovery can be acceptable after a stance break. “Higher damage” is a meaningful improvement only after specifying which opportunities actually occur. A shorter weapon can fail to connect after a dodge that leaves a longer one in range, making the theoretically faster option slower in practice.

### One hand, two hands, two weapons

Two-handing one armament makes its two-handed actions available while setting aside the other hand's active tool. A weapon can still block, but it does not inherit a dedicated shield's protection. Powerstancing uses a compatible weapon in each hand to gain combined attacks; ordinary right-hand actions remain available. The right comparison includes the loss of an actively usable shield or catalyst, the second weapon's weight, and the investment in developing both weapons. [C11](#c11)

Paired equipment is a separate case: Hookclaws' item description explains that two-handing equips a claw on each hand. It supplies that paired identity from one item. Thus two visible weapons do not always mean two separately acquired and reinforced armaments. [C46](#c46)

**Constructed case 3 — meeting a requirement.** A hypothetical weapon requires 30 Strength; its user has 20. Two-handing's 1.5 effective-Strength multiplier satisfies that requirement. Returning to one hand for a shield loses eligibility; a Dexterity deficit would remain. The choice is between this handling constraint and further investment. **Limit:** the arithmetic does not establish 50% more total damage. [C05](#c05)

### Shadow of the Erdtree expands movement expression

The expansion adds light greatswords, great katanas, backhand blades, beast claws, hand-to-hand arts, throwing blades and perfume bottles, alongside thrusting shields documented in the patch notes. In Sarah James's first-person guide, Beast Claw supplies acrobatic assaults, Backhand Blade combines evasion and attack, Milady mixes thrusts and sweeps, and Dryleaf Arts centers punches and kicks. These are a named player's impressions, not a popularity poll. [C10](#c10) [C37](#c37)

Perfume-bottle weapons also differ from consumable perfumes: the weapon's ordinary attacks do not spend a crafted bottle or FP. Smithscript Dagger provides repeatable throwing attacks rather than a stock of disposable knives, with range still a constraint. These are useful examples of turning an occasional utility action into a sustained character identity. [C10](#c10)

**Analysis:** expanding a mature action game can be more valuable through new movement relationships than through a succession of stronger stat sticks. The cost is readability: enemies and players need time to recognize unfamiliar sequences, and a visually spectacular new action can become a dominant answer if its protection, damage and interruption all exceed its commitments. Update 1.17's changes to throwing weapons and perfume bottles demonstrate that this balance remained a maintenance concern. [C02](#c02)

## 5. Skills, affinities and upgrades separate identity from power

Ashes of War associate a skill with compatible equipment and allow affinity choices. They can be reassigned at a Site of Grace without being consumed by the swap. Compatibility is constrained; possessing an Ash does not mean every weapon can use it. A shield's skill can take precedence over a right-hand skill, making the currently active skill and hand configuration important parts of the interface. Whetblades expand affinity access, subject to the weapon and skill combination. [C14](#c14)

Affinities divide into Standard; physical-scaling Heavy, Keen and Quality; elemental/scaling choices Magic, Fire, Flame Art, Lightning and Sacred; buildup choices Cold, Blood and Poison; and Arcane-oriented Occult. Fire and Flame Art differ despite sharing a damage type. [C14](#c14)

**Analysis:** this is a powerful separation of a weapon's silhouette and basic moves from the character investment that makes it effective. The player can enjoy a familiar blade's timing without being permanently bound to its default skill. Conversely, restricted and unique weapons preserve distinctive authored identities. The tradeoff is a larger compatibility matrix: “I found the right ability” may still mean “I need the right armament and unlock to apply it.”

Attack rating does not specify actual damage without the move, target defenses/negation and active effects. Tarnished.dev separates these calculations and accounts for PvP modifiers and incompatible buffs. This is evidence of necessary distinctions, not a claim that its experimental calculations were reproduced. [C16](#c16)

**Constructed case 4 — the larger menu number disappoints.** A split-damage affinity raises the displayed total, but its actual hit disappoints against a particular enemy. The player compares the same attack and target with a physical alternative. Controlled outcomes reveal more than the summed rating. **Limit:** split damage is not inherently worse; target weakness, attributes, reinforcement and the skill can make it preferable. [C16](#c16)

### Reinforcement creates commitment; bell bearings relax it

Ordinary reinforcement reaches +25 through Smithing Stones, with an Ancient Dragon Smithing Stone for the final step. Tunnels supply stones; the first Smithing-Stone Miner's Bell Bearing, obtained in Raya Lucaria Crystal Tunnel, opens repeat purchases of early tiers at the Twin Maiden Husks. [C19](#c19)

Somber reinforcement uses one stone of the appropriate tier per step to +9, followed by a Somber Ancient Dragon Smithing Stone for +10. Bell bearings eventually open purchases of Somber tiers 1–9. The two tracks are different economies; a +9 ordinary weapon and a +9 Somber weapon are not equivalent positions on their respective tracks. [C20](#c20)

**Analysis:** found stones initially ask the player to choose what to trust. A supply unlock later converts an exploration achievement into freedom to experiment: the bottleneck moves from locating individual resources to paying for them. The final scarce upgrade preserves a last commitment. This is a promising progression pattern, but its order matters. If a novel weapon arrives before catch-up resources, discovery can feel like receiving homework; if every replacement is immediately superior and free, attachment and anticipation weaken.

A weapon's reinforcement is also distinct from the player's investment. Finding a new armament does not refund the old one's stones. The sensible first comparison is whether its actions and skill solve a desired problem, followed by the cost of bringing it to a comparable reinforcement level. **Analysis:** this makes a safe place to try moves valuable even when no formal training-room system is supplied. The practical uncertainty is often “Will I enjoy this?” before it is “Is its final optimized damage greater?”

## 6. Magic is a loadout and timing system

Sorceries normally use staves and incantations use sacred seals. A usable spell requires possession, a memorized slot, its attributes, a suitable equipped catalyst and sufficient FP. Incantations include attacks, recovery and enhancements; several add Intelligence or Arcane requirements, so Faith alone is an insufficient description. The input for a catalyst's hand casts the selected spell, while spell selection cycles separately. Many spells permit charging, trading additional commitment for an altered result. [C21](#c21)

Memory Stones expand the initial two spell slots, with eight stones bringing that capacity to ten before other effects. They are discoverable progression, including tower rewards and a Red Wolf of Radagon drop, rather than a direct benefit from buying more Mind. Mind's FP capacity and the number of different prepared spells therefore solve different problems. [C22](#c22)

Catalysts determine how character investment supports spellcasting and can favor a tradition. Clawmark Seal allows Strength to contribute to incantations and enhances bestial spells; Dragon Communion Seal brings Arcane into incantation scaling and enhances its named tradition. Meteorite Staff supplies gravity specialization and strong initial scaling, but cannot be reinforced. These are distinct relationships among attributes, chosen spells and upgrade trajectory, rather than interchangeable magic handles. The item descriptions establish the distinctions; they do not imply that all damage, healing and buff spells use identical scaling rules. [C49](#c49)

The major magical traditions supply distinct tactical shapes. This is a selective functional map, not a claim that every spell within a tradition behaves alike:

| Tradition or example                 | Action it adds                                             | Design question it poses                                                           |
| ------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Glintstone Arc                       | A widening horizontal magical attack                       | Are several targets aligned well enough to make one cast efficient?                |
| Carian Slicer / Adula's Moonblade    | A magical blade; the latter also projects frost            | Can a caster exploit a close opening, or overlap blade and projectile reach?       |
| Gravity, exemplified by Rock Sling   | Projectiles with substantial stance utility                | Is there enough time and space for the attack to connect?                          |
| Night, exemplified by Ambush Shard   | An attack originating behind the target                    | Can attack origin solve a defensive orientation problem?                           |
| Dragon Communion                     | Breath attacks, including elemental and rot forms          | Does the opportunity justify a long exposed cast?                                  |
| Dragon Cult                          | Lightning projectiles and spreading strikes                | Does target size or positioning make the spread useful?                            |
| Bestial                              | Fast stone attacks, claws and self-maintenance             | Is a quick utility action better than a large damage commitment?                   |
| Godskin black flame                  | Fire attacks with a continuing health-drain component      | Can a brief successful application keep contributing while the player repositions? |
| Two Fingers / Erdtree / Golden Order | Healing, protection, enhancements and specialized effects  | Is the next resource best spent recovering, preventing harm or attacking?          |
| Frenzied Flame                       | Attacks associated with madness, sometimes with self-costs | Is the target susceptible to the secondary effect?                                 |

The spell descriptions support these broad distinctions; numerical advice and sweeping “best spell” rankings in third-party databases are not assumed current. Rock Sling and Carian Slicer are especially clear counterexamples to treating all sorcery as the same ranged projectile. [C23](#c23) [C45](#c45)

**Analysis:** two broad casting interfaces lower handling friction without flattening all magic into one style. A player can develop a sorcerer who fights in melee, or a weapon specialist who equips a small set of utility incantations. Build identity emerges from a selected combination. The price is hidden dependency: a new spell may look available in inventory while one of several casting prerequisites is missing. Good onboarding must distinguish owning, preparing, equipping and being able to pay for an action.

**Constructed case 5 — the mage's expedition budget.** A caster reaches a boss with healing left but no FP. Shifting one shared flask charge from Crimson to Cerulean buys casting at the cost of recovery. Alternatively, the player reserves magic for dangerous enemies and uses melee elsewhere. The next attempt tests which resource runs out first. **Limit:** theoretical damage per FP does not guarantee success if casts miss or expose the player; allocating every charge to FP can reduce survivability. [C26](#c26)

## 7. Damage, status and resistance must not be collapsed

The damage model distinguishes physical attack types—standard, strike, slash and pierce—from magic, fire, lightning and holy components. An attack can also apply buildup or pressure without those being the same quantity as HP damage. The community motion-data definitions separately document damage multipliers, status multipliers, stamina damage, poise damage, hit reactions and shield penetration. They explicitly warn that adding two separate hits' motion values does not guarantee the same result as one large hit. [C17](#c17)

The resistance families are Immunity for poison/rot, Robustness for bleed/frost, Focus for sleep/madness, and Vitality for death blight. Poison and rot drain health over time; bleed causes a burst; frost combines a burst with a temporary vulnerability; sleep disables or disrupts susceptible targets; madness drains HP/FP and interrupts eligible Tarnished; death blight kills susceptible Tarnished when its buildup completes. These effects are not universally applicable to every enemy. [C04](#c04)

Arcane's status interaction is conditional. Community mechanics references distinguish bleed, poison, sleep and madness buildup on an Arcane-scaling delivery mechanism from frost, rot and death blight, which do not receive that same benefit. An innate bleed label on a weapon does not by itself prove that raising Arcane increases its buildup. This is community-documented behavior, not a complete new experiment performed for this dossier. [C24](#c24)

**Analysis:** status attacks add a second time horizon. Direct damage pays immediately; buildup rewards sufficiently concentrated application before the opportunity decays. A fast multi-hit pattern can be attractive for that reason, but a resistant or immune opponent changes the payoff. The same principle explains why “this build destroyed one boss” is weak evidence for universal balance. Different enemies exercise different portions of the build.

The useful player questions are separate: Which damage gets through? Can this opponent suffer the desired ailment? How many safe applications can the player obtain? What happens after activation? Does the effect help enough to justify losing direct damage, reach or survivability? **Analysis:** the pleasure comes from discovering a meaningful match. The frustration comes when an invisible immunity or an unexplained scaling exception turns a seemingly coherent build into a poor tool without telling the player why.

## 8. Support equipment changes priorities and temporal windows

### Talismans

Talisman Pouches expand the initial equipment allowance toward four talismans. The normal acquisition route includes Margit, Enia after two Great Runes, and the golden shade of Godfrey. These unlocks increase the number of effects that can be composed simultaneously. Examples of behavior-oriented effects include Claw Talisman improving jump attacks and Curved Sword Talisman improving guard counters. Their names are not interchangeable statements about weapon categories. [C25](#c25)

**Analysis:** a talisman can make the player practice an action by rewarding it. That is stronger behavioral guidance than a generic attack bonus. A limited set of slots also prevents collecting every talisman from becoming automatic accumulation of all benefits. The tradeoff is optimization pressure: if the same few unconditional bonuses outperform more expressive effects, the collection grows while practical choice narrows. Defensive and resource effects can have disproportionate value when they cross a threshold such as surviving another hit, but the game does not always expose those consequences plainly.

### Crimson and Cerulean flasks

The main flasks share an allocation of charges: Crimson restores HP, Cerulean restores FP. Golden Seeds expand charges; Sacred Tears increase restoration. The latter improve both flask types, while allocation remains adjustable at rest. This lets exploration improve the expedition's capacity and lets a player tune the same capacity to a different strategy. [C26](#c26)

**Analysis:** healing is not merely a stock count. It also needs an opening. A character may die with charges remaining because the encounter denied a safe use, or because repeated panic healing consumed the same unsafe opening. More charges then solve a different problem from stronger restoration, faster recovery, damage reduction or a tactic that creates space. This distinction is essential when evaluating difficulty and the design of aid.

### Wondrous Physick

The Physick is a separately refilled flask combining up to two crystal tears. Tears define effects including recovery, stamina support, damage enhancement, protection and specialized counters; Golden Seeds and Sacred Tears do not upgrade it like the ordinary flasks. The design adds a planned temporary window to a persistent equipment setup. [C27](#c27)

The expansion's Deflecting Hardtear is unusually consequential. Its item description improves protection immediately after assuming a guard and rewards a successful timely guard with stronger counters. It changes the timing behavior the player is rewarded for, rather than merely enlarging an existing number. [C28](#c28)

**Constructed case 6 — another defensive rhythm.** A player who continuously holds a shield prepares Deflecting Hardtear and learns to raise the guard just before contact, improving the subsequent counter. The next decision is whether to pursue that rhythm while the temporary benefit lasts. **Limit:** this is not a universal parry; attack eligibility, follow-ups and stamina still matter. No exact frame window or multiplier is asserted. [C28](#c28)

### Great Runes and Rune Arcs

Great Runes connect major victories, restoration at Divine Towers, equipped selection and a consumable activation. Examples differ: Godrick raises attributes, Radahn expands HP/FP/stamina, Morgott emphasizes HP, and Rykard restores health from defeated enemies. The Great Rune of the Unborn is a different case tied to rebirth. An ordinary equipped Great Rune's benefit requires a Rune Arc; after death, another Arc is needed to reactivate it. [C29](#c29)

**Analysis:** persistent acquisition paired with per-life activation creates an interesting emotional mismatch. The prize looks like permanent character progress, while practical use asks the player to wager a consumable on the current life. Someone learning a boss may hoard the aid precisely while needing help most. A more confident player may obtain more value from each Arc because it survives longer. The system can reward preparation and accomplishment while also amplifying an experience gap; whether that is desirable depends on the role assigned to the aid.

## 9. Crafting, ammunition, containers and loot

The Crafting Kit, sold by Kalé, allows consumable production outside combat. Cookbooks add recipes. The vocabulary includes projectile ammunition, throwing items, weapon greases, boluses, resistance food and perfumes. Ingredients turn travel and enemy hunting into options for the next encounter; recipes create knowledge-based unlocks. Crafting does not replace the separate armament reinforcement economy. [C30](#c30)

Cracked Pots are reusable containers: using their contents releases a vessel for further crafting. Stored throwing items can supply later rest refills while containers remain available for preparation. Carried quantity, storage and equipped weight are different constraints. [C31](#c31) Ritual Pots and Perfume Bottles serve distinct recipes, further separating ingredient supply from prepared capacity. [C30](#c30)

**Constructed case 7 — a small portable arsenal.** A player wants fire and sleep pots. Filling every vessel with one recipe commits the immediate allocation, even with ingredients for both. Used vessels return, but crafting waits until combat ends. The player prepares a mixed selection and revises it after seeing what matters. **Limit:** containers do not supply ingredients or make every enemy susceptible; no optimal recipe count is asserted. [C30](#c30) [C31](#c31)

**Analysis:** this system provides temporary access to effects without demanding an attribute respec. That makes side resources potentially meaningful to many builds. It also creates a familiar hoarding trap: when replenishment is uncertain and the player is still learning, spending a rare ingredient on a failed attempt can feel like losing future permission to experiment. The reusable-container rule softens one cost, but it cannot eliminate ingredient scarcity or the inconvenience of rebuilding a stock.

The item interface matters to this economy. Four directly addressable pouch positions supplement the cycling item slots. Keeping high-frequency actions easy to reach can make an apparently marginal consumable usable under pressure; burying it in a long cycle can make it functionally unavailable. PowerPyx's written guide and its reader comments document both the shortcut and frustration with cycling through a populated list to heal. These are interface observations and individual reactions, not a population-wide accessibility measurement. [C32](#c32)

Loot comes through placed treasure, merchant transactions, enemy drops and authored rewards. The official guide names the first three acquisition paths; they support different player expectations. A known chest rewards route knowledge, whereas a drop can invite repetition. [C18](#c18) Silver-Pickled Fowl Foot temporarily increases item discovery, showing that farming efficiency itself can become a preparation choice. This changes the chance of obtaining eligible drops; it does not turn every fixed reward into a different object or guarantee a desired item. [C33](#c33)

Remembrances convert particular major victories into a choice of associated equipment or spells, or runes. Wandering Mausoleums allow limited duplication, even after a Remembrance was consumed; the expansion provides additional duplication coffins. This is a second decision about the identity inherited from a boss, rather than a random roll for an unrelated prize. [C33](#c33)

**Analysis:** the reward's action is part of the encounter's memory. Learning to fear an enemy's spectacular move and then gaining an associated tool turns victory into imitation and appropriation. Conversely, a reward the current build cannot use may communicate future possibility or immediate disappointment. A generous respec and catch-up economy determines which interpretation wins. Catalog size alone is an incomplete measure of reward quality.

## 10. Spirit Ashes change the distribution of attention

Spirit Ashes are reusable ally summons, enabled by the Spirit Calling Bell near a rebirth monument. A screen icon signals availability. They are unavailable during multiplayer, and leaving the permitted area removes them. Resting restores spent summon availability. These constraints make them a prepared encounter resource, rather than a permanent party following every journey. [C34](#c34)

Their functions differ. Lone Wolves supply several bodies, a Jellyfish offers a different ranged presence, and Skeletal Militiamen can reconstitute if enemies do not finish their fallen forms. Roderika strengthens ashes through a separate Glovewort economy: Grave Glovewort for ordinary ashes and Ghost Glovewort for renowned ones, with Great Ghost Glovewort providing the renowned +10 step. Upgrading improves a chosen ally; it does not generally turn a one-creature ash into a larger squad. [C35](#c35)

The Mimic Tear is a particularly consequential composition tool. It uses HP to summon instead of the usual FP, and takes its equipment configuration from the player at the moment of summoning. Changing the player's equipment afterward does not change the copy. Its health is governed differently from the player's and depends on its own reinforcement. The ash is obtained from a chest in Night's Sacred Ground, not automatically as the reward for defeating the similarly named boss. [C36](#c36)

**Analysis:** summoning changes more than damage output. When an enemy attends to an ally, the player may gain a heal, a long cast, room to reposition, or a chance to attack from another direction. A companion that survives longer can therefore enable more damage than its own attacks suggest. Conversely, dividing attention can make turn-taking less predictable, and a companion can die before the player has learned the encounter's rhythm. This is why “summon strength” needs several measures: survival, interruption, targeting behavior, positioning, attack contribution and compatibility with the player's intended actions.

The system also extends the build into AI behavior. A Mimic equipped with a focused selection of tools has a different action menu from one copying an eclectic loadout. **Analysis:** this creates an accessible form of indirect party design. It can also produce disappointment if the companion has the right equipment but chooses the wrong moment. The player controls preparation much more directly than execution; the interface should make that boundary understandable.

Update 1.13 demonstrates that support balance was actively differentiated. It improved the attack and defensive performance of non-Mimic spirits at higher ordinary upgrades and higher Revered Spirit Ash Blessing levels, explicitly excluding the Mimic. Thus launch-era declarations that one ash makes all others obsolete are not a sufficient description of later tuning. The official notes establish the intervention; they do not establish that the resulting roster became equally popular or equally effective. [C37](#c37)

## 11. Four encounters show what the systems actually ask of players

These are constructed decision walkthroughs grounded in documented rules and named player accounts. They illustrate different problems; they are not reports of new playtests or universal boss instructions.

### Constructed case 8 — Margit as a preparation and timing test

A player reaches Margit using repeated attacks after the first apparent opening. The combination of staff reach, magical daggers and a later hammer punishes the assumption that an enemy has only one cadence. Liam Croft's guide recommends reading full sequences, retaining stamina and using the openings after committed moves; it also describes Spirit Ashes and Rogier drawing attention. [C40](#c40)

The player now has several independent decisions: learn the attack ending, change the defensive tool, increase practical durability, or introduce an ally. Suppose the next attempt uses a spirit to create space but still attacks too many times when Margit turns back. The assistance has improved opportunity without fixing the player's commitment problem. **Analysis:** this makes Margit a useful diagnostic encounter: the same loss can reveal a timing problem or a preparation gap, and the player can choose which to address first. **Limit:** his role at Stormveil's entrance does not mean the whole open world must be solved through this fight immediately; nor does summoning promise a safe window whenever desired.

### Constructed case 9 — Starscourge Radahn as a battlefield

The Radahn Festival places summon signs across a large battlefield and permits Torrent. The opening ranged barrage, enormous melee reach and spectacular return from the sky change the relevant scale of movement. Fallen festival allies can become available through further signs, creating a support-management loop unlike an ordinary single ash summon. These are special encounter rules; they should not be generalized to every boss. [C41](#c41)

A player can ride between signs, restore pressure with allies and approach when attention shifts, or commit to a closer personal duel. The next decision changes with the battlefield state: attack, heal, reposition or recruit again. **Analysis:** the fiction of a festival becomes an action structure. The encounter's scale is communicated through participation and traversal, rather than just an enlarged health bar. **Limit:** using the available army is a choice, and surviving a large attack still requires recognizing its cue. An ally does not make the player immune to an attack covering their position.

Patch interpretation matters here. The April 4, 2022 regulation update restored attack power unintentionally reduced during the 1.03 balance adjustment. “Pre-nerf Radahn” therefore refers to a historical configuration, not a stable category explaining all later experiences. The official correction concerns particular attack power, not a declaration that every earlier change was reversed. [C42](#c42)

### Constructed case 10 — Malenia exposes the limits of generic safety

Malenia is an optional, two-phase encounter whose successful contacts heal her, including contacts against a shield. Waterfowl Dance combines rapid repeated attacks; the later phase adds rot-associated threats and a diving bloom. Sean Martin's first-person account describes heavy-weapon cooperation as productive while warning that an ally absorbing hits can feed her recovery. That is a documented tactical experience, not evidence that all spirits are useless or that shields never work. [C38](#c38)

Consider a shield user who survives a sequence but sees the boss regain health. The defensive action protected the player while surrendering progress. The next experiment might prioritize evasive positioning for that sequence while preserving the shield for emergencies. This encounter makes “I did not lose HP” and “that was a favorable exchange” visibly different judgments.

A discovered interaction adds another decision: a Freezing Pot can interrupt Waterfowl by triggering frostbite. The original toxicBird7 thread and contemporaneous report describe increasing resistance after successive applications. Recipe, ingredients, container, selected item and readiness now matter to execution. Earlier frost application or an action already underway can undermine the response. **Limit:** this is not unlimited interruption; no universal current pot count or timing window is certified here. [C39](#c39)

Reception reveals both sides. Morgan Park had largely ignored ritual pots for roughly 100 hours. Thread participants welcomed the discovery, criticized keyboard item access, or argued that Waterfowl dominated an otherwise enjoyable encounter. One described trying other thrown items unsuccessfully and abandoning the idea. These accounts identify reactions and discoverability failures without measuring their prevalence. [C39](#c39)

**Analysis:** a surprising counter can create delight and community knowledge. If the visible action is simply “throw something,” however, a failed ordinary projectile may teach the wrong rule. The actual distinction is triggering an effect with the required interruption behavior. The design lesson is to preserve meaningful discovery while providing enough feedback that a failed experiment narrows the player's understanding instead of closing an entire avenue incorrectly.

### Constructed case 11 — Promised Consort Radahn and readable difficulty

The expansion's final encounter supplies a particularly useful versioned case. Update 1.14 changed the opening behavior and some moves, reduced selected HP and stamina damage, reduced the reach of some non-weapon attacks, and improved attack-effect visibility. These are several different interventions: numerical tolerance, spatial demand, action sequence and perceptual clarity. [C43](#c43)

Suppose a player could survive a sequence only by keeping a greatshield raised and could not reliably identify its next strike through the visual effects. Lower damage alone might permit more failed readings; clearer effects can instead improve the information needed for learning. More recovery after a move can create a counterattack opportunity without requiring that all player attacks become stronger. **Analysis:** these distinctions let designers ask which part of difficulty is producing satisfaction and which part is merely obstructing comprehension.

Austin Wood's September 2024 first-person assessment welcomed the clearer effects, described more opportunities to retaliate, and said parrying could make the fight feel rhythmic. He also recognized that some players would miss the previous challenge. His account is useful evidence of a skilled player's evaluation; it is not a representative survey of pre- and post-update satisfaction. **Limit:** this constructed comparison isolates design questions, not controlled telemetry proving that any one patch element caused a change in completion or enjoyment. [C44](#c44)

## 12. What this combat design teaches, and where inference stops

The chapter's strongest transferable finding is **composition across several kinds of agency**. Equipment changes available actions; reinforcement changes their payoff; attributes govern requirements and resources; consumables introduce temporary answers; spirits change attention; encounter geometry changes which answers are practical. The meaningful unit of design is the resulting decision, not an isolated count of weapons, spells or bosses.

Five implications follow from the documented mechanisms and cases above. These are analytical proposals for evaluating another game's design, not claims that Elden Ring's sales prove each system caused success:

1. **Separate discovering an option from making it usable.** A new spell, weapon or companion needs comprehensible prerequisites and a reasonable path to practical readiness. Otherwise, collection can outpace meaningful choice.
2. **Give defensive success an understandable consequence.** Blocking, evading, interrupting and creating distance should expose different opportunities and costs. Malenia shows how strongly a boss-specific rule can overturn the normal value of an action.
3. **Let preparation alter the problem.** A companion or specialized consumable can change encounter structure, giving players reasons to explore, craft and experiment beyond raising damage.
4. **Make failure informative across layers.** The player needs enough evidence to distinguish bad timing, insufficient resources, an incompatible effect and a poorly chosen tool. Hidden breadth without feedback becomes dependence on external explanation.
5. **Treat readable action and numerical challenge as separate tuning controls.** Version 1.14 shows why visual clarity, recovery, stamina pressure and damage deserve distinct review. The reaction to one cannot be inferred from an aggregate “difficulty” label.

The evidence also places limits on imitation. This chapter supports a design hypothesis that expressive preparation can coexist with demanding execution. It does not show that every game should organize its whole progression around compulsory boss mastery. OpenLegend's broader survival-adventure and life activities require their own treatment of failure cost, voluntary challenge and time spent away from combat. The dossier's synthesis should evaluate these mechanisms against that intended experience.

## Sources and access

Sources below were read as written bodies unless explicitly qualified. Official beginner guides are player explanations, not complete frame-data specifications. Community testing and patch notes must resolve edge cases before treating simplified advice as a universal rule.

<a id="c01"></a>**C01 — Current patch boundary.** [Bandai Namco, Elden Ring Tarnished Edition — Patch 1.17.2](https://www.bandainamcoent.com/news/elden-ring-tarnished-edition-patch-1-17-2), October 20, 2026. Official update: App 1.17.2 / Regulation 1.17.3, named platforms and specific fixes; no new content.

<a id="c02"></a>**C02 — Current major balance boundary.** [Bandai Namco, Patch 1.17](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-patch-notes-version-117), August 27, 2026. Official Tarnished Pack, parry/shield/weapon/spell changes and separate PvP changes.

<a id="c03"></a>**C03 — Attributed combat-system intent.** [Frontline Gaming Japan, Miyazaki release interview, part 2](https://www.frontlinejp.net/2022/03/08/discussing-design-philosophy-elden-ring-release-interview-with-director-miyazaki-part-2-2/), March 8, 2022. Translation/report of Weekly Famitsu's interview, not this researcher's interview or a transcript independently checked against Japanese print.

<a id="c04"></a>**C04 — Attribute roles and resistance families.** [Bandai Namco / FightinCowboy, Introduction Part 1 — Stats](https://www.bandainamcoent.com/news/elden-ring-introduction-part-1-stats), July 19, 2023. Officially published creator guide. Broad Arcane wording requires compatibility qualifications; armor does not inherit weapon-stat requirements.

<a id="c05"></a>**C05 — Advanced stats.** [Bandai Namco / FightinCowboy, Part 2](https://www.bandainamcoent.com/news/elden-ring-introduction-part-2-advanced-stats), July 19, 2023. Official creator guide; illustrative thresholds, not every weapon's scaling table.

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

<a id="c17"></a>**C17 — Attack-data definitions.** [Community Motion Values and Attack Data](https://docs.google.com/spreadsheets/d/1j4bpTbsnp5Xsgw9TP2xv6d8R4qk0ErpE9r_5LGIDraU/edit), marked App 1.17.2 when accessed October 24, 2026. Primary community reference sheet, reached through the established Elden Ring data-resource collection. Read the definitions sheet; numerical tabs were not exhaustively exported or independently reproduced.

<a id="c18"></a>**C18 — Current introductory action and reward vocabulary.** [Bandai Namco, Tarnished Edition Starter Guide](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-tarnished-edition-starter-guide), August 27, 2026. Official written companion to a video; used its prose, not an unwatched video.

<a id="c19"></a>**C19 — Standard reinforcement.** [GamesRadar, Smithing Stones](https://www.gamesradar.com/elden-ring-smithing-stones/), displayed update August 14, 2026. Original guide; read upgrade and first bell-bearing sections. Broad claims about reaching all areas “anytime” are not adopted.

<a id="c20"></a>**C20 — Somber reinforcement.** [GamesRadar, Somber Smithing Stones](https://www.gamesradar.com/elden-ring-somber-smithing-stones-locations/), displayed update August 14, 2026. Original guide; one stone per step, tiers 1–9 purchase unlocks, separate final upgrade.

<a id="c21"></a>**C21 — Casting prerequisites and controls.** [Windows Central / Jez Corden, Brendan Lowry and Rebecca Spear, How to use incantations](https://www.windowscentral.com/elden-ring-how-use-incantations), June 17, 2024. Original guide; read controls, requirements and memorization. Its “all incantations require Faith” simplification is not adopted universally.

<a id="c22"></a>**C22 — Spell-slot progression.** [PowerPyx / imbroken963, Memory Stone locations](https://www.powerpyx.com/elden-ring-memory-stone-locations/), February 27, 2022. Original item-location guide; used slot count and representative acquisitions, not its incorrect implied prerequisite for all Roundtable access.

<a id="c23"></a>**C23 — Contrasting sorcery actions.** Gamer Guides item records for [Rock Sling](https://www.gamerguides.com/elden-ring/database/magic-spells/sorceries/rock-sling) and [Carian Slicer](https://www.gamerguides.com/elden-ring/database/magic-spells/sorceries/carian-slicer), undated, accessed October 24, 2026. Read item-text transcriptions and explanatory descriptions; no numerical performance measurement.

<a id="c24"></a>**C24 — Arcane compatibility.** [Recjawjind's original Steam mechanics answer](https://steamcommunity.com/app/1245620/discussions/0/4406290986182340111/), June 27, 2024; cross-checked against indexed descriptions of Eldenpedia's [Weapon Scaling](https://eldenring.wiki.gg/wiki/Weapon_Scaling) and [Arcane](https://eldenring.wiki.gg/wiki/Arcane). Steam body read; wiki direct requests returned 403, so those are corroborating indexed excerpts only. Community rule explanation, not a publisher specification or reproduced test.

<a id="c25"></a>**C25 — Talisman functions and capacity.** Gamer Guides records for [Talisman Pouch](https://www.gamerguides.com/elden-ring/database/items/key-items/talisman-pouch), [Claw Talisman](https://www.gamerguides.com/elden-ring/database/items/talismans/claw-talisman) and [Curved Sword Talisman](https://www.gamerguides.com/elden-ring/database/items/talismans/curved-sword-talisman); plus [Upcomer / Joey Carr, Talisman Slots](https://upcomer.com/how-to-get-more-talisman-slots-in-elden-ring/), March 2, 2022. Item text and original guides. Upcomer's claim that Rennala herself directly awards a pouch is excluded; Enia's two-Great-Rune condition is retained.

<a id="c26"></a>**C26 — Flask allocation and upgrading.** [PowerPyx, How to Get More Flasks](https://www.powerpyx.com/elden-ring-how-to-get-more-flasks/), February 26, 2022. Original guide. Its all-HP/all-FP prescriptions are not adopted; allocation is a contextual tradeoff.

<a id="c27"></a>**C27 — Physick effects and refill.** Gamer Guides records for [Flask of Wondrous Physick](https://www.gamerguides.com/elden-ring/database/items/consumables/flask-of-wondrous-physick) and [Crystal Tears](https://www.gamerguides.com/elden-ring/database/items/crystal-tears), accessed October 24, 2026. Used item text and two-tear preparation rule, not stale durations or the index's mislabeled Cerulean entry.

<a id="c28"></a>**C28 — Timing-based defensive customization.** [Gamer Guides, Deflecting Hardtear](https://www.gamerguides.com/elden-ring-shadow-of-the-erdtree/database/key-items/reusable/deflecting-hardtear), undated, accessed October 24, 2026. Item-text transcription is the basis; database multipliers and timing claims were not reproduced and are not asserted here.

<a id="c29"></a>**C29 — Great Runes.** [PC Gamer / Sarah James, Great Runes](https://www.pcgamer.com/how-to-use-elden-ring-great-rune-arc/), May 31, 2022; [Push Square / Liam Croft, How to Use Great Runes](https://www.pushsquare.com/guides/elden-ring-how-to-use-great-runes), displayed update August 26, 2026. Original guides, respectively for functions/restoration and until-death activation.

<a id="c30"></a>**C30 — Crafting vocabulary.** [VGKAMI, Complete Crafting and Cookbook Guide](https://vgkami.com/elden-ring-the-complete-crafting-and-cookbook-guide/), September 7, 2022. Original guide; consulted kit, container and recipe sections. Base-game counts are not presented as counts including later DLC.

<a id="c31"></a>**C31 — Reusable-container rule.** [Gamer Guides, Cracked Pot](https://www.gamerguides.com/elden-ring/database/items/key-items/cracked-pot), undated, accessed October 24, 2026. Item-text transcription and storage explanation; distinguishes prepared inventory from permanent container ownership.

<a id="c32"></a>**C32 — Item access and individual reactions.** [PowerPyx, Quick Slots Item Wheel](https://www.powerpyx.com/elden-ring-how-to-use-quick-slots-item-wheel/), February 25, 2022, with dated reader comments. Original control guide and qualitative comments, not survey evidence.

<a id="c33"></a>**C33 — Discovery and victory rewards.** [Gamer Guides, Silver-Pickled Fowl Foot](https://www.gamerguides.com/elden-ring/database/items/consumables/silver-pickled-fowl-foot), undated; [PC Gamer / Sarah James, Remembrance duplication](https://www.pcgamer.com/elden-ring-remembrance-duplicate-wandering-mausoleum/), updated July 9, 2024. Item text and original guide; read duplication and base/DLC reward sections.

<a id="c34"></a>**C34 — Spirit availability and reset.** [Push Square / Liam Croft, Summon Spirits](https://www.pushsquare.com/guides/elden-ring-how-to-summon-spirits-and-use-ashes-summons), displayed update August 26, 2026. Original retail guide, read independently: Bell, monument, icon, area/multiplayer restrictions and rest reset. Its general FP statement has exceptions, covered separately.

<a id="c35"></a>**C35 — Ally types and reinforcement.** [GamesRadar / Joel Franey, Spirit and NPC summons](https://www.gamesradar.com/elden-ring-summons-ash-spirit-npcs/), accessed October 24, 2026; Gamer Guides item records for [Grave Glovewort 1](https://www.gamerguides.com/elden-ring/database/items/upgrade-materials/grave-glovewort-1) and [Great Ghost Glovewort](https://www.gamerguides.com/elden-ring/database/items/upgrade-materials/great-ghost-glovewort). Original guide and item text; the guide's claim that upgrades increase summoned creature count is excluded.

<a id="c36"></a>**C36 — Mimic configuration.** [GamesRadar / Joel Franey, Mimic Tear Ashes](https://www.gamesradar.com/elden-ring-mimic-tear-ashes-summon-boss-fight/), accessed October 24, 2026. Original guide, written equipment-snapshot, HP-cost and acquisition sections. “Perfect copy” is qualified by the guide's own health differences; uncertain AI/resource details are not universalized.

<a id="c37"></a>**C37 — Differentiated spirit and weapon tuning.** [Bandai Namco, Patch 1.13](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-patch-notes-version-113), page dated July 29, 2024. Official notes: non-Mimic spirit improvements, separate PvP adjustments and thrusting-shield fixes.

<a id="c38"></a>**C38 — Malenia's encounter and a player's tactics.** [PC Gamer / Sean Martin, with later updates, Malenia boss guide](https://www.pcgamer.com/hand-of-malenia-elden-ring-location-miquella/), displayed update May 21, 2025. First-person tactics and phases. Its earlier sentence implying shields stop her healing conflicts with its detailed explanation and is excluded; broad “useless” judgments are not statistics.

<a id="c39"></a>**C39 — Freezing Pot discovery and reactions.** [u/toxicBird7, original Waterfowl counter thread](https://www.reddit.com/r/Eldenring/comments/twhe86/simple_accessible_counter_for_malenias_waterfowl/), April 2022; [PC Gamer / Morgan Park, Malenia counter report](https://www.pcgamer.com/elden-ring-malenia-cheese-strategy/), April 6, 2022. Read original written comments, including consumables-only player falcon_punch123987, and Park's written account; did not claim independent video measurement. Thread samples are qualitative and self-selected.

<a id="c40"></a>**C40 — Margit action structure.** [Push Square / Liam Croft, Margit guide](https://www.pushsquare.com/guides/elden-ring-how-to-beat-margit-the-fell-omen), displayed update August 26, 2026. Original encounter guide; used moves, openings and available help. Recommended level and obsolete rune-reward figure are not adopted.

<a id="c41"></a>**C41 — Festival battle rules.** [GamesRadar / Joel Franey, Radahn boss fight](https://www.gamesradar.com/elden-ring-radahn-boss-fight/), accessed October 24, 2026. Original guide; read approach, NPC signs, resummoning and both phases. Subjective priority rankings and exact simultaneous-summon counts are not adopted.

<a id="c42"></a>**C42 — Historical Radahn correction.** [Bandai Namco, Update Notes 1.03](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-update-notes-103), page March 31, 2022, announcing April 4 distribution. Official App 1.03.2 / Regulation 1.03.3 correction of unintentionally reduced attack power.

<a id="c43"></a>**C43 — Expansion final-boss intervention.** [Bandai Namco, Patch 1.14](https://en.bandainamcoent.eu/elden-ring/news/elden-ring-patch-notes-version-114), page dated September 10, 2024. Official qualitative changes; no numerical reductions invented.

<a id="c44"></a>**C44 — Post-update first-person assessment.** [GamesRadar / Austin Wood, Consort Radahn after the nerf](https://www.gamesradar.com/games/action-rpg/2-years-later-elden-ring-players-dig-out-their-i-beat-radahn-before-the-nerf-stickers-as-early-runs-show-fromsoftware-really-took-a-bat-to-shadow-of-the-erdtrees-final-boss/), September 2024. Written appraisal by an experienced player. Used his observations and opinions; linked runs were not independently analyzed frame by frame.

<a id="c45"></a>**C45 — Magic traditions and representative spell shapes.** Gamer Guides [Sorceries](https://www.gamerguides.com/elden-ring/database/magic-spells/sorceries) and [Incantations](https://www.gamerguides.com/elden-ring/database/magic-spells/incantations), accessed October 24, 2026. Read relevant item-text entries for glintstone, night, cold, dragon, bestial, black-flame, protection and frenzy examples. These are qualitative selections; database-wide counts and stale numerical recommendations are excluded.

<a id="c46"></a>**C46 — Paired weapon text.** [Gamer Guides, Claws](https://www.gamerguides.com/elden-ring/database/weapons/claws), accessed October 24, 2026. Hookclaws' transcribed item description explicitly states that two-handing equips a claw on each hand.

<a id="c47"></a>**C47 — Guard failure tutorial.** [EIP Gaming, About Guarding](https://eip.gg/elden-ring/db/about-guarding/), accessed October 24, 2026. Transcription of the in-game tutorial: guarding spends stamina and fails when it is exhausted.

<a id="c48"></a>**C48 — Armor and tailoring boundary.** Push Square's [equipment upgrade guide](https://www.pushsquare.com/guides/elden-ring-how-to-upgrade-weapons-and-armour) and [Boc quest guide](https://www.pushsquare.com/guides/elden-ring-how-to-complete-boc-the-seamsters-quest-and-alter-garments-for-free), displayed updates August 26, 2026. Used explicit no-armor-reinforcement and tailoring-service passages; contradictory generic “weapons and armour” language and inaccurate Somber descriptions are excluded.

<a id="c49"></a>**C49 — Catalyst identity and scaling.** Gamer Guides item transcriptions for [Clawmark Seal](https://www.gamerguides.com/elden-ring-shadow-of-the-erdtree/database/weapons/sacred-seal/clawmark-seal/), [Dragon Communion Seal](https://www.gamerguides.com/elden-ring-shadow-of-the-erdtree/database/weapons/sacred-seal/dragon-communion-seal/) and [Meteorite Staff](https://www.gamerguides.com/elden-ring/database/weapons/glintstone-staffs/meteorite-staff), accessed October 24, 2026. Used authored descriptions and passive identities; excluded arbitrary build rankings, stale numerical tables and the overbroad claim that Clawmark eliminates Faith investment.

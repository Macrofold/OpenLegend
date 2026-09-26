# Caves of Qud — a strange world with usable social and physical rules

**G33 · Full research pass · September 26, 2026.** PC 1.0 and later delivered updates are the principal boundary; the Switch port, historical criticism and experimental features are distinguished. Sections 6–7 discuss major quest and endgame spoilers. This is source research, not a playtest, benchmark, code audit or claim to have watched linked footage.

[Earlier chapter](../games/caves-of-qud.md) · [Preserved mechanics study](../mechanics/caves-of-qud-bodies-cooking-and-social-knowledge.md) · [Roster](../research-roster.md) · [Progress](../research-progress.md)

## 1. Identity, versions and the first decisions

Caves of Qud is Freehold Games' single-player, turn-based science-fantasy RPG/roguelike, published by Kitfox. It combines authored places and quests with generated terrain, histories and inhabitants. Its central attraction is not simply procedural quantity: a creature's body, equipment, allegiance and knowledge can all matter to what the player can do. Version 1.0 released December 5, 2024. [P1]

The **Nintendo Switch version shipped February 16, 2026**; earlier Q4 2025/January plans are not its actual release date. Nintendo's listing provides a useful independent platform boundary. The official site's lingering sentence about a forthcoming 2024 release and the older press kit's projected 2023 release are stale, not competing evidence that 1.0 remains unavailable. [P3] [P4] [P5]

**Current update qualification:** the initially retrieved Steam announcement list stopped at September's Autoexplore Beta. A newer first-party itch.io post confirms **211.55, September 23, 2026**, with a default Standard autoexplore mode and a less CPU-intensive Performance mode that may take less direct routes. It also fixes interruption when domination breaks. These are delivered PC notes, not merely the beta's proposals. The announcement's performance claim is not a benchmark performed here. [P6]

The delivered June 25, 2026 **Burgeoning Summer Growth** update separately improved pathfinding, wet-map performance and other usability issues, including on Switch. It postdates the February port review. Neither that name nor the latest autoexplore patch is evidence that a planned major paid expansion has shipped. The reviewed store's add-ons are a soundtrack and pet content; no larger expansion was verified in this pass. [P2] [P1]

The first meaningful choice is the **cost of losing**. Classic uses permadeath. Roleplay checkpoints progress at settlements. Wander changes starting relationships and rewards exploration/social discovery rather than kills, without making every hazard harmless. Daily offers a fixed character/world seed for a single attempt. These are different contracts with the same underlying world, not a ladder from illegitimate to legitimate play. Their introduction is documented in the 2021 Palladium Reef notes. [P7]

## 2. Character construction and advancement

### Genotype is a development route, not merely appearance

A **mutated human** spends creation points on physical and mental mutations and can accept a defect for another constraint. Mutants earn mutation points as they level. Chimera and Esper restrict the mutation pool in different directions; Chimera can gain further body parts, while Esper concentrates on mental powers. Mutants normally cannot use cybernetics stations as True Kin do. These differences make a later find valuable to one build and useless to another. [M-MUTANT]

**True Kin** develop through found implants, compatible anatomy, license capacity and **becoming nooks**. Examples include night vision, carbide hand bones, dermal insulation, rapid-release finger flexors and optical bioscanners. An implant's existence, the license to install it and the appropriate body slot are separate prerequisites. Removing an implant normally frees capacity, but some implants are destroyed on removal. This is not the same progression as spending a point to rank up a mutant power. [M-CYBER]

Callings/castes and starting kits establish an initial bias rather than prohibiting later hybrid skills. Presets provide an entrance for players who do not yet understand the entire creator. David Flynn's review is especially useful here: he approached the game as a novice and used presets and Wander before understanding its broader possibilities. His enthusiastic surface experience is not presented as a completed campaign. [R5]

### Attributes and skills do different work

**Strength** affects carrying and melee penetration; **Agility** affects accuracy and dodging; **Toughness** affects health and physical resilience; **Intelligence** affects skill acquisition and technical capabilities; **Willpower** affects mental defense and cooldowns; **Ego** influences social commerce and mental powers. Attribute modifiers and the raw attribute are not interchangeable quantities. Raising one does not supply all the tools of a nominal fighter, diplomat or scientist. [M-ATTR]

Skill trees include Acrobatics, Axe, Bow and Rifle, Cooking and Gathering, Cudgel, Customs and Folklore, Endurance, Heavy Weapon, Long Blade, Multiweapon Fighting, Persuasion, Physic, Pistol, Self-discipline, Shield, Short Blade, Single Weapon Fighting, Tactics, Tinkering, Wayfaring and Nonlinearity. Skill-point purchases normally require attributes and prerequisite skills. **Reputation-based teaching can bypass those requirements**, so meeting a teacher is a build opportunity rather than only a lore conversation. [M-SKILLS]

Leveling, mutation growth, acquired technology, meals and relationships therefore form overlapping advancement tracks. The developer's 2020 Mutation Overhaul is a historical example of deliberate restructuring: rapid physical advancement gave selected mutations additional ranks at milestones. Long iteration should not be mistaken for a design that emerged untouched from its initial release. [P8]

## 3. Actions, combat, anatomy and special powers

### Time is an action resource

Movement, attacks, reloading, equipping, item use and waiting advance the turn system. **Quickness** controls action accumulation; **movement speed** changes the cost of movement specifically. A fast runner is not automatically equally fast at firing or applying an injector. Looking around is a free information action, while some equipment changes the cost of otherwise time-consuming actions. This makes inspection before commitment a tactical skill rather than wasted real-time reflex effort. [M-QUICK]

Combat distinguishes hitting from penetrating armor and from the resulting damage. Dodge value, armor value, weapon penetration and damage dice answer different questions; multiple successful penetrations can make a hit much more dangerous than its small damage die initially suggests. Offhand attacks and skill-specific maneuvers add another layer. The player must decide not just whether the next attack is accurate, but whether the weapon can meaningfully hurt the target. [M-MELEE]

Axes can support dismemberment, cudgels disabling strikes, blades their own stances or bleeding/precision abilities, while rifles, pistols, bows and heavy weapons differ in ammunition, handling and skill investment. Tactics such as movement, retreat, a force barrier or a different damage route can matter more than repeatedly attacking an unsuitable defense. The skill inventory is the authority for which moves belong to which discipline, rather than treating every weapon as an interchangeable damage statistic. [M-SKILLS]

### A body determines usable combinations

**Multiple Arms** adds arms, hands and a second hand-worn slot. Extra attacks have their own chance; it does not guarantee that every held weapon attacks every turn. Additional equipment can provide utility, but armor/dodge values are averaged across identical limb types rather than simply added. Most other bonuses, including resistances, follow different aggregation. More hands also do not automatically add missile-weapon slots. The earlier study preserves these important exceptions. [M-ARMS]

Anatomy is also vulnerable. Dismemberment can remove a means of acting or equipping an item; regrowth is more specific than ordinary hit-point healing. **Regeneration** accelerates recovery and can restore limbs, with parent parts regrowing before their dependent parts. At higher levels it removes more serious conditions. However, an established fungal infection is no longer treated as the removable effect that its onset was, so regeneration is not a universal cure button. [M-REGEN]

### Named powers change rules of access

**Domination** temporarily puts the player in another creature's body, using its inventory, abilities and social standing while leaving the original body inert. The original body taking damage can break the link. A failed attempt may anger witnesses; mentally shielded creatures resist this route. The power is therefore a capability transfer with a vulnerability, not a cosmetically reskinned remote camera. Permanent body-stranding interactions exist but are advanced exceptions, not the default promise of every use. [M-DOM]

**Precognition** creates a bounded vision from which the player may return to its starting state. Duration, cooldown and retaining access to the mutation matter. This is an in-world information power, distinct from Roleplay checkpoints or manually restoring a save. The amaranthine prism has a deliberately exceptional interaction with returning from a vision, illustrating that a nominal undo can itself have authored consequences. [M-PRECOG]

Other mutation families include wings and burrowing, phasing, gas production, electrical generation, flaming/freezing rays, telepathy, force fields, clairvoyance, time manipulation and mental attacks. Their relevant dimensions are body requirements, cooldowns, targeting, environmental exposure and countermeasures—not just a catalog of colorful spell names. The mutation index embedded in the body/power references separates physical, mental, defective and unfinished entries; unfinished Metamorphosis is not silently counted as an ordinary creator selection. [M-ARMS] [M-DOM]

## 4. Items, food, trade and the cost of surviving

### Crafting is learned transformation

Tinkering separates identifying artifacts, scavenging, disassembly, repair, deploying turrets/mines, crafting tiers and learning schematics. Buying the base tree alone does not teach every one of those actions. **Bits** are the shared component resource; **data disks** and teachers supply recipes; **Reverse Engineer** can learn from disassembly. An unwanted artifact can thus be equipment, sale value, components or a chance at reusable knowledge. Higher-tier fabrication also demands stronger technical qualification. [M-TINKER]

Energy cells power appropriate devices and can need replacement or recharge. A powerful found object may be unidentified, empty, incompatible with the current plan or expensive to maintain. Weapon mods, grenades, injectors, recoilers, light sources, tools, books and artifacts belong to different resource loops. The earlier eigenrifle example specifically preserves a weapon whose path through the world can damage unintended creatures; its friendly-fire implication must not be flattened into a generic ranged-upgrade example. [M-RECOIL] [M-TINKER] [Preserved mechanics study](../mechanics/caves-of-qud-bodies-cooking-and-social-knowledge.md)

### Meals can author conditional behavior

Cooking combines ingredients into ordinary bonuses or **triggered effects**. Dried lah petals and freeze-dried hoarshrooms can produce a meal that turns becoming afraid into a frost-ray event. That is a possible generated result, not the sole automatic outcome of combining the ingredients. A saved recipe preserves its specific outcome; Carbide Chef, recipe books and social exchange let the player acquire repeatable preparations. Prepared ingredients and a learned recipe are distinct possessions. [M-COOK]

This gives domestic preparation a role beyond filling a hunger meter. **Interpretation:** a temporary build can change the desirability of a status that is usually bad, while a remembered recipe turns discovery into an intentional tactic. The danger is comprehension: a player needs to know what triggered an effect, what supplied it and when the meal expires, or the composition becomes indistinguishable from random magic.

### Water is money, survival supply and social material

Trade is denominated in **drams of fresh water** held in containers. Sale proceeds therefore have physical capacity implications. Ego and faction relations affect normal prices; compact fixed-value trade goods can carry wealth more conveniently. The documented merchant system supplies effectively unlimited payment water rather than simulating each trader's finite bank balance. That distinction matters: a vivid physical currency does not imply a complete closed-loop economic model. The trading reference is marked with an older patch boundary, so exact pricing formulas are not presented as a fresh balance audit. [M-TRADE]

Liquids also carry hazards. **Glotrot** can advance from sore throat to a lost tongue, affecting dialogue, persuasion and trading. Contaminating one's water supply can make the illness interact with both health and wealth. Its conventional cure is specified in that world's **Corpus Choliys**, rather than a universally fixed internet recipe. Restoring a tongue and treating the disease are related but not identical tasks. [M-GLOTROT]

Survival is thus broader than health. A player can remain alive while losing the ability to communicate, use a limb, travel safely or maintain a build. Injectors, safe rest, appropriate regeneration, knowledge of cures and accessible settlements are different recovery tools; no source here certifies that every late-game effect has an inexpensive countermeasure. [M-REGEN] [M-GLOTROT]

## 5. Factions, companions and travel

### Social knowledge is operational

A legendary creature's description shows who values or despises it. The **water ritual** changes reputation according to those relationships, not just the creature's species. After becoming water-bonded, the player can exchange selected secrets for reputation and spend standing on teaching, information, a recipe or recruitment. Ritual membership can create obligations as well as benefits. This preserves the earlier misconception-and-correction example: one pleasant interaction is not a universally positive faction upgrade. [M-WATER]

**Interpretation:** generated relationships become useful when they change a route, teacher or ally the player can access. An amusing title or family tree alone may feel like garnish. The strongest connection is a fact that first enriches the character's identity and later helps the player make a decision.

**Beguiling** gains a controllable follower through a mental attack. Its ordinary limit is one beguiled creature; replacing it releases the previous follower. Losing a temporarily supplied Beguiling ability also releases its subject. Followers can receive gear, movement/attack orders and restrictions on ability use. A failed attempt can turn a neutral target hostile. These mechanics are distinct from reputation-based recruitment, Proselytize and robot-specific control. [M-BEGUILE]

The game consequently supports unusual companions without requiring each to have an authored romance arc. A creature can be a teacher, combatant, merchant, temporary ally or body to inhabit. Those roles overlap, but they are not evidence of unrestricted conversation or a universal emotional model. The dossiers' interest is how concrete permissions and relationships compose, not an unsupported claim that every inhabitant has human-like inner life.

### Place matters at several scales

Travel moves between an overworld and local zones, with subterranean strata adding depth. **Wayfaring** and region-specific Wilderness Lore change travel speed, becoming lost, regaining bearings and discovering sites. Learning how to reach a destination and surviving its local map are different challenges. Make Camp gives cooking and preservation a portable setting rather than requiring every meal to occur in a permanent home. [M-WAY]

**Recoilers** connect exploration to known destinations. They need charge and a usable escape situation; insufficient power can drain the cell without teleporting. A nearby hostile with a path can block activation, while a Force Bubble can change that path relationship. Ordinary destination-specific, programmable and reprogrammable devices differ. A device in the backpack is not equivalent to an unconditional rescue. [M-RECOIL]

Exploration is not principally a colony-construction or farming production game. Terrain destruction, portable tools, camps, storage decisions, settlement services and companions create practical places to return to, but they should not be mislabeled as a Valheim-style building progression. Flynn's complaint about understanding coordinates usefully shows that a world can have deep travel rules while its navigation language remains a barrier. [R5; interpretation]

## 6. World, quests and the late-game horizon

### Specific culture around generated facts

Joppa, Grit Gate, the Six Day Stilt, Kyakukya, Bey Lah, Ezra and the Spindle supply recognizable anchors. Barathrum and the Barathrumites link a technological quest to particular people; generated villages and historical sites supply local variation. Creatures and factions have evocative names and descriptions, while the world combines remnants of earlier civilizations with present communities that use and interpret them. This authored/generated mixture—not a claim that everything is random—is the premise identified in the developer history. [P5]

Starting outside Joppa does not remove the main campaign. Completing a generated village's work can lead to **A Signal in the Noise**, taking a stamped disk to Grit Gate; Joppa uses **A Canticle for Barathrum** for a related route. The different starting path need not supply identical equipment: the random-village route does not automatically award Joppa's droid scrambler. [M-SIGNAL]

**More Than a Willing Spirit** asks the player to recover and repair a waydroid from Golgotha. It is an expedition, retrieval and repair task rather than a requirement to kill every enemy. The documented route can be changed by flight and access to the shaft, but jumping without the relevant capability is not the same solution. Later core quests include Decoding the Signal, The Earl of Omonporch, Grave Thoughts, A Call to Arms, The Assessment, Pax Klanq, I Presume? and Tomb of the Eaters. [M-SPIRIT] [M-SIGNAL]

**Kith and Kin** in Bey Lah is a different kind of authored system. The player examines people and objects, collects circumstances and motives, then presents an accusation. Randomly selected evidence is established for the quest rather than generated anew each time the player looks. The clues used and conclusion reached can change the village's fate. It is neither a purely fixed whodunit nor a fully simulated crime with one universally recoverable history. [M-KITH]

### Major endgame spoilers: assembling a different body

**The Golem** connects late-game acquisition to a deliberately composite creation: a follower supplies a body model, a liquid acts as catalyst, a limb supplies atzmus, an advanced weapon the armament, an item the hamsa, and an entry from the player's chronology an incantation. Primordial soup and a suitable power source complete other requirements. This makes equipment, relationships, body parts and personal history ingredients in the same project. [M-GOLEMQUEST]

The result is a colossal creature that can act as companion or be piloted. Its equipment needs appropriate size; its body and other selected components change its capabilities. The follower used as a body model is not consumed. Piloting changes which inventory, abilities and statistics the player manages rather than only applying a temporary damage buff. [M-GOLEM]

**We Are Starfreight** leads to the final ascent, with **Reclamation** resolving the confrontation around the Spindle. Barathrum can accompany the player and can die; his presence is not strictly required to ascend. Reclamation's battlefield can reset when abandoned, and the ascent itself is a stated point of no return. A complete campaign exists, but the surrounding sandbox also supports stopping with a personal goal rather than measuring every run by reaching that ending. [M-RECLAIM] [M-STAR]

## 7. Eight worked situations

These are constructed illustrations of documented behavior, not newly observed gameplay. Earlier attributed player examples remain in their original owners.

### A. Four hands are not four times the armor

**Goal:** carry a light, shield and several weapons. **Setup:** Multiple Arms plus appropriate equipment. **Action:** distribute useful objects across the new slots. **Interaction:** added hands increase combinations and possible attacks, while armor/dodge aggregation prevents simply multiplying protection. **Outcome/next choice:** improve offhand skills or prioritize utility instead. More anatomy creates a resource allocation problem, not a universal upgrade. [M-ARMS]

### B. Fear becomes a planned trigger

**Goal:** turn a likely encounter condition into an advantage. **Setup:** the specific learned fear-to-frost recipe and its ingredients. **Action:** prepare that recipe before exposure. **Interaction:** the meal supplies an event-to-effect relationship; random ingredient cooking alone does not guarantee it. **Outcome/next choice:** preserve the repeatable recipe or search for another trigger better suited to the build. The case retains the earlier study's distinction between discovering a combination and owning a stable result. [M-COOK]

### C. A teacher has enemies

**Goal:** learn a skill without following its usual purchase path. **Setup:** a non-hostile legendary teacher, ritual liquid and sufficient standing. **Action:** inspect affiliations, perform the ritual, then exchange reputation for teaching. **Interaction:** knowledge and faction standing become convertible resources, but befriending this person can worsen another relationship. **Outcome/next choice:** accept that social cost, find another teacher or earn standing elsewhere. [M-WATER]

### D. The body left behind is part of the plan

**Goal:** scout with another creature's abilities. **Setup:** Domination, an eligible target and an original body positioned safely. **Action:** take control and explore. **Interaction:** the controlled body's capabilities and faction standing apply, while the original remains inert. **Outcome/next choice:** return before exposure breaks the connection or select a safer staging point. The same power used in an open fight has a very different risk profile. [M-DOM]

### E. A sore throat interrupts an economic plan

**Goal:** return from an expedition, sell loot and continue a dialogue quest. **Setup:** developing glotrot and a limited clean-water reserve. **Action:** ignore early symptoms and continue traveling. **Interaction:** the progressing illness can contaminate supplies and ultimately disable normal speech. **Outcome/next choice:** seek the cure and appropriate restoration rather than merely sleep to full health. A status becomes a new goal through its effects on other systems. [M-GLOTROT]

### F. A recipe is worth more than its source object

**Goal:** make a useful artifact repeatedly. **Setup:** sufficient Tinkering, an example item and the relevant learning/disassembly capability. **Action:** disassemble rather than sell or equip it. **Interaction:** component recovery and a chance to learn are exchanged for immediate possession. **Outcome/next choice:** obtain missing bits, find a data disk or preserve the next copy. The value of a find depends on the player's present knowledge, not just rarity. [M-TINKER]

### G. A barrier changes whether escape is permitted

**Goal:** use a charged recoiler while an enemy is close. **Setup:** enough energy, a destination and a Force Bubble. **Action:** establish the barrier, then activate the device. **Interaction:** blocking the hostile's path can satisfy the escape condition even without increasing raw distance. **Outcome/next choice:** recover at safety or replace the depleted power source. This is spatial composition, not an arbitrary exception labeled clever solution. [M-RECOIL]

### H. A companion becomes a model, not a sacrifice

**Goal:** create a late-game golem suited to the intended challenge. **Setup:** a qualifying experienced follower and the other required components. **Action:** select that follower as the body model and finish the construction choices. **Interaction:** anatomy becomes an input to a new usable creature, while the original ally remains. **Outcome/next choice:** equip and pilot the result, accounting for its size and altered abilities. The personal chronology input separately links the build to the player's journey. [M-GOLEM] [M-GOLEMQUEST]

## 8. Presentation, controls and accessibility

Qud's small tile vocabulary coexists with unusually elaborate prose. **Interpretation:** a restrained image can leave room for description to supply texture and identity, while inspection makes that description functionally relevant. The risk is that the player cannot tell which unfamiliar word describes flavor and which signals a lethal mechanic. Revealing everything visually would not automatically solve that semantic problem.

The credited presentation team includes Sam Wilson's tiles, Craig Hamilton's music, Brandon Tanner's additional music and A Shell in the Pit's sound design. These credits matter to the atmosphere: the experience is not simply a rules database with incidental decoration. The older press kit is used for this production attribution, not its obsolete release/platform projections. [P5]

The modern graphical interface, log, inventory, look command, journals and automated exploration reduce the handling burden without eliminating it. Bolding values the improved interface but still describes a substantial learning threshold. Flynn praises looking and automated navigation while struggling with coordinates. These are different usability layers: input convenience, information presentation and conceptual onboarding. [R1] [R5]

Ingram's **Switch** review reports cramped handheld text and the tradeoff between enlarging text and retaining world visibility. He likes the controller handling but reports pauses and technical friction in his reviewed build. Those are February observations, not measurements of the later June performance work. Franiczek separately reports that gamepad controls help his PC experience; neither port's result establishes the other. [R4] [R6] [P2]

English-only availability remains a practical barrier on the retrieved listings, especially because meaning is carried by language rather than just icons. Mancosu and Bella explicitly discuss that barrier for Italian/Spanish readers. Presets, Roleplay, Wander, remapping and automation can reduce different burdens, but none proves full accessibility for all visual, motor or cognitive needs. [P1] [P4] [R2] [R3]

## 9. Development, distribution and commercial evidence

The developer history traces work to **2007**, a first beta in **2010** and Steam Early Access in **2015**. Co-creators Jason Grinblat and Brian Bucklew describe an interest in both distinctive settings and generative systems. Additional contributors supplied design, programming, QA, visuals, sound and community work. It is misleading to treat the eventual breadth as either a one-person overnight project or output produced automatically by procedural generation. [P5]

The developer's public technical/design talks cover data-driven engines, procedural history, village generation and worldbuilding. The earlier mechanics study retains its developer-paper discussion of quest context; this pass does not claim to have newly read all linked papers or watched the talks. Their existence supports a documented design practice, not a verified account of current private implementation. The 2020 mutation rebalance and 2026 autoexplore options provide specific examples of changing systems after player use. [P5] [P8] [P6]

**Distribution evidence:** Steam, GOG and itch.io appear in the official routes; Nintendo supplies a later audience with a different control/display environment. The store also offers bundles, soundtrack and pet content. The public history, demonstrations and a language rich in memorable incidents give the game several ways to be explained beyond a conventional trailer. [P3] [P4] [P1]

**Interpretation:** the marketable unit is often a causally intelligible story—what the player became, why a creature stopped being hostile, or how a bizarre tool solved an ordinary problem. The world supplies a distinctive vocabulary, and the mechanics make some of that vocabulary actionable. This may help community circulation, but no consulted evidence isolates the sales contribution of a particular creator, trailer, award or platform.

**Dated commercial snapshot:** the September 26, 2026 Steam retrieval lists the US-dollar base price at **$29.99**, soundtrack at **$9.99** and Pets of Harvest Dawn at **$4.99**. It reports **10,745 English reviews, 95% positive**, and a recent thirty-day set of **86, also 95% positive**. These are review populations, not unit sales, unique players or retention. Model-based third-party sales pages disagree substantially; no verified private lifetime units, budget, receipts or profit figure was found, so their estimates are not converted into asserted financial results. [P1]

## 10. Six substantive reviews and direct Steam evidence

All six original written review bodies were read through their conclusions. Each supplies a different experience rather than six interchangeable positive scores.

| Reviewer, date and scope | Positive judgment | Limitation or useful disagreement |
| --- | --- | --- |
| **Jonathan Bolding, PC Gamer, December 5, 2024, PC** | Deep interactions acquire significance through an evocative, particular world rather than anonymous random content. | Abrupt deaths, loot variance and a steep learning threshold remain despite interface improvements. [R1] |
| **Lorenzo Mancosu, Multiplayer.it, December 20, 2024, PC** | Authored and procedural material combine with exceptionally expressive character possibilities. | Patience and English proficiency are substantial entry costs; combat and chaos can crowd out other intentions. Italian review paraphrased in English. [R2] |
| **Jesús Bella, Vandal, December 20, updated December 24, 2024, PC** | Repeatedly different situations and player-created stories reward curiosity. | Time and language requirements narrow accessibility. The page now shows a Switch product panel, but the article explicitly used a Steam review code; it is not a Switch review. [R3] |
| **Roland Ingram, Nintendo Life, February 24, 2026, Switch** | Vivid world, music and compelling turn-by-turn experimentation. | Cramped handheld UI, pauses and the conflict between long campaign investment and abrupt death. The full article acknowledges Roleplay/Wander; its earlier permadeath discussion is not a claim that the game has no alternative modes. [R4] |
| **David Flynn, GamingTrend, January 16, updated February 6, 2025, PC** | A novice finds presets, Wander and discovery surprisingly welcoming despite the underlying complexity. | Coordinates and explanatory gaps remain obtuse; he explicitly has only explored the surface, not exhausted the campaign. [R5] |
| **Aleks Franiczek, RPGFan, August 19, 2025, PC** | A completed campaign supports the authored world, flexible builds and gamepad controls; Roleplay enables sustained investment. | Learning and overload remain, and he wants greater musical variety. His completion-oriented account usefully qualifies the idea that permadeath is essential to the experience. [R6] |

### Helpful-review sampling method

The English **Most Helpful (All Time)** Steam surface yielded **400cats, Recommended, November 12, 2019, Early Access**. The body describes learning Reverse Engineering from a madpole village, the pleasure of inhabiting the setting, and generated histories becoming more predictable after extensive play. The later displayed 2,131.5 hours are not hours at publication; its development-cadence praise is historical testimony. [S1]

Several Negative Only URLs and the appreviews JSON endpoint failed. The unfiltered page did return **Most Helpful (Week)** with a negative body: **gurjani, Not Recommended, displayed September 15 without a year**, 4.3 currently displayed hours, one helpful vote on that surface. The writer recognizes depth and customization but rejects the frustration, UI, presentation and dependence on external explanations. The absent year is not invented; one vote is not substantial population support. [S2]

Thus the positive and negative samples use **different time filters**. They establish a contrast in experience, not a fair popularity contest or measurement of criticism prevalence. The filtered-route failures are retained as methodology, but they no longer mean that no negative body was read.

**Synthesis:** admiration for depth does not determine willingness to pay its learning or recovery cost. A compelling world can retain one player for thousands of hours and lose another before its systems become legible. Classic, Roleplay and Wander do not merely reduce a difficulty number; they change which kinds of curiosity are affordable.

## 11. Transferable patterns and their limits

These are research interpretations, not adopted OpenLegend requirements.

**Make identity constrain and enable action.** Anatomy, culture, equipment and affiliations are strongest when they affect usable verbs. A body plan without equipment consequences or a faction biography without social effects is weaker than the connected system. Do not copy every exception without a readable model of which slots and permissions apply.

**Treat information as a resource with a destination.** A secret matters because a faction wants it; a recipe matters because it reproduces a result; a data disk matters because it expands fabrication. Discoveries become useful when the player can see whom or what they connect to. This need not mean turning all lore into currency.

**Preserve specificity around generation.** The generated layer benefits from authored landmarks, a coherent lexicon and recurring institutions. More randomness can erode memory and make history feel interchangeable. The goal is a world the player can form expectations about, not permanent surprise without a stable frame.

**Let failure change the problem, not only the health bar.** Losing speech or a limb creates a recoverable objective with knock-on effects. The same mechanism can become tedious or exclusionary when the solution is too obscure or repeats too often. Explain relevant state and distinguish temporary disability, treatment and restoration.

**Separate experimentation from loss policy.** Qud's modes show that deeply interacting systems can serve different tolerances for replay. A long authored campaign and an unforgiving character-loss rule create a real tension; neither preference should be dismissed as misunderstanding the game.

**Automation must expose its contract.** The Standard/Performance autoexplore choice is a concrete tradeoff between route behavior and computation. More generally, delegated routine work should remain interruptible and explain what it will skip, risk or prioritize. CPU savings alone do not determine whether an automated behavior feels correct.

## 12. Preservation, source limits and coverage

Both prior owners were read in full and left unchanged. Their detailed body-slot aggregation, fear-to-frost cooking, legendary-reputation misconception, eigenrifle collateral, developer-paper annotations and viewing recommendations remain in place. This dossier adds the full-game pass rather than replacing those studies with a shorter survey.

The earlier chapter's videos and the official press kit's procedural-history/village/worldbuilding talks remain the viewing route. No footage was watched here, no timestamps were invented, and a talk description is not represented as its transcript. Search-result snippets from inaccessible reviews were not counted among the six full reads.

Community mechanics references sometimes display older patch stamps or stub warnings. They support the named established interactions, not a complete certification of every current balance value. Where a first-party current patch superseded an older list, the newer evidence wins. Novel endgame details are treated as spoilers and bounded to the cited quest descriptions, not an exhaustive ending transcript. No code, frame-rate benchmark or proprietary economy was inspected.

| Requirement | Coverage |
| --- | --- |
| R01 | Section 1: identity, release, platforms and modes. |
| R02 | Sections 2–5: actions, combat, creation, production, travel and recovery. |
| R03 | Sections 2–7: named skills, mutations, implants, items and nontrivial constraints. |
| R04 | Sections 1–6: advancement, material/social resources, loss and endgame. |
| R05 | Section 7: eight distinct worked situations. |
| R06 | Section 5: affiliations, ritual, followers, control and social limits. |
| R07 | Section 8: presentation, controls, UI and accessibility tradeoffs. |
| R08 | Section 6: authored/generated world, contrasting quests and campaign horizon. |
| R09 | Section 9: development history, contributors and documented iteration. |
| R10 | Section 9: distribution and explicitly labeled circulation hypotheses. |
| R11 | Section 9: dated price/review measures and unknown private financials. |
| R12 | Section 10: six substantive reviews and positive/negative Steam bodies with filter limits. |
| R13 | Section 11: transferable mechanisms, prerequisites and failure modes. |
| R14 | This section and annotated linked source families below. |

### Source register

Accessed September 26, 2026. **P1–P8** are first-party store, platform, developer history or developer patch text. **R1–R6** are original written criticism; **S1–S2** actual player bodies. **M-*** are community-maintained mechanics and quest documentation, with older version/stub limits described above. Earlier source evidence is credited to its repository owner rather than relabeled as newly inspected.

- **P1:** Steam listing; actual release, commercial snapshot and add-on boundary, not a sales ledger.
- **P2:** Official Steam announcements; June performance update and subsequent historical maintenance. The initially visible beta is superseded for autoexplore by P6.
- **P3–P5:** Official website, Nintendo listing and legacy press kit. Current platform delivery takes precedence over old projections; press-kit history/credits remain useful.
- **P6:** September 23, 2026 developer patch 211.55, read on itch.io.
- **P7:** Developer Palladium Reef notes reproduced by SteamDB; mode introduction and intended differences, not an assertion that all details froze in 2021.
- **P8:** Developer Mutation Overhaul explanation, 2020; deliberate progression redesign.
- **R1–R6:** Authors, review dates, platforms and qualifications are tabulated above. Full bodies were read, not merely their scores.
- **S1–S2:** English helpful-all-time and helpful-week samples respectively; dates/hours and access limitations preserved above.
- **M-ATTR through M-QUICK:** Character, action, body and power rules.
- **M-TINKER through M-WAY:** Material, economy, status, social and traversal rules.
- **M-SIGNAL through M-STAR:** Quest structures and endgame components; substantial spoilers.

[P1]: https://store.steampowered.com/app/333640/Caves_of_Qud/
[P2]: https://steamcommunity.com/app/333640/announcements/
[P3]: https://cavesofqud.com/
[P4]: https://www.nintendo.com/us/store/products/caves-of-qud-switch/
[P5]: https://cavesofqud.com/press-kit/
[P6]: https://freeholdgames.itch.io/cavesofqud/devlog/1675043/autoexplore-patch-september-23-2026
[P7]: https://steamdb.info/patchnotes/7592435/
[P8]: https://freeholdgames.itch.io/cavesofqud/devlog/182472/mutation-overhaul-our-biggest-mutation-rebalance-ever
[R1]: https://www.pcgamer.com/games/roguelike/caves-of-qud-review/
[R2]: https://multiplayer.it/recensioni/caves-of-qud-recensione.html
[R3]: https://vandal.elespanol.com/analisis/pc/caves-of-qud/32238
[R4]: https://www.nintendolife.com/reviews/switch-eshop/caves-of-qud
[R5]: https://gamingtrend.com/reviews/caves-of-qud-review-the-everything-machine/
[R6]: https://www.rpgfan.com/review/caves-of-qud/
[S1]: https://steamcommunity.com/app/333640/reviews/?browsefilter=toprated
[S2]: https://steamcommunity.com/app/333640/reviews/
[M-MUTANT]: https://wiki.cavesofqud.com/wiki/Mutated_Human
[M-CYBER]: https://wiki.cavesofqud.com/wiki/Cybernetics
[M-ATTR]: https://wiki.cavesofqud.com/wiki/Attributes
[M-SKILLS]: https://wiki.cavesofqud.com/wiki/Skills
[M-QUICK]: https://wiki.cavesofqud.com/wiki/Quickness
[M-MELEE]: https://wiki.cavesofqud.com/wiki/Melee_combat
[M-ARMS]: https://wiki.cavesofqud.com/wiki/Multiple_Arms
[M-REGEN]: https://wiki.cavesofqud.com/wiki/Regeneration
[M-DOM]: https://wiki.cavesofqud.com/wiki/Domination
[M-PRECOG]: https://wiki.cavesofqud.com/wiki/Precognition
[M-TINKER]: https://wiki.cavesofqud.com/wiki/Tinkering
[M-COOK]: https://wiki.cavesofqud.com/wiki/Cooking
[M-TRADE]: https://wiki.cavesofqud.com/wiki/Trading
[M-GLOTROT]: https://wiki.cavesofqud.com/wiki/Glotrot
[M-WATER]: https://wiki.cavesofqud.com/wiki/Water_ritual
[M-BEGUILE]: https://wiki.cavesofqud.com/wiki/Beguiling
[M-WAY]: https://wiki.cavesofqud.com/wiki/Wayfaring
[M-RECOIL]: https://wiki.cavesofqud.com/wiki/Recoiler
[M-SIGNAL]: https://wiki.cavesofqud.com/wiki/A_Signal_in_the_Noise
[M-SPIRIT]: https://wiki.cavesofqud.com/wiki/More_Than_a_Willing_Spirit
[M-KITH]: https://wiki.cavesofqud.com/wiki/Kith_and_Kin
[M-GOLEMQUEST]: https://wiki.cavesofqud.com/wiki/The_Golem
[M-GOLEM]: https://wiki.cavesofqud.com/wiki/Golem
[M-RECLAIM]: https://wiki.cavesofqud.com/wiki/Reclamation
[M-STAR]: https://wiki.cavesofqud.com/wiki/We_Are_Starfreight

# Dungeons & Dragons v.3.5: explicit machinery, specialization, and the cost of detail

Research date: 2026-09-27. This dossier studies the 2003 revision of third-edition tabletop D&D. It does not substitute Pathfinder, a computer-game adaptation, or a collection of internet homebrew for that ruleset. It is reference research, not an accepted OpenLegend design.

Navigation: [D&D hub](../games/dungeons-and-dragons.md) · [current revised edition](dungeons-and-dragons-2024.md) · [adjudication study](../mechanics/dungeons-and-dragons-adjudication.md) · [worldbuilding](../../worldbuilding/worlds/29-dungeons-and-dragons.md).

## 1. Why select this earlier edition?

D&D 3.5 is a useful contrast because it makes many of the relationships between character construction, situational modifiers, actions, equipment, and consequences explicit. Its common d20 foundation can look straightforward while the number of interacting exceptions becomes substantial. This is a particular comparison, not a claim that D&D history is a straight line from complicated to simple. Earlier Basic-style play, fourth edition, and later fifth edition solve different problems.

The 3.5 revision followed the 2000 third edition, whose credited principal designers were Jonathan Tweet, Monte Cook, and Skip Williams. Wizards of the Coast published the revised core books in 2003. The core Player’s Handbook, Dungeon Master’s Guide, and Monster Manual form the baseline; later books add options that a table must decide whether to admit. The 2013 premium reprints are not a new edition. The contemporary revision credits and exact development decisions are an evidence limitation here: no complete internal design archive or production postmortem was retrieved. [P1, R1–R4]

The promise is still collaborative fantasy adventure: describe intentions, use character capabilities and equipment, negotiate the situation, and let a DM adjudicate. The important difference is the density of the machinery behind those intentions. A character may become exceptionally good at a narrow task, and an unusual build can combine class levels, feats, equipment, and spells in ways that matter greatly. That rewards investment, but the player who simply chooses appealing names may not end up with the capabilities they imagined.

**Baseline source boundary:** the rules below use the 3.5 SRD as reproduced by d20srd.org. This is a third-party host of primary rules text, not Wizards’ current website. Its index also links optional psionics, epic rules, and variants; those are not silently treated as the PHB baseline. The mirror publishes a changes-from-SRD notice. Read exact entries when implementing any interaction; this dossier is not an exhaustive rules conversion. [S0]

## 2. Character identity and growth

The eleven core classes are barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, and wizard. Warlock is not one of these eleven. The class catalogue also includes NPC classes—adept, aristocrat, commoner, expert, warrior—and prestige classes such as arcane archer, assassin, duelist, eldritch knight, loremaster, and mystic theurge. The distinction matters: a skilled resident need not be represented as an adventuring fighter or wizard. [S1]

Six ability scores influence different forms of competence. Skill points are allocated to individual skills rather than represented by one shared proficiency bonus. Buying a class skill normally gives one rank per point; a cross-class skill normally costs two. Maximum ranks depend on character level and whether the skill is a class skill. This lets characters develop unusual mixtures, but makes each investment and prerequisite consequential. [S2–S3]

Feat selection and prestige-class prerequisites provide additional long-range construction. A feat may require earlier feats, an ability score, a base attack bonus, or another qualification. A prestige class can express a specific career or supernatural identity, but its desired identity may be inaccessible until the character has completed several prerequisite steps. Multiclass characters combine base attack and save progressions while keeping spellcasting progression separated according to their classes. “Character level,” “class level,” and “caster level” are therefore not synonyms. [S3–S4]

**Interpretation:** this offers two different pleasures. One is inhabiting a recognizable archetype; the other is assembling a machine whose interactions feel clever. They can coexist, but an efficient assembly may require choices the fiction does not naturally suggest. Conversely, a flavorful choice can carry a hidden opportunity cost. The GM and group must negotiate acceptable optimization, not assume that equal levels create equal practical power.

The ordinary progression horizon is twenty levels, with epic material available as a distinct extension. Early play has fewer capabilities and small margins for survival. Later spells, multiple attacks, improved skills, magic equipment, and prestige-class abilities can change both scale and the range of viable obstacles. No universal final boss, ranked ladder, or repeating endgame dungeon defines completion. A group’s goals, campaign premise, and tolerance for complexity determine when characters retire or a campaign changes form. [S1, S3–S4; R1–R5]

## 3. Skills, certainty, time, and consequences

A skill check generally combines a d20, ranks, the relevant ability modifier, and applicable adjustments. Some uses are opposed; others target a DC. A natural 20 does not automatically succeed at a skill check, and a natural 1 does not automatically fail. Training requirements, retries, time, and consequences belong to the particular skill. The system distinguishes not knowing how to do something from trying and performing badly. [S5]

Three procedures are especially useful references:

| Procedure | Meaning | What it does not mean |
|---|---|---|
| Take 10 | Under appropriate unthreatened, undistracted circumstances, use 10 instead of rolling. | The character obtains the best possible result or ignores a task’s requirements. |
| Take 20 | Spend twenty times the normal time when repeated attempts and the absence of failure penalties allow it. | Try safely despite a trap, spoiled materials, alert enemies, or another consequence from earlier failures. |
| Aid another | A qualifying helper usually makes the specified DC 10 check to grant +2. | Any number of irrelevant observers can automatically stack help on an individual task. |

These procedures are not merely speed shortcuts. They make **routine competence, sustained effort, and risky attempts** different activities. A specialist who can reliably finish a job in a safe workshop should not repeatedly embarrass themselves because the interface insists on a die roll. Conversely, unlimited retries under danger erase the very risk that made the check interesting. [S5]

Skills are also more granular than the current edition’s categories: Hide and Move Silently, Spot and Listen, Open Lock and Disable Device, Balance and Tumble, and separate Knowledge specialties carry different investments. The granularity can make a character’s particular strengths recognizable, but it also creates more points to allocate and more checks to request. A useful simulation can preserve the distinction between being seen and heard without requiring a new player-facing number for every sensory channel. [S2; interpretation]

### Diplomacy: a powerful abstraction with awkward edges

The 3.5 Diplomacy rule has five attitude categories, a table for changing attitudes, and explicit action time. The usual attempt takes at least a minute; a rushed attempt takes a full-round action with a substantial penalty. Certain trained skills provide synergy bonuses, and retries are generally ineffective after the target has heard the argument. Moving an indifferent NPC to helpful is DC 30; changing a hostile NPC to helpful is DC 50. [S6]

This is an illuminating contrast with the revised edition’s willingness-first Influence action. A numeric attitude transition can make social investment mechanically important, but a favorable attitude is not a complete specification of what an NPC will do. A helpful official may still have legal obligations, dependents, or insufficient authority. The DM has to translate the table into an actual relationship and request. Otherwise the player can treat diplomacy as an unrestricted control spell.

**Constructed example:** a negotiator can reliably exceed a threshold against a guild representative. The representative becomes willing to help obtain an audience. That does not give the representative ownership of the guild treasury or erase the council’s vote. The next decision is how to address the decision-making institution, not simply repeat the roll with a larger desired reward.

## 4. Combat as a coupled action system

A typical turn permits a standard action and a move action, or a full-round action; action substitutions and special actions have particular rules. A full attack is a central commitment: many characters cannot move a normal distance and still make all their iterative attacks. A five-foot step is a limited positioning exception, not ordinary movement added freely to every turn. The core action reference also includes swift/immediate action definitions used by later material; those should not be mistaken for the current edition’s Bonus Action and Reaction structure. [S7]

The game distinguishes ordinary Armor Class, touch AC, and being caught flat-footed. Fortitude, Reflex, and Will are separate saving-throw progressions. Cover, concealment, threatened areas, reach, flanking, weapon size, and attacks of opportunity interact. Casting, ranged attacks, movement, and item use can expose a character to attacks of opportunity under their respective rules. This makes location and timing strategically important while also increasing the number of exceptions everyone must remember. [S7–S8]

Grapple, trip, disarm, bull rush, overrun, sunder, charge, ready, delay, withdrawal, and fighting defensively are different approaches, not descriptions of the same attack. A combat maneuver often has eligibility, opposed checks, provoking behavior, and consequences for failure. A player’s colorful account does not automatically override those costs. The complete procedures are linked rather than reproduced here. [S8]

**Constructed example:** a fighter wants to stop a caster from retreating. Moving into an advantageous threatened area changes the caster’s available choices. However, a retreating enemy may have an appropriate escape, defensive casting option, ally, or movement technique. “I threaten the wizard” is neither guaranteed silence nor a universal taunt. The interesting next choice is whether to hold position, pursue, ready an action, or defend another ally.

### Injury and recovery

Zero HP usually leaves a character disabled; negative HP usually leads to dying, with death at −10. Stabilization, further damage, and particular exceptions matter. Natural recovery is slower than a modern full overnight reset: ordinary rest restores HP relative to character level, while extensive bed rest improves the rate. Nonlethal damage is tracked separately. Ability damage, ability drain, negative levels, poison, disease, and ordinary HP loss are not interchangeable injuries. [S9]

The interpretation worth retaining is that different harms can create different recovery tasks: shelter, skilled care, an antidote, a restorative spell, or rescue. The danger is bookkeeping without decisions, or a level-independent death buffer becoming disproportionately unforgiving as incoming damage rises. This dossier does not claim that either edition’s model is anatomical realism.

## 5. Weapons, armor, materials, and the object economy

Weapons differ by simple/martial/exotic proficiency, light/one-handed/two-handed handling, damage type, reach, range increments, ammunition, critical threat and multiplier, and special uses. A longsword, rapier, greataxe, longbow, crossbow, sling, lance, whip, and spiked chain can support distinct choices rather than forming one simple upgrade ladder. Masterwork quality gives a particular nonmagical improvement; an enhancement bonus is another concept. A critical threat normally requires confirmation instead of importing the newer edition’s attack-roll critical procedure. [S10]

Armor has AC, maximum Dexterity contribution, armor-check penalties, speed implications, and arcane spell-failure chances. Shields and different armor categories create combinations with their own constraints. The decision is therefore not merely “buy the highest armor number.” Equipment can interfere with the skills or casting approach that made a character valuable in the first place. [S11]

Special materials are unusually relevant to world simulation. **Adamantine** can bypass some object hardness and provide armor benefits; **mithral** reduces weight and modifies armor use characteristics; **cold iron** and **alchemical silver** interact with specified damage reduction; **darkwood** supplies another material/weight relationship; **dragonhide** offers a different armor material. These are discrete authored properties, not evidence that any imaginary alloy automatically inherits every property of its ingredients. Availability and material compatibility still matter. [S12]

**Constructed example:** adventurers expect creatures with a known vulnerability to a particular material. They must verify the threat, locate the appropriate weapon, decide whether to carry another load, and distinguish material effectiveness from magical enhancement. A costly preparation can be useful without making the weapon universally superior. The next decision is whether information is reliable enough to justify the expense.

Adventuring supplies such as rope, pitons, poles, lamps, containers, caltrops, alchemical fire, and tanglefoot bags enlarge the action vocabulary. They occupy space, have costs, and can be expended or lost. Ownership, carrying capacity, encumbrance, retrieval, and what an object can physically touch can all change a plan. A claimed item must actually be available; “I use my rope” cannot silently add one to inventory. [S13]

### Ordinary crafting, repair, and skilled labor

Ordinary Craft is a specialized Intelligence-based skill with explicit tools, materials, time, and progress. Materials normally cost one-third of the item’s price. A successful weekly check produces progress measured by the check result multiplied by the DC in silver pieces. Smaller failures waste time; failures by five or more also ruin materials. Daily progress uses a different currency unit. Masterwork work is an additional component, and repair normally costs one-fifth of the item’s price. [S14]

**Constructed illustration:** two craftspeople make the same priced object. Better skill can improve progress and make taking 10 sufficient; a harder voluntarily accelerated method can be faster but expose a less capable worker to material loss. A wealthy buyer does not automatically obtain instant completion. The next choice might be more labor, better tools, a simpler object, or postponing departure. This is a meaningful contrast with current crafting’s mostly time-and-material gate.

These are abstractions, not a full industrial economy. The printed-price/progress relationship can produce odd implications for different goods. It does not model every input commodity, workshop queue, labor contract, or local market. A simulation should test its economy rather than assume that a role-playing price table is an equilibrium model.

### Magical production

Magic-item creation uses specific feats and prerequisites as well as gold, time, and XP. Supplies commonly cost half the base price and XP commonly costs one twenty-fifth; mundane item costs and expensive spell components can add further costs. Production normally takes a day per 1,000 GP of base price, at least one day, with exceptions such as potions. Starting a second item abandons the first under the cited rule. The pricing guidelines are not permission to demand every mathematically imaginable custom effect. [S15]

This links production to an adventurer’s advancement resource and creates an interesting design question: should invention consume knowledge, fatigue, rare materials, opportunity, or permanent progress? Copying the XP cost would be a world-rule choice, not a neutral engine requirement. Preserve the conceptual separation between knowing a recipe, having permission, possessing inputs, performing work, and producing a validated object.

## 6. Magic, knowledge, and prepared contingencies

A 3.5 wizard typically prepares particular spell instances rather than choosing an all-day menu freely paid from interchangeable slots. Preparing the same spell twice occupies two preparations. Spellbooks, rest, quiet study, and deciphering another writer’s notation matter. Slots can be left open for later preparation, but an expended slot is not freely refilled during the day. Sorcerers offer a different known-spell/spontaneous-casting tradeoff. [S16]

Spell effects supply attacks, defenses, movement, communication, illusions, information, summoning, transformation, creation, and restoration. The specific spell still owns its range, target, duration, saving throw, components, and spell-resistance interaction. Extraordinary, supernatural, and spell-like abilities are distinct categories with different interactions; the current edition’s single concentration-limitation model should not be retroactively imposed on 3.5. [S17]

**Constructed example:** a wizard used the day’s prepared access spell earlier. A second locked barrier creates a real planning problem. A previously reserved slot, an ally, a scroll, tools, or a different route might help, but a request cannot rewrite the earlier preparation. The next choice is whether to spend scarce backup equipment or change the expedition. The fiction of preparedness becomes a persistent, checkable fact.

Spells such as Fabricate can interact with mundane production while retaining their own craftsmanship conditions. Illusions alter perceptions under their rules rather than automatically replacing physical objects. Information magic can bypass some investigation but does not grant every creature every truth. High-level travel and divination can radically change a campaign’s geography and information economy. A world that uses those capabilities regularly should show institutional responses rather than having every prison, merchant, and investigator ignore them. [S14, S16–S17; interpretation]

## 7. Exploration, society, monsters, and campaign life

Environmental and exploration systems include travel, carrying loads, climbing, swimming, falling, light and vision, weather, starvation/thirst, traps, doors, and damaging objects. The useful point is not that every trip needs all those checks. It is that the GM can bring a relevant procedure into focus when the constraint matters, then summarize routine movement. Distinguish the rule’s available detail from the amount of detail a given table actually uses. [S8, S13, S18]

Monsters can be advanced through Hit Dice, class levels, and templates under explicit constraints. A creature’s size, abilities, feats, attack capabilities, and challenge assessment can change together. This offers a powerful compositional reference: a veteran adversary or transformed creature need not be only a reskin. It also creates preparation work and does not guarantee balance from a calculated challenge rating alone. [S19]

NPC motives, routines, faction politics, grudges, loyalties, and affection still require human authorship and adjudication. Stat blocks do not automatically generate a city’s society. Parties can have familiars, mounts, animal companions, hirelings, and followers with different ownership/control rules. There is no universal companion approval meter, mandatory romance minigame, or native continuously running AI citizen scheduler. An absent player or conflicting party goals is a social coordination problem, not something the initiative table resolves.

Campaign goals can include rescue, travel, treasure, political service, mystery, exploration, religious duty, revenge, trade, or building a home. Core combat and equipment have more formal machinery than courtship or household life. Supplementary stronghold, leadership, mass-combat, and organization systems need their own scope labels; the 2024 Bastion chapter is not part of 3.5. A GM can adjudicate a festival game or construction project without proving that the baseline has an exhaustive subsystem for it.

Story is authored through setting material, prepared situations, player histories, and choices. The same rules can support Greyhawk, Forgotten Realms, Eberron, or an original setting, but these worlds do not share every god, date, social institution, or metaphysical rule. Named setting characters and historical detail belong to the [worldbuilding dossier](../../worldbuilding/worlds/29-dungeons-and-dragons.md), not to an invented mandatory 3.5 plot.

## 8. Presentation, production, and continuing participation

Books, sheets, dice, speech, and optional maps or miniatures form the central interface. There is no required camera or soundtrack; dramatic voices, ambient audio, and digital tools are table choices. The sheet exposes both a character and a considerable calculation surface. Explicit boxes can improve inspection and accountability while intimidating a newcomer. Rules literacy, readable references, plain-language intent descriptions, and help from another participant can matter as much as art quality. [R1–R5]

The premium-reprint review comments on the physical covers and useful reference organization. The Angry GM values the GM-facing toolbox while criticizing sheet density and easily forgotten modifiers. Neither establishes a measured accessibility advantage. An exact review of the original art pipeline, team size, budget, or printing economics was not available in this pass. Those quantities must not be inferred from the number of illustrations. [R2–R3]

Commercially, the studied game is sold through books and supplements, not a compulsory per-session service fee. Owning rules can sustain a long-running table without a continuing publisher subscription. Third-party publishing and internet reference tools form part of the edition’s wider ecosystem; the OGL-era rules distribution enabled reuse under its own conditions. Pathfinder’s relationship is important historical context, but Pathfinder is a separately maintained game rather than automatic evidence for a D&D rule. [S0, P1]

Shareable builds, character handbooks, conversion guides, campaign stories, and the reuse of purchased libraries can support continued participation. The sampled players mention both familiar investments and the attraction of exceptionally broad customization. Those are observed reasons in a small self-selected discussion, not an active-user survey or proof of what caused market success. No defensible current 3.5 population, retention figure, edition-specific lifetime profit, or channel attribution was retrieved. [T1]

## 9. Reception and evidence quality

Five written critical pieces were inspected, but they are not equally strong or all independent full-length book reviews. **The strict five-substantive-review gate remains evidence-limited**: two are substantial edition/book retrospectives, two are comparative player/GM essays, and the short premium-reprint review appears to blur changes from 3.0→3.5 with reprint differences. It is retained as reception evidence, not used to establish new reprint mechanics. An identified RPGnet review could not be fetched. Steam reviews do not apply to this tabletop ruleset.

| Source | Specific positive evidence | Specific reservations and limitations |
|---|---|---|
| R1: Phil Viverito, These Old Games, December 28, 2019 | Values the unified d20 framework and modular character possibilities. | Discusses uneven feats and equipment abstractions; some rule descriptions are imprecise, so the SRD rather than the review establishes mechanics. Retrospective, not a launch survey. |
| R2: The Angry GM, December 21, 2022 | Praises routine-resolution procedures, fiction/rule connections, monster customization, and GM tools. | Criticizes prerequisite-driven build planning, sheet complexity, small forgotten modifiers, and recovery/death scaling. Strongly opinionated, explicitly personal; not an objective ranking. |
| R3: Raine, Initiative Tabletop, May 17, 2013 | Likes physical presentation, available reference material, and the revised books’ usability. | Predominantly positive and brief; ambiguous attribution of what changed in the premium reprint prevents using its claims as a revision history. |
| R4: Martin Stellinga, May 18, 2018 | Appreciates nuanced options and the value of a consistent common rules framework. | Reports frequent lookups and prefers a simpler game for his own casual play. Comparative essay, not a complete 3.5 review; his unplayed-4e judgments are not adopted. |
| R5: TableTop Now, “3.5e vs. 5th Edition,” displayed December 29, year not established in the page body | First-person account values a highly particular gnome rogue and detailed build identity. | Reports identity loss when converting, but also easier teaching in 5e and confusing mixtures of homebrew and official choices online. Commercial GM-service context, guest byline, and historical 5e comparisons limit generalization. |

A separate direct-player sample, **“Folks who still play D&D 3.5…”** on r/rpg, contains useful disagreement. Some participants value a deep library, long-learned rules, and unusual characters; others report caster/martial disparities, large gaps between casual and optimized builds, and the burden of curating content. One participant describes deliberately holding back a druid to avoid overshadowing allies. These are attributed reports, not validated balance experiments. Numerical catalogue counts and extreme theoretical builds in the thread are not adopted as facts. [T1]

The most useful conflict is not simply detail versus simplicity. The same rule density can supply reliable expectations to one table and create exclusion or constant reference work at another. A group that enjoys construction puzzles can experience complexity as content; a group seeking immediate character interaction can experience it as delay. Successful adaptation should preserve a choice’s consequences without requiring every player to become a rules archivist.

## 10. What OpenLegend can learn—and should not inherit automatically

**Strong candidates:** distinguish routine competence from risky resolution; make time and retries real; keep trained permission separate from a numerical bonus; let material and equipment properties change approaches; support persistent preparation and limited resources; represent different injuries with different remedies; and make important constraints inspectable.

**Adapt carefully:** compositional monster/character capabilities, granular skill evidence, additive modifiers, crafting productivity, and reputation categories. They supply useful seams, but every extra dimension needs a decision it improves and a comprehensible presentation. A simulation can calculate bookkeeping cheaply while still creating a very expensive explanation burden for the player.

**Do not inherit by default:** mandatory twenty-level advancement, fantasy classes as every resident’s ontology, enormous uncurated option libraries, permanent XP spending for all invention, an absolute moral alignment axis, social mind control through stacked modifiers, challenge rating as a guarantee, or combat turn order as universal world physics.

A computer is good at arithmetic and persistent accounting, but “it can calculate every modifier” does not answer whether the result is fair, understandable, fun, or consistent with the authored world. The deeper opportunity is to retain **stable reasons** for outcomes while presenting a small intention-oriented interface. The [adjudication study](../mechanics/dungeons-and-dragons-adjudication.md) develops the proposal and its limits.

## Sources and coverage

Retrieved 2026-09-27. Rules sources below reproduce primary 3.5 SRD content on a third-party host. This dossier paraphrases mechanics for criticism and analysis; it does not vendor the SRD, assert blanket permission to reuse all 3.5 content, or claim that the current SRD’s Creative Commons license covers this older material.

- **S0:** [SRD home](https://www.d20srd.org/) and [changes from the official SRD](https://www.d20srd.org/extras/d20changes.htm): source/version and mirror boundary; latter is a verification route, not a separately audited change list in this pass.
- **S1:** [Classes index](https://www.d20srd.org/indexes/classes.htm): baseline, NPC, and prestige-class families.
- **S2:** [Skills summary](https://www.d20srd.org/srd/skills/skillsSummary.htm): rank purchases and training.
- **S3:** [Multiclass characters](https://www.d20srd.org/srd/classes/multiclass.htm): separate levels, skills, saves, and spell progressions.
- **S4:** [Feats](https://www.d20srd.org/indexes/feats.htm): feat and prerequisite reference route; individual build trees were not exhaustively audited.
- **S5:** [Using skills](https://www.d20srd.org/srd/skills/usingSkills.htm): checks, take 10/20, retry, synergy, and assistance.
- **S6:** [Diplomacy](https://www.d20srd.org/srd/skills/diplomacy.htm): attitude table, timing, synergies, and retry limits.
- **S7:** [Actions in combat](https://www.d20srd.org/srd/combat/actionsInCombat.htm): action economy, full attacks, and timing.
- **S8:** [Combat index](https://www.d20srd.org/indexes/combat.htm): special attack and positional-rule lookup route; not every maneuver individually reproduced or audited here.
- **S9:** [Injury and death](https://www.d20srd.org/srd/combat/injuryandDeath.htm): dying, stabilization, recovery, and nonlethal damage.
- **S10:** [Weapons](https://www.d20srd.org/srd/equipment/weapons.htm): weapon families, properties, and quality.
- **S11:** [Armor](https://www.d20srd.org/srd/equipment/armor.htm): AC and equipment tradeoffs.
- **S12:** [Special materials](https://www.d20srd.org/srd/specialMaterials.htm): named material distinctions and limits.
- **S13:** [Equipment index](https://www.d20srd.org/indexes/equipment.htm): mundane supplies and carrying-reference route.
- **S14:** [Craft](https://www.d20srd.org/srd/skills/craft.htm): tools, costs, productivity, failures, repair, and spell interaction.
- **S15:** [Creating magic items](https://www.d20srd.org/srd/magicItems/creatingMagicItems.htm): prerequisites, costs, production time, and pricing caveats.
- **S16:** [Arcane spells](https://www.d20srd.org/srd/magicOverview/arcaneSpells.htm): preparation, rest, spellbooks, and notation.
- **S17:** [Magic overview](https://www.d20srd.org/indexes/magicOverview.htm): lookup route for spell schools, descriptors, and casting categories; not a claim of a complete spell-by-spell audit.
- **S18:** [Environment](https://www.d20srd.org/indexes/environment.htm): terrain/hazard lookup route; detailed hazards are a further inspection surface.
- **S19:** [Improving monsters](https://www.d20srd.org/srd/improvingMonsters.htm): Hit Dice, class levels, templates, and advancement consequences.
- **P1:** [Player’s Handbook publication/credit reference](https://en.wikipedia.org/wiki/Player%27s_Handbook): secondary bibliographic orientation only; old official product/chat references were not recovered as complete primary documents.
- **R1:** [These Old Games retrospective](https://www.theseoldgames.com/2019/12/35-review-dungeons-and-dragons-players.html?m=0).
- **R2:** [The Best and Worst of D&D 3.5](https://theangrygm.com/the-best-and-worst-of-dnd-3e/).
- **R3:** [Premium PHB/DMG review](https://initiativetabletop.com/2013/05/17/written-review-premium-edition-dungeons-dragons-3-5-players-handbook-and-dungeon-masters-guide/).
- **R4:** [Pathfinder and D&D](https://martinstellinga.com/games/pathfinder-and-dd/).
- **R5:** [TableTop Now comparative retrospective](https://tabletop-now.com/blog/dungeons-dragons-35e-vs-5th-edition).
- **T1:** [Direct-player discussion](https://www.reddit.com/r/rpg/comments/13hibgq/folks_who_still_play_dd_35/): qualitative sample, not prevalence; selected relevant comments inspected, not a claim every nested reply was read.
- **Access gap:** [RPGnet PHB review](https://www.rpg.net/reviews/archive/9/9572.phtml) identified but fetch failed; not counted as read.

| Requirement | Substantive coverage / limit |
|---|---|
| R01 | §1, precise edition and tabletop promise |
| R02 | §§2–7, major action and mechanics families; linked granular procedures |
| R03 | §§5–6, weapons, armor, materials, production, equipment, spells |
| R04 | §§2–6, advancement, preparation, injury, time, economy |
| R05 | §§3–6, constructed social, positional, procurement, production, preparation cases |
| R06 | §7, human NPC authorship, parties, companions, absent autonomous simulation |
| R07 | §8, physical interface and reference burden; production-art evidence limited |
| R08 | §7 and linked world study; no single mandatory storyline |
| R09 | §§1, 8; publication framework covered, primary development/iteration evidence limited |
| R10 | §8; sharing and reuse mechanisms distinguished from measured causes |
| R11 | §8; book/service distinction, unavailable market metrics stated |
| R12 | §9; five critical pieces, but strict five-substantive-review gate remains evidence-limited |
| R13 | §10 and linked adjudication study |
| R14 | Source register, access boundaries, and hub navigation |

Preservation: this is an additive tabletop subject. It neither replaces the library’s Pathfinder or Baldur’s Gate dossiers nor certifies their research or the library-wide preservation audit. Evidence gaps above are not checked off as completed acceptance gates.

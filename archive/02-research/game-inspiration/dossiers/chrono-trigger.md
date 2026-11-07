# G187 — Chrono Trigger

[Library](../README.md) · [Roster](../research-roster.md) · [Research standard](../research-requirements.md) · [This investigation](../research-progress-chrono-trigger-expedition-33-2026-11-06.md)

**Full dossier — November 6, 2026.** Covers R01–R14 and the applicable R15 creator-ecosystem investigation. The original Super Famicom/SNES adventure is the baseline; PlayStation, DS, mobile and PC differences are identified. **Major story and ending spoilers follow.** Research informs OpenLegend choices without approving features. No new playthrough, executed mod or watched video is claimed.

## Reading map

[Player promise](#the-player-promise-and-the-shape-of-the-adventure) · [Mechanics, editions and situations](#mechanics-editions-and-worked-situations) · [Story and people](#story-history-and-what-the-player-learns) · [Art and music](#art-music-and-the-production-of-feeling) · [Production, economics and creation](#production-distribution-economics-and-creation) · [Advertising](#advertising-cases-what-the-promotion-chose-to-communicate) · [Reviews and player experience](#reception-and-player-experience) · [OpenLegend lessons](#what-openlegend-can-learn--hypotheses-tradeoffs-and-existing-owners) · [Coverage and limits](#coverage-evidence-boundaries-and-reading-routes) · [Sources](#annotated-source-register)

## The player promise and the shape of the adventure

Chrono Trigger follows Crono and his companions from a fair and an accidental journey through time to preventing a future catastrophe. Exploring authored eras changes what they know and what they can attempt. It is a finite single-player campaign with selected historical consequences. [CTN02]

**Research interpretation:** its useful unit is a situation that changes what the player wants to do next. A new location can also explain an old enemy; an upgrade can finish a friend's story; a return visit can reveal that an earlier action mattered. This is more specific than saying the game has time travel or memorable characters. The research below tests that reading against mechanics, original creator accounts and contrasting reception rather than assuming that acclaim proves every design choice works.

## Mechanics, editions and worked situations

### Evidence and edition boundary

This section describes the original campaign's mechanical structure. Original English terminology is retained where practical; later localizations rename several techniques and items. Original manuals and current publisher material establish the broad rules. Detailed numerical and item behavior comes from explicitly identified community reference databases. This is desk research, without a newly completed playthrough, direct input testing, or frame-by-frame verification. Edition-specific exploration, additions, controls, and interface options are covered in the companion exploration section. [CTM01], [CTM02], [CTM03], [CTM04], [CTM05]

### Encounter structure, time, and decisions

Chrono Trigger normally stages combat directly in the location being explored, using visible enemies and a party of up to three. Its Active Time Battle system makes each character's readiness an independent resource. The player chooses commands as gauges fill; characters and enemies reposition through battle animations and encounter scripting. Position affects some attacks, but the player does not issue free movement commands on a tactical grid. The publisher describes more than fifty combined attacks, making party composition a substantial part of the command set rather than merely a choice of damage statistics. [CTM02]

The original manual offers Active and Wait modes and a battle-speed setting. Wait provides more thinking time, but should not be described as pausing the entire encounter whenever any menu is visible. A DS guide and a later PC community explanation describe the pause during Tech or Item selection; already queued actions can still resolve. That precise boundary is community corroboration, not a new instrumented comparison of every port. [CTM01], [CTM03], [CTM04]

**Design interpretation.** The encounter loop combines a simple immediate choice—attack, technique, or item—with scheduling. A character who is ready can act now, preserve readiness for a partner, heal, or wait for a more useful enemy arrangement. This makes hesitation potentially productive, while Active mode also gives it a cost. Wait reduces menu pressure without removing the encounter's timing structure. Accessibility assessment should distinguish time to select a command from the absence of time pressure altogether.

The interface communicates state through gauges, HP/MP, command availability, targeting, status effects, and damage results. Gray combination commands communicate an unmet requirement. [CTM08]

### Party identity and growth

The seven playable characters have fixed identities rather than selectable classes. The following is a mechanical orientation, not a complete technique list. [CTM18], [CTM09], [CTM14], [CTM22], [CTM23]

| Character | Mechanical orientation | Elemental association |
|---|---|---|
| Crono | Sword attacks, mobile area attacks, offensive magic, and broad combination access | Lightning |
| Marle | Bow, healing, revival, haste, and support combinations | Water |
| Lucca | Gun, fire attacks, and area damage | Fire |
| Robo | Physical strength, mechanical attacks, healing, and combinations | No innate magic association |
| Frog | Sword attacks, healing, and combined techniques | Water |
| Ayla | Physical attacks, combinations, and item theft through Charm | No innate magic association |
| Magus | Strong magical offense and a distinct combination profile | Shadow |

These associations do not mean that every action uses the character's named element. The reference distinguishes physical damage, Lightning, Water, Fire, and Shadow; attack-specific properties should govern an enemy-resistance decision. Robo's lack of innate magic, for example, does not mean every mechanical attack behaves as ordinary physical damage. [CTM14]

Experience advances levels; Tech Points advance a prescribed technique sequence. Some techniques begin known or are taught through a story event. Learned components unlock combinations. [CTM09], [CTM10]

**Evidence boundary.** The inspected references establish this growth loop, but not a reliable platform-by-platform reserve-party XP/TP distribution formula. None is asserted here.

HP measures survival and MP funds techniques. Power, Hit, Magic, Speed, Evade, Stamina, and Magic Defense contribute to different outcomes; Hit is particularly relevant to bow and gun damage. Equipment modifies both offense and protection. The community systems reference identifies 999 HP, 99 MP, and a normal Speed ceiling of 16. Speed does not ordinarily rise through leveling in the same way as other attributes. These are named boundaries, not a claim that every displayed statistic caps at 99; equipment-derived Defense must be treated separately. [CTM06], [CTM18]

**Design interpretation.** Fixed roles provide immediately legible characters, while combinations make their value relational. A player can understand Marle as a support character and still discover a new offensive or restorative use for her alongside a different partner. The cost is limited individual build authorship: growth mostly reveals authored capabilities, with customization concentrated in party selection, equipment, consumables, and timing.

### Single, double, and triple techniques

Single techniques consume MP and readiness. Targeting patterns include nearby, area, line, horizontal, single-target, and all-enemy attacks; the selected pattern determines coverage. Cyclone and Slash illustrate this distinction. [CTM09]

Double and triple techniques require the appropriate learned components, participating characters, readiness, and sufficient MP. The PlayStation manual explains unavailable combined commands through participant requirements, making a gray command meaningful feedback rather than a missing skill. Each participant contributes the relevant component cost, so the combined action spends multiple characters' resources. [CTM08]

Examples include Aura Whirl, which joins Crono's Cyclone with Marle's Aura for party healing; Fire Whirl, combining Cyclone and Lucca's Flame Toss for fire damage; and X-Strike, joining Crono and Frog's attacks. Some triple techniques require an accessory, adding an equipment prerequisite to composition and learned abilities. [CTM10], [CTM17]

Magus is an exception to ordinary combination breadth: his database lists two accessory-enabled triples, DarkEternal with Marle and Lucca and Omega Flare with Lucca and Robo, with no ordinary double techniques. His individual spell list spans several elements despite his Shadow association. [CTM23]

**Design interpretation.** The system converts friendship into a visible combat verb. It also creates an opportunity cost: synchronizing two gauges can postpone a useful independent action, and spending a partner's MP can weaken the next recovery turn. A larger animation is therefore not automatically the best decision. Its value depends on target coverage, recovery need, readiness alignment, and the actions displaced.

### Equipment, items, money, and protection

Characters use weapon, armor, helmet, and accessory slots. Availability is constrained by character eligibility, including character-specific weapons and some gender-restricted armor. The equipment loop is compact enough to compare individual changes, but not reducible to a single attack or defense rating. [CTM18], [CTM20], [CTM21]

Weapons can supply secondary behavior. The reference lists Slasher with a Speed bonus and other swords with magical bonuses or unusual critical-hit properties. A weapon upgrade can therefore change action frequency or situational damage, not only the ordinary attack figure. The practical question is what the character will do in the coming encounters. [CTM20]

Accessories support recognizably different priorities: Speed, offensive attributes, maximum HP, evasion, counters, status immunity, reduced MP expenditure, or access to a special triple technique. The Silver Stud halves MP costs and the Gold Stud reduces them by three quarters; choosing one occupies the same accessory opportunity that could supply another benefit. [CTM17]

Armor can trade elemental protection, magical defense, status protection, and general defense. Ruby Vest reduces fire damage; later protective equipment offers stronger or different special effects. These properties are encounter preparation tools, especially when the player understands an enemy's element or disabling attack. Eligibility restrictions also distribute valuable protection across the party rather than making every item interchangeable. [CTM21]

The consumable ladder spans HP restoration, MP restoration, status cures, revival, and broad recovery. The database lists Tonic at 50 HP, Mid Tonic at 200, and Full Tonic at 500; Ether, Mid Ether, and Full Ether restore 10, 30, and 60 MP. Elixir restores one character's HP/MP, while MegaElixir restores the party. Shelter restores HP/MP at a save point. Permanent Power, Magic, and Speed Tabs supplement ordinary growth. [CTM16]

Shops use gold and have location-dependent stock and prices; availability can change with world events. The early Melchior listing puts an Iron Blade at 350 G and a Lode Sword at 4,000 G, a large difference in saving commitment. Ordinary restorative supplies compete with purchases for the same budget. This is a finite authored shop economy, without evidence of simulated merchant inventories, dynamic player-driven markets, or an auction system. [CTM12]

Prehistoric trading adds a separate resource loop: enemy-dropped materials can be exchanged for equipment. The recorded Ruby Vest recipe is three Fangs and three Feathers; later stock includes a more demanding Ruby Armor exchange. This is fixed barter, rather than an open recipe construction or equipment-upgrading profession. [CTM13]

Ayla adds an active loot decision through **Charm**, a single-enemy technique costing 4 MP that attempts to steal an item. Twin Charm combines it with Marle's Provoke. This links party selection and combat actions to item acquisition: the player can spend readiness pursuing loot before finishing the encounter. The reference does not justify assuming every target yields an item or that success is guaranteed. [CTM22]

### Status, recovery, and failure

Status effects modify choices as well as survivability. Poison drains HP and weakens attacks; Darkness reduces physical accuracy; Chaos can redirect attacks; Sleep, Stop, and Lock restrict available action in different ways. Slow and Haste change gauge timing. Protect reduces physical damage, while Magic Wall reduces magical damage. The reference describes Haste as doubling gauge speed and both defensive effects as reducing their respective damage by one third. [CTM19]

At zero HP a character is incapacitated. The systems guide describes revival through battle items or techniques and a defeated character returning with 1 HP after a victory; a battle-only revival item should not be assumed to work freely on the field. If the party cannot win, ordinary progress depends on reloading saved state rather than a persistent injury or corpse-recovery system. This dossier does not claim special scripted losses follow the ordinary rule. [CTM06]

The original manual provides three save files and saving on the world map or at designated save points. This creates a recovery-and-risk rhythm: identify the checkpoint, restore resources, prepare, then attempt the next sequence. Later ports add different save conveniences, covered in the edition section. The original save structure should not be silently replaced by a modern autosave assumption. [CTM01]

**Design interpretation.** Resource depletion matters mainly over a run of encounters between reliable recovery opportunities. Broad restorative items can rescue a poor sequence, but using one removes a future option. Status protection can be more valuable than a small defense increase when losing a turn would break the party's recovery plan.

### Eight worked situations: decisions crossing systems

These examples explain decision structure. Where no exact enemy, level, or damage value was verified, the outcome is conditional rather than an invented guaranteed kill.

1. **Synchronize a heal or keep attacking.** Prerequisites: Crono and Marle have learned the components of Aura Whirl, have enough MP, and can both become ready. Several allies are hurt. The player waits for both gauges and chooses the combined heal. The outcome is party recovery with two actors committed; the next decision is whether the third member attacks or stabilizes the fight further. The tradeoff is recovery coverage against the independent actions and MP spent. If one participant lacks readiness or MP, the command cannot simply bypass the requirement. [CTM08], [CTM10]

2. **Spend time aiming an area attack.** Prerequisites: a spatial technique is available and several enemies remain. Using the targeting rules above, the player checks coverage before confirming. The outcome may be several damaged targets rather than one. The next choice is whether to clean up survivors or preserve MP. Waiting can improve coverage but costs time in Active mode; the player cannot manually move everyone into the desired arrangement. [CTM09], [CTM02]

3. **Equip for a disabling enemy.** Prerequisites: the player has observed or otherwise learned that an upcoming fight repeatedly applies a troublesome status and owns suitable protection. The player assigns a status-protective accessory or armor to the character responsible for recovery. If that protection matches the threat, the healer remains more dependable. The next choice is whether the remaining party can tolerate lower raw offense or defense elsewhere. The tradeoff is a general numerical benefit versus preventing a specific lost action; protection should not be assumed to cancel an unverified boss mechanic. [CTM17], [CTM19], [CTM21]

4. **Recover after a narrow victory.** Prerequisites: the party wins with one member incapacitated and reaches a save point with a Shelter. The fallen member returns to 1 HP, then the player uses checkpoint recovery before continuing. The outcome is restored readiness for the next dungeon segment, with a consumable spent. The next decision is whether to save, explore farther, or return for supplies. Pressing on without recovery preserves the item but leaves the party fragile; a field use of the battle-only revival item is not an interchangeable solution. [CTM01], [CTM06], [CTM16]

5. **Choose MP efficiency over speed.** Prerequisites: the player owns competing accessories described above and anticipates a long sequence without recovery. Equipping the MP-saving option extends the technique budget. The next choice is whether to spend that saving on stronger actions or preserve it. The cost is the alternative accessory benefit, making this a situational specialization. [CTM17]

6. **Convert hunting materials into protection.** Prerequisites: prehistoric trading is available and the party can obtain the materials for the listed Ruby Vest exchange. The player gathers the necessary drops, returns to the trader, and exchanges them for equipment. The outcome converts combat effort into fire protection; the next decision is which eligible character needs that protection most. The cost is additional encounters and the materials no longer available for another exchange. It demonstrates an authored alternative to simply accumulating gold. [CTM13], [CTM21]

7. **Use time travel to improve a reward.** Prerequisites: the relevant sealed-treasure interactions are available in both eras. The reference records that the Truce Inn's future Blue Vest can become Blue Mail through the earlier-era treasure interaction. The player investigates the earlier version before taking the later reward, then returns to collect the improved item. The next decision is whether to inspect similar cross-era opportunities. This example establishes the state dependency; exact dialogue choices should be checked in a route guide rather than inferred from this database entry. The tradeoff is extra travel and attention for better equipment. [CTM15]

8. **Buy a weapon or preserve the expedition budget.** Prerequisites: limited gold and the early merchant choices listed above. The player compares a substantial weapon purchase with cheaper equipment plus supplies. The outcome prioritizes stronger ordinary attacks or a larger recovery reserve. The next choice is whether to fight, save more gold, or postpone the upgrade. The better purchase depends on survivability and expected technique use, not a universal optimal route. [CTM12], [CTM20]

### New Game Plus and the limit of retained power

New Game Plus restarts the story with substantial accumulated power, enabling different routes to the final confrontation and different endings. The DS-oriented guide describes selecting a completed file after viewing an ending and resetting, retaining levels, stats, and most ordinary items while recruiting characters again. Money does **not** carry over in that guide. Key items and some story-related equipment are excluded, including the Masamune variants, Slasher variants, Taban equipment, Ozzie Pants, Flea Bustier, GreenDream, and Hero Badge under that localization's names. [CTM07]

The retained inventory must therefore not be described as literally everything, nor as uninterrupted party membership. This research does not establish an exact universal unlock condition for every release or every clear route; a platform-specific claim about whether one particular route unlocks the mode requires separate verification. The edition supplement also records that DS Arena progress resets. [CTM07]

**Design interpretation.** Carrying power forward changes the meaning of the opening hours. Earlier plot positions become possible final-boss entry points because the party's strength no longer matches its narrative stage. Replay therefore rearranges access to authored outcomes, rather than relying solely on stronger repeat enemies or randomized loot. Its limits also matter: a returning player can overwhelm much of the ordinary campaign, reducing tactical tension while gaining freedom to explore consequences.

### Meaningful boundaries and absences

**Documented-system audit.** The researched campaign provides no player-authored classes, branching skill-point trees, tactical movement grid, general construction mode, relationship approval meter, camp-management economy, or open-ended crafting profession. Its equipment and barter systems should not be recast as those systems merely because they permit resource choices. Party relationships are expressed through authored scenes and combat cooperation; the campaign is not a social simulation. These are scoped observations about the documented campaign mechanics, not claims that no later port, fan modification, or ancillary mode adds related behavior. The DS Arena is a separate exception discussed in the edition supplement.

**Open Legend interpretation.** The strongest transferable structure is a compact action vocabulary whose implications expand through context: partners change a command, position changes coverage, time travel changes a reward, and equipment changes what is sustainable. A comparable design needs visible prerequisites and clear feedback. If collaboration, geometry, or future consequences become opaque, the same interdependence that makes discovery satisfying can turn into guesswork. Chrono Trigger is therefore evidence for carefully authored interactions between understandable systems; it is not evidence that adding more interacting subsystems always improves play.

## Editions, exploration and activities beyond combat

**Research scope: November 6, 2026.** This supplement complements the mechanics section without repeating its combat, shops, barter or sealed-treasure inventories. Worked situations reconstruct documented rules; none represents a personally played session. Story and optional-quest spoilers follow.

### Edition boundaries that change the activity

| Edition | Material difference for this study |
| --- | --- |
| **Super Famicom/SNES, 1995** | Original campaign; no later animated cutscenes or DS additions. [CTE01], [CTE02] |
| **PlayStation, 1999/2001** | Animated scenes and extras; North America’s Final Fantasy Chronicles paired it with Final Fantasy IV. Loading delays affect pacing. [CTE02] |
| **Nintendo DS, 2008–2009** | Revised localization, dual screens, mapping and three additions. [CTE01] Arena of the Ages trains monsters for prizes and local wireless contests, not campaign cooperation. [CTE02] |
| **iOS/Android** | Two added dungeons; no Arena or dual screens. Distinguish the 2018 overhaul from earlier builds. [CTE01], [CTE02] |
| **Windows/Steam, 2018 onward** | Two added dungeons; no Arena. Later patches add original-style graphics; RPG Site’s 2025 mobile comparison lacked that option. [CTE02] |

The official **March 10, 2022 Steam update** specifies up to 21:9 display, twenty save slots, clearer interaction and entrance indicators, control adjustments, and 1.5× auto-battle speed. The same announcement feed records a March 22 achievement fix and an August 29, 2023 battle-speed fix. This verifies published options and maintenance history, not their flawless operation on every current device. [CTE03]

**DS Arena actions.** The Stable Master offers four elemental Smidges and starter items. Choose an item and a previously visited era for training; their combination affects growth, learned techniques and possible class changes. The guide specifies ten-minute sessions, with the monster returning upon re-entry. Buy further Arena-only items from the Nu. For a Prize Match, choose an available tier and pay its fee; victory draws a random reward from that tier. Higher tiers cost more and can offer better rewards without guaranteeing a desirable item. Battles largely proceed automatically: offered items influence actions, with Trust affecting responsiveness. Training can also lower stats, and advancing tiers removes lower prize pools. Wireless battles are a separate opponent choice. New Game Plus resets Arena progress. [CTE13]

### Geography, mobility and optional destinations

The six principal dates are 65,000,000 BC, 12,000 BC, 600 AD, 1000 AD, 1999 AD and 2300 AD, with the End of Time connecting travel and party support. These are selected authored destinations, not an arbitrary calendar. The End of Time provides saving, recovery and access to waiting companions. Its late-game role becomes important in situation 3 below. [CTE05] **1999 AD leads to the Lavos confrontation; normal play does not provide explorable towns or a full civilization there.** The guide’s discussion of inaccessible map data is not evidence of delivered exploration. [CTE14]

The gate-pair network is documented in the mechanics section. Vehicles alter access: prehistoric Dactyls provide regional flight; the Epoch later separates changing eras from finding a Gate, and its subsequent wing upgrade adds overworld flight. Temporal reach and geographical reach are distinct unlocks. [CTE04], [CTE06]

Two DS additions also differ in timing. **Lost Sanctum** opens after recovering the flight-capable Epoch and the Black Omen's emergence; Reptite villagers offer linked quests across Prehistory and the Middle Ages. It is not exclusively postgame content. [CTE10] **Dimensional Vortex** opens after a first completion, with entrances in Antiquity, Present and Future; a sequence of selected rooms leads toward a checkpoint and a more specific concluding area. Its added ending and dungeons also appear on mobile/PC; an older wiki's DS-exclusive wording is superseded by the platform evidence above. [CTE11], [CTE02]

### Actual activities and conditional people

The fair supports timed bell ringing, a drinking contest, race predictions, dancing and prize games. Lab 32 adds a different activity: racing Johnny can bypass a route otherwise traversed through encounters. These are authored minigames with their own input demands and rewards, not evidence of a general sports or performance simulation. [CTE09], [CTE06]

NPC reactions depend on particular actions and story conditions. At the fair, a cat follows after one interaction but runs away after another; returning it to its owner records a later-recognized action. Marle's candy stop requires waiting, and the early overworld allows wandering without random battles. This creates room for small choices before the main departure. [CTE12] Such conditional behavior does not establish continuous needs, independent offscreen careers, an economy that evolves without the party, or freely generated quests. The cited examples concern authored states; absence of those broader systems should not be mistaken for absence of memorable people.

### Four worked exploration situations

**1. Choose what a fair victory is worth.** A player wants a prize but has few Silver Points. They can predict a race winner, using the nearby spectator's hint if desired. A correct prediction earns twenty points; the money tent exchanges ten points for fifty G. Keeping the points instead preserves access to Bekkler's prize games, which can award cats, food or dolls. The next decision is whether to pursue those activities or leave with spendable money. The constraint is successful participation and accumulated points, not an automatic quest reward. **Interpretation:** a small local currency gives leisure a distinct purpose, but repeated attempts can become an unwanted obstacle when the player only wants the prize. [CTE09]

**2. Let two optional achievements meet.** After recovering the Rainbow Shell and completing the associated castle sequence, the player visits Melchior. He offers a choice between one Prism Dress and three Prism Helms. If the Sun Stone quest is also complete, speaking again yields the Rainbow and PrismSpecs. The player therefore has a concrete reason to connect discoveries from separate optional routes. The extra rewards require the additional achievement; they do not follow merely from selecting the armor option. **Interpretation:** independent quests can reinforce one another through a shared practical result without requiring every optional journey to be completed in one compulsory order. Equipment formulas and comparative optimization belong to the mechanics account. [CTE08]

**3. Recover a wanted direction after a break.** A player returning near the campaign's end may remember the larger threat but not a useful next destination. At the End of Time, Gaspar offers clues to available sidequests, including the Sun Stone, Cyrus, Robo and Fiona-related routes. The player can select one concern or proceed toward the finale. The cost of an optional excursion competes with readiness to finish; completion of every quest is not the universal entrance fee. **Interpretation:** a stable place for recovering context can support freedom without becoming a mandatory task list. A clue may still be insufficient for someone who has forgotten the associated person or location. [CTE07]

**4. Solve a travel blockage by changing capability.** The party wants to return to Antiquity after its Gate is sealed. Gaspar's direction and the Keeper's Dome route lead to Belthasar's Epoch. The player boards it and selects the target era, bypassing the need for that Gate. Initially the machine changes time without providing ordinary geographical flight; the later wing modification is a separate event. The next question is where to travel within the newly reachable era. **Interpretation:** a traversal upgrade can answer an intelligible obstacle before opening broader possibilities. Here it remains a deliberately bounded set of destinations, not permission to visit any imagined date or undo every loss. [CTE04]

## Story, history and what the player learns

### Escalation, reversals and personal choice

The early structure is strongly guided. Rescuing Marle reveals that personal identity depends on history; the ruined future makes a much larger danger concrete. The apparent route through Magus proves incomplete, and the arrival of Lavos reframes the conflict. Zeal then connects technological ambition, political inequality and family tragedy. Later, the player can pursue personal resolutions and choose a route toward the final confrontation. These are selected authored revelations and branches, not a rule that the player can rewrite any event. [CTN02], [CTN03]

The distinction matters for OpenLegend: **a discoverable history can make places consequential without a complete simulation of history**. That is a transferable hypothesis. It does not establish that a persistent multiplayer world should copy a single protagonist's fixed revelation order, silently erase another player's experiences or make a villain necessary to every form of life.

### Zeal: beauty, hierarchy and the cost of power

Zeal's floating civilization places people who wield magic above those excluded on the frozen surface. Queen Zeal's pursuit of Lavos's energy uses Schala as an instrument; Janus, the Gurus and the later identity of Magus connect this era to places the player already knows. The contrast is encountered through geography, institutions, dialogue and a disastrous attempt to command power. The setting's appeal and its injustice coexist. Later editions and Chrono Cross add information; their explanations must not be silently treated as facts the original player was told. [CTN03]

**Interpretation:** a place can communicate a social order before an exposition scene explains it. A familiar person encountered in another historical role can make information emotionally meaningful. The limitation is that this effect depends on remembering a small, legible cast; adding names and eras without reinforcing their relationships would increase confusion rather than depth.

### Care, consequence and uncertainty

The forest restoration joins environmental work, Robo's unusual lifespan and a changed destination. The camp conversation then invites the party to wonder whether a greater Entity has guided the Gates. The game presents this through the characters' thinking; treating every speculation as a fully defined cosmological law overstates what the scene establishes. [CTN04], [CTN05]

This is a particularly valuable counterweight to reading all RPG progress as defeating stronger enemies. The interesting result can be a place restored, a companion's commitment made visible, or a familiar event understood differently. It also warns against flattening mystery into a knowledge database: an NPC's belief, an observed change and an established world law are different kinds of information.

### Guided familiarity before late freedom

A V-Jump conversation preserved in a later transcription attributes the late-game opening to deliberate choices: temporal puzzles work after players know the world, specialized bosses can sit on optional paths instead of blocking every player, and the End of Time collects guidance. The creators also describe New Game Plus as revisiting known events with different power and knowledge, and acknowledge that designers can underestimate puzzle difficulty because they already know the answer. This is an attributed developer explanation, not proof of a universal pacing formula. [CTN06]

**Interpretation:** teach a place's ordinary meaning before asking the player to appreciate its transformation. Preserve a reliable way to regain direction when opportunities multiply. Optional challenge can carry sharper demands, but its reward and advertised purpose should make that choice understandable. The alternative for a continuing world is a small, intelligible local opening followed by several worthwhile directions; copying the exact campaign structure is unnecessary.

### Lavos and the limits of the cosmology

Lavos is an extraterrestrial parasite whose arrival, long presence and eventual emergence connect the eras. The threat is larger than a contemporary ruler, yet particular rulers and institutions make consequential choices about it. The English and Japanese texts do not express every evolutionary claim identically, and Chrono Cross develops the cosmology further. This dossier therefore does not turn a sequel explanation or an English localization line into a universal law of the original game. The central playable fact is sufficient: discovering what happened makes prevention a credible objective. [CTN10]

**Interpretation:** distant danger becomes meaningful when it explains visible suffering and gives present actions a direction. An omnipotent antagonist is less useful if every event becomes its unexplained work. Leave room for particular people to cause, resist, misunderstand or care about what happens.

### Major spoilers: losing the protagonist and choosing restoration

Crono sacrifices himself in the Ocean Palace confrontation. The remaining companions continue, and recovering him becomes an undertaking: the group uses a substitute from the fair and a narrowly defined opportunity to intervene at the fatal moment. The return to a seemingly playful earlier object connects ordinary activity with a much later emotional goal. Later releases add animated depictions; those are presentation changes, not evidence that every animation or sequel implication was in the SNES release. [CTN11]

The loss is especially instructive because the party and the player's purpose can survive the removal of the nominal center. **Interpretation:** attachment becomes active when the player has a comprehensible way to respond. That does not imply every death should be reversible, nor that a persistent world should manufacture a death merely to force attachment. A world must establish its own recovery rules and preserve the consequences of the route it offers.

### Acknowledgment can matter even when the main route converges

The trial reuses selected behavior from the fair: testimony can make an apparently casual interaction feel remembered. Eric Van Allen's 2023 first-time-player account describes being surprised by that recognition, while explicitly observing that the prison sequence still follows either verdict. The scene therefore supports a narrower and more useful claim than unlimited branching: the game can respond specifically to how someone behaved without creating a different campaign for every action. It also has a limit—these are authored checks, not proof that all actions are observed. [CTN20]

**OpenLegend interpretation:** remembered treatment, a changed greeting or a credible witness can reward attention without requiring a second plot. The response should follow an actual observation or report; a supposedly perceptive character who knows an unwitnessed private act would undermine the same trust this pattern could build. Material promises still need material consequences: acknowledgment is insufficient if the game presents a choice as changing whether a bridge is repaired or a person survives.

### Institutions, displaced expertise and an opponent's future

**Guardia makes history familiar through institutions as well as landscapes.** The same kingdom appears in a medieval war and a later civic celebration; royal relatives, a cathedral, a castle and a court connect public structures to particular people. The returning player can recognize continuity while encountering different circumstances. The community reference also mixes later-series events and speculative ancestry, which this account does not adopt as original-game facts. A trial's existence is not evidence of a fully simulated justice system or democratic politics. [CTN21]

**The Gurus make useful expertise part of the mystery.** Melchior, Belthasar and Gaspar originate in Zeal but are encountered in different times. Their contributions are practical: repairing the Masamune, making time travel possible through the Epoch, and providing guidance and the Time Egg. Learning their shared origin changes the meaning of earlier assistance. The community page proposes extra motives and connections for some objects; these remain speculation unless the game establishes them. [CTN22]

**Azala prevents the prehistoric conflict from ending as a simple victory celebration.** The Reptite leader recognizes the coming catastrophe after defeat. Ayla's side offers rescue, and Azala declines while speaking about the planet's future. The impending extinction and the victors' offer make the rival more than another source of rewards. This description concerns the original confrontation; later additions and Chrono Cross develop other possibilities separately. It does not endorse the wiki's unsupported biological generalizations or treat a species as one person's beliefs. [CTN23]

**Interpretation:** recurring institutions establish continuity; helpful specialists can have histories beyond their service function; and an opponent can have a comprehensible concern without making every past action justified. These effects do not require a reputation meter for every institution or a branching resolution for every enemy. OpenLegend's authored history could supply particular traces and relationships, while its present-day individuals act on what they actually know. The evidence does not determine how an autonomous society should resolve those conflicts.

### People whose histories change the next decision

The table records specific authored arcs. Its lessons are interpretations, not claims of autonomous NPC reasoning.

| Person | What is encountered through play | What the case makes useful to examine |
| --- | --- | --- |
| **Marle** | Her conflict with royal authority later becomes a chance to defend her father against the Rainbow Shell accusation and learn more about their family. Carrying her into relevant situations changes the available dialogue. [CTN12] | A companion can revise an initial judgment. Evidence and a shared undertaking can change a relationship more convincingly than an isolated approval increment. |
| **Frog / Glenn** | The curse, Cyrus's death and the broken Masamune connect an unusual body to recognizable grief and self-doubt. Restoring the grave and confronting the past give the sword's improvement personal significance. [CTN13] | A useful object can carry history without being merely a lore collectible. Physical power, acknowledgment and emotional resolution can be different rewards within one sequence. |
| **Lucca** | Practical ingenuity repeatedly helps the party, while the optional return to her mother's accident reveals a personal reason that technology matters to her. The opportunity is specific and can fail; her competence does not erase vulnerability. [CTN14], [CTN05] | Reveal motivation through something the person can do and a situation they care about. Avoid treating every specialist as an exposition service or every backstory as automatically disclosed on first meeting. |
| **Robo** | Being repaired by Lucca, rejected by related machines, confronting Mother Brain and spending centuries on restoration give his loyalties and unusual lifespan concrete roles. His fear about returning to a changed future acknowledges a possible personal cost. [CTN15] | Nonhuman identity can alter commitments and dilemmas, rather than only a model or speech style. Useful help and emotional company reinforce one another without becoming identical. |
| **Ayla** | Leadership, hospitality, conflict with Reptites and Kino's jealousy place her within a community with its own concerns. Her bodily strength and inability to learn magic distinguish what she can contribute. The simplified prehistoric dialogue is also a documented point of criticism. [CTN16], [CTR05] | Capability differences and social roots create individuality. A readable contrast should not require reducing a culture to a caricature. |
| **Magus / Janus** | The enemy's connection to Schala and Zeal reframes his pursuit of Lavos. At North Cape the party may fight him or accept his later participation; bringing him to particular confrontations changes their personal meaning. [CTN17] | Recontextualization can create a real choice without erasing previous harm. Shared opposition can enable cooperation without asserting that everybody is now reconciled. |

**A boundary worth preserving:** these characters are memorable through authored scenes, role differences, selected dialogue and bounded consequences. That does not establish an underlying simulation of their daily lives, open-ended romance, universal reputation or independent strategic goals. OpenLegend's more general individuals can learn from the specificity of these moments, but require their own truthful state, observations, permissions and opportunities to act.

## Art, music and the production of feeling

### Character expression without photorealism

The preserved visual study describes broad, readable expressions and distinctive physical gestures: a party member can communicate surprise, delight or resolve through a small sprite. The value is recognizability in actual scenes rather than a high raw count of frames. This study is an analytical reading of the original visuals, not newly captured gameplay. [CTN07]

For OpenLegend, the hypothesis is that a modest expressive vocabulary, used at the right moment, can make a particular individual easier to read and remember. It does not mean every simulated person needs a large bespoke animation library. A useful test would compare whether players recognize a change in attitude or intention, not simply whether more animations exist.

### Music belongs to the experience it accompanies

Mitsuda's account of composing the game describes both opportunity and serious overwork; Uematsu's contribution is explained in that interview as support during a health crisis. This is evidence against turning the game's acclaimed production into a recommendation for heroic crunch. [CTN08]

In a separate interview, Mitsuda says he evaluates game music by whether it suits the scene and remains tolerable when looped; he distinguishes that from judging a standalone recording. This gives a concrete production question: does the piece still serve this activity during repeated exposure? It is an artist's stated method, not a measurement of every listener's preference. [CTN09]

The existing [player-music study](../../../../docs/research/player-music-appreciation/archive/2026/2026-11-04-player-feedback.md#emotional-meaning-narrative-and-progress) adds reception evidence: Chrono Trigger and Chrono Cross listeners describe music contributing to completion, recollection and later listening. Preserve that narrower evidence rather than labeling every fan nostalgic or claiming that a soundtrack alone explains the game's success.

### Specific identities and useful disagreement

The official soundtrack credits distinguish Mitsuda's work from Uematsu's and Matsueda's contributions. Named character, place and event pieces—such as Frog's Theme, Robo's Theme, Wind Scene, Kingdom Trial and Corridors of Time—provide a useful listening route. A track's presence in an album is not proof that every album cue was used in the original game. [CTN18]

An independent album review values the score's contrasting moods and associates particular pieces with Zeal, travel, character identity and suspense, but criticizes several ordinary battle themes. Its judgments are one listener's analysis, not a consensus or a newly performed musical examination. That disagreement improves the question: which musical moments invite attention, which sustain an activity, and which become irritating through repetition? [CTN19]

For a selected OpenLegend scene, a practical hypothesis is to give a place or person a recognizable identity and judge it across arrival, ordinary use and return. A beloved dramatic cue need not run continuously. More tracks, live instruments, a famous composer and expensive production are separate decisions; none substitutes for whether the scene is worth inhabiting. The existing [audio and feedback workflow](../../../../docs/production-workflows/audio-and-feedback.md) remains the production owner.

## Production, distribution, economics and creation

Research date: 2026-11-06. Completed research component for the Open Legend dossier. These are reference findings and hypotheses, not accepted Open Legend features. No game, mod, ROM, editor or installer was executed; workflows were reconstructed from maintainer documentation. Edition dates and commercial observations below retain their stated geographic and temporal scope.

### Production: collaboration, constraints and iteration

**Origins and responsibilities.** Aoki recalls Sakaguchi, Horii and Toriyama discussing a joint RPG roughly four years before the 1995 interview, with planning beginning later. An early CD-ROM concept became a Super Famicom cartridge. Sakaguchi describes approximately 50 contributors, about half with Final Fantasy VI experience. Duration recollections differ: Tokita estimates nearly two and a half years; Kitase describes roughly one year of discussion and one of production. Toriyama's concepts guided visual cohesion; Horii revised dialogue; Sakaguchi also adjusted events and enemy statistics. These are participants' retrospective approximations, not payroll or schedule records. The useful organizational lesson is to distinguish creative leadership from the broader implementation team, and establish who reconciles their competing priorities. [CTP12]

**Iteration and its costs.** The other interview identifies Aoki as producer, Tokita and Kitase as directors, and Sakaguchi as designer. The team experimented with encounter formats, hand-authored over 100 battle introductions, and described that work as comparable in effort to story events. Its prerelease Active Time Event Logic proposal sought player movement during dialogue; the translator cautions that the more expansive concept was not fully implemented. Graphic variety across eras contributed to expansion from 24 to 32 megabits. Developers describe coding ideas, discarding dull results, and removing a weapon-specific enemy vulnerability mechanic. This supports prototyping and subtraction, while showing that apparently effortless pacing can require expensive bespoke content. It does not establish a universal method, fixed staffing ratio or budget. [CTP11]

**Credits are broader than the interview's participants.** The preserved credit list names Takashi Tokita, Yoshinori Kitase and Akihiko Matsui as directors, Kazuhiko Aoki as producer, and Masato Kato for story planning. This is a transcribed credit record, not a claim that titles fully describe daily responsibilities. [CTP21]

**A later first-party conversation makes the production tradeoff concrete.** Kato describes a weekly cycle of discussing the scenario with Horii and implementing it for review. He credits a reduction in eligible character combinations with making the combination-tech workload manageable. Matsui and Kato also contrast manually staged encounters with automation. Their discussion warns that praise for labor-intensive work encouraged later teams to normalize exhausting methods; Kato says directors and producers should intervene. These are retrospective accounts, not measured efficiency comparisons. [CTP20]

**Interpretation:** preserve the player's valuable choice while controlling the authoring burden. A small set of distinctive combinations can be preferable to a nominally universal system whose possibilities cannot all be made worthwhile. Reuse and automation should support deliberate exceptions, with visible costs.

**What is not known.** These interviews do not establish the complete internal toolchain, source-control system, exact editor implementation, production burn rate, milestone acceptance criteria, outsourcing allocation, staff-month count, or quantitative playtest sample. Their observations are stronger evidence of intent and remembered working practices than of measured productivity. The community tools discussed below must not be retroactively described as Square's original tools. No inspectable production ledger was found; detailed internal economics remain unknown.

### Editions, distribution and post-release maintenance

The Japanese DS release announcement moved the planned date forward one week to **November 20, 2008**, setting a recommended price of **¥4,800 before tax / ¥5,040 including tax**. It positioned the edition around dual-screen presentation, new systems and additional content, attributing the schedule change to fan anticipation. The announcement is evidence of publisher positioning, not an independent demand measurement. This nominal Japanese retail price cannot be multiplied by worldwide DS shipments to reconstruct receipts. [CTP13]

The edition and reception sections document PC maintenance and regressions. [CTE03], [CTR15] The economic implication is a continuing compatibility and support obligation alongside expanded distribution. [Analysis]

The dossier's advertisement case studies separately examine DS nostalgia-led print positioning and a television spot. Those artifacts are evidence of creative execution and audience targeting, not campaign conversion, marketing spend or incremental sales. Across editions, evaluate three distinct promises: access on a new platform, preservation of the familiar experience, and additional functionality. A release can satisfy one and disappoint on another; a famous underlying game does not remove port-specific execution risk. [CTA01], [CTA02], [CTA03]

### R11: commercial evidence, modeled estimates and uncertainty

#### Measurements with defined scope

Square Enix's fiscal-year briefing reports **790,000 Chrono Trigger DS units during April 1, 2008–March 31, 2009**. The chart uses thousands; this is an edition-specific fiscal-period result, not lifetime sales or title revenue. Company revenue and profit elsewhere in the presentation cannot be allocated to this title. [CTP01]

Contemporary reporting of the 2025 anniversary announcement states **more than five million copies shipped worldwide across editions**. Nintendo Life reproduces and links the publisher statement. The official article body did not render in the research interface, so the primary claim is verified through that secondary relay. This is neither five million distinct people nor five million full-price purchases, and it must not be presented as a Steam-only number. [CTP02], [CTP03]

#### Audit of available third-party estimates

An **excluded calculator** illustrates the evidence problem. SteamRev's **October 21, 2025** snapshot claims approximately **415.9 thousand Steam owners**, **US$6.23 million list-price gross** and **US$2.25 million modeled net**. It uses approximately 11.9 thousand reviews ×35 ×US$14.99, then sequential assumptions for regional prices (15%), discounts (25%), refunds (5%), platform fees (30%) and taxes (15%). The site states that model version, input observation dates and confidence were not recorded. Its production metadata also includes an uncorroborated purported 2022 HD-2D remaster. The arithmetic is recorded here for the rejection audit, not accepted as an estimate of this game's finances. Its current-price starting point, unsupported multiplier, unverified deductions and suspect metadata do not establish consumer spending, publisher receipts or profit. [CTP15]

A SteamDB search result displayed owner estimates of approximately **197.2 thousand from Video Game Insights versus 709.4 thousand from Gamalytic**, a roughly 3.6-fold spread. This was search-level evidence rather than a reconciled provider dataset, so it is an uncertainty diagnostic, not a verified sales interval or statistical confidence band. Provider models, observation dates and owner-versus-purchase definitions can differ. [CTP16]

Gamalytic's own methodology combines sales-rank, concurrency, review-based inference and disclosed results. It distinguishes owners from direct Steam purchasers and warns that external revenue, bundles and estimation errors can affect results. That methodological disclosure helps explain why a modeled owner count should not silently become paid-unit revenue. It does not validate the particular estimates above. [CTP17]

#### Financial-search record and decision

Research searched title-specific combinations of **Chrono Trigger, Steam, revenue, sales estimates, VG Insights, Gamalytic, app 613830, development budget, Square, cost and development team**. It inspected the publisher's fiscal briefing and DS announcement, the anniversary report, SteamRev's model, Gamalytic's methodology, and the SteamDB search evidence. Search also surfaced Gameselo, another review-multiplier calculator, several small statistics aggregators, and an unattributed development-budget claim. Gameselo's page failed to open; the other summaries lacked adequate provenance for a stronger conclusion. No title-level audited income statement, original budget, port budget, actual realized-price series, marketing cost or rights split was found in the material reviewed. These are bounded search results, not a claim that no such records exist anywhere. [CTP01], [CTP02], [CTP03], [CTP13], [CTP15], [CTP16], [CTP17], [CTP18]

| Quantity | Defensible conclusion | Missing inputs or boundary |
|---|---|---|
| Historical units | Edition-period and all-edition milestone reported above | Shipment/sell-through distinction, platform and regional split, repeat buyers |
| Steam partial-market economics | Public models were inspected; **no sufficiently supported financial estimate adopted** | Purchase validation, actual prices, regional mix, keys, refunds, taxes and model provenance |
| All-edition consumer spending | **Not estimable from inspected evidence** | Historical realized prices, geography, currencies, discounts, bundles and returns |
| Publisher receipts | **Not estimable** | Wholesale realization, retailer/platform deductions, contracts and accounting recognition |
| Original and subsequent project costs | **Not established** | Development, overhead, localization, manufacturing, marketing, QA, rights and maintenance |
| Title profit, breakeven and return on investment | **Not estimable** | Attributable receipts and fully allocated costs |

For a defensible future reconstruction, calculate each edition/region/period's paid units ×realized receipts per unit, then subtract attributable costs. Retain historical nominal currencies until a specified conversion or inflation step. A low/base/high forecast requires justified input ranges and correlated assumptions; giving a rejected calculator arbitrary error bars would manufacture precision. The available owner-model spread is not sufficient for a defensible financial range, and multiplying the cumulative shipment milestone by a current digital list price is invalid. [Analysis of evidence limits above]

#### What plausibly explains commercial durability

| Mechanism or hypothesis | Evidence and causal limit | Open Legend implication |
|---|---|---|
| Platform reach and renewed purchase occasions | The DS period result and later all-edition milestone demonstrate demand across time, but do not isolate new audiences from repeat buyers or any port's incremental return. [CTP01], [CTP02], [CTP03] | Treat platform adaptation as a separate investment with its own audience, costs and acceptance criteria. |
| Preservation plus added convenience can create premium reissue value | The DS announcement sells platform-specific additions; willingness to pay for each addition is unmeasured. [CTP13] | Test which changes improve the promised experience and which undermine familiarity or usability. |
| Quality and support affect the value of distribution | See the edition/reception evidence above; revenue recovered by support is unmeasured. [Analysis] | Budget for launch readiness and continuing support. A large installed audience can magnify support costs as well as sales. |
| Memorable work can produce recommendation, replay and repurchase | This is consistent with the milestone and the separate reception findings, but reputation, platform availability, price and historical audience formation are confounded. [CTP03] | Evaluate completion, recommendation and later return separately; finishing a finite RPG is not automatically failed retention. |
| Community creation can extend reasons to revisit | The documented ecosystem below supplies additional activities, but no causal sales uplift, creator earnings or publisher return is established. | Enable creation where its value exceeds tool, moderation and compatibility costs; do not assume a marketplace or volunteer labor will be self-sustaining. |

**Commercial outcome: durable demand is supported; financial profitability is unresolved.** Player enjoyment, publisher return and creator sustainability are different outcomes. This case does not establish that longer engagement would have been more profitable, that every rerelease paid back its costs, or that replicating a celebrated mechanic will reproduce the same business result.

### R15 creator-ecosystem gate: yes

The documented ecosystem includes playable transformations, maintained tools, supporting guides and organized play. The dated documentation below establishes activity across multiple years; the separate authored Chrono Trigger+ case strengthens the evidence beyond tool availability. No reliable active-creator census, download total, retention curve or earnings distribution was established. [CTP05], [CTP06], [CTP07], [CTP08], [CTP09], [CTP10], [CTC01], [CTC02], [CTC03]

#### Tool map and factual owners

| Project | Role | Evidence boundary |
|---|---|---|
| Jets of Time | Progression/rules transformation and generation | Maintainer homepage and installation guide |
| Temporal Flux | Established authoring system | Separate CTC case study |
| Temporal Redux | Developing alternative editor | Repository documents incomplete functionality |
| CTViewer | Scene/resource inspection | Diagnostic fidelity is limited |
| JetsGuide | Human-facing progression assistance | Historical guide with explicit version |

**Jets of Time — design.** The maintainer describes an open-world randomizer in which players use the Epoch to find characters and key items, ultimately reaching Lavos. It provides online generation, downloadable executables and older releases. This is a community transformation of the game, not a Square-supported editing platform. [CTP05]

**Jets of Time — documented play path.** The Getting Started page, modified December 16, 2025, requires a valid US SNES ROM, offers beginner/standard race presets, and directs users through online or local generation to emulator or flash-cartridge play. It links trackers, guides, known-issue help, Discord, weekly Twitch races and YouTube VODs. The wiki carries a CC BY-SA notice. This supplies a documented generator-to-play route; its existence does not establish user population or legal permission to distribute the base game. [CTP06]

**Jets of Time — exact inspected release.** The release page labels **v3.2.0**, commit `3af9a5a`, as latest; its rendered timestamp says **16 January, 17:48 without a year**, so the year remains unverified. Added modes include Legacy of Cyrus, Ice Age and VanillaRando; other options change bosses, gear, healing, flight access and victory conditions. Bucket Fragments is incompatible with Lost Worlds, Legacy of Cyrus and Ice Age. The notes include softlock fixes and a remaining recruitment-related party-transition qualification, especially in Lost Worlds. They also offer reduced flashes. These are version-specific statements, not a claim about every historical or future seed. [CTP09]

**Temporal Redux.** The repository describes a remake of Michael Springer's Temporal Flux incorporating Jets of Time code. It documents Python 3.7+, PyQt6, virtual-environment/package setup and a module entry point; its license is GPL-3.0. Known limitations include absent string editing, crashes when editing a command twice, command-switching problems and limited testing. It should be evaluated as an evolving community editor, not assumed to be a fully compatible replacement or Square's original development environment. [CTP07]

**CTViewer.** The MIT-licensed viewer accepts headered/unheadered North American SNES input, Steam `resources.bin`, or extracted Steam resources; its README links CTExplore. It exposes scene/world views, actors, animations, scripts, collision/exits and other debug overlays, plus diagnostic/screenshot dumps. Its Rust/SDL3/SDL3_ttf build and documented gaps—scanline effects, incomplete scripts, world wrapping and unsupported PC map extensions—belong to this community tool. No reviewed evidence establishes a complete authoring/export system or a validated bridge to the other editors. [CTP08]

**JetsGuide.** Version 1.4 is dated December 14, 2020; the interactive guide credits multiple contributors and organizes progression by modes, characters, eras and items. Its historical race flags and GPL-v3 code notice belong to that guide. It demonstrates supporting community work, but its configuration should not be substituted for current generator documentation. [CTP10]

#### Workflow, updating and support boundaries

**Documented route:** use the generator-to-play sequence above. **Unverified route:** inspect with one tool, edit with another, then assume that both interpret the same revision identically. This research found no end-to-end compatibility contract joining every tool in the map. Treat cross-tool composition as a hypothesis requiring target-specific validation, not an installation recipe. [CTP05], [CTP06], [CTP07], [CTP08]

For reproducibility, record the target game revision, generator/editor version, seed, flags, dependencies and distribution artifact. When updating a creation, retain the old configuration and input, inspect the relevant release notes, generate or build a separate output, and compare the intended behavior before replacing a published version. A seed identifier alone need not reproduce the same output after algorithm changes. These are recommended controls, not claimed features already supplied by every project.

**Bug routing:** Jets of Time advertises wiki/Discord support; for an editor or viewer defect, start with that project's own repository and contribution/support guidance. Separate a generation failure, a game softlock, an editor crash and a preview-only discrepancy. Supply versions, reproduction steps and allowed diagnostic material; do not attach copyrighted base-game data by default. This routing is a practical inference from separate maintainership, not a support guarantee or verified maintainer response-time commitment. [CTP05], [CTP06], [CTP07], [CTP08]

**Saves and conflicts:** no inspected material establishes universal save migration across seeds, rulesets, arbitrary patch combinations or tool versions. Preserve independent backups and an unchanged base input; use a new run for changed rules unless the specific project documents a supported migration. Two patches touching the same data do not become compatible merely through a proposed load order. No shared official plug-in loader or general conflict resolver was established. Similarly, the documented race format should not be mislabeled as in-game cooperative multiplayer. These are explicit unresolved boundaries and operational recommendations, not claims that all modifications corrupt saves.

#### Rights, distribution, incentives and governance

Community code/documentation licenses do not automatically grant rights in Square's game code, characters, images, music or resulting modified game data. Separate the tool, original input, creator's contribution and distribution package. No inspected source establishes blanket publisher permission for these modifications, a creator revenue share, paid marketplace, moderation staffing, enforcement procedure or funded maintenance commitment. This dossier does not determine the legal status of a particular acquisition or patch.

Square Enix's media guidelines, updated **April 10, 2025**, permit specified individual video/image sharing and platform advertising monetization while restricting uses such as access paywalls and isolated music/cinematic uploads; attribution and spoiler provisions apply. This is a bounded media policy, not a modding license. A creator using gameplay footage should consult its current complete terms rather than treating this summary as permission for every commercial use. [CTP19]

Observed contributions, guides, races and published tools are compatible with intrinsic enjoyment, social recognition and technical learning as incentives. They do not establish meaningful earnings. Free availability can lower adoption friction while leaving maintenance, hosting, documentation and support costs with creators. Any comparison with Open Legend must therefore ask who pays those costs and what happens when an essential maintainer leaves. [CTP05], [CTP06], [CTP07], [CTP08], [CTP09], [CTP10]

#### Transfer hypotheses for Open Legend

- **Expose meaningful rules, not only surface customization.** Progression dependencies, encounters and victory conditions can produce substantial variation. The prerequisite is validation of reachability and failure states, with intelligible incompatibility messages.
- **Make creation inspectable.** A useful inspector should connect visible behavior to its underlying data, disclose preview gaps and support reproduction in the actual runtime.
- **Make packages reproducible and updateable.** Specify target revisions, dependencies, versioned formats, saved-state policy and compatibility checks before a large catalog accumulates.
- **Make distribution and rights understandable.** Give creators an explicit format for their contributions, documented permitted assets and clear rules for packaging, attribution and sharing.
- **Maintain the human support layer.** Guides, examples, presets and help channels should be treated as continuing product responsibilities, with version labels and a maintenance arrangement.

These are research implications, not approved implementation scope. An unfamiliar new game cannot assume that decades of audience attachment and volunteer toolmaking will appear automatically. The next useful validation would be a narrowly scoped creator task with observed completion time, failure modes, support burden and repeat participation; tool availability alone is not success.

### A mature authoring route and a concrete expanded adventure

**Temporal Flux is the established editor lineage behind the newer experiments.** Data Crystal's community documentation identifies Geiger's .NET editor and complementary tools for data and instrument editing. Its original authoring tutorial shows that event work reaches beyond swapping images: an author can stage an encounter, change an opening scene, coordinate movement and screen transitions, inspect stored conditions and place the Epoch. The documented encounter sequence disables exploration, positions the actors, starts combat, removes the relevant object and restores exploration. That is a concrete, data-driven authoring vocabulary. The same tutorial flags uncertain command behavior and ordering hazards; its existence does not make every field safe or fully understood. [CTC01], [CTC02]

**Interpretation:** useful authoring tools expose coherent actions and inspectable conditions. The OpenLegend opportunity is to make a small situation editable and understandable without requiring a creator to reverse-engineer memory addresses. That still requires reliable validation: a visually convincing scene can leave interaction disabled, strand a person or skip a necessary transition. Original Temporal Flux's maintainer site was inaccessible in this pass, so no claim is made about its latest supported build or current installation requirements.

**Chrono Trigger+ demonstrates a different creative ambition from randomization.** In its 3.0 announcement and subsequent support thread, the creator describes breaking Frog's curse and alternate character appearances. Later replies discuss additional 1999 content, altered dialogue, prerequisites and corrected progression barriers. Players report enjoyment alongside patching uncertainty, hardware failures and confusion over “3.0” versus a later “Final 2.1” designation. One player cannot tell whether the intended alteration actually installed; another mistakes an older package for the current one. The creator provides identifying scene changes and explains versions. These are attributed reports, not reproduced tests or a universal compatibility verdict. [CTC03]

**Interpretation:** creation success includes discoverability, packaging, version identity and diagnosis. A distinctive expansion can still be hard to enjoy when a player cannot tell what is installed. An explicit project/version screen, validated inputs, a clear update route and documentation matched to that version would reduce this uncertainty. A mod may also deliberately change interpretation, progression or characterization; an “enhanced” edition is an author's alternative, not automatically a definitive preservation of the original.

## Advertising cases: what the promotion chose to communicate

Contemporary reporting on the **2008 DS print campaign** describes a spare advertisement built around the opening greeting, the original game's recognizable lettering, a release date written with “AD,” and a dedicated web address. Alex Donaldson interprets it as addressing people who already remember the adventure; he also notes that the actual DS lettering differs and questions whether newcomers are being neglected. This is evidence of a particular creative execution and a contemporary critic's reading, not a measured customer-acquisition result. [CTA01]

A **Japanese DS television commercial**, described by Siliconera in November 2008, turns the port into a small character scene: Ayla notices the DS, then the sprite cast moves from a Super Famicom into the handheld. The article values the use of the characters over a generic montage but explicitly leaves its sales effect uncertain. This pass read that contemporary description; it did not watch or independently transcribe the commercial. [CTA02]

**Interpretation for OpenLegend:** an advertisement can demonstrate a product promise through the world's own people and behavior. Recognition can efficiently reactivate an established audience, but a new property cannot assume the viewer already cares about an opening line. A useful contrast to test would be an intelligible small adventure—someone wants something, acts, encounters a consequence—against a montage of attractive scenes. Neither historical case proves which would convert better. The ad should promise an experience the ordinary game can deliver, not a cinematic exception that misstates normal play.

For original-release preservation, MobyGames indexes a North American magazine advertisement to *Electronic Gaming Monthly* issue 73, August 1995, and a Japanese one to *Gamest* issue 136, January 30, 1995. The direct image-page fetch was blocked, so those are archive-discovery routes rather than newly inspected layouts. No inference about the complete media buy, target demographics, advertising spend or conversion rate follows from their existence. [CTA03]

## Reception and player experience

Research capture: 2026-11-06. Scope: original design as experienced through launch-era reception records, later retrospection and the DS release, plus the separately assessed Steam port. This section supplies R12 and the enjoyment/return-loop part of R02/R04, with five fully read independent reviews, contrasting player accounts and explicit evidence limits. No gameplay was personally executed and no video was represented as viewed.

### Original launch reception and later legacy

**1995 reception context, with an archive limit.** A later transcription of Nintendo Power issue 75 praises the original's graphics, audio, depth and replay appeal; even its nominal negative is a joke about lowering the appeal of other RPGs. Defunct Games' historical records list Chrono Trigger as EGM's August 1995 Game of the Month at 9.25/10 and report its subsequent Super NES, role-playing and cartridge-music awards. Reproduced EGM comments show expectations tied to Square's earlier Final Fantasy and Mana work, alongside enthusiasm for emotional range. These are reproduced snippets and historical score/award records, **not complete 1995 review bodies read for this investigation**. They are not added to the five-review minimum. [CTR16], [CTR17]

The Chronicles preservation project links scanned Nintendo Power volumes 73 and 74, providing a relevant route into prelaunch expectations and player coverage. Both linked PDFs returned 404 in this investigation; no claim is made to have inspected their pages. The retrospective transcription and EGM records therefore support the bounded conclusion that considerable acclaim existed at release, while the detailed launch-era argument remains less securely recovered than the DS criticism. Neither scores nor awards establish why a particular buyer purchased the game. [CTR18]

**A modern reassessment of the original story — major sidequest spoilers.** In his August 2025 GameSpot essay, Phil Hornshaw revisits the adventure he first played in 1995 and acknowledges that memory had supplied depth beyond the dialogue. He still finds its heroism affecting: the group acts for people far beyond its own lifetime. Fiona's restored forest and Robo's service make that care visible; Lucca's return to childhood becomes a frightening, personal opportunity to help. The campfire lets companions reflect together. In his interpretation, purposeful acts and images carry durable emotional meaning despite relatively thin characterization. This is one critic's reassessment, with acknowledged childhood attachment, rather than evidence of a universal response. Embedded videos were not viewed. [CTR19]

### Independent written reviews

The first five rows below are substantive review bodies read from five independent publications, not five scores or syndicated excerpts. Their original subject is the DS edition: judgments of the underlying adventure can illuminate the SNES design, while touch controls, bonus dungeons and added endings belong to the later release. This sample is strongly favorable overall; disagreement appears in controls, translation, bonus content and repeat-purchase value. [CTR01], [CTR02], [CTR03], [CTR04], [CTR05]

| Publication, reviewer and date | Concrete praise | Criticism, limits and audience distinction |
| --- | --- | --- |
| Nintendo Life — David Snoddy, 2009-03-18; European DS review. [CTR01] | Visible enemies reduce unwanted interruptions; cooperative techniques add personality to combat. Time travel, readable sprites, music and the second-screen interface sustain the adventure's appeal. | Avoiding too many fights can leave the party weak. Existing players will find relatively little genuinely new material. The review is overwhelmingly positive and supplies little counterweight on challenge or narrative depth. Its broad rhetoric about temporal consequences should not be mistaken for an unrestricted simulation of history. |
| RPGFan — John P. Hussey, 2009-01-05; DS. [CTR02] | New Game Plus makes the timing of the final confrontation a player-selected goal. Optional cutscenes and touch controls accommodate both returning fans and newcomers; shortcuts make party changes convenient. | The reviewer explicitly acknowledges nostalgia. He considers the graphics less expressive than Final Fantasy VI and finds the new dungeon and monster arena disappointing, with little reason to train a monster. His favorable touch-control judgment conflicts with other reviewers. |
| RPGamer — 7thCircle, 2008-11-11; DS, page updated 2021-06-18. [CTR03] | The journey moves coherently from a local incident to global stakes. Distinct party roles, dialogue that fits the active characters, cooperative techniques and spatial attack shapes connect characterization to decisions. The revised interface is efficient. | Stylus movement is awkward; bonus material feels detached; the new translation is not a substantial improvement for this reviewer. Collecting all endings can itself become laborious. The original game is recommended to newcomers, but new extras alone may not justify repurchasing it. |
| Nintendo World Report — Jonathan Metts, 2008-12-23; DS. [CTR04] | Clearer dual-screen presentation preserves the original's visual and musical strengths. New Game Plus and alternative endings support deliberately different revisits. Dimensional Vortices offer more worthwhile challenges and rewards than the Lost Sanctum. | Lost Sanctum repeatedly sends the player between eras through recycled areas for weak rewards. The monster arena and imprecise touch movement are unconvincing; the premium asking price is questionable for existing owners. This is a critique of the expansion's value, not rejection of the base adventure. |
| GamesRadar — Henry Gilbert, 2008-11-24; DS. [CTR05] | On-map battles preserve momentum. Combined techniques cost both participants' turns. Varied eras refresh a familiar save-the-world premise, and the extras form an attractive package. | Complaints include floaty stylus movement and caricatured prehistoric dialogue. The favorable package judgment differs from other reviewers' criticism of particular additions. |
| GameSpot — Lark Anderson, 2008-11-21; DS. **Indexed substantial excerpts; direct fetch blocked.** [CTR06] | Praises the cast, empathetic antagonists, combat, soundtrack and a port free of the PlayStation release's loading delays. | Criticizes repetitive Lost Sanctum errands and the monster arena's weak reason to return; finds more value in the Vortices and additional ending. This corroborates the bonus-content disagreement but is not counted among the five complete accessible bodies. |

### Steam helpful-review evidence: preserve the version

The English **Most Helpful (All Time)** surface mixes recommendations and rejections. This is a selected qualitative sample. Displayed hours are current account totals, not necessarily hours at publication. [CTR07]

| Sample | What the player actually reports | Interpretation boundary |
| --- | --- | --- |
| King Aquamentus, recommended, 2018-08-10. [CTR07] | Patches made the port worth reconsidering. | Historical recovery. |
| ChefBoyardeesgamesfun, recommended, 2021-09-07. [CTR07] | Enjoyed a first play without childhood nostalgia. | One newcomer. |
| Tanneroni, not recommended, 2018-02-27. [CTR07] | Dislikes filtering, interface, font and controls. | Launch-port complaint. |
| Dr. Cgad, not recommended, 2022-06-17. [CTR07] | Reports movement, stutter and enemy-speed regressions; acknowledges possible later fixes. | Version-specific, unreproduced. |
| Yolulu, recommended, “4 March,” year omitted. [CTR07] | Loves the game but wants visual, movement and translation mods. | Preservation preference. |

#### More firsthand accounts: what the average recommendation conceals

**Geeks Under Grace's 2019 roundtable compares sharply different playthroughs.** Maurice Pogue reports confusing routes, unwanted repeat fights and a month-long break through boredom. Adam Mueller likes sidequests and endings but uses auto-battle to collect outcomes while playing another game. Jamie Rice, without childhood attachment, loves the story and music, prefers fully turn-based combat, and finishes content without immediately replaying. Michael Mendis dislikes menu navigation under time pressure even with Wait mode; Derek Thompson's attachment and LJ Lowery's favorable PC revisit add veteran perspectives. These are self-reports from one publication, not six independent sources. [CTR08]

**A 2024 Steam discussion separates design preference from technical reliability.** On April 28, Nox describes little customization, low resistance and repeated use of a few strong moves. On April 26, vine reports twenty hours without crashes and appreciates convenient suspension and automatic combat. On May 11, BEEF SUPREME praises the adventure despite sound faults and plans to skip the later bonus dungeons on future runs. One reader's bland combat is another's comfortable progression; one machine's smooth performance does not invalidate another's bug report. [CTR09]

**A shorter finish can be the reason to choose the game.** In a patientgamers discussion, Alternative-Wash2019 reports finishing in under 25 hours and enjoying its momentum after exhausting themselves on longer RPGs. Replies include people newly interested because the commitment is manageable, and disagreement about whether joke/alternative endings warrant further play. This supports a finite, satisfying adventure as an appeal, not a universal completion-time estimate. [CTR10]

**A return does not guarantee the remembered experience.** In a December 2022–January 2023 Steam thread, first-time player Mr Moopsy likes the story and combat, whereas returning player Incitatus remembers loving the game but now finds it simpler and less impressive. That is counterevidence to both “only nostalgia explains the praise” and “everyone finds it timeless.” [CTR11]

**Controls can create a separate learning burden.** On another accessible Steam helpful-week snapshot, first-time player rヨn enjoys the story and techniques but initially finds timed command entry frustrating and some paths obscure; they recommend the game despite a reported graphics-driver problem. Returning player thatDubstepSound describes emotional familiarity and periodic revisits while preferring SNES presentation and a personal mix of modifications. The displayed posts say March 22 and March 23 without years. Their accounts establish particular experiences; they do not establish the state of the latest build. [CTR12]

### Why play remains enjoyable—or stops being enjoyable

The mechanisms below are **researcher interpretations** grounded in the specific accounts, not measured causes of sales, retention or wellbeing.

| Experience loop | Why it can work | When it fails or attracts a different audience |
| --- | --- | --- |
| **Discover a new era → recognize familiar geography in a changed state → investigate what caused it → pursue the next temporal problem.** | A sequence of distinct settings renews visual and narrative curiosity without requiring an unrelated new game. The time-travel premise makes revisits intelligible. [CTR01] | The existence of visible routes does not mean every route currently advances the plot. A player who cannot infer the next prerequisite may repeat battles while searching, rather than experience the intended narrative momentum. [CTR08] |
| **Choose companions → identify an enemy pattern → select individual or combined techniques → see the party succeed together.** | A small active party makes combinations legible, while the cost of committing multiple characters creates a local choice. Character identity is expressed in combat as well as dialogue. [CTR03], [CTR05] | If ordinary encounters are easy enough to resolve with the same move, combinatorial possibility becomes optional spectacle. Players seeking extensive build authorship or demanding tactics can find the system shallow. [CTR09] |
| **Finish a meaningful episode → improve the party → immediately encounter another achievable goal.** | The adventure's manageable scope can sustain voluntary continuation and leave a satisfying memory at completion. [CTR10] | Ease and brevity are preferences, not universal virtues. Expectations of long character arcs or large customization systems can turn streamlined play into perceived thinness. [CTR09], [CTR11] |
| **Return to a familiar place or musical theme → reconnect with a character or memory → choose another playthrough.** | Attachment can outlast a single campaign; presentation and remembered companionship are motives beyond stronger equipment. [CTR12] | Familiarity can also expose repetition or make a changed translation, interface or sound especially distracting. A returning player's attachment need not make every port acceptable. [CTR11], [CTR12] |

The main game's praise and the Lost Sanctum criticism make a useful comparison. **A repeated location needs a new purpose or payoff.** Nintendo World Report found the Vortices' challenge and rewards more worthwhile than extended fetch chains; GamesRadar valued the broader extras package more generously. The implication is to evaluate what the added action changes for a player, rather than treat additional hours as automatic value. This is a design inference, not a controlled test. [CTR04], [CTR05]

### Finishing, replaying, leaving and returning

**First completion and voluntary replay serve different goals.** The initial campaign offers discovery and resolution. New Game Plus changes the question to when the player can finish and which outcome follows, as RPGFan emphasizes; its appeal can be finding a variation or revisiting favored scenes rather than relearning the whole game. RPGamer supplies the counterpoint that seeing every ending can become laborious. Neither an ending count nor one enthusiastic review establishes that most players want repeated campaigns. [CTR02], [CTR03]

**Interpretation of the evidence:** there are at least four distinct outcomes worth preserving in the dossier: finishing satisfied and stopping; returning for affection or presentation; pursuing alternative conclusions; and abandoning or automating stretches that no longer hold attention. These should not be collapsed into a single engagement score. A low return rate, if one were measured, could reflect successful closure as well as boredom. Conversely, many logged hours or every ending unlocked would not by itself establish sustained enjoyment.

**Evidence boundary:** no representative completion rate, cohort retention, session frequency, measured return-after-failure rate or prevalence of abandonment was established in this reception investigation. Steam hours and anecdotes are insufficient substitutes. Death/save rollback and precisely retained New Game Plus state belong in the dossier's verified mechanics section; this reception evidence does not independently verify every carry-over exception. There is no claim here that involuntary progress loss causes the game's appeal.

### Version-specific problems and developer response

| Edition/time boundary | Reception finding | What can safely be concluded |
| --- | --- | --- |
| **SNES original, launch records and later recollections** | Reproduced 1995 praise coexists with modern acknowledgement of a comparatively simple script. [CTR16], [CTR17], [CTR19] | Distinguish recovered review snippets, award records and later personal reassessment. |
| **DS, 2008–2009** | Strong independent reviews coexist with disputes over touch controls, added-content quality and value to previous owners. [CTR01], [CTR02], [CTR03], [CTR04], [CTR05], [CTR06] | Claims that the DS edition was “definitive” are reviewers' dated judgments. They do not certify present availability or every later port. |
| **PC launch and 2018 repair period** | Square Enix's August 3 patch notes document rebinding, an extras section and bug fixes. [CTR13] | The provider made concrete changes in response to feedback. Reporting in August observed improved recent Steam sentiment, but this was a contemporaneous observation, not a controlled sales/retention result. [CTR14] |
| **Later PC reports** | Dated player accounts above disagree about reliability and presentation. [CTR07], [CTR09] | The findings describe changing versions and particular experiences. This desk study does not reproduce or certify current hardware compatibility. |

The August 2018 article's phrase “final patch” must remain historical. Square Enix's announcement index also lists updates in March 2022 and August 2023. The 2018 repair story is therefore not the end of the product's maintenance history. [CTR14], [CTR15]

### Reception evidence limits and reading route

Start with the five DS review bodies for the independently corroborated strengths and the disagreement over additional content. Then read the Geeks Under Grace roundtable for contrasting modern experiences, followed by the dated Steam discussions and the helpful-review surface. Check official updates before turning an old port complaint into a current technical assertion. [CTR01], [CTR02], [CTR03], [CTR04], [CTR05], [CTR06], [CTR07], [CTR08], [CTR09], [CTR10], [CTR11], [CTR12], [CTR13], [CTR14], [CTR15]

This investigation deliberately sought criticism as well as acclaim, so its negative examples are not randomly sampled. The selected written reviewers are mostly English-language and favorable; this is not a representative survey of regions, age groups or accessibility needs. The research records stated preferences, not diagnoses of players. Steam's ranking and cached surfaces change; dates without a year have not been silently converted to 2026. Several Reddit/ResetEra/Backloggd routes and individual Steam-review permalinks failed, and they are not represented as fully read. No new video-viewing or personal playtest claim is made.

## What OpenLegend can learn — hypotheses, tradeoffs and existing owners

These are research conclusions to use when a corresponding design is selected. They do not change the current first-playable scope, prescribe a turn-based game, or certify player response in OpenLegend.

### Make a desired next action easy to see

The opening supplies a place to enjoy and a person to help before its larger explanation. Later, a changed understanding makes another visit worthwhile. A useful OpenLegend opening could make an attainable concern, an intriguing destination and a particular person's purpose visible together. That is compatible with player initiative: the player still needs a reason to choose one of the possibilities. Compare the first-session and late-game evidence above, rather than using “freedom” as a substitute for a legible invitation. [CTN02]

**Existing owner:** [Playable game first](../../../../docs/repertoires/gameplay-priorities.md#the-game-we-need-to-be-able-to-play). **Counterpoint:** over-directed introductions can make alternatives seem decorative; the invitation must lead into actual usable options.

### Let investment change several kinds of value

An object can become more capable, a person can feel differently about it, and a place can become newly understandable. These effects can reinforce one another without every reward being a higher damage number. The character cases distinguish a practical improvement, a historical discovery and a personal resolution. [CTN12], [CTN13], [CTN15]

**Existing owners:** [Authored worlds and personal discovery](../../../../docs/narrative/authored-worlds-and-personal-discovery.md#author-a-history-let-people-discover-and-change-the-world) and [the progression reading route](../synthesis/progression-and-builds.md). **Counterpoint:** do not attach a tragic biography to every tool or require a dialogue scene for every upgrade. Ordinary usefulness and pleasure can be enough.

### Make cooperation change what participants can do

The techniques and party-role evidence asks a concrete question: what becomes possible when these particular capabilities are available together? For OpenLegend, carrying, preparing, investigating, building or fighting together could have distinct contributions instead of a generic proximity bonus. This is a pattern to investigate, not approval to reproduce Chrono Trigger's combination list.

**Existing owner:** [Meet people and do useful things together](../../../../docs/repertoires/gameplay-priorities.md#whole-game-build-order). **Counterpoint:** a required specialist can become an access bottleneck or leave the others waiting. Preserve viable alternatives, consent and useful participation. A combination should justify its coordination cost.

### Reuse places through change, not compulsory repetition

The late optional structure and the reception of the Lost Sanctum separate meaningful return from repeated travel. The relevant difference is what the visit reveals, enables or asks the player to decide; geographical reuse alone is neither a virtue nor a flaw. [CTN06], [CTR03], [CTR04]

**Existing owners:** [The frontier](../../../../docs/narrative/authored-worlds-and-personal-discovery.md#make-the-frontier-inviting-and-consequential) and [the whole activity's time cost](../../../../docs/repertoires/gameplay-priorities.md#keep-play-worthwhile-as-players-learn-and-return). **Counterpoint:** a familiar routine can itself be enjoyable. Assess the player's purpose and the complete trip rather than imposing novelty on every visit.

### Give understanding a payoff without rewriting truth

A place, adversary or object can remain physically the same while its significance changes. OpenLegend already distinguishes what happened, what survives, what somebody believes and what the player can do with a discovery. This research strengthens the reason to keep those distinctions. A revelation can open a new possibility without generating a different past for each visitor.

**Existing owner:** [Five elements of discoverable history](../../../../docs/narrative/authored-worlds-and-personal-discovery.md#author-a-history-let-people-discover-and-change-the-world). **Counterpoint:** surprise is not a substitute for evidence. A twist that invalidates everything learned without fair clues can make investment feel wasted.

### Keep persons particular, including nonhuman persons

The cast's usefulness is tied to recognizable concerns, relationships and capabilities. A robot's lifespan or a transformed knight's history changes the available situation. OpenLegend can pursue that specificity through current activities and choices, without requiring every individual to carry a long prewritten backstory.

**Existing owner:** [Let a lost soul have a future as well as a past](../../../../docs/narrative/authored-worlds-and-personal-discovery.md#let-a-lost-soul-have-a-future-as-well-as-a-past). **Counterpoint:** authored emotional scenes are not evidence that an unscripted character will behave coherently. That remains a separate design and playtest problem.

### Preserve the difference between mastery, knowledge and convenience

The mechanics and review sections show several separate costs: selecting a sensible action, learning an enemy rule, navigating a route, enduring a loading delay and operating a touch interface. Reducing the last two need not remove the first three. Conversely, easy battles can lose interest for players who want sustained strategic pressure.

**Existing owner:** [Enjoyment after learning an efficient method](../../../../docs/repertoires/gameplay-priorities.md#keep-play-worthwhile-as-players-learn-and-return). **Counterpoint:** a convenience can erase an intentional uncertainty or preparation decision. Evaluate the decision it changes, not whether the option is labeled modern or accessible.

### Let worthwhile things finish

The reception evidence includes satisfied completion, chosen replay, fatigue with collecting every ending and abandonment after losing direction. Those are different outcomes. A persistent OpenLegend world can contain a finished restoration, a resolved dispute, a completed personal journey and a quiet period while other possibilities continue.

**Existing owners:** [Quiet life and worthwhile stopping](../synthesis/pacing-difficulty-and-replay-variety.md#quiet-life-wanted-pressure-and-worthwhile-stopping) and [current priorities](../../../../docs/repertoires/gameplay-priorities.md). **Counterpoint:** a world with nothing further worth attempting has a real problem; the answer need not be undoing every achievement or imposing perpetual maintenance.

### Make presentation serve ordinary play as well as climaxes

Readable expression, recognizable musical identity and a scene worth revisiting can support attachment. The production and music evidence also warn that acclaimed output does not validate unhealthy work or guarantee that every repeated cue remains welcome.

**Existing owner:** [Audio and feedback](../../../../docs/production-workflows/audio-and-feedback.md). **Counterpoint:** the research is not a new art direction, an asset license, a reason to copy these characters, or proof that more visual detail produces more enjoyment.

### Learn from the production system without inventing its economics

Use the production and commercial evidence below to separate a famous team's identity from the work and distribution that delivered the game, and sales from undisclosed profit. The modding case can reveal what people choose to build and maintain after a campaign ends. Neither a classic's long life nor a large mod catalog proves that the same development budget, tool architecture or revenue model will work for OpenLegend.

**Existing owners:** [Production and validation research](../synthesis/production-iteration-and-validation.md), [creator tools](../synthesis/creator-tools-and-content.md) and the existing [root authority boundaries](../../../../AGENTS.md#boundaries). No runtime tasks are created by this dossier.

## Coverage, evidence boundaries and reading routes

This dossier is a full pass against the repository's research standard, not a catalogue of every statistic, dialogue line or commercial transaction. It separates original design, later additions, current product descriptions, historical reception, player testimony and research interpretation. It does not claim a new playthrough, reproduced bug, watched video, measured audience response or access to private production accounts. The wider research library's unfinished subjects and separate audits retain their own status.

### How to use the evidence

1. **Understand the actual actions first.** Read the edition boundaries and mechanics inventory, then the worked situations. The SNES manual gives contemporary rules; later official product and update pages establish changes. A community walkthrough is useful for a specific condition or result, but does not prove developer intent.
2. **Read the story deliberately.** The narrative section contains major spoilers, including character identities, a protagonist's fate and late decisions. It distinguishes observed events, characters' beliefs, localization differences and later-series material.
3. **Compare the reviews rather than averaging their adjectives.** The five full DS reviews judge the inherited adventure and the new release differently. Steam testimony adds PC-specific failures, repairs and preference differences. Scores and selected helpful reviews are not completion or retention measurements.
4. **Investigate how the work was made and sold.** Original interviews, documented releases and dated commercial records support different claims. Present-day reverence does not reconstruct a marketing budget, actual royalties or net profit.
5. **Follow creation through to delivery.** The modding section distinguishes a tool's documented capabilities from a mod that actually shipped, and separates fan practice from the rightsholder's permission.
6. **Use the OpenLegend lessons as questions to test.** They link existing design owners and state prerequisites, tradeoffs and failure modes. Research does not itself accept a mechanic, create an implementation task or authorize copying protected content.

The annotated registers retain the original URL, source type and access boundary. Useful routes include the contemporary manual; the creator interviews; the five contrasting written reviews; the original soundtrack's official track list alongside independent criticism; and the named modding projects and tools. Linked media are discovery routes, not a claim that their footage or audio was reviewed in this pass.

### Preservation and scope

This is the first dedicated Chrono Trigger dossier in the inspected repository. It preserves links to the earlier player-music research and does not overwrite that study. Its roster key is **G187 / `chrono-trigger`**. Chrono Cross, Radical Dreamers, Sea of Stars and other influenced works remain separate research subjects. Their existence does not establish that their systems or later explanations were present in the original game.

Research accessed **November 6, 2026**. Dated claims retain the date and edition of their underlying evidence. Historical announcements are not silently relabeled as the current release; inaccessible sources are not represented as fully read. Source registers provide the evidence for detailed claims; the transfer section marks the researcher's deductions.

### Requirement-to-evidence map

| Requirement | Substantive coverage in this dossier |
| --- | --- |
| **R01 — Identity and promise** | [Player promise](#the-player-promise-and-the-shape-of-the-adventure); [edition boundaries](#editions-exploration-and-activities-beyond-combat) and [mechanics](#mechanics-editions-and-worked-situations); dated release/distribution boundaries. |
| **R02 — Actions and major mechanics** | [Systems inventory](#mechanics-editions-and-worked-situations): command timing, party composition, traversal, interactions, activities and meaningful absences. |
| **R03 — Items and composition** | [Systems inventory](#mechanics-editions-and-worked-situations): equipment, consumables, attributes, individual/cooperative techniques, acquisition and tradeoffs. |
| **R04 — Progression, economy and time** | [Systems inventory](#mechanics-editions-and-worked-situations): experience/tech progression, currency and exchange, saves/failure, optional resolution and New Game Plus; [return and abandonment](#reception-and-player-experience). |
| **R05 — Concrete situations** | [Combat/resource situations](#mechanics-editions-and-worked-situations) and [four exploration situations](#four-worked-exploration-situations), plus the [trial, restoration and character choices](#story-history-and-what-the-player-learns). Rules-based illustrations are distinguished from attributed personal accounts. |
| **R06 — People, AI and social systems** | [Party/NPC and edition boundaries](#editions-exploration-and-activities-beyond-combat) and [specific character arcs](#people-whose-histories-change-the-next-decision); authored NPCs, single-player campaign and the DS Arena's separate local-wireless boundary. |
| **R07 — Presentation and feel** | [Art and music](#art-music-and-the-production-of-feeling); edition-specific controls/interface/accessibility in [systems](#mechanics-editions-and-worked-situations) and [reviews](#reception-and-player-experience). |
| **R08 — Story and lore in play** | [Narrative](#story-history-and-what-the-player-learns): eras, Zeal, Lavos, uncertain cosmology, individual arcs, major loss, authored consequences and localization/sequel boundaries. |
| **R09 — Production and development** | [Production investigation](#production-distribution-economics-and-creation): creators, collaboration, constraints, iterations, ports and maintenance; composer evidence in [presentation](#art-music-and-the-production-of-feeling). |
| **R10 — Marketing and discovery** | [Distribution/promotion](#production-distribution-economics-and-creation), [specific advertising executions](#advertising-cases-what-the-promotion-chose-to-communicate), and review/community routes. |
| **R11 — Commercial context** | [Commercial evidence](#production-distribution-economics-and-creation): dated metrics, sales/revenue distinctions, estimation limits, business model and sustainability. |
| **R12 — Reception and engagement** | [Reception](#reception-and-player-experience): five full independent written reviews, helpful positive/negative Steam testimony, original-era evidence, later reassessment, enjoyment, repetition, return and stopping. |
| **R13 — Transfer and limitations** | [OpenLegend lessons](#what-openlegend-can-learn--hypotheses-tradeoffs-and-existing-owners), with observations separated from design hypotheses, alternatives and existing owners. |
| **R14 — Sources and preservation** | [Evidence boundaries and reading routes](#coverage-evidence-boundaries-and-reading-routes), annotated source registers, linked citations, prior music study, roster and scoped progress ledger. |
| **R15 — Conditional creator ecosystem** | [Creation investigation](#production-distribution-economics-and-creation): applicability decision, real tools/projects, workflow, delivery, compatibility, rights, incentives and maintenance limits. |

## Annotated source register

### Narrative and presentation

Accessed November 6, 2026. Community references distinguish documentation of play from official authorial statements. Repeated facts and interpretations are reconciled with the other sections before completion.

- **CTN02 — Chronicles, “Chrono Trigger Plot Summary,” 2015.** https://scalar.usc.edu/works/chronicles/chrono-trigger-plot-summary — A preservation project reproducing ZeaLitY's community synopsis; relevant body read. Used for bounded plot structure, not as an official statement that every ending is canon.
- **CTN03 — Chrono Wiki, “Antiquity.”** https://www.chronowiki.org/wiki/Antiquity — Community lore reference; relevant story and character sections read. Some explanatory claims are interpretive, so the dossier limits itself to supported setting and scene relationships.
- **CTN04 — Chrono Wiki, “Entity.”** https://www.chronowiki.org/wiki/Entity — Community page; overview and explicitly labeled speculation read. The distinction between party belief and certainty is retained.
- **CTN05 — Wikibooks, Chrono Trigger walkthrough, Chapter 25.** https://en.wikibooks.org/wiki/Chrono_Trigger/Walkthrough/Chapter_25 — Community walkthrough; sidequest passages read. Exact platform-specific input instructions are not generalized.
- **CTN06 — V-Jump Books conversation with Yuji Horii and Hironobu Sakaguchi, preserved by GlitterBerri, page dated January 12, 2009.** https://berriblue.blogspot.com/2009/01/chrono-trigger-v-jump-interview-v-jump.html — Japanese transcript passages read; the page links scans and describes an old interview. Its December 25, 2008 metadata does not establish the original interview date, which remains unverified. Summaries are paraphrased from the retrieved text; the original scans were not inspected.
- **CTN07 — Chronicles, “Anime Aesthetic,” 2015.** https://scalar.usc.edu/works/chronicles/anime-aesthetic-snes — Preservation/visual analysis; initial page text and indexed animation passage read. A later retrieval returned a server error. No independent sprite census or footage inspection claimed.
- **CTN08 — Yasunori Mitsuda, Nice Games interview (2000), translated at Shmuplations.** https://shmuplations.com/yasunorimitsuda2/ — Translated original interview; relevant composition and production passages read. Personal recollection, not audited labor or financial records.
- **CTN09 — RocketBaby interview with Yasunori Mitsuda, reprinted by Chrono Series Database.** https://csd.varlew.net/interviews/rocketbaby-mitsuda — Reprinted interview translated by Makoto Washimi; retrieved body read. No publication date established from this page.

- **CTN10 — Chrono Wiki, “Lavos.”** https://www.chronowiki.org/wiki/Lavos — Community lore and mechanics reference; introductory story and localization caveat read. Sequel claims kept separate; battle statistics not imported from this page.
- **CTN11 — Chrono Wiki, “Crono.”** https://www.chronowiki.org/wiki/Crono — Community character reference; sacrifice, rescue and later-release presentation passages read. Speculative fate after Chrono Trigger is not adopted.
- **CTN12 — Chrono Wiki, “Marle.”** https://www.chronowiki.org/wiki/Marle — Community reference; Rainbow Shell/father and party-dialogue passages read. No unsupported character-element defense rule imported.
- **CTN13 — Chrono Wiki, “Frog.”** https://www.chronowiki.org/wiki/Frog — Community reference; Cyrus, Masamune, North Cape and grave passages read. Optional original-game outcomes remain distinct from claims about later canonical continuity.
- **CTN14 — Chrono Wiki, “Lucca.”** https://www.chronowiki.org/wiki/Lucca — Community reference; inventor, Robo and Lara passages read. Radical Dreamers/Chrono Cross outcomes are outside this character-arc summary.
- **CTN15 — Chrono Wiki, “Robo.”** https://www.chronowiki.org/wiki/Robo — Community reference; factory, Mother Brain, restoration and farewell passages read. Its evaluative claim that Robo is the most versatile character is not treated as an objective ranking.
- **CTN16 — Chrono Wiki, “Ayla.”** https://www.chronowiki.org/wiki/Ayla — Community reference; Ioka, Kino, Reptite and ability-boundary passages read. Specific high-level weapon coefficients are handled only in verified mechanics evidence.
- **CTN17 — Chrono Wiki, “Magus.”** https://www.chronowiki.org/wiki/Magus — Community reference; identity, North Cape and changed confrontation passages read. Later-release and sequel explanations remain qualified.

- **CTN18 — Square Enix Music, Chrono Trigger Original Soundtrack Revival Disc.** https://www.jp.square-enix.com/music/sem/page/chrono/trigger_revival/index_en.html — Official 2019 tracklist and credits read. Used for titles and attribution, not a claim that linked videos or audio were played.
- **CTN19 — Square Enix Music Online, Dave, Chrono Trigger Original Sound Version review.** https://www.squareenixmusic.com/reviews/dave/chronotrigger.shtml — Independent music criticism, relevant body read; publication date not established. Praise and criticism retained as that reviewer's taste.
- **CTN20 — Eric Van Allen, Destructoid, “Chrono Trigger's trial is still absolutely brilliant,” September 5, 2023.** https://www.destructoid.com/chrono-triggers-trial-is-still-absolutely-brilliant/ — Original first-play account of the opening/trial; body read. A focused account, not a complete-game review or population survey.

- **CTN21 — Chrono Wiki, Guardia.** https://www.chronowiki.org/wiki/Kingdom_of_Guardia — Community reference; relevant story/institution sections read November 6, 2026. Speculative ancestry, political interpretation and Chrono Cross aftermath are not imported as established original-game facts.
- **CTN22 — Chrono Wiki, Guru.** https://www.chronowiki.org/wiki/Guru — Community reference; relevant character roles and story passages read November 6, 2026. Explicit speculation about motives and the Pendant is excluded; no independent NPC simulation inferred.
- **CTN23 — Chrono Wiki, Azala.** https://www.chronowiki.org/wiki/Azala — Community reference; original-game biography/final confrontation read November 6, 2026. Combat recommendations, speculative sequel outcomes and biological claims are not adopted.

### Mechanics and editions

All sources accessed **2026-11-06**. Manuals describe their own editions. Community references support detailed mechanics but are not official guarantees for every port. Database counts are not a claim that every individual entry was inspected. No linked trailer or gameplay video was watched for this section.

- **CTM01 — Original SNES manual, fan transcription.** https://www.world-of-nintendo.com/manuals/super_nes/chrono_trigger.shtml — Manual attributed to Square, 1995; hosted transcription credited to Mike Liu. Original controls, battle settings, saving, party management. Transcription, not newly authenticated scan.
- **CTM02 — Square Enix, Steam product page.** https://store.steampowered.com/app/613830/CHRONO_TRIGGER/ — PC release listed February 27, 2018; live store text. Official broad battle and platform description; marketing overview rather than detailed rules.
- **CTM03 — Steam community discussion, Wait mode.** https://steamcommunity.com/app/613830/discussions/0/3083256496968675873/ — May 29–30, 2021. Player explanation of submenu pauses and queued actions; anecdotal corroboration.
- **CTM04 — SuperCheats-hosted DS walkthrough.** https://www.supercheats.com/nintendods/walkthroughs/chronotrigger-walkthrough07.txt — Community guide; publication/version date not independently established. DS interface and battle-mode explanation.
- **CTM05 — Square Enix, PC launch announcement.** https://press.na.square-enix.com/CHRONO-TRIGGER-NOW-AVAILABLE-ON-PC — February 27, 2018. Official PC/mobile content description; edition supplement also uses this source.
- **CTM06 — Gamer Corner Guides, Systems.** https://guides.gamercorner.net/ct/systems/ — Undated community mechanics reference. Named stat boundaries, attribute behavior, and incapacitation/recovery. Not a platform-by-platform test report.
- **CTM07 — Caves of Narshe, New Game Plus, DS view.** https://mail.cavesofnarshe.com/ct/ngplus.php?ctmode=nds — Undated community reference. Carryover and exclusions; do not generalize its edition boundary to every release.
- **CTM08 — Final Fantasy Chronicles English manual, hosted PDF.** https://www.videogamemanual.com/ps1/Final%20Fantasy%20Chronicles%20%28USA%29.pdf — Square, 2001. Official PlayStation rules, accessed through a third-party manual archive.
- **CTM09 — Gamer Corner Guides, Techs.** https://guides.gamercorner.net/ct/techs/ — Undated community database. Technique learning, MP, and targeting patterns; not every paginated entry reviewed.
- **CTM10 — Gamer Corner Guides, Combo Techs.** https://guides.gamercorner.net/ct/combo-techs/ — Undated community database. Component techniques, combined effects, and requirements.
- **CTM11 — Gamer Corner Guides, Gates.** https://guides.gamercorner.net/ct/gates/ — Undated community location reference, examined during research; traversal detail belongs to the exploration supplement.
- **CTM12 — Gamer Corner Guides, Shops.** https://guides.gamercorner.net/ct/shops/ — Undated community database. Merchant stock, prices, and conditional availability.
- **CTM13 — Caves of Narshe, Hunting and Trading.** https://mail.cavesofnarshe.com/ct/hunting.php — Undated community guide. Prehistoric material exchanges and later stock.
- **CTM14 — Gamer Corner Guides, Elements.** https://guides.gamercorner.net/ct/elements/ — Undated community reference. Damage categories and elemental associations.
- **CTM15 — Gamer Corner Guides, Sealed Treasures.** https://guides.gamercorner.net/ct/sealed-treasures/ — Undated community database. Cross-era treasure upgrades; not a complete dialogue walkthrough.
- **CTM16 — Gamer Corner Guides, Items.** https://guides.gamercorner.net/ct/items/ — Undated community database. Restoration, status items, and permanent stat consumables.
- **CTM17 — Gamer Corner Guides, Accessories.** https://guides.gamercorner.net/ct/accessories/ — Undated community database. Equipment effects and special-tech access.
- **CTM18 — Gamer Corner Guides, Party Members.** https://guides.gamercorner.net/ct/party-members/ — Undated community reference. Character attributes, affinities, and equipment framework.
- **CTM19 — Gamer Corner Guides, Statuses.** https://guides.gamercorner.net/ct/statuses/ — Undated community reference. Action restrictions, timing, and defensive effects.
- **CTM20 — Gamer Corner Guides, Weapons.** https://guides.gamercorner.net/ct/weapons/ — Undated community database. Prices, eligibility, bonuses, and damage-related properties.
- **CTM21 — Gamer Corner Guides, Armors.** https://guides.gamercorner.net/ct/armors/ — Undated community database. Eligibility and elemental/status protection.
- **CTM22 — Gamer Corner Guides, Charm.** https://guides.gamercorner.net/ct/techs/charm — Undated community technique entry. Item theft, MP cost, and combination requirements.
- **CTM23 — Gamer Corner Guides, Magus.** https://guides.gamercorner.net/ct/party-members/magus — Undated community character reference. Spell elements and two accessory-enabled triple techniques; distinct from the narrative section's Chrono Wiki biography.

### Exploration and platform comparison

The original campaign examples use community guides, often with SNES-era English names; DS and later localization changes can rename the same item or place. Platform conclusions combine publisher notices and an independently written comparison. No video was watched, no minigame timing was measured, and no claim is made that these are all optional activities. All sources accessed November 6, 2026; each factual summary and its source description are kept within the returned per-source budget.

- **CTE01 — Chrono Wiki, “Chrono Trigger (DS).”** https://www.chronowiki.org/wiki/Chrono_Trigger_(DS) — Edition differences and mobile-update passages read; inconsistent mobile release-date metadata was not used.
- **CTE02 — Mikhail Madnani, RPG Site, August 13, 2025, platform comparison.** https://www.rpgsite.net/feature/18126-chrono-trigger-pc-vs-mobile-vs-ps1-vs-nintendo-ds-steam-features-visuals-content-compared — Full article read; includes attributed firsthand device comparisons, not our testing.
- **CTE03 — Square Enix, Steam announcement feed, March 2022/August 2023 entries.** https://store.steampowered.com/oldnews/?appgroupname=Chrono+Trigger&appids=613830&feed=steam_community_announcements&headlines=0 — Relevant official bodies read; direct individual announcement returned an image-only shell. Same underlying announcements as CTR15.
- **CTE04 — Chrono Wiki, “Epoch.”** https://www.chronowiki.org/wiki/Epoch — Original-game acquisition, destination and flight passages read; Chrono Cross material excluded.
- **CTE05 — Chrono Wiki, “End of Time.”** https://www.chronowiki.org/wiki/End_of_Time — Hub functions and era list read; speculative cosmological explanations excluded.
- **CTE06 — Thonky, “Break the Seal!”** https://www.thonky.com/chrono-trigger/break-the-seal — Dactyl, Johnny, Keeper's Dome and Epoch instructions read; chest rules remain in the mechanics section.
- **CTE07 — Thonky, “The Fated Hour,” updated March 16, 2025.** https://www.thonky.com/chrono-trigger/fated-hour — Complete relevant body read; source's preferred route is not a mandatory quest order.
- **CTE08 — Thonky, “The Rainbow Shell.”** https://www.thonky.com/chrono-trigger/rainbow-shell — Quest and Melchior outcome passages read; no equipment-stat claims imported.
- **CTE09 — Chrono Wiki, “Millennial Fair (Location),” displayed edit June 23, 2020.** https://www.chronowiki.org/wiki/Millennial_Fair_(Location) — Games, point exchanges and prize passages read.
- **CTE10 — Chrono Wiki, “Lost Sanctum.”** https://www.chronowiki.org/wiki/Lost_Sanctum — Unlock and cross-era village quests read; quest list is not a personal completion record.
- **CTE11 — Chrono Wiki, “Dimensional Vortex.”** https://www.chronowiki.org/wiki/Dimensional_Vortex — Post-completion structure read; page's obsolete DS-exclusivity claim explicitly qualified above.
- **CTE12 — Thonky, “The Millennial Fair.”** https://www.thonky.com/chrono-trigger/millennial-fair — Opening movement and conditional interaction instructions read.
- **CTE13 — Fallacia, “Arena of the Ages Guide,” version 2.00, September 20, 2017.** https://gamefaqs.gamespot.com/ds/950181-chrono-trigger/faqs/54975 — Substantial indexed guide sections read for acquisition, training, matches, prizes and limits; direct page retrieval blocked. Uncertain exact higher-tier unlock requirements omitted.
- **CTE14 — Chrono Wiki, “Apocalypse.”** https://www.chronowiki.org/wiki/1999_A.D. — Gameplay and inaccessible-map passages read; speculative city identifications and developer-intent claims excluded.

### Production, commercial evidence and creator ecosystem

All sources accessed **2026-11-06**. Raw URLs are retained for rechecking. Primary, translated, secondary, modeled and search-only evidence are distinguished. Individual source-derived summaries are deliberately compact; repeated references point back to their factual owners.

- **CTP01 — Square Enix Holdings, May 19, 2009 results briefing.** https://www.hd.square-enix.com/eng/ir/pdf/20090622_01en.pdf — Primary PDF, read; **PDF page 3 of 11 / slide 7**. Period unit chart, not title financial accounts.
- **CTP02 — Square Enix Japan anniversary announcement.** https://www.jp.square-enix.com/topics/detail/3459/ — Official body unavailable in the read interface; archive attempt also failed. Used only through CTP03's explicit relay.
- **CTP03 — Liam Doolan, Nintendo Life, March 23, 2025.** https://www.nintendolife.com/news/2025/03/chrono-triggers-lifetime-sales-have-now-surpassed-the-five-million-mark — Read; contemporary secondary reproduction of the publisher's shipment statement.
- **CTP05 — Jets of Time homepage.** https://ctjot.com/ — Direct maintainer documentation, read; scope and distribution paths.
- **CTP06 — Jets of Time, Getting Started.** https://www.wiki.ctjot.com/doku.php?id=get_the_game — Direct community documentation, read; setup and organized-play links. No audience census.
- **CTP07 — OnemusCT, Temporal Redux.** https://github.com/OnemusCT/temporal-redux — Maintainer README/source repository, read; incomplete editor, not original Square tooling.
- **CTP08 — GitExl, CTViewer.** https://github.com/GitExl/CTViewer — Maintainer README, read. Linked extractor: https://rivernyxx.com/downloads.html . No tools executed.
- **CTP09 — Pseudoarc, Jets of Time releases.** https://github.com/Pseudoarc/jetsoftime/releases — Direct version-specific notes, read; rendered release year unavailable.
- **CTP10 — JetsGuide.** https://guides.ctjot.com/JetsGuide/ — Direct historical guide, read; versioned documentation rather than current installation authority.
- **CTP11 — Shmuplations, 1994/95 developer interviews.** https://shmuplations.com/chronotrigger/ — Translation of period interviews; retrospective/pre-release claims require the distinctions above.
- **CTP12 — Shmuplations, 1995 interview collection.** https://shmuplations.com/chronotrigger2/ — Translated participant testimony; approximate staffing and timelines.
- **CTP13 — Square Enix, October 2, 2008 Japanese announcement.** https://www.jp.square-enix.com/company/ja/news/2008/download/20081002_146.pdf — Primary regional release and price statement, read.
- **CTP14 — Shared source alias only:** official Steam archive, owned by CTE03/CTR15; no separate factual summary. https://store.steampowered.com/oldnews/?appgroupname=Chrono+Trigger+Limited+Edition&appids=613830&feed=steam_community_announcements&headlines=0
- **CTP15 — SteamRev title model.** https://steamrev.com/games/chrono-trigger — Read and rejected as financial evidence: missing provenance, unverified assumptions and suspect metadata. Its reported arithmetic is preserved only in the rejection audit.
- **CTP16 — SteamDB title charts.** https://steamdb.info/app/613830/charts/ — Search-result figures only; provider estimates not reconciled or promoted to verified sales.
- **CTP17 — Gamalytic methodology.** https://gamalytic.com/about — Direct model documentation, read; provider explanations are not an independent accuracy audit.
- **CTP18 — Financial-search exclusions.** https://gameselo.com/game/613830/chrono-trigger failed to open; https://steam-revenue-calculator.com/app/613830/chrono-trigger%28r%29 surfaced a review-based estimate; https://bosnan.vercel.app/games/chrono-trigger surfaced an unattributed budget. These were excluded from factual financial conclusions.
- **CTP19 — Square Enix media-sharing guidelines.** https://www.square-enix-games.com/en_US/documents/chrono-trigger-guidelines-for-livestreaming-and-posting-videos-images — Publisher policy, read; scope is media sharing, not modification rights.

- **CTP20 — Square Enix, WE DISCUSS VANA'DIEL, Masato Kato Part 2, March 9, 2022.** https://we-are-vanadiel.finalfantasyxi.com/post/?id=306&lang=en — First-party conversation with Kato and Matsui; Chrono Trigger production passages read November 6, 2026. Retrospective testimony, not a measured cost study.
- **CTP21 — Chrono Series Database, Chrono Trigger credits.** https://csd.varlew.net/ct/ctcredits — Preserved credits read November 6, 2026; transcription rather than a newly inspected in-game credits sequence.

Cross-references **CTA01–CTA03**, **CTC01–CTC03**, **CTE03** and **CTR15** belong to the integrated dossier's advertisement, authored-mod, edition and reception source registers.

### Additional creator examples

- **CTC01 — Data Crystal, Chrono Trigger (SNES), utilities section.** https://datacrystal.tcrf.net/wiki/Chrono_Trigger_%28SNES%29 — Community reverse-engineering documentation; relevant indexed text read November 6, 2026. Identifies tools, not a measured popularity ranking or official Square tool release.
- **CTC02 — Data Crystal, Temporal Flux Event Tricks.** https://datacrystal.tcrf.net/wiki/Chrono_Trigger_%28SNES%29/Temporal_Flux_Event_Tricks — Original community authoring instructions; substantial relevant text retrieved through search on November 6, 2026 after direct open returned 403. Commands and caveats inspected; not executed. Linked maintainer site https://geigercount.net/crypt/ could not be retrieved.
- **CTC03 — TheGreatBDoyle, “Chrono Trigger Plus 3.0,” r/chronotrigger, with creator replies and player reports.** https://www.reddit.com/r/chronotrigger/comments/1bd29v4/chrono_trigger_plus_30/ — Original announcement and relevant support exchanges read November 6, 2026; publication appears in March 2024 search context, while individual replies use relative dates. Do not infer a single current build from the thread title. The linked Romhacking.net project page returned 403; no patch or game was downloaded.

### Advertisements

- **CTA01 — Alex Donaldson, RPG Site, “Square Targets Existing Fans with Chrono Trigger Adverts,” October 22, 2008.** https://www.rpgsite.net/news/291-square-targets-existing-fans-with-chrono-trigger-adverts — Contemporary written description and commentary; full short body read November 6, 2026. Ad execution and reporter interpretation are distinguished.
- **CTA02 — Siliconera Staff, “This Is The Right Way To Advertise Chrono Trigger For The DS,” November 12, 2008.** https://www.siliconera.com/now-this-is-the-right-way-to-advertise-chrono-trigger-for-the-ds/ — Contemporary written account read November 6, 2026; embedded commercial not watched in this pass.
- **CTA03 — MobyGames, Chrono Trigger promotional archive.** https://www.mobygames.com/game/4501/chrono-trigger/promo/ — Search-index metadata accessed November 6, 2026; individual EGM image page returned 403. Provides a route to preserved advertisements, not independent verification of their visual content.

### Reception

All sources accessed 2026-11-06. Dates below are publication dates or explicit displayed dates; omitted years remain omitted.

- **CTR01 — Nintendo Life, David Snoddy, “Chrono Trigger Review (Nintendo DS),” 2009-03-18.** https://www.nintendolife.com/reviews/2009/03/chrono_trigger_ds — Original independent review; complete review body read with web open.
- **CTR02 — RPGFan, John P. Hussey, “Chrono Trigger (2008),” 2009-01-05.** https://www.rpgfan.com/review/chrono-trigger-2008/ — Original independent review; complete review body read across two web-open windows.
- **CTR03 — RPGamer, 7thCircle, “Chrono Trigger DS Review,” 2008-11-11, displayed update 2021-06-18.** https://rpgamer.com/review/chrono-trigger-ds-review/ — Original independent review; complete review body read across two web-open windows.
- **CTR04 — Nintendo World Report, Jonathan Metts, “Chrono Trigger,” 2008-12-23.** https://nintendoworldreport.com/review/17445/chrono-trigger-nintendo-ds — Original independent review; complete body and category judgments read from indexed page text, with direct page corroboration.
- **CTR05 — GamesRadar, Henry Gilbert, “Chrono Trigger review,” 2008-11-24.** https://www.gamesradar.com/chrono-trigger-review/ — Original independent review; complete article read through indexed text and page-find output.
- **CTR06 — GameSpot, Lark Anderson, “Chrono Trigger Review,” 2008-11-21.** https://www.gamespot.com/reviews/chrono-trigger-review/1900-6201545/ — Original independent criticism, substantial indexed excerpts only; direct fetch returned restricted-URL failure. Not counted toward the five complete-review minimum.
- **CTR07 — Steam Community, CHRONO TRIGGER English Most Helpful (All Time) reviews.** https://steamcommunity.com/app/613830/reviews/?browsefilter=toprated&snr=1_5_reviews_ — Firsthand player reviews as presented by Steam; accessible mixed positive/negative surface read. The separate negative-only route failed. Dated individual accounts are qualitative and selected by helpfulness, not a prevalence survey.
- **CTR08 — Geeks Under Grace staff, “GUG Plays: Chrono Trigger,” 2019-09-20.** https://www.geeksundergrace.com/gaming/gug-plays-chrono-trigger/ and https://www.geeksundergrace.com/gaming/gug-plays-chrono-trigger/2/ — Two-page original staff roundtable, both bodies read. Personal accounts span abandonment, first completion, repeated endings and older memories; mostly PC revisits, with a specifically identified mobile comment. It is treated as one publication, not six independent sources.
- **CTR09 — Steam Community, “Should I buy this ?,” thread opened 2024-04-25, sampled replies through 2024-05-11.** https://steamcommunity.com/app/613830/discussions/0/4358997660739183237/ — Full nine-comment discussion read. Identified individual reactions; factual claims about cartridge capacity and ending counts were not adopted from commenters.
- **CTR10 — Reddit r/patientgamers, Alternative-Wash2019, “Chrono Trigger is my favorite JRPG of all time because it's short and I wish JRPGs were shorter,” approximately 2024.** https://www.reddit.com/r/patientgamers/comments/1dqo6y9/chrono_trigger_is_my_favorite_jrpg_of_all_time/ — Original post and relevant opening comment chains read; not the entire 2,178-line discussion. The page displayed “2y ago”; exact date not verified. Edition unspecified.
- **CTR11 — Steam Community, “How does this game hold up?,” opened 2022-12-23.** https://steamcommunity.com/app/613830/discussions/0/3731826842448467764/ — First page of comments read, including Mr Moopsy, 2022-12-24, and Incitatus, 2023-01-05. Not all twenty replies were inspected.
- **CTR12 — Steam Community, CHRONO TRIGGER English helpful-week snapshot.** https://steamcommunity.com/app/613830/reviews/?l=english — Accessible March-dated player accounts by rヨn and thatDubstepSound, with years omitted in the returned body. Search and open returned different cached snapshots; no claim of a stable latest-review sample. Individual permalinks were attempted but inaccessible.
- **CTR13 — Square Enix, “CHRONO TRIGGER – Patch #5 Update,” 2018-08-03.** https://steamcommunity.com/games/613830/announcements/detail/1696054587160367711 — Primary developer notes; full substantive text available through search-index extraction, while direct open exposed only an image.
- **CTR14 — PC Gamer, Samuel Horti, “Five months after its woeful PC port, Chrono Trigger receives its final patch,” 2018-08-04.** https://www.pcgamer.com/five-months-after-its-woeful-pc-release-chrono-trigger-receives-its-final-patch/ — Secondary contemporaneous reporting; complete short article read. Its Steam-sentiment observation belongs to August 2018.
- **CTR15 — Steam, Square Enix community-announcement index for app 613830.** https://store.steampowered.com/oldnews/?appgroupname=Chrono+Trigger&appids=613830&feed=steam_community_announcements&headlines=1 — Primary publication index read in search extraction; establishes dates/titles of later announcements, not their full contents.
- **CTR16 — Tanooki Site, “Classic Nintendo Power Reviews,” undated page reproducing Nintendo Power issue 75 (1995).** https://tanookisite.com/classic-nintendo-power-reviews/ — Relevant complete plus/minus transcription read. The site's author says it was transcribed from their magazine collection. Secondary preservation of a primary short review; the original issue was not directly inspected.
- **CTR17 — Defunct Games, “Electronic Gaming Monthly's Best Reviewed Games of 1995” (2018-era retrospective) and “Every Electronic Gaming Monthly Game of the Month in the 1990s” (2022-era index).** https://www.defunctgames.com/egm/13/electronic-gaming-monthlys-best-reviewed-games-of-1995 and https://www.defunctgames.com/egm/46/every-electronic-gaming-monthly-game-of-the-month-in-the-1990s — Substantive indexed excerpts read; direct pages failed with gateway/timeout errors. Secondary historical score/award records and reproduced critic comments. Exact retrospective publication days were not verified; the original EGM date reported is August 1995, issue 73.
- **CTR18 — Madeleine Philbrook, Chronicles preservation project, “Chrono Trigger SNES Box Front,” page timestamp 2015-07-23, related documentation updated 2015-09-07.** https://scalar.usc.edu/works/chronicles/media/chrono-trigger-snes-box-front — Documentation and archive links read. Both linked Nintendo Power PDFs returned 404: https://dtc-wsuv.org/mbrookman14/chronicles/Nintendo%20Power%20Volume%2073.pdf and https://dtc-wsuv.org/mbrookman14/chronicles/Nintendo%20Power%20Volume%2074.pdf . Unavailable scans are a retrieval limit, not counted as reviewed evidence.
- **CTR19 — GameSpot, Phil Hornshaw, “Chrono Trigger's Story Is Simpler Than You Remember, But That's What Makes It Great,” 2025-08-14.** https://www.gamespot.com/articles/chrono-trigger-story-is-simpler-than-you-remember-but-thats-what-makes-it-great/1100-6530092/ — Full substantive retrospective body read. Original criticism of the underlying adventure and personal reassessment, with major sidequest spoilers. Embedded videos not viewed.

[CTA01]: https://www.rpgsite.net/news/291-square-targets-existing-fans-with-chrono-trigger-adverts
[CTA02]: https://www.siliconera.com/now-this-is-the-right-way-to-advertise-chrono-trigger-for-the-ds/
[CTA03]: https://www.mobygames.com/game/4501/chrono-trigger/promo/
[CTC01]: https://datacrystal.tcrf.net/wiki/Chrono_Trigger_%28SNES%29
[CTC02]: https://datacrystal.tcrf.net/wiki/Chrono_Trigger_%28SNES%29/Temporal_Flux_Event_Tricks
[CTC03]: https://www.reddit.com/r/chronotrigger/comments/1bd29v4/chrono_trigger_plus_30/
[CTE01]: https://www.chronowiki.org/wiki/Chrono_Trigger_(DS)
[CTE02]: https://www.rpgsite.net/feature/18126-chrono-trigger-pc-vs-mobile-vs-ps1-vs-nintendo-ds-steam-features-visuals-content-compared
[CTE03]: https://store.steampowered.com/oldnews/?appgroupname=Chrono+Trigger&appids=613830&feed=steam_community_announcements&headlines=0
[CTE04]: https://www.chronowiki.org/wiki/Epoch
[CTE05]: https://www.chronowiki.org/wiki/End_of_Time
[CTE06]: https://www.thonky.com/chrono-trigger/break-the-seal
[CTE07]: https://www.thonky.com/chrono-trigger/fated-hour
[CTE08]: https://www.thonky.com/chrono-trigger/rainbow-shell
[CTE09]: https://www.chronowiki.org/wiki/Millennial_Fair_(Location)
[CTE10]: https://www.chronowiki.org/wiki/Lost_Sanctum
[CTE11]: https://www.chronowiki.org/wiki/Dimensional_Vortex
[CTE12]: https://www.thonky.com/chrono-trigger/millennial-fair
[CTE13]: https://gamefaqs.gamespot.com/ds/950181-chrono-trigger/faqs/54975
[CTE14]: https://www.chronowiki.org/wiki/1999_A.D
[CTM01]: https://www.world-of-nintendo.com/manuals/super_nes/chrono_trigger.shtml
[CTM02]: https://store.steampowered.com/app/613830/CHRONO_TRIGGER/
[CTM03]: https://steamcommunity.com/app/613830/discussions/0/3083256496968675873/
[CTM04]: https://www.supercheats.com/nintendods/walkthroughs/chronotrigger-walkthrough07.txt
[CTM05]: https://press.na.square-enix.com/CHRONO-TRIGGER-NOW-AVAILABLE-ON-PC
[CTM06]: https://guides.gamercorner.net/ct/systems/
[CTM07]: https://mail.cavesofnarshe.com/ct/ngplus.php?ctmode=nds
[CTM08]: https://www.videogamemanual.com/ps1/Final%20Fantasy%20Chronicles%20%28USA%29.pdf
[CTM09]: https://guides.gamercorner.net/ct/techs/
[CTM10]: https://guides.gamercorner.net/ct/combo-techs/
[CTM11]: https://guides.gamercorner.net/ct/gates/
[CTM12]: https://guides.gamercorner.net/ct/shops/
[CTM13]: https://mail.cavesofnarshe.com/ct/hunting.php
[CTM14]: https://guides.gamercorner.net/ct/elements/
[CTM15]: https://guides.gamercorner.net/ct/sealed-treasures/
[CTM16]: https://guides.gamercorner.net/ct/items/
[CTM17]: https://guides.gamercorner.net/ct/accessories/
[CTM18]: https://guides.gamercorner.net/ct/party-members/
[CTM19]: https://guides.gamercorner.net/ct/statuses/
[CTM20]: https://guides.gamercorner.net/ct/weapons/
[CTM21]: https://guides.gamercorner.net/ct/armors/
[CTM22]: https://guides.gamercorner.net/ct/techs/charm
[CTM23]: https://guides.gamercorner.net/ct/party-members/magus
[CTN02]: https://scalar.usc.edu/works/chronicles/chrono-trigger-plot-summary
[CTN03]: https://www.chronowiki.org/wiki/Antiquity
[CTN04]: https://www.chronowiki.org/wiki/Entity
[CTN05]: https://en.wikibooks.org/wiki/Chrono_Trigger/Walkthrough/Chapter_25
[CTN06]: https://berriblue.blogspot.com/2009/01/chrono-trigger-v-jump-interview-v-jump.html
[CTN07]: https://scalar.usc.edu/works/chronicles/anime-aesthetic-snes
[CTN08]: https://shmuplations.com/yasunorimitsuda2/
[CTN09]: https://csd.varlew.net/interviews/rocketbaby-mitsuda
[CTN10]: https://www.chronowiki.org/wiki/Lavos
[CTN11]: https://www.chronowiki.org/wiki/Crono
[CTN12]: https://www.chronowiki.org/wiki/Marle
[CTN13]: https://www.chronowiki.org/wiki/Frog
[CTN14]: https://www.chronowiki.org/wiki/Lucca
[CTN15]: https://www.chronowiki.org/wiki/Robo
[CTN16]: https://www.chronowiki.org/wiki/Ayla
[CTN17]: https://www.chronowiki.org/wiki/Magus
[CTN18]: https://www.jp.square-enix.com/music/sem/page/chrono/trigger_revival/index_en.html
[CTN19]: https://www.squareenixmusic.com/reviews/dave/chronotrigger.shtml
[CTN20]: https://www.destructoid.com/chrono-triggers-trial-is-still-absolutely-brilliant/
[CTN21]: https://www.chronowiki.org/wiki/Kingdom_of_Guardia
[CTN22]: https://www.chronowiki.org/wiki/Guru
[CTN23]: https://www.chronowiki.org/wiki/Azala
[CTP01]: https://www.hd.square-enix.com/eng/ir/pdf/20090622_01en.pdf
[CTP02]: https://www.jp.square-enix.com/topics/detail/3459/
[CTP03]: https://www.nintendolife.com/news/2025/03/chrono-triggers-lifetime-sales-have-now-surpassed-the-five-million-mark
[CTP05]: https://ctjot.com/
[CTP06]: https://www.wiki.ctjot.com/doku.php?id=get_the_game
[CTP07]: https://github.com/OnemusCT/temporal-redux
[CTP08]: https://github.com/GitExl/CTViewer
[CTP09]: https://github.com/Pseudoarc/jetsoftime/releases
[CTP10]: https://guides.ctjot.com/JetsGuide/
[CTP11]: https://shmuplations.com/chronotrigger/
[CTP12]: https://shmuplations.com/chronotrigger2/
[CTP13]: https://www.jp.square-enix.com/company/ja/news/2008/download/20081002_146.pdf
[CTP14]: https://store.steampowered.com/oldnews/?appgroupname=Chrono+Trigger+Limited+Edition&appids=613830&feed=steam_community_announcements&headlines=0
[CTP15]: https://steamrev.com/games/chrono-trigger
[CTP16]: https://steamdb.info/app/613830/charts/
[CTP17]: https://gamalytic.com/about
[CTP18]: https://gameselo.com/game/613830/chrono-trigger
[CTP19]: https://www.square-enix-games.com/en_US/documents/chrono-trigger-guidelines-for-livestreaming-and-posting-videos-images
[CTP20]: https://we-are-vanadiel.finalfantasyxi.com/post/?id=306&lang=en
[CTP21]: https://csd.varlew.net/ct/ctcredits
[CTR01]: https://www.nintendolife.com/reviews/2009/03/chrono_trigger_ds
[CTR02]: https://www.rpgfan.com/review/chrono-trigger-2008/
[CTR03]: https://rpgamer.com/review/chrono-trigger-ds-review/
[CTR04]: https://nintendoworldreport.com/review/17445/chrono-trigger-nintendo-ds
[CTR05]: https://www.gamesradar.com/chrono-trigger-review/
[CTR06]: https://www.gamespot.com/reviews/chrono-trigger-review/1900-6201545/
[CTR07]: https://steamcommunity.com/app/613830/reviews/?browsefilter=toprated&snr=1_5_reviews_
[CTR08]: https://www.geeksundergrace.com/gaming/gug-plays-chrono-trigger/
[CTR09]: https://steamcommunity.com/app/613830/discussions/0/4358997660739183237/
[CTR10]: https://www.reddit.com/r/patientgamers/comments/1dqo6y9/chrono_trigger_is_my_favorite_jrpg_of_all_time/
[CTR11]: https://steamcommunity.com/app/613830/discussions/0/3731826842448467764/
[CTR12]: https://steamcommunity.com/app/613830/reviews/?l=english
[CTR13]: https://steamcommunity.com/games/613830/announcements/detail/1696054587160367711
[CTR14]: https://www.pcgamer.com/five-months-after-its-woeful-pc-release-chrono-trigger-receives-its-final-patch/
[CTR15]: https://store.steampowered.com/oldnews/?appgroupname=Chrono+Trigger&appids=613830&feed=steam_community_announcements&headlines=1
[CTR16]: https://tanookisite.com/classic-nintendo-power-reviews/
[CTR17]: https://www.defunctgames.com/egm/13/electronic-gaming-monthlys-best-reviewed-games-of-1995
[CTR18]: https://scalar.usc.edu/works/chronicles/media/chrono-trigger-snes-box-front
[CTR19]: https://www.gamespot.com/articles/chrono-trigger-story-is-simpler-than-you-remember-but-thats-what-makes-it-great/1100-6530092/

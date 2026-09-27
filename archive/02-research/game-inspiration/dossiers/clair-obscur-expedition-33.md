# G77 — Clair Obscur: Expedition 33

[Library](../README.md) · [Roster](../research-roster.md) · [Progress](../research-progress.md) · [Requirements](../research-requirements.md)

**Full-category research pass: September 26, 2026; follow-up audit September 27, 2026.** This dossier completes the earlier G77 checkpoint; it preserves its review disagreements, production evidence and source-access limits. Research and transferable hypotheses are not accepted OpenLegend designs. Story and late-party spoilers are flagged below. No hands-on play, source-code inspection or full-video viewing is claimed.

## 1. Identity, scope and the playable promise — R01

Sandfall Interactive's debut, published by Kepler Interactive, launched on April 24, 2025 for Windows PC, PlayStation 5 and Xbox Series X|S. The official launch page links Steam and Epic alongside the console stores. It is an authored, single-player party RPG, not an open-world survival simulation or multiplayer service. Its distinctive promise is to make a carefully chosen turn feel physically performed: you select the skill, but timing, targeting and defense help determine what that choice achieves. [C10][C13]

The baseline here is the released campaign, with the December 12, 2025 free Thank You update and the April 24, 2026 anniversary update identified separately. A launch review is evidence about the launch experience, not automatic proof of the current state. The official news index was re-checked on **September 27, 2026**; its newest game-news entry remained the April 24 anniversary post (updated April 26), so this dossier does not invent a later summer/fall content patch. This is still not an exhaustive per-platform patch audit. Do not infer that a reported launch bug remains unfixed, or that a reviewer predicting a fix establishes its delivery. [C6][C7][C30]

The repeatable loop is: explore a deliberately staged area; notice a fight, side route or character; choose a party and loadout; alternate resource decisions with enemy-pattern execution; receive growth and equipment; then reconsider the next route or build. An overworld connects authored regions and optional challenges. A camp concentrates equipment services and character scenes rather than a construction or settlement-management layer. [C10][C11]

**Interpretation:** the game offers two kinds of mastery at once. A player learns what the party can do, and learns when an opponent actually hits. These can reinforce each other, but they are not interchangeable. A player attracted by one may dislike the other; the reception section preserves that division.

## 2. Combat actions and information — R02

### Actions, resources and the enemy turn

Basic attacks supply AP; skills spend it; free aim lets the player spend AP on targeted shots rather than treating every ranged attack as an abstract menu selection. Offensive timing prompts improve selected attacks. Defense requires choosing and timing dodges, parries, jumps or the relevant special counter against an enemy's attack sequence. The opening-act preview describes learning these actions alongside the early party, but its claim that basic attacks and parries are the only AP sources is not a complete endgame rule: equipment and skills add other sources. [C10][C18]

Parrying is a higher-execution commitment than simply selecting a defensive command. Completing the required parry sequence can produce a counterattack; failing a late hit changes the result even when earlier hits were handled correctly. Skills, AP availability, break opportunities and enemy-specific behaviors therefore remain important on both sides of the turn boundary. This is not real-time free movement around the combat arena. [C1][C12]

Three characters form the active battle party. Later reserves provide a second opportunity after that group falls, but this is not unrestricted mid-turn party swapping. Building only the starting trio can therefore leave the fallback much weaker than the interface's existence suggests. [C2]

Enemy design sometimes supplies more than a timing test. GameSpot describes a flower-generating boss whose plants can be shot before becoming shields, and a Bourgeon that swallows companions, reducing available actors. In each case the player must read a changed tactical state, not merely execute the same damage rotation more accurately. [C12]

### Six identities, not six interchangeable job slots

The following are shipped-system descriptions from character guides, not a claim that the researcher executed these builds. The party-availability information itself contains spoilers.

| Character | Rule that changes decisions | Constraints and useful distinctions |
| --- | --- | --- |
| **Gustave** | Overcharge stores up to ten charges. Multi-hit actions such as Lumière Assault can accelerate charging through critical hits; the charged release provides a strong damage/break opportunity. | AP and charge are separate resources. A partly charged release is possible; waiting for maximum power is a decision, not an unconditional legal requirement. His support options prevent the charge gauge from being his only contribution. [C19] |
| **Lune** | Spells leave elemental Stains; subsequent spells consume specified Stains for enhanced effects. Fire, Ice, Lightning, Earth and Light operate within a four-slot gauge. | Damage type, generated Stains and consumed Stains must be read separately. Immolation generates Fire; Earth Rising generates Earth. Elemental Genesis asks for a diverse prepared set, so repeatedly casting the current best-looking attack can obstruct a later action. [C20] |
| **Maelle** | Skills move her among offensive, defensive and Virtuose stances, with a neutral state between relevant transitions. Offensive trades greater damage dealt for greater damage received; defensive reduces incoming damage and rewards successful defense with AP; Virtuose provides a major damage bonus. | Stance entry and stance use are different steps. Swift Stride against a burning target is one route into Virtuose. Weapon passives can alter starting conditions, so the early rotation is not the universal late-game rotation. [C21] |
| **Sciel** | She applies Foretell to enemies, then consumes it for amplified effects. Applying it generates **Sun** charges; consuming it generates **Moon** charges. Having both enables the temporary Twilight state and stronger Foretell interactions. | Foretell belongs to a target, while Sun/Moon and Twilight describe Sciel's state. Moving to another target can therefore discard the value of preparation. The pre-release Xbox transcript reverses the charge labels relative to the shipped-game guide; this dossier follows the latter rather than silently reconciling contradictory wording. [C22][C9] |
| **Verso** | Successful actions build Perfection ranks from D toward S; ranks increase damage and interact with individual skills. Taking damage can lower the rank. | Offensive output depends partly on maintaining defensive execution, not only attributes. Higher ranks are not a substitute for checking a skill's particular rank interaction. The guide notes that a single enemy turn cannot remove more than one rank, an important distinction from losing a rank on every hit. [C23] |
| **Monoco** | Defeated Nevrons supply learnable attacks through their feet; selected skills interact with the Bestial Wheel. Matching a skill's mask enhances it; Almighty enhances all masks. Skills rotate the wheel by indicated amounts. | The wheel is an ordered state system, not a random slot machine. Six equipped skills cannot provide every possible answer. A mismatched skill remains usable, which matters when survival is more valuable than maximizing a mask bonus. Weapons can change wheel behavior. [C24] |

**Interpretation:** the party asks the player to manage six different kinds of memory: a charge accumulator, a short ingredient buffer, a stance, target-specific stacks plus a cycle, a performance grade and an ordered wheel. Shared AP and a shared combat interface hold these differences together. Character identity can emerge from these constraints without making every character obey identical internal resource rules.

## 3. Equipment, resources and build composition — R03

### Attributes are not synonymous with weapon damage

Level-ups award three points among Vitality, Might, Agility, Defense and Luck. These feed derived properties such as health, attack power, speed, protection and critical chance. Weapon scaling can make an apparently defensive investment contribute to offense. A Recoat refunds an attribute allocation; the same item family also supports skill-point reallocation. It is a consumed respec resource, not an unlimited free undo button. [C15][C31]

The practical reading order is: what outcome is failing; which derived statistic would address it; which attribute or equipment actually changes that statistic; and whether the expected gain is worth giving up another allocation. A blanket instruction to maximize Might ignores both weapon affinity and the player's ability to survive long enough to act. This is analysis of the linked rules, not a tested optimal build.

### Weapons: power, element, scaling and attached rules

A weapon has power, an element, attribute affinities and attached passives. Its basic-attack element should not be assumed to overwrite every skill's listed element. Most weapons unlock passives at levels 4, 10 and 20. These remain attached to the weapon; they are not learned as universally transferable Lumina. Upgrade materials progress from Chroma Catalyst through Polished, Resplendent, Grandiose and Perfect, reaching level caps 3, 9, 19, 32 and 33 respectively. The Curator becomes an upgrade service after Flying Waters. [C16]

Weapons and materials come from exploration, enemies, bosses and merchants. Higher-level duplicate weapon acquisition can improve the owned weapon rather than create a second identical inventory copy. A build should account for that possibility before treating every future upgrade as a mandatory catalyst expense. [C32]

**Named interaction:** Nusaro modifies Monoco's wheel. Its level-4 passive advances the wheel when parrying and resets it when taking damage; the level-10 effect rewards enhanced skills; the level-20 effect supplies AP when the mask changes. That creates a defense-to-resource connection, but also makes the planned next mask conditional on what happened during the enemy turn. [C25]

### Pictos and Lumina: learning versus equipping

Each character equips up to three Pictos. The equipped object supplies its statistical contribution and passive effect. After four battles using a Picto, its passive becomes learned as Lumina; that learning does not transfer the Picto's entire statistical package. Learned passives can then be selected within a character's Lumina-point capacity. Colour of Lumina expands capacity. A Picto slot and a Lumina point are therefore different scarce resources. [C9][C18]

Named examples make the distinctions concrete: **Immaculate** rewards remaining unhit; **Healing Counter** restores health after a counterattack; **Energising Break** supplies AP when breaking a target; **Augmented Attack** improves basic attacks. The first favors maintaining a condition, the second converts a defensive success into recovery, the third connects control to resource flow, and the fourth improves a normally modest resource-building action. [C18]

**Interpretation:** the learning system creates a reason to use newly found equipment even when it is not the final desired loadout. However, the player must be able to distinguish the temporary learning setup, the currently equipped statistical item and the eventual passive portfolio. Confusing those three makes experimentation look more arbitrary than it is.

### Recovery, permanent improvements and consumable charges

Healing, Energy and Revive Tints respectively address health, AP and fallen allies. Their uses are limited between rests at expedition flags. Chroma Elixirs restore the party outside battle. **Tint Shards increase carrying capacity; Shapes improve potency.** Neither is the same thing as buying a one-use replacement potion. The distinction matters because an optional exploration reward can improve every later expedition segment rather than only the next fight. [C17]

A **Shape of Health** follows Goblu; a Manor route in Gestral Village supplies a **Shape of Energy**. Records, outfits, journals and key items occupy other reward roles: presentation, memory and quest access should not all be described as statistical upgrades. The wardrobe is not a many-slot armor-crafting system. [C17][C3][C4]

## 4. Exploration, NPCs, relationships and narrative — R02, R06, R08

### World movement and optional tasks

Exploration alternates the small-scale overworld with closer third-person routes, platforming, climbing and marked traversal opportunities. The early zones largely lead forward while hiding optional branches. Expedition flags allow recovery and preparation; resting also repopulates ordinary encounters. They turn route length into a resource question, even without a hunger meter or physical campsite construction. [C10][C11]

Esquie changes access to the overworld over the campaign; his role is transportation and companionship, not an additional selectable combat slot. Later relationship progression can unlock underwater collection. The result is revisitation with a newly useful ability rather than a new map for every upgrade. [C9][C26]

Gestral merchants are more than stationary price lists: duels can gate additional stock. Friendly Nevrons interrupt the assumption that every creature model denotes an immediate fight. Jar asks for Resin and a lit torch; Démineur needs an Intact Mine reached by a nearby platforming detour; Hexga asks for rocks; a Troubador uses performance trials. These are authored condition checks and rewards, not evidence of general-purpose dialogue generation or a simulated diplomatic faction economy. [C10][C27]

**Gestral Beaches explicitly supply a bounded minigame layer rather than only combat and traversal detours.** The documented beach activities include platforming and timed movement courses, a question-and-answer challenge, an attack-volleyball activity, a deliberately awkward climbing/platforming challenge and a rock-climbing course. Their rewards include cosmetic swimsuits and materials. These are authored side games with local rules; they do not imply that ordinary overworld interactions use the same scoring or failure model. [C33]

The preserved object lesson is specificity. Démineur's request connects a visible missing component, a reachable place and a concrete reward, rather than offering an interchangeable token collection quest. Jar also asks the player to use an existing shooting verb for assistance instead of damage. [C27]

### Camp bonds and bounded romance

Verso-centered relationship conversations become available through campaign progress and camp visits. Esquie, Lune, Maelle, Monoco and Sciel have ranks extending to seven; some advances require a duel or companion quest rather than another conversation. Rewards include Gradient attacks, outfits and access to additional activities. This is a authored relationship ladder, not a continuously simulated affection network between every pair of NPCs. [C26]

Optional romance concerns Verso with Sciel or Lune. It is separate from simply maximizing their relationship rank. Starting Sciel's earlier romance can exclude Lune's later route; rejecting romance does not prevent ordinary relationship advancement. The existence of those two routes should not be broadened into universal romance, arbitrary partner choice, marriage or a family simulation. [C28]

### Story structure and character attachment

**Premise spoilers:** Lumière lives under the Gommage, a recurring erasure tied to the Paintress's descending number. Gustave, Maelle and their companions depart to end that cycle. The official introduction foregrounds a small cast and a specific shared mission, with Renoir and the enigmatic Verso among the figures complicating it. The hook is comprehensible before the player understands the world's deeper explanation. [C13]

The game uses failed expeditions, journals and remnants to make predecessors present in the landscape. Those traces connect the party's current attempt to repeated loss rather than presenting a world created only for today's protagonists. RPGFan emphasizes the fit between that setting, the characters and a relatively concentrated central campaign. [C3]

**Structural spoilers, without an ending walkthrough:** party availability and viewpoint change across acts. A player therefore experiences changing mechanical responsibility alongside changing narrative attachment. The later camp system is specifically contextualized through Verso, not retroactively available to the entire opening cast. Optional conversations can deepen a relationship, but the main dramatic scenes remain authored rather than the output of freely recombining social variables. [C23][C26]

**Interpretation:** mortality is not just a lore fact. It supplies a reason for departure, makes recovered records meaningful and gives apparently ordinary leisure emotional weight. Yet a narrative about limited time does not establish a real-time campaign deadline. Treating story urgency and simulation clocks as separate design decisions avoids inventing a mechanic the premise does not demonstrate.

## 5. Progression, economy, failure and return play — R04

There are several advancement channels rather than a single level ladder: attribute allocation, character skills, weapon improvements, learned Lumina, consumable capacity, companion bonds, traversal access and the player's knowledge of attack timings. These channels have different reset and expenditure rules. The practical purpose of a camp visit is to reconcile them before spending another attempt on an enemy. [C15–C18][C26]

Chroma, upgrade materials and Recoats create local spending decisions. The strongest question is not merely which number can be increased, but whether to deepen a current setup or open a different one. A new passive can change the value of basic attacks; a weapon can change the value of a stat; a capacity upgrade can make an old passive combination feasible. This is interpretation of the equipment rules, not a claim about an exhaustively solved metagame. [C16][C18][C31]

Failure also has multiple meanings. A lost fight can mean insufficient durability, an AP-starved rotation, misunderstood enemy behavior or an execution error. Reserve-party recovery and difficulty selection can soften different parts of that problem, but neither makes every encounter equivalent. Launch accessibility reporting identifies offensive automatic QTE support while noting that it did not automate defense. Present that as a dated feature boundary, not a verification of every later accessibility patch. [C2][C11]

Late optional bosses and the Endless Tower serve players seeking further challenge. New Game Plus preserves substantial build investment, including weapons, levels and Pictos, while providing a harder repeat journey; it does not turn the authored campaign into an endlessly simulated world. The December update adds content and late-game fights beyond the launch corpus. [C3][C6]

Commercially this is a premium game with subscription distribution and free post-release additions, not a documented stamina-gated or gacha progression economy. Do not confuse players choosing to replay, collectors seeking cosmetics or fans sharing screenshots with evidence of a compulsory daily-retention design. [C6][C14]

## 6. Worked interactions — R05

These are **constructed illustrations of documented rules**, not claimed playtest results or attributed player incidents. Exact damage totals, ideal builds and guaranteed victories are deliberately not invented.

### A. Turn a preparatory elemental hit into a stance opportunity

**Intention:** prepare Maelle for a stronger later action. **Conditions:** Lune can apply Burn, Maelle has Swift Stride and the party can afford the actions. **Sequence:** apply the burning condition; have Maelle use the conditional stance-entry attack; then choose how to use the resulting damage opportunity. **Interaction:** an enemy status created by one character changes another character's legal payoff. **Result:** the preparation has value beyond its own damage. **Next decision:** spend immediately or preserve resources for a more important target. **Limit:** a dead target, an unavailable condition or insufficient AP can invalidate the planned chain; it is not simply a universal opening macro. GameSpot describes this family of cross-character synergy. [C12][C21]

### B. Learn a passive without mistaking learning for a permanent item slot

**Intention:** add a passive to the party's future options. **Conditions:** own the relevant Picto and have battles in which its temporary equipment tradeoff is acceptable. **Sequence:** equip it, complete the learning requirement, then inspect the learned Lumina and its capacity cost. **Interaction:** use teaches an effect; capacity still governs activation. **Result:** the player can change the equipped Picto without treating its statistical bonuses as permanently acquired. **Next decision:** choose between the new passive and other uses of the same Lumina budget. **Limit:** possession, learning and activation are three different states; learning alone does not make the effect free. [C9][C18]

### C. A defensive success changes Monoco's next offensive state

**Intention:** reach a favorable mask without wasting a turn. **Conditions:** Nusaro's appropriate passive is unlocked and the player knows its wheel interaction. **Sequence:** inspect the current mask; defend against the enemy; then inspect the wheel again before choosing the next skill. **Interaction:** a parry advances the wheel, while taking damage can reset it. **Result:** a successful defense changes more than HP or a counterattack; it changes the next menu decision. **Next decision:** use the newly enhanced skill or take an unmatched but necessary recovery action. **Limit:** blindly following a precomputed rotation ignores the enemy-turn transition. At the later weapon threshold, mask changes also interact with AP, further coupling the systems. [C24][C25]

### D. Improve endurance by helping rather than defeating

**Intention:** gain a lasting recovery improvement. **Conditions:** encounter Jar, keep it available for its request and locate Resin. **Sequence:** retrieve the requested object, return it and shoot the torch. **Interaction:** a normally aggressive verb satisfies a noncombat task. **Result:** the associated Healing Tint improvement benefits later travel segments. **Next decision:** continue exploring with the improved allowance or return to safety. **Limit:** this is a specific authored interaction; arbitrary fire spells or conversational promises are not documented substitutes. [C17][C27]

### E. Invest in a bond to reopen the world map

**Intention:** collect rewards at previously inaccessible underwater locations. **Conditions:** the campaign and Esquie's relationship have advanced far enough; Verso is prepared for the associated solo fight. **Sequence:** pursue the camp relationship event, defeat Francois, obtain Urrie and revisit dive spots. **Interaction:** a social progression track unlocks a movement capability. **Result:** old geography becomes newly useful. **Next decision:** which previously noticed location merits the detour. **Limit:** neglecting Verso's individual setup can matter even if the normal three-person party is strong. [C26]

### F. Diagnose an attempt before paying for a respec

**Intention:** stop repeatedly failing an encounter. **Conditions:** a Recoat is available, but its use competes with keeping it for another character or build. **Sequence:** distinguish lack of health from an AP problem or misread timing; inspect derived statistics and weapon scaling; change equipment first where appropriate; spend the Recoat only when reallocating addresses the identified problem. **Interaction:** consumable reallocation joins weapon affinity and player knowledge. **Result:** a deliberate experiment rather than random redistribution. **Next decision:** test one changed assumption. **Limit:** an attribute change cannot guarantee that an unfamiliar attack becomes readable. The sequence is a proposed diagnostic method, not an in-game tutorial or measured best practice. [C15][C31]

## 7. Presentation, control and production of feel — R07

Belle Époque references, painterly materials and deliberately distinct environments produce a recognizable identity without requiring the player to read an encyclopedia first. The art-director interview describes ceramic textures, unusual silhouettes and area palettes. This is a concrete production intention; it is not proof that every player interprets those forms identically. [C9]

The presentation alternates extravagant combat framing with a miniature-like overworld. TechRadar finds that environmental variety and character movement pleasurable, but also records missing quest tracking and awkward comparison tools. The relevant tension is between inhabiting a beautiful place and remembering the actionable information needed to navigate it. [C11]

Music and performance connect solemnity to the party's more absurd encounters. GamesRadar praises the emotional range and the soundtrack's contribution while finding some camp relationship scenes more mechanical than the central dramatic material. Push Square similarly notes how the tone and presentation carry the experience even when the initial terminology is demanding. [C2][C4]

**Control implication:** a timing game needs legible information, not merely attractive animation. The readable player accounts below distinguish enjoying parrying from trusting the cues for a particular delayed attack. A system can be satisfying in principle and inconsistent in a player's experience of individual enemies. That is a more useful finding than choosing between universal praise and universal dismissal.

Photo Mode supplies a separate, concrete production lesson. The February 2026 developer account explains bringing in an experienced specialist because the developers were not regular photo-mode users themselves. A freer camera then exposed character-presentation defects during QA. Features that widen inspection can reveal assumptions hidden by cinematic framing. Camera freedom does not establish that every visible surface was designed as traversable terrain. [C8]

## 8. Development, discovery and commercial boundaries — R09–R11

### Origins and production

In the official Xbox podcast transcript, Guillaume Broche describes a personal prototype growing through collaborators into Sandfall in 2020. At interview time he describes roughly thirty core staff plus a Paris cinematics group: **not everyone credited, and not a verified total production workforce**. Nicholas Maxson-Francombe discusses art direction; the casting account distinguishes Kepler's outreach to prominent screen actors from blind auditions through which Ben Starr and Jennifer English were selected. [C9]

The useful production pattern is bounded ambition: invest heavily in a distinctive party, combat presentation and authored areas rather than equating visual ambition with an obligation to simulate an entire city. That is this dossier's interpretation, not an assertion of the studio's undisclosed budget, staffing efficiency or profit margin.

### Discovery and the reasons people can share it

Xbox's December 2025 account identifies the summer-2024 announcement and January Developer_Direct as major exposure points. Broche credits that support and says Game Pass let hesitant players try the turn-based/action mixture. This is attributed developer testimony about discovery, not a controlled estimate of how many purchases any placement caused. [C14]

The official launch page supplies a trailer and named character/voice-cast hook. Later Photo Mode, music releases and commissioned community emotes supply different kinds of participatory material. These support plausible sharing loops: an impressive defensive sequence, a striking screenshot, a favorite performance or a recognizable costume can circulate without reproducing a full walkthrough. The loop is an analytical hypothesis; no creator-conversion or virality coefficient is claimed. [C13][C6–C8]

### Dated milestones, not a manufactured business model

| Date / evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| April 24, 2025 official launch | Released product and advertised platforms. [C13] | Later port parity, total players or cost recovery. |
| December 3, 2025 Xbox report | Biggest **new third-party Game Pass launch of 2025**, measured by unique users in the first thirty days of availability. [C14] | A disclosed user count, sales count, subscription revenue or comparison against every first-party launch. |
| December 12, 2025 official update | Free additional environment, music, late-game Tower battles, Photo Mode, more text/UI languages and technical improvements. [C6] | That launch reviewers assessed those additions; a guarantee that every reported bug was fixed. |
| April 24, 2026 anniversary | **Eight million copies sold**, plus an anniversary update adding haircuts. [C7] | Eight million additional Game Pass users, eight million concurrent players, gross receipts or net profit. |

No audited title-level profit, complete budget or reliable split by storefront was established in this pass. Multiplying units by one advertised retail price would ignore regional pricing, discounts, refunds, fees and subscription arrangements. A commercial explanation should stop at the available evidence rather than fill those gaps with confident arithmetic.

## 9. Reviews and direct player evidence — R12

### Original written criticism

The five-source minimum is satisfied by the complete written bodies of **PC Gamer, GamesRadar, RPGFan, Push Square and TechRadar**. GameSpot supplies additional original criticism and specific examples. Washington Post remains preserved from the earlier checkpoint, but its body did not re-render in this continuation and is not needed to reach five. Scores are omitted because the disagreements are more informative than a synthetic average.

| Original review | What the critic values | Friction, disagreement and limits |
| --- | --- | --- |
| **Justin Wagner, PC Gamer, April 23, 2025** | Build strategy and distinctive character play. | Extended enemy sequences, delayed tells and learning attacks late in long fights can subordinate tactical choice to repeated execution. His experience does not prove every difficulty or player has the same problem. The page's erroneous release-year field is not adopted. [C1] |
| **Alan Wen, GamesRadar, launch review** | Timing can feel rewarding; the dodge window is relatively approachable; strong performances, score and emotional range. | Camp relationship levels can feel less organic than authored scenes. Missing local orientation aids cause confusion on revisits. PS5 Pro review with additional PC testing; not a post-update reassessment. [C2] |
| **Zek Lu, RPGFan, April 23, 2025** | Cast, setting and flexible development; substantial optional challenge without requiring a bloated central campaign. | Reports audiovisual defects and a quest problem involving defeating a nonrespawning target before its quest was active. A hoped-for day-one fix is not verified delivery. PS5/PS5 Pro experience, including repeat play. [C3] |
| **Liam Croft, Push Square, April 23, 2025** | Dramatic confidence and combat that makes an enemy turn participatory. | Initially confusing Pictos/Lumina presentation; smaller presentation defects. A short second staff impression on the same page is not counted as an additional independent review. [C4] |
| **Rob Dwiar, TechRadar, April 28, 2025** | A former turn-based skeptic responds strongly to active combat, visual variety and performances. | Some prolonged cinematic sections, disjointed dialogue, absent quest/minimap support and poor immediate weapon comparison. More than forty hours on PS5/PS5 Pro; its release-date field is not preferred over the official launch record. [C11] |
| **Richard Wakeling, GameSpot, April 22, 2025 page date** | Character synergies, boss-specific tactical problems and emotional resonance. | Attractive environments are less interesting to navigate mechanically; side-objective tracking and shop comparisons need work. His disclosed twenty-nine-hour completion is one critic's route, not a universal duration. [C12] |

**Preserved additional review:** Gene Park appreciated tactile combat and flexible builds but disliked presentation and platforming. [C5]

The consequential disagreement is not simply whether the game is good. It is whether real-time defense continually enriches turn-based planning or eventually becomes the dominant test. The shared praise for presentation does not settle that question. Nor does a player who clears a boss quickly disprove another player's accessibility or cue-reading problem.

### Steam sampling: September 26 block preserved; September 27 store surface now readable

The original September 26 pass genuinely could not complete the Steam requirement: the Community route, app-review endpoint and direct discussion paths returned age/content gates or failed. That access history remains preserved in C29 because it explains why the prior dossier did not fabricate a helpful-review sample.

On the **September 27 audit**, a public Steam **store review surface** for app 1903340 became readable through the web index. The dated snapshot exposed roughly **102.9k English reviews at 96% positive (“Overwhelmingly Positive”)** and about **1.8k recent reviews (“Very Positive”)**. Those counts change continuously and are not sales/ownership totals. [C34]

The current **Most Helpful** surface supplies direct positive bodies rather than snippets alone. For example, Akinori (68 hours displayed) emphasizes turn-based combat that became more engaging than expected, fight-specific builds, story and soundtrack; Saya (91 hours displayed) similarly highlights parrying, story, art direction and music. Current negative/recent bodies preserve the counterpoint rather than disappearing inside the aggregate: seskapill (17.7 hours) explicitly argues that maze-like levels without maps and timing-heavy defense overwhelm the strategic side; a same-day negative from shawntastic likewise describes the real-time/parry layer as a slog despite praising music/art/story. [C34]

The displayed hours are profile/store metadata and are not treated as hours-at-review unless Steam explicitly supplies that field. The sample is self-selected and the retrieval route exposed a mixture of “Most Helpful” and recent reviews, not a controlled survey or a separately filtered all-time-negative leaderboard.

A directly readable non-Steam alternative remains **BMO's Grouvee post**, with a reply by **shinespark**. Both enjoy the combat while criticizing some delayed attacks: BMO describes learning a swish cue that then seems not to match an elemental hit; the reply prefers animation cues whose trickery feels more intelligible. These are two self-selected accounts on one discussion, not two independent representative surveys. The page title/index refers to May 4, 2025 while the rendered update stamp says June 18; that discrepancy is retained rather than silently choosing one date. [C29]

The important correction is procedural: **Steam is no longer an unresolved source-access gap for this dossier as of September 27**, but the earlier failed route remains part of the provenance record.

## 10. Transferable patterns and failure modes — R13

These are research hypotheses, not requested runtime implementation.

**A common interface can support different internal resource models.** Gustave, Lune, Sciel and Monoco do not need the same kind of accumulator to cooperate through the same turn/AP framework. Dependency: the interface must show what persists, what is target-specific and what changes after an action. Failure mode: unique terminology becomes memorization without useful prediction.

**An opponent's turn can be productive without ceasing to be dangerous.** Defensive success can create AP, healing, counters or wheel movement. Dependency: readable cues and meaningful alternatives for different execution abilities. Failure mode: every strategy becomes subordinate to an action test that the intended tactical audience did not seek. The PC Gamer/GamesRadar disagreement is central evidence for that risk. [C1][C2][C18][C25]

**Equipment can teach without becoming permanent equipment.** Picto learning lets discovery expand future options. Dependency: separately communicate possession, learning, activation and stat bonuses. Failure mode: busywork equipping an inferior item for a hidden requirement, or assuming a learned passive is automatically active. [C9][C18]

**Relationship progression can make old space newly useful.** Esquie's bond and diving link companionship to navigation. Dependency: the player notices inaccessible opportunities and understands when access changes. Failure mode: mandatory social chores inserted between a desired movement ability and the player, or a solo check built around a neglected character. [C26]

**A spectacular world need not promise unrestricted simulation.** A limited traversal grammar can support strong composition and diverse places. Dependency: the marketed promise matches that grammar and tracking aids preserve orientation. Failure mode: players read a visually open vista as an affordance claim, or attractive corridors offer too little interesting navigation. [C8][C11][C12]

**Narrative consequences and repeatable combat consequences should be distinguished.** Authored party changes can carry emotional weight without making every combat loss permanently erase a companion. Dependency: clear save/recovery and story boundaries. Failure mode: equating dramatic loss with a general permadeath feature, or making players distrust investment because the consequences are not legible.

## 11. Coverage, preservation and further viewing — R14

| Requirement | Primary location in this dossier |
| --- | --- |
| R01 | §1 exact subject, platforms, campaign and update boundaries |
| R02 | §2 combat verbs; §4 traversal, services and quests |
| R03 | §2 six character systems; §3 equipment, resources and recovery |
| R04 | §5 progression, expenditure, failure, late game and support model |
| R05 | §6 six explicit worked sequences with prerequisites and failure limits |
| R06 | §4 authored NPCs, party, camp, relationships and absent simulation/multiplayer scope |
| R07 | §7 art, sound, interface, timing and Photo Mode production |
| R08 | §4 premise, places, predecessors, cast and act-dependent attachment |
| R09 | §8 prototype, studio, staffing boundary, casting and update work |
| R10 | §8 showcase/distribution evidence and labeled sharing hypotheses |
| R11 | §8 dated units/user-metric distinctions and unavailable financials |
| R12 | §9 five-plus original reviews, September 27 Steam helpful/current sample, disagreement and preserved prior access failure |
| R13 | §10 patterns, dependencies and failure modes |
| R14 | This map, source annotations, preserved checkpoint evidence and navigation |

### Mechanics inventory completeness check

This closes the assignment's explicit mechanics inventory against the sourced sections above.

- **Identity, attributes, progression, jobs/trees:** the campaign uses a fixed authored cast rather than avatar creation. §2 distinguishes six character-specific resource/action identities; §§2–5 cover attributes, levels, skill trees, weapon scaling and revisable allocation rather than a shared job system.
- **Items, inventory, weapons/armor, crafting/upgrading, magic/powers:** §3 covers weapons, Pictos, learned Lumina, catalyst upgrade tiers, Tints and permanent Shapes. The Curator upgrades equipment; there is no broad recipe-crafting or many-slot armor-construction system. Character skills/powers remain distinct from equipment passives.
- **Traversal, environmental/object interaction, activities/minigames:** §4 covers overworld travel, platforming, climbing, Esquie movement/revisitation and authored object/quest interactions. The Gestral Games/Beaches are now explicitly recorded as a separate bounded minigame layer rather than inferred from ordinary traversal.
- **Combat, stealth, loot/rewards, death/failure/recovery:** §2 covers turn selection, AP, free aim, timed dodge/parry/jump defense and character-specific combat states. There is no general stealth subsystem. §§3–5 distinguish equipment/material/quest rewards, flag recovery/resting, encounter repopulation and retry/build revision.
- **Economy/trading, story, relationships/romance/reputation, party/companions:** §§3–5 cover Chroma/services, authored narrative, camp relationship ranks and bounded romance, the active trio and reserve characters. Relationship ranks are authored per-character progress, not a general faction-reputation economy.
- **NPC/AI/schedules, factions, world map/environment, quests/events:** §4 covers named NPC services, Nevron quests, merchants/duels, regions and world-state/story gates. NPCs and enemies are authored behavior rather than a simulated universal daily-schedule system; there is no player-managed diplomatic faction layer.
- **Building/settlements/management, multiplayer/social, endgame/return loops:** camp is a service/social hub rather than settlement construction. Native multiplayer is absent. §5 covers late optional bosses, Endless Tower and New Game Plus, while §8 separates post-launch free additions from the launch game.

G77 is an expanded-roster addition, not a retroactive replacement for an original packet chapter. All C1–C10 checkpoint evidence survives here with its provenance and qualifications. The broader library's P01–P05 audits remain owned by the progress ledger; completing this dossier does not close them.

For audiovisual study, follow the **official launch trailer** embedded in C13, the **Thank You update trailer** in C6, and the **developer podcast** in C9. The podcast's written transcript was inspected; the embedded videos were not watched in full. No invented timestamps are provided. Compare the existing [Black Myth: Wukong dossier](black-myth-wukong.md) for execution-centered combat and [Disco Elysium dossier](disco-elysium.md) for character systems expressed through a very different action vocabulary.

## Sources and access notes

All accessed September 26, 2026. Links support nearby numbered citations; ranges such as C15–C18 refer to the individually annotated entries below. Guides describe documented rules, not source-code verification. Where a source's exact update date was not exposed, the access date is the observation date. No source text, protected art or full review is reproduced.

- **C1 —** [PC Gamer review](https://www.pcgamer.com/games/rpg/clair-obscur-expedition-33-review/), Justin Wagner, April 23, 2025. Original written criticism; strategic/execution disagreement. Full-body reading recorded in the prior checkpoint and continued here.
- **C2 —** [GamesRadar review](https://www.gamesradar.com/games/rpg/clair-obscur-expedition-33-review/), Alan Wen, launch review. Full body, including closing relationship/navigation discussion and platform disclosure, read in this continuation.
- **C3 —** [RPGFan review](https://www.rpgfan.com/review/clair-obscur-expedition-33/), Zek Lu, April 23, 2025. Original PS5-family criticism, replay and quest-bug report. Predicted fixes are not treated as shipped.
- **C4 —** [Push Square review](https://www.pushsquare.com/reviews/ps5/clair-obscur-expedition-33), Liam Croft, April 23, 2025. Main review body read; attached staff mini-impression not double-counted.
- **C5 —** [Washington Post review](https://www.washingtonpost.com/entertainment/video-games/2025/04/23/clair-obscur-expedition-33-review/), Gene Park, April 23, 2025. Prior checkpoint's full reading retained through a brief paraphrase. Fresh request returned a shell, so excluded from the five freshly accessible originals.
- **C6 —** [Official Thank You update](https://www.expedition33.com/post/thank-you-update-available-now-thank-you-for-an-amazing-year), December 12, 2025. Primary shipped-content announcement; body inspected. Linked detailed Steam patch notes are not presumed readable merely because linked.
- **C7 —** [Official first anniversary](https://www.expedition33.com/post/1st-anniversary-of-clair-obscur-expedition-33), April 24, 2026, updated April 26. Primary eight-million-unit milestone, haircuts and commissioned community emotes; body inspected.
- **C8 —** [Photo Mode development blog](https://www.expedition33.com/post/expedition-33-dev-blog-photo-mode), February 11, 2026. First-party feature-development and QA account; substantive evidence preserved from the earlier checkpoint.
- **C9 —** [Official Xbox podcast transcript](https://news.xbox.com/en-us/podcast/deep-dive-into-expedition-33-official-xbox-podcast/), pre-release developer/art-director interview. Written transcript read, not footage. Team counts have explicit scope; Sciel charge-label disagreement is flagged in §2.
- **C10 —** [Xbox Wire opening-act hands-on](https://news.xbox.com/en-us/2025/03/03/clair-obscur-expedition-33-preview/), Mike Nelson, March 3, 2025. Firsthand preview, not an independent full-release review; early AP explanation is not exhaustive.
- **C11 —** [TechRadar review](https://www.techradar.com/gaming/clair-obscur-expedition-33-review), Rob Dwiar, April 28, 2025. Full written body, accessibility discussion and testing disclosure read. Official launch record overrides inconsistent metadata.
- **C12 —** [GameSpot review](https://www.gamespot.com/reviews/clair-obscur-expedition-33-review-light-and-shadow/1900-6418358/), Richard Wakeling, page dated April 22, 2025. Original criticism, boss interactions and cross-character example; no claim of a universal completion time.
- **C13 —** [Official launch announcement](https://www.expedition33.com/post/out-now), April 24, 2025, updated June 24. Primary release, cast and premise; embedded launch trailer is a viewing route only.
- **C14 —** [Xbox Game Pass milestone and developer comments](https://news.xbox.com/en-us/2025/12/03/clair-obscur-expedition-33-game-pass-biggest-launch/), Will Fulton, December 3, 2025. Primary platform metric with first-thirty-days denominator; promotional publisher/platform context retained.
- **C15 —** [Attributes and breakpoints](https://www.gamerguides.com/clair-obscur-expedition-33/guide/getting-started/gameplay/best-attributes-and-breakpoints), Gamer Guides. Explanatory rules and derived-stat distinctions; guide recommendations are not adopted as measured optima.
- **C16 —** [Weapon properties and upgrading](https://www.gamerguides.com/clair-obscur-expedition-33/guide/weapons/overview/weapon-properties-and-upgrading-weapons), Gamer Guides. Weapon elements, scaling, passive thresholds and catalyst tiers; relevant body read.
- **C17 —** [Tint Shards and Upgrades](https://gamefaqs.gamespot.com/ps5/469495-clair-obscur-expedition-33/faqs/81883/tint-shards-and-upgrades), vreaper, GameFAQs guide updated January 21, 2026. Community-authored rule/location guide; capacity versus potency and named exploration rewards.
- **C18 —** [Pictos and Lumina explained](https://www.destructoid.com/clair-obscur-expedition-33-pictos-and-lumina-explained/), Scott Duwe, April 24, 2025. Written mechanics explanation and named passives; body read.
- **C19 —** [Gustave guide](https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/gustave-guide-best-skills-and-weapons), Gamer Guides. Charge, critical-hit and support mechanics; strategic recommendations separated from rules.
- **C20 —** [Lune guide](https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/lune-guide-best-skills-and-weapons), Gamer Guides. Stain capacity, production/consumption and spell examples.
- **C21 —** [Maelle guide](https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/maelle-guide-best-skills-and-weapons), Gamer Guides. Stance transitions, benefits and conditional entry; not an exhaustive patch-specific damage calculator.
- **C22 —** [Sciel guide](https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/sciel-guide-best-skills-and-weapons), Gamer Guides. Shipped Foretell/Sun/Moon/Twilight description, distinguished from C9's pre-release wording.
- **C23 —** [Verso guide](https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/verso-guide-best-skills-and-weapons), Gamer Guides. Perfection, action dependencies and rank-loss bound.
- **C24 —** [Monoco guide](https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/monoco-guide-best-skills-and-weapons), Gamer Guides. Learned Nevron attacks, six-skill selection and ordered mask wheel.
- **C25 —** [Nusaro database entry](https://www.gamerguides.com/clair-obscur-expedition-33/database/weapons/monoco/nusaro), Gamer Guides. Specific weapon passive thresholds; no copied full numerical progression table.
- **C26 —** [Relationship ranks and rewards](https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/relationships/relationship-guide-all-ranks-and-rewards), Gamer Guides. Camp/story gates, companion challenges and Esquie/Urrie example.
- **C27 —** [Nevron quests and rewards](https://www.gamerguides.com/clair-obscur-expedition-33/guide/side-quests/nevrons/all-nevron-quests-and-rewards), Gamer Guides. Named authored request chains; Jar reward type cross-checked against C17.
- **C28 —** [Romance guide](https://www.gamepressure.com/clair-obscur-expedition-33/are-there-any-romances/z51196d), Gamepressure, updated May 8, 2025. Actual optional routes, exclusivity and ordinary-bond distinction; body read.
- **C29 —** [BMO's post and shinespark's reply](https://www.grouvee.com/status/91568/), Grouvee, 2025; rendered update date differs from title/index date. Direct player text read. [Attempted Steam helpful-review surface](https://steamcommunity.com/app/1903340/reviews/?browsefilter=toprated) and app-review endpoint were blocked/failed on September 26; [specific discussion attempt](https://steamcommunity.com/app/1903340/discussions/0/592895445665066225/) also gated. These remain provenance/access records, not the completed Steam sample.
- **C30 —** [Official news index](https://www.expedition33.com/latest-news), re-checked September 27, 2026. Newest game-news entry remained the April 24 anniversary post (updated April 26); navigation/current-state evidence only, not an exhaustive platform patch history.
- **C31 —** [Recoat item description](https://www.gamerguides.com/clair-obscur-expedition-33/database/items/tints-1/recoat), Gamer Guides. Consumed attribute-or-skill reallocation; not the unrelated healing function incorrectly assigned by some aggregators.
- **C32 —** [Weapon acquisition and duplicate upgrades](https://game8.co/games/Clair-Obscur-Expedition-33/archives/515747), Game8. Indexed written weapon guide supplied acquisition/duplicate behavior; full page failed to render on a later direct request. Used narrowly, not counted as a read review or an exhaustive item census.

- **C33 —** [Game8: Gestral Beach Locations and 100% Guide](https://game8.co/games/Clair-Obscur-Expedition-33/archives/517704), updated May 14, 2025, with its linked Gestral Games guide. Secondary written guide used narrowly to establish the five bounded Gestral side-game/minigame types and their reward role; not primary implementation evidence or a claim that every later patch leaves them unchanged.


- **C34 —** [Clair Obscur: Expedition 33 on Steam](https://store.steampowered.com/app/1903340/Clair_Obscur_Expedition_33/), Valve store/review surface, audited September 27, 2026. Current dated aggregate plus visible Most Helpful/recent review bodies were read through the public store index. Used for the current English/recent sentiment snapshot and direct positive/negative testimony; counts/hours are mutable store metadata, not sales or representative polling.

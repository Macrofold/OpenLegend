# Clair Obscur: Expedition 33 — full game dossier

**Substantive research checkpoint — expansion in progress, November 7, 2026.** G77. The September 26–27 research is preserved below with its original dates, source labels and section anchors. The November expansion audits current evidence and adds deep story, mechanics, production, commercial analysis, reception and creator-tool research. **Major story and ending spoilers appear in the expansion.** Research informs OpenLegend decisions; it does not approve features or add runtime tasks.

The older website-news cutoff is superseded by the dated Steam patch audit below. Launch Game Pass availability is historical; the new platform announcement records its October 2026 departure. No new playthrough, executed community tool, viewed trailer or listened soundtrack is claimed.

## Preserved September research and evidence

The following body is retained as a dated research record. Read current-version corrections and the fuller investigation in the November sections that follow.

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

Original-pass sources were accessed September 26, 2026; C30 and C34 were re-checked/added in the September 27 audit. Links support nearby numbered citations; ranges such as C15–C18 refer to the individually annotated entries below. Guides describe documented rules, not source-code verification. Where a source's exact update date was not exposed, the access date is the observation date. No source text, protected art or full review is reproduced.

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

## November expansion

## Story, world, art and music expansion — November 7, 2026

**Research in progress. Major story and ending spoilers will appear in the completed expansion.** The preserved September dossier covers the premise and several relationship systems. This pass adds the full narrative structure, the distinction between the world's history and the player's changing understanding, the protagonists' conflicting commitments, and the contribution of visual and musical authorship.

### Authorial intent is evidence about a question, not a mandatory interpretation

In GamesRadar's original GDC 2026 interview, lead writer Jennifer Svedberg-Yen says the two endings were developed together. Her account treats them as complementary perspectives that ask whose happiness is being pursued and what that pursuit costs other people. It does not designate a universally correct ending. That intention is useful evidence when interpreting the finale, but it cannot settle whether every player finds the preceding journey or either resolution convincing. The reception expansion preserves disagreement on precisely that point. [ERO01]

**Open Legend hypothesis.** A consequential ending needs intelligible commitments on both sides: who wants an outcome, who bears its cost, what each person knows, and which consequences the player could reasonably anticipate. Ambiguity can support reflection when those commitments are clear; withholding all causal information would create a different experience. This is an interpretation for comparison, not a new approved feature.

### A consistent art language is also a production system

Adobe's interview with lead character artist Alan Reynaud and lead environment artist Carla Dévèze describes a focused set of reusable materials, including obsidian, black marble and gold. Character and environment texturing shared Substance tools, while the character pipeline also used sculpting, garment, modeling and rigging applications. The practical lesson is that a recognizable palette and material vocabulary can support consistency across thousands of authored assets. The vendor's description of a small principal art team should not be confused with the entire credited production workforce. [ERO02]

## Mechanics expansion and current-state audit — November 7, 2026

### Preservation and scope

The September 26–27 dossier already provides substantial coverage of the six characters, weapon scaling and upgrade tiers, Pictos versus Lumina, Tints, companion bonds, Nevron requests, Gestral minigames, and six cross-system situations. This supplement preserves that work. It concentrates on missing mechanical distinctions, deeper concrete interactions, and changes that a launch review or the older website-index check cannot establish. No hands-on play, internal source-code inspection, or video viewing is claimed.

### Material update to the dated patch boundary

The official website news index still presents the April 24, 2026 anniversary post as its newest game-news entry. That is evidence about the index, not the entire patch history. The official Steam announcements additionally expose **Patch 1.5.6, dated June 30, 2026**. It adds Arabic text and fixes interactions involving Burn applied during stun, Cleim, Martenon, and the Sireso weapon's interaction with Powerful at battle start. Missing audio cues for a Chromatic Lampmaster jump attack and Sirene's second charm attack were also corrected. Consequently, a launch report about a specific cue or build interaction must be dated; neither a 2025 complaint nor the website's shorter news list establishes the present behavior. [ESM01][ESM02]

The same announcement reports a known PC crash involving the Reacher/Manor on some configurations and suggests temporarily reducing Global Illumination below Epic. This is a dated publisher notice, not independent confirmation that a configuration still crashes on November 7. No claim of complete console/PC build parity follows from reading it. [ESM02]

### Combat framework: decisions versus execution

The developer's PlayStation account distinguishes unlimited decision time during the player's command selection from reaction time during enemy attacks. The visible turn-order column supports planning. Dodging has a more forgiving timing window than parrying; a fully parried enemy combo can generate a counterattack. Free aim can target a specific encounter mechanism: Goblu's flowers confer buffs, and shooting them changes the boss's tactical state. These are authored battle interactions rather than free positional combat. [ESM03]

**Interpretation.** A meaningful inventory must separately identify what the player chooses, what resources the choice spends, and what execution can change afterward. AP is not merely a spell-point pool; successful defense can alter the next turn's options. A boss-specific object can also make an inexpensive aimed shot more useful than spending the whole budget on direct damage. This is why “turn-based with parrying” is an insufficient mechanical description.

### Completion focus for this checkpoint

The next consolidation completes explicit Gradient resources and counters; Break and status rules; free aim and battle initiative; growth and build constraints; failure, retry and New Game Plus; current interface/accessibility changes; and additional worked cases. Existing exploration and social coverage will be summarized only where a newly verified rule changes its meaning.

### Concrete additions already verified

**Retry and readability were shipped changes, not recommendations.** Patch 1.4.0 (July 29, 2025) added a defeat-screen Battle Retry prompt, visible Lumina costs, dialogue autoplay, separate exploration/combat volume controls, and icons for Lune's Stains. It also fixed the Thermal Transfer extra-turn condition and the Second Chance/Healing Boon/Protecting Death immortality interaction. A build guide relying on either bug describes a superseded rule. The icon change matters because color ceases to be the only cue for distinguishing Stains. [ESM04]

**New Game Plus resets relationships and quest state.** The inspected Push Square guide describes completing the story, continuing from the save before the final boss, and choosing New Game Plus at a Rest Point. Character progression and inventory persist broadly, but optional-quest progress, associated quest items, and relationship levels reset. Stronger opponents and improved rewards distinguish the replay. This supports a clear separation between retained combat investment and repeated authored progression, without asserting that every collectible flag or platform-specific save behavior follows an undocumented universal rule. [ESM05]

**Gradient is a separate shared resource.** The indexed Stalact tutorial describes AP spent on skills filling the Gradient gauge, up to three charges. Those charges fund a character's separate Gradient attacks. The defensive Gradient Counter is a response to a special enemy attack, not simply another name for spending that offensive meter. The defensive guide identifies the greyscale cue and a dedicated timed input. Dodge, parry, jump and Gradient Counter are therefore four different responses, not interchangeable ways to negate every attack. [ESM06][ESM07]

**Status can change the legal action, not only damage.** Inverted turns healing into harm; Exhausted blocks AP gain; Silence prevents skills; Bound prevents dodging; Curse can kill when its duration expires. Shield absorbs hits, whereas Shell reduces incoming damage. Rush/Slow affect speed and Powerful/Powerless affect outgoing damage; Defenceless increases received damage. A status-aware build therefore needs answers to lost actions and resource denial as well as larger HP. Exact coefficients from this secondary list are not adopted where unnecessary or where its text is ambiguous. [ESM08]

### Additional build and control distinctions

**Post-launch interface changes.** The December12,2025 1.5.0 notes add saved Lumina Sets (up to50), controller remapping, HUD scale80–120%, extra Picto/Lumina filters, and an Abandon Battle option. These directly change the cost of trying a build and controlling a fight. The official Steam permalink rendered only a shell in this pass; the publisher's notes are preserved in the inspected GOGDB release-note mirror and independently indexed at Expedition33.gg. Verso's Drafts is accessible from ActIII with Esquie's underwater ability; it is not a new mandatory campaign chapter. [ESM09]

**Difficulty has mechanical changes beyond HP.** The official 1.3.0 announcement increases Story-mode parry/dodge windows by40%, enables Simon rematches, and adds ActIII flag modifiers for player damage caps and enemy-HP multipliers. Story, Expeditioner and Expert should therefore be discussed separately from optional challenge modifiers. The main point is adjustable execution and challenge, not a claim that every player's motor-access needs are solved by lowering difficulty. [ESM10]

**Free Aim is an AP decision within a turn.** Xbox Wire's first-hand release guide specifies one AP per shot without ending the current turn. Outside battle, shooting a Nevron can stun it long enough to approach and initiate First Strike. Resting refills restorative items and repopulates ordinary enemies; repeated attempts therefore spend player time rather than permanently consuming every restorative charge. [ESM11]

**Break has a threshold and a trigger.** Filling the golden Break bar does not by itself spend the opportunity. An action marked Can Break must trigger the stun; a qualifying attack can both finish filling the bar and break the target. The result denies the next enemy turn and increases damage during the opening. Damage-to-HP, contribution-to-Break, and permission-to-trigger-Break are three different properties. [ESM13]

**Learning, equipping and improving a Picto remain separate.** Only an actively fighting character advances mastery of an equipped Picto. A physical Picto can occupy one character at a time; the mastered Lumina can be activated by several characters within their individual budgets. Higher-level copies improve the Picto's statistics, not its passive's strength, and Pictos do not use the weapon-catalyst upgrade service. Distinct versions such as Energizing Start I–IV can stack, which is different from activating one identical effect twice. Colour allocations are not refunded by Recoats. The guide's claim that all Colours are finite conflicts with its reader corrections and is not adopted here. [ESM17]

**Respec has two separate costs.** Ordinary level-ups supply three attribute points and one skill point, but only six skills can be equipped. One Recoat refunds attributes or purchased skills; resetting both uses two. Starting skills remain available. That makes a new weapon's scaling a reason to reconsider allocation without confusing an equipment swap with a free complete character reset. [ESM18]

**Damage caps are part of progression.** Painted Power permits damage above9,999 and costs five points when equipped as Lumina. Obtaining it after the ActII climax is different from activating it on a particular character. A late-game damage build can be constrained by that activation even when its weapon and attributes look sufficient. [ESM19]

**An alternative to parry-funded AP exists.** Energising Pain removes AP gain from parries and gives one AP when hit. Its ten-point Lumina cost and the need to survive those hits create a different resource plan. It is evidence that an equipment choice can change the value of a mistake; it is not evidence of immunity or universally superior play. [ESM20]

## Expedition 33 — production, discovery, economics and creator ecosystem expansion

Research date: 2026-11-07 (work began late November 6 UTC). First sourced checkpoint; additive to the preserved September dossier. Evidence types and dates remain separate. No hands-on play, mod execution, video viewing or paid market-data access is claimed.

## Production evidence added to the existing C9 account

Tom Guillermin's March 2026 development account describes a progression from Broche's personal prototypes to a twelve-person vertical-slice team at GDC 2022, where Kepler support enabled the alpha and further hiring. Limited programming capacity shaped the workflow: keep Unreal close to its standard form, use selected external plugins, and provide Blueprint building blocks that designers combine. Skill presentation joins movement, effects, camera, focal length and timing. The world map, built late, reused interaction systems and art from other levels. This is first-person process evidence, not proof that engineering or content creation was cheap. The transfer hypothesis is to invest scarce technical work in tools that let content specialists iterate independently, while testing integration and runtime cost. [EPR01]

The CNC interview with Sandfall's Benjamin Dimanche places early experimentation in 2019 and identifies the prototype name *We Lost*. Broche, Tom Guillermin and François Meurisse formed the founding collaboration. Montpellier housed the core team and Paris the cinematics division; the approximately thirty-person description refers to the main team, while external partners also contributed. Dimanche emphasizes people working across disciplines. Do not relabel that figure as the complete credited workforce, or calculate total labor by multiplying it by the entire development duration. [EPR02]

## Dated commercial evidence and current-context audit

The preserved dossier's official **eight million copies sold by April 24, 2026** remains the latest directly inspected publisher milestone pending fresh verification. The current official news index still leads with the April anniversary post; this is an index observation, not an exhaustive proof that no later patch or announcement exists elsewhere. [C7][EPR03]

Publisher-distributed May 2025 material states **one million copies in the first three days** and **3.3 million in the first 33 days**, explicitly excluding additional Xbox/PC Game Pass downloads. Its October 8 release states **over five million sold** and lists PC availability including GOG, Steam and Epic. These are reported paid-copy milestones, not player totals or audited receipts. [EPR04][EPR05]

A fresh October 23, 2026 secondary report relays Alinea estimates of **8.7 million copies** and approximately **$366 million revenue**, but the article also contains a conflicting $336 million sentence. This is a research lead requiring the original analyst definition and method, not an accepted financial result. It also reports the title leaving Game Pass and estimated subscription players; those claims require primary platform verification before changing the dossier's present-tense distribution wording. [EPR06]

## R15 gate and initial tool evidence

The gate is provisionally yes: documented community tools and shipped modifications go beyond isolated cosmetic swaps. ClairObscurFix is an ASI plugin addressing frame-rate/presentation/configuration behavior; its GitHub README explicitly states that active development migrated to Codeberg and the GitHub repository was archived in August 2025. Do not treat the frozen mirror as current support. [EPR07]

The community Vortex extension documents distinct package classes: Unreal Paks, Blueprint LogicMods, UE4SS scripts/DLLs, resource folders, config and saves. It also distinguishes Win64 from the Xbox PC WinGDK layout and requires staging on the game's drive rather than symlink deployment. This is evidence of ecosystem complexity, not publisher certification or a guarantee that arbitrary mods combine safely. [EPR08]

**Online Expedition: a material current-version correction.** The primary creator description now shows v0.14.0, updated October 30, 2026. Earlier indexed text described ghosts and solo battles, but v0.11 added shared exploration, battles and story progress, rooms of up to five, a bundled UE4SS build, settings and diagnostic logs; v0.12 added Epic and Xbox PC editions. Changelogs require matching mod versions and describe repairs for party/progression state, desynchronized fights and shared loot. The current author permissions restrict redistribution, modification and reuse of contributed assets. This is an unofficial beta modification, not native multiplayer or a verified promise that every encounter works. The documented progression repairs make independent save backups especially important. [EPR09]

## Additional verified checkpoint: current access, marketing and technical production

**Game Pass status correction.** Microsoft’s October 7, 2026 service announcement lists Expedition 33 for removal on **October 15, 2026** across cloud, console and PC. The launch subscription availability is therefore historical; it should not remain an unqualified current offer. This independently confirms the dated distribution change, without validating any analyst claim about cannibalization or sales after departure. [EPR10]

**Creator campaign evidence.** Guillotine’s own case study says Kepler commissioned a campaign spanning previews, events and launch. It attributes the February preview beat to 87 creators producing 125 pieces, 1.7 million combined views and 174,000 livestream watch-hours. It reports 1,200 confirmed launch creators and claims 71% of global organic creator viewing from the early embargo through launch week. These are the agency’s self-reported attribution figures, with no independent methodology or sales-conversion audit provided. The page’s headline cards and narrative use different periods/metrics and should not be summed. The evidence supports planned creator outreach alongside organic uptake; it does not establish unpaid distribution, no marketing budget, or incremental purchases. [EPR11]

**Creator application channel.** The official site links a named Lurkit creator program and application route. The rendered application page provides no readable compensation, eligibility or commercial-rights terms. Do not infer that a content-creator program is a mod marketplace or that every participant is paid. [EPR12]

## Further production and creator evidence — substantive checkpoint

**Concrete engine use.** Guillermin’s March 2025 Unreal interview describes shared Blueprint work and daily Unreal Game Sync use. An early internal boss demo, passed between teammates after defeats, helped evaluate reactive defense; this is a remembered qualitative test, not an external sample. Skills were authored as small Sequencer cinematics with dynamically bound actors and exposed movement properties. The overworld used World Partition/HLOD tuning and a separate Esquie navigation mesh plus custom collision generation. The audio pipeline used a Blueprint Music Manager, MetaSounds presets and transition markers. These specific mechanisms explain what the purchased engine supplied and what the team still had to build; they do not prove zero engineering cost. [EPR13]

**Post-success scope discipline.** In the July 29, 2026 AUTOMATON interview, Broche describes approximately26 current staff and four programmers, with designers and technical artists implementing logic through Blueprints. He argues for preserving constraints rather than expanding reflexively after success. A possible Switch2 port is described as an interest and technical challenge, not an announcement. Treat current staffing, launch core staff and all credited contributors as different measures. The creative lesson is selective scope and short communication paths; the counterpoint is that constrained staffing also limits simultaneous platforms and maintenance capacity. [EPR14]

**E33-Randomizer: configuration-to-package creation.** The current upstream README requires .NET10 and supplies Windows/Linux routes. Users configure encounters, generate output, then install the matching `.pak`, `.utoc` and `.ucas` set in `Sandfall/Content/Paks/~mods`. The maintainer identifies overridden encounter tables and optional enemy-table changes, making conflict analysis concrete. Building depends on repak, retoc, uesave and UAssetAPI, with their separate licenses; dependency updates record versions and checksums. An older fork still documents .NET9, so this dossier follows upstream rather than combining incompatible instructions. Release-page retrieval failed; no exact release tag is claimed. The upstream MIT license covers that project’s code, not every bundled dependency or game asset. [EPR15]

**SiresoFix: a narrow authored rules repair.** Reagent0’s MIT-licensed script addresses the Sireso level4 passive being overwritten by Powerful. Its README pins a specific UE4SS experimental build, installs the script under the framework’s Mods folder, enables it in `mods.txt`, and checks the framework log for the loaded message. This is a documented route from a specific gameplay problem to a script distributed with installation and verification guidance. It is not evidence that the original defect remains in the current official patch, or that the old loader build is universally appropriate today. [EPR16]

**UE4SS: authoring/debugging infrastructure.** The framework offers Lua/C++ APIs, Blueprint loading, a live property viewer/editor, header generation and mapping dumps. Its maintainers explicitly reject a promise of automatic compatibility with every Unreal game. Documentation distinguishes ordinary installation from a development build and provides compatibility guidance and support channels. The general framework capability is not proof that every API or dumper works with every Expedition33 update. [EPR17]

**A creator explains the asset-editing route.** FrenchiestOfFries64’s High Cost Lumina’s Buff support thread describes extracting IoStore assets with retoc, locating the passive-effects data table, editing values with UAssetGUI, and repacking the edited files into the three-file container set for UE5.4. The discussion exposes missing mappings and unused/scrapped entries as concrete traps. The page labels version1.1, updated December14,2025 for game1.5.0; later comments include a resolved wrong-install-path problem and a July2026 appreciation post. These self-selected posts establish actual use/support, not popularity or current universal compatibility. Keep original extracted source files and edit only verified entries; a parser warning is not automatically harmless just because one creator tolerated it. [EPR18]

## Reception expansion — November 7, 2026

**Substantive research checkpoint; expansion in progress.** Preserve the September 26–27 review summaries and access history in the existing dossier. This addition examines later play experiences and disagreements; it does not replace launch criticism with an undated consensus. Story-ending discussion will be explicitly marked. No personal gameplay, hardware testing or video viewing is claimed.

### What remains established, and what this pass must add

The existing register explicitly records complete written-review bodies for PC Gamer, GamesRadar, RPGFan, Push Square and TechRadar, with additional GameSpot criticism. Those independent original reviews satisfy the five-review minimum at their recorded historical scope. Washington Post's retained summary remains qualified by the failed later retrieval. This pass does not count another excerpt, staff sidebar or rehost as an additional independent review. [Existing C1–C5, C11–C12]

The preserved disagreement is already useful: tactical planning and demanding defensive execution can appeal to different people; beautiful environments can still frustrate navigation; central dramatic scenes can feel more compelling than the camp relationship ladder. The expansion tests what those distinctions conceal. Does changing the camera make an attack easier to see? Can a player enjoy the narrative while rejecting its final perspective? Does completing the campaign mean the same thing as wanting another playthrough? None of these questions is answered by an aggregate recommendation percentage.

A new Steam retrieval failure does not invalidate the September 27 sample. Conversely, that old readable surface does not become a November sample merely because this dossier is being updated. The current attempt has encountered both inaccessible community routes and a store age-check page; further indexed public evidence is being investigated. The eventual result must identify actual review dates, edition context and the selection route.

### Later accessibility criticism: an experience, not a checklist

**Mike Matlock, Can I Play That?, December 4, 2025; PC.** The reviewer likes the game and describes learning a satisfying combat rhythm, while reporting substantial navigation time lost without dungeon maps. Automatic offensive inputs do not solve every defensive demand. Story difficulty, helpful Pictos and retries can reduce burden, yet valuable assistance may itself require defeating difficult enemies. Camera stabilization impresses him, although its wider view can hide useful choreography; redesigned Stain icons and separate combat/exploration audio controls improve legibility. He judges visual cues usable without sound, a conclusion to compare with other players' experiences rather than universalize. His own account alternates between lower difficulty making mastery unnecessary and later fights making missed timing costly. This is evidence of a tension between options and encountered demands, not a demonstrated guarantee for every impairment, build or boss. [ERV01]

**Interpretation to develop:** accessibility has at least three distinct costs here: obtaining usable information, performing an input, and recovering from a failed attempt. A change in one can leave the others intact. Evaluate the complete sequence from recognizing an attack to choosing a response to getting another attempt. A successful clear does not establish comfort, and enthusiasm for a game does not make a barrier imaginary.

**Michaela Criscione, DearGamers, May 15, 2025 launch-period account; console.** After nearly 100 hours and a platinum trophy, Criscione still ranks the game among her favorites. That attachment coexists with specific obstacles: white subtitles disappear against snowy scenery, including dialogue she cannot recover through ordinary speech; small stance/mask icons interfere with distinguishing character systems; the distant Gestral volleyball camera makes targets hard to discern. She successfully tests some merchant parries with eyes closed, but finds audio timing cues inconsistent across enemies. She also hesitates to experiment with builds because rebuilding a previous setup requires extensive menu work and memory. These observations support requests for readable text backgrounds, adjustable cues and saved loadouts; they do not establish which requests the November 2026 build still lacks. The article's platforming and recollection concerns also show why accessibility extends beyond combat. [ERV02]

The contrast with ERV01 should guide an evaluation protocol, not a winner between reviewers. Ask which enemy, camera configuration, sensory channel and moment in progression each observation concerns. A successful demonstration against one attack cannot certify the full campaign. Equally, a particular player's failure cannot establish that everybody must use the same channel. The Open Legend hypothesis is to test representative demanding cases with the people who need each option, including information-heavy menus and a return after time away. This is a proposed validation method, not a claim that Expedition 33 has passed or failed such a study.

### Later story reception — major ending spoilers

**JC, The Essential Malady, February 8, 2026; completed PC playthrough.** The reviewer enters skeptical and ends broadly impressed by combat, visual direction, performance and music. Experimenting with Luminas breaks their usual habit of retaining one successful RPG setup. Their major rejection is narrative: discovering the painted world's relationship to the Dessendre family makes the earlier struggle feel devalued, and both endings feel unsatisfying. They would prefer a resolution that saves the expedition's world through victory over its threat. That is the reviewer's interpretation and preferred dramatic contract, not proof that the painted inhabitants lack personhood or that the antagonist is objectively correct. Irritating platforming and early crashes also qualify the praise; lowering visual settings helped, while the proposed Xbox-app cause remains speculation. This is a qualified positive with a profound ending objection, not an across-the-board dismissal. [ERV03]

This disagreement deserves preservation even if the researcher's own reading favors the ending. A late change in perspective asks the player to reassess what counts as a successful outcome. Someone can understand that request and still dislike the bargain. Conversely, the premise that a created being's life is automatically meaningless would itself need defending; a reviewer's disappointment cannot settle that philosophical question. Open Legend should decide which commitments an ending fulfills, complicates or deliberately breaks, and test whether earlier play gives the audience grounds for that shift. Merely being surprising is an insufficient success criterion.

### Remaining work for this checkpoint

Retrieve additional contrasting firsthand criticism, especially post-completion story/endings reactions and recent return/quit accounts; inspect accessible helpful positive and negative Steam evidence; distinguish launch accessibility claims from later accounts and the separately verified patch chronology. The final synthesis will separate attraction, frustration, continuation, satisfied stopping and replay, with concrete examples and counterpoints rather than a universal retention story.

## November annotated source register

### Story, world and presentation

- **ERO01 — Kaan Serin, GamesRadar, original GDC 2026 writer interview.** https://www.gamesradar.com/games/rpg/clair-obscur-expedition-33-writer-says-picking-an-ending-is-like-choosing-my-favorite-child-but-ultimately-the-finales-are-two-sides-of-the-same-coin/ — Substantive written body read November 7, 2026; paired-ending intention, not a ruling on player interpretation.
- **ERO02 — Pierre Bosset, Adobe, October 16, 2025.** https://blog.adobe.com/en/publish/2025/10/16/how-substance-3d-powered-art-clair-obscur-expedition-33 — Direct artist testimony, read November 7, 2026; vendor case-study context and workforce boundary retained.

### Mechanics and versions

Accessed November 7, 2026 unless otherwise stated. This checkpoint is a working research artifact; the final supplement will remove this marker and consolidate all citations here.

- **ESM01 — Official news index.** https://www.expedition33.com/latest-news — Live website index; newest displayed game-news article April 24, 2026. Index coverage does not exhaust Steam patch history.
- **ESM02 — Official Steam announcements.** https://steamcommunity.com/app/1903340/announcements/ — Publisher's Patch 1.5.6 announcement, June 30, 2026, and earlier dated notices. Individual announcement permalink will replace this index citation where retrievable.
- **ESM03 — Guillaume Broche, PlayStation Blog.** https://blog.playstation.com/2024/08/28/new-clair-obscur-expedition-33-gameplay-fighting-and-exploring-the-flying-waters-region/ — August 28, 2024. First-party prerelease mechanics explanation; written body only, not footage inspection.

- **ESM04 — Official Patch 1.4.0 notes.** https://www.expedition33.com/post/patch-1-4-0-is-now-live — July 29, 2025, updated July 30. First-party shipped quality-of-life, accessibility and combat corrections.
- **ESM05 — Liam Croft, Push Square NG+ guide.** https://www.pushsquare.com/guides/clair-obscur-expedition-33-new-gameplus-how-to-start-new-gameplus-and-what-carries-over — June 30, 2025. Body read; progression and quest/relationship resets, not exhaustive implementation documentation.
- **ESM06 — Neoseeker, Stalact walkthrough.** https://www.neoseeker.com/clair-obscur-expedition-33/Stalact — Undated community guide. Indexed Gradient tutorial read; direct open returned403, so use is limited to the exposed rules.
- **ESM07 — Carlos Zotomayor, AUTOMATON WEST, defensive actions.** https://automaton-media.com/en/tips/clair-obscur-expedition-33-how-to-get-the-hang-of-dodges-parries-jumps-and-gradient-counters/ — April30,2025. Written account of dodge, parry, jump and Gradient Counter; no footage inspection.
- **ESM08 — Abhishek Mallick, Backdash, status effects.** https://thebackdash.com/gaming/all-status-effects-buffs-and-debuffs-in-clair-obscur-expedition-33/ — May6,2025. Secondary rules inventory; an ambiguous regeneration number is deliberately excluded.

- **ESM09 — Patch1.5.0 notes, publisher text via mirrors.** Official permalink https://store.steampowered.com/news/app/1903340/view/491585297311596633 ; inspected mirror https://www.gogdb.org/product/2125022825/releasenotes ; indexed corroboration https://expedition33.gg/version-1-5-0-patch-notes-thank-you-update/ — December12,2025. Official page rendered a shell; GOGDB is independent, not GOG itself. Mirror copies count as one underlying source.
- **ESM10 — Official Patch1.3.0 notes.** https://www.expedition33.com/post/patch-1-3-0-is-now-live — Website post June12,2025. Story timing, Simon rematches and challenge modifiers.
- **ESM11 — Jeff Rubenstein, Xbox Wire, eight tips.** https://news.xbox.com/en-us/2025/04/23/tips-to-get-started-clair-obscur-expedition-33/ — April23,2025. Firsthand review-build guide on a platform-holder site; no independent implementation verification.
- **ESM12 — Mike Matlock, Can I Play That? accessibility review.** https://caniplaythat.com/2025/12/04/clair-obscur-expedition-33-accessibility-review/ — December4,2025; PC observations predate1.5.0.
- **ESM13 — Matt Villei, Gameranx, Break guide.** https://gameranx.com/features/id/536314/article/clair-obscur-expedition-33-how-to-break-enemies/ — April26,2025. Threshold/trigger distinction and stun outcome.
- **ESM14 — Carlos Zotomayor, AUTOMATON WEST, Mimes.** https://automaton-media.com/en/tips/clair-obscur-expedition-33-how-to-defeat-mimes/ — April30,2025. Encounter rules and cosmetic rewards.
- **ESM15 — Clair Obscur Wiki, Skills.** https://clair-obscur.fandom.com/wiki/Skills — Undated community reference; indexed text confirms Monoco's active-party learning requirement and foot icon. Direct Wiki access restricted.
- **ESM16 — Gamer Guides, merchant database.** https://www.gamerguides.com/clair-obscur-expedition-33/database/npcs/merchants — Undated database; stock, Chroma exchange, duel gates.
- **ESM17 — Gamer Guides, Colours of Lumina.** https://www.gamerguides.com/clair-obscur-expedition-33/guide/getting-started/gameplay/using-and-allocating-colours-of-lumina/ — Undated guide; mastery/equipment and allocation rules. Its finite-supply assertion is disputed in-page and excluded.
- **ESM18 — Gamer Guides, Recoats.** https://www.gamerguides.com/clair-obscur-expedition-33/guide/getting-started/gameplay/using-and-farming-recoats/ — Undated guide; six-skill limit and separate resets.
- **ESM19 — Gamer Guides, Painted Power.** https://www.gamerguides.com/clair-obscur-expedition-33/database/pictos/offensive/painted-power — Undated item reference; effect/cost only, not full copied stat table.
- **ESM20 — Gamer Guides, Energising Pain.** https://www.gamerguides.com/clair-obscur-expedition-33/database/pictos/support/energising-pain — Undated item reference; resource substitution and cost.

### Production, economics and creation

All newly accessed sources: 2026-11-06/07 UTC. Existing C-series source owners remain in the preserved dossier.

- **EPR01 — Tom Guillermin, PlayStation Blog, March 11, 2026.** https://blog.playstation.com/2026/03/11/how-the-clair-obscur-expedition-33-dev-process-powered-creative-design-freedom/ — First-person development account, read.
- **EPR02 — CNC interview, July 4, 2025.** https://www.cnc.fr/web/en/news/the-story-behind-clair-obscur-expedition-33-the-breakout-video-game-from-french-studio-sandfall-interactive_2419300 — Interview with Sandfall marketing/publishing producer, read; team claims attributed.
- **EPR03 — Official news index.** https://www.expedition33.com/latest-news — Current index read; navigation observation only, same source as existing C30.
- **EPR04 — Publisher release, May 27, 2025.** https://www.gamespress.com/CLAIR-OBSCUR-EXPEDITION-33-ACHIEVES-33-MILLION-UNITS-SOLD-IN-FIRST-33- — Publisher-distributed release, full body read.
- **EPR05 — Publisher release, October 8, 2025.** https://www.gamespress.com/en-US/CLAIR-OBSCUR-EXPEDITION-33-HAS-SOLD-OVER-5-MILLION-COPIES-WORLDWIDE — Publisher-distributed release, full body read.
- **EPR06 — GamesRadar via Yahoo, October 23, 2026.** https://tech.yahoo.com/gaming/articles/clair-obscur-expedition-33-sold-105807276.html — Secondary model report; conflicting revenue wording, not accepted as actual accounts.
- **EPR07 — Lyall, ClairObscurFix README.** https://github.com/Lyall/ClairObscurFix/blob/main/README.md — Maintainer documentation; archived mirror and migration noted.
- **EPR08 — Vortex extension maintainer page.** https://www.nexusmods.com/site/mods/1279 — Indexed maintainer text; direct fetch returned403, so current metadata remains unverified.
- **EPR09 — Online Expedition creator listing.** https://www.nexusmods.com/clairobscurexpedition33/mods/820 — Initial base-page fetch403 and stale indexed description; current description/changelog subsequently read at https://www.nexusmods.com/clairobscurexpedition33/mods/820?tab=description .

- **EPR10 — Xbox Wire, October 7, 2026.** https://news.xbox.com/en-us/2026/10/07/xbox-game-pass-october-2026-wave-1/ — Primary service-departure schedule, read.
- **EPR11 — Guillotine campaign case study.** https://www.guillotine.agency/case-studies/clair-obscur — Agency-authored campaign report, read; self-interested attribution, not audited conversion evidence.
- **EPR12 — Official creator program.** https://creators.expedition33.com/ — Public landing page read; linked Lurkit application shell supplied no substantive terms.

- **EPR13 — Unreal Engine developer interview, March27,2025.** https://www.unrealengine.com/developer-interviews/inside-the-development-journey-of-clair-obscur-expedition-33 — First-person technical account, read; engine-vendor context.
- **EPR14 — AUTOMATON original interview, July29,2026.** https://automaton-media.com/en/interviews/clair-obscur-expedition-33-director-eliminating-limitations-is-a-big-mistake-we-talk-to-sandfall-interactive-about-staying-small-japanese-influences/ — Developers’ testimony, read; current intentions are not shipped features.
- **EPR15 — IhorChornyi314, E33-Randomizer.** https://github.com/IhorChornyi314/E33-Randomizer — Current upstream README read; releases route failed. Older fork inspected only to distinguish stale instructions.
- **EPR16 — Reagent0, SiresoFixMod.** https://github.com/Reagent0/SiresoFixMod — Maintainer installation/diagnostic documentation read; no execution.
- **EPR17 — UE4SS maintainers.** https://github.com/UE4SS-RE/RE-UE4SS — Direct framework documentation, read; generic capabilities need game-specific verification.
- **EPR18 — FrenchiestOfFries64, High Cost Lumina’s Buff support discussion.** https://www.nexusmods.com/clairobscurexpedition33/mods/354?tab=posts — Indexed creator tutorial/support replies read; direct rendering intermittent.

### Reception and player experience

All new sources accessed November 7, 2026. Existing C-numbered sources remain owned by the preserved dossier register.

- **ERV01 — Mike Matlock, Can I Play That?, “Clair Obscur: Expedition 33 accessibility review,” December 4, 2025.** https://caniplaythat.com/2025/12/04/clair-obscur-expedition-33-accessibility-review/ — Complete substantive body read; PC review includes firsthand experiences and recommendations. Its simplified mechanical/lore explanations are not imported as authoritative rules.

- **ERV02 — Michaela Criscione, DearGamers, “Clair Obscur: Expedition 33’s Biggest Area to Improve: Accessibility,” May 15 (2025 launch-period context).** https://www.deargamers.net/reviews/clair-obscur-expedition-33s-biggest-area-to-improve-accessibility — Complete substantive body read. Page omits year beside date; launch/trophy account identifies historical scope, not current-build certification.
- **ERV03 — JC, The Essential Malady, “Clair Obscur: Expedition 33 Review,” February 8, 2026.** https://www.essentialmalady.com/2026/02/08/clair-obscur-expedition-33-review/ — Complete body read; personal post-completion review with major spoilers. Causal hardware speculation and judgments about indie eligibility are not treated as verified facts.

[C1]: https://www.pcgamer.com/games/rpg/clair-obscur-expedition-33-review/
[C10]: https://news.xbox.com/en-us/2025/03/03/clair-obscur-expedition-33-preview/
[C11]: https://www.techradar.com/gaming/clair-obscur-expedition-33-review
[C12]: https://www.gamespot.com/reviews/clair-obscur-expedition-33-review-light-and-shadow/1900-6418358/
[C13]: https://www.expedition33.com/post/out-now
[C14]: https://news.xbox.com/en-us/2025/12/03/clair-obscur-expedition-33-game-pass-biggest-launch/
[C15]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/getting-started/gameplay/best-attributes-and-breakpoints
[C16]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/weapons/overview/weapon-properties-and-upgrading-weapons
[C17]: https://gamefaqs.gamespot.com/ps5/469495-clair-obscur-expedition-33/faqs/81883/tint-shards-and-upgrades
[C18]: https://www.destructoid.com/clair-obscur-expedition-33-pictos-and-lumina-explained/
[C19]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/gustave-guide-best-skills-and-weapons
[C2]: https://www.gamesradar.com/games/rpg/clair-obscur-expedition-33-review/
[C20]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/lune-guide-best-skills-and-weapons
[C21]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/maelle-guide-best-skills-and-weapons
[C22]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/sciel-guide-best-skills-and-weapons
[C23]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/verso-guide-best-skills-and-weapons
[C24]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/playable/monoco-guide-best-skills-and-weapons
[C25]: https://www.gamerguides.com/clair-obscur-expedition-33/database/weapons/monoco/nusaro
[C26]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/characters/relationships/relationship-guide-all-ranks-and-rewards
[C27]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/side-quests/nevrons/all-nevron-quests-and-rewards
[C28]: https://www.gamepressure.com/clair-obscur-expedition-33/are-there-any-romances/z51196d
[C29]: https://www.grouvee.com/status/91568/
[C3]: https://www.rpgfan.com/review/clair-obscur-expedition-33/
[C30]: https://www.expedition33.com/latest-news
[C31]: https://www.gamerguides.com/clair-obscur-expedition-33/database/items/tints-1/recoat
[C32]: https://game8.co/games/Clair-Obscur-Expedition-33/archives/515747
[C33]: https://game8.co/games/Clair-Obscur-Expedition-33/archives/517704
[C34]: https://store.steampowered.com/app/1903340/Clair_Obscur_Expedition_33/
[C4]: https://www.pushsquare.com/reviews/ps5/clair-obscur-expedition-33
[C5]: https://www.washingtonpost.com/entertainment/video-games/2025/04/23/clair-obscur-expedition-33-review/
[C6]: https://www.expedition33.com/post/thank-you-update-available-now-thank-you-for-an-amazing-year
[C7]: https://www.expedition33.com/post/1st-anniversary-of-clair-obscur-expedition-33
[C8]: https://www.expedition33.com/post/expedition-33-dev-blog-photo-mode
[C9]: https://news.xbox.com/en-us/podcast/deep-dive-into-expedition-33-official-xbox-podcast/
[EPR01]: https://blog.playstation.com/2026/03/11/how-the-clair-obscur-expedition-33-dev-process-powered-creative-design-freedom/
[EPR02]: https://www.cnc.fr/web/en/news/the-story-behind-clair-obscur-expedition-33-the-breakout-video-game-from-french-studio-sandfall-interactive_2419300
[EPR03]: https://www.expedition33.com/latest-news
[EPR04]: https://www.gamespress.com/CLAIR-OBSCUR-EXPEDITION-33-ACHIEVES-33-MILLION-UNITS-SOLD-IN-FIRST-33-
[EPR05]: https://www.gamespress.com/en-US/CLAIR-OBSCUR-EXPEDITION-33-HAS-SOLD-OVER-5-MILLION-COPIES-WORLDWIDE
[EPR06]: https://tech.yahoo.com/gaming/articles/clair-obscur-expedition-33-sold-105807276.html
[EPR07]: https://github.com/Lyall/ClairObscurFix/blob/main/README.md
[EPR08]: https://www.nexusmods.com/site/mods/1279
[EPR09]: https://www.nexusmods.com/clairobscurexpedition33/mods/820
[EPR10]: https://news.xbox.com/en-us/2026/10/07/xbox-game-pass-october-2026-wave-1/
[EPR11]: https://www.guillotine.agency/case-studies/clair-obscur
[EPR12]: https://creators.expedition33.com/
[EPR13]: https://www.unrealengine.com/developer-interviews/inside-the-development-journey-of-clair-obscur-expedition-33
[EPR14]: https://automaton-media.com/en/interviews/clair-obscur-expedition-33-director-eliminating-limitations-is-a-big-mistake-we-talk-to-sandfall-interactive-about-staying-small-japanese-influences/
[EPR15]: https://github.com/IhorChornyi314/E33-Randomizer
[EPR16]: https://github.com/Reagent0/SiresoFixMod
[EPR17]: https://github.com/UE4SS-RE/RE-UE4SS
[EPR18]: https://www.nexusmods.com/clairobscurexpedition33/mods/354?tab=posts
[ERO01]: https://www.gamesradar.com/games/rpg/clair-obscur-expedition-33-writer-says-picking-an-ending-is-like-choosing-my-favorite-child-but-ultimately-the-finales-are-two-sides-of-the-same-coin/
[ERO02]: https://blog.adobe.com/en/publish/2025/10/16/how-substance-3d-powered-art-clair-obscur-expedition-33
[ERV01]: https://caniplaythat.com/2025/12/04/clair-obscur-expedition-33-accessibility-review/
[ERV02]: https://www.deargamers.net/reviews/clair-obscur-expedition-33s-biggest-area-to-improve-accessibility
[ERV03]: https://www.essentialmalady.com/2026/02/08/clair-obscur-expedition-33-review/
[ESM01]: https://www.expedition33.com/latest-news
[ESM02]: https://steamcommunity.com/app/1903340/announcements/
[ESM03]: https://blog.playstation.com/2024/08/28/new-clair-obscur-expedition-33-gameplay-fighting-and-exploring-the-flying-waters-region/
[ESM04]: https://www.expedition33.com/post/patch-1-4-0-is-now-live
[ESM05]: https://www.pushsquare.com/guides/clair-obscur-expedition-33-new-gameplus-how-to-start-new-gameplus-and-what-carries-over
[ESM06]: https://www.neoseeker.com/clair-obscur-expedition-33/Stalact
[ESM07]: https://automaton-media.com/en/tips/clair-obscur-expedition-33-how-to-get-the-hang-of-dodges-parries-jumps-and-gradient-counters/
[ESM08]: https://thebackdash.com/gaming/all-status-effects-buffs-and-debuffs-in-clair-obscur-expedition-33/
[ESM09]: https://store.steampowered.com/news/app/1903340/view/491585297311596633
[ESM10]: https://www.expedition33.com/post/patch-1-3-0-is-now-live
[ESM11]: https://news.xbox.com/en-us/2025/04/23/tips-to-get-started-clair-obscur-expedition-33/
[ESM12]: https://caniplaythat.com/2025/12/04/clair-obscur-expedition-33-accessibility-review/
[ESM13]: https://gameranx.com/features/id/536314/article/clair-obscur-expedition-33-how-to-break-enemies/
[ESM14]: https://automaton-media.com/en/tips/clair-obscur-expedition-33-how-to-defeat-mimes/
[ESM15]: https://clair-obscur.fandom.com/wiki/Skills
[ESM16]: https://www.gamerguides.com/clair-obscur-expedition-33/database/npcs/merchants
[ESM17]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/getting-started/gameplay/using-and-allocating-colours-of-lumina/
[ESM18]: https://www.gamerguides.com/clair-obscur-expedition-33/guide/getting-started/gameplay/using-and-farming-recoats/
[ESM19]: https://www.gamerguides.com/clair-obscur-expedition-33/database/pictos/offensive/painted-power
[ESM20]: https://www.gamerguides.com/clair-obscur-expedition-33/database/pictos/support/energising-pain

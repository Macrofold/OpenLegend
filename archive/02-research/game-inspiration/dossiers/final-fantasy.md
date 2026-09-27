# G78 — Final Fantasy I

[Library](../README.md) · [Roster](../research-roster.md) · [Progress](../research-progress.md) · [Requirements](../research-requirements.md)

**Full-category research pass: September 26, 2026.** The original Final Fantasy and its major remake lineages are the subject, not the separately assigned sequels. This completes the earlier checkpoint without discarding its review disagreements or source limits. No firsthand gameplay, full-video viewing or proprietary implementation inspection is claimed. The worked examples are constructed from documented rules. Inspiration is not an accepted OpenLegend design.

## 1. Identity, promise and edition boundaries — R01

The Japanese Famicom original appeared in 1987; the North American NES release followed in 1990. Four player-defined adventurers undertake a world-restoration journey. This is a single-player, menu-driven party RPG: choose a composition, prepare in towns, risk resources in dungeons, acquire the means to reach another region, and eventually resolve the crisis of the four Crystals. It is not a character-action game or a later Final Fantasy job-switching system. [F5][F8][F9]

| Studied version | Distinction that materially changes play |
| --- | --- |
| **Famicom/NES original** | Spell-level charge budgets, slower menus and travel, limited information, and original implementation quirks. A command aimed at an already defeated enemy can be wasted rather than automatically redirected. [F3][F13] |
| **PlayStation Origins** | A remade early version with its own presentation and difficulty settings. The explicitly PS1-labeled rule tables below are historical references, not unqualified Pixel Remaster formulas. [F14–F17] |
| **Game Boy Advance / PSP remake lineage** | Uses a shared MP pool instead of the original charge structure. The PSP Anniversary Edition includes the four Dawn of Souls bonus dungeons plus an additional dungeon; that extra content is not in Pixel Remaster. [F2][F3] |
| **Pixel Remaster** | Launched on Steam July 28, 2021. Returns to spell-level charges but retains other conveniences and rebalancing; it is not the NES executable with replacement art. The current store describes encounter toggles, experience adjustments, alternate music/font options, auto-battle and collection features. [F1][F8] |

The 2023 console announcement dates the PS4 and Switch releases to April 19. Later availability encompasses Xbox Series, PC storefronts and mobile as well. Platform availability is not evidence of identical launch features or an exhaustive current patch audit. [F19][F22]

**Interpretation:** the core fantasy is stewardship of an expedition, not performance of an individually voiced hero. The player owns the party because its initial composition and subsequent purchases were their decisions. Much of the drama comes from how far that group can safely travel, rather than how many dialogue branches the protagonist can choose.

## 2. What the player actually does — R02, R06

### Party creation and class identity

Four slots are filled from six starting classes, with duplicate choices allowed. Names and job composition establish identity; there is no origin-story editor, romance preference or continuously adjustable class tree. Promotion develops the existing choice rather than replacing it with an unrelated job. [F9][F14]

| Initial class → promotion | Role and commitment |
| --- | --- |
| **Fighter/Warrior → Knight** | Durable physical attacker; needs equipment investment. Promotion broadens equipment access and permits limited White Magic. |
| **Black Belt/Monk → Master** | Increasingly effective unarmed attacker, reducing dependence on purchased weapons. It does not become a spellcaster through promotion. |
| **Thief → Ninja** | An initially constrained equipment user with a much broader later arsenal and lower-level Black Magic. The early cost and later payoff differ. |
| **White Mage → White Wizard** | Healing, protection, status recovery and dedicated anti-undead magic. Promotion opens the highest White Magic. |
| **Black Mage → Black Wizard** | Elemental offense, control and support spells; physically vulnerable, with the highest Black Magic unlocked later. |
| **Red Mage → Red Wizard** | A flexible mixture of weapon use and selected spells from both schools; flexibility does not include every specialist's late spell. |

These are capabilities, not a recommendation that one party is objectively best. Specific growth numbers vary by edition, and even an apparently straightforward promotion can have historical quirks. [F9][F10][F13]

The class names do not imply modern franchise commands. The original Thief is not a general-purpose pickpocket, and the Monk is not equipped with a later game's timed martial-arts menu. The action vocabulary is substantially shared; differences come from legal equipment, magic and growth. [F9][F14]

### Round-by-round decisions

Combat separates selecting commands from watching their resolution. Attack, magic, item use and escape address different problems. The player allocates several characters' actions without the real-time parry or offensive timing of Expedition 33. Turn order and enemy survival can invalidate an apparently sensible instruction; later automatic retargeting reduces one original source of wasted actions. [F3][F5]

The main encounter questions are whether to concentrate damage, remove a group with magic, protect a vulnerable member, cure an impairment or retreat. Poison, paralysis, petrification, elemental attacks and undead encounters make the cheapest routine attack an incomplete answer. A larger maximum HP number is not interchangeable with a cure for the condition preventing a character from acting. [F11][F15]

Formation is part of preparation. The PS1 rules reference describes the leading position as receiving half of ordinary randomly targeted attacks, making a durable lead valuable. This is a version-labeled targeting rule, not proof that every enemy ability in every edition obeys that distribution. [F14]

### Towns, exploration and activities

The other major verbs are walking between terrain regions, talking to NPCs, buying and selling, sleeping at inns, opening chests and doors, presenting key objects, using vehicles and finding dungeon routes. NPCs supply information and fixed services; they are not autonomous social agents with a relationship simulation. There is no native co-op, faction reputation ladder, romance, settlement building, farming, survival cooking or general physics-based object manipulation in this scope. These absences help define the game's concentration on expedition decisions. [F5][F8][F12]

A hidden sliding-tile puzzle aboard the ship is an actual minigame, but its rewards are edition-specific: the Pixel Remaster guide distinguishes its achievement from earlier versions' money/item rewards. It must not be described as a universal unlimited-gil exploit. [F12]

## 3. Items, spells and composition — R03

### Resource types are not interchangeable

HP measures immediate survival; experience advances characters; gil buys supplies and development; spell charges constrain particular tiers of magic; status ailments require appropriate responses; and key items change world access. Better weapon damage cannot open a magically locked room, just as more gil does not itself teach an unpurchased spell. [F11][F15][F17]

Magic is divided into eight levels and two schools, with three learned slots per level per caster rather than ownership of every available spell. A Red Mage's White and Black selections compete within that character's slot capacity. Spell permissions are class-dependent. Casting consumes the relevant level's allowance, not a separately replenishing meter attached to each named spell. The GBA/PSP MP system is a different budgeting model. [F11][F16]

Named spells communicate different purposes: **Cure** restores one character; **Heal** assists the group; **Life** revives; **Dia** attacks undead; **Fira** damages a group; **Haste** increases a physical attacker's offensive potential; **Temper** buffs attack; and **Exit/Teleport** provide escape functions subject to their version and caster restrictions. Choosing three spells creates an opportunity cost even before the first cast is spent. [F11]

**Source correction:** a broad multi-edition guide says that charges cannot be restored away from an inn. That should not be transferred wholesale to Pixel Remaster, where Ethers are discussed by actual players and reviews. Similarly, a spell list's intended effects do not prove that every NES spell implementation worked as described. Use the edition-specific evidence, not a composite imaginary version. [F2][F7][F13]

### Equipment is both permission and effect

Swords, daggers, axes, hammers, nunchaku and staves have individual class permissions. Weapons are bought or found; armor and accessories add defense and resistances. There is no general recipe tree or weapon-experience system. The **Masamune** can be wielded by any class, whereas obtaining **Excalibur** requires Adamantite and the dwarven blacksmith. A treasure's value therefore depends on who can use it, not just its displayed strength. [F18]

The PS1 systems guide distinguishes damage, hit count, accuracy and evasion. It also cautions that some of its detailed calculations are the author's reconstruction rather than verified code. The safe lesson is to read multiple properties rather than assuming every larger number has the same role; this dossier does not reproduce uncertain formulas as engine facts. [F15]

Unarmed progression matters because a Monk can outgrow the benefit of holding a weapon. That creates a useful counterexample to blindly accepting an equipment optimizer or treating every empty slot as a mistake. The class's low weapon expenditure also changes how much the party can spend on other members. [F14][F18]

### Usable equipment and recovery

A **Healing Staff** is not valuable primarily for striking an enemy. Its item use casts party healing repeatedly without consuming a learned spell charge. The PS1 reference locates it in the Citadel of Trials and explicitly describes using it while a weak enemy remains alive. That is a particular rules interaction, not permission to treat every weapon as an infinitely rechargeable spell. [F20]

Potions and condition-curing items are purchased safety margins; restoring a fallen character and healing the restored character are separate concerns. Edition changes to revival items, Ethers, save convenience and encounter controls materially alter the pressure exerted by a dungeon. The remaster cannot simultaneously be described as retaining every original hardship and eliminating its friction. [F1][F2][F8]

Key objects have a different lifecycle. The **Mystic Key** opens previously inaccessible rooms; the **Canoe** changes traversable terrain; **Oxyale** permits underwater access; the **Rosetta Stone** and **Bell** participate in access through knowledge and language; the **Rat's Tail** demonstrates valor for promotion. They are not loot to replace whenever a higher-stat version appears. [F17]

## 4. World, people and story — R06, R08

**Premise and structural spoilers:** the Warriors of Light restore the four Crystals, encountering elemental Fiends along the way. Cornelia supplies an initial rescue involving Princess Sarah and Garland; Matoya and the sleeping elven prince turn another region's problem into a chain of interdependent errands. Later destinations mix medieval settlements with underwater ruins and a technological flying fortress. [F8][F12]

Travel expands through a ship, a canoe and an airship. The map is therefore not merely a larger walking surface: different transportation changes which apparent obstacles are relevant. Individual access objects still matter after flight becomes available. Movement freedom and quest completion are separate axes. [F12][F17]

The party's personal characterization is sparse. NPCs are memorable through a name, a need, a place and a consequential exchange rather than long companion conversations. The protagonists do not maintain an approval network with Matoya, Bahamut or the dwarves. Attachment is more likely to come from remembering the group that survived a dangerous journey than from an authored personal romance. This is an interpretation of the game's limited character dialogue, not an assertion about every player's emotional response. [F3][F5]

**Late structural spoiler:** the final journey returns to the opening shrine in the past, and Sarah's early Lute becomes useful again before the concluding confrontation. The callback gives a retained object narrative significance rather than only sentimental inventory presence. It also makes the starting region part of the ending rather than disposable tutorial terrain. [F12]

World history is suggested through ruins, languages, lost technology and repeated elemental motifs. This is not a continuously simulated historical process. The distinction matters: an authored remnant can imply depth without needing every implied civilization's economy to run offscreen.

## 5. Progression, economy and failure — R04

Three main kinds of progress operate together: numerical growth from combat, purchasing or discovering capabilities, and obtaining access to places. Promotion is a fourth important milestone, but not a repeatedly reusable respec. Spending decisions include spells versus armor, immediate supplies versus saving for future equipment, and investing in a versatile but expensive member versus a low-equipment specialist. [F10][F14][F15]

A typical first excursion stays near a safe town; later expeditions rely on knowledge of healing opportunities and the expected demands of a route. A treasure side path has a cost even without an admission fee: more encounters, more attrition and potentially a longer return. Modern auto-battle and save conveniences reduce the time or recovery cost of mistakes, while encounter and experience settings let the player alter the underlying pressure. [F4][F8]

Defeat is not a permadeath campaign with permanently removed characters. Recovery operates through the relevant edition's revival and save/reload structure. The precise endurance challenge must therefore state its save rules: an original-era expedition and a remaster run using modern conveniences are different experiences, even when they visit similarly named dungeons. [F1][F3][F5]

Return play is primarily voluntary: a different starting party, self-imposed restrictions, remaining treasures, the bestiary or an edition's extra dungeons. Pixel Remaster does not acquire the PSP challenge dungeons merely because both are remakes. There is no documented daily quest treadmill, battle pass or player-to-player auction economy. Premium purchase, bundles and later subscription access are distribution choices, not the fictional economy. [F3][F8][F21]

## 6. Worked interactions — R05

The following are constructed rule-based illustrations, not claims of executed playtests. They explain consequences without pretending to establish an optimal party or damage formula.

### A. Buy a safer journey rather than the largest attack

**Intention:** reach a dungeon objective with enough resources to return. **Conditions:** gil is limited and several party members need upgrades. **Actions:** compare a new weapon with additional recovery supplies and an unlearned support spell; inspect who can use each. **Interaction:** a smaller immediate damage increase may preserve more future actions than one expensive attack upgrade. **Result:** preparation addresses the expedition rather than one encounter. **Next decision:** take another branch or leave while escape is safe. **Limit:** excessive precaution can make routine fights longer; the illustration is a tradeoff, not a rule that defensive spending is always superior. [F14][F15]

### B. Reopen familiar space through a dependency chain

**Intention:** gain access beyond the initial maritime region. **Conditions:** the party can retrieve the Crown and confront Astos. **Sequence:** obtain the Crystal Eye, exchange it with Matoya for the tonic, wake the prince, receive the Mystic Key, and recover the Nitro Powder needed for the canal. **Interaction:** several local problems connect to a global route change. **Result:** previously visited rooms become newly useful. **Next decision:** follow the opened route or collect optional locked treasure first. **Limit:** the key does not eliminate enemy danger or make every backtrack equally worthwhile. This is an authored chain, not arbitrary item bargaining. [F12]

### C. Treat promotion as a world reward, not a free menu toggle

**Intention:** broaden what the existing party can do. **Conditions:** access to the Citadel of Trials and Bahamut's region. **Sequence:** retrieve the Rat's Tail, return to Bahamut, then inspect newly permitted equipment and spells. **Interaction:** exploration advances character roles; a Ninja's Black Magic or Knight's limited White Magic opens combinations previously unavailable. **Result:** the original party choice remains recognizable but gains options. **Next decision:** fund those options or continue using the existing loadout. **Limit:** promotion does not let the player turn a Monk into a White Wizard, and new permissions do not automatically purchase every spell. [F10]

### D. Discover the economic value of a weak-looking staff

**Intention:** recover without consuming scarce healing casts. **Conditions:** own the Healing Staff and retain a manageable enemy in battle. **Sequence:** use the staff as an item while other characters avoid ending the encounter. **Interaction:** equipment supplies a repeatable recovery action outside the ordinary spell budget. **Result:** endurance improves without acquiring more spell charges. **Next decision:** continue healing or finish before the remaining enemy creates a new problem. **Limit:** the tactic consumes real time and battle turns; dangerous opponents can outpace it. This also exposes a design risk: efficient play can become tedious stalling. [F20]

### E. Allocate a rare weapon by marginal value

**Intention:** improve the whole party rather than its already strongest member. **Conditions:** acquire the Masamune late in the game. **Sequence:** compare how much each legal wielder gains relative to their current useful actions. **Interaction:** universal equipment permission creates a decision across otherwise distinct classes. **Result:** a support character may gain a credible fallback attack, or a dedicated attacker may become even stronger. **Next decision:** assess the coming encounter rather than automatically assigning by class stereotype. **Limit:** a caster holding a strong sword still has only one action to spend; attacking can displace necessary healing. [F18]

### F. Decide whether a repeat command is still appropriate

**Intention:** accelerate routine encounters. **Conditions:** Pixel Remaster's repeat-action auto-battle is available. **Sequence:** establish a useful command set, enable repetition, then intervene when targets, resources or enemy types change. **Interaction:** automation saves input but preserves the consequences of the chosen commands. **Result:** ordinary battles become faster without having to issue identical instructions repeatedly. **Next decision:** leave automation on or regain control. **Limit:** repeating an expensive spell or item is not the same as a costless basic attack. The benefit depends on remembering the active pattern. [F4]

## 7. Art, audio, interface and feel — R07

The original communicates classes through compact silhouettes and colors, while larger enemy illustrations carry much of the visual spectacle. Nintendo Life's retrospective values the melodies and enemy art but notes the modest environmental detail and limited animation. It is a useful contrast between an economical readable symbol and the richly individualized acting expected from later RPGs. [F5]

Pixel Remaster credits Kazuko Shibuya's pixel-art contribution and Nobuo Uematsu's supervision of rearranged music. Its gallery, music player and bestiary also let the player inspect aspects of the work outside the campaign. These are preservation and appreciation surfaces, not additional story quests. [F8]

Siliconera's review links its renewed enjoyment to faster encounters, richer battle backgrounds and music; WorthPlaying instead finds the font and some art choices a weaker modernization. Their disagreement warns against treating more detailed art as an automatic improvement in identity or readability. The early font criticism must also be distinguished from later selectable fonts. [F2][F4][F19]

**Interpretation:** the game's different scales are functional. A town is a readable collection of services; an overworld compresses a journey; a battle makes relative party/enemy state explicit. Consistency of information matters more than pretending these are one physically continuous camera space. A remake can keep that useful abstraction while changing how much time the player spends between decisions.

## 8. Production, distribution and commercial context — R09–R11

Hiromichi Tanaka recalls working on game/data design and experience tables while Nasir Gebelli programmed the original, after their earlier collaborations on WorldRunner and Rad Racer. The official interview was originally published in 2020 and republished in 2025; the later page header is not the date of the remembered production. [F6]

A transcription of the official 35th-anniversary discussion describes Dragon Quest helping demonstrate the feasibility of a console RPG, and the team's desire for the initials FF preceding the final title choice. It does not support reducing the entire development history to an unqualified bankruptcy/last-chance legend. This is retrospective participant testimony transmitted through a written transcription, not independently audited contemporary minutes. [F23]

TOSE explicitly credits itself with developing the mobile/Steam Pixel Remaster series. That helps avoid treating the storefront's publisher field as the full production roster. The sources establish collaboration, not a verified engine, total team size, development cost or per-title profit. [F24]

The remaster's promotion foregrounds revisiting the early series with coherent visual/audio treatment and modern convenience. The 2023 console launch used a trailer, bundle/individual choices and time-limited platform extras. Nostalgia and accessibility are visible positioning; their contribution to sales cannot be isolated from the announcement alone. [F19]

**Dated business evidence:** the six-game Pixel Remaster series had exceeded **six million combined sales** in reporting dated December 18, 2025, supported by Square Enix's soundtrack promotion. This is not six million FFI sales, six million complete bundles or six million unique players. No reliable individual-title split or audited profit was established. [F22][F25]

Xbox's January 6, 2026 announcement scheduled **Final Fantasy** for Game Pass on January 8. This is evidence of a dated subscription-distribution addition, not a guarantee of indefinite current availability and not a disclosed count of incremental purchasers. [F21]

**Interpretation:** a starting-party challenge, a rare encounter, a remembered melody or a comparison of old and new sprites is a compact shareable unit. A fan does not need to retell the whole plot to express attachment. These are plausible word-of-mouth mechanisms, not measured claims about which streamer or channel caused a particular number of sales.

## 9. Reception and direct player feedback — R12

### Five substantive original written reviews

All five bodies, including the initially unfinished WorthPlaying conclusion and Nintendo Life review, were read. They concern different editions and dates, so they are not averaged into a fictitious synchronized consensus.

| Review | Specific praise and criticism |
| --- | --- |
| **Brian Mackenzie, RPGFan, July 28, 2021 — PC Pixel Remaster** | Values exploration and NPC clues, while noting unclear next steps and uneven bosses. Initial class selection can commit a newcomer to costs they could not reasonably predict. [F1] |
| **Chris DeAngelus, WorthPlaying, August 4, 2021 — PC Pixel Remaster** | Enjoys approachable combat and conveniences, but finds a compromise between fidelity and completeness; early charge-limited mages can feel less useful than physical attackers. Font and presentation reservations coexist with strong music praise. [F2] |
| **Kevin VanOrd, GameSpot, June 25, 2007 — PSP Anniversary** | Appreciates refreshed presentation and extra challenge, but dislikes frequent encounters, thin characterization and weak navigation guidance. His objection to selling I and II separately is a historical value judgment, not current pricing advice. [F3] |
| **Joel Couture, Siliconera, August 8, 2021 — PC Pixel Remaster** | Faster battles, maps and the musical/visual refresh revived interest; character-art, font and screen-tearing complaints concern the tested release. They do not prove those defects persist across later platforms. [F4] |
| **Corbie Dillard, Nintendo Life, October 7, 2009 — NES via Virtual Console** | Finds durable melodic appeal and satisfaction for patient players, while recording slow movement, grinding and limited animation. Its nostalgic perspective is distinct from a first-time remaster review. [F5] |

A factual disagreement is kept explicit: WorthPlaying's brief description of promotion as statistics and appearance is not a complete rule account. Equipment and spell permissions do change, as the dedicated promotion references document. Criticism remains valuable without treating every explanatory aside as infallible. [F2][F10]

### Steam helpful-review sample

The English **Most Helpful (All Time)** surface for app 1173770 was readable after a language-filtered request failed. These are selected visible accounts, not a prevalence estimate; displayed hours and helpful counts are observation-time values, not necessarily publication-time values. All are early reviews, not fresh assessments of every 2026 feature. [F7]

| Account / original posting | Position and concrete response |
| --- | --- |
| **grs102581 — July 28, 2021; recommended** | Likes the classic and convenience changes; reports that automatic equipment can still arm a Monk, and revises early observations after further play. |
| **[Azura Stella] — July 30, 2021; recommended; gifted-copy disclosure** | Welcomes the mix of charge-based identity and modern convenience, with improved presentation and map support. |
| **gamblingpoet — July 29, 2021; not recommended** | Praises pixels and music but objects to omitted optional content and argues that Ethers undermine the purpose of charge-based endurance. |

The useful contrast is between making a historic structure less laborious and removing the pressures that once gave that structure meaning. The sample establishes that disagreement, not how often all owners share it. [F7]

### September 2026 current-store cross-check

The audit re-read the live Steam surface rather than assuming that the 2021 launch sample still described current reception. On September 27, 2026 the English corpus was still **Overwhelmingly Positive** at about **95% positive across roughly 5.7k English reviews**; the recent snapshot was also strongly positive. Visible June/July 2026 review bodies specifically praise maps, chest/bestiary tracking, auto-battle, EXP/gil boosters and encounter toggles for reducing old friction, while still calling out the historically high encounter rate and obscure route guidance those options mitigate. [F8][F26]

That does not erase the earlier negative helpful review about omitted remake content or easier resource recovery. It strengthens the versioned conclusion: current players often value the remaster **because it lets them modulate the original expedition pressure**, not because the pressure never existed.

## 10. Transferable patterns and limits — R13

**A small irreversible choice can create ownership.** Starting composition shapes both action availability and expenditure. Dependency: consequences should be explainable to a newcomer. Failure mode: the most consequential choice occurs before the player has enough information to understand it.

**Access can advance through useful objects, not only levels.** A key, vehicle or translation can change the meaning of familiar space. Dependency: the player can remember where the earlier barrier was. Failure mode: a coherent dependency becomes an opaque errand chain when clues or return routes are weak.

**Different resources create different reasons to retreat.** HP, conditions, spell tiers and gil are not substitutes. Dependency: the player must see which resource is limiting progress. Failure mode: a supposedly strategic endurance system collapses into monotonous healing or routine grinding.

**Convenience changes are balance changes when they affect cost.** Faster input, save flexibility, Ethers and encounter controls act on different parts of the experience. Dependency: the intended mode is stated. Failure mode: presenting one version as both perfectly faithful and universally frictionless obscures meaningful tradeoffs.

**Equipment can provide verbs as well as numbers.** A reusable healing effect or broadly usable weapon changes allocation. Dependency: item-use and equip permissions are legible. Failure mode: optimal use becomes repetitive stalling or a hidden interaction only discoverable outside the game.

**Sparse characterization can coexist with memorable party history.** A group can matter through its shared survival. Dependency: enough variation and consequence to distinguish one journey from another. Failure mode: confusing low dialogue volume with either automatic emotional depth or automatic lack of depth.

These are research interpretations, not a proposal to copy protected character names, assets, dialogue or exact progression into OpenLegend.

## 11. Coverage, preservation and viewing routes — R14

| Requirement | Substantive owner here |
| --- | --- |
| R01 | §1 identity, scope, release and remake boundaries |
| R02 | §2 commands, classes, exploration and absent categories |
| R03 | §3 resources, spells, equipment, recovery and key objects |
| R04 | §5 advancement, spending, failure and return loops |
| R05 | §6 six complete constructed interactions |
| R06 | §2 party/formation/NPC services and §4 bounded social scope |
| R07 | §7 silhouettes, scale, audio, controls and friction |
| R08 | §4 named people/places, premise, world traces and callback |
| R09 | §8 original contributors, retrospective evidence and remaster collaboration |
| R10 | §8 launch positioning, distribution and labeled sharing hypotheses |
| R11 | §8 dated aggregate-sales boundary and unavailable title financials |
| R12 | §9 five original reviews and contrasting Steam accounts |
| R13 | §10 patterns, dependencies and failure modes |
| R14 | This map, source register and library/roster/progress links |

This is an expanded-roster addition, not a replacement for an original packet chapter. The checkpoint's F1–F7 identities, review disagreements and production facts are retained. The initially unfinished review readings are now completed. No whole-library packet audit is claimed.

For viewing, use the launch trailer embedded in the official 2023 announcement and the official anniversary conversation linked by the transcription. The written transcription was inspected; the videos were not watched in full and no timestamps are invented. Compare [Expedition 33](clair-obscur-expedition-33.md) for a radically different enemy-turn experience. The roster supplies the separate FFII and FFIII reading routes rather than collapsing the franchise into this entry.

## Sources and access notes

Original-pass sources were accessed September 26, 2026; the Steam product/community surfaces were re-checked September 27 for the audit. Review bodies and relevant guide sections were read; whole walkthroughs and external linked videos are not claimed exhaustively inspected. Dates below are source publication dates where exposed. Detailed rules from community guides are version-labeled, not source-code audits.

- **F1:** [RPGFan review](https://www.rpgfan.com/review/final-fantasy-pixel-remaster/), Brian Mackenzie, July 28, 2021. Original PC review, full body read.
- **F2:** [WorthPlaying review](https://worthplaying.com/article/2021/8/4/reviews/127614-pc-review-final-fantasy-pixel-remaster/), Chris DeAngelus, August 4, 2021. Full body and conclusion read; promotion aside corrected against mechanics sources.
- **F3:** [GameSpot Anniversary Edition review](https://www.gamespot.com/reviews/final-fantasy-anniversary-edition-review/1900-6173084/), Kevin VanOrd, June 25, 2007. Full original PSP criticism; historical content/value comparison.
- **F4:** [Siliconera review](https://www.siliconera.com/review-final-fantasy-pixel-remaster-reinvigorates-a-classic/), Joel Couture, August 8, 2021. Full body; repeat-action convenience and launch presentation complaints.
- **F5:** [Nintendo Life NES review](https://www.nintendolife.com/reviews/2009/10/final_fantasy_virtual_console), Corbie Dillard, October 7, 2009. Full review body, not all reader comments. Its broad historical superlatives are not adopted as proof of genre priority.
- **F6:** [Official Tanaka interview](https://eu.finalfantasy.com/topics/171), originally 2020, republished April 26, 2025. Named firsthand recollection; FFI production excerpt used narrowly.
- **F7:** [Steam helpful-review surface](https://steamcommunity.com/app/1173770/reviews/?browsefilter=toprated). Direct positive and negative account text inspected; dynamic selection and current-hour limitations stated in §9.
- **F8:** [Official Steam product page](https://store.steampowered.com/app/1173770/FINAL_FANTASY/). Current advertised features, release metadata and creative credits; storefront description is not independent reception or full patch history.
- **F9:** [FFI class guide](https://www.rpgsite.net/feature/11509-final-fantasy-1-job-classes-ff1-character-class-list-and-best-team-party-options), Alex Donaldson, July 27, 2021. Capabilities and composition; exact starting statistics and claims of universally best parties are not adopted.
- **F10:** [Class promotion guide](https://www.rpgsite.net/feature/11510-final-fantasy-1-job-upgrade-how-to-change-class-to-knight-master-ninja-and-wizard), Alex Donaldson, July 28, 2021. Linear promotions and Rat's Tail/Bahamut route.
- **F11:** [Magic guide](https://www.rpgsite.net/feature/11511-final-fantasy-1-magic-list-all-ff1-spells-their-effects-how-to-get-more-magic), Alex Donaldson, July 28, 2021. Schools, spell slots and named effects; overbroad restoration wording is explicitly qualified.
- **F12:** [FFI walkthrough](https://www.rpgsite.net/feature/11508-final-fantasy-1-walkthrough-where-to-go-dungeon-maps-ff1-step-by-step-guide), RPG Site. Relevant opening, trade-chain, vehicle, minigame and ending sections inspected; no claim to have followed the guide in play. Its incidental labeling of Bahamut as a summon is not adopted for FFI.
- **F13:** [NES class reference](https://guides.gamercorner.net/ff/classes/), Gamer Corner Guides. Original-version distinctions and implementation caveats; not blindly transferred to the remaster.
- **F14:** [Origins party creation](https://guides.gamercorner.net/ff-ps/party-creation/), Gamer Corner Guides. Version-specific roles, costs and ordinary targeting distribution.
- **F15:** [Origins systems](https://guides.gamercorner.net/ff-ps/systems/), Gamer Corner Guides. Author explicitly identifies some reconstruction/uncertainty; no uncertain numerical formula is elevated into a verified fact.
- **F16:** [Origins spells](https://guides.gamercorner.net/ff-ps/spells/), Gamer Corner Guides. Historical spell-level/class reference, not a current all-platform balance table.
- **F17:** [Origins key items](https://guides.gamercorner.net/ff-ps/key-items/), Gamer Corner Guides. Named object families and traversal/quest functions.
- **F18:** [Weapons guide](https://www.rpgsite.net/feature/11513-final-fantasy-1-weapons-ff1-best-weapons-weapon-list-locations), Alex Donaldson, July 27, 2021. Core weapon families, Masamune and Excalibur. Its loose grouping of PS1 with later bonus-content versions is not used to assert that Origins contains GBA/PSP dungeons.
- **F19:** [Official console launch announcement](https://na.finalfantasy.com/news/2213), April 6, 2023. April 19 release, options and promotional extras; embedded trailer is a viewing route only.
- **F20:** [Healing Staff, Origins](https://guides.gamercorner.net/ff-ps/weapons/healing-staff), Gamer Corner Guides. Item use and stalling interaction. The page's related entries for other games are not imported into FFI.
- **F21:** [Xbox Game Pass January announcement](https://news.xbox.com/en-us/2026/01/06/xbox-game-pass-january-2026-wave-1/), January 6, 2026. Dated FFI addition, not a permanent-availability promise.
- **F22:** [Pixel Remaster sales report](https://www.rpgsite.net/news/19219-final-fantasy-pixel-remaster-series-sales-numbers-2026-soundtrack-cd-release), Mikhail Madnani, December 18, 2025. Secondary dating of the combined-series milestone and platforms; not an individual-title financial disclosure.
- **F23:** [35th-anniversary interview transcription](https://novacrystallis.com/2023/07/final-fantasy-35th-anniversary-special-interview-part-1-of-2-transcription/), Nova Crystallis, July 2023. Transcribed participant conversation; relevant origin passages read, not a claim of watching the full source video.
- **F24:** [TOSE development credit](https://www.tose.co.jp/en/news/2022622000519.html). First-party statement that it developed the mobile/Steam remaster series, with all six released by February 24, 2022.
- **F25:** [Official Pixel Remaster soundtrack promotion](https://www.jp.square-enix.com/music/sem/page/ff_pixelremaster_ost_cd/en/), Square Enix. Primary corroboration of the combined six-million milestone; not title-specific sales.
- **F26:** [Steam Community FINAL FANTASY reviews](https://steamcommunity.com/app/1173770/reviews/), re-audited September 27, 2026. Current visible June/July review bodies used narrowly for modern QoL/encounter-rate/navigation testimony; dynamic ordering and displayed hours are not prevalence estimates.

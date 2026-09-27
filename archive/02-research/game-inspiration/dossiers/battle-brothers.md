# G121 — Battle Brothers

**Full R01–R14 research pass.** Research date: September 26, 2026. Canonical scope: [G121 in the roster](../research-roster.md); standard: [R01–R14](../research-requirements.md); state and completion commit: [research ledger](../research-progress.md). This is reference research, not an accepted OpenLegend design or implementation task. **Spoilers:** named late-game encounters and expansion framing, but no detailed solution to a legendary battle.

## R01 — Identity, editions and the player promise

Battle Brothers is a single-player, turn-based mercenary-company RPG by Overhype Studios, released for Windows on March 24, 2017. The current Steam listing credits Hooded Horse and Overhype as publishers. It joins an open, procedurally generated strategic map to discrete hex-grid battles: choose employment, hire and equip people, survive their work, then decide what the company can afford next. The protagonist is principally the company, not a predetermined savior or an avatar who must always lead every battle. Console versions are real ports, not identical interface experiences; the Switch and PS4 reviews below are deliberately version-labeled. [S01, S02, S23–S25]

The first-session promise is modest and immediately legible: make a few poorly equipped people survive paid violence. Established play asks different questions: can this roster beat a particular enemy family, can it sustain losses far from resupply, and is a prestigious contract worth jeopardizing months of investment? World survival and company prosperity are related but not identical objectives. A lord's war can be an opportunity, an obligation, or something to avoid. This distinction explains the sandbox better than calling it simply a difficult combat game. [S02, S21]

### Expansion and version boundaries

| Content | What changes the play model | Boundary |
| --- | --- | --- |
| Base game | Classless company development, contracts, exploration, tactical battles, three large crisis families: noble war, greenskin invasion and undead scourge. | The early developer features page describes the original product; its achievement count is not treated as current. [S02] |
| Beasts & Exploration — November 29, 2018 | Expands wilderness encounters and legendary challenges; adds beast-part crafting, armor attachments and visual customization. | Taxidermy and this expanded creature toolkit should not be silently attributed to the launch build. [S03, S13] |
| Warriors of the North — May 9, 2019 | Company origins alter starting resources, composition and rules; adds barbarians, northern equipment, champions and the Ijirok encounter. | Its advertised ten origins are a release-time count, not the current total across DLC. Peasant Militia and cultists are distinct starts, not ordinary class choices. [S04] |
| Blazing Deserts — August 13, 2020 | Southern city-states, arena work, additional origins, retinue and cart upgrades, gunpowder/alchemy, new opponents and the Holy War crisis. | The fourth crisis belongs to this expansion. Some accompanying world changes arrived through the free update; the whole package was not free. [S05, S14] |
| Of Flesh and Faith — March 10, 2022 | Free Oathtaker and Anatomist origins: voluntary oath constraints versus experimentation with creature-derived enhancements. | This is an alternative campaign framework, not a universal spellcasting system. Oathtakers follow Young Anselm; Anatomists gain their own event and potion context. [S06] |
| Other extras and maintenance | Free Lindwurm content; soundtrack/supporter extras; subsequent free encounters, balance and compatibility work. | Store bundles mix functional expansions with support/cosmetic/audio extras. They are not nine equal-sized expansions. [S01] |

The March 20, 2025 update added the Abandoned Village and a linked, harder location involving flesh golems and the Grand Diviner. Those locations require a new campaign; general fixes apply to existing campaigns. The developer explicitly warned that older mods could break and supplied a previous-version branch. This is an important distinction between preserving a save and making new generated-world content appear in it. [S15]

The June 2026 Steam announcements now provide a direct primary current-version boundary. **Update 1.5.2.2 (June 18, 2026)** added the Pollaxe, Executioner's Sword and Estoc, new Brigand leaders and Northern Noble House Men at Arms alongside balance changes; **1.5.2.3 (June 24, 2026)** fixed regressions including an Estoc crash without Beasts & Exploration, named-item recognition, an Executioner retirement ending and settlement-market issues. The publisher's July recap still points to 1.5.2.2/1.5.2.3 as the recent content/update pair, so 1.5.2.3 is the newest published Steam patch found in this September 27 audit. The earlier GOG mirror remains useful for additional detailed patch text, but it is no longer the primary source for the latest-version claim. These are documented PC/Steam changes, not personally tested behavior or proof of console/storefront parity. [S16, S36]

## R02 — What the player can actually do

### Company, recruitment and development

Recruit backgrounds such as farmhands, ratcatchers, hunters or nobles; inspect their individual attributes, traits, equipment and cost; assign a battlefield role; rename and visually distinguish them; then decide who fights and who remains in reserve. Background is a starting distribution and event identity, not a fixed class. A well-born recruit is not automatically the best long-term investment. The historical talent-system redesign explicitly sought to let a promising humble recruit become exceptional. [S07, S08]

Combat development combines hit points, fatigue capacity, initiative, resolve, melee/ranged skill and melee/ranged defense with equipment and perks. The ordinary level track grants a perk point and improvement of three attributes per level through level 11; veteran levels continue smaller attribute increases without ordinary new perk points. Stars affect attribute-growth potential. The practical decision is therefore not just which number to maximize, but which role this particular person's future can support. [S08, S17]

The perk tree is shared rather than class-locked. Weapon masteries alter action/fatigue efficiency and special actions: Dagger Mastery changes attack cadence; Polearm Mastery changes reach-weapon flexibility; Spear Mastery modifies how a breached spearwall behaves. They create different uses of the same inventory family rather than merely changing its damage color. The retrieved community table predates the newest maintenance notes in some details, so this dossier avoids presenting it as an exhaustive current numeric build guide. [S18]

### Tactical action vocabulary

Deploy the formation before combat; move over hexes; inspect terrain, elevation, initiative and reach; attack with the equipped weapon's skills; wait or end a turn; change carried equipment; use consumables; release a war animal; protect an endangered ally; break an enemy formation or withdraw. Movement and attacks share action points rather than rigid move-then-act phases. Most also accumulate fatigue, which does not fully reset every round. Armor consumes fatigue capacity before the fight begins. The launch-era stat article is useful for the intended model, but its assurance that a fighter can always perform a basic attack is not carried forward as a universal present rule. [S09, S19]

Position is a commitment. Leaving an enemy's melee zone of control provokes strikes; a connecting strike prevents the move. Ranged-weapon users, fleeing units and stunned units do not exert the same control. Thus surrounding a target and simply moving past it are different problems. This is also why a damage preview alone does not explain whether an action is safe. Enemy equipment, adjacency, morale, fatigue, terrain and the remaining turns matter together. [S19]

### Complete mechanics inventory and useful absences

| Area | Actual player-facing system |
| --- | --- |
| Identity and classes | Generated mercenaries, backgrounds, traits and talents; shared perk tree; origin-specific company rules. No ordinary wizard/cleric class roster. [S07, S08, S18, S27] |
| Items and inventory | Individual equipment and bags plus company storage; loot, purchases, repairs, consumption, sale and loss. Loadout affects available actions and endurance. [S01, S09] |
| Crafting and upgrading | Taxidermist recipes convert beast trophies and money into useful products; armor attachments create further tradeoffs. This is not a factory-building or universal weapon-forging simulation. [S13] |
| Magic and powers | Supernatural creatures, opponents, events and exceptional items exist. The usual mercenary vocabulary remains material and martial; Anatomist enhancements and Oathtaker restrictions belong to their origins. [S06, S27] |
| Traversal and environment | Strategic-map route choice and exploration; tactical terrain and elevation; settlement services and encounter locations. Not a continuous third-person world in which every domestic object can be manipulated. [S02, S19] |
| Activities and quests | Contracts, exploration, ambitions, events, and expansion arena fights. A contract's apparent payoff must be weighed against time, preparation and follow-on obligations. [S05, S20, S29] |
| Combat and stealth | Turn-based combined equipment/position/resource tactics. Avoidance and choosing engagements matter on the map; no separate player-character stealth skill tree or crouch-based infiltration campaign is presented. [S02, S19] |
| Death and recovery | Permanent death, survivors with injuries, replacement recruitment, healing/rest and company rebuilding; optional ironman constrains reloading. Bandages are not a generic instant cure for every injury. [S10, S30] |
| Relationships and reputation | Company mood, background-conditioned events, employer and settlement relationships, renown and contracts. No general romance, family-line or marriage simulator. [S11, S20, S29] |
| Management and social play | Payroll, provisions, reserves, repairs and expansion retinue/cart choices. Native play is single-player; mods and shared seeds/builds are community participation, not an official cooperative campaign. There is no player-owned castle/kingdom-management layer. [S01, S14, S27] |
| Late play | Crisis participation, ambitious battles, legendary encounters, famed equipment, improved companies and replaying different origins. Winning one crisis does not magically eliminate payroll or the cost of another defeat. [S02–S06, S15, S20] |

## R03 — Items, equipment and composition

Equipment is an action vocabulary. A spear can discourage approach with Spearwall; a mace can stun; an axe can destroy a shield; a hammer attacks an armor problem. A weapon's value therefore depends on the opponent and the rest of the formation, not a single ascending damage ranking. A low-cost weapon can remain a useful specialist tool even after more expensive equipment appears. [S02]

The most revealing counterexample is the dagger. A Rondel Dagger's Puncture bypasses armor but has an accuracy penalty and a substantial fatigue cost. It can preserve valuable body armor rather than breaking the prize while killing its wearer. The skill is not a guaranteed loot button: the target can still hurt the company, other attacks can damage equipment, and preserving one asset does not make the encounter safe. Qatal Dagger's Deathblow instead rewards particular disabling conditions; these are different combinations, not interchangeable names for the same attack. [S31, S32]

Defensive equipment couples protection to endurance. Helmets and body armor protect different hit locations; shields alter defense and can themselves be broken. Heavy gear narrows the usable fatigue budget, so buying the strongest armor may solve one problem while worsening another. In the developer's 2016 iteration, shield-caused misses were made visibly and audibly identifiable, and surrounding replaced an earlier less legible rule. That feedback work is part of the equipment system's usability, not decoration added after the strategy. [S08, S09]

Acquisition includes battlefield salvage, settlement shopping, special encounters, champions and exploration. Famed equipment gives longer-term searching a concrete target. Its rarity cannot be reduced to a guaranteed upgrade every level. Consumables add situational answers without changing a fighter's permanent build: the developer's consumable redesign moved antidotes and poisons into bags so they could coexist with accessory choices such as a war dog. What can be carried, what must be prepared and what gets spent all matter. [S04, S10, S12]

Beasts & Exploration converts otherwise incidental creature remains into a production chain: choose a dangerous quarry, preserve and carry its trophies, find a taxidermist, pay the fee, and decide where to use the crafted result. The developer contrasted this repeatable system with an earlier occasional tailor event. Armor attachments occupy a limited compatibility slot and can impose weight tradeoffs, so collecting everything is not equivalent to equipping everything simultaneously. [S13]

## R04 — Progression, economy, time and failure

There are three intertwined progression scales: a fighter's attributes/perks, the company's equipment and roster depth, and the company's renown, relationships and ambitions. A veteran's death removes more than an item bundle, but not necessarily every company asset. Conversely, a larger roster increases payroll and provisions before it reliably increases profit. Progress is partly resilience: more replacement options, better knowledge of what not to fight, and enough cash to survive an interrupted plan. [S11, S14, S17, S20]

The company receives crowns through employment, salvage and trade, then spends them on recruitment, wages, provisions, supplies, repairs, treatment and upgrades. Time is therefore not an empty interval between combats. Travel and recovery create expenses without necessarily creating income. The reviewed economy supports a particularly important distinction: a victorious tactical outcome can still be a poor business result. Repeated narrow wins may slowly bankrupt the player rather than produce a dramatic single failure. [S21, S23, S25]

Contract negotiation is not an unrestricted social dialogue simulator. The developer's redesign focused on payment timing and conditions rather than a repeatedly pressed demand-for-more button. Current community documentation also describes a limited request for a higher total; it must not be erased by treating a pre-release design post as immutable. An advance may solve immediate liquidity without increasing the overall payout. Accepting greater exposure because money arrives sooner is a materially different choice from a better-priced contract. [S29, S33]

Ambitions give self-directed company goals explicit rewards and feedback: build reputation, obtain equipment, grow the roster or demonstrate mastery. The community reference records renown and mood rewards and prerequisites that make some choices unavailable later. This is goal selection within a constrained progression system, not an infinitely repeatable checklist. [S20]

A temporary injury can reduce a key skill for several days; a survivor with a lasting injury creates a different employment decision from someone who simply needs rest. For example, Pierced Arm Muscles impairs both attack skills during recovery. Treatment, reserve depth and safer work can make recovery possible, but the calendar continues to impose costs. The ordinary campaign permits player-managed saving; ironman is an explicit alternative rather than the sole legitimate way to play. [S10, S30]

Early play is often about fielding a viable formation and avoiding insolvency. Middle play shifts toward specialization, better equipment, more demanding contracts and reliable replacements. Late play offers major crises and exceptional encounters, but attachment can turn losses into frustration rather than satisfying drama. Retinue is especially relevant here: its documented intent was to give the company durable progress outside the fighters themselves and make rebuilding less demoralizing. [S14]

## R05 — Worked situations across systems

The following are **constructed, rules-based illustrations**, not claims of personally reproduced gameplay. The named review incident in R08 is an attributed actual account. Each example makes a decision chain explicit and includes a limitation.

### 1. Holding a line instead of spending every available attack

**Intention:** keep an inexperienced recruit alive. **Conditions:** the front rank has spears and shields; enemies can approach but the company cannot cover every flank. **Actions:** place stronger defenders where contact is expected, reserve fatigue for control skills, and avoid moving the recruit into multiple enemy zones. **Interaction:** defense, weapon reach, fatigue and enemy movement determine whether the line remains coherent. **Result:** fewer immediate attacks may preserve the formation for the next round. **Next decision:** commit a reserve or retreat before the flank opens. **Limit:** Spearwall is not an impenetrable wall; the relevant mastery changes what happens after a breach. [S02, S18, S19]

### 2. Trying to acquire the armor rather than merely win

**Intention:** improve company gear without paying full shop prices. **Conditions:** a well-armored opponent is isolated and the player has dagger-equipped fighters. **Actions:** control surrounding threats, then use Puncture rather than attacks that destroy the desired armor. **Interaction:** the loot objective changes optimal damage delivery; accuracy and fatigue costs still apply. **Result:** armor preservation becomes plausible, but every extra turn exposes people to harm. **Next decision:** continue the salvage plan or abandon it for a faster kill. **Limit:** equipment value does not justify a veteran's death automatically, and this is not a guarantee of every desired drop. [S31, S32]

### 3. A won battle that prevents the next profitable job

**Intention:** earn enough to upgrade the roster. **Conditions:** the contract pays, but an effective attacker suffers Pierced Arm Muscles. **Actions:** replace that fighter in the active formation, pay upkeep during recovery, and choose less demanding work. **Interaction:** an individual injury reduces company earning capacity while time-based expenses continue. **Result:** nominal revenue overstates progress. **Next decision:** treatment, a cheap temporary recruit, or a longer recovery interval. **Limit:** the example assumes the campaign still has enough reserves to survive; there is no hidden entitlement to a comeback. [S21, S23, S30]

### 4. Managing mood before it becomes desertion

**Intention:** retain a useful but difficult employee. **Conditions:** recent defeats and reserve duty have lowered mood, and the recruit's traits affect reactions. **Actions:** inspect the causes, adjust who participates, and restore sustainable pay and food rather than treating every complaint as random. **Interaction:** trait-conditioned campaign mood influences both retention risk and the state in which a fighter enters battle. **Result:** the company may recover before anyone leaves. **Next decision:** keep investing or dismiss someone whose costs no longer fit. **Limit:** developer documentation describes warnings and probabilities, not a guarantee that one pleasant event cancels all accumulated problems. [S11]

### 5. Hunting for an attachment, not clearing every map icon

**Intention:** craft an answer to a recurring equipment problem. **Conditions:** a desired taxidermist recipe requires particular beast remains, but those beasts are dangerous to the current composition. **Actions:** prepare the appropriate weapons, hunt selectively, carry the trophies back and pay for crafting. **Interaction:** ecology, combat counters, cargo and the money economy become one loop. **Result:** a targeted equipment option is earned through a meaningful expedition. **Next decision:** which armor should receive the attachment? **Limit:** the compatibility slot and possible fatigue tradeoff prevent the reward from being an unconditional improvement. [S03, S13]

### 6. Choosing liquidity over a superficially larger promise

**Intention:** remain solvent while taking a contract that requires travel. **Conditions:** the company is short of immediate cash. **Actions:** negotiate some money in advance and plan work around the remaining supplies. **Interaction:** payment timing matters independently of total pay. **Result:** the player can potentially begin work without first selling useful equipment. **Next decision:** is the mission still worth its exposure? **Limit:** advance payment is not free added value, and a pre-release negotiation description does not establish every current dialogue option. [S29, S33]

### 7. Rebuilding the organization after losing its star

**Intention:** continue a valued campaign after a costly loss. **Conditions:** the strongest fighter is dead, but equipment, money and expansion retinue remain. **Actions:** hire a replacement, revise role assignments and exploit the company's surviving support infrastructure. **Interaction:** persistent organizational assets soften, but do not erase, personal loss. **Result:** continuation can tell a different story from restarting with a new seed. **Next decision:** rebuild conservatively or change the company's specialization. **Limit:** this illustration requires the relevant retinue expansion; the base game should not be credited with all of its recovery tools. [S14]

### 8. Different origin, different definition of a sensible action

**Intention:** replay familiar battles without repeating the same campaign incentives. **Conditions:** choose Oathtakers rather than an ordinary start. **Actions:** adopt an oath and plan around its obligations and benefits. **Interaction:** a chosen restriction changes which opportunities are attractive, while the tactical language remains recognizable. **Result:** variation comes from priorities, not merely more enemies. **Next decision:** which constraint should shape the next phase? **Limit:** this is authored origin content; it does not demonstrate an unrestricted player-programmable moral system. [S06]

## R06 — People, AI, factions and social structure

Mercenaries are individually generated, but their individuality is not synonymous with free-form psychology. Backgrounds, traits, talents, equipment, growth and condition produce recognizable tendencies. Written events can make those traits narratively relevant. The developer's talent and mood accounts are particularly useful: a humble recruit can reveal exceptional potential; a greedy or food-sensitive person can respond differently to company conditions. Neither feature implies that every unit has an independently simulated daily life. [S07, S08, S11]

On the strategic map, employers and hostile groups create opportunities and pressure. Noble houses, settlements and expansion city-states are not simply color-coded quest dispensers: relationships affect the company's options, while large crises change the conflict context. This is still a mercenary perspective, not a diplomacy game with player-written treaties, city government and dynastic succession. [S02, S05, S29]

Combat differentiation uses visible equipment, movement, morale and special enemy behavior. The model includes opponents that do not share ordinary human limitations; the developer explicitly used undead immunity to fatigue as an example. The useful lesson is to inspect the enemy's operating rules, not assume that every threatening creature is a human with a larger health bar. A conventional romance system, companion approval conversations and native multiplayer campaign are absent. Online participation instead happens through shared runs, tactics, mods and accounts of memorable losses. [S09, S27]

## R07 — Art, audio, interface and feel

The art presents fighters as distinctive, readable bust-like pieces rather than fully animated bodies. Portrait, equipment silhouette and facial identity do much of the work of making a roster memorable. The gap between simple representation and imagined personhood is productive: the player supplies continuity from repeated performance. It is also a possible acquisition barrier; some players find the appearance unattractive before understanding the tactics. These are compatible responses, not proof that a particular art style causes success. [S24, S26]

Paul Taaks is credited with art, while Breakdown Epiphanies is credited for music. The historical press kit advertised roughly two hours of orchestral score. Later development added multiple human voice sets and clearer shield-hit sounds. These concrete investments support battle readability and individual recognition even without cinematic animation. None establishes the current complete soundtrack length or the studio's present staffing. [S10, S28, S34]

Interface is a material part of difficulty. The PC review criticizes discovering core formation and zone-of-control information too late. Console reviews additionally identify large tooltips, inventory navigation and cursor-driven target following. The right distinction is between a difficult decision and an interface that hides the decision's premises. The 2025 rare-item sale confirmation is a small but telling response to a costly accidental action. No broad accessibility certification, complete controller parity or measured input-latency result is claimed here. [S15, S21, S24, S25]

## R08 — Narrative: company history rather than a central hero

The premise supplies a social position: these people sell dangerous labor in a hostile world. Contracts and illustrated events create authored situations; recruitment, tactical outcomes, injuries, replacement and retreat create the company's particular history. The story is therefore neither wholly procedural nor a fixed novel with battles between chapters. It depends on recurring ownership of consequences. [S02, S22]

**Attributed actual play account:** Jerry Williams's RPGFan review describes attachment to Rollo through useful service despite an initially unappealing presentation. Rollo's death, another fighter's response, the obituary and eventually accepting a replacement turn ordinary mechanical events into a remembered loss. The important claim is that this happened for that reviewer, not that every player will develop the same bond or that the game authored that exact emotional arc. [S22]

Named authored anchors include Young Anselm and the Oathtaker framework, the Ijirok encounter, and the later Abandoned Village/Grand Diviner chain. Such content supplies texture that a generic random contract generator would not reproduce. It also creates a version boundary: a release review cannot be evidence about a 2025 quest. [S04, S06, S15]

The narrative limitation is equally important. Repeated contract templates and lightly individualized writing can make different mercenaries feel interchangeable. The five reviews disagree about how well the economic/tactical layer compensates. For some readers the absence of a central plot creates freedom; for others it weakens momentum. Treat that as a playstyle difference and a content-production problem, not a defect that can be solved merely by making death more punishing. [S22–S24]

## R09 — Production and iteration

The historical team account identifies a small Hamburg studio, with Jan Taaks handling business/marketing, Paul Taaks art and Christof Schmidt programming, alongside writing and music collaborators. This is evidence about the documented production arrangement, not a verified current headcount. The public development record is unusually valuable because it explains reasons for revisions rather than only announcing features. [S28, S34]

The 2016 talent and surrounding changes addressed role potential and clarity. The perk/injury update then incorporated beta feedback, revised perks, introduced more persistent consequences and changed saves incompatibly during Early Access. The contract redesign explicitly rejected a more elaborate negotiation minigame because of time and roadmap constraints. These are concrete examples of scope management, not a speculative inference from the final interface. [S08, S10, S29]

The later crafting system replaced occasional event-driven access with a controllable service. Retinue was conceived as company-level advancement that would survive losses. The 2025 update demonstrated that adding locations to generated worlds and retaining mod compatibility are separate support obligations. The June 2026 primary Steam notes then added new equipment/enemy content and immediately followed with a regression-fix patch; together with the mirrored notes, they document active memory/mod stability and balance work without exposing proprietary implementation or justifying an invented engine architecture. [S13–S16, S36]

## R10–R11 — Distribution, promotion and commercial context

The documented route combines Early Access iteration, a premium full release, subsequent paid expansions, free content, ports and a continuing mod/player community. The press kit supplies screenshots, trailers and developer-commentary routes; the developer blog exposes work-in-progress decisions and solicits feedback. This is observable distribution and community practice. It is not evidence assigning a percentage of sales to streamers, a particular trailer or an individual influencer. [S01, S10, S34]

The most natural sharing units are a disastrous battle, an unlikely veteran, a distinctive origin run, a seed, a build or an explanation of a difficult opponent. That is **researcher interpretation** of the documented systems and player accounts, not a measured virality funnel. The game can support long-form stories and educational guides because understanding a situation often requires more context than a short spectacle clip. The counterpoint is the entry cost: meaningful stories for veterans do not automatically make the first hour understandable to a new player. [S21–S26]

The current Steam page sampled during research showed 15,545 English reviews with an 89% positive label, and 246 recent reviews with an 85% label. These are a dated storefront review snapshot, not units sold, unique players, retention, revenue or profit. No sufficiently supported public unit-sales or financial total was established in this pass. Publisher-wide sales reports and figures for Overhype's other games must not be reassigned to Battle Brothers. [S01]

The business model observed is purchase of a base game with optional expansions and extras, not a subscription or a consumable-currency economy. Avoid quoting a temporary discount as the enduring price. Long-tail support includes storefront/port maintenance, updates that affect mods, and helping players understand version compatibility. The existence of an update is not itself evidence of commercial profitability or an indefinitely funded service commitment. [S01, S15, S16]

## R12 — Five substantive written reviews

These are five separate firsthand critical accounts, not store blurbs or an aggregate score. PC launch criticism, Switch-port criticism, and PlayStation-port criticism are kept separate. Their historic judgments do not independently establish the September 2026 build's condition.

### Ian Birnbaum — PC Gamer, April 4, 2017; Windows

Birnbaum values the freedom to choose contracts and keep a small company solvent rather than fulfill a world-saving destiny. The review connects tactical losses to repair costs and replacement hiring: a battle can be won while leaving the business no further ahead. Its strongest criticism is discoverability, including learning zone-of-control consequences by failure and finding the pre-battle formation editor late. Equipment comparisons also require too much navigation. This is evidence for a compelling tactical/economic loop with a poor explanation layer, not evidence that unclear rules create the appeal. [S21]

### Jerry Williams — RPGFan, April 16, 2017; Windows

Williams praises high stakes and formation planning while criticizing repetitive text, slow stretches, and inadequate instruction. The review's most useful distinction is between mechanical individuality and authored biography: a mercenary becomes important through reliable service even when his portrait and short background initially seem unappealing. The account of losing Rollo shows attachment developing through use, loss, an obituary, and eventual replacement. The reviewer accepts that emotional cost but does not pretend every player will enjoy it. Use the byline on the original article; some secondary indexing gives a different author. [S22]

### Joel A. DeWitte — Nintendo World Report, March 17, 2021; Switch

DeWitte welcomes the portable tactical format and sees dialogue plus company management as sufficient narrative without a conventional campaign plot. His constructed financial example follows casualties through resupply, cheap replacements, and another contract, illustrating why revenue alone is not progress. He praises consistency between the game's grim premise and its economic demands. Brutality remains an explicit drawback rather than an unqualified recommendation for every audience. This is a notably more positive account of the narrative framing than Williams's launch review, not a reason to erase either judgment. [S23]

### Matt S. — Digitally Downloaded, March 17, 2021; Switch

Matt finds the company-building loop absorbing after a severe onboarding barrier. A viewer had to explain that cheaper equipment was available; large tooltip boxes and cursor-driven management obstruct tactical decisions on Switch. He praises the recognizable soldiers and anxiety about losing veterans, but objects to recurring quest templates and finds the southern expansion less transformative in story and atmosphere than he expected. This separates several causes of dissatisfaction: learning support, controller/interface adaptation, repetitive content, and expansion expectations. His conclusion is that the experience can reward perseverance, not that those obstacles are desirable. [S24]

### Jon Jansen — RPGamer, January 13, 2022; PS4

Jansen values the interplay of positioning, fatigue, equipment and company upkeep. He finds a durable incentive to take another contract and improve the roster, but emphasizes how little the tutorial teaches beyond the basics. The PS4 port's floating cursor makes inventory work and following moving overworld targets awkward. He therefore distinguishes the underlying tactics from the control scheme delivering them. The review discloses a publisher-provided copy and 20–40 hours of play; that is its evidence scope, not a current cross-platform performance benchmark. [S25]

### Helpful Steam sampling and a contrasting recent account

The English **Most Helpful (All Time)** community surface was inspected on September 26, 2026. Three substantive recommended accounts were selected: **Unislash** (June 23, 2020) emphasizes strategic learning and expressive audiovisual/written presentation; **Michael {United Critics}** (December 21, 2019; disclosed free product) values equipment/positioning and attachment but flags initial visual resistance; **bouchard_670** (May 24, 2017) praises replayability while criticizing repeated contracts, tutorial gaps and frustrating randomness. The displayed current play hours are not asserted as publication-time hours. These selected accounts are not a random sample. [S26]

The separate helpful-negative endpoint repeatedly failed. A readable recent store account provides contrast instead: **peakbam**, not recommended, September 23, 2026, objects to repetition, slow combat and losing a run after misjudging an encounter; **Mehrito** and **Ler** instead describe learning through difficult starts as rewarding. The latter two are recent positive comparisons, not evidence that the complaint is invalid. This source is a recent store surface, **not** a successfully retrieved top-helpful negative list. [S35]

### Comparison rather than manufactured consensus

The evidence distinguishes four issues: preference for open-ended company play; the cost of permanent loss; discovering the rules; and platform-specific interface friction. The reviews agree that meaningful tactical/economic decisions exist but differ on whether repetition and sparse authored plot sustain interest. None establishes population percentages, retention, or statistically unfair random numbers. The developer's RNG explanation is an attributed implementation claim, not an independent audit conducted here. [S21–S27]

## R13 — Transferable inspiration and limits

These are research interpretations, not accepted OpenLegend requirements.

**Make identity consequential before demanding affection.** A recruit's distinctive usefulness can become a history of reliance. Background, growth potential and visible contribution reinforce each other. The condition is continuity: repeated encounters must let a player recognize what this person did. The failure mode is replacing personality with an efficient stat spreadsheet. An alternative is a smaller authored cast with stronger explicit relationships.

**Let consequences cross timescales.** A tactical injury can change payroll, available work and the next journey. This creates stories without requiring a bespoke quest for every casualty. It depends on readable connections and recoverable states. Copying only the punishment risks a death spiral; company-level buffers or alternative activities can preserve agency.

**Treat equipment as verbs and objectives.** The desire to capture armor changes combat behavior; weapons provide different answers to formation and defense problems. This works when distinctions are visible and encounters actually reward them. A hundred nearly identical items would add storage burden without the same expressive value.

**Use organization-level continuity to preserve a campaign.** Retinue illustrates assets that survive an individual loss. This can make replacement a new chapter rather than an instruction to reload. The counter-risk is reducing people to expendable components once the organization becomes too insulated.

**Change incentives, not just content quantity.** Origins and oaths let familiar tools create different plans. They require coherent constraints and consequences; arbitrary handicaps can feel like chores. A smaller number of well-supported alternatives may be preferable to a sprawling set whose interactions are poorly explained.

**Do not borrow opaque onboarding as authenticity.** The review record gives substantial reason to separate depth from hidden controls and inadequately explained rules. Better previews, clearer feedback and accessible formation tools can preserve hard decisions while removing accidental confusion. These lessons are about systems and presentation, not permission to copy protected characters, art, music or fictional names.

## R14 — Evidence, source register, viewing routes and preservation

Sources were accessed or searched on September 26–27, 2026. “Read” below means the substantive retrieved text, not a claim to have played the game or watched linked footage. Community wiki rules are player-facing references, not authoritative proprietary-code inspection. Where direct Fandom opens returned 402, the substantial indexed section named below was read; unavailable surrounding sections were not treated as inspected. Historical developer intentions are qualified where later evidence differs.

| Source | Annotation and access boundary |
| --- | --- |
| S01 | [Steam base listing](https://store.steampowered.com/app/365360/Battle_Brothers/). Current primary store metadata, product scope, DLC menu and dated review-count snapshot; not independent criticism or a sales total. |
| S02 | [Developer features](https://battlebrothersgame.com/features/). Full feature body read; historical baseline, not a synchronized list of every later addition. |
| S03 | [Beasts & Exploration](https://store.steampowered.com/app/961930/Battle_Brothers__Beasts__Exploration/). Primary expansion listing and release date; marketing scope, not reception. |
| S04 | [Warriors of the North](https://store.steampowered.com/app/1067690/Battle_Brothers__Warriors_of_the_North/). Primary release scope, origins, northern content and champions. |
| S05 | [Blazing Deserts](https://store.steampowered.com/app/1361280/Battle_Brothers__Blazing_Deserts/). Primary release scope; southern mechanics and fourth crisis distinguished from base game. |
| S06 | [Of Flesh and Faith](https://store.steampowered.com/app/1910050/Battle_Brothers__Of_Flesh_and_Faith/). Primary free-DLC scope and origin framing. |
| S07 | [Dev blog 18: traits and backgrounds](https://battlebrothersgame.com/dev-blog-18-character-traits-and-backgrounds/), 2014. Substantive indexed body read; direct open failed. Historical design intent, not current numeric ranges. |
| S08 | [Dev blog 81: improvements](https://battlebrothersgame.com/dev-blog-81-progress-update-improvements/), 2016. Body read: talent, surrounding and shield-feedback iteration. |
| S09 | [Character stats](https://battlebrothersgame.com/character-stats/), early development. Body read. Some simplified/old descriptions are explicitly not asserted as present rules. |
| S10 | [Perk and injury update](https://battlebrothersgame.com/perk-injury-update-released/), September 2016. Substantive release text read; beta feedback, voices, injuries and save break. |
| S11 | [Dev blog 84: mood and desertion](https://battlebrothersgame.com/dev-blog-84-mood-desertion/), 2016. Body read; trait-conditioned mood and warnings. |
| S12 | [Dev blog 108: consumables](https://battlebrothersgame.com/dev-blog-108-consumables/), October 2018. Retrieved indexed section on bag/accessory changes; not every later consumable effect inspected. |
| S13 | [Dev blog 103: crafting](https://battlebrothersgame.com/dev-blog-103-crafting/), September 2018. Substantive body read; taxidermist chain and attachment constraints. |
| S14 | [Dev blog 127: retinue, part I](https://battlebrothersgame.com/dev-blog-127-the-retinue-part-i/), February 2020. Substantive indexed body read; organizational continuity and noncombat support. |
| S15 | [Update 1.5.1 and new content](https://battlebrothersgame.com/update-1-5-1-new-content/), March 20, 2025. Full article/changelog read; new-campaign and mod-compatibility limits. |
| S16 | [GOG release-note mirror](https://www.gogdb.org/product/1590012242/releasenotes). Developer patch text hosted by a third-party archive; 1.5.2.2/1.5.2.3 and memory-fix sections read, not a live cross-platform verification. |
| S17 | [Level and experience](https://battlebrothers.fandom.com/wiki/Level_and_Experience). Substantive indexed level/veteran section read; direct body blocked. Community mechanics reference. |
| S18 | [Perks](https://battlebrothers.fandom.com/wiki/Perks). Indexed mastery descriptions read; direct open blocked. Newer patch notes supersede conflicting older numeric tables. |
| S19 | [Combat mechanics](https://battlebrothers.fandom.com/wiki/Combat_Mechanics). Indexed fatigue/zone-of-control sections read; direct open blocked. Not an independently reproduced test. |
| S20 | [Ambitions](https://battlebrothers.fandom.com/wiki/Ambitions). Substantial indexed reward/prerequisite and named-ambition sections read. |
| S21 | [Ian Birnbaum, PC Gamer](https://www.pcgamer.com/battle-brothers-review/), April 4, 2017. Full substantive Windows review read. |
| S22 | [Jerry Williams, RPGFan](https://www.rpgfan.com/review/battle-brothers/), April 16, 2017. Full substantive review read; original byline controls over conflicting secondary metadata. |
| S23 | [Joel A. DeWitte, Nintendo World Report](https://www.nintendoworldreport.com/review/56578/battle-brothers-switch-review), March 17, 2021. Full Switch review read; financial example is the reviewer's illustration, not observed telemetry. |
| S24 | [Matt S., Digitally Downloaded](https://www.digitallydownloaded.net/2021/03/review-battle-brothers-nintendo-switch.html), March 17, 2021. Full substantive Switch review read. |
| S25 | [Jon Jansen, RPGamer](https://rpgamer.com/review/battle-brothers-review/), January 13, 2022. Full substantive PS4 review read; publisher-copy and playtime disclosure retained. |
| S26 | [Steam helpful-all-time review surface](https://steamcommunity.com/app/365360/reviews/?browsefilter=toprated). Accessible English recommended bodies and their dates/disclosures inspected. Selected qualitative sample, not prevalence research. |
| S27 | [Developer FAQ](https://battlebrothersgame.com/battle-brothers-faq/). Body read; native scope, mods, DLC saves and attributed RNG explanation. Some support statements are historical. |
| S28 | [Developer team page](https://battlebrothersgame.com/team/). Body read; credited roles and collaborators, not a current staffing census. |
| S29 | [Dev blog 95: contract changes](https://battlebrothersgame.com/dev-blog-95-contract-changes/). Substantive indexed negotiation/production-rationale section read; later game-guide evidence qualifies its simplified account. |
| S30 | [Pierced Arm Muscles](https://battlebrothers.fandom.com/wiki/Pierced_Arm_Muscles). Indexed effect/recovery entry read; example of a temporary injury, not all injury types. |
| S31 | [Rondel Dagger](https://battlebrothers.fandom.com/wiki/Rondel_Dagger). Indexed item/skill entry read; armor-bypass tradeoff. |
| S32 | [Weapons](https://battlebrothers.fandom.com/wiki/Weapons). Indexed dagger/Deathblow sections read; old Riposte costs are not used. |
| S33 | [Community game guide](https://battlebrothers.fandom.com/wiki/Game_Guide). Indexed negotiation section read; its evaluative advice is not adopted as an official rule. |
| S34 | [Developer press kit](https://www.battlebrothersgame.com/Press/presskit/sheet.php?p=battle_brothers). Full text read; historical credits, presentation and trailer/developer-commentary links. |
| S35 | [Accessible recent Steam store surface](https://store.steampowered.com/app/365360/Battle_Brothers/%3Fl%3Dkoreana%26newsId%3D38317). Retrieved player bodies dated September 2026. Store pagination/encoded route is volatile; reviewer names, dates and selection limits are recorded above. |
| S36 | [Steam Community Announcements — Battle Brothers](https://store.steampowered.com/oldnews/?appgroupname=Battle+Brothers+Supporter+Edition&appids=365360&feed=steam_community_announcements&headlines=0&l=english), June–July 2026. Primary publisher/developer update stream inspected during the September 27 audit: v1.5.2.2 content, v1.5.2.3 regression fixes, revert-to-1.5.1.8 mod-compatibility instructions and the July content recap. Used to replace the mirror as the primary current-version source; not a console-parity test. |

### Viewing and reading route

Start with S02 for the basic action loop, S09 plus S19 for the distinction between the intended resource model and documented combat restrictions, and S13/S14 for production and organization-level progression. Read S21 and S24 together to separate tactics from onboarding/input friction. S26 supplies longer player accounts rather than only scores. The press kit S34 links a trailer and developer-commentary video; these are **metadata-only viewing recommendations**, not footage inspected for this pass. Read S15 only after accepting spoilers for the later encounter chain.

### Requirement map and preservation check

R01 → identity/edition table; R02 → action vocabulary and inventory; R03 → equipment/composition; R04 → progression/economy/time; R05 → eight worked situations; R06 → people/AI/social scope; R07 → presentation; R08 → company narrative; R09 → production; R10/R11 → distribution/commercial context; R12 → five reviews plus explicit Steam sampling; R13 → conditional inspiration; R14 → this evidence register, routes and preservation statement.

This is a newly curated subject, not a replacement for one of the original packet's dedicated chapters. The inherited library tree has no earlier Battle Brothers chapter, mechanics study or dossier. Existing essays, chapters, source registers, examples and video routes remain unchanged. The substantive checkpoint's five review accounts are retained here rather than discarded. The global seven-file packet reconciliation remains pending in the canonical ledger; this pass does not certify that separate audit. Internal parent links target the existing roster, requirements and progress owners. No earlier conversation-only material, unseen footage, proprietary implementation, private revenue or untested patch behavior is represented as recovered evidence.

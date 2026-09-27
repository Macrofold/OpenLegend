# Divinity: Original Sin — research dossier

**G56 · Completed research pass, September 26, 2026.** Scope: the June 30, 2014 original, the September 2014 Bear and the Burglar update, and the October 27, 2015 Enhanced Edition. Later platform availability is distinguished from those original release dates. The source checkpoint `4b59a8d` is incorporated below. No firsthand gameplay, footage viewing, audio audition, current multiplayer connection test or executable mod test is claimed.

[Requirements](../research-requirements.md) · [Roster](../research-roster.md) · [Progress](../research-progress.md) · [Deadfire](pillars-of-eternity-ii-deadfire.md) · [Library](../README.md)

**Spoilers:** the opening and systems discussion is comparatively light; companion and late-puzzle examples reveal quest dependencies. The central research question is how a small vocabulary of material actions produces situations that feel less authored than the surrounding story actually is.

## 1. Identity: two people investigating a world they can disturb

Larian's RPG begins with two created Source Hunters investigating a murder in **Cyseal**. Source is initially framed through their profession as dangerous magic to police, but the investigation broadens into the history of Rivellon, the White Witch and a threat to time itself. The pairing matters: neither protagonist is merely a mute inventory for the other. One player can express both views, or a cooperative partner can supply a genuinely separate intention. [S1](#s1) [R3](#r3)

The game uses real-time exploration and turn-based battles with a four-person party. Two created heroes can be joined by companions or hired characters. The supported campaign cooperation is **two players**, not DOS2's four-player campaign. Enhanced Edition adds local dynamic split-screen and controller-oriented play alongside online cooperation. Its platforms include Windows, PS4 and Xbox One, with Mac/Linux support also documented by the current store; historical requirements are not a guarantee of compatibility with every current operating system. [S2](#s2)

**First hours:** choose two builds, learn interaction and combat, enter Cyseal, interview suspects and discover how much the game leaves implicit. **Established play:** alternate investigation, preparation, travel and tactical encounters; learn which ordinary objects can change a difficult situation. **Late play:** follow the larger story through Luculla Forest, Hiberheim, Hunter's Edge and the Phantom Forest, develop high-level combinations and negotiate more prescriptive puzzle/quest gates. The campaign ends; replay, different partners/builds and authored community content are separate return paths, not an endless autonomous world. [R1](#r1) [R2](#r2) [M1](#m1)

**Interpretation:** the most compelling promise is not unlimited freedom. It is permission to try a reasonable action without first locating its special quest button. A combat spell can solve a civilian problem; an inexpensive ingredient can make terrain safe; an animal can supply information. These connections invite the player to regard the setting as something to investigate rather than only a sequence of menus.

## 2. Comprehensive player vocabulary

| Family | Actual actions and resources | Constraint and failure boundary |
| --- | --- | --- |
| Identity and progression | Create two humans, choose starter presets, allocate attributes/abilities/talents, acquire skill books and develop different specialties. | Starting class names are presets rather than permanent classes; specializing still consumes scarce points. Strength, Dexterity, Intelligence, Constitution, Speed and Perception are not DOS2's attribute list. [M1](#m1) [M2](#m2) |
| Combat | Move, attack, cast, use consumables, summon, reposition, save action points, apply statuses and inspect defenses. | Movement competes with attacks for action points. Bodybuilding and Willpower resist categories of conditions; there is no DOS2-style physical/magic armor gate to import. [M2](#m2) |
| Equipment | Acquire, identify, equip, repair, improve, sell or store weapons, armor and accessories. Enhanced adds dual wielding and wands. | Weight, durability, compatibility, money and inventory organization all matter; a loot list is not a simulated manufacturing economy. [M1](#m1) [R6](#r6) |
| Crafting | Combine ingredients, use a furnace/anvil/whetstone/mobile kitchen where required, manufacture arrows/scrolls/potions/food/grenades and improve eligible equipment. | Recipes and skill prerequisites bound the system. Some improvements replace an existing effect instead of stacking infinitely. [M1](#m1) |
| Material interaction | Move and throw objects, break containers, spread liquids, ignite, freeze, conduct electricity and obstruct a route. | Authored object properties determine which verbs work. A movable object is not evidence of a universal rigid-body simulation. [S2](#s2) [R2](#r2) |
| Exploration and utility | Walk, teleport between waypoints/pyramids, dig, read, inspect, reveal hidden objects, unlock doors, use keys and solve spatial puzzles. | Perception, line of sight, object placement and quest flags constrain access. Some story bottlenecks still demand a specific solution. [M3](#m3) [R1](#r1) |
| Stealth and crime | Sneak, pick pockets, break into places, steal or destroy possessions, attack townspeople and handle resulting hostility. | Visibility, attitude and local reactions matter; neither universal impunity nor a complete legal/civic simulation is established. [R3](#r3) [R4](#r4) |
| Conversation and cooperation | Question people, trade, persuade, disagree, express traits, assign AI personality behavior or manually control both voices. | Rock-paper-scissors resolves some disputes; winning that minigame is not a model of the listener's detailed reasoning. [R3](#r3) [R5](#r5) |
| Home and relationships | Return to the Homestead/End of Time, store goods, meet Zixzax, recruit/reconfigure assistance and progress personal quests. | The home expands through story-linked discoveries, not unrestricted player construction or a settlement economy. [M1](#m1) |
| Recovery and difficulty | Heal with appropriate skills/food/potions, revive a dead ally using a suitable resource, retry saves, or accept Honour's harsher save-loss contract. | Death, a failed status attempt and a failed persuasion are distinct losses. Honour must not be summarized as a blanket ban on resurrection. [M4](#m4) |

Fishing, crop cultivation, population needs, dynamic markets, household calendars and general city government are not major independent systems established by the evidence. Cooking does not imply farming. A personal quest does not imply that the companion pursues a fully simulated private life while absent. The world has authored encounters and extensive interaction, not unbounded procedural storytelling.

### Different progression currencies own different decisions

Attributes shape fundamental performance; ability investment supports weapons, defenses, skill families and non-combat work; talents alter capabilities or rules. Raising an ability to the next rank costs that new rank's number of points, so broad dabbling and specialization have different price curves. Bonuses supplied by equipment or traits do not automatically satisfy every talent's required investment. [M2](#m2)

Skill books give the build something to acquire in the world. Knowing a desired spell exists is not the same as having found, afforded and qualified for it. Combat generally pays in action points and cooldown opportunities rather than a universal mana pool. A powerful action can therefore be constrained by position and timing even when the party is well supplied. [M1](#m1)

**Interpretation:** the best explanation is a sequence of questions: do I possess the technique, qualify to use it, have enough opportunity now, and have a useful target? Collapsing all four into a red button obscures which future decision would solve the problem.

## 3. Twelve mechanics worth examining closely

### 1. The environment is a common medium, not a private damage bonus

Fire, water, ice, poison, steam and electricity interact. The publisher's example turns ice into water, water into steam and steam into a stunning static cloud. The important quality is transformation: a new action changes what the next action can do. Enemies and allies can share the resulting danger. [S2](#s2)

**Analysis:** an area effect creates a public fact. Its result should not remain safe for the owner merely because the owner intended an attack. The challenge is readability: players need to distinguish a surface, a cloud above it and a status on a creature rather than calling every colored patch “elemental damage.”

### 2. Action points make walking a tactical expenditure

Moving closer can consume the opportunity needed to attack. Saving resources for a later turn competes with acting immediately, while speed and build choices affect the available rhythm. Disabling or repositioning an opponent can be valuable because it changes their opportunities, not just their health. [M1](#m1) [R5](#r5)

**Analysis:** a battle can be interesting without every action dealing damage. The interface must preview the cost of a path and acknowledge the intended command; an accidental step is not a meaningful tactical choice simply because the rules charge for it.

### 3. Resistance makes a good plan uncertain without making it meaningless

Bodybuilding and Willpower protect against different condition families. A control effect can fail even when the caster chose a plausible target. Conversely, a successful freeze or knockdown can deny an entire enemy opportunity. These defenses differ from the sequel's later armor-first design. [M2](#m2)

**Analysis:** uncertainty can reward fallback planning, but the player should know whether failure resulted from resistance, immunity, range or an invalid surface. A generic “failed” message conceals the rule the player needs to learn.

### 4. Nails turn terrain knowledge into equipment preparation

Combining nails with suitable boots prevents slipping. It is a small recipe with large consequences in icy terrain: a piece of mundane salvage becomes a strategic preparation rather than vendor rubbish. It does not imply immunity to every knockdown or every physical status. [M1](#m1) [M5](#m5)

**Analysis:** ordinary ingredients become memorable when they solve a recognizable problem. Avoid disguising a narrowly useful recipe behind an implausibly broad tooltip; preventing a slip is not the same as surviving an avalanche.

### 5. Teleporter Pyramids separate destination placement from travel

One pyramid transports a user to the other. The player can carry, leave or throw the destination object, making the ability useful for regrouping, return routes and some gaps. Acquisition differs between the original and Enhanced versions. The paired objects remain a concrete dependency rather than an unrestricted “teleport anywhere” command. [M3](#m3)

**Analysis:** placing a future destination is a distinct action with its own risks and affordances. A reusable version should define possession, range/zone restrictions, who travels, obstruction and what happens if another actor moves the anchor.

### 6. Pet Pal buys a new source of information

The talent makes animals conversation partners. It can expose hints, jokes and routes that ordinary dialogue does not provide. The choice consumes a scarce build opportunity, so a non-combat capability can compete with immediate battle strength. Talking to animals is authored access, not evidence of a generated animal society. [M6](#m6) [R2](#r2)

**Analysis:** information is a reward when it changes a plan. An animal hint is more meaningful if its perspective fits what it could have encountered; universal omniscient hints delivered through cute mouths would undermine that gain.

### 7. Zombie reverses the expected meaning of healing

The talent permits poison to heal while ordinary healing becomes harmful. A cooperative partner's habitual rescue can therefore worsen the situation. The effect is a specific rule alteration, not the same as choosing the sequel's undead race. [M6](#m6)

**Analysis:** a shared “heal ally” instruction needs target-aware semantics. Clear identity/state feedback matters more than expecting the player to remember an obscure exception forever. The same idea applies to machines, chemistry or creatures whose maintenance needs differ.

### 8. Lone Wolf exchanges social capacity for personal power

The talent removes a companion slot in exchange for increased personal resources and progression benefits. It changes party composition, not just the damage of an otherwise identical four-character team. Exact bonuses belong to the versioned talent rules rather than a sequel guide. [M6](#m6)

**Analysis:** a specialization is meaningful when it excludes something the player might genuinely want. A larger individual resource bar has a social and tactical cost if it means one fewer specialist, story voice or rescue option.

### 9. Crafting discovers links but does not invent arbitrary objects

A branch, nails, an arrowhead, a potion and a workstation may participate in several defined recipes. Skill, ingredients and location decide success. An elemental weapon improvement can replace an existing element, so accumulation is not always monotonic. [M1](#m1)

**Analysis:** a recipe system can encourage experimentation without pretending to be unrestricted chemistry. It should distinguish missing knowledge, missing inputs and incompatible combinations. A failed attempt should preserve or consume resources according to a visible rule, not the storyteller's convenience.

### 10. Traits turn expressed judgment into a lasting tendency

Paired conversation choices change traits and can carry statistical consequences or later quest eligibility. A player expressing forgiveness, independence or another outlook therefore does more than pick a line for tone. The danger is encouraging players to select the most profitable personality rather than the one they intend to portray. [R5](#r5) [M7](#m7)

**Analysis:** repeated conduct is more persuasive evidence of personality than a single arbitrary binary answer. An adaptation should explain whether a tendency is descriptive, a social reputation or a supernatural rule; the source's stat bonus need not become the default for all people.

### 11. Two protagonists can have conflicting intentions under one controller

In solo play the player can choose both responses, or assign a personality to the other protagonist. In cooperation, disagreement can come from another human. The dispute minigame produces an outcome, but it does not ensure both people feel represented by it. [R3](#r3) [R5](#r5)

**Analysis:** this is a rare invitation to roleplay disagreement rather than only optimize a single will. It also exposes an authority question: who may commit shared resources or determine irreversible story outcomes? Winning a small game is one convention, not the only fair multiplayer contract.

### 12. Attitude makes interaction history affect access

An offended NPC can stop cooperating, and suspicion or crime can transform an exploratory interaction into a fight. Some reactions make local ownership feel real; stale dialogue and rigid quest dependencies show the limits of that reactivity. [R3](#r3) [R4](#r4)

**Analysis:** local memory works best when the person knows the relevant act happened. General party hostility can simplify play but should not be imported as proof that every resident has observed every theft.

## 4. Concrete situations: composition and its limits

The following distinguish **constructed rule illustrations** from **reviewer-observed examples**. None is a claim of the researcher's own play.

**A. A battle spell becomes emergency assistance.** Thursten observes Cyseal's burning ship: a party with Rain can extinguish it without first selecting a dedicated rescue action. The intent is civilian aid; the prerequisite is a suitable capability; the action changes the fire; the town recognizes the result. The next choice is whether to intervene rather than simply look for a dialogue reward. This supports shared applicability of a verb, not universal fluid/fire simulation. [R2](#r2)

**B. The new conductor was created by the previous attack.** Thursten's lightning hits a blood-covered battlefield and harms his own group. The intended target is an enemy; the overlooked condition is a shared conductive area; the electrical action reaches more than the selected body. The player must reposition or change tools next turn. The surprise is causally intelligible precisely because the harmful rule is not reserved for enemies. [R2](#r2)

**C. Prepare the party instead of removing the obstacle.** A party anticipates ice, gathers nails, modifies eligible boots and crosses without slipping. The cold region remains dangerous; one specific mobility risk has been addressed. The next decision becomes which characters need the limited preparation first. This is an illustrative use of M1/M5, not an invented personal expedition. [M1](#m1) [M5](#m5)

**D. Place the exit before committing.** A documented player achievement solution throws a pyramid onto Nick's ship and uses its partner to cross the gap. The goal is access; the requirement is a reachable landing place for the object; travel follows object placement. The next decision is to recover or preserve the anchor. This does not prove every map barrier can be bypassed or that throwing a pyramid transfers ownership of the ship. [M8](#m8)

**E. Benevolent intent chooses the wrong substance.** A constructed Zombie example has a teammate apply ordinary healing to a poisoned-looking ally. The underlying talent reverses the expected benefit; the intervention damages instead of repairs. The appropriate next action is to inspect the target and use compatible recovery. Intent, action validity and outcome are separate: a reasonable sentence does not override biological rules. [M6](#m6)

**F. A thief's usual reward loop produces disproportionate regret.** VanOrd digs a grave in front of a grieving villager; she attacks, dies, and the loot is a trivial bone. The key interaction is not the value of the item but the collision between habitual looting, witnessed desecration and a fragile civilian. His decision not to reload creates the lasting experience. Do not universalize one authored reaction into a complete mourning simulation. [R3](#r3)

**G. A player's ethics conflict with a quest's admitted route.** A helpful Steam co-op review reports getting stuck while trying to solve the councillor investigation without stealing or breaking in. The attempted role is coherent, but the account finds no supported route satisfying it. The player must change conduct, find an overlooked route or accept the blockage. This is a reported frustration, not proof that a complete exhaustive search established only one path. [P1](#p1)

**H. A relationship ending depends on conduct accumulated elsewhere.** The Madora guide links a forgiving resolution to earlier conversations and the protagonists' Forgiving traits. The immediate intention is mercy; the qualifying state was built before the final scene; choosing only a compassionate last line may be insufficient. The next decision is how to interpret a history-dependent outcome. Exact guide recommendations such as “five or six” conversations are not elevated into a verified universal threshold. [M7](#m7)

**I. More screen independence can reduce visual comfort.** Enhanced dynamically splits the local view when partners separate. Meyerink and his partner instead lock it split because the transition is distracting. The intention is independent movement; the default camera solves shared framing; its transition creates a different friction. A stable alternative preserves the activity without insisting that the more elaborate camera behavior is always preferable. [R6](#r6)

## 5. Characters, place, narrative and AI boundaries

**Madora** brings a Source Hunter's commitments and a personal history that can challenge mercy. **Jahan**, encountered in Cyseal's library, supplies magical expertise and a demon-related obligation. **Bairdotr** searches for a missing druid and comes from a life outside ordinary city conventions. **Wolgraff** cannot speak, communicates differently and wants to recover what was taken from him. Named companions have personal quests and can leave under particular conflicts; hirelings fill mechanical roles without promising identical narrative depth. [M9](#m9)

Bairdotr and Wolgraff were added by **The Bear and the Burglar** in September 2014, not both present in every initial June review build. The update also improved listening to a cooperative partner's conversations. Those additions address different shortcomings: more distinct people and better access to what another participant is learning. Enhanced incorporates a more developed package; it is not simply the original with larger textures. [S3](#s3)

The sequence from a murder in an inhabited port to the End of Time creates a deliberate scale change. Arhu, Zixzax, the White Witch and the Hunters' deeper identity connect immediate investigation to a mythic structure. Humor—talking animals, eccentric undead, conspicuous wordplay—keeps the world approachable, but can also reduce a player's sense of historical gravity. The critics disagree about that tradeoff rather than identifying one universally appropriate tone. [R1](#r1) [R2](#r2) [R3](#r3)

The game has tactical enemy behavior, authored conversation policies and contextual reactions. The evidence does not establish general autonomous cognition, a comprehensive simulation of every resident's schedule or unlimited improvisational dialogue. AI personality settings choose within authored conversations. A companion's dramatic conviction is written and gated; it should not be attributed to a self-generated private moral theory. This boundary does not diminish the player's actual experience of disagreement.

## 6. Presentation and the cost of making everything noticeable

An elevated, rotatable view helps inspect terrain and coordinate several bodies. Bright environmental contrasts make fire, snow, poison and inhabited places visually distinct. Readability nevertheless becomes difficult when surfaces overlap, small objects matter and a target's animation moves under the pointer. More interactive detail increases the need for reliable selection and accepted-command feedback. [R4](#r4) [R6](#r6)

Enhanced's radial menus and controller support re-express PC-style interaction rather than merely emulating a mouse. Dynamic split-screen is useful but not universally preferred. Full voiceovers make conversations more accessible to some listeners, while repeated environmental barks and uneven performances irritate others. The soundtrack by **Kirill Pokrovsky** is consistently valued in the inspected assessments; this dossier does not claim a fresh listening analysis or invent production instrumentation beyond the sources. [R5](#r5) [R6](#r6)

**Interpretation:** information should be available without being incessantly announced. A character saying they are wet once can establish embodiment; repeating it during every traversal can compete with the information that actually changed. The same distinction applies to status banners, quest notifications and generative narration.

For a smaller top-down project, the portable investment is coherent surface layering, distinct object affordances, readable costs and a way to review missed speech. Photorealistic faces or a cinematic camera are not prerequisites. Conversely, none of these observations is a measured performance budget or proof that a dense shared simulation is cheap.

## 7. Versions, production, distribution and economics

The Kickstarter campaign ran **March 27–April 26, 2013**, recording **19,541 backers and $944,282 pledged against a $400,000 goal**. Those are pledge figures, not total development costs, retail units or net profit. The pitch presented an old-school RPG with new interactions; its campaign and updates gave prospective players both a product promise and an ongoing development relationship. [S4](#s4)

Swen Vincke's September 2014 retrospective, relayed by contemporaneous reporting, describes major content cuts, community feedback, financial pressure and exhausted staff near release. His explanation credits content quality and iteration; it is an attributed creator account, not independent proof that crunch was necessary or that every delay improved the game. The original linked blog failed retrieval, so the report is not disguised as a newly read primary post. [S5](#s5)

The same account reports **over 500,000 units by September 12, 2014** and having reached profitability. That is a dated founder statement, not an audited current lifetime total or a title-level financial model. Private investors shared proceeds; multiplying the unit milestone by a storefront price would not produce the studio's profit. The early aspiration to avoid another Kickstarter was provisional and is not treated as what the studio ultimately did for the sequel. [S5](#s5)

**Enhanced Edition** is a substantial 2015 revision: revised story/ending, skills, equipment styles, voice, controllers, local cooperation and differentiated difficulties. Tactician changes encounters rather than merely inflating one statistic; Honour adds a stricter save contract. Contemporary reviews document a free upgrade for existing PC owners. The current publisher page continues to advertise the enhanced package, but a storefront's surviving system requirements do not certify every present-day machine or console network path. [S2](#s2) [R5](#r5) [R6](#r6)

The business model is premium purchase with editions/bundles and ancillary soundtrack/content, not a recurring competitive-service economy. The game also shipped a content-authoring/editor route; community modifications can change party size, movement or companion statistics. Those modifications are not native feature claims. A March 2026 companion-respec mod explicitly changes starting data and requires a new game; its existence illustrates ongoing community work, not an official 2026 balance patch. [S6](#s6) [M10](#m10)

Documented promotional routes include Kickstarter videos/updates, the Enhanced Gamescom overview, free companion content and storefront demonstrations of elemental composition. Cooperative mishaps and unusual solutions are plausible sharing units because another player can understand a short causal story. No referral/conversion, streamer-impact or demographic measurement was recovered; “shareable” is an interpretation, not proof of beneficial virality.

## 8. Independent reception: six reviews, not one averaged verdict

All six substantive written bodies were inspected across this pass. The earlier checkpoint's incomplete byline/middle-section access has been resolved. Reviews concern different editions and platforms; their disagreements are retained.

**Kyle E. Miller — RPGFan, July 30, 2014, PC.** Miller values the exploratory and interactive first half, then finds the later game repetitive, easier and less interesting narratively. Cooperative independence works; the dispute minigame and tone work less well for him. This early critique must not be applied unchanged to Enhanced's later balancing. [R1](#r1)

**Chris Thursten — PC Gamer, July 11, 2014.** Thursten values readable shared rules, varied combat and permission to use magic beyond combat. He finds the opening slow and obscure, inventory cumbersome and the setting less emotionally memorable than the best comparable RPG worlds. His causal anecdotes are not blanket certification that every object/quest composes correctly. [R2](#r2)

**Kevin VanOrd — GameSpot, July 19, 2014.** VanOrd finds exploration, elemental battle and small moral consequences unusually rewarding. He likes the two-voice roleplay and tension of rock-paper-scissors, unlike Miller. He also notices stale dialogue, cumbersome inventory and an opening that drags. [R3](#r3)

**Stephen Tailby — Push Square, October 27, 2015, PS4.** Tailby likes bright environments, cooperative freedom, environmental tactics and social reactions, including an offended NPC refusing useful dialogue. His crowded-but-workable interface assessment differs from more frustrated accounts. It is a console Enhanced review, not the original computer build. [R4](#r4)

**Dom Leighton — TheSixthAxis, October 27, 2015, PS4.** Leighton praises combat, creation and the musical identity. Controller learning, measured movement and occasional performance issues slow the experience, and voice quality is uneven. His positive view of translating a complex RPG to console does not mean the translation removes all friction. [R5](#r5)

**Stephen Meyerink — RPGFan, January 14, 2016, PS4.** Meyerink finds Enhanced's skill and later-combat balance improved, yet still encounters opaque quests, missed/incorrect UI state and repetitive speech. His hundreds of hours coexist with serious criticism. He and his partner prefer locked split-screen to the dynamic default. This is useful evidence that enduring engagement does not imply approval of every interaction. [R6](#r6)

### Direct player evidence and access

The English **Most Helpful (All Time)** Steam surface was read on September 26, 2026. **blizzardmetal, June 3, 2017**, describes initial rejection followed by enjoyment after the rules became intelligible. **lindell, December 4, 2015**, praises tactics but dislikes slow animation, barks and poor guidance. **laurelj, November 18, 2020**, enjoys challenging fights while relying on a walkthrough and disliking inventory management. A further cooperative account reports moral-role and synchronization frustrations; its incorrect/unverified Honour-resurrection claim is not adopted. These are selected historical testimonies, not a representative survey; current displayed hours are not publication-time hours. [P1](#p1)

The inspected Metacritic player text includes **pale81, July 21, 2025**, criticizing late puzzle gates despite enjoying the first half. This provides a negative viewpoint without treating aggregate scores as explanation. The underlying design disagreement is whether obscurity feels like discovery, inconvenience or an obstacle to a coherent role. It needs task-specific observation, not a claim that one audience simply lacks patience. [P2](#p2)

## 9. Proposed OpenLegend experiments and hard boundaries

**One verb, two contexts.** Test a water-producing action against both combat fire and an ordinary burning object. Keep material, scope, cost and observation rules the same; let the social interpretation differ. A successful demonstration should also include an invalid target and unintended collateral effect, not only the celebratory solution.

**An ordinary ingredient with a precise consequence.** A nails-and-boots-sized experiment should remove one clearly identified terrain failure, not grant generic invulnerability. Acquisition, ownership, crafting skill and equipped state need to agree. The player should understand why the recipe is useful before reading an exhaustive list.

**Two people with different commitments.** Let two actors disagree about one bounded decision and make the authority convention explicit. A cooperative story needs rules for shared property, irreversible choices and who can initiate violence; voice quality alone will not prevent griefing or accidental coercion.

**Capability-bearing anchors.** A paired transport tool should state who can move it, what happens across zones, whether passengers consent and what is left behind. Rich emergent use comes from consistent answers, not from interpreting every clever sentence as immediate permission to teleport.

**Observation before reputation.** A witnessed desecration can cause a local reaction. An unseen act should require evidence, a report or inference before another person knows it. The source game's simplified hostility can inspire local consequence without becoming a license for global omniscience.

**Information without chatter.** Distinguish a changed state from its continuing presence. Narration and captions should help identify a new danger, not repeat the same wet/fire line whenever a person takes a step.

These are proposed research experiments, not accepted engine requirements or current implementation claims. The source's global campaign assumptions, turn scheduling, authored trait gates and dispute minigame should not be copied unchanged into an autonomous multiplayer society.

## 10. Study routes, sources and completion map

### Reading/play route

In an initial study, compare the two protagonists' intended roles with the first town's actual permitted solutions. Next, inspect one surface conversion, one ordinary recipe and one interrupted plan; record what the interface explained. Later compare a dialogue disagreement with a real cooperative disagreement about shared resources. Finally contrast a flexible local encounter with a prescribed late puzzle. This is a proposed study schedule, not reported playtime or a guarantee of completing the campaign in a set number of hours.

### Annotated viewing routes — footage not watched

| Route | Question to investigate | Access boundary |
| --- | --- | --- |
| [Kickstarter campaign](https://www.kickstarter.com/projects/larianstudios/divinity-original-sin) | How were tradition, cooperative identity and new interaction sold together? | Campaign metadata/text read; pitch video not watched. |
| [Gamescom 2015 overview via TheSixthAxis](https://www.thesixthaxis.com/2015/10/27/divinity-original-sin-enhanced-edition-review/) | Which Enhanced changes can a prospective console player actually see? | Verified embedded-video title/link; direct video retrieval failed. |
| [Bear and the Burglar announcement/video route](https://www.mmorpg.com/news/the-bear-and-the-burglar-dlc-released-2000084926) | Compare added personalities with improvements to hearing a partner's dialogue. | Publisher announcement reproduced by reporting; video not viewed. |
| [Publisher Steam media](https://store.steampowered.com/app/373420/Divinity_Original_Sin__Enhanced_Edition/) | Follow a surface-conversion chain and distinguish feature pitch from actual failure cases. | Product text read; no scene/timestamp invented. |
| [Game Informer DLC article and Test Chamber route](https://gameinformer.com/b/news/archive/2014/09/15/divinity-original-sin-gets-free-dlc) | Find longer-form play to compare travel/dialogue time with combat demonstrations. | Landing-page route only, not an asserted watched episode. |

### Annotated evidence register

All retrievals September 26, 2026. Community guides document observed rules; they are not evidence of proprietary engine structure. Constructed examples above preserve those limits.

<a id="s1"></a>**S1 — Larian current original-game page.** [Original Sin](https://divinity.com/original-sin). Official premise and 2014 identity; the former domain redirects here, and its Enhanced navigation resolves to the same consolidated page.

<a id="s2"></a>**S2 — Larian Steam product description.** [Enhanced Edition](https://store.steampowered.com/app/373420/Divinity_Original_Sin__Enhanced_Edition/). Full relevant feature/language/platform sections read; broad marketing phrases are not treated literally as every imaginable interaction.

<a id="s3"></a>**S3 — September 2014 update records.** [Game Informer, Daniel Tack, September 15](https://gameinformer.com/b/news/archive/2014/09/15/divinity-original-sin-gets-free-dlc), [MMORPG, Suzie Ford, September 16](https://www.mmorpg.com/news/the-bear-and-the-burglar-dlc-released-2000084926), and [KitGuru dialogue-interface detail](https://www.kitguru.net/gaming/matthew-wilson/divinity-original-sin-gets-free-dlc/). Contemporary reporting/reproduced announcement; new-game availability and dialogue-listening change.

<a id="s4"></a>**S4 — Larian Kickstarter.** [Campaign](https://www.kickstarter.com/projects/larianstudios/divinity-original-sin). Primary dated funding totals read. Pledges are not the complete budget.

<a id="s5"></a>**S5 — Julian Benson, PCGamesN, September 12, 2014.** [Retrospective and sales account](https://www.pcgamesn.com/divinity-original-sin/divinity-original-sin-sold-500000-copies-so-far-larian-hope-not-need-kickstarter-again). Full report read, attributing claims to Vincke. Original linked `lar.net` post failed retrieval; private finances are not independently audited.

<a id="s6"></a>**S6 — Historical product reference.** [Original Sin](https://en.wikipedia.org/wiki/Divinity%3A_Original_Sin). Used narrowly for the shipped editor and original release chronology, not as a review-body substitute or an exact current compatibility matrix.

<a id="m1"></a>**M1 — TheThirdRace, GameFAQs.** [Enhanced Edition character/party guide](https://gamefaqs.gamespot.com/pc/170514-divinity-original-sin-enhanced-edition/faqs/72764). Relevant indexed/visible mechanics, recipes, class flexibility and party-management sections inspected. [Neoseeker mirror](https://www.neoseeker.com/divinity-original-sin-enhanced-edition/faqs/1729514-divinity-osee-character.html) is the same work, not another independent author.

<a id="m2"></a>**M2 — Community reference.** [Attributes and abilities](https://divinity.fandom.com/wiki/Attributes_and_Abilities_%28Original_Sin%29). Version-separated ability tables inspected; missing Enhanced attribute prose is not silently filled from DOS2.

<a id="m3"></a>**M3 — Community quest record.** [The Teleporter Pyramids](https://divinity.fandom.com/wiki/The_Teleporter_Pyramids). Original/Enhanced acquisition distinction and paired-tool premise. No every-zone compatibility guarantee.

<a id="m4"></a>**M4 — PlayStationTrophies guide.** [Enhanced Edition](https://www.playstationtrophies.org/game/divinity-original-sin/guide/). Honour and late-puzzle conditions; its backup/reload recommendations are not instructions to modify this research's own evidence.

<a id="m5"></a>**M5 — TrueAchievements guide.** [Luculla Forest and Hiberheim](https://www.trueachievements.com/game/Divinity-Original-Sin-Enhanced-Edition/walkthrough/5). Explicit nails/boots preparation; combat optimization preferences remain the guide author's.

<a id="m6"></a>**M6 — Version-specific community talent table.** [Talents](https://dosee.fandom.com/wiki/Talent). Pet Pal, Zombie, Lone Wolf and other capability boundaries; no full table copied.

<a id="m7"></a>**M7 — PlayStationTrophies guide discussion.** [Trait and companion prerequisites](https://www.playstationtrophies.org/forum/topic/263953-divinity-original-sin-enhanced-edition-trophy-guide-and-road-map/). First-person route advice; variable conversation recommendations not promoted into exact validated thresholds.

<a id="m8"></a>**M8 — TrueAchievements player solution.** [Hey Hey Do the Zombie Stomp](https://www.trueachievements.com/a209012/hey-hey-do-the-zombie-stomp-achievement). Concrete thrown-pyramid example; not personally reproduced.

<a id="m9"></a>**M9 — Community companion record.** [Original Sin companions](https://divinity.fandom.com/wiki/Original_Sin_Companions). Named people and individual quest premises; launch roster qualified by S3.

<a id="m10"></a>**M10 — Denionic, March 29, 2026.** [Companion respec mod](https://www.nexusmods.com/divinityoriginalsinenhancededition/mods/55). Creator's stated changes/new-game limitation only; not installed, security-tested or treated as an official update.

<a id="r1"></a>**R1 — Kyle E. Miller, RPGFan, July 30, 2014.** [Original review](https://www.rpgfan.com/review/divinity-original-sin/). Substantive full body read, original PC build.

<a id="r2"></a>**R2 — Chris Thursten, PC Gamer, July 11, 2014.** [Original review](https://www.pcgamer.com/divinity-original-sin-review/). Body read across opening/main/concluding sections; two causal examples are explicitly his observations.

<a id="r3"></a>**R3 — Kevin VanOrd, GameSpot, July 19, 2014.** [Original review](https://www.gamespot.com/reviews/divinity-original-sin-review/1900-6415819/). Full body read; local consequence does not imply perfect global reactivity.

<a id="r4"></a>**R4 — Stephen Tailby, Push Square, October 27, 2015.** [Enhanced PS4 review](https://www.pushsquare.com/reviews/ps4/divinity_original_sin_-_enhanced_edition). Full substantive body read.

<a id="r5"></a>**R5 — Dom Leighton, TheSixthAxis, October 27, 2015.** [Enhanced PS4 review](https://www.thesixthaxis.com/2015/10/27/divinity-original-sin-enhanced-edition-review/). Full body/byline verified; “Dom” is the displayed byline, correcting the checkpoint's expanded name.

<a id="r6"></a>**R6 — Stephen Meyerink, RPGFan, January 14, 2016.** [Enhanced PS4 review](https://www.rpgfan.com/review/divinity-original-sin-enhanced-edition/). Remaining middle subsequently read; version and camera comparison retained.

<a id="p1"></a>**P1 — Steam helpful reviews.** [English, all time](https://steamcommunity.com/app/373420/reviews/?browsefilter=toprated). Actual displayed bodies read; named/date-qualified sample, not population statistics. Player technical/rule claims are not automatically factual authority.

<a id="p2"></a>**P2 — Metacritic player text.** [Enhanced Edition](https://www.metacritic.com/game/divinity-original-sin-enhanced-edition/). The pale81 account is qualitative reception, not a professional review or evidence of every possible quest solution.

### R01–R14 and preservation gate

R01 identity/version/modes: section 1 and section 7. R02 actual verbs and conditions: section 2. R03 items/acquisition/composition: sections 2–4. R04 progression/resources/time/recovery: sections 1–3. R05 complete situations: section 4. R06 people/AI/social/co-op: sections 3–5. R07 presentation/audio/interface: section 6. R08 story/places/authored limits: sections 1 and 5. R09 production: section 7 with access-qualified creator account. R10 distribution/promotion/community: sections 7 and 10. R11 properly defined economics: section 7. R12 six substantive critics and actual helpful/direct player evidence: section 8. R13 proposed adaptation and limits: section 9. R14 sources/navigation/preservation: this section.

No target dossier or same-named original `games/` chapter existed at the checked branch paths. This is an independent post-packet addition, not an overwrite. Every substantive checkpoint finding is incorporated, corrected where necessary and source-qualified. Existing chapters, mechanics and packet provenance remain untouched. Textual coverage and anchor review were performed; no repository-wide automated link crawl, actual game test or completion of the entire 130-subject roster is claimed.

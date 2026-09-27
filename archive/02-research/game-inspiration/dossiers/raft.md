# G141 — Raft

**Status: complete full-pass research dossier.** Research date: September 27, 2026. [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md). Research only, not an OpenLegend implementation proposal.

Raft is most useful as a study of **turning the player's home into the vehicle, progression surface, shared social space, and visible record of a run**. The same object begins as four fragile foundations and can become a multi-deck powered vessel with collection nets, farms, livestock, engines, storage, kitchens, navigation, decoration and specialized workspaces. The game's strongest loop is not simply survival at sea; it is repeatedly converting passing opportunity into a better moving home.

## R01 — identity, scope, versions and player promise

Redbeet Interactive developed Raft and Axolot Games publishes it. The free prototype grew from a three-student university project before the commercial game entered Steam Early Access on **May 23, 2018**. Version 1.0, **The Final Chapter**, released on **June 20, 2022**, ending Early Access and completing the authored story. The current Steam store supports single-player and online co-op. Redbeet later released native **PlayStation 5 and Xbox Series X|S** versions on **December 4, 2024** and developed cross-platform play, controller support and in-game voice chat; the PC cross-play work spent time in a beta branch before Redbeet moved **Raft 1.1** to the default PC branch in March 2026. These platform/network additions are not a new story chapter. [Steam store](https://store.steampowered.com/app/648800/Raft/) · [1.0 announcement](https://store.steampowered.com/news/posts/?appgroupname=Raft&appids=648800&enddate=1655819276&feed=steam_community_announcements) · [console/cross-play announcement stream](https://steamcommunity.com/app/648800/announcements/) · [Xbox listing](https://www.xbox.com/en-GB/games/store/raft/9P7RBKDTN18T).

The player's promise is immediately legible: wake on a tiny drifting platform with a plastic hook, catch debris, avoid starvation/dehydration and the shark, then turn that wreckage into a self-sufficient home capable of reaching the remains of civilization. The first session is dominated by **attention scarcity**—hooking planks/plastic/leaves while making water, food, tools and repairs. Established play shifts toward **automation, navigation, planned expeditions and home design**: collection nets catch debris, better purification/cooking reduces maintenance, engines and a steering wheel make travel intentional, and story destinations supply blueprints and progression.

Difficulty changes the pressure. Peaceful/Easy can substantially reduce or remove some punitive survival/death consequences; higher difficulties intensify damage and recovery. Creative mode exists for construction without ordinary survival progression. A claim about "Raft" should therefore say whether it describes the normal survival arc, another difficulty, or Creative.

## R02 — player actions and major mechanics

### Hooking, gathering and the moving resource field

The signature early action is throwing a rope-and-hook into the ocean, timing the cast so the hook intersects floating planks, plastic, palm leaves and barrels/crates. The important systemic twist is that the resource field moves relative to the raft. Missing an object often means choosing whether to spend time/paddle durability chasing it or accept the loss.

Later **collection nets** convert part of this manual attention loop into passive throughput. Their placement around the raft's footprint becomes an optimization problem: a broader intercept line catches more debris, but every foundation costs material and increases the home the shark can attack until reinforced.

### Hunger, thirst, health and oxygen

Fresh water must be produced from seawater. Early purifiers require manual filling/collection; advanced electric infrastructure reduces friction. Food comes from fishing, crops, hunted animals and cooked recipes. Hunger and thirst initially fall quickly enough that several reviewers describe them as the dominant early task. Better meals and smoothies can provide bonus bars and temporary buffs.

Swimming introduces an oxygen meter. Diving around islands is necessary for materials such as sand, clay, scrap, copper and metal ore, so underwater extraction competes directly with shark danger, oxygen and the need to keep track of the drifting raft.

### Building a base that is also a vehicle

The building hammer extends foundations and adds floors, walls, roofs, pillars, stairs, rails and decorative pieces. Placement is raft-bound: the player is not founding permanent land bases across the world. That constraint concentrates almost all long-term investment into one persistent object.

The raft can evolve from sail/paddle control to powered navigation. An **engine** plus **steering wheel** changes the player's relationship with the world from largely accepting wind/current to deliberately reaching coordinates and fighting unfavorable wind. The receiver/antenna system provides bearings to story locations. Anchors stop the raft for resource dives and exploration; later equipment makes anchoring and engine management less manual.

### Research and blueprint gating

The **Research Table** consumes examples of ordinary materials to register them and unlock recipes whose ingredient prerequisites have all been researched. Story blueprints operate differently in the final game: finding a blueprint unlocks its associated knowledge rather than requiring the player to risk losing the blueprint before researching it. [Research Table reference](https://raft.fandom.com/wiki/Research_Table).

This creates two complementary progression channels:
1. **material comprehension** — bring new resource classes home and research them;
2. **world/story access** — reach authored locations that award specific higher-tier capabilities.

### Farming, livestock, cooking and production

Crop plots turn seeds and fresh water into renewable food/flowers. Seagulls create defensive maintenance unless crops are protected. Larger islands support capturable livestock; net-launcher capture enables goats, llamas and cluckers that provide milk, wool and eggs when fed/maintained. Bees/honey and biofuel create further production loops.

Cooking pots and the 1.0 **Juicer** turn ingredient combinations into higher-value food/drink. The Final Chapter added six buff categories, recipes at Trading Posts and advanced electric kitchen/production equipment. [1.0 notes](https://steamdb.info/patchnotes/8972572/).

### Combat, hunting and threats

Combat is deliberately simple rather than a deep action system. Spears, bows/arrows and eventually higher-tier melee/equipment defend against the recurring shark and destination/island animals. Story destinations introduced bespoke encounters and bosses including the Rhino Shark. Armor and better weapons increase margin, but several reviews criticize animation/feel or the shark becoming routine rather than frightening.

### Scavenging, underwater extraction and environmental traversal

Islands break the "moving home" rhythm with short expeditions:
- chop trees and harvest plants;
- dig/scoop reef materials underwater;
- hunt or avoid boars, bears and screechers;
- follow caves, ladders, ziplines and environmental puzzles;
- use metal detector clues for buried treasure;
- collect story notes and location-specific keys/parts.

Ziplines and the electric zipline tool become notable traversal devices at later authored locations.

### Trading as a material sink

The Final Chapter added **Trading Posts** to large islands. A Recycler converts surplus materials into **Trash Cubes**. Rare fish bought/caught through bait tiers can be sold for **Trade Coins**; cubes and coins buy recipes, bait, resources, cosmetics and utility items. This gives old stockpiles a use and adds a light loop of waste → cube → bait/fish → coin → specialized goods. [1.0 notes](https://steamdb.info/patchnotes/8972572/).

### Useful absences

Raft has no character class tree, conventional XP/level progression or RPG attribute allocation. Capability is primarily **equipment, recipes, blueprints, infrastructure and player knowledge**. There is no stealth system of consequence, political-faction reputation campaign, romance system, settlement population simulation or recruitable AI crew. Playable characters unlocked through story locations are avatar identities/outfits, not mechanically differentiated classes.

## R03 — items, resources, entities and composition

### Core resource families

- **Drift resources:** plank, plastic, palm leaf/rope and container loot sustain the early raft.
- **Island/reef resources:** stone, sand, clay, scrap, metal/copper ore, dirt and specialty materials drive higher tiers.
- **Processed materials:** wet/dry brick, ingots, glass, vine goo, circuit boards, bolts/hinges and titanium gate advanced infrastructure.
- **Food/ecology:** seeds, crops, fish, animal products, honey and recipe ingredients.
- **Energy:** planks feed early machines; batteries power electronics; biofuel, tanks/pipes, advanced batteries and wind generation reduce manual energy friction.
- **Currency-like goods:** Trash Cubes and Trade Coins support the Trading Post economy.

Items have durability across many tools/weapons, making replacement a persistent material sink. Reviewers and Steam users disagree sharply about whether that sustains survival pressure or merely creates repetitive re-crafting.

### High-leverage equipment

Several unlocks qualitatively alter play rather than just adding numbers:

- **Collection Net:** converts passing debris from active hook casts to passive capture.
- **Advanced Purifier / water systems:** reduce repeated hand-processing of drinking water.
- **Receiver + three Antennas:** turns exploration from undirected drifting into coordinate-based story navigation. The receiver consumes battery power while active and requires spatially valid antenna placement. [Receiver reference](https://raft.fandom.com/wiki/Receiver).
- **Engine + Steering Wheel:** allows powered direction, including against wind; the engine is unlocked through the Vasagatan blueprint. [Engine reference](https://raft.fandom.com/wiki/Engine).
- **Recycler:** turns surplus into Trash Cubes, coupling storage cleanup to trading.
- **Backpacks:** expand carried inventory but arrive relatively late; some players criticize late convenience unlock timing.
- **Titanium equipment/electric appliances:** late-game efficiency and durability improvements.

### The raft is a composed item

More than any individual tool, the important composed object is the raft itself:
- foundation geometry controls usable area and debris interception;
- reinforcement changes shark vulnerability;
- vertical floors separate noisy/large machines from living/decorative areas;
- engine count/power must support the raft's scale;
- pipes/wires/tanks and machine placement create production layouts;
- livestock needs protected space and grass;
- sails, anchors, receiver equipment and helm create a navigation deck;
- storage position changes how much time players spend shuttling between tasks.

The home therefore stores both **functional capability** and **personal history**. A rebuilt layout can feel like losing an earlier phase of the run even when materials are preserved.

## R04 — progression, economy, time, failure and return loop

### Early → middle → late play

**Early:** manually hook debris; build purifier/grill/spear/crop plot; enlarge raft; survive shark damage; make a sail/anchor; scavenge reefs.

**Middle:** research refined materials; smelt ore; install collection nets; build receiver/antennas; follow Radio Tower → Vasagatan → Balboa/Tangaroa-era destinations; gain engine/steering and other blueprints; capture animals and improve food/storage.

**Late/1.0 story:** navigate increasingly elaborate authored locations, acquire titanium/electric/advanced equipment, use Recycler/trading, complete Varuna Point, Temperance and Utopia, then continue sandbox building/exploration after the narrative climax.

The best progression beats change the **kind of attention** required. Nets replace some hook casts; engines replace drift helplessness; advanced purification replaces constant cup shuttling. PC Gamer explicitly describes engine/steering as the point where the game felt like a different, more empowering game. [PC Gamer review](https://www.pcgamer.com/raft-review/).

### Death and recovery

Death penalties depend on difficulty. A downed multiplayer player can be carried/rescued to a bed rather than immediately accepting a harsher death outcome, giving co-op a direct rescue use beyond dividing labor. Solo play cannot rely on another human for that recovery. Because exact item-loss rules vary by selected difficulty, the meaningful design point is the **difficulty-dependent risk to carried inventory/progress**, not one universal "death drops X" rule.

### Economy and sinks

Raft's base economy is material transformation rather than money: gather → research/process → build → consume/durability → gather again. Trading adds explicit currencies but still originates in materials and fishing. Major sinks are raft expansion, replaceable tools/weapons, cooking/fuel, ammunition, batteries, engines and aesthetic building.

The game is sold as a premium product, not an in-game microtransaction economy. Storefront price can change; this dossier records the structure rather than treating today's sale price as permanent.

### What sustains purpose after survival is solved?

Once food/water/debris collection are automated, purpose comes from:
- completing the story;
- reaching and solving large destinations;
- redesigning/beautifying the mobile home;
- expanding livestock/farms/production;
- achievement hunting and collection;
- co-op social construction.

A recurring criticism is that the sandbox has a weaker **post-story** goal loop once Utopia and desired raft construction are finished.

## R05 — worked interactions and concrete situations

Unless attributed otherwise, these are rules-based illustrations derived from documented systems.

### Case 1 — hook a barrel or repair the shark bite

**Intention:** keep early resource momentum.  
**Conditions:** a resource barrel is about to pass while the shark begins biting a foundation.  
**Actions:** choose whether to finish a hook cast or sprint to stab/repair.  
**Interaction:** both threats are time-sensitive; losing the barrel reduces future material while losing the foundation can destroy attached structures.  
**Result:** Raft converts simple gathering into attention triage.  
**Next decision:** widen the raft, stock more repair materials, or progress toward reinforcement/collection nets.

### Case 2 — collection nets convert a skill loop into infrastructure

**Intention:** stop spending most of the day manually hooking trash.  
**Conditions:** enough materials and researched net recipe.  
**Actions:** place collection nets along an interception edge.  
**Interaction:** drifting resources are captured automatically whenever the raft crosses them.  
**Result:** player attention moves from basic collection to building, farming, cooking or navigation.  
**Limit:** the system still depends on the raft moving through debris and the net line being positioned effectively.

### Case 3 — anchoring creates a risk budget for underwater mining

**Intention:** obtain metal, copper, sand and clay around an island.  
**Conditions:** island located; anchor and diving tools/supplies available.  
**Actions:** stop the raft, enter the water, mine reef nodes and surface for oxygen.  
**Interaction:** oxygen, shark attacks, tool durability, inventory space and the distance back to the raft constrain one dive.  
**Result:** the player decides between another risky trip and departing with enough material to unlock the next tier.

### Case 4 — research consumes a scarce example to create future capability

**Intention:** unlock a higher-tier recipe.  
**Conditions:** player has finally obtained a new processed material.  
**Actions:** place one unit into the Research Table and research it.  
**Interaction:** that material is consumed, reducing today's construction stock but satisfying recipe prerequisites globally.  
**Result:** short-term scarcity purchases long-term recipe knowledge.  
**Next decision:** spend remaining material on infrastructure now or collect more before committing.

### Case 5 — receiver turns a home into a navigation instrument

**Intention:** stop drifting without narrative direction.  
**Conditions:** Receiver, battery and three validly positioned antennas.  
**Actions:** power the receiver and enter a discovered four-digit story code.  
**Interaction:** the display shows the target's relative direction/distance; battery charge depletes while powered.  
**Result:** the raft's architecture now includes a functional navigation station, and travel can be planned around a destination rather than whichever island appears.  
**Source:** [Receiver reference](https://raft.fandom.com/wiki/Receiver).

### Case 6 — engine + steering changes the fantasy from survivor to captain

**Intention:** reach a target that current wind will not conveniently deliver.  
**Conditions:** Vasagatan progression has yielded the engine blueprint; sufficient raft power/fuel and steering.  
**Actions:** install engine(s), fuel them, set helm direction.  
**Interaction:** powered propulsion overcomes the earlier dependency on sail/current and must scale with raft requirements.  
**Result:** the mobile home becomes an actual controllable vessel.  
**Attributed reception:** PC Gamer calls this the run's turning point from mostly helpless passenger to explorer. [PC Gamer](https://www.pcgamer.com/raft-review/).

### Case 7 — waste becomes a trading progression loop

**Intention:** buy a Trading Post recipe or specialist item.  
**Conditions:** Recycler and access to a large island Trading Post.  
**Actions:** feed excess materials into Recycler → make Trash Cubes → purchase fishing bait → catch qualifying rare fish → sell fish for Trade Coins → buy the desired good.  
**Interaction:** resources that were storage clutter become a currency input; fishing gains a progression purpose beyond calories.  
**Result:** late-game abundance is partially re-sunk into a new exchange loop.  
**Boundary:** introduced with the 1.0 Final Chapter, not representative of early Early Access.

### Case 8 — co-op naturally creates roles without a class system

**Intention:** leave an island efficiently before supplies run low.  
**Conditions:** several human players share one raft/world.  
**Actions:** one dives for ore, one clears island resources, one cooks/refills water and one repairs/organizes the raft.  
**Interaction:** all players pull from shared physical infrastructure but carry personal inventories and occupy different risk positions.  
**Result:** a temporary division of labor emerges from tasks rather than character classes.  
**Failure mode:** if networking breaks or a host session becomes inaccessible, the social structure disappears; recent Steam testimony still reports connection/code-63 frustration for some users after cross-play work.

## R06 — people, AI, social systems and multiplayer

### Human co-op is the social system

Raft does not simulate a crew of autonomous workers. In multiplayer, the **other players are the crew**. That matters because the world contains enough simultaneous chores—hooking, steering, cooking, farming, fighting, diving, looting and building—that informal specialization appears naturally.

Current Xbox metadata advertises online co-op/multiplayer for **2–10** players, and the PC/console cross-play project was explicitly designed to unite those platforms. [Xbox listing](https://www.xbox.com/en-GB/games/store/raft/9P7RBKDTN18T) · [Redbeet announcements](https://steamcommunity.com/app/648800/announcements/). Do not project LAN/couch co-op or persistent dedicated-server behavior onto it without separate evidence: the ordinary model is a player-hosted/shared session, not an MMO shard.

Cross-play added world-code joining, controller support and in-game voice chat. Redbeet's 2025 beta notes and 2026 1.1/default-branch work show that networking required substantial rewriting and continued fixes; some player reviews/discussions report connection failures. That is a useful reminder that widening social reach can create a new reliability surface.

### Story NPCs and playable characters

The Final Chapter added four unlockable playable characters and story destinations contain human traces/encounters. These identities primarily change avatar appearance/voice/notebook framing, not skill loadouts. Raft is therefore social in co-op but **not companion-simulation-heavy**.

### Animals and hostile AI

The shark has the clearest persistent relationship with the player: it attacks swimmers and periodically bites raft edges. Many reviewers agree that its recurrence creates useful early pressure; several also say it becomes predictable, annoying or trivial once equipment improves. Island predators add localized hazards, while livestock convert certain animals into renewable resources. Enemy behavior supplies pressure but not long-term social memory/reputation.

### Shared versus personal progress

The raft, placed infrastructure and world/story state are shared spatial progress. Each human has their own embodied position and carried inventory. This distinction enables rescue, risk asymmetry and role division: the crew can collectively own an engine while one player personally loses time/items to a bad expedition.

## R07 — art, audio, interface, controls and feel

Raft uses bright, stylized low-poly forms and large readable silhouettes. The ocean and sky can look calm even while hunger/shark timers create pressure; that contrast is part of the game's "cozy but dangerous" identity. Shacknews specifically emphasizes the relaxing feeling of standing on a self-built raft between crises, while eXputer praises the colorful look but criticizes rough animation/combat feel. [Shacknews](https://www.shacknews.com/article/131150/raft-review-steam) · [eXputer](https://exputer.com/reviews/raft-the-final-chapter/).

The hook is strong tactile feedback because its arc, rope length and reel translate screen-space timing into a resource result. Building uses snap-oriented placement and immediate transformation of the home. The raft itself provides persistent visual feedback: a second floor, a line of nets, a livestock pen or a messy engine room *is* the progression UI.

The 1.0 story overhaul added **voice playback for story notes**, with automatic playback that can be disabled and replayed from the notebook. This makes narrative discoverable while the player continues moving/looting rather than forcing every note to be read in place. [1.0 notes](https://steamdb.info/patchnotes/8972572/).

Interface friction includes inventory/storage shuffling, recipe/material tracking, tool durability and—historically—learning without much tutorialization. The 1.0 release added storage sorting, battery indicators, auto-run, UI performance improvements and other quality-of-life changes. Later console/cross-play work added full controller support and integrated voice chat.

## R08 — story, environmental narrative and play connection

**Spoilers below for the shape of the campaign, not every reveal.**

Raft starts with an apparently simple flood-survival premise and gradually reveals a drowned-world story through notes, environmental spaces and destination chains. The receiver/antenna system is the mechanical bridge from sandbox survival to authored narrative: story codes identify locations, each location yields evidence and often a blueprint/code leading onward.

The 1.0 update deliberately rewrote/streamlined older story material into a continuous campaign and added voiced notes. The route includes locations such as the **Radio Tower, Vasagatan, Balboa Island, Caravan Town, Tangaroa, Varuna Point, Temperance and Utopia**. These spaces vary the normal raft loop with interior exploration, puzzle/key chains, ziplines, hazards, bosses and denser environmental storytelling. [1.0 announcement](https://steamdb.info/patchnotes/8972572/) · [story reference](https://raft.fandom.com/wiki/Story).

This connection has two effects:

1. **Meaning for crafting:** a receiver, engine, battery, bow or advanced food system matters because it supports a voyage somewhere specific rather than endless accumulation.
2. **Genre tension:** some critics/players love the authored escalation; others feel later story locations become fetch-key/puzzle/combat chores that temporarily demote the raft itself into transportation.

PC Gamer and GosuNoob both describe the revelation that the drift "leads somewhere" as crucial to staying engaged. Current negative Steam reviews provide the counterpoint: some players enjoy the first home-building stage most and find the story-island chain more tedious than the survival sandbox.

## R09 — production and development

Raft began as a university market/course project by three students. In a 2018 PC Gamer interview, co-founder/artist André Bengtsson explained that the assignment was explicitly to identify a market and deliver a game to it. The team released a free itch.io prototype, built a community around it and stayed in touch with YouTubers before the commercial Steam Early Access launch. [PC Gamer production interview](https://www.pcgamer.com/how-raft-conquered-the-seas-of-steam/).

The project's pre-Steam reach was unusually large. Evidence later summarized in a U.S. Trademark Trial and Appeal Board record cites Redbeet evidence that the itch.io listing reached very high daily download rates in early 2017 and millions of views/downloads over its life. The legal record is valuable because it reproduces sworn/declaratory evidence, but it is not a design postmortem; use it for distribution history, not inferred causation. [TTAB decision mirror](https://www.casemine.com/judgement/us/69302eff26590b243424fd78).

The development sequence is unusually legible:
- free prototype and creator-driven discovery;
- company formation in 2017;
- Steam Early Access in May 2018 with multiplayer;
- large content/chapter updates over four years;
- Final Chapter / 1.0 in June 2022 after what Redbeet called more than five years of development;
- console and cross-play engineering in 2024–2026.

The 1.0 changelog also records concrete technical work: the team recoded raft collision to improve very large raft performance, added LOD work, UI optimizations and many bug fixes. This is stronger evidence than inferring architecture from visible behavior. [1.0 notes](https://steamdb.info/patchnotes/8972572/).

## R10 — marketing, distribution, promotion and virality

Raft is a strong example of **playable premise as marketing asset**. The hook is visible in seconds: one tiny raft, floating trash, a throwable hook, shark pressure and a structure that grows. That made videos easy to understand before viewers knew the rules.

The 2018 PC Gamer interview says the team already had a community from the itch prototype and was keeping in touch with YouTubers before Steam. The developers expected a good Early Access launch but were surprised by the scale, with the game reaching Steam's top sellers. This is recorded developer testimony about the channel; it does not prove a precise percentage of sales caused by YouTube. [PC Gamer](https://www.pcgamer.com/how-raft-conquered-the-seas-of-steam/).

The raft itself is also a **shareable artifact**: a bizarre mansion/ship, tiny optimization build or themed home is screenshot/video content with immediately visible authorship. Co-op adds streamable failure/comedy because one player's mistake can endanger a shared structure.

Early Access supported repeated publicity beats through chapter updates, while the 1.0 "Final Chapter" had an unusually clear message—story completion plus new destinations, characters, trading, voice acting and equipment. The surprise PS5/Xbox release and cross-play later reopened the audience without pretending to be a new campaign.

## R11 — commercial and participation context

Raft is a premium game with no battle-pass or consumable-microtransaction progression described on its core storefronts. The durable commercial story is unusually strong, but public metrics must be kept distinct.

A 2025 TTAB decision reproducing Redbeet evidence states that:
- Steam-game sales through **October 1, 2023** were in the **low nine figures** worldwide (currency context is in the case record, so this dossier does not convert it into a new precise lifetime-revenue claim);
- nearly **3 million units** had been sold to U.S. customers in that period.

The same record documents enormous free-prototype exposure. [TTAB decision mirror](https://www.casemine.com/judgement/us/69302eff26590b243424fd78).

Steam's current store surface shows more than **130,000 English purchaser reviews** and more than **320,000 purchaser reviews across all languages**, with a Very Positive aggregate; these are review counts, **not unit sales**. [Steam](https://store.steampowered.com/app/648800/Raft/).

Third-party owner/revenue models disagree by very large margins in 2026. This dossier therefore does **not** promote SteamSpy/Boxleiter/analytics estimates into verified lifetime sales. A reported Swedish "Walk of Game" threshold and press reporting may imply at least a multi-million-copy scale, but exact cross-platform lifetime units are not treated as verified here without a first-party current figure.

The game's support obligation changed after 1.0: narrative expansion ended, but networking/platform work continued. Cross-play's beta/default-branch sequence and 2026 hotfixes are evidence that a "finished story" can still carry live compatibility costs.

## R12 — reception, five written reviews and player feedback

### Five substantive independent written reviews

1. **PC Gamer — Christopher Livingston, July 7, 2022.** The review strongly dislikes the frantic, grind-heavy opening but says the progression becomes engrossing once purification, nets, receiver and powered steering turn survival into purposeful exploration. It particularly values the mobile-base permanence and large story destinations. [Full review](https://www.pcgamer.com/raft-review/).

2. **Shacknews — Donovan Erskine, June 29, 2022.** Praises natural progression, satisfying resource management, raft customization and lore. Criticizes aggressive early hunger/thirst and especially the shark's short recurring loop, which turns it from threat into chore once the player can reliably kill it. [Full review](https://www.shacknews.com/article/131150/raft-review-steam).

3. **GosuNoob — Miodrag Kuzmanovic, June 30, 2022.** Calls the first hours slow/grindy and under-explained, with survival meters dominating normal difficulty, but argues the layered escalation in technology, raft customization and story produces a major payoff. It is particularly positive about the story's widening stakes. [Full review](https://www.gosunoob.com/reviews/raft-review-waterworld/).

4. **HitPoint Reviews — “Sailing the High-Tech Seas: A Raft Review,” updated November 20, 2023.** Praises the visible growth of the floating home, approachable crafting, atmospheric audio/art and especially co-op, while criticizing occasional bugs/AI failures and the loneliness/repetitive resource grind of solo play. The complete review body was read for this pass. [Full review](https://hitpointreviews.com/reviews/648800/raft).

5. **eXputer — Moiz Banoori, June 2, 2024.** A later retrospective praises crafting breadth, Creative mode and multiplayer design while criticizing rough animation, weak survival depth after stabilization, and exploration that feels constrained because permanent construction is raft-only. It is useful precisely because it disagrees with 2022 reviewers who found exploration/story the major payoff. [Full review](https://exputer.com/reviews/raft-the-final-chapter/).

**Supplemental indexed perspective:** Checkpoint Gaming's July 8, 2022 credited assessment praises the collect/craft loop and variety from authored on-foot areas while flagging limited post-ending content and strongly framing the game as a co-op success. The current Metacritic index preserves that assessment, but the original body was not reliably retrievable, so it is **not** counted toward the five full written reviews. [Metacritic critic index](https://www.metacritic.com/game/raft/critic-reviews/).

**Supplemental co-op perspective:** Coop Games' review describes a natural labor split, full story availability in co-op and no special client/host gameplay-role distinction, but its original review dates to the evolving 2020 build and its current page includes later metadata; it is supplemental rather than substituted for one of the five above. [Coop Games](https://coopgames.com/game/57/raft).

### Steam/player evidence — current helpful surfaces inspected

The public Steam review surfaces were directly accessible in this pass.

- The current store aggregate is Very Positive. [Steam store](https://store.steampowered.com/app/648800/Raft/).
- A current community surface contains players praising the game especially with friends, the satisfaction of building/upgrading a raft and continued exploration, while still acknowledging repetition. [Steam community](https://steamcommunity.com/app/648800).
- The **Most Helpful / Three Months / Negative Only** surface contains detailed criticism of grind, tool durability, insufficient quality-of-life, late placement of major upgrades, fast hunger/thirst, weak explanation of story progression and a perceived transition from enjoyable raft-building into repetitive story-location fetch/puzzle sequences. [Negative helpful surface](https://steamcommunity.com/app/648800/negativereviews/?browsefilter=trendthreemonths&filterLanguage=default&l=english&p=1).
- The **Most Helpful / All Time / Negative Only** surface is heavily contaminated by Early Access reviews whose complaints about missing content are historically valid but no longer describe the 1.0 content set; it also preserves later concerns around offline/network behavior. [All-time negative surface](https://steamcommunity.com/app/648800/negativereviews/?browsefilter=toprated&l=english).

These samples are qualitative, version-sensitive testimony—not a prevalence estimate. Early Access complaints about "nothing to do after a few hours" cannot be silently presented as current 1.0 content coverage, while current complaints about grind/durability/story pacing still deserve direct treatment.

### Recurrent praise/criticism without manufactured consensus

**Praised across multiple independent sources**
- visible growth from scrap platform to personalized vessel;
- progression unlocks that remove old chores rather than only increasing stats;
- co-op task sharing and shared-home attachment;
- atmospheric contrast between tranquil sailing and survival pressure;
- authored destinations that give purpose to crafting for players who enjoy the story.

**Criticized across multiple sources/player accounts**
- early hunger/thirst and manual gathering can dominate attention;
- repeated shark attacks become annoyance rather than meaningful fear;
- durability/re-crafting can feel like treadmill rather than interesting scarcity;
- inventory/storage and late quality-of-life unlock timing;
- combat/animation are less refined than construction;
- some players prefer the raft sandbox and dislike the later destination/fetch-puzzle rhythm;
- weak post-story purpose once the home is "done."

These are audience/playstyle differences, not one objective verdict.

## R13 — transferable inspiration and limits for OpenLegend

### 1. Let one persistent place absorb many systems

Raft's home simultaneously represents safety, wealth, travel, production, expression and shared memory. OpenLegend can learn from the **convergence**, not the literal ocean vessel: when players can continually add meaning/capability to a persistent place or object, every new system reinforces attachment to the same history.

**Dependency:** additions must remain legible and meaningfully usable.  
**Failure mode:** the home becomes a junk drawer of mandatory machines.

### 2. Progression can buy back attention

The strongest upgrades eliminate a repeated low-level obligation: nets reduce hook spam; better water/food reduces survival babysitting; engines remove drift helplessness. This is stronger than "+10% efficiency" because the player feels their life changed.

**OpenLegend pattern:** some mastery should convert previously active chores into reliable delegated/infrastructural behavior, freeing cognition for richer goals.

### 3. A base that moves avoids the "abandoned starter home" problem

Many survival games make later exploration compete with investment in a stationary base. Raft keeps the home relevant because it travels. The transferable idea is **portable continuity**: major journeys need not erase domestic investment.

Do not copy the specific raft fiction. Alternatives include caravans, ships, organizations, portable workbenches, trusted companions or remote logistical links.

### 4. Emergent roles need not be classes

Raft's co-op naturally creates cook, builder, diver, captain, fisher and quartermaster roles because the world presents simultaneous heterogeneous tasks. This suggests that agent/player specialization can emerge from **activity topology** rather than hard role labels.

### 5. Progression should not invalidate the thing players loved

Current negative Steam testimony is especially useful here: some players feel story destinations and mandatory large machines cause them to rebuild an aesthetically loved raft, while the mobile-home loop becomes transit between fetch-heavy spaces.

For OpenLegend, a new progression layer should ask: **does it deepen the original fantasy or temporarily replace it?**

### 6. Repetition must mutate before it becomes maintenance

Hooking is satisfying because it is tactile and scarce, but the game eventually gives nets. Shark defense is initially dramatic but receives less qualitative transformation, which helps explain why reviewers call it annoying. Repeated verbs should either:
- become automated/delegated;
- gain new decision structure;
- or recede once mastered.

### 7. Authored mystery can pull a systemic sandbox forward

Raft demonstrates a useful hybrid: sandbox production creates capability, while curated locations give that capability a reason to exist. The receiver is a particularly elegant seam because the **player-built system itself discovers authored content**.

**Limit:** overusing keyed/fetch-gated authored sequences can make the systemic world feel like downtime between scripted spaces.

### What not to copy automatically

- constant hunger/thirst merely because it is "survival";
- ubiquitous durability with no repair/qualitative decision;
- a recurring enemy on a short timer after it stops producing fear;
- late convenience unlocks that arrive after their maximum value;
- one host/network model if persistent worlds need stronger continuity guarantees;
- protected names, characters, art, story locations or distinctive Raft assets.

## R14 — sources, viewing routes, preservation and requirement map

### Prior-owner / preservation check

Repository search and the inspected game-inspiration navigation/roster identify **no pre-existing dedicated Raft game chapter or mechanics study** to preserve. G141 was added as a new September 27 survival subject and this dossier is additive. The roster's explicit boundary—Raft itself, Early Access history, full release, platform/co-op boundaries—is retained. Existing general survival research is not rewritten.

No video is represented as watched. Trailer/Let's Play references discovered in source pages remain metadata unless explicitly inspected in a future audit.

### Annotated source register

**S01 — Steam store, current product page.** Primary storefront; release date, Early Access date, developer/publisher, player modes, current review populations and official feature language. Read September 27, 2026.  
https://store.steampowered.com/app/648800/Raft/

**S02 — Redbeet/Axolot Steam announcement, “VERSION 1.0: The Final Chapter — Out Now!”, June 20, 2022.** Primary patch/release notes; 1.0 scope, story rewrite, new destinations/enemies/characters, Trading Posts, Recycler, buffs, items, QoL and technical work. Read in full via Steam/SteamDB mirror.  
https://steamdb.info/patchnotes/8972572/

**S03 — Steam announcement stream, console/cross-play updates, December 2024–March 2026.** Primary current platform/network history; PS5/Xbox release, cross-play beta/fixes, default-branch 1.1 and hotfix context. Read relevant announcement text; not a full archive audit.  
https://steamcommunity.com/app/648800/announcements/

**S04 — Xbox store listing.** Primary platform metadata; Series X|S release date and 2–10 online co-op/cross-platform capability. Read September 27, 2026.  
https://www.xbox.com/en-GB/games/store/raft/9P7RBKDTN18T

**S05 — PC Gamer, Christopher Livingston, “Raft review,” July 7, 2022.** Full independent review read; early grind, mobile-home attachment, story destinations, automation and engine/steering progression.  
https://www.pcgamer.com/raft-review/

**S06 — Shacknews, Donovan Erskine, “Raft review: An ocean of possibilities,” June 29, 2022.** Full review read; progression, customization, story, hunger/thirst and shark criticism.  
https://www.shacknews.com/article/131150/raft-review-steam

**S07 — GosuNoob, Miodrag Kuzmanovic, “Raft Review – Waterworld,” June 30, 2022.** Full review read; normal-mode survival pressure, animal/resource loops, receiver/story and gradual escalation.  
https://www.gosunoob.com/reviews/raft-review-waterworld/

**S08 — HitPoint Reviews, “Sailing the High-Tech Seas: A Raft Review,” updated November 20, 2023.** Full independent review read; raft growth, crafting, audiovisual atmosphere and co-op praise, with bugs/AI and solo resource-grind criticism.  
https://hitpointreviews.com/reviews/648800/raft

**S09 — eXputer, Moiz Banoori, “Raft The Final Chapter Review,” June 2, 2024.** Full retrospective review read; crafting/multiplayer strengths, animation/combat/exploration criticism.  
https://exputer.com/reviews/raft-the-final-chapter/

**S10 — Coop Games, Raft co-op review.** Supplemental firsthand co-op account; page's review originates in the evolving 2020 era although current metadata is updated, so version limits are explicit.  
https://coopgames.com/game/57/raft

**S11 — PC Gamer, Jody Macgregor, “How Raft conquered the seas of Steam,” June 10, 2018.** Developer interview read; university-market-project origin, itch community, YouTuber relationships and unexpectedly large Early Access response.  
https://www.pcgamer.com/how-raft-conquered-the-seas-of-steam/

**S12 — TTAB decision in Redbeet Interactive v. Alexander Novikov (2025), CaseMine mirror.** Legal record reproducing evidence on company formation, itch exposure and commercial sales through October 2023. Used for dated distribution/commercial facts, not game-design intent.  
https://www.casemine.com/judgement/us/69302eff26590b243424fd78

**S13 — Official Raft Wiki, Research Table.** Community-maintained mechanics reference; current research consumption/unlock behavior and blueprint-history qualification. Used for rules, not developer intent.  
https://raft.fandom.com/wiki/Research_Table

**S14 — Official Raft Wiki, Receiver.** Community-maintained mechanics reference; receiver resources, three-antenna requirement, battery draw and code use.  
https://raft.fandom.com/wiki/Receiver

**S15 — Official Raft Wiki, Engine.** Community-maintained mechanics reference; Vasagatan blueprint and powered navigation with steering wheel.  
https://raft.fandom.com/wiki/Engine

**S16 — Official Raft Wiki, Story.** Community-maintained navigation/story reference; current 1.0 route and pre-1.0 boundary. Spoiler-heavy.  
https://raft.fandom.com/wiki/Story

**S17 — Steam Community current reviews.** Direct player testimony; positive current surface, helpful three-month negatives and all-time negatives. Read selected bodies September 27, 2026. Samples are not prevalence estimates and all-time negatives include Early Access material.  
https://steamcommunity.com/app/648800/  
https://steamcommunity.com/app/648800/negativereviews/?browsefilter=trendthreemonths&filterLanguage=default&l=english&p=1  
https://steamcommunity.com/app/648800/negativereviews/?browsefilter=toprated&l=english

**S18 — Checkpoint Gaming review, July 8, 2022, via current Metacritic critic index.** Credited assessment inspected; original review body was not reliably retrieved, so this remains supplemental indexed reception and is not counted toward the five full-review minimum.  
https://www.metacritic.com/game/raft/critic-reviews/

### Useful reading/viewing route

1. **Start with S05 (PC Gamer review)** for the arc from miserable manual survival to empowered moving-base exploration.
2. **Read S02 (1.0 notes)** for the authoritative final-content boundary and concrete system additions.
3. **Read S11 (2018 developer interview)** for the origin/market/creator-discovery history.
4. **Contrast S06/S07/S08 with S09 and S17** to see why the same repetition/story structure delights some players and exhausts others.
5. Use S13–S16 only when a concrete mechanic/story rule needs a community reference; they are not substitutes for primary production evidence.
6. Spoiler-sensitive readers should postpone S16 and the later-destination sections of S02 until after playing.

### Requirement-to-section map

| Requirement | Substantive owner |
| --- | --- |
| R01 | Identity, scope, versions and player promise |
| R02 | Player actions and major mechanics |
| R03 | Items, resources, entities and composition |
| R04 | Progression, economy, time, failure and return loop |
| R05 | Eight worked interactions |
| R06 | People, AI, social systems and multiplayer |
| R07 | Art, audio, interface, controls and feel |
| R08 | Story, environmental narrative and play connection |
| R09 | Production and development |
| R10 | Marketing, distribution, promotion and virality |
| R11 | Commercial and participation context |
| R12 | Five written reviews + current Steam/player evidence |
| R13 | Transferable inspiration and limits |
| R14 | Source register, reading route, preservation and this map |

### Evidence limits

- No game build was installed or played for this pass.
- No video footage, trailer sequence or soundtrack was represented as watched/listened to.
- Checkpoint's credited review assessment was available through an index but the original body was not reliably retrieved; it is labeled accordingly.
- Community-wiki rules are used for concrete mechanics where primary patch/store sources are insufficient, not for claims of designer intent.
- Current exact cross-platform lifetime units/revenue are not public enough to justify promoting third-party estimates into fact.
- Steam samples are direct qualitative testimony and version-sensitive; they are not statistical prevalence measures.

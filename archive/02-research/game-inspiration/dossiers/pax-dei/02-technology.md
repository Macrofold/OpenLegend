# Pax Dei: technology, persistence, and world topology

Research cut-off: **14 November 2026**. This chapter describes public developer and infrastructure-partner evidence. It does not report a code audit, server benchmark, or hands-on playtest. Historical capacities are labeled; the currently published FAQ contains older statements alongside newer answers.

## 1. The central distinction: a common place is not necessarily a common encounter

The key question for Open Legend is whether a persistent location also guarantees a shared encounter. The marketing label “persistent MMO” cannot answer that alone.

The official technical FAQ describes this hierarchy:

| Layer | Meaning and limits described by Mainframe |
| --- | --- |
| Hosting region | Geographic hosting location. |
| World/shard | Independent world copy. |
| Province | Large geographic area. |
| Zone | Smaller area run by a dedicated Unreal server. |
| Zone instance | Overflow simulation; players cannot interact across instances. |

The FAQ describes zone transfers without player/NPC visibility across boundaries; overflow instances later merge. Its older figures are approximately 7,000 players per shard and 150 per zone; a newer answer says approximately 14,000 **plot owners**. These are different measures, not a current concurrency benchmark. [Official technical FAQ, undated](https://playpaxdei.com/en-us/faq/tech)

**Interpretation:** there are three distinct scaling problems: how many accounts have a home, how many people are online across a world, and how many people occupy one contested location. Solving one does not solve the others. A huge landmass can accommodate many persistent homes without supporting a huge single battle.

## 2. Buildings use a different replication path from ordinary gameplay

Mainframe's **27 September 2024** article reported approximately 400,000 building pieces in its busiest valleys, 30 MB of building-state data per valley, 24 valleys/world, and 10,000 added pieces weekly in a valley. Its comfort estimate was 500,000 pieces; one million was a future target. It also cited 150–200 players per Unreal server. These figures are historical.

Custom **Repli** replaced ordinary Unreal building replication: an initial snapshot, then gRPC events. Placement proceeded through server/backend authorization, database commit, and distribution to clients/servers, followed by structural-integrity evaluation. Changes crossed overflow instances.

Presentation used spatial area managers, instanced static meshes, nearby furnishing streams, cheaper distant lights, and work spread across frames. [Official building-system explanation](https://playpaxdei.com/en-us/news/behind-the-scenes/tech-insights-our-building-system)

**Engineering interpretation:** a permanent wall is mostly stored geometry and ownership until something changes. A fighting character needs frequent state updates, collision work, and decisions. Giving both the same simulation or network treatment wastes resources. The useful pattern is separating durable state, active simulation, and presentation while retaining a clear authority for each mutation.

A snapshot's size does not equal the memory cost of the rendered world. Assets, textures, physics objects, temporary allocations, and engine overhead are separate. Multiplying a snapshot by recipient count describes aggregate distribution, not bandwidth per second.

## 3. The instance boundary changes gameplay rules

Mainframe's **June 2024 interview** described routing players toward instances containing their party and clan. Different soft and hard population limits left room for that social matching. Dungeons were shared with other parties, with additional instances created as needed; they were not necessarily private party instances. The developer described this same matching approach for crowded outdoor zones. These are historical design statements, not proof that friends can never become separated. [Interview with Mainframe CPO Sulka Haro](https://wccftech.com/pax-dei-early-access-qa-mainframe-talks-improvements-from-the-wilderness-alpha-monetization-and-much-more/)

A later, unusually revealing detail appears in the **Verse 5 Feudal Sovereignty** description: buildings can persist across instances, but **opening a door in Lyonesse is deliberately not replicated into other instances**. Otherwise, a player could open a gate for enemies they cannot see. The same description introduced clan-controlled shrines and construction around them, maintained through Mournwood upkeep. It explicitly said there was no direct way to capture another clan's site at that stage; opponents could interfere with upkeep-resource acquisition instead. Direct capture remained a possible future addition. [Official Feudal Sovereignty explanation](https://playpaxdei.com/en-us/news/game-updates/feudal-sovereignty-claim-the-unclaimable-verse-5)

This is a concrete example of one location containing multiple categories of truth. Building existence can be shared while a tactical interaction with that building remains local to an instance. It is a deliberate compromise, not evidence that persistence itself is fake.

The **19 December 2025 patch** provides evidence of a less desirable consequence. Mainframe acknowledged that a rare second instance could leave a group harvesting a contested Mournel tree alone. Its response included spreading simultaneous resource objectives across four areas, reducing the probability of an overflow instance. The change also sought to weaken the optimal strategy of forming one overwhelming group and widened the hours in which objectives spawned. Developers separately acknowledged large-battle performance problems. [Official Verse 5 patch 1.1](https://playpaxdei.com/en-us/news/patch-notes/patch-notes-verse-5-patch-1-1-dec-19)

**Implication for Open Legend:** “the enemy's fortress exists” and “the enemy cannot avoid our confrontation by entering another simulation” need different guarantees. If territory, blockades, persistent NPC loyalties, or wars matter, instance assignment becomes part of the game rules. More servers alone do not answer who should be able to affect whom.

## 4. What environmental persistence actually covers

Pax Dei's world FAQ says resources normally respawn, with different behavior on claimed land. Its geography is generated through an author-directed Houdini pipeline: designers supply a rough terrain form, annotated maps, and biome data; procedural stages produce terrain detail, water, roads, vegetation, resource distribution, navigation-related data, and other outputs. This is an **offline world-authoring pipeline**, not evidence that players can freely regenerate or deform terrain at runtime. [Official world FAQ](https://playpaxdei.com/en-us/faq/world)

An older building FAQ explicitly says terrain modification is unsupported and foundations provide a way to build on uneven ground. It also explains the design intent behind protected Heartland homes: players who avoid PvP, and PvPers between battles, should retain somewhere safe. Its statement that building was restricted to Heartlands is historical and is superseded by later Feudal construction. [Historical building FAQ update](https://playpaxdei.com/en-us/news/information/update-on-the-building-faq)

Recent changes show narrower environmental tools and continuing resource-system work. R48 added grass-removing construction pieces. The **10 November 2026** hotfix repaired animals failing to respawn for hours or days in long-running zones. That bug should not be mistaken for an intentional ecological depletion mechanic. [R48 patch notes](https://playpaxdei.com/en-us/news/patch-notes/r48-patch-notes) · [R49 patch 3, updated November 10](https://playpaxdei.com/en-us/news/patch-notes/r49-patch-3-plot-borders-and-pilgrim-s-bounty)

The evidence therefore supports persistent authored structures, property rights, storage and economic state, alongside renewable world resources. It does **not** establish a fully persistent ecosystem, unrestricted terrain sculpting, permanent deforestation everywhere, or universal destructive warfare. Those stronger claims need separate evidence.

The procedural production approach is relevant to Open Legend's content problem: authors can decide where an interesting valley, settlement route, or resource tension should exist, while tools fill repetitive detail. That is a different promise from expecting unconstrained generation to produce good geography and meaningful gameplay automatically.

## 5. Persistent property has an expiration policy

The support article last updated **3 October 2025** describes token-maintained plots becoming frozen after expiration, then released after three days. Automatic release dismantles the core area's structures into recoverable materials and returns stored items; extensions have different handling. Manual release instead makes constructions public and salvageable. Unclaimed structures then decay, beginning after 48 hours and completing by 96 hours under the documented rules. [Official plot-state and decay explanation](https://support.playpaxdei.com/hc/en-us/articles/30676109301789-Plot-management-auto-renewal-active-frozen-released)

One detail in that support page is stale: it restricts recovery to the original world **and zone**. R48 changed ordinary expired-plot recovery to any zone in the same world, with Lyonesse excepted. This is why support text should be reconciled with newer patch notes rather than treated as timeless. [R48 patch notes](https://playpaxdei.com/en-us/news/patch-notes/r48-patch-notes)

A separate support page updated **8 April 2026** describes one Grace-funded plot per server region, renewable through earned in-game currency; it has manual rather than automatic renewal. Thus a paid subscription is not the only way to maintain any land. By October 2026, unused plot tokens no longer expired; the anniversary announcement already described that change as live. Token expiration and an occupied plot's upkeep deadline are different concepts. [Grace plot support](https://support.playpaxdei.com/hc/en-us/articles/32383547755037-What-is-a-Grace-Plot) · [October anniversary announcement](https://playpaxdei.com/en-us/news/information/pax-dei-turns-one-horses-and-a-special-anniversary-boost-are-coming)

**Interpretation:** persistent construction requires decisions about absent players, scarce desirable locations, returning players, and abandoned clutter. The same policy can improve settlement availability while making an owner's break from the game feel costly. Persistence is a retention asset only when players trust its rules and regard the required upkeep as fair.

## 6. Hosting evolved beyond an all-AWS deployment

Mainframe announced a completed migration from **Amazon RDS PostgreSQL to PostgreSQL-compatible Amazon Aurora on 31 March 2025**, citing reliability, failover and scaling benefits. The migration required two maintenance breaks. This establishes the database technology publicly; it does not reveal schema design, isolation levels or per-world database allocation. [Official database migration account](https://playpaxdei.com/en-us/news/behind-the-scenes/tech-insights-migration-update-upgrading-from-amazon-rds-postgres-to-amazon)

The undated i3D.net case study describes EC2/Python/Postgres and manual Unreal-server operation evolving into containers, Kubernetes, mostly Rust/Go services, messaging, and custom zone orchestration. Startup fell from minutes to seconds.

It describes **dedicated i3D.net game servers with AWS services**, preferring dedicated capacity while retaining AWS overflow. APIs, databases, S3 and EFS remained on AWS. The vendor reports **60–70% lower game-server infrastructure costs**; it supplies neither an absolute bill nor independent verification. This is a component-cost claim, not a total-development-cost reduction. [i3D.net case study featuring Mainframe's Director of Cloud Services](https://www.i3d.net/customer-stories/how-mainframe-reduced-game-server-costs/)

**Engineering interpretation:** elastic rental is useful when load is uncertain. Persistent, predictable compute can justify a different purchasing model later. The economic question is measured utilization, memory/CPU demand, operational labor, and reliability. These considerations do not prescribe the same stack for Open Legend.

Permanence also does not require every region's detailed simulation to run continuously. Stored world state can outlive an individual simulation process. However, stopping empty zones requires explicitly deciding how time, production, NPC activity, and other ongoing processes advance while nobody is present. Pax Dei's public materials do not specify all those semantics.

## 7. Operational failure modes are as important as the architecture diagram

During the **second alpha in April 2024**, Mainframe described about 150 virtual servers across Europe and the US, roughly two-thirds running Unreal zones, with backend services for inventory, avatars, groups, buildings, and authentication. Datadog and analytics supported live operations. At around 5,000 connected players, a Redis bottleneck and inadequate reconnection behavior contributed to disruption. Separately, excessive rabbit spawning overloaded NPC simulation; even rabbits competed for collision and pathfinding resources. Restarting the service created a mass reconnection surge distinct from normal traffic. [Official alpha war-room account](https://playpaxdei.com/en-us/news/behind-the-scenes/stories-from-the-war-room)

A more recent example is the R49 ownership regression. November's patch corrected cases where visible borders and actual permissions disagreed across connected plots, potentially changing which player controlled already-built pieces. It also fixed a fast-travel-related zone crash. [November 2026 R49 patch](https://playpaxdei.com/en-us/news/patch-notes/r49-patch-3-plot-borders-and-pilgrim-s-bounty)

**Interpretation:** a server can stay online while violating the experience players care about. A home unexpectedly changing ownership, buildings failing to load correctly, or an animal population silently exhausting CPU is a product failure even before total service outage. Verification should follow the valuable player action and its consequences, rather than count running processes.

For Open Legend, intelligent NPCs add inference costs to the ordinary costs of navigation, collision, state management, and networking. Improving model throughput would not remove those other costs. Conversely, a cheap background representation of a distant character need not erase that character's persistent history or relationships.

## 8. Exceptional graphics required substantial production and optimization

Room 8's own portfolio documents art and QA collaboration beginning in **2021**, including hundreds of environment, creature, weapon, prop, and modular-building assets. The vendor describes Unreal Engine 5, Nanite and Lumen as part of that work. It is evidence of a substantial production pipeline; it supplies no art budget and should not be used to invent one. [Room 8 portfolio](https://portfolio.room8studio.com/projects/pax-dei/)

In the **Spring 2026** update, Mainframe described a new building-physics streaming solution, following earlier mesh-instancing and clustering optimizations. It said mature player-built valleys were challenging for ordinary gaming PCs and that CPU bottlenecks were common on older hardware. It expanded graphics presets to give more control over quality and performance. These are developer reports, without an independently reproduced frame-rate comparison. [Spring update release notes](https://playpaxdei.com/en-us/news/patch-notes/new-content-available-on-arcadia-for-testing)

The later R46 update moved the live game from Unreal **5.4 to 5.6** and described rendering, streaming, networking, and navigation improvements, alongside NPC-aggro fixes. It is evidence of ongoing technical investment, not a guarantee that every hardware configuration achieves the frame rate discussed in engine marketing. [R46 release notes](https://playpaxdei.com/en-us/news/patch-notes/r46-release-notes)

**Interpretation:** a convincing empty landscape is an incomplete performance target for a construction MMO. The expensive scene is the place players have filled with overlapping structures, decorations, lights, inventories, and other people. Visual ambition must be assessed in that accumulated state. Open Legend's graphics cannot be judged solely by comparing a screenshot, but visual clarity, atmosphere, responsiveness, and coherent presentation still matter.

## 9. Social infrastructure is part of the technology case

Mainframe's **April 2025** account describes adopting Discord's Social SDK for chat, voice, friends and group channels. It discusses a nontrivial identity issue: one Discord account can represent multiple in-game avatars, requiring avatar metadata and careful handling of names and presence. [Official Discord integration article](https://playpaxdei.com/en-us/news/behind-the-scenes/tech-insights-discord-in-pax-dei)

Discord's **15 October 2025** case study, citing its July 2025 internal data, says voluntarily linked players logged **39% more Gameplay Days** than unlinked players and estimates a **19% overall increase** across the population. It does not disclose enough sample, control, or analysis detail to independently validate the causal attribution. More engaged players may also be more likely to link accounts. Treat this as encouraging vendor-reported evidence, not a guaranteed uplift for another game. [Discord's Pax Dei case study](https://discord.com/developer-case-studies/paxdei)

For Open Legend, the hypothesis worth retaining is that players need easy ways to find, recognize, trust, coordinate with, and return to other people. Building communication infrastructure from scratch is not automatically the best use of a small team's time. No particular integration is recommended without checking its current fit, platform support and permissions.

## 10. Modding, private servers, and player-created content

The FAQ welcomes non-cheating add-ons but offers no proper support. This establishes no mod-kit or player-hosted-server contract. [Official add-on position](https://playpaxdei.com/en-us/faq/tech)

This research did not locate a sufficiently current primary statement resolving private-server availability or future commitments. Historical secondary articles say private servers were unavailable and unplanned, but they are not used here to establish a permanent technical prohibition. Generic Nexus site news appearing under a Pax Dei category is also not evidence of a functioning Pax Dei mod ecosystem.

Native player construction, clan organization, role-play, and self-organized events are different from modifying executable game rules. Open Legend should compare those creative affordances separately: a world can have substantial user-created places and social stories without exposing its engine to mods.

## 11. Connection to Open Legend's research agenda

The essential architecture distinction is between **lasting state, active simulation, and shared encounters**. A house can persist while its doors, opponents, and scarce resources follow different interaction boundaries. Achieving one kind of continuity does not establish the others.

Product hypotheses and proposed tests are consolidated in **05-openlegend-lessons.md**. This chapter records evidence and engineering implications; it does not adopt a runtime architecture or implementation requirements for Open Legend.

## Sources, dates, and access limits

- All technical claims above use developer publications, a directly attributed developer interview, or partners describing their own work. Vendor case studies have commercial incentives and are labeled accordingly.
- The [behind-the-scenes index](https://playpaxdei.com/en-us/news/behind-the-scenes) dates the building article to 27 September 2024 and Discord integration article to 17 April 2025. Several individual pages omit dates, so article chronology and patch versions matter.
- The [1.0 shard announcement](https://playpaxdei.com/en-us/news/1-0/pax-dei-1-0-shard-list) lists five ordinary/RP launch shards plus the separate Arcadia public test world. It is a launch plan, not a verified current server census. Its test world was described as persistent and separately maintained.
- Mainframe links an [Unreal Fest 2024 presentation](https://playpaxdei.com/en-us/news/information/pax-dei-at-unreal-fest). The linked YouTube video could not be fetched in this research run. Do not claim a full video review or attribute unverified numerical claims from commentary about it.
- Eetu Martola links an [Everything Procedural 2025 world-generation presentation](https://www.sidefx.com/forum/topic/102453/?page=1). The forum post was readable; the video was not. The world-generation description above comes from the official world FAQ, not an invented transcript.
- Public evidence reviewed does not establish current p95 server tick time, exact hardware allocations, present per-instance population limits, database isolation details, consistency latency guarantees, hot-migration semantics, comprehensive cross-instance resource rules, or current infrastructure dollar costs.
- No publicly verified evidence found here establishes unrestricted terraforming or fully destructible persistent player settlements. Historical future plans must not be reported as shipped mechanics.
- **Date reconciliation matters:** world capacity, property ownership, instance limits, and Steam concurrency are different quantities. Building/location restrictions and recovery rules have also changed.


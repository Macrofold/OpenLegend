# Games that preserve individuals while reducing simulation work

| Field         | Status                                                               |
| ------------- | -------------------------------------------------------------------- |
| Research date | 2026-10-23                                                           |
| Status        | Completed desk research; no benchmark performed                      |
| Evidence      | Original developer articles, presentations, and firsthand interviews |
| Scope         | Comparative findings; no Open Legend architecture or code selected   |

An actor can have an individual identity and purpose without reconsidering everything every rendered frame. The cases below separate route computation, action execution, personal state, visual presentation, and distant-world simulation. Some retain specific individuals while reducing detail. Others aggregate remote populations or generate identity when a player first needs it. Those are different promises and should remain distinct when assessing what Open Legend can learn.

The scale figures below are attributed reports with their original scope. They do not predict Open Legend's performance, and older developer descriptions are not assumed to document every later version.

## 1. Factorio: avoid unnecessary searches before optimizing the searches

### Local movement and path request budgets

**Source:** Tomas, _Friday Facts #117 — Path Finder Optimisation I_, 2015-12-18. Official developer engineering article. [Primary URL](https://factorio.com/blog/post/fff-117).

The pathfinder processes a bounded number of search nodes per tick; overwhelming its request queue can leave enemy groups unresponsive despite stable frame rate. Profiling showed many very short routes. The developers reduced requests by asking blocking biters to move aside and by using direct local movement for assembling groups and returning to spawners. That cheaper movement follows around an obstruction and falls back to a real path search when it fails. In one profiled workload, search steps for paths of length at most five fell from nearly 10,000 to approximately 1,000. Separately, the number of path requests for paths of length at most 50 fell from nearly 1,000 to slightly above 200. These measure different parts of the workload, not a tenfold whole-game speedup or a portable capacity measurement.

**Research implication:** Responsiveness must be measured separately from frame rate. A smooth game can still have an overloaded AI queue. Real independent units can share congestion resolution and avoid searching for movements that cheap steering already handles.

### Reuse both successful and failed work

**Source:** Tomas/Oxyd, _Friday Facts #121 — Path Finder Optimisation II_, 2016-01-15. [Primary URL](https://factorio.com/blog/post/fff-121).

The developers describe a bounded cache of paths, retaining expensive-to-find paths preferentially. A new request can connect into a cached route, reuse its useful middle section, and leave it toward another destination; exact start-and-end equality is unnecessary. Unsuccessful searches are also cached so repeated unreachable requests do not continually repeat the same expensive failure. The article also explains why cheap local movement cannot replace a pathfinder completely: it can become trapped by obstacle geometry.

**Research implication:** Independent destinations do not imply wholly independent route computation. Repeated failure can become a larger cost than successful activity. Any transfer requires an explicit account of when cached results cease to be valid; this source is not sufficient to assert a particular invalidation implementation.

### An abstraction can guide an exact search without replacing it

**Source:** Oxyd/TOGoS/Klonan, _Friday Facts #317 — New pathfinding algorithm_, 2019-10-18. [Primary URL](https://factorio.com/blog/post/fff-317).

Units submit starts and destinations and may receive waypoints many ticks later. The replacement pathfinder uses connected land regions within 32-by-32-tile chunks to construct a compact connectivity model. This abstraction deliberately ignores entities, so it supplies a heuristic while the detailed search still handles real obstructions. The abstract search uses Reverse Resumable A\*: search from the destination, retain discovered state, and resume as further information is needed. Restricting the abstract topology to terrain avoids rebuilding it whenever an ordinary object changes; terrain changes such as landfill still matter. The motivation includes expensive long detours around water and bursts of distant enemy movement caused by artillery.

**Research implication:** Sharing a coarse approximation does not require treating the approximation as authoritative. That is a useful distinction when individual characters have routes whose validity still needs to respect their concrete world.

## 2. The Sims: rich state is distinct from continuous foresight

### Deep decisions and high-frequency presentation run separately

**Source:** Brian Bell, Maxis/EA, _Multi-Actor Behavior Sequencing in The Sims 4_, GDC 2014, 64-slide developer presentation. [Primary PDF](https://media.gdcvault.com/GDC2014/Presentations/Bell_Brian_Multi_Actor_Behavior.pdf).

Bell describes a simulation whose complex decisions can spike in cost while presentation must remain smooth. Path planning and animation selection belong to the simulation; high-frequency path following and animation playback belong to the renderer. Separate threads communicate through journaled operations. Channels associate Sims or objects with timelines, permit independent sequences, and synchronize dependent multi-actor interactions. The operation queue reacts to enqueues and barrier removal instead of actively ticking each queued operation. The presentation system preserves meaningful sequence integrity rather than skipping arbitrary steps to catch up.

**Limits:** This talk supplies a concrete separation of responsibilities, not a large-population performance benchmark. It does not prove that every visually smooth Sim is planning continuously, or that the same mechanism sustains thousands of rich agents.

### Reactive autonomy can still produce distinct personalities

**Source:** Firsthand interview with original _The Sims 4_ lead AI programmer David “Rez” Graham, Lauren Morton, PC Gamer, 2026-03-18. [Interview](https://www.pcgamer.com/games/the-sims/sims-dont-plan-anything-says-former-sims-4-developer-though-he-always-wanted-to-program-them-to-its-always-shot-down-rightfully-so/).

Graham describes Sims choosing the next objective on a cadence from motives, traits, and related state, rather than autonomously planning extended action sequences. He distinguishes this from the player's manually populated action queue. He also identifies player agency and the difficulty of communicating an invisible plan as reasons deeper planning did not persist in the projects he discusses.

**Limits:** Firsthand retrospective evidence, not an audited description of every current patch. The useful lesson is that behavioral richness, personal traits, and player-visible intent are different axes from long-horizon planning depth.

## 3. Kingdom Come: a concrete hundreds-of-brains developer report

### Behavior level of detail on console hardware

**Source:** Warhorse Studios' _Weekly Torch_, staff Q&A with programmer Tomáš “Bary” Barák, post #69, 2018-01-05. [Official forum post](https://forum.kingdomcomerpg.com/t/warhorse-studios-weekly-torch/29593/69).

Barák says the AI team added behavior levels of detail and could simulate more than 500 NPC brains in 10 milliseconds on PS4, separately mentioning thousands of smart/trigger areas and objects. AI runs on a separate thread; he says rendering was the bottleneck at that point. Elsewhere in the answers he describes AI, entities, and RPG work being parallelized while other operations remained serial.

**Limits:** This is a developer-reported subsystem number in a 2018 development context. It is not a published controlled benchmark of 500 fully detailed, simultaneously visible, animated and physically interacting actors, and does not include a reproducible workload. It nevertheless directly challenges the assumption that hundreds of individually purposeful NPCs inherently require a modern GPU cluster.

### Strong follow-up lead, limited access

**Source lead only:** Petr Smrček, _Supporting Thousands of NPCs in “Kingdom Come: Deliverance” & “Kingdom Come: Deliverance II”_, GDC 2026, scheduled 2026-03-10. [GDC schedule](https://schedule.gdconf.com/session/supporting-thousands-of-npcs-in-kingdom-come-deliverance-kingdom-come-deliverance-ii/915120), [GDC Vault](https://gdcvault.com/play/1035718/).

The indexed official abstract discusses AI levels of detail, frame-time and memory constraints, keeping the scripting interface largely independent of the LOD mechanism, and thousands of complex NPCs at 60 fps. The schedule page returned an error and the Vault page redirected to maintenance during this research. **The full talk was not reviewed.** Treat this as a high-value further source, not evidence for unobserved implementation details or an independent performance guarantee.

## 4. Dwarf Fortress: coarse populations and individual histories coexist

### Representation changes are part of the world model

**Source:** Tarn Adams, Bay 12 Games development log, 2013 entries. [Official archive](https://www.bay12games.com/dwarves/dev_2013.html).

The 2013-12-15 entry discusses nonhistorical population tracking across three representations: active play, abstract building/dungeon populations, and abstract site populations. It describes fixing duplication and promotes certain individuals to historical status. The 2013-12-23 entry covers continuity as the player approaches and retreats through site, building, and room resolutions; resuming a precise interrupted conversation was not the goal. The 2013-01-25 entry distinguishes army movement at coarse city, street, and tile resolutions, with much remote movement in fortress mode using simpler straight-line handling because city detail is unloaded.

**Limits:** Historical implementation evidence, not a full description of today's game. The world contains detailed individuals and recorded histories without every potential citizen being continuously represented and simulated at full local detail.

### Even a detailed simulation benefits from waiting for relevant changes

**Source:** Bay 12 Games release notes, 53.13, 2026-05-13. [Official current page](https://www.bay12games.com/dwarves/).

The release notes say zombies no longer reconsider their surroundings until disturbed. They also describe throttling repeated failing path attempts and announcing creatures whose pathfinding has been throttled.

**Research implication:** Event-triggered reconsideration and failure backoff are useful even where detailed individual simulation is a central product goal. The release gives no portable performance percentage for these changes. The current news page is mutable; the version/date identify the specific evidence.

## 5. Project Zomboid: explicit animal-herd aggregation

**Source:** The Indie Stone, _The Skillful HuntZman_, 2023-05-25. [Developer article](https://projectzomboid.com/blog/news/2023/05/the-skillful-huntzman/).

The article's in-progress wilderness system uses a virtual animal following authored paths to represent a group defined by species/group data, such as a buck, does, and fawns. Near the player, it materializes actual animals; far away, they become virtual again. A separated group's members can rejoin at path crossings. Timetables include activities such as eating and sleeping, while tracks, droppings, and disturbed vegetation make passage observable.

**What persists versus aggregates:** The remote representation carries group movement and schedule information and produces traces; the source explicitly does not describe one fully detailed remote mind for every animal. Individual animals become concrete near the player. **This is historical work-in-progress evidence, not a claim that the present shipped build has exactly these rules.** It is a particularly clear example of making a wilderness feel inhabited by simulating consequences and schedules at a coarser level.

## 6. S.T.A.L.K.E.R.: individual persistence with cheaper offline behavior

**Source:** Dmitriy Iassenev interview by Alex Champandard/Mathew Kumar, 2008-03-12. [Firsthand developer interview](https://www.gamedeveloper.com/game-platforms/interview-inside-the-ai-of-i-s-t-a-l-k-e-r-i-).

Iassenev distinguishes detailed online AI near the player from offline characters that omit animation, sound, active inventory management, and fine continuous paths while moving over a global navigation graph. The online radius was often approximately 150 metres, with designer/level variation. The system tracks both the player and remote characters when deciding transitions. He also distinguishes ambitious development experiments from the shipped system: the detailed artifact-seeking/trading example and earlier offline combat descriptions must not all be assumed to describe shipping behavior. The shipped game relied more on smart terrains assigning activities; he explicitly contrasts that with satisfying an individual's rich intrinsic needs and with genuine teamwork.

**Research implication:** Coarse simulation can preserve particular characters and their broad activities. It can also reduce behavioral richness. The presence of A-Life is not evidence of full offscreen cognition at local fidelity.

## 7. Watch Dogs: Legion: persistent individuals can be generated lazily

### The designer explains when identities become persistent

**Source:** Clint Hocking interview, Bryant Francis, Game Developer, 2019-06-27. [Firsthand developer interview](https://www.gamedeveloper.com/design/why-clint-hocking-wanted-every-npc-in-i-watch-dogs-legion-i-to-be-playable).

Hocking describes Census as a relational database that can start with an ordinary spawned NPC, fill missing personal details when the player profiles that person, and make the result persistent. The generated occupation, home, traits, animations, relationships, and related attributes must remain coherent with what the player already observed. Recruitment then adds a compatible narrative persona and presentation.

**Limits:** A pre-release interview, not a complete reverse engineering of the final persistence rules. It directly warns against interpreting an apparently enormous recruitable population as millions of pre-existing, continuously deliberating people. Lazy completion preserves continuity from observation onward; it is a different promise from everyone already having a fully simulated past.

### Production evidence for schedules and relational consequences

**Source:** Ubisoft, _Watch Dogs: Legion — The Tools That Built London_, 2021-03-30, featuring team lead programmer Christopher Dragert. [Official article](https://news.ubisoft.com/en-ca/article/4po3S9Pwp1YcgBmGPmQxAh/watch-dogs-legion-the-tools-that-built-london).

The account describes persistent characters with demographically coherent profiles, schedules appropriate to their roles, relationships, and affinity affected by the player's conduct. A player can follow a person through activities such as work and a gym visit; actions toward someone can affect relatives and future recruitment. The article emphasizes data generation, tuning/debugging, and integration across systems.

**Limits:** Its millions-of-possible-denizens framing does not measure simultaneous simulated brains. The source does not provide an active population budget, per-character CPU cost, or proof that all distant lives are executed moment by moment.

## 8. What these cases establish—and what they leave open

### A useful meaning of “individual”

There are several progressively stronger claims a simulation might make. A figure can be visually distinct. It can carry a stable identifier. It can retain its own needs, inventory, relationships, and goals. Its decisions can depend on its private observations and history. Its full trajectory can also be maintained when no player is watching. Satisfying one claim does not automatically satisfy the others.

This distinction matters for an open world. A town resident who resumes a valid personal schedule after a change in detail may remain an individual even if footsteps were not simulated while distant. A herd represented by one remote marker makes a different commitment: its aggregate movement is real in the model, but every member's detailed experience may not be. Neither result should be described simply as “all AI is real” or “all AI is fake.” The exact state and causal consequences preserved are what matter.

### Independence does not require isolated computation

Shared work can help individuals without replacing them with a single decision maker. Two characters can share a route segment while having different destinations. Many characters can execute the same kind of numerical rule against different personal state. A common schedule interpreter can act on unique schedules. A common piece of environmental information need not be recalculated separately merely to maintain personal identity.

The harder question is which distinctions the shared calculation must preserve. A route that is valid for one body size or movement ability might fail for another. A person may not know something that nearby characters know. Reusing a result is only faithful if its assumptions remain valid for the recipient. This is a general constraint on shared computation, not a chosen caching design for Open Legend.

### Continuity matters as much as speed

Reducing detail raises correctness questions that a population count alone cannot answer. Where does a character resume? What happens to carried items, promises, injuries, and unfinished interactions? Can two representations temporarily create the same person twice? Can a distant person arrive somewhere faster than the world permits? What happens if more than one observer watches different parts of the same activity?

The research value of world-simulation examples is therefore broader than their counts. They expose which details can be omitted, which outcomes survive, and how transitions can become part of the world's rules. Whether Open Legend may omit a detail depends on its own promise about personal histories and cognition; this panel does not choose that boundary.

### Research implications

The evidence supports examining hundreds of purposeful characters without assuming hundreds of complete plans every frame. It also supports treating visual fluency, immediate responsiveness, retained personal state, and deep reasoning as separate qualities. A smoothly animated character can be waiting too long for a meaningful decision, and a character using simple execution can still be following a genuine personal goal.

For animals, persistent dispositions, current activity, simple local responses, and occasional reconsideration are conceptually compatible with individuality. For cognitively richer people, additional costs include perception, memory, socially meaningful interaction, and deciding when an existing intention has become inappropriate. The papers on language-model agents examine that separate part of the problem; production game counts should not be read as a direct performance estimate for those workloads.

## 9. Transport and city simulations: individual journeys at different resolutions

### Cities: Skylines II: personal preferences and immediate traffic behavior

The official [Traffic AI developer diary](https://www.paradoxinteractive.com/games/cities-skylines-ii/features/traffic-ai), published 2023-06-26, describes routes scored by time, comfort, money, and behavior. Travelers' age groups weight these concerns differently; emergency vehicles have different permissions from ordinary travelers. Individual preferences can therefore produce different routes through a common network. The account distinguishes route selection from ongoing acceleration, braking, lane changes, and responses to incidents. It describes multicore execution and advertises no fixed limit on moving agents, with capacity constrained by hardware.

**Evidence limit:** This is a developer description and pre-release capacity claim, not a reproducible population/FPS benchmark. No hard-coded cap does not imply unlimited practical capacity or equal detail for every citizen. The company's [2026-09-03 performance update](https://www.paradoxinteractive.com/games/cities-skylines-ii/news/collected-questions) still identifies CPU pathfinding as a major challenge and says some improvements may require changes to simulation behavior. A rich individual transport model can remain computationally difficult after substantial parallelization.

### SUMO: movement integration and behavioral decisions need not share a clock

SUMO's official [Basic Definition documentation](https://sumo.dlr.de/docs/Simulation/Basic_Definition.html), updated 2026-02-13, specifies a default one-second simulation step. Its separate action-step setting controls how often vehicles calculate acceleration changes or lane-change maneuvers. Movement can therefore advance between those decisions. The documentation also gives the corresponding limitation: increasing action intervals beyond assumed reaction times can induce collisions; increasing the movement step can change behavior too. This is a concrete example of a computational shortcut whose validity depends on the model's assumptions, not merely on how smoothly motion looks.

Its [mesoscopic model](https://sumo.dlr.de/docs/Simulation/Meso.html), documentation updated 2026-10-09, preserves vehicles and routes while placing vehicles in queues. Exit times depend on traffic conditions, minimum travel time, and intersection handling. Lane changes and intersection behavior are coarser, and detailed instantaneous vehicle speed is not maintained as in the microscopic model. The documentation claims speeds up to 100 times the microscopic model, but the page supplies no matched workload and hardware benchmark supporting transfer of that ratio to another simulation.

**Research inference:** Coarse movement does not necessarily eliminate individual journeys. It does change which interactions the model represents. Queue-based transport can preserve who traveled where and when without preserving every steering correction. That distinction is relevant to persistent-world research even though road-constrained traffic differs from freely moving animals or people.

### MATSim: individual daily plans within a shared transport system

The [official MATSim overview](https://matsim.org/), accessed 2026-10-23, describes individual travelers moving through road and public-transport networks. Each agent attempts to improve its own day while being affected by others' activities and trips. An iterative optimization process produces transport behavior, and whole days are simulated at second resolution.

**Evidence limit:** Second resolution describes the simulation's time representation, not its wall-clock speed. The reviewed overview does not establish a particular population/runtime result or enough implementation detail to attribute specific queue structures. Its agents' daily plans are also different from open-ended personal cognition: the evidence concerns choices and interactions within a transport model. It should not be presented as proof that every traveler has unrestricted beliefs, memories, or conversational reasoning.

### What this comparison adds

These cases distinguish a person's retained journey from the calculation frequency and physical detail used to execute it. They also show why reducing work can change outcomes: reaction intervals, congestion, lane choices, and travel costs can affect who arrives and when. For Open Legend, the research question is which individual outcomes must remain faithful under simplification. A useful comparison must state both the saved computation and the information or interactions no longer represented. None of these sources alone supplies a capacity estimate for the project's intended actors.

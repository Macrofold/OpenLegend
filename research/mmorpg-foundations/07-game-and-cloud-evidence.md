# Lessons from games and cloud platforms

These cases answer “which assumptions are expensive to discover late?” They are not stack recommendations or a ranking by advertised player count. External factual summaries are deliberately narrow; the OpenLegend implications are engineering analysis. The [source register](sources.md) records exact provenance and limits.

## Ultima Online: query costs and architectural boundaries mattered

The original lead designer distinguishes two often-confused failures: the AI's radial-search/pathfinding cost and a closed resource loop disrupted by hoarding. He also describes substantial multiserver rearchitecture when expected concurrency increased [S08](sources.md#s08).

**Transferable lesson:** do not equate elegant world rules with affordable repeated discovery, and do not assume the prototype's world boundary can later be distributed by a hosting change. This supports early locality, ownership and work-accounting contracts. It does not imply that OpenLegend should remove ecology or use a particular search algorithm. Economic equilibrium is a separate design question from whether the engine can perform the work.

## EVE: honest overload, fan-out and scope-specific offload

The historical TiDi article explains deliberate slowdown as an alternative to work accumulating without useful timing [S04](sources.md#s04). The 2025 cosmetics report separately shows that moving presentation delivery out of the simulation required additional spatial tracking and internal traffic [S05](sources.md#s05).

**Transferable lesson:** report queue age and actual game-time progress; account for offload's new coordination cost; keep nonmechanical presentation separable. **Do not transfer:** EVE's clock rate, slowdown policy, cosmetic throughput or speculative future gains as OpenLegend capacity. A cosmetics benchmark cannot establish heavy NPC cognition or contested physical simulation throughput.

## Old School RuneScape: world-count growth still has shared dependencies

Jagex's August 2025 report says additional worlds required underlying infrastructure work and describes a planned expansion into cloud-hosted worlds [S06](sources.md#s06).

**Transferable lesson:** independent worlds are useful units of growth, but common account, save, routing and maintenance services still need bounded demand. This is a reason for world-scoped repositories and lifecycle admission now, not a demand for a production fleet before the first useful game. The report's future plans remain historical statements; this research does not verify their later rollout.

## Guild Wars 2: map-copy population management is a different product model

ArenaNet's megaserver introduction describes placing players into map copies with social and population considerations [S07](sources.md#s07).

**Transferable lesson:** useful placement policy can improve social density, but OpenLegend's independent evolved worlds are not interchangeable map copies. Filling spare capacity cannot silently replace the town where a player's friend, construction or historical consequence actually exists. Fresh-world creation can serve growth; it does not provide automatic overflow capacity for one already-lived history. Cross-world travel remains a separate product operation.

## Factorio: independence is more useful than indiscriminate threading

Wube explains how transport lines that cannot affect one another can be processed in parallel, while group changes and wake-ups require care [S09](sources.md#s09).

**Transferable lesson:** determine independence before dispatch; integrate interactions deterministically; include maintenance of grouping in the cost. This reinforces NSC's explicit phase/range approach. It does not justify assigning one actor or subsystem to a permanent thread or building a general dependency engine for every interval.

## Unreal: replication, residency and coordinate precision solve different problems

The replication graph retains reusable candidate structures [S10](sources.md#s10). World Partition streams level content using grid cells and streaming sources [S11](sources.md#s11). Large World Coordinates addresses precision through engine systems and interfaces [S12](sources.md#s12).

**Transferable lesson:** keep these concerns separate in OpenLegend too. A network relevance index is not personal knowledge; a streamed level is not distributed authoritative simulation; a large world coordinate is not proof that every provider preserves required precision. Borrow mechanisms where their contract fits, not an engine name as an architectural answer.

## AWS: hosting is not the simulation architecture

AWS's persistent-world guidance explicitly handles world lifecycle, session mapping and persistence [S01](sources.md#s01). Its current FAQ caps managed player sessions at 200 per game session, distinguishes custom session management, and points large partitioned MMOs toward custom EC2/ECS/EKS solutions [S02](sources.md#s02).

**Transferable lesson:** do not make a provider's game-session identifier, lifecycle or player limit the engine's definition of a world. For the working 1,000-player ambition, managed session APIs need deliberate fit evaluation. This is not a 200-player hardware limit and does not rule out AWS or all GameLift use. It is also not a reason to design the entire custom stack now.

AWS remains the existing qualification environment. Select instance topology, storage and orchestration from complete workload evidence later; do not assume a named vCPU count is equivalent to physical cores or that a faster native loop eliminates database, memory or network cost. Existing native design already treats those comparisons as conditional experiments.

## Google Cloud / Agones: process allocation is not cell authority

Agones distinguishes server allocation, pod scheduling and scale-down. Its packed policy is designed to cooperate with cluster autoscaling and avoid evicting active game servers by default; its documentation includes GKE integration [S03](sources.md#s03).

**Transferable lesson:** later infrastructure needs a truthful safe-to-drain/stop boundary supplied by the game. Autoscaling a fleet does not automatically transfer a cell's mutable state, preserve paid jobs, establish coherent time or resolve a cross-boundary effect. “Zero connected humans” is not a safe-to-stop proof for an admitted continuing world.

There is no need for a Google Cloud versus AWS cost contest or a multi-cloud abstraction today. Keep the core independent of process placement and provider sessions; use the current operating environment until a real requirement justifies change.

## General service and database evidence

Google's SRE chapters and AWS's backlog analysis support resource-sensitive admission, finite retained work and protection against overload feedback [S14](sources.md#s14), [S15](sources.md#s15), [S16](sources.md#s16). PostgreSQL's current versioned manuals support planning keys/query shapes and accounting for physical cleanup rather than assuming logical deletion immediately shrinks storage [S17](sources.md#s17), [S18](sources.md#s18), [S19](sources.md#s19).

**Transferable lesson:** a simulation-heavy game is also a long-running stateful service. Routine data handling, queues and maintenance deserve first-class budgets. **Do not transfer:** web-service degradation techniques that return partial/approximate truth where OpenLegend requires exact mechanical effects, or cloud products simply because a source uses them.

## Comparison boundary

This corpus does not claim to know every proprietary MMO implementation, reproduce a GDC talk unavailable in full, or establish a precise RuneScape/World of Warcraft-to-OpenLegend cost ratio. The user's heavier-simulation premise motivates a broader workload model; actual relative cost depends on executed mechanics, populations, fidelity and hardware. “Many more NPC interactions than human commands” is a reason to measure autonomous work independently, not an empirical performance coefficient.

The common lesson is not “copy a successful MMO's stack.” It is to identify the invariants that survive scale—identity, ownership, locality, time, bounded work, disclosure, durable effects and lifecycle—and qualify the workload those invariants must carry.

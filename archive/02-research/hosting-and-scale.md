# Hosting, multiplayer, persistence, and scale

Status: research and **unaccepted recommendations**; no infrastructure has been provisioned, purchased, or deployed. Checked September 18, 2026, America/New_York / September 19 UTC. Capacity figures below are proposed test workloads or arithmetic, not demonstrated performance. See [System architecture](../03-design-proposals/system-architecture.md) for the application boundaries and [Engines, art, and audio](engines-art-and-audio.md) for client choices.

## 1. A small first deployment with an explicit growth path

**Proposed:** one region, one authoritative simulation process containing one small sector, a browser build on a CDN, PostgreSQL persistence, an asynchronous AI worker, and object storage for approved assets. Add managed voice when text conversation works. Use Colyseus provisionally for room lifecycle and state transport; keep its types out of the core rules model. This is a small set of deployable processes, not a microservice per game subsystem.

| Responsibility | First deployable form | Why this boundary matters |
|---|---|---|
| Browser client and static assets | Versioned build on a CDN; lazy-load nearby content | Rendering consumes the player's GPU; asset delivery does not burden the simulation loop |
| Login, session, sector admission, entitlement checks | Small API, initially colocated with the server if convenient | Issues short-lived connection permissions and routes players to their sector |
| Simulation and WebSockets | One always-running Node/TypeScript process | Owns entities, movement, action validation, scheduled effects and permitted updates |
| AI orchestration | Separate worker; durable job table/queue | Slow inference, memory consolidation and retries never block movement |
| Durable state | Managed PostgreSQL, backups and restore procedure | Accounts, ownership, inventories, events, mechanics registry, memories and usage ledger |
| Asset storage | Object storage plus cacheable immutable URLs | Model files, sprite atlases, approved sound clips and manifest versions |
| Voice, later | Managed LiveKit transport; application-owned hearing policy | Avoid initially operating TURN and media infrastructure |
| Generated rule evaluation, later | Isolated bounded execution service | Untrusted generated code is not loaded into the authoritative process |

Redis is optional for the single-process proposal if the queue uses PostgreSQL. It becomes necessary for the documented Colyseus multiprocess arrangement. Do not introduce Kubernetes, a distributed database, a vector database service, or a global event bus merely because the eventual goal is large.

## 2. Practical host shortlist

These are documentation-grounded candidates, not capacity endorsements. Proposed first choice under the assumptions above: **a paid, single-instance Render web service plus managed PostgreSQL and a static CDN client**, with managed voice later. Railway is a close alternative. If Colyseus infrastructure friction dominates, evaluate Colyseus Cloud first instead. Fly becomes especially interesting when explicit machine/region placement is required.

| Candidate | Verified fit | Operational limitation and selection consequence |
|---|---|---|
| **Render** | Web services accept WebSockets without a fixed connection-duration cap. [WebSocket docs](https://render.com/docs/websocket) | Restarts/deploys disconnect sockets; reconnects can land on a random replica. A single instance is simple; adding replicas requires application-aware routing/state ownership, not just a scale slider. Render static sites use a global CDN. [Static site docs](https://render.com/docs/static-sites) |
| **Railway** | Public networking supports HTTP/1.1 WebSockets exempt from HTTP duration/inactivity limits. [Network limits](https://docs.railway.com/networking/public-networking/specs-and-limits) | Keep sector workers always on. Optional Serverless mode can cold-start and the first wake request may return 502; it applies across replicas. [Serverless docs](https://docs.railway.com/deployments/serverless) Verify sector-to-instance routing before multiprocess expansion. |
| **Fly.io** | Documents routing an HTTP/WebSocket connection to a specific machine using `fly-replay`. [Machine routing](https://fly.io/docs/blueprints/connecting-to-user-machines/) | More placement/routing control means more operational decisions. Machine root filesystems are ephemeral; durable world data must live elsewhere. [Volume overview](https://fly.io/docs/volumes/overview/) Keep an active sector warm and test restart/handoff behavior. |
| **Colyseus Cloud** | Managed infrastructure specifically for Colyseus applications, with required project/configuration conventions. [Cloud docs](https://docs.colyseus.io/cloud) | Strong direct candidate if Colyseus is selected. Confirm regions, resource limits, observability, persistence connectivity, background workers and total price before choosing. Hosting convenience does not implement world persistence or cross-sector transactions. |
| **LiveKit Cloud — adjacent media service** | Managed alternative to operating the open-source media server; cloud and self-hosted architectures differ. [Comparison](https://docs.livekit.io/transport/self-hosting/) | Provides media infrastructure, not world authority or hearing rules. Evaluate subscription restrictions, TURN use, fan-out, regional behavior, quotas and billing with the actual voice workload. |

Render explicitly discourages free instances for production; its free web services sleep after inactivity, and free PostgreSQL expires after 30 days without an upgrade. A free player tier must be funded by the product; it is not equivalent to free production infrastructure. [Render free-instance limitations](https://render.com/docs/free)

Discovery note: the Stripe Directory skill was consulted. Its exact attempted query was `websocket application hosting`, no filters, through `stripe directory search ... --format json`; the CLI was unavailable. No directory results are claimed. This shortlist was researched directly from the official sources above. No plugin or CLI was installed.

## 3. Multiplayer framework decision

**Colyseus:** a good proposed match for TypeScript, schema-based state updates and room-based sectors. Multiprocess scaling distributes rooms; a room still belongs to one process, clients connect to that owner, and the documented setup uses shared Redis presence/driver. More processes therefore increase room capacity, not automatically the capacity of one crowded square. [Colyseus scalability](https://docs.colyseus.io/scalability)

Colyseus per-client state views can reduce disclosure and bandwidth, but must be profiled: filtered state changes encoding cost, shared views can reuse work, and repeatedly entering/leaving a visibility boundary resends state. Use hysteresis around spatial boundaries. [State optimization](https://docs.colyseus.io/state/optimization) Do not put private thoughts, hidden inventory or distant actors in a public schema merely because the UI hides them.

**Nakama:** an alternative when built-in game backend features justify adapting the architecture. Its authoritative matches use custom server logic and individual match state on one node. The documentation marks cluster presence replication and match migration capabilities as Enterprise-only and describes match isolation; it is not a transparent shared-memory universe. [Authoritative multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/) Its broader product includes authentication/social/game services, so assess how much this replaces versus duplicates the proposed application backend. [Nakama overview](https://heroiclabs.com/nakama/)

**Custom WebSocket server:** minimal external coupling and maximum control, but the team owns reconnection, message schemas, filtering, admission, backpressure, instrumentation and client reconciliation. Consider this only if a tiny proof of concept shows Colyseus adds more friction than it removes. None of these choices eliminates application-specific persistence and durable interaction semantics.

## 4. Thousands of players: distinguish three capacities

Global connected players, players in one sector, and entities relevant to one client are different numbers. A design with 100 sectors each admitting 50 humans has an arithmetic ceiling of 5,000 humans; it is not evidence that any server or database can actually sustain that workload. It also says nothing about 5,000 people attending the same event.

NPC population, active thought rate, simultaneously speaking actors, construction/fire processes and visible object count also matter. A sector with ten humans and a thousand actively reasoning NPCs could cost more than one with fifty humans and quiet scripted background activity.

Use a spatial index and send nearby public state. Separate simulation rate from network patch rate and renderer frame rate. Candidate starting measurements: a 10–20 Hz movement loop, slower scheduled needs/effect updates, and event-triggered thought jobs. These values are hypotheses. Interpolate motion in the browser; validate reach, speed and collision at the server. A cached mechanical action should remain responsive even while an unrelated NPC is waiting for a model.

Reduce inactive-sector work with explicit lifecycle states: active near players, coarse scheduled simulation when unobserved, and persisted/suspended when appropriate. Offline aging, unattended fires and player survival are product decisions; optimization must not invent an unexpected death policy. Resume by a bounded catch-up calculation, not replaying millions of missed ticks or asking an LLM about every absent minute.

## 5. Parallel thought without conflicting world writes

Run many model calls concurrently against bounded, perception-filtered snapshots. Return proposals carrying entity IDs, relevant state versions, deadline, cost reservation, and idempotency key. The sector owner validates and commits them in a defined order. A worker never writes arbitrary world state directly.

For two agents trying to eat the last berry, both can think concurrently. Only one resource reservation/action commit succeeds; the other receives a changed-world result and chooses an alternative. Stale responses, dead actors, canceled conversations and migrated entities invalidate old proposals. Re-plan only when needed, with a retry limit.

Use separate concurrency/budget pools for player conversation, NPC social thought, semantic adjudication, memory work and asset generation. Prioritize current player interactions; defer dreams and background invention. Provide timeouts, circuit breakers and deterministic safe behaviors when a provider fails. Do not fan out every decision to several providers without charging the speculative calls to a measured budget. The exact semantic cache and generated-rule lifecycle belong in [Interaction protocol](../03-design-proposals/interaction-protocol.md) and [Capability lifecycle](../03-design-proposals/generative-capability-lifecycle.md).

## 6. Persistence, failure recovery, and sector transfer

Keep the live sector in memory with durable snapshots plus ordered committed events. Store consequential actions—ownership transfers, consumed items, deaths, new mechanics and economic transactions—durably with their identifiers and rule versions. Movement can use a declared checkpoint policy. A recoverable event records the resolved result and randomness needed for replay; recovery does not call an LLM to reinvent history.

Separate gameplay's short local event log from the internal diagnostic history. A nearby player can see “the wet wood failed to ignite,” but not an NPC's hidden private memories or every remote event. Bound retention and memory stores deliberately. Redis presence and a WebSocket connection are not backups. Restore testing must recover inventories, actor identity, time and registered mechanics together.

A proposed cross-sector transfer sequence:

1. Destination reserves capacity with an expiry; if full, the player stays safely in the source sector with a visible queue.
2. Source freezes cross-boundary actions and records a transfer ID, entity version and snapshot.
3. Durable ownership changes to the destination with a new fencing epoch. Old owners and late jobs cannot commit under the previous epoch.
4. Destination activates exactly once and acknowledges; the client connects using a scoped admission token and receives the new snapshot.
5. Source retires its live copy after durable confirmation. On crash/retry, recovery consults the durable transfer state; it never blindly reactivates both copies.

This is a protocol to design and test, not a claim that a room library supplies atomic migration. Initially use clear borders or gates and a short transition. Seamless cross-border combat, trade and perception require additional coordination; defer them. Database fencing must guard commits, not merely be an in-memory flag.

## 7. Voice transport and hearing permissions

Keep gameplay WebSockets and voice media separate. LiveKit can deliver selective tracks, including through server APIs, and tracks are subscribed automatically by default. Turning off automatic subscription alone does not prevent a modified client from requesting another track. [Track subscriptions](https://docs.livekit.io/transport/media/subscribe/) Publishers can restrict track subscription permissions. [Publishing permissions](https://docs.livekit.io/transport/media/publish/)

The required design is recipient-authorized delivery: the game computes eligible listeners from distance, obstructions, channel, consent/mute policy and current position; media permissions or isolated rooms enforce that eligibility; the client then applies panning and attenuation. Client volume set to zero is not confidentiality. Test hostile resubscription, newly published tracks, reconnection, listener movement and permission revocation. If the selected SDK cannot enforce a precise audience under adversarial clients, begin with explicitly joined conversation rooms or a trusted media relay rather than claiming strict proximity privacy.

For NPC speech, synthesize once per utterance and distribute only to authorized listeners; do not invoke TTS once per listener. Private audio URLs require scoped access, not permanent public CDN links. Transcribe a player's utterance once, then send semantic observations only to eligible agents. Show subtitles under the same hearing policy. Phones use a separate explicit channel; no real telephone network is required for in-world calls.

Self-hosted LiveKit distributed mode needs Redis and currently keeps each room on one node. Cloud uses a different architecture; do not transfer a self-hosted room limit or a cloud marketing capacity claim into the game's capacity plan. [Distributed self-hosting](https://docs.livekit.io/transport/self-hosting/distributed/) Operating media also requires appropriate UDP/TCP/TURN networking and certificates, unlike a static website. [Deployment requirements](https://docs.livekit.io/transport/self-hosting/deployment/)

Use short-lived, opaque room/participant identities and application-checked token issuance. Current LiveKit documentation distinguishes Cloud token revocation from self-hosted deployments and notes additional strict-revocation details; verify the exact server version before promising instant removal under reconnects. [Token lifecycle](https://docs.livekit.io/frontends/reference/tokens-grants/)

## 8. Costs to measure before pricing the game

Do not budget by registered accounts. Measure concurrent active sectors, CPU/memory per sector, active NPC decision rate, model tokens, cache hit rate, audio minutes, generated asset work, database writes, storage retention, egress and operational overhead. Fly's pricing, for example, separates compute, storage and network usage; a VM headline price is not a total game bill. [Resource billing dimensions](https://fly.io/docs/about/pricing/)

Useful planning relationships, with rates measured from real sessions:

- AI calls/second ≈ active agents × decision opportunities/second × probability of an uncached paid call, plus player requests and background jobs.
- AI spend ≈ sum of request-class call volume × observed cost/call, including retries, discarded speculation and failures.
- State egress ≈ concurrent clients × average authorized bytes/update × updates/second × time, plus joins, reconnects and protocol overhead.
- Voice delivery load ≈ concurrent speakers × average authorized listeners × encoded bitrate; billing units differ by provider.
- Sector count ≈ peak players / tested safe occupancy, with spare capacity and uneven-population allowance.

Set daily and per-session ceilings, queue limits and degradation order. Preserve movement, basic survival and known actions; postpone optional thoughts, generated cosmetics and background speech first. A player's paid interaction quota should reserve estimated cost before expensive work, then reconcile usage; retries must not double-debit. A subscription does not authorize unbounded underlying provider spend.

## 9. Load-test gates and staged growth

Proposed first workload: 16 connected human clients and 64 NPCs in one sector, with burst conversation, fire, movement, reconnect and model-timeout scenarios. This is a starting test shape, not a public promise. Colyseus provides a load-testing tool; bots must exercise actual state mutation and AI queues, not merely idle sockets. [Load testing](https://docs.colyseus.io/tools/loadtest)

| Gate | Evidence required before moving on |
|---|---|
| One useful sector | Stable multi-hour run; bounded memory/queue growth; responsive known actions; successful snapshot restore |
| More people in one sector | p95/p99 tick and serialization time; client frame time; bandwidth/client; visible entity counts; voice decode load on target devices |
| More sectors/processes | Verified ownership routing, deployment drain, reconnect and failed-transfer recovery; no duplicated items or actors |
| Public paid access | Cost/player-hour distributions; provider-outage behavior; entitlement/usage reconciliation; tested backups and rollback |
| Multiple regions | Measured demand/latency need; regional ownership and persistence plan; explicit cross-region travel behavior |

Provisional technical goals to debate: p99 simulation work below half its tick interval for headroom; ordinary action acknowledgment below 250 ms p95 within the chosen regional network; no unbounded queues; explicit UI feedback for slow semantic work. Measure speech time-to-first-audio separately from full response time. Product acceptance still needs real playtests.

Growth order: optimize one sector → increase tested occupancy cautiously → add sectors and processes with Redis/routing → separate saturated AI/media/storage responsibilities → add regions when latency or demand warrants it. Thousands globally becomes credible after these gates and workload measurements. A larger machine or another replica cannot compensate for an unbounded semantic-call policy or broadcasting every event to everyone.

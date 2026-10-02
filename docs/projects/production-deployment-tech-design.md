# Production deployment — technical design

**Status: recommendation, researched 1 October 2026; not implemented or capacity-certified.** Auth0 is selected by Mike. Base: [`b9a08a05`](https://github.com/Macrofold/OpenLegend/commit/b9a08a05b45edbda31154ad40bccd03c69c21cdd). Read the [feature specification](production-deployment-feature-spec.md) for promises and the [checklist](../maintainers/production-deployment.md) for delivery order.

## 1. Decision

**Use AWS as the primary platform. Launch on ECS Fargate On-Demand, RDS PostgreSQL with pgvector, Auth0, and S3/CloudFront. Keep the current Node/React/PlayCanvas stack and HTTP/SSE protocol. Buy no GPUs.** This minimizes changes to the application while preserving a route to EC2-backed fleets, regional cells and specialized inference.

This is not a claim that one Fargate task serves 100,000 players. AWS can remain the platform; world ownership, working sets, admission and data placement must evolve with measured demand. Do not deploy Kubernetes, a global database, Kafka, Redis, a separate vector database or a replacement multiplayer framework simply to appear production-ready.

## 2. Reconcile existing work rather than restart it

| Existing owner / reviewed evidence | Consequence for this design |
| --- | --- |
| [Current runtime](../architecture.md), [DF03](../maintainers/production-data.md), root README and package manifests | PostgreSQL-only; one database and data directory per world today. Do not copy older SQLite or shared multi-world database claims. No hosting fleet is demonstrated. |
| [MP01/MP04](../maintainers/multiplayer.md), [authentication.ts](../../apps/server/src/authentication.ts) | Keep server-side OIDC, scoped grants, control generations and private projections. Recorded real-provider evidence used Keycloak, not Auth0. No published branch named multiplayer or indexed Auth0 reference was located during this review; Mike's Auth0 choice is authoritative, but its deployment remains to verify. |
| [Production delivery/scale](../../archive/07-technical-architecture/data-delivery-and-scale.md) | Preserve D5/D6, the selected shared-world workloads, transaction semantics and regional transfer design. Its historical SQLite introduction is superseded by DF03. |
| [Scaling package at d2fa69bd](https://github.com/Macrofold/OpenLegend/blob/d2fa69bd8e0a8975ebe3f6976b875305c402a702/docs/scaling/README.md) and its [architecture](https://github.com/Macrofold/OpenLegend/blob/d2fa69bd8e0a8975ebe3f6976b875305c402a702/archive/02-research/massive-scale/target-architecture.md) | Reuse bounded cells, separate simulation/intelligence/control responsibilities, and G0–G4 sequencing. The branch is 104 commits behind this main baseline; its September 25 code audit is not current implementation evidence. This package adds concrete hosting/operations choices, not another SC/SF/LT backlog. |
| [AI providers](../ai-providers.md), [MW delivery](../maintainers/macrofold-worker-api.md) | Preserve Macrofold Worker, inference, scope and accounting contracts. Full cognition currently requires Macrofold; direct model access is not feature parity. |
| [Runtime art](../invention-art-pipeline.md), [3D asset pipeline](3d-pixel-art-asset-pipeline.md) | Instantiate their versioned publication/rights/fallback design with storage and delivery services. Do not replace their art semantics or claim the bundled mercenary implements production storage. |

The research branch is linked by immutable commit rather than copied or merged over newer code. On integration, promote these deployment-specific tasks under D5/D6; retain existing SC/SF/LT and subsystem task ownership.

## 3. Platform comparison

| Option | Assessment and decision |
| --- | --- |
| **AWS ECS Fargate → ECS on EC2** | Best initial fit: an ordinary persistent container around the existing server, managed database/storage, and no game-server SDK or Kubernetes migration. Fargate avoids host administration; EC2 becomes attractive when measured CPU performance, packing or steady utilization justifies managing hosts. Container replicas do not partition a world. |
| **Amazon GameLift Servers** | Serious growth candidate, not dismissed as match-only: AWS documents persistent-world hosting. Requires a supported server lifecycle/SDK bridge for the current Node build, placement and browser HTTPS/routing integration. Since June 15, 2026, eligible generation-6-and-later fleets include network bandwidth at no additional charge, including On-Demand/Spot, except China. Benchmark against ECS once player egress or fleet operations materially affects cost; this benefit does not make S3/CDN, databases or inference free. [1] [2] |
| **GCP: GKE + Agones, Cloud SQL and Cloud Storage/CDN** | Credible managed-cloud alternative, with Google-documented Agones support and production game examples. Choose if team expertise or measured regional economics favor it. It introduces Kubernetes/fleet operations we do not need for one world. Agones allocates servers; it does not implement game-state ownership or partitioning. Cloud Run is useful for stateless work, but streaming requests have timeouts and affinity is best-effort; it is not our default permanent simulation host. [3] [4] |
| **i3D.net / OVHcloud dedicated gaming servers** | Evaluate later for sustained regional CPU/network demand, not as a first dependency. i3D documents bare-metal/cloud hybrid operation and GameLift Anywhere integration. OVH's Game DDoS protection needs an appropriate protocol profile; do not assume a browser game's HTTP traffic receives every advertised game-specific protection. Compare actual player RTT/jitter/loss, CPU tails, local database placement, spares, support and operator labor—not just server rent. [5] [21] |

Keep the existing engine. A Colyseus/Nakama/Orleans or Unreal rewrite would introduce competing state/session models without establishing that the current owners are the bottleneck. Reconsider a framework only against a named missing capability and migration cost.

## 4. First deployment topology

```text
Browser ── HTTPS: auth, commands, scoped SSE ── ALB ── one active world task
   │                                                      │
   └── approved asset manifests/files ── CloudFront ── S3   ├── RDS PostgreSQL
                                                          ├── EFS save files
Auth0 ── verified server-side login callback ──────────────┤
                                                          └── admitted AI work → Macrofold/providers
```

Use **ECR images, TypeScript AWS CDK, GitHub Actions OIDC, Route 53/ACM, Secrets Manager/KMS, CloudWatch and OpenTelemetry**. Maintain separate production/nonproduction accounts and Auth0 tenants. Put tasks/database in private subnets across two availability zones; expose only the load balancer/CDN. Restrict origin access, security groups and task roles. Budget NAT, endpoints, cross-AZ traffic and logs explicitly. Deployment credentials are short-lived and restricted to the repository/environment; no permanent AWS key in GitHub. [6] [22]

Initially keep the built client and dynamic endpoints on the existing same-origin server, with large assets on CloudFront. Move hashed client bundles to the CDN when their release/rollback contract is ready. Never cache private API responses or SSE as public content. Public origin/Host handling must match the existing OIDC configuration.

Choose the first region from the launch cohort; `us-east-1` is a candidate, not a universal latency optimum. Start with measured task sizing, not a permanent machine specification. Fargate On-Demand is the default for the authoritative world; interruptible capacity is reserved for safely repeatable, non-authoritative work.

### Ownership and shutdown

**Never scale the current world by increasing identical service replicas.** Extend/reuse the storage-owned writer checks with a renewable owner generation before automated replacement can overlap writers. Every authoritative commit must reject an expired generation; health checks, desired-count=1 and load-balancer stickiness are not fencing.

Deployment sequence: stop new admissions, mark draining, reconcile/record pending work, commit recoverable state, release/fence ownership, activate the successor and reconnect clients. A killed task recovers from durable state, not from an assumption that shutdown finished. Fargate's configured stop timeout cannot exceed 120 seconds. ECS scale-in protection can protect draining tasks from selected scheduler actions, not crashes or every failure. [7] [24]

**Fence file writes too.** During the EFS bridge, do not activate a successor against the same mutable save directory until the old writer is confirmed stopped. If termination is uncertain, keep that world unavailable rather than permit conflicting writes. A database lease cannot revoke an existing NFS writer. A later nonblocking takeover needs generation-namespaced immutable artifacts and publication through fenced metadata, or an equivalently qualified storage protocol; a shared mount alone does not supply it.

### Database and current save files

Use an RDS PostgreSQL supported **18.x GA minor plus supported pgvector**, verified in the chosen region and against repository queries. Public production should use Multi-AZ; its synchronous standby is a recovery facility, not extra read capacity, and commit latency must be measured. Keep bounded database pools per service/world cohort, never per player or NPC. Use primary reads for permissions, inventory and read-your-writes; consider replicas/analytics isolation only for explicitly stale-tolerant reads. [8] [23]

For the fastest safe pilot, mount a **Regional EFS access point for the world's existing save directory**, with IAM, encrypted transport and restrictive filesystem permissions. Fargate scratch storage is disposable. EFS is a compatibility bridge for current checkpoint files—not the asset CDN, a database disk, or permission for concurrent world writers. Qualify the application's rename/write/crash behavior on that filesystem. [9]

Add a native S3 checkpoint adapter later when operational evidence justifies replacing this bridge. Do not turn S3 into a pretend POSIX filesystem. Existing `.data` backups alone omit canonical PostgreSQL records.

## 5. Auth0, accounts and network delivery

Configure an Auth0 **Regular Web Application**, Universal Login and the existing server-side authorization-code + PKCE flow; exact HTTPS issuer/callback/logout origins, no wildcard trust. Retain `openid-client`, browser-bound one-use state/nonce and application sessions in secure HttpOnly cookies. Keep provider tokens/secrets out of browser state and world saves. Review CSRF/Origin checks, cookie policy, CSP and account recovery before external access. [10] [35]

Keep `(issuer, subject) → internal account → world grants → actor/control` separate. Auth0 authenticates; the game authorizes. Implement audited invitation/signup provisioning, character admission, suspension/revocation, explicit account linking, deletion/export and operator MFA. Email/name equality never grants ownership. Bootstrap environment bindings are not a scalable account-management product. Keep grants, privacy restrictions and financial receipts outside gameplay rewind.

**Verified scaling seam:** `authentication.ts` retains up to 256 pending logins for five minutes in process memory. Before multiple authentication frontends, move one-use transaction state into a bounded shared TTL store through PostgreSQL initially; retain atomic consumption and browser binding. Do not rely on sticky routing to survive restarts. Current numeric settings remain in the [multiplayer inventory](../limits/multiplayer.md), not a new global login promise.

Select the Auth0 production plan using monthly active identities, login bursts, endpoint quotas, support and recovery needs—not concurrent game connections alone. Coordinate provider load qualification. Use **SES as Auth0's production email provider**, with verified sending domain, production access and delivery monitoring; exercise verification/recovery flows on real mailboxes. [11] [25]

Keep **HTTP commands + SSE** for launch. Use idempotency receipts, audience-scoped stream cursors, bounded per-client queues, jittered reconnect and fresh scoped baselines when replay is unavailable. Heartbeats must fit the configured ALB idle timeout; verify proxy buffering and HTTP/2 behavior. Slow clients must not block the world. A future WebSocket/WebTransport experiment needs measured benefit, protocol compatibility and the same privacy/authority rules. [12]

## 6. Production assets, not repository downloads

| Material | Storage and ownership |
| --- | --- |
| Blender/source textures, references, licenses and provenance | Private versioned S3 art storage plus the artist workspace; references are not automatically licensed to ship. |
| Approved models, textures, sprites, animations and audio | Immutable content-addressed S3 objects through CloudFront; separately published from the application. |
| Identity, exact versions, rights, dependencies, validation and publication receipts | PostgreSQL metadata through the existing appearance/art owners. |
| Engine/import scripts, small authored manifests, essential fallback art | Git. Local downloaded library files live in an ignored cache. |

**First vertical slice:** publish a rights-approved mercenary runtime bundle; create its exact asset/version manifest; resolve it through authorized server metadata; load from the CDN with cache/fallback; verify a clean checkout and a clean browser; then stop adding large runtime binaries to Git. No history rewrite or deletion of current art is authorized here.

Use the existing narrow **GLB/glTF 2.0** profile. Pin **glTF Transform** for inspection/deduplication/texture preparation and **Khronos glTF Validator** for structural checks; neither replaces semantic/rights review. Qualify Basis/KTX2 texture output and Draco compression against the installed PlayCanvas loader and target devices before enabling them. Do not blindly use a tool's Meshopt/default optimization preset when the client extension/decoder path is unverified. Ship required decoder/WASM versions with the approved release. Compressed download size is not decoded CPU/GPU memory usage. [13] [26] [27] [28]

For curated content, this can initially be an approved CI/CLI publishing job. Runtime-generated content later uses the existing durable art job/attempt contracts: private quarantine → bounded trusted conversion → validation/review → verified immutable bytes → compare-and-swap manifest publication. Reject executable content, unsafe external references, oversized/decompression-heavy outputs and unapproved extensions. Conversion runs outside the simulation process's hot work; provider URLs are temporary inputs, not durable assets. Preserve paid-attempt receipts and never regenerate automatically after uncertain completion.

The browser receives only permitted manifests and prioritized current/nearby-scene assets. Share compatible textures/rigs, reuse instances, bound download/decode/cache/VRAM work, dispose resources and reject late loads after scene/identity changes. Evaluate LODs and fallback representations on real low-memory devices; never use missing graphics as evidence that a physical object does not exist.

Use CloudFront **origin access control** to prevent direct S3 bypass. Approved public assets may be publicly cacheable; restricted content needs separately authorized short-lived signed URLs/cookies and appropriately scoped metadata/cache identities. Origin privacy alone is not viewer authorization, and a hash is not an access grant. Already downloaded bytes cannot be revoked from a hostile client. [14] [33]

Saves and released packs pin exact permitted dependencies. Garbage collection must account for all retained pins and an interrupted publication; a rights/privacy takedown follows its explicit override/tombstone policy. Keep the prior working version for rollback. Better art does not mutate collision, ownership or an entity's current state.

## 7. Inference and GPU decisions

**Managed execution first; no owned GPUs and no permanent process per NPC.** Preserve native continuation, scoped recall, judgment and generation through [the current AI boundary](../ai-providers.md). Full cognition uses the configured Macrofold Worker. OpenLegend does not create, resume, replace or destroy shared Workers; its operator must separately qualify upstream capacity, isolation, region, support, idle policy and billing.

Use bounded admission classes for player dialogue, autonomous decisions, reflection/maintenance and art. Apply per-account/world fairness plus global concurrency, queue age and reserved-spend controls. Native simulation does not wait on a model. Persist attempt identity before dispatch, reconcile unknown outcomes, and revalidate relevant authority/timeline/state before publication. A queue transport such as SQS may be added when separate workers need it; it does not replace the existing durable job/receipt owner or provide exactly-once paid execution. Model output remains untrusted; executor tool/network grants must not expose database administration or unrelated private worlds.

Keep the currently qualified model routes initially. Benchmark smaller models for narrow tasks and stronger models only where their quality gain warrants cost. Bedrock and Vertex are credible alternative managed delivery paths, not automatic replacements for Macrofold's full harness. Request/token quotas, regional availability and reserved-throughput terms need explicit qualification; cross-region inference must match the selected data-residency policy. [15] [29] [30]

**Rent a GPU before buying one.** When sustained demand and quality evidence justify it, evaluate a pinned **vLLM service on rented AWS GPU compute** behind the existing adapter. Start with a model that fits one GPU where practical. Size for weights **plus KV cache, input lengths, concurrent sequences and spare capacity**; throughput-only benchmarks are insufficient for interactive dialogue. Separate interactive and batch scheduling, stage model upgrades, protect the serving network and budget redundancy/operations. Multi-node model parallelism is a later necessity, not an initial design goal. [16]

Self-host only when its measured total cost per useful, quality-passing response beats the managed path at the required latency and availability. Include idle/spare GPU hours, storage/egress, staff, failures, evaluation and model-license constraints. Hardware purchase additionally needs a stable workload, power/network/colo plan and replacement capacity. Player count alone establishes none of these.

## 8. Recovery, releases and operations

RDS Multi-AZ is not a backup; a gameplay save is not a disaster-recovery plan. Enable database point-in-time recovery and protected file/object backups, with a separately controlled recovery copy where permitted. Maintain a **coherent recovery manifest** covering database boundary, retained files, asset pins, build/schema/content versions and operational records. Independently timed filesystem and database snapshots are not automatically coherent.

Initially use an announced quiesced backup/export through the existing operational owner; later qualify online capture. Restore into a fresh isolated environment and verify identities, inventory, memories, current privacy/grants, content pins and uncertain AI receipts before opening traffic. Restoring an old gameplay timeline must not revive spent money or deleted access. Approve RPO/RTO by failure class before launch; measure time to usable gameplay, not merely a healthy database.

Promote immutable image/content digests from staging to a canary world. Define client protocol, server schema, world-module, asset and pending-job compatibility as a release set. Drain stateful owners instead of ordinary overlapping web-service rollout. A code rollback cannot undo incompatible data changes. The development no-migration policy remains in force until an explicitly approved production policy changes it.

Instrument join/command/commit/render latency, event-loop/GC debt, database waits/WAL, observer fanout, SSE bytes/backlog, cold loads, asset failures/VRAM, inference queue/latency/stale outcomes and spend. Use bounded metric labels; account/actor IDs belong in access-controlled sampled diagnostics, not unlimited metric series. Do not log private prompts, tokens or whole worlds by default.

Before public access, provide alert ownership/on-call cover, status communication, restore and rollback drills, support contact, report/mute/block/ban workflows and audited operator tools. Server-side action/resource/rate validation is the browser game's anti-cheat foundation; WAF/DDoS controls do not replace it. Review UGC rights, AGPL/third-party obligations, privacy/retention, age policy and launch territories with appropriate counsel. These are release decisions, not claims of compliance.

Payments, a marketplace and voice can remain disabled. For initial web purchases, **Stripe Checkout** is the recommended later integration, with verified/idempotent webhook fulfillment and a ledger outside game rewind; settle refund/chargeback and creator-payout policy before enabling it. Never grant paid entitlements merely from a browser success redirect. Before voice, qualify a separate managed media path such as **LiveKit Cloud**, server-enforced recipient permissions, recording/consent/deletion and TURN/egress costs. Inspect room/track metadata as well as received audio; use scoped rooms where necessary. Muting audio locally is not confidentiality. [17] [36]

## 9. Capacity, cost and the scale path

Retain the [selected workloads](../../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product): first release **100 humans, 100 agents, 100 animals and 1,000 other objects**, with half of each in one scene; growth **10,000 concurrent humans**, with **200 humans and agents combined** in the local scene and an explicit animal/object/activity profile. These are unqualified targets, not stored-content ceilings.

| Stage | Architecture change | Promotion evidence |
| --- | --- | --- |
| Pilot → qualified first release | One recoverable world; bounded native/AI/client work; infrastructure above. | Real Auth0/browser mixed play, dense scene, aged history, sustained load, failure/recovery and measured spend. |
| Many worlds / 50k–100k registered or monthly users | A durable world directory, separate account/control entry point, provision/admission lifecycle and placement across world tasks/database cohorts. | Peak CCU, active-world skew and unattended simulation demand measured independently of account count. |
| 10k shared-world concurrency and beyond | Bounded regional working sets, then fenced region authorities; partition storage only after CPU/transaction evidence requires it. | Existing D6 crossing, perception/time, contested-resource, inventory and recovery gates. Many independent worlds do not qualify this target. |
| 50k–100k concurrent players across a fleet | Replicated regional cells with bounded databases, connection gateways and warm/failover headroom; select ECS/EC2 versus GameLift on measured total economics. | Capacity and quota tests including reconnect storms, one-cell failure and the largest promised hot world/scene. |
| Millions of players | Repeat qualified cells/regions; global discovery/social projections, regional write ownership and explicit cross-cell protocols. | Per-cell cost/reliability, control-plane survival, migration and global-service bottlenecks; no single crowd-capacity inference. |

A **cell** is a bounded failure domain; a **world** is a persistent simulation identity; a **region** is a possible authority subdivision. Do not equate any of them with a VM, database instance or account. Current per-world databases can initially share an RDS deployment with bounded pools. Before database-per-world catalog/migration overhead becomes material, implement the existing `world_id`-scoped repository target and consolidate bounded world cohorts into shared shard databases. This requires query/isolation and migration qualification; merely pointing today's isolated-world clients at one database is unsafe. Millions of worlds must not imply millions of RDS instances, permanently open databases/connections or always-running processes.

Route through `worldId → home region/cell/owner generation/endpoint/build/admission state`. Move data and authority without renaming accounts/entities. Within a hot shared world, place tightly interacting state together; transfer an actor and required belongings through the existing durable prepare/commit-or-abort design. Never activate both source and destination after an ambiguous timeout. Keep real-time writes near their authority rather than requiring an intercontinental transaction for every move.

Preserve required witnesses and outcomes while sharing public relevance work and loading cold state selectively. Private player/guild domains are permission boundaries, not a license to clone unique NPCs or erase distant relationships. Empty-world scheduling and any lower-detail continuation require the existing clock/world contracts; hosting cannot silently change fictional time.

### Cost model to fill from the qualification run

`monthly cost = simulation + connection/edge + database/I/O/backups + asset/storage/egress + inference/Worker allocation + observability + support/on-call`.

Record peak/average CCU, active and unattended worlds, hot-scene density, bytes/player-second, history growth and model request/token distributions. Useful arithmetic: **10 kB/s per player at 100,000 CCU is 1 GB/s, or 3.6 TB/hour** before overhead. That is why the GameLift bandwidth change matters. Separately, 1,000 active players each causing one model request/minute produce about 16.7 requests/second; at 20 seconds mean completion time, about 333 requests are in flight before headroom. These are illustrative assumptions, not predicted OpenLegend traffic. [2] [34]

Compare cost per active player-hour and per world-day, including idle worlds. Count provider charges, Macrofold shared allocation and uncertain reservations once; per-agent allowances do not cap fleet spend. Price the measured bill of materials with current region/plan rates before provisioning, and obtain Auth0/provider/cloud quotas before a launch event. No defensible monthly bill or GPU count follows from an unspecified “100,000 users.”

## 10. What deployed games teach us

**New World (AWS engineering account, 2022):** its described architecture separated public entry points, simulation hubs and persistence, with dynamic spatial responsibility. Borrow the ownership/handoff lesson, not its database stack or population numbers as proof for LLM-driven NPCs. [18]

**Old School RuneScape (Jagex, August 2025):** whole-world authority and regional hosting remained useful, while VM contention, shared backend capacity and specific expensive content affected performance. Borrow workload profiling and deliberate CPU placement; do not copy its 0.6-second tick or equate its scripted NPCs with our cognition workload. [19]

**Supersolid / Google's browser multiplayer example:** GKE/Agones is a real deployment route, but server allocation remains separate from game-state correctness. **EVE's historical time-dilation design** demonstrates that one dense interaction can require explicit overload policy; it does not authorize changing OpenLegend's clock. [20] [31] [32]

## Maintained records

- Implementation: [PD delivery](../maintainers/production-deployment.md); [D5/D6](../maintainers/production-data.md), [MP](../maintainers/multiplayer.md), [PF](../maintainers/performance.md), [SL](../maintainers/save-and-load.md), [MW](../maintainers/macrofold-worker-api.md), [INV](../maintainers/inventions-and-world-evolution.md) and [V3D](../maintainers/3d-pixel-art.md) retain their semantic work.
- Limits and constraints: [Deployment inventory](../limits/production-deployment.md); existing feature limits remain controlling.
- Related contract: [Feature specification](production-deployment-feature-spec.md).

## Sources

Primary sources checked 1 October 2026. The numbered links above point directly to the sources below. Vendor features/prices must be rechecked at implementation; historical case studies describe their stated dates. Recommendations and application to OpenLegend are this design's synthesis.

[1]: https://aws.amazon.com/blogs/gametech/host-persistent-world-games-on-amazon-gamelift-servers/
[2]: https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-gamelift-servers-free-network-bandwidth/
[3]: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/agones-support
[4]: https://docs.cloud.google.com/run/docs/triggering/websockets
[5]: https://www.i3d.net/amazon-gamelift-anywhere-hybrid-hosting-integration-i3d-net/
[6]: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
[7]: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html
[8]: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
[9]: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-best-practices.html
[10]: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow/add-login-auth-code-flow
[11]: https://auth0.com/docs/troubleshoot/customer-support/operational-policies/rate-limit-policy
[12]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
[13]: https://developer.playcanvas.com/user-manual/optimization/texture-compression/
[14]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-overview.html
[15]: https://docs.aws.amazon.com/en_en/bedrock/latest/userguide/quotas-runtime.html
[16]: https://docs.vllm.ai/en/latest/serving/parallelism_scaling/
[17]: https://docs.livekit.io/transport/media/subscribe/
[18]: https://aws.amazon.com/blogs/gametech/the-unique-architecture-behind-amazon-games-seamless-mmo-new-world/
[19]: https://secure.runescape.com/m=news/more-worlds-more-power-the-road-to-greater-capacity?oldschool=1
[20]: https://www.eveonline.com/news/view/introducing-time-dilation-tidi
[21]: https://docs.ovhcloud.com/en/guides/bare-metal-cloud/dedicated-servers/firewall-game-ddos
[22]: https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-typescript.html
[23]: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html
[24]: https://aws.amazon.com/blogs/containers/announcing-amazon-ecs-task-scale-in-protection/
[25]: https://auth0.com/docs/customize/email/smtp-email-providers/amazon-ses
[26]: https://gltf-transform.dev/
[27]: https://github.khronos.org/glTF-Validator/
[28]: https://developer.playcanvas.com/user-manual/assets/supported-formats/
[29]: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/resources/throughput-quota
[30]: https://docs.aws.amazon.com/en_en/bedrock/latest/userguide/cross-region-inference.html
[31]: https://cloud.google.com/customers/supersolid
[32]: https://cloud.google.com/blog/products/containers-kubernetes/making-online-containerized-games-with-managed-services/
[33]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html
[34]: https://aws.amazon.com/gamelift/servers/pricing/
[35]: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/add-login-using-the-authorization-code-flow-with-pkce
[36]: https://docs.stripe.com/webhooks

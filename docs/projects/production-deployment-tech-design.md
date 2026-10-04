# Production deployment — technical design

| Status      | Current progress                                                                                                            | Last updated |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Not started | The hosting design is researched, but cloud packaging, deployment, hosted Auth0 and production recovery remain unqualified. | 2026-10-04   |

**Status: recommendation, researched 1–2 October 2026; not implemented or capacity-certified.** Auth0 is selected by Mike. Runtime baseline: [`b9a08a05`](https://github.com/Macrofold/OpenLegend/commit/b9a08a05b45edbda31154ad40bccd03c69c21cdd); the production branch at `ca804cc8` was reviewed for this update. Read the [feature specification](production-deployment-feature-spec.md) for promises, the [checklist](../maintainers/production-deployment.md) for delivery order, and the [implementation playbook](production-deployment-playbook.md) for packaging, commands, CI/CD and release procedures.

## 1. Decision

**Prefer AWS for the first deployment: ordinary ECS Fargate On-Demand, RDS PostgreSQL with pgvector, Auth0, and S3/CloudFront. Keep the current Node/React/PlayCanvas stack and HTTP/SSE protocol. Buy no GPUs.** This is a modest operational-fit recommendation, not evidence that AWS is cheaper, faster or more scalable than GCP. Fargate supplies a managed persistent-container starting point without requiring Kubernetes or a game-server SDK. The application must still implement safe ownership, recovery and deployment.

**GCP is a credible long-term alternative.** Compute Engine does not require Kubernetes; GKE Autopilot reduces node management and supports Agones with constraints. Cloud SQL/PostgreSQL and Cloud Storage/CDN cover the corresponding data/asset needs. Stronger GCP expertise, a materially better commercial offer, or measured regional performance can reverse the preference. No equivalent OpenLegend workload has been benchmarked on either cloud. Avoid dual-cloud operation at launch merely to preserve an option. [3] [37] [38] [51]

This is not a claim that one Fargate task serves 100,000 players. Either cloud can be the platform while world ownership, working sets, admission and data placement evolve. Do not deploy Kubernetes, a global database, Kafka, Redis, a separate vector database or a replacement multiplayer framework simply to appear production-ready.

## 2. Reconcile existing work rather than restart it

**[Current runtime](../architecture.md), [DF03](../maintainers/production-data.md), root README and package manifests:** PostgreSQL-only; one database and data directory per world today. Do not copy older SQLite or shared multi-world database claims. No hosting fleet is demonstrated.

**[MP01/MP04](../maintainers/multiplayer.md) and [authentication.ts](../../apps/server/src/authentication.ts):** Keep server-side OIDC, scoped grants, control generations and private projections. The original entry/maintenance evidence used Keycloak. [October 3 local completion](auth0-sign-in.md#authorized-local-integration-continuation--october-3-2026) subsequently demonstrated real Auth0 sign-in/control and scoped local AI operation; it does not qualify the remaining two-account invitation/access-removal matrix or hosted deployment. The delivered [entry and maintenance project](completed/multiplayer-entry-maintenance.md) already supplies characterless roles, one-use invitations and scheduled maintenance. [IDP01–IDP03](../maintainers/multiplayer.md#identity-provider--auth0) own the remaining local two-account checks, hosted Auth0 configuration and provider logout; the initial search limitation is not evidence that these plans are missing.

**[Production delivery/scale](../../archive/07-technical-architecture/data-delivery-and-scale.md):** Preserve D5/D6, the selected shared-world workloads, transaction semantics and regional transfer design. Its historical SQLite introduction is superseded by DF03.

**[Scaling package at d2fa69bd](https://github.com/Macrofold/OpenLegend/blob/d2fa69bd8e0a8975ebe3f6976b875305c402a702/docs/scaling/README.md) and its [architecture](https://github.com/Macrofold/OpenLegend/blob/d2fa69bd8e0a8975ebe3f6976b875305c402a702/archive/02-research/massive-scale/target-architecture.md):** Reuse bounded cells, separate simulation/intelligence/control responsibilities, and G0–G4 sequencing. That branch was 104 commits behind the initial main baseline; its September 25 code audit is not current implementation evidence. This package adds concrete hosting/operations choices, not another SC/SF/LT backlog.

**[AI providers](../ai-providers.md) and [MW delivery](../maintainers/macrofold-worker-api.md):** Preserve Macrofold Worker, inference, scope and accounting contracts. Full cognition currently requires Macrofold; direct model access is not feature parity.

**[Runtime art](../invention-art-pipeline.md) and [3D asset pipeline](3d-pixel-art-asset-pipeline.md):** Instantiate their versioned publication/rights/fallback design with storage and delivery services. Do not replace their art semantics or claim the bundled mercenary implements production storage.

**[Package scripts](../../package.json), [server entry](../../apps/server/src/main.ts) and [CI](../../.github/workflows/check.yml):** The server runs TypeScript through tsx; build produces client output, not a compiled server. Existing shutdown handling needs container qualification, not replacement by assumption. CI uses PostgreSQL 16 while this design targets qualified PostgreSQL 18. The playbook makes these concrete PD02/PD04/PD09 prerequisites.

The research branch is linked by immutable commit rather than copied or merged over newer code. The deployment-specific PD tasks are now integrated under D5/D6; retain the separate historical scaling proposal and current subsystem task ownership. A named side-branch plan is not delivered runtime or a second active owner by implication.

## 3. Platform comparison

**AWS ECS Fargate.** Preferred launch fit, not a measured winner. Run the existing server in an ordinary container without host administration, Kubernetes or a new game-server SDK. Keep ownership and persistent data outside task lifetime. No claim of uninterrupted process life or world capacity follows from managed hosting.

**ECS Managed Instances / ECS on self-managed EC2.** Compare when CPU choice, packing, GPU access or steady utilization matters. Managed Instances adds EC2 choice with AWS-managed hosts; include whole-instance utilization and its management fee, not just task resource requests. Self-managed EC2 provides more host control at greater operational cost. Neither partitions game state. Managed capacity still undergoes scheduled replacement. [39] [40]

**ECS Express Mode.** Useful simplification for eligible web services, not the initial world owner. Custom task definitions are supported, but current Express Mode uses canary deployments exclusively and requires an ALB. Request splitting between two independent live copies of one world is unsafe. Prefer normal ECS/CDK for the world; consider Express for a later stateless service only after its constraints fit. [41] [42]

**Amazon GameLift Servers.** Serious growth candidate, not dismissed as match-only: AWS documents persistent-world hosting. Eligible generation-6-and-later fleets include network bandwidth at no additional charge from June 15, 2026, including On-Demand/Spot, except China. This benefit is not included in ordinary ECS/EC2 hosting and does not make S3/CDN, databases or inference free. Qualify lifecycle integration, browser HTTPS/routing and persistent-world recovery before comparing total cost. [1] [2] [34]

**GCP Compute Engine, including stateful managed instance groups.** Straightforward non-Kubernetes alternative around the same application, with more VM/container host configuration than Fargate. Managed replacement or preserved disks do not prove exclusive world ownership or coherent recovery. Cloud SQL and object/CDN delivery remain managed. This is the fairer small-deployment comparison than assuming every GCP launch needs GKE. [37] [51]

**GKE Autopilot + Agones.** Credible managed fleet path with production examples; Agones supports Standard and Autopilot and recommends Autopilot when its constraints fit. Qualify scheduling, resource, port and long-session disruption restrictions. It manages allocation, not game-state partitioning or conserved-resource transfers. Choose for existing Kubernetes expertise or demonstrated fleet value, not merely for a future player count. [3] [38]

**Cloud Run services / Cloud Run instances.** Distinguish the products. Services support streaming with bounded request duration and best-effort affinity; a request timeout is not proof the simulation process restarts hourly. Instances, introduced August 2026, provide singleton addressable runtimes but are Preview, use shared CPU/burst budgets and have a bounded continuous runtime. Evaluate them for suitable workloads, but do not select a preview/bursty-CPU environment for the authoritative launch world without production support and sustained-load evidence. [4] [43] [44]

**Azure PlayFab Multiplayer Servers.** An established managed alternative for custom containerized servers, not an indie-only platform. It still needs lifecycle/allocation integration and the same world persistence/authority work. Keep it as an alternative when Azure expertise or commercial terms justify another evaluation, not a third launch cloud. [45]

**i3D.net / OVHcloud dedicated gaming servers.** Evaluate later for sustained regional CPU/network demand. i3D documents bare-metal/cloud hybrid operation and GameLift Anywhere integration. OVH's Game DDoS protection requires an appropriate protocol profile; do not assume every advertised game-specific protection covers browser HTTP traffic. Compare player RTT/jitter/loss, CPU tails, nearby database placement, spares, support and operator labor—not server rent alone. [5] [21]

**GameLift integration is smaller than an engine rewrite, but not zero.** AWS currently lists dedicated server SDKs for C++, C# and Go and also offers a game-server wrapper for basic lifecycle integration. Prototype the wrapper or a narrow supported bridge with the actual Node application before estimating migration cost. The JavaScript AWS management SDK and GameLift Realtime are not interchangeable with a dedicated server integration. The wrapper does not supply our world ownership, checkpoint, shutdown or HTTP routing contract. [46]

**Avoid obsolete deployment tutorials:** AWS Copilot CLI reached end of support on June 12, 2026. Do not make `copilot init/deploy` the new operational dependency. Use maintained CDK and AWS APIs. ECS now has native blue/green, canary and linear strategies; CodeDeploy is not a mandatory addition for a future stateless service. These strategies do not make overlapping stateful writers correct. [47] [48]

Managed host replacement must be treated as normal operation. AWS's detailed Managed Instances patching guide says draining starts at day 14 and termination occurs by day 21, while its overview still describes a 14-day maximum. Do not depend on the longer interval as a guaranteed safe session lifetime; qualify the selected maintenance policy and recover from earlier interruption. No platform's process lifetime is the world's identity. [39] [40]

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

The [playbook](production-deployment-playbook.md) specifies the future Dockerfile/infra/workflow artifacts, verified existing entrypoints, image-digest promotion, CDK ownership and concrete CLI examples. The cloud packaging and release coordinator remain unimplemented. Reuse the existing application maintenance owner rather than build a second pause/control mechanism; its delivered local workflow does not supply cloud ownership fencing or a release-phase record. Start with native-only staging; never confuse an ECS task reaching RUNNING with a playable, recoverable world.

### Ownership and shutdown

**Never scale the current world by increasing identical service replicas.** Extend/reuse the storage-owned writer checks with a renewable owner generation before automated replacement can overlap writers. Every authoritative commit must reject an expired generation; health checks, desired-count=1 and load-balancer stickiness are not fencing.

Deployment sequence: stop new admissions, mark draining, reconcile/record pending work, commit recoverable state, release/fence ownership, activate the successor and reconnect clients. A killed task recovers from durable state, not from an assumption that shutdown finished. Fargate's configured stop timeout cannot exceed 120 seconds. ECS scale-in protection can protect draining tasks from selected scheduler actions, not crashes or every failure. [7] [24]

**Fence file writes too.** During the EFS bridge, do not activate a successor against the same mutable save directory until the old writer is confirmed stopped. If termination is uncertain, keep that world unavailable rather than permit conflicting writes. A database lease cannot revoke an existing NFS writer. A later nonblocking takeover needs generation-namespaced immutable artifacts and publication through fenced metadata, or an equivalently qualified storage protocol; a shared mount alone does not supply it.

For the initial world, use serialized stop/verify/backup/install/start maintenance, including replacement startup authorization; no traffic-split rollout over a shared writer. Canary a complete world before expanding to more worlds. Separate liveness from readiness and enforce maintenance at command admission: ALB can fail open to unhealthy targets, so readiness alone cannot stop mutations. Reconnect and recovery are user-visible parts of this deployment, not a zero-downtime claim. [49]

### Database and current save files

Use an RDS PostgreSQL supported **18.x GA minor plus supported pgvector**, verified in the chosen region and against repository queries. Public production should use Multi-AZ; its synchronous standby is a recovery facility, not extra read capacity, and commit latency must be measured. Keep bounded database pools per service/world cohort, never per player or NPC. Use primary reads for permissions, inventory and read-your-writes; consider replicas/analytics isolation only for explicitly stale-tolerant reads. [8] [23]

Current CI's PostgreSQL 16 image does not qualify the proposed PostgreSQL 18/extension pair. Align staging and qualification with the selected production versions before launch, retaining current-format integrity and the existing development save policy. Separate narrowly privileged runtime access from approved database administration; verify encrypted database connections and connection-recovery behavior under failover.

For the fastest safe pilot, mount a **Regional EFS access point for the world's existing save directory**, with IAM, encrypted transport and restrictive filesystem permissions. Fargate scratch storage is disposable. EFS is a compatibility bridge for current checkpoint files—not the asset CDN, a database disk, or permission for concurrent world writers. Qualify the application's rename/write/crash behavior on that filesystem. [9]

Add a native S3 checkpoint adapter later when operational evidence justifies replacing this bridge. Do not turn S3 into a pretend POSIX filesystem. Existing `.data` backups alone omit canonical PostgreSQL records.

## 5. Auth0, accounts and network delivery

Configure an Auth0 **Regular Web Application**, Universal Login and the existing server-side authorization-code + PKCE flow; exact HTTPS issuer/callback/logout origins, no wildcard trust. Retain `openid-client`, browser-bound one-use state/nonce and application sessions in secure HttpOnly cookies. Keep provider tokens/secrets out of browser state and world saves. Review CSRF/Origin checks, cookie policy, CSP and account recovery before external access. [10] [35]

Keep `(issuer, subject) → internal account → world grants → actor/control` separate. Auth0 authenticates; the game authorizes. Reuse existing operator-issued invitations, character admission and access revocation; qualify them through real Auth0 rather than recreate enrollment. Self-service signup, broader suspension/operator workflows, explicit account linking, deletion/export and operator MFA remain separately approved or qualified work; authentication success alone cannot enable any of them. Email/name equality never grants ownership. Bootstrap environment bindings are not a scalable account-management product. Keep grants, privacy restrictions and financial receipts outside gameplay rewind.

**Verified scaling seam from the initial review:** `authentication.ts` retains up to 256 pending logins for five minutes in process memory. Before multiple authentication frontends, move one-use transaction state into a bounded shared TTL store through PostgreSQL initially; retain atomic consumption and browser binding. Do not rely on sticky routing to survive restarts. Current numeric settings remain in the [multiplayer inventory](../limits/multiplayer.md), not a new global login promise.

Select the Auth0 production plan using monthly active identities, login bursts, endpoint quotas, support and recovery needs—not concurrent game connections alone. Coordinate provider load qualification. Use **SES as Auth0's production email provider**, with verified sending domain, production access and delivery monitoring; exercise verification/recovery flows on real mailboxes. [11] [25]

Keep **HTTP commands + SSE** for launch. Use idempotency receipts, audience-scoped stream cursors, bounded per-client queues, jittered reconnect and fresh scoped baselines when replay is unavailable. Heartbeats must fit the configured ALB idle timeout; verify proxy buffering and HTTP/2 behavior. Slow clients must not block the world. A future WebSocket/WebTransport experiment needs measured benefit, protocol compatibility and the same privacy/authority rules. [12]

A CDN speeds static delivery, not the authoritative interaction across continents. Route a player to the world's actual owner, not an arbitrary geographically nearest writer. Any separate gateway must preserve current authority checks, cookie/origin boundaries and audience-scoped streams. Browser-selected IDs, apparently trusted gateways and cached grants cannot create permission.

## 6. Production assets, not repository downloads

**Blender/source textures, references, licenses and provenance:** private versioned S3 art storage plus the artist workspace; references are not automatically licensed to ship.

**Approved models, textures, sprites, animations and audio:** immutable content-addressed S3 objects through CloudFront; separately published from the application.

**Identity, exact versions, rights, dependencies, validation and publication receipts:** PostgreSQL metadata through the existing appearance/art owners.

**Engine/import scripts, small authored manifests, essential fallback art:** Git. Local downloaded library files live in an ignored cache.

**First vertical slice:** publish a rights-approved mercenary runtime bundle; create its exact asset/version manifest; resolve it through authorized server metadata; load from the CDN with cache/fallback; verify a clean checkout and a clean browser; then stop adding large runtime binaries to Git. No history rewrite or deletion of current art is authorized here.

Use the existing narrow **GLB/glTF 2.0** profile. Pin **glTF Transform** for inspection/deduplication/texture preparation and **Khronos glTF Validator** for structural checks; neither replaces semantic/rights review. Qualify Basis/KTX2 texture output and Draco compression against the installed PlayCanvas loader and target devices before enabling them. Do not blindly use a tool's Meshopt/default optimization preset when the client extension/decoder path is unverified. Ship required decoder/WASM versions with the approved release. Compressed download size is not decoded CPU/GPU memory usage. [13] [26] [27] [28]

For curated content, this can initially be an approved CI/CLI publishing job. Runtime-generated content later uses the existing durable art job/attempt contracts: private quarantine → bounded trusted conversion → validation/review → verified immutable bytes → compare-and-swap manifest publication. Reject executable content, unsafe external references, oversized/decompression-heavy outputs and unapproved extensions. Conversion runs outside the simulation process's hot work; provider URLs are temporary inputs, not durable assets. Preserve paid-attempt receipts and never regenerate automatically after uncertain completion.

The browser receives only permitted manifests and prioritized current/nearby-scene assets. Share compatible textures/rigs, reuse instances, bound download/decode/cache/VRAM work, dispose resources and reject late loads after scene/identity changes. Evaluate LODs and fallback representations on real low-memory devices; never use missing graphics as evidence that a physical object does not exist.

Use CloudFront **origin access control** to prevent direct S3 bypass. Approved public assets may be publicly cacheable; restricted content needs separately authorized short-lived signed URLs/cookies and appropriately scoped metadata/cache identities. Origin privacy alone is not viewer authorization, and a hash is not an access grant. Already downloaded bytes cannot be revoked from a hostile client. [14] [33]

Saves and released packs pin exact permitted dependencies. Garbage collection must account for all retained pins and an interrupted publication; a rights/privacy takedown follows its explicit override/tombstone policy. Keep the prior working version for rollback. Better art does not mutate collision, ownership or an entity's current state.

The [asset release procedure](production-deployment-playbook.md#5-publish-assets-independently) adds an immutable conditional-upload example, checksum/idempotency rules, converter isolation, staged adoption of current image APIs and a real-browser acceptance matrix. Curated delivery precedes runtime generation. Do not select a 2D/3D generator from attractive demos alone: in-game scale, repeatable identity, approved rights, rig/animation compatibility, latency and cost determine whether its outputs are usable.

## 7. Inference and GPU decisions

**Managed execution first; no owned GPUs and no permanent process per NPC.** Preserve native continuation, scoped recall, judgment and generation through [the current AI boundary](../ai-providers.md). Full cognition uses the configured Macrofold Worker. OpenLegend does not create, resume, replace or destroy shared Workers; its operator must separately qualify upstream capacity, isolation, region, support, idle policy and billing.

Use bounded admission classes for player dialogue, autonomous decisions, reflection/maintenance and art. Apply per-account/world fairness plus global concurrency, queue age and reserved-spend controls. Native simulation does not wait on a model. Persist attempt identity before dispatch, reconcile unknown outcomes, and revalidate relevant authority/timeline/state before publication. A queue transport such as SQS may be added when separate workers need it; it does not replace the existing durable job/receipt owner or provide exactly-once paid execution. Model output remains untrusted; executor tool/network grants must not expose database administration or unrelated private worlds.

Keep the currently qualified model routes initially. Benchmark smaller models for narrow tasks and stronger models only where their quality gain warrants cost. Bedrock and Vertex are credible alternative managed delivery paths, not automatic replacements for Macrofold's full harness. Request/token quotas, regional availability and reserved-throughput terms need explicit qualification; cross-region inference must match the selected data-residency policy. [15] [29] [30]

**Rent a GPU before buying one.** When sustained demand and quality evidence justify it, evaluate a pinned **vLLM service on rented GPU compute** behind the existing adapter. AWS is an operationally convenient candidate, not a requirement that every inference workload live on the game cloud. Compare managed dedicated serving or another provider only after accounting for network/privacy/support and integration cost. Start with a model that fits one GPU where practical. Size for weights **plus KV cache, input lengths, concurrent sequences and spare capacity**; throughput-only benchmarks are insufficient for interactive dialogue. Separate interactive and batch scheduling, stage model upgrades, protect the serving network and budget redundancy/operations. Multi-node model parallelism is a later necessity, not an initial design goal. [16]

Self-host only when its measured total cost per useful, quality-passing response beats the managed path at the required latency and availability. Include idle/spare GPU hours, storage/egress, staff, failures, evaluation and model-license constraints. Hardware purchase additionally needs a stable workload, power/network/colo plan and replacement capacity. Player count alone establishes none of these.

The [AI enablement sequence](production-deployment-playbook.md#6-enable-ai-without-making-it-the-world-clock) distinguishes new-admission stops, known-attempt cancellation and operator-managed idle capacity. Pin and evaluate model/prompt policy changes as releases. A cheaper model, shared prompt cache or larger batch is worthwhile only when privacy, quality and end-to-end latency still pass; no paid shadow/fallback execution is implied by this research.

## 8. Recovery, releases and operations

RDS Multi-AZ is not a backup; a gameplay save is not a disaster-recovery plan. Enable database point-in-time recovery and protected file/object backups, with a separately controlled recovery copy where permitted. Maintain a **coherent recovery manifest** covering database boundary, retained files, asset pins, build/schema/content versions and operational records. Independently timed filesystem and database snapshots are not automatically coherent.

Initially use an announced quiesced backup/export through the existing operational owner; later qualify online capture. Restore into a fresh isolated environment and verify identities, inventory, memories, current privacy/grants, content pins and uncertain AI receipts before opening traffic. Restoring an old gameplay timeline must not revive spent money or deleted access. Approve RPO/RTO by failure class before launch; measure time to usable gameplay, not merely a healthy database.

**Database disaster restoration is a separate risk:** records excluded from gameplay rewind can still be rolled back by restoring their database. Reconcile current control, erasure and financial/provider records against a protected current ledger or external authoritative source before reopening the restored world. Unknown current authority or billing remains blocked for reconciliation. Define this recovery boundary before promising that bans, privacy deletion or spending survive a regional disaster.

Promote immutable image/content digests from staging to a canary world. Define client protocol, server schema, world-module, asset and pending-job compatibility as a release set. Drain stateful owners instead of ordinary overlapping web-service rollout. A code rollback cannot undo incompatible data changes. The development no-migration policy remains in force until an explicitly approved production policy changes it.

Instrument join/command/commit/render latency, event-loop/GC debt, database waits/WAL, observer fanout, SSE bytes/backlog, cold loads, asset failures/VRAM, inference queue/latency/stale outcomes and spend. Use bounded metric labels; account/actor IDs belong in access-controlled sampled diagnostics, not unlimited metric series. Do not log private prompts, tokens or whole worlds by default.

Before public access, provide alert ownership/on-call cover, status communication, restore and rollback drills, support contact, report/mute/block/ban workflows and audited operator tools. Server-side action/resource/rate validation is the browser game's anti-cheat foundation; WAF/DDoS controls do not replace it. Review UGC rights, AGPL/third-party obligations, privacy/retention, age policy and launch territories with appropriate counsel. These are release decisions, not claims of compliance.

Payments, a marketplace and voice can remain disabled. For initial web purchases, **Stripe Checkout** is the recommended later integration, with verified/idempotent webhook fulfillment and a ledger outside game rewind; settle refund/chargeback and creator-payout policy before enabling it. Never grant paid entitlements merely from a browser success redirect. Before voice, qualify a separate managed media path such as **LiveKit Cloud**, server-enforced recipient permissions, recording/consent/deletion and TURN/egress costs. Inspect room/track metadata as well as received audio; use scoped rooms where necessary. Muting audio locally is not confidentiality. [17] [36]

The [playbook](production-deployment-playbook.md#8-close-the-non-server-release-gaps) connects these requirements to account recovery/email, credential rotation, client/asset failures, cost-abuse response and explicit feature exclusions. Documentation is not a compliance assessment or evidence that these operations already exist.

## 9. Capacity, cost and the scale path

Retain the [selected workloads](../../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product): first release **100 humans, 100 agents, 100 animals and 1,000 other objects**, with half of each in one scene; growth **10,000 concurrent humans**, with **200 humans and agents combined** in the local scene and an explicit animal/object/activity profile. These are unqualified targets, not stored-content ceilings.

**Pilot → qualified first release.** One recoverable world; bounded native/AI/client work; infrastructure above. Promotion requires real Auth0/browser mixed play, dense scene, aged history, sustained load, failure/recovery and measured spend.

**Many worlds / 50k–100k registered or monthly users.** A durable world directory, separate account/control entry point, provision/admission lifecycle and placement across world tasks/database cohorts. Promotion requires peak CCU, active-world skew and unattended simulation demand measured independently of account count.

**10k shared-world concurrency and beyond.** Bounded regional working sets, then fenced region authorities; partition storage only after CPU/transaction evidence requires it. Promotion requires the existing D6 crossing, perception/time, contested-resource, inventory and recovery gates. Many independent worlds do not qualify this target.

**50k–100k concurrent players across a fleet.** Replicated regional cells with bounded databases, connection gateways and warm/failover headroom; compare Fargate, Managed Instances, EC2 and GameLift on measured total economics. Promotion requires capacity and quota tests including reconnect storms, one-cell failure and the largest promised hot world/scene.

**Millions of players.** Repeat qualified cells/regions; global discovery/social projections, regional write ownership and explicit cross-cell protocols. Promotion requires per-cell cost/reliability, control-plane survival, migration and global-service bottleneck evidence; no single crowd-capacity inference.

A **cell** is a bounded failure domain; a **world** is a persistent simulation identity; a **region** is a possible authority subdivision. Do not equate any of them with a VM, database instance or account. Current per-world databases can initially share an RDS deployment with bounded pools. Before database-per-world catalog/migration overhead becomes material, implement the existing `world_id`-scoped repository target and consolidate bounded world cohorts into shared shard databases. This requires query/isolation and migration qualification; merely pointing today's isolated-world clients at one database is unsafe. Millions of worlds must not imply millions of RDS instances, permanently open databases/connections or always-running processes.

Route through `worldId → home region/cell/owner generation/endpoint/build/admission state`. Move data and authority without renaming accounts/entities. Within a hot shared world, place tightly interacting state together; transfer an actor and required belongings through the existing durable prepare/commit-or-abort design. Never activate both source and destination after an ambiguous timeout. Keep real-time writes near their authority rather than requiring an intercontinental transaction for every move.

Preserve required witnesses and outcomes while sharing public relevance work and loading cold state selectively. Private player/guild domains are permission boundaries, not a license to clone unique NPCs or erase distant relationships. Empty-world scheduling and any lower-detail continuation require the existing clock/world contracts; hosting cannot silently change fictional time.

The [fleet stepping stones](production-deployment-playbook.md#7-expand-without-multiplying-control-plane-objects-forever) address placement admission, prewarming, cell gateways and cloud-object quotas. One ECS service and ALB target group per world is a pilot convenience, not an unlimited design. Promote pooled placement before task/service/target/connection churn or idle cost dominates. Measure the resource vector and warm capacity, not just registered users. Shared-world partitioning remains a separate D6 program.

### Cost model to fill from the qualification run

`monthly cost = simulation + connection/edge + database/I/O/backups + asset/storage/egress + inference/Worker allocation + observability + support/on-call`.

Record peak/average CCU, active and unattended worlds, hot-scene density, bytes/player-second, history growth and model request/token distributions. Useful arithmetic: **10 kB/s per player at 100,000 CCU is 1 GB/s, or 3.6 TB/hour** before overhead. That is why the GameLift bandwidth change matters. Separately, 1,000 active players each causing one model request/minute produce about 16.7 requests/second; at 20 seconds mean completion time, about 333 requests are in flight before headroom. These are illustrative assumptions, not predicted OpenLegend traffic. [2] [34]

Compare cost per active player-hour and per world-day, including idle worlds. Count provider charges, Macrofold shared allocation and uncertain reservations once; per-agent allowances do not cap fleet spend. Price the measured bill of materials with current region/plan rates before provisioning, and obtain Auth0/provider/cloud quotas before a launch event. No defensible monthly bill or GPU count follows from an unspecified “100,000 users.”

For a cloud comparison, hold region proximity, application revision, database durability, world/history density, active actions, asset bytes, inference quality and availability reserve constant. Include engineering/on-call effort and credits that eventually expire. Report cold and warm joins, steady play, dense scenes, model bursts, deployment/recovery and full-cost distributions. A provider's headline VM price or a short idle benchmark cannot decide the hosting contract.

## 10. What deployed games teach us

**New World (AWS engineering account, 2022):** its described architecture separated public entry points, simulation hubs and persistence, with dynamic spatial responsibility. Borrow the ownership/handoff lesson, not its database stack or population numbers as proof for LLM-driven NPCs. [18]

**Old School RuneScape (Jagex, August 2025):** whole-world authority and regional hosting remained useful, while VM contention, shared backend capacity and specific expensive content affected performance. Borrow workload profiling and deliberate CPU placement; do not copy its 0.6-second tick or equate its scripted NPCs with our cognition workload. [19]

**Supersolid / Google's browser multiplayer example:** GKE/Agones is a real deployment route, but server allocation remains separate from game-state correctness. **EVE's historical time-dilation design** demonstrates that one dense interaction can require explicit overload policy; it does not authorize changing OpenLegend's clock. [20] [31] [32]

**Riot Games (AWS-published customer engineering case):** EKS, Karpenter and Terraform illustrate standardized deployment, fleet utilization and isolation at an established operator. This is evidence that serious games use Kubernetes successfully, not that a new game must start with it or that every Riot workload has one architecture. Reported vendor-case results are not an independent OpenLegend benchmark. [50]

**Synthesis:** there is no demonstrated universal “modern MMO stack.” The useful common pattern is durable identities, a bounded unit of simulation authority, managed/repeatable infrastructure, deliberate placement, separate content/intelligence work and measured recovery. Our fastest credible route is a small complete instance of those patterns, then repeatable cells and separately qualified regional ownership—not a premature recreation of an established studio's fleet.

## 11. Research conclusion and remaining decisions

This pass corrects the initial AWS-over-GCP framing and adds Compute Engine, GKE Autopilot, Cloud Run instances, ECS Express Mode/Managed Instances, modern ECS rollout mechanisms, Copilot retirement, GameLift wrapper feasibility and Azure as a credible alternative. The recommendation remains ordinary Fargate/CDK for the first world, not a commitment to retain Fargate forever.

The production package now supplies requirements, platform reasoning, an implementation/command playbook, one release checklist and one constraints inventory. The key remaining decisions are operational inputs, not another broad platform survey: launch cohort/region and budget; measured SLO/RPO/RTO and capacity; production data-continuity/retention policy; actual Auth0/provider plans; and which optional features are enabled. Resolve these under PD01 and the named feature gates before implementation makes promises. Current provider features and prices must still be rechecked when provisioning.

This proposal adds no runtime code, infrastructure, paid generation, migration or measured capacity. It preserves the current save policy, simulation clock, private-state boundaries and existing subsystem task IDs.

## Maintained records

- Implementation: [PD delivery](../maintainers/production-deployment.md); [D5/D6](../maintainers/production-data.md), [MP](../maintainers/multiplayer.md), [PF](../maintainers/performance.md), [SL](../maintainers/save-and-load.md), [MW](../maintainers/macrofold-worker-api.md), [INV](../maintainers/inventions-and-world-evolution.md) and [V3D](../maintainers/3d-pixel-art.md) retain their semantic work.
- Limits and constraints: [Deployment inventory](../limits/production-deployment.md); existing feature limits remain controlling.
- Related contract: [Feature specification](production-deployment-feature-spec.md).
- Deployment procedure and command references: [Implementation playbook](production-deployment-playbook.md).

## Sources

Primary sources checked 1–2 October 2026. The numbered links above point directly to the sources below; command-specific references are in the playbook. Vendor features/prices must be rechecked at implementation; historical case studies describe their stated dates. Recommendations and application to OpenLegend are this design's synthesis, not measured provider comparisons.

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
[37]: https://docs.cloud.google.com/compute/docs/instance-groups/stateful-migs
[38]: https://agones.dev/site/docs/installation/creating-cluster/gke/
[39]: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ManagedInstances.html
[40]: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-instances-patching.html
[41]: https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-ecs-express-mode-custom-task-def/
[42]: https://aws.amazon.com/blogs/containers/extending-amazon-ecs-express-mode-to-build-an-optimal-container-environment/
[43]: https://cloud.google.com/blog/products/serverless/introducing-cloud-run-instances
[44]: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
[45]: https://learn.microsoft.com/en-us/xbox/playfab/multiplayer/servers/
[46]: https://docs.aws.amazon.com/gameliftservers/latest/developerguide/gamelift-supported.html
[47]: https://aws.amazon.com/blogs/containers/announcing-the-end-of-support-for-the-aws-copilot-cli/
[48]: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-bluegreen.html
[49]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
[50]: https://aws.amazon.com/solutions/case-studies/riot-games-case-study/
[51]: https://docs.cloud.google.com/sql/docs/postgres/generate-manage-vector-embeddings

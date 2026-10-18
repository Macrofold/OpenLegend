# Production deployment limits and constraints

**Hosting research baseline: main `b9a08a05`; research updated 2 October 2026, asset delivery reconciled October 17.** This inventory owns discretionary deployment choices, not duplicate gameplay constants. Broader hosting choices remain **Proposed**; Auth0 is selected and the curated S3/CloudFront asset path is implemented. [AST01–AST08](game-asset-storage.md) owns its configured admission, storage, cache, retention and recovery limits; the [AS report](../verification/game-asset-storage.md) records measured evidence and current cost qualifications. These do not establish general hosted-game capacity. [Design](../projects/production-deployment-tech-design.md), [feature contract](../projects/production-deployment-feature-spec.md), [playbook](../projects/production-deployment-playbook.md), [PD work](../maintainers/production-deployment.md).

## DEP01 — Initial placement

**Proposed / Very safe:** first deployment in one geographic region with one active authority for the initial world.

Remote players may have higher latency; owner replacement may briefly interrupt play. Decline/queue admissions beyond the qualified profile. Expand placement through PD11; do not create concurrent writers as a scaling shortcut.

## DEP02 — Compute and platform

**Proposed / Safe:** On-Demand world compute; no purchased GPU or mandatory Kubernetes cluster.

Costs may exceed optimized steady-state hosting. PD11/PD12 compare full economics and latency before adopting Managed Instances, EC2/GameLift, GCP alternatives, rented inference or dedicated servers. AWS is a modest initial-fit preference, not a measured performance/cost winner or permanent provider exclusion.

## DEP03 — Identity provider

**Selected / Medium:** Auth0 for production identity.

Provider availability/plan quotas constrain new logins; they do not define game CCU. Existing sessions follow their explicit expiry/revocation policy, never an outage bypass. PD03 qualifies the selected plan and adapter; no second login system is introduced.

## DEP04 — Save-file storage

**Proposed / Safe:** current per-world save files on isolated Regional EFS access points; ephemeral task storage only for reconstructible work.

Mount or coherent-recovery failure blocks opening the affected world. Confirm the old file writer stopped before a successor writes the same path, including automatic replacement. Preserve current save ownership/bounds; PD06 qualifies filesystem behavior, and PD11 can promote an S3 checkpoint adapter on demonstrated need.

## DEP05 — Unqualified growing work

**Unqualified / Too liberal until configured:** no new numerical promise for fleet queues, request preparation, world count, total history/assets or spend is established here.

Player/NPC activity, authoring and unattended worlds can grow these independently. Existing per-request limits do not bound total hydration, pending bytes, durable storage or shared Worker allocation. PD01/PD07/PD09 must set and measure admission, concurrency, byte/age and monetary envelopes before public use; reject/defer work explicitly rather than silently discard required outcomes. Cloud task/service/ENI/target/connection quotas also require an explicit deployment envelope.

## DEP06 — Capacity claims

**Proposed / Safe:** release capacity is the measured mixed workload, not registered-account count.

Existing first/growth targets remain in the production-scale owner. No new lifetime player/entity cap is invented. Increase the advertised workload only after PD09/PD11/PD12 evidence; a queue within the promised workload fails qualification.

## DEP07 — Asset access and caching

**Implemented curated path / Medium; broader production qualification open:** explicitly public immutable assets may be cached; restricted assets use their authorized delivery route.

Issuing stops on revocation; an existing signed URL/cookie can remain valid until its admitted expiry, and a request admitted before expiry may finish. Downloaded bytes cannot be recalled. Select that residual window per content sensitivity before enabling delivery. Content requiring current permission on every request needs authorization before cache hits and a protected origin; do not enable it through ordinary signed links alone. Invalidation clears CDN copies but does not revoke origin access by itself. The implemented controlled withdrawal removes the selected current origin copies and invalidates their known delivery paths; separately permitted uses and retained recovery versions keep their own authority. The [asset delivery contract](../projects/game-asset-storage-tech-design.md#7-environments-local-cache-and-offline-use) owns enforcement and failure behavior; PD05/PD08 qualify both existing credentials after revocation and blocked direct access. The implemented immutable public cache policy is not a restricted-asset permission lifetime or permission to delete pinned bytes. Existing art pipeline limits own decoded size, variants, client budgets and retention pins.

## DEP08 — Unattended-world time

**Current behavior retained / Medium:** empty-world pause and no downtime catch-up.

Always-on hosting alone does not implement ongoing fictional life. PD10 requires an explicit world/time decision and evidence before promising unattended progression; no clock change is approved here.

## DEP09 — Service and recovery objectives

**Proposed / Safe:** operator-selected service objectives and recovery budgets before release.

No cloud SLA is adopted as the game's achieved uptime, and no universal latency/RPO/RTO number is invented. PD01 sets failure-class objectives; PD06/PD09 must demonstrate them without weakening existing durability/privacy semantics. Whole-database recovery must reconcile current authority, erasure and financial records before reopening. The [selected asset recovery topology](../projects/game-asset-storage-tech-design.md#2-physical-storage-and-accounts) has separate buckets and roles in one project/Region; its operational recovery evidence does not qualify whole-project or regional disaster recovery.

## DEP10 — World release policy

**Proposed / Medium:** serialized, maintenance-based replacement for the first world; canary complete worlds rather than splitting their commands across writers.

Brief world-specific downtime is preferable to conflicting authority. Use a durable release gate and phase record; failed or cancelled deployment does not reopen automatically. PD04 qualifies overlap, interruption and rollback. Stateless services may later use native progressive traffic rollout; lower-downtime world transfer requires separately proven fencing and recovery.

## DEP11 — Supported tooling and configuration ownership

**Proposed / Safe:** maintained, production-qualified dependencies and one declared deployment configuration owner.

Do not adopt unsupported Copilot or depend on Preview Cloud Run instances for the launch world. Reconsider previews after suitable support and workload qualification. Application CDK consumes recorded release image/count inputs; workflow retries reconcile actual state. Deployed asset resources retain their separate CloudFormation owner and verified output mapping. Managed host replacement and quota limits are operational constraints, not guaranteed world lifetimes. PD02/PD04/PD11 own qualification and eventual expansion.

## Shared owners

[Multiplayer](multiplayer.md) owns login/session/control limits; [persistence](persistence.md) owns save and recovery bounds; [native work](native-work.md) owns simulation/queue limits; [AI execution](ai-execution.md) and [cognition](cognition.md) own request/admission limits; [3D art](3d-pixel-art.md) owns asset preparation and browser envelopes; [observability](observability.md) owns diagnostics. Preserve their exact IDs and update them with the eventual implementation rather than copying constants here.

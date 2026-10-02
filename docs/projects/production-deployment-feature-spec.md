# Production deployment — feature specification

**Status: researched proposal, updated 2 October 2026. Auth0 is Mike's selected authentication provider; the other platform choices below are recommendations, not deployed infrastructure.** This package authorizes no runtime change, provisioning, purchase, migration, or paid execution.

## Purpose

Deliver the existing browser game to real players on a dependable platform, then expand to many persistent worlds and regional simulations without replacing the engine or making every subsystem distributed immediately. Start with a recoverable, invitation-only world. Qualify the existing first-release workload before advertising public capacity.

The [technical design](production-deployment-tech-design.md) contains the hosting comparison, concrete stack, asset pipeline, inference economics, research reconciliation, and scale path. The [implementation playbook](production-deployment-playbook.md) specifies packaging, deployment commands, CI/CD, asset publication and recovery procedures; its proposed infrastructure and operator tools are not implemented by these documents. The [delivery checklist](../maintainers/production-deployment.md) is the work entry point. This specification owns the player/operator outcome, not a second simulation, authentication, or persistence contract.

## Required journeys and failure behavior

| Journey | Required outcome |
| --- | --- |
| A new player arrives | Auth0 sign-in, explicit account provisioning and world admission, a clear character/control choice, and a playable first scene without downloading the whole asset library. Invitation or ordinary signup never grants creator powers. |
| Two people share a world | Server-authorized commands, private knowledge and account isolation, one current controller per supported binding, and durable possessions. Modified clients cannot grant themselves authority. |
| A connection or server is lost | Visible reconnect/recovery, no duplicated command or character, no acceptance of stale control, and an explanation when the world is temporarily unavailable. A process restart is not seamless failover. |
| An NPC/model provider is unavailable | Supported native actions and existing native plans remain functional. Unavailable dialogue is explicit; neither invented fallback replies nor unapproved paid retries conceal the failure. |
| Art improves during play | Only approved, permitted versions arrive asynchronously. An adequate fallback remains usable. Art does not alter mechanics, and late downloads cannot resurrect removed objects. |
| An operator deploys or restores | A version-compatible, fenced handover or announced maintenance interval; coherent recovery of gameplay, required files and content pins; current permissions, privacy restrictions and external accounting are not rewound. |
| A deployment is interrupted | Maintenance remains explicit, the operator can inspect the last durable release phase, and a retry reconciles actual state before acting. A healthy old server after rollback is not reported as a successful new release. |
| More players/worlds arrive | Placement and admission respect measured capacity. Friends, domain permissions, identity and persistent relationships survive infrastructure changes. A queue is disclosed, not counted as successful service within the promised workload. |

## Scope and stages

**First hosted pilot:** one region, one active world authority, Auth0, managed PostgreSQL, durable save files, CDN-delivered approved assets, deployment/recovery procedures, basic abuse handling, observability and explicit spending controls. Paid AI is enabled only after its separate live qualification. Curated assets do not require runtime image generation. A short announced maintenance interval for this world is acceptable; zero-downtime stateful updates are not promised.

**Public launch:** qualify the existing release population and dense-scene profile, real authentication, aged history, hostile clients, outages and recovery; approve retention, support, moderation and uptime promises. Self-service onboarding is a separate admission capability from successful authentication. Database disaster recovery must reconcile current operational authority/privacy and financial records, not merely restore a historical gameplay image.

**Growth:** add independently placed worlds and regional cells; separately qualify working-set loading and multiple authorities inside one shared world. Registered accounts, monthly active users and concurrent players are separate capacity dimensions. The 50,000/100,000-user ambition does not silently replace the existing 10,000-concurrent-player growth target. Choose hosting changes from workload and operational evidence; AWS is preferred for initial implementation convenience, not a demonstrated GCP capacity advantage.

**Later capabilities:** player/guild-owned domains, always-progressing unattended worlds, global discovery, cross-world travel/economy, voice, creator commerce and million-player deployments need their own consumed contracts and release gates. They are not prerequisites for an honest limited pilot.

Current worlds pause after all controlling connections leave and do not catch up after downtime. Hosting a process continuously does not change that behavior. The intended living-world experience needs explicit time/lifecycle implementation before being advertised; do not introduce observer-dependent physics, cloned persistent NPCs, mandatory play windows or time dilation as hidden scaling shortcuts. The [simulation clock](../simulation-time.md), [multiplayer contract](multiplayer-authority-feature-spec.md) and existing world policies remain controlling.

## Acceptance and decisions

Acceptance is evidence attached to the existing D5/D6, MP, PF, SL, MW, INV and V3D owners, coordinated by the delivery checklist. No checkbox closes because a cloud service supports autoscaling, a deployment waiter returns success or a synthetic login bypass worked.

Before public launch, approve the initial audience/region, measured capacity and service objectives, monthly operating envelope, account/content retention and post-launch save compatibility policy. The [development save policy](../../AGENTS.md#development-save-policy) remains unchanged until Mike explicitly selects a production policy. No backward-compatibility framework is authorized by this document.

## Maintained records

- Implementation: [PD01–PD12 delivery checklist](../maintainers/production-deployment.md), subordinate to the existing subsystem owners.
- Limits and constraints: [Deployment inventory](../limits/production-deployment.md).
- Related design: [Production deployment technical design](production-deployment-tech-design.md) and its [implementation playbook](production-deployment-playbook.md).

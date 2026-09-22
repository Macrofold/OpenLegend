# Invention governance, creator ownership and world packs

This document owns product behavior for invention locks, creator attribution/control, portability, creator libraries, world invention packs, free-use worlds and contribution permissions. Account libraries, multiplayer permissions, invention locks and marketplace packs are target behavior rather than current implementation; see [Architecture](../../docs/architecture.md) for executable behavior.

Related: [world creation and discovery](world-creation-and-discovery.md), [world rules](world-rules-and-parameters.md), [playability and controls](playability-and-controls.md), [world agent and workshop](world-agent-and-workshop.md), [creator economy](../06-marketing/creator-economy-and-mechanics-packs.md), and [licensing](../../LICENSING.md).

## Separate authority, authorship and knowledge

A world owner governs what definitions run in their world. Creating an invention inside that world does not transfer its player's contribution to the owner. An inventor should retain an account-linked record of their work and the ability to reuse the portions they are entitled to take elsewhere. Account-level ownership is a product control and attribution model, not a declaration of exclusive rights over every idea or purely generated output.

| Concept                            | Responsibility or permission                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| World governance                   | Independently open or lock agent/NPC and player invention; admit compatible versions; govern world editing       |
| Creator attribution and control    | Credit contributions, inspect one's creation history, propose revisions, and control eligible publication/export |
| Permission to operate a definition | Let the world continue using an admitted version under its recorded contribution or package terms                |
| Character knowledge                | Learn or perform a method inside the simulation, subject to actual knowledge, resources and capabilities         |
| Portability                        | Copy an authorized definition and its required dependencies into another compatible world                        |
| Redistribution                     | Publish or supply those definitions/assets to others under the applicable terms                                  |

Learning a recipe does not transfer its account ownership or grant permission to export its implementation. Importing a pack does not automatically teach every character its methods or provide the required materials. The host's ability to retire or replace a definition in one world does not erase its creator's history. A creator's ability to propose a revision does not authorize activating it in someone else's world.

Keep character identity distinct from account identity: an account may control characters in several worlds, a definition may have several contributors, and an NPC may discover something without having a human account. Record those facts separately; NPC ownership/beneficiary policy remains an explicit open decision.

## Open and locked invention

The main world creator/owner must have two independent controls: **Agent invention lock** for autonomous in-world agents/NPCs, and **Player invention lock** for human-player invention requests. Changing either leaves the other unchanged. Other editors may receive explicit delegated authority later. Being an in-world ruler, a character in god mode without the required account permission, or a persuasive AI message is not authorization to change these settings.

Autonomous NPC invention starts locked. The owner may explicitly enable it in development worlds after the supported-family privacy, resource-accounting and recovery checks pass; player invention remains independently controlled. Enabling invention does not authorize paid execution without an explicit nonzero spending cap. The initial player-lock value remains a proposed prototype choice.

For each group, **open** permits eligible invention requests within the world's supported rules and operating limits; **locked** blocks new or revised definition admission originating from that group. Open does not promise unlimited AI spending, automatic success or arbitrary executable code. A locked group's characters can still use and learn permitted definitions, including new ones admitted by the other group through normal knowledge acquisition.

| Agent invention lock | Player invention lock | Ordinary invention allowed                      |
| -------------------- | --------------------- | ----------------------------------------------- |
| Off                  | Off                   | Both autonomous NPCs and players                |
| On                   | Off                   | Players only                                    |
| Off                  | On                    | Autonomous NPCs only                            |
| On                   | On                    | Neither group; existing mechanics remain usable |

This supports a world whose residents continue discovering things while visiting players cannot add mechanics, or a world where players invent while NPCs use and learn the available library. In this document, “both locked” means both settings are enabled; neither lock alone freezes the entire definition library.

Proposed enforcement contract: classify requests by their initiating authority and purpose, not the model or worker executing them. Player-directed invention through conversation, an NPC, a helper agent or Macrofold remains subject to the player lock. Autonomous NPC invention follows the agent lock. Carry server-established origin and delegation provenance through child jobs, drafts, imports and revisions; a client or model cannot relabel an attempt to use the other group's permission. Independently motivated NPC discovery remains an agent-origin request even when ordinary experiences include player speech; explicit delegated invention is not independent discovery. Ambiguous provenance must be resolved by application policy before authoring dispatch. Owner administration is a separate explicit authority described below, not a third ordinary-play bypass.

A lock is about definition admission, not pausing the world. Existing permitted actions, crafting admitted recipes, creating item instances, teaching and learning existing techniques, and ordinary environmental processes continue. Ordinary parameter choices already authorized by a finite family can remain actions; changing that family's bounds or registering a persistent new variant is a definition change. The engine must identify that difference rather than letting an action disguise a revision.

A future authoritative policy record should contain a world ID, revision, independent agent and player lock values, effective time, changing principal, and audit reason. Proposed fields are `agentInventionLocked` and `playerInventionLocked`; exact schema names and the initial player default remain open. Safe client projections expose both values and the current revision; owner controls label them separately, while player menus explain the player setting. A shared policy revision may version both values without coupling their behavior.

| Entry point                                                      | Required behavior when the applicable lock is on                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Player request, right-click sparkle or delegated invention       | Check the player lock; explain it and offer existing actions without dispatching authoring work                  |
| NPC planner or autonomous discovery                              | Check the agent lock; select existing behavior or record an unsupported need without inventing a rule            |
| Jev/LLM result proposing a new declaration                       | Check the originating group's lock; model confidence or execution backend cannot override it                     |
| Background job, cache hit, delayed completion or recovered draft | Retain origin; recheck its applicable lock and current authority before activation                               |
| Ordinary import, revision or automatic library update            | Retain the initiating authority and applicable lock; unattributed automation has no implied admission permission |
| Explicit owner workshop change                                   | Require the player lock off unless the proposed owner exception is adopted; always validate and audit the edit   |

Enforce this at the server/domain admission boundary, not just by hiding an icon. Check the applicable lock before reserving/dispatching generation and again atomically when admitting the result against the current policy revision. Enabling that lock while its workflow is running prevents later activation; request cancellation where possible and reconcile incurred usage. Changing only the other group's lock requires revalidation against the new revision but must not by itself reject or cancel an otherwise permitted attempt. An attempt invalidated by its own lock is not revived by a subsequent unlock. A canceled/rejected candidate may remain in permitted draft history but must not become an executable definition or teach a character a successful invention.

Unlocking either group does not automatically replay rejected jobs, publish pending drafts or retry paid work. A fresh player request or eligible autonomous decision must use current state and authority. A save or server restart restores both independent settings; a client cannot provide an authoritative policy or origin override. Schema changes, dependency installation, imports and administrative HTTP routes must converge on the same admission checks. The agent invention lock does not disable NPC thought, conversation, survival, learning or execution of existing actions; AI budgets and pause rules remain separate controls.

Proposed owner exception, still to be decided: the owner may deliberately workshop or install a reviewed change while the player invention lock remains on, including when both groups are locked. That is a separate capability, such as `editWorldDefinitions`, with a preview, validated version/dependencies, explicit activation intent and audit record. Until that exception is adopted, owner authoring requires the player lock off and the necessary editing permissions; it does not require unlocking autonomous NPC invention. An authorized owner speaking to the world agent can initiate this operation; an ordinary conversation cannot. The engine still validates supported behavior, rights, migrations and resource constraints. See [world agent and workshop](world-agent-and-workshop.md).

## A creator's library across worlds

Provide an account library of **all past inventions attributed to that account**, with search/filtering by world, date, type, status and collaborator. Each entry should lead to an inspectable version history and its original world. Imported or learned inventions belong in separate views, so receiving a pack does not inflate one's authorship claims. Drafts, rejected proposals and admitted inventions must have distinct statuses; a provider error is not a completed invention.

For each authorized invention version, preserve:

- Stable invention/version IDs, human-readable name and description, origin world ID/name, inventor character, contributing account(s), contributor roles and creation/admission times.
- Structured declaration and finite family; all actual parameters with units/bounds, prerequisites, inputs/outputs, costs, timing, failure/interruption behavior, declared effects and applicability.
- Exact dependencies, engine/schema compatibility, content hashes, source/version lineage, authoring provenance, admission receipt and validation evidence.
- Any custom implementation artifact if that feature later exists: version/hash, declared interface, required permissions, resource limits and authorized source/artifact access. Current finite G1 declarations must not be presented as arbitrary scripts.
- World activation/retirement status, revision/fork relationships, rights/permission records, applicable contribution terms and concrete export restrictions.

Technical details describe what was declared and validated; they are not proof that every future interaction has been discovered. Inferred consequences and untested influences should stay labeled, linked to their evidence. A read-only detail view and export are distinct permissions.

The library should preserve the creator's authorized contribution capsule independently of a live world's continued existence or the account's current membership. Do not make leaving a world silently delete their own work. That capsule includes the creator's eligible artifacts, lineage and relevant metadata, not unrestricted copies of private dependencies, another actor's memory, hidden world state or other players' records. If a dependency cannot travel, retain its reference and explain the missing permission or compatibility requirement. World names and other origin metadata need a visibility policy for private/deleted worlds.

If the world is hosted separately, an authenticated publication/synchronization contract will be needed to associate contributions with accounts and resolve provenance. A server-supplied author label alone is insufficient to settle disputed ownership. Account recovery, co-authorship disputes, deletion/retention and offline/self-hosted synchronization remain product and implementation decisions.

## Every world has an invention pack

### Reusable constructs and specializations

Eligible content includes selectors, predicates, effect/lifetime policies, templates, closed specializations, organism/sense/controller definitions and module bundles. Partially unbound templates declare required destination bindings and are labeled separately from runnable content. Specialization/forks preserve lineage, exact dependencies and recorded use/modification/redistribution rights; compatibility grants no rights. Destination adaptation requires a validated binding/adapter, not matching labels/units or automatic latest-version updates. Live targets, invocations, private actor state, creator inspiration and account permissions are excluded unless separately authorized for their proper purpose. See [construct semantics](../07-technical-architecture/world-module-runtime.md#reusable-constructs-and-specialization) and [EX10](../../docs/extensible-world-examples.md).

Every world should have a logical invention pack containing the complete inventory of that world's inventions. Its inventory is world-associated and updated when definitions are admitted, revised or retired. A published/exported release is an **immutable versioned snapshot**, not a live link that silently changes recipients' worlds.

A proposed pack release records the source world and snapshot revision, pack/version ID, manifest hash, every in-scope invention/version, contributor attribution, pinned dependency closure, compatible engine/schema versions, applicable terms, and export/redistribution eligibility. Preserve active definitions, dependencies and versions still needed by saved objects or processes; include a history/index of retired versions so “every invention” does not silently mean only the newest visible actions. The precise history-payload retention limit remains open and must be shown to the exporter.

**Complete inventory and distributable payload are separate.** An invention can be listed but blocked from export by another creator's terms, a private asset or a missing dependency. Mark every omitted artifact and reason in the owner's full inventory, show the affected dependent inventions, and label a partial export as partial. Never market a bundle with hidden omissions as the complete world pack. Restricted inventory details themselves must not leak to unauthorized marketplace visitors.

Cloning a world pack creates a new world's authorized definition library. It does not copy the live population, belongings, conversations, character memories, account permissions or entire simulation save. A separate world-template/state-copy operation may later offer selected authorized starting data. Portable mechanics still need supported native primitives, compatible world rules and explicit activation in the destination. Player-directed imports require the destination's player invention lock off unless the proposed owner exception is adopted; autonomous imports follow the agent lock and their initiating authority. An ordinary import never bypasses its applicable lock.

Import must preview additions, conflicts, dependencies and rights before activation. Pin the approved versions; do not resolve dependencies to “latest” during play. Revisions create new versions or attributed forks, retain ancestry and inherited terms, and specify how existing items and processes remain on their old version or migrate. Package purchase or download never confers world-edit authority.

## Free-use worlds and contributor consent

A world owner chooses whether to offer a free-use world and make its whole invention pack freely available. This is independent of both invention locks: a free-use world can lock either or both groups while released packs remain usable. Sharing terms do not enable invention for either group.

“Free-use world” is a working label. Its minimum intended promise is that players can contribute inventions and take the entire world invention pack into their own world without a pack purchase. Zero price alone does not establish permissions to modify, operate commercially or redistribute; choose explicit terms and explain them in plain language before using the label publicly.

To fulfill the complete-pack promise, the world must admit only contributions and dependencies whose recorded terms support that promise. The owner chooses those terms for participation but cannot acquire missing rights merely by changing a setting. Show both invention lock settings and contribution/sharing terms before a player joins and again before their first relevant contribution or an effective terms change. Record the accepted terms version with each contribution. A badge should distinguish verified complete free-use releases from worlds that merely intend to resolve blockers later.

Creators retain attribution and control over eligible versions while granting the disclosed permissions needed to host, include and reuse them. Contribution is not an automatic assignment to the host. A player who does not accept a new sharing policy must have a clear choice not to contribute under it; the account library and existing grants are not silently rewritten.

Converting an existing world to free use requires auditing its full inventory and dependency closure. Obtain the necessary contributor permissions or replace/remove blocked content through an explicit compatible migration. The owner may publish a clearly labeled eligible subset in the meantime, but it is not the full free-use pack. Changing future contribution terms must not retroactively appropriate older contributions. Conversely, closing a world or charging for a later release cannot silently revoke permissions already granted for an earlier release. Exact licenses, retention rights and consent text require a separate policy decision; this document grants none.

## Durable records and service boundaries

Use structured, queryable records for inventions/versions, world activations, attribution, rights grants, pack releases and audit events. The world log links to those records; a bounded on-screen log is not their durable storage. Account libraries and marketplace views are permission-filtered projections, not a second independently writable definition registry.

Open Legend owns policy, identity integration, admission and world activation. Macrofold may execute bounded authoring/review workflows and keep versioned artifacts or authorized references, but its result cannot grant ownership, set a world lock or activate an import. Query access must remain scoped. User-visible full technical inspection is an authorized view, not a requirement to put every definition or private record into every model request.

Use stable IDs, immutable versions, explicit grants and replaceable repositories so a local account/library prototype can precede hosted accounts and marketplace services. Avoid a distributed ownership registry as a prerequisite for proving lock semantics.

## Delivery and unresolved choices

Implementation is mapped into the [Inventions and world evolution tracker](../../docs/maintainers/inventions-and-world-evolution.md). Runtime admission belongs to [Declarations and evolution](../07-technical-architecture/declarations-and-evolution.md), and persistence belongs to the [production data design](../07-technical-architecture/production-data-model.md). Material unresolved product choices are maintained only in [Open decisions](../05-project/open-decisions.md).

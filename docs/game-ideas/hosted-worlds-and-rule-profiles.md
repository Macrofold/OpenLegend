# Hosted worlds and independent rule profiles

**Status: idea to explore, requested by Mike; not an adopted offer, completed feature design or implemented capability.** The [Enshrouded dossier](../../archive/02-research/game-inspiration/dossiers/enshrouded.md) supplies the research precedent. Existing [world/community direction](../product-scalability/worlds-and-belonging.md), [commercial comparison](../projects/initial-commercial-offer-decision-brief.md), account/access authority and each world's rules retain their ownership.

## The experience

A player or group could create a persistent OpenLegend world through the product, arrange its hosting, choose who may join and select supported rules for the experience they want. Friends could participate without depending on the paying owner's personal computer or presence. Membership management and the world's continued service would be understandable within the same product.

The shared project should also work across different schedules: one member explores or supplies materials, another builds, and someone returning later discovers useful work their friends contributed. The [supplied Fort Armco account](../../archive/02-research/game-inspiration/dossiers/enshrouded/04-hosting-and-world-governance.md#a-players-reported-rental-motive-asynchronous-building) describes that as a reason to rent a server. It is one attributed use case, not measured demand or a promise that absent players experience every shared milestone.

Private worlds complement the larger shared-world ambition. In official worlds, a base could become a home, shop, inn, workshop, sanctuary, trading stop or contested stronghold used by many people and autonomous inhabitants. More participants can make construction socially consequential through visitors, trade, shared projects, alliances and rivalry. Population alone does not create that value; people need useful reasons to encounter and affect one another.

Enshrouded supplies a concrete precedent for rented dedicated worlds and an in-game hosting-partner route. Its small cooperative worlds are not evidence that OpenLegend's larger persistent worlds or AI costs are already qualified. The [hosting research](../../archive/02-research/game-inspiration/dossiers/enshrouded/04-hosting-and-world-governance.md) separates the observed product from that proposed extension.

## Control who belongs and what they may do

The proposal includes an integrated way to create or select a world, invite members, approve or restrict entry, remove or ban participants and delegate appropriate management. Owners could distinguish visitors, ordinary members, trusted builders and administrators. Public discovery, invitation-only access and application-based entry are possible policies rather than mandatory modes.

Membership, administrative power and fictional property must remain distinct. Visiting a world need not grant permission to remodel a house or empty its supplies. Membership in a guild need not grant the same powers as managing it. Paying for service does not grant access to a visiting human's protected memories, private information or spending authority.

Hosting payment also differs from authorship of a shared home. The later design should make contributors' credit, shared ownership and permission to change or remove one another's work understandable, including when a member leaves, the payer changes or service ends. Paying the bill should not silently settle everyone's contribution or retrieval rights. Reuse [DG13's shelter/contribution owners](../maintainers/needs-design.md#dg13--editable-shelter-and-useful-places) and existing property authority rather than inventing a separate ownership system here.

Reuse [MP's account/invite/revocation foundation](../maintainers/multiplayer.md), [ND37's operator-policy work](../maintainers/needs-design.md#nd37--public-world-reporting-participation-controls-and-operator-authority) and [participants/world-travel design](../projects/participants-and-world-travel-feature-spec.md). This idea does not propose a separate identity or permission system.

## Worlds can make different promises

Mike proposes configurable private worlds and **different rules among official worlds**, including PvP-enabled and PvP-disabled worlds. Roughly half of each is one possible allocation to investigate, not a fixed launch ratio. Player demand, community density and operating capacity should inform how many of each are useful.

Keep the underlying choices independent:

| Choice                  | What needs to be stated                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Human combat            | Whether and where players can harm one another; any consensual, territorial or other exceptions        |
| Player construction     | Whether players may construct at all, and in which places                                              |
| Editing and removal     | Who may alter or dismantle an existing structure, distinct from building a new one                     |
| Structure damage        | Whether hostile actors, players, environmental events or indirect effects can damage player structures |
| Storage theft           | Whether another player may take stored objects, and how ownership or permission affects it             |
| Death/corpse loot       | What a defeated character loses and who can recover it, separate from theft from a home                |
| Territorial claims      | Who controls the land and how claims may change, expire or be contested                                |
| Absence                 | Whether property or participants face danger when their owners are offline                             |
| Progression and imports | What a newcomer or traveler may bring and how shared milestones affect absent members                  |

The phrase “no player building or destruction” is retained as two selectable dimensions: a world could disable construction itself, or allow construction while protecting it from other players' destruction. Neither should be silently inferred from its PvP label.

Possible combinations illustrate the range; they are not a selected catalogue:

| Illustrative world                               | Human combat                          | Player building                            | Hostile base damage / taking stored property                                   |
| ------------------------------------------------ | ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| Protected community                              | Disabled                              | Allowed under land/member rights           | Prevented except explicitly authorized activity                                |
| Competitive world with durable homes             | Enabled under its stated combat rules | Allowed                                    | Other players cannot destroy protected homes or take their storage             |
| Destructive frontier                             | Enabled                               | Allowed                                    | Supported under clearly stated siege, ownership, looting and absence rules     |
| Environmental survival                           | Human PvP disabled                    | Allowed                                    | World-authored NPC/environment damage possible; player theft chosen separately |
| Combat or adventure setting without construction | Chosen for that setting               | Disabled or limited to authored facilities | Rules for existing structures and loot chosen separately                       |

A PvE label does not settle whether environmental danger can damage a building. A PvP label does not imply that offline demolition, theft or unlimited territorial displacement are permitted. A protected home can still sit within an interesting world with expeditions, scarce resources, dangerous regions, political conflict and meaningful consequences.

## Make the selected rules reliable

The future design should define the experience people are choosing before they invest in a home. It should explain meaningful rule changes, their timing and what happens to existing property or obligations. Moving a protected community into unrestricted destruction is a consequential product change, not just a hidden configuration edit.

Enforcement must consider supported indirect effects as well as direct commands. Enshrouded's response to flood griefing shows why preventing edits to a house can still leave it vulnerable to nearby terrain changes. In OpenLegend, delegated NPC work, fire, projectiles, creatures, obstruction or other hazards must follow the relevant world's actual laws and permission owners. This is a design question for the mechanisms that are selected, not a requirement to build every possible hazard.

Distinguish a physical prohibition from fictional law. One world may make theft impossible without permission; another may allow theft and let witnesses, institutions or retaliation respond. Labels and discovery information should describe the actual experience.

These profiles must not overwrite the existing [base-world direct-human-conflict target](../maintainers/needs-design.md#nd11--human-conflictrecovery-and-npc-ghost-continuity) or [shelter exposure design](../worlds/base/editable-shelters.md). Different supported worlds can make different choices. The engine supplies reusable enforcement mechanisms; the world's authored definitions supply its laws and tuning.

Imports need attention where worlds offer very different risk and acquisition rules. An item earned in a protected or highly permissive setting should not silently acquire unrestricted competitive authority elsewhere. Reuse the existing travel, rights and [official-world relic idea](official-world-relics.md); resolve the actual supported transfer rather than imposing one universal balance system.

## What hosting would sell

The attractive promise is a convenient, persistent place for a chosen group, with understandable service and membership control. An owner-funded offer is already a candidate under [CO01](../maintainers/commercial-offers.md); this proposal supplies a stronger reference case, not a decision that subscriptions must be the first offer.

A hosting offer must distinguish stored world retention, hours of availability, simultaneous capacity, background simulation, model/invention allowances and support. An always-accessible world does not automatically imply unlimited autonomous activity while empty. If the host has paid for guest participation, the existing commercial direction does not require those guests to buy another hosting subscription for the same access.

The later product decision must settle price and included usage, who operates the service, member limits and service capacity, suspension/cancellation, retained work and permitted retrieval, owner departure or transfer, outages and restoration. OpenLegend's private human records make unrestricted raw server-file export a different question from exporting a construction or customer-owned world content.

Those terms should state what access stops when payment ends, what remains stored and for how long, and how permitted retrieval works. Backups and restoration need their own scope: who may request a restore, and what happens to other contributors' work completed after that backup. No retention duration, unrestricted export or unilateral rollback right is selected by this idea.

First-party operation, an integrated provider and self-hosting are distinguishable options. No vendor, subscription price, lifetime service promise, capacity figure or data-export entitlement is selected here. Enshrouded rental offers and discussion establish a relevant market precedent; they do not measure demand, renewal or operating margin for OpenLegend.

## Design follow-through through existing owners

The [design register](../maintainers/needs-design.md) keeps this proposed work open in its existing groups:

| Owner                                          | Outcome when this proposal is selected                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DG29 / participants and world travel; MP; ND37 | Define world membership, scoped roles, property rights, revocation, owner departure and safe arrival/return.                                                                |
| DG07 / ND11 with DG13 / ND07                   | Specify independent combat, construction, damage, looting and absence profiles; preserve the already selected base-world target and choose concrete indirect-harm behavior. |
| DG27 / ND22 / CO01                             | Compare integrated managed hosting against the strongest feasible browser alternative; adopt actual customer/service/cost terms only with evidence.                         |
| DG17 / PS quiet-world and funding owners       | Resolve empty-world clocks and funded activity only if that continuation is part of the offered service.                                                                    |

Before implementation, the selected profiles need player journeys, world/engine contracts, lifecycle and enforcement design, and relevant qualification. Capturing this idea does not move it ahead of the current first-playable milestone or create an infrastructure project.

The most promising experience to evaluate is concrete: **a group builds somewhere worth belonging, others have reasons to visit, and everyone understands the risks and rights attached to that place.**

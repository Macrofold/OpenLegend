# Worlds, communities, and belonging

**Status: accepted strategic direction; concrete policies below are target requirements or explicitly identified design proposals, not implemented hosting or multiplayer guarantees.** See the [suite principles](README.md) and [feature specification](../projects/product-scalability-feature-spec.md).

## 1. The experience being protected

A returning player should be able to say: this is my home; these are the people I know; the bridge we built and the argument we had still matter. Moving computation, admitting a visitor, changing detail, or reducing a quiet world's resource use must not replace those facts with another community's version.

The game should support belonging without requiring ownership of all surrounding reality. A player can become the dependable craftsperson, founder of a household, discoverer of a technique, defender of a district, rival of a local leader, or friend of particular residents. Other players can have equally meaningful but different lives. Do not make every player the uniquely chosen savior in the same canonical history.

Freedom is not universal permission or guaranteed success. Actions affect a world with other agents, institutions, resources, and constraints. Make those constraints legible so the player experiences consequences rather than arbitrary refusal.

## 2. Preferred topology: distinct homelands in a federation

A homeland is a persistent society and place with its own residents, institutions, rules, and recorded past. Connected homelands can belong to one universe without being interchangeable copies of one settlement. A federation may use islands, valleys, cities, gates, or other authored connections; no particular fantasy geography is mandatory.

Keep four concepts separate:

| Concept            | Meaning                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| Community identity | The people, institutions, relationships, and history players belong to   |
| Fictional place    | The actual location where actions and travel occur                       |
| Computational area | An implementation boundary for maintaining relevant work and interaction |
| Machine/process    | Replaceable execution capacity; not a permanent fictional identity       |

A town need not fit permanently on one machine. A computational area need not be a player-visible world or a separate timeline. This document prescribes those semantic separations, not the infrastructure for implementing them.

New participants may settle in existing communities with room for them or help establish new places. New capacity should not silently make a duplicate Ada, restore a deposed mayor, or erase another player's building. Genuine new worlds or authored clones require distinct identity and explicitly stated relationships to prior history.

## 3. Personal and guild-controlled spaces

Players should have a path to a space they control, even when most play occurs in shared society. Supported products can range from a home inside a public town, through guild land, to a physically separate private domain. Do not require everyone to operate a private world to obtain basic protection against strangers building on their property.

Separate ownership from entry, building, item access, damage, resource use, inspection, and administration. An invitation to visit is not an invitation to remodel a house. A guild member may have narrower rights than a guild administrator. A creator's control of fictional land never grants access to a visiting human's protected private memories, credentials, account, or spending authority.

Permissions must apply consistently to coarse actions, detailed actions, narrative proposals, NPC assistants, world events, and transfers. A scene generator cannot place a new structure on someone's land where a player's ordinary Build action would be forbidden. A campaign cannot bypass domain participation permissions by declaring its villain omnipotent.

The owner should be able to understand who can do what and why an action was denied. Changes of ownership, invitation revocation, a visitor already inside, and a queued construction order require explicit lifecycle behavior. Exact policies belong to the account/access and world-rule owners; do not infer them from an ownership label alone.

Protecting ownership does not imply universal invulnerability. Public-world siege or damage rules must be agreed separately. A protected private domain can exclude such campaigns entirely, while an opt-in frontier settlement may accept meaningful risks. The distinction must be visible before irreversible investment.

## 4. Visiting, moving, and continuity

A visitor enters a place with an existing past. They do not need to have experienced that past for the place to be coherent. Explanations can come from residents, archives, visible construction, and other permitted evidence. Do not reveal all private history merely to make onboarding convenient.

Travel changes location, not identity. Accompanying NPCs, possessions, unfinished work, and accepted obligations retain their owners and provenance. Whether a particular character can accompany a traveler is an actual choice or supported permission, not automatic attachment of an entire city to the player.

Long-distance relationships need ways to remain meaningful: return visits, letters, institutions, messengers, and shared projects where the world supports them. Moving a caravan cannot by itself preserve every place-bound relationship, so mobile societies are optional content rather than the primary continuity solution.

Residency is not a concurrency reservation for every moment. More people can belong to a community than its measured simultaneous capacity, but correlated returns and major events need clear admission and headroom policies. Do not assume independent login probabilities or promise that residents can always materialize at an overloaded doorway. Preserve a person's home and offer an honest safe arrival/queue path.

## 5. Community decline and social population

Putting two empty communities on one computer saves infrastructure but does not make either socially lively. Social occupancy and machine utilization require different mechanisms.

Prefer consent-based settlement, invitations, trade, nearby shared activities, and new explicit travel connections over forced history merges. A route opening between Ashvale and Greyharbor can bring actual visitors into each other's lives. It is a recorded world change, not silent geographical rearrangement every time population fluctuates.

A quiet homeland should retain its identity and player investments under the declared retention policy. Autonomous activity may become cheaper or less frequent; players must know the relevant background rules. Retained history and continued funded intelligence are different promises. Do not assume a deserted world may be deleted, merged, reset, or made unsafe merely because its occupancy is inconvenient.

Any future archival, abandonment, subscription expiry, or public-land reclamation policy needs explicit notice, ownership rules, recovery/export behavior, and its own approval. This suite does not authorize those destructive policies. Avoid creating unbounded free autonomous obligations while postponing that product decision indefinitely.

## 6. Unique inhabitants and distributed significance

Generate many particular people rather than funneling all players toward the same few universally important companions. Seeding identity, motives, relationships, and opportunities is valuable; unconstrained random biography generation is not sufficient for quality. Experiences must be grounded in what the character actually did or learned.

One canonical embodied companion cannot be simultaneously adventuring with thousands of independent parties. The choices are genuine availability constraints, distinct NPCs, or explicit cloning/aspect mechanics with distinct identity and consequences. Never quietly copy the same memory-bearing individual to satisfy demand.

Officials can have limited audiences. Petitions, advisors, correspondence, public sessions, and scheduled meetings distribute interaction naturally. Institutional records are not a queen's autobiographical memories: being briefed is different from having personally attended an adventure. Necessary local relationships should remain readily available; the main experience must not be locked behind access to a single important official.

Higher responsibility can justify more computation and a higher evaluated baseline model-quality tier. That is independent of social entitlement, combat strength, player attachment, or background protection. A villager may matter more to one player than a queen does; the world should support both scales of significance.

## 7. Economy, clocks, and campaign membership

Connected places need an explicit compatibility policy. A creative domain permitting arbitrary conjuring cannot automatically export unlimited objects into a scarcity-based kingdom. A rapidly advancing calendar must not silently multiply tradable production merely because another domain uses a different time basis. Permissions to import objects, techniques, autonomous actors, information, and campaign receipts may differ.

The engine must preserve authorized provenance and transfers even when a world permits exceptional resource creation. Conservation of mundane matter is not a universal engine law. Accurate authority, attribution, and nonduplicated effects are.

Federation can be selective: a private world may allow social visits but not imports, shared combat, or participation in the same campaign. Present these boundaries as actual rules, not surprising post-travel confiscation. Detailed transport, provenance, and access contracts stay with their existing owners.

## 8. Stability and renewed participation

The desired replay value is accumulated meaning, not maximum disturbance. Preserve enough stable landmarks, relationships, routines, and institutions for change to be understandable. A world that destroys every investment during absence may be dynamic but unwelcoming.

Returning players need a bounded, perspective-correct account of what changed, why it matters, what still belongs to them, and what unfinished commitments require attention. Do not manufacture personal memories for events their character did not experience. Clearly separate remembered experience, testimony, public news, and current facts.

New players need attainable ways to matter even in mature communities: useful shortages, open institutions, undeveloped places, mentorship, new techniques, and projects with multiple roles. These are design responsibilities, not guaranteed consequences of having generative NPCs. Guard against entrenched players monopolizing all access and meaningful roles.

Expansion can introduce new mechanics, places, pressures, and forms of collaboration without resetting prior achievements or forcing identical stories. Measure retention, legibility of consequences, return experience, and access to meaningful action, rather than treating novelty as proof of appeal.

## 9. Required examples and failure cases

A player returns after others have visited: their home and particular relationships persist. A guest can enter but cannot build without permission. Two quiet communities gain a route without histories merging. A local companion declines a second simultaneous expedition because they are actually elsewhere. A private creative world visits a public event without exporting unauthorized resources. A newcomer finds an achievable role without replacing an established player's accomplishments.

Failures include: forced transfer into an incompatible timeline, copied companions with contradictory memories, creator inspection of visiting humans' private state, unannounced destruction during inactivity, and a global campaign overriding private-domain consent. The [feature specification](../projects/product-scalability-feature-spec.md) turns these into delivery gates.

## Maintained records

- Implementation: [PS01–PS08 delivery tracker](../maintainers/product-scalability.md).
- Limits and constraints: [Product-scalability inventory](../limits/product-scalability.md).
- Related design: [Feature specification](../projects/product-scalability-feature-spec.md) and [technical design](../projects/product-scalability-tech-design.md).
- Unresolved product choices: [Central decision register](../../archive/05-project/open-decisions.md#product-scalability-integration-choices).

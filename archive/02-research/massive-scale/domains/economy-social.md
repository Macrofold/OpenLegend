# Player interactions, economies and social systems

[Research index](../README.md) · Proposed design considerations, not acceptance of a global market, currency, guild system or real-money trading.

## Social continuity creates durable infrastructure obligations

A promise, trade, invitation and conversation are more than transient packets. Identify their native state, participant permissions, expiry clock, accepted transition and recovery behavior. Keep remembered interpretations separate: someone can believe a debt is unfair without changing the authoritative balance or obligation.

Sparse directional relationships fit OpenLegend better than allocating a value for every possible pair of agents. Store meaningful connections and query them by scope. A million agents have roughly a trillion ordered pairs; most need no relationship record. This is arithmetic, not a claim about any observed population.

Group membership, friendship, recognition, current hearing and historical acquisition differ. Joining a guild need not disclose every member's private mind or grant access to conversations before membership. A group broadcast service must not bypass the sensory rules of ordinary in-world speech.

## Economies are distributed correctness tests

For every resource family, define conservation, creation/destruction authority, divisibility, units and allowed transfer. Fixed-point/integer quantities where specified avoid accidental floating-point money semantics. Resource lots and unique item instances have different merge and split rules.

A market transaction needs a stable purchase operation, authoritative availability check, reservation or atomic exchange, and a durable outcome. Search can show stale listings; purchase cannot spend the same item twice. A single global auction book can become a serialization hotspot even when worlds themselves scale well. Partition by an accepted economic boundary or optimize its specialized owner rather than assuming the simulation fleet fixes it.

Useful invariants include total debits equal credits for a ledgered exchange, no negative spendable balance unless explicitly permitted, no duplicate unique ownership, and no resource release from both rollback and compensation. Keep a repair/audit path that can explain an anomalous transfer from authoritative records.

These recommendations follow invariant-based consistency rather than treating all player data as eventually mergeable. [S31](../sources.md#s31), [S33](../sources.md#s33)

## Time acceleration, save restoration and world forks are economic choices

OpenLegend's accelerated time makes unattended production and cross-world trade especially important. A resource created in a fast world and sold into a slow one can create an arbitrage path. A restored save can recreate goods that have already left the world unless export authority is outside the rewound timeline.

Before introducing persistent inter-world exchange, choose a clear policy: isolated economies; only non-economic character travel; irreversible export receipts outside world saves; or another explicitly conserved protocol. No option is implicitly selected here.

Real payment entitlements, subscription usage and paid inference attempts belong to external account reality. A player restoring yesterday's game should not receive yesterday's spent real-money balance again. A world clone may copy fictional content while retaining separate provenance and restrictions on export.

## Dense social hubs

A market, festival or political meeting combines several independent costs: bodies/collision, visible appearances, text delivery, private acquisition, voice subscriptions, social graph updates, moderation and generated replies. Designing it as “one room with more sockets” misses most of the work.

Consider a bounded set of explicit conversational groups inside a public space while maintaining legitimate ambient hearing under the accepted rules. Public announcements could be a distinct authored medium with different delivery semantics. Design such media before optimizing around them; do not silently change whispers into a global chat topic or discard witnesses to meet a load number.

Remote spectating is an interesting alternative for a large event, but spectators need a distinct permission model. A livestream may reveal knowledge that an embodied character could not acquire. The product must decide whether the human can observe without their character gaining that evidence and how that affects fair play.

## Identity, presence and messaging

Presence is ephemeral availability, not a permanent authoritative biography. A disconnected socket does not necessarily mean the player logged out, and multiple tabs do not imply multiple actors. Use account/session/controller relationships already identified in the [foundation review](../now/foundations.md).

Keep large fanout outside the simulation's critical loop where semantics permit. A durable invitation or mail message can use an asynchronous delivery service; a melee strike cannot wait behind a million-member announcement. Rate-limit and budget fanout at the source, with idempotent recipient processing where needed.

The early WoW cross-realm-zone material is informative because it reveals product boundaries around population, grouping and economic interaction. It is historical evidence of tradeoffs, not a current blueprint for Blizzard's complete implementation. [S09](../sources.md#s09)

## Abuse and emergent-system testing

Include griefing through obstruction, resource monopolies, rapid invitation churn, mass speech, repeated expensive semantic requests, manipulated prices and coordinated multi-account behavior. A syntactically valid action can still be an abuse or cost-amplification vector.

Keep moderation evidence separate from character memory and access it under explicit staff permissions. Provide reports, mutes, blocks and appeals appropriate to the product. A player's mute preference, platform safety restriction and a character's physical deafness are different states; their interaction with captions and AI context requires policy.

Run economic simulations across rule-version changes and long periods. Check distributional outcomes, not only local conservation: concentration, resource starvation, runaway production, inaccessible newcomers and strategic abuse can emerge from individually valid mechanics. These experiments inform design; they do not prove human behavior will match an LLM society.

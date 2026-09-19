# Creator worlds and mechanics packs

Recorded September 19, 2026. **Accepted product direction:** both platform and world memberships, standalone premium games, host-paid operation, and reusable community mechanics packs. Pricing, payment providers, allocations, and rollout remain proposals. Nothing is for sale or implemented.

## Worlds as independent creative businesses

An official public world, a managed creator world, and a self-hosted world are separate experiences. A managed-world owner pays for operation and bounded AI usage, invites players, and uses scoped god controls to shape the world. Guests need not all buy individual subscriptions. Population, activity, and accelerated time must fit the world's budget, including unattended NPC activity and storage.

Creators may brand and market a premium world as its own game. Standalone access should not require buying the Open Legend platform subscription. Hosting revenue comes from providing useful operation, reliability, backups, and support. Open source does not force a self-hoster or a competing operator to purchase Macrofold, Open Legend hosting, or a marketplace listing.

| Revenue stream | Buyer / funding source | Recipient / purpose |
|---|---|---|
| Managed-world hosting | World operator | Platform pays operating costs and earns a margin |
| Platform membership | Player | Access/benefits plus a bounded allocation to participating worlds |
| Premium-world membership | Player, including standalone customers | World operator, subject to clearly stated service/payment fees |
| Mechanics-pack purchase | Creator or operator | Pack author, with any disclosed marketplace fee |
| Creator fund | Platform budget and any explicitly allocated patron funding | Grants for new worlds, mechanics, and useful contributions |

Hosting costs and creator earnings are separate. A popular world is not automatically profitable. The provider, fees, refunds, payout eligibility, accounting, and cancellation terms are undecided.

## One subscription across participating worlds

The user favors earmarking a fixed amount from each paying subscriber for participating worlds they use. **$5 per subscriber per month is only an example**, not an agreed price or promise. If the budget were $5 and an allocation were 60/40, the two worlds would receive $3 and $2; visiting more worlds would not create more money.

Define qualifying human participation and the allocation policy before launch. NPC activity, faster simulated time, idle bots, and fabricated accounts must not mint payouts. Whether separately subscribed premium worlds also qualify for this pool remains open. Show clearly what each purchase includes and prevent accidental duplicate billing for the same entitlement.

## Create, refine, package, share

**Create a world by playing it. Share what you discover.**

A creator invents a mechanic during play, inspects it, refines it, and can package authorized definitions for others. A pack author need not operate a popular world. Packs can contain one interaction, a magic system, creature behaviors, items/recipes, art, or a complete world template. Core magic, spells, creatures, and templates may be separate packages with dependencies.

Keep a reusable template distinct from a running world's state and private history. Export selected definitions and permitted assets without automatically publishing character memories, player conversations, or unrelated world records. A fork receives only content it is authorized to copy.

An original wizard-school setting is a useful example. Selling packs incorporating protected franchise material, such as Harry Potter characters and setting expression, requires appropriate rights; user-generated content is not automatically cleared. [Copyright Office: derivative works](https://www.copyright.gov/circs/circ14.pdf).

## Import and compatibility proposal

1. Record authors/provenance, versions, engine/schema compatibility, dependencies, permissions, license, and expected operating costs.
2. Preview what the pack adds, replaces, or changes, including state migrations and required engine primitives.
3. Use bounded AI review to explain semantic conflicts. Example: conjured food may bypass a survival world's labor/scarcity assumptions. Offer compatible choices such as a mana cost or temporary food; do not silently choose for the owner.
4. Validate schemas, authority, dependencies, resource bounds, and world rules deterministically where possible. Run meaningful examples in a copy of the world; AI advice is not proof of compatibility.
5. Pin approved versions and apply explicit migrations. Give operators an update/rollback plan; do not silently update a live world with established history.

Large libraries require dependency-aware retrieval of affected mechanics rather than assuming every definition fits in one prompt. Tests and observed failures should improve the review process. Declared operating costs should distinguish measured workloads from estimates, and generation-time costs from recurring model calls. Pack purchase does not include unlimited inference.

The license must distinguish use in a paid world, modification, exporting, and redistribution/resale of definitions. An author cannot revoke permissions already granted for inherited open components. See [LICENSING.md](../../LICENSING.md), including the unresolved executable-extension boundary.

## Sequence to test

Prove a playable creator loop, then portable packs and free sharing, managed-world economics, and a curated paid marketplace. Community governance, public grants, and broader revenue allocation can follow evidence of repeat use. These are later product directions, not additions to the first playable milestone.

Related: [patrons and history](patrons-contributors-and-world-history.md), [private worlds](open-platform-and-private-worlds.md), [funding exploration](tokens-and-community-funding.md).

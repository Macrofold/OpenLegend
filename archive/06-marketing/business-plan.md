# Open Legend business plan

Recorded September 19, 2026, following the founder's request to document the business-model discussion.

**Status: working launch plan.** The founder wants Open Legend to become profitable quickly, avoid an ongoing personal subsidy, and remain manageable alongside running an existing company. Prices, cost figures, allowances, and customer targets below are planning hypotheses to validate. No paid offering has launched.

## Objective and operating constraints

Build a small, paid hosted-world business that can cover its operating costs with tens of customers. Prioritize a narrow, enjoyable experience, predictable spending, and manageable support work.

The first commercial milestone is **ten renewing customers, positive monthly cash flow, and a sustainable weekly time commitment**. Track cash performance and founder time separately: covering infrastructure does not repay development work or establish that the business is a good use of the founder's time.

Before increasing development or hosting commitments, set a firm personal spending ceiling, a weekly time budget, and a review date. Their exact values remain open. These constraints should determine launch scope and expansion pace.

## First customer and product promise

Start with simulation enthusiasts and worldbuilders who enjoy shaping a persistent world and observing its consequences. Willingness to pay remains unproven.

> Your own evolving world, populated by people who remember what happens. Shape it, introduce inventions, and watch the consequences.

The first paying owner should get an enjoyable experience alone. Inviting friends can add value when multiplayer is ready, but reaching the first commercial test should not depend on delivering the complete multiplayer vision.

A candidate first experience is a small wilderness group with survival knowledge and possessions. Its members survive or die, remember events, develop relationships, and discover a limited set of new interactions. The owner can influence the world, see consequences, save it, and return later. Demonstrate a compelling loop before expanding population, geography, or the range of generated mechanics.

## Initial offering and pricing test

Test **one plan around $39 per month per world owner**. This is a premium-price hypothesis, not a selected public price or evidence of demand.

| Included benefit | Proposed boundary |
|---|---|
| One private hosted world | Small, explicitly defined population and operating limits |
| God controls and persistent history | Controls apply to the owner's world; save and recovery behavior is explained |
| Conversations, inventions, and autonomous deliberation | A meaningful included AI allowance shared across the world |
| Additional AI usage | Optional prepaid usage with a hard spending limit; no automatic overages by default |
| Guest access, once multiplayer is ready | The owner funds the world's allowance; each guest need not subscribe |

Select population limits and included usage after measuring real play. Customers should understand the allowance without counting tokens during gameplay. Explain when it replenishes, what consumes it, and what happens when it runs out. Normal play needs to feel generous; if a sustainable allowance produces a frustrating experience, change the product, implementation, or price before expanding.

Charge for a working, clearly described early-access experience. Avoid selling commitments to the entire future roadmap.

## Player subscription tiers and invention allowances

**Accepted direction — September 19, 2026:** give each player a recurring invention allowance based on their subscription tier. Free players can invent a limited number of things; paid tiers can include larger allowances. This refines F28/D17. Exact tier names, prices, counts and renewal rules remain undecided, and no subscription quota is implemented.

| Player tier | Invention benefit | Choices still open |
|---|---|---|
| Free | A finite recurring allowance | **10 or 30 inventions per month** are alternative examples, not selected limits |
| Paid tier(s) | Larger finite allowances appropriate to the subscription | Number of tiers, monthly quantities, prices and other included benefits |

“About one a day” describes the rough generosity of a 30-per-month allowance. It does not select a daily reset, daily cap or requirement to log in every day. Decide between a monthly allowance usable flexibly and any separate burst controls before publishing the offer. Do not advertise unlimited invention without a sustainable, explicit operating policy.

This player entitlement is separate from the proposed owner-paid hosted-world plan above. A guest can use a free player allowance in a host-funded world without purchasing an individual subscription, subject to world permissions and available AI funding. How standalone premium-world memberships, host sponsorship or future add-ons grant extra invention allowance remains open; paying for world access must not silently imply an unlimited allowance or require a second subscription for already purchased benefits. These are managed-service packaging rules, not a mandatory subscription for running the open-source game independently.

Proposed counting and renewal behavior:

- Scope the allowance to the player account across participating managed worlds, rather than resetting it for each character, world, reconnect or server session.
- Consume one unit for a successfully admitted, distinct invention. Supporting declarations generated for one logical invention should not each consume a unit, but a bundle of independent inventions must not bypass the count. Define this unit clearly before implementation. Existing recipe use, crafting item instances, learning/teaching, importing an unchanged definition and inspecting past inventions do not themselves count as new inventions.
- Rejected, canceled-before-admission or failed proposals do not consume a completed-invention unit. They may still incur AI costs; separate dispatch budgets and request-rate controls bound those costs. Retries, duplicate submissions and recovery must not double-count one admission. Whether substantive workshop revisions consume units is an open packaging choice.
- Autonomous NPC inventions use the world's agent policy and AI budget, not an arbitrary human's personal quota. A player-directed invention carried out by an NPC or AI retains its originating player account and allowance.
- Renew by an explicit real-world entitlement period, independent of accelerated game time. Calendar month versus subscription anniversary, rollover, upgrades/downgrades, cancellations, late completions and optional top-ups remain open. Store versioned entitlement rules so changing a plan does not rewrite past usage.
- Exhaustion blocks new player invention requests until renewal or an explicit entitlement change. Players retain their inventions, attribution and permitted use of existing mechanics. A reset or downgrade must not delete inventions or revoke existing reuse rights.

Show the current tier, included invention count, used/reserved/remaining units and next renewal time in [Billing / AI costs](../03-design-proposals/playability-and-controls.md#billing-menu-and-cost-breakdown). Distinguish **invention allowance exhausted**, **player invention locked**, and **AI spending unavailable**. Buying more AI funding does not automatically add invention units, and an available invention unit never authorizes spending or overrides a world lock. Any combined offer must say exactly what it includes.

The prototype's world-wide lifetime cap of 64 techniques is a separate temporary registry bound. It is not the subscription allowance, is not per player, and does not renew. The [billing contract](../07-technical-architecture/billing-and-usage-reporting.md#player-invention-entitlements) describes the proposed separate entitlement check. This packaging direction does not expand first-playable acceptance or commit to launching every tier alongside the initial hosted-world test.

The accepted [runtime-art direction](../03-design-proposals/visual-direction.md#art-generated-during-play) uses a separate, bounded art spending allocation. Ordinary visual consequences, such as a dead rabbit, and generated variants of existing mechanics do not consume invention units. Supporting artwork for a new invention does not consume a second unit. Decide included image-generation benefits and prices separately; no tier currently promises unlimited images. Reuse persisted assets and keep immediate visual effects available when optional generation funding runs out.

## Cost controls are product requirements

An owner who accelerates time, creates many interactions, or leaves autonomous residents running can generate substantial costs. Bound spending for each world and across the service.

- **Pause inactive worlds by default.** Offer background simulation only within an explicit operating budget. Stored history still incurs storage costs, which must be included in the plan.
- **Use ordinary code for established mechanics.** Gathering, needs, resting, and known interactions should not require fresh model calls each time. Reserve AI for useful conversation, deliberation, interpretation, and novel mechanics.
- **Cap AI spending per world.** Include model tokens, tool calls, retries, memory processing, and autonomous background work. A cap must cover all workflows spending on behalf of that world.
- **Keep accelerated time within the same spending ceiling.** Faster simulation cannot silently authorize more AI expenditure. Any reduction in deliberation frequency or optional paid background activity should be understandable to the owner.
- **Keep ordinary simulation useful when the allowance is exhausted.** Clearly defer or limit AI-dependent features without losing world state or presenting missing inference as a successful action.
- **Measure heavy users as well as averages.** Establish actual costs before increasing population, context size, activity, or included usage.

These are behavioral requirements, not a prescribed vendor or agent framework. Their implementation can evolve while preserving predictable costs and the customer experience.

## Illustrative monthly economics

The following numbers are budget assumptions, not measured costs or a revenue forecast. They assume each paying customer owns one world.

| Item | Monthly assumption |
|---|---:|
| Price per paying world | $39 |
| Variable cost per world, including AI, infrastructure, storage, and payment fees | $10 |
| Contribution per world | $29 |
| Shared fixed operating costs | $150 |
| Paying worlds needed to cover those costs | 6 |

Break-even worlds = round up(shared fixed costs / (price per world − variable cost per world)).

Under these assumptions, ten paying worlds generate $390 in monthly revenue and $140 after the modeled operating costs. Twenty-five generate $975 in monthly revenue and $575 after those costs. These amounts exclude founder compensation, taxes, recovery of development costs, and other unmodeled expenses such as refunds or acquisition spending. They also assume fixed costs do not increase over that range.

Validate the $10 variable-cost allowance and the $150 fixed-cost assumption with actual provider bills and workload measurements. Record recurring subscription income separately from patron contributions and prepaid usage sales; prepaid balances create future service obligations. Positive cash flow in one month is insufficient if future usage or support commitments consume it.

## Launch and validation sequence

| Stage | Work | Evidence needed to proceed |
|---|---|---|
| Establish boundaries | Set a personal spending ceiling, weekly time budget, and review date; instrument world costs | Scope and experimentation fit the founder's available resources |
| Build the first paid experience | Deliver one enjoyable small-world loop with persistence, bounded AI, and basic recovery | Someone can use it and understand its value without constant founder intervention |
| Recruit 5–10 paying early users | Demonstrate actual gameplay and invite relevant simulation enthusiasts and worldbuilders personally | People pay for the functioning experience and return to their worlds |
| Evaluate renewals | Observe repeat use, cancellations, costs, and support burden | Ten renewing customers, positive monthly cash flow, and a sustainable time commitment |
| Expand selectively | Add capacity or features responding to demonstrated demand | Margins and support remain manageable as usage grows |

Early acquisition should use concrete stories and short gameplay clips: a resident remembers an event, an invention changes survival, or an intervention has a surprising consequence. Test interest among people who already enjoy simulation and worldbuilding. Treat the effectiveness of each channel as an experiment.

Track a small set of measures: paying and renewing worlds, repeat play, reasons for cancellation, AI and total operating cost per world, costly usage patterns, and founder hours spent on support and maintenance. Distinguish people paying mainly to support the founder from people renewing for the experience itself.

At the review date, reduce scope, change the offer, or pause further investment if users do not return, sustainable allowances undermine the experience, or support exceeds the time budget. Adding a marketplace or a larger world does not by itself resolve those failures.

## Revenue opportunities to sequence later

| Opportunity | Treatment in this plan |
|---|---|
| Patron recognition and founder packs | Possible supplemental early funding if benefits are inexpensive and clearly bounded; avoid lifetime hosting or unlimited AI promises |
| Platform memberships and independent premium-world memberships | Preserve as longer-term product directions; first validate the owner-paid hosted offering |
| Paid mechanics packs and marketplace fees | Add after repeat use and demand for sharing; do not make marketplace liquidity a prerequisite for early revenue |
| Creator payouts, subscription revenue allocation, and creator funds | Defer operational commitments until the core business supports them |
| Advertising and token-based funding | Excluded from the initial revenue assumptions |

This launch plan brings paid hosted-world validation forward relative to the earlier sequence in [creator worlds and mechanics packs](creator-economy-and-mechanics-packs.md). Portable packs and free sharing need not precede that commercial test. The broader creator/community directions remain available for later releases.

## Macrofold and the open platform

Implement the Macrofold capabilities needed for the first paid experience and its cost controls. Reusable improvements may benefit Macrofold as a standalone service, but speculative future Macrofold revenue should not be counted as proof that Open Legend is profitable.

Measure the actual external costs attributable to Open Legend, including model calls, infrastructure, storage, and tools. Keep internal charges or shared-platform allocations distinguishable from external cash spending. Record platform development and maintenance time as well as bills; owning the platform does not make its operation free.

The hosted offering earns revenue through a convenient, reliable experience and ongoing operation. Preserve the project's existing open-source direction and ability to self-host; see [open platform and private worlds](open-platform-and-private-worlds.md) and [LICENSING.md](../../LICENSING.md).

## Decisions to resolve through the first experiment

- Which initial audience returns often enough to renew, and what experience drives that return?
- Does a price around $39 match the value delivered, or should the price and scope change?
- What population, AI allowance, context retention, and background activity fit the measured costs?
- How should allowances and depleted-budget behavior be explained during play?
- What personal spending ceiling, weekly time budget, and review date should govern the project?
- What lightweight onboarding, billing, cancellation, and recovery capabilities are necessary to keep support manageable?

## Comparable products and limits of the evidence

Sources checked during the September 19, 2026 business-model discussion:

- [Minecraft Realms](https://www.minecraft.net/en-us/realms) provides a precedent for paid private worlds, with plans listed at $3.99–$7.99 per month. Open Legend would need to demonstrate additional value to justify the proposed premium; these prices do not establish its willingness to pay or AI economics.
- [AI Dungeon credits](https://help.aidungeon.com/faq/what-are-image-credits) provides a precedent for subscriptions with included credits and additional credit purchases. This supports considering the packaging pattern, not assuming the same usage costs or customer behavior.

Related planning: [earlier business ideation](../04-ideation/business-and-future-directions.md), [creator economy](creator-economy-and-mechanics-packs.md), [patrons and world history](patrons-contributors-and-world-history.md), and [marketing experiments](ideas-channels-and-experiments.md).

# Open Legend business plan

| Status | Current progress | Last updated |
|---|---|---|
| Working commercial hypotheses | The intended game is defined; managed worlds are a concrete offer to compare with a feasible alternative, while actual terms, customer demand and operating economics remain unvalidated. | 2026-10-17 |

## Objective and operating constraints

Build a compelling Open Legend game and a business that can support its delivery without an ongoing personal subsidy or an unmanageable founder workload alongside the existing company. The [playable-game priority](../../docs/repertoires/gameplay-priorities.md) owns the survival-adventure experience; a hosting arrangement does not replace it with an observer simulation or engine demonstration.

The immediate operating question is whether actual customers value an affordable, supportable offer. A later objective of side income, founder livelihood or studio growth requires a corresponding financial and time target; do not assume that covering infrastructure satisfies all three. Track cash performance and founder time separately.

For the managed-world candidate, **ten renewing customers, positive monthly operating cash flow and sustainable weekly effort** form a useful early milestone, not proof of a large market, founder salary or recovered development costs. The illustrative arithmetic below demonstrates how modest that milestone can be.

Before dependent spending or scope commitments, set a firm personal spending ceiling, a weekly time allowance and a review point. Exact values remain open. Preserve the distinctive player experience while controlling the size of the financial bet.

## First customer and product promise

Test players who enjoy survival-adventure, sandbox experimentation and consequential simulation. Worldbuilders and game masters are a related audience for authoring, not automatically the same customers. Distinguish interest in AI technology, playing an adventure, editing a world and managing a hosted community.

> Explore a living world, invent a practical way through an obstacle, and discover what your choices change.

This is a proposed message to test against actual supported gameplay. The opening experience should connect an understandable goal, opposition, meaningful choices, useful rewards, progression, crafting or building, and a real instance of useful invention and independent character consequence. The player may use a reliable known method; invention and cooperation must not be forced or secretly scripted.

The first commercial experience should be worthwhile alone. Shared play can add value without making a mass simultaneous population necessary. Keep character abilities, creator authority and ownership of a hosted world distinct. Demonstrate repeat value through another approach, challenge or consequence rather than merely the fact that a save persists.

## Compare feasible offers

Managed private worlds are the concrete candidate developed in this plan, **not a business-model winner established by the indie launch archive**. Compare this candidate with the strongest feasible alternative for the same intended game before committing substantially to packaging, billing or continuing service obligations. A paid game with an affordable included-service arrangement or another bounded access offer is a category to investigate, not an adopted alternative.

For each candidate, record what a player receives, price and extra charges, access friction, included AI/service, what happens at exhaustion or cancellation, persistence/support obligations, typical and costly usage, founder effort and platform feasibility. Compare honest terms rather than a generous imaginary version of one option with a constrained version of another. A subscription justified by our AI bill is not evidence of customer preference.

Descriptions and interviews can identify misunderstandings and poor-fit terms without implementing multiple billing systems. Actual payment and eligible renewals provide different evidence and require a ready, approved deliverable. Keep supporters' contributions separate from purchases motivated by the game. Before selecting a Steam route, check generated-content, external-service access and payment requirements in the [execution guide](../02-research/indie-launch-commercials/execution-playbook.md#conditional-steam-route).

Existing accepted entitlement, creator and open-platform directions remain available; they do not select the first offer, price or mandatory purchase bundle. Mike must resolve consequential actual terms before dependent implementation or public commitments.

## Initial offering and pricing test

A candidate test is **one plan around $39 per month per world owner**. This is a premium-price hypothesis, not an adopted public price or evidence of willingness to pay. The benefits below describe the managed-world candidate rather than compulsory packaging for every player.

| Included benefit | Proposed boundary |
|---|---|
| One private hosted world | Small, explicitly defined population and operating limits |
| Creator controls and persistent history | Controls apply to the owner's world; ordinary player abilities remain separate; save and recovery behavior is explained |
| Conversations, inventions and autonomous deliberation | A meaningful included AI allowance shared across the world |
| Additional AI usage | Optional prepaid usage with a hard spending limit; no automatic overages by default |
| Guest access, when qualified for the offer | The owner funds the world's allowance; each guest need not subscribe |

Select population limits and included usage after measuring real play. Customers should understand the allowance without counting tokens during gameplay. Explain replenishment, consumption and exhaustion. Normal play needs to feel generous; if sustainable usage produces a frustrating experience, change the implementation, scope or offer before expanding rather than hiding the limit.

Charge for a working, clearly described experience, not the entire future roadmap. Test player value, responsiveness, consistency and delivery cost together. Do not remove the defining gameplay simply to make a proposed subscription affordable.

## Player subscription tiers and invention allowances

**Accepted entitlement direction:** give each player a recurring invention allowance based on their subscription tier. Free players can invent a limited number of things; paid tiers can include larger allowances. This refines F28/D17. Exact tier names, prices, counts and renewal rules remain undecided, and no subscription quota is implemented. This direction does not establish that all initial customers must buy a player subscription or a hosted-world plan.

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
- Autonomous NPC inventions use the world's agent policy and AI budget, not an arbitrary human's personal quota. A player-directed invention carried out by an NPC or AI retains their originating player account and allowance.
- Renew by an explicit real-world entitlement period, independent of accelerated game time. Calendar month versus subscription anniversary, rollover, upgrades/downgrades, cancellations, late completions and optional top-ups remain open. Store versioned entitlement rules so changing a plan does not rewrite past usage.
- Exhaustion blocks new player invention requests until renewal or an explicit entitlement change. Players retain their inventions, attribution and permitted use of existing mechanics. A reset or downgrade must not delete inventions or revoke existing reuse rights.

Show the current tier, included invention count, used/reserved/remaining units and next renewal time in [Billing / AI costs](../03-design-proposals/playability-and-controls.md#billing-menu-and-cost-breakdown). Distinguish **invention allowance exhausted**, **player invention locked**, and **AI spending unavailable**. Buying more AI funding does not automatically add invention units, and an available invention unit never authorizes spending or overrides a world lock. Any combined offer must say exactly what it includes.

The historical prototype registry cap of 64 techniques was separate from the proposed account allowance. The [LA108 inventory](../../docs/limits/inventions.md#la108) records that stored-count limit as removed; this document does not independently reverify runtime behavior. It must not be used as a current subscription quantity or recurring product restriction. The [billing contract](../07-technical-architecture/billing-and-usage-reporting.md#player-invention-entitlements) describes the proposed separate entitlement check. This packaging direction does not expand first-playable acceptance or commit to launching every tier alongside an initial commercial test.

The accepted [runtime-art direction](../03-design-proposals/visual-direction.md#art-generated-during-play) uses a separate, bounded art spending allocation. Ordinary visual consequences, such as a dead rabbit, and generated variants of existing mechanics do not consume invention units. Supporting artwork for a new invention does not consume a second unit. Decide included image-generation benefits and prices separately; no tier currently promises unlimited images. Reuse persisted assets and keep immediate visual effects available when optional generation funding runs out.

## Cost controls are product requirements

An owner who accelerates time, creates many interactions or leaves autonomous residents running can generate substantial costs. Bound spending for each world and across the service without making cost control a substitute for an enjoyable game.

- **Scope absence promises to the offered world.** The first ordinary private-hosting offer may pause without active play under its disclosed profile. Optional continued communities use [DG17's finite provisioned periods](../../docs/projects/continuing-lives-feature-spec.md#15-dg17--a-first-funded-unattended-community), explicit funding and coherent stop/resume; no monthly renewal itself promises background progression. Stored history still incurs costs. This is not a new universal absence rule for every authored world.
- **Use ordinary code for established mechanics.** Gathering, needs, resting and known interactions should not require fresh model calls each time. Reserve AI for useful conversation, deliberation, interpretation and novel mechanics.
- **Cap AI spending per world.** Include model tokens, tool calls, retries, memory processing and autonomous background work. A cap must cover all workflows spending on behalf of that world.
- **Keep accelerated time within the same spending ceiling.** Faster simulation cannot silently authorize more AI expenditure. Any reduction in deliberation frequency or optional paid background activity should be understandable to the owner.
- **Keep ordinary simulation useful when the allowance is exhausted.** Clearly defer or limit AI-dependent features without losing world state or presenting missing inference as a successful action.
- **Measure heavy users as well as averages.** Establish actual costs before increasing population, context size, activity or included usage, while measuring the quality of the same experience.

These are behavioral requirements, not a prescribed vendor or agent framework. Their implementation can evolve while preserving predictable costs and player value. A technically cheap call that produces no useful play is not a successful optimization of the offer.

## Illustrative monthly economics

The following numbers are budget assumptions, not measured costs or a revenue forecast. They assume each paying customer owns one world under the managed-world candidate.

| Item | Monthly assumption |
|---|---:|
| Price per paying world | $39 |
| Variable cost per world, including AI, infrastructure, storage and payment fees | $10 |
| Contribution per world | $29 |
| Shared fixed operating costs | $150 |
| Paying worlds needed to cover those costs | 6 |

Break-even worlds = round up(shared fixed costs / (price per world − variable cost per world)). This expression assumes positive per-world contribution and fixed costs within the evaluated range.

Under these assumptions, ten paying worlds generate $390 in monthly revenue and $140 after the modeled operating costs. Twenty-five generate $975 in monthly revenue and $575 after those costs. These amounts exclude founder compensation, taxes, recovery of development costs and unmodeled expenses such as refunds or acquisition spending. They also assume fixed costs do not increase over that range. **Ten renewals would be an initial operating signal, not a livelihood or studio-growth result.**

Validate the $10 variable-cost allowance and $150 fixed-cost assumption with actual provider bills and workload measurements. Record recurring subscription income separately from patron contributions and prepaid usage sales; prepaid balances create future service obligations. Positive cash flow in one month is insufficient if future usage or support commitments consume it. Keep actual cash, economic effort and resources available to continue distinct, and avoid subtracting fees already removed from a reported revenue figure.

## Launch and validation sequence

Game, audience and business work proceed in parallel under the [execution guide](../02-research/indie-launch-commercials/execution-playbook.md). The [short brief](../02-research/indie-launch-commercials/execution-brief.md) identifies the current experiment rather than duplicating a gameplay roadmap.

| Commitment | Evidence needed |
|---|---|
| Invest in a connected playable experience | A distinctive player promise, feasible experiment limit and the relevant existing implementation context |
| Broaden discovery | Understandable attraction, rewarding actual play and qualified response beyond a single friendly group |
| Select an initial paid offer | Realistic player preferences, experience integrity, delivery cost, platform feasibility and approved terms |
| Run a managed-world pilot, if selected | A working approved offer; a proposed 5–10 early paying users who can receive the actual experience without constant founder intervention |
| Evaluate that pilot | Eligible renewals, voluntary return, cancellations/reasons, cash contribution, obligations and support hours |
| Expand the selected business | Results that justify the next increase toward the chosen financial/time ambition, not merely reaching an arbitrary audience count |

Early material should show an actual player goal, useful invention or alternative, an independent response and a meaningful consequence. Authoring demonstrations can target worldbuilders separately. Test message/source fit; do not infer subscription demand from developer interest, video views or free sampling alone.

Track paying and eligible renewing worlds where applicable, repeat play appropriate to the game's promise, reasons for cancellation/refund, total operating cost, costly usage and founder support/maintenance time. For a different approved offer, use the corresponding purchase and satisfaction criteria rather than imposing renewals on a finite paid game.

At the experiment limit, rework the specific diagnosed gap or pause dependent investment when evidence is insufficient. Strong repeated response should lead to deliberate distribution and appropriate specialist help, not endless identical tiny tests. A marketplace or a larger world does not resolve weak player value by itself.

## Revenue opportunities to sequence later

| Opportunity | Treatment in this plan |
|---|---|
| Patron recognition and founder packs | Possible supplemental funding with inexpensive, bounded benefits; do not conflate support for the founder with game demand or promise lifetime hosting/unlimited AI |
| Platform memberships and independent premium-world memberships | Preserve as product directions; actual initial packaging remains subject to the offer comparison |
| Paid mechanics packs and marketplace fees | Consider after repeat value and demand for sharing; marketplace liquidity is not a prerequisite for the first game |
| Creator payouts, subscription revenue allocation and creator funds | Defer operating commitments until an approved, sustainable business can fund them |
| Advertising and token-based funding | Excluded from the initial revenue assumptions |

Portable packs and free sharing need not precede a commercial test. The broader creator/community directions remain available without turning the first offer into a commitment to operate the entire platform vision.

## Macrofold and the open platform

Implement the Macrofold capabilities required by the selected player experience and its cost controls under their existing authorizations. Reusable improvements may benefit Macrofold independently, but speculative future Macrofold revenue does not establish Open Legend profitability.

Measure external costs attributable to Open Legend, including model calls, infrastructure, storage and tools. Distinguish internal charges or shared-platform allocations from external cash spending. Record platform development and maintenance time as well as bills; owning the platform does not make it free.

Managed hosting, if selected, earns revenue through a convenient, reliable experience and ongoing operation. Preserve the project's open-source direction and ability to self-host; see [open platform and private worlds](open-platform-and-private-worlds.md) and [LICENSING.md](../../LICENSING.md).

## Decisions to resolve through the first experiment

- Which intended players choose another session, and what actual activity drives that return?
- Do those players prefer managed worlds or a feasible alternative, and what does each purchase include?
- Does the managed candidate's proposed price around $39 match its value, or must price, scope or delivery change?
- What population, AI allowance, context retention and background activity fit both enjoyable play and measured cost?
- How should included service, depleted-budget behavior, cancellation and continuing access be explained?
- What personal spending ceiling, weekly time allowance, review point and business ambition govern the next commitment?
- Which onboarding, billing, cancellation and recovery capabilities are actually required for the selected offer?

## Comparable products and limits of the evidence

The following are historical pointers from the September 19, 2026 business-model discussion, not current price quotes or proof of demand for Open Legend:

- [Minecraft Realms](https://www.minecraft.net/en-us/realms) supplied a private-world subscription precedent, with plans recorded then at $3.99–$7.99 per month. These historical prices do not validate Open Legend's proposed premium or AI economics; recheck the actual comparator when testing an offer.
- [AI Dungeon credits](https://help.aidungeon.com/faq/what-are-image-credits) supplied a subscription/credit packaging precedent, not evidence of the same costs, preferences or current terms.

The [commercial research](../02-research/indie-launch-commercials/learnings.md) supplies comparisons and counterexamples, not a measured success probability for this business. Relevant planning: [business ideation](../04-ideation/business-and-future-directions.md), [creator economy](creator-economy-and-mechanics-packs.md), [patrons and world history](patrons-contributors-and-world-history.md), and [marketing experiments](ideas-channels-and-experiments.md).

## DG27 customer-offer product proposal

The [customer and supporter offers specification](../../docs/projects/customer-and-supporter-offers-feature-spec.md) refines counting, periods, overlapping benefits, exhaustion, fulfillment, cancellation, remedies and a separately optional historical dedication. [CO01–CO06](../../docs/maintainers/commercial-offers.md) stages a hosted paid-renewal test under existing PD10/INV-13. All actual prices, unit quantities, service/retention commitments, operator budget and time allowance still require adoption for the actual offer. The arithmetic above remains an illustration; renewals, positive cash flow and sustainable effort require observed evidence. A prepared entitlement design does not determine which offer customers prefer.

## DG30 conditional operating expense

The [creator-fund proposal](../../docs/projects/creator-fund-and-contributor-governance-feature-spec.md) is a finite later program funded from an actually approved platform expense budget after existing obligations. It reserves full awards, payment uncertainty, review/administration, evidence, remedies and closure; gross receipts, purchased AI value and earned creator allocations are not spare cash. Its examples do not establish an affordable budget or select the first offer. [FUND01–FUND06](../../docs/maintainers/creator-fund-and-contributor-governance.md) keeps actual funding and operator-time adoption open. Useful ordinary contributions and the first enjoyable game remain independent of running a fund.

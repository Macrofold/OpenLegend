# Business models and future directions

Status: **open ideation**. These are product hypotheses, not accepted requirements, market validation, revenue forecasts, or commitments. The brief explicitly asks about free/paid access, entertainment and other value, and advertising.

September 19 update: subsequent accepted directions and their remaining open details are recorded in [creator worlds and mechanics packs](../06-marketing/creator-economy-and-mechanics-packs.md) and [patrons, contributors, and world history](../06-marketing/patrons-contributors-and-world-history.md). Those documents supersede the earlier open alternatives here where applicable: both subscription models, standalone premium games, host-paid operation, a pack ecosystem, patron recognition, and a creator fund are wanted. Prices and implementation remain unselected. [Token/funding exploration](../06-marketing/tokens-and-community-funding.md) remains exploratory; the [core AGPL decision](../../LICENSING.md) is applied.

## A product promise people can understand

The strongest candidate promise is: **meet people who remember you, and help a shared world discover what it can do**. “AI NPCs” describes a technology; returning to a resident who remembers helping you describes a reason to play.

Three potential audiences merit separate testing: social-world players who value relationships; creative sandbox players who want to invent; and simulation enthusiasts who enjoy observing consequences. A product serving all three equally from day one may be too diffuse. The primitive wilderness starting group tests overlap between them through survival, social choices and invention, without requiring a combat progression treadmill.

## Monetization candidates

| Model | What a player buys | Fit | Important unresolved issue |
|---|---|---|---|
| Free world + bounded paid generativity | More novel requests and richer conversation allowance | Directly funds a major variable cost | How to make allowances understandable without counting tokens in gameplay |
| Character slots | Additional identities/storylines | Matches the user's suggestion | Persistent extra characters can multiply unattended compute; define active/offline behavior |
| Private worlds/sectors | A controlled social space and configurable scenario | Natural host-paid packaging | World persistence and NPC compute continue even when guests do not pay |
| Cosmetic packs | Appearance, homes, expression | Can avoid charging for survival | Production cost, style consistency, and whether customers value cosmetics |
| Content/world membership | Authored places, tools, scenarios, communities | Familiar broad model from other games | Do not fragment friends or make knowledge/novelty feel arbitrarily inaccessible |
| Creator subscription | Scenario tools, world editing and diagnostic limits | Plausible for hosts/educators/story creators | Creator authority must remain scoped to owned worlds, not purchased power in a public world |

Minecraft Realms offers useful host-paid/private-world inspiration; RuneScape membership offers content-access inspiration. Neither prices persistent autonomous LLM characters for Open Legend. The [game comparison](../02-research/games-and-emergence.md) records verified current examples and their limits.

## Proposed tier logic, with prices deliberately open

**Free:** movement, needs management, known actions, local event history, and a limited meaningful conversation/novelty allowance. When the allowance is used, let people keep playing and understanding their world. A failed provider call should not consume the player's allowance; a valid failed in-world attempt may consume resources/time according to clear rules.

**Supporter:** a higher bounded allowance, optional extra character, and cosmetic or community benefits. Avoid “unlimited AI” until worst-case usage is sustainable. Reserve estimated compute internally, settle actual use, and expose a simple fair-use concept externally.

**Host/creator:** a private sector with bounded active residents, concurrent guests, storage, and generation allowances. Provide pause/hibernate options. A world full of autonomous residents has a cost even if its human host is absent.

This is a packaging sketch, not a pricing table. Paid-area access remains an option, but the first design should test whether it harms social cohesion. Paid novelty also creates a public-good question: if one person funds invention of a bow, do all players then use the known action freely? A proposed answer is yes where world knowledge permits; fund discovery and compute, not permanent exclusive ownership of every useful verb.

## Unit economics before subscription prices

Track cost at the account, session, actor-hour, active sector-hour, and generated-capability level. Shared NPC idle cost, storage, speech, media fan-out, retries, failed generations, and support do not disappear inside a “cost per message” metric. Use p95 behavior and explicit abuse limits, not just an average friendly session.

An illustrative internal budget calculation:

`variable spend/hour = (net monthly revenue − target contribution − allocated monthly base costs) / monthly active hours`

For fictional values of $12 net revenue, $6 desired contribution, $2 allocated base costs, and 20 active hours, the available variable budget is $0.20/hour. These numbers are not proposed prices or a forecast; they show why the same subscription can be viable for one workload and not another. Long voice sessions or frequent novel actions might dominate that budget even when a semantic judge is cheap.

Measure conversation, novel mechanics, NPC background thought, memory, and voice separately. Give each a ceiling and define graceful degradation. Consider project-level hard spend limits before any public test; paid subscriptions are not permission for unbounded provider usage. See [hosting cost drivers](../02-research/hosting-and-scale.md) and [Jev worked examples](../02-research/jev-and-semantic-routing.md).

## Value beyond entertainment

These are possible uses to investigate through customer conversations. No buyer demand or real-world effectiveness is established.

| Candidate | Concrete product idea | Earliest meaningful test | Why the game alone does not prove value |
|---|---|---|---|
| Narrative creation | Writers stage characters, relationships and events, then inspect possible stories | A writer uses one private village to generate a useful scene outline | Believable outputs can still be repetitive, inconsistent or derivative |
| Communication rehearsal | Practice a disagreement, negotiation or difficult conversation with fictional roles | Instructor-defined scenarios with human scoring and debrief | Needs training validity and feedback quality; simulated agreement is not skill transfer |
| Classroom systems learning | Explore resource scarcity, cooperation and ecological feedback | Teacher uses a transparent small world with a known learning objective | LLM agents are not ground-truth economics or social science |
| Agent evaluation | Test memory, tool use, planning, cooperation and limited perception in a reproducible environment | Fixed seeded scenarios and outcome-based scoring | Benchmark leakage, nondeterministic judges and exploitable scoring require control |
| Game-development tools | Reuse the interaction registry, memory layer or authoring workflow in other games | External developer can integrate one useful module | A general SDK is a separate support, documentation and compatibility business |
| Community events | Hosts create participatory stories in persistent places | Small group pays or returns for a hosted event | Requires a compelling social experience and operational reliability |

Research on generative agents provides motivation for exploring believable social interaction, not validation that the simulator predicts actual populations. Avoid selling policy forecasting, clinical assessment, or hiring/personality screening based on game behavior. Such uses would need fundamentally different evidence and governance.

The closest adjacent opportunity may be a private-world creator product because it reuses the game itself. A broad simulation platform or educational procurement effort could pull engineering away from the initial experience. Pursue a second market only after a specific buyer problem and willingness to pay are observed.

## Advertising

Advertising is possible if a substantial audience exists, but it is a later hypothesis. Explicit signs, opt-in sponsored spaces, or clearly labeled events would be easier for players to understand than commercial intent hidden inside a trusted resident's dialogue.

NPCs may know sensitive fictional or real conversational context. Do not use loneliness, grief, fears, or private memories to secretly steer purchases. Keep sponsorship visible and separate from an NPC's personal affection. This is a proposed trust principle, not a claim about any particular advertising regulation.

Before adding ads, test whether they damage the sense of a coherent world. Subscription/private-world revenue could fit the product better, but that remains an empirical question. No revenue projection should assume advertising becomes material merely because the concept is novel.

## Feature ideas worth parking

- **World chronicles:** a creator or authorized local reporter summarizes witnessed events, with rumors labeled and private facts excluded.
- **Inherited keepsakes:** objects retain provenance and become meaningful through stories, repairs, and gifts.
- **Apprenticeship:** residents teach skills through shared work; engine capability and actor knowledge remain separate.
- **Community projects:** collectively build a bridge, garden, kitchen or observatory, with contributions and promises remembered.
- **Local customs:** repeated practices become named conventions, then optionally acquire explicit mechanics through the capability system.
- **Seasonal migrations:** weather and resources shift routines without prescribing a quest chain.
- **Resident correspondence:** phone messages arrive with schedules, availability and relationship context rather than incessant engagement prompts.
- **Creator scenario packs:** bounded outbreaks, unusual visitors, festivals, mysteries, dragons and changing environments.
- **Accessible pace settings:** private sectors can favor relaxed social play or more demanding survival.

Each idea should enter the roadmap only with a clear player benefit, a minimal experiment, and an owner. These are deliberately not implementation tasks yet.

# First playable — preparation and player-learning plan

| Status | Current progress | Last updated |
|---|---|---|
| In progress | The plan and required experience are documented; build readiness, participant operations, player sessions and findings remain open in the delivery tracker. | 2026-10-17 |

**Design origin:** DG03 / ND26, [useful demo and audience learning](../maintainers/needs-design.md#dg03--a-useful-demo-and-early-audience-learning). **Work owner:** [first-playable validation](../maintainers/first-playable-validation.md). **Scope:** operational preparation and learning, not another first-world specification or authorization to implement, publish, contact people, charge money or spend on providers.

## Use the existing specification

The [first-playable game target](../worlds/base/playable-openings.md#first-playable-game-target) defines the actual scenario: survival from an empty-handed start, resources and known crafting, a defensible camp/home, differentiated relationships, useful cooperation, invention and unscripted wildlife/human conflict. [Gameplay priorities](../repertoires/gameplay-priorities.md) owns priority and complete-game acceptance. Existing material, building, character, social and conflict documents define their mechanics.

This plan specifies **which build and part of that experience a test exercises**, the evidence to collect and the decision afterward. It does not replace full acceptance with whatever happens to be easiest to show. Reuse the Main world initializer and integrated content. The supplied pre-equipped Main world and isolated Solo testing ground can support explicitly limited checks; neither automatically meets the required survival-first whole experience.

## Working objective

Find out whether intended browser survival-adventure/sandbox players can start, understand the world, make useful choices, create a place they value, develop preferences among the characters, and want another activity or session. Test the distinctive promise alongside familiar survival/building, not after completing a generic survival game.

Creative direction is not allocated by a participant vote. Observe failures and attraction, investigate their causes and choose coherent improvements. A short useful test can happen before the complete experience is ready; identify the missing requirements and leave full first-playable acceptance open.

## Step 1 — establish the real delivery baseline

Resolve the actual implementation branch/commit and integration status under the repository's workflow. The research branch is a documentation base, not proof of current local-main behavior. Use the [capability and owner map](../maintainers/first-playable-validation.md#required-capability-and-owner-map) to reuse relevant existing verification, check changed assumptions and identify missing design versus implementation versus human evidence.

For each requirement record: source section, intended behavior, implementation owner/task, exact available revision, relevant prior evidence and the remaining gap. Keep code fixes in the existing subsystem tracker. Do not reopen completed mechanic design only because a combined player session remains untested; do not mark a target implemented from a paragraph describing it.

**Output:** one pinned build/readiness record and a bounded next test. No external participant test should depend on another unfinished task arriving mid-session.

## Step 2 — settle the session envelope

Before participant recruitment or paid execution, record the actual responsible operator, invitation permission, participant criteria, planned build access, device/browser expectations, approved provider/hosting cost ceiling, available support time, observation period, and how testing ends. The current direction is adult players and browser delivery; do not reopen the selected platform/audience decisions as unknown or convert this into a console/Steam project.

Choose supervised access or a properly qualified invitation environment. Supervised gameplay learning does not certify unattended external hosting. Use PD01/PD03/PD07/PD08 and enabled-feature requirements for the actual route, without requiring the entire future fleet. Real participants must not receive development-only continuity promises: any required change to [development compatibility](../../AGENTS.md#development-save-policy) needs Mike's explicit decision before making it. Otherwise use an honestly disposable test with clear handling of progress.

Collect only necessary observations and optional consented recording. Use participant codes; keep contact details and raw private conversations/recordings out of Git. Explain AI involvement, costs borne by the operator, known faults, feedback use and the ability to stop. Nobody is pressured to keep playing, defend the product publicly or provide a favorable review. This is ordinary product testing, not the optional well-being research program.

**Output:** a filled session brief. Actual budget, contact permission and schedule are not invented by this document.

## Step 3 — qualify what will be offered

Exercise the same configuration people receive. Confirm entry and ordinary controls, accessible food/materials, the bare-hand crafting path, actual building permissions, dangerous situations, and save/return or explicitly disposable-session handling. Preserve current security, provider accounting and recovery requirements. Remove recording-only changes; do not replace live character decisions with fixture choices and call the result autonomous.

Use separate, clearly labeled technical scenarios for failures that would be inappropriate to impose on a newcomer: broken access, spending exhaustion, interrupted building, blocked camp entrances, stale trades, a departed helper, and independent travel not finding a route. These are not proof of enjoyment. Test builds may omit unready content only when the resulting public claim and session question are narrowed accordingly.

**Output:** a go/rework decision for the named session, not a blanket production release pass.

## Step 4 — observe distinct player journeys

These are observation opportunities, not a mandatory tutorial script or fixed quest sequence. The player chooses their approach. Known methods, invention, cooperation, solitude, combat and escape remain valid where supported. A proposed first batch of **6–10 participants** is a manageable diagnostic group, not a market-size estimate; a **15–30 minute initial observation** can assess entry but cannot stand in for building a camp, night travel and later consequences. Schedule optional longer/return sessions appropriate to those questions.

| Journey | Observe | Evidence it cannot replace |
|---|---|---|
| First survival | What the player understands about hunger, resources and safe movement; whether they reach food and basic tools from the actual empty-handed start without rescue | Using a supplied tool kit is not this evidence |
| First camp | Site choice, material preparation, meaningful recipe alternatives, shelter/storage/cooking, walls and an usable entrance; whether the place is attractive and useful to return to | Spawning a finished shelter, constructing a decorative wall or finishing a fixture does not qualify player-made defense |
| People and cooperation | Which of the four/five characters players prefer and why; requests for ideas/help; sharing/trading; independently accepted or refused alliances and a real joint hunt | Different names/personality prose and forced NPC assistance are not differentiated relationships |
| Practical invention | An optional new supported method/object that solves a meaningful problem and can actually be produced and reused | Naming an invented object, learning a known recipe or a required secret answer is not live useful invention |
| Danger outside and at home | Perceived signs, choices in darkness, animal pursuit/group danger, defensive geometry, retreat and help; discovery of distant opponents | Existing stag contact alone does not demonstrate wolves/pack behavior or roaming humans |
| Independent camp contact | Actual opponent resource/hunt/exploration purpose, knowledge, movement, camp discovery and the player's chosen response | A timer, teleport, administrator command or omniscient target assignment cannot establish unscripted arrival |
| Continuing consequence | Returning to the same camp, stock and altered conditions; useful rewards, relationships and another chosen approach/activity | Persistence alone does not establish an interesting second session |

Do not demand that every participant witness every branch. Use consenting repeat participants and separate scenario-qualified sessions to cover an uncommon outcome while retaining its setup. If a camp visit does not happen during a session, record that honestly; never secretly force it. Verify the system's reachable autonomous-contact behavior separately from how frequently ordinary play exposes it. If resources, routes or participant choices prevent contact, that can be a legitimate consequence rather than a defect.

## Step 5 — separate the questions being answered

| Evidence layer | Useful observations | Common false conclusion |
|---|---|---|
| Understanding and usability | Expected activity, unassisted actions, confusion, reading/setup burden, help required | A usable interface proves the game is desirable |
| Enjoyment and repeated value | Meaningful choice/payoff, voluntary return, another approach, preferred character/camp use and reasons for stopping | Long sessions, courtesy or mandatory repetition prove enjoyment |
| Broader demand | Qualified actions after truthful material reaches additional relevant sources | Views, free signups and one friendly group prove a market |
| Offer preference and payment | Response to realistic terms; later authorized actual purchases or eligible renewals | Interview intent or supporter donations prove a sustainable subscription |
| Delivery quality and cost | Waits affecting play, useful versus failed AI results, hardware problems, costs and support in the same experience | Cheap provider calls or a fast prepared clip prove adequate service |

Before seeing results, write the observation that would justify the next commitment. Keep numerators, denominators, selection method, build and timing. Proposed batch sizes are not pass thresholds. Friends and experienced players can be informative, but their evidence must not be passed off as independent newcomer demand.

## Step 6 — recruit and communicate in parallel

Use existing [positioning](../../archive/06-marketing/positioning-and-copy.md) and [channel experiments](../../archive/06-marketing/ideas-channels-and-experiments.md). Prepare a truthful short gameplay example, a few representative images, concise invitation, one genuine next action and opt-in contact route. A manually checked first group of roughly 10–20 relevant creators/community contacts is a proposed workload, not a required target. No new marketing site, analytics system, Discord bot or daily video schedule is needed to begin.

Separate player-facing survival/building/adventure from authoring and developer demonstrations. Do not advertise walls, packs, alliances or roaming conflict as available until the named build supports them. Prepare coordinated reveal/demo moments when ready; broaden relevant outreach when promising responses repeat. Public posting, outreach and advertising require their actual authorization and limits. Steam and crowdfunding are not immediate tasks under the browser-only direction.

## Step 7 — review, correct and retest

Write a short finding for each consequential observation: what happened, who/which build was involved, the most likely explanation and a competing explanation, effect on the experience, existing owner, next correction/test and commitment limit. Separate missing mechanics from poor explanation, unreliable execution and weak underlying value.

Route fixes to the actual owner. Use fresh people after substantial clarity changes where practical, and optional return sessions for continued interest. Keep good creative ideas through early roughness when a bounded experiment is warranted; do not use testing as an endless prerequisite to build. Conversely, do not increase geography, population or administrative systems to avoid fixing a weak camp or a tedious opening.

**Advance:** evidence supports the specific next production, audience or offer commitment and capacity exists. **Rework:** a named gap is materially limiting the experience. **Pause dependent exposure/spending:** the agreed limit is reached or safety, privacy, accounting or data-integrity problems make participation inappropriate. Honor any existing participant/customer obligations independently of expansion decisions.

## Workflow and records

Start from [the maintainer tracker](../maintainers/first-playable-validation.md), linked from the maintainer index and DG03/ND26. The tracker owns task status and dependencies; the world document owns scenario requirements; existing mechanic specifications and inventories own exact behavior/tuning. The [commercial decision brief](initial-commercial-offer-decision-brief.md) and CO01 investigate offers separately from these play sessions.

Create a focused `docs/verification/first-playable-experience.md` report when there are actual observations to record, and link it from the verification index. It must identify the real revision, environment, journey coverage, missing evidence, costs and limits. Do not create a passing report or close whole-game requirements simply because this plan exists. Raw recordings, private data and generated traces are not repository artifacts.

This project remains In progress until the authorized preparation, actual sessions, in-scope corrections and evidence review have occurred. Its documentation deliverable can be complete while the operational work remains open. Broader release, performance, commercial and subsystem acceptance retain their existing owners.

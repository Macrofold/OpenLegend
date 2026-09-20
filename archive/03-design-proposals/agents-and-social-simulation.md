# Agents, bodies, emotions, and memory

> Memory/cognition policy is owned by [Memory architecture](../../docs/memory-architecture.md): minimal English context, Jev attention, level-2 conversation and independent background reflection. Agents require eight game hours of daily rest; dreams become eligible after two hours asleep. The sections below follow that policy; [delivery tasks](../../docs/maintainers/cognition-redesign.md) remain open.

Status: **design proposal**, updated for accepted primitive survival direction. Requirements: F02–F10, F21–F24, F31, F35–F39. Research basis and its limitations: [human models](../02-research/human-models-and-memory.md), [comparable games](../02-research/games-and-emergence.md). The system is designed for believable play, not clinical realism or validated predictions of human behavior.

## One character model, two controllers

Human and NPC characters share identity, anatomy, needs, equipment, location, perception, relationships, knowledge, and lifecycle records. A controller supplies intents: a player uses input; an NPC uses utility rules and bounded reasoning. Creator controls use a separate administrative permission model.

For players, personality can shape optional expression, preferences, and descriptive feedback without seizing movement or writing speech on the player's behalf. Whether traits confer mechanical bonuses is an open design decision. An empty social meter should not force a player to speak, and a proposed personality label should not classify the real person.

The most useful initial observable behaviors are gathering accessible resources, eating when hungry, sleeping when tired, approaching a known acquaintance, keeping or breaking a promise, reacting to discomfort or danger, and remembering what happened. These use seeded mechanics and some initial procedural knowledge. NPCs can fail and die; the user does not require artificially forgiving needs. [Survival baseline](survival-baseline.md)

## Physical state

| System | First useful version | Expansion seam |
|---|---|---|
| Hunger/nutrition | One bounded fullness meter; food consumption; threshold consequences | Diet, nutrients, spoilage, preferences |
| Fatigue | Rest debt, energy, sleep schedule, interruption | Sleep quality, circadian rhythms, illness interaction |
| Comfort | Exposure, shelter, temperature bands | Clothing layers, wetness, weather, bedding |
| Body | Small graph: head, torso, left/right arm and leg | Hands, joints, organs, species-specific anatomy |
| Injury | Severity, location, cause, recovery progress, functional impairment | Bleeding, infection, scars, treatment, prosthetics |
| Disease | One authored condition with exposure and staged recovery | Transmission, immunity, multiple conditions |
| Aging | Stored birth time and life stage | Frailty curves, fertility, developmental stages |
| Death | Explicit state transition and recorded cause | Species rules, resurrection variants, inheritance |

Separate injury from health summary. A damaged leg affects locomotion; pain affects attention; a head injury has its own allowed consequences. A composite “health” bar is a UI projection, not the only stored state. Anatomy definitions specify adjacency, vital functions, capacity contributions, and species differences. Adding a liver later should not require changing every interaction signature.

Healing is an ongoing process affected by rest, nutrition, treatment, and condition; it should not require repeated LLM calls. Work, needs, healing, environmental changes and aging reference the accelerated [world clock](time-and-simulation-speed.md). Medical detail remains stylized. For the initial wilderness group, serious organ simulation and epidemiology would add more balancing work than visible benefit.

Needs use thresholds with hysteresis: begin seeking food below one value, stop after a higher value. This avoids switching every tick. Integrate drift by elapsed simulated time, and wake cognition when a meaningful band changes. Use priorities so starvation overrides casual conversation while a minor discomfort does not continuously interrupt it.

## Emotion as an evolving appraisal, not a fixed response table

Start with a small set of dimensions: pleasant/unpleasant affect, arousal, perceived safety, social connection, and frustration. Store sparse named appraisals such as gratitude toward Ada, fear of fire, grief tied to a loss, or anger about a broken promise. Named emotions refer to causes, targets, intensity, decay, and relevant memories.

A common event can produce different reactions. A gift may be comforting because it recalls a friend, awkward because the giver is distrusted, or irrelevant because the recipient is exhausted. Rules can resolve mundane effects; language models help interpret genuinely ambiguous social meaning. No need to generate prose for every small mood shift.

Use compositional display rules: show a few strongest current experiences and a summary rather than 100 bars. Distinguish bodily comfort, mood, and relationship trust; averaging all of them into “happiness” hides meaningful differences. Future dimensions register their effect on attention, action utility, expression, and UI grouping. Add one only when it changes observable play.

Record amplification caps and stacking keys. Seeing the same fire twenty times should not apply twenty independent panic spikes. A persisting condition can sustain fear without duplicating the original appraisal. Allow recovery, habituation, and deliberate coping activities to create interesting behavior.

## Personality and experience

The September 20 first-playable UI now assigns three distinct descriptive traits from a configurable [JSON bank](../../packages/domain/config/traits.json) using saved randomness. Their names/descriptions persist and appear in character inspection; legacy actors receive traits once. These starting dispositions have no numerical bonuses or new automatic cognition policy. The dimensional mappings, trait evolution and provenance model below remain a richer future design; see [current architecture](../../docs/architecture.md#react-presentation-and-character-traits).

Use a small trait vector inspired by mainstream dimensional personality models, as reviewed in the research document. Traits modify preferences and sensitivities: sociability affects approaching strangers; conscientiousness can affect promise salience; emotional volatility affects response/recovery; openness affects exploration. These are designed mappings, not scientific formulas.

Store traits with provenance, confidence or authored certainty, and permitted rates of change. Experiences can gradually shift tendencies; one insult should not rewrite a personality. Distinguish stable tendencies, temporary states, learned skills, values, habits, and conditions. “Calm under pressure,” “high woodworking skill,” and “alcohol dependence” should not be interchangeable tags.

Avoid real-world IQ numbers as an all-purpose intelligence meter. More useful game capabilities are planning horizon, learning rate in a specific skill, error tolerance, and knowledge. If the creator wants an unusually brilliant character, give it concrete strengths and weaknesses rather than assuming an IQ label makes model reasoning better.

At birth/creation, combine seeded variation, authored background, and later experience. Heredity and developmental personality systems can wait. Human players may choose a lightweight background and change it within product rules; the system should not infer sensitive traits from their chat.

## Memory storage and forgetting

The canonical [memory architecture](../../docs/memory-architecture.md) defines awareness, English recall, authored inner world, quotas and publication. The [production data model](../07-technical-architecture/production-data-model.md) specifies repository projections. The [Macrofold comparison](../02-research/macrofold-workspaces.md) retains research and cost scenarios; current integration evidence belongs in [implementation status](../05-project/implementation-status.md).

Use distinct records:

| Store | Content | Retention approach |
|---|---|---|
| Working context | Current activity, recent turns, immediate observations | Short and replaceable |
| Episodic memory | Who, what, where, when, observed/heard/inferred, affect, evidence | Salience-weighted finite budget |
| Subjective beliefs | Authored inner-world prose with meaningful uncertainty and attribution | Reflection updates accepted text; never silently convert rumor to fact |
| Relationship assessment | Directional authored perspective; supported native facets and obligations stay separate | Accepted inner-world text; derived query projections do not own another prose copy |
| Procedural knowledge | Known recipes, skills, routes, habits | Versioned references rather than copied scripts |
| Protected commitments | Active promise, debt, appointment, caregiving obligation | Keep until resolved; bounded creation |

The authoritative world journal is separate. NPC forgetting does not delete item ownership, a birth record, or a committed trade. Conversely, an NPC cannot retrieve the journal to recover events it never perceived.

Raw recall spans the last six game hours; hourly small-model consolidation processes older raw personal memories and actor-aware shared events. Select useful summaries alongside recent experiences without duplicating events. Finite count/byte/backlog limits still need tuning. The initial authored ceiling is ten files of 500 words each plus a byte bound; CR01 must resolve its tension with full About me inclusion and compact greeting targets. Counts alone cannot bound a novel-sized record or population-wide storage.

Score retention using salience, recency, repetition, relevance to commitments, and distinctiveness. Avoid always retaining negative events just because they are emotionally intense. Maintain key positive experiences and mundane routines as well. Expire stale location beliefs; preserve their uncertainty rather than pretending an old observation is live.

Retrieval combines current intent, relevant people/places, recency, and semantic matching. Include the complete accepted About me text and Jev-selected high-value recall within route budgets. Summaries retain references to source memories while they exist, note uncertain interpretations, and avoid inventing connective details.

Recall selection follows the [canonical signal and delivery contract](../../docs/memory-architecture.md#selection-signals-and-delivery-order): present people, recent events, goals, unresolved concerns and conflicting beliefs drive structured lookups first, followed by arbitrary-intent semantic retrieval. Selective-recall tools follow demonstrated initial-context gaps. Evaluate whether remembered evidence changes later behavior where relevant, not only whether it appears in context.

## Sleep, dreaming, and consolidation

The dream mechanic now lives in the canonical [memory architecture](../../docs/memory-architecture.md#9-sleep-dreams-forgetting-and-consolidation). It requires eight hours of daily rest and at least two continuous hours asleep before optional dream reflection. Hourly small-model consolidation is independent of sleep; full-harness background reflection updates files and publishes accepted text. Imagined dream attribution, protected commitments, concurrent observations and native retention remain distinct. Use its implementation checklist for delivery status.

## Perception, beliefs, and attention

The [perception and attention specification](../07-technical-architecture/perception-and-attention.md) now owns the detailed proposal: shared near/medium/far object descriptions with supported state overlays, event-based attenuated sound, actor-specific evidence, arbitrary-intent semantic interests, mandatory person-encounter opportunities and batched Jev routing. It distinguishes the current 28-unit sight and separate 10-unit hearing audience from future sensory fidelity. New exposure need not buy a thought; mundane objects become decision-relevant when a goal or significant change makes them matter. Persistent critical-need reminders follow simulation time under real-time inference caps.

Initially use distance, facing if useful, and grid line-of-sight for vision; a radius/intensity model for hearing; adjacency for touch. Later, walls, doors, weather, light, species senses, and masking noise can alter these queries. Perception emits observations with confidence and source, not omniscient facts.

A heard gunshot might produce “sharp bang eastward” rather than the shooter's identity. A whispered conversation may be detected but not intelligible. Hearing a statement records that it was said; accepting it as true is a separate belief update.

Attention filters observations by urgency, novelty, relationship, goals, and current workload. Otherwise a crowded square floods every resident with all speech and movement. Keep an observation queue cap and coalesce repeated stimuli. Model calls use observations, not raw event streams.

## Learning through ordinary interaction

M07/M08 accept observation, direct experience, hearing information, teaching, and other interactions as learning sources. No formal research minigame is required. The character gains the evidence, belief, visible procedure, or practiced familiarity justified by the interaction; watching a method does not reveal hidden steps, and hearing a claim does not establish objective truth. Repeated practice can strengthen supported knowledge without overgeneralizing one outcome.

Use the existing perception/attention/memory pipeline rather than a model call for every state update. Actual rain changes exposed objects independently of observers; witnessing it changes what a resident knows. Engine-authored definitions and [anticipated future influences](state-systems-and-future-influences.md) are not automatically accessible NPC knowledge. The [discovery specification](world-creation-and-discovery.md#interaction-is-how-knowledge-develops) gives examples; exact skill/confidence updates remain open.

## Decision pipeline

1. A need threshold, addressed speech, interrupted plan, hazard, new opportunity, or scheduled review creates a decision event.
2. Local logic decides whether the current plan remains adequate. Known urgent responses need no semantic gate.
3. Score eligible actions using needs, values, relationships, effort, risk, and commitments. Commit to short plans with interruption rules.
4. Native code continues familiar actions; Jev evaluates attention and escalation for each admitted semantic opportunity in bounded batches.
5. Speech defaults to level 2; Jev can select complex low/high reasoning (levels 3/4) and independently enqueue background level-5 reflection.
6. Return only speech or the offered action handle required by that immediate route. Commit through native admission. Reflection separately edits bounded files and publishes accepted text with short god-only thoughts.

The scheduler creates meaningful opportunities without polling every tick. Jev routing does not recursively route itself or require a call per object. Unknown/unavailable outcomes defer semantic work while native survival continues. Do not fan out expensive planners speculatively or require mind patches to speak.

Thoughts stored for characterization should be brief in-world reflections, intentions, and appraisals—not raw hidden model reasoning. Players see expression and speech, not private thought traces. Creator debugging can show structured causes and decisions without relying on verbose internal prose.

## Social continuity

Relationships are directional: Ada can trust Bo more than Bo trusts Ada. Track familiarity, trust, affection, fear, and outstanding obligations sparsely for meaningful relationships, not as a dense all-to-all matrix. Store group membership separately from personal liking.

Conversation has turn-taking, speaker identity, audience, interruption, and topic continuity. NPCs should sometimes decline, continue work while talking, ask clarifying questions, or refer back to unfinished plans. A conversation can create a promise intent; promising and completing a task are different events.

Start with one-on-one text, then nearby group text, then voice. Scale social believability before adding voice cost. Keep text captions for accessibility and as a fall-back during media failure. Prevent paid interaction quotas from making an NPC abandon already-accepted world obligations unpredictably.

## Later tool-assisted planning and interaction

For a difficult goal, a bounded harness can inspect permitted memories, known methods and current affordances before choosing a next action. A leaking shelter is a useful example: diagnose from observations, consider known materials, propose an improvement, then reconsider after actual construction and rain. Native simulation executes the work; separate fresh jobs use saved goals and evidence to continue the learning cycle. Ordinary survival does not wait for this route, and engine authoring/validation does not become character knowledge.

Teaching and coordination can benefit when an agent needs to investigate a question, compare accounts or check commitments before replying. Conversation across people remains separate from internal tool turns: the harness cannot fabricate another actor's response, cooperation or mastery. Speech stays lightweight unless a concrete information gap warrants investigation; observed practice and attributed testimony determine learning.

## Wilderness seed cast and evaluation

After the one-NPC first playable, proposed group cast: 6–12 people with distinct but modest differences, useful possessions, some survival knowledge, at least one social tie and practical skill, and unmet needs. Examples include a sociable forager, someone skilled at bindings, and someone who knows shelter or simple care. They are not blank minds, and no established village is supplied. Avoid elaborate lore that exists only in prompts and never affects actions.

Evaluate through observable episodes: a resident finds food without instruction; two residents contend over a scarce item without duplication; a promised meal is remembered tomorrow; a false rumor remains attributed; a frightened resident chooses shelter; forgetting frees memory while preserving an active obligation; provider outage leaves basic survival intact. Compare deterministic-only, minimal-memory, and richer-memory variants in playtests so complexity earns its cost.

## Later harness delivery tasks

The [cognition extension checklist](../../docs/maintainers/cognition-redesign.md#later-harness-extensions) owns **CH01** (difficult planning/investigation), **CH02** (tool-assisted teaching and coordination) and **CH03** (behavioral/cost comparison). They follow core cognition acceptance and usable scoped tools. [INV-7.6](../07-technical-architecture/declarations-and-evolution.md#inv-7--discover-missing-mechanics-during-play-without-endless-generation) owns the bridge to missing-capability authoring; do not create a second invention or reflection queue here.

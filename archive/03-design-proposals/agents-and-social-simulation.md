# Agents, bodies, emotions, and memory

> Memory/cognition policy is now owned by [Memory architecture](../../docs/memory-architecture.md), including the 300-entry recent-recall target, highest-required-tier routing and god-only profile Thoughts view. Earlier illustrative limits and display suggestions below are historical where they conflict.

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

Use a small trait vector inspired by mainstream dimensional personality models, as reviewed in the research document. Traits modify preferences and sensitivities: sociability affects approaching strangers; conscientiousness can affect promise salience; emotional volatility affects response/recovery; openness affects exploration. These are designed mappings, not scientific formulas.

Store traits with provenance, confidence or authored certainty, and permitted rates of change. Experiences can gradually shift tendencies; one insult should not rewrite a personality. Distinguish stable tendencies, temporary states, learned skills, values, habits, and conditions. “Calm under pressure,” “high woodworking skill,” and “alcohol dependence” should not be interchangeable tags.

Avoid real-world IQ numbers as an all-purpose intelligence meter. More useful game capabilities are planning horizon, learning rate in a specific skill, error tolerance, and knowledge. If the creator wants an unusually brilliant character, give it concrete strengths and weaknesses rather than assuming an IQ label makes model reasoning better.

At birth/creation, combine seeded variation, authored background, and later experience. Heredity and developmental personality systems can wait. Human players may choose a lightweight background and change it within product rules; the system should not infer sensitive traits from their chat.

## Memory storage and forgetting

Concrete proposed collections, indexes, ingestion, provenance, recall tools and consolidation races are developed in [memory storage and retrieval](memory-storage-and-retrieval.md). The [Macrofold comparison](../02-research/macrofold-workspaces.md) recommends shared structured memory with selective full-workspace execution; that integration is not agreed or implemented.

Use distinct records:

| Store | Content | Retention approach |
|---|---|---|
| Working context | Current activity, recent turns, immediate observations | Short and replaceable |
| Episodic memory | Who, what, where, when, observed/heard/inferred, affect, evidence | Salience-weighted finite budget |
| Semantic belief | Learned proposition with confidence, source, contradictions | Consolidate and update; never silently convert rumor to fact |
| Relationship summary | Directional familiarity, trust, affection, obligations | Compact, evidence-linked, slowly updated |
| Procedural knowledge | Known recipes, skills, routes, habits | Versioned references rather than copied scripts |
| Protected commitments | Active promise, debt, appointment, caregiving obligation | Keep until resolved; bounded creation |

The authoritative world journal is separate. NPC forgetting does not delete item ownership, a birth record, or a committed trade. Conversely, an NPC cannot retrieve the journal to recover events it never perceived.

Illustrative budget per resident: 20–40 recent observations, 100–300 episodic summaries, a small set of beliefs, and compact relationship/skill records. Choose actual byte/token limits after retrieval-quality testing; counts alone do not bound storage if one entry can contain a novel. Enforce per-record and total size. A population of thousands makes unbounded transcripts expensive even before inference.

Score retention using salience, recency, repetition, relevance to commitments, and distinctiveness. Avoid always retaining negative events just because they are emotionally intense. Maintain key positive experiences and mundane routines as well. Expire stale location beliefs; preserve their uncertainty rather than pretending an old observation is live.

Retrieval combines current intent, relevant people/places, recency, and semantic matching. Supply only a few high-value memories to a thought. Summaries retain references to source memories while they exist, note uncertain interpretations, and avoid inventing connective details.

## Sleep, dreaming, and consolidation

The dream mechanic now lives in the canonical [memory architecture](../../docs/memory-architecture.md#9-sleep-dreams-forgetting-and-consolidation). It defines budgeted sleep consolidation, full-harness subjective updates, imagined dream provenance, protected commitments, concurrent-observation preservation and native retention fallback. Use its implementation checklist for delivery status.

## Perception, beliefs, and attention

The [perception and attention specification](../07-technical-architecture/perception-and-attention.md) now owns the detailed proposal: shared near/medium/far object descriptions with supported state overlays, event-based attenuated sound, actor-specific evidence, arbitrary-intent semantic interests, mandatory person-encounter opportunities and batched Jev routing. It distinguishes the current 10-unit sight/event audience from future sensory fidelity. New exposure need not buy a thought; mundane objects become decision-relevant when a goal or significant change makes them matter. Persistent critical-need reminders follow simulation time under real-time inference caps.

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
4. If the situation is familiar, select an existing action or skill. If ambiguous, optionally use a bounded semantic judge. If novel or socially important, admit a deliberative job.
5. A bounded harness can inspect authorized observations, retrieve memories, inspect known recipes, or simulate candidate consequences. It has strict tool-call/token/deadline limits and no direct mutation tools.
6. Return the next intent and a short state summary; execute through the same interaction resolver as players. Record only useful resulting memories.

“Should I think?” need not itself be a model call. A deterministic scheduler handles most such decisions. An optional semantic fan-out can estimate novelty, social relevance, and desired effort from one context when all answers are independent. Do not fan out multiple expensive full planners speculatively without evidence that saved latency justifies the cost.

Thoughts stored for characterization should be brief in-world reflections, intentions, and appraisals—not raw hidden model reasoning. Players see expression and speech, not private thought traces. Creator debugging can show structured causes and decisions without relying on verbose internal prose.

## Social continuity

Relationships are directional: Ada can trust Bo more than Bo trusts Ada. Track familiarity, trust, affection, fear, and outstanding obligations sparsely for meaningful relationships, not as a dense all-to-all matrix. Store group membership separately from personal liking.

Conversation has turn-taking, speaker identity, audience, interruption, and topic continuity. NPCs should sometimes decline, continue work while talking, ask clarifying questions, or refer back to unfinished plans. A conversation can create a promise intent; promising and completing a task are different events.

Start with one-on-one text, then nearby group text, then voice. Scale social believability before adding voice cost. Keep text captions for accessibility and as a fall-back during media failure. Prevent paid interaction quotas from making an NPC abandon already-accepted world obligations unpredictably.

## Wilderness seed cast and evaluation

Proposed initial cast: 6–12 people with distinct but modest differences, useful possessions, some survival knowledge, at least one social tie and practical skill, and unmet needs. Examples include a sociable forager, someone skilled at bindings, and someone who knows shelter or simple care. They are not blank minds, and no established village is supplied. Avoid elaborate lore that exists only in prompts and never affects actions.

Evaluate through observable episodes: a resident finds food without instruction; two residents contend over a scarce item without duplication; a promised meal is remembered tomorrow; a false rumor remains attributed; a frightened resident chooses shelter; forgetting frees memory while preserving an active obligation; provider outage leaves basic survival intact. Compare deterministic-only, minimal-memory, and richer-memory variants in playtests so complexity earns its cost.

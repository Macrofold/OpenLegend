# Agents, bodies, emotions, and memory

> Memory/cognition policy is owned by [Memory architecture](../../docs/memory-architecture.md): minimal English context, Jev attention, level-2 conversation and independent background reflection. Agents require eight game hours of daily rest; dreams become eligible after two hours asleep. The sections below follow that policy; [delivery tasks](../../docs/maintainers/cognition-redesign.md) remain open.

Status: **design proposal**, updated for accepted primitive survival direction. Requirements: F02–F10, F21–F24, F31, F35–F39. Research basis and its limitations: [human models](../02-research/human-models-and-memory.md), [comparable games](../02-research/games-and-emergence.md). The system is designed for believable play, not clinical realism or validated predictions of human behavior.

## One character model, two controllers

Human and NPC characters share identity, anatomy, needs, equipment, location, perception, relationships, knowledge, and lifecycle records. A controller supplies intents: a player uses input; an NPC uses utility rules and bounded reasoning. Creator controls use a separate administrative permission model.

The broader term **actor** includes every living being, not only human characters. Species and body plan are capabilities/data on an actor rather than a boundary around which beings may receive actions or effects. Animals can use lightweight native behavior by default while a particular animal later gains memory, a richer inner world, intelligence or speech. An intelligent talking deer remains a deer and does not need a parallel character system.

Lifecycle and bodily effects should therefore use relevant capabilities. Revive targets any dead actor, including an animal; wetness, fire, injury and healing can affect any compatible living body and its health, with species-specific susceptibility where needed. The [canonical architecture](../../docs/architecture.md#actor-means-any-living-being) records the implemented schema and remaining lifecycle boundary.

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

## Cognition, memory and perception boundaries

[Memory architecture](../../docs/memory-architecture.md) owns awareness, recall, beliefs, consolidation, reflection, sleep and dreams. [Perception and sensory evidence](../07-technical-architecture/perception-and-attention.md) owns visual/acoustic exposure and sensory event generation. This document uses those systems but does not redefine their routes, quotas, retention or implementation tasks.

## Learning through ordinary interaction

M07/M08 accept observation, direct experience, hearing information, teaching, and other interactions as learning sources. No formal research minigame is required. The character gains the evidence, belief, visible procedure, or practiced familiarity justified by the interaction; watching a method does not reveal hidden steps, and hearing a claim does not establish objective truth. Repeated practice can strengthen supported knowledge without overgeneralizing one outcome.

Use the existing perception/attention/memory pipeline rather than a model call for every state update. Actual rain changes exposed objects independently of observers; witnessing it changes what a resident knows. Engine-authored definitions and [anticipated future influences](state-systems-and-future-influences.md) are not automatically accessible NPC knowledge. The [discovery specification](world-creation-and-discovery.md#interaction-is-how-knowledge-develops) gives examples; exact skill/confidence updates remain open.

## Decision and conversation boundaries

Actor decisions use the cognition contracts in [Memory architecture](../../docs/memory-architecture.md). Talk/act/think response composition, durable conversation identity, membership, merging, narration and transcript rules belong to [Narration, agent responses and conversations](../../docs/narration-and-conversations.md). Social design here defines relationships and obligations, not those execution pipelines.

## Social continuity

Accepted character design, September 20, 2026 (future implementation): relationships have two forms.

- **Structured relationships** record defined, unchanging facts such as blood relations. A change in someone's feelings does not change their kinship.
- **Unstructured relationships** map another person to free text, such as “friend,” “good friend,” or “lover.” Each person owns their own description and may change it freely at any point according to how they perceive the other person. These assessments come from memories, with no relationship points, score thresholds or required progression. They are directional: Ada's description of Bo need not match Bo's description of Ada.

Subjective descriptions belong to the accepted inner world; any query projection derives from that revision. The freedom to revise one's assessment is not restricted to god mode. It does not rewrite the other person's assessment or objective relationship facts. Keep group membership and outstanding obligations separate from personal liking; changing a description does not erase a promise. Exact editing and publication mechanics remain to be designed.

Conversation lifecycle and merge semantics are defined only in [Narration, agent responses and conversations](../../docs/narration-and-conversations.md).

## Player-designed stats

Accepted direction, September 20, 2026; detailed design and implementation remain future work. Players may invent stats and their effects **only in god mode**. For example, if someone wants to attempt seduction and no charisma stat exists, an authorized player in god mode can design charisma. An ordinary character's action request does not itself authorize creating a stat.

Stats and their effects must live in declarative configurations, not hard-coded stat names or special cases in gameplay or UI. A definition must specify all parameters governing what the stat can affect, when stat checks run, how checks resolve and what their outcomes can change. Exact schemas, value ranges, defaults, modifiers and balancing are deferred. Existing native prototype needs are not evidence that this configurable stat system is implemented.

Use the shared declaration/admission boundary: trusted generic code validates and executes supported configuration rules, while the server verifies god-mode authority. Freeform design is authoring freedom, not permission to execute generated code or give unknown fields automatic effects. Unsupported effect/check capabilities require explicit engine support. Relationship descriptions remain memory-based prose and must not become stat-derived scores or forced labels.

## Later tool-assisted planning and interaction

For a difficult goal, a bounded harness can inspect permitted memories, known methods and current affordances before choosing a next action. A leaking shelter is a useful example: diagnose from observations, consider known materials, propose an improvement, then reconsider after actual construction and rain. Native simulation executes the work; separate fresh jobs use saved goals and evidence to continue the learning cycle. Ordinary survival does not wait for this route, and engine authoring/validation does not become character knowledge.

Teaching and coordination can benefit when an agent needs to investigate a question, compare accounts or check commitments before replying. Conversation across people remains separate from internal tool turns: the harness cannot fabricate another actor's response, cooperation or mastery. Speech stays lightweight unless a concrete information gap warrants investigation; observed practice and attributed testimony determine learning.

## Wilderness seed cast and evaluation

After the one-NPC first playable, proposed group cast: 6–12 people with distinct but modest differences, useful possessions, some survival knowledge, at least one social tie and practical skill, and unmet needs. Examples include a sociable forager, someone skilled at bindings, and someone who knows shelter or simple care. They are not blank minds, and no established village is supplied. Avoid elaborate lore that exists only in prompts and never affects actions.

Evaluate through observable episodes: a resident finds food without instruction; two residents contend over a scarce item without duplication; a promised meal is remembered tomorrow; a false rumor remains attributed; a frightened resident chooses shelter; forgetting frees memory while preserving an active obligation; provider outage leaves basic survival intact. Compare deterministic-only, minimal-memory, and richer-memory variants in playtests so complexity earns its cost.

## Later harness delivery tasks

The [cognition extension checklist](../../docs/maintainers/cognition-redesign.md#later-harness-extensions) owns **CH01** (difficult planning/investigation), **CH02** (tool-assisted teaching and coordination) and **CH03** (behavioral/cost comparison). They follow core cognition acceptance and usable scoped tools. [INV-7.6](../../docs/maintainers/inventions-and-world-evolution.md#inv-7--discover-missing-mechanics-during-play-without-endless-generation) owns the bridge to missing-capability authoring; do not create a second invention or reflection queue here.

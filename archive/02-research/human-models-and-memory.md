# Human models, perception, and durable memory

Status: research-backed vocabulary plus proposed game abstractions. These recommendations are open for decision. Sources checked September 18, 2026 (America/New_York), corresponding to September 19 UTC for this session. Nothing here claims that simulated characters possess human emotions or that their behavior predicts real people.

## 1. What the Generative Agents research establishes

Park and colleagues demonstrated a town of 25 agents using a memory stream, retrieval weighted by relevance, recency, and importance, reflections, and hierarchical plans. Agents retained observations of their surroundings and coordinated socially; a seeded party intention spread through conversations. The evaluation concerned believable behavior, not consciousness or general psychological validity. Failures included missing relevant memories, embellishment, and overly formal behavior. The reported experiment required multiple wall-clock days and thousands of dollars in token credits for two simulated days. Those are historical experimental costs, not current model prices or an Open Legend forecast. [Generative Agents paper, 2023, especially §§4, 7–8](https://arxiv.org/html/2304.03442v2)

The authors publish the associated implementation, making memory and planning components inspectable. It is a research reference, not evidence of production readiness, secure multiplayer authority, or a live service's operating cost. [Authors' repository](https://github.com/joonspk-research/generative_agents)

**Proposal:** adopt the separation of observation, memory, interpretation, planning, and execution. Replace indiscriminate deliberation with explicit triggers and budgets. Evaluate continuity over weeks of play rather than assuming a convincing conversation proves durable identity.

## 2. Keep state categories separate

| Layer | Proposed meaning | Example | Typical update trigger |
|---|---|---|---|
| Body | Authoritative physical condition | Injured left hand; fatigue | Simulation time, injury, treatment |
| Needs | Pressures directing activity | Food, rest, comfort, connection | Time and completed activities |
| Affect | Temporary state | Pleasantness, activation | Perceived event and decay |
| Appraisal | Meaning assigned to an event | “That sounded threatening” | Observation or new evidence |
| Personality | Slow behavioral tendencies | Sociability, diligence | Creation; occasional experience review |
| Values/preferences | Desired outcomes and tastes | Keeps promises; dislikes smoke | Learning or deliberate development |
| Knowledge/memory | What this actor knows or recalls | An invitation; a remembered injury | Perception, dialogue, consolidation |
| Relationships | Actor-specific social assessment | Trust in a particular neighbor | Shared incidents and communication |
| Intentions | Future commitments | Meet Jo at sunset | Decision, renegotiation, cancellation |

This is a proposed game schema. “Calm under pressure,” a specific learned skill, a fictional intelligence score, and alcohol dependence should not occupy one undifferentiated trait list. A dependence mechanic, if later desired, belongs in a separately designed condition system. “IQ = 200” does not make a language model capable of reasoning beyond its actual abilities; use game-specific learning or planning attributes with visible consequences instead.

## 3. Personality: dimensional and expandable

The Big Five Inventory–2 organizes personality into five broad domains and fifteen narrower facets. Soto and John's research distinguishes broad-domain measurement from finer assessment; their short-form work explicitly discusses the tradeoff between brevity and reliability. This supports a hierarchical vocabulary, not a claim that assigning five numbers creates a validated artificial person. [Soto and John, BFI-2 study](https://escholarship.org/uc/item/16x6n05t), [Soto and John, short-form study](https://www.sciencedirect.com/science/article/pii/S0092656616301325)

**Proposed first model:** five slow dimensions, stored with a schema version. Treat them as tendencies in action selection and dialogue style, not absolute restrictions.

| Domain | Illustrative game influence, requiring tuning |
|---|---|
| Extraversion | Likelihood of initiating optional social contact |
| Agreeableness | Weight assigned to preserving cooperation |
| Conscientiousness | Persistence with a plan or commitment |
| Negative emotionality | Sensitivity to perceived uncertainty or threat |
| Open-mindedness | Willingness to consider unfamiliar activities |

These mappings are design choices, not empirical conversion formulas. A quiet person can be brave; a disagreeable character can honor a promise; a conscientious character can abandon work to help someone. Situation, values, relationships, and needs must have independent influence.

Later facets can refine broad dimensions without changing the public actor interface. Keep optional facet data sparse until a feature actually uses it. Personality prose should summarize stored tendencies, while the numeric state remains controlled by the simulation. Prompt-generated character descriptions must not silently rewrite traits.

Longitudinal research finds both stability and change, with patterns varying across facets, ages, samples, and measurement choices. An 11-year study of 1,667 adults explicitly examined this at the facet level; a coordinated analysis across sixteen samples also found heterogeneous trajectories. Neither licenses a universal “one betrayal reduces agreeableness by ten” rule. [Brandt et al., 2023](https://pubmed.ncbi.nlm.nih.gov/36325745/), [Graham et al., 2020](https://pubmed.ncbi.nlm.nih.gov/33564207/)

**Proposal:** birth establishes an initial profile; long-term experiences can propose small, bounded changes during periodic reviews. Record the experiences and old/new values. Avoid compulsory personality changes for player characters: the brief asks for shared attributes, but whether they constrain player choices remains an open design decision. Adult trait instruments also do not automatically define infant development or heredity.

## 4. Emotions: few variables, rich causes

Russell's circumplex work models affect through pleasure/displeasure and activation-related dimensions. It offers a compact descriptive space, not a complete causal account of emotion. [Russell, 1980](https://pdodds.w3.uvm.edu/research/papers/others/1980/russell1980a.pdf) Scherer's component-process account emphasizes appraisal of significant events and coordinated changes across response components. [Scherer, 2009](https://doi.org/10.1080/02699930902928969)

Modern research does not establish one final catalogue of independent emotional meters. Cowen and Keltner identified 27 varieties of reported emotional experience in responses to videos, connected by gradients; that result is tied to its task and measures. Barrett's constructed-emotion theory emphasizes context, concepts, and bodily regulation. These perspectives should not be collapsed into a claim that “science proves 27 emotions” or that 100 independent bars are more realistic. [Cowen and Keltner, 2017](https://doi.org/10.1073/pnas.1702247114), [Barrett, 2017](https://academic.oup.com/scan/article/12/1/1/2823712)

**Proposed minimum:** valence and arousal, plus a short list of active appraisals with causes, targets, strength, and expiry. Optional labels such as anger, fear, grief, joy, or relief can communicate those states. Labels may coexist and need not be independently updated every tick.

For example, a shouted warning can be appraised as an insult until a nearby hazard becomes visible. New evidence changes the appraisal, which changes action preferences and outward expression. The same high arousal could accompany excitement or fear; its event context matters. Comfort belongs partly in bodily/environmental state, humor can be a style or activity, and apathy may concern motivation. Forcing every word into an equivalent emotion bar would obscure useful distinctions.

Define decay, saturation, and stacking rules. High distress can increase avoidance or help-seeking likelihood, but should not deterministically force violence. A compact health or mood display can be derived for a player character; nearby NPCs reveal observable cues. Private appraisals remain private unless voluntarily communicated. A visible “angry” animation expresses a game state and should not be described as diagnosis or mind reading.

## 5. Durable but bounded memory

**Proposed memory stores:** a short recent-event buffer; selected autobiographical episodes; learned beliefs; relationship summaries; and active commitments. The server's factual event ledger is separate from every actor's memory. An actor can forget an event without erasing what actually happened, ownership, injury, or another actor's recollection.

Each memory should carry:

- Identity, actor owner, observed time, and stored time.
- Type: observation, reported speech, inference, reflection, or intention.
- Participants, location, topic tags, and linked source-event identifiers.
- Confidence and provenance: witnessed directly, heard from someone, or inferred.
- Importance, last useful retrieval, retention class, and content size.
- Replacement/supersession links when beliefs change.

The key distinction is “Ben said the bridge is safe” versus “the bridge is safe.” Dialogue adds the former immediately; the latter remains a belief with supporting evidence. Summaries must not upgrade rumor into fact. A generated thought cannot retroactively assert that an unseen event occurred.

**Proposed consolidation:** sleeping schedules a background review of recent experiences. Select consequential episodes, extract tentative lessons, preserve unresolved promises, merge repetition, and remove low-value detail. “Dreaming” is a fictional presentation for this maintenance task, not a scientifically faithful account of sleep. Imagined dream scenes must be tagged as imagination and excluded from authoritative history.

Use hard byte limits as well as record counts. An initial experimental policy could cap recent episodes at 512 and reserve separate space for significant relationships and unfinished commitments, but that is a tuning starting point, not a validated capacity. Count embeddings and index overhead separately. When the budget fills, compact repetitive episodes before discarding pivotal events. Commitments need a protected allocation so forgetting routine details does not randomly delete an outstanding debt or appointment.

Deleting or compacting a source needs an explicit policy for dependent summaries. Preserve a compact provenance stub, or mark the summary's evidence as unavailable. A summary that cannot be supported should not remain confidently factual forever. Keep operator retention and player privacy policy separate from the fictional forgetting mechanic.

## 6. Perception defines the actor's knowledge boundary

**Proposal:** generate per-actor observations before calling a model. Start with distance, line of sight, room boundaries, and interaction reach. Deliver coarse sound events within a radius; distinguish hearing a voice from understanding words or identifying the speaker. Touch requires reach and contact permission. Later, sound transmission can consider doors and materials without changing the observation contract.

An observation should include modality, location estimate, confidence, source identity if recognizable, and perceived content. A distant gunshot might reveal direction and loudness without revealing the shooter. A phone call creates an explicit remote communication channel; it does not extend physical sight. An actor who sees a closed cupboard should not receive its entire inventory in the prompt.

The model also contains general pretrained knowledge. Prompt instructions can limit in-world claims, but hard control comes from restricting tools and validating action preconditions. An NPC may speculate about a hidden item; it may not consume it or target its exact location without authorization from world state and the game's rules. Test information leakage as behavior, not merely as a prompt-writing exercise.

## 7. Computation, concurrency, and evaluation

**Proposal:** use deterministic continuous needs updates, event-triggered appraisal, cheap routine action selection, and bounded model deliberation for novelty and dialogue. Relevant state should influence a decision through a compact context projection; “the entirety of state” should not mean serializing a lifetime of memories for every call. Preserve access to additional permitted memories through bounded retrieval when needed.

One hundred agents deliberating every thirty seconds produce 12,000 deliberations per real hour before extra dialogue or reflection. Parallel execution lowers waiting but does not remove those calls or their expense. This arithmetic is illustrative, not a service estimate. Apply per-sector and per-agent budgets, priority queues, deadlines, and cancellation when a plan becomes obsolete. Stagger consolidation instead of waking every sleeper's model at the same instant.

Let agents propose actions concurrently against versioned observations; only the authoritative world applies state changes. A delayed proposal to eat the last meal must fail or replan if someone else already took it. Start physical actions with an observable intention and a reaction window where appropriate, as the brief requests. Keep walking and idle behavior available during model delays.

Proposed evaluation scenarios:

1. A secret told in one room does not reach an absent agent until communication occurs.
2. Two agents interpret the same incident differently but update when shown new evidence.
3. A promise survives memory consolidation and causes timely action or explicit renegotiation.
4. A helmet changes the supported consequences of a punch without granting the model authority to invent hidden anatomy.
5. A frightened agent can flee, seek help, freeze briefly, or negotiate within validated actions.
6. A provider outage preserves survival routines and world consistency.
7. Repeated conversations retain individual style without repeating identical responses.

Track contradiction rate, unsupported knowledge, forgotten commitments, action validity, memory growth, calls per active agent-hour, and player judgments of coherence. Clinical accuracy, social forecasting, and real-world personality assessment would require separate evidence and are not launch claims. The immediate target is understandable fictional characters whose choices follow their circumstances and history.

# AI Dungeon — full research dossier

**G40 · Complete research pass, September 26, 2026.** This dossier covers AI Dungeon from the 2019 GPT-2 prototypes through the current 2026 product, with model/provider/version boundaries kept explicit. Historical GPT-2/GPT-3 reviews are not treated as measurements of current model quality; the retired 2022–2024 Steam/Traveler edition is separated from today's web/mobile service. The prior chapter and source notebook remain preserved owners for the earlier field-guide material.

[Preserved overview](../games/ai-dungeon.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md)

AI Dungeon is most useful to OpenLegend precisely because it is **not** an authoritative world simulation. It is an unusually mature product for turning natural-language intent into collaborative fiction, repairing generated fiction when it drifts, and engineering limited model context so a long-running story feels more continuous. Its strongest lesson is the value of language as an interface. Its strongest warning is that plausible narration, remembered prose, and actual world truth are three different things.

## 1. Identity, current scope and player promise

AI Dungeon is Latitude's cloud-hosted AI-guided roleplay and interactive storytelling product. As of this pass it is playable through the web and mobile apps, requires an account and network connection, and offers a free tier plus paid memberships. It also has a retired Steam release whose historical reviews remain accessible and relevant as an edition-specific reception sample. [AID01](#aid01) [AID02](#aid02) [AID03](#aid03)

The current product promise is much broader than a conventional parser adventure:

- choose a Quick Start or community Scenario;
- create a character/premise;
- type character actions or dialogue;
- directly narrate story text when desired;
- let an AI model continue the fiction;
- edit, erase, retry, undo or redo text;
- maintain important facts through plot/context tools;
- choose among multiple story-generation models;
- create/publish reusable Scenarios;
- optionally script Scenario behavior;
- play cooperatively in a shared Adventure;
- generate images from the current fiction.

That means the player is simultaneously some mixture of:
- **actor** — “my character tries this”;
- **dialogue author** — “my character says this”;
- **director** — “this is what happens next”;
- **editor** — rewrite an unsatisfactory result;
- **prompt/context engineer** — tune memory, instructions and model settings;
- **scenario creator** — package a repeatable starting situation for other players.

The exact mixture is chosen by the player rather than enforced by one simulation contract. [AID04](#aid04)

## 2. The core turn: Do, Say, Story, Continue and See

The central interaction is a stream of text **Actions**.

### Do

**Do** frames text as something the player's character attempts to do.

This is closest to a traditional roleplaying command:
- enter the room;
- inspect an object;
- attack;
- hide;
- follow someone;
- pick something up.

But the input is not sent to a deterministic verb resolver. The story model receives the input plus current context and generates plausible continuation text. A narrated success therefore does not imply that a native inventory, collision system or combat authority independently verified it. [AID04](#aid04)

### Say

**Say** frames the input as dialogue by the player's character.

This gives natural conversational roleplay a first-class affordance without requiring the player to manually format every line.

### Story

**Story** is explicitly authorial. Instead of saying what the character attempts, the player can narrate what is true or what happens next.

This distinction is important:
- Do/Say suggest **embodied intent**;
- Story exposes **fiction-authoring authority**.

AI Dungeon can blur those roles intentionally because the product is collaborative fiction. OpenLegend should preserve the distinction more rigorously whenever a persistent shared world's resources, permissions or other actors are affected.

### Continue

**Continue** asks the AI to produce more story without a new character action.

The player can therefore shift between:
- interactive turn taking;
- passive reading;
- co-writing;
- direct editing.

### See

**See** turns a text prompt into an image inside the Adventure. The current settings surface supports multiple image models; Latitude first publicized Stable Diffusion-based story illustration in 2022. Image output is illustrative rather than an authoritative rendering of a fully simulated scene. [AID04](#aid04) [AID05](#aid05)

## 3. Correction is a core mechanic, not an exceptional recovery path

AI Dungeon explicitly gives players:
- **Edit** — rewrite prior player or AI text;
- **Retry** — ask for a different generated continuation;
- **Erase** — remove one or many recent Actions;
- **Undo / Redo** — traverse edits;
- direct story-text editing followed by Continue.

Official documentation actively encourages editing generated text instead of treating the first model completion as canonical. [AID04](#aid04)

This changes the meaning of failure.

In a conventional RPG:
- the world rejects an action;
- the player pays a cost;
- the state transition is authoritative.

In AI Dungeon:
- an implausible or unwanted completion can often be rewritten;
- a “dead” character can be edited back into a different narrative;
- a missing object can be narrated into existence;
- an unwanted NPC decision can be replaced.

There is no contradiction in that design because **the player is partly the author of canon**.

### OpenLegend boundary

OpenLegend can offer correction tools for:
- misunderstood intent;
- generated prose;
- presentation errors;
- creator-mode world editing.

It should not silently make every committed simulation consequence retryable.

A useful contract is:

1. **proposal** — what the player says they want;
2. **adjudication** — what the world laws permit and what succeeds;
3. **commit** — authoritative state/effects;
4. **narration** — how that outcome is described;
5. **correction** — which layers may be edited afterward and by whom.

AI Dungeon collapses several of these layers on purpose. OpenLegend should learn from the UX without inheriting the authority ambiguity.

## 4. There is no universal native RPG ruleset underneath the prose

AI Dungeon can narrate almost any familiar RPG construct:
- health;
- wounds;
- spells;
- classes;
- inventories;
- money;
- crafting;
- factions;
- travel;
- combat;
- romances;
- pets;
- cities;
- political systems.

But those concepts are not automatically one shared native simulation.

By default there is no universal authoritative:
- hit-point ledger;
- item database;
- encumbrance system;
- grid/world map;
- skill tree;
- cooldown system;
- equipment slots;
- deterministic spell list;
- faction reputation score;
- crafting graph;
- death/respawn contract.

A Scenario creator can encode some such rules in prose/context or use **Scripting** to create stronger custom mechanics, but that is scenario-authored behavior rather than a global AI Dungeon world law. [AID06](#aid06)

This distinction prevents a common research error: a generated sentence saying “you have three healing potions” is evidence that the model can *write about inventory*, not that AI Dungeon has a robust native inventory ontology.

## 5. Scenarios: reusable authored beginnings

A **Scenario** is a template for starting Adventures.

A Scenario can package:
- an initial Prompt;
- Plot Essentials;
- Story Cards;
- AI Instructions;
- Author's Note;
- other settings;
- optional Scripting for supported Scenario types.

Playing it creates a new Adventure with those components transferred in. Multiple players can therefore instantiate separate stories from the same authored setup. Scenarios begin as unpublished drafts and can be published for other players to discover. [AID07](#aid07)

This is a useful separation between:
- **world/premise authoring**;
- **individual play history**.

A creator can define:
> “You are a diplomat arriving in a city where three guilds are near war.”

Different Adventures can then diverge without sharing one canonical state.

OpenLegend will often need the opposite too:
- reusable world package;
- **shared persistent instance**;
- durable consequences that survive player sessions.

The Scenario/Adventure split is therefore a useful pattern, but not sufficient for a multiplayer simulation world by itself.

## 6. Plot Components: explicit context engineering

Modern AI Dungeon exposes context steering as product UI rather than hiding it as a prompt-engineering trick.

### AI Instructions

AI Instructions tell the model **how to generate**:
- point of view;
- style;
- behavioral constraints;
- pacing;
- topics to avoid;
- role framing.

They function more like generation policy than world fact. [AID08](#aid08)

### Author's Note

Author's Note supplies high-priority guidance on:
- genre;
- tone;
- style;
- short-term direction.

Because it is placed late in context, official docs describe it as particularly influential. [AID09](#aid09)

### Plot Essentials

Plot Essentials are always-in-context facts the player considers important:
- player identity;
- companion details;
- setting constraints;
- current premise;
- facts that should not be forgotten merely because old story text fell out of the context window.

They were formerly called “Memory.” [AID10](#aid10)

### Story Summary

Story Summary condenses broader story progress. It is also the surface used by the automatic summarization side of the newer Memory System.

### Third Person

Third Person rewrites Do/Say conventions around named characters and is especially recommended for multiplayer, where several human-controlled characters share the same story. [AID09](#aid09)

## 7. Story Cards: conditional world lore

Story Cards are notes about:
- characters;
- locations;
- factions;
- races/classes;
- objects;
- spells;
- events;
- any creator-defined concept.

They have **Triggers**. When a trigger becomes relevant in story/input text, the card can be injected into context for a period. [AID11](#aid11)

This is materially different from keeping every lore entry in every prompt.

It creates a retrieval pattern:
1. detect relevant concept;
2. retrieve compact associated facts;
3. spend context only when useful.

### What Story Cards do well

They can help a model know:
- who “Captain Mira” is;
- what rules define “blood magic”;
- what district “Low Harbor” contains;
- why two factions are enemies.

### What they do not guarantee

A Story Card is:
- context supplied to a probabilistic generator.

It is not:
- a database foreign key;
- a validation constraint;
- proof the model will obey every fact;
- the current mutable state of the represented entity.

OpenLegend can reuse the **retrieval idea** while keeping actual entity/state authority elsewhere.

## 8. The Memory System: compression plus retrieval

AI Dungeon's newer **Memory System** consists primarily of:
- **Auto Summarization**;
- a **Memory Bank**.

The documented process summarizes chunks of past actions into compact Memories instead of keeping the complete transcript indefinitely. Relevant Memories can later be retrieved into context. The system begins producing memories after enough actions have accumulated and continues as the Adventure grows. [AID12](#aid12)

This solves a real product constraint:
- model context is finite;
- old raw prose eventually falls out;
- long stories need selective compression/retrieval.

### Memory is lossy

A summary can preserve:
- “Mira revealed she is the prince's sister.”

while dropping:
- exact wording;
- emotional subtext;
- physical staging;
- minor details.

That is often desirable for story generation, but dangerous if the summary becomes the only source of truth for:
- ownership;
- debts;
- exact quantities;
- injuries;
- private knowledge;
- legal promises;
- timestamps.

### OpenLegend pattern

Use several memory layers with distinct jobs:
- **authoritative state/event log** — exact facts and transitions;
- **episodic memory** — what an actor experienced;
- **semantic summary** — compressed durable understanding;
- **retrieval index** — what is relevant now;
- **narrative context** — the small subset passed to a model.

AI Dungeon strongly validates the value of automatic summary/retrieval UX. It does not validate replacing exact world state with summaries.

## 9. Context budget is a visible gameplay/product resource

AI models can only consider a bounded input context on each generation.

AI Dungeon's Context Viewer/settings expose the practical competition among:
- AI Instructions;
- Story Summary;
- Plot Essentials;
- Author's Note;
- Story Cards;
- Memories;
- newest story Actions.

If the context overflows, some dynamic elements or older story text must be trimmed. Official documentation explicitly distinguishes **Required** versus **Dynamic** context and recommends concise Plot Essentials. [AID10](#aid10) [AID13](#aid13)

This makes “remembering more” a resource-allocation problem rather than magic.

### Current tier boundary

The 2026 membership page states baseline context entitlements of roughly:
- Wanderer/free: up to 4K;
- Journey: up to 8K;
- Legend: up to 16K;
- Mythic/Ultimate: up to 32K;

with some models/tier combinations supporting different limits and optional credit-funded temporary context increases. The dedicated model page shows several specialized models and Shadow-tier configurations that can extend far beyond those baseline numbers. Treat the exact per-model matrix as volatile product configuration, not a timeless mechanic. [AID14](#aid14) [AID15](#aid15)

## 10. Model choice is part of the experience

AI Dungeon no longer has one canonical “AI.”

The current model selector includes:
- automated mixtures such as **Dynamic Small** and **Dynamic Large**;
- in-house/specialized fine-tunes such as **Muse**, **Hearthfire**, **Equinox**, **Nova**, and **Wayfarer Large**;
- provider/base-model options and experimental high-context paths such as **Gemma**, **Atlas**, **Raven**, **GLM**, **DeepSeek**, and other premium/deprecated options depending on tier and current availability.

The help page describes models in terms of experiential specialties:
- relationship/emotional writing;
- slice-of-life;
- action/consequence;
- stability;
- instruction following;
- long context;
- darker/violent prose;
- general quality.

The exact list changes over time and some models are explicitly deprecated/experimental. [AID15](#aid15)

### Consequence

Two players can use:
- the same Scenario;
- the same starting context;
- different models;

and receive materially different:
- pacing;
- tone;
- willingness to introduce conflict;
- continuity;
- dialogue;
- prose style;
- refusal behavior.

The **model is therefore partially a rules/authoring component**, even though it does not become a deterministic rules engine.

### OpenLegend lesson

If OpenLegend ever permits world authors or players to choose cognition/narration models:
- the chosen model/version must be observable configuration;
- changing it can alter behavior;
- persistent mechanical state should not depend on hidden model personality;
- migration/version changes should not silently rewrite what characters know or what events occurred.

## 11. Model settings expose probabilistic behavior

Depending on model, AI Dungeon exposes controls such as:
- response length;
- temperature;
- Top K;
- Top P;
- presence penalty;
- frequency penalty;
- context length.

These are not character statistics. They change **generation distribution and output shape**. [AID16](#aid16)

A player can therefore “tune the dungeon master” rather than only tune an avatar.

This is interesting for OpenLegend creator/debug surfaces, but it should be separated from ordinary in-world mechanics. A character should not become braver because an administrator raised a language model temperature.

## 12. Scripting adds a deterministic creator layer

Scenario **Scripting** lets creators run JavaScript around the generation pipeline.

The documented hooks include:
- input processing;
- context processing;
- output processing;
- shared library code;
- mutable script state;
- Story Card manipulation.

Scripts belong to Scenarios and can be tested in the creator UI. Published scripts may be reviewed for moderation. [AID06](#aid06)

This is a major architectural distinction inside AI Dungeon:

> free-form model generation can be surrounded by deterministic programmable transforms.

Creators can use scripts for things the language model alone is poor at:
- dice;
- counters;
- custom state;
- text transformation;
- conditional lore;
- bespoke mechanics.

### OpenLegend comparison

OpenLegend's native domain layer can play the role that AI Dungeon scripts only optionally approximate:
- authoritative rules;
- deterministic mutation;
- explicit permissions;
- durable entities.

The LLM can then specialize in:
- interpretation;
- intent;
- character deliberation;
- prose;
- invention proposal.

## 13. Multiplayer: shared authorship, not a shared physics server

AI Dungeon supports multiplayer Adventures.

A host can:
- create a multiplayer game;
- generate a join code;
- invite players;
- kick/block participants;
- choose model/settings;
- enable Third Person so each participant's Do/Say actions map to a named character.

Only the host needs the relevant premium membership for the shared Adventure to use those premium benefits. [AID17](#aid17)

The important social unit is the **shared story transcript**.

Players can:
- speak/act as separate characters;
- create conflicting or complementary directions;
- jointly react to AI-generated characters/events.

What is not implied:
- authoritative simultaneous spatial simulation;
- separately replicated inventories;
- deterministic initiative/turn order;
- ownership-safe conflict resolution.

A historical GameFAQs player review found chaotic multiplayer entertaining precisely because several humans could flood the story with contradictory actions and the AI would improvise through the confusion. That is fun in collaborative fiction; it would be catastrophic as the only concurrency policy for a persistent economy. [AID18](#aid18)

## 14. Community creation, publishing and discovery

Players can keep content private or publish Scenarios/Adventures.

Published content:
- receives a content rating;
- can be searched/discovered;
- can be shared by link;
- becomes part of a creator ecosystem.

The current rating flow uses Everyone, Teen, Mature and Unrated categories for public discovery, while private single-player content follows a different moderation boundary. [AID19](#aid19)

This creates two content loops:
1. **play-generated story** — personal Adventure;
2. **reusable creation** — Scenario that other people can instantiate.

Creators can also receive **Scales** as tips from other users. [AID20](#aid20)

### OpenLegend opportunity

A world-creation ecosystem may similarly need several distinct shareable artifacts:
- complete persistent worlds;
- reusable laws/mechanics packs;
- character templates;
- quests/scenarios;
- buildings/items;
- visual/audio assets.

Do not collapse all creator output into “prompt sharing.”

## 15. Economy and monetization are mostly outside the fiction

AI Dungeon's current monetization is a compute/content-service economy rather than a universal fictional RPG economy.

### Memberships

The current standard tiers are:
- **Wanderer** — free;
- **Journey** — $14.99/month;
- **Legend** — $29.99/month;
- **Mythic** — $49.99/month;
- **Ultimate** — $99.99/month;

with additional Shadow-tier offerings for heavier model/context use. Paid tiers add combinations of:
- more/premium text models;
- larger context;
- larger Memory Bank allowance;
- monthly Credits;
- premium image/model access.

Pricing is a dated 2026 snapshot and should not be treated as permanent. [AID14](#aid14)

### Credits

Credits can pay for:
- image generation;
- temporary extra context on supported models;
- other premium inference-related actions as configured.

Retrying text generation can itself consume generation resources when a paid-credit path is active. [AID04](#aid04)

### Scales

Scales are a softer community resource earned from:
- daily rewards;
- creator tips.

They can be spent on:
- speed boosts for free models;
- tips to creators. [AID20](#aid20)

### What this teaches

AI-generation cost is visible enough to influence product design:
- model quality;
- context;
- speed;
- images;
- retry frequency

all have economic implications.

OpenLegend should similarly avoid pretending model calls are free. But **compute admission** should stay separate from an in-fiction gold economy unless a world intentionally links them.

## 16. Safety, privacy and the boundary between private play and public content

Current AI Dungeon provides account-wide **Safe**, **Moderate** and **Mature** generation settings. Mature requires an 18+ confirmation. Public content discovery uses its own rating/search system rather than assuming the generation-safety setting and publication rating are the same thing. [AID21](#aid21)

Current moderation documentation says:
- unpublished single-player content is not human-moderated;
- targeted model boundaries prevent prohibited sexual exploitation of children;
- public content is subject to community guidelines/rating/moderation;
- private story text is not read by staff except narrow permission/feedback/support paths described by the privacy docs;
- “Improve the AI” is opt-in and can log anonymized model inputs/outputs for evaluation. [AID22](#aid22) [AID23](#aid23)

This current posture cannot be understood without the 2021 privacy/filter crisis; that production history is part of the remaining checkpoint work and will be treated separately rather than back-projecting current policy onto the historical product.

## 17. Narrative, characters, relationships and “death”

AI Dungeon's narrative is not a fixed campaign waiting to be uncovered. A starting prompt establishes a premise, and then the player/model/editor loop writes the story forward.

That means:
- an NPC can be introduced because the model predicts one;
- a romance can emerge through dialogue without a native relationship meter;
- a faction can exist as prose/Story Cards without a universal reputation table;
- a quest can be narrated without a native quest-state machine;
- a death can be written, erased, retried, reversed or followed by a ghost/zombie continuation if the player/model accepts it.

A launch-era Ars session is especially revealing: one tester died, checked a changed “inventory,” then simply instructed the story to rise from the dead. The episode was funny precisely because no authoritative death/inventory system constrained the continuation. [AID31](#aid31)

### NPC behavior

Characters can feel locally responsive because the model sees:
- recent transcript;
- active plot components;
- relevant Story Cards/Memories;
- generation instructions.

But AI Dungeon does not thereby establish that every NPC has:
- a durable private knowledge graph;
- an independent offscreen schedule;
- goals ticking while absent;
- an authoritative inventory/body;
- permissions over world objects.

OpenLegend should preserve the distinction between **a character being convincingly written now** and **a character existing continuously as a simulated actor**.

## 18. Presentation, interface, accessibility and feel

AI Dungeon is fundamentally **text first**.

The primary rhythm is:
1. read generated prose;
2. type or choose an Action mode;
3. wait for inference;
4. accept, redirect, edit or retry;
5. repeat.

Its interface communicates authorial role through visible Do/Say/Story/Continue controls rather than making the player remember parser syntax. Context/model/settings surfaces expose some of the machinery behind generation. Images created with See can decorate or visualize an Adventure, but there is no core navigable 3D camera or spatially authoritative rendered scene. [AID04](#aid04)

### Feel

The strongest positive sensation reported across early criticism is **surprise**:
- the system acknowledges an unusual idea;
- it invents a consequence nobody authored in advance;
- a throwaway input becomes a strange new plot.

The corresponding friction is also generated by surprise:
- abrupt scene changes;
- invented possessions;
- forgotten characters;
- pronoun/identity drift;
- loops;
- model taking unwanted control of the protagonist;
- latency or generation errors.

Stuff's 2020 review explicitly paired heavy customizability and fascination with slow responses, incoherence and abrupt shifts. [AID32](#aid32)

Audio is not a foundational current game system in the way prose is. Historical plans and experiments around voice do not make audio a core rule-bearing layer for this dossier.

## 19. Concrete situations: what the system actually lets a player do

These examples are **rules-based illustrations unless a source is explicitly named**. They are not claimed as play sessions conducted for this research.

### Situation A — embodied intent becomes story, not guaranteed state

**Intention:** sneak past a guard.

**Conditions:** the Adventure currently describes a guarded gate.

**Action:** use Do: “crawl behind the carts and slip through while the guard looks away.”

**Interaction:** the model receives that input plus current context and narrates a result.

**Possible result:** success, discovery, a new complication, or an unrelated continuation.

**Next decision:** accept it, Retry, Edit, or directly Story-author a different outcome.

**Limitation:** the prose result is not proof that a deterministic stealth roll, line-of-sight system and spatial collision test occurred.

### Situation B — dialogue has first-class framing

**Intention:** persuade an NPC rather than attack.

**Action:** use Say to deliver an argument.

**Interaction:** the model continues the conversation using current context and character/lore hints.

**Result:** the NPC may agree, refuse, reveal information or pivot the scene.

**Next decision:** continue negotiating, act, edit, or retry.

**OpenLegend implication:** natural-language speech can be delightfully unconstrained while persuasion consequences still belong to world state/rules.

### Situation C — the player repairs canon

**Intention:** keep a companion in the scene after the model accidentally drops them.

**Action:** Edit the generated paragraph or Retry it.

**Result:** the transcript—the story's effective canon—changes.

This is not merely a debugging affordance; it is part of the co-authoring contract. In OpenLegend, an equivalent edit should clearly distinguish **prose repair** from **rewinding committed simulation**.

### Situation D — long-running lore competes for context

**Intention:** keep “Mira is secretly the prince's sister” relevant hundreds of Actions later.

**Action:** put the fact in Plot Essentials or an appropriate Story Card; newer Memory features may also summarize/retrieve it.

**Interaction:** the fact consumes or conditionally enters the finite model context.

**Result:** later generations have a better chance of using it coherently.

**Limitation:** context presence is not a database constraint. The model can still contradict it.

### Situation E — deterministic scaffolding surrounds free generation

**Intention:** make a Scenario where a ritual only succeeds after three tokens are collected.

**Action:** a creator can use Scripting/state around model input/output rather than merely asking the model to remember a counter.

**Result:** the story model remains generative while a deterministic transform maintains creator-defined logic. [AID06](#aid06)

**OpenLegend implication:** free-form interpretation gets much stronger when exact rules have a separate owner.

### Situation F — multiplayer embraces conflicting authors

**Attributed historical player account:** the 2021 GameFAQs review describes multiplayer becoming entertainingly chaotic when several humans issue incompatible directions and the AI improvises through them. [AID18](#aid18)

That is a valid social-storytelling mechanic. It is not an adequate conflict-resolution system for shared ownership, combat, trade or irreversible world mutation.

## 20. Production history: the model changed, so the “game” changed

AI Dungeon is unusually dependent on its underlying model generation, so its production history is also part of its gameplay history.

### 2019 — hackathon prototype to viral AI Dungeon 2

Nick Walton's first 2019 hackathon version used a smaller GPT-2 model and was much more constrained/incoherent. The later project used the full GPT-2 family with adventure-story fine-tuning and relaunched publicly as AI Dungeon 2 in December 2019. Contemporary developer accounts describe an immediate viral spike, severe infrastructure/download costs and community help distributing the model through peer-to-peer methods while the service was rebuilt. [AID24](#aid24) [AID33](#aid33)

The important production lesson is not merely “AI went viral.” It is:
- inference/model distribution had real marginal infrastructure cost;
- the first viral architecture did not scale cleanly;
- community enthusiasm temporarily became part of operations.

### 2020 — multiplayer, memory work and GPT-3 Dragon

By July 2020 Latitude said it had already added multiplayer, quest-completion detection, output handling and more complex world-memory systems. It launched the premium **Dragon** model after collaboration with OpenAI, A/B tests, fine-tuning and user feedback. Dragon was GPT-3-based and represented a large coherence jump in Latitude's own testing, but the launch post itself acknowledges AI Dungeon still fell short of the company's broader living-world ambitions. [AID25](#aid25)

This is a critical version boundary: a review of December 2019 GPT-2 behavior cannot be silently generalized to Dragon, much less to 2026's multi-model product.

### 2021 — funding, scale and provider/trust crisis

TechCrunch reported a **$3.3 million seed round** in February 2021 and Latitude-reported **1.5 million monthly active users** at that time. Those are dated measurements, not current retention or revenue. [AID26](#aid26)

Later in 2021, the product hit a major trust/safety crisis. Latitude's own retrospective says it rushed a filtering system after provider-policy pressure; false positives and erroneous bans occurred; compliance required manual review of some player stories; players objected to the privacy implications; and Latitude ended manual moderation in August 2021. The company also says unsafe material had entered its fine-tune/base-model pipeline, retraining was required, and it moved away from dependence on one exclusive language-model provider. [AID27](#aid27)

The design lesson is broader than moderation:
> when an AI model is part of the product's behavior, provider policy, training data, safety controls, privacy promises and moderation architecture can all change the effective game.

### 2022–2024 — image generation and the Steam/Traveler experiment

AI Dungeon added image-generation tooling and launched a **$30 one-time Steam/Traveler edition in July 2022**. As inference costs improved, Latitude moved Steam toward free-to-play, later sold Traveler as a smaller in-app upgrade, stopped offering it in September 2023, and retired the Steam app in early 2024. Latitude says the old Traveler benefits were subsequently absorbed into the free tier. [AID05](#aid05) [AID28](#aid28)

That history matters when reading Steam reviews: they are reviews of a specific monetization/package era that no longer exists.

### 2024–2026 — memory/context/model productization

The current product exposes:
- multiple model families;
- larger/paid context;
- Auto Summarization and Memory Bank;
- reusable AI Instructions;
- Story Cards;
- model tuning;
- scenario scripts;
- staged Alpha/Beta/Production features.

The beta system explicitly lets Latitude test unfinished features with players before broad release. [AID30](#aid30)

### Adjacent 2026 boundary: Voyage is not AI Dungeon

Latitude's 2026 company materials describe **Voyage** as a separate product built around years of “World Engine” prototyping and more deterministic RPG state. That is useful negative evidence: Latitude itself treats the structured-world problem as a distinct product/technical problem rather than claiming AI Dungeon's text transcript already provides authoritative simulation. [AID29](#aid29)

Do not transfer Voyage's current mechanics into AI Dungeon.

## 21. Distribution, discovery and virality

AI Dungeon's distribution evolved through:
- an early Colab/community-hosted technical experiment;
- web;
- iOS/Android;
- a later Steam client that is now retired;
- creator-published Scenarios and Adventures;
- link/social sharing;
- a Discord/community ecosystem.

### Why the launch spread

Contemporary and company accounts point to a highly shareable unit:
- **the bizarre generated story itself**.

Players could post:
- screenshots;
- transcripts;
- unexpected commands;
- absurd model consequences.

Kotaku's launch-period piece is effectively built from exactly that loop: a bizarre skeleton-band story becomes the article's hook. [AID34](#aid34)

Latitude now describes the 2019 launch as viral and says the first-week load crashed infrastructure. Treat that as the company's account of its launch history, not measured attribution proving which channel caused adoption. [AID29](#aid29)

### OpenLegend implication

The best shareable unit for an AI-native world may not be a marketing card. It may be:
- “look what this character did”;
- “look what we invented”;
- “look what happened to our town”;
- a compact replay/receipt of a genuinely surprising world event.

But OpenLegend should ensure the event was actually produced by world rules, not a screenshot-only hallucination.

## 22. Commercial and participation context

Current AI Dungeon combines:
- a free service;
- subscriptions;
- credit-funded premium inference/context/images;
- creator tips through Scales.

Historical business models included:
- Patreon/community support;
- premium subscriptions;
- energy/ad-based limits;
- the retired one-time-purchase Traveler package.

### Dated scale measurements

Useful milestones are not interchangeable:

- **February 2021:** TechCrunch reported Latitude's claim of about **1.5 million monthly active AI Dungeon users** and a **$3.3M seed round**. [AID26](#aid26)
- **2026 company fact sheet:** Latitude reports **8M+ registered players**, **97M+ Adventures created**, **7M user/AI-generated Scenarios**, **1.5T+ tokens monthly**, **38K+ Discord members**, and **64K all-time creators**. These are company-reported cumulative/activity measures, not audited retention, revenue or profit. [AID29](#aid29)

Do not compare:
- registered accounts;
- MAU;
- Adventures;
- Scenarios;
- tokens

as if they measured the same thing.

The commercial design constraint is unusually visible: model quality and context cost real compute. AI Dungeon has repeatedly changed limits/pricing as model economics changed. [AID14](#aid14) [AID28](#aid28)

## 23. Five substantive written reviews / critical accounts

The strongest accessible formal reviews cluster around the **2019–2020 GPT-2 edition**. That is an evidence limitation, not permission to present them as a 2026 quality survey.

### 1. Stuff — Craig Grannell, January 12, 2020

**Praised:** customizability, fascination, endless surprising storytelling and the ability to publish custom stories.

**Criticized:** slow responses, incoherence and abrupt shifts. One example could not consistently decide whether the protagonist witnessed or suffered a crash.

**Interpretation:** Grannell treats instability as partly compatible with a dreamlike improvisational product, not as proof that continuity does not matter. [AID32](#aid32)

### 2. 148Apps — Campbell Bird, December 30, 2019

**Praised:** raw creativity, accepting unusually broad input, custom lore and the feeling that almost any idea receives some response.

**Criticized:** weak memory, derailment, character replacement, loops and the need for the human to keep re-establishing the story.

**Interpretation:** the review explicitly frames AI Dungeon as co-authoring rather than a conventional objective-driven game. [AID35](#aid35)

### 3. TapSmart — Jon Mundy, February 28, 2020

**Praised:** huge input variety, occasional highly appropriate interpretation and a “magical” custom-adventure path.

**Criticized:** vague/non sequitur NPC responses, lack of recognizable narrative resolution and a sense that the player must do much of the story's structural work.

**Interpretation:** unlimited local response is not the same thing as satisfying long-range narrative shape. [AID36](#aid36)

### 4. Ars Technica — multi-staffer test, January 20, 2020

**Praised / enjoyed:** surprising improvisation, comedy, willingness to accept outrageous directions and moments of unexpectedly coherent riffing.

**Criticized:** phantom inventory, pronoun/context errors, loops, setting violations, network failures and inability to track persistent variables.

Different staffers reacted differently: some laughed through the chaos; one found little reason to return; another concluded it worked much better as a “yes, and” collaborator than as a conventional parser adventure. [AID31](#aid31)

### 5. GameFAQs — Rin-Coconut, March 8, 2021

**Praised:** breadth of possible prompts, emergent absurdity and especially chaotic multiplayer improvisation.

**Criticized:** model misunderstanding and inconsistency could still derail intent.

This is a substantive **player-authored review**, not professional criticism; it is included because the requirement asks for direct player accounts as well as critic perspectives. [AID18](#aid18)

### Additional contemporaneous criticism

Kotaku found the “do almost anything” premise surprisingly convincing when it worked, while documenting catastrophic confusion and eventual nonsense. GamingOnLinux likewise described impressive/amusing interactions alongside getting stuck and launch infrastructure problems. PC Gamer highlighted the same basic novelty: plain English produced surprising responses without the parser's narrow verb vocabulary. [AID34](#aid34) [AID37](#aid37) [AID38](#aid38)

### Reception boundary

These sources establish that **free-form co-authorship was compelling before modern frontier LLM quality**. They do not establish that today's Muse/Dynamic/GLM/DeepSeek/etc. models have the same strengths or failure rates.

## 24. Steam review sample — historical Traveler edition only

AI Dungeon **was** on Steam, so the requirement's Steam sample applies, even though the app was retired in early 2024. [AID28](#aid28)

The currently accessible all-time helpful review surfaces are dominated by the 2022 Traveler launch era.

### Helpful positive sample

A highly helpful December 2022 positive review jokes approvingly about Latitude making the formerly paid/unlimited Steam value available freely again. Other positive entries are often very short or joke-driven, so they are weak evidence for detailed mechanics. [AID39](#aid39)

### Helpful negative sample

Several highly helpful 2022 negative reviews focus on different issues:
- the one-time Steam price compared poorly with the free web experience;
- the bundled model was reported to forget location/characters and loop;
- some users distrusted Latitude because of the 2021 privacy/moderation episode;
- expectations around ads/image features/premium access did not match what some buyers thought the package meant.

One detailed negative review complains that the model invents unwanted protagonist actions, forgets names/rooms and requires heavy editing. Another criticizes marketing an image-generation feature that still required additional paid access. [AID40](#aid40)

### Evidence limit

These are:
- self-selected players;
- a retired package;
- mostly 2022 reactions;
- mixed with humor/protest reviews.

They are useful for **specific friction**, not prevalence, current model quality or a current purchase recommendation.

## 25. Current player testimony: 2026 still depends heavily on model/setup

The prior field guide already preserves a July 6, 2026 Reddit discussion in which one player reports the model ignoring prompts and jumping scenes; another participant says they did not reproduce that exact problem but did see repetition; another says Retry fixed the issue for them. [AID41](#aid41)

Additional recent threads show the same heterogeneity:

- An August 2026 returning Mythic user reported earlier bugs/repetitive dialogue, omniscient characters and repetitive long chats while asking whether newer changes had improved things. [AID42](#aid42)
- A September 2026 player asked how to stop a character repeating the same sentence; replies suggested model-specific AI Instructions/presets, and the poster reported improvement after adjustments. [AID43](#aid43)
- A January 2026 subscriber who had considered cancelling said Dynamic DeepSeek/new models and doubled context materially revived their interest by improving worldbuilding, character development and recall, while still noting slowdowns/hiccups. [AID44](#aid44)
- In a Latitude-posted survey summary based on **4,345 responses**, repetition was the recurring complaint across multiple questions; this is stronger than one anecdote but still a company-run voluntary survey rather than a representative population sample. [AID45](#aid45)

### Stable lesson across versions

The recurring product challenge is not simply “make prose prettier.” It is:
- preserve identity;
- preserve scene;
- preserve causal continuity;
- avoid repetitive local patterns;
- respect who controls the protagonist;
- retrieve the right old facts;
- distinguish optional creativity from contradiction.

Those are exactly the categories where OpenLegend can gain from a native state/event substrate.

## 26. What AI Dungeon gets especially right

### A. Natural language can be the primary action surface

A user can express an intention at the level they naturally think:
- “convince the guard I'm expected”;
- “pretend the artifact is fake”;
- “ask whether she regrets leaving.”

The interface does not require discovering a designer-enumerated command first.

### B. Authorial role is made explicit

Do/Say/Story is a deceptively strong distinction.

It tells the system—and the player—whether an input is:
- embodied attempt;
- speech;
- direct narrative authorship.

OpenLegend should go further with similarly explicit authority modes rather than one chat box that sometimes acts as player, creator and admin.

### C. Repair controls preserve flow

Retry/Edit/Erase acknowledge that generative output is fallible.

For prose/cognition layers, that is preferable to forcing users to live with an obvious model glitch.

### D. Memory engineering is productized

Plot Essentials, Story Cards, summaries, Memory Bank and Context Viewer turn otherwise invisible prompt-engineering concerns into understandable creator/player tools.

### E. Model choice is legible

Different models are presented as different experiential tools rather than pretending every backend produces identical behavior.

### F. Scenarios create a reusable creator ecosystem

A repeatable premise plus lore/instructions/script can become content other players instantiate.

### G. Deterministic scripting surrounds probabilistic generation

AI Dungeon's scripting layer is evidence that even a narrative-first product benefits from exact programmable state around an LLM.

## 27. What OpenLegend should not copy automatically

### A. Do not let narration be mechanical authority

If the model says:
> “you unlock the door,”

that should not itself prove:
- a key exists;
- the key belongs to the player;
- it matches the lock;
- the player had permission/access;
- the door state changed.

### B. Do not make exact state depend on lossy memory summaries

Summaries are excellent cognition context and terrible accounting ledgers.

### C. Do not hide behavior changes behind an interchangeable “AI” label

Provider/model/version changes can alter:
- characterization;
- refusals;
- persistence;
- creativity;
- latency;
- cost.

Persistent worlds need explicit behavior/version boundaries.

### D. Do not make every failure editable in embodied play

Story-author correction is central to AI Dungeon. Persistent-world consequence needs stronger commitment semantics.

### E. Do not make one context window equal the world

The world can contain millions of facts even if a model sees only a few thousand tokens. Retrieval should select observations/memories; omitted context should not delete reality.

### F. Do not confuse a responsive NPC with an autonomous actor

OpenLegend characters should have native:
- body/location;
- possessions;
- permissions;
- needs;
- schedules/tasks;
- relationships;
- scoped knowledge

even when an LLM helps decide or express higher-level behavior.

### G. Treat trust/safety/provider policy as product architecture

The 2021 crisis demonstrates that moderation/privacy are not peripheral policy pages when private generative play is the product. Data access, evaluation opt-in, public/private boundaries and provider constraints should be designed alongside the system.

## 28. The strongest OpenLegend synthesis

The useful hybrid is:

> **AI Dungeon's expressive input + correction + context tooling, layered over an authoritative world model it does not itself provide.**

A robust OpenLegend action can flow like this:

1. **Human expression** — arbitrary natural-language desire.
2. **Intent interpretation** — typed candidate action(s), uncertainty retained.
3. **Authority check** — actor capabilities, permissions, knowledge and resources.
4. **World resolution** — deterministic/probabilistic rules commit real state.
5. **Observation fan-out** — witnesses perceive only what their senses/access allow.
6. **Cognition/memory** — actors interpret and remember their own observations.
7. **Narration** — model renders the committed result naturally.
8. **Repair surface** — retry/regenerate prose without replaying state; creator/admin rewind only when explicitly authorized.

That architecture preserves the feature AI Dungeon made emotionally obvious:
> the player should be able to *say almost anything*.

But it changes the promise from:
> “the narrator can invent almost any continuation”

to:
> “the world can understand almost any attempted action, then answer according to its actual laws.”

## 29. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / scope / player promise | §§1–4, 20 |
| R02 player actions / major mechanics | §§2–16, 19 |
| R03 items / entities / composition | §§4–8, 12, 17, 19 |
| R04 progression / economy / time / failure | §§3–5, 8–10, 15, 17, 22 |
| R05 concrete interactions | §19 + preserved field-guide examples |
| R06 people / AI / social / multiplayer | §§7–8, 13–14, 17 |
| R07 art / audio / interface / feel | §§2, 11, 18 |
| R08 story / narrative connection | §§1–8, 17, 19 |
| R09 production / development | §20 |
| R10 marketing / distribution / virality | §21 |
| R11 commercial / participation | §§15, 22 |
| R12 reviews / player feedback | §§23–25 |
| R13 transferable inspiration / limits | §§26–28 |
| R14 sources / preservation / navigation | this section + sources below |

**Mechanics-inventory check:** conventional classes/attributes/skill trees, authoritative equipment/inventory, crafting, combat stats, stealth scores, native economy, NPC schedules, faction reputation, settlement management and fixed endgame are **not universal base systems**; they can be narrated or scenario-scripted. The dossier states those absences instead of forcing RPG vocabulary onto a narrative generator.

**Preservation check:** [the prior AI Dungeon chapter](../games/ai-dungeon.md) remains intact and retains the earlier field-guide findings, Vinny viewing recommendation, 2022 Christoph Bartneck reflection, July 2026 player discussion and original AI1/AI2 source annotations. This dossier links rather than replaces it. There is no `dossiers/README.md` on this branch; roster/progress are the current dossier navigation owners, while cross-game dossier navigation remains explicitly deferred under final integration gate P04.

**Viewing boundary:** the preserved Vinesauce video remains metadata/viewing-route evidence only; this pass did not claim to have watched footage or inspected a transcript.

## Sources

<a id="aid01"></a>**AID01 — [Getting Started](https://help.aidungeon.com/getting-started).** AI Dungeon Help, accessed 2026-09-26. Current web/mobile/cloud/free-play positioning and core flow.

<a id="aid02"></a>**AID02 — [AI Dungeon SteamDB record](https://steamdb.info/app/1519310/info/).** SteamDB, accessed 2026-09-26. Historical Steam release metadata and retired-store boundary; secondary metadata, not the current distribution owner.

<a id="aid03"></a>**AID03 — [AI Dungeon](https://aidungeon.com/).** Latitude, accessed 2026-09-26. Current product route/positioning. Preserves earlier overview source AI1.

<a id="aid04"></a>**AID04 — [How to Play AI Dungeon](https://help.aidungeon.com/faq/how-to-play).** AI Dungeon Help, accessed 2026-09-26. Do/Say/Story/See/Continue, Edit/Retry/Erase/Undo/Redo and current settings UI.

<a id="aid05"></a>**AID05 — [Latitude brings AI-generated artwork to AI Dungeon](https://techcrunch.com/2022/09/15/latitude-brings-ai-generated-artwork-to-ai-dungeon/).** Kyle Wiggers, TechCrunch, 2022-09-15. Historical See/Stable Diffusion launch and hands-on image-generation limitations.

<a id="aid06"></a>**AID06 — [How do I use Scripting in AI Dungeon?](https://help.aidungeon.com/faq/how-do-i-write-scripts-and-use-scripting).** AI Dungeon Help, accessed 2026-09-26. Scenario script ownership, hooks, state and test surface.

<a id="aid07"></a>**AID07 — [What are Scenarios?](https://help.aidungeon.com/faq/what-are-scenarios).** AI Dungeon Help, accessed 2026-09-26. Scenario/Adventure template boundary, publishing and inherited plot components.

<a id="aid08"></a>**AID08 — [What is AI Instructions?](https://help.aidungeon.com/faq/ai-instructions).** AI Dungeon Help, accessed 2026-09-26. Player-authored generation-policy surface.

<a id="aid09"></a>**AID09 — [What are Plot Components?](https://help.aidungeon.com/faq/plot-components).** AI Dungeon Help, accessed 2026-09-26. AI Instructions, Story Summary, Plot Essentials, Author's Note and Third Person comparison.

<a id="aid10"></a>**AID10 — [What is Plot Essentials?](https://help.aidungeon.com/faq/plot-essentials).** AI Dungeon Help, accessed 2026-09-26. Always-in-context facts, context-budget tradeoffs and former “Memory” naming. Preserves field-guide source FG-AID-M.

<a id="aid11"></a>**AID11 — [What are Story Cards?](https://help.aidungeon.com/faq/story-cards).** AI Dungeon Help, accessed 2026-09-26. Triggered lore retrieval and creator-defined card types.

<a id="aid12"></a>**AID12 — [What is the Memory System?](https://help.aidungeon.com/faq/the-memory-system).** AI Dungeon Help, accessed 2026-09-26. Auto Summarization and Memory Bank mechanics.

<a id="aid13"></a>**AID13 — [What goes into the Context sent to the AI?](https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai).** AI Dungeon Help, accessed 2026-09-26. Required/dynamic context composition and overflow behavior.

<a id="aid14"></a>**AID14 — [Memberships & Benefits](https://help.aidungeon.com/memberships-benefits).** AI Dungeon Help, accessed 2026-09-26. Current standard tiers, monthly price snapshot, Credits, Memory Bank counts and baseline context entitlements.

<a id="aid15"></a>**AID15 — [AI Models and their Differences](https://help.aidungeon.com/ai-model-differences).** AI Dungeon Help, accessed 2026-09-26. Current volatile model roster, specialties, provider/fine-tune notes, context and deprecated-model boundaries.

<a id="aid16"></a>**AID16 — [What are AI Model Settings?](https://help.aidungeon.com/faq/what-are-advanced-settings).** AI Dungeon Help, accessed 2026-09-26. Context/response length and sampling controls.

<a id="aid17"></a>**AID17 — [Do you support Multiplayer?](https://help.aidungeon.com/faq/do-you-support-multiplayer).** AI Dungeon Help, accessed 2026-09-26. Join codes, host authority, Third Person and premium-benefit sharing.

<a id="aid18"></a>**AID18 — [AI Dungeon review](https://gamefaqs.gamespot.com/unixlinux/369376-ai-dungeon/reviews/171835).** Rin-Coconut, GameFAQs, 2021-03-08. Historical player review with detailed solo and multiplayer examples; one player's account, not current-product telemetry.

<a id="aid19"></a>**AID19 — [Private, Unlisted, and Published Content](https://help.aidungeon.com/faq/visibility).** AI Dungeon Help, accessed 2026-09-26. Public-rating and draft/publish boundary.

<a id="aid20"></a>**AID20 — [How can players spend Scales?](https://help.aidungeon.com/faq/how-can-players-spend-scales).** AI Dungeon Help, accessed 2026-09-26. Current soft-currency earning/tipping/speed-boost uses.

<a id="aid21"></a>**AID21 — [What are the AI Safety Settings?](https://help.aidungeon.com/faq/what-are-the-ai-safety-settings).** AI Dungeon Help, accessed 2026-09-26. Safe/Moderate/Mature current generation settings.

<a id="aid22"></a>**AID22 — [How does content moderation work?](https://help.aidungeon.com/faq/how-does-content-moderation-work).** AI Dungeon Help, accessed 2026-09-26. Current private/public moderation boundary and targeted model restrictions.

<a id="aid23"></a>**AID23 — [What is “Improve the AI”?](https://help.aidungeon.com/faq/what-is-improve-the-ai-mode).** AI Dungeon Help, accessed 2026-09-26. Opt-in evaluation/data logging and comparison feedback.


<a id="aid24"></a>**AID24 — [How we scaled AI Dungeon 2 to support over 1,000,000 users](https://aidungeon.medium.com/how-we-scaled-ai-dungeon-2-to-support-over-1-000-000-users-d207d5623de9).** Latitude Team, 2020-02-11. Primary retrospective on 2019 hackathon/GPT-2 launch, viral infrastructure pressure and early scale. The page body timed out during this pass; claims used here are limited to indexed excerpts and corroborated contemporaneous reporting rather than represented as a newly read full body.

<a id="aid25"></a>**AID25 — [AI Dungeon: Dragon Model Upgrade](https://aidungeon.medium.com/ai-dungeon-dragon-model-upgrade-7e8ea579abfe).** Latitude Team, 2020-07-14. Primary GPT-3 Dragon launch, A/B testing/fine-tuning, existing multiplayer/quest/memory features and explicit statement that the product still fell short of the larger living-world vision.

<a id="aid26"></a>**AID26 — [AI Dungeon-maker Latitude raises $3.3M](https://techcrunch.com/2021/02/04/latitude-seed-funding/).** Anthony Ha, TechCrunch, 2021-02-04. Seed amount, then-company-reported 1.5M MAU, hackathon origin and creator ambitions; financial/user metrics are dated.

<a id="aid27"></a>**AID27 — [OpenAI and Filters](https://help.aidungeon.com/faq/openai-and-filters).** Latitude, current retrospective accessed 2026-09-26. Primary account of the 2021 filter/privacy failures, erroneous bans/manual moderation, unsafe training data and provider diversification. It is the company's retrospective, not independent adjudication.

<a id="aid28"></a>**AID28 — [What happened to Steam and the Traveler tier?](https://help.aidungeon.com/faq/what-happened-to-the-travelers-tier).** AI Dungeon Help, accessed 2026-09-26. Primary pricing/package timeline: July 2022 $30 launch, later free-to-play/Traveler changes, September 2023 sales stop and early-2024 Steam retirement.

<a id="aid29"></a>**AID29 — [Latitude press / fact sheet](https://latitude.io/press).** Latitude, published 2026 and accessed 2026-09-26. Company-reported cumulative/activity metrics and company history; not an independent audit. Also used only to distinguish separate Voyage/World Engine work from AI Dungeon.

<a id="aid30"></a>**AID30 — [How do I test Beta features?](https://help.aidungeon.com/faq/how-to-enable-beta-features).** AI Dungeon Help, accessed 2026-09-26. Current Internal → Alpha → Beta → Production experimentation lifecycle.

<a id="aid31"></a>**AID31 — [The machines are whispering: We tested AI Dungeon 2 and cannot stop laughing](https://arstechnica.com/gaming/2020/01/we-test-ai-dungeon-2-a-text-adventure-that-creates-itself-with-your-help/).** Ars Technica staff, 2020-01-20. Multi-author launch-era hands-on criticism: improvisational delight, inventory/context failures, loops, network issues and divergent desire to return.

<a id="aid32"></a>**AID32 — [App of the week: AI Dungeon review](https://www.stuff.tv/review/app-of-the-week-ai-dungeon-review/).** Craig Grannell, Stuff, 2020-01-12. Formal GPT-2-era review: customizability and fascinating endless storytelling versus latency, incoherence and abrupt scene shifts.

<a id="aid33"></a>**AID33 — [Creating the ever-improvising text adventures of AI Dungeon 2](https://www.gamedeveloper.com/design/creating-the-ever-improvising-text-adventures-of-i-ai-dungeon-2-i-).** John Harris / Nick Walton, Game Developer, 2020-01. Contemporary developer interview on GPT-2 mechanics, server-cost pressure, premium sustainability plans and then-planned multiplayer/voice work.

<a id="aid34"></a>**AID34 — [In AI Dungeon 2, You Can Do Anything—Even Start A Rock Band Made Of Skeletons](https://kotaku.com/in-ai-dungeon-2-you-can-do-anything-even-start-a-rock-1840276553).** Nathan Grayson, Kotaku, 2019-12-06. Detailed launch-period hands-on account: surprising contextual improvisation and shareable emergent story alongside catastrophic confusion/restarts.

<a id="aid35"></a>**AID35 — [AI Dungeon review](https://www.148apps.com/ai-dungeon/ai-dungeon-review/).** Campbell Bird, 148Apps, 2019-12-30. Formal mobile review: co-authoring creativity versus weak memory, derailment and loops.

<a id="aid36"></a>**AID36 — [AI Dungeon — freeform narrative adventures](https://www.tapsmart.com/?p=27282).** Jon Mundy, TapSmart, 2020-02-28. Formal mobile review: input freedom/custom scenarios versus vagueness, non sequiturs and lack of long-range resolution.

<a id="aid37"></a>**AID37 — [In AI Dungeon 2 the game is created as you play](https://www.gamingonlinux.com/2019/12/in-ai-dungeon-2-the-game-is-created-as-you-play-and-it-can-be-both-impressive-and-ridiculous/).** Liam Squires-Hand, GamingOnLinux, 2019-12-09. Launch-period hands-on and infrastructure observations; historical model state only.

<a id="aid38"></a>**AID38 — [This AI writes a text adventure while you play it](https://www.pcgamer.com/this-ai-writes-a-text-adventure-while-you-play-it/).** Jody Macgregor, PC Gamer, 2019-12-08. Launch-period impression of unusually broad plain-English input and surprising continuations.

<a id="aid39"></a>**AID39 — [AI Dungeon — most helpful positive Steam reviews](https://steamcommunity.com/app/1519310/positivereviews/?browsefilter=toprated).** Steam Community, accessed 2026-09-26. Historical/self-selected player testimony for the retired Steam edition; many top positives are brief/joke reviews, so treated cautiously.

<a id="aid40"></a>**AID40 — [AI Dungeon — most helpful negative Steam reviews](https://steamcommunity.com/app/1519310/negativereviews/?browsefilter=toprated).** Steam Community, accessed 2026-09-26. Historical 2022 Traveler-era complaints around pricing/package expectations, privacy history, continuity, loops and unwanted actions; not a current-model prevalence estimate.

<a id="aid41"></a>**AID41 — [“AI Dungeon sucks now” discussion](https://www.reddit.com/r/AIDungeon/comments/1upbe4v/ai_dungeon_sucks_now/).** r/AIDungeon, 2026-07-06. Preserved field-guide source FG-AID-P revisited: current player disagreement around ignored prompts, repetition, retries and abrupt scene changes.

<a id="aid42"></a>**AID42 — [Has AI Dungeon changed much since February/March?](https://www.reddit.com/r/AIDungeon/comments/1vfcyem/has_ai_dungeon_changed_much_since_februarymarch/).** r/AIDungeon, 2026-08-04. Returning-user account of bugs/repetition/omniscient-character and long-chat concerns; one person's experience.

<a id="aid43"></a>**AID43 — [How to get rid of repetitive responses](https://www.reddit.com/r/AIDungeon/comments/1w4kmsx/how_to_get_rid_of_repetitive_responses_that_ruin/).** r/AIDungeon, 2026-09-01. Current player/support discussion showing repetition and model-specific instruction tuning; qualitative and self-selected.

<a id="aid44"></a>**AID44 — [Doubled DeepSeek context and the new models have renewed my interest](https://www.reddit.com/r/AIDungeon/comments/1q21e54/doubled_deepseek_context_and_the_new_models_have/).** r/AIDungeon, 2026-01-02. Positive current player account crediting newer models/context with stronger worldbuilding/recall while noting remaining hiccups; individual testimony.

<a id="aid45"></a>**AID45 — [You told us what you HATE about AI writing!](https://www.reddit.com/r/AIDungeon/comments/1qxu8rq/you_told_us_what_you_hate_about_ai_writing/).** Latitude/r/AIDungeon, 2026-02-06. Company-posted summary of a voluntary 4,345-response survey; repetition was reported as a cross-cutting frustration. Not a representative population survey.

<a id="aid46"></a>**AID46 — [AI Dungeon App Store ratings & reviews](https://apps.apple.com/us/app/ai-dungeon-rpg-story-maker/id1491268416?see-all=reviews).** Apple App Store, accessed 2026-09-26. Historical direct player accounts praising open-ended variation while describing setting/identity/name drift and memory failures; self-selected review evidence.

<a id="aid47"></a>**AID47 — [AI Dungeon — Christoph Bartneck](https://www.bartneck.de/2022/06/26/ai-dungeon/).** Christoph Bartneck, 2022-06-26. Preserved independent reflection FG-AID-C: creative promise alongside inconsistent common-sense continuation; historical model/product state.

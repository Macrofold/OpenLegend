# AI Dungeon — full research dossier

**G40 · Complete research pass, September 26, 2026; targeted audit corrections applied September 26.** This dossier covers AI Dungeon from the 2019 GPT-2 prototypes through the current 2026 product, with model/provider/version boundaries kept explicit. Historical GPT-2/GPT-3 reviews are not treated as measurements of current model quality; the retired 2022–2024 Steam/Traveler edition is separated from today's web/mobile service. The prior chapter and source notebook remain preserved owners for the earlier field-guide material. The audit correction rechecked the official model/context and scripting documentation; it is not a new model benchmark or a fresh reading of every inherited source. Proposed OpenLegend adaptations remain research interpretations, not accepted implementation requirements.

[Preserved overview](../games/ai-dungeon.md) · [Detailed language/context study](../mechanics/scribblenauts-ai-dungeon-language-intent-and-consequence.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [Library](../README.md)

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

Optimized Context is also a **compatibility choice**, not simply a larger token allowance. Its scripting tradeoff is explained beside the scripting capabilities in §12; the model, tier and context-processing mode must be considered together. [AID15](#aid15)

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

### Optimized Context and script compatibility

Latitude's model documentation explicitly warns that **Optimized Context disables certain scripting features**. Several models present different context allowances with the setting on or off; DeepSeek V4 Flash instead has its own caching/allowance explanation. Therefore neither a membership's headline context number nor the presence of a Context hook establishes that every script works with every model configuration. The inspected official pages do not enumerate every affected function, so this dossier does not invent a universal disabled-hook matrix. [AID15](#aid15)

The scripting guide separately documents input, context and output hooks, per-Adventure state and a creator test/inspection interface. **Constructed compatibility situation:** a creator wants a script to place a changing ritual condition into model context, then chooses a cache-optimized model. They must check that configuration's supported script behavior and inspect what reaches generation before assuming a longer context preserves the ritual rule. The next choice is a compatible setting or revised script, not simply buying more tokens. This is a documentation-derived compatibility concern, not a claimed live test or proof that all scripting stops working. [AID06](#aid06)

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

The 2021 privacy/filter crisis is covered in §20, with Latitude's retrospective separately attributed. Read that history alongside these dated current-policy statements; neither describes the other period's behavior automatically. [AID27](#aid27)

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

**Compatibility limit:** the script must use features supported by the chosen model/context configuration; §12 explains why Optimized Context cannot be assumed independent of scripting. [AID15](#aid15)

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
| R02 player actions / major mechanics | §§2–16, 19; context/script compatibility in §12 |
| R03 items / entities / composition | §§4–8, 12, 17, 19 |
| R04 progression / economy / time / failure | §§3–5, 8–10, 15, 17, 22 |
| R05 concrete interactions | §19 + preserved field-guide examples; compatibility case in §12 |
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

**Preservation check:** [the prior AI Dungeon chapter](../games/ai-dungeon.md) remains intact and retains the earlier field-guide findings, Vinny viewing recommendation, 2022 Christoph Bartneck reflection, July 2026 player discussion and original AI1/AI2 source annotations. This dossier links rather than replaces it. The [language/context study](../mechanics/scribblenauts-ai-dungeon-language-intent-and-consequence.md) retains its more granular Story Card timing and memory distinctions. The [library README](../README.md), roster and progress ledger provide the G40–G60 dossier routes. Packet-wide reconciliation remains separate unfinished work in the progress ledger; it is not an undefined “P04” gate or a reason to call completed range navigation unfinished.

**Audit resolution:** G40's identified R02/R14 corrections are applied: the compatibility warning and worked consequence are in §12, §16 points to the already-written 2021 history, and the obsolete navigation/checkpoint language is replaced above. Other games' audit findings and the packet-wide reconciliation remain open. Existing review, pricing, provider and player-testimony claims retain their original evidence dates; the targeted correction does not recertify every inherited external fact.

**Viewing boundary:** the preserved Vinesauce video remains metadata/viewing-route evidence only; this pass did not claim to have watched footage or inspected a transcript.

## Sources

<a id="aid01"></a>**AID01 — [Getting Started](https://help.aidungeon.com/getting-started).** AI Dungeon Help, accessed 2026-09-26. Current web/mobile/cloud/free-play positioning and core flow.

<a id="aid02"></a>**AID02 — [AI Dungeon SteamDB record](https://steamdb.info/app/1519310/info/).** SteamDB, accessed 2026-09-26. Historical Steam release metadata and retired-store boundary; secondary metadata, not the current distribution owner.

<a id="aid03"></a>**AID03 — [AI Dungeon](https://aidungeon.com/).** Latitude, accessed 2026-09-26. Current product route/positioning. Preserves earlier overview source AI1.

<a id="aid04"></a>**AID04 — [How to Play AI Dungeon](https://help.aidungeon.com/faq/how-to-play).** AI Dungeon Help, accessed 2026-09-26. Do/Say/Story/See/Continue, Edit/Retry/Erase/Undo/Redo and current settings UI.

<a id="aid05"></a>**AID05 — [Latitude brings AI-generated artwork to AI Dungeon](https://techcrunch.com/2022/09/15/latitude-brings-ai-generated-artwork-to-ai-dungeon/).** Kyle Wiggers, TechCrunch, 2022-09-15. Historical See/Stable Diffusion launch and hands-on image-generation limitations.

<a id="aid06"></a>**AID06 — [How do I use Scripting in AI Dungeon?](https://help.aidungeon.com/faq/how-do-i-write-scripts-and-use-scripting), with the [detailed Scripting guide](https://help.aidungeon.com/scripting).** AI Dungeon Help, accessed 2026-09-26. Scenario script ownership, hooks, state and test surface. The detailed guide's relevant hook/state/inspection sections were reopened for the audit correction; no script was executed and the generic API guide is not a complete model-specific compatibility table.

<a id="aid07"></a>**AID07 — [What are Scenarios?](https://help.aidungeon.com/faq/what-are-scenarios).** AI Dungeon Help, accessed 2026-09-26. Scenario/Adventure template boundary, publishing and inherited plot components.

<a id="aid08"></a>**AID08 — [What is AI Instructions?](https://help.aidungeon.com/faq/ai-instructions).** AI Dungeon Help, accessed 2026-09-26. Player-authored generation-policy surface.

<a id="aid09"></a>**AID09 — [What are Plot Components?](https://help.aidungeon.com/faq/plot-components).** AI Dungeon Help, accessed 2026-09-26. AI Instructions, Story Summary, Plot Essentials, Author's Note and Third Person comparison.

<a id="aid10"></a>**AID10 — [What is Plot Essentials?](https://help.aidungeon.com/faq/plot-essentials).** AI Dungeon Help, accessed 2026-09-26. Always-in-context facts, context-budget tradeoffs and former “Memory” naming. Preserves field-guide source FG-AID-M.

<a id="aid11"></a>**AID11 — [What are Story Cards?](https://help.aidungeon.com/faq/story-cards).** AI Dungeon Help, accessed 2026-09-26. Triggered lore retrieval and creator-defined card types.

<a id="aid12"></a>**AID12 — [What is the Memory System?](https://help.aidungeon.com/faq/the-memory-system).** AI Dungeon Help, accessed 2026-09-26. Auto Summarization and Memory Bank mechanics.

<a id="aid13"></a>**AID13 — [What goes into the Context sent to the AI?](https://help.aidungeon.com/faq/what-goes-into-the-context-sent-to-the-ai).** AI Dungeon Help, accessed 2026-09-26. Required/dynamic context composition and overflow behavior.

<a id="aid14"></a>**AID14 — [Memberships & Benefits](https://help.aidungeon.com/memberships-benefits).** AI Dungeon Help, accessed 2026-09-26. Current standard tiers, monthly price snapshot, Credits, Memory Bank counts and baseline context entitlements.

<a id="aid15"></a>**AID15 — [AI Models and their Differences](https://help.aidungeon.com/ai-model-differences).** AI Dungeon Help, accessed 2026-09-26. Current volatile model roster, specialties, provider/fine-tune notes, context and deprecated-model boundaries. Reopened for the audit correction: model-specific Optimized Context warnings explicitly restrict some scripting features. The allowance/compatibility differences are documented configuration, not independently measured model quality; no unsupported list of disabled functions is inferred.

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

## Parallel library study — preserved evidence and examples

The following independent study is retained from `docs/game-inspiration-library` at `94aca8cc`. Its source register and retrieval limits belong to that pass: its unsuccessful Steam sampling does not retract the other study’s retrieved historical reviews. Both studies preserve their named examples, dates and evidence qualifications.

## AI Dungeon — co-authoring a story is not the same as governing a world

**G40 · Full research pass · September 26, 2026.** Current web/mobile documentation, historical AI Dungeon 2 criticism, the retired Steam release and the separate Voyage product remain distinct. R01–R14 coverage and evidence limits are mapped below. No gameplay session, script execution or video playback was conducted.

[Earlier chapter](../games/ai-dungeon.md) · [Preserved shared study](../mechanics/scribblenauts-ai-dungeon-language-intent-and-consequence.md) · [Progress](../research-progress.md) · [Roster](../research-roster.md)

The complete earlier chapter and shared mechanics study were read and remain unchanged. This pass preserves their Do/Say/Story examples, context-entry timing, July 2026 shopping-scene complaint, earlier App Store accounts and historical Vinny viewing route. New documentation qualifies older claims without silently rewriting their source context. All Scribblenauts material in the shared owner is untouched.

## 1. Identity, versions and the player promise

AI Dungeon is Latitude's text-first roleplaying and collaborative-storytelling product. A player selects or creates a premise, contributes an action or narrative passage, reads a generated continuation, and either builds on it or changes it. The important freedom is to pursue ideas outside a fixed authored command tree; the important qualification is that a convincing continuation is not proof of an independently resolved game rule. The official controls explicitly support both acting and rewriting. [P2]

There is no single campaign that defines all adventures. A fantasy expedition, science-fiction mystery, romance and mundane conversation can share the interface while setting very different expectations. **Interpretation:** one player wants an unexpected writing partner; another wants a referee who remembers commitments and resists impossible actions. The same permissive response can delight the first and disappoint the second. This is a difference in the promised activity, not merely a difference in prose quality.

| Studied scope | Boundary |
| --- | --- |
| **2019 prototype and AI Dungeon 2** | Historical early-generation design, distribution and criticism. The early choice-list prototype and subsequent free-form input are not the current model selector. [D1] [D2] |
| **Current web/mobile AI Dungeon** | Adventures, reusable Scenarios, authoring controls, contextual memory, model choices, image generation, scripting and native shared play are documented below. Official descriptions establish intended capabilities, not a reproduced quality benchmark. |
| **Steam release** | Latitude says the app was retired in early 2024. That distribution retirement does not mean AI Dungeon as a whole closed. Old Steam pricing/reviews remain historical evidence. [P1] |
| **Voyage** | The official memory explanation explicitly contrasts Voyage's tracked health, inventory, quests and levels with AI Dungeon's storytelling emphasis. Do not import those systems into this dossier's base-game inventory. [P4] |
| **Creator scripts** | Optional scenario scripts can maintain structured state. Consequently, neither “all AI Dungeon has enforced RPG rules” nor “AI Dungeon can never maintain state” is accurate. A particular script needs its own inspection and tests. [P7] |

The live model guide also distinguishes named models from **Dynamic Small**, a routing option whose selected underlying model may vary. Its descriptions position **Muse** toward emotionally detailed character interaction and **Wayfarer Small 2** toward conflict and consequences. These are developer-stated tendencies, not proof of comparative quality or a mechanically enforced difficulty mode. Settings available on one model may not exist on another. [P13]

## 2. What the player actually does

### The action and authorship loop

**Do** frames an attempted character action; **Say** frames dialogue; **Story** directly contributes narration. **Continue** asks for more output without another explicit action. **Edit** changes prior text; **Retry** supplies alternate continuations in a selectable stack; **Erase**, **Undo** and **Redo** change the retained sequence. Undo history is session-limited: refreshing is not equivalent to preserving an unlimited undo stack. See mode is an additional image workflow, covered separately. [P2]

**Interpretation:** this is a loop of proposal, continuation and selection. The participant may alternate between protagonist, editor and scenario author. That is a legitimate form of play, but the interface should not imply that those roles carry identical authority. Selecting a better paragraph is different from successfully persuading a resistant character under stable rules.

### Whole-game mechanics inventory

The table identifies the researched base experience. “Narrative” does not mean unimportant; it means that a concept is represented in the fiction rather than established here as a universal native subsystem. Optional scripts can change these boundaries.

| Category | Actual activity and useful limitation |
| --- | --- |
| **Identity, classes and origins** | Choose a premise and character details. Character Creator scenarios can offer classes, races, starting locations and factions through their authored options. These choices initialize fiction; they are not evidence of one global balanced class roster. [P6] |
| **Attributes, skills, perks and leveling** | Describe competence and desired growth in the premise or contextual components. AI Dungeon's base storytelling memory is not the separate tracked-level system documented for Voyage. Creator-maintained rules must be attributed to that scenario, not the platform generally. [P4] [P12] |
| **Items, inventory, weapons and armor** | Carry, describe, request, give or lose things through narrative actions. An author can preserve an important possession in Plot Essentials; that is different from proving an enforced equipment slot, weight limit or damage calculation. [P10] |
| **Crafting, upgrades, magic and powers** | Propose making or transforming something, then respond to the continuation. The story can contain ingredients, spells and restrictions. Whether they constrain future actions depends on the actual scenario and implementation; section 7 contrasts a transformation failure with a creator's resource quest. |
| **Traversal, maps and environment** | Describe travel, investigation, opening a door, changing location or passing time. Places are authored/generated story context, not a universally documented coordinate map, collision system or simulated geography. The repair tools remain available when continuity fails. [P9] |
| **Combat, stealth and looting** | Attempt an attack, concealment or search through the same narrative interface. No universal initiative order, loot table, health arithmetic or detection formula was established for ordinary unscripted Adventures. The presence of a sword or guard in prose does not establish one. |
| **Quests, events and activities** | Pursue a scenario's goal, invent another, investigate a surprise, or treat dialogue itself as the activity. A puzzle, meal, performance or battle can become a scene without a dedicated platform-wide minigame. [P8] [P9] |
| **Relationships, romance and companions** | Supply personalities, history and relationships, then converse or act around them. Recurring companions and factions can be contextual entries; this is not proof of independently scheduled agents or universally tracked affinity meters. [P3] [P10] |
| **Trade, settlements and management** | A story can contain shops, currencies, buildings and institutions. Do not confuse fictional prices with paid account Credits or infer a persistent market simulation from a described transaction. Scripted management scenarios need separate qualification. |
| **Failure, death and recovery** | A story may narrate defeat or death, but the authoring interface permits revising its continuation. Service errors, forgotten context and unwanted narration are technical/interaction failures, not automatically fictional punishment. [P2] [P9] |
| **Multiplayer** | People contribute to a shared Adventure under the host's model/settings arrangement. This is documented native collaborative storytelling, not evidence of a competitive MMO economy or tamper-proof combat resolution. [P5] |
| **Return play and creation** | Resume an Adventure, start another from a reusable Scenario, refine contextual materials, share a premise, or improve a script. The durable creative artifacts differ from a character's fictional loot. [P8] [P7] |

The unsupported-subsystem distinctions above are an analytical reading of the documented interaction contract, not a claim to have audited every community scenario. An implementation might enforce a rule; a persuasive statement that it does so is not enough to establish how it works.

## 3. Scenarios, Adventures and reusable creations

A **Scenario** is a reusable starting configuration; an **Adventure** is an individual playthrough. Scenario creation includes the opening and supporting components, while title, description and tags help people find and understand the premise. For ordinary story scenarios, a public-facing description is not itself the text sent to the model. Character Creator has its own documented description/entry behavior. Publishing and later editing a draft are also distinct operations. [P8] [P6]

Character Creator, formerly associated with Worlds, lets an author provide structured starting choices and generate a new opening. The official guide's examples include WanderingStar's **Faerûn**, OnyxFlame's **Fiomar** and AI Dungeon's **Kedar**. Their inclusion is a navigation example, not a claim that every world was played here or a proposal to copy their names/assets. Quickstart can produce combinations requiring author attention; a menu choice does not independently validate all fictional compatibility rules. [P6]

An Adventure accumulates the actual exchange and can be continued or edited. It is therefore useful to distinguish four artifacts: the reusable premise, a particular story history, supporting world/character notes, and any script state. **Interpretation:** restoring one without the others can change the experience. A downloaded transcript is valuable preservation, but not automatically a portable running game with identical models and behavior. [P9] [P7]

### Context tools are different jobs, not interchangeable storage boxes

| Tool | Documented role and limitation |
| --- | --- |
| **AI Instructions** | Directions about how to produce the response, placed early in the supplied context. They influence narration; they are not a native action validator. [P12] |
| **Plot Essentials** | Recurring facts relevant across turns, such as identity, companions and an ongoing goal. Concise facts preserve room for story; wording an old event as present can encourage its reappearance. [P10] |
| **Author's Note** | Brief guidance on genre, tone and writing style, placed near the end of context. It is not the best place to dump an entire setting encyclopedia. [P11] |
| **Story Cards** | Triggered entries about people, places or concepts. Entry is the story-context field; Name and Notes are not normally sent as lore. A keyword first generated in an output can only supply its card to a subsequent generation. [P3] |
| **Story Summary** | A compressed account of earlier events, with manual and automatic workflows. Editing earlier story text does not automatically rebuild all summary history. [P4] |
| **Memory Bank** | Automatically stores summarized events and retrieves relevant memories, using similarity and limited context. Storage and retrieval are separate from whether the model uses the information correctly. [P4] |
| **Context inspection** | Shows what was actually supplied and warns when components do not fit. It helps distinguish a missing fact from a fact that was supplied but not followed. [P18] |

Cards can be edited, imported and exported, with browser-specific management boundaries. Literal trigger behavior and limited context matter: a large saved library does not mean every entry participates in every continuation. [P3] **Interpretation:** a reliable creator workflow needs to distinguish saved information, selected information, presented information and behavior. More prose in a database solves only the first problem.

### Optional scripting

The documented script lifecycle provides **Library, Input, Context and Output** roles. A persistent `state` object is available across turns of an Adventure, and scripts can interact with story-card data. Scenario scripts are shared with their resulting Adventures while each Adventure maintains its own state. The inspected API documentation also describes execution limits; this is not an unrestricted general-purpose hosted server. [P7]

**Interpretation:** a script can make progression more explicit, but correct world rules still depend on its design. Updating a “machine repaired” flag after recognizing a phrase does not establish that inventory acquisition, consumption, retries and concurrent player actions were all validated. This pass does not execute or certify any community script, and does not assume that the platform provides transactional world semantics around it.

## 4. Progression, time, scarcity and failure

**First session:** choose a premise, establish who is acting, and discover the difference between contributing an action and authoring an outcome. **Established play:** sustain characters and goals, decide which surprises to accept, and maintain relevant context. **Long-running play:** return to an unresolved plot, refine a reusable scenario, explore alternate directions or share the creative setup. These are an analytical description of the documented Scenario/Adventure loop, not a fixed sequence of campaign unlocks. [P8] [P9]

The player's increasing skill is partly expressive and editorial: giving enough direction without overconstraining the response, recognizing continuity failures, and selecting the right context tool. The lasting reward may be a memorable scene or a useful scenario rather than a higher stat. **Counterpoint:** an audience seeking earned mastery can reasonably find unlimited editorial repair unsatisfying. A writing tool does not become a better writing tool merely by making correction punitive.

Fictional death, a failed objective, a discarded paragraph, loss of an account artifact and a generation error are different failure modes. Their recovery rules should not be collapsed into “permadeath.” For example, fixing historical text can leave its summary inconsistent; section 7 gives a documented-workflow illustration. [P4]

Model settings affect pacing and variability. Response length changes how much the player reads before acting again; context length limits the supplied material. Temperature, sampling controls and repetition penalties change generation behavior, with model-dependent availability. They are not difficulty sliders with a guaranteed relationship to challenge, and increasing context is not proof of better dramatic pacing. [P14]

### Fictional resources versus paid resources

**Credits** support paid service consumption, including image generation and extended context on applicable models. Subscription bundles and optional additional purchases are documented. Extended-context costs can recur on turns and retries; a rejected paragraph need not mean no compute was consumed. The exact applicable model/tier price must be checked in the live selector rather than reconstructed from an old example. [P16]

**Scales** are a separate reward/tipping resource. The inspected guide describes daily rewards, creator tips and free-model speed boosts. It does not establish a cash-out income stream for creators. Its “up to” speed claim is a developer offer, not a measured latency result here. [P17]

**Interpretation:** these currencies should not be mistaken for a character's gold, mana or crafting materials. Charging for a retry also creates a design tension: a creative alternate take and a repair of clearly unwanted output can feel like different kinds of consumption even when both require generation. That is a product question, not evidence of a particular retention or profitability outcome.

## 5. Characters, social play and narrative meaning

A character can feel distinctive through remembered relationships, characteristic language and repeated situations, without having an autonomous daily schedule. Story Cards and Plot Essentials supply tools for that continuity; they do not demonstrate an independent mind with knowledge isolated from the narrator. **Interpretation:** a betrayal matters because earlier exchanges made a promise meaningful. If a later paragraph casually changes the relationship, the emotional cost can exceed the cost of forgetting a minor object. [P3] [P10]

There is no mandatory spoiler-bearing main plot. The named characters in section 7 belong to attributed generated playthroughs rather than shared canonical quest lines. The same applies to a user-created romance, party, faction or settlement. Their significance comes from the particular evolving story; they are not automatically platform-wide reputation mechanics.

In native multiplayer, the host shares an **eight-digit join code** and controls the relevant model/premium arrangement; other players do not all need the same paid membership. Character names support third-person actions. A kick and a block have different re-entry behavior. Returning to Home can retain participation, whereas leaving the Adventure requires joining again. The documentation's four-player indicator is not stated as a hard capacity limit. [P5]

**Interpretation:** the group's coordination problem includes agreeing on tone, ownership of characters and when correction is appropriate. Shared access to a narrator is not the same as private information channels, adversarial fairness or persistent off-screen actors. Those features would need separate evidence. A collaborative group may prefer easy repair rather than the restrictions appropriate to a competitive game.

Public creative participation also has a different unit of contribution: a starting scenario can be replayed by strangers, while an Adventure shares what happened to particular participants. Cover images and descriptions help set expectations. The current interface distinguishes Private, Unlisted and Published visibility; a visibility control is not itself proof that the service never processes the underlying text. [P18]

## 6. Presentation, interface, accessibility and trust

Text carries the setting, action and much of the emotional feedback. **Interpretation:** the central readability question is not a creature's combat silhouette but who acted, who spoke, what changed and which passage is being revised. Too much automatic continuation can take the decision away from the player just as surely as too little can leave them with a blank page.

Current appearance documentation includes dynamic backgrounds informed by story imagery, styled themes such as **Orcish, Atlantis and Cyber**, high contrast, selectable text styles and larger text. Text animation can be disabled; sticky input and compact controls trade discoverability against screen space. Those documented options qualify historical complaints about slowly appearing text, without proving that every historical issue is resolved on every device. [P18]

**See mode** adds generated images to an Adventure. A supplied prompt directs the image; a blank prompt can draw on recent actions and contextual material. The image can be shared, revised or retried, with applicable costs and deletion limits. The guide's style and composition advice is an authoring vocabulary, not evidence of a fixed art direction or frame-by-frame world renderer. [P15]

**Interpretation:** an evocative portrait or place image can help a story feel concrete, while a contradictory image can undermine continuity. A generated illustration should not silently become stronger evidence of world state than the story it accompanies. This is an inspiration risk to examine, not a tested defect of the current image models.

Audio research did not establish a current native narration/voice feature or a documented authored soundtrack. Voice was discussed as a future direction in the January 2020 developer interview; that is not delivery evidence. No audio or video was played in this pass. The text-first experience therefore receives the substantive presentation treatment above rather than an invented music-production account. [D1]

The current US App Store page lists English and does not declare supported accessibility features in its accessibility section. That omission is not proof that screen readers fail. No assistive-technology test was conducted, and model language ability is distinct from interface localization. Device-specific player reports below are not universal accessibility findings. [U2]

### Governance and privacy are part of the experience

Alex Mitchell's January 2022 critical account discusses the April 2021 filtering controversy and the gap between an unrestricted creative promise and users encountering unexpected restrictions. It attributes complaints about false positives and cites Latitude's acknowledgment of inadequate advance communication. This is historical reception evidence, not a finding that the current filter behaves identically. The linked original company post now returned no readable body. [R8]

The privacy page retrieved in this pass displays **September 25, 2023** as its revision date and describes account/usage collection, provider sharing and public user-generated content. It is not a blanket promise that private stories never leave the service. Because policy surfaces and product settings can differ over time, this dossier makes no comprehensive legal/privacy-compliance claim and does not adopt a competitor review's broader assurances. [P19]

**Interpretation:** visibility, moderation, model refusals, experimental data use and narrative constraints should be explained separately. A player should be able to tell whether a story choice failed inside the fiction, a model declined it, or a product rule intervened. This is especially important when the interface also invites deeply personal authorship.

## 7. Eight concrete situations

These span story improvisation, continuity, context maintenance, creator rules and group participation. Actual play belongs to the named sources. Constructed examples illustrate documented workflows and are not reproduced tests.

### A. Transform the guard, not the protagonist

**Intention:** Bartneck's character attempts to turn a guard into a chicken. **Condition:** his science-fiction setup includes the android Paco, corporate force Zail and a laser pistol/holoband. **Reported outcome:** the transformation affects the protagonist, while the scene also drifts toward an office and coop. **Next decision:** correct the fiction or accept a substantially different premise. This preserves the original reflection's common-sense complaint without treating its unspecified model/settings as a current benchmark. [R5]

### B. Survive a crash without changing who witnessed it

Grannell describes a helicopter/crash sequence in which the continuation confuses the participant's relationship to the event. **Intention:** act within an unfolding adventure. **Interaction:** the next passage remains locally vivid while changing the implied situation. **Next decision:** repair identity/location or pursue the new branch. **Interpretation:** sentence-level fluency and continuity of the player's role are different qualities. This is a historical reported incident, not reproduced play. [R2]

### C. A detour becomes the story

Lamerichs's zombie-war adventure unexpectedly relocates the protagonist and supplies a marriage to **Bob**; she then develops the family/zombie aftermath through continued contributions and revision. **Intention:** pursue one premise. **Result:** an unplanned development becomes material for another. **Next decision:** curate the surprise rather than reject every deviation. Her essay describes co-creation; it does not establish that each interaction retrained the underlying model. [R3]

### D. Discover responsibility for the ruined place

In Macgregor's December 2019 account, a wizard investigating ruins discovers his own connection to their destruction and confronts a younger version of himself within a short exchange. **Intention:** investigate an evocative setting. **Result:** a personal mystery emerges without a prewritten quest branch documented in the report. **Next decision:** respond to that revelation. The same article notes loops and instability; this successful surprise does not establish reliable long-form plot planning. [R7]

### E. Put the secret in the field the story actually receives

**Constructed workflow:** an author stores a guard's allegiance only in a card's Notes, expecting it to govern a later encounter. Notes are not normal story context, and a trigger first appearing in an output cannot retroactively inform that same output. **Next decision:** place relevant lore in Entry, ensure it can be selected, and inspect what was supplied. That repairs a field/timing mistake without guaranteeing that the model will faithfully use the fact. [P3]

### F. Correct a death without leaving it in the summary

**Constructed workflow:** a player edits an earlier passage so a companion survives. The automatic memory documentation says old edits do not automatically regenerate the full summary. **Potential interaction:** the story history and summary can now disagree. **Next decision:** update the summary as well, then check the continuation. This example illustrates consistency between authoring artifacts; it is not a demonstrated character-resurrection mechanic with validated inventory rollback. [P4]

### G. Three ingredients do not guarantee a satisfying quest

DreamGen's competitor-published test creates a **Ruza Archipelago** repair quest involving **Redstone, Aqua Vitae and Orichalcum** for a broken **Timespace Machine**. Its reported continuation makes the search too straightforward, while a script updates contextual machine status. **Next decision:** redesign the challenge or accept a more permissive writing experience. The article's claim that the script prevents cheating is not adopted as proof of enforced acquisition/consumption; its code was not executed here. [R6]

### H. Invite a friend without duplicating the host's purchase

**Constructed workflow:** a subscribed host starts a shared Adventure and distributes the documented code. A joining friend uses the host's model arrangement and a named third-person character. **Next decision:** agree how the group handles narration and corrections; use the appropriate leave/kick/block behavior when participation changes. This illustrates documented access and continuity, not a tested concurrent combat or secret-information protocol. [P5]

## 8. Production, distribution and commercial context

John Harris's January 9, 2020 interview traces Nick Walton's hackathon experiment, early release and transition to hosted web/mobile access. It identifies collaboration on the mobile and infrastructure work and describes input/output cleanup around the generator. Community help distributing the large model was part of the early access story. Voice, imagery and multiplayer discussed there were still future directions at that moment; current delivery needs the separate documentation cited above. [D1]

Latitude's February 11, 2020 scaling account distinguishes the first choice-list prototype from later free-form input. It reports attention from Hacker News, video playthroughs and shared screenshots, then a move away from repeated large model downloads toward hosted inference. Its discussion of infrastructure and cost optimization is company testimony, not an independent cost audit. [D2]

**Interpretation:** distribution and play quality were coupled. A remarkable story screenshot could attract another player, but the new player still needed an accessible, responsive session. A lower-friction hosted service also brings continuing inference and support obligations; viral interest alone does not establish that those obligations are economically sustainable.

The later product sequence includes the paid Steam release, changed free-access economics, the retirement of that client, and continued work on contextual memory, model selection and creator tools. The present model guide's mixture of named models and dynamic routing makes “AI Dungeon's AI” an insufficient version identifier for a reproducible review. A useful comparison records model, tier, configuration, scenario and date. [P1] [P13]

| Dated evidence | What it establishes—and does not |
| --- | --- |
| **February 11, 2020:** Latitude reports more than one million users and six million unique stories. [D2] | Historical company-reported participation, not current monthly active users, subscribers, unit sales or profit. |
| **July 2022:** Steam launched with a $30 Traveler offer; the current FAQ describes subsequent free unlimited access after cost reductions. [P1] | A historical access/pricing transition, not today's premium model price. |
| **September 2023 / early 2024:** the later $10 Traveler purchase route ended, then the Steam app was retired. [P1] | Discontinued offers/client support, not disappearance of the browser/mobile service. |
| **Current retrieval:** the US mobile listing advertises free play without ads and optional purchases. [U2] | Current positioning; not an independent measurement of every user's entitlement, bill or latency. |
| **Current documentation:** subscriptions, Credits and Scales support different access/consumption/reward functions. [P16] [P17] | A service business model. No creator cash-out, revenue multiple or profit margin is inferred. |

The original company ads-retrospective and December 2022 Unchained announcement were located, but their current pages returned no readable article bodies. This pass does not pretend to have freshly verified their full causal or numerical accounts. Historical energy/advertising descriptions in old criticism should not become current restrictions.

Current revenue, profitability, retention, acquisition spending and subscriber totals were not established. Missing private numbers are not evidence of failure. Sharing a surprising scene, a reusable scenario and a creator's instructions/scripts are plausible distribution units; no measured channel-attribution percentage is claimed. The useful commercial lesson is the documented coupling of access costs, product packaging and continued operation, not an invented financial verdict.

## 9. Written criticism and player feedback

The reception pass reads beyond scores. Five substantial independent-source accounts anchor the discussion: two conventional reviews, a first-person creative-writing critique, the Ars group play report, and Mitchell's academic critical treatment. Bartneck's shorter transcript reflection, Macgregor's early hands-on report and a clearly identified competitor review add distinct evidence. They are not mislabeled as eight scored professional reviews of one current build.

| Author, source and date | Specific praise, criticism and boundary |
| --- | --- |
| **Campbell Bird, 148Apps, December 30, 2019** [R1] | Full mobile review. Enjoys responsive improvisation when the player contributes useful detail; reports repetition, forgetting and persistence/session frustration. The historical inability to save does not override current Adventure documentation. |
| **Craig Grannell, Stuff, January 12, 2020; page also lists October 25, 2021** [R2] | Full review. Enjoys custom premises and surreal surprises, but notes slow responses and abrupt situational changes. The crash example is his report, not a current model test. |
| **Nicolle Lamerichs, January 20, 2020; February 27 also displayed** [R3] | Substantive first-person critical essay. Values collaborative invention and active revision; a generated detour can become useful material. Her explanation of model learning is not used as technical evidence. |
| **Ars staff, January 20, 2020** [R4] | Complete group play report, with Jim Salter, Sam Machkovech, Kate Cox, Peter Opaskar and Lee Hutchinson separately credited. Experiences differ: amusing improvisation can coexist with inventory/identity failures, loops and network interruptions. This is one editorial source, not five publications or evidence of current defect frequency. |
| **Alex Mitchell, electronic book review, January 9, 2022** [R8] | Peer-reviewed criticism of interface/framing and repeated revision. Contrasts AI Dungeon's straightforward authorial control with Project December's deliberately strange framing. This is an interpretation of historical experiences, not a controlled quality trial or evidence that Project December mechanics exist in AI Dungeon. |
| **Christoph Bartneck, June 26, 2022** [R5] | Short reflection with a complete transcript: creative promise confronts failure to maintain the intended actor and situation. Model/configuration detail is insufficient for a broad benchmark. |
| **Jody Macgregor, PC Gamer, December 8, 2019** [R7] | Short firsthand report, not a scored review. His wizard story illustrates surprising narrative potential alongside loops and crashes in that early build. |
| **DreamGen, updated March 14, 2026** [R6] | Substantial hands-on review published by a competitor. Reports engaging **Sol: A Homecoming** play alongside memory/editor friction and an anticlimactic resource quest. Multiplayer was explicitly not tested. Commercial interest remains visible. |

DreamGen dates its testing to February 23–March 8, 2026 and compares Free with a Legend trial. Its introduction says twenty hours, while its methods describe roughly twelve hours plus three scripting hours; no reconciled duration is invented. Privacy/pricing assertions and claims of script enforcement are not accepted as primary technical evidence. [R6]

### Steam: attempted sampling, not fabricated review bodies

Both the helpful-all-time and negative-review routes for app **1519310** returned a content-preference gate instead of review bodies. A negative JSON retrieval also failed. This establishes an access limitation, not zero reviews, universal deletion or the absence of negative opinion. The Steam client's retirement is independently documented above. No helpful Steam positive/negative body is counted as freshly read. [U3] [U4]

### Fresh Reddit and App Store evidence

The original Reddit thread was recovered. One participant reports a shopping scene abruptly becoming a home conversation; another dislikes the narrator imposing emotions, while a respondent does not reproduce all complaints but recognizes repetition. Other replies describe different experiences with retries or changing models. No shared controlled setup or prevalence estimate follows. The prior register dates the thread to July 2026; the newly retrieved page uses relative dates, which do not independently reconfirm every exact day. [U1]

On the US App Store, **UberBolton** describes revising an initially negative assessment upward as experience improved, while reporting search trouble on iPad but not iPhone/web. The displayed review day omits its year. **nickname153717372**, March 31, 2025, enjoys the game but reports invisible text after app switching and frustration with memory retaining trivial details. These are individual reports, not proven current cross-device defects. [U2]

The earlier shared study's **Gummiprince, LamentfulLancer, Sky2400 and KairoCortez** accounts remain preserved there. Their original alternate-language/reviews route failed, and those handles did not appear in the newly accessible US sample; they are therefore earlier captured testimony, not newly reread bodies. The new sample supplements rather than replaces them.

**Reception interpretation:** fluency, continuity, authorial control, meaningful challenge, creator-tool reliability and service access are separate dimensions. A player can praise imaginative output while criticizing memory or an editor; these positions are not contradictory. Learning the tools may improve an experience without excusing lost data or proving that every dissatisfied user misunderstood the product.

## 10. Transferable inspiration and counterpoints

These are **research interpretations, not accepted OpenLegend requirements**.

1. **Make the participant's role clear.** Acting, authoring and correcting are different powers. Co-authoring can be the whole point; a persistent simulation should not silently treat an outcome assertion as a completed world change. The counterpoint is that overrestricting authoring would remove an important creative pleasure.
2. **Make continuity inspectable.** Show the relevant facts and whether they participated in a generation. Saved notes, selected context and applied behavior are separate states. Context inspection should help diagnose a problem without demanding that every player become a prompt engineer.
3. **Preserve surprise without treating inconsistency as surprise.** A personally meaningful revelation can be delightful; accidentally changing the actor or location can destroy the premise. Let players accept a useful detour while supplying appropriate repair tools for accidental contradiction.
4. **Separate fictional progress from service consumption.** A quest ingredient, a reusable scenario, a memory entry and a paid Credit solve different problems. Neither a larger context window nor a longer answer automatically creates challenge or a worthwhile return loop.
5. **Evaluate creator rules at their actual boundary.** Scripting can introduce explicit state, but a status flag or lore update does not certify correct resource accounting. Conversely, the base game's co-authoring contract is not evidence that useful rules are impossible to add.
6. **Treat models and configuration as part of the reviewed experience.** A named product may change through model routing, settings and interface updates. Preserve dates and setups when interpreting both praise and complaints; do not turn a memorable old failure into a timeless verdict.

The earlier chapter's central distinction remains intact: study the pleasure of language and co-authorship without confusing it with shared authoritative simulation. The counterpart also remains intact: a collaboratively authored story does not need to become a simulation to have value.

## 11. Coverage, preservation and reading routes

| Requirement | Substantive coverage |
| --- | --- |
| R01 | Section 1: identity, current/historical clients, model and Voyage/script boundaries. |
| R02 | Section 2: controls and explicit mechanics inventory; sections 3–5 cover their operating conditions. |
| R03 | Section 3: Scenarios, Adventures, contextual artifacts and scripts; section 2 distinguishes fictional equipment. |
| R04 | Section 4: session/long-term play, failure/repair, pacing and distinct service currencies. |
| R05 | Section 7: eight worked situations, with attributed reports versus constructed workflows explicit. |
| R06 | Section 5: characters, relationships, group entry, host resources and continuity limits. |
| R07 | Section 6: text presentation, image generation, themes/input/readability and audio/accessibility evidence boundaries. |
| R08 | Sections 1, 5 and 7: varied premises, named reported stories, player authorship and narrative continuity. |
| R09 | Section 8: origins, collaboration, hosting, iteration, retirement and current memory/model changes. |
| R10 | Sections 3, 5 and 8: discoverable scenarios, sharing units, early attention and distribution history. |
| R11 | Sections 4 and 8: dated participation, price-history boundaries, currencies and unknown private financials. |
| R12 | Section 9: eight distinctly typed written accounts, fresh player bodies, contrasting perspectives and Steam gate. |
| R13 | Section 10 and labeled interpretations throughout: patterns, conditions and counterpoints. |
| R14 | This section and source register: original owners, evidence dates/limits, routes and preservation. |

**Per-game preservation review:** the full original chapter and shared study were compared with this pass. Their language/action, editing, trigger timing, context-budget, model-risk, App Store and viewing material remains in its original owners. The original Reddit complaint was freshly retrieved with disagreement retained; older App Store handles remain earlier evidence. No Scribblenauts material was altered. This does not certify packet-wide P01 or unavailable conversation-only coverage P02.

**Reading/viewing route:** start with the earlier chapter and shared study, then compare the official controls/Scenario documentation with the differently motivated reviews. The existing [Vinesauce/Vinny AI Dungeon 2 #1 recommendation](https://www.youtube.com/watch?v=7M-IVNQS2t0) is a historical 2019 entertainment route with mature language, not evidence of current models, pricing or tools. It remains **unwatched** here; no scene observations or timestamps are invented. Worked reports above reveal events from their specific generated stories, not a canonical campaign ending.

**Review boundary:** checked the complete category map, reference definitions, relative destinations, preserved examples and distinction between sourced facts and interpretation. No runtime code or tests changed. No hidden simulation implementation, current audio delivery, comprehensive accessibility result, private financials or inaccessible Steam bodies are claimed verified. Current help pages sometimes retain older tier terminology; this dossier does not splice them into a fictitious unified price table.

## Source register

Read September 26, 2026. Official help pages are mostly undated live documentation, not independently tested implementation. Review/article dates and scopes appear in section 9. Described play belongs to each author. Reference labels are adjacent to their substantive claims.

### Official product and technical evidence

- **P1:** Traveler FAQ; historical Steam access changes and early-2024 retirement, not a current premium price list.
- **P2:** How to Play; controls, editing and session-boundary guidance.
- **P3:** Story Cards; fields, triggers, timing and management limits. Documentation, not replayed tests.
- **P4:** Memory System; summary/retrieval behavior, editing limitation and explicit Voyage distinction. Relevant mechanism/FAQ sections read.
- **P5:** Multiplayer FAQ; host access, codes, naming and participation controls.
- **P6:** Character Creator/Worlds guide; starting options, authored examples and special field semantics.
- **P7:** Scripting API; relevant overview, lifecycle, state and execution-limit sections read. No script execution or full platform-source audit.
- **P8:** Scenarios guide; reusable setup, publishing and input/context distinction.
- **P9:** Adventures guide; individual story histories and editing workflow.
- **P10:** Plot Essentials; concise recurring context and tense/continuity cautions.
- **P11:** Author's Note; short tone/style guidance and context placement.
- **P12:** Plot Components; roles of instructions, summary and narrative direction.
- **P13:** AI Model Differences; current introductory/Dynamic Small, Muse and Wayfarer sections and model index inspected. Developer positioning, not a benchmark of every listed model.
- **P14:** Model Settings; response/context length and sampling controls. Simplified help explanations are not copied into a new technical theorem.
- **P15:** See Mode; generated-image workflow and prompt-dependent presentation. No images generated for testing.
- **P16:** Credits; subscription/purchase/consumption structure. Numerical help examples are not asserted as current universal tariffs.
- **P17:** Scales; earned rewards, tips and speed-boost uses; no cash-out inference.
- **P18:** System Settings; interface/readability, visibility and inspection controls. No device or assistive-technology test.
- **P19:** Privacy page, displayed revision September 25, 2023; limited factual policy context, not a comprehensive current legal assessment.

### Production and independent reception

- **D1:** John Harris interviews Nick Walton, January 9, 2020; primary origin/development testimony. Future-facing statements remain historical plans.
- **D2:** Latitude Team, February 11, 2020; primary company scaling narrative and dated participation claims, not audited finances.
- **R1–R7:** Written review/critical accounts identified in section 9; all used article bodies read. R5/R7 are shorter supplementary accounts; R6 has an explicit competitive commercial interest.
- **R8:** Alex Mitchell, January 9, 2022, peer-reviewed comparative essay; AI Dungeon analysis and comparative framing/conclusion read. Project December is not treated as part of AI Dungeon.

### Player evidence and access limits

- **U1:** Original Reddit thread retained from the earlier source register, freshly read with replies. Relative dates and uncontrolled model/scenario differences limit comparisons.
- **U2:** US App Store listing and exposed review bodies, freshly read. No assumed helpful ordering, representative prevalence or invented year for day-only dates.
- **U3/U4:** Requested helpful-all-time positive/mixed and negative Steam surfaces returned a content-preference gate. Negative JSON endpoint failed. No review bodies counted.
- TapSmart's February 2020 review was located but repeated retrieval failed; it is not counted as read. Latitude's original April 2021 community update, ads retrospective and December 2022 Unchained article returned no readable bodies; the historical moderation reference above is explicitly through Mitchell, not a newly read company post.
- Earlier shared-study App Store accounts and video recommendations retain their earlier-capture/unwatched status. Wikipedia was used to locate original article links, not as the authority for technical rules or newly asserted financial history.

[P1]: https://help.aidungeon.com/faq/what-happened-to-the-travelers-tier
[P2]: https://help.aidungeon.com/faq/how-to-play
[P3]: https://help.aidungeon.com/faq/story-cards
[P4]: https://help.aidungeon.com/faq/the-memory-system
[P5]: https://help.aidungeon.com/faq/do-you-support-multiplayer
[P6]: https://help.aidungeon.com/faq/whats-the-difference-between-scenarios-and-worlds
[P7]: https://help.aidungeon.com/scripting
[P8]: https://help.aidungeon.com/faq/what-are-scenarios
[P9]: https://help.aidungeon.com/faq/what-are-adventures
[P10]: https://help.aidungeon.com/faq/plot-essentials
[P11]: https://help.aidungeon.com/faq/what-is-the-authors-note
[P12]: https://help.aidungeon.com/faq/plot-components
[P13]: https://help.aidungeon.com/ai-model-differences
[P14]: https://help.aidungeon.com/faq/what-are-advanced-settings
[P15]: https://help.aidungeon.com/prompt-guide
[P16]: https://help.aidungeon.com/faq/what-are-image-credits
[P17]: https://help.aidungeon.com/faq/how-can-players-spend-scales
[P18]: https://help.aidungeon.com/understanding-settings
[P19]: https://help.aidungeon.com/latitude-privacy-policy
[D1]: https://www.gamedeveloper.com/design/creating-the-ever-improvising-text-adventures-of-i-ai-dungeon-2-i-
[D2]: https://aidungeon.medium.com/how-we-scaled-ai-dungeon-2-to-support-over-1-000-000-users-d207d5623de9
[R1]: https://www.148apps.com/ai-dungeon/ai-dungeon-review/
[R2]: https://www.stuff.tv/review/app-of-the-week-ai-dungeon-review/
[R3]: https://nicollelamerichs.com/2020/01/20/writing-with-algorithms-in-ai-dungeon/
[R4]: https://arstechnica.com/gaming/2020/01/we-test-ai-dungeon-2-a-text-adventure-that-creates-itself-with-your-help/
[R5]: https://www.bartneck.de/2022/06/26/ai-dungeon/
[R6]: https://dreamgen.com/blog/articles/ai-dungeon-review
[R7]: https://www.pcgamer.com/this-ai-writes-a-text-adventure-while-you-play-it/
[R8]: https://preview.electronicbookreview.com/publications/repetition-and-defamiliarization-in-ai-dungeon-and-project-december/
[U1]: https://www.reddit.com/r/AIDungeon/comments/1upbe4v/ai_dungeon_sucks_now/
[U2]: https://apps.apple.com/us/app/ai-dungeon-rpg-story-maker/id1491268416
[U3]: https://steamcommunity.com/app/1519310/reviews/?browsefilter=toprated
[U4]: https://steamcommunity.com/app/1519310/negativereviews/?browsefilter=toprated

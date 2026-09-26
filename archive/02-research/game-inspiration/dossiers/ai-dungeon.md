# AI Dungeon — full research dossier

**G40 · In progress research pass, September 26, 2026.** Current product mechanics and model/memory boundaries are researched below; the remaining checkpoint work is **production/development history, marketing/distribution/commercial context, five substantive written reviews, retired-Steam top/helpful review sampling, current player testimony, final OpenLegend transfer analysis, R01–R14 map, and final preservation/link review**. Do not mark G40 complete until those sections are added and the full file is reread.

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

## Sources — current-mechanics checkpoint

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


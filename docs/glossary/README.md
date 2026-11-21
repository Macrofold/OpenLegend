# OpenLegend glossary

Use **NPC** for a non-player human character. Say **an NPC who lives in town** when residence matters. For an attention limit, count **the subjects a guard can track in detail at once**.

## Find a term

| If you are describing…                                                                               | Look here                                                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A player, NPC or animal, who controls it, a character decision or an AI service                      | [Characters, decisions and AI services](characters-and-cognition.md)         |
| What someone sensed, attended to, remembered or learned                                              | [Perception, attention and memory](perception-and-memory.md)                 |
| Whom or what an ID, name or target refers to, and for whom it is valid                               | [Identity, names and references](identity-and-references.md)                 |
| A relationship, emotion, commitment, story or experiment about a character                           | [Social life, stories and character experiments](social-life-and-stories.md) |
| What a character wants, which actions are available, what counts as success or what practice teaches | [Goals, action choices and learning](actions-and-learning.md)                |
| Time, bodies, actions, possessions, crafting, movement or combat                                     | [Gameplay, bodies and space](gameplay-and-space.md)                          |
| The engine, a world’s authored rules, the World Agent, invention or learning a recipe                | [Worlds, authoring and invention](worlds-and-creation.md)                    |
| A person signing in, controlling a character, visiting or managing a world                           | [Accounts, access and participation](access-and-participation.md)            |
| Menus, controls, selecting a subject, the camera or on-screen information                            | [Player interface and presentation](interface-and-presentation.md)           |
| Artwork, files, asset permissions, releases or representations                                       | [Art, assets and releases](assets-and-releases.md)                           |
| Travel between worlds, unattended progression, publishing or funding                                 | [Shared worlds, publishing and offers](publishing-and-shared-worlds.md)      |
| The server that runs a world, what it sends a player, saving or recovery                             | [Runtime and storage](runtime-and-storage.md)                                |
| Project documents, experiments, measurements or remote test machines                                 | [Measurement and delivery](measurement-and-delivery.md)                      |

Search all tables from the repository root with `rg -in 'word' docs/glossary`. Definitions link to the relevant contract or implementation. **Proposed** identifies a design.

## Words that need context

| Wording you may encounter         | Choose the term that answers the question                                                                                                                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human, agent, autonomous resident | Who plays? **Player**. Who acts in the world? **Player character**, **NPC** or **animal**. Who helps a creator edit the world? **World Agent**. [Characters](characters-and-cognition.md)                                                                                                                  |
| Attention place, slot, focus      | Count the **subjects** being tracked. **Place** means a location. Distinguish the **Focus attribute**, **deliberate attention** and **keyboard focus**. [Attention](perception-and-memory.md#what-receives-closer-attention) · [Interface](interface-and-presentation.md#controls-selection-and-camera)    |
| Native, Source                    | For comparisons, name the **TypeScript server**, **Node-hosted Rust simulation** or **stand-alone Rust server**. For an animal’s decisions, say **rule-controlled**. [Runtime](runtime-and-storage.md#which-program-runs-the-game)                                                                         |
| Act, action, command              | **Act** describes a gesture or attempt. A **command** requests a change. An **action** is what the character does or attempts. [Player controls](interface-and-presentation.md#what-the-player-opens) · [Gameplay](gameplay-and-space.md#time-and-actions)                                                 |
| Account, owner, control           | **Player account** for sign-in, **personal account of an event** for experience, **control lease** for the tab controlling a character. [Access](access-and-participation.md) · [Perception](perception-and-memory.md)                                                                                     |
| Seen, identified, target          | Did the observer **detect** someone, **recognize** them, **learn their name**, or obtain a **current-body reference** for an action? [Perception](perception-and-memory.md) · [References](identity-and-references.md)                                                                                     |
| Memory, capacity                  | Specify **character memory** or **process memory**. For a limit, distinguish a **configured allowance**, a **provider quota** and **measured capacity**. [Perception](perception-and-memory.md) · [Measurement](measurement-and-delivery.md)                                                               |
| Save, load, return                | A player **reconnects**, a server **reopens the latest save**, and an authorized operator **restores a checkpoint**. Ordinary play uses **background saves**. [Saving](runtime-and-storage.md#saving-and-continuing-play)                                                                                  |
| Observer receipt                  | An **observer’s sensory receipt** records what a character perceived. **Client receipt of a view update** records what reached the player’s device. [Personal evidence](identity-and-references.md#what-a-reference-lets-its-recipient-do) · [Measurements](measurement-and-delivery.md#what-was-measured) |
| Worker, campaign                  | A **simulation worker** performs calculations. A **verification worker** runs development checks. An in-world undertaking is a **shared campaign**. [Runtime](runtime-and-storage.md) · [Measurement](measurement-and-delivery.md) · [Shared worlds](publishing-and-shared-worlds.md)                      |
| Invent, install, learn, craft     | **Install** a recipe in a world, **learn** it as a character, **craft** the item using a method. [World creation and invention](worlds-and-creation.md#invention-making-and-learning)                                                                                                                      |

## Using the convention

Use the visible label in player instructions and the exact identifier in code examples. A player opens **Journal → Commitments**. The internal key is `promises`.

Add a shared term to its subject table. Define what it refers to, whose perspective matters, and link the rule, type or control that establishes its meaning. Keep gameplay rules, tuning, measurements and delivery status with their existing owners.

# Divinity: Original Sin 2: world interaction, character, inventory, journals and entry

This dossier examines **ten distinct, saved UI screenshots** alongside official interaction documentation and firsthand player accounts. DOS2 is a useful comparator for Open Legend because items, characters, equipment, containers, and environmental actions share the same game world. It also supplies a warning: putting items into more bags can make inventory management harder even when those bags are intended to organize it.

The enduring Open Legend decisions remain in [Inventory](../inventory.md), [World interaction](../world-interaction.md), [Controls](../controls.md), and [Chat and invention](../chat-and-invention.md). This dossier provides evidence and proposed applications for those documents. See also the [BG3 study](baldurs-gate-3.md) and [research register](../research.md).

## Evidence and version boundaries

Research accessed **2026-10-04**. Every screenshot was downloaded and opened for visual inspection. The [manifest](../screenshots/dos2/manifest.json) records the original image URL, source page, dimensions, SHA-256, dates where established, platform, inspection status, and per-image analysis. Original downloaded images are preserved without cropping, recreation, or resampling.

The original atlas identifies three contexts; the wider-interface extension below adds six further PS4 captures from the same dated firsthand study:

| Evidence                                        | What it can establish                                            | Limit                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DOS2-01, visibly labelled **Alpha v3.0.15.252** | Historical structure of stock and staged barter offers           | It must not be presented as the Definitive Edition interface or current retail behaviour.                                             |
| DOS2-02, a release-era desktop chest screenshot | World object and contents displayed together                     | The source filename suggests October 2017, but an exact capture date and patch are unverified.                                        |
| DOS2-03/04, a 2020 PS4 firsthand UI analysis    | Controller party layout and an organization-related failure case | The author explicitly enabled the **Improved Organization gift bag**. These images do not represent an unmodified inventory baseline. |

Observed layout is separated from documented behaviour and our design inference. No live playthrough, timing test, or population-level satisfaction study was performed. Individual players' opinions below support specific design hypotheses, not a universal claim that DOS2's inventory is liked.

## The interaction model, in practical terms

### The world object supplies the action's subject

The [official Xbox-hosted DOS2 manual](https://dlassets-ssl.xboxlive.com/public/content/6778dff3-8d6c-4615-a8a3-1f1770057d09/GameManual/9e540603-b9bb-44a0-83cd-bb98f1d40b32/en-US/index.html) describes a default interaction for a world object: a container opens and a friendly character can be addressed. Other applicable actions come from a context menu. It distinguishes ordinary taking from red-marked illegal actions and describes selecting an item or skill before a world target.

DOS2-02 makes the result visible. A character stands in the world beside a chest. Opening that chest reveals its item cells. The player is still situated near the thing being used. The interface does not require the player to start in a global “transfer” form and reconstruct which chest they meant.

**Open Legend inference:** retain the object as the interaction's anchor. Hover or focus can identify the chest; deliberate activation opens its contents; the player can then transfer to or from their bag. When use is impossible, attach the explanation to that known object. “Locked” or “Move closer to Oak Chest” communicates a reason. Omitting the chest from an opaque dropdown only removes evidence.

This does not imply that all nearby storage is publicly accessible or that physical reach should disappear. World constraints should remain real and comprehensible at the point of interaction.

### Inventory actions can work in either direction

A useful distinction emerges from the [September 2017 player discussion about controller and keyboard UI](https://steamcommunity.com/app/435150/discussions/6/1495615865226815344/). LuneIX specifically liked the controller route where choosing an empty equipment slot showed candidates; they found the keyboard arrangement they encountered less convenient. Another participant preferred keyboard UI. This is a narrow, firsthand report from the original release, not proof of the exact behaviour of every later build.

The transferable idea is strong: a player can start with an item and ask “What can I do with this?” or start with a slot and ask “What can go here?” Both are concrete questions. Neither requires asking for every action parameter in advance.

**Open Legend inference:** support both item-first equipment actions and slot-first compatible-item selection. Do the same for a container: the open chest establishes the destination, while the player's chosen item establishes the source. Keep an accessible non-drag path alongside direct manipulation.

### Known crafting and experimentation are different tasks

The official manual distinguishes selecting a known recipe from experimenting by combining ingredients. DOS2-04 shows Recipes, Combine, and Runes as different routes. In the shown Combine state, a series of ingredient positions sits above an inventory selector.

**Open Legend inference:** a known recipe should begin with the desired result and show concrete requirements. Experimental combination can request the specific objects that the player wants to try. It is legitimate to ask the player to make a meaningful material choice; it is unnecessary to ask them to re-enter an already known actor, action, station, or selected ingredient.

The example also demonstrates a failure case. Organization bags in the ingredient selector can turn “choose a material” into “remember which character owns which identical bag, open it, and extract the material.” A visual grid alone does not make a workflow direct.

### Trade needs a different commitment model from storage

DOS2-01 shows a historical barter layout with stock at the edges and offered goods in the middle. That arrangement represents a proposal between two owners, followed by acceptance. It is different from rearranging items inside one's own open storage.

**Open Legend inference:** reuse item artwork, inspection, and selection across inventory and trade, but keep transaction semantics explicit. Moving an item into a trade offer should not immediately sell it. Moving an item into an authorized open chest should not require assembling and accepting an elaborate offer. Shared visual components are useful; identical workflows for different consequences are not.

## What players specifically liked, and what they did not

| Firsthand source                                                                                                                                                            | Concrete evidence                                                                                                                                                              | Research implication                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [LuneIX, 25 September 2017](https://steamcommunity.com/app/435150/discussions/6/1495615865226815344/)                                                                       | Preferred the controller interface encountered at a friend's house, especially slot-led equipment choice. A reply preferred keyboard UI.                                       | Support the player's starting intention and adapt presentation to input. Do not equate personal preference with universal usability.                                                       |
| [Controller-support discussion, 14 September 2017](https://steamcommunity.com/app/435150/discussions/0/3223871682609930461/)                                                | Zef praised the controller UI's polish while acknowledging slower inventory management. Some other replies refer to the first DOS game and cannot be counted as DOS2 evidence. | A comfortable overall interface can coexist with a costly inventory task. Evaluate the task separately.                                                                                    |
| [Inventory discussion, 10–11 July 2021](https://steamcommunity.com/app/435150/discussions/0/3056238885193954908/)                                                           | One player objected to repeated item-by-item stash transfers. Replies pointed to controller multiselection and to sorting/filtering habits as helpful alternatives.            | Input parity matters. A useful bulk operation that some players cannot discover or access leaves the repeated-work problem unresolved. These reports are not a current-build verification. |
| [Raphaël Leroy's PS4 analysis, June–July 2020](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) | With Improved Organization enabled, the author reported extra bag-handling steps and complications finding materials for crafting and runes.                                   | Treat “organization” as a workflow to evaluate, not an automatic benefit of adding nested containers. Preserve the gift-bag qualification.                                                 |

Larian also publicly treated inventory organization as an area requiring redesign for the Definitive Edition. [Xbox's developer announcement](https://news.xbox.com/en-us/2018/07/20/how-divinity-original-sin-2-definitive-edition-is-better-than-divinity-original-sin/amp/) describes the edition's improvements, including party inventory work. An [April 2018 republication of Larian's announcement](https://wccftech.com/larian-divinity-original-sin-2-refined/) reports inventory as a major request and describes the whole-party view and multiselection. The original Kickstarter post was not accessible during retrieval, so the latter is explicitly secondary reporting of the developer statement.

These sources support a balanced conclusion: players can appreciate a game's controller adaptation and concrete interactions while still finding inventory administration burdensome. Open Legend should study the successful interaction patterns without inheriting the chores.

## Screenshot atlas

All four images are third-party reference material used for criticism and design research. Larian Studios, source authors, and other relevant rights holders retain their rights. They are not Open Legend game assets and are not offered under the repository's software licence.

### DOS2-01 — Historical alpha barter with staged offers

![DOS2-01: Alpha barter interface with player stock, two offer areas, merchant stock, and Accept](../screenshots/dos2/DOS2-01-barter.jpg)

**Provenance:** [RPGuides merchant-location page](https://www.rpguides.de/divinity-original-sin-2/fundorte/pyrokinet-pyrokinetic-fertigkeitenbucher.htm) · [Original image](https://www.rpguides.de/images/dos2/location086.jpg). Desktop, keyboard and mouse. The top-right label visibly says **ALPHA VERSION v3.0.15.252**. Publication and exact capture date unknown. Accessed 2026-10-04.

**Visible controls and layout.** Character portraits sit along the top. Player stock occupies the left and Samadel's stock the right; two mostly empty offer areas occupy the centre. Each side shows gold. Category pictograms flank the stocks. Accept is centred below the offer, and close is at the lower right. A balance-like icon appears above the offer; its precise action is not established by this image alone.

**Workflow represented.** The layout stages a proposed exchange before acceptance. This observation concerns the visible historical design. It is not evidence of current pricing, gift rules, or a present-day keyboard shortcut.

**What works.** Goods retain an obvious owner before entering a proposed exchange. The central offer region can give the player a moment to review the trade's two sides before a consequential commit.

**What does not work.** A large amount of space is reserved for an empty offer. Small pictograms require learning, and the significance of the balance control is not self-explanatory. If a final offer is unbalanced, the design needs plain language about the consequence rather than trusting the player to infer it from numbers.

**Open Legend application.** Use staged offers and a clear commit for actual trade. Keep the merchant's identity, each side's goods, price, and final consequence legible. Do not apply this entire workflow to placing a potion into one's already open chest. Review transaction semantics separately from the shared item-grid component.

### DOS2-02 — Open a world chest and see its contents

![DOS2-02: A character near a chest with the chest's item grid open over the world](../screenshots/dos2/DOS2-02-chest-loot.jpg)

**Provenance:** [Neoseeker, The Key to Freedom](https://www.neoseeker.com/divinity-original-sin-ii/walkthrough/The_Key_to_Freedom) · [Original image](https://cdn.staticneo.com/ew/e/e6/20171027151534_1.jpg). Desktop keyboard/mouse presentation. The filename suggests 27 October 2017; capture date and patch are not independently confirmed. Accessed 2026-10-04.

**Visible controls and layout.** The character and physical chest remain in the scene. A chest-shaped panel at the right contains a regular grid, with several occupied cells. A collection pictogram is above the grid and a large X closes the panel. Party portraits, health information, and the hotbar remain visible. The pictogram looks like a collection action, but its exact binding and stack behaviour are not established by this image.

**Documented workflow.** The official manual describes opening containers through their world interaction. The screenshot confirms the resulting object-and-contents relationship. It does not show a transfer drag or the player's bag open beside the chest.

**What works.** The world object remains the centre of the interaction. Contents appear immediately where they can be acted on. The player can understand “I opened that chest; these are its contents” without translating object identity into a dropdown choice.

**What does not work.** The decorative chest shell consumes substantial area for a modest grid. A clear container name is not visible in this frame. Artwork establishes atmosphere but should not displace essential ownership, capacity, or reach information.

**Open Legend application.** Preserve the causal sequence: deliberate object activation, named contents panel, visible player bag when transfers are needed. Make Take All a labelled convenience only when supported by actual rules and capacity. Keep a clear return to the world. We do not need to reproduce the literal chest illustration to adopt the interaction.

### DOS2-03 — PS4 party inventory and a bag's context menu

![DOS2-03: Four PS4 party inventories with text categories and a context menu for a selected organization bag](../screenshots/dos2/DOS2-03-bag-context.jpg)

**Provenance:** [Raphaël Leroy's firsthand PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original image](https://static.wixstatic.com/media/03021d_2224bdfa37f94991b99e3fbcfffd220e~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90/03021d_2224bdfa37f94991b99e3fbcfffd220e~mv2.jpg). Published 7 June 2020, updated 17 July 2020. PS4 Definitive Edition with **Improved Organization gift bag enabled**; precise build and capture date unknown. Accessed 2026-10-04.

**Visible controls and layout.** Four owner columns contain portraits, currency, capacity, and item grids. Text categories include equipment, consumables, ingredients, miscellaneous items, books/keys, and wares. L1/R1 prompts support category navigation. The selected bag opens a menu with named recipients, Add to Wares, and Hold in hand. Selection outlines are visible around some cells.

**Workflow represented.** The selected item supplies the context; the menu supplies applicable organization and recipient actions. The screenshot does not establish the exact multiselection gesture or how many selected objects a command would affect.

**What works.** The columns make ownership concrete. Written category labels are easier to interpret than an entire row of unexplained symbols. Named recipients reduce ambiguity at the point of giving an item.

**What does not work.** Repeated bag icons are difficult to distinguish. The context menu obscures part of the grid, and thin selection outlines compete with item art. Nesting can require players to remember a bag's location and contents before they can use an item.

**Open Legend application.** Keep ownership distinct, but use category filters as views of the same inventory unless the world genuinely contains a physical sub-container. A category such as “Potions” should not require the player to extract items from a special organizational bag merely to use them. Let actual bags remain meaningful portable objects with clear breadcrumb context. Do not turn every category into another container-selection chore.

### DOS2-04 — Experimental crafting reveals an organization failure

![DOS2-04: PS4 Combine crafting tab with five ingredient positions and repeated organization bags in the item selector](../screenshots/dos2/DOS2-04-crafting.jpg)

**Provenance:** [Same PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original image](https://static.wixstatic.com/media/03021d_a783efe8de294d1394a962335a85f4af~mv2.jpg/v1/fill/w_1920,h_1080,al_c,q_90/03021d_a783efe8de294d1394a962335a85f4af~mv2.jpg). PS4 Definitive Edition, 2020, **Improved Organization gift bag enabled**; exact build unknown. Accessed 2026-10-04.

**Visible controls and layout.** The panel has Recipes, Combine, and Runes tabs with L1/R1 navigation. Five empty ingredient positions sit above a Tools grid containing repeated bags. Footer prompts read Cross/Add Item, Square/Open, Triangle/Toggle Info, and Circle/Close. The world remains visible around the panel.

**Documented workflow.** The manual distinguishes known recipes from experimental combinations. This is the ingredient-selection route. Five empty positions are available; their existence does not prove every recipe requires five ingredients. The source author's bag-handling complaints are a contextual report, not a verified statement about all subsequent versions.

**What works.** The player is in a specific crafting task, and the current controls are spelled out. Known recipes and experimentation have distinct entry points rather than being indistinguishable modes of a generic activity form.

**What does not work.** Identical organizational bags occupy the selector where the player needs recognizable materials. The panel reveals storage bureaucracy at the moment of crafting. Available empty slots can also misleadingly suggest a larger setup task if the required amount is not clear.

**Open Legend application.** For a known recipe, show the result and exact ingredient requirements, with eligible concrete materials already identified. Offer a change where the player has a real choice. For experimentation, let the player deliberately add objects and understand the attempted operation. Recognize authorized materials in carried bags consistently without granting access to hidden or unreachable inventories. Repeatedly opening and extracting organizational sub-bags should not be the price of using an ingredient.

## Concrete review questions for Open Legend

The DOS2 evidence suggests the following review scenarios, to be resolved in the existing handbook and later implementation work:

1. **Chest encounter:** Can a player approach a visible chest, identify it, open it, and understand its contents without visiting a generic activity catalogue? If opening fails, is the reason attached to that chest?
2. **Two-way transfer:** With the player's bag and a chest open, is the destination obvious? Can the same operation be completed without dragging? Is stack quantity an optional focused decision rather than a compulsory form?
3. **Slot intention:** Can the player choose a worn slot and see suitable carried items, as well as start from an item? Is the equipped state unmistakable before dropping or selling?
4. **Useful organization:** Do categories help locate items without creating new hidden places to search? If the player chooses to use a real bag, can they tell where they are and get back to its parent?
5. **Crafting:** Does a known recipe retain the selected actor, station, and result? Are concrete resources and alternatives visible? Does experimentation have a clear separate purpose?
6. **Input parity:** Are transfer, bulk handling, inspection, cancellation, and focus discoverable on each supported input method? A convenience available only through an obscure gesture does not remove the underlying burden.
7. **Commerce:** Does the player know when an item is merely selected, offered, or actually exchanged? Is that distinction absent from ordinary storage transfers where it is unnecessary?

These are proposed evaluation tasks, not claims that tests have been run. The goal is to retain meaningful decisions about equipment, ownership, resources, and preparation while removing repeated reconstruction of context that the game already possesses.

## Beyond possessions: exploration, abilities, records and returning to play

The six additional screenshots **DOS2-05–10** extend this study to the rest of the play loop. They are distinct captures from Raphaël Leroy's firsthand PS4 article, not new crops of DOS2-03/04. The article was published 2020-06-07 and updated 2020-07-17, with gift bags including Improved Organization enabled. Only DOS2-10 visibly supplies a build number, **v3.6.58.1306**; do not infer that exact build for every other capture. Each original 1920×1080 image was downloaded and visually inspected on 2026-10-04. The same author's collection is a coherent case study, not six independent reports of player preference.

### The interface follows the kind of decision

| Player's question                    | Observed/documented DOS2 pattern                                                                        | Open Legend application; not a claim of implemented parity                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where am I and who am I controlling? | Scene-centred exploration; portraits left, minimap right, actions below; DOS2-09                        | Keep actor, condition and spatial orientation persistent, with details opened deliberately. Avoid several always-expanded administrative panels.                                        |
| What will this attack or move do?    | The official help documents target/path and action-point previews before commitment.                    | Put known reach, path, cost and target feedback where the player aims. Distinguish a proposed action from an action that actually happened.                                             |
| What can this character do, and why? | Skills separate memorized, innate and item-provided abilities; DOS2-08                                  | Explain ability provenance and current prerequisites, with clear labels for learned versus usable now. Do not silently equate possession with readiness.                                |
| What did I learn or promise?         | A journal list leads to an explanatory entry; DOS2-05                                                   | Group by useful person/place/topic, retain meaningful history, and distinguish selected, new, tracked and closed entries.                                                               |
| What exactly did that person say?    | Date/participant list opens a speaker-labelled transcript; DOS2-06                                      | Preserve previously perceived speech with time/person context and independent scrolling. Do not mix narrator, speaker, player draft and committed action into one undifferentiated log. |
| Where should I go?                   | Named waypoint selection; DOS2-07. The manual separately describes map zoom, pan and named custom pins. | Make looking at a place, marking it, moving toward it and world-supported travel different actions. A travel list is appropriate when destination is the actual outstanding choice.     |
| How do I resume my game?             | A short entry menu separates Continue, Story and other modes; DOS2-10                                   | Prioritize a valid existing world/character when appropriate and clearly distinguish creation. Explain unavailable saves/access without discarding the player's place.                  |

The [official Xbox-hosted help](https://dlassets-ssl.xboxlive.com/public/content/6778dff3-8d6c-4615-a8a3-1f1770057d09/GameManual/9e540603-b9bb-44a0-83cd-bb98f1d40b32/en-US/index.html) is the primary behavior reference. Its combat section describes movement previews, selecting a hotbar skill before its target, action-point costs, explicit turn ending, and delaying a turn before spending points. Its interface section distinguishes character statistics from equipment and known skills from memorized skills. These are documented interactions, not behaviors demonstrated by a still image. The text extraction omits several embedded controller glyphs, so the table does not invent those missing bindings. The screenshot footers below provide bindings where they are actually legible.

**Do not import the turn system.** DOS2's action points, Source and prepared Memory slots are its rules. Open Legend should display the actual constraints of its current authored world. In continuous simulation that may mean an ongoing action, elapsed/remaining work, interruption and time controls; it does not justify adding End Turn to a world with no turns. Conversely, a real pause or waiting state must be named rather than inferred from an open menu. None of these screenshots proves whether opening every panel pauses every actor.

### Player praise and criticism beyond inventory

| Original evidence                                                                                                                                          | Specific response                                                                                                                                                                                                                                   | What it supports                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Iriphos, Larian forum, 2018-09-01](https://forums.larian.com/ubbthreads.php?Number=648574&ubb=showflat)                                                   | Praised the Definitive Edition journal's grouping of alternative quest paths; preferred the older journal's character-authored voice over direct instructions. The author explicitly limited the report to about the first hour.                    | Clear grouping and evocative writing are separate design qualities. A readable journal need not become a task checklist.                                                 |
| [Controller discussion, 2017-11-13 and 2021-01-02](https://steamcommunity.com/app/435150/discussions/0/1485487749766777376/)                               | Tom wolf praised controller comfort for long sessions. Lockethiago later praised direct movement and camera use. Other players objected to menu steps and the smaller hotbar; even commenters who preferred controller disagreed about those costs. | Judge world navigation, action access and dense management separately; input preference is not proof of task parity.                                                     |
| [Leroy's 2020 PS4 case study](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) | Reported difficulty finding recent quests, weak tracked-state visibility, missing incidental speech in history and an unhelpful default Story selection.                                                                                            | These dated first-person observations motivate concrete recovery and state-clarity questions. Their frequency across players and present-day status are not established. |

The official [Xbox announcement](https://news.xbox.com/en-us/2018/07/20/how-divinity-original-sin-2-definitive-edition-is-better-than-divinity-original-sin/amp/) presented the new journal as an improvement. The mixed player response is valuable precisely because “new” and “simpler” do not settle the design: it matters which information is easier to find and which sense of agency or character is lost.

## Additional screenshot atlas: the wider interface

All six images below are reference-only third-party gameplay captures. No open-asset license or republication permission was established. The game's and photographer's rights remain intact; these are not production assets. Source pages and direct originals are linked individually, and the manifest contains the original-byte hashes.

### DOS2-05 — Quest navigation, current selection and tracking

![DOS2-05: PS4 journal with quest hierarchy and a selected entry](../screenshots/dos2/DOS2-05-quest-log.jpg)

**Provenance:** [Firsthand PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original](https://static.wixstatic.com/media/03021d_b7572562540443cdb9cb6a02fa16e1a9~mv2.jpg). PS4 Definitive Edition, 2020 publication, gift bags enabled; capture date/build unknown. Accessed 2026-10-04.

**Visible controls and meaning:** L1/R1 flank six named journal tabs: Log, Chronicles, Archive, Dialogues, Combat Log and Tutorials. The left page contains grouped/indented quests; the right page shows the chosen quest's objective and explanation. Footer prompts give touchpad/On Map, Cross/Track Quest and Circle/Close. Colored flags, diamonds, text and a white row outline encode several states, but the frame alone does not prove which flag means “tracked.”

**Workflow and judgment:** selecting a quest changes what the player reads; tracking it is a separate command. That distinction is good. The list/detail split preserves context and supports branching entries. Color-only or overloaded state signs undermine that benefit. **Apply:** display distinct new, selected, pinned, inactive and resolved states with accessible text. Put recency and meaningful grouping within reach. Opening an entry must not silently pin it or mark its goal fulfilled. A map link should return to the same entry and reading position.

### DOS2-06 — A transcript can be navigable without becoming chat clutter

![DOS2-06: Dialogue history grouped by day, time and conversation partner](../screenshots/dos2/DOS2-06-dialogue-history.jpg)

**Provenance:** [Firsthand PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original](https://static.wixstatic.com/media/03021d_99ebf71c964c4b988aa2a6547413e5a5~mv2.jpg). PS4 Definitive Edition; 2020 publication, gift bags enabled; exact build/capture date unknown. Accessed 2026-10-04.

**Visible controls and meaning:** Dialogues is the selected top tab. Day groups and timestamped counterpart names appear left; a transcript headed by counterpart, time and location appears right. Speaker names distinguish narrator, controlled character and NPC, while independent scrollbars belong to the list and transcript. Circle/Close remains in the footer.

**Workflow and judgment:** choose the remembered conversation, then read it without flattening every event into one feed. Names provide meaning beyond the colored text. Long transcripts still need good search and stable reading position; the screenshot does not prove those capabilities. **Apply:** preserve meaningful speech the character actually perceived, not only the most recent response. Keep prose narration separate from quoted speech and any item offer/action receipt. Opening history must not send, restart or discard a chat draft. Record what happened while away only within the character's permitted knowledge.

### DOS2-07 — A waypoint list asks a real destination question

![DOS2-07: Waypoint selection over the current world with named destinations](../screenshots/dos2/DOS2-07-waypoints.jpg)

**Provenance:** [Firsthand PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original](https://static.wixstatic.com/media/03021d_d595472f44ca4b06b20776d3ca5707a8~mv2.jpg). PS4 Definitive Edition; 2020 publication, gift bags enabled; exact build/capture date unknown. Accessed 2026-10-04.

**Visible controls and meaning:** a single scroll-like panel lists named destinations with arrows around the focused row. Cross/Select and Circle/Close are explicit. The selected character, minimap and hotbar remain visible behind it. This is a waypoint selector, **not a screenshot of the full map**; no full-map zoom or marker geometry is inferred from it.

**Workflow and judgment:** the player has intentionally entered travel selection, so destination choice is meaningful. The menu has one purpose and a short commitment path. However, an alphabetical list does not explain which region a place belongs to or how it relates to the present position. **Apply:** show known destination names with region/location context and an intentional map preview. Keep movement and travel consequences explicit. Do not generalize “avoid dropdowns” into “never use lists”: a chosen chest already supplies a destination; a waypoint trip often does not.

### DOS2-08 — Known, prepared, innate and equipment-provided abilities

![DOS2-08: Skills screen separating memory slots, innate skills and skills from items](../screenshots/dos2/DOS2-08-skills.jpg)

**Provenance:** [Firsthand PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original](https://static.wixstatic.com/media/03021d_3035be004d2e4ae88712ad8e2132970a~mv2.jpg). PS4 Definitive Edition; 2020 publication, gift bags enabled; exact build/capture date unknown. Accessed 2026-10-04.

**Visible controls and meaning:** L1/R1 navigate school pictograms; the chosen school is written underneath. The left pane lists a named skill. The right separates Memory Slots, Innate Skills and Skills From Items, with Used Memory 17/19. Footer controls are Cross/Memorise Skill, Square/Toggle Memory List, Triangle/Toggle Info and Circle/Close.

**Workflow and judgment:** this is loadout preparation, not casting a spell. The capacity figure and labelled origins explain why the right-hand actions exist. Some school colors are dim enough to resemble disabled controls, and icons alone cannot establish each ability's meaning. **Apply:** the character sheet should explain whether an ability is learned, currently prepared, supplied by equipment or blocked by conditions. Selecting an ability for explanation must not use it. Show relevant limits and reasons next to the ability; only expose preparation slots if the authored world actually has that mechanic.

### DOS2-09 — Scene-first exploration with a compact action strip

![DOS2-09: Exploration HUD with party conditions left, minimap right and hotbar below](../screenshots/dos2/DOS2-09-exploration-hud.jpg)

**Provenance:** [Firsthand PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original](https://static.wixstatic.com/media/03021d_abbf32d1e5c4481088e00015f4cfec7f~mv2.jpg). PS4 Definitive Edition; 2020 publication, gift bags enabled; exact build/capture date unknown. Accessed 2026-10-04.

**Visible controls and meaning:** portraits and adjacent condition icons occupy the upper-left edge; a framed portrait marks the selected party member. A map with north and coordinates is upper-right. Bottom-centre contains action icons, resource bars and three cyan resource diamonds, with Hold Cross/Search and Triangle/Hotbar prompts. Individual skill names and condition meanings are not exposed in this frame and are not guessed from their artwork.

**Workflow and judgment:** the world retains most of the visual area while the player sees who is active and how to open actions. Small repeated symbols still make subtle changes hard to notice. **Apply:** use a compact persistent layer for controlled person, urgent conditions, current action, nearby orientation and time. Expand explanation on focus or explicit inspection; show genuinely new danger/action failure near its source. Do not make every status equally loud, and do not rely exclusively on colored bars for condition or target eligibility. This is an exploration frame, not evidence that all combat targeting previews are readable.

### DOS2-10 — Returning to play is a primary game interaction

![DOS2-10: Definitive Edition main menu with Story focused and Continue below it](../screenshots/dos2/DOS2-10-entry-menu.jpg)

**Provenance:** [Firsthand PS4 analysis](https://raphleroy18.wixsite.com/gamingux/post/divinity-original-sin-ii-on-ps4-menus-usability-and-information-visualization) · [Original](https://static.wixstatic.com/media/03021d_7f8d415233004a89a2c63dbfdb51eea2~mv2.jpg). PS4 Definitive Edition, **v3.6.58.1306** visibly displayed; 2020 publication, gift bags enabled. Exact capture date unknown. Accessed 2026-10-04.

**Visible controls and meaning:** the right-hand vertical menu contains Story, Continue, Arena, Options and Credits; the focus marker is beside Story. Cross/Select and Circle/Back are shown at the bottom. Options/Join is a separate local participation prompt; Square/View Gift Bags opens that distinct feature. An existing profile name appears left. The screenshot establishes the current focus, not a universal startup-focus rule.

**Workflow and judgment:** a short menu gives clear categories and keeps settings away from campaign content. “Story” is a weaker description of the entry choice than explicit New/Load/Continue wording, especially beside Continue. **Apply:** show the world and character the player will resume, whether the saved session is valid, and why control may be unavailable. A create-new route must be unmistakable; loading failures should offer recovery without resetting the world. Local participation, online joining, spectator access and control claims must be named separately where Open Legend supports them. A clean title screen does not by itself qualify reconnect, save recovery or multiplayer ownership.

## Whole-interface questions to carry into Open Legend review

The inventory scenarios above remain useful but are incomplete on their own. The broader review should follow a player from entry into a world, through observing a person/object, selecting an action, understanding progress or failure, checking character condition, conversing, consulting memory/map and returning to the same task. At every transition, retain the selected subject and any unfinished decision that remains valid; clear private knowledge when the actual player/character access changes.

The shared handbook and active redesign own the resulting requirements. This dossier supplies examples and counterexamples, not a mandate to copy DOS2's party size, classless progression, universal waypoint travel, fixed journal writing or turn-based combat.

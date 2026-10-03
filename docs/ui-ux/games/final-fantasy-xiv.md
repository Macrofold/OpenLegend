# Final Fantasy XIV: audience, item context and repeatable actions

[Research ledger](../research.md) · [Inventory guidance](../inventory.md) · [Conversation guidance](../chat-and-invention.md) · [Screenshot manifest](../screenshots/ffxiv/manifest.json)

**Evidence reviewed:** 2026-10-03. Six distinct publisher images, downloaded and visually inspected. The inventory comparison is one publisher-composed image, counted once. These are official guide captures with unspecified capture builds; the full HUD uses gamepad controls. They establish visual patterns, not the exact state of every current platform. No live game session or accessibility test was performed.

## Why this game belongs in the comparison

FFXIV is useful for persistent social chat, equipment context and a large catalogue of learned actions. Its strongest transferable idea is that the player establishes the subject first: an item supplies its own commands, a recipe supplies its own ingredients, and a conversation composer retains a visible audience. The interface still contains configuration menus and dense specialist screens. Those are reasons to study its boundaries, not copy every menu.

**Actual player evidence:** In a November 2021 [Square Enix forum discussion](https://forum.square-enix.com/ffxiv/threads/446902), Luneline specifically praised movable/resizable UI and the simplified job gauge, while reporting that party-frame clutter made healing difficult. Nayukhuut, in the same thread, preferred FFXIV's existing party frames to WoW-style frames. This is first-person feature-level praise and disagreement, not a representative survey or an endorsement of the whole inventory system. It supports flexible density and stable alternatives; it does not establish that customization repairs a poor default.

## FFXIV-01 — Full gamepad HUD: keep the world legible

![FFXIV gamepad HUD with world at center, chat lower left, cross hotbar below and objectives at right](../screenshots/ffxiv/01-hud-gamepad.jpg)

*Source: [Square Enix UI Guide](https://na.finalfantasyxiv.com/uiguide/), © Square Enix. Full screenshot; client platform and build unspecified.*

**Observed layout.** The character and counter occupy the center. The lower-left log contains a named speaker, several lines of dialogue, a `Say` audience label, an empty composer and General/Battle/Event tabs. The plus and gear sit after those tabs. The bottom-center cross hotbar shows LT/RT group cues, action icons, empty slots, a lock and a set-switch cue; health, magic and experience sit directly below. The right edge contains the minimap with zoom controls and coordinates, followed by named quest objectives and completion marks. Currency and a compact inventory-status array occupy the lower-right corner. The screenshot does not explain every inventory-array color or standalone top icon; those meanings must not be guessed from pixels.

**Documented behavior.** The [game-screen manual](https://na.finalfantasyxiv.com/game_manual/view/) identifies the default log roles, hotbar assignment and lock behavior. General mixes social and ordinary activity, Battle records combat, and Event contains NPC dialogue. The [controls manual](https://na.finalfantasyxiv.com/game_manual/operation/) documents keyboard and controller routes. These sources establish controls; the image alone cannot prove input behavior.

**Judgment.** Keeping the center open preserves the scene's social context, and persistent peripheral regions build spatial memory. The busy objective list and many unexplained symbols also show the cost of importing a mature MMO HUD wholesale.

**Open Legend application.** Preserve the world during ordinary conversation and item use. Keep speaker, destination and composer together. Show only the player's relevant quick actions and active task; do not inherit FFXIV's quest, class or resource vocabulary as engine requirements.

## FFXIV-02 — Inventory presentation can flatten carried storage

![FFXIV normal, expanded and open-all inventory layouts](../screenshots/ffxiv/02-inventory-layouts.jpg)

*Source: [How can I view more inventory items at once?](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-bag/setting_itemsort.html), © Square Enix. Official comparison of three UI captures, counted as one image.*

**Observed layout.** Each window has a title, close control, a grid of equal-size item slots, occupied/total capacity and currency. Normal presentation has numbered pages. Expanded presentation places more slots together. Open All uses a taller unified collection and leaves separate item/key-item/crystal navigation. The example inventories are empty, so it does not demonstrate recognition of real item art, selected-item feedback or transfers.

**Documented interaction.** Under Character Configuration → Item Settings, the player chooses Normal, Expanded or Open All. Retainer inventories have a separate setting. Open All removes ordinary inventory-page switching; it does not mean every storage object in the world becomes accessible. [Official guide](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-bag/setting_itemsort.html).

**Judgment.** A single visible carried collection reduces page hunting. Empty numbered pages and icon-only category cues are weaker for a new player. A larger grid can consume the world view without increasing understanding.

**Open Legend application.** A player's bag collection can be presented together while retaining meaningful bag identity and restrictions. Opening a world chest should provide that chest's contents beside the carried collection. The player should not have to choose a nearby chest from this inventory's configuration machinery. Keep item names available for invented objects whose art is unfamiliar.

## FFXIV-03 — A channel menu changes the audience, not the task object

![FFXIV chat audience menu attached to the chat composer](../screenshots/ffxiv/03-chat-audience.jpg)

*Source: [Using Chat](https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_how_to.html), © Square Enix. Publisher-cropped screenshot with its own callout.*

**Observed controls.** A speech-bubble button immediately beside the composer opens Tell, Say, Party, Alliance, Yell, Shout and Free Company. A check marks Say. The transcript remains behind the menu. General/Battle/Event are below the composer; plus, settings and hide controls sit at the end. The different placement is meaningful: audience choice is beside text entry, while transcript views are below it.

**Verified flow.** Open the speech-bubble control → choose the audience → focus the composer with Enter or a click → type → press Enter to send. The guide distinguishes direct-chat-on from direct-chat-off behavior, and says the active audience is named above the input. Unlocks/group membership affect available channels. [Official instructions](https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_how_to.html).

**Judgment.** One composer plus an explicit destination is efficient. It still depends on the player noticing a small audience label; a mistaken channel is easy to imagine, but no error rate was measured here. The screenshot does not explain how far Say, Yell or Shout reach.

**Open Legend application.** Keep the selected character/conversation and audible scope visible beside the draft. A nearby-person list should not be required for every sentence to an already selected person. If speech volume changes who can hear, show that consequence through the world and plain language. FFXIV's compact channel menu is not justification for an inventory destination form.

## FFXIV-04 — The item is the starting point for secondary commands

![FFXIV armoury item context menu with Equip, comparison, preview and Link](../screenshots/ffxiv/04-item-context-menu.jpg)

*Source: [Can I share item information via chat?](https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_iteminfo.html), © Square Enix. Publisher-cropped screenshot; lower menu content is cut off in the source.*

**Observed controls.** The Armoury Chest has equipment-category icons with counts at both edges and a Head category above the item grid. The selected object opens commands including Equip, Item Comparison, Try On, Repair, Extract Materia, Cast Glamour, Search for Item, Link and Set to Hotbar. Repair and Extract Materia are dimmer; the image does not reveal their precise blockers. The publisher highlights Link.

**Verified flow.** Right-click the specific item → choose Link → a reference appears in the composer → add ordinary text → send. The recipient can inspect that reference, and equipment links can expose Try On. [Official item-link guide](https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_iteminfo.html). No manual transcription of an item's name or attributes is required.

**Judgment.** Actions stay attached to the object they affect. Sharing an inspectable item connects social play with possessions. The long specialized menu is a warning: useful secondary commands should not bury the likely action, and dim text alone does not explain unavailability.

**Open Legend application.** Inspect, equip/use, transfer and share should begin from the actual item. Sharing must reference only the object's permitted public details. Prefer a clear primary action with a compact secondary menu; keep unavailable reasons reachable by keyboard and touch. A chat link is an inspection reference, not a permission grant or an automatic give action.

## FFXIV-05 — A recipe fills in its own requirements

![FFXIV crafting log showing recipe list, selected Book of Silver, ingredients and Synthesize](../screenshots/ffxiv/05-crafting-log.jpg)

*Source: [Official Alchemist crafting guide](https://na.finalfantasyxiv.com/crafting_gathering_guide/alchemist/), © Square Enix. Original 400 × 290 guide crop, retained without invented detail.*

**Observed regions.** Discipline icons run across the top. Search, favourites and recipe-level navigation occupy the left. The middle shows learned recipes with a selected Book of Silver and page navigation. The right names the result, then shows difficulty, durability, quality, crystals and ingredient rows with quality/count columns. Quick Synthesis and Synthesize sit at the bottom. A small leftmost footer icon is too indistinct here to identify confidently. The tiny original is evidence for overall arrangement, not for fine typography.

**Verified flow.** Open Crafting Log from Logs → select an available recipe → check required materials → Synthesize. Crafting then uses actions to advance progress while consuming durability; quality is a separate concern. [Official crafting guide](https://na.finalfantasyxiv.com/crafting_gathering_guide/alchemist/).

**Judgment.** The player chooses the result and sees its requirements; they are not asked to identify every ingredient afresh. The dense numbers and controls are reasonable only for a system where crafting decisions are part of play.

**Open Legend application.** Interacting with a cooking fire or selecting a learned recipe should establish actor, place and intended output. Supply available ordinary ingredients automatically under world rules. Offer a small substitution choice only when it changes the result or uses something valuable. Keep advanced craft planning distinct from a routine Cook action.

## FFXIV-06 — Transcript tabs are filters with persistent meaning

![FFXIV custom fourth log tab alongside General, Battle and Event](../screenshots/ffxiv/06-custom-log-tab.jpg)

*Source: [Creating Your Own Custom Chat Log Tabs](https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_owntab.html), © Square Enix. Cropped UI capture.*

**Observed controls.** Say and the composer remain above General, Battle, Event and Log #4. The plus is dimmed in this four-tab example; the guide, not its color, establishes the available tab model. Settings, an additional small symbol and a hide control follow. The extra symbol is not identified in this guide and should not be assigned a function by resemblance.

**Documented behavior.** The plus creates a custom log tab. Its name and shown categories are configurable through Log Filters. Tabs can also be [dragged into separate log windows](https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_devide.html). This concerns what the player reads, while the audience control concerns where they speak.

**Judgment and application.** Separate social speech from combat/system noise without losing the active draft. Open Legend should not make selecting a history filter silently change the conversation recipient. Use meaningful default views before adding personalization; Log #4 is a poor enduring name. More windows should preserve reading position and fit the player's display, rather than be the only remedy for an overloaded transcript.

## Specific conclusions to carry into the design

- Begin actions from their subject: item, person, recipe or station. Avoid an activity form that asks the player to reconstruct context already visible in the world.
- Separate reading filters from speaking destination. Make both understandable without knowing MMO command syntax.
- Give carried storage a coherent view; keep a world container physically identifiable and open it through the world.
- Provide explicit secondary routes for comparison, links and uncommon actions. Do not make right-click or dragging the only usable route.
- Treat configurable density as an addition to a legible default. The player evidence shows that the same arrangement can help one person and obstruct another.

These are research recommendations. Accepted Open Legend interaction rules remain in the linked handbook chapters; this dossier does not create a second specification or claim runtime implementation.

## Reference-image rights

All six images retain Square Enix's rights and their original source annotations. They are stored for attributed design research and criticism only, not as game art or reusable UI assets, and are not relicensed under the repository's AGPL license. Exact URLs, sizes, hashes and capture uncertainty are in the manifest.

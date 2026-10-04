# Game interface research atlas

**71 distinct digital UI screenshots across 12 games, plus one display photograph excluded from that count.** Research and visual inspection: October 3–4, 2026 UTC. These files answer Mike's October 3 request for concrete game-interface research and a replacement for Open Legend's inventory and activity forms.

[Browse all screenshots](../screenshots/gallery.md) · [Inventory proposal](../../projects/game-interaction-redesign-feature-spec.md) · [Technical design](../../projects/game-interaction-redesign-tech-design.md) · [Open Legend diagnosis](../current-interface-audit.md) · [Four proposed layouts](../wireframes/README.md)

## Coverage

| Game and detailed dossier                              | Digital screenshots | What to inspect                                                                                            |
| ------------------------------------------------------ | ------------------: | ---------------------------------------------------------------------------------------------------------- |
| [Baldur's Gate 3](baldurs-gate-3.md)                   |                  12 | Individual/party/controller inventory, chest, context menu, compare, Throw, alchemy, dye, trade, dialogue. |
| [Divinity: Original Sin 2](divinity-original-sin-2.md) |                   4 | Chest, trade staging, controller equipment and optional organization bags.                                 |
| [Minecraft](minecraft.md)                              |                   6 | Carried items versus catalog, recipes, large chest, furnace and trading.                                   |
| [Valheim](valheim.md)                                  |                   7 | World station, repair, cart storage, building and controller focus/bindings.                               |
| [Terraria](terraria.md)                                |                   8 | Named chest, scoped bulk verbs, quick-stack, recipe query, NPC talk and contextual prompts.                |
| [Factorio](factorio.md)                                |                   6 | Consistent player/object sides, quickbar, machine state, recipe search and optional icon naming.           |
| [Stardew Valley](stardew-valley.md)                    |                   4 | Chest transfer, matching stacks, equipment and recipe reference; one extra display photo excluded.         |
| [Project Zomboid](project-zomboid.md)                  |                   6 | Looting a physical target, timed actions, station crafting, building and fluid operations.                 |
| [Final Fantasy XIV](final-fantasy-xiv.md)              |                   6 | Controller HUD, inventory layout variants, item menus, crafting and chat audience versus filters.          |
| [Guild Wars 2](guild-wars-2.md)                        |                   5 | Inventory, bank transfer, wallet, crafting discovery and trade.                                            |
| [World of Warcraft](world-of-warcraft.md)              |                   3 | Combined bags and configurable HUD; publisher comparison counts once.                                      |
| [Disco Elysium](disco-elysium.md)                      |                   4 | Dialogue, checks, consequences, equipment and Thought Cabinet.                                             |
| **Total**                                              |              **71** | **72 original reference images including the excluded photograph.**                                        |

The counts are checked against the [aggregate index](../screenshots/index.json) and the source-owned per-game manifests. Each unique image counts once, including publisher-made comparisons. Some originals are precise UI crops or developer-published previews rather than full-screen retail captures; their context is explicit. There are no AI-generated game screenshots. The four Open Legend diagrams are separate, clearly labeled proposals and excluded.

## Why these games

Selection is based on an interaction Open Legend needs to learn from: embodied role-playing, physical storage, gathering/crafting, long-lived worlds, item-heavy progression, context-sensitive actions, conversation or multi-person play. Similarity is at the relevant mechanic, not a claim that an MMO account bank or factory shares Open Legend's world rules. BG3 receives the deepest single-game walkthrough because Mike specifically requested it.

The research deliberately includes interfaces people criticize. A popular or highly rated game is not automatically a good inventory reference. First-person praise is tied to specific features: DOS2 equipment-slot selection, WoW combined bags, FFXIV resizing and alternative gauges, GW2 storage conveniences, Factorio stable quickbars, Stardew matching-stack deposit and a Zomboid player's fast unobtrusive inventory. Each dossier includes contrary reports or limits; no small discussion thread is presented as a survey.

## How to read a dossier

Every image has a source page and original image URL, version/platform context or explicit uncertainty, visible control/layout observations, documented player interaction, strengths, weaknesses and an Open Legend application. The manifests add exact bytes/dimensions/checksums and visual-inspection status. Controls too small or ambiguous to identify are marked uncertain; a static image cannot prove a drag gesture, hidden shortcut, interaction latency or live permission rule.

Developer guides and original developer explanations establish intended mechanisms. Firsthand player reports establish that person's experience at the stated time. Screenshots establish visible layout. Our recommendations explain how those observations might transfer. None of this is a hands-on playtest, representative preference survey, accessibility certification or current-patch completeness claim.

Known qualifications are preserved rather than smoothed away: the DOS2 alpha trade screen and optional organizer, BG3 launch-era trade versus later patches and unknown modification status, Minecraft Creative/Bedrock/controller differences, WoW's Dragonflight preview, Factorio's historical previews, Zomboid's prototypes/developer controls, Re-Logic's WIP control diagrams and the Stardew recipe-reference screen that search mislabeled as cooking.

## What changes in Open Legend

The persistent [inventory](../inventory.md), [world interaction](../world-interaction.md), [controls](../controls.md), [foundations](../foundations.md) and [chat](../chat-and-invention.md) chapters own adopted guidance. This atlas is supporting evidence, not a second handbook. The [single research ledger](../research.md#game-interface-screenshot-atlas) indexes these dossiers and the [UI work tracker](../../maintainers/ui-ux.md#uiux07) distinguishes completed research, implemented interactions and open gameplay acceptance.

The recommended common path is to open the actual object and keep its contents beside the player's belongings; move directly; request quantity only when needed; derive activity context from the selected object; and preserve speaker/audience/reading context in chat. Keep native reach, permission, custody, capacity and real consequences. Do not import unlimited remote storage, hidden NPC inventories, forced radial menus, mandatory spatial packing or a game's entire aesthetic.

The [sixteen acceptance journeys](../../projects/game-interaction-redesign-feature-spec.md#end-to-end-acceptance-journeys) include a complete camp session. They remain open gameplay gates for the implemented interactions: the screenshot collection and documentation do not qualify the running game. The [implementation verification report](../../verification/game-interaction-redesign.md) records actual native/component checks and remaining coverage.

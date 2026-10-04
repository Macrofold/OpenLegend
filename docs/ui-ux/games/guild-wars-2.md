# Guild Wars 2: visible storage, protected items and social context

[Research ledger](../research.md) · [Inventory guidance](../inventory.md) · [Conversation guidance](../chat-and-invention.md) · [Screenshot manifest](../screenshots/gw2/manifest.json)

**Evidence reviewed:** 2026-10-03. Five distinct downloaded images, each visually inspected, covering carried inventory, market navigation, currencies, crafting discovery and a populated bank. These are original publisher or guide crops; no crop was manufactured to increase the count. Asset and guide dates vary, and no current client session was tested. Where behavior comes from a player's firsthand guide or a community wiki rather than ArenaNet documentation, that distinction is explicit.

## Why this game belongs in the comparison

Guild Wars 2 is a useful comparison for persistent characters, many item types, multiplayer conversation and banking. Its inventory conveniences are specific: keep carried items together, deposit ordinary crafting materials with one command, and show the carried collection beside an accessed bank. The bank is a service with its own access rules, not evidence that every physical chest should be remotely available.

**Actual player praise.** Rauderi.8706's January 21, 2016 post in the [archived key-ring discussion](https://forum-en.gw2archive.eu/forum/game/gw2/We-need-a-Key-Ring/5933265) explicitly praises pooled bank tabs, material deposit, the wallet and wardrobe while asking for further key management. Guide author Embry [personally recommends hiding bag dividers](https://projektdyad.com/guides-list/guild-wars-2-inventory-management). These support particular conveniences; they do not establish consensus or prove that the whole interface is easy.

**Actual counterexample.** In an [August 2015 player discussion](https://forum-en.gw2archive.eu/forum/support/bugs/Depositing-Materials-and-Selling-Items-Issues), Etherouge reported apparently arbitrary failures to deposit or sell. Other players identified protected “invisible” bags as the cause. Zoltar MacRoth said the same distinction was hard to see with bag divisions hidden. This historical report provides a concrete design lesson: flatten presentation without hiding restrictions that change what commands do.

## GW2-01 — A carried collection with visible bag identity

![Guild Wars 2 inventory showing shared slots, starter backpack, search, bag rail and capacity](../screenshots/gw2/01-inventory-guide.jpg)

_Source: [ArenaNet new-player guide](https://www.guildwars2.com/en/new-player-guide/), © ArenaNet / NCSOFT. Original 480 × 287 guide crop; asset path dates to 2020, exact build unspecified._

**Observed regions and controls.** The title includes the `I` shortcut and capacity reads 3/20. Close and settings occupy the upper right. Search sits directly above the contents. A narrow left rail contains bag slots, while the main region distinguishes Shared Inventory Slots from Starter Backpack with named, collapsible headers. Item art sits in uniform cells. The source crops the lower window and does not show a transfer being performed.

**Documented behavior.** The [official lost-item guide](https://help.guildwars2.com/hc/en-us/articles/360001969608-Recovering-Missing-or-Lost-Items) directs players to inventory search and to check bank storage. Embry's firsthand inventory guide explains that hiding bag dividers keeps item order while removing separators; Compact moves eligible items toward the beginning. These are different operations. A visually unified grid does not have to rearrange the player's belongings.

**Why it helps.** Named bag groups give scope to the cells, and search has a stable location. **What is weaker:** item art without persistent names assumes familiarity; tiny settings icons hide consequential behavior; capacity may be confused with account-wide shared storage. This sparse teaching example cannot show whether a crowded inventory remains understandable.

**Open Legend application.** Present the actor's carried items in one coherent collection, with bag names and relevant restrictions available. Keep search and sorting secondary to simply seeing possessions. Preserve cell order after transfers unless the player explicitly sorts. Invented items need readable names or a names-on option rather than a requirement to recognize bespoke icons.

## GW2-02 — Market navigation expresses a goal

![Guild Wars 2 Trading Post home with buying, selling, transactions and category filters](../screenshots/gw2/02-trading-post.jpg)

_Source: [ArenaNet new-player guide](https://www.guildwars2.com/en/new-player-guide/), © ArenaNet / NCSOFT. Original 480 × 287 crop. Although its source filename says inventory, the inspected image is the Trading Post._

**Observed regions.** The header names Black Lion Trading Company and Trading Post, shows the `O` shortcut and close control. Currency and Get More Gold sit at the top. Home, Buy Items, Sell Items and My Transactions form the primary navigation. Search and item categories run down the left. Central shortcuts lead to selling possessions, buying armor or buying weapons; recent-item sections sit below. The screenshot shows no chosen item, price-entry form or purchase confirmation.

**Why it helps.** Buy and Sell describe player goals. Search and category choices narrow a large marketplace; the user does not begin by selecting an abstract activity and then supply its entire context. **What is weaker:** this small image is dense, and prominent currency acquisition competes with the task. Marketplace navigation is not a suitable everyday chest layout.

**Open Legend application.** Talking to a merchant should establish the counterpart and open their offer beside the player's eligible items. Only expose price, quantity or negotiation choices when they matter. Keep world money and trade consequences visible, but do not import premium-currency prompts or this market's account-wide scope. This image supports navigation analysis, not any claim about atomic exchanges, cancellation or protection against mistaken sales.

## GW2-03 — Fungible currency can leave the item grid

![Guild Wars 2 wallet with named currency rows, amounts, currency filter and bag toggle](../screenshots/gw2/03-currency-wallet.png)

_Source: [ArenaNet currency-wallet FAQ](https://help.guildwars2.com/hc/en-us/articles/230429967-FAQ-In-Game-Currency-Wallet), © ArenaNet / NCSOFT. Official support capture; exact date and build unspecified._

**Observed controls.** Inventory and its close button remain in the title bar. The bag-slot rail stays at left. An All Currencies filter sits over a scrollable list with currency names, amounts and recognizable symbols. Gems, coins, karma and several other named currencies appear as rows. A bag-shaped toggle and compact totals sit at the bottom, along with the resize grip. The locked bag slot is visible, but its unlock cost is not.

**Verified flow.** Open inventory with `I` → choose the wallet button → inspect the named balances. The [official FAQ](https://help.guildwars2.com/hc/en-us/articles/230429967-FAQ-In-Game-Currency-Wallet) establishes that the wallet is shared across the account and gathers currency types in one place.

**Why it helps.** A balance is easier to understand than dozens of occupied coin cells; names accompany symbols. **What is weaker:** the many denominations and tokens create their own reading burden, and the generic Inventory title does not fully explain the different ownership scope.

**Open Legend application.** Show ordinary currency compactly if the game treats it as a fungible balance. Preserve physical coins, keys or quest objects as items when their location or identity matters. Label who owns the balance. An account wallet is a game-rule choice, not a universal justification for moving all valuables out of the world.

## GW2-04 — Crafting discovery is an intentional combination task

![Guild Wars 2 weaponsmith discovery with eligible ingredients, four combination slots and discipline progress](../screenshots/gw2/04-crafting-discovery.jpg)

_Source: [Weaponsmith guide by raphael, September 3, 2019](https://mmoauctions.com/news/guild-wars-2-weaponsmith-guide-make-your-own-swords-and-axes), game imagery © ArenaNet / NCSOFT. Third-party screenshot provenance only; the commercial site's services and economic advice are not recommendations._

**Observed layout.** Weaponsmithing Station and Discovery establish the place and mode. Discipline progress is 426/500. The left contains a vertical mode rail and a grid of ingredient objects, many dimmed. Three selected ingredients occupy a four-cell combination area over forge artwork; one cell is empty. Close is at the upper right. The crop omits the lower action area. In particular, it does not show a clickable Craft button. The rail's two craft-related symbols and storage symbols are visible, but exact mode identity is not established by their shapes alone.

**Documented behavior, with source limit.** The community-maintained [crafting-station page](https://wiki.guildwars2.com/wiki/Crafting_station) describes choosing ingredients by double-click or drag, followed by Craft when a valid combination is present. It distinguishes discovery from production of known recipes. This is secondary documentation; no live craft was performed here.

**Why it helps.** Choosing ingredients is the substance of an experiment, and spatially distinct source and combination cells make that choice concrete. **What is weaker:** dimmed ingredients can mean different things without a reason, and the unfamiliar icon rail demands prior knowledge.

**Open Legend application.** Allow deliberate experimentation at a station when it is part of the game. A familiar recipe should instead show its result and fill ordinary requirements from allowed supplies. Do not make routine cooking imitate discovery every time. Missing tool, ingredient or reach should have a specific explanation next to the relevant action.

## GW2-05 — The bank exposes both sides of the transfer

![Guild Wars 2 Account Vault with carried bags at left and bank grids at right, each independently searchable and scrollable](../screenshots/gw2/05-bank-account-vault.png)

_Source: [Embry / Projekt Dyad inventory guide](https://projektdyad.com/guides-list/guild-wars-2-inventory-management), game imagery © ArenaNet / NCSOFT. Original 896 × 658 capture; source says June 30 without a verified year. Capture build unspecified._

**Observed regions and controls.** Account Vault and the current Bank mode name the surface. Close is at the far upper right. The left column contains carried items grouped by named bags, with its own search and scrollbar. The larger right side contains bank cells, a separate search and scrollbar, and collapsible storage sections. Stack quantities overlay item art and border colors distinguish items. Empty cells remain visible. Currency is along the partly cropped bottom. The far-left rail changes vault sections. Neither repeated Search placeholder explicitly names its scope; the column placement is doing that work.

**Verified interaction from firsthand reporting.** Briseadh's [tested new-player guide](https://www.gaisciochmagazine.com/guides/new_adventures_in_gw2.html) describes interacting with a banker to open this surface, then double-clicking an item to move it to the first free place on the other side. The guide identifies carried inventory on the left and bank on the right. The [community account-vault documentation](https://wiki.guildwars2.com/wiki/Account_vault) additionally describes drag-and-drop and access through a banker or crafting station. Special remote-bank items exist; this comparison does not claim all banking always requires proximity.

**Why it helps.** The player can answer “what do I have?” and “what is stored here?” at the same time. Transfer direction follows the selected item's side. Empty destination cells and counts provide immediate context. **What is weaker:** many similar icons make this crowded example difficult to scan, and unnamed section dividers and identical search placeholders weaken orientation. The screenshot alone says nothing about reach, a full destination or a failed transfer.

**Open Legend application.** Open the specific chest from the world. Keep that chest's name, state and ownership visible above one side and the active character's carried collection above the other. Support a fast transfer command alongside optional dragging; retain useful bag identity. Show why an item cannot move at its source, and show where it went after success. When reach changes, report that change on this chest surface rather than silently removing a destination from a list.

## Chat and world interaction: keep the subject attached

The screenshot set above does not include a dedicated GW2 chat close-up; inaccessible source images were not substituted with invented or duplicated captures. Chat conclusions here are based on documented behavior, while the [FFXIV dossier](final-fantasy-xiv.md) provides inspected chat screenshots.

Briseadh's firsthand guide describes Enter focusing the composer, `/s` for local speech, `/m` for the current map, `/p` for party, `/d` for squad and `/w` for a whisper. It also reports actually testing right-clicking a speaker's name → Whisper. A selected person can supply a friend action through their portrait. Chat can be resized or faded through controls at the window edges. These are historical observations from the guide, not measurements of the current hearing radius or current account restrictions.

**Open Legend lesson:** clicking a speaker, character or conversation should carry that identity into the next action. Preserve a readable recipient and scope near the draft. A transcript tab is a reading filter, not an implicit target change. Expose local audibility in world terms; copying `/s` would not solve an undisclosed range. Chat fades should yield to active typing, unread information and the user's preference.

## Decisions this evidence supports

| Question                                             | Recommendation for Open Legend                                         | Boundary                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| How does a chest open?                               | Select the world object and Open; show contents beside carried items.  | Account-bank services have different world rules from individual chests.                                    |
| Should several carried bags require several windows? | Offer one coherent view with optional meaningful bag grouping.         | Protected or inaccessible items must retain visible status.                                                 |
| Should collection cleanup be one command?            | Use a clearly named command for a predictable, limited operation.      | Deposit All Materials is not precedent for sending arbitrary items to a silently selected nearby container. |
| Should crafting ask for ingredients?                 | Ask when the choice is an experiment or meaningful substitution.       | Known routine recipes already establish most requirements.                                                  |
| How should the player address someone?               | Carry the selected speaker into conversation and show the destination. | Map, party and local speech are different audiences; none should change invisibly.                          |

These are research recommendations. The linked Open Legend handbook chapters own accepted behavior and implementation status.

## Reference-image rights

All five images remain third-party reference material for attributed research and criticism. They are not Open Legend art, are not relicensed under the repository's AGPL license and do not imply reuse permission. The manifest records exact sources, hashes, sizes and uncertainty. Guide crops count once each; no independent live-game or accessibility validation is claimed.
